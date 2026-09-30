// Huddle's look: a calm, precise "booking desk" style for meeting rooms. Cool off-white page,
// near-black text, one confident blue accent, Sora for headings and Inter for text, crisp 10px
// corners, thin borders and tabular figures for anything with a time or a price. It defines the
// same neutral tp-* primitives the other new templates do, so the shared forms, modals and
// overlays pick up Huddle's styling automatically. Colours are all --t-* vars.

export const HUDDLE_FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');";

export const HUDDLE_CSS = `
${HUDDLE_FONTS}
.hd { background: var(--t-bg); color: var(--t-text); font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; overflow-x: clip; font-variant-numeric: tabular-nums; }
.hd *, .hd *::before, .hd *::after { box-sizing: border-box; }
.hd h1, .hd h2, .hd h3, .hd h4, .hd .tp-display { font-family: 'Sora', 'Inter', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.035em; line-height: 1.08; font-weight: 700; }
:where(.hd) :where(h1, h2, h3, h4, p) { margin: 0; }
:where(.tp-wrap) { margin-left: auto; margin-right: auto; }
.hd button { font-family: inherit; }
.hd img { display: block; max-width: 100%; }
.tp-wrap { width: 100%; max-width: 1200px; padding-left: 20px; padding-right: 20px; }
@media (min-width: 768px) { .tp-wrap { padding-left: 32px; padding-right: 32px; } }
.tp-section { padding-top: 56px; padding-bottom: 56px; }
@media (min-width: 768px) { .tp-section { padding-top: 84px; padding-bottom: 84px; } }

.tp-muted { color: var(--t-muted); }
.tp-eyebrow { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--t-accent-fg, var(--t-accent)); }
.tp-eyebrow::before { content: ''; width: 18px; height: 2px; background: var(--t-accent); flex: none; }
.tp-h1 { font-size: clamp(36px, 5.4vw, 74px); }
.tp-h2 { font-size: clamp(28px, 3.4vw, 44px); }
.tp-h3 { font-size: clamp(19px, 1.8vw, 24px); letter-spacing: -0.025em; }
.tp-lead { font-size: clamp(16px, 1.3vw, 18px); line-height: 1.65; color: var(--t-muted); }

/* surfaces */
.tp-card { background: var(--t-raised); border: 1px solid var(--t-line); border-radius: 12px; transition: transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s, border-color .2s; }
.tp-card-hover { cursor: pointer; }
.tp-card-hover:hover { border-color: var(--t-accent); box-shadow: 0 18px 36px -26px color-mix(in srgb, var(--t-text) 55%, transparent); }
.tp-soft { background: var(--t-surface); border-radius: 12px; }
.tp-accent-panel { background: var(--t-accent); color: var(--t-accent-text, #fff); border-radius: 14px; }
.tp-dark-panel { background: var(--t-ink); color: var(--t-on-ink); border-radius: 14px; }

/* buttons */
:where(.tp-btn) { display: inline-flex; }
.tp-btn { align-items: center; justify-content: center; gap: 8px; border-radius: 8px; padding: 13px 22px; font-family: 'Sora', 'Inter', sans-serif; font-weight: 600; font-size: 14px; border: 1.5px solid transparent; cursor: pointer; white-space: nowrap; transition: transform .18s cubic-bezier(.22,1,.36,1), background .18s, color .18s, box-shadow .18s, border-color .18s; }
.tp-btn:hover { transform: translateY(-1px); }
.tp-btn:active { transform: scale(.985); }
.tp-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.tp-btn-primary { background: var(--t-accent); color: var(--t-accent-text, #fff); }
.tp-btn-primary:hover { background: var(--t-accent-light, var(--t-accent)); box-shadow: 0 10px 22px -12px var(--t-accent); }
.tp-btn-dark { background: var(--t-ink); color: var(--t-on-ink); }
.tp-btn-dark:hover { box-shadow: 0 10px 22px -14px var(--t-ink); }
.tp-btn-ghost { background: transparent; color: var(--t-text); border-color: var(--t-line); }
.tp-btn-ghost:hover { border-color: var(--t-text); }
.tp-btn-light { background: #fff; color: #0b1220; }
.tp-btn-sm { padding: 8px 14px; font-size: 13px; border-radius: 7px; }
.tp-link { font-family: 'Sora', 'Inter', sans-serif; font-weight: 600; font-size: 14px; color: var(--t-accent-fg, var(--t-accent)); display: inline-flex; align-items: center; gap: 8px; cursor: pointer; background: none; border: 0; padding: 0; }
.tp-link:hover { text-decoration: underline; text-underline-offset: 4px; }
.tp-link .tp-arrow { transition: transform .2s; }
.tp-link:hover .tp-arrow { transform: translateX(3px); }

/* chips & tabs */
.tp-chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 6px; padding: 4px 9px; font-size: 12.5px; font-weight: 500; background: color-mix(in srgb, var(--t-text) 7%, transparent); color: var(--t-text); }
.tp-chip-accent { background: var(--t-accent); color: var(--t-accent-text, #fff); font-weight: 600; }
.tp-tab { border-radius: 999px; padding: 8px 16px; font-size: 13.5px; font-weight: 600; cursor: pointer; border: 1px solid var(--t-line); background: var(--t-raised); color: var(--t-text); transition: all .18s; white-space: nowrap; }
.tp-tab:hover { border-color: var(--t-text); }
.tp-tab[aria-pressed="true"] { background: var(--t-ink); color: var(--t-on-ink); border-color: var(--t-ink); }

/* forms */
.tp-label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--t-muted); letter-spacing: .01em; }
.tp-input { width: 100%; background: var(--t-raised); border: 1px solid var(--t-line); border-radius: 8px; padding: 12px 13px; font-size: 15px; outline: none; color: var(--t-text); transition: border-color .15s, box-shadow .15s; font-family: inherit; }
.tp-input::placeholder { color: color-mix(in srgb, var(--t-text) 40%, transparent); }
.tp-input:focus { border-color: var(--t-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--t-accent) 28%, transparent); }
.tp-input:disabled { opacity: .55; }
textarea.tp-input { resize: vertical; min-height: 92px; }

/* imagery */
.tp-zoom { overflow: hidden; }
.tp-zoom img { width: 100%; height: 100%; object-fit: cover; transition: transform .9s cubic-bezier(.22,1,.36,1); }
.tp-card-hover:hover .tp-zoom img, .tp-zoom:hover img { transform: scale(1.04); }
.tp-ph { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 30%, var(--t-surface)), color-mix(in srgb, var(--t-text) 8%, var(--t-surface))); color: var(--t-text); font-family: 'Sora', sans-serif; font-weight: 700; font-size: 44px; }
.tp-fill { position: relative; overflow: hidden; }
.tp-fill > img, .tp-fill > .tp-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.tp-clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tp-clamp3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.tp-diet { width: 16px; height: 16px; border: 1.5px solid; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; background: #fff; }
.tp-diet::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.tp-blob { display: none; }
.tp-scroll-x { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px; scrollbar-width: none; }
.tp-scroll-x::-webkit-scrollbar { display: none; }
.tp-scroll-x > * { scroll-snap-align: start; flex: 0 0 auto; }

/* huddle-only pieces */
.hd-header { background: color-mix(in srgb, var(--t-raised) 92%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--t-line); }
:where(.hd-nav) { display: inline-flex; }
.hd-nav { gap: 2px; padding: 4px; border-radius: 999px; background: color-mix(in srgb, var(--t-text) 6%, transparent); }
.hd-navlink { padding: 8px 14px; font-size: 14px; font-weight: 600; background: none; border: 0; border-radius: 999px; cursor: pointer; color: var(--t-muted); transition: background .18s, color .18s; }
.hd-navlink:hover { color: var(--t-text); }
.hd-navlink[aria-current="page"] { background: var(--t-raised); color: var(--t-text); box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 0 0 1px var(--t-line); }
.hd-tile { border-radius: 12px; overflow: hidden; position: relative; }
.hd-tile > .tp-ph { position: absolute; inset: 0; }
.hd-num { font-family: 'Sora', sans-serif; font-weight: 600; font-size: 12.5px; letter-spacing: 0.08em; color: var(--t-accent-fg, var(--t-accent)); }
.hd-check { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: color-mix(in srgb, var(--t-accent) 16%, transparent); color: var(--t-accent-fg, var(--t-accent)); flex: none; }
.hd-panel { background: var(--t-raised); border: 1px solid var(--t-line); border-radius: 14px; box-shadow: 0 30px 60px -36px color-mix(in srgb, var(--t-text) 45%, transparent); }
.hd-slot { border-radius: 8px; padding: 9px 0; font-size: 13.5px; font-weight: 600; text-align: center; cursor: pointer; border: 1px solid var(--t-line); background: var(--t-raised); color: var(--t-text); transition: all .15s; font-variant-numeric: tabular-nums; }
.hd-slot:hover { border-color: var(--t-accent); }
.hd-slot[aria-pressed="true"] { background: var(--t-accent); border-color: var(--t-accent); color: var(--t-accent-text, #fff); }
.hd-row { display: grid; gap: 0; border: 1px solid var(--t-line); border-radius: 12px; overflow: hidden; background: var(--t-raised); transition: border-color .2s, box-shadow .25s; }
.hd-row:hover { border-color: var(--t-accent); box-shadow: 0 18px 36px -28px color-mix(in srgb, var(--t-text) 55%, transparent); }
.hd-table { width: 100%; border-collapse: collapse; }
.hd-table th { text-align: left; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--t-muted); padding: 12px 16px; border-bottom: 1px solid var(--t-line); }
.hd-table td { padding: 15px 16px; border-bottom: 1px solid var(--t-line); font-size: 15px; }
.hd-table tr:last-child td { border-bottom: 0; }
.hd-dark .tp-eyebrow { color: inherit; }
.hd-on-photo .tp-btn-ghost { color: #fff; border-color: rgba(255,255,255,.6); }
.hd-on-photo .tp-btn-ghost:hover { border-color: #fff; }
.hd-row-cards { display: grid; gap: var(--g, 20px); }
@media (min-width: 640px) { .hd-row-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .hd-row-cards[data-cols="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); } .hd-row-cards[data-cols="4"] { grid-template-columns: repeat(4, minmax(0, 1fr)); } .hd-row-cards[data-cols="5"] { grid-template-columns: repeat(5, minmax(0, 1fr)); } .hd-row-cards[data-cols="1"] { grid-template-columns: minmax(0, 1fr); } }

.hd :focus-visible { outline: 3px solid var(--t-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .hd *, .hd *::before, .hd *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
}
`;
