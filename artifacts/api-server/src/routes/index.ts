import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import soldiersRouter from "./soldiers";
import attendanceRouter from "./attendance";
import warningsRouter from "./warnings";
import activityLogsRouter from "./activity-logs";
import profileRouter from "./profile";
import charactersRouter from "./characters";
import radarRouter from "./radar";
import imageProxyRouter from "./image-proxy";
import bankRouter from "./bank";
import policeBudgetRouter from "./police-budget";
import seizureRouter from "./seizure";
import policeVehiclesRouter from "./police-vehicles";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(soldiersRouter);
router.use(attendanceRouter);
router.use(warningsRouter);
router.use(activityLogsRouter);
router.use(profileRouter);
router.use(charactersRouter);
router.use(radarRouter);
router.use(imageProxyRouter);
router.use(bankRouter);
router.use(policeBudgetRouter);
router.use(seizureRouter);
router.use(policeVehiclesRouter);

export default router;
