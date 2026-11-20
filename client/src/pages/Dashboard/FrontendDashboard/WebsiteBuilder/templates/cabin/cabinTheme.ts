export const CABIN_CSS = String.raw`
@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap");

.cabin {
  --t-bg: #ffffff;
  --t-text: #181916;
  --t-accent: #181916;
  --t-accent-text: #ffffff;
  --cb-line: var(--t-line, #d9d9d5);
  --cb-muted: var(--t-muted, #6b6b66);
  --cb-surface: var(--t-surface, #f2f2ee);
  --cb-serif: "Instrument Serif", Georgia, serif;
  min-height: 100vh;
  background: var(--t-bg, #fff);
  color: var(--t-text, #181916);
  font: 16px/1.65 "DM Sans", sans-serif;
}
.cabin *, .cabin *::before, .cabin *::after { box-sizing: border-box; }
.cabin :where(h1,h2,h3,p,figure,blockquote,dl,dd,ul) { margin: 0; }
.cabin :where(h1,h2,h3) { font-family: var(--cb-serif); font-weight: 400; line-height: 1.05; overflow-wrap: anywhere; }
.cabin h1 { font-size: clamp(3.5rem,8vw,8rem); }
.cabin h2 { font-size: clamp(2.6rem,6vw,5.7rem); }
.cabin h3 { font-size: clamp(1.7rem,3vw,2.7rem); }
.cabin :where(a,button) { color: inherit; }
.cabin :where(button,input,textarea,select) { font: inherit; }
.cabin button { cursor: pointer; }
.cabin button:disabled { cursor: default; opacity: .55; }
.cabin :where(a,button,input,textarea,select):focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
.cabin img { display: block; max-width: 100%; }
.cabin :where(p,address,a) { overflow-wrap: anywhere; }
.cabin-shell { width: min(1320px,calc(100% - 96px)); margin-inline: auto; }
.cabin-section { padding-block: clamp(64px,8vw,128px); }
.cabin-surface { background: var(--cb-surface); }
.cabin-center { text-align: center; }
.cabin-narrow { max-width: 780px; }
.cabin-auto { margin-inline: auto; }
.cabin-kicker { color: var(--cb-muted); margin-bottom: 20px; }
.cabin-visually-hidden, .cabin-skip:not(:focus) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.cabin-skip:focus { position: fixed; top: 8px; left: 8px; z-index: 80; padding: 8px 15px; background: var(--t-bg); }
.cabin-button { display: inline-flex; justify-content: center; align-items: center; gap: 18px; padding: 13px 25px; min-height: 48px; border: 1px solid var(--t-accent); border-radius: 99px; background: transparent; color: var(--t-text); transition: color .25s, background .25s, transform .25s; }
.cabin-button:hover { background: var(--t-accent); color: var(--t-accent-text); transform: translateY(-2px); }
.cabin-text-link { display: inline-block; padding: 6px 0; border: 0; border-bottom: 1px solid currentColor; background: transparent; text-align: left; text-decoration: none; }
.cabin-text-link:hover { opacity: .65; }

.cabin-header { position: sticky; top: 0; z-index: 40; display: flex; justify-content: space-between; align-items: center; gap: 28px; min-height: 72px; padding-left: 40px; border-radius: 0 0 32px 32px; background: color-mix(in srgb,var(--t-bg) 94%,transparent); backdrop-filter: blur(12px); }
.cabin-header, .cabin-hero { width: min(1290px,calc(100% - 48px)); margin-inline: auto; }
.cabin-brand { min-width: 0; max-width: 30%; border: 0; padding: 0; background: transparent; font: 400 clamp(1.6rem,2.6vw,2.4rem)/1 var(--cb-serif); text-align: left; overflow-wrap: anywhere; }
.cabin-brand img { max-height: 46px; max-width: 180px; width: auto; object-fit: contain; }
.cabin-desktop-nav { display: flex; align-items: center; justify-content: flex-end; gap: clamp(12px,1.7vw,28px); margin-left: auto; }
.cabin-desktop-nav button { background: transparent; padding: 9px 0; border: 0; font-size: .9rem; font-weight: 500; }
.cabin-desktop-nav button span { display: none; }
.cabin-desktop-nav button:hover, .cabin-desktop-nav button[aria-current] { text-decoration: underline; text-underline-offset: 7px; }
.cabin-header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.cabin-header-book { min-height: 72px; padding: 18px 24px; background: var(--t-accent); color: var(--t-accent-text); border: 0; border-radius: 0 0 32px 32px; font-size: .85rem; }
.cabin-header-book:hover { opacity: .8; }
.cabin-menu-toggle { display: none; width: 54px; height: 54px; padding: 14px; border: 0; background: transparent; }
.cabin-menu-toggle span { display: block; height: 1px; width: 24px; background: currentColor; margin-block: 7px; }
.cabin-hero { position: relative; isolation: isolate; margin-top: -72px; padding-top: 150px; min-height: max(680px,100svh); display: flex; align-items: flex-end; overflow: hidden; color: #fff; background: #30362d; }
.cabin-hero-images { position: absolute; inset: 0; z-index: -2; overflow: hidden; }
.cabin-hero-images > div { position: absolute; inset: 0; opacity: 0; transition: opacity 1s ease; }
.cabin-hero-images > div.is-current { opacity: 1; }
.cabin-hero-images img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.04); transition: transform 7s ease-out; }
.cabin-hero-images .is-current img { transform: scale(1); }
.cabin-hero-controls { position: absolute; bottom: 60px; left: 50%; display: flex; align-items: center; gap: 14px; transform: translateX(-50%); }
.cabin-hero-controls > button { width: 9px; height: 9px; padding: 0; border: 1px solid #fff; border-radius: 50%; background: transparent; }
.cabin-hero-controls > button[aria-pressed=true] { background: #fff; }
.cabin-hero-controls > .cabin-hero-pause { width: 28px; height: 28px; border: 0; font-size: 15px; }
.cabin-hero::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg,rgba(0,0,0,.05) 20%,rgba(0,0,0,.6)); }
.cabin-hero-copy { padding-block: 80px 110px; }
.cabin-hero h1 { font-size: clamp(6rem,15vw,15rem); line-height: .95; max-width: 100%; animation: cabin-enter 1s ease-out both; }
.cabin-hero-bottom { margin-top: 56px; display: flex; justify-content: space-between; gap: 30px; align-items: flex-end; }
.cabin-hero-bottom p { max-width: 340px; }
.cabin-round-link { border: 1px solid #ffffff90; border-radius: 99px; background: transparent; padding: 20px 28px; display: flex; gap: 28px; align-items: center; }
.cabin-round-link span { font-size: 24px; transition: transform .25s; }
.cabin-round-link:hover span { transform: translate(3px,-3px); }
.cabin-scroll { display: flex; gap: 20px; align-items: center; font-family: var(--cb-serif); text-decoration: none; text-transform: uppercase; white-space: nowrap; }
.cabin-scroll span { display: grid; place-items: center; border: 1px solid #ffffff70; border-radius: 50%; width: 72px; height: 72px; font-size: 28px; }
.cabin-rounded { position: relative; background: var(--t-bg); border-radius: 60px 60px 0 0; margin-top: -50px; }
.cabin-intro { text-align: center; }
.cabin-intro h2 { max-width: 1060px; margin-inline: auto; font-size: clamp(2.1rem,4.2vw,4.1rem); line-height: 1.2; }
.cabin-intro-links { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); text-align: left; gap: 40px; margin-top: 80px; }
.cabin-intro-links p { margin-top: 20px; color: var(--cb-muted); }
.cabin-collage { position: relative; height: clamp(400px,55vw,720px); border-radius: 60px; overflow: hidden; background: #d4d6cd; }
.cabin-collage-grid { position: absolute; inset: -40%; display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); grid-template-rows: repeat(3,1fr); gap: 20px; transform: rotate(-27deg); }
.cabin-collage-grid button { min-height: 0; min-width: 0; border-radius: 32px; overflow: hidden; padding: 0; border: 0; background: var(--cb-surface); }
.cabin-collage-grid img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s; }
.cabin-collage-grid button:hover img { transform: scale(1.05); }
.cabin-collage-title { position: absolute; inset: 0; pointer-events: none; display: grid; place-items: center; color: #fff; background: #0003; text-align: center; }
.cabin-collage-title h2 { max-width: 7ch; font-size: clamp(3.6rem,8vw,8rem); }
.cabin-section-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; margin-bottom: 48px; }
.cabin-section-heading p { max-width: 380px; color: var(--cb-muted); }
.cabin-discover-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 24px; }
.cabin-discover-grid > div { min-width: 0; }
.cabin-discover-grid img { width: 100%; height: 100%; min-height: 360px; aspect-ratio: .7; object-fit: cover; border-radius: 50px; }
.cabin-discover-cta { border: 1px solid currentColor; border-radius: 50px; padding: 35px 22px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
.cabin-discover-cta h3 { margin-bottom: 26px; }
.cabin-amenity-tags { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; list-style: none; padding: 0; margin-top: 40px; }
.cabin-amenity-tags li { border: 1px solid var(--cb-line); padding: 10px 24px; border-radius: 99px; }
.cabin-split { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: clamp(28px,6vw,90px); align-items: center; }
.cabin-split > div { min-width: 0; }
.cabin-split > img { width: 100%; aspect-ratio: 1.1; object-fit: cover; border-radius: 40px; }
.cabin-split :where(h1,h2,h3) + p, .cabin-split p + p { margin-top: 20px; }
.cabin-split .cabin-button { margin-top: 28px; }
.cabin-split p:not(.cabin-kicker,.cabin-price) { color: var(--cb-muted); }

.cabin-page-hero { position: relative; isolation: isolate; padding-block: clamp(90px,12vw,180px); background: #30362d; color: #fff; text-align: center; border-radius: 0 0 60px 60px; overflow: hidden; }
.cabin-page-hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
.cabin-page-hero::after { content: ""; position: absolute; inset: 0; background: #1118; z-index: -1; }
.cabin-page-hero .cabin-kicker { color: inherit; }
.cabin-page-intro { margin: 22px auto 0; max-width: 62ch; }
.cabin-cards, .cabin-gallery, .cabin-reviews { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 28px; }
.cabin-cards article { position: relative; height: 100%; border: 1px solid var(--cb-line); border-radius: 32px; overflow: hidden; }
.cabin-cards article img { width: 100%; aspect-ratio: .95; object-fit: cover; transition: transform .65s; }
.cabin-cards article:hover img { transform: scale(1.035); }
.cabin-cards article > div { padding: 26px; }
.cabin-cards h2 { font-size: 2.3rem; }
.cabin-cards :where(h2,h3) + p, .cabin-cards p + p { margin-top: 14px; }
.cabin-card-action { margin-top: 20px; padding: 6px 0; border: 0; border-bottom: 1px solid currentColor; background: transparent; }
.cabin-card-action::after { content: ""; position: absolute; inset: 0; }
.cabin-card-action:focus-visible::after { outline: 3px solid currentColor; outline-offset: -4px; border-radius: 30px; }
.cabin-cards.cabin-product-cards { --card-gap: 28px; display: flex; flex-wrap: wrap; justify-content: center; gap: var(--card-gap); }
.cabin-product-cards > * { flex: 0 0 calc((100% - 2 * var(--card-gap)) / 3); min-width: 0; }
.cabin-gallery button, .cabin-image-button, .cabin-thumbnails button { display: block; width: 100%; padding: 0; border: 0; background: transparent; overflow: hidden; border-radius: 26px; }
.cabin-gallery img { width: 100%; aspect-ratio: 1.25; object-fit: cover; transition: transform .6s; }
.cabin-gallery button:hover img { transform: scale(1.04); }
.cabin-related { margin-top: clamp(40px,6vw,80px); }
.cabin-related > h2 { text-align: center; margin-bottom: 32px; }
.cabin-item-detail { margin-top: 32px; }
.cabin-item-detail img { width: 100%; aspect-ratio: 1.15; object-fit: cover; }
.cabin-thumbnails { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10px; margin-top: 10px; }
.cabin-amenities { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px 24px; list-style: none; padding: 0; margin-top: 24px; }
.cabin-amenities li { padding: 10px 0; border-bottom: 1px solid var(--cb-line); }
.cabin-narrative { margin-top: 28px; }
.cabin-narrative p { white-space: pre-line; }
.cabin-pricing { background: var(--cb-surface); border-radius: 60px; }
.cabin-price-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 24px; margin-top: 50px; }
.cabin-price-grid article { flex: 1 1 260px; max-width: 430px; padding: 38px 30px; border: 1px solid var(--cb-line); border-radius: 40px; background: var(--t-bg); }
.cabin-price { font-size: clamp(1.5rem,3vw,2.3rem); margin-block: 22px; }
.cabin-price-grid ul { padding-left: 20px; margin-block: 28px; }
.cabin-price-grid li { padding-block: 9px; }
.cabin-faq-layout { display: grid; grid-template-columns: 1fr 1.3fr; gap: 70px; }
.cabin-faq-layout h2 + p { margin-top: 24px; color: var(--cb-muted); }
.cabin-faqs details { border-bottom: 1px solid var(--cb-line); }
.cabin-faqs summary { padding: 22px 0; list-style: none; display: flex; justify-content: space-between; gap: 24px; cursor: pointer; font-size: 1.15rem; }
.cabin-faqs summary::-webkit-details-marker { display: none; }
.cabin-faqs details p { padding-bottom: 24px; color: var(--cb-muted); }
.cabin-faqs summary span { transition: transform .25s; }
.cabin-faqs details[open] summary span { transform: rotate(45deg); }
.cabin-review blockquote { max-width: 1000px; margin-inline: auto; font: 400 clamp(2rem,4.4vw,4.2rem)/1.15 var(--cb-serif); }
.cabin-review figcaption, .cabin-reviews figcaption { margin-top: 26px; }
.cabin-review-dots { display: flex; justify-content: center; gap: 12px; margin-block: 30px; }
.cabin-review-dots button { width: 12px; height: 12px; border: 1px solid currentColor; border-radius: 50%; padding: 0; background: transparent; }
.cabin-review-dots button[aria-pressed=true] { background: currentColor; }
.cabin-reviews { margin-block: 32px; }
.cabin-reviews figure { padding: 30px; border: 1px solid var(--cb-line); border-radius: 30px; }
.cabin-request img { margin-top: 38px; width: 100%; height: 240px; object-fit: cover; border-radius: 35px; }
.cabin-contact-details, .cabin-footer address { display: grid; gap: 12px; font-style: normal; margin-top: 20px; }
.cabin-map { width: 100%; height: 420px; margin-top: 40px; border: 0; border-radius: 30px; }
.cabin-job-list { padding: 0; list-style: none; margin-bottom: 32px; }
.cabin-job-list li { padding-block: 20px; border-bottom: 1px solid var(--cb-line); }
.cabin-job-list small { display: block; }
.cabin-career-cta > * { margin-top: 24px; }
.cabin-partner-form { margin-inline: auto; }
.cabin-hours-list { margin-top: 24px; }
.cabin-hours-list > div { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid var(--cb-line); }
.cabin-hours-list dd { text-align: right; }
.cabin-socials { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 24px; }
.cabin-socials a { display: grid; place-items: center; min-width: 32px; min-height: 36px; }
.cabin-socials svg { width: 20px; height: 20px; }
.cabin-footer { background: var(--t-accent); color: var(--t-accent-text); border-radius: 60px 60px 0 0; padding-top: 80px; }
.cabin-footer-grid { display: grid; grid-template-columns: 1.6fr .6fr 1fr; gap: 60px; padding-bottom: 70px; }
.cabin-footer-intro h2 { margin-block: 30px; max-width: 8ch; }
.cabin-footer-intro p { max-width: 360px; opacity: .7; }
.cabin-footer .cabin-brand { max-width: 100%; }
.cabin-footer h3 { font: 500 1rem/1.4 "DM Sans",sans-serif; margin-bottom: 24px; }
.cabin-footer nav button { display: block; padding: 6px 0; border: 0; background: transparent; text-align: left; }
.cabin-footer a { text-decoration: none; }
.cabin-footer :where(a,nav button):hover { text-decoration: underline; text-underline-offset: 5px; }
.cabin-footer .cabin-hours-list { font-size: .85rem; }
.cabin-copyright { border-top: 1px solid #ffffff35; padding-block: 24px; font-size: .85rem; }

.cabin-dialog { position: fixed; inset: 0; margin: auto; width: min(620px,calc(100% - 24px)); max-height: calc(100dvh - 24px); overflow: auto; padding: 0; border: 1px solid var(--cb-line); border-radius: 35px; background: var(--t-bg); color: var(--t-text); }
.cabin-dialog::backdrop { background: #12151080; backdrop-filter: blur(5px); }
.cabin-dialog-inner { position: relative; padding: clamp(28px,5vw,48px); }
.cabin-dialog-close { width: 44px; height: 44px; padding: 0; border: 0; background: transparent; font-size: 32px; }
.cabin-dialog:not(.cabin-drawer) .cabin-dialog-close { position: absolute; right: 10px; top: 8px; }
.cabin-dialog h2, .cabin-form h2 { font-size: clamp(2rem,4vw,3rem); margin-bottom: 24px; }
.cabin-drawer { width: min(640px,100%); max-width: 100%; max-height: 100dvh; margin: 0 0 0 auto; border: 0; border-radius: 0 0 0 40px; transform: translateY(-30px); opacity: 0; transition: transform .4s, opacity .4s, display .4s allow-discrete, overlay .4s allow-discrete; }
.cabin-drawer[open] { transform: translateY(0); opacity: 1; }
@starting-style { .cabin-drawer[open] { transform: translateY(-30px); opacity: 0; } }
.cabin-drawer-top { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.cabin-drawer-top .cabin-brand { max-width: 80%; }
.cabin-drawer nav { display: grid; margin-block: 30px; }
.cabin-drawer nav button { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border: 0; border-bottom: 1px solid var(--cb-line); background: transparent; text-align: left; font: 400 clamp(1.8rem,5vw,2.8rem)/1.15 var(--cb-serif); }
.cabin-drawer nav button span { font-size: 1.2rem; }
.cabin-drawer nav button[aria-current] { opacity: .55; }
.cabin-form { min-width: 0; padding: clamp(22px,3.5vw,44px); border: 1px solid var(--cb-line); border-radius: 35px; background: var(--t-bg); }
.cabin-form > h3 { margin-bottom: 28px; }
.cabin .tp-label { display: block; font-weight: 500; margin-bottom: 8px; }
.cabin .tp-input { width: 100%; min-width: 0; min-height: 46px; padding: 10px 14px; background: var(--t-bg); color: var(--t-text); border: 1px solid var(--cb-line); border-radius: 12px; }
.cabin .tp-btn, .cabin .tp-tab { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; padding: 11px 22px; border: 1px solid var(--t-accent); border-radius: 99px; }
.cabin .tp-btn, .cabin .tp-tab[aria-pressed=true] { background: var(--t-accent); color: var(--t-accent-text); }
.cabin .tp-tab { background: var(--t-bg); color: var(--t-text); }
.cabin .tp-soft, .cabin .tp-card { background: var(--cb-surface); }
.cabin .tp-muted { color: var(--cb-muted); }
.cabin-form form > div, .cabin-dialog form > div { min-width: 0; }
.cabin-form button[type=submit], .cabin-dialog button[type=submit] { width: 100%; margin-top: 16px; }
@keyframes cabin-enter { from { opacity: 0; transform: translateY(35px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width:1100px) {
  .cabin-shell { width: calc(100% - 52px); }
  .cabin-desktop-nav { display: none; }
  .cabin-menu-toggle { display: block; }
  .cabin-header { padding-inline: 26px 10px; }
  .cabin-header-book { border-radius: 0; }
  .cabin-discover-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .cabin-discover-grid img { height: 420px; }
  .cabin-footer-grid { gap: 30px; grid-template-columns: 1.4fr .7fr 1fr; }
}
@media (max-width:760px) {
  .cabin-header, .cabin-hero { width: calc(100% - 24px); }
  .cabin-shell { width: calc(100% - 36px); }
  .cabin-header { min-height: 66px; gap: 12px; padding-left: 20px; border-radius: 0 0 24px 24px; }
  .cabin-brand { max-width: 45%; }
  .cabin-brand img { max-width: 130px; }
  .cabin-header-actions { margin-left: auto; }
  .cabin-header-book { display: none; }
  .cabin-hero { margin-top: -66px; min-height: max(630px,92svh); }
  .cabin-hero-copy { padding-block: 80px 120px; }
  .cabin-hero h1 { font-size: clamp(5.3rem,20vw,9rem); }
  .cabin-hero-bottom { flex-wrap: wrap; margin-top: 30px; gap: 25px; }
  .cabin-hero-controls { bottom: 65px; }
  .cabin-hero-bottom p { max-width: 100%; width: 100%; }
  .cabin-scroll { margin-left: auto; font-size: .8rem; }
  .cabin-scroll span { width: 42px; height: 42px; font-size: 20px; }
  .cabin-round-link { padding: 12px 20px; gap: 12px; font-size: .85rem; }
  .cabin-rounded, .cabin-pricing, .cabin-footer { border-radius: 32px 32px 0 0; }
  .cabin-intro-links { grid-template-columns: 1fr; gap: 30px; margin-top: 45px; }
  .cabin-intro-links p { margin-top: 10px; }
  .cabin-collage { border-radius: 32px; }
  .cabin-section-heading { display: block; }
  .cabin-section-heading p { margin-top: 24px; }
  .cabin-discover-grid { gap: 16px; }
  .cabin-discover-grid img { height: 100%; min-height: 250px; border-radius: 32px; }
  .cabin-discover-cta { border-radius: 32px; padding: 26px 18px; }
  .cabin-split, .cabin-faq-layout { grid-template-columns: minmax(0,1fr); gap: 36px; }
  .cabin-gallery, .cabin-cards, .cabin-reviews { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; }
  .cabin-product-cards > * { flex-basis: calc((100% - var(--card-gap)) / 2); }
  .cabin-footer { padding-top: 55px; }
  .cabin-footer-grid { grid-template-columns: 1fr 1fr; }
  .cabin-footer-intro { grid-column: 1 / -1; }
  .cabin-footer-intro h2 { max-width: 100%; }
  .cabin-page-hero { border-radius: 0 0 32px 32px; }
}
@media (max-width:480px) {
  .cabin-discover-grid, .cabin-gallery, .cabin-cards, .cabin-reviews, .cabin-amenities, .cabin-footer-grid { grid-template-columns: minmax(0,1fr); }
  .cabin-discover-grid img { height: 360px; aspect-ratio: 1; }
  .cabin-discover-cta { min-height: 300px; }
  .cabin-product-cards > * { flex-basis: 100%; }
  .cabin-form form.grid, .cabin-dialog form.grid { grid-template-columns: minmax(0,1fr); }
  .cabin-form form.grid > *, .cabin-dialog form.grid > * { grid-column: 1 / -1; }
  .cabin-scroll { gap: 8px; }
}
@media (prefers-reduced-motion:reduce) {
  .cabin *, .cabin *::before, .cabin *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`;
