import mongoose from "mongoose";

const timezoneSchema = new mongoose.Schema({
  store_id: String,
  timezone_str: String,
});

export default mongoose.model("Timezone", timezoneSchema);

