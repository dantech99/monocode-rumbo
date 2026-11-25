import { pathKey } from "../../../shared/lib/paths";

/**
 * Per-project quick commands: a dev server, the test suite, a prompt for an
 * agent. Stored on this computer, keyed by project folder.
 */

const KEY = "rumbo.projectQuickCommands.v1";

export type QuickCommandAction = "terminal" | "agent";

export type QuickCommand = {
  id: string;
  label: string;
  /** A shell command for a terminal, or a prompt for an agent. */
  command: string;
  action: QuickCommandAction;
};

type ProjectCommands = {
  commands: QuickCommand[];
  /** The command the main button runs: the last one picked. */
  lastId?: string;
};

type Stored = Record<string, ProjectCommands>;

const listeners = new Set<() => void>();
let revision = 0;

function readAll(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Stored) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // private mode / quota
  }
  revision += 1;
  for (const listener of listeners) listener();
}

function update(
  project: string,
  change: (current: ProjectCommands) => ProjectCommands,
) {
  const all = readAll();
  const key = pathKey(project);
  const next = change(all[key] ?? { commands: [] });
  if (next.commands.length === 0) delete all[key];
  else all[key] = next;
  writeAll(all);
}

export function subscribeQuickCommands(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Bumps on every write so `useSyncExternalStore` consumers re-render. */
export function quickCommandsRevision(): number {
  return revision;
}

export function loadQuickCommands(project: string): QuickCommand[] {
  return readAll()[pathKey(project)]?.commands ?? [];
}

/** The command the main button runs: the last one picked, else the first. */
export function primaryQuickCommand(project: string): QuickCommand | undefined {
  const entry = readAll()[pathKey(project)];
  if (!entry) return undefined;
  return (
    entry.commands.find((command) => command.id === entry.lastId) ??
    entry.commands[0]
  );
}

/** Adds a command, or replaces the one with the same id. */
export function saveQuickCommand(
  project: string,
  command: Omit<QuickCommand, "id"> & { id?: string },
): QuickCommand {
  const saved: QuickCommand = {
    id: command.id ?? crypto.randomUUID(),
    label: command.label.trim(),
    command: command.command.trim(),
    action: command.action,
  };
  update(project, (current) => ({
    ...current,
    commands: current.commands.some((entry) => entry.id === saved.id)
      ? current.commands.map((entry) => (entry.id === saved.id ? saved : entry))
      : [...current.commands, saved],
  }));
  return saved;
}

export function removeQuickCommand(project: string, id: string): void {
  update(project, (current) => ({
    commands: current.commands.filter((entry) => entry.id !== id),
    lastId: current.lastId === id ? undefined : current.lastId,
  }));
}

export function markQuickCommandRun(project: string, id: string): void {
  update(project, (current) =>
    current.commands.some((entry) => entry.id === id)
      ? { ...current, lastId: id }
      : current,
  );
}
