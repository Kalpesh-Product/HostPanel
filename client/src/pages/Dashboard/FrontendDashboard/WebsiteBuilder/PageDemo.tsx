import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../../../utils/axios";

const LIVE_PREVIEW_DRAFT_STORAGE_KEY = "website_builder_live_preview_draft";

// This file is the runtime renderer for the saved website template.
// Keep the section order and field lookups aligned with CreateWebsite.tsx
// and the server serializer so local preview and hosted rendering match.
const normalizeSlug = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const FALLBACK_NAV = [
  { name: "Home", slug: "home" },
  { name: "About", slug: "about" },
  { name: "Products", slug: "products" },
  { name: "Gallery", slug: "gallery" },
  { name: "Partner", slug: "partner" },
  { name: "Contact", slug: "contact" },
];

const resolveSectionFromSlug = (slug: string) => {
  const normalized = normalizeSlug(slug);
  if (normalized.includes("about")) return "about";
  if (normalized.includes("product")) return "products";
  if (normalized.includes("gallery")) return "gallery";
  if (normalized.includes("partner")) return "partner";
  if (normalized.includes("testimonial") || normalized.includes("review")) return "testimonials";
  if (normalized.includes("contact")) return "contact";
  return "home";
};

const isMenuProductSlug = (slug: string) => {
  const normalized = normalizeSlug(slug);
  return normalized.includes("cafe") || normalized.includes("menu");
};

const SECTION_HEADING =
  "text-center text-[32px] font-semibold uppercase tracking-normal text-[#000000] font-['Poppins',ui-sans-serif,system-ui,sans-serif]";
const CONTENT_WRAP = "mx-auto w-full max-w-7xl";
const ABOUT_PARAGRAPH =
  "text-white text-[20px] leading-[1.4] font-normal font-['Poppins',ui-sans-serif,system-ui,sans-serif]";
const FOOTER_TEXT = "font-['Poppins',ui-sans-serif,system-ui,sans-serif] text-[#374151]";
const FOOTER_HEADING = "text-[14px] font-semibold text-[#111827]";
const FOOTER_BODY_TEXT = "mt-2 text-sm leading-relaxed text-[#374151]";
const SECTION_BLOCK = "px-4 py-8 md:px-6 md:py-12";

