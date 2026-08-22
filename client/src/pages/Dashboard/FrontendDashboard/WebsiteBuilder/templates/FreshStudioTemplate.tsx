import React, { useState, useEffect } from "react";
import { useWebsiteTemplateData, resolveSectionFromSlug, normalizeSlug } from "./useWebsiteTemplateData";
import TemplateServicesDropdown from "./TemplateServicesDropdown";
import { isProductsNavItem } from "./templateNavigation";
import { getInclusionMeta } from "./inclusionIcons";

// "Fresh Studio" — dark, image-forward theme: near-black background
// (#0A0A12) with white text and a soft red accent (#D94B4B),
// small precise radii with pill buttons, tight functional spacing, explicit
// focus-visible states for WCAG 2.2 AA. Distinct from Minimal Swiss and Warm
// Organic. Full site: home, about, products (listing + detail + lead
// capture), gallery, testimonials, partner, careers (listings + application),
// contact — every section consistently on the dark/red palette established
// in the hero.
//
// Typography: Manrope (headings) + Work Sans (body) — real Google Fonts,
// distinct from Minimal Swiss (Archivo/IBM Plex) and Warm Organic
// (Fraunces/Karla).
const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Work+Sans:wght@400;500;600&display=swap');";
const HEADING_FONT = "font-['Manrope',ui-sans-serif,system-ui,sans-serif]";
const FONT = "font-['Work_Sans',ui-sans-serif,system-ui,sans-serif]";
// Dark, red-accented theme — carried consistently across the whole page from
// the hero the user approved (near-black background, white text, red CTAs).
const TEXT = "rgba(255,255,255,0.72)";
const HEADING = "#ffffff";
const MUTED = "rgba(255,255,255,0.55)";
const WHITE = "#ffffff";
const BLACK = "#000000";
const ACCENT = "#D94B4B";
const ACCENT_GRADIENT = "linear-gradient(135deg, #D94B4B 0%, #D94B4B 100%)";
const PAGE_BG = "#0A0A12";
const SURFACE = "#14141c";

// max-w-7xl to match Classic's site width (CONTENT_WRAP).
const WRAP = "mx-auto w-full max-w-7xl px-6 md:px-10";
const PAGE_WRAP = `${WRAP} py-12 md:py-16`;
const EYEBROW = `text-[12px] font-semibold uppercase tracking-[0.08em] ${FONT}`;
const SECTION_HEADING = `text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] ${HEADING_FONT}`;

const LinedHeading = ({
  title,
  className = "",
  style,
}: {
  title: string;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div className={`flex items-center gap-4 ${className}`}>
    <div className="flex-1 border-t" style={{ borderColor: ACCENT }} />
    <h2 className={`shrink-0 text-center ${SECTION_HEADING}`} style={style}>
      {title}
    </h2>
    <div className="flex-1 border-t" style={{ borderColor: ACCENT }} />
  </div>
);
const CARD = "rounded-[4px] bg-[#14141c] transition duration-150";
const PILL_BUTTON = `inline-flex items-center justify-center rounded-full px-7 py-3 text-[14px] font-semibold transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${FONT}`;
const INPUT =
  "w-full rounded-[4px] border px-3.5 py-2.5 text-[14px] outline-none transition duration-150 bg-[#14141c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1";
const inputStyle = { borderColor: "rgba(255,255,255,0.18)", color: TEXT };
const focusStyle = { outlineColor: ACCENT } as React.CSSProperties;
// Form fields specifically use a neutral focus outline instead of the red
// accent — the red ring around every input read as a validation/error
// state rather than a normal focus indicator. Buttons/links keep the accent
// outline via focusStyle above.
const inputFocusStyle = { outlineColor: "rgba(255,255,255,0.35)" } as React.CSSProperties;

const MailIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);
const PhoneIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
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
    strokeWidth="1.5"
  >
    <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
    <circle cx="12" cy="11" r="2" />
  </svg>
);

