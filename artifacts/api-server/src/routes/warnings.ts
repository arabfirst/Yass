import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, soldiersTable, warningsTable } from "@workspace/db";
import { CreateWarningBody, DeleteWarningParams, GetSoldierWarningsParams } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

router.get("/warnings", requireAdmin, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(warningsTable)
    .innerJoin(soldiersTable, eq(warningsTable.soldierId, soldiersTable.id))
    .orderBy(desc(warningsTable.createdAt));

  res.json(
    rows.map((r) => ({
      id: r.warnings.id,
      soldierId: r.warnings.soldierId,
      soldierName: r.soldiers.name,
      reason: r.warnings.reason,
      givenBy: r.warnings.givenBy,
      createdAt: r.warnings.createdAt.toISOString(),
    })),
  );
});

router.post("/warnings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateWarningBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [soldier] = await db
    .select()
    .from(soldiersTable)
    .where(eq(soldiersTable.id, parsed.data.soldierId));

  if (!soldier) {
    res.status(404).json({ error: "العسكري غير موجود" });
    return;
  }

  const [warning] = await db
    .insert(warningsTable)
    .values({
      soldierId: parsed.data.soldierId,
      reason: parsed.data.reason,
      givenBy: req.session.username!,
    })
    .returning();

  await logActivity(
    "إصدار تحذير",
    req.session.username!,
    `تحذير لـ ${soldier.name}: ${parsed.data.reason}`,
  );

  res.status(201).json({
    id: warning.id,
    soldierId: warning.soldierId,
    soldierName: soldier.name,
    reason: warning.reason,
    givenBy: warning.givenBy,
    createdAt: warning.createdAt.toISOString(),
  });
});

router.delete("/warnings/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteWarningParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "معرف غير صالح" });
    return;
  }

  const [warning] = await db
    .delete(warningsTable)
    .where(eq(warningsTable.id, params.data.id))
    .returning();

  if (!warning) {
    res.status(404).json({ error: "التحذير غير موجود" });
    return;
  }

  await logActivity("حذف تحذير", req.session.username!, `تحذير رقم ${warning.id}`);

  res.sendStatus(204);
});

router.get("/warnings/soldier/:soldierId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.soldierId)
    ? req.params.soldierId[0]
    : req.params.soldierId;
  const params = GetSoldierWarningsParams.safeParse({ soldierId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "معرف غير صالح" });
    return;
  }

  // Soldiers can only see their own warnings
  if (
    req.session.role === "soldier" &&
    req.session.soldierId !== params.data.soldierId
  ) {
    res.status(403).json({ error: "غير مصرح" });
    return;
  }

  const [soldier] = await db
    .select()
    .from(soldiersTable)
    .where(eq(soldiersTable.id, params.data.soldierId));

  if (!soldier) {
    res.status(404).json({ error: "العسكري غير موجود" });
    return;
  }

  const rows = await db
    .select()
    .from(warningsTable)
    .where(eq(warningsTable.soldierId, params.data.soldierId))
    .orderBy(desc(warningsTable.createdAt));

  res.json(
    rows.map((w) => ({
      id: w.id,
      soldierId: w.soldierId,
      soldierName: soldier.name,
      reason: w.reason,
      givenBy: w.givenBy,
      createdAt: w.createdAt.toISOString(),
    })),
  );
});

export default router;
