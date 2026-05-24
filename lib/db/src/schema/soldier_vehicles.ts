import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const soldierVehiclesTable = pgTable("soldier_vehicles", {
  id: serial("id").primaryKey(),
  soldierId: integer("soldier_id").notNull(),
  soldierName: text("soldier_name").notNull(),
  robloxUsername: text("roblox_username"),
  vehicleKey: text("vehicle_key").notNull(),
  vehicleName: text("vehicle_name").notNull(),
  vehicleImage: text("vehicle_image"),
  pricePaid: integer("price_paid").notNull(),
  assignedBy: text("assigned_by").notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SoldierVehicle = typeof soldierVehiclesTable.$inferSelect;
