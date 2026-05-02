import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, payoutsTable } from "@workspace/db";
import {
  CreatePayoutBody,
  ListPayoutsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const query = ListPayoutsQueryParams.parse(req.query);
  let records;

  if (query.workerId) {
    records = await db
      .select()
      .from(payoutsTable)
      .where(eq(payoutsTable.workerId, query.workerId))
      .orderBy(payoutsTable.createdAt);
  } else {
    records = await db.select().from(payoutsTable).orderBy(payoutsTable.createdAt);
  }

  res.json(records.map((r) => ({ ...r, amount: Number(r.amount) })));
});

router.post("/", async (req, res) => {
  const body = CreatePayoutBody.parse(req.body);
  const [record] = await db
    .insert(payoutsTable)
    .values({ workerId: body.workerId, amount: String(body.amount), note: body.note })
    .returning();
  res.status(201).json({ ...record, amount: Number(record.amount) });
});

export default router;
