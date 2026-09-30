// Wayfarer's look — crisp, travel-booking energy: Sora headings, Inter body, tight
// radii, a full-width header and lots of white space around dense, useful cards.
// It defines the same neutral tp-* primitives Savor does, so the shared forms, modals
// and overlays pick up Wayfarer's styling automatically. Colours are all --t-* vars.

export const WAYFARER_FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');";

export const WAYFARER_CSS = `
${WAYFARER_FONTS}
.wf { background: var(--t-bg); color: var(--t-text); font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; overflow-x: clip; }
.wf *, .wf *::before, .wf *::after { box-sizing: border-box; }
.wf h1, .wf h2, .wf h3, .wf h4, .wf .tp-display { font-family: 'Sora', 'Inter', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; line-height: 1.1; font-weight: 700; }
/* zero specificity, so Tailwind margin utilities (mb-3, mt-4...) still apply */
:where(.wf) :where(h1, h2, h3, h4, p) { margin: 0; }
.wf button { font-family: inherit; }
.wf img { display: block; max-width: 100%; }
.tp-wrap { width: 100%; max-width: 1200px; margin: 0 auto; padding-left: 20px; padding-right: 20px; }
@media (min-width: 768px) { .tp-wrap { padding-left: 28px; padding-right: 28px; } }
.tp-section { padding-top: 56px; padding-bottom: 56px; }
@media (min-width: 768px) { .tp-section { padding-top: 84px; padding-bottom: 84px; } }

.tp-muted { color: var(--t-muted); }
.tp-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--t-secondary-fg, var(--t-accent-fg, var(--t-accent))); }
.tp-h1 { font-size: clamp(34px, 5.4vw, 64px); }
.tp-h2 { font-size: clamp(26px, 3.4vw, 40px); }
.tp-h3 { font-size: clamp(19px, 1.9vw, 24px); }
.tp-lead { font-size: clamp(15px, 1.4vw, 17px); line-height: 1.65; color: var(--t-muted); }

/* surfaces */
.tp-card { background: var(--t-raised); border: 1px solid var(--t-line); border-radius: 16px; box-shadow: 0 1px 2px color-mix(in srgb, var(--t-text) 6%, transparent); transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s, border-color .3s; }
.tp-card-hover { cursor: pointer; }
.tp-card-hover:hover { transform: translateY(-3px); box-shadow: 0 18px 36px -20px color-mix(in srgb, var(--t-text) 40%, transparent); border-color: color-mix(in srgb, var(--t-accent) 55%, var(--t-line)); }
.tp-soft { background: var(--t-surface); border-radius: 16px; }
.tp-accent-panel { background: var(--t-accent); color: var(--t-accent-text, #fff); border-radius: 20px; }
.tp-dark-panel { background: var(--t-ink); color: var(--t-on-ink); border-radius: 20px; }

/* buttons */
:where(.tp-btn) { display: inline-flex; }
.tp-btn { align-items: center; justify-content: center; gap: 8px; border-radius: 12px; padding: 12px 20px; font-weight: 600; font-size: 14px; border: 1.5px solid transparent; cursor: pointer; white-space: nowrap; transition: transform .2s cubic-bezier(.22,1,.36,1), background .2s, color .2s, box-shadow .2s, border-color .2s; }
.tp-btn:hover { transform: translateY(-1px); }
.tp-btn:active { transform: scale(.98); }
.tp-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.tp-btn-primary { background: var(--t-accent); color: var(--t-accent-text, #fff); }
.tp-btn-primary:hover { background: var(--t-accent-dark, var(--t-accent)); box-shadow: 0 10px 22px -12px var(--t-accent); }
.tp-btn-dark { background: var(--t-ink); color: var(--t-on-ink); }
.tp-btn-ghost { background: transparent; color: var(--t-text); border-color: var(--t-line); }
.tp-btn-ghost:hover { border-color: var(--t-text); }
.tp-btn-light { background: #fff; color: #111; }
.tp-btn-sm { padding: 8px 14px; font-size: 13px; border-radius: 10px; }
.tp-link { font-weight: 600; font-size: 14px; color: var(--t-secondary-fg, var(--t-accent-dark, var(--t-accent))); display: inline-flex; align-items: center; gap: 6px; cursor: pointer; background: none; border: 0; padding: 0; }
.tp-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.tp-link .tp-arrow { transition: transform .2s; }
.tp-link:hover .tp-arrow { transform: translateX(3px); }

/* chips & tabs */
.tp-chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; padding: 4px 9px; font-size: 12px; font-weight: 600; background: color-mix(in srgb, var(--t-text) 7%, transparent); color: var(--t-text); }
.tp-chip-accent { background: color-mix(in srgb, var(--t-secondary, var(--t-accent)) 14%, transparent); color: var(--t-secondary-fg, var(--t-accent-dark, var(--t-accent))); }
.tp-tab { border-radius: 10px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--t-line); background: var(--t-raised); color: var(--t-text); transition: all .2s; white-space: nowrap; }
.tp-tab:hover { border-color: var(--t-text); }
.tp-tab[aria-pressed="true"] { background: var(--t-text); color: var(--t-bg); border-color: var(--t-text); }

/* forms */
.tp-label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--t-muted); }
.tp-input { width: 100%; background: var(--t-raised); border: 1px solid var(--t-line); border-radius: 10px; padding: 11px 12px; font-size: 14px; outline: none; color: var(--t-text); transition: border-color .15s, box-shadow .15s; font-family: inherit; }
.tp-input::placeholder { color: color-mix(in srgb, var(--t-text) 40%, transparent); }
.tp-input:focus { border-color: var(--t-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--t-accent) 22%, transparent); }
.tp-input:disabled { opacity: .55; }
textarea.tp-input { resize: vertical; min-height: 88px; }

/* imagery */
.tp-zoom { overflow: hidden; }
.tp-zoom img { width: 100%; height: 100%; object-fit: cover; transition: transform .8s cubic-bezier(.22,1,.36,1); }
.tp-card-hover:hover .tp-zoom img, .tp-zoom:hover img { transform: scale(1.05); }
.tp-ph { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 18%, var(--t-surface)), color-mix(in srgb, var(--t-text) 8%, var(--t-surface))); color: var(--t-accent); font-family: 'Sora', sans-serif; font-weight: 800; font-size: 44px; }

/* image cell that keeps its own size: the photo fills it and can never stretch the card */
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

/* wayfarer-only pieces */
.wf-header { transition: background .3s, box-shadow .3s, color .3s; color: #fff; }
.wf-header[data-solid="true"] { background: color-mix(in srgb, var(--t-raised) 94%, transparent); backdrop-filter: blur(12px); color: var(--t-text); box-shadow: 0 1px 0 var(--t-line); }
.wf-navlink { position: relative; padding: 8px 12px; font-size: 14px; font-weight: 600; background: none; border: 0; cursor: pointer; color: inherit; opacity: .88; transition: opacity .2s; }
.wf-navlink:hover { opacity: 1; }
.wf-navlink::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: 2px; height: 2px; background: var(--t-accent); transform: scaleX(0); transform-origin: left; transition: transform .25s cubic-bezier(.22,1,.36,1); }
.wf-navlink:hover::after, .wf-navlink[aria-current="page"]::after { transform: scaleX(1); }
.wf-bar { background: var(--t-raised); color: var(--t-text); border-radius: 18px; box-shadow: 0 24px 60px -24px rgba(0,0,0,.55); }
.wf-fact { display: flex; align-items: center; gap: 12px; }
.wf-fact-icon { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: color-mix(in srgb, var(--t-secondary, var(--t-accent)) 14%, transparent); color: var(--t-secondary-fg, var(--t-accent-dark, var(--t-accent))); flex: none; }

.wf :focus-visible { outline: 3px solid color-mix(in srgb, var(--t-accent) 70%, transparent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .wf *, .wf *::before, .wf *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
}
`;
