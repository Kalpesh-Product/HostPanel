import { WAYFARER_CSS } from "../wayfarer/wayfarerTheme";

// Grindelwald follows the reference's forest look: a deep green hero with a round photo, dashed
// neon rings, a pale intro with stats, a parallax photo, a green "about" band with staggered
// photos, room cards, a sign-up band, a photo slider and a closing "let's talk" band.
// Bodoni Moda carries the display type (the reference's Boska) and Hanken Grotesk the body
// (the reference's Switzer). --t-bg is the pale page colour, --t-secondary the deep green band and
// --t-accent the neon green.
export const GRINDELWALD_CSS = `
${WAYFARER_CSS}
@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,700;1,400&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');

.gw { background: var(--t-bg); color: var(--t-text); font-family: 'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif; font-size: 16px; line-height: 26px; }
.gw h1, .gw h2, .gw h3, .gw h4 { font-family: 'Bodoni Moda', Georgia, serif; font-weight: 400; letter-spacing: -.01em; }
.gw .tp-wrap { max-width: 1280px; padding-left: 24px; padding-right: 24px; }
.gw .tp-section { padding-top: 110px; padding-bottom: 110px; }

.gw-h1 { font-size: 64px; line-height: 1.02; }
.gw-h2 { font-size: 52px; line-height: 1.08; }
.gw-h3 { font-size: 34px; line-height: 1.15; }
.gw-eyebrow { font-size: 14px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; }
.gw-muted { color: color-mix(in srgb, var(--t-text) 80%, transparent); }
.gw-brand { font-family: 'Bodoni Moda', Georgia, serif; font-weight: 500; }

/* buttons: an outline pill, and a solid neon pill for the main call to action */
.gw-pill { display: inline-flex; align-items: center; justify-content: center; gap: 10px; border: 1px solid currentColor; border-radius: 999px; padding: 14px 28px; font-size: 15px; font-weight: 600; background: transparent; color: inherit; cursor: pointer; transition: background-color .35s ease, color .35s ease; }
.gw-pill:hover { background: var(--t-text); color: var(--t-bg); }
.gw-pill-solid { background: var(--t-accent); color: var(--t-secondary); border-color: var(--t-accent); }
.gw-pill-solid:hover { background: transparent; color: var(--t-accent); }
.gw-pill-light { color: #fff; }
.gw-pill-light:hover { background: #fff; color: var(--t-secondary); }

.gw-link { position: relative; display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
.gw-link::after { content: ""; position: absolute; left: 0; bottom: -4px; height: 1px; width: 0; background: currentColor; transition: width .3s ease; }
.gw-link:hover::after { width: 100%; }

/* header: a deep green bar, links split either side of the logo, a neon booking link at the right */
.gw-header { background: var(--t-secondary); color: var(--t-secondary-text, #fff); }
.gw-navlink { position: relative; font-size: 16px; font-weight: 500; padding: 6px 0; background: none; border: 0; color: inherit; cursor: pointer; }
.gw-navlink::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--t-accent); transform: scaleX(0); transform-origin: left; transition: transform .3s ease; }
.gw-navlink:hover::after, .gw-navlink[aria-current="page"]::after { transform: scaleX(1); }
.gw-navlink[aria-current="page"] { color: var(--t-accent); }
.gw-cta-block { display: inline-flex; align-items: center; color: var(--t-accent); font-size: 16px; font-weight: 600; border: 0; background: none; cursor: pointer; }
.gw-cta-block:hover { text-decoration: underline; text-underline-offset: 4px; }
.gw-mobile-link { font-size: 22px; padding: 10px 0; background: none; border: 0; color: inherit; text-align: left; font-family: 'Bodoni Moda', serif; }
.gw-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 999px; border: 1px solid rgba(255,255,255,.35); background: none; color: inherit; cursor: pointer; }

/* hero: deep green with a noise grain, a round photo, dashed neon rings and the stacked title */
.gw-hero { position: relative; overflow: hidden; height: 792px; min-height: 640px; background-color: #1b3936; color: #fff; isolation: isolate; }
.gw-hero::before { content: ""; position: absolute; inset: 0; z-index: -1; opacity: .35; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.25'/></svg>"); }
.gw-ring { position: absolute; left: 50%; top: 50%; width: min(1180px, 150vw); aspect-ratio: 1; border-radius: 50%; border: 2px dashed rgba(117,255,105,.75); transform: translate(-50%, -50%); animation: gw-spin 90s linear infinite; pointer-events: none; }
.gw-ring-2 { width: min(860px, 110vw); border-color: rgba(117,255,105,.45); animation-direction: reverse; }
@keyframes gw-spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
/* Centred with inset+margin, not a static transform — a transform-based fade-up animation
   needs the transform property free to animate, so it can't also be doing the centring. */
.gw-hero-circle { position: absolute; inset: 0; margin: auto; width: min(570px, 72vw); aspect-ratio: 1; border-radius: 50%; overflow: hidden; background: #2a4f4b; }
.gw-hero-circle img, .gw-hero-circle video { width: 100%; height: 100%; object-fit: cover; }
.gw-hero-title { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center; }
.gw-hero-line-1, .gw-hero-line-4 { font-size: clamp(88px, 13vw, 176px); line-height: .9; color: #fff; }
.gw-hero-line-2 { font-size: clamp(88px, 13vw, 176px); line-height: .9; color: var(--t-accent); font-style: italic; margin-left: 14vw; }
.gw-hero-line-3 { font-size: clamp(26px, 2.6vw, 36px); line-height: 1.2; color: #fff; font-weight: 500; margin: 6px 0 0 -8vw; }
.gw-hero-sub { position: absolute; left: 0; right: 0; bottom: 56px; text-align: center; font-size: 18px; font-weight: 600; line-height: 1.45; color: #fff; }
.gw-play { position: absolute; right: 12%; left: auto; top: 0; bottom: 0; margin: auto 0; z-index: 3; width: 72px; height: 72px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--t-accent); color: #1b3936; border: 0; cursor: pointer; box-shadow: 0 0 0 14px rgba(117,255,105,.22); transition: transform .4s ease; }
.gw-play:hover { transform: scale(1.06); }
.gw-video-modal { position: fixed; inset: 0; z-index: 90; background: rgba(10,22,20,.86); display: flex; align-items: center; justify-content: center; padding: 24px; }
.gw-video-modal video { max-width: min(1100px, 100%); max-height: 80vh; border-radius: 6px; }
.gw-video-close { position: absolute; top: 20px; right: 20px; width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--t-accent); color: #1b3936; cursor: pointer; font-size: 22px; }

/* loading screen: the brand rises in over the deep green, like the reference's own page-load weight */
.gw-preloader { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: #1b3936; }

/* inner-page hero: the reference's "Our Cabins" / "Memory Line" treatment — a deep green band
   (or a full-bleed photo for About) with the same two-line title as the home hero, smaller. */
.gw-pagehero { position: relative; overflow: hidden; min-height: 420px; background-color: #1b3936; color: #fff; isolation: isolate; display: flex; align-items: center; }
.gw-pagehero::before { content: ""; position: absolute; inset: 0; z-index: -1; opacity: .35; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.25'/></svg>"); }
.gw-pagehero-photo { min-height: 560px; }
.gw-pagehero-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
.gw-pagehero-photo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(27,57,54,.35) 0%, rgba(27,57,54,.55) 100%); z-index: -1; }
.gw-ph-title { font-size: clamp(52px, 9vw, 120px); line-height: .96; }
.gw-ph-accent { color: var(--t-accent); font-style: italic; }

/* intro: pale page, a neon oval logo with the first letter, and three stats in serif numerals */
.gw-logo-oval { position: relative; width: 220px; height: 300px; border-radius: 50%; background: var(--t-accent); display: flex; align-items: center; justify-content: center; }
.gw-stat-value { font-family: 'Bodoni Moda', serif; font-style: italic; font-size: 68px; line-height: 1; color: var(--t-secondary); }
.gw-stat-value small { font-size: 26px; font-style: italic; margin-left: 6px; }

/* parallax photo: a full-width band between the intro and the about band */
.gw-parallax { height: 760px; background-size: cover; background-position: center; }

/* about band: deep green, a pale wave where it meets the page, and the two-column photo collage */
.gw-band { background: var(--t-secondary); color: var(--t-secondary-text, #fff); }
.gw-band .gw-muted { color: color-mix(in srgb, var(--t-secondary-text, #fff) 80%, transparent); }
.gw-wave { height: 70px; background: var(--t-bg); border-radius: 0 0 50% 50% / 0 0 100% 100%; }
.gw-wave-up { height: 70px; background: var(--t-secondary); border-radius: 50% 50% 0 0 / 100% 100% 0 0; }
.gw-about-photo { overflow: hidden; }
.gw-about-photo img { width: 100%; height: 100%; object-fit: cover; }

/* room cards: a tall photo, the title, a line and an arrow link */
.gw-room-media { overflow: hidden; aspect-ratio: 387 / 600; }
.gw-room-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s cubic-bezier(.22,1,.36,1); }
.gw-room:hover .gw-room-media img { transform: scale(1.04); }
.gw-arrow-link { display: inline-flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; background: none; border: 0; color: inherit; cursor: pointer; }

/* slider: a true sliding carousel, a few photos at a time, with a round arrow on each side */
.gw-carousel { overflow: hidden; }
.gw-carousel-track { display: flex; transition: transform .7s cubic-bezier(.22,1,.36,1); }
.gw-slide { flex: none; padding: 0 10px; }
.gw-slide-media { overflow: hidden; aspect-ratio: 380 / 470; border-radius: 4px; }
.gw-slide-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s cubic-bezier(.22,1,.36,1); }
.gw-slide-media:hover img { transform: scale(1.04); }
.gw-arrow { width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; border: 0; background: var(--t-accent); color: var(--t-secondary); cursor: pointer; }
.gw-arrow:disabled { opacity: .4; cursor: default; }

/* reviews: plain cards with a rule above, no box */
.gw-review { border-top: 1px solid color-mix(in srgb, var(--t-text) 24%, transparent); padding-top: 28px; }

/* units, pricing and rows (inner pages) */
.gw-unit-media { overflow: hidden; border-radius: 4px; aspect-ratio: 4 / 3; }
.gw-unit-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s cubic-bezier(.22,1,.36,1); }
.gw-unit:hover .gw-unit-media img { transform: scale(1.04); }
.gw-feature-list li { display: flex; align-items: center; gap: 12px; }
.gw-price-card { display: flex; flex-direction: column; }
.gw-price-media { position: relative; aspect-ratio: 16 / 10; overflow: hidden; }
.gw-price-media img { width: 100%; height: 100%; object-fit: cover; }
.gw-badge { position: absolute; right: 18px; bottom: 18px; background: var(--t-accent); color: var(--t-secondary); font-size: 14px; font-weight: 600; padding: 4px 14px; border-radius: 999px; }
.gw-check { display: inline-flex; width: 24px; height: 24px; align-items: center; justify-content: center; border-radius: 999px; background: var(--t-accent); color: var(--t-secondary); flex: none; }
.gw-tile { overflow: hidden; }
.gw-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s cubic-bezier(.22,1,.36,1); }
.gw-tile:hover img { transform: scale(1.05); }
.gw-team-media { aspect-ratio: 4 / 5; overflow: hidden; }
.gw-team-media img { width: 100%; height: 100%; object-fit: cover; }
.gw-distance { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.gw-col-icon { width: 84px; height: 84px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto; }
.gw-review-card { border: 1px solid color-mix(in srgb, var(--t-text) 16%, transparent); padding: 36px; background: transparent; }
.gw-band-soft { background: color-mix(in srgb, var(--t-text) 8%, var(--t-bg)); }
.gw-input { width: 100%; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--t-text) 35%, transparent); background: transparent; padding: 10px 0; font-size: 15px; color: var(--t-text); outline: none; }
.gw-input:focus { border-bottom-color: var(--t-text); }

/* footer: the same deep green as the header, bookending the page */
.gw-footer { background: var(--t-secondary); color: var(--t-secondary-text, #fff); }
.gw-footer a:hover { text-decoration: underline; text-underline-offset: 4px; }

@media (max-width: 767px) {
  /* Grids without an explicit column count take the full phone width, and their children may shrink. */
  .gw :where(.grid) { grid-template-columns: minmax(0, 1fr); }
  .gw :where(.grid) > * { min-width: 0; }
  .gw .tp-wrap { padding-left: 18px; padding-right: 18px; }
  .gw .tp-section { padding-top: 70px; padding-bottom: 70px; }
  .gw-h1 { font-size: 44px; line-height: 1.05; }
  .gw-h2 { font-size: 38px; line-height: 1.1; }
  .gw-h3 { font-size: 28px; }
  .gw-hero { height: 88svh; min-height: 620px; }
  .gw-hero-line-2 { margin-left: 0; }
  .gw-hero-line-3 { margin-left: 0; }
  .gw-play { right: 0; left: 0; margin: 0 auto; top: auto; bottom: 150px; }
  .gw-play:hover { transform: scale(1.06); }
  .gw-hero-sub { bottom: 28px; font-size: 16px; }
  .gw-logo-oval { width: 160px; height: 220px; }
  .gw-parallax { height: 420px; }
  .gw-pagehero { min-height: 320px; }
  .gw-pagehero-photo { min-height: 420px; }
}

@media (prefers-reduced-motion: reduce) {
  .gw-ring { animation: none; }
  .gw-room-media img, .gw-tile img, .gw-unit-media img, .gw-slide-media img { transition: none; }
  .gw-carousel-track { transition: none; }
}
`;

// Pale page, deep green bands and neon accents, as on the reference.
export const GRINDELWALD_PALETTE = { bg: "#f8f8f8", text: "#1b3936", accent: "#75ff69", secondary: "#1b3936" };
