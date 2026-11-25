import { describe, expect, it } from "vitest";
import type { SessionSummary } from "../data/sessionStore";
import { DEFAULT_SESSION_SIDEBAR_FILTERS } from "./sessionFilters";
import {
  agentSections,
  projectBranchLabel,
  projectListPhase,
  projectSessionGroups,
} from "./projectSessionGroups";

function row(
  id: string,
  cwd: string,
  extra: Partial<SessionSummary> = {},
): SessionSummary {
  return {
    id,
    cwd,
    harness: "cursor",
    model: "gpt-5",
    runtimeMode: "supervised",
    title: id,
    createdAt: 1,
    updatedAt: 1,
    ...extra,
  };
}

const base = {
  cwd: "/repo/a",
  query: "",
  filters: DEFAULT_SESSION_SIDEBAR_FILTERS,
  now: 1_000,
  busyIds: new Set<string>(),
  approvalIds: new Set<string>(),
  unseenIds: new Set<string>(),
  pendingPaths: new Set<string>(),
  failedPaths: new Set<string>(),
  remoteDisconnectedPaths: new Set<string>(),
  currentBranch: "main",
};

describe("projectSessionGroups", () => {
  it("keeps every project's sessions in the given project order", () => {
    const groups = projectSessionGroups({
      ...base,
      projects: [{ path: "/repo/a" }, { path: "/repo/b" }],
      rows: [row("b1", "/repo/b", { title: "beta" }), row("a1", "/repo/a")],
    });
    expect(groups.map((group) => group.cwd)).toEqual(["/repo/a", "/repo/b"]);
    expect(groups[0]?.sessions.map((session) => session.id)).toEqual(["a1"]);
    expect(groups[1]?.sessions.map((session) => session.id)).toEqual(["b1"]);
  });

  it("hides archived sessions until the archive filter is on", () => {
    const rows = [row("live", "/repo/a"), row("old", "/repo/a", { archived: true })];
    const hidden = projectSessionGroups({
      ...base,
      projects: [{ path: "/repo/a" }],
      rows,
    });
    expect(hidden[0]?.sessions.map((session) => session.id)).toEqual(["live"]);
    const shown = projectSessionGroups({
      ...base,
      projects: [{ path: "/repo/a" }],
      rows,
      filters: { ...DEFAULT_SESSION_SIDEBAR_FILTERS, showArchived: true },
    });
    expect(shown[0]?.sessions.map((session) => session.id)).toEqual(["old"]);
  });

  it("drops a project whose sessions miss the query and keeps an empty unmatched project out", () => {
    const groups = projectSessionGroups({
      ...base,
      query: "beta",
      projects: [{ path: "/repo/a" }, { path: "/repo/b" }],
      rows: [row("a1", "/repo/a", { title: "alpha" }), row("b1", "/repo/b", { title: "beta" })],
    });
    expect(groups.map((group) => group.cwd)).toEqual(["/repo/b"]);
  });

  it("keeps a project with no sessions when the user did not narrow the list", () => {
    const groups = projectSessionGroups({
      ...base,
      projects: [{ path: "/repo/a" }, { path: "/repo/empty" }],
      rows: [row("a1", "/repo/a")],
    });
    expect(groups.map((group) => [group.cwd, group.sessions.length])).toEqual([
      ["/repo/a", 1],
      ["/repo/empty", 0],
    ]);
  });

  it("uses the open project's git branch, else the newest session branch", () => {
    expect(
      projectBranchLabel("/repo/a", "/repo/a", "main", [
        row("old", "/repo/a", { branch: "stale", updatedAt: 1 }),
      ]),
    ).toBe("main");
    expect(
      projectBranchLabel("/repo/b", "/repo/a", "main", [
        row("old", "/repo/b", { branch: "old", updatedAt: 1 }),
        row("new", "/repo/b", { branch: "feat", updatedAt: 5 }),
      ]),
    ).toBe("feat");
    expect(projectBranchLabel("/repo/c", "/repo/a", "main", [])).toBeUndefined();
  });
});

describe("projectListPhase", () => {
  it("prefers the disconnected remote line over a load error", () => {
    expect(
      projectListPhase({
        remoteDisconnected: true,
        pending: true,
        failed: true,
      }),
    ).toBe("remote-disconnected");
    expect(
      projectListPhase({
        remoteDisconnected: false,
        pending: true,
        failed: true,
      }),
    ).toBe("pending");
    expect(
      projectListPhase({
        remoteDisconnected: false,
        pending: false,
        failed: true,
      }),
    ).toBe("error");
  });
});

describe("agentSections", () => {
  it("lists pinned sessions first, without their project, then the other sessions per project", () => {
    const groups = projectSessionGroups({
      ...base,
      projects: [{ path: "/repo/a" }, { path: "/repo/b" }],
      rows: [
        row("a1", "/repo/a"),
        row("a-pin", "/repo/a", { pinned: true, updatedAt: 5 }),
        row("b1", "/repo/b"),
        row("b-pin", "/repo/b", { pinned: true, updatedAt: 9 }),
      ],
    });
    const sections = agentSections(groups);
    expect(sections.pinned.map((session) => session.id)).toEqual([
      "b-pin",
      "a-pin",
    ]);
    expect(sections.projects.map((group) => group.cwd)).toEqual([
      "/repo/a",
      "/repo/b",
    ]);
    expect(sections.projects[0]?.sessions.map((session) => session.id)).toEqual([
      "a1",
    ]);
    expect(sections.projects[1]?.sessions.map((session) => session.id)).toEqual([
      "b1",
    ]);
  });

  it("leaves out a project with nothing to show but keeps its load error and disconnected lines", () => {
    const groups = projectSessionGroups({
      ...base,
      projects: [
        { path: "/repo/a" },
        { path: "/repo/empty" },
        { path: "/repo/failed" },
        { path: "/repo/remote" },
        { path: "/repo/pending" },
        { path: "/repo/only-pinned" },
      ],
      rows: [
        row("a1", "/repo/a"),
        row("p1", "/repo/only-pinned", { pinned: true }),
      ],
      failedPaths: new Set(["/repo/failed"]),
      remoteDisconnectedPaths: new Set(["/repo/remote"]),
      pendingPaths: new Set(["/repo/pending"]),
    });
    const sections = agentSections(groups);
    expect(sections.projects.map((group) => group.cwd)).toEqual([
      "/repo/a",
      "/repo/failed",
      "/repo/remote",
    ]);
    expect(sections.pinned.map((session) => session.id)).toEqual(["p1"]);
  });
});
