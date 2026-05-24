import { Router } from "express";
import { eq, or, ilike, sql } from "drizzle-orm";
import { db, bankAccountsTable, bankAdjustmentsTable, charactersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import fs from "fs";
import path from "path";

const router = Router();
const BOT_API_KEY = process.env.AFPD_BOT_API_KEY ?? process.env.BOT_API_KEY ?? "AFPD-BOT-SYNC-KEY-2025";

function readBankFile(): Record<string, any> {
  const bankPath = path.resolve(process.cwd(), "../../bank.json");
  const fallbackPath = path.resolve(process.cwd(), "bank.json");
  for (const p of [bankPath, fallbackPath]) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch { /* ignore */ }
  }
  return {};
}

/** Get all adjustments keyed by discord_user_id */
async function getAllAdjustments(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      discordUserId: bankAdjustmentsTable.discordUserId,
      total: sql<number>`COALESCE(SUM(amount), 0)`,
    })
    .from(bankAdjustmentsTable)
    .groupBy(bankAdjustmentsTable.discordUserId);
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.discordUserId, Number(r.total));
  return map;
}

/** Get adjustment sum for a single user */
async function getAdjustmentSum(discordUserId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(bankAdjustmentsTable)
    .where(eq(bankAdjustmentsTable.discordUserId, discordUserId));
  return Number(rows[0]?.total ?? 0);
}

/** Effective balance = file balance (or DB balance) + DB adjustments */
async function effectiveBalanceFor(
  uid: string,
  bankFile: Record<string, any>,
  adjustmentsMap?: Map<string, number>
): Promise<number> {
  let base = 0;
  if (bankFile[uid]) {
    base = Math.max(0, Number(bankFile[uid].balance ?? 0));
  } else {
    const accs = await db
      .select()
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.discordUserId, uid));
    if (accs.length > 0) base = Math.max(0, accs[0].balance);
  }

  const adj = adjustmentsMap
    ? (adjustmentsMap.get(uid) ?? 0)
    : await getAdjustmentSum(uid);

  return Math.max(0, base + adj);
}

// ── GET /api/bank/live/:userId ──────────────────────────────────────────────
router.get("/bank/live/:userId", requireAuth, async (req, res) => {
  const uid = req.params.userId;
  const bankFile = readBankFile();
  const balance = await effectiveBalanceFor(uid, bankFile);
  if (!bankFile[uid]) {
    const accs = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.discordUserId, uid));
    if (!accs.length) return res.status(404).json({ error: "لا يوجد حساب بنكي لهذا المعرف" });
  }
  return res.json({
    discord_user_id: uid,
    balance,
    last_salary: bankFile[uid]?.last_salary ?? null,
  });
});

// ── GET /api/bank/live-all ──────────────────────────────────────────────────
router.get("/bank/live-all", requireAuth, async (_req, res) => {
  const bankFile = readBankFile();
  const adjustments = await getAllAdjustments();
  const results: any[] = [];
  for (const [uid, data] of Object.entries(bankFile)) {
    if (uid === "_wages") continue;
    if (typeof data !== "object" || !data) continue;
    const balance = await effectiveBalanceFor(uid, bankFile, adjustments);
    results.push({
      discord_user_id: uid,
      balance,
      last_salary: (data as any).last_salary ?? null,
    });
  }
  return res.json({ results, total: results.length });
});

// ── Bot sync: full bank.json ────────────────────────────────────────────────
router.post("/bot/sync-bank", async (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== BOT_API_KEY) return res.status(401).json({ error: "Unauthorized" });

  const body = req.body as Record<string, any>;
  if (!body || typeof body !== "object") return res.status(400).json({ error: "body must be a JSON object" });

  let synced = 0;
  for (const [uid, data] of Object.entries(body)) {
    if (uid === "_wages") continue;
    if (typeof data !== "object" || data === null) continue;
    const balance = typeof data.balance === "number" ? data.balance : 0;
    const lastSalary = data.last_salary ? new Date(data.last_salary) : null;

    const existing = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.discordUserId, uid));
    if (existing.length > 0) {
      await db.update(bankAccountsTable).set({ balance, lastSalary, syncedAt: new Date() }).where(eq(bankAccountsTable.discordUserId, uid));
    } else {
      await db.insert(bankAccountsTable).values({ discordUserId: uid, balance, lastSalary, syncedAt: new Date() });
    }
    synced++;
  }
  return res.json({ success: true, synced });
});

