import { type JSX, type ReactNode } from "react";
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
  Zap,
} from "../../shared/ui/icons";
import { RailAction } from "./RailAction";

export type ProjectColumnGroup = ProjectSessionGroup & {
  label: string;
  initial: string;
  color: string;
  logoPath?: string;
};

export function ProjectSessionColumn({
  groups,
  cwd,
  query,
  onQueryChange,
  notesEnabled,
  searchActive,
  inboxActive,
  notesActive,
  automationsActive,
  inboxUnseen,
  onSearch,
  onOpenInbox,
  onOpenNotes,
  onOpenAutomations,
  onOpenProject,
  onOpenSettings,
  onSelectProject,
  renderSession,
}: {
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
}): JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col">
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
        <RailAction
          label="Automations"
          icon={Zap}
          onClick={onOpenAutomations}
          active={automationsActive}
        />
      </div>
      <div className="flex h-9 shrink-0 items-center border-b border-stroke px-2">
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
      </div>
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
      <nav aria-label="Spaces" className="min-h-0 flex-1 overflow-y-auto">
        {groups.map((group) => {
          const current = sameProjectPath(group.cwd, cwd);
          return (
            <section
              key={group.cwd}
              data-project={group.cwd}
              data-current={current ? "true" : undefined}
              className="px-1"
            >
              <button
                type="button"
                onClick={() => onSelectProject(group.cwd)}
                className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left ${
                  current
                    ? "bg-selection text-content"
                    : "text-content/80 hover:bg-content/8 hover:text-content"
                }`}
              >
                {group.logoPath ? (
                  <ProjectLogoIcon
                    path={group.logoPath}
                    className="size-5 shrink-0 rounded-[5px]"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid size-5 shrink-0 place-items-center rounded-[5px] text-[10px] font-semibold leading-none text-white"
                    style={{ backgroundColor: group.color }}
                  >
                    {group.initial}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {group.label}
                </span>
                {group.branch ? (
                  <span
                    data-project-branch
                    className="shrink-0 text-[11px] text-content/40"
                  >
                    {group.branch}
                  </span>
                ) : null}
              </button>
              {group.sessions.length > 0 ? (
                <div className="flex flex-col pl-6">
                  {group.sessions.map((session) => (
                    <div key={session.id}>{renderSession(session)}</div>
                  ))}
                </div>
              ) : null}
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
            </section>
          );
        })}
      </nav>
      <div className="shrink-0 p-2">
        <RailAction
          label="Settings"
          icon={Settings}
          onClick={onOpenSettings}
        />
      </div>
    </div>
  );
}
