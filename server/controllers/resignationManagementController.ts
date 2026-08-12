// @ts-nocheck
import {
  completeResignationRequestForCurrentUser,
  createResignationRequestForCurrentUser,
  getResignationRequestForCurrentUser,
  getResignationSettingsForCurrentUser,
  getMyResignationRequestsForCurrentUser,
  listResignationRequestsForCurrentUser,
  reviewResignationRequestForCurrentUser,
  updateResignationChecklistForCurrentUser,
  updateResignationRequestForCurrentUser,
  updateResignationSettingsForCurrentUser,
} from "../services/core/resignation-management.service.js";

const context = (request) => ({
  userId: String(request.user || ""),
  workspaceId: String(request.workspaceMembership?.workspace || ""),
});
export const getResignationSettings = async (request, response, next) => {
  try {
    const { userId, workspaceId } = context(request);
    const data = await getResignationSettingsForCurrentUser(userId, workspaceId);
    return response.status(200).json({
      success: true,
      message: "Resignation settings loaded successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateResignationSettings = async (request, response, next) => {
  try {
    const { userId, workspaceId } = context(request);
    const data = await updateResignationSettingsForCurrentUser(
      userId,
      workspaceId,
      request.body || {},
    );
    return response.status(200).json({
      success: true,
      message: "Resignation settings updated successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};



export const listResignationRequests = async (request, response, next) => {
  try {
    const { userId, workspaceId } = context(request);
    const data = await listResignationRequestsForCurrentUser(userId, workspaceId);
    return response.status(200).json({ success: true, message: "Resignation requests loaded successfully.", data });
  } catch (error) {
    next(error);
  }
};

export const getMyResignationRequests = async (request, response, next) => {
  try {
    const { userId, workspaceId } = context(request);
    const data = await getMyResignationRequestsForCurrentUser(userId, workspaceId);
    return response.status(200).json({ success: true, message: "Your resignation requests loaded successfully.", data });
  } catch (error) {
    next(error);
  }
};

export const getResignationRequest = async (request, response, next) => {
  try {
    const { userId, workspaceId } = context(request);
    const data = await getResignationRequestForCurrentUser(userId, workspaceId, request.params.requestId);
    return response.status(200).json({ success: true, message: "Resignation request loaded successfully.", data });
  } catch (error) {
    next(error);
  }
};

export const createResignationRequest = async (request, response, next) => {
  try {
    const { userId, workspaceId } = context(request);
    const data = await createResignationRequestForCurrentUser(userId, workspaceId, request.body || {});
    return response.status(201).json({ success: true, message: "Resignation request created successfully.", data });
  } catch (error) {
    next(error);
  }
};

export const updateResignationRequest = async (request, response, next) => {
  try {
    const { userId, workspaceId } = context(request);
    const data = await updateResignationRequestForCurrentUser(
      userId,
      workspaceId,
      request.params.requestId,
      request.body || {},
    );
    return response.status(200).json({ success: true, message: "Resignation request updated successfully.", data });
  } catch (error) {
    next(error);
  }
};

export const reviewResignationRequest = async (request, response, next) => {
  try {
    const { userId, workspaceId } = context(request);
    const data = await reviewResignationRequestForCurrentUser(
      userId,
      workspaceId,
      request.params.requestId,
      request.body || {},
    );
    return response.status(200).json({ success: true, message: "Resignation request reviewed successfully.", data });
  } catch (error) {
    next(error);
  }
};

export const updateResignationChecklist = async (request, response, next) => {
  try {
    const { userId, workspaceId } = context(request);
    const data = await updateResignationChecklistForCurrentUser(
      userId,
      workspaceId,
      request.params.requestId,
      request.body || {},
    );
    return response.status(200).json({ success: true, message: "Resignation checklist updated successfully.", data });
  } catch (error) {
    next(error);
  }
};

export const completeResignationRequest = async (request, response, next) => {
  try {
    const { userId, workspaceId } = context(request);
    const data = await completeResignationRequestForCurrentUser(
      userId,
      workspaceId,
      request.params.requestId,
      request.body || {},
    );
    return response.status(200).json({ success: true, message: "Resignation request completed successfully.", data });
  } catch (error) {
    next(error);
  }
};

