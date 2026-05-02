import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const expenseCategoriesTable = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#f59e0b"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExpenseCategory = typeof expenseCategoriesTable.$inferSelect;
