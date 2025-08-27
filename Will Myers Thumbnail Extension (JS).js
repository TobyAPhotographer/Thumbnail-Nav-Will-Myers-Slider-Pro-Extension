
/* =====================================================================================
   WM Thumbnail Nav + Dynamic Header + Dynamic Footer + Custom Hamburger
   (Squarespace / Will Myers)
   - No-crop thumbs via borders + bleed
   - Absolute anchoring presets OR manual coordinates
   - mobileDisableThumbnailsOnly: hide only thumbnails on mobile (keep header/footer)
   - Header + Footer: per-slide color OR image URL (auto-detect)
   ===================================================================================== */

(function(){
'use strict';

/* ============================== B1. SETTINGS ===================================== */
const DEFAULTS = {
  debug:false,
  width:80,
  layout:'horizontal',       // 'horizontal' | 'vertical'
  aspect:'16:9',             // '16:9' | '1:1' | '9:16'
  timeline:false,            // show 3-slot timeline
  position:'bottom-center',  // presets: top/bottom/middle + left/center/right OR 'manual'
  anchorMode:'absolute',     // 'absolute' | 'fixed'
  pinMode:false,             // if true, behaves like fixed regardless
  manualPosition:{ top:'auto', bottom:'20px', left:'auto', right:'auto', transform:'none' },

  // Behavior on mobile
  disableOnMobile:false,             // disables EVERYTHING on mobile (legacy)
  mobileDisableThumbnailsOnly:false, // hides ONLY the thumbnails on mobile (header/footer still run)

  /* Border controls (thumbs) */
  thumbBorder: 2,           // px, non-active border width
  thumbBorderActive: 6,     // px, active/selected border width

  /* Timeline appearance */
  timelineScale: 1.22,      // scale for active thumb in timeline (1.0 = no scale)

  /* Optional custom images for thumbnails */
  customImages:{ enabled:false, images:[] },

  /* Mobile-specific overrides */
  mobileSettings:null,

  /* Dynamic HEADER */
  dynamicHeader:{
    enabled:false,
    selector:'[data-header-banner], .Header, .site-header, #header',
    images:[],                     // accepts color or image URL per slide
    backgroundColors:[],           // optional fallback if images[] entry is empty
    navTextColors:[],
    mobileNavTextColors:[],
    desktopNavTextColors:[],
    mobileHamburgerImages:[],      // color/URL for burger lines
    mobileMenuBackgroundColors:[], // color or image for mobile menu background
    logoImages:[],                 // optional per-slide logo swap
    transition:'fade',
    duration:'auto',               // uses swiper speed if 'auto'
    type:'background'
  },

  /* Dynamic FOOTER */
  dynamicFooter:{
    enabled:false,
    selector:'footer, .Footer, .site-footer, [data-controller="SiteFooter"]',
    images:[],                     // accepts color or image URL per slide
    backgroundColors:[],           // optional fallback if images[] entry is empty
    textColors:[],                 // footer text/link/icon color per slide
    logoImages:[],                 // optional footer logo swap
    transition:'fade',
    duration:'auto',
    type:'background'
  }
};

/* ========================== B2. STATE & UTILITIES ================================ */
let swiper=null, isMobile=window.innerWidth<=768, currentNav=null, slidesCache=null, sectionCache=null;
const detectMobile=()=> window.innerWidth<=768;
const deepMerge=(t,s)=>{ Object.keys(s).forEach(k=>{ if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k])) t[k]=deepMerge({...(t[k]||{})},s[k]); else t[k]=s[k]; }); return t; };
const getSettings=()=> deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), window.thumbnailSettings||{});
const getCurrentSettings=()=>{
  const base=getSettings();
  isMobile=detectMobile();
  if(isMobile && base.disableOnMobile) return null; // legacy: disable everything
  // Apply mobile overrides if present
  return (!isMobile||!base.mobileSettings)? base : deepMerge(JSON.parse(JSON.stringify(base)), base.mobileSettings);
};

