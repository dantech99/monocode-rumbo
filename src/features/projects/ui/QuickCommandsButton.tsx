import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ExplorerMenu,
  type ExplorerMenuItem,
} from "../../files/ui/ExplorerMenu";
import { ChevronDown, Play, Plus } from "../../../shared/ui/icons";
import {
  loadQuickCommands,
  markQuickCommandRun,
  primaryQuickCommand,
  quickCommandsRevision,
  removeQuickCommand,
  saveQuickCommand,
  subscribeQuickCommands,
  type QuickCommand,
} from "../model/quickCommands";
import { QuickCommandDialog } from "./QuickCommandDialog";

export function quickCommandMenuItems(
  commands: QuickCommand[],
): ExplorerMenuItem[] {
  const pick = (prefix: string) =>
    commands.map((command) => ({
      kind: "item" as const,
      id: `${prefix}:${command.id}`,
      label: command.label,
    }));
  return [
    ...commands.map((command): ExplorerMenuItem => ({
      kind: "item",
      id: `run:${command.id}`,
      label: command.label,
      description: command.command.split("\n")[0],
      shortcut: command.action === "agent" ? "agent" : undefined,
    })),
    ...(commands.length ? [{ kind: "sep" as const }] : []),
    { kind: "item", id: "add", label: "Add command…" },
    ...(commands.length
      ? ([
          { kind: "item", id: "edit", label: "Edit", submenu: pick("edit") },
          {
            kind: "item",
            id: "remove",
            label: "Remove",
            danger: true,
            submenu: pick("remove"),
          },
        ] satisfies ExplorerMenuItem[])
      : []),
  ];
}

/** "▶ Start dev server ▾": runs a project's quick commands. */
export function QuickCommandsButton({
  cwd,
  onRun,
}: {
  cwd: string;
  onRun: (command: QuickCommand) => void;
}) {
  const revision = useSyncExternalStore(
    subscribeQuickCommands,
    quickCommandsRevision,
  );
  const { commands, primary } = useMemo(
    () => ({
      commands: loadQuickCommands(cwd),
      primary: primaryQuickCommand(cwd),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cwd, revision],
  );
  const menuAnchor = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState<QuickCommand | "new" | null>(null);

  const run = (command: QuickCommand) => {
    markQuickCommandRun(cwd, command.id);
    onRun(command);
  };
  const onPick = (id: string) => {
    setMenuOpen(false);
    if (id === "add") {
      setEditing("new");
      return;
    }
    const [kind, commandId] = id.split(":");
    const command = commands.find((entry) => entry.id === commandId);
    if (!command) return;
    if (kind === "run") run(command);
    else if (kind === "edit") setEditing(command);
    else if (kind === "remove") removeQuickCommand(cwd, command.id);
  };

  const plate =
    "flex h-6 items-center text-[12px] text-content/60 hover:bg-content/8 hover:text-content";
  return (
    <div className="flex items-center" data-tauri-drag-region="false">
      {primary ? (
        <button
          type="button"
          title={`Run ${primary.label}`}
          aria-label={`Run ${primary.label}`}
          onClick={() => run(primary)}
          className={`${plate} max-w-48 gap-1.5 rounded-l-md pl-2 pr-1.5`}
        >
          <Play className="size-3 shrink-0 text-accent" strokeWidth={2} />
          <span className="min-w-0 truncate">{primary.label}</span>
        </button>
      ) : null}
      <button
        ref={menuAnchor}
        type="button"
        title={primary ? "Quick commands" : "Add a quick command"}
        aria-label={primary ? "Quick commands" : "Add a quick command"}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => {
          if (primary) setMenuOpen((open) => !open);
          else setEditing("new");
        }}
        className={`${plate} gap-1 px-1.5 ${primary ? "rounded-r-md" : "rounded-md"}`}
      >
        {primary ? (
          <ChevronDown className="size-3" strokeWidth={2} />
        ) : (
          <>
            <Plus className="size-3" strokeWidth={2} />
            <span>Command</span>
          </>
        )}
      </button>
      {menuOpen && menuAnchor.current ? (
        <ExplorerMenu
          anchor={menuAnchor.current}
          items={quickCommandMenuItems(commands)}
          ariaLabel="Quick commands"
          width={260}
          onPick={onPick}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}
      {editing ? (
        <QuickCommandDialog
          initial={editing === "new" ? undefined : editing}
          onSave={(command) => {
            const saved = saveQuickCommand(cwd, command);
            if (editing === "new") markQuickCommandRun(cwd, saved.id);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
