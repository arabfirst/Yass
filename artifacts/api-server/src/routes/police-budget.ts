import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import fs from "fs";
import path from "path";
import {
  db, policeBudgetTable, budgetTransactionsTable,
  bankAccountsTable, soldiersTable, charactersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const LIEUTENANT_RANK_INDEX = 7;
const RANK_ORDER = [
  "Cadet", "Officer 1", "Officer 2", "Officer 3",
  "Sergeant 1", "Sergeant 2", "Sergeant 3",
  "Lieutenant", "First Lieutenant", "Captain", "Major",
  "Lieutenant Colonel", "Colonel", "Brigadier General",
  "Major General", "Lieutenant General", "General",
  "Deputy Commander", "High Commander", "Chief of Marshal", "Police Chief",
  "Minister of Interior",
];

function rankIndex(rank: string): number {
  const i = RANK_ORDER.indexOf(rank);
  return i === -1 ? -1 : i;
}

// ── Notify bot of balance change ─────────────────────────────────────────────
async function notifyBot(discordUserId: string, newBalance: number): Promise<void> {
  const botUrl = process.env.BOT_WEBHOOK_URL;
  const apiKey = process.env.AFPD_BOT_API_KEY ?? "AFPD-BOT-SYNC-KEY-2025";
  if (!botUrl) return;
  try {
    await fetch(`${botUrl}/afpd/update-balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-AFPD-API-Key": apiKey },
      body: JSON.stringify({ discordUserId, newBalance }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* non-blocking — don't fail the request if bot is unreachable */ }
}

// ── Bank file helpers (keep in sync with bot's bank.json) ───────────────────
function getBankFilePath(): string | null {
  const candidates = [
    "/home/runner/workspace/bank.json",
    path.resolve(process.cwd(), "../../bank.json"),
    path.resolve(process.cwd(), "bank.json"),
  ];
  return candidates.find(p => fs.existsSync(p)) ?? null;
}

async function getBalance(discordUserId: string): Promise<number> {
  const filePath = getBankFilePath();
  if (filePath) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (data[discordUserId] !== undefined) {
        return Math.max(0, Number(data[discordUserId]?.balance ?? 0));
      }
    } catch { /* fallthrough */ }
  }
  const accs = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.discordUserId, discordUserId));
  return accs.length > 0 ? Math.max(0, accs[0].balance) : 0;
}

async function setBalance(discordUserId: string, newBalance: number): Promise<void> {
  const safe = Math.max(0, newBalance);

  // 1) Update bank.json (what the bot reads)
  const filePath = getBankFilePath();
  if (filePath) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (data[discordUserId] !== undefined) {
        data[discordUserId].balance = safe;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      }
    } catch { /* ignore file errors */ }
  }

  // 2) Update bank_accounts table (what the website reads)
  const existing = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.discordUserId, discordUserId));
  if (existing.length > 0) {
    await db.update(bankAccountsTable)
      .set({ balance: safe, syncedAt: new Date() })
      .where(eq(bankAccountsTable.discordUserId, discordUserId));
  } else {
    await db.insert(bankAccountsTable).values({ discordUserId, balance: safe, syncedAt: new Date() });
  }
}

async function ensureBudgetRow() {
  const rows = await db.select().from(policeBudgetTable);
  if (rows.length === 0) {
    await db.insert(policeBudgetTable).values({ balance: 0, updatedAt: new Date() });
  }
}

/** Resolve the soldier's Discord user ID via their Roblox username → characters table */
async function resolveDiscordUserId(soldier: {
  robloxUsername: string | null;
  discordUsername: string | null;
}): Promise<string | null> {
  // 1) Via roblox username → characters table → user_id
  if (soldier.robloxUsername) {
    const chars = await db
      .select()
      .from(charactersTable)
      .where(eq(charactersTable.robloxUsername, soldier.robloxUsername))
      .limit(1);
    if (chars.length > 0 && chars[0].userId) return chars[0].userId;
  }

  // 2) Via discord username → characters table → user_id
  if (soldier.discordUsername) {
    const chars = await db
      .select()
      .from(charactersTable)
      .where(eq(charactersTable.discordUsername, soldier.discordUsername))
      .limit(1);
    if (chars.length > 0 && chars[0].userId) return chars[0].userId;
  }

  // 3) Try to find directly in bank.json by discord username
  if (soldier.discordUsername) {
    const filePath = getBankFilePath();
    if (filePath) {
      try {
        const bankData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        for (const [uid, data] of Object.entries(bankData)) {
          if (uid === "_wages") continue;
          if ((data as any).username === soldier.discordUsername) return uid;
        }
      } catch { /* ignore */ }
    }
  }

  return null;
}

// ── GET /api/police-budget ──────────────────────────────────────────────────
router.get("/police-budget", requireAuth, async (req, res) => {
  const role = req.session.role;
  const soldierId = req.session.soldierId;

  if (role !== "admin") {
    if (!soldierId) return res.status(403).json({ error: "غير مصرح" });
    const soldiers = await db.select().from(soldiersTable).where(eq(soldiersTable.id, soldierId));
    if (!soldiers.length) return res.status(403).json({ error: "غير مصرح" });
    const rIdx = rankIndex(soldiers[0].rank);
    if (rIdx < LIEUTENANT_RANK_INDEX) {
      return res.status(403).json({ error: "يتطلب رتبة ملازم أو أعلى" });
    }
  }

  await ensureBudgetRow();
  const budgetRows = await db.select().from(policeBudgetTable);
  const budget = budgetRows[0];

  const transactions = await db
    .select()
    .from(budgetTransactionsTable)
    .orderBy(desc(budgetTransactionsTable.createdAt))
    .limit(100);

  return res.json({ balance: budget.balance, transactions });
});

// ── POST /api/police-budget/deposit (soldier → police budget) ───────────────
router.post("/police-budget/deposit", requireAuth, async (req, res) => {
  const role = req.session.role;
  const soldierId = req.session.soldierId;

  if (role === "admin") {
    return res.status(403).json({ error: "المدير يمكنه المشاهدة فقط" });
  }
  if (!soldierId) return res.status(403).json({ error: "غير مصرح" });

  const soldiers = await db.select().from(soldiersTable).where(eq(soldiersTable.id, soldierId));
  if (!soldiers.length) return res.status(403).json({ error: "غير مصرح" });
  const soldier = soldiers[0];

  if (rankIndex(soldier.rank) < LIEUTENANT_RANK_INDEX) {
    return res.status(403).json({ error: "يتطلب رتبة ملازم أو أعلى" });
  }

  const { amount, note } = req.body as { amount: number; note?: string };
  if (!amount || amount <= 0 || !Number.isInteger(amount)) {
    return res.status(400).json({ error: "المبلغ غير صحيح" });
  }

  // Resolve bank account
  const discordUserId = await resolveDiscordUserId(soldier);
  if (!discordUserId) {
    return res.status(400).json({
      error: "لم يتم ربط حسابك البنكي. تأكد من وجود شخصية مسجلة بنفس يوزر روبلوكس أو ديسكورد الخاص بك",
    });
  }

  // Check soldier has enough balance
  const currentBalance = await getBalance(discordUserId);
  if (currentBalance < amount) {
    return res.status(400).json({
      error: `رصيدك غير كافٍ — رصيدك الحالي: $${currentBalance.toLocaleString()}`,
    });
  }

  // 1) Deduct from soldier's bank (updates bank.json + DB)
  const newSoldierBalance = currentBalance - amount;
  await setBalance(discordUserId, newSoldierBalance);
  await notifyBot(discordUserId, newSoldierBalance);

  // 2) Add to police budget
  await ensureBudgetRow();
  const budgetRows = await db.select().from(policeBudgetTable);
  const newBudget = budgetRows[0].balance + amount;
  await db.update(policeBudgetTable).set({ balance: newBudget, updatedAt: new Date() });

  // 3) Log transaction
  await db.insert(budgetTransactionsTable).values({
    type: "deposit",
    amount,
    discordUserId,
    soldierName: `${soldier.rank} / ${soldier.name}`,
    note: note || null,
  });

  return res.json({
    success: true,
    newBudget,
    newBalance: newSoldierBalance,
    message: `تم إيداع $${amount.toLocaleString()} — رصيدك الجديد: $${newSoldierBalance.toLocaleString()}`,
  });
});

// ── POST /api/police-budget/withdraw (police budget → soldier) ──────────────
router.post("/police-budget/withdraw", requireAuth, async (req, res) => {
  const role = req.session.role;
  const soldierId = req.session.soldierId;

  if (role === "admin") {
    return res.status(403).json({ error: "المدير يمكنه المشاهدة فقط" });
  }
  if (!soldierId) return res.status(403).json({ error: "غير مصرح" });

  const soldiers = await db.select().from(soldiersTable).where(eq(soldiersTable.id, soldierId));
  if (!soldiers.length) return res.status(403).json({ error: "غير مصرح" });
  const soldier = soldiers[0];

  if (rankIndex(soldier.rank) < LIEUTENANT_RANK_INDEX) {
    return res.status(403).json({ error: "يتطلب رتبة ملازم أو أعلى" });
  }

  const { amount, note } = req.body as { amount: number; note?: string };
  if (!amount || amount <= 0 || !Number.isInteger(amount)) {
    return res.status(400).json({ error: "المبلغ غير صحيح" });
  }

  // Check police budget has enough
  await ensureBudgetRow();
  const budgetRows = await db.select().from(policeBudgetTable);
  const currentBudget = budgetRows[0].balance;
  if (currentBudget < amount) {
    return res.status(400).json({
      error: `ميزانية الشرطة غير كافية — الرصيد الحالي: $${currentBudget.toLocaleString()}`,
    });
  }

  // Resolve bank account
  const discordUserId = await resolveDiscordUserId(soldier);
  if (!discordUserId) {
    return res.status(400).json({
      error: "لم يتم ربط حسابك البنكي. تأكد من وجود شخصية مسجلة بنفس يوزر روبلوكس أو ديسكورد الخاص بك",
    });
  }

  // 1) Deduct from police budget
  const newBudget = currentBudget - amount;
  await db.update(policeBudgetTable).set({ balance: newBudget, updatedAt: new Date() });

  // 2) Add to soldier's bank (updates bank.json + DB)
  const currentSoldierBalance = await getBalance(discordUserId);
  const newSoldierBalance = currentSoldierBalance + amount;
  await setBalance(discordUserId, newSoldierBalance);
  await notifyBot(discordUserId, newSoldierBalance);

  // 3) Log transaction
  await db.insert(budgetTransactionsTable).values({
    type: "withdraw",
    amount,
    discordUserId,
    soldierName: `${soldier.rank} / ${soldier.name}`,
    note: note || null,
  });

  return res.json({
    success: true,
    newBudget,
    newBalance: newSoldierBalance,
    message: `تم السحب — رصيدك الجديد: $${newSoldierBalance.toLocaleString()}`,
  });
});

export default router;
