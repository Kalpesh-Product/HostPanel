import { WAYFARER_CSS } from "../wayfarer/wayfarerTheme";

export const TRAVIGO_CSS = `
${WAYFARER_CSS}
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap');

.trv { background: var(--t-bg); color: var(--t-text); font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif; }
.trv h1, .trv h2, .trv h3, .trv h4, .trv .tp-display { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; font-weight: 700; letter-spacing: -.055em; }
.trv .tp-wrap { max-width: 1280px; }
.trv .tp-section { padding-top: 48px; padding-bottom: 48px; }
.trv .tp-card { border-radius: 0; border-color: color-mix(in srgb, var(--t-text) 18%, transparent); box-shadow: none; }
.trv .tp-card-hover:hover { transform: translateY(-5px); box-shadow: 0 24px 50px -34px rgba(0,0,0,.55); }
.trv .tp-btn { border-radius: 999px; padding: 12px 22px; font-weight: 700; }
.trv .tp-btn-primary { background: var(--t-text); color: var(--t-bg); }
.trv .tp-btn-primary:hover { background: var(--t-text); box-shadow: none; }
.trv .tp-btn-ghost { border-color: var(--t-text); }
.trv .tp-chip { border-radius: 999px; }
.trv .tp-soft { background: #ecebe6; }
.trv .wf-header[data-solid="true"] { background: color-mix(in srgb, var(--t-bg) 96%, transparent); box-shadow: 0 1px 0 color-mix(in srgb, var(--t-text) 14%, transparent); }
.trv .wf-navlink { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }
.trv .wf-navlink::after { height: 1px; background: currentColor; }

.trv-hero { min-height: min(720px, calc(100svh - 56px)); background: var(--t-bg); }
.trv-hero-title { font-size: clamp(56px, 10.2vw, 150px); line-height: .82; letter-spacing: -.085em; max-width: 64%; }
.trv-orbit { position: absolute; overflow: hidden; border-radius: 999px; background: #deddd7; }
.trv-orbit img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s cubic-bezier(.22,1,.36,1); }
.trv-orbit:hover img { transform: scale(1.06); }
.trv-orbit-a { width: clamp(150px, 24vw, 330px); height: clamp(150px, 24vw, 330px); right: 2%; top: 6%; }
.trv-orbit-d { width: clamp(100px, 13vw, 180px); height: clamp(100px, 13vw, 180px); right: 26%; top: 60%; }
.trv-orbit-b { width: clamp(84px, 10vw, 140px); height: clamp(84px, 10vw, 140px); left: 40%; bottom: 2%; }
.trv-orbit-c { width: clamp(96px, 12vw, 170px); height: clamp(96px, 12vw, 170px); right: 9%; bottom: 2%; }
.trv-hero-copy { max-width: 380px; }
.trv-rule { height: 1px; background: color-mix(in srgb, var(--t-text) 18%, transparent); }
.trv-number { font-family: 'Manrope', sans-serif; font-size: clamp(34px, 4vw, 56px); font-weight: 700; letter-spacing: -.06em; line-height: 1; }
.trv-round-media { overflow: hidden; border-radius: 999px; }
.trv-round-media img { height: 100%; width: 100%; object-fit: cover; }
.trv-room { display: flex; flex-direction: column; }
.trv-room-media { display: block; height: 300px; overflow: hidden; border-radius: 4px; }
.trv-room-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .9s cubic-bezier(.22,1,.36,1); }
.trv-room:hover .trv-room-media img { transform: scale(1.045); }
.trv-spec { display: inline-flex; gap: 6px; align-items: baseline; }
.trv-link { display: inline-flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.trv-link:hover { text-decoration: underline; text-underline-offset: 6px; }
.trv-title-pill { display: inline-block; width: 1.5em; height: .72em; margin: 0 .08em; border-radius: 999px; overflow: hidden; vertical-align: middle; }
.trv-title-pill img { width: 100%; height: 100%; object-fit: cover; }
.trv-header { background: #ffffff; border-bottom: 1px solid color-mix(in srgb, var(--t-text) 10%, transparent); }
.trv-wordmark { font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -.04em; }
.trv-navlink { font-size: 13px; font-weight: 600; letter-spacing: .02em; padding: 6px 0; background: none; border: 0; cursor: pointer; color: var(--t-text); }
.trv-navlink[aria-current="page"] { text-decoration: underline; text-underline-offset: 8px; text-decoration-thickness: 2px; }
.trv-mobile-link { font-size: 22px; font-weight: 700; padding: 10px 0; background: none; border: 0; color: var(--t-text); }
.trv-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--t-text) 22%, transparent); background: none; color: var(--t-text); cursor: pointer; }
.trv-iconbtn:hover { border-color: var(--t-text); }
.trv-footer a:hover { text-decoration: underline; }
.trv-pill-row { overflow: hidden; }
.trv-pill-track { display: flex; width: max-content; animation: trv-marquee 38s linear infinite; }
.trv-pill-track.is-reverse { animation-direction: reverse; }
.trv-pill-row:hover .trv-pill-track { animation-play-state: paused; }
.trv-feature-pill { flex: none; margin-right: 14px; padding: 16px 30px; border: 1px solid color-mix(in srgb, var(--t-text) 28%, transparent); border-radius: 999px; font-family: 'Manrope', sans-serif; font-size: 17px; font-weight: 600; white-space: nowrap; }
@keyframes trv-marquee { to { transform: translateX(-50%); } }
.trv-gallery { display: grid; grid-template-columns: 1.05fr .7fr 1.05fr; grid-template-rows: 170px 280px; gap: 16px; }
.trv-gallery > * { min-height: 0; height: 100%; overflow: hidden; }
.trv-gallery > * > button { display: block; width: 100%; height: 100%; overflow: hidden; }
.trv-gallery > *:nth-child(1) { grid-column: 1; grid-row: 1 / 3; }
.trv-gallery > *:nth-child(2) { grid-column: 2; grid-row: 1; border-radius: 999px 999px 0 0; }
.trv-gallery > *:nth-child(3) { grid-column: 3; grid-row: 1 / 3; }
.trv-gallery > *:nth-child(4) { grid-column: 2; grid-row: 2; border-radius: 0 0 999px 999px; }
.trv-gallery img { width: 100%; height: 100%; object-fit: cover; transition: transform .9s cubic-bezier(.22,1,.36,1); }
.trv-gallery button:hover img { transform: scale(1.055); }
.trv-cta { background: #121212; color: #fff; }
.trv-cta-disc { overflow: hidden; border-radius: 50%; aspect-ratio: 1; }
.trv-cta-disc img { width: 100%; height: 100%; object-fit: cover; }
.trv-review { border-top: 1px solid color-mix(in srgb, var(--t-text) 20%, transparent); padding-top: 24px; }
.trv-map-shell { overflow: hidden; border-top: 1px solid color-mix(in srgb, var(--t-text) 22%, transparent); padding-top: 28px; }
.trv-map-shell iframe { filter: saturate(.78) contrast(.96); background: #deddd7; }

@media (max-width: 767px) {
  .trv .tp-section { padding-top: 40px; padding-bottom: 40px; }
  .trv-hero { min-height: 0; }
  .trv-hero-title { font-size: clamp(50px, 16vw, 76px); max-width: 100%; }
  .trv-orbit-a { width: 128px; height: 128px; right: 0; top: -6px; }
  .trv-orbit-b, .trv-orbit-c, .trv-orbit-d { display: none; }
  .trv-room-media { height: 230px; }
  .trv-gallery { grid-template-columns: 1fr 1fr; grid-template-rows: 230px 180px; }
  .trv-gallery > * { grid-column: auto; grid-row: auto; border-radius: 4px !important; }
  .trv-gallery > *:nth-child(3) { grid-column: 1 / 3; }
}

@media (prefers-reduced-motion: reduce) {
  .trv-pill-track { animation: none; }
}
`;
