# Sidebar lists every project and its sessions

Replace the project rail plus the current-project session list with one left column. Projects stay visible together. Every project's sessions stay visible under it. The Mono product leaves the app.

The user asked: "quiero quitar todo lo relacionado a los monos y cambiar la forma en como se organizan las sessiones, que sean por proyectos y que pueda ver los proyectos en el sidebar de esa forma como en la imagen, de hecho vamos a replicar lo que se ve en la imagen."

## Quick path

1. One left column: action strip, project rows, sessions under each project, Settings at the bottom.
2. Remove Mono from the UI, from `src/features/monos`, and from the Rust commands that exist only for Mono.
3. Load the active project's sessions live. Load every other recent project with `listSessionsByProject`.

## Decisions

| Topic | Decision |
| --- | --- |
| Column | One sidebar. The project icon rail goes away. Its project list moves here. |
| Actions | Search, Inbox, Notes, and Automations stay in a short strip above the list. Same actions as today. Notes stays hidden when notes are disabled. |
| Projects | Flat list. Pinned projects first, then the rest, in the current rail order. Project groups are not shown. |
| Project row | Colored rounded square with the project's initial. A saved logo replaces the initial. Name on the left, truncated. Git branch on the right, dim. The current project (`cwd`) is highlighted across the row. |
| Branch source | Open project: current git state. Other projects: branch on the latest session summary. Empty when neither exists. |
| Sessions | Full history under every project, always visible. Indented under that project's row. |
| Session row | Same row as today, including rename, archive, pin, and delete. |
| Archived | Still hidden unless the archive filter is on. |
| Empty project | Project row only. No large "no sessions" illustration. |
| Remote, disconnected | Existing line under that project: "This project's machine isn't connected on this computer." |
| Session search | The existing session filter stays between the action strip and the project list. It filters every project. A project with no matches is omitted. |
| Open session | Activates that session and switches `cwd` to its project when that project is not current. The highlight follows `cwd`. |
| Project row click | Switches to that project, same as choosing it on the rail today. Other projects' sessions stay listed. |
| Header | Label "Spaces" and a + button that opens a project (today's Open project action). |
| Footer | Settings only. |
| Files and Changes | Stay where they are (sidebar tabs or the right panel, depending on layout). |
| Monos | Removed from rail, sidebar, title bar, settings, project picker, and floating chat. |
| Mono code | Delete `src/features/monos` and the Rust modules that exist only for Mono: `mono`, `mono_chat`, `mono_transcript`, `codex_mono_store`, plus their commands and startup. |
| Mono data | Leave `<app data>/monos/` on disk. This change does not delete it. |
| Project mascots | Remain on tabs and other existing surfaces. This sidebar does not use them. |

## Session loading

The active project keeps today's merge of persisted history and live sessions.

Each other recent project loads through `listSessionsByProject` when the sidebar opens and when the recent-project list changes. A live session already in memory for that project renders immediately and is not held back for the persisted list.

The open project paints first. The other lists arrive after it and do not block the column.

A failed load shows “Couldn’t load sessions” under that project only. A project does not show an empty or error state before its rows have arrived.

Archived projects stay out of the list, as they do on the rail today.

## Mono removal

Mono is the long-lived agent with a mascot that sits beside projects. It is not a project's pixel mascot and not the word "monocode".

Remove:

- `src/features/monos`
- Shell wiring: `MonoRailSection`, title-bar Mono state, settings section, picker entries, floating Mono chat, habits, and overview
- Call sites that only branch for `isMonoSession` or `isHabitRun`
- Rust `mono`, `mono_chat`, `mono_transcript`, and `codex_mono_store`, including their invoke commands and `mono_chat::init`

`codex_mono_store` stores Codex rollouts for Mono threads outside the Codex home. Ordinary sessions do not use it.

Do not delete the user's `<app data>/monos/` directory.

## Out of scope

- Layout settings and Add machine from the reference screenshot. Monocode has no those actions in this column.
- Moving Files or Changes into this column.
- Deleting Mono files already stored on disk.
- Removing project pixel mascots outside this sidebar.

## Verification

- Several recent projects render at once, each with its own sessions, without selecting each project first.
- The highlighted project row is the current project (`cwd`), including after a session open switches project.
- Choosing a session from another project switches project and opens that session.
- Choosing a project row switches project and leaves every project's sessions visible.
- Archived sessions stay hidden until the archive filter is on.
- A project whose `listSessionsByProject` fails shows the error only under itself.
- A disconnected remote project shows the existing machine line.
- Search, Inbox, Notes, Automations, and Settings still fire their current actions.
- No Mono control remains in the rail, sidebar, title bar, settings, or project picker.
- Session rename, archive, pin, and delete still work from a row.
- Files and Changes still open where they open today.

## Next step

Review this spec. Implementation starts only after that review, and then through a written implementation plan.
