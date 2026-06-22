// @ts-nocheck
import React, { useRef, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import {
  TextField,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
} from "@mui/material";
import PageFrame from "../../../../components/Pages/PageFrame";
import PrimaryButton from "../../../../components/PrimaryButton";
import SecondaryButton from "../../../../components/SecondaryButton";
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
import CreditsIndicator from "../../../../components/CreditsIndicator";
import RoomsSection from "./RoomsSection";
import PackagesSection from "./PackagesSection";
import DormsSection from "./DormsSection";
import MenuSection from "./MenuSection";

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

const DEFAULT_PAGE_NAV_ITEMS = [
  "Home",
  "About Us",
  "Products",
  "Gallery",
  "Testimonials",
  "Contact Us",
];

const DEFAULT_PRODUCT_DROPDOWN_PAGES = [
  "Co-Working",
  "Cafe",
  "Meeting Rooms",
  "Hostels",
  "Co-Living",
  "Workations",
];

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

const buildDraftFormDataFromValues = (formValues: any, meta: any = {}) => ({
  companyId: String(formValues?.companyId || meta?.companyId || "").trim(),
  companyName: String(formValues?.companyName || meta?.companyName || "").trim(),
  title: String(formValues?.title || "").trim(),
  subTitle: String(formValues?.subTitle || "").trim(),
  CTAButtonText: String(formValues?.CTAButtonText || "").trim(),
  about: Array.isArray(formValues?.about)
    ? formValues.about.map((item: any) => ({ text: String(item?.text || "").trim() }))
    : [{ text: "" }],
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
      }))
    : [],
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

  if (companyId) return itemCompanyId === String(companyId).trim();
  if (workspaceId) return itemWorkspaceId === String(workspaceId).trim();
  if (normalizedCompanyName) return itemCompanyName === normalizedCompanyName;
  return false;
};


