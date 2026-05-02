import { Router } from "express";
import { db } from "@workspace/db";
import { menuCategoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db
    .select()
    .from(menuCategoriesTable)
    .orderBy(menuCategoriesTable.sortOrder, menuCategoriesTable.name);
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { name, emoji, sortOrder } = req.body as { name: string; emoji?: string; sortOrder?: number };
  if (!name?.trim()) return res.status(400).json({ error: "name required" });
  const [row] = await db
    .insert(menuCategoriesTable)
    .values({ name: name.trim(), emoji: emoji || "🍽️", sortOrder: sortOrder ?? 0 })
    .onConflictDoUpdate({
      target: menuCategoriesTable.name,
      set: { emoji: emoji || "🍽️", sortOrder: sortOrder ?? 0 },
    })
    .returning();
  return res.status(201).json(row);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, emoji, sortOrder } = req.body as { name?: string; emoji?: string; sortOrder?: number };
  const [row] = await db
    .update(menuCategoriesTable)
    .set({
      ...(name && { name: name.trim() }),
      ...(emoji && { emoji }),
      ...(sortOrder !== undefined && { sortOrder }),
    })
    .where(eq(menuCategoriesTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "not found" });
  return res.json(row);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(menuCategoriesTable).where(eq(menuCategoriesTable.id, id));
  res.status(204).send();
});

export default router;
