import * as child_process from "node:child_process";
import { EventEmitter } from "node:events";
import type * as http from "node:http";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { lastCall as mockLastCall } from "../../__tests__/helpers.js";
import { bridge, validateSerenaConfigs } from "../bridge/run.js";

// Normalize Windows backslashes for cross-platform path string checks.
const n = (s: string) => s.replace(/\\/g, "/");

// Mock fs module
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: mockFs.existsSync,
    readFileSync: mockFs.readFileSync,
    writeFileSync: mockFs.writeFileSync,
  };
});

// Mock os module
const mockOs = vi.hoisted(() => ({
  homedir: vi.fn(() => "/mock/home"),
}));

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return {
    ...actual,
    homedir: mockOs.homedir,
  };
});

// Define types for our mocks to avoid 'any'
interface MockRequest {
  on: MockInstance;
  end: MockInstance;
  destroy: MockInstance;
  write: MockInstance;
  setTimeout: MockInstance;
}

interface MockProcess {
  stderr: { on: MockInstance };
  on: MockInstance;
  kill: MockInstance;
  stdout: { write: MockInstance; on: MockInstance };
  stdin: {
    setEncoding: MockInstance;
    on: MockInstance;
    resume: MockInstance;
  };
}

// Mocks
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

// Mock http and https using hoisted var
const mockHttp = vi.hoisted(() => ({
  get: vi.fn(),
  request: vi.fn(),
}));

vi.mock("node:http", async () => {
  return {
    default: mockHttp,
    ...mockHttp,
  };
});

vi.mock("node:https", async () => {
  return {
    default: mockHttp,
    ...mockHttp,
  };
});

function createMockReq(): MockRequest {
  return {
    on: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn(),
    write: vi.fn(),
    setTimeout: vi.fn(),
  };
}

function createMockRes(
  overrides: Partial<{
    statusCode: number;
    headers: Record<string, string>;
    contentType: string;
    body: string;
  }> = {},
): EventEmitter & {
  statusCode: number;
  headers: Record<string, string>;
  resume: MockInstance;
} {
  const res = new EventEmitter() as EventEmitter & {
    statusCode: number;
    headers: Record<string, string>;
    resume: MockInstance;
  };
  res.statusCode = overrides.statusCode ?? 200;
  res.headers = {
    ...overrides.headers,
  };
  if (overrides.contentType) {
    res.headers["content-type"] = overrides.contentType;
  }
  res.resume = vi.fn();
  return res;
}

function setupServerRunning() {
  mockHttp.get.mockImplementation(
    (_url: string | URL, cb?: (res: http.IncomingMessage) => void) => {
      if (cb) cb({} as http.IncomingMessage);
      return createMockReq();
    },
  );
}

/**
 * Point the bridge at a fixed endpoint so these tests exercise the stdio↔HTTP
 * proxy in isolation. Without it every call would go through per-project daemon
 * discovery (registry, lock file, detached spawn), which is covered separately
 * in daemon.test.ts.
 */
const PROXY_ONLY_URL = "http://localhost:12341/mcp";

