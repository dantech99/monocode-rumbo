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
        spaces: [group("/repo/a", "alpha", []), group("/repo/b", "beta", [])],
        pinnedSessions: [],
        agentGroups: [
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
        spaces: [
          group("/repo/a", "alpha", []),
          group("/remote", "remote", [], { branch: undefined }),
          group("/repo/empty", "empty", [], { branch: undefined }),
        ],
        pinnedSessions: [],
        agentGroups: [
          group("/repo/a", "alpha", [], { phase: "error" }),
          group("/remote", "remote", [], { phase: "remote-disconnected", branch: undefined }),
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

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    spaces: [group("/repo/a", "alpha", []), group("/repo/b", "beta", [])],
    pinnedSessions: [] as SessionSummary[],
    agentGroups: [] as ProjectColumnGroup[],
    cwd: "/repo/a",
    query: "",
    onQueryChange: vi.fn(),
    notesEnabled: false,
    searchActive: false,
    inboxActive: false,
    notesActive: false,
    inboxUnseen: false,
    onSearch: vi.fn(),
    onOpenInbox: vi.fn(),
    onOpenProject: vi.fn(),
    onOpenSettings: vi.fn(),
    onSelectProject: vi.fn(),
    renderSession: (row: SessionSummary) =>
      createElement("div", { "data-session-card": row.id }, row.title),
    ...overrides,
  };
}

it("keeps Spaces as a flat list of projects without session children", () => {
  act(() => {
    root.render(
      createElement(
        ProjectSessionColumn,
        baseProps({
          agentGroups: [
            group("/repo/a", "alpha", [session("a1", "/repo/a")]),
          ],
        }),
      ),
    );
  });
  const spaces = container.querySelector('nav[aria-label="Spaces"]')!;
  expect(spaces.querySelectorAll("[data-project]")).toHaveLength(2);
  expect(spaces.querySelector("[data-session-card]")).toBeNull();
  expect(container.querySelector('[data-session-card="a1"]')).not.toBeNull();
});

it("shows Agents with Pinned first and then one labelled group per project, leaving out empty projects", () => {
  act(() => {
    root.render(
      createElement(
        ProjectSessionColumn,
        baseProps({
          pinnedSessions: [session("pin1", "/repo/b")],
          agentGroups: [
            group("/repo/a", "alpha", [session("a1", "/repo/a")]),
          ],
        }),
      ),
    );
  });
  const agents = container.querySelector('section[aria-label="Agents"]')!;
  expect(agents).not.toBeNull();
  const order = [
    ...agents.querySelectorAll("[data-agents-pinned], [data-agent-project]"),
  ].map(
    (node) =>
      node.getAttribute("data-agent-project") ??
      (node.hasAttribute("data-agents-pinned") ? "pinned" : ""),
  );
  expect(order).toEqual(["pinned", "/repo/a"]);
  expect(
    agents.querySelector("[data-agents-pinned] [data-session-card]")!
      .getAttribute("data-session-card"),
  ).toBe("pin1");
  expect(agents.querySelector('[data-agent-project="/repo/a"]')!.textContent).toContain(
    "alpha",
  );
  expect(agents.querySelector('[data-agent-project="/repo/b"]')).toBeNull();
});

it("opens the project menu from a Space row by right-click, ContextMenu and Shift+F10", () => {
  const onProjectContextMenu = vi.fn();
  act(() => {
    root.render(
      createElement(
        ProjectSessionColumn,
        baseProps({ onProjectContextMenu }),
      ),
    );
  });
  const row = container.querySelector<HTMLButtonElement>(
    '[data-project="/repo/b"] button',
  )!;
  act(() => {
    row.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 12,
        clientY: 34,
      }),
    );
  });
  expect(onProjectContextMenu).toHaveBeenLastCalledWith("/repo/b", 12, 34, row);
  for (const init of [
    { key: "ContextMenu" },
    { key: "F10", shiftKey: true },
  ]) {
    act(() => {
      row.dispatchEvent(
        new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true }),
      );
    });
    expect(onProjectContextMenu).toHaveBeenLastCalledWith(
      "/repo/b",
      expect.any(Number),
      expect.any(Number),
      row,
    );
  }
  expect(onProjectContextMenu).toHaveBeenCalledTimes(3);
});

it("says there is no project folder when no project is open and keeps the Open project button", () => {
  const onOpenProject = vi.fn();
  act(() => {
    root.render(
      createElement(
        ProjectSessionColumn,
        baseProps({ spaces: [], cwd: "", onOpenProject }),
      ),
    );
  });
  expect(container.querySelector('nav[aria-label="Spaces"]')!.textContent).toBe(
    "No project folder",
  );
  act(() => {
    container
      .querySelector<HTMLButtonElement>('button[aria-label="Open project"]')!
      .click();
  });
  expect(onOpenProject).toHaveBeenCalledOnce();
});
