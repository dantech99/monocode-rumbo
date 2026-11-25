# spaces-context-menu
Objective: one way to manage projects in the sidebar: the Spaces list. Branch: feat/spaces-context-menu (stacked on chore/cleanup-traces) | Runner: `LC_ALL=en_US.UTF-8 npm run check:web`

## Specs
- S1: "no me gusta como se gestionan los proyectos asi, ahora tenemis una mezcla entre la agrupacion de proyectos como la de esta imagen [5] y como lo hacia monocode, la idea es dejar uno solo" — keep only the Spaces list (rows with initial/logo, name, branch at right, sessions indented below); remove the top project dropdown (header showing the project name with a caret and its menu: Switch worktree, Switch project, Project settings, Settings).
- S2: "lo de project settings que este incrustado en cada space y que dandole click derecho se despliguen las opciones" — right-click on a Space row opens a context menu with the project options the old dropdown offered (Switch worktree, Project settings, remove project, notification settings, etc.), minus "Switch project" (the list is the switcher) and minus "Settings" (the footer already has it).
- S3: "quitar los taps que estan en el bottom del sidebar que era para los monos" — remove the strip at the bottom of the sidebar (the pill with arrows and the project mascot icon below the Settings footer).
- S4 (rewritten by L3): the sidebar has two separate sections. "Spaces" (header + the + button): a FLAT list of projects (colored initial/logo, name, git branch dim at the right, current one highlighted, NO children). Clicking a row switches project; right-click opens the context menu (S2). "Agents" (own header, below Spaces): the sessions of every project. First a "Pinned" group (pinned sessions, no project label), then one group per project with the project name as a small dim label and its session rows beneath. Projects without sessions do not appear in Agents. Session rows keep rename/archive/pin/delete, status dots and relative time. The session filter filters Agents across all projects; a project with no matches is omitted. Loading rules are unchanged (live sessions for the open project, listSessionsByProject for the others); per-project "Couldn't load sessions" and the remote "This project's machine isn't connected" lines render inside that project's Agents group. The Search/Inbox/Notes strip stays.

## Tasks
- [x] T1 (S1-S2) Replace the header dropdown with a Space-row context menu — commit: feat: split the sidebar into Spaces and Agents
- [x] T2 (S3) Remove the bottom strip — same commit; ProjectSpaces.tsx deleted in the next one
- [x] T3 (S4) Agents section: Pinned + per-project groups, Spaces flat — same feat commit
- [x] T4 tests and checks — tsc clean, vitest 4942 pass (LC_ALL=en_US)

## Log
- L1 (2026-11-24, user): "levante tauri y esta es la app, mira como se ve el sidebar, todavia con ese sidebar, todavia no se agrupan por proyectos, si te das cuenta arriba hay un desplegable que muestra otras opciones, no me gusta como se gestionan los proyectos asi, ahora tenemis una mezcla entre la agrupacion de proyectos como la de esta imagen y como lo hacia monocode, la idea es dejar uno solo, lo de project settings que este incrustado en cada space y que dandole click derecho se despliguen las opciones, quitar los taps que estan en el bottom del sidebar que era para los monos"
- L2: Note: in `tauri dev` recents live in localStorage under origin localhost:1420, so only the cwd project appears until more projects are added with the + button.
- L3 (2026-11-24, user): "mira que los espacios no tienen hijos que en este caso son los agentes, mira que en la captura que te mande de herdr se dividen en spaces y agents, asi lo quiero yo"
- L4: Open finding: "Switch worktree" lived only in the removed inset header dropdown; the Space menu (useProjectMenu) has no worktree list, so the inset layout has no sidebar entry to switch worktrees now (the composer WorkspacePicker only picks the workspace for new sessions). tests/browser/layout-opt-in.spec.ts was not run (Playwright).
