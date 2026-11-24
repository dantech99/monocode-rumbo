import { NO_BRANCH_LABEL } from "../../features/source-control/model/worktrees";
import {
  type WorktreeFocus,
  inWorktreeFocus,
  useWorktreeFocus,
} from "../../features/source-control/model/worktreeFocus";
import {
  SidebarWorktreeSwitcher,
  type ProjectMenuFlyout,
} from "../../features/source-control/ui/SidebarWorktreeSwitcher";
import {
  CurrentProjectIcon,
  useProjectLabel,
} from "../../features/projects/ui/CurrentProjectIcon";
import { OrchestrationSidebarAgents } from "../../features/orchestration/ui/OrchestrationSidebarAgents";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleDashed,
  CircleDot,
  Folder,
  GitBranch,
  GitPullRequest,
  ListFilter,
  Pin,
  Plus,
  Search,
  Share,
} from "../../shared/ui/icons";
import { createPortal } from "react-dom";
import { useProjectSwipe } from "./useProjectSwipe";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  loadSidebarTabOrder,
  saveSidebarTabOrder,
  loadRightPanelTabOrder,
  saveRightPanelTabOrder,
  type RightPanelTab,
  type SidebarTabId,
} from "../../features/settings/model/appearance";
import { formatInteger } from "../../shared/lib/numbers";
import {
  basename,
  type GitFileDiffKind,
  type GitHistoryCommit,
} from "../../platform/tauri/fs";
import { MOD, SHIFT } from "../../platform/tauri/platform";
import { useTrafficLightsVisible } from "../../platform/tauri/useTrafficLightsVisible";
import { copyText } from "../../platform/tauri/clipboard";
import { resolveModel } from "../../features/sessions/model/models";
import type { OpenFileFn } from "../../features/search/model/search";
import { sessionDisplayTitle } from "../../features/sessions/model/session";
import { ParticleText } from "../../shared/ui/ParticleText";
import { nextUnseenFinishedSessions } from "../../features/sessions/model/sessionDone";
import { orchestrationTaskLabel } from "../../features/orchestration/model/orchestrationSummary";
import {
  orderedSessionActionIds,
  pruneSessionSelection,
  toggleSessionSelection,
} from "../../features/sessions/model/sessionSelection";
import {
  paneDropFromPoint,
  setExternalPaneDrop,
} from "../../features/workspace/model/paneDrop";
import type { PaneEdge } from "../../features/workspace/model/layout";
import { suppressTextSelection } from "../../shared/lib/drag";
import { LAYER } from "../../shared/lib/layers";
import { projectKey, projectName } from "../../shared/lib/paths";
import { RevealHeight } from "../../shared/ui/RevealHeight";
import { MODE_COMMAND_STYLES } from "../../features/sessions/ui/modeCommands";
import { OPERATOR_COMMAND } from "../../features/sessions/model/operatorCommand";
import { ORCHESTRATOR_COMMAND } from "../../features/sessions/model/orchestratorCommand";
import {
  compareSessionSummaries,
  filterSessionsByArchive,
  filterSessionsByQuery,
} from "../../features/sessions/data/sessionHistory";
import {
  addSessionToFolder,
  applySessionListDrop,
  buildSessionList,
  createFolderWithSessions,
  dissolveFolder,
  folderContaining,
  loadPinnedSessionsCollapsed,
  loadSessionFolders,
  mergeFolderSessionSummaries,
  pruneSessionFolders,
  removeSessionFromFolder,
  saveSessionFolders,
  sessionListNavigationIds,
  setFolderCollapsed,
  setFolderColor,
  setFolderCustomColor,
  subscribeSessionFolders,
  ungroupedSessions,
  type SessionFolder,
  type SessionListDropTarget,
} from "../../features/sessions/model/sessionFolders";
import { LIST_PAGE_SIZE, listWindowSize } from "../../shared/lib/listWindow";
import {
  filterSessionsByHarness,
  filterSessionsByStatus,
  filterSessionsByTime,
  harnessesInSessions,
  hasActiveSessionFilters,
  loadSessionSidebarFilters,
  saveSessionSidebarFilters,
  type SessionSidebarFilters,
} from "../../features/sessions/model/sessionFilters";
import type {
  HarnessId,
  LinkedWorkItem,
} from "../../features/sessions/model/session";
import type { LiveAgent } from "../../features/sessions/model/liveAgents";
import type { SessionSummary } from "../../features/sessions/data/sessionStore";
import {
  keybindingShortcutLabel,
  subscribeKeybindings,
  type SettingsSectionId,
} from "../../features/settings/model/settings";
import type { InstalledUpdate } from "../model/updateNotice";
import {
  resolveTabGroupColor,
  resolveTabGroupLabel,
  resolveTabGroupLogo,
  TAB_GROUP_COLORS,
} from "../../features/workspace/model/tabGroups";
import { useDragResize } from "../../shared/hooks/useDragResize";
import { useGitFileStatuses } from "../../features/source-control/hooks/useGitFileStatuses";
import { useLockOverscroll } from "../../shared/hooks/useLockOverscroll";
import { useProjectDiffStats } from "../../features/source-control/hooks/useProjectDiffStats";
import { useAnimatedReorder } from "../../shared/hooks/useAnimatedReorder";
import { normalizeHex } from "../../shared/lib/colorUtils";
import {
  collectRailProjects,
  loadProjectRailOrder,
  looksLikeProject,
  projectRailItems,
  saveProjectRailOrder,
  isRemoteProjectPath,
  sameProjectPath,
  type RecentProject,
} from "../../features/projects/model/recents";
import {
  ColorPickerPopover,
  ColorSwatchRow,
} from "../../shared/ui/ColorPickerPopover";
import {
  ExplorerMenu,
  type ExplorerMenuItem,
} from "../../features/files/ui/ExplorerMenu";
import { FileTree } from "../../features/files/ui/FileTree";
import { HarnessIcon } from "../../features/sessions/ui/HarnessIcon";
import { SessionCardPreview } from "../../features/sessions/ui/SessionCardPreview";
import { LiveAgentsPreview } from "../../features/sessions/ui/LiveAgentsPreview";
import { useProjectAppearance } from "../../features/projects/hooks/useProjectAppearance";
import { useTabGroupLogos } from "../../features/projects/hooks/useTabGroupLogos";
import { projectSessionGroups } from "../../features/sessions/model/projectSessionGroups";
import {
  ProjectSessionColumn,
  type ProjectColumnGroup,
} from "./ProjectSessionColumn";
import { InboxNotificationMenu } from "../../features/inbox/ui/InboxNotificationMenu";
import { TerminalSpinner } from "../../features/sessions/ui/TerminalSpinner";
import { DevModeSlot, IconButton, TabVisitNav } from "./TitleBar";
import { ProjectSearch } from "../../features/projects/ui/ProjectSearch";
import { Popover } from "../../shared/ui/Popover";
import {
  pickerProjects,
  ProjectPickerPopover,
  SearchableProjectPicker,
} from "../../features/projects/ui/SearchableProjectPicker";
import { useRailTooltip } from "./RailTooltip";
import { useProjectMenu } from "./useProjectMenu";
import { SessionFiltersMenu } from "../../features/sessions/ui/SessionFiltersMenu";
import { LinkSessionWorkItemDialog } from "../../features/sessions/ui/LinkSessionWorkItemDialog";
import { SidebarUpdateFooter } from "./SidebarUpdate";
import { SourceControl } from "../../features/source-control/ui/SourceControl";
import { GitHistoryGraph } from "../../features/source-control/ui/GitHistoryGraph";
import { GithubStarPrompt } from "./GithubStarPrompt";
import {
  type MonoRailProps,
} from "./MonoRailSection";
import {
  refreshRemoteProjectSessions,
  remoteRequest,
  remotePendingWorktree,
  remoteSessionFor,
  useRemoteProjectSessions,
} from "../../features/connections/model/connections";
import {
  parseRemotePath,
  remotePath,
  remoteProjectFor,
} from "../../features/connections/model/remoteProjects";

const MIN_WIDTH = 260;
/** The inset sidebar's one-line rows stay legible narrower. */
const INSET_MIN_WIDTH = 200;
/** How close to the window's left edge the pointer peeks the sidebar out. */
const PEEK_EDGE = 6;
/** Grace before a peek closes, so the pointer can cross a gap to the panel. */
const PEEK_CLOSE_DELAY = 180;
/** An open menu, not a hover preview, which keeps a peek out. */
const PEEK_HOLDING_MENU =
  "[data-popover-side]:not([role=tooltip]):not(:has([role=tooltip]))";
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 260;
const EMPTY_PROJECT_PATHS: ReadonlySet<string> = new Set();

let rememberedWidth = DEFAULT_WIDTH;

type SidebarTab = SidebarTabId;

const TAB_LABELS: Record<SidebarTab | RightPanelTab, string> = {
  sessions: "Sessions",
  inbox: "Inbox",
  files: "Explorer",
  changes: "Changes",
  graph: "History",
};

function projectPathBusy(
  paths: Iterable<string> | undefined,
  cwd: string,
): boolean {
  if (!paths) return false;
  for (const path of paths) {
    if (sameProjectPath(path, cwd)) return true;
  }
  return false;
}

type Props = {
  cwd: string;
  /** Working copy for Changes / explorer git. Falls back to `cwd`. */
  gitCwd?: string;
  /** Branch identity shown for a worktree whose folder has a temporary name. */
  explorerRootLabel?: string;
  /** Open tabs per worktree path key, for the worktree switcher. */
  worktreeTabStats?: ReadonlyMap<string, { tabs: number; busy: boolean }>;
  onSelectWorkspace?: (focus?: WorktreeFocus) => void;
  workspaceSwitchPending?: boolean;
  workspaceSwitchError?: string;
  open: boolean;
  sessions: SessionSummary[];
  busySessionIds: Set<string>;
  approvalSessionIds: Set<string>;
  activeSessionId?: string;
  /** Open tabs, including blank ones not yet in history. */
  openSessions?: readonly SessionSummary[];
  status: "idle" | "error";
  /** First listing for this project has not arrived yet. */
  pending: boolean;
  /** Projects whose session listing failed. */
  failedProjectPaths?: ReadonlySet<string>;
  /** Projects whose session rows are already cached. */
  loadedProjectPaths?: ReadonlySet<string>;
  /**
   * Live branch of the open project. Other projects use the latest session
   * summary. Omit when detached or unknown.
   */
  currentBranch?: string;
  onSelectSession: (sessionId: string) => void;
  onSelectRemoteSession?: (project: string, sessionId: string) => void;
  onRemoteSessionDeleted?: (sessionId: string) => void;
  onSessionNavigationOrder?: (ids: readonly string[]) => void;
  onPrefetchSession?: (sessionId: string) => void;
  onPlaceSessionOnPane?: (
    sessionId: string,
    targetId: string,
    edge: PaneEdge,
  ) => void;
  onRenameSession?: (sessionId: string, title: string) => void;
  onArchiveSession?: (sessionId: string, archived: boolean) => void;
  onArchiveSessions?: (
    sessionIds: readonly string[],
    archived: boolean,
  ) => void;
  onPinSession?: (sessionId: string, pinned: boolean) => void;
  onPinSessions?: (sessionIds: readonly string[], pinned: boolean) => void;
  onSetSessionLinkedWorkItem?: (
    sessionId: string,
    item: LinkedWorkItem | undefined,
  ) => void;
  onDeleteSession?: (sessionId: string) => void;
  onDeleteSessions?: (sessionIds: readonly string[]) => void;
  onOpenFile: OpenFileFn;
  onOpenTerminal?: (cwd: string) => void;
  onFileMoved?: (from: string, to: string) => void;
  onFileDeleted?: (path: string) => void;
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  filesSearchOpen: boolean;
  onFilesSearchOpenChange: (open: boolean) => void;
  onOpenFilesSearch?: () => void;
  searchFocusToken?: number;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onOpenDiff?: (path: string, kind?: GitFileDiffKind, pin?: boolean) => void;
  onOpenAllChanges?: (kind: GitFileDiffKind) => void;
  onOpenCommit?: (commit: GitHistoryCommit, pin?: boolean) => void;
  selectedDiffPath?: string;
  selectedDiffKind?: GitFileDiffKind;
  selectedCommitSha?: string;
  textHarness?: HarnessId;
  recents?: RecentProject[];
  busyProjectPaths?: Iterable<string>;
  liveAgents?: LiveAgent[];
  onSelectAgent?: (sessionId: string) => void;
  onSelectProject?: (path: string) => void;
  onOpenProject?: () => void;
  onRemoveProject?: (path: string, options: { purgeData: boolean }) => void;
  onNew?: () => string | void;
  onNewTerminal?: () => void;
  onSearch?: () => void;
  onOpenInbox?: () => void;
  onOpenInboxItem?: (item: LinkedWorkItem, sessionId: string) => void;
  onOpenNotes?: () => void;
  onGoToFile?: () => void;
  searchActive?: boolean;
  inboxActive?: boolean;
  notesActive?: boolean;
  notesEnabled?: boolean;
  onToggleProjectRail?: () => void;
  projectRailOpen?: boolean;
  compactProjectRail?: boolean;
  titleBarAbove?: boolean;
  /**
   * The inset layout sets the sidebar on the window's outer glass, beside its
   * card. Its header menu switches projects, so the rail only shows to carry
   * the settings navigation.
   */
  inset?: boolean;
  /**
   * Inset layout: Explorer, Changes and Graph render into this panel beside the
   * card, and the sidebar keeps to the sessions.
   */
  rightPanel?: {
    host: HTMLElement | null;
    open: boolean;
    tab: RightPanelTab;
    onTabChange: (tab: RightPanelTab) => void;
  };
  unseenFinishedIds?: Set<string>;
  inboxUnseen?: boolean;
  /** Linked GitHub work changed after the session last advanced. */
  linkedSessionUpdateIds?: ReadonlySet<string>;
  settingsOpen?: boolean;
  settingsSection?: SettingsSectionId;
  onOpenSettings?: () => void;
  onOpenNotificationSettings?: (projectPath?: string) => void;
  onSelectSettingsSection?: (section: SettingsSectionId) => void;
  onCloseSettings?: () => void;
  updateNotice?: InstalledUpdate | null;
  onOpenWhatsNew?: (version: string) => void;
  onDismissUpdate?: () => void;
  /** The Monos on the rail; absent while Monos are off. */
  monos?: MonoRailProps;
  /** A Mono fills the main area, which has no project sidebar. */
  monoViewActive?: boolean;
};

