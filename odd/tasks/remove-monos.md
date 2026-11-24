# remove-monos
Objective: remove the Mono product (UI, TS module, Rust commands) following docs/superpowers/plans/2026-11-21-remove-monos.md. Branch: chore/remove-monos (stacked on feat/sidebar-projects, which already contains main) | Runner: `LC_ALL=en_US.UTF-8 npm run check:web`, `cargo fmt/clippy/test` in repo root

## Specs
- S1: "seguimos con los monos" — execute the 4-task plan docs/superpowers/plans/2026-11-21-remove-monos.md (Tasks 1-4) exactly as written, adapting only where main already removed things (reminders, automations, Jira/GitLab/Azure, Native, mobile).
- S2 (plan constraints, verbatim): "Do not delete `<app data>/monos/`." "Project pixel mascots (`src/features/projects/model/projectMascots.ts`, `ProjectMascot`) stay." "Do not remove optional fields already stored on `Session` (`monoTranscript` and the card/reaction fields). Leave them unread."
- S3: src/features/monos/model/monoSchedule.ts (schedule helpers moved from automations) is deleted together with the Monos module.

## Tasks
- [x] T1 (7b5b727f) plan Task 1: Stop treating Mono sessions as special
- [x] T2 (b8f14971) plan Task 2: Remove Mono from the shell and settings
- [x] T3 (a2f28ec2) plan Task 3: Delete the Mono TypeScript module
- [x] T4 (b40998a9) plan Task 4: Remove Mono-only Rust commands

## Log
- L1 (2026-11-24, user): "ya fusione, seguimos con los monos"
- L2 (2026-11-24, user, choosing option): "Sidebar primero (Recomendado)" — sidebar branch rebased/merged first, pushed as origin/feat/sidebar-projects.
- L3: Plan understated the coupling. Also removed: Mono code in sessionStore.ts, SessionPane/AgentTranscript, settings sections and shortcut "App: Toggle Mono", agentApp.ts actions (soul/memory/habits/chat.card/artifacts, project param, notifyOnComplete), Codex Mono store in the harness (codexStore, migrateMonoCodexSession), mono-chat.html and its vite input, and ~100 Mono-only tests. Generic Codex rollout helpers moved from codex_mono_store.rs to codex_rollouts.rs (used by provider account transfer). Left on purpose: Session fields monoTranscript/monoCard/monoReaction/monoHabit/monoSpawnedSessions/monoSessionCompletion (unread), `<app data>/monos/`, DB tables mono_blocks etc., ArtifactPanel.tsx (no consumer now), AgentTranscript inert Mono props (agentMascot, inlineWork...).
