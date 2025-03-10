import mongoose from "mongoose";

const MenuHoursSchema = new mongoose.Schema({
  store_id: String,
  dayOfWeek: Number, // 0 = Monday, 6 = Sunday
  start_time_local: String,
  end_time_local: String,
});

export default mongoose.model("MenuHours", MenuHoursSchema);


