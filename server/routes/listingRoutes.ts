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
import {
  getExistingCompanyClaimStatus,
  getExistingCompanyListings,
  searchExistingCompanies,
  submitExistingCompanyClaim,
} from "../controllers/existingCompanyClaimControllers.js";
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

router.get("/existing-company/search", searchExistingCompanies);
router.get("/existing-company/status", getExistingCompanyClaimStatus);
router.get("/existing-company/:nomadsCompanyId/listings", getExistingCompanyListings);
router.post("/existing-company/claim", upload.any(), submitExistingCompanyClaim);

export default router;

