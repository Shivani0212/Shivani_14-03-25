// models/Timezone.js

const mongoose=require("mongoose");
const timezoneSchema = new mongoose.Schema({
    store_id: String,
    timezone_str: String,
}); // Explicitly set collection name

module.exports= mongoose.model("Timezone", timezoneSchema);



