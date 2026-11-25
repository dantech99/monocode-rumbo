import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ExplorerMenu } from "../../features/files/ui/ExplorerMenu";
import { HarnessIcon } from "../../features/sessions/ui/HarnessIcon";
import {
  getHarnessAvailabilitySnapshot,
  hasProbedHarnessAvailability,
  isHarnessAvailable,
  subscribeHarnessAvailability,
} from "../../integrations/harness/core/availability";
import { MOD } from "../../platform/tauri/platform";
import { Plus } from "../../shared/ui/icons";
import {
  newTabMenuItems,
  parseNewTabAction,
  type NewTabAction,
} from "../model/newTabMenu";

/** The "+" after the tabs: terminal, agents, spaces and worktrees in one menu. */
export function NewTabButton({
  worktrees,
  onAction,
}: {
  worktrees: boolean;
  onAction: (action: NewTabAction) => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const availability = useSyncExternalStore(
    subscribeHarnessAvailability,
    getHarnessAvailabilitySnapshot,
  );
  const items = useMemo(
    () =>
      newTabMenuItems({
        isAvailable: isHarnessAvailable,
        probed: hasProbedHarnessAvailability(),
        worktrees,
        spaceShortcut: `${MOD}O`,
        agentIcon: (harness) => (
          <HarnessIcon harness={harness} className="size-3.5" />
        ),
      }),
    // The snapshot changes whenever a probe updates availability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availability, worktrees],
  );
  return (
    <>
      <button
        ref={button}
        type="button"
        title="New tab"
        aria-label="New tab"
        aria-haspopup="menu"
        aria-expanded={open}
        data-tauri-drag-region="false"
        onClick={() => setOpen((value) => !value)}
        // Sized and plated like an inactive tab beside it.
        className="ml-0.5 grid size-7.5 shrink-0 cursor-default place-items-center rounded-md bg-content/4 text-content/50 opacity-65 hover:bg-content/7 hover:text-content hover:opacity-100 focus-visible:opacity-100"
      >
        <Plus className="size-3.5" strokeWidth={1.75} />
      </button>
      {open && button.current ? (
        <ExplorerMenu
          anchor={button.current}
          items={items}
          ariaLabel="New tab"
          width={260}
          onPick={(id) => {
            setOpen(false);
            const action = parseNewTabAction(id);
            if (action) onAction(action);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
