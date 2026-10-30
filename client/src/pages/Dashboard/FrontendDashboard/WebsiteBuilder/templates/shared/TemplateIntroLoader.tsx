import React, { useEffect, useMemo, useState } from "react";

type LoaderSpec = {
  label: string;
  kicker: string;
  motif: string;
  bg: string;
  fg: string;
  accent: string;
  font: string;
};

const LOADER_SPECS: Record<string, LoaderSpec> = {
  default: { label: "Classic", kicker: "Welcome", motif: "classic", bg: "#f4f6f8", fg: "#172033", accent: "#2563eb", font: "'Poppins', sans-serif" },
  "minimal-swiss": { label: "Minimal Swiss", kicker: "Edition 01", motif: "swiss", bg: "#ffffff", fg: "#090909", accent: "#d7263d", font: "'Inter', sans-serif" },
  "fresh-studio": { label: "Fresh Studio", kicker: "Fresh ideas loading", motif: "fresh", bg: "#f7fff8", fg: "#0e0e0e", accent: "#d94b4b", font: "'Inter', sans-serif" },
  savor: { label: "Savor", kicker: "A table is waiting", motif: "savor", bg: "#fff7ed", fg: "#2a1a12", accent: "#e4572e", font: "'Bricolage Grotesque', sans-serif" },
  wayfarer: { label: "Wayfarer", kicker: "Your stay starts here", motif: "wayfarer", bg: "#f3fbfa", fg: "#0c2a2e", accent: "#f26b3a", font: "'Sora', sans-serif" },
  travigo: { label: "Travigo", kicker: "Ready for departure", motif: "travigo", bg: "#f5f3ed", fg: "#111111", accent: "#b6dc26", font: "'Manrope', sans-serif" },
  haven: { label: "Haven", kicker: "Come on in", motif: "haven", bg: "#f4f1ea", fg: "#26312b", accent: "#5b7f6a", font: "'Fraunces', Georgia, serif" },
  camelia: { label: "Camelia", kicker: "A quieter arrival", motif: "camelia", bg: "#f6f3ec", fg: "#2b2a26", accent: "#8a9a86", font: "'Poppins', sans-serif" },
  commons: { label: "Commons", kicker: "Making space", motif: "commons", bg: "#f6f7f9", fg: "#0b1f3a", accent: "#ffc21a", font: "'Plus Jakarta Sans', sans-serif" },
  huddle: { label: "Huddle", kicker: "Your room is nearly ready", motif: "huddle", bg: "#f5f6f8", fg: "#14161a", accent: "#3b6cf0", font: "'Sora', sans-serif" },
  "warm-organic": { label: "Warm Organic", kicker: "Rooted in good things", motif: "organic", bg: "#f1e6d3", fg: "#2b211a", accent: "#b85c38", font: "Georgia, serif" },
  "emerald-studio": { label: "Emerald Studio", kicker: "Shaping something clear", motif: "emerald", bg: "#36577f", fg: "#ffffff", accent: "#dbeafe", font: "'Fraunces', Georgia, serif" },
  "figma-make": { label: "Emerald Studio", kicker: "Shaping something clear", motif: "emerald", bg: "#36577f", fg: "#ffffff", accent: "#dbeafe", font: "'Fraunces', Georgia, serif" },
  lodge: { label: "Lodge", kicker: "Settle in", motif: "lodge", bg: "#f5f3ee", fg: "#1c1f21", accent: "#7fa388", font: "'Inter', sans-serif" },
  "cali-hostel": { label: "Cali Hostel", kicker: "Checking in", motif: "cali", bg: "#f2eadb", fg: "#171711", accent: "#e86d43", font: "'Instrument Serif', Georgia, serif" },
};

const playedLoaders = new Set<string>();

