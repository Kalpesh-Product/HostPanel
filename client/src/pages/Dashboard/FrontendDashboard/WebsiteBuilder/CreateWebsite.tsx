// @ts-nocheck
import React, { useRef, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import {
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from "@mui/material";
import PageFrame from "../../../../components/Pages/PageFrame";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import UploadMultipleFilesInput from "../../../../components/UploadMultipleFilesInput";
import UploadFileInput from "../../../../components/UploadFileInput";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import useAuth from "../../../../hooks/useAuth";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  VERTICAL_CONFIG,
  VERTICAL_KEYS,
  VERTICAL_KEY_TO_LABEL,
  type VerticalType,
} from "../../../../constants/verticalConfig";
import SectionPreviewInfo from "./SectionPreviewInfo";
import CreditsIndicator from "../../../../components/CreditsIndicator";
import RoomsSection from "./RoomsSection";
import PackagesSection from "./PackagesSection";
import DormsSection from "./DormsSection";
import MenuSection from "./MenuSection";
import Skeleton from "../../../../components/ui/Skeleton";

const defaultProduct = {
  type: "",
  name: "",
  cost: "",
  description: "",
};

const defaultTestimonial = {
  name: "",
  jobPosition: "",
  testimony: "",
  rating: 5,
};

const WebsiteBuilderEditorSkeleton = () => {
  const fieldWidths = ["w-full", "w-5/6", "w-full", "w-3/4"];

  return (
    <div
      className="min-w-0 overflow-x-hidden pb-2"
      role="status"
      aria-label="Loading website builder"
      aria-busy="true"
    >
      <div className="flex min-w-0 flex-col gap-4 p-4">
        <PageFrame>
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Skeleton className="h-7 w-44" />
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>

            <div className="min-w-0 overflow-hidden">
              <div className="border-b-default border-borderGray py-4">
                <Skeleton className="h-5 w-36" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm sm:grid-cols-4 lg:grid-cols-7">
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 w-full rounded-xl" />
                ))}
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, sectionIndex) => (
                <div key={sectionIndex} className="min-w-0">
                  <div className="border-b-default border-borderGray py-4">
                    <Skeleton
                      className={`h-5 ${sectionIndex % 2 === 0 ? "w-36" : "w-44"}`}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 p-4">
                    {fieldWidths
                      .slice(0, sectionIndex < 2 ? 4 : 3)
                      .map((width, fieldIndex) => (
                        <Skeleton
                          key={fieldIndex}
                          className={`h-10 ${width} rounded-lg`}
                        />
                      ))}
                    {sectionIndex === 0 ? (
                      <Skeleton className="h-24 w-full rounded-xl" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <Skeleton className="h-6 w-52 rounded-full" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-28 rounded-xl" />
              ))}
            </div>
          </div>
        </PageFrame>
      </div>
      <span className="sr-only">Loading website builder</span>
    </div>
  );
};

const DEFAULT_PAGE_NAV_ITEMS = [
  "Home",
  "About Us",
  "Products",
  "Gallery",
  "Partner",
  "Careers",
  "Contact Us",
];

// Migrates legacy "Testimonials" nav items to "Partner" for existing websites
// and ensures "Careers" is present after "Partner"
const migrateNavItems = (items: any[]): any[] => {
  const migrated = items.map((item: any) => {
    const slug = String(item?.slug || "").trim().toLowerCase();
    const name = String(item?.name || "").trim().toLowerCase();
    if (slug === "testimonials" || name === "testimonials") {
      return { ...item, name: "Partner", slug: "partner" };
    }
    return item;
  });
  // Ensure "Careers" is present after the Partner entry
  const hasCareers = migrated.some(
    (item) =>
      String(item?.slug || "").trim().toLowerCase() === "careers" ||
      String(item?.name || "").trim().toLowerCase() === "careers",
  );
  if (!hasCareers) {
    const partnerIndex = migrated.findIndex(
      (item) =>
        String(item?.slug || "").trim().toLowerCase() === "partner" ||
        String(item?.name || "").trim().toLowerCase() === "partner",
    );
    if (partnerIndex >= 0) {
      migrated.splice(partnerIndex + 1, 0, {
        name: "Careers",
        slug: "careers",
        enabled: true,
      });
    } else {
      migrated.push({ name: "Careers", slug: "careers", enabled: true });
    }
  }
  return migrated;
};

const DEFAULT_PRODUCT_DROPDOWN_PAGES = [
  "Co-Working",
  "Cafe",
  "Meeting Rooms",
  "Hostels",
  "Co-Living",
  "Workations",
];

const CAREERS_FORM_FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Select" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
];

const CAREERS_DEFAULT_FORM_FIELDS = [
  { label: "Name", fixed: true },
  { label: "Email", fixed: true },
  { label: "DOB", fixed: true },
  { label: "Mobile", fixed: true },
  { label: "Country", fixed: true },
  { label: "State", fixed: true },
  { label: "City", fixed: true },
  { label: "Upload CV", fixed: true },
];

