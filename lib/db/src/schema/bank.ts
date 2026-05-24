import { pgTable, text, bigint, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bankAccountsTable = pgTable("bank_accounts", {
  discordUserId: text("discord_user_id").primaryKey(),
  balance: bigint("balance", { mode: "number" }).notNull().default(0),
  lastSalary: timestamp("last_salary", { withTimezone: true }),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bankAdjustmentsTable = pgTable("bank_adjustments", {
  id: serial("id").primaryKey(),
  discordUserId: text("discord_user_id").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  reason: text("reason").notNull(),
  officerName: text("officer_name"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBankAccountSchema = createInsertSchema(bankAccountsTable);
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccountsTable.$inferSelect;
