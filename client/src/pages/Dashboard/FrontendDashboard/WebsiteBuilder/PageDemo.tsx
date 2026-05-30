import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LIVE_PREVIEW_DRAFT_STORAGE_KEY = "website_builder_live_preview_draft";
const WEBSITE_BUILDER_REVIEW_STORAGE_KEY = "website_builder_preview_reviews";
const WEBSITE_BUILDER_LEAD_STORAGE_KEY = "website_builder_preview_leads";

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
const CONTENT_WRAP = "mx-auto w-full max-w-6xl";
const ABOUT_PARAGRAPH =
  "text-white text-[20px] leading-[1.4] font-normal font-['Poppins',ui-sans-serif,system-ui,sans-serif]";
const FOOTER_TEXT = "font-['Poppins',ui-sans-serif,system-ui,sans-serif] italic font-light";
const MOBILE_SECTION_HEADING =
  "text-center text-[24px] md:text-[32px] font-semibold uppercase tracking-normal text-[#000000] font-['Poppins',ui-sans-serif,system-ui,sans-serif]";

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
  const productsDropdownRef = useRef<HTMLDivElement | null>(null);

  const [selectedLeadProduct, setSelectedLeadProduct] = useState<any>(null);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
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
    role: "",
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
  }, [location.pathname]);

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

  const heroImage = heroImages[heroIndex] || heroImages[0] || "";
  const galleryItems = Array.isArray(draft?.gallery) ? draft.gallery : [];
  const homeGalleryItems = galleryItems.slice(0, 6);
  const testimonials = Array.isArray(draft?.testimonials) ? draft.testimonials : [];
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
  const activeTestimonial =
    testimonials[testimonialIndex] || testimonials[0] || { name: "", role: "", text: "" };

  const goToSection = (slug: string) => {
    const sectionId = resolveSectionFromSlug(slug);
    setProductsMenuOpen(false);
    setMobileMenuOpen(false);
    navigate(sectionId === "home" ? "/website-preview/page/home" : `/website-preview/page/${sectionId}`);
  };

  const goToProductPage = (slug: string) => {
    setProductsMenuOpen(false);
    setMobileMenuOpen(false);
    navigate(`/website-preview/page/products/${normalizeSlug(slug)}`);
  };

  const handleHeroNext = () => {
    if (heroImages.length <= 1) return;
    setHeroIndex((prev) => (prev + 1) % heroImages.length);
  };

  const handleHeroPrev = () => {
    if (heroImages.length <= 1) return;
    setHeroIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  const handleTestimonialNext = () => {
    if (testimonials.length <= 1) return;
    setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handleTestimonialPrev = () => {
    if (testimonials.length <= 1) return;
    setTestimonialIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const openLeadModal = (product: any) => {
    setSelectedLeadProduct(product);
    setLeadSubmitted(false);
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
    setReviewForm({
      reviewerName: "",
      role: "",
      rating: "5",
      review: "",
    });
    setReviewModalOpen(true);
  };

  const submitLeadForm = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const existing = JSON.parse(
        localStorage.getItem(WEBSITE_BUILDER_LEAD_STORAGE_KEY) || "[]",
      );
      const slug = normalizeSlug(selectedLeadProduct?.slug || selectedLeadProduct?.name || "");
      const nextLead = {
        _id: `preview-lead-${Date.now()}`,
        fullName: leadForm.fullName,
        mobileNumber: leadForm.mobile,
        email: leadForm.email,
        source: "Website Preview",
        status: "Pending",
        recievedDate: new Date().toISOString().slice(0, 10),
        companyName: draft?.companyName || "",
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
      };
      localStorage.setItem(
        WEBSITE_BUILDER_LEAD_STORAGE_KEY,
        JSON.stringify([nextLead, ...(Array.isArray(existing) ? existing : [])]),
      );
    } catch (error) {
      console.error("Failed to save preview lead", error);
    }
    setLeadSubmitted(true);
  };

  const submitReviewForm = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const existing = JSON.parse(
        localStorage.getItem(WEBSITE_BUILDER_REVIEW_STORAGE_KEY) || "[]",
      );
      const nextReview = {
        _id: `preview-${Date.now()}`,
        reviewerName: reviewForm.reviewerName,
        role: reviewForm.role,
        rating: Number(reviewForm.rating || 5),
        review: reviewForm.review,
        status: "pending",
        source: "Website Form",
        submittedAt: new Date().toISOString().slice(0, 10),
        companyName: draft?.companyName || "",
        searchKey: draft?.searchKey || "",
      };
      localStorage.setItem(
        WEBSITE_BUILDER_REVIEW_STORAGE_KEY,
        JSON.stringify([nextReview, ...(Array.isArray(existing) ? existing : [])]),
      );
    } catch (error) {
      console.error("Failed to save preview review", error);
    }
    setReviewSubmitted(true);
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
      <header className="sticky top-0 z-30 border-b border-slate-300 bg-[#f4f4f4] shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <div className="w-24 h-16 lg:w-36 overflow-hidden  flex justify-between items-center cursor-pointer">
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
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700 md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
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
                  <button
                    type="button"
                    onClick={() => setProductsMenuOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-1 whitespace-nowrap border-b-2 px-2 pb-1 text-[13px] font-medium transition hover:font-semibold md:text-[14px] ${
                      isActive || productsMenuOpen
                        ? "border-[#3b82f6] font-semibold text-[#111]"
                        : "border-transparent text-[#222] hover:border-[#3b82f6] hover:text-[#000]"
                    }`}
                  >
                    {item.name}
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
                  {productsMenuOpen && productPages.length > 0 ? (
                    <div className="absolute left-1/2 top-full z-40 mt-2 w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
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
                    <button
                      type="button"
                      onClick={() => setProductsMenuOpen((prev) => !prev)}
                      className={`flex w-full items-center justify-between px-1 py-3 text-left text-[15px] ${
                        isActive || productsMenuOpen ? "font-semibold text-[#111]" : "text-[#222]"
                      }`}
                    >
                      <span>{item.name}</span>
                      <svg
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        className={`h-4 w-4 text-slate-600 transition-transform ${productsMenuOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 7.5l5 5 5-5" />
                      </svg>
                    </button>
                    {productsMenuOpen && productPages.length > 0 ? (
                      <div className="flex flex-col gap-1 rounded-lg bg-white p-2 shadow-sm">
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
          <section id="home" className="relative h-[72vh] min-h-[500px] md:h-[84vh] md:min-h-[640px]">
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
              <div className="flex h-full flex-col items-center justify-end gap-3 px-5 py-16 text-center text-white md:gap-6 md:px-6 md:py-24">
                <h1 className="text-2xl font-bold leading-tight md:text-5xl">
                  {draft?.title || draft?.companyName || ""}
                </h1>
                <p className="mx-auto max-w-4xl text-sm md:text-[22px]">
                  {draft?.subTitle || ""}
                </p>
                <div>
                  <button
                    type="button"
                    className="pointer-events-auto rounded-full border-2 border-white bg-black/60 px-6 py-2 text-[11px] font-semibold uppercase tracking-wide text-white md:px-8 md:text-sm"
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

          <section id="about" className="bg-black px-4 py-14 text-white md:px-6 md:py-20">
            <div className={`${CONTENT_WRAP} text-center`}>
              <h2 className="text-[24px] font-semibold text-[#f7e53f] font-['Poppins',ui-sans-serif,system-ui,sans-serif] md:text-[32px]">
                About Our Vision
              </h2>
              <div className="mt-7 space-y-4 text-white">
                {aboutIntroBlocks.length ? (
                  aboutIntroBlocks.map((item: string, idx: number) => (
                    <p
                      key={`about-${idx}`}
                      className="font-['Poppins',ui-sans-serif,system-ui,sans-serif] text-[15px] leading-[1.55] md:text-[20px] md:leading-[1.4]"
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

          <section id="products" className="px-4 py-12 md:px-6 md:py-16">
            <div className={CONTENT_WRAP}>
              <h2 className={MOBILE_SECTION_HEADING}>Our Products</h2>
              <div className="mt-8 grid grid-cols-1 gap-5 md:mt-10 md:grid-cols-3 md:gap-7">
                {productPages.map((item: any, idx: number) => (
                  <article key={`product-${idx}`} className="flex flex-col items-center">
                    <h3 className="mb-3 text-lg font-medium md:text-xl">{item?.heading || item?.name || "Product"}</h3>
                    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-200">
                      {item?.cardImage ? (
                        <img
                          src={item.cardImage}
                          alt={item?.heading || item?.name}
                          className="h-[210px] w-full object-cover md:h-[220px]"
                        />
                      ) : (
                        <div className="h-[210px] w-full md:h-[220px]" />
                      )}
                      <div className="absolute inset-x-0 bottom-6 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleProductCardAction(item)}
                          className="rounded-full border-2 border-white px-8 py-2 text-sm font-semibold text-white"
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

          <section id="gallery" className="px-4 py-10 md:px-6 md:py-12">
            <div className={CONTENT_WRAP}>
              <h2 className={MOBILE_SECTION_HEADING}>{draft?.galleryTitle || "Gallery"}</h2>
              <div className="mt-8 grid grid-cols-1 gap-[8px] sm:grid-cols-2 md:mt-10 md:grid-cols-3">
                {homeGalleryItems.map((item: string, idx: number) => (
                  <div key={`gallery-${idx}`} className="overflow-hidden rounded-lg bg-slate-100">
                    <img src={item} alt={`Gallery ${idx + 1}`} className="h-[220px] w-full object-cover md:h-[256px]" />
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/website-preview/page/gallery")}
                  className="rounded-full bg-[#6f6f6f] px-10 py-2 text-sm font-semibold text-white"
                >
                  SHOW MORE
                </button>
              </div>
            </div>
          </section>

          <section id="testimonials" className="px-4 py-10 md:px-6 md:py-12">
            <div className={CONTENT_WRAP}>
              <h2 className={MOBILE_SECTION_HEADING}>{draft?.testimonialTitle || "Testimonials"}</h2>
              <div className="mt-6 flex items-center gap-2 md:mt-8 md:gap-4">
                <button type="button" onClick={handleTestimonialPrev} className="rounded-full bg-[#6f6f6f] px-3 py-2 text-xl text-white md:px-4 md:text-2xl">{"<"}</button>
                <div className="flex-1 rounded-2xl border border-slate-300 bg-transparent px-4 py-8 text-center md:px-6 md:py-12">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[#b07aff]">
                    {activeTestimonial?.image ? (
                      <img src={activeTestimonial.image} alt={activeTestimonial?.name || "Reviewer"} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-500">{activeTestimonial?.name || "Reviewer"}</span>
                    )}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-700 md:text-2xl">{activeTestimonial?.name || "Reviewer"}</h3>
                  <p className="text-sm text-slate-500 md:text-base">{activeTestimonial?.role || ""}</p>
                  <p className="mt-4 text-sm text-slate-600 md:text-base">"{activeTestimonial?.text || "Superb!!!"}"</p>
                </div>
                <button type="button" onClick={handleTestimonialNext} className="rounded-full bg-[#6f6f6f] px-3 py-2 text-xl text-white md:px-4 md:text-2xl">{">"}</button>
              </div>
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

          <section id="contact" className="px-4 py-10 md:px-6 md:py-12">
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
        </>
      ) : null}

      {currentSection === "about" ? (
        <section className="bg-black px-4 py-14 text-white md:px-6 md:py-24">
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
                  <article key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left md:p-6">
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
        <section className="px-4 py-12 md:px-6 md:py-16">
          <div className={CONTENT_WRAP}>
            {selectedProductPage ? (
              <>
                <section className="relative mb-8 h-[38vh] min-h-[240px] overflow-hidden rounded-xl bg-[#1f1f1f] md:mb-10 md:h-[44vh] md:min-h-[280px]">
                  {selectedProductHeroImage ? (
                    <img
                      src={selectedProductHeroImage}
                      alt={selectedProductPage?.name || "Product Hero"}
                      className="h-full w-full object-cover opacity-60"
                    />
                  ) : null}

                  <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-white">
                    <div>
                      <h1 className="text-2xl font-bold md:text-4xl">
                        {selectedProductPage?.heroHeading || selectedProductPage?.name || "Product"}
                      </h1>
                      {selectedProductPage?.heroSubHeading ? (
                        <p className="mt-3 text-sm md:text-lg">{selectedProductPage.heroSubHeading}</p>
                      ) : null}
                      {selectedProductPage?.heroButtonText ? (
                        <button type="button" className="mt-5 rounded-full border border-white px-5 py-2 text-xs font-semibold md:mt-6 md:px-6 md:text-sm">
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
                    <div className="mt-8 grid grid-cols-1 gap-[16px] sm:grid-cols-2 md:grid-cols-3">
                      {menuItems.map((item: any, idx: number) => (
                        <article key={`menu-${idx}`} className="flex flex-col items-center">
                          <h3 className="mb-3 text-lg font-medium md:text-xl">{item?.category || item?.name || `Item ${idx + 1}`}</h3>
                          <div className="relative w-full overflow-hidden rounded-2xl bg-slate-200">
                            {item?.image ? (
                              <img
                                src={item.image}
                                alt={item?.name || `Menu Item ${idx + 1}`}
                                className="h-[260px] w-full object-cover md:h-[300px]"
                              />
                            ) : (
                              <div className="h-[260px] w-full bg-slate-200 md:h-[300px]" />
                            )}
                            <div className="absolute inset-0 bg-black/35" />
                            <div className="absolute inset-x-0 bottom-0 p-5 text-left text-white">
                              <p className="text-[16px] font-semibold md:text-[18px]">{item?.name || `Item ${idx + 1}`}</p>
                              {item?.price ? <p className="mt-1 text-[14px] font-semibold md:text-[16px]">{item.price}</p> : null}
                              {item?.description ? (
                                <p className="mt-2 max-w-[90%] text-[13px] leading-6 text-white/95 md:text-[15px]">
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
                    <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-7">
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
                              <h3 className="mb-3 text-lg font-medium md:text-xl">{detailTitle}</h3>
                              <div className="relative w-full overflow-hidden rounded-2xl bg-slate-200">
                                {detailImage ? (
                                  <img
                                    src={detailImage}
                                    alt={detailTitle}
                                    className="h-[220px] w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-[220px] w-full" />
                                )}
                                <div className="absolute inset-0 bg-black/20" />
                              <div className="absolute inset-x-0 bottom-6 flex justify-center">
                                <button
                                  type="button"
                                    onClick={() => openLeadModal(detailTarget)}
                                    className="rounded-full border-2 border-white px-8 py-2 text-sm font-semibold text-white"
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
                <div className="mt-8 grid grid-cols-1 gap-5 md:mt-10 md:grid-cols-3 md:gap-7">
                  {productPages.map((item: any, idx: number) => (
                    <article key={`product-page-${idx}`} className="flex flex-col items-center">
                      <h3 className="mb-3 text-xl font-medium">{item?.heading || item?.name || "Product"}</h3>
                      <div className="relative w-full overflow-hidden rounded-2xl bg-slate-200">
                        {item?.cardImage ? (
                          <img src={item.cardImage} alt={item?.heading || item?.name} className="h-[220px] w-full object-cover" />
                        ) : (
                          <div className="h-[220px] w-full" />
                        )}
                        <div className="absolute inset-x-0 bottom-6 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleProductCardAction(item)}
                            className="rounded-full border-2 border-white px-8 py-2 text-sm font-semibold text-white"
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
        <section className="px-4 py-10 md:px-6 md:py-12">
          <div className={CONTENT_WRAP}>
            <h2 className={MOBILE_SECTION_HEADING}>{draft?.galleryTitle || "Gallery"}</h2>
              <div className="mt-8 grid grid-cols-1 gap-[8px] sm:grid-cols-2 md:mt-10 md:grid-cols-3">
              {galleryItems.map((item: string, idx: number) => (
                <div key={`gallery-page-${idx}`} className="overflow-hidden rounded-lg bg-slate-100">
                  <img src={item} alt={`Gallery ${idx + 1}`} className="h-[220px] w-full object-cover md:h-[256px]" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {currentSection === "testimonials" ? (
        <section className="px-4 py-10 md:px-6 md:py-12">
          <div className={CONTENT_WRAP}>
            <h2 className={MOBILE_SECTION_HEADING}>{draft?.testimonialTitle || "Testimonials"}</h2>
            <div className="mt-6 flex items-center gap-2 md:mt-8 md:gap-4">
              <button type="button" onClick={handleTestimonialPrev} className="rounded-full bg-[#6f6f6f] px-3 py-2 text-xl text-white md:px-4 md:text-2xl">{"<"}</button>
              <div className="flex-1 rounded-2xl border border-slate-300 bg-transparent px-4 py-8 text-center md:px-6 md:py-12">
                <h3 className="mt-5 text-xl font-semibold text-slate-700 md:text-2xl">{activeTestimonial?.name || "Reviewer"}</h3>
                <p className="text-sm text-slate-500 md:text-base">{activeTestimonial?.role || ""}</p>
                <p className="mt-4 text-sm text-slate-600 md:text-base">"{activeTestimonial?.text || "Superb!!!"}"</p>
              </div>
              <button type="button" onClick={handleTestimonialNext} className="rounded-full bg-[#6f6f6f] px-3 py-2 text-xl text-white md:px-4 md:text-2xl">{">"}</button>
            </div>
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
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-3 md:px-6">
          <div>
            {draft?.companyLogo ? (
              <img src={draft.companyLogo} alt={draft.companyName || "Company"} className="h-10 w-auto object-contain md:h-12" />
            ) : null}
            <p className="mt-2 text-[15px] font-semibold not-italic md:text-[18px]">{draft?.companyName || "Globex"}</p>
            <p className="mt-1 text-[12px] md:text-[13px]">{draft?.address || "Panjim-Goa"}</p>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold not-italic md:text-[15px]">Quick Links</h3>
            <div className="mt-2 space-y-1 text-[12px] md:text-[13px]">
              {navItems.map((item) => (
                <button key={`footer-${item.slug}`} type="button" onClick={() => goToSection(item.slug)} className="block">
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold not-italic md:text-[15px]">Contact Us</h3>
            <div className="mt-2 space-y-1 text-[12px] md:text-[13px]">
              {draft?.phone ? <p>{draft.phone}</p> : null}
              {draft?.email ? <p>{draft.email}</p> : null}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-300 px-4 py-2.5 text-center text-[11px] text-slate-600 md:text-[12px]">
          (c) Copyright 2025-26 {draft?.companyName || "Globex"} - All rights reserved. Powered By WoNo
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

            {reviewSubmitted ? (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                {draft?.testimonialsSuccessMessage || "Thank you. Your review has been submitted for approval."}
              </div>
            ) : (
              <form onSubmit={submitReviewForm} className="mt-6 grid grid-cols-1 gap-4">
                <input
                  type="text"
                  className="border-b border-slate-300 px-0 py-2 text-sm outline-none placeholder:text-slate-500 md:text-base"
                  placeholder="Full Name"
                  value={reviewForm.reviewerName}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, reviewerName: e.target.value }))}
                  required
                />
                <input
                  type="text"
                  className="border-b border-slate-300 px-0 py-2 text-sm outline-none placeholder:text-slate-500 md:text-base"
                  placeholder="Designation / Role"
                  value={reviewForm.role}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, role: e.target.value }))}
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
                <div className="pt-2 text-center">
                  <button
                    type="submit"
                    className="rounded-full bg-[#6f6f6f] px-8 py-2 text-sm font-semibold text-white"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {selectedLeadProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-6xl rounded-[24px] bg-white p-4 shadow-xl md:p-5">
            <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[1.05fr_0.95fr]">
              <div className="self-start overflow-hidden rounded-[22px] bg-slate-100">
                {selectedLeadProduct?.cardImage ? (
                  <img
                    src={selectedLeadProduct.cardImage}
                    alt={selectedLeadProduct?.name || "Product"}
                    className="h-[260px] w-full object-cover md:h-[560px]"
                  />
                ) : (
                  <div className="h-[260px] w-full md:h-[560px]" />
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={closeLeadModal}
                  className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-2xl text-slate-700 shadow-sm"
                  aria-label="Close lead form"
                >
                  ×
                </button>
                <div className="pr-12">
                  <h3 className="text-[24px] font-bold uppercase text-slate-900 md:text-[22px]">
                    {selectedLeadProduct?.name || "Product"}
                  </h3>
                  {(() => {
                    const subText = String(selectedLeadProduct?.subText || "").trim();
                    const desc = String(
                      getLeadMetaForProduct(selectedLeadProduct)?.description || "",
                    ).trim();
                    if (!subText || subText === desc) return null;
                    return <p className="mt-1 text-base text-slate-700">{subText}</p>;
                  })()}
                  <p className="mt-5 text-[18px] font-semibold text-slate-900">
                    {getLeadMetaForProduct(selectedLeadProduct).priceLine}
                  </p>
                  <p className="mt-5 border-b border-slate-200 pb-7 text-[15px] leading-8 text-slate-700 md:text-[17px]">
                    {getLeadMetaForProduct(selectedLeadProduct).description}
                  </p>
                  <h4 className="mt-6 text-[18px] font-semibold text-slate-900 md:text-[20px]">
                    {getLeadMetaForProduct(selectedLeadProduct).label}
                  </h4>
                </div>

                {leadSubmitted ? (
                  <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                    Lead submitted successfully.
                  </div>
                ) : (
                  <form onSubmit={submitLeadForm} className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                    {getLeadFieldsForProduct(selectedLeadProduct?.slug || "").map((field) => (
                      <input
                        key={field.key}
                        type={field.type}
                        className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-500 focus:border-slate-500 md:text-base"
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
                    <div className="mt-2 md:col-span-2 md:text-center">
                      <button
                        type="submit"
                        className="rounded-full bg-[#6f6f6f] px-9 py-2 text-sm font-semibold text-white"
                      >
                        GET QUOTE
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PageDemo;
