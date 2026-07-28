// @ts-nocheck
import WorkspaceMember from "../models/WorkspaceMember.js";

// Mongoose Map keys cannot contain dots or dollar-prefixed path segments.
const TOUR_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,119}$/;
const TOUR_STATUSES = new Set(["completed", "skipped"]);

const getActiveMemberships = (req) => {
  if (!req.user) return null;

  return WorkspaceMember.find({
    user: req.user,
    isActive: true,
  });
};

export const getTourProgress = async (req, res, next) => {
  try {
    const membershipsQuery = getActiveMemberships(req);
    const memberships = membershipsQuery
      ? await membershipsQuery.select("tourProgress").exec()
      : [];
    if (!memberships.length) {
      return res.status(404).json({ message: "Active workspace memberships not found." });
    }

    const progress = {};
    for (const membership of memberships) {
      for (const [tourKey, storedEntry] of membership.tourProgress?.entries?.() || []) {
        const entry = storedEntry?.toObject ? storedEntry.toObject() : storedEntry;
        const current = progress[tourKey];
        const currentUpdatedAt = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;
        const nextUpdatedAt = entry?.updatedAt ? new Date(entry.updatedAt).getTime() : 0;
        if (
          !current ||
          Number(entry?.version || 0) > Number(current?.version || 0) ||
          (
            Number(entry?.version || 0) === Number(current?.version || 0) &&
            nextUpdatedAt > currentUpdatedAt
          )
        ) {
          progress[tourKey] = entry;
        }
      }
    }

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

    const progressEntry = {
      version,
      status,
      updatedAt: new Date(),
    };
    const updateResult = await WorkspaceMember.updateMany(
      { user: req.user, isActive: true },
      { $set: { [`tourProgress.${tourKey}`]: progressEntry } },
    );
    if (!updateResult.matchedCount) {
      return res.status(404).json({ message: "Active workspace memberships not found." });
    }

    return res.status(200).json({
      message: "Tour progress saved successfully.",
      data: {
        tourKey,
        progress: progressEntry,
      },
    });
  } catch (error) {
    next(error);
  }
};
