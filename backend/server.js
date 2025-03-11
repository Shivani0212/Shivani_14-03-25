import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config();
const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

app.use("/api", reportRoutes);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