const LOADER_CSS = String.raw`
  .template-intro-loader{--til-bg:#fff;--til-fg:#111;--til-accent:#2563eb;position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;background:var(--til-bg);color:var(--til-fg);animation:tilExit .24s ease 1.02s both}
  .template-intro-loader::before{content:"";position:absolute;inset:-40%;background:radial-gradient(circle at 50% 48%,color-mix(in srgb,var(--til-accent) 13%,transparent),transparent 36%);animation:tilBreathe 1s ease both}
  .til-stage{position:relative;display:flex;min-width:min(78vw,360px);flex-direction:column;align-items:center;text-align:center}
  .til-kicker{margin-bottom:18px;font:700 10px/1.2 inherit;letter-spacing:.2em;text-transform:uppercase;opacity:.62;animation:tilRise .5s ease both}
  .til-symbol{position:relative;width:76px;height:76px;margin-bottom:21px}
  .til-symbol i{position:absolute;display:block;background:var(--til-accent)}
  .til-name{max-width:min(86vw,560px);font:600 clamp(28px,5vw,54px)/.95 inherit;letter-spacing:-.045em;animation:tilRise .55s .08s ease both}
  .til-progress{width:112px;height:2px;margin-top:26px;overflow:hidden;background:color-mix(in srgb,var(--til-fg) 14%,transparent)}
  .til-progress i{display:block;width:100%;height:100%;background:var(--til-accent);transform-origin:left;animation:tilProgress 1s cubic-bezier(.65,0,.35,1) both}
  .til--classic .til-symbol i{left:8px;height:4px;transform-origin:left;animation:tilLine .55s ease both}
  .til--classic .til-symbol i:nth-child(1){top:18px;width:60px}.til--classic .til-symbol i:nth-child(2){top:36px;width:44px;animation-delay:.08s}.til--classic .til-symbol i:nth-child(3){top:54px;width:54px;animation-delay:.16s}
  .til--swiss .til-symbol{border:1px solid var(--til-fg)}.til--swiss .til-symbol::before{content:"01";position:absolute;top:8px;left:9px;font:800 20px/1 inherit}.til--swiss .til-symbol::after{content:"";position:absolute;right:8px;bottom:8px;width:22px;height:22px;border-radius:50%;background:var(--til-accent);animation:tilDot .6s ease both}.til--swiss .til-symbol i:first-child{left:0;top:37px;width:100%;height:1px}.til--swiss .til-symbol i:nth-child(2){left:37px;top:0;width:1px;height:100%}
  .til--fresh .til-symbol i{inset:18px;border-radius:50%;background:var(--til-accent);animation:tilDot .62s ease both}.til--fresh .til-symbol::before,.til--fresh .til-symbol::after{content:"";position:absolute;inset:9px;border:1px solid var(--til-accent);border-radius:50%;animation:tilRing .85s ease-out both}.til--fresh .til-symbol::after{inset:0;animation-delay:.12s}
  .til--savor .til-symbol{border:2px solid var(--til-fg);border-radius:50%}.til--savor .til-symbol::before{content:"";position:absolute;inset:11px;border:1px solid color-mix(in srgb,var(--til-fg) 45%,transparent);border-radius:50%}.til--savor .til-symbol::after{content:"";position:absolute;top:5px;right:4px;width:15px;height:8px;border-radius:100% 0 100% 0;background:var(--til-accent);transform:rotate(28deg);animation:tilLeaf .65s ease both}
  .til--wayfarer .til-symbol{height:54px;margin-top:12px;border-top:2px dashed var(--til-fg);transform:rotate(-9deg)}.til--wayfarer .til-symbol::after{content:"";position:absolute;top:-7px;left:0;width:12px;height:12px;border:3px solid var(--til-accent);border-radius:50% 50% 50% 0;background:var(--til-bg);transform:rotate(-36deg);animation:tilTravel .9s ease-in-out both}
  .til--travigo .til-symbol{display:grid;place-items:center;border:2px solid var(--til-fg);border-radius:50%;transform:rotate(-8deg);animation:tilStamp .55s ease both}.til--travigo .til-symbol::before{content:"GO";display:grid;place-items:center;position:absolute;inset:7px;border:1px dashed var(--til-fg);border-radius:50%;font:800 19px/1 inherit;color:var(--til-accent)}
  .til--haven .til-symbol{overflow:hidden;border:2px solid var(--til-fg);border-bottom:0;border-radius:38px 38px 0 0}.til--haven .til-symbol i{bottom:0;width:50%;height:65%;background:var(--til-accent);animation:tilDoor .72s ease both}.til--haven .til-symbol i:first-child{left:0;transform-origin:left}.til--haven .til-symbol i:nth-child(2){right:0;transform-origin:right}
  .til--camelia .til-symbol{animation:tilTurn .9s ease both}.til--camelia .til-symbol i{left:28px;top:6px;width:20px;height:32px;border-radius:100% 0;background:var(--til-accent);transform-origin:10px 32px}.til--camelia .til-symbol i:nth-child(2){transform:rotate(90deg)}.til--camelia .til-symbol i:nth-child(3){transform:rotate(180deg)}.til--camelia .til-symbol i:nth-child(4){transform:rotate(270deg)}
  .til--commons .til-symbol{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.til--commons .til-symbol i{position:relative;inset:auto;width:35px;height:35px;background:var(--til-fg);animation:tilTile .45s ease both}.til--commons .til-symbol i:nth-child(2){background:var(--til-accent);animation-delay:.08s}.til--commons .til-symbol i:nth-child(3){animation-delay:.16s}.til--commons .til-symbol i:nth-child(4){animation-delay:.24s}
  .til--huddle .til-symbol{border:2px solid var(--til-fg);border-radius:50%}.til--huddle .til-symbol::before,.til--huddle .til-symbol::after{content:"";position:absolute;left:36px;top:15px;width:2px;height:23px;background:var(--til-accent);transform-origin:bottom;animation:tilHand .9s ease both}.til--huddle .til-symbol::after{top:26px;height:12px;background:var(--til-fg);animation-duration:.65s}
  .til--organic .til-symbol::before,.til--organic .til-symbol::after{content:"";position:absolute;bottom:10px;width:35px;height:52px;border:2px solid var(--til-accent)}.til--organic .til-symbol::before{left:7px;border-radius:100% 0 100% 0;transform-origin:bottom right;animation:tilLeaf .7s ease both}.til--organic .til-symbol::after{right:7px;border-radius:0 100% 0 100%;transform-origin:bottom left;animation:tilLeaf .7s .12s ease both}
  .til--emerald .til-symbol::before{content:"";position:absolute;inset:8px;background:linear-gradient(135deg,var(--til-accent),color-mix(in srgb,var(--til-accent) 18%,transparent));clip-path:polygon(50% 0,100% 35%,78% 100%,22% 100%,0 35%);animation:tilGem .85s ease both}.til--emerald .til-symbol::after{content:"";position:absolute;inset:20px;border:1px solid var(--til-bg);clip-path:polygon(50% 0,100% 35%,78% 100%,22% 100%,0 35%)}
  .til--lodge .til-symbol::before{content:"";position:absolute;inset:4px;background:var(--til-fg);clip-path:polygon(50% 0,100% 92%,94% 92%,50% 12%,6% 92%,0 92%);animation:tilRise .6s ease both}.til--lodge .til-symbol::after{content:"";position:absolute;left:19px;right:19px;top:44px;height:2px;background:var(--til-accent);animation:tilLine .55s .15s ease both}
  .til--cali .til-symbol{display:grid;place-items:center;border:2px solid var(--til-fg);border-radius:50%;animation:tilStamp .55s ease both}.til--cali .til-symbol::before{content:"STAY";display:grid;place-items:center;position:absolute;inset:6px;border:1px dashed var(--til-fg);border-radius:50%;font:800 14px/1 inherit;letter-spacing:.12em;color:var(--til-accent)}
  @keyframes tilExit{to{opacity:0;visibility:hidden}}@keyframes tilBreathe{0%{transform:scale(.75);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes tilRise{from{opacity:0;transform:translateY(13px)}to{opacity:1;transform:none}}@keyframes tilProgress{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes tilLine{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes tilDot{from{transform:scale(0)}to{transform:scale(1)}}@keyframes tilRing{from{opacity:.8;transform:scale(.45)}to{opacity:0;transform:scale(1)}}@keyframes tilLeaf{from{opacity:0;transform:scale(.25) rotate(-18deg)}to{opacity:1}}@keyframes tilTravel{from{left:0}to{left:64px}}@keyframes tilStamp{0%{opacity:0;transform:scale(1.45) rotate(-8deg)}65%{opacity:1;transform:scale(.94) rotate(-8deg)}100%{transform:scale(1) rotate(-8deg)}}@keyframes tilDoor{from{transform:scaleX(1)}to{transform:scaleX(.18)}}@keyframes tilTurn{from{opacity:0;transform:rotate(-70deg) scale(.55)}to{opacity:1;transform:none}}@keyframes tilTile{from{opacity:0;transform:translateY(12px) scale(.8)}to{opacity:1;transform:none}}@keyframes tilHand{from{transform:rotate(-140deg)}to{transform:rotate(30deg)}}@keyframes tilGem{0%{opacity:0;transform:rotate(-25deg) scale(.65)}70%{opacity:1;transform:rotate(4deg) scale(1.05)}100%{transform:none}}
  @media (prefers-reduced-motion:reduce){.template-intro-loader,.template-intro-loader::before,.template-intro-loader *{animation:none!important}.template-intro-loader{opacity:1}.til-progress i{transform:none}}
`;

