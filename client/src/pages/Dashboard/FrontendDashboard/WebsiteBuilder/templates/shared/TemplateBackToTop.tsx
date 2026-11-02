import React, { useEffect, useState } from "react";

type BackToTopSpec = {
  bg: string;
  fg: string;
  border: string;
  radius: string;
  shadow: string;
  font: string;
};

const BACK_TO_TOP_SPECS: Record<string, BackToTopSpec> = {
  default: { bg: "#ffffff", fg: "#1f2937", border: "#dbe3ef", radius: "14px", shadow: "0 14px 34px rgba(30,64,175,.16)", font: "'Poppins', sans-serif" },
  "minimal-swiss": { bg: "#050505", fg: "#ffffff", border: "#050505", radius: "0", shadow: "6px 6px 0 #d7263d", font: "'Inter', sans-serif" },
  "fresh-studio": { bg: "#0e0e0e", fg: "#ffffff", border: "#d94b4b", radius: "5px", shadow: "0 14px 32px rgba(14,14,14,.24)", font: "'Inter', sans-serif" },
  savor: { bg: "#e4572e", fg: "#fff7ed", border: "#e4572e", radius: "50%", shadow: "0 16px 34px rgba(228,87,46,.3)", font: "'Bricolage Grotesque', sans-serif" },
  tastyc: { bg: "#10282b", fg: "#fffdf8", border: "#cf7736", radius: "50%", shadow: "0 16px 36px rgba(6,25,27,.34)", font: "'Playfair Display', Georgia, serif" },
  wayfarer: { bg: "#0c2a2e", fg: "#ffffff", border: "#f26b3a", radius: "999px", shadow: "0 15px 34px rgba(12,42,46,.28)", font: "'Sora', sans-serif" },
  travigo: { bg: "#d8ff48", fg: "#111111", border: "#111111", radius: "12px 12px 2px 12px", shadow: "5px 5px 0 #111111", font: "'Manrope', sans-serif" },
  haven: { bg: "#f4f1ea", fg: "#26312b", border: "#5b7f6a", radius: "28px 28px 8px 8px", shadow: "0 16px 34px rgba(38,49,43,.2)", font: "'Fraunces', Georgia, serif" },
  camelia: { bg: "#f6f3ec", fg: "#2b2a26", border: "#8a9a86", radius: "50%", shadow: "0 16px 34px rgba(43,42,38,.18)", font: "'Poppins', sans-serif" },
  commons: { bg: "#ffc21a", fg: "#0b1f3a", border: "#0b1f3a", radius: "10px", shadow: "5px 5px 0 #0b1f3a", font: "'Plus Jakarta Sans', sans-serif" },
  huddle: { bg: "#3b6cf0", fg: "#ffffff", border: "#3b6cf0", radius: "50%", shadow: "0 16px 34px rgba(59,108,240,.3)", font: "'Sora', sans-serif" },
  flowspace: { bg: "#d9ff4f", fg: "#10110f", border: "#10110f", radius: "999px", shadow: "4px 4px 0 #10110f", font: "'Inter', sans-serif" },
  workscape: { bg: "#ffffff", fg: "#20201f", border: "#a99d93", radius: "50%", shadow: "0 15px 34px rgba(32,32,31,.18)", font: "'Inter', sans-serif" },
  brixspace: { bg: "#078b52", fg: "#ffffff", border: "#ffffff", radius: "18px", shadow: "0 16px 34px rgba(7,139,82,.28)", font: "'DM Sans', sans-serif" },
  worpace: { bg: "#f7f7e8", fg: "#11110f", border: "#11110f", radius: "5px", shadow: "5px 5px 0 rgba(17,17,15,.9)", font: "'Inter', sans-serif" },
  qerja: { bg: "#f3c441", fg: "#003f3a", border: "#003f3a", radius: "50%", shadow: "0 16px 34px rgba(0,63,58,.25)", font: "'Manrope', sans-serif" },
  grindelwald: { bg: "#1b3936", fg: "#75ff69", border: "#75ff69", radius: "50%", shadow: "0 0 0 5px rgba(117,255,105,.14),0 16px 34px rgba(27,57,54,.3)", font: "'Bodoni Moda', serif" },
  "warm-organic": { bg: "#2b211a", fg: "#f1e6d3", border: "#b85c38", radius: "62% 38% 58% 42%", shadow: "0 16px 34px rgba(43,33,26,.25)", font: "Georgia, serif" },
  "emerald-studio": { bg: "rgba(54,87,127,.9)", fg: "#ffffff", border: "rgba(255,255,255,.45)", radius: "16px", shadow: "0 18px 38px rgba(24,44,70,.3)", font: "'Fraunces', Georgia, serif" },
  "figma-make": { bg: "rgba(54,87,127,.9)", fg: "#ffffff", border: "rgba(255,255,255,.45)", radius: "16px", shadow: "0 18px 38px rgba(24,44,70,.3)", font: "'Fraunces', Georgia, serif" },
};

