import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, revenueTable } from "@workspace/db";
import {
  CreateRevenueBody,
  ListRevenueQueryParams,
  DeleteRevenueParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const query = ListRevenueQueryParams.parse(req.query);
  let records;

  if (query.month) {
    records = await db
      .select()
      .from(revenueTable)
      .where(sql`TO_CHAR(${revenueTable.date}::date, 'YYYY-MM') = ${query.month}`)
      .orderBy(revenueTable.date);
  } else {
    records = await db.select().from(revenueTable).orderBy(revenueTable.date);
  }

  res.json(records.map((r) => ({ ...r, amount: Number(r.amount) })));
});

router.post("/", async (req, res) => {
  const body = CreateRevenueBody.parse(req.body);
  const [record] = await db
    .insert(revenueTable)
    .values({ date: body.date, amount: String(body.amount), note: body.note })
    .returning();
  res.status(201).json({ ...record, amount: Number(record.amount) });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteRevenueParams.parse({ id: Number(req.params.id) });
  await db.delete(revenueTable).where(eq(revenueTable.id, id));
  res.status(204).send();
});

export default router;
