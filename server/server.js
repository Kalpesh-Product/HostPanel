import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import { corsConfig } from "./config/corsConfig.js";
import verifyJwt from "./middlewares/verifyJwt.js";

const app = express();
dotenv.config();
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.DB_URL);

app.use(cors(corsConfig));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth",  authRoutes);
app.get("/",verifyJwt, (req, res) => {
  res.send("API is running....");
});

mongoose.connection.once("open", () => {
    console.log("connected to mongoDB")
  app.listen(PORT, () => {
    console.log(`server is running on PORT ${PORT}`);
  });
});
