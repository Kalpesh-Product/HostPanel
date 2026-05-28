// @ts-nocheck

export const ORGANIZATION_PERMISSION_KEYS = {
  module: "organization-management",
  tabs: {
    users: "org_tab_users",
    departments: "org_tab_departments",
  },
  actions: {
    inviteMember: "org_users_invite_member",
    changeRole: "org_users_change_role",
    toggleAccess: "org_users_toggle_access",
    createDepartment: "org_departments_create",
    editDepartment: "org_departments_edit",
    assignDepartmentManager: "org_departments_assign_manager",
    assignActingManager: "org_departments_assign_acting_manager",
    removeActingManager: "org_departments_remove_acting_manager",
  },
};

export const ORGANIZATION_MEMBER_GRANT_ALIASES = new Set([
  ORGANIZATION_PERMISSION_KEYS.module,
  ...Object.values(ORGANIZATION_PERMISSION_KEYS.tabs),
  ...Object.values(ORGANIZATION_PERMISSION_KEYS.actions),
]);