/* Color & URL detection */
const COLOR_RX = /^#([0-9a-f]{3,8})$/i;
function looksLikeColor(v){
  if(!v) return false;
  const s=String(v).trim();
  if(COLOR_RX.test(s)) return true;
  if(/^rgba?\(/i.test(s)) return true;
  if(/^hsla?\(/i.test(s)) return true;
  if(/^(oklch|oklab|lab|lch|color)\(/i.test(s)) return true;
  if(['transparent','currentColor','black','white'].includes(s.toLowerCase())) return true;
  return false;
}
function looksLikeImageURL(v){
  if(!v) return false;
  const s=String(v).trim();
  if(/^data:image\//i.test(s)) return true;
  if(/^https?:\/\//i.test(s)) return true;
  if(/\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(s)) return true;
  return false;
}

/* Dynamic header/footer CSS buckets */
const STYLE_ID='wm-dynamic-header-style';
const FOOTER_STYLE_ID='wm-dynamic-footer-style';
const injectHeaderCSS=css=>{
  const old=document.getElementById(STYLE_ID);
  if(old) old.remove();
  if(!css) return;
  const st=document.createElement('style');
  st.id=STYLE_ID;
  st.textContent=css;
  document.head.appendChild(st);
};
const injectFooterCSS=css=>{
  const old=document.getElementById(FOOTER_STYLE_ID);
  if(old) old.remove();
  if(!css) return;
  const st=document.createElement('style');
  st.id=FOOTER_STYLE_ID;
  st.textContent=css;
  document.head.appendChild(st);
};

/* ====================== B3. SWIPER / SECTION DISCOVERY =========================== */
function findSwiper(){
  try{
    if(window.Swiper){
      if(window.Swiper.instances && window.Swiper.instances.length){
        swiper=window.Swiper.instances[window.Swiper.instances.length-1];
        return true;
      }
      const els=document.querySelectorAll('.swiper, .swiper-container, [class*="swiper"]');
      for(const el of els){
        if(el.swiper){ swiper=el.swiper; return true; }
      }
    }
  }catch(e){}
  return false;
}
function findSection(){
  const candidates=document.querySelectorAll([
    '[data-wm-plugin*="slider"]','[data-wm-plugin*="will"]','[data-wm-plugin*="slider-pro"]',
    '.wm-slider-pro','.wms-slider','.gallery-strips','.user-items-list','.sqs-gallery','.swiper','section'
  ].join(','));
  for(const s of candidates){
    const slides=s.querySelectorAll([
      '.swiper-slide','.user-items-list-item-container','.gallery-strips-item',
      '.sqs-gallery-design-carousel .slide','.sqs-gallery .slide','[data-slide-index]'
    ].join(','));
    if(slides.length>1){ sectionCache=s; slidesCache=slides; return s; }
  }
  return null;
}
const calcGap=w=> Math.max(8, Math.round(w*0.10));
const calcH=(w,a)=> a==='1:1'? w : a==='9:16'? Math.round(w*1.778) : Math.round(w*0.5625);

/* ======================= B4. IMAGE EXTRACTION (thumbs) ========================== */
function extractImage(slide){
  try{
    const bg=getComputedStyle(slide).backgroundImage;
    if(bg&&bg!=='none') return bg;
    const img=slide.querySelector('img');
    if(img){
      const src=img.currentSrc||img.src||img.dataset.src||img.dataset.originalSrc;
      if(src) return `url("${src}")`;
    }
    const pic=slide.querySelector('picture img');
    if(pic&&pic.currentSrc) return `url("${pic.currentSrc}")`;
    const data=slide.dataset.image||slide.dataset.bg||slide.dataset.background;
    if(data) return `url("${data}")`;
    const nested=slide.querySelectorAll('img,[style*="background-image"]');
    for(const el of nested){
      if(el.tagName==='IMG'&&el.currentSrc) return `url("${el.currentSrc}")`;
      const nbg=getComputedStyle(el).backgroundImage;
      if(nbg&&nbg!=='none') return nbg;
    }
  }catch(e){}
  return 'none';
}

/* ====================== B5. HEADER/FOOTER TARGETS & HAMBURGER =================== */
function clearBannerMarks(){
  document.querySelectorAll('[data-wm-banner]').forEach(el=>el.removeAttribute('data-wm-banner'));
  document.querySelectorAll('[data-wm-color-scope]').forEach(el=>el.removeAttribute('data-wm-color-scope'));
}
function chooseBannerEl(selectors){
  const c=[];
  (Array.isArray(selectors)?selectors:[selectors]).forEach(sel=>{
    document.querySelectorAll(sel).forEach(el=>{
      if(el.matches('.header-nav, .site-navigation')) return;
      c.push(el);
    });
  });
  if(!c.length) return null;
  return c.reduce((a,b)=> (a.getBoundingClientRect().height>=b.getBoundingClientRect().height? a : b));
}
function buildTargets(){
  const bannerCandidates=['[data-header-banner]','.Header','.site-header','#header','[data-controller="HeaderOverlay"]','header[role="banner"]','header.header'];
  const colorScopeCandidates=['.Header','.site-header','#header','[data-controller="HeaderOverlay"]','header[role="banner"]'];
  return {bannerCandidates, colorScopeCandidates};
}

/* Footer marks */
function clearFooterMarks(){
  document.querySelectorAll('[data-wm-footer]').forEach(el=>el.removeAttribute('data-wm-footer'));
  document.querySelectorAll('[data-wm-footer-color-scope]').forEach(el=>el.removeAttribute('data-wm-footer-color-scope'));
}
function chooseFooterEl(selectors){
  const c=[];
  (Array.isArray(selectors)?selectors:[selectors]).forEach(sel=>{
    document.querySelectorAll(sel).forEach(el=>c.push(el));
  });
  if(!c.length) return null;
  return c.reduce((a,b)=> (a.getBoundingClientRect().height>=b.getBoundingClientRect().height? a : b));
}

/* Hamburger helpers */
function flagHamburgerButtons(root=document){
  const sel=['.burger','.header-burger','[class*="burger"]','.mobile-nav-toggle','.sqs-mobile-menu-toggle','.header-menu-toggle','.header-actions .header-menu-toggle','button[aria-controls*="header"]','[data-action="toggle-mobile-menu"]'].join(',');
  root.querySelectorAll(sel).forEach(btn=>{
    if(!btn.hasAttribute('data-wm-hamburger')) btn.setAttribute('data-wm-hamburger','');
    if(!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded','false');
    btn.setAttribute('role','button');
    btn.setAttribute('tabindex','0');
    btn.setAttribute('aria-label','Toggle menu');
  });
}
function observeHeaderForBurger(){
  const header=document.querySelector('.Header, .site-header, #header, [data-controller="HeaderOverlay"], header[role="banner"]')||document.body;
  const mo=new MutationObserver(()=> flagHamburgerButtons(header));
  mo.observe(header,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
}
function isMenuOpen(){
  return !!(document.body.classList.contains('header--menu-open') || document.querySelector('.sqs-mobile-overlay-menu[aria-hidden="false"], .header-menu[aria-hidden="false"]'));
}
function applyHamburgerColor(index){
  const s=getSettings();
  const raw=(s.dynamicHeader.mobileHamburgerImages||[])[index]||'';
  const color=(raw&&String(raw).trim())||'#fff';
  document.documentElement.style.setProperty('--wm-burger', color);
  flagHamburgerButtons();
  document.querySelectorAll('[data-wm-hamburger]').forEach(btn=>{
    btn.style.setProperty('--wm-burger', color);
    if(!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded','false');
  });
}
function syncHamburgerOpenState(){
  const setOpen=open=>{
    document.querySelectorAll('[data-wm-hamburger]').forEach(b=>{
      b.classList.toggle('is-open', open);
      b.setAttribute('aria-expanded', String(open));
    });
  };
  const mo=new MutationObserver(()=> setOpen(isMenuOpen()));
  mo.observe(document.body,{attributes:true,attributeFilter:['class']});
}

/* ============================ B6. DYNAMIC HEADER ================================= */
function updateHeader(index){
  const s=getSettings();
  applyHamburgerColor(index);

  if(!s.dynamicHeader.enabled){
    injectHeaderCSS('');
    clearBannerMarks();
    return;
  }

  const {bannerCandidates, colorScopeCandidates}=buildTargets();

  // Unified source: color or URL (fallback to backgroundColors if empty)
  const src=(s.dynamicHeader.images||[])[index]||'';
  const bgFallback=(s.dynamicHeader.backgroundColors||[])[index]||'';

  let nav='';
  if(isMobile && s.dynamicHeader.mobileNavTextColors?.[index]) nav=s.dynamicHeader.mobileNavTextColors[index];
  else if(!isMobile && s.dynamicHeader.desktopNavTextColors?.[index]) nav=s.dynamicHeader.desktopNavTextColors[index];
  else if(s.dynamicHeader.navTextColors?.[index]) nav=s.dynamicHeader.navTextColors[index];

  const logo=(s.dynamicHeader.logoImages||[])[index]||'';
  const menuBg=(s.dynamicHeader.mobileMenuBackgroundColors||[])[index]||'';

  const bannerColor = looksLikeColor(src) ? src : (bgFallback || '');
  const bannerImage = looksLikeImageURL(src) ? src : '';

  if(![bannerColor,bannerImage,nav,logo,menuBg].some(v=>v&&String(v).trim())){
    injectHeaderCSS('');
    clearBannerMarks();
    return;
  }

  let dur=s.dynamicHeader.duration;
  if(dur==='auto') dur=(swiper&&swiper.params&&swiper.params.speed)? swiper.params.speed : 500;

  clearBannerMarks();
  const bannerEl=chooseBannerEl(s.dynamicHeader.selector || ['[data-header-banner]','.Header','.site-header','#header']);
  if(bannerEl) bannerEl.setAttribute('data-wm-banner','');

  let colorScopeEl=null;
  const scopes=['.Header','.site-header','#header','[data-controller="HeaderOverlay"]','header[role="banner"]'];
  for(const sel of scopes){
    const el=document.querySelector(sel);
    if(el){ colorScopeEl=el; break; }
  }
  if(!colorScopeEl) colorScopeEl=bannerEl;
  if(colorScopeEl) colorScopeEl.setAttribute('data-wm-color-scope','');

  let css='/* wm dynamic header (scoped, color-or-image) */\n';
  if(bannerEl){
    if(bannerImage){
      css+=`[data-wm-banner]{background-image:url("${bannerImage}")!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;transition:background ${dur}ms ease-in-out, background-color ${dur}ms ease-in-out!important}\n`;
    }else if(bannerColor){
      css+=`[data-wm-banner]{background-color:${bannerColor}!important;background-image:none!important;transition:background-color ${dur}ms ease-in-out!important}\n`;
    }
  }
  if(nav){
    css+=`
[data-wm-color-scope]{--header-text-color:${nav}!important}
[data-wm-color-scope] .header-nav-list a,
[data-wm-color-scope] .site-navigation a,
[data-wm-color-scope] .header-actions a,
[data-wm-color-scope] .header-burger,
[data-wm-color-scope] .header-actions svg,
[data-wm-color-scope] .header-burger svg{color:${nav}!important;fill:${nav}!important;stroke:${nav}!important}
[data-wm-color-scope] .swiper-button-prev, [data-wm-color-scope] .swiper-button-next,
[data-wm-color-scope] .swiper-button-prev *, [data-wm-color-scope] .swiper-button-next *,
[data-wm-color-scope] .wm-arrow, [data-wm-color-scope] .wm-arrow *{color:unset!important;fill:unset!important;stroke:unset!important}
@media (max-width:768px){
  .header-menu a,.header-menu .nav-wrapper a,.sqs-mobile-overlay-menu a,.sqs-mobile-overlay-menu .nav-wrapper a{color:${nav}!important;fill:${nav}!important;stroke:${nav}!important}
  .header-menu .social-icons a,.sqs-mobile-overlay-menu .social-icons a,
  .header-menu .social-icons svg *,.sqs-mobile-overlay-menu .social-icons svg *{color:${nav}!important;fill:${nav}!important;stroke:${nav}!important}
}
`;
  }
  if(logo){
    css+=`[data-wm-color-scope] .header-title-logo img,[data-wm-color-scope] .site-logo img,[data-wm-color-scope] [class*="logo"] img,[data-wm-color-scope] .site-branding img{content:url("${logo}")!important;transition:opacity ${dur}ms ease-in-out!important}\n`;
  }
  if(menuBg){
    const isImg=/^(https?:|data:)|\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(menuBg);
    css+= isImg
      ? `@media (max-width:768px){.header-menu,.header-menu .header-menu-bg,.sqs-mobile-overlay-menu{background-image:url('${menuBg}')!important;background-size:cover!important;background-position:center!important}}\n`
      : `@media (max-width:768px){.header-menu,.header-menu .header-menu-bg,.sqs-mobile-overlay-menu{background:${menuBg}!important}}\n`;
  }
  injectHeaderCSS(css);
}

/* ============================ B6b. DYNAMIC FOOTER ================================ */
function updateFooter(index){
  const s=getSettings();
  if(!s.dynamicFooter?.enabled){
    injectFooterCSS('');
    clearFooterMarks();
    return;
  }

  const src = (s.dynamicFooter.images||[])[index] || '';
  const bgFallback = (s.dynamicFooter.backgroundColors||[])[index] || '';
  const text = (s.dynamicFooter.textColors||[])[index] || '';
  const logo = (s.dynamicFooter.logoImages||[])[index] || '';

  const bannerColor = looksLikeColor(src) ? src : (bgFallback || '');
  const bannerImage = looksLikeImageURL(src) ? src : '';

  if(![bannerColor,bannerImage,text,logo].some(v=>v&&String(v).trim())){
    injectFooterCSS('');
    clearFooterMarks();
    return;
  }

  let dur=s.dynamicFooter.duration;
  if(dur==='auto') dur=(swiper&&swiper.params&&swiper.params.speed)? swiper.params.speed : 500;

  clearFooterMarks();
  const footerEl = chooseFooterEl(s.dynamicFooter.selector || 'footer, .Footer, .site-footer, [data-controller="SiteFooter"]');
  if(footerEl) footerEl.setAttribute('data-wm-footer','');
  if(footerEl) footerEl.setAttribute('data-wm-footer-color-scope','');

  let css='/* wm dynamic footer (scoped, color-or-image) */\n';
  if(footerEl){
    if(bannerImage){
      css+=`[data-wm-footer]{background-image:url("${bannerImage}")!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;transition:background ${dur}ms ease-in-out, background-color ${dur}ms ease-in-out!important}\n`;
    }else if(bannerColor){
      css+=`[data-wm-footer]{background-color:${bannerColor}!important;background-image:none!important;transition:background-color ${dur}ms ease-in-out!important}\n`;
    }
  }
  if(text){
    css+=`
[data-wm-footer-color-scope]{--footer-text:${text}!important}
[data-wm-footer-color-scope],
[data-wm-footer-color-scope] a,
[data-wm-footer-color-scope] .sqs-block-content,
[data-wm-footer-color-scope] svg *,
[data-wm-footer-color-scope] .social-icons a{
  color:${text}!important; fill:${text}!important; stroke:${text}!important;
}
`;
  }
  if(logo){
    css+=`[data-wm-footer-color-scope] .footer-logo img,[data-wm-footer-color-scope] [class*="footer"] [class*="logo"] img{content:url("${logo}")!important;transition:opacity ${dur}ms ease-in-out!important}\n`;
  }

  injectFooterCSS(css);
}

/* ============================ B7. THUMBNAILS (build) ============================= */
function createThumbnails(){
  const S=getCurrentSettings();
  if(!S) return false;

  // Hide ONLY thumbnails on mobile, keep header/footer features
  if (isMobile && S.mobileDisableThumbnailsOnly) {
    document.querySelector('.auto-thumbnail-nav')?.remove();
    currentNav = null;
    return false;
  }

  const section=sectionCache||findSection();
  if(!section) return false;

  const slides=slidesCache||section.querySelectorAll('.swiper-slide, .user-items-list-item-container, .gallery-strips-item, .sqs-gallery .slide, .sqs-gallery-design-carousel .slide, [data-slide-index]');
  if(!slides||slides.length<2) return false;

  section.querySelector('.auto-thumbnail-nav')?.remove();

  const nav=document.createElement('div');
  nav.className=`auto-thumbnail-nav ${S.layout}`;
  if(S.timeline) nav.classList.add('timeline-mode');

  // Anchor decision (absolute by default; fixed only if explicitly requested)
  const useFixed = (S.pinMode === true) || (S.anchorMode === 'fixed');
  nav.style.position = useFixed ? 'fixed' : 'absolute';
  nav.classList.toggle('pin-mode', useFixed);

  if (S.position === 'manual'){
    Object.assign(nav.style, S.manualPosition);
  } else {
    nav.classList.add(S.position);
  }

  // Pass border widths to CSS variables
  nav.style.setProperty('--wm-thumb-border', (S.thumbBorder||2) + 'px');
  nav.style.setProperty('--wm-thumb-border-active', (S.thumbBorderActive||6) + 'px');

  const gap=calcGap(S.width), H=calcH(S.width,S.aspect);
  nav.style.setProperty('--wm-gap', gap+'px');

  // Non-timeline: ensure clean row/column via inline flex (safety net)
  if(!S.timeline){
    nav.style.display='flex';
    nav.style.alignItems='center';
    if(S.layout==='horizontal'){
      nav.style.flexDirection='row';
      nav.style.gap=gap+'px';
      nav.style.justifyContent='center';
    }else{
      nav.style.flexDirection='column';
      nav.style.gap=gap+'px';
      nav.style.justifyContent='center';
    }
  }

  // Timeline container sizing
  if(S.timeline){
    if(S.layout==='horizontal'){
      nav.style.width=(S.width*3 + gap*2)+'px';
      nav.style.height=H+'px';
    } else {
      nav.style.width=S.width+'px';
      nav.style.height=(H*3 + gap*2)+'px';
    }
    if(!useFixed){
      const cs=getComputedStyle(section);
      if(cs.position==='static'||cs.position==='') section.style.position='relative';
    }
  }

  const getImg=i => (S.customImages?.enabled && S.customImages.images?.[i] && String(S.customImages.images[i]).trim())
    ? `url("${S.customImages.images[i]}")`
    : extractImage(slides[i]);

  for(let i=0;i<slides.length;i++){
    const t=document.createElement('div');
    t.className='auto-slide-thumbnail';
    t.dataset.slideIndex=i;
    t.style.width=S.width+'px';
    t.style.height=calcH(S.width,S.aspect)+'px';

    const bg=getImg(i);
    if(bg && bg!=='none') t.style.backgroundImage=bg;
    else {
      t.style.backgroundColor='#ddd';
      t.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:12px;color:#666;">${i+1}</div>`;
    }

    t.addEventListener('click', ()=>{
      if (!S.timeline) {
        document.querySelectorAll('.auto-slide-thumbnail').forEach(x=>x.classList.remove('clicked-active'));
        t.classList.add('clicked-active');
      }
      if(swiper){
        if(swiper.slideToLoop) swiper.slideToLoop(i);
        else if(swiper.slideTo) swiper.slideTo(i);
      } else {
        updateActive(i);
      }
    });

    t.addEventListener('mouseenter', ()=>{
      if (!S.timeline) {
        document.querySelectorAll('.auto-slide-thumbnail').forEach(x=>{
          if(x!==t) x.classList.remove('clicked-active');
        });
      }
    });

    nav.appendChild(t);
  }

  (useFixed ? document.body : section).appendChild(nav);
  currentNav=nav;

  const start=swiper ? (swiper.realIndex ?? swiper.activeIndex ?? 0) : 0;
  updateActive(start);
  return true;
}

/* ==================== B8. ACTIVE + TIMELINE LAYOUT (with bleed) ================== */
function updateActive(index){
  const S=getCurrentSettings();
  updateHeader(index);
  updateFooter(index); // keep footer in sync

  // If thumbnails are disabled on mobile, remove and stop
  if (S && isMobile && S.mobileDisableThumbnailsOnly) {
    document.querySelector('.auto-thumbnail-nav')?.remove();
    currentNav = null;
    return;
  }

  const thumbs=Array.from(document.querySelectorAll('.auto-slide-thumbnail'));
  const total=thumbs.length;
  if(!S||!total) return;

  if(S.timeline && total>3){
    const gap=calcGap(S.width), H=calcH(S.width,S.aspect);
    const visible=[0,1,2].map(o=>(index+o)%total);

    const scale = Number(S.timelineScale || 1.0);
    const border = Number(S.thumbBorderActive || 6);
    const bleedX = Math.ceil((S.width * (scale - 1)) / 2) + border;
    const bleedY = Math.ceil((H * (scale - 1)) / 2) + border;

    let padL=border, padR=border, padT=border, padB=border;
    const c = currentNav ? currentNav.classList : {contains:()=>false};

    if(S.layout==='horizontal'){
      if(c.contains('top-right')||c.contains('bottom-right')||c.contains('middle-right')) padL += bleedX;
      else if(c.contains('top-left')||c.contains('bottom-left')||c.contains('middle-left')) padR += bleedX;
      else { const half=Math.ceil(bleedX/2); padL+=half; padR+=(bleedX-half); }
    }else{
      if(c.contains('bottom-right')||c.contains('bottom-left')||c.contains('bottom-center')) padT += bleedY;
      else if(c.contains('top-right')||c.contains('top-left')||c.contains('top-center')) padB += bleedY;
      else { const half=Math.ceil(bleedY/2); padT+=half; padB+=(bleedY-half); }
      padL += 6; padR += 6;
    }

    const baseW = (S.layout==='horizontal') ? (S.width*3 + gap*2) : S.width;
    const baseH = (S.layout==='horizontal') ? H : (H*3 + gap*2);

    if(currentNav){
      currentNav.style.padding = `${padT}px ${padR}px ${padB}px ${padL}px`;
      currentNav.style.width = (baseW + padL + padR) + 'px';
      currentNav.style.height = (baseH + padT + padB) + 'px';
    }

    const slots = (S.layout==='horizontal') ? [
      {left:(0*(S.width+gap)) + 'px', top:'0px'},
      {left:(1*(S.width+gap)) + 'px', top:'0px'},
      {left:(2*(S.width+gap)) + 'px', top:'0px'}
    ] : [
      {left:'0px', top:(0*(H+gap)) + 'px'},
      {left:'0px', top:(1*(H+gap)) + 'px'},
      {left:'0px', top:(2*(H+gap)) + 'px'}
    ];

    thumbs.forEach((t,i)=>{
      const pos=visible.indexOf(i), active=(i===index);
      t.style.position='absolute';
      t.style.transition='all .45s cubic-bezier(.4,0,.2,1), opacity .35s ease, transform .45s ease';
      if(pos>-1){
        t.classList.remove('wm-hidden');
        t.style.left = slots[pos].left;
        t.style.top = slots[pos].top;
        t.classList.toggle('active', active);
        t.style.opacity = active ? '1' : '.88';
        t.style.transform = active ? `scale(${scale})` : 'scale(1)';
        t.style.zIndex = active ? '10' : '1';
        t.style.pointerEvents='auto';
        t.style.visibility='visible';
      }else{
        if(S.layout==='horizontal'){ t.style.left='-9999px'; t.style.top='0px'; }
        else { t.style.left='0px'; t.style.top='-9999px'; }
        t.classList.remove('active');
        t.classList.add('wm-hidden');
        t.style.opacity='0';
        t.style.transform='scale(.9)';
        t.style.zIndex='0';
        t.style.pointerEvents='none';
        t.style.visibility='hidden';
      }
    });

  }else{
    // Non-timeline layout
    thumbs.forEach((t,i)=>{
      t.classList.remove('wm-hidden');
      t.style.position='relative';
      t.style.left='auto';
      t.style.top='auto';
      t.style.opacity='1';
      t.style.transform='scale(1)';
      t.style.zIndex='1';
      t.style.pointerEvents='auto';
      t.style.visibility='visible';
      t.classList.toggle('active', i===index);
    });
  }
}

/* ============================== B9. EVENTS & INIT =============================== */
function bindSwiperEvents(){
  if(!swiper||!swiper.on) return;
  const idx=()=> (swiper.realIndex!==undefined? swiper.realIndex : (swiper.activeIndex||0));
  swiper.on('slideChange', ()=> updateActive(idx()));
  swiper.on('slideChangeTransitionStart', ()=> updateActive(idx()));
  swiper.on('slideChangeTransitionEnd', ()=> updateActive(idx()));
  swiper.on('touchEnd', ()=> setTimeout(()=>updateActive(idx()), 90));
}
function safeInitCycle(){
  try{
    findSwiper();
    const made=createThumbnails(); // may be false on mobile if thumbnails are disabled
    bindSwiperEvents();
    const i=swiper ? (swiper.realIndex ?? swiper.activeIndex ?? 0) : 0;
    updateHeader(i);
    updateFooter(i);
    updateActive(i); // header/footer update even if thumbs are disabled
  }catch(e){}
}
function watchForSlides(){
  const mo=new MutationObserver(()=>{
    const sec=findSection();
    if(sec){ mo.disconnect(); safeInitCycle(); }
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
  safeInitCycle();
}
function handleResize(){
  try{
    isMobile = detectMobile();
    const S = getCurrentSettings();
    const i = swiper ? (swiper.realIndex ?? swiper.activeIndex ?? 0) : 0;
    const blockThumbs = S && isMobile && S.mobileDisableThumbnailsOnly;

    if (blockThumbs) {
      document.querySelector('.auto-thumbnail-nav')?.remove();
      currentNav = null;
    } else if (!document.querySelector('.auto-thumbnail-nav')) {
      createThumbnails(); // rebuild when returning to desktop / bigger view
    }

    updateHeader(i);
    updateFooter(i);
    updateActive(i);
  }catch(e){}
}

window.addEventListener('resize', ()=>{
  clearTimeout(window.__wm_rT);
  window.__wm_rT=setTimeout(handleResize,250);
});
document.addEventListener('DOMContentLoaded', ()=>{
  observeHeaderForBurger();
  syncHamburgerOpenState();
  watchForSlides();
});
})();
