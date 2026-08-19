import React, { useState } from "react";
import { useWebsiteTemplateData } from "./useWebsiteTemplateData";
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
const INPUT =
  "w-full bg-emerald-950/60 border border-emerald-800 rounded-lg px-4 py-3 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-400 transition-colors";

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
        <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-3">
          Included
        </p>
        <h2
          className={`text-4xl font-semibold text-stone-100 mb-10 ${HEADING_FONT}`}
        >
          {title}
        </h2>
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
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-3">
          FAQ
        </p>
        <h2
          className={`text-4xl font-semibold text-stone-100 mb-10 ${HEADING_FONT}`}
        >
          Frequently asked questions
        </h2>
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
      return (
        <div
          key={idx}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(product)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(product);
            }
          }}
          className="group flex flex-col items-center rounded-xl border border-emerald-800/50 bg-emerald-900/40 p-7 text-center transition-all duration-300 cursor-pointer hover:border-amber-400/40 hover:bg-emerald-900/60"
        >
          {product?.cardImage || product?.images?.[0] ? (
            <img
              src={
                product?.cardImage ||
                (typeof product?.images?.[0] === "string"
                  ? product.images[0]
                  : product?.images?.[0]?.url)
              }
              alt={product?.name || product?.title || ""}
              className="mb-4 h-40 w-full rounded-lg object-cover opacity-80 transition-opacity group-hover:opacity-100"
            />
          ) : (
            <div className="mb-5 inline-block text-2xl text-amber-400 transition-transform duration-300 group-hover:scale-110">
              ◈
            </div>
          )}
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
          <span className="mt-3 text-xs font-semibold uppercase tracking-wider text-amber-400 group-hover:underline">
            Learn more →
          </span>
        </div>
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
  <section className="border-y border-emerald-800/40 bg-emerald-950/30 px-6 py-12">
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
const EmeraldStudioTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;

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

  const section = t.currentSection;
  const isHome = section === "home";

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
                    t.currentSection === item.slug || (isHome && item.slug === "home")
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
                  className={`text-sm font-medium text-left ${t.currentSection === item.slug ? "text-amber-400" : "text-stone-400"}`}
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

      {(() => {
        const breadcrumbItems: Array<{ label: string; onClick?: () => void }> = [
          { label: "Home", onClick: () => t.goToSection("home") },
        ];
        if (section !== "home") {
          const label =
            section === "partner"
              ? "Partner"
              : section === "testimonials"
                ? "Testimonials"
                : section === "products"
                  ? "Services"
                  : section.charAt(0).toUpperCase() + section.slice(1);
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
        if (breadcrumbItems.length <= 1) return null;
        return (
          <div className="bg-[#002c22]">
            <div className={`${WRAP} flex items-center gap-2 py-2 text-xs`}>
              {breadcrumbItems.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                  {index > 0 ? (
                    <span className="text-stone-600">/</span>
                  ) : null}
                  {item.onClick ? (
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
                      className="font-bold text-amber-400"
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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
                  <div className="inline-flex items-center gap-2 bg-[#004f3b]/60 border border-[#007a55]/50 rounded-full px-4 py-1.5 text-xs font-medium text-[#ffb900] mb-8">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffb900]" />
                    {draft?.heroBadgeText ||
                      "Trusted by 350+ businesses worldwide"}
                  </div>
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
                      Book a Free Call
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
                  </div>
                  {/* <div className="absolute -bottom-4 -left-4 rounded-xl bg-[#ffb900] px-5 py-4 text-[#002c22] shadow-xl">
                    <p
                      className={`text-2xl font-bold leading-8 ${HEADING_FONT}`}
                    >
                      18 yrs
                    </p>
                    <p className="text-xs font-medium leading-4 text-[#006045]">
                      of proven expertise
                    </p>
                  </div> */}
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
              <div className="max-w-7xl mx-auto grid md:grid-cols-[0.35fr_0.65fr] gap-10">
                <div>
                  <h2
                    className={`text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] text-amber-400 ${HEADING_FONT}`}
                  >
                    {draft?.aboutTitle || "Built around your goals"}
                  </h2>
                </div>
                <div className="space-y-4">
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
            <section className="py-24 px-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                  <div>
                    <h2
                      className={`text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] text-amber-400 ${HEADING_FONT}`}
                    >
                      Our core products
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => t.goToSection("products")}
                    className="text-sm font-medium text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors shrink-0"
                  >
                    View all products →
                  </button>
                </div>
                <FigmaProductGrid
                  products={t.productPages.slice(0, 6)}
                  onSelect={t.handleProductCardAction}
                />
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
            <section className="py-24 px-6 bg-emerald-900/20">
              <div className="max-w-7xl mx-auto">
                <div className="mb-12">
                  <h2
                    className={`text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] text-amber-400 ${HEADING_FONT}`}
                  >
                    Inside our world
                  </h2>
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
                <div className="max-w-xl mb-14">
                  <h2
                    className={`text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] text-amber-400 ${HEADING_FONT}`}
                  >
                    What our clients say
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {t.visibleTestimonials.map((item: any) => (
                    <div
                      key={item.key}
                      className="min-h-[254px] bg-[#004f3b]/40 border border-[#006045]/50 rounded-xl p-8 flex flex-col gap-6"
                    >
                      <p className="text-stone-300 text-base leading-relaxed flex-1">
                        &ldquo;{item.text}&rdquo;
                      </p>
                      <div className="flex items-center gap-3 border-t border-emerald-800/50 pt-5">
                        <div className="w-10 h-10 rounded-full bg-amber-400 text-emerald-950 font-bold text-sm flex items-center justify-center shrink-0">
                          {item.name
                            ?.split(" ")
                            .map((w: string) => w.charAt(0))
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-stone-100">
                            {item.name}
                          </p>
                          {item.rating ? (
                            <p className="text-amber-400 text-xs">
                              {"★".repeat(item.rating)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
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
              <div className="max-w-7xl mx-auto grid md:grid-cols-[0.6fr_0.4fr] gap-8 items-stretch">
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
                <div className="rounded-2xl border border-emerald-800/50 bg-emerald-900/40 p-8 flex flex-col justify-center">
                  <h2
                    className={`text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] text-amber-400 mb-7 ${HEADING_FONT}`}
                  >
                    Let's start a conversation.
                  </h2>
                  <div className="space-y-3 text-sm text-stone-400">
                    {t.contactEmail ? (
                      <a
                        className="block hover:text-amber-400"
                        href={`mailto:${t.contactEmail}`}
                      >
                        {t.contactEmail}
                      </a>
                    ) : null}
                    {t.contactPhone ? (
                      <a
                        className="block hover:text-amber-400"
                        href={`tel:${t.contactPhone.replace(/[^\d+]/g, "")}`}
                      >
                        {t.contactPhone}
                      </a>
                    ) : null}
                    {t.contactAddress ? (
                      <p className="whitespace-pre-line">{t.contactAddress}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => t.goToSection("contact")}
                    className="mt-8 self-start rounded bg-amber-400 px-6 py-3 text-sm font-semibold text-emerald-950"
                  >
                    Contact Us
                  </button>
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
          <section className="relative pt-36 pb-20 px-6 overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(#ffb900 1px, transparent 1px), linear-gradient(90deg, #ffb900 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
            <div className="relative max-w-7xl mx-auto text-center">
              <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-4">
                About Us
              </p>
              <h1
                className={`text-5xl md:text-6xl font-semibold leading-tight max-w-3xl mx-auto text-stone-100 mb-6 ${HEADING_FONT}`}
              >
                {draft?.aboutTitle ||
                  "A team that cares about your outcome, not just your invoice."}
              </h1>
              {t.aboutIntroBlocks.length > 0 ? (
                <p className="text-stone-400 text-lg max-w-2xl mx-auto leading-relaxed">
                  {t.aboutIntroBlocks[0]}
                </p>
              ) : null}
            </div>
          </section>

          {t.aboutNarrativeBlocks.find(
            (item: any) => item.title === "Our Story",
          ) ? (
            <section className="py-20 px-6 bg-[#004f3b]/20">
              <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-14 items-center">
                <img
                  src={
                    typeof t.aboutPageImageCards[0]?.image === "string"
                      ? t.aboutPageImageCards[0].image
                      : t.aboutPageImageCards[0]?.image?.url ||
                        professionalTeamFallback
                  }
                  alt=""
                  className="w-full h-[480px] object-cover rounded-2xl opacity-90"
                />
                <div>
                  <h2
                    className={`text-4xl font-semibold mb-6 text-stone-100 ${HEADING_FONT}`}
                  >
                    Our story
                  </h2>
                  <p className="text-stone-400 text-base leading-relaxed whitespace-pre-line">
                    {
                      t.aboutNarrativeBlocks.find(
                        (item: any) => item.title === "Our Story",
                      )?.body
                    }
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {t.aboutNarrativeBlocks.some(
            (item: any) => item.title !== "Our Story",
          ) ? (
            <section className="py-20 px-6">
              <div className="max-w-7xl mx-auto">
                <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-3">
                  What We Stand For
                </p>
                <h2
                  className={`text-4xl font-semibold mb-12 text-stone-100 ${HEADING_FONT}`}
                >
                  Our values
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {t.aboutNarrativeBlocks
                    .filter((item: any) => item.title !== "Our Story")
                    .map((item: any, i: number) => (
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
                          <p className="text-stone-400 text-sm leading-relaxed">
                            {item.body}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          ) : null}

          {t.founders.length ? (
            <section className="py-24 px-6 bg-[#004f3b]/20">
              <div className="max-w-7xl mx-auto">
                <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-3">
                  The People
                </p>
                <h2
                  className={`text-4xl font-semibold mb-12 text-stone-100 ${HEADING_FONT}`}
                >
                  Leadership team
                </h2>
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

          {t.aboutPageImageCards.length > 1 ? (
            <section className="py-24 px-6">
              <div className="max-w-7xl mx-auto">
                <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-3">
                  {draft?.aboutPageTeamHeading || "Our Team"}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {t.aboutPageImageCards
                    .slice(1)
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
                <section className="pt-36 pb-24 px-6">
                  <div className="max-w-7xl mx-auto grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start md:gap-14">
                    <div className="w-full">
                      {image ? (
                        <img
                          src={typeof image === "string" ? image : image?.url}
                          alt={title}
                          className="h-[300px] w-full rounded-2xl object-cover md:h-[480px]"
                        />
                      ) : (
                        <div className="h-[300px] w-full rounded-2xl bg-emerald-900 md:h-[480px]" />
                      )}
                    </div>
                    <div className="flex flex-col md:h-[480px]">
                      <div className="shrink-0">
                        <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-4 text-center md:text-left">
                          {page?.name || "Service"}
                        </p>
                        <h1 className={`text-3xl md:text-4xl font-semibold text-stone-100 mb-4 ${HEADING_FONT} text-center md:text-left`}>
                          {title}
                        </h1>
                        {price ? (
                          <p className="text-stone-400 text-lg mb-4 text-center md:text-left">{price}</p>
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
                                  className="flex items-start gap-2 text-sm leading-relaxed text-stone-400"
                                >
                                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                  <span>{point}</span>
                                </li>
                              ))}
                          </ul>
                        ) : null}
                      </div>
                      <div className="shrink-0">
                        {t.leadSubmitted ? (
                          <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-2xl p-8 text-center">
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
                            <p className={`text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-2 ${HEADING_FONT}`}>
                              Enquire now
                            </p>
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
                <section className="relative h-[50svh] min-h-[320px] overflow-hidden md:h-[60vh] md:min-h-[400px] bg-[#002c22]">
                  {t.selectedProductHeroImage ? (
                    <img
                      src={t.selectedProductHeroImage}
                      alt={t.selectedProductPage?.name || "Service"}
                      className="absolute inset-0 h-full w-full object-cover opacity-50"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#002c22] to-[#002c22]/40" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end gap-2 px-6 pb-10 text-center md:pb-14">
                    <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-2">
                      {t.selectedProductPage?.name}
                    </p>
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
              <section className="pt-16 pb-24 px-6">
                <div className="max-w-7xl mx-auto">
                  <h2
                    className={`mb-10 text-center text-4xl font-semibold text-stone-100 ${HEADING_FONT}`}
                  >
                    {`${String((t.selectedProductPage as any)?.heading || t.selectedProductPage?.name || "").trim() || "Our"} Services`}
                  </h2>
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
            <section className="relative pt-36 pb-16 px-6 overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(#ffb900 1px, transparent 1px), linear-gradient(90deg, #ffb900 1px, transparent 1px)",
                  backgroundSize: "60px 60px",
                }}
              />
              <div className="relative max-w-7xl mx-auto text-center">
                <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-4 text-center">
                  Services
                </p>
                <h1
                  className={`text-5xl md:text-6xl font-semibold leading-tight max-w-3xl mx-auto text-center text-stone-100 mb-6 ${HEADING_FONT}`}
                >
                  {String(draft?.productTitle || "").trim() ||
                    "Everything you need to build and scale."}
                </h1>
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
          <section className="pt-36 pb-16 px-6">
            <div className="max-w-7xl mx-auto text-center">
              <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-4">
                Gallery
              </p>
              <h1
                className={`text-5xl md:text-6xl font-semibold leading-tight max-w-2xl mx-auto text-stone-100 mb-4 ${HEADING_FONT}`}
              >
                Inside our world.
              </h1>
              <p className="text-stone-400 text-lg">
                A look at our events, team moments, and client work.
              </p>
            </div>
          </section>
          <section className="px-6 pb-24">
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
        <section className="pt-36 pb-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center gap-4 text-center mb-14">
              <div>
                <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-3">
                  Client Stories
                </p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {t.visibleTestimonials.map((item: any) => (
                <div
                  key={item.key}
                  className="min-h-[254px] bg-[#004f3b]/40 border border-[#006045]/50 rounded-xl p-8 flex flex-col gap-6"
                >
                  <p className="text-stone-300 text-base leading-relaxed flex-1">
                    &ldquo;{item.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 border-t border-emerald-800/50 pt-5">
                    <div className="w-10 h-10 rounded-full bg-amber-400 text-emerald-950 font-bold text-sm flex items-center justify-center shrink-0">
                      {item.name
                        ?.split(" ")
                        .map((w: string) => w.charAt(0))
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-stone-100">
                        {item.name}
                      </p>
                      {item.rating ? (
                        <p className="text-amber-400 text-xs">
                          {"★".repeat(item.rating)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {t.testimonialPages > 1 ? (
              <div className="mt-8 flex gap-2 justify-center">
                {Array.from({ length: t.testimonialPages }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => t.setTestimonialIndex(idx)}
                    className={`h-1.5 transition-all rounded-full ${
                      t.testimonialIndex === idx
                        ? "w-8 bg-amber-400"
                        : "w-1.5 bg-stone-600"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ─── PARTNER ─── */}
      {section === "partner" && t.partnerPageEnabled ? (
        <section className="pt-36 pb-24 px-6">
          <div className="max-w-7xl mx-auto">
            <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-4 text-center">
              Partner
            </p>
            <h1
              className={`text-5xl md:text-6xl font-semibold leading-tight max-w-3xl mx-auto text-center text-stone-100 mb-6 ${HEADING_FONT}`}
            >
              {t.partnerPageHeading || "Become a partner"}
            </h1>
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
              <div>
                <h3
                  className={`text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-4 ${HEADING_FONT}`}
                >
                  {t.partnerFormTitle ||
                    `Partner with ${draft?.companyName || "us"}`}
                </h3>
                <div className="space-y-4">
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
        <section className="pt-36 pb-24 px-6">
          <div className="max-w-7xl mx-auto">
            {!t.careersApplyJob ? (
              <>
                <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-4 text-center">
                  Careers
                </p>
                <h1
                  className={`text-5xl md:text-6xl font-semibold leading-tight max-w-3xl mx-auto text-center text-stone-100 mb-6 ${HEADING_FONT}`}
                >
                  {draft?.companyName
                    ? `Join ${draft.companyName}`
                    : "Join our team"}
                </h1>
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
        <section className="pt-36 pb-24 px-6">
          <div className="max-w-7xl mx-auto text-center mb-12">
            <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.15em] sm:text-base md:text-xl lg:text-[26px] mb-4">
              Contact Us
            </p>
            <h1
              className={`text-5xl md:text-6xl font-semibold leading-tight text-stone-100 ${HEADING_FONT}`}
            >
              {draft?.contactTitle || "Let us start a conversation."}
            </h1>
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
            <div className="flex flex-col justify-center gap-6 rounded-2xl border border-emerald-800/50 bg-emerald-900/40 p-8">
              {draft?.companyLogo ? (
                <img
                  src={draft.companyLogo}
                  alt={draft.companyName || "Company"}
                  className="mb-1 h-12 w-auto self-start object-contain"
                />
              ) : null}
              {t.contactEmail ? (
                <a
                  href={`mailto:${t.contactEmail}`}
                  className="flex items-center gap-4 text-stone-300 hover:text-amber-400"
                >
                  <span className="text-amber-400">✉</span>
                  <span>{t.contactEmail}</span>
                </a>
              ) : null}
              {t.contactPhone ? (
                <a
                  href={`tel:${t.contactPhone.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-4 text-stone-300 hover:text-amber-400"
                >
                  <span className="text-amber-400">☎</span>
                  <span>{t.contactPhone}</span>
                </a>
              ) : null}
              {t.contactAddress ? (
                <div className="flex items-start gap-4 text-stone-300">
                  <span className="text-amber-400">⊙</span>
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
