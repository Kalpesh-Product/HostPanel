import express from "express";
import {
    assignResource,
    assignResourceSeat,
    createResource,
    deleteResource,
    getResourceSeatAssignments,
    getResourceSeatSummary,
    listResources,
    listResourceSeats,
    releaseResourceAssignment,
    releaseResourceSeatAssignment,
    updateResource,
} from "../controllers/resourceController.js";

const router = express.Router();

router.get("/", listResources);
router.post("/", createResource);
router.get("/seat-summary", getResourceSeatSummary);
router.get("/seat-assignments", getResourceSeatAssignments);
router.get("/:resourceId/seats", listResourceSeats);
router.patch("/:resourceId/seats/:seatNumber/assignment", assignResourceSeat);
router.delete("/:resourceId/seats/:seatNumber/assignment", releaseResourceSeatAssignment);
router.patch("/:resourceId", updateResource);
router.patch("/:resourceId/assignment", assignResource);
router.delete("/:resourceId/assignment", releaseResourceAssignment);
router.delete("/:resourceId", deleteResource);

export default router;
