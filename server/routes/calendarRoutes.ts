import express from "express";
import { getMyCalendar } from "../controllers/calendarController.js";

const router = express.Router();

router.get("/my-calendar", getMyCalendar);

export default router;