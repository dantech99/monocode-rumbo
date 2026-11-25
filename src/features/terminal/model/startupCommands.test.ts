import { expect, it } from "vitest";
import { queueStartupCommand, takeStartupCommand } from "./startupCommands";

it("hands a terminal its startup command exactly once", () => {
  queueStartupCommand("t1", "  npm run dev ");
  expect(takeStartupCommand("t1")).toBe("npm run dev");
  expect(takeStartupCommand("t1")).toBeUndefined();
});

it("ignores a blank command", () => {
  queueStartupCommand("t2", "   ");
  expect(takeStartupCommand("t2")).toBeUndefined();
});
