import mongoose from "mongoose";

const menuHoursSchema = new mongoose.Schema({
    store_id: String,
    day_of_week: Number, // 0 = Sunday, 6 = Saturday
    start_time_local: String, // "09:00"
    end_time_local: String, // "22:00"
});

export default mongoose.model("MenuHours", menuHoursSchema);



