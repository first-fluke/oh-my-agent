export type AgentType =
  | "backend"
  | "frontend"
  | "mobile"
  | "qa"
  | "debug"
  | "pm";

export const VALID_AGENTS: AgentType[] = [
  "backend",
  "frontend",
  "mobile",
  "qa",
  "debug",
  "pm",
];

export function isValidAgent(value: string): value is AgentType {
  return (VALID_AGENTS as string[]).includes(value);
}
