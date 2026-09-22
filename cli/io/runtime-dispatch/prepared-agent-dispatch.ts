import type { VendorConfig } from "../../platform/agent-config.js";
import { planDispatch } from "../runtime-dispatch.js";
import {
  createOpencodeSpawnWrapper,
  type OpencodeWrapper,
  removeOpencodeSpawnWrapper,
  swapOpencodeAgentArg,
} from "./opencode-wrapper.js";

export interface PreparedAgentDispatch {
  dispatch: ReturnType<typeof planDispatch>;
  opencodeWrapper: OpencodeWrapper | null;
  cleanup: () => void;
}

interface PrepareAgentDispatchOptions {
  agentId: string;
  vendor: string;
  vendorConfig: VendorConfig;
  promptFlag: string | null;
  promptContent: string;
  sessionId: string;
  wrapperId?: string;
  workspace: string;
  readOnly?: boolean;
}

/**
 * Plan an agent launch and apply the setup every process-based dispatcher
 * needs. Keeping this here prevents single and parallel dispatch from
 * diverging on workspace permissions or OpenCode's primary-agent wrapper.
 */
export function prepareAgentDispatch({
  agentId,
  vendor,
  vendorConfig,
  promptFlag,
  promptContent,
  sessionId,
  wrapperId,
  workspace,
  readOnly = false,
}: PrepareAgentDispatchOptions): PreparedAgentDispatch {
  const dispatch = planDispatch(
    agentId,
    vendor,
    vendorConfig,
    promptFlag,
    promptContent,
    undefined,
    { readOnly, workspace },
  );

  let opencodeWrapper: OpencodeWrapper | null = null;
  if (dispatch.targetVendor === "opencode" && dispatch.mode === "external") {
    const dispatchArgs = dispatch.invocation.args;
    const modelIdx = dispatchArgs.indexOf("-m");
    const wrapperModel =
      modelIdx !== -1 ? dispatchArgs[modelIdx + 1] : undefined;
    const wrapper = createOpencodeSpawnWrapper(
      agentId,
      wrapperId ?? sessionId,
      process.cwd(),
      wrapperModel,
    );
    if (swapOpencodeAgentArg(dispatchArgs, agentId, wrapper.name)) {
      opencodeWrapper = wrapper;
    } else {
      removeOpencodeSpawnWrapper(wrapper.filePath);
    }
  }

  return {
    dispatch,
    opencodeWrapper,
    cleanup: () => {
      if (opencodeWrapper) removeOpencodeSpawnWrapper(opencodeWrapper.filePath);
    },
  };
}
