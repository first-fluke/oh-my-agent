import { migrateArtifactLayout } from "../docs/migrate-layout.js";
import type { Migration } from "./index.js";

export const migrateArtifactLayoutPaths: Migration = {
  name: "032-artifact-layout",
  requiresReconcile: false,
  up(cwd: string): string[] {
    return migrateArtifactLayout(cwd).actions;
  },
};
