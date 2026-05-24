import { pgTable, serial, integer, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { soldiersTable } from "./soldiers";
export const attendanceTable = pgTable("attendance", {
    id: serial("id").primaryKey(),
    soldierId: integer("soldier_id").notNull().references(() => soldiersTable.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    checkInTime: timestamp("check_in_time", { withTimezone: true }),
    checkOutTime: timestamp("check_out_time", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, createdAt: true });
