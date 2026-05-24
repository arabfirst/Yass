#!/usr/bin/env python3
"""استيراد بيانات الجنود والشخصيات من ملفات JSON إلى PostgreSQL"""
import json
import os
import sys
import psycopg2
from psycopg2.extras import execute_values

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@helium/heliumdb?sslmode=disable")

def get_conn():
    return psycopg2.connect(DATABASE_URL)

def import_soldiers(conn, soldiers_file):
    print(f"\n[Soldiers] قراءة {soldiers_file}...")
    with open(soldiers_file, encoding="utf-8") as f:
        soldiers = json.load(f)
    print(f"[Soldiers] وجدت {len(soldiers)} جندي")

    cur = conn.cursor()
    inserted = 0
    updated = 0
    for s in soldiers:
        name        = (s.get("name") or "").strip()
        age         = int(s.get("age") or 0)
        unit        = (s.get("unit") or "").strip()
        rank        = (s.get("rank") or "Cadet").strip()
        username    = (s.get("username") or "").strip() or None
        password    = (s.get("password") or "").strip() or None
        roblox      = (s.get("roblox_username") or "").strip() or None
        points      = int(s.get("points") or 0)
        busy_status = s.get("busy_status") or None
        busy_start  = s.get("busy_start_time") or None
        total_busy  = int(s.get("total_busy_minutes") or 0)

        # Check if exists by username or name
        cur.execute(
            "SELECT id FROM soldiers WHERE username = %s OR (name = %s AND username IS NULL)",
            (username, name)
        )
        row = cur.fetchone()
        if row:
            cur.execute("""
                UPDATE soldiers SET
                    name = %s, age = %s, unit = %s, rank = %s, username = %s,
                    password = %s, roblox_username = %s, points = %s,
                    busy_status = %s, busy_start_time = %s, total_busy_minutes = %s
                WHERE id = %s
            """, (name, age, unit, rank, username, password, roblox, points,
                  busy_status, busy_start, total_busy, row[0]))
            updated += 1
        else:
            cur.execute("""
                INSERT INTO soldiers
                    (name, age, unit, rank, username, password, roblox_username,
                     points, busy_status, busy_start_time, total_busy_minutes)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (username) DO UPDATE SET
                    name = EXCLUDED.name, age = EXCLUDED.age, unit = EXCLUDED.unit,
                    rank = EXCLUDED.rank, password = EXCLUDED.password,
                    roblox_username = EXCLUDED.roblox_username,
                    points = EXCLUDED.points, busy_status = EXCLUDED.busy_status,
                    busy_start_time = EXCLUDED.busy_start_time,
                    total_busy_minutes = EXCLUDED.total_busy_minutes
            """, (name, age, unit, rank, username, password, roblox, points,
                  busy_status, busy_start, total_busy))
            inserted += 1

    conn.commit()
    cur.close()
    print(f"[Soldiers] ✅ تم الاستيراد — {inserted} جديد، {updated} تحديث")

def import_characters(conn, characters_file):
    print(f"\n[Characters] قراءة {characters_file}...")
    with open(characters_file, encoding="utf-8") as f:
        chars = json.load(f)
    print(f"[Characters] وجدت {len(chars)} شخصية")

    cur = conn.cursor()
    inserted = 0
    updated = 0
    for char_id, c in chars.items():
        character_id  = str(char_id)
        user_id       = str(c.get("user_id") or "")
        char_name     = (c.get("char_name") or "").strip()
        char_age      = str(c.get("char_age") or "")
        char_nat      = (c.get("char_nationality") or "")
        char_gender   = (c.get("char_gender") or "")
        roblox        = (c.get("roblox_username") or "")
        headshot_url  = (c.get("headshot_url") or "")
        full_body_url = (c.get("full_body_url") or "")
        status        = (c.get("status") or "approved")

        if not char_name:
            continue

        cur.execute("SELECT id FROM characters WHERE character_id = %s", (character_id,))
        row = cur.fetchone()
        if row:
            cur.execute("""
                UPDATE characters SET
                    user_id = %s, char_name = %s, char_age = %s, char_nationality = %s,
                    char_gender = %s, roblox_username = %s, headshot_url = %s,
                    full_body_url = %s, status = %s, updated_at = NOW()
                WHERE character_id = %s
            """, (user_id, char_name, char_age, char_nat, char_gender,
                  roblox, headshot_url, full_body_url, status, character_id))
            updated += 1
        else:
            cur.execute("""
                INSERT INTO characters
                    (character_id, user_id, char_name, char_age, char_nationality,
                     char_gender, roblox_username, headshot_url, full_body_url, status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (character_id) DO UPDATE SET
                    user_id = EXCLUDED.user_id, char_name = EXCLUDED.char_name,
                    char_age = EXCLUDED.char_age, char_nationality = EXCLUDED.char_nationality,
                    char_gender = EXCLUDED.char_gender, roblox_username = EXCLUDED.roblox_username,
                    headshot_url = EXCLUDED.headshot_url, full_body_url = EXCLUDED.full_body_url,
                    status = EXCLUDED.status, updated_at = NOW()
            """, (character_id, user_id, char_name, char_age, char_nat,
                  char_gender, roblox, headshot_url, full_body_url, status))
            inserted += 1

    conn.commit()
    cur.close()
    print(f"[Characters] ✅ تم الاستيراد — {inserted} جديد، {updated} تحديث")

if __name__ == "__main__":
    conn = get_conn()
    try:
        soldiers_file   = "attached_assets/soldiers_1778626955754.json"
        characters_file = "attached_assets/characters_(4)_1778626955825.json"

        import_soldiers(conn, soldiers_file)
        import_characters(conn, characters_file)
        print("\n✅ اكتمل الاستيراد بنجاح!")
    except Exception as e:
        print(f"\n❌ خطأ: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()