function SidebarComponent({
  cwd,
  gitCwd,
  explorerRootLabel,
  worktreeTabStats,
  onSelectWorkspace,
  workspaceSwitchPending,
  workspaceSwitchError,
  open,
  sessions,
  busySessionIds,
  approvalSessionIds,
  activeSessionId,
  openSessions = [],
  status,
  pending,
  failedProjectPaths = EMPTY_PROJECT_PATHS,
  loadedProjectPaths = EMPTY_PROJECT_PATHS,
  currentBranch,
  onSelectSession: onSelectLocalSession,
  onSelectRemoteSession,
  onRemoteSessionDeleted,
  onSessionNavigationOrder,
  onPrefetchSession: onPrefetchLocalSession,
  onPlaceSessionOnPane: onPlaceLocalSessionOnPane,
  onRenameSession: onRenameLocalSession,
  onArchiveSession: onArchiveLocalSession,
  onArchiveSessions: onArchiveLocalSessions,
  onPinSession: onPinLocalSession,
  onPinSessions: onPinLocalSessions,
  onSetSessionLinkedWorkItem: onSetLocalSessionLinkedWorkItem,
  onDeleteSession: onDeleteLocalSession,
  onDeleteSessions: onDeleteLocalSessions,
  onOpenFile,
  onOpenTerminal,
  onFileMoved,
  onFileDeleted,
  tab: requestedTab,
  onTabChange,
  filesSearchOpen,
  onFilesSearchOpenChange,
  onOpenFilesSearch,
  searchFocusToken = 0,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
  onOpenDiff,
  onOpenAllChanges,
  onOpenCommit,
  selectedDiffPath,
  selectedDiffKind,
  selectedCommitSha,
  textHarness,
  recents = [],
  busyProjectPaths,
  liveAgents = [],
  onSelectAgent,
  onSelectProject,
  onOpenProject,
  onRemoveProject,
  onNew,
  onSearch,
  onOpenInbox,
  onOpenInboxItem,
  onOpenNotes,
  onGoToFile,
  searchActive = false,
  inboxActive = false,
  notesActive = false,
  notesEnabled = true,
  onToggleProjectRail,
  projectRailOpen = true,
  compactProjectRail = true,
  titleBarAbove = false,
  inset = false,
  rightPanel,
  unseenFinishedIds: unseenFinishedIdsProp,
  inboxUnseen = false,
  linkedSessionUpdateIds = new Set(),
  settingsOpen = false,
  onOpenSettings,
  onOpenNotificationSettings,
  updateNotice = null,
  onOpenWhatsNew,
  onDismissUpdate,
  monoViewActive = false,
}: Props) {
  const trafficLightsVisible = useTrafficLightsVisible();
  const remoteProject = isRemoteProjectPath(cwd);
  const tab: SidebarTabId = requestedTab;
  const remote = useRemoteProjectSessions(cwd, remoteProject);
  const { groupLabels, groupColors, groupCustomColors } = useProjectAppearance();
  const groupLogos = useTabGroupLogos();
  const hostProject = remoteProject ? remoteProjectFor(cwd) : undefined;
  const remoteChange = async (
    sessionId: string,
    patch: {
      title?: string;
      archived?: boolean;
      pinned?: boolean;
      linkedWorkItem?: LinkedWorkItem | null;
    },
  ) => {
    if (!remote.machine || !hostProject) {
      window.alert("Connect this project's machine to change its sessions.");
      return;
    }
    try {
      await remoteRequest(remote.machine.id, "sessions.update", {
        projectId: hostProject.projectId,
        sessionId,
        ...patch,
      });
      refreshRemoteProjectSessions();
    } catch (error) {
      window.alert(`Could not update this session.\n\n${String(error)}`);
    }
  };
  const remoteDelete = async (sessionIds: readonly string[]) => {
    if (sessionIds.length === 0) return;
    if (!remote.machine || !hostProject) {
      window.alert("Connect this project's machine to delete its sessions.");
      return;
    }
    if (
      !window.confirm(
        `Delete ${sessionIds.length === 1 ? "this conversation" : `${sessionIds.length} conversations`}? This can’t be undone.`,
      )
    )
      return;
    try {
      for (const sessionId of sessionIds) {
        await remoteRequest(remote.machine.id, "sessions.delete", {
          projectId: hostProject.projectId,
          sessionId,
        });
        onRemoteSessionDeleted?.(sessionId);
      }
      refreshRemoteProjectSessions();
    } catch (error) {
      window.alert(`Could not delete this session.\n\n${String(error)}`);
      refreshRemoteProjectSessions();
    }
  };
  const onSelectSession = remoteProject
    ? (sessionId: string) => onSelectRemoteSession?.(cwd, sessionId)
    : onSelectLocalSession;
  const onPrefetchSession = remoteProject ? undefined : onPrefetchLocalSession;
  const onPlaceSessionOnPane = remoteProject
    ? undefined
    : onPlaceLocalSessionOnPane;
  const onRenameSession = remoteProject
    ? (sessionId: string, title: string) => {
        void remoteChange(sessionId, { title });
      }
    : onRenameLocalSession;
  const onArchiveSession = remoteProject
    ? (sessionId: string, archived: boolean) => {
        void remoteChange(sessionId, { archived });
      }
    : onArchiveLocalSession;
  const onArchiveSessions = remoteProject
    ? (sessionIds: readonly string[], archived: boolean) => {
        void Promise.all(
          sessionIds.map((id) => remoteChange(id, { archived })),
        );
      }
    : onArchiveLocalSessions;
  const onPinSession = remoteProject
    ? (sessionId: string, pinned: boolean) => {
        void remoteChange(sessionId, { pinned });
      }
    : onPinLocalSession;
  const onPinSessions = remoteProject
    ? (sessionIds: readonly string[], pinned: boolean) => {
        void Promise.all(sessionIds.map((id) => remoteChange(id, { pinned })));
      }
    : onPinLocalSessions;
  const onDeleteSession = remoteProject
    ? (sessionId: string) => {
        void remoteDelete([sessionId]);
      }
    : onDeleteLocalSession;
  const onDeleteSessions = remoteProject
    ? (sessionIds: readonly string[]) => {
        void remoteDelete(sessionIds);
      }
    : onDeleteLocalSessions;
  const onSetSessionLinkedWorkItem = remoteProject
    ? (sessionId: string, item: LinkedWorkItem | undefined) => {
        void remoteChange(sessionId, { linkedWorkItem: item ?? null });
      }
    : onSetLocalSessionLinkedWorkItem;
  const activeRemoteId = activeSessionId
    ? remoteSessionFor(activeSessionId)
    : undefined;
  const activeListedSessionId = remoteProject
    ? activeRemoteId
    : activeSessionId;
  const listedBusySessionIds = remoteProject
    ? new Set(
        remote.sessions
          .filter(
            (session) => session.status === "running" && !session.needsInput,
          )
          .map((session) => session.id),
      )
    : busySessionIds;
  const listedApprovalSessionIds = remoteProject
    ? new Set(
        remote.sessions
          .filter((session) => session.needsInput)
          .map((session) => session.id),
      )
    : approvalSessionIds;
  const projectSessions: SessionSummary[] = useMemo(
    () =>
      remoteProject
        ? remote.sessions.map((session) => ({
            id: session.id,
            cwd,
            harness: session.harness,
            model: session.model ?? "",
            runtimeMode: session.runtimeMode ?? "supervised",
            providerSessionId: session.providerSessionId ?? undefined,
            title: session.title,
            createdAt: session.createdAt ?? session.updatedAt,
            updatedAt: session.updatedAt,
            archived: session.archived,
            pinned: session.pinned,
            linkedWorkItem: session.linkedWorkItem,
            draft: session.draft,
            repo: session.repo,
            branch: session.branch,
            worktreeCwd: session.worktreeCwd,
          }))
        : sessions,
    [remoteProject, remote.sessions, sessions, cwd],
  );
  const remoteExecutionCwd =
    remote.sessions.find((session) => session.id === activeRemoteId)?.cwd ??
    (activeSessionId ? remotePendingWorktree(activeSessionId) : undefined) ??
    (remoteProject && gitCwd && gitCwd !== cwd
      ? (parseRemotePath(gitCwd)?.hostPath ?? gitCwd)
      : undefined) ??
    undefined;
  const gitRoot =
    remoteProject && hostProject
      ? remotePath(
          hostProject.environmentId,
          remoteExecutionCwd ?? hostProject.cwd,
        )
      : gitCwd || cwd;
  const minWidth = inset ? INSET_MIN_WIDTH : MIN_WIDTH;
  const resize = useDragResize({
    min: minWidth,
    max: () => Math.min(MAX_WIDTH, Math.floor(window.innerWidth * 0.5)),
    defaultWidth: DEFAULT_WIDTH,
    initial: rememberedWidth,
    onCommit: (next) => {
      rememberedWidth = next;
    },
  });
  const [tabOrder, setTabOrder] = useState<SidebarTab[]>(loadSidebarTabOrder);
  const [rightTabOrder, setRightTabOrder] =
    useState<RightPanelTab[]>(loadRightPanelTabOrder);
  const [now, setNow] = useState(() => Date.now());
  const sessionsLock = useLockOverscroll<HTMLDivElement>();
  const sessionsScrollRef = useRef<HTMLDivElement>(null);
  const [sessionMenu, setSessionMenu] = useState<{
    x: number;
    y: number;
    sessionId: string;
  } | null>(null);
  const [linkingSession, setLinkingSession] = useState<SessionSummary | null>(
    null,
  );
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const contextSelectionRef = useRef(false);
  const selectionAnchorRef = useRef<string | null>(null);
  const [folderMenu, setFolderMenu] = useState<{
    x: number;
    y: number;
    folderId: string;
  } | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(
    null,
  );
  const [, setRenamingFolderId] = useState<string | null>(null);
  const [sessionFolders, setSessionFolders] = useState<SessionFolder[]>(() =>
    loadSessionFolders(cwd),
  );
  const [pinnedSessionsCollapsed, setPinnedSessionsCollapsed] = useState(() =>
    loadPinnedSessionsCollapsed(cwd),
  );
  const [sessionDrop, setSessionDrop] = useState<SessionListDropTarget | null>(
    null,
  );
  const [sessionFilters, setSessionFilters] = useState(
    loadSessionSidebarFilters,
  );
  const [filterMenu, setFilterMenu] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionListLimit, setSessionListLimit] = useState(LIST_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLLIElement>(null);
  const pendingFolderSessionIds = useRef(new Set<string>());
  const busyIdsRef = useRef(busySessionIds);
  const focusedSessionIdRef = useRef(activeSessionId);
  const unseenFinishedLocalRef = useRef<Set<string>>(new Set());
  if (
    busyIdsRef.current !== busySessionIds ||
    focusedSessionIdRef.current !== activeSessionId
  ) {
    unseenFinishedLocalRef.current = nextUnseenFinishedSessions({
      previousBusyIds: busyIdsRef.current,
      busyIds: busySessionIds,
      previousUnseenIds: unseenFinishedLocalRef.current,
      focusedSessionId: activeSessionId,
    });
    busyIdsRef.current = busySessionIds;
    focusedSessionIdRef.current = activeSessionId;
  }
  const unseenFinishedIds =
    unseenFinishedIdsProp ?? unseenFinishedLocalRef.current;
  // Revisits render straight from cache, so this is only ever true the first
  // time a project is opened.
  const pendingFirstLoad = remoteProject
    ? !!remote.machine && !remote.loaded && projectSessions.length === 0
    : pending && sessions.length === 0;
  const worktreeFocus = useWorktreeFocus(cwd);
  const focusedWorktree = remoteProject ? undefined : worktreeFocus;
  const listableSessions = mergeFolderSessionSummaries(
    projectSessions,
    remoteProject ? [] : openSessions,
    sessionFolders,
  ).filter(
    (session) =>
      !("ephemeral" in session && session.ephemeral) &&
      !session.orchestrationLeadId &&
      inWorktreeFocus(session, focusedWorktree),
  );
  // Sessions saved hidden still show when a listed session started them:
  // /operator launches were once hidden by mistake.
  const shownSessionIds = new Set(
    listableSessions
      .filter((session) => !session.sidebarHidden)
      .map((session) => session.id),
  );
  const listedSessions = listableSessions.filter(
    (session) =>
      !session.sidebarHidden ||
      !!startedSessionCaller(session.id, shownSessionIds),
  );
  // projectSessionGroups keeps every row it is given, including hidden
  // orchestration launches. Trim those the same way the single-project
  // list does, then let the groups apply search and filters.
  const columnSourceRows = remoteProject
    ? [
        ...sessions.filter((session) => !sameProjectPath(session.cwd, cwd)),
        ...projectSessions,
      ]
    : mergeFolderSessionSummaries(sessions, openSessions, sessionFolders);
  const columnStructurallyListable = columnSourceRows.filter((session) => {
    if ("ephemeral" in session && session.ephemeral) return false;
    if (session.orchestrationLeadId) return false;
    if (
      sameProjectPath(session.cwd, cwd) &&
      !inWorktreeFocus(session, focusedWorktree)
    ) {
      return false;
    }
    return true;
  });
  const columnShownIds = new Set(
    columnStructurallyListable
      .filter((session) => !session.sidebarHidden)
      .map((session) => session.id),
  );
  const columnRows = columnStructurallyListable.filter(
    (session) =>
      !session.sidebarHidden ||
      !!startedSessionCaller(session.id, columnShownIds),
  );
  const visibleSessions = [
    ...filterSessionsByQuery(
      filterSessionsByStatus(
        filterSessionsByTime(
          filterSessionsByHarness(
            filterSessionsByArchive(
              listedSessions,
              sessionFilters.showArchived,
            ),
            sessionFilters.hiddenHarnesses,
          ),
          sessionFilters.time,
          now,
        ),
        sessionFilters.status,
        listedBusySessionIds,
        listedApprovalSessionIds,
        unseenFinishedIds,
      ),
      searchQuery,
    ),
  ].sort(compareSessionSummaries);
  // The inset list hangs the sessions an /operator thread started under it,
  // like an orchestrator's agents, rather than listing them on their own.
  const startedSessions = inset
    ? groupStartedSessions(visibleSessions)
    : NO_STARTED_SESSIONS;
  // Launches the sidebar has already shown for this project. Anything newer
  // grows in under its caller; what is there when a project opens does not.
  const knownStarted = useRef<{ cwd: string; ids: Set<string> } | null>(null);
  if (!knownStarted.current || knownStarted.current.cwd !== cwd)
    knownStarted.current = { cwd, ids: new Set(startedSessions.childIds) };
  const freshStarted = new Set(
    [...startedSessions.childIds].filter(
      (id) => !knownStarted.current!.ids.has(id),
    ),
  );
  useEffect(() => {
    for (const id of freshStarted) knownStarted.current?.ids.add(id);
  });
  const listedVisibleSessions = startedSessions.childIds.size
    ? visibleSessions.filter(
        (session) => !startedSessions.childIds.has(session.id),
      )
    : visibleSessions;
  const filtersActive = hasActiveSessionFilters(sessionFilters);
  const searchNarrowed = Boolean(searchQuery.trim());
  // Summaries for the whole project stay in `sessions` so filters still work.
  // Folders sit above the ungrouped list. Only a page of ungrouped cards
  // mounts; the sentinel below asks for the next page.
  const ungroupedVisible = ungroupedSessions(
    listedVisibleSessions,
    sessionFolders,
  );
  const activeUngroupedIndex = ungroupedVisible.findIndex(
    (session) => session.id === activeListedSessionId,
  );
  const shownUngroupedCount = listWindowSize(
    ungroupedVisible.length,
    sessionListLimit,
    activeUngroupedIndex,
  );
  const shownUngrouped = ungroupedVisible.slice(0, shownUngroupedCount);
  const fullSessionListEntries = buildSessionList(
    listedVisibleSessions,
    sessionFolders,
    ungroupedVisible,
    pinnedSessionsCollapsed,
  );
  const sessionListEntries = buildSessionList(
    listedVisibleSessions,
    sessionFolders,
    shownUngrouped,
    pinnedSessionsCollapsed,
  );
  // The inset list heads its loose sessions by when they were last active,
  // the order they are sorted in, so each label starts one unbroken run.
  const looseSessionLabels = new Map<number, string>();
  if (inset) {
    let previous: string | undefined;
    sessionListEntries.forEach((entry, index) => {
      if (entry.kind !== "session") return;
      const label = sessionAgeLabel(entry.session.updatedAt, now);
      if (label !== previous) looseSessionLabels.set(index, label);
      previous = label;
    });
  }
  const sessionNavigationIds = sessionListNavigationIds(
    fullSessionListEntries,
    searchNarrowed,
  );
  const sessionNavigationKey = sessionNavigationIds.join("\0");
  useEffect(() => {
    onSessionNavigationOrder?.(sessionNavigationIds);
  }, [onSessionNavigationOrder, sessionNavigationKey]);
  useEffect(() => {
    if (tab !== "sessions") {
      selectionAnchorRef.current = null;
      setSelectedSessionIds(new Set());
      return;
    }
    const available = new Set(sessionNavigationIds);
    if (
      selectionAnchorRef.current &&
      !available.has(selectionAnchorRef.current)
    ) {
      selectionAnchorRef.current = null;
    }
    setSelectedSessionIds((current) =>
      pruneSessionSelection(current, available),
    );
  }, [cwd, tab, sessionNavigationKey]);
  const hasMoreSessions = shownUngroupedCount < ungroupedVisible.length;
  const sessionListKey = `${cwd}\0${sessionFilters.showArchived}\0${sessionFilters.time}\0${sessionFilters.hiddenHarnesses.join(",")}\0${sessionFilters.status.working}\0${sessionFilters.status.needsApproval}\0${sessionFilters.status.done}\0${searchQuery}`;
  const sessionHarnesses = harnessesInSessions(projectSessions);
  const visibleTabs = tabOrder.filter((itemId) => itemId !== "inbox");
  const onReorderTabs = (ids: SidebarTab[]) => {
    const reordered = new Set(ids);
    let index = 0;
    const next = tabOrder.map((itemId) =>
      reordered.has(itemId) ? ids[index++] : itemId,
    );
    setTabOrder(next);
    saveSidebarTabOrder(next);
  };
  const onReorderRightTabs = (tabs: RightPanelTab[]) => {
    setRightTabOrder(tabs);
    saveRightPanelTabOrder(tabs);
  };
  const sortable = useAnimatedReorder(visibleTabs, onReorderTabs);
  const showProjectRail = Boolean(onSelectProject && onOpenProject);
  // Settings live in the rail slot, so they keep it visible even when the
  // project rail itself is collapsed.
  const railVisible = showProjectRail && (projectRailOpen || settingsOpen);
  // Keep the full rail mounted after its first reveal so reopening does not
  // recreate every project row and restart their Git-stat subscriptions.
  const railMounted = useRef(railVisible);
  if (railVisible) railMounted.current = true;
  // The column lists every project, so the compact rail's header is not used.
  const compactRailVisible = false;
  const inProject = looksLikeProject(cwd);
  const showSidebarFooter = !projectRailOpen;
  const otherViewActive =
    searchActive ||
    inboxActive ||
    notesActive ||
    settingsOpen;
  // Likewise the session they cover stays current but isn't shown selected.
  const highlightedSessionId =
    otherViewActive || monoViewActive ? undefined : activeListedSessionId;
  // The inset sidebar holds the links to search, inbox and notes,
  // and lets new users open their first project and Settings.
  // It stays available without a project; only settings take its place.
  // The classic action strip stays mounted while Search, Inbox, Notes,
  // or Settings covers the workspace, so the active control
  // can toggle back. Mono still has no project sidebar.
  const sidebarAvailable = inset
    ? !settingsOpen
    : !monoViewActive && inProject;
  const sidebarVisible = open && sidebarAvailable;
  // With the sidebar collapsed beside the compact rail, its tab shortcuts
  // open the sidebar temporarily until the user clicks away.
  const drawerMode = compactRailVisible && !open;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerVisible = drawerMode && drawerOpen && sidebarAvailable;
  // A dismissed drawer stays mounted while it slides shut. Anything that takes
  // its place (the pinned sidebar, another view) drops it at once.
  const [drawerMounted, setDrawerMounted] = useState(false);
  const drawerClosing =
    drawerMounted && !drawerVisible && drawerMode && sidebarAvailable;
  const drawerRendered = drawerVisible || drawerClosing;
  const drawerAnimation = useRef<Animation | null>(null);
  // The inset layout peeks a collapsed sidebar out over the workspace while
  // the pointer rests on the window's left edge or the sidebar toggle.
  const peekMode = inset && !open && sidebarAvailable;
  const [peekOpen, setPeekOpen] = useState(false);
  const peekOpenRef = useRef(false);
  peekOpenRef.current = peekOpen;
  const peekRef = useRef<HTMLDivElement>(null);
  const peekBackdropRef = useRef<HTMLDivElement>(null);
  const peekVisible = peekMode && peekOpen;
  const [peekMounted, setPeekMounted] = useState(false);
  const peekClosing = peekMounted && !peekVisible && peekMode;
  const peekRendered = peekVisible || peekClosing;
  const peekAnimation = useRef<Animation[] | null>(null);
  const panelOpen = open || drawerVisible || peekVisible;
  // Keep the hidden explorer intact when a chat tab changes worktrees. Its
  // rows and file icons only need rebuilding when Files is actually shown.
  // The inset layout's project tools follow the right panel rather than the
  // sidebar's own tab.
  const paneHost = inset ? rightPanel : undefined;
  const paneTab: SidebarTab | RightPanelTab | null = paneHost
    ? paneHost.open && inProject
      ? paneHost.tab
      : null
    : tab;
  const panesOpen = paneHost ? paneTab != null : panelOpen;
  const explorer = useRef<{ cwd: string; rootLabel?: string } | null>(null);
  if (panesOpen && paneTab === "files") {
    explorer.current = { cwd: gitRoot, rootLabel: explorerRootLabel };
  }
  const gitStatuses = useGitFileStatuses(
    gitRoot,
    panesOpen && paneTab === "files",
  );
  const changeStats = useProjectDiffStats(gitRoot, panesOpen);

  useEffect(() => {
    if (!drawerMode || !sidebarAvailable) setDrawerOpen(false);
  }, [drawerMode, sidebarAvailable]);

  useEffect(() => {
    if (drawerVisible) setDrawerMounted(true);
    else if (!drawerClosing) setDrawerMounted(false);
  }, [drawerVisible, drawerClosing]);

  // Grow the drawer's width so the workspace is pushed along with it. A
  // reversal mid-slide starts from wherever the width currently is.
  useLayoutEffect(() => {
    const drawer = drawerRef.current;
    if (!drawerRendered || !drawer) {
      drawerAnimation.current = null;
      return;
    }
    const full =
      drawer.firstElementChild instanceof HTMLElement
        ? drawer.firstElementChild.offsetWidth
        : 0;
    const from = drawerAnimation.current
      ? drawer.getBoundingClientRect().width
      : drawerClosing
        ? full
        : 0;
    drawerAnimation.current?.cancel();
    drawerAnimation.current = null;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (typeof drawer.animate !== "function" || reduceMotion) {
      if (drawerClosing) setDrawerMounted(false);
      return;
    }
    const animation = drawer.animate(
      [{ width: `${from}px` }, { width: `${drawerClosing ? 0 : full}px` }],
      drawerClosing
        ? {
            duration: 160,
            easing: "cubic-bezier(0.4, 0, 1, 1)",
            fill: "forwards",
          }
        : { duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    drawerAnimation.current = animation;
    animation.onfinish = () => {
      if (drawerAnimation.current !== animation) return;
      drawerAnimation.current = null;
      if (drawerClosing) setDrawerMounted(false);
    };
  }, [drawerRendered, drawerClosing]);

  useEffect(() => {
    if (!peekMode) setPeekOpen(false);
  }, [peekMode]);

  useEffect(() => {
    if (peekVisible) setPeekMounted(true);
    else if (!peekClosing) setPeekMounted(false);
  }, [peekVisible, peekClosing]);

  // Fade the panel in with a short drift from the edge, and the dim behind
  // it. A reversal midway starts from wherever both currently are.
  useLayoutEffect(() => {
    const panel = peekRef.current;
    const backdrop = peekBackdropRef.current;
    if (!peekRendered || !panel || !backdrop) {
      peekAnimation.current = null;
      return;
    }
    const hidden = { opacity: "0", transform: "translateX(-12px)" };
    const shown = { opacity: "1", transform: "none" };
    const running = peekAnimation.current;
    const from = running
      ? {
          opacity: getComputedStyle(panel).opacity,
          transform: getComputedStyle(panel).transform,
        }
      : peekClosing
        ? shown
        : hidden;
    const fromDim = running
      ? getComputedStyle(backdrop).opacity
      : peekClosing
        ? "1"
        : "0";
    running?.forEach((animation) => animation.cancel());
    peekAnimation.current = null;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (typeof panel.animate !== "function" || reduceMotion) {
      if (peekClosing) setPeekMounted(false);
      return;
    }
    const timing: KeyframeAnimationOptions = peekClosing
      ? {
          duration: 200,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "forwards",
        }
      : { duration: 240, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };
    const fade = panel.animate([from, peekClosing ? hidden : shown], timing);
    const dim = backdrop.animate(
      [{ opacity: fromDim }, { opacity: peekClosing ? "0" : "1" }],
      timing,
    );
    const animations = [fade, dim];
    peekAnimation.current = animations;
    fade.onfinish = () => {
      if (peekAnimation.current !== animations) return;
      peekAnimation.current = null;
      if (peekClosing) setPeekMounted(false);
    };
  }, [peekRendered, peekClosing]);

  useEffect(() => {
    if (!peekMode) return;
    let closeTimer: number | undefined;
    const cancelClose = () => {
      window.clearTimeout(closeTimer);
      closeTimer = undefined;
    };
    const scheduleClose = () => {
      if (closeTimer !== undefined) return;
      closeTimer = window.setTimeout(() => {
        closeTimer = undefined;
        setPeekOpen(false);
      }, PEEK_CLOSE_DELAY);
    };
    const onPointerMove = (event: PointerEvent) => {
      const el = event.target instanceof Element ? event.target : null;
      const onTrigger =
        !!el?.closest("[data-sidebar-peek-trigger]") ||
        (event.clientX <= PEEK_EDGE && !el?.closest("[data-inset-title-bar]"));
      if (onTrigger) {
        cancelClose();
        setPeekOpen(true);
        return;
      }
      if (!peekOpenRef.current) return;
      // Menus opened from the panel keep it out, as does a drag under way.
      if (
        peekRef.current?.contains(el) ||
        el?.closest("[data-popover-side]") ||
        document.querySelector(PEEK_HOLDING_MENU) ||
        event.buttons !== 0
      ) {
        cancelClose();
        return;
      }
      scheduleClose();
    };
    const onPointerLeave = () => {
      if (peekOpenRef.current && !document.querySelector(PEEK_HOLDING_MENU))
        scheduleClose();
    };
    // A click anywhere else puts the sidebar away at once.
    const onPointerDown = (event: PointerEvent) => {
      const el = event.target instanceof Element ? event.target : null;
      if (
        peekRef.current?.contains(el) ||
        el?.closest("[data-sidebar-peek-trigger],[data-popover-side]")
      ) {
        return;
      }
      cancelClose();
      setPeekOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (!peekOpenRef.current) return;
      cancelClose();
      setPeekOpen(false);
    };
    window.addEventListener("pointermove", onPointerMove);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelClose();
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener(
        "pointerleave",
        onPointerLeave,
      );
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [peekMode]);

  useEffect(() => {
    if (!drawerVisible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setDrawerOpen(false);
    };
    // The rail's own shortcuts toggle the drawer, and menus opened from it
    // stay usable; anything else dismisses it.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      const el = target instanceof Element ? target : null;
      if (drawerRef.current?.contains(el)) return;
      if (el?.closest("[data-compact-project-rail],[data-popover-side]")) {
        return;
      }
      setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [drawerVisible]);

  useEffect(() => {
    setSessionListLimit(LIST_PAGE_SIZE);
    const scroller = sessionsScrollRef.current;
    if (scroller) scroller.scrollTop = 0;
  }, [sessionListKey]);

  useEffect(() => {
    if (tab !== "sessions" || !hasMoreSessions) return;
    const sentinel = loadMoreRef.current;
    const root = sessionsScrollRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setSessionListLimit((current) => current + LIST_PAGE_SIZE);
      },
      { root, rootMargin: "240px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [tab, hasMoreSessions, shownUngroupedCount]);

  useEffect(() => {
    setSessionFolders(loadSessionFolders(cwd));
    setPinnedSessionsCollapsed(loadPinnedSessionsCollapsed(cwd));
    setRenamingFolderId(null);
    setFolderMenu(null);
    setSessionDrop(null);
    pendingFolderSessionIds.current.clear();
  }, [cwd]);

  useEffect(
    () =>
      subscribeSessionFolders(cwd, () => {
        setSessionFolders(loadSessionFolders(cwd));
      }),
    [cwd],
  );

  useEffect(() => {
    if (pending || status === "error") return;
    if (remoteProject && !remote.loaded) return;
    const known = new Set(projectSessions.map((session) => session.id));
    const completedFolderSessions = new Map<string, string>();
    for (const session of remoteProject ? [] : openSessions)
      known.add(session.id);
    if (activeListedSessionId) known.add(activeListedSessionId);
    if (remoteProject && activeSessionId) known.add(activeSessionId);
    if (remoteProject) {
      for (const folder of sessionFolders) {
        for (const shellId of folder.sessionIds) {
          const hostId = remoteSessionFor(shellId);
          if (hostId && known.has(hostId))
            completedFolderSessions.set(shellId, hostId);
        }
      }
    }
    for (const id of pendingFolderSessionIds.current) {
      known.add(id);
      const hostId = remoteProject ? remoteSessionFor(id) : undefined;
      if (hostId && known.has(hostId)) {
        completedFolderSessions.set(id, hostId);
        pendingFolderSessionIds.current.delete(id);
        continue;
      }
      if (
        projectSessions.some((session) => session.id === id) ||
        openSessions.some((session) => session.id === id)
      ) {
        pendingFolderSessionIds.current.delete(id);
      }
    }
    setSessionFolders((current) => {
      const migrated = completedFolderSessions.size
        ? current.map((folder) => ({
            ...folder,
            sessionIds: folder.sessionIds.map(
              (id) => completedFolderSessions.get(id) ?? id,
            ),
          }))
        : current;
      const next = pruneSessionFolders(migrated, known);
      if (next === current) return current;
      saveSessionFolders(cwd, next);
      return next;
    });
  }, [
    activeListedSessionId,
    activeSessionId,
    cwd,
    openSessions,
    pending,
    projectSessions,
    remoteProject,
    remote.loaded,
    sessionFolders,
    status,
  ]);

  useEffect(() => {
    if (tab !== "sessions") return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [tab]);

  useEffect(() => {
    if (tab !== "sessions") {
      setFilterMenu(null);
      setSearchQuery("");
    }
  }, [tab]);

  useEffect(() => {
    if (!sessionMenu && !folderMenu && !filterMenu) return;
    const onScroll = () => {
      closeSessionMenu();
      setFolderMenu(null);
      setFilterMenu(null);
    };
    const scrollParent = sessionsScrollRef.current ?? window;
    scrollParent.addEventListener("scroll", onScroll, true);
    return () => scrollParent.removeEventListener("scroll", onScroll, true);
  }, [sessionMenu, folderMenu, filterMenu]);

  useEffect(() => {
    if (selectedSessionIds.size === 0) return;
    const clear = () => {
      selectionAnchorRef.current = null;
      contextSelectionRef.current = false;
      setSelectedSessionIds(new Set());
      setSessionMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      clear();
    };
    // A pointer landing off the cards drops the selection; a menu acting on
    // it stays open, and the cards handle their own clicks.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      const el = target instanceof Element ? target : null;
      if (el?.closest("[data-session-card],[data-popover-side]")) return;
      clear();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [selectedSessionIds.size]);

  const commitSessionFolders = (next: SessionFolder[]) => {
    setSessionFolders(next);
    saveSessionFolders(cwd, next);
  };


  const menuSessionIds = sessionMenu
    ? orderedSessionActionIds(
        sessionMenu.sessionId,
        selectedSessionIds,
        sessionNavigationIds,
      )
    : [];
  const menuSessions = menuSessionIds.flatMap((sessionId) => {
    const session = listedSessions.find((entry) => entry.id === sessionId);
    return session ? [session] : [];
  });
  const multipleMenuSessions = menuSessionIds.length > 1;
  const allMenuSessionsPinned =
    menuSessions.length > 0 && menuSessions.every((session) => session.pinned);
  const allMenuSessionsArchived =
    menuSessions.length > 0 &&
    menuSessions.every((session) => session.archived);
  const menuSessionFolder =
    menuSessionIds.length === 1
      ? folderContaining(sessionFolders, menuSessionIds[0])
      : undefined;
  const anyMenuSessionFoldered = menuSessionIds.some((sessionId) =>
    sessionFolders.some((folder) => folder.sessionIds.includes(sessionId)),
  );
  const canRemoveMenuSessionsFromFolders = multipleMenuSessions
    ? anyMenuSessionFoldered
    : !!menuSessionFolder;
  const menuFolder = folderMenu
    ? sessionFolders.find((folder) => folder.id === folderMenu.folderId)
    : undefined;
  const folderMenuItems: ExplorerMenuItem[] = [
    { kind: "item", id: "rename", label: "Rename", shortcut: "F2" },
    { kind: "sep" },
    { kind: "item", id: "ungroup", label: "Ungroup" },
  ];
  const sessionMenuItems: ExplorerMenuItem[] = [
    ...(onPinSession || onPinSessions
      ? [
          {
            kind: "item" as const,
            id: "pin",
            label: allMenuSessionsPinned ? "Unpin" : "Pin",
          },
        ]
      : []),
    ...(!multipleMenuSessions && onRenameSession
      ? [
          {
            kind: "item" as const,
            id: "rename",
            label: "Rename",
            shortcut: "F2",
          },
        ]
      : []),
    ...(!multipleMenuSessions
      ? [
          {
            kind: "item" as const,
            id: "copy-session-id",
            label: "Copy session ID",
            submenu: [
              {
                kind: "item" as const,
                id: "copy-harness-session-id",
                label: "Harness session ID",
                disabled: !menuSessions[0]?.providerSessionId,
              },
              {
                kind: "item" as const,
                id: "copy-monocode-session-id",
                label: "MonoCode session ID",
              },
            ],
          },
        ]
      : []),
    ...(!multipleMenuSessions && onSetSessionLinkedWorkItem
      ? [
          {
            kind: "item" as const,
            id: "link-work-item",
            label: menuSessions[0]?.linkedWorkItem
              ? "Edit GitHub issue or PR link…"
              : "Link GitHub issue or PR…",
          },
        ]
      : []),
    { kind: "item" as const, id: "folder-new", label: "New folder" },
    ...(sessionFolders.length > 0 ? [{ kind: "sep" as const }] : []),
    ...sessionFolders.map((folder) => ({
      kind: "item" as const,
      id: `folder-add:${folder.id}`,
      label: `Add to ${folder.name}`,
      checked:
        menuSessionIds.length > 0 &&
        menuSessionIds.every((sessionId) =>
          folder.sessionIds.includes(sessionId),
        ),
    })),
    ...(canRemoveMenuSessionsFromFolders
      ? [
          {
            kind: "item" as const,
            id: "folder-remove",
            label: multipleMenuSessions
              ? "Remove from folders"
              : "Remove from folder",
          },
        ]
      : []),
    ...(onArchiveSession ||
    onArchiveSessions ||
    onDeleteSession ||
    onDeleteSessions
      ? [
          { kind: "sep" as const },
          ...(onArchiveSession || onArchiveSessions
            ? [
                {
                  kind: "item" as const,
                  id: "archive",
                  label: allMenuSessionsArchived ? "Unarchive" : "Archive",
                },
              ]
            : []),
          ...(onDeleteSession || onDeleteSessions
            ? [
                {
                  kind: "item" as const,
                  id: "delete",
                  label: "Delete",
                  shortcut: "⌫",
                  danger: true,
                },
              ]
            : []),
        ]
      : []),
  ];

  const onSessionContextMenu = (
    sessionId: string,
    e: ReactMouseEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    contextSelectionRef.current = !selectedSessionIds.has(sessionId);
    if (contextSelectionRef.current) {
      setSelectedSessionIds(new Set([sessionId]));
    }
    setFilterMenu(null);
    setFolderMenu(null);
    setSessionMenu({ x: e.clientX, y: e.clientY, sessionId });
  };

  const closeSessionMenu = () => {
    setSessionMenu(null);
    if (!contextSelectionRef.current) return;
    contextSelectionRef.current = false;
    selectionAnchorRef.current = null;
    setSelectedSessionIds(new Set());
  };

  const onSessionMenuPick = (id: string) => {
    if (!sessionMenu) return;
    const sessionId = sessionMenu.sessionId;
    const sessionIds = menuSessionIds;
    const providerSessionId = menuSessions[0]?.providerSessionId;
    const archived = allMenuSessionsArchived;
    const pinned = allMenuSessionsPinned;
    closeSessionMenu();
    if (id === "pin") {
      if (sessionIds.length > 1 && onPinSessions) {
        onPinSessions(sessionIds, !pinned);
      } else {
        for (const id of sessionIds) onPinSession?.(id, !pinned);
      }
      return;
    }
    if (id === "rename") {
      setRenamingSessionId(sessionId);
      return;
    }
    if (id === "copy-harness-session-id" || id === "copy-monocode-session-id") {
      const value =
        id === "copy-harness-session-id" ? providerSessionId : sessionId;
      if (value) {
        void copyText(value).catch((error) => {
          console.error("Failed to copy session ID:", error);
        });
      }
      return;
    }
    if (id === "link-work-item") {
      setLinkingSession(menuSessions[0] ?? null);
      return;
    }
    if (id === "folder-new") {
      const { folders, id: createdId } = createFolderWithSessions(
        sessionFolders,
        sessionIds,
      );
      if (!createdId) return;
      commitSessionFolders(folders);
      setRenamingFolderId(createdId);
      return;
    }
    if (id.startsWith("folder-add:")) {
      const folderId = id.slice("folder-add:".length);
      const folders = sessionIds.reduce(
        (current, id) => addSessionToFolder(current, folderId, id),
        sessionFolders,
      );
      commitSessionFolders(setFolderCollapsed(folders, folderId, false));
      return;
    }
    if (id === "folder-remove") {
      commitSessionFolders(
        sessionIds.reduce(
          (current, id) => removeSessionFromFolder(current, id),
          sessionFolders,
        ),
      );
      return;
    }
    if (id === "archive") {
      if (sessionIds.length > 1 && onArchiveSessions) {
        onArchiveSessions(sessionIds, !archived);
      } else {
        for (const id of sessionIds) onArchiveSession?.(id, !archived);
      }
      return;
    }
    if (id === "delete") {
      if (sessionIds.length > 1 && onDeleteSessions) {
        onDeleteSessions(sessionIds);
      } else {
        for (const id of sessionIds) onDeleteSession?.(id);
      }
    }
  };

  const onFolderMenuPick = (id: string) => {
    if (!folderMenu) return;
    const folderId = folderMenu.folderId;
    setFolderMenu(null);
    if (id === "rename") {
      setRenamingFolderId(folderId);
      return;
    }
    if (id === "ungroup") {
      commitSessionFolders(dissolveFolder(sessionFolders, folderId));
    }
  };

  const onFolderColorChange = (colorIndex: number | null) => {
    if (!folderMenu) return;
    commitSessionFolders(
      setFolderColor(sessionFolders, folderMenu.folderId, colorIndex),
    );
  };

  const onFolderCustomColorChange = (color: string) => {
    if (!folderMenu) return;
    commitSessionFolders(
      setFolderCustomColor(sessionFolders, folderMenu.folderId, color),
    );
  };

  const onSessionListDrop = (
    draggedId: string,
    target: SessionListDropTarget,
  ) => {
    const { folders, createdId } = applySessionListDrop(
      sessionFolders,
      draggedId,
      target,
    );
    if (folders === sessionFolders) return;
    commitSessionFolders(folders);
    if (createdId) setRenamingFolderId(createdId);
  };

  const isSessionDrop = (kind: "folder" | "session", id: string) =>
    sessionDrop?.kind === kind && sessionDrop.id === id;

  const onSessionCardSelect = (
    sessionId: string,
    event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  ) => {
    contextSelectionRef.current = false;
    setSessionMenu(null);
    if (event.shiftKey) {
      const visibleIds = sessionListNavigationIds(
        sessionListEntries,
        searchNarrowed,
      );
      if (
        selectionAnchorRef.current &&
        !visibleIds.includes(selectionAnchorRef.current)
      ) {
        selectionAnchorRef.current = null;
      }
      const anchor =
        selectionAnchorRef.current ?? activeListedSessionId ?? sessionId;
      const start = visibleIds.indexOf(anchor);
      const end = visibleIds.indexOf(sessionId);
      const range =
        start < 0 || end < 0
          ? [sessionId]
          : visibleIds.slice(Math.min(start, end), Math.max(start, end) + 1);
      selectionAnchorRef.current = start < 0 ? sessionId : anchor;
      setSelectedSessionIds(
        (current) =>
          new Set(
            event.ctrlKey || event.metaKey ? [...current, ...range] : range,
          ),
      );
      return;
    }
    selectionAnchorRef.current = sessionId;
    if (event.ctrlKey || event.metaKey) {
      const next = toggleSessionSelection(selectedSessionIds, sessionId);
      if (next.size === 0) selectionAnchorRef.current = null;
      setSelectedSessionIds(next);
      return;
    }
    setSelectedSessionIds(new Set());
    setDrawerOpen(false);
    const selected = columnRows.find((row) => row.id === sessionId);
    if (selected && !sameProjectPath(selected.cwd, cwd)) {
      onSelectProject?.(selected.cwd);
      onSelectLocalSession(sessionId);
      return;
    }
    onSelectSession(sessionId);
  };

  // Cards are memoized. Their handlers go through one stable set that calls
  // the latest version, so a sidebar render no longer re-renders every card.
  const cardHandlers = useRef({
    onSessionCardSelect,
    onOpenInboxItem,
    onPrefetchSession,
    onPlaceSessionOnPane,
    onSessionListDrop,
    onSessionContextMenu,
    onArchiveSession,
    setRenamingSessionId,
    onDeleteSession,
  });
  cardHandlers.current = {
    onSessionCardSelect,
    onOpenInboxItem,
    onPrefetchSession,
    onPlaceSessionOnPane,
    onSessionListDrop,
    onSessionContextMenu,
    onArchiveSession,
    setRenamingSessionId,
    onDeleteSession,
  };
  const cardActions = useMemo(
    () => ({
      select: (
        sessionId: string,
        event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
      ) => cardHandlers.current.onSessionCardSelect(sessionId, event),
      openWorkItem: (item: LinkedWorkItem, sessionId: string) =>
        cardHandlers.current.onOpenInboxItem?.(item, sessionId),
      prefetch: (sessionId: string) =>
        cardHandlers.current.onPrefetchSession?.(sessionId),
      placeOnPane: (sessionId: string, targetId: string, edge: PaneEdge) =>
        cardHandlers.current.onPlaceSessionOnPane?.(sessionId, targetId, edge),
      listDrop: (draggedId: string, target: SessionListDropTarget) =>
        cardHandlers.current.onSessionListDrop(draggedId, target),
      contextMenu: (sessionId: string, e: ReactMouseEvent<HTMLDivElement>) =>
        cardHandlers.current.onSessionContextMenu(sessionId, e),
      archive: (sessionId: string, archived: boolean) =>
        cardHandlers.current.onArchiveSession?.(sessionId, archived),
      rename: (sessionId: string) =>
        cardHandlers.current.setRenamingSessionId(sessionId),
      delete: (sessionId: string) =>
        cardHandlers.current.onDeleteSession?.(sessionId),
    }),
    [],
  );

  const sessionInsertMotion = useRef<SessionInsertMotion>({
    cwd: "",
    seen: new Set(),
  });
  // Runs after the rows' mount effects: a project's first paint never animates,
  // and rows that mount later (drawer opened, folder expanded) are not new.
  useLayoutEffect(() => {
    const motion = sessionInsertMotion.current;
    motion.cwd = cwd;
    for (const session of listedSessions) motion.seen.add(session.id);
  });

  // A session row, with the sessions it started hanging off a rail below it.

  const renderSessionRow = (
    session: SessionSummary,
    compact = false,
    {
      nested = false,
      startedCount = 0,
      startedOpen = false,
      startedInView = false,
    }: {
      nested?: boolean;
      startedCount?: number;
      startedOpen?: boolean;
      startedInView?: boolean;
    } = {},
  ) =>
    renamingSessionId === session.id && onRenameSession ? (
      <SessionRenameRow
        session={session}
        isActive={session.id === highlightedSessionId}
        needsApproval={listedApprovalSessionIds.has(session.id)}
        onCommit={(title) => {
          onRenameSession(session.id, title);
          setRenamingSessionId(null);
        }}
        onCancel={() => setRenamingSessionId(null)}
      />
    ) : (
      <SessionCard
        session={session}
        isActive={session.id === highlightedSessionId}
        isSelected={selectedSessionIds.has(session.id)}
        busy={listedBusySessionIds.has(session.id)}
        done={unseenFinishedIds.has(session.id)}
        linkedUpdate={linkedSessionUpdateIds.has(session.id)}
        needsApproval={listedApprovalSessionIds.has(session.id)}
        dropTarget={isSessionDrop("session", session.id)}
        compact={compact}
        dense={inset}
        nested={nested}
        startedCount={startedCount}
        startedOpen={startedOpen}
        startedInView={startedInView}
        now={now}
        onSelect={cardActions.select}
        onOpenWorkItem={
          onOpenInboxItem && !remoteProject
            ? cardActions.openWorkItem
            : undefined
        }
        onPrefetch={onPrefetchSession ? cardActions.prefetch : undefined}
        onPlaceOnPane={
          onPlaceSessionOnPane ? cardActions.placeOnPane : undefined
        }
        onListDrop={cardActions.listDrop}
        onListDropTargetChange={setSessionDrop}
        onContextMenu={cardActions.contextMenu}
        onArchive={onArchiveSession ? cardActions.archive : undefined}
        onRename={onRenameSession ? cardActions.rename : undefined}
        onDelete={onDeleteSession ? cardActions.delete : undefined}
      />
    );

  const onSessionFiltersChange = (next: SessionSidebarFilters) => {
    setSessionFilters(next);
    saveSessionSidebarFilters(next);
  };

  const onFilterButtonClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (filterMenu) {
      setFilterMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setSessionMenu(null);
    setFolderMenu(null);
    setFilterMenu({
      x: rect.right - 228,
      y: rect.bottom + 2,
    });
  };

  const onTabPick = (itemId: SidebarTab) => {
    onTabChange(itemId);
  };

  const changeAdditions = changeStats?.additions ?? 0;
  const changeDeletions = changeStats?.deletions ?? 0;
  const hasChangeStats = changeAdditions > 0 || changeDeletions > 0;
  const changesLabel = hasChangeStats
    ? [
        "Changes",
        changeAdditions > 0 ? `+${changeAdditions}` : "",
        changeDeletions > 0 ? `-${changeDeletions}` : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "Changes";

  const workspaceTabItems = visibleTabs.map((itemId) => {
    const active = tab === itemId;
    const isChangesTab = itemId === "changes";
    return (
      <div
        key={itemId}
        ref={(el) => sortable.setItemRef(itemId, el)}
        className="reorder-item workspace-tab relative flex min-w-0 flex-1 touch-none items-stretch"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          sortable.onItemPointerDown(itemId, event);
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={active}
          aria-label={isChangesTab ? changesLabel : undefined}
          data-tauri-drag-region="false"
          onClick={() => {
            if (sortable.consumeClick()) return;
            onTabPick(itemId);
          }}
          className={`flex h-6 min-w-0 flex-1 items-center justify-center self-center rounded-md px-2 text-[12px] leading-none ${
            active ? "bg-selection text-content" : "text-content/50"
          }`}
        >
          {isChangesTab && hasChangeStats ? (
            <DiffStat additions={changeAdditions} deletions={changeDeletions} />
          ) : (
            <span className="block truncate leading-label">
              {TAB_LABELS[itemId]}
            </span>
          )}
        </button>
      </div>
    );
  });

  const projectLabel = useProjectLabel(cwd);
  const [insetInboxMenu, setInsetInboxMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const insetInboxTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!panelOpen || !sidebarAvailable) setInsetInboxMenu(null);
  }, [panelOpen, sidebarAvailable]);
  const headerProjectMenu = useProjectMenu({
    onRemoveProject,
    onOpenNotificationSettings,
    onOpen: () => setInsetInboxMenu(null),
    // Only the inset layout uses this menu, and it has no project rail.
    railOptions: false,
  });
  // The inset layout names the project here, with its settings and the
  // project and worktree pickers in a menu below it.
  const headerProject = inset
    ? {
        name: projectLabel,
        icon: (
          <CurrentProjectIcon
            cwd={cwd}
            busy={projectPathBusy(busyProjectPaths, cwd)}
            mascotClassName="size-2.5"
          />
        ),
        onOpenSettings,
        settingsShortcut: `${MOD},`,
        keepOpen: headerProjectMenu.isActive,
        // The right-click project menu, as a flyout level with its row.
        onOpenProjectSettings: (row: HTMLElement) => {
          const rect = row.getBoundingClientRect();
          headerProjectMenu.open(cwd, rect.right, rect.top - 8, row);
        },
        onContextMenu: (x: number, y: number, trigger: HTMLElement) =>
          headerProjectMenu.open(cwd, x, y, trigger),
        onCloseProjectSettings: headerProjectMenu.close,
        projectSettingsOpen: headerProjectMenu.isOpen,
        renderProjectPicker: onSelectProject
          ? ({ anchor, layer, attributes, onClose }: ProjectMenuFlyout) => (
              <ProjectPickerPopover
                anchor={anchor}
                flyout={{ layer, attributes }}
                projects={pickerProjects(recents, cwd)}
                currentProject={cwd}
                onDismiss={onClose}
                onSelectProject={onSelectProject}
                onOpenProject={onOpenProject}
                onProjectContextMenu={headerProjectMenu.open}
                projectMenuActive={headerProjectMenu.isActive}
              />
            )
          : undefined,
      }
    : undefined;
  // The inset sidebar's spaces: the projects in the rail's order, the same
  // one Project: Previous / Next steps through.
  const spaceProjects = useMemo(
    () =>
      inset ? projectRailItems(recents, cwd).map((item) => item.path) : [],
    [inset, recents, cwd],
  );
  const swipeDestination = useRef<{ from: string; to: string } | null>(null);
  const onSwipeProject = useCallback(
    (path: string) => {
      swipeDestination.current = { from: cwd, to: path };
      onSelectProject?.(path);
    },
    [cwd, onSelectProject],
  );
  const projectSwipeRef = useProjectSwipe(inset, {
    cwd,
    projects: spaceProjects,
    onSelectProject: onSelectProject ? onSwipeProject : undefined,
  });
  const setSidebarRef = useCallback(
    (el: HTMLElement | null) => {
      resize.setPaneRef(el);
      projectSwipeRef(el);
    },
    [resize.setPaneRef, projectSwipeRef],
  );
  // Projects the rail never placed fall back to most-recent-first, which
  // reshuffles the spaces on every switch. The rail is not mounted in this
  // layout to save its order, so the spaces pin down whatever they show.
  useEffect(() => {
    if (!inset || !spaceProjects.length) return;
    const stored = loadProjectRailOrder();
    const unplaced = spaceProjects.some(
      (path) => !stored.some((saved) => sameProjectPath(saved, path)),
    );
    if (unplaced) saveProjectRailOrder(spaceProjects);
  }, [inset, spaceProjects]);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const previousSpace = useRef(cwd);
  // The outgoing project's header and list, copied while they are still on
  // screen, so they can be pushed away as the new ones arrive.
  const outgoingSpace = useRef<{
    to: string;
    nodes: { node: HTMLElement; scrollTop: number }[];
  } | null>(null);
  if (
    inset &&
    !sameProjectPath(previousSpace.current, cwd) &&
    outgoingSpace.current?.to !== cwd
  ) {
    outgoingSpace.current = {
      to: cwd,
      nodes: slideRefs.current.flatMap((el) => {
        if (!el?.isConnected) return [];
        const node = el.cloneNode(true) as HTMLElement;
        // A slide still holding the live copy hidden must not hide this one.
        node.style.opacity = "";
        return [{ node, scrollTop: el.scrollTop }];
      }),
    };
  }
  const spaceProjectsRef = useRef(spaceProjects);
  spaceProjectsRef.current = spaceProjects;
  const spaceSlide = useRef<{
    direction: number;
    swipe: boolean;
    overlay: HTMLDivElement | null;
    started: boolean;
    timer?: number;
    animations: Animation[];
  } | null>(null);
  const endSpaceSlide = useCallback(() => {
    const slide = spaceSlide.current;
    if (!slide) return;
    spaceSlide.current = null;
    window.clearTimeout(slide.timer);
    for (const animation of slide.animations) animation.cancel();
    slide.overlay?.remove();
    for (const el of slideRefs.current) if (el) el.style.opacity = "";
  }, []);
  // The push itself: both projects move the sidebar's full width together,
  // the old one fading out as the new one fades in.
  const startSpaceSlide = useCallback(() => {
    const slide = spaceSlide.current;
    if (!slide || slide.started) return;
    slide.started = true;
    window.clearTimeout(slide.timer);
    const aside = slideRefs.current[0]?.closest("aside");
    const distance = aside?.clientWidth ?? 240;
    const timing = slide.swipe
      ? { duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
      : { duration: 440, easing: "cubic-bezier(0.4, 0, 0.2, 1)" };
    for (const el of slideRefs.current) {
      if (!el || typeof el.animate !== "function") continue;
      el.style.opacity = "";
      slide.animations.push(
        el.animate(
          [
            {
              transform: `translateX(${slide.direction * distance}px)`,
              opacity: 0,
            },
            { transform: "none", opacity: 1 },
          ],
          timing,
        ),
      );
    }
    for (const node of slide.overlay?.children ?? []) {
      slide.animations.push(
        (node as HTMLElement).animate(
          [
            { transform: "none", opacity: 1 },
            {
              transform: `translateX(${-slide.direction * distance}px)`,
              opacity: 0,
            },
          ],
          { ...timing, fill: "forwards" },
        ),
      );
    }
    void Promise.all(slide.animations.map((animation) => animation.finished))
      .then(() => {
        if (spaceSlide.current === slide) endSpaceSlide();
      })
      .catch(() => undefined);
  }, [endSpaceSlide]);
  // Switching projects slides the sidebar the way the spaces run, like Zen's
  // workspaces: moving right, the old project leaves to the left as the new
  // one comes in from the right, and the reverse moving left.
  useLayoutEffect(() => {
    const from = previousSpace.current;
    previousSpace.current = cwd;
    const outgoing = outgoingSpace.current;
    outgoingSpace.current = null;
    if (sameProjectPath(from, cwd)) return;
    const destination = swipeDestination.current;
    swipeDestination.current = null;
    const swipe =
      !!destination &&
      sameProjectPath(destination.from, from) &&
      sameProjectPath(destination.to, cwd);
    const step = projectStep;
    projectStep = null;
    if (!inset) return;
    endSpaceSlide();
    const spaces = spaceProjectsRef.current;
    const fromIndex = spaces.findIndex((path) => sameProjectPath(path, from));
    const toIndex = spaces.findIndex((path) => sameProjectPath(path, cwd));
    if (fromIndex < 0 || toIndex < 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (slideRefs.current.some((el) => el && typeof el.animate !== "function"))
      return;
    // The copies sit on an overlay over the sidebar, each where its live
    // counterpart now is, covering it until the push starts.
    const aside = slideRefs.current[0]?.closest("aside");
    let overlay: HTMLDivElement | null = null;
    if (aside && outgoing?.nodes.length) {
      overlay = document.createElement("div");
      overlay.setAttribute("aria-hidden", "true");
      overlay.inert = true;
      overlay.className =
        "pointer-events-none absolute inset-0 z-20 overflow-hidden";
      const asideRect = aside.getBoundingClientRect();
      outgoing.nodes.forEach(({ node, scrollTop }, index) => {
        const live = slideRefs.current[index];
        if (!live) return;
        const rect = live.getBoundingClientRect();
        Object.assign(node.style, {
          position: "absolute",
          left: `${rect.left - asideRect.left}px`,
          top: `${rect.top - asideRect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });
        overlay!.append(node);
        node.scrollTop = scrollTop;
      });
      aside.append(overlay);
    }
    // Clicks and shortcuts can wait for first-load sessions. A swipe starts
    // immediately so disk/network latency does not hold the gesture still.
    for (const el of slideRefs.current) if (el) el.style.opacity = "0";
    spaceSlide.current = {
      // A step past either end wraps around but keeps moving the same way.
      direction:
        step && sameProjectPath(step.to, cwd)
          ? step.direction
          : toIndex > fromIndex
            ? 1
            : -1,
      overlay,
      swipe,
      started: false,
      animations: [],
      timer: swipe ? undefined : window.setTimeout(startSpaceSlide, 400),
    };
    if (swipe) startSpaceSlide();
  }, [cwd, inset, endSpaceSlide, startSpaceSlide]);
  useLayoutEffect(() => {
    if (spaceSlide.current && !pendingFirstLoad) startSpaceSlide();
  }, [cwd, pendingFirstLoad, startSpaceSlide]);
  useEffect(() => endSpaceSlide, [endSpaceSlide]);

  const workspaceHeader = (
    <div
      ref={(el) => {
        slideRefs.current[0] = el;
      }}
      // Inset, it sits just under the title bar, so it keeps less above the
      // project button than below it, and its search icon lines up with the
      // sessions' filter and times.
      className={`flex shrink-0 select-none items-center gap-1 pl-3${
        inset ? " h-[39px] pb-px pr-3" : " h-10 border-b border-stroke pr-1.5"
      }`}
      data-tauri-drag-region="deep"
    >
      <div className="flex min-w-0 flex-1 items-center">
        {(headerProject || !remoteProject) && cwd && cwd !== "~" ? (
          <SidebarWorktreeSwitcher
            worktrees={!remoteProject}
            cwd={cwd}
            tabStats={worktreeTabStats}
            onSelect={onSelectWorkspace}
            pending={workspaceSwitchPending}
            switchError={workspaceSwitchError}
            project={headerProject}
          />
        ) : (
          <span className="min-w-0 truncate text-sm font-medium leading-tight">
            Workspace
          </span>
        )}
      </div>
      {/* Inset, a new session is the + at the end of the title bar's tabs. */}
      <WorkspaceTitleActions
        onSearch={onGoToFile}
        onNew={inset ? undefined : onNew}
      />
      {headerProjectMenu.element}
    </div>
  );

  // The inset list names its loose sessions like the groups above them, and
  // carries the filter the search row holds elsewhere.
  const sessionsFilterButton = (
    <SessionsHeaderButton
      label="Filter sessions"
      active={filtersActive}
      open={!!filterMenu}
      hasPopup
      onClick={onFilterButtonClick}
    >
      <ListFilter className="size-3" strokeWidth={1.75} />
    </SessionsHeaderButton>
  );
  // Stands in for the date labels when no loose session is listed, so the
  // filter stays reachable.


  const filesPane = (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
        paneTab === "files" ? "" : "hidden"
      }`}
    >
      {filesSearchOpen ? (
        <ProjectSearch
          cwd={gitRoot}
          focusToken={searchFocusToken}
          onOpenFile={onOpenFile}
          onClose={() => onFilesSearchOpenChange(false)}
        />
      ) : cwd && cwd !== "~" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {explorer.current ? (
            <FileTree
              key={explorer.current.cwd}
              cwd={explorer.current.cwd}
              compactHeader={inset}
              rootLabel={explorer.current.rootLabel}
              onOpenFile={onOpenFile}
              onOpenTerminal={remoteProject ? undefined : onOpenTerminal}
              onFileMoved={onFileMoved}
              onFileDeleted={onFileDeleted}
              onSearch={onOpenFilesSearch}
              gitStatuses={gitStatuses}
            />
          ) : null}
        </div>
      ) : (
        <p className="px-3 py-2 text-[12px] text-content/50">
          No project folder
        </p>
      )}
    </div>
  );
  const changesPane = (
    <>
      {paneTab === "changes" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SourceControl
            cwd={gitRoot}
            enabled={panesOpen}
            showGraph={!inset}
            compactHeader={inset}
            textHarness={textHarness}
            selectedPath={selectedDiffPath}
            selectedKind={selectedDiffKind}
            selectedSha={selectedCommitSha}
            onOpenFile={
              onOpenDiff ??
              ((path) => onOpenFile(path, undefined, { exact: true }))
            }
            onOpenAllChanges={onOpenAllChanges ?? (() => {})}
            onOpenCommit={onOpenCommit ?? (() => {})}
          />
        </div>
      ) : null}
    </>
  );

  const graphPane = paneHost && paneTab === "graph" ? (
    <div
      role="tabpanel"
      aria-label="History"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <GitHistoryGraph
        cwd={gitRoot}
        enabled={panesOpen}
        selectedSha={selectedCommitSha}
        onOpenCommit={onOpenCommit ?? (() => {})}
      />
    </div>
  ) : null;

  const railProjects = projectRailItems(recents, cwd);
  const pendingPaths = new Set<string>();
  for (const project of railProjects) {
    if (isRemoteProjectPath(project.path)) continue;
    const loaded = [...loadedProjectPaths].some((path) =>
      sameProjectPath(path, project.path),
    );
    if (!loaded) pendingPaths.add(project.path);
  }
  if (
    pending &&
    !sessions.some((session) => sameProjectPath(session.cwd, cwd))
  ) {
    pendingPaths.add(cwd);
  }
  const remoteDisconnectedPaths = new Set<string>();
  if (remoteProject && !remote.machine) remoteDisconnectedPaths.add(cwd);
  for (const project of railProjects) {
    if (
      isRemoteProjectPath(project.path) &&
      !sameProjectPath(project.path, cwd)
    ) {
      remoteDisconnectedPaths.add(project.path);
    }
  }
  const columnGroups: ProjectColumnGroup[] = projectSessionGroups({
    projects: railProjects,
    rows: columnRows,
    cwd,
    query: searchQuery,
    filters: sessionFilters,
    now,
    busyIds: listedBusySessionIds,
    approvalIds: listedApprovalSessionIds,
    unseenIds: unseenFinishedIds,
    pendingPaths,
    failedPaths: failedProjectPaths,
    remoteDisconnectedPaths,
    currentBranch,
  }).map((group) => {
    const key = projectKey(group.cwd);
    const seed = projectName(group.cwd);
    const label = resolveTabGroupLabel(
      key,
      groupLabels,
      basename(group.cwd) || seed,
    );
    const logoPath = resolveTabGroupLogo(key, groupLogos);
    return {
      ...group,
      label,
      initial: Array.from(label)[0]?.toUpperCase() ?? "?",
      color: resolveTabGroupColor(key, groupColors, groupCustomColors, seed),
      logoPath: logoPath ?? undefined,
    };
  });
  const showSessionList = tab !== "files" && tab !== "changes";

  const sidebarContent = (
    <aside
      ref={setSidebarRef}
      // The inset card's own edge separates it from the sidebar.
      className={`relative flex h-full min-h-0 shrink-0 flex-col${
        inset
          ? " inset-sidebar overflow-x-clip"
          : " body-glass border-r border-stroke"
      }`}
    >
      {/* The inset layout keeps the open-rail header either way: its menu
          switches projects. */}
      {railVisible || inset ? (
        <>
          {workspaceHeader}
          {/* The inset sidebar has no tabs: the project tools live in the
              right panel. */}
          {inset ? null : (
            <div
              role="tablist"
              aria-label="Workspace"
              className="flex h-9 shrink-0 items-center gap-px border-b border-stroke px-2"
            >
              {workspaceTabItems}
            </div>
          )}
        </>
      ) : (
        <>
          {titleBarAbove ? null : (
            <div
              className="flex h-10 shrink-0 select-none items-center border-b border-stroke pr-1.5"
              data-tauri-drag-region="deep"
            >
              {trafficLightsVisible ? <div className="w-[78px] shrink-0" /> : null}
              <DevModeSlot />
              <TabVisitNav
                canGoBack={canGoBack}
                canGoForward={canGoForward}
                onGoBack={onGoBack}
                onGoForward={onGoForward}
                onTogglePanel={
                  compactProjectRail ? undefined : onToggleProjectRail
                }
              />
            </div>
          )}
          {compactRailVisible ? workspaceHeader : null}
          {onSelectProject && !compactRailVisible ? (
            <div className="flex h-9 min-w-0 items-center border-b border-stroke px-2">
              <SearchableProjectPickerWithMenu
                cwd={cwd}
                recents={recents}
                busy={projectPathBusy(busyProjectPaths, cwd)}
                className="min-w-0 flex-1"
                onSelectProject={onSelectProject}
                onOpenProject={onOpenProject}
                onRemoveProject={onRemoveProject}
                onOpenNotificationSettings={onOpenNotificationSettings}
              />
            </div>
          ) : null}
          {!compactRailVisible ? (
            <div
              role="tablist"
              aria-label="Workspace"
              className="flex h-9 shrink-0 items-center gap-px overflow-visible border-b border-stroke px-2"
            >
              {workspaceTabItems}
            </div>
          ) : null}
        </>
      )}
      <>
        {paneHost ? null : filesPane}
        <div
          ref={(el) => {
            sessionsLock(el);
            sessionsScrollRef.current = el;
            slideRefs.current[1] = el;
          }}
          className={
            showSessionList ? "flex min-h-0 flex-1 flex-col" : "shrink-0"
          }
        >
          <ProjectSessionColumn
            groups={columnGroups}
            cwd={cwd}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            notesEnabled={notesEnabled}
            searchActive={searchActive}
            inboxActive={inboxActive}
            notesActive={notesActive}
            inboxUnseen={inboxUnseen}
            onSearch={
              searchActive && onGoBack ? onGoBack : (onSearch ?? (() => {}))
            }
            onOpenInbox={
              inboxActive && onGoBack ? onGoBack : (onOpenInbox ?? (() => {}))
            }
            onOpenInboxMenu={(x, y) => {
              headerProjectMenu.close();
              insetInboxTrigger.current =
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null;
              setInsetInboxMenu({ x, y });
            }}
            onOpenNotes={
              notesEnabled
                ? notesActive && onGoBack
                  ? onGoBack
                  : onOpenNotes
                : undefined
            }
            onOpenProject={onOpenProject ?? (() => {})}
            onOpenSettings={
              settingsOpen && onGoBack
                ? onGoBack
                : (onOpenSettings ?? (() => {}))
            }
            onSelectProject={onSelectProject ?? (() => {})}
            sessionFilter={sessionsFilterButton}
            settingsActive={settingsOpen}
            showList={showSessionList}
            renderSession={(session) => renderSessionRow(session)}
          />
        </div>
        {paneHost ? null : changesPane}
        {showSidebarFooter ? (
          <>
            <LiveAgentsPreview
              agents={liveAgents}
              activeSessionId={activeSessionId}
              onSelect={onSelectAgent}
              bottomSpacing={compactRailVisible}
            />
            <SidebarUpdateFooter
              update={updateNotice}
              onOpenWhatsNew={onOpenWhatsNew}
              onDismissUpdate={onDismissUpdate}
            />
            <div className="flex shrink-0 flex-col gap-px p-2 empty:hidden">
              <GithubStarPrompt />
            </div>
          </>
        ) : null}
        {inset && onSelectProject ? (
          <ProjectSpacesBar
            projects={spaceProjects}
            cwd={cwd}
            busyProjectPaths={busyProjectPaths}
            onSelectProject={onSelectProject}
            onProjectContextMenu={headerProjectMenu.open}
          />
        ) : null}
      </>
      {insetInboxMenu ? (
        <InboxNotificationMenu
          {...insetInboxMenu}
          projectPaths={[...collectRailProjects(recents, cwd).keys()]}
          onOpenSettings={onOpenNotificationSettings}
          onClose={() => {
            setInsetInboxMenu(null);
            insetInboxTrigger.current?.focus();
          }}
        />
      ) : null}
      {sessionMenu ? (
        <ExplorerMenu
          x={sessionMenu.x}
          y={sessionMenu.y}
          items={sessionMenuItems}
          ariaLabel={
            multipleMenuSessions
              ? `${menuSessionIds.length} selected session actions`
              : "Session actions"
          }
          onPick={onSessionMenuPick}
          onClose={closeSessionMenu}
        />
      ) : null}
      {folderMenu ? (
        <ExplorerMenu
          x={folderMenu.x}
          y={folderMenu.y}
          items={folderMenuItems}
          ariaLabel="Folder actions"
          width={260}
          header={
            <FolderColorSwatches
              colorIndex={menuFolder?.colorIndex}
              customColor={menuFolder?.customColor}
              onChange={onFolderColorChange}
              onCustomChange={onFolderCustomColorChange}
            />
          }
          onPick={onFolderMenuPick}
          onClose={() => setFolderMenu(null)}
        />
      ) : null}
      {filterMenu ? (
        <SessionFiltersMenu
          x={filterMenu.x}
          y={filterMenu.y}
          harnesses={sessionHarnesses}
          filters={sessionFilters}
          onChange={onSessionFiltersChange}
          onClose={() => setFilterMenu(null)}
        />
      ) : null}
      {linkingSession ? (
        <LinkSessionWorkItemDialog
          initial={linkingSession.linkedWorkItem}
          sessionTitle={sessionDisplayTitle(
            linkingSession.title,
            linkingSession.harness,
          )}
          onSave={(item) => {
            onSetSessionLinkedWorkItem?.(linkingSession.id, item);
            setLinkingSession(null);
          }}
          onClose={() => setLinkingSession(null)}
        />
      ) : null}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuenow={resize.width}
        aria-valuemin={minWidth}
        aria-valuemax={MAX_WIDTH}
        className={`absolute inset-y-0 -right-px z-10 w-1.5 cursor-col-resize touch-none${
          inset
            ? ""
            : resize.dragging
              ? " bg-content/15"
              : " hover:bg-content/10"
        }`}
        onPointerDown={resize.onPointerDown}
        onDoubleClick={resize.onDoubleClick}
      />
    </aside>
  );

  return (
    <div
      className={`flex h-full shrink-0 ${
        sidebarVisible || drawerRendered || peekRendered
          ? ""
          : "hidden"
      }`}
    >
      {sidebarVisible ? sidebarContent : null}
      {paneHost?.host && paneTab
        ? createPortal(
            <RightPanel
              tab={paneHost.tab}
              tabs={rightTabOrder}
              onReorder={onReorderRightTabs}
              changesLabel={changesLabel}
              hasChangeStats={hasChangeStats}
              changeAdditions={changeAdditions}
              changeDeletions={changeDeletions}
              onTabChange={paneHost.onTabChange}
            >
              {filesPane}
              {changesPane}
              {graphPane}
            </RightPanel>,
            paneHost.host,
          )
        : null}
      {drawerRendered ? (
        // Pinned to the right edge, so the sidebar slides in as the width grows.
        <div
          ref={drawerRef}
          data-sidebar-drawer={drawerClosing ? "closing" : "open"}
          inert={drawerClosing || undefined}
          className={`flex shrink-0 justify-end overflow-hidden ${
            drawerClosing ? "pointer-events-none" : ""
          }`}
        >
          {sidebarContent}
        </div>
      ) : null}
      {peekRendered
        ? createPortal(
            <>
              <div
                ref={peekBackdropRef}
                aria-hidden
                className="sidebar-peek-backdrop pointer-events-none fixed inset-0"
                style={{ zIndex: LAYER.peek }}
              />
              <div
                ref={peekRef}
                data-sidebar-peek={peekClosing ? "closing" : "open"}
                inert={peekClosing || undefined}
                className={`sidebar-peek fixed bottom-1.5 left-1.5 top-10 flex overflow-hidden rounded-[10px] border text-content ${
                  peekClosing ? "pointer-events-none" : ""
                }`}
                style={{ zIndex: LAYER.peek }}
              >
                {sidebarContent}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

/** The project a `Project: Previous` / `Project: Next` step is heading to. */
let projectStep: { to: string; direction: 1 | -1 } | null = null;

/**
 * Notes which way a project step runs, so a step that wraps past the last
 * project to the first (or back) still slides on in that direction.
 */
export function noteProjectStep(to: string, delta: number) {
  projectStep = { to, direction: delta < 0 ? -1 : 1 };
}

export const Sidebar = memo(SidebarComponent);

/** Project picker whose rows open the shared project context menu. */
function SearchableProjectPickerWithMenu({
  onRemoveProject,
  onOpenNotificationSettings,
  ...pickerProps
}: Omit<
  ComponentProps<typeof SearchableProjectPicker>,
  "onProjectContextMenu" | "projectMenuActive"
> & {
  onRemoveProject?: Props["onRemoveProject"];
  onOpenNotificationSettings?: (projectPath?: string) => void;
}) {
  const projectMenu = useProjectMenu({
    onRemoveProject,
    onOpenNotificationSettings,
  });
  return (
    <>
      <SearchableProjectPicker
        {...pickerProps}
        onProjectContextMenu={projectMenu.open}
        projectMenuActive={projectMenu.isActive}
      />
      {projectMenu.element}
    </>
  );
}

/** Zen-style spaces at the foot of the inset sidebar: each project's logo or
 * mascot, the current one lifted, and a way to open another. */
/** Projects the spaces bar shows at once; the chevrons page through more. */
const SPACES_SHOWN = 5;

function ProjectSpacesBar({
  projects,
  cwd,
  busyProjectPaths,
  onSelectProject,
  onProjectContextMenu,
}: {
  projects: readonly string[];
  cwd: string;
  busyProjectPaths?: Iterable<string>;
  onSelectProject: (path: string) => void;
  onProjectContextMenu: (
    path: string,
    x: number,
    y: number,
    trigger: HTMLElement,
  ) => void;
}) {
  const projectTooltip = useRailTooltip("top");
  const shortcuts = useSyncExternalStore(subscribeKeybindings, () =>
    [
      keybindingShortcutLabel("Project: Previous", `${MOD}${SHIFT}←`),
      keybindingShortcutLabel("Project: Next", `${MOD}${SHIFT}→`),
    ]
      .filter(Boolean)
      .join(" / "),
  );
  const shown = Math.min(projects.length, SPACES_SHOWN);
  const lastStart = Math.max(0, projects.length - shown);
  const activeIndex = projects.findIndex((path) => sameProjectPath(path, cwd));
  const [start, setStart] = useState(() =>
    Math.min(lastStart, Math.max(0, activeIndex - shown + 1)),
  );
  // Bring the current project into view when it changes from elsewhere,
  // moving the window no further than it needs to.
  useEffect(() => {
    if (activeIndex < 0) return;
    setStart((current) =>
      activeIndex < current
        ? activeIndex
        : activeIndex >= current + shown
          ? activeIndex - shown + 1
          : current,
    );
  }, [activeIndex, shown]);
  const first = Math.min(start, lastStart);
  const visible = projects.slice(first, first + shown);
  const rowRef = useRef<HTMLDivElement>(null);
  const step = (direction: -1 | 1) => {
    const next = Math.min(lastStart, Math.max(0, first + direction));
    if (next === first) return;
    setStart(next);
    // A short slide in from the side the new project comes from.
    const row = rowRef.current;
    if (
      !row ||
      typeof row.animate !== "function" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return;
    row.animate(
      [
        { transform: `translateX(${direction * 12}px)`, opacity: 0.4 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 200, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
    );
  };
  const chevron = (direction: -1 | 1) => {
    const disabled = direction < 0 ? first <= 0 : first >= lastStart;
    const Icon = direction < 0 ? ChevronLeft : ChevronRight;
    const label = direction < 0 ? "Previous projects" : "More projects";
    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        disabled={disabled}
        data-tauri-drag-region="false"
        onClick={() => step(direction)}
        className="grid size-5 shrink-0 place-items-center rounded-md text-content/50 hover:bg-content/10 hover:text-content disabled:pointer-events-none disabled:opacity-30"
      >
        <Icon className="size-3.5" strokeWidth={1.75} />
      </button>
    );
  };
  return (
    // As tall as the usage footer beside it, so the two read as one strip.
    // A mini carousel: up to five spaces spread evenly, chevrons either side.
    // Its edges line up with the rows above, and its controls with the usage
    // footer's; each space takes an equal share.
    <div
      {...projectTooltip.handlers}
      className="flex h-[30px] shrink-0 items-center gap-1 px-2 pb-0.5"
    >
      {chevron(-1)}
      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          ref={rowRef}
          role="tablist"
          aria-label="Projects"
          className="flex w-full items-center gap-1"
        >
          {visible.map((path) => (
            <ProjectSpaceButton
              key={path}
              path={path}
              active={sameProjectPath(path, cwd)}
              busy={projectPathBusy(busyProjectPaths, path)}
              shortcuts={shortcuts}
              onSelect={() => onSelectProject(path)}
              onContextMenu={(x, y, trigger) =>
                onProjectContextMenu(path, x, y, trigger)
              }
            />
          ))}
        </div>
      </div>
      {chevron(1)}
      {projectTooltip.tooltip}
    </div>
  );
}

function ProjectSpaceButton({
  path,
  active,
  busy,
  shortcuts,
  onSelect,
  onContextMenu,
}: {
  path: string;
  active: boolean;
  busy: boolean;
  shortcuts: string;
  onSelect: () => void;
  onContextMenu: (x: number, y: number, trigger: HTMLElement) => void;
}) {
  const label = useProjectLabel(path);
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={busy ? `${label}, working` : label}
      data-rail-tip={label}
      data-rail-tip-detail={shortcuts || undefined}
      data-tauri-drag-region="false"
      onClick={active ? undefined : onSelect}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.focus();
        onContextMenu(event.clientX, event.clientY, event.currentTarget);
      }}
      onKeyDown={(event) => {
        if (
          event.key !== "ContextMenu" &&
          !(event.shiftKey && event.key === "F10")
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        onContextMenu(rect.left, rect.bottom, event.currentTarget);
      }}
      className={`relative grid h-5 min-w-0 flex-1 place-items-center rounded-md transition-[opacity,background-color] duration-200 ease-out motion-reduce:transition-none ${
        active
          ? "bg-content/10 opacity-100"
          : "opacity-45 hover:bg-content/5 hover:opacity-100"
      }`}
    >
      <CurrentProjectIcon
        cwd={path}
        busy={busy}
        className="size-3"
        mascotClassName="size-2.5"
      />
      {busy && !active ? (
        <span
          aria-hidden
          className="absolute right-1 top-0.5 size-1.5 rounded-full bg-accent"
        />
      ) : null}
    </button>
  );
}

/** The inset layout's project tools, beside the card. */
function RightPanel({
  tab,
  tabs,
  onReorder,
  changesLabel,
  hasChangeStats,
  changeAdditions,
  changeDeletions,
  onTabChange,
  children,
}: {
  tab: RightPanelTab;
  tabs: RightPanelTab[];
  onReorder: (tabs: RightPanelTab[]) => void;
  changesLabel: string;
  hasChangeStats: boolean;
  changeAdditions: number;
  changeDeletions: number;
  onTabChange: (tab: RightPanelTab) => void;
  children: ReactNode;
}) {
  const sortable = useAnimatedReorder(tabs, onReorder);
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div
        role="tablist"
        aria-label="Project"
        className="flex h-9 shrink-0 items-center gap-px border-b border-stroke px-2"
      >
        {tabs.map((itemId) => {
          const active = tab === itemId;
          const isChangesTab = itemId === "changes";
          return (
            <div
              key={itemId}
              ref={(el) => sortable.setItemRef(itemId, el)}
              className="reorder-item workspace-tab relative flex min-w-0 flex-1 touch-none items-stretch"
              onPointerDown={(event) => {
                sortable.onItemPointerDown(itemId, event);
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={isChangesTab ? changesLabel : undefined}
                data-tauri-drag-region="false"
                onClick={() => {
                  if (sortable.consumeClick()) return;
                  onTabChange(itemId);
                }}
                className={`flex h-6 min-w-0 flex-1 items-center justify-center self-center rounded-md px-2 text-[12px] leading-none ${
                  active ? "bg-selection text-content" : "text-content/50"
                }`}
              >
                {isChangesTab && hasChangeStats ? (
                  <DiffStat
                    additions={changeAdditions}
                    deletions={changeDeletions}
                  />
                ) : (
                  <span className="block truncate leading-label">
                    {TAB_LABELS[itemId]}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      {children}
    </div>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Which of the inset sidebar's date groups a session's last activity is in. */
function sessionAgeLabel(updatedAt: number, now: number): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const startOfToday = today.getTime();
  if (updatedAt >= startOfToday) return "Today";
  if (updatedAt >= startOfToday - DAY_MS) return "Yesterday";
  if (updatedAt >= startOfToday - 6 * DAY_MS) return "Last 7 days";
  return "Older";
}

/** The session among `ids` that started `id` through the app CLI, if any. */
export function startedSessionCaller(
  id: string,
  ids: ReadonlySet<string>,
): string | undefined {
  if (!id.startsWith("app-")) return undefined;
  const rest = id.slice("app-".length);
  // The longest listed prefix, since IDs and request IDs both use hyphens.
  for (let index = rest.lastIndexOf("-"); index > 0;) {
    const candidate = rest.slice(0, index);
    if (candidate !== id && ids.has(candidate)) return candidate;
    index = rest.lastIndexOf("-", index - 1);
  }
  return undefined;
}

const NO_STARTED_SESSIONS: {
  byParent: ReadonlyMap<string, SessionSummary[]>;
  childIds: ReadonlySet<string>;
} = { byParent: new Map(), childIds: new Set() };

/**
 * Sessions started through the app CLI are named `app-<caller>-<request>`, so
 * each finds its caller among the listed sessions. One a started session
 * started in turn joins the same top-level session. Sessions whose caller is
 * not listed, such as a Mono's, stay where they are.
 */
export function groupStartedSessions<T extends { id: string }>(
  sessions: readonly T[],
): { byParent: ReadonlyMap<string, T[]>; childIds: ReadonlySet<string> } {
  const ids = new Set(sessions.map((session) => session.id));
  const callerOf = (id: string) => startedSessionCaller(id, ids);
  const byParent = new Map<string, T[]>();
  const childIds = new Set<string>();
  for (const session of sessions) {
    let root = callerOf(session.id);
    if (!root) continue;
    const seen = new Set([session.id]);
    for (let up = callerOf(root); up && !seen.has(up); up = callerOf(up)) {
      seen.add(root);
      root = up;
    }
    childIds.add(session.id);
    const list = byParent.get(root);
    if (list) list.push(session);
    else byParent.set(root, [session]);
  }
  return { byParent, childIds };
}

function WorkspaceTitleActions({
  onSearch,
  onNew,
}: {
  onSearch?: () => void;
  onNew?: () => void;
}) {
  if (!onSearch && !onNew) return null;
  return (
    <div
      className="flex shrink-0 items-center gap-0.5"
      data-tauri-drag-region="false"
    >
      {onSearch ? (
        <IconButton label={`Go to File (${MOD}P)`} onClick={onSearch}>
          <Search className="size-3.5" strokeWidth={1.75} />
        </IconButton>
      ) : null}
      {onNew ? (
        <IconButton label={`New session (${MOD}T)`} onClick={onNew}>
          <Plus className="size-3.5" strokeWidth={1.75} />
        </IconButton>
      ) : null}
    </div>
  );
}

function SessionsHeaderButton({
  label,
  active = false,
  open = false,
  hasPopup = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  open?: boolean;
  hasPopup?: boolean;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-expanded={open}
      aria-haspopup={hasPopup ? "menu" : undefined}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
      className={`relative z-50 grid size-6 place-items-center rounded-md text-content/50 hover:bg-content/10 hover:text-content ${
        open || active ? "bg-selection text-content" : ""
      }`}
    >
      {children}
    </button>
  );
}

function sessionListDropFromPoint(
  x: number,
  y: number,
  draggedId: string,
): SessionListDropTarget | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const card = el.closest("[data-session-card]") as HTMLElement | null;
  const cardId = card?.dataset.sessionCard;
  if (cardId === draggedId) return null;
  const folder = el.closest("[data-session-folder]") as HTMLElement | null;
  const folderId = folder?.dataset.sessionFolder;
  if (folderId && cardId && card && folder.contains(card)) {
    return { kind: "folder", id: folderId };
  }
  if (cardId) return { kind: "session", id: cardId };
  if (folderId) return { kind: "folder", id: folderId };
  return null;
}

function FolderColorSwatches({
  colorIndex,
  customColor,
  onChange,
  onCustomChange,
}: {
  colorIndex: number | undefined;
  customColor: string | undefined;
  onChange: (index: number | null) => void;
  onCustomChange: (color: string) => void;
}) {
  const paletteColor =
    colorIndex != null ? TAB_GROUP_COLORS[colorIndex] : TAB_GROUP_COLORS[0];
  const pickerValue =
    customColor ?? normalizeHex(paletteColor ?? TAB_GROUP_COLORS[0]);
  return (
    <div className="px-1 py-1">
      <ColorSwatchRow
        colors={TAB_GROUP_COLORS}
        colorIndex={colorIndex}
        customColor={customColor}
        customPickerOpen
        customHighlighted={customColor != null}
        onPickIndex={(index) => onChange(index === 0 ? null : index)}
      />
      <ColorPickerPopover value={pickerValue} onChange={onCustomChange} />
    </div>
  );
}

const SESSION_PREFETCH_DELAY_MS = 120;

type SessionInsertMotion = { cwd: string; seen: Set<string> };

export const SessionCard = memo(function SessionCard({
  session,
  isActive,
  isSelected,
  busy,
  done,
  linkedUpdate,
  needsApproval,
  dropTarget,
  compact = false,
  dense = false,
  nested = false,
  startedCount = 0,
  startedOpen = false,
  startedInView = false,
  modelInFooter = false,
  statusLabel,
  project,
  now,
  onSelect,
  onOpenWorkItem,
  onPrefetch,
  onPlaceOnPane,
  onListDrop,
  onListDropTargetChange,
  onContextMenu,
  onArchive,
  onRename,
  onDelete,
}: {
  session: SessionSummary;
  isActive: boolean;
  isSelected: boolean;
  busy: boolean;
  done: boolean;
  linkedUpdate: boolean;
  needsApproval: boolean;
  dropTarget?: boolean;
  compact?: boolean;
  /** One line: status dot, provider mark, title and time, for the inset
   * layout's list. */
  dense?: boolean;
  /** A session another one started, on the rail under it: a smaller, muted
   * title like an orchestrator's agent rows. */
  nested?: boolean;
  /** How many listed sessions this one started through /operator. */
  startedCount?: number;
  /** Whether those sessions are showing on the rail below. */
  startedOpen?: boolean;
  /** One of those sessions is the one in view or chosen, so this row keeps
   * its hover fill as the group's head. */
  startedInView?: boolean;
  /** Shows the model as its provider's mark beside the branch, so the title
   * shares its row with the time and the card is a line shorter. */
  modelInFooter?: boolean;
  /** Stands in for the time, for a session with no state of its own to show. */
  statusLabel?: string;
  /** Names its project before the branch, where sessions span several. */
  project?: string;
  now: number;
  onSelect: (
    sessionId: string,
    event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  ) => void;
  onOpenWorkItem?: (item: LinkedWorkItem, sessionId: string) => void;
  onPrefetch?: (sessionId: string) => void;
  onPlaceOnPane?: (sessionId: string, targetId: string, edge: PaneEdge) => void;
  onListDrop?: (draggedId: string, target: SessionListDropTarget) => void;
  onListDropTargetChange?: (target: SessionListDropTarget | null) => void;
  onContextMenu?: (
    sessionId: string,
    e: ReactMouseEvent<HTMLDivElement>,
  ) => void;
  onArchive?: (sessionId: string, archived: boolean) => void;
  onRename?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
}) {
  const skipClickUntil = useRef(0);
  const prefetchTimer = useRef<number | null>(null);
  const previewAnchor = useRef<HTMLDivElement>(null);
  const previewCloseTimer = useRef<number | null>(null);
  const previewId = useId();
  const [previewOpen, setPreviewOpen] = useState(false);
  const orchestrationTooltipRootRef = useRef<HTMLDivElement>(null);
  const orchestrationTooltipId = useId();
  const [dragging, setDragging] = useState(false);
  const [orchestrationTooltipOpen, setOrchestrationTooltipOpen] =
    useState(false);
  const cancelPreviewClose = useCallback(() => {
    if (previewCloseTimer.current != null) {
      window.clearTimeout(previewCloseTimer.current);
      previewCloseTimer.current = null;
    }
  }, []);
  const closePreview = useCallback(() => {
    cancelPreviewClose();
    setPreviewOpen(false);
  }, [cancelPreviewClose]);
  const showPreview = () => {
    cancelPreviewClose();
    if (dense && !dragging) setPreviewOpen(true);
  };
  const schedulePreviewClose = () => {
    cancelPreviewClose();
    // Let the pointer cross the gap into the preview without closing it.
    previewCloseTimer.current = window.setTimeout(closePreview, 120);
  };
  useEffect(() => cancelPreviewClose, [cancelPreviewClose]);
  const orchestration = session.orchestration;
  const draft = !!session.draft;
  const orchestrationExpanded =
    !!orchestration && (isActive || isSelected || busy);
  // An orchestrator or /operator thread opens a rail of work below it.
  const expandable =
    dense &&
    !nested &&
    ((!!orchestration && !orchestrationExpanded) ||
      (startedCount > 0 && !startedOpen));
  const markHover = expandable ? " group-hover:hidden" : "";
  // Marked on the right like a linked issue or PR, in its mode's colour.
  const modeStyle = orchestration
    ? MODE_COMMAND_STYLES[ORCHESTRATOR_COMMAND.name]
    : startedCount > 0
      ? MODE_COMMAND_STYLES[OPERATOR_COMMAND.name]
      : undefined;
  const modeLabel = orchestration
    ? `Orchestrator, ${orchestration.tasks.length} ${
        orchestration.tasks.length === 1 ? "agent" : "agents"
      }`
    : `Operator, started ${startedCount} ${
        startedCount === 1 ? "session" : "sessions"
      }`;
  const modeBadge =
    dense && !nested && modeStyle ? (
      <span
        role="img"
        title={modeLabel}
        aria-label={modeLabel}
        data-session-mode={orchestration ? "orchestrator" : "operator"}
        className={`grid size-4 shrink-0 place-items-center ${modeStyle.className}`}
      >
        <modeStyle.Icon className="size-3" strokeWidth={1.75} />
      </span>
    ) : null;
  // Set once the card has painted, so only later changes animate.
  const cardShown = useRef(false);
  useEffect(() => {
    cardShown.current = true;
  }, []);
  const orchestrationDone =
    orchestration?.tasks.filter((task) => task.status === "completed").length ??
    0;
  const title = sessionDisplayTitle(session.title, session.harness);
  const gitLabel = session.worktreeRemoved
    ? NO_BRANCH_LABEL
    : formatGitLabel(session.repo, session.branch);
  const time = formatRelative(session.updatedAt, now);
  const headerRow = !(compact && !orchestrationExpanded) && !modelInFooter;
  const model =
    compact && !orchestrationExpanded
      ? null
      : resolveModel(session.harness, session.model).name;
  const statusClass = needsApproval
    ? "text-amber-400"
    : busy
      ? "text-accent"
      : done
        ? "text-emerald-400"
        : draft
          ? "text-content/55"
          : "text-content/45";
  const status = (
    <span
      className={`flex shrink-0 items-center gap-1 text-[11px] tabular-nums ${statusClass}`}
    >
      {needsApproval ? (
        <>
          <CircleAlert className="size-3" strokeWidth={1.75} />
          <span>{orchestration ? "Needs input" : "Need approval"}</span>
        </>
      ) : busy ? (
        <>
          <TerminalSpinner className="inline-block w-3 select-none text-center text-[11px] leading-none text-accent" />
          <span>Working...</span>
        </>
      ) : done ? (
        <>
          <Check className="size-3" strokeWidth={2.25} />
          <span>Done</span>
        </>
      ) : draft ? (
        <>
          <CircleDashed className="size-3" strokeWidth={1.75} />
          <span>Draft</span>
        </>
      ) : (
        <span>{statusLabel ?? time}</span>
      )}
    </span>
  );

  const linkedWorkItem = session.linkedWorkItem;
  const linkedUpdateDot = linkedUpdate ? (
    <span
      title={`Linked ${linkedWorkItem?.kind === "pr" ? "PR" : "issue"} updated since this session`}
      aria-label="Linked work item updated"
      className="size-1.5 shrink-0 rounded-full bg-accent"
    />
  ) : null;
  const workItemBadge = linkedWorkItem ? (
    <button
      type="button"
      data-no-drag
      data-tauri-drag-region="false"
      title={`Open ${linkedWorkItem.kind === "pr" ? "PR" : "issue"} #${linkedWorkItem.number} beside this session (${MOD}-click for GitHub)`}
      aria-label={`Open ${linkedWorkItem.kind === "pr" ? "PR" : "issue"} #${linkedWorkItem.number}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.metaKey || event.ctrlKey) {
          void openUrl(linkedWorkItem.url).catch(() => undefined);
          return;
        }
        if (onOpenWorkItem) onOpenWorkItem(linkedWorkItem, session.id);
        else void openUrl(linkedWorkItem.url).catch(() => undefined);
      }}
      onAuxClick={(event) => {
        if (event.button !== 1) return;
        event.preventDefault();
        event.stopPropagation();
        void openUrl(linkedWorkItem.url).catch(() => undefined);
      }}
      className="flex shrink-0 cursor-pointer items-center gap-0.5 rounded px-0.5 text-[11px] tabular-nums text-accent hover:underline"
    >
      {linkedWorkItem.kind === "pr" ? (
        <GitPullRequest className="size-3" strokeWidth={1.75} />
      ) : (
        <CircleDot className="size-3" strokeWidth={1.75} />
      )}
      {dense ? null : <span>#{linkedWorkItem.number}</span>}
    </button>
  ) : null;

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      closePreview();
      onSelect(session.id, e);
      return;
    }
    if (e.key === "F2" && onRename) {
      e.preventDefault();
      onRename(session.id);
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && onDelete) {
      e.preventDefault();
      onDelete(session.id);
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // Warm the transcript during the press. Opening stays on click so a
    // drag-to-pane gesture does not switch conversations.
    if (prefetchTimer.current != null) {
      window.clearTimeout(prefetchTimer.current);
      prefetchTimer.current = null;
    }
    onPrefetch?.(session.id);
    if (!onPlaceOnPane && !onListDrop) return;
    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    let active = false;
    let lastX = startX;
    let lastY = startY;
    let lastList: SessionListDropTarget | null = null;
    handle.setPointerCapture(pointerId);
    const restoreSelection = suppressTextSelection();

    const setListTarget = (next: SessionListDropTarget | null) => {
      if (lastList?.kind === next?.kind && lastList?.id === next?.id) return;
      lastList = next;
      onListDropTargetChange?.(next);
    };

    const onMove = (ev: PointerEvent) => {
      lastX = ev.clientX;
      lastY = ev.clientY;
      if (!active) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
        active = true;
        setDragging(true);
        if (onPlaceOnPane) {
          setExternalPaneDrop({
            fromId: session.id,
            overId: null,
            edge: "left",
          });
        }
      }
      setListTarget(
        onListDrop
          ? sessionListDropFromPoint(ev.clientX, ev.clientY, session.id)
          : null,
      );
      if (!onPlaceOnPane) return;
      const over = paneDropFromPoint(ev.clientX, ev.clientY);
      if (!over || over.id === session.id) {
        setExternalPaneDrop({
          fromId: session.id,
          overId: over?.id === session.id ? session.id : null,
          edge: over?.edge ?? "left",
        });
        return;
      }
      setExternalPaneDrop({
        fromId: session.id,
        overId: over.id,
        edge: over.edge,
      });
    };

    const onUp = () => finish(true);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      finish(false);
    };

    function finish(commit: boolean) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
      restoreSelection();
      setDragging(false);
      setExternalPaneDrop(null);
      setListTarget(null);
      try {
        handle.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
      if (!active) return;
      skipClickUntil.current = performance.now() + 400;
      if (!commit) return;
      const listOver = onListDrop
        ? sessionListDropFromPoint(lastX, lastY, session.id)
        : null;
      if (listOver) {
        onListDrop?.(session.id, listOver);
        return;
      }
      const over = paneDropFromPoint(lastX, lastY);
      if (over && over.id !== session.id) {
        onPlaceOnPane?.(session.id, over.id, over.edge);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
  };

  useEffect(
    () => () => {
      if (prefetchTimer.current != null) {
        window.clearTimeout(prefetchTimer.current);
        prefetchTimer.current = null;
      }
    },
    [onPrefetch, session.id],
  );

  const schedulePrefetch = () => {
    if (!onPrefetch || prefetchTimer.current != null) return;
    prefetchTimer.current = window.setTimeout(() => {
      prefetchTimer.current = null;
      onPrefetch(session.id);
    }, SESSION_PREFETCH_DELAY_MS);
  };

  const cancelScheduledPrefetch = () => {
    if (prefetchTimer.current == null) return;
    window.clearTimeout(prefetchTimer.current);
    prefetchTimer.current = null;
  };

  const archiveLabel = session.archived ? "Unarchive" : "Archive";
  // Expanding an orchestration card must not move its existing header. Keep
  // the collapsed top inset and give only the new detail area extra room at
  // the bottom.
  // Dense rows match the project rail's 32px rows.
  // Dense rows hang their agents on a rail below the card instead.
  const cardPaddingY = dense
    ? "py-[3px]"
    : orchestrationExpanded
      ? compact
        ? "pb-2.5 pt-1.5"
        : "pb-2.5 pt-2"
      : compact
        ? "py-1.5"
        : "py-2";

  return (
    <>
      <div className="group relative">
        <div
          ref={previewAnchor}
          title={dense ? undefined : title}
          data-session-card={session.id}
          data-orchestration-card={orchestration ? "true" : undefined}
          data-session-selected={isSelected ? "true" : undefined}
          data-tauri-drag-region="false"
          onPointerDown={onPointerDown}
          onPointerDownCapture={closePreview}
          onPointerEnter={(event) => {
            schedulePrefetch();
            if (event.pointerType !== "touch") showPreview();
          }}
          onPointerLeave={() => {
            cancelScheduledPrefetch();
            if (previewOpen) schedulePreviewClose();
          }}
          onClick={(event) => {
            closePreview();
            if (performance.now() < skipClickUntil.current) return;
            onSelect(session.id, event);
          }}
          onContextMenu={(event) => {
            closePreview();
            onContextMenu?.(session.id, event);
          }}
          className={`relative border flex w-full cursor-default select-none touch-none flex-col rounded-md ${nested ? "px-1.5" : dense ? "px-2" : "px-2.5"} text-left ${cardPaddingY} ${
            dragging ? "opacity-40" : ""
          } ${
            dropTarget
              ? "text-content border-transparent"
              : isSelected
                ? `bg-accent/15 text-content ${draft ? "border-content/30 border-dashed" : "border-transparent"}`
                : needsApproval
                  ? "bg-content/20 text-content border-content/30 border-dashed"
                  : isActive
                    ? `bg-selection text-content ${draft ? "border-content/30 border-dashed" : "border-transparent"}`
                    : draft
                      ? "border-content/25 border-dashed text-content/80 hover:bg-content/5 hover:text-content"
                      : `text-content/80 hover:text-content border-transparent ${
                          orchestrationExpanded && !dense
                            ? "bg-content/5 hover:bg-content/10"
                            : startedInView
                              ? "bg-content/5"
                              : "hover:bg-content/5"
                        }`
          }`}
        >
          {dropTarget ? (
            <div className="pointer-events-none absolute inset-0 rounded-md bg-accent/20" />
          ) : null}
          <div
            role="button"
            tabIndex={0}
            aria-current={isActive ? "true" : undefined}
            aria-pressed={isSelected}
            data-session-select={session.id}
            aria-describedby={dense && previewOpen ? previewId : undefined}
            onFocus={(event) => {
              if (event.currentTarget.matches(":focus-visible")) showPreview();
            }}
            onBlur={closePreview}
            onKeyDown={onKeyDown}
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              // Shift-click can trigger :focus-visible. Mouse selection should
              // only highlight the card; Tab can still focus this button.
              event.preventDefault();
              // Clear prior focus too, so shortcuts cannot target another card.
              const focused = event.currentTarget.ownerDocument.activeElement;
              if (focused instanceof HTMLElement) focused.blur();
            }}
            className="rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
          >
            {dense ? (
              <span
                className={`relative flex min-w-0 items-center ${
                  nested ? "h-5 gap-1.5" : "h-6 gap-2"
                }`}
              >
                {/* A collapsed orchestrator or /operator thread shows a
                    chevron in its mark's place on hover: selecting it opens
                    the rail below. */}
                {expandable ? (
                  <span className="hidden size-4 shrink-0 place-items-center text-content/60 group-hover:grid">
                    <ChevronDown className="size-3.5" strokeWidth={1.75} />
                  </span>
                ) : null}
                {/* A working session spins in place of its provider's mark,
                  then shows a check until it is seen. */}
                {busy ? (
                  <span
                    className={`grid size-4 shrink-0 place-items-center${markHover}`}
                  >
                    <TerminalSpinner
                      aria-label="Working"
                      className="inline-block w-3.5 select-none text-center text-[11px] leading-none text-accent"
                    />
                  </span>
                ) : done ? (
                  <span
                    className={`grid size-4 shrink-0 place-items-center${markHover}`}
                  >
                    <Check
                      role="img"
                      aria-label="Done"
                      className="size-3.5 text-emerald-400"
                      strokeWidth={2.25}
                    />
                  </span>
                ) : (
                  <HarnessIcon
                    harness={session.harness}
                    className={`${nested ? "size-3.5" : "size-4"} shrink-0${markHover}`}
                  />
                )}
                {session.pinned ? (
                  <Pin
                    className="-mx-0.5 size-3.5 shrink-0 text-content/45"
                    strokeWidth={1.75}
                  />
                ) : null}
                <ParticleText
                  text={title}
                  className={`line-clamp-1 min-w-0 flex-1 leading-tight ${
                    nested
                      ? `text-[13px] ${
                          isActive || isSelected
                            ? "text-content"
                            : "text-content/55 group-hover:text-content/80"
                        }`
                      : "text-sm font-medium text-content"
                  }`}
                />
                <span className="flex shrink-0 items-center gap-1">
                  {linkedUpdateDot}
                  {workItemBadge}
                  {modeBadge}
                  {onArchive ? (
                    <button
                      type="button"
                      data-no-drag
                      data-tauri-drag-region="false"
                      title={archiveLabel}
                      aria-label={`${archiveLabel} ${title}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        onArchive(session.id, !session.archived);
                      }}
                      // Pulled right so its box sits as far from the card's
                      // right edge as from its top.
                      className="-mr-[3px] hidden size-5 place-items-center rounded-md text-content/50 hover:bg-content/10 hover:text-content group-focus-within:grid group-hover:grid"
                    >
                      <Archive className="size-3 shrink-0" strokeWidth={1.75} />
                    </button>
                  ) : null}
                  {/* A state worth noticing takes the time's place, as an icon
                    so the row keeps its alignment. */}
                  <span
                    className={`flex items-center text-[11px] tabular-nums text-content/40 ${
                      onArchive
                        ? "group-focus-within:hidden group-hover:hidden"
                        : ""
                    }`}
                  >
                    {needsApproval ? (
                      <CircleAlert
                        role="img"
                        aria-label={
                          orchestration ? "Needs input" : "Needs approval"
                        }
                        className="size-3.5 text-amber-400"
                        strokeWidth={1.75}
                      />
                    ) : draft ? (
                      <CircleDashed
                        role="img"
                        aria-label="Draft"
                        className="size-3.5"
                        strokeWidth={1.75}
                      />
                    ) : (
                      (statusLabel ?? time)
                    )}
                  </span>
                </span>
              </span>
            ) : null}
            {!dense && headerRow ? (
              <span className="relative flex items-center gap-2">
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <HarnessIcon
                    harness={session.harness}
                    className="size-3.5 shrink-0"
                  />
                  <span className="min-w-0 truncate text-[11px] text-content/50">
                    {model}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {linkedUpdateDot}
                  {status}
                </span>
              </span>
            ) : null}
            {dense ? null : (
              <span
                className={`relative flex min-w-0 items-center gap-1.5 ${
                  headerRow ? "mt-1" : ""
                }`}
              >
                {session.pinned ? (
                  <Pin
                    className="size-3 shrink-0 text-content/45"
                    strokeWidth={1.75}
                  />
                ) : null}
                <ParticleText
                  text={title}
                  className="line-clamp-1 text-[13px] font-semibold leading-snug text-content"
                />
                {headerRow ? null : (
                  <span className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
                    {linkedUpdateDot}
                    {status}
                  </span>
                )}
              </span>
            )}
          </div>
          {orchestrationExpanded && !dense ? (
            <OrchestrationSidebarAgents
              leadId={session.id}
              summary={orchestration!}
            />
          ) : null}
          {dense ? null : (
            <span className="relative mt-1 flex items-center gap-2">
              {project && !gitLabel ? (
                <span
                  className="flex min-w-0 flex-1 items-center gap-1 text-[11px] text-content/45"
                  title={session.cwd}
                >
                  <Folder className="size-3 shrink-0" strokeWidth={1.75} />
                  <span className="min-w-0 truncate">{project}</span>
                </span>
              ) : gitLabel ? (
                <span
                  className="flex min-w-0 flex-1 items-center gap-1 text-[11px] text-content/45"
                  title={
                    session.worktreeCwd
                      ? `${gitLabel}\n${session.worktreeCwd}`
                      : gitLabel
                  }
                >
                  <GitBranch className="size-3 shrink-0" strokeWidth={1.75} />
                  <span className="min-w-0 truncate">
                    {project ? `${project} · ${gitLabel}` : gitLabel}
                  </span>
                </span>
              ) : (
                <span className="min-w-0 flex-1" />
              )}
              <span className="relative flex shrink-0 items-center gap-px">
                {/* Just the provider's mark; the model's name slides out beside
                it while the card is hovered or focused. */}
                {modelInFooter && model ? (
                  <span
                    title={model}
                    className="flex min-w-0 items-center text-[11px] text-content/50"
                  >
                    <span className="max-w-0 truncate pr-0 opacity-0 transition-[max-width,opacity,padding] duration-200 ease-out group-focus-within:max-w-32 group-focus-within:pr-1.5 group-focus-within:opacity-100 group-hover:max-w-32 group-hover:pr-1.5 group-hover:opacity-100 motion-reduce:transition-none">
                      {model}
                    </span>
                    <HarnessIcon
                      harness={session.harness}
                      className="size-3.5 shrink-0"
                    />
                  </span>
                ) : null}
                {onArchive ? (
                  <button
                    type="button"
                    data-no-drag
                    data-tauri-drag-region="false"
                    title={archiveLabel}
                    aria-label={`${archiveLabel} ${title}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onArchive(session.id, !session.archived);
                    }}
                    className="pointer-events-none grid size-5 place-items-center rounded-md text-content/50 opacity-0 hover:bg-content/10 hover:text-content group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
                  >
                    <Archive className="size-3 shrink-0" strokeWidth={1.75} />
                  </button>
                ) : null}
                {workItemBadge}
                {orchestration ? (
                  <div
                    ref={orchestrationTooltipRootRef}
                    className="relative shrink-0"
                    onMouseEnter={() => setOrchestrationTooltipOpen(true)}
                    onMouseLeave={() => setOrchestrationTooltipOpen(false)}
                  >
                    <button
                      type="button"
                      data-no-drag
                      data-tauri-drag-region="false"
                      data-orchestration-icon
                      aria-label={`Orchestrator, ${orchestration.tasks.length} ${
                        orchestration.tasks.length === 1
                          ? "subagent"
                          : "subagents"
                      }, ${orchestrationDone} done`}
                      aria-describedby={
                        orchestrationTooltipOpen
                          ? orchestrationTooltipId
                          : undefined
                      }
                      onPointerDown={(event) => event.stopPropagation()}
                      onFocus={() => setOrchestrationTooltipOpen(true)}
                      onBlur={() => setOrchestrationTooltipOpen(false)}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOrchestrationTooltipOpen(false);
                        onSelect(session.id, event);
                      }}
                      className="grid size-5 shrink-0 place-items-center rounded-md text-fuchsia-300/65 hover:bg-content/10 hover:text-fuchsia-200/90"
                    >
                      <Share className="size-3" />
                    </button>
                  </div>
                ) : null}
              </span>
            </span>
          )}
        </div>
        {dense && previewOpen && previewAnchor.current ? (
          <SessionCardPreview
            anchor={previewAnchor.current}
            id={previewId}
            session={session}
            status={status}
            onClose={closePreview}
            onPointerEnter={cancelPreviewClose}
            onPointerLeave={schedulePreviewClose}
          />
        ) : null}
        {orchestration && orchestrationTooltipOpen ? (
          <Popover
            anchor={orchestrationTooltipRootRef}
            side="right"
            align="end"
            width={248}
            maxHeight={320}
            role="tooltip"
            id={orchestrationTooltipId}
            className="pointer-events-none overflow-y-auto p-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold text-content/85">
                Subagents
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-content/45">
                {orchestrationDone}/{orchestration.tasks.length} done
              </span>
            </div>
            <div className="mt-1.5 flex flex-col gap-0.5">
              {orchestration.tasks.map((task) => {
                const label = orchestrationTaskLabel(task, orchestration);
                return (
                  <div
                    key={task.sessionId}
                    className="flex min-w-0 items-center gap-1.5 rounded-md px-1 py-1"
                  >
                    <HarnessIcon
                      harness={task.harness}
                      className="size-3.5 shrink-0 opacity-75"
                    />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-content/75">
                      {task.title}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] ${
                        task.needsInput ||
                        task.status === "failed" ||
                        task.status === "blocked" ||
                        task.status === "interrupted"
                          ? "text-amber-400"
                          : label === "Working"
                            ? "text-accent"
                            : task.status === "completed"
                              ? "text-emerald-400"
                              : "text-content/45"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Popover>
        ) : null}
      </div>
      {/* Under the row, outside its highlight and its hover actions, like a
          tool step's rail. */}
      {orchestration && dense ? (
        // Opening under a row already on screen grows in and pushes the
        // list down; one the list loads with is simply there.
        <RevealHeight
          open={orchestrationExpanded}
          animateIn={cardShown.current}
        >
          {/* One item, padding and all, for the reveal to grow. */}
          <div>
            <OrchestrationSidebarAgents
              leadId={session.id}
              summary={orchestration}
              variant="tree"
            />
          </div>
        </RevealHeight>
      ) : null}
    </>
  );
});

function SessionRenameRow({
  session,
  isActive,
  needsApproval,
  onCommit,
  onCancel,
}: {
  session: SessionSummary;
  isActive: boolean;
  needsApproval: boolean;
  onCommit: (title: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  const [value, setValue] = useState(() =>
    sessionDisplayTitle(session.title, session.harness),
  );

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const finish = (success: boolean) => {
    if (finished.current) return;
    if (success) {
      const trimmed = value.trim();
      if (!trimmed) {
        onCancel();
        return;
      }
      finished.current = true;
      onCommit(trimmed);
      return;
    }
    finished.current = true;
    onCancel();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
    }
  };

  return (
    <div
      className={`flex w-full flex-col rounded-md px-2.5 py-2 ${
        needsApproval
          ? "bg-amber-400/10 text-content"
          : isActive
            ? "bg-selection text-content"
            : "text-content/80"
      }`}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={onKeyDown}
        className="w-full rounded bg-content/10 px-2 py-1 text-[13px] font-semibold leading-snug text-content outline-none ring-1 ring-accent/40"
      />
    </div>
  );
}

function DiffStat({
  additions,
  deletions,
}: {
  additions: number;
  deletions: number;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const hasChanges = additions > 0 || deletions > 0;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let availableWidth = 0;
    let textWidth = 0;
    let fontSize = parseFloat(content.style.fontSize) || 11;
    let frame = 0;
    // Observe both boxes after layout. Repeated font writes and synchronous
    // measurements here used to force whole-workspace layout on navigation.
    // The gap uses em units, so the complete label scales with its font size.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container)
          availableWidth = entry.contentRect.width;
        else textWidth = entry.contentRect.width;
      }
      if (!availableWidth || !textWidth || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next = Math.max(
          0.1,
          Math.min(
            11,
            Math.floor((fontSize * availableWidth * 10) / textWidth) / 10,
          ),
        );
        if (next === fontSize) return;
        content.style.fontSize = `${next}px`;
        fontSize = next;
      });
    });
    observer.observe(container);
    observer.observe(content);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [hasChanges]);

  if (additions <= 0 && deletions <= 0) return null;

  const label = [
    additions > 0 ? `+${formatInteger(additions)}` : "",
    deletions > 0 ? `-${formatInteger(deletions)}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      ref={containerRef}
      title={`${label} uncommitted`}
      className="flex h-full w-full min-w-0 items-center justify-center overflow-hidden"
    >
      <span
        ref={contentRef}
        className="flex shrink-0 items-center gap-[0.55em] whitespace-nowrap font-sans text-[11px] font-semibold tabular-nums"
      >
        {additions > 0 ? (
          <span className="text-diff-add-fg">
            +<TightDiffNumber value={additions} />
          </span>
        ) : null}
        {deletions > 0 ? (
          <span className="text-diff-del-fg">
            -<TightDiffNumber value={deletions} />
          </span>
        ) : null}
      </span>
    </span>
  );
}

function TightDiffNumber({ value }: { value: number }) {
  const [first, ...rest] = formatInteger(value).split(",");
  return (
    <>
      {first}
      {rest.map((part, index) => (
        <span key={index}>
          <span className="-mr-px">,</span>
          {part}
        </span>
      ))}
    </>
  );
}

function formatGitLabel(repo?: string, branch?: string): string {
  if (repo && branch) return `${repo}/${branch}`;
  return branch || repo || "";
}

function formatRelative(value: number, now: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  const seconds = Math.max(0, Math.round((now - value) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}
