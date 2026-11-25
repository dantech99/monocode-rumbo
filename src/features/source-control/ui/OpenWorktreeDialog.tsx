import { useProjectWorktrees } from "../hooks/useProjectWorktrees";
import { NO_BRANCH_LABEL, type Worktree } from "../model/worktrees";
import { prettyCwd } from "../../../shared/lib/paths";
import { Modal } from "../../../shared/ui/Modal";
import { GitBranch, Loader } from "../../../shared/ui/icons";

/** Lists a project's linked worktrees and hands back the one picked. */
export function OpenWorktreeDialog({
  cwd,
  onOpen,
  onCancel,
}: {
  cwd: string;
  onOpen: (tree: Worktree) => void;
  onCancel: () => void;
}) {
  const { data, error } = useProjectWorktrees(cwd, true);
  const trees = (data?.worktrees ?? []).filter(
    (tree) => !tree.isMain && !tree.missing,
  );
  return (
    <Modal title="Open worktree" size="sm" onClose={onCancel}>
      <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto p-2">
        {error ? (
          <p className="px-2 py-3 text-[12px] text-red-300/90">
            {String(error)}
          </p>
        ) : !data ? (
          <Loader className="m-3 size-4 animate-spin text-content/45" />
        ) : trees.length === 0 ? (
          <p className="px-2 py-3 text-[12px] text-content/55">
            This project has no other worktrees.
          </p>
        ) : (
          trees.map((tree) => (
            <button
              key={tree.path}
              type="button"
              onClick={() => onOpen(tree)}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-content/5"
            >
              <GitBranch className="size-3.5 shrink-0 text-content/50" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">
                  {tree.branch ?? NO_BRANCH_LABEL}
                </span>
                <span className="block truncate text-[11px] text-content/45">
                  {prettyCwd(tree.path)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
