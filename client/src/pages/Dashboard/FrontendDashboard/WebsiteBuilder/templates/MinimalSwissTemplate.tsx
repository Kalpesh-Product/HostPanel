import React, { useState, useEffect } from "react";
import { useWebsiteTemplateData } from "./useWebsiteTemplateData";
import TemplateServicesDropdown from "./TemplateServicesDropdown";
import { isProductsNavItem } from "./templateNavigation";

// "Minimal Swiss" — dark, token-driven reskin (per shared DESIGN.md/SKILL.md):
// black surface, white primary text, a light-lavender secondary text color,
// and a single indigo-blue accent, on Inter throughout. Structure is
// unchanged from the original Swiss layout — hairline dividers instead of
// cards/shadows, strict grid, understated nav — only the token values
// (color, font, radius, motion) were swapped in.
const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');";
const ACCENT = "#3d38f5";
const TEXT_SECONDARY = "#b9b8ff";
const HEADING_FONT = "font-['Inter',ui-sans-serif,system-ui,sans-serif]";
const FONT = "font-['Inter',ui-sans-serif,system-ui,sans-serif]";

const HAIRLINE = "border-t border-white/15";
const WRAP = "mx-auto w-full max-w-6xl px-5 md:px-8";
const EYEBROW = `text-[14px] font-semibold uppercase tracking-[0.16em] text-[#b9b8ff]/85 ${FONT}`;
const HEADING = `text-[28px] md:text-[40px] font-medium leading-[1.05] tracking-[-0.01em] text-white ${HEADING_FONT}`;
const PAGE_WRAP = `${WRAP} py-14 md:py-20`;
const INPUT =
  "w-full rounded-[5px] border border-white/20 px-3 py-2.5 text-[14px] outline-none transition duration-100 focus:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 bg-black";
const focusStyle = { outlineColor: ACCENT } as React.CSSProperties;

const MailIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
  >
    <rect x="3" y="5" width="18" height="14" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);
const PhoneIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4.07 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.64 2.6a2 2 0 0 1-.45 2.11L8 9.69a16 16 0 0 0 6.31 6.31l1.26-1.26a2 2 0 0 1 2.11-.45c.83.31 1.7.52 2.6.64A2 2 0 0 1 22 16.92Z" />
  </svg>
);
const PinIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
  >
    <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
    <circle cx="12" cy="11" r="2" />
  </svg>
);

