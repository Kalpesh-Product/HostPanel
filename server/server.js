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
import listingRoutes from "./routes/listingRoutes.js";
import hostUserRoutes from "./routes/hostUserRoutes.js";

const app = express();
dotenv.config();
const PORT = process.env.PORT || 5006;

mongoose.connect(process.env.DB_URL);

app.use(cors(corsConfig));
app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/editor", verifyJwt, websiteTemplateRoutes);
app.use("/api/services", verifyJwt, serviceRoutes);
app.use("/api/leads", verifyJwt, leadsRoutes);
app.use("/api/listings", verifyJwt, listingRoutes);
app.use("/api/profile", verifyJwt, hostUserRoutes);

mongoose.connection.once("open", () => {
  console.log("connected to mongoDB");
  app.listen(PORT, () => {
    console.log(`server is running on PORT ${PORT}`);
  });
});
