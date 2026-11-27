export const WORKHUB_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
/* WorkHub — light workspace pages with navy editorial sections and blue actions.
   Everything here is scoped under .wh / .wh- so it cannot leak into other templates. */
.wh {
  /* Theme defaults. buildThemeVars("workhub", styleConfig) is applied inline on the
     same element, so owner colours override these without touching the layout. */
  --t-bg: #f0f2fb;
  --t-text: #242839;
  --t-accent: #285fe2;
  --t-accent-text: #f6f8ff;
  --t-accent-light: #e8efff;
  --t-accent-dark: #1c49b8;
  --t-surface: #ffffff;
  --t-surface2: #f0f2fb;
  --t-raised: #ffffff;
  --t-muted: #535a7a;
  --t-line: #dfe3f2;
  --t-secondary: #242839;
  --t-secondary-text: #ffffff;
  --t-secondary-fg: #242839;
  --t-tint3: #dfe7ff;
  --wh-navy: #242839;
  --wh-navy-soft: #323751;
  --wh-blue: var(--t-accent);
  --wh-blue-dark: var(--t-accent-dark);
  --wh-blue-text: var(--t-accent-text);
  --wh-paper: var(--t-bg);
  --wh-ink: var(--t-text);
  --wh-muted: var(--t-muted);
  --wh-surface: var(--t-surface);
  --wh-pale: var(--t-surface2);
  --wh-line: var(--t-line);
  --wh-radius: 26px;
  min-height: 100vh;
  overflow-x: clip;
  background: var(--wh-paper);
  color: var(--wh-ink);
  font-family: Outfit, "Inter", "Segoe UI", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.wh * {
  box-sizing: border-box;
}

.wh button,
.wh input,
.wh textarea,
.wh select {
  font: inherit;
}

.wh button {
  color: inherit;
}

.wh img {
  display: block;
  max-width: 100%;
}

.wh h1,
.wh h2,
.wh h3,
.wh h4,
.wh p,
.wh blockquote,
.wh figure {
  margin: 0;
}

.wh a {
  color: inherit;
}

.wh-shell {
  width: min(100% - clamp(28px, 6vw, 96px), 1340px);
  margin-inline: auto;
}

.wh-section {
  padding: clamp(72px, 8.5vw, 128px) 0;
}

.wh-eyebrow,
.wh-label {
  font-size: 10px !important;
  font-weight: 700;
  letter-spacing: .16em;
  line-height: 1.4;
  text-transform: uppercase;
}

.wh-label {
  color: var(--wh-blue);
}

.wh-muted {
  color: var(--wh-muted);
}

/* ── Shared controls ───────────────────────────────────────────── */
.wh .wh-btn,
.wh .wh-btn-soft,
.wh .wh-btn-outline,
.wh .wh-btn-white {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 26px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--wh-blue);
  color: var(--wh-blue-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: transform .25s ease, background .25s ease, box-shadow .25s ease;
}

.wh .wh-btn:hover,
.wh .wh-btn-soft:hover,
.wh .wh-btn-outline:hover,
.wh .wh-btn-white:hover {
  transform: translateY(-2px);
}

.wh .wh-btn:hover {
  background: var(--wh-blue-dark);
  box-shadow: 0 14px 30px rgba(40, 95, 226, .22);
}

.wh .wh-btn-soft {
  background: var(--wh-pale);
  color: var(--wh-ink);
}

.wh .wh-btn-soft:hover {
  background: #e5e9f8;
}

.wh .wh-btn-outline {
  background: transparent;
  border-color: var(--wh-line);
  color: var(--wh-ink);
}

.wh .wh-btn-white {
  background: #ffffff;
  color: var(--wh-navy);
}

.wh .wh-btn-white:hover {
  background: #f0f2fb;
}

.wh .wh-btn svg {
  flex: none;
}

.wh .wh-textlink {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: none;
  padding: 6px 0;
  color: var(--wh-blue);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.wh .wh-textlink:hover {
  color: var(--wh-blue-dark);
}

.wh .wh-image,
.wh .wh-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh .wh-placeholder {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #e9edfa, #dfe4f4);
  color: #9299ad;
}

.wh .wh-placeholder span {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .18em;
}

.wh .wh-shell > svg,
.wh svg {
  flex: none;
}

/* ── Loader ────────────────────────────────────────────────────── */
.wh-loader {
  position: fixed;
  inset: 0;
  z-index: 220;
  display: grid;
  place-items: center;
  background: var(--wh-navy);
  color: #ffffff;
}

.wh-loader > div {
  display: grid;
  justify-items: center;
  gap: 22px;
  padding: 20px;
}

.wh-loader span {
  font-size: clamp(30px, 5vw, 66px);
  font-weight: 600;
  letter-spacing: -.05em;
  text-align: center;
  overflow-wrap: anywhere;
}

.wh-loader i {
  width: min(190px, 60vw);
  height: 2px;
  background: #ffffff;
  transform-origin: left center;
  animation: wh-load .9s cubic-bezier(.22, 1, .36, 1);
}

@keyframes wh-load {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* ── Header / drawer ───────────────────────────────────────────── */
.wh-header {
  position: sticky;
  top: 0;
  z-index: 80;
  background: rgba(255, 255, 255, .96);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid transparent;
  transition: box-shadow .3s ease, border-color .3s ease;
}

.wh-header-scrolled {
  border-bottom-color: var(--wh-line);
  box-shadow: 0 10px 36px rgba(36, 40, 57, .08);
}

.wh-header-inner {
  min-height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(16px, 3vw, 42px);
}

.wh-brand {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  flex: none;
  min-width: 0;
  border: 0;
  background: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.wh-brand img {
  width: auto;
  max-width: 178px;
  max-height: 44px;
  object-fit: contain;
}

.wh-brand-name {
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -.035em;
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.wh-brand-tag {
  border-left: 1px solid var(--wh-line);
  padding-left: 14px;
  color: var(--wh-muted);
  font-size: 9px;
  font-style: normal;
  font-weight: 600;
  letter-spacing: .1em;
  line-height: 1.35;
  text-transform: uppercase;
}

.wh-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(14px, 2.3vw, 34px);
  flex: 1;
  min-width: 0;
}

.wh-nav button {
  border: 0;
  background: none;
  padding: 8px 0;
  color: var(--wh-ink);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: color .2s ease;
}

.wh-nav button:hover,
.wh-nav button.wh-nav-active {
  color: var(--wh-blue);
}

.wh-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
}

.wh-header-cta {
  min-height: 46px;
  padding: 0 22px;
  font-size: 13px;
}

.wh-menu {
  width: 46px;
  height: 46px;
  display: none;
  place-items: center;
  border: 1px solid var(--wh-line);
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
}

.wh-drawer {
  position: fixed;
  inset: 0;
  z-index: 180;
}

.wh-drawer-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(20, 23, 36, .55);
  backdrop-filter: blur(5px);
}

.wh-drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: min(92vw, 500px);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: clamp(22px, 5vw, 36px);
  background: #ffffff;
  overflow-y: auto;
}

.wh-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.wh-drawer-head .wh-brand {
  flex: 1 1 auto;
}

.wh-drawer-close {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex: none;
  border: 1px solid var(--wh-line);
  border-radius: 50%;
  background: none;
  cursor: pointer;
}

.wh-drawer-panel nav {
  display: flex;
  flex-direction: column;
}

.wh-drawer-panel nav button {
  display: grid;
  grid-template-columns: 34px 1fr auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--wh-line);
  background: none;
  padding: 16px 0;
  text-align: left;
  font-size: clamp(20px, 5vw, 27px);
  font-weight: 550;
  cursor: pointer;
}

