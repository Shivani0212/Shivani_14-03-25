// import mongoose from "mongoose";

// const ReportSchema = new mongoose.Schema({
//   report_id: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   status: {
//     type: String,
//     enum: ["Pending", "In Progress", "Completed", "Running"], // Add "Running"
//     required: true
// },
  
//   csv_data: {
//     type: String, // File path for the generated report
//     required: false,
//   },
//   created_at: {
//     type: Date,
//     default: Date.now,
//   },
// });
// const Report = mongoose.model("Report", ReportSchema);
// export default Report;

// //export const Report = mongoose.model("Report", ReportSchema);
const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
    report_id: { type: String, required: true, unique: true },
    data: { type: Array, required: true },
    file_path: { type: String, required: false },  // Add this field
    status: { type: String, enum: ["Running", "Complete"], default: "Running" },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Report", reportSchema);


