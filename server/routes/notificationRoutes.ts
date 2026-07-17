// @ts-nocheck
import { Router } from "express";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
} from "../controllers/notificationController.js";

const router = Router();

router.get("/get-my-notifications", getMyNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/mark-as-read/:id", markAsRead);
router.patch("/mark-all-read", markAllAsRead);
router.delete("/:id", deleteNotification);
router.post("/", createNotification);

export default router;
