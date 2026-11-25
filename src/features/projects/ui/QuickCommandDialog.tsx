import { useEffect, useRef, useState, type FormEvent } from "react";
import { Modal } from "../../../shared/ui/Modal";
import type { QuickCommand, QuickCommandAction } from "../model/quickCommands";

const ACTIONS: { value: QuickCommandAction; label: string }[] = [
  { value: "terminal", label: "Terminal" },
  { value: "agent", label: "Agent" },
];

/** Add or edit one quick command of a project. */
export function QuickCommandDialog({
  initial,
  onSave,
  onCancel,
}: {
  initial?: QuickCommand;
  onSave: (command: Omit<QuickCommand, "id"> & { id?: string }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [command, setCommand] = useState(initial?.command ?? "");
  const [action, setAction] = useState<QuickCommandAction>(
    initial?.action ?? "terminal",
  );
  const labelInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => labelInput.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const canSave = label.trim() !== "" && command.trim() !== "";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    onSave({ id: initial?.id, label, command, action });
  };
  const field =
    "rounded-md border border-content/10 bg-background-base px-2.5 text-[13px] outline-none focus:border-content/25";
  return (
    <Modal
      title={initial ? "Edit Quick Command" : "Add Quick Command"}
      description={
        action === "terminal"
          ? "Saved for this project. Runs in a new tab and keeps a shell open when it ends."
          : "Saved for this project. Starts a new agent session with this prompt."
      }
      size="md"
      onClose={onCancel}
    >
      <form className="flex flex-col gap-4 p-4" onSubmit={submit}>
        <div className="flex items-end gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-[12px] text-content/70">
            <span>Label</span>
            <input
              ref={labelInput}
              aria-label="Label"
              className={`${field} h-9`}
              value={label}
              placeholder="Start dev server"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <div className="flex flex-col gap-1.5 text-[12px] text-content/70">
            <span>Action</span>
            <div role="radiogroup" aria-label="Action" className="flex gap-1">
              {ACTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={action === option.value}
                  onClick={() => setAction(option.value)}
                  className={`h-9 rounded-md border px-3 text-[12px] ${
                    action === option.value
                      ? "border-content/25 bg-content/10 text-content"
                      : "border-content/10 text-content/60 hover:bg-content/5"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <label className="flex flex-col gap-1.5 text-[12px] text-content/70">
          <span>{action === "terminal" ? "Command" : "Prompt"}</span>
          <textarea
            aria-label={action === "terminal" ? "Command" : "Prompt"}
            className={`${field} min-h-32 resize-y py-2 font-mono`}
            value={command}
            placeholder={
              action === "terminal"
                ? "npm run dev"
                : "Run the tests and fix any failure"
            }
            spellCheck={false}
            onChange={(e) => setCommand(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[12px] hover:bg-content/8 active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-md bg-content px-3 py-1.5 text-[12px] font-medium text-background-base disabled:opacity-40 active:scale-[0.97]"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
