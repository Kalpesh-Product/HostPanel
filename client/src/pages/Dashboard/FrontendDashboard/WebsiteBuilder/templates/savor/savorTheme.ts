// Savor's look. Colours come from the --t-* variables set on the root element
// (vertical palette, or whatever the business picked), so nothing here is a hex.

export const SAVOR_FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700&display=swap');";

export const SAVOR_CSS = `
${SAVOR_FONTS}
.sv { background: var(--t-bg); color: var(--t-text); font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; overflow-x: clip; }
.sv *, .sv *::before, .sv *::after { box-sizing: border-box; }
.sv h1, .sv h2, .sv h3, .sv h4, .sv .tp-display { font-family: 'Bricolage Grotesque', 'DM Sans', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.025em; line-height: 1.04; font-weight: 700; }
/* zero specificity, so Tailwind margin utilities (mb-3, mt-4...) still apply */
:where(.sv) :where(h1, h2, h3, h4, p) { margin: 0; }
.sv button { font-family: inherit; }
.sv img { display: block; max-width: 100%; }
.tp-wrap { width: 100%; max-width: 1240px; margin: 0 auto; padding-left: 20px; padding-right: 20px; }
@media (min-width: 768px) { .tp-wrap { padding-left: 32px; padding-right: 32px; } }
.tp-section { padding-top: 72px; padding-bottom: 72px; }
@media (min-width: 768px) { .tp-section { padding-top: 104px; padding-bottom: 104px; } }

.tp-muted { color: var(--t-muted); }
.tp-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--t-accent-fg, var(--t-accent)); }
.tp-h1 { font-size: clamp(40px, 7vw, 88px); }
.tp-h2 { font-size: clamp(32px, 4.6vw, 56px); }
.tp-h3 { font-size: clamp(22px, 2.4vw, 30px); }
.tp-lead { font-size: clamp(16px, 1.6vw, 19px); line-height: 1.6; color: var(--t-muted); }

/* surfaces */
.tp-card { background: var(--t-raised); border: 1px solid var(--t-line); border-radius: 26px; transition: transform .45s cubic-bezier(.22,1,.36,1), box-shadow .45s cubic-bezier(.22,1,.36,1), border-color .3s; }
.tp-card-hover { cursor: pointer; }
.tp-card-hover:hover { transform: translateY(-6px); box-shadow: 0 28px 50px -28px color-mix(in srgb, var(--t-text) 45%, transparent); border-color: color-mix(in srgb, var(--t-accent) 40%, var(--t-line)); }
.tp-soft { background: var(--t-surface); border-radius: 26px; }
.tp-accent-panel { background: var(--t-accent); color: var(--t-accent-text, #fff); border-radius: 32px; }
.tp-dark-panel { background: var(--t-ink); color: var(--t-on-ink); border-radius: 32px; }

/* buttons */
:where(.tp-btn) { display: inline-flex; }
.tp-btn { align-items: center; justify-content: center; gap: 8px; border-radius: 999px; padding: 13px 24px; font-weight: 700; font-size: 14px; border: 1.5px solid transparent; cursor: pointer; white-space: nowrap; transition: transform .25s cubic-bezier(.22,1,.36,1), background .25s, color .25s, box-shadow .25s, border-color .25s; }
.tp-btn:hover { transform: translateY(-2px); }
.tp-btn:active { transform: scale(.97); }
.tp-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.tp-btn-primary { background: var(--t-accent); color: var(--t-accent-text, #fff); }
.tp-btn-primary:hover { background: var(--t-accent-dark, var(--t-accent)); box-shadow: 0 14px 28px -14px var(--t-accent); }
.tp-btn-dark { background: var(--t-ink); color: var(--t-on-ink); }
.tp-btn-dark:hover { box-shadow: 0 14px 28px -16px var(--t-ink); }
.tp-btn-ghost { background: transparent; color: var(--t-text); border-color: color-mix(in srgb, var(--t-text) 25%, transparent); }
.tp-btn-ghost:hover { border-color: var(--t-text); }
.tp-btn-light { background: #fff; color: #111; }
.tp-btn-sm { padding: 9px 16px; font-size: 13px; }
.tp-link { font-weight: 700; font-size: 14px; color: var(--t-text); display: inline-flex; align-items: center; gap: 6px; cursor: pointer; background: none; border: 0; padding: 0; }
.tp-link:hover { color: var(--t-accent-fg, var(--t-accent)); }
.tp-link .tp-arrow { transition: transform .25s; }
.tp-link:hover .tp-arrow { transform: translateX(4px); }

/* chips & tabs */
.tp-chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 5px 11px; font-size: 12px; font-weight: 600; background: color-mix(in srgb, var(--t-text) 7%, transparent); color: var(--t-text); }
.tp-chip-accent { background: color-mix(in srgb, var(--t-accent) 15%, transparent); color: var(--t-accent-dark, var(--t-accent)); }
.tp-tab { border-radius: 999px; padding: 9px 18px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1.5px solid var(--t-line); background: var(--t-raised); color: var(--t-text); transition: all .25s; white-space: nowrap; }
.tp-tab:hover { border-color: var(--t-text); }
.tp-tab[aria-pressed="true"] { background: var(--t-text); color: var(--t-bg); border-color: var(--t-text); }

/* forms */
.tp-label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: var(--t-muted); letter-spacing: .02em; }
.tp-input { width: 100%; background: var(--t-raised); border: 1.5px solid var(--t-line); border-radius: 14px; padding: 12px 14px; font-size: 14px; outline: none; color: var(--t-text); transition: border-color .2s, box-shadow .2s; font-family: inherit; }
.tp-input::placeholder { color: color-mix(in srgb, var(--t-text) 40%, transparent); }
.tp-input:focus { border-color: var(--t-accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--t-accent) 20%, transparent); }
.tp-input:disabled { opacity: .55; }
textarea.tp-input { resize: vertical; min-height: 92px; }

/* imagery */
.tp-zoom { overflow: hidden; }
.tp-zoom img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s cubic-bezier(.22,1,.36,1); }
.tp-card-hover:hover .tp-zoom img, .tp-zoom:hover img { transform: scale(1.07); }
.tp-ph { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 22%, var(--t-surface)), color-mix(in srgb, var(--t-accent) 8%, var(--t-surface))); color: var(--t-accent); font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 56px; }

.tp-clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tp-clamp3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.tp-diet { width: 16px; height: 16px; border: 1.5px solid; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; background: #fff; }
.tp-diet::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.tp-blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: .5; pointer-events: none; background: color-mix(in srgb, var(--t-accent) 35%, transparent); }

.tp-header-pill { transition: all .45s cubic-bezier(.22,1,.36,1); }
.sv .tp-navlink { position: relative; padding: 8px 14px; border-radius: 999px; font-size: 14px; font-weight: 600; background: none; border: 0; cursor: pointer; color: var(--t-text); transition: background .2s, color .2s; }
.sv .tp-navlink:hover { background: color-mix(in srgb, var(--t-text) 8%, transparent); }
.sv .tp-navlink[aria-current="page"] { background: var(--t-text); color: var(--t-bg); }

.tp-scroll-x { display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 14px; scrollbar-width: none; }
.tp-scroll-x::-webkit-scrollbar { display: none; }
.tp-scroll-x > * { scroll-snap-align: start; flex: 0 0 auto; }

.sv :focus-visible { outline: 3px solid color-mix(in srgb, var(--t-accent) 70%, transparent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .sv *, .sv *::before, .sv *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
}
`;
