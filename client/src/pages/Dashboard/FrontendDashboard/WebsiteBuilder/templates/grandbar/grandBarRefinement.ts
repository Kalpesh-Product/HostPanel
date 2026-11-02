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

.gb .gb-hero{position:relative;min-height:100svh;padding-top:0;overflow:hidden;isolation:isolate;background:var(--gb-ink)}
.gb .gb-hero-grid{position:relative;z-index:2;display:flex;align-items:center;min-height:100svh;padding-top:150px;padding-bottom:70px}
.gb .gb-hero-copy{width:min(42vw,690px);padding:0}
.gb .gb-hero-kicker{margin-bottom:26px;color:var(--gb-cream)!important}
.gb .gb-hero-copy h1{max-width:680px;font-size:clamp(74px,6.7vw,108px);line-height:.8;margin:0;letter-spacing:-.045em}
.gb .gb-hero-copy>p:not(.gb-kicker){max-width:520px;margin-top:28px;color:rgba(242,238,231,.78);font-size:13px;line-height:1.8}
.gb .gb-hero-actions{display:flex;align-items:center;gap:28px;margin-top:34px}
.gb .gb-hero-primary{background:var(--gb-brass);color:var(--gb-ink);border-color:var(--gb-brass)}
.gb .gb-hero-primary:hover{background:var(--gb-cream);border-color:var(--gb-cream)}
.gb .gb-hero-menu-link{display:inline-flex;align-items:center;gap:11px;border:0;border-bottom:1px solid rgba(242,238,231,.55);background:transparent;padding:13px 0 10px;text-transform:uppercase;letter-spacing:.15em;font-size:10px}
.gb .gb-hero-menu-link svg{transition:transform .35s ease}
.gb .gb-hero-menu-link:hover svg{transform:translateX(5px)}
.gb .gb-hero-meta{width:100%;grid-template-columns:1.08fr .92fr;align-items:start;margin-top:38px;padding-top:24px;border-color:rgba(242,238,231,.24)}
.gb .gb-hero-meta>span{line-height:1.8}
.gb .gb-hero-meta>div{display:grid;gap:9px;text-transform:none}
.gb .gb-hero-meta b{margin-bottom:3px;color:var(--gb-cream);font-size:10px;text-transform:uppercase;letter-spacing:.17em}
.gb .gb-hero-image{position:absolute;inset:0 0 0 45%;z-index:0;width:auto;height:100%;margin:0;border-radius:0;overflow:hidden}
.gb .gb-hero-image:after{display:none}
.gb .gb-hero-image img,.gb .gb-hero-image .gb-placeholder{width:100%;height:100%;object-fit:cover}
.gb .gb-hero-video{width:100%;height:100%;object-fit:cover;display:block}
.gb .gb-hero-shade{position:absolute;inset:0;background:linear-gradient(90deg,var(--gb-ink) 0%,rgba(11,27,34,.62) 10%,transparent 28%),linear-gradient(0deg,rgba(4,12,15,.42),transparent 38%)}
.gb .gb-hero-image img,.gb .gb-hero-video{transition:transform 1.2s cubic-bezier(.22,1,.36,1),filter .8s ease}
.gb .gb-hero:hover .gb-hero-image img,.gb .gb-hero:hover .gb-hero-video{transform:scale(1.018);filter:saturate(1.06)}

