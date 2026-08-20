import React, { useEffect, useState } from "react";
import { useWebsiteTemplateData, resolveSectionFromSlug } from "./useWebsiteTemplateData";
import TemplateServicesDropdown from "./TemplateServicesDropdown";
import { isProductsNavItem } from "./templateNavigation";
import { getInclusionMeta } from "./inclusionIcons";
import professionalTeamFallback from "../../../../../assets/WONO_images/img/website-builder/emerald-studio-professional-team.png";
import exploreArrow from "../../../../../assets/WONO_images/img/website-builder/emerald-studio-arrow.svg";

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&family=Outfit:wght@300;400;500;600;700&display=swap');";
const HEADING_FONT = "font-['Fraunces',Georgia,serif]";
const BODY_FONT = "font-['Outfit',system-ui,sans-serif]";

const WRAP = "max-w-7xl mx-auto px-6";

function LinedHeading({ title, className = "" }: { title: string; className?: string }) {
  return (
    <div className={`flex items-center gap-4 mb-6 ${className}`}>
      <div className="flex-1 h-px bg-amber-400" />
      <h2 className={`text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[18px] text-amber-400 ${HEADING_FONT}`}>{title}</h2>
      <div className="flex-1 h-px bg-amber-400" />
    </div>
  );
}
const INPUT =
  "w-full bg-emerald-950/60 border border-emerald-800 rounded-lg px-4 py-3 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-400 transition-colors";

const CONTACT_ICON_CIRCLE = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-400/50 text-amber-400">
    {children}
  </span>
);

const ContactMailIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

const ContactPhoneIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4.07 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.64 2.6a2 2 0 0 1-.45 2.11L8 9.69a16 16 0 0 0 6.31 6.31l1.26-1.26a2 2 0 0 1 2.11-.45c.83.31 1.7.52 2.6.64A2 2 0 0 1 22 16.92Z" />
  </svg>
);

const ContactMapIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
    <circle cx="12" cy="11" r="2.25" />
  </svg>
);

