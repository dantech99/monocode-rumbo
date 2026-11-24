// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { SessionSummary } from "../../features/sessions/data/sessionStore";
import { ProjectSessionColumn, type ProjectColumnGroup } from "./ProjectSessionColumn";

function session(id: string, cwd: string): SessionSummary {
  return {
    id,
    cwd,
    harness: "cursor",
    model: "gpt-5",
    runtimeMode: "supervised",
    title: id,
    createdAt: 1,
    updatedAt: 1,
  };
}

function group(
  cwd: string,
  label: string,
  sessions: SessionSummary[],
  extra: Partial<ProjectColumnGroup> = {},
): ProjectColumnGroup {
  return {
    cwd,
    label,
    initial: label[0]!.toUpperCase(),
    color: "hsl(200 70% 50%)",
    branch: cwd.endsWith("a") ? "main" : "develop",
    phase: "ready",
    sessions,
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("lists every project and its sessions, and highlights the current project", () => {
  const onSelectProject = vi.fn();
  const onOpenProject = vi.fn();
  act(() => {
    root.render(
      createElement(ProjectSessionColumn, {
        groups: [
          group("/repo/a", "alpha", [session("a1", "/repo/a")]),
          group("/repo/b", "beta", [session("b1", "/repo/b")]),
        ],
        cwd: "/repo/b",
        query: "",
        onQueryChange: vi.fn(),
        notesEnabled: true,
        searchActive: false,
        inboxActive: false,
        notesActive: false,
        inboxUnseen: false,
        onSearch: vi.fn(),
        onOpenInbox: vi.fn(),
        onOpenNotes: vi.fn(),
        onOpenProject,
        onOpenSettings: vi.fn(),
        onSelectProject,
        renderSession: (row) =>
          createElement("div", { "data-session-card": row.id }, row.title),
      }),
    );
  });
  const spaces = container.querySelector('nav[aria-label="Spaces"]')!;
  expect(
    [...spaces.querySelectorAll("[data-project]")].map((node) =>
      node.getAttribute("data-project"),
    ),
  ).toEqual(["/repo/a", "/repo/b"]);
  expect(container.querySelector('[data-session-card="a1"]')).not.toBeNull();
  expect(container.querySelector('[data-session-card="b1"]')).not.toBeNull();
  expect(
    spaces.querySelector('[data-project="/repo/b"]')!.getAttribute("data-current"),
  ).toBe("true");
  expect(
    spaces.querySelector('[data-project="/repo/b"] [data-project-branch]')!
      .textContent,
  ).toBe("develop");
  act(() => {
    spaces
      .querySelector<HTMLButtonElement>('[data-project="/repo/a"] button')!
      .click();
  });
  expect(onSelectProject).toHaveBeenCalledWith("/repo/a");
  act(() => {
    container.querySelector<HTMLButtonElement>('button[aria-label="Open project"]')!.click();
  });
  expect(onOpenProject).toHaveBeenCalledOnce();
});

it("shows the load error and the disconnected remote line without an empty illustration", () => {
  act(() => {
    root.render(
      createElement(ProjectSessionColumn, {
        groups: [
          group("/repo/a", "alpha", [], { phase: "error" }),
          group("/remote", "remote", [], { phase: "remote-disconnected", branch: undefined }),
          group("/repo/empty", "empty", [], { phase: "ready", branch: undefined }),
        ],
        cwd: "/repo/a",
        query: "",
        onQueryChange: vi.fn(),
        notesEnabled: false,
        searchActive: false,
        inboxActive: false,
        notesActive: false,
        inboxUnseen: true,
        onSearch: vi.fn(),
        onOpenInbox: vi.fn(),
        onOpenNotes: vi.fn(),
        onOpenProject: vi.fn(),
        onOpenSettings: vi.fn(),
        onSelectProject: vi.fn(),
        renderSession: () => null,
      }),
    );
  });
  expect(container.textContent).toContain("Couldn’t load sessions");
  expect(container.textContent).toContain(
    "This project’s machine isn’t connected on this computer.",
  );
  expect(container.textContent).not.toContain("Sessions you start will show up here");
  expect(container.querySelector('button[aria-label="Notes"]')).toBeNull();
  expect(container.querySelector('button[aria-label="Inbox"]')).not.toBeNull();
});
