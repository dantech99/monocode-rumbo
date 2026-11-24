import type { InboxItem } from "./githubTasks";
import { linearIssueDetails, peekLinearIssueDetails } from "./linear";

/** Load tracker context before opening a session, including from list actions. */
export async function inboxTrackerDescription(
  item: InboxItem,
  body?: string,
): Promise<string | undefined> {
  if (item.provider !== "linear") return body;
  if (body !== undefined) return body;
  if (!item.id) throw new Error("Missing Linear issue");
  return (
    peekLinearIssueDetails(item.id) ?? (await linearIssueDetails(item.id))
  ).body;
}