.wh-drawer-panel nav button span {
  color: var(--wh-blue);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .12em;
}

.wh-drawer-cta {
  width: 100%;
  margin-top: auto;
}

/* ── Home hero ─────────────────────────────────────────────────── */
.wh-hero {
  padding: clamp(34px, 4vw, 58px) 0 clamp(70px, 7vw, 110px);
  background: var(--wh-paper);
}

.wh-hero-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  align-items: center;
}

.wh-hero-panel {
  position: relative;
  z-index: 2;
  grid-column: 1;
  justify-self: start;
  width: min(100%, 616px);
  margin-right: -72px;
  border-radius: 6px;
  background: #fbfbff;
  padding: clamp(42px, 4.4vw, 64px) clamp(28px, 3.3vw, 48px);
  box-shadow: 0 20px 60px rgba(36, 40, 57, .12);
}

.wh-hero-image {
  position: relative;
  z-index: 1;
  grid-column: 2;
  width: calc(100% + 72px);
  margin-left: -72px;
  min-height: 480px;
  aspect-ratio: 1.45 / 1;
  border-radius: 6px;
  overflow: hidden;
  background: #dfe4f4;
}

.wh-hero-image > img,
.wh-hero-image > .wh-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh-hero-panel-inner {
  max-width: 100%;
}

.wh-hero-panel h1 {
  margin: 0;
  font-size: clamp(34px, 3.4vw, 46px);
  font-weight: 600;
  letter-spacing: -.025em;
  line-height: 1.18;
}

.wh-hero-accent {
  color: var(--wh-blue);
}

.wh-hero-sub {
  margin: 12px 0 0;
  color: var(--wh-muted);
  font-size: clamp(16px, 1.45vw, 21px);
  line-height: 1.5;
}

.wh-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 28px;
}

/* ── Trusted row ───────────────────────────────────────────────── */
.wh-trusted {
  padding: clamp(38px, 5vw, 64px) 0;
  border-top: 1px solid var(--wh-line);
  background: #ffffff;
}

.wh-trusted-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px clamp(24px, 5vw, 70px);
}

.wh-trusted-label {
  flex: none;
  max-width: 170px;
  color: var(--wh-muted);
}

.wh-trusted-logos {
  flex: 1 1 250px;
  min-width: 0;
}

.wh-trusted-logos img {
  height: 44px;
  width: auto;
  max-width: 185px;
  object-fit: contain;
}

/* ── Section heads ─────────────────────────────────────────────── */
.wh-section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px 40px;
  margin-bottom: clamp(34px, 4vw, 58px);
}

.wh-section-head > div:first-child {
  max-width: 780px;
}

.wh-section-head h2,
.wh-heading {
  font-size: clamp(32px, 4.1vw, 60px);
  font-weight: 600;
  letter-spacing: -.05em;
  line-height: 1.06;
}

.wh-section-head p:not(.wh-label) {
  max-width: 600px;
  margin-top: 16px;
  color: var(--wh-muted);
  font-size: 15px;
  line-height: 1.7;
}

/* ── Services ──────────────────────────────────────────────────── */
.wh-services {
  background: var(--wh-pale);
}

.wh-services-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(16px, 2vw, 26px);
}

.wh-service-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 330px;
  border: 1px solid rgba(36, 40, 57, .06);
  border-radius: var(--wh-radius);
  background: #ffffff;
  padding: clamp(24px, 2.5vw, 36px);
  box-shadow: 0 14px 44px rgba(36, 40, 57, .045);
  transition: transform .3s ease, box-shadow .3s ease;
}

.wh-service-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 24px 60px rgba(36, 40, 57, .1);
}

.wh-service-num {
  color: var(--wh-blue);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .16em;
}

.wh-service-card h3 {
  font-size: clamp(21px, 2vw, 28px);
  font-weight: 600;
  letter-spacing: -.035em;
  line-height: 1.15;
}

.wh-service-card > p {
  color: var(--wh-muted);
  font-size: 14px;
  line-height: 1.7;
}

