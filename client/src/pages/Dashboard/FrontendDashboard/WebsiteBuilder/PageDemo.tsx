import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../../../utils/axios";

const LIVE_PREVIEW_DRAFT_STORAGE_KEY = "website_builder_live_preview_draft";

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
  { name: "Testimonials", slug: "testimonials" },
  { name: "Contact", slug: "contact" },
];

const resolveSectionFromSlug = (slug: string) => {
  const normalized = normalizeSlug(slug);
  if (normalized.includes("about")) return "about";
  if (normalized.includes("product")) return "products";
  if (normalized.includes("gallery")) return "gallery";
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
const IMAGE_ACTION_BUTTON =
  "rounded-full border-2 border-white/90 bg-black/60 px-8 py-2 text-[12px] font-semibold uppercase text-white shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur-[2px] transition hover:bg-black/70 font-['Poppins',ui-sans-serif,system-ui,sans-serif]";
const MOBILE_SECTION_HEADING =
  "text-center text-[22px] md:text-[32px] font-semibold uppercase tracking-normal text-[#000000] font-['Poppins',ui-sans-serif,system-ui,sans-serif]";

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
    () =>
      Array.isArray(draft?.productDropdownPages)
        ? draft.productDropdownPages.map((item: any, index: number) => ({
            ...item,
            cardImage:
              getMediaSrc(item?.cardImage) ||
              getMediaSrc(item?.homeCardImage) ||
              getMediaSrc(draft?.products?.[index]?.images?.[0]) ||
              getMediaSrc(draft?.products?.[index]?.files?.[0]) ||
              "",
          }))
        : Array.isArray(draft?.productPages)
          ? draft.productPages.map((item: any, index: number) => ({
              ...item,
              cardImage:
                getMediaSrc(item?.cardImage) ||
                getMediaSrc(draft?.products?.[index]?.images?.[0]) ||
                getMediaSrc(draft?.products?.[index]?.files?.[0]) ||
                "",
            }))
          : [],
    [draft?.productDropdownPages, draft?.productPages, draft?.products],
  );
  const menuItems = useMemo(
    () => (Array.isArray(draft?.menuItems) ? draft.menuItems : []),
    [draft?.menuItems],
  );

  const { currentSection, currentProductSlug } = useMemo(() => {
    const relative = String(location.pathname || "").replace(/^\/website-preview\/?/, "");
    const rawParts = relative.split("/").filter(Boolean);
    const parts = rawParts[0] === "page" ? rawParts.slice(1) : rawParts;
    const section = resolveSectionFromSlug(parts[0] || "home");
    const productSlug = parts[1] ? normalizeSlug(parts[1]) : "";
    return { currentSection: section, currentProductSlug: productSlug };
  }, [location.pathname]);

  const selectedProductPage = useMemo(
    () =>
      productPages.find(
        (item: any) => normalizeSlug(item?.slug || item?.name || "") === currentProductSlug,
      ) || null,
    [productPages, currentProductSlug],
  );

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

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileProductsMenuOpen(false);
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
  const galleryItems = Array.isArray(draft?.gallery) ? draft.gallery : [];
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

  useEffect(() => {
    if (testimonialPages <= 1) return;
    const timer = window.setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonialPages);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [testimonialPages]);

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
      closeLeadModal();
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
    "";
  const selectedProductContentItems = selectedProductPage
    ? getProductContentItems(draft, selectedProductPage?.slug || selectedProductPage?.name || "")
    : [];
  const resolvedHomeHeroImage = heroImage || galleryItems[0] || "";
  const showHeroCarousel = heroImages.length > 1;

  return (
    <div className="min-h-screen bg-[#e9e9e9] text-[#1f1f1f]">
      <header ref={headerRef} className="sticky top-0 z-30 border-b border-slate-300 bg-[#f4f4f4] shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <button
            type="button"
            onClick={() => goToSection("home")}
            className="flex h-16 w-24 items-center justify-between overflow-hidden lg:w-36"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
          >
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-4 bg-current" />
              <span className="block h-0.5 w-4 bg-current" />
              <span className="block h-0.5 w-4 bg-current" />
            </span>
          </button>

          <nav className="hidden flex-1 items-center justify-center gap-6 px-1 md:flex">
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
                      {productPages.map((product: any, idx: number) => (
                        <button
                          key={`product-nav-${idx}`}
                          type="button"
                          onClick={() => goToProductPage(product?.slug || product?.name || "product")}
                          className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100"
                        >
                          {product?.name || "Product"}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="hidden min-w-[170px] md:block" />
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
            </div>
          </div>
        ) : null}
      </header>

      {currentSection === "home" ? (
        <>
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

          <section id="products" className={SECTION_BLOCK}>
            <div className={CONTENT_WRAP}>
              <h2 className={MOBILE_SECTION_HEADING}>Our Products</h2>
              <div className="mt-6 grid grid-cols-1 gap-4 md:mt-10 md:grid-cols-3 md:gap-7">
                {productPages.map((item: any, idx: number) => (
                  <article key={`product-${idx}`} className="flex flex-col items-center">
                    <h3 className="mb-3 text-base font-medium md:text-xl">{item?.heading || item?.name || "Product"}</h3>
                    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-200">
                      {item?.cardImage ? (
                        <img
                          src={item.cardImage}
                          alt={item?.heading || item?.name}
                          className="h-[190px] w-full object-cover md:h-[220px]"
                        />
                      ) : (
                        <div className="h-[190px] w-full md:h-[220px]" />
                      )}
                      <div className="absolute inset-x-0 bottom-4 flex justify-center md:bottom-6">
                        <button
                          type="button"
                          onClick={() => handleProductCardAction(item)}
                          className={IMAGE_ACTION_BUTTON}
                        >
                          EXPLORE
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="gallery" className={SECTION_BLOCK}>
            <div className={CONTENT_WRAP}>
              <h2 className={MOBILE_SECTION_HEADING}>{draft?.galleryTitle || "Gallery"}</h2>
              <div className="mt-6 grid grid-cols-1 gap-[8px] sm:grid-cols-2 md:mt-10 md:grid-cols-3">
                {homeGalleryItems.map((item: string, idx: number) => (
                  <div key={`gallery-${idx}`} className="overflow-hidden rounded-lg bg-slate-100">
                    <img src={item} alt={`Gallery ${idx + 1}`} className="h-[190px] w-full object-cover md:h-[256px]" />
                  </div>
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

          <section id="testimonials" className={SECTION_BLOCK}>
            <div className={CONTENT_WRAP}>
              <h2 className={MOBILE_SECTION_HEADING}>{draft?.testimonialTitle || "Testimonials"}</h2>
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

          <section id="contact" className={SECTION_BLOCK}>
            <div className={CONTENT_WRAP}>
              <h2 className={MOBILE_SECTION_HEADING}>{draft?.contactTitle || "Contact"}</h2>
              <div className="mt-6 grid grid-cols-1 gap-4 md:mt-8 md:grid-cols-12">
                <div className="md:col-span-8">
                  {draft?.mapUrl ? (
                    <iframe
                      title="map"
                      src={draft.mapUrl}
                      className="h-[220px] w-full border-0 md:h-[360px]"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="h-[220px] w-full bg-slate-300 md:h-[360px]" />
                  )}
                </div>
                <div className="md:col-span-4">
                    <div className="min-h-[220px] bg-[#efefef] p-5 shadow-sm md:h-[360px] md:p-8">
                      {draft?.companyLogo ? (
                      <img src={draft.companyLogo} alt={draft.companyName || "Company"} className="h-12 w-auto object-contain md:h-14" />
                      ) : null}
                    <div className="mt-6 space-y-2 text-sm md:mt-10 md:space-y-4 md:text-base">
                      {draft?.email ? <p>{draft.email}</p> : null}
                      {draft?.phone ? <p>{draft.phone}</p> : null}
                      {draft?.address ? <p>{draft.address}</p> : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

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
                        <img src={card.image} alt={card?.title || `About Card ${idx + 1}`} className="h-[220px] w-full object-cover" />
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

      {currentSection === "products" ? (
        <section className={SECTION_BLOCK}>
          <div className={CONTENT_WRAP}>
            {selectedProductPage ? (
              <>
                <section className="relative mb-6 h-[30svh] min-h-[220px] overflow-hidden rounded-xl bg-[#1f1f1f] md:mb-10 md:h-[44vh] md:min-h-[280px]">
                  {selectedProductHeroImage ? (
                    <img
                      src={selectedProductHeroImage}
                      alt={selectedProductPage?.name || "Product Hero"}
                      className="h-full w-full object-cover opacity-60"
                    />
                  ) : null}

                  <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-white">
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

                {isMenuProductSlug(selectedProductPage?.slug || "") ? (
                  <>
                    <h2 className={MOBILE_SECTION_HEADING}>Our Products</h2>
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
                    <h2 className={MOBILE_SECTION_HEADING}>Our Products</h2>
                    <div className="mt-6 grid grid-cols-1 gap-4 md:mt-8 md:grid-cols-3 md:gap-7">
                      {(selectedProductContentItems.length ? selectedProductContentItems : [selectedProductPage]).map(
                        (item: any, idx: number) => {
                          const detailImage =
                            item?.images?.[0] || item?.cardImage || selectedProductPage?.cardImage || "";
                          const detailTitle =
                            item?.title ||
                            item?.name ||
                            item?.heading ||
                            selectedProductPage?.heading ||
                            selectedProductPage?.name ||
                            "Product";
                          const detailDescription =
                            item?.description || item?.subText || selectedProductPage?.subText || "";
                          const detailTarget = {
                            ...selectedProductPage,
                            ...item,
                            name: detailTitle,
                            subText: detailDescription,
                            cardImage: detailImage,
                          };

                          return (
                            <article key={`product-detail-${idx}`} className="flex flex-col items-center">
                              <h3 className="mb-3 text-base font-medium md:text-xl">{detailTitle}</h3>
                              <div className="relative w-full overflow-hidden rounded-2xl bg-slate-200">
                                {detailImage ? (
                                  <img
                                    src={detailImage}
                                    alt={detailTitle}
                                    className="h-[190px] w-full object-cover md:h-[220px]"
                                  />
                                ) : (
                                  <div className="h-[190px] w-full md:h-[220px]" />
                                )}
                                <div className="absolute inset-0 bg-black/20" />
                              <div className="absolute inset-x-0 bottom-4 flex justify-center md:bottom-6">
                                <button
                                  type="button"
                                    onClick={() => openLeadModal(detailTarget)}
                                    className={IMAGE_ACTION_BUTTON}
                                  >
                                    VIEW DETAILS
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
              </>
            ) : (
              <>
                <h2 className={MOBILE_SECTION_HEADING}>Our Products</h2>
                <div className="mt-6 grid grid-cols-1 gap-4 md:mt-10 md:grid-cols-3 md:gap-7">
                  {productPages.map((item: any, idx: number) => (
                    <article key={`product-page-${idx}`} className="flex flex-col items-center">
                      <h3 className="mb-3 text-base font-medium md:text-xl">{item?.heading || item?.name || "Product"}</h3>
                      <div className="relative w-full overflow-hidden rounded-2xl bg-slate-200">
                        {item?.cardImage ? (
                          <img src={item.cardImage} alt={item?.heading || item?.name} className="h-[190px] w-full object-cover md:h-[220px]" />
                        ) : (
                          <div className="h-[190px] w-full md:h-[220px]" />
                        )}
                        <div className="absolute inset-x-0 bottom-4 flex justify-center md:bottom-6">
                          <button
                            type="button"
                            onClick={() => handleProductCardAction(item)}
                            className={IMAGE_ACTION_BUTTON}
                          >
                            VIEW DETAILS
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      ) : null}

      {currentSection === "gallery" ? (
        <section className={SECTION_BLOCK}>
          <div className={CONTENT_WRAP}>
            <h2 className={MOBILE_SECTION_HEADING}>{draft?.galleryTitle || "Gallery"}</h2>
              <div className="mt-6 grid grid-cols-1 gap-[8px] sm:grid-cols-2 md:mt-10 md:grid-cols-3">
              {galleryItems.map((item: string, idx: number) => (
                <div key={`gallery-page-${idx}`} className="overflow-hidden rounded-lg bg-slate-100">
                  <img src={item} alt={`Gallery ${idx + 1}`} className="h-[190px] w-full object-cover md:h-[256px]" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {currentSection === "testimonials" ? (
        <section className={SECTION_BLOCK}>
          <div className={CONTENT_WRAP}>
            <h2 className={MOBILE_SECTION_HEADING}>{draft?.testimonialTitle || "Testimonials"}</h2>
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

      {currentSection === "contact" ? (
        <section className="px-4 py-10 md:px-6 md:py-12">
          <div className={CONTENT_WRAP}>
            <h2 className={MOBILE_SECTION_HEADING}>{draft?.contactTitle || "Contact"}</h2>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-8">
                {draft?.mapUrl ? (
                  <iframe
                    title="map"
                    src={draft.mapUrl}
                    className="h-[260px] w-full border-0 md:h-[360px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="h-[360px] w-full bg-slate-300" />
                )}
              </div>
              <div className="md:col-span-4">
                <div className="min-h-[260px] bg-[#efefef] p-6 shadow-sm md:h-[360px] md:p-8">
                  {draft?.companyLogo ? (
                    <img src={draft.companyLogo} alt={draft.companyName || "Company"} className="h-12 w-auto object-contain md:h-14" />
                  ) : null}
                  <div className="mt-8 space-y-3 text-sm md:mt-10 md:space-y-4 md:text-base">
                    {draft?.email ? <p>{draft.email}</p> : null}
                    {draft?.phone ? <p>{draft.phone}</p> : null}
                    {draft?.address ? <p>{draft.address}</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <footer className={`mt-8 border-t border-slate-300 bg-[#ececec] ${FOOTER_TEXT}`}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 text-center md:grid-cols-3 md:text-left">
          <div>
            {draft?.companyLogo ? (
              <img
                src={draft.companyLogo}
                alt={draft.companyName || "Company"}
                className="mx-auto h-10 w-auto object-contain md:mx-0 md:h-12"
              />
            ) : null}
            <p className="mt-2 text-[15px] font-semibold text-[#111827] md:text-[18px]">{draft?.companyName || "Globex"}</p>
            <p className={FOOTER_BODY_TEXT}>{draft?.address || "Panjim-Goa"}</p>
          </div>
          <div>
            <h3 className={FOOTER_HEADING}>Quick Links</h3>
            <div className={FOOTER_BODY_TEXT}>
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
          {draft?.copyrightText || `(c) Copyright 2025-26 ${draft?.registeredCompanyName || draft?.companyName || "Globex"} - All rights reserved. Powered By WoNo`}
        </div>
      </footer>

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
                ×
              </button>
            </div>

            <form onSubmit={submitReviewForm} className="mt-6 grid grid-cols-1 gap-4">
                <input
                  type="text"
                  className="border-b border-slate-300 px-0 py-2 text-sm outline-none placeholder:text-slate-500 md:text-base"
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

      {selectedLeadProduct ? (
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
                ×
              </button>

              <div className="relative grid w-full grid-cols-1 gap-6 rounded-xl bg-white p-4 md:grid-cols-2">
                <div className="relative overflow-hidden rounded-xl bg-slate-100 md:min-h-[520px]">
                  {selectedLeadProduct?.cardImage ? (
                    <img
                      src={selectedLeadProduct.cardImage}
                      alt={selectedLeadProduct?.name || "Product"}
                      className="h-[260px] w-full object-cover sm:h-[320px] md:h-full"
                    />
                  ) : (
                    <div className="h-[260px] w-full sm:h-[320px] md:h-full" />
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                </div>

                <div className="font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:flex md:min-h-[520px] md:flex-col md:justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase text-slate-900">
                      {selectedLeadProduct?.name || "Product"}
                    </h3>
                    {(() => {
                      const subText = String(selectedLeadProduct?.subText || "").trim();
                      const desc = String(
                        getLeadMetaForProduct(selectedLeadProduct)?.description || "",
                      ).trim();
                      if (!subText || subText === desc) return null;
                      return <p className="mt-2 text-base text-gray-600">{subText}</p>;
                    })()}
                    <p className="mt-2 text-base font-semibold text-secondary-dark">
                      {getLeadMetaForProduct(selectedLeadProduct).priceLine}
                    </p>
                    <p className="mt-4 border-b border-slate-200 pb-6 text-sm leading-8 text-gray-700">
                      {getLeadMetaForProduct(selectedLeadProduct).description}
                    </p>

                    <h4 className="mt-6 text-xl font-bold uppercase text-slate-900">
                      {getLeadMetaForProduct(selectedLeadProduct).label}
                    </h4>

                    <form onSubmit={submitLeadForm} className="mt-4 grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
                        {getLeadFieldsForProduct(selectedLeadProduct?.slug || "").map((field) => (
                          <input
                            key={field.key}
                            type={field.type}
                            className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-700 outline-none placeholder:font-['Poppins',ui-sans-serif,system-ui,sans-serif] placeholder:text-gray-400 focus:border-slate-500"
                            placeholder={field.label}
                            value={(leadForm as any)[field.key] || ""}
                            onChange={(e) =>
                              setLeadForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            required={field.required}
                            style={{
                              borderRadius: 0,
                              boxShadow: "none",
                              appearance: "none",
                              WebkitAppearance: "none",
                            }}
                          />
                        ))}
                        {leadSubmitError ? (
                          <p className="lg:col-span-2 text-sm text-red-600">{leadSubmitError}</p>
                        ) : null}
                        <div className="pt-2 lg:col-span-2">
                          <button
                            type="submit"
                            disabled={leadSubmitPending}
                            className="rounded-full bg-[#6f6f6f] px-8 py-3 text-sm font-semibold text-white"
                          >
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
      ) : null}

      {successPopup.open ? (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-[70] flex justify-center px-4">
          <div className="rounded-2xl border border-green-200 bg-white px-6 py-4 text-center shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
            <p className="text-sm font-semibold text-green-700 md:text-base">
              {successPopup.message}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PageDemo;