.gb .gb-paradise{padding:112px 0 92px}
.gb .gb-paradise-title{display:block;max-width:940px;margin:0 auto}
.gb .gb-paradise-title h2{font-size:clamp(76px,8.2vw,118px);line-height:.86;text-align:center}
.gb .gb-paradise-grid{grid-template-columns:.58fr 1.2fr;gap:72px;margin-top:72px;min-height:560px}
.gb .gb-paradise-copy{padding-top:118px}
.gb .gb-paradise-copy .gb-kicker{font-size:26px!important;line-height:1.45!important;letter-spacing:.14em!important;color:var(--gb-cream)!important;max-width:330px}
.gb .gb-paradise-copy>p:not(.gb-kicker){max-width:310px;margin:30px 0 38px;line-height:2}
.gb .gb-paradise-main{height:560px;border-radius:0}
.gb .gb-paradise-main img{transition:transform 1s cubic-bezier(.22,1,.36,1)}
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
.gb .gb-find-grid{display:grid;grid-template-columns:1fr;gap:58px}
.gb .gb-find-copy{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.4fr);gap:clamp(44px,6vw,100px);align-items:end}
.gb .gb-find-copy h2{max-width:none;white-space:nowrap;font-size:clamp(68px,6.6vw,104px);line-height:.82;margin:18px 0 0}
.gb .gb-find-details{padding-bottom:8px}
.gb .gb-find-address{display:flex;align-items:flex-start;gap:13px;color:var(--gb-cream)!important;font-size:14px!important;line-height:1.7!important;margin:0 0 24px!important}
.gb .gb-find-address svg{flex:0 0 auto;margin-top:2px;color:var(--gb-brass)}
.gb .gb-find-hours{border-top:1px solid var(--gb-line)}
.gb .gb-find-hours p{display:flex;justify-content:space-between;gap:22px;margin:0!important;padding:11px 0;border-bottom:1px solid var(--gb-line);font-size:11px!important}
.gb .gb-find-hours b{color:var(--gb-cream);font-weight:400;text-align:right}
.gb .gb-find-map{height:clamp(390px,42vw,590px);border-radius:2px;overflow:hidden}
.gb .gb-find-map iframe{border-radius:inherit;filter:saturate(.78) contrast(1.03) brightness(.9)}
.gb .gb-contact-map{height:clamp(420px,48vw,620px);margin-top:clamp(56px,7vw,90px)}
.gb .gb-contact-map iframe{filter:saturate(.78) contrast(1.03)}
.gb .gb-back-to-top{position:fixed;right:clamp(18px,2.6vw,42px);bottom:clamp(18px,2.6vw,42px);z-index:70;width:52px;height:52px;border:1px solid rgba(170,136,103,.72);border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(7,19,24,.9);color:var(--gb-cream);box-shadow:0 16px 42px rgba(0,0,0,.28);backdrop-filter:blur(10px)}
.gb .gb-back-to-top svg{transform:rotate(-90deg)}
.gb .gb-back-to-top:hover{background:var(--gb-brass);color:var(--gb-ink)}
.gb .gb-booking-shell{align-items:center;padding:20px}
.gb .gb-booking{display:block;width:min(760px,100%);max-height:none;overflow:visible;border:1px solid rgba(170,136,103,.4);box-shadow:0 30px 90px rgba(0,0,0,.38)}
.gb .gb-booking-form{padding:clamp(34px,4vw,48px) clamp(34px,4.5vw,56px)}
.gb .gb-booking-heading{padding-right:48px;margin-bottom:24px}
.gb .gb-booking-form h3{font-size:48px;line-height:.9;margin:11px 0 12px}
.gb .gb-booking-form>p:not(.gb-kicker),.gb .gb-booking-heading>p:not(.gb-kicker){max-width:560px;margin:0;color:rgba(11,27,34,.62);font-size:12px;line-height:1.65}
.gb .gb-booking-form form{row-gap:11px;column-gap:18px}
.gb .gb-booking-form .tp-label{margin-bottom:5px}
.gb .gb-booking-form .tp-input{min-height:40px;padding:6px 2px}
.gb .gb-booking-form textarea.tp-input{min-height:58px;max-height:58px;resize:none}
.gb .gb-booking-form .tp-btn{min-height:43px}
.gb .gb-booking-close{right:16px;top:16px;width:42px;height:42px}
.gb .gb-footer h2{text-align:center}

