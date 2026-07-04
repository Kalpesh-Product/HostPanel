// @ts-nocheck
import express from "express";
import {
  listInventory,
  createInventory,
  updateInventory,
  allocateInventory,
  transferInventory,
  deleteInventory,
} from "../controllers/inventoryController.js";

const router = express.Router();

router.get("/", listInventory);
router.post("/", createInventory);
router.patch("/:inventoryId", updateInventory);
router.patch("/:inventoryId/allocate", allocateInventory);
router.patch("/:inventoryId/transfer", transferInventory);
router.delete("/:inventoryId", deleteInventory);

export default router;

