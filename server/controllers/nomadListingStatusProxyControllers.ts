// @ts-nocheck
import axios from "axios";

const MASTER_PANEL_BASE_URL = String(
  process.env.MASTER_PANEL_BASE_URL || "http://localhost:5007",
).replace(/\/+$/, "");

const buildAuthHeaders = (req) => {
  const serviceToken = process.env.MASTER_PANEL_SERVICE_TOKEN;
  const headers: Record<string, string> = {};

  if (serviceToken) {
    headers.Authorization = `Bearer ${serviceToken}`;
  } else if (req.headers?.authorization) {
    headers.Authorization = req.headers.authorization;
  }

  if (req.headers?.["x-refresh-token"]) {
    headers["x-refresh-token"] = String(req.headers["x-refresh-token"]);
  }

  if (req.headers?.cookie) {
    headers.cookie = String(req.headers.cookie);
  }

  return headers;
};

// Read-only status check for the website builder's publish-time warning
// dialog ("your site is live, but Nomads leads won't work until X") — never
// blocks publishing, just informs. Mirrors supportTicketProxyControllers.ts's
// proxy pattern: HostPanel's backend calls MasterPanel server-to-server so
// the client never needs cross-origin access to MasterPanel directly.
export const getNomadListingStatusProxy = async (req, res) => {
  try {
    const { companyId } = req.params;
    const response = await axios.get(
      `${MASTER_PANEL_BASE_URL}/api/hosts/host-companies/${encodeURIComponent(companyId)}/nomad-link`,
      { headers: buildAuthHeaders(req), timeout: 8000 },
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    const status = error?.response?.status || 500;
    const payload =
      error?.response?.data ||
      { message: error?.message || "Failed to check Nomads listing status." };
    return res.status(status).json(payload);
  }
};
