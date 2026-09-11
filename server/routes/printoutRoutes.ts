import express from "express";
import {
    createPrintoutRequest,
    getPrintoutRequests,
    getPrintoutRequestById,
    updatePrintoutRequest,
} from "../controllers/printoutController.js";
import verifyJwt from "../middlewares/verifyJwt.js";
import { uploadDocuments } from "../config/multerConfig.js";

const router = express.Router();

router.use(verifyJwt);

router.post("/", uploadDocuments.array("attachments", 5), createPrintoutRequest); // POST /api/printouts
router.get("/", getPrintoutRequests);                                            // GET /api/printouts
router.get("/:id", getPrintoutRequestById);                                      // GET /api/printouts/:id
router.patch("/:id", updatePrintoutRequest);                                     // PATCH /api/printouts/:id

export default router;
