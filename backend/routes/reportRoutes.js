import express from "express";
import { triggerReport, getReport } from "../controllers/reportController.js";

const router = express.Router();

router.post("/trigger_report", triggerReport); // Report generation via GET request
router.get("/get_report", getReport); // Fetch report via GET request

export default router;



