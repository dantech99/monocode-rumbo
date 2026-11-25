// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("../../../platform/tauri/fs", () => ({
  gitBranches: vi.fn(async () => ({
    current: "main",
    detached: false,
    branches: [{ name: "main", current: true, remote: null }],
  })),
  subscribeGitChanged: () => () => {},
  gitCheckout: vi.fn(),
  gitCommit: vi.fn(),
  gitCreateBranch: vi.fn(),
  gitDeleteBranch: vi.fn(),
  gitStageAll: vi.fn(),
  gitStash: vi.fn(),
  isCheckoutBlockedByChanges: () => false,
  notifyGitChanged: vi.fn(),
}));

import { BranchPicker, branchDetail } from "./BranchPicker";
import {
  gitBranches,
  gitCheckout,
  gitCreateBranch,
  gitDeleteBranch,
} from "../../../platform/tauri/fs";

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("autofocuses the branch search input only once the popover frame is visible", async () => {
  const seenVisibility: (string | undefined)[] = [];
  const nativeFocus = HTMLInputElement.prototype.focus;
  vi.spyOn(HTMLInputElement.prototype, "focus").mockImplementation(function (
    this: HTMLInputElement,
  ) {
    const frame = this.closest("[data-popover-side]")
      ?.parentElement as HTMLElement | null;
    seenVisibility.push(frame?.style.visibility);
    return nativeFocus.call(this);
  });

  act(() =>
    root.render(createElement(BranchPicker, { cwd: "/repo", branch: "main" })),
  );
  await act(async () => {});
  const button = container.querySelector("button")!;
  await act(async () => button.click());
  await act(async () => {});

  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Search or create a branch"]',
  );
  expect(input).not.toBeNull();
  // Focusing a `visibility: hidden` element is a no-op in real browsers, so
  // the popover's pre-paint measure pass must never be where focus lands.
  expect(seenVisibility).not.toContain("hidden");
  expect(document.activeElement).toBe(input);
});

it("uses the interface typeface for branch names and search", async () => {
  act(() =>
    root.render(createElement(BranchPicker, { cwd: "/repo", branch: "main" })),
  );
  await act(async () => {});
  await act(async () => container.querySelector("button")!.click());

  const picker = document.querySelector<HTMLElement>("[data-branch-picker]")!;
  const search = picker.querySelector<HTMLInputElement>(
    'input[aria-label="Search or create a branch"]',
  )!;
  const branchName = picker.querySelector<HTMLElement>(
    '[role="option"] span span',
  )!;

  expect(search.className).toContain("font-sans");
  expect(branchName.className).not.toContain("font-mono");
  expect(branchName.className).toContain("font-medium");
});

it("asks for a branch name before creating from the fixed action", async () => {
  act(() =>
    root.render(createElement(BranchPicker, { cwd: "/repo", branch: "main" })),
  );
  await act(async () => {});
  await act(async () => container.querySelector("button")!.click());

  const picker = document.querySelector<HTMLElement>("[data-branch-picker]")!;
  const create = [...picker.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.textContent === "New branch",
  )!;
  const list = picker.querySelector('[role="listbox"][aria-label="Branches"]')!;
  expect(list.contains(create)).toBe(false);
  expect(create.parentElement?.className).toContain("border-t");
  expect(create.parentElement?.className).toContain("shrink-0");
  expect(create.parentElement).toBe(picker.lastElementChild);
  expect(create.className).toContain("hover:bg-content/8");

  await act(async () => create.click());
  expect(gitCreateBranch).not.toHaveBeenCalled();

  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Branch name"]',
  )!;
  expect(input).not.toBeNull();
  await act(async () => {});
  expect(document.activeElement).toBe(input);

  const submit = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].find((button) => button.textContent === "Create branch")!;
  expect(submit.disabled).toBe(true);

  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, "feature/picker");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(submit.disabled).toBe(false);

  await act(async () => submit.click());
  expect(gitCreateBranch).toHaveBeenCalledWith("/repo", "feature/picker");
});

it("updates the branch creation row with the entered name", async () => {
  act(() =>
    root.render(createElement(BranchPicker, { cwd: "/repo", branch: "main" })),
  );
  await act(async () => {});
  await act(async () => container.querySelector("button")!.click());

  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Search or create a branch"]',
  )!;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, "feature/picker");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  const picker = document.querySelector<HTMLElement>("[data-branch-picker]")!;
  const create = [...picker.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.textContent === "Create and checkout feature/picker",
  );
  expect(create).not.toBeUndefined();
  expect(create?.parentElement?.className).toContain("border-t");
});

