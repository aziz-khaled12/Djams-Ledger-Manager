import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, suppliersTable } from "@workspace/db";
import {
  CreateSupplierBody,
  UpdateSupplierBody,
  UpdateSupplierParams,
  DeleteSupplierParams,
  ListSuppliersQueryParams,
  GetSuppliersMonthlyTotalQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/monthly-total", async (req, res) => {
  const query = GetSuppliersMonthlyTotalQueryParams.parse(req.query);
  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${suppliersTable.amount}::numeric), 0)` })
    .from(suppliersTable)
    .where(sql`TO_CHAR(${suppliersTable.date}::date, 'YYYY-MM') = ${query.month}`);

  res.json({ month: query.month, total: Number(result.total) });
});

router.get("/", async (req, res) => {
  const query = ListSuppliersQueryParams.parse(req.query);
  let records;

  if (query.month) {
    records = await db
      .select()
      .from(suppliersTable)
      .where(sql`TO_CHAR(${suppliersTable.date}::date, 'YYYY-MM') = ${query.month}`)
      .orderBy(suppliersTable.date);
  } else {
    records = await db.select().from(suppliersTable).orderBy(suppliersTable.date);
  }

  res.json(records.map((r) => ({ ...r, amount: Number(r.amount) })));
});

router.post("/", async (req, res) => {
  const body = CreateSupplierBody.parse(req.body);
  const [record] = await db
    .insert(suppliersTable)
    .values({
      supplierName: body.supplierName,
      item: body.item,
      amount: String(body.amount),
      date: body.date,
      note: body.note,
    })
    .returning();
  res.status(201).json({ ...record, amount: Number(record.amount) });
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateSupplierParams.parse({ id: Number(req.params.id) });
  const body = UpdateSupplierBody.parse(req.body);
  const [record] = await db
    .update(suppliersTable)
    .set({
      supplierName: body.supplierName,
      item: body.item,
      amount: String(body.amount),
      date: body.date,
      note: body.note,
    })
    .where(eq(suppliersTable.id, id))
    .returning();
  if (!record) return res.status(404).json({ error: "Supplier not found" });
  res.json({ ...record, amount: Number(record.amount) });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteSupplierParams.parse({ id: Number(req.params.id) });
  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
  res.status(204).send();
});

export default router;
