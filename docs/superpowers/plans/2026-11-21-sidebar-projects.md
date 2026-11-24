# Sidebar Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show every recent project in one left column, with that project's sessions always listed underneath it.

**Architecture:** A pure function groups already-loaded session rows under the rail's project order. `App` loads `listSessionsByProject` for every local recent project into the existing multi-project history cache. A new column renders the action strip, the Spaces list, and each project's `SessionCard`s. The project icon rail stops rendering. Files and Changes stay on their current tabs or right panel.

**Tech Stack:** React 19, TypeScript, Vitest (`src/**/*.test.ts`; add `// @vitest-environment happy-dom` for DOM tests).

**Spec:** `docs/superpowers/specs/2026-11-21-sidebar-projects-design.md`

## Global Constraints

- Project row: colored rounded square with the project's initial. A saved logo replaces the initial. Name on the left, truncated. Git branch on the right, dim. The current project (`cwd`) is highlighted across the row.
- Sessions under every project stay visible. Archived sessions stay hidden unless the archive filter is on.
- A project with no search or filter matches is omitted. An empty project that is not filtered shows the row only, with no "no sessions" illustration.
- Failed load copy is `Couldn’t load sessions` under that project only.
- Disconnected remote copy is `This project’s machine isn’t connected on this computer.`
- Header label is `Spaces`. The + button runs today's Open project action.
- Action strip order: Search, Inbox, Notes, Automations. Notes is omitted when notes are disabled. Footer is Settings.
- Do not delete `<app data>/monos/`. Do not remove project pixel mascots outside this column. Do not move Files or Changes.
- Opening a session switches `cwd` to that session's project when it is not current. The highlight follows `cwd`.

---

### Task 1: Group sessions under projects

**Files:**
- Create: `src/features/sessions/model/projectSessionGroups.ts`
- Test: `src/features/sessions/model/projectSessionGroups.test.ts`

**Interfaces:**
- Consumes: `SessionSummary` from `src/features/sessions/data/sessionStore.ts`; `SessionSidebarFilters` and `filterSessionsByArchive`, `filterSessionsByHarness`, `filterSessionsByQuery`, `filterSessionsByStatus`, `filterSessionsByTime` (status/time/harness from `src/features/sessions/model/sessionFilters.ts`, archive/query from `src/features/sessions/data/sessionHistory.ts`); `sameProjectPath` from `src/features/projects/model/recents.ts`; `compareSessionSummaries` from `src/features/sessions/data/sessionHistory.ts`.
- Produces:

```ts
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
): string | undefined;

export function projectListPhase(input: {
  remoteDisconnected: boolean;
  pending: boolean;
  failed: boolean;
}): ProjectListPhase;

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
}): ProjectSessionGroup[];
```

- [ ] **Step 1: Write the failing test**

Create `src/features/sessions/model/projectSessionGroups.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SessionSummary } from "../data/sessionStore";
import { DEFAULT_SESSION_SIDEBAR_FILTERS } from "./sessionFilters";
import {
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/sessions/model/projectSessionGroups.test.ts`

Expected: FAIL with `Cannot find module './projectSessionGroups'`.

- [ ] **Step 3: Write the implementation**

Create `src/features/sessions/model/projectSessionGroups.ts`:

```ts
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
```

Confirm `hasActiveSessionFilters` is exported from `sessionFilters.ts`. It is already used by `Sidebar.tsx`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/sessions/model/projectSessionGroups.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/sessions/model/projectSessionGroups.ts src/features/sessions/model/projectSessionGroups.test.ts
git commit -m "test: group sidebar sessions by project"
```

---

### Task 2: Load every local recent project into history

**Files:**
- Modify: `src/features/sessions/data/sessionHistory.ts` (append the helper)
- Modify: `src/features/sessions/data/sessionHistory.test.ts`
- Modify: `src/app/App.tsx` around `refreshHistory` (about lines 2548–2576) and `sidebarHistoryRows` (about lines 12008–12031)

**Interfaces:**
- Consumes: `projectRailItems`, `isRemoteProjectPath`, `sameProjectPath` from `src/features/projects/model/recents.ts`; existing `refreshHistory`, `replaceProjectHistory`, `historyWithLiveSessions`.
- Produces:

```ts
export function projectHistoryLoadPaths(
  projects: readonly { path: string }[],
  active: string,
): string[];
```

The active local project is first. Remote paths (`isRemoteProjectPath`) and `""` / `"~"` are omitted.

- [ ] **Step 1: Write the failing test**

Append to `src/features/sessions/data/sessionHistory.test.ts`:

```ts
import { projectHistoryLoadPaths } from "./sessionHistory";

