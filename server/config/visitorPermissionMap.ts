// @ts-nocheck

export const VISITOR_PERMISSION_KEYS = {
  module: "visitor-management",
  pages: {
    addVisitor: "add_visitor",
    addClient: "add_client",
    manageVisitors: "manage_visitors",
    teamMembers: "visitor_team_members",
    reports: "visitor_reports",
  },
  tabs: {
    manageInternalVisitors: "visitors_manage_internal_visitors",
    manageExternalClients: "visitors_manage_external_clients",
  },
  actions: {
    createVisitor: "visitor_action_create",
    reviewVisitor: "visitor_action_review",
    checkInVisitor: "visitor_action_check_in",
    checkOutVisitor: "visitor_action_check_out",
  },
};

export const VISITOR_MEMBER_GRANT_ALIASES = new Set([
  VISITOR_PERMISSION_KEYS.module,
  "visitors-management",
  ...Object.values(VISITOR_PERMISSION_KEYS.pages),
  ...Object.values(VISITOR_PERMISSION_KEYS.tabs),
  ...Object.values(VISITOR_PERMISSION_KEYS.actions),
]);

