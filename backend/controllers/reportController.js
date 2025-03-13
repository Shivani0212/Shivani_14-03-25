const moment = require("moment-timezone");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const StoreStatus = require("../models/StoreStatus");
const Timezone = require("../models/timezone");
const MenuHours = require("../models/MenuHours");
const Report = require("../models/Report");
const { parseAsync } = require("json2csv");


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

        const timeRanges = {
            lastHour: maxTimestamp.clone().subtract(1, "hours"),
            lastDay: maxTimestamp.clone().subtract(24, "hours"),
            lastWeek: maxTimestamp.clone().subtract(7, "days"),
        };
        

        console.log("Fetching distinct store IDs from database...");
        const stores = await StoreStatus.aggregate([{ $group: { _id: "$store_id" } },{$limit:1}]);

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
                day_of_week: mh.day_of_week,
                start_time_local: mh.start_time_local,
                end_time_local: mh.end_time_local
            });
        });

        let reportData = [];
        
        console.log("Processing stores...");
        for (const store of stores) {
            const store_id = store._id;
            console.log(`Processing store: ${store_id}`);

            // Get store timezone (default to America/Chicago)
            const timezone = timezoneMap.get(store_id) || "America/Chicago";
            console.log(`Timezone : ${timezone}`);

            // Get store business hours (default to 24/7)
            const businessHours = businessHoursMap.get(store_id) || getDefaultBusinessHours();

            // Fetch all entries for the store
            const statuses = await StoreStatus.find({ store_id: store_id }).lean();
            
            // Convert timestamps to Date & sort
            statuses.forEach(entry => {
                entry.timestamp_utc = moment.utc(entry.timestamp_utc.replace(" UTC", "Z"));
            });
            statuses.sort((a, b) => a.timestamp_utc - b.timestamp_utc);

            // Function to compute uptime/downtime
            const computeUptimeDowntime = (filteredStatuses, rangeName) => {
                let uptime = 0, downtime = 0;
                let prevTimestamp = null;
                let prevStatus = null;

                for (const status of filteredStatuses) {
                    const timestamp = status.timestamp_utc.clone().tz(timezone);

                    // TODO - Ignore if outside business hours
                    // if (!isWithinBusinessHours(timestamp,businessHours)) continue; 

                    if (prevTimestamp) {
                        const diffMinutes = timestamp.diff(prevTimestamp, "minutes");

                        if (prevStatus === "active") uptime += diffMinutes;
                        else downtime += diffMinutes;
                    }

                    prevTimestamp = timestamp;
                    prevStatus = status.status;
                }

                console.log(`Uptime for ${rangeName}: ${uptime} mins`);
                console.log(`Downtime for ${rangeName}: ${downtime} mins`);

                return { uptime, downtime };
            };


            // Compute separately for each range
            const uptimeDowntimeLastHour = computeUptimeDowntime(
                statuses.filter(entry => entry.timestamp_utc >= timeRanges.lastHour),
                "lastHour"
            );
            const uptimeDowntimeLastDay = computeUptimeDowntime(
                statuses.filter(entry => entry.timestamp_utc >= timeRanges.lastDay),
                "lastDay"
            );
            const uptimeDowntimeLastWeek = computeUptimeDowntime(
                statuses.filter(entry => entry.timestamp_utc >= timeRanges.lastWeek),
                "lastWeek"
            );


            reportData.push({
                store_id,
                uptime_last_hour: Math.max(uptimeDowntimeLastHour.uptime, 0),  
                uptime_last_day: (Math.max(uptimeDowntimeLastDay.uptime, 1) / 60).toFixed(2),
                uptime_last_week: (Math.max(uptimeDowntimeLastWeek.uptime, 1) / 60).toFixed(2),
                downtime_last_hour: Math.max(uptimeDowntimeLastHour.downtime, 0),  
                downtime_last_day: (Math.max(uptimeDowntimeLastDay.downtime, 1) / 60).toFixed(2),
                downtime_last_week: (Math.max(uptimeDowntimeLastWeek.downtime, 1) / 60).toFixed(2),
            });
        
        }

        console.log("Generating CSV report...");
        const csv = await parseAsync(reportData);
        const filePath = path.join(`${__dirname}/../reports`, `${report_id}.csv`);
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