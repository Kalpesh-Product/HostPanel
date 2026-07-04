// @ts-nocheck
// Mounted after verifyJwt on protected routers. Staff "View As" sessions
// (see authControllers.ts: consumeStaffViewToken) are meant to be read-only —
// this is the single central point that enforces that, rather than trusting
// every route handler to check req.isImpersonated itself.
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const blockWriteIfImpersonating = (req, res, next) => {
  if (req.isImpersonated && WRITE_METHODS.has(req.method)) {
    return res.status(403).json({
      message: "This is a read-only staff view session and cannot make changes.",
    });
  }
  next();
};

export default blockWriteIfImpersonating;
