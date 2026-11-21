// WaveX-inspired meeting-room template.
// A warm, editorial canvas (white paper, charcoal type, coral accent), oversized headings,
// photographic carousels and rounded panels. Every colour is a --t-* custom property with a
// WaveX fallback, so the builder's theme picker keeps working. All selectors are scoped to .wx.

export const WAVEX_FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');";

export const WAVEX_CSS = `
${WAVEX_FONTS}

.wx {
  --wx-ink: #2b2b2f;
  --wx-muted: #898a8e;
  --wx-paper: #ffffff;
  --wx-soft: #f7f7f6;
  --wx-line: #e8e8e6;
  --wx-coral: #ed4e36;
  --wx-coral-hover: #ff715b;
  --wx-dark: #121216;
  background: var(--t-bg, #ffffff);
  color: var(--t-text, #2b2b2f);
  font-family: 'Manrope', 'Aeonik', ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  overflow-x: clip;
}

.wx *, .wx *::before, .wx *::after { box-sizing: border-box; }
.wx button, .wx input, .wx textarea, .wx select { font: inherit; }
/* WaveX button labels use title case: capitalise the first letter of every word. */
.wx button { text-transform: capitalize; }
.wx button:not(.wx-btn):not(.tp-btn) { color: inherit; }
.wx img { display: block; max-width: 100%; }
.wx h1, .wx h2, .wx h3, .wx h4, .wx p, .wx blockquote, .wx figure { margin: 0; }
.wx a { color: inherit; text-decoration: none; }
.wx svg { flex: none; }
.wx :focus-visible { outline: 2px solid var(--t-accent, #ed4e36); outline-offset: 3px; }

.wx-shell { width: min(100% - 40px, 1200px); margin-inline: auto; }
@media (min-width: 768px) { .wx-shell { width: min(100% - 64px, 1200px); } }

.wx-section { padding: clamp(66px, 8vw, 112px) 0; }
.wx-section-tight { padding: clamp(46px, 6vw, 76px) 0; }

.wx-kicker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--t-accent-fg, var(--wx-coral));
}
.wx-kicker::before { content: ''; width: 20px; height: 2px; background: var(--t-accent, var(--wx-coral)); }

.wx-title {
  font-size: clamp(32px, 4.4vw, 58px);
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -.045em;
  color: var(--wx-ink);
}
.wx-title-sm { font-size: clamp(25px, 3vw, 36px); font-weight: 800; letter-spacing: -.035em; line-height: 1.1; }
.wx-copy { font-size: 15px; line-height: 1.85; color: var(--wx-muted); }
.wx-copy strong { color: var(--wx-ink); font-weight: 700; }
.wx-accent { color: var(--t-accent-fg, var(--wx-coral)); }
.wx-media { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--wx-soft); }
.wx-media > img { width: 100%; height: 100%; object-fit: cover; }
.wx-crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; width: min(100% - 40px, 1200px); margin: 22px auto 0; color: var(--wx-muted); font-size: 12px; font-weight: 700; }
.wx-crumbs button { border: 0; padding: 0; background: none; cursor: pointer; color: inherit; font: inherit; }
.wx-crumbs button:hover { color: var(--t-accent-fg, var(--wx-coral)); }
.wx-crumbs [aria-current="page"] { color: var(--wx-ink); }

.wx-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 160px;
  background: linear-gradient(135deg, #f0efec, #e6e4df);
  color: #9c9b96;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .2em;
}

/* ── shared primitives used by the shared forms, modals and review widgets ── */
.wx .tp-wrap { width: min(100% - 40px, 1200px); margin-inline: auto; }
.wx .tp-section { padding: 60px 0; }
.wx .tp-muted { color: var(--wx-muted); }
.wx .tp-soft { background: var(--wx-soft); border-radius: 16px; }
.wx .tp-h3 { font-size: 22px; font-weight: 800; letter-spacing: -.035em; }
.wx .tp-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: var(--t-accent-fg, var(--wx-coral)); }
.wx .tp-label { display: block; margin-bottom: 7px; font-size: 12px; font-weight: 700; color: var(--wx-ink); }
.wx .tp-input {
  width: 100%;
  min-height: 46px;
  padding: 11px 14px;
  border: 1px solid var(--wx-line);
  border-radius: 10px;
  background: #fff;
  color: var(--wx-ink);
  font-size: 14px;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.wx .tp-input:focus { border-color: var(--t-accent, var(--wx-coral)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--t-accent, var(--wx-coral)) 16%, transparent); }
.wx .tp-input::placeholder { color: #b4b4b7; }
.wx .tp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  padding: 12px 22px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: transform .2s, background .2s, color .2s, border-color .2s;
}
.wx .tp-btn:hover { transform: translateY(-2px); }
.wx .tp-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.wx .tp-btn-primary { background: var(--t-accent, var(--wx-coral)); color: #fff; }
.wx .tp-btn-primary:hover { background: var(--wx-coral-hover); }
/* Naturally-sized submit buttons sit centred in WaveX forms; full-width ones stay stretched. */
.wx form .tp-btn-primary:not(.w-full) { display: flex; width: fit-content; margin-inline: auto; }
.wx .tp-btn-ghost { background: transparent; border-color: var(--wx-line); color: var(--wx-ink); }
.wx .tp-btn-ghost:hover { border-color: var(--wx-ink); }
.wx .tp-btn-sm { min-height: 38px; padding: 8px 16px; font-size: 12px; }
.wx .tp-tab { padding: 9px 16px; border: 1px solid var(--wx-line); border-radius: 999px; background: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
.wx .tp-tab[aria-pressed="true"] { background: var(--wx-ink); color: #fff; border-color: var(--wx-ink); }

/* the rest of the neutral primitives shared forms and overlays rely on */
.wx .tp-h1 { font-size: clamp(36px, 5.4vw, 74px); font-weight: 800; letter-spacing: -.05em; line-height: 1.04; }
.wx .tp-h2 { font-size: clamp(28px, 3.4vw, 44px); font-weight: 800; letter-spacing: -.04em; line-height: 1.08; }
.wx .tp-display { font-weight: 800; letter-spacing: -.04em; line-height: 1.1; }
.wx .tp-lead { font-size: clamp(16px, 1.3vw, 18px); line-height: 1.65; color: var(--wx-muted); }
.wx .tp-card { background: var(--t-bg, #fff); border: 1px solid var(--wx-line); border-radius: 16px; transition: transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s, border-color .2s; }
.wx .tp-card-hover { cursor: pointer; }
.wx .tp-card-hover:hover { border-color: var(--t-accent, var(--wx-coral)); box-shadow: 0 18px 36px -26px rgba(43,43,47,.5); }
.wx .tp-accent-panel { background: var(--t-accent, var(--wx-coral)); color: var(--t-accent-text, #fff); border-radius: 18px; }
.wx .tp-dark-panel { background: var(--wx-dark); color: #fff; border-radius: 18px; }
.wx .tp-chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 5px 11px; font-size: 12px; font-weight: 700; background: color-mix(in srgb, var(--wx-ink) 7%, transparent); color: var(--wx-ink); }
.wx .tp-chip-accent { background: var(--t-accent, var(--wx-coral)); color: #fff; }
.wx .tp-link { display: inline-flex; align-items: center; gap: 8px; border: 0; padding: 0; background: none; color: var(--t-accent-fg, var(--wx-coral)); font-size: 13px; font-weight: 800; cursor: pointer; }
.wx .tp-link:hover { text-decoration: underline; text-underline-offset: 4px; }
.wx .tp-link .tp-arrow { transition: transform .2s; }
.wx .tp-link:hover .tp-arrow { transform: translateX(3px); }
.wx .tp-zoom { overflow: hidden; }
.wx .tp-zoom img { width: 100%; height: 100%; object-fit: cover; transition: transform .8s cubic-bezier(.22,1,.36,1); }
.wx .tp-card-hover:hover .tp-zoom img, .wx .tp-zoom:hover img { transform: scale(1.05); }
.wx .tp-ph { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, color-mix(in srgb, var(--t-accent, var(--wx-coral)) 20%, #f2f1ee), #e8e6e1); color: var(--wx-ink); font-size: 40px; font-weight: 800; }
.wx .tp-fill { position: relative; overflow: hidden; }
.wx .tp-fill > img, .wx .tp-fill > .tp-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.wx .tp-clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wx .tp-clamp3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.wx .tp-scroll-x { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px; scrollbar-width: none; }
.wx .tp-scroll-x::-webkit-scrollbar { display: none; }
.wx .tp-scroll-x > * { scroll-snap-align: start; flex: 0 0 auto; }
textarea.wx .tp-input, .wx textarea.tp-input { resize: vertical; min-height: 92px; }

/* ── buttons ── */
.wx-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  padding: 13px 26px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--t-accent, var(--wx-coral));
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: transform .2s, background .2s, border-color .2s, color .2s;
}
.wx-btn:hover { background: var(--wx-coral-hover); transform: translateY(-2px); }
.wx-btn-dark { background: var(--wx-ink); color: #fff; }
.wx-btn-dark:hover { background: #000; }
.wx-btn-outline { background: transparent; color: var(--wx-ink); border-color: var(--wx-line); }
.wx-btn-outline:hover { background: var(--wx-ink); color: #fff; border-color: var(--wx-ink); }
.wx-btn-light { background: #fff; color: var(--wx-ink); }
.wx-btn-light:hover { background: var(--t-accent, var(--wx-coral)); color: #fff; }
.wx-btn-sm { min-height: 40px; padding: 9px 18px; font-size: 12px; }
.wx-text-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: none;
  padding: 0;
  color: var(--wx-ink);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.wx-text-link:hover { color: var(--t-accent-fg, var(--wx-coral)); }

/* ── loader ── */
.wx-loader {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: grid;
  place-items: center;
  background: var(--wx-dark);
  color: #fff;
}
.wx-loader-inner { display: grid; justify-items: center; gap: 18px; padding: 20px; text-align: center; }
.wx-loader-inner > span { font-size: clamp(28px, 6vw, 56px); font-weight: 800; letter-spacing: -.06em; }
.wx-loader-inner > i { display: block; width: min(220px, 60vw); height: 2px; background: var(--t-accent, var(--wx-coral)); animation: wx-load .85s cubic-bezier(.22,1,.36,1); }
@keyframes wx-load { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* ── header ── */
.wx-header { position: sticky; top: 0; z-index: 80; background: var(--t-bg, #fff); border-bottom: 1px solid var(--wx-line); }
.wx-header-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 76px; }
.wx-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 0;
  padding: 0;
  background: none;
  cursor: pointer;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -.05em;
  color: var(--wx-ink);
  text-align: left;
}
.wx-brand img { max-height: 30px; width: auto; }
.wx-brand-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--t-accent, var(--wx-coral));
  color: #fff;
  font-size: 17px;
  font-weight: 800;
}
.wx-nav { display: none; align-items: center; gap: 28px; }
.wx-nav-link {
  border: 0;
  padding: 6px 0;
  background: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--wx-ink);
  cursor: pointer;
  position: relative;
}
.wx-nav-link::after { content: ''; position: absolute; left: 0; right: 100%; bottom: 1px; height: 2px; background: var(--t-accent, var(--wx-coral)); transition: right .22s; }
.wx-nav-link:hover::after { right: 0; }
.wx-header-actions { display: flex; align-items: center; gap: 10px; }
.wx-menu {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--wx-line);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
}
@media (min-width: 1024px) {
  .wx-nav { display: flex; }
  .wx-menu { display: none; }
}
.wx-drawer { position: fixed; inset: 0; z-index: 200; }
.wx-drawer-backdrop { position: absolute; inset: 0; width: 100%; border: 0; background: rgba(18,18,22,.55); cursor: pointer; }
.wx-drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 90vw);
  overflow-y: auto;
  padding: 24px;
  background: var(--t-bg, #fff);
  display: flex;
  flex-direction: column;
  gap: 26px;
  box-shadow: -20px 0 60px rgba(0,0,0,.14);
}
.wx-drawer-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.wx-drawer-close { display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid var(--wx-line); border-radius: 12px; background: transparent; cursor: pointer; }
.wx-drawer-nav { display: grid; gap: 2px; }
.wx-drawer-nav button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  padding: 15px 2px;
  border: 0;
  border-bottom: 1px solid var(--wx-line);
  background: none;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -.02em;
  cursor: pointer;
  text-align: left;
}
.wx-drawer-nav button span { color: var(--wx-muted); font-size: 11px; font-weight: 700; }
.wx-drawer-nav button:hover { color: var(--t-accent-fg, var(--wx-coral)); }
.wx-sticky-bar {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 70;
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 16px;
  background: rgba(255,255,255,.94);
  border: 1px solid var(--wx-line);
  box-shadow: 0 14px 40px rgba(0,0,0,.14);
  backdrop-filter: blur(12px);
}
.wx-sticky-bar .wx-btn { flex: 1; }
@media (min-width: 1024px) { .wx-sticky-bar { display: none; } }

/* ── hero carousel ── */
.wx-hero { position: relative; background: var(--t-bg, #fff); padding-top: 18px; }
.wx-hero-frame { position: relative; }
.wx-hero-stage { position: relative; height: clamp(520px, 78vh, 760px); overflow: hidden; border-radius: 20px; }
.wx-hero-slide { position: absolute; inset: 0; opacity: 0; transition: opacity .85s ease; }
.wx-hero-slide.is-active { opacity: 1; }
.wx-hero-slide img { width: 100%; height: 100%; object-fit: cover; }
.wx-hero-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,8,10,.82) 0%, rgba(8,8,10,.55) 48%, rgba(8,8,10,.16) 100%), linear-gradient(0deg, rgba(8,8,10,.5), transparent 55%); }
.wx-hero-inner {
  --wx-hero-pad: clamp(28px, 5vw, 64px);
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: var(--wx-hero-pad);
  padding-bottom: clamp(66px, 10vw, 120px);
  color: #fff;
}
.wx-hero-content { max-width: 720px; }
.wx-hero-eyebrow { display: block; margin-bottom: 18px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,.86); }
.wx-hero-title {
  font-size: clamp(42px, 6.4vw, 78px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -.02em;
  text-wrap: balance;
  color: #fff;
}
.wx-hero-sub { max-width: 560px; margin-top: 18px; font-size: 15px; line-height: 1.75; color: rgba(255,255,255,.82); }
.wx-hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; margin-top: 30px; }
.wx-hero-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 12px 36px;
  border: 0;
  border-radius: 6px;
  background: var(--t-accent, var(--wx-coral));
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background .2s, transform .2s;
}
.wx-hero-cta:hover { background: var(--wx-coral-hover); transform: translateY(-2px); }
.wx-hero-cta-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  padding: 6px 0;
  background: none;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,.55);
}
.wx-hero-cta-secondary:hover { color: var(--t-accent, var(--wx-coral)); border-bottom-color: var(--t-accent, var(--wx-coral)); }
.wx-hero-controls { position: absolute; right: var(--wx-hero-pad); bottom: clamp(66px, 10vw, 120px); display: none; align-items: center; gap: 10px; }
@media (min-width: 768px) { .wx-hero-controls { display: flex; } }
.wx-hero-arrow {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255,255,255,.5);
  border-radius: 50%;
  background: rgba(255,255,255,.08);
  color: #fff;
  cursor: pointer;
  transition: background .2s;
}
.wx-hero-arrow:hover { background: var(--t-accent, var(--wx-coral)); border-color: var(--t-accent, var(--wx-coral)); }
.wx-hero-dots { position: absolute; left: var(--wx-hero-pad); bottom: 30px; display: flex; gap: 8px; }
.wx-hero-dot { width: 26px; height: 4px; padding: 0; border: 0; border-radius: 99px; background: rgba(255,255,255,.38); cursor: pointer; transition: width .25s, background .25s; }
.wx-hero-dot.is-active { width: 44px; background: var(--t-accent, var(--wx-coral)); }
.wx-hero-count { position: absolute; right: var(--wx-hero-pad); bottom: 32px; color: rgba(255,255,255,.7); font-size: 11px; font-weight: 700; letter-spacing: .14em; }

/* ── vibe / photo carousel ── */
.wx-vibe-grid { display: grid; gap: 34px; align-items: start; }
@media (min-width: 900px) { .wx-vibe-grid { grid-template-columns: 1fr 1fr; gap: 70px; } }
.wx-vibe-copy { padding-top: 8px; }
.wx-vibe-copy .wx-title { margin-top: 16px; }
.wx-vibe-copy .wx-copy { margin-top: 24px; max-width: 520px; }
.wx-vibe-copy .wx-copy + .wx-copy { margin-top: 12px; }
.wx-vibe-carousel { position: relative; border-radius: 20px; overflow: hidden; background: var(--wx-dark); }
.wx-vide-stage { position: relative; }
.wx-slide-stage { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: #deddd9; }
@media (min-width: 600px) { .wx-slide-stage { aspect-ratio: 16 / 10; } }
.wx-slide { position: absolute; inset: 0; opacity: 0; transition: opacity .6s ease; }
.wx-slide.is-active { opacity: 1; }
.wx-slide img { width: 100%; height: 100%; object-fit: cover; }
.wx-slide-caption {
  position: absolute;
  left: 18px;
  bottom: 16px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(18,18,22,.7);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
}
.wx-slider-controls { position: absolute; right: 16px; bottom: 16px; display: flex; gap: 8px; }
.wx-arrow {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  color: var(--wx-ink);
  box-shadow: 0 6px 20px rgba(0,0,0,.15);
  cursor: pointer;
}
.wx-arrow:hover { background: var(--t-accent, var(--wx-coral)); color: #fff; }
.wx-swipe { margin-top: 12px; color: var(--wx-muted); font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }

/* ── community / numbers ── */
.wx-community { background: var(--wx-soft); }
.wx-community-grid { display: grid; gap: 20px; }
@media (min-width: 900px) { .wx-community-grid { grid-template-columns: 1.05fr .95fr; align-items: stretch; } }
.wx-community-card { border-radius: 22px; padding: clamp(28px, 4vw, 50px); background: var(--wx-dark); color: #fff; display: flex; flex-direction: column; justify-content: space-between; min-height: 330px; }
.wx-community-card .wx-kicker { color: #fff; }
.wx-community-card .wx-kicker::before { background: var(--t-accent, var(--wx-coral)); }
.wx-community-number { font-size: clamp(48px, 7vw, 86px); font-weight: 800; line-height: 1; letter-spacing: -.06em; margin: 16px 0 8px; }
.wx-community-number em { font-style: normal; color: var(--t-accent, var(--wx-coral)); }
.wx-community-card h3 { font-size: clamp(24px, 3vw, 34px); font-weight: 800; letter-spacing: -.035em; line-height: 1.15; }
.wx-benefits { display: grid; gap: 0; margin-top: 28px; }
.wx-benefit { display: flex; align-items: center; gap: 14px; padding: 13px 0; border-top: 1px solid rgba(255,255,255,.14); font-size: 13px; font-weight: 600; color: rgba(255,255,255,.86); }
.wx-benefit i { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--t-accent, var(--wx-coral)); font-style: normal; font-size: 11px; font-weight: 800; }
.wx-community-photo-wrap { height: 100%; }
.wx-community-photo { position: relative; width: 100%; height: 100%; min-height: 300px; border-radius: 22px; overflow: hidden; }
.wx-community-photo img { width: 100%; height: 100%; object-fit: cover; }

/* ── location info cards ── */
.wx-info-grid { display: grid; gap: 20px; margin-top: 34px; }
@media (min-width: 720px) { .wx-info-grid { grid-template-columns: 1fr 1fr; } }
.wx-info-card { padding: clamp(24px, 3vw, 34px); border: 1px solid var(--wx-line); border-radius: 18px; background: var(--t-bg, #fff); }
.wx-info-icon { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; background: color-mix(in srgb, var(--t-accent, var(--wx-coral)) 12%, #fff); color: var(--t-accent-fg, var(--wx-coral)); }
.wx-info-card h3 { margin-top: 20px; font-size: 20px; font-weight: 800; letter-spacing: -.03em; }
.wx-info-card p { margin-top: 10px; font-size: 14px; line-height: 1.75; color: var(--wx-muted); }

/* ── spaces / membership cards ── */
.wx-spaces-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 36px; }
.wx-spaces-head .wx-title { max-width: 720px; }
.wx-space-grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); }
.wx-space-card { position: relative; display: flex; flex-direction: column; overflow: hidden; border-radius: 18px; background: var(--wx-dark); color: #fff; min-height: 420px; }
.wx-space-photo { position: relative; display: block; padding: 0; border: 0; background: none; cursor: pointer; height: 240px; overflow: hidden; }
.wx-space-photo img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s cubic-bezier(.22,1,.36,1); }
.wx-space-card:hover .wx-space-photo img { transform: scale(1.06); }
.wx-space-badge { position: absolute; top: 14px; left: 14px; padding: 6px 12px; border-radius: 999px; background: var(--t-accent, var(--wx-coral)); color: #fff; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.wx-space-body { display: flex; flex: 1; flex-direction: column; padding: 22px; }
.wx-space-cat { font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.55); }
.wx-space-title { margin-top: 8px; font-size: 21px; font-weight: 800; letter-spacing: -.035em; line-height: 1.2; }
.wx-space-desc { margin-top: 9px; font-size: 13px; line-height: 1.65; color: rgba(255,255,255,.65); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wx-space-foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 22px; }
.wx-space-price { font-size: 11px; color: rgba(255,255,255,.6); }
.wx-space-price strong { display: block; font-size: 19px; color: #fff; letter-spacing: -.03em; }
.wx-space-go { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; border: 0; background: var(--t-accent, var(--wx-coral)); color: #fff; cursor: pointer; }
.wx-space-go:hover { background: var(--wx-coral-hover); }

/* ── testimonials ── */
.wx-testimonials { background: var(--wx-soft); }
.wx-testimonial-stage { margin-top: 28px; padding: clamp(24px, 4vw, 50px); border-radius: 22px; background: var(--t-bg, #fff); border: 1px solid var(--wx-line); }
.wx-quote-mark { font-size: 70px; line-height: .6; font-weight: 800; color: var(--t-accent, var(--wx-coral)); }
.wx-quote { margin-top: 16px; max-width: 900px; font-size: clamp(19px, 2.5vw, 30px); font-weight: 700; line-height: 1.45; letter-spacing: -.03em; color: var(--wx-ink); }
.wx-person { display: flex; align-items: center; gap: 14px; margin-top: 28px; }
.wx-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; background: #e7e5e0; }
.wx-person strong { display: block; font-size: 14px; }
.wx-person span { display: block; margin-top: 3px; font-size: 12px; color: var(--wx-muted); }
.wx-testimonial-controls { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 24px; }
.wx-testimonial-dots { display: flex; gap: 7px; }
.wx-testimonial-dots button { width: 8px; height: 8px; padding: 0; border: 0; border-radius: 50%; background: #d4d3cf; cursor: pointer; }
.wx-testimonial-dots button.is-active { width: 22px; border-radius: 99px; background: var(--t-accent, var(--wx-coral)); }

/* ── contact block ── */
.wx-contact-grid { display: grid; gap: 40px; }
@media (min-width: 900px) { .wx-contact-grid { grid-template-columns: .9fr 1.1fr; gap: 80px; } }
.wx-contact-copy .wx-title { margin-top: 16px; }
.wx-contact-copy .wx-copy { margin-top: 20px; }
.wx-contact-lines { display: grid; gap: 12px; margin-top: 30px; }
.wx-contact-lines a, .wx-contact-lines div { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 700; }
.wx-contact-lines a:hover { color: var(--t-accent-fg, var(--wx-coral)); }
.wx-contact-lines i { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: color-mix(in srgb, var(--t-accent, var(--wx-coral)) 12%, #fff); color: var(--t-accent-fg, var(--wx-coral)); font-style: normal; font-size: 15px; }
.wx-contact-form { padding: clamp(24px, 3.5vw, 42px); border-radius: 22px; background: var(--wx-soft); border: 1px solid var(--wx-line); }
.wx-contact-form-solo { width: min(100%, 720px); margin-inline: auto; }
.wx-contact-form h3 { font-size: 23px; font-weight: 800; letter-spacing: -.035em; }
.wx-contact-form > p { margin: 10px 0 24px; font-size: 13px; line-height: 1.7; color: var(--wx-muted); }

/* ── footer ── */
.wx-footer { padding-top: clamp(30px, 5vw, 60px); background: var(--wx-dark); color: #fff; }
.wx-footer-panel { padding: clamp(30px, 5vw, 60px); border-radius: 24px 24px 0 0; background: color-mix(in srgb, var(--wx-ink) 86%, #000); }
.wx-footer-cta { display: grid; gap: 28px; padding-bottom: 44px; border-bottom: 1px solid rgba(255,255,255,.14); }
@media (min-width: 900px) { .wx-footer-cta { grid-template-columns: 1.3fr .7fr; align-items: end; } }
.wx-footer-cta h2 { margin-top: 14px; font-size: clamp(30px, 4.4vw, 54px); font-weight: 800; letter-spacing: -.05em; line-height: 1.05; }
.wx-footer-cta .wx-btn { justify-self: start; }
.wx-footer-grid { display: grid; gap: 30px; padding: 42px 0; }
@media (min-width: 720px) { .wx-footer-grid { grid-template-columns: 1.4fr repeat(3, 1fr); } }
.wx-footer-brand { font-size: 22px; font-weight: 800; letter-spacing: -.05em; }
.wx-footer-brand p { margin-top: 12px; max-width: 280px; font-size: 13px; line-height: 1.75; color: rgba(255,255,255,.58); }
.wx-footer-col strong { display: block; margin-bottom: 16px; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.5); }
.wx-footer-col button, .wx-footer-col a { display: block; padding: 5px 0; border: 0; background: none; color: rgba(255,255,255,.86); font-size: 13px; cursor: pointer; text-align: left; }
.wx-footer-col button:hover, .wx-footer-col a:hover { color: var(--t-accent, var(--wx-coral)); }
.wx-footer-bottom { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.14); color: rgba(255,255,255,.5); font-size: 11px; }
.wx-socials { display: flex; gap: 8px; }
.wx-socials a { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid rgba(255,255,255,.22); border-radius: 50%; font-size: 11px; font-weight: 800; }
.wx-socials a:hover { background: var(--t-accent, var(--wx-coral)); border-color: var(--t-accent, var(--wx-coral)); }

/* ── inner pages ── */
.wx-page-hero { position: relative; min-height: clamp(340px, 46vw, 520px); display: flex; align-items: flex-end; overflow: hidden; background: var(--wx-dark); }
.wx-page-hero img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.wx-page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(0deg, rgba(8,8,10,.86), rgba(8,8,10,.15) 75%); }
.wx-page-hero-inner { position: relative; z-index: 1; width: 100%; padding: clamp(40px, 7vw, 84px) 0; color: #fff; }
.wx-page-index { font-size: 11px; font-weight: 800; letter-spacing: .18em; color: var(--t-accent, var(--wx-coral)); }
.wx-page-title { margin-top: 14px; max-width: 900px; font-size: clamp(38px, 6vw, 74px); font-weight: 800; line-height: 1.02; letter-spacing: -.055em; }
.wx-page-body { margin-top: 16px; max-width: 620px; font-size: 15px; line-height: 1.7; color: rgba(255,255,255,.82); }
.wx-page-intro { display: grid; gap: 28px; }
@media (min-width: 860px) { .wx-page-intro { grid-template-columns: 1fr 1fr; gap: 70px; } }
.wx-prose p { font-size: 15px; line-height: 1.9; color: var(--wx-muted); }
.wx-prose p + p { margin-top: 14px; }
.wx-stat-grid { display: grid; gap: 16px; grid-template-columns: repeat(2, 1fr); margin-top: 48px; }
@media (min-width: 860px) { .wx-stat-grid { grid-template-columns: repeat(4, 1fr); } }
.wx-stat { padding: 24px; border-radius: 16px; background: var(--wx-soft); }
.wx-stat strong { display: block; font-size: clamp(26px, 3vw, 38px); font-weight: 800; letter-spacing: -.05em; color: var(--t-accent-fg, var(--wx-coral)); }
.wx-stat span { display: block; margin-top: 8px; font-size: 12px; line-height: 1.55; color: var(--wx-muted); }
.wx-value-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); margin-top: 30px; }
.wx-value { padding: 26px; border: 1px solid var(--wx-line); border-radius: 16px; }
.wx-value span { font-size: 11px; font-weight: 800; letter-spacing: .14em; color: var(--t-accent-fg, var(--wx-coral)); }
.wx-value h3 { margin-top: 14px; font-size: 19px; font-weight: 800; letter-spacing: -.03em; }
.wx-value p { margin-top: 9px; font-size: 13px; line-height: 1.7; color: var(--wx-muted); }
.wx-gallery-grid { display: grid; gap: 14px; grid-template-columns: repeat(2, 1fr); }
@media (min-width: 900px) { .wx-gallery-grid { grid-template-columns: repeat(3, 1fr); } }
/* About page: four compact image cards in one row on wide screens. */
.wx-gallery-grid.wx-about-gallery { gap: 12px; }
@media (min-width: 900px) { .wx-gallery-grid.wx-about-gallery { grid-template-columns: repeat(4, 1fr); } }
.wx-about-gallery .wx-gallery-item { aspect-ratio: 4 / 3; border-radius: 14px; }
.wx-gallery-item { position: relative; aspect-ratio: 4 / 3; overflow: hidden; border: 0; border-radius: 16px; padding: 0; background: #eae8e3; cursor: zoom-in; }
.wx-gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s; }
.wx-gallery-item:hover img { transform: scale(1.05); }
.wx-service-list { display: grid; gap: 18px; }
.wx-service-row { display: grid; gap: 20px; width: 100%; padding: 0; border: 0; background: none; text-align: left; cursor: pointer; }
@media (min-width: 760px) { .wx-service-row { grid-template-columns: 300px 1fr; align-items: center; gap: 34px; } }
.wx-service-photo { height: 230px; overflow: hidden; border-radius: 18px; }
.wx-service-photo img { width: 100%; height: 100%; object-fit: cover; }
.wx-service-copy h2 { font-size: clamp(25px, 3vw, 38px); font-weight: 800; letter-spacing: -.04em; }
.wx-service-copy p { margin-top: 12px; max-width: 620px; font-size: 14px; line-height: 1.75; color: var(--wx-muted); }
.wx-service-meta { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 20px; font-size: 12px; font-weight: 800; }
.wx-service-meta b { color: var(--t-accent-fg, var(--wx-coral)); }
.wx-room-grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); }
.wx-room { overflow: hidden; border: 1px solid var(--wx-line); border-radius: 18px; background: var(--t-bg, #fff); }
.wx-room-photo { height: 210px; overflow: hidden; }
.wx-room-photo img { width: 100%; height: 100%; object-fit: cover; }
/* Founder portraits: three smaller cards in a row, cropped face-first. */
.wx-founder-grid { grid-template-columns: minmax(0, 1fr); }
@media (min-width: 640px) { .wx-founder-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 980px) { .wx-founder-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.wx-founder-grid .wx-founder-photo { height: 300px; aspect-ratio: auto; }
.wx-founder-grid .wx-founder-photo img { object-position: center 15%; }
.wx-room-body { padding: 22px; }
.wx-room-body h3 { font-size: 20px; font-weight: 800; letter-spacing: -.03em; }
.wx-room-body p { margin-top: 9px; font-size: 13px; line-height: 1.7; color: var(--wx-muted); }
.wx-room-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.wx-detail-grid { display: grid; gap: 40px; }
@media (min-width: 900px) { .wx-detail-grid { grid-template-columns: 1.2fr .8fr; gap: 70px; } }
.wx-facts { display: grid; gap: 0; margin-top: 26px; }
.wx-fact { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 14px 0; border-top: 1px solid var(--wx-line); font-size: 13px; }
.wx-fact span { color: var(--wx-muted); }
.wx-fact b { text-align: right; }
.wx-aside { align-self: start; padding: clamp(22px, 3vw, 32px); border-radius: 20px; background: var(--wx-soft); border: 1px solid var(--wx-line); }
.wx-aside h3 { margin: 10px 0 6px; font-size: 22px; font-weight: 800; letter-spacing: -.035em; }
.wx-aside .wx-btn { width: 100%; margin-top: 22px; }
.wx-bullets { display: grid; gap: 10px; margin-top: 20px; }
.wx-bullets li { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; line-height: 1.55; }
.wx-bullets i { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: color-mix(in srgb, var(--t-accent, var(--wx-coral)) 14%, #fff); color: var(--t-accent-fg, var(--wx-coral)); font-style: normal; font-size: 11px; font-weight: 800; flex: none; }
.wx-detail-photos { display: grid; gap: 14px; grid-template-columns: repeat(2, 1fr); margin-top: 46px; }
.wx-detail-photos button { height: clamp(160px, 24vw, 300px); overflow: hidden; border: 0; border-radius: 16px; padding: 0; background: #eae8e3; cursor: zoom-in; }
.wx-detail-photos img { width: 100%; height: 100%; object-fit: cover; }
.wx-map { margin-top: 46px; height: 320px; overflow: hidden; border-radius: 20px; background: var(--wx-soft); }
.wx-map iframe { width: 100%; height: 100%; border: 0; }
.wx-faq { display: grid; gap: 12px; margin-top: 30px; }
.wx-faq details { padding: 18px 22px; border: 1px solid var(--wx-line); border-radius: 14px; background: var(--t-bg, #fff); }
.wx-faq summary { cursor: pointer; font-size: 14px; font-weight: 800; list-style: none; }
.wx-faq summary::-webkit-details-marker { display: none; }
.wx-faq summary::after { content: '+'; float: right; color: var(--t-accent-fg, var(--wx-coral)); }
.wx-faq details[open] summary::after { content: '−'; }
.wx-faq p { margin-top: 12px; font-size: 13px; line-height: 1.75; color: var(--wx-muted); }
.wx-jobs { display: grid; gap: 12px; margin-top: 30px; }
.wx-job { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; width: 100%; padding: 22px; border: 1px solid var(--wx-line); border-radius: 16px; background: var(--t-bg, #fff); text-align: left; cursor: pointer; }
.wx-job:hover { border-color: var(--t-accent, var(--wx-coral)); }
.wx-job h3 { font-size: 18px; font-weight: 800; }
.wx-job span, .wx-job p { font-size: 12px; color: var(--wx-muted); }
.wx-apply { margin-top: 34px; padding: clamp(22px, 3vw, 36px); border-radius: 20px; background: var(--wx-soft); }
.wx-empty { padding: 40px; border-radius: 16px; background: var(--wx-soft); color: var(--wx-muted); text-align: center; }

/* ── booking modal ── */
.wx-modal { position: fixed; inset: 0; z-index: 250; display: grid; place-items: center; padding: 14px; }
.wx-modal-backdrop { position: absolute; inset: 0; width: 100%; border: 0; background: rgba(12,12,15,.66); backdrop-filter: blur(4px); cursor: pointer; }
.wx-modal-panel {
  position: relative;
  display: grid;
  gap: 0;
  width: min(100%, 940px);
  max-height: min(92vh, 860px);
  overflow: auto;
  border-radius: 22px;
  background: var(--t-bg, #fff);
  box-shadow: 0 30px 90px rgba(0,0,0,.3);
}
@media (min-width: 820px) { .wx-modal-panel { grid-template-columns: .8fr 1.2fr; overflow: hidden; } }
.wx-modal-close { position: absolute; top: 14px; right: 14px; z-index: 2; display: grid; place-items: center; width: 38px; height: 38px; border: 1px solid var(--wx-line); border-radius: 50%; background: rgba(255,255,255,.9); cursor: pointer; }
.wx-modal-aside { position: relative; min-height: 190px; background: var(--wx-dark); color: #fff; }
.wx-modal-aside img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .55; }
.wx-modal-aside-copy { position: absolute; inset: auto 0 0 0; padding: 26px; }
.wx-modal-aside-copy .wx-kicker { color: #fff; }
.wx-modal-aside-copy h2 { margin-top: 10px; font-size: 27px; font-weight: 800; letter-spacing: -.04em; }
.wx-modal-aside-copy p { margin-top: 8px; font-size: 13px; line-height: 1.6; color: rgba(255,255,255,.8); }
.wx-modal-form { padding: clamp(22px, 4vw, 42px); overflow-y: auto; }
.wx-modal-form > .wx-kicker { margin-bottom: 10px; }
.wx-modal-form > h2 { font-size: clamp(24px, 3vw, 34px); font-weight: 800; letter-spacing: -.04em; }
.wx-modal-form > p { margin: 10px 0 22px; font-size: 13px; line-height: 1.65; color: var(--wx-muted); }

@media (prefers-reduced-motion: reduce) {
  .wx *, .wx *::before, .wx *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
    scroll-behavior: auto !important;
  }
}
`;
