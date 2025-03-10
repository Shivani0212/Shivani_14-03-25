import mongoose from "mongoose";

const storeStatusSchema = new mongoose.Schema({
  store_id: String,
  timestamp_utc: Date,
  status: String,
});

export default mongoose.model("StoreStatus", storeStatusSchema);