type TemplateIntroLoaderProps = {
  themeVariant?: string | null;
  companyName?: string | null;
};

const TemplateIntroLoader: React.FC<TemplateIntroLoaderProps> = ({
  themeVariant,
  companyName,
}) => {
  const key = String(themeVariant || "default").trim() || "default";
  const spec = LOADER_SPECS[key];
  const [visible, setVisible] = useState(() => Boolean(spec && !playedLoaders.has(key)));
  const displayName = useMemo(() => {
    const name = String(companyName || "").trim();
    return name && name !== "Website Preview" ? name : spec?.label;
  }, [companyName, spec]);

  useEffect(() => {
    if (!visible || !spec) return undefined;
    playedLoaders.add(key);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setVisible(false), reducedMotion ? 220 : 1320);
    return () => window.clearTimeout(timer);
  }, [key, spec, visible]);

  if (!visible || !spec) return null;

  return (
    <div
      className={`template-intro-loader til--${spec.motif}`}
      style={{
        "--til-bg": spec.bg,
        "--til-fg": spec.fg,
        "--til-accent": spec.accent,
        fontFamily: spec.font,
      } as React.CSSProperties}
      role="status"
      aria-live="polite"
      aria-label={`Opening ${displayName}`}
    >
      <style>{LOADER_CSS}</style>
      <div className="til-stage">
        <span className="til-kicker">{spec.kicker}</span>
        <span className="til-symbol" aria-hidden="true">
          <i /><i /><i /><i />
        </span>
        <strong className="til-name">{displayName}</strong>
        <span className="til-progress" aria-hidden="true"><i /></span>
      </div>
    </div>
  );
};

export default TemplateIntroLoader;
