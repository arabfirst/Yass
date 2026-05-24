import { db, activityLogsTable } from "@workspace/db";

export async function logActivity(
  action: string,
  performedBy: string,
  details?: string,
): Promise<void> {
  try {
    await db.insert(activityLogsTable).values({
      action,
      performedBy,
      details: details ?? null,
    });
  } catch {
    // Non-critical - don't fail requests if logging fails
  }
}
