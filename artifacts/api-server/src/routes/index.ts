import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import workersRouter from "./workers";
import attendanceRouter from "./attendance";
import advancesRouter from "./advances";
import payoutsRouter from "./payouts";
import suppliersRouter from "./suppliers";
import revenueRouter from "./revenue";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";
import expensesRouter from "./expenses";
import expenseCategoriesRouter from "./expense-categories";
import budgetAlertsRouter from "./budget-alerts";
import menuCategoriesRouter from "./menu-categories";
import { requireAuth } from "../middleware/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

/* Public routes — no auth required */
router.use("/menu", menuRouter);
router.use("/orders", ordersRouter);
router.use("/menu-categories", menuCategoriesRouter);   // reading category names is public

/* All routes below this line require a valid session */
router.use(requireAuth);

router.use("/workers", workersRouter);
router.use("/attendance", attendanceRouter);
router.use("/advances", advancesRouter);
router.use("/payouts", payoutsRouter);
router.use("/suppliers", suppliersRouter);
router.use("/revenue", revenueRouter);
router.use("/dashboard", dashboardRouter);
router.use("/expenses", expensesRouter);
router.use("/expense-categories", expenseCategoriesRouter);
router.use("/budget-alerts", budgetAlertsRouter);

export default router;
