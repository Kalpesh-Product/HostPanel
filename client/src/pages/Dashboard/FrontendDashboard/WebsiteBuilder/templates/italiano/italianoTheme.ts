export const ITALIANO_CSS = String.raw`
@import url("https://fonts.googleapis.com/css2?family=Barlow:wght@200;400&family=Barlow+Condensed:wght@500;600&family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Great+Vibes&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=navigation&display=block");

.italiano {
  --t-bg: #131211;
  --t-text: #f5f0e9;
  --t-accent: #d4ae74;
  --t-accent-text: #15100b;
  --it-bg: var(--t-bg, #131211);
  --it-surface: var(--t-surface, #1c1916);
  --it-text: var(--t-text, #f5f0e9);
  --it-muted: var(--t-muted, #c4bbb1);
  --it-accent: var(--t-accent, #d4ae74);
  --it-ink: var(--t-accent-text, #15100b);
  --it-line: var(--t-line, #746154);
  --it-serif: "Cormorant Garamond", Georgia, serif;
  min-height: 100vh;
  background: var(--it-bg);
  color: var(--it-text);
  font: 16px/1.65 "DM Sans", system-ui, sans-serif;
}
.italiano *, .italiano *::before, .italiano *::after { box-sizing: border-box; }
.italiano :where(h1,h2,h3,p,figure,blockquote,dl,dd,ul) { margin: 0; }
.italiano :where(h1,h2,h3) { font-family: var(--it-serif); line-height: 1.18; overflow-wrap: anywhere; }
.italiano h1, .italiano h2 { font-size: clamp(2rem, 4.4vw, 4.25rem); letter-spacing: -.045em; font-weight: 700; }
.italiano h3 { font-size: clamp(1.15rem, 2vw, 1.6rem); }
.italiano :where(p, small) { overflow-wrap: anywhere; }
.italiano :where(a,button) { color: inherit; }
.italiano :where(button,input,select,textarea) { font: inherit; }
.italiano button { cursor: pointer; }
.italiano button:disabled { cursor: default; opacity: .6; }
.italiano :where(button,a,input,select,textarea):focus-visible { outline: 2px solid var(--it-accent); outline-offset: 4px; }
.italiano img { display: block; width: 100%; object-fit: cover; }
.italiano-shell { width: min(1140px, calc(100% - 96px)); margin-inline: auto; }
.italiano-section { padding-block: clamp(56px, 8vw, 124px); }
.italiano-center { text-align: center; }
.italiano-narrow { max-width: 680px; }
.italiano-kicker { color: var(--it-accent); font-family: var(--it-serif); font-size: .94rem; font-style: italic; font-weight: 700; margin-bottom: 16px; }
.italiano-button {
  display: inline-flex; justify-content: center; align-items: center; min-height: 48px;
  padding: 11px 25px; border: 1px solid var(--it-accent); background: transparent;
  color: var(--it-text); font: 700 .78rem/1.3 var(--it-serif); text-align: center;
  text-transform: uppercase; text-decoration: none; transition: background .2s, color .2s;
}
.italiano-button:hover { color: var(--it-ink); background: var(--it-accent); }
.italiano-text-link { border: 0; border-bottom: 1px solid currentColor; padding: 0 0 4px; background: transparent; text-align: left; font-weight: 600; }
.italiano-visually-hidden, .italiano-skip:not(:focus) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.italiano-skip:focus { position: absolute; z-index: 5; top: 8px; left: 8px; padding: 10px; color: var(--it-ink); background: var(--it-accent); }

.italiano-header { background: var(--it-bg); }
.italiano-socials { display: flex; flex-wrap: wrap; gap: 10px; }
.italiano-socials a { display: grid; place-items: center; min-width: 24px; min-height: 32px; text-decoration: none; }
.italiano-socials a:hover { color: var(--it-accent); }
.italiano-socials svg { width: 17px; height: 17px; }

.italiano-hero { position: relative; isolation: isolate; background: #201a17; color: #fffaf4; }
.italiano-hero-images, .italiano-hero-images > div, .italiano-hero-images img { position: absolute; inset: 0; width: 100%; height: 100%; }
.italiano-hero-images { z-index: -2; }
.italiano-hero-images > div { opacity: 0; transition: opacity .6s ease; }
.italiano-hero-images > .is-current { opacity: 1; }
.italiano-hero::after, .italiano-booking::after, .italiano-page-hero::after {
  content: ""; position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(180deg, rgba(12,14,14,.1), rgba(12,14,14,.26) 48%, rgba(12,14,14,.88));
}
.italiano-split { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: clamp(28px,6vw,100px); align-items: center; }
.italiano-split > div { min-width: 0; }
.italiano-split h1 + p, .italiano-split h2 + p, .italiano-split h3 + p, .italiano-split p + p { margin-top: 18px; }
.italiano-split :where(.italiano-button,.italiano-contact-details) { margin-top: 24px; }

.italiano-menu-section { background: var(--it-surface); }
.italiano-menu-tabs { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 18px; margin-block: 36px 20px; }
.italiano-menu-tabs button { min-height: 44px; padding: 8px 18px; border: 1px solid var(--it-line); background: transparent; font-family: var(--it-serif); font-size: .9rem; }
.italiano-menu-tabs button[aria-pressed=true] { background: var(--it-accent); border-color: var(--it-accent); color: var(--it-ink); }
.italiano-menu-list { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 0 44px; padding: 0; margin-block: 24px 36px; list-style: none; }
.italiano-menu-item { display: flex; gap: 14px; align-items: center; text-align: left; padding: 18px 0; width: 100%; height: 100%; border: 0; border-bottom: 1px solid var(--it-line); background: transparent; }
.italiano-menu-item img { flex: none; width: 76px; height: 76px; border-radius: 50%; }
.italiano-menu-item span { flex: 1; min-width: 0; }
.italiano-menu-item strong { display: block; font: 700 1rem/1.45 var(--it-serif); overflow-wrap: anywhere; }
.italiano-menu-item:hover strong, .italiano-menu-item b, .italiano-price { color: var(--it-accent); }
.italiano-menu-item small, .italiano-menu-item em { display: block; margin-top: 4px; }
.italiano-menu-item em { font-size: .8rem; }
.italiano-menu-item b { flex: none; font-size: .88rem; }
.italiano-empty { text-align: center; margin-block: 28px; }

.italiano-booking, .italiano-page-hero { position: relative; isolation: isolate; background: #191818; color: #fffaf4; }
.italiano-booking > img, .italiano-page-hero > img { position: absolute; inset: 0; height: 100%; z-index: -2; }
.italiano-booking::after { background: rgba(12,14,14,.72); }
.italiano-booking .italiano-kicker, .italiano-page-hero .italiano-kicker { color: #e0b795; }
.italiano-form { background: var(--it-surface); color: var(--it-text); border: 1px solid var(--it-line); padding: clamp(20px, 3vw, 36px); }
.italiano-form h2, .italiano-dialog h2 { font-size: clamp(1.45rem,3vw,2.1rem); margin-bottom: 22px; }
.italiano-hours-list { margin-top: 20px; }
.italiano-hours-list > div { display: flex; align-items: baseline; justify-content: space-between; gap: 14px; padding: 9px 0; border-bottom: 1px solid var(--it-line); }
.italiano-hours-list dt { font: 700 .9rem var(--it-serif); }
.italiano-hours-list dd { text-align: right; }
.italiano-hours-image { position: relative; }
.italiano-hours-image img { aspect-ratio: 1.25; }
.italiano-hours-image a { position: absolute; inset: auto auto 20px 20px; background: var(--it-bg); }
.italiano-gallery, .italiano-cards, .italiano-reviews { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: clamp(14px, 2.4vw, 32px); margin-top: 32px; }
.italiano-gallery button, .italiano-image-button, .italiano-cards article > button, .italiano-thumbnails button { width: 100%; padding: 0; border: 0; background: transparent; }
.italiano-gallery img, .italiano-cards img { aspect-ratio: 1.25; }
.italiano-gallery button:hover img { filter: brightness(.83); }
.italiano-reviews figure { padding: 22px; border: 1px solid var(--it-line); }
.italiano-reviews figcaption { margin-top: 12px; color: var(--it-accent); font-weight: 700; }
.italiano-reviews + .italiano-button { margin-top: 28px; }
.italiano-home-contact { border-top: 1px solid var(--it-line); }
.italiano-home-contact p, .italiano-home-contact .italiano-button { margin-top: 16px; }

.italiano-photo-strip { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); }
.italiano-photo-strip button { min-width: 0; padding: 0; border: 0; background: none; overflow: hidden; }
.italiano-photo-strip img { aspect-ratio: 1; transition: transform .35s ease, filter .35s ease; }
.italiano-photo-strip button:hover img { transform: scale(1.045); filter: brightness(.88); }
.italiano-photo-strip button:focus-visible { outline-offset: -4px; }
.italiano-footer { background: #212121; color: #d7d7d8; font: 400 16px/1.7 "Barlow", sans-serif; letter-spacing: .25px; }
.italiano-footer .italiano-shell { width: min(80%, 1200px); }
.italiano-footer-grid {
  display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: 20px; padding-block: clamp(52px, 7.1vw, 100px);
}
.italiano-footer-identity p { max-width: 30ch; margin-bottom: 12px; }
.italiano-footer .italiano-footer-brand {
  display: block; padding: 0; margin-bottom: 6px; text-align: left; color: #f5f5f5;
  font: 400 2.65rem/1.15 "Great Vibes", cursive;
}
.italiano-footer .italiano-socials { gap: 12px; color: #f5f5f5; }
.italiano-footer .italiano-socials svg { width: 20px; height: 20px; }
.italiano-footer-columns { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)) minmax(0,1.2fr) minmax(0,1.6fr); gap: 16px; }
.italiano-footer h3 { font: 500 18px/1.7 "Barlow Condensed", sans-serif; margin-bottom: 9px; }
.italiano-footer-links { display: grid; align-content: start; justify-items: start; gap: 9px; }
.italiano-footer-links h3 { margin-bottom: 0; }
.italiano-footer-links button {
  max-width: 100%; padding: 0; border: 0; background: none; text-align: left;
  color: #9c9ca7; overflow-wrap: anywhere;
}
.italiano-footer-links button:hover, .italiano-footer-contact a:hover { color: #f5f5f5; }
.italiano-footer-contact { display: grid; gap: 9px; font-style: normal; overflow-wrap: anywhere; }
.italiano-footer-contact a { display: flex; align-items: baseline; gap: 12px; text-decoration: none; }
.italiano-footer-contact svg { flex: 0 0 15px; height: 15px; align-self: center; color: #f5f5f5; }
.italiano-footer .italiano-hours-list { margin-top: 0; font-size: .875rem; color: #9c9ca7; }
.italiano-footer .italiano-hours-list > div { display: block; border: 0; padding: 0 0 8px; }
.italiano-footer .italiano-hours-list :is(dt, dd) { font: inherit; text-align: left; }
.italiano-footer-bottom { background: #1e1e1e; color: #9c9ca7; padding-block: 32px; font-size: 15px; }
@media (max-width: 1000px) {
  .italiano-footer .italiano-shell { width: calc(100% - 52px); }
  .italiano-footer-grid { grid-template-columns: 1fr; gap: 32px; }
}
@media (max-width: 640px) {
  .italiano-photo-strip { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .italiano-footer .italiano-shell { width: calc(100% - 32px); }
  .italiano-footer-columns { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 24px 16px; }
  .italiano-footer-bottom { padding-block: 24px; }
}
.italiano-newsletter { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding-block: 34px; border-bottom: 1px solid var(--it-line); }
.italiano-newsletter h2 { font-size: clamp(1.5rem, 3vw, 2.5rem); }

.italiano-page-hero { padding-block: clamp(85px,12vw,170px); text-align: center; }
.italiano-page-hero::after { background: rgba(12,14,14,.66); }
.italiano-page-intro { margin: 18px auto 0; max-width: 60ch; }
.italiano-cards article { background: var(--it-surface); border: 1px solid var(--it-line); }
.italiano-cards article > div, .italiano-cards article > button > span { display: block; padding: 20px; }
.italiano-cards h2 { font-size: 1.55rem; }
.italiano-cards p { margin-block: 10px; }
.italiano-cards .italiano-button { margin-top: 14px; }
.italiano-menu-card { position: relative; }
.italiano-menu-card .italiano-button::after { content: ""; position: absolute; inset: 0; }
.italiano-menu-card .italiano-button:focus-visible::after { outline: 2px solid var(--it-accent); outline-offset: 3px; }
.italiano-menu-card:hover .italiano-button { color: var(--it-ink); background: var(--it-accent); }
.italiano-item-detail, .italiano-related { margin-top: 32px; }
.italiano-item-detail img { aspect-ratio: 1.25; }
.italiano-thumbnails { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; margin-top: 10px; }
.italiano-price { display: block; font: 700 1.35rem var(--it-serif); margin-top: 16px; }
.italiano-chips { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin-top: 16px; }
.italiano-chips li { padding: 4px 12px; border: 1px solid var(--it-line); font-size: .83rem; }
.italiano-narrative { margin-top: 24px; }
.italiano-narrative p { white-space: pre-line; }
.italiano-contact-details { display: grid; gap: 8px; font-style: normal; }
.italiano-map { width: 100%; height: min(440px, 64vh); border: 0; margin-top: 36px; }
.italiano-job-list { padding: 0; list-style: none; margin-bottom: 28px; }
.italiano-job-list li { padding-block: 16px; border-bottom: 1px solid var(--it-line); }
.italiano-job-list small { display: block; }
.italiano-job-list ~ .italiano-button { margin-top: 20px; }

.italiano-dialog {
  position: fixed; inset: 0; margin: auto; width: min(570px, calc(100% - 28px));
  max-height: calc(100dvh - 28px); padding: 0; overflow: auto;
  background: var(--it-surface); color: var(--it-text); border: 1px solid var(--it-line);
}
.italiano-dialog::backdrop { background: rgba(0,0,0,.75); }
.italiano-dialog-inner { position: relative; padding: clamp(24px, 4vw, 46px); }
.italiano-dialog-close { position: absolute; top: 6px; right: 8px; min-width: 44px; min-height: 44px; border: 0; background: none; font-size: 1.65rem; }
.italiano .tp-label { display: block; font-weight: 600; margin-bottom: 5px; }
.italiano .tp-input { width: 100%; min-height: 42px; padding: 8px 10px; background: var(--it-bg); color: var(--it-text); border: 1px solid var(--it-line); }
.italiano .tp-btn { display: inline-flex; justify-content: center; align-items: center; gap: 8px; padding: 10px 16px; min-height: 42px; border: 1px solid var(--it-accent); background: var(--it-accent); color: var(--it-ink); font-weight: 700; }
.italiano .tp-btn:hover { background: var(--it-bg); color: var(--it-text); }
.italiano .tp-soft { background: var(--it-bg); }
.italiano .tp-muted { color: var(--it-muted); }
.italiano .tp-card { background: var(--it-surface); border: 1px solid var(--it-line); }
.italiano .tp-eyebrow { color: var(--it-accent); font-style: italic; }
.italiano .tp-h3 { font: 700 clamp(1.25rem,3vw,1.7rem)/1.25 var(--it-serif); }
.italiano img.object-contain { width: auto; object-fit: contain; }

@media (max-width: 1040px) {
  .italiano-shell { width: min(100% - 52px, 1140px); }
}
@media (max-width: 800px) {
  .italiano-split, .italiano-menu-list { grid-template-columns: 1fr; }
  .italiano-gallery, .italiano-cards, .italiano-reviews { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (max-width: 480px) {
  .italiano-shell { width: calc(100% - 32px); }
  .italiano-menu-item { gap: 9px; }
  .italiano-menu-item img { width: 52px; height: 52px; }
  .italiano-gallery, .italiano-cards, .italiano-reviews { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .italiano *, .italiano *::before, .italiano *::after { transition: none !important; }
}

.italiano { position: relative; }
.italiano-header { position: relative; z-index: 3; }
.italiano:has(.italiano-hero) .italiano-header {
  position: absolute; inset: 0 0 auto; background: linear-gradient(#100e0bd9, transparent); color: #fff7e9;
}
.italiano-header-row {
  display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.35fr) minmax(0,1fr);
  align-items: center; gap: 10px; min-height: 92px;
}
.italiano-header-actions { display: flex; justify-content: end; align-items: center; gap: 12px; }
.italiano-wordmark { justify-self: center; padding: 6px; max-width: 100%; }
.italiano-wordmark img, .italiano-footer-brand img { width: auto; max-width: min(180px,100%); max-height: 56px; object-fit: contain; }
.italiano-wordmark, .italiano-footer-brand {
  border: 0; background: transparent; font: 400 clamp(2rem,4vw,3.4rem)/1.12 "Great Vibes", cursive; overflow-wrap: anywhere;
}
.italiano-crest, .italiano-menu-toggle {
  border: 0; background: transparent; display: grid; place-items: center; width: 44px; height: 44px;
  color: var(--it-accent); flex: none;
}
.italiano-crest span {
  border: 1px solid currentColor; border-radius: 46% 46% 50% 50%; width: 33px; height: 35px;
  font-size: 1.5rem; line-height: 32px;
}
.italiano-header-book {
  background: transparent; color: var(--it-accent); border: 0; padding: 8px 4px; min-height: 44px;
  font: 600 .94rem/1.05 "Barlow Condensed", sans-serif; text-transform: uppercase; letter-spacing: .12em;
}
.italiano h1, .italiano h2 { font-weight: 600; letter-spacing: -.025em; }
.italiano-kicker {
  font: 600 .94rem/1.3 "Barlow Condensed", sans-serif; text-transform: uppercase; letter-spacing: .27em;
}
.italiano-ruled { display: inline-flex; align-items: center; gap: 15px; }
.italiano-ruled::before, .italiano-ruled::after { content: ""; width: 30px; height: 1px; background: currentColor; opacity: .6; }
.italiano-button {
  gap: 14px; background: var(--it-bg); border-color: var(--it-line); border-radius: 3px;
  font: 600 1rem/1.25 "Barlow Condensed", sans-serif; letter-spacing: .13em;
}
.italiano-button > span { color: var(--it-accent); font-size: 1.4em; }
.italiano-button:hover > span { color: inherit; }
.italiano-hero { display: grid; align-items: center; min-height: min(900px, 100svh); }
.italiano-hero::after {
  background: radial-gradient(ellipse at center, #09090844 12%, #0b0908a6 100%), linear-gradient(0deg,#0b09085c,#0b09082b);
}
.italiano-hero-content { width: min(610px, calc(100% - 190px)); margin-inline: auto; padding-block: 124px 100px; }
.italiano-hero h1 {
  max-width: 14ch; margin-inline: auto; font-size: clamp(3.4rem,6.1vw,5.8rem); line-height: .94;
  text-transform: uppercase; text-wrap: balance;
}
.italiano-hero-copy { max-width: 35ch; margin: 22px auto 0; font: 500 clamp(1.25rem,2.1vw,1.72rem)/1.26 var(--it-serif); }
.italiano-hero .italiano-button { margin-top: 38px; }
.italiano-hero .italiano-learn-more {
  position: relative; isolation: isolate; overflow: hidden; max-width: 100%;
  gap: 16px; padding: 12px 24px; border: 1px solid rgb(223 177 135 / .5);
  background: #111; color: #f5f5f5;
  font: 500 16px/1.4286 "Barlow Condensed", sans-serif; letter-spacing: 2px;
  overflow-wrap: anywhere;
}
.italiano-learn-more::before {
  content: ""; position: absolute; inset: 0; z-index: -1; background: #252525;
  transform: translateX(100%); transition: transform 200ms ease;
}
.italiano-learn-more:is(:hover, :focus-visible)::before { transform: translateX(0); }
.italiano-hero .italiano-learn-more-emblem {
  position: relative; display: grid; place-items: center; flex: 0 0 32px; height: 32px;
  color: #e3af5a; overflow: hidden;
}
.italiano-learn-more-emblem::before, .italiano-learn-more-emblem::after {
  content: ""; position: absolute; inset: 0;
  clip-path: path("M 32 16 L 24 27 Q 21 32 15 32 A 16 16 0 0 1 15 0 Q 21 0 24 5 Z");
}
.italiano-learn-more-emblem::before { background: #92734f; }
.italiano-learn-more-emblem::after { background: #111; transform: scale(.91); transition: background-color 200ms ease; }
.italiano-learn-more:is(:hover, :focus-visible) .italiano-learn-more-emblem::after { background: #252525; }
.italiano-learn-more-arrow {
  position: relative; z-index: 1; font: 400 14px/1 "Material Symbols Outlined";
  letter-spacing: normal; text-transform: none; font-feature-settings: "liga";
  transform: rotate(90deg);
}
@media (prefers-reduced-motion: no-preference) {
  .italiano-learn-more:is(:hover, :focus-visible) .italiano-learn-more-arrow {
    animation: italiano-learn-more-arrow-pass 800ms linear;
  }
}
@keyframes italiano-learn-more-arrow-pass {
  0% { transform: translateX(0) rotate(90deg); }
  62.5% { transform: translateX(60px) rotate(90deg); }
  62.6% { transform: translateX(-60px) rotate(90deg); }
  100% { transform: translateX(0) rotate(90deg); }
}
.italiano-hero-controls { position: absolute; inset: 50% 0 auto; transform: translateY(-50%); display: flex; justify-content: space-between; pointer-events: none; }
.italiano-hero-controls button {
  pointer-events: auto; width: clamp(64px,10vw,148px); aspect-ratio: 1; border: 1px solid #fff8e47a;
  border-radius: 50%; background: #15120e45; color: #fff7e9; font: 400 clamp(1.4rem,3vw,2.5rem)/1 var(--it-serif);
}
.italiano-hero-controls button:first-child { margin-left: -22px; padding-left: 19px; }
.italiano-hero-controls button:last-child { margin-right: -22px; padding-right: 19px; }
.italiano-hero-controls button:hover { background: #17120ebf; }
.italiano-hero { overflow: clip; }
.italiano-story { scroll-margin-top: 20px; }
.italiano-chapters { list-style: none; max-width: 900px; margin: 42px auto; padding: 0; display: grid; gap: 32px; }
.italiano-chapters li { display: grid; grid-template-columns: 76px minmax(0,1fr); gap: clamp(16px,4vw,44px); align-items: start; }
.italiano-chapter-number {
  border: 1px solid var(--it-accent); border-radius: 50% 50% 5px 5px; padding: 12px 4px;
  text-align: center; font: 600 1.75rem/1 var(--it-serif); color: var(--it-accent);
}
.italiano-chapters img { aspect-ratio: 3 / 1; border-radius: 3px; margin-bottom: 16px; }
.italiano-chapters h3 { font-size: clamp(1.7rem,4vw,2.65rem); }
.italiano-chapters p { color: var(--it-muted); }
.italiano-chef > img { aspect-ratio: 4 / 4.5; max-height: 530px; }
.italiano-menu-item strong { font-size: 1.45rem; }
.italiano-menu-item b { font-family: var(--it-serif); font-size: 1.15rem; white-space: normal; max-width: 25%; }
.italiano :where(.italiano-form,.italiano-dialog) form > * { min-width: 0; }
@media (max-width: 650px) {
  .italiano-header-row { min-height: 72px; }
  .italiano-header-actions { gap: 0; }
  .italiano-header-book { display: none; }
  .italiano-hero-content { width: calc(100% - 36px); padding-block: 110px 110px; }
  .italiano-hero h1 { font-size: clamp(2.75rem,11vw,4.4rem); }
  .italiano-hero-controls { inset: auto 0 24px; transform: none; justify-content: center; gap: 14px; }
  .italiano-hero-controls button { width: 48px; }
  .italiano-hero-controls button:first-child, .italiano-hero-controls button:last-child { margin: 0; padding: 0; }
  .italiano-chapters li { grid-template-columns: 46px minmax(0,1fr); }
  .italiano-chapters img { aspect-ratio: 1.8; }
}
@media (max-width: 480px) {
  .italiano :where(.italiano-form,.italiano-dialog) form.grid { grid-template-columns: minmax(0,1fr); }
  .italiano :where(.italiano-form,.italiano-dialog) form.grid > * { grid-column: 1 / -1; }
}


.italiano-navigation {
  --it-menu-duration: 700ms;
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  border: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
  color: #f5f5f5;
  transition: display var(--it-menu-duration) allow-discrete, overlay var(--it-menu-duration) allow-discrete;
}
.italiano-navigation::backdrop { background: transparent; }
.italiano-navigation-surface {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 160px 16px 48px;
  background: #1e1e1e;
  text-align: center;
  opacity: 0;
  transform: translateY(-100%);
  transition: transform var(--it-menu-duration) cubic-bezier(.45,0,.55,1), opacity var(--it-menu-duration) linear;
}
.italiano-navigation[open] .italiano-navigation-surface { opacity: 1; transform: translateY(0); }
@starting-style {
  .italiano-navigation[open] .italiano-navigation-surface { opacity: 0; transform: translateY(-100px); }
}
.italiano-navigation-head {
  position: absolute;
  inset: 0 0 auto;
  z-index: 1;
  background: transparent;
  transition: background var(--it-menu-duration) linear;
}
.italiano-navigation[open] .italiano-navigation-head { background: #1e1e1e; }
@starting-style {
  .italiano-navigation[open] .italiano-navigation-head { background: transparent; }
}
.italiano-navigation nav { display: grid; justify-items: center; }
.italiano-navigation nav button {
  max-width: 100%;
  padding: 20px;
  border: 0;
  background: transparent;
  font: 200 32px/1 "Barlow", sans-serif;
  letter-spacing: .6px;
  text-transform: uppercase;
  overflow-wrap: anywhere;
  transition: color .2s ease;
}
.italiano-navigation nav :is(button:hover, [aria-current="page"]) { color: #dfb187; }
.italiano-navigation-book { display: none; }

.italiano-menu-toggle span { position: relative; width: 20px; height: 16px; }
.italiano-menu-toggle i {
  position: absolute;
  top: 7px;
  left: 0;
  width: 100%;
  height: 1px;
  background: currentColor;
  transition: transform 400ms ease, opacity 400ms ease;
}
.italiano-menu-toggle i:first-child { transform: translateY(-6px); }
.italiano-menu-toggle i:last-child { transform: translateY(6px); }
.italiano-navigation[open] .italiano-menu-toggle i:first-child { transform: rotate(45deg) scaleX(.82); }
.italiano-navigation[open] .italiano-menu-toggle i:nth-child(2) { opacity: 0; transform: scaleX(0); }
.italiano-navigation[open] .italiano-menu-toggle i:last-child { transform: rotate(-45deg) scaleX(.82); }
@starting-style {
  .italiano-navigation[open] .italiano-menu-toggle i:first-child { transform: translateY(-6px); }
  .italiano-navigation[open] .italiano-menu-toggle i:nth-child(2) { opacity: 1; transform: none; }
  .italiano-navigation[open] .italiano-menu-toggle i:last-child { transform: translateY(6px); }
}
html:has(.italiano-navigation[open]) { overflow: hidden; scrollbar-gutter: stable; }
.italiano-header .italiano-menu-toggle { transition: opacity 0s 700ms; }
.italiano-header:has(+ .italiano-navigation[open]) .italiano-menu-toggle { opacity: 0; transition: none; }
@media (max-width: 767px) {
  .italiano-navigation-surface { padding-top: clamp(116px, 23.4dvh, 192px); }
  .italiano-navigation nav button { padding-inline: 8px; font-size: 24px; }
}
@media (max-width: 650px) {
  .italiano-navigation-book { display: inline-flex; margin-top: 20px; }
}

`;
