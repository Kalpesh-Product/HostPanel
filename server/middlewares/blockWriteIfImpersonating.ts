// @ts-nocheck
// Mounted after verifyJwt on protected routers. Staff "View As" sessions
// (see authControllers.ts: consumeStaffViewToken) are meant to be read-only —
// this is the single central point that enforces that, rather than trusting
// every route handler to check req.isImpersonated itself.
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const blockWriteIfImpersonating = (req, res, next) => {
  if (req.isImpersonated && WRITE_METHODS.has(req.method)) {
    // Distinct code so the frontend can tell this apart from an actually
    // expired/invalid access token (verifyJwt also returns a bare 403 for
    // that) — without it, the axios interceptor's refresh-on-403 logic
    // mistakes a blocked write for token expiry, and since impersonation
    // sessions have no refresh token by design, that immediately wipes the
    // session and forces a login redirect well before the real expiry.
    return res.status(403).json({
      code: "READ_ONLY_SESSION",
      message: "This is a read-only staff view session and cannot make changes.",
    });
  }
  next();
};

export default blockWriteIfImpersonating;
