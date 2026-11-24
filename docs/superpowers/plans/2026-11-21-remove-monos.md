# Remove Monos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Mono product (the long-lived mascot agent) from the UI, the TypeScript module, and the Rust commands that exist only for it.

**Architecture:** Delete `src/features/monos` and every importer. Ordinary session send, history, and project mascots stay. Rust drops `mono`, `mono_chat`, `mono_transcript`, and `codex_mono_store`. The on-disk directory `<app data>/monos/` is not deleted.

**Tech Stack:** React 19, TypeScript, Vitest, Rust crate `monocode` in `src-tauri`.

**Spec:** `docs/superpowers/specs/2026-11-21-sidebar-projects-design.md`

Do this plan after `docs/superpowers/plans/2026-11-21-sidebar-projects.md`. That plan already stops rendering `MonoRailSection`. This plan deletes the product.

## Global Constraints

- Mono is the long-lived agent with a mascot that sits beside projects. It is not a project's pixel mascot and not the word "monocode".
- Do not delete `<app data>/monos/`.
- Project pixel mascots (`src/features/projects/model/projectMascots.ts`, `ProjectMascot`) stay.
- Do not remove optional fields already stored on `Session` (`monoTranscript` and the card/reaction fields). Leave them unread.
- Do not change Files, Changes, or the Spaces column from the sidebar plan.

---

### Task 1: Stop treating Mono sessions as special

**Files:**
- Modify: `src/app/hooks/useIdleSessionDetach.ts`
- Modify: `src/app/hooks/useIdleSessionDetach.test.ts`
- Modify: `src/app/shell/Sidebar.tsx` (the `listableSessions` filter, about line 783)

**Interfaces:**
- Consumes: nothing from `features/monos` after this task's edits in these files.
- Produces: idle detach keeps inbox sessions mounted and no longer special-cases Mono or habit ids. The session list no longer calls `isMonoSession` or `isHabitRun`.

- [ ] **Step 1: Write the failing test**

In `src/app/hooks/useIdleSessionDetach.test.ts`, replace the test `"keeps the resident conversation mounted independently of ordinary tabs"` with:

```ts
it("detaches an idle session that is not on a tab, even when it was a Mono", async () => {
  const agent = chat("resident");
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  saveMonoSessionId(createMono([agent.cwd]).id, agent.id);
  const workspace = mountWorkspace({
    sessions: [agent, chat("other")],
    tabs: [newTab("other")],
    orchestrationRuns: [],
    liveAgentsEnabled: false,
    busySessionIds: new Set(),
    activeSessionId: "other",
  });
  await advance();
  expect(workspace.snapshot().sessions.map((session) => session.id)).toEqual([
    "other",
  ]);
  expect(workspace.persistSession).toHaveBeenCalled();
});
```

This fails on current code because `isMonoSession` keeps `resident` mounted. `chat` and `mountWorkspace` are already in this file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/hooks/useIdleSessionDetach.test.ts`

Expected: FAIL if the new case still expects Mono to stay mounted, or FAIL to compile once the Mono import is removed and the production code still imports it. Either failure is the red step. Do not delete `features/monos` in this task.

- [ ] **Step 3: Remove the branches**

In `useIdleSessionDetach.ts`, delete the imports of `isMonoSession` and `isHabitRun`. The visible-id loop becomes:

```ts
for (const session of sessions) {
  if (session.inboxAsk) visibleIds.add(session.id);
}
```

In `Sidebar.tsx` `listableSessions`, delete `!isMonoSession(session.id) &&` and `!isHabitRun(session.id) &&`. Delete the `features/monos` imports that become unused (`isMonoSession`, `isHabitRun`, `MonoRailMascot`, `monosSnapshot`, `subscribeMonos`). Leave `MonoRailSection` unrendered if the sidebar plan already removed that JSX. If it is still rendered, delete that JSX in this task.

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/app/hooks/useIdleSessionDetach.test.ts src/app/shell/SidebarRename.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/hooks/useIdleSessionDetach.ts src/app/hooks/useIdleSessionDetach.test.ts src/app/shell/Sidebar.tsx
git commit -m "refactor: stop special-casing Mono sessions"
```

---

### Task 2: Remove Mono from the shell and settings

**Files:**
- Delete: `src/app/shell/MonoRailSection.tsx`
- Delete: `src/app/shell/MonoRailSection.test.ts`
- Delete: `src/app/hooks/useMonoHabits.ts`
- Delete: `src/app/hooks/useMonoHabits.test.ts`
- Delete: `src/app/hooks/useFloatingMono.ts`
- Delete: `src/app/hooks/useFloatingMono.test.ts`
- Modify: `src/app/shell/TitleBar.tsx`
- Modify: `src/app/shell/ProjectRail.tsx`
- Modify: `src/app/shell/SettingsRail.tsx`
- Modify: `src/features/projects/ui/SearchableProjectPicker.tsx`
- Modify: `src/features/settings/model/displayPrefs.ts`
- Modify: `src/features/settings/ui/SettingsView.test.ts`
- Modify: `src/app/shell/SidebarRename.test.ts` (drop `createMono` / `saveMonoSessionId` imports)

