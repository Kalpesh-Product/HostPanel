import express from "express";
import {
    createPricingPackage,
    deletePricingPackage,
    getAvailableTenantResources,
    listPricingPackages,
    updatePricingPackage,
} from "../controllers/plansPricing.controller.js";

const router = express.Router();

router.get("/", listPricingPackages);
router.get("/available-tenant-resources", getAvailableTenantResources);
router.post("/", createPricingPackage);
router.patch("/:packageId", updatePricingPackage);
router.delete("/:packageId", deletePricingPackage);

export default router;
