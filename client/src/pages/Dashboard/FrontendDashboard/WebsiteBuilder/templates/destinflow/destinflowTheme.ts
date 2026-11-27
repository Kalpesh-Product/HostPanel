// DestinFlow-inspired hostel look: square dark buttons, a bright blue photographic hero,
// Cormorant Garamond display type, Alegreya Sans body copy, a pale-blue facilities band
// and a dark gallery strip. All custom rules are scoped to `.df`; the shared `tp-*`
// vocabulary is inherited from Wayfarer so forms, modals and overlays keep working.

import { WAYFARER_CSS } from "../wayfarer/wayfarerTheme";

export const DESTINFLOW_PALETTE = {
  bg: "#ffffff",
  text: "#666b73",
  accent: "#3ba7da",
  secondary: "#151819",
};

export const DESTINFLOW_CSS = String.raw`
@import url('https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600;700&display=swap');

${WAYFARER_CSS}

.df {
  position: relative;
  --df-dark: #151819;
  --df-heading: #20262e;
  --df-muted: #666b73;
  --df-blue: #3ba7da;
  --df-sky: #ceefff;
  --df-line: #e5e8e9;
  --df-soft: #f6f8f9;
  --df-light: #f5f5f5;
  background: var(--t-bg, #ffffff);
  color: var(--t-text, var(--df-muted));
  font-family: 'Alegreya Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.df h1,
.df h2,
.df h3,
.df h4,
.df .tp-display {
  font-family: 'Cormorant Garamond', Georgia, serif;
  color: var(--df-heading);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 0.98;
}

.df p { line-height: 1.7; }
.df button,
.df input,
.df select,
.df textarea { font-family: inherit; }
.df img { display: block; max-width: 100%; }
.df a { color: inherit; }

.df-shell {
  width: min(100% - 48px, 1200px);
  margin-inline: auto;
}

.df-section { padding: 72px 0; }
.df-section-tight { padding: 44px 0; }

.df-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 18px;
  color: var(--t-accent-fg, var(--df-blue));
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  line-height: 1.2;
  text-transform: uppercase;
}
.df-eyebrow::before {
  content: "";
  width: 22px;
  height: 1px;
  background: currentColor;
}

.df-h1 { margin: 0; font-size: clamp(54px, 7.6vw, 104px); }
.df-h2 { margin: 0; font-size: clamp(38px, 4.4vw, 62px); }
.df-h3 { margin: 0; font-size: clamp(26px, 2.6vw, 34px); }
.df-lead {
  margin: 22px 0 0;
  max-width: 640px;
  font-size: clamp(16px, 1.4vw, 19px);
  line-height: 1.75;
  color: var(--df-muted);
}

.df-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 58px;
  border: 1px solid var(--df-dark);
  border-radius: 0;
  background: var(--df-dark);
  color: #fff;
  cursor: pointer;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1;
  padding: 18px 28px;
  text-decoration: none;
  transition: background-color .2s ease, color .2s ease, transform .2s ease, border-color .2s ease;
}
.df-btn:hover { background: var(--df-blue); border-color: var(--df-blue); transform: translateY(-2px); }
.df-btn:focus-visible { outline: 3px solid color-mix(in srgb, var(--df-blue) 50%, transparent); outline-offset: 3px; }
.df-btn-sm { min-height: 46px; padding: 12px 20px; font-size: 15px; }
.df-btn-light { background: #fff; border-color: #fff; color: var(--df-dark); }
.df-btn-light:hover { background: var(--df-blue); border-color: var(--df-blue); color: #fff; }
.df-btn-blue { background: var(--df-blue); border-color: var(--df-blue); color: #fff; }
.df-btn-blue:hover { background: var(--df-dark); border-color: var(--df-dark); }
.df-btn-outline { background: transparent; border-color: var(--df-dark); color: var(--df-dark); }
.df-btn-outline:hover { background: var(--df-dark); color: #fff; }
.df-btn-block { width: 100%; }

.df-textlink {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-bottom: 1px solid currentColor;
  background: transparent;
  color: var(--df-dark);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.2;
  padding: 0 0 6px;
  text-transform: uppercase;
}
.df-textlink:hover { color: var(--t-accent-fg, var(--df-blue)); }

.df-photo {
  position: relative;
  overflow: hidden;
  background: var(--df-soft);
}
.df-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Shared primitives, re-skinned for this template. */
.df .tp-card,
.df .tp-card-hover { border-radius: 0; border-color: var(--df-line); }
.df .tp-soft { border-radius: 0; }
.df .tp-btn,
.df .tp-btn-sm { border-radius: 0; font-family: 'Alegreya Sans', sans-serif; font-weight: 600; }
.df .tp-btn-primary { background: var(--df-blue); border-color: var(--df-blue); color: #fff; }
.df .df-form-outer-spacing .tp-btn-primary:not(:disabled):hover {
  background: var(--df-dark);
  border-color: var(--df-dark);
  color: #fff;
  box-shadow: none;
  transform: translateY(-2px);
}
.df .tp-input,
.df .tp-input:focus { border-radius: 0; }
.df .tp-chip { border-radius: 0; }
.df :focus-visible { outline-color: var(--df-blue); }

/* ── header ───────────────────────────────────────────────── */

.df-header {
  position: sticky;
  top: 0;
  z-index: 60;
  background: rgba(255, 255, 255, .96);
  border-bottom: 1px solid var(--df-line);
  backdrop-filter: blur(14px);
}
.df-header-inner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 24px;
  min-height: 82px;
}
.df-brand-wrap {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}
.df .df-brand {
  display: inline-flex;
  align-items: center;
  max-width: 240px;
  border: 0;
  background: none;
  color: var(--df-dark);
  cursor: pointer;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
  text-align: left;
}
.df-brand img { max-height: 56px; width: auto; object-fit: contain; }
.df-brand-line {
  display: block;
  width: 77px;
  height: 1px;
  flex: 0 0 77px;
  background: var(--df-dark);
}
.df-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}
.df-navlink {
  position: relative;
  border: 0;
  background: transparent;
  color: var(--df-heading);
  cursor: pointer;
  font-size: 18px;
  font-weight: 400;
  line-height: 1.3;
  margin-right: 5px;
  padding: 9px 15px 8px;
  transition: background-color .2s ease, color .2s ease;
  white-space: nowrap;
}
.df-navlink:last-child { margin-right: 0; }
.df-navlink:hover,
.df-navlink[aria-current="page"] {
  background: #fff;
  color: var(--df-heading);
}
.df-header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
.df .df-header-cta {
  min-width: 155px;
  min-height: 60px;
  gap: 7px;
  padding: 20px;
  border: 0;
  font-size: 18px;
  font-weight: 500;
  line-height: 19.8px;
}
.df-nav-menu-button {
  display: none;
  place-items: center;
  width: 62px;
  height: 62px;
  border: 1px solid var(--df-dark);
  border-radius: 10px;
  background: var(--df-dark);
  color: #fff;
  cursor: pointer;
}
.df-mobile-panel {
  border-top: 1px solid var(--df-line);
  background: #fff;
  padding: 35px;
}
.df-mobile-link {
  display: block;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--df-line);
  background: none;
  color: var(--df-heading);
  cursor: pointer;
  font-size: 18px;
  font-weight: 400;
  padding: 12px 0;
  text-align: left;
}

/* The reference places the navigation inside the photographic banner. */
.df-header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: transparent;
  border: 0;
  backdrop-filter: none;
}
.df-header-overlay .df-header-inner {
  min-height: 60px;
  padding-top: 40px;
}
.df-header-overlay .df-navlink {
  background: transparent;
  color: var(--df-dark);
}
.df-header-overlay .df-navlink:hover,
.df-header-overlay .df-navlink[aria-current="page"] {
  background: #fff;
  color: var(--df-heading);
}
.df-header-overlay .df-header-cta {
  border-color: #fff;
  background: #fff;
  color: var(--df-dark);
}
.df-header-overlay .df-header-cta:hover {
  background: var(--df-blue);
  border-color: var(--df-blue);
  color: #fff;
}

/* ── hero ─────────────────────────────────────────────────── */

.df-hero {
  position: relative;
  display: block;
  min-height: 805px;
  overflow: hidden;
  background: var(--df-blue);
  color: #fff;
  padding: 100px 0 253px;
}
.df-hero-media {
  position: absolute;
  inset: 0;
  background-position: 50% 50%;
  background-repeat: no-repeat;
  background-size: cover;
  opacity: 1;
  transform: none;
}
.df-hero-inner {
  position: relative;
  z-index: 2;
  width: 100%;
  padding-top: 180px;
  text-align: center;
}
.df-hero-subtitle {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin: 0 0 30px;
  padding: 15px 25px;
  border-radius: 34px;
  background: rgba(255, 255, 255, .6);
  line-height: .5;
}
.df-hero-subtitle span:not(.df-hero-subtitle-icon) {
  color: var(--df-dark);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: .1em;
  line-height: 1;
  text-transform: uppercase;
}
.df-hero-subtitle-icon {
  display: inline-flex;
  color: var(--df-blue);
  line-height: 0;
}
.df .df-hero-title {
  margin: 0 0 10px;
  color: #fff;
  font-size: 140px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}
.df-hero-button-wrap { margin-top: 22px; }
.df-hero-button {
  min-height: 60px;
  padding: 20px 30px;
  font-size: 18px;
  font-weight: 500;
  line-height: .9;
  text-transform: capitalize;
}

/* ── intro ────────────────────────────────────────────────── */

.df-intro { padding: 80px 0 84px; }
.df-intro-grid {
  display: grid;
  grid-template-columns: minmax(220px, .75fr) minmax(0, 1.25fr);
  gap: clamp(40px, 7vw, 110px);
  align-items: start;
}
.df-icon-tile {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  background: var(--df-blue);
  color: #fff;
  margin-bottom: 26px;
}
.df-intro-label {
  margin: 0;
  color: var(--df-heading);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 30px;
  font-weight: 600;
}
.df-intro-copy p { max-width: 720px; }
.df-intro-block { margin-top: 24px; }
.df-intro-actions { margin-top: 30px; }

/* ── rooms ────────────────────────────────────────────────── */

.df-rooms { padding: 40px 0 88px; }
.df-head-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 42px;
}
.df-head-row-copy { max-width: 720px; }
.df-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
.df-founders-grid { grid-template-columns: repeat(2, minmax(0, 420px)); justify-content: center; }
.df-about-founders { text-align: center; }
.df-about-founders .df-head-row { justify-content: center; align-items: center; text-align: center; }
.df-about-founders .df-founders-grid > div > .df-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.df-room {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--df-line);
  background: #fff;
  transition: box-shadow .25s ease, transform .25s ease;
}
.df-room:hover { transform: translateY(-5px); box-shadow: 0 24px 50px rgba(21, 24, 25, .1); }
.df-rooms-grid > div { display: flex; }
.df-rooms-grid > div > .df-room { flex: 1; }
.df-room-media {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 0;
  background: var(--df-soft);
  cursor: pointer;
  padding: 0;
  text-align: left;
}
.df-room-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .7s cubic-bezier(.22,1,.36,1); }
.df-room:hover .df-room-media img { transform: scale(1.06); }
.df-room-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  background: var(--df-dark);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .14em;
  padding: 8px 12px;
  text-transform: uppercase;
}
.df-room-body { display: flex; flex: 1; flex-direction: column; padding: 24px; }
.df-room-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  color: var(--df-muted);
  font-size: 13px;
  font-weight: 600;
}
.df-room-meta span { display: inline-flex; align-items: center; gap: 6px; }
.df-room-title { margin: 14px 0 10px; font-size: 30px; }
.df-room-copy { margin: 0; color: var(--df-muted); font-size: 15px; line-height: 1.65; }
.df-room-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: auto;
  padding-top: 22px;
  border-top: 1px solid var(--df-line);
}
.df-price { color: var(--df-heading); font-size: 14px; font-weight: 700; }
.df-price strong { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 600; }
.df-room-bottom .df-btn { min-height: 44px; padding: 10px 16px; font-size: 14px; }
.df-services-split .df-room-bottom { gap: 10px; }
.df-services-split .df-room-bottom > div:last-child { flex-wrap: nowrap; gap: 6px; }
.df-services-split .df-price { flex: 0 0 auto; }
.df-services-split .df-price strong { font-size: 18px; white-space: nowrap; }
.df-services-split .df-room-bottom .df-btn {
  min-height: 34px;
  padding: 7px 10px;
  font-size: 12px;
  white-space: nowrap;
}

/* ── dining ───────────────────────────────────────────────── */

.df-dining {
  position: relative;
  overflow: hidden;
  background: var(--df-dark);
  color: #fff;
  padding: 84px 0;
}
.df-dining-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr);
  gap: clamp(40px, 7vw, 96px);
  align-items: center;
}
.df-dining-media { position: relative; min-height: 460px; }
.df-dining-media img { width: 100%; height: 100%; max-height: 540px; object-fit: cover; }
.df-dining-media::after {
  content: "";
  position: absolute;
  right: -28px;
  bottom: -28px;
  z-index: -1;
  width: 180px;
  height: 180px;
  background: var(--df-blue);
}
.df-dining .df-eyebrow { color: var(--df-blue); }
.df-dining h2 { color: #fff; }
.df-dining p { color: rgba(255, 255, 255, .72); }
.df-dining .df-btn-light { margin-top: 14px; }

/* ── facilities ───────────────────────────────────────────── */

.df-facilities { background: var(--df-sky); padding: 84px 0; }
.df-facilities .df-head-row { margin-bottom: 44px; }
.df-facility-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
.df-facility {
  min-height: 220px;
  background: #fff;
  padding: 30px 26px;
}
.df-facility-icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  background: var(--df-blue);
  color: #fff;
  margin-bottom: 26px;
}
.df-facility h3 { font-size: 25px; margin-bottom: 10px; }
.df-facility p { margin: 0; color: var(--df-muted); font-size: 15px; }

/* ── feedback band ────────────────────────────────────────── */

.df-feedback {
  position: relative;
  overflow: hidden;
  background: var(--df-dark);
  color: #fff;
  padding: 96px 0 120px;
}
.df-feedback-media {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: cover;
  opacity: .34;
}
.df-feedback-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(21, 24, 25, .95) 0%, rgba(21, 24, 25, .72) 58%, rgba(21, 24, 25, .45) 100%);
}
.df-feedback-inner { position: relative; z-index: 2; max-width: 700px; }
.df-feedback .df-eyebrow { color: #fff; }
.df-feedback h2 { color: #fff; font-size: clamp(40px, 5vw, 70px); }
.df-feedback p { color: rgba(255, 255, 255, .78); }
.df-feedback-actions { margin-top: 32px; }

/* ── lake feature ─────────────────────────────────────────── */

.df-lake { overflow: hidden; padding: 90px 0 76px; }
.df-lake-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(40px, 6vw, 84px);
  align-items: center;
}
.df-lake-media { min-height: 560px; overflow: hidden; }
.df-lake-media img { width: 100%; height: 100%; max-height: 620px; object-fit: cover; }
.df-lake-list { margin-top: 34px; }
.df-lake-row {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 20px;
  align-items: center;
  padding: 22px 0;
  border-bottom: 1px solid var(--df-line);
}
.df-lake-index {
  color: var(--df-blue);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 30px;
  font-weight: 600;
}
.df-lake-row h3 { margin: 0 0 4px; font-size: 26px; }
.df-lake-row p { margin: 0; color: var(--df-muted); font-size: 14px; }
.df-lake-row .df-btn { min-height: 42px; padding: 10px 16px; font-size: 14px; }
.df-marquee {
  position: relative;
  display: flex;
  gap: 34px;
  width: max-content;
  margin-top: 70px;
  color: var(--df-heading);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: clamp(42px, 6vw, 82px);
  line-height: 1;
  white-space: nowrap;
  animation: dfMarquee 26s linear infinite;
}
.df-marquee span { display: inline-flex; align-items: center; gap: 34px; }
.df-marquee i { color: var(--df-blue); font-style: normal; }
@keyframes dfMarquee { to { transform: translateX(-50%); } }

/* ── testimonials ─────────────────────────────────────────── */

.df-testimonials { overflow: hidden; background: var(--df-soft); padding: 76px 0 88px; }
.df-review-track {
  display: grid;
  grid-auto-columns: minmax(300px, 1fr);
  grid-auto-flow: column;
  gap: 20px;
  overflow-x: auto;
  padding-bottom: 14px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.df-review-track::-webkit-scrollbar { display: none; }
.df-carousel-controls { display: flex; justify-content: center; gap: 10px; margin-top: 22px; }
.df-carousel-btn {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid var(--df-line);
  background: #fff;
  color: var(--df-heading);
  cursor: pointer;
  transition: background .25s ease, border-color .25s ease, color .25s ease;
}
.df-carousel-btn:first-child svg { transform: rotate(180deg); }
.df-carousel-btn:hover { background: var(--df-blue); border-color: var(--df-blue); color: #fff; }
.df-review {
  display: flex;
  flex-direction: column;
  min-height: 260px;
  scroll-snap-align: start;
  background: #fff;
  border: 1px solid var(--df-line);
  padding: 28px;
}
.df-review-stars { color: #f0a83b; }
.df-review blockquote {
  margin: 20px 0 24px;
  color: var(--df-heading);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 24px;
  line-height: 1.28;
}
.df-review figcaption { display: flex; align-items: center; gap: 12px; margin-top: auto; }
.df-review-avatar {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: var(--df-sky);
  color: var(--df-dark);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 20px;
  font-weight: 700;
}
.df-review-avatar img { width: 100%; height: 100%; object-fit: cover; }
.df-review figcaption strong { display: block; color: var(--df-heading); font-size: 14px; }
.df-review figcaption span { display: block; color: var(--df-muted); font-size: 12px; }

/* ── gallery ──────────────────────────────────────────────── */

.df-gallery { overflow: hidden; background: var(--df-dark); color: #fff; padding: 90px 0; }
.df-gallery-head { text-align: center; margin-bottom: 48px; }
.df-gallery-head .df-eyebrow { color: var(--df-blue); }
.df-gallery-head h2 { color: #fff; }
.df-gallery-row {
  display: flex;
  gap: 12px;
  width: max-content;
  margin-bottom: 12px;
  animation: dfMarquee 34s linear infinite;
}
.df-gallery-row--reverse { animation-direction: reverse; }
.df-gallery-row button {
  width: 230px;
  height: 158px;
  overflow: hidden;
  border: 0;
  background: #222;
  cursor: pointer;
  padding: 0;
}
.df-gallery-row img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease, opacity .3s ease; }
.df-gallery-row button:hover img { transform: scale(1.08); opacity: .82; }
.df-gallery-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; margin-top: 46px; }

/* ── footer ───────────────────────────────────────────────── */

.df-footer { background: var(--df-dark); color: rgba(255, 255, 255, .72); padding: 80px 0 32px; }
.df-footer-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) repeat(3, minmax(0, .8fr));
  gap: clamp(30px, 5vw, 70px);
  padding-bottom: 76px;
  border-bottom: 1px solid rgba(255, 255, 255, .14);
}
.df-footer-brand {
  margin: 0 0 18px;
  color: #fff;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 34px;
  font-weight: 600;
  line-height: 1;
}
.df-footer-logo { max-height: 44px; width: auto; margin-bottom: 20px; }
.df-footer p { font-size: 15px; }
.df-footer h3 {
  margin: 0 0 22px;
  color: #fff;
  font-family: 'Alegreya Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.df-footer-list { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.df-footer-list button,
.df-footer-list a {
  border: 0;
  background: none;
  color: rgba(255, 255, 255, .72);
  cursor: pointer;
  font-size: 15px;
  padding: 0;
  text-align: left;
  text-decoration: none;
}
.df-footer-list button:hover,
.df-footer-list a:hover { color: #fff; }
.df-socials { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
.df-socials a,
.df-socials span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, .25);
  color: #fff;
}
.df-socials svg { width: 16px; height: 16px; }
.df-footer-bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  padding-top: 28px;
  font-size: 13px;
}

/* ── inner pages ──────────────────────────────────────────── */

.df-pagehero {
  background: var(--df-soft);
  border-bottom: 1px solid var(--df-line);
  padding: 104px 0 52px;
}
.df-pagehero h1 { max-width: 900px; margin: 0; font-size: clamp(50px, 7vw, 92px); }
.df-pagehero p { max-width: 700px; margin: 22px 0 0; color: var(--df-muted); font-size: 18px; }
.df-pagehero-media { margin-top: 48px; height: min(46vw, 460px); overflow: hidden; }
.df-pagehero-media img { width: 100%; height: 100%; object-fit: cover; }

.df-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(36px, 6vw, 88px);
  align-items: center;
}
.df-split-media { min-height: 420px; overflow: hidden; }
.df-split-media img { width: 100%; height: 100%; max-height: 560px; object-fit: cover; }
.df-prose p { margin: 0 0 18px; color: var(--df-muted); font-size: 17px; line-height: 1.8; white-space: pre-line; }
.df-prose p:last-child { margin-bottom: 0; }
.df-feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin-top: 46px; }
.df-crew-grid { display: flex; flex-wrap: wrap; justify-content: center; }
.df-crew-grid > div { width: min(360px, 100%); }
.df-equal-cards > div { display: flex; }
.df-equal-cards > div > * { flex: 1; }
.df-feature {
  border-top: 3px solid var(--df-blue);
  background: #fff;
  border-left: 1px solid var(--df-line);
  border-right: 1px solid var(--df-line);
  border-bottom: 1px solid var(--df-line);
  padding: 30px 26px;
}
.df-feature-index { color: var(--df-blue); font-size: 13px; font-weight: 700; letter-spacing: .12em; }
.df-feature h3 { margin: 16px 0 10px; font-size: 27px; }
.df-feature p { margin: 0; color: var(--df-muted); font-size: 15px; }

.df-panel {
  background: #fff;
  border: 1px solid var(--df-line);
  padding: clamp(24px, 4vw, 46px);
}
.df-form-outer-spacing { margin-top: 40px; }
.df-panel-dark { background: var(--df-dark); border-color: var(--df-dark); color: #fff; }
.df-panel-dark h2,
.df-panel-dark h3 { color: #fff; }
.df-panel-dark .df-lead,
.df-panel-dark p { color: rgba(255, 255, 255, .72); }
.df-contact-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 36px; }
.df-contact-item { border: 1px solid var(--df-line); padding: 24px; background: #fff; }
.df-contact-item span { display: block; color: var(--df-muted); font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
.df-contact-item a,
.df-contact-item p { display: block; margin: 8px 0 0; color: var(--df-heading); font-size: 17px; font-weight: 600; text-decoration: none; }
.df-map { margin-top: 46px; border: 1px solid var(--df-line); min-height: 360px; }
.df-map iframe { display: block; width: 100%; height: 360px; border: 0; }

.df-gallery-page {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding: 52px 0 80px;
}
.df-gallery-page button {
  aspect-ratio: 1;
  overflow: hidden;
  border: 0;
  background: var(--df-soft);
  cursor: pointer;
  padding: 0;
}
.df-gallery-page .is-wide,
.df-gallery-page button.is-wide { grid-column: span 2; grid-row: span 2; }
.df-gallery-page .is-wide button { width: 100%; height: 100%; }
.df-gallery-page img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.df-gallery-page button:hover img { transform: scale(1.07); }

.df-contact-form-centered {
  width: 100%;
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}
.df-service-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, .7fr);
  gap: 46px;
  align-items: start;
}
.df-services-split { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.df-services-split .df-service-list > div { display: flex; }
.df-services-split .df-service-list > div > .df-service-row { flex: 1; }
.df-services-split .df-service-row { min-height: 280px; }
.df-services-split .df-service-row-body { display: flex; flex-direction: column; }
.df-item-detail-split { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.df-item-detail-split .df-detail-media {
  grid-template-columns: repeat(2, minmax(0, 220px));
  justify-content: start;
  max-width: 452px;
}
.df-career-back-row { grid-column: 1 / -1; margin-top: 24px; }
.df-career-apply-centered {
  grid-column: 1 / -1;
  width: 100%;
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}
.df-sticky { position: sticky; top: 110px; }
.df-service-list { display: grid; gap: 20px; }
.df-service-row {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 22px;
  border: 1px solid var(--df-line);
  background: #fff;
  overflow: hidden;
}
.df-service-row-media { display: block; width: 100%; min-height: 200px; overflow: hidden; border: 0; background: var(--df-soft); cursor: pointer; padding: 0; }
.df-service-row-media img { width: 100%; height: 100%; object-fit: cover; }
.df-service-row-body { padding: 24px; }
.df-detail-media { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.df-detail-media button { display: block; overflow: hidden; border: 0; background: var(--df-soft); cursor: pointer; padding: 0; }
.df-detail-media img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.df-detail-media button:first-child { grid-column: span 2; }
.df-detail-media button:first-child img { aspect-ratio: 16 / 8; }
.df-chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0; }
.df-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--df-line);
  color: var(--df-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .06em;
  padding: 7px 11px;
  text-transform: uppercase;
}
.df-empty { border: 1px dashed var(--df-line); padding: 60px 30px; text-align: center; }

/* ── responsive ───────────────────────────────────────────── */

@media (max-width: 1100px) {
  .df-shell { width: min(100% - 40px, 1200px); }
  .df-grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .df-facility-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .df-footer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .df-service-layout { grid-template-columns: minmax(0, 1fr); }
  .df-sticky { position: static; }
}

@media (max-width: 991px) {
  .df-nav,
  .df-header-cta,
  .df-brand-line { display: none; }
  .df-header-inner { grid-template-columns: 1fr auto; min-height: 72px; }
  .df-header-overlay .df-header-inner { padding-top: 40px; }
  .df-nav-menu-button { display: inline-grid; }
  .df-hero { min-height: 778px; padding: 112px 0 199px; }
  .df-hero-inner { padding-top: 140px; }
  .df .df-hero-title { font-size: 100px; line-height: .8; margin-top: 10px; }
  .df-hero-subtitle span:not(.df-hero-subtitle-icon) { font-size: 14px; }
  .df-hero-button { font-size: 16px; }
  .df-intro,
  .df-facilities,
  .df-feedback,
  .df-gallery { padding-top: 64px; padding-bottom: 64px; }
  .df-rooms { padding-top: 16px; padding-bottom: 64px; }
  .df-lake { padding-top: 64px; padding-bottom: 56px; }
  .df-dining { padding: 64px 0; }
  .df-dining-grid,
  .df-lake-grid,
  .df-split { grid-template-columns: 1fr; }
  .df-dining-media { min-height: 380px; }
  .df-lake-media { min-height: 420px; }
  .df-feature-grid,
  .df-contact-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .df-gallery-page { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 767px) {
  .df-hero { padding-bottom: 150px; }
  .df .df-hero-title { font-size: 80px; }
  .df-mobile-panel { padding: 24px; }
}

@media (max-width: 640px) {
  .df-shell { width: calc(100% - 28px); }
  .df-section { padding: 72px 0; }
  .df-brand { font-size: 23px; }
  .df-header-inner { min-height: 68px; }
  .df-nav-menu-button { width: 58px; height: 58px; }
  .df-hero { min-height: 610px; padding: 108px 0 137px; }
  .df-hero-inner { padding-top: 100px; }
  .df .df-hero-title { font-size: 50px; line-height: 1.12; }
  .df-hero-subtitle { padding: 15px; line-height: 1.1; }
  .df-hero-button { min-height: 59px; font-size: 16px; padding: 20px 30px; }
  .df-intro { padding-top: 64px; }
  .df-intro-grid { grid-template-columns: 1fr; gap: 28px; }
  .df-h2 { font-size: clamp(36px, 10vw, 48px); }
  .df-grid-3,
  .df-facility-grid,
  .df-feature-grid,
  .df-contact-grid { grid-template-columns: 1fr; }
  .df-head-row { align-items: flex-start; flex-direction: column; }
  .df-facility { min-height: 0; }
  .df-lake-row { grid-template-columns: 44px 1fr; }
  .df-lake-row .df-btn { grid-column: 2; justify-self: start; }
  .df-marquee { margin-top: 48px; }
  .df-review-track { grid-auto-columns: minmax(84vw, 1fr); }
  .df-feedback-actions { display: flex; flex-wrap: nowrap; justify-content: center; gap: 8px; }
  .df-feedback-actions .df-btn { min-height: 44px; padding: 9px 12px; font-size: 13px; white-space: nowrap; }
  .df-gallery-actions { flex-direction: row; flex-wrap: nowrap; gap: 8px; }
  .df-gallery-actions .df-btn { min-height: 42px; padding: 8px 12px; font-size: 13px; white-space: nowrap; }
  .df-gallery-row button { width: 160px; height: 120px; }
  .df-footer { padding-top: 64px; }
  .df-footer-grid { grid-template-columns: 1fr; gap: 38px; padding-bottom: 48px; }
  .df-pagehero { padding: 88px 0 40px; }
  .df-pagehero h1 { font-size: clamp(44px, 12vw, 62px); }
  .df-gallery-page { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .df-service-row { grid-template-columns: 1fr; }
  .df-service-row-media { min-height: 220px; }
  .df-detail-media { grid-template-columns: 1fr; }
  .df-detail-media img:first-child { grid-column: span 1; }
  .df-item-detail-split .df-detail-media { grid-template-columns: minmax(0, 1fr); max-width: 320px; }
  .df-item-detail-split .df-detail-media button:first-child { grid-column: span 1; }
  .df-about-values .df-equal-cards > div > .df-feature { min-height: 250px; }
  .df-rooms-grid .df-price { font-size: 12px; }
  .df-rooms-grid .df-price strong { font-size: 22px; }
  :where(.df) :is(h1, h2, h3, h4, .df-h2, .df-h3, .df-room-title, .tp-h3) { text-align: center; }
  :where(.df) :is(.df-btn, .tp-btn, .df-textlink):not(.df-btn-block):not(.w-full) {
    display: flex;
    width: fit-content;
    margin-inline: auto;
    justify-content: center;
    text-align: center;
  }
  :where(.df) .df-gallery-actions .df-btn { width: fit-content !important; margin-inline: 0 !important; }
  :where(.df) .df-feedback-actions .df-btn { margin-inline: 0 !important; }
}

@media (prefers-reduced-motion: reduce) {
  .df *,
  .df *::before,
  .df *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
  .df-marquee,
  .df-gallery-row { animation: none !important; }
}
`;
