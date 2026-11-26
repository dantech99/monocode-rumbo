import { useMemo, useRef } from "react";

/**
 * Picks which ids should stay mounted: the active id plus the most
 * recently activated ones, up to `max`. `recencyOrder` lists ids
 * most-recently-activated first and may contain stale ids no longer in
 * `currentIds`.
 */
export function computeMountedIds<T>(
  recencyOrder: readonly T[],
  currentIds: readonly T[],
  activeId: T | undefined,
  max: number,
): Set<T> {
  const current = new Set(currentIds);
  const mounted = new Set<T>();
  if (activeId != null && current.has(activeId)) mounted.add(activeId);
  for (const id of recencyOrder) {
    if (mounted.size >= Math.max(max, 0)) break;
    if (current.has(id)) mounted.add(id);
  }
  return mounted;
}

/** Drops ids from `recencyOrder` that are no longer in `currentIds`. */
export function pruneRecency<T>(
  recencyOrder: readonly T[],
  currentIds: readonly T[],
): readonly T[] {
  const current = new Set(currentIds);
  const pruned = recencyOrder.filter((id) => current.has(id));
  return pruned.length === recencyOrder.length ? recencyOrder : pruned;
}

/** Moves `id` to the front of `recencyOrder`, leaving order unchanged if already there. */
export function bumpRecency<T>(
  recencyOrder: readonly T[],
  id: T,
): readonly T[] {
  if (recencyOrder[0] === id) return recencyOrder;
  return [id, ...recencyOrder.filter((entry) => entry !== id)];
}

/**
 * Tracks which of `currentIds` should stay mounted: the active id plus the
 * `max` most-recently-active others. Ids outside the returned set should be
 * unmounted by the caller (e.g. render `null` instead of hidden markup) to
 * free their retained memory (DOM, editor/terminal instances, etc).
 */
export function useMountLru<T>(
  currentIds: readonly T[],
  activeId: T | undefined,
  max: number,
): Set<T> {
  const recencyRef = useRef<readonly T[]>([]);

  recencyRef.current = pruneRecency(recencyRef.current, currentIds);
  if (activeId != null && currentIds.includes(activeId)) {
    recencyRef.current = bumpRecency(recencyRef.current, activeId);
  }

  return useMemo(
    () => computeMountedIds(recencyRef.current, currentIds, activeId, max),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recencyRef.current, currentIds, activeId, max],
  );
}
