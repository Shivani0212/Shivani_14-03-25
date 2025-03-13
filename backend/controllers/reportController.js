const mongoose = require("mongoose");
const moment = require("moment-timezone");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser"); // For reading CSV files
const StoreStatus = require("../models/StoreStatus");
const Timezone = require("../models/Timezone");
const MenuHours = require("../models/MenuHours");
const Report = require("../models/Report");
const { parseAsync } = require("json2csv");
 // For CSV conversion
const reportsDir = "./reports";
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}


const generateReportData = async (report_id) => {
    try {
        console.log("Fetching max timestamp from StoreStatus...");

        // Get the maximum timestamp from StoreStatus dataset
        const maxTimestampRecord = await StoreStatus.findOne().sort({ timestamp_utc: -1 }).select("timestamp_utc").lean();

        if (!maxTimestampRecord || !maxTimestampRecord.timestamp_utc) {
            throw new Error("No store status data found!");
        }

        // Fix: Ensure timestamp is correctly parsed into ISO format
        const maxTimestamp = moment.utc(new Date(maxTimestampRecord.timestamp_utc.trim()));

        console.log(`Using max timestamp as current time: ${maxTimestamp.format()}`);

        // Define fixed reporting intervals relative to this max timestamp
        const timeRanges = {
            lastHour: maxTimestamp.clone().subtract(1, "hours"),
            lastDay: maxTimestamp.clone().subtract(24, "hours"),
            lastWeek: maxTimestamp.clone().subtract(7, "days"),
        };

        console.log("Fetching store IDs from database...");
        const stores = await StoreStatus.aggregate([{ $group: { _id: "$store_id" } },{$limit:2}]);

        // Fetch all timezone data
        const timezoneData = await Timezone.find().lean();
        const timezoneMap = new Map(timezoneData.map(tz => [tz.store_id, tz.timezone_str || "America/Chicago"]));

        // Fetch all business hours
        const menuHoursData = await MenuHours.find().lean();
        const businessHoursMap = new Map();
        menuHoursData.forEach(mh => {
            if (!businessHoursMap.has(mh.store_id)) {
                businessHoursMap.set(mh.store_id, []);
            }
            businessHoursMap.get(mh.store_id).push({
                day_of_week: parseInt(mh.dayOfWeek, 10), // Fix: Convert `dayOfWeek` to an integer
                start_time_local: mh.start_time_local,
                end_time_local: mh.end_time_local
            });
        });

        console.log("Fetching all status updates...");
        const statusesData = await StoreStatus.find({
            timestamp_utc: { $gte: timeRanges.lastWeek.toDate() }
        }).sort({ store_id: 1, timestamp_utc: 1 }).lean();

        // Map store_id → array of status records
        const storeStatusMap = new Map();
        statusesData.forEach(status => {
            if (!storeStatusMap.has(status.store_id)) {
                storeStatusMap.set(status.store_id, []);
            }
            storeStatusMap.get(status.store_id).push({
                status: status.status,
                timestamp_utc: moment.utc(new Date(status.timestamp_utc.trim())) // Fix: Ensure correct parsing
            });
        });

        let reportData = [];
        
        console.log("Processing stores...");
        for (const store of stores) {
            const store_id = store._id;
            console.log(`Processing store: ${store_id}`);

            // Get store timezone (default to America/Chicago)
            const timezone = timezoneMap.get(store_id) || "America/Chicago";

            // Get store business hours (default to 24/7)
            let storeBusinessHours = businessHoursMap.get(store_id) || getDefaultBusinessHours();

            // Get store statuses from our pre-fetched map
            const statuses = storeStatusMap.get(store_id) || [];

            if (statuses.length === 0) {
                console.warn(`No status records found for store ${store_id}. Skipping.`);
                continue;
            }

            let uptime = { lastHour: 0, lastDay: 0, lastWeek: 0 };
            let downtime = { lastHour: 0, lastDay: 0, lastWeek: 0 };

            let prevTimestamp = null;
            let prevStatus = null;

            for (let i = 0; i < statuses.length; i++) {
                let status = statuses[i];
                let timestamp = status.timestamp_utc.tz(timezone);

                if (!prevTimestamp) {
                    prevTimestamp = timestamp;
                    prevStatus = status.status;
                    continue;
                }

                let diffMinutes = timestamp.diff(prevTimestamp, "minutes");
                const dayOfWeek = timestamp.isoWeekday() - 1; // Convert to 0=Monday, 6=Sunday

                let menuHours = storeBusinessHours.filter(m => m.day_of_week === dayOfWeek);
                if (menuHours.length === 0) {
                    menuHours = [{ start_time_local: "00:00:00", end_time_local: "23:59:59" }];
                }

                for (let hours of menuHours) {
                    let startTime = moment.tz(
                        timestamp.format("YYYY-MM-DD") + " " + hours.start_time_local,
                        timezone
                    );
                    let endTime = moment.tz(
                        timestamp.format("YYYY-MM-DD") + " " + hours.end_time_local,
                        timezone
                    );
                    let isWithinOperatingHours = timestamp.isBetween(startTime, endTime, null, "[]");

                    if (isWithinOperatingHours) {
                        if (prevStatus === "active") {
                            updateUptimeDowntime(uptime, timestamp, diffMinutes, timeRanges);
                        } else {
                            updateUptimeDowntime(downtime, timestamp, diffMinutes, timeRanges);
                        }
                    }
                }

                prevTimestamp = timestamp;
                prevStatus = status.status;
            }

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

        console.log("Generating CSV report...");
        const csv = await parseAsync(reportData);
        const filePath = path.join(__dirname, `${report_id}.csv`);
        fs.writeFileSync(filePath, csv);
        await Report.findOneAndUpdate({ report_id }, { status: "Complete", file_path: filePath });

        console.log(`Report saved at ${filePath}`);
    } catch (error) {
        console.error("Error generating report:", error);
        await Report.findOneAndUpdate({ report_id }, { status: "Error" });
    }
};

/**
 * Helper function to update uptime or downtime.
 */
function updateUptimeDowntime(obj, timestamp, diffMinutes, timeRanges) {
    if (timestamp.isAfter(timeRanges.lastHour)) obj.lastHour += diffMinutes;
    if (timestamp.isAfter(timeRanges.lastDay)) obj.lastDay += diffMinutes;
    obj.lastWeek += diffMinutes;
}

/**
 * Returns default business hours (24/7).
 */
function getDefaultBusinessHours() {
    return Array.from({ length: 7 }, (_, day) => ({
        day_of_week: day,
        start_time_local: "00:00:00",
        end_time_local: "23:59:59"
    }));
}

// **Trigger Report Generation API**
const triggerReport = async (req, res) => {
    //console.log("point 1");
    try {
        const report_id = uuidv4();
        await Report.create({ report_id, status: "Running" });

        generateReportData(report_id);

        res.json({ report_id });
    } catch (error) {
        console.error("Error triggering report:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


// **Aggregate Report Data from CSV Files**
const getAggregatedReport = async (req, res) => {
    try {
        if (!fs.existsSync(reportsDir)) {
            return res.status(404).json({ error: "No reports found" });
        }

        let aggregatedData = {};

        fs.readdirSync(reportsDir).forEach((file) => {
            if (file.endsWith(".csv")) {
                const filePath = path.join(reportsDir, file);
                const fileData = fs.readFileSync(filePath, "utf8");

                fileData
                    .split("\n")
                    .slice(1)
                    .forEach((line) => {
                        const [store_id, uptime_last_hour, uptime_last_day, uptime_last_week, downtime_last_hour, downtime_last_day, downtime_last_week] = line.split(",");

                        if (!store_id) return;

                        if (!aggregatedData[store_id]) {
                            aggregatedData[store_id] = {
                                uptime_last_hour: 0,
                                uptime_last_day: 0,
                                uptime_last_week: 0,
                                downtime_last_hour: 0,
                                downtime_last_day: 0,
                                downtime_last_week: 0,
                            };
                        }

                        aggregatedData[store_id].uptime_last_hour += parseFloat(uptime_last_hour);
                        aggregatedData[store_id].uptime_last_day += parseFloat(uptime_last_day);
                        aggregatedData[store_id].uptime_last_week += parseFloat(uptime_last_week);
                        aggregatedData[store_id].downtime_last_hour += parseFloat(downtime_last_hour);
                        aggregatedData[store_id].downtime_last_day += parseFloat(downtime_last_day);
                        aggregatedData[store_id].downtime_last_week += parseFloat(downtime_last_week);
                    });
            }
        });

        res.json(aggregatedData);
    } catch (error) {
        console.error("Error aggregating report:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// **Check Report Status & Return CSV**
const getReport = async (req, res) => {
    try {
        const { report_id } = req.query;
        const report = await Report.findOne({ report_id });

        if (!report) return res.status(404).json({ error: "Report not found" });

        if (report.status === "Running") return res.json({ status: "Running" });
        if (report.status === "Complete") return res.download(report.file_path, `${report_id}.csv`);

        return res.status(500).json({ error: "Report generation failed" });
    } catch (error) {
        console.error("Error getting report:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports={triggerReport, getReport, getAggregatedReport};