import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable, menuItemsTable } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  const { status } = req.query as { status?: string };
  const orders = status
    ? await db.select().from(ordersTable).where(eq(ordersTable.status, status)).orderBy(ordersTable.createdAt)
    : await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  res.json(orders);
});

router.post("/", async (req, res) => {
  const { tableNumber, items, note } = req.body as {
    tableNumber: string;
    items: { menuItemId: number; quantity: number; note?: string }[];
    note?: string;
  };
  if (!tableNumber || !items?.length) return res.status(400).json({ error: "tableNumber and items required" });

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      const [menuItem] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, item.menuItemId));
      return {
        menuItemId: item.menuItemId,
        name: menuItem?.name ?? "غير معروف",
        quantity: item.quantity,
        price: menuItem ? Number(menuItem.price) : 0,
        note: item.note || null,
      };
    })
  );

  const [order] = await db
    .insert(ordersTable)
    .values({ tableNumber, items: enrichedItems, status: "pending", note: note || null })
    .returning();
  res.status(201).json(order);
});

router.put("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status: string };
  if (!["pending", "ready", "completed"].includes(status)) return res.status(400).json({ error: "invalid status" });
  const [order] = await db
    .update(ordersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

export default router;
