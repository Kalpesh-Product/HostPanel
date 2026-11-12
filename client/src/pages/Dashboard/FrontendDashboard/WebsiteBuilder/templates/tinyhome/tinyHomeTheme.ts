export const TINY_HOME_CSS = String.raw`
@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Spinnaker&display=swap");

.tinyhome {
  --t-bg: #fff;
  --t-text: #272724;
  --t-accent: #353932;
  --t-accent-text: #fff;
  --th-surface: var(--t-surface, #f3f2ed);
  --th-line: var(--t-line, #d8d7cf);
  --th-muted: var(--t-muted, #65665f);
  --th-display: "Spinnaker", "DM Sans", sans-serif;
  min-height: 100vh;
  color: var(--t-text);
  background: var(--t-bg);
  font: 16px/1.7 "DM Sans", system-ui, sans-serif;
}
.tinyhome *, .tinyhome *::before, .tinyhome *::after { box-sizing: border-box; }
.tinyhome :where(h1,h2,h3,p,figure,blockquote,dl,dd,ul) { margin: 0; }
.tinyhome :where(h1,h2,h3) { font-family: var(--th-display); line-height: 1.2; overflow-wrap: anywhere; }
.tinyhome h1 { font-size: clamp(2.5rem, 5.5vw, 5.1rem); font-weight: 400; }
.tinyhome h2 { font-size: clamp(1.8rem, 3.6vw, 3.55rem); font-weight: 400; }
.tinyhome h3 { font-size: clamp(1.15rem, 2vw, 1.6rem); }
.tinyhome :where(a,button) { color: inherit; }
.tinyhome :where(button,input,textarea,select) { font: inherit; }
.tinyhome button { cursor: pointer; }
.tinyhome button:disabled { cursor: default; opacity: .55; }
.tinyhome :where(a,button,input,textarea,select):focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
.tinyhome img { display: block; max-width: 100%; }
.tinyhome img.object-contain { width: auto; object-fit: contain; }
.tinyhome :where(p,address,a) { overflow-wrap: anywhere; }
.tinyhome-shell { width: min(1250px, calc(100% - 96px)); margin-inline: auto; }
.tinyhome-section { padding-block: clamp(64px, 9vw, 140px); }
.tinyhome-surface { background: var(--th-surface); }
.tinyhome-center { text-align: center; }
.tinyhome-narrow { max-width: 740px; }
.tinyhome-kicker { color: var(--th-muted); font-weight: 700; margin-bottom: 14px; }
.tinyhome-visually-hidden, .tinyhome-skip:not(:focus) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.tinyhome-skip:focus { position: absolute; top: 8px; left: 8px; z-index: 5; padding: 8px 15px; background: var(--t-bg); }
.tinyhome-button {
  display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 11px 22px;
  border: 1px solid var(--t-accent); background: var(--t-accent); color: var(--t-accent-text);
  font-size: .84rem; font-weight: 700; line-height: 1.4; text-align: center; text-transform: uppercase; transition: opacity .2s;
}
.tinyhome-button:hover { opacity: .85; }
.tinyhome-button-light { background: #fff; color: #262725; border-color: #fff; }
.tinyhome-text-link { border: 0; border-bottom: 1px solid currentColor; padding: 0 0 3px; background: transparent; text-align: left; }

.tinyhome-header { position: relative; background: var(--t-bg); border-bottom: 1px solid var(--th-line); }
.tinyhome-nav-row { display: flex; justify-content: space-between; align-items: center; min-height: 76px; gap: 24px; }
.tinyhome-brand {
  padding: 0; border: 0; background: transparent; text-align: left;
  font: 700 clamp(1.1rem, 2vw, 1.6rem)/1.15 var(--th-display); text-transform: uppercase; overflow-wrap: anywhere;
}
.tinyhome-brand img { width: auto; max-height: 48px; object-fit: contain; }
.tinyhome-desktop-nav, .tinyhome-header-actions, .tinyhome-socials { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 18px; }
.tinyhome-desktop-nav { justify-content: center; }
.tinyhome-header-actions { justify-content: flex-end; flex-wrap: nowrap; }
.tinyhome-desktop-nav button, .tinyhome-drawer nav button { padding: 8px 0; border: 0; background: transparent; font-size: .93rem; }
.tinyhome-desktop-nav button[aria-current], .tinyhome-drawer nav button[aria-current] { text-decoration: underline; text-underline-offset: 5px; }
.tinyhome-socials a { display: grid; place-items: center; min-width: 24px; min-height: 36px; text-decoration: none; }
.tinyhome-socials svg { width: 16px; height: 16px; }
.tinyhome-menu-toggle { display: none; place-items: center; width: 44px; height: 44px; flex: none; border: 0; background: transparent; }
.tinyhome-menu-toggle span { width: 22px; height: 2px; background: currentColor; box-shadow: 0 -7px currentColor, 0 7px currentColor; }

.tinyhome-hero { position: relative; isolation: isolate; min-height: min(780px, 88svh); background: #41423f; display: flex; color: #fff; }
.tinyhome-hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; }
.tinyhome-hero-panel {
  width: 43%; display: flex; align-items: center;
  background: rgba(38,39,37,.88); padding: clamp(40px, 7.5vw, 112px) clamp(26px, 5.7vw, 92px);
}
.tinyhome-hero-copy { width: 100%; max-width: 500px; }
.tinyhome-hero-copy::before { content: ""; display: block; width: 1px; height: clamp(40px, 8vw, 92px); background: rgba(255,255,255,.75); margin: 0 0 36px 30px; }
.tinyhome-hero .tinyhome-kicker { color: #fff; margin-bottom: 26px; }
.tinyhome-hero h1 { font-size: clamp(2.3rem, 4.5vw, 4.65rem); text-transform: uppercase; }
.tinyhome-hero h1 + p { margin-block: clamp(18px, 3vw, 42px); max-width: 40ch; }
.tinyhome-hero .tinyhome-button { min-width: min(190px, 100%); }

.tinyhome-split { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: clamp(26px, 7vw, 110px); align-items: center; }
.tinyhome-split > div { min-width: 0; }
.tinyhome-split > img { width: 100%; aspect-ratio: 1.14; object-fit: cover; }
.tinyhome-welcome > img { aspect-ratio: .91; max-height: 580px; }
.tinyhome-split :where(h1,h2,h3) + p, .tinyhome-split p + p { margin-top: 16px; }
.tinyhome-split .tinyhome-button, .tinyhome-home-contact .tinyhome-button { margin-top: 24px; }
.tinyhome-split p:not(.tinyhome-kicker,.tinyhome-price) { color: var(--th-muted); }
.tinyhome-photo-strip { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%, 260px),1fr)); gap: 2px; }
.tinyhome-photo-strip img { width: 100%; aspect-ratio: 1; object-fit: cover; }
.tinyhome-photo-strip button, .tinyhome-gallery button, .tinyhome-image-button, .tinyhome-thumbnails button { width: 100%; padding: 0; border: 0; background: transparent; }
.tinyhome-photo-strip button:hover img, .tinyhome-gallery button:hover img { filter: brightness(.84); }
.tinyhome-amenities { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px 24px; margin-top: 24px; padding: 0; list-style: none; }
.tinyhome-amenities li { padding: 8px 0; border-bottom: 1px solid var(--th-line); overflow-wrap: anywhere; }
.tinyhome-amenities li::before { content: "✓"; display: inline-block; margin-right: 8px; color: var(--t-accent); }
.tinyhome-quote { background: var(--t-accent); color: var(--t-accent-text); }
.tinyhome-quote .tinyhome-kicker { color: inherit; opacity: .8; }
.tinyhome-quote blockquote { font: 400 clamp(1.5rem, 3.4vw, 2.75rem)/1.4 var(--th-display); }
.tinyhome-quote figcaption, .tinyhome-reviews figcaption { margin-top: 18px; font-weight: 700; }
.tinyhome-quote .tinyhome-button { border-color: currentColor; margin-top: 24px; }
.tinyhome-price { font: 700 1.15rem/1.4 var(--th-display); }
.tinyhome-home-contact p { margin-top: 14px; }
.tinyhome-nearby { background: var(--t-bg); border-bottom: 1px solid var(--th-line); }
.tinyhome-nearby h2 { margin-bottom: 32px; }

.tinyhome-page-hero { position: relative; isolation: isolate; padding-block: clamp(80px,12vw,165px); background: #343630; color: #fff; text-align: center; }
.tinyhome-page-hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
.tinyhome-page-hero::after { content: ""; position: absolute; inset: 0; background: rgba(24,27,22,.57); z-index: -1; }
.tinyhome-page-hero .tinyhome-kicker { color: inherit; }
.tinyhome-page-intro { margin: 18px auto 0; max-width: 62ch; }
.tinyhome-cards, .tinyhome-gallery, .tinyhome-reviews { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: clamp(16px, 2.8vw, 38px); }
.tinyhome-cards article { position: relative; background: var(--th-surface); }
.tinyhome-cards article img, .tinyhome-gallery img { width: 100%; aspect-ratio: 1.33; object-fit: cover; }
.tinyhome-cards article > div { padding: 22px; }
.tinyhome-cards h2 { font-size: 1.55rem; }
.tinyhome-cards p + h2, .tinyhome-cards :where(h2,h3) + p, .tinyhome-cards p + p { margin-top: 10px; }
.tinyhome-card-action { margin-top: 16px; padding: 0; border: 0; border-bottom: 1px solid currentColor; background: transparent; font-weight: 700; }
.tinyhome-card-action::after { content: ""; position: absolute; inset: 0; }
.tinyhome-card-action:focus-visible::after { outline: 2px solid currentColor; outline-offset: 4px; }
.tinyhome-cards article:hover .tinyhome-card-action { text-decoration: underline; text-underline-offset: 4px; }
.tinyhome-reviews figure { padding: 24px; background: var(--th-surface); }
.tinyhome-reviews, .tinyhome-reviews + .tinyhome-button { margin-top: 28px; }
.tinyhome-related { margin-top: clamp(32px,6vw,72px); }
.tinyhome-related > h2 { margin-bottom: 24px; }
.tinyhome-item-detail { margin-top: 24px; }
.tinyhome-item-detail img { width: 100%; aspect-ratio: 1.3; object-fit: cover; }
.tinyhome-thumbnails { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; margin-top: 8px; }
.tinyhome-narrative { margin-top: 22px; }
.tinyhome-narrative p { white-space: pre-line; }
.tinyhome-contact-details, .tinyhome-footer address { display: grid; gap: 6px; font-style: normal; margin-top: 14px; }
.tinyhome-map { width: 100%; height: min(440px, 64vh); margin-top: 32px; border: 0; }
.tinyhome-job-list { padding: 0; list-style: none; margin-bottom: 24px; }
.tinyhome-job-list li { padding-block: 12px; border-bottom: 1px solid var(--th-line); }
.tinyhome-job-list small { display: block; }
.tinyhome-job-list ~ .tinyhome-button { margin-top: 18px; }

.tinyhome-footer { background: var(--th-surface); border-top: 1px solid var(--th-line); }
.tinyhome-footer-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 28px; padding-block: 54px; align-items: start; }
.tinyhome-footer-grid :where(address,dl) { margin: 0; }
.tinyhome-footer .tinyhome-socials { margin-top: 14px; }
.tinyhome-hours-list { margin-top: 18px; }
.tinyhome-hours-list > div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--th-line); }
.tinyhome-hours-list dd { text-align: right; }
.tinyhome-copyright { border-top: 1px solid var(--th-line); padding: 18px 0; color: var(--th-muted); font-size: .88rem; }

.tinyhome-dialog {
  position: fixed; inset: 0; margin: auto; width: min(590px,calc(100% - 24px)); max-height: calc(100dvh - 24px); overflow: auto;
  padding: 0; border: 1px solid var(--th-line); background: var(--t-bg); color: var(--t-text);
}
.tinyhome-dialog::backdrop { background: rgba(22,24,20,.58); }
.tinyhome-dialog-inner { position: relative; padding: clamp(24px,4vw,44px); }
.tinyhome-dialog-close { position: absolute; top: 6px; right: 8px; width: 44px; height: 44px; background: transparent; border: 0; font-size: 1.75rem; }
.tinyhome-dialog h2, .tinyhome-form h2 { font-size: clamp(1.5rem,3vw,2.15rem); margin-bottom: 20px; }
.tinyhome-drawer { width: min(390px,100%); max-width: 100%; height: 100dvh; max-height: none; margin: 0 0 0 auto; border: 0; }
.tinyhome-drawer nav { display: grid; gap: 2px; margin-block: 22px; }
.tinyhome-drawer nav button { min-height: 44px; border-bottom: 1px solid var(--th-line); text-align: left; }
.tinyhome-drawer .tinyhome-socials { margin-top: 16px; }
.tinyhome-form { padding: clamp(20px,3.4vw,38px); border: 1px solid var(--th-line); background: var(--t-bg); min-width: 0; }
.tinyhome-form > form > div, .tinyhome-dialog form > div { min-width: 0; }
.tinyhome .tp-label { display: block; font-weight: 600; margin-bottom: 5px; }
.tinyhome .tp-input { width: 100%; min-height: 42px; padding: 8px 10px; background: var(--t-bg); color: var(--t-text); border: 1px solid var(--th-line); }
.tinyhome .tp-btn, .tinyhome .tp-tab { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; padding: 8px 14px; border: 1px solid var(--t-accent); font-weight: 700; }
.tinyhome .tp-btn, .tinyhome .tp-tab[aria-pressed=true] { background: var(--t-accent); color: var(--t-accent-text); }
.tinyhome .tp-tab { background: var(--t-bg); color: var(--t-text); }
.tinyhome .tp-soft, .tinyhome .tp-card { background: var(--th-surface); }
.tinyhome .tp-muted { color: var(--th-muted); }

@media (max-width: 1100px) {
  .tinyhome-shell { width: calc(100% - 52px); }
  .tinyhome-header-actions > .tinyhome-socials, .tinyhome-desktop-nav { display: none; }
  .tinyhome-menu-toggle { display: grid; }
}
@media (max-width: 760px) {
  .tinyhome-shell { width: calc(100% - 36px); }
  .tinyhome-nav-row { min-height: 66px; gap: 8px; }
  .tinyhome-header-actions { gap: 6px; }
  .tinyhome-header-actions .tinyhome-button { padding: 7px 11px; font-size: .72rem; }
  .tinyhome-hero { min-height: 0; display: block; padding-top: clamp(220px, 52vw, 385px); }
  .tinyhome-hero > img { height: clamp(220px, 52vw, 385px); }
  .tinyhome-hero-panel { width: 100%; padding: 34px 18px 42px; }
  .tinyhome-hero-copy::before { height: 30px; margin: 0 0 22px; }
  .tinyhome-split { grid-template-columns: minmax(0,1fr); }
  .tinyhome-welcome > img { aspect-ratio: 1.2; }
  .tinyhome-photo-strip { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .tinyhome-gallery, .tinyhome-cards, .tinyhome-reviews, .tinyhome-footer-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (max-width: 480px) {
  .tinyhome-gallery, .tinyhome-cards, .tinyhome-reviews, .tinyhome-footer-grid, .tinyhome-amenities { grid-template-columns: minmax(0,1fr); }
  .tinyhome-form form.grid, .tinyhome-dialog form.grid { grid-template-columns: minmax(0,1fr); }
  .tinyhome-form form.grid > *, .tinyhome-dialog form.grid > * { grid-column: 1 / -1; }
}
@media (prefers-reduced-motion: reduce) {
  .tinyhome-button { transition: none; }
}
`;
