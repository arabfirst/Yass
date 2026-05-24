import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, activityLogsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/activity-logs", requireAdmin, async (req, res): Promise<void> => {
  const logs = await db
    .select()
    .from(activityLogsTable)
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(500);

  res.json(
    logs.map((l) => ({
      id: l.id,
      action: l.action,
      performedBy: l.performedBy,
      details: l.details ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
  );
});

export default router;
