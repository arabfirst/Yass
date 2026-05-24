import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, soldiersTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صالحة" });
    return;
  }

  const { username, password } = parsed.data;

  // First check admin users table
  const [adminUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (adminUser && adminUser.password === password) {
    req.session.userId = adminUser.id;
    req.session.username = adminUser.username;
    req.session.role = "admin";
    req.session.soldierId = null;
    req.session.soldierName = null;

    await logActivity("تسجيل دخول", adminUser.username, `دخول القيادة`);

    res.json({
      id: adminUser.id,
      username: adminUser.username,
      role: "admin",
      soldierId: null,
      soldierName: null,
    });
    return;
  }

  // Then check soldiers table
  const [soldier] = await db
    .select()
    .from(soldiersTable)
    .where(eq(soldiersTable.username, username));

  if (soldier && soldier.password && soldier.password === password) {
    req.session.userId = soldier.id;
    req.session.username = soldier.username!;
    req.session.role = "soldier";
    req.session.soldierId = soldier.id;
    req.session.soldierName = soldier.name;
    req.session.soldierRank = soldier.rank;
    req.session.soldierDiscordUsername = soldier.discordUsername ?? null;

    await logActivity("تسجيل دخول عسكري", soldier.username!, `${soldier.name} - ${soldier.rank}`);

    res.json({
      id: soldier.id,
      username: soldier.username,
      role: "soldier",
      soldierId: soldier.id,
      soldierName: soldier.name,
      rank: soldier.rank,
      discordUsername: soldier.discordUsername ?? null,
    });
    return;
  }

  res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const username = req.session.username ?? "مجهول";
  const role = req.session.role ?? "";
  req.session.destroy(async () => {
    await logActivity("تسجيل خروج", username, role === "admin" ? "خروج القيادة" : "خروج عسكري");
    res.json({ message: "تم تسجيل الخروج" });
  });
});

router.get("/auth/me", (req, res): void => {
  if (!req.session.userId) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  res.json({
    id: req.session.userId,
    username: req.session.username,
    role: req.session.role,
    soldierId: req.session.soldierId ?? null,
    soldierName: req.session.soldierName ?? null,
    rank: req.session.soldierRank ?? null,
    discordUsername: req.session.soldierDiscordUsername ?? null,
  });
});

export default router;