describe("projectHistoryLoadPaths", () => {
  it("loads the active local project first and skips remote paths", () => {
    expect(
      projectHistoryLoadPaths(
        [
          { path: "/repo/b" },
          { path: "remote://host/repo" },
          { path: "/repo/a" },
          { path: "~" },
        ],
        "/repo/a",
      ),
    ).toEqual(["/repo/a", "/repo/b"]);
  });
});
```

Merge the import into the existing import from `./sessionHistory` instead of adding a second import.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/sessions/data/sessionHistory.test.ts -t projectHistoryLoadPaths`

Expected: FAIL because `projectHistoryLoadPaths` is not exported.

- [ ] **Step 3: Implement the helper and the load**

Append to `src/features/sessions/data/sessionHistory.ts`:

```ts
import { isRemoteProjectPath } from "../../projects/model/recents";

export function projectHistoryLoadPaths(
  projects: readonly { path: string }[],
  active: string,
): string[] {
  const local = projects
    .map((project) => project.path)
    .filter(
      (path) => Boolean(path) && path !== "~" && !isRemoteProjectPath(path),
    );
  const current = local.filter((path) => sameProjectPath(path, active));
  const rest = local.filter((path) => !sameProjectPath(path, active));
  return [...current, ...rest];
}
```

`sameProjectPath` is already imported in that file. Add `isRemoteProjectPath` to that same import. Do not add a second import of `recents`.

In `src/app/App.tsx`, replace the body of `refreshHistory` so a result is stored for the requested path even when it is not `sidebarCwdRef.current`. Keep the rule that a failed refresh does not wipe a project already in `loadedProjectsRef`.

```ts
const refreshHistory = useCallback(async (cwd: string) => {
  if (!cwd || cwd === "~") return;
  const key = normalizeProjectPath(cwd);
  setHistoryErrorPaths((prev) => {
    if (!prev.has(key)) return prev;
    const next = new Set(prev);
    next.delete(key);
    return next;
  });
  try {
    const rows = await listSessionsByProject(cwd);
    setHistory((current) => replaceProjectHistory(current, cwd, rows));
    setLoadedProjects((prev) =>
      prev.has(key) ? prev : new Set(prev).add(key),
    );
    if (sameProjectPath(cwd, sidebarCwdRef.current)) setHistoryErrorCwd(null);
  } catch {
    if (loadedProjectsRef.current.has(key)) return;
    setHistoryErrorPaths((prev) =>
      prev.has(key) ? prev : new Set(prev).add(key),
    );
    if (sameProjectPath(cwd, sidebarCwdRef.current)) setHistoryErrorCwd(key);
  }
}, []);
```

Add `const [historyErrorPaths, setHistoryErrorPaths] = useState<Set<string>>(() => new Set());` next to the existing history error state.

Replace the effect that only calls `refreshHistory(sidebarCwd)` with:

```ts
useEffect(() => {
  const paths = projectHistoryLoadPaths(
    projectRailItems(recents, sidebarCwd),
    sidebarCwd,
  );
  for (const path of paths) void refreshHistory(path);
}, [recents, sidebarCwd, refreshHistory]);
```

Import `projectHistoryLoadPaths` from `../features/sessions/data/sessionHistory` and `projectRailItems` from the recents module already imported in `App.tsx`. If `projectRailItems` is not imported yet, add it to the existing `recents` import.

Replace `sidebarHistoryRows` so each local project is merged with live sessions. `historyWithLiveSessions` still takes one cwd; call it once per loaded project path:

