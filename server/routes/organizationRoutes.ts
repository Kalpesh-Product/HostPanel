// @ts-nocheck
import { Router } from "express";
import {
  assignOrganizationActingManager,
  assignOrganizationDepartmentManager,
  getOrganizationOverview,
  inviteOrganizationMember,
  removeOrganizationActingManager,
  saveOrganizationDepartment,
  toggleOrganizationMemberStatus,
} from "../controllers/organizationControllers.js";

const router = Router();

router.get("/overview", getOrganizationOverview);
router.post("/departments", saveOrganizationDepartment);
router.put("/departments/:departmentId", saveOrganizationDepartment);
router.patch("/departments/:departmentId/manager", assignOrganizationDepartmentManager);
router.post("/departments/:departmentId/acting-manager", assignOrganizationActingManager);
router.delete(
  "/departments/:departmentId/acting-manager/:assignedUserId",
  removeOrganizationActingManager,
);
router.post("/members/invite", inviteOrganizationMember);
router.patch("/members/:memberId/status", toggleOrganizationMemberStatus);

export default router;
