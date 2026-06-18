import mongoose, { Document, Schema } from "mongoose";

export interface IRecruitmentStatusHistory {
    status: string;
    note?: string;
    changedByUserId?: mongoose.Types.ObjectId | null;
    changedByName?: string;
    createdAt: Date;
}

export interface IRecruitmentEmailHistory {
    templateType: string;
    subject: string;
    recipientEmail: string;
    sentByUserId?: mongoose.Types.ObjectId | null;
    sentByName?: string;
    sentAt: Date;
}

export interface IRecruitmentResume {
    name: string;
    url: string;
    publicId: string;
    mimeType: string;
    uploadedAt: Date;
}

export interface IRecruitmentCandidate extends Document {
    workspaceId: mongoose.Types.ObjectId;
    candidateCode: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    fullName: string;
    email: string;
    phone?: string;
    department?: string;
    departmentId?: mongoose.Types.ObjectId | null;
    jobCode?: string;
    positionApplied: string;
    sourceType: string;
    sourceReference?: string;
    sourceNotes?: string;
    contactMethod?: string;
    currentCompany?: string;
    dateOfBirth?: Date | null;
    currentAddress?: string;
    earliestStartDate?: Date | null;
    availability: string;
    experience?: string;
    expectedSalary?: string;
    education?: string;
    employmentHistory?: string;
    skills?: string;
    certifications?: string;
    coverLetter?: string;
    notes?: string;
    status: string;
    statusReason?: string;
    appliedAt: Date;
    statusUpdatedAt: Date;
    selectedAt?: Date | null;
    hiredAt?: Date | null;
    convertedEmployeeId?: mongoose.Types.ObjectId | null;
    resume: IRecruitmentResume;
    emailHistory: IRecruitmentEmailHistory[];
    statusHistory: IRecruitmentStatusHistory[];
    createdByUserId?: mongoose.Types.ObjectId | null;
    createdByName?: string;
    updatedByUserId?: mongoose.Types.ObjectId | null;
    updatedByName?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const recruitmentStatusHistorySchema = new Schema<IRecruitmentStatusHistory>(
    {
        status: { type: String, trim: true, default: "Applied" },
        note: { type: String, trim: true, default: "" },
        changedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        changedByName: { type: String, trim: true, default: "" },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const recruitmentEmailHistorySchema = new Schema<IRecruitmentEmailHistory>(
    {
        templateType: { type: String, trim: true, default: "status_update" },
        subject: { type: String, trim: true, default: "" },
        recipientEmail: { type: String, trim: true, lowercase: true, default: "" },
        sentByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        sentByName: { type: String, trim: true, default: "" },
        sentAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const recruitmentResumeSchema = new Schema<IRecruitmentResume>(
    {
        name: { type: String, trim: true, default: "" },
        url: { type: String, trim: true, default: "" },
        publicId: { type: String, trim: true, default: "" },
        mimeType: { type: String, trim: true, default: "" },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const recruitmentCandidateSchema = new Schema<IRecruitmentCandidate>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        candidateCode: {
            type: String,
            trim: true,
            uppercase: true,
            required: true,
            index: true,
        },
        firstName: { type: String, trim: true, required: true, maxlength: 80 },
        middleName: { type: String, trim: true, default: "", maxlength: 80 },
        lastName: { type: String, trim: true, required: true, maxlength: 80 },
        fullName: { type: String, trim: true, required: true, maxlength: 180, index: true },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            required: true,
            maxlength: 160,
            index: true,
        },
        phone: { type: String, trim: true, default: "" },
        department: { type: String, trim: true, default: "", index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", default: null, index: true },
        jobCode: { type: String, trim: true, uppercase: true, default: "", index: true },
        positionApplied: { type: String, trim: true, required: true, maxlength: 140, index: true },
        sourceType: { type: String, trim: true, default: "Walk-in", index: true },
        sourceReference: { type: String, trim: true, default: "" },
        sourceNotes: { type: String, trim: true, default: "" },
        contactMethod: { type: String, trim: true, default: "" },
        currentCompany: { type: String, trim: true, default: "" },
        dateOfBirth: { type: Date, default: null },
        currentAddress: { type: String, trim: true, default: "" },
        earliestStartDate: { type: Date, default: null, index: true },
        availability: { type: String, trim: true, default: "Full-time" },
        experience: { type: String, trim: true, default: "" },
        expectedSalary: { type: String, trim: true, default: "" },
        education: { type: String, trim: true, default: "" },
        employmentHistory: { type: String, trim: true, default: "" },
        skills: { type: String, trim: true, default: "" },
        certifications: { type: String, trim: true, default: "" },
        coverLetter: { type: String, trim: true, default: "" },
        notes: { type: String, trim: true, default: "" },
        status: { type: String, trim: true, default: "Applied", index: true },
        statusReason: { type: String, trim: true, default: "" },
        appliedAt: { type: Date, default: Date.now, index: true },
        statusUpdatedAt: { type: Date, default: Date.now },
        selectedAt: { type: Date, default: null },
        hiredAt: { type: Date, default: null },
        convertedEmployeeId: {
            type: Schema.Types.ObjectId,
            ref: "EmployeeProfile",
            default: null,
            index: true,
        },
        resume: { type: recruitmentResumeSchema, default: () => ({}) },
        emailHistory: { type: [recruitmentEmailHistorySchema], default: [] },
        statusHistory: { type: [recruitmentStatusHistorySchema], default: [] },
        createdByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        createdByName: { type: String, trim: true, default: "" },
        updatedByUserId: { type: Schema.Types.ObjectId, ref: "HostUser", default: null },
        updatedByName: { type: String, trim: true, default: "" },
    },
    {
        timestamps: true,
    }
);

recruitmentCandidateSchema.index({ workspaceId: 1, candidateCode: 1 }, { unique: true });
recruitmentCandidateSchema.index({ workspaceId: 1, email: 1, positionApplied: 1 });
recruitmentCandidateSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });

export const RecruitmentCandidate = (mongoose.models.RecruitmentCandidate as mongoose.Model<IRecruitmentCandidate>) ||
    mongoose.model<IRecruitmentCandidate>("RecruitmentCandidate", recruitmentCandidateSchema);
export default RecruitmentCandidate;
