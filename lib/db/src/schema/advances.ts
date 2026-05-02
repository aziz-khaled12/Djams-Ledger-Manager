import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workersTable } from "./workers";

export const advancesTable = pgTable("advances", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull().references(() => workersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdvanceSchema = createInsertSchema(advancesTable).omit({ id: true, createdAt: true });
export type InsertAdvance = z.infer<typeof insertAdvanceSchema>;
export type Advance = typeof advancesTable.$inferSelect;