const CreateWebsite = () => {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.pathname.includes("/edit-website");
  // The :website route param (e.g. "biznest") is the deterministic searchKey for the
  // website being edited. We use it to load the correct website on the edit route
  // WITHOUT depending on async company identity resolution — this is what stops the
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
    getValues, // ✅ add this
    formState: { errors },
  } = useForm({
    defaultValues: {
      // hero/company
      companyId: "", // ✅ change from businessId
      companyName: "",
      title: "",
      subTitle: "",
      CTAButtonText: "",
      companyLogo: null,
      heroImages: [],
      gallery: [],
      // about
      about: [{ text: "" }],
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
      pageNavItems: DEFAULT_PAGE_NAV_ITEMS.map((name) => ({
        name,
        slug: String(name).toLowerCase().replace(/\s+/g, "-"),
        enabled: true,
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
  const CHAR_LIMITS = {
    heroTitle: 100,
    heroSubTitle: 200,
    ctaButtonText: 50,
    aboutText: 200,
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
      // Block concurrent in-flight calls — dep changes can fire this effect again
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
                    text: String(item?.text || item || "").trim(),
                  }))
                : Array.isArray(found?.about) && found.about.length
                  // Handles both old flat-string format ["text"] and new object format [{text:"..."}]
                  ? found.about.map((item: any) => ({
                      text: typeof item === "string"
                        ? item.trim()
                        : String(item?.text || "").trim(),
                    }))
                  : [{ text: "" }],
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
            pageNavItems:
              Array.isArray(draftData?.pageNavItems) && draftData.pageNavItems.length
                ? draftData.pageNavItems
                : Array.isArray(found?.pageNavItems) && found.pageNavItems.length
                  ? found.pageNavItems
                  : DEFAULT_PAGE_NAV_ITEMS.map((name) => ({
                      name,
                      slug: String(name).toLowerCase().replace(/\s+/g, "-"),
                      enabled: true,
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
              // section and as product pages — using each product's own image as the cover.
              const sourceProducts =
                Array.isArray(found?.products) && found.products.length
                  ? found.products
                  : Array.isArray(draftData?.products)
                    ? draftData.products
                    : [];
              return sourceProducts
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
                  };
                });
            })(),
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
                    // Always pull the persisted image from found — draftData only stores text,
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
          });
          setDraftTemplateId(String(found?._id || ""));
          setDraftUpdatedAt(found?.draftUpdatedAt || null);
          setDraftStatus(found?.isPublished ? "saved" : "saved");
          setHasRestoredDraft(Boolean(found?.draftData));
          // Baseline the autosave snapshot from the ACTUAL form state (getValues) using the
          // same builder the autosave uses. Previously this was built from the raw draftData
          // object, which has a different shape than the form values — so the snapshots never
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
          // between them remounts it and resets every useRef guard — which made this
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
  const [activeMainPageTab, setActiveMainPageTab] = useState(0);
  const [activeProductPageTab, setActiveProductPageTab] = useState(0);
  const [selectedProductPageOption, setSelectedProductPageOption] = useState(
    DEFAULT_PRODUCT_DROPDOWN_PAGES[0],
  );

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
    const appendFileIfPresent = (fieldName: string, value: unknown) => {
      if (value instanceof File) {
        fd.append(fieldName, value);
      }
    };

    // Replace structured arrays with JSON
    const productsMeta = (values.products || [])
      .map((p) => ({
        type: p.type,
        name: p.name,
        subtitle: p.subtitle,
        cost: p.cost,
        description: p.description,
        __hasFiles: Array.isArray(p?.files) && p.files.length > 0,
      }))
      .filter((p) =>
        p.__hasFiles ||
        [p.type, p.name, p.subtitle, p.cost, p.description]
          .some((value) => String(value || "").trim()),
      )
      .map(({ __hasFiles, ...rest }) => rest);
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
      if (/^(products|testimonials)\.\d+\./.test(key)) fd.delete(key);
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
    (values.products || []).forEach((p, i) => {
      (p.files || []).forEach((file) => {
        if (file instanceof File) fd.append(`productImages_${i}`, file);
      });
    });

    fd.delete("testimonialImages");
    (values.testimonials || []).forEach((t, i) => {
      if (t?.file instanceof File) fd.append(`testimonialImages_${i}`, t.file);
    });

    // ✅ Add companyId here
    fd.set("companyName", finalCompanyName);
    fd.set("companyId", values.companyId || prefillCompanyId || "");
    fd.append("workspaceId", workspaceId || "");
    fd.set("pageNavItems", JSON.stringify(values.pageNavItems || []));
    fd.set(
      "productDropdownPages",
      JSON.stringify(values.productDropdownPages || []),
    );
    (values.productDropdownPages || []).forEach((item, index) => {
      appendFileIfPresent(`productPageHeroImage_${index}`, item?.heroImage);
      (item?.heroImages || []).forEach((file) => {
        appendFileIfPresent(`productPageHeroImages_${index}`, file);
      });
      appendFileIfPresent(`productPageHomeCardImage_${index}`, item?.homeCardImage);
    });
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

    // const srcFromIframe = raw.match(/src=["']([^"']+)["']/i)?.[1];
    // const srcUrl = values.mapUrl.split(" ")[1].split(" ")[1];
    // values.mapUrl = srcUrl;
    // console.log("src", srcUrl);

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
      })),
      productSectionTitle:
        String(formValues?.productTitle || "").trim() || "Our Products",
      products: (formValues?.products || []).map((item: any) => ({
        name: String(item?.name || "").trim(),
        type: String(item?.type || "").trim(),
        cost: String(item?.cost || "").trim(),
        description: String(item?.description || "").trim(),
        images: (item?.files || [])
          .map((fileItem: unknown) => getMediaUrlForPreview(fileItem))
          .filter(Boolean),
      })),
      meetingRooms: (formValues?.meetingRooms || formValues?.rooms || []).map((item: any) => ({
        title: String(item?.title || "").trim(),
        price: String(item?.price || "").trim(),
        description: String(item?.description || "").trim(),
        images: (item?.images || [])
          .map((imageItem: unknown) => getMediaUrlForPreview(imageItem))
          .filter(Boolean),
      })),
      rooms: (formValues?.rooms || []).map((item: any) => ({
        title: String(item?.title || "").trim(),
        price: String(item?.price || "").trim(),
        description: String(item?.description || "").trim(),
        images: (item?.images || [])
          .map((imageItem: unknown) => getMediaUrlForPreview(imageItem))
          .filter(Boolean),
      })),
      coLivingRooms: (formValues?.coLivingRooms || []).map((item: any) => ({
        title: String(item?.title || "").trim(),
        price: String(item?.price || "").trim(),
        description: String(item?.description || "").trim(),
        images: (item?.images || [])
          .map((imageItem: unknown) => getMediaUrlForPreview(imageItem))
          .filter(Boolean),
      })),
      packages: (formValues?.packages || []).map((item: any) => ({
        title: String(item?.title || "").trim(),
        price: String(item?.price || "").trim(),
        duration: String(item?.duration || "").trim(),
        description: String(item?.description || "").trim(),
        images: (item?.images || [])
          .map((imageItem: unknown) => getMediaUrlForPreview(imageItem))
          .filter(Boolean),
      })),
      dorms: (formValues?.dorms || []).map((item: any) => ({
        title: String(item?.title || "").trim(),
        capacity: item?.capacity,
        price: String(item?.price || "").trim(),
        description: String(item?.description || "").trim(),
        images: (item?.images || [])
          .map((imageItem: unknown) => getMediaUrlForPreview(imageItem))
          .filter(Boolean),
      })),
      productPages: (formValues?.productDropdownPages || []).map((item: any, index: number) => ({
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
      })),
      productDropdownPages: (formValues?.productDropdownPages || []).map((item: any, index: number) => ({
        name: String(item?.name || "").trim(),
        slug: String(item?.slug || "").trim().toLowerCase(),
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
      })),
      menuItems: (formValues?.menuItems || []).map((item: any) => ({
        category: String(item?.category || "").trim(),
        name: String(item?.name || "").trim(),
        price: String(item?.price || "").trim(),
        description: String(item?.description || "").trim(),
        image: getMediaUrlForPreview(item?.image),
      })),
      galleryTitle: String(formValues?.galleryTitle || "Gallery").trim(),
      gallery: (formValues?.gallery || [])
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

  const availableProductPageOptions = Array.from(
    new Set([
      ...DEFAULT_PRODUCT_DROPDOWN_PAGES,
      ...(values?.products || [])
        .map((item) => String(item?.type || item?.name || "").trim())
        .filter(Boolean),
    ]),
  );
  const selectedProductPageSlug = toSlug(selectedProductPageOption);
  const selectedProductPageIndex = (values?.productDropdownPages || []).findIndex(
    (item) => String(item?.slug || "").trim().toLowerCase() === selectedProductPageSlug,
  );
  const isSelectedProductPageAdded = selectedProductPageIndex >= 0;
  const legacyHomeProductsEditorEnabled = Boolean(
    values?.__legacyHomeProductsEditorEnabled,
  );

  if (isCheckingExistingWebsite) {
    return (
      <div className="p-4 flex items-center justify-center">
        <CircularProgress />
      </div>
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
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 min-w-0 overflow-hidden">
            <p className="text-sm font-semibold text-slate-800">Website Pages</p>
            <Tabs
              className="mt-2"
              value={Math.min(activeMainPageTab, Math.max(pageNavFields.length - 1, 0))}
              onChange={(_, next) => setActiveMainPageTab(next)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ maxWidth: "100%" }}
            >
              {pageNavFields.map((item, index) => (
                <Tab
                  key={item.id}
                  label={watch(`pageNavItems.${index}.name`) || `Page ${index + 1}`}
                />
              ))}
            </Tabs>

            {String(watch(`pageNavItems.${activeMainPageTab}.slug`) || "")
              .trim()
              .toLowerCase() === "products" ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 min-w-0 overflow-hidden">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">Products Page Tabs</p>
                  <div className="flex flex-shrink-0 items-center gap-2 flex-wrap">
                    <TextField
                      select
                      size="small"
                      label="Select / Add Page"
                      value={selectedProductPageOption}
                      onChange={(event) =>
                        setSelectedProductPageOption(event.target.value)
                      }
                      sx={{ minWidth: 180 }}
                    >
                      {availableProductPageOptions.map((option) => (
                        <MenuItem
                          key={option}
                          value={option}
                        >
                          {(values?.productDropdownPages || []).some(
                            (item) =>
                              String(item?.slug || "").trim().toLowerCase() ===
                              toSlug(option),
                          )
                            ? `${option} (Page added)`
                            : option}
                        </MenuItem>
                      ))}
                    </TextField>
                    <button
                      type="button"
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                      onClick={() => {
                        const optionName = String(selectedProductPageOption || "").trim();
                        if (!optionName) return;
                        const optionSlug = toSlug(optionName);
                        const existingIndex = (values?.productDropdownPages || []).findIndex(
                          (item) =>
                            String(item?.slug || "").trim().toLowerCase() === optionSlug,
                        );
                        if (existingIndex >= 0) {
                          removeProductPageItem(existingIndex);
                          setActiveProductPageTab((prev) => Math.max(0, prev - 1));
                          return;
                        }
                        appendProductPageItem({
                          name: optionName,
                          slug: optionSlug,
                          enabled: true,
                          heroHeading: optionName,
                          heroSubHeading: "",
                          heroMode: "single",
                          heroImage: null,
                          heroButtonText: "View More",
                          heroImages: [],
                          homeCardHeading: optionName,
                          homeCardSubText: "",
                          homeCardImage: null,
                          leadEnabled: !isMenuPageSlug(optionSlug),
                          leadFormLabel: isMenuPageSlug(optionSlug)
                            ? "Menu Inquiry Disabled"
                            : "View More / Get Details",
                        });
                        setActiveProductPageTab(productPageFields.length);
                      }}
                    >
                      {isSelectedProductPageAdded
                        ? "- Remove Product Page"
                        : "+ Add Product Page"}
                    </button>
                  </div>
                </div>
                <p className="mb-3 border-b border-slate-200 pb-2 text-xs text-slate-500">
                  Use the selector above to add/remove product pages. Page templates below are
                  kept separate for cleaner editing.
                </p>
                {productPageFields.length > 0 ? (
                  <>
                    <Tabs
                      value={Math.min(activeProductPageTab, Math.max(productPageFields.length - 1, 0))}
                      onChange={(_, next) => setActiveProductPageTab(next)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ maxWidth: "100%" }}
                    >
                      {productPageFields.map((item, index) => (
                        <Tab
                          key={item.id}
                          label={watch(`productDropdownPages.${index}.name`) || `Product Page ${index + 1}`}
                        />
                      ))}
                    </Tabs>
                    {productPageFields[activeProductPageTab] ? (
                      <div className="mt-3 grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="py-2 border-b-default border-borderGray">
                            <span className="text-subtitle font-pmedium">Product Page Hero</span>
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

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="py-2 border-b-default border-borderGray">
                            <span className="text-subtitle font-pmedium">Lead Form Behavior</span>
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

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="py-2 border-b-default border-borderGray">
                            <span className="text-subtitle font-pmedium">
                              Page Content Template (Synced with Home)
                            </span>
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
                                    className="rounded-xl border border-borderGray bg-white p-4"
                                  >
                                    <div className="mb-3 flex items-center justify-between">
                                      <span className="font-pmedium">Product {index + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeProduct(index)}
                                        className="text-sm text-red-600"
                                      >
                                        Remove
                                      </button>
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
                                  className="w-fit text-sm text-primary"
                                >
                                  + Add Product
                                </button>
                              </div>
                            );
                          })()}
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
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-800">About Page</p>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
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

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      Company Overview (Synced From Home About)
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Same about paragraphs are shared with Home section.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      {aboutFields.map((field, index) => (
                        <div key={`about-sync-${field.id}`} className="rounded-md border border-slate-200 bg-white p-3">
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
                        className="w-fit text-sm text-primary"
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
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="py-2 border-b-default border-borderGray">
                      <span className="text-subtitle font-pmedium">Our Team Section</span>
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
                        <div key={field.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
                              className="mt-3 text-sm text-red-600"
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
                        className="w-fit rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary md:col-span-2 xl:col-span-3"
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
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-800">Gallery Page</p>
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
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="py-2 border-b-default border-borderGray">
                      <span className="text-subtitle font-pmedium">Gallery Images (Synced)</span>
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
              .toLowerCase() === "testimonials" ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-800">Testimonials Page</p>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <Controller
                    name="testimonialsPageHeading"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Section Heading"
                        placeholder="What People Say"
                        fullWidth
                      />
                    )}
                  />
                  <Controller
                    name="testimonialsPageIntro"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Section Intro"
                        placeholder="Real experiences shared by our community"
                        fullWidth
                      />
                    )}
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Controller
                      name="testimonialsHomePreviewCount"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          size="small"
                          label="Show On Home (Preview Count)"
                          fullWidth
                          inputProps={{ min: 1, max: 20 }}
                        />
                      )}
                    />
                  </div>
                  <Controller
                    name="testimonialsEnableWriteReview"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} select size="small" label="Write Review Form" fullWidth>
                        <MenuItem value={true}>Enabled</MenuItem>
                        <MenuItem value={false}>Disabled</MenuItem>
                      </TextField>
                    )}
                  />
                  <Controller
                    name="testimonialsSuccessMessage"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Submit Success Message"
                        fullWidth
                        multiline
                        minRows={2}
                      />
                    )}
                  />
                  <p className="text-xs text-slate-500">
                    Public form fields: Name, Star Rating, Review.
                    Only approved reviews are shown on website.
                  </p>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3 border-b-default border-borderGray py-2">
                    <span className="text-subtitle font-pmedium">
                      Approved Website Reviews
                    </span>
                    <span className="text-xs text-slate-500">
                      These are the backend-approved reviews that should appear on the website template.
                    </span>
                  </div>
                  {approvedWebsiteReviews.length > 0 ? (
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      {approvedWebsiteReviews.map((review, index) => (
                        <div
                          key={review?._id || `approved-review-${index}`}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {review?.reviewerName ||
                                  review?.reviewreName ||
                                  review?.fullName ||
                                  review?.name ||
                                  `Reviewer ${index + 1}`}
                              </p>
                              <p className="text-sm text-slate-500">
                                {review?.role || review?.designation || review?.jobPosition || "-"}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-slate-700">
                              {review?.starCount ?? review?.rating ?? review?.rate ?? 0}/5
                            </p>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {review?.review || review?.comment || review?.description || "-"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      No approved website reviews found for this company yet.
                    </p>
                  )}
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="py-2 border-b-default border-borderGray">
                    <span className="text-subtitle font-pmedium">
                      Shared Testimonials (Synced with Home)
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-4">
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
                        key={`shared-testimonial-${field.id}`}
                        className="rounded-xl border border-borderGray bg-white p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="font-pmedium">Testimonial #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeTestimonial(index)}
                            className="text-sm text-red-600"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                            name={`testimonials.${index}.jobPosition`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                size="small"
                                label="Designation / Role"
                                fullWidth
                                inputProps={{
                                  maxLength: CHAR_LIMITS.testimonialJobPosition,
                                }}
                                helperText={getHelperText(
                                  errors?.testimonials?.[index]?.jobPosition?.message,
                                  values?.testimonials?.[index]?.jobPosition,
                                  CHAR_LIMITS.testimonialJobPosition,
                                )}
                                error={!!errors?.testimonials?.[index]?.jobPosition}
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
                          <Controller
                            name={`testimonials.${index}.testimony`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                size="small"
                                label="Review"
                                fullWidth
                                multiline
                                minRows={3}
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

                        <div className="mt-3">
                          <Controller
                            name={`testimonials.${index}.file`}
                            control={control}
                            render={({ field }) => (
                              <UploadFileInput
                                value={field.value}
                                label="Reviewer Image (Optional)"
                                onChange={field.onChange}
                                id={`shared-testimonial-file-${index}`}
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
                        className="text-sm text-primary"
                      >
                        + Add Testimonial
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {String(watch(`pageNavItems.${activeMainPageTab}.slug`) || "")
              .trim()
              .toLowerCase() === "contact-us" ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-800">Contact Page</p>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <Controller
                    name="contactPageHeading"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Page Heading"
                        placeholder="Get In Touch"
                        fullWidth
                      />
                    )}
                  />
                  <Controller
                    name="contactPageIntro"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Page Intro"
                        placeholder="We would love to hear from you."
                        fullWidth
                      />
                    )}
                  />

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="py-2 border-b-default border-borderGray">
                      <span className="text-subtitle font-pmedium">
                        Contact Details (Synced with Home)
                      </span>
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

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="py-2 border-b-default border-borderGray">
                      <span className="text-subtitle font-pmedium">Contact Person (Optional)</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Controller
                        name="contactPersonName"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} size="small" label="Name" fullWidth />
                        )}
                      />
                      <Controller
                        name="contactPersonRole"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} size="small" label="Role" fullWidth />
                        )}
                      />
                      <Controller
                        name="contactPersonEmail"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} size="small" label="Email" fullWidth />
                        )}
                      />
                      <Controller
                        name="contactPersonPhone"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} size="small" label="Phone" fullWidth />
                        )}
                      />
                    </div>
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
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Hero Section</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="companyName"
                  control={control}
                  rules={{ required: "Company name is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Company Name"
                      fullWidth
                      InputProps={{ readOnly: true }}
                      helperText={errors?.companyName?.message}
                      error={!!errors.companyName}
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
                      label="CTA Button Text"
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
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">About</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
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
                        className="text-sm text-red-600"
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
                    className="text-sm text-primary"
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
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Our Products Pages</span>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4">
                <Controller
                  name="productTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Home Products Section Heading"
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
                                placeholder="Short description for this product page"
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

            {/* PRODUCTS (Legacy Home Product Editor) - kept for reference, intentionally disabled */}
            {legacyHomeProductsEditorEnabled && selectedVertical === "co-working" && (
            <div className="col-span-2">
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Products</span>
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
                        className="text-sm text-red-600"
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
                    className="text-sm text-primary"
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
            <div>
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Gallery</span>
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
                    />
                  )}
                />
              </div>
            </div>
            )}

            {/* TESTIMONIALS */}
            {activeSections.includes("testimonials") && (
            <div className="col-span-2">
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Testimonials</span>
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
                        className="text-sm text-red-600"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        name={`testimonials.${index}.jobPosition`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Job Position"
                            fullWidth
                            inputProps={{
                              maxLength: CHAR_LIMITS.testimonialJobPosition,
                            }}
                            helperText={getHelperText(
                              errors?.testimonials?.[index]?.jobPosition
                                ?.message,
                              values?.testimonials?.[index]?.jobPosition,
                              CHAR_LIMITS.testimonialJobPosition,
                            )}
                            error={!!errors?.testimonials?.[index]?.jobPosition}
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
                            minRows={3}
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

                    {/* testimonialImages_${index} (single) */}
                    <Controller
                      name={`testimonials.${index}.file`}
                      control={control}
                      render={({ field }) => (
                        <UploadFileInput
                          value={field.value}
                          label="Testimonial Image"
                          onChange={field.onChange}
                          id={`testimonial-file-${index}`}
                        />
                      )}
                    />
                  </div>
                ))}

                <div>
                  <button
                    type="button"
                    onClick={() => appendTestimonial({ ...defaultTestimonial })}
                    className="text-sm text-primary"
                  >
                    + Add Testimonial
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* CONTACT */}
            {activeSections.includes("contact") && (
            <div>
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Contact</span>
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
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Footer</span>
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
                <PrimaryButton
                  type="button"
                  title={effectiveEditMode ? "Submit" : "Publish"}
                  onClick={() => setShowConfirmPopup(true)}
                  isLoading={isWebsiteSubmitting}
                  disabled={isWebsiteSubmitting || isRedirectingAfterCreate}
                />
                <SecondaryButton
                  type="button"
                  title="Preview"
                  onClick={openPreview}
                />
                <button
                  type="button"
                  onClick={resetFormToEmpty}
                  className="px-6 py-2 bg-gray-200 text-black rounded-md"
                >
                  Reset
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
                <Button
                  onClick={() => setShowConfirmPopup(false)}
                  disabled={isWebsiteSubmitting || isRedirectingAfterCreate}
                  sx={{
                    borderRadius: "6px",
                    textTransform: "none",
                    px: 3,
                    py: 1,
                    backgroundColor: "#e5e7eb",
                    color: "#111111",
                    "&:hover": {
                      backgroundColor: "#d1d5db",
                    },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disabled={isWebsiteSubmitting || isRedirectingAfterCreate}
                  sx={{
                    borderRadius: "6px",
                    textTransform: "none",
                    px: 3,
                    py: 1,
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    "&:hover": {
                      backgroundColor: "#1d4ed8",
                    },
                  }}
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
                </Button>
              </DialogActions>
            </Dialog>
          </div>
        </PageFrame>
      </div>
    </div>
  );
};

export default CreateWebsite;



