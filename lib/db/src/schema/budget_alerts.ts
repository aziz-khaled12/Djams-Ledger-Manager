import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { expenseCategoriesTable } from "./expense_categories";

export const budgetAlertsTable = pgTable("budget_alerts", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => expenseCategoriesTable.id).notNull().unique(),
  monthlyLimit: numeric("monthly_limit", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BudgetAlert = typeof budgetAlertsTable.$inferSelect;
