import {
  newDefaultSession,
  newSession,
  type HarnessId,
  type RuntimeMode,
} from "../../features/sessions/model/session";
import { loadProjectProviderSettings } from "../../features/sessions/model/projectProviders";
import { worktreeFocus } from "../../features/source-control/model/worktreeFocus";
import { sameProjectPath } from "../../features/projects/model/recents";

/** Session defaults can supply permissions, but the visible project owns cwd. */
export function newWorkspaceSession(
  project: string,
  runtimeMode?: RuntimeMode,
  /** Start with this provider instead of the project's default. */
  harness?: HarnessId,
) {
  const focus = worktreeFocus(project);
  return {
    ...(harness
      ? newSession(
          harness,
          project,
          loadProjectProviderSettings(project).models?.[harness],
          runtimeMode,
        )
      : newDefaultSession(project, runtimeMode)),
    ...(focus && !sameProjectPath(focus.path, project)
      ? { worktreeCwd: focus.path, branch: focus.branch ?? undefined }
      : {}),
  };
}
