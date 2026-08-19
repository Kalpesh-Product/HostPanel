import React from "react";

// Shared master list of all possible inclusions (home + product pages),
// keyed the same way CreateWebsite.tsx's inclusion checkboxes save them:
// {key, enabled}. Icons are inline SVGs at 40x40 viewBox, stroke-based, no
// fill — mirrors ClassicTemplate.tsx's own copy so every template shows the
// same icon for the same key. Classic keeps its own inline copy (it must stay
// byte-for-byte identical to what previously shipped) rather than importing
// this — this module is for templates built after it.
export const ALL_INCLUSIONS: Array<{
  key: string;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    key: "workspace",
    label: "Workspace",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="10" width="28" height="18" rx="2" />
        <path d="M14 28v4M26 28v4M10 32h20" />
        <rect x="12" y="15" width="8" height="6" rx="1" />
      </svg>
    ),
  },
  {
    key: "living-space",
    label: "Living Space",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="18" width="28" height="14" rx="2" />
        <path d="M10 18v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" />
        <path d="M6 26h28M12 32v2M28 32v2" />
      </svg>
    ),
  },
  {
    key: "air-condition",
    label: "Air Condition",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="10" width="28" height="12" rx="2" />
        <path d="M14 28c0-2 2-4 6-4s6 2 6 4M20 22v4" />
        <circle cx="20" cy="16" r="2" />
      </svg>
    ),
  },
  {
    key: "fast-internet",
    label: "Fast Internet",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="10" width="28" height="18" rx="2" />
        <path d="M10 18h4M10 22h6M26 18h4M6 28h28" />
        <circle cx="20" cy="19" r="3" />
        <path d="M14 13h12" />
      </svg>
    ),
  },
  {
    key: "cafe-dining",
    label: "Cafe / Dining",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 12h6v8a3 3 0 0 1-6 0v-8z" />
        <path d="M16 16h2a2 2 0 0 1 0 4h-2" />
        <path d="M26 12v8M24 20a4 4 0 0 0 4 4M13 28v4M27 28v4M10 32h20" />
      </svg>
    ),
  },
  {
    key: "receptionist",
    label: "Receptionist",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="20" cy="12" r="5" />
        <path d="M10 32c0-6 4-10 10-10s10 4 10 10" />
        <path d="M8 28h24" />
      </svg>
    ),
  },
  {
    key: "meeting-rooms",
    label: "Meeting Rooms",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="12" width="28" height="18" rx="2" />
        <path d="M14 21h12M14 25h8" />
        <circle cx="12" cy="8" r="2" />
        <circle cx="20" cy="8" r="2" />
        <circle cx="28" cy="8" r="2" />
      </svg>
    ),
  },
  {
    key: "training-rooms",
    label: "Training Rooms",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="10" width="28" height="20" rx="2" />
        <path d="M6 18h28M14 18v12M20 14h6" />
      </svg>
    ),
  },
  {
    key: "it-support",
    label: "IT Support",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="8" width="24" height="18" rx="2" />
        <path d="M14 26v4M26 26v4M10 30h20" />
        <path d="M16 17l3 3 5-6" />
      </svg>
    ),
  },
  {
    key: "tea-coffee",
    label: "Tea & Coffee",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 14h16v12a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V14z" />
        <path d="M26 16h2a3 3 0 0 1 0 6h-2" />
        <path d="M14 10c0-2 2-2 2-4M19 10c0-2 2-2 2-4" />
      </svg>
    ),
  },
  {
    key: "assist",
    label: "Assist",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="20" cy="12" r="5" />
        <path d="M10 32c0-5 4-9 10-9s10 4 10 9" />
        <path d="M20 21v5M17 26h6" />
      </svg>
    ),
  },
  {
    key: "community",
    label: "Community",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="14" cy="14" r="4" />
        <circle cx="26" cy="14" r="4" />
        <path d="M6 32c0-4 3-7 8-7M26 25c5 0 8 3 8 7M16 32c0-4 2-6 4-6s4 2 4 6" />
      </svg>
    ),
  },
  {
    key: "on-demand",
    label: "On Demand",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="20" cy="20" r="12" />
        <path d="M16 15l10 5-10 5V15z" />
      </svg>
    ),
  },
  {
    key: "maintenance",
    label: "Maintenance",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M28 12a6 6 0 0 0-8.5 8.5L8 32l4 4 11.5-11.5A6 6 0 0 0 28 12z" />
        <path d="M26 10l4 4" />
      </svg>
    ),
  },
  {
    key: "generator",
    label: "Generator",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="14" width="28" height="16" rx="2" />
        <path d="M14 14v-4M26 14v-4M20 18v8M16 22h8" />
      </svg>
    ),
  },
  {
    key: "pickup-drop",
    label: "Pickup & Drop",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="18" width="32" height="12" rx="2" />
        <path d="M8 18l4-8h16l4 8" />
        <circle cx="11" cy="30" r="3" />
        <circle cx="29" cy="30" r="3" />
      </svg>
    ),
  },
  {
    key: "car-bike-bus",
    label: "Car / Bike / Bus",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22h28M10 22l3-8h14l3 8" />
        <circle cx="13" cy="26" r="3" />
        <circle cx="27" cy="26" r="3" />
        <path d="M34 22v4" />
      </svg>
    ),
  },
  {
    key: "housekeeping",
    label: "Housekeeping",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 32V20l8-10 8 10v12" />
        <path d="M16 32v-8h8v8" />
        <path d="M8 20h24" />
      </svg>
    ),
  },
  {
    key: "swimming-pool",
    label: "Swimming Pool",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22c2 0 3-2 6-2s4 2 6 2 3-2 6-2 4 2 6 2" />
        <path d="M6 28c2 0 3-2 6-2s4 2 6 2 3-2 6-2 4 2 6 2" />
        <path d="M20 8v10M16 12l4-4 4 4" />
      </svg>
    ),
  },
  {
    key: "television",
    label: "Television",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="10" width="28" height="18" rx="2" />
        <path d="M14 28v4M26 28v4M10 32h20" />
        <path d="M14 14h4M14 19h8" />
      </svg>
    ),
  },
  {
    key: "gas",
    label: "Gas",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8h8v6a8 8 0 0 1-8 0V8z" />
        <path d="M14 14a8 8 0 0 0 12 0" />
        <path d="M12 32V22a8 8 0 0 1 16 0v10" />
        <path d="M10 32h20" />
      </svg>
    ),
  },
  {
    key: "laundry",
    label: "Laundry",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="8" width="24" height="26" rx="2" />
        <circle cx="20" cy="24" r="6" />
        <path d="M12 14h4" />
        <circle cx="18" cy="14" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: "secure",
    label: "Secure",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6l12 5v10c0 7-5 12-12 14C13 33 8 28 8 21V11l12-5z" />
        <path d="M15 20l4 4 6-7" />
      </svg>
    ),
  },
  {
    key: "personalised",
    label: "Personalised",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M28 12l-4 4-8-8-6 6 8 8-4 4 12 4-8-18z" />
      </svg>
    ),
  },
  {
    key: "electricity",
    label: "Electricity",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 6l-8 16h8l-4 12 10-18h-8L22 6z" />
      </svg>
    ),
  },
  {
    key: "ups",
    label: "UPS",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="14" width="24" height="16" rx="2" />
        <path d="M14 14v-4M26 14v-4M16 22h8M20 20v4" />
      </svg>
    ),
  },
  {
    key: "events",
    label: "Events",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 18c4-8 20-8 24 0M12 26c3-6 13-6 16 0M16 32c1-3 7-3 8 0" />
      </svg>
    ),
  },
  {
    key: "furnished-office",
    label: "Furnished Office",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="10" width="28" height="18" rx="2" />
        <path d="M14 28v4M26 28v4M10 32h20M14 19h12M14 23h8" />
      </svg>
    ),
  },
  {
    key: "cafeteria",
    label: "Cafeteria",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="14" width="24" height="16" rx="2" />
        <path d="M14 14v-4M26 14v-4M8 22h24M16 22v8M24 22v8" />
      </svg>
    ),
  },
  {
    key: "high-speed-internet",
    label: "High Speed Internet",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 20a20 20 0 0 1 28 0M10 24a14 14 0 0 1 20 0M14 28a8 8 0 0 1 12 0" />
        <circle cx="20" cy="32" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: "assistance",
    label: "Assistance",
    icon: (
      <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="20" cy="12" r="5" />
        <path d="M10 32c0-5 4-9 10-9s10 4 10 9" />
        <path d="M16 26l4 2 4-2" />
      </svg>
    ),
  },
];

export const INCLUSION_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  ALL_INCLUSIONS.map((item) => [item.key, item.label]),
);

export const getInclusionMeta = (item: any) => {
  const key = String(item?.key || "").trim();
  const match = ALL_INCLUSIONS.find((i) => i.key === key);
  return {
    label: String(item?.label || "").trim() || match?.label || key.replace(/[-_]+/g, " "),
    icon: match?.icon || null,
  };
};
