import { type JSX, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { sameProjectPath } from "../../features/projects/model/recents";
import { ProjectLogoIcon } from "../../features/projects/ui/ProjectLogoIcon";
import type { SessionSummary } from "../../features/sessions/data/sessionStore";
import type { ProjectSessionGroup } from "../../features/sessions/model/projectSessionGroups";
import {
  File,
  Inbox,
  Plus,
  Search,
  Settings,
} from "../../shared/ui/icons";
import { RailAction } from "./RailAction";

export type ProjectColumnGroup = ProjectSessionGroup & {
  label: string;
  initial: string;
  color: string;
  logoPath?: string;
};

/** A row of the flat Spaces list; its sessions live in the Agents list. */
export type ProjectColumnSpace = Omit<ProjectColumnGroup, "sessions" | "phase"> &
  Partial<Pick<ProjectColumnGroup, "sessions" | "phase">>;

/** Opens a project's menu at a point, from a right-click or the keyboard. */
export type ProjectContextMenuHandler = (
  path: string,
  x: number,
  y: number,
  trigger: HTMLElement,
) => void;

export function ProjectSessionColumn({
  spaces,
  pinnedSessions,
  agentGroups,
  cwd,
  query,
  onQueryChange,
  notesEnabled,
  searchActive,
  inboxActive,
  notesActive,
  inboxUnseen,
  onSearch,
  onOpenInbox,
  onOpenInboxMenu,
  onOpenNotes,
  onOpenProject,
  onOpenSettings,
  onProjectContextMenu,
  onSelectProject,
  renderSession,
  sessionFilter,
  settingsActive = false,
  showList = true,
}: {
  /** Every project, flat, in the rail's order. */
  spaces: readonly ProjectColumnSpace[];
  /** Pinned sessions from every project, shown first under Agents. */
  pinnedSessions: readonly SessionSummary[];
  /** The projects that have something to list under Agents. */
  agentGroups: readonly ProjectColumnGroup[];
  cwd: string;
  query: string;
  onQueryChange: (query: string) => void;
  notesEnabled: boolean;
  searchActive: boolean;
  inboxActive: boolean;
  notesActive: boolean;
  inboxUnseen: boolean;
  onSearch: () => void;
  onOpenInbox: () => void;
  onOpenInboxMenu?: (x: number, y: number) => void;
  onOpenNotes?: () => void;
  onOpenProject: () => void;
  onOpenSettings: () => void;
  onProjectContextMenu?: ProjectContextMenuHandler;
  onSelectProject: (path: string) => void;
  renderSession: (session: SessionSummary) => ReactNode;
  /** Existing archive/filter control. Rendered on the search row. */
  sessionFilter?: ReactNode;
  settingsActive?: boolean;
  /** Action strip and Settings stay; the Spaces and Agents lists hide. */
  showList?: boolean;
}): JSX.Element {
  return (
    <div
      className={
        showList
          ? "flex h-full min-h-0 flex-col"
          : "flex min-h-0 shrink-0 flex-col"
      }
    >
      <div className="flex shrink-0 flex-col gap-px px-2 pt-1">
        <RailAction
          label="Search"
          icon={Search}
          onClick={onSearch}
          active={searchActive}
        />
        <RailAction
          label="Inbox"
          icon={Inbox}
          onClick={onOpenInbox}
          onOpenContextMenu={onOpenInboxMenu}
          dot={inboxUnseen}
          active={inboxActive}
        />
        {notesEnabled ? (
          <RailAction
            label="Notes"
            icon={File}
            onClick={onOpenNotes}
            active={notesActive}
          />
        ) : null}
      </div>
      {showList ? (
        <>
      <div className="flex h-7 shrink-0 items-center gap-1 px-3 text-[12px] font-medium text-content/50">
        <span className="min-w-0 flex-1 truncate">Spaces</span>
        <button
          type="button"
          aria-label="Open project"
          onClick={onOpenProject}
          className="grid size-6 shrink-0 place-items-center rounded-md text-content/50 hover:bg-content/10 hover:text-content"
        >
          <Plus className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
      <nav
        aria-label="Spaces"
        className="max-h-[40%] shrink-0 overflow-y-auto px-1"
      >
        {spaces.length === 0 ? (
          <p className="px-2 py-1.5 text-[12px] text-content/50">
            No project folder
          </p>
        ) : null}
        {spaces.map((space) => (
          <SpaceRow
            key={space.cwd}
            space={space}
            current={sameProjectPath(space.cwd, cwd)}
            onSelect={() => onSelectProject(space.cwd)}
            onContextMenu={onProjectContextMenu}
          />
        ))}
      </nav>
      <section
        aria-label="Agents"
        className="flex min-h-0 flex-1 flex-col border-t border-stroke/60 pt-1"
      >
        <div className="flex h-7 shrink-0 items-center px-3 text-[12px] font-medium text-content/50">
          <span className="min-w-0 flex-1 truncate">Agents</span>
        </div>
        <div className="flex h-9 shrink-0 items-center px-2">
          <div className="relative flex h-7 min-w-0 flex-1 items-center">
            <Search className="pointer-events-none absolute left-2 size-3 shrink-0 opacity-50" />
            <input
              type="text"
              value={query}
              placeholder="Search sessions..."
              aria-label="Search sessions"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Escape" || !query) return;
                event.preventDefault();
                event.stopPropagation();
                onQueryChange("");
              }}
              className="h-full w-full min-w-0 rounded-md bg-transparent py-0 pl-7 pr-2 text-[12px] text-content outline-none placeholder:text-content/35"
            />
          </div>
          {sessionFilter}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1">
          {pinnedSessions.length > 0 ? (
            <div data-agents-pinned className="pb-1">
              <p className="px-2 pb-0.5 pt-1 text-[11px] font-medium text-content/40">
                Pinned
              </p>
              {pinnedSessions.map((session) => (
                <div key={session.id}>{renderSession(session)}</div>
              ))}
            </div>
          ) : null}
          {agentGroups.map((group) => (
            <div
              key={group.cwd}
              data-agent-project={group.cwd}
              className="pb-1"
            >
              <p className="truncate px-2 pb-0.5 pt-1 text-[11px] font-medium text-content/40">
                {group.label}
              </p>
              {group.sessions.map((session) => (
                <div key={session.id}>{renderSession(session)}</div>
              ))}
              {group.phase === "error" ? (
                <p className="px-2 py-1 text-[12px] text-content/50">
                  Couldn’t load sessions
                </p>
              ) : null}
              {group.phase === "remote-disconnected" ? (
                <p className="px-2 py-1 text-[12px] text-content/45">
                  This project’s machine isn’t connected on this computer.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
        </>
      ) : null}
      <div className="shrink-0 p-2">
        <RailAction
          label="Settings"
          icon={Settings}
          onClick={onOpenSettings}
          active={settingsActive}
        />
      </div>
    </div>
  );
}

function SpaceRow({
  space,
  current,
  onSelect,
  onContextMenu,
}: {
  space: ProjectColumnSpace;
  current: boolean;
  onSelect: () => void;
  onContextMenu?: ProjectContextMenuHandler;
}): JSX.Element {
  return (
    <div
      data-project={space.cwd}
      data-current={current ? "true" : undefined}
    >
      <button
        type="button"
        onClick={onSelect}
        onContextMenu={
          onContextMenu
            ? (event: MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.focus();
                onContextMenu(
                  space.cwd,
                  event.clientX,
                  event.clientY,
                  event.currentTarget,
                );
              }
            : undefined
        }
        onKeyDown={
          onContextMenu
            ? (event: KeyboardEvent<HTMLButtonElement>) => {
                if (
                  event.key !== "ContextMenu" &&
                  !(event.shiftKey && event.key === "F10")
                )
                  return;
                event.preventDefault();
                event.stopPropagation();
                const rect = event.currentTarget.getBoundingClientRect();
                onContextMenu(
                  space.cwd,
                  rect.left,
                  rect.bottom,
                  event.currentTarget,
                );
              }
            : undefined
        }
        className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left ${
          current
            ? "bg-selection text-content"
            : "text-content/80 hover:bg-content/8 hover:text-content"
        }`}
      >
        {space.logoPath ? (
          <ProjectLogoIcon
            path={space.logoPath}
            className="size-5 shrink-0 rounded-[5px]"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-5 shrink-0 place-items-center rounded-[5px] text-[10px] font-semibold leading-none text-white"
            style={{ backgroundColor: space.color }}
          >
            {space.initial}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {space.label}
        </span>
        {space.branch ? (
          <span
            data-project-branch
            className="shrink-0 text-[11px] text-content/40"
          >
            {space.branch}
          </span>
        ) : null}
      </button>
    </div>
  );
}