```ts
const sidebarHistoryRows = useMemo(() => {
  const projects = projectHistoryLoadPaths(
    projectRailItems(recents, sidebarCwd),
    sidebarCwd,
  );
  return projects.flatMap((path) =>
    historyWithLiveSessions(
      history,
      promptableSessions,
      path,
      sameProjectPath(path, sidebarCwd)
        ? {
            ...(projectBranches?.current
              ? { branch: projectBranches.current }
              : {}),
            ...(path && path !== "~" ? { repo: projectName(path) } : {}),
          }
        : path && path !== "~"
          ? { repo: projectName(path) }
          : undefined,
      orchestrationRuns,
    ),
  );
}, [
  history,
  orchestrationRuns,
  projectBranches,
  promptableSessions,
  recents,
  sidebarCwd,
]);
```

Pass `historyErrorPaths` and `loadedProjects` into `Sidebar` as `failedProjectPaths` and `loadedProjectPaths`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/sessions/data/sessionHistory.test.ts src/app/model/appLifecycle.test.ts`

Expected: PASS. `appLifecycle.test.ts` mocks `listSessionsByProject`; if the new effect's import pulls a new symbol through that mock, add the export to the existing `vi.mock` of the session store rather than changing lifecycle behavior.

- [ ] **Step 5: Commit**

```bash
git add src/features/sessions/data/sessionHistory.ts src/features/sessions/data/sessionHistory.test.ts src/app/App.tsx src/app/model/appLifecycle.test.ts
git commit -m "feat: load session history for every recent project"
```

---

### Task 3: Render the Spaces column

**Files:**
- Create: `src/app/shell/ProjectSessionColumn.tsx`
- Test: `src/app/shell/ProjectSessionColumn.test.ts`

**Interfaces:**
- Consumes: `ProjectSessionGroup` from Task 1. `RailAction` from `src/app/shell/RailAction.tsx`. Icons `Search`, `Inbox`, `File`, `Zap`, `Plus`, `Settings` from `src/shared/ui/icons`.
- Produces:

```ts
export type ProjectColumnGroup = ProjectSessionGroup & {
  label: string;
  initial: string;
  color: string;
  logoPath?: string;
};

export function ProjectSessionColumn(props: {
  groups: readonly ProjectColumnGroup[];
  cwd: string;
  query: string;
  onQueryChange: (query: string) => void;
  notesEnabled: boolean;
  searchActive: boolean;
  inboxActive: boolean;
  notesActive: boolean;
  automationsActive: boolean;
  inboxUnseen: boolean;
  onSearch: () => void;
  onOpenInbox: () => void;
  onOpenNotes?: () => void;
  onOpenAutomations: () => void;
  onOpenProject: () => void;
  onOpenSettings: () => void;
  onSelectProject: (path: string) => void;
  renderSession: (session: SessionSummary) => ReactNode;
}): JSX.Element;
```

The column does not call `listSessionsByProject` and does not import `features/monos`.

- [ ] **Step 1: Write the failing test**

Create `src/app/shell/ProjectSessionColumn.test.ts` with `// @vitest-environment happy-dom` at the top. Render two groups with `createRoot`, the same `act` pattern as `src/app/shell/SidebarRename.test.ts`.

