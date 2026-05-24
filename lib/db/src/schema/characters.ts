import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const charactersTable = pgTable("characters", {
  id: serial("id").primaryKey(),
  characterId: text("character_id").notNull().unique(),
  userId: text("user_id"),
  charName: text("char_name").notNull(),
  charAge: text("char_age"),
  charNationality: text("char_nationality"),
  charGender: text("char_gender"),
  charAddress: text("char_address"),
  robloxUsername: text("roblox_username"),
  discordUsername: text("discord_username"),
  headshotUrl: text("headshot_url"),
  fullBodyUrl: text("full_body_url"),
  status: text("status").notNull().default("approved"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCharacterSchema = createInsertSchema(charactersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof charactersTable.$inferSelect;