const SOCIAL_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
};
const FigmaInclusions = ({
  inclusions,
  title = "Inclusions",
}: {
  inclusions: any[];
  title?: string;
}) => {
  const enabled = inclusions.filter((item) => item?.enabled !== false);
  if (!enabled.length) return null;
  return (
    <section className="py-20 px-6 bg-[#004f3b]/20">
      <div className="max-w-7xl mx-auto">
        <LinedHeading title={title} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {enabled.map((item, index) => {
            const { label, icon } = getInclusionMeta(item);
            return (
              <div
                key={item?.key || index}
                className="flex flex-col items-center gap-2 text-center"
              >
                <span className="text-amber-400">{icon}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
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

const FigmaFaqList = ({ faqs }: { faqs: any[] }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const visible = faqs.filter((item) => item?.question && item?.answer);
  if (!visible.length) return null;
  return (
    <section className="py-20 px-6 bg-[#004f3b]/20">
      <div className="max-w-7xl mx-auto">
        <LinedHeading title="FAQ" />
        <div className="flex flex-col gap-3">
          {visible.map((item, index) => {
            const isOpen = openIndex === index;
            const blocks = isOpen ? splitFaqAnswer(item.answer) : [];
            const hasBullets = blocks.some((b) => b.type === "bullet");
            return (
              <div
                key={`${item.question}-${index}`}
                className="overflow-hidden rounded-xl border border-emerald-800/50 bg-emerald-900/40"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-6 px-5 py-4 text-left"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[12px] font-bold text-emerald-950">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-stone-100">
                      {item.question}
                    </span>
                  </span>
                  <span className="text-amber-400 text-xl">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen ? (
                  <div className="px-5 pb-5">
                    <div className="space-y-2">
                      {blocks.map((block, bi) =>
                        block.type === "bullet" ? (
                          <div key={bi} className="flex items-start gap-2">
                            <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                            <p className="text-sm leading-relaxed text-stone-400">
                              {block.text}
                            </p>
                          </div>
                        ) : (
                          <p
                            key={bi}
                            className={`text-sm leading-relaxed text-stone-400 ${hasBullets ? "pl-4" : ""}`}
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
      </div>
    </section>
  );
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

const FigmaProductGrid = ({
  products,
  onSelect,
}: {
  products: any[];
  onSelect: (p: any) => void;
}) => (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {products.map((product: any, idx: number) => {
      const description = getProductCardDescription(product);
      const image =
        product?.cardImage ||
        (typeof product?.images?.[0] === "string"
          ? product.images[0]
          : product?.images?.[0]?.url);
      return (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(product)}
          className="group flex h-full flex-col items-center rounded-xl border border-emerald-800/50 bg-emerald-900/40 p-7 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-emerald-900/60 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          <div className="mb-4 flex h-[200px] w-full items-center justify-center overflow-hidden rounded-lg bg-emerald-950/60 md:h-[230px]">
            {image ? (
              <img
                src={image}
                alt={product?.name || product?.title || ""}
                className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105 group-hover:opacity-100"
              />
            ) : (
              <span className="text-2xl text-amber-400 transition-transform duration-300 group-hover:scale-110">
                ◈
              </span>
            )}
          </div>
          <h3
            className={`mb-2 text-lg font-semibold text-stone-100 ${HEADING_FONT}`}
          >
            {product?.name || product?.title || product?.heading || "Service"}
          </h3>
          {description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-stone-400">
              {description}
            </p>
          ) : null}
          <span className="mt-auto pt-3 text-xs font-semibold uppercase tracking-wider text-amber-400 group-hover:underline">
            Learn more →
          </span>
        </button>
      );
    })}
  </div>
);

const FigmaLogoCarousel = ({
  logos,
  title,
}: {
  logos: string[];
  title?: string;
}) => (
  <section className="border-y border-emerald-800/40 bg-[#004f3b]/20 px-6 py-12">
    <div className="max-w-7xl mx-auto">
      {title ? (
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-stone-500">
          {title}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-7">
        {logos.map((logo, index) => (
          <img
            key={`${logo}-${index}`}
            src={logo}
            alt={`Partner ${index + 1}`}
            className="h-9 max-w-[140px] object-contain opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition"
          />
        ))}
      </div>
    </div>
  </section>
);

const getTestimonialsPerView = () => {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth < 768) return 1;
  if (window.innerWidth < 1024) return 2;
  return 3;
};

const StarIcon = ({ filled, size = 14 }: { filled: boolean; size?: number }) => (
  <svg viewBox="0 0 20 20" className="inline-block" style={{ width: size, height: size, color: filled ? "#ffb900" : "#3f5d52", fill: "currentColor" }}>
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.538 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.783.57-1.838-.197-1.538-1.118l1.287-3.957a1 1 0 00-.364-1.118L3.063 9.39c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
  </svg>
);

const EmeraldOverallRating = ({ testimonials }: { testimonials: any[] }) => {
  const ratings = testimonials.map((t) => Number(t?.rating || 0)).filter((r) => r > 0);
  if (!ratings.length) return null;
  const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const rounded = Math.round(average);
  return (
    <div className="mb-8 flex flex-col items-center gap-1">
      <span className={`text-5xl font-semibold text-stone-100 ${HEADING_FONT}`}>{average.toFixed(1)}</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} filled={i < rounded} size={20} />
        ))}
      </div>
      <span className="text-sm text-stone-400">
        {ratings.length} review{ratings.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
};

const TESTIMONIAL_MAX_CHARS = 200;

const EmeraldTestimonialCard = ({ item }: { item: any }) => {
  const rating = Number(item?.rating || 0);
  const text = String(item?.text || "").trim();
  const isLong = text.length > TESTIMONIAL_MAX_CHARS;
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="h-full min-h-[254px] bg-[#004f3b]/40 border border-[#006045]/50 rounded-xl p-8 flex flex-col gap-6">
      <p className="text-stone-300 text-base leading-relaxed flex-1">
        &ldquo;{expanded || !isLong ? text : `${text.slice(0, TESTIMONIAL_MAX_CHARS).trimEnd()}...`}&rdquo;
      </p>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="-mt-4 self-start text-xs font-semibold text-amber-400 hover:underline"
        >
          {expanded ? "Show less" : "View more"}
        </button>
      ) : null}
      <div className="flex items-center gap-3 border-t border-emerald-800/50 pt-5">
        <div className="w-10 h-10 rounded-full bg-amber-400 text-emerald-950 font-bold text-sm flex items-center justify-center shrink-0">
          {item?.name
            ?.split(" ")
            .map((w: string) => w.charAt(0))
            .join("")
            .slice(0, 2)
            .toUpperCase() || "?"}
        </div>
        <div>
          <p className="font-semibold text-sm text-stone-100">{item?.name}</p>
          {rating ? (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} filled={i < rating} size={12} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Sliding testimonials carousel, mirroring Classic/Fresh Studio: auto-
// advances every 3s, pauses on hover, and loops seamlessly by appending the
// first `perView` items to the end of the track and snapping back once they
// scroll past. Falls back to a plain static grid when there aren't enough
// testimonials to fill more than one page.
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
      <div>
        <EmeraldOverallRating testimonials={testimonials} />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((item, idx) => (
            <EmeraldTestimonialCard key={item?.key || idx} item={item} />
          ))}
        </div>
      </div>
    );
  }

  const slideWidth = 100 / perView;
  const dotIndex = slideIndex % total;

  return (
    <div onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      <EmeraldOverallRating testimonials={testimonials} />
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
              className="shrink-0 px-3"
              style={{ width: `${slideWidth}%` }}
            >
              <EmeraldTestimonialCard item={item} />
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
              backgroundColor: i === dotIndex ? "#fbbf24" : "rgba(255,255,255,0.18)",
            }}
          />
        ))}
      </div>
    </div>
  );
};

const EmeraldStudioTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const section = t.currentSection;
  const isHome = section === "home";

  if (!draft) {
    return (
      <div className={`min-h-screen bg-[#002c22] p-6 ${BODY_FONT}`}>
        <h2 className="text-lg font-semibold text-stone-100">Preview</h2>
        <p className="mt-2 text-sm text-stone-400">
          No preview data found. Go back to Create Website and click Preview.
        </p>
      </div>
    );
  }

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

  if (breadcrumbItems.length > 1) {
    breadcrumbItems[breadcrumbItems.length - 1].onClick = undefined;
  }

  const galleryViewer = t.galleryViewerOpen ? (
    <div
      className="fixed inset-0 z-50 bg-emerald-950/95 flex items-center justify-center px-6"
      onClick={t.closeGalleryViewer}
    >
      <button className="absolute top-6 right-6 text-stone-400 hover:text-stone-100 transition-colors">
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={t.galleryItems[t.galleryViewerIndex]?.replace(/w=\d+/, "w=1200")}
          alt=""
          className="w-full rounded-2xl"
        />
      </div>
      <button
        className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-400 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          t.goToGalleryIndex(t.galleryViewerIndex - 1);
        }}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <button
        className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-400 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          t.goToGalleryIndex(t.galleryViewerIndex + 1);
        }}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  ) : null;

  return (
    <div
      className={`fm-template min-h-screen bg-[#002c22] text-stone-100 ${BODY_FONT}`}
    >
      <style>{`
        ${FONT_IMPORT}
        .fm-template { background-color: #002c22; }
        .fm-template .bg-amber-400 { background-color: #ffb900; }
        .fm-template .text-amber-400 { color: #ffb900; }
        .fm-template .text-emerald-950 { color: #002c22; }
        .fm-template button, .fm-template a { cursor: pointer; }
        .fm-template * { scrollbar-width: none; }
        .fm-template *::-webkit-scrollbar { display: none; }
        .fm-template html { scroll-behavior: smooth; }
      `}</style>

      {/* Navbar */}
      <header className="fixed inset-x-0 top-0 z-50 bg-[#002c22]/[0.92] backdrop-blur border-b border-[#006045]/40">
        <div className={`${WRAP} h-16 flex items-center justify-between`}>
          <button
            type="button"
            onClick={() => t.goToSection("home")}
            className="flex items-center gap-2"
          >
            {draft?.companyLogo ? (
              <img
                src={draft.companyLogo}
                alt={draft.companyName || "Logo"}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <>
                <span
                  className={`w-7 h-7 rounded-sm bg-amber-400 flex items-center justify-center text-emerald-950 font-bold text-sm ${HEADING_FONT}`}
                >
                  {(draft?.companyName || "Y").charAt(0).toUpperCase()}
                </span>
                <span
                  className={`font-semibold text-lg tracking-tight text-stone-100 ${HEADING_FONT}`}
                >
                  {draft?.companyName || "Your Company"}
                </span>
              </>
            )}
          </button>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
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
                  variant="emerald"
                />
              ) : (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => t.goToSection(item.slug)}
                  className={`border-b-2 pb-1 transition-colors duration-150 ${
                    t.currentSection === resolveSectionFromSlug(item.slug) || (isHome && item.slug === "home")
                      ? "border-[#ffb900] text-amber-400"
                      : "border-transparent text-stone-400 hover:border-[#ffb900] hover:text-stone-100"
                  }`}
                >
                  {item.name}
                </button>
              ),
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="text-sm font-semibold text-stone-200 px-4 py-2 rounded border border-[#007a55] hover:border-[#ffb900] hover:text-[#ffb900] transition-colors"
            >
              Login
            </button>
            {/* <button
              type="button"
              onClick={() => t.goToSection("contact")}
              className="text-sm font-semibold bg-amber-400 text-emerald-950 px-4 py-2 rounded hover:bg-amber-300 transition-colors"
            >
              {draft?.ctaText || "Get In Touch"}
            </button> */}
          </div>

          <button
            className="md:hidden text-stone-300"
            onClick={() => t.setMobileMenuOpen((p: boolean) => !p)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {t.mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {t.mobileMenuOpen ? (
          <div className="md:hidden bg-emerald-950 border-t border-emerald-800/40 px-6 py-4 flex flex-col gap-4">
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
                  variant="emerald"
                  mobile
                />
              ) : (
                <button
                  key={`m-${item.slug}`}
                  type="button"
                  onClick={() => t.goToSection(item.slug)}
                  className={`w-fit border-b-2 pb-1 text-sm font-medium text-left transition-colors duration-150 ${
                    t.currentSection === resolveSectionFromSlug(item.slug)
                      ? "border-[#ffb900] text-amber-400"
                      : "border-transparent text-stone-400"
                  }`}
                >
                  {item.name}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="text-sm font-semibold text-left text-[#ffb900] py-2"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => t.goToSection("contact")}
              className="text-sm font-semibold bg-amber-400 text-emerald-950 px-4 py-2 rounded text-center"
            >
              {draft?.ctaText || "Get In Touch"}
            </button>
          </div>
        ) : null}
      </header>

      {breadcrumbItems.length > 1 ? (
        <div className="pt-16 bg-[#004f3b]/20">
          <div className={`${WRAP} flex items-center gap-3 py-2 px-4 md:px-6 text-[12px]`}>
            {breadcrumbItems.map((item, index) => {
              const isCurrent = index === breadcrumbItems.length - 1;
              return (
                <div key={`${item.label}-${index}`} className="flex items-center gap-3">
                  {index > 0 ? (
                    <span aria-hidden="true" className="text-stone-600">&rsaquo;</span>
                  ) : null}
                  {item.onClick && !isCurrent ? (
                    <button
                      type="button"
                      onClick={item.onClick}
                      className="transition hover:text-amber-400 text-stone-500"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span
                      aria-current="page"
                      className="inline-block border-b-2 border-[#ffb900] pb-0.5 font-semibold text-amber-400"
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

      {/* ─── HOME ─── */}
      {isHome ? (
        <>
          {/* Hero */}
          {t.isSectionEnabled("home_hero") ? (
            <section className="relative pt-36 pb-28 px-6 overflow-hidden bg-[#002c22]">
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    "linear-gradient(#ffb900 1px, transparent 1px), linear-gradient(90deg, #ffb900 1px, transparent 1px)",
                  backgroundSize: "60px 60px",
                }}
              />
              <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#007a55]/20 blur-[60px] pointer-events-none" />
              <div className="relative max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                <div>
                  {/* <div className="inline-flex items-center gap-2 bg-[#004f3b]/60 border border-[#007a55]/50 rounded-full px-4 py-1.5 text-xs font-medium text-[#ffb900] mb-8">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffb900]" />
                    {draft?.heroBadgeText ||
                      "Trusted by 350+ businesses worldwide"}
                  </div> */}
                  <h1
                    className={`text-5xl md:text-6xl font-semibold leading-[1.08] tracking-tight mb-6 text-stone-100 ${HEADING_FONT}`}
                  >
                    {draft?.title || draft?.companyName || "Your Company"}
                  </h1>
                  <p className="text-lg text-stone-400 leading-relaxed mb-10">
                    {draft?.subTitle || ""}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      type="button"
                      onClick={() => t.goToSection("products")}
                      className={`inline-flex items-center gap-2 bg-amber-400 text-emerald-950 font-semibold px-7 py-3.5 rounded hover:bg-amber-300 transition-colors text-sm ${BODY_FONT}`}
                    >
                      Explore Services
                      <img src={exploreArrow} alt="" className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => t.goToSection("contact")}
                      className="inline-flex items-center gap-2 border border-emerald-700 text-stone-300 font-medium px-7 py-3.5 rounded hover:border-amber-400 hover:text-amber-400 transition-colors text-sm"
                    >
                      Contact Us
                    </button>
                  </div>
                </div>
                <div className="relative hidden md:block">
                  <div className="rounded-2xl overflow-hidden h-[420px] bg-[#004f3b]">
                    <img
                      src={t.resolvedHomeHeroImage || professionalTeamFallback}
                      alt=""
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#002c22]/50 to-transparent rounded-2xl" />
                    {t.showHeroCarousel ? (
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-emerald-950/80 px-4 py-2 rounded-b-2xl backdrop-blur-sm">
                        <button
                          type="button"
                          onClick={t.handleHeroPrev}
                          className="text-xs font-medium text-stone-400 hover:text-amber-400 transition-colors"
                        >
                          ← Prev
                        </button>
                        <span className="text-xs text-stone-500">
                          {t.heroIndex + 1} / {t.heroImages.length}
                        </span>
                        <button
                          type="button"
                          onClick={t.handleHeroNext}
                          className="text-xs font-medium text-stone-400 hover:text-amber-400 transition-colors"
                        >
                          Next →
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Stats — only if we have some from the draft */}
          {draft?.stats &&
          Array.isArray(draft.stats) &&
          draft.stats.length > 0 ? (
            <div className="bg-amber-400 py-14 px-6">
              <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
                {draft.stats.map((s: any, i: number) => (
                  <div key={i} className="text-center">
                    <p
                      className={`text-4xl font-bold text-emerald-950 mb-1 ${HEADING_FONT}`}
                    >
                      {s.value || s.label || ""}
                    </p>
                    <p className="text-emerald-800 text-xs font-semibold uppercase tracking-widest">
                      {s.label || ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {t.aboutPageEnabled &&
          t.isSectionEnabled("home_about") &&
          t.aboutIntroBlocks.length > 0 ? (
            <section className="py-20 px-6 bg-[#004f3b]/20">
              <div className="max-w-7xl mx-auto">
                <LinedHeading title={String(draft?.aboutTitle || "").trim() || "About Our Vision"} className="justify-center" />
                <div className="mt-8 max-w-2xl mx-auto space-y-4 text-center">
                  {t.aboutIntroBlocks.map(
                    (paragraph: string, index: number) => (
                      <p
                        key={index}
                        className="text-stone-400 text-base leading-8"
                      >
                        {paragraph}
                      </p>
                    ),
                  )}
                  <button
                    type="button"
                    onClick={() => t.goToSection("about")}
                    className="text-sm font-semibold text-amber-400 underline underline-offset-4"
                  >
                    Learn more about us →
                  </button>
                </div>
              </div>
            </section>
          ) : null}
          {/* Services / Products preview */}
          {t.productsPageEnabled &&
          t.isSectionEnabled("home_products") &&
          t.productPages.length ? (
            <section className="py-24 px-6 bg-[#004f3b]/20">
              <div className="max-w-7xl mx-auto">
                <LinedHeading title={String(draft?.productTitle || "").trim() || "Our Services"} className="justify-center" />
                <div className="mt-10">
                  <FigmaProductGrid
                    products={t.productPages.slice(0, 6)}
                    onSelect={t.handleProductCardAction}
                  />
                </div>
                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={() => t.goToSection("products")}
                    className="text-sm font-medium text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors"
                  >
                    View all products →
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {Array.isArray(draft?.inclusions) &&
          draft.inclusions.length > 0 &&
          t.isSectionEnabled("home_inclusions") ? (
            <FigmaInclusions inclusions={draft.inclusions} />
          ) : null}
          {/* Home gallery */}
          {t.galleryPageEnabled && t.isSectionEnabled("home_gallery") ? (
            <section className="py-24 px-6 bg-[#004f3b]/20">
              <div className="max-w-7xl mx-auto">
                <div className="mb-12">
                  <LinedHeading title={draft?.galleryTitle || "Gallery"} className="justify-center" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {t.homeGalleryItems.map((src: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => t.openGalleryViewer(idx)}
                      className="group relative rounded-xl overflow-hidden bg-emerald-900 aspect-[4/3]"
                    >
                      <img
                        src={src}
                        alt={`Gallery ${idx + 1}`}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                      />
                    </button>
                  ))}
                </div>
                {t.galleryItems.length > 6 ? (
                  <div className="mt-9 flex justify-center">
                    <button
                      type="button"
                      onClick={() => t.goToSection("gallery")}
                      className="rounded-full border border-emerald-700 px-6 py-2.5 text-[13px] font-semibold text-stone-200 hover:border-amber-400 hover:text-amber-400 transition-colors"
                    >
                      Show more →
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* Testimonials */}
          {t.isSectionEnabled("home_testimonials") && t.testimonials.length ? (
            <section className="py-24 px-6 bg-[#004f3b]/20">
              <div className="max-w-7xl mx-auto">
                <LinedHeading title={draft?.testimonialTitle || "Testimonials"} className="justify-center" />
                <div className="mt-10">
                  <TestimonialsCarousel testimonials={t.testimonials} />
                </div>
                {t.showWriteReview ? (
                  <div className="mt-8 text-center">
                    <button
                      type="button"
                      onClick={t.openReviewModal}
                      className="text-sm font-medium text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors"
                    >
                      Write a review →
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {t.contactPageEnabled && t.isSectionEnabled("home_contact") ? (
            <section className="py-20 px-6 bg-[#004f3b]/20">
              <div className="max-w-7xl mx-auto">
                <LinedHeading title={draft?.contactTitle || "Contact"} className="justify-center" />
                <div className="mt-10 grid md:grid-cols-[0.6fr_0.4fr] gap-8 items-stretch">
                {draft?.mapUrl ? (
                  <iframe
                    title="Map"
                    src={draft.mapUrl}
                    loading="lazy"
                    className="h-[380px] w-full rounded-2xl border-0"
                  />
                ) : (
                  <div className="min-h-[300px] rounded-2xl bg-emerald-900/40 border border-emerald-800/50" />
                )}
                <div className="rounded-2xl border border-emerald-800/50 bg-emerald-900/40 p-8 flex flex-col">
                  {draft?.companyLogo ? (
                    <img
                      src={draft.companyLogo}
                      alt={draft.companyName || "Company"}
                      className="mb-12 h-12 w-auto self-center object-contain"
                    />
                  ) : (
                    <span
                      className={`mb-5 flex h-12 w-12 items-center justify-center self-start rounded-lg bg-amber-400 text-lg font-bold text-emerald-950 ${HEADING_FONT}`}
                    >
                      {(draft?.companyName || "Y").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="space-y-4 text-lg text-stone-300">
                    {t.contactEmail ? (
                      <a
                        className="flex items-center gap-4 hover:text-amber-400"
                        href={`mailto:${t.contactEmail}`}
                      >
                        <CONTACT_ICON_CIRCLE>
                          <ContactMailIcon />
                        </CONTACT_ICON_CIRCLE>
                        <span>{t.contactEmail}</span>
                      </a>
                    ) : null}
                    {t.contactPhone ? (
                      <a
                        className="flex items-center gap-4 hover:text-amber-400"
                        href={`tel:${t.contactPhone.replace(/[^\d+]/g, "")}`}
                      >
                        <CONTACT_ICON_CIRCLE>
                          <ContactPhoneIcon />
                        </CONTACT_ICON_CIRCLE>
                        <span>{t.contactPhone}</span>
                      </a>
                    ) : null}
                    {t.contactAddress ? (
                      <div className="flex items-start gap-4">
                        <CONTACT_ICON_CIRCLE>
                          <ContactMapIcon />
                        </CONTACT_ICON_CIRCLE>
                        <span className="whitespace-pre-line">{t.contactAddress}</span>
                      </div>
                    ) : null}
                  </div>
                  {/* <button
                    type="button"
                    onClick={() => t.goToSection("contact")}
                    className="mt-8 self-start rounded bg-amber-400 px-6 py-3 text-sm font-semibold text-emerald-950"
                  >
                    Contact Us
                  </button> */}
                </div>
                </div>
              </div>
            </section>
          ) : null}

          {draft?.logoCarousel?.enabled &&
          Array.isArray(draft.logoCarousel.logos) &&
          draft.logoCarousel.logos.length > 0 ? (
            <FigmaLogoCarousel
              logos={draft.logoCarousel.logos
                .map((item: any) =>
                  typeof item === "string"
                    ? item
                    : item?.url || item?.preview || "",
                )
                .filter(Boolean)}
              title={draft.logoCarousel.title || undefined}
            />
          ) : null}
          {/* CTA */}
          {/* <section className="py-24 px-6">
            <div className="max-w-7xl mx-auto">
              <div className="relative min-h-[331px] rounded-2xl bg-[#006045]/30 border border-[#007a55]/50 overflow-hidden px-8 py-16 text-center flex items-center justify-center">
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, #ffb900 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />
                <div className="relative">
                  <h2
                    className={`text-4xl md:text-5xl font-semibold mb-4 text-stone-100 ${HEADING_FONT}`}
                  >
                    Ready to grow?
                  </h2>
                  <p className="text-stone-400 mb-10 max-w-lg mx-auto">
                    Let us show you what a focused, experienced team can do for
                    your business in 90 days.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <button
                      type="button"
                      onClick={() => t.goToSection("contact")}
                      className="bg-amber-400 text-emerald-950 font-semibold px-8 py-3.5 rounded hover:bg-amber-300 transition-colors text-sm"
                    >
                      Start the Conversation
                    </button>
                    <button
                      type="button"
                      onClick={() => t.goToSection("about")}
                      className="border border-emerald-600 text-stone-300 font-medium px-8 py-3.5 rounded hover:border-stone-400 transition-colors text-sm"
                    >
                      Learn About Us
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section> */}
        </>
      ) : null}

      {/* ─── ABOUT ─── */}
      {section === "about" && t.aboutPageEnabled ? (
        <>
          <section className="pt-20 pb-20 px-6 bg-[#004f3b]/20">
            <div className="max-w-7xl mx-auto text-center">
              <LinedHeading title={String(draft?.aboutTitle || "").trim() || "About Our Vision"} className="justify-center" />
              {t.aboutIntroBlocks.length > 0 ? (
                <p className="text-stone-400 text-lg max-w-2xl mx-auto leading-relaxed">
                  {t.aboutIntroBlocks[0]}
                </p>
              ) : null}
            </div>
            {t.aboutNarrativeBlocks.length ? (
              <div className="mt-14 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                {t.aboutNarrativeBlocks.map((item: any, i: number) => (
                  <div
                    key={item.title}
                    className="flex gap-5 bg-emerald-900/40 border border-emerald-800/50 rounded-xl p-7"
                  >
                    <span
                      className={`text-amber-400 font-bold text-xl shrink-0 ${HEADING_FONT}`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3
                        className={`font-semibold text-lg mb-2 text-stone-100 ${HEADING_FONT}`}
                      >
                        {item.title}
                      </h3>
                      <p className="text-stone-400 text-sm leading-relaxed whitespace-pre-line">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {t.founders.length ? (
            <section className="py-24 px-6 bg-[#004f3b]/20">
              <div className="max-w-7xl mx-auto">
                <LinedHeading title="Our Founders" />
                {/* <h2
                  className={`text-4xl font-semibold mb-12 text-stone-100 ${HEADING_FONT}`}
                >
                  Leadership team
                </h2> */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {t.founders.map((founder: any, idx: number) => (
                    <div key={idx} className="group">
                      <div className="rounded-xl overflow-hidden h-64 bg-emerald-900 mb-4">
                        {founder?.image ? (
                          <img
                            src={
                              typeof founder.image === "string"
                                ? founder.image
                                : founder.image?.url
                            }
                            alt={founder?.name || ""}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                          />
                        ) : null}
                      </div>
                      <p
                        className={`font-semibold text-stone-100 ${HEADING_FONT}`}
                      >
                        {founder?.name}
                      </p>
                      <p className="text-stone-500 text-sm">{founder?.role}</p>
                      {founder?.bio ? (
                        <p className="text-stone-400 text-xs mt-1 leading-relaxed">
                          {founder.bio}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {t.aboutPageImageCards.length > 0 ? (
            <section className="py-24 px-6 bg-[#004f3b]/20">
              <div className="max-w-7xl mx-auto">
                <LinedHeading title={draft?.aboutPageTeamHeading || "Our Team"} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {t.aboutPageImageCards
                    .map((card: any, idx: number) => (
                      <div key={idx}>
                        {card?.image ? (
                          <img
                            src={card.image}
                            alt={card?.title || ""}
                            className="aspect-[4/3] w-full object-cover rounded-xl"
                          />
                        ) : (
                          <div className="aspect-[4/3] w-full bg-emerald-900/40 rounded-xl" />
                        )}
                        {card?.title ? (
                          <p
                            className={`mt-3 font-semibold text-stone-100 ${HEADING_FONT}`}
                          >
                            {card.title}
                          </p>
                        ) : null}
                        {card?.description ? (
                          <p className="mt-1 text-stone-400 text-sm">
                            {card.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {/* ─── PRODUCTS / SERVICES ─── */}
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
                <section className="pt-20 pb-24 px-6 bg-[#004f3b]/20">
                  <div className="max-w-7xl mx-auto grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-14">
                    <div className="w-full">
                      {image ? (
                        <img
                          src={typeof image === "string" ? image : image?.url}
                          alt={title}
                          className="h-[300px] w-full rounded-2xl object-cover md:h-full"
                        />
                      ) : (
                        <div className="h-[300px] w-full rounded-2xl bg-emerald-900 md:h-full" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="shrink-0">
                        <LinedHeading title={page?.name || "Service"} className="justify-center md:justify-start" />
                        <h1 className={`text-3xl md:text-4xl font-semibold text-stone-100 mb-4 ${HEADING_FONT} text-center md:text-left`}>
                          {title}
                        </h1>
                        {price ? (
                          <p className="text-stone-400 text-lg mb-4 text-center md:text-left">{price}</p>
                        ) : null}
                      </div>
                      <div className="flex-1 overflow-y-auto py-2 pr-1 md:max-h-[220px]">
                        {description ? (
                          <ul className="space-y-2">
                            {description
                              .split(/\n|(?<=\.)\s+/)
                              .map((s: string) => s.trim())
                              .filter(Boolean)
                              .map((point: string, i: number) => (
                                <li
                                  key={`desc-bullet-${i}`}
                                  className="flex items-start gap-2 text-sm leading-relaxed text-stone-400"
                                >
                                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                  <span>{point}</span>
                                </li>
                              ))}
                          </ul>
                        ) : null}
                      </div>
                      <div className="shrink-0 min-h-[380px]">
                        {t.leadSubmitted ? (
                          <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-2xl border border-emerald-800/50 bg-emerald-900/30 p-8 text-center">
                            <div className="w-14 h-14 rounded-full bg-amber-400 flex items-center justify-center text-emerald-950 text-2xl mb-4 mx-auto">
                              ✓
                            </div>
                            <h3 className={`text-xl font-semibold text-stone-100 mb-2 ${HEADING_FONT}`}>
                              Enquiry submitted!
                            </h3>
                            <p className="text-stone-400 text-sm">
                              We&apos;ll get back to you shortly.
                            </p>
                          </div>
                        ) : (
                          <form
                            onSubmit={t.submitLeadForm}
                            className="bg-emerald-900/30 border border-emerald-800/50 rounded-2xl p-8 space-y-4"
                          >
                            <LinedHeading title="Enquire now" />
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {t
                                .getLeadFieldsForProduct(
                                  t.selectedLeadProduct?.slug ||
                                    t.selectedLeadProduct?.name ||
                                    "",
                                )
                                .map((field: any) => (
                                  <div key={field.key}>
                                    <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                                      {field.label}
                                    </label>
                                    <input
                                      type={field.type === "date" ? "date" : field.type}
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
                                  </div>
                                ))}
                            </div>
                            {t.leadSubmitError ? (
                              <p className="text-xs text-red-400">{t.leadSubmitError}</p>
                            ) : null}
                            <button
                              type="submit"
                              disabled={t.leadSubmitPending}
                              className="w-full bg-amber-400 text-emerald-950 font-semibold py-3.5 rounded-lg hover:bg-amber-300 transition-colors text-sm disabled:opacity-50"
                            >
                              {t.leadSubmitPending ? "Submitting…" : "Submit Enquiry"}
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
                  <FigmaInclusions
                    inclusions={page.inclusions}
                    title={`${String(page?.heading || page?.name || "Service").trim()} Inclusions`}
                  />
                ) : null}
                {page?.faqEnabled !== false ? (
                  <FigmaFaqList faqs={Array.isArray(draft?.faqs) ? draft.faqs : []} />
                ) : null}
                </>
              );
            })()
          ) : t.selectedProductPage ? (
            <>
              {(t.selectedProductPage as any)?.heroEnabled !== false ? (
                <section className="relative h-[50svh] min-h-[320px] overflow-hidden md:h-[88vh] md:min-h-[400px] bg-[#002c22]">
                  {t.selectedProductHeroImage ? (
                    <img
                      src={t.selectedProductHeroImage}
                      alt={t.selectedProductPage?.name || "Service"}
                      className="absolute inset-0 h-full w-full object-cover opacity-100"
                    />
                  ) : (
                    <>
                      {/* No hero image set for this service — fall back to
                          the same dot-grid + glow treatment the home hero
                          uses, so the banner still reads as designed rather
                          than a blank/empty strip. */}
                      <div
                        className="absolute inset-0 opacity-[0.06]"
                        style={{
                          backgroundImage:
                            "linear-gradient(#ffb900 1px, transparent 1px), linear-gradient(90deg, #ffb900 1px, transparent 1px)",
                          backgroundSize: "60px 60px",
                        }}
                      />
                      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#007a55]/25 blur-[60px] pointer-events-none" />
                    </>
                  )}
                  {/* <div className="absolute inset-0 bg-gradient-to-t from-[#002c22] to-[#002c22]/40" /> */}
                  <div className="absolute inset-0 flex flex-col items-center justify-end gap-2 px-6 pb-10 text-center md:pb-14">
                    <h1 className={`text-3xl md:text-5xl font-semibold text-stone-100 ${HEADING_FONT}`}>
                      {(t.selectedProductPage as any)?.heroHeading ||
                        (t.selectedProductPage as any)?.name}
                    </h1>
                    {(t.selectedProductPage as any)?.heroSubHeading ? (
                      <p className="mx-auto mt-1 max-w-xl text-stone-400 text-base">
                        {(t.selectedProductPage as any).heroSubHeading}
                      </p>
                    ) : null}
                    {(t.selectedProductPage as any)?.heroButtonText ? (
                      <button
                        type="button"
                        onClick={() => t.goToSection("contact")}
                        className="mt-2 inline-flex items-center gap-2 bg-amber-400 text-emerald-950 font-semibold px-7 py-3.5 rounded hover:bg-amber-300 transition-colors text-sm"
                      >
                        {(t.selectedProductPage as any).heroButtonText}
                      </button>
                    ) : null}
                  </div>
                  {(t.selectedProductPage as any)?.heroMode === "carousel" &&
                  t.selectedProductHeroImages.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={t.handleProductHeroPrev}
                        className="absolute left-5 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/50 px-4 py-2 text-2xl text-white md:block"
                        aria-label="Previous image"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={t.handleProductHeroNext}
                        className="absolute right-5 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/50 px-4 py-2 text-2xl text-white md:block"
                        aria-label="Next image"
                      >
                        ›
                      </button>
                    </>
                  ) : null}
                </section>
              ) : null}
              <section className="pt-16 pb-24 px-6 bg-[#004f3b]/20">
                <div className="max-w-7xl mx-auto">
                  <LinedHeading
                    title={`${String((t.selectedProductPage as any)?.heading || t.selectedProductPage?.name || "").trim() || "Our"} Services`}
                    className="justify-center"
                  />
                  <FigmaProductGrid
                    products={
                      t.selectedProductContentItems.length
                        ? t.selectedProductContentItems
                        : [t.selectedProductPage]
                    }
                    onSelect={(product: any) =>
                      t.goToProductItem(
                        t.selectedProductPage?.slug ||
                          t.selectedProductPage?.name ||
                          "",
                        product?.title ||
                          product?.name ||
                          product?.heading ||
                          "",
                      )
                    }
                  />
                </div>
              </section>
              {Array.isArray((t.selectedProductPage as any)?.inclusions) &&
              (t.selectedProductPage as any).inclusions.length > 0 &&
              (t.selectedProductPage as any)?.inclusionsEnabled !== false ? (
                <FigmaInclusions
                  inclusions={(t.selectedProductPage as any).inclusions}
                  title={`${String((t.selectedProductPage as any)?.heading || (t.selectedProductPage as any)?.name || "Service").trim()} Inclusions`}
                />
              ) : null}
              {(t.selectedProductPage as any)?.faqEnabled !== false ? (
                <FigmaFaqList
                  faqs={Array.isArray(draft?.faqs) ? draft.faqs : []}
                />
              ) : null}
            </>
          ) : (
            <section className="pt-20 pb-16 px-6 bg-[#004f3b]/20">
              <div className="max-w-7xl mx-auto text-center">
                <LinedHeading title={String(draft?.productTitle || "").trim() || "Our Services"} className="justify-center" />
                {/* <h1
                  className={`text-5xl md:text-6xl font-semibold leading-tight max-w-3xl mx-auto text-center text-stone-100 mb-6 ${HEADING_FONT}`}
                >
                  {String(draft?.productTitle || "").trim() ||
                    "Everything you need to build and scale."}
                </h1> */}
              </div>
              <div className="py-10 px-6 max-w-7xl mx-auto">
                <FigmaProductGrid
                  products={t.productPages}
                  onSelect={t.handleProductCardAction}
                />
              </div>
            </section>
          )}
        </>
      ) : null}

      {/* ─── GALLERY ─── */}
      {section === "gallery" && t.galleryPageEnabled ? (
        <>
          <section className="pt-20 pb-16 px-6 bg-[#004f3b]/20">
            <div className="max-w-7xl mx-auto text-center">
              <LinedHeading title="Gallery" className="justify-center" />
              {/* <h1
                className={`text-5xl md:text-6xl font-semibold leading-tight max-w-2xl mx-auto text-stone-100 mb-4 ${HEADING_FONT}`}
              >
                Inside our world.
              </h1>
              <p className="text-stone-400 text-lg">
                A look at our events, team moments, and client work.
              </p> */}
            </div>
          </section>
          <section className="px-6 pb-24 bg-[#004f3b]/20">
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {t.galleryItems.map((src: string, idx: number) => (
                <div
                  key={idx}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-[#004f3b] cursor-pointer"
                  onClick={() => t.openGalleryViewer(idx)}
                >
                  <img
                    src={src}
                    alt={`Gallery ${idx + 1}`}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {/* ─── TESTIMONIALS ─── */}
      {section === "testimonials" ? (
        <section className="pt-20 pb-24 px-6 bg-[#004f3b]/20">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center gap-4 text-center mb-14">
              <div>
                <LinedHeading title={draft?.testimonialTitle || "Testimonials"} className="justify-center" />
                <h2
                  className={`text-4xl md:text-5xl font-semibold leading-tight text-stone-100 ${HEADING_FONT}`}
                >
                  What our clients say
                </h2>
              </div>
              {t.showWriteReview ? (
                <button
                  type="button"
                  onClick={t.openReviewModal}
                  className="text-sm font-medium text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors"
                >
                  Write a review →
                </button>
              ) : null}
            </div>
            <TestimonialsCarousel testimonials={t.testimonials} />
          </div>
        </section>
      ) : null}

      {/* ─── PARTNER ─── */}
      {section === "partner" && t.partnerPageEnabled ? (
        <section className="pt-20 pb-24 px-6 bg-[#004f3b]/20">
          <div className="max-w-7xl mx-auto">
            <LinedHeading title={t.partnerPageHeading || "Become A Partner"} className="justify-center" />
            {/* <h1
              className={`text-5xl md:text-6xl font-semibold leading-tight max-w-3xl mx-auto text-center text-stone-100 mb-6 ${HEADING_FONT}`}
            >
              {t.partnerPageHeading || "Become a partner"}
            </h1> */}
            <div className="grid md:grid-cols-2 gap-14 mt-12 text-left">
              <div className="text-stone-400 text-base leading-relaxed">
                {t.partnerPageContent ? (
                  t.partnerPageContent
                    .split("\n")
                    .map((p: string, i: number) => (
                      <p key={i} className="mb-4 last:mb-0">
                        {p}
                      </p>
                    ))
                ) : (
                  <p className="text-stone-500">Partner content coming soon.</p>
                )}
              </div>
              <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-2xl p-8">
                <LinedHeading title={t.partnerFormTitle || `Partner with ${draft?.companyName || "us"}`} />
                <div className="mt-4 space-y-4">
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
                    className="w-full bg-amber-400 text-emerald-950 font-semibold py-3.5 rounded-lg hover:bg-amber-300 transition-colors text-sm disabled:opacity-50"
                  >
                    {t.partnerSubmitPending ? "Submitting…" : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ─── CAREERS ─── */}
      {section === "careers" && t.careersPageEnabled ? (
        <section className="pt-20 pb-24 px-6 bg-[#004f3b]/20">
          <div className="max-w-7xl mx-auto">
            {!t.careersApplyJob ? (
              <>
                <LinedHeading title={draft?.companyName ? `Join Our Team - ${draft.companyName}` : "Join Our Team - Company Name"} className="justify-center" />
                {/* <h1
                  className={`text-5xl md:text-6xl font-semibold leading-tight max-w-3xl mx-auto text-center text-stone-100 mb-6 ${HEADING_FONT}`}
                >
                  {draft?.companyName
                    ? `Join ${draft.companyName}`
                    : "Join our team"}
                </h1> */}
                <div className="text-stone-400 text-lg max-w-2xl mx-auto text-center leading-relaxed mb-12">
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
                  <p className="text-stone-500">Loading open roles…</p>
                ) : t.careersJobs.length === 0 ? (
                  <p className="text-stone-500">
                    No job openings at the moment — check back later.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {t.careersDepartmentSections.map((dept: any) => {
                      const isOpen =
                        t.careersOpenDepartment === dept.department;
                      return (
                        <div
                          key={dept.department}
                          className="bg-emerald-900/40 border border-emerald-800/50 rounded-xl overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              t.setCareersOpenDepartment(
                                isOpen ? "" : dept.department,
                              )
                            }
                            className="w-full flex items-center justify-between px-7 py-5 text-left"
                          >
                            <span
                              className={`font-semibold text-lg text-stone-100 ${HEADING_FONT}`}
                            >
                              {dept.ordinal}. {dept.department}
                            </span>
                            <span className="text-amber-400">
                              {isOpen ? "−" : "+"}
                            </span>
                          </button>
                          {isOpen ? (
                            <div className="px-7 pb-5 space-y-1">
                              {dept.jobs.map((job: any, idx: number) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => t.openCareersJob(job)}
                                  className="w-full flex items-center justify-between border-t border-emerald-800/40 py-4 text-left hover:text-amber-400 transition-colors"
                                >
                                  <div>
                                    <p className="font-medium text-stone-100 text-sm">
                                      {job?.title ||
                                        job?.designation ||
                                        job?.name}
                                    </p>
                                    <p className="text-stone-500 text-xs mt-0.5">
                                      {job?.location || ""}
                                    </p>
                                  </div>
                                  <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">
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
                      className="mt-8 inline-flex items-center gap-2 border border-emerald-700 text-stone-300 font-medium px-7 py-3.5 rounded hover:border-amber-400 hover:text-amber-400 transition-colors text-sm"
                    >
                      General Application
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={t.closeCareersJob}
                  className="text-sm font-medium text-amber-400 hover:text-amber-300 underline underline-offset-4 mb-6"
                >
                  ← Back to Careers
                </button>
                <h1
                  className={`text-4xl md:text-5xl font-semibold text-stone-100 mb-6 ${HEADING_FONT}`}
                >
                  {t.careersDirectApply
                    ? "General Application"
                    : t.careersApplyJob?.title || t.careersApplyJob?.name}
                </h1>

                {!t.careersDirectApply ? (
                  <div className="flex gap-6 border-b border-emerald-800/50 mb-8">
                    <button
                      type="button"
                      onClick={() => t.setCareersDetailTab("description")}
                      className={`pb-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
                        t.careersDetailTab === "description"
                          ? "text-amber-400 border-b-2 border-amber-400"
                          : "text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      Description
                    </button>
                    <button
                      type="button"
                      onClick={() => t.setCareersDetailTab("apply")}
                      className={`pb-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
                        t.careersDetailTab === "apply"
                          ? "text-amber-400 border-b-2 border-amber-400"
                          : "text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      Apply
                    </button>
                  </div>
                ) : null}

                {t.careersDetailTab === "description" &&
                !t.careersDirectApply ? (
                  <div className="max-w-2xl space-y-6 text-stone-400 text-base leading-relaxed">
                    {t.careersApplyJob?.aboutTheJob ? (
                      <div>
                        <p className="font-semibold text-stone-100 mb-1">
                          About this role
                        </p>
                        <p className="whitespace-pre-wrap">
                          {t.careersApplyJob.aboutTheJob}
                        </p>
                      </div>
                    ) : null}
                    {t.careersApplyJob?.keyResponsibilities ? (
                      <div>
                        <p className="font-semibold text-stone-100 mb-1">
                          Key responsibilities
                        </p>
                        <p className="whitespace-pre-wrap">
                          {t.careersApplyJob.keyResponsibilities}
                        </p>
                      </div>
                    ) : null}
                    {t.careersApplyJob?.requirements ? (
                      <div>
                        <p className="font-semibold text-stone-100 mb-1">
                          Requirements
                        </p>
                        <p className="whitespace-pre-wrap">
                          {t.careersApplyJob.requirements}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {(t.careersDetailTab === "apply" || t.careersDirectApply) && (
                  <div className="max-w-2xl">
                    {t.careersApplySubmitted ? (
                      <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-2xl p-8 text-center">
                        <div className="w-14 h-14 rounded-full bg-amber-400 flex items-center justify-center text-emerald-950 text-2xl mb-4 mx-auto">
                          ✓
                        </div>
                        <h3
                          className={`text-xl font-semibold text-stone-100 mb-2 ${HEADING_FONT}`}
                        >
                          Application submitted!
                        </h3>
                        <p className="text-stone-400 text-sm">
                          We&apos;ll review it and get back to you shortly.
                        </p>
                      </div>
                    ) : (
                      <form
                        onSubmit={t.submitCareersApplication}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <div>
                          <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={t.careersApplyForm.fullName}
                            onChange={(e) =>
                              t.setCareersApplyForm((p: any) => ({
                                ...p,
                                fullName: e.target.value,
                              }))
                            }
                            className={INPUT}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                            Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={t.careersApplyForm.email}
                            onChange={(e) =>
                              t.setCareersApplyForm((p: any) => ({
                                ...p,
                                email: e.target.value,
                              }))
                            }
                            className={INPUT}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                            Date of Birth *
                          </label>
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
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                            Country *
                          </label>
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
                            <option value="">Select country</option>
                            {t.applyCountryList.map((c: any) => (
                              <option key={c.isoCode} value={c.isoCode}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                            State *
                          </label>
                          <select
                            required
                            disabled={!t.careersApplyForm.country}
                            value={t.careersApplyForm.state}
                            onChange={(e) =>
                              t.setCareersApplyForm((p: any) => ({
                                ...p,
                                state: e.target.value,
                              }))
                            }
                            className={`${INPUT} disabled:opacity-50`}
                          >
                            <option value="">Select state</option>
                            {t.applyStateList.map((s: any) => (
                              <option key={s.isoCode} value={s.isoCode}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                            City *
                          </label>
                          <select
                            required
                            disabled={!t.careersApplyForm.state}
                            value={t.careersApplyForm.city}
                            onChange={(e) =>
                              t.setCareersApplyForm((p: any) => ({
                                ...p,
                                city: e.target.value,
                              }))
                            }
                            className={`${INPUT} disabled:opacity-50`}
                          >
                            <option value="">Select city</option>
                            {t.applyCityList.map((c: any) => (
                              <option key={c.name} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                            Phone *
                          </label>
                          <div className="flex items-stretch">
                            <span className="flex shrink-0 items-center border border-r-0 border-emerald-800 bg-emerald-950/60 px-3 text-sm text-stone-500 rounded-l-lg">
                              {t.careersApplyDialCode || "+ --"}
                            </span>
                            <input
                              type="tel"
                              required
                              value={t.careersApplyForm.phone}
                              onChange={(e) =>
                                t.setCareersApplyForm((p: any) => ({
                                  ...p,
                                  phone: e.target.value.replace(
                                    /[^\d\s-]/g,
                                    "",
                                  ),
                                }))
                              }
                              className="flex-1 bg-emerald-950/60 border border-emerald-800 rounded-r-lg px-4 py-3 text-stone-100 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="flex cursor-pointer items-center justify-between border border-dashed border-emerald-700 px-4 py-3 text-sm rounded-lg hover:border-amber-400 transition-colors">
                            <span className="text-stone-300">
                              {t.careersResumeFile
                                ? t.careersResumeFile.name
                                : "Upload resume / CV *"}
                            </span>
                            <span className="border border-emerald-700 px-3 py-1 text-xs uppercase tracking-wider text-stone-400 rounded">
                              Choose file
                            </span>
                            <input
                              type="file"
                              required
                              accept=".pdf,.doc,.docx"
                              className="hidden"
                              onChange={(e) =>
                                t.setCareersResumeFile(
                                  e.target.files?.[0] || null,
                                )
                              }
                            />
                          </label>
                        </div>
                        {t.careersFormFields.map((field: any) =>
                          field.type === "textarea" ? (
                            <div key={field.id} className="md:col-span-2">
                              <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                                {field.label}
                                {field.required ? " *" : ""}
                              </label>
                              <textarea
                                rows={3}
                                required={field.required}
                                value={t.careersCustomValues[field.id] || ""}
                                onChange={(e) =>
                                  t.setCareersCustomValues((p: any) => ({
                                    ...p,
                                    [field.id]: e.target.value,
                                  }))
                                }
                                className={INPUT}
                              />
                            </div>
                          ) : (
                            <div
                              key={field.id}
                              className={field.fullWidth ? "md:col-span-2" : ""}
                            >
                              <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                                {field.label}
                                {field.required ? " *" : ""}
                              </label>
                              <input
                                type="text"
                                required={field.required}
                                value={t.careersCustomValues[field.id] || ""}
                                onChange={(e) =>
                                  t.setCareersCustomValues((p: any) => ({
                                    ...p,
                                    [field.id]: e.target.value,
                                  }))
                                }
                                className={INPUT}
                              />
                            </div>
                          ),
                        )}
                        {t.careersApplyError ? (
                          <p className="md:col-span-2 text-xs text-red-400">
                            {t.careersApplyError}
                          </p>
                        ) : null}
                        <div className="md:col-span-2">
                          <button
                            type="submit"
                            disabled={t.careersApplySubmitting}
                            className="w-full bg-amber-400 text-emerald-950 font-semibold py-3.5 rounded-lg hover:bg-amber-300 transition-colors text-sm disabled:opacity-50"
                          >
                            {t.careersApplySubmitting
                              ? "Submitting…"
                              : "Submit Application"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* ─── CONTACT ─── */}
      {section === "contact" && t.contactPageEnabled ? (
        <section className="pt-20 pb-24 px-6 bg-[#004f3b]/20">
          <div className="max-w-7xl mx-auto text-center mb-12">
            <LinedHeading title={draft?.contactTitle || "Contact"} className="justify-center" />
            {/* <h1
              className={`text-5xl md:text-6xl font-semibold leading-tight text-stone-100 ${HEADING_FONT}`}
            >
              {draft?.contactTitle || "Let us start a conversation."}
            </h1> */}
          </div>
          <div className="max-w-7xl mx-auto grid grid-cols-1 gap-8 md:grid-cols-[0.6fr_0.4fr]">
            {draft?.mapUrl ? (
              <iframe
                title="map"
                src={draft.mapUrl}
                loading="lazy"
                className="h-[320px] w-full rounded-2xl border-0 md:h-[440px]"
              />
            ) : (
              <div className="h-[320px] w-full rounded-2xl border border-emerald-800/50 bg-emerald-900/40 md:h-[440px]" />
            )}
            <div className="flex flex-col gap-6 rounded-2xl border border-emerald-800/50 bg-emerald-900/40 p-8">
              {draft?.companyLogo ? (
                <img
                  src={draft.companyLogo}
                  alt={draft.companyName || "Company"}
                  className="mb-7 h-12 w-auto self-center object-contain"
                />
              ) : (
                <span
                  className={`mb-1 flex h-12 w-12 items-center justify-center self-start rounded-lg bg-amber-400 text-lg font-bold text-emerald-950 ${HEADING_FONT}`}
                >
                  {(draft?.companyName || "Y").charAt(0).toUpperCase()}
                </span>
              )}
              {t.contactEmail ? (
                <a
                  href={`mailto:${t.contactEmail}`}
                  className="flex items-center gap-4 text-stone-300 hover:text-amber-400"
                >
                  <CONTACT_ICON_CIRCLE>
                    <ContactMailIcon />
                  </CONTACT_ICON_CIRCLE>
                  <span>{t.contactEmail}</span>
                </a>
              ) : null}
              {t.contactPhone ? (
                <a
                  href={`tel:${t.contactPhone.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-4 text-stone-300 hover:text-amber-400"
                >
                  <CONTACT_ICON_CIRCLE>
                    <ContactPhoneIcon />
                  </CONTACT_ICON_CIRCLE>
                  <span>{t.contactPhone}</span>
                </a>
              ) : null}
              {t.contactAddress ? (
                <div className="flex items-start gap-4 text-stone-300">
                  <CONTACT_ICON_CIRCLE>
                    <ContactMapIcon />
                  </CONTACT_ICON_CIRCLE>
                  <span className="whitespace-pre-line">
                    {t.contactAddress}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {galleryViewer}

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-[#006045]/40 bg-[#002c22]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-14 text-center md:grid-cols-[1.35fr_1fr_1fr_1fr] md:text-left">
          <div className="col-span-1">
            <button
              type="button"
              onClick={() => t.goToSection("home")}
              className="flex items-center gap-2 mb-4 md:justify-start justify-center"
            >
              {draft?.companyLogo ? (
                <img
                  src={draft.companyLogo}
                  alt={draft.companyName || "Logo"}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <>
                  <span
                    className={`w-7 h-7 rounded-sm bg-amber-400 flex items-center justify-center text-emerald-950 font-bold text-sm ${HEADING_FONT}`}
                  >
                    {(draft?.companyName || "Y").charAt(0).toUpperCase()}
                  </span>
                  <span
                    className={`font-semibold text-lg tracking-tight text-stone-100 ${HEADING_FONT}`}
                  >
                    {draft?.companyName || "Your Company"}
                  </span>
                </>
              )}
            </button>
            {t.footerAddress ? (
              <p className="text-stone-500 text-sm leading-relaxed mt-1">
                {t.footerAddress}
              </p>
            ) : null}
            {t.footerSocialLinks.length ? (
              <div className="flex gap-4 mt-4 md:justify-start justify-center">
                {t.footerSocialLinks.map((social: any) => (
                  <a
                    key={social.key}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-stone-600 text-xs hover:text-amber-400 transition-colors"
                  >
                    {SOCIAL_LABEL[social.key] || social.key}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 text-stone-200">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {t.navItems.map((item: any) => (
                <li key={item.slug}>
                  <button
                    type="button"
                    onClick={() => t.goToSection(item.slug)}
                    className="text-stone-500 text-sm hover:text-stone-300 transition-colors text-left"
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {t.productsPageEnabled ? (
            <div>
              <h4 className="font-semibold text-sm mb-4 text-stone-200">
                Services
              </h4>
              <ul className="space-y-2.5">
                {t.productPages.length > 0 ? (
                  t.productPages.slice(0, 4).map((page: any, idx: number) => (
                    <li key={idx}>
                      <button
                        type="button"
                        onClick={() =>
                          t.goToProductPage(page?.slug || page?.name || "")
                        }
                        className="text-stone-500 text-sm hover:text-stone-300 transition-colors text-left"
                      >
                        {page?.name || page?.heading || "Service"}
                      </button>
                    </li>
                  ))
                ) : (
                  <li>
                    <span className="text-stone-600 text-sm">
                      No products listed
                    </span>
                  </li>
                )}
              </ul>
            </div>
          ) : null}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-stone-200">
              Contact Us
            </h4>
            <ul className="space-y-2.5 text-stone-500 text-sm">
              {t.contactEmail ? <li>{t.contactEmail}</li> : null}
              {t.contactPhone ? <li>{t.contactPhone}</li> : null}
              {t.footerAddress ? (
                <li className="whitespace-pre-line">{t.footerAddress}</li>
              ) : null}
            </ul>
          </div>
        </div>
        <div className="border-t border-emerald-800/40 pt-6 pb-6 px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-stone-600 text-xs max-w-7xl mx-auto">
          <p>{t.footerCopyrightText}</p>
        </div>
      </footer>

      {/* ─── MODALS ─── */}

      {/* Lead modal */}
      {t.selectedLeadProduct && !t.selectedDetailItem ? (
        <div
          className="fixed inset-0 z-50 bg-emerald-950/95 flex items-center justify-center px-6"
          onClick={t.closeLeadModal}
        >
          <div
            className="bg-emerald-900/80 border border-emerald-800/50 rounded-2xl max-w-md w-full shadow-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h3
                className={`text-lg font-semibold text-stone-100 ${HEADING_FONT}`}
              >
                {t.selectedLeadProduct?.name || "Enquire"}
              </h3>
              <button
                type="button"
                onClick={t.closeLeadModal}
                className="text-stone-500 hover:text-stone-100 transition-colors"
              >
                ✕
              </button>
            </div>
            {t.leadSubmitted ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-amber-400 flex items-center justify-center text-emerald-950 text-2xl mb-4 mx-auto">
                  ✓
                </div>
                <h3
                  className={`text-xl font-semibold text-stone-100 mb-2 ${HEADING_FONT}`}
                >
                  Enquiry submitted!
                </h3>
                <p className="text-stone-400 text-sm">
                  We&apos;ll be in touch shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={t.submitLeadForm} className="space-y-4">
                {[
                  { key: "fullName", label: "Full name", type: "text" },
                  { key: "mobile", label: "Mobile number", type: "text" },
                  { key: "email", label: "Email", type: "email" },
                  { key: "people", label: "No. of people", type: "number" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      required
                      value={(t.leadForm as any)[field.key]}
                      onChange={(e) =>
                        t.setLeadForm((prev: any) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className={INPUT}
                    />
                  </div>
                ))}
                {t.leadSubmitError ? (
                  <p className="text-xs text-red-400">{t.leadSubmitError}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={t.leadSubmitPending}
                  className="w-full bg-amber-400 text-emerald-950 font-semibold py-3.5 rounded-lg hover:bg-amber-300 transition-colors text-sm disabled:opacity-50"
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
          className="fixed inset-0 z-50 bg-emerald-950/95 flex items-center justify-center px-6"
          onClick={() => t.setReviewModalOpen(false)}
        >
          <div
            className="bg-emerald-900/80 border border-emerald-800/50 rounded-2xl max-w-md w-full shadow-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h3
                className={`text-lg font-semibold text-stone-100 ${HEADING_FONT}`}
              >
                Write a review
              </h3>
              <button
                type="button"
                onClick={() => t.setReviewModalOpen(false)}
                className="text-stone-500 hover:text-stone-100 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={t.submitReviewForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  Your name
                </label>
                <input
                  type="text"
                  required
                  value={t.reviewForm.reviewerName}
                  onChange={(e) =>
                    t.setReviewForm((prev: any) => ({
                      ...prev,
                      reviewerName: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  Rating
                </label>
                <select
                  value={t.reviewForm.rating}
                  onChange={(e) =>
                    t.setReviewForm((prev: any) => ({
                      ...prev,
                      rating: e.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={String(rating)}>
                      {rating} Star{rating > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  Your review
                </label>
                <textarea
                  rows={4}
                  required
                  value={t.reviewForm.review}
                  onChange={(e) =>
                    t.setReviewForm((prev: any) => ({
                      ...prev,
                      review: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              {t.reviewSubmitError ? (
                <p className="text-xs text-red-400">{t.reviewSubmitError}</p>
              ) : null}
              <button
                type="submit"
                disabled={t.reviewSubmitPending}
                className="w-full bg-amber-400 text-emerald-950 font-semibold py-3.5 rounded-lg hover:bg-amber-300 transition-colors text-sm disabled:opacity-50"
              >
                {t.reviewSubmitPending ? "Submitting…" : "Submit Review"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Success popup */}
      {t.successPopup.open ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 bg-emerald-900/90 border border-emerald-800/50 rounded-xl px-5 py-3 text-sm text-stone-100 shadow-lg backdrop-blur">
          {t.successPopup.message}
        </div>
      ) : null}
    </div>
  );
};

export default EmeraldStudioTemplate;
