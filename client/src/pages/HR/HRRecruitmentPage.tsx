import React, { useEffect, useMemo, useState } from "react";
import {
  Search, Plus, X, Briefcase, Users, FileText,
  CheckCircle2, XCircle, MapPin, Building, Calendar,
  UserCheck, UserPlus, ChevronDown, Mail, Phone, ExternalLink,
  History, ToggleRight, ToggleLeft, DollarSign, GraduationCap,
  Target, AlignLeft, Award, Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageFrame from "@/components/Pages/PageFrame";
import { HRRecruitmentSkeleton } from "@/components/ui/Skeleton";
import {
  createRecruitmentCandidate,
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
  exp?: string;
  source?: string;
  status?: string;
  resume?: string;
  formData?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    dob?: string;
    address?: string;
    earliestStartDate?: string;
    availability?: string;
    expectedSalary?: string;
    employmentHistory?: string;
    education?: string;
    skills?: string;
    certifications?: string;
    coverLetter?: string;
  };
}

interface JobOpening {
  jobCode?: string;
  id?: string;
  title?: string;
  department?: string;
  employmentTypeLabel?: string;
  isPaid?: boolean;
  isActive?: boolean;
  remainingVacancies?: number;
  vacancyTotal?: number;
  vacancyFilled?: number;
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
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
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
  title: string;
  department: string;
  employmentType: string;
  vacancyTotal: string;
  isPaid: boolean;
  internshipDurationMonths: string;
  description: string;
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
  firstName: "", middleName: "", lastName: "", email: "", phone: "", dob: "", address: "",
  department: "", jobCode: "", position: "", source: "Walk-in", sourceReference: "", sourceNotes: "",
  contactMethod: "In-person", currentCompany: "", earliestStartDate: "", expectedSalary: "",
  availability: "Full-time", experience: "", education: "", skills: "", certifications: "",
  employmentHistory: "", coverLetter: "", notes: "", resumeFile: null,
};

const EMPTY_JOB: NewJobForm = {
  title: "", department: "", employmentType: "full_time", vacancyTotal: "1",
  isPaid: true, internshipDurationMonths: "6", description: "",
};

/* ───────────────────────────── Helpers ───────────────────────────── */