describe("bridge command", () => {
  let mockProcess: MockProcess;
  let mockReq: MockRequest;
  let consoleErrorSpy: MockInstance;
  let _processExitSpy: MockInstance;
  let stdoutWriteSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockProcess = {
      stderr: { on: vi.fn() },
      on: vi.fn(),
      kill: vi.fn(),
      stdout: { write: vi.fn(), on: vi.fn() },
      stdin: {
        setEncoding: vi.fn(),
        on: vi.fn(),
        resume: vi.fn(),
      },
    };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockProcess as unknown as child_process.ChildProcess,
    );

    mockReq = createMockReq();

    mockHttp.get.mockImplementation(
      (_url: string | URL, cb?: (res: http.IncomingMessage) => void) => {
        if (cb) {
          cb({} as http.IncomingMessage);
        }
        return mockReq;
      },
    );
    mockHttp.request.mockImplementation(() => mockReq);

    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    _processExitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(
        (_code?: string | number | null | undefined): never => {
          throw new Error("Process exited");
        },
      );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("explicit endpoint", () => {
    it("connects to a reachable server without spawning anything", async () => {
      setupServerRunning();

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      expect(child_process.spawn).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Connected to existing Serena server"),
      );
    });

    it("falls back to a session-local serena when nothing is listening", async () => {
      // Losing code intelligence for the whole session is a far worse outcome
      // than losing the shared-daemon savings, so an unreachable endpoint must
      // degrade to plain stdio rather than fail.
      mockHttp.get.mockImplementation(
        (_url: string | URL, _cb?: (res: http.IncomingMessage) => void) => ({
          on: (event: string, handler: (err?: Error) => void) => {
            if (event === "error") handler(new Error("ECONNREFUSED"));
          },
          end: vi.fn(),
          destroy: vi.fn(),
          write: vi.fn(),
          setTimeout: vi.fn(),
        }),
      );

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(2000);

      expect(child_process.spawn).toHaveBeenCalledWith(
        "serena",
        expect.arrayContaining([
          "start-mcp-server",
          "--project-from-cwd",
          "--add-mode",
          "no-memories",
        ]),
        expect.objectContaining({ stdio: "inherit" }),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Falling back to a session-local serena"),
      );
    });
  });

  describe("Streamable HTTP protocol", () => {
    function setupBridgeWithStdin(): {
      triggerStdin: (msg: string) => void;
      getPostCallback: () => (res: http.IncomingMessage) => void;
      getPostOptions: () => Record<string, unknown>;
    } {
      setupServerRunning();

      let stdinHandler: ((chunk: string) => void) | null = null;

      const origSetEncoding = process.stdin.setEncoding.bind(process.stdin);
      const origOn = process.stdin.on.bind(process.stdin);
      vi.spyOn(process.stdin, "setEncoding").mockImplementation(
        origSetEncoding,
      );
      vi.spyOn(process.stdin, "on").mockImplementation(
        (event: string | symbol, handler: (...args: unknown[]) => void) => {
          if (event === "data") {
            stdinHandler = handler as (chunk: string) => void;
          }
          return origOn(event, handler);
        },
      );
      vi.spyOn(process.stdin, "resume").mockImplementation(() => process.stdin);

      return {
        triggerStdin: (msg: string) => {
          if (stdinHandler) stdinHandler(`${msg}\n`);
        },
        getPostCallback: () => {
          const call = mockLastCall(mockHttp.request);
          return call[1] as (res: http.IncomingMessage) => void;
        },
        getPostOptions: () => {
          const call = mockLastCall(mockHttp.request);
          return call[0] as Record<string, unknown>;
        },
      };
    }

    it("should store session ID from initialize response", async () => {
      const { triggerStdin, getPostCallback, getPostOptions } =
        setupBridgeWithStdin();

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      const initMsg = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-03-26" },
      });
      triggerStdin(initMsg);

      const res = createMockRes({
        headers: { "mcp-session-id": "abc123session" },
        contentType: "application/json",
        body: '{"jsonrpc":"2.0","id":1,"result":{}}',
      });

      const cb = getPostCallback();
      cb(res as unknown as http.IncomingMessage);
      res.emit("data", '{"jsonrpc":"2.0","id":1,"result":{}}');
      res.emit("end");

      // Subsequent POST should include the session ID
      const toolCallMsg = JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {},
      });
      triggerStdin(toolCallMsg);

      const postOptions = getPostOptions();
      const headers = postOptions.headers as Record<string, string>;
      expect(headers["Mcp-Session-Id"]).toBe("abc123session");
    });

    it("should send POST with correct Accept header", async () => {
      const { triggerStdin, getPostOptions } = setupBridgeWithStdin();

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      triggerStdin(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      );

      const postOptions = getPostOptions();
      const headers = postOptions.headers as Record<string, string>;
      expect(headers.Accept).toBe("application/json, text/event-stream");
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should handle SSE response with CRLF line endings", async () => {
      const { triggerStdin, getPostCallback } = setupBridgeWithStdin();

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      triggerStdin(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      );

      const res = createMockRes({
        headers: { "mcp-session-id": "sess1" },
        contentType: "text/event-stream",
      });

      const cb = getPostCallback();
      cb(res as unknown as http.IncomingMessage);

      const ssePayload =
        'event: message\r\ndata: {"jsonrpc":"2.0","id":1,"result":{"ok":true}}\r\n\r\n';
      res.emit("data", ssePayload);

      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        '{"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n',
      );
    });

    it("should handle SSE response with LF line endings", async () => {
      const { triggerStdin, getPostCallback } = setupBridgeWithStdin();

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      triggerStdin(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      );

      const res = createMockRes({
        headers: { "mcp-session-id": "sess1" },
        contentType: "text/event-stream",
      });

      const cb = getPostCallback();
      cb(res as unknown as http.IncomingMessage);

      const ssePayload =
        'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n\n';
      res.emit("data", ssePayload);

      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        '{"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n',
      );
    });

    it("should ignore SSE priming events with empty data", async () => {
      const { triggerStdin, getPostCallback } = setupBridgeWithStdin();

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      triggerStdin(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      );

      const res = createMockRes({
        headers: { "mcp-session-id": "sess1" },
        contentType: "text/event-stream",
      });

      const cb = getPostCallback();
      cb(res as unknown as http.IncomingMessage);

      // Priming event (empty data) followed by real event
      res.emit("data", "event: message\nid: 1\ndata: \nretry: 500\n\n");
      expect(stdoutWriteSpy).not.toHaveBeenCalled();

      res.emit(
        "data",
        'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\n',
      );
      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        '{"jsonrpc":"2.0","id":1,"result":{}}\n',
      );
    });

    it("should handle 202 Accepted and drain response", async () => {
      const { triggerStdin, getPostCallback } = setupBridgeWithStdin();

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      triggerStdin(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      );

      const res = createMockRes({
        statusCode: 202,
        headers: { "mcp-session-id": "sess1" },
      });

      const cb = getPostCallback();
      cb(res as unknown as http.IncomingMessage);

      expect(res.resume).toHaveBeenCalled();
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });

    it("should handle JSON response (non-SSE)", async () => {
      const { triggerStdin, getPostCallback } = setupBridgeWithStdin();

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      triggerStdin(
        JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      );

      const res = createMockRes({
        headers: { "mcp-session-id": "sess1" },
        contentType: "application/json",
      });

      const cb = getPostCallback();
      cb(res as unknown as http.IncomingMessage);

      res.emit("data", '{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}');
      res.emit("end");

      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        '{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}\n',
      );
    });

    it("should log error for invalid JSON from stdin", async () => {
      const { triggerStdin } = setupBridgeWithStdin();

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      triggerStdin("not-valid-json");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to parse IDE message:",
        expect.any(String),
      );
    });
  });

  describe("GET server stream", () => {
    function setupBridgeAndInitialize(): {
      triggerStdin: (msg: string) => void;
      getPostCallback: () => (res: http.IncomingMessage) => void;
    } {
      setupServerRunning();

      let stdinHandler: ((chunk: string) => void) | null = null;

      const origSetEncoding = process.stdin.setEncoding.bind(process.stdin);
      const origOn = process.stdin.on.bind(process.stdin);
      vi.spyOn(process.stdin, "setEncoding").mockImplementation(
        origSetEncoding,
      );
      vi.spyOn(process.stdin, "on").mockImplementation(
        (event: string | symbol, handler: (...args: unknown[]) => void) => {
          if (event === "data") {
            stdinHandler = handler as (chunk: string) => void;
          }
          return origOn(event, handler);
        },
      );
      vi.spyOn(process.stdin, "resume").mockImplementation(() => process.stdin);

      return {
        triggerStdin: (msg: string) => {
          if (stdinHandler) stdinHandler(`${msg}\n`);
        },
        getPostCallback: () => {
          const call = mockLastCall(mockHttp.request);
          return call[1] as (res: http.IncomingMessage) => void;
        },
      };
    }

    it("should open GET stream after successful initialize", async () => {
      const { triggerStdin, getPostCallback } = setupBridgeAndInitialize();

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      const requestCallsBefore = mockHttp.request.mock.calls.length;

      triggerStdin(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      );

      const initRes = createMockRes({
        headers: { "mcp-session-id": "session-xyz" },
        contentType: "application/json",
      });

      const cb = getPostCallback();
      cb(initRes as unknown as http.IncomingMessage);
      initRes.emit("data", '{"jsonrpc":"2.0","id":1,"result":{}}');
      initRes.emit("end");

      // GET stream request should have been made
      const requestCallsAfter = mockHttp.request.mock.calls.length;
      expect(requestCallsAfter).toBeGreaterThan(requestCallsBefore + 1);

      // Find the GET request call
      const getCall = mockHttp.request.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).method === "GET",
      );
      if (!getCall) throw new Error("expected a GET request to be made");

      const getOptions = getCall[0] as Record<string, unknown>;
      const getHeaders = getOptions.headers as Record<string, string>;
      expect(getHeaders["Mcp-Session-Id"]).toBe("session-xyz");
      expect(getHeaders.Accept).toBe("application/json, text/event-stream");
    });

    it("should not open duplicate GET streams (serverStreamActive guard)", async () => {
      const { triggerStdin, getPostCallback } = setupBridgeAndInitialize();

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      // First initialize
      triggerStdin(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      );
      const initRes1 = createMockRes({
        headers: { "mcp-session-id": "session-1" },
        contentType: "application/json",
      });
      const cb1 = getPostCallback();
      cb1(initRes1 as unknown as http.IncomingMessage);
      initRes1.emit("data", '{"jsonrpc":"2.0","id":1,"result":{}}');
      initRes1.emit("end");

      const getCallsAfterFirst = mockHttp.request.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).method === "GET",
      ).length;

      // Second initialize (should not open another GET stream)
      triggerStdin(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "initialize",
          params: {},
        }),
      );
      const initRes2 = createMockRes({
        headers: { "mcp-session-id": "session-1" },
        contentType: "application/json",
      });
      const cb2 = getPostCallback();
      cb2(initRes2 as unknown as http.IncomingMessage);
      initRes2.emit("data", '{"jsonrpc":"2.0","id":2,"result":{}}');
      initRes2.emit("end");

      const getCallsAfterSecond = mockHttp.request.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).method === "GET",
      ).length;

      expect(getCallsAfterSecond).toBe(getCallsAfterFirst);
    });

    it("should handle 409 Conflict without retrying", async () => {
      const { triggerStdin } = setupBridgeAndInitialize();

      // Capture GET callbacks
      let getCallback: ((res: http.IncomingMessage) => void) | null = null;
      mockHttp.request.mockImplementation(
        (
          opts: Record<string, unknown>,
          cb?: (res: http.IncomingMessage) => void,
        ) => {
          if (opts.method === "GET" && cb) {
            getCallback = cb;
          }
          return createMockReq();
        },
      );

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      triggerStdin(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      );

      // Simulate initialize response (from POST callback)
      const postCalls = mockHttp.request.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).method === "POST",
      );
      const lastPostCall = postCalls[postCalls.length - 1];
      if (lastPostCall) {
        const postCb = lastPostCall[1] as (res: http.IncomingMessage) => void;
        const initRes = createMockRes({
          headers: { "mcp-session-id": "sess-409" },
          contentType: "application/json",
        });
        postCb(initRes as unknown as http.IncomingMessage);
        initRes.emit("data", '{"jsonrpc":"2.0","id":1,"result":{}}');
        initRes.emit("end");
      }

      // Now simulate 409 on the GET stream
      if (getCallback) {
        const cb409 = getCallback as (res: http.IncomingMessage) => void;
        const res409 = createMockRes({ statusCode: 409 });
        cb409(res409 as unknown as http.IncomingMessage);

        expect(res409.resume).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "GET stream already open for this session (409)",
        );
      }
    });

    it("should handle 405 Method Not Allowed and reset serverStreamActive", async () => {
      const { triggerStdin } = setupBridgeAndInitialize();

      let getCallback: ((res: http.IncomingMessage) => void) | null = null;
      mockHttp.request.mockImplementation(
        (
          opts: Record<string, unknown>,
          cb?: (res: http.IncomingMessage) => void,
        ) => {
          if (opts.method === "GET" && cb) {
            getCallback = cb;
          }
          return createMockReq();
        },
      );

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      triggerStdin(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      );

      const postCalls = mockHttp.request.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).method === "POST",
      );
      const lastPostCall = postCalls[postCalls.length - 1];
      if (lastPostCall) {
        const postCb = lastPostCall[1] as (res: http.IncomingMessage) => void;
        const initRes = createMockRes({
          headers: { "mcp-session-id": "sess-405" },
          contentType: "application/json",
        });
        postCb(initRes as unknown as http.IncomingMessage);
        initRes.emit("data", '{"jsonrpc":"2.0","id":1,"result":{}}');
        initRes.emit("end");
      }

      if (getCallback) {
        const cb405 = getCallback as (res: http.IncomingMessage) => void;
        const res405 = createMockRes({ statusCode: 405 });
        cb405(res405 as unknown as http.IncomingMessage);
        expect(res405.resume).toHaveBeenCalled();
      }
    });

    it("should forward server notifications from GET stream to stdout", async () => {
      const { triggerStdin } = setupBridgeAndInitialize();

      let getCallback: ((res: http.IncomingMessage) => void) | null = null;
      mockHttp.request.mockImplementation(
        (
          opts: Record<string, unknown>,
          cb?: (res: http.IncomingMessage) => void,
        ) => {
          if (opts.method === "GET" && cb) {
            getCallback = cb;
          }
          return createMockReq();
        },
      );

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      triggerStdin(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      );

      const postCalls = mockHttp.request.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).method === "POST",
      );
      const lastPostCall = postCalls[postCalls.length - 1];
      if (lastPostCall) {
        const postCb = lastPostCall[1] as (res: http.IncomingMessage) => void;
        const initRes = createMockRes({
          headers: { "mcp-session-id": "sess-notify" },
          contentType: "application/json",
        });
        postCb(initRes as unknown as http.IncomingMessage);
        initRes.emit("data", '{"jsonrpc":"2.0","id":1,"result":{}}');
        initRes.emit("end");
      }

      if (getCallback) {
        const cbNotify = getCallback as (res: http.IncomingMessage) => void;
        const getRes = createMockRes({ statusCode: 200 });
        cbNotify(getRes as unknown as http.IncomingMessage);

        const notification =
          'event: message\ndata: {"jsonrpc":"2.0","method":"notifications/tools/list_changed"}\n\n';
        getRes.emit("data", notification);

        expect(stdoutWriteSpy).toHaveBeenCalledWith(
          '{"jsonrpc":"2.0","method":"notifications/tools/list_changed"}\n',
        );
      }
    });

    it("should reconnect GET stream after it closes", async () => {
      const { triggerStdin } = setupBridgeAndInitialize();

      const getCallbacks: ((res: http.IncomingMessage) => void)[] = [];
      mockHttp.request.mockImplementation(
        (
          opts: Record<string, unknown>,
          cb?: (res: http.IncomingMessage) => void,
        ) => {
          if (opts.method === "GET" && cb) {
            getCallbacks.push(cb);
          }
          return createMockReq();
        },
      );

      const _bridgePromise = bridge(PROXY_ONLY_URL);
      await vi.advanceTimersByTimeAsync(100);

      triggerStdin(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      );

      const postCalls = mockHttp.request.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).method === "POST",
      );
      const lastPostCall = postCalls[postCalls.length - 1];
      if (lastPostCall) {
        const postCb = lastPostCall[1] as (res: http.IncomingMessage) => void;
        const initRes = createMockRes({
          headers: { "mcp-session-id": "sess-reconnect" },
          contentType: "application/json",
        });
        postCb(initRes as unknown as http.IncomingMessage);
        initRes.emit("data", '{"jsonrpc":"2.0","id":1,"result":{}}');
        initRes.emit("end");
      }

      expect(getCallbacks.length).toBe(1);

      // Simulate stream close
      const getRes = createMockRes({ statusCode: 200 });
      const firstGetCb = getCallbacks[0];
      if (!firstGetCb) throw new Error("expected at least one GET callback");
      firstGetCb(getRes as unknown as http.IncomingMessage);
      getRes.emit("end");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Server stream closed, reconnecting...",
      );

      // After reconnect delay, a new GET should be attempted
      await vi.advanceTimersByTimeAsync(1000);
      expect(getCallbacks.length).toBe(2);
    });
  });

  describe("SSE parsing edge cases", () => {
    function setupAndGetSSEParser(): {
      feedSSE: (chunk: string) => void;
    } {
      setupServerRunning();

      let stdinHandler: ((chunk: string) => void) | null = null;
      const origSetEncoding = process.stdin.setEncoding.bind(process.stdin);
      const origOn = process.stdin.on.bind(process.stdin);
      vi.spyOn(process.stdin, "setEncoding").mockImplementation(
        origSetEncoding,
      );
      vi.spyOn(process.stdin, "on").mockImplementation(
        (event: string | symbol, handler: (...args: unknown[]) => void) => {
          if (event === "data") {
            stdinHandler = handler as (chunk: string) => void;
          }
          return origOn(event, handler);
        },
      );
      vi.spyOn(process.stdin, "resume").mockImplementation(() => process.stdin);

      let sseRes: ReturnType<typeof createMockRes> | null = null;

      bridge(PROXY_ONLY_URL).catch(() => {});

      // Wait for bridge to set up, then send initialize
      setTimeout(() => {
        if (stdinHandler) {
          stdinHandler(
            `${JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {},
            })}\n`,
          );
        }

        const call = mockLastCall(mockHttp.request);
        const cb = call[1] as (res: http.IncomingMessage) => void;
        sseRes = createMockRes({
          headers: { "mcp-session-id": "sse-test" },
          contentType: "text/event-stream",
        });
        cb(sseRes as unknown as http.IncomingMessage);
      }, 0);

      return {
        feedSSE: (chunk: string) => {
          if (sseRes) {
            sseRes.emit("data", chunk);
          }
        },
      };
    }

    it("should handle chunked SSE data split across multiple events", async () => {
      const { feedSSE } = setupAndGetSSEParser();
      await vi.advanceTimersByTimeAsync(100);

      // First chunk: partial event
      feedSSE("event: message\ndata: ");
      expect(stdoutWriteSpy).not.toHaveBeenCalled();

      // Second chunk: rest of event
      feedSSE('{"jsonrpc":"2.0","id":1,"result":{}}\n\n');
      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        '{"jsonrpc":"2.0","id":1,"result":{}}\n',
      );
    });

    it("should handle multiple SSE events in a single chunk", async () => {
      const { feedSSE } = setupAndGetSSEParser();
      await vi.advanceTimersByTimeAsync(100);

      const multiEvent =
        'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"a":1}}\n\nevent: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"b":2}}\n\n';
      feedSSE(multiEvent);

      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        '{"jsonrpc":"2.0","id":1,"result":{"a":1}}\n',
      );
      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        '{"jsonrpc":"2.0","id":2,"result":{"b":2}}\n',
      );
    });

    it("should handle mixed CRLF and LF in same stream", async () => {
      const { feedSSE } = setupAndGetSSEParser();
      await vi.advanceTimersByTimeAsync(100);

      feedSSE(
        'event: message\r\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\r\n\r\n',
      );
      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        '{"jsonrpc":"2.0","id":1,"result":{}}\n',
      );

      stdoutWriteSpy.mockClear();

      feedSSE('event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{}}\n\n');
      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        '{"jsonrpc":"2.0","id":2,"result":{}}\n',
      );
    });

    it("should ignore non-data SSE fields (id, retry, event, comments)", async () => {
      const { feedSSE } = setupAndGetSSEParser();
      await vi.advanceTimersByTimeAsync(100);

      feedSSE(
        ':comment line\nevent: message\nid: 42\nretry: 500\ndata: {"ok":true}\n\n',
      );
      expect(stdoutWriteSpy).toHaveBeenCalledWith('{"ok":true}\n');
    });
  });
});

