import { Router } from "express";
import { sql, eq } from "drizzle-orm";
import { db, revenueTable, suppliersTable, advancesTable, payoutsTable, workersTable, ordersTable } from "@workspace/db";
import { GetDashboardSummaryQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/summary", async (req, res) => {
  const query = GetDashboardSummaryQueryParams.parse(req.query);
  const { month } = query;

  const [revenueResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${revenueTable.amount}::numeric), 0)` })
    .from(revenueTable)
    .where(sql`TO_CHAR(${revenueTable.date}::date, 'YYYY-MM') = ${month}`);

  const [supplierResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${suppliersTable.amount}::numeric), 0)` })
    .from(suppliersTable)
    .where(sql`TO_CHAR(${suppliersTable.date}::date, 'YYYY-MM') = ${month}`);

  const [advancesResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${advancesTable.amount}::numeric), 0)` })
    .from(advancesTable)
    .where(sql`TO_CHAR(${advancesTable.createdAt}, 'YYYY-MM') = ${month}`);

  const [payoutsResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payoutsTable.amount}::numeric), 0)` })
    .from(payoutsTable)
    .where(sql`TO_CHAR(${payoutsTable.createdAt}, 'YYYY-MM') = ${month}`);

  const [workersResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(workersTable);

  const [pendingOrdersResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"));

  const totalRevenue = Number(revenueResult.total);
  const totalSupplierCosts = Number(supplierResult.total);
  const totalAdvances = Number(advancesResult.total);
  const totalPayouts = Number(payoutsResult.total);
  const netProfit = totalRevenue - totalSupplierCosts - totalAdvances;

  res.json({
    month,
    totalRevenue,
    totalSupplierCosts,
    totalAdvances,
    totalPayouts,
    netProfit,
    totalWorkersCount: Number(workersResult.count),
    pendingOrdersCount: Number(pendingOrdersResult.count),
  });
});

export default router;
