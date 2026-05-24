import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, soldiersTable, attendanceTable } from "@workspace/db";
import { CheckInParams, CheckOutParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

router.post("/attendance/checkin/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CheckInParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "معرف غير صالح" });
    return;
  }

  // Soldiers can only check in/out themselves
  if (req.session.role === "soldier" && req.session.soldierId !== params.data.id) {
    res.status(403).json({ error: "لا يمكنك تسجيل دخول لعسكري آخر" });
    return;
  }

  const [soldier] = await db
    .select()
    .from(soldiersTable)
    .where(eq(soldiersTable.id, params.data.id));

  if (!soldier) {
    res.status(404).json({ error: "العسكري غير موجود" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  const [existing] = await db
    .select()
    .from(attendanceTable)
    .where(
      and(
        eq(attendanceTable.soldierId, params.data.id),
        eq(attendanceTable.date, today),
      ),
    );

  if (existing && existing.checkInTime && !existing.checkOutTime) {
    res.status(400).json({ error: "العسكري مسجل دخول بالفعل" });
    return;
  }

  let record;
  if (existing && existing.checkOutTime) {
    const [updated] = await db
      .update(attendanceTable)
      .set({ checkInTime: new Date(), checkOutTime: null })
      .where(eq(attendanceTable.id, existing.id))
      .returning();
    record = updated;
  } else {
    const [created] = await db
      .insert(attendanceTable)
      .values({
        soldierId: params.data.id,
        date: today,
        checkInTime: new Date(),
      })
      .returning();
    record = created;
  }

  await logActivity(
    "تسجيل دخول عسكري",
    req.session.username!,
    `${soldier.name} - ${soldier.rank} - ${new Date().toLocaleTimeString("ar-SA")}`,
  );

  res.json({
    id: record.id,
    soldierId: record.soldierId,
    soldierName: soldier.name,
    checkInTime: record.checkInTime ? record.checkInTime.toISOString() : null,
    checkOutTime: record.checkOutTime ? record.checkOutTime.toISOString() : null,
    date: record.date,
    durationMinutes: null,
  });
});

router.post("/attendance/checkout/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CheckOutParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "معرف غير صالح" });
    return;
  }

  // Soldiers can only check in/out themselves
  if (req.session.role === "soldier" && req.session.soldierId !== params.data.id) {
    res.status(403).json({ error: "لا يمكنك تسجيل خروج لعسكري آخر" });
    return;
  }

  const [soldier] = await db
    .select()
    .from(soldiersTable)
    .where(eq(soldiersTable.id, params.data.id));

  if (!soldier) {
    res.status(404).json({ error: "العسكري غير موجود" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  const [existing] = await db
    .select()
    .from(attendanceTable)
    .where(
      and(
        eq(attendanceTable.soldierId, params.data.id),
        eq(attendanceTable.date, today),
      ),
    );

  if (!existing || !existing.checkInTime) {
    res.status(400).json({ error: "العسكري غير مسجل دخول" });
    return;
  }

  if (existing.checkOutTime) {
    res.status(400).json({ error: "العسكري مسجل خروج بالفعل" });
    return;
  }

  const checkOutTime = new Date();
  const [record] = await db
    .update(attendanceTable)
    .set({ checkOutTime })
    .where(eq(attendanceTable.id, existing.id))
    .returning();

  const durationMinutes = existing.checkInTime
    ? Math.floor((checkOutTime.getTime() - existing.checkInTime.getTime()) / 60000)
    : null;

  await logActivity(
    "تسجيل خروج عسكري",
    req.session.username!,
    `${soldier.name} - ${soldier.rank} - مدة الحضور: ${durationMinutes ?? 0} دقيقة`,
  );

  res.json({
    id: record.id,
    soldierId: record.soldierId,
    soldierName: soldier.name,
    checkInTime: record.checkInTime ? record.checkInTime.toISOString() : null,
    checkOutTime: record.checkOutTime ? record.checkOutTime.toISOString() : null,
    date: record.date,
    durationMinutes,
  });
});

router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const records = await db
    .select()
    .from(attendanceTable)
    .innerJoin(soldiersTable, eq(attendanceTable.soldierId, soldiersTable.id))
    .orderBy(desc(attendanceTable.createdAt));

  res.json(
    records.map((r) => {
      const duration =
        r.attendance.checkInTime && r.attendance.checkOutTime
          ? Math.floor(
              (r.attendance.checkOutTime.getTime() - r.attendance.checkInTime.getTime()) / 60000,
            )
          : null;
      return {
        id: r.attendance.id,
        soldierId: r.attendance.soldierId,
        soldierName: r.soldiers.name,
        checkInTime: r.attendance.checkInTime ? r.attendance.checkInTime.toISOString() : null,
        checkOutTime: r.attendance.checkOutTime ? r.attendance.checkOutTime.toISOString() : null,
        date: r.attendance.date,
        durationMinutes: duration,
      };
    }),
  );
});

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const soldiers = await db.select().from(soldiersTable);
  const today = new Date().toISOString().slice(0, 10);

  const todayAttendance = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.date, today));

  const checkedInCount = todayAttendance.filter(
    (r) => r.checkInTime && !r.checkOutTime,
  ).length;

  const checkedOutCount = todayAttendance.filter(
    (r) => r.checkInTime && r.checkOutTime,
  ).length;

  const todayCheckIns = todayAttendance.filter((r) => r.checkInTime).length;

  const allWarnings = await db.select().from(
    (await import("@workspace/db")).warningsTable,
  );

  res.json({
    totalSoldiers: soldiers.length,
    checkedInCount,
    checkedOutCount,
    todayCheckIns,
    totalWarnings: allWarnings.length,
  });
});

export default router;
