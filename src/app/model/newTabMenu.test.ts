import { expect, it } from "vitest";
import {
  NEW_TAB_AGENTS,
  newTabMenuItems,
  parseNewTabAction,
} from "./newTabMenu";

const base = { isAvailable: () => true, probed: true, worktrees: true };

it("lists only providers the app can start, under an agents heading", () => {
  const items = newTabMenuItems(base);
  const ids = items.flatMap((item) => (item.kind === "item" ? [item.id] : []));
  expect(ids).toEqual([
    "terminal",
    ...NEW_TAB_AGENTS.map((id) => `agent:${id}`),
    "space",
    "new-worktree",
    "open-worktree",
  ]);
  expect(items[1]).toEqual({ kind: "heading", label: "Start an agent" });
  expect(NEW_TAB_AGENTS).toEqual([
    "claude",
    "codex",
    "pi",
    "opencode",
    "cursor",
    "grok",
  ]);
});

it("disables a provider whose CLI is missing, but only after the probe", () => {
  const find = (probed: boolean) =>
    newTabMenuItems({ ...base, probed, isAvailable: (h) => h !== "pi" }).find(
      (item) => item.kind === "item" && item.id === "agent:pi",
    );
  expect(find(true)).toMatchObject({
    disabled: true,
    shortcut: "not installed",
  });
  expect(find(false)).toMatchObject({ disabled: false, shortcut: "3" });
});

it("disables worktree entries outside a git project", () => {
  const items = newTabMenuItems({ ...base, worktrees: false });
  for (const id of ["new-worktree", "open-worktree"])
    expect(
      items.find((item) => item.kind === "item" && item.id === id),
    ).toMatchObject({ disabled: true });
});

it("parses menu ids back into actions and rejects unknown ones", () => {
  expect(parseNewTabAction("agent:codex")).toEqual({
    kind: "agent",
    harness: "codex",
  });
  expect(parseNewTabAction("agent:gemini")).toBeUndefined();
  expect(parseNewTabAction("terminal")).toEqual({ kind: "terminal" });
  expect(parseNewTabAction("nope")).toBeUndefined();
});
