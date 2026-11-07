// @ts-nocheck
// Gate for server-to-server calls FROM MasterPanel INTO HostPanel (the
// reverse direction of masterPanelHeaders() in leadsControllers.ts, which
// does the same check the other way). Both sides share
// HOSTPANEL_SERVICE_API_KEY already — reused here rather than adding a
// second secret.
export const verifyMasterPanelServiceKey = (req, res, next) => {
  const expectedKey = process.env.HOSTPANEL_SERVICE_API_KEY;
  const suppliedKey = req.headers["x-masterpanel-service-key"];
  if (!expectedKey || suppliedKey !== expectedKey) {
    return res.status(401).json({ message: "Invalid or missing service key" });
  }
  next();
};
