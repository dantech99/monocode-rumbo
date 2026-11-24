# cleanup-traces
Objective: remove leftovers of removed features (Monos, automations, mobile) without changing what stays. Branch: chore/cleanup-traces (from origin/main) | Runner: `LC_ALL=en_US.UTF-8 npx vitest run`, `npx tsc --noEmit`, `cargo fmt/clippy/test`

## Specs
- S1: Mono traces in code (src/ and src-tauri/src/): dead Mono-only props, branches, helpers, fields and their tests. Keep Monocode as the product name and `monocode app` CLI / operator features.
- S2: Other dead code with no consumer: ArtifactPanel.tsx, SkillPromptField.tsx (+ test), `onAppeared` in useInboxUnseen, inert automation fields where removal is clean. Leave the SQL `automation_id` column and Rust struct alone.
- S3: Docs (README.md, CONTRIBUTING.md, docs/*.md except docs/superpowers) that still describe Monos. Do not rename to Rumbo; do not touch upstream links; CHANGELOG untouched.
- S4 (constraints): never delete `<app data>/monos/` or SQLite tables/columns; old persisted session JSON must still load; keep project pixel mascots; do not change provider adapters.

## Tasks
- [ ] T1 (S1) TS: AgentTranscript and transcript model, session fields, queue plumbing, CSS, comments
- [ ] T2 (S1) Rust leftovers
- [ ] T3 (S2) Dead code with no consumer
- [ ] T4 (S3) Docs

## Log
- L1 (2026-11-24, user): "vamos a limpiar rastros"