function getStatusStyle(status: string): string {
  return STATUS_STYLE[status] || "bg-slate-50 text-slate-600";
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
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

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-4xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="p-8 bg-slate-50 border-b border-slate-100/60 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-slate-900 leading-none">{candidate.name}</h2>
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
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-sm h-10 disabled:opacity-60"
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
              <Users size={16} /> Personal & Contact Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-8 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/60">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1">First Name</p>
                <p className="font-semibold text-slate-900">{fd.firstName}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1">Middle Name</p>
                <p className="font-semibold text-slate-900">{fd.middleName || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1">Last Name</p>
                <p className="font-semibold text-slate-900">{fd.lastName}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1">Date of Birth</p>
                <p className="font-semibold text-slate-900">{fd.dob}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><Mail size={12} /> Email Address</p>
                <p className="font-semibold text-slate-900">{candidate.email}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><Phone size={12} /> Phone Number</p>
                <p className="font-semibold text-slate-900">{candidate.phone}</p>
              </div>
              <div className="col-span-4">
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><MapPin size={12} /> Current Address</p>
                <p className="font-semibold text-slate-900">{fd.address}</p>
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
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><Calendar size={12} /> Earliest Start Date</p>
                <p className="font-semibold text-slate-900">{fd.earliestStartDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><Clock size={12} /> Availability</p>
                <p className="font-semibold text-slate-900">{fd.availability}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1 flex items-center gap-1"><DollarSign size={12} /> Expected Salary (CTC)</p>
                <p className="font-semibold text-slate-900">{fd.expectedSalary}</p>
              </div>
            </div>
          </div>

          <div>
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
          </div>

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
              <button className="p-2 bg-white text-slate-600 hover:text-blue-600 rounded-lg shadow-sm border border-slate-200 transition-all flex items-center gap-2 text-xs font-medium px-4">
                <ExternalLink size={14} /> View File
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100/60 flex gap-4 shrink-0">
          {candidate.status === "Applied" ? (
            <>
              <button
                onClick={() => candidate.id && onReject(candidate.id)}
                disabled={busyId === candidate.id}
                className="flex-1 py-4 bg-white border border-red-200 text-red-600 rounded-4xl font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <XCircle size={18} /> REJECT CANDIDATE
              </button>
              <button
                onClick={() => candidate.id && onAccept(candidate.id)}
                disabled={busyId === candidate.id}
                className="flex-1 py-4 bg-[#2563EB] text-white rounded-4xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CheckCircle2 size={18} /> ACCEPT FOR SCREENING
              </button>
            </>
          ) : (
            <div className="flex gap-4 w-full">
              <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 rounded-4xl font-semibold text-slate-600 hover:bg-slate-100 transition-all">
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
      position: first?.title || "",
    }));
  };

  const handleJobChange = (jobCode: string) => {
    const selected = jobOpenings.find((o) => o.jobCode === jobCode) || null;
    setForm((prev) => ({
      ...prev,
      jobCode,
      department: selected?.department || prev.department,
      position: selected?.title || prev.position,
    }));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-4xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
          >
            <div className="p-8 bg-blue-50 border-b border-blue-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-blue-900 leading-none flex items-center gap-2">
                  <UserPlus size={24} /> Add Candidate
                </h2>
                <p className="text-[10px] font-medium text-[#2563EB] uppercase tracking-wider mt-2">Manual Entry to ATS Pipeline</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto flex-1 bg-white">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/60 pb-2 mb-4">1. Personal & Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">First Name *</label>
                    <input type="text" placeholder="John" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Middle Name</label>
                    <input type="text" placeholder="Optional" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Last Name *</label>
                    <input type="text" placeholder="Doe" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Email Address *</label>
                    <input type="email" placeholder="john@example.com" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Phone Number</label>
                    <input type="tel" placeholder="+91 00000 00000" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                    <input type="date" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Current Address</label>
                    <input type="text" placeholder="Street, City, State, ZIP" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Department</label>
                    <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={form.department} onChange={(e) => handleDepartmentChange(e.target.value)}>
                      <option value="">Select department</option>
                      {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/60 pb-2 mb-4">2. Source & Job-Specific Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Candidate Source</label>
                    <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                      <option value="Walk-in">Walk-in</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Email">Email</option>
                      <option value="Phone Call">Phone Call</option>
                      <option value="Referral">Referral</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Source Reference</label>
                    <input type="text" placeholder={form.source === "LinkedIn" ? "https://linkedin.com/in/..." : form.source === "Walk-in" ? "Walk-in note or contact point" : "Reference or source details"} className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.sourceReference} onChange={(e) => setForm({ ...form, sourceReference: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Contact Method</label>
                    <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={form.contactMethod} onChange={(e) => setForm({ ...form, contactMethod: e.target.value })}>
                      <option value="In-person">In-person</option>
                      <option value="Phone">Phone</option>
                      <option value="Email">Email</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Current Company</label>
                    <input type="text" placeholder="Optional" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.currentCompany} onChange={(e) => setForm({ ...form, currentCompany: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Position Applied For *</label>
                    {candidateJobOpenings.length > 0 ? (
                      <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={form.jobCode} onChange={(e) => handleJobChange(e.target.value)}>
                        <option value="">Select a live opening</option>
                        {candidateJobOpenings.map((opening) => (
                          <option key={opening.jobCode} value={opening.jobCode}>
                            {opening.title} - {opening.department} ({opening.remainingVacancies} open)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" placeholder="e.g. Sales Executive" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Earliest Start Date</label>
                    <input type="date" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.earliestStartDate} onChange={(e) => setForm({ ...form, earliestStartDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Salary Expectations</label>
                    <input type="text" placeholder="e.g. ₹8,00,000 CTC" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.expectedSalary} onChange={(e) => setForm({ ...form, expectedSalary: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Availability</label>
                    <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}>
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Remote</option>
                      <option>Contract</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/60 pb-2 mb-4">3. Professional Background</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Employment History</label>
                    <textarea rows={2} placeholder="Past employers, titles, dates..." className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none resize-none" value={form.employmentHistory} onChange={(e) => setForm({ ...form, employmentHistory: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Educational Background</label>
                    <input type="text" placeholder="e.g. B.Tech IT (2021)" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Experience Level</label>
                    <input type="text" placeholder="e.g. 3 Years" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Skills</label>
                    <input type="text" placeholder="e.g. React, Node, Sales..." className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Certifications</label>
                    <input type="text" placeholder="e.g. AWS, PMP..." className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Source Notes</label>
                    <textarea rows={2} placeholder="Walk-in context, LinkedIn note, call summary..." className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none resize-none" value={form.sourceNotes} onChange={(e) => setForm({ ...form, sourceNotes: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Upload Resume / CV</label>
                    <label className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-semibold text-sm cursor-pointer hover:bg-slate-50 transition-all">
                      <FileText size={18} /> {form.resumeFile ? form.resumeFile.name : "Click to attach file (PDF/Doc)"}
                      <input type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" className="hidden" onChange={(event) => setForm({ ...form, resumeFile: event.target.files?.[0] || null })} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100/60 flex gap-4 shrink-0">
              <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 rounded-4xl font-semibold text-slate-500 hover:text-slate-900 transition-all">CANCEL</button>
              <button
                onClick={onSave}
                disabled={isSaving || !form.firstName || !form.lastName || !form.email || !form.position}
                className="flex-1 py-4 bg-[#2563EB] text-white rounded-4xl font-semibold shadow-lg disabled:bg-slate-300 disabled:shadow-none hover:bg-blue-700 transition-all"
              >
                {isSaving ? "SAVING..." : "ADD TO PIPELINE"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  AddJobModal                                                      */
/* ──────────────────────────────────────────────────────────────── */

interface AddJobModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: NewJobForm;
  setForm: React.Dispatch<React.SetStateAction<NewJobForm>>;
  departments: string[];
}

function AddJobModal({ open, onClose, onSave, form, setForm, departments }: AddJobModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-4xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-8 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-white leading-none flex items-center gap-2">
                  <Briefcase size={24} /> Publish Job Opening
                </h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-2">Visible on Company Website & Careers Page</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-white">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Job Title</label>
                  <input type="text" placeholder="e.g. Senior Product Designer" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Department</label>
                  <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                    <option value="">Select Dept</option>
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Vacancies</label>
                  <input type="number" min="1" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={form.vacancyTotal} onChange={(e) => setForm({ ...form, vacancyTotal: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Employment Type</label>
                  <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value, isPaid: e.target.value === "intern" ? false : form.isPaid })}>
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contractor">Contractor</option>
                    <option value="intern">Internship</option>
                    <option value="trainee">Trainee</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Paid Role</label>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input type="checkbox" checked={form.isPaid} disabled={form.employmentType === "intern"} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]" />
                    <span className="text-sm font-semibold text-slate-700">{form.employmentType === "intern" ? "Unpaid internship" : "Paid opening"}</span>
                  </div>
                </div>
                {form.employmentType === "intern" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Internship Duration (Months)</label>
                    <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={form.internshipDurationMonths} onChange={(e) => setForm({ ...form, internshipDurationMonths: e.target.value })}>
                      {["2", "3", "4", "6"].map((months) => <option key={months} value={months}>{months} months</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                  <textarea rows={4} placeholder="Describe the role and key requirements..." className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-medium text-slate-700 focus:border-[#2563EB] outline-none resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100/60 flex gap-4 shrink-0">
              <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 rounded-4xl font-semibold text-slate-500 hover:text-slate-900 transition-all">CANCEL</button>
              <button
                onClick={onSave}
                disabled={!form.title || !form.department}
                className="flex-1 py-4 bg-slate-900 text-white rounded-4xl font-semibold shadow-lg disabled:bg-slate-300 disabled:shadow-none hover:bg-black transition-all"
              >
                PUBLISH TO WEBSITE
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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

export default function HRRecruitmentPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("candidates");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCandidate, setIsSavingCandidate] = useState(false);
  const [busyCandidateId, setBusyCandidateId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [activeForm, setActiveForm] = useState<"add-candidate" | "add-job" | null>(null);
  const [viewingCandidate, setViewingCandidate] = useState<CandidateRaw | null>(null);
  const [viewingHistory, setViewingHistory] = useState<HistoryView | null>(null);

  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [candidates, setCandidates] = useState<CandidateRaw[]>([]);
  const [recruitmentSummary, setRecruitmentSummary] = useState<RecruitmentSummary>({
    totalCandidates: 0, selectedCount: 0, onboardedCount: 0, activeJobs: 0, sourceCounts: {},
  });

  const [newCandidate, setNewCandidate] = useState<NewCandidateForm>(EMPTY_CANDIDATE);
  const [newJob, setNewJob] = useState<NewJobForm>(EMPTY_JOB);

  useEffect(() => {
    let isMounted = true;

    async function loadRecruitmentData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getRecruitmentOverview();
        const overview = response?.data || {};

        if (!isMounted) return;

        setCandidates(Array.isArray(overview.candidates) ? overview.candidates : []);
        setRecruitmentSummary(overview.summary || { totalCandidates: 0, selectedCount: 0, onboardedCount: 0, activeJobs: 0, sourceCounts: {} });
        setJobOpenings(Array.isArray(overview.jobOpenings) ? overview.jobOpenings : []);
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
      (job.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.department || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [jobOpenings, searchQuery]);

  const refreshJobOpenings = async () => {
    const response = await getRecruitmentJobOpenings();
    const openings = response?.data?.jobOpenings;
    if (Array.isArray(openings)) setJobOpenings(openings);
  };

  const updateCandidateStatus = async (id: string, newStatus: string) => {
    setBusyCandidateId(id);
    try {
      const response = await updateRecruitmentCandidate(id, { status: newStatus });
      const updatedCandidate = response?.data?.candidate;
      if (updatedCandidate) {
        setCandidates((prev) => prev.map((candidate) => (candidate.id === id ? updatedCandidate : candidate)));
      }
      if (response?.data?.overview?.summary) {
        setRecruitmentSummary(response.data.overview.summary);
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

  const handleAddJob = async () => {
    if (!newJob.title || !newJob.department) return;
    try {
      await createRecruitmentJobOpening({
        title: newJob.title,
        department: newJob.department,
        employmentType: newJob.employmentType,
        vacancyTotal: Number(newJob.vacancyTotal || 1),
        isPaid: newJob.employmentType === "intern" ? false : Boolean(newJob.isPaid),
        internshipDurationMonths: newJob.employmentType === "intern" ? Number(newJob.internshipDurationMonths || 6) : null,
        description: newJob.description,
      });
      await refreshJobOpenings();
      setRecruitmentSummary((prev) => ({ ...prev, activeJobs: (prev.activeJobs || 0) + 1 }));
      setActiveForm(null);
      setActiveTab("jobs");
      setNewJob(EMPTY_JOB);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to publish job opening.");
    }
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.firstName || !newCandidate.lastName || !newCandidate.email || !newCandidate.position) return;
    setIsSavingCandidate(true);
    try {
      const response = await createRecruitmentCandidate({
        firstName: newCandidate.firstName,
        middleName: newCandidate.middleName,
        lastName: newCandidate.lastName,
        email: newCandidate.email,
        phone: newCandidate.phone,
        department: newCandidate.department,
        jobCode: newCandidate.jobCode,
        position: newCandidate.position,
        sourceType: newCandidate.source,
        sourceReference: newCandidate.sourceReference,
        sourceNotes: newCandidate.sourceNotes,
        contactMethod: newCandidate.contactMethod,
        currentCompany: newCandidate.currentCompany,
        dateOfBirth: newCandidate.dob,
        currentAddress: newCandidate.address,
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
        resumeFile: newCandidate.resumeFile,
      });
      const createdCandidate = response?.data?.candidate;
      if (createdCandidate) setCandidates((prev) => [createdCandidate, ...prev]);
      if (response?.data?.overview?.summary) setRecruitmentSummary(response.data.overview.summary);
      setActiveForm(null);
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
      const updatedCandidate = response?.data?.candidate;
      if (updatedCandidate) {
        setCandidates((prev) => prev.map((entry) => (entry.id === candidate.id ? updatedCandidate : entry)));
        setViewingCandidate(updatedCandidate);
      }
      if (response?.data?.overview?.summary) setRecruitmentSummary(response.data.overview.summary);
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
            email: candidate.email,
            phone: candidate.phone,
            role: candidate.position,
            joinDate: candidate.formData?.earliestStartDate !== "Immediate" && candidate.formData?.earliestStartDate !== "Not specified" ? candidate.formData?.earliestStartDate : "",
            documentsAttached: true,
          },
        },
      });
    });
  };

  const statCards = useMemo(() => [
    {
      key: "active-jobs", label: "Active Jobs",
      value: recruitmentSummary.activeJobs || jobOpenings.filter((job) => job.isActive).length,
      icon: Briefcase, class: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md",
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      key: "total-candidates", label: "Total Candidates",
      value: recruitmentSummary.totalCandidates || candidates.filter((c) => c.status !== "Converted to Employee").length,
      icon: Users, class: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500",
      iconClass: "bg-amber-50 text-amber-500",
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
  ], [recruitmentSummary, candidates, jobOpenings]);

  if (isLoading) return <HRRecruitmentSkeleton />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                {activeForm === "add-candidate"
                  ? "Add Candidate"
                  : activeForm === "add-job"
                  ? "Publish Job Opening"
                  : "Recruitment Management"}
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                {activeForm === "add-candidate"
                  ? "Manual Entry to ATS Pipeline"
                  : activeForm === "add-job"
                  ? "Visible on Company Website & Careers Page"
                  : "Core Module | Applicant Tracking System"}
              </p>
            </div>
            {activeForm && (
              <button
                onClick={() => { setActiveForm(null); if (activeForm === "add-candidate") setNewCandidate(EMPTY_CANDIDATE); else setNewJob(EMPTY_JOB); }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
              >
                <X size={14} /> Back to {activeForm === "add-candidate" ? "Candidates" : "Job Openings"}
              </button>
            )}
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs font-semibold text-rose-700 shadow-sm">
              {errorMessage}
            </div>
          )}

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
              {/* Pill-style main tabs */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto">
                <button
                  onClick={() => { setActiveTab("candidates"); setActiveForm(null); setSearchQuery(""); if (activeForm === "add-candidate") setNewCandidate(EMPTY_CANDIDATE); }}
                  className={`flex-1 lg:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === "candidates"
                      ? "bg-white shadow-sm text-[#2563EB]"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  CANDIDATES TRACKING
                </button>
                <button
                  onClick={() => { setActiveTab("jobs"); setActiveForm(null); setSearchQuery(""); if (activeForm === "add-job") setNewJob(EMPTY_JOB); }}
                  className={`flex-1 lg:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === "jobs"
                      ? "bg-white shadow-sm text-[#2563EB]"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  JOB OPENINGS
                </button>
              </div>

              {!activeForm && (
                <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder={`Search ${activeTab}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#2563EB] outline-none"
                    />
                  </div>
                  {activeTab === "candidates" ? (
                    <button
                      onClick={() => setActiveForm("add-candidate")}
                      className="px-6 py-3 bg-[#2563EB] text-white rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                    >
                      <Plus size={16} strokeWidth={3} /> ADD CANDIDATE
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveForm("add-job")}
                      className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md"
                    >
                      <Plus size={16} strokeWidth={3} /> PUBLISH JOB
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Candidates table */}
            {!activeForm && activeTab === "candidates" && (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-8 py-5">Candidate Info</th>
                      <th className="px-8 py-5">Position Applied</th>
                      <th className="px-8 py-5 text-center">Source</th>
                      <th className="px-8 py-5">Pipeline Status</th>
                      <th className="px-8 py-5 text-center">Actions</th>
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
                        <tr key={can.id} className="hover:bg-blue-50/30 transition-all group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-linear-to-br from-[#2563EB] to-[#1e40af] rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                                {getInitials(can.name || "")}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{can.name}</div>
                                <div className="text-[10px] font-medium text-slate-500 mt-0.5 flex items-center gap-2">
                                  <Mail size={10} /> {can.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="font-semibold text-blue-900">{can.position}</div>
                            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                              Exp: {can.exp}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">{can.source}</span>
                          </td>
                          <td className="px-8 py-5">
                            {can.status === "Applied" || can.status === "Converted to Employee" || can.status === "Rejected" ? (
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getStatusStyle(can.status || "")}`}>
                                {can.status === "Applied" ? "Needs Screening" : can.status}
                              </span>
                            ) : (
                              <div className="relative w-48">
                                <select
                                  className={`w-full pl-3 pr-8 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border appearance-none cursor-pointer outline-none transition-all ${getStatusStyle(can.status || "")}`}
                                  value={can.status}
                                  onChange={(e) => can.id && updateCandidateStatus(can.id, e.target.value)}
                                >
                                  <option value="Screening">Screening</option>
                                  <option value="Interview Scheduled">Interview Scheduled</option>
                                  <option value="Interviewed">Interviewed</option>
                                  <option value="Selected">Selected</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-50" />
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setViewingCandidate(can)}
                                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-[#2563EB] rounded-xl font-semibold text-[10px] uppercase transition-all flex items-center gap-1.5"
                              >
                                <FileText size={14} /> {can.status === "Applied" ? "Review Form" : "View Profile"}
                              </button>
                              {can.status === "Selected" && (
                                <button
                                  disabled={busyCandidateId === can.id}
                                  onClick={() => handleRedirectToEmployeeManagement(can)}
                                  className="p-2 bg-linear-to-r from-green-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100"
                                  title="Convert & Add to Database"
                                >
                                  <UserPlus size={16} />
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
            {!activeForm && activeTab === "jobs" && (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-8 py-5">Job Title & ID</th>
                      <th className="px-8 py-5">Department & Location</th>
                      <th className="px-8 py-5 text-center">Application Stats</th>
                      <th className="px-8 py-5 text-center">Website Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {displayedJobs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-16 text-center text-slate-400 font-semibold">
                          <div className="flex flex-col items-center gap-3">
                            <Briefcase size={28} className="text-slate-300" />
                            <p className="text-sm">No job openings found.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayedJobs.map((job) => (
                        <tr key={job.jobCode || job.id} className={`transition-all ${job.isActive ? "hover:bg-blue-50/30" : "bg-slate-50/50 opacity-80"}`}>
                          <td className="px-8 py-5">
                            <div className={`font-semibold ${job.isActive ? "text-slate-900" : "text-slate-500"}`}>{job.title}</div>
                            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                              {job.jobCode || job.id} | {job.employmentTypeLabel || "Full Time"}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5 mb-1">
                              <Building size={12} className="text-slate-400" /> {job.department}
                            </div>
                            <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                              <MapPin size={12} className="text-slate-400" /> {job.isPaid ? "Paid role" : "Unpaid internship"}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="font-semibold text-2xl text-blue-600">
                              {job.remainingVacancies ?? 0}
                              <span className="text-[10px] text-slate-400 font-medium uppercase block tracking-wider">Open Slots</span>
                            </div>
                            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-2">
                              Filled {job.vacancyFilled || 0} / {job.vacancyTotal || 0}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <button
                              onClick={() => handleToggleJobStatus(job)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl mx-auto font-semibold text-xs uppercase tracking-wider transition-all ${
                                job.isActive
                                  ? "bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-600"
                                  : "bg-slate-100 text-slate-500 hover:bg-green-50 hover:text-green-600"
                              }`}
                            >
                              {job.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                              {job.isActive ? "Active" : "Inactive"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Inline Add Candidate Form ── */}
            {activeForm === "add-candidate" && (
              <div className="p-6 md:p-8 space-y-8 overflow-y-auto flex-1 bg-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><UserPlus size={20} /></div>
                  <div>
                    <h3 className="text-base font-bold text-blue-900">Add Candidate</h3>
                    <p className="text-[10px] font-medium text-[#2563EB] uppercase tracking-wider">Manual Entry to ATS Pipeline</p>
                  </div>
                </div>

                {/* Section 1 */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/60 pb-2 mb-4">1. Personal & Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">First Name *</label>
                      <input type="text" placeholder="John" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.firstName} onChange={(e) => setNewCandidate({ ...newCandidate, firstName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Middle Name</label>
                      <input type="text" placeholder="Optional" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.middleName} onChange={(e) => setNewCandidate({ ...newCandidate, middleName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Last Name *</label>
                      <input type="text" placeholder="Doe" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.lastName} onChange={(e) => setNewCandidate({ ...newCandidate, lastName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Email Address *</label>
                      <input type="email" placeholder="john@example.com" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.email} onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Phone Number</label>
                      <input type="tel" placeholder="+91 00000 00000" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.phone} onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                      <input type="date" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.dob} onChange={(e) => setNewCandidate({ ...newCandidate, dob: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Current Address</label>
                      <input type="text" placeholder="Street, City, State, ZIP" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.address} onChange={(e) => setNewCandidate({ ...newCandidate, address: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Department</label>
                      <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={newCandidate.department} onChange={(e) => {
                        const dept = e.target.value;
                        const filteredJobs = jobOpenings.filter((job) => job.isActive && (job.remainingVacancies ?? 0) > 0 && (!dept || job.department === dept));
                        const first = filteredJobs[0] || null;
                        setNewCandidate((prev) => ({ ...prev, department: dept, jobCode: first?.jobCode || "", position: first?.title || "" }));
                      }}>
                        <option value="">Select department</option>
                        {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/60 pb-2 mb-4">2. Source & Job-Specific Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Candidate Source</label>
                      <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={newCandidate.source} onChange={(e) => setNewCandidate({ ...newCandidate, source: e.target.value })}>
                        <option value="Walk-in">Walk-in</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Email">Email</option>
                        <option value="Phone Call">Phone Call</option>
                        <option value="Referral">Referral</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Source Reference</label>
                      <input type="text" placeholder={newCandidate.source === "LinkedIn" ? "https://linkedin.com/in/..." : newCandidate.source === "Walk-in" ? "Walk-in note or contact point" : "Reference or source details"} className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.sourceReference} onChange={(e) => setNewCandidate({ ...newCandidate, sourceReference: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Contact Method</label>
                      <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={newCandidate.contactMethod} onChange={(e) => setNewCandidate({ ...newCandidate, contactMethod: e.target.value })}>
                        <option value="In-person">In-person</option>
                        <option value="Phone">Phone</option>
                        <option value="Email">Email</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Current Company</label>
                      <input type="text" placeholder="Optional" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.currentCompany} onChange={(e) => setNewCandidate({ ...newCandidate, currentCompany: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Position Applied For *</label>
                      {jobOpenings.filter((job) => job.isActive && (job.remainingVacancies ?? 0) > 0 && (!newCandidate.department || job.department === newCandidate.department)).length > 0 ? (
                        <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={newCandidate.jobCode} onChange={(e) => {
                          const jobCode = e.target.value;
                          const selected = jobOpenings.find((o) => o.jobCode === jobCode) || null;
                          setNewCandidate((prev) => ({ ...prev, jobCode, department: selected?.department || prev.department, position: selected?.title || prev.position }));
                        }}>
                          <option value="">Select a live opening</option>
                          {jobOpenings.filter((job) => job.isActive && (job.remainingVacancies ?? 0) > 0 && (!newCandidate.department || job.department === newCandidate.department)).map((opening) => (
                            <option key={opening.jobCode} value={opening.jobCode}>{opening.title} - {opening.department} ({opening.remainingVacancies} open)</option>
                          ))}
                        </select>
                      ) : (
                        <input type="text" placeholder="e.g. Sales Executive" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.position} onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })} />
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Earliest Start Date</label>
                      <input type="date" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.earliestStartDate} onChange={(e) => setNewCandidate({ ...newCandidate, earliestStartDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Salary Expectations</label>
                      <input type="text" placeholder="e.g. ₹8,00,000 CTC" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.expectedSalary} onChange={(e) => setNewCandidate({ ...newCandidate, expectedSalary: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Availability</label>
                      <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={newCandidate.availability} onChange={(e) => setNewCandidate({ ...newCandidate, availability: e.target.value })}>
                        <option>Full-time</option>
                        <option>Part-time</option>
                        <option>Remote</option>
                        <option>Contract</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/60 pb-2 mb-4">3. Professional Background</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Employment History</label>
                      <textarea rows={2} placeholder="Past employers, titles, dates..." className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none resize-none" value={newCandidate.employmentHistory} onChange={(e) => setNewCandidate({ ...newCandidate, employmentHistory: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Educational Background</label>
                      <input type="text" placeholder="e.g. B.Tech IT (2021)" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.education} onChange={(e) => setNewCandidate({ ...newCandidate, education: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Experience Level</label>
                      <input type="text" placeholder="e.g. 3 Years" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.experience} onChange={(e) => setNewCandidate({ ...newCandidate, experience: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Skills</label>
                      <input type="text" placeholder="e.g. React, Node, Sales..." className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.skills} onChange={(e) => setNewCandidate({ ...newCandidate, skills: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Certifications</label>
                      <input type="text" placeholder="e.g. AWS, PMP..." className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newCandidate.certifications} onChange={(e) => setNewCandidate({ ...newCandidate, certifications: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Source Notes</label>
                      <textarea rows={2} placeholder="Walk-in context, LinkedIn note, call summary..." className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none resize-none" value={newCandidate.sourceNotes} onChange={(e) => setNewCandidate({ ...newCandidate, sourceNotes: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Upload Resume / CV</label>
                      <label className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-semibold text-sm cursor-pointer hover:bg-slate-50 transition-all">
                        <FileText size={18} /> {newCandidate.resumeFile ? newCandidate.resumeFile.name : "Click to attach file (PDF/Doc)"}
                        <input type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" className="hidden" onChange={(event) => setNewCandidate({ ...newCandidate, resumeFile: event.target.files?.[0] || null })} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-4 pt-2 border-t border-slate-100">
                  <button onClick={() => { setActiveForm(null); setNewCandidate(EMPTY_CANDIDATE); }} className="flex-1 py-4 bg-white border border-slate-200 rounded-4xl font-semibold text-slate-500 hover:text-slate-900 transition-all">CANCEL</button>
                  <button
                    onClick={handleAddCandidate}
                    disabled={isSavingCandidate || !newCandidate.firstName || !newCandidate.lastName || !newCandidate.email || !newCandidate.position}
                    className="flex-1 py-4 bg-[#2563EB] text-white rounded-4xl font-semibold shadow-lg disabled:bg-slate-300 disabled:shadow-none hover:bg-blue-700 transition-all"
                  >
                    {isSavingCandidate ? "SAVING..." : "ADD TO PIPELINE"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Inline Publish Job Form ── */}
            {activeForm === "add-job" && (
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 bg-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-slate-900 text-white rounded-xl"><Briefcase size={20} /></div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Publish Job Opening</h3>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Visible on Company Website & Careers Page</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Job Title</label>
                    <input type="text" placeholder="e.g. Senior Product Designer" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Department</label>
                    <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={newJob.department} onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}>
                      <option value="">Select Dept</option>
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Vacancies</label>
                    <input type="number" min="1" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none" value={newJob.vacancyTotal} onChange={(e) => setNewJob({ ...newJob, vacancyTotal: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Employment Type</label>
                    <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={newJob.employmentType} onChange={(e) => setNewJob({ ...newJob, employmentType: e.target.value, isPaid: e.target.value === "intern" ? false : newJob.isPaid })}>
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contractor">Contractor</option>
                      <option value="intern">Internship</option>
                      <option value="trainee">Trainee</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Paid Role</label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <input type="checkbox" checked={newJob.isPaid} disabled={newJob.employmentType === "intern"} onChange={(e) => setNewJob({ ...newJob, isPaid: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]" />
                      <span className="text-sm font-semibold text-slate-700">{newJob.employmentType === "intern" ? "Unpaid internship" : "Paid opening"}</span>
                    </div>
                  </div>
                  {newJob.employmentType === "intern" && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Internship Duration (Months)</label>
                      <select className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none cursor-pointer" value={newJob.internshipDurationMonths} onChange={(e) => setNewJob({ ...newJob, internshipDurationMonths: e.target.value })}>
                        {["2", "3", "4", "6"].map((months) => <option key={months} value={months}>{months} months</option>)}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                    <textarea rows={4} placeholder="Describe the role and key requirements..." className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-medium text-slate-700 focus:border-[#2563EB] outline-none resize-none" value={newJob.description} onChange={(e) => setNewJob({ ...newJob, description: e.target.value })} />
                  </div>
                </div>

                <div className="flex gap-4 pt-2 border-t border-slate-100">
                  <button onClick={() => { setActiveForm(null); setNewJob(EMPTY_JOB); }} className="flex-1 py-4 bg-white border border-slate-200 rounded-4xl font-semibold text-slate-500 hover:text-slate-900 transition-all">CANCEL</button>
                  <button
                    onClick={handleAddJob}
                    disabled={!newJob.title || !newJob.department}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-4xl font-semibold shadow-lg disabled:bg-slate-300 disabled:shadow-none hover:bg-black transition-all"
                  >
                    PUBLISH TO WEBSITE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageFrame>

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

      {/* Forms are now inline tabs — modals removed */}
    </div>
  );
}
