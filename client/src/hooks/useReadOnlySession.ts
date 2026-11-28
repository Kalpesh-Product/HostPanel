import useAuth from "./useAuth";

export const READ_ONLY_TOOLTIP = "Read-only staff view — changes are disabled";

// Staff "View As" sessions (master panel -> /staff-view/:token) are strictly
// read-only: the server rejects every write with 403 via
// blockWriteIfImpersonating. Mutating buttons must be disabled in the UI as
// well, otherwise staff fill in a form and only then discover nothing saves.
//
// Deliberately in-memory only. `impersonation` must NOT be persisted to
// sessionStorage: a staff session has no refresh token by design, so it ends
// on page reload / token expiry and the user is sent to login. A leftover
// "true" flag in the tab would then attach to the NEXT real login and show
// that person an amber "Viewing as ..." banner with every write button dead.
export default function useReadOnlySession() {
  const { auth } = useAuth();
  const isReadOnly = Boolean(auth?.impersonation);

  return {
    isReadOnly,
    readOnlyTooltip: isReadOnly ? READ_ONLY_TOOLTIP : undefined,
  };
}
