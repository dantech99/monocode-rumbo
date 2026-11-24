# remove-mobile
Objective: remove the mobile app and the desktop's phone-pairing backend. Branch: chore/remove-mobile (from main) | Runner: `npm run check:web`, `cargo clippy`, `cargo test`

## Specs
- S1: "quitemos mobile" — remove mobile/ (Expo), crates/mobile-link, src-tauri mobile_access/mobile_router, src/features/mobile, tests/mobile, the Settings "Your phones" section, CI mobile job, README line.
- S2 (assumption): dead code that only served the phone is removed too (fs mobile_list_dir/mobile_read_text_file/inside_root, MobileUsageLimit contract, quinn/if-addrs/igd-next/natpmp deps). Tauri `cfg(mobile)` attributes stay (Tauri standard).
- S3 (assumption): Monos removal is separate; remote SSH hosts (`host/`, docs/remote-access.md) stay.

## Tasks
- [x] T1 (S1-S3) Remove mobile end to end — route: inline — check:web 5425 tests pass (LC_ALL=en_US), tsc clean, fmt+clippy clean, cargo test: same 4 git tests fail as on main (environment)

## Log
- L1 (2026-11-24, user): "quitemos mobile"
- L2: Map: only lib.rs and src-tauri/Cargo.toml referenced the Rust mobile modules; App.tsx used useMobileWorkspace + recoverMobileUsage; SettingsView rendered MobileSettings; ci.yml had a "mobile" job.
