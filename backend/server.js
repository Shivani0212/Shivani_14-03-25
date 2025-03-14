const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
//const router = require("./routes/reportRoutes");
const { triggerReport, getAggregatedReport, getReport } = require("./controllers/reportController");
dotenv.config();
const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

//app.use("/api", router);
app.get("/", (req,res) => res.send("hello world"));
app.post("/trigger_report", triggerReport);
app.get("/get_report", getReport);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