const SOCIAL_LABEL: Record<string, string> = {
  instagram: "IG",
  facebook: "FB",
  twitter: "X",
  linkedin: "IN",
  whatsapp: "WA",
};
const SOCIAL_ICON: Record<string, React.ReactNode> = {
  instagram: (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebook: (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
    </svg>
  ),
  linkedin: (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V8h4v1.5A6 6 0 0 1 16 8z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  ),
};

const ProductGrid = ({
  products,
  onSelect,
}: {
  products: any[];
  onSelect: (p: any) => void;
}) => (
  <div className="mt-8 grid grid-cols-1 border-l border-t border-white/15 sm:grid-cols-2 lg:grid-cols-3">
    {products.map((product: any, idx: number) => (
      <button
        key={idx}
        type="button"
        onClick={() => onSelect(product)}
        className="group flex flex-col border-b border-r border-white/15 text-left transition hover:bg-white/[0.03]"
      >
        <div className="aspect-[4/3] w-full overflow-hidden rounded-[5px] bg-white/5">
          {product?.cardImage ? (
            <img
              src={product.cardImage}
              alt={product?.name || ""}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-1 px-5 py-5">
          <span className="text-[15px] font-medium">
            {product?.name || product?.heading || "Service"}
          </span>
          {product?.subText ? (
            <span className="line-clamp-2 text-[13px] leading-relaxed text-[#b9b8ff]/55">
              {product.subText}
            </span>
          ) : null}
          <span
            className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em]"
            style={{ color: ACCENT }}
          >
            View details →
          </span>
        </div>
      </button>
    ))}
  </div>
);

const LogoCarousel = ({
  logos,
  title,
}: {
  logos: string[];
  title?: string;
}) => {
  const [offset, setOffset] = useState(0);
  const [visible, setVisible] = useState(
    typeof window !== "undefined" && window.innerWidth < 768 ? 2 : 4,
  );
  const total = logos.length;

  useEffect(() => {
    const onResize = () => setVisible(window.innerWidth < 768 ? 2 : 4);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (total <= visible) return;
    const timer = window.setInterval(
      () => setOffset((prev) => (prev + 1) % total),
      2500,
    );
    return () => window.clearInterval(timer);
  }, [total, visible]);

  if (!total) return null;
  const displayed = Array.from(
    { length: visible },
    (_, i) => logos[(offset + i) % total],
  );

  return (
    <section className={HAIRLINE}>
      <div className={PAGE_WRAP}>
        <span className={EYEBROW}>{title || "Trusted by"}</span>
        <div className="mt-8 overflow-hidden">
          <div className="flex items-center justify-center gap-8 md:gap-16">
            {displayed.map((src, idx) => (
              <div
                key={`logo-${offset}-${idx}`}
                className="flex h-[50px] w-[120px] shrink-0 items-center justify-center grayscale md:h-[70px] md:w-[180px]"
              >
                <img
                  src={src}
                  alt={`Partner logo ${idx + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const FaqList = ({
  faqs,
}: {
  faqs: Array<{ question: string; answer: string }>;
}) => {
  const [open, setOpen] = useState<number | null>(null);
  if (!faqs.length) return null;
  return (
    <section className={HAIRLINE}>
      <div className={PAGE_WRAP}>
        <span className={EYEBROW}>FAQs</span>
        <div className="mt-6 flex flex-col">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border-b border-white/10">
              <button
                type="button"
                onClick={() => setOpen(open === idx ? null : idx)}
                className="flex w-full items-center justify-between py-4 text-left"
              >
                <span className="text-[14px] font-medium">{faq.question}</span>
                <span className="text-[#b9b8ff]/40">
                  {open === idx ? "−" : "+"}
                </span>
              </button>
              {open === idx ? (
                <p className="pb-4 text-[13.5px] leading-relaxed text-[#b9b8ff]/60">
                  {faq.answer}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Inclusions = ({
  inclusions,
  title,
}: {
  inclusions: Array<{ key: string; label?: string; enabled: boolean }>;
  title: string;
}) => {
  const enabled = inclusions.filter((i) => i.enabled);
  if (!enabled.length) return null;
  return (
    <section className={HAIRLINE}>
      <div className={PAGE_WRAP}>
        <span className={EYEBROW}>{title}</span>
        <div className="mt-6 flex flex-wrap gap-2">
          {enabled.map((item, idx) => (
            <span
              key={idx}
              className="border border-white/15 px-3 py-1.5 text-[12px] uppercase tracking-[0.05em] text-[#b9b8ff]/70"
            >
              {item.label || item.key}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

const MinimalSwissTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;

  if (!draft) {
    return (
      <div className={`min-h-screen bg-black p-6 ${FONT}`}>
        <h2 className="text-lg font-medium text-white">Preview</h2>
        <p className="mt-2 text-sm text-[#b9b8ff]/60">
          No preview data found. Go back to Create Website and click Preview.
        </p>
      </div>
    );
  }

  const section = t.currentSection;
  const isHome = section === "home";

  const galleryViewer = t.galleryViewerOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
      onClick={t.closeGalleryViewer}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          t.goToGalleryIndex(t.galleryViewerIndex - 1);
        }}
        className="absolute left-6 text-2xl text-white/70 hover:text-white"
      >
        ←
      </button>
      <img
        src={t.galleryItems[t.galleryViewerIndex]}
        alt=""
        className="max-h-[85vh] max-w-[85vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          t.goToGalleryIndex(t.galleryViewerIndex + 1);
        }}
        className="absolute right-6 text-2xl text-white/70 hover:text-white"
      >
        →
      </button>
      <button
        type="button"
        onClick={t.closeGalleryViewer}
        className="absolute right-6 top-6 text-sm uppercase tracking-widest text-white/70 hover:text-white"
      >
        Close ✕
      </button>
    </div>
  ) : null;

  const leadFormFields = t.selectedLeadProduct
    ? t.getLeadFieldsForProduct(
        t.selectedLeadProduct?.slug || t.selectedLeadProduct?.name || "",
      )
    : [];

  return (
    <div className={`ms-template min-h-screen bg-black text-white ${FONT}`}>
      <style>{`
        ${FONT_IMPORT}
        .ms-template button, .ms-template a[href] { cursor: pointer; }
        .ms-template button:focus-visible, .ms-template a:focus-visible, .ms-template input:focus-visible, .ms-template select:focus-visible, .ms-template textarea:focus-visible {
          outline: 2px solid ${ACCENT};
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .ms-template * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
        }
      `}</style>
      {/* Header */}
      <header
        ref={t.headerRef}
        className="sticky top-0 z-30 border-b border-white/15 bg-black/95 backdrop-blur"
      >
        <div className={`${WRAP} flex items-center justify-between gap-6 py-5`}>
          <button
            type="button"
            onClick={() => t.goToSection("home")}
            className="flex h-12 w-auto max-w-[180px] items-center justify-start overflow-hidden md:h-14"
            aria-label="Go to home"
          >
            {draft?.companyLogo ? (
              <img
                src={draft.companyLogo}
                alt={draft.companyName || "Logo"}
                className="h-full w-auto object-left object-contain"
              />
            ) : (
              <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-white">
                {draft?.companyName || ""}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => t.setMobileMenuOpen((p: boolean) => !p)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-white/20 md:hidden"
            aria-label="Toggle navigation"
          >
            <span className="flex flex-col gap-1">
              <span className="block h-px w-4 bg-white" />
              <span className="block h-px w-4 bg-white" />
            </span>
          </button>

          <nav className="hidden items-center gap-8 md:flex">
            {t.navItems.map((item: any) =>
              isProductsNavItem(item) && t.productsPageEnabled ? (
                <TemplateServicesDropdown
                  key={item.slug}
                  item={item}
                  productPages={t.productPages}
                  currentSection={t.currentSection}
                  currentProductSlug={t.currentProductSlug}
                  goToSection={t.goToSection}
                  goToProductPage={t.goToProductPage}
                  variant="minimal"
                />
              ) : (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => t.goToSection(item.slug)}
                  className="text-[12px] font-medium uppercase tracking-[0.2em] transition duration-100"
                  style={
                    t.currentSection === item.slug ||
                    (isHome && item.slug === "home")
                      ? { color: ACCENT }
                      : { color: "rgba(185,184,255,0.55)" }
                  }
                >
                  {item.name}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="border px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] transition"
              style={{ borderColor: ACCENT, color: ACCENT }}
            >
              Login
            </button>
          </nav>
        </div>

        {t.mobileMenuOpen ? (
          <div className="border-t border-white/15 px-5 py-3 md:hidden">
            <div className="flex flex-col">
              {t.navItems.map((item: any) =>
                isProductsNavItem(item) && t.productsPageEnabled ? (
                  <TemplateServicesDropdown
                    key={`m-${item.slug}`}
                    item={item}
                    productPages={t.productPages}
                    currentSection={t.currentSection}
                    currentProductSlug={t.currentProductSlug}
                    goToSection={t.goToSection}
                    goToProductPage={t.goToProductPage}
                    variant="minimal"
                    mobile
                  />
                ) : (
                  <button
                    key={`m-${item.slug}`}
                    type="button"
                    onClick={() => t.goToSection(item.slug)}
                    className="border-b border-white/10 py-3 text-left text-[13px] font-medium uppercase tracking-[0.15em]"
                  >
                    {item.name}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => window.location.assign("/")}
                className="border-b border-white/10 py-3 text-left text-[13px] font-medium uppercase tracking-[0.15em]"
                style={{ color: ACCENT }}
              >
                Login
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {isHome ? (
        <>
          {/* Hero */}
          {t.isSectionEnabled("home_hero") ? (
            <section
              className={`${WRAP} grid gap-8 py-16 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:py-28`}
            >
              <div className="flex flex-col justify-center gap-6">
                <span className={EYEBROW}>
                  {draft?.vertical
                    ? String(draft.vertical).replace(/-/g, " ")
                    : "Welcome"}
                </span>
                <h1 className={`${HEADING} text-[36px] md:text-[64px]`}>
                  {draft?.title || draft?.companyName || ""}
                </h1>
                <p className="max-w-md text-[15px] leading-relaxed text-[#b9b8ff]/60 md:text-[17px]">
                  {draft?.subTitle || ""}
                </p>
                <div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-3 rounded-[5px] border border-white/40 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.25em] text-white transition duration-100 hover:bg-white hover:text-black"
                  >
                    {String(draft?.ctaText || "Get in touch").toUpperCase()}
                  </button>
                </div>
              </div>
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[5px] bg-white/5">
                {t.resolvedHomeHeroImage ? (
                  <img
                    src={t.resolvedHomeHeroImage}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
                {t.showHeroCarousel ? (
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/80 px-4 py-2 backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={t.handleHeroPrev}
                      className="text-[11px] font-medium uppercase tracking-widest text-white"
                    >
                      ← Prev
                    </button>
                    <span className="text-[11px] text-[#b9b8ff]/70">
                      {t.heroIndex + 1} / {t.heroImages.length}
                    </span>
                    <button
                      type="button"
                      onClick={t.handleHeroNext}
                      className="text-[11px] font-medium uppercase tracking-widest text-white"
                    >
                      Next →
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {t.aboutPageEnabled &&
          t.isSectionEnabled("home_about") &&
          t.aboutIntroBlocks.length ? (
            <section className={HAIRLINE}>
              <div
                className={`${WRAP} grid gap-8 py-14 md:grid-cols-[0.4fr_0.6fr] md:gap-16 md:py-20`}
              >
                <span className={EYEBROW}>About</span>
                <div className="flex flex-col gap-4">
                  {t.aboutIntroBlocks.map((text: string, idx: number) => (
                    <p
                      key={idx}
                      className="max-w-2xl text-[15px] leading-relaxed text-[#b9b8ff]/70 md:text-[17px]"
                    >
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {t.productsPageEnabled &&
          t.isSectionEnabled("home_products") &&
          t.productPages.length ? (
            <section className={HAIRLINE}>
              <div className={PAGE_WRAP}>
                <span className={EYEBROW}>What we offer</span>
                <ProductGrid
                  products={t.productPages}
                  onSelect={t.handleProductCardAction}
                />
              </div>
            </section>
          ) : null}

          {Array.isArray(draft?.inclusions) &&
          draft.inclusions.length > 0 &&
          t.isSectionEnabled("home_inclusions") ? (
            <Inclusions inclusions={draft.inclusions} title="Inclusions" />
          ) : null}

          {t.galleryPageEnabled && t.isSectionEnabled("home_gallery") ? (
            <section className={HAIRLINE}>
              <div className={PAGE_WRAP}>
                <div className="flex items-center justify-between">
                  <span className={EYEBROW}>Gallery</span>
                  {t.galleryItems.length > 6 ? (
                    <button
                      type="button"
                      onClick={() => t.goToSection("gallery")}
                      className="text-[11px] font-medium uppercase tracking-[0.2em] underline underline-offset-4"
                    >
                      Show more →
                    </button>
                  ) : null}
                </div>
                <div className="mt-8 grid grid-cols-2 gap-1 md:grid-cols-3">
                  {t.homeGalleryItems.map((src: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => t.openGalleryViewer(idx)}
                      className="aspect-square overflow-hidden rounded-[5px] bg-white/5"
                    >
                      <img
                        src={src}
                        alt={`Gallery ${idx + 1}`}
                        className="h-full w-full object-cover transition duration-300 hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {t.isSectionEnabled("home_testimonials") && t.testimonials.length ? (
            <section className={HAIRLINE}>
              <div className={PAGE_WRAP}>
                <div className="flex items-center justify-between">
                  <span className={EYEBROW}>What people say</span>
                  {t.showWriteReview ? (
                    <button
                      type="button"
                      onClick={t.openReviewModal}
                      className="text-[11px] font-medium uppercase tracking-[0.2em] underline underline-offset-4"
                    >
                      Write a review
                    </button>
                  ) : null}
                </div>
                <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
                  {t.visibleTestimonials.map((item: any) => (
                    <div
                      key={item.key}
                      className="flex flex-col gap-3 border-l-2 pl-5"
                      style={{ borderColor: ACCENT }}
                    >
                      <p className="text-[14px] leading-relaxed text-[#b9b8ff]/70">
                        "{item.text}"
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium">
                          {item.name}
                        </span>
                        {item.rating ? (
                          <span className="text-[11px] text-[#b9b8ff]/40">
                            {"★".repeat(item.rating)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {t.contactPageEnabled && t.isSectionEnabled("home_contact") ? (
            <section className={HAIRLINE}>
              <div className={PAGE_WRAP}>
                <span className={EYEBROW}>Contact</span>
                <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[0.62fr_0.38fr]">
                  {draft?.mapUrl ? (
                    <iframe
                      title="map"
                      src={draft.mapUrl}
                      className="h-[320px] w-full rounded-[5px] border-0 md:h-[420px]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-[320px] w-full rounded-[5px] bg-white/5 md:h-[420px]" />
                  )}
                  <div className="flex flex-col justify-center gap-4 text-[15px]">
                    {draft?.companyLogo ? (
                      <img
                        src={draft.companyLogo}
                        alt={draft.companyName || "Company"}
                        className="mb-1 h-11 w-auto object-contain"
                      />
                    ) : null}
                    {t.contactEmail ? (
                      <a
                        href={`mailto:${t.contactEmail}`}
                        className="flex items-center gap-3 hover:opacity-70"
                      >
                        <MailIcon />
                        {t.contactEmail}
                      </a>
                    ) : null}
                    {t.contactPhone ? (
                      <a
                        href={`tel:${t.contactPhone.replace(/[^\d+]/g, "")}`}
                        className="flex items-center gap-3 hover:opacity-70"
                      >
                        <PhoneIcon />
                        {t.contactPhone}
                      </a>
                    ) : null}
                    {t.contactAddress ? (
                      <div className="flex items-start gap-3">
                        <span className="pt-0.5">
                          <PinIcon />
                        </span>
                        <span>{t.contactAddress}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {draft?.logoCarousel?.enabled &&
          Array.isArray(draft.logoCarousel.logos) &&
          draft.logoCarousel.logos.length > 0 ? (
            <LogoCarousel
              logos={draft.logoCarousel.logos
                .map((item: any) =>
                  typeof item === "string"
                    ? item
                    : item?.url || item?.preview || "",
                )
                .filter(Boolean)}
              title={draft?.logoCarousel?.title || undefined}
            />
          ) : null}
        </>
      ) : null}

      {/* About page */}
      {section === "about" && t.aboutPageEnabled ? (
        <section className={PAGE_WRAP}>
          <span className={`${EYEBROW} block text-center`}>About</span>
          <h2 className={`${HEADING} mt-3 text-center`}>
            {draft?.aboutTitle || "About us"}
          </h2>
          <div className="mt-6 flex max-w-2xl flex-col gap-4">
            {t.aboutIntroBlocks.map((text: string, idx: number) => (
              <p
                key={idx}
                className="text-[15px] leading-relaxed text-[#b9b8ff]/70"
              >
                {text}
              </p>
            ))}
          </div>
          {t.aboutNarrativeBlocks.length ? (
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
              {t.aboutNarrativeBlocks.map((item: any) => (
                <div key={item.title}>
                  <h3
                    className="text-[13px] font-medium uppercase tracking-[0.15em]"
                    style={{ color: ACCENT }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#b9b8ff]/65">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {t.founders.length ? (
            <div className="mt-16 flex flex-col gap-12">
              <span className={`${EYEBROW} block text-center`}>Founders</span>
              {t.founders.map((founder: any, idx: number) => (
                <div
                  key={idx}
                  className="grid gap-6 md:grid-cols-[0.35fr_0.65fr]"
                >
                  {founder?.image ? (
                    <img
                      src={
                        typeof founder.image === "string"
                          ? founder.image
                          : founder.image?.url
                      }
                      alt={founder?.name}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-square w-full bg-white/5" />
                  )}
                  <div>
                    <h4 className="text-[18px] font-medium">{founder?.name}</h4>
                    <p className="text-[13px] text-[#b9b8ff]/50">
                      {founder?.role}
                    </p>
                    <p className="mt-3 text-[14px] leading-relaxed text-[#b9b8ff]/65">
                      {founder?.bio}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {t.aboutPageImageCards.length ? (
            <div className="mt-16">
              <span className={`${EYEBROW} block text-center`}>
                {draft?.aboutPageTeamHeading || "Our team"}
              </span>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                {t.aboutPageImageCards.map((card: any, idx: number) => (
                  <div key={idx}>
                    {card?.image ? (
                      <img
                        src={card.image}
                        alt={card?.title}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-[4/3] w-full bg-white/5" />
                    )}
                    {card?.title ? (
                      <h5 className="mt-3 text-[14px] font-medium">
                        {card.title}
                      </h5>
                    ) : null}
                    {card?.description ? (
                      <p className="mt-1 text-[13px] text-[#b9b8ff]/60">
                        {card.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Products page */}
      {section === "products" && t.productsPageEnabled ? (
        <>
          {t.selectedDetailItem && t.selectedProductPage ? (
            (() => {
              const item: any = t.selectedDetailItem;
              const page: any = t.selectedProductPage;
              const title = String(
                item?.title || item?.name || item?.heading || "Service",
              ).trim();
              const description = String(
                item?.description || item?.subText || page?.subText || "",
              ).trim();
              const image =
                item?.images?.[0]?.url ||
                item?.images?.[0] ||
                item?.cardImage ||
                page?.cardImage ||
                "";
              const price = String(item?.price || item?.cost || "").trim();
              return (
                <section className={PAGE_WRAP}>
                  <div className="grid gap-10 md:grid-cols-2">
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-[5px] bg-white/5">
                      {image ? (
                        <img
                          src={typeof image === "string" ? image : image?.url}
                          alt={title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <h1
                        className={`${HEADING} text-[26px] md:text-[34px] text-center`}
                      >
                        {title}
                      </h1>
                      {price ? (
                        <p className="mt-1 text-[14px] text-[#b9b8ff]/50">
                          {price}
                        </p>
                      ) : null}
                      {description ? (
                        <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-[#b9b8ff]/65">
                          {description}
                        </p>
                      ) : null}

                      <div className="mt-8 max-w-md">
                        {t.leadSubmitted ? (
                          <div className="border border-white/15 p-6 text-center">
                            <p className="text-[14px] font-medium">
                              Enquiry submitted successfully.
                            </p>
                            <p className="mt-1 text-[13px] text-[#b9b8ff]/55">
                              We'll get back to you shortly.
                            </p>
                          </div>
                        ) : (
                          <form
                            onSubmit={t.submitLeadForm}
                            className="flex flex-col gap-3"
                          >
                            <span className={`${EYEBROW} block text-center`}>
                              Enquire now
                            </span>
                            {leadFormFields.map((field: any) => (
                              <input
                                key={field.key}
                                type={
                                  field.type === "date" ? "date" : field.type
                                }
                                required={field.required}
                                placeholder={field.label}
                                value={(t.leadForm as any)[field.key] ?? ""}
                                onChange={(e) =>
                                  t.setLeadForm((prev: any) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                className={INPUT}
                              />
                            ))}
                            {t.leadSubmitError ? (
                              <p className="text-[12px] text-[#f87171]">
                                {t.leadSubmitError}
                              </p>
                            ) : null}
                            <button
                              type="submit"
                              disabled={t.leadSubmitPending}
                              className="mt-1 rounded-[5px] bg-[#3d38f5] py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition duration-100 hover:opacity-85 disabled:opacity-50"
                            >
                              {t.leadSubmitPending
                                ? "Submitting…"
                                : "Submit enquiry"}
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })()
          ) : t.selectedProductPage ? (
            <>
              <section className={`${WRAP} py-14 md:py-20`}>
                <span className={`${EYEBROW} block text-center`}>
                  {t.selectedProductPage?.name}
                </span>
                <h1 className={`${HEADING} mt-3 text-center`}>
                  {(t.selectedProductPage as any)?.heroHeading ||
                    (t.selectedProductPage as any)?.name}
                </h1>
                {(t.selectedProductPage as any)?.heroSubHeading ? (
                  <p className="mx-auto mt-3 max-w-xl text-center text-[14.5px] text-[#b9b8ff]/60">
                    {(t.selectedProductPage as any).heroSubHeading}
                  </p>
                ) : null}
              </section>
              <section className={HAIRLINE}>
                <div className={PAGE_WRAP}>
                  {t.isMenuProductSlug(t.selectedProductPage?.slug || "") ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                      {t.menuItems.map((item: any, idx: number) => (
                        <div key={idx}>
                          {item?.image ? (
                            <img
                              src={item.image}
                              alt={item?.name}
                              className="aspect-[4/3] w-full object-cover"
                            />
                          ) : (
                            <div className="aspect-[4/3] w-full bg-white/5" />
                          )}
                          <div className="mt-3 flex items-center justify-between">
                            <h4 className="text-[14px] font-medium">
                              {item?.name}
                            </h4>
                            {item?.price ? (
                              <span className="text-[13px] text-[#b9b8ff]/50">
                                {item.price}
                              </span>
                            ) : null}
                          </div>
                          {item?.description ? (
                            <p className="mt-1 text-[12.5px] text-[#b9b8ff]/55">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ProductGrid
                      products={
                        t.selectedProductContentItems.length
                          ? t.selectedProductContentItems
                          : [t.selectedProductPage]
                      }
                      onSelect={(item: any) =>
                        t.goToProductItem(
                          t.selectedProductPage?.slug ||
                            t.selectedProductPage?.name ||
                            "",
                          item?.title || item?.name || item?.heading || "",
                        )
                      }
                    />
                  )}
                </div>
              </section>
              {Array.isArray((t.selectedProductPage as any)?.inclusions) &&
              (t.selectedProductPage as any)?.inclusionsEnabled !== false ? (
                <Inclusions
                  inclusions={(t.selectedProductPage as any).inclusions}
                  title="Inclusions"
                />
              ) : null}
              {(t.selectedProductPage as any)?.faqEnabled !== false ? (
                <FaqList faqs={Array.isArray(draft?.faqs) ? draft.faqs : []} />
              ) : null}
            </>
          ) : (
            <section className={PAGE_WRAP}>
              <span className={`${EYEBROW} block text-center`}>
                What we offer
              </span>
              <h2 className={`${HEADING} mt-3 text-center`}>Our services</h2>
              <ProductGrid
                products={t.productPages}
                onSelect={t.handleProductCardAction}
              />
            </section>
          )}
        </>
      ) : null}

      {/* Gallery page */}
      {section === "gallery" && t.galleryPageEnabled ? (
        <section className={PAGE_WRAP}>
          <span className={`${EYEBROW} block text-center`}>Gallery</span>
          <h2 className={`${HEADING} text-[30px] text-center mt-3`}>Gallery</h2>
          <div className="mt-8 grid grid-cols-2 gap-1 md:grid-cols-3">
            {t.galleryItems.map((src: string, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => t.openGalleryViewer(idx)}
                className="aspect-square overflow-hidden rounded-[5px] bg-white/5"
              >
                <img
                  src={src}
                  alt={`Gallery ${idx + 1}`}
                  className="h-full w-full object-cover transition duration-300 hover:scale-105"
                />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Testimonials page */}
      {section === "testimonials" ? (
        <section className={PAGE_WRAP}>
          <div className="flex flex-col items-center gap-4 text-center">
            <span className={`${EYEBROW} block text-center`}>
              What people say
            </span>
            <h2 className={`${HEADING} text-[30px] text-center mt-3`}>
              Testimonials
            </h2>
            {t.showWriteReview ? (
              <button
                type="button"
                onClick={t.openReviewModal}
                className="text-[11px] font-medium uppercase tracking-[0.2em] underline underline-offset-4"
              >
                Write a review
              </button>
            ) : null}
          </div>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            {t.visibleTestimonials.map((item: any) => (
              <div
                key={item.key}
                className="flex flex-col gap-3 border-l-2 pl-5"
                style={{ borderColor: ACCENT }}
              >
                <p className="text-[14px] leading-relaxed text-[#b9b8ff]/70">
                  "{item.text}"
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">{item.name}</span>
                  {item.rating ? (
                    <span className="text-[11px] text-[#b9b8ff]/40">
                      {"★".repeat(item.rating)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {t.testimonialPages > 1 ? (
            <div className="mt-8 flex gap-2">
              {Array.from({ length: t.testimonialPages }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => t.setTestimonialIndex(idx)}
                  className={`h-1.5 ${t.testimonialIndex === idx ? "w-8" : "w-1.5"} transition-all`}
                  style={{
                    backgroundColor:
                      t.testimonialIndex === idx ? ACCENT : "rgba(0,0,0,0.2)",
                  }}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Partner page */}
      {section === "partner" && t.partnerPageEnabled ? (
        <section className={PAGE_WRAP}>
          <span className={`${EYEBROW} block text-center`}>Partner</span>
          <h2 className={`${HEADING} mt-3 text-center`}>
            {t.partnerPageHeading || "Become a partner"}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-2">
            <div className="text-[14.5px] leading-relaxed text-[#b9b8ff]/65">
              {t.partnerPageContent ? (
                t.partnerPageContent.split("\n").map((p: string, i: number) => (
                  <p key={i} className="mb-4 last:mb-0">
                    {p}
                  </p>
                ))
              ) : (
                <p className="text-[#b9b8ff]/40">
                  Partner content coming soon.
                </p>
              )}
            </div>
            <div>
              <h3
                className="text-[13px] font-medium uppercase tracking-[0.15em]"
                style={{ color: ACCENT }}
              >
                {t.partnerFormTitle ||
                  `Partner with ${draft?.companyName || "us"}`}
              </h3>
              <div className="mt-4 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={t.partnerForm.name}
                  onChange={(e) =>
                    t.setPartnerForm((p: any) => ({
                      ...p,
                      name: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
                <input
                  type="email"
                  placeholder="Your email"
                  value={t.partnerForm.email}
                  onChange={(e) =>
                    t.setPartnerForm((p: any) => ({
                      ...p,
                      email: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
                <input
                  type="tel"
                  placeholder="Mobile number"
                  value={t.partnerForm.mobile}
                  onChange={(e) =>
                    t.setPartnerForm((p: any) => ({
                      ...p,
                      mobile: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
                <textarea
                  rows={4}
                  placeholder="Your message"
                  value={t.partnerForm.message}
                  onChange={(e) =>
                    t.setPartnerForm((p: any) => ({
                      ...p,
                      message: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
                <button
                  type="button"
                  disabled={t.partnerSubmitPending}
                  className="rounded-[5px] bg-[#3d38f5] py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition duration-100 hover:opacity-85 disabled:opacity-50"
                >
                  {t.partnerSubmitPending ? "Submitting…" : "Connect"}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Careers page */}
      {section === "careers" && t.careersPageEnabled ? (
        <section className={PAGE_WRAP}>
          {!t.careersApplyJob ? (
            <>
              <span className={`${EYEBROW} block text-center`}>Careers</span>
              <h2 className={`${HEADING} mt-3 text-center`}>
                {draft?.companyName
                  ? `Join ${draft.companyName}`
                  : "Join our team"}
              </h2>
              <div className="mx-auto mt-6 max-w-2xl text-center text-[14.5px] leading-relaxed text-[#b9b8ff]/65">
                {(draft?.careersPageIntro
                  ? draft.careersPageIntro.split("\n")
                  : t.careersFallbackIntro
                ).map((p: string, i: number) => (
                  <p key={i} className="mb-3 last:mb-0">
                    {p}
                  </p>
                ))}
              </div>

              {t.careersJobsLoading ? (
                <p className="mt-8 text-[13px] text-[#b9b8ff]/50">
                  Loading open roles…
                </p>
              ) : t.careersJobs.length === 0 ? (
                <p className="mt-8 text-[13px] text-[#b9b8ff]/50">
                  No job openings at the moment — check back later.
                </p>
              ) : (
                <div className="mt-10 flex flex-col">
                  {t.careersDepartmentSections.map((dept: any) => {
                    const isOpen = t.careersOpenDepartment === dept.department;
                    return (
                      <div key={dept.department} className={HAIRLINE}>
                        <button
                          type="button"
                          onClick={() =>
                            t.setCareersOpenDepartment(
                              isOpen ? "" : dept.department,
                            )
                          }
                          className="flex w-full items-center justify-between py-4 text-left"
                        >
                          <span className="text-[14px] font-medium">
                            {dept.ordinal}. {dept.department}
                          </span>
                          <span className="text-[#b9b8ff]/40">
                            {isOpen ? "−" : "+"}
                          </span>
                        </button>
                        {isOpen ? (
                          <div className="flex flex-col gap-1 pb-4">
                            {dept.jobs.map((job: any, idx: number) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => t.openCareersJob(job)}
                                className="flex items-center justify-between border-t border-white/5 py-3 text-left"
                              >
                                <div>
                                  <p className="text-[13px] font-medium">
                                    {job?.title ||
                                      job?.designation ||
                                      job?.name}
                                  </p>
                                  <p className="mt-0.5 text-[11.5px] text-[#b9b8ff]/45">
                                    {job?.location || ""}
                                  </p>
                                </div>
                                <span
                                  className="text-[11px] font-medium uppercase tracking-[0.15em]"
                                  style={{ color: ACCENT }}
                                >
                                  Apply →
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={t.openCareersGeneralApply}
                    className="mt-8 self-start rounded-[5px] border border-white/40 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition duration-100 hover:bg-white hover:text-black"
                  >
                    General application
                  </button>
                </div>
              )}
            </>
          ) : (
            <div>
              <button
                type="button"
                onClick={t.closeCareersJob}
                className="text-[11px] font-medium uppercase tracking-[0.2em] underline underline-offset-4"
              >
                ← Back
              </button>
              <h2 className={`${HEADING} mt-4 text-center`}>
                {t.careersDirectApply
                  ? "General Application"
                  : t.careersApplyJob?.title || t.careersApplyJob?.name}
              </h2>

              {!t.careersDirectApply ? (
                <div className="mt-6 flex gap-6 border-b border-white/15">
                  <button
                    type="button"
                    onClick={() => t.setCareersDetailTab("description")}
                    className="pb-3 text-[12px] font-medium uppercase tracking-[0.15em]"
                    style={{
                      color:
                        t.careersDetailTab === "description"
                          ? ACCENT
                          : "rgba(0,0,0,0.4)",
                      borderBottom:
                        t.careersDetailTab === "description"
                          ? `2px solid ${ACCENT}`
                          : "2px solid transparent",
                    }}
                  >
                    Description
                  </button>
                  <button
                    type="button"
                    onClick={() => t.setCareersDetailTab("apply")}
                    className="pb-3 text-[12px] font-medium uppercase tracking-[0.15em]"
                    style={{
                      color:
                        t.careersDetailTab === "apply"
                          ? ACCENT
                          : "rgba(0,0,0,0.4)",
                      borderBottom:
                        t.careersDetailTab === "apply"
                          ? `2px solid ${ACCENT}`
                          : "2px solid transparent",
                    }}
                  >
                    Apply
                  </button>
                </div>
              ) : null}

              {t.careersDetailTab === "description" && !t.careersDirectApply ? (
                <div className="mt-8 flex max-w-2xl flex-col gap-6 text-[14px] leading-relaxed text-[#b9b8ff]/65">
                  {t.careersApplyJob?.aboutTheJob ? (
                    <div>
                      <p className="font-medium text-white">About this role</p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {t.careersApplyJob.aboutTheJob}
                      </p>
                    </div>
                  ) : null}
                  {t.careersApplyJob?.keyResponsibilities ? (
                    <div>
                      <p className="font-medium text-white">
                        Key responsibilities
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {t.careersApplyJob.keyResponsibilities}
                      </p>
                    </div>
                  ) : null}
                  {t.careersApplyJob?.requirements ? (
                    <div>
                      <p className="font-medium text-white">Requirements</p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {t.careersApplyJob.requirements}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {t.careersDetailTab === "apply" || t.careersDirectApply ? (
                <div className="mt-8 max-w-2xl">
                  {t.careersApplySubmitted ? (
                    <div className="border border-white/15 p-6 text-center">
                      <p className="text-[14px] font-medium">
                        Application submitted!
                      </p>
                      <p className="mt-1 text-[13px] text-[#b9b8ff]/55">
                        We'll review it and get back to you shortly.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={t.submitCareersApplication}
                      className="grid grid-cols-1 gap-3 md:grid-cols-2"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Full name *"
                        value={t.careersApplyForm.fullName}
                        onChange={(e) =>
                          t.setCareersApplyForm((p: any) => ({
                            ...p,
                            fullName: e.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                      <input
                        type="email"
                        required
                        placeholder="Email *"
                        value={t.careersApplyForm.email}
                        onChange={(e) =>
                          t.setCareersApplyForm((p: any) => ({
                            ...p,
                            email: e.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                      <input
                        type="date"
                        required
                        placeholder="Date of birth *"
                        value={t.careersApplyForm.dateOfBirth}
                        onChange={(e) =>
                          t.setCareersApplyForm((p: any) => ({
                            ...p,
                            dateOfBirth: e.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                      <select
                        required
                        value={t.careersApplyForm.country}
                        onChange={(e) =>
                          t.setCareersApplyForm((p: any) => ({
                            ...p,
                            country: e.target.value,
                          }))
                        }
                        className={INPUT}
                      >
                        <option value="">Country *</option>
                        {t.applyCountryList.map((c: any) => (
                          <option key={c.isoCode} value={c.isoCode}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        required
                        value={t.careersApplyForm.state}
                        disabled={!t.careersApplyForm.country}
                        onChange={(e) =>
                          t.setCareersApplyForm((p: any) => ({
                            ...p,
                            state: e.target.value,
                          }))
                        }
                        className={`${INPUT} disabled:opacity-50`}
                      >
                        <option value="">State *</option>
                        {t.applyStateList.map((s: any) => (
                          <option key={s.isoCode} value={s.isoCode}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <select
                        required
                        value={t.careersApplyForm.city}
                        disabled={!t.careersApplyForm.state}
                        onChange={(e) =>
                          t.setCareersApplyForm((p: any) => ({
                            ...p,
                            city: e.target.value,
                          }))
                        }
                        className={`${INPUT} disabled:opacity-50`}
                      >
                        <option value="">City *</option>
                        {t.applyCityList.map((c: any) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-stretch border border-white/20 bg-black">
                        <span className="flex shrink-0 items-center border-r border-white/20 px-3 text-[13px] text-[#b9b8ff]/50">
                          {t.careersApplyDialCode || "+ --"}
                        </span>
                        <input
                          type="tel"
                          required
                          placeholder="Mobile number *"
                          value={t.careersApplyForm.phone}
                          onChange={(e) =>
                            t.setCareersApplyForm((p: any) => ({
                              ...p,
                              phone: e.target.value.replace(/[^\d\s-]/g, ""),
                            }))
                          }
                          className="w-full px-3 py-2.5 text-[14px] outline-none"
                        />
                      </div>
                      <label className="flex cursor-pointer items-center justify-between border border-dashed border-white/25 px-3 py-2.5 text-[13px]">
                        <span>
                          {t.careersResumeFile
                            ? t.careersResumeFile.name
                            : "Upload resume / CV *"}
                        </span>
                        <span className="border border-white/20 px-2 py-1 text-[10px] uppercase tracking-wider">
                          Choose file
                        </span>
                        <input
                          type="file"
                          required
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) =>
                            t.setCareersResumeFile(e.target.files?.[0] || null)
                          }
                        />
                      </label>
                      {t.careersFormFields.map((field: any) =>
                        field.type === "textarea" ? (
                          <textarea
                            key={field.id}
                            rows={3}
                            required={field.required}
                            placeholder={`${field.label}${field.required ? " *" : ""}`}
                            value={t.careersCustomValues[field.id] || ""}
                            onChange={(e) =>
                              t.setCareersCustomValues((p: any) => ({
                                ...p,
                                [field.id]: e.target.value,
                              }))
                            }
                            className={`md:col-span-2 ${INPUT}`}
                          />
                        ) : (
                          <input
                            key={field.id}
                            type="text"
                            required={field.required}
                            placeholder={`${field.label}${field.required ? " *" : ""}`}
                            value={t.careersCustomValues[field.id] || ""}
                            onChange={(e) =>
                              t.setCareersCustomValues((p: any) => ({
                                ...p,
                                [field.id]: e.target.value,
                              }))
                            }
                            className={
                              field.fullWidth ? `md:col-span-2 ${INPUT}` : INPUT
                            }
                          />
                        ),
                      )}
                      {t.careersApplyError ? (
                        <p className="md:col-span-2 text-[12px] text-[#f87171]">
                          {t.careersApplyError}
                        </p>
                      ) : null}
                      <button
                        type="submit"
                        disabled={t.careersApplySubmitting}
                        className="md:col-span-2 rounded-[5px] bg-[#3d38f5] py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition duration-100 hover:opacity-85 disabled:opacity-50"
                      >
                        {t.careersApplySubmitting
                          ? "Submitting…"
                          : "Submit application"}
                      </button>
                    </form>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {/* Contact page */}
      {section === "contact" && t.contactPageEnabled ? (
        <section className={PAGE_WRAP}>
          <span className={`${EYEBROW} block text-center`}>Contact</span>
          <h2 className={`${HEADING} mt-3 text-center`}>
            {draft?.contactTitle || "Get in touch"}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[0.6fr_0.4fr]">
            {draft?.mapUrl ? (
              <iframe
                title="map"
                src={draft.mapUrl}
                className="h-[300px] w-full rounded-[5px] border-0 md:h-[420px]"
                loading="lazy"
              />
            ) : (
              <div className="h-[300px] w-full rounded-[5px] bg-white/5 md:h-[420px]" />
            )}
            <div className="flex flex-col gap-4 rounded-[5px] border border-white/10 p-7 text-[15px]">
              {draft?.companyLogo ? (
                <img
                  src={draft.companyLogo}
                  alt={draft.companyName || "Company"}
                  className="mb-1 h-11 w-auto object-contain"
                />
              ) : null}
              {t.contactEmail ? (
                <a
                  href={`mailto:${t.contactEmail}`}
                  className="flex items-center gap-3 hover:opacity-70"
                >
                  <MailIcon />
                  {t.contactEmail}
                </a>
              ) : null}
              {t.contactPhone ? (
                <a
                  href={`tel:${t.contactPhone.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-3 hover:opacity-70"
                >
                  <PhoneIcon />
                  {t.contactPhone}
                </a>
              ) : null}
              {t.contactAddress ? (
                <div className="flex items-start gap-3">
                  <span className="pt-0.5">
                    <PinIcon />
                  </span>
                  <span>{t.contactAddress}</span>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {galleryViewer}

      {/* Footer */}
      <footer className="border-t border-white/15 bg-black">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-16 text-center md:grid-cols-[1.35fr_1fr_1fr_1fr] md:px-8 md:text-left">
          <div>
            {draft?.companyLogo ? (
              <img
                src={draft.companyLogo}
                alt={draft.companyName || "Company"}
                className="mx-auto h-10 w-auto object-contain md:mx-0 md:h-12"
              />
            ) : null}
            {t.footerCompanyName ? (
              <p className="mt-3 text-[13px] font-medium">
                {t.footerCompanyName}
              </p>
            ) : null}
            {t.footerAddress ? (
              <p className="mt-1 text-[12px] text-[#b9b8ff]/45">
                {t.footerAddress}
              </p>
            ) : null}
            {t.footerSocialLinks.length ? (
              <div className="mt-4 flex items-center justify-center gap-3 md:justify-start">
                {t.footerSocialLinks.map((social: any) => (
                  <a
                    key={social.key}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={SOCIAL_LABEL[social.key] || social.key}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-white/20 text-[#b9b8ff]/70 transition hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2"
                    style={focusStyle}
                  >
                    {SOCIAL_ICON[social.key]}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9b8ff]/70">
              Quick Links
            </h3>
            <div className="mt-3 flex flex-col gap-2 text-[13px] text-[#b9b8ff]/60">
              {t.navItems.map((item: any) => (
                <button
                  key={`footer-${item.slug}`}
                  type="button"
                  onClick={() => t.goToSection(item.slug)}
                  className="hover:text-white"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          {t.productsPageEnabled ? (
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9b8ff]/70">
                Services
              </h3>
              <div className="mt-3 flex flex-col gap-2 text-[13px] text-[#b9b8ff]/60">
                {t.productPages.length > 0 ? (
                  t.productPages.map((page: any, idx: number) => (
                    <button
                      key={`footer-product-${idx}`}
                      type="button"
                      onClick={() =>
                        t.goToProductPage(page?.slug || page?.name || "")
                      }
                      className="hover:text-white"
                    >
                      {page?.name || page?.heading || "Service"}
                    </button>
                  ))
                ) : (
                  <p className="text-[#b9b8ff]/30">No products listed</p>
                )}
              </div>
            </div>
          ) : null}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9b8ff]/70">
              Contact
            </h3>
            <div className="mt-3 flex flex-col gap-2 text-[13px] text-[#b9b8ff]/60">
              {t.contactPhone ? <p>{t.contactPhone}</p> : null}
              {t.contactEmail ? <p>{t.contactEmail}</p> : null}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-4 text-center text-[11px] text-[#b9b8ff]/40">
          {t.footerCopyrightText}
        </div>
      </footer>

      {/* Lead modal (home / product listing quick-enquire) */}
      {t.selectedLeadProduct && !t.selectedDetailItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={t.closeLeadModal}
        >
          <div
            className="w-full max-w-md rounded-[5px] border border-white/15 bg-[#0d0d10] p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-[15px] font-medium">
                {t.selectedLeadProduct?.name || "Enquire"}
              </h3>
              <button
                type="button"
                onClick={t.closeLeadModal}
                className="text-[#b9b8ff]/50 hover:text-white"
              >
                ✕
              </button>
            </div>
            {t.leadSubmitted ? (
              <p className="mt-6 text-[14px] text-[#b9b8ff]/70">
                Thanks — we'll be in touch shortly.
              </p>
            ) : (
              <form
                onSubmit={t.submitLeadForm}
                className="mt-6 flex flex-col gap-3"
              >
                {[
                  { key: "fullName", label: "Full name", type: "text" },
                  { key: "mobile", label: "Mobile number", type: "text" },
                  { key: "email", label: "Email", type: "email" },
                  { key: "people", label: "No. of people", type: "number" },
                ].map((field) => (
                  <input
                    key={field.key}
                    type={field.type}
                    placeholder={field.label}
                    value={(t.leadForm as any)[field.key]}
                    onChange={(e) =>
                      t.setLeadForm((prev: any) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                ))}
                {t.leadSubmitError ? (
                  <p className="text-[12px] text-[#f87171]">
                    {t.leadSubmitError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={t.leadSubmitPending}
                  className="mt-2 rounded-[5px] bg-[#3d38f5] py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition duration-100 hover:opacity-85 disabled:opacity-50"
                >
                  {t.leadSubmitPending ? "Submitting…" : "Submit"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {/* Review modal */}
      {t.reviewModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => t.setReviewModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[5px] border border-white/15 bg-[#0d0d10] p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-[15px] font-medium">Write a review</h3>
              <button
                type="button"
                onClick={() => t.setReviewModalOpen(false)}
                className="text-[#b9b8ff]/50 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={t.submitReviewForm}
              className="mt-6 flex flex-col gap-3"
            >
              <input
                type="text"
                placeholder="Your name"
                value={t.reviewForm.reviewerName}
                onChange={(e) =>
                  t.setReviewForm((prev: any) => ({
                    ...prev,
                    reviewerName: e.target.value,
                  }))
                }
                className={INPUT}
              />
              <textarea
                placeholder="Your review"
                value={t.reviewForm.review}
                onChange={(e) =>
                  t.setReviewForm((prev: any) => ({
                    ...prev,
                    review: e.target.value,
                  }))
                }
                rows={4}
                className={INPUT}
              />
              {t.reviewSubmitError ? (
                <p className="text-[12px] text-[#f87171]">
                  {t.reviewSubmitError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={t.reviewSubmitPending}
                className="mt-2 rounded-[5px] bg-[#3d38f5] py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition duration-100 hover:opacity-85 disabled:opacity-50"
              >
                {t.reviewSubmitPending ? "Submitting…" : "Submit review"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {t.successPopup.open ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[5px] border border-white/15 bg-[#0d0d10] px-5 py-3 text-[13px] text-white shadow-lg">
          {t.successPopup.message}
        </div>
      ) : null}
    </div>
  );
};

export default MinimalSwissTemplate;
