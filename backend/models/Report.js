import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  report_id: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["Active", "Inactive", "Complete"],  
    default: "Active",
  },
  
  csv_data: {
    type: String, // File path for the generated report
    required: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export const Report = mongoose.model("Report", ReportSchema);
