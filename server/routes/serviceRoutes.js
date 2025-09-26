import { Router } from "express";
import {
  getServices,
  requestServices,
} from "../controllers/serviceControllers.js";

const router = Router();

router.patch("/request-services", requestServices);
router.get("/get-services", getServices);

export default router;