describe("bridge hostname validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("throws synchronously when the parsed URL hostname is empty", async () => {
    // Stub the global URL constructor so that the stub URL for our sentinel
    // input returns an object with an empty hostname, letting us exercise the
    // guard without a real invalid-URL parse error.
    const OrigURL = globalThis.URL;
    const SENTINEL = "http://EMPTY-HOST-SENTINEL/mcp";

    class PatchedURL extends OrigURL {
      constructor(input: string, base?: string | URL) {
        if (input === SENTINEL) {
          // Call with a valid URL to satisfy the parent, then override hostname.
          super("http://localhost/mcp", base);
          Object.defineProperty(this, "hostname", {
            value: "",
            writable: true,
            configurable: true,
          });
        } else {
          super(input, base);
        }
      }
    }

    vi.stubGlobal("URL", PatchedURL);
    vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(bridge(SENTINEL)).rejects.toThrow(/non-empty hostname/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("validateSerenaConfigs", () => {
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should do nothing if global config does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);

    validateSerenaConfigs();

    expect(mockFs.readFileSync).not.toHaveBeenCalled();
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should do nothing if no projects are registered", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("some_key: value\n");

    validateSerenaConfigs();

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should skip projects without project.yml", () => {
    mockFs.existsSync.mockImplementation((path: string) => {
      if (path === "/mock/home/.serena/serena_config.yml") return true;
      if (path === "/project1/.serena/project.yml") return false;
      return false;
    });
    mockFs.readFileSync.mockReturnValue("projects:\n  - /project1\n");

    validateSerenaConfigs();

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should skip a project directory that no longer exists, silently", () => {
    // serena_config.yml accumulates stale registrations (deleted checkouts,
    // test temp dirs). Warning about each one buries real output in noise the
    // user cannot act on.
    mockFs.existsSync.mockImplementation((path: string) => {
      if (n(path) === "/mock/home/.serena/serena_config.yml") return true;
      return false;
    });
    mockFs.readFileSync.mockReturnValue(
      "projects:\n  - /nonexistent-project\n",
    );

    validateSerenaConfigs();

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("should not modify project.yml if languages key already exists", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((path: string) => {
      if (path === "/mock/home/.serena/serena_config.yml") {
        return "projects:\n  - /project1\n";
      }
      if (path === "/project1/.serena/project.yml") {
        return "project:\n  name: test\n\nlanguages:\n  - python\n";
      }
      return "";
    });

    validateSerenaConfigs();

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should mirror language_servers under the legacy key", () => {
    // serena >=1.6.2 writes `language_servers`; 1.6.1 requires `languages` and
    // dies with KeyError without it. Both keys side by side satisfy either one.
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((path: string) => {
      if (n(path) === "/mock/home/.serena/serena_config.yml") {
        return "projects:\n  - /project1\n";
      }
      if (n(path) === "/project1/.serena/project.yml") {
        return "language_servers:\n- typescript\n";
      }
      return "";
    });

    validateSerenaConfigs();

    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]project1[\\/]\.serena[\\/]project\.yml$/),
      expect.stringContaining("languages:\n- typescript\n"),
    );
  });

  it("should not install a default language set into a config that has none", () => {
    // An earlier version injected python + typescript + dart + terraform here,
    // which starts four language servers per session in a single-language repo.
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((path: string) => {
      if (n(path) === "/mock/home/.serena/serena_config.yml") {
        return "projects:\n  - /project1\n";
      }
      if (n(path) === "/project1/.serena/project.yml") {
        return "project:\n  name: test\n\nstructure:\n  monorepo: true\n";
      }
      return "";
    });

    validateSerenaConfigs();

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should repair only the projects that need it", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((path: string) => {
      if (n(path) === "/mock/home/.serena/serena_config.yml") {
        return "projects:\n  - /project1\n  - /project2\n";
      }
      if (n(path) === "/project1/.serena/project.yml") {
        return "languages:\n- python\n";
      }
      if (n(path) === "/project2/.serena/project.yml") {
        return "language_servers:\n- python\n";
      }
      return "";
    });

    validateSerenaConfigs();

    expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]project2[\\/]\.serena[\\/]project\.yml$/),
      expect.stringContaining("languages:"),
    );
  });

  it("should handle errors gracefully", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error("Read error");
    });

    validateSerenaConfigs();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to validate Serena configs"),
    );
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });
});
