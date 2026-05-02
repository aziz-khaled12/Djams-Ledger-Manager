import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const menuCategoriesTable = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  emoji: text("emoji").notNull().default("🍽️"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MenuCategory = typeof menuCategoriesTable.$inferSelect;
