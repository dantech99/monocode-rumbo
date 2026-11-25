# spaces-context-menu
Objective: one way to manage projects in the sidebar: the Spaces list. Branch: feat/spaces-context-menu (stacked on chore/cleanup-traces) | Runner: `LC_ALL=en_US.UTF-8 npm run check:web`

## Specs
- S1: "no me gusta como se gestionan los proyectos asi, ahora tenemis una mezcla entre la agrupacion de proyectos como la de esta imagen [5] y como lo hacia monocode, la idea es dejar uno solo" — keep only the Spaces list (rows with initial/logo, name, branch at right, sessions indented below); remove the top project dropdown (header showing the project name with a caret and its menu: Switch worktree, Switch project, Project settings, Settings).
- S2: "lo de project settings que este incrustado en cada space y que dandole click derecho se despliguen las opciones" — right-click on a Space row opens a context menu with the project options the old dropdown offered (Switch worktree, Project settings, remove project, notification settings, etc.), minus "Switch project" (the list is the switcher) and minus "Settings" (the footer already has it).
- S3: "quitar los taps que estan en el bottom del sidebar que era para los monos" — remove the strip at the bottom of the sidebar (the pill with arrows and the project mascot icon below the Settings footer).
- S4 (assumption): sessions stay listed under every space as already implemented; Search/Inbox/Notes strip and the session filter stay; Files/Changes access keeps working wherever it lived.

## Tasks
- [ ] T1 (S1-S2) Replace the header dropdown with a Space-row context menu
- [ ] T2 (S3) Remove the bottom strip
- [ ] T3 tests and checks

## Log
- L1 (2026-11-24, user): "levante tauri y esta es la app, mira como se ve el sidebar, todavia con ese sidebar, todavia no se agrupan por proyectos, si te das cuenta arriba hay un desplegable que muestra otras opciones, no me gusta como se gestionan los proyectos asi, ahora tenemis una mezcla entre la agrupacion de proyectos como la de esta imagen y como lo hacia monocode, la idea es dejar uno solo, lo de project settings que este incrustado en cada space y que dandole click derecho se despliguen las opciones, quitar los taps que estan en el bottom del sidebar que era para los monos"
- L2: Note: in `tauri dev` recents live in localStorage under origin localhost:1420, so only the cwd project appears until more projects are added with the + button.