.wh-service-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--wh-line);
}

.wh-service-foot small {
  color: var(--wh-muted);
  font-size: 12px;
}

.wh .wh-service-thumb {
  width: 100%;
  height: 132px;
  border-radius: 16px;
  object-fit: cover;
}

.wh .wh-service-thumb.wh-placeholder {
  display: grid;
  place-items: center;
  background: var(--wh-pale);
}

/* ── Locations ─────────────────────────────────────────────────── */
.wh-locations {
  background: #ffffff;
}

.wh-location-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr);
  align-items: center;
  gap: clamp(32px, 5vw, 82px);
}

.wh-location-photo {
  position: relative;
  width: 100%;
  aspect-ratio: 1.18 / 1;
  border-radius: clamp(22px, 3vw, 38px);
  overflow: hidden;
  background: var(--wh-pale);
}

.wh-location-photo img,
.wh-location-photo .wh-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh-location-flag {
  position: absolute;
  left: 20px;
  bottom: 20px;
  display: flex;
  align-items: center;
  gap: 7px;
  max-width: calc(100% - 40px);
  border-radius: 999px;
  background: rgba(255, 255, 255, .95);
  padding: 10px 16px;
  color: var(--wh-navy);
  font-size: 11px;
  font-weight: 650;
}

.wh-location-tabs {
  display: flex;
  flex-direction: column;
  margin-top: clamp(24px, 3vw, 36px);
  border-top: 1px solid var(--wh-line);
}

.wh-location-tab {
  display: grid;
  grid-template-columns: 38px 1fr auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--wh-line);
  background: none;
  padding: 16px 2px;
  text-align: left;
  cursor: pointer;
  transition: color .2s ease;
}

.wh-location-tab:hover,
.wh-location-tab.wh-active {
  color: var(--wh-blue);
}

.wh-location-tab > span {
  color: var(--wh-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
}

.wh-location-tab.wh-active > span {
  color: var(--wh-blue);
}

.wh-location-tab strong {
  font-size: clamp(18px, 1.8vw, 24px);
  font-weight: 550;
  letter-spacing: -.03em;
}

.wh-location-tab small {
  color: var(--wh-muted);
  font-size: 12px;
}

.wh-location-info {
  margin-top: 28px;
}

.wh-location-info p {
  color: var(--wh-muted);
  font-size: 14px;
  line-height: 1.7;
}

.wh-location-info .wh-location-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 26px;
}

/* ── Split CTA panels ──────────────────────────────────────────── */
.wh-split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 2vw, 26px);
}

.wh-split-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 34px;
  min-height: 360px;
  border-radius: clamp(22px, 2.6vw, 34px);
  padding: clamp(28px, 3.6vw, 56px);
  overflow: hidden;
}

.wh-split-panel-dark {
  background: var(--wh-navy);
  color: #ffffff;
}

.wh-split-panel-light {
  background: var(--wh-pale);
  color: var(--wh-ink);
}

.wh-split-panel h3 {
  max-width: 480px;
  font-size: clamp(28px, 3.2vw, 46px);
  font-weight: 600;
  letter-spacing: -.05em;
  line-height: 1.08;
}

.wh-split-panel p {
  max-width: 470px;
  margin-top: 16px;
  font-size: 15px;
  line-height: 1.7;
  opacity: .78;
}

.wh-split-panel .wh-eyebrow {
  opacity: .7;
}

.wh-split-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.wh-split-panel-dark .wh-btn-outline {
  border-color: rgba(255, 255, 255, .38);
  color: #ffffff;
}

/* ── Testimonials ──────────────────────────────────────────────── */
.wh-testimonials,
.wh-cta-band,
.wh-footer {
  color: #ffffff;
}

.wh-testimonials {
  background: var(--wh-navy);
  padding: clamp(78px, 9vw, 132px) 0;
}

.wh-testimonials .wh-eyebrow {
  color: #93acff;
}

.wh-testimonial-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px 40px;
}

.wh-testimonial-head h2 {
  max-width: 640px;
  font-size: clamp(34px, 4.2vw, 62px);
  font-weight: 600;
  letter-spacing: -.05em;
  line-height: 1.05;
}

.wh-testimonial-head p {
  max-width: 420px;
  color: rgba(255, 255, 255, .65);
  font-size: 14px;
  line-height: 1.7;
}

.wh-testimonial-rating,
.wh-testimonial-stars {
  --t-accent-fg: #ffca71;
}

.wh-testimonial-rating {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  margin-top: 16px;
  font-size: 14px;
}

.wh-testimonial-stars {
  margin-bottom: 8px;
}

.wh-testimonial-review-action {
  margin-top: clamp(24px, 4vw, 44px);
  text-align: center;
}

.wh-testimonial-body {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(24px, 4vw, 66px);
  margin-top: clamp(38px, 5vw, 66px);
}

.wh-testimonial-photo {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 22px;
  overflow: hidden;
  background: var(--wh-navy-soft);
}

.wh-testimonial-photo img,
.wh-testimonial-photo .wh-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh-quote-mark {
  color: var(--wh-blue);
  font-size: 60px;
  font-weight: 600;
  line-height: .7;
}

.wh-testimonial-quote {
  margin-top: 14px;
  font-size: clamp(20px, 2.5vw, 36px);
  font-weight: 450;
  letter-spacing: -.025em;
  line-height: 1.38;
}

.wh-testimonial-name {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 14px;
  margin-top: 26px;
}

.wh-testimonial-name strong {
  font-size: 15px;
}

.wh-testimonial-name span {
  color: rgba(255, 255, 255, .6);
  font-size: 12px;
}

.wh-testimonial-arrows {
  display: flex;
  gap: 10px;
  align-self: end;
}

.wh-testimonial-arrows button {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, .32);
  border-radius: 50%;
  background: transparent;
  color: #ffffff;
  font-size: 18px;
  cursor: pointer;
  transition: background .2s ease, color .2s ease;
}

