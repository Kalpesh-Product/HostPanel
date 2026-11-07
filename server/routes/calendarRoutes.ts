import express from "express";
import { getMyCalendar, createCalendarEvent } from "../controllers/calendarController.js";

const router = express.Router();

router.get("/my-calendar", getMyCalendar);
router.post("/events", createCalendarEvent);

export default router;