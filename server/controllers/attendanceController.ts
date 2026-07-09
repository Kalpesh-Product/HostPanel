// @ts-nocheck
import {
  checkInAttendance,
  checkOutAttendance,
  endBreakAttendance,
  getAttendanceGeofence,
  getEmployeeAttendanceHistory,
  getMyAttendanceHistory,
  getTeamAttendanceSnapshot,
  requestAttendanceCorrection,
  reviewAttendanceCorrection,
  resolveAttendanceGeofenceLocation,
  updateAttendanceGeofence,
  startBreakAttendance,
} from "../services/attendanceService.js";

export async function checkIn(request, response, next) {
  try {
    const result = await checkInAttendance(request.user, request.body, request.file || null);
    response.status(200).json({
      success: true,
      message: "Checked in successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function checkOut(request, response, next) {
  try {
    const result = await checkOutAttendance(request.user, request.body, request.file || null);
    response.status(200).json({
      success: true,
      message: "Checked out successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function startBreak(request, response, next) {
  try {
    const result = await startBreakAttendance(request.user, request.file || null);
    response.status(200).json({
      success: true,
      message: "Break started successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function endBreak(request, response, next) {
  try {
    const result = await endBreakAttendance(request.user, request.file || null);
    response.status(200).json({
      success: true,
      message: "Break ended successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyAttendance(request, response, next) {
  try {
    const result = await getMyAttendanceHistory(request.user, request.query);
    response.status(200).json({
      success: true,
      message: "Attendance history loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeamAttendance(request, response, next) {
  try {
    const result = await getTeamAttendanceSnapshot(request.user, request.query);
    response.status(200).json({
      success: true,
      message: "Team attendance loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmployeeAttendanceHistoryForTeam(request, response, next) {
  try {
    const result = await getEmployeeAttendanceHistory(request.user, request.params.userId, request.query);
    response.status(200).json({
      success: true,
      message: "Employee attendance history loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCorrectionRequest(request, response, next) {
  try {
    const result = await requestAttendanceCorrection(request.user, request.params.recordId, request.body);
    response.status(200).json({
      success: true,
      message: "Attendance correction request submitted.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function reviewCorrectionRequest(request, response, next) {
  try {
    const result = await reviewAttendanceCorrection(request.user, request.params.recordId, request.body);
    response.status(200).json({
      success: true,
      message: "Attendance correction reviewed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getHrAttendanceReview(request, response, next) {
  try {
    const result = await getTeamAttendanceSnapshot(request.user, request.query);
    response.status(200).json({
      success: true,
      message: "HR attendance review loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceGeofenceConfig(request, response, next) {
  try {
    const result = await getAttendanceGeofence(request.user);
    response.status(200).json({
      success: true,
      message: "Attendance geofence loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function resolveAttendanceGeofenceUrl(request, response, next) {
  try {
    const result = await resolveAttendanceGeofenceLocation(request.user, request.body);
    response.status(200).json({
      success: true,
      message: "Attendance geofence location resolved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAttendanceGeofenceConfig(request, response, next) {
  try {
    const result = await updateAttendanceGeofence(request.user, request.body);
    response.status(200).json({
      success: true,
      message: "Attendance geofence updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
