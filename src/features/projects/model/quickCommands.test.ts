// @vitest-environment happy-dom
import { beforeEach, expect, it } from "vitest";
import {
  loadQuickCommands,
  markQuickCommandRun,
  primaryQuickCommand,
  removeQuickCommand,
  saveQuickCommand,
} from "./quickCommands";

beforeEach(() => localStorage.clear());

it("keeps commands per project, trimmed and in the order added", () => {
  saveQuickCommand("/a", {
    label: " Dev ",
    command: " npm run dev ",
    action: "terminal",
  });
  saveQuickCommand("/a", {
    label: "Review",
    command: "Review the diff",
    action: "agent",
  });
  saveQuickCommand("/b", {
    label: "Test",
    command: "cargo test",
    action: "terminal",
  });

  expect(
    loadQuickCommands("/a").map((c) => [c.label, c.command, c.action]),
  ).toEqual([
    ["Dev", "npm run dev", "terminal"],
    ["Review", "Review the diff", "agent"],
  ]);
  expect(loadQuickCommands("/a/").length).toBe(2);
  expect(loadQuickCommands("/b").map((c) => c.label)).toEqual(["Test"]);
});

it("edits a command in place by id", () => {
  const dev = saveQuickCommand("/a", {
    label: "Dev",
    command: "npm run dev",
    action: "terminal",
  });
  saveQuickCommand("/a", { ...dev, command: "pnpm dev" });
  expect(loadQuickCommands("/a")).toEqual([{ ...dev, command: "pnpm dev" }]);
});

it("runs the last picked command from the main button, else the first", () => {
  const dev = saveQuickCommand("/a", {
    label: "Dev",
    command: "dev",
    action: "terminal",
  });
  const test = saveQuickCommand("/a", {
    label: "Test",
    command: "test",
    action: "terminal",
  });
  expect(primaryQuickCommand("/a")?.id).toBe(dev.id);
  markQuickCommandRun("/a", test.id);
  expect(primaryQuickCommand("/a")?.id).toBe(test.id);
  removeQuickCommand("/a", test.id);
  expect(primaryQuickCommand("/a")?.id).toBe(dev.id);
  removeQuickCommand("/a", dev.id);
  expect(primaryQuickCommand("/a")).toBeUndefined();
  expect(loadQuickCommands("/a")).toEqual([]);
});
