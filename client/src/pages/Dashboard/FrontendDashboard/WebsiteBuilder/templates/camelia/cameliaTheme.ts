// Camelia's look — matches the reference (camelia-template.webflow.io) type system exactly:
// every heading, nav link and button is a bold geometric sans (the reference uses URW Gothic;
// Poppins is the closest widely-available match), while body copy and italic taglines use the
// light-weight Fraunces serif the reference itself uses. Crisp low-radius cards and "matted"
// photos (a cream border like a print mat, not an arch). The header is a plain top bar, not a
// floating pill. It defines the same neutral tp-* primitives Savor/Wayfarer/Haven do, so the
// shared forms, modals and overlays pick up Camelia's styling automatically. Colours are --t-* vars.

export const CAMELIA_FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;1,300;1,400&family=Poppins:wght@500;600;700;800&display=swap');";

export const CAMELIA_CSS = `
${CAMELIA_FONTS}
.cm { --cm-ink-accent: color-mix(in srgb, var(--t-accent) 62%, var(--t-text)); background: var(--t-bg); color: var(--t-text); font-family: 'Fraunces', Georgia, serif; font-weight: 300; -webkit-font-smoothing: antialiased; min-height: 100vh; overflow-x: clip; }
.cm *, .cm *::before, .cm *::after { box-sizing: border-box; }
.cm h1, .cm h2, .cm h3, .cm h4, .cm .tp-display { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.01em; line-height: 1.06; font-weight: 700; }
.cm .tp-tagline { font-family: 'Fraunces', Georgia, serif; font-weight: 300; font-style: italic; }
/* zero specificity, so Tailwind margin utilities (mb-3, mt-4...) still apply */
:where(.cm) :where(h1, h2, h3, h4, p) { margin: 0; }
.cm button, .cm .tp-btn, .cm .cm-navlink, .cm .tp-link, .cm .tp-eyebrow, .cm .tp-tab, .cm .cm-logotype { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; }
.cm img { display: block; max-width: 100%; }
:where(.tp-wrap) { margin-left: auto; margin-right: auto; }
.tp-wrap { width: 100%; max-width: 1180px; padding-left: 22px; padding-right: 22px; }
@media (min-width: 768px) { .tp-wrap { padding-left: 36px; padding-right: 36px; } }
.tp-section { padding-top: 64px; padding-bottom: 64px; }
@media (min-width: 768px) { .tp-section { padding-top: 104px; padding-bottom: 104px; } }

.tp-muted { color: var(--t-muted); }
.tp-eyebrow { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--cm-ink-accent); }
.tp-eyebrow::before { content: ''; width: 22px; height: 1px; background: currentColor; opacity: .7; }
.tp-h1 { font-size: clamp(44px, 8.5vw, 136px); }
.tp-h2 { font-size: clamp(30px, 3.8vw, 48px); }
.tp-h3 { font-size: clamp(21px, 2vw, 27px); }
.tp-lead { font-size: clamp(16px, 1.4vw, 18px); line-height: 1.75; color: var(--t-muted); }

/* surfaces — crisper, lower-radius than Haven's pillowy cards */
.tp-card { background: var(--t-raised); border: 1px solid var(--t-line); border-radius: 4px; transition: transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s, border-color .3s; }
.tp-card-hover { cursor: pointer; }
.tp-card-hover:hover { transform: translateY(-4px); box-shadow: 0 30px 50px -34px color-mix(in srgb, var(--t-text) 55%, transparent); }
.tp-soft { background: var(--t-surface); border-radius: 4px; }
.tp-accent-panel { background: var(--t-accent); color: var(--t-accent-text, #fff); border-radius: 4px; }
.tp-dark-panel { background: var(--t-ink); color: var(--t-on-ink); border-radius: 4px; }

/* buttons */
:where(.tp-btn) { display: inline-flex; }
.tp-btn { align-items: center; justify-content: center; gap: 8px; border-radius: 2px; padding: 14px 28px; font-weight: 600; font-size: 12.5px; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid transparent; cursor: pointer; white-space: nowrap; transition: transform .25s cubic-bezier(.22,1,.36,1), background .2s, color .2s, box-shadow .25s, border-color .2s; }
.tp-btn:hover { transform: translateY(-2px); }
.tp-btn:active { transform: scale(.98); }
.tp-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.tp-btn-primary { background: var(--t-accent); color: var(--t-accent-text, #fff); }
.tp-btn-primary:hover { background: var(--t-accent-dark, var(--t-accent)); box-shadow: 0 14px 26px -14px var(--t-accent); }
.tp-btn-dark { background: var(--t-ink); color: var(--t-on-ink); }
.tp-btn-ghost { background: transparent; color: var(--t-text); border-color: color-mix(in srgb, var(--t-text) 28%, transparent); }
.tp-btn-ghost:hover { border-color: var(--t-text); }
.tp-btn-light { background: #fff; color: #17201b; }
.tp-btn-sm { padding: 9px 20px; font-size: 11px; }
.tp-link { font-weight: 600; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cm-ink-accent); display: inline-flex; align-items: center; gap: 8px; cursor: pointer; background: none; border: 0; padding: 0; }
.tp-link:hover { text-decoration: underline; text-underline-offset: 4px; }
.tp-link .tp-arrow { transition: transform .25s; }
.tp-link:hover .tp-arrow { transform: translateX(4px); }

/* chips & tabs */
.tp-chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 2px; padding: 5px 12px; font-size: 11.5px; font-weight: 600; letter-spacing: 0.04em; background: color-mix(in srgb, var(--t-text) 7%, transparent); color: var(--t-text); }
.tp-chip-accent { background: color-mix(in srgb, var(--t-accent) 16%, transparent); color: var(--cm-ink-accent); }
.tp-tab { border-radius: 2px; padding: 9px 18px; font-size: 13px; font-weight: 600; letter-spacing: 0.03em; cursor: pointer; border: 1px solid color-mix(in srgb, var(--t-text) 20%, transparent); background: transparent; color: var(--t-text); transition: all .2s; white-space: nowrap; }
.tp-tab:hover { border-color: var(--t-text); }
.tp-tab[aria-pressed="true"] { background: var(--t-text); color: var(--t-bg); border-color: var(--t-text); }

/* forms */
.tp-label { display: block; font-size: 11.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 8px; color: var(--t-muted); }
.tp-input { width: 100%; background: var(--t-bg); border: 1px solid var(--t-line); border-radius: 2px; padding: 13px 16px; font-size: 15px; outline: none; color: var(--t-text); transition: border-color .15s, box-shadow .15s; font-family: inherit; }
.tp-input::placeholder { color: color-mix(in srgb, var(--t-text) 40%, transparent); }
.tp-input:focus { border-color: var(--t-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--t-accent) 18%, transparent); }
.tp-input:disabled { opacity: .55; }
textarea.tp-input { resize: vertical; min-height: 96px; }

/* imagery */
.tp-zoom { overflow: hidden; }
.tp-zoom img { width: 100%; height: 100%; object-fit: cover; transition: transform 1.1s cubic-bezier(.22,1,.36,1); }
.tp-card-hover:hover .tp-zoom img, .tp-zoom:hover img { transform: scale(1.05); }
.tp-ph { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(160deg, color-mix(in srgb, var(--t-accent) 22%, var(--t-surface)), color-mix(in srgb, var(--t-text) 8%, var(--t-surface))); color: var(--cm-ink-accent); font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; font-weight: 700; font-size: 46px; }
.tp-fill { position: relative; overflow: hidden; }
.tp-fill > img, .tp-fill > .tp-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.tp-clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tp-clamp3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.tp-diet { width: 16px; height: 16px; border: 1.5px solid; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; background: #fff; }
.tp-diet::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.tp-blob { display: none; }
.tp-scroll-x { display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 12px; scrollbar-width: none; }
.tp-scroll-x::-webkit-scrollbar { display: none; }
.tp-scroll-x > * { scroll-snap-align: start; flex: 0 0 auto; }

/* camelia-only pieces */
/* a "matted" photo — a cream/paper border like a print mat, small radius, not an arch */
.cm-frame { position: relative; border-radius: 3px; overflow: hidden; padding: 10px; background: var(--t-raised); box-shadow: 0 30px 60px -36px color-mix(in srgb, var(--t-text) 45%, transparent); }
.cm-frame > img, .cm-frame > .tp-ph, .cm-frame .tp-fill { border-radius: 1px; }
.cm-frame.tp-zoom { overflow: hidden; }
.cm-frame .tp-fill { position: absolute; inset: 10px; width: auto; height: auto; }
/* the navbar's own row spans the full browser width (unlike tp-wrap's 1180px content column) —
   the reference's nav items sit right at the page's edges, not centred in a content column */
.cm-nav-wrap { width: 100%; padding-left: 22px; padding-right: 22px; }
@media (min-width: 768px) { .cm-nav-wrap { padding-left: 36px; padding-right: 36px; } }
/* plain top bar, not a floating pill — fully solid once scrolled past the hero, so the page
   behind it never shows through */
.cm-bar { background: var(--t-bg); border-bottom: 1px solid var(--t-line); transition: background .3s, border-color .3s; }
/* on the home page only, the bar starts transparent over the hero — white text over the video,
   like the reference — and swaps to .cm-bar once scrolled past it */
.cm-bar-transparent { background: transparent; border-bottom: 1px solid transparent; transition: background .3s, border-color .3s; }
.cm-bar-transparent .cm-navlink, .cm-bar-transparent .cm-logotype { color: #fff; }
.cm-bar-transparent .cm-navlink::after { background: #fff; }
/* still used for the mobile sticky CTA and the floating hero price card */
.cm-pill { background: color-mix(in srgb, var(--t-raised) 92%, transparent); backdrop-filter: blur(14px); border: 1px solid var(--t-line); box-shadow: 0 18px 40px -26px color-mix(in srgb, var(--t-text) 60%, transparent); }
.cm-logotype { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; }
.cm-navlink { position: relative; padding: 8px 2px; font-size: 12.5px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; background: none; border: 0; cursor: pointer; color: var(--t-text); }
.cm-navlink::after { content: ''; position: absolute; left: 2px; right: 2px; bottom: 3px; height: 1px; background: currentColor; transform: scaleX(0); transform-origin: left; transition: transform .25s; }
.cm-navlink:hover::after { transform: scaleX(1); }
.cm-navlink[aria-current="page"] { color: var(--cm-ink-accent); }
.cm-navlink[aria-current="page"]::after { transform: scaleX(1); background: var(--cm-ink-accent); }
.cm-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
/* the small circular "scroll for more" cue at the bottom of the hero */
.cm-scroll-cue { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,255,255,.4); color: #fff; animation: cm-bob 2.2s ease-in-out infinite; }
@keyframes cm-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
/* the circular ringed icon badge above each amenity (the reference's "Services" grid) */
.cm-amenity-icon { display: inline-flex; align-items: center; justify-content: center; width: 84px; height: 84px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--t-accent) 45%, transparent); color: var(--cm-ink-accent); }
.cm-amenity-icon svg { width: 34px; height: 34px; }
.cm-spec { display: flex; align-items: center; gap: 12px; }
.cm-spec-icon { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 2px; background: color-mix(in srgb, var(--t-accent) 16%, transparent); color: var(--cm-ink-accent); flex: none; }
.cm-rule { border-top: 1px solid var(--t-line); }
.cm-num { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; font-weight: 700; color: var(--cm-ink-accent); }
.cm-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 14.5px; }
.cm-table th, .cm-table td { padding: 14px 18px; text-align: left; vertical-align: middle; border-bottom: 1px solid var(--t-line); }
.cm-table thead th { font-weight: 600; background: var(--t-surface); }
.cm-table tbody th { font-weight: 600; color: var(--t-muted); font-size: 13px; white-space: nowrap; }
.cm-snap { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
.cm-snap::-webkit-scrollbar { display: none; }
.cm-snap > * { scroll-snap-align: center; flex: 0 0 auto; }
/* a full-bleed scroller whose first item lines up with the page's content column */
.cm-bleed { padding-left: max(22px, calc((100vw - 1180px) / 2 + 22px)); padding-right: 22px; scroll-padding-left: max(22px, calc((100vw - 1180px) / 2 + 22px)); }
@media (min-width: 768px) { .cm-bleed { padding-left: max(36px, calc((100vw - 1180px) / 2 + 36px)); padding-right: 36px; scroll-padding-left: max(36px, calc((100vw - 1180px) / 2 + 36px)); } }

/* a full-bleed dark band (Location / Offers), not a rounded panel card like tp-dark-panel */
.cm-band { background: var(--t-ink); color: var(--t-on-ink); }
.cm-band .tp-eyebrow, .cm-band .cm-ink-accent-on-dark { color: color-mix(in srgb, var(--t-accent-light, var(--t-accent)) 85%, var(--t-on-ink)); }
/* a large circular icon button (footer email / phone) */
.cm-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--t-on-ink) 30%, transparent); color: var(--t-on-ink); transition: border-color .2s, background .2s; }
.cm-icon-btn:hover { border-color: var(--t-on-ink); background: color-mix(in srgb, var(--t-on-ink) 8%, transparent); }
/* whole-card hover for suite cards — zooms the photo and nudges the "more info" arrow even
   when the pointer is over the title/description, not just the image itself */
.cm-suite:hover .tp-zoom img { transform: scale(1.06); }
.cm-suite:hover h3 { color: var(--cm-ink-accent); }
.cm-suite:hover .tp-arrow { transform: translateX(4px); }
/* a big photo tile with a bold caption pinned to the bottom (the "highlights" band) */
.cm-tile { position: relative; overflow: hidden; }
.cm-tile::after { content: ''; position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,.55), rgba(0,0,0,0) 45%); }
.cm-tile-caption { position: absolute; left: 0; right: 0; bottom: 0; z-index: 1; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 28px; }
.cm-tile-arrow { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,.92); color: #17201b; flex: none; transition: transform .3s cubic-bezier(.22,1,.36,1), background .2s; }
.cm-tile:hover .cm-tile-arrow { transform: rotate(45deg); background: #fff; }

.cm :focus-visible { outline: 3px solid color-mix(in srgb, var(--t-accent) 70%, transparent); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  .cm *, .cm *::before, .cm *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
}
`;
