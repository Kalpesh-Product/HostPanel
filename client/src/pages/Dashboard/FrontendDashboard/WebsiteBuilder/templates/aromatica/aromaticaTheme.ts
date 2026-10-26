export const AROMATICA_CSS = String.raw`
@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap");

.aroma {
  --ar-bg: var(--tpl-bg, #f5f0e6);
  --ar-paper: #f8f4ec;
  --ar-text: var(--tpl-text, #11131f);
  --ar-accent: var(--tpl-accent, #eca839);
  --ar-coral: var(--tpl-primary, #e65b51);
  --ar-line: rgba(17, 19, 31, 0.13);
  min-height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at 18% 12%, rgba(218, 191, 146, 0.12), transparent 30%),
    radial-gradient(circle at 78% 40%, rgba(218, 191, 146, 0.08), transparent 28%),
    var(--ar-bg);
  color: var(--ar-text);
  font-family: "Manrope", sans-serif;
  line-height: 1.45;
}

.aroma *,
.aroma *::before,
.aroma *::after {
  box-sizing: border-box;
}

.aroma h1,
.aroma h2,
.aroma h3,
.aroma p {
  margin: 0;
}

.aroma h1,
.aroma h2,
.aroma h3 {
  font-family: "Manrope", sans-serif;
}

.aroma button,
.aroma input,
.aroma textarea,
.aroma select {
  font: inherit;
}

.aroma button,
.aroma a {
  color: inherit;
}

.aroma img {
  display: block;
}

.aroma .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.aroma-shell {
  width: min(calc(100% - 140px), 1380px);
  margin-inline: auto;
}

.aroma-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.17em;
  text-transform: uppercase;
}

.aroma-primary {
  border: 0;
  background: var(--ar-coral);
  color: #fff;
  padding: 20px 30px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.25s ease, background 0.25s ease;
}

.aroma-primary:hover {
  transform: translateY(-3px);
  background: #cf4d45;
}

/* Header */

.aroma-header {
  position: relative;
  z-index: 40;
  height: 112px;
  background: rgba(245, 240, 230, 0.96);
  transition: height 0.3s ease, box-shadow 0.3s ease;
}

.aroma-header[data-scrolled="true"] {
  position: sticky;
  top: 0;
  height: 82px;
  box-shadow: 0 12px 36px rgba(20, 18, 12, 0.07);
  backdrop-filter: blur(14px);
}

.aroma-header-inner {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto minmax(190px, 1fr);
  align-items: center;
  gap: 32px;
}

.aroma-logo,
.aroma-header nav button,
.aroma-header-cta,
.aroma-menu-toggle {
  border: 0;
  background: none;
  cursor: pointer;
}

.aroma-logo {
  justify-self: start;
  padding: 0;
  max-width: 310px;
}

.aroma-wordmark {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  line-height: 1;
}

.aroma-wordmark svg,
.aroma-wordmark img {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  object-fit: contain;
  color: var(--ar-accent);
}

.aroma-wordmark b {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15.5px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.aroma-header nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.aroma-header nav button {
  position: relative;
  padding: 10px 0;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.aroma-header nav button::after {
  content: "";
  position: absolute;
  left: 0;
  right: 100%;
  bottom: 3px;
  height: 2px;
  background: var(--ar-text);
  transition: right 0.25s ease;
}

.aroma-header nav button:hover::after,
.aroma-header nav button[aria-current="page"]::after {
  right: 0;
}

.aroma-header-cta {
  justify-self: end;
  min-width: 174px;
  padding: 17px 22px;
  background: var(--ar-coral);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.aroma-menu-toggle,
.aroma-mobile-menu {
  display: none;
}

/* Hero */

.aroma-hero {
  padding: 58px 0 0;
}

.aroma-hero-intro {
  display: grid;
  grid-template-columns: minmax(0, 2.15fr) minmax(280px, 0.85fr);
  gap: 76px;
  align-items: end;
}

.aroma-hero h1 {
  max-width: 1010px;
  font-size: clamp(62px, 5.2vw, 80px);
  line-height: 1.015;
  letter-spacing: -0.055em;
  font-weight: 800;
}

.aroma-hero h1 em {
  color: var(--ar-accent);
  font-style: normal;
}

.aroma-hero-side {
  padding-bottom: 4px;
}

.aroma-hero-side > p {
  color: rgba(17, 19, 31, 0.67);
  font-size: 15px;
  line-height: 1.75;
}

.aroma-hero-side button {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 30px;
  padding: 0;
  border: 0;
  background: none;
  font-weight: 800;
  cursor: pointer;
}

.aroma-hero-side button span {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--ar-coral);
  color: #fff;
  transition: transform 0.25s ease;
}

.aroma-hero-side button:hover span {
  transform: rotate(-35deg);
}

.aroma-hero-media {
  height: min(39vw, 590px);
  margin-top: 78px;
  overflow: hidden;
}

.aroma-hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 1.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.aroma-hero-media:hover img {
  transform: scale(1.025);
}

/* Icon strip */

.aroma-pillars {
  padding: 68px 0 72px;
}

.aroma-pillar-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.aroma-pillar-grid > div {
  min-height: 188px;
  padding: 20px 50px 10px;
  border-right: 1px solid var(--ar-line);
  text-align: center;
}

.aroma-pillar-grid > div:first-child {
  border-left: 1px solid var(--ar-line);
}

.aroma-pillar-grid h3 {
  margin: 24px 0 10px;
  font-size: 18px;
}

.aroma-pillar-grid p {
  color: rgba(17, 19, 31, 0.58);
  font-size: 12px;
  line-height: 1.65;
}

.aroma-pillar-icon {
  position: relative;
  display: block;
  width: 54px;
  height: 54px;
  margin: 0 auto;
  color: var(--ar-coral);
  border: 2px solid currentColor;
  border-radius: 50%;
}

.aroma-pillar-icon::before,
.aroma-pillar-icon::after {
  content: "";
  position: absolute;
  inset: 12px 22px;
  border: 1.5px solid currentColor;
  border-radius: 50%;
  transform: rotate(28deg);
}

.aroma-pillar-icon::after {
  inset: 7px 25px;
  transform: rotate(-28deg);
}

.aroma-pillar-icon.is-cup {
  border-radius: 4px 4px 18px 18px;
  border-top: 0;
  transform: scale(0.82);
}

.aroma-pillar-icon.is-cup::before {
  inset: 8px -15px 16px 39px;
  border-radius: 50%;
  transform: none;
}

.aroma-pillar-icon.is-roast {
  border-style: dashed;
}

.aroma-pillar-icon.is-bag {
  border-radius: 6px;
  transform: scale(0.84);
}

.aroma-pillar-icon.is-bag::before {
  inset: 8px 15px 29px;
  border-radius: 0;
  transform: none;
}

/* Craft */

.aroma-story {
  padding: 150px 0 140px;
  background: #fff;
}

.aroma-story-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(390px, 0.92fr);
  gap: 9vw;
  align-items: center;
  min-height: 720px;
}

.aroma-story-media {
  align-self: stretch;
  overflow: hidden;
}

.aroma-story-media img {
  width: 100%;
  height: 100%;
  min-height: 650px;
  object-fit: cover;
}

.aroma-story-copy h2,
.aroma-centered-head h2,
.aroma-awards h2,
.aroma-produce h2,
.aroma-testimonial-heading h2 {
  font-size: clamp(44px, 4.1vw, 62px);
  line-height: 1.07;
  letter-spacing: -0.045em;
}

.aroma-story-copy h2 {
  margin: 24px 0 28px;
}

.aroma-story-copy > p:not(.aroma-kicker) {
  color: rgba(17, 19, 31, 0.64);
  font-size: 15px;
  line-height: 1.75;
}

.aroma-story-copy ol {
  margin: 34px 0;
  padding: 0;
  list-style: none;
  border-block: 1px solid var(--ar-line);
}

.aroma-story-copy li {
  display: flex;
  gap: 24px;
  padding: 19px 0;
}

.aroma-story-copy li + li {
  border-top: 1px solid var(--ar-line);
}

.aroma-story-copy li span {
  color: rgba(17, 19, 31, 0.42);
}

/* Product rail */

.aroma-products {
  padding: 130px 0 150px;
  background: #fff;
}

.aroma-centered-head {
  max-width: 740px;
  margin: 0 auto 72px;
  text-align: center;
}

.aroma-centered-head .aroma-kicker {
  margin-bottom: 22px;
}

.aroma-product-rail {
  display: flex;
  gap: 28px;
  padding: 0 2px 25px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.aroma-product-rail::-webkit-scrollbar {
  display: none;
}

.aroma-rail-product {
  flex: 0 0 calc((100% - 84px) / 4);
  min-width: 255px;
  scroll-snap-align: start;
}

.aroma-product-image {
  position: relative;
  width: 100%;
  aspect-ratio: 0.9;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: #f4efe5;
  cursor: pointer;
}

.aroma-product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.65s ease;
}

.aroma-product-image:hover img {
  transform: scale(1.055);
}

.aroma-product-image > span {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: grid;
  place-items: center;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: var(--ar-coral);
  color: #fff;
  transform: translateY(70px);
  transition: transform 0.3s ease;
}

.aroma-product-image:hover > span {
  transform: translateY(0);
}

.aroma-rail-product > p {
  margin-top: 20px;
  color: rgba(17, 19, 31, 0.5);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.aroma-rail-product h3 {
  min-height: 54px;
  margin-top: 8px;
  font-size: 20px;
  line-height: 1.3;
}

.aroma-rail-product > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 15px;
  border-top: 1px solid var(--ar-line);
}

.aroma-rail-product > div > button {
  width: 36px;
  height: 36px;
  border: 1px solid var(--ar-line);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

/* Awards */

.aroma-awards {
  position: relative;
  min-height: 720px;
  padding: 132px 0 0;
  background: #fff;
  overflow: hidden;
}

.aroma-awards-top {
  display: grid;
  grid-template-columns: 0.85fr 1.35fr auto;
  gap: 6vw;
  align-items: end;
}

.aroma-awards-top > div:nth-child(2) p {
  max-width: 620px;
  padding-bottom: 18px;
  color: rgba(17, 19, 31, 0.62);
  font-size: 15px;
  line-height: 1.75;
  border-bottom: 1px solid var(--ar-line);
}

.aroma-awards h2 {
  margin-top: 22px;
}

.aroma-awards-top > button {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 0 18px;
  border: 0;
  background: none;
  font-weight: 700;
  cursor: pointer;
}

.aroma-awards-art {
  position: absolute;
  left: -40px;
  bottom: -36px;
  width: 520px;
  color: rgba(17, 19, 31, 0.14);
}

.aroma-bean-branch {
  width: 100%;
  height: auto;
}

/* Produce and newsletter */

.aroma-produce {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  min-height: 660px;
  background: var(--ar-bg);
}

.aroma-produce-media {
  overflow: hidden;
}

.aroma-produce-media img {
  width: 100%;
  height: 100%;
  min-height: 660px;
  object-fit: cover;
}

.aroma-produce-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 80px 8vw;
}

.aroma-produce-copy h2 {
  margin: 23px 0 28px;
}

.aroma-produce-copy > p:not(.aroma-kicker) {
  color: rgba(17, 19, 31, 0.63);
  font-size: 15px;
  line-height: 1.75;
}

.aroma-round-controls {
  display: flex;
  gap: 12px;
  margin-top: 38px;
}

.aroma-round-controls button {
  width: 50px;
  height: 50px;
  border: 1px solid var(--ar-line);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: background 0.25s ease, color 0.25s ease;
}

.aroma-round-controls button:hover {
  background: var(--ar-text);
  color: #fff;
}

.aroma-newsletter {
  padding: 64px 0;
  background: var(--ar-bg);
  border-top: 1px solid var(--ar-line);
}

.aroma-newsletter-grid {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 7vw;
  align-items: center;
}

.aroma-newsletter h2 {
  max-width: 520px;
  font-size: clamp(34px, 3.4vw, 50px);
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.aroma-newsletter form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 24px;
  align-items: end;
}

.aroma-newsletter label {
  border-bottom: 1px solid rgba(17, 19, 31, 0.45);
}

.aroma-newsletter input {
  width: 100%;
  padding: 15px 0;
  border: 0;
  outline: 0;
  background: transparent;
}

.aroma-newsletter button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 0;
  border: 0;
  background: transparent;
  font-weight: 800;
  cursor: pointer;
}

.aroma-newsletter small {
  grid-column: 1 / -1;
  color: rgba(17, 19, 31, 0.52);
  font-size: 10px;
}

/* Journal and marquee */

.aroma-journal {
  padding: 135px 0 145px;
  background: #fff;
}

.aroma-journal-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}

.aroma-journal-grid button {
  position: relative;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
}

.aroma-journal-grid img {
  width: 100%;
  aspect-ratio: 1.22;
  object-fit: cover;
}

.aroma-journal-grid button > span {
  display: block;
  margin-top: 20px;
  color: var(--ar-coral);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.aroma-journal-grid h3 {
  max-width: 85%;
  margin-top: 10px;
  font-size: 23px;
  line-height: 1.3;
}

.aroma-journal-grid i {
  position: absolute;
  right: 0;
  bottom: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--ar-line);
  border-radius: 50%;
  font-style: normal;
}

.aroma-marquee {
  overflow: hidden;
  padding: 34px 0 44px;
  background: #fff;
}

.aroma-marquee > div {
  display: flex;
  width: max-content;
  animation: aromaMarquee 23s linear infinite;
}

.aroma-marquee span {
  white-space: nowrap;
  font-size: clamp(70px, 8vw, 122px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.055em;
  text-transform: uppercase;
}

.aroma-marquee b {
  color: var(--ar-accent);
  font-size: 0.48em;
  vertical-align: 0.18em;
}

@keyframes aromaMarquee {
  to {
    transform: translateX(-50%);
  }
}

/* Testimonials */

.aroma-testimonials {
  padding: 115px 0 140px;
  background: #fff;
}

.aroma-testimonial-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7vw;
  align-items: end;
}

.aroma-testimonial-heading > p:last-child {
  max-width: 550px;
  margin-top: 26px;
  color: rgba(17, 19, 31, 0.62);
  line-height: 1.7;
}

.aroma-testimonial-heading h2 {
  max-width: 610px;
  margin-top: 22px;
}

.aroma-review-card {
  min-height: 390px;
  margin-top: 52px;
  padding: 58px;
  background: var(--ar-bg);
  text-align: center;
}

.aroma-review-avatar {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  margin: 0 auto 34px;
  border-radius: 50%;
  background: var(--ar-coral);
  color: #fff;
  font-size: 26px;
  font-weight: 800;
}

.aroma-review-card p {
  max-width: 560px;
  margin: 0 auto 34px;
  font-size: 16px;
  line-height: 1.75;
}

.aroma-review-card b,
.aroma-review-card small {
  display: block;
}

.aroma-review-card small {
  margin-top: 5px;
  color: rgba(17, 19, 31, 0.5);
}

.aroma-stat-panel {
  position: relative;
  min-height: 585px;
  overflow: hidden;
  background: var(--ar-coral);
  color: #fff;
}

.aroma-stat-panel > img {
  width: 100%;
  height: 285px;
  object-fit: cover;
}

.aroma-stat-panel > div {
  padding: 42px 50px;
}

.aroma-stat-panel h3 {
  max-width: 520px;
  font-size: 35px;
  line-height: 1.1;
}

.aroma-stat-panel dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
  margin: 36px 0 0;
  padding-top: 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.35);
}

.aroma-stat-panel dt {
  font-size: 13px;
}

.aroma-stat-panel dd {
  margin: 6px 0 2px;
  font-size: 48px;
  font-weight: 800;
}

.aroma-stat-panel dl p {
  font-size: 11px;
  opacity: 0.75;
}

/* Inner pages */

.aroma-page-hero {
  padding: 70px 0 110px;
}

.aroma-page-hero-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 8vw;
  align-items: end;
}

.aroma-page-hero-grid.without-media {
  grid-template-columns: minmax(0, 900px);
}

.aroma-page-hero h1 {
  margin: 22px 0 30px;
  font-size: clamp(56px, 6vw, 90px);
  line-height: 1;
  letter-spacing: -0.055em;
}

.aroma-lead {
  color: rgba(17, 19, 31, 0.63);
  font-size: 16px;
  line-height: 1.75;
}

.aroma-page-hero-media {
  height: 590px;
  overflow: hidden;
}

.aroma-page-hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.aroma-about-story,
.aroma-team,
.aroma-menu-page,
.aroma-gallery,
.aroma-form-page,
.aroma-contact,
.aroma-jobs,
.aroma-services-index,
.aroma-faq,
.aroma-career-detail {
  padding: 120px 0;
}

.aroma-about-grid,
.aroma-form-grid,
.aroma-contact-grid,
.aroma-item-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8vw;
  align-items: start;
}

.aroma-about-grid h2,
.aroma-team h2,
.aroma-contact-grid h2,
.aroma-form-grid h2,
.aroma-faq h2 {
  margin: 22px 0 28px;
  font-size: clamp(44px, 4.2vw, 64px);
  line-height: 1.08;
  letter-spacing: -0.045em;
}

.aroma-about-grid > div > p,
.aroma-form-grid > div > p {
  color: rgba(17, 19, 31, 0.64);
  font-size: 16px;
  line-height: 1.75;
}

.aroma-facts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 45px;
}

.aroma-facts span {
  padding-top: 18px;
  border-top: 1px solid var(--ar-line);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.aroma-facts b {
  display: block;
  font-size: 30px;
}

.aroma-about-collage {
  padding: 0 0 120px;
}

.aroma-about-collage .aroma-shell {
  display: grid;
  grid-template-columns: 1.4fr 0.6fr;
  gap: 26px;
}

.aroma-about-collage img {
  width: 100%;
  height: 640px;
  object-fit: cover;
}

.aroma-about-collage img:last-child {
  height: 430px;
  margin-top: 110px;
}

.aroma-team {
  background: var(--ar-text);
  color: #fff;
}

.aroma-team-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  justify-content: center;
}

.aroma-team-grid img {
  width: 100%;
  height: 430px;
  object-fit: cover;
}

.aroma-team-grid h3 {
  margin: 20px 0 6px;
  font-size: 27px;
}

.aroma-team-grid p {
  opacity: 0.62;
}

.aroma-service-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 25px;
}

.aroma-service-grid.count-1,
.aroma-service-grid.count-2 {
  display: flex;
  justify-content: center;
}

.aroma-service-grid.count-1 > div,
.aroma-service-grid.count-2 > div {
  width: min(430px, 100%);
}

.aroma-service-grid > div:nth-child(n + 4) {
  transform: translateX(50%);
}

.aroma-service-grid button {
  position: relative;
  width: 100%;
  padding: 0;
  border: 0;
  background: var(--ar-paper);
  color: var(--ar-text);
  text-align: left;
  cursor: pointer;
}

.aroma-service-grid img {
  width: 100%;
  height: 420px;
  object-fit: cover;
}

.aroma-service-grid button > span {
  position: absolute;
  top: 18px;
  left: 18px;
  padding: 12px;
  background: var(--ar-accent);
  color: var(--ar-text);
}

.aroma-service-grid button > div {
  position: relative;
  padding: 30px;
}

.aroma-service-grid h2 {
  margin: 12px 0;
  font-size: 34px;
}

.aroma-service-grid button > div > p:not(.aroma-kicker) {
  opacity: 0.64;
  line-height: 1.6;
}

.aroma-service-grid i {
  position: absolute;
  top: 28px;
  right: 24px;
}

.aroma-menu-page {
  background: var(--ar-text);
  color: #fff;
}

.aroma-menu-group {
  margin-bottom: 95px;
}

.aroma-menu-group-head {
  margin-bottom: 35px;
  padding-bottom: 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.aroma-menu-group-head h2 {
  margin-top: 15px;
  font-size: 58px;
}

.aroma-menu-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

.aroma-product-photo {
  position: relative;
  width: 100%;
  height: 360px;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: none;
  cursor: pointer;
}

.aroma-product-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.55s ease;
}

.aroma-product-photo:hover img {
  transform: scale(1.05);
}

.aroma-product-photo > span {
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  background: var(--ar-bg);
  color: var(--ar-text);
  font-size: 11px;
}

.aroma-product-copy {
  padding: 24px 2px;
}

.aroma-product-copy h3 {
  margin: 12px 0;
  font-size: 25px;
}

.aroma-product-copy > p:not(.aroma-kicker) {
  min-height: 66px;
  opacity: 0.64;
  font-size: 13px;
  line-height: 1.65;
}

.aroma-product-copy > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
}

.aroma-product-copy button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid currentColor;
  border-radius: 50%;
  background: none;
  color: inherit;
  cursor: pointer;
}

.aroma-menu-cta,
.aroma-section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 30px;
}

.aroma-menu-cta {
  margin-top: 60px;
  padding-top: 45px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.aroma-menu-cta h2 {
  font-size: 40px;
}

.aroma-item {
  padding: 80px 0 120px;
}

.aroma-item-grid {
  grid-template-columns: 1.1fr 0.9fr;
}

.aroma-item-gallery {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.aroma-item-gallery img {
  width: 100%;
  height: 300px;
  object-fit: cover;
}

.aroma-item-gallery img:first-child {
  grid-column: 1 / -1;
  height: 620px;
}

.aroma-item-copy {
  position: sticky;
  top: 120px;
}

.aroma-item-copy h1 {
  margin: 28px 0;
  font-size: clamp(52px, 6vw, 88px);
  line-height: 1;
}

.aroma-item-copy > strong {
  color: var(--ar-coral);
  font-size: 28px;
}

.aroma-item-copy > p {
  margin: 30px 0;
  color: rgba(17, 19, 31, 0.66);
  font-size: 16px;
  line-height: 1.75;
}

.aroma-item-copy ul {
  padding-left: 18px;
  line-height: 1.9;
}

.aroma-item-copy .aroma-primary {
  margin-top: 35px;
}

.aroma-gallery > .aroma-shell {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
}

.aroma-gallery button {
  grid-column: span 4;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: none;
  cursor: pointer;
}

.aroma-gallery button:nth-child(5n + 1),
.aroma-gallery button:nth-child(5n + 4) {
  grid-column: span 7;
}

.aroma-gallery button:nth-child(5n + 2),
.aroma-gallery button:nth-child(5n + 5) {
  grid-column: span 5;
}

.aroma-gallery img {
  width: 100%;
  height: 420px;
  object-fit: cover;
}

.aroma-form-page,
.aroma-contact {
  padding: 90px 0 100px;
  background: var(--ar-text);
  color: #fff;
}

.aroma-form-grid form,
.aroma-contact-grid form {
  color: var(--ar-text);
}

.aroma-form-intro {
  max-width: 560px;
  padding-top: 22px;
}

.aroma-partner-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 38px;
}

.aroma-partner-notes span {
  padding: 10px 14px;
  border: 1px solid rgba(247, 240, 228, 0.2);
  color: rgba(247, 240, 228, 0.78);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.aroma-message-panel {
  padding: 46px 48px 42px;
  background: #f4eee4;
  color: #17110c;
}

.aroma-message-panel h3 {
  max-width: 520px;
  margin: 12px 0 34px;
  font-size: clamp(34px, 3.4vw, 52px);
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.aroma-message-panel form {
  display: grid;
  gap: 22px;
  padding: 0;
  background: transparent;
}

.aroma-message-panel form .grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}

.aroma-message-panel .tp-label {
  display: block;
  margin-bottom: 7px;
  color: rgba(23, 17, 12, 0.62);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.aroma-message-panel .tp-input {
  width: 100%;
  min-height: 44px;
  padding: 8px 0;
  border: 0;
  border-bottom: 1px solid rgba(23, 17, 12, 0.28);
  border-radius: 0;
  outline: 0;
  background: transparent;
  color: #17110c;
}

.aroma-message-panel textarea.tp-input {
  min-height: 88px;
  resize: vertical;
}

.aroma-message-panel .tp-input:focus {
  border-color: var(--ar-accent);
}

.aroma-message-panel .tp-btn-primary {
  min-height: 52px;
  padding: 14px 22px;
  border: 1px solid #17110c;
  background: #17110c;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background .25s ease, color .25s ease;
}

.aroma-message-panel .tp-btn-primary:hover {
  background: transparent;
  color: #17110c;
}

.aroma-contact-grid {
  align-items: stretch;
  gap: 6vw;
}

.aroma-contact-details {
  display: flex;
  min-height: 100%;
  padding: 24px 0;
  flex-direction: column;
  justify-content: space-between;
}

.aroma-contact-details h2 {
  max-width: 620px;
  margin-bottom: 42px;
}

.aroma-contact-links {
  padding-top: 30px;
  border-top: 1px solid rgba(247, 240, 228, 0.2);
}

.aroma-contact-grid a {
  display: block;
  width: fit-content;
  margin: 12px 0;
  color: #f7f0e4;
  font-size: 17px;
  text-decoration: none;
  transition: color .25s ease;
}

.aroma-contact-grid a:hover {
  color: var(--ar-accent);
}

.aroma-contact-map {
  margin-top: 56px;
  overflow: hidden;
}

.aroma-contact-map iframe {
  display: block;
  width: 100%;
  height: 390px;
  border: 0;
  filter: saturate(.8) contrast(1.05);
}

.aroma-quote-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  margin-top: 55px;
}

.aroma-quote-grid > div {
  display: flex;
  flex-direction: column;
  min-height: 270px;
  padding: 34px;
  background: var(--ar-bg);
  color: var(--ar-text);
}

.aroma-quote-grid span {
  color: var(--ar-coral);
  font-size: 58px;
  line-height: 0.8;
}

.aroma-quote-grid p {
  flex: 1;
  margin: 22px 0;
  line-height: 1.7;
}

.aroma-jobs .aroma-shell > button {
  display: grid;
  grid-template-columns: 80px 1fr 1fr 30px;
  gap: 25px;
  align-items: center;
  width: 100%;
  padding: 28px 0;
  border: 0;
  border-top: 1px solid var(--ar-line);
  background: none;
  text-align: left;
  cursor: pointer;
}

.aroma-jobs h3 {
  font-size: 28px;
}

.aroma-career-detail > .aroma-shell {
  max-width: 900px;
}

.aroma-career-detail h1 {
  margin: 35px 0;
  font-size: 72px;
}

.aroma-empty {
  padding: 90px 20px;
  text-align: center;
}

/* Footer */

.aroma-footer {
  padding: 92px 0 30px;
  background: #0d0c09;
  color: #fff;
}

.aroma-footer .aroma-wordmark svg {
  color: var(--ar-accent);
}

.aroma-footer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 50px;
  padding-bottom: 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.aroma-footer-top nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 28px;
}

.aroma-footer-top nav button,
.aroma-footer-grid button {
  padding: 0;
  border: 0;
  background: none;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.aroma-footer-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr 0.7fr;
  gap: 8vw;
  padding: 52px 0;
}

.aroma-footer-grid > div {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  line-height: 1.65;
}

.aroma-footer-grid a {
  text-decoration: none;
}

.aroma-footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.13);
  font-size: 11px;
  opacity: 0.72;
}

.aroma-footer-bottom > div {
  display: flex;
  gap: 10px;
}

.aroma-footer-bottom > div > * {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.07);
}

/* Booking modal and loader */

.aroma-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 24px;
}

.aroma-modal-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(12, 11, 8, 0.75);
  backdrop-filter: blur(8px);
}

.aroma-modal-panel {
  position: relative;
  display: grid;
  grid-template-columns: 0.82fr 1.18fr;
  width: min(1050px, 100%);
  height: min(680px, calc(100svh - 40px));
  overflow: hidden;
  background: var(--ar-bg);
}

.aroma-modal-panel > aside {
  position: relative;
  min-height: 0;
  color: #fff;
}

.aroma-modal-panel > aside > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.aroma-modal-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.78), transparent 70%);
}

.aroma-modal-story {
  position: absolute;
  right: 34px;
  bottom: 32px;
  left: 34px;
}

.aroma-modal-story h2,
.aroma-modal-form h2 {
  margin: 12px 0;
  font-size: 36px;
  line-height: 1.05;
}

.aroma-modal-story > p:last-child {
  line-height: 1.65;
  opacity: 0.78;
}

.aroma-modal-form {
  display: flex;
  min-height: 0;
  padding: 36px 46px 32px;
  flex-direction: column;
  justify-content: center;
}

.aroma-modal-close {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0 0 3px;
  border: 1px solid var(--ar-line);
  border-radius: 50%;
  background: var(--ar-bg);
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.aroma-modal-form form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 20px;
  margin-top: 16px;
}

.aroma-modal-form form > div {
  min-width: 0;
}

.aroma-modal-form form > div.col-span-2 {
  grid-column: 1 / -1;
}

.aroma-modal-form .tp-label {
  display: block;
  margin-bottom: 4px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.aroma-modal-form .tp-input {
  width: 100%;
  min-height: 36px;
  padding: 5px 2px;
  border: 0;
  border-bottom: 1px solid rgba(17, 19, 31, 0.25);
  border-radius: 0;
  outline: 0;
  background: transparent;
  color: var(--ar-text);
}

.aroma-modal-form textarea.tp-input {
  min-height: 54px;
  resize: none;
}

.aroma-modal-form .tp-input:focus {
  border-color: var(--ar-coral);
}

.aroma-modal-form .tp-btn-primary {
  width: 100%;
  min-height: 44px;
  padding: 11px 20px;
  border: 0;
  background: var(--ar-text);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.aroma-modal-form .tp-tab {
  padding: 10px 14px;
  border: 1px solid var(--ar-line);
  background: transparent;
}

.aroma-modal-form form > div[class*="sm:col-span-1"] {
  grid-column: auto;
}

.aroma-loader {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #0d0c09;
  color: #fff;
}

.aroma-loader-bean {
  position: relative;
  width: 64px;
  height: 86px;
  border: 3px solid var(--ar-accent);
  border-radius: 50%;
  animation: aromaPulse 1s ease-in-out infinite alternate;
}

.aroma-loader-bean::after {
  content: "";
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 50%;
  width: 2px;
  background: var(--ar-accent);
  transform: rotate(18deg);
}

.aroma-loader strong {
  max-width: 80vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 22px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.aroma-loader > span {
  font-size: 9px;
  letter-spacing: 0.2em;
  opacity: 0.6;
}

@keyframes aromaPulse {
  to {
    transform: rotate(7deg) scale(1.06);
  }
}

@media (max-width: 1180px) {
  .aroma-shell {
    width: min(calc(100% - 70px), 1380px);
  }

  .aroma-header-inner {
    grid-template-columns: 1fr auto;
  }

  .aroma-header nav,
  .aroma-header > .aroma-shell > .aroma-header-cta {
    display: none;
  }

  .aroma-menu-toggle {
    display: flex;
    width: 48px;
    height: 48px;
    border: 1px solid var(--ar-line);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 7px;
  }

  .aroma-menu-toggle span {
    width: 21px;
    height: 2px;
    background: currentColor;
  }

  .aroma-mobile-menu {
    position: fixed;
    inset: 0;
    z-index: 35;
    display: flex;
    padding: 120px 7vw 45px;
    background: var(--ar-accent);
    flex-direction: column;
  }

  .aroma-mobile-menu > .aroma-wordmark {
    position: absolute;
    top: 32px;
  }

  .aroma-mobile-menu nav {
    display: flex;
    flex-direction: column;
  }

  .aroma-mobile-menu nav button {
    padding: 12px 0;
    border: 0;
    border-bottom: 1px solid rgba(17, 19, 31, 0.2);
    background: none;
    text-align: left;
    font-size: clamp(30px, 5vw, 54px);
    font-weight: 800;
  }

  .aroma-mobile-menu nav span {
    margin-right: 18px;
    font-size: 10px;
  }

  .aroma-mobile-menu > .aroma-header-cta {
    align-self: flex-start;
    margin-top: 28px;
    background: var(--ar-text);
    color: #fff !important;
  }

  .aroma-story-grid {
    gap: 6vw;
  }

  .aroma-product-rail {
    margin-right: -35px;
  }

  .aroma-rail-product {
    flex-basis: 31%;
  }
}

@media (max-width: 760px) {
  .aroma-shell {
    width: min(calc(100% - 36px), 1380px);
  }

  .aroma-header {
    height: 78px;
  }

  .aroma-wordmark svg,
  .aroma-wordmark img {
    width: 36px;
    height: 36px;
  }

  .aroma-wordmark b {
    max-width: 210px;
    font-size: 16px;
  }

  .aroma-hero {
    padding-top: 42px;
  }

  .aroma-hero-intro {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .aroma-hero h1 {
    font-size: clamp(43px, 12vw, 64px);
  }

  .aroma-hero-side {
    max-width: 500px;
  }

  .aroma-hero-media {
    width: 100%;
    height: 430px;
    margin-top: 48px;
  }

  .aroma-pillar-grid {
    grid-template-columns: 1fr 1fr;
  }

  .aroma-pillar-grid > div {
    min-height: 174px;
    padding: 22px 16px;
    border-bottom: 1px solid var(--ar-line);
  }

  .aroma-story,
  .aroma-products,
  .aroma-journal,
  .aroma-testimonials,
  .aroma-about-story,
  .aroma-team,
  .aroma-menu-page,
  .aroma-gallery,
  .aroma-form-page,
  .aroma-contact,
  .aroma-jobs,
  .aroma-services-index,
  .aroma-faq,
  .aroma-career-detail {
    padding: 78px 0;
  }

  .aroma-story-grid,
  .aroma-page-hero-grid,
  .aroma-about-grid,
  .aroma-form-grid,
  .aroma-contact-grid,
  .aroma-item-grid {
    grid-template-columns: 1fr;
    gap: 38px;
    min-height: 0;
  }

  .aroma-story-media img {
    min-height: 0;
    height: 440px;
  }

  .aroma-story-copy h2,
  .aroma-centered-head h2,
  .aroma-awards h2,
  .aroma-produce h2,
  .aroma-testimonial-heading h2 {
    font-size: 43px;
  }

  .aroma-product-rail {
    margin-right: -18px;
    gap: 18px;
  }

  .aroma-rail-product {
    flex-basis: 78%;
  }

  .aroma-awards {
    min-height: 620px;
    padding-top: 82px;
  }

  .aroma-awards-top {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 28px;
  }

  .aroma-awards-top > button {
    justify-self: start;
  }

  .aroma-awards-art {
    width: 430px;
  }

  .aroma-produce {
    grid-template-columns: 1fr;
  }

  .aroma-produce-media img {
    min-height: 0;
    height: 440px;
  }

  .aroma-produce-copy {
    padding: 70px 24px;
  }

  .aroma-newsletter-grid {
    grid-template-columns: 1fr;
    gap: 38px;
  }

  .aroma-newsletter form {
    grid-template-columns: 1fr;
  }

  .aroma-newsletter small {
    grid-column: auto;
  }

  .aroma-journal-grid,
  .aroma-testimonial-grid,
  .aroma-team-grid,
  .aroma-service-grid,
  .aroma-menu-list,
  .aroma-quote-grid {
    grid-template-columns: 1fr;
  }

  .aroma-journal-grid {
    gap: 52px;
  }

  .aroma-marquee span {
    font-size: 67px;
  }

  .aroma-review-card {
    min-height: 0;
    padding: 40px 24px;
  }

  .aroma-stat-panel {
    min-height: 0;
  }

  .aroma-stat-panel > div {
    padding: 36px 28px;
  }

  .aroma-page-hero {
    padding: 45px 0 75px;
  }

  .aroma-page-hero h1 {
    font-size: 50px;
  }

  .aroma-page-hero-media {
    height: 430px;
  }

  .aroma-about-collage .aroma-shell {
    grid-template-columns: 1fr;
  }

  .aroma-about-collage img,
  .aroma-about-collage img:last-child {
    height: 430px;
    margin: 0;
  }

  .aroma-facts {
    grid-template-columns: 1fr;
  }

  .aroma-service-grid.count-1,
  .aroma-service-grid.count-2 {
    display: grid;
  }

  .aroma-service-grid.count-1 > div,
  .aroma-service-grid.count-2 > div {
    width: 100%;
  }

  .aroma-service-grid > div:nth-child(n + 4) {
    transform: none;
  }

  .aroma-item-gallery img:first-child {
    height: 430px;
  }

  .aroma-item-copy {
    position: static;
  }

  .aroma-gallery > .aroma-shell {
    grid-template-columns: 1fr;
  }

  .aroma-gallery button,
  .aroma-gallery button:nth-child(5n + 1),
  .aroma-gallery button:nth-child(5n + 2),
  .aroma-gallery button:nth-child(5n + 4),
  .aroma-gallery button:nth-child(5n + 5) {
    grid-column: 1;
  }

  .aroma-gallery img {
    height: 350px;
  }

  .aroma-menu-cta,
  .aroma-section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .aroma-jobs .aroma-shell > button {
    grid-template-columns: 48px 1fr 24px;
  }

  .aroma-jobs .aroma-shell > button p {
    display: none;
  }

  .aroma-footer {
    padding-top: 70px;
  }

  .aroma-footer-top {
    align-items: flex-start;
    flex-direction: column;
  }

  .aroma-footer-top nav {
    justify-content: flex-start;
    gap: 18px;
  }

  .aroma-footer-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .aroma-footer-bottom {
    align-items: flex-start;
    flex-direction: column;
    gap: 22px;
  }

  .aroma-form-page,
  .aroma-contact {
    padding: 64px 0 74px;
  }

  .aroma-form-intro,
  .aroma-contact-details {
    padding-top: 0;
  }

  .aroma-message-panel {
    padding: 30px 22px 26px;
  }

  .aroma-message-panel h3 {
    margin-bottom: 26px;
  }

  .aroma-message-panel form .grid {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .aroma-contact-details {
    padding-bottom: 8px;
  }

  .aroma-contact-details h2 {
    margin-bottom: 30px;
  }

  .aroma-contact-map {
    margin-top: 34px;
  }

  .aroma-contact-map iframe {
    height: 300px;
  }

  .aroma-modal {
    padding: 8px;
  }

  .aroma-modal-panel {
    grid-template-columns: 1fr;
    width: min(560px, 100%);
    height: auto;
    max-height: calc(100svh - 16px);
  }

  .aroma-modal-panel > aside {
    display: none;
  }

  .aroma-modal-form {
    padding: 24px 18px 18px;
  }

  .aroma-modal-form h2 {
    max-width: calc(100% - 50px);
    margin: 8px 0;
    font-size: clamp(27px, 8vw, 34px);
  }

  .aroma-modal-form form {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px 14px;
    margin-top: 10px;
  }

  .aroma-modal-form form > div[class*="sm:col-span-1"] {
    grid-column: auto;
  }

  .aroma-modal-form .tp-input {
    min-height: 34px;
    padding: 4px 1px;
    font-size: 14px;
  }

  .aroma-modal-form textarea.tp-input {
    min-height: 48px;
  }

  .aroma-modal-close {
    top: 12px;
    right: 12px;
    width: 40px;
    height: 40px;
    font-size: 24px;
  }

  .aroma-modal-story {
    right: 22px;
    bottom: 24px;
    left: 22px;
  }

  .aroma-modal-story h2 {
    font-size: 33px;
  }

  .aroma-modal-story > p:last-child {
    display: none;
  }
}

/* Root Aromatica cafe — reference-led dark cinematic skin */

.aroma {
  --ar-bg: #0d0b08;
  --ar-paper: #17130e;
  --ar-text: #f7f0e4;
  --ar-accent: #eda941;
  --ar-coral: #e97655;
  --ar-line: rgba(255, 255, 255, 0.16);
  background: #0d0b08;
  color: var(--ar-text);
}

.aroma h1,
.aroma h2,
.aroma h3 {
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 400;
}

.aroma-kicker {
  color: var(--ar-accent);
  font-family: "Manrope", sans-serif;
}

.aroma-header {
  position: absolute;
  inset: 0 0 auto;
  height: 126px;
  background: transparent;
  color: #fff;
}

.aroma-header[data-scrolled="true"] {
  position: fixed;
  height: 82px;
  background: rgba(10, 8, 6, 0.94);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}

.aroma-header-inner {
  grid-template-areas: "nav logo cta";
  grid-template-columns: 1fr auto 1fr;
}

.aroma-logo {
  grid-area: logo;
  justify-self: center;
}

.aroma-header nav {
  grid-area: nav;
  justify-self: start;
}

.aroma-header-cta {
  grid-area: cta;
  border: 1px solid rgba(237, 169, 65, 0.7);
  background: transparent;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.aroma-header nav button {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.aroma-header nav button::after {
  background: var(--ar-accent);
}

.aroma-wordmark b {
  color: #fff;
  font-size: 17px;
}

.aroma-wordmark svg {
  color: var(--ar-accent);
}

.aroma-cafe-hero {
  position: relative;
  min-height: 100svh;
  overflow: hidden;
  color: #fff;
}

.aroma-cafe-hero-media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.aroma-cafe-hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.aroma-cafe-hero-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(9, 7, 5, 0.72), rgba(9, 7, 5, 0.25) 58%, rgba(9, 7, 5, 0.5)), linear-gradient(0deg, rgba(9, 7, 5, 0.76), transparent 55%);
}

.aroma-cafe-hero-copy {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 100svh;
  padding-top: 205px;
  padding-bottom: 60px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.aroma-cafe-hero h1 {
  max-width: 1080px;
  font-size: clamp(58px, 7.1vw, 112px);
  line-height: 0.94;
  letter-spacing: -0.055em;
  text-wrap: balance;
  text-shadow: 0 8px 34px rgba(0, 0, 0, 0.35);
}

.aroma-cafe-hero .aroma-kicker {
  margin-bottom: 32px;
  color: #fff;
}

.aroma-script-title {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin-top: -8px !important;
  color: var(--ar-accent);
  font-family: "Brush Script MT", "Segoe Script", cursive;
  font-size: clamp(70px, 7.4vw, 120px);
  line-height: 0.9;
  text-wrap: balance;
}

.aroma-hero-scroll {
  position: absolute;
  z-index: 2;
  bottom: 28px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: none;
  color: #fff;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transform: translateX(-50%);
  cursor: pointer;
}

.aroma-hero-scroll span {
  width: 1px;
  height: 34px;
  background: var(--ar-accent);
  animation: aromaScroll 1.5s ease-in-out infinite;
}

@keyframes aromaHeroScale {
  from {
    transform: scale(1.08);
  }

  to {
    transform: scale(1);
  }
}

@keyframes aromaScroll {
  50% {
    transform: scaleY(0.4);
    transform-origin: bottom;
  }
}

.aroma-dark-story,
.aroma-review-stage,
.aroma-specials,
.aroma-enjoy,
.aroma-numbers,
.aroma-journal-dark,
.aroma-instagram {
  position: relative;
  background: #0d0b08;
  color: #f7f0e4;
}

.aroma-dark-story {
  min-height: 680px;
  padding: 150px 0;
  overflow: hidden;
}

.aroma-dark-story-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 11vw;
  align-items: start;
}

.aroma-dark-story h2,
.aroma-try-copy h2,
.aroma-specials h2,
.aroma-enjoy h2,
.aroma-journal-dark h2 {
  margin-top: 22px;
  font-size: clamp(54px, 5.2vw, 82px);
  line-height: 1.02;
  letter-spacing: -0.045em;
}

.aroma-dark-story-copy {
  padding-top: 48px;
}

.aroma-dark-story-copy p {
  margin-bottom: 25px;
  color: rgba(247, 240, 228, 0.66);
  font-size: 15px;
  line-height: 1.85;
}

.aroma-text-link {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 38px;
  padding: 0 0 8px;
  border: 0;
  border-bottom: 1px solid var(--ar-accent);
  background: none;
  color: #fff;
  cursor: pointer;
}

.aroma-coffee-branch {
  position: absolute;
  right: -50px;
  bottom: -100px;
  width: min(46vw, 680px);
  color: rgba(237, 169, 65, 0.22);
}

.aroma-review-stage {
  padding: 110px 0 135px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.aroma-review-slide {
  max-width: 940px;
  margin: auto;
  text-align: center;
}

.aroma-review-portrait {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  margin: 0 auto 22px;
  border: 8px solid var(--ar-accent);
  border-radius: 50%;
  background: #2a2118;
  font-family: Georgia, serif;
  font-size: 30px;
}

.aroma-review-quote {
  display: block;
  height: 45px;
  color: var(--ar-accent);
  font: 76px/1 Georgia, serif;
}

.aroma-review-slide blockquote {
  margin: 18px auto 30px;
  font: clamp(27px, 3.2vw, 48px)/1.35 Georgia, serif;
}

.aroma-review-slide strong,
.aroma-review-slide small {
  display: block;
}

.aroma-review-slide small {
  margin-top: 6px;
  color: rgba(247, 240, 228, 0.5);
}

.aroma-review-controls {
  display: flex;
  max-width: 520px;
  margin: 45px auto 0;
  align-items: center;
  justify-content: space-between;
}

.aroma-review-controls > button {
  width: 45px;
  height: 45px;
  border: 1px solid var(--ar-line);
  border-radius: 50%;
  background: none;
  color: #fff;
  cursor: pointer;
}

.aroma-review-controls > div {
  display: flex;
  gap: 10px;
}

.aroma-review-controls > div button {
  width: 7px;
  height: 7px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);
}

.aroma-review-controls > div button.is-active {
  background: var(--ar-accent);
  transform: scale(1.35);
}

.aroma-try-section {
  padding: 150px 0;
  background: #f4eee4;
  color: #18120d;
}

.aroma-try-grid {
  display: grid;
  grid-template-columns: 1.05fr 0.8fr;
  gap: 9vw;
  align-items: center;
}

.aroma-try-collage {
  position: relative;
  min-height: 690px;
}

.aroma-try-collage img:first-child {
  position: absolute;
  top: 0;
  left: 0;
  width: 64%;
  height: 80%;
  object-fit: cover;
}

.aroma-try-collage img:last-child {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 55%;
  height: 58%;
  border: 14px solid #f4eee4;
  object-fit: cover;
}

.aroma-try-copy > p:not(.aroma-kicker) {
  margin: 32px 0;
  color: rgba(24, 18, 13, 0.65);
  line-height: 1.8;
}

.aroma-try-copy ul {
  margin: 0 0 38px;
  padding: 0;
  list-style: none;
}

.aroma-try-copy li {
  padding: 13px 0;
  border-bottom: 1px solid rgba(24, 18, 13, 0.14);
}

.aroma-try-copy li::before {
  content: "✓";
  margin-right: 14px;
  color: var(--ar-coral);
  font-weight: 800;
}

.aroma-specials {
  padding: 135px 0 145px;
}

.aroma-centered-head {
  text-align: center;
}

.aroma-specials-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 54px 30px;
  margin-top: 75px;
}

.aroma-special-item {
  display: grid;
  grid-template-columns: 190px 1fr;
  gap: 30px;
  align-items: center;
  padding: 0 0 30px;
  border-bottom: 1px solid var(--ar-line);
}

.aroma-special-image {
  position: relative;
  width: 190px;
  height: 190px;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 50%;
  background: #1b1712;
  cursor: pointer;
}

.aroma-special-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.aroma-special-image:hover img {
  transform: scale(1.08) rotate(2deg);
}

.aroma-special-image span {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--ar-accent);
  color: #17110c;
  font-size: 10px;
  font-weight: 800;
}

.aroma-special-item > div > p:first-child {
  color: var(--ar-accent);
  font-size: 10px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.aroma-special-item h3 {
  margin: 8px 0 12px;
  font-size: 32px;
}

.aroma-special-item > div > p:nth-child(3) {
  min-height: 50px;
  color: rgba(247, 240, 228, 0.55);
  font-size: 12px;
  line-height: 1.6;
}

.aroma-special-item > div > button {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 0;
  border: 0;
  background: none;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.aroma-outline-button {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 60px auto 0;
  padding: 17px 28px;
  border: 1px solid var(--ar-accent);
  background: none;
  color: #fff;
  cursor: pointer;
}

.aroma-video-story {
  position: relative;
  min-height: 760px;
  overflow: hidden;
  color: #fff;
}

.aroma-video-story > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.aroma-video-shade {
  position: absolute;
  inset: 0;
  background: rgba(9, 7, 5, 0.35);
}

.aroma-video-copy {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.aroma-video-copy h2 {
  max-width: 760px;
  margin: 20px 0 40px;
  font-size: clamp(52px, 6vw, 92px);
  line-height: 1;
}

.aroma-video-copy button {
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
  border: 1px solid #fff;
  border-radius: 50%;
  background: rgba(10, 8, 6, 0.22);
  color: #fff;
  font-size: 10px;
  text-transform: uppercase;
  cursor: pointer;
  backdrop-filter: blur(5px);
}

.aroma-video-copy button span {
  display: block;
  margin-bottom: -28px;
  font-size: 21px;
}

.aroma-enjoy {
  min-height: 720px;
  padding: 145px 0;
  overflow: hidden;
}

.aroma-enjoy-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 0.75fr;
  gap: 11vw;
  align-items: center;
}

.aroma-enjoy-grid > div:first-child > p:not(.aroma-kicker) {
  max-width: 620px;
  margin: 32px 0;
  color: rgba(247, 240, 228, 0.62);
  line-height: 1.8;
}

.aroma-hours {
  padding: 48px;
  border: 1px solid rgba(237, 169, 65, 0.35);
  background: rgba(255, 255, 255, 0.025);
}

.aroma-hours h3 {
  margin-bottom: 28px;
  font-size: 34px;
}

.aroma-hours div {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 0;
  border-top: 1px solid var(--ar-line);
  font-size: 12px;
}

.aroma-cup-line {
  position: absolute;
  right: 1vw;
  bottom: -100px;
  color: rgba(237, 169, 65, 0.1);
  font-size: 420px;
  line-height: 1;
  transform: rotate(-9deg);
}

.aroma-numbers {
  padding: 85px 0;
  border-top: 1px solid rgba(255,255,255,.08);
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.aroma-numbers .aroma-shell {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.aroma-numbers .aroma-shell > div {
  position: relative;
  min-height: 150px;
  padding: 32px;
  border-right: 1px solid var(--ar-line);
  text-align: center;
}

.aroma-numbers .aroma-shell > div:first-child {
  border-left: 1px solid var(--ar-line);
}

.aroma-numbers strong {
  display: block;
  color: rgba(237, 169, 65, 0.15);
  font: 96px/.8 Georgia, serif;
}

.aroma-numbers span {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.aroma-journal-dark {
  padding: 135px 0;
}

.aroma-journal-dark-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  margin-top: 70px;
}

.aroma-journal-dark-grid button {
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: #fff;
  text-align: left;
  cursor: pointer;
}

.aroma-blog-image {
  position: relative;
  display: block;
  height: 300px;
  overflow: hidden;
}

.aroma-blog-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .65s ease;
}

.aroma-journal-dark-grid button:hover img {
  transform: scale(1.06);
}

.aroma-blog-image i {
  position: absolute;
  top: 0;
  right: 0;
  display: grid;
  place-items: center;
  width: 62px;
  height: 70px;
  background: var(--ar-coral);
  color: #fff;
  font: normal 21px/1 Georgia, serif;
}

.aroma-blog-image small {
  display: block;
  margin-top: -17px;
  font: 8px/1 "Manrope", sans-serif;
  text-transform: uppercase;
}

.aroma-blog-meta {
  display: block;
  margin-top: 22px;
  color: var(--ar-accent);
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.aroma-journal-dark-grid h3 {
  margin-top: 12px;
  font-size: 31px;
  line-height: 1.2;
}

.aroma-more-news {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 58px auto 0;
}

.aroma-instagram {
  padding: 35px 0 80px;
  text-align: center;
}

.aroma-instagram > p {
  margin-bottom: 34px;
  font-weight: 700;
}

.aroma-instagram > div {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 24px;
  width: min(calc(100% - 80px), 1400px);
  margin: auto;
}

.aroma-instagram img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.aroma-page-hero {
  padding-top: 190px;
  background: #0d0b08;
  color: #fff;
}

.aroma-page-hero.without-media {
  padding-bottom: 50px;
}

.aroma-page-hero .aroma-lead,
.aroma-about-grid > div > p,
.aroma-form-grid > div > p,
.aroma-item-copy > p {
  color: rgba(247, 240, 228, 0.65);
}

.aroma-about-story,
.aroma-team,
.aroma-gallery,
.aroma-contact,
.aroma-jobs,
.aroma-services-index,
.aroma-faq,
.aroma-career-detail,
.aroma-item {
  background: #0d0b08;
  color: #fff;
}

.aroma-team {
  background: #17130e;
}

.aroma-form-page,
.aroma-contact,
.aroma-menu-page {
  background: #0d0b08;
}

.aroma-form-grid form,
.aroma-contact-grid form,
.aroma-modal-panel,
.aroma-modal-form {
  background: #f4eee4;
  color: #17110c;
}

.aroma .aroma-modal-close {
  background: #17110c;
  color: #fff;
  font-size: 28px;
}

.aroma-modal-form .tp-input {
  color: #17110c;
}

.aroma-modal-form .tp-btn-primary {
  background: #17110c;
  color: #fff;
}

.aroma-footer {
  padding: 55px 0 26px;
  background: radial-gradient(circle at 50% 25%, #18120c, #080705 72%);
}

.aroma-footer-top {
  flex-direction: column;
  justify-content: center;
  border: 0;
}

.aroma-footer-top .aroma-wordmark {
  justify-content: center;
}

.aroma-footer-top nav {
  justify-content: center;
}

.aroma-footer-grid {
  display: none;
}

.aroma-footer-bottom {
  margin-top: 0;
}

@media (max-width: 1180px) {
  .aroma-header-inner {
    grid-template-areas: "logo menu";
    grid-template-columns: 1fr auto;
  }

  .aroma-logo {
    justify-self: start;
  }

  .aroma-menu-toggle {
    grid-area: menu;
    border-color: rgba(255,255,255,.45);
  }

  .aroma-mobile-menu {
    background: #0d0b08;
    color: #fff;
  }

  .aroma-mobile-menu > .aroma-wordmark {
    display: none;
  }

  .aroma-mobile-menu nav button {
    border-color: rgba(255,255,255,.15);
  }

  .aroma-mobile-menu > .aroma-header-cta {
    border-color: var(--ar-accent);
    background: var(--ar-coral);
  }

  .aroma-special-item {
    grid-template-columns: 145px 1fr;
  }

  .aroma-special-image {
    width: 145px;
    height: 145px;
  }
}

@media (max-width: 760px) {
  .aroma-cafe-hero-copy {
    padding-top: 135px;
  }

  .aroma-cafe-hero h1 {
    font-size: clamp(50px, 15vw, 72px);
  }

  .aroma-script-title {
    margin-top: 20px !important;
    font-size: 72px;
  }

  .aroma-dark-story,
  .aroma-review-stage,
  .aroma-try-section,
  .aroma-specials,
  .aroma-enjoy,
  .aroma-journal-dark {
    padding: 85px 0;
  }

  .aroma-dark-story-grid,
  .aroma-try-grid,
  .aroma-enjoy-grid {
    grid-template-columns: 1fr;
    gap: 50px;
  }

  .aroma-dark-story-copy {
    padding-top: 0;
  }

  .aroma-dark-story h2,
  .aroma-try-copy h2,
  .aroma-specials h2,
  .aroma-enjoy h2,
  .aroma-journal-dark h2 {
    font-size: 48px;
  }

  .aroma-coffee-branch {
    width: 520px;
    opacity: .7;
  }

  .aroma-review-slide blockquote {
    font-size: 29px;
  }

  .aroma-try-collage {
    min-height: 490px;
  }

  .aroma-specials-grid,
  .aroma-journal-dark-grid {
    grid-template-columns: 1fr;
  }

  .aroma-special-item {
    grid-template-columns: 108px 1fr;
    gap: 20px;
  }

  .aroma-special-image {
    width: 108px;
    height: 108px;
  }

  .aroma-special-item h3 {
    font-size: 25px;
  }

  .aroma-special-item > div > p:nth-child(3) {
    display: none;
  }

  .aroma-video-story {
    min-height: 560px;
  }

  .aroma-video-copy h2 {
    font-size: 50px;
  }

  .aroma-numbers .aroma-shell {
    grid-template-columns: 1fr 1fr;
  }

  .aroma-numbers .aroma-shell > div:nth-child(3) {
    border-left: 1px solid var(--ar-line);
  }

  .aroma-instagram > div {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    width: calc(100% - 36px);
  }

  .aroma-instagram img:nth-child(n + 5) {
    display: none;
  }

  .aroma-footer-top {
    align-items: center;
  }

  .aroma-footer-top nav {
    justify-content: center;
  }
}

/* Reference fidelity pass: editable Aromatica home */

.aroma {
  font-family: "Poppins", "Manrope", Arial, sans-serif;
}

.aroma h1,
.aroma h2,
.aroma h3 {
  font-family: "Poppins", "Manrope", Arial, sans-serif;
  font-weight: 600;
}

.aroma-header {
  height: 122px;
}

.aroma-header-inner {
  display: flex;
  width: min(calc(100% - 140px), 1440px);
  align-items: center;
  gap: 24px;
}

.aroma-logo {
  flex: 0 0 470px;
  max-width: 470px;
  margin-right: auto;
}

.aroma-wordmark {
  gap: 16px;
}

.aroma-wordmark svg,
.aroma-wordmark img {
  width: 64px;
  height: 64px;
}

.aroma-wordmark b {
  font-size: 23px;
  font-weight: 600;
  letter-spacing: 0;
}

.aroma-header nav {
  margin-left: auto;
  gap: 22px;
}

.aroma-header nav button {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.aroma-header > .aroma-shell > .aroma-header-cta {
  display: inline-flex;
  width: auto;
  min-width: 162px;
  height: 52px;
  padding: 0 24px;
  align-items: center;
  justify-content: center;
  border-color: var(--ar-accent);
  border-radius: 0;
  background: rgba(13, 11, 8, .38);
  color: #fff7e8;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: .12em;
  white-space: nowrap;
  transition: background-color .25s ease, border-color .25s ease, color .25s ease;
}

.aroma-header > .aroma-shell > .aroma-header-cta:hover {
  border-color: var(--ar-accent);
  background: var(--ar-accent);
  color: #17110c;
}

.aroma-header[data-scrolled="true"] {
  height: 82px;
}

.aroma-cafe-hero {
  min-height: 100svh;
}

.aroma-cafe-hero-media img {
  object-position: center 48%;
}

.aroma-cafe-hero-shade {
  background: linear-gradient(90deg, rgba(8, 7, 5, 0.38), rgba(8, 7, 5, 0.08) 68%),
    linear-gradient(0deg, rgba(8, 7, 5, 0.35), transparent 56%);
}

.aroma-cafe-hero-copy {
  min-height: 100svh;
  padding-left: min(18%, 240px);
  padding-top: 155px;
  padding-bottom: 80px;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
}

.aroma-cafe-hero .aroma-kicker {
  margin-bottom: 35px;
  color: #fff;
  font-size: 13px;
  letter-spacing: 0.15em;
}

.aroma-cafe-hero h1 {
  max-width: 780px;
  font-size: clamp(64px, 6.3vw, 96px);
  font-weight: 600;
  line-height: 0.94;
  letter-spacing: -0.05em;
  text-shadow: 0 5px 26px rgba(0, 0, 0, 0.18);
}

.aroma-hero-scroll {
  bottom: 22px;
  gap: 8px;
  font-size: 8px;
}

.aroma-dark-story {
  min-height: 560px;
  padding: 128px 0;
}

.aroma-dark-story-grid {
  grid-template-columns: 1fr 1fr;
  gap: 8vw;
  align-items: center;
}

.aroma-dark-story h2,
.aroma-try-copy h2,
.aroma-specials h2,
.aroma-enjoy h2,
.aroma-final-cta h2 {
  margin-top: 24px;
  font-size: clamp(50px, 4.7vw, 76px);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -0.045em;
}

.aroma-dark-story-copy {
  padding-top: 30px;
}

.aroma-coffee-branch {
  right: 1vw;
  bottom: 10px;
  width: min(32vw, 510px);
  color: rgba(237, 169, 65, 0.15);
}

.aroma-review-stage {
  padding: 115px 0 120px;
}

.aroma-review-stage .aroma-shell {
  position: relative;
}

.aroma-review-slide {
  max-width: 900px;
}

.aroma-review-portrait,
.aroma-review-photo {
  width: 98px;
  height: 98px;
  margin: 0 auto 38px;
  border: 7px solid var(--ar-accent);
  border-radius: 50%;
  object-fit: cover;
}

.aroma-review-slide blockquote {
  margin: 0 auto 26px;
  font-family: "Poppins", "Manrope", sans-serif;
  font-size: clamp(22px, 2.2vw, 35px);
  font-weight: 500;
  line-height: 1.55;
}

.aroma-review-quote {
  height: auto;
  margin-bottom: 16px;
  color: var(--ar-accent);
  font: 44px/1 Georgia, serif;
}

.aroma-review-arrow {
  position: absolute;
  top: 48%;
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border: 1px solid rgba(255,255,255,.22);
  border-radius: 50%;
  background: none;
  color: #fff;
  cursor: pointer;
  transition: border-color .25s ease, color .25s ease, transform .25s ease;
}

.aroma-review-arrow:hover {
  border-color: var(--ar-accent);
  color: var(--ar-accent);
  transform: translateY(-3px);
}

.aroma-review-arrow.is-left {
  left: 0;
}

.aroma-review-arrow.is-right {
  right: 0;
}

.aroma-review-dots {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 46px;
}

.aroma-review-dots button {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 1px solid rgba(255,255,255,.7);
  border-radius: 50%;
  background: transparent;
}

.aroma-review-dots button.is-active {
  border-color: var(--ar-coral);
  background: var(--ar-coral);
}

.aroma-review-controls {
  display: none;
}

.aroma-try-section {
  padding: 145px 0;
  background: #0d0b08;
  color: #f7f0e4;
}

.aroma-try-grid {
  grid-template-columns: 1.15fr .85fr;
  gap: 7vw;
}

.aroma-try-collage {
  min-height: 680px;
}

.aroma-try-collage img:first-child {
  top: 16%;
  left: 0;
  width: 49%;
  height: 72%;
}

.aroma-try-collage img:last-child {
  right: 0;
  bottom: 0;
  width: 52%;
  height: 72%;
  border: 0;
}

.aroma-try-copy > p:not(.aroma-kicker) {
  color: rgba(247,240,228,.62);
}

.aroma-try-copy li {
  border-bottom-color: rgba(255,255,255,.12);
}

.aroma-specials {
  padding: 120px 0 150px;
}

.aroma-menu-lines {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px 70px;
  margin-top: 72px;
}

.aroma-menu-line button {
  display: grid;
  grid-template-columns: auto minmax(30px, 1fr) auto;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: #fff;
  text-align: left;
  cursor: pointer;
}

.aroma-menu-name,
.aroma-menu-line strong {
  font-size: 21px;
  font-weight: 600;
}

.aroma-menu-dots {
  align-self: center;
  height: 1px;
  margin: 0 14px;
  background: repeating-linear-gradient(90deg, rgba(255,255,255,.25) 0 2px, transparent 2px 7px);
}

.aroma-menu-line small {
  grid-column: 1 / -1;
  margin-top: 13px;
  color: rgba(247,240,228,.58);
  font-size: 12px;
  line-height: 1.6;
}

.aroma-specials .aroma-outline-button {
  margin-top: 70px;
}

.aroma-video-story {
  height: 680px;
  min-height: 680px;
}

.aroma-video-story > div:first-child,
.aroma-video-story > div:first-child img {
  width: 100%;
  height: 100%;
}

.aroma-video-story > div:first-child {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.aroma-video-story > div:first-child img {
  object-fit: cover;
}

.aroma-video-player {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: #050403;
  object-fit: cover;
}

.aroma-video-story > button {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
  border: 1px solid #fff;
  border-radius: 50%;
  background: rgba(10,8,6,.16);
  color: #fff;
  font-size: 10px;
  text-transform: uppercase;
  transform: translate(-50%,-50%);
  cursor: pointer;
  backdrop-filter: blur(5px);
}

.aroma-video-story > button span {
  display: block;
  margin-bottom: -28px;
  font-size: 20px;
}

.aroma-enjoy {
  min-height: 720px;
  padding: 130px 0;
}

.aroma-enjoy-grid {
  grid-template-columns: .9fr 1.1fr;
  gap: 10vw;
}

.aroma-enjoy-photo {
  height: 520px;
}

.aroma-enjoy-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.aroma-enjoy-copy {
  position: relative;
  z-index: 2;
  align-self: center;
}

.aroma-enjoy-copy > p:not(.aroma-kicker) {
  max-width: 610px;
  margin: 30px 0;
  color: rgba(247,240,228,.62);
  line-height: 1.8;
}

.aroma-inline-hours {
  display: flex;
  margin-bottom: 38px;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.aroma-cup-drawing {
  position: absolute;
  right: 2vw;
  bottom: 15px;
  width: min(34vw, 520px);
  color: rgba(237,169,65,.14);
}

.aroma-hours,
.aroma-cup-line {
  display: none;
}

.aroma-numbers {
  padding: 80px 0;
  background: linear-gradient(rgba(10,8,6,.84),rgba(10,8,6,.84)),
    radial-gradient(circle at 30% 50%, #2d2117, #0d0b08 62%);
}

.aroma-numbers strong {
  color: rgba(255,255,255,.08);
  font-family: "Poppins", sans-serif;
  font-size: 86px;
  font-weight: 700;
}

.aroma-numbers span {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.aroma-final-cta {
  padding: 125px 24px;
  background: #0d0b08;
  color: #fff;
  text-align: center;
}

.aroma-final-cta > div {
  max-width: 850px;
  margin: auto;
}

.aroma-final-cta .aroma-primary {
  margin-top: 38px;
}

/* Editorial menu and item detail */

.aroma-menu-overview {
  display: grid;
  grid-template-columns: .8fr 1.2fr;
  gap: 6vw;
  margin-bottom: 125px;
  padding-bottom: 70px;
  border-bottom: 1px solid rgba(255,255,255,.15);
}

.aroma-menu-overview h2 {
  margin-top: 20px;
  font-size: clamp(46px, 4.8vw, 72px);
  line-height: 1.02;
  letter-spacing: -.045em;
}

.aroma-menu-overview > p {
  max-width: 650px;
  align-self: end;
  color: rgba(247,240,228,.62);
  font-size: 16px;
  line-height: 1.8;
}

.aroma-menu-category-index {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 28px;
  border-top: 1px solid rgba(255,255,255,.15);
}

.aroma-menu-category-index span {
  position: relative;
  display: flex;
  min-height: 95px;
  padding: 28px 24px;
  align-items: center;
  gap: 15px;
  border-right: 1px solid rgba(255,255,255,.15);
  font-size: 17px;
  font-weight: 600;
}

.aroma-menu-category-index span:first-child {
  border-left: 1px solid rgba(255,255,255,.15);
}

.aroma-menu-category-index b {
  color: var(--ar-accent);
  font-size: 10px;
}

.aroma-menu-category-index small {
  margin-left: auto;
  color: rgba(247,240,228,.42);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
}

.aroma-menu-group {
  margin-bottom: 135px;
}

.aroma-menu-group-head {
  display: grid;
  grid-template-columns: 70px 1fr auto;
  margin-bottom: 48px;
  padding-bottom: 34px;
  align-items: end;
  gap: 24px;
}

.aroma-menu-group-head > span {
  color: var(--ar-accent);
  font-size: 13px;
  font-weight: 700;
}

.aroma-menu-group-head h2 {
  margin-top: 12px;
  font-size: clamp(48px, 4.5vw, 68px);
}

.aroma-menu-group-head > small {
  padding-bottom: 9px;
  color: rgba(247,240,228,.46);
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.aroma-menu-list {
  gap: 54px 30px;
}

.aroma-menu-list.count-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.aroma-menu-list.count-1 {
  grid-template-columns: minmax(0, 600px);
  justify-content: center;
}

.aroma-product-card {
  height: 100%;
}

.aroma-product-photo {
  height: auto;
  aspect-ratio: 1.22 / 1;
}

.aroma-product-copy {
  display: flex;
  min-height: 245px;
  padding: 28px 0 0;
  flex-direction: column;
}

.aroma-product-copy h3 {
  margin: 12px 0;
}

.aroma-product-copy h3 > button {
  display: inline;
  width: auto;
  height: auto;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
}

.aroma-product-copy h3 > button:hover {
  color: var(--ar-accent);
}

.aroma-product-copy > div {
  margin-top: auto;
}

.aroma-product-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.aroma-product-copy .aroma-product-reserve {
  width: auto;
  height: auto;
  padding: 0 4px;
  border: 0;
  border-radius: 0;
  color: rgba(247,240,228,.72);
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.aroma-product-copy .aroma-product-reserve:hover {
  color: var(--ar-accent);
}

.aroma-item {
  padding: 0;
}

.aroma-item-hero {
  padding: 180px 0 145px;
  background: #0d0b08;
  color: #fff;
}

.aroma-item-hero > .aroma-shell > .aroma-text-link {
  margin-bottom: 48px;
  color: rgba(247,240,228,.62);
}

.aroma-item-grid {
  grid-template-columns: 1.08fr .92fr;
  gap: 7vw;
}

.aroma-item-gallery {
  display: block;
}

.aroma-item-gallery img,
.aroma-item-gallery img:first-child {
  width: 100%;
  height: 680px;
  object-fit: cover;
}

.aroma-item-copy {
  top: 118px;
}

.aroma-item-copy h1 {
  margin: 26px 0 38px;
  font-size: clamp(58px, 6vw, 92px);
  line-height: .96;
  letter-spacing: -.055em;
}

.aroma-item-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 34px;
  border-top: 1px solid rgba(255,255,255,.16);
  border-bottom: 1px solid rgba(255,255,255,.16);
}

.aroma-item-meta span {
  padding: 22px 0;
}

.aroma-item-meta span + span {
  padding-left: 24px;
  border-left: 1px solid rgba(255,255,255,.16);
}

.aroma-item-meta small,
.aroma-item-meta strong {
  display: block;
}

.aroma-item-meta small {
  margin-bottom: 8px;
  color: rgba(247,240,228,.45);
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.aroma-item-meta strong {
  color: var(--ar-accent);
  font-size: 19px;
}

.aroma-item-copy > p {
  margin: 0 0 34px;
}

.aroma-item-features {
  margin-top: 38px;
}

.aroma-item-features ul {
  display: grid;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.aroma-item-features li {
  padding: 13px 0;
  border-bottom: 1px solid rgba(255,255,255,.12);
}

.aroma-item-features li::before {
  content: "✓";
  margin-right: 13px;
  color: var(--ar-accent);
}

.aroma-item-copy .aroma-primary {
  margin-top: 38px;
}

.aroma-item-more-media {
  padding: 0 0 125px;
  background: #0d0b08;
}

.aroma-item-more-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.aroma-item-more-grid.count-1 {
  grid-template-columns: minmax(0, 720px);
  justify-content: center;
}

.aroma-item-more-grid > div {
  overflow: hidden;
}

.aroma-item-more-grid img {
  width: 100%;
  height: 480px;
  object-fit: cover;
}

.aroma-item-more-grid.count-3 > div:first-child {
  grid-row: span 2;
}

.aroma-item-more-grid.count-3 > div:first-child img {
  height: 978px;
}

.aroma-related-menu {
  padding: 125px 0 145px;
  background: #f4eee4;
  color: #17110c;
}

.aroma-related-head {
  display: flex;
  margin-bottom: 58px;
  align-items: end;
  justify-content: space-between;
  gap: 32px;
}

.aroma-related-head h2 {
  margin-top: 16px;
  font-size: clamp(48px, 5vw, 74px);
  line-height: 1;
  letter-spacing: -.05em;
}

.aroma-related-head > button {
  display: flex;
  padding: 0 0 9px;
  align-items: center;
  gap: 13px;
  border: 0;
  border-bottom: 1px solid currentColor;
  background: none;
  font-weight: 600;
}

.aroma-related-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 26px;
}

.aroma-related-grid.count-1 {
  grid-template-columns: minmax(0, 460px);
  justify-content: center;
}

.aroma-related-grid.count-2 {
  grid-template-columns: repeat(2, minmax(0, 460px));
  justify-content: center;
}

.aroma-related-card {
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.aroma-related-image {
  position: relative;
  display: block;
  height: 390px;
  overflow: hidden;
}

.aroma-related-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .65s cubic-bezier(.22,1,.36,1);
}

.aroma-related-card:hover .aroma-related-image img {
  transform: scale(1.055);
}

.aroma-related-image i {
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  background: #f4eee4;
  font-size: 10px;
  font-style: normal;
}

.aroma-related-copy {
  position: relative;
  display: grid;
  padding: 24px 48px 0 0;
  grid-template-columns: 1fr auto;
}

.aroma-related-copy small {
  grid-column: 1 / -1;
  color: #a8681d;
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.aroma-related-copy b {
  margin-top: 10px;
  font-size: 24px;
}

.aroma-related-copy em {
  margin-top: 12px;
  font-size: 13px;
  font-style: normal;
}

.aroma-related-copy svg {
  position: absolute;
  right: 0;
  bottom: 0;
}

@media (max-width: 1180px) {
  .aroma-header-inner {
    width: min(calc(100% - 70px), 1400px);
  }

  .aroma-logo {
    flex: 1;
  }

  .aroma-header > .aroma-shell > .aroma-header-cta {
    display: none;
  }

  .aroma-menu-toggle {
    display: flex;
  }
}

@media (max-width: 760px) {
  .aroma-header-inner {
    width: calc(100% - 36px);
  }

  .aroma-wordmark svg,
  .aroma-wordmark img {
    width: 40px;
    height: 40px;
  }

  .aroma-wordmark b {
    max-width: 205px;
    overflow: visible;
    white-space: normal;
    font-size: 11.5px;
    line-height: 1.15;
  }

  .aroma-cafe-hero-copy {
    padding-left: 0;
    padding-top: 120px;
    justify-content: center;
  }

  .aroma-cafe-hero h1 {
    max-width: 345px;
    font-size: clamp(48px, 14vw, 62px);
  }

  .aroma-dark-story-grid,
  .aroma-try-grid,
  .aroma-enjoy-grid {
    grid-template-columns: 1fr;
  }

  .aroma-dark-story h2,
  .aroma-try-copy h2,
  .aroma-specials h2,
  .aroma-enjoy h2,
  .aroma-final-cta h2 {
    font-size: 44px;
  }

  .aroma-review-arrow {
    top: auto;
    bottom: 0;
    width: 44px;
    height: 44px;
  }

  .aroma-review-slide blockquote {
    font-size: 21px;
  }

  .aroma-try-collage {
    min-height: 470px;
  }

  .aroma-menu-lines {
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .aroma-video-story {
    height: 520px;
    min-height: 520px;
  }

  .aroma-enjoy-photo {
    height: 430px;
  }

  .aroma-cup-drawing {
    width: 460px;
    opacity: .55;
  }

  .aroma-numbers .aroma-shell {
    grid-template-columns: 1fr 1fr;
  }

  .aroma-menu-overview {
    grid-template-columns: 1fr;
    margin-bottom: 85px;
    padding-bottom: 45px;
    gap: 24px;
  }

  .aroma-menu-category-index {
    grid-template-columns: 1fr;
  }

  .aroma-menu-category-index span {
    min-height: 74px;
    border-left: 1px solid rgba(255,255,255,.15);
    border-bottom: 1px solid rgba(255,255,255,.15);
  }

  .aroma-menu-group {
    margin-bottom: 90px;
  }

  .aroma-menu-group-head {
    grid-template-columns: 38px 1fr;
  }

  .aroma-menu-group-head > small {
    display: none;
  }

  .aroma-menu-list.count-1,
  .aroma-menu-list.count-2 {
    grid-template-columns: 1fr;
  }

  .aroma-product-copy {
    min-height: 0;
  }

  .aroma-item-hero {
    padding: 120px 0 90px;
  }

  .aroma-item-hero > .aroma-shell > .aroma-text-link {
    margin-bottom: 32px;
  }

  .aroma-item-grid {
    grid-template-columns: 1fr;
    gap: 48px;
  }

  .aroma-item-gallery img,
  .aroma-item-gallery img:first-child {
    height: 390px;
  }

  .aroma-item-more-media {
    padding-bottom: 85px;
  }

  .aroma-item-more-grid,
  .aroma-item-more-grid.count-1 {
    grid-template-columns: 1fr;
  }

  .aroma-item-more-grid img,
  .aroma-item-more-grid.count-3 > div:first-child img {
    height: 360px;
  }

  .aroma-item-copy h1 {
    font-size: 52px;
  }

  .aroma-related-menu {
    padding: 85px 0 95px;
  }

  .aroma-related-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .aroma-related-grid,
  .aroma-related-grid.count-1,
  .aroma-related-grid.count-2 {
    grid-template-columns: 1fr;
  }

  .aroma-related-image {
    height: 360px;
  }
}

/* 2026 premium roastery pass: image-led composition, expressive type and mobile recomposition. */

.aroma {
  --ar-bg: var(--tpl-bg, #f1eadf);
  --ar-paper: #f7f1e7;
  --ar-text: var(--tpl-text, #1a1712);
  --ar-accent: var(--tpl-accent, #d99a39);
  --ar-coral: var(--tpl-primary, #bd5b36);
  font-family: "Manrope", sans-serif;
}

.aroma h1,
.aroma h2,
.aroma h3,
.aroma-menu-name,
.aroma-menu-line strong,
.aroma-review-slide blockquote,
.aroma-numbers strong {
  font-family: "Fraunces", Georgia, serif;
  font-weight: 500;
}

.aroma-header {
  position: absolute;
  inset: 0 0 auto;
  background: transparent;
  color: #fff;
}

.aroma-header[data-scrolled="true"] {
  position: fixed;
  background: rgba(24, 20, 15, .92);
  color: #fff;
  backdrop-filter: blur(18px);
}

.aroma-header-inner {
  width: min(calc(100% - 80px), 1480px);
}

.aroma-wordmark b {
  font-family: "Fraunces", Georgia, serif;
  font-size: 25px;
  font-weight: 500;
  letter-spacing: -.025em;
  text-transform: none;
}

.aroma-header nav button {
  font-size: 10px;
  letter-spacing: .13em;
  text-transform: uppercase;
}

.aroma-cafe-hero-shade {
  background: linear-gradient(90deg, rgba(19,16,12,.88) 0%, rgba(19,16,12,.66) 42%, rgba(19,16,12,.08) 74%),
    linear-gradient(0deg, rgba(19,16,12,.62), transparent 55%);
}

.aroma-cafe-hero-copy {
  width: min(calc(100% - 140px), 1380px);
  padding: 165px 0 94px;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
}

.aroma-cafe-hero .aroma-kicker {
  margin-bottom: 24px;
  color: #f2bd61;
}

.aroma-cafe-hero h1 {
  max-width: 850px;
  font-size: clamp(66px, 7.4vw, 116px);
  font-weight: 500;
  line-height: .88;
  letter-spacing: -.055em;
}

.aroma-hero-intro-copy {
  max-width: 570px;
  margin-top: 30px;
  color: rgba(255,255,255,.7);
  font-size: 14px;
  line-height: 1.75;
}

.aroma-hero-actions {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 38px;
}

.aroma-hero-actions .aroma-primary {
  padding: 18px 26px;
  background: var(--ar-accent);
  color: #1a1712;
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.aroma-hero-secondary {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border: 0;
  border-bottom: 1px solid rgba(255,255,255,.62);
  background: transparent;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: pointer;
}

.aroma-hero-controls {
  position: absolute;
  z-index: 3;
  right: max(40px, calc((100vw - 1380px)/2));
  bottom: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
}

.aroma-hero-controls span {
  margin-right: 12px;
  color: rgba(255,255,255,.62);
  font-size: 9px;
  letter-spacing: .14em;
}

.aroma-hero-controls button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(255,255,255,.35);
  background: rgba(20,17,13,.22);
  color: #fff;
  cursor: pointer;
  transition: background .25s ease, border-color .25s ease;
}

.aroma-hero-controls button:hover {
  border-color: var(--ar-accent);
  background: var(--ar-accent);
  color: #17120d;
}

.aroma-hero-scroll {
  left: 50%;
  right: auto;
  transform: translateX(-50%);
}

.aroma-dark-story {
  min-height: 0;
  padding: 145px 0;
}

.aroma-dark-story-grid {
  grid-template-columns: .78fr .72fr 1.1fr;
  gap: clamp(38px,5vw,86px);
  align-items: center;
}

.aroma-dark-story h2 {
  font-size: clamp(54px,5.4vw,86px);
  font-weight: 500;
  line-height: .96;
}

.aroma-dark-story-copy {
  padding-top: 78px;
}

.aroma-story-image {
  position: relative;
  height: 610px;
  overflow: hidden;
}

.aroma-story-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .9s cubic-bezier(.22,1,.36,1);
}

.aroma-story-image:hover img {
  transform: scale(1.04);
}

.aroma-story-image span {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 15px 18px;
  background: var(--ar-accent);
  color: #17120d;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.aroma-review-stage {
  padding: 100px 0 110px;
  background: #17130f;
}

.aroma-review-slide {
  max-width: 1080px;
}

.aroma-review-slide blockquote {
  font-size: clamp(28px,3vw,46px);
  font-weight: 400;
  line-height: 1.35;
}

.aroma-try-section {
  padding: 155px 0;
  background: var(--ar-paper);
  color: var(--ar-text);
}

.aroma-try-grid {
  grid-template-columns: 1.2fr .8fr;
  align-items: center;
}

.aroma-try-collage {
  min-height: 720px;
}

.aroma-try-collage img:first-child {
  top: 0;
  width: 62%;
  height: 78%;
}

.aroma-try-collage img:last-child {
  width: 48%;
  height: 58%;
  border: 12px solid var(--ar-paper);
}

.aroma-try-copy h2,
.aroma-specials h2,
.aroma-enjoy h2,
.aroma-final-cta h2 {
  font-family: "Fraunces",Georgia,serif;
  font-weight: 500;
  line-height: .98;
}

.aroma-specials {
  background: #1b1712;
}

.aroma-menu-lines {
  gap: 54px 86px;
}

.aroma-menu-line button {
  transition: color .25s ease;
}

.aroma-menu-line button:hover {
  color: var(--ar-accent);
}

.aroma-menu-name,
.aroma-menu-line strong {
  font-size: 24px;
  font-weight: 500;
}

.aroma-video-story {
  height: min(82vh,820px);
  min-height: 640px;
}

.aroma-video-story::after {
  content: "Aromatica / daily ritual";
  position: absolute;
  z-index: 2;
  left: 30px;
  bottom: 28px;
  color: rgba(255,255,255,.72);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
  pointer-events: none;
}

.aroma-enjoy {
  background: #15110d;
}

.aroma-enjoy-grid {
  grid-template-columns: 1.05fr .95fr;
  gap: 9vw;
}

.aroma-enjoy-photo {
  height: 610px;
}

.aroma-enjoy-photo img {
  filter: saturate(.88) contrast(1.04);
}

.aroma-numbers strong {
  font-weight: 500;
}

.aroma-final-cta {
  position: relative;
  overflow: hidden;
  background: var(--ar-accent);
  color: #17120d;
}

.aroma-final-cta::before {
  content: "A";
  position: absolute;
  left: 50%;
  top: 50%;
  color: rgba(255,255,255,.18);
  font: 500 min(42vw,520px)/.7 "Fraunces",Georgia,serif;
  transform: translate(-50%,-50%);
}

.aroma-final-cta>div {
  position: relative;
  z-index: 1;
}

.aroma-final-cta .aroma-primary {
  background: #17120d;
  color: #fff;
}

@media (max-width: 760px) {
  .aroma-shell {
    width: calc(100% - 36px);
  }

  .aroma-header-inner {
    width: calc(100% - 28px);
  }

  .aroma-wordmark b {
    max-width: 160px;
    font-size: 19px;
    line-height: 1;
  }

  .aroma-cafe-hero-copy {
    width: calc(100% - 36px);
    min-height: 100svh;
    padding: 118px 0 108px;
    justify-content: flex-end;
  }

  .aroma-cafe-hero-shade {
    background: linear-gradient(0deg,rgba(19,16,12,.96) 0%,rgba(19,16,12,.58) 57%,rgba(19,16,12,.1) 100%);
  }

  .aroma-cafe-hero-media img {
    object-position: 62% center;
  }

  .aroma-cafe-hero h1 {
    max-width: 100%;
    font-size: clamp(52px,15.5vw,68px);
    line-height: .9;
  }

  .aroma-hero-intro-copy {
    margin-top: 22px;
    font-size: 12px;
    line-height: 1.65;
  }

  .aroma-hero-actions {
    width: 100%;
    gap: 18px;
    margin-top: 28px;
  }

  .aroma-hero-actions .aroma-primary {
    padding: 16px 18px;
  }

  .aroma-hero-secondary {
    font-size: 9px;
  }

  .aroma-hero-scroll {
    display: flex;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
  }

  .aroma-dark-story {
    padding: 82px 0 0;
  }

  .aroma-dark-story-grid {
    grid-template-columns: 1fr;
    gap: 34px;
  }

  .aroma-dark-story-copy {
    padding-top: 0;
  }

  .aroma-story-image {
    width: calc(100% + 36px);
    height: 440px;
    margin-left: -18px;
    margin-top: 18px;
  }

  .aroma-review-stage {
    padding: 76px 0 92px;
  }

  .aroma-review-photo,
  .aroma-review-portrait {
    width: 76px;
    height: 76px;
    margin-bottom: 26px;
  }

  .aroma-review-slide blockquote {
    font-size: 25px;
  }

  .aroma-try-section {
    padding: 88px 0;
  }

  .aroma-try-grid {
    display: flex;
    flex-direction: column;
    gap: 54px;
  }

  .aroma-try-collage {
    width: 100%;
    min-height: 450px;
  }

  .aroma-try-collage img:first-child {
    width: 72%;
    height: 78%;
  }

  .aroma-try-collage img:last-child {
    width: 54%;
    height: 54%;
    border-width: 8px;
  }

  .aroma-menu-lines {
    gap: 38px;
  }

  .aroma-menu-name,
  .aroma-menu-line strong {
    font-size: 19px;
  }

  .aroma-video-story {
    height: 500px;
    min-height: 500px;
  }

  .aroma-video-story>button {
    width: 88px;
    height: 88px;
  }

  .aroma-enjoy {
    padding: 88px 0;
  }

  .aroma-enjoy-grid {
    display: flex;
    flex-direction: column;
    gap: 48px;
  }

  .aroma-enjoy-photo {
    width: calc(100% + 36px);
    height: 430px;
    margin-left: -18px;
  }

  .aroma-enjoy-copy {
    width: 100%;
  }

  .aroma-numbers {
    padding: 48px 0;
  }

  .aroma-numbers strong {
    font-size: 58px;
  }

  .aroma-final-cta {
    padding: 92px 20px;
  }
}

/* Page-level refinement: clearer navigation, editorial About and a less boxed menu. */

.aroma-header {
  height: 104px;
  padding-top: 18px;
}

.aroma-header-inner {
  height: 74px;
  width: min(calc(100% - 48px), 1480px);
  padding: 0 14px 0 20px;
  grid-template-columns: minmax(250px,.8fr) minmax(520px,1.45fr) auto;
  gap: 22px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(18,15,11,.48);
  box-shadow: 0 18px 60px rgba(0,0,0,.12);
  backdrop-filter: blur(14px);
}

.aroma-header[data-scrolled="true"] {
  height: 86px;
  padding-top: 8px;
  background: transparent;
  box-shadow: none;
}

.aroma-header[data-scrolled="true"] .aroma-header-inner {
  background: rgba(18,15,11,.94);
  box-shadow: 0 18px 50px rgba(0,0,0,.22);
}

.aroma-wordmark svg,
.aroma-wordmark img {
  width: 38px;
  height: 38px;
}

.aroma-wordmark b {
  max-width: 235px;
  font-size: 20px;
  line-height: 1;
}

.aroma-header nav {
  justify-content: center;
  gap: clamp(13px,1.35vw,24px);
}

.aroma-header nav button {
  padding: 27px 0 24px;
  font-family: "Fraunces",Georgia,serif;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -.01em;
  text-transform: none;
}

.aroma-header nav button::after {
  bottom: 16px;
  height: 2px;
}

.aroma-header>.aroma-shell>.aroma-header-cta {
  min-width: 158px;
  height: 46px;
  border: 0;
  background: var(--ar-accent);
  color: #18130e;
  font-family: "Manrope",sans-serif;
  font-size: 9px;
}

.aroma-header>.aroma-shell>.aroma-header-cta:hover {
  background: #f1bd64;
  color: #18130e;
}

.aroma-mobile-menu nav button {
  font-family: "Fraunces",Georgia,serif;
  font-weight: 500;
  letter-spacing: -.025em;
}

.aroma-about-story {
  padding: 0;
  background: #0d0b08;
}

.aroma-about-editorial {
  display: grid;
  grid-template-columns: 1.08fr .92fr;
  min-height: 820px;
  align-items: center;
  gap: clamp(60px,8vw,130px);
}

.aroma-about-visual {
  position: relative;
  height: 690px;
  overflow: hidden;
}

.aroma-about-visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .9s cubic-bezier(.22,1,.36,1);
}

.aroma-about-visual:hover img {
  transform: scale(1.035);
}

.aroma-about-visual>span {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 17px 20px;
  background: var(--ar-accent);
  color: #17120d;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .13em;
  text-transform: uppercase;
}

.aroma-about-copy {
  max-width: 580px;
  padding: 90px 0;
}

.aroma-about-copy h2 {
  margin: 24px 0 34px;
  font-family: "Fraunces",Georgia,serif;
  font-size: clamp(54px,5.2vw,82px);
  font-weight: 500;
  line-height: .96;
  letter-spacing: -.045em;
}

.aroma-about-copy>p:not(.aroma-kicker) {
  margin-top: 20px;
  color: rgba(247,240,228,.62);
  font-size: 14px;
  line-height: 1.85;
}

.aroma-about-copy .aroma-facts {
  margin-top: 46px;
  border-color: rgba(255,255,255,.14);
}

.aroma-about-copy .aroma-facts span {
  border-color: rgba(255,255,255,.14);
  font-family: "Manrope",sans-serif;
}

.aroma-about-copy .aroma-facts b {
  font-family: "Fraunces",Georgia,serif;
  font-weight: 500;
}

.aroma-faq> .aroma-shell {
  display: grid;
  grid-template-columns: .72fr 1.28fr;
  column-gap: 8vw;
}

.aroma-faq>.aroma-shell>.aroma-kicker,
.aroma-faq>.aroma-shell>h2 {
  grid-column: 1;
}

.aroma-faq>.aroma-shell>h2 {
  font-family: "Fraunces",Georgia,serif;
  font-weight: 500;
}

.aroma-faq>.aroma-shell>*:last-child {
  grid-column: 2;
  grid-row: 1/span 3;
}

.aroma-menu-overview {
  grid-template-columns: .9fr 1.1fr;
  margin-bottom: 150px;
  padding-bottom: 0;
  border-bottom: 0;
  align-items: end;
}

.aroma-menu-overview-copy h2 {
  max-width: 650px;
  margin-top: 22px;
  font-size: clamp(58px,6vw,96px);
  line-height: .92;
}

.aroma-menu-overview>p {
  max-width: 560px;
  justify-self: end;
  padding-bottom: 8px;
}

.aroma-menu-category-rail {
  grid-column: 1/-1;
  display: flex;
  margin-top: 54px;
  overflow-x: auto;
  border-block: 1px solid rgba(255,255,255,.14);
  scrollbar-width: none;
}

.aroma-menu-category-rail::-webkit-scrollbar {
  display: none;
}

.aroma-menu-category-rail span {
  display: grid;
  min-width: min(330px,34vw);
  padding: 30px 34px 28px 0;
  grid-template-columns: 34px 1fr;
  align-items: baseline;
  border-right: 1px solid rgba(255,255,255,.14);
}

.aroma-menu-category-rail span+span {
  padding-left: 34px;
}

.aroma-menu-category-rail b {
  color: var(--ar-accent);
  font-size: 9px;
}

.aroma-menu-category-rail strong {
  font-family: "Manrope",sans-serif;
  font-size: 17px;
  font-weight: 600;
}

.aroma-menu-category-rail small {
  grid-column: 2;
  margin-top: 8px;
  color: rgba(247,240,228,.4);
  font-size: 9px;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.aroma-menu-group-head h2 {
  font-family: "Fraunces",Georgia,serif;
  font-weight: 500;
}

.aroma-product-copy h3,
.aroma-related-copy b,
.aroma-menu-name,
.aroma-menu-line strong {
  font-family: "Manrope",sans-serif;
  font-weight: 650;
}

/* Menu page: image-led opening and cardless, easy-to-scan menu chapters. */

.aroma-menu-hero {
  position: relative;
  min-height: min(900px,100svh);
  overflow: hidden;
  background: #17120d;
  color: #fff;
}

.aroma-menu-hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.aroma-menu-hero-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,rgba(17,13,9,.92) 0%,rgba(17,13,9,.7) 44%,rgba(17,13,9,.15) 78%),
    linear-gradient(0deg,rgba(17,13,9,.72),transparent 50%);
}

.aroma-menu-hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: min(900px,100svh);
  padding-top: 148px;
  padding-bottom: 78px;
  align-items: center;
}

.aroma-menu-hero-copy {
  width: min(760px,66%);
}

.aroma-menu-hero-copy h1 {
  max-width: 760px;
  margin: 24px 0 28px;
  font-size: clamp(72px,8vw,126px);
  line-height: .86;
  letter-spacing: -.06em;
}

.aroma-menu-hero-copy>p:not(.aroma-kicker) {
  max-width: 570px;
  color: rgba(255,255,255,.72);
  font-size: 15px;
  line-height: 1.75;
}

.aroma-menu-hero-meta {
  display: flex;
  width: min(500px,100%);
  margin-top: 48px;
  border-block: 1px solid rgba(255,255,255,.2);
}

.aroma-menu-hero-meta span {
  display: grid;
  padding: 22px 34px 22px 0;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
}

.aroma-menu-hero-meta span+span {
  margin-left: 34px;
  padding-left: 34px;
  border-left: 1px solid rgba(255,255,255,.2);
}

.aroma-menu-hero-meta b {
  color: var(--ar-accent);
  font-family: "Fraunces",Georgia,serif;
  font-size: 30px;
  font-weight: 500;
}

.aroma-menu-hero-meta small {
  color: rgba(255,255,255,.56);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.aroma-menu-hero-caption {
  position: absolute;
  right: 0;
  bottom: 78px;
  color: rgba(255,255,255,.58);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
}

.aroma-menu-page {
  padding: 145px 0 120px;
  background: #f2ece2;
  color: #19140f;
}

.aroma-menu-overview {
  margin-bottom: 122px;
}

.aroma-menu-overview-copy h2 {
  color: #19140f;
}

.aroma-menu-overview>p {
  color: rgba(25,20,15,.64);
  font-size: 15px;
  line-height: 1.8;
}

.aroma-menu-category-rail {
  border-color: rgba(25,20,15,.18);
}

.aroma-menu-category-rail.count-1,
.aroma-menu-category-rail.count-2,
.aroma-menu-category-rail.count-3 {
  display: grid;
  grid-template-columns: repeat(var(--ar-menu-count,3),minmax(0,1fr));
  overflow: visible;
}

.aroma-menu-category-rail.count-1 {
  --ar-menu-count: 1;
  max-width: 420px;
  margin-inline: auto;
}

.aroma-menu-category-rail.count-2 {
  --ar-menu-count: 2;
  max-width: 760px;
  margin-inline: auto;
}

.aroma-menu-category-rail.count-3 {
  --ar-menu-count: 3;
  width: min(100%,1050px);
  margin-inline: auto;
}

.aroma-menu-category-rail a {
  display: grid;
  min-width: min(330px,34vw);
  padding: 30px 34px 28px 0;
  grid-template-columns: 34px 1fr;
  align-items: baseline;
  border-right: 1px solid rgba(25,20,15,.18);
  color: inherit;
  text-decoration: none;
  transition: color .25s ease,background .25s ease;
}

.aroma-menu-category-rail.count-1 a,
.aroma-menu-category-rail.count-2 a,
.aroma-menu-category-rail.count-3 a {
  min-width: 0;
  padding: 30px 32px;
}

.aroma-menu-category-rail.count-1 a:first-child,
.aroma-menu-category-rail.count-2 a:first-child,
.aroma-menu-category-rail.count-3 a:first-child {
  border-left: 1px solid rgba(25,20,15,.18);
}

.aroma-menu-category-rail a+a {
  padding-left: 34px;
}

.aroma-menu-category-rail a:hover {
  color: #9a571e;
}

.aroma-menu-category-rail b {
  color: #a8681d;
}

.aroma-menu-category-rail strong {
  font-family: "Fraunces",Georgia,serif;
  font-size: 20px;
  font-weight: 500;
}

.aroma-menu-category-rail small {
  color: rgba(25,20,15,.45);
}

.aroma-menu-group {
  display: grid;
  margin-bottom: 128px;
  grid-template-columns: minmax(245px,.62fr) minmax(0,1.38fr);
  align-items: start;
  gap: clamp(54px,8vw,130px);
  scroll-margin-top: 118px;
}

.aroma-menu-group-head {
  position: sticky;
  top: 118px;
  display: block;
  margin: 0;
  padding: 4px 0 0;
}

.aroma-menu-group-head>span {
  display: block;
  margin-bottom: 68px;
  color: #a8681d;
  font-size: 11px;
  letter-spacing: .1em;
}

.aroma-menu-group-head h2 {
  margin: 16px 0 24px;
  color: #19140f;
  font-size: clamp(46px,4.2vw,66px);
  line-height: .94;
  letter-spacing: -.045em;
}

.aroma-menu-group-head>small {
  display: block;
  max-width: 210px;
  padding: 22px 0 0;
  border-top: 1px solid rgba(25,20,15,.18);
  color: rgba(25,20,15,.45);
  line-height: 1.7;
}

.aroma-menu-list,
.aroma-menu-list.count-1,
.aroma-menu-list.count-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

.aroma-product-wrap {
  border-top: 1px solid rgba(25,20,15,.2);
}

.aroma-product-wrap:last-child {
  border-bottom: 1px solid rgba(25,20,15,.2);
}

.aroma-product-card {
  display: grid;
  min-height: 228px;
  padding: 26px 0;
  grid-template-columns: 190px minmax(0,1fr);
  gap: 32px;
}

.aroma-product-photo {
  height: 176px;
  aspect-ratio: auto;
}

.aroma-product-photo img {
  transition: transform .65s cubic-bezier(.22,1,.36,1);
}

.aroma-product-card:hover .aroma-product-photo img {
  transform: scale(1.055);
}

.aroma-product-photo>span {
  top: 10px;
  right: 10px;
  background: #f2ece2;
  color: #19140f;
}

.aroma-product-copy {
  min-height: 176px;
  padding: 2px 0 0;
}

.aroma-product-copy .aroma-kicker {
  color: #a8681d;
}

.aroma-product-copy h3 {
  margin: 10px 0 12px;
  color: #19140f;
  font-family: "Fraunces",Georgia,serif;
  font-size: clamp(28px,2.5vw,38px);
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: -.025em;
}

.aroma-product-copy>p:not(.aroma-kicker) {
  max-width: 570px;
  color: rgba(25,20,15,.58);
  line-height: 1.65;
}

.aroma-product-copy>div {
  padding-top: 20px;
  border: 0;
}

.aroma-product-copy>div>strong {
  color: #19140f;
  font-size: 14px;
}

.aroma-product-copy .aroma-product-reserve {
  color: rgba(25,20,15,.68);
}

.aroma-product-actions>button:last-child {
  border-color: rgba(25,20,15,.25);
  color: #19140f;
}

.aroma-menu-cta {
  display: flex;
  max-width: 920px;
  margin: 10px auto 0;
  padding: 88px 72px;
  align-items: center;
  flex-direction: column;
  gap: 0;
  background: #1a1510;
  color: #fff;
  text-align: center;
}

.aroma-menu-cta .aroma-kicker {
  color: var(--ar-accent);
}

.aroma-menu-cta h2 {
  max-width: 720px;
  margin: 22px auto 20px;
  font-size: clamp(48px,5.4vw,76px);
  line-height: .95;
}

.aroma-menu-cta>p:not(.aroma-kicker) {
  max-width: 520px;
  color: rgba(255,255,255,.62);
  font-size: 14px;
  line-height: 1.75;
}

.aroma-menu-cta .aroma-primary {
  margin-top: 34px;
}

/* One consistent orange action language across pages and forms. */

.aroma .aroma-primary,
.aroma .aroma-header-cta,
.aroma .aroma-hero-secondary,
.aroma .aroma-message-panel .tp-btn-primary,
.aroma .aroma-modal-form .tp-btn-primary {
  display: inline-flex;
  min-height: 48px;
  padding: 0 24px;
  align-items: center;
  justify-content: center;
  gap: 11px;
  border: 0;
  border-radius: 0;
  background: var(--ar-accent);
  color: #18130e;
  font-family: "Manrope",sans-serif;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: .1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background .25s ease,color .25s ease,transform .25s ease;
}

.aroma .aroma-primary:hover,
.aroma .aroma-header-cta:hover,
.aroma .aroma-hero-secondary:hover,
.aroma .aroma-message-panel .tp-btn-primary:hover,
.aroma .aroma-modal-form .tp-btn-primary:hover {
  background: #f1bd64;
  color: #18130e;
  transform: translateY(-2px);
}

.aroma .aroma-primary svg,
.aroma .aroma-header-cta svg,
.aroma .aroma-hero-secondary svg,
.aroma .aroma-message-panel .tp-btn-primary svg,
.aroma .aroma-modal-form .tp-btn-primary svg {
  display: block;
  flex: 0 0 auto;
  align-self: center;
  transform: none;
}

.aroma .aroma-header>.aroma-shell>.aroma-header-cta {
  min-height: 48px;
  padding: 0 24px;
  background: var(--ar-accent);
  color: #18130e;
  font-size: 10px;
}

.aroma-general-application {
  display: flex;
  width: min(880px,100%);
  margin: 96px auto 0;
  padding: 86px 48px;
  align-items: center;
  flex-direction: column;
  border-top: 1px solid rgba(255,255,255,.18);
  border-bottom: 1px solid rgba(255,255,255,.18);
  text-align: center;
}

.aroma-general-application .aroma-kicker {
  color: var(--ar-accent);
}

.aroma-general-application h2 {
  max-width: 700px;
  margin: 20px auto;
  font-size: clamp(48px,5vw,72px);
  line-height: .96;
}

.aroma-general-application>p:not(.aroma-kicker) {
  max-width: 590px;
  color: rgba(247,240,228,.6);
  font-size: 14px;
  line-height: 1.8;
}

.aroma-general-application .aroma-primary {
  margin-top: 32px;
}

.aroma-back-to-top {
  position: fixed;
  z-index: 38;
  right: 24px;
  bottom: 24px;
  display: grid;
  width: 50px;
  height: 50px;
  padding: 0;
  place-items: center;
  border: 0;
  background: var(--ar-accent);
  color: #18130e;
  box-shadow: 0 14px 34px rgba(0,0,0,.2);
  cursor: pointer;
  transition: background .25s ease,transform .25s ease;
}

.aroma-back-to-top svg {
  display: block;
  transform: rotate(-90deg);
}

.aroma-back-to-top:hover {
  background: #f1bd64;
  transform: translateY(-3px);
}

.aroma-testimonials-page {
  padding: 130px 0 145px;
  background: #f2ece2;
  color: #19140f;
}

.aroma-reviews-page-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 32px;
  padding-bottom: 44px;
  border-bottom: 1px solid rgba(25,20,15,.18);
}

.aroma-reviews-page-head h2 {
  margin-top: 18px;
  font-size: clamp(52px,6vw,86px);
  line-height: .94;
}

.aroma-reviews-page-head>span {
  padding-bottom: 8px;
  color: rgba(25,20,15,.48);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .14em;
}

.aroma-reviews-carousel {
  display: grid;
  min-height: 470px;
  grid-template-columns: 64px minmax(0,1fr) 64px;
  align-items: center;
  gap: clamp(20px,4vw,58px);
}

.aroma-reviews-carousel-stage {
  min-width: 0;
  overflow: hidden;
}

.aroma-reviews-carousel-stage article {
  max-width: 980px;
  margin: auto;
  padding: 76px 0 62px;
  text-align: center;
}

.aroma-reviews-quote {
  display: block;
  height: 58px;
  color: #a8681d;
  font: 88px/1 "Fraunces",Georgia,serif;
}

.aroma-reviews-carousel blockquote {
  margin: 22px auto 36px;
  font-family: "Fraunces",Georgia,serif;
  font-size: clamp(34px,4.2vw,62px);
  font-weight: 400;
  line-height: 1.18;
  letter-spacing: -.035em;
}

.aroma-reviews-carousel footer b,
.aroma-reviews-carousel footer small {
  display: block;
}

.aroma-reviews-carousel footer b {
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.aroma-reviews-carousel footer small {
  margin-top: 7px;
  color: rgba(25,20,15,.48);
  font-size: 11px;
}

.aroma-reviews-carousel-arrow {
  display: grid;
  width: 58px;
  height: 58px;
  padding: 0;
  place-items: center;
  border: 1px solid rgba(25,20,15,.25);
  border-radius: 50%;
  background: transparent;
  color: #19140f;
  cursor: pointer;
  transition: background .25s ease,color .25s ease,border-color .25s ease;
}

.aroma-reviews-carousel-arrow.is-previous svg {
  transform: rotate(180deg);
}

.aroma-reviews-carousel-arrow:hover:not(:disabled) {
  border-color: #19140f;
  background: #19140f;
  color: #fff;
}

.aroma-reviews-carousel-arrow:disabled {
  opacity: .25;
  cursor: default;
}

.aroma-reviews-page-footer {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-top: 30px;
  border-top: 1px solid rgba(25,20,15,.18);
}

.aroma-reviews-dots {
  display: flex;
  align-items: center;
  gap: 10px;
}

.aroma-reviews-dots button {
  width: 28px;
  height: 2px;
  padding: 0;
  border: 0;
  background: rgba(25,20,15,.22);
  cursor: pointer;
  transition: width .25s ease,background .25s ease;
}

.aroma-reviews-dots button.is-active {
  width: 52px;
  background: #a8681d;
}

@media (max-width:1180px) {
  .aroma-header {
    padding-top: 12px;
  }

  .aroma-header-inner {
    width: calc(100% - 28px);
    grid-template-columns: 1fr auto;
  }
}

@media (max-width:760px) {
  .aroma-header {
    height: 82px;
    padding-top: 10px;
  }

  .aroma-header-inner {
    height: 62px;
    padding: 0 10px 0 14px;
  }

  .aroma-header[data-scrolled="true"] {
    height: 74px;
    padding-top: 6px;
  }

  .aroma-wordmark svg,
  .aroma-wordmark img {
    width: 34px;
    height: 34px;
  }

  .aroma-wordmark b {
    max-width: 205px;
    font-size: 17px;
    white-space: normal;
  }

  .aroma-menu-toggle {
    width: 42px;
    height: 42px;
  }

  .aroma-about-editorial {
    width: 100%;
    min-height: 0;
    grid-template-columns: 1fr;
    gap: 0;
  }

  .aroma-about-visual {
    height: 520px;
  }

  .aroma-about-copy {
    width: calc(100% - 36px);
    margin: auto;
    padding: 76px 0 90px;
  }

  .aroma-about-copy h2 {
    font-size: 48px;
  }

  .aroma-about-copy .aroma-facts {
    grid-template-columns: repeat(3,1fr);
  }

  .aroma-about-copy .aroma-facts span {
    padding: 22px 8px;
  }

  .aroma-about-copy .aroma-facts b {
    font-size: 26px;
  }

  .aroma-faq>.aroma-shell {
    display: block;
  }

  .aroma-menu-overview {
    grid-template-columns: 1fr;
    margin-bottom: 92px;
    gap: 24px;
  }

  .aroma-menu-overview-copy h2 {
    font-size: 54px;
  }

  .aroma-menu-overview>p {
    justify-self: start;
  }

  .aroma-menu-category-rail {
    width: calc(100% + 18px);
    margin-top: 32px;
  }

  .aroma-menu-category-rail.count-1,
  .aroma-menu-category-rail.count-2,
  .aroma-menu-category-rail.count-3 {
    display: flex;
    width: calc(100% + 18px);
    margin-inline: 0;
    overflow-x: auto;
  }

  .aroma-menu-category-rail a {
    min-width: 245px;
    padding: 24px 24px 22px 0;
  }

  .aroma-menu-category-rail.count-1 a,
  .aroma-menu-category-rail.count-2 a,
  .aroma-menu-category-rail.count-3 a {
    min-width: min(245px,75vw);
    padding: 24px;
  }

  .aroma-menu-category-rail a+a {
    padding-left: 24px;
  }

  .aroma-menu-hero {
    min-height: 760px;
  }

  .aroma-menu-hero-inner {
    min-height: 760px;
    padding-top: 120px;
    padding-bottom: 58px;
    align-items: flex-end;
  }

  .aroma-menu-hero-copy {
    width: 100%;
  }

  .aroma-menu-hero-copy h1 {
    margin: 18px 0 22px;
    font-size: clamp(56px,16vw,76px);
  }

  .aroma-menu-hero-copy>p:not(.aroma-kicker) {
    font-size: 13px;
  }

  .aroma-menu-hero-shade {
    background: linear-gradient(0deg,rgba(17,13,9,.96) 0%,rgba(17,13,9,.64) 60%,rgba(17,13,9,.12) 100%);
  }

  .aroma-menu-hero-meta {
    margin-top: 32px;
  }

  .aroma-menu-hero-meta span {
    padding: 18px 16px 18px 0;
    gap: 8px;
  }

  .aroma-menu-hero-meta span+span {
    margin-left: 16px;
    padding-left: 16px;
  }

  .aroma-menu-hero-meta b {
    font-size: 24px;
  }

  .aroma-menu-hero-caption {
    display: none;
  }

  .aroma-menu-page {
    padding: 86px 0 82px;
  }

  .aroma-menu-group {
    display: block;
    margin-bottom: 88px;
  }

  .aroma-menu-group-head {
    position: static;
    margin-bottom: 34px;
    padding: 0;
  }

  .aroma-menu-group-head>span {
    margin-bottom: 30px;
  }

  .aroma-menu-group-head h2 {
    font-size: 48px;
  }

  .aroma-menu-group-head>small {
    max-width: none;
  }

  .aroma-product-card {
    min-height: 0;
    padding: 22px 0;
    grid-template-columns: 108px minmax(0,1fr);
    gap: 18px;
  }

  .aroma-product-photo {
    height: 118px;
  }

  .aroma-product-copy {
    min-height: 118px;
    padding: 0;
  }

  .aroma-product-copy h3 {
    margin: 7px 0 9px;
    font-size: 24px;
  }

  .aroma-product-copy>p:not(.aroma-kicker) {
    display: -webkit-box;
    overflow: hidden;
    font-size: 11px;
    line-height: 1.55;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .aroma-product-copy>div {
    padding-top: 12px;
  }

  .aroma-product-copy .aroma-product-reserve {
    display: none;
  }

  .aroma-menu-cta {
    padding: 68px 22px;
  }

  .aroma-menu-cta h2 {
    font-size: 48px;
  }

  .aroma-menu-cta .aroma-primary,
  .aroma-general-application .aroma-primary {
    width: 100%;
  }

  .aroma-general-application {
    margin-top: 68px;
    padding: 68px 0;
  }

  .aroma-general-application h2 {
    font-size: 46px;
  }

  .aroma-back-to-top {
    right: 14px;
    bottom: 14px;
    width: 46px;
    height: 46px;
  }

  .aroma-testimonials-page {
    padding: 82px 0 90px;
  }

  .aroma-reviews-page-head {
    align-items: flex-start;
    flex-direction: column;
    padding-bottom: 30px;
  }

  .aroma-reviews-page-head h2 {
    font-size: 50px;
  }

  .aroma-reviews-carousel {
    min-height: 440px;
    grid-template-columns: 44px minmax(0,1fr) 44px;
    gap: 8px;
  }

  .aroma-reviews-carousel-stage article {
    padding: 58px 0 48px;
  }

  .aroma-reviews-carousel blockquote {
    font-size: 29px;
    line-height: 1.28;
  }

  .aroma-reviews-carousel-arrow {
    width: 42px;
    height: 42px;
  }

  .aroma-reviews-page-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .aroma-reviews-dots {
    justify-content: center;
  }

  .aroma-reviews-page-footer .aroma-primary {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aroma *,
  .aroma *::before,
  .aroma *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;
