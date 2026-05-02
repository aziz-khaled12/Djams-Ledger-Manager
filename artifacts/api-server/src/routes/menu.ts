import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, menuItemsTable } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  const { category } = req.query as { category?: string };
  const items = category
    ? await db.select().from(menuItemsTable).where(eq(menuItemsTable.category, category)).orderBy(menuItemsTable.name)
    : await db.select().from(menuItemsTable).orderBy(menuItemsTable.category, menuItemsTable.name);
  res.json(items.map((i) => ({ ...i, price: Number(i.price) })));
});

router.post("/", async (req, res) => {
  const { name, category, price, ingredients, imageUrl, available } = req.body as {
    name: string; category: string; price: number; ingredients: string;
    imageUrl?: string | null; available?: boolean;
  };
  if (!name || !category || price == null) return res.status(400).json({ error: "missing fields" });
  const [item] = await db
    .insert(menuItemsTable)
    .values({ name, category, price: String(price), ingredients: ingredients || "", imageUrl: imageUrl ?? null, available: available ?? true })
    .returning();
  res.status(201).json({ ...item, price: Number(item.price) });
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, category, price, ingredients, imageUrl, available } = req.body as {
    name?: string; category?: string; price?: number; ingredients?: string;
    imageUrl?: string | null; available?: boolean;
  };
  const [item] = await db
    .update(menuItemsTable)
    .set({
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(price !== undefined && { price: String(price) }),
      ...(ingredients !== undefined && { ingredients }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(available !== undefined && { available }),
    })
    .where(eq(menuItemsTable.id, id))
    .returning();
  if (!item) return res.status(404).json({ error: "Menu item not found" });
  res.json({ ...item, price: Number(item.price) });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id));
  res.status(204).send();
});

export default router;