// ── Bot single-user sync ────────────────────────────────────────────────────
router.post("/bot/sync-balance", async (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== BOT_API_KEY) return res.status(401).json({ error: "Unauthorized" });

  const { userId, balance, lastSalary } = req.body as { userId: string; balance: number; lastSalary?: string | null };
  if (!userId || typeof balance !== "number") return res.status(400).json({ error: "userId and balance required" });

  const lastSalaryDate = lastSalary ? new Date(lastSalary) : null;
  const existing = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.discordUserId, userId));
  if (existing.length > 0) {
    await db.update(bankAccountsTable).set({ balance, lastSalary: lastSalaryDate, syncedAt: new Date() }).where(eq(bankAccountsTable.discordUserId, userId));
  } else {
    await db.insert(bankAccountsTable).values({ discordUserId: userId, balance, lastSalary: lastSalaryDate, syncedAt: new Date() });
  }
  return res.json({ success: true, userId, balance });
});

// ── GET /api/bank/suggestions (autocomplete, min 3 chars) ──────────────────
router.get("/bank/suggestions", requireAuth, async (req, res) => {
  const query = ((req.query.q as string) || "").trim();
  if (query.length < 3) return res.json({ suggestions: [] });

  const results = await db
    .select()
    .from(charactersTable)
    .where(
      or(
        ilike(charactersTable.charName, `%${query}%`),
        ilike(charactersTable.discordUsername, `%${query}%`),
        ilike(charactersTable.robloxUsername, `%${query}%`)
      )
    )
    .limit(10);

  const bankFile = readBankFile();
  const adjustments = await getAllAdjustments();

  const suggestions = await Promise.all(
    results
      .filter(c => c.status === "approved" && c.userId)
      .map(async c => {
        const uid = c.userId!;
        const balance = await effectiveBalanceFor(uid, bankFile, adjustments);
        const hasAccount = !!bankFile[uid] || (await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.discordUserId, uid))).length > 0;
        return {
          character_id: c.characterId,
          char_name: c.charName,
          roblox_username: c.robloxUsername,
          discord_username: c.discordUsername,
          user_id: uid,
          balance: hasAccount ? balance : null,
        };
      })
  );

  return res.json({ suggestions: suggestions.filter(s => s.balance !== null) });
});

// ── GET /api/bank/search ────────────────────────────────────────────────────
router.get("/bank/search", requireAuth, async (req, res) => {
  const query = ((req.query.q as string) || "").trim();
  if (!query) return res.json({ results: [] });

  const chars = await db
    .select()
    .from(charactersTable)
    .where(
      or(
        ilike(charactersTable.charName, `%${query}%`),
        ilike(charactersTable.characterId, `%${query}%`),
        ilike(charactersTable.robloxUsername, `%${query}%`),
        ilike(charactersTable.discordUsername, `%${query}%`)
      )
    )
    .limit(20);

  const bankFile = readBankFile();
  const adjustments = await getAllAdjustments();

  const charResults = [];
  for (const c of chars) {
    if (!c.userId) continue;
    const uid = c.userId;

    const inFile = !!bankFile[uid];
    const inDb = !inFile && (await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.discordUserId, uid))).length > 0;
    if (!inFile && !inDb) continue;

    const balance = await effectiveBalanceFor(uid, bankFile, adjustments);
    charResults.push({
      discord_user_id: uid,
      discord_username: c.discordUsername ?? null,
      balance,
      last_salary: bankFile[uid]?.last_salary ?? null,
      char_name: c.charName,
      character_id: c.characterId,
      roblox_username: c.robloxUsername,
    });
  }

  const seen = new Set<string>();
  const results = charResults.filter(r => {
    if (seen.has(r.discord_user_id)) return false;
    seen.add(r.discord_user_id);
    return true;
  });

  return res.json({ results });
});

// ── GET /api/bank/account/:userId ───────────────────────────────────────────
router.get("/bank/account/:userId", requireAuth, async (req, res) => {
  const uid = req.params.userId;
  const bankFile = readBankFile();
  const adj = await getAdjustmentSum(uid);

  if (bankFile[uid]) {
    const base = Math.max(0, Number(bankFile[uid].balance ?? 0));
    return res.json({
      discord_user_id: uid,
      balance: Math.max(0, base + adj),
      last_salary: bankFile[uid].last_salary ?? null,
      source: "file",
    });
  }

  const accs = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.discordUserId, uid));
  if (accs.length === 0) return res.status(404).json({ error: "حساب غير موجود" });

  const acc = accs[0];
  return res.json({
    discord_user_id: acc.discordUserId,
    balance: Math.max(0, acc.balance + adj),
    last_salary: acc.lastSalary,
    source: "db",
  });
});

export default router;