.wh-testimonial-arrows button:hover {
  background: #ffffff;
  color: var(--wh-navy);
}

/* ── CTA band ──────────────────────────────────────────────────── */
.wh-cta-band {
  padding: clamp(66px, 8vw, 112px) 0;
  background: linear-gradient(115deg, #285fe2 0%, #1f4bc0 55%, #242839 100%);
}

.wh-cta-band-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px 48px;
}

.wh-cta-band h2 {
  max-width: 720px;
  font-size: clamp(32px, 4.3vw, 62px);
  font-weight: 600;
  letter-spacing: -.05em;
  line-height: 1.06;
}

.wh-cta-band p {
  max-width: 620px;
  margin-top: 14px;
  color: rgba(255, 255, 255, .8);
  font-size: 15px;
  line-height: 1.7;
}

.wh-cta-band .wh-btn-white {
  color: #1f4bc0;
}

/* ── News ──────────────────────────────────────────────────────── */
.wh-news {
  background: #ffffff;
}

.wh-news-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  gap: clamp(16px, 2vw, 26px);
}

.wh-news-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--wh-line);
  border-radius: 22px;
  background: #ffffff;
  overflow: hidden;
  transition: transform .3s ease, box-shadow .3s ease;
}

.wh-news-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 46px rgba(36, 40, 57, .09);
}

.wh-news-media {
  width: 100%;
  aspect-ratio: 1.55 / 1;
  overflow: hidden;
  background: var(--wh-pale);
}

.wh-news-media img,
.wh-news-media .wh-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh-news-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: clamp(20px, 2.2vw, 30px);
}

.wh-news-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  color: var(--wh-muted);
  font-size: 11px;
}

.wh-news-meta b {
  color: var(--wh-blue);
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.wh-news-body h3 {
  font-size: clamp(19px, 1.8vw, 25px);
  font-weight: 600;
  letter-spacing: -.03em;
  line-height: 1.2;
}

.wh-news-body p {
  color: var(--wh-muted);
  font-size: 14px;
  line-height: 1.65;
}

.wh-news-body .wh-textlink {
  margin-top: auto;
}

/* ── Footer ────────────────────────────────────────────────────── */
.wh-footer {
  background: var(--wh-navy);
  padding: clamp(70px, 8vw, 116px) 0 28px;
}

.wh-footer h2 {
  max-width: 620px;
  font-size: clamp(29px, 3.6vw, 52px);
  font-weight: 600;
  letter-spacing: -.05em;
  line-height: 1.06;
}

.wh-footer > .wh-shell > p {
  max-width: 540px;
  margin-top: 16px;
  color: rgba(255, 255, 255, .64);
  font-size: 15px;
  line-height: 1.7;
}

.wh-footer-top {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr);
  gap: clamp(38px, 6vw, 96px);
}

.wh-footer-links {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

.wh-footer-links > div {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.wh-footer-links strong {
  margin-bottom: 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .15em;
  text-transform: uppercase;
}

.wh-footer-links button {
  border: 0;
  background: none;
  padding: 8px 0;
  color: rgba(255, 255, 255, .68);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.wh-footer-links button:hover {
  color: #ffffff;
}

.wh-footer-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  margin-top: 30px;
}

.wh-footer-contact a,
.wh-footer-contact div {
  display: grid;
  gap: 4px;
  color: rgba(255, 255, 255, .82);
  font-size: 13px;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.wh-footer-contact span {
  color: rgba(255, 255, 255, .45);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.wh-footer-bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 26px;
  margin-top: clamp(48px, 6vw, 78px);
  padding-top: 22px;
  border-top: 1px solid rgba(255, 255, 255, .14);
  color: rgba(255, 255, 255, .5);
  font-size: 12px;
}

.wh-footer-bottom button {
  border: 0;
  background: none;
  padding: 0;
  color: inherit;
  cursor: pointer;
}

/* ── Interior page hero ────────────────────────────────────────── */
.wh-page-hero {
  padding: clamp(30px, 4vw, 58px) 0 0;
  background: var(--wh-pale);
}

.wh-page-media {
  position: relative;
  min-height: clamp(300px, 42vw, 520px);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  border-radius: clamp(24px, 3vw, 40px);
  overflow: hidden;
  background: #dfe4f4;
  padding: clamp(28px, 4vw, 60px);
  color: #ffffff;
}

.wh-page-media > img,
.wh-page-media > .wh-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh-page-media::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(20, 23, 36, .15) 0%, rgba(20, 23, 36, .78) 100%);
}

.wh-page-media > *:not(img):not(.wh-placeholder):not(.wh-page-shade):not(.wh-page-no):not(.wh-page-pause) {
  position: relative;
  z-index: 2;
}

.wh-page-media h1 {
  max-width: 900px;
  font-size: clamp(38px, 5.4vw, 82px);
  font-weight: 600;
  letter-spacing: -.055em;
  line-height: 1.02;
}

.wh-page-media p {
  max-width: 620px;
  margin-top: 16px;
  color: rgba(255, 255, 255, .82);
  font-size: 15px;
  line-height: 1.65;
}

.wh-page-no {
  position: absolute;
  top: clamp(20px, 3vw, 38px);
  right: clamp(20px, 3vw, 38px);
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, .5);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
}

.wh-page-pause {
  position: absolute;
  right: clamp(20px, 3vw, 38px);
  bottom: clamp(28px, 4vw, 60px);
  z-index: 2;
  font-size: 18px;
  letter-spacing: .2em;
}

.wh-page-media-detail,
.wh-page-media-contact {
  min-height: clamp(280px, 34vw, 430px);
}

/* ── About / services / item pages ─────────────────────────────── */
.wh-about-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(28px, 5vw, 90px);
}