// -- Inclusions ----------------------------------------------------------------
// Master list of all possible inclusions used across home + product pages.
// Icons are inline SVGs at 40â€º40 viewBox, stroke-based, no fill.
const ALL_INCLUSIONS: Array<{ key: string; label: string; icon: React.ReactNode }> = [
  { key: "workspace", label: "Workspace", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="10" width="28" height="18" rx="2"/><path d="M14 28v4M26 28v4M10 32h20"/><rect x="12" y="15" width="8" height="6" rx="1"/></svg> },
  { key: "living-space", label: "Living Space", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="18" width="28" height="14" rx="2"/><path d="M10 18v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4"/><path d="M6 26h28M12 32v2M28 32v2"/></svg> },
  { key: "air-condition", label: "Air Condition", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="10" width="28" height="12" rx="2"/><path d="M14 28c0-2 2-4 6-4s6 2 6 4M20 22v4"/><circle cx="20" cy="16" r="2"/></svg> },
  { key: "fast-internet", label: "Fast Internet", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="10" width="28" height="18" rx="2"/><path d="M10 18h4M10 22h6M26 18h4M6 28h28"/><circle cx="20" cy="19" r="3"/><path d="M14 13h12"/></svg> },
  { key: "cafe-dining", label: "Cafe / Dining", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12h6v8a3 3 0 0 1-6 0v-8z"/><path d="M16 16h2a2 2 0 0 1 0 4h-2"/><path d="M26 12v8M24 20a4 4 0 0 0 4 4M13 28v4M27 28v4M10 32h20"/></svg> },
  { key: "receptionist", label: "Receptionist", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="12" r="5"/><path d="M10 32c0-6 4-10 10-10s10 4 10 10"/><path d="M8 28h24"/></svg> },
  { key: "meeting-rooms", label: "Meeting Rooms", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="12" width="28" height="18" rx="2"/><path d="M14 21h12M14 25h8"/><circle cx="12" cy="8" r="2"/><circle cx="20" cy="8" r="2"/><circle cx="28" cy="8" r="2"/></svg> },
  { key: "training-rooms", label: "Training Rooms", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="10" width="28" height="20" rx="2"/><path d="M6 18h28M14 18v12M20 14h6"/></svg> },
  { key: "it-support", label: "IT Support", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="24" height="18" rx="2"/><path d="M14 26v4M26 26v4M10 30h20"/><path d="M16 17l3 3 5-6"/></svg> },
  { key: "tea-coffee", label: "Tea & Coffee", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14h16v12a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V14z"/><path d="M26 16h2a3 3 0 0 1 0 6h-2"/><path d="M14 10c0-2 2-2 2-4M19 10c0-2 2-2 2-4"/></svg> },
  { key: "assist", label: "Assist", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="12" r="5"/><path d="M10 32c0-5 4-9 10-9s10 4 10 9"/><path d="M20 21v5M17 26h6"/></svg> },
  { key: "community", label: "Community", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="14" cy="14" r="4"/><circle cx="26" cy="14" r="4"/><path d="M6 32c0-4 3-7 8-7M26 25c5 0 8 3 8 7M16 32c0-4 2-6 4-6s4 2 4 6"/></svg> },
  { key: "on-demand", label: "On Demand", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="20" r="12"/><path d="M16 15l10 5-10 5V15z"/></svg> },
  { key: "maintenance", label: "Maintenance", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M28 12a6 6 0 0 0-8.5 8.5L8 32l4 4 11.5-11.5A6 6 0 0 0 28 12z"/><path d="M26 10l4 4"/></svg> },
  { key: "generator", label: "Generator", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="14" width="28" height="16" rx="2"/><path d="M14 14v-4M26 14v-4M20 18v8M16 22h8"/></svg> },
  { key: "pickup-drop", label: "Pickup & Drop", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="18" width="32" height="12" rx="2"/><path d="M8 18l4-8h16l4 8"/><circle cx="11" cy="30" r="3"/><circle cx="29" cy="30" r="3"/></svg> },
  { key: "car-bike-bus", label: "Car / Bike / Bus", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22h28M10 22l3-8h14l3 8"/><circle cx="13" cy="26" r="3"/><circle cx="27" cy="26" r="3"/><path d="M34 22v4"/></svg> },
  { key: "housekeeping", label: "Housekeeping", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 32V20l8-10 8 10v12"/><path d="M16 32v-8h8v8"/><path d="M8 20h24"/></svg> },
  { key: "swimming-pool", label: "Swimming Pool", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22c2 0 3-2 6-2s4 2 6 2 3-2 6-2 4 2 6 2"/><path d="M6 28c2 0 3-2 6-2s4 2 6 2 3-2 6-2 4 2 6 2"/><path d="M20 8v10M16 12l4-4 4 4"/></svg> },
  { key: "television", label: "Television", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="10" width="28" height="18" rx="2"/><path d="M14 28v4M26 28v4M10 32h20"/><path d="M14 14h4M14 19h8"/></svg> },
  { key: "gas", label: "Gas", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8h8v6a8 8 0 0 1-8 0V8z"/><path d="M14 14a8 8 0 0 0 12 0"/><path d="M12 32V22a8 8 0 0 1 16 0v10"/><path d="M10 32h20"/></svg> },
  { key: "laundry", label: "Laundry", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="24" height="26" rx="2"/><circle cx="20" cy="24" r="6"/><path d="M12 14h4"/><circle cx="18" cy="14" r="1" fill="currentColor" stroke="none"/></svg> },
  { key: "secure", label: "Secure", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6l12 5v10c0 7-5 12-12 14C13 33 8 28 8 21V11l12-5z"/><path d="M15 20l4 4 6-7"/></svg> },
  { key: "personalised", label: "Personalised", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M28 12l-4 4-8-8-6 6 8 8-4 4 12 4-8-18z"/></svg> },
  { key: "electricity", label: "Electricity", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 6l-8 16h8l-4 12 10-18h-8L22 6z"/></svg> },
  { key: "ups", label: "UPS", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="14" width="24" height="16" rx="2"/><path d="M14 14v-4M26 14v-4M16 22h8M20 20v4"/></svg> },
  { key: "events", label: "Events", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 18c4-8 20-8 24 0M12 26c3-6 13-6 16 0M16 32c1-3 7-3 8 0"/></svg> },
  { key: "furnished-office", label: "Furnished Office", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="10" width="28" height="18" rx="2"/><path d="M14 28v4M26 28v4M10 32h20M14 19h12M14 23h8"/></svg> },
  { key: "cafeteria", label: "Cafeteria", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="14" width="24" height="16" rx="2"/><path d="M14 14v-4M26 14v-4M8 22h24M16 22v8M24 22v8"/></svg> },
  { key: "high-speed-internet", label: "High Speed Internet", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20a20 20 0 0 1 28 0M10 24a14 14 0 0 1 20 0M14 28a8 8 0 0 1 12 0"/><circle cx="20" cy="32" r="2" fill="currentColor" stroke="none"/></svg> },
  { key: "assistance", label: "Assistance", icon: <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="12" r="5"/><path d="M10 32c0-5 4-9 10-9s10 4 10 9"/><path d="M16 26l4 2 4-2"/></svg> },
];

const InclusionsSection = ({
  inclusions,
  title = "INCLUSIONS",
}: {
  inclusions: Array<{ key: string; enabled: boolean }>;
  title?: string;
}) => {
  if (!inclusions.length) return null;
  return (
    <section className={SECTION_BLOCK}>
      <div className={CONTENT_WRAP}>
        <div className="mb-8">
          <LinedHeading title={title} />
        </div>
        <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 md:grid-cols-6">
          {inclusions.map(({ key, enabled }) => {
            const item = ALL_INCLUSIONS.find((i) => i.key === key);
            if (!item) return null;
            return (
              <div
                key={key}
                className={`flex flex-col items-center gap-2 text-center ${enabled ? "text-[#111827]" : "text-slate-400"}`}
              >
                {/* Icon with optional cross overlay */}
                <div className="relative">
                  {item.icon}
                  {!enabled ? (
                    <svg viewBox="0 0 40 40" className="absolute inset-0 h-10 w-10 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="8" y1="8" x2="32" y2="32" />
                      <line x1="32" y1="8" x2="8" y2="32" />
                    </svg>
                  ) : null}
                </div>
                {/* Label â€” strikethrough when disabled */}
                <span className={`text-[10px] font-semibold uppercase tracking-wider font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[11px] ${!enabled ? "line-through" : ""}`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const LogoCarousel = ({ logos, title }: { logos: string[]; title?: string }) => {
  const [offset, setOffset] = React.useState(0);
  const visible = 4;
  const total = logos.length;

  React.useEffect(() => {
    if (total <= visible) return;
    const timer = window.setInterval(() => {
      setOffset((prev) => (prev + 1) % total);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [total]);

  if (!total) return null;

  // Build the display list — always show `visible` items, cycling
  const displayed = Array.from({ length: visible }, (_, i) => logos[(offset + i) % total]);

  return (
    <section className="bg-white px-4 py-10 md:px-6 md:py-12">
      <div className={CONTENT_WRAP}>
        {title ? (
          <div className="mb-8">
            <LinedHeading title={title} />
          </div>
        ) : null}
        <div className="overflow-hidden">
          <div
            className="flex items-center justify-center gap-8 md:gap-16 transition-all duration-700"
          >
            {displayed.map((src, idx) => (
              <div
                key={`logo-${offset}-${idx}`}
                className="flex h-[72px] w-[200px] shrink-0 items-center justify-center md:h-[80px] md:w-[220px]"
              >
                <img
                  src={src}
                  alt={`Partner logo ${idx + 1}`}
                  className="max-h-full max-w-full object-contain transition duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const FaqAccordion = ({ faqs }: { faqs: Array<{ question: string; answer: string }> }) => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  if (!faqs.length) return null;
  return (
    <section className="px-4 pb-10 pt-0 md:px-6 md:pb-14">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6">
          <LinedHeading title="Frequently Asked Questions" />
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="flex w-full items-center justify-between border-b border-transparent px-5 py-4 text-left transition hover:bg-slate-50 data-[open=true]:border-slate-200"
                data-open={openIndex === idx ? "true" : "false"}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-[12px] font-bold text-white font-['Poppins',ui-sans-serif,system-ui,sans-serif]">
                    {idx + 1}
                  </span>
                  <span className="text-[14px] font-semibold text-[#111827] font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[15px]">
                    {faq.question}
                  </span>
                </span>
                <span className={`ml-4 shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-[18px] text-slate-500 transition-transform duration-200 ${openIndex === idx ? "border-slate-400" : ""}`}>
                  {openIndex === idx ? "-" : "+"}
                </span>
              </button>
              {openIndex === idx ? (
                <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
                  {(() => {
                    const lines = faq.answer.split("\n").map((l) => l.trim()).filter(Boolean);
                    const blocks: Array<{ type: "bullet" | "para"; text: string }> = [];
                    let paraBuffer: string[] = [];
                    const flushPara = () => {
                      if (paraBuffer.length) {
                        blocks.push({ type: "para", text: paraBuffer.join(" ") });
                        paraBuffer = [];
                      }
                    };
                    lines.forEach((line) => {
                      if (line.endsWith(".") || line.endsWith("!") || line.endsWith("?")) {
                        flushPara();
                        blocks.push({ type: "bullet", text: line });
                      } else {
                        paraBuffer.push(line);
                      }
                    });
                    flushPara();
                    const hasBullets = blocks.some((b) => b.type === "bullet");
                    return (
                      <div className="space-y-2">
                        {blocks.map((block, bi) =>
                          block.type === "bullet" ? (
                            <div key={bi} className="flex items-start gap-2">
                              <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#374151]" />
                              <p className="text-[13px] leading-relaxed text-[#374151] font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[14px]">{block.text}</p>
                            </div>
                          ) : (
                            <p key={bi} className={`text-[13px] leading-relaxed text-[#374151] font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[14px] ${hasBullets ? "pl-4" : ""}`}>{block.text}</p>
                          )
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
const IMAGE_ACTION_BUTTON =
  "rounded-full border-2 border-white/90 bg-black/60 px-8 py-2 text-[12px] font-semibold uppercase text-white shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur-[2px] transition hover:bg-black/70 font-['Poppins',ui-sans-serif,system-ui,sans-serif]";
const MOBILE_SECTION_HEADING =
  "text-center text-[22px] md:text-[32px] font-semibold uppercase tracking-normal text-[#000000] font-['Poppins',ui-sans-serif,system-ui,sans-serif]";

// Heading with horizontal lines on both sides â€º used across all section headings
const LinedHeading = ({ title }: { title: string }) => (
  <div className="flex items-center gap-4">
    <div className="flex-1 border-t border-[#111827]" />
    <h2 className="shrink-0 text-center text-[20px] font-semibold uppercase tracking-[0.15em] text-[#111827] font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[26px]">
      {title}
    </h2>
    <div className="flex-1 border-t border-[#111827]" />
  </div>
);

const getNonEmptyTextList = (...values: unknown[]) =>
  values.map((value) => String(value || "").trim()).filter(Boolean);

const getMediaSrc = (value: any) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return getMediaSrc(value[0]);
  if (typeof value === "object") {
    return value?.url || value?.preview || value?.location || "";
  }
  return "";
};

const mapReviewToTestimonial = (item: any) => ({
  key: String(item?._id || item?.upstreamReviewId || item?.id || "").trim(),
  image: getMediaSrc(item?.reviewerImage || item?.image),
  name:
    String(
      item?.reviewerName || item?.reviewreName || item?.fullName || item?.name || "",
    ).trim() || "Reviewer",
  role: String(item?.role || item?.designation || item?.jobPosition || "").trim(),
  text: String(item?.review || item?.comment || item?.description || "").trim(),
  rating: Number(item?.starCount ?? item?.rating ?? item?.rate ?? 0) || 0,
});

const getAvatarInitials = (name: string) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "R";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

const getTrimmedText = (value: string, limit = 95) => {
  const text = String(value || "").trim();
  if (text.length <= limit) return { text, truncated: false };
  return {
    text: `${text.slice(0, limit).trimEnd()}...`,
    truncated: true,
  };
};

const IconCircle = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#f1dc3a] text-[#111827]">
    {children}
  </span>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4.07 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.64 2.6a2 2 0 0 1-.45 2.11L8 9.69a16 16 0 0 0 6.31 6.31l1.26-1.26a2 2 0 0 1 2.11-.45c.83.31 1.7.52 2.6.64A2 2 0 0 1 22 16.92Z" />
  </svg>
);

const MapIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
    <circle cx="12" cy="11" r="2.25" />
  </svg>
);

const getLeadFieldsForProduct = (slug: string) => {
  const normalized = normalizeSlug(slug);
  if (normalized.includes("meeting")) {
    return [
      { key: "fullName", label: "Full Name", type: "text", required: true },
      { key: "mobile", label: "Mobile Number", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "people", label: "No. Of Attendees", type: "number", required: true },
      { key: "startDate", label: "Meeting Date", type: "date", required: true },
      { key: "endDate", label: "Meeting End Date", type: "date", required: false },
    ];
  }
  if (normalized.includes("workation")) {
    return [
      { key: "fullName", label: "Full Name", type: "text", required: true },
      { key: "mobile", label: "Mobile Number", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "people", label: "No. Of Guests", type: "number", required: true },
      { key: "startDate", label: "Check-In Date", type: "date", required: true },
      { key: "endDate", label: "Check-Out Date", type: "date", required: true },
    ];
  }
  if (normalized.includes("co-living") || normalized.includes("coliving")) {
    return [
      { key: "fullName", label: "Full Name", type: "text", required: true },
      { key: "mobile", label: "Mobile Number", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "people", label: "No. Of Occupants", type: "number", required: true },
      { key: "startDate", label: "Move-In Date", type: "date", required: true },
      { key: "endDate", label: "Preferred Stay Until", type: "date", required: false },
    ];
  }
  if (normalized.includes("hostel")) {
    return [
      { key: "fullName", label: "Full Name", type: "text", required: true },
      { key: "mobile", label: "Mobile Number", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "people", label: "Beds Required", type: "number", required: true },
      { key: "startDate", label: "Check-In Date", type: "date", required: true },
      { key: "endDate", label: "Check-Out Date", type: "date", required: true },
    ];
  }
  return [
    { key: "fullName", label: "Full Name", type: "text", required: true },
    { key: "mobile", label: "Mobile Number", type: "text", required: true },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "people", label: "No. Of People", type: "number", required: false },
    { key: "startDate", label: "Start Date", type: "date", required: false },
    { key: "endDate", label: "End Date", type: "date", required: false },
  ];
};

const getLeadMetaForProduct = (product: any) => {
  const slug = normalizeSlug(product?.slug || product?.name || "");
  const dynamicPrice = [product?.price, product?.cost, product?.duration]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" | ");
  const dynamicDescription = String(product?.description || product?.subText || "").trim();

  if (dynamicPrice || dynamicDescription) {
    return {
      priceLine: dynamicPrice || "Starting at 5,900 + GST",
      description:
        dynamicDescription ||
        "",
      label: "Enquire & Receive Quote",
    };
  }

  if (slug.includes("meeting")) {
    return {
      priceLine: "Starting at 2,499 + GST",
      description:
        "",
      label: "Enquire & Receive Quote",
    };
  }
  if (slug.includes("workation")) {
    return {
      priceLine: "Starting at 7,900 + GST",
      description:
        "",
      label: "Plan Your Workation",
    };
  }
  if (slug.includes("co-living") || slug.includes("coliving")) {
    return {
      priceLine: "Starting at 14,900 + GST",
      description:
        "",
      label: "Enquire About Stay",
    };
  }
  if (slug.includes("hostel")) {
    return {
      priceLine: "Starting at 799 + GST",
      description:
        "",
      label: "Check Bed Availability",
    };
  }
  return {
    priceLine: "Starting at 5,900 + GST",
    description:
      "",
    label: "Enquire & Receive Quote",
  };
};

const getProductContentItems = (draft: any, slug: string) => {
  const normalized = normalizeSlug(slug);
  if (normalized.includes("meeting")) {
    return Array.isArray(draft?.meetingRooms)
      ? draft.meetingRooms
      : Array.isArray(draft?.rooms)
        ? draft.rooms
        : [];
  }
  if (normalized.includes("co-living") || normalized.includes("coliving")) {
    return Array.isArray(draft?.coLivingRooms) ? draft.coLivingRooms : [];
  }
  if (normalized.includes("workation")) {
    return Array.isArray(draft?.packages) ? draft.packages : [];
  }
  if (normalized.includes("hostel")) {
    return Array.isArray(draft?.dorms) ? draft.dorms : [];
  }
  return Array.isArray(draft?.products) ? draft.products : [];
};

const PageDemo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<any>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [galleryViewerOpen, setGalleryViewerOpen] = useState(false);
  const [galleryViewerIndex, setGalleryViewerIndex] = useState(0);
  const [productsMenuOpen, setProductsMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductsMenuOpen, setMobileProductsMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const productsDropdownRef = useRef<HTMLDivElement | null>(null);

  const [selectedLeadProduct, setSelectedLeadProduct] = useState<any>(null);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadSubmitPending, setLeadSubmitPending] = useState(false);
  const [leadSubmitError, setLeadSubmitError] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewSubmitPending, setReviewSubmitPending] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState("");
  const [approvedReviews, setApprovedReviews] = useState<any[]>([]);
  const [expandedTestimonials, setExpandedTestimonials] = useState<Record<string, boolean>>({});
  const [successPopup, setSuccessPopup] = useState({ open: false, message: "" });
  const [partnerForm, setPartnerForm] = useState({ name: "", email: "", mobile: "", message: "" });
  const [partnerSubmitPending, setPartnerSubmitPending] = useState(false);
  const [leadForm, setLeadForm] = useState({
    fullName: "",
    people: "",
    mobile: "",
    email: "",
    startDate: "",
    endDate: "",
  });
  const [reviewForm, setReviewForm] = useState({
    reviewerName: "",
    rating: "5",
    review: "",
  });
  const [productHeroIndex, setProductHeroIndex] = useState(0);

  useEffect(() => {
    const loadDraft = () => {
      try {
        const raw = localStorage.getItem(LIVE_PREVIEW_DRAFT_STORAGE_KEY);
        if (!raw) {
          setDraft(null);
          return;
        }
        setDraft(JSON.parse(raw));
      } catch (error) {
        console.error("Failed to parse preview draft", error);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LIVE_PREVIEW_DRAFT_STORAGE_KEY) loadDraft();
    };

    loadDraft();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("website-preview-draft-updated", loadDraft);
    const intervalId = window.setInterval(loadDraft, 800);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("website-preview-draft-updated", loadDraft);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!productsDropdownRef.current) return;
      if (!productsDropdownRef.current.contains(event.target as Node)) {
        setProductsMenuOpen(false);
      }
    };

    if (productsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [productsMenuOpen]);

  // All visible page data comes from the saved draft shape.
  // When this shape changes, hosted rendering should be updated here too.
  const navItems = useMemo(() => {
    const sourceNavItems = Array.isArray(draft?.pageNavItems)
      ? draft.pageNavItems
      : Array.isArray(draft?.navItems)
        ? draft.navItems
        : [];
    const fromDraft = sourceNavItems
      .filter((item: any) => item?.enabled !== false)
      .map((item: any) => ({
        name: item?.name || "Page",
        slug: normalizeSlug(item?.slug || item?.name || "page"),
      }));
    return fromDraft.length ? fromDraft : FALLBACK_NAV;
  }, [draft]);

  const productPages = useMemo(
    () => {
      const products = Array.isArray(draft?.products) ? draft.products : [];
      // Build a slug -> first product image lookup so a product page can be matched
      // to its product by name/type (not just array position, which can misalign).
      const productImageBySlug: Record<string, string> = {};
      products.forEach((p: any) => {
        const url =
          getMediaSrc(p?.images?.[0]) || getMediaSrc(p?.files?.[0]) || "";
        if (!url) return;
        [normalizeSlug(p?.type), normalizeSlug(p?.name)]
          .filter(Boolean)
          .forEach((s) => {
            if (!productImageBySlug[s]) productImageBySlug[s] = url;
          });
      });
      const resolveCardImage = (item: any, index: number) =>
        getMediaSrc(item?.cardImage) ||
        getMediaSrc(item?.homeCardImage) ||
        productImageBySlug[normalizeSlug(item?.slug || item?.name || "")] ||
        getMediaSrc(products?.[index]?.images?.[0]) ||
        getMediaSrc(products?.[index]?.files?.[0]) ||
        "";

      const dropdownPages = Array.isArray(draft?.productDropdownPages)
        ? draft.productDropdownPages
        : [];
      if (dropdownPages.length > 0) {
        return dropdownPages.map((item: any, index: number) => ({
          ...item,
          cardImage: resolveCardImage(item, index),
        }));
      }

      const serializedPages = Array.isArray(draft?.productPages)
        ? draft.productPages
        : [];
      if (serializedPages.length > 0) {
        return serializedPages.map((item: any, index: number) => ({
          ...item,
          cardImage: resolveCardImage(item, index),
        }));
      }

      // No product pages configured (older websites): build cards directly from the
      // products list so their images still show on the home "Our Products" section
      // and each product opens as a product page.
      return products
        .map((product: any, index: number) => {
          const name = String(product?.name || product?.type || "").trim();
          if (!name) return null;
          const image =
            getMediaSrc(product?.images?.[0]) ||
            getMediaSrc(product?.files?.[0]) ||
            "";
          return {
            name,
            slug: normalizeSlug(product?.slug || name || `product-${index + 1}`),
            heading: name,
            subText: String(product?.description || "").trim(),
            cardImage: image,
            heroImage: image,
            heroImages: image ? [image] : [],
          };
        })
        .filter(Boolean);
    },
    [draft?.productDropdownPages, draft?.productPages, draft?.products],
  );
  const menuItems = useMemo(
    () => (Array.isArray(draft?.menuItems) ? draft.menuItems : []),
    [draft?.menuItems],
  );

  // Route-based section selection keeps the preview URL and the section
  // currently shown on screen in sync with the hosted version.
  const { currentSection, currentProductSlug, currentItemSlug } = useMemo(() => {
    const relative = String(location.pathname || "").replace(/^\/website-preview\/?/, "");
    const rawParts = relative.split("/").filter(Boolean);
    const parts = rawParts[0] === "page" ? rawParts.slice(1) : rawParts;
    const section = resolveSectionFromSlug(parts[0] || "home");
    const productSlug = parts[1] ? normalizeSlug(parts[1]) : "";
    const itemSlug = parts[2] ? normalizeSlug(parts[2]) : "";
    return { currentSection: section, currentProductSlug: productSlug, currentItemSlug: itemSlug };
  }, [location.pathname]);

  const selectedProductPage = useMemo(
    () =>
      productPages.find(
        (item: any) => normalizeSlug(item?.slug || item?.name || "") === currentProductSlug,
      ) || null,
    [productPages, currentProductSlug],
  );

  const selectedDetailItem = useMemo(() => {
    if (!currentItemSlug || !selectedProductPage) return null;
    const contentItems = getProductContentItems(draft, selectedProductPage?.slug || selectedProductPage?.name || "");
    const pool = contentItems.length ? contentItems : [selectedProductPage];
    return pool.find((item: any) => normalizeSlug(item?.title || item?.name || item?.heading || "") === currentItemSlug) || null;
  }, [currentItemSlug, selectedProductPage, draft]);
  const breadcrumbItems = useMemo(() => {
    const items: Array<{ label: string; onClick?: () => void }> = [
      {
        label: "Home",
        onClick: () => navigate("/website-preview/page/home"),
      },
    ];

    if (currentSection !== "home") {
      items.push({
        label: currentSection === "partner" ? "Partner" : currentSection === "testimonials" ? "Testimonials" : currentSection.charAt(0).toUpperCase() + currentSection.slice(1),
        onClick: () => navigate(`/website-preview/page/${currentSection}`),
      });
    }

    if (currentSection === "products" && selectedProductPage) {
      items.push({
        label: String(selectedProductPage?.heading || selectedProductPage?.name || "Product").trim(),
        onClick: selectedDetailItem
          ? () => navigate(`/website-preview/page/products/${normalizeSlug(selectedProductPage?.slug || selectedProductPage?.name || "")}`)
          : undefined,
      });
    }

    if (currentSection === "products" && selectedDetailItem) {
      const detailTitle = String(
        selectedDetailItem?.title || selectedDetailItem?.name || selectedDetailItem?.heading || "Details"
      ).trim();
      items.push({ label: detailTitle });
    }

    return items;
  }, [currentSection, navigate, selectedProductPage]);

  // Home-page images are reused as the top-level hero background.
  const heroImages = Array.isArray(draft?.heroImages) ? draft.heroImages : [];

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [heroImages.length]);

  useEffect(() => {
    setProductHeroIndex(0);
  }, [currentProductSlug]);

  // Track previous item slug to avoid resetting the form on every draft re-poll
  const prevDetailItemSlugRef = useRef<string>("");

  // Auto-set the lead product when on a detail item page so the form submits without a modal.
  useEffect(() => {
    if (selectedDetailItem && selectedProductPage) {
      const detailTitle = String(selectedDetailItem?.title || selectedDetailItem?.name || selectedDetailItem?.heading || "Product").trim();
      const detailDescription = String(selectedDetailItem?.description || selectedDetailItem?.subText || selectedProductPage?.subText || "").trim();
      const detailImage = getMediaSrc(selectedDetailItem?.images?.[0]) || getMediaSrc(selectedDetailItem?.cardImage) || getMediaSrc(selectedProductPage?.cardImage) || "";
      const currentSlug = normalizeSlug(selectedDetailItem?.title || selectedDetailItem?.name || selectedDetailItem?.heading || "");

      setSelectedLeadProduct({
        ...selectedProductPage,
        ...selectedDetailItem,
        name: detailTitle,
        subText: detailDescription,
        cardImage: detailImage,
      });

      // Only reset the form if we navigated to a different item
      if (prevDetailItemSlugRef.current !== currentSlug) {
        prevDetailItemSlugRef.current = currentSlug;
        setLeadSubmitted(false);
        setLeadSubmitError("");
        setLeadForm({ fullName: "", people: "", mobile: "", email: "", startDate: "", endDate: "" });
      }    } else if (!selectedDetailItem) {
      prevDetailItemSlugRef.current = "";
      setSelectedLeadProduct(null);
    }
  }, [selectedDetailItem, selectedProductPage]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileProductsMenuOpen(false);
    // Scroll to top on every page/section change.
    // The preview is inside the dashboard's scrollable-content div — scroll that.
    // For standalone preview (new tab), scroll window.
    const scrollableDiv = document.getElementById("scrollable-content");
    if (scrollableDiv) {
      scrollableDiv.scrollTo({ top: 0, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      setMobileProductsMenuOpen(false);
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleClickOutsideHeader = (event: MouseEvent) => {
      if (!mobileMenuOpen || !headerRef.current) return;
      if (!headerRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
        setMobileProductsMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutsideHeader);
    }

    return () => document.removeEventListener("mousedown", handleClickOutsideHeader);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const testimonialCount =
      approvedReviews.length + (Array.isArray(draft?.testimonials) ? draft.testimonials.length : 0);
    const maxPages = Math.max(1, Math.ceil(testimonialCount / 3));
    if (testimonialIndex >= maxPages) {
      setTestimonialIndex(0);
    }
  }, [approvedReviews, draft?.testimonials, testimonialIndex]);

  useEffect(() => {
    const fetchApprovedReviews = async () => {
      const searchKey = String(draft?.searchKey || "").trim();
      const companyId = String(draft?.companyId || "").trim();
      const workspaceId = String(draft?.workspaceId || "").trim();

      if (!searchKey && !companyId && !workspaceId) {
        setApprovedReviews([]);
        return;
      }

      try {
        const response = await api.get("/api/review/public", {
          params: {
            searchKey,
            companyId,
            workspaceId,
          },
        });
        const reviews = Array.isArray(response?.data?.reviews)
          ? response.data.reviews
          : [];
        setApprovedReviews(reviews);
      } catch (error) {
        console.error("Failed to load approved website reviews", error);
        setApprovedReviews([]);
      }
    };

    if (draft) {
      void fetchApprovedReviews();
    }
  }, [draft]);

  const heroImage = heroImages[heroIndex] || heroImages[0] || "";
  const galleryItems = Array.isArray(draft?.gallery)
    ? draft.gallery.map((item: any) => getMediaSrc(item)).filter(Boolean)
    : [];
  const homeGalleryItems = galleryItems.slice(0, 6);
  const draftTestimonials = (Array.isArray(draft?.testimonials) ? draft.testimonials : [])
    .map((item: any, index: number) => ({
      key: `draft-${index}`,
      image: getMediaSrc(item?.image),
      name: String(item?.name || "").trim() || "Reviewer",
      text: String(item?.text || item?.testimony || item?.review || item?.comment || "").trim(),
      rating: Number(item?.rating ?? 0) || 0,
    }))
    .filter((item: any) => item.text);
  const approvedTestimonials = approvedReviews
    .map(mapReviewToTestimonial)
    .filter((item) => item.text);
  const testimonials = [...draftTestimonials, ...approvedTestimonials].filter(
    (item, index, array) =>
      index ===
      array.findIndex(
        (candidate) =>
          String(candidate?.key || "").trim() === String(item?.key || "").trim() ||
          (candidate?.name === item?.name && candidate?.text === item?.text),
      ),
  );
  const testimonialPages = Math.max(1, Math.ceil(testimonials.length / 3));
  const visibleTestimonials = testimonials.slice(testimonialIndex * 3, testimonialIndex * 3 + 3);
  const aboutBlocks = Array.isArray(draft?.about) ? draft.about : [];
  const aboutPageImageCards = Array.isArray(draft?.aboutPageImageCards)
    ? draft.aboutPageImageCards.filter(
        (card: any) => String(card?.title || "").trim() || String(card?.description || "").trim() || card?.image,
      )
    : [];
  const selectedGalleryImage = galleryItems[galleryViewerIndex] || galleryItems[0] || "";
  const aboutNarrativeBlocks = [
    { title: "Our Story", body: String(draft?.aboutPageStory || "").trim() },
    { title: "Our Mission", body: String(draft?.aboutPageMission || "").trim() },
    { title: "Our Vision", body: String(draft?.aboutPageVision || "").trim() },
    { title: "Our Values", body: String(draft?.aboutPageValues || "").trim() },
  ].filter((item) => item.body);
  const aboutIntroBlocks = getNonEmptyTextList(
    draft?.aboutPageIntro,
    draft?.aboutPageOverview,
    ...aboutBlocks,
  );
  const showWriteReview = draft?.testimonialsEnableWriteReview !== false;
  const founders = Array.isArray(draft?.founders) ? draft.founders.filter((f: any) => String(f?.name || "").trim()) : [];
  const partnerPageHeading = String(draft?.partnerPageHeading || "").trim();
  const partnerPageContent = String(draft?.partnerPageContent || "").trim();
  const partnerFormTitle = String(draft?.partnerFormTitle || "").trim();
  const contactEmail = String(draft?.email || "").trim();
  const contactPhone = String(draft?.phone || "").trim();
  const contactAddress = String(draft?.address || "Panjim-Goa").trim();
  const footerCompanyName = String(draft?.registeredCompanyName || draft?.companyName || "").trim();
  const footerCopyrightText = String(draft?.copyrightText || "").trim();
  const footerAddress = String(draft?.address || "").trim();

  const renderContactCard = () => (
    <div className="flex h-full min-h-[320px] flex-col bg-white px-6 py-7 shadow-sm md:min-h-[430px] md:px-10 md:py-10">
      {draft?.companyLogo ? (
        <img
          src={draft.companyLogo}
          alt={draft.companyName || "Company"}
          className="mx-auto h-14 w-auto object-contain md:h-16"
        />
      ) : (
        <div className="mx-auto h-14 w-full max-w-[220px]" />
      )}

      <div className="mt-10 space-y-7 text-[15px] leading-7 text-[#111827] md:mt-14 md:text-[16px]">
        {contactEmail ? (
          <a
            href={`mailto:${contactEmail}`}
            className="grid min-w-0 grid-cols-[48px_1fr] items-center gap-5 transition hover:opacity-80"
          >
            <IconCircle>
              <MailIcon />
            </IconCircle>
            <span className="min-w-0 break-words leading-7">{contactEmail}</span>
          </a>
        ) : null}

        {contactPhone ? (
          <a
            href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}
            className="grid min-w-0 grid-cols-[48px_1fr] items-center gap-5 transition hover:opacity-80"
          >
            <IconCircle>
              <PhoneIcon />
            </IconCircle>
            <span className="min-w-0 break-words leading-7">{contactPhone}</span>
          </a>
        ) : null}

        {contactAddress ? (
          <div className="grid min-w-0 grid-cols-[48px_1fr] items-start gap-5">
            <div className="flex items-start justify-center pt-0.5">
              <IconCircle>
                <MapIcon />
              </IconCircle>
            </div>
            <span className="min-w-0 break-words pt-0.5 leading-7">{contactAddress}</span>
          </div>
        ) : null}
      </div>
    </div>
  );

  useEffect(() => {
    if (testimonialPages <= 1) return;
    const timer = window.setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonialPages);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [testimonialPages]);

  useEffect(() => {
    if (galleryViewerIndex >= galleryItems.length) {
      setGalleryViewerIndex(0);
    }
  }, [galleryItems.length, galleryViewerIndex]);

  if (!draft) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h2 className="text-lg font-semibold text-slate-800">Preview</h2>
        <p className="mt-2 text-sm text-slate-600">
          No preview data found. Go back to Create Website and click Preview.
        </p>
      </div>
    );
  }

  const getPreviewRouteForSection = (slug: string) => {
    const sectionId = resolveSectionFromSlug(slug);
    return sectionId === "home" ? "/website-preview/page/home" : `/website-preview/page/${sectionId}`;
  };

  const getPreviewRouteForProduct = (slug: string) =>
    `/website-preview/page/products/${normalizeSlug(slug)}`;

  const goToSection = (slug: string) => {
    setProductsMenuOpen(false);
    setMobileMenuOpen(false);
    setMobileProductsMenuOpen(false);
    navigate(getPreviewRouteForSection(slug));
  };

  const goToProductPage = (slug: string) => {
    setProductsMenuOpen(false);
    setMobileMenuOpen(false);
    setMobileProductsMenuOpen(false);
    navigate(getPreviewRouteForProduct(slug));
  };

  const openGalleryViewer = (index: number) => {
    if (!galleryItems.length) return;
    const nextIndex = Math.max(0, Math.min(index, galleryItems.length - 1));
    setGalleryViewerIndex(nextIndex);
    setGalleryViewerOpen(true);
  };

  const closeGalleryViewer = () => setGalleryViewerOpen(false);

  const goToGalleryIndex = (index: number) => {
    if (!galleryItems.length) return;
    const normalizedIndex = ((index % galleryItems.length) + galleryItems.length) % galleryItems.length;
    setGalleryViewerIndex(normalizedIndex);
  };

  const handleHeroNext = () => {
    if (heroImages.length <= 1) return;
    setHeroIndex((prev) => (prev + 1) % heroImages.length);
  };

  const handleHeroPrev = () => {
    if (heroImages.length <= 1) return;
    setHeroIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  const openLeadModal = (product: any) => {
    setSelectedLeadProduct(product);
    setLeadSubmitted(false);
    setLeadSubmitError("");
    setLeadForm({
      fullName: "",
      people: "",
      mobile: "",
      email: "",
      startDate: "",
      endDate: "",
    });
  };

  const closeLeadModal = () => setSelectedLeadProduct(null);

  const openReviewModal = () => {
    setReviewSubmitted(false);
    setReviewSubmitError("");
    setReviewForm({
      reviewerName: "",
      rating: "5",
      review: "",
    });
    setReviewModalOpen(true);
  };

  const showSuccessPopup = (message: string) => {
    setSuccessPopup({ open: true, message });
    window.setTimeout(() => {
      setSuccessPopup((prev) =>
        prev.message === message ? { open: false, message: "" } : prev,
      );
    }, 2200);
  };

  const submitLeadForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setLeadSubmitPending(true);
    setLeadSubmitError("");
    try {
      const slug = normalizeSlug(selectedLeadProduct?.slug || selectedLeadProduct?.name || "");
      await api.post("/api/leads/create-lead", {
        fullName: leadForm.fullName,
        name: leadForm.fullName,
        mobileNumber: leadForm.mobile,
        mobile: leadForm.mobile,
        phone: leadForm.mobile,
        email: leadForm.email,
        source: "Website Preview",
        companyName: draft?.companyName || "",
        companyId: draft?.companyId || "",
        workspaceId: draft?.workspaceId || "",
        searchKey: draft?.searchKey || "",
        vertical: draft?.vertical || "",
        productType: selectedLeadProduct?.name || selectedLeadProduct?.heading || "",
        roomType: selectedLeadProduct?.name || selectedLeadProduct?.heading || "",
        packageName: selectedLeadProduct?.name || selectedLeadProduct?.heading || "",
        dormType: selectedLeadProduct?.name || selectedLeadProduct?.heading || "",
        noOfPeople: leadForm.people,
        attendees: leadForm.people,
        stayDuration: leadForm.endDate
          ? `${leadForm.startDate || ""} to ${leadForm.endDate}`
          : "",
        startDate: leadForm.startDate,
        endDate: leadForm.endDate,
        timeSlot: "",
        inquiryType: slug.includes("cafe") ? "Cafe" : "",
        websiteUrl: window.location.href,
      });
      setLeadSubmitted(true);
      // Only close the modal if we're not on the inline detail page
      if (!selectedDetailItem) {
        closeLeadModal();
      }
      showSuccessPopup("Lead submitted successfully.");
    } catch (error: any) {
      console.error("Failed to submit website lead", error);
      setLeadSubmitError(
        error?.response?.data?.message || "Failed to submit lead. Please try again.",
      );
    } finally {
      setLeadSubmitPending(false);
    }
  };

  const submitReviewForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setReviewSubmitPending(true);
    setReviewSubmitError("");
    try {
      await api.post("/api/review/create-website-review", {
        reviewerName: reviewForm.reviewerName,
        rating: Number(reviewForm.rating || 5),
        starCount: Number(reviewForm.rating || 5),
        review: reviewForm.review,
        source: "Website Form",
        companyName: draft?.companyName || "",
        companyId: draft?.companyId || "",
        workspaceId: draft?.workspaceId || "",
        searchKey: draft?.searchKey || "",
        websiteUrl: window.location.href,
      });
      setApprovedReviews((prev) => [
        ...prev,
        {
          _id: `local-${Date.now()}`,
          reviewerName: reviewForm.reviewerName,
          review: reviewForm.review,
          starCount: Number(reviewForm.rating || 5),
          status: "pending",
        },
      ]);
      setReviewSubmitted(true);
      setReviewModalOpen(false);
      showSuccessPopup(
        draft?.testimonialsSuccessMessage || "Review submitted successfully.",
      );
    } catch (error: any) {
      console.error("Failed to submit website review", error);
      setReviewSubmitError(
        error?.response?.data?.message ||
          "Failed to submit review. Please try again.",
      );
    } finally {
      setReviewSubmitPending(false);
    }
  };

  const handleProductCardAction = (product: any) => {
    const slug = normalizeSlug(product?.slug || product?.name || "");
    navigate(`/website-preview/page/products/${slug}`);
  };

  const selectedProductHeroImages = Array.isArray(selectedProductPage?.heroImages)
    ? selectedProductPage.heroImages
    : [];
  const selectedProductHeroImage =
    getMediaSrc(selectedProductHeroImages[productHeroIndex]) ||
    getMediaSrc(selectedProductHeroImages[0]) ||
    getMediaSrc(selectedProductPage?.heroImage) ||
    // Fall back to the product's own image (the same one used for the home card)
    // so the product page always shows the product photo even without a dedicated hero.
    getMediaSrc(selectedProductPage?.cardImage) ||
    "";
  const selectedProductContentItems = selectedProductPage
    ? getProductContentItems(draft, selectedProductPage?.slug || selectedProductPage?.name || "")
    : [];
  const resolvedHomeHeroImage = heroImage || galleryItems[0] || "";
  const showHeroCarousel = heroImages.length > 1;

  return (
    <div className="min-h-screen bg-[#e9e9e9] text-[#1f1f1f]">
      <header ref={headerRef} className="sticky top-0 z-30 border-b border-slate-300 bg-[#ffffff] shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-4 px-4 py-3 md:px-0 md:py-3">
          <button
            type="button"
            onClick={() => goToSection("home")}
            className="flex h-16 w-24 items-center justify-end overflow-hidden lg:w-36"
            aria-label="Go to home"
          >
            {draft?.companyLogo ? (
              <img
                src={draft.companyLogo}
                alt={draft.companyName || "Company Logo"}
                className="sw-full h-full object-contain"
              />
            ) : null}
            {!draft?.companyLogo && draft?.companyName ? (
              <p className="text-sm font-semibold">{draft.companyName}</p>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((prev) => !prev);
              setProductsMenuOpen(false);
            }}
            className="inline-flex h-9 w-9 items-center justify-end rounded-md border border-slate-300 text-slate-700 md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
          >
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-4 bg-current" />
              <span className="block h-0.5 w-4 bg-current" />
              <span className="block h-0.5 w-4 bg-current" />
            </span>
          </button>

          <nav className="ml-autohidden flex-1 items-center justify-end gap-6 px-0 md:flex">
            {navItems.map((item) => {
              const isProducts = resolveSectionFromSlug(item.slug) === "products";
              const isActive = currentSection === resolveSectionFromSlug(item.slug);
              if (!isProducts) {
                return (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => goToSection(item.slug)}
                    className={`whitespace-nowrap border-b-2 px-2 pb-1 text-[13px] font-medium transition hover:font-semibold md:text-[14px] ${
                      isActive
                        ? "border-[#3b82f6] font-semibold text-[#111]"
                        : "border-transparent text-[#222] hover:border-[#3b82f6] hover:text-[#000]"
                    }`}
                  >
                    {item.name}
                  </button>
                );
              }

              return (
                <div key={item.slug} className="relative" ref={productsDropdownRef}>
                  <div
                    className={`inline-flex items-center gap-1 whitespace-nowrap border-b-2 px-2 pb-1 text-[13px] font-medium transition hover:font-semibold md:text-[14px] ${
                      isActive || productsMenuOpen
                        ? "border-[#3b82f6] font-semibold text-[#111]"
                        : "border-transparent text-[#222] hover:border-[#3b82f6] hover:text-[#000]"
                    }`}
                  >
                    <button type="button" onClick={() => goToSection(item.slug)}>
                      {item.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductsMenuOpen((prev) => !prev)}
                      aria-label="Toggle products menu"
                    >
                      <span className={`inline-flex transition-transform ${productsMenuOpen ? "rotate-180" : ""}`}>
                        <svg
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                          className="h-3 w-3 text-slate-600"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 7.5l5 5 5-5" />
                        </svg>
                      </span>
                    </button>
                  </div>
                  {productsMenuOpen && productPages.length > 0 ? (
                    <div className="absolute left-1/2 top-full z-40 mt-2 w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                      <button
                        type="button"
                        onClick={() => goToSection(item.slug)}
                        className="block w-full rounded px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100"
                      >
                        All Products
                      </button>
                     {productPages.map((product: any, idx: number) => {
                        const productSlug = normalizeSlug(product?.slug || product?.name || "product");
                        const isCurrentProduct =
                          currentSection === "products" && currentProductSlug === productSlug;

                        return (
                          <button
                            key={`product-nav-${idx}`}
                            type="button"
                            onClick={() => goToProductPage(product?.slug || product?.name || "product")}
                            className={`block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                              isCurrentProduct
                                ? "font-semibold text-slate-900"
                                : "font-normal text-slate-700"
                            }`}
                          >
                            {product?.name || "Product"}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="whitespace-nowrap border-b-2 border-transparent px-2 pb-1 text-[13px] font-medium text-[#222] transition hover:border-[#3b82f6] hover:font-semibold hover:text-[#000] md:text-[14px]"
            >
              Login
            </button>
          </nav>

          
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-slate-200 bg-[#f4f4f4] px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isProducts = resolveSectionFromSlug(item.slug) === "products";
                const isActive = currentSection === resolveSectionFromSlug(item.slug);
                if (!isProducts) {
                  return (
                    <button
                      key={`mobile-${item.slug}`}
                      type="button"
                      onClick={() => goToSection(item.slug)}
                      className={`flex items-center justify-between border-b px-1 py-3 text-left text-[15px] ${
                        isActive
                          ? "border-[#3b82f6] font-semibold text-[#111]"
                          : "border-slate-200 text-[#222]"
                      }`}
                    >
                      <span>{item.name}</span>
                    </button>
                  );
                }

                return (
                  <div key={`mobile-${item.slug}`} className="border-b border-slate-200 pb-2">
                    <div
                      className={`flex items-center gap-2 px-1 py-3 text-[15px] ${
                        isActive || mobileProductsMenuOpen ? "font-semibold text-[#111]" : "text-[#222]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => goToSection(item.slug)}
                        className="flex-1 text-left"
                      >
                        <span>{item.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileProductsMenuOpen((prev) => !prev)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
                        aria-label="Toggle product pages"
                      >
                        <svg
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                          className={`h-4 w-4 text-slate-600 transition-transform ${mobileProductsMenuOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 7.5l5 5 5-5" />
                        </svg>
                      </button>
                    </div>
                    {mobileProductsMenuOpen && productPages.length > 0 ? (
                      <div className="flex flex-col gap-1 rounded-lg bg-white p-2 shadow-sm">
                        <button
                          type="button"
                          onClick={() => goToSection(item.slug)}
                          className="rounded px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100"
                        >
                          All Products
                        </button>
                        {productPages.map((product: any, idx: number) => (
                          <button
                            key={`mobile-product-nav-${idx}`}
                            type="button"
                            onClick={() => goToProductPage(product?.slug || product?.name || "product")}
                            className="rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                          >
                            {product?.name || "Product"}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex items-center justify-between border-b border-slate-200 px-1 py-3 text-left text-[15px] text-[#222]"
              >
                Login
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {breadcrumbItems.length > 1 ? (
        <div className="border-b border-slate-200 bg-[#e9e9e9] px-4 py-2 text-[12px] text-slate-600 md:px-6">
          <div className="mx-auto flex w-full max-w-7xl py-1 items-center gap-3 overflow-x-auto whitespace-nowrap">

            {/* breadcrumbs with back button and current page highlight */}
            {/* <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-black shadow-sm transition hover:border-slate-300"
              aria-label="Go back"
            >
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 15l-5-5 5-5" />
              </svg>
            </button> */}
            <div className="flex items-center gap-2">
              {breadcrumbItems.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                  {index > 0 ? <span className="text-slate-400">/</span> : null}
                  {item.onClick ? (
                    <button
                      type="button"
                      onClick={item.onClick}
                      aria-current={index === breadcrumbItems.length - 1 ? "page" : undefined}
                      className={`transition hover:text-black ${
                        index === breadcrumbItems.length - 1
                          ? "font-semibold text-black"
                          : "font-medium text-[#222]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span
                      aria-current="page"
                      className="font-semibold text-black"
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Home page: hero, about summary, product cards, gallery preview, testimonials, and contact summary. */}
      {currentSection === "home" ? (
        <>
          {/* Hero section: uses draft.title, draft.subTitle, and heroImages from the saved template. */}
          <section id="home" className="relative h-[62svh] min-h-[420px] md:h-[84vh] md:min-h-[640px]">
            <div className="absolute inset-0 overflow-hidden bg-[#242424]">
              {showHeroCarousel ? (
                <div
                  className="flex h-full w-full transition-transform duration-700 ease-in-out"
                  style={{ transform: `translateX(-${heroIndex * 100}%)` }}
                >
                  {heroImages.map((src: string, idx: number) => (
                    <div key={`hero-slide-${idx}`} className="h-full min-w-full">
                      <img src={src} alt={`Hero ${idx + 1}`} className="h-full w-full object-cover opacity-65" />
                    </div>
                  ))}
                </div>
              ) : resolvedHomeHeroImage ? (
                <img src={resolvedHomeHeroImage} alt="Hero" className="h-full w-full object-cover opacity-65" />
              ) : null}
            </div>
            {!showHeroCarousel && !resolvedHomeHeroImage ? <div className="absolute inset-0 bg-gradient-to-r from-[#232323] via-[#2d2d2d] to-[#1a1a1a]" /> : null}
            <div className="absolute inset-0 bg-black/40">
              <div className="flex h-full flex-col items-center justify-end gap-3 px-5 py-10 text-center text-white md:gap-6 md:px-6 md:py-24">
                <h1 className="text-[28px] font-bold leading-tight sm:text-[34px] md:text-5xl">
                  {draft?.title || draft?.companyName || ""}
                </h1>
                <p className="mx-auto max-w-xl text-[13px] leading-relaxed md:max-w-4xl md:text-[22px]">
                  {draft?.subTitle || ""}
                </p>
                <div>
                  <button
                    type="button"
                    className={`${IMAGE_ACTION_BUTTON} pointer-events-auto px-5 text-[10px] tracking-[0.18em] md:px-8 md:text-sm`}
                  >
                    {String(draft?.ctaText || "CLICK HERE").toUpperCase()}
                  </button>
                </div>
              </div>
            </div>
            {showHeroCarousel ? (
              <>
                <button
                  type="button"
                  onClick={handleHeroPrev}
                  className="absolute left-5 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/45 px-4 py-2 text-2xl text-white md:block"
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  onClick={handleHeroNext}
                  className="absolute right-5 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/45 px-4 py-2 text-2xl text-white md:block"
                >
                  {">"}
                </button>
              </>
            ) : null}
          </section>

          {/* About summary section: compact intro pulled from about text fields. */}
          <section id="about" className="bg-black px-4 py-12 text-white md:px-6 md:py-20">
            <div className={`${CONTENT_WRAP} text-center`}>
              <h2 className="text-[24px] font-semibold text-[#f7e53f] font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[32px]">
                About Our Vision
              </h2>
              <div className="mt-6 space-y-3 text-white md:mt-7 md:space-y-4">
                {aboutIntroBlocks.length ? (
                  aboutIntroBlocks.map((item: string, idx: number) => (
                    <p
                      key={`about-${idx}`}
                      className="font-['Poppins',ui-sans-serif,system-ui,sans-serif] text-[14px] leading-[1.7] md:text-[20px] md:leading-[1.4]"
                    >
                      {item}
                    </p>
                  ))
                ) : (
                  <p></p>
                )}
              </div>
            </div>
          </section>

          {/* Products section: home-page product cards that link into product detail routes. */}
          <section id="products" className={SECTION_BLOCK}>
            <div className={CONTENT_WRAP}>
              <LinedHeading title="Our Products" />
              <div className="mt-6 grid grid-cols-1 gap-6 md:mt-10 md:grid-cols-3 md:gap-7">
                {productPages.map((item: any, idx: number) => (
                  <article key={`product-${idx}`} className="flex flex-col overflow-hidden rounded-2xl shadow-md">
                    {/* Image */}
                    <div className="w-full overflow-hidden bg-slate-200">
                      {item?.cardImage ? (
                        <img
                          src={item.cardImage}
                          alt={item?.heading || item?.name}
                          className="h-[200px] w-full object-cover md:h-[230px]"
                        />
                      ) : (
                        <div className="h-[200px] w-full md:h-[230px]" />
                      )}
                    </div>

                    {/* Dark card: name + description + explore button */}
                    <div className="flex flex-1 flex-col items-center gap-3 bg-[#1a1a1a] px-5 py-5 text-center">
                      <h3 className="text-[15px] font-semibold uppercase tracking-wide text-white font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[17px]">
                        {item?.heading || item?.name || "Product"}
                      </h3>
                      {(item?.homeCardSubText || item?.subText) ? (
                        <p className="text-[12px] leading-relaxed text-white/75 font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[13px]">
                          {item?.homeCardSubText || item?.subText}
                        </p>
                      ) : null}
                      <div className="mt-auto pt-1">
                        <button
                          type="button"
                          onClick={() => handleProductCardAction(item)}
                          className="rounded-full border border-white/60 px-6 py-2 text-[11px] font-semibold uppercase tracking-widest text-white transition hover:bg-white hover:text-[#1a1a1a] font-['Poppins',ui-sans-serif,system-ui,sans-serif]"
                        >
                          Explore
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* Inclusions section: home-page amenities grid */}
          {Array.isArray(draft?.inclusions) && draft.inclusions.length > 0 ? (
            <InclusionsSection inclusions={draft.inclusions} />
          ) : null}

          {/* Gallery preview section: first six images on home, full gallery on the gallery page. */}
          <section id="gallery" className={SECTION_BLOCK}>
            <div className={CONTENT_WRAP}>
              <LinedHeading title={draft?.galleryTitle || "Gallery"} />
              <div className="mt-6 grid grid-cols-1 gap-[8px] sm:grid-cols-2 md:mt-10 md:grid-cols-3">
                {homeGalleryItems.map((item: string, idx: number) => (
                  <button
                    key={`gallery-${idx}`}
                    type="button"
                    onClick={() => openGalleryViewer(idx)}
                    className="overflow-hidden rounded-lg bg-slate-100 text-left"
                  >
                    <img
                      src={item}
                      alt={`Gallery ${idx + 1}`}
                      className="h-[190px] w-full object-cover transition duration-300 hover:scale-[1.02] md:h-[256px]"
                    />
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-center md:mt-8">
                <button
                  type="button"
                  onClick={() => navigate("/website-preview/page/gallery")}
                  className="rounded-full bg-[#6f6f6f] px-8 py-2 text-xs font-semibold text-white md:px-10 md:text-sm"
                >
                  SHOW MORE
                </button>
              </div>
            </div>
          </section>

          {/* Testimonials preview section: merged draft testimonials and approved public reviews. */}
          <section id="testimonials" className={SECTION_BLOCK}>
            <div className={CONTENT_WRAP}>
              <LinedHeading title={draft?.testimonialTitle || "Testimonials"} />
              <div className="mt-6 grid grid-cols-1 gap-5 md:mt-8 md:grid-cols-3">
                {visibleTestimonials.map((item: any, index: number) => {
                  const testimonialKey = String(item?.key || `home-testimonial-${testimonialIndex}-${index}`);
                  const isExpanded = Boolean(expandedTestimonials[testimonialKey]);
                  const resolvedText = isExpanded
                    ? { text: String(item?.text || "").trim(), truncated: false }
                    : getTrimmedText(item?.text || "");

                  return (
                    <article
                      key={testimonialKey}
                      className="rounded-[24px] px-6 py-7 text-left shadow-[0_14px_40px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex items-center gap-4">
                        {item?.image ? (
                          <img
                            src={item.image}
                            alt={item?.name || "Reviewer"}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#000000] text-sm font-semibold text-white">
                            {getAvatarInitials(item?.name || "Reviewer")}
                          </div>
                        )}
                        <h3 className="text-[18px] font-semibold text-[#111827]">
                          {item?.name || "Reviewer"}
                        </h3>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-[18px] text-black">
                        {Array.from({ length: Math.max(1, Math.min(5, Number(item?.rating || 5) || 5)) }).map(
                          (_, starIndex) => (
                            <span key={`${testimonialKey}-home-star-${starIndex}`}>★</span>
                          ),
                        )}
                      </div>
                      <p className="mt-4 text-[15px] leading-8 text-[#374151]">
                        {resolvedText.text || "Great experience."}
                      </p>
                      {resolvedText.truncated || isExpanded ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTestimonials((prev) => ({
                              ...prev,
                              [testimonialKey]: !isExpanded,
                            }))
                          }
                          className="mt-4 text-[15px] font-medium text-black underline underline-offset-2"
                        >
                          {isExpanded ? "Show less" : "Show more"}
                        </button>
                      ) : null}
                    </article>
                  );
                })}
              </div>
              {testimonialPages > 1 ? (
                <div className="mt-6 flex justify-center gap-2">
                  {Array.from({ length: testimonialPages }).map((_, pageIndex) => (
                    <button
                      key={`home-testimonial-page-${pageIndex}`}
                      type="button"
                      onClick={() => setTestimonialIndex(pageIndex)}
                      aria-label={`Go to testimonial page ${pageIndex + 1}`}
                      className={`h-2.5 rounded-full transition-all ${
                        testimonialIndex === pageIndex ? "w-8 bg-[#111827]" : "w-2.5 bg-slate-300"
                      }`}
                    />
                  ))}
                </div>
              ) : null}
              {showWriteReview ? (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={openReviewModal}
                    className="rounded-full border border-slate-500 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 md:text-sm"
                  >
                    Write a Review
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          {/* Contact summary section: map iframe and shared contact card. */}
          <section id="contact" className={SECTION_BLOCK}>
            <div className={CONTENT_WRAP}>
              <LinedHeading title={draft?.contactTitle || "Contact"} />
            <div className="mt-6 grid grid-cols-1 gap-4 md:mt-8 md:grid-cols-12">
                <div className="md:col-span-7">
                  {draft?.mapUrl ? (
                    <iframe
                      title="map"
                      src={draft.mapUrl}
                      className="h-[220px] w-full border-0 md:h-[420px]"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="h-[220px] w-full bg-slate-300 md:h-[420px]" />
                  )}
                </div>
                <div className="md:col-span-5">
                  {renderContactCard()}
                </div>
              </div>
            </div>
          </section>

          {/* Logo Carousel — optional section after contact */}
          {draft?.logoCarousel?.enabled && Array.isArray(draft.logoCarousel.logos) && draft.logoCarousel.logos.length > 0 ? (
            <LogoCarousel
              logos={draft.logoCarousel.logos.map((item: any) => {
                if (typeof item === "string") return item;
                return item?.url || item?.preview || "";
              }).filter(Boolean)}
              title={draft?.logoCarousel?.title || undefined}
            />
          ) : null}
        </>
      ) : null}

      {/* About page: full narrative blocks and image cards. */}
      {currentSection === "about" ? (
        <section className="bg-black px-4 py-12 text-white md:px-6 md:py-24">
          <div className={`${CONTENT_WRAP} text-center`}>
            <h2 className="text-[24px] font-semibold text-[#f7e53f] font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[32px]">
              About Our Vision
            </h2>
            <div className="mx-auto mt-8 max-w-5xl space-y-4 text-center text-white">
              {aboutIntroBlocks.length ? (
                aboutIntroBlocks.map((item: string, idx: number) => (
                  <p
                    key={`about-page-${idx}`}
                    className="font-['Poppins',ui-sans-serif,system-ui,sans-serif] text-[15px] leading-[1.55] md:text-[20px] md:leading-[1.4]"
                  >
                    {item}
                  </p>
                ))
              ) : (
                <p></p>
              )}
            </div>
            {aboutNarrativeBlocks.length ? (
              <div className="mt-10 grid grid-cols-1 gap-5 md:mt-14 md:grid-cols-2">
                {aboutNarrativeBlocks.map((item) => (
                  <article key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left md:p-6">
                    <h3 className="text-[20px] font-semibold text-[#f7e53f] md:text-[24px]">{item.title}</h3>
                    <p className="mt-3 font-['Poppins',ui-sans-serif,system-ui,sans-serif] text-[14px] leading-[1.6] text-white/90 md:text-[17px]">
                      {item.body}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}

            {founders.length ? (
              <div className="mt-14 space-y-16">
                <h3 className="text-center text-[22px] font-semibold text-[#f7e53f] md:text-[28px]">
                  Our Founders
                </h3>
                {founders.map((founder: any, idx: number) => {
                  const founderImg = typeof founder?.image === "string" ? founder.image : founder?.image?.url || "";
                  const founderHighlights = Array.isArray(founder?.highlights)
                    ? founder.highlights
                    : String(founder?.highlights || "")
                        .split("\n")
                        .map((s: string) => s.trim())
                        .filter(Boolean);
                  return (
                    <div
                      key={`founder-${idx}`}
                      className={`flex flex-col items-stretch md:flex-row ${idx % 2 === 1 ? "md:flex-row-reverse" : ""}`}
                    >
                      {founderImg ? (
                        <div className="w-full md:w-1/2">
                          <img
                            src={founderImg}
                            alt={founder?.name || "Founder"}
                            className="h-full w-full rounded-2xl object-cover"
                          />
                        </div>
                      ) : null}
                      <div className="flex w-full flex-col justify-center md:w-1/2 md:px-8 text-left">
                        <h3 className="text-[22px] font-semibold text-[#f7e53f] md:text-[28px]">
                          {founder.name}
                        </h3>
                        <p className="mt-1 text-[15px] font-medium text-white/70">{founder.role}</p>
                        <p className="mt-3 font-['Poppins',ui-sans-serif,system-ui,sans-serif] text-[14px] leading-[1.7] text-white/85 md:text-[16px]">
                          {founder.bio}
                        </p>
                        {founderHighlights.length ? (
                          <ul className="mt-4 list-inside list-disc space-y-1 text-[14px] font-semibold text-white/75">
                            {founderHighlights.map((h: string, hi: number) => (
                              <li key={`fhi-${hi}`}>{h}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {aboutPageImageCards.length ? (
              <div className="mt-10 md:mt-14">
                {draft?.aboutPageTeamHeading ? (
                  <h3 className="mb-6 text-center text-[22px] font-semibold text-[#f7e53f] md:text-[28px]">
                    {draft.aboutPageTeamHeading}
                  </h3>
                ) : null}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {aboutPageImageCards.map((card: any, idx: number) => (
                    <article key={`about-card-${idx}`} className="overflow-hidden rounded-2xl bg-[#111111] text-white shadow-sm">
                      {card?.image ? (
                        <img src={card.image} alt={card?.title || `About Card ${idx + 1}`} className="h-[350px] w-full object-cover" />
                      ) : (
                        <div className="h-[220px] w-full bg-slate-200" />
                      )}
                      <div className="p-4 text-left">
                        {card?.title ? <h4 className="text-lg font-semibold">{card.title}</h4> : null}
                        {card?.description ? <p className="mt-2 text-sm leading-6 text-white/85">{card.description}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Products page: category detail view or menu-style rendering based on the selected product slug. */}
      {currentSection === "products" ? (
        <>
          {/* -- Product Item Detail Page -- */}
          {selectedDetailItem && selectedProductPage ? (() => {
            const detailTitle = String(selectedDetailItem?.title || selectedDetailItem?.name || selectedDetailItem?.heading || "Product").trim();
            const detailDescription = String(selectedDetailItem?.description || selectedDetailItem?.subText || selectedProductPage?.subText || "").trim();
            const detailImage = getMediaSrc(selectedDetailItem?.images?.[0]) || getMediaSrc(selectedDetailItem?.cardImage) || getMediaSrc(selectedProductPage?.cardImage) || "";
            const detailPrice = String(selectedDetailItem?.price || selectedDetailItem?.cost || "").trim();
            const detailBullets: string[] = (Array.isArray(selectedDetailItem?.features)
              ? selectedDetailItem.features
              : Array.isArray(selectedDetailItem?.amenities)
                ? selectedDetailItem.amenities
                : []
            ).map((f: any) => String(f?.name || f?.label || f?.text || f || "").trim()).filter(Boolean);
            const detailTarget = { ...selectedProductPage, ...selectedDetailItem, name: detailTitle, subText: detailDescription, cardImage: detailImage };
            const leadFields = getLeadFieldsForProduct(selectedProductPage?.slug || selectedProductPage?.name || "");

            return (
              <>
              <section className="bg-[#e9e9e9] px-4 py-10 md:px-6 md:py-12">
                <div className={CONTENT_WRAP}>
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start md:gap-12">
                    {/* Left â€º Image, fixed height */}
                    <div className="w-full">
                      {detailImage ? (
                        <img
                          src={detailImage}
                          alt={detailTitle}
                          className="h-[300px] w-full rounded-2xl object-cover md:h-[520px]"
                        />
                      ) : (
                        <div className="h-[300px] w-full rounded-2xl bg-slate-200 md:h-[520px]" />
                      )}
                    </div>

                    {/* Right â€º fixed same height as image: heading at top, form pinned at bottom, description scrolls in between */}
                    <div className="flex flex-col font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:h-[520px]">
                      {/* Title & Price â€º pinned at top */}
                      <div className="shrink-0">
                        <h1 className="text-[24px] font-bold text-[#111827] font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[32px]">{detailTitle}</h1>
                        {detailPrice ? (
                          <p className="mt-1 text-[15px] font-semibold text-[#374151] font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[17px]">{detailPrice}</p>
                        ) : null}
                      </div>

                      {/* Description + extra bullets â€º scrollable middle zone */}
                      <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">

                      {/* Description as bullet points */}
                      {detailDescription ? (
                        <ul className="space-y-2">
                          {detailDescription
                            .split(/\n|(?<=\.)\s+/)
                            .map((s: string) => s.trim())
                            .filter(Boolean)
                            .map((point: string, i: number) => (
                              <li key={`desc-bullet-${i}`} className="flex items-start gap-2 text-[13px] leading-relaxed text-[#4b5563] font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[14px]">
                                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#6b7280]" />
                                <span>{point}</span>
                              </li>
                            ))}
                        </ul>
                      ) : null}

                      {/* Extra feature bullets */}
                      {detailBullets.length > 0 ? (
                        <ul className="space-y-2 border-t border-slate-300 pt-3">
                          {detailBullets.map((point, i) => (
                            <li key={`detail-bullet-${i}`} className="flex items-start gap-2 text-[13px] text-[#374151] font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[14px]">
                              <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#111827]" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      </div>{/* end scrollable middle zone */}

                      {/* Lead Form â€º pinned at bottom, shrink-0 */}
                      <div className="shrink-0">
                      {leadSubmitted ? (
                        /* -- Success state â€º fills same space as the form -- */
                        <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-5 rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-4xl text-green-600">?</div>
                          <div className="space-y-2">
                            <p className="text-[20px] font-bold text-green-700 font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[24px]">Enquiry Submitted Successfully!</p>
                            <p className="text-[14px] text-green-600 font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[16px]">We'll get back to you shortly.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLeadSubmitted(false);
                              setLeadForm({ fullName: "", people: "", mobile: "", email: "", startDate: "", endDate: "" });
                            }}
                            className="rounded-full border-2 border-green-600 px-7 py-2.5 text-[13px] font-semibold uppercase tracking-wider text-green-700 transition hover:bg-green-600 hover:text-white font-['Poppins',ui-sans-serif,system-ui,sans-serif]"
                          >
                            Submit Another
                          </button>
                        </div>
                      ) : (
                        /* -- Form (with loading overlay while submitting) -- */
                        <div className="relative">
                          {leadSubmitPending ? (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/90 backdrop-blur-[2px]">
                              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#111827]" />
                              <p className="text-[12px] font-medium text-[#374151] font-['Poppins',ui-sans-serif,system-ui,sans-serif]">Submitting...</p>
                            </div>
                          ) : null}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              void submitLeadForm(e);
                            }}
                            className="flex flex-col gap-4 rounded-2xl border border-slate-300 bg-white p-5"
                          >
                            <h2 className="text-[14px] font-semibold uppercase tracking-wider text-[#111827] font-['Poppins',ui-sans-serif,system-ui,sans-serif]">Enquire Now</h2>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {leadFields.map((field) => (
                                <div key={field.key} className="flex flex-col gap-1">
                                  <label className="text-[11px] font-medium uppercase tracking-wide text-[#6b7280] font-['Poppins',ui-sans-serif,system-ui,sans-serif]">
                                    {field.label}{field.required ? <span className="ml-0.5 text-red-500">*</span> : null}
                                  </label>
                                  <input
                                    type={field.type}
                                    required={field.required}
                                    value={(leadForm as any)[field.key] ?? ""}
                                    onChange={(e) =>
                                      setLeadForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                                    }
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-[#111827] outline-none transition font-['Poppins',ui-sans-serif,system-ui,sans-serif] focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
                                  />
                                </div>
                              ))}
                            </div>
                            {leadSubmitError ? (
                              <p className="text-[12px] text-red-500 font-['Poppins',ui-sans-serif,system-ui,sans-serif]">{leadSubmitError}</p>
                            ) : null}
                            <button
                              type="submit"
                              disabled={leadSubmitPending}
                              className="mt-1 w-full rounded-full bg-[#111827] px-6 py-3 text-[13px] font-semibold uppercase tracking-widest text-white transition font-['Poppins',ui-sans-serif,system-ui,sans-serif] hover:bg-[#1f2937] disabled:opacity-60"
                            >
                              Submit Enquiry
                            </button>
                          </form>
                        </div>
                      )}
                      </div>{/* end shrink-0 form wrapper */}
                    </div>
                  </div>
                </div>
              </section>
              {Array.isArray(selectedProductPage?.inclusions) && selectedProductPage.inclusions.length > 0 ? (
                <InclusionsSection inclusions={selectedProductPage.inclusions} title={`${String(selectedProductPage?.heading || selectedProductPage?.name || "Product").trim()} Inclusions`} />
              ) : null}
              <FaqAccordion faqs={Array.isArray(draft?.faqs) ? draft.faqs : []} />
              </>
            );
          })() : null}

          {/* -- Product Page: hero + product grid (shown when no item selected) -- */}
          {!selectedDetailItem && selectedProductPage ? (
            <>
              {/* Full-bleed hero â€º stretches edge to edge, no side or top margins */}
              <section
                className="relative h-[62svh] min-h-[450px] overflow-hidden bg-[#1f1f1f] md:h-[84vh] md:min-h-[550px]"
              >
                {selectedProductHeroImage ? (
                  <img
                    src={selectedProductHeroImage}
                    alt={selectedProductPage?.name || "Product Hero"}
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                  />
                ) : null}

                <div className="absolute inset-0 flex items-end justify-center px-4 pb-10 text-center text-white md:pb-16">
                  <div>
                    <h1 className="text-[26px] font-bold md:text-4xl">
                      {selectedProductPage?.heroHeading || selectedProductPage?.name || "Product"}
                    </h1>
                    {selectedProductPage?.heroSubHeading ? (
                      <p className="mt-2 text-[13px] leading-relaxed md:mt-3 md:text-lg">{selectedProductPage.heroSubHeading}</p>
                    ) : null}
                    {selectedProductPage?.heroButtonText ? (
                      <button type="button" className={`${IMAGE_ACTION_BUTTON} mt-4 px-5 text-[10px] tracking-[0.18em] md:mt-6 md:px-6 md:text-sm`}>
                        {String(selectedProductPage.heroButtonText).toUpperCase()}
                      </button>
                    ) : null}
                  </div>
                </div>

                {selectedProductPage?.heroMode === "carousel" && selectedProductHeroImages.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setProductHeroIndex((prev) =>
                          (prev - 1 + selectedProductHeroImages.length) % selectedProductHeroImages.length,
                        )
                      }
                      className="absolute left-5 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/45 px-4 py-2 text-2xl text-white md:block"
                    >
                      {"<"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setProductHeroIndex((prev) => (prev + 1) % selectedProductHeroImages.length)
                      }
                      className="absolute right-5 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/45 px-4 py-2 text-2xl text-white md:block"
                    >
                      {">"}
                    </button>
                  </>
                ) : null}
              </section>

              {/* Our Products content below the hero */}
              <section className="px-4 pb-8 pt-8 md:px-6 md:pb-12 md:pt-10">
                <div className={CONTENT_WRAP}>
                {isMenuProductSlug(selectedProductPage?.slug || "") ? (
                  <>
                    <LinedHeading title="Our Products" />
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-8 md:grid-cols-3">
                      {menuItems.map((item: any, idx: number) => (
                        <article key={`menu-${idx}`} className="flex flex-col items-center">
                          <h3 className="mb-3 text-base font-medium md:text-xl">{item?.category || item?.name || `Item ${idx + 1}`}</h3>
                          <div className="relative w-full overflow-hidden rounded-2xl bg-slate-200">
                            {item?.image ? (
                              <img
                                src={item.image}
                                alt={item?.name || `Menu Item ${idx + 1}`}
                                className="h-[220px] w-full object-cover md:h-[300px]"
                              />
                            ) : (
                              <div className="h-[220px] w-full bg-slate-200 md:h-[300px]" />
                            )}
                            <div className="absolute inset-0 bg-black/35" />
                            <div className="absolute inset-x-0 bottom-0 p-4 text-left text-white md:p-5">
                              <p className="text-[16px] font-semibold md:text-[18px]">{item?.name || `Item ${idx + 1}`}</p>
                              {item?.price ? <p className="mt-1 text-[14px] font-semibold md:text-[16px]">{item.price}</p> : null}
                              {item?.description ? (
                                <p className="mt-2 max-w-[90%] text-[12px] leading-5 text-white/95 md:text-[15px] md:leading-6">
                                  {item.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <LinedHeading title="Our Products" />
                    <div className="mt-6 grid grid-cols-1 gap-6 md:mt-8 md:grid-cols-3 md:gap-7">
                      {(selectedProductContentItems.length ? selectedProductContentItems : [selectedProductPage]).map(
                        (item: any, idx: number) => {
                          const isContentItem = selectedProductContentItems.length > 0;
                          const detailImage = isContentItem
                            ? (getMediaSrc(item?.images?.[0]) || getMediaSrc(item?.cardImage) || "")
                            : (getMediaSrc(item?.cardImage) || getMediaSrc(item?.heroImage) || "");
                          const detailTitle =
                            item?.title ||
                            item?.name ||
                            item?.heading ||
                            selectedProductPage?.heading ||
                            selectedProductPage?.name ||
                            "Product";
                          const detailDescription =
                            item?.description || item?.subText || (isContentItem ? "" : selectedProductPage?.subText) || "";

                          return (
                            <article key={`product-detail-${idx}`} className="flex flex-col overflow-hidden rounded-2xl shadow-md">
                              {/* Image */}
                              <div className="w-full overflow-hidden bg-slate-200">
                                {detailImage ? (
                                  <img
                                    src={detailImage}
                                    alt={detailTitle}
                                    className="h-[200px] w-full object-cover md:h-[230px]"
                                  />
                                ) : (
                                  <div className="h-[200px] w-full md:h-[230px]" />
                                )}
                              </div>
                              {/* Dark card */}
                              <div className="flex flex-1 flex-col items-center gap-3 bg-[#1a1a1a] px-5 py-5 text-center">
                                <h3 className="text-[15px] font-semibold uppercase tracking-wide text-white font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[17px]">
                                  {detailTitle}
                                </h3>
                                {detailDescription ? (
                                  <p className="text-[12px] leading-relaxed text-white/75 font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[13px]">
                                    {detailDescription}
                                  </p>
                                ) : null}
                                <div className="mt-auto pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const itemSlug = normalizeSlug(item?.title || item?.name || item?.heading || `item-${idx}`);
                                      const productSlug = normalizeSlug(selectedProductPage?.slug || selectedProductPage?.name || "");
                                      navigate(`/website-preview/page/products/${productSlug}/${itemSlug}`);
                                    }}
                                    className="rounded-full border border-white/60 px-6 py-2 text-[11px] font-semibold uppercase tracking-widest text-white transition hover:bg-white hover:text-[#1a1a1a] font-['Poppins',ui-sans-serif,system-ui,sans-serif]"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        },
                      )}
                    </div>
                  </>
                )}
                </div>
              </section>
              {Array.isArray(selectedProductPage?.inclusions) && selectedProductPage.inclusions.length > 0 ? (
                <InclusionsSection inclusions={selectedProductPage.inclusions} title={`${String(selectedProductPage?.heading || selectedProductPage?.name || "Product").trim()} Inclusions`} />
              ) : null}
              <FaqAccordion faqs={Array.isArray(draft?.faqs) ? draft.faqs : []} />
            </>
            ) : !selectedDetailItem ? (
              <section className={SECTION_BLOCK}>
                <div className={CONTENT_WRAP}>
                  <LinedHeading title="Our Products" />
                  <div className="mt-6 grid grid-cols-1 gap-6 md:mt-10 md:grid-cols-3 md:gap-7">
                    {productPages.map((item: any, idx: number) => (
                      <article key={`product-page-${idx}`} className="flex flex-col overflow-hidden rounded-2xl shadow-md">
                        {/* Image */}
                        <div className="w-full overflow-hidden bg-slate-200">
                          {item?.cardImage ? (
                            <img src={item.cardImage} alt={item?.heading || item?.name} className="h-[200px] w-full object-cover md:h-[230px]" />
                          ) : (
                            <div className="h-[200px] w-full md:h-[230px]" />
                          )}
                        </div>
                        {/* Dark card */}
                        <div className="flex flex-1 flex-col items-center gap-3 bg-[#1a1a1a] px-5 py-5 text-center">
                          <h3 className="text-[15px] font-semibold uppercase tracking-wide text-white font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[17px]">
                            {item?.heading || item?.name || "Product"}
                          </h3>
                          {(item?.homeCardSubText || item?.subText) ? (
                            <p className="text-[12px] leading-relaxed text-white/75 font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[13px]">
                              {item?.homeCardSubText || item?.subText}
                            </p>
                          ) : null}
                          <div className="mt-auto pt-1">
                            <button
                              type="button"
                              onClick={() => handleProductCardAction(item)}
                              className="rounded-full border border-white/60 px-6 py-2 text-[11px] font-semibold uppercase tracking-widest text-white transition hover:bg-white hover:text-[#1a1a1a] font-['Poppins',ui-sans-serif,system-ui,sans-serif]"
                            >
                              Explore
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
        </>
      ) : null}

      {/* Gallery page: full gallery grid for browsing every uploaded image. */}
      {currentSection === "gallery" ? (
        <section className={SECTION_BLOCK}>
          <div className={CONTENT_WRAP}>
            <LinedHeading title={draft?.galleryTitle || "Gallery"} />
              <div className="mt-6 grid grid-cols-1 gap-[8px] sm:grid-cols-2 md:mt-10 md:grid-cols-3">
              {galleryItems.map((item: string, idx: number) => (
                <button
                  key={`gallery-page-${idx}`}
                  type="button"
                  onClick={() => openGalleryViewer(idx)}
                  className="overflow-hidden rounded-lg bg-slate-100 text-left"
                >
                  <img
                    src={item}
                    alt={`Gallery ${idx + 1}`}
                    className="h-[190px] w-full object-cover transition duration-300 hover:scale-[1.02] md:h-[256px]"
                  />
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Testimonials page: full approved + draft testimonial list with pagination. */}
      {currentSection === "testimonials" ? (
        <section className={SECTION_BLOCK}>
          <div className={CONTENT_WRAP}>
            <LinedHeading title={draft?.testimonialTitle || "Testimonials"} />
            <div className="mt-6 grid grid-cols-1 gap-5 md:mt-8 md:grid-cols-3">
              {visibleTestimonials.map((item: any, index: number) => {
                const testimonialKey = String(item?.key || `testimonial-${testimonialIndex}-${index}`);
                const isExpanded = Boolean(expandedTestimonials[testimonialKey]);
                const resolvedText = isExpanded
                  ? { text: String(item?.text || "").trim(), truncated: false }
                  : getTrimmedText(item?.text || "");
                const initials = getAvatarInitials(item?.name || "Reviewer");

                return (
                  <article
                    key={testimonialKey}
                    className="rounded-[24px] px-6 py-7 text-left shadow-[0_14px_40px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex items-center gap-4">
                      {item?.image ? (
                        <img
                          src={item.image}
                          alt={item?.name || "Reviewer"}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#000000] text-sm font-semibold text-white">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h3 className="text-[18px] font-semibold text-[#111827]">
                          {item?.name || "Reviewer"}
                        </h3>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[18px] text-black">
                      {Array.from({ length: Math.max(1, Math.min(5, Number(item?.rating || 5) || 5)) }).map(
                        (_, starIndex) => (
                          <span key={`${testimonialKey}-star-${starIndex}`}>★</span>
                        ),
                      )}
                    </div>
                    <p className="mt-4 text-[15px] leading-8 text-[#374151]">
                      {resolvedText.text || "Great experience."}
                    </p>
                    {resolvedText.truncated || isExpanded ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTestimonials((prev) => ({
                            ...prev,
                            [testimonialKey]: !isExpanded,
                          }))
                        }
                        className="mt-4 text-[15px] font-medium text-black underline underline-offset-2"
                      >
                        {isExpanded ? "Show less" : "Show more"}
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
            {testimonialPages > 1 ? (
              <div className="mt-6 flex justify-center gap-2">
                {Array.from({ length: testimonialPages }).map((_, pageIndex) => (
                  <button
                    key={`testimonial-page-${pageIndex}`}
                    type="button"
                    onClick={() => setTestimonialIndex(pageIndex)}
                    aria-label={`Go to testimonial page ${pageIndex + 1}`}
                    className={`h-2.5 rounded-full transition-all ${
                      testimonialIndex === pageIndex ? "w-8 bg-[#111827]" : "w-2.5 bg-slate-300"
                    }`}
                  />
                ))}
              </div>
            ) : null}
            {showWriteReview ? (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={openReviewModal}
                  className="rounded-full border border-slate-500 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 md:text-sm"
                >
                  Write a Review
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Partner page: heading, content on left, inquiry form on right. */}
      {currentSection === "partner" ? (
        <section className={SECTION_BLOCK}>
          <div className={CONTENT_WRAP}>
            <LinedHeading title={partnerPageHeading || "Become A Partner"} />
            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="font-['Poppins',ui-sans-serif,system-ui,sans-serif] text-[15px] leading-[1.7] text-[#374151] md:text-[17px]">
                {partnerPageContent ? (
                  partnerPageContent.split("\n").map((para: string, i: number) => (
                    <p key={`partner-para-${i}`} className="mb-4 last:mb-0">{para}</p>
                  ))
                ) : (
                  <p className="text-slate-400">Partner content coming soon.</p>
                )}
              </div>
              <div className="rounded-2xl bg-[#f8f8f8] p-6 shadow-sm md:p-8">
                <h3 className="text-center text-[18px] font-semibold text-[#111827] md:text-[20px]">
                  {partnerFormTitle || `Partner With ${draft?.companyName || "Us"}`}
                </h3>
                <div className="mt-6 space-y-4">
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={partnerForm.name}
                    onChange={(e) => setPartnerForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-[14px] outline-none focus:border-black"
                  />
                  <input
                    type="email"
                    placeholder="Your Email"
                    value={partnerForm.email}
                    onChange={(e) => setPartnerForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-[14px] outline-none focus:border-black"
                  />
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    value={partnerForm.mobile}
                    onChange={(e) => setPartnerForm((p) => ({ ...p, mobile: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-[14px] outline-none focus:border-black"
                  />
                  <textarea
                    rows={4}
                    placeholder="Your Message"
                    value={partnerForm.message}
                    onChange={(e) => setPartnerForm((p) => ({ ...p, message: e.target.value }))}
                    className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-[14px] outline-none focus:border-black"
                  />
                  <button
                    type="button"
                    disabled={partnerSubmitPending}
                    className="w-full rounded-full bg-black px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-60"
                  >
                    {partnerSubmitPending ? "Submitting..." : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Contact page: embedded map and the detailed contact card. */}
      {currentSection === "contact" ? (
        <section className="px-4 py-10 md:px-6 md:py-12">
          <div className={CONTENT_WRAP}>
            <LinedHeading title={draft?.contactTitle || "Contact"} />
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-7">
                {draft?.mapUrl ? (
                  <iframe
                    title="map"
                    src={draft.mapUrl}
                    className="h-[260px] w-full border-0 md:h-[420px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="h-[260px] w-full bg-slate-300 md:h-[420px]" />
                )}
              </div>
              <div className="md:col-span-5">
                {renderContactCard()}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Shared footer: shown on every section so hosted and local preview stay consistent. */}
      <footer className={`mt- border-t border-slate-300 bg-[#ffffff] ${FOOTER_TEXT}`}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 text-center md:grid-cols-3 md:text-left">
          <div>
            {draft?.companyLogo ? (
              <img
                src={draft.companyLogo}
                alt={draft.companyName || "Company"}
                className="mx-auto h-10 w-auto object-contain md:mx-0 md:h-12"
              />
            ) : null}
            {footerCompanyName ? (
              <p className="mt-2 text-[15px] font-semibold text-[#111827] md:text-[14px]">{footerCompanyName}</p>
            ) : null}
            {footerAddress ? <p className={FOOTER_BODY_TEXT}>{footerAddress}</p> : null}
          </div>
          <div>
            <h3 className={`${FOOTER_HEADING} md:ml-[130px]`}>Quick Links</h3>
            <div className={`${FOOTER_BODY_TEXT} md:ml-[130px]`}>
              {navItems.map((item) => (
                <button
                  key={`footer-${item.slug}`}
                  type="button"
                  onClick={() => goToSection(item.slug)}
                  className="block w-full md:w-auto"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className={FOOTER_HEADING}>Contact Us</h3>
            <div className={FOOTER_BODY_TEXT}>
              {draft?.phone ? <p>{draft.phone}</p> : null}
              {draft?.email ? <p>{draft.email}</p> : null}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-300 px-6 py-3 text-center text-sm leading-relaxed text-[#374151]">
          {footerCopyrightText ? footerCopyrightText : null}
        </div>
      </footer>

      {/* Shared overlays: review form, lead form, success toast, and gallery viewer. */}
      {reviewModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-xl rounded-[24px] bg-white p-5 shadow-xl md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[24px] font-semibold text-slate-900">Write a Review</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Your review will appear in the Website Builder reviews page for approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-2xl text-slate-700 shadow-sm"
                aria-label="Close review form"
              >
                â€º
              </button>
            </div>

            <form onSubmit={submitReviewForm} className="mt-6 grid grid-cols-1 gap-4">
                <input
                  type="text"
                  className="border-b border-slate-300 px-3 py-3 text-sm outline-none placeholder:text-slate-500 md:text-base"
                  placeholder="Full Name"
                  value={reviewForm.reviewerName}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, reviewerName: e.target.value }))}
                  required
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none md:text-base"
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: e.target.value }))}
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={String(rating)}>
                      {rating} Star{rating > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
                <textarea
                  className="min-h-[130px] rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none placeholder:text-slate-500 md:text-base"
                  placeholder="Write your review"
                  value={reviewForm.review}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, review: e.target.value }))}
                  required
                />
                {reviewSubmitError ? (
                  <p className="text-sm text-red-600">{reviewSubmitError}</p>
                ) : null}
                <div className="pt-2 text-center">
                  <button
                    type="submit"
                    disabled={reviewSubmitPending}
                    className="rounded-full bg-[#6f6f6f] px-8 py-2 text-sm font-semibold text-white"
                  >
                    {reviewSubmitPending ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              </form>
          </div>
        </div>
      ) : null}

      {/* Lead modal popup â€º commented out: enquiry is now handled inline on the product detail page */}
      {/* {selectedLeadProduct ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-3 md:p-4"
          onClick={closeLeadModal}
        >
          <div className="flex min-h-full items-start justify-center py-4 md:items-center md:py-6">
            <div
              className="relative w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeLeadModal}
                className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-2xl text-slate-700 shadow-sm"
                aria-label="Close lead form"
              >
                â€º
              </button>
              <div className="relative grid w-full grid-cols-1 gap-6 rounded-xl bg-white p-4 md:grid-cols-2">
                <div className="relative overflow-hidden rounded-xl bg-slate-100 md:min-h-[520px]">
                  {selectedLeadProduct?.cardImage ? (
                    <img src={selectedLeadProduct.cardImage} alt={selectedLeadProduct?.name || "Product"} className="h-[260px] w-full object-cover sm:h-[320px] md:h-full" />
                  ) : (
                    <div className="h-[260px] w-full sm:h-[320px] md:h-full" />
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:flex md:min-h-[520px] md:flex-col md:justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase text-slate-900">{selectedLeadProduct?.name || "Product"}</h3>
                    <p className="mt-2 text-base font-semibold text-secondary-dark">{getLeadMetaForProduct(selectedLeadProduct).priceLine}</p>
                    <p className="mt-4 border-b border-slate-200 pb-6 text-sm leading-8 text-gray-700">{getLeadMetaForProduct(selectedLeadProduct).description}</p>
                    <h4 className="mt-6 text-xl text-center font-bold uppercase text-slate-900">{getLeadMetaForProduct(selectedLeadProduct).label}</h4>
                    <form onSubmit={submitLeadForm} className="mt-4 grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
                      {getLeadFieldsForProduct(selectedLeadProduct?.slug || "").map((field) => (
                        <input key={field.key} type={field.type} className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-700 outline-none placeholder:font-['Poppins',ui-sans-serif,system-ui,sans-serif] placeholder:text-gray-400 focus:border-slate-500" placeholder={field.label} value={(leadForm as any)[field.key] || ""} onChange={(e) => setLeadForm((prev) => ({ ...prev, [field.key]: e.target.value }))} required={field.required} />
                      ))}
                      {leadSubmitError ? <p className="lg:col-span-2 text-sm text-red-600">{leadSubmitError}</p> : null}
                      <div className="pt-2 text-center lg:col-span-2">
                        <button type="submit" disabled={leadSubmitPending} className="rounded-full bg-[#6f6f6f] px-8 py-3 text-sm font-semibold text-white">
                          {leadSubmitPending ? "SUBMITTING..." : "GET QUOTE"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null} */}

      {successPopup.open ? (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-[70] flex justify-center px-4">
          <div className="rounded-2xl border border-green-200 bg-white px-6 py-4 text-center shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
            <p className="text-sm font-semibold text-green-700 md:text-base">
              {successPopup.message}
            </p>
          </div>
        </div>
      ) : null}

      {galleryViewerOpen && galleryItems.length ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-2 py-4 backdrop-blur-sm md:px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery viewer"
          onClick={closeGalleryViewer}
        >
          <div
            className="relative flex w-full max-w-[1320px] flex-col gap-3 overflow-hidden rounded-[18px] bg-white p-2 shadow-[0_20px_80px_rgba(15,23,42,0.35)] md:max-h-[88vh] md:p-3 lg:flex-row"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeGalleryViewer}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-2xl leading-none text-slate-700 shadow-sm hover:bg-white"
              aria-label="Close gallery viewer"
            >
              â€º
            </button>

            <div className="relative flex min-h-0 flex-1 items-center justify-center rounded-[14px] bg-slate-100 px-2 py-2 md:px-3 md:py-3">
              {selectedGalleryImage ? (
                <img
                  src={selectedGalleryImage}
                  alt={`Gallery ${galleryViewerIndex + 1}`}
                  className="h-[70vh] w-full rounded-[12px] object-cover"
                />
              ) : null}

              {galleryItems.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => goToGalleryIndex(galleryViewerIndex - 1)}
                    className="absolute left-6 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/55 px-4 py-2 text-2xl text-white shadow-lg transition hover:bg-black/70 md:block"
                    aria-label="Previous gallery image"
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToGalleryIndex(galleryViewerIndex + 1)}
                    className="absolute right-6 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/55 px-4 py-2 text-2xl text-white shadow-lg transition hover:bg-black/70 md:block"
                    aria-label="Next gallery image"
                  >
                    {">"}
                  </button>
                </>
              ) : null}
            </div>

            <div className="w-full shrink-0 lg:w-[240px]">
              <div className="grid max-h-[24vh] grid-cols-3 gap-2 overflow-y-auto rounded-[14px] bg-white p-1 lg:max-h-[78vh] lg:grid-cols-1">
                {galleryItems.map((item: string, idx: number) => {
                  const isActive = idx === galleryViewerIndex;
                  return (
                    <button
                      key={`gallery-thumb-${idx}`}
                      type="button"
                      onClick={() => goToGalleryIndex(idx)}
                      className={`overflow-hidden rounded-[10px] border-2 text-left transition ${
                        isActive ? "border-blue-600" : "border-transparent hover:border-slate-300"
                      }`}
                      aria-label={`Open gallery image ${idx + 1}`}
                    >
                      <img
                        src={item}
                        alt={`Gallery thumbnail ${idx + 1}`}
                        className="h-24 w-full object-cover lg:h-28"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PageDemo;