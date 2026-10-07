import {
  accessSync,
  constants,
  lstatSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import type { MatrixReport } from "./run.js";

export function validateMatrixReportDestination(path: string): void {
  if (!path.trim())
    throw new Error("Matrix report destination must name a file");
  const target = resolve(path);
  try {
    lstatSync(target);
    throw new Error(
      "Matrix report destination already exists; choose a new file",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  mkdirSync(dirname(target), { recursive: true });
  accessSync(dirname(target), constants.W_OK);
}

export function saveMatrixReport(path: string, report: MatrixReport): void {
  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
}
