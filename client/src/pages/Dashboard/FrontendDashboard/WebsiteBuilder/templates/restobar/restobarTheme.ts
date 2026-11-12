export const RESTOBAR_CSS = String.raw`
@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Merriweather:ital,wght@0,400;0,600;0,700;0,800;1,700&display=swap");

.resto {
  --t-bg: #101519;
  --t-text: #f5f0e9;
  --t-accent: #c29a77;
  --t-accent-text: #15100b;
  --rb-bg: var(--t-bg, #101519);
  --rb-surface: var(--t-surface, #181e22);
  --rb-text: var(--t-text, #f5f0e9);
  --rb-muted: var(--t-muted, #c4bbb1);
  --rb-accent: var(--t-accent, #c29a77);
  --rb-ink: var(--t-accent-text, #15100b);
  --rb-line: var(--t-line, #746154);
  --rb-serif: "Merriweather", Georgia, serif;
  min-height: 100vh;
  background: var(--rb-bg);
  color: var(--rb-text);
  font: 16px/1.65 "DM Sans", system-ui, sans-serif;
}
.resto *, .resto *::before, .resto *::after { box-sizing: border-box; }
.resto :where(h1,h2,h3,p,figure,blockquote,dl,dd,ul) { margin: 0; }
.resto :where(h1,h2,h3) { font-family: var(--rb-serif); line-height: 1.18; overflow-wrap: anywhere; }
.resto h1, .resto h2 { font-size: clamp(2rem, 4.4vw, 4.25rem); letter-spacing: -.045em; font-weight: 700; }
.resto h3 { font-size: clamp(1.15rem, 2vw, 1.6rem); }
.resto :where(p, small) { overflow-wrap: anywhere; }
.resto :where(a,button) { color: inherit; }
.resto :where(button,input,select,textarea) { font: inherit; }
.resto button { cursor: pointer; }
.resto button:disabled { cursor: default; opacity: .6; }
.resto :where(button,a,input,select,textarea):focus-visible { outline: 2px solid var(--rb-accent); outline-offset: 4px; }
.resto img { display: block; width: 100%; object-fit: cover; }
.resto-cursor-smoke {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 90;
  pointer-events: none;
}
.resto-shell { width: min(1440px, calc(100% - 96px)); margin-inline: auto; }
.resto-section { padding-block: clamp(56px, 8vw, 124px); }
.resto-center { text-align: center; }
.resto-narrow { max-width: 680px; }
.resto-kicker { color: var(--rb-accent); font-family: var(--rb-serif); font-size: .94rem; font-style: italic; font-weight: 700; margin-bottom: 16px; }
.resto-button {
  display: inline-flex; justify-content: center; align-items: center; min-height: 48px;
  padding: 11px 25px; border: 1px solid var(--rb-accent); background: transparent;
  color: var(--rb-text); font: 700 .78rem/1.3 var(--rb-serif); text-align: center;
  text-transform: uppercase; text-decoration: none; transition: background .2s, color .2s;
}
.resto-button:hover { color: var(--rb-ink); background: var(--rb-accent); }
.resto-text-link { border: 0; border-bottom: 1px solid currentColor; padding: 0 0 4px; background: transparent; text-align: left; font-weight: 600; }
.resto-visually-hidden, .resto-skip:not(:focus) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.resto-skip:focus { position: absolute; z-index: 5; top: 8px; left: 8px; padding: 10px; color: var(--rb-ink); background: var(--rb-accent); }

.resto-header { background: var(--rb-bg); }
.resto-masthead { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,2fr) minmax(0,1fr); align-items: center; gap: 20px; min-height: 104px; }
.resto-location { grid-column: 1; grid-row: 1; display: flex; align-items: center; gap: 14px; text-decoration: none; min-width: 0; }
.resto-location > span:first-child { color: var(--rb-accent); font-size: 2.1rem; line-height: 1; }
.resto-location b { display: block; font: italic 700 .94rem var(--rb-serif); }
.resto-location small { display: block; color: var(--rb-muted); margin-top: 5px; }
.resto-wordmark, .resto-footer-brand { border: 0; background: none; font: 800 clamp(1.7rem,4vw,3.1rem)/1.05 var(--rb-serif); letter-spacing: -.07em; overflow-wrap: anywhere; }
.resto-wordmark { grid-column: 2; grid-row: 1; justify-self: center; text-align: center; min-width: 0; }
.resto-wordmark img, .resto-footer-brand img { width: auto; max-width: min(180px, 100%); height: 58px; object-fit: contain; }
.resto-header-book { grid-column: 3; grid-row: 1; justify-self: end; }
.resto-nav-bar { background: color-mix(in srgb, var(--rb-bg), #000 26%); }
.resto-nav-row { display: grid; grid-template-columns: minmax(60px,1fr) auto minmax(60px,1fr); align-items: center; gap: 16px; min-height: 60px; }
.resto-desktop-nav { display: flex; align-items: stretch; justify-content: center; flex-wrap: wrap; gap: 0 24px; }
.resto-desktop-nav button, .resto-drawer nav button { border: 0; background: none; font-family: var(--rb-serif); font-weight: 700; font-size: .88rem; padding: 12px 0; }
.resto-desktop-nav button:hover, .resto-desktop-nav [aria-current], .resto-drawer [aria-current] { color: var(--rb-accent); }
.resto-menu-toggle { justify-self: end; display: grid; place-items: center; border: 0; background: transparent; min-width: 44px; min-height: 44px; }
.resto-menu-toggle span { display: block; width: 23px; height: 2px; background: currentColor; box-shadow: 0 -7px currentColor, 0 7px currentColor; }
.resto-menu-toggle:hover { color: var(--rb-accent); }
.resto-socials { display: flex; flex-wrap: wrap; gap: 10px; }
.resto-socials a { display: grid; place-items: center; min-width: 24px; min-height: 32px; text-decoration: none; }
.resto-socials a:hover { color: var(--rb-accent); }
.resto-socials svg { width: 17px; height: 17px; }

.resto-hero { position: relative; isolation: isolate; background: #201a17; color: #fffaf4; }
.resto-hero-images, .resto-hero-images > div, .resto-hero-images img { position: absolute; inset: 0; width: 100%; height: 100%; }
.resto-hero-images { z-index: -2; }
.resto-hero-images > div { opacity: 0; transition: opacity .6s ease; }
.resto-hero-images > .is-current { opacity: 1; }
.resto-hero::after, .resto-booking::after, .resto-page-hero::after {
  content: ""; position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(180deg, rgba(12,14,14,.1), rgba(12,14,14,.26) 48%, rgba(12,14,14,.88));
}
.resto-hero-panels { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); min-height: clamp(560px, 51vw, 760px); }
.resto-hero-panels article {
  display: flex; flex-direction: column; justify-content: end; align-items: start; gap: 16px;
  padding: clamp(18px, 3.8vw, 62px); border-inline-end: 1px solid rgba(255,255,255,.25);
  transition: background .3s;
}
.resto-hero-panels article:last-child { border: 0; }
.resto-hero-panels article.is-current { background: rgba(0,0,0,.16); }
.resto-panel-toggle { padding: 0; border: 0; background: none; text-align: left; }
.resto-panel-toggle span { display: block; margin-bottom: 8px; font: 600 clamp(.8rem,1.45vw,1.15rem)/1.3 var(--rb-serif); }
.resto-panel-toggle strong { display: block; font: italic 700 clamp(1.35rem,2.3vw,2.45rem)/1.23 var(--rb-serif); overflow-wrap: anywhere; }
.resto-hero .resto-text-link { font-size: .88rem; }

.resto-split { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: clamp(28px,6vw,100px); align-items: center; }
.resto-split > div { min-width: 0; }
.resto-split h1 + p, .resto-split h2 + p, .resto-split h3 + p, .resto-split p + p { margin-top: 18px; }
.resto-split :where(.resto-button,.resto-contact-details) { margin-top: 24px; }
.resto-intro-images { position: relative; padding: 0 12% 11% 0; }
.resto-intro-images > img:first-child { aspect-ratio: 1.12; }
.resto-intro-images > img:nth-child(2) { position: absolute; right: 0; bottom: 0; width: 46%; aspect-ratio: .93; border: 7px solid var(--rb-bg); }
.resto-intro p:not(.resto-kicker), .resto-menu-item small, .resto-cards p, .resto-footer p { color: var(--rb-muted); }

.resto-menu-section { background: var(--rb-surface); }
.resto-menu-tabs { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 18px; margin-block: 36px 20px; }
.resto-menu-tabs button { min-height: 44px; padding: 8px 18px; border: 1px solid var(--rb-line); background: transparent; font-family: var(--rb-serif); font-size: .9rem; }
.resto-menu-tabs button[aria-pressed=true] { background: var(--rb-accent); border-color: var(--rb-accent); color: var(--rb-ink); }
.resto-menu-list { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 0 44px; padding: 0; margin-block: 24px 36px; list-style: none; }
.resto-menu-item { display: flex; gap: 14px; align-items: center; text-align: left; padding: 18px 0; width: 100%; height: 100%; border: 0; border-bottom: 1px solid var(--rb-line); background: transparent; }
.resto-menu-item img { flex: none; width: 76px; height: 76px; border-radius: 50%; }
.resto-menu-item span { flex: 1; min-width: 0; }
.resto-menu-item strong { display: block; font: 700 1rem/1.45 var(--rb-serif); overflow-wrap: anywhere; }
.resto-menu-item:hover strong, .resto-menu-item b, .resto-price { color: var(--rb-accent); }
.resto-menu-item small, .resto-menu-item em { display: block; margin-top: 4px; }
.resto-menu-item em { font-size: .8rem; }
.resto-menu-item b { flex: none; font-size: .88rem; }
.resto-empty { text-align: center; margin-block: 28px; }

.resto-booking, .resto-page-hero { position: relative; isolation: isolate; background: #191818; color: #fffaf4; }
.resto-booking > img, .resto-page-hero > img { position: absolute; inset: 0; height: 100%; z-index: -2; }
.resto-booking::after { background: rgba(12,14,14,.72); }
.resto-booking .resto-kicker, .resto-page-hero .resto-kicker { color: #e0b795; }
.resto-form { background: var(--rb-surface); color: var(--rb-text); border: 1px solid var(--rb-line); padding: clamp(20px, 3vw, 36px); }
.resto-form h2, .resto-dialog h2 { font-size: clamp(1.45rem,3vw,2.1rem); margin-bottom: 22px; }
.resto-hours-list { margin-top: 20px; }
.resto-hours-list > div { display: flex; align-items: baseline; justify-content: space-between; gap: 14px; padding: 9px 0; border-bottom: 1px solid var(--rb-line); }
.resto-hours-list dt { font: 700 .9rem var(--rb-serif); }
.resto-hours-list dd { text-align: right; }
.resto-hours-image { position: relative; }
.resto-hours-image img { aspect-ratio: 1.25; }
.resto-hours-image a { position: absolute; inset: auto auto 20px 20px; background: var(--rb-bg); }
.resto-gallery, .resto-cards, .resto-reviews { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: clamp(14px, 2.4vw, 32px); margin-top: 32px; }
.resto-gallery button, .resto-image-button, .resto-cards article > button, .resto-thumbnails button { width: 100%; padding: 0; border: 0; background: transparent; }
.resto-gallery img, .resto-cards img { aspect-ratio: 1.25; }
.resto-gallery button:hover img { filter: brightness(.83); }
.resto-reviews figure { padding: 22px; border: 1px solid var(--rb-line); }
.resto-reviews figcaption { margin-top: 12px; color: var(--rb-accent); font-weight: 700; }
.resto-reviews + .resto-button { margin-top: 28px; }
.resto-home-contact { border-top: 1px solid var(--rb-line); }
.resto-home-contact p, .resto-home-contact .resto-button { margin-top: 16px; }

.resto-footer { background: var(--rb-surface); border-top: 1px solid var(--rb-line); }
.resto-footer-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 28px; padding-block: 52px; }
.resto-footer-brand { text-align: left; padding: 0; font-size: clamp(1.6rem,3vw,2.3rem); margin-bottom: 16px; }
.resto-footer h3 { font-size: 1rem; margin-bottom: 14px; }
.resto-footer-grid > div > a { display: block; overflow-wrap: anywhere; }
.resto-footer .resto-hours-list { margin-top: 0; font-size: .85rem; }
.resto-footer .resto-hours-list dt { font-size: .75rem; }
.resto-copyright { padding: 19px 0; border-top: 1px solid var(--rb-line); font-size: .875rem; }
.resto-newsletter { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding-block: 34px; border-bottom: 1px solid var(--rb-line); }
.resto-newsletter h2 { font-size: clamp(1.5rem, 3vw, 2.5rem); }

.resto-page-hero { padding-block: clamp(85px,12vw,170px); text-align: center; }
.resto-page-hero::after { background: rgba(12,14,14,.66); }
.resto-page-intro { margin: 18px auto 0; max-width: 60ch; }
.resto-cards article { background: var(--rb-surface); border: 1px solid var(--rb-line); }
.resto-cards article > div, .resto-cards article > button > span { display: block; padding: 20px; }
.resto-cards h2 { font-size: 1.55rem; }
.resto-cards p { margin-block: 10px; }
.resto-cards .resto-button { margin-top: 14px; }
.resto-menu-card { position: relative; }
.resto-menu-card .resto-button::after { content: ""; position: absolute; inset: 0; }
.resto-menu-card .resto-button:focus-visible::after { outline: 2px solid var(--rb-accent); outline-offset: 3px; }
.resto-menu-card:hover .resto-button { color: var(--rb-ink); background: var(--rb-accent); }
.resto-item-detail, .resto-related { margin-top: 32px; }
.resto-item-detail img { aspect-ratio: 1.25; }
.resto-thumbnails { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; margin-top: 10px; }
.resto-price { display: block; font: 700 1.35rem var(--rb-serif); margin-top: 16px; }
.resto-chips { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin-top: 16px; }
.resto-chips li { padding: 4px 12px; border: 1px solid var(--rb-line); font-size: .83rem; }
.resto-narrative { margin-top: 24px; }
.resto-narrative p { white-space: pre-line; }
.resto-contact-details { display: grid; gap: 8px; font-style: normal; }
.resto-map { width: 100%; height: min(440px, 64vh); border: 0; margin-top: 36px; }
.resto-job-list { padding: 0; list-style: none; margin-bottom: 28px; }
.resto-job-list li { padding-block: 16px; border-bottom: 1px solid var(--rb-line); }
.resto-job-list small { display: block; }
.resto-job-list ~ .resto-button { margin-top: 20px; }

.resto-dialog {
  position: fixed; inset: 0; margin: auto; width: min(570px, calc(100% - 28px));
  max-height: calc(100dvh - 28px); padding: 0; overflow: auto;
  background: var(--rb-surface); color: var(--rb-text); border: 1px solid var(--rb-line);
}
.resto-dialog::backdrop { background: rgba(0,0,0,.75); }
.resto-dialog-inner { position: relative; padding: clamp(24px, 4vw, 46px); }
.resto-dialog-close { position: absolute; top: 6px; right: 8px; min-width: 44px; min-height: 44px; border: 0; background: none; font-size: 1.65rem; }
.resto-drawer {
  margin: 0 0 0 auto;
  height: 100dvh;
  max-height: none;
  width: min(400px, 100%);
  border: 0;
  background: var(--rb-bg);
  overscroll-behavior: contain;
  transform: translateX(100%);
  transition: transform .3s ease, display .3s allow-discrete, overlay .3s allow-discrete;
}
.resto-drawer[open] { transform: translateX(0); }
.resto-drawer::backdrop {
  background: rgba(0,0,0,.48);
  opacity: 0;
  transition: opacity .3s ease, display .3s allow-discrete, overlay .3s allow-discrete;
}
.resto-drawer[open]::backdrop { opacity: 1; }
.resto-drawer:not([open]), .resto-drawer:not([open])::backdrop { pointer-events: none; }
@starting-style {
  .resto-drawer[open] { transform: translateX(100%); }
  .resto-drawer[open]::backdrop { opacity: 0; }
}
.resto-drawer-inner { min-height: 100%; padding: clamp(22px, 6vw, 46px); }
.resto-drawer-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 24px; }
.resto-drawer-brand { min-width: 0; padding: 0; border: 0; background: none; text-align: left; overflow-wrap: anywhere; font: 800 clamp(1.7rem, 6vw, 2.6rem)/1.08 var(--rb-serif); letter-spacing: -.07em; }
.resto-drawer-brand img { width: auto; max-width: 100%; max-height: 52px; object-fit: contain; }
.resto-drawer .resto-dialog-close { position: static; flex: none; }
.resto-drawer nav { display: grid; text-align: left; margin-bottom: 24px; }
.resto-drawer nav button { min-height: 44px; text-align: left; font-size: 1rem; border-bottom: 1px solid color-mix(in srgb, var(--rb-line) 55%, transparent); }
.resto-drawer nav button:hover, .resto-drawer .resto-dialog-close:hover { color: var(--rb-accent); }
.resto-drawer-details { margin-top: 28px; }
.resto-drawer .resto-socials { display: grid; gap: 4px; }
.resto-drawer .resto-socials a { display: flex; gap: 14px; align-items: center; min-height: 44px; }
.resto-drawer-contact { display: grid; gap: 4px; margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--rb-line); font-style: normal; overflow-wrap: anywhere; }
.resto-drawer-contact a { text-decoration: none; }
.resto-drawer-contact a:hover { color: var(--rb-accent); }
.resto-drawer-contact a[href^="tel:"] { font-family: var(--rb-serif); font-weight: 700; font-style: italic; }
.resto .tp-label { display: block; font-weight: 600; margin-bottom: 5px; }
.resto .tp-input { width: 100%; min-height: 42px; padding: 8px 10px; background: var(--rb-bg); color: var(--rb-text); border: 1px solid var(--rb-line); }
.resto .tp-btn { display: inline-flex; justify-content: center; align-items: center; gap: 8px; padding: 10px 16px; min-height: 42px; border: 1px solid var(--rb-accent); background: var(--rb-accent); color: var(--rb-ink); font-weight: 700; }
.resto .tp-btn:hover { background: var(--rb-bg); color: var(--rb-text); }
.resto .tp-soft { background: var(--rb-bg); }
.resto .tp-muted { color: var(--rb-muted); }
.resto .tp-card { background: var(--rb-surface); border: 1px solid var(--rb-line); }
.resto .tp-eyebrow { color: var(--rb-accent); font-style: italic; }
.resto .tp-h3 { font: 700 clamp(1.25rem,3vw,1.7rem)/1.25 var(--rb-serif); }
.resto img.object-contain { width: auto; object-fit: contain; }

@media (max-width: 1040px) {
  .resto-shell { width: min(100% - 52px, 1440px); }
  .resto-desktop-nav { gap: 0 14px; }
  .resto-hero-panels article { padding-inline: 24px; }
  .resto-footer-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (max-width: 800px) {
  .resto-desktop-nav, .resto-location { display: none; }
  .resto-masthead { min-height: 80px; grid-template-columns: minmax(0, 1fr) auto; }
  .resto-wordmark { grid-column: 1; justify-self: start; text-align: left; }
  .resto-header-book { grid-column: 2; }
  .resto-nav-row { grid-template-columns: 1fr auto; min-height: 48px; }
  .resto-hero-panels { grid-template-columns: repeat(2,minmax(0,1fr)); min-height: 530px; }
  .resto-hero-panels article { min-height: 200px; padding: 24px; border-bottom: 1px solid rgba(255,255,255,.25); }
  .resto-hero::after { background: rgba(12,14,14,.58); }
  .resto-split, .resto-menu-list { grid-template-columns: 1fr; }
  .resto-intro-images { max-width: 650px; }
  .resto-gallery, .resto-cards, .resto-reviews { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (max-width: 480px) {
  .resto-shell { width: calc(100% - 32px); }
  .resto-hero-panels article { padding: 18px 14px; gap: 10px; }
  .resto-menu-item { gap: 9px; }
  .resto-menu-item img { width: 52px; height: 52px; }
  .resto-gallery, .resto-cards, .resto-reviews, .resto-footer-grid { grid-template-columns: 1fr; }
  .resto-form form.grid, .resto-dialog form.grid { grid-template-columns: minmax(0,1fr); }
  .resto-form form.grid > *, .resto-dialog form.grid > * { grid-column: 1 / -1; }
}
@media (prefers-reduced-motion: reduce) {
  .resto-drawer::backdrop { transition: none; }
  .resto *, .resto *::before, .resto *::after { transition: none !important; }
}
`;
