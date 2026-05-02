import { Router } from "express";
import { db } from "@workspace/db";
import { expenseCategoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(expenseCategoriesTable).orderBy(expenseCategoriesTable.name);
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { name, color } = req.body as { name: string; color?: string };
  if (!name?.trim()) return res.status(400).json({ error: "name required" });
  const [row] = await db
    .insert(expenseCategoriesTable)
    .values({ name: name.trim(), color: color || "#f59e0b" })
    .onConflictDoUpdate({ target: expenseCategoriesTable.name, set: { color: color || "#f59e0b" } })
    .returning();
  return res.status(201).json(row);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, color } = req.body as { name?: string; color?: string };
  const [row] = await db
    .update(expenseCategoriesTable)
    .set({ ...(name && { name: name.trim() }), ...(color && { color }) })
    .where(eq(expenseCategoriesTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "not found" });
  return res.json(row);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(expenseCategoriesTable).where(eq(expenseCategoriesTable.id, id));
  res.status(204).send();
});

export default router;
