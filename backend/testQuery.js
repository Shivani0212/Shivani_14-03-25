import mongoose from "mongoose";
import { Report } from "./models/Report.js"; // Ensure the path is correct

const MONGO_URI = "mongodb+srv://Shivani:Jhashivani02@cluster0.joefmhp.mongodb.net/store_monitor";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log("MongoDB Connected...");

  const reports = await Report.find({});
  console.log("Reports:", reports);

  mongoose.connection.close();
}).catch(err => console.error("DB Error:", err));
