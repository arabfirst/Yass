import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db, soldierVehiclesTable, policeBudgetTable, budgetTransactionsTable, soldiersTable,
} from "@workspace/db";
import { requireAuth, requireAdmin, requireLieutenantOrAdmin } from "../middlewares/auth";
import { POLICE_VEHICLES_CATALOG, findVehicleByErlcName } from "../lib/police-vehicles-catalog";

const router = Router();
const BOT_API_KEY = process.env.AFPD_BOT_API_KEY ?? process.env.BOT_API_KEY ?? "AFPD-BOT-SYNC-KEY-2025";

async function ensureBudgetRow() {
  const rows = await db.select().from(policeBudgetTable);
  if (rows.length === 0) {
    await db.insert(policeBudgetTable).values({ balance: 0, updatedAt: new Date() });
  }
}

// ── Get catalog (all authenticated users) ────────────────────────────────────────
router.get("/police-vehicles/catalog", requireAuth, async (_req, res) => {
  return res.json({ vehicles: POLICE_VEHICLES_CATALOG });
});

// ── ERLC vehicle keys (for bot) ──────────────────────────────────────────────────
router.get("/police-vehicles/erlc-keys", async (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== BOT_API_KEY) return res.status(401).json({ error: "Unauthorized" });
  const keys = POLICE_VEHICLES_CATALOG.flatMap(v => v.erlcNames);
  return res.json({ keys });
});

// ── Check if a roblox user has a police vehicle assigned (for bot ERLC check) ───
router.get("/police-vehicles/check", async (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== BOT_API_KEY) return res.status(401).json({ error: "Unauthorized" });

  const roblox = ((req.query.roblox as string) || "").trim();
  const vehicleName = ((req.query.vehicle as string) || "").trim();

  if (!roblox || !vehicleName) {
    return res.status(400).json({ error: "roblox and vehicle params required" });
  }

  const vehicle = findVehicleByErlcName(vehicleName);
  if (!vehicle) {
    return res.json({ assigned: false, reason: "not_police_vehicle" });
  }

  const assignments = await db
    .select()
    .from(soldierVehiclesTable)
    .where(eq(soldierVehiclesTable.robloxUsername, roblox));

  const hasVehicle = assignments.some(a => a.vehicleKey === vehicle.key);
  return res.json({ assigned: hasVehicle, vehicleKey: vehicle.key, roblox });
});

// ── Get my vehicles (soldier) ─────────────────────────────────────────────────────
router.get("/police-vehicles/my", requireAuth, async (req, res) => {
  const soldierId = req.session.soldierId;
  if (!soldierId) return res.json({ vehicles: [] });

  const vehicles = await db
    .select()
    .from(soldierVehiclesTable)
    .where(eq(soldierVehiclesTable.soldierId, soldierId))
    .orderBy(desc(soldierVehiclesTable.assignedAt));

  return res.json({ vehicles });
});

// ── Get all soldier vehicles (lieutenant+) ────────────────────────────────────────
router.get("/police-vehicles/all", requireLieutenantOrAdmin, async (_req, res) => {
  const vehicles = await db
    .select()
    .from(soldierVehiclesTable)
    .orderBy(desc(soldierVehiclesTable.assignedAt));

  return res.json({ vehicles });
});

// ── Assign vehicle to soldier (lieutenant+) ────────────────────────────────────────
router.post("/police-vehicles/assign", requireLieutenantOrAdmin, async (req, res) => {
  const { soldierId, vehicleKey } = req.body as { soldierId: number; vehicleKey: string };

  const vehicle = POLICE_VEHICLES_CATALOG.find(v => v.key === vehicleKey);
  if (!vehicle) return res.status(400).json({ error: "السيارة غير موجودة في الكتالوج" });

  const soldiers = await db.select().from(soldiersTable).where(eq(soldiersTable.id, soldierId));
  if (!soldiers.length) return res.status(404).json({ error: "الفرد غير موجود" });
  const soldier = soldiers[0];

  // Check budget
  await ensureBudgetRow();
  const budgetRows = await db.select().from(policeBudgetTable);
  const currentBudget = budgetRows[0].balance;
  if (currentBudget < vehicle.price) {
    return res.status(400).json({
      error: `ميزانية الشرطة غير كافية. الميزانية الحالية: $${currentBudget.toLocaleString()}، سعر السيارة: $${vehicle.price.toLocaleString()}`,
    });
  }

  // Deduct from budget
  const newBudget = currentBudget - vehicle.price;
  await db.update(policeBudgetTable).set({ balance: newBudget, updatedAt: new Date() });

  // Log transaction
  await db.insert(budgetTransactionsTable).values({
    type: "vehicle_purchase",
    amount: vehicle.price,
    discordUserId: null,
    soldierName: req.session.username ?? "القيادة",
    note: `شراء ${vehicle.nameAr} وتسليمها لـ ${soldier.name}`,
  });

  // Assign vehicle
  await db.insert(soldierVehiclesTable).values({
    soldierId: soldier.id,
    soldierName: soldier.name,
    robloxUsername: soldier.robloxUsername ?? null,
    vehicleKey: vehicle.key,
    vehicleName: vehicle.nameAr,
    vehicleImage: vehicle.image,
    pricePaid: vehicle.price,
    assignedBy: req.session.username ?? "القيادة",
    assignedAt: new Date(),
  });

  return res.json({ success: true, newBudget });
});

// ── Revoke vehicle from soldier (lieutenant+) ──────────────────────────────────────
router.delete("/police-vehicles/:id/revoke", requireLieutenantOrAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "معرف غير صحيح" });

  const records = await db
    .select()
    .from(soldierVehiclesTable)
    .where(eq(soldierVehiclesTable.id, id));

  if (!records.length) return res.status(404).json({ error: "السيارة غير موجودة" });
  const record = records[0];

  // Refund price to budget
  await ensureBudgetRow();
  const budgetRows = await db.select().from(policeBudgetTable);
  const newBudget = budgetRows[0].balance + record.pricePaid;
  await db.update(policeBudgetTable).set({ balance: newBudget, updatedAt: new Date() });

  // Log transaction
  await db.insert(budgetTransactionsTable).values({
    type: "vehicle_revoke",
    amount: record.pricePaid,
    discordUserId: null,
    soldierName: req.session.username ?? "القيادة",
    note: `استرداد ${record.vehicleName} من ${record.soldierName}`,
  });

  // Remove assignment
  await db.delete(soldierVehiclesTable).where(eq(soldierVehiclesTable.id, id));

  return res.json({ success: true, refunded: record.pricePaid, newBudget });
});

export default router;
