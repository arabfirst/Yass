import { pgTable, bigint, serial, text, timestamp } from "drizzle-orm/pg-core";

export const policeBudgetTable = pgTable("police_budget", {
  id: serial("id").primaryKey(),
  balance: bigint("balance", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const budgetTransactionsTable = pgTable("budget_transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  discordUserId: text("discord_user_id"),
  soldierName: text("soldier_name").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seizureLogsTable = pgTable("seizure_logs", {
  id: serial("id").primaryKey(),
  targetDiscordUserId: text("target_discord_user_id").notNull(),
  targetName: text("target_name").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  officerName: text("officer_name").notNull(),
  officerDiscordUserId: text("officer_discord_user_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
