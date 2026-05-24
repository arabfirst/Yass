import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import fs from "fs";
import path from "path";
import {
  db, seizureLogsTable, bankAccountsTable,
  policeBudgetTable, soldiersTable, charactersTable,
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

function rankIndex(rank: string) {
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

async function checkOfficerAccess(req: any): Promise<{ ok: boolean; error?: string; soldierName?: string; discordUserId?: string }> {
  const role = req.session.role;
  if (role === "admin") {
    return { ok: true, soldierName: "القيادة", discordUserId: undefined };
  }
  const soldierId = req.session.soldierId;
  if (!soldierId) return { ok: false, error: "غير مصرح" };
  const soldiers = await db.select().from(soldiersTable).where(eq(soldiersTable.id, soldierId));
  if (!soldiers.length) return { ok: false, error: "غير مصرح" };
  const soldier = soldiers[0];
  if (rankIndex(soldier.rank) < LIEUTENANT_RANK_INDEX) {
    return { ok: false, error: "يتطلب رتبة ملازم أو أعلى" };
  }

  let discordUserId: string | undefined;
  if (soldier.robloxUsername) {
    const chars = await db.select().from(charactersTable).where(eq(charactersTable.robloxUsername, soldier.robloxUsername));
    if (chars.length > 0) discordUserId = chars[0].userId ?? undefined;
  }
  return { ok: true, soldierName: `${soldier.rank} / ${soldier.name}`, discordUserId };
}

// ── Get seizure logs ─────────────────────────────────────────────────────────
router.get("/seizure/logs", requireAuth, async (req, res) => {
  const check = await checkOfficerAccess(req);
  if (!check.ok) return res.status(403).json({ error: check.error });

  const logs = await db
    .select()
    .from(seizureLogsTable)
    .orderBy(desc(seizureLogsTable.createdAt))
    .limit(100);

  return res.json({ logs });
});

// ── Seize money from an account ──────────────────────────────────────────────
router.post("/seizure/seize", requireAuth, async (req, res) => {
  const check = await checkOfficerAccess(req);
  if (!check.ok) return res.status(403).json({ error: check.error });

  const { targetDiscordUserId, targetName, amount, note } = req.body as {
    targetDiscordUserId: string;
    targetName: string;
    amount: number;
    note?: string;
  };

  if (!targetDiscordUserId || !targetName) {
    return res.status(400).json({ error: "بيانات الهدف مطلوبة" });
  }
  if (!amount || amount <= 0 || !Number.isInteger(amount)) {
    return res.status(400).json({ error: "المبلغ غير صحيح" });
  }

  const currentBalance = await getBalance(targetDiscordUserId);
  if (currentBalance < amount) {
    return res.status(400).json({
      error: `رصيد الشخص غير كافٍ. رصيده الحالي: $${currentBalance.toLocaleString()}`,
    });
  }

  // Deduct from target's bank (updates both bank.json and DB)
  const newTargetBalance = currentBalance - amount;
  await setBalance(targetDiscordUserId, newTargetBalance);
  await notifyBot(targetDiscordUserId, newTargetBalance);

  // Add to police budget
  await ensureBudgetRow();
  const budgetRows = await db.select().from(policeBudgetTable);
  const newBudget = budgetRows[0].balance + amount;
  await db.update(policeBudgetTable).set({ balance: newBudget, updatedAt: new Date() });

  // Log seizure
  await db.insert(seizureLogsTable).values({
    targetDiscordUserId,
    targetName,
    amount,
    officerName: check.soldierName ?? "القيادة",
    officerDiscordUserId: check.discordUserId ?? null,
    note: note || null,
  });

  return res.json({
    success: true,
    newBalance: newTargetBalance,
    newBudget,
  });
});

export default router;
