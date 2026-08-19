import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Country, State, City } from "country-state-city";
import { api } from "../../../../../utils/axios";

const LIVE_PREVIEW_DRAFT_STORAGE_KEY = "website_builder_live_preview_draft";

// Shared data/logic layer used by every template going forward (Minimal
// Swiss, Bold Editorial, Warm Organic) — Classic keeps its own self-
// contained copy, untouched, proven working. Covers the full site: home,
// about, products (listing + detail + lead capture), gallery, testimonials
// + reviews, contact, partner form, careers (listings + application flow),
// footer, header/mobile-menu state.
export const normalizeSlug = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const FALLBACK_NAV = [
  { name: "Home", slug: "home" },
  { name: "About", slug: "about" },
  { name: "Services", slug: "products" },
  { name: "Gallery", slug: "gallery" },
  { name: "Partner", slug: "partner" },
  { name: "Careers", slug: "careers" },
  { name: "Contact", slug: "contact" },
];

const CAREERS_FALLBACK_INTRO = [
  "We are a focused, young company building the foundation for destination-based lifestyle experiences.",
  "We are connecting ambitious people with a healthier way to work and live, while helping brands and communities grow.",
  "Join our team if you want to help shape a platform that blends operations, service, and technology into one experience.",
];

const CAREERS_FALLBACK_CLOSE = [
  "Please send in your resume here on Apply Now if you cannot find your department of interest.",
  "*Mention your applying department in the message box",
];

const CAREERS_DEFAULT_DEPARTMENT_ORDER = [
  "Product & Tech Development",
  "Tech",
  "Technology",
  "Networking & IT",
  "IT",
  "Finance",
  "Human Resource & EA",
  "HR",
  "Human Resources",
  "Sales & Business Development",
  "Sales",
  "Administration & Front office",
  "Administration",
  "Marketing",
  "Legal",
  "Internships Across Departments",
  "Civil & Maintenance",
  "Service & Maintenance",
  "Maintenance",
];

const CAREERS_ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];

export interface CareersFormField {
  id: string;
  type: "text" | "textarea" | "select" | "number" | "email" | "tel";
  label: string;
  required: boolean;
  options?: string;
  fullWidth?: boolean;
}

const parseCareersFormFields = (value: unknown): CareersFormField[] => {
  try {
    const raw = typeof value === "string" ? JSON.parse(value || "[]") : value;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((field: any, index: number) => ({
        id: String(field?.id || `field_${index}`),
        type: ["text", "textarea", "select", "number", "email", "tel"].includes(String(field?.type || "text"))
          ? (String(field?.type || "text") as CareersFormField["type"])
          : "text",
        label: String(field?.label || "").trim(),
        required: field?.required === true,
        options: String(field?.options || ""),
        fullWidth: field?.fullWidth === true,
      }))
      .filter((field) => field.label || field.id);
  } catch {
    return [];
  }
};

export const resolveSectionFromSlug = (slug: string) => {
  const normalized = normalizeSlug(slug);
  if (normalized.includes("about")) return "about";
  if (normalized.includes("product")) return "products";
  if (normalized.includes("gallery")) return "gallery";
  if (normalized.includes("partner")) return "partner";
  if (normalized.includes("career")) return "careers";
  if (normalized.includes("testimonial") || normalized.includes("review")) return "testimonials";
  if (normalized.includes("contact")) return "contact";
  return "home";
};

export const isMenuProductSlug = (slug: string) => {
  const normalized = normalizeSlug(slug);
  return normalized.includes("cafe") || normalized.includes("menu");
};

const getMediaSrc = (value: any): string => {
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
    String(item?.reviewerName || item?.reviewreName || item?.fullName || item?.name || "").trim() ||
    "Reviewer",
  role: String(item?.role || item?.designation || item?.jobPosition || "").trim(),
  text: String(item?.review || item?.comment || item?.description || "").trim(),
  rating: Number(item?.starCount ?? item?.rating ?? item?.rate ?? 0) || 0,
});

const getNonEmptyTextList = (...values: unknown[]) =>
  values.map((value) => String(value || "").trim()).filter(Boolean);

export const FOOTER_SOCIAL_KEYS = ["instagram", "facebook", "twitter", "linkedin", "whatsapp"] as const;

