import type { Readable, Writable } from "node:stream";

/**
 * Minimal Agent Client Protocol (ACP) client: newline-delimited JSON-RPC 2.0
 * over a pair of streams (the agent's stdin/stdout).
 *
 * Only the client side OMA needs is implemented: send requests and
 * notifications to the agent, receive its notifications (`session/update`),
 * and answer the requests it makes of the client
 * (`session/request_permission`). Spec: https://agentclientprotocol.com
 */

export type JsonRpcId = number | string;

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: JsonRpcId | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: JsonRpcError;
}

/** JSON-RPC error returned by the agent for a client request. */
export class AcpRpcError extends Error {
  constructor(
    readonly method: string,
    readonly code: number,
    message: string,
  ) {
    super(`${method} failed: ${message} (${code})`);
    this.name = "AcpRpcError";
  }
}

/** Thrown by a request handler for a method the client does not implement. */
export class AcpMethodNotFound extends Error {
  constructor(readonly method: string) {
    super(`method not found: ${method}`);
    this.name = "AcpMethodNotFound";
  }
}

export interface AcpClientHandlers {
  /** Agent → client notification (no reply expected). */
  onNotification?: (method: string, params: unknown) => void;
  /**
   * Agent → client request. Return the `result`; throw AcpMethodNotFound for an
   * unsupported method (answered with -32601) or any other error (-32603).
   */
  onRequest?: (method: string, params: unknown) => unknown | Promise<unknown>;
  /** A stdout line that is not JSON-RPC (e.g. CLI usage text). */
  onStrayOutput?: (line: string) => void;
}

interface PendingRequest {
  method: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;

export class AcpConnection {
  private nextId = 0;
  private buffer = "";
  private closedError: Error | null = null;
  private readonly pending = new Map<JsonRpcId, PendingRequest>();

  constructor(
    private readonly input: Writable,
    output: Readable,
    private readonly handlers: AcpClientHandlers = {},
  ) {
    output.setEncoding("utf8");
    output.on("data", (chunk: string) => this.receive(chunk));
    output.on("end", () => {
      this.flushTrailingLine();
      this.close(new Error("ACP agent closed its output"));
    });
    output.on("error", (error: Error) => this.close(error));
    // A write after the agent exited raises EPIPE on the stream; surface it
    // through the pending requests instead of as an unhandled error.
    input.on("error", (error: Error) => this.close(error));
  }

  /** Send a request and resolve with its `result`. */
  request<T = unknown>(method: string, params: unknown): Promise<T> {
    if (this.closedError) return Promise.reject(this.closedError);
    const id = ++this.nextId;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        method,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.write({ jsonrpc: "2.0", id, method, params });
    });
  }

  /** Send a notification (no response). */
  notify(method: string, params: unknown): void {
    if (this.closedError) return;
    this.write({ jsonrpc: "2.0", method, params });
  }

  /** Reject every in-flight request; later requests reject immediately. */
  close(error: Error): void {
    if (!this.closedError) this.closedError = error;
    for (const [id, pending] of this.pending) {
      this.pending.delete(id);
      pending.reject(
        new Error(`${pending.method}: ${this.closedError.message}`),
      );
    }
  }

  private write(message: JsonRpcMessage): void {
    this.input.write(`${JSON.stringify(message)}\n`);
  }

  private receive(chunk: string): void {
    this.buffer += chunk;
    let newline = this.buffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      this.handleLine(line);
      newline = this.buffer.indexOf("\n");
    }
  }

  private flushTrailingLine(): void {
    const line = this.buffer;
    this.buffer = "";
    if (line.trim()) this.handleLine(line);
  }

  private handleLine(raw: string): void {
    const line = raw.trim();
    if (!line) return;
    let message: JsonRpcMessage;
    try {
      message = JSON.parse(line) as JsonRpcMessage;
    } catch {
      this.handlers.onStrayOutput?.(raw);
      return;
    }
    if (!message || typeof message !== "object") {
      this.handlers.onStrayOutput?.(raw);
      return;
    }

    const hasId = message.id !== undefined && message.id !== null;
    if (typeof message.method === "string") {
      if (hasId) {
        void this.answer(message.id as JsonRpcId, message.method, message);
      } else {
        this.handlers.onNotification?.(message.method, message.params);
      }
      return;
    }
    if (!hasId) {
      this.handlers.onStrayOutput?.(raw);
      return;
    }

    // Response to one of our requests. Ids we issue are numbers; the agent
    // echoes them back unchanged.
    const pending = this.pending.get(message.id as JsonRpcId);
    if (!pending) return;
    this.pending.delete(message.id as JsonRpcId);
    if (message.error) {
      pending.reject(
        new AcpRpcError(
          pending.method,
          message.error.code,
          message.error.message,
        ),
      );
    } else {
      pending.resolve(message.result);
    }
  }

  /** Reply to an agent request, echoing its id verbatim (agy sends strings). */
  private async answer(
    id: JsonRpcId,
    method: string,
    message: JsonRpcMessage,
  ): Promise<void> {
    try {
      if (!this.handlers.onRequest) throw new AcpMethodNotFound(method);
      const result = await this.handlers.onRequest(method, message.params);
      this.write({ jsonrpc: "2.0", id, result: result ?? null });
    } catch (error) {
      const code =
        error instanceof AcpMethodNotFound ? METHOD_NOT_FOUND : INTERNAL_ERROR;
      const text = error instanceof Error ? error.message : String(error);
      if (this.closedError) return;
      this.write({ jsonrpc: "2.0", id, error: { code, message: text } });
    }
  }
}
