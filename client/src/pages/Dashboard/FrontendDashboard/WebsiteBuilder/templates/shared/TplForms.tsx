import React, { useState } from "react";
import { AnimatePresence, motion } from "../motion";
import { postWebsiteLead } from "../templateKit";
import { Icon } from "./TplUI";
import { useTpl } from "./TplContext";

// Template-independent forms and modals. They only use the neutral tp-* classes, so each
// template's stylesheet decides how they look.

/* ───────────────────────── generic message form (partner, contact) ───────────────────────── */

export const MessageForm: React.FC<{ inquiryType: string; submitLabel: string; success: string }> = ({ inquiryType, submitLabel, success }) => {
  const { draft } = useTpl();
  const [form, setForm] = useState({ name: "", email: "", mobile: "", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<any>) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  if (state === "sent") {
    return (
      <div className="tp-soft p-8 text-center" role="status">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--t-accent)", color: "var(--t-accent-text,#fff)" }}>{Icon.check(22)}</span>
        <p className="tp-h3">Thank you</p>
        <p className="tp-muted mt-2 text-[15px]">{success}</p>
      </div>
    );
  }
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setState("sending");
        setError("");
        try {
          await postWebsiteLead(draft, {
            fullName: form.name,
            name: form.name,
            email: form.email,
            mobileNumber: form.mobile,
            mobile: form.mobile,
            phone: form.mobile,
            message: form.message,
            inquiryType,
          });
          setState("sent");
        } catch (err: any) {
          setError(err?.response?.data?.message || "Something went wrong. Please try again.");
          setState("error");
        }
      }}
    >
      <div><label className="tp-label" htmlFor="tp-m-name">Your name *</label><input id="tp-m-name" required className="tp-input" value={form.name} onChange={set("name")} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="tp-label" htmlFor="tp-m-email">Email *</label><input id="tp-m-email" type="email" required className="tp-input" value={form.email} onChange={set("email")} /></div>
        <div><label className="tp-label" htmlFor="tp-m-mobile">Mobile *</label><input id="tp-m-mobile" type="tel" required className="tp-input" value={form.mobile} onChange={set("mobile")} /></div>
      </div>
      <div><label className="tp-label" htmlFor="tp-m-msg">Message</label><textarea id="tp-m-msg" rows={4} className="tp-input" value={form.message} onChange={set("message")} /></div>
      {error ? <p className="text-[13px]" role="alert" style={{ color: "#c0392b" }}>{error}</p> : null}
      <button type="submit" disabled={state === "sending"} className="tp-btn tp-btn-primary">{state === "sending" ? "Sending…" : submitLabel}</button>
    </form>
  );
};


export const ReviewModal: React.FC = () => {
  const { t } = useTpl();
  return (
    <AnimatePresence>
      {t.reviewModalOpen ? (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Write a review">
          <div className="absolute inset-0" style={{ background: "rgba(10,8,6,.6)", backdropFilter: "blur(4px)" }} onClick={() => t.setReviewModalOpen(false)} />
          <motion.form
            onSubmit={t.submitReviewForm}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="relative w-full max-w-lg rounded-[32px] p-7 md:p-9"
            style={{ background: "var(--t-bg)", color: "var(--t-text)" }}
          >
            <button type="button" aria-label="Close" onClick={() => t.setReviewModalOpen(false)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--t-text) 8%, transparent)" }}>{Icon.close()}</button>
            <h2 className="tp-h3 mb-6 pr-10">Share your experience</h2>
            <div className="grid gap-4">
              <div><label className="tp-label" htmlFor="tp-r-name">Your name *</label><input id="tp-r-name" required className="tp-input" value={t.reviewForm.reviewerName} onChange={(e) => t.setReviewForm((p: any) => ({ ...p, reviewerName: e.target.value }))} /></div>
              <div>
                <span className="tp-label">Rating</span>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={Number(t.reviewForm.rating) === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => t.setReviewForm((p: any) => ({ ...p, rating: String(n) }))} style={{ color: "var(--t-accent-fg, var(--t-accent))", opacity: n <= Number(t.reviewForm.rating) ? 1 : 0.25 }}>{Icon.star(30)}</button>
                  ))}
                </div>
              </div>
              <div><label className="tp-label" htmlFor="tp-r-text">Your review *</label><textarea id="tp-r-text" required rows={4} className="tp-input" value={t.reviewForm.review} onChange={(e) => t.setReviewForm((p: any) => ({ ...p, review: e.target.value }))} /></div>
              {t.reviewSubmitError ? <p className="text-[13px]" role="alert" style={{ color: "#c0392b" }}>{t.reviewSubmitError}</p> : null}
              <button type="submit" disabled={t.reviewSubmitPending} className="tp-btn tp-btn-primary">{t.reviewSubmitPending ? "Submitting…" : "Submit review"}</button>
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};


