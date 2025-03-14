const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
    report_id: { type: String, required: true, unique: true },
    data: { type: Array, required: true },
    file_path: { type: String, required: false },  // Add this field
    status: { type: String, enum: ["Running", "Complete"], default: "Running" },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Report", reportSchema);


