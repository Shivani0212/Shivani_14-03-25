// models/Timezone.js

const mongoose=require("mongoose");
const timezoneSchema = new mongoose.Schema({
    store_id: String,
    timezone_str: String,
});

module.exports= mongoose.model("Timezone", timezoneSchema);



