import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, CircleDashed, Globe2, LayoutList, UserCheck, UserPlus, Users } from "lucide-react";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import PageFrame from "@/components/Pages/PageFrame";
import recruitmentBannerImage from "@/assets/recruitment-dashboard-banner.png";
import { getRecruitmentOverview } from "@/services/recruitment";
import { DashboardBanner, DashboardSection, DashboardStatTile } from "../Administration/AdministrationModuleDashboardShared";

type RecruitmentRecord = Record<string, any>;
const pretty = (value: unknown, fallback = "Pending") => String(value || fallback).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function HRRecruitmentWorkspaceDashboard() {
  const [candidates, setCandidates] = useState<RecruitmentRecord[]>([]);
  const [jobOpenings, setJobOpenings] = useState<RecruitmentRecord[]>([]);
  const [summary, setSummary] = useState<RecruitmentRecord>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getRecruitmentOverview()
      .then((payload) => {
        if (cancelled) return;
        setCandidates(Array.isArray(payload?.candidates) ? payload.candidates : []);
        setJobOpenings(Array.isArray(payload?.jobOpenings) ? payload.jobOpenings : []);
        setSummary(payload?.summary || {});
        setLoadError("");
      })
      .catch((error) => {
        if (!cancelled) {
          setCandidates([]); setJobOpenings([]); setSummary({});
          setLoadError(error?.message || "Recruitment data could not be refreshed just now.");
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const activeJobs = jobOpenings.filter((job) => job.isActive !== false && Number(job.remainingVacancies ?? job.vacancyTotal ?? 0) > 0).length;
    const totalVacancies = jobOpenings.reduce((total, job) => total + Number(job.vacancyTotal || 0), 0);
    const remainingVacancies = jobOpenings.reduce((total, job) => total + Math.max(0, Number(job.remainingVacancies ?? Number(job.vacancyTotal || 0) - Number(job.vacancyFilled || 0))), 0);
    const websiteJobs = jobOpenings.filter((job) => job.isPostedOnWebsite === true).length;
    const screening = candidates.filter((candidate) => ["Applied", "Screening"].includes(candidate.status)).length;
    return { candidates: Number(summary.totalCandidates ?? candidates.length), activeJobs: Number(summary.activeJobs ?? activeJobs), selected: Number(summary.selectedCount ?? candidates.filter((candidate) => candidate.status === "Selected").length), onboarded: Number(summary.onboardedCount ?? candidates.filter((candidate) => candidate.status === "Converted to Employee").length), totalVacancies, remainingVacancies, websiteJobs, screening };
  }, [candidates, jobOpenings, summary]);

  const statusRows = useMemo(() => { const groups = new Map<string, number>(); candidates.forEach((candidate) => { const key = pretty(candidate.status); groups.set(key, (groups.get(key) || 0) + 1); }); return [...groups.entries()].sort((left, right) => right[1] - left[1]); }, [candidates]);
  const sourceRows = useMemo(() => { const groups = new Map<string, number>(); candidates.forEach((candidate) => { const key = pretty(candidate.source || candidate.sourceType, "Direct"); groups.set(key, (groups.get(key) || 0) + 1); }); return [...groups.entries()].sort((left, right) => right[1] - left[1]); }, [candidates]);
  const recentCandidates = useMemo(() => [...candidates].sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime()).slice(0, 10), [candidates]);

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner title="Recruitment" description="A live hiring view across job openings, vacancies, candidate stages, sourcing, public careers listings, and onboarding progress." tags={["Openings", "Candidates", "Pipeline", "Careers"]} image={recruitmentBannerImage} moduleCount={2} />
        {loadError && !isLoading ? <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">{loadError}</div> : null}
        {isLoading ? <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />)}</div> : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatTile icon={<Users size={20} />} label="Candidates" value={stats.candidates} sub="Applicants in the hiring pipeline" tone="blue" />
            <DashboardStatTile icon={<BriefcaseBusiness size={20} />} label="Active Jobs" value={stats.activeJobs} sub="Open roles accepting candidates" tone="violet" />
            <DashboardStatTile icon={<UserCheck size={20} />} label="Selected" value={stats.selected} sub="Candidates selected for hiring" tone="green" />
            <DashboardStatTile icon={<CheckCircle2 size={20} />} label="Onboarded" value={stats.onboarded} sub="Candidates converted to employees" tone="cyan" />
            <DashboardStatTile icon={<CircleDashed size={20} />} label="In Screening" value={stats.screening} sub="Applied or screening candidates" tone="amber" />
            <DashboardStatTile icon={<LayoutList size={20} />} label="Total Vacancies" value={stats.totalVacancies} sub="Positions across all job openings" tone="slate" />
            <DashboardStatTile icon={<UserPlus size={20} />} label="Open Vacancies" value={stats.remainingVacancies} sub="Roles still available to fill" tone="rose" />
            <DashboardStatTile icon={<Globe2 size={20} />} label="On Website" value={stats.websiteJobs} sub="Jobs visible on the careers page" tone="blue" />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Recruitment modules</p>
          <p className="mt-1 text-[10px] text-slate-500">Open job publishing or candidate tracking directly from the dashboard.</p>
          <div className="mt-3 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            <DashboardModuleCard icon={<BriefcaseBusiness size={19} />} title="Job Openings" route="/department-accesses/hr-department/recruitment/job-openings" description="Create roles, manage vacancies, and control careers-page visibility" color="#0D9488" />
            <DashboardModuleCard icon={<UserPlus size={19} />} title="Candidates Tracking" route="/department-accesses/hr-department/recruitment/candidates" description="Review applicants, update hiring stages, and convert selected candidates" color="#2563EB" />
          </div>
        </div>

        {!isLoading ? <>
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardSection title="Candidate pipeline" subtitle="Applicants grouped by their current recruitment stage.">{statusRows.length ? <DonutChart centerLabel="Candidates" labels={statusRows.map(([name]) => name)} series={statusRows.map(([, value]) => value)} colors={["#2563EB", "#F59E0B", "#7C3AED", "#0D9488", "#10B981", "#EF4444", "#94A3B8"]} tooltipValue={statusRows.map(([, value]) => `${value} candidates`)} wrapLabels /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No candidates recorded yet.</div>}</DashboardSection>
            <DashboardSection title="Candidate sources" subtitle="Where current recruitment applications originated.">{sourceRows.length ? <DonutChart centerLabel="Candidates" labels={sourceRows.map(([name]) => name)} series={sourceRows.map(([, value]) => value)} colors={["#0D9488", "#2563EB", "#7C3AED", "#F59E0B", "#06B6D4", "#94A3B8"]} tooltipValue={sourceRows.map(([, value]) => `${value} candidates`)} wrapLabels /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No candidate source data recorded yet.</div>}</DashboardSection>
          </div>
          <DashboardSection title="Recent candidates" subtitle="Latest applicants and their current recruitment stage." bodyClassName="max-h-[420px] overflow-auto p-0">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-left"><thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500"><tr><th className="w-[28%] px-5 py-3 font-pmedium">Candidate</th><th className="w-[26%] px-3 py-3 font-pmedium">Position</th><th className="w-[18%] px-3 py-3 font-pmedium">Department</th><th className="w-[13%] px-3 py-3 font-pmedium">Source</th><th className="w-[15%] px-3 py-3 text-center font-pmedium">Stage</th></tr></thead><tbody className="divide-y divide-slate-100">
              {recentCandidates.length ? recentCandidates.map((candidate, index) => <tr key={candidate.id || candidate.code || index} className="bg-white text-[11px] text-slate-600"><td className="px-5 py-3"><p className="truncate font-pmedium text-slate-900">{candidate.fullName || candidate.name || "Candidate"}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{candidate.email || candidate.code || "Applicant record"}</p></td><td className="truncate px-3 py-3">{candidate.position || candidate.designation || "Not assigned"}</td><td className="truncate px-3 py-3">{candidate.department || "Not assigned"}</td><td className="px-3 py-3">{candidate.source || candidate.sourceType || "Direct"}</td><td className="px-3 py-3 text-center"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-pmedium uppercase text-slate-600">{candidate.status || "Applied"}</span></td></tr>) : <tr><td colSpan={5} className="px-5 py-12 text-center text-[11px] text-slate-500">No candidates recorded yet.</td></tr>}
            </tbody></table>
          </DashboardSection>
        </> : null}
      </PageFrame>
    </div>
  );
}
