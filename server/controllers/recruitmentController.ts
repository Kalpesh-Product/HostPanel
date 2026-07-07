// @ts-nocheck
import mongoose from "mongoose";
import RecruitmentJobOpening from "../models/RecruitmentJobOpening.js";
import RecruitmentCandidate from "../models/RecruitmentCandidate.js";
import { uploadFileToS3 } from "../config/s3config.js";
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

export async function getPublicRecruitmentJobOpenings(request, response, next) {
  try {
    const workspaceId = request.query?.workspaceId;
    if (!workspaceId) {
      return response.status(400).json({ success: false, message: "workspaceId is required" });
    }
    const jobs = await RecruitmentJobOpening.find({ workspaceId, isPostedOnWebsite: true })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const mapped = jobs.map((j) => ({
      id: j.jobCode,
      jobCode: j.jobCode,
      title: j.title || "",
      designation: j.designation || j.title || "",
      department: j.department || "",
      employmentType: j.employmentType || "full_time",
      employmentTypeLabel: j.employmentType === "intern" ? "Intern" : j.employmentType === "full_time" ? "Full Time" : j.employmentType || "full_time",
      vacancyTotal: j.vacancyTotal || 1,
      vacancyFilled: j.vacancyFilled || 0,
      location: j.location || "",
      workMode: j.workMode || "",
      description: j.description || "",
      aboutTheJob: j.aboutTheJob || "",
      keyResponsibilities: j.keyResponsibilities || "",
      requirements: j.requirements || "",
      softSkills: j.softSkills || "",
      createdAt: j.createdAt,
    }));
    response.status(200).json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
}

export async function applyRecruitmentJob(request, response, next) {
  try {
    const {
      workspaceId,
      jobCode,
      jobTitle,
      fullName,
      email,
      phone,
      message,
      dateOfBirth,
      state,
      experience,
      linkedinProfileUrl,
      currentSalary,
      expectedSalary,
      joinAvailability,
      relocateToGoa,
      personality,
      skills,
      whyConsiderYou,
      bootstrapStartup,
      personalMessage,
      customFields,
    } = request.body || {};
    if (!workspaceId || !fullName || !email) {
      return response.status(400).json({ success: false, message: "workspaceId, fullName, and email are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return response.status(400).json({ success: false, message: "Invalid workspaceId" });
    }
    const nameParts = String(fullName || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    const customFieldsJson =
      typeof customFields === "string"
        ? String(customFields || "").trim()
        : (() => {
            try {
              return JSON.stringify(customFields || {});
            } catch {
              return "";
            }
          })();
    const candidateCount = await RecruitmentCandidate.countDocuments({ workspaceId: new mongoose.Types.ObjectId(workspaceId) });
    const candidateCode = `RC-${String(candidateCount + 1).padStart(4, "0")}`;
    let resume = null;
    if (request.file?.buffer?.length) {
      const fileName = String(request.file.originalname || "resume").replace(/\s+/g, "-");
      const uploadResult = await uploadFileToS3(
        `hr/recruitment/public-applications/${candidateCode}-${Date.now()}-${fileName}`,
        request.file,
      );
      resume = {
        name: request.file.originalname || "Resume",
        url: uploadResult.url,
        publicId: uploadResult.id,
        mimeType: request.file.mimetype || "",
        uploadedAt: new Date(),
      };
    }
    const candidate = await RecruitmentCandidate.create({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      candidateCode,
      firstName,
      lastName,
      fullName: String(fullName || "").trim(),
      email: String(email || "").trim().toLowerCase(),
      phone: String(phone || "").trim(),
      positionApplied: String(jobTitle || "").trim() || "General Application",
      jobCode: String(jobCode || "").trim().toUpperCase(),
      sourceType: "Website",
      dateOfBirth: dateOfBirth ? new Date(String(dateOfBirth)) : null,
      currentAddress: String(state || "").trim(),
      experience: String(experience || "").trim(),
      sourceReference: String(linkedinProfileUrl || "").trim(),
      expectedSalary: String(expectedSalary || currentSalary || "").trim(),
      availability: String(joinAvailability || "").trim() || "Full-time",
      employmentHistory: String(whyConsiderYou || "").trim(),
      skills: String(skills || "").trim(),
      certifications: String(bootstrapStartup || "").trim(),
      coverLetter: String(personality || "").trim(),
      notes: [message, personalMessage, relocateToGoa].map((value) => String(value || "").trim()).filter(Boolean).join("\n\n"),
      customFields: customFieldsJson,
      status: "New",
      appliedAt: new Date(),
      resume: resume || undefined,
    });
    response.status(201).json({ success: true, message: "Application submitted successfully.", data: { candidateCode: candidate.candidateCode } });
  } catch (error) {
    next(error);
  }
}

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

export async function getPostedRecruitmentJobOpenings(request, response, next) {
  try {
    const result = await getRecruitmentJobOpeningsForCurrentUser(request.user);
    const jobs = result?.jobOpenings ?? result ?? [];
    const postedJobs = Array.isArray(jobs) ? jobs.filter((j) => j.isPostedOnWebsite === true) : [];
    response.status(200).json({ success: true, data: postedJobs });
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
