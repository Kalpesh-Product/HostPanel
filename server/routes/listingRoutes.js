import { Router } from "express";
import upload from "../config/multerConfig.js";

import {
  activateProduct,
  createCompanyListing,
  editCompanyListing,
  getAllCompanyListings,
  getCompanyListings,
} from "../controllers/listingControllers.js";
const router = Router();

router.post("/add-company-listing", upload.any(), createCompanyListing);
router.patch("/edit-company-listing", upload.any(), editCompanyListing);
router.patch("/activate-product", activateProduct);
router.get("/get-companies-listings", getAllCompanyListings);
router.get("/get-company-listings", getCompanyListings);

export default router;
