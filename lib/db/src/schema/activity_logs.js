import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const activityLogsTable = pgTable("activity_logs", {
    id: serial("id").primaryKey(),
    action: text("action").notNull(),
    performedBy: text("performed_by").notNull(),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({ id: true, createdAt: true });
