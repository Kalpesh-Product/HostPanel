export const BRIXSPACE_CSS = String.raw`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap') ;

/* Theme tokens and shared primitives */
.bx {
  --bx-green: var(--t-accent,#078b52);
  --bx-ink: #101211;
  --bx-paper: var(--t-bg,#fff);
  --bx-soft: #f0f1ee;
  --bx-line: #d9dbd7;
  background: var(--bx-paper);
  color: var(--t-text,#101211);
  font-family: 'DM Sans',sans-serif;
  min-height: 100vh;
  overflow: hidden;
}

.bx * {
  box-sizing: border-box;
}

.bx button,.bx input,.bx textarea,.bx select {
  font: inherit;
}

.bx button {
  color: inherit;
}

.bx-shell {
  width: min(100% - 42px,1380px);
  margin-inline: auto;
}

.bx-pad {
  padding: 110px 0;
}

.bx-kicker {
  font-size: 12px!important;
  font-weight: 700!important;
  letter-spacing: .16em!important;
  text-transform: uppercase!important;
  line-height: 1.4!important;
}

.bx-placeholder {
  background: #dfe3de;
  display: grid;
  place-items: center;
  min-height: 180px;
}

.bx-placeholder span {
  font-size: 11px;
  letter-spacing: .2em;
  font-weight: 700;
}

.bx-primary,.bx-book {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
  border: 0;
  border-radius: 999px;
  background: var(--bx-green);
  color: #fff;
  padding: 15px 24px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .25s,background .25s;
}

.bx-primary:hover,.bx-book:hover {
  transform: translateY(-2px);
  background: #066f43;
}

.bx-text-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  padding: 0 0 7px;
  border-bottom: 1px solid currentColor;
  font-weight: 700;
  cursor: pointer;
}

.bx-text-link svg,.bx-room-actions svg {
  transition: transform .25s;
}

.bx-text-link:hover svg,.bx-room-actions button:hover svg {
  transform: translateX(4px);
}

/* Header and navigation */
.bx-header {
  position: relative;
  z-index: 60;
  background: #fff;
}

.bx-header-inner {
  height: 92px;
  display: flex;
  align-items: center;
  gap: 35px;
}

.bx-brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  border: 0;
  background: none;
  padding: 0;
  cursor: pointer;
  min-width: 190px;
}

.bx-brand>span {
  width: 34px;
  height: 34px;
  border-radius: 11px 11px 11px 2px;
  background: var(--bx-green);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
}

.bx-brand strong {
  font-family: 'Manrope',sans-serif;
  font-size: 23px;
  letter-spacing: -.05em;
  white-space: nowrap;
}

.bx-brand i {
  color: var(--bx-green);
  font-style: normal;
}

.bx-brand img {
  height: 42px;
  max-width: 180px;
  object-fit: contain;
}

.bx-nav {
  margin: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}

.bx-nav>button,.bx-nav-drop>button {
  border: 0;
  background: transparent;
  padding: 12px 15px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
}

.bx-nav button.active:after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 5px;
  height: 2px;
  background: #fb7b28;
}

.bx-nav-drop {
  position: relative;
}

.bx-nav-drop>button {
  display: flex;
  gap: 6px;
}

.bx-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 235px;
  padding: 8px;
  background: #fff;
  border: 1px solid var(--bx-line);
  border-radius: 16px;
  box-shadow: 0 20px 45px rgba(20,25,21,.12);
}

.bx-dropdown button {
  width: 100%;
  border: 0;
  background: none;
  border-radius: 11px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
}

.bx-dropdown button:hover {
  background: var(--bx-soft);
}

.bx-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bx-book {
  padding: 13px 21px;
}

.bx-menu {
  display: none;
  width: 44px;
  height: 44px;
  border: 1px solid var(--bx-line);
  border-radius: 50%;
  background: #fff;
  align-items: center;
  justify-content: center;
}

.bx-mobile {
  display: none;
}

/* Home page sections */
.bx-hero-media {
  height: min(760px,calc(100vh - 120px));
  min-height: 610px;
  border-radius: 28px;
  overflow: hidden;
  position: relative;
  background: #111;
}

.bx-hero-media>img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bx-hero-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,rgba(5,10,7,.77),rgba(5,10,7,.12) 70%),linear-gradient(0deg,rgba(0,0,0,.4),transparent 55%);
}

.bx-hero-copy {
  position: absolute;
  left: clamp(28px,6vw,86px);
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  color: #fff;
  width: min(690px,62%);
}

.bx-hero-copy .bx-kicker {
  color: #b9e9cf;
}

.bx-hero-copy h1 {
  font-family: 'Manrope',sans-serif;
  font-size: clamp(52px,6.3vw,98px);
  letter-spacing: -.065em;
  line-height: .96;
  margin: 17px 0 25px;
}

.bx-hero-copy>p:not(.bx-kicker) {
  max-width: 580px;
  font-size: 18px;
  line-height: 1.65;
  color: rgba(255,255,255,.82);
}

.bx-hero-copy>div {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-top: 30px;
}

.bx-play {
  border: 0;
  background: transparent;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  cursor: pointer;
}

.bx-play svg {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  padding: 13px;
  background: #fb7b28;
}

.bx-hero-float {
  position: absolute;
  right: 38px;
  bottom: 34px;
  width: 260px;
  height: 200px;
  border-radius: 22px;
  overflow: hidden;
  border: 6px solid rgba(255,255,255,.2);
}

.bx-hero-float img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bx-hero-float span {
  position: absolute;
  left: 16px;
  bottom: 14px;
  color: #fff;
  font-weight: 700;
  line-height: 1.2;
}

.bx-hero-proof {
  position: absolute;
  right: 330px;
  bottom: 45px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 13px;
}

.bx-hero-proof strong {
  font-family: 'Manrope';
  font-size: 30px;
}

.bx-hero-proof span {
  font-size: 12px;
  line-height: 1.4;
  color: rgba(255,255,255,.72);
}

.bx-intro-grid {
  display: grid;
  grid-template-columns: 1.15fr .85fr;
  gap: 13vw;
  align-items: end;
}

.bx-intro h2,.bx-section-head h2,.bx-about-copy h2,.bx-form-grid h2,.bx-contact h2,.bx-map-block h2 {
  font-family: 'Manrope';
  font-size: clamp(38px,5vw,72px);
  letter-spacing: -.06em;
  line-height: 1.02;
  margin: 16px 0 0;
}

.bx-intro-grid>div:last-child>p {
  font-size: 18px;
  line-height: 1.75;
  color: #59605b;
  margin: 0 0 28px;
}

.bx-spaces {
  background: #f5f6f3;
}

.bx-section-head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 40px;
  margin-bottom: 52px;
}

.bx-section-head>div:first-child {
  max-width: 870px;
}

.bx-section-head h2 {
  max-width: 900px;
}

.bx-section-head>div>p:not(.bx-kicker) {
  max-width: 650px;
  font-size: 17px;
  line-height: 1.65;
  color: #68706a;
  margin: 20px 0 0;
}

.bx-room-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
}

.bx-room-wrap {
  flex: 0 1 calc(33.333% - 16px);
  min-width: 0;
}

.bx-room-card {
  height: 100%;
  background: #fff;
  border-radius: 22px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.bx-room-photo {
  position: relative;
  border: 0;
  padding: 0;
  background: #ddd;
  aspect-ratio: 1.22;
  overflow: hidden;
  cursor: pointer;
}

.bx-room-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .7s cubic-bezier(.22,1,.36,1);
}

.bx-room-card:hover .bx-room-photo img {
  transform: scale(1.055);
}

.bx-room-no,.bx-room-arrow {
  position: absolute;
  top: 17px;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
}

.bx-room-no {
  left: 17px;
}

.bx-room-arrow {
  right: 17px;
  background: var(--bx-green);
  color: #fff;
}

.bx-room-copy {
  padding: 25px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
}

.bx-room-copy h3 {
  font-family: 'Manrope';
  font-size: 28px;
  letter-spacing: -.045em;
  margin: 7px 0 0;
}

.bx-room-copy>p {
  color: #69706b;
  line-height: 1.65;
  margin: 0;
}

.bx-room-meta {
  margin-top: auto;
  border-top: 1px solid var(--bx-line);
  padding-top: 17px;
  display: flex;
  justify-content: space-between;
  gap: 15px;
  font-size: 14px;
}

.bx-room-meta strong {
  font-size: 16px;
}

.bx-room-actions {
  display: flex;
  gap: 9px;
}

.bx-room-actions button {
  flex: 1;
  border: 1px solid var(--bx-line);
  border-radius: 999px;
  background: #fff;
  padding: 11px 13px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.bx-room-actions button:last-child {
  background: var(--bx-ink);
  color: #fff;
  border-color: var(--bx-ink);
}

.bx-facility-stage {
  display: grid;
  grid-template-columns: .83fr 1.17fr;
  gap: 28px;
  min-height: 570px;
}

.bx-facility-tabs {
  display: flex;
  flex-direction: column;
}

.bx-facility-tabs button {
  flex: 1;
  border: 0;
  border-top: 1px solid var(--bx-line);
  background: #fff;
  display: grid;
  grid-template-columns: 45px 1fr auto;
  gap: 16px;
  text-align: left;
  align-items: center;
  padding: 20px 4px;
  cursor: pointer;
}

.bx-facility-tabs button:last-child {
  border-bottom: 1px solid var(--bx-line);
}

.bx-facility-tabs button>span {
  font-size: 12px;
  font-weight: 700;
}

.bx-facility-tabs h3 {
  font-family: 'Manrope';
  font-size: 23px;
  margin: 0;
}

.bx-facility-tabs p {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  margin: 0;
  color: #69706b;
  line-height: 1.5;
  transition: .35s;
}

.bx-facility-tabs button.active p {
  max-height: 75px;
  opacity: 1;
  margin-top: 8px;
}

.bx-facility-tabs button.active h3 {
  color: var(--bx-green);
}

.bx-facility-image {
  border-radius: 26px;
  overflow: hidden;
}

.bx-facility-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bx-location {
  background: var(--bx-ink);
  color: #fff;
  padding: 120px 0;
}

.bx-location-grid {
  display: grid;
  grid-template-columns: .8fr .65fr 1fr;
  gap: 55px;
  align-items: center;
}

.bx-location h2 {
  font-family: 'Manrope';
  font-size: clamp(42px,5vw,72px);
  letter-spacing: -.06em;
  line-height: 1.02;
  margin: 18px 0 28px;
}

.bx-location p:not(.bx-kicker) {
  color: #aeb4af;
  line-height: 1.6;
  margin-bottom: 30px;
}

.bx-location-list>div {
  border-top: 1px solid #393d3a;
  padding: 18px 0;
  display: grid;
  grid-template-columns: 35px 1fr auto;
  align-items: center;
}

.bx-location-list span {
  font-size: 11px;
  color: #8f9791;
}

.bx-location-list strong {
  font-family: 'Manrope';
  font-size: 22px;
}

.bx-location-list i {
  font-style: normal;
}

.bx-location-images {
  position: relative;
  height: 590px;
}

.bx-location-images img {
  position: absolute;
  object-fit: cover;
  border-radius: 22px;
}

.bx-location-images img:first-child {
  inset: 0 12% 20% 0;
  width: 88%;
  height: 80%;
}

.bx-location-images img:last-child {
  right: 0;
  bottom: 0;
  width: 52%;
  height: 42%;
  border: 7px solid var(--bx-ink);
}

.bx-story-grid {
  display: grid;
  grid-template-columns: 1.1fr .75fr .85fr;
  gap: 24px;
  align-items: stretch;
}

.bx-story-grid img {
  width: 100%;
  height: 100%;
  min-height: 430px;
  object-fit: cover;
  border-radius: 24px;
}

.bx-story-card {
  height: 100%;
  min-height: 430px;
  border-radius: 24px;
  background: var(--bx-soft);
  padding: 35px;
  display: flex;
  flex-direction: column;
}

.bx-story-card strong {
  font-family: 'Manrope';
  font-size: 75px;
  letter-spacing: -.07em;
  color: var(--bx-green);
}

.bx-story-card p {
  font-size: 19px;
  line-height: 1.6;
  color: #59605b;
}

.bx-story-card button {
  margin-top: auto;
  border: 0;
  background: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
  cursor: pointer;
}

.bx-testimonials {
  background: #f4f5f2;
}

.bx-testimonial-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr .8fr;
  gap: 22px;
}

.bx-testimonial-grid>img,.bx-testimonial-grid>article {
  height: 420px;
  border-radius: 24px;
}

.bx-testimonial-grid>img {
  width: 100%;
  object-fit: cover;
}

.bx-testimonial-grid article {
  background: #e5e7e3;
  padding: 35px;
  display: flex;
  flex-direction: column;
}

.bx-testimonial-grid article>span {
  font-size: 55px;
  line-height: .6;
}

.bx-testimonial-grid blockquote {
  font-family: 'Manrope';
  font-size: 23px;
  letter-spacing: -.03em;
  line-height: 1.45;
  margin: 30px 0 auto;
}

.bx-testimonial-grid article>p {
  color: #66706a;
  margin: 6px 0 0;
}

.bx-testimonial-grid .bx-green-card {
  background: var(--bx-green);
  color: #fff;
}

.bx-green-card span {
  font-family: 'Manrope';
  font-size: 58px!important;
  line-height: 1!important;
}

.bx-green-card h3 {
  font-family: 'Manrope';
  font-size: 30px;
  line-height: 1.1;
  margin-top: auto;
}

.bx-green-card p {
  color: rgba(255,255,255,.74)!important;
  line-height: 1.6;
}

/* Interior pages and service details */
.bx-page-hero {
  padding-bottom: 25px;
}

.bx-page-hero-media {
  height: 570px;
  border-radius: 28px;
  overflow: hidden;
  position: relative;
  color: #fff;
}

.bx-page-hero-media>img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bx-page-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,rgba(5,8,6,.72),rgba(5,8,6,.12));
}

.bx-page-hero-media>div:last-child {
  position: absolute;
  left: clamp(28px,6vw,78px);
  bottom: 60px;
  max-width: 780px;
}

.bx-page-hero h1 {
  font-family: 'Manrope';
  font-size: clamp(48px,6.2vw,86px);
  letter-spacing: -.065em;
  line-height: .96;
  margin: 16px 0;
}

.bx-page-hero p:not(.bx-kicker) {
  font-size: 18px;
  line-height: 1.6;
  max-width: 650px;
  color: rgba(255,255,255,.82);
}

.bx-about-copy {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12vw;
}

.bx-about-copy>div:last-child p {
  font-size: 18px;
  line-height: 1.75;
  color: #5f6761;
}

.bx-stat-row {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 1px;
  background: var(--bx-line);
  margin-top: 75px;
  border: 1px solid var(--bx-line);
  border-radius: 20px;
  overflow: hidden;
}

.bx-stat-row article {
  background: #fff;
  padding: 28px;
}

.bx-stat-row strong {
  font-family: 'Manrope';
  font-size: 42px;
  display: block;
}

.bx-stat-row span {
  font-size: 14px;
  color: #68706a;
}

.bx-dark-section {
  background: var(--bx-ink);
  color: #fff;
}

.bx-light>div>p:not(.bx-kicker) {
  color: #aab1ac;
}

.bx-value-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 20px;
}

.bx-value-grid article {
  border: 1px solid #3b3e3c;
  border-radius: 22px;
  padding: 30px;
  min-height: 250px;
}

.bx-value-grid article span {
  color: #8a938d;
  font-size: 12px;
}

.bx-value-grid h3 {
  font-family: 'Manrope';
  font-size: 28px;
  margin: 65px 0 12px;
}

.bx-value-grid p {
  color: #aeb5b0;
  line-height: 1.65;
}

.bx-team {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
}

.bx-team>div {
  flex: 0 1 calc(33.333% - 16px);
}

.bx-team img {
  width: 100%;
  aspect-ratio: 4/4.6;
  object-fit: cover;
  border-radius: 22px;
}

.bx-team h3 {
  font-family: 'Manrope';
  font-size: 25px;
  margin: 18px 0 2px;
}

.bx-team p {
  font-weight: 700;
  color: var(--bx-green);
  margin: 0 0 8px;
}

.bx-team span {
  color: #68706a;
  line-height: 1.55;
}

.bx-service-directory {
  display: grid;
  gap: 28px;
}

.bx-service-directory>div>button {
  width: 100%;
  display: grid;
  grid-template-columns: 1.05fr .95fr;
  gap: 0;
  border: 0;
  background: #f2f3f0;
  border-radius: 24px;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
}

.bx-service-directory>div:nth-child(even)>button img {
  order: 2;
}

.bx-service-directory img {
  width: 100%;
  height: 420px;
  object-fit: cover;
}

.bx-service-directory button>div {
  padding: 55px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.bx-service-directory h2 {
  font-family: 'Manrope';
  font-size: 44px;
  letter-spacing: -.055em;
  margin: 15px 0;
}

.bx-service-directory p:not(.bx-kicker) {
  color: #68706a;
  line-height: 1.65;
}

.bx-service-directory button>div>span {
  margin-top: 35px;
  display: flex;
  gap: 10px;
  align-items: center;
  font-weight: 700;
}

.bx-detail-intro {
  display: grid;
  grid-template-columns: 1fr 430px;
  gap: 10vw;
}

.bx-detail-intro h2 {
  font-family: 'Manrope';
  font-size: 48px;
  letter-spacing: -.055em;
  line-height: 1.05;
}

.bx-detail-intro>div>p:not(.bx-kicker) {
  color: #68706a;
  font-size: 17px;
  line-height: 1.7;
}

.bx-detail-intro ul {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
  list-style: none;
  padding: 20px 0 0;
}

.bx-detail-intro li {
  display: flex;
  gap: 9px;
  align-items: center;
}

.bx-detail-intro aside {
  background: var(--bx-soft);
  border-radius: 24px;
  padding: 30px;
  align-self: start;
}

.bx-detail-intro aside>div {
  border-bottom: 1px solid #ccd0cb;
  padding: 17px 0;
}

.bx-detail-intro aside span {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .13em;
  color: #68706a;
  margin-bottom: 6px;
}

.bx-detail-intro aside .bx-primary {
  width: 100%;
  margin-top: 25px;
}

.bx-detail-gallery {
  display: grid;
  grid-template-columns: 1.15fr .85fr;
  grid-template-rows: 310px 310px;
  gap: 18px;
  margin-top: 70px;
}

.bx-detail-gallery button {
  border: 0;
  padding: 0;
  border-radius: 22px;
  overflow: hidden;
}

.bx-detail-gallery button:first-child {
  grid-row: 1/3;
}

.bx-detail-gallery button:nth-child(4),.bx-detail-gallery button:nth-child(5) {
  display: none;
}

.bx-detail-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bx-map-block {
  display: grid;
  grid-template-columns: .7fr 1.3fr;
  gap: 50px;
  align-items: center;
  margin-top: 90px;
}

.bx-map-block iframe {
  width: 100%;
  height: 430px;
  border: 0;
  border-radius: 24px;
}

.bx-suggestions {
  background: #f2f3f0;
}

.bx-gallery {
  columns: 3 300px;
  column-gap: 20px;
}

.bx-gallery button {
  border: 0;
  background: none;
  padding: 0;
  width: 100%;
  margin-bottom: 20px;
  border-radius: 20px;
  overflow: hidden;
}

.bx-gallery img {
  width: 100%;
  height: auto;
  display: block;
}

.bx-review-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 22px;
  margin-bottom: 35px;
}

.bx-review-grid article {
  height: 100%;
  min-height: 310px;
  border-radius: 22px;
  background: var(--bx-soft);
  padding: 30px;
  display: flex;
  flex-direction: column;
}

.bx-review-grid article>span {
  font-size: 50px;
}

.bx-review-grid blockquote {
  font-family: 'Manrope';
  font-size: 20px;
  line-height: 1.5;
  margin: 25px 0 auto;
}

.bx-review-grid p {
  color: #68706a;
}

.bx-form-grid,.bx-contact {
  display: grid;
  grid-template-columns: .85fr 1.15fr;
  gap: 9vw;
  align-items: start;
}

.bx-form-grid>div:first-child>p:not(.bx-kicker),.bx-contact>div:first-child>p:not(.bx-kicker) {
  color: #68706a;
  line-height: 1.7;
  font-size: 17px;
}

.bx-form-grid form,.bx-contact form,.bx-apply form {
  background: #f2f3f0;
  border-radius: 24px;
  padding: 34px;
}

.bx-contact>div:first-child>div {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bx-contact a {
  font-family: 'Manrope';
  font-size: 22px;
  font-weight: 700;
}

.bx-contact-map {
  margin-top: 45px;
}

.bx-contact-map iframe {
  width: 100%;
  height: 480px;
  border: 0;
  border-radius: 24px;
}

.bx-jobs {
  display: grid;
  gap: 12px;
}

.bx-jobs button {
  display: grid;
  grid-template-columns: 150px 1fr 220px auto;
  align-items: center;
  gap: 20px;
  border: 1px solid var(--bx-line);
  background: #fff;
  border-radius: 18px;
  padding: 25px;
  text-align: left;
  cursor: pointer;
}

.bx-jobs h3 {
  font-family: 'Manrope';
  font-size: 23px;
  margin: 0;
}

.bx-jobs p {
  color: #68706a;
}

.bx-apply {
  margin-top: 50px;
  max-width: 900px;
}

.bx-empty {
  padding: 50px 0;
  color: #68706a;
}

/* Footer and loader */
.bx-footer {
  background: #101211;
  color: #fff;
  padding-top: 70px;
}

.bx-footer-cta {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 35px;
  padding-bottom: 70px;
  border-bottom: 1px solid #393d3a;
}

.bx-footer-cta h2 {
  font-family: 'Manrope';
  font-size: clamp(40px,5vw,72px);
  letter-spacing: -.06em;
  line-height: 1;
  margin: 14px 0 0;
  max-width: 850px;
}

.bx-footer-cta button {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: var(--bx-green);
  color: #fff;
  border-radius: 999px;
  padding: 17px 25px;
  font-weight: 700;
  white-space: nowrap;
}

.bx-footer-grid {
  display: grid;
  grid-template-columns: 1.4fr .7fr 1fr;
  gap: 80px;
  padding: 65px 0;
}

.bx-brand-light {
  color: #fff;
}

.bx-footer-grid>div:first-child>p {
  max-width: 420px;
  color: #9fa7a1;
  line-height: 1.65;
}

.bx-footer-grid>div:not(:first-child) {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.bx-footer-grid button:not(.bx-brand),.bx-footer-grid a {
  border: 0;
  background: none;
  color: #d7dbd8;
  text-align: left;
  padding: 0;
  cursor: pointer;
}

.bx-footer-grid>div:last-child>p:not(.bx-footer-label) {
  color: #9fa7a1;
  line-height: 1.6;
}

.bx-footer-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .15em;
  color: #777f79;
  margin-bottom: 8px;
}

.bx-social {
  display: flex;
  gap: 8px;
  margin-top: 25px;
}

.bx-social>* {
  width: 38px;
  height: 38px;
  border: 1px solid #3c413d;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.bx-social svg {
  width: 16px;
  height: 16px;
}

.bx-footer-bottom {
  border-top: 1px solid #393d3a;
  padding: 22px 0;
  display: flex;
  justify-content: space-between;
  color: #7f8781;
  font-size: 12px;
}

.bx-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #101211;
  color: #fff;
  display: grid;
  place-items: center;
}

.bx-loader>div {
  display: grid;
  place-items: center;
}

.bx-loader span {
  width: 72px;
  height: 72px;
  border-radius: 24px 24px 24px 5px;
  background: var(--bx-green);
  font-family: 'Manrope';
  font-size: 36px;
  font-weight: 800;
  display: grid;
  place-items: center;
}

.bx-loader strong {
  font-family: 'Manrope';
  font-size: 24px;
  margin-top: 18px;
}

.bx-loader i {
  width: 120px;
  height: 2px;
  background: #303632;
  margin-top: 20px;
  position: relative;
  overflow: hidden;
}

.bx-loader i:after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--bx-green);
  animation: bxload .9s ease forwards;
}

@keyframes bxload {
  from {
    transform: translateX(-100%);
}
  to {
    transform: translateX(0);
}
}

/* Core responsive layout */
@media (max-width:1100px) {
  .bx-nav {
    display: none;
}
  .bx-menu {
    display: flex;
}
  .bx-header-inner {
    height: 78px;
}
  .bx-header-actions {
    margin-left: auto;
}
  .bx-mobile {
    display: flex;
    position: absolute;
    top: 100%;
    left: 21px;
    right: 21px;
    background: #fff;
    border: 1px solid var(--bx-line);
    border-radius: 18px;
    padding: 15px;
    box-shadow: 0 25px 50px rgba(0,0,0,.13);
    flex-direction: column;
}
  .bx-mobile>button:not(.bx-book) {
    border: 0;
    background: none;
    padding: 14px;
    text-align: left;
    font-weight: 700;
    border-bottom: 1px solid var(--bx-line);
}
  .bx-mobile .bx-book {
    margin-top: 12px;
}
  .bx-hero-proof {
    display: none;
}
  .bx-room-wrap {
    flex-basis: calc(50% - 12px);
}
  .bx-location-grid {
    grid-template-columns: 1fr 1fr;
}
  .bx-location-images {
    grid-column: 1/3;
    height: 480px;
}
  .bx-story-grid {
    grid-template-columns: 1fr 1fr;
}
  .bx-story-grid>div:last-child {
    display: none;
}
  .bx-testimonial-grid {
    grid-template-columns: 1fr 1fr;
}
  .bx-testimonial-grid .bx-green-card {
    grid-column: 1/3;
    height: auto;
}
  .bx-detail-intro {
    grid-template-columns: 1fr 360px;
    gap: 50px;
}
  .bx-footer-grid {
    gap: 40px;
}
}

@media (max-width:760px) {
  .bx-shell {
    width: min(100% - 28px,1380px);
}
  .bx-pad {
    padding: 72px 0;
}
  .bx-book {
    display: none;
}
  .bx-mobile .bx-book {
    display: flex;
}
  .bx-brand {
    min-width: 0;
}
  .bx-brand strong {
    font-size: 20px;
}
  .bx-hero-media {
    height: 680px;
    min-height: 0;
    border-radius: 20px;
}
  .bx-hero-copy {
    left: 24px;
    top: 70px;
    transform: none;
    width: calc(100% - 48px);
}
  .bx-hero-copy h1 {
    font-size: 47px;
}
  .bx-hero-copy>p:not(.bx-kicker) {
    font-size: 16px;
}
  .bx-hero-copy>div {
    align-items: flex-start;
    flex-direction: column;
}
  .bx-hero-float {
    right: 20px;
    bottom: 20px;
    width: 200px;
    height: 150px;
}
  .bx-intro-grid,.bx-about-copy,.bx-form-grid,.bx-contact {
    grid-template-columns: 1fr;
    gap: 35px;
}
  .bx-intro h2,.bx-section-head h2,.bx-about-copy h2,.bx-form-grid h2,.bx-contact h2,.bx-map-block h2 {
    font-size: 39px;
}
  .bx-section-head {
    align-items: flex-start;
    flex-direction: column;
    margin-bottom: 36px;
}
  .bx-room-wrap {
    flex-basis: 100%;
}
  .bx-facility-stage {
    grid-template-columns: 1fr;
    min-height: 0;
}
  .bx-facility-tabs button {
    min-height: 105px;
}
  .bx-facility-image {
    height: 360px;
}
  .bx-location {
    padding: 75px 0;
}
  .bx-location-grid {
    grid-template-columns: 1fr;
}
  .bx-location-images {
    grid-column: auto;
    height: 390px;
}
  .bx-story-grid {
    grid-template-columns: 1fr;
}
  .bx-story-grid>div:last-child {
    display: block;
}
  .bx-story-grid img,.bx-story-card {
    min-height: 350px;
}
  .bx-testimonial-grid {
    grid-template-columns: 1fr;
}
  .bx-testimonial-grid .bx-green-card {
    grid-column: auto;
}
  .bx-page-hero-media {
    height: 500px;
    border-radius: 20px;
}
  .bx-page-hero-media>div:last-child {
    left: 24px;
    right: 24px;
    bottom: 35px;
}
  .bx-page-hero h1 {
    font-size: 47px;
}
  .bx-stat-row {
    grid-template-columns: 1fr 1fr;
}
  .bx-value-grid,.bx-review-grid {
    grid-template-columns: 1fr;
}
  .bx-team>div {
    flex-basis: 100%;
}
  .bx-service-directory>div>button {
    grid-template-columns: 1fr;
}
  .bx-service-directory>div:nth-child(even)>button img {
    order: 0;
}
  .bx-service-directory img {
    height: 280px;
}
  .bx-service-directory button>div {
    padding: 30px;
}
  .bx-service-directory h2 {
    font-size: 34px;
}
  .bx-detail-intro {
    grid-template-columns: 1fr;
}
  .bx-detail-intro h2 {
    font-size: 39px;
}
  .bx-detail-intro ul {
    grid-template-columns: 1fr;
}
  .bx-detail-gallery {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 250px 180px 180px;
}
  .bx-detail-gallery button:first-child {
    grid-column: 1/3;
    grid-row: auto;
}
  .bx-detail-gallery button:nth-child(4),.bx-detail-gallery button:nth-child(5) {
    display: block;
}
  .bx-map-block {
    grid-template-columns: 1fr;
}
  .bx-map-block iframe {
    height: 340px;
}
  .bx-jobs button {
    grid-template-columns: 1fr auto;
}
  .bx-jobs button span,.bx-jobs button p {
    grid-column: 1;
}
  .bx-footer-cta {
    align-items: flex-start;
    flex-direction: column;
}
  .bx-footer-cta button {
    display: flex;
}
  .bx-footer-grid {
    grid-template-columns: 1fr;
    gap: 35px;
}
  .bx-footer-bottom {
    gap: 10px;
    flex-direction: column;
}
  .bx-footer {
    padding-bottom: 20px;
}
}

/* Shared builder-form compatibility */
.bx .bx-primary,.bx .bx-book,.bx .bx-footer-cta button {
  color: #fff;
}

.bx .tp-label {
  display: block;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.bx .tp-input {
  width: 100%;
  min-height: 50px;
  border: 1px solid #d4d8d3;
  border-radius: 12px;
  background: #fff;
  padding: 13px 15px;
  color: var(--bx-ink);
  outline: none;
  transition: border-color .2s,box-shadow .2s;
}

.bx .tp-input:focus {
  border-color: var(--bx-green);
  box-shadow: 0 0 0 3px color-mix(in srgb,var(--bx-green) 14%,transparent);
}

.bx textarea.tp-input {
  min-height: 130px;
  resize: vertical;
}

.bx .tp-btn {
  min-height: 50px;
  border: 0;
  border-radius: 999px;
  padding: 0 24px;
  font-weight: 700;
  cursor: pointer;
}

.bx .tp-btn-primary {
  background: var(--bx-green);
  color: #fff;
}

.bx .tp-btn-ghost {
  border: 1px solid #cbd0cb;
  background: #fff;
  color: var(--bx-ink);
}

.bx .tp-btn-sm {
  min-height: 40px;
  padding: 0 17px;
}

.bx .tp-soft {
  border: 1px solid #d7dad6;
  border-radius: 18px;
  background: #f2f3f0;
}

.bx .tp-h3 {
  font-family: 'Manrope';
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -.04em;
}

.bx .tp-muted {
  color: #68706a;
}

.bx .tp-chip {
  border-radius: 999px;
  background: #e2e5e1;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
}

.bx-form-grid form,.bx-contact form,.bx-apply form {
  box-shadow: 0 16px 45px rgba(20,25,21,.06);
}

/* Reference-aligned header, booking modal, and partner form */
.bx-header {
  background: #f4f5f2;
}

.bx-header-inner {
  height: 96px;
  gap: 26px;
}

.bx-brand>span {
  width: 25px;
  height: 25px;
  border: 4px solid var(--bx-green);
  border-radius: 3px;
  background: transparent;
  transform: rotate(8deg);
}

.bx-brand strong {
  font-size: 22px;
}

.bx-nav {
  gap: 0;
}

.bx-nav>button,.bx-nav-drop>button {
  padding: 14px 12px;
  font-size: 15.5px;
  font-weight: 500;
}

.bx-nav button.active {
  color: #ef8742;
}

.bx-nav button.active:after {
  display: none;
}

.bx-nav-drop>button {
  align-items: center;
}

.bx-plus {
  color: var(--bx-green);
  font-size: 20px;
  font-weight: 500;
  line-height: 1;
}

.bx-header-actions {
  gap: 9px;
}

.bx .bx-book,.bx-enquire {
  min-height: 52px;
  border-radius: 17px;
  padding: 0 22px;
}

.bx .bx-enquire {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: var(--bx-ink);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  transition: transform .25s,background .25s;
}

.bx .bx-enquire:hover {
  transform: translateY(-2px);
  background: #262927;
}

.bx-mobile-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-top: 12px;
}

.bx-mobile-actions .bx-book,.bx-mobile-actions .bx-enquire {
  width: 100%;
  display: flex;
}

.bx-mobile>button {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bx-modal {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.bx-modal-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(8,10,9,.76);
  backdrop-filter: blur(8px);
  cursor: pointer;
}

.bx-modal-panel {
  position: relative;
  z-index: 1;
  width: min(1120px,100%);
  max-height: 94vh;
  overflow: hidden;
  display: grid;
  grid-template-columns: .82fr 1.18fr;
  background: #f4f5f2;
  border-radius: 28px;
  box-shadow: 0 35px 100px rgba(0,0,0,.28);
}

.bx-modal-close {
  position: absolute;
  z-index: 4;
  right: 18px;
  top: 18px;
  width: 44px;
  height: 44px;
  border: 1px solid #d4d8d3;
  border-radius: 50%;
  background: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform .25s,background .25s;
}

.bx-modal-close:hover {
  transform: rotate(8deg);
  background: #edf0ec;
}

.bx-modal-aside {
  position: relative;
  min-height: 660px;
  overflow: hidden;
  color: #fff;
  display: flex;
  align-items: flex-end;
}

.bx-modal-aside>img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bx-modal-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg,rgba(5,8,6,.12),rgba(5,8,6,.88) 76%);
}

.bx-modal-aside-copy {
  position: relative;
  z-index: 1;
  padding: 32px;
  width: 100%;
}

.bx-modal-mark {
  display: block;
  width: 28px;
  height: 28px;
  border: 4px solid #8ed6ad;
  border-radius: 3px;
  transform: rotate(8deg);
  margin-bottom: 22px;
}

.bx-modal-aside h2 {
  font-family: 'Manrope';
  font-size: 38px;
  line-height: 1.03;
  letter-spacing: -.055em;
  margin: 10px 0 13px;
}

.bx-modal-aside-copy>p:not(.bx-kicker) {
  color: rgba(255,255,255,.76);
  line-height: 1.55;
  margin: 0;
}

.bx-modal-facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 20px;
  padding-top: 17px;
  border-top: 1px solid rgba(255,255,255,.24);
}

.bx-modal-facts small {
  display: block;
  color: rgba(255,255,255,.56);
  font-size: 10px;
  letter-spacing: .13em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.bx-modal-facts strong {
  font-size: 14px;
}

.bx-modal-form {
  max-height: 94vh;
  overflow: hidden;
  padding: 34px 46px;
}

.bx-modal-form>h2 {
  font-family: 'Manrope';
  font-size: 41px;
  letter-spacing: -.055em;
  line-height: 1.03;
  margin: 8px 60px 9px 0;
}

.bx-modal-form>p:not(.bx-kicker) {
  color: #68706a;
  line-height: 1.45;
  margin: 0 48px 18px 0;
}

.bx-modal-form form {
  display: grid;
  gap: 10px;
}

.bx-modal-form .tp-label {
  margin-bottom: 5px;
  font-size: 10px;
}

.bx-modal-form .tp-input {
  min-height: 43px;
  padding: 9px 13px;
  background: #fff;
}

.bx-modal-form textarea.tp-input {
  min-height: 72px;
}

.bx-modal-form .tp-btn-primary {
  width: 100%;
  min-height: 47px;
  border-radius: 14px;
}

.bx-partner-section {
  background: #eef0ed;
}

.bx-partner-grid {
  display: grid;
  grid-template-columns: .92fr 1.08fr;
  gap: 22px;
}

.bx-partner-intro,.bx-partner-form {
  border-radius: 28px;
  overflow: hidden;
}

.bx-partner-intro {
  background: var(--bx-ink);
  color: #fff;
  display: flex;
  flex-direction: column;
}

.bx-partner-intro>div {
  padding: 48px;
}

.bx-partner-intro h2 {
  font-family: 'Manrope';
  font-size: clamp(38px,4vw,58px);
  line-height: 1.04;
  letter-spacing: -.055em;
  margin: 16px 0 20px;
}

.bx-partner-intro>div>p:not(.bx-kicker) {
  color: #aeb5b0;
  font-size: 17px;
  line-height: 1.65;
}

.bx-partner-intro>img {
  width: 100%;
  height: 300px;
  object-fit: cover;
  margin-top: auto;
}

.bx-partner-benefits {
  display: grid;
  gap: 0;
  margin-top: 35px;
  border-top: 1px solid #3b3e3c;
}

.bx-partner-benefits span {
  display: flex;
  gap: 18px;
  padding: 17px 0;
  border-bottom: 1px solid #3b3e3c;
  font-weight: 600;
}

.bx-partner-benefits b {
  color: #7f8982;
  font-size: 11px;
}

.bx-partner-form {
  background: #fff;
  padding: 48px;
}

.bx-partner-form h3 {
  font-family: 'Manrope';
  font-size: 48px;
  line-height: 1.03;
  letter-spacing: -.055em;
  margin: 14px 0;
}

.bx-partner-form>p:not(.bx-kicker) {
  color: #68706a;
  line-height: 1.65;
  margin-bottom: 30px;
}

.bx-partner-form form {
  background: transparent;
  padding: 0;
  box-shadow: none;
}

.bx-partner-form .tp-input {
  background: #f4f5f2;
}

.bx-partner-form .tp-btn-primary {
  width: 100%;
  min-height: 56px;
  border-radius: 16px;
}

.bx-modal-form {
  padding: 26px 46px;
}

.bx-modal-form>h2 {
  margin: 7px 60px 8px 0;
}

.bx-modal-form>p:not(.bx-kicker) {
  margin: 0 48px 12px 0;
}

.bx-modal-form form {
  gap: 9px;
}

.bx-modal-form .tp-label {
  margin-bottom: 4px;
}

.bx-modal-form .tp-input {
  min-height: 42px;
  padding: 8px 13px;
}

.bx-modal-form textarea.tp-input {
  min-height: 58px;
}

.bx-modal-form .tp-btn-primary {
  min-height: 44px;
}

/* Final responsive refinements */
@media (max-width:1260px) {
  .bx-header-inner {
    gap: 18px;
}
  .bx-brand {
    min-width: 165px;
}
  .bx-nav>button,.bx-nav-drop>button {
    padding-inline: 8px;
}
  .bx .bx-book,.bx-enquire {
    padding-inline: 16px;
}
}

@media (min-width:761px) {
  .bx-hero-copy {
    top: 46%;
}
  .bx-hero-copy h1 {
    font-size: clamp(50px,5.8vw,86px);
    margin: 14px 0 18px;
}
  .bx-hero-copy>p:not(.bx-kicker) {
    line-height: 1.5;
}
  .bx-hero-copy>div {
    margin-top: 22px;
}
}

@media (min-width:761px) {
  .bx-detail-gallery {
    grid-template-columns: 1.25fr .75fr .75fr;
    grid-template-rows: 280px 280px;
}
  .bx-detail-gallery button:nth-child(4),.bx-detail-gallery button:nth-child(5) {
    display: block;
}
}

@media (max-width:1100px) {
  .bx-header-inner {
    height: 82px;
}
  .bx-header-actions>.bx-enquire {
    display: none;
}
  .bx-partner-grid {
    grid-template-columns: 1fr;
}
  .bx-partner-intro {
    display: grid;
    grid-template-columns: 1.1fr .9fr;
}
  .bx-partner-intro>img {
    height: 100%;
    min-height: 470px;
}
  .bx-modal-panel {
    grid-template-columns: .72fr 1.28fr;
}
  .bx-modal-aside-copy {
    padding: 30px;
}
  .bx-modal-form {
    padding: 46px 38px;
}
}

@media (max-width:760px) {
  .bx-mobile-actions .bx-enquire {
    display: flex;
}
  .bx-brand>span {
    width: 22px;
    height: 22px;
    border-width: 3px;
}
  .bx-modal {
    padding: 12px;
}
  .bx-modal-panel {
    display: block;
    overflow-y: auto;
    max-height: 94vh;
    border-radius: 22px;
}
  .bx-modal-close {
    position: fixed;
    right: 24px;
    top: 24px;
}
  .bx-modal-aside {
    min-height: 245px;
}
  .bx-modal-aside-copy {
    padding: 26px;
}
  .bx-modal-aside h2 {
    font-size: 32px;
}
  .bx-modal-aside-copy>p:not(.bx-kicker),.bx-modal-facts {
    display: none;
}
  .bx-modal-mark {
    width: 25px;
    height: 25px;
    border-width: 4px;
    margin-bottom: 20px;
}
  .bx-modal-form {
    max-height: none;
    overflow: visible;
    padding: 32px 24px;
}
  .bx-modal-form>h2 {
    font-size: 38px;
    margin-right: 40px;
}
  .bx-modal-form>p:not(.bx-kicker) {
    margin-right: 0;
}
  .bx-partner-intro {
    display: flex;
}
  .bx-partner-intro>div,.bx-partner-form {
    padding: 30px 24px;
}
  .bx-partner-intro>img {
    height: 240px;
    min-height: 0;
}
  .bx-partner-form h3 {
    font-size: 38px;
}
}

@media (prefers-reduced-motion:reduce) {
  .bx * {
    animation-duration: .01ms!important;
    transition-duration: .01ms!important;
    scroll-behavior: auto!important;
}
}
`;
