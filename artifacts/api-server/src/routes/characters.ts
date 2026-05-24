import { Router } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, charactersTable } from "@workspace/db";

const router = Router();

const BOT_API_KEY = process.env.AFPD_BOT_API_KEY ?? process.env.BOT_API_KEY ?? "AFPD-BOT-SYNC-KEY-2025";

// ── Public search ─────────────────────────────────────────────────────────────
router.get("/characters/search", async (req, res) => {
  const query = ((req.query.q as string) || "").trim();
  if (!query) return res.json({ results: [] });

  const results = await db
    .select()
    .from(charactersTable)
    .where(
      or(
        ilike(charactersTable.charName, `%${query}%`),
        ilike(charactersTable.characterId, `%${query}%`)
      )
    );

  const approved = results
    .filter((c) => c.status === "approved")
    .map((c) => ({
      character_id: c.characterId,
      char_name: c.charName,
      char_age: c.charAge,
      char_nationality: c.charNationality,
      char_gender: c.charGender,
      char_address: c.charAddress || "غير محدد",
      roblox_username: c.robloxUsername,
      discord_username: c.discordUsername ?? null,
      headshot_url: c.headshotUrl,
    }));

  return res.json({ results: approved });
});

// ── Autocomplete suggestions (min 2 chars) ────────────────────────────────────
router.get("/characters/suggestions", async (req, res) => {
  const query = ((req.query.q as string) || "").trim();
  if (query.length < 2) return res.json({ suggestions: [] });

  const results = await db
    .select()
    .from(charactersTable)
    .where(
      or(
        ilike(charactersTable.charName, `%${query}%`),
        ilike(charactersTable.characterId, `%${query}%`)
      )
    )
    .limit(8);

  const suggestions = results
    .filter((c) => c.status === "approved")
    .map((c) => ({
      character_id: c.characterId,
      char_name: c.charName,
      roblox_username: c.robloxUsername,
    }));

  return res.json({ suggestions });
});

// ── Bot sync endpoint — called by Discord bot after character approval ────────
// Header: x-api-key: AFPD-BOT-SYNC-KEY-2025
// Body: { character_id, user_id, char_name, char_age, char_nationality,
//         char_gender, roblox_username, headshot_url, full_body_url,
//         char_address?, status }
router.post("/bot/sync-character", async (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== BOT_API_KEY) {
    return res.status(401).json({ error: "Unauthorized — invalid API key" });
  }

  const body = req.body;
  if (!body.character_id || !body.char_name) {
    return res.status(400).json({ error: "character_id and char_name are required" });
  }

  const existing = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.characterId, String(body.character_id)));

  if (existing.length > 0) {
    await db
      .update(charactersTable)
      .set({
        userId: body.user_id ? String(body.user_id) : null,
        charName: body.char_name,
        charAge: body.char_age ? String(body.char_age) : null,
        charNationality: body.char_nationality || null,
        charGender: body.char_gender || null,
        charAddress: body.char_address || null,
        robloxUsername: body.roblox_username || null,
        headshotUrl: body.headshot_url || null,
        fullBodyUrl: body.full_body_url || null,
        status: body.status || "approved",
        updatedAt: new Date(),
      })
      .where(eq(charactersTable.characterId, String(body.character_id)));
  } else {
    await db.insert(charactersTable).values({
      characterId: String(body.character_id),
      userId: body.user_id ? String(body.user_id) : null,
      charName: body.char_name,
      charAge: body.char_age ? String(body.char_age) : null,
      charNationality: body.char_nationality || null,
      charGender: body.char_gender || null,
      charAddress: body.char_address || null,
      robloxUsername: body.roblox_username || null,
      headshotUrl: body.headshot_url || null,
      fullBodyUrl: body.full_body_url || null,
      status: body.status || "approved",
    });
  }

  return res.json({ success: true, character_id: body.character_id });
});

// ── List all approved characters (admin use) ─────────────────────────────────
router.get("/characters", async (req, res) => {
  const chars = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.status, "approved"));

  return res.json({ count: chars.length, characters: chars });
});

export default router;