const tryParseJson = (value: unknown, fallback: any) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const AddFieldPanel = ({ onAdd }: { onAdd: (field: any) => void }) => {
  const [open, setOpen] = useState(false);
  const [fieldType, setFieldType] = useState("text");
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");
  const [fullWidth, setFullWidth] = useState(false);

  const reset = () => {
    setFieldType("text");
    setLabel("");
    setRequired(false);
    setOptions("");
    setFullWidth(false);
  };

  const handleAdd = () => {
    const trimmedLabel = String(label || "").trim();
    if (!trimmedLabel) return;
    onAdd({
      type: fieldType,
      label: trimmedLabel,
      required,
      options: fieldType === "select" ? options : "",
      fullWidth,
    });
    reset();
    setOpen(false);
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
        >
          Add Field
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <TextField
            select
            size="small"
            label="Field Type"
            value={fieldType}
            onChange={(event) => setFieldType(event.target.value)}
            fullWidth
          >
            {CAREERS_FORM_FIELD_TYPES.map((fieldTypeOption) => (
              <MenuItem key={fieldTypeOption.value} value={fieldTypeOption.value}>
                {fieldTypeOption.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Field Label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Field label"
            fullWidth
          />
          {fieldType === "select" ? (
            <TextField
              size="small"
              label="Options"
              value={options}
              onChange={(event) => setOptions(event.target.value)}
              placeholder="Options separated by commas"
              fullWidth
              sx={{ gridColumn: { md: "span 2" } }}
            />
          ) : null}
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={required}
              onChange={(event) => setRequired(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-slate-800"
            />
            Required
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={fullWidth}
              onChange={(event) => setFullWidth(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-slate-800"
            />
            Full width
          </label>
          <div className="md:col-span-2 flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              className="px-4 py-2 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all"
            >
              Add Field
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const normalizeVerticalKey = (value: unknown): VerticalType => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "co-working";
  const compact = raw.replace(/\s+/g, "");
  const hyphen = raw.replace(/\s+/g, "-");
  const aliasMap: Record<string, VerticalType> = {
    coworking: "co-working",
    "co-working": "co-working",
    coliving: "co-living",
    "co-living": "co-living",
    meetingrooms: "meeting-rooms",
    "meeting-rooms": "meeting-rooms",
    hostel: "hostel",
    workation: "workation",
    cafe: "cafe",
  };
  return aliasMap[raw] || aliasMap[compact] || aliasMap[hyphen] || "co-working";
};

const toSearchKey = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split("-")[0]
    .replace(/\s+/g, "");

const toSlug = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const isMenuPageSlug = (slug = "") => {
  const normalized = String(slug || "").trim().toLowerCase();
  return normalized.includes("cafe") || normalized.includes("menu");
};

const LIVE_PREVIEW_DRAFT_STORAGE_KEY = "website_builder_live_preview_draft";

const getMediaUrlForPreview = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof File) return URL.createObjectURL(value);
  if (Array.isArray(value) && value.length > 0) {
    return getMediaUrlForPreview(value[0]);
  }
  if (typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.url === "string") return candidate.url;
    if (typeof candidate.preview === "string") return candidate.preview;
    if (typeof candidate.location === "string") return candidate.location;
  }
  return "";
};

const hasMeaningfulDraftContent = (draftData: any) => {
  if (!draftData || typeof draftData !== "object") return false;

  const textValues = [
    draftData?.title,
    draftData?.subTitle,
    draftData?.CTAButtonText,
    draftData?.productTitle,
    draftData?.galleryTitle,
    draftData?.testimonialTitle,
    draftData?.contactTitle,
    draftData?.mapUrl,
    draftData?.websiteEmail,
    draftData?.phone,
    draftData?.address,
    draftData?.registeredCompanyName,
    draftData?.copyrightText,
    draftData?.aboutPageIntro,
    draftData?.aboutPageOverview,
    draftData?.aboutPageStory,
    draftData?.aboutPageMission,
    draftData?.aboutPageVision,
    draftData?.aboutPageValues,
    draftData?.aboutPageTeamHeading,
    draftData?.galleryPageHeading,
    draftData?.testimonialsPageHeading,
    draftData?.testimonialsPageIntro,
    draftData?.contactPageHeading,
    draftData?.contactPageIntro,
    draftData?.contactBusinessHours,
    draftData?.contactPersonName,
    draftData?.contactPersonRole,
    draftData?.contactPersonEmail,
    draftData?.contactPersonPhone,
  ];

  if (textValues.some((value) => String(value || "").trim().length > 0)) {
    return true;
  }

  const arrayFields = [
    draftData?.about,
    draftData?.products,
    draftData?.menuItems,
    draftData?.rooms,
    draftData?.meetingRooms,
    draftData?.coLivingRooms,
    draftData?.packages,
    draftData?.dorms,
    draftData?.testimonials,
    draftData?.pageNavItems,
    draftData?.productDropdownPages,
    draftData?.aboutPageImageCards,
    draftData?.mediaSignature?.heroImages,
    draftData?.mediaSignature?.gallery,
    draftData?.mediaSignature?.aboutPageImages,
    draftData?.mediaSignature?.aboutPageImageCards,
    draftData?.mediaSignature?.productDropdownPages,
    draftData?.mediaSignature?.products,
    draftData?.mediaSignature?.menuItems,
    draftData?.mediaSignature?.rooms,
    draftData?.mediaSignature?.coLivingRooms,
    draftData?.mediaSignature?.packages,
    draftData?.mediaSignature?.dorms,
  ];

  const hasMediaSignature =
    Boolean(draftData?.mediaSignature?.companyLogo) ||
    arrayFields.some(
      (items) =>
        Array.isArray(items) &&
        items.some((item) => JSON.stringify(item || {}) !== "{}" && String(item || "").trim() !== ""),
    );
  if (hasMediaSignature) return true;

  return arrayFields.some(
    (items) => Array.isArray(items) && items.some((item) => JSON.stringify(item || {}) !== "{}"),
  );
};

const toMediaToken = (media: any) => {
  if (!media) return "";
  if (media instanceof File) {
    return `file:${media.name}:${media.size}:${media.lastModified}`;
  }
  if (typeof media === "string") {
    return `url:${media}`;
  }
  const id = String(media?.id || "").trim();
  const url = String(media?.url || "").trim();
  if (id || url) return `asset:${id || url}`;
  return "";
};

// Footer social links: shown disabled in the form until the user enables the
// ones they want; only enabled socials with a link render on the website footer.
const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { key: "twitter", label: "Twitter / X", placeholder: "https://x.com/yourhandle" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourcompany" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "WhatsApp number with country code e.g. 919876543210" },
];

const buildDefaultSocials = () =>
  SOCIAL_PLATFORMS.reduce(
    (acc: Record<string, { enabled: boolean; link: string }>, platform) => {
      acc[platform.key] = { enabled: false, link: "" };
      return acc;
    },
    {},
  );

const normalizeSocials = (value: any) =>
  SOCIAL_PLATFORMS.reduce(
    (acc: Record<string, { enabled: boolean; link: string }>, platform) => {
      acc[platform.key] = {
        enabled: value?.[platform.key]?.enabled === true,
        link: String(value?.[platform.key]?.link || "").trim(),
      };
      return acc;
    },
    {},
  );

const buildDraftFormDataFromValues = (formValues: any, meta: any = {}) => ({
  companyId: String(formValues?.companyId || meta?.companyId || "").trim(),
  companyName: String(formValues?.companyName || meta?.companyName || "").trim(),
  title: String(formValues?.title || "").trim(),
  subTitle: String(formValues?.subTitle || "").trim(),
  CTAButtonText: String(formValues?.CTAButtonText || "").trim(),
  about: Array.isArray(formValues?.about)
    ? formValues.about.map((item: any) => ({ text: String(item?.text || "").trim() }))
    : [{ text: "" }],
  aboutTitle: String(formValues?.aboutTitle || "").trim(),
  productTitle: String(formValues?.productTitle || "").trim(),
  products: Array.isArray(formValues?.products)
    ? formValues.products.map((item: any) => ({
        type: String(item?.type || "").trim(),
        name: String(item?.name || "").trim(),
        subtitle: String(item?.subtitle || "").trim(),
        cost: String(item?.cost || "").trim(),
        description: String(item?.description || "").trim(),
      }))
    : [],
  menuItems: Array.isArray(formValues?.menuItems)
    ? formValues.menuItems.map((item: any) => ({
        category: String(item?.category || "").trim(),
        name: String(item?.name || "").trim(),
        price: String(item?.price || "").trim(),
        description: String(item?.description || "").trim(),
      }))
    : [],
  meetingRooms: Array.isArray(formValues?.meetingRooms)
    ? formValues.meetingRooms.map((item: any) => ({
        title: String(item?.title || "").trim(),
        description: String(item?.description || "").trim(),
        price: String(item?.price || "").trim(),
      }))
    : Array.isArray(formValues?.rooms)
      ? formValues.rooms.map((item: any) => ({
          title: String(item?.title || "").trim(),
          description: String(item?.description || "").trim(),
          price: String(item?.price || "").trim(),
        }))
      : [],
  rooms: Array.isArray(formValues?.rooms)
    ? formValues.rooms.map((item: any) => ({
        title: String(item?.title || "").trim(),
        description: String(item?.description || "").trim(),
        price: String(item?.price || "").trim(),
      }))
    : [],
  coLivingRooms: Array.isArray(formValues?.coLivingRooms)
    ? formValues.coLivingRooms.map((item: any) => ({
        title: String(item?.title || "").trim(),
        description: String(item?.description || "").trim(),
        price: String(item?.price || "").trim(),
      }))
    : [],
  packages: Array.isArray(formValues?.packages)
    ? formValues.packages.map((item: any) => ({
        title: String(item?.title || "").trim(),
        description: String(item?.description || "").trim(),
        price: String(item?.price || "").trim(),
        duration: String(item?.duration || "").trim(),
      }))
    : [],
  dorms: Array.isArray(formValues?.dorms)
    ? formValues.dorms.map((item: any) => ({
        title: String(item?.title || "").trim(),
        description: String(item?.description || "").trim(),
        price: String(item?.price || "").trim(),
        capacity: item?.capacity ?? "",
      }))
    : [],
  galleryTitle: String(formValues?.galleryTitle || "").trim(),
  testimonialTitle: String(formValues?.testimonialTitle || "").trim(),
  testimonials: Array.isArray(formValues?.testimonials)
    ? formValues.testimonials.map((item: any) => ({
        name: String(item?.name || "").trim(),
        jobPosition: String(item?.jobPosition || "").trim(),
        testimony: String(item?.testimony || "").trim(),
        rating: Number(item?.rating || 5),
      }))
    : [],
  contactTitle: String(formValues?.contactTitle || "").trim(),
  mapUrl: String(formValues?.mapUrl || "").trim(),
  websiteEmail: String(formValues?.websiteEmail || "").trim(),
  phone: String(formValues?.phone || "").trim(),
  address: String(formValues?.address || "").trim(),
  registeredCompanyName: String(formValues?.registeredCompanyName || "").trim(),
  copyrightText: String(formValues?.copyrightText || "").trim(),
  socials: normalizeSocials(formValues?.socials),
  pageNavItems: Array.isArray(formValues?.pageNavItems)
    ? formValues.pageNavItems.map((item: any) => ({
        name: String(item?.name || "").trim(),
        slug: String(item?.slug || "").trim().toLowerCase(),
        enabled: item?.enabled !== false,
        pageHeading: String(item?.pageHeading || "").trim(),
        pageIntro: String(item?.pageIntro || "").trim(),
        metaTitle: String(item?.metaTitle || "").trim(),
        metaDescription: String(item?.metaDescription || "").trim(),
      }))
    : [],
  navItems: Array.isArray(formValues?.pageNavItems)
    ? formValues.pageNavItems.map((item: any) => ({
        name: String(item?.name || "").trim(),
        slug: String(item?.slug || "").trim().toLowerCase(),
        enabled: item?.enabled !== false,
        pageHeading: String(item?.pageHeading || "").trim(),
        pageIntro: String(item?.pageIntro || "").trim(),
        metaTitle: String(item?.metaTitle || "").trim(),
        metaDescription: String(item?.metaDescription || "").trim(),
      }))
    : [],
  productDropdownPages: Array.isArray(formValues?.productDropdownPages)
    ? formValues.productDropdownPages.map((item: any) => ({
        name: String(item?.name || "").trim(),
        slug: String(item?.slug || "").trim().toLowerCase(),
        enabled: item?.enabled !== false,
        heroHeading: String(item?.heroHeading || "").trim(),
        heroSubHeading: String(item?.heroSubHeading || "").trim(),
        heroMode: String(item?.heroMode || "single").trim().toLowerCase(),
        heroButtonText: String(item?.heroButtonText || "").trim(),
        homeCardHeading: String(item?.homeCardHeading || "").trim(),
        homeCardSubText: String(item?.homeCardSubText || "").trim(),
        leadEnabled: item?.leadEnabled !== false,
        leadFormLabel: String(item?.leadFormLabel || "").trim(),
        faqs: Array.isArray(item?.faqs) ? item.faqs : [],
        inclusions: Array.isArray(item?.inclusions) ? item.inclusions : [],
      }))
    : [],
  productPages: Array.isArray(formValues?.productDropdownPages)
    ? formValues.productDropdownPages.map((item: any, index: number) => ({
        name: String(item?.name || "").trim(),
        slug: String(item?.slug || "").trim().toLowerCase(),
        heading: String(item?.homeCardHeading || item?.name || "").trim(),
        subText: String(item?.homeCardSubText || "").trim(),
        cardImage:
          getMediaUrlForPreview(item?.homeCardImage) ||
          getMediaUrlForPreview(formValues?.products?.[index]?.files?.[0]),
        heroHeading: String(item?.heroHeading || "").trim(),
        heroSubHeading: String(item?.heroSubHeading || "").trim(),
        heroButtonText: String(item?.heroButtonText || "View More").trim(),
        heroMode: String(item?.heroMode || "single").trim().toLowerCase(),
        heroImage: getMediaUrlForPreview(item?.heroImage),
        heroImages: (item?.heroImages || [])
          .map((heroItem: unknown) => getMediaUrlForPreview(heroItem))
          .filter(Boolean),
        leadEnabled: item?.leadEnabled !== false,
        leadFormLabel: String(item?.leadFormLabel || "").trim(),
        faqs: Array.isArray(item?.faqs) ? item.faqs : [],
        inclusions: Array.isArray(item?.inclusions) ? item.inclusions : [],
      }))
    : [],
  inclusions: Array.isArray(formValues?.inclusions) ? formValues.inclusions : [],
  faqs: Array.isArray(formValues?.faqs) ? formValues.faqs : [],
  logoCarousel: {
    enabled: formValues?.logoCarousel?.enabled === true,
    title: String(formValues?.logoCarousel?.title || "").trim(),
    logos: Array.isArray(formValues?.logoCarousel?.logos) ? formValues.logoCarousel.logos : [],
  },
  aboutPageIntro: String(formValues?.aboutPageIntro || "").trim(),
  aboutPageOverview: String(formValues?.aboutPageOverview || "").trim(),
  aboutPageStory: String(formValues?.aboutPageStory || "").trim(),
  aboutPageMission: String(formValues?.aboutPageMission || "").trim(),
  aboutPageVision: String(formValues?.aboutPageVision || "").trim(),
  aboutPageValues: String(formValues?.aboutPageValues || "").trim(),
  aboutPageTeamHeading: String(formValues?.aboutPageTeamHeading || "").trim(),
  aboutPageImageCards: Array.isArray(formValues?.aboutPageImageCards)
    ? formValues.aboutPageImageCards.map((item: any) => ({
        title: String(item?.title || "").trim(),
        description: String(item?.description || "").trim(),
      }))
    : [],
  galleryPageHeading: String(formValues?.galleryPageHeading || "").trim(),
  testimonialsPageHeading: String(formValues?.testimonialsPageHeading || "").trim(),
  testimonialsPageIntro: String(formValues?.testimonialsPageIntro || "").trim(),
  testimonialsHomePreviewCount: Number(formValues?.testimonialsHomePreviewCount || 3),
  testimonialsEnableWriteReview: formValues?.testimonialsEnableWriteReview !== false,
  testimonialsSuccessMessage: String(formValues?.testimonialsSuccessMessage || "").trim(),
  contactPageHeading: String(formValues?.contactPageHeading || "").trim(),
  contactPageIntro: String(formValues?.contactPageIntro || "").trim(),
  contactEnableInquiryForm: formValues?.contactEnableInquiryForm !== false,
  contactInquirySuccessMessage: String(formValues?.contactInquirySuccessMessage || "").trim(),
  contactBusinessHours: String(formValues?.contactBusinessHours || "").trim(),
  contactPersonName: String(formValues?.contactPersonName || "").trim(),
  contactPersonRole: String(formValues?.contactPersonRole || "").trim(),
  contactPersonEmail: String(formValues?.contactPersonEmail || "").trim(),
  contactPersonPhone: String(formValues?.contactPersonPhone || "").trim(),
  partnerPageHeading: String(formValues?.partnerPageHeading || "").trim(),
  partnerPageContent: String(formValues?.partnerPageContent || "").trim(),
  partnerFormTitle: String(formValues?.partnerFormTitle || "").trim(),
  careersPageHeading: String(formValues?.careersPageHeading || "").trim(),
  careersPageIntro: String(formValues?.careersPageIntro || "").trim(),
  careersFormFields: Array.isArray(formValues?.careersFormFields)
    ? formValues.careersFormFields
    : tryParseJson(formValues?.careersFormFields, []),
  founders: Array.isArray(formValues?.founders)
    ? formValues.founders.map((item: any) => ({
        name: String(item?.name || "").trim(),
        role: String(item?.role || "").trim(),
        bio: String(item?.bio || "").trim(),
        highlights: String(item?.highlights || "").trim(),
      }))
    : [],
  heroVariant: String(formValues?.heroVariant || "text-image").trim(),
  themeVariant: String(formValues?.themeVariant || "default").trim(),
  activeSections: Array.isArray(formValues?.activeSections)
    ? formValues.activeSections.map((item: any) => String(item || "").trim()).filter(Boolean)
    : [],
  enabledSections: Array.isArray(formValues?.enabledSections)
    ? formValues.enabledSections.map((item: any) => String(item || "").trim()).filter(Boolean)
    : [],
  sectionOverrides: formValues?.sectionOverrides || {},
  styleConfig: formValues?.styleConfig || {},
  mediaSignature: {
    companyLogo: toMediaToken(formValues?.companyLogo),
    heroImages: Array.isArray(formValues?.heroImages)
      ? formValues.heroImages.map((item: any) => toMediaToken(item)).filter(Boolean)
      : [],
    gallery: Array.isArray(formValues?.gallery)
      ? formValues.gallery.map((item: any) => toMediaToken(item)).filter(Boolean)
      : [],
    aboutPageImages: Array.isArray(formValues?.aboutPageImages)
      ? formValues.aboutPageImages.map((item: any) => toMediaToken(item)).filter(Boolean)
      : [],
    aboutPageImageCards: Array.isArray(formValues?.aboutPageImageCards)
      ? formValues.aboutPageImageCards
          .map((item: any) => toMediaToken(item?.image))
          .filter(Boolean)
      : [],
    productDropdownPages: Array.isArray(formValues?.productDropdownPages)
      ? formValues.productDropdownPages.map((item: any) => ({
          heroImage: toMediaToken(item?.heroImage),
          homeCardImage: toMediaToken(item?.homeCardImage),
          heroImages: Array.isArray(item?.heroImages)
            ? item.heroImages.map((img: any) => toMediaToken(img)).filter(Boolean)
            : [],
        }))
      : [],
    products: Array.isArray(formValues?.products)
      ? formValues.products.map((item: any) => ({
          images: Array.isArray(item?.files)
            ? item.files.map((img: any) => toMediaToken(img)).filter(Boolean)
            : [],
        }))
      : [],
    menuItems: Array.isArray(formValues?.menuItems)
      ? formValues.menuItems.map((item: any) => ({
          image: toMediaToken(item?.image),
        }))
      : [],
    rooms: Array.isArray(formValues?.rooms)
      ? formValues.rooms.map((item: any) => ({
          images: Array.isArray(item?.images)
            ? item.images.map((img: any) => toMediaToken(img)).filter(Boolean)
            : [],
        }))
      : [],
    coLivingRooms: Array.isArray(formValues?.coLivingRooms)
      ? formValues.coLivingRooms.map((item: any) => ({
          images: Array.isArray(item?.images)
            ? item.images.map((img: any) => toMediaToken(img)).filter(Boolean)
            : [],
        }))
      : [],
    packages: Array.isArray(formValues?.packages)
      ? formValues.packages.map((item: any) => ({
          images: Array.isArray(item?.images)
            ? item.images.map((img: any) => toMediaToken(img)).filter(Boolean)
            : [],
        }))
      : [],
    dorms: Array.isArray(formValues?.dorms)
      ? formValues.dorms.map((item: any) => ({
          images: Array.isArray(item?.images)
            ? item.images.map((img: any) => toMediaToken(img)).filter(Boolean)
            : [],
        }))
      : [],
    founders: Array.isArray(formValues?.founders)
      ? formValues.founders.map((item: any) => ({
          image: toMediaToken(item?.image),
        }))
      : [],
  },
});

const isSameCompanyTemplate = ({
  item,
  companyId,
  workspaceId,
  companyName,
}: {
  item: any;
  companyId: string;
  workspaceId: string;
  companyName: string;
}) => {
  const itemCompanyId = String(item?.companyId || "").trim();
  const itemWorkspaceId = String(item?.workspaceId || "").trim();
  const itemCompanyName = String(item?.companyName || "").trim().toLowerCase();
  const normalizedCompanyName = String(companyName || "").trim().toLowerCase();

  // Cascade instead of early-return: templates are sometimes stored with a
  // companyId from a different source than the one in the session, so a
  // companyId mismatch must still fall through to the workspace/name checks.
  if (companyId && itemCompanyId === String(companyId).trim()) return true;
  if (workspaceId && itemWorkspaceId === String(workspaceId).trim()) return true;
  if (normalizedCompanyName && itemCompanyName === normalizedCompanyName)
    return true;
  return false;
};

// Small "Show on website" switch used next to section headers. Every section is
// enabled by default (unset === enabled); toggling off hides it from the live site
// without deleting the content, so it can be re-enabled later.
// Pass either `sectionKey` (stored under sectionOverrides.<key>, for singleton
// pages like Home/About) or a full `name` (for per-item fields like a specific
// product page's own enabled/heroEnabled/inclusionsEnabled).
const SectionToggle = ({
  sectionKey,
  name,
  control,
}: {
  sectionKey?: string;
  name?: string;
  control: any;
}) => (
  <Controller
    name={name || `sectionOverrides.${sectionKey}`}
    control={control}
    defaultValue={true}
    render={({ field }) => (
      <label className="ml-auto flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-slate-500">
        <span>{field.value !== false ? "Enabled" : "Disabled"}</span>
        <span
          role="switch"
          aria-checked={field.value !== false}
          onClick={() => field.onChange(field.value === false)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            field.value !== false ? "bg-accent" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              field.value !== false ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </span>
      </label>
    )}
  />
);


const CreateWebsite = () => {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.pathname.includes("/edit-website");
  // The :website route param (e.g. "biznest") is the deterministic searchKey for the
  // website being edited. We use it to load the correct website on the edit route
  // WITHOUT depending on async company identity resolution â€" this is what stops the
  // create-website <-> edit-website redirect ping-pong (the component remounts on each
  // route change, resetting all the useRef guards, so we cannot rely on those alone).
  const { website: websiteRouteParam } = useParams();
  const editWebsiteSearchKey = String(websiteRouteParam || "").trim().toLowerCase();
  // Keep a ref that always reflects the latest isEditMode so the checkExistingWebsite
  // effect can read it without needing it in the dependency array (which was causing
  // the effect to re-fire every time the route changed after redirect, causing flicker).
  const isEditModeRef = useRef(isEditMode);
  isEditModeRef.current = isEditMode;
  const formRef = useRef(null);
  const { auth } = useAuth();
  const [hostCompanyIdentity, setHostCompanyIdentity] = useState(null);
  const [workspaceBusinessName, setWorkspaceBusinessName] = useState("");
  const [hasExistingWebsite, setHasExistingWebsite] = useState(false);
  const [isCheckingExistingWebsite, setIsCheckingExistingWebsite] = useState(true);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(5);
  const [creditsResetDate, setCreditsResetDate] = useState(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showResetConfirmPopup, setShowResetConfirmPopup] = useState(false);
  const [isRedirectingAfterCreate, setIsRedirectingAfterCreate] = useState(false);
  const [publishedWebsiteUrl, setPublishedWebsiteUrl] = useState("");
  const [draftTemplateId, setDraftTemplateId] = useState("");
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [approvedWebsiteReviews, setApprovedWebsiteReviews] = useState<any[]>([]);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const draftHydrationReadyRef = useRef(false);
  const lastDraftSnapshotRef = useRef("");
  const pendingDraftSnapshotRef = useRef("");
  const uploadedDraftFileKeysRef = useRef<Set<string>>(new Set());
  const pendingDraftFileKeysRef = useRef<string[]>([]);
  // Prevents the checkExistingWebsite effect from re-triggering a navigate after it has
  // already redirected to /edit-website. Without this guard the effect fires again when
  // workspaceBusinessName resolves asynchronously, causing a flicker loop.
  const hasRedirectedToEditRef = useRef(false);
  // Prevents repeated form hydration when async deps (workspaceBusinessName, hostCompanyIdentity)
  // resolve after the first run and re-trigger the effect. Once we've loaded the DB data and
  // called reset(), we do NOT want to do it again.
  const hasHydratedFromDbRef = useRef(false);
  // Tracks whether a checkExistingWebsite call is already in-flight so concurrent
  // async runs (triggered by rapid dep changes) don't race each other.
  const isCheckingWebsiteInFlightRef = useRef(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues, // âœ… add this
    formState: { errors },
  } = useForm({
    defaultValues: {
      // hero/company
      companyId: "", // âœ… change from businessId
      companyName: "",
      title: "",
      subTitle: "",
      CTAButtonText: "",
      companyLogo: null,
      heroImages: [],
      gallery: [],
      // about
      about: [{ text: "" }],
      aboutTitle: "",
      // products
      productTitle: "",
      products: [defaultProduct],
      meetingRooms: [],
      rooms: [],
      coLivingRooms: [],
      packages: [],
      dorms: [],
      menuItems: [],
      // gallery
      galleryTitle: "",
      // testimonials
      testimonialTitle: "",
      testimonials: [defaultTestimonial],
      // contact
      contactTitle: "",
      mapUrl: "",
      websiteEmail: "",
      phone: "",
      address: "",
      // footer
      registeredCompanyName: "",
      copyrightText: "",
      socials: buildDefaultSocials(),
      pageNavItems: DEFAULT_PAGE_NAV_ITEMS.map((name) => ({
        name,
        slug: String(name).toLowerCase().replace(/\s+/g, "-"),
        enabled: String(name).toLowerCase().replace(/\s+/g, "-") === "home",
      })),
      productDropdownPages: [],
      aboutPageIntro: "",
      aboutPageOverview: "",
      aboutPageStory: "",
      aboutPageMission: "",
      aboutPageVision: "",
      aboutPageValues: "",
      aboutPageTeamHeading: "",
      // aboutPageExtraParagraphs: [{ text: "" }],
      aboutPageImages: [],
      aboutPageImageCards: [{ title: "", description: "", image: null }],
      galleryPageHeading: "",
      testimonialsPageHeading: "",
      testimonialsPageIntro: "",
      testimonialsHomePreviewCount: 3,
      testimonialsEnableWriteReview: true,
      testimonialsSuccessMessage:
        "Thank you. Your review has been submitted for approval.",
      contactPageHeading: "",
      contactPageIntro: "",
      contactEnableInquiryForm: true,
      contactInquirySuccessMessage:
        "Thank you. Your inquiry has been submitted successfully.",
      contactBusinessHours: "",
      contactPersonName: "",
      contactPersonRole: "",
      contactPersonEmail: "",
      contactPersonPhone: "",
      // Partner page
      partnerPageHeading: "",
      partnerPageContent: "",
      partnerFormTitle: "",
      // Careers page
      careersPageHeading: "",
      careersPageIntro: "",
      careersFormFields: [],
      // Founders (about page)
      founders: [{ name: "", role: "", bio: "", highlights: "", image: null }],
    },
  });

  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const builderBasePath = location.pathname.includes("/company-settings/website-builder")
    ? "/company-settings/website-builder"
    : "/dashboard/website-builder";
  const createOrEditRoute = `${builderBasePath}/dynamic/create-website`;
  const effectiveEditMode = isEditMode || hasExistingWebsite;
  const workspaceId =
    selectedCompany?.workspaceId ||
    auth?.user?.primaryWorkspace ||
    auth?.user?.workspaceId;
  const companyId =
    selectedCompany?.companyId ||
    hostCompanyIdentity?.companyId ||
    auth?.user?.companyId ||
    "";
  const prefillCompanyId =
    selectedCompany?.companyId ||
    hostCompanyIdentity?.companyId ||
    auth?.user?.companyId ||
    "";
  const prefillCompanyName =
    selectedCompany?.companyName ||
    auth?.user?.companyName ||
    workspaceBusinessName ||
    hostCompanyIdentity?.companyName ||
    "";
  const editorSessionIdRef = useRef(
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
  );
  const [editingLockPending, setEditingLockPending] = useState(false);
  const [editingConflict, setEditingConflict] = useState<any>(null);
  const editingLockKey = String(
    editWebsiteSearchKey || toSearchKey(prefillCompanyName),
  ).trim();

  useEffect(() => {
    if (!editingLockKey) return;
    let active = true;
    const payload = {
      lockKey: editingLockKey,
      editorSessionId: editorSessionIdRef.current,
      editorName:
        [auth?.user?.firstName, auth?.user?.lastName].filter(Boolean).join(" ") ||
        auth?.user?.email ||
        "HostPanel user",
    };

    const acquire = async (initial = false) => {
      if (initial) setEditingLockPending(true);
      try {
        await axios.post("/api/editor/editing-lock/acquire", payload);
        if (active) setEditingConflict(null);
      } catch (error: any) {
        if (active && error?.response?.status === 423) {
          setEditingConflict(error.response.data);
        }
      } finally {
        if (active && initial) setEditingLockPending(false);
      }
    };

    acquire(true);
    const heartbeat = window.setInterval(() => acquire(false), 30_000);
    return () => {
      active = false;
      window.clearInterval(heartbeat);
      void axios.post("/api/editor/editing-lock/release", payload).catch(() => undefined);
    };
  }, [axios, editingLockKey, auth?.user?.email, auth?.user?.firstName, auth?.user?.lastName]);
  const [creditsRemaining, setCreditsRemaining] = useState(5);
  /*
   * Demo mode: dynamic page navigation first.
   * Keep vertical-driven behavior disabled for now without deleting old logic.
   */
  // const selectedVerticalRaw = localStorage.getItem("selectedVertical") || "";
  // const verticalFromState =
  //   selectedCompany?.vertical || auth?.user?.vertical || "co-working";
  // const verticalCandidate = selectedVerticalRaw || verticalFromState;
  // const vertical: VerticalType = (VERTICAL_KEYS as readonly string[]).includes(
  //   verticalCandidate,
  // )
  //   ? (verticalCandidate as VerticalType)
  //   : "co-working";
  // const activeSections =
  //   VERTICAL_CONFIG[vertical]?.sections ?? VERTICAL_CONFIG["co-working"].sections;
  const selectedVertical: VerticalType = "co-working";
  const activeSections = [
    "hero",
    "about",
    "products",
    "gallery",
    "testimonials",
    "contact",
    "footer",
  ];
  const selectedVerticalLabel = "Dynamic Website";
  const selectedVerticalBadgeText = `Mode: ${selectedVerticalLabel}`;
  const ctaPlaceholders: Record<string, string> = {
    "co-working": "Book a Desk",
    "co-living": "View Rooms",
    workation: "See Packages",
    hostel: "Book a Bed",
    "meeting-rooms": "Book a Room",
    cafe: "View Menu",
  };
  const ctaPlaceholder = ctaPlaceholders[selectedVertical] || "Get Started";
  const sectionTitles: Record<string, string> = {
    "co-working": "Our Plans",
    "co-living": "Our Rooms",
    workation: "Our Packages",
    hostel: "Our Dorms",
    "meeting-rooms": "Our Rooms & Pricing",
    cafe: "Our Menu",
  };

  const values = watch();
  const pageNavItemsForVisibility = Array.isArray(values.pageNavItems) ? values.pageNavItems : [];
  const homePageNavIndex = pageNavItemsForVisibility.findIndex(
    (item: any) => String(item?.slug || "").trim().toLowerCase() === "home",
  );
  const partnerPageNavIndex = pageNavItemsForVisibility.findIndex(
    (item: any) => String(item?.slug || "").trim().toLowerCase() === "partner",
  );
  const careersPageNavIndex = pageNavItemsForVisibility.findIndex(
    (item: any) => String(item?.slug || "").trim().toLowerCase() === "careers",
  );
  const aboutPageNavIndex = pageNavItemsForVisibility.findIndex(
    (item: any) => String(item?.slug || "").trim().toLowerCase() === "about-us",
  );
  const productsPageNavIndex = pageNavItemsForVisibility.findIndex(
    (item: any) => String(item?.slug || "").trim().toLowerCase() === "products",
  );
  const galleryPageNavIndex = pageNavItemsForVisibility.findIndex(
    (item: any) => String(item?.slug || "").trim().toLowerCase() === "gallery",
  );
  const contactPageNavIndex = pageNavItemsForVisibility.findIndex(
    (item: any) => String(item?.slug || "").trim().toLowerCase() === "contact-us",
  );
  const CHAR_LIMITS = {
    heroTitle: 100,
    heroSubTitle: 200,
    ctaButtonText: 50,
    aboutText: 500,
    productTitle: 100,
    productName: 100,
    productType: 100,
    productDescription: 200,
    galleryTitle: 100,
    testimonialTitle: 100,
    testimonialName: 100,
    testimonialJobPosition: 100,
    testimonialTestimony: 200,
    contactTitle: 100,
    mapUrl: 2048,
    websiteEmail: 100,
    phone: 30,
    address: 200,
    registeredCompanyName: 100,
    copyrightText: 200,
  };
  const getHelperText = (error, value, limit) =>
    error || (limit ? `${(value || "").length}/${limit}` : undefined);

  useEffect(() => {
    const fetchWorkspaceSettings = async () => {
      try {
        const res = await axios.get("/api/workspaces/settings");
        const businessName = String(
          res?.data?.data?.settings?.profile?.businessName || "",
        ).trim();
        setWorkspaceBusinessName(businessName);
      } catch (error) {
        setWorkspaceBusinessName("");
      }
    };

    fetchWorkspaceSettings();
  }, [axios, auth?.user?.primaryWorkspace]);

  useEffect(() => {
    const fetchHostCompanyIdentity = async () => {
      try {
        const res = await axios.get("/api/workspaces/host-company");
        setHostCompanyIdentity(res?.data?.data || null);
      } catch (error) {
        setHostCompanyIdentity(null);
      }
    };

    fetchHostCompanyIdentity();
  }, [axios, auth?.user?.primaryWorkspace]);

  useEffect(() => {
    const fetchApprovedWebsiteReviews = async () => {
      const resolvedCompanyId = String(prefillCompanyId || "").trim();
      const resolvedWorkspaceId = String(workspaceId || "").trim();
      const resolvedCompanyName = String(prefillCompanyName || "").trim();
      if (!resolvedCompanyId && !resolvedWorkspaceId && !resolvedCompanyName) {
        setApprovedWebsiteReviews([]);
        return;
      }

      try {
        const response = await axios.get("/api/review/public", {
          params: {
            companyId: resolvedCompanyId,
            workspaceId: resolvedWorkspaceId,
            companyName: resolvedCompanyName,
          },
          headers: { "Cache-Control": "no-cache" },
        });
        const reviews =
          response?.data?.reviews ??
          response?.data?.data?.reviews ??
          response?.data?.data ??
          response?.data;
        setApprovedWebsiteReviews(Array.isArray(reviews) ? reviews : []);
      } catch (error) {
        setApprovedWebsiteReviews([]);
      }
    };

    void fetchApprovedWebsiteReviews();
  }, [axios, prefillCompanyId, prefillCompanyName, workspaceId]);

  useEffect(() => {
    if (prefillCompanyId || prefillCompanyName) {
      reset({
        ...getValues(),
        companyId: prefillCompanyId,
        companyName: prefillCompanyName,
      });
    }
  }, [prefillCompanyId, prefillCompanyName, reset, getValues]);

  useEffect(() => {
    if (prefillCompanyId) {
      setValue("companyId", prefillCompanyId, {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
    if (prefillCompanyName) {
      setValue("companyName", prefillCompanyName, {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
  }, [prefillCompanyId, prefillCompanyName, setValue]);

  useEffect(() => {
    const checkExistingWebsite = async () => {
      // If we've already loaded and hydrated the form from DB, skip re-running.
      // This prevents the effect from re-firing when workspaceBusinessName or
      // hostCompanyIdentity resolves asynchronously and triggers a second (or third)
      // reset() call, which is what causes the visible flicker.
      if (hasHydratedFromDbRef.current) return;
      // Block concurrent in-flight calls â€" dep changes can fire this effect again
      // before the first async run has finished and set hasHydratedFromDbRef.
      if (isCheckingWebsiteInFlightRef.current) return;
      isCheckingWebsiteInFlightRef.current = true;

      try {
        const resolvedCompanyName = String(
          prefillCompanyName ||
            selectedCompany?.companyName ||
            workspaceBusinessName ||
            auth?.user?.companyName ||
            "",
        ).trim();
        const response = await axios.get("/api/editor/get-websites", {
          params: {
            companyId: String(prefillCompanyId || "").trim(),
            workspaceId: String(workspaceId || "").trim(),
            businessName: resolvedCompanyName,
          },
        });
        const templates = Array.isArray(response?.data) ? response.data : [];
        const found =
          templates.find((item) =>
            isSameCompanyTemplate({
              item,
              companyId: String(prefillCompanyId || "").trim(),
              workspaceId: String(workspaceId || "").trim(),
              companyName: resolvedCompanyName,
            }),
          ) ||
          // Deterministic fallback for the edit route: match by the :website searchKey
          // from the URL. This prevents the bounce-back-to-create flicker when company
          // identity hasn't resolved yet but we already know exactly which site to load.
          (editWebsiteSearchKey
            ? templates.find(
                (item) =>
                  String(item?.searchKey || "").trim().toLowerCase() ===
                  editWebsiteSearchKey,
              )
            : null) ||
          null;

        if (found) {
          setHasExistingWebsite(true);
          if (found?.isPublished === true || found?.deployedUrl || found?.publishedProjectUrl) {
            setPublishedWebsiteUrl(
              String(found?.deployedUrl || found?.publishedProjectUrl || "").trim(),
            );
          }
          const websiteSlug = found.searchKey || found.companyName || "";
          const canResumeDraft =
            (found?.isDraft === true && found?.isPublished !== true) ||
            Boolean(found?.draftData);
          const draftData =
            found?.draftData && typeof found.draftData === "object"
              ? found.draftData
              : found;
          const resolvedSearchKey = String(websiteSlug || found?.searchKey || "").trim();
          const editRoute = resolvedSearchKey
            ? `${builderBasePath}/edit-website/${encodeURIComponent(resolvedSearchKey)}`
            : createOrEditRoute;

          // Mark as hydrated BEFORE reset() so any re-render triggered by reset()
          // does not cause this effect to run and call reset() a second time.
          hasHydratedFromDbRef.current = true;

          reset({
            ...getValues(),
            sectionOverrides: draftData?.sectionOverrides || found?.sectionOverrides || {},
            companyId: String(draftData?.companyId || prefillCompanyId || found?.companyId || "").trim(),
            companyName: String(draftData?.companyName || prefillCompanyName || found?.companyName || "").trim(),
            companyLogo: found?.companyLogo || null,
            heroImages: Array.isArray(found?.heroImages) ? found.heroImages : [],
            title: String(draftData?.title || found?.title || "").trim(),
            subTitle: String(draftData?.subTitle || found?.subTitle || "").trim(),
            CTAButtonText: String(draftData?.CTAButtonText || found?.CTAButtonText || "").trim(),
            about:
              Array.isArray(draftData?.about) && draftData.about.length
                ? draftData.about.map((item: any) => ({
                    text: typeof item === "string"
                      ? item.trim()
                      : String(item?.text || "").trim(),
                  }))
                : Array.isArray(found?.about) && found.about.length
                  // Handles both old flat-string format ["text"] and new object format [{text:"..."}]
                  ? found.about.map((item: any) => ({
                      text: typeof item === "string"
                        ? item.trim()
                        : String(item?.text || "").trim(),
                    }))
                  : [{ text: "" }],
            aboutTitle: String(draftData?.aboutTitle || found?.aboutTitle || "").trim(),
            productTitle: String(draftData?.productTitle || found?.productTitle || "").trim(),
            products:
              Array.isArray(draftData?.products) && draftData.products.length
                ? draftData.products.map((item: any, index: number) => {
                    const persisted =
                      Array.isArray(found?.products) && found.products[index]
                        ? found.products[index]
                        : null;
                    return ({
                      ...defaultProduct,
                      _id: persisted?._id ? String(persisted._id) : undefined,
                      type: String(item?.type || "").trim(),
                      name: String(item?.name || "").trim(),
                      subtitle: String(item?.subtitle || "").trim(),
                      cost: String(item?.cost || "").trim(),
                      description: String(item?.description || "").trim(),
                      images: Array.isArray(persisted?.images) ? persisted.images : [],
                      files: Array.isArray(persisted?.images) ? persisted.images : [],
                    });
                  })
                : Array.isArray(found?.products) && found.products.length
                  ? found.products.map((item: any) => ({
                      ...defaultProduct,
                      _id: item?._id ? String(item._id) : undefined,
                      type: String(item?.type || "").trim(),
                      name: String(item?.name || "").trim(),
                      subtitle: String(item?.subtitle || "").trim(),
                      cost: String(item?.cost || "").trim(),
                      description: String(item?.description || "").trim(),
                      images: Array.isArray(item?.images) ? item.images : [],
                      files: Array.isArray(item?.images) ? item.images : [],
                    }))
                  : [defaultProduct],
            menuItems: Array.isArray(found?.menuItems)
              ? found.menuItems
              : Array.isArray(draftData?.menuItems)
                ? draftData.menuItems
                : [],
            rooms: Array.isArray(found?.rooms)
              ? found.rooms
              : Array.isArray(draftData?.rooms)
                ? draftData.rooms
                : [],
            meetingRooms: Array.isArray(found?.meetingRooms)
              ? found.meetingRooms
              : Array.isArray(draftData?.meetingRooms)
                ? draftData.meetingRooms
                : Array.isArray(found?.rooms)
                  ? found.rooms
                  : Array.isArray(draftData?.rooms)
                    ? draftData.rooms
                    : [],
            coLivingRooms: Array.isArray(draftData?.coLivingRooms)
              ? draftData.coLivingRooms
              : [],
            packages: Array.isArray(found?.packages)
              ? found.packages
              : Array.isArray(draftData?.packages)
                ? draftData.packages
                : [],
            dorms: Array.isArray(found?.dorms)
              ? found.dorms
              : Array.isArray(draftData?.dorms)
                ? draftData.dorms
                : [],
            galleryTitle: String(draftData?.galleryTitle || found?.galleryTitle || "").trim(),
            gallery: Array.isArray(found?.gallery) ? found.gallery : [],
            testimonialTitle: String(draftData?.testimonialTitle || found?.testimonialTitle || "").trim(),
            testimonials:
              Array.isArray(draftData?.testimonials) && draftData.testimonials.length
                ? draftData.testimonials.map((item: any) => ({
                    ...defaultTestimonial,
                    name: String(item?.name || "").trim(),
                    jobPosition: String(item?.jobPosition || "").trim(),
                    testimony: String(item?.testimony || "").trim(),
                    rating: Number(item?.rating || 5),
                  }))
                : Array.isArray(found?.testimonials) && found.testimonials.length
                  ? found.testimonials.map((item: any) => ({
                      ...defaultTestimonial,
                      name: String(item?.name || "").trim(),
                      jobPosition: String(item?.jobPosition || "").trim(),
                      testimony: String(item?.testimony || "").trim(),
                      rating: Number(item?.rating || 5),
                    }))
                  : [defaultTestimonial],
            contactTitle: String(draftData?.contactTitle || found?.contactTitle || "").trim(),
            mapUrl: String(draftData?.mapUrl || found?.mapUrl || "").trim(),
            websiteEmail: String(draftData?.websiteEmail || found?.email || "").trim(),
            phone: String(draftData?.phone || found?.phone || "").trim(),
            address: String(draftData?.address || found?.address || "").trim(),
            registeredCompanyName: String(
              draftData?.registeredCompanyName || found?.registeredCompanyName || "",
            ).trim(),
            copyrightText: String(draftData?.copyrightText || found?.copyrightText || "").trim(),
            socials: normalizeSocials(draftData?.socials || found?.socials),
            pageNavItems:
              Array.isArray(draftData?.pageNavItems) && draftData.pageNavItems.length
                ? migrateNavItems(draftData.pageNavItems)
                : Array.isArray(found?.pageNavItems) && found.pageNavItems.length
                  ? migrateNavItems(found.pageNavItems)
                  : DEFAULT_PAGE_NAV_ITEMS.map((name) => ({
                      name,
                      slug: String(name).toLowerCase().replace(/\s+/g, "-"),
                      enabled: String(name).toLowerCase().replace(/\s+/g, "-") === "home",
                    })),
            productDropdownPages: (() => {
              const fromDraft =
                Array.isArray(draftData?.productDropdownPages) &&
                draftData.productDropdownPages.length
                  ? draftData.productDropdownPages.map((item: any, index: number) => {
                      const persistedPage =
                        Array.isArray(found?.productDropdownPages) &&
                        found.productDropdownPages[index]
                          ? found.productDropdownPages[index]
                          : null;
                      return {
                        ...item,
                        heroImage: persistedPage?.heroImage || null,
                        heroImages: Array.isArray(persistedPage?.heroImages)
                          ? persistedPage.heroImages
                          : [],
                        homeCardImage: persistedPage?.homeCardImage || null,
                      };
                    })
                  : Array.isArray(found?.productDropdownPages) &&
                      found.productDropdownPages.length
                    ? found.productDropdownPages.map((item: any) => ({
                        ...item,
                        heroImage: item?.heroImage || null,
                        heroImages: Array.isArray(item?.heroImages) ? item.heroImages : [],
                        homeCardImage: item?.homeCardImage || null,
                      }))
                    : null;

              if (fromDraft && fromDraft.length) return fromDraft;

              // No product pages configured (existing/older templates): derive one
              // product page per existing product so they show in the home "Our Products"
              // section and as product pages â€" using each product's own image as the cover.
              const sourceProducts =
                Array.isArray(found?.products) && found.products.length
                  ? found.products
                  : Array.isArray(draftData?.products)
                    ? draftData.products
                    : [];
              return sourceProducts
                .filter(
                  (product: any) =>
                    String(product?.name || "").trim() || String(product?.type || "").trim(),
                )
                .map((product: any, index: number) => {
                  const name =
                    String(product?.name || product?.type || "").trim() ||
                    `Product ${index + 1}`;
                  const image =
                    Array.isArray(product?.images) && product.images[0]
                      ? product.images[0]
                      : null;
                  return {
                    name,
                    slug: toSlug(product?.slug || name || `product-${index + 1}`),
                    enabled: true,
                    heroHeading: name,
                    heroSubHeading: "",
                    heroMode: "single",
                    heroImage: image,
                    heroImages: image ? [image] : [],
                    heroButtonText: "View More",
                    homeCardHeading: name,
                    homeCardSubText: String(product?.description || "").trim(),
                    homeCardImage: image,
                    leadEnabled: true,
                    leadFormLabel: "View More / Get Details",
                    faqs: [],
                    inclusions: [],
                  };
                });
            })(),
            inclusions: Array.isArray(draftData?.inclusions) && draftData.inclusions.length
              ? draftData.inclusions
              : Array.isArray(found?.inclusions) && found.inclusions.length
                ? found.inclusions
                : [],
            faqs: Array.isArray(draftData?.faqs) && draftData.faqs.length
              ? draftData.faqs
              : Array.isArray(found?.faqs) && found.faqs.length
                ? found.faqs
                : [],
            logoCarousel: {
              enabled: draftData?.logoCarousel?.enabled ?? found?.logoCarousel?.enabled ?? false,
              title: String(draftData?.logoCarousel?.title || found?.logoCarousel?.title || "").trim(),
              logos: Array.isArray(draftData?.logoCarousel?.logos) && draftData.logoCarousel.logos.length
                ? draftData.logoCarousel.logos
                : Array.isArray(found?.logoCarousel?.logos)
                  ? found.logoCarousel.logos
                  : [],
            },
            aboutPageIntro: String(draftData?.aboutPageIntro || found?.aboutPageIntro || "").trim(),
            aboutPageOverview: String(draftData?.aboutPageOverview || found?.aboutPageOverview || "").trim(),
            aboutPageStory: String(draftData?.aboutPageStory || found?.aboutPageStory || "").trim(),
            aboutPageMission: String(draftData?.aboutPageMission || found?.aboutPageMission || "").trim(),
            aboutPageVision: String(draftData?.aboutPageVision || found?.aboutPageVision || "").trim(),
            aboutPageValues: String(draftData?.aboutPageValues || found?.aboutPageValues || "").trim(),
            aboutPageTeamHeading: String(
              draftData?.aboutPageTeamHeading || found?.aboutPageTeamHeading || "",
            ).trim(),
            aboutPageImageCards:
              Array.isArray(draftData?.aboutPageImageCards) && draftData.aboutPageImageCards.length
                ? draftData.aboutPageImageCards.map((item: any, index: number) => ({
                    title: String(item?.title || "").trim(),
                    description: String(item?.description || "").trim(),
                    // Always pull the persisted image from found â€" draftData only stores text,
                    // never the uploaded image binary/URL, so images are lost on revisit without this.
                    image:
                      Array.isArray(found?.aboutPageImageCards) && found.aboutPageImageCards[index]
                        ? found.aboutPageImageCards[index]?.image || null
                        : null,
                  }))
                : Array.isArray(found?.aboutPageImageCards) && found.aboutPageImageCards.length
                  ? found.aboutPageImageCards.map((item: any) => ({
                      title: String(item?.title || "").trim(),
                      description: String(item?.description || "").trim(),
                      image: item?.image || null,
                    }))
                  : [{ title: "", description: "", image: null }],
            aboutPageImages: Array.isArray(found?.aboutPageImages)
              ? found.aboutPageImages
              : [],
            galleryPageHeading: String(
              draftData?.galleryPageHeading || found?.galleryPageHeading || "",
            ).trim(),
            testimonialsPageHeading: String(
              draftData?.testimonialsPageHeading || found?.testimonialsPageHeading || "",
            ).trim(),
            testimonialsPageIntro: String(
              draftData?.testimonialsPageIntro || found?.testimonialsPageIntro || "",
            ).trim(),
            testimonialsHomePreviewCount: Number(
              draftData?.testimonialsHomePreviewCount || found?.testimonialsHomePreviewCount || 3,
            ),
            testimonialsEnableWriteReview:
              draftData?.testimonialsEnableWriteReview !== false &&
              found?.testimonialsEnableWriteReview !== false,
            testimonialsSuccessMessage: String(
              draftData?.testimonialsSuccessMessage ||
                found?.testimonialsSuccessMessage ||
                "Thank you. Your review has been submitted for approval.",
            ).trim(),
            contactPageHeading: String(
              draftData?.contactPageHeading || found?.contactPageHeading || "",
            ).trim(),
            contactPageIntro: String(
              draftData?.contactPageIntro || found?.contactPageIntro || "",
            ).trim(),
            contactEnableInquiryForm:
              draftData?.contactEnableInquiryForm !== false &&
              found?.contactEnableInquiryForm !== false,
            contactInquirySuccessMessage: String(
              draftData?.contactInquirySuccessMessage ||
                found?.contactInquirySuccessMessage ||
                "Thank you. Your inquiry has been submitted successfully.",
            ).trim(),
            contactBusinessHours: String(
              draftData?.contactBusinessHours || found?.contactBusinessHours || "",
            ).trim(),
            contactPersonName: String(
              draftData?.contactPersonName || found?.contactPersonName || "",
            ).trim(),
            contactPersonRole: String(
              draftData?.contactPersonRole || found?.contactPersonRole || "",
            ).trim(),
            contactPersonEmail: String(
              draftData?.contactPersonEmail || found?.contactPersonEmail || "",
            ).trim(),
            contactPersonPhone: String(
              draftData?.contactPersonPhone || found?.contactPersonPhone || "",
            ).trim(),
            partnerPageHeading: String(
              draftData?.partnerPageHeading || found?.partnerPageHeading || "",
            ).trim(),
            partnerPageContent: String(
              draftData?.partnerPageContent || found?.partnerPageContent || "",
            ).trim(),
            partnerFormTitle: String(
              draftData?.partnerFormTitle || found?.partnerFormTitle || "",
            ).trim(),
            careersPageHeading: String(
              draftData?.careersPageHeading || found?.careersPageHeading || "",
            ).trim(),
            careersPageIntro: String(
              draftData?.careersPageIntro || found?.careersPageIntro || "",
            ).trim(),
            careersFormFields: tryParseJson(
              draftData?.careersFormFields ?? found?.careersFormFields ?? "[]",
              [],
            ),
            founders:
              Array.isArray(draftData?.founders) && draftData.founders.length
                ? draftData.founders.map((item: any, index: number) => ({
                    name: String(item?.name || "").trim(),
                    role: String(item?.role || "").trim(),
                    bio: String(item?.bio || "").trim(),
                    highlights: String(item?.highlights || "").trim(),
                    image:
                      Array.isArray(found?.founders) && found.founders[index]
                        ? found.founders[index]?.image || null
                        : null,
                  }))
                : Array.isArray(found?.founders) && found.founders.length
                  ? found.founders.map((item: any) => ({
                      name: String(item?.name || "").trim(),
                      role: String(item?.role || "").trim(),
                      bio: String(item?.bio || "").trim(),
                      highlights: String(item?.highlights || "").trim(),
                      image: item?.image || null,
                    }))
                  : [{ name: "", role: "", bio: "", highlights: "", image: null }],
          });
          setDraftTemplateId(String(found?._id || ""));
          setDraftUpdatedAt(found?.draftUpdatedAt || null);
          setDraftStatus(found?.isPublished ? "saved" : "saved");
          setHasRestoredDraft(Boolean(found?.draftData));
          // Baseline the autosave snapshot from the ACTUAL form state (getValues) using the
          // same builder the autosave uses. Previously this was built from the raw draftData
          // object, which has a different shape than the form values â€" so the snapshots never
          // matched and the autosave fired immediately on load, overwriting good text fields
          // with whatever was in the form mid-hydration. Building from getValues() makes the
          // first autosave comparison match, so it won't fire until the user actually edits.
          lastDraftSnapshotRef.current = JSON.stringify(
            buildDraftFormDataFromValues(getValues(), {
              companyId: prefillCompanyId,
              companyName: prefillCompanyName,
            }),
          );
          draftHydrationReadyRef.current = true;
          setIsCheckingExistingWebsite(false);
          // No auto-navigation here. The form renders correctly in both create and
          // edit mode via effectiveEditMode (isEditMode || hasExistingWebsite), so we
          // simply load the data in place. Auto-redirecting between create-website and
          // edit-website is what caused the URL ping-pong / flicker, so it's removed.
          // (New-website creation still routes to the edit URL via the create mutation's
          //  onSuccess handler.)
          return;
        }

        const subscriptionId = String(prefillCompanyId || workspaceId || "").trim();
        if (subscriptionId) {
          try {
            const subscriptionRes = await axios.get(`/api/subscription/${subscriptionId}`, {
              params: {
                companyId: String(prefillCompanyId || "").trim(),
                workspaceId: String(workspaceId || "").trim(),
              },
            });
            const subscription = subscriptionRes?.data || {};
            const hasPublishedProject =
              Boolean(String(subscription?.publishedProjectId || "").trim()) ||
              Boolean(String(subscription?.publishedProjectUrl || "").trim());

            setCreditsUsed(Number(subscription?.creditsUsed ?? 0));
            setCreditsLimit(Number(subscription?.monthlyCreditsLimit ?? subscription?.creditsLimit ?? 5));
            setCreditsRemaining(
              Number(subscription?.creditsRemaining ?? subscription?.monthlyCreditsRemaining ?? 5),
            );
            setCreditsResetDate(subscription?.creditsResetDate || null);

            if (hasPublishedProject) {
              setHasExistingWebsite(true);
              setPublishedWebsiteUrl(String(subscription?.publishedProjectUrl || "").trim());
              draftHydrationReadyRef.current = true;
              setIsCheckingExistingWebsite(false);
              return;
            }
          } catch (subscriptionError) {
            // Fall through to the create flow if subscription lookup fails.
          }
        }

        if (isEditModeRef.current) {
          setHasExistingWebsite(false);
          // Do NOT redirect back to create-website here. This component is mounted under
          // two different routes (create-website and edit-website/:website), so navigating
          // between them remounts it and resets every useRef guard â€" which made this
          // redirect fire again and again, ping-ponging with the create->edit redirect.
          // If we're on the edit route, stay put; the form simply shows empty fields when
          // no matching website was found.
          return;
        }
      } catch (error) {
        // no-op: show create flow when lookup fails
      } finally {
        draftHydrationReadyRef.current = true;
        isCheckingWebsiteInFlightRef.current = false;
        setIsCheckingExistingWebsite(false);
      }
    };

    if (prefillCompanyId || prefillCompanyName) {
      checkExistingWebsite();
    } else {
      setIsCheckingExistingWebsite(false);
    }
  }, [
    axios,
    navigate,
    builderBasePath,
    createOrEditRoute,
    getValues,
    reset,
    prefillCompanyId,
    prefillCompanyName,
    workspaceId,
    selectedCompany?.companyName,
    workspaceBusinessName,
    auth?.user?.companyName,
    auth?.user?.primaryWorkspace,
  ]);

  // Credits flow is temporarily disabled for the dynamic-pages demo pass.
  // useEffect(() => {
  //   const fetchCredits = async () => {
  //     const subscriptionId = companyId || workspaceId;
  //     if (!subscriptionId) return;
  //     try {
  //       const res = await axios.get(`/api/subscription/${subscriptionId}`, {
  //         params: {
  //           companyId: String(companyId || "").trim(),
  //           workspaceId: String(workspaceId || "").trim(),
  //         },
  //         headers: {
  //           Authorization: `Bearer ${auth?.accessToken || ""}`,
  //         },
  //       });
  //       setCreditsRemaining(Number(res?.data?.creditsRemaining ?? 5));
  //       setCreditsUsed(Number(res?.data?.creditsUsed ?? 0));
  //       setCreditsLimit(Number(res?.data?.monthlyCreditsLimit ?? res?.data?.creditsLimit ?? 5));
  //       setCreditsResetDate(res?.data?.creditsResetDate || null);
  //     } catch (error) {
  //       setCreditsRemaining(5);
  //       setCreditsUsed(0);
  //       setCreditsLimit(5);
  //       setCreditsResetDate(null);
  //     }
  //   };
  //
  //   fetchCredits();
  // }, [axios, companyId, workspaceId, auth?.accessToken]);

  const {
    fields: aboutFields,
    append: appendAbout,
    remove: removeAbout,
  } = useFieldArray({ control, name: "about" });

  const {
    fields: productFields,
    append: appendProduct,
    remove: removeProduct,
  } = useFieldArray({ control, name: "products" });

  const {
    fields: testimonialFields,
    append: appendTestimonial,
    remove: removeTestimonial,
  } = useFieldArray({ control, name: "testimonials" });
  // const {
  //   fields: aboutPageExtraFields,
  //   append: appendAboutPageExtra,
  //   remove: removeAboutPageExtra,
  // } = useFieldArray({ control, name: "aboutPageExtraParagraphs" });
  const { fields: pageNavFields } = useFieldArray({
    control,
    name: "pageNavItems",
  });
  const {
    fields: productPageFields,
    append: appendProductPageItem,
    remove: removeProductPageItem,
  } = useFieldArray({ control, name: "productDropdownPages" });
  const {
    fields: aboutImageCardFields,
    append: appendAboutImageCard,
    remove: removeAboutImageCard,
  } = useFieldArray({ control, name: "aboutPageImageCards" });
  const {
    fields: founderFields,
    append: appendFounder,
    remove: removeFounder,
  } = useFieldArray({ control, name: "founders" });
  const {
    fields: careersFieldItems,
    append: appendCareersField,
    remove: removeCareersField,
    move: moveCareersField,
  } = useFieldArray({ control, name: "careersFormFields", keyName: "fieldKey" });
  const [activeMainPageTab, setActiveMainPageTab] = useState(0);
  const [activeProductPageTab, setActiveProductPageTab] = useState(0);
  const [selectedProductPageOption, setSelectedProductPageOption] = useState("");
  const [pendingRemoveProductPageIndex, setPendingRemoveProductPageIndex] = useState(null);

  const submitCreateWebsite = (values, e) => {
    // const selectedVertical = localStorage.getItem("selectedVertical") || "co-working";
    console.log("SUBMITTING WITH VERTICAL:", selectedVertical);

    const normalizeMapUrl = (rawValue) => {
      const raw = String(rawValue || "").trim();
      if (!raw) return "";
      const iframeSrc = raw.match(/src=["']([^"']+)["']/i)?.[1];
      return (iframeSrc || raw).trim().replace(/&amp;/g, "&");
    };

    const finalCompanyName = String(
      values.companyName ||
        prefillCompanyName ||
        workspaceBusinessName ||
        hostCompanyIdentity?.companyName ||
        selectedCompany?.companyName ||
        auth?.user?.companyName ||
        "",
    ).trim();
    if (!finalCompanyName) {
      toast.error("Please provide the company name.");
      return;
    }

    const formEl = e?.target || formRef.current;
    const fd = new FormData(formEl);
    fd.set("editorSessionId", editorSessionIdRef.current);
    const appendFileIfPresent = (fieldName: string, value: unknown) => {
      if (value instanceof File) {
        fd.append(fieldName, value);
      }
    };

    // Replace structured arrays with JSON. Keep a single filtered list so the
    // JSON payload and the productImages_<i> file fields share the same index.
    const productsForSubmit = (values.products || []).filter(
      (p) =>
        (Array.isArray(p?.files) && p.files.length > 0) ||
        [p.type, p.name, p.subtitle, p.cost, p.description].some((value) =>
          String(value || "").trim(),
        ),
    );
    const productsMeta = productsForSubmit.map((p) => {
      const persistedImages = (p.files || []).filter(
        (item: any) => item && !(item instanceof File),
      );
      const imageIds = persistedImages
        .map((item: any) => item?.id || item?._id)
        .filter(Boolean);
      return {
        // _id lets the server match the existing product so its uploaded
        // images survive the edit instead of being recreated empty.
        ...(p._id ? { _id: p._id } : {}),
        type: p.type,
        name: p.name,
        subtitle: p.subtitle,
        cost: p.cost,
        description: p.description,
        enabled: p?.enabled !== false,
        // imageIds tells the server which persisted images the user kept.
        // Only send it when every kept image resolved to an id — otherwise
        // the server would treat the unresolved ones as removals.
        ...(p._id && imageIds.length === persistedImages.length
          ? { imageIds }
          : {}),
      };
    });
    const testimonialsMeta = (values.testimonials || []).map((t) => ({
      name: t.name,
      jobPosition: t.jobPosition,
      testimony: t.testimony,
      rating: Number(t.rating) || 0,
    }));
    fd.set("about", JSON.stringify(values.about.map((p) => p.text)));
    fd.set("testimonials", JSON.stringify(testimonialsMeta));
    fd.set("products", JSON.stringify(productsMeta));
    fd.set("menuItems", JSON.stringify(values.menuItems || []));
    fd.set("meetingRooms", JSON.stringify(values.meetingRooms || values.rooms || []));
    fd.set("rooms", JSON.stringify(values.rooms || []));
    fd.set("coLivingRooms", JSON.stringify(values.coLivingRooms || []));
    fd.set("packages", JSON.stringify(values.packages || []));
    fd.set("dorms", JSON.stringify(values.dorms || []));

    for (const key of Array.from(fd.keys())) {
      if (/^(products|testimonials)\.\d+\.|^socials\./.test(key)) fd.delete(key);
    }

    fd.set("about", JSON.stringify(values.about.map((p) => p.text)));
    appendFileIfPresent("companyLogo", values.companyLogo);

    fd.delete("heroImages");
    (values.heroImages || []).forEach((file) => appendFileIfPresent("heroImages", file));

    fd.delete("gallery");
    (values.gallery || []).forEach((file) => appendFileIfPresent("gallery", file));

    fd.delete("productImages");
    (values.menuItems || []).forEach((item, i) => {
      if (item?.image instanceof File) {
        fd.append(`menuItemImages_${i}`, item.image);
      }
    });
    (values.rooms || []).forEach((room, i) => {
      (room?.images || []).forEach((file) => {
        if (file instanceof File) fd.append(`roomImages_${i}`, file);
      });
    });
    (values.meetingRooms || []).forEach((room, i) => {
      (room?.images || []).forEach((file) => {
        if (file instanceof File) fd.append(`meetingRoomImages_${i}`, file);
      });
    });
    (values.coLivingRooms || []).forEach((room, i) => {
      (room?.images || []).forEach((file) => {
        if (file instanceof File) fd.append(`coLivingRoomImages_${i}`, file);
      });
    });
    (values.packages || []).forEach((pkg, i) => {
      (pkg?.images || []).forEach((file) => {
        if (file instanceof File) fd.append(`packageImages_${i}`, file);
      });
    });
    (values.dorms || []).forEach((dorm, i) => {
      (dorm?.images || []).forEach((file) => {
        if (file instanceof File) fd.append(`dormImages_${i}`, file);
      });
    });
    productsForSubmit.forEach((p, i) => {
      (p.files || []).forEach((file) => {
        if (file instanceof File) fd.append(`productImages_${i}`, file);
      });
    });

    fd.delete("testimonialImages");
    (values.testimonials || []).forEach((t, i) => {
      if (t?.file instanceof File) fd.append(`testimonialImages_${i}`, t.file);
    });

    // âœ… Add companyId here
    fd.set("companyName", finalCompanyName);
    fd.set("companyId", values.companyId || prefillCompanyId || "");
    fd.append("workspaceId", workspaceId || "");
    fd.set("pageNavItems", JSON.stringify(values.pageNavItems || []));
    fd.set(
      "productDropdownPages",
      JSON.stringify(values.productDropdownPages || []),
    );
    fd.set("inclusions", JSON.stringify(values.inclusions || []));
    fd.set("faqs", JSON.stringify(values.faqs || []));
    fd.set("sectionOverrides", JSON.stringify(values.sectionOverrides || {}));
    (values.productDropdownPages || []).forEach((item, index) => {
      appendFileIfPresent(`productPageHeroImage_${index}`, item?.heroImage);
      (item?.heroImages || []).forEach((file) => {
        appendFileIfPresent(`productPageHeroImages_${index}`, file);
      });
      appendFileIfPresent(`productPageHomeCardImage_${index}`, item?.homeCardImage);
    });
    fd.set("aboutTitle", String(values.aboutTitle || "").trim());
    fd.set("socials", JSON.stringify(normalizeSocials(values.socials)));
    fd.set("aboutPageIntro", values.aboutPageIntro || "");
    fd.set("aboutPageOverview", values.aboutPageOverview || "");
    fd.set("aboutPageStory", values.aboutPageStory || "");
    fd.set("aboutPageMission", values.aboutPageMission || "");
    fd.set("aboutPageVision", values.aboutPageVision || "");
    fd.set("aboutPageValues", values.aboutPageValues || "");
    fd.set("aboutPageTeamHeading", values.aboutPageTeamHeading || "");
    fd.set("galleryPageHeading", values.galleryPageHeading || "");
    fd.set("testimonialsPageHeading", values.testimonialsPageHeading || "");
    fd.set("testimonialsPageIntro", values.testimonialsPageIntro || "");
    fd.set(
      "testimonialsHomePreviewCount",
      String(values.testimonialsHomePreviewCount || 3),
    );
    fd.set(
      "testimonialsEnableWriteReview",
      String(!!values.testimonialsEnableWriteReview),
    );
    fd.set(
      "testimonialsSuccessMessage",
      values.testimonialsSuccessMessage ||
        "Thank you. Your review has been submitted for approval.",
    );
    fd.set("contactPageHeading", values.contactPageHeading || "");
    fd.set("contactPageIntro", values.contactPageIntro || "");
    fd.set("contactEnableInquiryForm", String(!!values.contactEnableInquiryForm));
    fd.set(
      "contactInquirySuccessMessage",
      values.contactInquirySuccessMessage ||
        "Thank you. Your inquiry has been submitted successfully.",
    );
    fd.set("contactBusinessHours", values.contactBusinessHours || "");
    fd.set("contactPersonName", values.contactPersonName || "");
    fd.set("contactPersonRole", values.contactPersonRole || "");
    fd.set("contactPersonEmail", values.contactPersonEmail || "");
    fd.set("contactPersonPhone", values.contactPersonPhone || "");
    fd.set("partnerPageHeading", values.partnerPageHeading || "");
    fd.set("partnerPageContent", values.partnerPageContent || "");
    fd.set("partnerFormTitle", values.partnerFormTitle || "");
    fd.set("careersPageHeading", values.careersPageHeading || "");
    fd.set("careersPageIntro", values.careersPageIntro || "");
    fd.set(
      "careersFormFields",
      JSON.stringify(
        (values.careersFormFields || []).map((field: any) => ({
          id: field?.id || `field_${Date.now()}`,
          type: field?.type || "text",
          label: String(field?.label || "").trim(),
          required: !!field?.required,
          options: String(field?.options || ""),
          fullWidth: !!field?.fullWidth,
        })),
      ),
    );
    fd.set("founders", JSON.stringify(
      (values.founders || []).map((f: any) => ({
        name: f?.name || "",
        role: f?.role || "",
        bio: f?.bio || "",
        highlights: f?.highlights || "",
      }))
    ));
    (values.founders || []).forEach((founder: any, index: number) => {
      appendFileIfPresent(`founderImage_${index}`, founder?.image);
    });
    // fd.set(
    //   "aboutPageExtraParagraphs",
    //   JSON.stringify((values.aboutPageExtraParagraphs || []).map((item) => item?.text || "")),
    // );
    fd.delete("aboutPageImages");
    (values.aboutPageImages || []).forEach((file) => appendFileIfPresent("aboutPageImages", file));
    (values.aboutPageImageCards || []).forEach((card) => {
      appendFileIfPresent("aboutPageImages", card?.image);
    });
    fd.set(
      "aboutPageImageCards",
      JSON.stringify(
        (values.aboutPageImageCards || []).map((card) => ({
          title: card?.title || "",
          description: card?.description || "",
          enabled: card?.enabled !== false,
        })),
      ),
    );
    (values.aboutPageImageCards || []).forEach((card, index) => {
      appendFileIfPresent(`aboutPageImageCardImage_${index}`, card?.image);
    });
    fd.set("mapUrl", normalizeMapUrl(values.mapUrl));
    if (!String(values.registeredCompanyName || "").trim()) {
      fd.set("registeredCompanyName", finalCompanyName);
    }

    // Logo Carousel
    fd.set("logoCarouselEnabled", String(values?.logoCarousel?.enabled === true));
    fd.set("logoCarouselTitle", String(values?.logoCarousel?.title || "").trim());
    fd.delete("logoCarouselLogos");
    (values?.logoCarousel?.logos || []).forEach((file: any) => {
      if (file instanceof File) fd.append("logoCarouselLogos", file);
    });

    if (effectiveEditMode) {
      updateWebsite(fd);
      return;
    }
    createWebsite(fd);
  };

  const getPreviewPayloadFromValues = (formValues: any) => {
    const companyName = String(formValues?.companyName || prefillCompanyName || "").trim();
    const searchKey = toSearchKey(companyName) || "company";
  return {
    companyName,
    searchKey,
    workspaceId: String(workspaceId || "").trim(),
    title: String(formValues?.title || "").trim(),
    subTitle: String(formValues?.subTitle || "").trim(),
    ctaText: String(formValues?.CTAButtonText || "Explore").trim(),
    heroVariant: String(formValues?.heroVariant || "text-image").trim(),
    themeVariant: String(formValues?.themeVariant || "default").trim(),
    activeSections: Array.isArray(formValues?.activeSections)
      ? formValues.activeSections.map((item: any) => String(item || "").trim()).filter(Boolean)
      : [],
    enabledSections: Array.isArray(formValues?.enabledSections)
      ? formValues.enabledSections
          .map((item: any) => String(item || "").trim())
          .filter(Boolean)
      : [],
    sectionOverrides: formValues?.sectionOverrides || {},
    styleConfig: formValues?.styleConfig || {},
    companyLogo: getMediaUrlForPreview(formValues?.companyLogo),
      heroImages: (formValues?.heroImages || [])
        .map((item: unknown) => getMediaUrlForPreview(item))
        .filter(Boolean),
      about: (formValues?.about || [])
        .map((item: any) => String(item?.text || "").trim())
        .filter(Boolean),
      aboutTitle: String(formValues?.aboutTitle || "").trim(),
      aboutPageIntro: String(formValues?.aboutPageIntro || "").trim(),
      aboutPageOverview: String(formValues?.aboutPageOverview || "").trim(),
      aboutPageStory: String(formValues?.aboutPageStory || "").trim(),
      aboutPageMission: String(formValues?.aboutPageMission || "").trim(),
      aboutPageVision: String(formValues?.aboutPageVision || "").trim(),
      aboutPageValues: String(formValues?.aboutPageValues || "").trim(),
      aboutPageTeamHeading: String(formValues?.aboutPageTeamHeading || "").trim(),
      aboutPageImageCards: (formValues?.aboutPageImageCards || []).map((card: any) => ({
        title: String(card?.title || "").trim(),
        description: String(card?.description || "").trim(),
        image: getMediaUrlForPreview(card?.image),
        enabled: card?.enabled !== false,
      })),
      productSectionTitle:
        String(formValues?.productTitle || "").trim() || "Our Products",
      products: (formValues?.products || []).map((item: any) => ({
        name: String(item?.name || "").trim(),
        type: String(item?.type || "").trim(),
        cost: String(item?.cost || "").trim(),
        description: String(item?.description || "").trim(),
        enabled: item?.enabled !== false,
        images: (item?.files || [])
          .map((fileItem: unknown) => getMediaUrlForPreview(fileItem))
          .filter(Boolean),
      })),
      meetingRooms: (formValues?.meetingRooms || formValues?.rooms || []).map((item: any) => ({
        title: String(item?.title || "").trim(),
        price: String(item?.price || "").trim(),
        description: String(item?.description || "").trim(),
        enabled: item?.enabled !== false,
        images: (item?.images || [])
          .map((imageItem: unknown) => getMediaUrlForPreview(imageItem))
          .filter(Boolean),
      })),
      rooms: (formValues?.rooms || []).map((item: any) => ({
        title: String(item?.title || "").trim(),
        price: String(item?.price || "").trim(),
        description: String(item?.description || "").trim(),
        enabled: item?.enabled !== false,
        images: (item?.images || [])
          .map((imageItem: unknown) => getMediaUrlForPreview(imageItem))
          .filter(Boolean),
      })),
      coLivingRooms: (formValues?.coLivingRooms || []).map((item: any) => ({
        title: String(item?.title || "").trim(),
        price: String(item?.price || "").trim(),
        description: String(item?.description || "").trim(),
        enabled: item?.enabled !== false,
        images: (item?.images || [])
          .map((imageItem: unknown) => getMediaUrlForPreview(imageItem))
          .filter(Boolean),
      })),
      packages: (formValues?.packages || []).map((item: any) => ({
        title: String(item?.title || "").trim(),
        price: String(item?.price || "").trim(),
        duration: String(item?.duration || "").trim(),
        description: String(item?.description || "").trim(),
        enabled: item?.enabled !== false,
        images: (item?.images || [])
          .map((imageItem: unknown) => getMediaUrlForPreview(imageItem))
          .filter(Boolean),
      })),
      dorms: (formValues?.dorms || []).map((item: any) => ({
        title: String(item?.title || "").trim(),
        capacity: item?.capacity,
        price: String(item?.price || "").trim(),
        description: String(item?.description || "").trim(),
        enabled: item?.enabled !== false,
        images: (item?.images || [])
          .map((imageItem: unknown) => getMediaUrlForPreview(imageItem))
          .filter(Boolean),
      })),
      productPages: (formValues?.productDropdownPages || []).map((item: any, index: number) => ({
        name: String(item?.name || "").trim(),
        slug: String(item?.slug || "").trim().toLowerCase(),
        enabled: item?.enabled !== false,
        heroEnabled: item?.heroEnabled !== false,
        inclusionsEnabled: item?.inclusionsEnabled !== false,
        faqEnabled: item?.faqEnabled !== false,
        heading: String(item?.homeCardHeading || item?.name || "").trim(),
        subText: String(item?.homeCardSubText || "").trim(),
        cardImage:
          getMediaUrlForPreview(item?.homeCardImage) ||
          getMediaUrlForPreview(formValues?.products?.[index]?.files?.[0]),
        heroHeading: String(item?.heroHeading || "").trim(),
        heroSubHeading: String(item?.heroSubHeading || "").trim(),
        heroButtonText: String(item?.heroButtonText || "View More").trim(),
        heroMode: String(item?.heroMode || "single").trim().toLowerCase(),
        heroImage: getMediaUrlForPreview(item?.heroImage),
        heroImages: (item?.heroImages || [])
          .map((heroItem: unknown) => getMediaUrlForPreview(heroItem))
          .filter(Boolean),
        leadEnabled: item?.leadEnabled !== false,
        leadFormLabel: String(item?.leadFormLabel || "").trim(),
        faqs: Array.isArray(item?.faqs) ? item.faqs.map((faq: any) => ({ question: String(faq?.question || "").trim(), answer: String(faq?.answer || "").trim() })).filter((faq: any) => faq.question) : [],
        inclusions: Array.isArray(item?.inclusions) ? item.inclusions : [],
      })),
      productDropdownPages: (formValues?.productDropdownPages || []).map((item: any, index: number) => ({
        name: String(item?.name || "").trim(),
        slug: String(item?.slug || "").trim().toLowerCase(),
        enabled: item?.enabled !== false,
        heroEnabled: item?.heroEnabled !== false,
        inclusionsEnabled: item?.inclusionsEnabled !== false,
        faqEnabled: item?.faqEnabled !== false,
        heroHeading: String(item?.heroHeading || "").trim(),
        heroSubHeading: String(item?.heroSubHeading || "").trim(),
        heroMode: String(item?.heroMode || "single").trim().toLowerCase(),
        heroButtonText: String(item?.heroButtonText || "").trim(),
        homeCardHeading: String(item?.homeCardHeading || item?.name || "").trim(),
        homeCardSubText: String(item?.homeCardSubText || "").trim(),
        cardImage:
          getMediaUrlForPreview(item?.homeCardImage) ||
          getMediaUrlForPreview(formValues?.products?.[index]?.files?.[0]),
        homeCardImage: getMediaUrlForPreview(item?.homeCardImage),
        heroImage: getMediaUrlForPreview(item?.heroImage),
        heroImages: (item?.heroImages || [])
          .map((heroItem: unknown) => getMediaUrlForPreview(heroItem))
          .filter(Boolean),
        leadEnabled: item?.leadEnabled !== false,
        leadFormLabel: String(item?.leadFormLabel || "").trim(),
        faqs: Array.isArray(item?.faqs) ? item.faqs.map((faq: any) => ({ question: String(faq?.question || "").trim(), answer: String(faq?.answer || "").trim() })).filter((faq: any) => faq.question) : [],
        inclusions: Array.isArray(item?.inclusions) ? item.inclusions : [],
      })),
      menuItems: (formValues?.menuItems || []).map((item: any) => ({
        category: String(item?.category || "").trim(),
        name: String(item?.name || "").trim(),
        price: String(item?.price || "").trim(),
        description: String(item?.description || "").trim(),
        enabled: item?.enabled !== false,
        image: getMediaUrlForPreview(item?.image),
      })),
      galleryTitle: String(formValues?.galleryTitle || "Gallery").trim(),
      inclusions: Array.isArray(formValues?.inclusions) ? formValues.inclusions : [],
      faqs: Array.isArray(formValues?.faqs) ? formValues.faqs.map((faq: any) => ({ question: String(faq?.question || "").trim(), answer: String(faq?.answer || "").trim(), enabled: faq?.enabled !== false })).filter((faq: any) => faq.question) : [],
      logoCarousel: {
        enabled: formValues?.logoCarousel?.enabled === true,
        title: String(formValues?.logoCarousel?.title || "").trim(),
        logos: (formValues?.logoCarousel?.logos || [])
          .map((item: unknown) => getMediaUrlForPreview(item))
          .filter(Boolean),
      },
      // Disabled gallery images are dropped from the preview payload entirely, since
      // the live site only ever needs a flat list of URLs to display.
      gallery: (formValues?.gallery || [])
        .filter((item: any) => item instanceof File || item?.enabled !== false)
        .map((item: unknown) => getMediaUrlForPreview(item))
        .filter(Boolean),
      testimonialTitle: String(formValues?.testimonialTitle || "Testimonials").trim(),
      testimonials: (formValues?.testimonials || []).map((item: any) => ({
        name: String(item?.name || "").trim(),
        role: String(item?.jobPosition || "").trim(),
        text: String(item?.testimony || "").trim(),
        rating: Number(item?.rating || 5),
      })),
      testimonialsSuccessMessage: String(
        formValues?.testimonialsSuccessMessage || "Thank you. Your review has been submitted for approval.",
      ).trim(),
      testimonialsEnableWriteReview: formValues?.testimonialsEnableWriteReview !== false,
      contactTitle: String(formValues?.contactTitle || "Contact Us").trim(),
      registeredCompanyName: String(formValues?.registeredCompanyName || "").trim(),
      copyrightText: String(formValues?.copyrightText || "").trim(),
      socials: normalizeSocials(formValues?.socials),
      email: String(formValues?.websiteEmail || "").trim(),
      phone: String(formValues?.phone || "").trim(),
      address: String(formValues?.address || "").trim(),
      mapUrl: String(formValues?.mapUrl || "").trim(),
      contactEnableInquiryForm: formValues?.contactEnableInquiryForm !== false,
      pageNavItems: (formValues?.pageNavItems || []).map((item: any) => ({
        name: String(item?.name || "").trim(),
        slug: String(item?.slug || "").trim().toLowerCase(),
        enabled: item?.enabled !== false,
      })),
      navItems: (formValues?.pageNavItems || []).map((item: any) => ({
        name: String(item?.name || "").trim(),
        slug: String(item?.slug || "").trim().toLowerCase(),
        enabled: item?.enabled !== false,
      })),
      partnerPageHeading: String(formValues?.partnerPageHeading || "").trim(),
      partnerPageContent: String(formValues?.partnerPageContent || "").trim(),
      partnerFormTitle: String(formValues?.partnerFormTitle || "").trim(),
      careersPageHeading: String(formValues?.careersPageHeading || "").trim(),
      careersPageIntro: String(formValues?.careersPageIntro || "").trim(),
      careersFormFields: Array.isArray(formValues?.careersFormFields)
        ? formValues.careersFormFields
        : tryParseJson(formValues?.careersFormFields, []),
      founders: (formValues?.founders || []).map((item: any) => ({
        name: String(item?.name || "").trim(),
        role: String(item?.role || "").trim(),
        bio: String(item?.bio || "").trim(),
        highlights: String(item?.highlights || "").trim(),
        image: getMediaUrlForPreview(item?.image),
      })),
      generatedAt: Date.now(),
    };
  };

  const getPreviewPath = () => "/website-preview";

  const openPreview = () => {
    const currentValues = getValues();
    const payload = getPreviewPayloadFromValues(currentValues);
    localStorage.setItem(LIVE_PREVIEW_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event("website-preview-draft-updated"));
    const livePreviewUrl = `${window.location.origin}${getPreviewPath()}`;
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      toast.error("Preview popup was blocked. Please allow popups for this site.");
      return;
    }
    previewWindow.opener = null;
    previewWindow.location.href = livePreviewUrl;
  };

  useEffect(() => {
    const payload = getPreviewPayloadFromValues(values);
    localStorage.setItem(LIVE_PREVIEW_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event("website-preview-draft-updated"));
  }, [getPreviewPayloadFromValues, values, prefillCompanyName]);

  const { mutate: saveWebsiteDraft } = useMutation({
    mutationKey: ["save-website-draft", prefillCompanyId || prefillCompanyName || selectedVertical],
    mutationFn: async (draftPayload: FormData) => {
      const res = await axios.post("/api/editor/save-website-draft", draftPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      lastDraftSnapshotRef.current = pendingDraftSnapshotRef.current;
      pendingDraftSnapshotRef.current = "";
      pendingDraftFileKeysRef.current.forEach((key) =>
        uploadedDraftFileKeysRef.current.add(key),
      );
      pendingDraftFileKeysRef.current = [];
      setDraftTemplateId(String(data?.template?._id || ""));
      setDraftUpdatedAt(data?.template?.draftUpdatedAt || null);
      setDraftStatus("saved");

      // Sync back persisted images from the saved template so the form reflects S3 URLs
      // (founder images, logo carousel logos) rather than keeping stale File blobs.
      const savedTemplate = data?.template;
      if (savedTemplate) {
        // Founder images
        if (Array.isArray(savedTemplate.founders) && savedTemplate.founders.length) {
          const currentFounders = getValues("founders") || [];
          const mergedFounders = currentFounders.map((founder: any, idx: number) => {
            const savedFounder = savedTemplate.founders[idx];
            if (savedFounder?.image?.url) {
              return { ...founder, image: savedFounder.image };
            }
            return founder;
          });
          setValue("founders", mergedFounders, { shouldDirty: false });
        }
        // Logo carousel logos
        if (Array.isArray(savedTemplate.logoCarousel?.logos) && savedTemplate.logoCarousel.logos.length) {
          const currentLogos = getValues("logoCarousel.logos") || [];
          const mergedLogos = savedTemplate.logoCarousel.logos.map((saved: any, idx: number) => {
            const current = currentLogos[idx];
            // Keep File objects if they're newer than saved; otherwise use saved S3 object
            if (current instanceof File) return current;
            return saved;
          });
          setValue("logoCarousel.logos", mergedLogos, { shouldDirty: false });
        }
      }
    },
    onError: () => {
      pendingDraftSnapshotRef.current = "";
      pendingDraftFileKeysRef.current = [];
      setDraftStatus("error");
    },
  });

  useEffect(() => {
    if (isCheckingExistingWebsite || !draftHydrationReadyRef.current) return;

    const companyName = String(values?.companyName || prefillCompanyName || "").trim();
    if (!companyName) return;

    const draftData = buildDraftFormDataFromValues(values, {
      companyId: prefillCompanyId,
      companyName: prefillCompanyName,
    });

    if (!hasMeaningfulDraftContent(draftData)) return;

    const snapshot = JSON.stringify(draftData);
    if (snapshot === lastDraftSnapshotRef.current) return;

    const timeoutId = window.setTimeout(() => {
      setDraftStatus("saving");
      pendingDraftSnapshotRef.current = snapshot;
      const fd = new FormData();
      fd.set("companyId", String(prefillCompanyId || draftData?.companyId || "").trim());
      fd.set("workspaceId", String(workspaceId || "").trim());
      fd.set("companyName", companyName);
      fd.set(
        "registeredCompanyName",
        String(draftData?.registeredCompanyName || companyName).trim(),
      );
      fd.set("searchKey", toSearchKey(companyName));
      fd.set("draftData", JSON.stringify(draftData));

      const pendingFileKeys: string[] = [];
      const getFileKey = (file: File) =>
        `${file.name}__${file.size}__${file.lastModified}`;
      const appendDraftFileOnce = (fieldName: string, file?: File | null) => {
        if (!file) return;
        const key = `${fieldName}::${getFileKey(file)}`;
        if (uploadedDraftFileKeysRef.current.has(key)) return;
        fd.append(fieldName, file);
        pendingFileKeys.push(key);
      };

      appendDraftFileOnce("companyLogo", values?.companyLogo as File | null);
      (values?.heroImages || []).forEach((file: File) =>
        appendDraftFileOnce("heroImages", file),
      );
      (values?.gallery || []).forEach((file: File) =>
        appendDraftFileOnce("gallery", file),
      );
      (values?.aboutPageImages || []).forEach((file: File) =>
        appendDraftFileOnce("aboutPageImages", file),
      );
      (values?.aboutPageImageCards || []).forEach((card: any, index: number) =>
        appendDraftFileOnce(`aboutPageImageCardImage_${index}`, card?.image as File | null),
      );
      (values?.aboutPageImageCards || []).forEach((card: any) =>
        appendDraftFileOnce("aboutPageImages", card?.image as File | null),
      );
      (values?.productDropdownPages || []).forEach((page: any, index: number) => {
        appendDraftFileOnce(`productPageHeroImage_${index}`, page?.heroImage as File | null);
        appendDraftFileOnce(
          `productPageHomeCardImage_${index}`,
          page?.homeCardImage as File | null,
        );
        (page?.heroImages || []).forEach((file: File) =>
          appendDraftFileOnce(`productPageHeroImages_${index}`, file),
        );
      });
      (values?.menuItems || []).forEach((item: any, i: number) => {
        appendDraftFileOnce(`draftMenuItemImage_${i}`, item?.image as File | null);
      });
      (values?.rooms || []).forEach((item: any, i: number) => {
        (item?.images || []).forEach((file: File, j: number) =>
          appendDraftFileOnce(`draftRoomImages_${i}_${j}`, file),
        );
      });
      (values?.meetingRooms || []).forEach((item: any, i: number) => {
        (item?.images || []).forEach((file: File, j: number) =>
          appendDraftFileOnce(`draftMeetingRoomImages_${i}_${j}`, file),
        );
      });
      (values?.coLivingRooms || []).forEach((item: any, i: number) => {
        (item?.images || []).forEach((file: File, j: number) =>
          appendDraftFileOnce(`draftCoLivingRoomImages_${i}_${j}`, file),
        );
      });
      (values?.packages || []).forEach((item: any, i: number) => {
        (item?.images || []).forEach((file: File, j: number) =>
          appendDraftFileOnce(`draftPackageImages_${i}_${j}`, file),
        );
      });
      (values?.dorms || []).forEach((item: any, i: number) => {
        (item?.images || []).forEach((file: File, j: number) =>
          appendDraftFileOnce(`draftDormImages_${i}_${j}`, file),
        );
      });
      (values?.products || []).forEach((item: any, i: number) => {
        (item?.files || []).forEach((file: File, j: number) =>
          appendDraftFileOnce(`draftProductImages_${i}_${j}`, file),
        );
      });

      // Founder images
      (values?.founders || []).forEach((founder: any, index: number) => {
        const img = founder?.image;
        if (img instanceof File) appendDraftFileOnce(`founderImage_${index}`, img);
      });

      // Logo carousel logos
      (values?.logoCarousel?.logos || []).forEach((file: any) => {
        if (file instanceof File) appendDraftFileOnce(`logoCarouselLogos`, file);
      });

      pendingDraftFileKeysRef.current = pendingFileKeys;
      saveWebsiteDraft(fd);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [
    values,
    saveWebsiteDraft,
    isCheckingExistingWebsite,
    prefillCompanyId,
    prefillCompanyName,
    workspaceId,
    selectedVertical,
    getPreviewPayloadFromValues,
  ]);

  const { mutate: createWebsite, isLoading: isCreateWebsiteLoading } =
    useMutation({
      mutationKey: ["create-website"],
      mutationFn: async (fd) => {
        const res = await axios.post("/api/editor/create-website", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
      },
      onSuccess: async (data) => {
        setIsRedirectingAfterCreate(true);
        setDraftStatus("idle");
        setDraftTemplateId("");
        setDraftUpdatedAt(null);
        lastDraftSnapshotRef.current = "";
        uploadedDraftFileKeysRef.current.clear();
        pendingDraftFileKeysRef.current = [];
        const createdTemplateId = String(data?.template?._id || "").trim();
        const resolvedWorkspaceId = String(
          workspaceId || data?.template?.workspaceId || "",
        ).trim();
        let publishSucceeded = false;
        if (createdTemplateId && resolvedWorkspaceId) {
          try {
            await axios.post("/api/editor/publish-website", {
              workspaceId: resolvedWorkspaceId,
              websiteId: createdTemplateId,
            });
            publishSucceeded = true;
          } catch (publishError) {
            toast.error(
              publishError?.response?.data?.message ||
                "Website created, but publish failed.",
            );
          }
        }
        if (publishSucceeded) {
          const publishedSearchKey =
            String(data?.template?.searchKey || "").trim() || toSearchKey(prefillCompanyName);
          if (publishedSearchKey) {
            const url = `https://${publishedSearchKey}.wono.co`;
            setPublishedWebsiteUrl(url);
          }
          toast.success("Website created and published successfully");
        } else {
          toast.success("Website created successfully");
        }
        window.dispatchEvent(new Event("credits:refresh"));
        const createdSearchKey = String(data?.template?.searchKey || "").trim();
        const nextSearchKey = createdSearchKey || toSearchKey(prefillCompanyName);
        navigate(
          `${builderBasePath}/edit-website/${encodeURIComponent(nextSearchKey)}`,
          { state: { searchKey: nextSearchKey } },
        );
      },
      onError: (err) => {
        setIsRedirectingAfterCreate(false);
        if (err?.response?.status === 403 && err?.response?.data?.error === "no_credits_remaining") {
          const resetDate = err?.response?.data?.resetDate
            ? new Date(err.response.data.resetDate).toLocaleDateString()
            : "-";
          toast.error(
            `You've used all available credits for this month. Your credits reset on ${resetDate}.`,
          );
          return;
        }

        const duplicateKey = err?.response?.data?.duplicateKey;
        const duplicateSearchKey = String(
          duplicateKey?.searchKey || err?.response?.data?.template?.searchKey || "",
        ).trim();
        if (duplicateSearchKey) {
          setHasExistingWebsite(true);
          toast.info("Template already exists. Opening Edit Website.");
          navigate(
            `${builderBasePath}/edit-website/${encodeURIComponent(duplicateSearchKey)}`,
            { state: { searchKey: duplicateSearchKey } },
          );
          return;
        }

        toast.error(err?.response?.data?.message || "Failed to create website");
        console.log(err?.response?.data?.message || err.message);
      },
    });

  const { mutate: updateWebsite, isLoading: isUpdateWebsiteLoading } =
    useMutation({
      mutationKey: ["update-website"],
      mutationFn: async (fd) => {
        const res = await axios.patch("/api/editor/edit-website", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
      },
      onSuccess: async (data) => {
        setIsRedirectingAfterCreate(true);
        setDraftStatus("idle");
        setDraftTemplateId("");
        setDraftUpdatedAt(null);
        lastDraftSnapshotRef.current = "";
        uploadedDraftFileKeysRef.current.clear();
        pendingDraftFileKeysRef.current = [];
        const updatedTemplateId = String(data?.template?._id || "").trim();
        const resolvedWorkspaceId = String(
          workspaceId || data?.template?.workspaceId || "",
        ).trim();
        let publishSucceeded = false;
        if (updatedTemplateId && resolvedWorkspaceId) {
          try {
            await axios.post("/api/editor/publish-website", {
              workspaceId: resolvedWorkspaceId,
              websiteId: updatedTemplateId,
            });
            publishSucceeded = true;
          } catch (publishError) {
            toast.error(
              publishError?.response?.data?.message ||
                "Website updated, but publish failed.",
            );
          }
        }
        if (publishSucceeded) {
          const publishedSearchKey =
            String(data?.template?.searchKey || "").trim() || toSearchKey(prefillCompanyName);
          if (publishedSearchKey) {
            const url = `https://${publishedSearchKey}.wono.co`;
            setPublishedWebsiteUrl(url);
          }
          toast.success("Website updated and published successfully");
        } else {
          toast.success("Website updated successfully");
        }
        window.dispatchEvent(new Event("credits:refresh"));
      },
      onError: (err) => {
        setIsRedirectingAfterCreate(false);
        if (err?.response?.status === 403 && err?.response?.data?.error === "no_credits_remaining") {
          const resetDate = err?.response?.data?.resetDate
            ? new Date(err.response.data.resetDate).toLocaleDateString()
            : "-";
          toast.error(
            `You've used all available credits for this month. Your credits reset on ${resetDate}.`,
          );
          return;
        }
        toast.error(err?.response?.data?.message || "Failed to update website");
      },
    });

  const isWebsiteSubmitting = effectiveEditMode
    ? isUpdateWebsiteLoading
    : isCreateWebsiteLoading;

  const handleReset = () => {
    const node = formRef.current;
    node && node.reset();
    reset();
  };

  const resetFormToEmpty = () => {
    formRef.current?.reset(); // clears native file inputs

    reset({
      companyId: prefillCompanyId,
      companyName: prefillCompanyName,

      title: "",
      subTitle: "",
      CTAButtonText: "",
      companyLogo: null,
      heroImages: [],
      gallery: [],

      about: [{ text: "" }],
      aboutTitle: "",

      productTitle: "",
      products: [defaultProduct],

      galleryTitle: "",

      testimonialTitle: "",
      testimonials: [defaultTestimonial],

      contactTitle: "",
      mapUrl: "",
      websiteEmail: "",
      phone: "",
      address: "",

      registeredCompanyName: "",
      copyrightText: "",
      socials: buildDefaultSocials(),
    });
  };

  const daysLeftForRenew = creditsResetDate
    ? Math.max(0, Math.floor((() => {
        const reset = new Date(creditsResetDate);
        const now = new Date();
        const resetStart = new Date(
          reset.getFullYear(),
          reset.getMonth(),
          reset.getDate(),
          0,
          0,
          0,
          0,
        );
        const nowStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0,
        );
        return (resetStart.getTime() - nowStart.getTime()) / (1000 * 60 * 60 * 24);
      })()))
    : "-";
  const creditResetText = creditsResetDate
    ? (() => {
        const d = new Date(creditsResetDate);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}, 12:00 AM`;
      })()
    : "-";
  const activeMainPageSlug = String(
    watch(`pageNavItems.${activeMainPageTab}.slug`) || "home",
  )
    .trim()
    .toLowerCase();

  // Jumps the editor to the Home tab's global FAQ block, since FAQs are edited
  // once on Home but shown on every product page.
  const goToHomeFaqSection = () => {
    setActiveMainPageTab(homePageNavIndex >= 0 ? homePageNavIndex : 0);
    window.setTimeout(() => {
      document.getElementById("home-faq-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Predefined pages the "Select Page" dropdown offers, minus ones already added —
  // once a page is added it drops off the list; it's removed again via the tab's "x".
  const availableProductPageOptions = Array.from(
    new Set([
      ...DEFAULT_PRODUCT_DROPDOWN_PAGES,
      ...(values?.products || [])
        .map((item) => String(item?.type || "").trim())  // use type as heading, not name
        .filter(Boolean),
    ]),
  ).filter(
    (option) =>
      !(values?.productDropdownPages || []).some(
        (item) => String(item?.slug || "").trim().toLowerCase() === toSlug(option),
      ),
  );

  const DEFAULT_PRODUCT_PAGE_INCLUSION_KEYS = [
    "workspace","living-space","air-condition","fast-internet","cafe-dining","receptionist",
    "meeting-rooms","training-rooms","it-support","tea-coffee","assist","community",
    "on-demand","maintenance","generator","pickup-drop","car-bike-bus","housekeeping",
    "swimming-pool","television","gas","laundry","secure","personalised",
    "electricity","ups","events","furnished-office","cafeteria","high-speed-internet","assistance",
  ];

  // Adds a product page for the given name (predefined preset or custom), then
  // switches to it. Used by both the "Select Page" dropdown and "+ Add New Page".
  const addProductPage = (name: string) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;
    const slug = toSlug(trimmed);
    const existingIndex = (values?.productDropdownPages || []).findIndex(
      (item) => String(item?.slug || "").trim().toLowerCase() === slug,
    );
    if (existingIndex >= 0) {
      setActiveProductPageTab(existingIndex);
      return;
    }
    appendProductPageItem({
      name: trimmed,
      slug,
      enabled: true,
      heroHeading: trimmed,
      heroSubHeading: "",
      heroMode: "single",
      heroImage: null,
      heroButtonText: "View More",
      heroImages: [],
      homeCardHeading: trimmed,
      homeCardSubText: "",
      homeCardImage: null,
      leadEnabled: !isMenuPageSlug(slug),
      leadFormLabel: isMenuPageSlug(slug)
        ? "Menu Inquiry Disabled"
        : "View More / Get Details",
      faqs: [],
      inclusions: DEFAULT_PRODUCT_PAGE_INCLUSION_KEYS.map((k) => ({ key: k, enabled: false })),
    });
    setActiveProductPageTab(productPageFields.length);
  };

  // "+ Add New Page" seeds a blank "Product N" page, incrementing past any name
  // already in use so re-adding after a removal doesn't collide.
  const addNewBlankProductPage = () => {
    let n = (values?.productDropdownPages || []).length + 1;
    let name = `Product ${n}`;
    while (
      (values?.productDropdownPages || []).some(
        (item) => String(item?.slug || "").trim().toLowerCase() === toSlug(name),
      )
    ) {
      n += 1;
      name = `Product ${n}`;
    }
    addProductPage(name);
  };

  const removeProductPageAt = (index: number) => {
    removeProductPageItem(index);
    setActiveProductPageTab((prev) => {
      if (prev > index) return prev - 1;
      if (prev === index) return Math.max(0, index - 1);
      return prev;
    });
  };
  const legacyHomeProductsEditorEnabled = Boolean(
    values?.__legacyHomeProductsEditorEnabled,
  );

  if (isCheckingExistingWebsite) {
    return <WebsiteBuilderEditorSkeleton />;
  }

  if (editingLockPending) {
    return <WebsiteBuilderEditorSkeleton />;
  }

  if (editingConflict) {
    const source = editingConflict?.lock?.source === "master-panel" ? "Master Panel" : "HostPanel";
    return (
      <PageFrame>
        <div className="m-4 rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-title font-pmedium">Website editing is in progress</h2>
          <p className="mt-2 text-sm">
            {editingConflict?.lock?.editorName || "Someone"} is currently editing this website from {source}.
            This editor is locked to prevent either person from overwriting the other&apos;s changes.
          </p>
          <p className="mt-2 text-xs text-amber-800">The lock clears automatically if that editor disconnects.</p>
        </div>
      </PageFrame>
    );
  }

  return (
    <div className="pb-2 min-w-0 overflow-x-hidden">
      <div className="p-4 flex flex-col gap-4 min-w-0">
        <PageFrame>
          <div className="flex flex-col gap-5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-title font-pmedium text-primary uppercase">
                {effectiveEditMode ? "Edit Website" : "Create Website"}
              </h2>
              <div className="flex flex-col items-end gap-1">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {selectedVerticalBadgeText}
                </span>
                <p className="text-[11px] text-slate-500">
                  {draftStatus === "saving"
                    ? "Saving draft..."
                    : draftStatus === "saved"
                      ? `Draft saved${draftUpdatedAt ? ` at ${new Date(draftUpdatedAt).toLocaleTimeString()}` : ""}`
                      : draftStatus === "error"
                        ? "Draft save failed. Changes are still in the form."
                        : hasRestoredDraft
                          ? "Draft restored from your last session."
                          : "Draft autosave starts as you build."}
                </p>
              </div>
            </div>

            <form
              ref={formRef}
              encType="multipart/form-data"
              onSubmit={(e) => e.preventDefault()}
              className="min-w-0 w-full"
            >
          <div className="mb-4 min-w-0 overflow-hidden">
            <div className="border-b-default border-borderGray py-4">
              <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Website Pages <SectionPreviewInfo section="pages" /></span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              {pageNavFields.map((item, index) => {
                const tabSlug = String(watch(`pageNavItems.${index}.slug`) || "").trim().toLowerCase();
                const isCareersTab = tabSlug === "careers";
                const isLocked = isCareersTab && !hasExistingWebsite;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        toast.error("Please create your website first to unlock the Careers page settings.");
                        return;
                      }
                      setActiveMainPageTab(index);
                    }}
                    className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                      isLocked
                        ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400"
                        : activeMainPageTab === index
                          ? "bg-[#2563EB] text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {isLocked ? (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      ) : null}
                      {watch(`pageNavItems.${index}.name`) || `Page ${index + 1}`}
                    </div>
                  </button>
                );
              })}
            </div>

            {String(watch(`pageNavItems.${activeMainPageTab}.slug`) || "")
              .trim()
              .toLowerCase() === "products" ? (
              <div className="mt-4 min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-default border-borderGray py-4">
                  <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Products Page Settings <SectionPreviewInfo section="productsPage" /></span>
                  {productsPageNavIndex >= 0 ? (
                    <div>
                      <Controller
                        name={`pageNavItems.${productsPageNavIndex}.enabled`}
                        control={control}
                        render={({ field }) => (
                          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={field.value !== false}
                              onChange={(event) => field.onChange(event.target.checked)}
                            />
                            Show Products page on website
                          </label>
                        )}
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-shrink-0 items-center gap-2 flex-wrap">
                    <TextField
                      select
                      size="small"
                      label="Select Page"
                      displayEmpty
                      value={selectedProductPageOption}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "__new__") {
                          addNewBlankProductPage();
                        } else {
                          addProductPage(value);
                        }
                        setSelectedProductPageOption("");
                      }}
                      sx={{ minWidth: 200 }}
                    >
                      <MenuItem value="" disabled>
                        Select Page
                      </MenuItem>
                      {availableProductPageOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                      <MenuItem value="__new__" className="text-accent font-pmedium">
                        + Add New Page
                      </MenuItem>
                    </TextField>
                  </div>
                </div>
                <p className="mb-3 border-b border-slate-200 pb-2 text-xs text-slate-500">
                  Pick a preset from the dropdown to add it instantly, or choose "+ Add New Page" for a custom one. Use the × on a tab to remove a page.
                </p>
                {productPageFields.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
                      {productPageFields.map((item, index) => (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setActiveProductPageTab(index)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") setActiveProductPageTab(index);
                          }}
                          className={`flex flex-1 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                            activeProductPageTab === index
                              ? "bg-[#2563EB] text-white shadow-sm"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <span className="flex-1 truncate">
                            {watch(`productDropdownPages.${index}.name`) || `Product Page ${index + 1}`}
                          </span>
                          <button
                            type="button"
                            title="Remove page"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingRemoveProductPageIndex(index);
                            }}
                            className={`shrink-0 rounded-full px-2 leading-none hover:bg-black/10 ${
                              activeProductPageTab === index ? "text-white" : "text-slate-400 hover:text-red-500"
                            }`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <Dialog
                      open={pendingRemoveProductPageIndex !== null}
                      onClose={() => setPendingRemoveProductPageIndex(null)}
                      fullWidth
                      maxWidth="xs"
                      PaperProps={{ sx: { borderRadius: 3 } }}
                    >
                      <DialogTitle sx={{ pb: 1 }}>
                        <span className="text-lg font-semibold text-slate-900">Delete this page?</span>
                      </DialogTitle>
                      <DialogContent>
                        <p className="text-sm text-slate-600">
                          {pendingRemoveProductPageIndex !== null
                            ? `"${watch(`productDropdownPages.${pendingRemoveProductPageIndex}.name`) || "This page"}" and all its content will be permanently deleted. This cannot be undone.`
                            : ""}
                        </p>
                      </DialogContent>
                      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                        <button
                          type="button"
                          onClick={() => setPendingRemoveProductPageIndex(null)}
                          className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeProductPageAt(pendingRemoveProductPageIndex);
                            setPendingRemoveProductPageIndex(null);
                          }}
                          className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-red-700 transition-all"
                        >
                          Yes, Delete
                        </button>
                      </DialogActions>
                    </Dialog>

                    {productPageFields[activeProductPageTab] ? (
                      <div className="mt-3 grid grid-cols-1 gap-3">
                        <div>
                          <div className="border-b-default border-borderGray py-4 flex items-center justify-between">
                            <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Product Page Details <SectionPreviewInfo section="productDetails" /></span>
                            <SectionToggle name={`productDropdownPages.${activeProductPageTab}.enabled`} control={control} />
                          </div>
                          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                          <Controller
                            name={`productDropdownPages.${activeProductPageTab}.name`}
                            control={control}
                            render={({ field }) => (
                              <TextField {...field} size="small" label="Product Page Name" fullWidth />
                            )}
                          />
                          <Controller
                            name={`productDropdownPages.${activeProductPageTab}.slug`}
                            control={control}
                            render={({ field }) => (
                              <TextField {...field} size="small" label="Product Page Route Slug" fullWidth />
                            )}
                          />
                          </div>
                        </div>

                        <div>
                          <div className="py-2 border-b-default border-borderGray flex items-center justify-between">
                            <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Product Page Hero <SectionPreviewInfo section="heroBanner" /></span>
                            <SectionToggle name={`productDropdownPages.${activeProductPageTab}.heroEnabled`} control={control} />
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Controller
                              name={`productDropdownPages.${activeProductPageTab}.heroHeading`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  size="small"
                                  label="Hero Heading"
                                  fullWidth
                                />
                              )}
                            />
                            <Controller
                              name={`productDropdownPages.${activeProductPageTab}.heroSubHeading`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  size="small"
                                  label="Hero Small Text / Sub Heading"
                                  fullWidth
                                />
                              )}
                            />
                            <Controller
                              name={`productDropdownPages.${activeProductPageTab}.heroMode`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  value={field.value || "single"}
                                  onChange={(event) => field.onChange(event.target.value)}
                                  select
                                  size="small"
                                  label="Hero Mode"
                                  fullWidth
                                >
                                  <MenuItem value="single">Single Image</MenuItem>
                                  <MenuItem value="carousel">Carousel</MenuItem>
                                </TextField>
                              )}
                            />
                            <Controller
                              name={`productDropdownPages.${activeProductPageTab}.heroButtonText`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  size="small"
                                  label="Hero Button Text"
                                  fullWidth
                                />
                              )}
                            />
                            {String(
                              watch(`productDropdownPages.${activeProductPageTab}.heroMode`) ||
                                "single",
                            ) === "single" ? (
                              <Controller
                                name={`productDropdownPages.${activeProductPageTab}.heroImage`}
                                control={control}
                                render={({ field }) => (
                                  <UploadFileInput
                                    value={field.value}
                                    label="Hero Image"
                                    onChange={field.onChange}
                                    id={`product-page-hero-image-${activeProductPageTab}`}
                                  />
                                )}
                              />
                            ) : (
                              <Controller
                                name={`productDropdownPages.${activeProductPageTab}.heroImages`}
                                control={control}
                                render={({ field }) => (
                                  <UploadMultipleFilesInput
                                    {...field}
                                    name={`productDropdownPages.${activeProductPageTab}.heroImages`}
                                    label="Hero Carousel Images "
                                    maxFiles={5}
                                    allowedExtensions={["jpg", "jpeg", "png", "webp"]}
                                    id={`product-page-hero-images-${activeProductPageTab}`}
                                  />
                                )}
                              />
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="py-2 border-b-default border-borderGray">
                            <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Lead Form Behavior <SectionPreviewInfo section="leadForm" /></span>
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Controller
                              name={`productDropdownPages.${activeProductPageTab}.leadEnabled`}
                              control={control}
                              render={({ field }) => {
                                const currentSlug = String(
                                  watch(`productDropdownPages.${activeProductPageTab}.slug`) || "",
                                )
                                  .trim()
                                  .toLowerCase();
                                const isMenuPage = isMenuPageSlug(currentSlug);
                                return (
                                  <TextField
                                    select
                                    value={String(isMenuPage ? false : field.value !== false)}
                                    size="small"
                                    label="Enable Lead Form"
                                    fullWidth
                                    onChange={(event) =>
                                      field.onChange(event.target.value === "true")
                                    }
                                    disabled={isMenuPage}
                                    helperText={
                                      isMenuPage
                                        ? "Menu/Cafe pages keep lead form disabled."
                                        : "Enabled for all non-menu product pages."
                                    }
                                  >
                                    <MenuItem value={"true"}>Enabled</MenuItem>
                                    <MenuItem value={"false"}>Disabled</MenuItem>
                                  </TextField>
                                );
                              }}
                            />
                            <Controller
                              name={`productDropdownPages.${activeProductPageTab}.leadFormLabel`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  size="small"
                                  label="CTA Button Label"
                                  fullWidth
                                />
                              )}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="py-2 border-b-default border-borderGray">
                            <span className="text-subtitle font-pmedium">
                              Page Content Template (Synced with Home)
                            </span> <SectionPreviewInfo section="about" />
                          </div>
                          {(() => {
                            const currentProductPageSlug = String(
                              watch(
                                `productDropdownPages.${activeProductPageTab}.slug`,
                              ) || "",
                            )
                              .trim()
                              .toLowerCase();

                            const isCafePage = isMenuPageSlug(currentProductPageSlug);
                            const isMeetingRoomsPage = currentProductPageSlug.includes(
                              "meeting",
                            );
                            const isCoLivingPage =
                              currentProductPageSlug.includes("co-living") ||
                              currentProductPageSlug.includes("coliving");
                            const isWorkationPage =
                              currentProductPageSlug.includes("workation");
                            const isHostelPage =
                              currentProductPageSlug.includes("hostel");

                            if (isCafePage) {
                              return <MenuSection control={control} register={register} />;
                            }
                            if (isMeetingRoomsPage) {
                              return (
                                <RoomsSection
                                  control={control}
                                  register={register}
                                  fieldName="meetingRooms"
                                  sectionTitle="Meeting Rooms"
                                  itemLabel="Room"
                                  imageLabel="Room Images"
                                  priceLabel="Price per hour"
                                />
                              );
                            }
                            if (isCoLivingPage) {
                              return (
                                <RoomsSection
                                  control={control}
                                  register={register}
                                  fieldName="coLivingRooms"
                                  sectionTitle="Co-Living Spaces"
                                  itemLabel="Space"
                                  imageLabel="Space Images"
                                  priceLabel="Price per night"
                                />
                              );
                            }
                            if (isWorkationPage) {
                              return (
                                <PackagesSection control={control} register={register} />
                              );
                            }
                            if (isHostelPage) {
                              return <DormsSection control={control} register={register} />;
                            }

                            return (
                              <div className="mt-3 grid grid-cols-1 gap-4">
                                <Controller
                                  name="productTitle"
                                  control={control}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      size="small"
                                      label="Products Section Title"
                                      fullWidth
                                      inputProps={{ maxLength: CHAR_LIMITS.productTitle }}
                                    />
                                  )}
                                />
                                {productFields.map((field, index) => (
                                  <div
                                    key={`products-synced-${field.id}`}
                                    className="border-t border-borderGray pt-4 first:border-0 first:pt-0"
                                  >
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                      <span className="font-pmedium">Product {index + 1}</span>
                                      <div className="flex items-center gap-3">
                                        <SectionToggle name={`products.${index}.enabled`} control={control} />
                                        <button
                                          type="button"
                                          onClick={() => removeProduct(index)}
                                          className="text-red-500 hover:text-red-700 text-xs font-semibold transition-all"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                      <Controller
                                        name={`products.${index}.name`}
                                        control={control}
                                        render={({ field }) => (
                                          <TextField
                                            {...field}
                                            size="small"
                                            label="Product Name"
                                            fullWidth
                                          />
                                        )}
                                      />
                                      <Controller
                                        name={`products.${index}.type`}
                                        control={control}
                                        render={({ field }) => (
                                          <TextField
                                            {...field}
                                            size="small"
                                            label="Product Type"
                                            fullWidth
                                          />
                                        )}
                                      />
                                      <Controller
                                        name={`products.${index}.description`}
                                        control={control}
                                        render={({ field }) => (
                                          <TextField
                                            {...field}
                                            size="small"
                                            label="Product Description"
                                            fullWidth
                                            inputProps={{ maxLength: 200 }}
                                            helperText={`${String(field.value || "").length}/200`}
                                          />
                                        )}
                                      />
                                      <Controller
                                        name={`products.${index}.cost`}
                                        control={control}
                                        render={({ field }) => (
                                          <TextField
                                            {...field}
                                            size="small"
                                            label="Product Cost"
                                            fullWidth
                                          />
                                        )}
                                      />
                                    </div>
                                    <div className="pt-3">
                                      <Controller
                                        name={`products.${index}.files`}
                                        control={control}
                                        render={({ field }) => (
                                          <UploadMultipleFilesInput
                                            {...field}
                                            label="Product Images"
                                            maxFiles={10}
                                            allowedExtensions={[
                                              "jpg",
                                              "jpeg",
                                              "png",
                                              "webp",
                                              "pdf",
                                            ]}
                                            id={`products-synced-${index}.files`}
                                          />
                                        )}
                                      />
                                    </div>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => appendProduct({ ...defaultProduct })}
                                  className="text-[#2563EB] text-sm font-semibold hover:underline inline-flex items-center gap-1 transition-all w-fit"
                                >
                                  + Add Product
                                </button>
                              </div>
                            );
                          })()}
                        </div>

                        {/* FAQ content is global — edit from the Home/Products section — but each
                            product page decides for itself whether to show that shared FAQ list. */}
                        <div>
                          <div className="py-4 border-b-default border-borderGray flex items-center justify-between">
                            <span className="text-subtitle font-pmedium inline-flex items-center gap-2">FAQ Section <SectionPreviewInfo section="faq" /></span>
                            <SectionToggle name={`productDropdownPages.${activeProductPageTab}.faqEnabled`} control={control} />
                          </div>
                          <p className="mt-3 text-xs text-slate-500">FAQs are shared across all product pages. Edit them in the <strong>FAQ</strong> section in the Home Section Cards area below.</p>
                          <button
                            type="button"
                            onClick={goToHomeFaqSection}
                            className="mt-2 text-accent text-xs font-semibold hover:underline inline-flex items-center gap-1 transition-all"
                          >
                            Go to Home FAQ section →
                          </button>
                        </div>

                        {/* Inclusions for this product page */}
                        <div>
                          <div className="py-4 border-b-default border-borderGray flex items-center justify-between mb-3">
                            <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Inclusions Section <SectionPreviewInfo section="inclusions" /></span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400">Toggle per amenity</span>
                              <SectionToggle name={`productDropdownPages.${activeProductPageTab}.inclusionsEnabled`} control={control} />
                            </div>
                          </div>
                          <Controller
                            name={`productDropdownPages.${activeProductPageTab}.inclusions`}
                            control={control}
                            defaultValue={[]}
                            render={({ field }) => {
                              const ALL_KEYS = [
                                "workspace","living-space","air-condition","fast-internet","cafe-dining","receptionist",
                                "meeting-rooms","training-rooms","it-support","tea-coffee","assist","community",
                                "on-demand","maintenance","generator","pickup-drop","car-bike-bus","housekeeping",
                                "swimming-pool","television","gas","laundry","secure","personalised",
                                "electricity","ups","events","furnished-office","cafeteria","high-speed-internet","assistance",
                              ];
                              const ALL_LABELS: Record<string, string> = {
                                "workspace": "Workspace", "living-space": "Living Space", "air-condition": "Air Condition",
                                "fast-internet": "Fast Internet", "cafe-dining": "Cafe / Dining", "receptionist": "Receptionist",
                                "meeting-rooms": "Meeting Rooms", "training-rooms": "Training Rooms", "it-support": "IT Support",
                                "tea-coffee": "Tea & Coffee", "assist": "Assist", "community": "Community",
                                "on-demand": "On Demand", "maintenance": "Maintenance", "generator": "Generator",
                                "pickup-drop": "Pickup & Drop", "car-bike-bus": "Car / Bike / Bus", "housekeeping": "Housekeeping",
                                "swimming-pool": "Swimming Pool", "television": "Television", "gas": "Gas",
                                "laundry": "Laundry", "secure": "Secure", "personalised": "Personalised",
                                "electricity": "Electricity", "ups": "UPS", "events": "Events",
                                "furnished-office": "Furnished Office", "cafeteria": "Cafeteria",
                                "high-speed-internet": "High Speed Internet", "assistance": "Assistance",
                              };
                              const current: Array<{ key: string; enabled: boolean }> = Array.isArray(field.value)
                                ? field.value
                                : ALL_KEYS.map((k) => ({ key: k, enabled: false }));
                              const toggle = (key: string) => {
                                const exists = current.find((i) => i.key === key);
                                if (exists) {
                                  field.onChange(current.map((i) => i.key === key ? { ...i, enabled: !i.enabled } : i));
                                } else {
                                  field.onChange([...current, { key, enabled: true }]);
                                }
                              };
                              const isEnabled = (key: string) => {
                                const found = current.find((i) => i.key === key);
                                return found ? found.enabled : false;
                              };
                              return (
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                  {ALL_KEYS.map((key) => (
                                    <label key={key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${isEnabled(key) ? "border-accent bg-accent/10" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                                      <input
                                        type="checkbox"
                                        checked={isEnabled(key)}
                                        onChange={() => toggle(key)}
                                        className="h-4 w-4 rounded border-slate-300 accent-accent"
                                      />
                                      <span className={`text-[11px] font-medium ${isEnabled(key) ? "text-accent" : "text-slate-400 line-through"}`}>
                                        {ALL_LABELS[key]}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              );
                            }}
                          />
                        </div>

                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">
                    No product pages added yet. Select from dropdown and click Add Product Page.
                  </p>
                )}
              </div>
            ) : null}

            {String(watch(`pageNavItems.${activeMainPageTab}.slug`) || "")
              .trim()
              .toLowerCase() === "about-us" ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 border-b-default border-borderGray py-4">
                  <span className="text-subtitle font-pmedium inline-flex items-center gap-2">About Us Hero Section <SectionPreviewInfo section="aboutPage" /></span>
                {aboutPageNavIndex >= 0 ? (
                  <div>
                    <Controller
                      name={`pageNavItems.${aboutPageNavIndex}.enabled`}
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={field.value !== false}
                            onChange={(event) => field.onChange(event.target.checked)}
                          />
                          Show About Us page on website
                        </label>
                      )}
                    />
                  </div>
                ) : null}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div>
                    <Controller
                      name="aboutPageIntro"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          size="small"
                          label="About Page Heading / Hero Intro"
                          fullWidth
                          placeholder="About {Company Name}"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <div className="border-b-default border-borderGray py-4">
                    <span className="text-subtitle font-pmedium">
                      About Us (Synced From Home About)
                    </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Same about paragraphs are shared with Home section.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      {aboutFields.map((field, index) => (
                        <div key={`about-sync-${field.id}`}>
                          <Controller
                            name={`about.${index}.text`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                size="small"
                                label={`Shared About Paragraph ${index + 1}`}
                                fullWidth
                                multiline
                                minRows={3}
                              />
                            )}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => appendAbout({ text: "" })}
                        className="text-[#2563EB] text-sm font-semibold hover:underline inline-flex items-center gap-1 transition-all w-fit"
                      >
                        + Add Shared Paragraph
                      </button>
                    </div>
                  </div>
                  <Controller
                    name="aboutPageStory"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Our Story"
                        fullWidth
                        multiline
                        minRows={4}
                      />
                    )}
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Controller
                      name="aboutPageMission"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          size="small"
                          label="Mission"
                          fullWidth
                          multiline
                          minRows={3}
                        />
                      )}
                    />
                    <Controller
                      name="aboutPageVision"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          size="small"
                          label="Vision"
                          fullWidth
                          multiline
                          minRows={3}
                        />
                      )}
                    />
                  </div>
                  <Controller
                    name="aboutPageValues"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Values (comma separated)"
                        fullWidth
                        placeholder="Community, Trust, Transparency"
                      />
                    )}
                  />
                  <div>
                    <div className="py-2 border-b-default border-borderGray flex items-center justify-between">
                      <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Founders Section <SectionPreviewInfo section="founders" /></span>
                      <SectionToggle sectionKey="about_founders" control={control} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500 mb-3">
                      Each founder is shown with a large photo on one side and bio/highlights on the other — alternating left/right.
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-4">
                      {founderFields.map((field, index) => (
                        <div key={field.id} className="border-t border-borderGray pt-4 first:border-0 first:pt-0">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700">Founder {index + 1}</span>
                            {founderFields.length > 1 ? (
                              <button type="button" className="text-red-500 hover:text-red-700 text-xs font-semibold transition-all" onClick={() => removeFounder(index)}>
                                Remove
                              </button>
                            ) : null}
                          </div>
                          <div className="mb-4">
                            <Controller
                              name={`founders.${index}.image`}
                              control={control}
                              render={({ field }) => (
                                <UploadFileInput
                                  value={field.value}
                                  label="Founder Photo"
                                  onChange={field.onChange}
                                  id={`founder-image-${index}`}
                                />
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Controller
                              name={`founders.${index}.name`}
                              control={control}
                              render={({ field }) => (
                                <TextField {...field} size="small" label="Name & Title (e.g. John Doe – Founder & CEO)" fullWidth />
                              )}
                            />
                            <Controller
                              name={`founders.${index}.role`}
                              control={control}
                              render={({ field }) => (
                                <TextField {...field} size="small" label="Role / Designation" fullWidth />
                              )}
                            />
                          </div>
                          <div className="mt-3">
                            <Controller
                              name={`founders.${index}.bio`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  size="small"
                                  label="Bio / Description"
                                  fullWidth
                                  multiline
                                  minRows={4}
                                />
                              )}
                            />
                          </div>
                          <div className="mt-3">
                            <Controller
                              name={`founders.${index}.highlights`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  size="small"
                                  label="Highlights (one per line, e.g. – 20 Years Experience)"
                                  fullWidth
                                  multiline
                                  minRows={4}
                                  placeholder={"– 20 Years Experience\n– 15 Years in Startups\n– 4 Startups"}
                                />
                              )}
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => appendFounder({ name: "", role: "", bio: "", highlights: "", image: null })}
                        className="text-[#2563EB] text-sm font-semibold hover:underline inline-flex items-center gap-1 transition-all w-fit"
                      >
                        + Add Founder
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="py-2 border-b-default border-borderGray flex items-center justify-between">
                      <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Our Team Section <SectionPreviewInfo section="team" /></span>
                      <SectionToggle sectionKey="about_team" control={control} />
                    </div>
                    <div className="mt-4">
                      <Controller
                        name="aboutPageTeamHeading"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Our Team Heading"
                            placeholder="Our Team"
                            fullWidth
                          />
                        )}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {aboutImageCardFields.map((field, index) => (
                        <div key={field.id} className="rounded-xl border border-borderGray p-4">
                          <div className="mb-3 flex items-center justify-end">
                            <SectionToggle name={`aboutPageImageCards.${index}.enabled`} control={control} />
                          </div>
                          <div className="mb-4">
                            <Controller
                              name={`aboutPageImageCards.${index}.image`}
                              control={control}
                              render={({ field }) => (
                                <UploadFileInput
                                  value={field.value}
                                  label="Profile Image"
                                  onChange={field.onChange}
                                  id={`about-page-image-card-${index}`}
                                />
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <Controller
                              name={`aboutPageImageCards.${index}.title`}
                              control={control}
                              render={({ field }) => (
                                <TextField {...field} size="small" label="Name / Title" fullWidth />
                              )}
                            />
                            <Controller
                              name={`aboutPageImageCards.${index}.description`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  size="small"
                                  label="Role / Description"
                                  fullWidth
                                />
                              )}
                            />
                          </div>
                          {aboutImageCardFields.length > 1 ? (
                            <button
                              type="button"
                              className="mt-3 text-red-500 hover:text-red-700 text-xs font-semibold transition-all"
                              onClick={() => removeAboutImageCard(index)}
                            >
                              Remove Card
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          appendAboutImageCard({ title: "", description: "", image: null })
                        }
                        className="w-fit px-3 py-2 text-sm font-semibold text-primary md:col-span-2 xl:col-span-3"
                      >
                        + Add Team Member / Highlight
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {String(watch(`pageNavItems.${activeMainPageTab}.slug`) || "")
              .trim()
              .toLowerCase() === "gallery" ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 border-b-default border-borderGray py-4">
                  <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Gallery Hero Section <SectionPreviewInfo section="galleryPage" /></span>
                {galleryPageNavIndex >= 0 ? (
                  <div>
                    <Controller
                      name={`pageNavItems.${galleryPageNavIndex}.enabled`}
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={field.value !== false}
                            onChange={(event) => field.onChange(event.target.checked)}
                          />
                          Show Gallery page on website
                        </label>
                      )}
                    />
                  </div>
                ) : null}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <Controller
                    name="galleryPageHeading"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Gallery Heading Text"
                        placeholder="Gallery Images"
                        fullWidth
                      />
                    )}
                  />
                  <div>
                    <div className="py-2 border-b-default border-borderGray">
                      <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Gallery Images (Synced)</span>
                    </div>
                    <div className="mt-3">
                      <Controller
                        name="gallery"
                        control={control}
                        render={({ field }) => (
                          <UploadMultipleFilesInput
                            {...field}
                            name="gallery"
                            label="Gallery Images"
                            maxFiles={40}
                            allowedExtensions={["jpg", "jpeg", "png", "pdf", "webp"]}
                            id="gallery-page-synced"
                            enabledToggle
                          />
                        )}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Home preview can show first 6 images; `Show More` should navigate to `/gallery`.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {String(watch(`pageNavItems.${activeMainPageTab}.slug`) || "")
              .trim()
              .toLowerCase() === "partner" ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 border-b-default border-borderGray py-4">
                  <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Partner Page Section <SectionPreviewInfo section="partnerPage" /></span>
                {partnerPageNavIndex >= 0 ? (
                  <div>
                    <Controller
                      name={`pageNavItems.${partnerPageNavIndex}.enabled`}
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={field.value !== false}
                            onChange={(event) => field.onChange(event.target.checked)}
                          />
                          Show Partner page on website
                        </label>
                      )}
                    />
                  </div>
                ) : null}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <Controller
                    name="partnerPageHeading"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Page Heading"
                        placeholder="Become A Partner"
                        fullWidth
                      />
                    )}
                  />
                  <Controller
                    name="partnerPageContent"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Body Content (left side)"
                        placeholder="We are open to partnerships with..."
                        fullWidth
                        multiline
                        minRows={6}
                      />
                    )}
                  />
                  <Controller
                    name="partnerFormTitle"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Form Title (right side)"
                        placeholder={`Partner With ${values?.companyName || "Us"}`}
                        fullWidth
                      />
                    )}
                  />
                  <p className="text-xs text-slate-500">
                    The form fields (Name, Email, Mobile, Message + Connect button) are shown automatically on the right side.
                  </p>
                </div>
              </div>
            ) : null}

            {String(watch(`pageNavItems.${activeMainPageTab}.slug`) || "")
              .trim()
              .toLowerCase() === "careers" ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 border-b-default border-borderGray py-4">
                  <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Careers Hero Section <SectionPreviewInfo section="careersPage" /></span>
                {careersPageNavIndex >= 0 ? (
                  <div>
                    <Controller
                      name={`pageNavItems.${careersPageNavIndex}.enabled`}
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={field.value !== false}
                            onChange={(event) => field.onChange(event.target.checked)}
                          />
                          Show Careers page on website
                        </label>
                      )}
                    />
                  </div>
                ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Job openings marked as "Posted" in Recruitment will appear on this page automatically.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <Controller
                    name="careersPageHeading"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Page Heading"
                        placeholder="Join Our Team"
                        fullWidth
                      />
                    )}
                  />
                  <Controller
                    name="careersPageIntro"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Introduction Text"
                        placeholder="Tell visitors about your company and why they should join..."
                        multiline
                        minRows={6}
                        fullWidth
                      />
                    )}
                  />
                  <div>
                    <div className="border-b-default border-borderGray py-4">
                      <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Apply Now Form Layout <SectionPreviewInfo section="applyForm" /></span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Fixed fields stay in place. Custom fields can be reordered and appear after Upload CV.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-pmedium uppercase tracking-wide text-slate-500">
                          Default Fields
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {CAREERS_DEFAULT_FORM_FIELDS.map((field) => (
                            <span
                              key={field.label}
                              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700"
                            >
                              {field.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-pmedium uppercase tracking-wide text-slate-500">
                          Custom Fields
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          These are saved to the template and rendered in the same order here and on the live careers form.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="border-b-default border-borderGray py-4">
                      <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Additional Form Fields</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      These appear on the Apply Now form after the Resume upload and stay enabled.
                    </p>
                    <div className="mt-3">
                      <p className="text-[10px] font-pmedium uppercase tracking-wide text-slate-500">
                        Added Fields Preview
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {careersFieldItems.length ? (
                          careersFieldItems.map((field: any) => (
                            <span
                              key={field.fieldKey}
                              className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700"
                            >
                              {String(field.label || field.type || "Field").trim() || "Field"}
                              <span className="ml-1 text-[10px] font-medium text-slate-500">
                                ({String(field.type || "text")})
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            No additional fields added yet.
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-col gap-2">
                      {careersFieldItems.map((field: any, index: number) => (
                        <div
                          key={field.fieldKey}
                          className="flex flex-col gap-2 border-t border-borderGray py-3 first:border-0 md:flex-row md:items-center"
                        >
                          <span className="inline-flex w-fit rounded bg-slate-100 px-2 py-1 text-[10px] font-pmedium uppercase tracking-wide text-slate-500">
                            {String(field.type || "text")}
                          </span>
                          <Controller
                            name={`careersFormFields.${index}.label`}
                            control={control}
                            render={({ field: labelField }) => (
                              <TextField
                                {...labelField}
                                size="small"
                                placeholder="Field label"
                                fullWidth
                              />
                            )}
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveCareersField(index, index - 1)}
                              className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg font-pmedium text-[10px] hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              aria-label={`Move ${field.label || field.type} up`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={index === careersFieldItems.length - 1}
                              onClick={() => moveCareersField(index, index + 1)}
                              className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg font-pmedium text-[10px] hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              aria-label={`Move ${field.label || field.type} down`}
                            >
                              ↓
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCareersField(index)}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-red-500 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {!careersFieldItems.length ? (
                        <p className="text-[11px] text-slate-500">
                          No custom fields yet. Add one below and it will render after Upload CV.
                        </p>
                      ) : null}
                    </div>
                    <AddFieldPanel
                      onAdd={(fieldDef) =>
                        appendCareersField({
                          id: `field_${Date.now()}`,
                          type: fieldDef.type || "text",
                          label: fieldDef.label || "",
                          required: !!fieldDef.required,
                          options: fieldDef.options || "",
                          fullWidth: !!fieldDef.fullWidth,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {String(watch(`pageNavItems.${activeMainPageTab}.slug`) || "")
              .trim()
              .toLowerCase() === "contact-us" ? (
              <div className="mt-4">
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-3 py-2 border-b-default border-borderGray">
                      <span className="text-subtitle font-pmedium">
                        Contact Details (Synced with Home)
                      </span>
                      {contactPageNavIndex >= 0 ? (
                        <Controller
                          name={`pageNavItems.${contactPageNavIndex}.enabled`}
                          control={control}
                          render={({ field }) => (
                            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={field.value !== false}
                                onChange={(event) => field.onChange(event.target.checked)}
                              />
                              Show Contact Us page on website
                            </label>
                          )}
                        />
                      ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Controller
                        name="websiteEmail"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} size="small" label="Email" fullWidth />
                        )}
                      />
                      <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} size="small" label="Phone" fullWidth />
                        )}
                      />
                      <Controller
                        name="address"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Address"
                            fullWidth
                            multiline
                            minRows={2}
                          />
                        )}
                      />
                      <Controller
                        name="mapUrl"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Map Embed URL"
                            fullWidth
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Controller
                      name="contactBusinessHours"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          size="small"
                          label="Business Hours (Optional)"
                          placeholder="Mon-Fri 9:00 AM - 7:00 PM"
                          fullWidth
                        />
                      )}
                    />
                    <Controller
                      name="contactEnableInquiryForm"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} select size="small" label="Enable Inquiry Form" fullWidth>
                          <MenuItem value={true}>Enabled</MenuItem>
                          <MenuItem value={false}>Disabled</MenuItem>
                        </TextField>
                      )}
                    />
                  </div>

                  <Controller
                    name="contactInquirySuccessMessage"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Inquiry Submit Success Message"
                        fullWidth
                        multiline
                        minRows={2}
                      />
                    )}
                  />
                  <p className="text-xs text-slate-500">
                    Inquiry form fields: Name, Email, Phone (optional), Message.
                    Submissions should be treated as `General Inquiry` leads.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
          {activeMainPageSlug === "home" ? (
          <div className="md:grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 gap-4">
            {/* HERO / COMPANY */}
            {activeSections.includes("hero") && (
            <div>
              <div className="py-4 border-b-default border-borderGray flex items-center justify-between">
                <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Hero Section <SectionPreviewInfo section="hero" /></span>
                <SectionToggle sectionKey="home_hero" control={control} />
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="companyName"
                  control={control}
                  rules={{ required: "Company name is required" }}
                  render={({ field }) => (
                    <Tooltip title="Company name cannot be changed" arrow>
                      <TextField
                        {...field}
                        size="small"
                        label="Company Name"
                        fullWidth
                        disabled
                        sx={{
                          "& .MuiInputBase-input.Mui-disabled": {
                            WebkitTextFillColor: "#94a3b8",
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#e2e8f0",
                          },
                        }}
                        helperText={errors?.companyName?.message}
                        error={!!errors.companyName}
                      />
                    </Tooltip>
                  )}
                />

                {/* companyLogo (single) */}
                <Controller
                  name="companyLogo"
                  control={control}
                  render={({ field }) => (
                    <UploadFileInput
                      id="companyLogo"
                      value={field.value}
                      label="Company Logo"
                      onChange={field.onChange}
                    />
                  )}
                />

                {/* heroImages (multiple) */}
                <Controller
                  name="heroImages"
                  control={control}
                  render={({ field }) => (
                    <UploadMultipleFilesInput
                      {...field}
                      name="heroImages" // important so FormData picks the files
                      label="Carousel Images"
                      maxFiles={5}
                      allowedExtensions={["jpg", "jpeg", "png", "pdf", "webp"]}
                      id="heroImages"
                    />
                  )}
                />

                <Controller
                  name="title"
                  control={control}
                  // rules={{ required: "Title is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Hero Title"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.heroTitle }}
                      helperText={getHelperText(
                        errors?.title?.message,
                        values?.title,
                        CHAR_LIMITS.heroTitle,
                      )}
                      error={!!errors.title}
                    />
                  )}
                />
                <Controller
                  name="subTitle"
                  control={control}
                  // rules={{ required: "Sub Title is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Hero Sub Title"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.heroSubTitle }}
                      helperText={getHelperText(
                        errors?.subTitle?.message,
                        values?.subTitle,
                        CHAR_LIMITS.heroSubTitle,
                      )}
                      error={!!errors.subTitle}
                    />
                  )}
                />
                <Controller
                  name="CTAButtonText"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Call To Action Button Text"
                      placeholder={ctaPlaceholder}
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.ctaButtonText }}
                      helperText={getHelperText(
                        errors?.CTAButtonText?.message,
                        values?.CTAButtonText,
                        CHAR_LIMITS.ctaButtonText,
                      )}
                    />
                  )}
                />
              </div>
            </div>
            )}

            {/* ABOUT */}
            {/* <div>
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">About</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="about"
                  control={control}
                  rules={{ required: "About is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="About"
                      fullWidth
                      multiline
                      minRows={3}
                      helperText={errors?.about?.message}
                      error={!!errors.about}
                    />
                  )}
                />
              </div>
            </div> */}

            {/* ABOUT */}
            {activeSections.includes("about") && (
            <div>
              <div className="py-4 border-b-default border-borderGray flex items-center justify-between">
                <span className="text-subtitle font-pmedium inline-flex items-center gap-2">About Section <SectionPreviewInfo section="about" /></span>
                <SectionToggle sectionKey="home_about" control={control} />
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="aboutTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ""}
                      size="small"
                      label="About Section Heading"
                      fullWidth
                      placeholder="About Our Vision"
                    />
                  )}
                />
                {aboutFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-borderGray p-4 mb-3"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-pmedium">Para #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeAbout(index)}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold transition-all"
                      >
                        Remove
                      </button>
                    </div>
                    <Controller
                      name={`about.${index}.text`}
                      control={control}
                      // rules={{ required: "About paragraph is required" }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          size="small"
                          label="About Paragraph"
                          fullWidth
                          multiline
                          minRows={3}
                          inputProps={{ maxLength: CHAR_LIMITS.aboutText }}
                          helperText={getHelperText(
                            errors?.about?.[index]?.text?.message,
                            values?.about?.[index]?.text,
                            CHAR_LIMITS.aboutText,
                          )}
                          error={!!errors?.about?.[index]?.text}
                        />
                      )}
                    />
                  </div>
                ))}
                <div>
                  <button
                    type="button"
                    onClick={() => appendAbout({ text: "" })}
                    className="text-[#2563EB] text-sm font-semibold hover:underline inline-flex items-center gap-1 transition-all"
                  >
                    + Add Para
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* PRODUCTS */}
            {activeSections.includes("products") && (
            <div className="col-span-2">
              <div className="py-4 border-b-default border-borderGray flex items-center justify-between">
                <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Our Products Section <SectionPreviewInfo section="products" /></span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const productsTabIndex = (values?.pageNavItems || []).findIndex(
                        (item) =>
                          String(item?.slug || "").trim().toLowerCase() === "products",
                      );
                      if (productsTabIndex >= 0) setActiveMainPageTab(productsTabIndex);
                      document
                        .getElementById("scrollable-content")
                        ?.scrollTo({ top: 0, behavior: "smooth" });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-[#2563EB] text-sm font-pmedium hover:underline inline-flex items-center gap-1 transition-all"
                  >
                    Go to Products Tab →
                  </button>
                  <SectionToggle sectionKey="home_products" control={control} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4">
                <Controller
                  name="productTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Products Title"
                      fullWidth
                      placeholder="Our Products"
                      inputProps={{ maxLength: CHAR_LIMITS.productTitle }}
                    />
                  )}
                />

                {productPageFields.length > 0 ? (
                  productPageFields.map((pageField, index) => {
                    const pageName =
                      watch(`productDropdownPages.${index}.name`) ||
                      `Product Page ${index + 1}`;
                    const pageSlug = String(
                      watch(`productDropdownPages.${index}.slug`) || "",
                    )
                      .trim()
                      .toLowerCase();
                    return (
                      <div
                        key={`home-product-page-card-${pageField.id}`}
                        className="rounded-xl border border-borderGray p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="font-pmedium">{pageName}</span>
                          <span className="text-xs text-slate-500">
                            Explore route: /products/{pageSlug || "page-slug"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <Controller
                            name={`productDropdownPages.${index}.homeCardHeading`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                value={field.value || ""}
                                size="small"
                                label="Card Heading"
                                fullWidth
                                placeholder={pageName}
                              />
                            )}
                          />
                          <Controller
                            name={`productDropdownPages.${index}.homeCardSubText`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                value={field.value || ""}
                                size="small"
                                label="Card Sub Text"
                                fullWidth
                                placeholder="Short description for this product page (max 200 chars)"
                                inputProps={{ maxLength: 200 }}
                                helperText={`${String(field.value || "").length}/200`}
                              />
                            )}
                          />
                        </div>
                        <div className="mt-4">
                          <Controller
                            name={`productDropdownPages.${index}.homeCardImage`}
                            control={control}
                            render={({ field }) => (
                              <UploadFileInput
                                value={field.value}
                                label="Card Image"
                                onChange={field.onChange}
                                id={`product-page-home-card-image-${index}`}
                              />
                            )}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">
                    Add product pages in the Products tab to create Home section cards here.
                  </p>
                )}
              </div>
            </div>
            )}

            {/* Home Inclusions â€" toggle amenities shown below Our Products on home page */}
            {productPageFields.length > 0 ? (
            <div className="col-span-2">
              <div className="py-4 border-b-default border-borderGray flex items-center justify-between">
                <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Home Inclusions Section <SectionPreviewInfo section="inclusions" /></span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Shown below Our Products on home page</span>
                  <SectionToggle sectionKey="home_inclusions" control={control} />
                </div>
              </div>
              <div className="p-4">
              <Controller
                name="inclusions"
                control={control}
                defaultValue={[]}
                render={({ field }) => {
                  const ALL_KEYS = [
                    "workspace","living-space","air-condition","fast-internet","cafe-dining","receptionist",
                    "meeting-rooms","training-rooms","it-support","tea-coffee","assist","community",
                    "on-demand","maintenance","generator","pickup-drop","car-bike-bus","housekeeping",
                    "swimming-pool","television","gas","laundry","secure","personalised",
                    "electricity","ups","events","furnished-office","cafeteria","high-speed-internet","assistance",
                  ];
                  const ALL_LABELS: Record<string, string> = {
                    "workspace":"Workspace","living-space":"Living Space","air-condition":"Air Condition",
                    "fast-internet":"Fast Internet","cafe-dining":"Cafe / Dining","receptionist":"Receptionist",
                    "meeting-rooms":"Meeting Rooms","training-rooms":"Training Rooms","it-support":"IT Support",
                    "tea-coffee":"Tea & Coffee","assist":"Assist","community":"Community",
                    "on-demand":"On Demand","maintenance":"Maintenance","generator":"Generator",
                    "pickup-drop":"Pickup & Drop","car-bike-bus":"Car / Bike / Bus","housekeeping":"Housekeeping",
                    "swimming-pool":"Swimming Pool","television":"Television","gas":"Gas",
                    "laundry":"Laundry","secure":"Secure","personalised":"Personalised",
                    "electricity":"Electricity","ups":"UPS","events":"Events",
                    "furnished-office":"Furnished Office","cafeteria":"Cafeteria",
                    "high-speed-internet":"High Speed Internet","assistance":"Assistance",
                  };
                  const current: Array<{ key: string; enabled: boolean }> = Array.isArray(field.value) ? field.value : ALL_KEYS.map((k) => ({ key: k, enabled: false }));
                  const toggle = (key: string) => {
                    const exists = current.find((i) => i.key === key);
                    field.onChange(exists ? current.map((i) => i.key === key ? { ...i, enabled: !i.enabled } : i) : [...current, { key, enabled: true }]);
                  };
                  const isEnabled = (key: string) => { const f = current.find((i) => i.key === key); return f ? f.enabled : false; };
                  return (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {ALL_KEYS.map((key) => (
                        <label key={key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${isEnabled(key) ? "border-accent bg-accent/10" : "border-slate-200 hover:bg-slate-50"}`}>
                          <input type="checkbox" checked={isEnabled(key)} onChange={() => toggle(key)} className="h-4 w-4 rounded border-slate-300 accent-accent" />
                          <span className={`text-[11px] font-medium ${isEnabled(key) ? "text-accent" : "text-slate-400 line-through"}`}>{ALL_LABELS[key]}</span>
                        </label>
                      ))}
                    </div>
                  );
                }}
              />
              </div>
            </div>
            ) : null}

            {/* Global FAQ â€" shown on all product pages and product detail pages */}
            {productPageFields.length > 0 ? (
            <div className="col-span-2" id="home-faq-section">
              <div className="py-4 border-b-default border-borderGray flex items-center justify-between">
                <span className="text-subtitle font-pmedium inline-flex items-center gap-2">FAQ Section <SectionPreviewInfo section="faq" /></span>
                <span className="text-xs text-slate-400">Shared list — each product page decides for itself whether to show it. Max 10</span>
              </div>
              <div className="p-4">
              <Controller
                name="faqs"
                control={control}
                defaultValue={[]}
                render={({ field }) => {
                  const faqs: Array<{ question: string; answer: string }> = Array.isArray(field.value) ? field.value : [];
                  const updateFaq = (idx: number, key: "question" | "answer", val: string) => {
                    field.onChange(faqs.map((faq, i) => i === idx ? { ...faq, [key]: val } : faq));
                  };
                  const removeFaq = (idx: number) => field.onChange(faqs.filter((_, i) => i !== idx));
                  const toggleFaq = (idx: number) =>
                    field.onChange(faqs.map((faq: any, i: number) => (i === idx ? { ...faq, enabled: faq?.enabled === false } : faq)));
                  const addFaq = () => { if (faqs.length < 10) field.onChange([...faqs, { question: "", answer: "" }]); };
                  return (
                    <div className="flex flex-col gap-3">
                      {faqs.map((faq: any, idx: number) => (
                        <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-slate-500">Q{idx + 1}</span>
                            <div className="flex items-center gap-3">
                              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-slate-500">
                                <span>{faq?.enabled !== false ? "Enabled" : "Disabled"}</span>
                                <span
                                  role="switch"
                                  aria-checked={faq?.enabled !== false}
                                  onClick={() => toggleFaq(idx)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                                    faq?.enabled !== false ? "bg-accent" : "bg-slate-300"
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                      faq?.enabled !== false ? "translate-x-4" : "translate-x-0.5"
                                    }`}
                                  />
                                </span>
                              </label>
                              <button type="button" onClick={() => removeFaq(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                            </div>
                          </div>
                          <TextField value={faq.question} onChange={(e) => updateFaq(idx, "question", e.target.value)} size="small" label="Question" fullWidth inputProps={{ maxLength: 200 }} />
                          <TextField value={faq.answer} onChange={(e) => updateFaq(idx, "answer", e.target.value)} size="small" label="Answer" fullWidth multiline minRows={2} inputProps={{ maxLength: 500 }} />
                        </div>
                      ))}
                      {faqs.length < 10 ? (
                        <button type="button" onClick={addFaq} className="text-[#2563EB] text-sm font-semibold hover:underline inline-flex items-center gap-1 transition-all w-fit">+ Add FAQ</button>
                      ) : (
                        <p className="text-xs text-slate-400">Maximum 10 FAQs reached.</p>
                      )}
                    </div>
                  );
                }}
              />
              </div>
            </div>
            ) : null}

            {/* PRODUCTS (Legacy Home Product Editor) - kept for reference, intentionally disabled */}
            {legacyHomeProductsEditorEnabled && selectedVertical === "co-working" && (
            <div className="col-span-2">
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Products <SectionPreviewInfo section="products" /></span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="productTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label={sectionTitles[selectedVertical] || "Products Section Title"}
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.productTitle }}
                      helperText={getHelperText(
                        errors?.productTitle?.message,
                        values?.productTitle,
                        CHAR_LIMITS.productTitle,
                      )}
                    />
                  )}
                />

                {productFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-borderGray p-4 mb-3"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-pmedium">Product {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeProduct(index)}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold transition-all"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Controller
                        name={`products.${index}.name`}
                        control={control}
                        // rules={{ required: "Name is required" }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Product Name"
                            fullWidth
                            inputProps={{ maxLength: CHAR_LIMITS.productName }}
                            helperText={getHelperText(
                              errors?.products?.[index]?.name?.message,
                              values?.products?.[index]?.name,
                              CHAR_LIMITS.productName,
                            )}
                            error={!!errors?.products?.[index]?.name}
                          />
                        )}
                      />
                      <Controller
                        name={`products.${index}.type`}
                        control={control}
                        // rules={{ required: "Type is required" }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Product Type"
                            fullWidth
                            inputProps={{ maxLength: CHAR_LIMITS.productType }}
                            helperText={getHelperText(
                              errors?.products?.[index]?.type?.message,
                              values?.products?.[index]?.type,
                              CHAR_LIMITS.productType,
                            )}
                            error={!!errors?.products?.[index]?.type}
                          />
                        )}
                      />

                      <Controller
                        name={`products.${index}.description`}
                        control={control}
                        // rules={{ required: "Description is required" }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Product Description"
                            fullWidth
                            // multiline
                            // minRows={3}
                            inputProps={{
                              maxLength: CHAR_LIMITS.productDescription,
                            }}
                            helperText={getHelperText(
                              errors?.products?.[index]?.description?.message,
                              values?.products?.[index]?.description,
                              CHAR_LIMITS.productDescription,
                            )}
                            error={!!errors?.products?.[index]?.description}
                          />
                        )}
                      />

                      <Controller
                        name={`products.${index}.cost`}
                        control={control}
                        // rules={{ required: "Cost is required" }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Product Cost"
                            fullWidth
                            helperText={
                              errors?.products?.[index]?.cost?.message
                            }
                            error={!!errors?.products?.[index]?.cost}
                          />
                        )}
                      />
                    </div>
                    {/* productImages_${index} (multiple) */}
                    <div className="pt-4">
                      <Controller
                        name={`products.${index}.files`}
                        control={control}
                        render={({ field }) => (
                          <UploadMultipleFilesInput
                            {...field}
                            label="Product Images"
                            maxFiles={10}
                            allowedExtensions={[
                              "jpg",
                              "jpeg",
                              "png",
                              "webp",
                              "pdf",
                            ]}
                            id={`products.${index}.files`}
                          />
                        )}
                      />
                    </div>
                  </div>
                ))}

                <div>
                  <button
                    type="button"
                    onClick={() => appendProduct({ ...defaultProduct })}
                    className="text-[#2563EB] text-sm font-semibold hover:underline inline-flex items-center gap-1 transition-all"
                  >
                    + Add Product
                  </button>
                </div>
              </div>
            </div>
            )}
            {selectedVertical === "co-living" && (
              <RoomsSection
                control={control}
                register={register}
                priceLabel="Price per night"
              />
            )}
            {selectedVertical === "workation" && (
              <PackagesSection control={control} register={register} />
            )}
            {selectedVertical === "hostel" && (
              <DormsSection control={control} register={register} />
            )}
            {selectedVertical === "meeting-rooms" && (
              <RoomsSection
                control={control}
                register={register}
                fieldName="meetingRooms"
                sectionTitle="Meeting Rooms"
                itemLabel="Room"
                imageLabel="Room Images"
                priceLabel="Price per hour"
              />
            )}
            {selectedVertical === "cafe" && (
              <MenuSection control={control} register={register} />
            )}

            {/* GALLERY */}
            {activeSections.includes("gallery") && (
            <div className="col-span-2">
              <div className="py-4 border-b-default border-borderGray flex items-center justify-between">
                <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Gallery Section <SectionPreviewInfo section="gallery" /></span>
                <SectionToggle sectionKey="home_gallery" control={control} />
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="galleryTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Gallery Section Title"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.galleryTitle }}
                      helperText={getHelperText(
                        errors?.galleryTitle?.message,
                        values?.galleryTitle,
                        CHAR_LIMITS.galleryTitle,
                      )}
                    />
                  )}
                />

                <Controller
                  name="gallery"
                  control={control}
                  render={({ field }) => (
                    <UploadMultipleFilesInput
                      {...field}
                      name="gallery"
                      label="Gallery Images"
                      maxFiles={40}
                      allowedExtensions={["jpg", "jpeg", "png", "pdf", "webp"]}
                      id="gallery"
                      enabledToggle
                    />
                  )}
                />
              </div>
            </div>
            )}

            {/* TESTIMONIALS */}
            {activeSections.includes("testimonials") && (
            <div className="col-span-2">
              <div className="py-4 border-b-default border-borderGray flex items-center justify-between">
                <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Testimonials Section <SectionPreviewInfo section="testimonials" /></span>
                <SectionToggle sectionKey="home_testimonials" control={control} />
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="testimonialTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Testimonials Section Title"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.testimonialTitle }}
                      helperText={getHelperText(
                        errors?.testimonialTitle?.message,
                        values?.testimonialTitle,
                        CHAR_LIMITS.testimonialTitle,
                      )}
                    />
                  )}
                />

                {testimonialFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-borderGray p-4 mb-3"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-pmedium">
                        Testimonial #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTestimonial(index)}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold transition-all"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: name + rating stacked; Right: testimony */}
                      <div className="flex flex-col gap-4">
                        <Controller
                          name={`testimonials.${index}.name`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              size="small"
                              label="Name"
                              fullWidth
                              inputProps={{
                                maxLength: CHAR_LIMITS.testimonialName,
                              }}
                              helperText={getHelperText(
                                errors?.testimonials?.[index]?.name?.message,
                                values?.testimonials?.[index]?.name,
                                CHAR_LIMITS.testimonialName,
                              )}
                              error={!!errors?.testimonials?.[index]?.name}
                            />
                          )}
                        />
                        <Controller
                          name={`testimonials.${index}.rating`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              size="small"
                              label="Rating (1-5)"
                              fullWidth
                              inputProps={{ min: 1, max: 5 }}
                              helperText={
                                errors?.testimonials?.[index]?.rating?.message
                              }
                              error={!!errors?.testimonials?.[index]?.rating}
                            />
                          )}
                        />
                      </div>
                      <Controller
                        name={`testimonials.${index}.testimony`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Testimony"
                            fullWidth
                            multiline
                            minRows={4}
                            inputProps={{
                              maxLength: CHAR_LIMITS.testimonialTestimony,
                            }}
                            helperText={getHelperText(
                              errors?.testimonials?.[index]?.testimony?.message,
                              values?.testimonials?.[index]?.testimony,
                              CHAR_LIMITS.testimonialTestimony,
                            )}
                            error={!!errors?.testimonials?.[index]?.testimony}
                          />
                        )}
                      />
                    </div>
                  </div>
                ))}

                <div>
                  <button
                    type="button"
                    onClick={() => appendTestimonial({ ...defaultTestimonial })}
                    className="text-[#2563EB] text-sm font-semibold hover:underline inline-flex items-center gap-1 transition-all"
                  >
                    + Add Testimonial
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* Logo Carousel — shown just before Contact & Footer on home page */}
            {activeSections.includes("contact") && (
            <div className="col-span-2">
              <div className="py-4 border-b-default border-borderGray flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Trusted By Section <SectionPreviewInfo section="logoCarousel" /></span>
                  <span className="text-xs text-slate-400">Shown just before Contact &amp; Footer on home page</span>
                </div>
                <Controller
                  name="logoCarousel.enabled"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value === true}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                      />
                      <span className="text-xs font-medium text-slate-600">Enable</span>
                    </label>
                  )}
                />
              </div>
              <div className="flex flex-col gap-3 p-4">
                <Controller
                  name="logoCarousel.title"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ""}
                      size="small"
                      label="Section Heading"
                      fullWidth
                      placeholder="Trusted by"
                    />
                  )}
                />
                <div>
                  <p className="text-xs text-slate-500 mb-2">Upload logos (transparent PNG recommended, max 12)</p>
                  <Controller
                    name="logoCarousel.logos"
                    control={control}
                    render={({ field }) => (
                      <UploadMultipleFilesInput
                        {...field}
                        label="Logo Images"
                        maxFiles={12}
                        allowedExtensions={["jpg", "jpeg", "png", "webp", "svg"]}
                        id="logo-carousel-logos-persistent"
                      />
                    )}
                  />
                </div>
              </div>
            </div>
            )}

            {/* CONTACT */}
            {activeSections.includes("contact") && (
            <div>
              <div className="py-4 border-b-default border-borderGray flex items-center justify-between">
                <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Contact Section <SectionPreviewInfo section="contact" /></span>
                <SectionToggle sectionKey="home_contact" control={control} />
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="contactTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Contact Section Title"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.contactTitle }}
                      helperText={getHelperText(
                        errors?.contactTitle?.message,
                        values?.contactTitle,
                        CHAR_LIMITS.contactTitle,
                      )}
                    />
                  )}
                />
                <Controller
                  name="mapUrl"
                  control={control}
                  // rules={{
                  //   required: "Map URL is required",
                  //   validate: (val) => {
                  //     const MAP_EMBED_REGEX =
                  //       /^https?:\/\/(www\.)?(google\.com|maps\.google\.com)\/maps\/embed(\/v1\/[a-z]+|\?pb=|\/?\?)/i;

                  //     const v = (val || "").trim();

                  //     // If they pasted a full iframe, fail validation (or you can auto-extract)
                  //     // if (/<\s*iframe/i.test(v)) {
                  //     //   return 'Paste only the "src" URL from the embed code (not the full <iframe>).';
                  //     // }

                  //     return (
                  //       MAP_EMBED_REGEX.test(v) ||
                  //       "Ewnter a valid Google Maps *embed* URL (e.g. https://www.google.com/maps/embed?pb=...)"
                  //     );
                  //   },
                  // }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      onChange={(e) => {
                        // Optional: auto-extract src if a whole iframe was pasted
                        const extractIframeSrc = (val = "") =>
                          val.match(/src=["']([^"']+)["']/i)?.[1] || val;
                        const raw = e.target.value;
                        const cleaned = extractIframeSrc(raw).trim();

                        field.onChange(cleaned);
                      }}
                      size="small"
                      label="Embed Map URL"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.mapUrl }}
                      helperText={getHelperText(
                        errors?.mapUrl?.message,
                        values?.mapUrl,
                        CHAR_LIMITS.mapUrl,
                      )}
                      error={!!errors.mapUrl}
                    />
                  )}
                />
                <Controller
                  name="websiteEmail"
                  control={control}
                  // rules={{ required: "Email is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Email"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.websiteEmail }}
                      helperText={getHelperText(
                        errors?.websiteEmail?.message,
                        values?.websiteEmail,
                        CHAR_LIMITS.websiteEmail,
                      )}
                      error={!!errors.websiteEmail}
                    />
                  )}
                />
                <Controller
                  name="phone"
                  control={control}
                  // rules={{ required: "Phone is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Phone"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.phone }}
                      helperText={getHelperText(
                        errors?.phone?.message,
                        values?.phone,
                        CHAR_LIMITS.phone,
                      )}
                      error={!!errors.phone}
                    />
                  )}
                />
                <Controller
                  name="address"
                  control={control}
                  // rules={{ required: "Address is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Address"
                      fullWidth
                      multiline
                      minRows={2}
                      inputProps={{ maxLength: CHAR_LIMITS.address }}
                      helperText={getHelperText(
                        errors?.address?.message,
                        values?.address,
                        CHAR_LIMITS.address,
                      )}
                      error={!!errors.address}
                    />
                  )}
                />
              </div>
            </div>
            )}

            {/* FOOTER */}
            {activeSections.includes("footer") && (
            <div>
              <div className="py-4 border-b-default border-borderGray flex items-center justify-between">
                <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Footer Section <SectionPreviewInfo section="footer" /></span>
                <SectionToggle sectionKey="home_footer" control={control} />
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="registeredCompanyName"
                  control={control}
                  // rules={{ required: "Registered company name is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Registered Company Name"
                      fullWidth
                      inputProps={{
                        maxLength: CHAR_LIMITS.registeredCompanyName,
                      }}
                      helperText={getHelperText(
                        errors?.registeredCompanyName?.message,
                        values?.registeredCompanyName,
                        CHAR_LIMITS.registeredCompanyName,
                      )}
                      error={!!errors.registeredCompanyName}
                    />
                  )}
                />
                <Controller
                  name="copyrightText"
                  control={control}
                  // rules={{ required: "Copyright text is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Copyright Text"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.copyrightText }}
                      helperText={getHelperText(
                        errors?.copyrightText?.message,
                        values?.copyrightText,
                        CHAR_LIMITS.copyrightText,
                      )}
                      error={!!errors.copyrightText}
                    />
                  )}
                />

                {/* Footer social links — enable the ones to show on the website footer */}
                <div>
                  <div className="py-2 border-b-default border-borderGray">
                    <span className="text-subtitle font-pmedium inline-flex items-center gap-2">Social Links <SectionPreviewInfo section="footer" /></span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Select the socials you want on the website footer and add
                    their links. Only enabled socials with a link are shown.
                  </p>
                  <div className="mt-3 flex flex-col gap-3">
                    {SOCIAL_PLATFORMS.map((platform) => (
                      <Controller
                        key={`social-${platform.key}`}
                        name={`socials.${platform.key}`}
                        control={control}
                        render={({ field }) => {
                          const current = field.value || { enabled: false, link: "" };
                          return (
                            <div className="flex items-center gap-3">
                              <label className="flex w-28 shrink-0 cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={current.enabled === true}
                                  onChange={(e) =>
                                    field.onChange({
                                      ...current,
                                      enabled: e.target.checked,
                                    })
                                  }
                                  className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                                />
                                <span
                                  className={`text-xs font-medium ${
                                    current.enabled ? "text-slate-700" : "text-slate-400"
                                  }`}
                                >
                                  {platform.label}
                                </span>
                              </label>
                              <TextField
                                value={current.link || ""}
                                onChange={(e) =>
                                  field.onChange({ ...current, link: e.target.value })
                                }
                                size="small"
                                fullWidth
                                disabled={current.enabled !== true}
                                label={
                                  platform.key === "whatsapp"
                                    ? "WhatsApp Number"
                                    : `${platform.label} Link`
                                }
                                placeholder={platform.placeholder}
                              />
                            </div>
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
          ) : null}

              {/* Publish / Preview / Reset */}
              <div className="flex justify-center mb-3">
                {workspaceId || companyId ? (
                  <CreditsIndicator workspaceId={workspaceId} companyId={companyId} />
                ) : null}
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={openPreview}
                  className="px-8 py-2.5 bg-green-500 border border-slate-200 text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-green-600 transition-all"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirmPopup(true)}
                  className="px-8 py-2.5 bg-red-500 border border-slate-200 text-slate-100 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-red-600 transition-all"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmPopup(true)}
                  disabled={isWebsiteSubmitting || isRedirectingAfterCreate}
                  className="px-8 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
                >
                  {isWebsiteSubmitting ? (
                    <>{effectiveEditMode ? "Submitting..." : "Publishing..."}</>
                  ) : (
                    <>{effectiveEditMode ? "Submit" : "Publish"}</>
                  )}
                </button>
              </div>
              {publishedWebsiteUrl ? (
                <div className="mt-3 text-center">
                  <p className="text-xs text-slate-500">Published URL</p>
                  <a
                    href={publishedWebsiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-primary underline"
                  >
                    {publishedWebsiteUrl}
                  </a>
                </div>
              ) : null}
            </form>

              <Dialog
              open={showConfirmPopup}
              onClose={() => {
                if (!isWebsiteSubmitting && !isRedirectingAfterCreate) setShowConfirmPopup(false);
              }}
              fullWidth
              maxWidth="sm"
              PaperProps={{
                sx: { borderRadius: 3, overflow: "hidden" },
              }}
            >
              <DialogTitle sx={{ pb: 1 }}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-900">
                    {effectiveEditMode ? "Confirm Website Update" : "Confirm Website Publish"}
                  </span>
                  {effectiveEditMode ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      1 Credit Deducted
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      First Time Free
                    </span>
                  )}
                </div>
              </DialogTitle>
              <DialogContent>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">
                    {effectiveEditMode
                      ? "Your existing published website will be updated and the changes will be published again. This action will deduct 1 credit from your monthly balance."
                      : "Your website will be created with page-style navigation (Home, About, Products, Gallery, Testimonials, Contact). Do you want to continue?"}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    {effectiveEditMode
                      ? "The published website will keep its existing URL and reflect the latest submitted data after a successful save."
                      : "This is a frontend-first demo pass. Backend page contracts will be aligned after finalizing the UI flow."}
                  </p>
                </div>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <button
                  type="button"
                  onClick={() => setShowConfirmPopup(false)}
                  disabled={isWebsiteSubmitting || isRedirectingAfterCreate}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isWebsiteSubmitting || isRedirectingAfterCreate}
                  className="px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  onClick={() => {
                    if (isWebsiteSubmitting || isRedirectingAfterCreate) return;
                    setShowConfirmPopup(false);
                    void handleSubmit((values, e) => {
                      submitCreateWebsite(values, e);
                    })();
                  }}
                >
                {isWebsiteSubmitting
                    ? effectiveEditMode
                      ? "Submitting..."
                      : "Publishing..."
                    : effectiveEditMode
                      ? "Confirm & Submit"
                      : "Confirm & Publish"}
                </button>
              </DialogActions>
            </Dialog>

              <Dialog
              open={showResetConfirmPopup}
              onClose={() => setShowResetConfirmPopup(false)}
              fullWidth
              maxWidth="sm"
              PaperProps={{
                sx: { borderRadius: 3, overflow: "hidden" },
              }}
            >
              <DialogTitle sx={{ pb: 1 }}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-900">
                    Reset Website Form?
                  </span>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    Cannot Be Undone
                  </span>
                </div>
              </DialogTitle>
              <DialogContent>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">
                    This will clear everything you have entered in the form —
                    all text, pages, products, images and settings. Your
                    published website is not affected until you submit again.
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    If you only want to discard a few changes, edit those
                    fields instead of resetting the whole form.
                  </p>
                </div>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <button
                  type="button"
                  onClick={() => setShowResetConfirmPopup(false)}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-red-600 transition-all"
                  onClick={() => {
                    setShowResetConfirmPopup(false);
                    resetFormToEmpty();
                  }}
                >
                  Yes, Reset Form
                </button>
              </DialogActions>
            </Dialog>
          </div>
        </PageFrame>
      </div>
    </div>
  );
};

export default CreateWebsite;