const TEMPLATES_WITH_OWN_BUTTON = new Set([
  "aromatica",
  "grandbar",
  "lodge",
  "cali-hostel",
  "tulum",
]);

const MOBILE_CTA_TEMPLATES = new Set([
  "wayfarer",
  "haven",
  "camelia",
  "commons",
  "huddle",
]);

const BACK_TO_TOP_CSS = String.raw`
  .template-back-to-top{position:fixed;right:clamp(16px,2.2vw,32px);bottom:clamp(16px,2.2vw,32px);z-index:75;display:grid;width:52px;height:52px;place-items:center;border:1px solid var(--tbt-border);border-radius:var(--tbt-radius);background:var(--tbt-bg);color:var(--tbt-fg);box-shadow:var(--tbt-shadow);font-family:var(--tbt-font);cursor:pointer;backdrop-filter:blur(12px);transition:opacity .24s ease,transform .28s cubic-bezier(.22,1,.36,1),background-color .2s ease,box-shadow .2s ease}
  .template-back-to-top[data-visible="false"]{opacity:0;pointer-events:none;transform:translateY(18px) scale(.9)}
  .template-back-to-top[data-visible="true"]{opacity:1;pointer-events:auto;transform:none}
  .template-back-to-top:hover{transform:translateY(-3px);filter:brightness(1.04)}
  .template-back-to-top:focus-visible{outline:3px solid color-mix(in srgb,var(--tbt-fg) 42%,transparent);outline-offset:4px}
  .template-back-to-top svg{width:21px;height:21px;overflow:visible;transition:transform .22s ease}
  .template-back-to-top:hover svg{transform:translateY(-2px)}
  .template-back-to-top--minimal-swiss svg,.template-back-to-top--worpace svg{stroke-width:1.5}
  .template-back-to-top--travigo,.template-back-to-top--commons,.template-back-to-top--flowspace,.template-back-to-top--worpace{border-width:2px}
  @media(max-width:1023px){.template-back-to-top{right:14px;bottom:calc(14px + env(safe-area-inset-bottom));width:46px;height:46px}.template-back-to-top[data-mobile-cta="true"]{bottom:calc(82px + env(safe-area-inset-bottom))}}
  @media(prefers-reduced-motion:reduce){.template-back-to-top,.template-back-to-top svg{transition:none!important}.template-back-to-top:hover{transform:none}}
`;

const findScroller = (): HTMLElement | Window =>
  document.getElementById("scrollable-content") ||
  document.querySelector<HTMLElement>('[data-template-scroll-root="true"]') ||
  window;

const readScrollTop = (target: HTMLElement | Window) =>
  target === window ? window.scrollY : (target as HTMLElement).scrollTop;

type TemplateBackToTopProps = { themeVariant?: string | null };

const TemplateBackToTop: React.FC<TemplateBackToTopProps> = ({ themeVariant }) => {
  const key = String(themeVariant || "default").trim() || "default";
  const spec = BACK_TO_TOP_SPECS[key];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!spec || TEMPLATES_WITH_OWN_BUTTON.has(key)) return undefined;
    const target = findScroller();
    const update = () => setVisible(readScrollTop(target) > 520);
    update();
    target.addEventListener("scroll", update, { passive: true });
    return () => target.removeEventListener("scroll", update);
  }, [key, spec]);

  if (!spec || TEMPLATES_WITH_OWN_BUTTON.has(key)) return null;

  return (
    <>
      <style>{BACK_TO_TOP_CSS}</style>
      <button
        type="button"
        className={`template-back-to-top template-back-to-top--${key}`}
        data-visible={visible}
        data-mobile-cta={MOBILE_CTA_TEMPLATES.has(key)}
        aria-hidden={!visible}
        aria-label="Back to top"
        tabIndex={visible ? 0 : -1}
        title="Back to top"
        style={{
          "--tbt-bg": spec.bg,
          "--tbt-fg": spec.fg,
          "--tbt-border": spec.border,
          "--tbt-radius": spec.radius,
          "--tbt-shadow": spec.shadow,
          "--tbt-font": spec.font,
        } as React.CSSProperties}
        onClick={() => {
          const target = findScroller();
          const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
          target.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 14.5 12 7l7 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );
};

export default TemplateBackToTop;
