import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import { corsConfig } from "./config/corsConfig.js";
import verifyJwt from "./middlewares/verifyJwt.js";
import websiteTemplateRoutes from "./routes/websiteTemplateRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import leadsRoutes from "./routes/leadsRoutes.js";

const app = express();
dotenv.config();
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.DB_URL);

app.use(cors(corsConfig));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/editor", verifyJwt, websiteTemplateRoutes);
app.use("/api/services", verifyJwt, serviceRoutes);
app.use("/api/leads", verifyJwt, leadsRoutes);

mongoose.connection.once("open", () => {
  console.log("connected to mongoDB");
  app.listen(PORT, () => {
    console.log(`server is running on PORT ${PORT}`);
  });
});
