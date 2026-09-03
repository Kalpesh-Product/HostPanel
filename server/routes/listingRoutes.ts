// @ts-nocheck
import { Router } from "express";
import upload from "../config/multerConfig.js";

import {
  activateProduct,
  createCompanyListing,
  deleteListing,
  editCompanyListing,
  getAllCompanyListings,
  getCompanyListings,
  requestCompaniesListing,
  requestNomadListingRecovery,
  setListingVisibility,
} from "../controllers/listingControllers.js";
const router = Router();

router.post("/add-company-listing", upload.any(), createCompanyListing);
router.patch("/edit-company-listing", upload.any(), editCompanyListing);
router.patch("/activate-product", activateProduct);
router.patch("/set-listing-visibility", setListingVisibility);
router.patch("/delete-listing", deleteListing);
router.patch("/request-listing-recovery", requestNomadListingRecovery);
router.get("/get-companies-listings", getAllCompanyListings);
router.get("/get-company-listings", getCompanyListings);
router.post("/request-companies-listing", requestCompaniesListing);

export default router;