.wh-about-grid h2 {
  font-size: clamp(32px, 4vw, 58px);
  font-weight: 600;
  letter-spacing: -.05em;
  line-height: 1.08;
}

.wh-about-grid > div > p {
  margin-bottom: 18px;
  color: var(--wh-muted);
  font-size: 15px;
  line-height: 1.8;
}

.wh-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(14px, 2vw, 26px);
  margin-top: clamp(44px, 6vw, 80px);
}

.wh-stats article {
  border-radius: 20px;
  background: var(--wh-pale);
  padding: clamp(20px, 2.4vw, 32px);
}

.wh-stats strong {
  display: block;
  color: var(--wh-blue);
  font-size: clamp(28px, 3.4vw, 46px);
  font-weight: 600;
  letter-spacing: -.05em;
}

.wh-stats p {
  margin-top: 10px;
  color: var(--wh-muted);
  font-size: 12px;
  line-height: 1.6;
}

.wh-values {
  background: var(--wh-pale);
}

.wh-values-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(30px, 5vw, 92px);
}

.wh-values-grid h2 {
  font-size: clamp(30px, 3.6vw, 52px);
  font-weight: 600;
  letter-spacing: -.05em;
  line-height: 1.08;
}

.wh-values-grid > div:first-child > p {
  margin: 18px 0 26px;
  color: var(--wh-muted);
  line-height: 1.7;
}

.wh-values-list {
  display: grid;
  gap: 0;
}

.wh-values-list article {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 12px;
  border-top: 1px solid var(--wh-line);
  padding: 20px 0;
}

.wh-values-list article:last-child {
  border-bottom: 1px solid var(--wh-line);
}

.wh-values-list span {
  color: var(--wh-blue);
  font-size: 11px;
  font-weight: 700;
}

.wh-values-list h3 {
  font-size: clamp(18px, 1.7vw, 23px);
  font-weight: 600;
  letter-spacing: -.03em;
}

.wh-values-list p {
  grid-column: 2;
  margin-top: 6px;
  color: var(--wh-muted);
  font-size: 14px;
  line-height: 1.6;
}

.wh-facility-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(14px, 2vw, 24px);
  align-items: stretch;
}

.wh-facility-card {
  display: flex;
  min-width: 0;
}

.wh-facility-card article {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.wh-facility-figure {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 20px;
  overflow: hidden;
  background: var(--wh-pale);
}

.wh-facility-figure img,
.wh-facility-figure .wh-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh-facility-grid h3 {
  display: flex;
  align-items: center;
  min-height: 46px;
  margin-top: 14px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
}

.wh-glimpse-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(14px, 2vw, 24px);
}

.wh-glimpse-grid figure {
  width: 100%;
  aspect-ratio: 1 / 1.1;
  border-radius: 20px;
  overflow: hidden;
  background: var(--wh-pale);
}

.wh-glimpse-grid img,
.wh-glimpse-grid .wh-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh-service-directory {
  display: grid;
  gap: clamp(16px, 2vw, 24px);
}

.wh-service-directory > div > button {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  align-items: center;
  gap: clamp(20px, 3vw, 44px);
  width: 100%;
  border: 1px solid var(--wh-line);
  border-radius: 24px;
  background: #ffffff;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: transform .3s ease, box-shadow .3s ease;
}

.wh-service-directory > div > button:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 46px rgba(36, 40, 57, .08);
}

.wh-service-photo {
  position: relative;
  width: 100%;
  aspect-ratio: 1.35 / 1;
  border-radius: 16px;
  overflow: hidden;
  background: var(--wh-pale);
}

.wh-service-photo img,
.wh-service-photo .wh-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh-service-photo > span {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #ffffff;
  color: var(--wh-blue);
}

.wh-service-copy h2 {
  font-size: clamp(24px, 2.6vw, 38px);
  font-weight: 600;
  letter-spacing: -.04em;
}

.wh-service-copy p {
  margin-top: 8px;
  color: var(--wh-muted);
  font-size: 14px;
  line-height: 1.65;
}

.wh-service-copy > div {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  margin-top: 18px;
  font-size: 12px;
  color: var(--wh-muted);
}

.wh-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(16px, 2vw, 26px);
}

@media (width > 1180px) {
  .wh-card-grid.wh-count-4 > :last-child {
    grid-column: 2;
  }
}

.wh-room-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--wh-line);
  border-radius: 24px;
  background: #ffffff;
  overflow: hidden;
  transition: transform .3s ease, box-shadow .3s ease;
}

.wh-room-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 46px rgba(36, 40, 57, .1);
}

.wh-room-photo {
  position: relative;
  width: 100%;
  aspect-ratio: 1.3 / 1;
  overflow: hidden;
  background: var(--wh-pale);
  border: 0;
  padding: 0;
  cursor: pointer;
}

.wh-room-photo img,
.wh-room-photo .wh-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh-room-photo span {
  position: absolute;
  top: 14px;
  left: 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .94);
  padding: 7px 12px;
  color: var(--wh-blue);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .12em;
}

.wh-room-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: clamp(20px, 2.2vw, 30px);
}

.wh-room-copy h3 {
  font-size: clamp(20px, 1.9vw, 27px);
  font-weight: 600;
  letter-spacing: -.035em;
}

.wh-room-copy > p:not(.wh-label) {
  color: var(--wh-muted);
  font-size: 14px;
  line-height: 1.65;
}

.wh-room-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 14px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--wh-line);
  font-size: 12px;
  color: var(--wh-muted);
}

.wh-room-meta strong {
  color: var(--wh-ink);
  font-size: 15px;
}

.wh-room-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 18px;
}

.wh-detail {
  padding: clamp(58px, 7vw, 100px) 0;
  background: #ffffff;
}

.wh-detail-overview {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, .65fr);
  gap: clamp(30px, 5vw, 80px);
  align-items: start;
}

