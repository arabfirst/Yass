import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, soldiersTable, attendanceTable, warningsTable, charactersTable } from "@workspace/db";
import {
  CreateSoldierBody,
  UpdateSoldierBody,
  GetSoldierParams,
  UpdateSoldierParams,
  DeleteSoldierParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

const RANK_ORDER: readonly string[] = [
  "Cadet", "Officer 1", "Officer 2", "Officer 3",
  "Sergeant 1", "Sergeant 2", "Sergeant 3",
  "Lieutenant", "First Lieutenant", "Captain", "Major",
  "Lieutenant Colonel", "Colonel", "Brigadier General",
  "Major General", "Lieutenant General", "General",
  "Deputy Commander", "High Commander", "Chief of Marshal", "Police Chief",
  "Minister of Interior",
];

function getRankIndex(rank: string): number {
  const idx = RANK_ORDER.indexOf(rank);
  return idx === -1 ? 999 : idx;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

async function calcMinutes(soldierId: number, todayOnly = false): Promise<number> {
  const records = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.soldierId, soldierId));

  const today = getToday();
  let total = 0;
  const now = new Date();

  for (const r of records) {
    if (todayOnly && r.date !== today) continue;
    if (r.checkInTime) {
      const end = r.checkOutTime ?? now;
      total += Math.floor((end.getTime() - r.checkInTime.getTime()) / 60000);
    }
  }
  return total;
}

async function getSoldierWithStatus(soldier: typeof soldiersTable.$inferSelect) {
  const [record] = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.soldierId, soldier.id))
    .orderBy(desc(attendanceTable.createdAt))
    .limit(1);

  const isCheckedIn = record
    ? record.checkInTime !== null && record.checkOutTime === null
    : false;

  const warningRows = await db
    .select()
    .from(warningsTable)
    .where(eq(warningsTable.soldierId, soldier.id));

  const rawTotalMinutes = await calcMinutes(soldier.id, false);
  const rawTodayMinutes = await calcMinutes(soldier.id, true);

  // Subtract busy time
  let busyDeduction = soldier.totalBusyMinutes || 0;
  if (soldier.busyStatus && soldier.busyStartTime) {
    busyDeduction += Math.floor((Date.now() - soldier.busyStartTime.getTime()) / 60000);
  }

  const totalMinutes = Math.max(0, rawTotalMinutes - busyDeduction);
  const todayMinutes = Math.max(0, rawTodayMinutes); // today shown as raw (busy shown separately)

  return {
    id: soldier.id,
    name: soldier.name,
    age: soldier.age,
    unit: soldier.unit,
    rank: soldier.rank,
    rankIndex: getRankIndex(soldier.rank),
    username: soldier.username ?? null,
    robloxUsername: soldier.robloxUsername ?? null,
    createdAt: soldier.createdAt.toISOString(),
    isCheckedIn,
    busyStatus: soldier.busyStatus ?? null,
    busyStartTime: soldier.busyStartTime ? soldier.busyStartTime.toISOString() : null,
    points: soldier.points ?? 0,
    totalMinutes,
    todayMinutes,
    warningsCount: warningRows.length,
    warnings: warningRows.map(w => ({
      id: w.id,
      reason: w.reason,
      givenBy: w.givenBy,
      createdAt: w.createdAt.toISOString(),
    })),
    lastCheckIn: record?.checkInTime ? record.checkInTime.toISOString() : null,
    lastCheckOut: record?.checkOutTime ? record.checkOutTime.toISOString() : null,
  };
}

router.get("/soldiers", requireAuth, async (req, res): Promise<void> => {
  const soldiers = await db.select().from(soldiersTable);
  const soldiersWithStatus = await Promise.all(soldiers.map(getSoldierWithStatus));
  // Sort by rank (highest first = highest index first)
  soldiersWithStatus.sort((a, b) => b.rankIndex - a.rankIndex);
  res.json(soldiersWithStatus);
});

router.post("/soldiers", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateSoldierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.username) {
    const [existing] = await db
      .select()
      .from(soldiersTable)
      .where(eq(soldiersTable.username, parsed.data.username));
    if (existing) {
      res.status(400).json({ error: "اسم المستخدم مستخدم بالفعل" });
      return;
    }
  }

  const robloxUsername = (req.body.robloxUsername as string | undefined) ?? null;

  const [soldier] = await db
    .insert(soldiersTable)
    .values({
      name: parsed.data.name,
      age: parsed.data.age,
      unit: parsed.data.unit,
      rank: parsed.data.rank,
      username: parsed.data.username ?? null,
      password: parsed.data.password ?? null,
      robloxUsername,
    })
    .returning();

  await logActivity("إضافة عسكري", req.session.username!, `${soldier.name} - ${soldier.rank} - ${soldier.unit}`);

  res.status(201).json({ ...soldier, username: soldier.username ?? null, createdAt: soldier.createdAt.toISOString() });
});

router.get("/soldiers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetSoldierParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const [soldier] = await db.select().from(soldiersTable).where(eq(soldiersTable.id, params.data.id));
  if (!soldier) { res.status(404).json({ error: "العسكري غير موجود" }); return; }

  res.json(await getSoldierWithStatus(soldier));
});

