import StoreStatus from "../models/StoreStatus.js";
import MenuHours from "../models/MenuHours.js";
import Timezone from "../models/Timezone.js";
import Report from "../models/Report.js";
import moment from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

export const generateReport = async (req, res) => {
  console.log("Inside triggerReport function");

  const report_id = uuidv4();
  console.log("Generated report ID:", report_id);

  try {
    // Fetch all store statuses
    console.log("Fetching store status data...");
    const storeStatusData = await StoreStatus.find();
    console.log("Store status data fetched:", storeStatusData.length, "records");

    let reportData =
      "store_id, uptime_last_hour, uptime_last_day, uptime_last_week, downtime_last_hour, downtime_last_day, downtime_last_week\n";

    storeStatusData.forEach((store) => {
      console.log("Processing store:", store.store_id);
      
      let uptimeLastHour = 30; 
      let uptimeLastDay = 8; 
      let uptimeLastWeek = 50; 
      let downtimeLastHour = 30;
      let downtimeLastDay = 16;
      let downtimeLastWeek = 70;

      reportData += `${store.store_id}, ${uptimeLastHour}, ${uptimeLastDay}, ${uptimeLastWeek}, ${downtimeLastHour}, ${downtimeLastDay}, ${downtimeLastWeek}\n`;
    });

    const filePath = `./data/report_${report_id}.csv`;
    console.log("Saving report to:",  { report_id, status: "Active", csv_data: filePath });

    fs.writeFileSync(filePath, reportData);
    console.log("Report saved successfully");

    await Report.create({ report_id, status: "Active", csv_data: filePath });
    console.log("Report entry saved to database");

    res.json({ report_id });
  } catch (error) {
    console.error("Error in generateReport:", error);
    res.status(500).json({ message: "Error generating report", error: error.message });
  }
};

// export const getReport = async (req, res) => {
//   console.log("Inside getReport function");

//   const { report_id } = req.query;
//   console.log("Fetching report with ID:", report_id);

//   try {
//     const report = await Report.findOne({ report_id });

//     if (!report) {
//       console.log("Report not found");
//       return res.status(404).json({ message: "Report not found" });
//     }

//     if (report.status === "Running") {
//       console.log("Report is still running");
//       return res.json({ status: "Running" });
//     }

//     console.log("Downloading report:", report.csv_data);
//     res.download(report.csv_data);
//   } catch (error) {
//     console.error("Error fetching report:", error);
//     res.status(500).json({ message: "Error fetching report" });
//   }
// };
export const getReport = async (req, res) => {
  try {
    const reportId = req.query.report_id;
    
    if (!reportId) {
      return res.status(400).json({ error: "Missing report_id" });
    }

    // Fetch report from MongoDB using report_id
    //const report = await Report.findOne({ report_id: reportId });
    const report = await Report.findOne({ report_id: "1cd3c2a5-6893-4a5d-b555-0bc8cbe5374f" });
    console.log(report);

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Check if CSV file path is stored
    if (!report.csv_data) {
      return res.status(500).json({ error: "CSV file path missing in database" });
    }

    const csvFilePath = path.resolve(report.csv_data);

    // Check if the CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      return res.status(500).json({ error: "CSV file not found on server" });
    }

    // Convert CSV to JSON
    const jsonData = [];
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => {
        jsonData.push(row);
      })
      .on("end", () => {
        res.json(jsonData);
      })
      .on("error", (error) => {
        console.error("CSV Parsing Error:", error);
        res.status(500).json({ error: "Failed to parse CSV" });
      });

  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
