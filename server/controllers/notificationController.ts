// @ts-nocheck
import { Request, Response } from "express";
import { Notification } from "../models/Notification.js";

const getCurrentWorkspaceId = (req: Request) => {
  return (
    (req as any).workspaceMembership?.workspace ||
    (req as any).user?.activeWorkspaceId ||
    (req as any).user?.activeWorkspace ||
    (req as any).user?.primaryWorkspace ||
    (req as any).user?.workspaceId ||
    (req as any).query?.workspaceId ||
    (req as any).body?.workspaceId
  );
};

const getCurrentUserId = (req: Request) => {
  return (req as any).user?._id || (req as any).user?.id || (req as any).user || null;
};

// Get current user's notifications
export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = getCurrentUserId(req);

    if (!workspaceId || !userId) {
      return res.status(400).json({ message: "Workspace and user are required" });
    }

    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const notifications = await Notification.find({
      workspaceId,
      recipientUserId: userId,
      $or: [
        { scheduledFor: null },
        { scheduledFor: { $lte: new Date() } },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("actorUserId", "name firstName lastName email profilePicture")
      .lean();

    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

// Get unread count
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = getCurrentUserId(req);

    if (!workspaceId || !userId) {
      return res.status(400).json({ message: "Workspace and user are required" });
    }

    const count = await Notification.countDocuments({
      workspaceId,
      recipientUserId: userId,
      readAt: null,
      $or: [
        { scheduledFor: null },
        { scheduledFor: { $lte: new Date() } },
      ],
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return res.status(500).json({ message: "Failed to fetch unread count" });
  }
};

// Mark single notification as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getCurrentUserId(req);

    if (!id) {
      return res.status(400).json({ message: "Notification ID is required" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientUserId: userId },
      { readAt: new Date() },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({ message: "Notification marked as read", data: notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ message: "Failed to mark notification as read" });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = getCurrentUserId(req);

    if (!workspaceId || !userId) {
      return res.status(400).json({ message: "Workspace and user are required" });
    }

    const result = await Notification.updateMany(
      {
        workspaceId,
        recipientUserId: userId,
        readAt: null,
      },
      { readAt: new Date() },
    );

    return res.status(200).json({
      message: "All notifications marked as read",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
};

// Delete a notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getCurrentUserId(req);

    if (!id) {
      return res.status(400).json({ message: "Notification ID is required" });
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipientUserId: userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
};

// Create a notification (internal helper, also exposed as API for admin use)
export const createNotification = async (req: Request, res: Response) => {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = getCurrentUserId(req);

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace is required" });
    }

    const {
      recipientUserId,
      type,
      category = "system",
      title,
      description,
      entityType = "",
      entityId = null,
      entityCode = "",
      targetUrl = "",
      data = {},
      priority = "normal",
      isActionRequired = false,
      dedupeKey = undefined,
      scheduledFor = null,
    } = req.body || {};

    if (!recipientUserId || !type || !title || !description) {
      return res.status(400).json({ message: "recipientUserId, type, title, and description are required" });
    }

    // Check deduplication
    if (dedupeKey) {
      const existing = await Notification.findOne({
        workspaceId,
        recipientUserId,
        dedupeKey,
      }).lean();
      if (existing) {
        return res.status(200).json({ message: "Duplicate notification skipped", data: existing });
      }
    }

    const notification = await Notification.create({
      workspaceId,
      recipientUserId,
      actorUserId: userId,
      type,
      category,
      title,
      description,
      entityType,
      entityId,
      entityCode,
      targetUrl,
      data,
      priority,
      isActionRequired,
      dedupeKey,
      scheduledFor,
    });

    return res.status(201).json({ message: "Notification created", data: notification });
  } catch (error) {
    console.error("Error creating notification:", error);
    return res.status(500).json({ message: "Failed to create notification" });
  }
};
