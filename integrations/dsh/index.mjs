import { createUserMessage } from "@deepseek-ai/dsh-llm/message";
import { registerBridge } from "./bridge.mjs";

export const name = "oma";
export const inject = [];

export function apply(ctx, config = {}) {
  registerBridge(ctx, config, createUserMessage);
}
