// @ts-nocheck
import { Router } from "express";
import {
    createAsset,
    deleteAsset,
    getAssetById,
    getAssetSummary,
    getAssets,
    transferAsset,
    updateAsset
} from "../controllers/assetController.js";

const router = Router();

router.get("/summary", getAssetSummary);
router.get("/", getAssets);
router.post("/", createAsset);
router.get("/:assetId", getAssetById);
router.patch("/:assetId", updateAsset);
router.patch("/:assetId/transfer", transferAsset);
router.delete("/:assetId", deleteAsset);
export default router;