.gb .gb-menu-card,.gb .gb-service-index button{transition:transform .5s cubic-bezier(.22,1,.36,1)}
.gb .gb-menu-card:hover,.gb .gb-service-index button:hover{transform:translateY(-8px)}
.gb .gb-item-page-section{padding-top:clamp(180px,15vw,230px)}
.gb .gb-item-back{margin-bottom:30px}
.gb .gb-menu-suggestions,.gb .gb-related-items{margin-top:clamp(90px,10vw,150px);padding-top:clamp(70px,8vw,110px);border-top:1px solid rgba(11,27,34,.22)}
.gb .gb-related-items{border-left:1px solid rgba(71,53,40,.22);border-right:1px solid rgba(71,53,40,.22)}
.gb .gb-suggestion-heading{display:grid;grid-template-columns:.42fr 1fr;gap:50px;align-items:start;margin-bottom:52px}
.gb .gb-suggestion-heading h2{max-width:760px;font-size:clamp(48px,5.5vw,78px);line-height:.9}
.gb .gb-suggestion-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.gb .gb-suggestion-grid button{position:relative;width:100%;border:0;background:none;color:var(--gb-ink);text-align:left}
.gb .gb-suggestion-grid button>div{height:310px;overflow:hidden}
.gb .gb-suggestion-grid img,.gb .gb-suggestion-grid .gb-placeholder{width:100%;height:100%;object-fit:cover;transition:transform .7s cubic-bezier(.22,1,.36,1)}
.gb .gb-suggestion-grid button:hover img{transform:scale(1.035)}
.gb .gb-suggestion-grid span{display:block;margin-top:20px;color:#8b6749;font-size:9px;text-transform:uppercase;letter-spacing:.15em}
.gb .gb-suggestion-grid h3{padding-right:44px;margin-top:8px;font-size:35px;line-height:1}
.gb .gb-suggestion-grid b{position:absolute;right:0;bottom:5px;display:flex}

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
  .gb .gb-hero-copy{width:48vw}
  .gb .gb-hero-copy h1{font-size:76px}
  .gb .gb-hero-image{left:48%}
  .gb .gb-find-copy h2{font-size:64px}
  .gb .gb-premium-media{height:400px}
}

