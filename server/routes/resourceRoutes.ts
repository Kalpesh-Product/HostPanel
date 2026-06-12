import express from "express";
import {
    assignResource,
    createResource,
    deleteResource,
    listResources,
    releaseResourceAssignment,
    updateResource,
} from "../controllers/resourceController.js";

const router = express.Router();

router.get("/", listResources);
router.post("/", createResource);
router.patch("/:resourceId", updateResource);
router.patch("/:resourceId/assignment", assignResource);
router.delete("/:resourceId/assignment", releaseResourceAssignment);
router.delete("/:resourceId", deleteResource);

export default router;
