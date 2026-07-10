import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search, Plus, X, Briefcase, Users, FileText,
  CheckCircle2, XCircle, MapPin, Building, Calendar,
  UserCheck, UserPlus, ChevronDown, ChevronRight, Mail, Phone, ExternalLink,
  History, ToggleRight, ToggleLeft, DollarSign, GraduationCap,
  Target, AlignLeft, Award, Clock, Loader2, Globe, UploadCloud, FileSpreadsheet, FileDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Country } from "country-state-city";
import PageFrame from "@/components/Pages/PageFrame";
import { HRRecruitmentSkeleton } from "@/components/ui/Skeleton";
import { createReport } from "@/services/reports";
import { downloadReportFile } from "@/utils/report-download";
import {
  createRecruitmentCandidate,
  bulkUploadRecruitmentJobOpenings,
  createRecruitmentJobOpening,
  getRecruitmentOverview,
  getRecruitmentJobOpenings,
  sendRecruitmentCandidateEmail,
  updateRecruitmentJobOpening,
  updateRecruitmentCandidate,
} from "@/services/recruitment";

/* ───────────────────────────── Types ───────────────────────────── */

interface CandidateRaw {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  jobCode?: string;
  department?: string;
  exp?: string;
  source?: string;
  status?: string;
  resume?: string;
  resumeUrl?: string;
  resumeMeta?: { url?: string; name?: string };
  formData?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    dob?: string;
    country?: string;
    state?: string;
    city?: string;
    address?: string;
    earliestStartDate?: string;
    availability?: string;
    expectedSalary?: string;
    employmentHistory?: string;
    education?: string;
    skills?: string;
    certifications?: string;
    coverLetter?: string;
    customFields?: string;
  };
}

interface JobOpening {
  jobCode?: string;
  id?: string;
  title?: string;
  designation?: string;
  department?: string;
  employmentTypeLabel?: string;
  isPaid?: boolean;
  isActive?: boolean;
  remainingVacancies?: number;
  vacancyTotal?: number;
  vacancyFilled?: number;
  isPostedOnWebsite?: boolean;
  description?: string;
  aboutTheJob?: string;
  location?: string;
  workMode?: string;
  keyResponsibilities?: string;
  requirements?: string;
  softSkills?: string;
}

interface RecruitmentSummary {
  totalCandidates?: number;
  selectedCount?: number;
  onboardedCount?: number;
  activeJobs?: number;
  sourceCounts?: Record<string, number>;
}

interface HistoryEntry {
  cycle?: string;
  closedOn?: string;
  count?: number;
}

interface HistoryView {
  title?: string;
  history?: HistoryEntry[];
}

interface NewCandidateForm {
  fullName: string;
  email: string;
  mobileNumber: string;
  dob: string;
  country: string;
  state: string;
  city: string;
  department: string;
  jobCode: string;
  position: string;
  source: string;
  sourceReference: string;
  sourceNotes: string;
  contactMethod: string;
  currentCompany: string;
  earliestStartDate: string;
  expectedSalary: string;
  availability: string;
  experience: string;
  education: string;
  skills: string;
  certifications: string;
  employmentHistory: string;
  coverLetter: string;
  notes: string;
  resumeFile: File | null;
}

interface NewJobForm {
  jobCode: string;
  title: string;
  department: string;
  employmentType: string;
  vacancyTotal: string;
  isPaid: boolean;
  internshipDurationMonths: string;
  aboutTheJob: string;
  location: string;
  workMode: string;
  keyResponsibilities: string;
  requirements: string;
  softSkills: string;
}

/* ───────────────────────────── Constants ───────────────────────────── */

const DEPARTMENTS = ["HR", "Sales & CRM", "Finance", "Administration", "Tech", "IT", "Maintenance"];

const STATUS_STYLE: Record<string, string> = {
  Applied: "bg-slate-100 text-slate-700 border-slate-200",
  Screening: "bg-blue-50 text-blue-600 border-blue-200",
  "Interview Scheduled": "bg-purple-50 text-purple-600 border-purple-200",
  Interviewed: "bg-amber-50 text-amber-600 border-amber-200",
  Selected: "bg-green-50 text-green-600 border-green-200 shadow-sm font-semibold",
  Rejected: "bg-red-50 text-red-600 border-red-200",
  "Converted to Employee": "bg-teal-50 text-teal-700 border-teal-200",
};

const EMPTY_CANDIDATE: NewCandidateForm = {
  fullName: "", email: "", mobileNumber: "", dob: "", country: "", state: "", city: "",
  department: "", jobCode: "", position: "", source: "Walk-in", sourceReference: "", sourceNotes: "",
  contactMethod: "In-person", currentCompany: "", earliestStartDate: "", expectedSalary: "",
  availability: "Full-time", experience: "", education: "", skills: "", certifications: "",
  employmentHistory: "", coverLetter: "", notes: "", resumeFile: null,
};

const EMPTY_JOB: NewJobForm = {
  jobCode: "", title: "", department: "", employmentType: "full_time", vacancyTotal: "1",
  isPaid: true, internshipDurationMonths: "6",
  aboutTheJob: "", location: "", workMode: "on_site", keyResponsibilities: "", requirements: "", softSkills: "",
};

