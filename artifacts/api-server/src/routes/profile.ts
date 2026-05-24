import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, soldiersTable, attendanceTable, warningsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/me/profile", requireAuth, async (req, res): Promise<void> => {
  if (req.session.role !== "soldier" || !req.session.soldierId) {
    res.status(403).json({ error: "هذه الصفحة للعساكر فقط" });
    return;
  }

  const soldierId = req.session.soldierId;

  const [soldier] = await db
    .select()
    .from(soldiersTable)
    .where(eq(soldiersTable.id, soldierId));

  if (!soldier) {
    res.status(404).json({ error: "العسكري غير موجود" });
    return;
  }

  // Get latest attendance record
  const [latestRecord] = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.soldierId, soldierId))
    .orderBy(desc(attendanceTable.createdAt))
    .limit(1);

  const isCheckedIn = latestRecord
    ? latestRecord.checkInTime !== null && latestRecord.checkOutTime === null
    : false;

  // Calculate total minutes
  const allRecords = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.soldierId, soldierId));

  const now = new Date();
  let totalMinutes = 0;
  for (const r of allRecords) {
    if (r.checkInTime) {
      const end = r.checkOutTime ?? now;
      totalMinutes += Math.floor((end.getTime() - r.checkInTime.getTime()) / 60000);
    }
  }

  // Get warnings
  const warningRows = await db
    .select()
    .from(warningsTable)
    .where(eq(warningsTable.soldierId, soldierId))
    .orderBy(desc(warningsTable.createdAt));

  res.json({
    id: soldier.id,
    name: soldier.name,
    age: soldier.age,
    unit: soldier.unit,
    rank: soldier.rank,
    username: soldier.username ?? null,
    isCheckedIn,
    totalMinutes,
    warningsCount: warningRows.length,
    warnings: warningRows.map((w) => ({
      id: w.id,
      soldierId: w.soldierId,
      soldierName: soldier.name,
      reason: w.reason,
      givenBy: w.givenBy,
      createdAt: w.createdAt.toISOString(),
    })),
    lastCheckIn: latestRecord?.checkInTime ? latestRecord.checkInTime.toISOString() : null,
    lastCheckOut: latestRecord?.checkOutTime ? latestRecord.checkOutTime.toISOString() : null,
  });
});

export default router;
