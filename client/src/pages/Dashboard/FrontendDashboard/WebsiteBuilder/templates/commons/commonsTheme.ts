// Commons' look — the familiar co-working style: deep navy, a warm yellow highlight, a
// bold geometric sans (Plus Jakarta Sans), tidy hairline grids, medium radii and a
// sticky white header under a slim status strip. It defines the same neutral tp-*
// primitives the other new templates do, so the shared forms, modals and overlays pick
// up Commons' styling automatically. Colours are all --t-* vars.

export const COMMONS_FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');";

export const COMMONS_CSS = `
${COMMONS_FONTS}
.cw { background: var(--t-bg); color: var(--t-text); font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; overflow-x: clip; }
.cw *, .cw *::before, .cw *::after { box-sizing: border-box; }
.cw h1, .cw h2, .cw h3, .cw h4, .cw .tp-display { font-family: 'Plus Jakarta Sans', 'Inter', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.03em; line-height: 1.05; font-weight: 800; }
/* zero specificity, so Tailwind margin utilities (mb-3, mt-4...) still apply */
:where(.cw) :where(h1, h2, h3, h4, p) { margin: 0; }
:where(.tp-wrap) { margin-left: auto; margin-right: auto; }
.cw button { font-family: inherit; }
.cw img { display: block; max-width: 100%; }
.tp-wrap { width: 100%; max-width: 1240px; padding-left: 20px; padding-right: 20px; }
@media (min-width: 768px) { .tp-wrap { padding-left: 32px; padding-right: 32px; } }
.tp-section { padding-top: 64px; padding-bottom: 64px; }
@media (min-width: 768px) { .tp-section { padding-top: 96px; padding-bottom: 96px; } }

.tp-muted { color: var(--t-muted); }
.tp-eyebrow { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--t-text); }
.tp-eyebrow::before { content: ''; width: 10px; height: 10px; background: var(--t-accent); border-radius: 2px; flex: none; }
.tp-h1 { font-size: clamp(40px, 6.6vw, 92px); }
.tp-h2 { font-size: clamp(30px, 4vw, 52px); }
.tp-h3 { font-size: clamp(20px, 2vw, 26px); letter-spacing: -0.02em; }
.tp-lead { font-size: clamp(16px, 1.4vw, 19px); line-height: 1.65; color: var(--t-muted); }

/* surfaces */
.tp-card { background: var(--t-raised); border: 1px solid var(--t-line); border-radius: 16px; transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s, border-color .25s; }
.tp-card-hover { cursor: pointer; }
.tp-card-hover:hover { transform: translateY(-3px); border-color: var(--t-text); box-shadow: 0 22px 40px -30px color-mix(in srgb, var(--t-text) 60%, transparent); }
.tp-soft { background: var(--t-surface); border-radius: 16px; }
.tp-accent-panel { background: var(--t-accent); color: var(--t-accent-text, #111); border-radius: 20px; }
.tp-dark-panel { background: var(--t-ink); color: var(--t-on-ink); border-radius: 20px; }

/* buttons */
:where(.tp-btn) { display: inline-flex; }
.tp-btn { align-items: center; justify-content: center; gap: 8px; border-radius: 10px; padding: 14px 24px; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 700; font-size: 14.5px; border: 2px solid transparent; cursor: pointer; white-space: nowrap; transition: transform .2s cubic-bezier(.22,1,.36,1), background .2s, color .2s, box-shadow .2s, border-color .2s; }
.tp-btn:hover { transform: translateY(-2px); }
.tp-btn:active { transform: scale(.98); }
.tp-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.tp-btn-primary { background: var(--t-accent); color: var(--t-accent-text, #111); }
.tp-btn-primary:hover { background: var(--t-accent-light, var(--t-accent)); box-shadow: 0 12px 24px -12px var(--t-accent); }
.tp-btn-dark { background: var(--t-ink); color: var(--t-on-ink); }
.tp-btn-dark:hover { box-shadow: 0 12px 24px -14px var(--t-ink); }
.tp-btn-ghost { background: transparent; color: var(--t-text); border-color: var(--t-text); }
.tp-btn-ghost:hover { background: var(--t-text); color: var(--t-bg); }
.tp-btn-light { background: #fff; color: #0b1220; }
.tp-btn-sm { padding: 9px 16px; font-size: 13px; border-radius: 9px; }
.tp-link { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--t-text); display: inline-flex; align-items: center; gap: 8px; cursor: pointer; background: none; border: 0; padding: 0 0 3px; background-image: linear-gradient(var(--t-accent), var(--t-accent)); background-size: 100% 3px; background-repeat: no-repeat; background-position: 0 100%; transition: background-size .25s; }
.tp-link:hover { background-size: 100% 100%; }
.tp-link .tp-arrow { transition: transform .25s; }
.tp-link:hover .tp-arrow { transform: translateX(4px); }

/* chips & tabs */
.tp-chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; padding: 5px 10px; font-size: 12.5px; font-weight: 600; background: color-mix(in srgb, var(--t-text) 8%, transparent); color: var(--t-text); }
.tp-chip-accent { background: var(--t-accent); color: var(--t-accent-text, #111); }
.tp-tab { border-radius: 10px; padding: 9px 16px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1.5px solid var(--t-line); background: var(--t-raised); color: var(--t-text); transition: all .2s; white-space: nowrap; }
.tp-tab:hover { border-color: var(--t-text); }
.tp-tab[aria-pressed="true"] { background: var(--t-ink); color: var(--t-on-ink); border-color: var(--t-ink); }

/* forms */
.tp-label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px; color: var(--t-muted); }
.tp-input { width: 100%; background: var(--t-raised); border: 1.5px solid var(--t-line); border-radius: 10px; padding: 12px 14px; font-size: 15px; outline: none; color: var(--t-text); transition: border-color .15s, box-shadow .15s; font-family: inherit; }
.tp-input::placeholder { color: color-mix(in srgb, var(--t-text) 40%, transparent); }
.tp-input:focus { border-color: var(--t-text); box-shadow: 0 0 0 4px color-mix(in srgb, var(--t-accent) 45%, transparent); }
.tp-input:disabled { opacity: .55; }
textarea.tp-input { resize: vertical; min-height: 92px; }

/* imagery */
.tp-zoom { overflow: hidden; }
.tp-zoom img { width: 100%; height: 100%; object-fit: cover; transition: transform .9s cubic-bezier(.22,1,.36,1); }
.tp-card-hover:hover .tp-zoom img, .tp-zoom:hover img { transform: scale(1.05); }
.tp-ph { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 40%, var(--t-surface)), color-mix(in srgb, var(--t-text) 10%, var(--t-surface))); color: var(--t-text); font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 48px; }
.tp-fill { position: relative; overflow: hidden; }
.tp-fill > img, .tp-fill > .tp-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.tp-clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tp-clamp3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.tp-diet { width: 16px; height: 16px; border: 1.5px solid; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; background: #fff; }
.tp-diet::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.tp-blob { display: none; }
.tp-scroll-x { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 12px; scrollbar-width: none; }
.tp-scroll-x::-webkit-scrollbar { display: none; }
.tp-scroll-x > * { scroll-snap-align: start; flex: 0 0 auto; }

/* commons-only pieces */
.cw-header { background: color-mix(in srgb, var(--t-raised) 94%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--t-line); }
.cw-navlink { position: relative; padding: 8px 12px; font-size: 14.5px; font-weight: 600; background: none; border: 0; cursor: pointer; color: var(--t-text); }
.cw-navlink::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: 0; height: 3px; border-radius: 2px; background: var(--t-accent); transform: scaleX(0); transform-origin: left; transition: transform .25s cubic-bezier(.22,1,.36,1); }
.cw-navlink:hover::after, .cw-navlink[aria-current="page"]::after { transform: scaleX(1); }
.cw-num { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 13px; letter-spacing: 0.06em; color: var(--t-muted); }
/* on a photo: ghost buttons go white; on navy: eyebrows keep the surrounding colour */
.cw-on-photo .tp-btn-ghost { color: #fff; border-color: rgba(255,255,255,.85); }
.cw-on-photo .tp-btn-ghost:hover { background: #fff; color: #0b1f3a; }
.cw-on-photo .tp-eyebrow, .cw-dark .tp-eyebrow { color: inherit; }
/* rows that centre a short last line: 1 card fills, 2 sit centred, 4 puts the 4th in the middle */
.cw-row { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--g, 20px); }
.cw-row > * { width: 100%; }
@media (min-width: 640px) { .cw-row > * { width: calc((100% - var(--g, 20px)) / 2); } }
@media (min-width: 768px) { .cw-row[data-cols="2"] > *, .cw-row[data-cols="1"] > * { width: calc((100% - var(--g, 20px)) / 2); } .cw-row[data-cols="1"] > * { width: 100%; } }
@media (min-width: 1024px) {
  .cw-row[data-cols="3"] > * { width: calc((100% - var(--g, 20px) * 2) / 3); }
  .cw-row[data-cols="4"] > * { width: calc((100% - var(--g, 20px) * 3) / 4); }
  .cw-row[data-cols="5"] > * { width: calc((100% - var(--g, 20px) * 4) / 5); }
}
.cw-tile { border-radius: 18px; overflow: hidden; position: relative; }
.cw-tile > .tp-ph { position: absolute; inset: 0; }
.cw-grid-lines { display: grid; gap: 1px; background: var(--t-line); border: 1px solid var(--t-line); border-radius: 16px; overflow: hidden; }
.cw-grid-lines > * { background: var(--t-raised); }
.cw-check { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 6px; background: var(--t-accent); color: var(--t-accent-text, #111); flex: none; }
.cw-tabitem { display: flex; align-items: center; gap: 16px; width: 100%; padding: 18px 20px; text-align: left; border: 0; border-bottom: 1px solid var(--t-line); background: transparent; cursor: pointer; transition: background .2s, padding .25s; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 18px; letter-spacing: -0.02em; color: var(--t-text); }
.cw-tabitem:hover { background: color-mix(in srgb, var(--t-accent) 14%, transparent); }
.cw-tabitem[aria-selected="true"] { background: var(--t-accent); color: var(--t-accent-text, #111); padding-left: 26px; }
.cw-tabitem[aria-selected="true"] .cw-num { color: inherit; opacity: .7; }
.cw-index-row { display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 20px; width: 100%; padding: 26px 8px; text-align: left; border-bottom: 1px solid var(--t-line); cursor: pointer; background: transparent; transition: background .25s, padding .3s; }
.cw-index-row:hover { background: color-mix(in srgb, var(--t-accent) 16%, transparent); padding-left: 20px; padding-right: 20px; }

.cw :focus-visible { outline: 3px solid var(--t-text); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .cw *, .cw *::before, .cw *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
}
`;
