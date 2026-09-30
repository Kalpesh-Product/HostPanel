// Haven's look — calm and residential: soft serif headings (Fraunces), DM Sans body, pill
// buttons, arch-shaped photos and generous rounded cards on a warm, quiet background.
// It defines the same neutral tp-* primitives Savor and Wayfarer do, so the shared forms,
// modals and overlays pick up Haven's styling automatically. Colours are all --t-* vars.

export const HAVEN_FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=DM+Sans:wght@400;500;600;700&display=swap');";

export const HAVEN_CSS = `
${HAVEN_FONTS}
.hv { --hv-ink-accent: color-mix(in srgb, var(--t-accent) 62%, var(--t-text)); background: var(--t-bg); color: var(--t-text); font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; overflow-x: clip; }
.hv *, .hv *::before, .hv *::after { box-sizing: border-box; }
.hv h1, .hv h2, .hv h3, .hv h4, .hv .tp-display { font-family: 'Fraunces', Georgia, 'Times New Roman', serif; letter-spacing: -0.015em; line-height: 1.08; font-weight: 500; }
/* zero specificity, so Tailwind margin utilities (mb-3, mt-4...) still apply */
:where(.hv) :where(h1, h2, h3, h4, p) { margin: 0; }
.hv button { font-family: inherit; }
.hv img { display: block; max-width: 100%; }
:where(.tp-wrap) { margin-left: auto; margin-right: auto; }
.tp-wrap { width: 100%; max-width: 1180px; padding-left: 22px; padding-right: 22px; }
@media (min-width: 768px) { .tp-wrap { padding-left: 36px; padding-right: 36px; } }
.tp-section { padding-top: 64px; padding-bottom: 64px; }
@media (min-width: 768px) { .tp-section { padding-top: 104px; padding-bottom: 104px; } }

.tp-muted { color: var(--t-muted); }
.tp-eyebrow { display: inline-flex; align-items: center; gap: 10px; font-size: 12.5px; font-weight: 600; letter-spacing: 0.06em; color: var(--hv-ink-accent); }
.tp-eyebrow::before { content: ''; width: 22px; height: 1.5px; background: currentColor; opacity: .7; }
.tp-h1 { font-size: clamp(38px, 5.6vw, 72px); }
.tp-h2 { font-size: clamp(30px, 3.8vw, 48px); }
.tp-h3 { font-size: clamp(20px, 2vw, 26px); }
.tp-lead { font-size: clamp(16px, 1.4vw, 18px); line-height: 1.7; color: var(--t-muted); }

/* surfaces */
.tp-card { background: var(--t-raised); border: 1px solid var(--t-line); border-radius: 28px; transition: transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s, border-color .3s; }
.tp-card-hover { cursor: pointer; }
.tp-card-hover:hover { transform: translateY(-4px); box-shadow: 0 30px 50px -34px color-mix(in srgb, var(--t-text) 55%, transparent); }
.tp-soft { background: var(--t-surface); border-radius: 22px; }
.tp-accent-panel { background: var(--t-accent); color: var(--t-accent-text, #fff); border-radius: 32px; }
.tp-dark-panel { background: var(--t-ink); color: var(--t-on-ink); border-radius: 32px; }

/* buttons */
:where(.tp-btn) { display: inline-flex; }
.tp-btn { align-items: center; justify-content: center; gap: 8px; border-radius: 999px; padding: 14px 26px; font-weight: 600; font-size: 15px; border: 1.5px solid transparent; cursor: pointer; white-space: nowrap; transition: transform .25s cubic-bezier(.22,1,.36,1), background .2s, color .2s, box-shadow .25s, border-color .2s; }
.tp-btn:hover { transform: translateY(-2px); }
.tp-btn:active { transform: scale(.98); }
.tp-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.tp-btn-primary { background: var(--t-accent); color: var(--t-accent-text, #fff); }
.tp-btn-primary:hover { background: var(--t-accent-dark, var(--t-accent)); box-shadow: 0 14px 26px -14px var(--t-accent); }
.tp-btn-dark { background: var(--t-ink); color: var(--t-on-ink); }
.tp-btn-ghost { background: transparent; color: var(--t-text); border-color: color-mix(in srgb, var(--t-text) 28%, transparent); }
.tp-btn-ghost:hover { border-color: var(--t-text); }
.tp-btn-light { background: #fff; color: #17201b; }
.tp-btn-sm { padding: 9px 18px; font-size: 13.5px; }
.tp-link { font-weight: 600; font-size: 15px; color: var(--hv-ink-accent); display: inline-flex; align-items: center; gap: 8px; cursor: pointer; background: none; border: 0; padding: 0; }
.tp-link:hover { text-decoration: underline; text-underline-offset: 4px; }
.tp-link .tp-arrow { transition: transform .25s; }
.tp-link:hover .tp-arrow { transform: translateX(4px); }

/* chips & tabs */
.tp-chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 5px 12px; font-size: 12.5px; font-weight: 600; background: color-mix(in srgb, var(--t-text) 7%, transparent); color: var(--t-text); }
.tp-chip-accent { background: color-mix(in srgb, var(--t-accent) 16%, transparent); color: var(--hv-ink-accent); }
.tp-tab { border-radius: 999px; padding: 9px 18px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1.5px solid color-mix(in srgb, var(--t-text) 20%, transparent); background: transparent; color: var(--t-text); transition: all .2s; white-space: nowrap; }
.tp-tab:hover { border-color: var(--t-text); }
.tp-tab[aria-pressed="true"] { background: var(--t-text); color: var(--t-bg); border-color: var(--t-text); }

/* forms */
.tp-label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 7px; color: var(--t-muted); }
.tp-input { width: 100%; background: var(--t-bg); border: 1.5px solid var(--t-line); border-radius: 16px; padding: 13px 16px; font-size: 15px; outline: none; color: var(--t-text); transition: border-color .15s, box-shadow .15s; font-family: inherit; }
.tp-input::placeholder { color: color-mix(in srgb, var(--t-text) 40%, transparent); }
.tp-input:focus { border-color: var(--t-accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--t-accent) 20%, transparent); }
.tp-input:disabled { opacity: .55; }
textarea.tp-input { resize: vertical; min-height: 96px; }

/* imagery */
.tp-zoom { overflow: hidden; }
.tp-zoom img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s cubic-bezier(.22,1,.36,1); }
.tp-card-hover:hover .tp-zoom img, .tp-zoom:hover img { transform: scale(1.06); }
.tp-ph { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(160deg, color-mix(in srgb, var(--t-accent) 22%, var(--t-surface)), color-mix(in srgb, var(--t-text) 8%, var(--t-surface))); color: var(--hv-ink-accent); font-family: 'Fraunces', Georgia, serif; font-weight: 500; font-size: 52px; }
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

/* haven-only pieces */
.hv-arch { border-radius: 999px 999px 28px 28px; overflow: hidden; }
.hv-pill { background: color-mix(in srgb, var(--t-raised) 88%, transparent); backdrop-filter: blur(14px); border: 1px solid var(--t-line); box-shadow: 0 18px 40px -26px color-mix(in srgb, var(--t-text) 60%, transparent); }
.hv-navlink { position: relative; padding: 9px 15px; font-size: 14.5px; font-weight: 500; background: none; border: 0; border-radius: 999px; cursor: pointer; color: var(--t-text); transition: background .2s; }
.hv-navlink:hover { background: color-mix(in srgb, var(--t-text) 7%, transparent); }
.hv-navlink[aria-current="page"] { background: color-mix(in srgb, var(--t-accent) 18%, transparent); font-weight: 600; }
.hv-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.hv-spec { display: flex; align-items: center; gap: 12px; }
.hv-spec-icon { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 50%; background: color-mix(in srgb, var(--t-accent) 16%, transparent); color: var(--hv-ink-accent); flex: none; }
.hv-rule { border-top: 1px solid var(--t-line); }
.hv-num { font-family: 'Fraunces', Georgia, serif; font-weight: 400; color: var(--hv-ink-accent); }
.hv-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 14.5px; }
.hv-table th, .hv-table td { padding: 14px 18px; text-align: left; vertical-align: middle; border-bottom: 1px solid var(--t-line); }
.hv-table thead th { font-weight: 600; background: var(--t-surface); }
.hv-table tbody th { font-weight: 600; color: var(--t-muted); font-size: 13px; white-space: nowrap; }
.hv-snap { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
.hv-snap::-webkit-scrollbar { display: none; }
.hv-snap > * { scroll-snap-align: center; flex: 0 0 auto; }
/* a full-bleed scroller whose first item lines up with the page's content column */
.hv-bleed { padding-left: max(22px, calc((100vw - 1180px) / 2 + 22px)); padding-right: 22px; scroll-padding-left: max(22px, calc((100vw - 1180px) / 2 + 22px)); }
@media (min-width: 768px) { .hv-bleed { padding-left: max(36px, calc((100vw - 1180px) / 2 + 36px)); padding-right: 36px; scroll-padding-left: max(36px, calc((100vw - 1180px) / 2 + 36px)); } }

.hv :focus-visible { outline: 3px solid color-mix(in srgb, var(--t-accent) 70%, transparent); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  .hv *, .hv *::before, .hv *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
}
`;