**Interfaces:**
- Consumes: none from `features/monos` in the files above.
- Produces: no Mono mascot, overview, or settings section in the shell. `TitleBar` no longer takes `mono`, `monoOverviewOpen`, `onToggleMonoOverview`, or `onOpenMonoSettings`.

- [ ] **Step 1: Write the failing test**

In `src/app/shell/SidebarRename.test.ts`, the test `"omits hidden Mono launches from history, open sessions and folders"` imports `createMono`. Change it so it no longer imports `features/monos`. Keep the assertion that a `sidebarHidden` session stays out of the list. Delete any assertion that only applied to a Mono's launched session.

Run cannot go green until TitleBar's callers compile, so this step is the import break plus the next step's compile.

- [ ] **Step 2: Run the typecheck to see the remaining Mono imports**

Run: `npx tsc --noEmit --pretty false | rg "features/monos|MonoRail|useFloatingMono|useMonoHabits" | head -n 40`

Expected: errors in the files listed above.

- [ ] **Step 3: Delete the shell Mono surface**

Delete the six files listed under Delete.

In `TitleBar.tsx`, remove the `mono` prop, `MonoRailMascot`, and the branch that renders `MonoTitle` / the overview button. A tab with no mono field renders the normal title.

In `ProjectRail.tsx`, remove the `monos` prop and `<MonoRailSection {...monos} />`.

In `SettingsRail.tsx`, remove the `monos` settings entry.

In `SearchableProjectPicker.tsx`, remove the Mono list, `MonoRailMascot`, and the `monos` prop. Callers pass no `monos`.

In `displayPrefs.ts`, remove `loadRailMonosPinned`, `saveRailMonosPinned`, and `RAIL_MONOS_PINNED_CHANGE_EVENT`.

In `SettingsView.test.ts`, delete the tests whose title mentions a Mono's session visibility. Remove the `createMono` import.

In `SidebarRename.test.ts`, remove the `features/monos` import. The hidden-session test uses `sidebarHidden: true` on a normal summary.

- [ ] **Step 4: Confirm those files no longer import Mono**

Run: `rg "features/monos|MonoRailSection|useFloatingMono|useMonoHabits" src/app/shell src/app/hooks src/features/projects/ui/SearchableProjectPicker.tsx src/features/settings`

Expected: no matches. `src/app/App.tsx` may still match; Task 3 removes it.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/shell src/app/hooks src/features/projects/ui/SearchableProjectPicker.tsx src/features/settings
git commit -m "refactor: remove Mono from the shell"
```

`git add -A` on those paths also stages the deletions. Do not `git add -A` the whole repo.

---

### Task 3: Delete the Mono TypeScript module

**Files:**
- Delete: `src/features/monos/`
- Modify: `src/app/App.tsx`
- Modify: `src/integrations/harness/core/apply.test.ts`
- Modify: `tests/browser/transcript.tsx`
- Modify: `mobile/src/features/workspace/types.ts` (comment only)

**Interfaces:**
- Consumes: ordinary session helpers in `src/integrations/harness/core/apply.ts` (`appendUser`, `appendSteerUser`).
- Produces: `rg "features/monos" src tests mobile` prints nothing. `App` no longer renders `MonoOverview`, `MonoSettingsDialog`, `MonoActivityView`, or a Mono changes view.

- [ ] **Step 1: Keep the harness test compiling without the module**

`src/integrations/harness/core/apply.test.ts` calls `enqueueMonoMessage` and `acknowledgeMonoMessage` from `src/features/monos/model/monoMessaging.ts` (lines 9–11 and the tests around lines 730 and 770).

Copy those two functions into the top of `apply.test.ts` as local functions, including the `dequeueQueuedMessage` and `displayAttachments` imports they need. Delete the `features/monos` import. Do not change the assertions in those two tests.

- [ ] **Step 2: Run that test**

Run: `npx vitest run src/integrations/harness/core/apply.test.ts`

Expected: PASS before the module is deleted, and still PASS after.

- [ ] **Step 3: Strip App and delete the module**

In `src/app/App.tsx`, delete every import from `../features/monos/...`. Delete the state, effects, and JSX that exist only to open a Mono: overview, settings dialog, activity view, habits, rotation, floating chat, mono workspace tabs, and mono usage-limit handling.

For each deleted symbol, delete the branch that used it and keep the non-Mono path. Examples already in the file:

- `monoCovers` becomes false. The title-tab and right-panel conditions that check `monoCovers` use the app-view path only.
- `shownViewTabId` no longer returns `monoViewTabId`.
- `canGoBack` no longer includes `!!monoViewId`.

Delete `src/features/monos`.

In `tests/browser/transcript.tsx`, remove the `MonoComposer` and `visibleMonoCompletionMessages` imports and the fixture that renders them. If the file only exists to render a Mono transcript, delete the file.

In `mobile/src/features/workspace/types.ts`, change the comment that points at `src/features/monos/model/monoSpawnedSessions.ts` so it no longer names that path. Do not change the type.

- [ ] **Step 4: Typecheck and test**

Run:

```bash
rg "features/monos" src tests mobile
npx tsc --noEmit
npx vitest run src/integrations/harness/core/apply.test.ts src/app/hooks/useIdleSessionDetach.test.ts src/app/shell/SidebarRename.test.ts src/app/shell/ProjectSessionColumn.test.ts
```

Expected: `rg` prints nothing. `tsc` exits 0. Vitest PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx src/integrations/harness/core/apply.test.ts tests/browser/transcript.tsx mobile/src/features/workspace/types.ts src/features/monos
git commit -m "refactor: delete the Mono feature module"
```

