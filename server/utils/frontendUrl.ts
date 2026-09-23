// @ts-nocheck
// Every place that builds a link into an email (invite, password reset, unit
// transfer, "your account is ready", etc.) needs to point at whichever
// frontend the CURRENT server process actually serves — not just whichever
// of FRONTEND_PROD_LINK/FRONTEND_DEV_LINK happens to be set in .env. Picking
// "prod if set, else dev" (the old pattern, repeated across ~9 call sites)
// silently sends a dev-added user's invite/reset link to the hosted site
// whenever FRONTEND_PROD_LINK is present locally, even with NODE_ENV=development
// — which is exactly the bug this was reported for. Branching on NODE_ENV
// instead (matching the working pattern already used in leadsControllers.ts's
// NOMADS_API_BASE_URL) makes the link always match the environment the
// server itself believes it's running in.
export const resolveFrontendBaseUrl = (localhostFallback = "http://localhost:5173") => {
  const isProduction = process.env.NODE_ENV === "production";
  const configured = isProduction
    ? process.env.FRONTEND_PROD_LINK
    : process.env.FRONTEND_DEV_LINK || process.env.CLIENT_URL;
  return String(configured || localhostFallback)
    .trim()
    .replace(/\/+$/, "");
};
