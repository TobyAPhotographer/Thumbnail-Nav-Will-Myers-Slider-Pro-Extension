<!-- =====================================================================================
   WM Thumbnail Nav + Dynamic Header + Dynamic Footer + Custom Hamburger (Squarespace / Will Myers)
   (fix: no-crop for expanded thumb via configurable borders + bleed; absolute anchoring)
   NEW:
     • mobileDisableThumbnailsOnly — hides just thumbnails on mobile (keeps header/footer features)
     • dynamicFooter — per-slide footer image OR hex color, link/text/icon color, optional logo, optional overlay
     • dynamicHeader/ dynamicFooter — optional overlay via hex + opacity
   ===================================================================================== -->
<script>
(function(){
'use strict';

/* ============================== B1. SETTINGS ===================================== */
const DEFAULTS = {
  debug:false,
  width:80,
  layout:'horizontal', // 'horizontal' | 'vertical'
  aspect:'16:9',       // '16:9' | '1:1' | '9:16'
  timeline:false,      // show 3-slot timeline
  position:'bottom-center', // preset or 'manual'
  anchorMode:'absolute',    // 'absolute' | 'fixed'
  pinMode:false,            // if true, behaves like fixed regardless
  manualPosition:{ top:'auto', bottom:'20px', left:'auto', right:'auto', transform:'none' },

  // Behavior on mobile
  disableOnMobile:false,             // disables EVERYTHING on mobile (legacy)
  mobileDisableThumbnailsOnly:false, // NEW: hides ONLY the thumbnails on mobile (header/footer still work)

  /* NEW: border controls */
  thumbBorder: 2,           // px, non-active border width
  thumbBorderActive: 6,     // px, active/selected border width

  /* Timeline appearance */
  timelineScale: 1.22,      // scale for active thumb in timeline (1.0 = no scale)

  /* Optional custom images for thumbnails */
  customImages:{ enabled:false, images:[] },

  mobileSettings:null,

  /* ===================== Dynamic header (existing, expanded) ===================== */
  dynamicHeader:{
    enabled:false,
    selector:'[data-header-banner], .Header, .site-header, #header',
    images:[],                     // per-slide header image URL
    backgroundColors:[],           // per-slide hex (e.g. "#0a0a0a")
    navTextColors:[],              // fallback nav color
    mobileNavTextColors:[],        // optional override for mobile
    desktopNavTextColors:[],       // optional override for desktop
    mobileHamburgerImages:[],      // can be hex like "#fff" to color burger
    mobileMenuBackgroundColors:[], // bg color/image for mobile menu
    logoImages:[],                 // per-slide logo src override
    transition:'fade',
    duration:'auto',
    type:'background',
    /* NEW: optional overlay/darken on header */
    overlayHex:null,               // e.g. "#000000" or null
    overlayOpacity:0               // 0..1
  },

  /* ====================== Dynamic footer (brand new) ============================= */
  dynamicFooter:{
    enabled:false,
    selector:'[data-footer-banner], .Footer, .site-footer, footer, #footer, footer[role="contentinfo"], .sqs-site-footer',
    images:[],                     // per-slide footer image URL
    backgroundColors:[],           // per-slide hex (e.g. "#111827")
    textColors:[],                 // footer text color
    linkColors:[],                 // footer link color (falls back to textColors[i] if empty)
    iconColors:[],                 // footer icon/svg color (falls back to textColors[i] if empty)
    logoImages:[],                 // override footer logo img
    transition:'fade',
    duration:'auto',
    type:'background',
    /* NEW: optional overlay/darken on footer */
    overlayHex:null,               // e.g. "#000000" or null
    overlayOpacity:0               // 0..1
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

/* Color utils */
const clamp=(v,min,max)=> Math.min(max,Math.max(min,v));
function hexToRgba(hex, alpha=1){
  if(!hex || typeof hex!=='string') return null;
  const h = hex.replace('#','').trim();
  if(!/^[0-9a-fA-F]{3,8}$/.test(h)) return null;
  let r,g,b;
  if(h.length===3){
    r=parseInt(h[0]+h[0],16); g=parseInt(h[1]+h[1],16); b=parseInt(h[2]+h[2],16);
  }else{
    r=parseInt(h.slice(0,2),16); g=parseInt(h.slice(2,4),16); b=parseInt(h.slice(4,6),16);
  }
  const a = clamp(+alpha||0,0,1);
  return `rgba(${r},${g},${b},${a})`;
}

/* Single shared CSS bucket for header + footer */
const STYLE_ID='wm-dynamic-hf-style';
const injectHFCSS=(css)=>{
  const old=document.getElementById(STYLE_ID);
  if(old) old.remove();
  if(!css) return;
  const st=document.createElement('style');
  st.id=STYLE_ID;
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

/* ====================== B5. HEADER/FOOTER TARGETING + HAMBURGER ================== */
function clearHeaderMarks(){
  document.querySelectorAll('[data-wm-banner]').forEach(el=>el.removeAttribute('data-wm-banner'));
  document.querySelectorAll('[data-wm-color-scope]').forEach(el=>el.removeAttribute('data-wm-color-scope'));
}
function clearFooterMarks(){
  document.querySelectorAll('[data-wm-footer]').forEach(el=>el.removeAttribute('data-wm-footer'));
  document.querySelectorAll('[data-wm-footer-color-scope]').forEach(el=>el.removeAttribute('data-wm-footer-color-scope'));
}
function chooseBiggestEl(selectors){
  const c=[];
  selectors.forEach(sel=>{
    document.querySelectorAll(sel).forEach(el=>{
      if(el.matches('.header-nav, .site-navigation')) return;
      c.push(el);
    });
  });
  if(!c.length) return null;
  return c.reduce((a,b)=> (a.getBoundingClientRect().height>=b.getBoundingClientRect().height? a : b));
}
function buildHeaderTargets(){
  const bannerCandidates=['[data-header-banner]','.Header','.site-header','#header','[data-controller="HeaderOverlay"]','header[role="banner"]','header.header'];
  const colorScopeCandidates=['.Header','.site-header','#header','[data-controller="HeaderOverlay"]','header[role="banner"]'];
  return {bannerCandidates, colorScopeCandidates};
}
function buildFooterTargets(){
  const bannerCandidates=['[data-footer-banner]','.Footer','.site-footer','footer','#footer','footer[role="contentinfo"]','.sqs-site-footer'];
  const colorScopeCandidates=['.Footer','.site-footer','footer','#footer','footer[role="contentinfo"]','.sqs-site-footer'];
  return {bannerCandidates, colorScopeCandidates};
}

/* Hamburger (for header) */
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

/* ============================ B6. HEADER + FOOTER CSS ============================ */
function buildHeaderCSS(index){
  const s=getSettings();
  const H=s.dynamicHeader;
  if(!H.enabled){ clearHeaderMarks(); return ''; }

  const {bannerCandidates, colorScopeCandidates}=buildHeaderTargets();

  const img=(H.images||[])[index]||'';
  const bg =(H.backgroundColors||[])[index]||'';

  let nav='';
  if(isMobile && H.mobileNavTextColors?.[index]) nav=H.mobileNavTextColors[index];
  else if(!isMobile && H.desktopNavTextColors?.[index]) nav=H.desktopNavTextColors[index];
  else if(H.navTextColors?.[index]) nav=H.navTextColors[index];

  const logo=(H.logoImages||[])[index]||'';
  const menuBg=(H.mobileMenuBackgroundColors||[])[index]||'';

  let dur=H.duration;
  if(dur==='auto') dur=(swiper&&swiper.params&&swiper.params.speed)? swiper.params.speed : 500;

  clearHeaderMarks();
  const bannerEl=chooseBiggestEl(bannerCandidates);
  if(bannerEl) bannerEl.setAttribute('data-wm-banner','');

  let colorScopeEl=null;
  for(const sel of colorScopeCandidates){
    const el=document.querySelector(sel);
    if(el){ colorScopeEl=el; break; }
  }
  if(!colorScopeEl) colorScopeEl=bannerEl;
  if(colorScopeEl) colorScopeEl.setAttribute('data-wm-color-scope','');

  // If nothing to set, clear and bail
  if(![img,bg,nav,logo,menuBg].some(v=>v&&String(v).trim()) && !(H.overlayHex && H.overlayOpacity>0)){
    return '';
  }

  const parts=[];
  // background image or color
  if(bannerEl && img){
    parts.push(
      `[data-wm-banner]{background-image:url("${img}")!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;transition:background ${dur}ms ease-in-out!important;position:relative!important}`
    );
  }else if(bannerEl && bg){
    parts.push(
      `[data-wm-banner]{background-color:${bg}!important;background-image:none!important;transition:background-color ${dur}ms ease-in-out!important;position:relative!important}`
    );
  }

  // optional overlay
  if((H.overlayHex && H.overlayOpacity>0)){
    const rgba = hexToRgba(H.overlayHex, H.overlayOpacity) || H.overlayHex;
    parts.push(
      `[data-wm-banner]::after{content:"";position:absolute;inset:0;background:${rgba}!important;pointer-events:none}`
    );
  }

  // nav text color
  if(nav){
    parts.push(`
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
}`);
  }

  // header logo override
  if(logo){
    parts.push(
      `[data-wm-color-scope] .header-title-logo img,[data-wm-color-scope] .site-logo img,[data-wm-color-scope] [class*="logo"] img,[data-wm-color-scope] .site-branding img{content:url("${logo}")!important;transition:opacity ${dur}ms ease-in-out!important}`
    );
  }

  // mobile menu background color or image
  if(menuBg){
    const isImg=/^(https?:|data:)|\.(png|jpe?g|gif|webp|svg|avif)$/i.test(menuBg);
    parts.push(
      isImg
      ? `@media (max-width:768px){.header-menu,.header-menu .header-menu-bg,.sqs-mobile-overlay-menu{background-image:url('${menuBg}')!important;background-size:cover!important;background-position:center!important}}`
      : `@media (max-width:768px){.header-menu,.header-menu .header-menu-bg,.sqs-mobile-overlay-menu{background:${menuBg}!important}}`
    );
  }

  return parts.join('\n');
}

function buildFooterCSS(index){
  const s=getSettings();
  const F=s.dynamicFooter;
  if(!F.enabled){ clearFooterMarks(); return ''; }

  const {bannerCandidates, colorScopeCandidates}=buildFooterTargets();

  const img=(F.images||[])[index]||'';
  const bg =(F.backgroundColors||[])[index]||'';
  const text =(F.textColors||[])[index]||'';
  const link =(F.linkColors||[])[index] || text || '';
  const icon =(F.iconColors||[])[index] || text || '';
  const logo =(F.logoImages||[])[index]||'';

  let dur=F.duration;
  if(dur==='auto') dur=(swiper&&swiper.params&&swiper.params.speed)? swiper.params.speed : 500;

  clearFooterMarks();
  const footerEl=chooseBiggestEl(bannerCandidates);
  if(footerEl) footerEl.setAttribute('data-wm-footer','');

  let colorScopeEl=null;
  for(const sel of colorScopeCandidates){
    const el=document.querySelector(sel);
    if(el){ colorScopeEl=el; break; }
  }
  if(!colorScopeEl) colorScopeEl=footerEl;
  if(colorScopeEl) colorScopeEl.setAttribute('data-wm-footer-color-scope','');

  // If nothing to set, clear and bail
  const wantsOverlay = (F.overlayHex && F.overlayOpacity>0);
  if(![img,bg,text,link,icon,logo].some(v=>v&&String(v).trim()) && !wantsOverlay){
    return '';
  }

  const parts=[];
  // background image or color
  if(footerEl && img){
    parts.push(
      `[data-wm-footer]{background-image:url("${img}")!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;transition:background ${dur}ms ease-in-out!important;position:relative!important}`
    );
  }else if(footerEl && bg){
    parts.push(
      `[data-wm-footer]{background-color:${bg}!important;background-image:none!important;transition:background-color ${dur}ms ease-in-out!important;position:relative!important}`
    );
  }

  // optional overlay
  if(wantsOverlay){
    const rgba = hexToRgba(F.overlayHex, F.overlayOpacity) || F.overlayHex;
    parts.push(
      `[data-wm-footer]::after{content:"";position:absolute;inset:0;background:${rgba}!important;pointer-events:none}`
    );
  }

  // text/link/icon colors
  if(text || link || icon){
    const t = text || 'inherit';
    const a = link || t;
    const i = icon || t;
    parts.push(`
[data-wm-footer-color-scope] { color:${t}!important }
[data-wm-footer-color-scope] p,
[data-wm-footer-color-scope] span,
[data-wm-footer-color-scope] h1,
[data-wm-footer-color-scope] h2,
[data-wm-footer-color-scope] h3,
[data-wm-footer-color-scope] h4,
[data-wm-footer-color-scope] h5,
[data-wm-footer-color-scope] h6 { color:${t}!important }
[data-wm-footer-color-scope] a { color:${a}!important }
[data-wm-footer-color-scope] svg, [data-wm-footer-color-scope] svg *, 
[data-wm-footer-color-scope] .social-icons a,
[data-wm-footer-color-scope] .social-icons svg * { color:${i}!important; fill:${i}!important; stroke:${i}!important }`);
  }

  // footer logo override
  if(logo){
    parts.push(
      `[data-wm-footer-color-scope] [class*="logo"] img, [data-wm-footer-color-scope] .footer-logo img{content:url("${logo}")!important;transition:opacity ${dur}ms ease-in-out!important}`
    );
  }

  return parts.join('\n');
}

/* Build & inject combined header+footer CSS for current slide */
function applyHFStyles(index){
  applyHamburgerColor(index); // still header-related

  const hCSS = buildHeaderCSS(index);
  const fCSS = buildFooterCSS(index);
  const combined = [hCSS,fCSS].filter(Boolean).join('\n/* hf-sep */\n');

  if(combined.trim().length){
    injectHFCSS(`/* wm dynamic header/footer (scoped) */\n${combined}`);
  }else{
    injectHFCSS('');
  }
}

/* ============================ B7. THUMBNAILS (build) ============================= */
function createThumbnails(){
  const S=getCurrentSettings();
  if(!S) return false;

  // NEW: hide ONLY thumbnails on mobile, keep header/footer features running
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

  // Pass border widths down as CSS variables so CSS stays declarative
  nav.style.setProperty('--wm-thumb-border', (S.thumbBorder||2) + 'px');
  nav.style.setProperty('--wm-thumb-border-active', (S.thumbBorderActive||6) + 'px');

  const gap=calcGap(S.width), H=calcH(S.width,S.aspect);
  nav.style.gap = gap+'px';

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
      /* Only use "clicked-active" pop outside timeline mode */
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

  // Always keep header/footer synced with current slide
  applyHFStyles(index);

  // NEW: if thumbnails are disabled on mobile, remove any existing nav and stop
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

    // >>> Bleed: account for scale AND the ACTIVE border width set in settings
    const scale = Number(S.timelineScale || 1.0);
    const border = Number(S.thumbBorderActive || 6); // match CSS var --wm-thumb-border-active
    const bleedX = Math.ceil((S.width * (scale - 1)) / 2) + border;
    const bleedY = Math.ceil((H * (scale - 1)) / 2) + border;

    // Baseline padding (protect both sides so borders never clip)
    let padL=border, padR=border, padT=border, padB=border;

    // Directional extra padding grows away from the anchor (keeps panel from “drifting”)
    const c = currentNav ? currentNav.classList : {contains:()=>false};
    if(S.layout==='horizontal'){
      if(c.contains('top-right')||c.contains('bottom-right')||c.contains('middle-right')) padL += bleedX;
      else if(c.contains('top-left')||c.contains('bottom-left')||c.contains('middle-left')) padR += bleedX;
      else { const half=Math.ceil(bleedX/2); padL+=half; padR+=(bleedX-half); }
    }else{
      if(c.contains('bottom-right')||c.contains('bottom-left')||c.contains('bottom-center')) padT += bleedY;
      else if(c.contains('top-right')||c.contains('top-left')||c.contains('top-center')) padB += bleedY;
      else { const half=Math.ceil(bleedY/2); padT+=half; padB+=(bleedY-half); }
      padL += 6; padR += 6; // small LR buffer for vertical stacks
    }

    // Base content area (3 slots)
    const baseW = (S.layout==='horizontal') ? (S.width*3 + gap*2) : S.width;
    const baseH = (S.layout==='horizontal') ? H : (H*3 + gap*2);

    if(currentNav){
      currentNav.style.padding = `${padT}px ${padR}px ${padB}px ${padL}px`;
      currentNav.style.width = (baseW + padL + padR) + 'px';
      currentNav.style.height = (baseH + padT + padB) + 'px';
    }

    // Slot positions relative to the padding box
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
    applyHFStyles(i);
    updateActive(i);
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
    isMobile = detectMobile(); // refresh mobile state
    const S = getCurrentSettings();
    const i = swiper ? (swiper.realIndex ?? swiper.activeIndex ?? 0) : 0;
    const blockThumbs = S && isMobile && S.mobileDisableThumbnailsOnly;

    if (blockThumbs) {
      document.querySelector('.auto-thumbnail-nav')?.remove();
      currentNav = null;
    } else {
      if (!document.querySelector('.auto-thumbnail-nav')) {
        createThumbnails(); // rebuild when returning to desktop / larger screens
      }
    }

    applyHFStyles(i);
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
</script>
