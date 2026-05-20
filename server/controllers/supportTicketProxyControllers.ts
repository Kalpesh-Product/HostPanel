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

const forwardError = (error, res) => {
  const status = error?.response?.status || 500;
  const payload =
    error?.response?.data ||
    { message: error?.message || "Failed to proxy support ticket request." };
  return res.status(status).json(payload);
};

export const getSupportTicketsProxy = async (req, res) => {
  try {
    const response = await axios.get(
      `${MASTER_PANEL_BASE_URL}/api/tickets/support-tickets`,
      { headers: buildAuthHeaders(req) },
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    return forwardError(error, res);
  }
};

export const createSupportTicketProxy = async (req, res) => {
  try {
    const formData = new FormData();
    Object.entries(req.body || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    if (req.file?.buffer) {
      const imageBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
      formData.append("image", imageBlob, req.file.originalname || "attachment");
    }

    const response = await axios.post(
      `${MASTER_PANEL_BASE_URL}/api/tickets/support-tickets`,
      formData,
      {
        headers: buildAuthHeaders(req),
        maxBodyLength: Infinity,
      },
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    return forwardError(error, res);
  }
};

export const closeSupportTicketProxy = async (req, res) => {
  try {
    const response = await axios.patch(
      `${MASTER_PANEL_BASE_URL}/api/tickets/support-tickets/${req.params.ticketId}/close`,
      {},
      { headers: buildAuthHeaders(req) },
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    return forwardError(error, res);
  }
};

export const followUpSupportTicketProxy = async (req, res) => {
  try {
    const response = await axios.post(
      `${MASTER_PANEL_BASE_URL}/api/tickets/support-tickets/${req.params.ticketId}/follow-up`,
      req.body || {},
      { headers: buildAuthHeaders(req) },
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    return forwardError(error, res);
  }
};

