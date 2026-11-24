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