```ts
// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { SessionSummary } from "../../features/sessions/data/sessionStore";
import { ProjectSessionColumn, type ProjectColumnGroup } from "./ProjectSessionColumn";

function session(id: string, cwd: string): SessionSummary {
  return {
    id,
    cwd,
    harness: "cursor",
    model: "gpt-5",
    runtimeMode: "supervised",
    title: id,
    createdAt: 1,
    updatedAt: 1,
  };
}

function group(
  cwd: string,
  label: string,
  sessions: SessionSummary[],
  extra: Partial<ProjectColumnGroup> = {},
): ProjectColumnGroup {
  return {
    cwd,
    label,
    initial: label[0]!.toUpperCase(),
    color: "hsl(200 70% 50%)",
    branch: cwd.endsWith("a") ? "main" : "develop",
    phase: "ready",
    sessions,
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("lists every project and its sessions, and highlights the current project", () => {
  const onSelectProject = vi.fn();
  const onOpenProject = vi.fn();
  act(() => {
    root.render(
      createElement(ProjectSessionColumn, {
        groups: [
          group("/repo/a", "alpha", [session("a1", "/repo/a")]),
          group("/repo/b", "beta", [session("b1", "/repo/b")]),
        ],
        cwd: "/repo/b",
        query: "",
        onQueryChange: vi.fn(),
        notesEnabled: true,
        searchActive: false,
        inboxActive: false,
        notesActive: false,
        automationsActive: false,
        inboxUnseen: false,
        onSearch: vi.fn(),
        onOpenInbox: vi.fn(),
        onOpenNotes: vi.fn(),
        onOpenAutomations: vi.fn(),
        onOpenProject,
        onOpenSettings: vi.fn(),
        onSelectProject,
        renderSession: (row) =>
          createElement("div", { "data-session-card": row.id }, row.title),
      }),
    );
  });
  const spaces = container.querySelector('nav[aria-label="Spaces"]')!;
  expect(
    [...spaces.querySelectorAll("[data-project]")].map((node) =>
      node.getAttribute("data-project"),
    ),
  ).toEqual(["/repo/a", "/repo/b"]);
  expect(container.querySelector('[data-session-card="a1"]')).not.toBeNull();
  expect(container.querySelector('[data-session-card="b1"]')).not.toBeNull();
  expect(
    spaces.querySelector('[data-project="/repo/b"]')!.getAttribute("data-current"),
  ).toBe("true");
  expect(
    spaces.querySelector('[data-project="/repo/b"] [data-project-branch]')!
      .textContent,
  ).toBe("develop");
  act(() => {
    spaces
      .querySelector<HTMLButtonElement>('[data-project="/repo/a"] button')!
      .click();
  });
  expect(onSelectProject).toHaveBeenCalledWith("/repo/a");
  act(() => {
    container.querySelector<HTMLButtonElement>('button[aria-label="Open project"]')!.click();
  });
  expect(onOpenProject).toHaveBeenCalledOnce();
});

it("shows the load error and the disconnected remote line without an empty illustration", () => {
  act(() => {
    root.render(
      createElement(ProjectSessionColumn, {
        groups: [
          group("/repo/a", "alpha", [], { phase: "error" }),
          group("/remote", "remote", [], { phase: "remote-disconnected", branch: undefined }),
          group("/repo/empty", "empty", [], { phase: "ready", branch: undefined }),
        ],
        cwd: "/repo/a",
        query: "",
        onQueryChange: vi.fn(),
        notesEnabled: false,
        searchActive: false,
        inboxActive: false,
        notesActive: false,
        automationsActive: false,
        inboxUnseen: true,
        onSearch: vi.fn(),
        onOpenInbox: vi.fn(),
        onOpenNotes: vi.fn(),
        onOpenAutomations: vi.fn(),
        onOpenProject: vi.fn(),
        onOpenSettings: vi.fn(),
        onSelectProject: vi.fn(),
        renderSession: () => null,
      }),
    );
  });
  expect(container.textContent).toContain("Couldn’t load sessions");
  expect(container.textContent).toContain(
    "This project’s machine isn’t connected on this computer.",
  );
  expect(container.textContent).not.toContain("Sessions you start will show up here");
  expect(container.querySelector('button[aria-label="Notes"]')).toBeNull();
  expect(container.querySelector('button[aria-label="Inbox"]')).not.toBeNull();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/shell/ProjectSessionColumn.test.ts`

Expected: FAIL with `Cannot find module './ProjectSessionColumn'`.

- [ ] **Step 3: Write the column**

Create `src/app/shell/ProjectSessionColumn.tsx`.

Layout, top to bottom:

1. A row of `RailAction`s: Search (`onSearch`, `active={searchActive}`), Inbox (`onOpenInbox`, `dot={inboxUnseen}`, `active={inboxActive}`), Notes only when `notesEnabled` (`onOpenNotes`, `active={notesActive}`), Automations (`onOpenAutomations`, `active={automationsActive}`). Icons: `Search`, `Inbox`, `File`, `Zap`.
2. The existing session query field: an input whose value is `query`, `onChange` calls `onQueryChange`, placeholder `Search sessions...`, `aria-label="Search sessions"`.
3. A header row: text `Spaces`, and a button `aria-label="Open project"` with the `Plus` icon calling `onOpenProject`.
4. `<nav aria-label="Spaces">`. For each group, a section `data-project={group.cwd}` `data-current={sameProjectPath(group.cwd, cwd) ? "true" : undefined}`.
   - The project button calls `onSelectProject(group.cwd)`. It shows a rounded square (`rounded-[5px]`, background `group.color`) with `group.initial`, unless `group.logoPath` is set, in which case render `ProjectLogoIcon` from `src/features/projects/ui/ProjectLogoIcon.tsx`. The label truncates. The branch, when present, is `<span data-project-branch>{group.branch}</span>` aligned to the right.
   - Under the button, `group.sessions.map(renderSession)`.
   - `phase === "error"` renders `Couldn’t load sessions`.
   - `phase === "remote-disconnected"` renders `This project’s machine isn’t connected on this computer.`
   - `phase === "pending"` and `phase === "ready"` render no extra line when `sessions` is empty.
5. A footer button `aria-label="Settings"` with the `Settings` icon calling `onOpenSettings`.

Do not import `ProjectMascot` or `features/monos`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/shell/ProjectSessionColumn.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/shell/ProjectSessionColumn.tsx src/app/shell/ProjectSessionColumn.test.ts
git commit -m "feat: add the spaces session column"
```

---

### Task 4: Use the column in the sidebar and drop the project rail

**Files:**
- Modify: `src/app/shell/Sidebar.tsx`
- Modify: `src/app/App.tsx` (only the `Sidebar` props added in Task 2, if not already passed)
- Modify: `src/app/shell/SidebarRename.test.ts`

**Interfaces:**
- Consumes: `projectSessionGroups`, `ProjectSessionColumn`, `projectRailItems`, `SessionCard` (already exported from `Sidebar.tsx`), `isRemoteProjectPath`, `useRemoteProjectSessions` (already used in `Sidebar`).
- Produces: the sessions pane renders `ProjectSessionColumn`. `ProjectRail` and `CompactProjectRail` are no longer rendered. `MonoRailSection` is no longer rendered.

- [ ] **Step 1: Write the failing integration assertion**

In `src/app/shell/SidebarRename.test.ts`, replace `describe("project rail visibility", ...)` with:

```ts
describe("spaces column", () => {
  it("shows every recent project's sessions without collapsing them", async () => {
    props = {
      ...props,
      cwd: "/repo/a",
      recents: [
        { path: "/repo/a", openedAt: 2 },
        { path: "/repo/b", openedAt: 1 },
      ],
      sessions: [
        {
          ...props.sessions[0],
          id: "from-a",
          cwd: "/repo/a",
          title: "from-a",
        },
        {
          ...props.sessions[0],
          id: "from-b",
          cwd: "/repo/b",
          title: "from-b",
        },
      ],
      projectRailOpen: false,
      onSelectProject: vi.fn(),
      onOpenProject: vi.fn(),
    };
    await act(async () => render());
    const spaces = container.querySelector('nav[aria-label="Spaces"]');
    expect(spaces).not.toBeNull();
    expect(container.querySelector('[data-session-card="from-a"]')).not.toBeNull();
    expect(container.querySelector('[data-session-card="from-b"]')).not.toBeNull();
    expect(container.querySelector('nav[aria-label="Projects"]')).toBeNull();
    expect(document.querySelector('input[placeholder="Search projects..."]')).toBeNull();
  });
});
```

If `props.sessions[0]` does not satisfy `SessionSummary`, copy the object the file's `beforeEach` already builds and override `id`, `cwd`, and `title`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/shell/SidebarRename.test.ts -t "shows every recent project"`

Expected: FAIL because `nav[aria-label="Spaces"]` is missing.

- [ ] **Step 3: Wire the column and stop rendering the rail**