const SOCIAL_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
};
const SOCIAL_ICON: Record<string, React.ReactNode> = {
  instagram: (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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
      strokeWidth="2"
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
      strokeWidth="2"
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

// product cards carry the description under different keys depending on
// where they came from — a home-level productDropdownPage stores it as
// homeCardSubText, a sub-product under a page stores it as description, and
// the synthetic fallback entries (no dropdown pages configured yet) use
// subText. Check all three so the card never silently drops it.
const getProductCardDescription = (product: any) =>
  String(
    product?.subText || product?.homeCardSubText || product?.description || "",
  ).trim();

// Dropdown-page cards carry `cardImage`, but a page's own sub-products (added
// via the Services tab's "Add Product" list) only carry an `images` array —
// fall back to that (and a couple of other shapes), and finally to the
// parent page's own cardImage (same last-resort the product-detail view
// uses via `page?.cardImage`) so a sub-product with no image of its own
// still shows something instead of a blank box.
const getProductCardImage = (product: any, fallbackImage?: string) => {
  const candidate =
    product?.cardImage ??
    product?.images?.[0] ??
    product?.heroImage ??
    product?.heroImages?.[0] ??
    "";
  const resolved =
    typeof candidate === "string" ? candidate : candidate?.url || candidate?.preview || "";
  return resolved || fallbackImage || "";
};

const ProductGrid = ({
  products,
  onSelect,
  fallbackImage,
}: {
  products: any[];
  onSelect: (p: any) => void;
  fallbackImage?: string;
}) => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {products.map((product: any, idx: number) => {
      const description = getProductCardDescription(product);
      const cardImage = getProductCardImage(product, fallbackImage);
      return (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(product)}
          className={`${CARD} group flex flex-col overflow-hidden border text-left hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
          style={{ borderColor: "rgba(255,255,255,0.12)", ...focusStyle }}
        >
          <div
            className="aspect-[4/3] w-full overflow-hidden"
            style={{ backgroundColor: "#15151f" }}
          >
            {cardImage ? (
              <img
                src={cardImage}
                alt={product?.name || ""}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : null}
          </div>
          <div className="flex flex-1 flex-col items-center gap-1.5 p-5 text-center">
            <span
              className="text-[15px] font-semibold"
              style={{ color: HEADING }}
            >
              {product?.name || product?.heading || "Service"}
            </span>
            {description ? (
              <span
                className="line-clamp-2 text-[13px] leading-relaxed"
                style={{ color: MUTED }}
              >
                {description}
              </span>
            ) : null}
            <span
              className="mt-2 text-[12px] font-semibold"
              style={{ color: ACCENT }}
            >
              View details →
            </span>
          </div>
        </button>
      );
    })}
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
    <section className={PAGE_WRAP}>
      <LinedHeading title={title || "Trusted by"} style={{ color: ACCENT }} />
      <div className="mt-7 overflow-hidden">
        <div className="flex items-center justify-center gap-8 md:gap-16">
          {displayed.map((src, idx) => (
            <div
              key={`logo-${offset}-${idx}`}
              className="flex h-[50px] w-[120px] shrink-0 items-center justify-center rounded-[4px] bg-white/95 p-2 md:h-[70px] md:w-[180px]"
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
    </section>
  );
};

const getTestimonialsPerView = () => {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth < 768) return 1;
  if (window.innerWidth < 1024) return 2;
  return 3;
};

const TestimonialCard = ({ item }: { item: any }) => (
  <div
    className={`${CARD} h-full border p-5`}
    style={{ borderColor: "rgba(255,255,255,0.12)" }}
  >
    <div className="text-[13px]" style={{ color: ACCENT }}>
      {"★".repeat(Number(item?.rating) || 5)}
    </div>
    <p className="mt-2 text-[14px] leading-relaxed">"{item?.text}"</p>
    <span className="mt-3 block text-[13px] font-semibold" style={{ color: HEADING }}>
      {item?.name}
    </span>
  </div>
);

// Mirrors Classic's sliding testimonials carousel: auto-advances every 3s,
// pauses on hover, and loops seamlessly by appending the first `perView`
// items to the end of the track and snapping back once they scroll past.
// Falls back to a plain static grid when there aren't enough testimonials
// to fill more than one page.
const TestimonialsCarousel = ({ testimonials }: { testimonials: any[] }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const [perView, setPerView] = useState(getTestimonialsPerView);
  const [isPaused, setIsPaused] = useState(false);
  const [transition, setTransition] = useState(true);
  const total = testimonials.length;
  const isCarousel = total > perView;
  const extended = [...testimonials, ...testimonials.slice(0, perView)];

  useEffect(() => {
    const handleResize = () => setPerView(getTestimonialsPerView());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isCarousel) return;
    setSlideIndex(0);
  }, [perView, isCarousel]);

  useEffect(() => {
    if (!isCarousel || isPaused) return;
    const timer = window.setInterval(() => setSlideIndex((prev) => prev + 1), 3000);
    return () => window.clearInterval(timer);
  }, [isCarousel, isPaused]);

  // When we reach the duplicated tail, jump back to the real start instantly
  // (transition off for one frame) so the loop reads as continuous.
  useEffect(() => {
    if (slideIndex >= total) {
      const jump = window.setTimeout(() => {
        setTransition(false);
        setSlideIndex(0);
      }, 500);
      return () => window.clearTimeout(jump);
    }
  }, [slideIndex, total]);

  useEffect(() => {
    if (!transition) {
      const restore = requestAnimationFrame(() => {
        requestAnimationFrame(() => setTransition(true));
      });
      return () => cancelAnimationFrame(restore);
    }
  }, [transition]);

  if (!total) return null;

  if (!isCarousel) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {testimonials.map((item, idx) => (
          <TestimonialCard key={item?.key || idx} item={item} />
        ))}
      </div>
    );
  }

  const slideWidth = 100 / perView;
  const dotIndex = slideIndex % total;

  return (
    <div onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      <div className="overflow-hidden">
        <div
          className="flex"
          style={{
            transform: `translateX(-${slideIndex * slideWidth}%)`,
            transition: transition ? "transform 500ms ease-in-out" : "none",
          }}
        >
          {extended.map((item, idx) => (
            <div
              key={`${item?.key || item?.name}-${idx}`}
              className="shrink-0 px-2.5"
              style={{ width: `${slideWidth}%` }}
            >
              <TestimonialCard item={item} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex justify-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setTransition(true);
              setSlideIndex(i);
            }}
            aria-label={`Go to testimonial ${i + 1}`}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === dotIndex ? 24 : 6,
              backgroundColor: i === dotIndex ? ACCENT : "rgba(255,255,255,0.18)",
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Splits a raw answer into bullet lines (ones ending in . ! ?) vs plain
// paragraph text, same heuristic Classic's FaqAccordion uses, so an answer
// written as a few short sentences reads as a point-wise list instead of one
// dense paragraph.
const splitFaqAnswer = (answer: string) => {
  const lines = String(answer || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
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
  return blocks;
};

const FaqList = ({
  faqs,
}: {
  faqs: Array<{ question: string; answer: string }>;
}) => {
  const [open, setOpen] = useState<number | null>(null);
  if (!faqs.length) return null;
  return (
    <section className={PAGE_WRAP}>
      <LinedHeading title="Frequently Asked Questions" style={{ color: ACCENT }} />
      <div className="mt-5 flex flex-col gap-3">
        {faqs.map((faq, idx) => {
          const isOpen = open === idx;
          const blocks = isOpen ? splitFaqAnswer(faq.answer) : [];
          const hasBullets = blocks.some((b) => b.type === "bullet");
          return (
            <div
              key={idx}
              className={`${CARD} overflow-hidden border`}
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : idx)}
                className="flex w-full items-center justify-between px-5 py-4 text-left focus-visible:outline focus-visible:outline-2"
                style={focusStyle}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{ background: ACCENT_GRADIENT }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className="text-[14px] font-semibold md:text-[15px]"
                    style={{ color: HEADING }}
                  >
                    {faq.question}
                  </span>
                </span>
                <span
                  className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[16px]"
                  style={{ borderColor: "rgba(255,255,255,0.18)", color: MUTED }}
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen ? (
                <div
                  className="border-t px-5 py-4"
                  style={{ borderColor: "rgba(255,255,255,0.10)", backgroundColor: "#101018" }}
                >
                  <div className="space-y-2">
                    {blocks.map((block, bi) =>
                      block.type === "bullet" ? (
                        <div key={bi} className="flex items-start gap-2">
                          <span
                            className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: ACCENT }}
                          />
                          <p
                            className="text-[13px] leading-relaxed md:text-[14px]"
                            style={{ color: MUTED }}
                          >
                            {block.text}
                          </p>
                        </div>
                      ) : (
                        <p
                          key={bi}
                          className={`text-[13px] leading-relaxed md:text-[14px] ${hasBullets ? "pl-4" : ""}`}
                          style={{ color: MUTED }}
                        >
                          {block.text}
                        </p>
                      ),
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// Home- and product-page inclusion checklists are both saved as {key,
// enabled} pairs (see CreateWebsite.tsx's ALL_KEYS list) — no label or icon
// on the item itself. getInclusionMeta looks both up from the shared
// ALL_INCLUSIONS list (same icon set Classic uses) by key.
const Inclusions = ({
  inclusions,
  title,
}: {
  inclusions: any[];
  title: string;
}) => {
  const enabled = inclusions.filter((item) => item?.enabled !== false);
  if (!enabled.length) return null;
  return (
    <section className={PAGE_WRAP}>
      <LinedHeading title={title} style={{ color: ACCENT }} />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 md:gap-6">
        {enabled.map((item, index) => {
          const { label, icon } = getInclusionMeta(item);
          return (
            <div
              key={item?.key || index}
              className="flex flex-col items-center gap-2 text-center"
            >
              <span style={{ color: ACCENT }}>{icon}</span>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: MUTED }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
const FreshStudioTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;

  if (!draft) {
    return (
      <div className={`mx-auto max-w-4xl p-6 ${FONT}`}>
        <h2 className="text-lg font-semibold" style={{ color: HEADING }}>
          Preview
        </h2>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          No preview data found. Go back to Create Website and click Preview.
        </p>
      </div>
    );
  }

  const section = t.currentSection;
  const isHome = section === "home";
  const productPages: any[] = t.productPages || [];
  const leadFormFields = t.selectedLeadProduct
    ? t.getLeadFieldsForProduct(
        t.selectedLeadProduct?.slug || t.selectedLeadProduct?.name || "",
      )
    : [];

  const navLabelForSection = (sectionKey: string, fallback: string) => {
    const match = (t.navItems || []).find(
      (item: any) => resolveSectionFromSlug(item.slug) === sectionKey,
    );
    return String(match?.name || "").trim() || fallback;
  };

  const breadcrumbItems: Array<{ label: string; onClick?: () => void }> = [
    { label: navLabelForSection("home", "Home"), onClick: () => t.goToSection("home") },
  ];

  if (section !== "home") {
    const label = navLabelForSection(
      section,
      section === "partner"
        ? "Partner"
        : section === "testimonials"
          ? "Testimonials"
          : section === "products"
            ? "Services"
            : section.charAt(0).toUpperCase() + section.slice(1),
    );
    breadcrumbItems.push({
      label,
      onClick: () => t.goToSection(section),
    });
  }

  if (section === "products" && t.selectedProductPage) {
    breadcrumbItems.push({
      label: String(
        t.selectedProductPage?.heading ||
          t.selectedProductPage?.name ||
          "Service",
      ).trim(),
      onClick: t.selectedDetailItem
        ? () =>
            t.goToProductPage(
              t.selectedProductPage?.slug ||
                t.selectedProductPage?.name ||
                "",
            )
        : undefined,
    });
  }

  if (section === "products" && t.selectedDetailItem) {
    breadcrumbItems.push({
      label: String(
        t.selectedDetailItem?.title ||
          t.selectedDetailItem?.name ||
          t.selectedDetailItem?.heading ||
          "Details",
      ).trim(),
    });
  }

  // The last item in a breadcrumb trail is always the current page — the
  // branches above give every non-Home item an onClick unconditionally
  // (since most of them can also appear as an intermediate link, e.g. the
  // product page when a sub-item is open), so whichever one ends up last
  // needs it stripped here rather than each branch trying to predict
  // whether something deeper will get pushed after it. Without this, a
  // section with no further drill-down (About, Gallery, Contact, or
  // Products with nothing selected) rendered its own name as a plain
  // clickable link instead of the non-clickable red/bold current-page
  // label.
  if (breadcrumbItems.length > 1) {
    breadcrumbItems[breadcrumbItems.length - 1].onClick = undefined;
  }

  return (
    <div
      className={`min-h-screen ${FONT}`}
      style={{ backgroundColor: PAGE_BG, color: TEXT }}
    >
      <style>{FONT_IMPORT}</style>
      {/* Header */}
      <header
        ref={t.headerRef}
        className="sticky top-0 z-30"
        style={{
          backgroundColor: "rgba(10,10,18,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div className={`${WRAP} flex items-center justify-between gap-4 py-4`}>
          <button
            type="button"
            onClick={() => t.goToSection("home")}
            className="flex h-12 w-auto max-w-[180px] items-center justify-start overflow-hidden md:h-14 focus-visible:outline focus-visible:outline-2"
            style={focusStyle}
            aria-label="Go to home"
          >
            {draft?.companyLogo ? (
              <img
                src={draft.companyLogo}
                alt={draft.companyName || "Logo"}
                className="h-full w-auto object-left object-contain"
              />
            ) : (
              <span
                className={`text-[15px] font-bold ${HEADING_FONT}`}
                style={{ color: HEADING }}
              >
                {draft?.companyName || ""}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => t.setMobileMenuOpen((p: boolean) => !p)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[4px] md:hidden focus-visible:outline focus-visible:outline-2"
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              ...focusStyle,
            }}
            aria-label="Toggle navigation"
          >
            <span className="flex flex-col gap-1">
              <span
                className="block h-px w-4"
                style={{ backgroundColor: HEADING }}
              />
              <span
                className="block h-px w-4"
                style={{ backgroundColor: HEADING }}
              />
            </span>
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            {t.navItems.map((item: any) => {
              const isActive =
                t.currentSection === resolveSectionFromSlug(item.slug) ||
                (isHome && item.slug === "home");
              if (isProductsNavItem(item) && t.productsPageEnabled)
                return (
                  <TemplateServicesDropdown
                    key={item.slug}
                    item={item}
                    productPages={t.productPages}
                    currentSection={t.currentSection}
                    currentProductSlug={t.currentProductSlug}
                    goToSection={t.goToSection}
                    goToProductPage={t.goToProductPage}
                    variant="fresh"
                  />
                );
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => t.goToSection(item.slug)}
                  className={`border-b-2 pb-1 text-[14px] font-medium transition duration-150 hover:border-[#D94B4B] focus-visible:outline focus-visible:outline-2 ${
                    isActive ? "border-[#D94B4B]" : "border-transparent"
                  }`}
                  style={{ color: isActive ? ACCENT : TEXT, ...focusStyle }}
                >
                  {item.name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="rounded-full border border-white/22 px-5 py-2 text-[13px] font-semibold text-white transition hover:border-[#D94B4B] hover:text-[#D94B4B] focus-visible:outline focus-visible:outline-2"
              style={focusStyle}
            >
              Login
            </button>
          </nav>
        </div>

        {t.mobileMenuOpen ? (
          <div
            className={`${WRAP} py-3 md:hidden`}
            style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
          >
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
                    variant="fresh"
                    mobile
                  />
                ) : (
                  <button
                    key={`m-${item.slug}`}
                    type="button"
                    onClick={() => t.goToSection(item.slug)}
                    className={`py-3 text-left text-[14px] font-medium ${
                      t.currentSection === resolveSectionFromSlug(item.slug) ? "text-[#D94B4B]" : ""
                    }`}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      color: t.currentSection === resolveSectionFromSlug(item.slug) ? ACCENT : TEXT,
                    }}
                  >
                    {item.name}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => window.location.assign("/")}
                className="py-3 text-left text-[14px] font-semibold"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  color: ACCENT,
                }}
              >
                Login
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {breadcrumbItems.length > 1 ? (
        <div
          className={FONT}
          style={{ backgroundColor: PAGE_BG }}
        >
          <div className={`${WRAP} ${FONT} flex items-center gap-3 py-2 px-4 text-[12px] md:px-6`}>
            {breadcrumbItems.map((item, index) => {
              const isCurrent = index === breadcrumbItems.length - 1;
              return (
                <div key={`${item.label}-${index}`} className={`${FONT} flex items-center gap-3`}>
                  {index > 0 ? (
                    <span
                      aria-hidden="true"
                      className={FONT}
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      &rsaquo;
                    </span>
                  ) : null}
                  {item.onClick && !isCurrent ? (
                    <button
                      type="button"
                      onClick={item.onClick}
                      className={`${FONT} transition hover:text-[#D94B4B]`}
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span
                      aria-current="page"
                      className={`${FONT} inline-block border-b-2 pb-0.5 font-semibold`}
                      style={{ color: ACCENT, borderColor: ACCENT }}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {isHome ? (
        <>
          {/* Hero — dark, image-forward cover section matching a reference the user
              shared: bold rounded headline, red gradient primary CTA + white
              secondary CTA, a large fixed "main" image bleeding to the viewport
              edge with a soft red glow behind it, plus a dimmed/blurred
              full-bleed background carousel (up to 5 images, auto-advancing)
              as an atmospheric section background — spans the full hero, from
              right below the sticky header to the section's bottom edge. This
              dark/red theme now carries through the entire page, not just the
              hero. */}
          {t.isSectionEnabled("home_hero") ? (
            <section
              className="relative overflow-hidden"
              style={{ backgroundColor: PAGE_BG }}
            >
              {t.heroImages.length ? (
                <div
                  className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                  aria-hidden="true"
                >
                  {/* Clamp defensively — heroIndex can momentarily point past
                      the current array (e.g. right after removing an image)
                      since it's ticked by an interval on its own schedule,
                      independent of when the array itself changes length. */}
                  <div
                    className="flex h-full w-full transition-transform duration-700 ease-in-out"
                    style={{
                      transform: `translateX(-${(t.heroIndex % t.heroImages.length) * 100}%)`,
                    }}
                  >
                    {t.heroImages.map((src: string, idx: number) => (
                      <div key={`hero-bg-${idx}`} className="h-full min-w-full">
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-cover blur-sm"
                          style={{ opacity: 0.85 }}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Darkens for text legibility without crushing the image to
                      black. */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(10,10,18,0.35) 0%, rgba(10,10,18,0.55) 55%, rgba(10,10,18,0.82) 100%)",
                    }}
                  />
                </div>
              ) : null}
              <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 md:gap-6 md:py-24 md:pl-10 md:pr-0">
                <div className="flex flex-col gap-5">
                  <h1
                    className={`text-[38px] font-black leading-[1.05] tracking-[-0.02em] md:text-[56px] ${HEADING_FONT}`}
                    style={{ color: WHITE }}
                  >
                    {draft?.title || draft?.companyName || ""}
                  </h1>
                  <p
                    className="max-w-md text-[15px] leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.62)" }}
                  >
                    {draft?.subTitle || ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="rounded-full px-7 py-3 text-[14px] font-semibold text-white transition duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{
                        background:
                          "linear-gradient(135deg, #D94B4B 0%, #D94B4B 100%)",
                        outlineColor: "#D94B4B",
                      }}
                    >
                      {draft?.ctaText || "Get in touch"}
                    </button>
                    <button
                      type="button"
                      onClick={() => t.goToSection("contact")}
                      className="rounded-full bg-white px-7 py-3 text-[14px] font-semibold transition duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{ color: "#0A0A12", outlineColor: WHITE }}
                    >
                      Contact us
                    </button>
                  </div>
                </div>

                <div className="relative md:justify-self-end">
                  <div
                    className="pointer-events-none absolute -inset-6 rounded-[40px] opacity-50 blur-3xl md:-inset-10"
                    style={{
                      background:
                        "radial-gradient(circle, #D94B4B, transparent 65%)",
                    }}
                  />
                  <div
                    className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] md:aspect-square md:w-[420px] md:rounded-[32px]"
                    style={{ backgroundColor: "#16161f" }}
                  >
                    {/* Fixed featured shot — distinct from the rotating
                        background carousel behind the whole section. */}
                    {t.mainHeroImage ? (
                      <img
                        src={t.mainHeroImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "radial-gradient(circle at 30% 25%, rgba(217,75,75,1), transparent 55%)",
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {t.aboutPageEnabled &&
          t.isSectionEnabled("home_about") &&
          t.aboutIntroBlocks.length ? (
            <section className={PAGE_WRAP}>
              <LinedHeading title="About" style={{ color: ACCENT }} />
              <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-4 text-center">
                {t.aboutIntroBlocks.map((text: string, idx: number) => (
                  <p key={idx} className="text-[15px] leading-relaxed">
                    {text}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          {t.productsPageEnabled &&
          t.isSectionEnabled("home_products") &&
          productPages.length ? (
            <section className={PAGE_WRAP}>
              <LinedHeading title="What we offer" style={{ color: ACCENT }} />
              <div className="mt-6">
                <ProductGrid
                  products={productPages}
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
            <section className={PAGE_WRAP}>
              <LinedHeading title="Gallery" style={{ color: ACCENT }} />
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                {t.homeGalleryItems.map((src: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => t.openGalleryViewer(idx)}
                    className="aspect-square overflow-hidden rounded-[4px] focus-visible:outline focus-visible:outline-2"
                    style={{ backgroundColor: "#15151f", ...focusStyle }}
                  >
                    <img
                      src={src}
                      alt={`Gallery ${idx + 1}`}
                      className="h-full w-full object-cover transition duration-300 hover:scale-105"
                    />
                  </button>
                ))}
              </div>
              {t.galleryItems.length > 6 ? (
                <div className="mt-7 flex justify-center">
                  <button
                    type="button"
                    onClick={() => t.goToSection("gallery")}
                    className="rounded-full px-6 py-2.5 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2"
                    style={{
                      border: "1px solid rgba(255,255,255,0.22)",
                      color: HEADING,
                      ...focusStyle,
                    }}
                  >
                    Show more →
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {t.isSectionEnabled("home_testimonials") && t.testimonials.length ? (
            <section className={PAGE_WRAP}>
              <LinedHeading title="What people say" style={{ color: ACCENT }} />
              <div className="mt-7">
                <TestimonialsCarousel testimonials={t.testimonials} />
              </div>
              {t.showWriteReview ? (
                <div className="mt-7 text-center">
                  <button
                    type="button"
                    onClick={t.openReviewModal}
                    className="rounded-full px-6 py-2.5 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2"
                    style={{
                      border: "1px solid rgba(255,255,255,0.22)",
                      color: HEADING,
                      ...focusStyle,
                    }}
                  >
                    Write a review
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {t.contactPageEnabled && t.isSectionEnabled("home_contact") ? (
            <>
              <section
                className="relative overflow-hidden"
                style={{ background: ACCENT_GRADIENT }}
              >
                <div
                  className={`${WRAP} relative z-10 flex flex-col items-center gap-2 py-12 text-center md:py-14`}
                >
                  <span
                    className={EYEBROW}
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    Contact
                  </span>
                  <h2
                    className={`text-[26px] font-extrabold md:text-[32px] ${HEADING_FONT}`}
                    style={{ color: WHITE }}
                  >
                    {draft?.companyName
                      ? `Let's talk, ${draft.companyName}`
                      : "Get in touch"}
                  </h2>
                </div>
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 85% 30%, rgba(255,255,255,0.10), transparent 45%)",
                  }}
                />
              </section>
              {/* Map + contact card — same info the dedicated Contact page shows. */}
              <section className={PAGE_WRAP}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-[0.62fr_0.38fr]">
                  {draft?.mapUrl ? (
                    <iframe
                      title="map"
                      src={draft.mapUrl}
                      className="h-[320px] w-full rounded-[4px] border-0 md:h-[420px]"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="h-[320px] w-full rounded-[4px] md:h-[420px]"
                      style={{ backgroundColor: "#15151f" }}
                    />
                  )}
                  <div
                    className={`${CARD} border flex flex-col justify-center gap-4 p-7`}
                    style={{ borderColor: "rgba(255,255,255,0.12)" }}
                  >
                    {draft?.companyLogo ? (
                      <img
                        src={draft.companyLogo}
                        alt={draft.companyName || "Company"}
                        className="mb-2 h-12 w-auto object-contain"
                      />
                    ) : null}
                    {t.contactEmail ? (
                      <a
                        href={`mailto:${t.contactEmail}`}
                        className="flex items-center gap-3 text-[14.5px] hover:opacity-80 focus-visible:outline focus-visible:outline-2"
                        style={focusStyle}
                      >
                        <MailIcon />
                        {t.contactEmail}
                      </a>
                    ) : null}
                    {t.contactPhone ? (
                      <a
                        href={`tel:${t.contactPhone.replace(/[^\d+]/g, "")}`}
                        className="flex items-center gap-3 text-[14.5px] hover:opacity-80 focus-visible:outline focus-visible:outline-2"
                        style={focusStyle}
                      >
                        <PhoneIcon />
                        {t.contactPhone}
                      </a>
                    ) : null}
                    {t.contactAddress ? (
                      <div className="flex items-start gap-3 text-[14.5px]">
                        <span className="pt-0.5">
                          <PinIcon />
                        </span>
                        <span>{t.contactAddress}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </>
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
          <LinedHeading
            title={draft?.aboutTitle || "About us"}
            className="mb-2"
            style={{ color: ACCENT }}
          />
          <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-4 text-center">
            {t.aboutIntroBlocks.map((text: string, idx: number) => (
              <p key={idx} className="text-[15px] leading-relaxed">
                {text}
              </p>
            ))}
          </div>
          {t.aboutNarrativeBlocks.length ? (
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
              {t.aboutNarrativeBlocks.map((item: any) => (
                <div
                  key={item.title}
                  className={`${CARD} border p-5`}
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                >
                  <h3
                    className="text-[13px] font-semibold uppercase tracking-[0.06em]"
                    style={{ color: ACCENT }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="mt-2 text-[14px] leading-relaxed"
                    style={{ color: MUTED }}
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {t.founders.length ? (
            <div className="mt-14 flex flex-col gap-16">
              <LinedHeading title="Founders" style={{ color: ACCENT }} />
              {t.founders.map((founder: any, idx: number) => {
                const founderImg =
                  typeof founder?.image === "string"
                    ? founder.image
                    : founder?.image?.url || "";
                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-stretch gap-6 md:flex-row md:gap-10 ${
                      idx % 2 === 1 ? "md:flex-row-reverse" : ""
                    }`}
                  >
                    <div className="w-full md:w-1/2">
                      {founderImg ? (
                        <img
                          src={founderImg}
                          alt={founder?.name}
                          className="h-full min-h-[280px] w-full rounded-[4px] object-cover md:min-h-[420px]"
                        />
                      ) : (
                        <div
                          className="h-full min-h-[280px] w-full rounded-[4px] md:min-h-[420px]"
                          style={{ backgroundColor: "#15151f" }}
                        />
                      )}
                    </div>
                    <div className="flex w-full flex-col justify-center md:w-1/2">
                      <h4
                        className={`text-[22px] font-bold ${HEADING_FONT} md:text-[26px]`}
                        style={{ color: HEADING }}
                      >
                        {founder?.name}
                      </h4>
                      <p className="mt-1 text-[14px] font-semibold" style={{ color: ACCENT }}>
                        {founder?.role}
                      </p>
                      <p className="mt-3 text-[14.5px] leading-relaxed">
                        {founder?.bio}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          {t.aboutPageImageCards.length ? (
            <div className="mt-14 flex flex-col gap-8">
              <LinedHeading
                title={draft?.aboutPageTeamHeading || "Our Team"}
                style={{ color: ACCENT }}
              />
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-8">
                {t.aboutPageImageCards.map((card: any, idx: number) => {
                  const image =
                    typeof card?.image === "string" ? card.image : card?.image?.url || "";
                  return (
                    <div
                      key={idx}
                      className="w-[calc(50%-12px)] shrink-0 grow-0 sm:w-[calc(33.333%-16px)] lg:w-[calc(20%-19.2px)]"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={card?.title || ""}
                          className="aspect-square w-full rounded-[4px] object-cover"
                        />
                      ) : (
                        <div
                          className="aspect-square w-full rounded-[4px]"
                          style={{ backgroundColor: "#15151f" }}
                        />
                      )}
                      {card?.title ? (
                        <h5
                          className={`mt-3 text-[15px] font-bold ${HEADING_FONT}`}
                          style={{ color: HEADING }}
                        >
                          {card.title}
                        </h5>
                      ) : null}
                      {card?.description ? (
                        <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
                          {card.description}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
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
                <>
                <section className={PAGE_WRAP}>
                  {/* Image and the right column share a fixed height on desktop
                      (matching Classic) — heading/price pinned at the top,
                      description scrolls in the middle if long, and the lead
                      form is pinned at the bottom so its bottom edge lines up
                      with the image's bottom edge. */}
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start md:gap-12">
                    <div className="w-full">
                      {image ? (
                        <img
                          src={typeof image === "string" ? image : image?.url}
                          alt={title}
                          className="h-[300px] w-full rounded-[4px] object-cover md:h-[520px]"
                        />
                      ) : (
                        <div
                          className="h-[300px] w-full rounded-[4px] md:h-[520px]"
                          style={{ backgroundColor: "#15151f" }}
                        />
                      )}
                    </div>
                    <div className="flex flex-col md:h-[520px]">
                      <div className="shrink-0">
                        <h1
                          className={`text-[24px] font-extrabold ${HEADING_FONT} md:text-[32px]`}
                          style={{ color: HEADING }}
                        >
                          {title}
                        </h1>
                        {price ? (
                          <p className="mt-1 text-[15px]" style={{ color: MUTED }}>
                            {price}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex-1 overflow-y-auto py-2 pr-1">
                        {description ? (
                          <ul className="space-y-2">
                            {description
                              .split(/\n|(?<=\.)\s+/)
                              .map((s: string) => s.trim())
                              .filter(Boolean)
                              .map((point: string, i: number) => (
                                <li
                                  key={`desc-bullet-${i}`}
                                  className="flex items-start gap-2 text-[13px] leading-relaxed md:text-[14px]"
                                  style={{ color: MUTED }}
                                >
                                  <span
                                    className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: ACCENT }}
                                  />
                                  <span>{point}</span>
                                </li>
                              ))}
                          </ul>
                        ) : null}
                      </div>

                      <div className="shrink-0">
                        {t.leadSubmitted ? (
                          <div
                            className={`${CARD} flex h-full min-h-[220px] flex-col items-center justify-center gap-3 border p-6 text-center`}
                            style={{ borderColor: "rgba(255,255,255,0.12)" }}
                          >
                            <p
                              className="text-[16px] font-semibold"
                              style={{ color: HEADING }}
                            >
                              Enquiry submitted successfully.
                            </p>
                            <p
                              className="text-[13px]"
                              style={{ color: MUTED }}
                            >
                              We'll get back to you shortly.
                            </p>
                          </div>
                        ) : (
                          <form
                            onSubmit={t.submitLeadForm}
                            className={`${CARD} flex flex-col gap-3 border p-5`}
                            style={{ borderColor: "rgba(255,255,255,0.12)" }}
                          >
                            <span
                              className={EYEBROW}
                              style={{ color: ACCENT }}
                            >
                              Enquire now
                            </span>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                                  style={{ ...inputStyle, ...inputFocusStyle }}
                                />
                              ))}
                            </div>
                            {t.leadSubmitError ? (
                              <p className="text-[12px] text-[#D94B4B]">
                                {t.leadSubmitError}
                              </p>
                            ) : null}
                            <button
                              type="submit"
                              disabled={t.leadSubmitPending}
                              className={`${PILL_BUTTON} mt-1 disabled:opacity-50`}
                              style={{
                                background: ACCENT_GRADIENT,
                                color: WHITE,
                                ...focusStyle,
                              }}
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
                {Array.isArray(page?.inclusions) &&
                page.inclusions.length > 0 &&
                page?.inclusionsEnabled !== false ? (
                  <Inclusions
                    inclusions={page.inclusions}
                    title={`${String(page?.heading || page?.name || "Service").trim()} Inclusions`}
                  />
                ) : null}
                {page?.faqEnabled !== false ? (
                  <FaqList faqs={Array.isArray(draft?.faqs) ? draft.faqs : []} />
                ) : null}
                </>
              );
            })()
          ) : t.selectedProductPage ? (
            <>
              {/* Full-bleed product-page hero — mirrors Classic: a banner image
                  (single or, in carousel mode, cycling through the page's own
                  heroImages) with the page heading/subheading/CTA overlaid. */}
              {(t.selectedProductPage as any)?.heroEnabled !== false ? (
                <section
                  className="relative h-[62svh] min-h-[450px] overflow-hidden md:h-[84vh] md:min-h-[550px]"
                  style={{ backgroundColor: "#15151f" }}
                >
                  {t.selectedProductHeroImage ? (
                    <img
                      src={t.selectedProductHeroImage}
                      alt={t.selectedProductPage?.name || "Service"}
                      className="absolute inset-0 h-full w-full object-cover opacity-60"
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-end justify-center px-4 pb-10 text-center text-white md:pb-16">
                    <div>
                      <h1
                        className={`text-[26px] font-bold ${HEADING_FONT} md:text-4xl`}
                        style={{ color: WHITE }}
                      >
                        {(t.selectedProductPage as any)?.heroHeading ||
                          (t.selectedProductPage as any)?.name}
                      </h1>
                      {(t.selectedProductPage as any)?.heroSubHeading ? (
                        <p
                          className="mt-2 text-[13px] leading-relaxed md:mt-3 md:text-lg"
                          style={{ color: "rgba(255,255,255,0.75)" }}
                        >
                          {(t.selectedProductPage as any).heroSubHeading}
                        </p>
                      ) : null}
                      {(t.selectedProductPage as any)?.heroButtonText ? (
                        <button
                          type="button"
                          className={`${PILL_BUTTON} mt-4 md:mt-6`}
                          style={{ background: ACCENT_GRADIENT, color: WHITE }}
                        >
                          {String(
                            (t.selectedProductPage as any).heroButtonText,
                          ).toUpperCase()}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {(t.selectedProductPage as any)?.heroMode === "carousel" &&
                  t.selectedProductHeroImages.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={t.handleProductHeroPrev}
                        className="absolute left-5 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/50 px-4 py-2 text-2xl text-white md:block focus-visible:outline focus-visible:outline-2"
                        style={{ outlineColor: WHITE }}
                        aria-label="Previous image"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={t.handleProductHeroNext}
                        className="absolute right-5 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/50 px-4 py-2 text-2xl text-white md:block focus-visible:outline focus-visible:outline-2"
                        style={{ outlineColor: WHITE }}
                        aria-label="Next image"
                      >
                        ›
                      </button>
                    </>
                  ) : null}
                </section>
              ) : null}
              <section className={PAGE_WRAP}>
                <div>
                  <LinedHeading
                    title={`${String((t.selectedProductPage as any)?.heading || t.selectedProductPage?.name || "").trim() || "Our"} ${t.isMenuProductSlug(t.selectedProductPage?.slug || "") ? "Menu" : "Services"}`}
                    className="mb-6"
                    style={{ color: ACCENT }}
                  />
                  {t.isMenuProductSlug(t.selectedProductPage?.slug || "") ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
                      {t.menuItems.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className={`${CARD} border p-4`}
                          style={{ borderColor: "rgba(255,255,255,0.12)" }}
                        >
                          {item?.image ? (
                            <img
                              src={item.image}
                              alt={item?.name}
                              className="aspect-[4/3] w-full rounded-[4px] object-cover"
                            />
                          ) : null}
                          <div className="mt-3 flex items-center justify-between">
                            <h4
                              className="text-[14px] font-semibold"
                              style={{ color: HEADING }}
                            >
                              {item?.name}
                            </h4>
                            {item?.price ? (
                              <span
                                className="text-[13px]"
                                style={{ color: MUTED }}
                              >
                                {item.price}
                              </span>
                            ) : null}
                          </div>
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
                      fallbackImage={
                        typeof (t.selectedProductPage as any)?.cardImage === "string"
                          ? (t.selectedProductPage as any).cardImage
                          : (t.selectedProductPage as any)?.cardImage?.url || ""
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
              (t.selectedProductPage as any).inclusions.length > 0 &&
              (t.selectedProductPage as any)?.inclusionsEnabled !== false ? (
                <Inclusions
                  inclusions={(t.selectedProductPage as any).inclusions}
                  title={`${String((t.selectedProductPage as any)?.heading || t.selectedProductPage?.name || "Service").trim()} Inclusions`}
                />
              ) : null}
              {(t.selectedProductPage as any)?.faqEnabled !== false ? (
                <FaqList faqs={Array.isArray(draft?.faqs) ? draft.faqs : []} />
              ) : null}
            </>
          ) : (
            <section className={PAGE_WRAP}>
              <LinedHeading
                title={String(draft?.productTitle || "").trim() || "Our Services"}
                className="mb-6"
                style={{ color: ACCENT }}
              />
              <ProductGrid
                products={productPages}
                onSelect={t.handleProductCardAction}
              />
            </section>
          )}
        </>
      ) : null}

      {/* Gallery page */}
      {section === "gallery" && t.galleryPageEnabled ? (
        <section className={PAGE_WRAP}>
          <LinedHeading
            title="Gallery"
            style={{ color: ACCENT }}
          />
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {t.galleryItems.map((src: string, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => t.openGalleryViewer(idx)}
                className="aspect-square overflow-hidden rounded-[4px] focus-visible:outline focus-visible:outline-2"
                style={{ backgroundColor: "#15151f", ...focusStyle }}
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
            <LinedHeading
              title="Testimonials"
              style={{ color: ACCENT }}
            />
            {t.showWriteReview ? (
              <button
                type="button"
                onClick={t.openReviewModal}
                className="text-[13px] font-semibold focus-visible:outline focus-visible:outline-2"
                style={{ color: ACCENT, ...focusStyle }}
              >
                Write a review
              </button>
            ) : null}
          </div>
          <div className="mt-7">
            <TestimonialsCarousel testimonials={t.testimonials} />
          </div>
        </section>
      ) : null}

      {/* Partner page */}
      {section === "partner" && t.partnerPageEnabled ? (
        <section className={PAGE_WRAP}>
          <LinedHeading
            title={t.partnerPageHeading || "Become a partner"}
            className="mb-6"
            style={{ color: ACCENT }}
          />
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div className="text-[14.5px] leading-relaxed">
              {t.partnerPageContent ? (
                t.partnerPageContent.split("\n").map((p: string, i: number) => (
                  <p key={i} className="mb-4 last:mb-0">
                    {p}
                  </p>
                ))
              ) : (
                <p style={{ color: MUTED }}>Partner content coming soon.</p>
              )}
            </div>
            <div
              className={`${CARD} border p-6`}
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              <h3
                className="text-center text-[18px] font-semibold md:text-[20px]"
                style={{ color: HEADING }}
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
                  style={{ ...inputStyle, ...inputFocusStyle }}
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
                  style={{ ...inputStyle, ...inputFocusStyle }}
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
                  style={{ ...inputStyle, ...inputFocusStyle }}
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
                  style={{ ...inputStyle, ...inputFocusStyle }}
                />
                <button
                  type="button"
                  disabled={t.partnerSubmitPending}
                  className={`${PILL_BUTTON} disabled:opacity-50`}
                  style={{
                    background: ACCENT_GRADIENT,
                    color: WHITE,
                    ...focusStyle,
                  }}
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
              <LinedHeading
                title={draft?.companyName
                  ? `Join ${draft.companyName}`
                  : "Join our team"}
                className="mb-6"
                style={{ color: ACCENT }}
              />
              <div className="mx-auto max-w-2xl text-center text-[14.5px] leading-relaxed">
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
                <p className="mt-8 text-[13px]" style={{ color: MUTED }}>
                  Loading open roles…
                </p>
              ) : t.careersJobs.length === 0 ? (
                <p className="mt-8 text-[13px]" style={{ color: MUTED }}>
                  No job openings at the moment — check back later.
                </p>
              ) : (
                <div className="mt-9 flex flex-col gap-2">
                  {t.careersDepartmentSections.map((dept: any) => {
                    const isOpen = t.careersOpenDepartment === dept.department;
                    return (
                      <div
                        key={dept.department}
                        className={`${CARD} border`}
                        style={{ borderColor: "rgba(255,255,255,0.12)" }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            t.setCareersOpenDepartment(
                              isOpen ? "" : dept.department,
                            )
                          }
                          className="flex w-full items-center justify-between p-4 text-left focus-visible:outline focus-visible:outline-2"
                          style={focusStyle}
                        >
                          <span
                            className="text-[14.5px] font-semibold"
                            style={{ color: HEADING }}
                          >
                            {dept.ordinal}. {dept.department}
                          </span>
                          <span style={{ color: ACCENT }}>
                            {isOpen ? "−" : "+"}
                          </span>
                        </button>
                        {isOpen ? (
                          <div className="flex flex-col gap-1 px-4 pb-4">
                            {dept.jobs.map((job: any, idx: number) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => t.openCareersJob(job)}
                                className="flex items-center justify-between rounded-[4px] px-3 py-2.5 text-left transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2"
                                style={focusStyle}
                              >
                                <p className="text-[13.5px] font-medium">
                                  {job?.title || job?.designation || job?.name}
                                </p>
                                <span
                                  className="text-[12px] font-semibold"
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
                    className={`${PILL_BUTTON} mt-4 self-start`}
                    style={{
                      border: `1px solid ${ACCENT}`,
                      color: ACCENT,
                      backgroundColor: WHITE,
                      ...focusStyle,
                    }}
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
                className="text-[13px] font-semibold focus-visible:outline focus-visible:outline-2"
                style={{ color: ACCENT, ...focusStyle }}
              >
                ← Back
              </button>
              <h2
                className={`mt-4 text-[24px] font-extrabold ${HEADING_FONT} text-center`}
                style={{ color: HEADING }}
              >
                {t.careersDirectApply
                  ? "General Application"
                  : t.careersApplyJob?.title || t.careersApplyJob?.name}
              </h2>
              {!t.careersDirectApply ? (
                <div
                  className="mt-6 flex gap-6"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}
                >
                  <button
                    type="button"
                    onClick={() => t.setCareersDetailTab("description")}
                    className="pb-3 text-[13px] font-semibold"
                    style={{
                      color:
                        t.careersDetailTab === "description" ? ACCENT : MUTED,
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
                    className="pb-3 text-[13px] font-semibold"
                    style={{
                      color: t.careersDetailTab === "apply" ? ACCENT : MUTED,
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
                <div className="mt-8 flex flex-col gap-6 text-[14px] leading-relaxed">
                  {t.careersApplyJob?.aboutTheJob ? (
                    <div>
                      <p className="font-semibold" style={{ color: HEADING }}>
                        About this role
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {t.careersApplyJob.aboutTheJob}
                      </p>
                    </div>
                  ) : null}
                  {t.careersApplyJob?.keyResponsibilities ? (
                    <div>
                      <p className="font-semibold" style={{ color: HEADING }}>
                        Key responsibilities
                      </p>
                      <ul className="mt-2 list-inside list-disc space-y-1">
                        {t.careersApplyJob.keyResponsibilities
                          .split(/\.\s+/)
                          .map((s: string) => s.replace(/\.$/, "").trim())
                          .filter(Boolean)
                          .map((point: string, i: number) => (
                            <li key={i}>{point}</li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                  {t.careersApplyJob?.requirements ? (
                    <div>
                      <p className="font-semibold" style={{ color: HEADING }}>
                        Requirements
                      </p>
                      <ul className="mt-2 list-inside list-disc space-y-1">
                        {t.careersApplyJob.requirements
                          .split(/\.\s+/)
                          .map((s: string) => s.replace(/\.$/, "").trim())
                          .filter(Boolean)
                          .map((point: string, i: number) => (
                            <li key={i}>{point}</li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                  {t.careersApplyJob?.softSkills ? (
                    <div>
                      <p className="font-semibold" style={{ color: HEADING }}>
                        Soft skills
                      </p>
                      <ul className="mt-2 list-inside list-disc space-y-1">
                        {t.careersApplyJob.softSkills
                          .split(/\.\s+/)
                          .map((s: string) => s.replace(/\.$/, "").trim())
                          .filter(Boolean)
                          .map((point: string, i: number) => (
                            <li key={i}>{point}</li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                  <div
                    className="mt-2 pt-6 text-center"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    {draft?.companyLogo ? (
                      <img
                        src={draft.companyLogo}
                        alt={draft.companyName || "Company"}
                        className="mx-auto h-12 w-auto object-contain"
                      />
                    ) : draft?.companyName ? (
                      <p
                        className="text-[16px] font-semibold"
                        style={{ color: HEADING }}
                      >
                        {draft.companyName}
                      </p>
                    ) : null}
                    {draft?.email ? (
                      <p className="mt-3 text-[14px] leading-7">
                        Please send in your resume to{" "}
                        <span
                          className="font-semibold"
                          style={{ color: HEADING }}
                        >
                          Email: {draft.email}
                        </span>{" "}
                        if unable to apply now.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {t.careersDetailTab === "apply" || t.careersDirectApply ? (
                <div className="mt-8">
                  {t.careersApplySubmitted ? (
                    <div
                      className={`${CARD} border p-6 text-center`}
                      style={{ borderColor: "rgba(255,255,255,0.12)" }}
                    >
                      <p
                        className="text-[14px] font-semibold"
                        style={{ color: HEADING }}
                      >
                        Application submitted!
                      </p>
                      <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
                        We'll review it and get back to you shortly.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={t.submitCareersApplication}
                      className={`${CARD} border grid grid-cols-1 gap-3 p-6 md:grid-cols-2 md:p-7`}
                      style={{ borderColor: "rgba(255,255,255,0.12)" }}
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
                        style={{ ...inputStyle, ...inputFocusStyle }}
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
                        style={{ ...inputStyle, ...inputFocusStyle }}
                      />
                      <input
                        type="date"
                        required
                        value={t.careersApplyForm.dateOfBirth}
                        onChange={(e) =>
                          t.setCareersApplyForm((p: any) => ({
                            ...p,
                            dateOfBirth: e.target.value,
                          }))
                        }
                        className={INPUT}
                        style={{ ...inputStyle, ...inputFocusStyle }}
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
                        style={{ ...inputStyle, ...inputFocusStyle }}
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
                        style={{ ...inputStyle, ...inputFocusStyle }}
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
                        style={{ ...inputStyle, ...inputFocusStyle }}
                      >
                        <option value="">City *</option>
                        {t.applyCityList.map((c: any) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div
                        className="flex items-stretch overflow-hidden rounded-[4px]"
                        style={inputStyle}
                      >
                        <span
                          className="flex shrink-0 border border-solid items-center px-3 text-[13px]"
                          style={{
                            borderRight: "1px solid rgba(255,255,255,0.18)",
                            borderColor: "rgba(255,255,255,0.22)",
                            color: MUTED,
                            backgroundColor: "#1c1c26",
                          }}
                        >
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
                          className="w-full px-3 py-2.5 bg-[#14141c] text-[14px] outline- border border-solid"
                          style={{ borderColor: "rgba(255,255,255,0.22)" , borderRight: "1px solid rgba(255,255,255,0.18)" ,color: MUTED,}}
                        />
                      </div>
                      <label
                        className="flex cursor-pointer items-center justify-between outline-1 rounded-[4px] border border-solid px-3 py-2.5 text-[13px]"
                        style={{ borderColor: "rgba(255,255,255,0.22)" , outlineColor: "rgba(255,255,255,0.22)" , color: MUTED}} 
                      >
                        <span>
                          {t.careersResumeFile
                            ? t.careersResumeFile.name
                            : "Upload resume / CV *"}
                        </span>
                        <span
                          className="rounded-[3px] border px-2 py-1 text-[11px] uppercase tracking-wider"
                          style={{ borderColor: "rgba(255,255,255,0.18)" }}
                        >
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
                            style={{ ...inputStyle, ...inputFocusStyle }}
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
                            style={{ ...inputStyle, ...inputFocusStyle }}
                          />
                        ),
                      )}
                      {t.careersApplyError ? (
                        <p className="md:col-span-2 text-[12px] text-[#D94B4B]">
                          {t.careersApplyError}
                        </p>
                      ) : null}
                      <button
                        type="submit"
                        disabled={t.careersApplySubmitting}
                        className={`${PILL_BUTTON} md:col-span-2 disabled:opacity-50`}
                        style={{
                          background: ACCENT_GRADIENT,
                          color: WHITE,
                          ...focusStyle,
                        }}
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
          <LinedHeading
            title={draft?.contactTitle || "Get in touch"}
            className="mb-6"
            style={{ color: ACCENT }}
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[0.6fr_0.4fr]">
            {draft?.mapUrl ? (
              <iframe
                title="map"
                src={draft.mapUrl}
                className="h-[300px] w-full rounded-[4px] border-0 md:h-[420px]"
                loading="lazy"
              />
            ) : (
              <div
                className="h-[300px] w-full rounded-[4px] md:h-[420px]"
                style={{ backgroundColor: "#15151f" }}
              />
            )}
            <div
              className={`${CARD} border flex flex-col p-7`}
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              {draft?.companyLogo ? (
                <img
                  src={draft.companyLogo}
                  alt={draft.companyName || "Company"}
                  className="mx-auto h-12 w-auto object-contain"
                />
              ) : null}
              <div className="mt-6 flex flex-col gap-4 text-[14.5px]">
                {t.contactEmail ? (
                  <a
                    href={`mailto:${t.contactEmail}`}
                    className="flex items-center gap-3 hover:opacity-70 focus-visible:outline focus-visible:outline-2"
                    style={focusStyle}
                  >
                    <MailIcon />
                    {t.contactEmail}
                  </a>
                ) : null}
                {t.contactPhone ? (
                  <a
                    href={`tel:${t.contactPhone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-3 hover:opacity-70 focus-visible:outline focus-visible:outline-2"
                    style={focusStyle}
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

      {t.galleryViewerOpen ? (
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
            className="max-h-[85vh] max-w-[85vw] rounded-[4px] object-contain"
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
            className="absolute right-6 top-6 text-sm text-white/70 hover:text-white"
          >
            Close ✕
          </button>
        </div>
      ) : null}

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 text-center md:grid-cols-[1.35fr_1fr_1fr_1fr] md:px-10 md:text-left">
          <div>
            {draft?.companyLogo ? (
              <img
                src={draft.companyLogo}
                alt={draft.companyName || "Company"}
                className="mx-auto h-10 w-auto object-contain md:mx-0 md:h-12"
              />
            ) : null}
            {t.footerCompanyName ? (
              <p
                className="mt-3 text-[15px] font-semibold"
                style={{ color: HEADING }}
              >
                {t.footerCompanyName}
              </p>
            ) : null}
            {t.footerAddress ? (
              <p
                className="mt-1 text-[13px] leading-relaxed"
                style={{ color: MUTED }}
              >
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
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-white hover:text-[#0A0A12] focus-visible:outline focus-visible:outline-2"
                    style={{
                      borderColor: "rgba(255,255,255,0.18)",
                      color: WHITE,
                      ...focusStyle,
                    }}
                  >
                    {SOCIAL_ICON[social.key]}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <h3
              className="text-[12px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: HEADING }}
            >
              Quick Links
            </h3>
            <div
              className="mt-3 flex flex-col gap-2 text-[13.5px] items-start"
              style={{ color: MUTED }}
            >
              {t.navItems.map((item: any) => (
                <button
                  key={`footer-${item.slug}`}
                  type="button"
                  onClick={() => t.goToSection(item.slug)}
                  className="hover:opacity-70"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          {t.productsPageEnabled ? (
            <div>
              <h3
                className="text-[12px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: HEADING }}
              >
                Services
              </h3>
              <div
                className="mt-3 flex flex-col gap-2 text-[13.5px] items-start"
                style={{ color: MUTED }}
              >
                {productPages.length > 0 ? (
                  productPages.map((page: any, idx: number) => (
                    <button
                      key={`footer-product-${idx}`}
                      type="button"
                      onClick={() =>
                        t.goToProductPage(page?.slug || page?.name || "")
                      }
                      className="hover:opacity-70"
                    >
                      {page?.name || page?.heading || "Service"}
                    </button>
                  ))
                ) : (
                  <p style={{ color: "rgba(255,255,255,0.35)" }}>
                    No products listed
                  </p>
                )}
              </div>
            </div>
          ) : null}
          <div>
            <h3
              className="text-[12px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: HEADING }}
            >
              Contact Us
            </h3>
            <div
              className="mt-3 flex flex-col gap-2 text-[13.5px]"
              style={{ color: MUTED }}
            >
              {t.contactPhone ? <p>{t.contactPhone}</p> : null}
              {t.contactEmail ? <p>{t.contactEmail}</p> : null}
            </div>
          </div>
        </div>
        <div
          className="px-6 py-4 text-center text-[12px]"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.10)",
            color: MUTED,
          }}
        >
          {t.footerCopyrightText}
        </div>
      </footer>

      {/* Lead modal (home / listing quick-enquire) */}
      {t.selectedLeadProduct && !t.selectedDetailItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={t.closeLeadModal}
        >
          <div
            className="w-full max-w-md rounded-[4px] bg-[#14141c] p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3
                className="text-[16px] font-semibold"
                style={{ color: HEADING }}
              >
                {t.selectedLeadProduct?.name || "Enquire"}
              </h3>
              <button
                type="button"
                onClick={t.closeLeadModal}
                className="hover:opacity-60"
              >
                ✕
              </button>
            </div>
            {t.leadSubmitted ? (
              <p className="mt-6 text-[14px]" style={{ color: MUTED }}>
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
                    style={{ ...inputStyle, ...inputFocusStyle }}
                  />
                ))}
                {t.leadSubmitError ? (
                  <p className="text-[12px] text-[#D94B4B]">
                    {t.leadSubmitError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={t.leadSubmitPending}
                  className={`${PILL_BUTTON} mt-2 disabled:opacity-50`}
                  style={{
                    background: ACCENT_GRADIENT,
                    color: WHITE,
                    ...focusStyle,
                  }}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => t.setReviewModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[4px] bg-[#14141c] p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3
                className="text-[16px] font-semibold"
                style={{ color: HEADING }}
              >
                Write a review
              </h3>
              <button
                type="button"
                onClick={() => t.setReviewModalOpen(false)}
                className="hover:opacity-60"
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
                style={{ ...inputStyle, ...inputFocusStyle }}
              />
              <select
                value={t.reviewForm.rating}
                onChange={(e) =>
                  t.setReviewForm((prev: any) => ({
                    ...prev,
                    rating: e.target.value,
                  }))
                }
                className={INPUT}
                style={{ ...inputStyle, ...inputFocusStyle }}
              >
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={String(rating)}>
                    {rating} Star{rating > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
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
                style={{ ...inputStyle, ...inputFocusStyle }}
              />
              {t.reviewSubmitError ? (
                <p className="text-[12px] text-[#D94B4B]">
                  {t.reviewSubmitError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={t.reviewSubmitPending}
                className={`${PILL_BUTTON} mt-2 disabled:opacity-50`}
                style={{
                  background: ACCENT_GRADIENT,
                  color: WHITE,
                  ...focusStyle,
                }}
              >
                {t.reviewSubmitPending ? "Submitting…" : "Submit review"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {t.successPopup.open ? (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[4px] bg-[#14141c] px-5 py-3 text-[13px] shadow-lg"
          style={{ border: "1px solid rgba(255,255,255,0.12)", color: HEADING }}
        >
          {t.successPopup.message}
        </div>
      ) : null}
    </div>
  );
};

export default FreshStudioTemplate;