const getSocialHref = (key: string, link: unknown) => {
  const value = String(link || "").trim();
  if (!value) return "";
  if (key === "whatsapp") {
    const digits = value.replace(/[^\d]/g, "");
    return digits ? `https://wa.me/${digits}` : "";
  }
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

export const getCareersJobTitle = (job: any) =>
  String(job?.title || job?.designation || job?.name || "Untitled Role").trim();

const formatCareersMetaValue = (value: any, mode: "employmentType" | "workMode" | "generic" = "generic") => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (mode === "employmentType") {
    if (raw === "full_time") return "FULL TIME";
    if (raw === "part_time") return "PART TIME";
    if (raw === "intern") return "INTERN";
    if (raw === "contractor") return "CONTRACTOR";
    if (raw === "trainee") return "TRAINEE";
  }
  if (mode === "workMode") {
    if (raw === "on_site" || raw === "onsite" || raw === "on-site" || raw === "on site") return "ON-SITE";
    if (raw === "remote") return "REMOTE";
    if (raw === "hybrid") return "HYBRID";
  }
  return raw.replace(/_/g, " ").toUpperCase();
};

export const getCareersJobMeta = (job: any) => {
  const meta = [
    formatCareersMetaValue(job?.employmentTypeLabel || job?.employmentType, "employmentType"),
    formatCareersMetaValue(job?.workMode, "workMode"),
    formatCareersMetaValue(job?.location),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map((value) => value.replace(/_/g, " "));
  return meta.length ? meta.join(" | ") : "Apply now to view the full role details.";
};

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

const getProductContentItems = (draft: any, slug: string, page?: any) => {
  const normalized = normalizeSlug(slug);
  if (normalized.includes("meeting")) {
    return Array.isArray(draft?.meetingRooms) ? draft.meetingRooms : Array.isArray(draft?.rooms) ? draft.rooms : [];
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
  if (Array.isArray(page?.subProducts) && page.subProducts.length) {
    return page.subProducts.filter((item: any) => item?.enabled !== false);
  }
  return Array.isArray(draft?.products) ? draft.products : [];
};

export const useWebsiteTemplateData = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<any>(null);
  const previewDraftRawRef = useRef<string | null>(null);

  const [heroIndex, setHeroIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [expandedTestimonials, setExpandedTestimonials] = useState<Record<string, boolean>>({});
  const [galleryViewerOpen, setGalleryViewerOpen] = useState(false);
  const [galleryViewerIndex, setGalleryViewerIndex] = useState(0);
  const [productsMenuOpen, setProductsMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductsMenuOpen, setMobileProductsMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const productsDropdownRef = useRef<HTMLDivElement | null>(null);
  const [testimonialPerView, setTestimonialPerView] = useState(() => {
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  });
  const [productHeroIndex, setProductHeroIndex] = useState(0);

  const [selectedLeadProduct, setSelectedLeadProduct] = useState<any>(null);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadSubmitPending, setLeadSubmitPending] = useState(false);
  const [leadSubmitError, setLeadSubmitError] = useState("");
  const [leadForm, setLeadForm] = useState({
    fullName: "",
    people: "",
    mobile: "",
    email: "",
    startDate: "",
    endDate: "",
  });

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewSubmitPending, setReviewSubmitPending] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState("");
  const [approvedReviews, setApprovedReviews] = useState<any[]>([]);
  const [reviewForm, setReviewForm] = useState({ reviewerName: "", rating: "5", review: "" });
  const [successPopup, setSuccessPopup] = useState({ open: false, message: "" });

  const [partnerForm, setPartnerForm] = useState({ name: "", email: "", mobile: "", message: "" });
  const [partnerSubmitPending] = useState(false); // Classic's partner form has no real submit wiring either

  const [careersJobs, setCareersJobs] = useState<any[]>([]);
  const [careersJobsLoading, setCareersJobsLoading] = useState(false);
  const [careersApplyJob, setCareersApplyJob] = useState<any>(null);
  const [careersApplyForm, setCareersApplyForm] = useState({
    fullName: "",
    email: "",
    dateOfBirth: "",
    phone: "",
    country: "",
    state: "",
    city: "",
  });
  const [careersCustomValues, setCareersCustomValues] = useState<Record<string, string>>({});
  const [applyCountryList] = useState(() => Country.getAllCountries());
  const [applyStateList, setApplyStateList] = useState<any[]>([]);
  const [applyCityList, setApplyCityList] = useState<any[]>([]);
  const [careersResumeFile, setCareersResumeFile] = useState<File | null>(null);
  const [careersApplySubmitted, setCareersApplySubmitted] = useState(false);
  const [careersApplySubmitting, setCareersApplySubmitting] = useState(false);
  const [careersApplyError, setCareersApplyError] = useState("");
  const [careersOpenDepartment, setCareersOpenDepartment] = useState("");
  const [careersDetailTab, setCareersDetailTab] = useState<"description" | "apply">("description");
  const [careersDirectApply, setCareersDirectApply] = useState(false);

  const resetCareersApplyForm = () => {
    setCareersApplyForm({
      fullName: "",
      email: "",
      dateOfBirth: "",
      phone: "",
      country: "",
      state: "",
      city: "",
    });
    setCareersCustomValues({});
    setCareersResumeFile(null);
  };

  const careersFormFields = useMemo(() => parseCareersFormFields(draft?.careersFormFields), [draft?.careersFormFields]);
  const careersApplyDialCode = useMemo(() => {
    const phonecode = applyCountryList.find((c) => c.isoCode === careersApplyForm.country)?.phonecode || "";
    return phonecode ? `+${String(phonecode).replace(/^\+/, "")}` : "";
  }, [applyCountryList, careersApplyForm.country]);

  useEffect(() => {
    const isoCode = careersApplyForm.country;
    setApplyStateList(isoCode ? State.getStatesOfCountry(isoCode) : []);
    setApplyCityList([]);
    setCareersApplyForm((p) => ({ ...p, state: "", city: "" }));
  }, [careersApplyForm.country]);

  useEffect(() => {
    const { country, state } = careersApplyForm;
    setApplyCityList(country && state ? City.getCitiesOfState(country, state) : []);
    setCareersApplyForm((p) => ({ ...p, city: "" }));
  }, [careersApplyForm.state]);

  useEffect(() => {
    const loadDraft = () => {
      try {
        const raw = localStorage.getItem(LIVE_PREVIEW_DRAFT_STORAGE_KEY);
        if (raw === previewDraftRawRef.current) return;
        previewDraftRawRef.current = raw;
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
    if (productsMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [productsMenuOpen]);

  const sourceNavItems = useMemo(
    () =>
      Array.isArray(draft?.pageNavItems)
        ? draft.pageNavItems
        : Array.isArray(draft?.navItems)
          ? draft.navItems
          : [],
    [draft?.pageNavItems, draft?.navItems],
  );

  const navItems = useMemo(() => {
    const fromDraft = sourceNavItems
      .filter((item: any) => item?.enabled !== false)
      .map((item: any) => {
        const slug = normalizeSlug(item?.slug || item?.name || "page");
        // Older saved drafts may still literally have name: "Products" —
        // always render the current label for this section regardless of
        // what was persisted.
        return { name: slug === "products" ? "Services" : item?.name || "Page", slug };
      });
    return fromDraft.length ? fromDraft : FALLBACK_NAV;
  }, [sourceNavItems]);

  const isNavPageEnabled = useCallback(
    (slug: string) => {
      const item = sourceNavItems.find((i: any) => normalizeSlug(i?.slug || i?.name || "") === slug);
      return item ? item?.enabled !== false : true;
    },
    [sourceNavItems],
  );
  const aboutPageEnabled = isNavPageEnabled("about-us");
  const productsPageEnabled = isNavPageEnabled("products");
  const galleryPageEnabled = isNavPageEnabled("gallery");
  const contactPageEnabled = isNavPageEnabled("contact-us");
  const partnerPageEnabled = useMemo(() => {
    const item = sourceNavItems.find((i: any) => normalizeSlug(i?.slug || i?.name || "") === "partner");
    return item ? item?.enabled !== false : true;
  }, [sourceNavItems]);
  const careersPageEnabled = useMemo(() => {
    const item = sourceNavItems.find((i: any) => normalizeSlug(i?.slug || i?.name || "") === "careers");
    return item ? item?.enabled !== false : true;
  }, [sourceNavItems]);

  const isSectionEnabled = (key: string) => draft?.sectionOverrides?.[key] !== false;

  const productPages = useMemo(() => {
    const products = Array.isArray(draft?.products) ? draft.products : [];
    const productImageBySlug: Record<string, string> = {};
    products.forEach((p: any) => {
      const url = getMediaSrc(p?.images?.[0]) || getMediaSrc(p?.files?.[0]) || "";
      if (!url) return;
      [normalizeSlug(p?.type), normalizeSlug(p?.name)].filter(Boolean).forEach((s) => {
        if (!productImageBySlug[s]) productImageBySlug[s] = url;
      });
    });
    const resolveCardImage = (item: any, index: number) =>
      getMediaSrc(item?.cardImage) ||
      getMediaSrc(item?.homeCardImage) ||
      getMediaSrc(
        (Array.isArray(item?.subProducts) ? item.subProducts : []).find(
          (sp: any) => sp?.enabled !== false && getMediaSrc(sp?.images?.[0]),
        )?.images?.[0],
      ) ||
      productImageBySlug[normalizeSlug(item?.slug || item?.name || "")] ||
      getMediaSrc(products?.[index]?.images?.[0]) ||
      getMediaSrc(products?.[index]?.files?.[0]) ||
      "";

    const dropdownPages = Array.isArray(draft?.productDropdownPages) ? draft.productDropdownPages : [];
    if (dropdownPages.length > 0) {
      return dropdownPages
        .filter((item: any) => item?.enabled !== false)
        .map((item: any, index: number) => ({ ...item, cardImage: resolveCardImage(item, index) }));
    }

    const serializedPages = Array.isArray(draft?.productPages) ? draft.productPages : [];
    if (serializedPages.length > 0) {
      return serializedPages
        .filter((item: any) => item?.enabled !== false)
        .map((item: any, index: number) => ({ ...item, cardImage: resolveCardImage(item, index) }));
    }

    return products
      .map((product: any, index: number) => {
        const name = String(product?.name || product?.type || "").trim();
        if (!name) return null;
        const image = getMediaSrc(product?.images?.[0]) || getMediaSrc(product?.files?.[0]) || "";
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
  }, [draft?.productDropdownPages, draft?.productPages, draft?.products]);

  const menuItems = useMemo(() => (Array.isArray(draft?.menuItems) ? draft.menuItems : []), [draft?.menuItems]);

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
    () => productPages.find((item: any) => normalizeSlug(item?.slug || item?.name || "") === currentProductSlug) || null,
    [productPages, currentProductSlug],
  );

  const selectedDetailItem = useMemo(() => {
    if (!currentItemSlug || !selectedProductPage) return null;
    const contentItems = getProductContentItems(draft, (selectedProductPage as any)?.slug || (selectedProductPage as any)?.name || "", selectedProductPage);
    const pool = contentItems.length ? contentItems : [selectedProductPage];
    return pool.find((item: any) => normalizeSlug(item?.title || item?.name || item?.heading || "") === currentItemSlug) || null;
  }, [currentItemSlug, selectedProductPage, draft]);

  const selectedProductContentItems = selectedProductPage
    ? getProductContentItems(draft, (selectedProductPage as any)?.slug || (selectedProductPage as any)?.name || "", selectedProductPage)
    : [];

  const selectedProductHeroImages = Array.isArray((selectedProductPage as any)?.heroImages) ? (selectedProductPage as any).heroImages : [];
  const selectedProductHeroImage =
    getMediaSrc(selectedProductHeroImages[productHeroIndex]) ||
    getMediaSrc(selectedProductHeroImages[0]) ||
    getMediaSrc((selectedProductPage as any)?.heroImage) ||
    getMediaSrc((selectedProductPage as any)?.cardImage) ||
    "";

  useEffect(() => {
    setProductHeroIndex(0);
  }, [currentProductSlug]);

  const prevDetailItemSlugRef = useRef("");
  useEffect(() => {
    if (selectedDetailItem && selectedProductPage) {
      const detailTitle = String((selectedDetailItem as any)?.title || (selectedDetailItem as any)?.name || (selectedDetailItem as any)?.heading || "Service").trim();
      const detailDescription = String((selectedDetailItem as any)?.description || (selectedDetailItem as any)?.subText || (selectedProductPage as any)?.subText || "").trim();
      const detailImage = getMediaSrc((selectedDetailItem as any)?.images?.[0]) || getMediaSrc((selectedDetailItem as any)?.cardImage) || getMediaSrc((selectedProductPage as any)?.cardImage) || "";
      const currentSlug = normalizeSlug((selectedDetailItem as any)?.title || (selectedDetailItem as any)?.name || (selectedDetailItem as any)?.heading || "");

      setSelectedLeadProduct({
        ...(selectedProductPage as any),
        ...(selectedDetailItem as any),
        name: detailTitle,
        subText: detailDescription,
        cardImage: detailImage,
      });

      if (prevDetailItemSlugRef.current !== currentSlug) {
        prevDetailItemSlugRef.current = currentSlug;
        setLeadSubmitted(false);
        setLeadSubmitError("");
        setLeadForm({ fullName: "", people: "", mobile: "", email: "", startDate: "", endDate: "" });
      }
    } else if (!selectedDetailItem) {
      prevDetailItemSlugRef.current = "";
      setSelectedLeadProduct(null);
    }
  }, [selectedDetailItem, selectedProductPage]);

  const heroImages = Array.isArray(draft?.heroImages) ? draft.heroImages : [];

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = window.setInterval(() => setHeroIndex((prev) => (prev + 1) % heroImages.length), 3500);
    return () => window.clearInterval(timer);
  }, [heroImages.length]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileProductsMenuOpen(false);
    const scrollableDiv = document.getElementById("scrollable-content");
    if (scrollableDiv) scrollableDiv.scrollTo({ top: 0, behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    const testimonialCount =
      approvedReviews.length + (Array.isArray(draft?.testimonials) ? draft.testimonials.length : 0);
    const maxPages = Math.max(1, Math.ceil(testimonialCount / testimonialPerView));
    if (testimonialIndex >= maxPages) setTestimonialIndex(0);
  }, [approvedReviews, draft?.testimonials, testimonialIndex, testimonialPerView]);

  const fetchPostedJobs = useCallback(async () => {
    const workspaceId = draft?.workspaceId || "";
    if (!workspaceId) return;
    setCareersJobsLoading(true);
    try {
      const response = await api.get("/api/recruitment/jobs/public", { params: { workspaceId } });
      setCareersJobs(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch (err) {
      setCareersJobs([]);
    } finally {
      setCareersJobsLoading(false);
    }
  }, [draft?.workspaceId]);

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
        const response = await api.get("/api/review/public", { params: { searchKey, companyId, workspaceId } });
        setApprovedReviews(Array.isArray(response?.data?.reviews) ? response.data.reviews : []);
      } catch (error) {
        console.error("Failed to load approved website reviews", error);
        setApprovedReviews([]);
      }
    };
    if (draft) {
      void fetchApprovedReviews();
      void fetchPostedJobs();
    }
  }, [draft?.searchKey, draft?.companyId, draft?.workspaceId, fetchPostedJobs]);

  const careersDepartmentSections = useMemo(() => {
    const grouped = new Map<string, any[]>();
    careersJobs.forEach((job: any) => {
      const department = String(job?.department || "").trim() || "Open Positions";
      const bucket = grouped.get(department) || [];
      bucket.push(job);
      grouped.set(department, bucket);
    });
    const orderedDepartments = [
      ...CAREERS_DEFAULT_DEPARTMENT_ORDER,
      ...Array.from(grouped.keys()).filter((d) => !CAREERS_DEFAULT_DEPARTMENT_ORDER.includes(d)).sort(),
    ].filter((d, index, list) => list.indexOf(d) === index && grouped.has(d));
    return orderedDepartments.map((department, index) => ({
      department,
      ordinal: CAREERS_ROMAN_NUMERALS[index] || String(index + 1),
      jobs: grouped.get(department) || [],
    }));
  }, [careersJobs]);

  const heroImage = heroImages[heroIndex] || heroImages[0] || "";
  // Single fixed "featured" shot for templates that pair it with a rotating
  // background carousel (heroImages) — e.g. Fresh Studio. Falls back to the
  // current carousel image so those templates still show something before a
  // dedicated main image is ever set.
  const mainHeroImage = getMediaSrc(draft?.mainHeroImage) || heroImage || "";
  const galleryItems = Array.isArray(draft?.gallery) ? draft.gallery.map((item: any) => getMediaSrc(item)).filter(Boolean) : [];
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
  const approvedTestimonials = approvedReviews.map(mapReviewToTestimonial).filter((item) => item.text);
  const testimonials = [...draftTestimonials, ...approvedTestimonials].filter(
    (item, index, array) =>
      index ===
      array.findIndex(
        (candidate) =>
          String(candidate?.key || "").trim() === String(item?.key || "").trim() ||
          (candidate?.name === item?.name && candidate?.text === item?.text),
      ),
  );
  const testimonialPages = Math.max(1, Math.ceil(testimonials.length / testimonialPerView));
  const visibleTestimonials = testimonials.slice(
    testimonialIndex * testimonialPerView,
    testimonialIndex * testimonialPerView + testimonialPerView,
  );

  useEffect(() => {
    if (testimonialPages <= 1) return;
    const timer = window.setInterval(() => setTestimonialIndex((prev) => (prev + 1) % testimonialPages), 3000);
    return () => window.clearInterval(timer);
  }, [testimonialPages]);

  useEffect(() => {
    if (galleryViewerIndex >= galleryItems.length) setGalleryViewerIndex(0);
  }, [galleryItems.length, galleryViewerIndex]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) setTestimonialPerView(1);
      else if (window.innerWidth < 1024) setTestimonialPerView(2);
      else setTestimonialPerView(3);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const aboutBlocks = Array.isArray(draft?.about) ? draft.about : [];
  const aboutIntroBlocks = getNonEmptyTextList(
    draft?.aboutPageIntro,
    draft?.aboutPageOverview,
    ...aboutBlocks.map((block: any) => (typeof block === "string" ? block : block?.text)),
  );
  const aboutNarrativeBlocks = [
    { title: "Our Story", body: String(draft?.aboutPageStory || "").trim() },
    { title: "Our Mission", body: String(draft?.aboutPageMission || "").trim() },
    { title: "Our Vision", body: String(draft?.aboutPageVision || "").trim() },
    { title: "Our Values", body: String(draft?.aboutPageValues || "").trim() },
  ].filter((item) => item.body);
  const aboutPageImageCards = Array.isArray(draft?.aboutPageImageCards)
    ? draft.aboutPageImageCards.filter(
        (card: any) => String(card?.title || "").trim() || String(card?.description || "").trim() || card?.image,
      )
    : [];
  const founders = Array.isArray(draft?.founders) ? draft.founders.filter((f: any) => String(f?.name || "").trim()) : [];
  const showWriteReview = draft?.testimonialsEnableWriteReview !== false;

  const partnerPageHeading = String(draft?.partnerPageHeading || "").trim();
  const partnerPageContent = String(draft?.partnerPageContent || "").trim();
  const partnerFormTitle = String(draft?.partnerFormTitle || "").trim();

  const contactEmail = String(draft?.email || "").trim();
  const contactPhone = String(draft?.phone || "").trim();
  const contactAddress = String(draft?.address || "").trim();
  const footerCompanyName = String(draft?.registeredCompanyName || draft?.companyName || "").trim();
  const footerCopyrightText = String(draft?.copyrightText || "").trim();
  const footerAddress = String(draft?.address || "").trim();
  const footerSocialLinks = FOOTER_SOCIAL_KEYS.map((key) => {
    const entry = draft?.socials?.[key];
    if (entry?.enabled !== true) return null;
    const href = getSocialHref(key, entry?.link);
    if (!href) return null;
    return { key, href };
  }).filter(Boolean) as Array<{ key: string; href: string }>;

  const resolvedHomeHeroImage = heroImage || galleryItems[0] || "";
  const showHeroCarousel = heroImages.length > 1;

  const getPreviewRouteForSection = (slug: string) => {
    const sectionId = resolveSectionFromSlug(slug);
    return sectionId === "home" ? "/website-preview/page/home" : `/website-preview/page/${sectionId}`;
  };
  const getPreviewRouteForProduct = (slug: string) => `/website-preview/page/products/${normalizeSlug(slug)}`;

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
  const goToProductItem = (productSlug: string, itemSlug: string) => {
    navigate(`/website-preview/page/products/${normalizeSlug(productSlug)}/${normalizeSlug(itemSlug)}`);
  };
  const handleProductCardAction = (product: any) => {
    const slug = normalizeSlug(product?.slug || product?.name || "");
    navigate(`/website-preview/page/products/${slug}`);
  };

  const handleHeroNext = () => {
    if (heroImages.length <= 1) return;
    setHeroIndex((prev) => (prev + 1) % heroImages.length);
  };
  const handleHeroPrev = () => {
    if (heroImages.length <= 1) return;
    setHeroIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };
  const handleProductHeroNext = () => {
    if (selectedProductHeroImages.length <= 1) return;
    setProductHeroIndex((prev) => (prev + 1) % selectedProductHeroImages.length);
  };
  const handleProductHeroPrev = () => {
    if (selectedProductHeroImages.length <= 1) return;
    setProductHeroIndex((prev) => (prev - 1 + selectedProductHeroImages.length) % selectedProductHeroImages.length);
  };

  const openGalleryViewer = (index: number) => {
    if (!galleryItems.length) return;
    setGalleryViewerIndex(Math.max(0, Math.min(index, galleryItems.length - 1)));
    setGalleryViewerOpen(true);
  };
  const closeGalleryViewer = () => setGalleryViewerOpen(false);
  const goToGalleryIndex = (index: number) => {
    if (!galleryItems.length) return;
    setGalleryViewerIndex(((index % galleryItems.length) + galleryItems.length) % galleryItems.length);
  };

  const openLeadModal = (product: any) => {
    setSelectedLeadProduct(product);
    setLeadSubmitted(false);
    setLeadSubmitError("");
    setLeadForm({ fullName: "", people: "", mobile: "", email: "", startDate: "", endDate: "" });
  };
  const closeLeadModal = () => setSelectedLeadProduct(null);

  const showSuccessPopup = (message: string) => {
    setSuccessPopup({ open: true, message });
    window.setTimeout(() => {
      setSuccessPopup((prev) => (prev.message === message ? { open: false, message: "" } : prev));
    }, 2200);
  };

  const submitLeadForm = async (event: FormEvent) => {
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
        stayDuration: leadForm.endDate ? `${leadForm.startDate || ""} to ${leadForm.endDate}` : "",
        startDate: leadForm.startDate,
        endDate: leadForm.endDate,
        timeSlot: "",
        inquiryType: slug.includes("cafe") ? "Cafe" : "",
        websiteUrl: window.location.href,
      });
      setLeadSubmitted(true);
      // On the standalone product-detail route we keep the success state inline
      // instead of closing (there's no modal to close there).
      if (!selectedDetailItem) closeLeadModal();
      showSuccessPopup("Lead submitted successfully.");
    } catch (error: any) {
      console.error("Failed to submit website lead", error);
      setLeadSubmitError(error?.response?.data?.message || "Failed to submit lead. Please try again.");
    } finally {
      setLeadSubmitPending(false);
    }
  };

  const openReviewModal = () => {
    setReviewSubmitted(false);
    setReviewSubmitError("");
    setReviewForm({ reviewerName: "", rating: "5", review: "" });
    setReviewModalOpen(true);
  };

  const submitReviewForm = async (event: FormEvent) => {
    event.preventDefault();
    setReviewSubmitPending(true);
    setReviewSubmitError("");
    try {
      await api.post("/api/review/create-website-review", {
        reviewerName: reviewForm.reviewerName,
        rating: Number(reviewForm.rating || 5),
        starCount: Number(reviewForm.rating || 5),
        review: reviewForm.review,
        source: "website",
        reviewSource: "Website Reviews",
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
      showSuccessPopup(draft?.testimonialsSuccessMessage || "Review submitted successfully.");
    } catch (error: any) {
      console.error("Failed to submit website review", error);
      setReviewSubmitError(error?.response?.data?.message || "Failed to submit review. Please try again.");
    } finally {
      setReviewSubmitPending(false);
    }
  };

  const openCareersJob = (job: any) => {
    setCareersOpenDepartment(String(job?.department || "").trim() || "Open Positions");
    setCareersApplyJob(job);
    setCareersDetailTab("description");
    setCareersDirectApply(false);
    resetCareersApplyForm();
    setCareersApplySubmitted(false);
    setCareersApplyError("");
  };

  const openCareersGeneralApply = () => {
    resetCareersApplyForm();
    setCareersApplySubmitted(false);
    setCareersApplyError("");
    setCareersDetailTab("apply");
    setCareersDirectApply(true);
    setCareersApplyJob({ jobTitle: "General Application", jobCode: "GENERAL" });
  };

  const closeCareersJob = () => {
    setCareersApplyJob(null);
    setCareersApplySubmitted(false);
    setCareersApplyError("");
    setCareersDetailTab("description");
    setCareersDirectApply(false);
    resetCareersApplyForm();
  };

  const submitCareersApplication = async (event: FormEvent) => {
    event.preventDefault();
    setCareersApplySubmitting(true);
    setCareersApplyError("");
    try {
      const payload = new FormData();
      payload.append("workspaceId", draft?.workspaceId || "");
      payload.append("jobCode", careersApplyJob?.jobCode || "");
      payload.append("jobTitle", getCareersJobTitle(careersApplyJob));
      payload.append("fullName", careersApplyForm.fullName);
      payload.append("email", careersApplyForm.email);
      payload.append("dateOfBirth", careersApplyForm.dateOfBirth);
      payload.append("phone", [careersApplyDialCode, careersApplyForm.phone.trim()].filter(Boolean).join(" "));
      payload.append("country", careersApplyForm.country);
      payload.append("state", careersApplyForm.state);
      payload.append("city", careersApplyForm.city);
      payload.append("customFields", JSON.stringify(careersCustomValues));
      if (careersResumeFile) payload.append("resumeFile", careersResumeFile);
      await api.post("/api/recruitment/jobs/apply", payload);
      setCareersApplySubmitted(true);
    } catch (err: any) {
      setCareersApplyError(err?.response?.data?.message || "Failed to submit application. Please try again.");
    } finally {
      setCareersApplySubmitting(false);
    }
  };

  return {
    draft,
    currentSection,
    navItems,
    isSectionEnabled,
    aboutPageEnabled,
    productsPageEnabled,
    galleryPageEnabled,
    contactPageEnabled,
    partnerPageEnabled,
    careersPageEnabled,
    productPages,
    menuItems,
    isMenuProductSlug,
    heroImages,
    heroImage,
    mainHeroImage,
    resolvedHomeHeroImage,
    showHeroCarousel,
    heroIndex,
    handleHeroNext,
    handleHeroPrev,
    galleryItems,
    homeGalleryItems,
    galleryViewerOpen,
    galleryViewerIndex,
    openGalleryViewer,
    closeGalleryViewer,
    goToGalleryIndex,
    testimonials,
    testimonialPages,
    visibleTestimonials,
    testimonialIndex,
    setTestimonialIndex,
    expandedTestimonials,
    setExpandedTestimonials,
    showWriteReview,
    reviewModalOpen,
    setReviewModalOpen,
    reviewForm,
    setReviewForm,
    reviewSubmitted,
    reviewSubmitPending,
    reviewSubmitError,
    openReviewModal,
    submitReviewForm,
    aboutBlocks,
    aboutIntroBlocks,
    aboutNarrativeBlocks,
    aboutPageImageCards,
    founders,
    partnerPageHeading,
    partnerPageContent,
    partnerFormTitle,
    partnerForm,
    setPartnerForm,
    partnerSubmitPending,
    contactEmail,
    contactPhone,
    contactAddress,
    footerCompanyName,
    footerCopyrightText,
    footerAddress,
    footerSocialLinks,
    selectedLeadProduct,
    leadForm,
    setLeadForm,
    leadSubmitted,
    setLeadSubmitted,
    leadSubmitPending,
    leadSubmitError,
    openLeadModal,
    closeLeadModal,
    submitLeadForm,
    getLeadFieldsForProduct,
    successPopup,
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileProductsMenuOpen,
    setMobileProductsMenuOpen,
    productsMenuOpen,
    setProductsMenuOpen,
    productsDropdownRef,
    headerRef,
    goToSection,
    goToProductPage,
    goToProductItem,
    handleProductCardAction,
    // Product listing/detail
    currentProductSlug,
    currentItemSlug,
    selectedProductPage,
    selectedDetailItem,
    selectedProductContentItems,
    selectedProductHeroImages,
    selectedProductHeroImage,
    productHeroIndex,
    handleProductHeroNext,
    handleProductHeroPrev,
    // Careers
    careersJobs,
    careersJobsLoading,
    careersApplyJob,
    openCareersJob,
    openCareersGeneralApply,
    closeCareersJob,
    careersApplyForm,
    setCareersApplyForm,
    careersCustomValues,
    setCareersCustomValues,
    applyCountryList,
    applyStateList,
    applyCityList,
    careersResumeFile,
    setCareersResumeFile,
    careersApplySubmitted,
    careersApplySubmitting,
    careersApplyError,
    careersOpenDepartment,
    setCareersOpenDepartment,
    careersDetailTab,
    setCareersDetailTab,
    careersDirectApply,
    careersFormFields,
    careersApplyDialCode,
    careersDepartmentSections,
    submitCareersApplication,
    careersFallbackIntro: CAREERS_FALLBACK_INTRO,
    careersFallbackClose: CAREERS_FALLBACK_CLOSE,
  };
};