function generateJobCode(title: string, department: string): string {
  const prefixSource = `${department || ""} ${title || ""}`.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  const prefix = prefixSource.slice(0, 3) || "JOB";
  const suffixSource = `${department || ""}-${title || ""}`.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  const suffix = suffixSource.slice(0, 4) || "0001";
  return `${prefix}-${suffix}`;
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function getStatusStyle(status: string): string {
  return STATUS_STYLE[status] || "bg-slate-50 text-slate-600";
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

function parseCustomFields(raw: unknown): Array<[string, string]> {
  if (!raw) return [];

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return [];
    try {
      parsed = JSON.parse(text);
    } catch {
      return [];
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];

  const coreKeys = new Set([
    "name", "fullName", "email", "dob", "dateOfBirth", "phone", "mobile", "mobileNumber",
    "country", "state", "city", "resume", "resumeUrl", "resumeFile",
  ]);

  return Object.entries(parsed as Record<string, unknown>)
      .filter(([key, value]) => !coreKeys.has(String(key).toLowerCase()) && String(value ?? "").trim() !== "")
      .map(([key, value]) => [key, String(value ?? "")]);
}

function resolveCountryName(value: unknown) {
  const code = String(value ?? "").trim();
  if (!code) return "-";
  return Country.getCountryByCode(code)?.name || code;
}

function buildCandidateCustomFields(form: NewCandidateForm) {
  return {
    "Job Code": form.jobCode,
    Department: form.department,
    Position: form.position,
    Source: form.source,
    "Source Reference": form.sourceReference,
    "Source Notes": form.sourceNotes,
    "Contact Method": form.contactMethod,
    "Current Company": form.currentCompany,
    "Earliest Start Date": form.earliestStartDate,
    "Expected Salary": form.expectedSalary,
    Availability: form.availability,
    Experience: form.experience,
    Education: form.education,
    Skills: form.skills,
    Certifications: form.certifications,
    "Employment History": form.employmentHistory,
    "Cover Letter": form.coverLetter,
    Notes: form.notes,
  };
}

/* ──────────────────────────────────────────────────────────────── */
/*  CandidateDetailModal                                            */
/* ──────────────────────────────────────────────────────────────── */

interface CandidateDetailModalProps {
  candidate: CandidateRaw;
  onClose: () => void;
  onReject: (id: string) => void;
  onAccept: (id: string) => void;
  onSendEmail: (candidate: CandidateRaw) => void;
  onConvert: (candidate: CandidateRaw) => void;
  busyId: string;
}

function CandidateDetailModal({
  candidate, onClose, onReject, onAccept, onSendEmail, onConvert, busyId,
}: CandidateDetailModalProps) {
  const fd = candidate.formData || {};
  const resumeUrl = candidate.resumeUrl || candidate.resumeMeta?.url || "";
  const customFieldEntries = parseCustomFields(fd.customFields || "");

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 bg-slate-50 border-b border-slate-100/60 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-pmedium text-primary leading-none">{candidate.name}</h2>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${getStatusStyle(candidate.status || "")}`}>
                {candidate.status}
              </span>
            </div>
            <p className="text-sm font-medium text-blue-600">
              {candidate.position} <span className="text-slate-400 font-normal ml-2">Source: {candidate.source}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onSendEmail(candidate)}
              disabled={busyId === candidate.id}
              className="btn-pill flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm h-10 disabled:opacity-60"
            >
              <Mail size={14} /> {busyId === candidate.id ? "SENDING..." : "SEND EMAIL"}
            </button>
            <button onClick={onClose} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm hover:text-red-500 transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto flex-1 bg-white">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/60 pb-2 mb-4 flex items-center gap-2">
              <Users size={16} /> Basic Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-8 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/60">
              <div className="col-span-2 md:col-span-4">
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1">Name</p>
                <p className="font-semibold text-slate-900">{candidate.name}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><Mail size={12} /> Email Address</p>
                <p className="font-semibold text-slate-900">{candidate.email}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><Phone size={12} /> Mobile Number</p>
                <p className="font-semibold text-slate-900">{candidate.phone || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1">Date of Birth</p>
                <p className="font-semibold text-slate-900">{fd.dob || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1">Country</p>
                  <p className="font-semibold text-slate-900">{resolveCountryName(fd.country)}</p>
                </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1">State</p>
                <p className="font-semibold text-slate-900">{fd.state || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1">City</p>
                <p className="font-semibold text-slate-900">{fd.city || "-"}</p>
              </div>
              <div className="col-span-2 md:col-span-4">
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><FileText size={12} /> Resume</p>
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="font-semibold text-slate-900">{candidate.resume || "Resume file"}</p>
                  {resumeUrl ? (
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 transition hover:bg-blue-100"
                    >
                      <ExternalLink size={12} /> View Resume
                    </a>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">No file available</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/60 pb-2 mb-4 flex items-center gap-2">
              <Target size={16} /> Job-Specific Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-8 bg-blue-50/30 p-5 rounded-2xl border border-blue-100">
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><Briefcase size={12} /> Position Applied For</p>
                <p className="font-semibold text-blue-900">{candidate.position}</p>
              </div>
              {/* <div>
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><Calendar size={12} /> Earliest Start Date</p>
                <p className="font-semibold text-slate-900">{fd.earliestStartDate}</p>
              </div> */}
              {/* <div>
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><Clock size={12} /> Availability</p>
                <p className="font-semibold text-slate-900">{fd.availability}</p>
              </div> */}
              {/* <div className="col-span-2">
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><DollarSign size={12} /> Expected Salary (CTC)</p>
                <p className="font-semibold text-slate-900">{fd.expectedSalary}</p>
              </div> */}
            </div>
          </div>

          {/* <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/60 pb-2 mb-4 flex items-center gap-2">
              <Award size={16} /> Professional Background
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><Briefcase size={12} /> Employment History</p>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60 text-sm font-medium text-slate-800 leading-relaxed">
                    {fd.employmentHistory}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><GraduationCap size={12} /> Educational Background</p>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60 text-sm font-medium text-slate-800">
                    {fd.education}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><Target size={12} /> Skills & Certifications</p>
                  <div className="space-y-2">
                    <p className="font-semibold text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 text-sm">{fd.skills}</p>
                    <p className="font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 text-sm">{fd.certifications}</p>
                  </div>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2">
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><AlignLeft size={12} /> Cover Letter / Motivation</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/60 text-sm font-medium text-slate-700 italic leading-relaxed">
                  &ldquo;{fd.coverLetter}&rdquo;
                </div>
              </div>
            </div>
          </div> */}

          {customFieldEntries.length > 0 ? (
            <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/60 pb-2 mb-4 flex items-center gap-2">
                  <FileText size={16} /> Custom Fields
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8 bg-purple-50/30 p-5 rounded-2xl border border-purple-100">
                  {customFieldEntries.map(([key, val]) => (
                    <div key={key}>
                    <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1">{key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim()}</p>
                    <p className="font-semibold text-slate-900">{val || "-"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {resumeUrl ? null : (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/60 pb-2 mb-4 flex items-center gap-2">
                <FileText size={16} /> Application Attachments
              </h3>
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white shadow-sm rounded-xl text-blue-600"><FileText size={24} /></div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{candidate.resume}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Mandatory Upload | PDF</p>
                  </div>
                </div>
                <span className="p-2 bg-white text-slate-400 rounded-lg shadow-sm border border-slate-200 text-xs font-medium px-4">
                  No file available
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100/60 flex gap-4 shrink-0">
          {candidate.status === "Applied" ? (
            <>
              <button
                onClick={() => candidate.id && onReject(candidate.id)}
                disabled={busyId === candidate.id}
                className="btn-pill flex-1 py-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <XCircle size={18} /> REJECT CANDIDATE
              </button>
              <button
                onClick={() => candidate.id && onAccept(candidate.id)}
                disabled={busyId === candidate.id}
                className="btn-pill flex-1 py-4 bg-[#2563EB] text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CheckCircle2 size={18} /> ACCEPT FOR SCREENING
              </button>
            </>
          ) : (
            <div className="flex gap-4 w-full">
              <button onClick={onClose} className="btn-pill flex-1 py-4 bg-blue-600 text-white border border-slate-200 transition-all">
                CLOSE PROFILE
              </button>
              {candidate.status === "Selected" && (
                <button
                  onClick={() => onConvert(candidate)}
                  className="flex-1 py-4 bg-linear-to-r from-green-500 to-teal-500 text-white rounded-4xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105 transition-all"
                >
                  <UserPlus size={18} /> CONVERT TO EMPLOYEE
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  FormSection (collapsible, matching Employee Management style)    */
/* ──────────────────────────────────────────────────────────────── */

function FormSection({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: React.ComponentType<{ size?: number }>; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 border-b border-slate-200/80 pb-2 pt-1 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0">
            <Icon size={16} />
          </div>
          <span className="text-[12px] font-black text-slate-800 uppercase tracking-[0.16em]">{title}</span>
        </div>
        {open ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  AddCandidateModal                                               */
/* ──────────────────────────────────────────────────────────────── */

interface AddCandidateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: NewCandidateForm;
  setForm: React.Dispatch<React.SetStateAction<NewCandidateForm>>;
  jobOpenings: JobOpening[];
  departments: string[];
  isSaving: boolean;
}

function AddCandidateModal({
  open, onClose, onSave, form, setForm, jobOpenings, departments, isSaving,
}: AddCandidateModalProps) {
  const candidateJobOpenings = useMemo(() => {
    return jobOpenings.filter((job) => {
      if (!job.isActive || (job.remainingVacancies ?? 0) <= 0) return false;
      return !form.department || job.department === form.department;
    });
  }, [jobOpenings, form.department]);

  const handleDepartmentChange = (dept: string) => {
    const first = candidateJobOpenings.find((o) => o.department === dept) || null;
    setForm((prev) => ({
      ...prev,
      department: dept,
      jobCode: first?.jobCode || "",
      position: first?.designation || first?.title || "",
    }));
  };

  const handleJobChange = (jobCode: string) => {
    const selected = jobOpenings.find((o) => o.jobCode === jobCode) || null;
    setForm((prev) => ({
      ...prev,
      jobCode,
      department: selected?.department || prev.department,
      position: selected?.designation || selected?.title || prev.position,
    }));
  };

  return open && createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[4vh] pb-8 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl mx-4 bg-slate-100 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <UserPlus size={16} /> Add Candidate
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X size={16} className="text-white/80" />
          </button>
        </div>
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5 bg-slate-100">
          <FormSection title="Basic Information" icon={Users}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name <span className="text-red-400">*</span></label>
                <input type="text" placeholder="John Doe" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email <span className="text-red-400">*</span></label>
                <input type="email" placeholder="john@example.com" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date of Birth</label>
                <input type="date" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mobile Number <span className="text-red-400">*</span></label>
                <input type="tel" placeholder="+91 00000 00000" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Country</label>
                <input type="text" placeholder="India" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">State</label>
                <input type="text" placeholder="Maharashtra" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">City</label>
                <input type="text" placeholder="Mumbai" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resume / CV <span className="text-red-400">*</span></label>
                <label className="w-full px-3 py-3 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-2 text-slate-500 font-semibold text-[11px] cursor-pointer hover:bg-white transition-all bg-white">
                  <FileText size={16} /> {form.resumeFile ? form.resumeFile.name : "Click to attach file (PDF/Doc)"}
                  <input type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" className="hidden" onChange={(event) => setForm({ ...form, resumeFile: event.target.files?.[0] || null })} />
                </label>
              </div>
            </div>
          </FormSection>

          <FormSection title="Custom Fields" icon={Target}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
                <select className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.department} onChange={(e) => handleDepartmentChange(e.target.value)}>
                  <option value="">Select department</option>
                  {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Candidate Source</label>
                <select className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="Walk-in">Walk-in</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Email">Email</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Referral">Referral</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Source Reference</label>
                <input type="text" placeholder={form.source === "LinkedIn" ? "https://linkedin.com/in/..." : form.source === "Walk-in" ? "Walk-in note or contact point" : "Reference or source details"} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.sourceReference} onChange={(e) => setForm({ ...form, sourceReference: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact Method</label>
                <select className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.contactMethod} onChange={(e) => setForm({ ...form, contactMethod: e.target.value })}>
                  <option value="In-person">In-person</option>
                  <option value="Phone">Phone</option>
                  <option value="Email">Email</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Company</label>
                <input type="text" placeholder="Optional" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.currentCompany} onChange={(e) => setForm({ ...form, currentCompany: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Position <span className="text-red-400">*</span></label>
                {candidateJobOpenings.length > 0 ? (
                  <select className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.jobCode} onChange={(e) => handleJobChange(e.target.value)}>
                    <option value="">Select a live opening</option>
                    {candidateJobOpenings.map((opening) => (
                      <option key={opening.jobCode} value={opening.jobCode}>
                        {(opening.designation || opening.title)} {opening.jobCode ? `(${opening.jobCode})` : ""} - {opening.department} ({opening.remainingVacancies} open)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="text" placeholder="e.g. Sales Executive" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Earliest Start Date</label>
                <input type="date" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.earliestStartDate} onChange={(e) => setForm({ ...form, earliestStartDate: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Salary Expectations</label>
                <input type="text" placeholder="e.g. ₹8,00,000 CTC" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.expectedSalary} onChange={(e) => setForm({ ...form, expectedSalary: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Availability</label>
                <select className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Remote</option>
                  <option>Contract</option>
                </select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Additional Details" icon={Award}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employment History</label>
                <textarea rows={2} placeholder="Past employers, titles, dates..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none" value={form.employmentHistory} onChange={(e) => setForm({ ...form, employmentHistory: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Education</label>
                <input type="text" placeholder="e.g. B.Tech IT (2021)" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Experience</label>
                <input type="text" placeholder="e.g. 3 Years" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Skills</label>
                <input type="text" placeholder="e.g. React, Node, Sales..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Certifications</label>
                <input type="text" placeholder="e.g. AWS, PMP..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notes</label>
                <textarea rows={2} placeholder="Walk-in context, LinkedIn note, call summary..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none" value={form.sourceNotes} onChange={(e) => setForm({ ...form, sourceNotes: e.target.value })} />
              </div>
            </div>
          </FormSection>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-100">
          <button type="button" onClick={onClose} className="btn-pill px-6 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || !form.fullName || !form.email || !form.mobileNumber || !form.position}
            onClick={onSave}
            className="btn-pill px-8 py-2.5 bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {isSaving ? "Saving..." : "Add to Pipeline"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  AddJobModal                                                      */
/* ──────────────────────────────────────────────────────────────── */

interface AddJobModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  mode?: "create" | "edit";
  form: NewJobForm;
  setForm: React.Dispatch<React.SetStateAction<NewJobForm>>;
  departments: string[];
}

function AddJobModal({ open, onClose, onSave, form, setForm, departments, mode = "create" }: AddJobModalProps) {
  return open && createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[4vh] pb-8 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
        <div
          className="relative w-full max-w-3xl mx-4 bg-slate-100 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Briefcase size={16} /> {mode === "edit" ? "Edit Job Opening" : "Publish Job Opening"}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X size={16} className="text-white/80" />
          </button>
        </div>
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5 bg-slate-100">
          <FormSection title="Job Details" icon={Briefcase}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Job Code</label>
                <input type="text" placeholder="e.g. HR-001" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.jobCode} onChange={(e) => setForm({ ...form, jobCode: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role / Designation <span className="text-red-400">*</span></label>
                <input type="text" placeholder="e.g. Senior Product Designer" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department <span className="text-red-400">*</span></label>
                <select className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="">Select Dept</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vacancies</label>
                <input type="number" min="1" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.vacancyTotal} onChange={(e) => setForm({ ...form, vacancyTotal: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employment Type</label>
                <select className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value, isPaid: e.target.value === "intern" ? false : form.isPaid })}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contractor">Contractor</option>
                  <option value="intern">Internship</option>
                  <option value="trainee">Trainee</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Paid Role</label>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200/60 bg-white px-3 py-2">
                  <input type="checkbox" checked={form.isPaid} disabled={form.employmentType === "intern"} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]" />
                  <span className="text-[12px] font-semibold text-slate-700">{form.employmentType === "intern" ? "Unpaid internship" : "Paid opening"}</span>
                </div>
              </div>
              {form.employmentType === "intern" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Internship Duration</label>
                  <select className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.internshipDurationMonths} onChange={(e) => setForm({ ...form, internshipDurationMonths: e.target.value })}>
                    {["2", "3", "4", "6"].map((months) => <option key={months} value={months}>{months} months</option>)}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location</label>
                <input type="text" placeholder="State" className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Mode</label>
                <select className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value })}>
                  <option value="on_site">On Site</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">About the Job</label>
                <textarea rows={6} placeholder="Short overview shown at the top of the role page..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none" value={form.aboutTheJob} onChange={(e) => setForm({ ...form, aboutTheJob: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Key Responsibilities</label>
                <textarea rows={6} placeholder="Add the bullet points shown in the left description tab..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none" value={form.keyResponsibilities} onChange={(e) => setForm({ ...form, keyResponsibilities: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Requirements</label>
                <textarea rows={6} placeholder="List the must-have skills and experience..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Soft Skills</label>
                <textarea rows={3} placeholder="Communication, teamwork, ownership..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none" value={form.softSkills} onChange={(e) => setForm({ ...form, softSkills: e.target.value })} />
              </div>
            </div>
          </FormSection>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-100">
          <button type="button" onClick={onClose} className="btn-pill px-6 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button
            type="button"
            disabled={!form.title || !form.department}
            onClick={onSave}
            className="btn-pill px-8 py-2.5 bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Briefcase size={14} />
            {mode === "edit" ? "Update Job" : "Publish to Website"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  HistoryModal                                                     */
/* ──────────────────────────────────────────────────────────────── */

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  data: HistoryView | null;
}

function HistoryModal({ open, onClose, data }: HistoryModalProps) {
  return (
    <AnimatePresence>
      {open && data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-4xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-8 border-b border-slate-100/60 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-none">Application History</h2>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-2">{data.title}</p>
              </div>
              <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm hover:text-red-500 transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-4 overflow-y-auto">
              {(data.history || []).map((h, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-100 text-slate-500 rounded-xl"><History size={20} /></div>
                    <div>
                      <p className="font-semibold text-slate-900">{h.cycle}</p>
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Closed: {h.closedOn}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{h.count}</p>
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Applicants</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  Main Page Component                                              */
/* ──────────────────────────────────────────────────────────────── */

export default function HRRecruitmentPage({ mode = "hr" }: { mode?: "hr" | "careers" } = {}) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("candidates");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCandidate, setIsSavingCandidate] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isBulkUploadMenuOpen, setIsBulkUploadMenuOpen] = useState(false);
  const [isBulkUploadInstructionsOpen, setIsBulkUploadInstructionsOpen] = useState(false);
  const [busyCandidateId, setBusyCandidateId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [viewingCandidate, setViewingCandidate] = useState<CandidateRaw | null>(null);
  const [viewingHistory, setViewingHistory] = useState<HistoryView | null>(null);

  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [candidates, setCandidates] = useState<CandidateRaw[]>([]);
  const [recruitmentSummary, setRecruitmentSummary] = useState<RecruitmentSummary>({
    totalCandidates: 0, selectedCount: 0, onboardedCount: 0, activeJobs: 0, sourceCounts: {},
  });

  const [newCandidate, setNewCandidate] = useState<NewCandidateForm>(EMPTY_CANDIDATE);
  const [newJob, setNewJob] = useState<NewJobForm>(EMPTY_JOB);
  const [editingJobCode, setEditingJobCode] = useState("");
  const bulkUploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecruitmentData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const overview = await getRecruitmentOverview();

        if (!isMounted) return;

        setCandidates(Array.isArray(overview.candidates) ? overview.candidates : []);
        setRecruitmentSummary(overview.summary || { totalCandidates: 0, selectedCount: 0, onboardedCount: 0, activeJobs: 0, sourceCounts: {} });
        setJobOpenings(Array.isArray(overview.jobOpenings)
          ? overview.jobOpenings.map((opening: Record<string, unknown>) => ({
            ...opening,
            designation: String(opening.designation || opening.title || opening.position || ""),
            isPostedOnWebsite: opening.isPostedOnWebsite === true,
          })) as JobOpening[]
          : []);
      } catch (error: any) {
        if (isMounted) {
          setErrorMessage(error?.message || "Failed to load recruitment pipeline.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadRecruitmentData();

    return () => { isMounted = false; };
  }, []);

  const displayedCandidates = useMemo(() => {
    return candidates.filter((c) =>
      (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.position || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [candidates, searchQuery]);

  const displayedJobs = useMemo(() => {
    return jobOpenings.filter((job) =>
      (job.designation || job.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.department || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [jobOpenings, searchQuery]);

  const refreshJobOpenings = async () => {
    const response = await getRecruitmentJobOpenings();
    const openings = response?.jobOpenings;
    if (Array.isArray(openings)) {
      setJobOpenings(openings.map((opening: Record<string, unknown>) => ({
        ...opening,
        designation: String(opening.designation || opening.title || opening.position || ""),
        isPostedOnWebsite: opening.isPostedOnWebsite === true,
      })) as JobOpening[]);
    }
  };

  const updateCandidateStatus = async (id: string, newStatus: string) => {
    setBusyCandidateId(id);
    try {
      const response = await updateRecruitmentCandidate(id, { status: newStatus });
      const updatedCandidate = response?.candidate;
      if (updatedCandidate) {
        setCandidates((prev) => prev.map((candidate) => (candidate.id === id ? updatedCandidate : candidate)));
      }
      if (response?.overview?.summary) {
        setRecruitmentSummary(response.overview.summary);
      }
    } finally {
      setBusyCandidateId("");
    }
  };

  const handleAcceptCandidate = async (id: string) => {
    await updateCandidateStatus(id, "Screening");
    setViewingCandidate(null);
  };

  const handleRejectCandidate = async (id: string) => {
    await updateCandidateStatus(id, "Rejected");
    setViewingCandidate(null);
  };

  const handleToggleJobStatus = async (job: JobOpening) => {
    if (!job?.jobCode) return;
    const nextIsActive = !job.isActive;
    try {
      await updateRecruitmentJobOpening(job.jobCode, { isActive: nextIsActive });
      await refreshJobOpenings();
      setRecruitmentSummary((prev) => ({
        ...prev,
        activeJobs: nextIsActive ? (prev.activeJobs || 0) + 1 : Math.max((prev.activeJobs || 0) - 1, 0),
      }));
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to update job opening.");
    }
  };

  const handleToggleWebsitePost = async (job: JobOpening) => {
    if (!job?.jobCode) return;
    try {
      await updateRecruitmentJobOpening(job.jobCode, { isPostedOnWebsite: !job.isPostedOnWebsite });
      await refreshJobOpenings();
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to update website posting status.");
    }
  };

  const buildRecruitmentReportRows = () => jobOpenings.map((job) => ({
    label: job.designation || job.title || job.jobCode || "Job Opening",
    value: [
      `Code: ${job.jobCode || "-"}`,
      `Department: ${job.department || "-"}`,
      `Type: ${job.employmentTypeLabel || job.employmentType || "-"}`,
      `Vacancies: ${job.vacancyFilled || 0}/${job.vacancyTotal || 0}`,
      `Paid: ${job.isPaid ? "Yes" : "No"}`,
      `Status: ${job.isActive ? "Active" : "Inactive"}`,
    ].join(" | "),
  }));

  const handleExportRecruitmentPDF = async () => {
    try {
      const response = await createReport({
        title: "Recruitment Job Openings",
        department: "HR",
        category: "HR",
        dataWindow: "All",
        reportMonth: new Date().toISOString().slice(0, 7),
        period: new Date().toISOString().slice(0, 7),
        generatedBy: "HR",
        format: "PDF",
        description: `Recruitment openings report - ${jobOpenings.length} jobs`,
        sourceType: "custom",
        sourceRef: "hr-recruitment-jobs",
        reportRows: buildRecruitmentReportRows(),
      });
      await downloadReportFile(response?.data?.download, { openInNewTab: false });
      window.dispatchEvent(new Event("reports:refresh"));
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to export recruitment PDF.");
    }
  };

  const handleExportRecruitmentExcel = async () => {
    try {
      const response = await createReport({
        title: "Recruitment Job Openings",
        department: "HR",
        category: "HR",
        dataWindow: "All",
        reportMonth: new Date().toISOString().slice(0, 7),
        period: new Date().toISOString().slice(0, 7),
        generatedBy: "HR",
        format: "Excel",
        description: `Recruitment openings report - ${jobOpenings.length} jobs`,
        sourceType: "custom",
        sourceRef: "hr-recruitment-jobs",
        reportRows: buildRecruitmentReportRows(),
      });
      await downloadReportFile(response?.data?.download, `${new Date().toISOString().slice(0, 10)}_Recruitment_Jobs.xlsx`);
      window.dispatchEvent(new Event("reports:refresh"));
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to export recruitment Excel.");
    }
  };

  const downloadRecruitmentTemplate = () => {
    const headers = [
      "jobCode",
      "title",
      "designation",
      "department",
      "employmentType",
      "vacancyTotal",
      "vacancyFilled",
      "isPaid",
      "internshipDurationMonths",
      "aboutTheJob",
      "location",
      "workMode",
      "keyResponsibilities",
      "requirements",
      "softSkills",
      "isActive",
    ];
    const csv = headers.join(",");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "recruitment_job_openings_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenBulkUploadMenu = () => {
    setErrorMessage("");
    setIsBulkUploadInstructionsOpen(false);
    setIsBulkUploadMenuOpen(true);
  };

  const handleUploadBulkDataClick = () => {
    bulkUploadInputRef.current?.click();
  };

  const buildJobFormFromOpening = (job: JobOpening): NewJobForm => ({
    jobCode: job.jobCode || "",
    title: job.title || job.designation || "",
    department: job.department || "",
    employmentType: String((job as any).employmentType || "full_time"),
    vacancyTotal: String(job.vacancyTotal ?? 1),
    isPaid: Boolean(job.isPaid ?? true),
    internshipDurationMonths: String((job as any).internshipDurationMonths ?? "6"),
    aboutTheJob: job.aboutTheJob || "",
    location: job.location || "",
    workMode: String((job as any).workMode || "on_site"),
    keyResponsibilities: job.keyResponsibilities || "",
    requirements: job.requirements || "",
    softSkills: job.softSkills || "",
  });

  const openCreateJobModal = () => {
    setEditingJobCode("");
    setNewJob(EMPTY_JOB);
    setIsJobModalOpen(true);
  };

  const openEditJobModal = (job: JobOpening) => {
    setEditingJobCode(job.jobCode || "");
    setNewJob(buildJobFormFromOpening(job));
    setIsJobModalOpen(true);
  };

  const handleAddJob = async () => {
    if (!newJob.title || !newJob.department) return;
    const nextJobCode = String(newJob.jobCode || "").trim().toUpperCase() || generateJobCode(newJob.title, newJob.department);
    try {
      const payload = {
        jobCode: nextJobCode,
        title: newJob.title,
        designation: newJob.title,
        department: newJob.department,
        employmentType: newJob.employmentType,
        vacancyTotal: Number(newJob.vacancyTotal || 1),
        isPaid: newJob.employmentType === "intern" ? false : Boolean(newJob.isPaid),
        internshipDurationMonths: newJob.employmentType === "intern" ? Number(newJob.internshipDurationMonths || 6) : null,
        aboutTheJob: newJob.aboutTheJob,
        location: newJob.location,
        workMode: newJob.workMode,
        keyResponsibilities: newJob.keyResponsibilities,
        requirements: newJob.requirements,
        softSkills: newJob.softSkills,
      };
      if (editingJobCode) {
        await updateRecruitmentJobOpening(editingJobCode, payload);
      } else {
        await createRecruitmentJobOpening(payload);
      }
      await refreshJobOpenings();
      const overview = await getRecruitmentOverview();
      if (overview?.summary) {
        setRecruitmentSummary(overview.summary);
      }
      setIsJobModalOpen(false);
      setActiveTab("jobs");
      setNewJob(EMPTY_JOB);
      setEditingJobCode("");
    } catch (error: any) {
      setErrorMessage(error?.message || (editingJobCode ? "Failed to update job opening." : "Failed to publish job opening."));
    }
  };

  const handleBulkUploadJobOpenings = async (file: File) => {
    if (!file) return;
    setIsBulkUploading(true);
    setErrorMessage("");
    try {
      const response = await bulkUploadRecruitmentJobOpenings(file);
      if (Array.isArray(response?.jobOpenings)) {
        setJobOpenings(response.jobOpenings.map((opening: Record<string, unknown>) => ({
          ...opening,
          designation: String(opening.designation || opening.title || opening.position || ""),
        })) as JobOpening[]);
      } else {
        await refreshJobOpenings();
      }

      if (response?.overview?.summary) {
        setRecruitmentSummary(response.overview.summary);
      }

      setActiveTab("jobs");
      setIsJobModalOpen(false);
      setEditingJobCode("");
      setIsBulkUploadMenuOpen(false);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to bulk upload job openings.");
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleBulkUploadFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    await handleBulkUploadJobOpenings(file);
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.fullName || !newCandidate.email || !newCandidate.mobileNumber || !newCandidate.position) return;
    setIsSavingCandidate(true);
    try {
      const customFields = buildCandidateCustomFields(newCandidate);
      const response = await createRecruitmentCandidate({
        fullName: newCandidate.fullName,
        email: newCandidate.email,
        phone: newCandidate.mobileNumber,
        department: newCandidate.department,
        jobCode: newCandidate.jobCode,
        position: newCandidate.position,
        designation: newCandidate.position,
        sourceType: newCandidate.source,
        sourceReference: newCandidate.sourceReference,
        sourceNotes: newCandidate.sourceNotes,
        contactMethod: newCandidate.contactMethod,
        currentCompany: newCandidate.currentCompany,
        dateOfBirth: newCandidate.dob,
        country: newCandidate.country,
        state: newCandidate.state,
        city: newCandidate.city,
        currentAddress: [newCandidate.country, newCandidate.state, newCandidate.city].filter(Boolean).join(", "),
        earliestStartDate: newCandidate.earliestStartDate,
        expectedSalary: newCandidate.expectedSalary,
        availability: newCandidate.availability,
        experience: newCandidate.experience,
        education: newCandidate.education,
        skills: newCandidate.skills,
        certifications: newCandidate.certifications,
        employmentHistory: newCandidate.employmentHistory,
        coverLetter: newCandidate.coverLetter,
        notes: newCandidate.notes,
        customFields: JSON.stringify(customFields),
        resumeFile: newCandidate.resumeFile,
      });
      const createdCandidate = response?.candidate;
      if (createdCandidate) setCandidates((prev) => [createdCandidate, ...prev]);
      if (response?.overview?.summary) setRecruitmentSummary(response.overview.summary);
      setIsCandidateModalOpen(false);
      setActiveTab("candidates");
      setNewCandidate(EMPTY_CANDIDATE);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to add candidate.");
    } finally {
      setIsSavingCandidate(false);
    }
  };

  const handleSendCandidateEmail = async (candidate: CandidateRaw) => {
    if (!candidate?.id) return;
    setBusyCandidateId(candidate.id);
    try {
      const response = await sendRecruitmentCandidateEmail(candidate.id, { templateType: "status_update" });
      const updatedCandidate = response?.candidate;
      if (updatedCandidate) {
        setCandidates((prev) => prev.map((entry) => (entry.id === candidate.id ? updatedCandidate : entry)));
        setViewingCandidate(updatedCandidate);
      }
      if (response?.overview?.summary) setRecruitmentSummary(response.overview.summary);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to send recruitment email.");
    } finally {
      setBusyCandidateId("");
    }
  };

  const handleRedirectToEmployeeManagement = (candidate: CandidateRaw) => {
    void updateCandidateStatus(candidate.id || "", "Converted to Employee").finally(() => {
      navigate("/dashboard/owner/employee-management", {
        state: {
          openAddModal: true,
          prefillData: {
            name: candidate.name,
            fullName: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            role: "Employee",
            jobCode: candidate.jobCode || "",
            jobTitle: candidate.position || "",
            designation: candidate.position || "",
            department: candidate.department || "",
            joinDate: candidate.formData?.earliestStartDate !== "Immediate" && candidate.formData?.earliestStartDate !== "Not specified" ? candidate.formData?.earliestStartDate : "",
            documentsAttached: true,
          },
        },
      });
    });
  };

  const statCards = useMemo(() => {
    if (activeTab === "jobs") {
      const totalJobs = jobOpenings.length;
      const activeJobs = jobOpenings.filter((job) => job.isActive).length;
      const totalVacancies = jobOpenings.reduce((sum, j) => sum + (j.vacancyTotal || 0), 0);
      const filledVacancies = jobOpenings.reduce((sum, j) => sum + (j.vacancyFilled || 0), 0);
      return [
        {
          key: "total-jobs", label: "Total Jobs",
          value: totalJobs, icon: Briefcase,
          class: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md",
          iconClass: "bg-blue-50 text-blue-600",
        },
        {
          key: "active-jobs", label: "Active",
          value: activeJobs, icon: CheckCircle2,
          class: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500",
          iconClass: "bg-emerald-50 text-emerald-600",
        },
        {
          key: "vacancies", label: "Total Vacancies",
          value: totalVacancies, icon: Users,
          class: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500",
          iconClass: "bg-amber-50 text-amber-500",
        },
        {
          key: "filled", label: "Filled",
          value: filledVacancies, icon: UserCheck,
          class: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500",
          iconClass: "bg-blue-50 text-blue-600",
        },
      ];
    }
    return [
      {
        key: "total-candidates", label: "Total Candidates",
        value: recruitmentSummary.totalCandidates || candidates.filter((c) => c.status !== "Converted to Employee").length,
        icon: Users, class: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md",
        iconClass: "bg-blue-50 text-blue-600",
      },
      {
        key: "selected", label: "Selected",
        value: recruitmentSummary.selectedCount || candidates.filter((c) => c.status === "Selected").length,
        icon: UserCheck, class: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-green-500",
        iconClass: "bg-green-50 text-green-500",
      },
      {
        key: "onboarded", label: "Onboarded",
        value: recruitmentSummary.onboardedCount || candidates.filter((c) => c.status === "Converted to Employee").length,
        icon: UserPlus, class: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-teal-500",
        iconClass: "bg-teal-50 text-teal-600",
      },
      {
        key: "screening", label: "In Screening",
        value: candidates.filter((c) => c.status === "Screening").length,
        icon: Clock, class: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500",
        iconClass: "bg-amber-50 text-amber-500",
      },
    ];
  }, [recruitmentSummary, candidates, jobOpenings, activeTab]);

  if (isLoading) return <HRRecruitmentSkeleton />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                {mode === "careers" ? "Careers" : "Recruitment Management"}
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                {mode === "careers" ? "Job openings & applications from your website." : "Core Module | Applicant Tracking System"}
              </p>
            </div>
            {activeTab === "jobs" && (
              <div className="flex items-center gap-2 mt-2 md:mt-0">
                <button
                  onClick={handleOpenBulkUploadMenu}
                  disabled={isBulkUploading}
                  className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-blue-50 hover:border-blue-200 text-slate-500 transition-all active:scale-95 shadow-sm disabled:opacity-60"
                >
                  {isBulkUploading ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <UploadCloud size={16} className="text-blue-500" />}
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500 text-white px-1.5 py-0.5 rounded">
                    BULK UPLOAD
                  </span>
                </button>
                
                <button
                  onClick={handleExportRecruitmentPDF}
                  className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm"
                >
                  <FileDown size={16} className="text-red-500" />
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">
                    PDF
                  </span>
                </button>
                <button
                  onClick={handleExportRecruitmentExcel}
                  className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm"
                >
                  <FileSpreadsheet size={16} className="text-emerald-500" />
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                    Excel
                  </span>
                </button>
                
              </div>
            )}
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs font-semibold text-rose-700 shadow-sm">
              {errorMessage}
            </div>
          )}

          {/* ── Main Pill Tabs ── */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            <button
              onClick={() => { setActiveTab("candidates"); setSearchQuery(""); }}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === "candidates"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {mode === "careers" ? "APPLICATIONS" : "CANDIDATES TRACKING"}
            </button>
            <button
              onClick={() => { setActiveTab("jobs"); setSearchQuery(""); }}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === "jobs"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              JOB OPENINGS
            </button>
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className={card.class}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className="text-[15px] font-black text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Data Panel ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Data panel header row */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col lg:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <div className="flex flex-col md:flex-row gap-3 w-full lg:w-revert-rule">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                {activeTab === "candidates" ? (
                  mode !== "careers" && (
                    <button
                      onClick={() => setIsCandidateModalOpen(true)}
                      className="btn-pill px-4 py-2.5 bg-[#2563EB] text-white flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <Plus size={13} strokeWidth={2.5} /> ADD CANDIDATE
                    </button>
                  )
                ) : (
                  <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={openCreateJobModal}
                        className="btn-pill px-4 py-2.5 bg-[#2563EB] text-white flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                      >
                      <Plus size={13} strokeWidth={2.5} /> PUBLISH JOB
                    </button>
                  </div>
                )}
              </div>
            </div>
            {activeTab === "jobs" && (
              <div className="px-5 pb-4 text-[10px] font-medium text-slate-500 flex flex-wrap gap-4 border-b border-slate-100/60 bg-slate-50/30">
                <span>Bulk upload uses the recruitment job template and keeps one job opening per row.</span>
                <span>Required fields: title, department, employmentType, vacancyTotal, isActive.</span>
                <span>jobCode is auto-generated if left blank, and designation will fall back to title.</span>
              </div>
            )}

            {/* Candidates table */}
            {activeTab === "candidates" && (
              <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4 text-left">Candidate Info</th>
                      <th className="px-5 py-4 text-left">Position Applied</th>
                      <th className="px-5 py-4 text-center">Source</th>
                      <th className="px-5 py-4">Pipeline Status</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {displayedCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-16 text-center text-slate-400 font-semibold">
                          <div className="flex flex-col items-center gap-3">
                            <FileText size={28} className="text-slate-300" />
                            <p className="text-sm">No candidates found for this workspace yet.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayedCandidates.map((can) => (
                        <tr key={can.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm shrink-0 border bg-[#2563EB] text-white border-blue-800">
                                {getInitials(can.name || "")}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 text-[12px]">{can.name}</p>
                                <p className="text-[9px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Mail size={9} /> {can.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800 text-[12px]">{can.position}</p>
                            {/* <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Exp: {can.exp}</p> */}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">{can.source}</span>
                          </td>
                          <td className="px-5 py-4">
                            {can.status === "Applied" || can.status === "Converted to Employee" || can.status === "Rejected" ? (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(can.status || "")}`}>
                                {can.status === "Applied" ? "Needs Screening" : can.status}
                              </span>
                            ) : (
                              <div className="relative w-40">
                                <select
                                  className={`w-full pl-3 pr-7 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border appearance-none cursor-pointer outline-none transition-all ${getStatusStyle(can.status || "")}`}
                                  value={can.status}
                                  onChange={(e) => can.id && updateCandidateStatus(can.id, e.target.value)}
                                >
                                  <option value="Screening">Screening</option>
                                  <option value="Interview Scheduled">Interview Scheduled</option>
                                  <option value="Interviewed">Interviewed</option>
                                  <option value="Selected">Selected</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-50" />
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setViewingCandidate(can)}
                                className="btn-pill px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] hover:border-blue-300 transition-all shadow-sm flex items-center gap-1.5"
                              >
                                <FileText size={11} /> {can.status === "Applied" ? "Review" : "Profile"}
                              </button>
                              {can.status === "Selected" && (
                                <button
                                  disabled={busyCandidateId === can.id}
                                  onClick={() => handleRedirectToEmployeeManagement(can)}
                                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Convert to Employee"
                                >
                                  <UserPlus size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Jobs table */}
            {activeTab === "jobs" && (
              <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4 text-left">Job Title & ID</th>
                      <th className="px-5 py-4 text-left">Department</th>
                      <th className="px-5 py-4 text-center">Application Stats</th>
                      <th className="px-5 py-4 text-center">Status</th>
                      <th className="px-5 py-4 text-center">Website Status</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {displayedJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-16 text-center text-slate-400 font-semibold">
                          <div className="flex flex-col items-center gap-3">
                            <Briefcase size={28} className="text-slate-300" />
                            <p className="text-sm">No job openings found.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayedJobs.map((job) => (
                        <tr key={job.jobCode || job.id} className={`transition-colors group ${job.isActive ? "hover:bg-slate-50/50" : "bg-slate-50/50 opacity-70"}`}>
                          <td className="px-5 py-4">
                            <p className={`font-semibold text-[12px] ${job.isActive ? "text-slate-800" : "text-slate-500"}`}>{job.designation || job.title}</p>
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                              {job.jobCode || job.id} | {job.employmentTypeLabel || "Full Time"}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-700 text-[11px]">{job.department}</p>
                            <p className="text-[9px] font-medium text-slate-400 mt-0.5">{job.isPaid ? "Paid role" : "Unpaid internship"}</p>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <p className="font-bold text-xl text-blue-600">{job.remainingVacancies ?? 0}</p>
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Open Slots</p>
                            <p className="text-[8px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">Filled {job.vacancyFilled || 0} / {job.vacancyTotal || 0}</p>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => handleToggleJobStatus(job)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                job.isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                              }`}
                            >
                              {job.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                              {job.isActive ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => handleToggleWebsitePost(job)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                job.isPostedOnWebsite
                                  ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                              }`}
                              >
                                {job.isPostedOnWebsite ? <Globe size={12} /> : <Globe size={12} className="opacity-50" />}
                                {job.isPostedOnWebsite ? "Posted" : "Not Posted"}
                              </button>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => openEditJobModal(job)}
                              className="btn-pill inline-flex items-center gap-1.5 border border-slate-200 bg-white px-2.5 py-1 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <AlignLeft size={12} />
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      </PageFrame>

      {isBulkUploadMenuOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] pb-8 bg-black/40 backdrop-blur-sm overflow-y-auto"
          onClick={() => setIsBulkUploadMenuOpen(false)}
        >
          <div
            className="relative w-full max-w-xl mx-4 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud size={16} /> Bulk Upload Job Openings
              </h3>
              <button
                onClick={() => setIsBulkUploadMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-[11px] leading-6 text-slate-600">
                <p className="font-bold text-slate-800 mb-2">Before you upload</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Use the template headers exactly as downloaded.</li>
                  <li>Leave <span className="font-semibold">jobCode</span> blank to auto-generate it, or fill it manually if you want a fixed code.</li>
                  <li><span className="font-semibold">designation</span> should match the role shown in add employee so both screens stay aligned.</li>
                  <li>Use <span className="font-semibold">true</span> or <span className="font-semibold">false</span> for boolean columns like <span className="font-semibold">isPaid</span> and <span className="font-semibold">isActive</span>.</li>
                  <li>One job opening per row. Duplicate jobCode values will update the existing opening for this workspace.</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={downloadRecruitmentTemplate}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left hover:border-blue-200 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                      <FileSpreadsheet size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">Download Template</p>
                      <p className="text-[10px] text-slate-500 mt-1">Get the CSV with all required columns and example data.</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleUploadBulkDataClick}
                  disabled={isBulkUploading}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left hover:border-blue-200 hover:bg-blue-50 transition-all disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                      {isBulkUploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">Upload Bulk Data</p>
                      <p className="text-[10px] text-slate-500 mt-1">Upload a completed CSV file to create or update job openings.</p>
                    </div>
                  </div>
                </button>
              </div>

              <details
                open={isBulkUploadInstructionsOpen}
                onToggle={(event) => setIsBulkUploadInstructionsOpen(event.currentTarget.open)}
                className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden"
              >
                <summary className="cursor-pointer list-none px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>Read Instructions</span>
                  <ChevronDown size={14} className={`transition-transform ${isBulkUploadInstructionsOpen ? "rotate-180" : ""}`} />
                </summary>
                <div className="px-4 pb-4 text-[11px] leading-6 text-slate-600 space-y-2 border-t border-slate-200/70">
                    <p>Template fields: jobCode, title, designation, department, employmentType, vacancyTotal, vacancyFilled, isPaid, internshipDurationMonths, aboutTheJob, location, workMode, keyResponsibilities, requirements, softSkills, isActive.</p>
                  <p>Leave jobCode empty if you want the backend to generate it. Leave designation empty if you want it to follow title.</p>
                  <p>Use true or false for boolean values. Keep one job opening per row. Do not add extra columns.</p>
                </div>
              </details>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <input
        ref={bulkUploadInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleBulkUploadFileChange}
      />

      {/* Candidate Detail Modal */}
      {viewingCandidate && (
        <CandidateDetailModal
          candidate={viewingCandidate}
          onClose={() => setViewingCandidate(null)}
          onReject={handleRejectCandidate}
          onAccept={handleAcceptCandidate}
          onSendEmail={handleSendCandidateEmail}
          onConvert={handleRedirectToEmployeeManagement}
          busyId={busyCandidateId}
        />
      )}

      {/* History Modal */}
      <HistoryModal
        open={viewingHistory !== null}
        onClose={() => setViewingHistory(null)}
        data={viewingHistory}
      />

      {/* Add Candidate Modal */}
      {mode !== "careers" && (
        <AddCandidateModal
          open={isCandidateModalOpen}
          onClose={() => { setIsCandidateModalOpen(false); setNewCandidate(EMPTY_CANDIDATE); }}
          onSave={handleAddCandidate}
          form={newCandidate}
          setForm={setNewCandidate}
          jobOpenings={jobOpenings}
          departments={DEPARTMENTS}
          isSaving={isSavingCandidate}
        />
      )}

      {mode !== "careers" && (
        <>
          {/* Publish Job Modal */}
          <AddJobModal
            open={isJobModalOpen}
            onClose={() => { setIsJobModalOpen(false); setNewJob(EMPTY_JOB); setEditingJobCode(""); }}
            onSave={handleAddJob}
            form={newJob}
            setForm={setNewJob}
            departments={DEPARTMENTS}
            mode={editingJobCode ? "edit" : "create"}
          />
        </>
      )}
    </div>
  );
}
