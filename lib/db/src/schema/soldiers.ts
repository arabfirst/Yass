import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const RANKS = [
  "Cadet",
  "Officer 1",
  "Officer 2",
  "Officer 3",
  "Sergeant 1",
  "Sergeant 2",
  "Sergeant 3",
  "Lieutenant",
  "First Lieutenant",
  "Captain",
  "Major",
  "Lieutenant Colonel",
  "Colonel",
  "Brigadier General",
  "Major General",
  "Lieutenant General",
  "General",
  "Deputy Commander",
  "High Commander",
  "Chief of Marshal",
  "Police Chief",
  "Minister of Interior",
] as const;

export type Rank = (typeof RANKS)[number];

export const soldiersTable = pgTable("soldiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  unit: text("unit").notNull(),
  rank: text("rank").notNull(),
  username: text("username").unique(),
  password: text("password"),
  robloxUsername: text("roblox_username"),
  discordUsername: text("discord_username"),
  points: integer("points").notNull().default(0),
  busyStatus: text("busy_status"),
  busyStartTime: timestamp("busy_start_time", { withTimezone: true }),
  totalBusyMinutes: integer("total_busy_minutes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSoldierSchema = createInsertSchema(soldiersTable).omit({ id: true, createdAt: true });
export type InsertSoldier = z.infer<typeof insertSoldierSchema>;
export type Soldier = typeof soldiersTable.$inferSelect;
