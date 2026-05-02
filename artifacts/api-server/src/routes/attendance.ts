import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, attendanceTable } from "@workspace/db";
import {
  LogAttendanceBody,
  ListAttendanceQueryParams,
  DeleteAttendanceParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const query = ListAttendanceQueryParams.parse(req.query);
  let records = await db.select().from(attendanceTable).orderBy(attendanceTable.date);

  if (query.workerId) {
    records = await db
      .select()
      .from(attendanceTable)
      .where(
        query.month
          ? and(
              eq(attendanceTable.workerId, query.workerId),
              sql`TO_CHAR(${attendanceTable.date}::date, 'YYYY-MM') = ${query.month}`
            )
          : eq(attendanceTable.workerId, query.workerId)
      )
      .orderBy(attendanceTable.date);
  } else if (query.month) {
    records = await db
      .select()
      .from(attendanceTable)
      .where(sql`TO_CHAR(${attendanceTable.date}::date, 'YYYY-MM') = ${query.month}`)
      .orderBy(attendanceTable.date);
  }

  res.json(records.map((r) => ({ ...r, units: Number(r.units) })));
});

router.post("/", async (req, res) => {
  const body = LogAttendanceBody.parse(req.body);
  const [record] = await db
    .insert(attendanceTable)
    .values({
      workerId: body.workerId,
      date: body.date,
      units: String(body.units),
      note: body.note,
    })
    .returning();
  res.status(201).json({ ...record, units: Number(record.units) });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteAttendanceParams.parse({ id: Number(req.params.id) });
  await db.delete(attendanceTable).where(eq(attendanceTable.id, id));
  res.status(204).send();
});

export default router;
