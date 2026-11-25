import { sameProjectPath } from "../../projects/model/recents";
import {
  compareSessionSummaries,
  filterSessionsByArchive,
  filterSessionsByQuery,
} from "../data/sessionHistory";
import type { SessionSummary } from "../data/sessionStore";
import {
  filterSessionsByHarness,
  filterSessionsByStatus,
  filterSessionsByTime,
  hasActiveSessionFilters,
  type SessionSidebarFilters,
} from "./sessionFilters";

export type ProjectListPhase =
  | "pending"
  | "ready"
  | "error"
  | "remote-disconnected";

export type ProjectSessionGroup = {
  cwd: string;
  branch?: string;
  phase: ProjectListPhase;
  sessions: SessionSummary[];
};

export function projectBranchLabel(
  cwd: string,
  currentCwd: string,
  currentBranch: string | undefined,
  sessions: readonly SessionSummary[],
): string | undefined {
  if (sameProjectPath(cwd, currentCwd) && currentBranch) return currentBranch;
  const withBranch = sessions
    .filter((session) => session.branch)
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
  return withBranch[0]?.branch;
}

export function projectListPhase(input: {
  remoteDisconnected: boolean;
  pending: boolean;
  failed: boolean;
}): ProjectListPhase {
  if (input.remoteDisconnected) return "remote-disconnected";
  if (input.pending) return "pending";
  if (input.failed) return "error";
  return "ready";
}

export function projectSessionGroups(input: {
  projects: readonly { path: string }[];
  rows: readonly SessionSummary[];
  cwd: string;
  query: string;
  filters: SessionSidebarFilters;
  now: number;
  busyIds: Set<string>;
  approvalIds: Set<string>;
  unseenIds: Set<string>;
  pendingPaths: ReadonlySet<string>;
  failedPaths: ReadonlySet<string>;
  remoteDisconnectedPaths: ReadonlySet<string>;
  currentBranch?: string;
}): ProjectSessionGroup[] {
  const narrowed =
    Boolean(input.query.trim()) || hasActiveSessionFilters(input.filters);
  const groups: ProjectSessionGroup[] = [];
  for (const project of input.projects) {
    const own = input.rows.filter((row) =>
      sameProjectPath(row.cwd, project.path),
    );
    const sessions = filterSessionsByQuery(
      filterSessionsByStatus(
        filterSessionsByTime(
          filterSessionsByHarness(
            filterSessionsByArchive(own, input.filters.showArchived),
            input.filters.hiddenHarnesses,
          ),
          input.filters.time,
          input.now,
        ),
        input.filters.status,
        input.busyIds,
        input.approvalIds,
        input.unseenIds,
      ),
      input.query,
    ).sort(compareSessionSummaries);
    if (narrowed && sessions.length === 0) continue;
    const pending = [...input.pendingPaths].some((path) =>
      sameProjectPath(path, project.path),
    );
    const failed = [...input.failedPaths].some((path) =>
      sameProjectPath(path, project.path),
    );
    const remoteDisconnected = [...input.remoteDisconnectedPaths].some((path) =>
      sameProjectPath(path, project.path),
    );
    groups.push({
      cwd: project.path,
      branch: projectBranchLabel(
        project.path,
        input.cwd,
        input.currentBranch,
        own,
      ),
      phase: projectListPhase({ remoteDisconnected, pending, failed }),
      sessions,
    });
  }
  return groups;
}

export type AgentSections<G extends ProjectSessionGroup = ProjectSessionGroup> = {
  /** Pinned sessions from every project, newest first, without a project. */
  pinned: SessionSummary[];
  /** Per project, its sessions that are not pinned. */
  projects: G[];
};

/**
 * Splits the per-project groups into the "Agents" list: pinned sessions
 * first, then each project with something to show. A project with no
 * sessions drops out, except one whose load failed or whose machine is not
 * connected, which keeps its line. A project still loading shows nothing yet.
 */
export function agentSections<G extends ProjectSessionGroup>(
  groups: readonly G[],
): AgentSections<G> {
  const pinned = groups
    .flatMap((group) => group.sessions.filter((session) => session.pinned))
    .sort(compareSessionSummaries);
  const projects: G[] = [];
  for (const group of groups) {
    const sessions = group.sessions.filter((session) => !session.pinned);
    const hasLine =
      group.phase === "error" || group.phase === "remote-disconnected";
    if (sessions.length === 0 && !hasLine) continue;
    projects.push({ ...group, sessions });
  }
  return { pinned, projects };
}
