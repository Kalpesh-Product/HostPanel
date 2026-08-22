import React, { useState, useEffect, useCallback } from "react";
import { useWebsiteTemplateData, resolveSectionFromSlug } from "./useWebsiteTemplateData";
import TemplateServicesDropdown from "./TemplateServicesDropdown";
import { isProductsNavItem } from "./templateNavigation";
import { getInclusionMeta } from "./inclusionIcons";

// "Warm Organic" — serif headings, blob-cropped hero imagery, rust/forest/
// sand palette, soft rounded cards, tilted "postcard" testimonials.
// Full site: home, about, products (listing + detail + lead capture),
// gallery, testimonials, partner, careers (listings + application), contact.
//
// Typography: Fraunces (headings — a warm, characterful variable serif,
// deliberately not a generic Playfair Display) + Karla (body) — real Google
// Fonts. Distinct from Minimal Swiss (Archivo/IBM Plex) and Fresh Studio
// (Manrope/Work Sans).
const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Karla:wght@400;500;600&display=swap');";
const SAND = "#F1E6D3";
const RUST = "#B85C38";
const FOREST = "#3E5641";
const CREAM = "#FBF3E7";
const BROWN = "#2B211A";
const MUTED = "#5A4A3C";
const SERIF = "font-['Fraunces',ui-serif,Georgia,serif]";
const SANS = "font-['Karla',ui-sans-serif,system-ui,sans-serif]";

const WRAP = "mx-auto w-full max-w-7xl";
const EYEBROW = `text-[13.5px] font-semibold uppercase tracking-[0.12em] ${SANS}`;
const PAGE_WRAP = `${WRAP} px-6 py-12 md:px-11 md:py-16`;
const INPUT = "w-full rounded-xl px-4 py-2.5 text-[14px] outline-none bg-white";
const inputStyle = { border: `1px solid ${BROWN}33` };

function LinedHeading({ title, className = "" }: { title: string; className?: string }) {
  return (
    <div className={`flex items-center gap-4 mb-6 ${className}`}>
      <div className="flex-1 h-px" style={{ backgroundColor: RUST }} />
      <h2 className={`text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] ${SANS}`} style={{ color: RUST }}>{title}</h2>
      <div className="flex-1 h-px" style={{ backgroundColor: RUST }} />
    </div>
  );
}

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

const CONTACT_ICON_CIRCLE = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ border: `2px solid ${RUST}`, color: RUST }}>
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

// product cards carry the description under different keys depending on
// where they came from — a home-level productDropdownPage stores it as
// homeCardSubText, a sub-product under a page stores it as description, and
// the synthetic fallback entries (no dropdown pages configured yet) use
// subText. Check all three so the card never silently drops it.
const getProductCardDescription = (product: any) =>
  String(
    product?.subText || product?.homeCardSubText || product?.description || "",
  ).trim();

