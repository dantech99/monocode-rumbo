Remove the classic (non-inset) layout entirely; inset layout becomes the single, unconditional UI. Branch: chore/remove-classic-layout. Test runner: npx vitest (per existing test files), npx tsc --noEmit for types.

## Specs

- S1: "¿Confirmas que quieres eliminar por completo el layout clásico (no-inset) y su toggle en Ajustes, dejando el layout inset como única vista?" → user answered "Sí, eliminar layout clásico". Full removal of the classic layout code path and its Settings toggle; inset layout is the only remaining view.
- S2 (derived from S1, mechanical consequence): all `insetLayout` conditionals in `src/app/App.tsx` and `src/features/sessions/ui/Composer.tsx` collapse to their inset-true branch; the classic-only branch and now-dead helper code are deleted.
- S3 (derived from S1): `src/app/shell/NewLayoutNotice.tsx` (the banner that advertises/toggles inset layout) is deleted along with its mount point in `App.tsx`, since it is permanently dead once classic no longer exists.
- S4 (derived from S1): the Settings "Layout" toggle row and its classic-only "Color"/"Translucency" groups in `src/features/settings/ui/SettingsView.tsx` are removed, since they only applied to the classic layout.
- S5 (derived from S1): `src/features/settings/model/appearance.ts` storage/plumbing for the flag (`loadInsetLayout`/`saveInsetLayout`/`subscribeInsetLayout`/`applyInsetLayout`, `INSET_LAYOUT_KEY`, etc.) and race-condition-aware functions (`syncNativeGlass`, `opaqueWindowBackground`, `nativeWindowOpacity`) are simplified to the inset-only behavior, verified manually (not blind ternary collapse) per explorer finding.
- S6 (derived from S1): `src/features/settings/model/settings.ts` `INSET_LAYOUT_HIDDEN_SETTINGS`/`CLASSIC_LAYOUT_HIDDEN_SETTINGS` and the classic-only `SETTINGS_INDEX` entries are removed/collapsed; existing tests in `SettingsView.test.ts` and `settings.test.ts` updated to match.

## Tasks

- T1: Mechanical collapse of `insetLayout` conditionals in App.tsx + Composer.tsx; delete NewLayoutNotice.tsx + its mount. Linked: S2, S3. Route: delegated (fork). Risk: item 6 candidate (behavior change with existing coverage uncertain) — verify via typecheck + test suite. Status: done.
- T2: Remove classic-only Settings UI/state (Color + Translucency groups, Layout toggle), simplify appearance.ts plumbing + race-condition functions, clean settings.ts hidden-settings sets, update tests. Linked: S4, S5, S6. Route: delegated (fork). Risk: item 6 — verify via typecheck + test suite. Status: done (partial on S5 — see L4).
- T3: Final verification (typecheck, test suite, `git diff` review) and work-unit commit(s). Status: done.

## Log

- L1: User (verbatim): "anteriormente se hablo de que existen dos vistas, la que esta por defecto y la otra, podriamos quitar esa otra que puede que ocupe espacio en el proyecto, la verdad no me gusta"
- L2: Explorer mapped scope (2026-11-25): 7 production files, ~45 touch points in App.tsx, genuine feature removal in SettingsView (Color/Translucency groups only exist for classic layout), appearance.ts has startup-race-sensitive functions needing manual care, project-rail concept tied to classic layout needs a removal decision during T2.
- L3: User confirmed via AskUserQuestion: full removal (not just hiding the toggle).
- L4: T1 and T2 ran concurrently on the same working tree (disjoint declared edit surfaces) and both independently ran `git stash`/`stash pop` to isolate their diffs at different points, colliding on the shared index. Both recovered via diffing against the stash before dropping it; no work was lost (confirmed by `git diff --stat` after both completed: 9 files, +165/-812).
- L5: Deliberate scope deviation on S5 — `appearance.ts` still contains `loadInsetLayout`/`saveInsetLayout`/`subscribeInsetLayout`, `insetLayoutActive()`'s classic branches, and the now-orphaned theme hue/saturation/dark-lightness/blur/body-glass load/save/apply functions. They are unreachable in production (since `applyInsetLayout(true)` always runs at startup), but were kept because `src/features/settings/model/nativeGlass.test.ts` directly exercises the classic branch via `localStorage`. Removing them would require rewriting that test file too, which was judged out of scope for this request (the user asked to remove the visible duplicate layout, not do an internal dead-code sweep). Flagged as optional follow-up.
- L6: Final verification (T3): `npx tsc --noEmit` clean; `npx vitest run` → 442/444 test files passed (2 pre-existing skips, unrelated), 4926/4939 tests passed; `grep` confirms no remaining `insetLayout`/`NewLayoutNotice`/`CLASSIC_LAYOUT` references outside the documented L5 leftovers.
- L7: Committed as two work-unit commits on `chore/remove-classic-layout` mirroring T1/T2 scope, then reported to user; push/PR left to user's decision.