In `SidebarComponent`:

- Build groups with `projectRailItems(recents, cwd)` and `projectSessionGroups`. `rows` is `sessions` for local projects. When `isRemoteProjectPath(cwd)` and `sameProjectPath(project.path, cwd)`, use the existing remote session summaries already built as `projectSessions` for that one path. Add `cwd` to `remoteDisconnectedPaths` when `remoteProject && !remote.machine`. Add every other `isRemoteProjectPath` recent path to `remoteDisconnectedPaths`.
- `pendingPaths`: every rail project path that is not in `loadedProjectPaths` and is not remote. Add optional props `loadedProjectPaths?: ReadonlySet<string>` and `failedProjectPaths?: ReadonlySet<string>` to `Sidebar`'s props, defaulting to empty sets. The active project also stays pending while the existing `pending` prop is true and `sessions` for that path is empty.
- Replace the single-project session list (the block that maps `listedVisibleSessions` / `visibleSessions` inside the sessions scroll) with `ProjectSessionColumn`. Pass the existing session search state as `query` / `onQueryChange`. `renderSession` returns the existing `SessionCard` with the same callbacks the list uses today (`onSelect`, `onRename`, `onArchive`, `onDelete`, `onContextMenu`, busy, approval, active).
- Decorate each group with `label`, `initial`, `color`, and `logoPath` via `useProjectLabel`'s helpers: `resolveTabGroupLabel`, `resolveTabGroupColor`, `resolveTabGroupLogo`, `basename`, `projectName`, `projectKey`. `initial` is `Array.from(label)[0]?.toUpperCase() ?? "?"`. Do not use `ProjectMascot` in this column.
- Remove the JSX that renders `ProjectRail`, `CompactProjectRail`, and `MonoRailSection`. Leave Files, Changes, and Inbox tab panes as they are. On the sessions tab, and in the inset layout, the column is the sessions body. On Files or Changes, keep those panes and still show the column's action strip and Settings footer. Hide the session query and Spaces list when `tab` is `files` or `changes`.
- Clicking a session whose `cwd` is not the current project calls `onSelectProject(session.cwd)` before `onSelectSession(session.id)`.

Update other tests in `SidebarRename.test.ts` that query `input[placeholder="Search projects..."]`, `nav[aria-label="Projects"]`, or `button[aria-label^="Switch project"]` inside the removed rail. Session-card assertions stay. Do not change `NotesView.test.ts`, `Worktrees.test.ts`, or `McpSettings.test.ts`; those talk to the project picker, not this rail.

- [ ] **Step 4: Run the sidebar tests**

Run: `npx vitest run src/app/shell/SidebarRename.test.ts src/app/shell/ProjectSessionColumn.test.ts src/features/sessions/model/projectSessionGroups.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/shell/Sidebar.tsx src/app/shell/SidebarRename.test.ts src/app/App.tsx
git commit -m "feat: list sessions under every project in the sidebar"
```

---

## Self-review

Spec item → task:

| Spec item | Task |
| --- | --- |
| One column, rail gone | Task 4 |
| Search, Inbox, Notes, Automations above the list | Task 3 |
| Pinned-first order | Task 4 via `projectRailItems` |
| Initial or logo, name, branch, `cwd` highlight | Tasks 1 and 3 |
| Full history always visible, archived hidden | Task 1 |
| Same session row actions | Task 4 reuses `SessionCard` |
| Empty project has no illustration | Tasks 1 and 3 |
| Remote disconnected line | Tasks 1, 3, and 4 |
| Session search across projects | Tasks 1 and 4 |
| Open session switches project | Task 4 |
| Project click switches project | Task 3 |
| `Spaces` and Open project | Task 3 |
| Settings footer | Task 3 |
| Files and Changes stay | Task 4 |
| Active project loads first, others follow, per-project error | Task 2 |
| Mono rail section hidden | Task 4. Full Mono deletion is the other plan. |

## Out of scope

Mono product deletion, title-bar Mono, settings Mono, and Rust Mono commands are `docs/superpowers/plans/2026-11-21-remove-monos.md`.
