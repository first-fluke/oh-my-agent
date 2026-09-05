import { beforeEach, expect, it, vi } from "vitest";
import { promptDevToolsBrowsers } from "./prompts.js";

const prompts = vi.hoisted(() => ({
  multiselect: vi.fn(),
  isCancel: vi.fn(() => false),
}));
vi.mock("@clack/prompts", () => prompts);
beforeEach(() => vi.clearAllMocks());

it("offers Aside first and preselects it on a fresh install", async () => {
  prompts.multiselect.mockResolvedValue(["aside", "chrome", "firefox"]);
  expect(await promptDevToolsBrowsers(false, vi.fn())).toEqual([
    "aside",
    "chrome",
    "firefox",
  ]);
  expect(prompts.multiselect).toHaveBeenCalledWith(
    expect.objectContaining({
      initialValues: ["aside"],
      required: false,
      options: [
        expect.objectContaining({ value: "aside" }),
        expect.objectContaining({ value: "chrome" }),
        expect.objectContaining({ value: "firefox" }),
      ],
    }),
  );
});

it("preselects saved choices and accepts an empty selection", async () => {
  prompts.multiselect.mockResolvedValue([]);
  expect(await promptDevToolsBrowsers(false, vi.fn(), ["firefox"])).toEqual([]);
  expect(prompts.multiselect).toHaveBeenCalledWith(
    expect.objectContaining({ initialValues: ["firefox"] }),
  );
});

it("keeps an explicit empty selection in non-interactive mode", async () => {
  expect(await promptDevToolsBrowsers(true, vi.fn(), [])).toEqual([]);
  expect(prompts.multiselect).not.toHaveBeenCalled();
});
