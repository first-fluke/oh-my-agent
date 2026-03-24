import * as child_process from "node:child_process";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mockFsFunctions = vi.hoisted(() => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	unlinkSync: vi.fn(),
	openSync: vi.fn(),
	statSync: vi.fn(),
	mkdirSync: vi.fn(),
	readdirSync: vi.fn(),
}));

vi.mock("node:fs", async () => {
	return {
		default: mockFsFunctions,
		...mockFsFunctions,
	};
});

vi.mock("node:child_process", () => ({
	execSync: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
	log: { error: vi.fn(), info: vi.fn() },
	intro: vi.fn(),
	outro: vi.fn(),
	note: vi.fn(),
}));

vi.mock("picocolors", () => ({
	default: {
		green: (s: string) => s,
		red: (s: string) => s,
		yellow: (s: string) => s,
		dim: (s: string) => s,
		bold: (s: string) => s,
		bgCyan: (s: string) => s,
		white: (s: string) => s,
	},
}));

import { checkScopeViolation } from "../commands/verify.js";

const mockExecSync = child_process.execSync as ReturnType<typeof vi.fn>;

describe("checkScopeViolation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should skip when plan.json does not exist", () => {
		mockFsFunctions.existsSync.mockReturnValue(false);

		const result = checkScopeViolation("/workspace", "backend");

		expect(result.status).toBe("skip");
		expect(result.message).toBe("No plan.json found");
	});

	it("should skip when plan.json is invalid JSON", () => {
		mockFsFunctions.existsSync.mockReturnValue(true);
		mockFsFunctions.readFileSync.mockReturnValue("not-json");

		const result = checkScopeViolation("/workspace", "backend");

		expect(result.status).toBe("skip");
		expect(result.message).toBe("Invalid plan.json");
	});

	it("should skip when no tasks match the agent type", () => {
		mockFsFunctions.existsSync.mockReturnValue(true);
		mockFsFunctions.readFileSync.mockReturnValue(
			JSON.stringify({
				tasks: [{ agent: "frontend", scope: ["src/components/"] }],
			}),
		);

		const result = checkScopeViolation("/workspace", "backend");

		expect(result.status).toBe("skip");
		expect(result.message).toBe("No tasks for this agent");
	});

	it("should skip when tasks have no scope defined", () => {
		mockFsFunctions.existsSync.mockReturnValue(true);
		mockFsFunctions.readFileSync.mockReturnValue(
			JSON.stringify({
				tasks: [{ agent: "backend", title: "Build API" }],
			}),
		);

		const result = checkScopeViolation("/workspace", "backend");

		expect(result.status).toBe("skip");
		expect(result.message).toBe("No scope defined in plan");
	});

	it("should pass when no files changed", () => {
		mockFsFunctions.existsSync.mockReturnValue(true);
		mockFsFunctions.readFileSync.mockReturnValue(
			JSON.stringify({
				tasks: [{ agent: "backend", scope: ["src/api/"] }],
			}),
		);
		mockExecSync.mockReturnValue("");

		const result = checkScopeViolation("/workspace", "backend");

		expect(result.status).toBe("pass");
		expect(result.message).toBe("No files changed");
	});

	it("should pass when all changed files are in scope", () => {
		mockFsFunctions.existsSync.mockReturnValue(true);
		mockFsFunctions.readFileSync.mockReturnValue(
			JSON.stringify({
				tasks: [
					{ agent: "backend", scope: ["src/api/", "migrations/"] },
				],
			}),
		);
		mockExecSync.mockReturnValue("src/api/routes.ts\nmigrations/001.sql");

		const result = checkScopeViolation("/workspace", "backend");

		expect(result.status).toBe("pass");
		expect(result.message).toBe("All 2 files in scope");
	});

	it("should fail when files are out of scope", () => {
		mockFsFunctions.existsSync.mockReturnValue(true);
		mockFsFunctions.readFileSync.mockReturnValue(
			JSON.stringify({
				tasks: [{ agent: "backend", scope: ["src/api/"] }],
			}),
		);
		mockExecSync.mockReturnValue(
			"src/api/routes.ts\nsrc/components/Button.tsx",
		);

		const result = checkScopeViolation("/workspace", "backend");

		expect(result.status).toBe("fail");
		expect(result.message).toContain("1 out-of-scope");
		expect(result.message).toContain("src/components/Button.tsx");
	});

	it("should report multiple violations", () => {
		mockFsFunctions.existsSync.mockReturnValue(true);
		mockFsFunctions.readFileSync.mockReturnValue(
			JSON.stringify({
				tasks: [{ agent: "frontend", scope: ["src/components/"] }],
			}),
		);
		mockExecSync.mockReturnValue(
			"src/components/Card.tsx\nsrc/api/auth.ts\nmigrations/002.sql",
		);

		const result = checkScopeViolation("/workspace", "frontend");

		expect(result.status).toBe("fail");
		expect(result.message).toContain("2 out-of-scope");
		expect(result.message).toContain("+1");
	});

	it("should merge scope from multiple tasks for same agent", () => {
		mockFsFunctions.existsSync.mockReturnValue(true);
		mockFsFunctions.readFileSync.mockReturnValue(
			JSON.stringify({
				tasks: [
					{ agent: "backend", scope: ["src/api/"] },
					{ agent: "backend", scope: ["src/services/"] },
				],
			}),
		);
		mockExecSync.mockReturnValue("src/api/routes.ts\nsrc/services/auth.ts");

		const result = checkScopeViolation("/workspace", "backend");

		expect(result.status).toBe("pass");
		expect(result.message).toBe("All 2 files in scope");
	});

	it("should handle git diff failure (not a git repo)", () => {
		mockFsFunctions.existsSync.mockReturnValue(true);
		mockFsFunctions.readFileSync.mockReturnValue(
			JSON.stringify({
				tasks: [{ agent: "backend", scope: ["src/api/"] }],
			}),
		);
		mockExecSync.mockImplementation(() => {
			throw new Error("not a git repo");
		});

		const result = checkScopeViolation("/workspace", "backend");

		expect(result.status).toBe("pass");
		expect(result.message).toBe("No files changed");
	});

	it("should match agent type case-insensitively", () => {
		mockFsFunctions.existsSync.mockReturnValue(true);
		mockFsFunctions.readFileSync.mockReturnValue(
			JSON.stringify({
				tasks: [{ agent: "Backend", scope: ["src/api/"] }],
			}),
		);
		mockExecSync.mockReturnValue("src/api/routes.ts");

		const result = checkScopeViolation("/workspace", "backend");

		expect(result.status).toBe("pass");
	});
});