.wh-detail-overview h2 {
  max-width: 660px;
  margin: 12px 0 20px;
  font-size: clamp(30px, 3.8vw, 56px);
  font-weight: 600;
  letter-spacing: -.05em;
  line-height: 1.08;
}

.wh-detail-overview > div > p:not(.wh-label) {
  color: var(--wh-muted);
  line-height: 1.75;
}

.wh-detail-overview ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 20px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}

.wh-detail-overview li {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 14px;
}

.wh-detail-overview li svg {
  margin-top: 3px;
  color: var(--wh-blue);
}

.wh-detail-spec {
  border-radius: 24px;
  background: var(--wh-pale);
  padding: clamp(24px, 3vw, 38px);
}

.wh-detail-spec > div {
  display: grid;
  gap: 4px;
  border-bottom: 1px solid var(--wh-line);
  padding: 14px 0;
}

.wh-detail-spec span {
  color: var(--wh-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.wh-detail-spec b,
.wh-detail-spec strong {
  font-size: 15px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.wh-detail-spec .wh-btn {
  width: 100%;
  margin-top: 24px;
}

.wh-detail-images {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(14px, 2vw, 24px);
  margin-top: clamp(44px, 6vw, 80px);
}

.wh-detail-images button {
  width: 100%;
  aspect-ratio: 1.4 / 1;
  border: 0;
  border-radius: 22px;
  overflow: hidden;
  background: var(--wh-pale);
  padding: 0;
  cursor: pointer;
}

.wh-detail-images img,
.wh-detail-images .wh-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh-detail-cinema {
  position: relative;
  margin-top: clamp(14px, 2vw, 24px);
  aspect-ratio: 2.4 / 1;
  border-radius: 24px;
  overflow: hidden;
  background: var(--wh-pale);
}

.wh-detail-cinema img,
.wh-detail-cinema .wh-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh-detail-cinema span {
  position: absolute;
  right: 20px;
  bottom: 20px;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .92);
  color: var(--wh-navy);
  font-size: 16px;
}

.wh-detail-location {
  display: grid;
  grid-template-columns: minmax(0, .7fr) minmax(0, 1.3fr);
  gap: clamp(24px, 4vw, 60px);
  align-items: center;
  margin-top: clamp(50px, 6vw, 88px);
}

.wh-detail-location h2 {
  margin-top: 12px;
  font-size: clamp(28px, 3.4vw, 50px);
  font-weight: 600;
  letter-spacing: -.05em;
  line-height: 1.08;
}

.wh-suggestions {
  padding: clamp(60px, 7vw, 100px) 0;
  background: var(--wh-pale);
}

.wh-suggestion-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(16px, 2vw, 26px);
}

/* ── Gallery, reviews, forms, careers ──────────────────────────── */
.wh-gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(12px, 1.8vw, 22px);
}

.wh-gallery-grid button {
  width: 100%;
  aspect-ratio: 1 / 1.05;
  border: 0;
  border-radius: 20px;
  overflow: hidden;
  background: var(--wh-pale);
  padding: 0;
  cursor: pointer;
}

.wh-gallery-grid img,
.wh-gallery-grid .wh-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wh-review-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(16px, 2vw, 26px);
}

.wh-review-grid article {
  display: flex;
  flex-direction: column;
  min-height: 260px;
  border: 1px solid var(--wh-line);
  border-radius: 24px;
  background: #ffffff;
  padding: clamp(22px, 2.4vw, 34px);
}

.wh-review-grid article > span {
  color: var(--wh-blue);
  font-size: 44px;
  line-height: .8;
}

.wh-review-grid blockquote {
  flex: 1;
  margin-top: 16px;
  font-size: 15px;
  line-height: 1.7;
}

.wh-review-grid strong {
  margin-top: 20px;
  font-size: 14px;
}

.wh-review-grid p {
  margin-top: 4px;
  color: var(--wh-muted);
  font-size: 12px;
}

.wh-review-button {
  margin-top: 34px;
}

.wh-form-grid {
  display: grid;
  grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr);
  gap: clamp(30px, 5vw, 90px);
  align-items: start;
}

.wh-form-panel {
  min-width: 0;
  padding: clamp(18px, 3vw, 36px);
  border: 1px solid var(--wh-line);
  border-radius: var(--wh-radius);
  background: var(--wh-surface);
}

.wh-form-grid h2 {
  margin-top: 14px;
  font-size: clamp(30px, 3.6vw, 52px);
  font-weight: 600;
  letter-spacing: -.05em;
  line-height: 1.08;
}

.wh-form-grid > div:first-child > p:not(.wh-label) {
  margin-top: 18px;
  color: var(--wh-muted);
  line-height: 1.75;
}

.wh-contact-lines {
  display: grid;
  gap: 12px;
  margin-top: 28px;
}

.wh-contact-lines a,
.wh-contact-lines > div {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--wh-ink);
  font-size: 14px;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.wh-contact-lines > a > span,
.wh-contact-lines > div > span {
  color: var(--wh-blue);
  font-weight: 700;
}

.wh-map {
  width: 100%;
  height: clamp(240px, 32vw, 400px);
  border-radius: 24px;
  overflow: hidden;
  background: var(--wh-pale);
}

.wh-map iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.wh-contact-map {
  margin-top: clamp(48px, 6vw, 82px);
}

.wh-jobs {
  border-top: 1px solid var(--wh-line);
}

.wh-jobs > button {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) minmax(0, .8fr) auto;
  align-items: center;
  gap: 18px;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--wh-line);
  background: none;
  padding: 24px 6px;
  text-align: left;
  cursor: pointer;
}

.wh-jobs > button:hover {
  color: var(--wh-blue);
}

