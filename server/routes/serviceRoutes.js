import { Router } from "express";
import {
  getServices,
  updateServices,
} from "../controllers/serviceControllers.js";

const router = Router();

router.patch("/update-services", updateServices);
router.get("/get-services", getServices);

export default router;
