import mongoose from "mongoose";

const StoreStatusSchema = new mongoose.Schema({
    store_id: { type: String, required: true }, // UUID as a string
    status: { type: String, enum: ["active", "inactive"], required: true }, // String enum
    timestamp_utc: { type: Date, required: true } // Stored as a Date object
});

export default mongoose.model("StoreStatus", StoreStatusSchema);

