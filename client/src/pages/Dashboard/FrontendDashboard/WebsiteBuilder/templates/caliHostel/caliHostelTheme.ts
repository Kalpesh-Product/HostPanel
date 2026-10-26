import { WAYFARER_CSS } from "../wayfarer/wayfarerTheme";

export const CALI_HOSTEL_PALETTE = {
  bg: "#f2eadb",
  text: "#171711",
  accent: "#e86d43",
  surface: "#e5d7c1",
  raised: "#fffaf1",
  line: "rgba(23,23,17,.18)",
  muted: "#6f695e",
  ink: "#10100d",
  onInk: "#f5efdf",
};

export const CALI_HOSTEL_CSS = `
${WAYFARER_CSS}

@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');

.ch {
  --ch-sand: #f2eadb;
  --ch-cream: #fffaf1;
  --ch-ink: #10100d;
  --ch-coral: #e86d43;
  background: var(--t-bg,#f2eadb);
  color: var(--t-text,#171711);
  font-family: 'DM Sans',sans-serif;
}

.ch h1,
.ch h2,
.ch h3,
.ch h4 {
  font-family: 'Instrument Serif',serif;
  font-weight: 400;
  letter-spacing: -.035em;
}

.ch button {
  color: inherit;
}

.ch-shell {
  width: min(100% - 40px,1440px);
  margin-inline: auto;
}

.ch-dark {
  background: var(--ch-ink);
  color: #f5efdf;
}

.ch-label {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .19em;
  text-transform: uppercase;
}

.ch-label span {
  color: var(--ch-coral);
}

.ch-photo {
  position: relative;
  overflow: hidden;
  background: #2a2924;
}

.ch-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 1.1s cubic-bezier(.22,1,.36,1);
}

.ch-photo:hover img {
  transform: scale(1.045);
}

.ch-placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  font: italic 38px 'Instrument Serif';
  opacity: .45;
}

.ch-arrow {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 14px;
  transition: transform .25s,background .25s;
}

.ch button:hover .ch-arrow {
  transform: rotate(45deg);
  background: var(--ch-coral);
  border-color: var(--ch-coral);
  color: #fff;
}

.ch-text-link,
.ch-pill-link {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  background: none;
  border: 0;
  font-weight: 600;
  cursor: pointer;
}

.ch-pill-link {
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 9px 10px 9px 20px;
}

.ch-header {
  position: absolute;
  z-index: 50;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px;
}

.ch-nav-shell {
  max-width: 1440px;
  margin: auto;
  height: 66px;
  border-radius: 999px;
  padding: 8px 10px 8px 20px;
  display: grid;
  grid-template-columns: minmax(150px,1fr) auto minmax(150px,1fr);
  align-items: center;
  background: rgba(14,14,11,.76);
  color: #fff;
  backdrop-filter: blur(14px);
  box-shadow: 0 20px 70px rgba(0,0,0,.18);
}

.ch-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: none;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.ch-brand img {
  height: 38px;
  max-width: 150px;
  object-fit: contain;
}

.ch-brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255,255,255,.45);
  border-radius: 50%;
  font: italic 20px 'Instrument Serif';
}

.ch-desktop-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ch-desktop-nav button {
  border: 0;
  background: none;
  padding: 12px 13px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .02em;
  opacity: .78;
  cursor: pointer;
  transition: opacity .2s;
}

.ch-desktop-nav button:hover,
.ch-desktop-nav .is-active {
  opacity: 1;
}

.ch-book-nav {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 0;
  border-radius: 999px;
  background: var(--ch-coral);
  padding: 14px 18px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.ch-menu,
.ch-mobile-panel {
  display: none;
}

.ch-hero {
  position: relative;
  height: min(930px,100svh);
  min-height: 700px;
  color: #fff;
  overflow: hidden;
  background: #111;
}

.ch-hero-image,
.ch-hero-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ch-hero-shade {
  background: linear-gradient(180deg,rgba(8,8,5,.18),rgba(8,8,5,.04) 35%,rgba(8,8,5,.72));
}

.ch-hero-copy {
  position: absolute;
  inset: auto max(20px,calc((100vw - 1440px)/2)) 54px;
}

.ch-hero-copy>p {
  text-transform: uppercase;
  letter-spacing: .2em;
  font-size: 11px;
  margin-bottom: 22px;
}

.ch-hero h1 {
  max-width: 1180px;
  font-size: clamp(64px,9.8vw,164px);
  line-height: .78;
}

.ch-hero-bottom {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 30px;
  margin-top: 32px;
  border-top: 1px solid rgba(255,255,255,.45);
  padding-top: 20px;
}

.ch-hero-bottom p {
  max-width: 450px;
  font-size: 15px;
  line-height: 1.7;
}

.ch-hero-bottom button,
.ch-final-copy button {
  display: flex;
  align-items: center;
  gap: 18px;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #111;
  padding: 10px 10px 10px 20px;
  font-weight: 600;
  cursor: pointer;
}

.ch-scroll-note {
  position: absolute;
  right: 24px;
  top: 50%;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 10px;
  letter-spacing: .16em;
  text-transform: uppercase;
  transform: rotate(90deg) translateX(50%);
  transform-origin: right;
}

.ch-scroll-note span {
  width: 48px;
  height: 1px;
  background: currentColor;
}

.ch-ticker {
  overflow: hidden;
  background: var(--ch-coral);
  color: #161511;
  padding: 16px 0;
}

.ch-ticker>div {
  display: flex;
  width: max-content;
  gap: 24px;
  align-items: center;
  animation: chTicker 24s linear infinite;
}

.ch-ticker span {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .1em;
}

.ch-ticker i {
  font-style: normal;
}

.ch-intro {
  padding: 140px 0 130px;
}

.ch-intro-grid {
  display: grid;
  grid-template-columns: 1.35fr .65fr;
  gap: 120px;
  align-items: end;
}

.ch-intro h2,
.ch-life h2 {
  font-size: clamp(58px,7.5vw,118px);
  line-height: .9;
  max-width: 930px;
}

.ch-intro-copy {
  padding-bottom: 12px;
}

.ch-intro-copy p {
  font-size: 18px;
  line-height: 1.75;
  opacity: .7;
  white-space: pre-line;
}

.ch-intro-copy button {
  color: #f5efdf;
  margin-top: 26px;
}

.ch-cinema {
  display: grid;
  grid-template-columns: 1.1fr .8fr .55fr;
  gap: 36px;
  align-items: end;
  margin-top: 120px;
}

.ch-cinema-a .ch-photo {
  height: 620px;
}

.ch-cinema-b .ch-photo {
  height: 450px;
  border-radius: 50% 50% 8px 8px;
}

.ch-cinema-c .ch-photo {
  height: 280px;
}

.ch-rooms {
  padding: 130px 0;
}

.ch-section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 60px;
  margin-bottom: 70px;
}

.ch-section-heading h2,
.ch-facts h2,
.ch-map-story h2,
.ch-related h2,
.ch-team h2,
.ch-careers h2 {
  font-size: clamp(54px,6vw,98px);
  line-height: .9;
  margin-top: 16px;
}

.ch-section-heading>p {
  max-width: 430px;
  line-height: 1.7;
  color: var(--t-muted);
}

.ch-room-list {
  border-top: 1px solid var(--t-line);
}

.ch-room-row {
  display: grid;
  grid-template-columns: 50px 250px minmax(220px,1fr) auto 40px;
  gap: 28px;
  align-items: center;
  width: 100%;
  padding: 24px 0;
  border: 0;
  border-bottom: 1px solid var(--t-line);
  background: none;
  text-align: left;
  cursor: pointer;
}

.ch-room-row>.ch-photo {
  height: 155px;
  border-radius: 90px;
}

.ch-room-index {
  font-size: 12px;
  align-self: start;
  padding-top: 10px;
}

.ch-room-info strong {
  display: block;
  font: 44px 'Instrument Serif';
  letter-spacing: -.03em;
}

.ch-room-info small {
  display: block;
  margin-top: 10px;
  color: var(--t-muted);
}

.ch-room-price {
  font-weight: 600;
}

.ch-rooms>.ch-shell>.ch-pill-link {
  margin-top: 40px;
}

.ch-life {
  display: grid;
  grid-template-columns: .75fr 1.25fr;
  gap: 80px;
  padding: 130px max(20px,calc((100vw - 1440px)/2));
}

.ch-life-sticky {
  position: sticky;
  top: 120px;
  height: max-content;
}

.ch-life-sticky h2 {
  font-size: clamp(56px,6vw,96px);
  margin-top: 20px;
}

.ch-life-sticky>p {
  max-width: 440px;
  line-height: 1.7;
  opacity: .65;
  margin-top: 28px;
}

.ch-life-scenes {
  display: flex;
  flex-direction: column;
  gap: 120px;
}

.ch-life-scene {
  position: relative;
}

.ch-life-scene .ch-photo {
  height: 620px;
}

.ch-life-scene.scene-2 {
  width: 75%;
  margin-left: auto;
}

.ch-life-scene.scene-2 .ch-photo {
  border-radius: 50% 50% 0 0;
}

.ch-life-scene.scene-3 {
  width: 84%;
}

.ch-life-scene>div:last-child {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-top: 16px;
}

.ch-life-scene h3 {
  font-size: 38px;
}

.ch-facts {
  padding: 130px 0;
}

.ch-facts h2 {
  max-width: 960px;
}

.ch-fact-grid {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  margin-top: 90px;
  border-top: 1px solid var(--t-line);
  border-bottom: 1px solid var(--t-line);
}

.ch-fact-grid>div {
  padding: 44px 28px;
  border-right: 1px solid var(--t-line);
}

.ch-fact-grid>div:last-child {
  border: 0;
}

.ch-fact-grid strong {
  display: block;
  font: clamp(48px,6vw,88px) 'Instrument Serif';
}

.ch-fact-grid span {
  color: var(--t-muted);
}

.ch-gallery-preview {
  padding: 40px 0 130px;
}

.ch-gallery-track {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding: 0 max(20px,calc((100vw - 1440px)/2)) 20px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.ch-gallery-track button {
  flex: 0 0 min(36vw,510px);
  height: 460px;
  border: 0;
  padding: 0;
  scroll-snap-align: start;
  background: none;
  overflow: hidden;
}

.ch-gallery-track button.is-tall {
  height: 560px;
}

.ch-gallery-track img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .7s;
}

.ch-gallery-track button:hover img {
  transform: scale(1.04);
}

.ch-map-story {
  background: #d8e0d5;
  padding: 130px 0;
}

.ch-map-grid {
  display: grid;
  grid-template-columns: .68fr 1.32fr;
  gap: 80px;
  align-items: center;
}

.ch-map-story p {
  margin: 30px 0;
  max-width: 420px;
  line-height: 1.7;
}

.ch-map-frame {
  height: 560px;
  overflow: hidden;
  border-radius: 50% 50% 0 0;
}

.ch-map-frame iframe,
.ch-map-frame .ch-photo {
  width: 100%;
  height: 100%;
  border: 0;
}

.ch-final-cta {
  height: 800px;
  position: relative;
  display: grid;
  place-items: center;
  color: #fff;
  overflow: hidden;
}

.ch-final-cta>.ch-photo,
.ch-final-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ch-final-overlay {
  background: rgba(10,10,8,.48);
}

.ch-final-copy {
  position: relative;
  text-align: center;
  max-width: 1100px;
  padding: 20px;
}

.ch-final-copy .ch-label {
  justify-content: center;
}

.ch-final-copy h2 {
  font-size: clamp(60px,8vw,132px);
  line-height: .84;
  margin: 22px 0 36px;
}

.ch-final-copy button {
  margin: auto;
}

.ch-footer {
  background: var(--ch-ink);
  color: #f5efdf;
  padding: 100px 0 28px;
}

.ch-footer-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,.18);
  padding-bottom: 60px;
}

.ch-footer-title strong {
  font: clamp(50px,7vw,110px) 'Instrument Serif';
}

.ch-footer-title span {
  font-size: 10px;
  letter-spacing: .22em;
}

.ch-footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 60px;
  padding: 60px 0;
}

.ch-footer-grid p,
.ch-footer-grid a {
  display: block;
  max-width: 380px;
  color: inherit;
  text-decoration: none;
  line-height: 1.7;
}

.ch-footer-kicker {
  font-size: 10px!important;
  letter-spacing: .2em;
  text-transform: uppercase;
  opacity: .55;
  margin-bottom: 16px;
}

.ch-socials {
  display: flex;
  gap: 16px;
}

.ch-footer-bottom {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid rgba(255,255,255,.15);
  padding-top: 24px;
  font-size: 11px;
  opacity: .55;
}

.ch-page-hero {
  padding: 150px 0 80px;
  min-height: 720px;
  background: var(--ch-sand);
}

.ch-page-hero-grid {
  display: grid;
  grid-template-columns: 1fr .76fr;
  gap: 80px;
  align-items: end;
}

.ch-page-copy h1 {
  font-size: clamp(68px,8vw,132px);
  line-height: .82;
  margin: 26px 0;
}

.ch-page-copy>p {
  max-width: 550px;
  line-height: 1.7;
  color: var(--t-muted);
  font-size: 17px;
}

.ch-page-hero-photo {
  height: 520px;
  border-radius: 50% 50% 8px 8px;
}

.ch-stays {
  padding: 100px 0 140px;
}

.ch-stay-row {
  display: grid;
  grid-template-columns: 1.05fr .95fr;
  gap: 70px;
  align-items: center;
  padding: 50px 0;
  border-bottom: 1px solid var(--t-line);
}

.ch-stay-photo {
  height: 520px;
  position: relative;
  border: 0;
  padding: 0;
  background: none;
  cursor: pointer;
}

.ch-stay-photo>.ch-photo {
  height: 100%;
}

.ch-stay-photo>span {
  position: absolute;
  top: 18px;
  left: 18px;
  background: var(--ch-coral);
  color: #fff;
  border-radius: 999px;
  padding: 8px 13px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .12em;
}

.ch-stay-body>p:first-child {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--t-muted);
}

.ch-stay-body h2 {
  font-size: clamp(48px,5vw,82px);
  margin: 18px 0;
}

.ch-stay-body button {
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
}

.ch-stay-desc {
  max-width: 520px;
  line-height: 1.75;
  color: var(--t-muted);
}

.ch-stay-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 48px;
  padding-top: 22px;
  border-top: 1px solid var(--t-line);
}

.ch-stay-actions button {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
}

.ch-service-index {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 60px;
  padding: 100px 0;
}

.ch-service-index>div:nth-child(3n) {
  grid-column: 1/-1;
  width: 50%;
  margin: auto;
}

.ch-service-index button {
  position: relative;
  width: 100%;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
}

.ch-service-index .ch-photo {
  height: 470px;
}

.ch-service-index h2 {
  font-size: 50px;
  margin-top: 16px;
}

.ch-service-index p {
  color: var(--t-muted);
  margin-top: 10px;
}

.ch-service-index .ch-arrow {
  position: absolute;
  right: 0;
  bottom: 0;
}

.ch-room-hero {
  padding: 130px 0 80px;
}

.ch-back {
  border: 0;
  background: none;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 42px;
}

.ch-room-hero h1 {
  font-size: clamp(70px,9vw,140px);
  line-height: .82;
}

.ch-room-hero>div>div>p {
  text-transform: uppercase;
  letter-spacing: .14em;
  font-size: 11px;
  color: var(--t-muted);
}

.ch-room-hero>div>div>strong {
  display: block;
  margin-top: 28px;
}

.ch-room-gallery {
  display: grid;
  grid-template-columns: 1.5fr .75fr .75fr;
  grid-template-rows: 250px 250px;
  gap: 18px;
  margin-top: 70px;
}

.ch-room-gallery button {
  border: 0;
  padding: 0;
  overflow: hidden;
}

.ch-room-gallery button:first-child {
  grid-row: 1/3;
}

.ch-room-gallery button:nth-child(4) {
  grid-column: 2/4;
}

.ch-room-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ch-room-detail {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 100px;
  padding-bottom: 130px;
}

.ch-room-detail h2 {
  font-size: 72px;
  margin: 20px 0;
}

.ch-room-description {
  font-size: 18px;
  line-height: 1.8;
  color: var(--t-muted);
  white-space: pre-line;
}

.ch-amenity-grid {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 12px;
  margin: 50px 0;
}

.ch-amenity-grid span {
  padding: 18px;
  border-top: 1px solid var(--t-line);
}

.ch-good-to-know {
  padding-top: 50px;
}

.ch-good-to-know h3 {
  font-size: 44px;
}

.ch-good-to-know dl {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 20px;
  margin: 28px 0;
}

.ch-good-to-know dt {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .14em;
  color: var(--t-muted);
}

.ch-good-to-know dd {
  margin: 7px 0 0;
}

.ch-good-to-know li {
  margin: 8px 0;
}

.ch-booking-card,
.ch-form-card {
  background: var(--ch-cream);
  padding: 34px;
  border: 1px solid var(--t-line);
}

.ch-booking-card {
  position: sticky;
  top: 100px;
  height: max-content;
}

.ch-booking-card>p {
  text-transform: uppercase;
  letter-spacing: .14em;
  font-size: 10px;
}

.ch-booking-card h3 {
  font-size: 42px;
  margin: 10px 0 28px;
}

.ch-related {
  background: var(--ch-ink);
  color: #f5efdf;
  padding: 120px 0;
}

.ch-related h2 {
  max-width: 800px;
  margin: 20px 0 60px;
}

.ch-related-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 22px;
}

.ch-related-grid button {
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.ch-related-grid .ch-photo {
  height: 340px;
}

.ch-related-grid h3 {
  font-size: 34px;
  margin: 16px 0 4px;
}

.ch-about-story {
  padding: 130px 0;
}

.ch-about-story h2 {
  font-size: clamp(62px,8vw,126px);
  max-width: 1100px;
  line-height: .86;
}

.ch-about-collage {
  display: grid;
  grid-template-columns: 1fr .55fr .7fr;
  gap: 50px;
  align-items: center;
  margin-top: 100px;
}

.ch-about-collage>div:first-child .ch-photo {
  height: 570px;
}

.ch-about-collage>div:last-child .ch-photo {
  height: 390px;
  border-radius: 50% 50% 0 0;
}

.ch-about-collage p {
  line-height: 1.8;
  white-space: pre-line;
  opacity: .7;
}

.ch-values {
  padding: 120px 0;
}

.ch-values>div {
  display: grid;
  grid-template-columns: 80px 1fr 1fr;
  gap: 30px;
  padding: 32px 0;
  border-bottom: 1px solid var(--t-line);
}

.ch-values h3 {
  font-size: 40px;
}

.ch-values p {
  line-height: 1.7;
  color: var(--t-muted);
}

.ch-team {
  background: #d8e0d5;
  padding: 120px 0;
}

.ch-team-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 50px 24px;
  margin-top: 60px;
}

.ch-team-grid .ch-photo {
  height: 440px;
  border-radius: 50% 50% 0 0;
}

.ch-team-grid h3 {
  font-size: 34px;
  margin-top: 15px;
}

.ch-team-grid p {
  color: var(--t-muted);
}

.ch-gallery-page {
  display: grid;
  grid-template-columns: repeat(12,1fr);
  grid-auto-rows: 120px;
  gap: 16px;
  padding: 100px 0;
}

.ch-gallery-page>div {
  grid-column: span 4;
  grid-row: span 3;
}

.ch-gallery-page>div:has(.is-wide) {
  grid-column: span 8;
}

.ch-gallery-page>div:has(.is-tall) {
  grid-row: span 5;
}

.ch-gallery-page button,
.ch-gallery-page img {
  width: 100%;
  height: 100%;
  border: 0;
  padding: 0;
  object-fit: cover;
}

.ch-reviews {
  padding: 100px 0;
}

.ch-review-intro {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 70px;
}

.ch-review-intro h2 {
  font-size: 52px;
}

.ch-reviews blockquote {
  display: grid;
  grid-template-columns: 100px 1fr 220px;
  gap: 30px;
  padding: 55px 0;
  border-top: 1px solid var(--t-line);
  margin: 0;
}

.ch-reviews blockquote>span {
  font: 100px 'Instrument Serif';
  line-height: .5;
  color: var(--ch-coral);
}

.ch-reviews blockquote>p {
  font: clamp(30px,3vw,48px)/1.1 'Instrument Serif';
}

.ch-reviews blockquote footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ch-inquiry,
.ch-job {
  display: grid;
  grid-template-columns: .8fr 1.2fr;
  gap: 100px;
  padding: 110px 0;
}

.ch-inquiry h2 {
  font-size: 64px;
  margin-top: 20px;
}

.ch-contact-list {
  margin-top: 50px;
}

.ch-contact-list p {
  border-top: 1px solid var(--t-line);
  padding: 18px 0;
}

.ch-contact-list span {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .14em;
  color: var(--t-muted);
}

.ch-contact-map {
  height: 540px;
  margin-bottom: 120px;
}

.ch-contact-map iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.ch-job>div>div {
  padding-bottom: 30px;
}

.ch-job h2 {
  font-size: 44px;
  margin-bottom: 25px;
}

.ch-careers {
  padding: 110px 0;
}

.ch-role-list {
  margin-top: 70px;
  border-top: 1px solid var(--t-line);
}

.ch-role-list button {
  display: grid;
  grid-template-columns: 220px 1fr 50px;
  align-items: center;
  width: 100%;
  padding: 28px 0;
  border: 0;
  border-bottom: 1px solid var(--t-line);
  background: none;
  text-align: left;
  cursor: pointer;
}

.ch-role-list strong {
  font: 38px 'Instrument Serif';
}

.ch-no-roles {
  margin-top: 60px;
}

.ch-loader {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--ch-ink);
  color: #f5efdf;
  z-index: 100;
}

.ch-loader-stamp {
  width: 180px;
  height: 180px;
  border: 1px solid rgba(245,239,223,.7);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  animation: chStamp 1.5s cubic-bezier(.22,1,.36,1) both;
}

.ch-loader-stamp:before {
  content: '✦';
  color: var(--ch-coral);
  font-size: 22px;
  margin-bottom: 7px;
}

.ch-loader-stamp span,
.ch-loader-stamp small {
  font-size: 9px;
  letter-spacing: .25em;
}

.ch-loader-stamp strong {
  font: 42px 'Instrument Serif';
  margin: 2px 0;
}

.ch-loader-line {
  position: absolute;
  bottom: 70px;
  width: 180px;
  height: 1px;
  background: rgba(255,255,255,.2);
  overflow: hidden;
}

.ch-loader-line i {
  display: block;
  width: 60%;
  height: 100%;
  background: var(--ch-coral);
  animation: chLoad 1.2s ease-in-out infinite;
}

.ch-header {
  padding: 36px 20px;
  pointer-events: none;
}

.ch-nav-shell {
  width: max-content;
  max-width: calc(100vw - 40px);
  margin: auto;
  min-height: 54px;
  height: auto;
  border-radius: 999px;
  padding: 7px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(25,25,24,.46);
  color: #fff;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 14px 55px rgba(0,0,0,.14);
  pointer-events: auto;
}

.ch-brand {
  display: none;
}

.ch-desktop-nav {
  gap: 2px;
}

.ch-desktop-nav button {
  border-radius: 999px;
  padding: 12px 17px;
  font-size: 13px;
  opacity: .82;
  transition: opacity .25s,background .25s;
}

.ch-desktop-nav button:hover,
.ch-desktop-nav .is-active {
  opacity: 1;
  background: rgba(255,255,255,.12);
}

.ch-purpose {
  background: var(--ch-sand);
  padding: 140px 0;
}

.ch-purpose-grid {
  display: grid;
  grid-template-columns: minmax(360px,.82fr) minmax(520px,1.18fr);
  gap: clamp(70px,9vw,150px);
  align-items: start;
}

.ch-purpose-intro {
  position: sticky;
  top: 110px;
}

.ch-purpose-intro h2 {
  font-size: clamp(62px,6.4vw,108px);
  line-height: .86;
  margin: 24px 0 54px;
  max-width: 760px;
}

.ch-purpose-intro .ch-photo {
  width: min(100%,520px);
  height: 390px;
  border-radius: 50% 50% 4px 4px;
}

.ch-purpose-list {
  border-top: 1px solid var(--t-line);
}

.ch-purpose-list article {
  display: grid;
  grid-template-columns: 58px 1fr;
  gap: 26px;
  padding: 48px 0 58px;
  border-bottom: 1px solid var(--t-line);
}

.ch-purpose-list article>span {
  font-size: 11px;
  letter-spacing: .15em;
  color: var(--ch-coral);
  padding-top: 11px;
}

.ch-purpose-list h3 {
  font-size: clamp(46px,4.2vw,72px);
  line-height: .94;
}

.ch-purpose-list p {
  max-width: 590px;
  margin-top: 22px;
  font-size: 17px;
  line-height: 1.75;
  color: var(--t-muted);
}

.ch-room-gallery {
  grid-template-columns: 1.5fr .75fr .75fr;
  grid-template-rows: 250px 250px;
}

.ch-room-gallery button:nth-child(4) {
  grid-column: auto;
}

.ch-header {
  position: fixed;
}

.ch-brand {
  display: flex;
  flex: 0 0 auto;
  margin-right: 4px;
  padding-right: 18px;
  border-right: 1px solid rgba(255,255,255,.2);
}

.ch-brand>span:last-child {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ch-nav-shell {
  gap: 4px;
}

.ch-flow {
  position: relative;
  overflow: hidden;
  padding: 30px 0 150px;
}

.ch-flow-intro {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 40px;
  padding-bottom: 70px;
}

.ch-flow-intro h2 {
  max-width: 1000px;
  font-size: clamp(64px,8vw,132px);
  line-height: .83;
  text-align: right;
}

.ch-flow-rails {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ch-flow-window {
  width: 100%;
  overflow: hidden;
}

.ch-flow-track {
  display: flex;
  width: max-content;
  animation: chFlow 46s linear infinite;
  will-change: transform;
}

.ch-flow-track.is-reverse {
  animation-direction: reverse;
  animation-duration: 52s;
}

.ch-flow-track:hover {
  animation-play-state: paused;
}

.ch-flow-set {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-right: 20px;
}

.ch-flow-set button {
  width: clamp(270px,31vw,500px);
  height: 300px;
  border: 0;
  padding: 0;
  background: none;
  overflow: hidden;
  cursor: pointer;
}

.ch-flow-window:nth-child(2) .ch-flow-set button {
  width: clamp(230px,25vw,410px);
  height: 230px;
}

.ch-flow-set button:nth-child(3n+2) {
  border-radius: 160px 160px 0 0;
}

.ch-flow-set button:nth-child(4n) {
  border-radius: 50%;
}

.ch-flow-set img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .7s cubic-bezier(.22,1,.36,1);
}

.ch-flow-set button:hover img {
  transform: scale(1.06);
}

.ch-map-heading {
  display: grid;
  grid-template-columns: 1.15fr .85fr;
  gap: 80px;
  align-items: end;
  margin-bottom: 64px;
}

.ch-map-meta {
  justify-self: end;
  width: min(100%,460px);
}

.ch-map-meta>div {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.ch-map-meta a {
  text-decoration: none;
  color: inherit;
}

.ch-map-frame {
  height: 640px;
  border-radius: 220px 220px 0 0;
  box-shadow: 0 30px 80px rgba(27,38,25,.14);
}

@supports (animation-timeline:view()) {
  .ch-cinema-a .ch-photo,
  .ch-cinema-c .ch-photo {
    animation: chScrollDrift linear both;
    animation-timeline: view();
    animation-range: entry 0% exit 100%;
  }

  .ch-cinema-b .ch-photo {
    animation: chScrollDriftReverse linear both;
    animation-timeline: view();
    animation-range: entry 0% exit 100%;
  }

  .ch-life-scene .ch-photo {
    animation: chScrollFocus linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 72%;
  }

  .ch-map-frame {
    animation: chMapReveal linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 60%;
  }
}

@keyframes chFlow {
  to {
    transform: translateX(-50%);
  }
}

@keyframes chScrollDrift {
  from {
    transform: translateY(90px) scale(.94);
  }

  to {
    transform: translateY(-55px) scale(1);
  }
}

@keyframes chScrollDriftReverse {
  from {
    transform: translateY(-35px) scale(.96);
  }

  to {
    transform: translateY(75px) scale(1.02);
  }
}

@keyframes chScrollFocus {
  from {
    transform: scale(.9);
    clip-path: inset(10% 5%);
  }

  to {
    transform: scale(1);
    clip-path: inset(0 0);
  }
}

@keyframes chMapReveal {
  from {
    transform: translateY(70px);
    clip-path: inset(22% 0 0);
  }

  to {
    transform: translateY(0);
    clip-path: inset(0 0);
  }
}

@keyframes chTicker {
  to {
    transform: translateX(-50%);
  }
}

@keyframes chStamp {
  from {
    opacity: 0;
    transform: scale(.6) rotate(-14deg);
  }

  to {
    opacity: 1;
    transform: scale(1) rotate(-4deg);
  }
}

@keyframes chLoad {
  from {
    transform: translateX(-120%);
  }

  to {
    transform: translateX(220%);
  }
}

@media (max-width:1050px) {
  .ch-desktop-nav,
  .ch-book-nav {
    display: none;
  }

  .ch-nav-shell {
    grid-template-columns: 1fr auto;
  }

  .ch-menu {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border: 1px solid rgba(255,255,255,.3);
    border-radius: 50%;
    background: none;
  }

  .ch-mobile-panel {
    display: flex;
    position: absolute;
    top: 94px;
    left: 20px;
    right: 20px;
    padding: 28px;
    background: var(--ch-ink);
    color: #fff;
    border-radius: 24px;
    flex-direction: column;
  }

  .ch-mobile-panel>button {
    display: flex;
    gap: 18px;
    padding: 14px;
    border: 0;
    border-bottom: 1px solid rgba(255,255,255,.14);
    background: none;
    text-align: left;
    font-size: 22px;
    font-weight: 600;
  }

  .ch-mobile-panel>button span {
    font-size: 10px;
    opacity: .5;
  }

  .ch-mobile-panel .ch-mobile-book {
    justify-content: center;
    margin-top: 15px;
    border-radius: 999px;
    background: var(--ch-coral);
    font-size: 14px;
  }

  .ch-intro-grid,
  .ch-life,
  .ch-map-grid,
  .ch-page-hero-grid,
  .ch-stay-row,
  .ch-room-detail,
  .ch-inquiry,
  .ch-job {
    grid-template-columns: 1fr;
  }

  .ch-life-sticky {
    position: relative;
    top: auto;
  }

  .ch-room-row {
    grid-template-columns: 40px 180px 1fr auto;
  }

  .ch-room-row>.ch-arrow {
    display: none;
  }

  .ch-room-price {
    grid-column: 3;
  }

  .ch-map-frame {
    height: 440px;
  }

  .ch-page-hero-photo {
    height: 450px;
  }

  .ch-booking-card {
    position: relative;
    top: auto;
  }

  .ch-room-detail {
    gap: 50px;
  }

  .ch-about-collage {
    grid-template-columns: 1fr 1fr;
  }

  .ch-about-collage>div:nth-child(2) {
    grid-column: 1/-1;
    grid-row: 1;
  }

  .ch-service-index>div:nth-child(3n) {
    width: 100%;
  }

  .ch-reviews blockquote {
    grid-template-columns: 70px 1fr;
  }

  .ch-reviews blockquote footer {
    grid-column: 2;
  }
}

@media (max-width:700px) {
  .ch-shell {
    width: min(100% - 28px,1440px);
  }

  .ch-header {
    padding: 12px;
  }

  .ch-nav-shell {
    height: 58px;
    padding: 6px 7px 6px 14px;
  }

  .ch-brand-mark {
    width: 30px;
    height: 30px;
  }

  .ch-brand {
    font-size: 13px;
  }

  .ch-menu {
    width: 42px;
    height: 42px;
  }

  .ch-mobile-panel {
    top: 76px;
    left: 12px;
    right: 12px;
  }

  .ch-hero {
    min-height: 680px;
    height: 100svh;
  }

  .ch-hero-copy {
    inset: auto 16px 32px;
  }

  .ch-hero h1 {
    font-size: clamp(55px,18vw,86px);
    line-height: .82;
  }

  .ch-hero-bottom {
    align-items: start;
    flex-direction: column;
  }

  .ch-scroll-note {
    display: none;
  }

  .ch-ticker {
    padding: 13px 0;
  }

  .ch-intro,
  .ch-rooms,
  .ch-facts,
  .ch-map-story,
  .ch-about-story,
  .ch-team,
  .ch-related {
    padding: 84px 0;
  }

  .ch-intro-grid {
    gap: 36px;
  }

  .ch-intro h2,
  .ch-life h2 {
    font-size: 56px;
  }

  .ch-cinema {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 65px;
  }

  .ch-cinema-a {
    grid-column: 1/-1;
  }

  .ch-cinema-a .ch-photo {
    height: 410px;
  }

  .ch-cinema-b .ch-photo,
  .ch-cinema-c .ch-photo {
    height: 250px;
  }

  .ch-section-heading {
    display: block;
    margin-bottom: 45px;
  }

  .ch-section-heading>p {
    margin-top: 24px;
  }

  .ch-section-heading h2,
  .ch-facts h2,
  .ch-map-story h2,
  .ch-related h2,
  .ch-team h2,
  .ch-careers h2 {
    font-size: 58px;
  }

  .ch-room-row {
    grid-template-columns: 36px 1fr 34px;
    gap: 12px;
    padding: 20px 0;
  }

  .ch-room-row>.ch-photo {
    grid-column: 2/4;
    width: 100%;
    height: 220px;
    border-radius: 120px;
  }

  .ch-room-index {
    grid-row: 1;
  }

  .ch-room-info {
    grid-column: 2;
  }

  .ch-room-info strong {
    font-size: 34px;
  }

  .ch-room-price {
    grid-column: 2;
  }

  .ch-life {
    display: block;
    padding: 85px 14px;
  }

  .ch-life-scenes {
    gap: 70px;
    margin-top: 60px;
  }

  .ch-life-scene,
  .ch-life-scene.scene-2,
  .ch-life-scene.scene-3 {
    width: 100%;
  }

  .ch-life-scene .ch-photo {
    height: 440px;
  }

  .ch-fact-grid {
    grid-template-columns: 1fr 1fr;
    margin-top: 50px;
  }

  .ch-fact-grid>div:nth-child(2) {
    border-right: 0;
  }

  .ch-fact-grid>div {
    border-bottom: 1px solid var(--t-line);
    padding: 28px 18px;
  }

  .ch-gallery-track button {
    flex-basis: 78vw;
    height: 390px;
  }

  .ch-gallery-track button.is-tall {
    height: 470px;
  }

  .ch-map-grid {
    gap: 50px;
  }

  .ch-map-frame {
    height: 380px;
  }

  .ch-final-cta {
    height: 700px;
  }

  .ch-final-copy h2 {
    font-size: 60px;
  }

  .ch-footer {
    padding-top: 70px;
  }

  .ch-footer-title {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 35px;
  }

  .ch-footer-grid {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 40px 0;
  }

  .ch-footer-bottom {
    gap: 16px;
    flex-direction: column;
  }

  .ch-page-hero {
    padding: 120px 0 60px;
    min-height: auto;
  }

  .ch-page-copy h1 {
    font-size: 64px;
  }

  .ch-page-hero-grid {
    gap: 45px;
  }

  .ch-page-hero-photo {
    height: 370px;
  }

  .ch-stays {
    padding: 55px 0 90px;
  }

  .ch-stay-row {
    gap: 32px;
    padding: 35px 0;
  }

  .ch-stay-photo {
    height: 360px;
  }

  .ch-stay-body h2 {
    font-size: 54px;
  }

  .ch-stay-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .ch-service-index {
    grid-template-columns: 1fr;
    gap: 45px;
    padding: 60px 0;
  }

  .ch-service-index>div:nth-child(3n) {
    grid-column: auto;
  }

  .ch-service-index .ch-photo {
    height: 360px;
  }

  .ch-room-hero {
    padding: 110px 0 50px;
  }

  .ch-room-hero h1 {
    font-size: 66px;
  }

  .ch-room-gallery {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 340px 180px;
    height: auto;
  }

  .ch-room-gallery button:first-child {
    grid-column: 1/-1;
    grid-row: auto;
  }

  .ch-room-gallery button:nth-child(4) {
    display: none;
  }

  .ch-room-detail h2 {
    font-size: 54px;
  }

  .ch-amenity-grid,
  .ch-good-to-know dl {
    grid-template-columns: 1fr;
  }

  .ch-related-grid,
  .ch-team-grid {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
  }

  .ch-related-grid button,
  .ch-team-grid>div {
    flex: 0 0 82%;
    scroll-snap-align: start;
  }

  .ch-about-story h2 {
    font-size: 60px;
  }

  .ch-about-collage {
    grid-template-columns: 1fr;
    gap: 22px;
    margin-top: 60px;
  }

  .ch-about-collage>div:nth-child(2) {
    grid-column: auto;
    grid-row: auto;
  }

  .ch-about-collage>div:first-child .ch-photo,
  .ch-about-collage>div:last-child .ch-photo {
    height: 400px;
  }

  .ch-values>div {
    grid-template-columns: 46px 1fr;
  }

  .ch-values p {
    grid-column: 2;
  }

  .ch-gallery-page {
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: 160px;
    padding: 60px 0;
  }

  .ch-gallery-page>div,
  .ch-gallery-page>div:has(.is-wide) {
    grid-column: span 1;
    grid-row: span 2;
  }

  .ch-gallery-page>div:has(.is-wide) {
    grid-column: span 2;
  }

  .ch-gallery-page>div:has(.is-tall) {
    grid-row: span 3;
  }

  .ch-review-intro {
    align-items: flex-start;
    flex-direction: column;
    gap: 25px;
  }

  .ch-reviews blockquote {
    grid-template-columns: 42px 1fr;
    gap: 10px;
    padding: 40px 0;
  }

  .ch-reviews blockquote>span {
    font-size: 65px;
  }

  .ch-inquiry,
  .ch-job {
    gap: 55px;
    padding: 70px 0;
  }

  .ch-inquiry h2 {
    font-size: 52px;
  }

  .ch-form-card {
    padding: 24px;
  }

  .ch-contact-map {
    height: 380px;
    margin-bottom: 80px;
  }

  .ch-role-list button {
    grid-template-columns: 1fr 40px;
    gap: 8px;
  }

  .ch-role-list button>span {
    grid-column: 1;
  }

  .ch-role-list strong {
    font-size: 30px;
  }

  .ch-role-list .ch-arrow {
    grid-column: 2;
    grid-row: 1/3;
  }

  .ch-loader-stamp {
    width: 150px;
    height: 150px;
  }
}

@media (max-width:1050px) {
  .ch-header {
    padding: 20px;
  }

  .ch-nav-shell {
    width: 100%;
    max-width: 1440px;
    justify-content: space-between;
    padding: 8px 10px 8px 20px;
  }

  .ch-brand {
    display: flex;
  }

  .ch-purpose-grid {
    grid-template-columns: 1fr;
    gap: 75px;
  }

  .ch-purpose-intro {
    position: relative;
    top: auto;
  }

  .ch-purpose-intro .ch-photo {
    width: 100%;
    height: 500px;
  }
}

@media (max-width:700px) {
  .ch-header {
    padding: 12px;
  }

  .ch-nav-shell {
    padding: 6px 7px 6px 14px;
  }

  .ch-purpose {
    padding: 84px 0;
  }

  .ch-purpose-grid {
    gap: 54px;
  }

  .ch-purpose-intro h2 {
    font-size: 58px;
    margin-bottom: 36px;
  }

  .ch-purpose-intro .ch-photo {
    height: 340px;
  }

  .ch-purpose-list article {
    grid-template-columns: 38px 1fr;
    gap: 14px;
    padding: 34px 0 42px;
  }

  .ch-purpose-list h3 {
    font-size: 46px;
  }

  .ch-purpose-list p {
    font-size: 15px;
    margin-top: 16px;
  }
}

@media (max-width:700px) {
  .ch-room-gallery {
    grid-template-rows: 340px 180px 180px;
  }

  .ch-room-gallery button:nth-child(4) {
    display: block;
  }
}

@media (max-width:1050px) {
  .ch-brand {
    margin-right: 0;
    padding-right: 0;
    border-right: 0;
  }

  .ch-flow-intro {
    display: block;
  }

  .ch-flow-intro h2 {
    text-align: left;
    margin-top: 22px;
  }

  .ch-map-heading {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .ch-map-meta {
    justify-self: start;
  }
}

@media (max-width:700px) {
  .ch-flow {
    padding: 10px 0 84px;
  }

  .ch-flow-intro {
    padding-bottom: 44px;
  }

  .ch-flow-intro h2 {
    font-size: 60px;
  }

  .ch-flow-rails {
    gap: 12px;
  }

  .ch-flow-set {
    gap: 12px;
    padding-right: 12px;
  }

  .ch-flow-set button {
    width: 76vw;
    height: 250px;
  }

  .ch-flow-window:nth-child(2) .ch-flow-set button {
    width: 62vw;
    height: 190px;
  }

  .ch-map-heading {
    margin-bottom: 36px;
  }

  .ch-map-meta>div {
    align-items: flex-start;
    flex-direction: column;
  }

  .ch-map-frame {
    border-radius: 110px 110px 0 0;
  }
}

@media (prefers-reduced-motion:reduce) {
  .ch-ticker>div,
  .ch-loader-stamp,
  .ch-loader-line i,
  .ch-flow-track,
  .ch-cinema-a .ch-photo,
  .ch-cinema-b .ch-photo,
  .ch-cinema-c .ch-photo,
  .ch-life-scene .ch-photo,
  .ch-map-frame {
    animation: none!important;
  }

  .ch-photo img {
    transition: none!important;
  }
}

.ch-totop {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 40;
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--ch-coral);
  color: #fff;
  border: 0;
  cursor: pointer;
  box-shadow: 0 14px 34px rgba(0,0,0,.22);
  transition: transform .6s cubic-bezier(.22,1,.36,1),opacity .6s cubic-bezier(.22,1,.36,1);
}
`;
