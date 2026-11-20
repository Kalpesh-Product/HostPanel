// Orchard Living's look — a calm, residential editorial style inspired by the
// reference: Outfit type, warm off-white canvas, quiet grey body copy and a deep
// charcoal heading colour. It reuses the neutral tp-* primitives from Wayfarer so
// the shared forms, modals and overlays inherit the same theme variables.

import { WAYFARER_CSS } from "../wayfarer/wayfarerTheme";

export const ORCHARD_PALETTE = {
  bg: "#fafaf9",
  text: "#6e6b68",
  accent: "#353b41",
  secondary: "#a8b5a2",
};

export const ORCHARD_CSS = String.raw`
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

${WAYFARER_CSS}

.ol {
  --ol-heading: #353b41;
  --ol-muted: #6e6b68;
  --ol-line: #e5e3df;
  --ol-soft: #f3f2ee;
  background: var(--t-bg, #fafaf9);
  color: var(--t-text, #6e6b68);
  font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.ol h1,
.ol h2,
.ol h3,
.ol h4,
.ol .tp-display {
  font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif;
  color: var(--ol-heading);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.02;
}

.ol p { line-height: 1.7; }
.ol button { font-family: inherit; }
.ol img { display: block; max-width: 100%; }

.ol-shell {
  width: min(100% - 40px, 1360px);
  margin-inline: auto;
}

.ol-section { padding: 72px 0; }
.ol-section-tight { padding: 48px 0; }
.ol-section-soft { background: var(--ol-soft); }

.ol-eyebrow {
  margin: 0 0 18px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ol-muted);
}

.ol-heading {
  margin: 0;
  font-size: clamp(38px, 5.2vw, 72px);
  max-width: 900px;
}

.ol-heading-sm {
  font-size: clamp(30px, 3.4vw, 50px);
}

.ol-lead {
  margin: 24px 0 0;
  max-width: 690px;
  font-size: clamp(15px, 1.3vw, 18px);
  line-height: 1.75;
  color: var(--ol-muted);
}

.ol-textlink {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-bottom: 1px solid currentColor;
  background: transparent;
  color: var(--ol-heading);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 0 0 5px;
  text-transform: uppercase;
}
.ol-textlink:hover { color: var(--t-accent-fg, var(--t-accent)); }

.ol-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  border: 1px solid var(--ol-heading);
  background: var(--ol-heading);
  color: #fff;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 0 26px;
  text-transform: uppercase;
  transition: transform .2s ease, background .2s ease, color .2s ease;
}
.ol-btn:hover { transform: translateY(-2px); background: var(--t-accent, #353b41); }
.ol-btn-outline {
  background: transparent;
  border-color: color-mix(in srgb, var(--ol-heading) 40%, transparent);
  color: var(--ol-heading);
}
.ol-btn-outline:hover { background: var(--ol-heading); color: #fff; }
.ol-btn-light {
  background: #fff;
  border-color: #fff;
  color: var(--ol-heading);
}
.ol-btn-light:hover { background: var(--t-accent, #353b41); border-color: var(--t-accent, #353b41); color: #fff; }

/* ── header ───────────────────────────────────────────────── */

.ol-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--t-bg, #fafaf9) 94%, transparent);
  border-bottom: 1px solid var(--ol-line);
  backdrop-filter: blur(16px);
}
.ol-header-inner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
  min-height: 78px;
}
.ol-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  justify-self: start;
  max-width: 260px;
  border: 0;
  background: none;
  color: var(--ol-heading);
  cursor: pointer;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.02em;
  text-align: left;
}
.ol-brand img { max-height: 40px; width: auto; object-fit: contain; }
.ol-nav { display: flex; align-items: center; gap: clamp(18px, 2.4vw, 38px); }
.ol-navlink {
  position: relative;
  border: 0;
  background: none;
  color: var(--ol-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 0;
  white-space: nowrap;
}
.ol-navlink::after {
  content: "";
  position: absolute;
  left: 0;
  right: 100%;
  bottom: 2px;
  height: 1px;
  background: currentColor;
  transition: right .25s ease;
}
.ol-navlink:hover,
.ol-navlink[aria-current="page"] { color: var(--ol-heading); }
.ol-navlink:hover::after,
.ol-navlink[aria-current="page"]::after { right: 0; }
.ol-header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.ol-iconbtn {
  display: inline-grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--ol-line);
  border-radius: 50%;
  background: transparent;
  color: var(--ol-heading);
  cursor: pointer;
}
.ol-iconbtn:hover { border-color: var(--ol-heading); }
.ol-mobile-panel {
  border-top: 1px solid var(--ol-line);
  background: var(--t-bg, #fafaf9);
  padding: 14px 20px 26px;
}
.ol-mobile-link {
  display: block;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--ol-line);
  background: none;
  color: var(--ol-heading);
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  padding: 14px 0;
  text-align: left;
}

/* ── hero ─────────────────────────────────────────────────── */

.ol-hero {
  position: relative;
  min-height: clamp(560px, 86vh, 920px);
  display: flex;
  align-items: center;
  overflow: hidden;
  background: #d8d5cf;
}
.ol-hero-frame {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.ol-hero-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ol-hero-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(20,22,23,.2) 0%, rgba(20,22,23,.46) 100%);
}
.ol-hero-content {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 110px 0 90px;
  color: #fff;
}
.ol-hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 24px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
.ol-hero-kicker::before {
  content: "";
  width: 42px;
  height: 1px;
  background: currentColor;
}
.ol-hero-title {
  max-width: 1050px;
  margin: 0;
  color: #fff;
  font-size: clamp(54px, 8.4vw, 122px);
  font-weight: 500;
  line-height: .94;
  letter-spacing: -0.055em;
}
/* The global .ol h1 rule is more specific than .ol-hero-title on its own. */
.ol .ol-hero-title { color: #fff; }
.ol-hero-copy {
  max-width: 520px;
  margin: 30px 0 0;
  font-size: clamp(17px, 1.6vw, 22px);
  line-height: 1.6;
}
.ol-hero-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 38px; }
.ol-down {
  position: absolute;
  z-index: 1;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255,255,255,.7);
  border-radius: 50%;
  color: #fff;
  background: transparent;
  cursor: pointer;
}
.ol-down:hover { background: rgba(255,255,255,.16); }

/* ── welcome ──────────────────────────────────────────────── */

.ol-welcome-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, .86fr);
  gap: clamp(28px, 6vw, 96px);
  align-items: center;
}
.ol-photo {
  position: relative;
  overflow: hidden;
  border-radius: 2px;
  background: var(--ol-soft);
}
.ol-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .7s cubic-bezier(.22,1,.36,1);
}
.ol-photo:hover img { transform: scale(1.04); }
.ol-welcome-photo { aspect-ratio: 1.12 / 1; }
.ol-welcome-photo-small {
  aspect-ratio: 1 / .72;
  margin-top: 28px;
  margin-left: 14%;
  width: 86%;
}

/* ── amenities ────────────────────────────────────────────── */

.ol-amenity-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr);
  gap: clamp(32px, 6vw, 90px);
  align-items: start;
}
.ol-amenity-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 34px 0 22px;
}
.ol-amenity-tab {
  border: 1px solid var(--ol-line);
  border-radius: 999px;
  background: transparent;
  color: var(--ol-muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  padding: 10px 18px;
}
.ol-amenity-tab:hover,
.ol-amenity-tab.is-active {
  border-color: var(--ol-heading);
  background: var(--ol-heading);
  color: #fff;
}
.ol-amenity-stage {
  position: relative;
  aspect-ratio: 1.45 / 1;
  overflow: hidden;
  background: var(--ol-soft);
}
.ol-amenity-stage img { width: 100%; height: 100%; object-fit: cover; }
.ol-amenity-caption {
  position: absolute;
  left: 24px;
  bottom: 24px;
  padding: 7px 16px;
  border-radius: 999px;
  background: rgba(255,255,255,.92);
  color: var(--ol-heading);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.ol-amenity-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 28px;
  margin-top: 34px;
  border-top: 1px solid var(--ol-line);
}
.ol-amenity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--ol-line);
  padding: 16px 0;
  font-size: 14px;
}
.ol-amenity-item svg { flex: none; color: var(--ol-heading); }

/* ── floor plans ──────────────────────────────────────────── */

.ol-plans-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(18px, 2.4vw, 34px);
  margin-top: 46px;
}
.ol-plan-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ol-line);
  background: color-mix(in srgb, var(--t-bg, #fafaf9) 88%, #fff);
  transition: transform .3s ease, box-shadow .3s ease;
}
.ol-plan-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 30px 60px -46px rgba(30,34,36,.65);
}
.ol-plan-media {
  position: relative;
  aspect-ratio: 1.28 / 1;
  overflow: hidden;
  background: var(--ol-soft);
}
.ol-plan-media img { width: 100%; height: 100%; object-fit: cover; }
.ol-plan-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  border-radius: 999px;
  background: #fff;
  color: var(--ol-heading);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .1em;
  padding: 7px 13px;
  text-transform: uppercase;
}
.ol-plan-body { display: flex; flex: 1; flex-direction: column; padding: 25px 25px 27px; }
.ol-plan-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.ol-plan-title h3 { margin: 0; font-size: 30px; }
.ol-plan-specs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin-top: 12px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.ol-plan-price { margin: 24px 0 0; font-size: 15px; }
.ol-plan-price strong { color: var(--ol-heading); font-size: 22px; font-weight: 600; }
.ol-plan-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }

/* ── unit features ────────────────────────────────────────── */

.ol-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 34px 40px;
  margin-top: 44px;
}
.ol-feature {
  border-top: 1px solid var(--ol-line);
  padding-top: 22px;
}
.ol-feature-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-bottom: 18px;
  border: 1px solid var(--ol-line);
  border-radius: 50%;
  color: var(--ol-heading);
}
.ol-feature h3 { margin: 0; font-size: 19px; }
.ol-feature p { margin: 9px 0 0; font-size: 14px; line-height: 1.65; }

/* ── banner ───────────────────────────────────────────────── */

.ol-banner {
  position: relative;
  min-height: clamp(420px, 64vh, 720px);
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #353b41;
}
.ol-banner-frame {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.ol-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: .72;
}
.ol-banner-content { position: relative; z-index: 1; max-width: 900px; text-align: center; color: #fff; padding: 60px 0; }
.ol-banner-content h2 {
  margin: 0;
  color: #fff;
  font-size: clamp(42px, 6.4vw, 94px);
  font-weight: 500;
  line-height: .98;
}
/* Keep inverted-section headings white despite the global .ol h2 colour. */
.ol .ol-banner-content h2 { color: #fff; }
.ol-banner-content p { margin: 20px auto 0; max-width: 600px; color: rgba(255,255,255,.82); font-size: 17px; }

/* ── spaces slider ────────────────────────────────────────── */

.ol-space-tabs {
  display: flex;
  gap: 30px;
  margin: 34px 0 20px;
  border-bottom: 1px solid var(--ol-line);
}
.ol-space-tab {
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--ol-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .1em;
  padding: 0 0 14px;
  text-transform: uppercase;
}
.ol-space-tab.is-active { border-color: var(--ol-heading); color: var(--ol-heading); }
.ol-space-stage {
  position: relative;
  aspect-ratio: 2.1 / 1;
  overflow: hidden;
  background: var(--ol-soft);
}
.ol-space-stage img { width: 100%; height: 100%; object-fit: cover; }
.ol-space-label {
  position: absolute;
  left: 28px;
  bottom: 26px;
  border-radius: 999px;
  background: rgba(255,255,255,.94);
  color: var(--ol-heading);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .12em;
  padding: 8px 18px;
  text-transform: uppercase;
}
.ol-space-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid rgba(255,255,255,.8);
  border-radius: 50%;
  background: rgba(20,22,23,.22);
  color: #fff;
  cursor: pointer;
}
.ol-space-arrow:hover { background: rgba(20,22,23,.42); }
.ol-space-prev { left: 20px; }
.ol-space-next { right: 20px; }

/* ── neighbourhood ────────────────────────────────────────── */

.ol-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 20px;
  margin: 42px 0 52px;
  border-top: 1px solid var(--ol-line);
  border-bottom: 1px solid var(--ol-line);
  padding: 28px 0;
}
.ol-stat strong {
  display: block;
  color: var(--ol-heading);
  font-size: clamp(28px, 3.2vw, 46px);
  font-weight: 600;
  line-height: 1;
}
.ol-stat span {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.ol-neighborhood-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr);
  gap: 26px;
  align-items: stretch;
}
.ol-neighborhood-hero { min-height: 100%; }
.ol-neighborhood-card {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 20px;
  align-items: center;
  border: 1px solid var(--ol-line);
  padding: 12px;
}
.ol-neighborhood-card + .ol-neighborhood-card { margin-top: 12px; }
.ol-neighborhood-card img { width: 120px; height: 90px; object-fit: cover; }
.ol-neighborhood-card h3 { margin: 0; font-size: 18px; }
.ol-neighborhood-card p { margin: 6px 0 0; font-size: 13px; line-height: 1.5; }

/* ── tour / contact ───────────────────────────────────────── */

.ol-tour-grid {
  display: grid;
  grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr);
  gap: clamp(30px, 6vw, 90px);
  align-items: start;
}
.ol-tour-panel {
  border: 1px solid var(--ol-line);
  background: color-mix(in srgb, var(--t-bg, #fafaf9) 90%, #fff);
  padding: clamp(22px, 3vw, 42px);
}
.ol-tour-note {
  margin-top: 22px;
  border-top: 1px solid var(--ol-line);
  padding-top: 22px;
  font-size: 14px;
}
.ol-tour-note strong { color: var(--ol-heading); }
.ol-contact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-top: 42px;
}
.ol-contact-item { border-top: 1px solid var(--ol-line); padding-top: 16px; }
.ol-contact-item span {
  display: block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.ol-contact-item a,
.ol-contact-item p { display: block; margin: 9px 0 0; color: var(--ol-heading); font-size: 15px; }

/* ── service / detail pages ───────────────────────────────── */

.ol-pagehero { padding: 76px 0 36px; }
.ol-pagehero h1 { font-size: clamp(46px, 7vw, 108px); font-weight: 500; }
.ol-pagehero p { max-width: 640px; margin: 24px 0 0; font-size: 17px; }
.ol-index-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 30px;
  margin-top: 42px;
}
.ol-index-card {
  border: 1px solid var(--ol-line);
  background: color-mix(in srgb, var(--t-bg, #fafaf9) 90%, #fff);
  text-align: left;
  cursor: pointer;
  padding: 0;
  color: inherit;
}
.ol-index-card:hover { border-color: var(--ol-heading); }
.ol-index-card img { width: 100%; aspect-ratio: 1.6 / 1; object-fit: cover; }
.ol-index-card-body { padding: 24px; }
.ol-index-card h2 { margin: 8px 0 0; font-size: 28px; }
.ol-detail-gallery {
  display: grid;
  grid-template-columns: 1.35fr .65fr;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 12px;
  height: clamp(360px, 54vw, 620px);
  margin-top: 36px;
}
.ol-detail-gallery button { border: 0; padding: 0; overflow: hidden; cursor: zoom-in; background: var(--ol-soft); }
.ol-detail-gallery button:first-child { grid-row: span 2; }
.ol-detail-gallery img { width: 100%; height: 100%; object-fit: cover; }
.ol-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: clamp(32px, 6vw, 90px);
  margin-top: 56px;
  align-items: start;
}
.ol-detail-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 26px; margin-top: 28px; }
.ol-detail-list div { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--ol-line); padding-bottom: 12px; font-size: 14px; }
.ol-detail-card { position: sticky; top: 104px; border: 1px solid var(--ol-line); background: color-mix(in srgb, var(--t-bg, #fafaf9) 90%, #fff); padding: 28px; }

/* ── reviews & gallery ────────────────────────────────────── */

.ol-review-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 30px; margin-top: 40px; }
.ol-review { border-top: 1px solid var(--ol-line); padding-top: 24px; }
.ol-review blockquote { margin: 18px 0 0; font-size: 18px; line-height: 1.7; color: var(--ol-heading); }
.ol-review figcaption { margin-top: 20px; font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; }
.ol-gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 220px;
  gap: 12px;
  margin-top: 42px;
}
.ol-gallery-grid button { border: 0; padding: 0; overflow: hidden; cursor: zoom-in; background: var(--ol-soft); }
.ol-gallery-grid button.is-wide { grid-column: span 2; grid-row: span 2; }
.ol-gallery-grid img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.ol-gallery-grid button:hover img { transform: scale(1.04); }

/* ── footer ───────────────────────────────────────────────── */

.ol-footer { margin-top: 80px; border-top: 1px solid var(--ol-line); padding: 66px 0 28px; }
.ol-footer-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) repeat(3, minmax(0, 1fr));
  gap: 40px;
}
.ol-footer-brand { font-size: clamp(30px, 4vw, 52px); line-height: 1; }
.ol-footer-col h3 {
  margin: 0 0 18px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .18em;
  text-transform: uppercase;
}
.ol-footer-col button,
.ol-footer-col a,
.ol-footer-col p { display: block; margin: 0 0 10px; color: var(--ol-muted); font-size: 14px; text-decoration: none; }
.ol-footer-col button { border: 0; background: none; cursor: pointer; padding: 0; text-align: left; }
.ol-footer-col button:hover,
.ol-footer-col a:hover { color: var(--ol-heading); }
.ol-socials { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.ol-socials > * { display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--ol-line); border-radius: 50%; color: var(--ol-heading); }
.ol-footer-bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  margin-top: 54px;
  border-top: 1px solid var(--ol-line);
  padding-top: 22px;
  font-size: 12px;
}

/* ── supporting details ───────────────────────────────────── */

.ol-banner .ol-eyebrow-inverted {
  color: rgba(255, 255, 255, .78);
}

.ol-plan-media {
  display: block;
  width: 100%;
  border: 0;
  padding: 0;
  background: var(--ol-soft);
  cursor: pointer;
}
.ol-plan-index {
  color: var(--ol-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .12em;
}
.ol-plan-copy {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.65;
}

.ol-feature { position: relative; }
.ol-feature-number {
  position: absolute;
  right: 0;
  top: 22px;
  color: color-mix(in srgb, var(--ol-muted) 45%, transparent);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .12em;
}

.ol-pagehero-media { aspect-ratio: 2.8 / 1; margin-top: 12px; }

.ol-detail-gallery-section { margin-top: 12px; }
.ol-good-to-know {
  margin-top: 38px;
  border: 1px solid var(--ol-line);
  padding: 26px;
}
.ol-good-to-know h3 { margin: 0 0 18px; font-size: 22px; }
.ol-good-to-know dl { display: grid; gap: 12px; margin: 0; }
.ol-good-to-know dl > div { display: flex; justify-content: space-between; gap: 18px; border-bottom: 1px solid var(--ol-line); padding-bottom: 10px; font-size: 14px; }
.ol-good-to-know dt { color: var(--ol-muted); }
.ol-good-to-know dd { margin: 0; color: var(--ol-heading); font-weight: 600; }
.ol-good-to-know > p { margin: 18px 0 0; font-size: 14px; }
.ol-detail-card h3 { margin: 0 0 24px; font-size: 28px; }

.ol-about-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(26px, 5vw, 76px);
  align-items: center;
}
.ol-about-photo { aspect-ratio: 1.1 / 1; }
.ol-about-photo-offset { margin-top: 44px; }
.ol-team-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; margin-top: 40px; }
.ol-team-card h3 { margin: 18px 0 0; font-size: 20px; }
.ol-team-card p { margin: 7px 0 0; font-size: 13px; }
.ol-team-photo { aspect-ratio: 4 / 5; }

.ol-review-intro { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 42px; }
.ol-review-intro h2 { margin: 0; font-size: clamp(32px, 4vw, 56px); }
.ol-contact-map iframe { display: block; width: 100%; min-height: 360px; border: 0; }

.ol-job { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, .8fr); gap: clamp(28px, 5vw, 74px); padding-top: 34px; padding-bottom: 40px; }
.ol-job h2 { margin: 0 0 24px; font-size: clamp(30px, 3.4vw, 46px); }
.ol-job-apply { grid-template-columns: minmax(0, 1fr); justify-items: center; row-gap: 48px; }
.ol-job-apply > div:first-child { width: 100%; max-width: 820px; margin-inline: auto; }
.ol-apply-panel { width: 100%; max-width: 720px; margin-inline: auto; text-align: center; }
.ol-apply-panel-inner { max-width: 620px; margin-inline: auto; }
.ol-apply-panel .ol-textlink { margin-bottom: 16px; }
.ol-apply-panel h2 { text-align: center; }
.ol-apply-panel form { max-width: 620px; margin-inline: auto; text-align: left; }
.ol-apply-panel form > div:last-child { display: flex; justify-content: center; }
.ol-role-list { display: grid; gap: 12px; margin-top: 40px; }
.ol-role-list button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px 24px;
  align-items: center;
  border: 1px solid var(--ol-line);
  background: color-mix(in srgb, var(--t-bg, #fafaf9) 90%, #fff);
  cursor: pointer;
  padding: 24px 26px;
  text-align: left;
  color: var(--ol-heading);
}
.ol-role-list button:hover { border-color: var(--ol-heading); }
.ol-role-list button .ol-eyebrow { grid-column: 1 / -1; margin: 0; }
.ol-role-list button strong { font-size: clamp(20px, 2.4vw, 30px); font-weight: 600; }
.ol-no-roles { border-top: 1px solid var(--ol-line); margin-top: 40px; padding-top: 28px; }

@media (min-width: 1101px) {
  .ol-header-actions .ol-iconbtn { display: none; }
}

/* ── responsive ───────────────────────────────────────────── */

@media (max-width: 1100px) {
  .ol-header-inner { grid-template-columns: 1fr auto; }
  .ol-nav { display: none; }
  .ol-hero { min-height: 660px; }
  .ol-welcome-grid,
  .ol-amenity-grid,
  .ol-neighborhood-grid,
  .ol-tour-grid,
  .ol-detail-grid,
  .ol-about-grid,
  .ol-job { grid-template-columns: 1fr; }
  .ol-plans-grid,
  .ol-feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ol-team-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ol-about-photo-offset { margin-top: 0; }
  .ol-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .ol-footer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ol-pagehero-media { aspect-ratio: 2 / 1; }
}

@media (max-width: 760px) {
  .ol-shell { width: min(100% - 32px, 1360px); }
  .ol-section { padding: 52px 0; }
  .ol-section-tight { padding: 36px 0; }
  .ol-header-inner { min-height: 66px; }
  .ol-brand { font-size: 17px; }
  .ol-header-cta { display: none; }
  .ol-hero { min-height: 620px; }
  .ol-hero-content { padding: 80px 0 92px; }
  .ol-hero-title { font-size: clamp(46px, 13vw, 72px); }
  .ol-hero-copy { font-size: 16px; }
  .ol-welcome-photo-small { margin-left: 0; width: 100%; }
  .ol-amenity-stage { aspect-ratio: 1.15 / 1; }
  .ol-amenity-list,
  .ol-plans-grid,
  .ol-feature-grid,
  .ol-review-grid,
  .ol-index-grid,
  .ol-contact-grid,
  .ol-detail-list,
  .ol-team-grid,
  .ol-footer-grid { grid-template-columns: 1fr; }
  .ol-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ol-pagehero-media { aspect-ratio: 1.35 / 1; }
  .ol-review-intro { align-items: start; flex-direction: column; }
  .ol-good-to-know { padding: 20px; }
  .ol-role-list button { padding: 20px; }
  .ol-space-stage { aspect-ratio: 1.1 / 1; }
  .ol-neighborhood-card { grid-template-columns: 92px 1fr; }
  .ol-neighborhood-card img { width: 92px; height: 74px; }
  .ol-detail-gallery { grid-template-columns: 1fr; grid-template-rows: 320px 180px; height: auto; }
  .ol-detail-gallery button:first-child { grid-row: auto; }
  .ol-detail-gallery button:nth-child(n+3) { display: none; }
  .ol-detail-card { position: static; }
  .ol-gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 170px; }
  .ol-gallery-grid button.is-wide { grid-column: span 2; grid-row: span 1; }
  .ol-footer { margin-top: 56px; }
}

@media (max-width: 480px) {
  .ol-hero-title { font-size: clamp(40px, 14vw, 56px); }
  .ol-hero-actions { flex-direction: column; align-items: stretch; }
  .ol-hero-actions .ol-btn { width: 100%; }
  .ol-amenity-tabs { gap: 6px; }
  .ol-amenity-tab { padding: 8px 12px; font-size: 11px; }
  .ol-space-tabs { gap: 18px; }
  .ol-plan-body { padding: 20px; }
  .ol-banner-content h2 { font-size: 38px; }
}

@media (prefers-reduced-motion: reduce) {
  .ol *,
  .ol *::before,
  .ol *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
`;