.wh-jobs span {
  color: var(--wh-blue);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.wh-jobs h3 {
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 600;
  letter-spacing: -.035em;
}

.wh-jobs p {
  color: var(--wh-muted);
  font-size: 13px;
}

.wh-careers-general {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  margin-top: clamp(32px, 4vw, 56px);
  padding-top: clamp(28px, 3.5vw, 48px);
  border-top: 1px solid var(--wh-line);
  text-align: center;
}

.wh-careers-general p {
  max-width: 560px;
  color: var(--wh-muted);
  font-size: 14px;
  line-height: 1.65;
}

.wh-careers-general .wh-btn-outline:is(:hover, :focus-visible) {
  background: var(--wh-blue-dark);
  border-color: var(--wh-blue-dark);
  color: #fff;
}

.wh-careers-detail {
  max-width: 980px;
  margin-inline: auto;
}

.wh-back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: none;
  padding: 0;
  color: var(--wh-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: color .2s ease;
}

.wh-back-link:hover {
  color: var(--wh-blue);
}

.wh-careers-detail .wh-apply {
  margin-top: 24px;
}

.wh-apply {
  max-width: 920px;
  margin: clamp(38px, 5vw, 70px) auto 0;
  padding: clamp(24px, 3.4vw, 48px);
  text-align: center;
}

.wh-apply h2 {
  margin-bottom: 24px;
  font-size: clamp(24px, 2.6vw, 36px);
  font-weight: 600;
  letter-spacing: -.04em;
}

.wh-apply-form form {
  max-width: 760px;
  margin-inline: auto;
  text-align: left;
}

.wh-apply-form .tp-btn {
  display: block;
  width: max-content;
  max-width: 100%;
  margin-inline: auto;
}

.wh-empty {
  padding: 70px 0;
  color: var(--wh-muted);
  text-align: center;
}

.wh-inline-form {
  display: grid;
  gap: 18px;
}

.wh-inline-form > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

/* ── Shared form controls styled for WorkHub ───────────────────── */
.wh .tp-label {
  display: block;
  margin-bottom: 7px;
  color: var(--wh-ink);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.wh .tp-input {
  width: 100%;
  min-height: 50px;
  border: 1px solid var(--wh-line);
  border-radius: 14px;
  background: #ffffff;
  padding: 13px 16px;
  color: var(--wh-ink);
  font-size: 14px;
  outline: none;
}

.wh .tp-input:focus {
  border-color: var(--wh-blue);
  box-shadow: 0 0 0 3px rgba(40, 95, 226, .12);
}

.wh textarea.tp-input {
  min-height: 140px;
  resize: vertical;
}

.wh .tp-btn {
  min-height: 48px;
  border: 0;
  border-radius: 999px;
  padding: 0 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.wh .tp-btn-primary,
.wh .tp-btn-dark {
  background: var(--wh-blue);
  color: var(--wh-blue-text);
}

.wh .tp-btn-dark:hover,
.wh .tp-btn-primary:hover {
  background: var(--wh-blue-dark);
}

.wh .tp-soft,
.wh .tp-card {
  border: 1px solid var(--wh-line);
  border-radius: 18px;
  background: var(--wh-pale);
}

.wh .tp-tab {
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.wh .tp-tab[aria-pressed="true"] {
  border-bottom-color: var(--wh-blue);
  color: var(--wh-blue);
}

.wh .tp-chip {
  border-radius: 999px;
  background: var(--wh-pale);
  padding: 6px 12px;
  font-size: 12px;
}

/* ── Booking modal ─────────────────────────────────────────────── */
.wh-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: clamp(10px, 3vw, 26px);
}

.wh-modal-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(20, 23, 36, .68);
  backdrop-filter: blur(6px);
}

.wh-modal-panel {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, .78fr) minmax(0, 1.22fr);
  width: min(1040px, 100%);
  max-height: min(92svh, 860px);
  border-radius: 26px;
  overflow: auto;
  background: #ffffff;
  box-shadow: 0 30px 90px rgba(12, 14, 24, .3);
}

.wh-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 3;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid var(--wh-line);
  border-radius: 50%;
  background: #ffffff;
  cursor: pointer;
}

.wh-modal-aside {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 16px;
  padding: clamp(22px, 3vw, 38px);
  overflow: hidden;
  background: var(--wh-navy);
  color: #ffffff;
}

.wh-modal-aside > img,
.wh-modal-aside > .wh-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: .55;
}

.wh-modal-aside::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(36, 40, 57, .1), rgba(36, 40, 57, .88));
}

.wh-modal-aside > div {
  position: relative;
  z-index: 2;
}

.wh-modal-aside .wh-eyebrow {
  color: #a9bcff;
}

.wh-modal-aside h2 {
  margin-top: 10px;
  font-size: clamp(26px, 3vw, 40px);
  font-weight: 600;
  letter-spacing: -.045em;
  line-height: 1.1;
}

.wh-modal-aside p:not(.wh-eyebrow) {
  margin-top: 12px;
  color: rgba(255, 255, 255, .78);
  font-size: 13px;
  line-height: 1.65;
}

.wh-modal-form {
  padding: clamp(28px, 4vw, 54px);
}

.wh-modal-form h2 {
  margin: 10px 0 6px;
  font-size: clamp(25px, 2.8vw, 38px);
  font-weight: 600;
  letter-spacing: -.045em;
  line-height: 1.12;
}

.wh-modal-form > p:not(.wh-label) {
  margin-bottom: 22px;
  color: var(--wh-muted);
  font-size: 13px;
  line-height: 1.6;
}

/* ── Responsive ────────────────────────────────────────────────── */
@media (max-width: 1180px) {
  .wh-services-grid,
  .wh-card-grid,
  .wh-suggestion-grid,
  .wh-news-grid,
  .wh-gallery-grid,
  .wh-review-grid,
  .wh-glimpse-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wh-testimonial-body {
    grid-template-columns: 180px minmax(0, 1fr);
  }

  .wh-testimonial-arrows {
    grid-column: 2;
    justify-self: start;
  }
}

