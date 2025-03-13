const express = require("express");
const { triggerReport, getAggregatedReport, getReport } = require("../controllers/reportController");

const router = express.Router();

router.post("/trigger_report", triggerReport); // Report generation via GET request
router.get("/get_report", getReport); // Fetch report via GET request
router.get("/get_aggregated_report", getAggregatedReport);

module.exports = router;



