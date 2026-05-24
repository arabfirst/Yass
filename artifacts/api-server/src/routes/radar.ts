import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, soldiersTable, attendanceTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const ERLC_API_KEY = process.env.ERLC_API_KEY ?? "";
const ERLC_BASE_URL = process.env.ERLC_BASE_URL ?? "https://api.erlc.gg/v2";

const POLICE_TEAMS = [
  "police",
];

function isPoliceTeam(team: string): boolean {
  const t = team.toLowerCase().trim();
  return POLICE_TEAMS.some(pt => t === pt || t.includes(pt));
}

async function getCheckedInSoldierIds(): Promise<Set<number>> {
  const soldiers = await db.select().from(soldiersTable);
  const checkedIn = new Set<number>();
  for (const s of soldiers) {
    const [record] = await db
      .select()
      .from(attendanceTable)
      .where(eq(attendanceTable.soldierId, s.id))
      .orderBy(desc(attendanceTable.createdAt))
      .limit(1);
    if (record && record.checkInTime !== null && record.checkOutTime === null) {
      checkedIn.add(s.id);
    }
  }
  return checkedIn;
}

router.get("/radar/locations", requireAuth, async (_req, res): Promise<void> => {
  try {
    // Use v2 API with Players included
    const erlcRes = await fetch(`${ERLC_BASE_URL}/server?Players=true`, {
      headers: { "Server-Key": ERLC_API_KEY },
    });

    if (!erlcRes.ok) {
      const text = await erlcRes.text().catch(() => "");
      res.status(502).json({ error: `فشل الاتصال بخادم ERLC (${erlcRes.status}): ${text}` });
      return;
    }

    const serverData = await erlcRes.json() as {
      CurrentPlayers: number;
      Players?: Array<{
        Player: string;        // format: "username:userId"
        Team: string;
        Permission?: string;
        Callsign?: string;
        WantedStars?: number;
        Location?: {
          LocationX: number;
          LocationZ: number;
          PostalCode?: string;
          StreetName?: string;
          BuildingNumber?: string;
        };
      }>;
    };

    const erlcPlayers = serverData.Players ?? [];
    const totalPlayers = serverData.CurrentPlayers ?? erlcPlayers.length;

    // Build roblox username → soldier map
    const soldiers = await db.select().from(soldiersTable);
    const checkedInIds = await getCheckedInSoldierIds();

    const robloxToSoldier = new Map<string, typeof soldiers[number]>();
    for (const s of soldiers) {
      if (s.robloxUsername) {
        robloxToSoldier.set(s.robloxUsername.toLowerCase().trim(), s);
      }
    }

    const result: {
      soldierId: number;
      name: string;
      rank: string;
      unit: string;
      robloxUsername: string;
      x: number;
      z: number;
      postalCode: string;
      streetName: string;
      team: string;
      callsign: string;
    }[] = [];

    for (const player of erlcPlayers) {
      // Player field: "username:userId" — extract username part
      const robloxName = player.Player.split(":")[0].toLowerCase().trim();
      const team = player.Team ?? "";

      if (!isPoliceTeam(team)) continue;

      const soldier = robloxToSoldier.get(robloxName);
      if (!soldier) continue;

      if (!checkedInIds.has(soldier.id)) continue;

      const loc = player.Location;

      result.push({
        soldierId: soldier.id,
        name: soldier.name,
        rank: soldier.rank,
        unit: soldier.unit,
        robloxUsername: player.Player.split(":")[0],
        x: loc?.LocationX ?? 0,
        z: loc?.LocationZ ?? 0,
        postalCode: loc?.PostalCode ?? "",
        streetName: loc?.StreetName ?? "",
        team,
        callsign: player.Callsign ?? "",
      });
    }

    res.json({ players: result, total: totalPlayers });
  } catch (err) {
    console.error("[radar] error:", err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

// Debug: show all players in server with team detection info
router.get("/radar/status", requireAuth, async (_req, res): Promise<void> => {
  try {
    const erlcRes = await fetch(`${ERLC_BASE_URL}/server?Players=true`, {
      headers: { "Server-Key": ERLC_API_KEY },
    });
    if (!erlcRes.ok) {
      res.status(502).json({ error: "فشل الاتصال بخادم ERLC" });
      return;
    }
    const data = await erlcRes.json() as {
      CurrentPlayers: number;
      Players?: Array<{ Player: string; Team: string; Location?: unknown }>;
    };

    const soldiers = await db.select().from(soldiersTable);
    const checkedInIds = await getCheckedInSoldierIds();
    const robloxToSoldier = new Map<string, typeof soldiers[number]>();
    for (const s of soldiers) {
      if (s.robloxUsername) {
        robloxToSoldier.set(s.robloxUsername.toLowerCase().trim(), s);
      }
    }

    const playerAnalysis = (data.Players ?? []).map(p => {
      const robloxName = p.Player.split(":")[0].toLowerCase().trim();
      const team = p.Team ?? "";
      const isPolice = isPoliceTeam(team);
      const soldier = robloxToSoldier.get(robloxName);
      const isCheckedIn = soldier ? checkedInIds.has(soldier.id) : false;
      return {
        player: p.Player,
        team,
        isPoliceTeam: isPolice,
        foundInDB: !!soldier,
        isCheckedIn,
        willShowOnRadar: isPolice && !!soldier && isCheckedIn,
      };
    });

    res.json({
      currentPlayers: data.CurrentPlayers,
      totalInDB: soldiers.length,
      checkedIn: checkedInIds.size,
      playerAnalysis,
    });
  } catch (err) {
    console.error("[radar/status]", err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

export default router;
