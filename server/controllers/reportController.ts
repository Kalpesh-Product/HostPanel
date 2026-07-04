// @ts-nocheck
import {
  listReportsForCurrentUser,
  createReportForCurrentUser,
  downloadReportForCurrentUser,
} from "../services/reportService.js";

export async function listReports(req, res, next) {
  try {
    const result = await listReportsForCurrentUser(req, req.query || {});
    res.status(200).json({
      success: true,
      message: "Reports loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function createReport(req, res, next) {
  try {
    const result = await createReportForCurrentUser(req, req.body || {});
    res.status(201).json({
      success: true,
      message: "Report created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadReport(req, res, next) {
  try {
    const { reportId } = req.params;
    const result = await downloadReportForCurrentUser(req, reportId, req.body || {});
    res.status(200).json({
      success: true,
      message: "Report prepared for download.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

