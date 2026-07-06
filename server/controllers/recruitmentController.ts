// @ts-nocheck
import {
  createRecruitmentCandidateForCurrentUser,
  createRecruitmentJobOpeningForCurrentUser,
  bulkUploadRecruitmentJobOpeningsForCurrentUser,
  getRecruitmentJobOpeningsForCurrentUser,
  getRecruitmentOverviewForCurrentUser,
  sendRecruitmentCandidateEmailForCurrentUser,
  updateRecruitmentCandidateForCurrentUser,
  updateRecruitmentJobOpeningForCurrentUser,
} from "../services/core/recruitment.service.js";

export async function getRecruitmentOverview(request, response, next) {
  try {
    const result = await getRecruitmentOverviewForCurrentUser(request.user);
    response.status(200).json({
      success: true,
      message: "Recruitment pipeline loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecruitmentJobOpenings(request, response, next) {
  try {
    const result = await getRecruitmentJobOpeningsForCurrentUser(request.user);
    response.status(200).json({
      success: true,
      message: "Recruitment job openings loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function createRecruitmentJobOpening(request, response, next) {
  try {
    const result = await createRecruitmentJobOpeningForCurrentUser(request.user, request.body || {});
    response.status(201).json({
      success: true,
      message: "Recruitment job opening created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function bulkUploadRecruitmentJobOpenings(request, response, next) {
  try {
    const result = await bulkUploadRecruitmentJobOpeningsForCurrentUser(request.user, request.file || null);
    response.status(201).json({
      success: true,
      message: "Recruitment job openings imported successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRecruitmentJobOpening(request, response, next) {
  try {
    const result = await updateRecruitmentJobOpeningForCurrentUser(request.user, request.params.jobCode, request.body || {});
    response.status(200).json({
      success: true,
      message: "Recruitment job opening updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function createRecruitmentCandidate(request, response, next) {
  try {
    const result = await createRecruitmentCandidateForCurrentUser(request.user, request.body || {}, request.file || null);
    response.status(201).json({
      success: true,
      message: "Recruitment candidate created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRecruitmentCandidate(request, response, next) {
  try {
    const result = await updateRecruitmentCandidateForCurrentUser(
      request.user,
      request.params.candidateId,
      request.body || {},
      request.file || null,
    );
    response.status(200).json({
      success: true,
      message: "Recruitment candidate updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function sendRecruitmentCandidateEmail(request, response, next) {
  try {
    const result = await sendRecruitmentCandidateEmailForCurrentUser(
      request.user,
      request.params.candidateId,
      request.body || {},
    );
    response.status(200).json({
      success: true,
      message: "Recruitment email sent successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
