// @ts-nocheck
import WorkspaceMember from "../models/WorkspaceMember.js";

// Mongoose Map keys cannot contain dots or dollar-prefixed path segments.
const TOUR_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,119}$/;
const TOUR_STATUSES = new Set(["completed", "skipped"]);

const getActiveMembership = (req) => {
  const workspaceId = String(req.workspaceMembership?.workspace || "").trim();
  if (!workspaceId || !req.user) return null;

  return WorkspaceMember.findOne({
    workspace: workspaceId,
    user: req.user,
    isActive: true,
  });
};

export const getTourProgress = async (req, res, next) => {
  try {
    const membershipQuery = getActiveMembership(req);
    const membership = membershipQuery
      ? await membershipQuery.select("tourProgress").exec()
      : null;
    if (!membership) {
      return res.status(404).json({ message: "Active workspace membership not found." });
    }

    const progress = membership.tourProgress
      ? Object.fromEntries(membership.tourProgress.entries())
      : {};

    return res.status(200).json({
      message: "Tour progress fetched successfully.",
      data: { progress },
    });
  } catch (error) {
    next(error);
  }
};

export const saveTourProgress = async (req, res, next) => {
  try {
    const tourKey = String(req.params?.tourKey || "").trim().toLowerCase();
    const version = Number(req.body?.version);
    const status = String(req.body?.status || "").trim().toLowerCase();

    if (!TOUR_KEY_PATTERN.test(tourKey)) {
      return res.status(400).json({ message: "Invalid tour key." });
    }
    if (!Number.isInteger(version) || version < 1) {
      return res.status(400).json({ message: "Tour version must be a positive integer." });
    }
    if (!TOUR_STATUSES.has(status)) {
      return res.status(400).json({ message: "Tour status must be completed or skipped." });
    }

    const membership = await getActiveMembership(req);
    if (!membership) {
      return res.status(404).json({ message: "Active workspace membership not found." });
    }

    membership.tourProgress.set(tourKey, {
      version,
      status,
      updatedAt: new Date(),
    });
    await membership.save();

    return res.status(200).json({
      message: "Tour progress saved successfully.",
      data: {
        tourKey,
        progress: membership.tourProgress.get(tourKey),
      },
    });
  } catch (error) {
    next(error);
  }
};
