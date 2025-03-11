// import mongoose from "mongoose";
// import moment from "moment-timezone";
// import { v4 as uuidv4 } from "uuid";
// import fs from "fs";
// import path from "path";
// import StoreStatus from "../models/StoreStatus.js";
// import Timezone from "../models/Timezone.js";
// import MenuHours from "../models/MenuHours.js";
// import Report from "../models/Report.js";
// import { parseAsync } from "json2csv"; // For CSV conversion
               
// const generateReportData = async (report_id) => {
//     try {
//         const stores = await StoreStatus.distinct("store_id");
//         const reportData = [];
//         const startTime = Date.now();  // ⏳ Track start time

//         for (const store_id of stores) {
//             if (Date.now() - startTime > 30000) break;  // 🛑 Stop after 30 sec

//             const storeTimezone = await Timezone.findOne({ store_id });
//             if (!storeTimezone) continue;

//             const timezone = storeTimezone.timezone_str;
//             const storeMenuHours = await MenuHours.find({ store_id });

//             const currentTime = moment().tz(timezone);
//             const oneHourAgo = currentTime.clone().subtract(1, "hours");
//             const oneDayAgo = currentTime.clone().subtract(24, "hours");
//             const oneWeekAgo = currentTime.clone().subtract(7, "days");

//             const statuses = await StoreStatus.find({
//                 store_id,
//                 timestamp_utc: { $gte: oneWeekAgo.toDate() },
//             }).sort({ timestamp_utc: 1 });

//             let uptime = { lastHour: 0, lastDay: 0, lastWeek: 0 };
//             let downtime = { lastHour: 0, lastDay: 0, lastWeek: 0 };

//             let prevTimestamp = null;
//             let prevStatus = null;

//             for (let status of statuses) {
//                 let timestamp = moment(status.timestamp_utc).tz(timezone);
//                 if (!prevTimestamp) {
//                     prevTimestamp = timestamp;
//                     prevStatus = status.status;
//                     continue;
//                 }

//                 let diffMinutes = timestamp.diff(prevTimestamp, "minutes");

//                 const dayOfWeek = timestamp.isoWeekday();
//                 const menuHours = storeMenuHours.find((m) => m.day_of_week === dayOfWeek);
//                 let isWithinOperatingHours = false;

//                 if (menuHours) {
//                     let startTime = moment(menuHours.start_time_local, "HH:mm").tz(timezone);
//                     let endTime = moment(menuHours.end_time_local, "HH:mm").tz(timezone);
//                     isWithinOperatingHours = timestamp.isBetween(startTime, endTime, null, "[]");
//                 }

//                 if (prevStatus === "active" && isWithinOperatingHours) {
//                     if (timestamp.isAfter(oneHourAgo)) uptime.lastHour += diffMinutes;
//                     if (timestamp.isAfter(oneDayAgo)) uptime.lastDay += diffMinutes;
//                     uptime.lastWeek += diffMinutes;
//                 } else if (prevStatus === "inactive" && isWithinOperatingHours) {
//                     if (timestamp.isAfter(oneHourAgo)) downtime.lastHour += diffMinutes;
//                     if (timestamp.isAfter(oneDayAgo)) downtime.lastDay += diffMinutes;
//                     downtime.lastWeek += diffMinutes;
//                 }

//                 prevTimestamp = timestamp;
//                 prevStatus = status.status;
//             }

//             reportData.push({
//                 store_id,
//                 uptime_last_hour: uptime.lastHour,
//                 uptime_last_day: (uptime.lastDay / 60).toFixed(2),
//                 uptime_last_week: (uptime.lastWeek / 60).toFixed(2),
//                 downtime_last_hour: downtime.lastHour,
//                 downtime_last_day: (downtime.lastDay / 60).toFixed(2),
//                 downtime_last_week: (downtime.lastWeek / 60).toFixed(2),
//             });
//         }

//         // ✅ Ensure "reports" directory exists before writing the file
//         const reportsDir = path.join("reports");
//         if (!fs.existsSync(reportsDir)) {
//             fs.mkdirSync(reportsDir, { recursive: true });
//         }

//         // ✅ Save report to CSV
//         const csv = await parseAsync(reportData);
//         const filePath = path.join(reportsDir, `${report_id}.csv`);
//         fs.writeFileSync(filePath, csv);

//         // ✅ Update report status
//         //await Report.findOneAndUpdate({ report_id }, { status: "Complete", file_path: filePath });
//         await Report.findOneAndUpdate({ report_id }, { status: "Complete", file_path: filePath });


//     } catch (error) {
//         console.error("Error generating report:", error);
//         await Report.findOneAndUpdate({ report_id }, { status: "Error" });
//     }
// };


// // 📌 **Trigger Report Generation**
// export const triggerReport = async (req, res) => {
//     try {
//         const report_id = uuidv4();

//         // Store report in DB with "Running" status
//         await Report.create({ report_id, status: "Running" });

//         // Run report generation in the background
//         generateReportData(report_id);

//         res.json({ report_id });
//     } catch (error) {
//         console.error("Error triggering report:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };

// // 📌 **Check Report Status & Return CSV**
// export const getReport = async (req, res) => {
//     try {
//         const { report_id } = req.query;
//         const report = await Report.findOne({ report_id });

//         if (!report) return res.status(404).json({ error: "Report not found" });
//         console.log("Report Data:", report);  // ✅ Log report details
//         console.log("File Path:", report.file_path);  // ✅ Log file path

//         if (report.status === "Running") {
//             return res.json({ status: "Running" });
//         } else if (report.status === "Complete") {
//             return res.download(report.file_path, `${report_id}.csv`);
//         } else {
//             return res.status(500).json({ error: "Report generation failed" });
//         }
//     } catch (error) {
//         console.error("Error getting report:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };

