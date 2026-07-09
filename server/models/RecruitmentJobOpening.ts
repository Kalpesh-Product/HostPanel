import mongoose from "mongoose";

const recruitmentJobOpeningSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    jobCode: { type: String, trim: true, uppercase: true, default: "", maxlength: 40, index: true },
    title: { type: String, trim: true, default: "", maxlength: 140, index: true },
    designation: { type: String, trim: true, default: "", maxlength: 140 },
    department: { type: String, trim: true, default: "", maxlength: 120, index: true },
    employmentType: { type: String, trim: true, default: "full_time", maxlength: 40 },
    isPaid: { type: Boolean, default: true },
    internshipDurationMonths: { type: Number, default: 0 },
    vacancyTotal: { type: Number, default: 1 },
    vacancyFilled: { type: Number, default: 0 },
    location: { type: String, trim: true, default: "", maxlength: 200 },
    workMode: { type: String, trim: true, default: "", maxlength: 50 },
    isActive: { type: Boolean, default: true, index: true },
    isPostedOnWebsite: { type: Boolean, default: false },
    description: { type: String, trim: true, default: "", maxlength: 1000 },
    aboutTheJob: { type: String, trim: true, default: "", maxlength: 1000 },
    keyResponsibilities: { type: String, trim: true, default: "", maxlength: 2000 },
    requirements: { type: String, trim: true, default: "", maxlength: 2000 },
    softSkills: { type: String, trim: true, default: "", maxlength: 1000 },
  },
  { timestamps: true },
);

recruitmentJobOpeningSchema.index({ workspaceId: 1, jobCode: 1 }, { unique: true });
recruitmentJobOpeningSchema.index({ workspaceId: 1, department: 1, isActive: 1 });

const RecruitmentJobOpening =
  mongoose.models.RecruitmentJobOpening ||
  mongoose.model("RecruitmentJobOpening", recruitmentJobOpeningSchema);

export default RecruitmentJobOpening;
