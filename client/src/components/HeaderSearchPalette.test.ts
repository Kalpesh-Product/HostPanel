import assert from "node:assert/strict";
import {
  canSearchOrganizationUsers,
  getSearchDestinationKey,
  isAuthorizedChildPage,
} from "./HeaderSearchPalette.helpers";

// --- Visitor nested pages: a restricted page needs its own visitor grant. ---

// Owner/super_admin keep their normal management access.
assert.equal(
  isAuthorizedChildPage(
    { requiredAccessAny: ["visitors_manage_internal_visitors"] },
    "owner",
    new Set(),
    [],
  ),
  true,
);
assert.equal(
  isAuthorizedChildPage(
    { requiredAccessAny: ["visitors_manage_external_clients"] },
    "super_admin",
    new Set(),
    [],
  ),
  true,
);

// Internal Visitors page appears with the internal grant, not the external one.
assert.equal(
  isAuthorizedChildPage(
    { requiredAccessAny: ["visitors_manage_internal_visitors"] },
    "employee",
    new Set(["visitors_manage_internal_visitors"]),
    [],
  ),
  true,
);
assert.equal(
  isAuthorizedChildPage(
    { requiredAccessAny: ["visitors_manage_external_clients"] },
    "employee",
    new Set(["visitors_manage_internal_visitors"]),
    [],
  ),
  false,
);

// A held permission (auth.user.permissions.permissions) is accepted instead of
// the grant, mirroring VisitorManagement.hasGrant().
assert.equal(
  isAuthorizedChildPage(
    { requiredAccessAny: ["visitor_team_members"] },
    "employee",
    new Set(),
    ["visitor_team_members"],
  ),
  true,
);

// Frontdesk Action is unlocked by any single visitor mode.
assert.equal(
  isAuthorizedChildPage(
    {
      requiredAccessAny: [
        "visitors_mode_standard",
        "visitors_mode_workspace_tour",
        "visitors_mode_walkin_booking",
        "visitors_mode_verify_booking",
      ],
    },
    "employee",
    new Set(["visitors_mode_walkin_booking"]),
    [],
  ),
  true,
);
assert.equal(
  isAuthorizedChildPage(
    {
      requiredAccessAny: [
        "visitors_mode_standard",
        "visitors_mode_workspace_tour",
        "visitors_mode_walkin_booking",
        "visitors_mode_verify_booking",
      ],
    },
    "employee",
    new Set(["unrelated-module"]),
    [],
  ),
  false,
);

// Pages with no page-specific key inherit the parent module check only.
assert.equal(
  isAuthorizedChildPage({}, "employee", new Set(["team-management"]), []),
  true,
);

// --- Organization user search: department-only access must stay locked. ---

assert.equal(canSearchOrganizationUsers("employee", new Set(["org-tab-departments"])), false);
assert.equal(canSearchOrganizationUsers("employee", new Set(["org-departments-create"])), false);
assert.equal(canSearchOrganizationUsers("employee", new Set(["org-departments-edit"])), false);
assert.equal(canSearchOrganizationUsers("employee", new Set(["org_tab_users"])), false);
assert.equal(
  canSearchOrganizationUsers("employee", new Set(["organization-management", "org_tab_users"])),
  false,
);
assert.equal(canSearchOrganizationUsers("manager", new Set(["org_tab_users"])), false);
assert.equal(
  canSearchOrganizationUsers("manager", new Set(["organization-management", "org_tab_users"])),
  false,
);
assert.equal(canSearchOrganizationUsers("employee", new Set(["org-users-invite-member"])), false);
assert.equal(canSearchOrganizationUsers("manager", new Set(["org-users-change-role"])), false);
assert.equal(canSearchOrganizationUsers("manager", new Set(["org-users-toggle-access"])), false);
assert.equal(canSearchOrganizationUsers("owner", new Set()), true);
assert.equal(canSearchOrganizationUsers("super_admin", new Set()), true);

// --- React keys: records that share one route must still be unique. ---

assert.notEqual(
  getSearchDestinationKey({ route: "/key-apps/nomad-listings/edit", resultType: "listing", record: { businessId: "one" } }),
  getSearchDestinationKey({ route: "/key-apps/nomad-listings/edit", resultType: "listing", record: { businessId: "two" } }),
);
assert.equal(
  getSearchDestinationKey({ route: "/key-apps/nomad-listings/edit", resultType: "listing", record: { businessId: "one" } }),
  getSearchDestinationKey({ route: "/key-apps/nomad-listings/edit", resultType: "listing", record: { businessId: "one" } }),
);
assert.notEqual(
  getSearchDestinationKey({ route: "/core-modules/organization-management", resultType: "user", record: { userId: "u1" } }),
  getSearchDestinationKey({ route: "/core-modules/organization-management", resultType: "user", record: { userId: "u2" } }),
);
// A page result and a record result on the same route must not collide.
assert.notEqual(
  getSearchDestinationKey({ route: "/visitors/visitor-management", resultType: "page" }),
  getSearchDestinationKey({ route: "/visitors/visitor-management", resultType: "visitor", record: { id: "v1" } }),
);

console.log("Header search checks passed.");
