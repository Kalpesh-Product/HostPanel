// @ts-nocheck
import { Router } from "express";
import { getNomadListingStatusProxy } from "../controllers/nomadListingStatusProxyControllers.js";

const router = Router();

router.get("/:companyId", getNomadListingStatusProxy);

export default router;
