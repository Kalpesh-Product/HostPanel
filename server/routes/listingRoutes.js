import { Router } from "express";
import upload, { uploadImages } from "../config/multerConfig.js";

import {
  activateProduct,
  createCompanyListing,
  editCompanyListing,
  getAllCompanyListings,
  getCompanyListings,
} from "../controllers/listingControllers.js";
const router = Router();

router.post("/add-company-listing", uploadImages.any(), createCompanyListing);
router.patch("/edit-company-listing", uploadImages.any(), editCompanyListing);
router.patch("/activate-product", activateProduct);
router.get("/get-companies-listings", getAllCompanyListings);
router.get("/get-company-listings", getCompanyListings);

export default router;
