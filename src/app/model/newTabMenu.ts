import type { ReactNode } from "react";
import type { ExplorerMenuItem } from "../../features/files/ui/ExplorerMenu";
import {
  HARNESS_TITLE,
  type HarnessId,
} from "../../features/sessions/model/session";

/** Providers offered from the "+" menu, in display order. */
export const NEW_TAB_AGENTS: readonly HarnessId[] = [
  "claude",
  "codex",
  "pi",
  "opencode",
  "cursor",
  "grok",
];

export type NewTabAction =
  | { kind: "terminal" }
  | { kind: "agent"; harness: HarnessId }
  | { kind: "space" }
  | { kind: "new-worktree" }
  | { kind: "open-worktree" };

const AGENT_PREFIX = "agent:";

export function newTabMenuItems(options: {
  /** Whether a provider's CLI was found; undefined until the first probe. */
  isAvailable: (harness: HarnessId) => boolean;
  probed: boolean;
  /** Worktree entries need a git project. */
  worktrees: boolean;
  terminalShortcut?: string;
  spaceShortcut?: string;
  agentIcon?: (harness: HarnessId) => ReactNode;
}): ExplorerMenuItem[] {
  return [
    {
      kind: "item",
      id: "terminal",
      label: "Terminal",
      shortcut: options.terminalShortcut,
    },
    { kind: "heading", label: "Start an agent" },
    ...NEW_TAB_AGENTS.map((harness, index): ExplorerMenuItem => {
      const missing = options.probed && !options.isAvailable(harness);
      return {
        kind: "item",
        id: `${AGENT_PREFIX}${harness}`,
        label: HARNESS_TITLE[harness],
        icon: options.agentIcon?.(harness),
        disabled: missing,
        shortcut: missing ? "not installed" : String(index + 1),
      };
    }),
    { kind: "sep" },
    {
      kind: "item",
      id: "space",
      label: "New space",
      shortcut: options.spaceShortcut,
    },
    {
      kind: "item",
      id: "new-worktree",
      label: "New worktree…",
      disabled: !options.worktrees,
    },
    {
      kind: "item",
      id: "open-worktree",
      label: "Open worktree…",
      disabled: !options.worktrees,
    },
  ];
}

export function parseNewTabAction(id: string): NewTabAction | undefined {
  if (id === "terminal") return { kind: "terminal" };
  if (id === "space") return { kind: "space" };
  if (id === "new-worktree") return { kind: "new-worktree" };
  if (id === "open-worktree") return { kind: "open-worktree" };
  if (id.startsWith(AGENT_PREFIX)) {
    const harness = id.slice(AGENT_PREFIX.length) as HarnessId;
    if (NEW_TAB_AGENTS.includes(harness)) return { kind: "agent", harness };
  }
  return undefined;
}
