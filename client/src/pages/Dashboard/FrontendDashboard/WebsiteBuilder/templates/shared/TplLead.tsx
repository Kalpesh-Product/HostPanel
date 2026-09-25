import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "../motion";
import {
  getLeadFormDefinition,
  nightsBetween,
  parsePriceNumber,
  todayISO,
  type LeadFieldDef,
} from "../leadForms";
import type { Service, ServiceItem } from "../serviceAdapter";
import { currencyPrefix } from "../templateKit";
import { Icon } from "./TplUI";
import { useTpl } from "./TplContext";

/** Rough total for stay-type items: price × nights (× beds for shared dorm beds). */
export const estimateTotal = (item: ServiceItem | null | undefined, start: string, end: string, people: string) => {
  if (!item) return null;
  const nights = nightsBetween(start, end);
  const unit = parsePriceNumber(item.price);
  if (!nights || unit === null) return null;
  const perBed = item.raw?.roomKind === "dorm" || (item.raw?.capacity && item.raw?.roomKind !== "private");
  const beds = perBed ? Math.max(1, Number(people) || 1) : 1;
  const total = unit * nights * beds;
  return { nights, beds: perBed ? beds : 0, text: `${currencyPrefix(item.price)}${total.toLocaleString()}` };
};

const Field: React.FC<{
  def: LeadFieldDef;
  value: string;
  onChange: (value: string) => void;
}> = ({ def, value, onChange }) => {
  const id = `tp-lead-${def.key}`;
  const common = {
    id,
    required: def.required,
    value,
    className: "tp-input",
    onChange: (event: React.ChangeEvent<any>) => onChange(event.target.value),
  };
  return (
    <div className={def.half ? "col-span-2 sm:col-span-1" : "col-span-2"}>
      <label htmlFor={id} className="tp-label">
        {def.label}
        {def.required ? " *" : ""}
      </label>
      {def.type === "textarea" ? (
        <textarea {...common} rows={3} placeholder={def.placeholder} />
      ) : def.type === "select" ? (
        <select {...common} disabled={!def.options?.length}>
          <option value="">{def.placeholder || "Select"}</option>
          {(def.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input {...common} type={def.type} min={def.min} max={def.max} placeholder={def.placeholder} />
      )}
    </div>
  );
};

/** The booking / reservation / enquiry form for one service, in the shape its vertical needs. */
export const LeadFormPanel: React.FC<{
  service: Service;
  item?: ServiceItem | null;
  compact?: boolean;
  /** Co-living and co-working: which request type is selected first. */
  defaultMode?: "enquiry" | "visit";
}> = ({ service, item, compact, defaultMode = "enquiry" }) => {
  const { t, draft } = useTpl();
  const [mode, setMode] = useState<"enquiry" | "visit">(defaultMode);
  const canVisit = (service.kind === "coLiving" || service.kind === "workspace") && draft?.tourBooking?.enabled !== false;
  const spaces = useMemo(() => (item ? [] : service.items.map((entry) => entry.title)), [item, service.items]);

  const def = useMemo(
    () =>
      getLeadFormDefinition(service.kind, {
        reservation: draft?.reservation,
        openingHours: draft?.openingHours,
        date: t.leadForm?.startDate,
        mode: canVisit ? mode : "enquiry",
        spaces,
        today: todayISO(),
      }),
    [service.kind, draft?.reservation, draft?.openingHours, t.leadForm?.startDate, mode, canVisit, spaces],
  );

  const setField = (field: LeadFieldDef, value: string) => {
    if (field.target === "form") {
      t.setLeadForm((prev: any) => ({ ...prev, [field.key]: value }));
      // A new date invalidates the chosen time slot (hours differ by weekday).
      if (field.key === "startDate" && service.kind === "menu") t.setLeadExtras((prev: any) => ({ ...prev, time: "" }));
    } else {
      t.setLeadExtras((prev: any) => ({ ...prev, [field.key]: value }));
    }
  };

  const estimate =
    service.kind === "hostel"
      ? estimateTotal(item, t.leadForm?.startDate, t.leadForm?.endDate, t.leadForm?.people)
      : null;

  if (t.leadSubmitted) {
    return (
      <div className="tp-soft p-8 text-center" role="status">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--t-accent)", color: "var(--t-accent-text,#fff)" }}>
          {Icon.check(22)}
        </span>
        <h3 className="text-[24px]">You're all set</h3>
        <p className="tp-muted mt-2 text-[15px]">{def.successMessage}</p>
        {draft?.reservation?.confirmationNote && service.kind === "menu" ? (
          <p className="tp-muted mt-2 text-[13px]">{draft.reservation.confirmationNote}</p>
        ) : null}
        <button type="button" className="tp-btn tp-btn-ghost tp-btn-sm mt-5" onClick={() => t.setLeadSubmitted(false)}>
          Make another request
        </button>
      </div>
    );
  }

  const overrides: Record<string, string> = {
    inquiryType: def.inquiryType,
    productType: service.name,
    ...(item ? { roomType: item.title, packageName: item.title, dormType: item.title } : {}),
  };

  return (
    <form
      onSubmit={(event) => t.submitLeadForm(event, overrides)}
      className="grid grid-cols-2 gap-x-4 gap-y-4"
      aria-label={def.title}
    >
      {canVisit ? (
        <div className="col-span-2 flex gap-2" role="group" aria-label="Request type">
          <button type="button" className="tp-tab" aria-pressed={mode === "enquiry"} onClick={() => setMode("enquiry")}>
            Enquire
          </button>
          <button type="button" className="tp-tab" aria-pressed={mode === "visit"} onClick={() => setMode("visit")}>
            Schedule a visit
          </button>
        </div>
      ) : null}

      {def.fields.map((field) => (
        <Field
          key={`${mode}-${field.key}`}
          def={field}
          value={String((field.target === "form" ? t.leadForm?.[field.key] : t.leadExtras?.[field.key]) ?? "")}
          onChange={(value) => setField(field, value)}
        />
      ))}

      {estimate ? (
        <div className="tp-soft col-span-2 flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
          <span className="tp-muted">
            {estimate.nights} night{estimate.nights > 1 ? "s" : ""}
            {estimate.beds ? ` · ${estimate.beds} bed${estimate.beds > 1 ? "s" : ""}` : ""}
          </span>
          <span className="tp-display text-[20px]" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>
            ≈ {estimate.text}
          </span>
        </div>
      ) : null}

      {service.kind === "hostel" || service.kind === "workation" || service.kind === "coLiving" ? (
        <p className="tp-muted col-span-2 text-[12px] leading-relaxed">
          This sends a booking request. Our team confirms availability and gets back to you.
        </p>
      ) : null}

      {draft?.stayPolicy?.cancellationNote && (service.kind === "hostel" || service.kind === "coLiving") ? (
        <p className="tp-muted col-span-2 text-[12px]">{draft.stayPolicy.cancellationNote}</p>
      ) : null}

      {t.leadSubmitError ? (
        <p className="col-span-2 text-[13px]" role="alert" style={{ color: "#c0392b" }}>
          {t.leadSubmitError}
        </p>
      ) : null}

      <div className="col-span-2">
        <button type="submit" disabled={t.leadSubmitPending} className={`tp-btn tp-btn-primary ${compact ? "" : "w-full"}`}>
          {t.leadSubmitPending ? "Sending…" : def.submitLabel}
        </button>
      </div>
    </form>
  );
};

/** Modal wrapper — opened from cards and CTAs. */
export const LeadModal: React.FC<{ open: boolean; onClose: () => void; service: Service | null; item: ServiceItem | null }> = ({
  open,
  onClose,
  service,
  item,
}) => (
  <AnimatePresence>
    {open && service ? (
      <motion.div
        className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={service.profile.labels.leadTitle}
      >
        <div className="absolute inset-0" style={{ background: "rgba(10,8,6,.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[32px] p-6 sm:rounded-[32px] sm:p-8"
          style={{ background: "var(--t-bg)", color: "var(--t-text)" }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--t-text) 8%, transparent)" }}
          >
            {Icon.close()}
          </button>
          <p className="tp-eyebrow mb-2">{service.name}</p>
          <h2 className="tp-h3 mb-1 pr-10">{service.profile.labels.leadTitle}</h2>
          {item ? <p className="tp-muted mb-5 text-[14px]">{item.title}</p> : <div className="mb-5" />}
          <LeadFormPanel service={service} item={item} />
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
