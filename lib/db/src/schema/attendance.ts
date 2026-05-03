import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workersTable } from "./workers";

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id")
    .notNull()
    .references(() => workersTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "date" }).notNull(),
  units: numeric("units", { precision: 4, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
