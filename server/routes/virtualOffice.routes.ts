// @ts-nocheck
import express from "express";
import {
  listVirtualOffices,
  getVirtualOffice,
  createVirtualOffice,
  updateVirtualOffice,
  deleteVirtualOffice,
  recordVirtualOfficeRentPayment,
} from "../controllers/virtualOfficeController.js";

const router = express.Router();

router.get("/", listVirtualOffices);
router.post("/", createVirtualOffice);
router.get("/:id", getVirtualOffice);
router.patch("/:id", updateVirtualOffice);
router.delete("/:id", deleteVirtualOffice);
router.post("/:id/rent-payments", recordVirtualOfficeRentPayment);

export default router;
