export const COBOX_CSS = String.raw`
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');

.cbx {
  --t-bg: #ffffff;
  --t-text: #102b32;
  --t-accent: #dff39e;
  --t-accent-text: #102b32;
  --t-soft: #f7f7f7;
  --cbx-dark: #102b32;
  --cbx-dark-2: #0b2126;
  --cbx-mist: #f7f7f7;
  --cbx-line: rgba(16, 43, 50, 0.12);
  --cbx-body: #586b70;
  --cbx-radius: 24px;
  background: var(--t-bg);
  color: var(--cbx-body);
  font-family: 'Sora', 'Inter', system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  overflow: hidden;
  min-height: 100%;
  -webkit-font-smoothing: antialiased;
}

.cbx *,
.cbx *::before,
.cbx *::after {
  box-sizing: border-box;
}

.cbx img {
  display: block;
  max-width: 100%;
}

.cbx button {
  font: inherit;
  cursor: pointer;
  border: 0;
}

.cbx :where(button) {
  color: inherit;
  background: none;
}

.cbx input,
.cbx select,
.cbx textarea {
  font: inherit;
}

.cbx h1,
.cbx h2,
.cbx h3,
.cbx h4,
.cbx p,
.cbx ul,
.cbx figure,
.cbx blockquote {
  margin: 0;
}

.cbx ul {
  padding: 0;
  list-style: none;
}

.cbx a {
  color: inherit;
  text-decoration: none;
}

.cbx h1,
.cbx h2,
.cbx h3,
.cbx h4 {
  color: var(--t-text);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.03em;
  font-family: 'Sora', 'Inter', system-ui, sans-serif;
}

.cbx h1 {
  font-size: clamp(40px, 5.2vw, 70px);
}

.cbx h2 {
  font-size: clamp(30px, 3.4vw, 46px);
}

.cbx h3 {
  font-size: clamp(20px, 1.6vw, 24px);
}

.cbx-shell {
  width: min(1500px, calc(100% - 30px));
  margin-inline: auto;
  padding-inline: 15px;
}

.cbx-main {
  min-height: 60vh;
}

.cbx-section {
  padding: 100px 0;
  position: relative;
}

.cbx-band {
  background: var(--cbx-mist);
  border-radius: var(--cbx-radius);
  margin: 0 20px;
}

.cbx-dark {
  background: var(--cbx-dark);
  color: rgba(255, 255, 255, 0.72);
}

.cbx-dark h1,
.cbx-dark h2,
.cbx-dark h3,
.cbx-dark h4 {
  color: #fff;
}

.cbx-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--cbx-line);
  border-radius: 100px;
  padding: 7px 16px 7px 30px;
  margin-bottom: 18px;
  font-size: 13px;
  line-height: 1.2;
  color: var(--t-text);
  position: relative;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(8px);
}

.cbx-eyebrow::before {
  content: '';
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--t-accent);
}

.cbx-eyebrow.is-light {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.1);
}

.cbx-head {
  margin-bottom: 40px;
}

.cbx-head.center {
  text-align: center;
  max-width: 940px;
  margin-inline: auto;
}

.cbx-head p {
  margin-top: 18px;
  font-size: 16px;
  max-width: 640px;
}

.cbx-head.center p {
  margin-inline: auto;
}

.cbx-head-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 40px;
  flex-wrap: wrap;
}

.cbx-head-row p {
  max-width: 420px;
}

.cbx-btn {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
  border-radius: 100px;
  padding: 9px 9px 9px 22px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
  transition: transform 0.35s ease, background 0.35s ease, color 0.35s ease;
}

.cbx-btn i {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--t-text);
  color: #fff;
  transition: transform 0.35s ease, background 0.35s ease;
  font-style: normal;
}

.cbx-btn:hover i {
  transform: rotate(45deg);
}

.cbx-btn:hover {
  transform: translateY(-2px);
}

.cbx-btn.is-ghost {
  background: transparent;
  border: 1px solid var(--cbx-line);
  color: var(--t-text);
  padding: 14px 26px;
}

.cbx-btn.is-ghost i {
  display: none;
}

.cbx-btn.is-ghost:hover {
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
  border-color: transparent;
}

.cbx-btn.is-light {
  background: #fff;
  color: var(--cbx-dark);
}

.cbx-btn.is-light i {
  background: var(--cbx-dark);
  color: #fff;
}

.cbx-text-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--t-text);
  border-bottom: 1px solid currentColor;
  padding-bottom: 3px;
  transition: gap 0.3s ease, color 0.3s ease;
}

.cbx-text-link:hover {
  gap: 14px;
  color: var(--t-accent-text, var(--t-text));
}

.cbx-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cbx-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 200px;
  background: linear-gradient(135deg, var(--cbx-dark), #295c63);
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-align: center;
  padding: 20px;
}

.cbx-stars {
  display: inline-flex;
  gap: 3px;
  color: #f3b23c;
  font-size: 15px;
  line-height: 1;
}

.cbx-empty {
  padding: 48px;
  border: 1px dashed var(--cbx-line);
  border-radius: 20px;
  text-align: center;
  font-size: 15px;
}

/* ── header ───────────────────────────────────────────────── */

.cbx-headwrap {
  position: fixed;
  inset: 20px 0 auto;
  z-index: 60;
  padding-inline: 28px;
  pointer-events: none;
}

.cbx-headbar {
  pointer-events: auto;
  width: 100%;
  min-height: 90px;
  margin-inline: auto;
  display: flex;
  align-items: center;
  gap: 24px;
  background: var(--cbx-mist);
  border: 1px solid transparent;
  border-radius: 20px;
  padding: 12px 20px;
  transition: box-shadow 0.3s ease, padding 0.3s ease;
}

.cbx-headwrap.is-scrolled .cbx-headbar {
  box-shadow: 0 18px 45px rgba(16, 43, 50, 0.14);
  padding-block: 8px;
}

.cbx-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.cbx-brand-tile {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
  font-weight: 700;
  font-size: 19px;
  overflow: hidden;
}

.cbx-brand-tile img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cbx-brand-name {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--t-text);
  white-space: nowrap;
}

.cbx-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.cbx-nav button {
  padding: 9px 13px;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  color: var(--cbx-body);
  transition: background 0.25s ease, color 0.25s ease;
  white-space: nowrap;
}

.cbx-nav button:hover,
.cbx-nav button[aria-current='page'] {
  background: var(--cbx-mist);
  color: var(--t-text);
}

.cbx-headend {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.cbx-burger {
  display: none;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--cbx-mist);
  color: var(--t-text);
  place-items: center;
}

/* ── hero ─────────────────────────────────────────────────── */

.cbx-hero {
  position: relative;
  margin: 130px 20px 0;
  border-radius: 20px 20px 0 20px;
  overflow: hidden;
  min-height: calc(100vh - 130px);
  padding: 80px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;
  background: var(--cbx-dark);
  isolation: isolate;
}

.cbx-hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -2;
}

.cbx-hero-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(16, 43, 50, 0) 31.75%,
    rgba(16, 43, 50, 0.8) 68.76%
  );
  z-index: -1;
}

.cbx-hero-grid {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
}

.cbx-hero-copy {
  position: relative;
  width: 57%;
  z-index: 1;
}

.cbx-hero-copy h1 {
  color: #fff;
  font-size: clamp(38px, 4.375vw, 70px);
  font-weight: 500;
  line-height: 1.14;
  letter-spacing: -0.02em;
  max-width: 100%;
  cursor: none;
}

.cbx-hero-copy > p {
  margin: 20px 0 0;
  max-width: 56ch;
  color: #fff;
  font-size: 16px;
  line-height: 1.6;
}

.cbx-hero-actions {
  margin-top: 34px;
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
}

.cbx-people {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
}

.cbx-people-stack {
  display: inline-flex;
  align-items: center;
}

.cbx-people-stack img,
.cbx-people-stack span {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid #fff;
  object-fit: cover;
  margin-left: -14px;
  background: var(--cbx-mist);
  display: grid;
  place-items: center;
  color: var(--cbx-dark);
  font-size: 12px;
  font-weight: 600;
}

.cbx-people-stack > *:first-child {
  margin-left: 0;
}

.cbx-people b {
  color: #fff;
  font-weight: 600;
}

.cbx-hero-rating {
  position: absolute;
  top: 80px;
  right: 80px;
  max-width: 305px;
  padding: 30px;
  border-radius: 20px;
  background: rgba(16, 43, 50, 0.1);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  color: #fff;
  z-index: 1;
}

.cbx-hero-quote {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.6;
  margin: 0 0 25px;
}

.cbx-hero-rating .cbx-people-stack {
  margin-bottom: 25px;
}

.cbx-hero-rating-label {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}

.cbx-hero-stars {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
}

.cbx-hero-stars > span:last-child {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
}

.cbx-hero-clients {
  position: relative;
  width: calc(43% + 80px);
  margin: 0 -80px -80px 0;
  padding: 40px 3.125vw;
  background: #fff;
  border-radius: 20px 0 0 0;
  text-align: center;
  z-index: 1;
  color: var(--cbx-body);
}

.cbx-hero-clients::before,
.cbx-hero-clients::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: #fff;
}

.cbx-hero-clients::before {
  top: -20px;
  left: -20px;
  -webkit-mask-image: radial-gradient(
    circle at 100% 100%,
    transparent 19.5px,
    #000 20px
  );
  mask-image: radial-gradient(circle at 100% 100%, transparent 19.5px, #000 20px);
}

.cbx-hero-clients::after {
  bottom: 0;
  left: -20px;
  -webkit-mask-image: radial-gradient(
    circle at 100% 0,
    transparent 19.5px,
    #000 20px
  );
  mask-image: radial-gradient(circle at 100% 0, transparent 19.5px, #000 20px);
}

.cbx-hero-clients p {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 40px;
  color: var(--t-text);
}

.cbx-hero-clients p span {
  font-weight: 600;
}

.cbx-marquee {
  overflow: hidden;
  position: relative;
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}

.cbx-marquee-track {
  display: flex;
  gap: 30px;
  width: max-content;
  animation: cbx-marquee 26s linear infinite;
}

.cbx-hero-clients .cbx-marquee-track span {
  color: var(--t-text);
}

.cbx-marquee-track span {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8b9a9d;
  white-space: nowrap;
}

@keyframes cbx-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

/* ── custom cursor ───────────────────────────────────────── */

.cbx-cursor {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 150;
  contain: layout style size;
  pointer-events: none;
  will-change: transform;
  opacity: 0;
  transition: opacity 0.3s, color 0.4s;
}

.cbx-cursor::before {
  content: '';
  position: absolute;
  top: -24px;
  left: -24px;
  display: block;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fff;
  transform: scale(0);
  transition: transform 0.3s ease-in-out, opacity 0.1s;
}

.cbx-cursor-text {
  position: absolute;
  top: -18px;
  left: -18px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: scale(0) rotate(10deg);
  opacity: 0;
  color: #fff;
  font-size: 16px;
  line-height: 20px;
  text-align: center;
  transition: opacity 0.4s, transform 0.3s;
}

.cbx-cursor.is-visible {
  opacity: 1;
}

.cbx-cursor.is-visible::before {
  transform: scale(0.2);
}

.cbx-cursor.is-visible.is-active::before {
  transform: scale(0.23);
  transition-duration: 0.2s;
}

.cbx-cursor.is-pointer::before {
  transform: scale(0);
}

.cbx-cursor.is-opaque {
  mix-blend-mode: exclusion;
}

.cbx-cursor.is-opaque::before {
  transform: scale(1.32);
}

.cbx-cursor.is-opaque.is-active::before {
  transform: scale(1.2);
}

.cbx-cursor.is-lg::before {
  transform: scale(2);
}

.cbx-cursor.is-hidden::before {
  transform: scale(0);
}

.cbx-cursor.is-text::before {
  background: #000;
  opacity: 0.8;
  mix-blend-mode: normal;
  transform: scale(1.7);
}

.cbx-cursor.is-text .cbx-cursor-text {
  opacity: 1;
  transform: scale(1);
}

.cbx-cursor.is-text.is-active::before {
  transform: scale(1.6);
  transition-duration: 0.2s;
}

/* ── about ────────────────────────────────────────────────── */

.cbx-about-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  align-items: stretch;
}

.cbx-about-card {
  border-radius: var(--cbx-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 440px;
}

.cbx-about-card.is-light {
  background: var(--cbx-mist);
  padding: 34px;
  justify-content: space-between;
  gap: 30px;
}

.cbx-about-card.is-light h3 {
  font-size: clamp(20px, 1.6vw, 24px);
  line-height: 1.4;
  font-weight: 500;
  letter-spacing: -0.02em;
}

.cbx-about-card.is-plain {
  gap: 18px;
}

.cbx-about-card.is-accent {
  background: var(--t-accent);
  padding: 34px;
  position: relative;
}

.cbx-about-card.is-accent h2 {
  color: var(--t-accent-text, #102b32);
  font-size: clamp(38px, 4vw, 56px);
  line-height: 1;
}

.cbx-about-card.is-accent h3,
.cbx-about-card.is-accent p,
.cbx-about-card.is-accent li {
  color: var(--t-accent-text, #102b32);
}

.cbx-about-card.is-accent p {
  margin-top: 12px;
  font-size: 14px;
  opacity: 0.82;
}

.cbx-about-media {
  border-radius: 20px;
  overflow: hidden;
  height: 240px;
}

.cbx-about-float {
  border: 1px solid var(--cbx-line);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  gap: 14px;
  align-items: center;
  background: var(--t-bg);
}

.cbx-about-float p {
  font-size: 13px;
  line-height: 1.5;
}

.cbx-about-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
  flex: 0 0 auto;
}

.cbx-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.cbx-chips span {
  border: 1px solid currentColor;
  border-radius: 100px;
  padding: 5px 13px;
  font-size: 12px;
  opacity: 0.8;
}

.cbx-about-accent-img {
  margin-top: auto;
  border-radius: 16px;
  overflow: hidden;
  height: 150px;
}

.cbx-inline-photo {
  display: inline-block;
  vertical-align: middle;
  width: 84px;
  height: 34px;
  border-radius: 100px;
  overflow: hidden;
  margin: 0 6px;
  transform: translateY(-4px);
}

.cbx-inline-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cbx-inline-avatars {
  display: inline-flex;
  vertical-align: middle;
  margin: 0 6px;
  transform: translateY(-2px);
}

.cbx-inline-avatars img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  margin-left: -9px;
}

.cbx-inline-avatars img:first-child {
  margin-left: 0;
}

.cbx-stat-band {
  margin-top: 28px;
  border-top: 1px solid var(--cbx-line);
  padding-top: 34px;
  display: grid;
  grid-template-columns: 1fr 2.2fr;
  gap: 30px;
  align-items: center;
}

.cbx-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.cbx-stat h4 {
  font-size: clamp(26px, 2.6vw, 36px);
  letter-spacing: -0.03em;
}

.cbx-stat span {
  font-size: 13px;
  color: var(--cbx-body);
}

/* ── services ─────────────────────────────────────────────── */

.cbx-service-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
}

.cbx-service-grid > * {
  flex: 0 0 calc((100% - 48px) / 3);
  min-width: 0;
  display: flex;
}

.cbx-service-grid > * > * {
  width: 100%;
}

.cbx-service-card {
  position: relative;
  background: var(--t-bg);
  border-radius: var(--cbx-radius);
  padding: 34px;
  overflow: hidden;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  text-align: left;
  isolation: isolate;
  transition: transform 0.35s ease;
}

.cbx-service-card::before {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 0;
  background: var(--t-accent);
  border-radius: var(--cbx-radius) var(--cbx-radius) 0 0;
  transition: height 0.4s ease, border-radius 0.4s ease;
  z-index: -1;
}

.cbx-service-card:hover {
  transform: translateY(-5px);
}

.cbx-service-card:hover::before,
.cbx-service-card.is-active::before {
  height: 100%;
  border-radius: 0;
}

.cbx-service-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--cbx-mist);
  color: var(--cbx-dark);
}

.cbx-service-card.is-active .cbx-service-icon {
  background: rgba(16, 43, 50, 0.08);
}

.cbx-service-card h3 {
  font-size: 21px;
  line-height: 1.3;
}

.cbx-service-card p {
  font-size: 14px;
  line-height: 1.6;
}

.cbx-service-index {
  position: absolute;
  top: 30px;
  right: 30px;
  font-size: 12px;
  letter-spacing: 0.14em;
  opacity: 0.5;
}

.cbx-sec-foot {
  margin-top: 34px;
  text-align: center;
  font-size: 14px;
}

.cbx-sec-foot span {
  display: inline-block;
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
  border-radius: 100px;
  padding: 3px 12px;
  margin-right: 8px;
  font-size: 12px;
  font-weight: 600;
}

.cbx-sec-foot a {
  border-bottom: 1px solid currentColor;
}

/* ── what we do ───────────────────────────────────────────── */

.cbx-do-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 60px;
  align-items: center;
}

.cbx-do-collage {
  position: relative;
  padding-bottom: 40px;
}

.cbx-do-main {
  border-radius: var(--cbx-radius);
  overflow: hidden;
  height: 470px;
}

.cbx-do-sub {
  position: absolute;
  right: 18px;
  bottom: 0;
  width: 44%;
  border-radius: 18px;
  overflow: hidden;
  height: 190px;
  border: 6px solid var(--t-bg);
}

.cbx-do-client {
  position: absolute;
  left: 20px;
  top: 20px;
  background: #fff;
  border-radius: 16px;
  padding: 16px 18px;
  max-width: 240px;
  box-shadow: 0 14px 34px rgba(16, 43, 50, 0.12);
}

.cbx-do-client h3 {
  font-size: 24px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cbx-do-client p {
  font-size: 12px;
  line-height: 1.5;
}

.cbx-check-list {
  display: grid;
  gap: 12px;
  margin: 26px 0 30px;
}

.cbx-check-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: var(--t-text);
}

.cbx-check-list i {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
  flex: 0 0 auto;
  font-style: normal;
}

/* ── video band ───────────────────────────────────────────── */

.cbx-video {
  position: relative;
  margin: 0 20px;
  border-radius: var(--cbx-radius);
  overflow: hidden;
  padding: 110px 0 50px;
  background: var(--cbx-dark);
  text-align: center;
  isolation: isolate;
}

.cbx-video-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -2;
  opacity: 0.45;
}

.cbx-video::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(16, 43, 50, 0.55), rgba(10, 30, 35, 0.92));
  z-index: -1;
}

.cbx-video h2 {
  color: #fff;
  max-width: 22ch;
  margin: 0 auto;
}

.cbx-play {
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  margin: 36px auto 0;
  border-radius: 50%;
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
  transition: transform 0.35s ease;
}

.cbx-play:hover {
  transform: scale(1.08);
}

.cbx-video-list {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 60px;
}

.cbx-video-list span {
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 100px;
  padding: 8px 18px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

/* ── projects ─────────────────────────────────────────────── */

.cbx-project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
}

.cbx-project {
  text-align: left;
}

.cbx-project-media {
  position: relative;
  border-radius: var(--cbx-radius);
  overflow: hidden;
  height: 380px;
}

.cbx-project-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.7s ease;
}

.cbx-project:hover .cbx-project-media img {
  transform: scale(1.05);
}

.cbx-project-arrow {
  position: absolute;
  right: 18px;
  bottom: 18px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
  display: grid;
  place-items: center;
  transition: transform 0.3s ease;
}

.cbx-project:hover .cbx-project-arrow {
  transform: rotate(45deg);
}

.cbx-project-tag {
  display: inline-block;
  margin: 20px 0 8px;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--cbx-body);
}

.cbx-project h3 {
  font-size: clamp(19px, 1.7vw, 23px);
  line-height: 1.35;
}

/* ── process ──────────────────────────────────────────────── */

.cbx-process {
  margin: 0 20px;
  border-radius: var(--cbx-radius);
  padding: 100px 0;
}

.cbx-process-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 70px;
  align-items: start;
}

.cbx-process-copy p {
  margin-top: 18px;
  color: rgba(255, 255, 255, 0.7);
}

.cbx-process-people {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 28px;
}

.cbx-process-people .cbx-people-stack img,
.cbx-process-people .cbx-people-stack span {
  border-color: var(--cbx-dark);
}

.cbx-process-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  padding-top: 30px;
}

.cbx-process-stats h4 {
  color: #fff;
  font-size: 30px;
}

.cbx-process-stats span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.62);
}

.cbx-step {
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  padding: 26px 0;
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 20px;
  transition: border-color 0.3s ease;
}

.cbx-step:hover {
  border-color: var(--t-accent);
}

.cbx-step-number {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.24);
  color: #fff;
  font-size: 16px;
  transition: background 0.3s ease, color 0.3s ease;
}

.cbx-step:hover .cbx-step-number {
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
  border-color: transparent;
}

.cbx-step h3 {
  color: #fff;
  font-size: 21px;
  margin-bottom: 8px;
}

.cbx-step p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.66);
  line-height: 1.65;
}

/* ── pricing ──────────────────────────────────────────────── */

.cbx-plan-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 22px;
}

.cbx-plan {
  border: 1px solid var(--cbx-line);
  border-radius: var(--cbx-radius);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--t-bg);
  transition: transform 0.35s ease, box-shadow 0.35s ease;
}

.cbx-plan:hover {
  transform: translateY(-5px);
  box-shadow: 0 22px 50px rgba(16, 43, 50, 0.1);
}

.cbx-plan.is-active {
  background: var(--t-accent);
  border-color: transparent;
}

.cbx-plan-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cbx-plan-head i {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--cbx-mist);
  color: var(--cbx-dark);
  font-style: normal;
}

.cbx-plan.is-active .cbx-plan-head i {
  background: rgba(16, 43, 50, 0.1);
}

.cbx-plan h3 {
  font-size: 19px;
}

.cbx-plan ul {
  display: grid;
  gap: 10px;
  font-size: 13.5px;
  color: var(--cbx-body);
  border-top: 1px solid var(--cbx-line);
  padding-top: 20px;
}

.cbx-plan.is-active ul,
.cbx-plan.is-active .cbx-plan-note,
.cbx-plan.is-active .cbx-plan-price sub {
  color: rgba(16, 43, 50, 0.78);
}

.cbx-plan ul li {
  display: flex;
  gap: 9px;
  align-items: flex-start;
}

.cbx-plan ul li::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  margin-top: 8px;
  flex: 0 0 auto;
  opacity: 0.55;
}

.cbx-plan-foot {
  margin-top: auto;
  display: grid;
  gap: 14px;
}

.cbx-plan-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: var(--t-text);
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.03em;
}

.cbx-plan-price sub {
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
  color: var(--cbx-body);
  bottom: 0;
}

.cbx-plan-note {
  font-size: 12px;
  color: var(--cbx-body);
}

.cbx-plan .cbx-btn {
  justify-content: space-between;
  width: 100%;
}

.cbx-plan.is-active .cbx-btn {
  background: var(--cbx-dark);
  color: #fff;
}

.cbx-plan.is-active .cbx-btn i {
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
}

/* ── why choose ───────────────────────────────────────────── */

.cbx-why-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 60px;
  align-items: center;
}

.cbx-why-list {
  display: grid;
  gap: 16px;
  margin-top: 30px;
}

.cbx-why-item {
  display: grid;
  grid-template-columns: 44px 84px 1fr;
  gap: 16px;
  align-items: center;
  border: 1px solid var(--cbx-line);
  border-radius: 16px;
  padding: 18px;
  background: var(--t-bg);
}

.cbx-why-item i {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--cbx-mist);
  color: var(--cbx-dark);
  font-style: normal;
}

.cbx-why-item h4 {
  font-size: 24px;
  letter-spacing: -0.03em;
}

.cbx-why-item h3 {
  font-size: 15px;
}

.cbx-why-item p {
  font-size: 12.5px;
  color: var(--cbx-body);
}

.cbx-why-media {
  position: relative;
  border-radius: var(--cbx-radius);
  overflow: hidden;
  height: 480px;
}

.cbx-why-float {
  position: absolute;
  left: 20px;
  bottom: 20px;
  right: 20px;
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.cbx-why-float p {
  font-size: 13px;
  color: var(--cbx-body);
}

.cbx-why-float h3 {
  font-size: 24px;
}

/* ── core values ──────────────────────────────────────────── */

.cbx-value-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
}

.cbx-value-grid > * {
  flex: 0 0 calc((100% - 48px) / 3);
  min-width: 0;
  display: flex;
}

.cbx-value-grid > * > * {
  width: 100%;
}

.cbx-value-card {
  border-radius: var(--cbx-radius);
  overflow: hidden;
  background: var(--cbx-mist);
  display: flex;
  flex-direction: column;
}

.cbx-value-card figure {
  height: 220px;
  overflow: hidden;
}

.cbx-value-card figure img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cbx-value-body {
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.cbx-value-body h3 {
  font-size: 21px;
}

.cbx-value-body p {
  font-size: 14px;
}

.cbx-value-body ul {
  display: grid;
  gap: 8px;
  font-size: 13px;
  margin-top: auto;
  border-top: 1px solid var(--cbx-line);
  padding-top: 16px;
}

.cbx-value-body ul li {
  display: flex;
  gap: 8px;
}

.cbx-value-body ul li::before {
  content: '•';
  color: var(--t-accent-text, var(--cbx-dark));
}

.cbx-value-quote {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--cbx-line);
  background: var(--t-bg);
  border-radius: 14px;
  padding: 12px;
  margin-top: 2px;
}

.cbx-value-quote img {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.cbx-value-quote p {
  font-size: 13px;
  line-height: 1.4;
}

.cbx-value-quote small {
  display: block;
  font-size: 11px;
  opacity: 0.7;
}

.cbx-value-counts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: auto;
  border-top: 1px solid var(--cbx-line);
  padding-top: 16px;
}

.cbx-value-counts h4 {
  font-size: 26px;
}

.cbx-value-counts span {
  font-size: 11.5px;
}

.cbx-value-card.is-heading {
  background: var(--cbx-dark);
  padding: 30px;
  justify-content: space-between;
}

.cbx-value-card.is-heading h3 {
  color: #fff;
  font-size: clamp(22px, 2vw, 28px);
  line-height: 1.35;
  font-weight: 400;
}

.cbx-value-card.is-heading .cbx-inline-avatars img {
  border-color: var(--cbx-dark);
}

.cbx-value-card.is-heading figure {
  border-radius: 16px;
  height: 180px;
  margin-top: 24px;
}

.cbx-value-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 34px;
  font-size: 14px;
  flex-wrap: wrap;
  text-align: center;
}

.cbx-value-foot a {
  border-bottom: 1px solid currentColor;
}

/* ── testimonials ─────────────────────────────────────────── */

.cbx-reviews {
  position: relative;
  margin: 0 20px;
  border-radius: var(--cbx-radius);
  overflow: hidden;
  padding: 100px 0;
  isolation: isolate;
}

.cbx-reviews-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -2;
  opacity: 0.35;
}

.cbx-reviews::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(10, 30, 35, 0.94), rgba(16, 43, 50, 0.82));
  z-index: -1;
}

.cbx-reviews-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 60px;
  align-items: center;
}

.cbx-rating-box {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 18px 22px;
  margin-top: 30px;
  background: rgba(255, 255, 255, 0.06);
}

.cbx-rating-box b {
  color: #fff;
  font-size: 24px;
  letter-spacing: -0.02em;
}

.cbx-rating-box p {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
  margin-top: 4px;
}

.cbx-review-rail {
  display: flex;
  gap: 18px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 8px;
  scrollbar-width: none;
}

.cbx-review-rail::-webkit-scrollbar {
  display: none;
}

.cbx-review {
  flex: 0 0 min(340px, 85%);
  scroll-snap-align: start;
  border-radius: 20px;
  background: #fff;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cbx-review blockquote {
  font-size: 15px;
  line-height: 1.65;
  color: var(--cbx-body);
}

.cbx-review footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--cbx-line);
  padding-top: 16px;
}

.cbx-review footer img {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.cbx-review footer b {
  display: block;
  font-size: 14px;
  color: var(--t-text);
}

.cbx-review footer small {
  font-size: 12px;
  color: var(--cbx-body);
}

.cbx-review-nav {
  display: flex;
  gap: 10px;
  margin-top: 22px;
}

.cbx-review-nav button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.26);
  color: #fff;
  display: grid;
  place-items: center;
  transition: background 0.3s ease, color 0.3s ease;
}

.cbx-review-nav button:hover {
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
  border-color: transparent;
}

/* ── faq ──────────────────────────────────────────────────── */

.cbx-faq-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 60px;
  align-items: start;
}

.cbx-faq-list {
  display: grid;
  gap: 10px;
}

.cbx-faq-item {
  border: 1px solid var(--cbx-line);
  border-radius: 16px;
  overflow: hidden;
  background: var(--t-bg);
}

.cbx-faq-item > button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  text-align: left;
  font-size: 15px;
  font-weight: 500;
  color: var(--t-text);
}

.cbx-faq-item i {
  font-style: normal;
  font-size: 20px;
  line-height: 1;
  transition: transform 0.3s ease;
}

.cbx-faq-item[data-open='true'] i {
  transform: rotate(45deg);
}

.cbx-faq-item p {
  padding: 0 22px 22px;
  font-size: 14px;
  line-height: 1.7;
}

/* ── contact band ─────────────────────────────────────────── */

.cbx-cta {
  margin: 0 20px;
  border-radius: var(--cbx-radius);
  padding: 80px 0;
  background: var(--cbx-dark);
  color: rgba(255, 255, 255, 0.7);
}

.cbx-cta-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 60px;
  align-items: center;
}

.cbx-cta h2 {
  color: #fff;
}

.cbx-cta p {
  margin-top: 16px;
}

.cbx-contact-lines {
  display: grid;
  gap: 14px;
  margin-top: 28px;
}

.cbx-contact-lines small {
  display: block;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 3px;
}

.cbx-contact-lines a,
.cbx-contact-lines span {
  color: #fff;
  font-size: 15px;
}

.cbx-form-card {
  background: var(--t-bg);
  border-radius: 20px;
  padding: 32px;
  color: var(--cbx-body);
}

.cbx-form-card h3 {
  margin-bottom: 18px;
}

.cbx-form-card .tp-label {
  color: var(--cbx-dark);
}

/* ── footer ───────────────────────────────────────────────── */

.cbx-footer {
  margin: 20px;
  border-radius: var(--cbx-radius);
  background: var(--cbx-dark);
  color: rgba(255, 255, 255, 0.66);
  padding: 56px 0 0;
  position: relative;
  overflow: hidden;
}

.cbx-footer-box {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 18px;
  padding: 26px;
  display: grid;
  grid-template-columns: 220px repeat(3, minmax(0, 1fr));
  gap: 26px;
  align-items: center;
}

.cbx-footer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cbx-footer-brand .cbx-brand-name {
  color: #fff;
}

.cbx-footer-contact {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.cbx-footer-contact i {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(223, 243, 158, 0.14);
  color: var(--t-accent);
  font-style: normal;
  flex: 0 0 auto;
}

.cbx-footer-contact h4 {
  color: #fff;
  font-size: 13px;
  margin-bottom: 3px;
}

.cbx-footer-contact a,
.cbx-footer-contact span {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.66);
}

.cbx-footer-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.7fr 0.8fr 1.1fr;
  gap: 40px;
  padding: 48px 0;
}

.cbx-footer-grid h4 {
  color: #fff;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 18px;
}

.cbx-footer-grid p {
  font-size: 14px;
  line-height: 1.7;
}

.cbx-footer-links {
  display: grid;
  gap: 10px;
  font-size: 14px;
}

.cbx-footer-links button,
.cbx-footer-links a {
  text-align: left;
  color: rgba(255, 255, 255, 0.66);
  transition: color 0.25s ease;
}

.cbx-footer-links button:hover,
.cbx-footer-links a:hover {
  color: var(--t-accent);
}

.cbx-socials {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.cbx-socials a {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  transition: background 0.25s ease, color 0.25s ease;
}

.cbx-socials a:hover {
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
  border-color: transparent;
}

.cbx-news {
  display: flex;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 100px;
  padding: 5px 5px 5px 18px;
  margin-top: 6px;
}

.cbx-news input {
  flex: 1;
  min-width: 0;
  background: none;
  border: 0;
  outline: none;
  color: #fff;
  font-size: 13px;
}

.cbx-news input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.cbx-news button {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
  flex: 0 0 auto;
}

.cbx-footer-note {
  font-size: 11.5px;
  margin-top: 10px;
  color: rgba(255, 255, 255, 0.45);
}

.cbx-footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  padding: 22px 0;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12.5px;
}

.cbx-footer-bottom div {
  display: flex;
  gap: 18px;
}

/* ── page hero & inner pages ──────────────────────────────── */

.cbx-page-hero {
  position: relative;
  margin: 0 20px;
  border-radius: var(--cbx-radius);
  overflow: hidden;
  padding: 190px 0 90px;
  background: var(--cbx-dark);
  color: rgba(255, 255, 255, 0.75);
  isolation: isolate;
}

.cbx-page-hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -2;
}

.cbx-page-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(10, 30, 35, 0.94), rgba(16, 43, 50, 0.6));
  z-index: -1;
}

.cbx-page-hero h1 {
  color: #fff;
  max-width: 20ch;
}

.cbx-page-hero p {
  margin-top: 16px;
  max-width: 56ch;
}

.cbx-page-hero .cbx-btn {
  margin-top: 28px;
}

.cbx-page {
  padding: 90px 0;
}

.cbx-page-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 26px;
}

.cbx-page-grid > * {
  flex: 0 0 calc((100% - 52px) / 3);
  min-width: 0;
  display: flex;
}

.cbx-page-grid > * > * {
  width: 100%;
}

.cbx-page-card {
  text-align: left;
  border-radius: var(--cbx-radius);
  overflow: hidden;
  background: var(--cbx-mist);
  display: flex;
  flex-direction: column;
  transition: transform 0.35s ease;
}

.cbx-page-card:hover {
  transform: translateY(-5px);
}

.cbx-page-card figure {
  position: relative;
  height: 240px;
  overflow: hidden;
}

.cbx-page-card figure img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.cbx-page-card:hover figure img {
  transform: scale(1.05);
}

.cbx-page-card-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.cbx-page-card-body p {
  font-size: 14px;
}

.cbx-page-card-body b {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--t-text);
  padding-top: 10px;
}

.cbx-space-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 26px;
}

.cbx-space-grid > * {
  flex: 0 0 calc((100% - 52px) / 3);
  min-width: 0;
  display: flex;
}

.cbx-space-grid > * > * {
  width: 100%;
}

.cbx-space-card {
  background: var(--t-bg);
  border: 1px solid var(--cbx-line);
  border-radius: var(--cbx-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  text-align: left;
  cursor: pointer;
  transition: transform 0.35s ease, box-shadow 0.35s ease;
}

.cbx-space-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 44px rgba(16, 43, 50, 0.1);
}

.cbx-space-card figure {
  height: 220px;
  overflow: hidden;
}

.cbx-space-card figure img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cbx-space-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.cbx-space-body small {
  font-size: 11.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--cbx-body);
}

.cbx-space-body p {
  font-size: 14px;
}

.cbx-space-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
}

.cbx-space-bottom .cbx-chips {
  margin-bottom: 16px;
}

.cbx-space-foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--cbx-line);
}

.cbx-space-foot b {
  font-size: 17px;
  color: var(--t-text);
  letter-spacing: -0.02em;
}

.cbx-space-foot button {
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--t-text);
}

.cbx-detail {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.65fr);
  gap: 50px;
  align-items: start;
}

.cbx-detail-main {
  border-radius: var(--cbx-radius);
  overflow: hidden;
  height: 520px;
  background: var(--cbx-mist);
}

.cbx-detail-main img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cbx-detail-thumbs {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  overflow-x: auto;
}

.cbx-detail-thumbs button {
  width: 88px;
  height: 68px;
  border-radius: 10px;
  overflow: hidden;
  flex: 0 0 auto;
  border: 2px solid transparent;
}

.cbx-detail-thumbs button[aria-current='true'] {
  border-color: var(--cbx-dark);
}

.cbx-detail-thumbs img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cbx-detail-aside {
  border: 1px solid var(--cbx-line);
  border-radius: var(--cbx-radius);
  padding: 30px;
  display: grid;
  gap: 16px;
  position: sticky;
  top: 110px;
}

.cbx-detail-aside > strong {
  font-size: 28px;
  letter-spacing: -0.03em;
  color: var(--t-text);
}

.cbx-detail-aside ul {
  display: grid;
  gap: 9px;
  font-size: 14px;
}

.cbx-detail-aside ul li {
  display: flex;
  gap: 9px;
  align-items: flex-start;
}

.cbx-related {
  padding: 0 0 90px;
}

.cbx-related h2 {
  margin-bottom: 28px;
}

.cbx-about-story {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 50px;
  align-items: start;
}

.cbx-about-story p + p {
  margin-top: 14px;
}

.cbx-about-imgs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 50px;
}

.cbx-about-imgs img {
  width: 100%;
  height: 280px;
  object-fit: cover;
  border-radius: 18px;
}

.cbx-about-imgs img:first-child {
  grid-column: span 1;
  height: 340px;
}

.cbx-team {
  background: var(--cbx-mist);
  border-radius: var(--cbx-radius);
  margin: 0 20px;
  padding: 80px 0;
}

.cbx-team-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
}

.cbx-team-grid > * {
  flex: 0 0 calc((100% - 48px) / 3);
  min-width: 0;
  display: flex;
}

.cbx-team-grid > * > * {
  width: 100%;
}

.cbx-team-card {
  text-align: left;
}

.cbx-team-card img {
  width: 100%;
  height: 320px;
  object-fit: cover;
  border-radius: 18px;
}

.cbx-team-card h3 {
  margin-top: 16px;
  font-size: 19px;
}

.cbx-team-card p {
  font-size: 13px;
  margin-top: 4px;
}

.cbx-team-card span {
  display: block;
  font-size: 13px;
  margin-top: 8px;
}

.cbx-gallery {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.cbx-gallery button {
  border-radius: 16px;
  overflow: hidden;
  height: 240px;
}

.cbx-gallery button:nth-child(6n + 1) {
  grid-column: span 2;
}

.cbx-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.cbx-gallery button:hover img {
  transform: scale(1.05);
}

.cbx-review-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 22px;
}

.cbx-review-grid > * {
  flex: 0 0 calc((100% - 44px) / 3);
  min-width: 0;
  display: flex;
}

.cbx-review-grid > * > * {
  width: 100%;
}

.cbx-review-grid article {
  border: 1px solid var(--cbx-line);
  border-radius: 20px;
  padding: 26px;
  display: grid;
  gap: 14px;
}

.cbx-review-grid blockquote {
  font-size: 14.5px;
  line-height: 1.7;
}

.cbx-review-grid strong {
  color: var(--t-text);
  font-size: 14px;
}

.cbx-form-layout,
.cbx-contact-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 60px;
  align-items: start;
}

.cbx-contact-list {
  display: grid;
  gap: 16px;
  margin-top: 26px;
}

.cbx-contact-list p {
  border: 1px solid var(--cbx-line);
  border-radius: 14px;
  padding: 16px 18px;
}

.cbx-contact-list small {
  display: block;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--cbx-body);
  margin-bottom: 4px;
}

.cbx-contact-list a,
.cbx-contact-list span {
  color: var(--t-text);
  font-size: 15px;
}

.cbx-hours {
  margin-top: 22px;
  border: 1px solid var(--cbx-line);
  border-radius: 16px;
  padding: 18px;
  display: grid;
  gap: 8px;
}

.cbx-hours p {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.cbx-hours small {
  color: var(--cbx-body);
}

.cbx-map {
  margin: 0 20px 20px;
  border-radius: var(--cbx-radius);
  overflow: hidden;
  height: 380px;
}

.cbx-map iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

.cbx-jobs {
  display: grid;
  gap: 14px;
}

.cbx-jobs h2 {
  margin: 26px 0 8px;
}

.cbx-job {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid var(--cbx-line);
  border-radius: 16px;
  padding: 20px 22px;
  text-align: left;
  transition: background 0.3s ease;
}

.cbx-job:hover {
  background: var(--cbx-mist);
}

.cbx-job b {
  display: block;
  font-size: 16px;
  color: var(--t-text);
  font-weight: 500;
}

.cbx-job small {
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--cbx-body);
}

.cbx-career-detail {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 50px;
  align-items: start;
}

.cbx-center {
  text-align: center;
  margin-top: 34px;
}

/* ── modal ────────────────────────────────────────────────── */

.cbx-modal {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.cbx-modal-shade {
  position: absolute;
  inset: 0;
  background: rgba(8, 24, 28, 0.62);
  backdrop-filter: blur(5px);
}

.cbx-modal-panel {
  position: relative;
  width: min(980px, 100%);
  max-height: 90vh;
  background: var(--t-bg);
  border-radius: 22px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
}

.cbx-modal-aside {
  background: var(--cbx-dark);
  color: rgba(255, 255, 255, 0.72);
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 14px;
}

.cbx-modal-aside h2 {
  color: #fff;
  font-size: 32px;
}

.cbx-modal-aside p {
  font-size: 14px;
}

.cbx-modal-form {
  padding: 40px;
  overflow-y: auto;
  max-height: 90vh;
}

.cbx-modal-close {
  position: absolute;
  right: 14px;
  top: 14px;
  z-index: 2;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--cbx-dark);
  display: grid;
  place-items: center;
}

/* ── loader ───────────────────────────────────────────────── */

.cbx-loader {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: var(--cbx-dark);
  color: #fff;
  display: grid;
  place-items: center;
  text-align: center;
}

.cbx-loader-box {
  display: grid;
  place-items: center;
  gap: 18px;
}

.cbx-loader-mark {
  width: 62px;
  height: 62px;
  border-radius: 18px;
  background: var(--t-accent);
  display: grid;
  place-items: center;
  color: var(--t-accent-text, #102b32);
  font-size: 24px;
  font-weight: 700;
  animation: cbx-pulse 1.4s ease-in-out infinite;
}

.cbx-loader b {
  font-size: 20px;
  letter-spacing: -0.02em;
}

.cbx-loader small {
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.cbx-loader em {
  display: block;
  width: 140px;
  height: 2px;
  background: rgba(255, 255, 255, 0.16);
  margin-top: 6px;
  overflow: hidden;
  position: relative;
}

.cbx-loader em::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--t-accent);
  transform-origin: left;
  animation: cbx-load 1.1s ease-in-out infinite;
}

@keyframes cbx-pulse {
  50% {
    transform: scale(0.94);
  }
}

@keyframes cbx-load {
  0% {
    transform: scaleX(0);
  }
  60% {
    transform: scaleX(0.85);
  }
  100% {
    transform: scaleX(1);
  }
}

/* ── shared form / modal primitives used by the common components ── */

.cbx {
  --t-raised: #ffffff;
  --t-soft: #f7f7f7;
  --t-surface: #f7f7f7;
  --t-muted: #6b7f84;
  --t-ink: #102b32;
  --t-on-ink: #ffffff;
}

.cbx .tp-eyebrow {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--t-muted);
  margin-bottom: 4px;
}

.cbx .tp-h3 {
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--t-text);
}

.cbx .tp-display {
  font-weight: 600;
  letter-spacing: -0.03em;
}

.cbx .tp-muted {
  color: var(--t-muted);
}

.cbx .tp-soft {
  background: var(--t-soft);
  border-radius: 14px;
}

.cbx .tp-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--t-muted);
  margin-bottom: 6px;
}

.cbx .tp-input {
  width: 100%;
  background: #fbfbfb;
  border: 1.5px solid rgba(16, 43, 50, 0.18);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14.5px;
  outline: none;
  color: var(--t-text);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.cbx .tp-input::placeholder {
  color: color-mix(in srgb, var(--t-text) 42%, transparent);
}

.cbx .tp-input:focus {
  border-color: var(--t-text);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--t-accent) 45%, transparent);
}

.cbx .tp-input:disabled {
  opacity: 0.55;
}

.cbx textarea.tp-input {
  resize: vertical;
  min-height: 92px;
}

.cbx .tp-tab {
  border-radius: 100px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid var(--t-line);
  background: var(--t-raised);
  color: var(--t-text);
  transition: all 0.2s ease;
  white-space: nowrap;
}

.cbx .tp-tab:hover {
  border-color: var(--t-text);
}

.cbx .tp-tab[aria-pressed='true'] {
  background: var(--cbx-dark);
  color: #fff;
  border-color: var(--cbx-dark);
}

.cbx .tp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 100px;
  padding: 13px 24px;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.cbx .tp-btn:hover {
  opacity: 0.9;
}

.cbx .tp-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.cbx .tp-btn-primary {
  background: var(--t-accent);
  color: var(--t-accent-text, #102b32);
}

.cbx .tp-btn-ghost {
  border: 1.5px solid var(--t-line);
  color: var(--t-text);
  background: transparent;
}

.cbx .tp-btn-dark {
  background: var(--cbx-dark);
  color: #fff;
}

.cbx .tp-btn-sm {
  padding: 9px 16px;
  font-size: 13px;
}

.cbx .tp-card {
  background: var(--t-bg);
  border-radius: 16px;
}

.cbx .tp-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 100px;
  padding: 5px 11px;
  font-size: 12px;
  font-weight: 600;
  background: var(--t-soft);
  color: var(--t-text);
}

.cbx .tp-wrap {
  width: min(1280px, calc(100% - 32px));
  margin-inline: auto;
}

.cbx-modal-aside .cbx-eyebrow {
  align-self: flex-start;
  text-transform: capitalize;
}

/* ── responsive ───────────────────────────────────────────── */

@media (max-width: 1200px) {
  .cbx-hero {
    padding: 60px;
  }

  .cbx-hero-copy {
    width: 63%;
  }

  .cbx-hero-copy h1 {
    font-size: 56px;
  }

  .cbx-hero-rating {
    top: 60px;
    right: 60px;
  }

  .cbx-hero-clients {
    width: calc(37% + 60px);
    padding: 30px 20px;
    margin: 0 -60px -60px 0;
  }

  .cbx-hero-clients p {
    margin: 0 0 20px;
  }

  .cbx-service-grid > *,
  .cbx-value-grid > *,
  .cbx-team-grid > * {
    flex-basis: calc((100% - 24px) / 2);
  }

  .cbx-page-grid > *,
  .cbx-space-grid > * {
    flex-basis: calc((100% - 26px) / 2);
  }

  .cbx-review-grid > * {
    flex-basis: calc((100% - 22px) / 2);
  }

  .cbx-about-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cbx-plan-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cbx-footer-box {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cbx-footer-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 34px;
  }

  .cbx-detail,
  .cbx-about-story,
  .cbx-career-detail {
    grid-template-columns: 1fr;
  }

  .cbx-detail-aside {
    position: static;
  }

  .cbx-gallery {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .cbx-nav,
  .cbx-headend .cbx-btn {
    display: none;
  }

  .cbx-burger {
    display: grid;
    margin-left: auto;
  }

  .cbx-headbar {
    min-height: 72px;
    padding: 12px 16px;
  }

  .cbx-hero {
    margin-top: 104px;
    min-height: 100%;
    padding: 50px 15px 15px;
  }

  .cbx-hero-shade {
    background: var(--cbx-dark);
    opacity: 0.4;
  }

  .cbx-hero-grid {
    gap: 30px 15px;
  }

  .cbx-hero-copy {
    width: 100%;
  }

  .cbx-hero-rating {
    position: static;
    width: 100%;
    max-width: 100%;
    padding: 20px;
  }

  .cbx-hero-clients {
    width: calc(60% - 15px);
    padding: 20px 15px;
    margin: 0 -15px -15px auto;
  }

  .cbx-do-grid,
  .cbx-why-grid,
  .cbx-process-grid,
  .cbx-reviews-grid,
  .cbx-faq-grid,
  .cbx-cta-grid,
  .cbx-form-layout,
  .cbx-contact-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .cbx-do-collage {
    max-width: 640px;
  }

  .cbx-why-media {
    height: 420px;
  }

  .cbx-stat-band {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .cbx-section,
  .cbx-process {
    padding: 70px 0;
  }

  .cbx-video,
  .cbx-reviews {
    padding: 80px 0 40px;
  }

  .cbx-footer-box {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .cbx-shell {
    width: 100%;
  }

  .cbx-hero,
  .cbx-video,
  .cbx-process,
  .cbx-reviews,
  .cbx-cta,
  .cbx-footer,
  .cbx-page-hero,
  .cbx-team,
  .cbx-band {
    margin-inline: 14px;
  }

  .cbx-footer {
    margin-bottom: 14px;
  }

  .cbx-hero {
    border-radius: 0;
  }

  .cbx-hero-copy h1 {
    font-size: 42px;
  }

  .cbx-hero-clients::before,
  .cbx-hero-clients::after {
    display: none;
  }

  .cbx-service-grid > *,
  .cbx-value-grid > *,
  .cbx-page-grid > *,
  .cbx-space-grid > *,
  .cbx-team-grid > *,
  .cbx-review-grid > * {
    flex-basis: 100%;
  }

  .cbx-about-grid,
  .cbx-plan-grid,
  .cbx-project-grid,
  .cbx-footer-grid {
    grid-template-columns: 1fr;
  }

  .cbx-about-card {
    min-height: auto;
  }

  .cbx-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 16px;
  }

  .cbx-about-imgs {
    grid-template-columns: 1fr 1fr;
  }

  .cbx-about-imgs img:first-child {
    grid-column: span 2;
    height: 240px;
  }

  .cbx-about-imgs img {
    height: 200px;
  }

  .cbx-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cbx-gallery button:nth-child(6n + 1) {
    grid-column: span 2;
  }

  .cbx-why-item {
    grid-template-columns: 44px 70px 1fr;
  }

  .cbx-modal-panel {
    grid-template-columns: 1fr;
    max-height: 92vh;
  }

  .cbx-modal-aside {
    padding: 26px;
  }

  .cbx-modal-form {
    padding: 26px;
    max-height: none;
  }

  .cbx-detail-main {
    height: 380px;
  }

  .cbx-do-main {
    height: 380px;
  }

  .cbx-project-media {
    height: 300px;
  }

  .cbx-section,
  .cbx-process {
    padding: 54px 0;
  }

  .cbx-page {
    padding: 60px 0;
  }

  .cbx-page-hero {
    padding: 150px 0 60px;
  }
}

@media (max-width: 560px) {
  .cbx {
    font-size: 15px;
  }

  .cbx-shell {
    width: 100%;
  }

  .cbx-headwrap {
    inset: 8px 0 auto;
    padding-inline: 12px;
  }

  .cbx-headbar {
    min-height: 60px;
    padding: 9px 10px 9px 12px;
    gap: 10px;
  }

  .cbx-brand-tile {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    font-size: 17px;
  }

  .cbx-brand-name {
    font-size: 19px;
  }

  .cbx-hero-copy h1 {
    font-size: 30px;
  }

  .cbx-hero-actions {
    gap: 18px;
  }

  .cbx-hero-clients {
    width: calc(100% + 30px);
    margin: 0 -15px -15px;
    border-radius: 0;
  }

  .cbx-section {
    padding: 44px 0;
  }

  .cbx-process {
    padding: 44px 0;
  }

  .cbx-head {
    margin-bottom: 28px;
  }

  .cbx-about-card.is-light,
  .cbx-about-card.is-accent {
    padding: 24px;
  }

  .cbx-about-card.is-accent h2 {
    font-size: 40px;
  }

  .cbx-service-card {
    padding: 24px;
    min-height: auto;
  }

  .cbx-do-main {
    height: 300px;
  }

  .cbx-do-sub {
    width: 52%;
    height: 150px;
  }

  .cbx-do-client {
    left: 12px;
    top: 12px;
    padding: 12px 14px;
    max-width: 190px;
  }

  .cbx-video {
    padding: 60px 0 30px;
  }

  .cbx-play {
    width: 70px;
    height: 70px;
  }

  .cbx-video-list {
    margin-top: 34px;
  }

  .cbx-project-media {
    height: 240px;
  }

  .cbx-step {
    grid-template-columns: 48px 1fr;
    gap: 14px;
  }

  .cbx-step-number {
    width: 42px;
    height: 42px;
    font-size: 14px;
  }

  .cbx-why-media {
    height: 340px;
  }

  .cbx-why-item {
    grid-template-columns: 44px 1fr;
    align-items: center;
    row-gap: 8px;
  }

  .cbx-why-item > div {
    grid-column: 1 / -1;
  }

  .cbx-why-float {
    left: 12px;
    right: 12px;
    bottom: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .cbx-reviews {
    padding: 54px 0 30px;
  }

  .cbx-review {
    flex-basis: 88%;
    padding: 22px;
  }

  .cbx-value-card figure {
    height: 180px;
  }

  .cbx-gallery {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .cbx-gallery button {
    height: 160px;
  }

  .cbx-gallery button:nth-child(6n + 1) {
    grid-column: span 2;
    height: 190px;
  }

  .cbx-footer {
    padding-top: 34px;
  }

  .cbx-footer-box {
    padding: 20px;
  }

  .cbx-footer-grid {
    gap: 26px;
    padding: 30px 0;
  }

  .cbx-footer-bottom {
    flex-direction: column;
    gap: 8px;
  }

  .cbx-page-hero {
    padding: 130px 0 46px;
  }

  .cbx-page {
    padding: 44px 0;
  }

  .cbx-page-card figure {
    height: 200px;
  }

  .cbx-space-card figure {
    height: 190px;
  }

  .cbx-detail-main {
    height: 280px;
  }

  .cbx-detail-aside {
    padding: 22px;
  }

  .cbx-modal {
    padding: 10px;
  }

  .cbx-modal-form {
    padding: 20px;
  }

  .cbx-modal-aside {
    padding: 20px;
  }

  .cbx-map {
    height: 280px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cbx * {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .cbx-marquee-track {
    animation: none;
    flex-wrap: wrap;
    width: 100%;
    justify-content: center;
  }
}
`;
