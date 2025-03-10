import express from "express";
import { generateReport, getReport } from "../controllers/reportController.js";
import mongoose from "mongoose";
import Report from "../models/Report.js"; 

const router = express.Router();

// Define the POST route for triggering the report
router.post("/trigger_report", generateReport);

// Define the GET route for fetching the report
//router.get("/get_report", getReport);
router.get("/get_report", async (req, res) => {
    try {
      const report = await Report.findOne({ report_id: req.query.report_id });
  
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
  
      res.json(report);
    } catch (error) {
      console.error("Error fetching report:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

export default router;