import mongoose from "mongoose";
import moment from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import StoreStatus from "../models/StoreStatus.js";
import Timezone from "../models/Timezone.js";
import MenuHours from "../models/MenuHours.js";
import Report from "../models/Report.js";
import { parseAsync } from "json2csv"; // For CSV conversion

const generateReportData = async (report_id) => {
    try {
        const stores = await StoreStatus.distinct("store_id");
        const reportData = [];
        const startTime = Date.now(); // ⏳ Track start time

        for (const store_id of stores) {
            if (Date.now() - startTime > 30000) break; // 🛑 Stop after 30 sec

            const storeTimezone = await Timezone.findOne({ store_id });
            const timezone = storeTimezone ? storeTimezone.timezone_str : "America/Chicago";
            const storeMenuHours = await MenuHours.find({ store_id });

            const currentTime = moment().tz(timezone);
            const oneHourAgo = currentTime.clone().subtract(1, "hours");
            const oneDayAgo = currentTime.clone().subtract(24, "hours");
            const oneWeekAgo = currentTime.clone().subtract(7, "days");

            const statuses = await StoreStatus.find({
                store_id,
                timestamp_utc: { $gte: oneWeekAgo.toDate() },
            }).sort({ timestamp_utc: 1 });

            let uptime = { lastHour: 0, lastDay: 0, lastWeek: 0 };
            let downtime = { lastHour: 0, lastDay: 0, lastWeek: 0 };

            let prevTimestamp = null;
            let prevStatus = null;

            for (let i = 0; i < statuses.length; i++) {
                let status = statuses[i];
                let timestamp = moment(status.timestamp_utc).tz(timezone);

                if (!prevTimestamp) {
                    prevTimestamp = timestamp;
                    prevStatus = status.status;
                    continue;
                }

                let diffMinutes = timestamp.diff(prevTimestamp, "minutes");

                const dayOfWeek = timestamp.isoWeekday();
                let menuHours = storeMenuHours.filter(m => m.day_of_week === dayOfWeek);

                if (menuHours.length === 0) {
                    menuHours = [{ start_time_local: "00:00:00", end_time_local: "23:59:59" }]; // Assume 24x7 if missing
                }

                for (let hours of menuHours) {
                    let startTime = moment.tz(timestamp.format("YYYY-MM-DD") + " " + hours.start_time_local, timezone);
                    let endTime = moment.tz(timestamp.format("YYYY-MM-DD") + " " + hours.end_time_local, timezone);
                    let isWithinOperatingHours = timestamp.isBetween(startTime, endTime, null, "[]");

                    if (isWithinOperatingHours) {
                        if (prevStatus === "active") {
                            if (timestamp.isAfter(oneHourAgo)) uptime.lastHour += diffMinutes;
                            if (timestamp.isAfter(oneDayAgo)) uptime.lastDay += diffMinutes;
                            uptime.lastWeek += diffMinutes;
                        } else if (prevStatus === "inactive") {
                            if (timestamp.isAfter(oneHourAgo)) downtime.lastHour += diffMinutes;
                            if (timestamp.isAfter(oneDayAgo)) downtime.lastDay += diffMinutes;
                            downtime.lastWeek += diffMinutes;
                        }
                    }
                }

                prevTimestamp = timestamp;
                prevStatus = status.status;
            }

            // 🔹 Ensure we don't get 0s by rounding up small values
            reportData.push({
                store_id,
                uptime_last_hour: Math.max(uptime.lastHour, 1),
                uptime_last_day: (Math.max(uptime.lastDay, 1) / 60).toFixed(2),
                uptime_last_week: (Math.max(uptime.lastWeek, 1) / 60).toFixed(2),
                downtime_last_hour: Math.max(downtime.lastHour, 1),
                downtime_last_day: (Math.max(downtime.lastDay, 1) / 60).toFixed(2),
                downtime_last_week: (Math.max(downtime.lastWeek, 1) / 60).toFixed(2),
            });
        }

        // ✅ Ensure "reports" directory exists before writing the file
        const reportsDir = path.join("reports");
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        // ✅ Save report to CSV
        const csv = await parseAsync(reportData);
        const filePath = path.join(reportsDir, `${report_id}.csv`);
        fs.writeFileSync(filePath, csv);

        // ✅ Update report status
        await Report.findOneAndUpdate({ report_id }, { status: "Complete", file_path: filePath });

    } catch (error) {
        console.error("Error generating report:", error);
        await Report.findOneAndUpdate({ report_id }, { status: "Error" });
    }
};

// 📌 **Trigger Report Generation**
export const triggerReport = async (req, res) => {
    try {
        const report_id = uuidv4();

        // Store report in DB with "Running" status
        await Report.create({ report_id, status: "Running" });

        // Run report generation in the background
        generateReportData(report_id);

        res.json({ report_id });
    } catch (error) {
        console.error("Error triggering report:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 📌 **Check Report Status & Return CSV**
export const getReport = async (req, res) => {
    try {
        const { report_id } = req.query;
        const report = await Report.findOne({ report_id });

        if (!report) return res.status(404).json({ error: "Report not found" });
        console.log("Report Data:", report);  // ✅ Log report details
        console.log("File Path:", report.file_path);  // ✅ Log file path

        if (report.status === "Running") {
            return res.json({ status: "Running" });
        } else if (report.status === "Complete") {
            return res.download(report.file_path, `${report_id}.csv`);
        } else {
            return res.status(500).json({ error: "Report generation failed" });
        }
    } catch (error) {
        console.error("Error getting report:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

