export const TASTYC_CSS = String.raw`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Josefin+Sans:wght@400;500;600&display=swap');

.tc {
  --tc-ink: #071719;
  --tc-deep: #0b2224;
  --tc-paper: var(--t-bg,#f2ede5);
  --tc-orange: var(--t-accent,#dc8438);
  --tc-cream: #eee3d2;
  --tc-line: color-mix(in srgb,var(--t-text,#191614) 16%,transparent);
  --tc-shadow: 0 28px 70px rgba(5,20,21,.18);
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--tc-paper);
  color: var(--t-text,#191614);
  font-family: 'Josefin Sans',ui-sans-serif,sans-serif;
  -webkit-font-smoothing: antialiased;
}

.tc *,
.tc *::before,
.tc *::after {
  box-sizing: border-box;
}

.tc button,
.tc input,
.tc textarea,
.tc select {
  font: inherit;
}

.tc button {
  cursor: pointer;
}

.tc img {
  display: block;
}

.tc-serif {
  font-family: 'Cormorant Garamond',Georgia,serif;
  font-weight: 500;
}

.tc-wrap {
  width: min(1220px,calc(100% - 48px));
  margin-inline: auto;
}

.tc-section {
  padding-block: clamp(82px,9vw,140px);
}

.tc-muted {
  color: color-mix(in srgb,var(--t-text,#191614) 62%,transparent);
}

.tc-kicker {
  color: var(--t-accent-fg,#a9531c);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .22em;
  text-transform: uppercase;
}

.tc-kicker-rule {
  display: flex;
  align-items: center;
  gap: 14px;
}

.tc-kicker-rule::before {
  content: '';
  width: 30px;
  height: 3px;
  background: var(--tc-orange);
}

.tc-h1 {
  font-family: 'Cormorant Garamond',Georgia,serif;
  font-size: clamp(62px,8.3vw,126px);
  font-weight: 400;
  line-height: .88;
  letter-spacing: -.035em;
  text-transform: uppercase;
}

.tc-h2 {
  font-family: 'Cormorant Garamond',Georgia,serif;
  font-size: clamp(48px,5.7vw,78px);
  font-weight: 400;
  line-height: .98;
  letter-spacing: -.03em;
}

.tc-h3 {
  font-family: 'Cormorant Garamond',Georgia,serif;
  font-size: clamp(34px,4vw,54px);
  font-weight: 500;
  line-height: 1.02;
  letter-spacing: -.02em;
}

.tc-btn {
  display: inline-flex;
  min-height: 60px;
  align-items: center;
  justify-content: center;
  gap: 11px;
  border: 1px solid currentColor;
  padding: 0 30px;
  color: inherit;
  font-family: 'Cormorant Garamond',Georgia,serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  transition: transform .25s ease,background .25s ease,color .25s ease,border-color .25s ease;
}

.tc-btn:hover {
  transform: translateY(-3px);
}

.tc-btn-primary {
  border-color: var(--tc-orange);
  background: var(--tc-orange);
  color: #fff;
}

.tc-btn-light {
  border-color: rgba(255,255,255,.8);
  color: #fff;
}

.tc-btn-light:hover {
  background: #fff;
  color: var(--tc-ink);
}

.tc-btn-dark {
  border-color: var(--tc-ink);
  background: var(--tc-ink);
  color: #fff;
}

.tc-btn-text {
  border-color: transparent;
  color: #fff;
}

.tc-btn-ghost {
  border-color: var(--tc-line);
  background: transparent;
}

.tc-link {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: inherit;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.tc-link::after {
  content: '';
  display: block;
  width: 28px;
  height: 1px;
  background: currentColor;
  transition: width .25s ease;
}

.tc-link:hover::after {
  width: 46px;
}

.tc-placeholder {
  background: radial-gradient(circle at 35% 25%,#b98155,transparent 32%),linear-gradient(135deg,#102e30,#07181a 65%);
  color: rgba(255,255,255,.7);
}

.tc-image-cover {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.tc-loader {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: var(--tc-ink);
  color: var(--tc-cream);
}

.tc-loader-brand {
  position: absolute;
  top: calc(50% + 72px);
  font-family: 'Cormorant Garamond',Georgia,serif;
  font-size: 20px;
  letter-spacing: .05em;
}

.tc-loader-rings {
  position: relative;
  width: 86px;
  height: 86px;
}

.tc-loader-rings span {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-top-color: var(--tc-orange);
  border-bottom-color: rgba(238,227,210,.55);
  border-radius: 50%;
  animation: tc-spin 1.7s linear infinite;
}

.tc-loader-rings span:last-child {
  inset: 21px;
  border-top-color: var(--tc-cream);
  border-bottom-color: var(--tc-orange);
  animation-direction: reverse;
  animation-duration: .85s;
}

@keyframes tc-spin {
  to {
    transform: rotate(360deg);
  }
}

.tc-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  color: #fff;
  transition: background .35s ease,box-shadow .35s ease;
}

.tc-header[data-scrolled='true'] {
  background: rgba(6,23,25,.97);
  box-shadow: 0 12px 36px rgba(0,0,0,.2);
}

.tc-header .tc-wrap {
  width: min(1470px,calc(100% - 60px));
}

.tc-header-inner {
  display: flex;
  min-height: 80px;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
}

.tc-logo {
  position: relative;
  min-width: 150px;
  max-width: 210px;
  font-family: 'Cormorant Garamond',Georgia,serif;
  font-size: 38px;
  font-weight: 600;
  line-height: .82;
  letter-spacing: -.04em;
}

.tc-logo::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -8px;
  width: 128px;
  height: 2px;
  background: linear-gradient(90deg,var(--tc-orange) 0 23%,transparent 23% 33%,var(--tc-orange) 33% 100%);
}

.tc-logo span {
  font-family: 'Josefin Sans',sans-serif;
  font-size: 7px;
  letter-spacing: .42em;
  text-align: center;
}

.tc-nav {
  display: flex;
  align-items: center;
  gap: 32px;
}

.tc-nav-link {
  position: relative;
  padding: 29px 0 24px;
  color: rgba(255,255,255,.86);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .01em;
  text-transform: none;
  transition: color .2s ease;
}

.tc-nav-link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 100%;
  bottom: 0;
  height: 3px;
  background: var(--tc-orange);
  transition: right .3s ease;
}

.tc-nav-link:hover,
.tc-nav-link[aria-current='page'] {
  color: #fff;
}

.tc-nav-link:hover::after,
.tc-nav-link[aria-current='page']::after {
  right: 0;
}

.tc-nav-cta {
  min-height: 60px;
  padding-inline: 34px;
  background: var(--tc-orange);
  color: #fff;
  font-family: 'Cormorant Garamond',serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.tc-dropdown {
  position: absolute;
  top: calc(100% - 1px);
  left: 50%;
  min-width: 245px;
  transform: translateX(-50%);
  border-top: 3px solid var(--tc-orange);
  background: var(--tc-deep);
  padding: 10px;
  box-shadow: var(--tc-shadow);
}

.tc-dropdown button {
  display: block;
  width: 100%;
  padding: 12px 14px;
  text-align: left;
  color: rgba(255,255,255,.75);
  font-size: 12px;
}

.tc-dropdown button:hover {
  color: #fff;
  background: rgba(255,255,255,.06);
}

.tc-mobile-panel {
  position: fixed;
  inset: 0;
  z-index: 45;
  overflow-y: auto;
  background: var(--tc-ink);
  color: #fff;
  padding: 110px 24px 36px;
}

.tc-hero {
  position: relative;
  min-height: 100svh;
  display: grid;
  align-items: center;
  overflow: hidden;
  background: var(--tc-ink);
  color: #fff;
}

.tc-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,rgba(3,16,18,.58),rgba(3,16,18,.27) 53%,rgba(3,16,18,.5)),linear-gradient(0deg,rgba(2,12,14,.38),transparent 55%);
}

.tc-hero-media {
  position: absolute;
  inset: 0;
}

.tc-hero-media img {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.tc-hero-content {
  position: relative;
  z-index: 2;
  width: min(1220px,calc(100% - 48px));
  margin: 0 auto;
  padding: 130px 0 76px;
  text-align: center;
}

.tc-hero-rule {
  display: block;
  height: 3px;
  margin: 0 auto 18px;
  background: var(--tc-orange);
}

.tc-hero-title {
  max-width: 1180px;
  margin-inline: auto;
  text-shadow: 0 8px 35px rgba(0,0,0,.3);
}

.tc-hero-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 38px;
}

.tc-hero-pager {
  position: absolute;
  z-index: 3;
  bottom: 38px;
  left: max(28px,calc((100vw - 1420px)/2));
  display: flex;
  gap: 16px;
}

.tc-hero-dot {
  height: 10px;
  width: 10px;
  border: 2px solid rgba(255,255,255,.85);
  border-radius: 50%;
}

.tc-hero-dot[aria-pressed='true'] {
  border-color: var(--tc-orange);
  box-shadow: inset 0 0 0 2px var(--tc-ink);
  background: var(--tc-orange);
}

.tc-hero-arrows {
  position: absolute;
  z-index: 3;
  right: max(28px,calc((100vw - 1420px)/2));
  bottom: 28px;
  display: flex;
  gap: 8px;
}

.tc-hero-arrows button {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  color: #fff;
  transition: color .2s,transform .2s;
}

.tc-hero-arrows button:hover {
  color: var(--tc-orange);
  transform: translateX(2px);
}

.tc-scroll-cue {
  position: absolute;
  z-index: 3;
  bottom: 20px;
  left: 50%;
  width: 24px;
  height: 39px;
  transform: translateX(-50%);
  border: 1px solid rgba(255,255,255,.55);
  border-radius: 20px;
}

.tc-scroll-cue span {
  position: absolute;
  top: 8px;
  left: 10px;
  width: 2px;
  height: 7px;
  border-radius: 2px;
  background: #fff;
  animation: tc-scroll 1.7s infinite;
}

@keyframes tc-scroll {
  0% {
    opacity: 0;
    transform: translateY(-2px);
  }

  30% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateY(14px);
  }
}

.tc-editorial {
  background: var(--tc-ink);
  color: var(--tc-cream);
  padding: 74px 0 105px;
}

.tc-story {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: min(1220px,calc(100% - 48px));
  margin: 0 auto;
}

.tc-story[data-reverse='true'] .tc-story-copy {
  order: 2;
}

.tc-story-copy {
  display: flex;
  min-height: 600px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 72px clamp(42px,7vw,112px) 72px clamp(28px,5vw,72px);
}

.tc-story-title {
  max-width: 500px;
  margin-top: 24px;
  font-family: 'Cormorant Garamond',serif;
  font-size: clamp(48px,4.6vw,72px);
  font-weight: 400;
  line-height: .98;
}

.tc-story-body {
  max-width: 500px;
  margin: 30px 0;
  color: rgba(238,227,210,.58);
  font-family: Arial,sans-serif;
  font-size: 14px;
  line-height: 1.9;
}

.tc-story-media {
  position: relative;
  min-height: 600px;
  overflow: hidden;
  background: var(--tc-deep);
}

.tc-story-media img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  transition: transform 1.1s cubic-bezier(.22,1,.36,1);
}

.tc-story-media:hover img {
  transform: scale(1.045);
}

.tc-story-image-index {
  position: absolute;
  right: 22px;
  bottom: 18px;
  color: #fff;
  font-family: 'Cormorant Garamond',serif;
  font-size: 16px;
  letter-spacing: .12em;
}

.tc-feature-band {
  background: var(--tc-ink);
  color: var(--tc-cream);
  padding: 90px 0 110px;
}

.tc-feature-grid {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 60px;
}

.tc-feature {
  text-align: center;
}

.tc-feature-icon {
  display: grid;
  width: 78px;
  height: 78px;
  margin: 0 auto 28px;
  place-items: center;
  color: rgba(238,227,210,.7);
}

.tc-feature-icon svg {
  width: 72px;
  height: 72px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tc-feature h3 {
  font-family: 'Cormorant Garamond',serif;
  font-size: 31px;
  font-weight: 500;
}

.tc-feature p {
  max-width: 330px;
  margin: 20px auto 0;
  color: rgba(238,227,210,.52);
  font-family: Arial,sans-serif;
  font-size: 14px;
  line-height: 1.8;
}

.tc-hours {
  position: relative;
  min-height: 750px;
  background-color: var(--tc-deep);
  background-position: center;
  background-size: cover;
  color: #fff;
}

.tc-hours-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,rgba(5,22,24,.78),rgba(5,22,24,.22) 54%,rgba(5,22,24,.45));
}

.tc-hours-stage {
  position: relative;
  z-index: 1;
  display: grid;
  min-height: 750px;
  grid-template-columns: 1.25fr .75fr;
  align-items: center;
  gap: 60px;
}

.tc-hours-copy {
  max-width: 610px;
}

.tc-hours-title {
  margin-top: 24px;
  font-family: 'Cormorant Garamond',serif;
  font-size: clamp(58px,7vw,100px);
  font-weight: 400;
  line-height: .86;
  text-transform: uppercase;
}

.tc-hours-copy>p:last-of-type {
  max-width: 540px;
  margin-top: 30px;
  color: rgba(255,255,255,.66);
  font-family: Arial,sans-serif;
  font-size: 14px;
  line-height: 1.9;
}

.tc-hours-card {
  background: rgba(6,23,25,.94);
  padding: 58px 54px;
  box-shadow: var(--tc-shadow);
}

.tc-hours-block {
  padding: 22px 0;
  border-bottom: 1px solid rgba(255,255,255,.13);
}

.tc-hours-block span {
  display: block;
  margin-bottom: 12px;
  color: rgba(255,255,255,.55);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.tc-hours-block strong {
  font-family: 'Cormorant Garamond',serif;
  font-size: 31px;
  font-weight: 400;
}

.tc-hours-card>a {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
  color: var(--tc-orange);
  font-size: 13px;
}

.tc-testimonials {
  background: var(--tc-paper);
}

.tc-testimonial-layout {
  display: grid;
  grid-template-columns: .75fr 1.25fr;
  gap: 100px;
  align-items: start;
}

.tc-testimonial-intro h2 {
  margin-top: 24px;
  font-family: 'Cormorant Garamond',serif;
  font-size: clamp(48px,5vw,72px);
  font-weight: 400;
  line-height: .96;
}

.tc-testimonial-intro>p:last-of-type {
  margin-top: 25px;
  color: rgba(25,22,20,.58);
  font-family: Arial,sans-serif;
  font-size: 14px;
  line-height: 1.8;
}

.tc-quote-stage {
  min-width: 0;
}

.tc-quote-stage article {
  position: relative;
  min-height: 380px;
  padding: 58px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(41,31,24,.07);
}

.tc-quote-mark {
  position: absolute;
  right: 32px;
  top: 10px;
  color: var(--tc-orange);
  font-family: 'Cormorant Garamond',serif;
  font-size: 120px;
  line-height: 1;
}

.tc-quote-stage h3 {
  margin-top: 24px;
  font-family: 'Cormorant Garamond',serif;
  font-size: 30px;
}

.tc-quote-stage blockquote {
  margin-top: 18px;
  color: rgba(25,22,20,.6);
  font-family: Arial,sans-serif;
  font-size: 14px;
  line-height: 1.9;
}

.tc-reviewer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 30px;
  padding-top: 24px;
  border-top: 1px solid var(--tc-line);
}

.tc-reviewer span {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.tc-reviewer small {
  color: rgba(25,22,20,.46);
  font-size: 10px;
}

.tc-slider-controls {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 30px;
}

.tc-slider-controls>div {
  display: flex;
  gap: 10px;
}

.tc-slider-controls>div button {
  width: 9px;
  height: 9px;
  border: 1px solid var(--tc-ink);
  border-radius: 50%;
}

.tc-slider-controls>div button[aria-pressed='true'] {
  border-color: var(--tc-orange);
  background: var(--tc-orange);
}

.tc-slider-controls>span {
  margin-right: auto;
  color: rgba(25,22,20,.45);
  font-size: 9px;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.tc-slider-controls>button {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
}

.tc-stats {
  background: var(--tc-ink);
  color: var(--tc-cream);
  padding: 58px 0;
}

.tc-stats .tc-wrap {
  display: grid;
  grid-template-columns: repeat(4,1fr);
}

.tc-stats .tc-wrap>div {
  padding: 18px 36px;
  text-align: center;
  border-right: 1px solid rgba(255,255,255,.12);
}

.tc-stats .tc-wrap>div:last-child {
  border: 0;
}

.tc-stats strong {
  display: block;
  color: var(--tc-orange);
  font-family: 'Cormorant Garamond',serif;
  font-size: 56px;
  font-weight: 400;
}

.tc-stats span {
  display: block;
  margin-top: 5px;
  color: rgba(255,255,255,.68);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: .17em;
  text-transform: uppercase;
}

.tc-brand-story {
  overflow: hidden;
  background: #e8dfd2;
  padding: clamp(90px,10vw,150px) 0;
}

.tc-brand-layout {
  display: grid;
  grid-template-columns: 1.05fr .95fr;
  align-items: center;
  gap: clamp(50px,8vw,120px);
}

.tc-brand-visual {
  position: relative;
  height: 650px;
  box-shadow: var(--tc-shadow);
}

.tc-brand-visual::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: -24px 50% 30px -80px;
  background: var(--tc-orange);
}

.tc-brand-visual img {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.tc-brand-visual>span {
  position: absolute;
  right: -30px;
  bottom: 34px;
  max-width: 260px;
  padding: 18px 24px;
  background: var(--tc-ink);
  color: #fff;
  font-family: 'Cormorant Garamond',serif;
  font-size: 25px;
}

.tc-brand-copy h2 {
  margin-top: 25px;
  font-family: 'Cormorant Garamond',serif;
  font-size: clamp(48px,5.4vw,78px);
  font-weight: 400;
  line-height: .96;
}

.tc-brand-copy>p:last-of-type {
  margin-top: 28px;
  color: rgba(25,22,20,.6);
  font-family: Arial,sans-serif;
  font-size: 14px;
  line-height: 1.9;
}

.tc-menu-grid {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 4px 54px;
}

.tc-menu-row {
  display: flex;
  min-height: 112px;
  align-items: center;
  gap: 18px;
  padding: 18px 0;
  border-bottom: 1px solid var(--tc-line);
}

.tc-menu-thumb {
  width: 76px;
  height: 76px;
  flex: 0 0 76px;
  overflow: hidden;
  border-radius: 50%;
  background: var(--tc-ink);
}

.tc-menu-thumb img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  transition: transform .4s ease;
}

.tc-menu-row:hover .tc-menu-thumb img {
  transform: scale(1.08);
}

.tc-menu-name {
  font-family: 'Cormorant Garamond',serif;
  font-size: 22px;
  font-weight: 600;
  white-space: nowrap;
}

.tc-dots {
  min-width: 20px;
  flex: 1;
  border-bottom: 1px dotted color-mix(in srgb,var(--t-text,#1a1715) 35%,transparent);
}

.tc-price {
  color: var(--t-accent-fg,#a9531c);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.tc-tag {
  display: inline-flex;
  border: 1px solid var(--tc-line);
  padding: 3px 8px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.tc-tag-accent {
  border-color: color-mix(in srgb,var(--tc-orange) 50%,transparent);
  color: var(--t-accent-fg,#a9531c);
}

.tc-order-link {
  margin-left: auto;
  color: var(--t-accent-fg,#a9531c);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.tc-testimonial {
  border-top: 1px solid var(--tc-line);
  padding: 34px 0;
}

.tc-gallery-grid {
  display: grid;
  grid-template-columns: repeat(12,minmax(0,1fr));
  gap: 12px;
}

.tc-gallery-item {
  min-height: 250px;
  overflow: hidden;
  background: var(--tc-ink);
}

.tc-gallery-item:nth-child(6n+1),
.tc-gallery-item:nth-child(6n+4) {
  grid-column: span 7;
  min-height: 430px;
}

.tc-gallery-item:nth-child(6n+2),
.tc-gallery-item:nth-child(6n+3),
.tc-gallery-item:nth-child(6n+5),
.tc-gallery-item:nth-child(6n+6) {
  grid-column: span 5;
}

.tc-gallery-item img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  transition: transform .6s ease,opacity .4s ease;
}

.tc-gallery-item:hover img {
  transform: scale(1.04);
  opacity: .82;
}

.tc-page-hero {
  position: relative;
  min-height: min(62vh,650px);
  display: grid;
  align-items: end;
  overflow: hidden;
  background: var(--tc-ink);
  color: #fff;
  padding: 150px 0 72px;
}

.tc-page-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg,rgba(2,17,18,.92),rgba(2,17,18,.2) 74%);
}

.tc-page-hero>.tc-wrap {
  position: relative;
  z-index: 2;
}

.tc-page-hero-image {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
  object-fit: cover;
  opacity: .6;
}

.tc-page-main {
  padding-block: clamp(72px,8vw,120px);
}

.tc-service-tile {
  position: relative;
  min-height: 480px;
  overflow: hidden;
  background: var(--tc-ink);
}

.tc-product-grid {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 22px;
}

.tc-product {
  border: 1px solid var(--tc-line);
  background: color-mix(in srgb,var(--tc-paper) 88%,#fff);
}

.tc-product-image {
  aspect-ratio: 4/3;
  overflow: hidden;
  background: var(--tc-ink);
}

.tc-product-image img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  transition: transform .6s ease;
}

.tc-product:hover .tc-product-image img {
  transform: scale(1.04);
}

.tc-footer {
  background: var(--tc-ink);
  color: #fff;
}

.tc-footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1.2fr;
  gap: 50px;
  padding-block: 88px;
}

.tc-footer a,
.tc-footer button {
  color: rgba(255,255,255,.7);
  transition: color .2s ease;
}

.tc-footer a:hover,
.tc-footer button:hover {
  color: #fff;
}

.tc-footer-title {
  margin-bottom: 20px;
  color: #fff;
  font-family: 'Cormorant Garamond',serif;
  font-size: 24px;
  font-weight: 500;
  text-transform: none;
}

.tc-reservation-shell {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 24px;
}

.tc-reservation-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(2,12,14,.82);
  backdrop-filter: blur(8px);
}

.tc-reservation-modal {
  position: relative;
  display: grid;
  width: min(940px,100%);
  max-height: 92vh;
  grid-template-columns: .82fr 1.18fr;
  overflow: auto;
  background: var(--tc-paper);
  box-shadow: 0 40px 100px rgba(0,0,0,.5);
}

.tc-reservation-intro {
  position: relative;
  min-height: 620px;
  padding: 60px 45px;
  background-position: center;
  background-size: cover;
  color: #fff;
}

.tc-reservation-intro::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg,rgba(4,19,21,.92),rgba(4,19,21,.35));
}

.tc-reservation-intro>* {
  position: relative;
  z-index: 1;
}

.tc-reservation-intro h2 {
  margin-top: 20px;
  font-family: 'Cormorant Garamond',serif;
  font-size: 56px;
  font-weight: 400;
  line-height: .92;
}

.tc-reservation-intro p:last-child {
  margin-top: 24px;
  color: rgba(255,255,255,.65);
  font-family: Arial,sans-serif;
  font-size: 13px;
  line-height: 1.8;
}

.tc-reservation-form {
  padding: 58px 50px;
}

.tc-reservation-form>h3 {
  margin-bottom: 28px;
  font-family: 'Cormorant Garamond',serif;
  font-size: 40px;
  font-weight: 500;
}

.tc-reservation-close {
  position: absolute;
  z-index: 3;
  right: 14px;
  top: 14px;
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  background: var(--tc-ink);
  color: #fff;
}

.tc .tp-wrap {
  width: min(1180px,calc(100% - 40px));
  margin-inline: auto;
}

.tc .tp-section {
  padding-block: clamp(64px,8vw,110px);
}

.tc .tp-h2 {
  font-family: 'Cormorant Garamond',serif;
  font-size: clamp(42px,5vw,68px);
  line-height: 1;
}

.tc .tp-h3 {
  font-family: 'Cormorant Garamond',serif;
  font-size: clamp(30px,3vw,46px);
  line-height: 1.05;
}

.tc .tp-muted {
  color: color-mix(in srgb,var(--t-text) 62%,transparent);
}

.tc .tp-eyebrow,
.tc .tp-label {
  display: block;
  margin-bottom: 8px;
  color: var(--t-accent-fg,var(--tc-orange));
  font-size: 9px;
  font-weight: 600;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.tc .tp-input {
  width: 100%;
  min-height: 51px;
  border: 1px solid var(--tc-line);
  border-radius: 0;
  background: transparent;
  padding: 12px 14px;
  color: inherit;
  outline: none;
}

.tc .tp-input:focus {
  border-color: var(--tc-orange);
  box-shadow: 0 0 0 2px color-mix(in srgb,var(--tc-orange) 15%,transparent);
}

.tc .tp-btn {
  display: inline-flex;
  min-height: 51px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid currentColor;
  padding: 0 22px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.tc .tp-btn-primary {
  border-color: var(--tc-orange);
  background: var(--tc-orange);
  color: #fff;
}

.tc .tp-btn-ghost {
  border-color: var(--tc-line);
}

.tc .tp-btn-dark {
  background: var(--tc-ink);
  color: #fff;
}

.tc .tp-tab {
  border: 1px solid var(--tc-line);
  padding: 9px 14px;
  color: inherit;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.tc .tp-tab[aria-pressed='true'] {
  border-color: var(--tc-orange);
  background: var(--tc-orange);
  color: #fff;
}

.tc .tp-soft {
  border: 1px solid var(--tc-line);
  background: color-mix(in srgb,var(--tc-paper) 82%,#fff);
}

.tc .tp-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border: 1px solid var(--tc-line);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
}

@media (max-width:1100px) {
  .tc-nav {
    display: none;
  }

  .tc-product-grid {
    grid-template-columns: repeat(2,minmax(0,1fr));
  }

  .tc-footer-grid {
    grid-template-columns: repeat(2,minmax(0,1fr));
  }

  .tc-story-copy {
    padding: 55px 38px;
  }

  .tc-header .tc-wrap {
    width: min(100% - 34px,1220px);
  }
}

@media (max-width:767px) {
  .tc-wrap,
  .tc .tp-wrap,
  .tc-hero-content {
    width: min(100% - 28px,1180px);
  }

  .tc-header-inner {
    min-height: 72px;
  }

  .tc-logo {
    font-size: 29px;
    min-width: 0;
  }

  .tc-logo::after {
    width: 105px;
  }

  .tc-hero-content {
    padding-top: 105px;
  }

  .tc-h1 {
    font-size: clamp(46px,13.5vw,58px);
    line-height: .92;
    letter-spacing: -.045em;
  }

  .tc-hero-title {
    max-width: 100%;
  }

  .tc-hero-pager {
    left: 20px;
    bottom: 28px;
  }

  .tc-hero-arrows {
    right: 14px;
    bottom: 16px;
  }

  .tc-scroll-cue {
    display: none;
  }

  .tc-story {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .tc-story[data-reverse='true'] .tc-story-copy {
    order: 0;
  }

  .tc-story-copy {
    min-height: auto;
    padding: 74px 26px;
  }

  .tc-story-title {
    font-size: 50px;
  }

  .tc-story-media {
    min-height: 460px;
  }

  .tc-feature-grid {
    grid-template-columns: 1fr;
    gap: 64px;
  }

  .tc-feature-band {
    padding: 80px 0;
  }

  .tc-hours-stage {
    min-height: auto;
    grid-template-columns: 1fr;
    padding: 90px 0;
  }

  .tc-hours {
    min-height: 0;
  }

  .tc-hours-title {
    font-size: 62px;
  }

  .tc-hours-card {
    padding: 42px 28px;
  }

  .tc-testimonial-layout {
    grid-template-columns: 1fr;
    gap: 55px;
  }

  .tc-quote-stage article {
    min-height: 420px;
    padding: 38px 28px;
  }

  .tc-stats .tc-wrap {
    grid-template-columns: repeat(2,1fr);
  }

  .tc-stats .tc-wrap>div {
    border-bottom: 1px solid rgba(255,255,255,.12);
    padding: 25px 12px;
  }

  .tc-brand-layout {
    grid-template-columns: 1fr;
  }

  .tc-brand-visual {
    height: 500px;
  }

  .tc-brand-visual>span {
    right: 12px;
  }

  .tc-menu-grid,
  .tc-product-grid {
    grid-template-columns: 1fr;
  }

  .tc-menu-name {
    white-space: normal;
  }

  .tc-gallery-item,
  .tc-gallery-item:nth-child(n) {
    grid-column: span 12;
    min-height: 310px;
  }

  .tc-footer-grid {
    grid-template-columns: 1fr;
    gap: 38px;
    padding-block: 58px;
  }

  .tc-page-hero {
    min-height: 500px;
    padding-bottom: 50px;
  }

  .tc-reservation-shell {
    padding: 0;
  }

  .tc-reservation-modal {
    max-height: 100vh;
    grid-template-columns: 1fr;
  }

  .tc-reservation-intro {
    min-height: 280px;
    padding: 90px 28px 35px;
  }

  .tc-reservation-intro h2 {
    font-size: 44px;
  }

  .tc-reservation-form {
    padding: 36px 24px 50px;
  }
}

/* Tastyc-specific refinements: stable hero layers and centered variable-size listings. */

.tc-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.tc-logo::after {
  display: none;
}

.tc-logo span {
  width: 100%;
  text-align: center;
}

.tc-hero {
  overflow-anchor: none;
}

.tc-hero-media {
  overflow: hidden;
}

.tc-hero-media img {
  position: absolute;
  inset: 0;
  will-change: opacity,transform;
}

.tc-service-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
}

.tc-service-grid>.tc-service-tile {
  width: calc(50% - 10px);
  max-width: 600px;
}

.tc-menu-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 54px;
}

.tc-menu-grid>div {
  width: calc(50% - 27px);
}

.tc-product-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 22px;
}

.tc-product-grid>div {
  width: calc((100% - 44px)/3);
}

@media (max-width:1100px) {
  .tc-product-grid>div {
    width: calc(50% - 11px);
  }
}

@media (max-width:767px) {
  .tc-service-grid>.tc-service-tile,
  .tc-menu-grid>div,
  .tc-product-grid>div {
    width: 100%;
  }
}

@media (prefers-reduced-motion:reduce) {
  .tc * {
    scroll-behavior: auto!important;
    animation-duration: .01ms!important;
    animation-iteration-count: 1!important;
    transition-duration: .01ms!important;
  }
}
`;