it("checks out the highlighted matching branch when Enter is pressed", async () => {
  vi.mocked(gitBranches).mockResolvedValueOnce({
    current: "main",
    detached: false,
    branches: [
      { name: "main", current: true, remote: null },
      { name: "feature/picker", current: false, remote: null },
    ],
  });
  act(() =>
    root.render(
      createElement(BranchPicker, {
        cwd: "/repo-enter-existing",
        branch: "main",
      }),
    ),
  );
  await act(async () => {});
  await act(async () => container.querySelector("button")!.click());

  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Search or create a branch"]',
  )!;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, "picker");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  const picker = document.querySelector<HTMLElement>("[data-branch-picker]")!;
  const highlighted =
    picker.querySelector<HTMLButtonElement>('[role="option"]')!;
  expect(highlighted.textContent).toContain("feature/picker");
  expect(
    [...picker.querySelectorAll<HTMLButtonElement>("button")].some(
      (button) => button.textContent === "Create and checkout picker",
    ),
  ).toBe(true);

  await act(async () => {
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  });

  expect(gitCheckout).toHaveBeenCalledWith(
    "/repo-enter-existing",
    "feature/picker",
    null,
  );
  expect(gitCreateBranch).not.toHaveBeenCalledWith(
    "/repo-enter-existing",
    "picker",
  );
});

const TWO_BRANCHES = {
  current: "main",
  detached: false,
  branches: [
    {
      name: "main",
      current: true,
      remote: null,
      author: "Ana",
      date: 1_700_000_000,
      subject: "Merge pull request",
    },
    { name: "feature/x", current: false, remote: null },
    { name: "release", current: false, remote: "origin" },
  ],
};

async function openPicker() {
  vi.mocked(gitBranches).mockResolvedValue(TWO_BRANCHES);
  act(() =>
    root.render(createElement(BranchPicker, { cwd: "/repo", branch: "main" })),
  );
  await act(async () => {});
  await act(async () => container.querySelector("button")!.click());
  await act(async () => {});
  return document.querySelector<HTMLElement>("[data-branch-picker]")!;
}

it("groups local and remote branches under headings with tip details", async () => {
  const picker = await openPicker();
  const text = picker.textContent ?? "";
  expect(text).toContain("Local Branches");
  expect(text).toContain("Remote Branches");
  expect(text).toContain("origin/release");
  expect(text).toContain("Ana");
  expect(text).toContain("Merge pull request");
});

it("only offers delete for local branches that are not checked out", async () => {
  const picker = await openPicker();
  expect(picker.querySelector('[aria-label="Delete branch main"]')).toBeNull();
  expect(
    picker.querySelector('[aria-label="Delete branch release"]'),
  ).toBeNull();
  expect(
    picker.querySelector('[aria-label="Delete branch feature/x"]'),
  ).not.toBeNull();
});

it("deletes a branch without switching to it", async () => {
  vi.mocked(gitDeleteBranch).mockResolvedValue(undefined);
  const picker = await openPicker();
  await act(async () =>
    picker
      .querySelector<HTMLButtonElement>(
        '[aria-label="Delete branch feature/x"]',
      )!
      .click(),
  );
  expect(gitDeleteBranch).toHaveBeenCalledWith("/repo", "feature/x", false);
  expect(gitCheckout).not.toHaveBeenCalled();
});

it("asks before force-deleting an unmerged branch", async () => {
  vi.mocked(gitDeleteBranch)
    .mockRejectedValueOnce(new Error("Branch feature/x is not fully merged"))
    .mockResolvedValueOnce(undefined);
  const picker = await openPicker();
  await act(async () =>
    picker
      .querySelector<HTMLButtonElement>(
        '[aria-label="Delete branch feature/x"]',
      )!
      .click(),
  );
  expect(picker.textContent).toContain(
    "is not fully merged. Delete it anyway?",
  );
  expect(gitDeleteBranch).toHaveBeenCalledTimes(1);

  const confirm = [...picker.querySelectorAll("button")].find(
    (button) => button.textContent === "Delete",
  )!;
  await act(async () => confirm.click());
  expect(gitDeleteBranch).toHaveBeenLastCalledWith("/repo", "feature/x", true);
});

it("describes a branch tip, skipping what git did not give", () => {
  const now = 1_700_000_000_000 + 4 * 3600_000;
  expect(
    branchDetail(
      {
        name: "a",
        current: false,
        remote: null,
        author: "Ana",
        date: 1_700_000_000,
        subject: "fix",
      },
      now,
      "en",
    ),
  ).toBe("Ana · 4 hours ago · fix");
  expect(branchDetail({ name: "a", current: false, remote: null })).toBe("");
});

it("shows the branch read-only without opening the picker", async () => {
  act(() =>
    root.render(
      createElement(BranchPicker, {
        cwd: "/repo",
        branch: "main",
        readOnly: true,
      }),
    ),
  );
  await act(async () => {});
  const trigger = container.querySelector("button")!;
  expect(trigger.textContent).toContain("main");
  expect(trigger.disabled).toBe(true);
  expect(trigger.getAttribute("aria-haspopup")).toBeNull();
  expect(trigger.className).not.toContain("disabled:opacity-40");
  await act(async () => trigger.click());
  expect(document.querySelector("[data-branch-picker]")).toBeNull();
});