const ProductGrid = ({
  products,
  onSelect,
  tints,
}: {
  products: any[];
  onSelect: (p: any) => void;
  tints: string[];
}) => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {products.map((product: any, idx: number) => {
      const description = getProductCardDescription(product);
      return (
        <article
          key={idx}
          className="flex flex-col overflow-hidden rounded-2xl transition hover:-translate-y-0.5"
          style={{
            backgroundColor: CREAM,
            boxShadow: "0 14px 28px -18px rgba(43,33,26,0.35)",
          }}
        >
          <div className="w-full overflow-hidden rounded-t-2xl" style={{ backgroundColor: `${BROWN}0D` }}>
            {product?.cardImage ? (
              <img
                src={product.cardImage}
                alt={product?.heading || product?.name}
                className="h-[200px] w-full object-cover md:h-[230px]"
              />
            ) : (
              <div
                className="h-[200px] w-full md:h-[230px]"
                style={{
                  background: `linear-gradient(140deg, ${tints[idx % tints.length]}, ${tints[idx % tints.length]}AA)`,
                }}
              />
            )}
          </div>
          <div className="flex flex-1 flex-col items-center gap-3 px-5 py-5 text-center">
            <h3 className={`text-[16px] font-normal ${SERIF}`}>
              {product?.name || product?.heading || "Service"}
            </h3>
            {description ? (
              <p
                className="line-clamp-2 text-[12.5px] leading-relaxed"
                style={{ color: MUTED }}
              >
                {description}
              </p>
            ) : null}
            <div className="mt-auto pt-1">
              <button
                type="button"
                onClick={() => onSelect(product)}
                className="rounded-full px-6 py-2 text-[11px] font-semibold uppercase tracking-widest transition hover:opacity-80"
                style={{ border: `1px solid ${RUST}`, color: RUST }}
              >
                View details
              </button>
            </div>
          </div>
        </article>
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
          <LinedHeading title={"Trusted by"} className="justify-center" />
      <div className="mt-8 overflow-hidden">
        <div className="flex items-center justify-center gap-8 md:gap-16 transition-all duration-700">
          {displayed.map((src, idx) => (
            <div
              key={`logo-${offset}-${idx}`}
              className="flex h-[60px] w-[140px] shrink-0 items-center justify-center opacity-70 md:h-[80px] md:w-[220px]"
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

const FaqList = ({
  faqs,
}: {
  faqs: Array<{ question: string; answer: string }>;
}) => {
  const [open, setOpen] = useState<number | null>(null);
  if (!faqs.length) return null;
  return (
    <section className={PAGE_WRAP}>
      <LinedHeading title="FAQs" className="justify-center" />
      <div className="mt-6 flex flex-col gap-3">
        {faqs.map((faq, idx) => {
          const isOpen = open === idx;
          const blocks = isOpen ? splitFaqAnswer(faq.answer) : [];
          const hasBullets = blocks.some((b) => b.type === "bullet");
          return (
            <div
              key={idx}
              className="overflow-hidden rounded-2xl"
              style={{ backgroundColor: CREAM }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : idx)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{ backgroundColor: RUST }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-[14px] font-medium">
                    {faq.question}
                  </span>
                </span>
                <span
                  className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[16px]"
                  style={{ color: RUST }}
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen ? (
                <div className="px-5 pb-4">
                  <div className="space-y-2">
                    {blocks.map((block, bi) =>
                      block.type === "bullet" ? (
                        <div key={bi} className="flex items-start gap-2">
                          <span
                            className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: RUST }}
                          />
                          <p
                            className="text-[13.5px] leading-relaxed"
                            style={{ color: MUTED }}
                          >
                            {block.text}
                          </p>
                        </div>
                      ) : (
                        <p
                          key={bi}
                          className={`text-[13.5px] leading-relaxed ${hasBullets ? "pl-4" : ""}`}
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

const StarIcon = ({ filled, size = 14 }: { filled: boolean; size?: number }) => (
  <svg viewBox="0 0 20 20" className={`inline-block`} style={{ width: size, height: size, color: filled ? "#B85C38" : "#D4C5B0", fill: "currentColor" }}>
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.538 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.783.57-1.838-.197-1.538-1.118l1.287-3.957a1 1 0 00-.364-1.118L3.063 9.39c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
  </svg>
);

const OverallRating = ({ testimonials }: { testimonials: any[] }) => {
  const ratings = testimonials
    .map((t) => Number(t?.rating || 0))
    .filter((r) => r > 0);
  if (!ratings.length) return null;
  const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const rounded = Math.round(average);
  return (
    <div className="flex flex-col items-center gap-1 mb-8">
      <span className="text-5xl font-bold" style={{ color: BROWN }}>
        {average.toFixed(1)}
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} filled={i < rounded} size={20} />
        ))}
      </div>
      <span className="text-sm" style={{ color: MUTED }}>
        {ratings.length} review{ratings.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
};

const TESTIMONIAL_MAX_CHARS = 200;

const WarmTestimonialCard = ({ item, idx }: { item: any; idx: number }) => {
  const rating = Number(item?.rating || 0);
  const text = String(item?.text || item?.testimony || "").trim();
  const isLong = text.length > TESTIMONIAL_MAX_CHARS;
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="h-full rounded-sm p-6"
      style={{
        backgroundColor: CREAM,
        boxShadow: "0 16px 30px -20px rgba(43,33,26,0.4)",
        transform: `rotate(${idx % 2 === 0 ? -1.5 : 1}deg)`,
      }}
    >
      <span className="text-[13px] font-bold block mb-1" style={{ color: BROWN }}>
        {item.name}
      </span>
      {rating > 0 ? (
        <div className="flex items-center gap-0.5 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon key={i} filled={i < rating} size={14} />
          ))}
        </div>
      ) : null}
      <p className={`text-[15px] italic leading-relaxed ${SERIF}`} style={{ color: MUTED }}>
        "{expanded || !isLong ? text || "Great experience." : `${text.slice(0, TESTIMONIAL_MAX_CHARS).trimEnd()}...`}"
      </p>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 text-[11px] font-semibold transition hover:opacity-70"
          style={{ color: RUST }}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
};

const getTestimonialsPerView = () => {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth < 768) return 1;
  return 3;
};

const TestimonialsCarousel = ({
  testimonials,
  showWriteReview,
  onOpenReview,
}: {
  testimonials: any[];
  showWriteReview?: boolean;
  onOpenReview?: () => void;
}) => {
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

  const slide = useCallback(() => {
    setSlideIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!isCarousel || isPaused) return;
    const timer = window.setInterval(slide, 3000);
    return () => window.clearInterval(timer);
  }, [isCarousel, isPaused, slide]);

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

  const slideWidth = 100 / perView;
  const dotIndex = slideIndex % total;

  if (!isCarousel) {
    return (
      <div>
        <OverallRating testimonials={testimonials} />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((item, idx) => (
            <div key={item?.key || idx} className="h-full">
              <WarmTestimonialCard item={item} idx={idx} />
            </div>
          ))}
        </div>
        {showWriteReview && onOpenReview ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onOpenReview}
              className="rounded-full px-6 py-2 text-[12px] font-semibold uppercase tracking-wider transition hover:opacity-80"
              style={{ border: `1px solid ${FOREST}`, color: FOREST }}
            >
              Write a review
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <OverallRating testimonials={testimonials} />
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
              <WarmTestimonialCard item={item} idx={idx} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setTransition(true);
              setSlideIndex(i);
            }}
            aria-label={`Go to testimonial ${i + 1}`}
            className="h-2 w-2 rounded-full transition-all"
            style={{
              width: i === dotIndex ? 20 : 8,
              backgroundColor: i === dotIndex ? RUST : `${BROWN}33`,
            }}
          />
        ))}
      </div>
      {showWriteReview && onOpenReview ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onOpenReview}
            className="rounded-full px-6 py-2 text-[12px] font-semibold uppercase tracking-wider transition hover:opacity-80"
            style={{ border: `1px solid ${FOREST}`, color: FOREST }}
          >
            Write a review
          </button>
        </div>
      ) : null}
    </div>
  );
};

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
      <LinedHeading title={title} className="justify-center" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 md:gap-6">
        {enabled.map((item, index) => {
          const { label, icon } = getInclusionMeta(item);
          return (
            <div
              key={item?.key || index}
              className="flex flex-col items-center gap-2 text-center"
            >
              <span style={{ color: RUST }}>{icon}</span>
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
const WarmOrganicTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;

  if (!draft) {
    return (
      <div className={`mx-auto max-w-4xl p-6 ${SANS}`}>
        <h2 className="text-lg font-medium" style={{ color: BROWN }}>
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
  const cardTints = [FOREST, RUST, "#8C6A46"];
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

  if (breadcrumbItems.length > 1) {
    breadcrumbItems[breadcrumbItems.length - 1].onClick = undefined;
  }

  return (
    <div
      className={`wo-template min-h-screen ${SANS}`}
      style={{ backgroundColor: SAND, color: BROWN }}
    >
      <style>{`
        ${FONT_IMPORT}
        .wo-template button, .wo-template a[href] { cursor: pointer; }
        .wo-template button:focus-visible, .wo-template a:focus-visible, .wo-template input:focus-visible, .wo-template select:focus-visible, .wo-template textarea:focus-visible {
          outline: 2px solid ${RUST};
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .wo-template * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
        }
      `}</style>
      {/* Header */}
      <header
        ref={t.headerRef}
        className="sticky top-0 z-30 bg-white border-b border-black/5"
        style={{ backdropFilter: "blur(4px)" }}
      >
        <div
          className={`${WRAP} flex items-center justify-between gap-4 px-6 py-5 md:px-11`}
        >
          <button
            type="button"
            onClick={() => t.goToSection("home")}
            className={`flex h-12 w-auto max-w-[180px] items-center justify-start overflow-hidden text-[19px] italic md:h-14 ${SERIF}`}
            aria-label="Go to home"
          >
            {draft?.companyLogo ? (
              <img
                src={draft.companyLogo}
                alt={draft.companyName || "Logo"}
                className="h-full w-auto object-left object-contain not-italic"
              />
            ) : (
              draft?.companyName || ""
            )}
          </button>
          <button
            type="button"
            onClick={() => t.setMobileMenuOpen((p: boolean) => !p)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full md:hidden"
            style={{ border: `1px solid ${BROWN}33` }}
            aria-label="Toggle navigation"
          >
            <span className="flex flex-col gap-1">
              <span
                className="block h-px w-4"
                style={{ backgroundColor: BROWN }}
              />
              <span
                className="block h-px w-4"
                style={{ backgroundColor: BROWN }}
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
                    variant="warm"
                  />
                );
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => t.goToSection(item.slug)}
                  className={`text-[13px] border-b-2 pb-1 transition-colors duration-150 ${
                    isActive
                      ? "border-current font-semibold"
                      : "border-transparent font-normal"
                  }`}
                  style={{
                    color: isActive ? RUST : MUTED,
                  }}
                >
                  {item.name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="rounded-full px-5 py-2 text-[13px] font-semibold"
              style={{ border: `1px solid ${RUST}`, color: RUST }}
            >
             Login
            </button>
          </nav>
        </div>
        {t.mobileMenuOpen ? (
          <div
            className="px-6 py-3 md:hidden"
            style={{ borderTop: `1px solid ${BROWN}22` }}
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
                    variant="warm"
                    mobile
                  />
                ) : (
                  <button
                    key={`m-${item.slug}`}
                    type="button"
                    onClick={() => t.goToSection(item.slug)}
                    className="py-3 text-left text-[14px]"
                    style={{ borderBottom: `1px solid ${BROWN}15` }}
                  >
                    {item.name}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => window.location.assign("/")}
                className="py-3 text-left text-[14px] font-semibold"
                style={{ borderBottom: `1px solid ${BROWN}15`, color: RUST }}
              >
                Login
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {breadcrumbItems.length > 1 ? (
        <div style={{ backgroundColor: SAND }}>
          <div className={`${WRAP} flex items-center gap-3 py-2 px-4 md:px-6 text-[12px]`}>
            {breadcrumbItems.map((item, index) => {
              const isCurrent = index === breadcrumbItems.length - 1;
              return (
                <div key={`${item.label}-${index}`} className="flex items-center gap-3">
                  {index > 0 ? (
                    <span aria-hidden="true" style={{ color: `${BROWN}40` }}>&rsaquo;</span>
                  ) : null}
                  {item.onClick && !isCurrent ? (
                    <button
                      type="button"
                      onClick={item.onClick}
                      className="transition hover:text-[#B85C38]"
                      style={{ color: `${BROWN}88` }}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span
                      aria-current="page"
                      className="inline-block border-b-2 border-current pb-0.5 font-semibold"
                      style={{ color: RUST }}
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
          {t.isSectionEnabled("home_hero") ? (
            <>
              <section className="relative overflow-hidden">
                {/* subtle atmospheric depth — soft warm glow, not a flat fill */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 60% 50% at 15% 15%, rgba(184,92,56,0.14), transparent 60%), radial-gradient(ellipse 50% 45% at 90% 85%, rgba(62,86,65,0.10), transparent 55%)",
                  }}
                />
                <div
                  className={`${WRAP} relative grid gap-8 px-6 py-8 md:grid-cols-2 md:gap-10 md:px-11 md:py-12`}
                >
                  <div className="flex flex-col justify-center gap-5">
                    <span className={EYEBROW} style={{ color: RUST }}>
                      {draft?.vertical
                        ? String(draft.vertical).replace(/-/g, " ")
                        : "Welcome Back,"}
                    </span>
                    <h1
                      className={`text-[36px] md:text-[50px] font-medium leading-[1.08] ${SERIF}`}
                    >
                      {draft?.title || draft?.companyName || ""}
                    </h1>
                    <p
                      className="max-w-sm text-[15px] leading-relaxed"
                      style={{ color: MUTED }}
                    >
                      {draft?.subTitle || ""}
                    </p>
                    <button
                      type="button"
                      className="self-start rounded-full px-7 py-3 text-[13px] font-semibold transition duration-200 hover:opacity-90"
                      style={{ backgroundColor: FOREST, color: CREAM }}
                    >
                      {draft?.ctaText || "Book a Tour"}
                    </button>
                  </div>
                  <div
                    className="relative flex aspect-square items-end justify-center overflow-hidden"
                    style={{
                      background: `linear-gradient(150deg, #C9764E 0%, ${RUST} 55%, #8C4A2E 100%)`,
                      borderRadius: "46% 54% 61% 39% / 45% 41% 59% 55%",
                    }}
                  >
                    {t.resolvedHomeHeroImage ? (
                      <img
                        src={t.resolvedHomeHeroImage}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-90"
                      />
                    ) : null}
                    {t.showHeroCarousel ? (
                      <div
                        className="relative z-10 mb-6 flex items-center gap-4 rounded-full px-4 py-2"
                        style={{ backgroundColor: CREAM }}
                      >
                        <button
                          type="button"
                          onClick={t.handleHeroPrev}
                          className="text-[12px] font-semibold"
                          style={{ color: BROWN }}
                        >
                          ←
                        </button>
                        <span className="text-[11px]" style={{ color: MUTED }}>
                          {t.heroIndex + 1} / {t.heroImages.length}
                        </span>
                        <button
                          type="button"
                          onClick={t.handleHeroNext}
                          className="text-[12px] font-semibold"
                          style={{ color: BROWN }}
                        >
                          →
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <div
                className="mx-6 md:mx-11"
                style={{ height: 1, backgroundColor: `${BROWN}26` }}
              />
            </>
          ) : null}

          {t.aboutPageEnabled &&
          t.isSectionEnabled("home_about") &&
          t.aboutIntroBlocks.length ? (
            <section className={PAGE_WRAP}>
              <LinedHeading title={String(draft?.aboutTitle || "").trim() || "About Our Vision"} className="justify-center" />
              <div className="flex flex-col gap-4 text-center mx-auto max-w-2xl">
                {t.aboutIntroBlocks.map((text: string, idx: number) => (
                  <p
                    key={idx}
                    className="text-[15.5px] leading-relaxed"
                    style={{ color: MUTED }}
                  >
                    {text}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          {t.productsPageEnabled &&
          t.isSectionEnabled("home_products") &&
          productPages.length ? (
            <section className={`${WRAP} px-6 pb-4 pt-2 md:px-11`}>
              <LinedHeading title={String(draft?.productTitle || "").trim() || "Our Services"} className="justify-center" />
              <ProductGrid
                products={productPages}
                onSelect={t.handleProductCardAction}
                tints={cardTints}
              />
            </section>
          ) : null}

          {Array.isArray(draft?.inclusions) &&
          draft.inclusions.length > 0 &&
          t.isSectionEnabled("home_inclusions") ? (
            <Inclusions inclusions={draft.inclusions} title="Inclusions" />
          ) : null}
          {t.galleryPageEnabled && t.isSectionEnabled("home_gallery") ? (
            <section className={PAGE_WRAP}>
              <div>
                <LinedHeading title={draft?.galleryTitle || "Gallery"} className="justify-center" />
              </div>
              <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3">
                {t.homeGalleryItems.map((src: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => t.openGalleryViewer(idx)}
                    className="aspect-square overflow-hidden rounded-2xl"
                    style={{ backgroundColor: `${BROWN}0D` }}
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
                    className="rounded-full px-6 py-2.5 text-[13px] font-semibold"
                    style={{ border: `1px solid ${BROWN}33`, color: BROWN }}
                  >
                    Show more →
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {t.isSectionEnabled("home_testimonials") && t.testimonials.length ? (
            <section className={PAGE_WRAP}>
              <LinedHeading title={draft?.testimonialTitle || "Testimonials"} className="justify-center" />
              <div className="mt-8">
                <TestimonialsCarousel
                  testimonials={t.testimonials}
                  showWriteReview={t.showWriteReview}
                  onOpenReview={t.openReviewModal}
                />
              </div>
            </section>
          ) : null}

          {t.contactPageEnabled && t.isSectionEnabled("home_contact") ? (
            <section className={PAGE_WRAP}>
              <LinedHeading title={draft?.contactTitle || "Contact"} className="justify-center" />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-[0.62fr_0.38fr]">
                {draft?.mapUrl ? (
                  <iframe
                    title="map"
                    src={draft.mapUrl}
                    className="h-[320px] w-full rounded-3xl border-0 md:h-[420px]"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="h-[320px] w-full rounded-3xl md:h-[420px]"
                    style={{ backgroundColor: `${BROWN}0D` }}
                  />
                )}
                <div
                  className="flex flex-col gap-5 rounded-3xl p-7 text-[15px]"
                  style={{ backgroundColor: CREAM, color: MUTED }}
                >
                  {draft?.companyLogo ? (
                    <img
                      src={draft.companyLogo}
                      alt={draft.companyName || "Company"}
                      className="mb-3 h-16 w-auto object-contain md:h-20"
                    />
                  ) : null}
                  {t.contactEmail ? (
                    <a
                      href={`mailto:${t.contactEmail}`}
                      className="flex items-center gap-4 transition hover:opacity-70 md-10px"
                      style={{ color: BROWN }}
                    >
                      <CONTACT_ICON_CIRCLE>
                        <ContactMailIcon />
                      </CONTACT_ICON_CIRCLE>
                      <span className="min-w-0 break-words">{t.contactEmail}</span>
                    </a>
                  ) : null}
                  {t.contactPhone ? (
                    <a
                      href={`tel:${t.contactPhone.replace(/[^\d+]/g, "")}`}
                      className="flex items-center gap-4 transition hover:opacity-70"
                      style={{ color: BROWN }}
                    >
                      <CONTACT_ICON_CIRCLE>
                        <ContactPhoneIcon />
                      </CONTACT_ICON_CIRCLE>
                      <span className="min-w-0 break-words">{t.contactPhone}</span>
                    </a>
                  ) : null}
                  {t.contactAddress ? (
                    <div className="flex items-start gap-4">
                      
                      <CONTACT_ICON_CIRCLE>
                        <ContactMapIcon />
                      </CONTACT_ICON_CIRCLE>
                      <span className="min-w-0 break-words pt-0.5">{t.contactAddress}</span>
                    </div>
                  ) : null}
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
          <LinedHeading title={String(draft?.aboutTitle || "").trim() || "About Our Vision"} className="justify-center" />
          <div className="mt-6 flex max-w-2xl flex-col gap-4 mx-auto">
            {t.aboutIntroBlocks.map((text: string, idx: number) => (
              <p
                key={idx}
                className="text-[15px] leading-relaxed"
                style={{ color: MUTED }}
              >
                {text}
              </p>
            ))}
          </div>
          {t.aboutNarrativeBlocks.length ? (
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
              {t.aboutNarrativeBlocks.map((item: any) => (
                <div
                  key={item.title}
                  className="rounded-2xl p-6"
                  style={{ backgroundColor: CREAM }}
                >
                  <h3
                    className={`text-[18px] font-normal ${SERIF}`}
                    style={{ color: RUST }}
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
            <div className="mt-16 flex flex-col gap-12">
              <LinedHeading title="Our Founders" className="justify-center" />
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
                      className="aspect-square w-full rounded-3xl object-cover"
                    />
                  ) : (
                    <div
                      className="aspect-square w-full rounded-3xl"
                      style={{ backgroundColor: `${BROWN}0D` }}
                    />
                  )}
                  <div>
                    <h4 className={`text-[20px] font-normal ${SERIF}`}>
                      {founder?.name}
                    </h4>
                    <p className="text-[13px]" style={{ color: RUST }}>
                      {founder?.role}
                    </p>
                    <p
                      className="mt-3 text-[14px] leading-relaxed"
                      style={{ color: MUTED }}
                    >
                      {founder?.bio}
                    </p>
                  </div>
                </div>
              ))}
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
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start md:gap-10">
                    <div className="w-full">
                      {image ? (
                        <img
                          src={typeof image === "string" ? image : image?.url}
                          alt={title}
                          className="h-[300px] w-full rounded-3xl object-cover md:h-[480px]"
                          style={{ backgroundColor: `${BROWN}0D` }}
                        />
                      ) : (
                        <div
                          className="h-[300px] w-full rounded-3xl md:h-[480px]"
                          style={{ backgroundColor: `${BROWN}0D` }}
                        />
                      )}
                    </div>
                    <div className="flex flex-col md:h-[480px]">
                      <div className="shrink-0">
                        <h1 className={`text-[28px] md:text-[34px] font-normal ${SERIF}`}>
                          {title}
                        </h1>
                        {price ? (
                          <p className="mt-1 text-[14px]" style={{ color: MUTED }}>
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
                                  className="flex items-start gap-2 text-[14px] leading-relaxed"
                                  style={{ color: MUTED }}
                                >
                                  <span
                                    className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: RUST }}
                                  />
                                  <span>{point}</span>
                                </li>
                              ))}
                          </ul>
                        ) : null}
                      </div>
                      <div className="shrink-0">
                        {t.leadSubmitted ? (
                          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: CREAM }}>
                            <p className="text-[14px] font-medium">Enquiry submitted successfully.</p>
                            <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
                              We'll get back to you shortly.
                            </p>
                          </div>
                        ) : (
                          <form onSubmit={t.submitLeadForm} className="flex flex-col gap-3">
                            <span className={`${EYEBROW} block text-center`} style={{ color: RUST }}>
                              Enquire now
                            </span>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {leadFormFields.map((field: any) => (
                                <input
                                  key={field.key}
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
                                  style={inputStyle}
                                />
                              ))}
                            </div>
                            {t.leadSubmitError ? (
                              <p className="text-[12px] text-red-600">{t.leadSubmitError}</p>
                            ) : null}
                            <button
                              type="submit"
                              disabled={t.leadSubmitPending}
                              className="rounded-full py-3 text-[13px] font-semibold disabled:opacity-50"
                              style={{ backgroundColor: FOREST, color: CREAM }}
                            >
                              {t.leadSubmitPending ? "Submitting…" : "Submit enquiry"}
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
              {(t.selectedProductPage as any)?.heroEnabled !== false ? (
                <section
                  className="relative h-[50svh] min-h-[320px] overflow-hidden md:h-[85vh] md:min-h-[400px]"
                  style={{ backgroundColor: `${BROWN}0D` }}
                >
                  {t.selectedProductHeroImage ? (
                    <img
                      src={t.selectedProductHeroImage}
                      alt={t.selectedProductPage?.name || "Service"}
                      className="absolute inset-0 h-full w-full object-cover opacity-100"
                    />
                  ) : null}
                  <div
                    className="absolute inset-0"
                    // style={{
                    //   background: `linear-gradient(180deg, ${SAND}A0 0%, ${SAND} 90%)`,
                    // }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-end gap-2 px-6 pb-10 text-center md:pb-14">
                    <h1
                      className={`text-[28px] font-normal ${SERIF} md:text-[38px]`}
                      style={{ color: "white" }}
                    >
                      {(t.selectedProductPage as any)?.heroHeading ||
                        (t.selectedProductPage as any)?.name}
                    </h1>
                    {(t.selectedProductPage as any)?.heroSubHeading ? (
                      <p className="mx-auto mt-1 max-w-xl text-[14.5px]" style={{ color: MUTED }}>
                        {(t.selectedProductPage as any).heroSubHeading}
                      </p>
                    ) : null}
                    {(t.selectedProductPage as any)?.heroButtonText ? (
                      <button
                        type="button"
                        className="mt-2 self-center rounded-full px-7 py-3 text-[13px] font-semibold transition duration-200 hover:opacity-90"
                        style={{ backgroundColor: FOREST, color: CREAM }}
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
              <section className={PAGE_WRAP}>
                <LinedHeading
                  title={`${String((t.selectedProductPage as any)?.heading || t.selectedProductPage?.name || "").trim() || "Our"} ${t.isMenuProductSlug(t.selectedProductPage?.slug || "") ? "Menu" : "Services"}`}
                  className="justify-center"
                />
                <div className="mt-8">
                  {t.isMenuProductSlug(t.selectedProductPage?.slug || "") ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                      {t.menuItems.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-2xl p-5"
                          style={{ backgroundColor: CREAM }}
                        >
                          {item?.image ? (
                            <img
                              src={item.image}
                              alt={item?.name}
                              className="aspect-[4/3] w-full rounded-xl object-cover"
                            />
                          ) : null}
                          <div className="mt-3 flex items-center justify-between">
                            <h4 className={`text-[15px] font-normal ${SERIF}`}>
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
                      onSelect={(item: any) =>
                        t.goToProductItem(
                          t.selectedProductPage?.slug ||
                            t.selectedProductPage?.name ||
                            "",
                          item?.title || item?.name || item?.heading || "",
                        )
                      }
                      tints={cardTints}
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
            <>
              <section className={PAGE_WRAP}>
                <LinedHeading title={String(draft?.productTitle || "").trim() || "Our Services"} className="justify-center" />
                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {productPages.map((product: any, idx: number) => {
                    const description = getProductCardDescription(product);
                    return (
                      <article
                        key={idx}
                        className="flex flex-col overflow-hidden rounded-2xl transition hover:-translate-y-0.5"
                        style={{
                          backgroundColor: CREAM,
                          boxShadow: "0 14px 28px -18px rgba(43,33,26,0.35)",
                        }}
                      >
                        <div className="w-full overflow-hidden rounded-t-2xl" style={{ backgroundColor: `${BROWN}0D` }}>
                          {product?.cardImage ? (
                            <img
                              src={product.cardImage}
                              alt={product?.heading || product?.name}
                              className="h-[200px] w-full object-cover md:h-[230px]"
                            />
                          ) : (
                            <div
                              className="h-[200px] w-full md:h-[230px]"
                              style={{
                                background: `linear-gradient(140deg, ${cardTints[idx % cardTints.length]}, ${cardTints[idx % cardTints.length]}AA)`,
                              }}
                            />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col items-center gap-3 px-5 py-5 text-center">
                          <h3 className={`text-[16px] font-normal ${SERIF}`}>
                            {product?.name || product?.heading || "Service"}
                          </h3>
                          {description ? (
                            <p
                              className="line-clamp-2 text-[12.5px] leading-relaxed"
                              style={{ color: MUTED }}
                            >
                              {description}
                            </p>
                          ) : null}
                          <div className="mt-auto pt-1">
                            <button
                              type="button"
                              onClick={() => t.handleProductCardAction(product)}
                              className="rounded-full px-6 py-2 text-[11px] font-semibold uppercase tracking-widest transition hover:opacity-80"
                              style={{ border: `1px solid ${RUST}`, color: RUST }}
                            >
                              View details
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </>
      ) : null}

      {/* Gallery page */}
      {section === "gallery" && t.galleryPageEnabled ? (
        <section className={PAGE_WRAP}>
          <LinedHeading title={draft?.galleryTitle || "Gallery"} className="justify-center" />
          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3">
            {t.galleryItems.map((src: string, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => t.openGalleryViewer(idx)}
                className="aspect-square overflow-hidden rounded-2xl"
                style={{ backgroundColor: `${BROWN}0D` }}
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
          <LinedHeading title={draft?.testimonialTitle || "Testimonials"} className="justify-center" />
          <div className="mt-8">
            <TestimonialsCarousel
              testimonials={t.testimonials}
              showWriteReview={t.showWriteReview}
              onOpenReview={t.openReviewModal}
            />
          </div>
        </section>
      ) : null}

      {/* Partner page */}
      {section === "partner" && t.partnerPageEnabled ? (
        <section className={PAGE_WRAP}>
          <LinedHeading title={t.partnerPageHeading || "Become A Partner"} className="justify-center" />
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div
              className="text-[14.5px] leading-relaxed"
              style={{ color: MUTED }}
            >
              {t.partnerPageContent ? (
                t.partnerPageContent.split("\n").map((p: string, i: number) => (
                  <p key={i} className="mb-4 last:mb-0">
                    {p}
                  </p>
                ))
              ) : (
                <p style={{ color: `${MUTED}99` }}>
                  Partner content coming soon.
                </p>
              )}
            </div>
            <div className="rounded-2xl p-6" style={{ backgroundColor: CREAM }}>
              <h3
                className={`text-center text-[18px] font-semibold md:text-[20px] ${SERIF}`}
                style={{ color: RUST }}
              >
                {t.partnerFormTitle ||
                  `Partner with ${draft?.companyName || "us"}`}
              </h3>
              <div className="mt-6 flex flex-col gap-3">
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
                  style={inputStyle}
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
                  style={inputStyle}
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
                  style={inputStyle}
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
                  style={inputStyle}
                />
                <button
                  type="button"
                  disabled={t.partnerSubmitPending}
                  className="rounded-full py-3 text-[13px] font-semibold disabled:opacity-50"
                  style={{ backgroundColor: FOREST, color: CREAM }}
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
              <LinedHeading title={draft?.companyName ? `Join Our Team - ${draft.companyName}` : "Join Our Team - Company Name"} className="justify-center" />
              <div
                className="mx-auto max-w-2xl text-center text-[14.5px] leading-relaxed"
                style={{ color: MUTED }}
              >
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
                <div className="mt-10 flex flex-col gap-3">
                  {t.careersDepartmentSections.map((dept: any) => {
                    const isOpen = t.careersOpenDepartment === dept.department;
                    return (
                      <div
                        key={dept.department}
                        className="rounded-2xl p-5"
                        style={{ backgroundColor: CREAM }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            t.setCareersOpenDepartment(
                              isOpen ? "" : dept.department,
                            )
                          }
                          className="flex w-full items-center justify-between text-left"
                        >
                          <span className={`text-[16px] font-normal ${SERIF}`}>
                            {dept.ordinal}. {dept.department}
                          </span>
                          <span style={{ color: RUST }}>
                            {isOpen ? "−" : "+"}
                          </span>
                        </button>
                        {isOpen ? (
                          <div className="mt-4 flex flex-col gap-2">
                            {dept.jobs.map((job: any, idx: number) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => t.openCareersJob(job)}
                                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-left"
                              >
                                <p className="text-[13px] font-medium">
                                  {job?.title || job?.designation || job?.name}
                                </p>
                                <span
                                  className="text-[11px] font-semibold uppercase tracking-wider"
                                  style={{ color: RUST }}
                                >
                                  {draft?.careersApplyButtonText || "Apply →"}
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
                    className="mt-4 self-start rounded-full px-6 py-3 text-[13px] font-semibold"
                    style={{ backgroundColor: FOREST, color: CREAM }}
                  >
                    {draft?.careersApplyButtonText || "General application"}
                  </button>
                  {(draft?.careersClosingText || draft?.careersClosingHeading) && (
                    <div className="mt-12 text-center">
                      {draft?.careersClosingHeading && (
                        <p className={`text-[18px] font-normal ${SERIF}`} style={{ color: BROWN }}>
                          {draft.careersClosingHeading}
                        </p>
                      )}
                      {draft?.careersClosingText && (
                        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTED }}>
                          {draft.careersClosingText}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div>
              <button
                type="button"
                onClick={t.closeCareersJob}
                className="text-[12.5px] font-semibold underline underline-offset-4"
                style={{ color: FOREST }}
              >
                ← Back
              </button>
              <h2
                className={`mt-4 text-[26px] font-normal ${SERIF} text-center`}
              >
                {t.careersDirectApply
                  ? "General Application"
                  : t.careersApplyJob?.title || t.careersApplyJob?.name}
              </h2>
              {!t.careersDirectApply ? (
                <div
                  className="mt-6 flex justify-center gap-6"
                  style={{ borderBottom: `1px solid ${BROWN}22` }}
                >
                  <button
                    type="button"
                    onClick={() => t.setCareersDetailTab("description")}
                    className="pb-3 text-[12.5px] font-medium"
                    style={{
                      color:
                        t.careersDetailTab === "description" ? RUST : MUTED,
                      borderBottom:
                        t.careersDetailTab === "description"
                          ? `2px solid ${RUST}`
                          : "2px solid transparent",
                    }}
                  >
                    Description
                  </button>
                  <button
                    type="button"
                    onClick={() => t.setCareersDetailTab("apply")}
                    className="pb-3 text-[12.5px] font-medium"
                    style={{
                      color: t.careersDetailTab === "apply" ? RUST : MUTED,
                      borderBottom:
                        t.careersDetailTab === "apply"
                          ? `2px solid ${RUST}`
                          : "2px solid transparent",
                    }}
                  >
                    Apply
                  </button>
                </div>
              ) : null}
              {t.careersDetailTab === "description" && !t.careersDirectApply ? (
                <div
                  className="mt-8 flex flex-col gap-6 text-[14px] leading-relaxed"
                  style={{ color: MUTED }}
                >
                  {t.careersApplyJob?.aboutTheJob ? (
                    <div>
                      <p className="font-medium" style={{ color: BROWN }}>
                        About this role
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {t.careersApplyJob.aboutTheJob}
                      </p>
                    </div>
                  ) : null}
                  {t.careersApplyJob?.keyResponsibilities ? (
                    <div>
                      <p className="font-medium" style={{ color: BROWN }}>
                        Key responsibilities
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {t.careersApplyJob.keyResponsibilities}
                      </p>
                    </div>
                  ) : null}
                  {t.careersApplyJob?.requirements ? (
                    <div>
                      <p className="font-medium" style={{ color: BROWN }}>
                        Requirements
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {t.careersApplyJob.requirements}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {t.careersDetailTab === "apply" || t.careersDirectApply ? (
                <div className="mt-8">
                  {t.careersApplySubmitted ? (
                    <div
                      className="rounded-2xl p-6 text-center"
                      style={{ backgroundColor: CREAM }}
                    >
                      <p className="text-[14px] font-medium">
                        Application submitted!
                      </p>
                      <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
                        We'll review it and get back to you shortly.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={t.submitCareersApplication}
                      className="grid grid-cols-1 gap-3 rounded-2xl p-6 md:grid-cols-2"
                      style={{ backgroundColor: CREAM }}
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
                        style={inputStyle}
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
                        style={inputStyle}
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
                        style={inputStyle}
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
                        style={inputStyle}
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
                        style={inputStyle}
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
                        style={inputStyle}
                      >
                        <option value="">City *</option>
                        {t.applyCityList.map((c: any) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div
                        className="flex items-stretch rounded-xl bg-white"
                        style={inputStyle}
                      >
                        <span
                          className="flex shrink-0 items-center rounded-l-xl px-3 text-[13px]"
                          style={{
                            borderRight: `1px solid ${BROWN}33`,
                            color: MUTED,
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
                          className="w-full rounded-r-xl px-3 py-2.5 text-[14px] outline-none"
                        />
                      </div>
                      <label
                        className="flex cursor-pointer items-center justify-between rounded-xl bg-white px-3 py-2.5 text-[13px]"
                        style={{ border: `1px solid ${BROWN}44` }}
                      >
                        <span>
                          {t.careersResumeFile
                            ? t.careersResumeFile.name
                            : "Upload resume / CV *"}
                        </span>
                        <span
                          className="rounded-lg px-2 py-1 text-[10px] uppercase tracking-wider"
                          style={{ border: `1px solid ${BROWN}33` }}
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
                            style={inputStyle}
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
                            style={inputStyle}
                          />
                        ),
                      )}
                      {t.careersApplyError ? (
                        <p className="md:col-span-2 text-[12px] text-red-600">
                          {t.careersApplyError}
                        </p>
                      ) : null}
                      <button
                        type="submit"
                        disabled={t.careersApplySubmitting}
                        className="md:col-span-2 rounded-full py-3 text-[13px] mt-5 font-semibold disabled:opacity-50"
                        style={{ backgroundColor: FOREST, color: CREAM }}
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
          <LinedHeading title={draft?.contactTitle || "Contact"} className="justify-center" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[0.6fr_0.4fr]">
            {draft?.mapUrl ? (
              <iframe
                title="map"
                src={draft.mapUrl}
                className="h-[300px] w-full rounded-3xl border-0 md:h-[420px]"
                loading="lazy"
              />
            ) : (
              <div
                className="h-[300px] w-full rounded-3xl md:h-[420px]"
                style={{ backgroundColor: `${BROWN}0D` }}
              />
            )}
            <div
              className="flex flex-col gap-5 rounded-3xl p-7 text-[15px]"
              style={{ backgroundColor: CREAM, color: MUTED }}
            >
              {draft?.companyLogo ? (
                <img
                  src={draft.companyLogo}
                  alt={draft.companyName || "Company"}
                  className="mb-3 h-16 w-auto object-contain md:h-20"
                />
              ) : null}
              {t.contactEmail ? (
                <a
                  href={`mailto:${t.contactEmail}`}
                  className="flex items-center gap-4 transition hover:opacity-70"
                  style={{ color: BROWN }}
                >
                  <CONTACT_ICON_CIRCLE>
                    <ContactMailIcon />
                  </CONTACT_ICON_CIRCLE>
                  <span className="min-w-0 break-words">{t.contactEmail}</span>
                </a>
              ) : null}
              {t.contactPhone ? (
                <a
                  href={`tel:${t.contactPhone.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-4 transition hover:opacity-70"
                  style={{ color: BROWN }}
                >
                  <CONTACT_ICON_CIRCLE>
                    <ContactPhoneIcon />
                  </CONTACT_ICON_CIRCLE>
                  <span className="min-w-0 break-words">{t.contactPhone}</span>
                </a>
              ) : null}
              {t.contactAddress ? (
                <div className="flex items-start gap-4">
                  <CONTACT_ICON_CIRCLE>
                    <ContactMapIcon />
                  </CONTACT_ICON_CIRCLE>
                  <span className="min-w-0 break-words pt-0.5">{t.contactAddress}</span>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {t.galleryViewerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
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
            className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain"
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
      <footer className="bg-white border-t border-black/5" style={{ color: BROWN }}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-14 text-center md:grid-cols-[1.35fr_1fr_1fr_1fr] md:text-left">
          <div className="flex flex-col items-center md:items-start">
            {draft?.companyLogo ? (
              <img
                src={draft.companyLogo}
                alt={draft.companyName || "Company"}
                className="h-12 w-auto object-contain md:h-14"
              />
            ) : null}
            {t.footerCompanyName ? (
              <p className={`mt-3 text-[15px] font-normal ${SERIF}`}>
                {t.footerCompanyName}
              </p>
            ) : null}
            {t.footerAddress ? (
              <p className="mt-1 text-[13px] opacity-70">{t.footerAddress}</p>
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
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-75"
                    style={{ backgroundColor: `${RUST}15`, color: RUST }}
                  >
                    {SOCIAL_ICON[social.key]}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] opacity-80">
              Quick Links
            </h3>
            <div className="mt-3 flex flex-col gap-2 text-[13.5px] opacity-75 items-start">
              {t.navItems.map((item: any) => (
                <button
                  key={`footer-${item.slug}`}
                  type="button"
                  onClick={() => t.goToSection(item.slug)}
                  className="hover:opacity-100"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          {t.productsPageEnabled ? (
            <div>
              <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] opacity-80">
                Services
              </h3>
              <div className="mt-3 flex flex-col gap-2 text-[13.5px] opacity-75 items-start">
                {t.productPages.length > 0 ? (
                  t.productPages.map((page: any, idx: number) => (
                    <button
                      key={`footer-product-${idx}`}
                      type="button"
                      onClick={() =>
                        t.goToProductPage(page?.slug || page?.name || "")
                      }
                      className="hover:opacity-100"
                    >
                      {page?.name || page?.heading || "Service"}
                    </button>
                  ))
                ) : (
                  <p className="opacity-50">No products listed</p>
                )}
              </div>
            </div>
          ) : null}
          <div>
            <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] opacity-80">
              Contact Us
            </h3>
            <div className="mt-3 flex flex-col gap-2 text-[13.5px] opacity-75">
              {t.contactPhone ? <p>{t.contactPhone}</p> : null}
              {t.contactEmail ? <p>{t.contactEmail}</p> : null}
            </div>
          </div>
        </div>
        <div
          className="px-6 py-4 text-center text-[11.5px] opacity-60"
          style={{ borderTop: `1px solid ${BROWN}15` }}
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
            className="w-full max-w-md rounded-3xl p-8"
            style={{ backgroundColor: CREAM }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className={`text-[18px] font-normal ${SERIF}`}>
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
                    style={inputStyle}
                  />
                ))}
                {t.leadSubmitError ? (
                  <p className="text-[12px] text-red-600">
                    {t.leadSubmitError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={t.leadSubmitPending}
                  className="mt-2 rounded-full py-3 text-[13px] font-semibold disabled:opacity-50"
                  style={{ backgroundColor: FOREST, color: CREAM }}
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
            className="w-full max-w-md rounded-3xl p-8"
            style={{ backgroundColor: CREAM }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className={`text-[18px] font-normal ${SERIF}`}>
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
                style={inputStyle}
              />
              <div className="flex items-center gap-3">
                <span className="text-[13px]" style={{ color: MUTED }}>Your rating</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        t.setReviewForm((prev: any) => ({
                          ...prev,
                          rating: String(star),
                        }))
                      }
                      className="transition hover:scale-110"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        className="h-5 w-5"
                        style={{
                          color: star <= Number(t.reviewForm.rating || 5) ? "#B85C38" : "#D4C5B0",
                          fill: "currentColor",
                        }}
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.538 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.783.57-1.838-.197-1.538-1.118l1.287-3.957a1 1 0 00-.364-1.118L3.063 9.39c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
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
                style={inputStyle}
              />
              {t.reviewSubmitError ? (
                <p className="text-[12px] text-red-600">
                  {t.reviewSubmitError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={t.reviewSubmitPending}
                className="mt-2 rounded-full py-3 text-[13px] font-semibold disabled:opacity-50"
                style={{ backgroundColor: FOREST, color: CREAM }}
              >
                {t.reviewSubmitPending ? "Submitting…" : "Submit review"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {t.successPopup.open ? (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 text-[13px] shadow-lg"
          style={{ backgroundColor: FOREST, color: CREAM }}
        >
          {t.successPopup.message}
        </div>
      ) : null}
    </div>
  );
};

export default WarmOrganicTemplate;
