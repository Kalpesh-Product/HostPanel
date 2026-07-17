// @ts-nocheck
import { Notification } from "../models/Notification.js";

interface CreateNotificationParams {
  workspaceId: string;
  recipientUserId: string;
  actorUserId?: string | null;
  type: string;
  category: "task" | "ticket" | "leave" | "meeting" | "system";
  title: string;
  description: string;
  entityType?: string;
  entityId?: string | null;
  entityCode?: string;
  targetUrl?: string;
  data?: Record<string, any>;
  priority?: "low" | "normal" | "high";
  isActionRequired?: boolean;
  dedupeKey?: string;
  allowSelf?: boolean;
}

/**
 * Create a notification document. Designed to be called fire-and-forget from
 * any controller. Swallows errors so notification failures never block the
 * main request.
 *
 * By default, self-notifications (actor === recipient) are skipped.
 * Set `allowSelf: true` to override this (e.g. for confirmation notifications).
 */
export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const {
      workspaceId,
      recipientUserId,
      actorUserId = null,
      type,
      category,
      title,
      description,
      entityType = "",
      entityId = null,
      entityCode = "",
      targetUrl = "",
      data = {},
      priority = "normal",
      isActionRequired = false,
      dedupeKey,
      allowSelf = false,
    } = params;

    if (!workspaceId || !recipientUserId || !type || !title || !description) {
      return null;
    }

    // Skip self-notifications unless explicitly allowed
    if (!allowSelf && actorUserId && String(actorUserId) === String(recipientUserId)) {
      return null;
    }

    // Deduplication check
    if (dedupeKey) {
      const existing = await Notification.findOne({
        workspaceId,
        recipientUserId,
        dedupeKey,
      }).lean();
      if (existing) return existing;
    }

    const notification = await Notification.create({
      workspaceId,
      recipientUserId,
      actorUserId,
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
    });

    return notification;
  } catch (error) {
    console.error("Notification creation failed:", error);
    return null;
  }
};

/**
 * Send notifications to multiple recipients for the same event.
 */
export const notifyMultipleRecipients = async (
  recipients: string[],
  params: Omit<CreateNotificationParams, "recipientUserId">,
) => {
  const results = await Promise.allSettled(
    recipients.map((recipientUserId) =>
      createNotification({ ...params, recipientUserId })
    ),
  );
  return results;
};
