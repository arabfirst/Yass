import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const data = JSON.parse(readFileSync("attached_assets/characters_(5)_1778662948869.json", "utf8"));
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let inserted = 0, updated = 0;
for (const [key, c] of Object.entries(data)) {
  const cid = String(c.character_id || key);
  await client.query(
    `INSERT INTO characters
      (character_id, user_id, char_name, char_age, char_nationality, char_gender,
       roblox_username, headshot_url, full_body_url, char_address, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (character_id) DO UPDATE SET
       user_id=EXCLUDED.user_id, char_name=EXCLUDED.char_name,
       char_age=EXCLUDED.char_age, char_nationality=EXCLUDED.char_nationality,
       char_gender=EXCLUDED.char_gender, roblox_username=EXCLUDED.roblox_username,
       headshot_url=EXCLUDED.headshot_url, full_body_url=EXCLUDED.full_body_url,
       char_address=EXCLUDED.char_address, status=EXCLUDED.status, updated_at=NOW()`,
    [
      cid,
      c.user_id || null,
      c.char_name,
      c.char_age || null,
      c.char_nationality || null,
      c.char_gender || null,
      c.roblox_username || null,
      c.headshot_url || null,
      c.full_body_url || null,
      c.char_address || null,
      c.status || "approved",
    ]
  );
  inserted++;
}

await client.end();
console.log(`Done: ${inserted} characters upserted`);