@media (max-width: 1024px) {
  .wh-location-layout,
  .wh-footer-top,
  .wh-form-grid,
  .wh-detail-overview,
  .wh-detail-location,
  .wh-about-grid,
  .wh-values-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .wh-facility-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 991px) {
  .wh-nav {
    display: none;
  }

  .wh-menu {
    display: grid;
  }

  .wh-hero-stage {
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
  }

  .wh-hero-image {
    width: 100%;
    min-height: 0;
    aspect-ratio: 1.6 / 1;
    margin-left: 0;
  }

  .wh-hero-panel {
    width: min(100%, 800px);
    max-width: 800px;
    margin: -88px 0 0;
    padding: 40px 32px;
    text-align: center;
  }

  .wh-hero-sub {
    max-width: 660px;
    margin-inline: auto;
  }

  .wh-hero-actions {
    justify-content: center;
  }
}

@media (max-width: 820px) {
  .wh-section {
    padding: 68px 0;
  }

  .wh-split,
  .wh-stats,
  .wh-modal-panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .wh-modal-panel {
    max-height: 92svh;
  }

  .wh-modal-aside {
    min-height: 190px;
  }

  .wh-testimonial-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .wh-testimonial-photo {
    width: 180px;
  }

  .wh-testimonial-arrows {
    grid-column: 1;
  }

  .wh-service-directory > div > button {
    grid-template-columns: 170px minmax(0, 1fr);
  }

  .wh-jobs > button {
    grid-template-columns: 110px minmax(0, 1fr) auto;
  }

  .wh-jobs p {
    display: none;
  }
}

@media (max-width: 640px) {
  .wh main,
  .wh-footer {
    text-align: center;
  }

  .wh main form {
    text-align: left;
  }

  .wh main form .tp-btn {
    justify-self: center;
    text-align: center;
  }

  .wh-section-head,
  .wh-testimonial-head,
  .wh-testimonial-rating,
  .wh-testimonial-name,
  .wh-trusted-inner,
  .wh-service-foot,
  .wh-service-copy > div,
  .wh-location-actions,
  .wh-split-actions,
  .wh-room-meta,
  .wh-room-actions,
  .wh-news-meta,
  .wh-cta-band-inner,
  .wh-footer-contact,
  .wh-footer-bottom,
  .wh-contact-lines a,
  .wh-contact-lines > div,
  .wh-detail-overview li {
    justify-content: center;
  }

  .wh main :is(h1, h2, h3, p, blockquote) {
    margin-inline: auto;
  }

  .wh-footer h2 {
    margin-block: 12px 16px;
    margin-inline: auto;
    line-height: 1.2;
  }

  .wh-section-head > div:first-child,
  .wh-testimonial-head > div:first-child {
    width: 100%;
  }

  .wh-testimonial-photo,
  .wh-testimonial-arrows {
    justify-self: center;
  }

  .wh-news-body .wh-textlink {
    align-self: center;
  }

  .wh-location-tab,
  .wh-jobs > button {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    text-align: center;
  }

  .wh-service-directory > div > button,
  .wh-footer-links button {
    text-align: center;
  }

  .wh-footer-links > div {
    align-items: center;
  }

  .wh-trusted-logos {
    flex: 1 1 100%;
  }

  .wh-header-inner {
    min-height: 70px;
  }

  .wh-header-inner .wh-brand {
    flex: 0 1 auto;
  }

  .wh-brand-tag {
    display: none;
  }

  .wh .wh-header-cta {
    min-height: 42px;
    padding: 0 16px;
    font-size: 12px;
  }

  .wh-header-actions {
    reading-flow: flex-visual;
  }

  .wh-header-actions .wh-menu {
    order: 1;
  }

  .wh-hero {
    padding-top: 22px;
  }

  .wh-hero-image {
    aspect-ratio: 1.18 / 1;
  }

  .wh-hero-panel {
    width: calc(100% - 24px);
    margin-top: -46px;
    padding: 28px 20px 32px;
  }

  .wh-hero-panel h1 {
    font-size: clamp(30px, 7.6vw, 38px);
  }

  .wh-hero-actions .wh-btn,
  .wh-hero-actions .wh-btn-soft,
  .wh-hero-actions .wh-btn-outline {
    width: 100%;
    justify-content: center;
  }

  .wh-services-grid,
  .wh-card-grid,
  .wh-suggestion-grid,
  .wh-news-grid,
  .wh-gallery-grid,
  .wh-review-grid,
  .wh-glimpse-grid,
  .wh-facility-grid,
  .wh-inline-form > div {
    grid-template-columns: minmax(0, 1fr);
  }

  .wh-service-directory > div > button {
    grid-template-columns: minmax(0, 1fr);
  }

  .wh-service-photo {
    aspect-ratio: 1.7 / 1;
  }

  .wh-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wh-detail-overview ul,
  .wh-detail-images,
  .wh-footer-links {
    grid-template-columns: minmax(0, 1fr);
  }

  .wh-section-head h2,
  .wh-heading,
  .wh-footer h2,
  .wh-page-media h1 {
    letter-spacing: -.04em;
  }

  .wh-modal-form {
    padding: 26px 20px 32px;
  }
}

@media (max-width: 420px) {
  .wh-shell {
    width: min(100% - 24px, 1340px);
  }

  .wh-header-inner .wh-brand img,
  .wh-drawer-head .wh-brand img {
    max-width: 52px;
  }

  .wh-header-actions {
    gap: 8px;
  }

  .wh-brand-name {
    font-size: 17px;
  }

  .wh-hero-image {
    aspect-ratio: 1 / 1;
  }

  .wh-hero-panel {
    margin-top: -34px;
    padding: 24px 18px 28px;
  }

  .wh-hero-panel h1 {
    font-size: clamp(28px, 9.4vw, 36px);
  }

  .wh-split-panel {
    min-height: 280px;
  }

  .wh-footer-links {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;
