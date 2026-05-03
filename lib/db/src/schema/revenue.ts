import {
  pgTable,
  serial,
  text,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const revenueTable = pgTable("revenue", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "date" }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRevenueSchema = createInsertSchema(revenueTable).omit({
  id: true,
  createdAt: true,
});
export type InsertRevenue = z.infer<typeof insertRevenueSchema>;
export type Revenue = typeof revenueTable.$inferSelect;
