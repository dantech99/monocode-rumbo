# remove-third-party-integrations
Objective: remove Jira, GitLab, Azure DevOps, automations and reminders; keep Linear, skills, inbox, GitHub.
Branch: chore/remove-third-party-integrations | Delivery: ask-on-risk | Runner: `npm run check:web`, `cargo check` in src-tauri (`npm run check:rust` at the end)

## Specs
- S1: "lo de las integraciones de terceros si me interesa, pero solo dejar linear y skills" — Jira, GitLab and Azure DevOps are removed; Linear and skills stay.
- S2: "quitalo tmbien" — automations and reminders are removed too.
- S3 (assumption): inbox, GitHub and notifications stay and keep working with Linear. Mobile and Monos removal are separate work.
- S4 (assumption): persisted SQLite tables and the `automation_id` session column stay inert; no migration.

## Tasks
- [x] T1 (S2) Remove reminders — route: inline — tsc, vitest (notifications, sessions, shell), cargo check OK — commit: see git log
- [x] T2 (S2) Remove automations — route: inline — tsc, full vitest (only agentAppMemory fails under es_ES locale, passes with en_US; not caused by this change), cargo check OK — commit: see git log
- [ ] T3 (S1) Remove Jira, GitLab, Azure DevOps (Rust + inbox/settings surgery) — route: inline — commit: pending
- [ ] T4 (S1-S4) Full check: `npm run check` — route: inline — commit: pending

## Log
- L1 (2026-11-24, user): "lo de las integraciones de terceros si me interesa, pero solo dejar linear y skills"
- L2 (2026-11-24, user): "quitalo tmbien"
- L3: Explorer map (2026-11-24): scheduler of automations lives in src/app/App.tsx (30s setInterval); reminders start a Rust thread at lib.rs:287; src/features/monos/model/monoHabits.ts imports from features/automations; features/connections is unrelated (remote projects), do not touch; crates/monocode-* are outside the Cargo workspace.
- L4: T2 decision: schedule helpers Mono habits needed (nextAutomationRunAt, automationScheduleLabel, AUTOMATION_WEEKDAYS, isScheduleKind) moved to src/features/monos/model/monoSchedule.ts with their tests; they go away with the Monos removal. `automationId` on sessions, `onAppeared` option in useInboxUnseen, and SkillPromptField (no consumer now) were left in place on purpose.