router.patch("/soldiers/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateSoldierParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const parsed = UpdateSoldierBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const robloxUsername = req.body.robloxUsername !== undefined
    ? (req.body.robloxUsername as string | null)
    : undefined;

  const updateData: Record<string, any> = { ...parsed.data };
  if (robloxUsername !== undefined) updateData.robloxUsername = robloxUsername || null;

  const [soldier] = await db.update(soldiersTable).set(updateData).where(eq(soldiersTable.id, params.data.id)).returning();
  if (!soldier) { res.status(404).json({ error: "العسكري غير موجود" }); return; }

  await logActivity("تعديل بيانات عسكري", req.session.username!, `${soldier.name} - ${soldier.rank}`);
  res.json({ ...soldier, username: soldier.username ?? null, createdAt: soldier.createdAt.toISOString() });
});

router.delete("/soldiers/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteSoldierParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  const [soldier] = await db.delete(soldiersTable).where(eq(soldiersTable.id, params.data.id)).returning();
  if (!soldier) { res.status(404).json({ error: "العسكري غير موجود" }); return; }

  await logActivity("حذف عسكري", req.session.username!, `${soldier.name} - ${soldier.rank}`);
  res.sendStatus(204);
});

// ── Points management (admin only) ──────────────────────────────────────────
router.post("/soldiers/:id/points", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { delta, reason } = req.body as { delta: number; reason?: string };

  if (!Number.isInteger(delta)) {
    res.status(400).json({ error: "delta يجب أن يكون رقماً صحيحاً" });
    return;
  }

  const [soldier] = await db.select().from(soldiersTable).where(eq(soldiersTable.id, id));
  if (!soldier) { res.status(404).json({ error: "العسكري غير موجود" }); return; }

  const newPoints = Math.max(0, (soldier.points ?? 0) + delta);
  await db.update(soldiersTable).set({ points: newPoints }).where(eq(soldiersTable.id, id));

  const action = delta > 0 ? "إضافة نقاط" : "خصم نقاط";
  await logActivity(action, req.session.username!, `${soldier.name}: ${delta > 0 ? "+" : ""}${delta} نقطة${reason ? " - " + reason : ""}`);

  res.json({ points: newPoints });
});

// ── Busy status ─────────────────────────────────────────────────────────────
const BUSY_OPTIONS = ["تحقيق", "ايصال سجين", "اصطفاف عسكري", "اغراض شخصية"] as const;

router.post("/soldiers/:id/busy", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body as { status: string | null };

  // Only the soldier themselves or admin can change busy status
  if (req.session.role !== "admin" && req.session.soldierId !== id) {
    res.status(403).json({ error: "غير مصرح" });
    return;
  }

  const [soldier] = await db.select().from(soldiersTable).where(eq(soldiersTable.id, id));
  if (!soldier) { res.status(404).json({ error: "العسكري غير موجود" }); return; }

  if (status === null) {
    // Resuming from busy — accumulate busy minutes
    let addedBusy = 0;
    if (soldier.busyStartTime) {
      addedBusy = Math.floor((Date.now() - soldier.busyStartTime.getTime()) / 60000);
    }
    await db.update(soldiersTable).set({
      busyStatus: null,
      busyStartTime: null,
      totalBusyMinutes: (soldier.totalBusyMinutes ?? 0) + addedBusy,
    }).where(eq(soldiersTable.id, id));
    await logActivity("رجع من مشغول", soldier.name, `${soldier.busyStatus ?? ""} - ${addedBusy} دقيقة`);
  } else {
    // Going busy
    if (!BUSY_OPTIONS.includes(status as any)) {
      res.status(400).json({ error: "سبب غير صالح" });
      return;
    }
    await db.update(soldiersTable).set({
      busyStatus: status,
      busyStartTime: new Date(),
    }).where(eq(soldiersTable.id, id));
    await logActivity("مشغول", soldier.name, status);
  }

  const [updated] = await db.select().from(soldiersTable).where(eq(soldiersTable.id, id));
  res.json(await getSoldierWithStatus(updated!));
});

// ── Discord username setup (soldiers only) ────────────────────────────────────
router.post("/soldiers/discord-setup", requireAuth, async (req, res): Promise<void> => {
  if (req.session.role !== "soldier" || !req.session.soldierId) {
    res.status(403).json({ error: "للجنود فقط" });
    return;
  }
  const { discordUsername } = req.body;
  if (!discordUsername || typeof discordUsername !== "string" || discordUsername.trim().length < 2) {
    res.status(400).json({ error: "يوزر ديسكورد غير صالح" });
    return;
  }
  const username = discordUsername.trim();

  await db.update(soldiersTable).set({ discordUsername: username }).where(eq(soldiersTable.id, req.session.soldierId));

  const [soldier] = await db.select().from(soldiersTable).where(eq(soldiersTable.id, req.session.soldierId));
  if (soldier?.robloxUsername) {
    await db.update(charactersTable).set({ discordUsername: username }).where(eq(charactersTable.robloxUsername, soldier.robloxUsername));
  }

  req.session.soldierDiscordUsername = username;
  await logActivity("ربط ديسكورد", soldier?.name ?? "", username);
  res.json({ success: true, discordUsername: username });
});

export default router;
