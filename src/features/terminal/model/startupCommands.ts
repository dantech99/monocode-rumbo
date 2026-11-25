/**
 * Commands typed into a terminal's shell once it starts. Held in memory only,
 * so a terminal restored after a restart opens a plain shell instead of
 * running the command again.
 */
const pending = new Map<string, string>();

export function queueStartupCommand(terminalId: string, command: string) {
  const trimmed = command.trim();
  if (trimmed) pending.set(terminalId, trimmed);
}

/** The command for this terminal, once: later calls return undefined. */
export function takeStartupCommand(terminalId: string): string | undefined {
  const command = pending.get(terminalId);
  pending.delete(terminalId);
  return command;
}
