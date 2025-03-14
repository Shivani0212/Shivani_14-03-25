// models/StoreStatus.js
const mongoose = require("mongoose");

const storeStatusSchema = new mongoose.Schema({
    store_id: { type: String, required: true }, // UUID as a string
    status: { type: String, enum: ["active", "inactive"], required: true }, // String enum
    timestamp_utc: { type: Date, required: true } // Stored as a Date object
}); 

module.exports= mongoose.model("StoreStatus", storeStatusSchema);