@media(max-width:760px){
  .gb .gb-frame{width:calc(100% - 28px);padding-left:18px;padding-right:18px}
  .gb .gb-hero{min-height:0}
  .gb .gb-hero-image{position:relative;inset:auto;z-index:0;width:100%;height:54svh;min-height:430px}
  .gb .gb-hero-grid{display:flex;min-height:0;padding-top:46px;padding-bottom:58px}
  .gb .gb-hero-copy{width:100%;padding:0;max-width:none;min-height:0}
  .gb .gb-hero-kicker{margin-bottom:18px}
  .gb .gb-hero-copy h1{font-size:clamp(62px,18vw,82px);line-height:.8}
  .gb .gb-hero-copy>p:not(.gb-kicker){font-size:12px;line-height:1.7;margin-top:22px}
  .gb .gb-hero-actions{gap:18px;margin-top:28px;flex-wrap:wrap}
  .gb .gb-hero-primary{min-height:46px;padding:0 21px}
  .gb .gb-hero-menu-link{font-size:9px}
  .gb .gb-hero-meta{grid-template-columns:1fr;gap:25px}
  .gb .gb-hero-shade{background:linear-gradient(0deg,var(--gb-ink) 0%,transparent 24%),linear-gradient(90deg,rgba(4,12,15,.25),transparent)}
  .gb .gb-paradise{padding:90px 0 110px}
  .gb .gb-paradise-title h2{text-align:left;font-size:64px}
  .gb .gb-paradise-grid{grid-template-columns:1fr;gap:45px;margin-top:52px;min-height:0}
  .gb .gb-paradise-copy{padding:0}
  .gb .gb-paradise-copy .gb-kicker{font-size:18px!important}
  .gb .gb-paradise-main{height:500px}
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
  .gb .gb-find-grid{gap:42px}
  .gb .gb-find-copy{grid-template-columns:1fr;gap:34px}
  .gb .gb-find-map{height:390px}
  .gb .gb-find-copy h2{white-space:normal;font-size:68px}
  .gb .gb-contact-map{height:390px}
  .gb .gb-back-to-top{width:46px;height:46px}
  .gb .gb-booking-shell{align-items:center;padding:10px}
  .gb .gb-booking{max-height:none;overflow:visible}
  .gb .gb-booking-form{padding:26px 20px 22px}
  .gb .gb-booking-heading{padding-right:42px;margin-bottom:18px}
  .gb .gb-booking-form h3{font-size:39px;margin:9px 0 10px}
  .gb .gb-booking-form form{row-gap:8px;column-gap:12px}
  .gb .gb-booking-form form>div[class*="sm:col-span-1"]{grid-column:span 1/span 1}
  .gb .gb-booking-form .tp-input{min-height:36px;padding:4px 2px}
  .gb .gb-booking-form textarea.tp-input{min-height:48px;max-height:48px}
  .gb .gb-booking-form .tp-btn{min-height:40px}
  .gb .gb-booking-close{right:10px;top:10px;width:38px;height:38px}
  .gb .gb-menu-suggestions,.gb .gb-related-items{margin-top:85px;padding-top:65px}
  .gb .gb-suggestion-heading{grid-template-columns:1fr;gap:18px;margin-bottom:38px}
  .gb .gb-suggestion-heading h2{font-size:50px}
  .gb .gb-suggestion-grid{grid-template-columns:1fr;gap:42px}
  .gb .gb-suggestion-grid button>div{height:360px}

  /* Phone composition: preserve the venue atmosphere without carrying desktop scale
     and spacing into a narrow viewport. */
  .gb .gb-frame{width:calc(100% - 20px);padding-left:14px;padding-right:14px}
  .gb .gb-header,.gb .gb-header[data-scrolled=true]{height:76px;background:linear-gradient(180deg,rgba(7,19,24,.96),rgba(7,19,24,.72) 70%,transparent)}
  .gb .gb-header[data-scrolled=true]{background:rgba(7,19,24,.96);backdrop-filter:blur(14px)}
  .gb .gb-header-inner{grid-template-columns:1fr auto;gap:12px;transform:none!important}
  .gb .gb-logo,.gb .gb-header[data-scrolled=true] .gb-logo{opacity:1;visibility:visible;justify-self:start;transform:none}
  .gb .gb-seal-compact{width:58px;height:58px}
  .gb .gb-header-right{gap:10px}
  .gb .gb-menu-button{width:44px;height:44px;background:rgba(7,19,24,.56)}
  .gb .gb-menu-overlay{padding:100px 20px 28px;min-height:100dvh}
  .gb .gb-menu-overlay-inner{width:100%}
  .gb .gb-menu-overlay nav{margin:16px 0 28px}
  .gb .gb-menu-overlay nav button{gap:16px;padding:12px 0;font-size:clamp(34px,11vw,48px)}
  .gb .gb-menu-overlay .gb-outline-button{width:100%}

  .gb .gb-hero-image{height:50svh;min-height:360px;max-height:520px}
  .gb .gb-hero-video,.gb .gb-hero-image img{object-position:center center}
  .gb .gb-hero-grid{margin-top:-34px;padding-top:30px;padding-bottom:54px;background:linear-gradient(180deg,transparent 0,var(--gb-ink) 34px)}
  .gb .gb-hero-kicker{margin-bottom:14px}
  .gb .gb-hero-copy h1{max-width:10ch;font-size:clamp(54px,17vw,72px);line-height:.82}
  .gb .gb-hero-copy>p:not(.gb-kicker){max-width:34rem;margin-top:18px;font-size:12px;line-height:1.65}
  .gb .gb-hero-actions{display:grid;grid-template-columns:1fr;margin-top:24px;gap:10px}
  .gb .gb-hero-primary{width:100%;min-height:48px}
  .gb .gb-hero-menu-link{width:100%;min-height:44px;justify-content:center;border:1px solid rgba(242,238,231,.34);padding:0 18px}
  .gb .gb-hero-meta{grid-template-columns:1fr 1fr;gap:14px;margin-top:26px;padding-top:20px;font-size:9px}
  .gb .gb-hero-meta>span{align-items:flex-start;line-height:1.55}
  .gb .gb-hero-meta>span svg{flex:0 0 auto}
  .gb .gb-hero-meta>div{gap:5px}

  .gb .gb-paradise{padding:68px 0 76px}
  .gb .gb-paradise-title h2{font-size:clamp(48px,14vw,60px);line-height:.88}
  .gb .gb-paradise-grid{gap:34px;margin-top:38px}
  .gb .gb-paradise-copy .gb-kicker{max-width:none;font-size:15px!important;line-height:1.45!important}
  .gb .gb-paradise-copy>p:not(.gb-kicker){max-width:none;margin:20px 0 26px;font-size:13px;line-height:1.75}
  .gb .gb-paradise-copy .gb-outline-button{width:100%}
  .gb .gb-paradise-main{height:clamp(330px,108vw,440px)}

  .gb .gb-menu-banner{height:360px}
  .gb .gb-menu-banner h2{font-size:clamp(68px,22vw,94px);line-height:.85;text-align:center}
  .gb .gb-menu-discovery{padding:56px 0 70px}
  .gb .gb-menu-links{padding:8px 0 46px}
  .gb .gb-menu-links>.gb-kicker{margin-bottom:24px}
  .gb .gb-menu-links>button:not(.gb-outline-button){width:100%;min-height:46px;font-size:28px}
  .gb .gb-menu-links .gb-outline-button{width:100%;margin-top:28px}
  .gb .gb-menu-collage-right img,.gb .gb-menu-collage-right .gb-placeholder{height:380px;border-radius:190px 190px 0 0}

  .gb .gb-premium{padding:66px 0 76px}
  .gb .gb-premium-title h2{font-size:clamp(48px,14vw,58px)}
  .gb .gb-premium-title p{font-size:23px;line-height:1.1}
  .gb .gb-premium-track{margin-top:32px}
  .gb .gb-premium-row{gap:14px}
  .gb .gb-premium-media{width:72vw;height:340px;border-radius:170px 170px 0 0}

  .gb .gb-find{padding:68px 0 76px}
  .gb .gb-find-grid{gap:32px}
  .gb .gb-find-copy{gap:26px}
  .gb .gb-find-copy h2{font-size:clamp(48px,14vw,58px);line-height:.88}
  .gb .gb-find-address{font-size:12px!important;margin-bottom:18px!important}
  .gb .gb-find-details .gb-outline-button{width:100%;margin-top:24px}
  .gb .gb-find-map{height:300px}

  .gb .gb-page-hero{padding-top:76px}
  .gb .gb-page-hero-grid{gap:30px;padding-top:50px;padding-bottom:46px}
  .gb .gb-page-hero-copy h1{font-size:clamp(50px,15vw,64px);line-height:.86;margin-top:17px}
  .gb .gb-page-hero-copy>p:not(.gb-kicker){margin-top:20px;font-size:12px;line-height:1.7}
  .gb .gb-page-hero-media{height:340px;border-radius:170px 170px 0 0}
  .gb .gb-page-section{padding:58px 0}
  .gb .gb-section-heading{margin-bottom:38px}
  .gb .gb-section-heading h2{font-size:48px}

  .gb .gb-service-index{gap:44px}
  .gb .gb-service-index button>div,.gb .gb-menu-card-image,.gb .gb-people article>div{height:340px;border-radius:170px 170px 0 0}
  .gb .gb-service-index h2{font-size:35px;margin-top:16px}
  .gb .gb-menu-card-copy{padding-top:16px}
  .gb .gb-menu-card-copy h3{font-size:29px}
  .gb .gb-menu-card-copy p{line-height:1.65}
  .gb .gb-filters{justify-content:flex-start;flex-wrap:nowrap;gap:8px;margin:0 -14px 40px;padding:0 14px 4px;overflow-x:auto;scrollbar-width:none}
  .gb .gb-filters::-webkit-scrollbar{display:none}
  .gb .gb-filters button{flex:0 0 auto;min-height:42px;padding:10px 17px}
  .gb .gb-menu-grid{gap:44px}
  .gb .gb-menu-suggestions,.gb .gb-related-items{margin-top:70px;padding-top:52px}
  .gb .gb-suggestion-heading{margin-bottom:30px}
  .gb .gb-suggestion-heading h2{font-size:44px}
  .gb .gb-suggestion-grid{gap:34px}
  .gb .gb-suggestion-grid button>div{height:300px}

  .gb .gb-item-detail{gap:34px}
  .gb .gb-item-page-section{padding-top:126px}
  .gb .gb-item-back{margin-bottom:20px}
  .gb .gb-item-gallery>.gb-item-main{height:360px;border-radius:180px 180px 0 0}
  .gb .gb-item-gallery>.gb-item-thumbs{gap:6px;margin-top:6px}
  .gb .gb-item-gallery>.gb-item-thumbs button{height:72px}
  .gb .gb-item-copy>.gb-kicker{margin-top:26px}
  .gb .gb-item-copy h2{font-size:52px;margin:14px 0}
  .gb .gb-item-copy>p:not(.gb-kicker){margin:19px 0;font-size:13px;line-height:1.75}
  .gb .gb-item-copy .gb-outline-button{width:100%}

  .gb .gb-about-story{gap:28px}
  .gb .gb-about-story h2{font-size:48px}
  .gb .gb-about-story>div:last-child p{font-size:20px;line-height:1.45}
  .gb .gb-about-gallery{padding:64px 0}
  .gb .gb-about-gallery .gb-frame{grid-template-columns:1fr;gap:14px}
  .gb .gb-about-gallery img,.gb .gb-about-gallery .gb-placeholder{height:330px}
  .gb .gb-about-gallery img:nth-child(2),.gb .gb-about-gallery .gb-placeholder:nth-child(2){height:390px;border-radius:195px 195px 0 0}
  .gb .gb-people h3{font-size:31px}

  .gb .gb-gallery-grid{gap:8px}
  .gb .gb-gallery-grid button,.gb .gb-gallery-grid button:nth-child(n){min-height:200px}
  .gb .gb-reviews article{padding:34px 0}
  .gb .gb-reviews blockquote{font-size:26px;line-height:1.3}
  .gb .gb-review-button{width:calc(100% - 20px);justify-content:center}

  .gb .gb-form-layout,.gb .gb-contact-grid,.gb .gb-careers{gap:36px}
  .gb .gb-form-layout h2,.gb .gb-contact-details h2{font-size:48px}
  .gb .gb-form-panel{padding:28px 20px}
  .gb .gb-form-panel>h2{font-size:38px}
  .gb .gb-careers>div:first-child h2{font-size:46px}
  .gb .gb-job-list>button{min-height:104px;padding:22px 0}
  .gb .gb-job-list h3{font-size:27px}
  .gb .gb-contact-map{height:300px;margin-top:48px}

  .gb .gb-footer{padding-top:66px}
  .gb .gb-footer h2{white-space:normal;font-size:clamp(45px,14vw,58px);line-height:.9}
  .gb .gb-footer-grid{gap:38px 24px;margin-top:40px;padding:42px 0 48px}
  .gb .gb-footer-grid .gb-outline-button{width:100%;padding:0 16px}
  .gb .gb-footer-bottom{gap:14px;padding:20px 0 26px;line-height:1.5}
  .gb .gb-back-to-top{right:14px;bottom:14px;width:44px;height:44px}
  .gb .tp-wrap{width:calc(100% - 20px)}
  .gb .gb-page-section .tp-input{min-height:46px;font-size:16px}
  .gb .gb-page-section textarea.tp-input{min-height:92px}
  .gb .gb-page-section .tp-btn{min-height:46px}
  .gb button,.gb a{-webkit-tap-highlight-color:transparent}
}

