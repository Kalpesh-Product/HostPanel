import { WAYFARER_CSS } from "../wayfarer/wayfarerTheme";

// Lodge follows the layout and motion of a clean rental-house template: a full-bleed hero with
// a photo slider, a white intro with three photo cards, pill-shaped amenity chips, a full-width
// feature photo, rolling counters, a dark quote band and a property panel. Inter throughout.
// Colours come from the template palette (--t-accent is the sage tone), so an owner's own
// accent colour recolours the tabs and chips too.
export const LODGE_CSS = `
${WAYFARER_CSS}
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap');

.ld { background: var(--t-bg); color: var(--t-text); font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif; font-size: 16px; }
.ld h1, .ld h2, .ld h3, .ld h4 { font-family: 'Newsreader', Georgia, serif; font-weight: 500; letter-spacing: -.025em; }
.ld .tp-wrap { max-width: 1320px; }
.ld .tp-section { padding-top: 96px; padding-bottom: 96px; }

.ld-h1 { font-size: clamp(54px, 7.4vw, 104px); font-weight: 500; line-height: .94; letter-spacing: -.045em; text-wrap: balance; }
.ld-h2 { font-size: clamp(32px, 3.4vw, 42px); line-height: 1.25; letter-spacing: -.015em; }
.ld-h2-lg { font-size: clamp(36px, 5vw, 62px); line-height: 1.08; letter-spacing: -.025em; }
.ld-lead { font-size: 16px; line-height: 26px; letter-spacing: -.01em; }
.ld-muted { color: color-mix(in srgb, var(--t-text) 70%, transparent); }

.ld-label { display: inline-block; border: 1px solid color-mix(in srgb, var(--t-text) 70%, transparent); border-radius: 999px; padding: 4px 18px; font-size: 14px; line-height: 22px; }
.ld-underline-label { display: inline-block; font-size: 14px; line-height: 22px; padding-bottom: 4px; border-bottom: 1px solid var(--t-text); }

.ld-btn { display: inline-flex; align-items: center; gap: 10px; border: 1px solid currentColor; border-radius: 45px; padding: 14px 30px; font-size: 16px; font-weight: 500; letter-spacing: -.01em; transition: background-color .35s ease, color .35s ease, border-color .35s ease; }
.ld-btn:hover { background: var(--t-text); color: var(--t-bg); border-color: var(--t-text); }
.ld-btn-light { color: #fff; border-color: rgba(255,255,255,.85); }
.ld-btn-light:hover { background: #fff; color: var(--t-text); border-color: #fff; }
.ld-btn-dark { background: var(--t-text); color: var(--t-bg); border-color: var(--t-text); }
.ld-btn-dark:hover { background: transparent; color: var(--t-text); }
.ld-btn-accent { background: var(--t-accent); color: #fff; border-color: var(--t-accent); }
.ld-btn-accent:hover { background: transparent; color: var(--t-text); border-color: var(--t-text); }
.ld-btn-sm { padding: 10px 22px; font-size: 14px; }

.ld-link { position: relative; display: inline-flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 500; }
.ld-link::after { content: ""; position: absolute; left: 0; bottom: -4px; height: 1px; width: 0; background: currentColor; transition: width .3s ease; }
.ld-link:hover::after { width: 100%; }

.ld-header { background: color-mix(in srgb, var(--t-bg) 94%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--t-text) 10%, transparent); backdrop-filter: blur(16px); }
.ld-header-logo { position: relative; }
.ld-header-logo::before, .ld-header-logo::after { content: ""; position: absolute; top: 50%; width: 1px; height: 26px; transform: translateY(-50%); background: color-mix(in srgb, var(--t-text) 14%, transparent); display: none; }
.ld-header-logo::before { right: calc(100% + 28px); }
.ld-header-logo::after { left: calc(100% + 28px); }
@media (min-width: 1024px) { .ld-header-logo::before, .ld-header-logo::after { display: block; } }
.ld-navlink { position: relative; font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; font-size: 14px; font-weight: 600; letter-spacing: -.01em; padding: 8px 0; background: none; border: 0; color: color-mix(in srgb, var(--t-text) 72%, transparent); cursor: pointer; transition: color .25s ease; }
.ld-navlink::after { content: ""; position: absolute; left: 0; bottom: -2px; height: 1px; width: 0; background: var(--t-accent); transition: width .3s ease; }
.ld-navlink:hover { color: var(--t-text); }
.ld-navlink:hover::after, .ld-navlink[aria-current="page"]::after { width: 100%; }
.ld-navlink[aria-current="page"] { color: var(--t-text); }
.ld-mobile-link { position: relative; width: 100%; font-family: 'Newsreader', Georgia, serif; font-size: 30px; font-weight: 500; line-height: 1.1; padding: 13px 0; background: none; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--t-text) 10%, transparent); color: var(--t-text); text-align: left; }
.ld-mobile-link[aria-current="page"] { color: var(--t-accent); }
.ld-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--t-text) 25%, transparent); background: none; color: var(--t-text); cursor: pointer; transition: border-color .3s ease; }
.ld-iconbtn:hover { border-color: var(--t-text); }

.ld-hero-label .ld-label { border-color: rgba(255,255,255,.55); color: #fff; }

/* hero: immersive editorial image, decisive booking CTA and a quiet information rail */
.ld-hero { position: relative; overflow: hidden; min-height: 640px; height: min(calc(100svh - 80px), 880px); background: var(--t-text); color: #fff; }
.ld-hero-slide { position: absolute; inset: 0; opacity: 0; transition: opacity 1s ease; }
.ld-hero-slide.is-on { opacity: 1; }
.ld-hero-slide img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.015); }
.ld-hero-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(9,15,12,.72) 0%, rgba(9,15,12,.42) 46%, rgba(9,15,12,.08) 78%), linear-gradient(0deg, rgba(7,11,9,.6) 0%, transparent 48%); }
.ld-hero-inner { padding-bottom: 52px; }
.ld-hero-copy { position: relative; z-index: 2; max-width: 800px; padding-bottom: 112px; }
.ld-hero-copy p { color: rgba(255,255,255,.92); }
.ld-hero-kicker { display: flex; align-items: center; gap: 14px; font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: rgba(255,255,255,.86); }
.ld-hero-kicker-line { width: 42px; height: 1px; background: var(--t-accent); }
.ld-hero-sub { text-wrap: pretty; }
.ld-btn-hero { background: #fff; color: #172019; border-color: #fff; padding: 15px 28px; }
.ld-btn-hero:hover { background: var(--t-accent); color: #fff; border-color: var(--t-accent); }
.ld-hero-link { padding: 12px 2px; }
.ld-hero-meta { position: absolute; right: 24px; bottom: 36px; left: 24px; z-index: 3; display: grid; grid-template-columns: auto auto 1fr; align-items: center; gap: 28px; min-height: 78px; padding: 14px 22px; border: 1px solid rgba(255,255,255,.24); background: rgba(13,19,15,.34); backdrop-filter: blur(14px); }
.ld-hero-meta > div:not(:last-child) { display: grid; grid-template-columns: auto auto; align-items: baseline; gap: 9px; padding-right: 28px; border-right: 1px solid rgba(255,255,255,.2); }
.ld-hero-meta-value { font-family: 'Newsreader', Georgia, serif; font-size: 30px; line-height: 1; }
.ld-hero-meta-label { font-size: 12px; color: rgba(255,255,255,.7); }
.ld-hero-meta-note { display: flex; align-items: center; justify-content: flex-end; gap: 9px; font-size: 13px; color: rgba(255,255,255,.82); }
.ld-hero-meta-dot { width: 7px; height: 7px; border-radius: 999px; background: var(--t-accent); box-shadow: 0 0 0 5px color-mix(in srgb, var(--t-accent) 24%, transparent); }
.ld-hero-arrow { position: absolute; right: 4%; top: 50%; z-index: 3; transform: translateY(-50%); width: 56px; height: 56px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid rgba(255,255,255,.7); background: rgba(255,255,255,.08); color: #fff; cursor: pointer; backdrop-filter: blur(4px); transition: background-color .3s ease, color .3s ease; }
.ld-hero-arrow:hover { background: #fff; color: var(--t-text); }

/* rental detail: fact strip, amenity tiles and the booking card */
.ld-facts { gap: 1px; background: color-mix(in srgb, var(--t-text) 16%, transparent); border: 1px solid color-mix(in srgb, var(--t-text) 16%, transparent); }
.ld-fact { background: var(--t-bg); }
.ld-amenity { background: color-mix(in srgb, var(--t-accent) 14%, #fff); }
.ld-booking { border: 1px solid color-mix(in srgb, var(--t-text) 16%, transparent); }
.ld-booking-head { background: var(--t-ink); color: var(--t-on-ink); }

/* intro cards: tall photo with a tinted tab across the bottom */
.ld-card { display: block; position: relative; overflow: hidden; }
.ld-card-media { position: relative; aspect-ratio: 4 / 4.7; overflow: hidden; }
.ld-card-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s cubic-bezier(.22,1,.36,1); }
.ld-card:hover .ld-card-media img { transform: scale(1.05); }
.ld-card-tab { display: flex; align-items: center; gap: 14px; height: 58px; padding: 0 22px; background: color-mix(in srgb, var(--t-accent) 62%, #fff); color: var(--t-text); font-size: 17px; }
.ld-card-tab .ld-tab-icon { display: inline-flex; width: 30px; height: 30px; align-items: center; justify-content: center; }

/* amenity chips */
.ld-chip { display: inline-flex; align-items: center; gap: 12px; height: 56px; padding: 0 32px 0 22px; border-radius: 90px; background: color-mix(in srgb, var(--t-accent) 26%, #fff); color: var(--t-text); font-size: 17px; white-space: nowrap; transition: background-color .35s ease, transform .35s ease; }
.ld-chip:hover { background: color-mix(in srgb, var(--t-accent) 40%, #fff); transform: translateY(-2px); }
.ld-chip .ld-chip-icon { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px; line-height: 1; }

/* feature band: full-width photo with white floating pills */
.ld-band { position: relative; height: clamp(420px, 56vw, 600px); overflow: hidden; background: #ddd; }
.ld-band img { width: 100%; height: 100%; object-fit: cover; }
.ld-float-stack { position: absolute; right: 6%; top: 14%; display: flex; flex-direction: column; gap: 14px; }
.ld-float { display: flex; align-items: center; justify-content: space-between; gap: 40px; min-width: 300px; height: 62px; padding: 0 26px; border-radius: 16px; background: #fff; color: var(--t-text); font-size: 15px; box-shadow: 0 14px 40px -18px rgba(0,0,0,.35); }
.ld-float .ld-float-icon { font-size: 20px; line-height: 1; }

/* numbers: rows with rolling digits */
.ld-row { display: grid; grid-template-columns: 1fr 1.1fr auto; align-items: center; gap: 24px; padding: 28px 0; border-top: 1px solid color-mix(in srgb, var(--t-text) 22%, transparent); }
.ld-row:last-child { border-bottom: 1px solid color-mix(in srgb, var(--t-text) 22%, transparent); }
.ld-roll { display: inline-flex; height: 1em; line-height: 1; overflow: hidden; font-size: clamp(40px, 4.4vw, 62px); font-weight: 300; letter-spacing: -.02em; }
.ld-roll-col { display: inline-block; height: 1em; overflow: hidden; vertical-align: top; }
.ld-roll-col-track { display: block; transition: transform 2.5s cubic-bezier(.784,.325,.222,.98); }
.ld-roll-col-track span { display: block; height: 1em; line-height: 1; text-align: center; }
.ld-roll-static { display: inline-block; height: 1em; line-height: 1; }

/* dark quote band */
.ld-dark { background: var(--t-ink); color: var(--t-on-ink); }
.ld-quote-rule { border-left: 1px solid rgba(255,255,255,.35); padding-left: 40px; }

/* property panel */
.ld-spec { display: grid; grid-template-columns: 140px 1fr; gap: 16px; padding: 18px 0; border-top: 1px solid color-mix(in srgb, var(--t-text) 16%, transparent); font-size: 15px; }
.ld-spec:last-child { border-bottom: 1px solid color-mix(in srgb, var(--t-text) 16%, transparent); }
.ld-check { display: inline-flex; width: 22px; height: 22px; align-items: center; justify-content: center; border-radius: 999px; background: color-mix(in srgb, var(--t-accent) 30%, #fff); color: var(--t-text); flex: none; }

/* rental cards */
.ld-rental-media { display: block; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 12px; }
.ld-rental-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s cubic-bezier(.22,1,.36,1); }
.ld-rental:hover .ld-rental-media img { transform: scale(1.05); }

.ld-totop { position: fixed; right: 24px; bottom: 24px; z-index: 40; width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--t-text); color: var(--t-bg); border: 0; cursor: pointer; transition: transform .6s cubic-bezier(.22,1,.36,1), opacity .4s ease; }

.ld-footer a:hover { text-decoration: underline; text-underline-offset: 4px; }
.ld-input { width: 100%; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--t-text) 30%, transparent); background: transparent; padding: 10px 0; font-size: 15px; color: var(--t-text); outline: none; }
.ld-input:focus { border-bottom-color: var(--t-text); }

@media (max-width: 1023px) {
  .ld .tp-section { padding-top: 72px; padding-bottom: 72px; }
  .ld-row { grid-template-columns: 1fr auto; }
  .ld-row p { grid-column: 1 / -1; }
  .ld-float-stack { right: 24px; left: 24px; top: 10%; }
  .ld-float { min-width: 0; }
  .ld-hero-meta { grid-template-columns: auto auto; }
  .ld-hero-meta-note { display: none; }
}
@media (max-width: 767px) {
  /* Grids without an explicit column count take the full phone width (never their content's width),
     and their children may shrink. :where keeps explicit grid-cols-* classes in charge. */
  .ld :where(.grid) { grid-template-columns: minmax(0, 1fr); }
  .ld :where(.grid) > * { min-width: 0; }
  .ld-header > .tp-wrap { grid-template-columns: minmax(0, 1fr) auto; }
  .ld .tp-wrap { padding-left: 20px; padding-right: 20px; }
  .ld-header.sticky { height: 64px; }
  .ld-header.sticky .h-full { height: 64px; }
  .ld-header-logo span { font-family: 'Newsreader', Georgia, serif; font-size: 21px; font-weight: 600; }
  .ld-h1 { font-size: clamp(45px, 13.5vw, 62px); line-height: .98; }
  .ld-h2-lg { font-size: 38px; line-height: 1.08; }
  .ld-h2 { font-size: 32px; line-height: 1.14; }
  .ld-card-media { aspect-ratio: 4 / 3.4; }
  .ld-float-stack { gap: 10px; }
  .ld .tp-section { padding-top: 64px; padding-bottom: 64px; }
  .ld-hero { min-height: 640px; height: calc(100svh - 64px); max-height: 780px; }
  .ld-hero-slide img { object-position: center; }
  .ld-hero-shade { background: linear-gradient(180deg, rgba(8,12,10,.18) 0%, rgba(8,12,10,.42) 38%, rgba(8,12,10,.9) 100%); }
  .ld-hero-inner { padding-bottom: 22px; }
  .ld-hero-copy { max-width: 100%; }
  .ld-hero-copy { padding-bottom: 116px; }
  .ld-hero-kicker { gap: 10px; font-size: 10px; letter-spacing: .12em; }
  .ld-hero-kicker-line { width: 26px; }
  .ld-hero-sub { max-width: 32rem; font-size: 15px; line-height: 1.65; }
  .ld-hero-actions { width: 100%; }
  .ld-hero-actions .ld-btn { width: 100%; justify-content: center; }
  .ld-hero-link { align-self: center; font-size: 14px; }
  .ld-hero-meta { right: 20px; bottom: 18px; left: 20px; min-height: 72px; gap: 16px; padding: 12px 16px; }
  .ld-hero-meta > div:not(:last-child) { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding-right: 16px; }
  .ld-hero-meta-value { font-size: 25px; }
  .ld-hero-meta-label { font-size: 10px; }
  .ld-hero-arrow { right: 16px; width: 46px; height: 46px; }
  .ld-quote-rule { padding-left: 22px; }
  .ld-band { height: 420px; }
  .ld-float-stack { right: 14px; bottom: 14px; left: 14px; top: auto; }
  .ld-float { width: 100%; height: 52px; padding: 0 18px; border-radius: 10px; font-size: 13px; }
  .ld-chip { width: 100%; height: auto; min-height: 56px; padding: 12px 20px; white-space: normal; }
  .ld-row { gap: 12px; padding: 22px 0; }
  .ld-row > p:first-child { font-size: 23px; }
  .ld-spec { grid-template-columns: 96px minmax(0, 1fr); gap: 12px; }
  .ld-page-intro { padding-top: 42px; padding-bottom: 42px; }
  .ld-page-intro .ld-label { font-size: 12px; }
  .ld-form-panel { padding: 24px; border-radius: 14px; }
  .ld-facts { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; }
  .ld-fact { padding: 20px 16px; }
  .ld-fact p:last-child { font-size: 18px; overflow-wrap: anywhere; }
  .ld-booking-head, .ld-booking > div:last-child { padding-left: 22px; padding-right: 22px; }
  .ld-footer { padding-top: 56px; }
  .ld-totop { right: 16px; bottom: 16px; width: 42px; height: 42px; }
}

@media (max-width: 420px) {
  .ld .tp-wrap { padding-left: 16px; padding-right: 16px; }
  .ld-h1 { font-size: 43px; }
  .ld-hero-meta { right: 16px; left: 16px; }
  .ld-hero-meta > div:not(:last-child) { padding-right: 12px; }
  .ld-card-tab { padding: 0 16px; font-size: 15px; }
}

@media (prefers-reduced-motion: reduce) {
  .ld-hero-slide, .ld-card-media img, .ld-rental-media img { transition: none; }
  .ld-roll-col-track { transition: none; }
}

/* First-load screen: a breathing version of the header's A-frame mark, shown only for the brief
   moment before the preview draft (or a real site's data) is ready — never the bare
   "No preview data" text other templates fall back to. */
.ld-loading { min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; background: var(--t-bg); color: var(--t-text); }
.ld-loading-mark { animation: ld-loading-pulse 1.6s ease-in-out infinite; }
.ld-loading-bar { width: 128px; height: 2px; border-radius: 999px; background: color-mix(in srgb, var(--t-text) 14%, transparent); overflow: hidden; }
.ld-loading-bar span { display: block; width: 40%; height: 100%; border-radius: 999px; background: var(--t-accent); animation: ld-loading-slide 1.3s ease-in-out infinite; }
@keyframes ld-loading-pulse { 0%, 100% { opacity: .4; transform: scale(.9); } 50% { opacity: 1; transform: scale(1); } }
@keyframes ld-loading-slide { 0% { transform: translateX(-130%); } 55%, 100% { transform: translateX(150%); } }
@media (prefers-reduced-motion: reduce) {
  .ld-loading-mark { animation: none; }
  .ld-loading-bar span { animation: none; width: 100%; }
}
`;

export const LODGE_PALETTE = {
  bg: "#ffffff",
  text: "#1c1f21",
  accent: "#7fa388",
  secondary: "#ddede3",
};
