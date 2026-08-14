// @ts-nocheck
import { Router } from "express";
import {
  getDepartments,
  assignOrganizationActingManager,
  assignOrganizationDepartmentManager,
  cancelOrganizationInvite,
  deleteOrganizationDepartment,
  getOrganizationOverview,
  inviteOrganizationMember,
  linkOrganizationMember,
  removeOrganizationActingManager,
  removeOrganizationMemberWorkspaceAccess,
  saveOrganizationDepartment,
  transferOrganizationMember,
  transferOrganizationOwnership,
  toggleOrganizationMemberStatus,
  updateOrganizationMemberAccess,
  updateOrganizationMemberShift,
  updateOrganizationMemberRole,
} from "../controllers/organizationControllers.js";

const router = Router();

router.get("/overview", getOrganizationOverview);
router.get("/departments", getDepartments);
router.post("/departments", saveOrganizationDepartment);
router.put("/departments/:departmentId", saveOrganizationDepartment);
router.delete("/departments/:departmentId", deleteOrganizationDepartment);
router.patch("/departments/:departmentId/manager", assignOrganizationDepartmentManager);
router.post("/departments/:departmentId/acting-manager", assignOrganizationActingManager);
router.delete(
  "/departments/:departmentId/acting-manager/:assignedUserId",
  removeOrganizationActingManager,
);
router.post("/members/invite", inviteOrganizationMember);
router.delete("/members/:memberId/invite", cancelOrganizationInvite);
router.patch("/members/:memberId/status", toggleOrganizationMemberStatus);
router.patch("/members/:memberId/role", updateOrganizationMemberRole);
router.patch("/members/:memberId/access", updateOrganizationMemberAccess);
router.patch("/members/:memberId/shift", updateOrganizationMemberShift);
router.post("/members/:memberId/transfer", transferOrganizationMember);
router.post("/members/:memberId/link-workspace", linkOrganizationMember);
router.delete("/members/:memberId/workspace-access", removeOrganizationMemberWorkspaceAccess);
router.post("/ownership/transfer", transferOrganizationOwnership);

export default router;