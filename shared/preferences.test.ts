import assert from "node:assert/strict";
import test from "node:test";
import { preferencesSchema } from "./preferences.ts";

test("keeps every display preference when a stored document still lists the dropped status row item", () => {
  const parsed = preferencesSchema.safeParse({
    workspaceSort: "created",
    grouping: "status",
    titleSource: "branch",
    rowItems: { branch: false, project: true, host: true, status: true, labels: true },
    trailing: "diff",
    hostFilters: ["alpha"],
    projectFilters: ["project-a"],
    showBackground: true,
  });

  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.success ? parsed.data : null, {
    workspaceSort: "created",
    grouping: "status",
    titleSource: "branch",
    rowItems: { branch: false, project: true, host: true, labels: true },
    trailing: "diff",
    hostFilters: ["alpha"],
    projectFilters: ["project-a"],
    showBackground: true,
  });
});
