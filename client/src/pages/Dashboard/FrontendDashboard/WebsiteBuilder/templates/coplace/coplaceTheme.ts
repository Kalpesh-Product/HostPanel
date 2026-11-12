export const COPLACE_CSS = String.raw`
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Raleway:wght@500;600;700;800&display=swap");

.coplace {
  --t-bg: #fff;
  --t-text: #10292d;
  --t-accent: #0e3036;
  --t-accent-text: #fff;
  --cp-surface: var(--t-surface, #edf8fa);
  --cp-line: var(--t-line, #d2e5e7);
  --cp-muted: var(--t-muted, #4b6266);
  --cp-mint: #28c49a;
  --cp-display: "Raleway", "Manrope", sans-serif;
  min-height: 100vh;
  color: var(--t-text);
  background: var(--t-bg);
  font: 16px/1.7 "Manrope", system-ui, sans-serif;
}
.coplace *, .coplace *::before, .coplace *::after { box-sizing: border-box; }
.coplace :where(h1,h2,h3,p,figure,blockquote,dl,dd,ul) { margin: 0; }
.coplace :where(h1,h2,h3) { font-family: var(--cp-display); line-height: 1.2; overflow-wrap: anywhere; }
.coplace h1 { font-size: clamp(2.5rem, 5.5vw, 5.1rem); font-weight: 750; }
.coplace h2 { font-size: clamp(1.8rem, 3.6vw, 3.55rem); font-weight: 750; }
.coplace h3 { font-size: clamp(1.15rem, 2vw, 1.6rem); }
.coplace :where(a,button) { color: inherit; }
.coplace :where(button,input,textarea,select) { font: inherit; }
.coplace button { cursor: pointer; }
.coplace button:disabled { cursor: default; opacity: .55; }
.coplace :where(a,button,input,textarea,select):focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
.coplace img { display: block; max-width: 100%; }
.coplace img.object-contain { width: auto; object-fit: contain; }
.coplace :where(p,address,a) { overflow-wrap: anywhere; }
.coplace-shell { width: min(1250px, calc(100% - 64px)); margin-inline: auto; }
.coplace-section { padding-block: clamp(52px, 7vw, 104px); }
.coplace-surface { background: var(--cp-surface); }
.coplace-center { text-align: center; }
.coplace-narrow { max-width: 740px; }
.coplace-kicker { color: var(--cp-muted); font-weight: 700; margin-bottom: 14px; }
.coplace-visually-hidden, .coplace-skip:not(:focus) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.coplace-skip:focus { position: absolute; top: 8px; left: 8px; z-index: 5; padding: 8px 15px; background: var(--t-bg); }
.coplace-button {
  display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 11px 22px;
  border: 1px solid var(--t-accent); border-radius: 100px; background: var(--t-accent); color: var(--t-accent-text);
  font-size: .84rem; font-weight: 700; line-height: 1.4; text-align: center; transition: opacity .2s;
}
.coplace-button:hover { opacity: .85; }
.coplace-button-outline { background: var(--t-bg); color: var(--t-text); }
.coplace-text-link { border: 0; border-bottom: 1px solid currentColor; padding: 0 0 3px; background: transparent; text-align: left; }

.coplace-header { position: relative; background: var(--t-bg); border-bottom: 1px solid var(--cp-line); }
.coplace-nav-row { display: flex; justify-content: space-between; align-items: center; min-height: 105px; gap: 24px; }
.coplace-brand {
  padding: 0; border: 0; background: transparent; text-align: left;
  font: 700 clamp(1.1rem, 2vw, 1.6rem)/1.15 var(--cp-display); overflow-wrap: anywhere; display: inline-flex; align-items: center; gap: 8px;
}
.coplace-brand img { width: auto; max-height: 48px; object-fit: contain; }
.coplace-desktop-nav, .coplace-header-actions, .coplace-socials { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 18px; }
.coplace-desktop-nav { justify-content: center; }
.coplace-header-actions { justify-content: flex-end; flex-wrap: nowrap; }
.coplace-desktop-nav button, .coplace-drawer nav button { padding: 8px 0; border: 0; background: transparent; font-size: .93rem; }
.coplace-desktop-nav button[aria-current], .coplace-drawer nav button[aria-current] { text-decoration: underline; text-underline-offset: 5px; }
.coplace-socials a { display: grid; place-items: center; min-width: 24px; min-height: 36px; text-decoration: none; }
.coplace-socials svg { width: 16px; height: 16px; }
.coplace-menu-toggle { display: none; place-items: center; width: 44px; height: 44px; flex: none; border: 0; background: transparent; }
.coplace-menu-toggle span { width: 22px; height: 2px; background: currentColor; box-shadow: 0 -7px currentColor, 0 7px currentColor; }

.coplace-utility { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--cp-line); font-size: .82rem; color: var(--cp-muted); }
.coplace-utility > div:last-child { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.coplace-utility a, .coplace-hero-contact a { text-decoration: none; }
.coplace-mark { width: 24px; height: 24px; flex: none; border-radius: 9px; background: var(--cp-mint); box-shadow: inset 0 0 0 5px var(--t-accent); transform: rotate(45deg); }
.coplace-hero { background: var(--cp-surface); padding-block: clamp(52px, 6vw, 90px); }
.coplace-hero-grid { display: grid; grid-template-columns: minmax(0,1.22fr) minmax(0,1fr); align-items: center; gap: clamp(30px,5vw,80px); }
.coplace-hero h1 { font-size: clamp(2.45rem,4.2vw,4.5rem); letter-spacing: -.035em; }
.coplace-hero h1 mark { background: linear-gradient(transparent 69%, var(--cp-mint) 69%); color: inherit; }
.coplace-hero h1 + p { margin-top: 22px; max-width: 60ch; color: var(--cp-muted); }
.coplace-actions { display: flex; flex-wrap: wrap; gap: 12px 16px; margin-top: 22px; }
.coplace-hero-contact { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 16px; border-top: 1px solid var(--cp-line); margin-top: 32px; padding-top: 22px; font-size: .92rem; }
.coplace-hero-contact button { border: 0; background: var(--cp-mint); color: #082d25; font-weight: 700; padding: 7px 16px; border-radius: 99px; }
.coplace-orbit { position: relative; margin: 10px auto; width: min(100%, 560px); aspect-ratio: 1; }
.coplace-orbit img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.coplace-orbit span { position: absolute; left: 50%; transform: translateX(-50%); display: grid; place-items: center; width: clamp(42px,5vw,62px); aspect-ratio: 1; border-radius: 50%; background: var(--cp-mint); color: #082d25; font-size: 1.45rem; }
.coplace-orbit span:first-of-type { top: -20px; }
.coplace-orbit span:last-of-type { bottom: -20px; background: var(--t-accent); color: var(--t-accent-text); }
.coplace-trust { padding-block: 52px 28px; }
.coplace-trust h2 { font-size: 1.35rem; }
.coplace-trust > div { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-evenly; gap: 18px 28px; margin-top: 26px; color: var(--cp-muted); }
.coplace-trust img { width: 115px; height: 42px; object-fit: contain; }
.coplace-highlights { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 18px; margin-top: 32px; }
.coplace-highlights article { background: var(--cp-surface); border-radius: 20px; padding: clamp(20px,3vw,34px); }
.coplace-highlights article > span { display: grid; place-items: center; width: 44px; aspect-ratio: 1; border-radius: 50%; background: var(--cp-mint); color: #082d25; margin-bottom: 14px; }
.coplace-highlights h2 { font-size: 1.28rem; }
.coplace-highlights p, .coplace-section-head > p:not(.coplace-kicker) { color: var(--cp-muted); margin-top: 8px; }
.coplace-section-head { margin-bottom: clamp(22px,4vw,44px); }
.coplace-team img { object-position: center 30%; }

.coplace-split { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: clamp(26px, 7vw, 110px); align-items: center; }
.coplace-split > div { min-width: 0; }
.coplace-split > img { width: 100%; aspect-ratio: 1.14; object-fit: cover; border-radius: 28px; }
.coplace-split :where(h1,h2,h3) + p, .coplace-split p + p { margin-top: 16px; }
.coplace-split .coplace-button, .coplace-home-contact .coplace-button { margin-top: 24px; }
.coplace-split p:not(.coplace-kicker,.coplace-price) { color: var(--cp-muted); }
.coplace-gallery button, .coplace-image-button, .coplace-thumbnails button { width: 100%; padding: 0; border: 0; background: transparent; }
.coplace-gallery button:hover img { filter: brightness(.84); }
.coplace-amenities { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px 24px; margin-top: 24px; padding: 0; list-style: none; }
.coplace-amenities li { padding: 8px 0; border-bottom: 1px solid var(--cp-line); overflow-wrap: anywhere; }
.coplace-amenities li::before { content: "✓"; display: inline-block; margin-right: 8px; color: var(--t-accent); }
.coplace-price { font: 700 1.15rem/1.4 var(--cp-display); }
.coplace-home-contact p { margin-top: 14px; }

.coplace-page-hero { position: relative; isolation: isolate; padding-block: clamp(80px,12vw,165px); background: #102f36; color: #fff; text-align: center; }
.coplace-page-hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
.coplace-page-hero::after { content: ""; position: absolute; inset: 0; background: rgba(24,27,22,.57); z-index: -1; }
.coplace-page-hero .coplace-kicker { color: inherit; }
.coplace-page-intro { margin: 18px auto 0; max-width: 62ch; }
.coplace-cards, .coplace-gallery, .coplace-reviews { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: clamp(16px, 2.8vw, 38px); }
.coplace-cards article { position: relative; background: var(--cp-surface); border: 1px solid var(--cp-line); border-radius: 20px; }
.coplace-cards article img, .coplace-gallery img { width: 100%; aspect-ratio: 1.33; object-fit: cover; border-radius: 18px 18px 0 0; }
.coplace-cards article > div { padding: 22px; }
.coplace-cards h2 { font-size: 1.55rem; }
.coplace-cards p + h2, .coplace-cards :where(h2,h3) + p, .coplace-cards p + p { margin-top: 10px; }
.coplace-card-action { margin-top: 16px; padding: 0; border: 0; border-bottom: 1px solid currentColor; background: transparent; font-weight: 700; }
.coplace-card-action::after { content: ""; position: absolute; inset: 0; }
.coplace-card-action:focus-visible::after { outline: 2px solid currentColor; outline-offset: 4px; }
.coplace-cards article:hover .coplace-card-action { text-decoration: underline; text-underline-offset: 4px; }
.coplace-reviews figure { padding: 24px; background: var(--cp-surface); }
.coplace-reviews, .coplace-reviews + .coplace-button { margin-top: 28px; }
.coplace-related { margin-top: clamp(32px,6vw,72px); }
.coplace-related > h2 { margin-bottom: 24px; }
.coplace-item-detail { margin-top: 24px; }
.coplace-item-detail img { width: 100%; aspect-ratio: 1.3; object-fit: cover; }
.coplace-thumbnails { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; margin-top: 8px; }
.coplace-narrative { margin-top: 22px; }
.coplace-narrative p { white-space: pre-line; }
.coplace-contact-details, .coplace-footer address { display: grid; gap: 6px; font-style: normal; margin-top: 14px; }
.coplace-map { width: 100%; height: min(440px, 64vh); margin-top: 32px; border: 0; }
.coplace-job-list { padding: 0; list-style: none; margin-bottom: 24px; }
.coplace-job-list li { padding-block: 12px; border-bottom: 1px solid var(--cp-line); }
.coplace-job-list small { display: block; }
.coplace-job-list ~ .coplace-button { margin-top: 18px; }

.coplace-footer { background: var(--cp-surface); border-top: 1px solid var(--cp-line); }
.coplace-newsletter { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 18px; padding-block: 34px; border-bottom: 1px solid var(--cp-line); }
.coplace-newsletter h2 { font-size: clamp(1.45rem, 3vw, 2.35rem); }
.coplace-newsletter .coplace-button { text-decoration: none; }
.coplace-footer-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 28px; padding-block: 54px; align-items: start; }
.coplace-footer-grid :where(address,dl) { margin: 0; }
.coplace-footer .coplace-socials { margin-top: 14px; }
.coplace-hours-list { margin-top: 18px; }
.coplace-hours-list > div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--cp-line); }
.coplace-hours-list dd { text-align: right; }
.coplace-copyright { border-top: 1px solid var(--cp-line); padding: 18px 0; color: var(--cp-muted); font-size: .88rem; }

.coplace-dialog {
  position: fixed; inset: 0; margin: auto; width: min(590px,calc(100% - 24px)); max-height: calc(100dvh - 24px); overflow: auto;
  padding: 0; border: 1px solid var(--cp-line); border-radius: 18px; background: var(--t-bg); color: var(--t-text);
}
.coplace-dialog::backdrop { background: rgba(22,24,20,.58); }
.coplace-dialog-inner { position: relative; padding: clamp(24px,4vw,44px); }
.coplace-dialog-close { position: absolute; top: 6px; right: 8px; width: 44px; height: 44px; background: transparent; border: 0; font-size: 1.75rem; }
.coplace-dialog h2, .coplace-form h2 { font-size: clamp(1.5rem,3vw,2.15rem); margin-bottom: 20px; }
.coplace-drawer { width: min(390px,100%); max-width: 100%; height: 100dvh; max-height: none; margin: 0 0 0 auto; border: 0; }
.coplace-drawer nav { display: grid; gap: 2px; margin-block: 22px; }
.coplace-drawer nav button { min-height: 44px; border-bottom: 1px solid var(--cp-line); text-align: left; }
.coplace-drawer .coplace-socials { margin-top: 16px; }
.coplace-form { padding: clamp(20px,3.4vw,38px); border: 1px solid var(--cp-line); background: var(--t-bg); min-width: 0; }
.coplace-form > form > div, .coplace-dialog form > div { min-width: 0; }
.coplace .tp-label { display: block; font-weight: 600; margin-bottom: 5px; }
.coplace .tp-input { width: 100%; min-height: 42px; padding: 8px 10px; background: var(--t-bg); color: var(--t-text); border: 1px solid var(--cp-line); }
.coplace .tp-btn, .coplace .tp-tab { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; padding: 8px 14px; border: 1px solid var(--t-accent); font-weight: 700; }
.coplace .tp-btn, .coplace .tp-tab[aria-pressed=true] { background: var(--t-accent); color: var(--t-accent-text); }
.coplace .tp-tab { background: var(--t-bg); color: var(--t-text); }
.coplace .tp-soft, .coplace .tp-card { background: var(--cp-surface); }
.coplace .tp-muted { color: var(--cp-muted); }

@media (max-width: 1100px) {
  .coplace-shell { width: calc(100% - 52px); }
  .coplace-header-actions > .coplace-socials, .coplace-desktop-nav { display: none; }
  .coplace-menu-toggle { display: grid; }
}
@media (max-width: 760px) {
  .coplace-shell { width: calc(100% - 36px); }
  .coplace-utility { display: none; }
  .coplace-nav-row { min-height: 66px; gap: 8px; }
  .coplace-header-actions { gap: 6px; }
  .coplace-header-actions .coplace-button { padding: 7px 11px; font-size: .72rem; }
  .coplace-split, .coplace-hero-grid, .coplace-highlights { grid-template-columns: minmax(0,1fr); }
  .coplace-orbit { width: min(88%, 445px); }
  .coplace-hero { padding-bottom: 58px; }
  .coplace-gallery, .coplace-cards, .coplace-reviews, .coplace-footer-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (max-width: 480px) {
  .coplace-gallery, .coplace-cards, .coplace-reviews, .coplace-footer-grid, .coplace-amenities { grid-template-columns: minmax(0,1fr); }
  .coplace-form form.grid, .coplace-dialog form.grid { grid-template-columns: minmax(0,1fr); }
  .coplace-form form.grid > *, .coplace-dialog form.grid > * { grid-column: 1 / -1; }
}
@media (prefers-reduced-motion: reduce) {
  .coplace-button { transition: none; }
}
`;