const bullets = (text: string) =>
  String(text || "")
    .split(/\.\s+|\n+/)
    .map((point) => point.replace(/\.$/, "").replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

export const RoleSection: React.FC<{ title: string; text?: string; asList?: boolean }> = ({ title, text, asList }) => {
  if (!text) return null;
  return (
    <div>
      <h3 className="text-[20px]">{title}</h3>
      {asList ? (
        <ul className="mt-3 space-y-2.5">
          {bullets(text).map((point, index) => (
            <li key={index} className="flex items-start gap-3 text-[15px] leading-relaxed">
              <span className="mt-1 shrink-0" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{Icon.check(16)}</span>
              {point}
            </li>
          ))}
        </ul>
      ) : (
        <p className="tp-muted mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{text}</p>
      )}
    </div>
  );
};

export const ApplyForm: React.FC = () => {
  const { t } = useTpl();
  const form = t.careersApplyForm;
  const set = (key: string, transform?: (value: string) => string) => (event: React.ChangeEvent<any>) =>
    t.setCareersApplyForm((prev: any) => ({ ...prev, [key]: transform ? transform(event.target.value) : event.target.value }));

  if (t.careersApplySubmitted) {
    return (
      <div className="tp-soft p-10 text-center" role="status">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--t-accent)", color: "var(--t-accent-text,#fff)" }}>{Icon.check(22)}</span>
        <p className="tp-h3">Application submitted</p>
        <p className="tp-muted mt-2 text-[15px]">We'll review it and get back to you shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={t.submitCareersApplication} className="grid gap-4 sm:grid-cols-2">
      <div><label className="tp-label" htmlFor="tp-c-name">Full name *</label><input id="tp-c-name" required className="tp-input" value={form.fullName} onChange={set("fullName")} /></div>
      <div><label className="tp-label" htmlFor="tp-c-email">Email *</label><input id="tp-c-email" type="email" required className="tp-input" value={form.email} onChange={set("email")} /></div>
      <div><label className="tp-label" htmlFor="tp-c-dob">Date of birth *</label><input id="tp-c-dob" type="date" required className="tp-input" value={form.dateOfBirth} onChange={set("dateOfBirth")} /></div>
      <div>
        <label className="tp-label" htmlFor="tp-c-country">Country *</label>
        <select id="tp-c-country" required className="tp-input" value={form.country} onChange={set("country")}>
          <option value="">Select country</option>
          {t.applyCountryList.map((c: any) => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="tp-label" htmlFor="tp-c-state">State *</label>
        <select id="tp-c-state" required className="tp-input" value={form.state} disabled={!form.country} onChange={set("state")}>
          <option value="">Select state</option>
          {t.applyStateList.map((s: any) => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="tp-label" htmlFor="tp-c-city">City *</label>
        <select id="tp-c-city" required className="tp-input" value={form.city} disabled={!form.state} onChange={set("city")}>
          <option value="">Select city</option>
          {t.applyCityList.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="tp-label" htmlFor="tp-c-phone">Mobile number *</label>
        <div className="flex gap-2">
          <span className="tp-input !w-auto shrink-0 !bg-transparent">{t.careersApplyDialCode || "+ --"}</span>
          <input id="tp-c-phone" type="tel" required className="tp-input" value={form.phone} onChange={set("phone", (v) => v.replace(/[^\d\s-]/g, ""))} />
        </div>
      </div>
      <div className="sm:col-span-2">
        <span className="tp-label">Resume / CV *</span>
        <label className="tp-input flex cursor-pointer items-center justify-between gap-3">
          <span className="truncate">{t.careersResumeFile ? t.careersResumeFile.name : "Choose a PDF or Word file"}</span>
          <span className="tp-chip">Browse</span>
          <input type="file" required accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => t.setCareersResumeFile(e.target.files?.[0] || null)} />
        </label>
      </div>
      {t.careersFormFields.map((field: any) => {
        const value = t.careersCustomValues[field.id] || "";
        const onChange = (e: React.ChangeEvent<any>) => t.setCareersCustomValues((prev: any) => ({ ...prev, [field.id]: e.target.value }));
        const wide = field.type === "textarea" || field.fullWidth;
        const label = `${field.label}${field.required ? " *" : ""}`;
        return (
          <div key={field.id} className={wide ? "sm:col-span-2" : ""}>
            <label className="tp-label" htmlFor={`tp-cf-${field.id}`}>{label}</label>
            {field.type === "textarea" ? (
              <textarea id={`tp-cf-${field.id}`} rows={3} required={field.required} className="tp-input" value={value} onChange={onChange} />
            ) : field.type === "select" ? (
              <select id={`tp-cf-${field.id}`} required={field.required} className="tp-input" value={value} onChange={onChange}>
                <option value="">Select</option>
                {String(field.options || "").split(/[\n,]/).map((o) => o.trim()).filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input id={`tp-cf-${field.id}`} type={field.type === "text" ? "text" : field.type} required={field.required} className="tp-input" value={value} onChange={onChange} />
            )}
          </div>
        );
      })}
      {t.careersApplyError ? <p className="text-[13px] sm:col-span-2" role="alert" style={{ color: "#c0392b" }}>{t.careersApplyError}</p> : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={t.careersApplySubmitting} className="tp-btn tp-btn-primary w-full sm:w-auto">{t.careersApplySubmitting ? "Submitting…" : "Submit application"}</button>
      </div>
    </form>
  );
};

