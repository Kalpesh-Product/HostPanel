export const GRAND_BAR_REFINEMENT_CSS = `
.gb .gb-frame{width:calc(100% - 90px);max-width:none;padding-left:clamp(42px,5.2vw,100px);padding-right:clamp(42px,5.2vw,100px)}
.gb .gb-header{transition:height .45s cubic-bezier(.22,1,.36,1),background .45s,border-color .45s,backdrop-filter .45s}
.gb .gb-header-inner{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:clamp(24px,2.3vw,44px);transition:transform .45s cubic-bezier(.22,1,.36,1)}
.gb .gb-logo{position:static;transform:none;justify-self:center;transition:opacity .4s ease,transform .45s cubic-bezier(.22,1,.36,1),visibility .4s}
.gb .gb-nav{padding-right:0;gap:clamp(18px,1.55vw,30px)}
.gb .gb-nav button{font-size:13px;font-weight:400;letter-spacing:2px}
.gb .gb-nav-left{justify-self:start}
.gb .gb-header-right{justify-self:end;display:flex;align-items:center;gap:clamp(20px,2vw,38px);min-width:0}
.gb .gb-nav-right{justify-content:flex-end}
.gb .gb-header-actions{flex:0 0 auto}
/* Match the reference "Book a Table" button: Jost-scale 13px copy, 2px tracking,
   15/30/13/30 padding and auto width (no forced min-size). */
.gb .gb-header-actions .gb-outline-button{min-width:0;min-height:0;padding:15px 30px 13px;font-size:13px;font-weight:400;letter-spacing:2px;line-height:1.5}
.gb .gb-header-actions .gb-outline-button:hover{background:var(--gb-brass);color:var(--gb-ink);transform:rotate(-2deg)}

/* On scroll the reference drops the centred seal and compacts the bar toward the top,
   leaving a logo-less sticky strip with the nav left and the CTA right. */
.gb .gb-header[data-scrolled=true]{height:78px}
.gb .gb-header[data-scrolled=true] .gb-header-inner{transform:translateY(-4px)}
.gb .gb-header[data-scrolled=true] .gb-logo{opacity:0;visibility:hidden;transform:translateY(-14px) scale(.9)}

.gb .gb-hero-grid{grid-template-columns:1fr .9fr;gap:0;align-items:start}
.gb .gb-hero-copy{padding:126px 0 70px;max-width:720px}
.gb .gb-hero-copy h1{font-size:clamp(82px,7.8vw,118px);line-height:.84;margin:0;position:relative;z-index:2}
.gb .gb-hero-copy>p{max-width:555px;margin-top:30px;font-size:13px;line-height:2}
.gb .gb-hero-meta{grid-template-columns:1.08fr .92fr;align-items:start;margin-top:40px;padding-top:32px}
.gb .gb-hero-meta>span{line-height:1.8}
.gb .gb-hero-meta>div{display:grid;gap:9px;text-transform:none}
.gb .gb-hero-meta b{margin-bottom:3px;color:var(--gb-cream);font-size:10px;text-transform:uppercase;letter-spacing:.17em}
.gb .gb-hero-image{width:min(100%,760px);height:800px;margin-top:60px;justify-self:end;border-radius:380px 380px 0 0}
.gb .gb-hero-video{width:100%;height:100%;object-fit:cover;display:block}
.gb .gb-hero-image>span{right:-20px;bottom:38px;font-size:45px;max-width:205px}
.gb .gb-hero-image img,.gb .gb-hero-video{transition:transform 1.2s cubic-bezier(.22,1,.36,1),filter .8s ease}
.gb .gb-hero-image:hover img,.gb .gb-hero-image:hover .gb-hero-video{transform:scale(1.025);filter:saturate(1.06)}

.gb .gb-paradise{padding:112px 0 92px}
.gb .gb-paradise-title{grid-template-columns:100px minmax(0,760px);justify-content:center;align-items:center;gap:48px}
.gb .gb-paradise-title .gb-round-icon{width:78px;height:78px;background:radial-gradient(circle at center,transparent 45%,rgba(170,136,103,.16) 46%,transparent 48%)}
.gb .gb-paradise-title h2{font-size:clamp(76px,8.2vw,118px);line-height:.86;text-align:center}
.gb .gb-paradise-grid{grid-template-columns:.58fr 1.2fr;gap:72px;margin-top:72px;min-height:560px}
.gb .gb-paradise-copy{padding-top:118px}
.gb .gb-paradise-copy .gb-kicker{font-size:26px!important;line-height:1.45!important;letter-spacing:.14em!important;color:var(--gb-cream)!important;max-width:330px}
.gb .gb-paradise-copy>p:not(.gb-kicker){max-width:310px;margin:30px 0 38px;line-height:2}
.gb .gb-paradise-main{height:560px;border-radius:0}
.gb .gb-paradise-orb{left:39%;bottom:0;width:190px;height:300px;border-radius:95px 95px 0 0;z-index:2}
.gb .gb-paradise-main img,.gb .gb-paradise-orb img{transition:transform 1s cubic-bezier(.22,1,.36,1)}
.gb .gb-paradise-main:hover img{transform:scale(1.035)}

.gb .gb-menu-banner{height:660px}
.gb .gb-menu-banner-media{position:absolute;inset:0}
.gb .gb-menu-banner-media img,.gb .gb-menu-banner-media .gb-placeholder{width:100%;height:100%;object-fit:cover}
.gb .gb-menu-banner-shade{position:absolute;inset:0;background:rgba(5,11,13,.28)}
.gb .gb-menu-banner-title{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:2}
.gb .gb-menu-banner h2{font-size:clamp(96px,11vw,156px)}
.gb .gb-menu-discovery{padding:58px 0 112px}
.gb .gb-menu-discovery-grid{grid-template-columns:.83fr 1fr .83fr;gap:0}
.gb .gb-menu-collage{gap:80px;padding:0 34px}
.gb .gb-menu-collage img,.gb .gb-menu-collage .gb-placeholder{height:310px}
.gb .gb-menu-collage img:nth-child(2),.gb .gb-menu-collage .gb-placeholder:nth-child(2){height:360px;border-radius:180px}
.gb .gb-menu-collage-right img,.gb .gb-menu-collage-right .gb-placeholder{height:520px;border-radius:260px;padding:0}
.gb .gb-menu-collage img{transition:transform .9s cubic-bezier(.22,1,.36,1),filter .6s ease}
.gb .gb-menu-collage img:hover{transform:scale(.985);filter:saturate(1.08)}
.gb .gb-menu-links{align-self:center;border-left:1px solid var(--gb-line);border-right:1px solid var(--gb-line);padding:70px 28px;min-height:690px;justify-content:center}
.gb .gb-menu-links>button:not(.gb-outline-button){font-size:34px;line-height:1.28}

.gb .gb-premium{background:var(--gb-ink-2);padding:90px 0 110px;overflow:hidden}
.gb .gb-premium-title{max-width:640px}
.gb .gb-premium-title h2{font-size:clamp(64px,7vw,108px);line-height:.86;letter-spacing:-.03em}
.gb .gb-premium-title p{margin-top:24px;color:var(--gb-brass);font:italic 32px/1 "Cormorant Garamond",serif}
.gb .gb-premium-track{overflow:hidden;margin-top:64px}
.gb .gb-premium-row{display:flex;gap:28px;width:max-content;animation:gb-premium-scroll 42s linear infinite}
.gb .gb-premium-row:hover,.gb .gb-premium-row:focus-within{animation-play-state:paused}
.gb .gb-premium-media{flex:0 0 auto;width:clamp(260px,22vw,340px);height:460px;overflow:hidden;border-radius:230px 230px 0 0}
.gb .gb-premium-media img,.gb .gb-premium-media .gb-placeholder{width:100%;height:100%;object-fit:cover}
@keyframes gb-premium-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){.gb .gb-premium-row{animation:none}}

.gb .gb-find{padding:120px 0 150px}
.gb .gb-find-grid{grid-template-columns:.94fr 1.06fr;gap:130px}
.gb .gb-find-map{height:610px;border-radius:305px 305px 0 0}
.gb .gb-find-map{overflow:visible}
.gb .gb-find-map iframe{border-radius:inherit}
.gb .gb-find-map>span{right:-76px;top:-22px;z-index:2}
.gb .gb-find-copy h2{max-width:330px;font-size:clamp(82px,8vw,116px);line-height:.72}
.gb .gb-footer h2{text-align:center}

.gb .gb-menu-card,.gb .gb-service-index button{transition:transform .5s cubic-bezier(.22,1,.36,1)}
.gb .gb-menu-card:hover,.gb .gb-service-index button:hover{transform:translateY(-8px)}

@media(prefers-reduced-motion:reduce){
  .gb *,.gb *:before,.gb *:after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  .gb .gb-menu-card:hover,.gb .gb-service-index button:hover,.gb .gb-menu-collage img:hover{transform:none}
}

@media(max-width:1120px){
  .gb .gb-frame{width:calc(100% - 48px);padding-left:32px;padding-right:32px}
  .gb .gb-header-inner{grid-template-columns:1fr auto;gap:20px}
  .gb .gb-logo{justify-self:start}
  .gb .gb-header-right{justify-self:end}
  .gb .gb-nav{display:none}
  .gb .gb-hero-copy h1{font-size:80px}
  .gb .gb-hero-image{height:720px}
  .gb .gb-premium-media{height:400px}
}

@media(max-width:760px){
  .gb .gb-frame{width:calc(100% - 28px);padding-left:18px;padding-right:18px}
  .gb .gb-hero-grid{display:block}
  .gb .gb-hero-copy{padding:70px 0 42px;max-width:none;min-height:0}
  .gb .gb-hero-copy h1{font-size:clamp(68px,20vw,90px)}
  .gb .gb-hero-meta{grid-template-columns:1fr;gap:25px}
  .gb .gb-hero-image{height:560px;margin:0;border-radius:280px 280px 0 0}
  .gb .gb-hero-image>span{right:10px}
  .gb .gb-paradise{padding:90px 0 110px}
  .gb .gb-paradise-title{grid-template-columns:1fr;gap:26px;justify-items:start}
  .gb .gb-paradise-title h2{text-align:left;font-size:64px}
  .gb .gb-paradise-grid{grid-template-columns:1fr;gap:45px;margin-top:52px;min-height:0}
  .gb .gb-paradise-copy{padding:0}
  .gb .gb-paradise-copy .gb-kicker{font-size:18px!important}
  .gb .gb-paradise-main{height:500px}
  .gb .gb-paradise-orb{left:auto;right:8px;bottom:-70px;width:130px;height:210px}
  .gb .gb-menu-banner{height:520px}
  .gb .gb-menu-discovery-grid{grid-template-columns:1fr}
  .gb .gb-menu-links{grid-row:1;border:0;min-height:0;padding:20px 0 70px}
  .gb .gb-menu-collage-right{grid-row:2;padding:0}
  .gb .gb-menu-collage-right img,.gb .gb-menu-collage-right .gb-placeholder{height:470px}
  .gb .gb-premium{padding:85px 0 100px}
  .gb .gb-premium-title h2{font-size:56px}
  .gb .gb-premium-title p{font-size:26px;margin-top:18px}
  .gb .gb-premium-track{margin-top:40px}
  .gb .gb-premium-media{width:220px;height:320px}
  .gb .gb-find-grid{grid-template-columns:1fr;gap:60px}
  .gb .gb-find-map{height:500px}
  .gb .gb-find-copy h2{font-size:78px}
}
`;
