import express from "express";
import { getMyCalendar, createCalendarEvent, respondToCalendarEvent } from "../controllers/calendarController.js";

const router = express.Router();

router.get("/my-calendar", getMyCalendar);
router.post("/events", createCalendarEvent);
router.post("/events/:id/respond", respondToCalendarEvent);

export default router;