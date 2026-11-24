# remove-native
Objective: remove Monocode Native (Rust + GPUI preview) from the repo; Tauri stays the only desktop app.
Branch: chore/remove-native (from main) | Delivery: ask-on-risk | Runner: `npm run check:web`, `cargo check -p monocode`

## Specs
- S1: "quitemos natives" — remove Native: crates/monocode-gpui, crates/monocode-core, vendor/gpui-pre*, docs/native, native scripts and workflows, npm `native:*` scripts, README/CONTRIBUTING/building/NOTICE mentions.
- S2 (assumption): Tauri build, mobile/, host/ and `vendor/portable-pty` are untouched. Mobile and Monos removal are separate work.
- S3 (assumption): data files the native app created (`monocode.db.gpui.sqlite3`) are left on disk, not migrated.

## Tasks
- [x] T1 (S1) Delete native crates, vendor, docs/native, scripts, workflows — route: inline — git rm + removed ignored crates/monocode-gpui/target (2 GB)
- [x] T2 (S1) Clean references: package.json, Cargo.toml, .gitattributes, NOTICE, README, CONTRIBUTING, docs/building.md, scripts/test-remote-ssh.py — route: inline
- [x] T3 (S1-S2) Verify: `cargo check -p monocode` OK; package.json/py syntax OK; grep leftovers only in mobile/ comments (mobile removal is separate); no TS/src files changed so check:web not rerun

## Log
- L1 (2026-11-24, user): "quitemos natives"
- L2: Map (2026-11-24): crates/monocode-core and crates/monocode-gpui are excluded from the Cargo workspace; src-tauri and mobile-link do not depend on them; ci.yml/release.yml only mention "native" as a cache-key label.
- L3: Left on purpose: mobile/ comments citing crates/monocode-gpui paths; the .worktrees/sidebar-projects worktree; `monocode.db.gpui.sqlite3` data files on user machines.
