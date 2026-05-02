import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, workersTable, attendanceTable, advancesTable, payoutsTable } from "@workspace/db";
import {
  CreateWorkerBody,
  UpdateWorkerBody,
  GetWorkerParams,
  UpdateWorkerParams,
  DeleteWorkerParams,
  GetWorkerBalanceParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const workers = await db.select().from(workersTable).orderBy(workersTable.createdAt);
  const result = workers.map((w) => ({
    ...w,
    dailyRate: Number(w.dailyRate),
  }));
  res.json(result);
});

router.post("/", async (req, res) => {
  const body = CreateWorkerBody.parse(req.body);
  const [worker] = await db
    .insert(workersTable)
    .values({ name: body.name, role: body.role, dailyRate: String(body.dailyRate) })
    .returning();
  res.status(201).json({ ...worker, dailyRate: Number(worker.dailyRate) });
});

router.get("/:id", async (req, res) => {
  const { id } = GetWorkerParams.parse({ id: Number(req.params.id) });
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, id));
  if (!worker) return res.status(404).json({ error: "Worker not found" });
  res.json({ ...worker, dailyRate: Number(worker.dailyRate) });
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateWorkerParams.parse({ id: Number(req.params.id) });
  const body = UpdateWorkerBody.parse(req.body);
  const [worker] = await db
    .update(workersTable)
    .set({ name: body.name, role: body.role, dailyRate: String(body.dailyRate) })
    .where(eq(workersTable.id, id))
    .returning();
  if (!worker) return res.status(404).json({ error: "Worker not found" });
  res.json({ ...worker, dailyRate: Number(worker.dailyRate) });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteWorkerParams.parse({ id: Number(req.params.id) });
  await db.delete(workersTable).where(eq(workersTable.id, id));
  res.status(204).send();
});

router.get("/:id/balance", async (req, res) => {
  const { id } = GetWorkerBalanceParams.parse({ id: Number(req.params.id) });
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, id));
  if (!worker) return res.status(404).json({ error: "Worker not found" });

  const [attResult] = await db
    .select({ totalUnits: sql<number>`COALESCE(SUM(${attendanceTable.units}::numeric), 0)` })
    .from(attendanceTable)
    .where(eq(attendanceTable.workerId, id));

  const [advResult] = await db
    .select({ totalAdvances: sql<number>`COALESCE(SUM(${advancesTable.amount}::numeric), 0)` })
    .from(advancesTable)
    .where(eq(advancesTable.workerId, id));

  const [payResult] = await db
    .select({ totalPayouts: sql<number>`COALESCE(SUM(${payoutsTable.amount}::numeric), 0)` })
    .from(payoutsTable)
    .where(eq(payoutsTable.workerId, id));

  const dailyRate = Number(worker.dailyRate);
  const totalWorkUnits = Number(attResult.totalUnits);
  const totalEarned = totalWorkUnits * dailyRate;
  const totalAdvances = Number(advResult.totalAdvances);
  const totalPaidOut = Number(payResult.totalPayouts);
  const currentBalance = totalEarned - totalAdvances - totalPaidOut;

  res.json({
    workerId: worker.id,
    workerName: worker.name,
    totalWorkUnits,
    dailyRate,
    totalEarned,
    totalAdvances,
    totalPaidOut,
    currentBalance,
  });
});

export default router;
