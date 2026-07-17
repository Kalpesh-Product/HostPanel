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
import { createNotification } from "../utils/notify.js";

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

    // Notify HR/admins about the correction request
    const workspaceMembership = request.workspaceMembership;
    if (workspaceMembership?.workspace) {
      try {
        const mongoose = await import("mongoose");
        const workspaceMembers = await mongoose.default.model("WorkspaceMember").find({
          workspace: workspaceMembership.workspace,
          isActive: true,
          "role.name": { $in: ["owner", "founder", "admin"] },
        }).select("user").lean();

        const actorId = String(request.user || "");
        for (const member of workspaceMembers) {
          const adminId = String(member.user);
          if (adminId !== actorId) {
            createNotification({
              workspaceId: workspaceMembership.workspace,
              recipientUserId: adminId,
              actorUserId: actorId,
              type: "attendance_correction_requested",
              category: "system",
              title: "Attendance Correction Requested",
              description: `An employee has requested an attendance correction. Please review the request.`,
              entityType: "attendance",
              entityId: request.params.recordId,
              targetUrl: `/app/attendance`,
              data: { recordId: request.params.recordId, reason: request.body?.reason || "" },
              priority: "normal",
              isActionRequired: true,
              dedupeKey: `attendance-correction:${request.params.recordId}:${adminId}:${Date.now()}`,
            });
          }
        }
      } catch (e) {
        console.error("Attendance correction notification failed:", e);
      }
    }

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

    // Notify the employee about the correction decision
    const attendance = result?.attendance;
    if (attendance?.employeeUserId && workspaceMembership?.workspace) {
      const decision = result.decision || request.body?.action || request.body?.decision;
      createNotification({
        workspaceId: request.workspaceMembership?.workspace,
        recipientUserId: String(attendance.employeeUserId),
        actorUserId: request.user,
        type: "attendance_correction_reviewed",
        category: "system",
        title: `Attendance Correction ${decision === "approved" ? "Approved" : "Rejected"}`,
        description: `Your attendance correction request has been ${decision}. ${result?.reviewerRole ? `Reviewed by ${result.reviewerRole}.` : ""}`,
        entityType: "attendance",
        entityId: request.params.recordId,
        targetUrl: `/app/attendance`,
        data: { recordId: request.params.recordId, decision },
        priority: decision === "approved" ? "normal" : "high",
        dedupeKey: `attendance-review:${request.params.recordId}:${attendance.employeeUserId}:${Date.now()}`,
      });
    }

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
