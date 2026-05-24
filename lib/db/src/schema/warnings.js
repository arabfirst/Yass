import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { soldiersTable } from "./soldiers";
export const warningsTable = pgTable("warnings", {
    id: serial("id").primaryKey(),
    soldierId: integer("soldier_id").notNull().references(() => soldiersTable.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    givenBy: text("given_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertWarningSchema = createInsertSchema(warningsTable).omit({ id: true, createdAt: true });
