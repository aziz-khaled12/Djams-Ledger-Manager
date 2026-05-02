import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, advancesTable } from "@workspace/db";
import {
  CreateAdvanceBody,
  ListAdvancesQueryParams,
  DeleteAdvanceParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const query = ListAdvancesQueryParams.parse(req.query);
  let records;

  if (query.workerId && query.month) {
    records = await db
      .select()
      .from(advancesTable)
      .where(
        and(
          eq(advancesTable.workerId, query.workerId),
          sql`TO_CHAR(${advancesTable.createdAt}, 'YYYY-MM') = ${query.month}`
        )
      )
      .orderBy(advancesTable.createdAt);
  } else if (query.workerId) {
    records = await db
      .select()
      .from(advancesTable)
      .where(eq(advancesTable.workerId, query.workerId))
      .orderBy(advancesTable.createdAt);
  } else if (query.month) {
    records = await db
      .select()
      .from(advancesTable)
      .where(sql`TO_CHAR(${advancesTable.createdAt}, 'YYYY-MM') = ${query.month}`)
      .orderBy(advancesTable.createdAt);
  } else {
    records = await db.select().from(advancesTable).orderBy(advancesTable.createdAt);
  }

  res.json(records.map((r) => ({ ...r, amount: Number(r.amount) })));
});

router.post("/", async (req, res) => {
  const body = CreateAdvanceBody.parse(req.body);
  const [record] = await db
    .insert(advancesTable)
    .values({ workerId: body.workerId, amount: String(body.amount), note: body.note })
    .returning();
  res.status(201).json({ ...record, amount: Number(record.amount) });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteAdvanceParams.parse({ id: Number(req.params.id) });
  await db.delete(advancesTable).where(eq(advancesTable.id, id));
  res.status(204).send();
});

export default router;
