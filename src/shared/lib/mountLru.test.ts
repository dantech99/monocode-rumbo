import { describe, expect, it } from "vitest";
import { bumpRecency, computeMountedIds, pruneRecency } from "./mountLru";

describe("computeMountedIds", () => {
  it("always includes the active id even when max is 0", () => {
    const mounted = computeMountedIds([], ["a", "b"], "a", 0);
    expect(mounted).toEqual(new Set(["a"]));
  });

  it("always includes the active id even when max is 1 and it is stale in recency", () => {
    const mounted = computeMountedIds(["b", "c"], ["a", "b", "c"], "a", 1);
    expect(mounted.has("a")).toBe(true);
  });

  it("fills remaining slots from recency order, most recent first", () => {
    const mounted = computeMountedIds(["c", "b", "a"], ["a", "b", "c"], "c", 2);
    expect(mounted).toEqual(new Set(["c", "b"]));
  });

  it("drops the least-recently-active ids once max is exceeded", () => {
    const mounted = computeMountedIds(
      ["d", "c", "b", "a"],
      ["a", "b", "c", "d"],
      "d",
      2,
    );
    expect(mounted).toEqual(new Set(["d", "c"]));
    expect(mounted.has("a")).toBe(false);
    expect(mounted.has("b")).toBe(false);
  });

  it("ignores recency entries for ids no longer current", () => {
    const mounted = computeMountedIds(["z", "a"], ["a", "b"], "b", 2);
    expect(mounted).toEqual(new Set(["b", "a"]));
  });
});

describe("bumpRecency", () => {
  it("moves the id to the front, dropping any earlier occurrence", () => {
    expect(bumpRecency(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
  });

  it("returns the same reference when the id is already at the front", () => {
    const order = ["a", "b"];
    expect(bumpRecency(order, "a")).toBe(order);
  });

  it("adds a brand new id to the front", () => {
    expect(bumpRecency(["a"], "b")).toEqual(["b", "a"]);
  });
});

describe("pruneRecency", () => {
  it("drops ids no longer present in currentIds", () => {
    expect(pruneRecency(["a", "b", "c"], ["a", "c"])).toEqual(["a", "c"]);
  });

  it("returns the same reference when nothing needs pruning", () => {
    const order = ["a", "b"];
    expect(pruneRecency(order, ["a", "b", "c"])).toBe(order);
  });
});

describe("integration: simulated useMountLru activation sequence", () => {
  /** Mirrors useMountLru's per-render update without needing a React host. */
  function activate<T>(
    recencyOrder: readonly T[],
    currentIds: readonly T[],
    activeId: T,
  ): readonly T[] {
    const pruned = pruneRecency(recencyOrder, currentIds);
    return currentIds.includes(activeId)
      ? bumpRecency(pruned, activeId)
      : pruned;
  }

  it("keeps only the active id plus the most recently activated others", () => {
    const currentIds = ["a", "b", "c"];
    let recency = activate([], currentIds, "a");
    expect(computeMountedIds(recency, currentIds, "a", 2)).toEqual(
      new Set(["a"]),
    );

    recency = activate(recency, currentIds, "b");
    expect(computeMountedIds(recency, currentIds, "b", 2)).toEqual(
      new Set(["b", "a"]),
    );

    recency = activate(recency, currentIds, "c");
    expect(computeMountedIds(recency, currentIds, "c", 2)).toEqual(
      new Set(["c", "b"]),
    );
  });

  it("prunes ids removed from currentIds out of the recency order", () => {
    let currentIds = ["a", "b"];
    let recency = activate([], currentIds, "a");
    recency = activate(recency, currentIds, "b");
    expect(computeMountedIds(recency, currentIds, "b", 2)).toEqual(
      new Set(["b", "a"]),
    );

    currentIds = ["b", "c"];
    recency = activate(recency, currentIds, "c");
    expect(computeMountedIds(recency, currentIds, "c", 2)).toEqual(
      new Set(["c", "b"]),
    );
  });

  it("is stable when the same active id is activated repeatedly", () => {
    const currentIds = ["a", "b", "c"];
    let recency = activate([], currentIds, "a");
    const first = computeMountedIds(recency, currentIds, "a", 2);

    recency = activate(recency, currentIds, "a");
    const second = computeMountedIds(recency, currentIds, "a", 2);
    expect(second).toEqual(first);
  });
});
