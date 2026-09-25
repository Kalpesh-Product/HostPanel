import React from "react";
import { Reveal, Stagger } from "../motion";
import { getCareersJobMeta, getCareersJobTitle } from "../useWebsiteTemplateData";
import { PageBanner } from "./SavorPages";
import { Icon } from "./SavorUI";
import { useSavor } from "./SavorContext";
import { ApplyForm, RoleSection } from "../shared/TplForms";

export const SavorCareers: React.FC = () => {
  const { t, draft } = useSavor();
  const job = t.careersApplyJob;

  if (job) {
    const applyOnly = t.careersDirectApply;
    const tab = applyOnly ? "apply" : t.careersDetailTab;
    return (
      <>
        <PageBanner eyebrow={applyOnly ? "Open application" : job.department || "Careers"} title={applyOnly ? "General application" : getCareersJobTitle(job)} sub={applyOnly ? undefined : getCareersJobMeta(job)} />
        <section className="tp-wrap pt-8 pb-16">
          <button type="button" className="tp-link mb-6" onClick={t.closeCareersJob}>
            <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>{Icon.arrow()}</span> All roles
          </button>
          {!applyOnly ? (
            <div className="mb-8 flex gap-2" role="tablist">
              {([["description", "Description"], ["apply", "Apply"]] as const).map(([value, label]) => (
                <button key={value} type="button" role="tab" aria-selected={tab === value} className="tp-tab" aria-pressed={tab === value} onClick={() => t.setCareersDetailTab(value)}>{label}</button>
              ))}
            </div>
          ) : null}
          {tab === "description" ? (
            <Reveal>
              <div className="tp-card space-y-8 p-7 md:p-10" style={{ borderRadius: 32 }}>
                <RoleSection title="About this role" text={job.aboutTheJob} />
                <RoleSection title="Key responsibilities" text={job.keyResponsibilities} asList />
                <RoleSection title="Requirements" text={job.requirements} asList />
                <RoleSection title="Soft skills" text={job.softSkills} asList />
                {draft?.email ? (
                  <p className="tp-muted border-t pt-6 text-[14px]" style={{ borderColor: "var(--t-line)" }}>
                    Prefer email? Send your resume to <strong style={{ color: "var(--t-text)" }}>{draft.email}</strong>.
                  </p>
                ) : null}
                <button type="button" className="tp-btn tp-btn-primary" onClick={() => t.setCareersDetailTab("apply")}>Apply for this role {Icon.arrow()}</button>
              </div>
            </Reveal>
          ) : (
            <Reveal><div className="tp-card p-7 md:p-10" style={{ borderRadius: 32 }}><ApplyForm /></div></Reveal>
          )}
        </section>
      </>
    );
  }

  const intro = String(draft?.careersPageIntro || "").split("\n").filter(Boolean);
  const introLines: string[] = intro.length ? intro : t.careersFallbackIntro;

  return (
    <>
      <PageBanner eyebrow="Careers" title={draft?.careersPageHeading || `Join ${draft?.companyName || "our team"}`} sub={introLines[0]} />
      <section className="tp-wrap pt-10 pb-16">
        {introLines.length > 1 ? (
          <div className="mb-12 grid gap-5 md:grid-cols-2">
            {introLines.slice(1).map((line, index) => <Reveal key={index}><p className="tp-muted text-[16px] leading-relaxed">{line}</p></Reveal>)}
          </div>
        ) : null}
        {t.careersJobsLoading ? (
          <p className="tp-muted py-10 text-center">Loading open roles…</p>
        ) : !t.careersJobs.length ? (
          <div className="tp-soft p-10 text-center">
            <p className="tp-h3">No openings right now</p>
            <p className="tp-muted mt-2 text-[15px]">Check back soon — or send us a general application.</p>
            <button type="button" className="tp-btn tp-btn-primary mt-6" onClick={t.openCareersGeneralApply}>{draft?.careersApplyButtonText || "General application"}</button>
          </div>
        ) : (
          <Stagger className="space-y-5">
            {t.careersDepartmentSections.map((dept: any) => (
              <div key={dept.department} className="tp-card p-6 md:p-8" style={{ borderRadius: 32 }}>
                <div className="mb-5 flex items-baseline justify-between gap-4">
                  <h2 className="tp-h3"><span className="mr-3" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{dept.ordinal}</span>{dept.department}</h2>
                  <span className="tp-chip">{dept.jobs.length} open</span>
                </div>
                <ul className="divide-y" style={{ borderColor: "var(--t-line)" }}>
                  {dept.jobs.map((item: any, index: number) => (
                    <li key={index} style={{ borderColor: "var(--t-line)" }}>
                      <button type="button" className="group flex w-full items-center justify-between gap-4 py-4 text-left" onClick={() => t.openCareersJob(item)}>
                        <span>
                          <span className="block text-[17px] font-bold">{getCareersJobTitle(item)}</span>
                          <span className="tp-muted mt-0.5 block text-[12px] font-semibold tracking-wide">{getCareersJobMeta(item)}</span>
                        </span>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition group-hover:translate-x-1" style={{ background: "var(--t-accent)", color: "var(--t-accent-text,#fff)" }}>{Icon.arrow()}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="tp-accent-panel flex flex-wrap items-center justify-between gap-5 p-7 md:p-10">
              <div>
                <h2 className="tp-h3" style={{ color: "inherit" }}>{draft?.careersClosingHeading || "Don't see your role?"}</h2>
                <p className="mt-2 max-w-xl text-[15px] opacity-90">{draft?.careersClosingText || "Send us a general application and tell us how you'd like to contribute."}</p>
              </div>
              <button type="button" className="tp-btn tp-btn-light" onClick={t.openCareersGeneralApply}>{draft?.careersApplyButtonText || "General application"} {Icon.arrow()}</button>
            </div>
          </Stagger>
        )}
      </section>
    </>
  );
};
