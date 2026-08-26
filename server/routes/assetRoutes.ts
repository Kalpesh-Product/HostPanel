// @ts-nocheck
import { Router } from "express";
import upload from "../config/multerConfig.js";
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
import {
    createCategory,
    createSubCategory,
    getCategories,
    getSubCategories,
    updateCategory,
    updateSubCategory,
} from "../controllers/assetCategoryController.js";

const router = Router();

const assetFileUpload = upload.fields([
    { name: "assetImage", maxCount: 1 },
    { name: "warrantyDocument", maxCount: 1 },
]);

router.get("/requests", getAssetRequests);
router.post("/requests", createAssetRequest);
router.patch("/requests/:requestId/status", updateAssetRequestStatus);
router.post("/requests/:requestId/fulfill", fulfillAssetRequest);router.get("/summary", getAssetSummary);

router.get("/get-category", getCategories);
router.post("/create-asset-category", createCategory);
router.patch("/update-asset-category", updateCategory);
router.get("/get-subcategory", getSubCategories);
router.post("/create-asset-subcategory", createSubCategory);
router.patch("/update-asset-subcategory", updateSubCategory);

router.get("/", getAssets);
router.post("/", assetFileUpload, createAsset);
router.get("/:assetId", getAssetById);
router.patch("/:assetId", assetFileUpload, updateAsset);
router.patch("/:assetId/transfer", transferAsset);
router.patch("/:assetId/allocations/:allocationId/release", releaseAssetAllocation);
router.delete("/:assetId", deleteAsset);
export default router;