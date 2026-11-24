export const CABIN_CSS = String.raw`
/* Cabin CMS reference typography and palette, scoped to this template only. */
@font-face {
  font-family: Satoshi Variable;
  src: url("https://cdn.prod.website-files.com/66fef51bb2a32743f5bfff90/66fef51bb2a32743f5bfffe6_Satoshi-Variable.ttf") format("truetype");
  font-weight: 300 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: Nyghtserif;
  src: url("https://cdn.prod.website-files.com/66fef51bb2a32743f5bfff90/66fef51bb2a32743f5c0004d_NyghtSerif-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: Nyghtserif;
  src: url("https://cdn.prod.website-files.com/66fef51bb2a32743f5bfff90/66fef51bb2a32743f5bfffe4_NyghtSerif-Light.otf") format("opentype");
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: Nyghtserif;
  src: url("https://cdn.prod.website-files.com/66fef51bb2a32743f5bfff90/66fef51bb2a32743f5c00007_NyghtSerif-Medium.otf") format("opentype");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

.cabin {
  --cb-link: #eeac3f;
  --cb-link-hover: #e4a133;
  --cb-dark: #161616;
  --cb-line: var(--t-line, #bbbbb6);
  --cb-muted: var(--t-muted, #747474);
  --cb-surface: var(--t-surface, #f3f8f9);
  --cb-serif: "Nyghtserif", Georgia, serif;
  --cb-sans: "Satoshi Variable", "DM Sans", sans-serif;
  --cb-white: #ffffff;
  min-height: 100vh;
  background: var(--t-bg, #efefef);
  color: var(--t-text, #1f1f1f);
  font: 500 18px/26px var(--cb-sans);
}
.cabin *, .cabin *::before, .cabin *::after { box-sizing: border-box; }
.cabin :where(h1,h2,h3,h4,h5,h6,p,figure,blockquote,dl,dd,ul,ol) { margin: 0; }
.cabin :where(h1,h2,h3,h4,h5,h6) {
  font-family: var(--cb-serif);
  font-weight: 400;
  line-height: 1.08;
  overflow-wrap: anywhere;
}
.cabin h1 { font-size: clamp(2.75rem, 6vw, 72px); line-height: 1.1; }
.cabin h2 { font-size: clamp(1.75rem, 3vw, 34px); line-height: 1.3; }
.cabin h3 { font-size: clamp(1.35rem, 2vw, 24px); line-height: 1.25; }
.cabin h4 { font-size: clamp(2rem, 4vw, 48px); line-height: 1.2; font-weight: 500; }
.cabin h5 { font-size: 22px; line-height: 28px; }
.cabin h6 { font-size: clamp(1.75rem, 3.4vw, 40px); line-height: 1.15; }
.cabin :where(a,button) { color: inherit; }
.cabin a { color: var(--cb-link); text-decoration: underline; transition: color .2s; }
.cabin a:hover { color: var(--cb-link-hover); }
.cabin :where(button,input,textarea,select) { font: inherit; }
.cabin button { cursor: pointer; }
.cabin button:disabled { cursor: default; opacity: .55; }
.cabin :where(a,button,input,textarea,select):focus-visible { outline: 2px solid var(--cb-link); outline-offset: 4px; }
.cabin img { display: block; max-width: 100%; }
.cabin :where(p,address,a) { overflow-wrap: anywhere; }

.cabin-shell { width: min(1290px, calc(100% - 96px)); margin-inline: auto; }
.cabin-narrow-container { width: min(940px, 100%); margin-inline: auto; }
.cabin-section { padding-block: clamp(80px, 12vw, 160px); padding-inline: clamp(20px, 3.5vw, 56px); position: relative; }
.cabin-center { text-align: center; }
.cabin-narrow { max-width: 780px; }
.cabin-auto { margin-inline: auto; }
.cabin-kicker { color: var(--cb-muted); font-size: 20px; font-weight: 500; line-height: 24px; margin-bottom: 15px; }
.cabin-kicker.white, .cabin-center .cabin-kicker.white { color: var(--cb-white); }
.cabin-serif-copy { font-family: var(--cb-serif); font-size: clamp(1.25rem, 2vw, 28px); font-weight: 300; line-height: 38px; }
.cabin-indent { text-indent: 23%; }
.cabin-amenity-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 0; list-style: none; margin-top: 24px; }
.cabin-amenity-tags li { padding: 8px 16px; border: 1px solid var(--cb-line); border-radius: 99px; color: var(--cb-muted); font-size: 14px; line-height: 18px; }
.cabin-visually-hidden, .cabin-skip:not(:focus) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.cabin-skip:focus { position: fixed; top: 8px; left: 8px; z-index: 100; padding: 8px 15px; background: var(--cb-white); }

.cabin-button, .cabin-text-link {
  display: inline-flex; justify-content: center; align-items: center; gap: 12px;
  border-radius: 99px; border: 1px solid var(--t-accent, var(--cb-dark)); background: transparent;
  color: var(--t-text, #1f1f1f); min-height: 54px; padding: 13px 32px;
  font-size: 15px; font-weight: 700; line-height: 18px; text-decoration: none;
  transition: color .25s, background .25s, transform .25s;
}
.cabin-button:hover { background: var(--t-accent, var(--cb-dark)); color: var(--t-accent-text, #fff); transform: translateY(-2px); }
.cabin-text-link { min-height: 0; padding: 4px 0 7px; border: 0; border-bottom: 1px solid currentColor; border-radius: 0; background: transparent; }
.cabin-text-link:hover { background: transparent; color: var(--cb-link); transform: none; }
.cabin-outline { border-color: currentColor; border-radius: 99px; padding: 14px 28px; min-height: 52px; font-size: 15px; font-weight: 700; }
.cabin-outline:hover { background: currentColor; color: var(--cb-white); }

/* Header — translucent blurred bar with the deep button notch. */
.cabin-header {
  position: fixed; top: 0; left: 50%; transform: translateX(-50%); z-index: 60;
  display: flex; align-items: center; gap: 28px; width: min(1290px, calc(100% - 48px));
  min-height: 62px; padding-left: 40px; border-radius: 0 0 30px 30px;
  background: rgba(255,255,255,.9); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
}
.cabin-brand { min-width: 0; max-width: 30%; padding: 0; border: 0; background: transparent; font: 500 25px/1 var(--cb-serif); text-align: left; }
.cabin-brand img { max-height: 48px; max-width: 180px; width: auto; object-fit: contain; }
.cabin-desktop-nav { display: flex; align-items: center; justify-content: flex-end; gap: clamp(12px, 2vw, 31px); width: 89%; margin-left: auto; }
.cabin-desktop-nav button { position: relative; overflow: hidden; padding: 20px 0 17px; border: 0; background: transparent; color: var(--t-text, #1f1f1f); font-size: 15px; font-weight: 700; line-height: 20px; text-decoration: none; white-space: nowrap; }
.cabin-desktop-nav button span { display: none; }
.cabin-desktop-nav button::after { content: ""; position: absolute; left: 0; right: 100%; bottom: 15px; height: 1px; background: currentColor; transition: right .25s; }
.cabin-desktop-nav button:hover::after, .cabin-desktop-nav button[aria-current]::after { right: 0; }
.cabin-header-actions { display: flex; align-items: center; flex-shrink: 0; }
.cabin-header-book { min-height: 62px; padding: 18px 26px; border: 0; border-radius: 0 0 30px 30px; background: var(--cb-dark); color: #fff; font-size: 13px; font-weight: 700; line-height: 18px; transition: transform .2s; }
.cabin-header-book:hover { transform: scale(1.03); opacity: 1; color: #fff; }
.cabin-header-book span { display: none; }
.cabin-menu-toggle { display: none; width: 62px; height: 62px; padding: 18px; border: 0; background: transparent; }
.cabin-menu-toggle span { display: block; height: 1px; width: 26px; background: currentColor; margin-block: 7px; }

/* Hero — full-bleed cabin photograph and a single rotating serif word. */
.cabin-hero {
  position: fixed; top: 0; left: 50%; transform: translateX(-50%); z-index: 0;
  isolation: isolate; width: min(1290px, calc(100% - 48px)); height: 850px;
  min-height: 680px; margin: 0; display: flex; align-items: flex-end; overflow: hidden; color: #fff;
}
.cabin-hero-spacer { height: 850px; }
.cabin-hero-images { position: absolute; inset: 0; z-index: -2; overflow: hidden; }
.cabin-hero-images > div { position: absolute; inset: 0; opacity: 0; transition: opacity 1s ease; }
.cabin-hero-images > div.is-current { opacity: 1; }
.cabin-hero-images img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.04); transition: transform 7s ease-out; }
.cabin-hero-images .is-current img { transform: scale(1); }
.cabin-hero::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(22,22,22,.12) 0%, rgba(22,22,22,.06) 45%, rgba(22,22,22,.55) 100%); }
.cabin-hero-copy { padding-bottom: 112px; }
.cabin-hero h1 { display: block; max-width: 70%; color: #fff; font-family: var(--cb-serif); font-size: clamp(3.5rem, 8vw, 96px); font-weight: 500; line-height: 1.02; animation: cabin-word-in .9s cubic-bezier(.22,1,.36,1) both; }
.cabin-hero-bottom { display: flex; align-items: flex-end; gap: 30px; margin-top: 56px; }
.cabin-hero-bottom p { max-width: 340px; color: #fff; }
.cabin-hero-controls { position: absolute; bottom: 54px; left: 50%; display: flex; align-items: center; gap: 14px; transform: translateX(-50%); }
.cabin-hero-controls > button { width: 9px; height: 9px; padding: 0; border: 1px solid #fff; border-radius: 50%; background: transparent; }
.cabin-hero-controls > button[aria-pressed=true] { background: #fff; }
.cabin-hero-controls > .cabin-hero-pause { width: 28px; height: 28px; border: 0; color: #fff; font-size: 15px; }
.cabin-round-link { display: flex; align-items: center; gap: 24px; margin-left: auto; padding: 0; border: 0; background: transparent; color: #fff; }
.cabin-round-link span { display: grid; place-items: center; width: 72px; height: 72px; border: 1px solid rgba(255,255,255,.6); border-radius: 50%; font-size: 32px; transition: transform .25s; }
.cabin-round-link:hover span { transform: translateY(4px); }
.cabin-scroll { display: flex; align-items: center; gap: 16px; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-decoration: none; text-transform: uppercase; white-space: nowrap; }
.cabin-scroll span { display: grid; place-items: center; width: 64px; height: 64px; border: 1px solid rgba(255,255,255,.55); border-radius: 50%; font-size: 26px; }
.cabin-scroll:hover { color: #fff; }
@keyframes cabin-word-in { from { opacity: 0; transform: translate3d(0,100%,0) rotateX(-60deg); } to { opacity: 1; transform: translate3d(0,0,0) rotateX(0); } }

/* White sheet that scrolls up over the fixed hero, matching the reference card overlap. */
.cabin-content-sheet {
  position: relative; z-index: 1; width: min(1290px, calc(100% - 48px));
  margin-inline: auto; overflow: hidden; border-radius: 60px;
  background: var(--cb-white);
}
.cabin-content-sheet .cabin-shell { width: 100%; }
.cabin-rounded { margin-top: -50px; }
.cabin-intro { text-align: center; padding-top: 112px; }
.cabin-intro h2 { max-width: 1060px; margin-inline: auto; }
.cabin-intro-links { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 0; margin-top: 80px; text-align: left; }
.cabin-intro-links > div { padding: 30px 40px; border-right: 1px solid var(--cb-line); }
.cabin-intro-links > div:last-child { border-right: 0; }
.cabin-intro-links p { margin-top: 20px; color: var(--cb-muted); }
.cabin-intro-icon { display: grid; place-items: center; width: 70px; height: 70px; margin-bottom: 22px; border: 1px solid var(--cb-line); border-radius: 20px; font: 300 30px/1 var(--cb-serif); }

/* Rotated photo collage. */
.cabin-collage-section { padding-block: 20px 80px; padding-inline: 0; }
.cabin-collage { position: relative; height: clamp(420px, 55vw, 720px); border-radius: 60px; overflow: hidden; background: #d4d6cd; }
.cabin-collage-grid { position: absolute; inset: -40%; display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); grid-template-rows: repeat(3,1fr); gap: 20px; transform: rotate(-27deg); }
.cabin-collage-grid button { min-width: 0; min-height: 0; padding: 0; border: 0; border-radius: 32px; overflow: hidden; background: var(--cb-surface); }
.cabin-collage-grid img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s; }
.cabin-collage-grid button:hover img { transform: scale(1.05); }
.cabin-collage-title { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.2); color: #fff; text-align: center; pointer-events: none; }
.cabin-collage-title h2 { max-width: 10ch; color: #fff; font-size: clamp(2.5rem, 4.6vw, 58px); line-height: 1.1; font-weight: 500; }
.cabin-call-curve { position: absolute; right: 0; bottom: 0; z-index: 2; display: flex; align-items: center; gap: 16px; max-width: 420px; padding: 34px 40px 34px 50px; border-radius: 60px 0 60px 0; background: var(--cb-white); color: var(--t-text, #1f1f1f); font-size: 15px; font-weight: 700; text-decoration: none; }
.cabin-call-curve:hover { color: var(--cb-link); }
.cabin-call-curve::before { content: ""; width: 44px; height: 44px; border-radius: 50%; background: var(--cb-surface) url("https://cdn.prod.website-files.com/66fef51bb2a32743f5bfff90/66fef51bb2a32743f5c0002d_Logo.png") center/26px no-repeat; }

/* Section headings used by Discover, Amenities, Cabins and Pricing. */
.cabin-section-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; margin-bottom: 60px; }
.cabin-section-heading h2, .cabin-big-heading h2 { font-size: clamp(1.9rem, 3.4vw, 42px); font-weight: 500; line-height: 1.25; }
.cabin-section-heading p, .cabin-big-heading p { max-width: 700px; font-family: var(--cb-serif); font-size: clamp(1.35rem, 2.2vw, 28px); font-weight: 300; line-height: 1.45; text-indent: 23%; }
.cabin-section-heading > p { max-width: 420px; font-family: var(--cb-sans); font-size: 18px; line-height: 26px; text-indent: 0; color: var(--cb-muted); }
.cabin-big-heading { margin-bottom: 60px; }
.cabin-big-heading.center { text-align: center; }
.cabin-big-heading.center p { margin-inline: auto; }

/* Discover — three tall photographs and a bordered call-out. */
.cabin-discover-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 26px; }
.cabin-discover-grid > div { min-width: 0; }
.cabin-discover-grid .cabin-image-button { height: 100%; min-height: 460px; }
.cabin-discover-grid img { width: 100%; height: 100%; min-height: 460px; aspect-ratio: .7; object-fit: cover; border-radius: 45px; }
.cabin-discover-cta { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; min-height: 460px; padding: 35px 28px; border: 1px solid var(--cb-line); border-radius: 45px; }
.cabin-discover-cta h3 { margin-bottom: 26px; }
.cabin-discover-cta .cabin-button { margin-top: 10px; }

/* Amazing — alternating image and serif copy rows. */
.cabin-story-row { align-items: center; gap: clamp(30px, 6vw, 90px); margin-bottom: 80px; }
.cabin-story-row:last-child { margin-bottom: 0; }
.cabin-story-row.reverse > div:first-child { order: 2; }
.cabin-story-row .cabin-image-button img { width: 100%; aspect-ratio: .92; object-fit: cover; border-radius: 45px; }
.cabin-story-copy { padding: 20px 0; }
.cabin-story-copy h4 { margin-bottom: 30px; }
.cabin-story-copy p { max-width: 500px; font-family: var(--cb-serif); font-size: clamp(1.25rem, 2vw, 28px); font-weight: 300; line-height: 38px; text-indent: 23%; }
.cabin-corner-icon { display: grid; place-items: center; width: 77px; height: 77px; margin-top: 20px; border-radius: 30px; background: var(--cb-surface); font-size: 36px; }

/* Amenities — three expanding image panels and data counters. */
.cabin-expand-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 20px; margin-top: 70px; }
.cabin-expand-grid.is-expanding-0 { grid-template-columns: 1.5fr .8fr .8fr; }
.cabin-expand-grid.is-expanding-1 { grid-template-columns: .8fr 1.5fr .8fr; }
.cabin-expand-grid.is-expanding-2 { grid-template-columns: .8fr .8fr 1.5fr; }
.cabin-expand-card { position: relative; min-height: 520px; border-radius: 50px; overflow: hidden; transition: flex-grow .5s; }
.cabin-expand-card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cabin-expand-card::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.5)); }
.cabin-expand-card button { position: relative; z-index: 1; display: flex; align-items: flex-end; width: 100%; height: 100%; padding: 40px; border: 0; background: transparent; color: #fff; text-align: left; }
.cabin-expand-card h3 { color: #fff; font-size: clamp(2rem, 3.6vw, 44px); font-weight: 300; line-height: 1.15; }
.cabin-stats { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 30px; margin-top: 120px; padding-top: 60px; border-top: 1px solid var(--cb-line); }
.cabin-stats-block { display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: start; }
.cabin-stats-number { font: 500 clamp(3.5rem, 7vw, 110px)/1 var(--cb-serif); }
.cabin-stats-sign { font: 500 clamp(2rem, 3vw, 42px)/1 var(--cb-serif); }
.cabin-stats-block h3 { font-size: 20px; font-family: var(--cb-sans); font-weight: 700; }
.cabin-stats-block p { margin-top: 10px; color: var(--cb-muted); font-size: 16px; line-height: 24px; }

/* Cabins / stays — one large feature and two supporting cards. */
.cabin-works { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
.cabin-works-side { display: grid; grid-template-rows: 1fr 1fr; gap: 26px; }
.cabin-work-card { display: flex; flex-direction: column; min-width: 0; }
.cabin-work-image { position: relative; display: block; width: 100%; flex: 1; min-height: 300px; padding: 0; border: 0; border-radius: 40px; overflow: hidden; background: var(--cb-surface); }
.cabin-works > .cabin-work-card > .cabin-work-image { min-height: 620px; }
.cabin-work-image img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s; }
.cabin-work-image:hover img { transform: scale(1.04); }
.cabin-work-hover { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(22,22,22,.35); color: #fff; font: 300 30px/1 var(--cb-serif); opacity: 0; transition: opacity .3s; }
.cabin-work-image:hover .cabin-work-hover { opacity: 1; }
.cabin-work-meta { display: flex; gap: 28px; padding: 22px 8px 0; }
.cabin-work-meta small { color: var(--cb-muted); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
.cabin-work-meta a, .cabin-work-meta button { font: 400 20px/26px var(--cb-serif); text-decoration: none; }

/* Pricing — deep rounded panel with three plan cards. */
.cabin-pricing { padding-block: clamp(90px, 12vw, 200px) 100px; padding-inline: 0; }
.cabin-pricing .dark-bg { position: relative; border-radius: 60px; background: var(--cb-dark); padding: clamp(70px, 9vw, 150px) 40px 80px; overflow: hidden; }
.cabin-pricing .radial-container { position: absolute; inset: 0; pointer-events: none; }
.cabin-pricing .radial-container > div { position: absolute; border: 1px solid rgba(255,255,255,.06); border-radius: 50%; }
.cabin-pricing .circle-big { width: 800px; height: 800px; top: -420px; left: 50%; transform: translateX(-50%); }
.cabin-pricing .circle-medium { width: 500px; height: 500px; top: -260px; left: 50%; transform: translateX(-50%); }
.cabin-pricing .circle-small { width: 260px; height: 260px; top: -130px; left: 50%; transform: translateX(-50%); }
.cabin-pricing .circle-micro { width: 110px; height: 110px; top: -50px; left: 50%; transform: translateX(-50%); }
.cabin-pricing .heading-large-center { position: relative; text-align: center; margin-bottom: 70px; }
.cabin-pricing .heading-large-center .cabin-kicker { color: #d6d6d6; }
.cabin-pricing .heading-large-center .cabin-kicker + h4 { margin-bottom: 24px; }
.cabin-pricing .heading-large-center > p:last-child { max-width: 620px; margin-inline: auto; color: #d6d6d6; }
.cabin-pricing h4 { color: #fff; }
.cabin-price-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 24px; position: relative; }
.cabin-price-grid article { position: relative; padding: 38px 30px; border: 1px solid var(--cb-line); border-radius: 40px; background: #fff; color: var(--t-text, #1f1f1f); }
.cabin-price-grid article.dark { background: #292929; color: #fff; border-color: rgba(255,255,255,.2); }
.cabin-price-grid h3 { font: 500 24px/1.2 var(--cb-sans); }
.cabin-price { margin-block: 22px !important; font: 400 clamp(2.6rem, 4vw, 70px)/1 var(--cb-serif); }
.cabin-price small { font: 500 18px/1 var(--cb-sans); }
.cabin-price-grid article > p:not(.cabin-price) { color: var(--cb-muted); font-size: 16px; line-height: 24px; }
.cabin-price-grid article.dark > p:not(.cabin-price) { color: #d6d6d6; }
.cabin-price-grid ul { padding: 0; margin: 28px 0; list-style: none; }
.cabin-price-grid li { border-top: 1px solid rgba(128,128,128,.35); padding-block: 14px; font-size: 15px; }
.cabin-price-grid details summary { display: flex; justify-content: space-between; gap: 12px; cursor: pointer; list-style: none; }
.cabin-price-grid details summary::-webkit-details-marker { display: none; }
.cabin-price-grid details summary::after { content: "+"; font-size: 18px; }
.cabin-price-grid details[open] summary::after { content: "−"; }
.cabin-price-grid details p { padding: 10px 0 14px; color: var(--cb-muted); font-size: 14px; line-height: 22px; }
.cabin-badge { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); padding: 8px 22px; border-radius: 99px; background: var(--cb-link); color: #fff; font-size: 13px; font-weight: 700; }
.cabin-people { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 20px; margin-top: 90px; }
.cabin-people figure { position: relative; min-width: 0; }
.cabin-people img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 50%; }
.cabin-people figcaption { margin-top: 18px; text-align: center; font-family: var(--cb-serif); font-size: 24px; }
.cabin-people small { display: block; font: 700 12px/18px var(--cb-sans); letter-spacing: .08em; text-transform: uppercase; color: var(--cb-muted); }
.cabin-price-grid .cabin-button { width: 100%; }

/* FAQ accordion. */
.cabin-faq-layout { display: grid; grid-template-columns: 1fr 1.3fr; gap: 70px; }
.cabin-faq-layout h2 + p { margin-top: 24px; color: var(--cb-muted); }
.cabin-faqs details { border-bottom: 1px solid var(--cb-line); }
.cabin-faqs summary { display: flex; justify-content: space-between; gap: 24px; padding: 22px 0; list-style: none; cursor: pointer; font-size: clamp(1.1rem, 1.8vw, 25px); }
.cabin-faqs summary::-webkit-details-marker { display: none; }
.cabin-faqs details p { padding-bottom: 24px; color: var(--cb-muted); }
.cabin-faqs summary span { display: inline-grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--cb-line); border-radius: 50%; font-size: 18px; transition: transform .25s; }
.cabin-faqs details[open] summary span { transform: rotate(45deg); }

/* Testimonial cards. */
.cabin-reviews { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 28px; margin-block: 40px; }
.cabin-reviews figure { display: flex; flex-direction: column; padding: 34px; border: 1px solid var(--cb-line); border-radius: 30px; }
.cabin-reviews .cabin-kicker { font-size: 15px; }
.cabin-review blockquote, .cabin-reviews blockquote { flex: 1; font-family: var(--cb-serif); font-size: clamp(1.3rem, 2.2vw, 25px); font-weight: 300; line-height: 1.4; }
.cabin-review-dots { display: flex; justify-content: center; gap: 12px; margin-block: 30px; }
.cabin-review-dots button { width: 12px; height: 12px; padding: 0; border: 1px solid currentColor; border-radius: 50%; background: transparent; }
.cabin-review-dots button[aria-pressed=true] { background: currentColor; }
.cabin-stars { color: var(--cb-link); letter-spacing: 3px; }
.cabin-review figcaption, .cabin-reviews figcaption { display: flex; align-items: center; gap: 14px; margin-top: 26px; font-weight: 700; }
.cabin-avatar { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; background: var(--cb-surface); font-family: var(--cb-serif); font-size: 22px; }

/* Stay enquiry / contact band. */
.cabin-request { border-radius: 60px; background: var(--cb-dark); color: #fff; }
.cabin-request h2, .cabin-request h3 { color: #fff; }
.cabin-request .cabin-kicker { color: #d6d6d6; }
.cabin-request .cabin-split > div > p:not(.cabin-kicker) { max-width: 500px; color: #e0e0e0; }
.cabin-request img { width: 100%; max-height: 240px; margin-top: 38px; border-radius: 35px; object-fit: cover; }
.cabin-form { min-width: 0; padding: clamp(28px, 4vw, 48px); border-radius: 35px; background: #fff; color: var(--t-text, #1f1f1f); }
.cabin-form h2, .cabin-form h3 { color: var(--t-text, #1f1f1f); }
.cabin-form > h3 { margin-bottom: 28px !important; }
.cabin .tp-label { display: block; font-weight: 700; font-size: 15px; margin-bottom: 8px; }
.cabin .tp-input { width: 100%; min-width: 0; min-height: 52px; padding: 12px 16px; border: 1px solid var(--cb-line); border-radius: 12px; background: var(--cb-surface); color: var(--t-text, #1f1f1f); }
.cabin .tp-btn, .cabin .tp-tab { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 12px 24px; border: 1px solid var(--cb-dark); border-radius: 99px; background: var(--cb-dark); color: #fff; font-size: 15px; font-weight: 700; }
.cabin .tp-btn:hover { opacity: .85; color: #fff; }
.cabin .tp-tab { background: #fff; color: var(--t-text, #1f1f1f); }
.cabin .tp-tab[aria-pressed=true] { background: var(--cb-dark); color: #fff; }
.cabin .tp-soft, .cabin .tp-card { background: var(--cb-surface); }
.cabin .tp-muted { color: var(--cb-muted); }
.cabin-form form > div, .cabin-dialog form > div { min-width: 0; }
.cabin-form button[type=submit], .cabin-dialog button[type=submit] { width: 100%; margin-top: 16px; }

/* Feature grid and latest updates. */
.cabin-features-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 30px 40px; margin-top: 60px; }
.cabin-feature { padding-top: 22px; border-top: 1px solid var(--cb-line); }
.cabin-feature h3 { margin-bottom: 12px; }
.cabin-feature p { color: var(--cb-muted); }
.cabin-features-grid + .cabin-center { margin-top: 50px; }
.cabin-feature + .cabin-center { grid-column: 1 / -1; }
.cabin-updates-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 26px; margin-top: 60px; }
.cabin-update img { width: 100%; aspect-ratio: 1.25; object-fit: cover; border-radius: 40px; }
.cabin-update small { display: block; margin-top: 22px; color: var(--cb-muted); font-size: 13px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
.cabin-update h3 { margin-block: 12px; }
.cabin-update p { color: var(--cb-muted); }
.cabin-update .cabin-text-link { margin-top: 14px; }

.cabin-instagram { padding-block: 40px 140px; padding-inline: clamp(20px, 3.5vw, 56px); }
.cabin-instagram-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; }
.cabin-instagram-grid button { position: relative; padding: 0; border: 0; border-radius: 30px; overflow: hidden; background: var(--cb-surface); }
.cabin-instagram-grid img { width: 100%; aspect-ratio: 1; object-fit: cover; transition: transform .5s; }
.cabin-instagram-grid button:hover img { transform: scale(1.05); }
.cabin-instagram-grid::after { content: ""; }
.cabin-instagram-label { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.cabin-instagram-label h2 { font-size: clamp(2rem, 3vw, 40px); }

/* Footer — matches the header/content sheet width and stays above the fixed home hero. */
.cabin-footer {
  position: relative; z-index: 2; width: min(1290px, calc(100% - 48px));
  margin: -50px auto 0; padding: 96px clamp(24px, 4vw, 48px);
  border-radius: 60px; background: var(--cb-dark); color: #fff;
}
.cabin-footer .cabin-shell { width: 100%; }
.cabin-footer-grid { display: grid; grid-template-columns: 1.6fr .6fr 1fr; gap: 60px; padding-bottom: 70px; }
.cabin-footer-intro h2 { margin-block: 30px; max-width: 8ch; }
.cabin-footer-intro p { max-width: 360px; color: #d6d6d6; }
.cabin-footer .cabin-brand { max-width: 100%; color: #fff; }
.cabin-footer h3 { font: 700 16px/1.4 var(--cb-sans); margin-bottom: 24px; }
.cabin-footer nav button { display: block; padding: 6px 0; border: 0; background: transparent; color: #fff; text-align: left; }
.cabin-footer a { color: #fff; text-decoration: none; }
.cabin-footer :where(a,nav button):hover { color: var(--cb-link); text-decoration: underline; text-underline-offset: 5px; }
.cabin-footer address { display: grid; gap: 10px; margin-top: 20px; font-style: normal; }
.cabin-footer .cabin-hours-list { font-size: .85rem; }
.cabin-copyright { border-top: 1px solid #ffffff35; padding-block: 24px; font-size: .85rem; color: #d6d6d6; }
.cabin-contact-details, .cabin-footer address { display: grid; gap: 12px; font-style: normal; margin-top: 20px; }
.cabin-map { width: 100%; height: 420px; margin-top: 40px; border: 0; border-radius: 30px; }
.cabin-hours-list { margin-top: 24px; }
.cabin-hours-list > div { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid currentColor; }
.cabin-hours-list dd { text-align: right; }
.cabin-socials { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 24px; }
.cabin-socials a { display: grid; place-items: center; min-width: 32px; min-height: 36px; color: inherit; text-decoration: none; }
.cabin-socials svg { width: 20px; height: 20px; }

/* Inner pages. */
.cabin-page-hero { position: relative; isolation: isolate; width: min(1290px, calc(100% - 48px)); margin-inline: auto; padding-block: clamp(120px, 14vw, 200px); padding-inline: clamp(20px, 3.5vw, 56px); background: var(--cb-dark); color: #fff; text-align: center; border-radius: 0 0 60px 60px; overflow: hidden; }
.cabin-page-hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
.cabin-page-hero::after { content: ""; position: absolute; inset: 0; background: rgba(17,17,17,.55); z-index: -1; }
.cabin-page-hero .cabin-kicker { color: inherit; }
.cabin-page-intro { margin: 22px auto 0; max-width: 62ch; font-family: var(--cb-serif); font-size: 24px; font-weight: 300; line-height: 34px; }
.cabin-cards { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 28px; }
.cabin-cards article { position: relative; height: 100%; border: 1px solid var(--cb-line); border-radius: 32px; overflow: hidden; }
.cabin-cards article img { width: 100%; aspect-ratio: .95; object-fit: cover; transition: transform .65s; }
.cabin-cards article:hover img { transform: scale(1.035); }
.cabin-cards article > div { padding: 26px; }
.cabin-cards :where(h2,h3) + p, .cabin-cards p + p { margin-top: 14px; }
.cabin-cards h2 { font-size: 2.3rem; }
.cabin-card-action { margin-top: 20px; padding: 6px 0; border: 0; border-bottom: 1px solid currentColor; background: transparent; }
.cabin-card-action::after { content: ""; position: absolute; inset: 0; }
.cabin-card-action:focus-visible::after { outline: 3px solid currentColor; outline-offset: -4px; border-radius: 30px; }
.cabin-cards.cabin-product-cards { --card-gap: 28px; display: flex; flex-wrap: wrap; justify-content: center; gap: var(--card-gap); }
.cabin-product-cards > * { flex: 0 0 calc((100% - 2 * var(--card-gap)) / 3); min-width: 0; }
.cabin-gallery button, .cabin-image-button, .cabin-thumbnails button { display: block; width: 100%; padding: 0; border: 0; background: transparent; overflow: hidden; border-radius: 26px; }
.cabin-gallery img { width: 100%; aspect-ratio: 1.25; object-fit: cover; transition: transform .6s; }
.cabin-gallery button:hover img { transform: scale(1.04); }
.cabin-related { margin-top: clamp(40px, 6vw, 80px); }
.cabin-related > h2 { text-align: center; margin-bottom: 32px; }
.cabin-item-detail { margin-top: 32px; }
.cabin-item-detail img { width: 100%; aspect-ratio: 1.15; object-fit: cover; }
.cabin-thumbnails { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10px; margin-top: 10px; }
.cabin-amenities { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px 24px; list-style: none; padding: 0; margin-top: 24px; }
.cabin-amenities li { padding: 10px 0; border-bottom: 1px solid var(--cb-line); }
.cabin-narrative { margin-top: 28px; }
.cabin-narrative p { white-space: pre-line; }
.cabin-split { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: clamp(28px,6vw,90px); align-items: center; }
.cabin-split > div { min-width: 0; }
.cabin-split > img { width: 100%; aspect-ratio: 1.1; object-fit: cover; border-radius: 40px; }
.cabin-split :where(h1,h2,h3) + p, .cabin-split p + p { margin-top: 20px; }
.cabin-split .cabin-button { margin-top: 28px; }
.cabin-split p:not(.cabin-kicker,.cabin-price) { color: var(--cb-muted); }
.cabin-job-list { padding: 0; list-style: none; margin-bottom: 32px; }
.cabin-job-list li { padding-block: 20px; border-bottom: 1px solid var(--cb-line); }
.cabin-job-list small { display: block; }
.cabin-career-cta > * { margin-top: 24px; }
.cabin-partner-form { margin-inline: auto; }

/* Dialogs. */
.cabin-dialog { position: fixed; inset: 0; margin: auto; width: min(620px,calc(100% - 24px)); max-height: calc(100dvh - 24px); overflow: auto; padding: 0; border: 1px solid var(--cb-line); border-radius: 35px; background: var(--t-bg, #fff); color: var(--t-text, #1f1f1f); }
.cabin-dialog::backdrop { background: rgba(18,21,21,.55); backdrop-filter: blur(5px); }
.cabin-dialog-inner { position: relative; padding: clamp(28px,5vw,48px); }
.cabin-dialog-close { position: absolute; right: 12px; top: 10px; width: 44px; height: 44px; padding: 0; border: 0; background: transparent; font-size: 32px; }
.cabin-dialog h2, .cabin-form h2 { font-size: clamp(1.75rem,3vw,2rem); margin-bottom: 24px; }
.cabin-drawer { width: min(640px,100%); max-width: 100%; max-height: 100dvh; margin: 0 0 0 auto; border: 0; border-radius: 0 0 0 40px; transform: translateY(-30px); opacity: 0; transition: transform .4s, opacity .4s, display .4s allow-discrete, overlay .4s allow-discrete; }
.cabin-drawer[open] { transform: translateY(0); opacity: 1; }
@starting-style { .cabin-drawer[open] { transform: translateY(-30px); opacity: 0; } }
.cabin-drawer-top { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.cabin-drawer-top .cabin-brand { max-width: 80%; }
.cabin-drawer-top .cabin-dialog-close { position: static; }
.cabin-drawer nav { display: grid; margin-block: 30px; }
.cabin-drawer nav button { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border: 0; border-bottom: 1px solid var(--cb-line); background: transparent; text-align: left; font: 400 clamp(1.8rem,5vw,2.8rem)/1.15 var(--cb-serif); }
.cabin-drawer nav button span { font-size: 1.2rem; }
.cabin-drawer nav button[aria-current] { opacity: .55; }

/* Responsive. */
@media (max-width: 991px) {
  .cabin-shell { width: calc(100% - 52px); }
  .cabin-desktop-nav { display: none; }
  .cabin-menu-toggle { display: block; }
  .cabin-header { padding-inline: 26px 0; }
  .cabin-header-book { border-radius: 0; }
  .cabin-hero h1 { max-width: 100%; }
  .cabin-discover-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .cabin-discover-grid img, .cabin-discover-grid .cabin-image-button, .cabin-discover-cta { min-height: 340px; }
  .cabin-people { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .cabin-cards, .cabin-reviews, .cabin-pricing .cabin-price-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .cabin-product-cards > * { flex-basis: calc((100% - var(--card-gap)) / 2); }
  .cabin-footer-grid { gap: 30px; grid-template-columns: 1.4fr .7fr 1fr; }
}
@media (max-width: 991px) {
  .cabin-hero { height: 600px; min-height: 600px; }
  .cabin-hero-spacer { height: 600px; }
  .cabin-rounded { margin-top: -304px; }
}
@media (max-width: 767px) {
  .cabin-header, .cabin-hero, .cabin-content-sheet, .cabin-shell, .cabin-page-hero { width: calc(100% - 24px); }
  .cabin-header { min-height: 66px; gap: 12px; padding-left: 20px; border-radius: 0 0 24px 24px; }
  .cabin-brand { max-width: 45%; }
  .cabin-brand img { max-width: 130px; }
  .cabin-header-actions { margin-left: auto; }
  .cabin-header-book { display: none; }
  .cabin-menu-toggle { width: 66px; height: 66px; }
  .cabin-hero { height: 500px; min-height: 500px; margin-top: 0; }
  .cabin-hero-spacer { height: 500px; }
  .cabin-rounded { margin-top: -400px; }
  .cabin-hero-copy { padding-bottom: 110px; }
  .cabin-hero h1 { font-size: clamp(3.25rem, 13vw, 5rem); line-height: 1.05; }
  .cabin-hero-bottom { flex-wrap: wrap; gap: 22px; margin-top: 30px; }
  .cabin-hero-bottom p { width: 100%; max-width: 100%; }
  .cabin-round-link { gap: 12px; font-size: 13px; }
  .cabin-round-link span { width: 46px; height: 46px; font-size: 22px; }
  .cabin-scroll { margin-left: auto; }
  .cabin-scroll span { width: 44px; height: 44px; font-size: 20px; }
  .cabin-hero-controls { bottom: 56px; }
  .cabin-content-sheet, .cabin-footer { border-radius: 32px; }
  .cabin-pricing .dark-bg, .cabin-request, .cabin-page-hero { border-radius: 32px 32px 0 0; }
  .cabin-intro { padding-top: 80px; }
  .cabin-intro-links { grid-template-columns: minmax(0,1fr); gap: 0; margin-top: 50px; }
  .cabin-intro-links > div { border-right: 0; border-bottom: 1px solid var(--cb-line); padding: 24px 0; }
  .cabin-collage { border-radius: 32px; }
  .cabin-call-curve { right: -20px; bottom: -20px; padding: 22px; font-size: 12px; }
  .cabin-call-curve::before { width: 32px; height: 32px; }
  .cabin-section-heading, .cabin-faq-layout { grid-template-columns: minmax(0,1fr); display: grid; gap: 26px; }
  .cabin-section-heading > p { max-width: 100%; }
  .cabin-discover-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .cabin-expand-grid, .cabin-expand-grid[class*="is-expanding-"], .cabin-works, .cabin-reviews, .cabin-pricing .cabin-price-grid, .cabin-features-grid, .cabin-updates-grid, .cabin-instagram-grid { grid-template-columns: minmax(0,1fr); }
  .cabin-works-side { grid-template-rows: none; }
  .cabin-expand-card { min-height: 320px; }
  .cabin-expand-card h3 { font-size: 32px; line-height: 1.15; }
  .cabin-stats { grid-template-columns: minmax(0,1fr); margin-top: 70px; }
  .cabin-discover-grid img, .cabin-discover-grid .cabin-image-button, .cabin-discover-cta { min-height: 260px; border-radius: 32px; }
  .cabin-story-row.reverse > div:first-child { order: 0; }
  .cabin-story-copy p { text-indent: 0; font-size: 22px; line-height: 32px; }
  .cabin-works > .cabin-work-card > .cabin-work-image { min-height: 360px; }
  .cabin-split { grid-template-columns: minmax(0,1fr); gap: 36px; }
  .cabin-footer { width: calc(100% - 24px); margin-top: -32px; padding: 64px 24px 0; }
  .cabin-footer-grid { grid-template-columns: 1fr 1fr; }
  .cabin-footer-intro { grid-column: 1 / -1; }
  .cabin-footer-intro h2 { max-width: 100%; }
  .cabin-product-cards > * { flex-basis: 100%; }
  .cabin-people { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 479px) {
  .cabin-hero { height: 630px; min-height: 630px; }
  .cabin-hero-spacer { height: 630px; }
  .cabin-rounded { margin-top: -272px; }
  .cabin-cards, .cabin-gallery, .cabin-reviews, .cabin-amenities, .cabin-footer-grid, .cabin-people, .cabin-discover-grid { grid-template-columns: minmax(0,1fr); }
  .cabin-form form.grid, .cabin-dialog form.grid { grid-template-columns: minmax(0,1fr); }
  .cabin-form form.grid > *, .cabin-dialog form.grid > * { grid-column: 1 / -1; }
  .cabin-scroll { gap: 8px; }
  .cabin-collage-title h2 { font-size: 3.2rem; }
}
@media (prefers-reduced-motion: reduce) {
  .cabin *, .cabin *::before, .cabin *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`;