---

### Task 4: Remove Mono-only Rust commands

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Delete: `src-tauri/src/mono.rs`
- Delete: `src-tauri/src/mono_chat.rs`
- Delete: `src-tauri/src/mono_chat/` (directory, including `menu_bar.rs`)
- Delete: `src-tauri/src/mono_transcript.rs`
- Delete: `src-tauri/src/codex_mono_store.rs`

**Interfaces:**
- Consumes: the `tauri::generate_handler!` list in `src-tauri/src/lib.rs`.
- Produces: those modules and their commands are gone. Ordinary session commands stay.

- [ ] **Step 1: Confirm the command list before editing**

The handler in `src-tauri/src/lib.rs` registers:

- `codex_mono_store::codex_mono_store_prepare`
- `codex_mono_store::codex_mono_store_copy`
- `codex_mono_store::codex_mono_store_restore_agent_state`
- `mono_transcript::mono_session_get`
- `mono_transcript::mono_session_page`
- `mono_transcript::mono_session_upsert`
- `mono_transcript::mono_session_find`
- `mono_chat::mono_chat_sync`
- `mono_chat::mono_chat_publish`
- `mono_chat::mono_chat_state`
- `mono_chat::mono_chat_ready`
- `mono_chat::mono_chat_action`
- `mono_chat::mono_chat_take`
- `mono_chat::mono_chat_accept`
- `mono_chat::mono_chat_reply`
- `mono_chat::mono_chat_keep_alive`
- `mono_chat::mono_chat_switch`
- `mono_chat::mono_menu_bar_set_visible`

And `mono_chat::init` in setup, plus `mod mono;`, `mod mono_chat;`, `mod mono_transcript;`, `mod codex_mono_store;`.

- [ ] **Step 2: Delete the modules and registrations**

Remove those `mod` lines, the `mono_chat::init` call, the `mono_chat::window_closed` call if it is only for Mono windows, and every handler entry listed above.

Delete the four Rust files and the `mono_chat` directory.

Search `src-tauri` for `mono::`, `mono_chat::`, `mono_transcript::`, and `codex_mono_store::`. Delete each remaining call. Do not delete `src/features/projects/model/projectMascots.ts` or any frontend file in this task.

Do not add code that deletes `<app data>/monos/` at startup.

- [ ] **Step 3: Compile**

Run: `cargo check -p monocode --manifest-path src-tauri/Cargo.toml`

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/mono.rs src-tauri/src/mono_chat.rs src-tauri/src/mono_chat src-tauri/src/mono_transcript.rs src-tauri/src/codex_mono_store.rs
git commit -m "refactor: remove Mono backend commands"
```

---

## Self-review

| Spec item | Task |
| --- | --- |
| Remove Mono from rail, sidebar, title bar, settings, picker, floating chat | Tasks 1 and 2 |
| Delete `src/features/monos` | Task 3 |
| Remove `isMonoSession` / `isHabitRun` branches | Task 1 |
| Delete Rust `mono`, `mono_chat`, `mono_transcript`, `codex_mono_store` and their commands | Task 4 |
| Leave `<app data>/monos/` on disk | Task 4 |
| Keep project pixel mascots | Global Constraints |
| Leave stored `Session` fields in place | Global Constraints |

`codex_mono_store` is the Codex rollout store for Mono threads, outside the Codex home. Ordinary sessions do not use it.