@media(max-width:480px){
  .gb .gb-hero-meta{grid-template-columns:1fr;gap:16px}
  .gb .gb-hero-meta>div{padding-left:30px}
  .gb .gb-gallery-grid{grid-template-columns:1fr}
  .gb .gb-gallery-grid button,.gb .gb-gallery-grid button:nth-child(n){min-height:300px}
  .gb .gb-footer-grid{grid-template-columns:1fr}
  .gb .gb-footer-seal .gb-seal{width:104px;height:104px}
  .gb .gb-about-gallery img:nth-child(2),.gb .gb-about-gallery .gb-placeholder:nth-child(2){display:none}
}

@media(max-width:760px) and (max-height:720px){
  .gb .gb-booking-form{padding-top:18px;padding-bottom:16px}
  .gb .gb-booking-heading{margin-bottom:10px}
  .gb .gb-booking-heading>p:not(.gb-kicker){display:none}
  .gb .gb-booking-form h3{font-size:34px;margin:6px 0}
  .gb .gb-booking-form form{row-gap:5px}
  .gb .gb-booking-form .tp-label{margin-bottom:2px;font-size:7px}
  .gb .gb-booking-form .tp-input{min-height:32px;padding:2px}
  .gb .gb-booking-form textarea.tp-input{min-height:38px;max-height:38px}
  .gb .gb-booking-form .tp-btn{min-height:36px}
}

@media(max-height:700px) and (min-width:761px){
  .gb .gb-booking-form{padding-top:28px;padding-bottom:26px}
  .gb .gb-booking-heading{margin-bottom:16px}
  .gb .gb-booking-form h3{font-size:40px;margin:8px 0}
  .gb .gb-booking-form form{row-gap:8px}
  .gb .gb-booking-form .tp-input{min-height:36px;padding:4px 2px}
  .gb .gb-booking-form textarea.tp-input{min-height:46px;max-height:46px}
}
`;
