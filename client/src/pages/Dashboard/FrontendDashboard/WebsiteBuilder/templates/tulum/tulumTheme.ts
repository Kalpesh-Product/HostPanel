import { WAYFARER_CSS } from "../wayfarer/wayfarerTheme";

// Tulum follows a quiet, editorial co-living layout: a full-bleed video hero with a price line,
// a centred serif intro, sage bands, unit rows, pricing cards, reviews and a review-site strip.
// Cormorant Upright carries the headings and Karla the body. Colours come from the palette
// (--t-accent is the sage tone; --t-ink is the deep band colour), so an owner's own colours
// recolour the bands and buttons too.
export const TULUM_CSS = `
${WAYFARER_CSS}
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Upright:wght@400;500;600;700&family=Karla:wght@400;500;600;700&display=swap');

.tk { background: var(--t-bg); color: var(--t-text); font-family: 'Karla', ui-sans-serif, system-ui, sans-serif; font-size: 16px; line-height: 25px; letter-spacing: -.5px; }
.tk h1, .tk h2, .tk h3, .tk h4 { font-family: 'Cormorant Upright', Georgia, serif; font-weight: 400; letter-spacing: -.5px; }
/* the reference's content width is the full page less a 25px gutter on each side */
.tk .tp-wrap { max-width: none; padding-left: 25px; padding-right: 25px; }
.tk .tp-section { padding-top: 100px; padding-bottom: 90px; }

.tk-h1 { font-size: 50px; line-height: 58px; }
.tk-h2 { font-size: 40px; line-height: 42px; }
.tk-h3 { font-size: 30px; line-height: 36px; }
.tk-eyebrow { font-size: 13px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; }
.tk-muted { color: var(--t-text); }
.tk-rule { border-color: color-mix(in srgb, var(--t-text) 24%, transparent); }

.tk-pill { display: inline-flex; align-items: center; gap: 10px; border: 1px solid currentColor; border-radius: 999px; padding: 13px 26px; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; background: transparent; color: inherit; cursor: pointer; transition: background-color .35s ease, color .35s ease; }
.tk-pill:hover { background: var(--t-text); color: var(--t-bg); }
.tk-pill-solid { background: var(--t-text); color: var(--t-bg); border-color: var(--t-text); }
.tk-pill-solid:hover { background: transparent; color: var(--t-text); }
.tk-pill-light { color: #fff; }
.tk-pill-light:hover { background: #fff; color: var(--t-text); }

.tk-link { position: relative; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.tk-link::after { content: ""; position: absolute; left: 0; bottom: -5px; height: 1px; width: 0; background: currentColor; transition: width .3s ease; }
.tk-link:hover::after { width: 100%; }

/* header: a plain bar with a full-height green block for the booking button */
.tk-header { background: var(--t-bg); }
.tk-brand { font-family: 'Cormorant Upright', Georgia, serif; font-weight: 500; }
.tk-navlink { position: relative; font-size: 16px; font-weight: 400; letter-spacing: -.5px; padding: 6px 0; background: none; border: 0; color: #555e59; cursor: pointer; }
.tk-navlink::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: currentColor; transform: scaleX(0); transform-origin: left; transition: transform .3s ease; }
.tk-navlink:hover::after, .tk-navlink[aria-current="page"]::after { transform: scaleX(1); }
.tk-cta-block { height: 100%; min-width: 131px; padding: 0 28px; display: inline-flex; align-items: center; justify-content: center; background: var(--t-accent); color: var(--t-bg); font-size: 16px; font-weight: 400; letter-spacing: -.5px; border: 0; cursor: pointer; transition: opacity .3s ease; }
.tk-cta-block:hover { opacity: .9; }
.tk-mobile-link { font-size: 22px; padding: 10px 0; background: none; border: 0; color: var(--t-text); text-align: left; font-family: 'Cormorant Upright', serif; }
.tk-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--t-text) 25%, transparent); background: none; color: var(--t-text); cursor: pointer; }

/* hero: full-bleed video or photo, a grey veil, text bottom-left, spec strip, scroll cue */
.tk-hero { position: relative; overflow: hidden; height: 750px; min-height: 560px; background: #d4d5cf; color: #f1f1ed; }
.tk-hero > video, .tk-hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.tk-hero-veil { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(40,48,44,.15) 0%, rgba(40,48,44,.35) 55%, rgba(40,48,44,.7) 100%); }
.tk-hero-copy { position: relative; z-index: 2; }
.tk-hero-specs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 420px; }
.tk-hero-spec { display: flex; align-items: center; gap: 14px; padding: 4px 18px; border-left: 1px solid rgba(241,241,237,.4); font-size: 13px; line-height: 1.35; }
.tk-hero-spec:first-child { border-left: 0; padding-left: 0; }
.tk-scroll-cue { position: absolute; left: calc(50% - 26px); bottom: 28px; z-index: 3; width: 52px; height: 52px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid rgba(241,241,237,.6); background: rgba(255,255,255,.08); color: #fff; cursor: pointer; animation: tk-bob 1.6s ease-in-out infinite; }
@keyframes tk-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(10px); } }

/* side tab: a vertical "contact us" strip fixed to the left edge */
.tk-sidetab { position: fixed; left: 0; top: 50%; z-index: 40; transform: translateY(-50%) rotate(180deg); writing-mode: vertical-rl; padding: 18px 10px; background: var(--t-accent); color: var(--t-accent-text, #fff); font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; border: 0; cursor: pointer; }

/* sage bands and the deep-ink band */
.tk-band { background: var(--t-accent); color: var(--t-accent-text, #fff); }
.tk-band-soft { background: #d4d6ce; }
.tk-footer { background: var(--t-bg); color: var(--t-text); }

/* intro columns and their outline buttons */
.tk-col-icon { width: 84px; height: 84px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto; }
.tk-col-icon svg { width: 40px; height: 40px; }

/* unit rows: photo beside a list of the unit's features */
.tk-unit-media { overflow: hidden; border-radius: 4px; aspect-ratio: 4 / 3; }
.tk-unit-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s cubic-bezier(.22,1,.36,1); }
.tk-unit:hover .tk-unit-media img { transform: scale(1.04); }
.tk-feature-list li { display: flex; justify-content: flex-end; text-align: right; }

/* pricing cards with a photo top and the popular badge */
.tk-price-card { background: transparent; display: flex; flex-direction: column; transition: transform .6s cubic-bezier(.22,1,.36,1); }
.tk-price-card:hover { transform: translateY(-6px); }
.tk-price-media { position: relative; aspect-ratio: 16 / 10; overflow: hidden; }
.tk-price-media img { width: 100%; height: 100%; object-fit: cover; }
.tk-badge { position: absolute; right: 18px; bottom: 18px; background: rgba(255,255,255,.92); color: var(--t-text); font-family: 'Cormorant Upright', serif; font-size: 20px; padding: 2px 14px; }
.tk-check { display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--t-text) 40%, transparent); flex: none; }

/* reviews */
.tk-review { border: 1px solid color-mix(in srgb, var(--t-text) 16%, transparent); padding: 36px; background: var(--t-surface, #fff); }

/* review-site strip: distances in a row */
.tk-distance { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }

/* gallery tiles and team */
.tk-tile { overflow: hidden; }
.tk-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s cubic-bezier(.22,1,.36,1); }
.tk-tile:hover img { transform: scale(1.05); }
.tk-team-media { aspect-ratio: 4 / 5; overflow: hidden; }
.tk-team-media img { width: 100%; height: 100%; object-fit: cover; }

.tk-footer a:hover { text-decoration: underline; text-underline-offset: 4px; }
.tk-input { width: 100%; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--t-text) 35%, transparent); background: transparent; padding: 10px 0; font-size: 15px; color: var(--t-text); outline: none; }
.tk-input:focus { border-bottom-color: var(--t-text); }
.tk-totop { position: fixed; right: 4%; bottom: 28px; z-index: 40; width: 52px; height: 52px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid rgba(241,241,237,.7); background: rgba(40,48,44,.35); color: #fff; cursor: pointer; transition: transform .6s cubic-bezier(.22,1,.36,1), opacity .4s ease, background-color .3s ease; }
.tk-totop:hover { background: #fff; color: var(--t-text); }

@media (max-width: 1023px) {
  .tk-sidetab { display: none; }
}
@media (max-width: 767px) {
  /* Grids without an explicit column count take the full phone width, and their children may shrink. */
  .tk :where(.grid) { grid-template-columns: minmax(0, 1fr); }
  .tk :where(.grid) > * { min-width: 0; }
  .tk .tp-wrap { padding-left: 18px; padding-right: 18px; }
  .tk .tp-section { padding-top: 60px; padding-bottom: 60px; }
  .tk-h1 { font-size: 40px; line-height: 46px; }
  .tk-h2 { font-size: 32px; line-height: 36px; }
  .tk .tp-wrap { padding-left: 18px; padding-right: 18px; }
  .tk-hero { height: 88svh; min-height: 520px; }
  .tk-hero-veil { background: linear-gradient(180deg, rgba(40,48,44,.45) 0%, rgba(40,48,44,.6) 45%, rgba(40,48,44,.82) 100%); }
  .tk-hero-specs { grid-template-columns: 1fr; max-width: 100%; }
  .tk-hero-spec { border-left: 0; padding: 4px 0; }
  .tk-scroll-cue { width: 44px; height: 44px; left: calc(50% - 22px); bottom: 18px; }
  .tk-totop { width: 44px; height: 44px; right: 16px; bottom: 18px; }
  .tk-cta-block { min-width: 120px; font-size: 12px; }
  .tk-feature-list li { justify-content: flex-start; text-align: left; }
}

@media (prefers-reduced-motion: reduce) {
  .tk-scroll-cue { animation: none; }
  .tk-unit-media img, .tk-tile img, .tk-price-card { transition: none; }
}
`;

export const TULUM_PALETTE = { bg: "#f1f1ed", text: "#6e7a73", accent: "#8a968f", secondary: "#d4d6ce" };
