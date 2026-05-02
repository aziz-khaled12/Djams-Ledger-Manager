import { Router } from "express";
import { db } from "@workspace/db";
import { budgetAlertsTable, expenseCategoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db
    .select({
      id: budgetAlertsTable.id,
      categoryId: budgetAlertsTable.categoryId,
      monthlyLimit: budgetAlertsTable.monthlyLimit,
      categoryName: expenseCategoriesTable.name,
      categoryColor: expenseCategoriesTable.color,
    })
    .from(budgetAlertsTable)
    .leftJoin(expenseCategoriesTable, eq(budgetAlertsTable.categoryId, expenseCategoriesTable.id));
  res.json(
    rows.map((r) => ({
      ...r,
      monthlyLimit: Number(r.monthlyLimit),
    }))
  );
});

router.post("/", async (req, res) => {
  const { categoryId, monthlyLimit } = req.body as { categoryId: number; monthlyLimit: number };
  if (!categoryId || !monthlyLimit) return res.status(400).json({ error: "categoryId and monthlyLimit required" });
  const [row] = await db
    .insert(budgetAlertsTable)
    .values({ categoryId, monthlyLimit: String(monthlyLimit) })
    .onConflictDoUpdate({
      target: budgetAlertsTable.categoryId,
      set: { monthlyLimit: String(monthlyLimit) },
    })
    .returning();
  return res.status(201).json({ ...row, monthlyLimit: Number(row.monthlyLimit) });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(budgetAlertsTable).where(eq(budgetAlertsTable.id, id));
  res.status(204).send();
});

export default router;
