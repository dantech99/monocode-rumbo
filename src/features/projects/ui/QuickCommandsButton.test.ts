// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  QuickCommandsButton,
  quickCommandMenuItems,
} from "./QuickCommandsButton";
import { saveQuickCommand } from "../model/quickCommands";

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("offers only adding when a project has no commands", () => {
  expect(quickCommandMenuItems([])).toEqual([
    { kind: "item", id: "add", label: "Add command…" },
  ]);
});

it("lists commands to run, then add, edit and remove", () => {
  const items = quickCommandMenuItems([
    { id: "a", label: "Dev", command: "npm run dev\nmore", action: "terminal" },
    { id: "b", label: "Fix", command: "Fix tests", action: "agent" },
  ]);
  expect(
    items.map((item) => (item.kind === "item" ? item.id : item.kind)),
  ).toEqual(["run:a", "run:b", "sep", "add", "edit", "remove"]);
  expect(items[0]).toMatchObject({ description: "npm run dev" });
  expect(items[1]).toMatchObject({ shortcut: "agent" });
});

it("runs the primary command from the main button", async () => {
  const dev = saveQuickCommand("/repo", {
    label: "Dev",
    command: "npm run dev",
    action: "terminal",
  });
  const onRun = vi.fn();
  act(() =>
    root.render(createElement(QuickCommandsButton, { cwd: "/repo", onRun })),
  );
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="Run Dev"]')!
      .click(),
  );
  expect(onRun).toHaveBeenCalledWith(dev);
});

it("opens the add dialog when there are no commands yet", async () => {
  act(() =>
    root.render(
      createElement(QuickCommandsButton, { cwd: "/repo", onRun: vi.fn() }),
    ),
  );
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="Add a quick command"]')!
      .click(),
  );
  expect(document.body.textContent).toContain("Add Quick Command");
});
