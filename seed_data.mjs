import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // --- SOLDIERS ---
    const soldiers = JSON.parse(fs.readFileSync('/home/runner/workspace/attached_assets/soldiers_1778882565297.json', 'utf8'));
    console.log(`Inserting ${soldiers.length} soldiers...`);
    for (const s of soldiers) {
      await client.query(`
        INSERT INTO soldiers (name, age, unit, rank, username, password, roblox_username, points, busy_status, busy_start_time, total_busy_minutes, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (username) DO UPDATE SET
          name=EXCLUDED.name, age=EXCLUDED.age, unit=EXCLUDED.unit, rank=EXCLUDED.rank,
          password=EXCLUDED.password, roblox_username=EXCLUDED.roblox_username,
          points=EXCLUDED.points, busy_status=EXCLUDED.busy_status,
          busy_start_time=EXCLUDED.busy_start_time, total_busy_minutes=EXCLUDED.total_busy_minutes
      `, [
        s.name?.trim(), s.age, s.unit?.trim(), s.rank, s.username?.trim(),
        s.password, s.roblox_username, s.points ?? 0,
        s.busy_status ?? null, s.busy_start_time ?? null, s.total_busy_minutes ?? 0,
        s.created_at
      ]);
    }
    console.log('✓ Soldiers done');

    // --- CHARACTERS ---
    const chars = JSON.parse(fs.readFileSync('/home/runner/workspace/attached_assets/characters_(7)_1778882575867.json', 'utf8'));
    const charList = Object.values(chars);
    console.log(`Inserting ${charList.length} characters...`);
    for (const c of charList) {
      await client.query(`
        INSERT INTO characters (character_id, user_id, char_name, char_age, char_nationality, char_gender, char_address, roblox_username, headshot_url, full_body_url, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (character_id) DO UPDATE SET
          char_name=EXCLUDED.char_name, char_age=EXCLUDED.char_age,
          char_nationality=EXCLUDED.char_nationality, char_gender=EXCLUDED.char_gender,
          char_address=EXCLUDED.char_address, roblox_username=EXCLUDED.roblox_username,
          headshot_url=EXCLUDED.headshot_url, full_body_url=EXCLUDED.full_body_url,
          status=EXCLUDED.status, updated_at=NOW()
      `, [
        c.character_id, c.user_id, c.char_name, c.char_age,
        c.char_nationality, c.char_gender, c.char_address ?? null,
        c.roblox_username, c.headshot_url, c.full_body_url, c.status
      ]);
    }
    console.log('✓ Characters done');

    // --- BANK ACCOUNTS ---
    const bankRaw = JSON.parse(fs.readFileSync('/home/runner/workspace/attached_assets/bank_(4)_1778882575968.json', 'utf8'));
    const bankEntries = Object.entries(bankRaw).filter(([k]) => k !== '_wages');
    console.log(`Inserting ${bankEntries.length} bank accounts...`);
    for (const [userId, val] of bankEntries) {
      const v = val;
      await client.query(`
        INSERT INTO bank_accounts (discord_user_id, balance, last_salary, synced_at)
        VALUES ($1,$2,$3,NOW())
        ON CONFLICT (discord_user_id) DO UPDATE SET
          balance=EXCLUDED.balance, last_salary=EXCLUDED.last_salary, synced_at=NOW()
      `, [userId, v.balance ?? 0, v.last_salary ?? null]);
    }
    console.log('✓ Bank accounts done');

    // Summary
    const r1 = await client.query('SELECT COUNT(*) FROM soldiers');
    const r2 = await client.query('SELECT COUNT(*) FROM characters');
    const r3 = await client.query('SELECT COUNT(*) FROM bank_accounts');
    console.log(`\n📊 Database summary:`);
    console.log(`   Soldiers: ${r1.rows[0].count}`);
    console.log(`   Characters: ${r2.rows[0].count}`);
    console.log(`   Bank accounts: ${r3.rows[0].count}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
