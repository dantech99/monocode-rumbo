# remove-monos
Objective: remove the Mono product (UI, TS module, Rust commands) following docs/superpowers/plans/2026-11-21-remove-monos.md. Branch: chore/remove-monos (stacked on feat/sidebar-projects, which already contains main) | Runner: `LC_ALL=en_US.UTF-8 npm run check:web`, `cargo fmt/clippy/test` in repo root

## Specs
- S1: "seguimos con los monos" — execute the 4-task plan docs/superpowers/plans/2026-11-21-remove-monos.md (Tasks 1-4) exactly as written, adapting only where main already removed things (reminders, automations, Jira/GitLab/Azure, Native, mobile).
- S2 (plan constraints, verbatim): "Do not delete `<app data>/monos/`." "Project pixel mascots (`src/features/projects/model/projectMascots.ts`, `ProjectMascot`) stay." "Do not remove optional fields already stored on `Session` (`monoTranscript` and the card/reaction fields). Leave them unread."
- S3: src/features/monos/model/monoSchedule.ts (schedule helpers moved from automations) is deleted together with the Monos module.

## Tasks
- [ ] T1 plan Task 1: Stop treating Mono sessions as special
- [ ] T2 plan Task 2: Remove Mono from the shell and settings
- [ ] T3 plan Task 3: Delete the Mono TypeScript module
- [ ] T4 plan Task 4: Remove Mono-only Rust commands

## Log
- L1 (2026-11-24, user): "ya fusione, seguimos con los monos"
- L2 (2026-11-24, user, choosing option): "Sidebar primero (Recomendado)" — sidebar branch rebased/merged first, pushed as origin/feat/sidebar-projects.
