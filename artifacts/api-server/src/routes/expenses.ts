import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable, expenseCategoriesTable, budgetAlertsTable, revenueTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = Router();

/* ── List expenses (optionally filtered by month) ── */
router.get("/", async (req, res) => {
  const { month } = req.query as { month?: string };
  let rows;
  if (month) {
    const start = `${month}-01`;
    const end = new Date(Number(month.split("-")[0]), Number(month.split("-")[1]), 0)
      .toISOString()
      .split("T")[0];
    rows = await db
      .select({
        id: expensesTable.id,
        itemName: expensesTable.itemName,
        quantity: expensesTable.quantity,
        unitPrice: expensesTable.unitPrice,
        totalAmount: expensesTable.totalAmount,
        date: expensesTable.date,
        note: expensesTable.note,
        createdAt: expensesTable.createdAt,
        categoryId: expensesTable.categoryId,
        categoryName: expenseCategoriesTable.name,
        categoryColor: expenseCategoriesTable.color,
      })
      .from(expensesTable)
      .leftJoin(expenseCategoriesTable, eq(expensesTable.categoryId, expenseCategoriesTable.id))
      .where(and(gte(expensesTable.date, start), lte(expensesTable.date, end)))
      .orderBy(expensesTable.date);
  } else {
    rows = await db
      .select({
        id: expensesTable.id,
        itemName: expensesTable.itemName,
        quantity: expensesTable.quantity,
        unitPrice: expensesTable.unitPrice,
        totalAmount: expensesTable.totalAmount,
        date: expensesTable.date,
        note: expensesTable.note,
        createdAt: expensesTable.createdAt,
        categoryId: expensesTable.categoryId,
        categoryName: expenseCategoriesTable.name,
        categoryColor: expenseCategoriesTable.color,
      })
      .from(expensesTable)
      .leftJoin(expenseCategoriesTable, eq(expensesTable.categoryId, expenseCategoriesTable.id))
      .orderBy(expensesTable.date);
  }

  res.json(
    rows.map((r) => ({
      ...r,
      quantity: Number(r.quantity),
      unitPrice: Number(r.unitPrice),
      totalAmount: Number(r.totalAmount),
    }))
  );
});

/* ── Create expense ── */
router.post("/", async (req, res) => {
  const { categoryId, itemName, quantity, unitPrice, date, note } = req.body as {
    categoryId: number;
    itemName: string;
    quantity: number;
    unitPrice: number;
    date: string;
    note?: string;
  };
  if (!categoryId || !itemName || !quantity || !unitPrice || !date) {
    return res.status(400).json({ error: "missing required fields" });
  }
  const totalAmount = Number(quantity) * Number(unitPrice);
  const [row] = await db
    .insert(expensesTable)
    .values({
      categoryId,
      itemName,
      quantity: String(quantity),
      unitPrice: String(unitPrice),
      totalAmount: String(totalAmount),
      date,
      note: note || null,
    })
    .returning();
  return res.status(201).json({
    ...row,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unitPrice),
    totalAmount: Number(row.totalAmount),
  });
});

/* ── Update expense ── */
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { categoryId, itemName, quantity, unitPrice, date, note } = req.body as {
    categoryId?: number;
    itemName?: string;
    quantity?: number;
    unitPrice?: number;
    date?: string;
    note?: string;
  };
  const totalAmount = quantity && unitPrice ? Number(quantity) * Number(unitPrice) : undefined;
  const [row] = await db
    .update(expensesTable)
    .set({
      ...(categoryId && { categoryId }),
      ...(itemName && { itemName }),
      ...(quantity && { quantity: String(quantity) }),
      ...(unitPrice && { unitPrice: String(unitPrice) }),
      ...(totalAmount !== undefined && { totalAmount: String(totalAmount) }),
      ...(date && { date }),
      ...(note !== undefined && { note }),
    })
    .where(eq(expensesTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "not found" });
  return res.json({
    ...row,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unitPrice),
    totalAmount: Number(row.totalAmount),
  });
});

/* ── Delete expense ── */
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.status(204).send();
});

/* ── Financial summary for a given month ── */
router.get("/summary", async (req, res) => {
  const { month } = req.query as { month?: string };
  const m = month || new Date().toISOString().slice(0, 7);
  const [y, mo] = m.split("-").map(Number);
  const start = `${m}-01`;
  const end = new Date(y, mo, 0).toISOString().split("T")[0];

  /* Total income from revenue table */
  const incomeRows = await db
    .select({ total: sql<string>`coalesce(sum(amount), 0)` })
    .from(revenueTable)
    .where(and(gte(revenueTable.date, start), lte(revenueTable.date, end)));
  const totalIncome = Number(incomeRows[0]?.total ?? 0);

  /* Total expenses and by-category breakdown */
  const expenseRows = await db
    .select({
      categoryId: expensesTable.categoryId,
      categoryName: expenseCategoriesTable.name,
      categoryColor: expenseCategoriesTable.color,
      total: sql<string>`coalesce(sum(${expensesTable.totalAmount}), 0)`,
    })
    .from(expensesTable)
    .leftJoin(expenseCategoriesTable, eq(expensesTable.categoryId, expenseCategoriesTable.id))
    .where(and(gte(expensesTable.date, start), lte(expensesTable.date, end)))
    .groupBy(expensesTable.categoryId, expenseCategoriesTable.name, expenseCategoriesTable.color);

  const byCategory = expenseRows.map((r) => ({
    categoryId: r.categoryId,
    categoryName: r.categoryName || "غير محدد",
    categoryColor: r.categoryColor || "#f59e0b",
    total: Number(r.total),
  }));
  const totalExpenses = byCategory.reduce((s, r) => s + r.total, 0);

  /* Budget alerts with actual spending */
  const budgets = await db
    .select({
      id: budgetAlertsTable.id,
      categoryId: budgetAlertsTable.categoryId,
      monthlyLimit: budgetAlertsTable.monthlyLimit,
      categoryName: expenseCategoriesTable.name,
      categoryColor: expenseCategoriesTable.color,
    })
    .from(budgetAlertsTable)
    .leftJoin(expenseCategoriesTable, eq(budgetAlertsTable.categoryId, expenseCategoriesTable.id));

  const budgetStatus = budgets.map((b) => {
    const spent = byCategory.find((c) => c.categoryId === b.categoryId)?.total ?? 0;
    const limit = Number(b.monthlyLimit);
    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.categoryName || "غير محدد",
      categoryColor: b.categoryColor || "#f59e0b",
      monthlyLimit: limit,
      spent,
      percentage: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      exceeded: spent > limit,
    };
  });

  res.json({
    month: m,
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    byCategory,
    budgetStatus,
  });
});

export default router;
