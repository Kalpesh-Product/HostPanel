// @ts-nocheck
import { Router } from "express";
import {
    createAssetRequest,
    fulfillAssetRequest,
    getAssetRequests,
    updateAssetRequestStatus,
} from "../controllers/assetRequestController.js";import {
    createAsset,
    deleteAsset,
    getAssetById,
    getAssetSummary,
    getAssets,
    releaseAssetAllocation,
    transferAsset,
    updateAsset
} from "../controllers/assetController.js";

const router = Router();

router.get("/requests", getAssetRequests);
router.post("/requests", createAssetRequest);
router.patch("/requests/:requestId/status", updateAssetRequestStatus);
router.post("/requests/:requestId/fulfill", fulfillAssetRequest);router.get("/summary", getAssetSummary);
router.get("/", getAssets);
router.post("/", createAsset);
router.get("/:assetId", getAssetById);
router.patch("/:assetId", updateAsset);
router.patch("/:assetId/transfer", transferAsset);
router.patch("/:assetId/allocations/:allocationId/release", releaseAssetAllocation);
router.delete("/:assetId", deleteAsset);
export default router;