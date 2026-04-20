import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execSyncMock = vi.fn();
const spawnSyncMock = vi.fn();
vi.mock("node:child_process", () => ({
  execSync: (...args: unknown[]) => execSyncMock(...args),
  spawnSync: (...args: unknown[]) => spawnSyncMock(...args),
}));

vi.mock("node:os", () => ({
  platform: () => "darwin",
}));

const confirmMock = vi.fn();
const spinnerStartMock = vi.fn();
const spinnerStopMock = vi.fn();
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: { warn: vi.fn(), error: vi.fn(), success: vi.fn() },
  note: vi.fn(),
  confirm: (...args: unknown[]) => confirmMock(...args),
  isCancel: (val: unknown) => val === Symbol.for("cancel"),
  spinner: () => ({
    start: spinnerStartMock,
    stop: spinnerStopMock,
    message: vi.fn(),
  }),
}));

import { star } from "../star/star.js";

describe("star command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "clear").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should prompt to install gh if not installed", async () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd === "gh --version") throw new Error("not found");
    });
    confirmMock.mockResolvedValue(false);

    await star();

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("not installed"),
      }),
    );
  });

  it("should install gh when user confirms", async () => {
    let ghInstalled = false;
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd === "gh --version") {
        if (!ghInstalled) throw new Error("not found");
        return;
      }
      if (cmd === "gh auth status") throw new Error("not auth");
    });
    confirmMock
      .mockResolvedValueOnce(true) // install
      .mockResolvedValueOnce(false); // auth
    spawnSyncMock.mockImplementation((cmd: string) => {
      if (typeof cmd === "string" && cmd.includes("install")) {
        ghInstalled = true;
        return { status: 0 };
      }
      return { status: 1 };
    });

    await star();

    expect(spawnSyncMock).toHaveBeenCalledWith(
      "brew install gh",
      expect.objectContaining({ shell: true }),
    );
  });

  it("should prompt to auth if gh not authenticated", async () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd === "gh --version") return;
      if (cmd === "gh auth status") throw new Error("not auth");
    });
    confirmMock.mockResolvedValue(false);

    await star();

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("gh auth login"),
      }),
    );
  });

  it("should skip if already starred", async () => {
    execSyncMock.mockImplementation(() => {});

    await star();

    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("should star when user confirms", async () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd === "gh --version") return;
      if (cmd === "gh auth status") return;
      if (
        typeof cmd === "string" &&
        cmd.includes("user/starred") &&
        !cmd.includes("-X PUT")
      )
        throw new Error("not starred");
      return;
    });
    confirmMock.mockResolvedValue(true);

    await star();

    expect(execSyncMock).toHaveBeenCalledWith(
      expect.stringContaining("-X PUT /user/starred/"),
      expect.anything(),
    );
  });

  it("should exit gracefully when user declines to star", async () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd === "gh --version") return;
      if (cmd === "gh auth status") return;
      if (
        typeof cmd === "string" &&
        cmd.includes("user/starred") &&
        !cmd.includes("-X PUT")
      )
        throw new Error("not starred");
    });
    confirmMock.mockResolvedValue(false);

    await star();

    expect(execSyncMock).not.toHaveBeenCalledWith(
      expect.stringContaining("-X PUT"),
      expect.anything(),
    );
  });
});
