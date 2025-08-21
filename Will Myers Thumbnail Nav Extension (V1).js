<style>
/* =============================================================================
   THUMBNAIL NAVIGATION STYLES
   ============================================================================= */

.auto-thumbnail-nav {
    position: absolute;
    display: flex;
    z-index: 1000;
}

.auto-thumbnail-nav.pin-mode {
    position: fixed;
    z-index: 10000;
}

/* Layout Directions */
.auto-thumbnail-nav.horizontal {
    flex-direction: row;
    flex-wrap: wrap;
}

.auto-thumbnail-nav.vertical {
    flex-direction: column;
    flex-wrap: nowrap;
}

/* Mobile Responsive Styles - Dynamic based on settings */
.auto-thumbnail-nav.mobile-mode {
    /* Mobile styles will be applied dynamically via JavaScript */
}

/* Position Presets */
.auto-thumbnail-nav.bottom-center {
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
}

.auto-thumbnail-nav.bottom-left {
    bottom: 40px;
    left: 40px;
}

.auto-thumbnail-nav.bottom-right {
    bottom: 40px;
    right: 40px;
}

.auto-thumbnail-nav.top-center {
    top: 40px;
    left: 50%;
    transform: translateX(-50%);
}

.auto-thumbnail-nav.top-left {
    top: 40px;
    left: 40px;
}

.auto-thumbnail-nav.top-right {
    top: 40px;
    right: 40px;
}

.auto-thumbnail-nav.middle-left {
    top: 50%;
    left: 40px;
    transform: translateY(-50%);
}

.auto-thumbnail-nav.middle-right {
    top: 50%;
    right: 40px;
    transform: translateY(-50%);
}

.auto-thumbnail-nav.middle-center {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

/* Thumbnail Item Styles */
.auto-slide-thumbnail {
    background-size: cover;
    background-position: center;
    border-radius: 6px;
    cursor: pointer;
    opacity: 0.6;
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) !important;
    border: 2px solid transparent;
    flex-shrink: 0;
    transform: scale(1) !important;
    z-index: 1;
    position: relative !important;
}

.auto-slide-thumbnail:hover {
    opacity: 0.9 !important;
    transform: scale(1.15) !important;
    z-index: 5 !important;
    border: 2px solid rgba(255, 255, 255, 0.7) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
}

.auto-slide-thumbnail.active {
    opacity: 1 !important;
    border: 3px solid #fff !important;
}

.auto-slide-thumbnail.clicked-active {
    transform: scale(1.15) !important;
    z-index: 5 !important;
    opacity: 1 !important;
    border: 3px solid #fff !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

.auto-slide-thumbnail.clicked-active:hover {
    transform: scale(1.2) !important;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5) !important;
}

/* =============================================================================
   DYNAMIC HEADER STYLES
   ============================================================================= */

.dynamic-header-transition {
    transition-property: opacity, transform;
    transition-timing-function: ease-in-out;
}

.dynamic-header-fade-out {
    opacity: 0;
}

.dynamic-header-fade-in {
    opacity: 1;
}

.dynamic-header-slide-out {
    transform: translateX(-20px);
    opacity: 0;
}

.dynamic-header-slide-in {
    transform: translateX(0);
    opacity: 1;
}

.dynamic-header-scale-out {
    transform: scale(0.8);
    opacity: 0;
}

.dynamic-header-scale-in {
    transform: scale(1);
    opacity: 1;
}
</style>

<script>
(function() {
    'use strict';
    
    /* =============================================================================
       GLOBAL VARIABLES AND INITIALIZATION
       ============================================================================= */
    
    console.log('Thumbnail Debug: Script started');
    
    let willMyersSwiper = null;
    let currentHeaderElement = null;
    let headerTransitionInProgress = false;
    let isMobile = false;
    let currentThumbnailNav = null;
    
    /* =============================================================================
       MOBILE DETECTION AND SETTINGS
       ============================================================================= */
    
    /**
     * Detect if device is mobile based on screen width
     */
    function detectMobile() {
        return window.innerWidth <= 768;
    }
    
    /**
     * Get settings with mobile overrides applied if on mobile device
     */
    function getCurrentSettings() {
        const baseSettings = getSettings();
        isMobile = detectMobile();
        
        // Check if thumbnails should be disabled on mobile
        if (isMobile && baseSettings.disableOnMobile) {
            console.log('Thumbnail Debug: Thumbnails disabled on mobile');
            return null;
        }
        
        if (!isMobile || !baseSettings.mobileSettings) {
            return baseSettings;
        }
        
        console.log('Thumbnail Debug: Applying mobile settings');
        
        // Create merged settings with mobile overrides
        const mobileSettings = { ...baseSettings };
        
        // Apply mobile overrides
        Object.keys(baseSettings.mobileSettings).forEach(key => {
            if (typeof baseSettings.mobileSettings[key] === 'object' && 
                baseSettings.mobileSettings[key] !== null && 
                !Array.isArray(baseSettings.mobileSettings[key])) {
                // Deep merge objects like customImages, manualPosition
                mobileSettings[key] = { ...baseSettings[key], ...baseSettings.mobileSettings[key] };
            } else {
                // Direct assignment for primitives and arrays
                mobileSettings[key] = baseSettings.mobileSettings[key];
            }
        });
        
        return mobileSettings;
    }
    
    /* =============================================================================
       SLIDER DETECTION FUNCTIONS
       ============================================================================= */
    
    /**
     * Find and initialize the main slider instance
     * Supports Swiper.js and other common slider libraries
     */
    function findSlider() {
        console.log('Thumbnail Debug: Looking for slider...');
        
        // Check for Swiper instances
        if (window.Swiper && window.Swiper.instances) {
            console.log('Thumbnail Debug: Found Swiper instances:', window.Swiper.instances.length);
            if (window.Swiper.instances.length > 0) {
                willMyersSwiper = window.Swiper.instances[window.Swiper.instances.length - 1];
                console.log('Thumbnail Debug: Using Swiper instance');
                return true;
            }
        }
        
        // Check for Swiper elements with attached swiper instances
        const swiperElements = document.querySelectorAll('.swiper-container, .swiper, [class*="swiper"]');
        console.log('Thumbnail Debug: Found swiper elements:', swiperElements.length);
        
        for (let el of swiperElements) {
            if (el.swiper) {
                willMyersSwiper = el.swiper;
                console.log('Thumbnail Debug: Using element swiper');
                return true;
            }
        }
        
        return false;
    }
    
    /* =============================================================================
       SETTINGS MANAGEMENT
       ============================================================================= */
    
    /**
     * Get merged settings from user configuration and defaults
     */
    function getSettings() {
        const defaultSettings = {
            width: 80,
            layout: 'horizontal',
            aspect: '16:9',
            timeline: false,
            pinMode: false,
            position: 'bottom-center',
            manualPosition: {
                top: 'auto',
                bottom: '20px',
                left: 'auto',
                right: 'auto',
                transform: 'none'
            },
            customImages: {
                enabled: false,
                images: ['', '', '', '', '', '', '', '', '']
            },
            dynamicHeader: {
                enabled: false,
                selector: '#header, .header, .site-header, .Header, [data-controller="HeaderOverlay"]',
                images: ['', '', '', '', '', '', '', '', ''],
                backgroundColors: ['', '', '', '', '', '', '', '', ''],
                navTextColors: ['', '', '', '', '', '', '', '', ''],
                mobileNavTextColors: ['', '', '', '', '', '', '', '', ''],
                desktopNavTextColors: ['', '', '', '', '', '', '', '', ''],
                mobileHamburgerImages: ['', '', '', '', '', '', '', '', ''],
                mobileHamburgerColors: ['', '', '', '', '', '', '', '', ''],
                mobileMenuBackgroundColors: ['', '', '', '', '', '', '', '', ''],
                logoImages: ['', '', '', '', '', '', '', '', ''],
                transition: 'fade', // 'fade', 'slide', 'scale'
                duration: 'auto', // 'auto' syncs with slider, or specify milliseconds
                type: 'background' // 'background' for navigation banners, 'image' for img elements
            }
        };
        
        if (window.thumbnailSettings) {
            console.log('Thumbnail Debug: Using custom settings from HTML block');
            // Deep merge to preserve nested objects like dynamicHeader
            const userSettings = window.thumbnailSettings;
            const mergedSettings = { ...defaultSettings };
            
            // Merge top-level properties
            Object.keys(userSettings).forEach(key => {
                if (typeof userSettings[key] === 'object' && userSettings[key] !== null && !Array.isArray(userSettings[key])) {
                    // Deep merge objects like dynamicHeader, customImages, manualPosition
                    mergedSettings[key] = { ...defaultSettings[key], ...userSettings[key] };
                } else {
                    // Direct assignment for primitives and arrays
                    mergedSettings[key] = userSettings[key];
                }
            });
            
            return mergedSettings;
        } else {
            console.log('Thumbnail Debug: Using default settings');
            return defaultSettings;
        }
    }
    
    /* =============================================================================
       SLIDE DETECTION AND IMAGE EXTRACTION
       ============================================================================= */
    
    /**
     * Find all slides in the current slider
     */
    function findSlides() {
        const slides = document.querySelectorAll('.swiper-slide, .user-items-list-item-container, .gallery-strips-item');
        console.log('Thumbnail Debug: Found slides:', slides.length);
        return slides;
    }
    
    /**
     * Calculate appropriate gap between thumbnails based on width and layout
     */
    function calculateGap(width, layout) {
        if (layout && layout.includes('progression')) {
            return Math.max(10, Math.round(width * 0.15));
        }
        return Math.max(8, Math.round(width * 0.1));
    }
    
    /**
     * Calculate thumbnail height based on width and aspect ratio
     */
    function calculateHeight(width, aspectRatio) {
        switch (aspectRatio) {
            case '16:9':
                return Math.round(width * 0.5625);
            case '9:16':
                return Math.round(width * 1.778);
            case '1:1':
                return width;
            default:
                return Math.round(width * 0.5625);
        }
    }
    
    /**
     * Find the main slider section container
     */
    function findSliderSection() {
        const sections = document.querySelectorAll('[data-wm-plugin*="slider"], [data-section-theme*="slider"], .user-items-list, .gallery-strips, section');
        console.log('Thumbnail Debug: Found potential slider sections:', sections.length);
        
        for (let section of sections) {
            const slides = section.querySelectorAll('.swiper-slide, .user-items-list-item-container, .gallery-strips-item');
            if (slides.length > 1) {
                console.log('Thumbnail Debug: Using section with', slides.length, 'slides');
                return section;
            }
        }
        
        return null;
    }
    
    /**
     * Extract background image or img src from a slide element
     */
    function extractImageFromSlide(slide) {
        console.log('Thumbnail Debug: Extracting image from slide');
        
        // Check for background image
        let bgImage = window.getComputedStyle(slide).backgroundImage;
        if (bgImage && bgImage !== 'none') {
            console.log('Thumbnail Debug: Found background image');
            return bgImage;
        }
        
        // Check for img element
        const img = slide.querySelector('img');
        if (img) {
            let src = img.src || img.dataset.src || img.dataset.originalSrc;
            if (src) {
                console.log('Thumbnail Debug: Found img src:', src);
                return `url("${src}")`;
            }
        }
        
        // Check for picture element
        const picture = slide.querySelector('picture img');
        if (picture && picture.src) {
            console.log('Thumbnail Debug: Found picture src');
            return `url("${picture.src}")`;
        }
        
        // Check for data attributes
        const dataImage = slide.dataset.image || slide.dataset.bg || slide.dataset.background;
        if (dataImage) {
            console.log('Thumbnail Debug: Found data image');
            return `url("${dataImage}")`;
        }
        
        // Deep search for any images
        const allImages = slide.querySelectorAll('img, [style*="background-image"]');
        for (let element of allImages) {
            if (element.tagName === 'IMG' && element.src) {
                console.log('Thumbnail Debug: Found nested img');
                return `url("${element.src}")`;
            }
            
            const elementBg = window.getComputedStyle(element).backgroundImage;
            if (elementBg && elementBg !== 'none') {
                console.log('Thumbnail Debug: Found nested background');
                return elementBg;
            }
        }
        
        console.log('Thumbnail Debug: No image found for slide');
        return 'none';
    }
    
    /* =============================================================================
       DYNAMIC HEADER FUNCTIONALITY
       ============================================================================= */
    
    /**
     * Initialize dynamic header functionality
     */
    function initializeDynamicHeader() {
        const settings = getSettings();
        
        if (!settings.dynamicHeader.enabled) {
            console.log('Thumbnail Debug: Dynamic header disabled');
            return;
        }
        
        console.log('Thumbnail Debug: Dynamic header initialized - using CSS injection method');
    }
    
    /**
     * Update header image and navigation text color based on current slide
     */
    function updateHeaderImage(slideIndex) {
        const settings = getSettings();
        
        if (!settings.dynamicHeader.enabled) {
            return;
        }
        
        // Clear any pending header updates and process immediately
        if (headerTransitionInProgress) {
            headerTransitionInProgress = false;
        }
        
        console.log('Thumbnail Debug: Updating header for slide', slideIndex, 'on', isMobile ? 'mobile' : 'desktop');
        
        const headerImage = settings.dynamicHeader.images[slideIndex];
        const backgroundColor = settings.dynamicHeader.backgroundColors[slideIndex];
        
        // Determine which color to use based on device and available settings
        let navTextColor = '';
        if (isMobile && settings.dynamicHeader.mobileNavTextColors && settings.dynamicHeader.mobileNavTextColors[slideIndex]) {
            navTextColor = settings.dynamicHeader.mobileNavTextColors[slideIndex];
            console.log('Thumbnail Debug: Using mobile-specific color:', navTextColor);
        } else if (!isMobile && settings.dynamicHeader.desktopNavTextColors && settings.dynamicHeader.desktopNavTextColors[slideIndex]) {
            navTextColor = settings.dynamicHeader.desktopNavTextColors[slideIndex];
            console.log('Thumbnail Debug: Using desktop-specific color:', navTextColor);
        } else if (settings.dynamicHeader.navTextColors && settings.dynamicHeader.navTextColors[slideIndex]) {
            navTextColor = settings.dynamicHeader.navTextColors[slideIndex];
            console.log('Thumbnail Debug: Using general color:', navTextColor);
        }
        
        const logoImage = settings.dynamicHeader.logoImages[slideIndex];
        const mobileHamburgerImage = settings.dynamicHeader.mobileHamburgerImages && settings.dynamicHeader.mobileHamburgerImages[slideIndex] ? settings.dynamicHeader.mobileHamburgerImages[slideIndex] : '';
        const mobileMenuBgColor = settings.dynamicHeader.mobileMenuBackgroundColors && settings.dynamicHeader.mobileMenuBackgroundColors[slideIndex] ? settings.dynamicHeader.mobileMenuBackgroundColors[slideIndex] : '';
        
        // Skip if no styling specified for this slide
        if ((!headerImage || headerImage.trim() === '') && 
            (!backgroundColor || backgroundColor.trim() === '') &&
            (!navTextColor || navTextColor.trim() === '') && 
            (!logoImage || logoImage.trim() === '') &&
            (!mobileHamburgerImage || mobileHamburgerImage.trim() === '') &&
            (!mobileMenuBgColor || mobileMenuBgColor.trim() === '')) {
            console.log('Thumbnail Debug: No header styling specified for slide', slideIndex);
            injectHeaderCSS('');
            return;
        }
        
        console.log('Thumbnail Debug: Updating header for slide', slideIndex);
        headerTransitionInProgress = true;
        
        // Get actual transition duration
        let transitionDuration = settings.dynamicHeader.duration;
        if (transitionDuration === 'auto' && willMyersSwiper && willMyersSwiper.params) {
            transitionDuration = willMyersSwiper.params.speed || 500;
        } else if (transitionDuration === 'auto') {
            transitionDuration = 500;
        }
        
        // Build CSS rules
        let cssRules = '';
        
        // Add background image if specified
        if (headerImage && headerImage.trim() !== '') {
            cssRules += `
                /* Target only the main header element, not nested ones */
                body > .header:first-of-type,
                body > #header:first-of-type,
                body > .Header:first-of-type,
                body > .site-header:first-of-type,
                body > [data-controller="HeaderOverlay"]:first-of-type,
                .header:not(.header .header):not(#header .header):not(.Header .header),
                #header:not(.header #header):not(#header #header):not(.Header #header),
                .Header:not(.header .Header):not(#header .Header):not(.Header .Header),
                .site-header:not(.header .site-header):not(#header .site-header):not(.Header .site-header),
                [data-controller="HeaderOverlay"]:not(.header [data-controller="HeaderOverlay"]):not(#header [data-controller="HeaderOverlay"]):not(.Header [data-controller="HeaderOverlay"]),
                .header-nav:not(.header .header-nav):not(#header .header-nav):not(.Header .header-nav),
                .site-navigation:not(.header .site-navigation):not(#header .site-navigation):not(.Header .site-navigation),
                [data-header-banner]:not(.header [data-header-banner]):not(#header [data-header-banner]):not(.Header [data-header-banner]) {
                    background-image: url("${headerImage}") !important;
                    background-size: cover !important;
                    background-position: center !important;
                    background-repeat: no-repeat !important;
                    transition: all ${transitionDuration}ms ease-in-out !important;
                }
                
                /* Explicitly remove background from nested header elements */
                .header .header,
                .header #header,
                .header .Header,
                .header .site-header,
                .header [data-controller="HeaderOverlay"],
                .header .header-nav,
                .header .site-navigation,
                .header [data-header-banner],
                #header .header,
                #header #header,
                #header .Header,
                #header .site-header,
                #header [data-controller="HeaderOverlay"],
                #header .header-nav,
                #header .site-navigation,
                #header [data-header-banner],
                .Header .header,
                .Header #header,
                .Header .Header,
                .Header .site-header,
                .Header [data-controller="HeaderOverlay"],
                .Header .header-nav,
                .Header .site-navigation,
                .Header [data-header-banner] {
                    background-image: none !important;
                    background: none !important;
                }
            `;
        }
        
        // Add background color if specified (alternative to images)
        if (backgroundColor && backgroundColor.trim() !== '') {
            cssRules += `
                /* Target only the main header element, not nested ones */
                body > .header:first-of-type,
                body > #header:first-of-type,
                body > .Header:first-of-type,
                body > .site-header:first-of-type,
                body > [data-controller="HeaderOverlay"]:first-of-type,
                .header:not(.header .header):not(#header .header):not(.Header .header),
                #header:not(.header #header):not(#header #header):not(.Header #header),
                .Header:not(.header .Header):not(#header .Header):not(.Header .Header),
                .site-header:not(.header .site-header):not(#header .site-header):not(.Header .site-header),
                [data-controller="HeaderOverlay"]:not(.header [data-controller="HeaderOverlay"]):not(#header [data-controller="HeaderOverlay"]):not(.Header [data-controller="HeaderOverlay"]),
                .header-nav:not(.header .header-nav):not(#header .header-nav):not(.Header .header-nav),
                .site-navigation:not(.header .site-navigation):not(#header .site-navigation):not(.Header .site-navigation),
                [data-header-banner]:not(.header [data-header-banner]):not(#header [data-header-banner]):not(.Header [data-header-banner]) {
                    background-color: ${backgroundColor} !important;
                    background-image: none !important;
                    transition: background-color ${transitionDuration}ms ease-in-out !important;
                }
                
                /* Explicitly remove background from nested header elements */
                .header .header,
                .header #header,
                .header .Header,
                .header .site-header,
                .header [data-controller="HeaderOverlay"],
                .header .header-nav,
                .header .site-navigation,
                .header [data-header-banner],
                #header .header,
                #header #header,
                #header .Header,
                #header .site-header,
                #header [data-controller="HeaderOverlay"],
                #header .header-nav,
                #header .site-navigation,
                #header [data-header-banner],
                .Header .header,
                .Header #header,
                .Header .Header,
                .Header .site-header,
                .Header [data-controller="HeaderOverlay"],
                .Header .header-nav,
                .Header .site-navigation,
                .Header [data-header-banner] {
                    background-color: transparent !important;
                    background-image: none !important;
                    background: none !important;
                }
            `;
        }
        
        // Add navigation text color if specified
        if (navTextColor && navTextColor.trim() !== '') {
            cssRules += `
                .header,
                #header,
                .Header,
                .site-header,
                [data-controller="HeaderOverlay"],
                .header-nav,
                .site-navigation,
                [data-header-banner] {
                    --header-text-color: ${navTextColor} !important;
                }
                
                .header .header-nav a,
                .header .header-nav-item a,
                .header .header-menu-nav-item a,
                .header .header-nav-folder-title,
                .header .header-menu-nav-folder-title,
                .header .header-nav-item,
                .header .header-menu-nav-item,
                .header .site-navigation a,
                .header .site-navigation .nav-item,
                .header nav a,
                .header nav .nav-link,
                .header .header-actions-action--social a,
                .header .header-actions-action--social svg,
                .header .header-actions-action--social path,
                .header .social-links a,
                .header .social-links svg,
                .header .social-links path,
                .header .social-icon,
                .header .social-icon svg,
                .header .social-icon path,
                .header [class*="social"] a,
                .header [class*="social"] svg,
                .header [class*="social"] path,
                .header .header-menu-nav-item a,
                .header .header-menu-nav-folder-title,
                .header .header-menu .header-menu-nav-item,
                .header .header-menu .header-menu-nav-folder,
                .header .header-menu-nav-folder .header-menu-nav-item a,
                .header .header-menu-nav-folder .header-menu-nav-folder-title,
                .header .header-burger,
                .header .header-burger svg,
                .header .header-burger path,
                .header .header-burger line,
                .header .header-burger rect,
                .header .header-burger-yui,
                .header .header-burger-yui svg,
                .header .header-burger-yui path,
                .header .header-burger-yui line,
                .header .header-burger-yui rect,
                .header [class*="burger"],
                .header [class*="burger"] svg,
                .header [class*="burger"] path,
                .header [class*="burger"] line,
                .header [class*="burger"] rect,
                .header [class*="menu-icon"],
                .header [class*="menu-icon"] svg,
                .header [class*="menu-icon"] path,
                .header [class*="menu-icon"] line,
                .header [class*="menu-icon"] rect,
                .header .mobile-nav-toggle,
                .header .mobile-nav-toggle svg,
                .header .mobile-nav-toggle path,
                .header .mobile-nav-toggle line,
                .header .mobile-nav-toggle rect,
                .header [class*="menu"] a,
                .header [class*="menu"] svg,
                .header [class*="menu"] path,
                #header .header-nav a,
                #header .header-nav-item a,
                #header .header-menu-nav-item a,
                #header .header-nav-folder-title,
                #header .header-menu-nav-folder-title,
                #header .header-nav-item,
                #header .header-menu-nav-item,
                #header .site-navigation a,
                #header .site-navigation .nav-item,
                #header nav a,
                #header nav .nav-link,
                #header .header-actions-action--social a,
                #header .header-actions-action--social svg,
                #header .header-actions-action--social path,
                #header .social-links a,
                #header .social-links svg,
                #header .social-links path,
                #header .social-icon,
                #header .social-icon svg,
                #header .social-icon path,
                #header [class*="social"] a,
                #header [class*="social"] svg,
                #header [class*="social"] path,
                #header .header-menu-nav-item a,
                #header .header-menu-nav-folder-title,
                #header .header-menu .header-menu-nav-item,
                #header .header-menu .header-menu-nav-folder,
                #header .header-menu-nav-folder .header-menu-nav-item a,
                #header .header-menu-nav-folder .header-menu-nav-folder-title,
                #header .header-burger,
                #header .header-burger svg,
                #header .header-burger path,
                #header .header-burger line,
                #header .header-burger rect,
                #header .header-burger-yui,
                #header .header-burger-yui svg,
                #header .header-burger-yui path,
                #header .header-burger-yui line,
                #header .header-burger-yui rect,
                #header [class*="burger"],
                #header [class*="burger"] svg,
                #header [class*="burger"] path,
                #header [class*="burger"] line,
                #header [class*="burger"] rect,
                #header [class*="menu-icon"],
                #header [class*="menu-icon"] svg,
                #header [class*="menu-icon"] path,
                #header [class*="menu-icon"] line,
                #header [class*="menu-icon"] rect,
                #header .mobile-nav-toggle,
                #header .mobile-nav-toggle svg,
                #header .mobile-nav-toggle path,
                #header .mobile-nav-toggle line,
                #header .mobile-nav-toggle rect,
                #header [class*="menu"] a,
                #header [class*="menu"] svg,
                #header [class*="menu"] path,
                .Header .header-nav a,
                .Header .header-nav-item a,
                .Header .header-menu-nav-item a,
                .Header .header-nav-folder-title,
                .Header .header-menu-nav-folder-title,
                .Header .header-nav-item,
                .Header .header-menu-nav-item,
                .Header .site-navigation a,
                .Header .site-navigation .nav-item,
                .Header nav a,
                .Header nav .nav-link,
                .Header .header-actions-action--social a,
                .Header .header-actions-action--social svg,
                .Header .header-actions-action--social path,
                .Header .social-links a,
                .Header .social-links svg,
                .Header .social-links path,
                .Header .social-icon,
                .Header .social-icon svg,
                .Header .social-icon path,
                .Header [class*="social"] a,
                .Header [class*="social"] svg,
                .Header [class*="social"] path,
                .Header .header-menu-nav-item a,
                .Header .header-menu-nav-folder-title,
                .Header .header-menu .header-menu-nav-item,
                .Header .header-menu .header-menu-nav-folder,
                .Header .header-menu-nav-folder .header-menu-nav-item a,
                .Header .header-menu-nav-folder .header-menu-nav-folder-title,
                .Header .header-burger,
                .Header .header-burger svg,
                .Header .header-burger path,
                .Header .header-burger line,
                .Header .header-burger rect,
                .Header .header-burger-yui,
                .Header .header-burger-yui svg,
                .Header .header-burger-yui path,
                .Header .header-burger-yui line,
                .Header .header-burger-yui rect,
                .Header [class*="burger"],
                .Header [class*="burger"] svg,
                .Header [class*="burger"] path,
                .Header [class*="burger"] line,
                .Header [class*="burger"] rect,
                .Header [class*="menu-icon"],
                .Header [class*="menu-icon"] svg,
                .Header [class*="menu-icon"] path,
                .Header [class*="menu-icon"] line,
                .Header [class*="menu-icon"] rect,
                .Header .mobile-nav-toggle,
                .Header .mobile-nav-toggle svg,
                .Header .mobile-nav-toggle path,
                .Header .mobile-nav-toggle line,
                .Header .mobile-nav-toggle rect,
                .Header [class*="menu"] a,
                .Header [class*="menu"] svg,
                .Header [class*="menu"] path {
                    color: ${navTextColor} !important;
                    fill: ${navTextColor} !important;
                    stroke: ${navTextColor} !important;
                    transition: color ${transitionDuration}ms ease-in-out, fill ${transitionDuration}ms ease-in-out, stroke ${transitionDuration}ms ease-in-out !important;
                }
            `;
        }
        
        // Add logo image replacement if specified
        if (logoImage && logoImage.trim() !== '') {
            cssRules += `
                .header .header-title-logo img,
                .header .header-title-logo a img,
                .header .site-title img,
                .header .site-logo img,
                .header .logo img,
                .header [class*="logo"] img,
                .header .header-title img,
                .header .site-branding img,
                #header .header-title-logo img,
                #header .header-title-logo a img,
                #header .site-title img,
                #header .site-logo img,
                #header .logo img,
                #header [class*="logo"] img,
                #header .header-title img,
                #header .site-branding img,
                .Header .header-title-logo img,
                .Header .header-title-logo a img,
                .Header .site-title img,
                .Header .site-logo img,
                .Header .logo img,
                .Header [class*="logo"] img,
                .Header .header-title img,
                .Header .site-branding img {
                    content: url("${logoImage}") !important;
                    transition: opacity ${transitionDuration}ms ease-in-out !important;
                }
            `;
        }
        
        // Add mobile hamburger color styling if specified
        if (mobileHamburgerImage && mobileHamburgerImage.trim() !== '') {
            cssRules += `
                @media (max-width: 768px) {
                    /* Hide only visual elements, keep structure intact for clicks */
                    .header .burger svg,
                    .header .header-burger svg,
                    .header .header-burger-yui svg,
                    .header [class*="burger"] svg,
                    .header [class*="menu-icon"] svg,
                    .header .mobile-nav-toggle svg,
                    .header .sqs-mobile-menu-toggle svg,
                    .header .header-actions-action--menu svg,
                    .header .burger span,
                    .header .header-burger span,
                    .header .header-burger-yui span,
                    .header [class*="burger"] span,
                    .header [class*="menu-icon"] span,
                    .header .mobile-nav-toggle span,
                    .header .sqs-mobile-menu-toggle span,
                    .header .header-actions-action--menu span,
                    .header .burger div,
                    .header .header-burger div,
                    .header .header-burger-yui div,
                    .header [class*="burger"] div,
                    .header [class*="menu-icon"] div,
                    .header .mobile-nav-toggle div,
                    .header .sqs-mobile-menu-toggle div,
                    .header .header-actions-action--menu div,
                    #header .burger svg,
                    #header .header-burger svg,
                    #header .header-burger-yui svg,
                    #header [class*="burger"] svg,
                    #header [class*="menu-icon"] svg,
                    #header .mobile-nav-toggle svg,
                    #header .sqs-mobile-menu-toggle svg,
                    #header .header-actions-action--menu svg,
                    #header .burger span,
                    #header .header-burger span,
                    #header .header-burger-yui span,
                    #header [class*="burger"] span,
                    #header [class*="menu-icon"] span,
                    #header .mobile-nav-toggle span,
                    #header .sqs-mobile-menu-toggle span,
                    #header .header-actions-action--menu span,
                    #header .burger div,
                    #header .header-burger div,
                    #header .header-burger-yui div,
                    #header [class*="burger"] div,
                    #header [class*="menu-icon"] div,
                    #header .mobile-nav-toggle div,
                    #header .sqs-mobile-menu-toggle div,
                    #header .header-actions-action--menu div,
                    .Header .burger svg,
                    .Header .header-burger svg,
                    .Header .header-burger-yui svg,
                    .Header [class*="burger"] svg,
                    .Header [class*="menu-icon"] svg,
                    .Header .mobile-nav-toggle svg,
                    .Header .sqs-mobile-menu-toggle svg,
                    .Header .header-actions-action--menu svg,
                    .Header .burger span,
                    .Header .header-burger span,
                    .Header .header-burger-yui span,
                    .Header [class*="burger"] span,
                    .Header [class*="menu-icon"] span,
                    .Header .mobile-nav-toggle span,
                    .Header .sqs-mobile-menu-toggle span,
                    .Header .header-actions-action--menu span,
                    .Header .burger div,
                    .Header .header-burger div,
                    .Header .header-burger-yui div,
                    .Header [class*="burger"] div,
                    .Header [class*="menu-icon"] div,
                    .Header .mobile-nav-toggle div,
                    .Header .sqs-mobile-menu-toggle div,
                    .Header .header-actions-action--menu div {
                        opacity: 0 !important;
                        color: transparent !important;
                        fill: transparent !important;
                        stroke: transparent !important;
                        background: transparent !important;
                        border: none !important;
                        box-shadow: none !important;
                        font-size: 0 !important;
                        text-indent: -9999px !important;
                    }
                    
                    /* Ensure hamburger containers are properly sized and clickable */
                    .header .burger,
                    .header .header-burger,
                    .header .header-burger-yui,
                    .header [class*="burger"],
                    .header [class*="menu-icon"],
                    .header .mobile-nav-toggle,
                    .header .sqs-mobile-menu-toggle,
                    .header .header-actions-action--menu,
                    #header .burger,
                    #header .header-burger,
                    #header .header-burger-yui,
                    #header [class*="burger"],
                    #header [class*="menu-icon"],
                    #header .mobile-nav-toggle,
                    #header .sqs-mobile-menu-toggle,
                    #header .header-actions-action--menu,
                    .Header .burger,
                    .Header .header-burger,
                    .Header .header-burger-yui,
                    .Header [class*="burger"],
                    .Header [class*="menu-icon"],
                    .Header .mobile-nav-toggle,
                    .Header .sqs-mobile-menu-toggle,
                    .Header .header-actions-action--menu {
                        position: relative !important;
                        cursor: pointer !important;
                        overflow: visible !important;
                        min-width: 44px !important;
                        min-height: 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        z-index: 1000 !important;
                    }
                    
                    /* Create clean custom hamburger lines */
                    .header .burger::before,
                    .header .header-burger::before,
                    .header .header-burger-yui::before,
                    .header [class*="burger"]::before,
                    .header [class*="menu-icon"]::before,
                    .header .mobile-nav-toggle::before,
                    .header .sqs-mobile-menu-toggle::before,
                    .header .header-actions-action--menu::before,
                    #header .burger::before,
                    #header .header-burger::before,
                    #header .header-burger-yui::before,
                    #header [class*="burger"]::before,
                    #header [class*="menu-icon"]::before,
                    #header .mobile-nav-toggle::before,
                    #header .sqs-mobile-menu-toggle::before,
                    #header .header-actions-action--menu::before,
                    .Header .burger::before,
                    .Header .header-burger::before,
                    .Header .header-burger-yui::before,
                    .Header [class*="burger"]::before,
                    .Header [class*="menu-icon"]::before,
                    .Header .mobile-nav-toggle::before,
                    .Header .sqs-mobile-menu-toggle::before,
                    .Header .header-actions-action--menu::before {
                        content: '';
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 20px;
                        height: 2px;
                        background-color: ${mobileHamburgerImage} !important;
                        box-shadow: 
                            0 -6px 0 ${mobileHamburgerImage},
                            0 6px 0 ${mobileHamburgerImage} !important;
                        transition: all 0.3s ease-in-out !important;
                        z-index: 10;
                    }
                    
                    /* X state when menu is open */
                    body.header--menu-open .header .burger::before,
                    body.header--menu-open .header .header-burger::before,
                    body.header--menu-open .header .header-burger-yui::before,
                    body.header--menu-open .header [class*="burger"]::before,
                    body.header--menu-open .header [class*="menu-icon"]::before,
                    body.header--menu-open .header .mobile-nav-toggle::before,
                    body.header--menu-open .header .sqs-mobile-menu-toggle::before,
                    body.header--menu-open .header .header-actions-action--menu::before,
                    body.header--menu-open #header .burger::before,
                    body.header--menu-open #header .header-burger::before,
                    body.header--menu-open #header .header-burger-yui::before,
                    body.header--menu-open #header [class*="burger"]::before,
                    body.header--menu-open #header [class*="menu-icon"]::before,
                    body.header--menu-open #header .mobile-nav-toggle::before,
                    body.header--menu-open #header .sqs-mobile-menu-toggle::before,
                    body.header--menu-open #header .header-actions-action--menu::before,
                    body.header--menu-open .Header .burger::before,
                    body.header--menu-open .Header .header-burger::before,
                    body.header--menu-open .Header .header-burger-yui::before,
                    body.header--menu-open .Header [class*="burger"]::before,
                    body.header--menu-open .Header [class*="menu-icon"]::before,
                    body.header--menu-open .Header .mobile-nav-toggle::before,
                    body.header--menu-open .Header .sqs-mobile-menu-toggle::before,
                    body.header--menu-open .Header .header-actions-action--menu::before,
                    body.mobile-menu-open .header .burger::before,
                    body.mobile-menu-open .header .header-burger::before,
                    body.mobile-menu-open .header .header-burger-yui::before,
                    body.mobile-menu-open .header [class*="burger"]::before,
                    body.mobile-menu-open .header [class*="menu-icon"]::before,
                    body.mobile-menu-open .header .mobile-nav-toggle::before,
                    body.mobile-menu-open .header .sqs-mobile-menu-toggle::before,
                    body.mobile-menu-open .header .header-actions-action--menu::before,
                    body.mobile-menu-open #header .burger::before,
                    body.mobile-menu-open #header .header-burger::before,
                    body.mobile-menu-open #header .header-burger-yui::before,
                    body.mobile-menu-open #header [class*="burger"]::before,
                    body.mobile-menu-open #header [class*="menu-icon"]::before,
                    body.mobile-menu-open #header .mobile-nav-toggle::before,
                    body.mobile-menu-open #header .sqs-mobile-menu-toggle::before,
                    body.mobile-menu-open #header .header-actions-action--menu::before,
                    body.mobile-menu-open .Header .burger::before,
                    body.mobile-menu-open .Header .header-burger::before,
                    body.mobile-menu-open .Header .header-burger-yui::before,
                    body.mobile-menu-open .Header [class*="burger"]::before,
                    body.mobile-menu-open .Header [class*="menu-icon"]::before,
                    body.mobile-menu-open .Header .mobile-nav-toggle::before,
                    body.mobile-menu-open .Header .sqs-mobile-menu-toggle::before,
                    body.mobile-menu-open .Header .header-actions-action--menu::before {
                        background-color: ${mobileHamburgerImage} !important;
                        box-shadow: none !important;
                        transform: translate(-50%, -50%) rotate(45deg);
                        width: 20px;
                        height: 2px;
                    }
                    
                    /* Create second line of X when menu is open */
                    body.header--menu-open .header .burger::after,
                    body.header--menu-open .header .header-burger::after,
                    body.header--menu-open .header .header-burger-yui::after,
                    body.header--menu-open .header [class*="burger"]::after,
                    body.header--menu-open .header [class*="menu-icon"]::after,
                    body.header--menu-open .header .mobile-nav-toggle::after,
                    body.header--menu-open .header .sqs-mobile-menu-toggle::after,
                    body.header--menu-open .header .header-actions-action--menu::after,
                    body.header--menu-open #header .burger::after,
                    body.header--menu-open #header .header-burger::after,
                    body.header--menu-open #header .header-burger-yui::after,
                    body.header--menu-open #header [class*="burger"]::after,
                    body.header--menu-open #header [class*="menu-icon"]::after,
                    body.header--menu-open #header .mobile-nav-toggle::after,
                    body.header--menu-open #header .sqs-mobile-menu-toggle::after,
                    body.header--menu-open #header .header-actions-action--menu::after,
                    body.header--menu-open .Header .burger::after,
                    body.header--menu-open .Header .header-burger::after,
                    body.header--menu-open .Header .header-burger-yui::after,
                    body.header--menu-open .Header [class*="burger"]::after,
                    body.header--menu-open .Header [class*="menu-icon"]::after,
                    body.header--menu-open .Header .mobile-nav-toggle::after,
                    body.header--menu-open .Header .sqs-mobile-menu-toggle::after,
                    body.header--menu-open .Header .header-actions-action--menu::after,
                    body.mobile-menu-open .header .burger::after,
                    body.mobile-menu-open .header .header-burger::after,
                    body.mobile-menu-open .header .header-burger-yui::after,
                    body.mobile-menu-open .header [class*="burger"]::after,
                    body.mobile-menu-open .header [class*="menu-icon"]::after,
                    body.mobile-menu-open .header .mobile-nav-toggle::after,
                    body.mobile-menu-open .header .sqs-mobile-menu-toggle::after,
                    body.mobile-menu-open .header .header-actions-action--menu::after,
                    body.mobile-menu-open #header .burger::after,
                    body.mobile-menu-open #header .header-burger::after,
                    body.mobile-menu-open #header .header-burger-yui::after,
                    body.mobile-menu-open #header [class*="burger"]::after,
                    body.mobile-menu-open #header [class*="menu-icon"]::after,
                    body.mobile-menu-open #header .mobile-nav-toggle::after,
                    body.mobile-menu-open #header .sqs-mobile-menu-toggle::after,
                    body.mobile-menu-open #header .header-actions-action--menu::after,
                    body.mobile-menu-open .Header .burger::after,
                    body.mobile-menu-open .Header .header-burger::after,
                    body.mobile-menu-open .Header .header-burger-yui::after,
                    body.mobile-menu-open .Header [class*="burger"]::after,
                    body.mobile-menu-open .Header [class*="menu-icon"]::after,
                    body.mobile-menu-open .Header .mobile-nav-toggle::after,
                    body.mobile-menu-open .Header .sqs-mobile-menu-toggle::after,
                    body.mobile-menu-open .Header .header-actions-action--menu::after {
                        content: '';
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: 20px;
                        height: 2px;
                        background-color: ${mobileHamburgerImage} !important;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        transition: all 0.3s ease-in-out !important;
                        z-index: 11;
                    }
                    

                }
            `;
        }
        

        
        // Add mobile menu background styling if specified
        if (mobileMenuBgColor && mobileMenuBgColor.trim() !== '') {
            // Check if it's a URL (image) or color
            const isImageUrl = mobileMenuBgColor.startsWith('http') || mobileMenuBgColor.startsWith('data:') || mobileMenuBgColor.includes('.');
            
            if (isImageUrl) {
                // Use background-image approach for images
                cssRules += `
                    @media (max-width: 768px) {
                        /* Target mobile menu backgrounds with image */
                        .header-menu .header-menu-bg,
                        .header .header-menu .header-menu-bg,
                        #header .header-menu .header-menu-bg,
                        .Header .header-menu .header-menu-bg {
                            background-image: url('${mobileMenuBgColor}') !important;
                            background-size: cover !important;
                            background-position: center !important;
                            background-repeat: no-repeat !important;
                            transition: background-image ${transitionDuration}ms ease-in-out !important;
                        }
                        
                        /* Also target the menu items text color to ensure readability */
                        .header-menu .header-menu-nav-item a,
                        .header-menu .header-menu-nav-folder-title,
                        .header .header-menu .header-menu-nav-item a,
                        .header .header-menu .header-menu-nav-folder-title,
                        #header .header-menu .header-menu-nav-item a,
                        #header .header-menu .header-menu-nav-folder-title,
                        .Header .header-menu .header-menu-nav-item a,
                        .Header .header-menu .header-menu-nav-folder-title {
                            color: ${navTextColor || '#ffffff'} !important;
                            transition: color ${transitionDuration}ms ease-in-out !important;
                        }
                    }
                `;
            } else {
                // Use background-color approach for solid colors
                cssRules += `
                    @media (max-width: 768px) {
                        /* Target mobile menu dropdown/overlay backgrounds */
                        .header-menu,
                        .header-menu .header-menu-bg,
                        .header .header-menu,
                        .header .header-menu .header-menu-bg,
                        #header .header-menu,
                        #header .header-menu .header-menu-bg,
                        .Header .header-menu,
                        .Header .header-menu .header-menu-bg,
                        
                        /* Mobile menu when open */
                        .header-menu[style*="display: block"],
                        .header-menu[style*="display:block"],
                        .header-menu.header-menu--active,
                        .header-menu.header-menu--folder-open,
                        .header-menu.is-open,
                        .header-menu.open,
                        .header-menu.show,
                        .header-menu.visible,
                        
                        /* Mobile menu when body has open state */
                        body.header--menu-open .header-menu,
                        body.header--menu-open .header-menu .header-menu-bg,
                        body.mobile-menu-open .header-menu,
                        body.mobile-menu-open .header-menu .header-menu-bg,
                        body.sqs-mobile-menu-overlay-open .header-menu,
                        body.sqs-mobile-menu-overlay-open .header-menu .header-menu-bg,
                        
                        /* Squarespace mobile menu overlays */
                        [data-controller*="MobileClassicMenu"] .header-menu,
                        [data-controller*="MobileClassicMenu"] .header-menu .header-menu-bg,
                        [data-controller*="MobileOverlayFolders"] .header-menu,
                        [data-controller*="MobileOverlayFolders"] .header-menu .header-menu-bg,
                        .sqs-mobile-overlay-menu,
                        .sqs-mobile-overlay-menu.is-open,
                        
                        /* Additional mobile menu containers */
                        .mobile-nav-overlay,
                        .mobile-menu-overlay,
                        .header-mobile-menu,
                        .header .mobile-menu,
                        #header .mobile-menu,
                        .Header .mobile-menu,
                        
                        /* Navigation folder overlays on mobile */
                        .header-nav-folder-content,
                        .header-menu-nav-folder-content,
                        .header .header-nav-folder-content,
                        .header .header-menu-nav-folder-content,
                        #header .header-nav-folder-content,
                        #header .header-menu-nav-folder-content,
                        .Header .header-nav-folder-content,
                        .Header .header-menu-nav-folder-content {
                            background-color: ${mobileMenuBgColor} !important;
                            transition: background-color ${transitionDuration}ms ease-in-out !important;
                        }
                        
                        /* Also target the menu items text color to ensure readability */
                        .header-menu .header-menu-nav-item a,
                        .header-menu .header-menu-nav-folder-title,
                        .header .header-menu .header-menu-nav-item a,
                        .header .header-menu .header-menu-nav-folder-title,
                        #header .header-menu .header-menu-nav-item a,
                        #header .header-menu .header-menu-nav-folder-title,
                        .Header .header-menu .header-menu-nav-item a,
                        .Header .header-menu .header-menu-nav-folder-title {
                            color: ${navTextColor || '#000000'} !important;
                            transition: color ${transitionDuration}ms ease-in-out !important;
                        }
                    }
                `;
            }
        }
        
        // Inject CSS
        injectHeaderCSS(cssRules);
        
        // Note: Hamburger styling is now handled via CSS background-image approach
        
        // Reset transition flag
        setTimeout(() => {
            headerTransitionInProgress = false;
        }, transitionDuration);
    }
    
    /**
     * Inject CSS for header background
     */
    function injectHeaderCSS(cssRules) {
        // Remove existing dynamic header style
        const existingStyle = document.getElementById('dynamic-header-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Add new style if CSS rules provided
        if (cssRules && cssRules.trim() !== '') {
            const style = document.createElement('style');
            style.id = 'dynamic-header-style';
            style.textContent = cssRules;
            document.head.appendChild(style);
            console.log('Thumbnail Debug: Injected header CSS');
        }
    }
    
    // SVG hamburger functions removed - now using CSS background-image approach
    
    /* =============================================================================
       THUMBNAIL CREATION AND MANAGEMENT
       ============================================================================= */
    
    /**
     * Create thumbnail navigation elements
     */
    function createThumbnails() {
        console.log('Thumbnail Debug: Creating thumbnails...');
        
        const SETTINGS = getCurrentSettings();
        
        // Check if thumbnails are disabled (returns null when disabled on mobile)
        if (!SETTINGS) {
            console.log('Thumbnail Debug: Thumbnails disabled for current device');
            return false;
        }
        
        const sliderSection = findSliderSection();
        
        if (!sliderSection) {
            console.log('Thumbnail Debug: No slider section found');
            return false;
        }
        
        const slides = sliderSection.querySelectorAll('.swiper-slide, .user-items-list-item-container, .gallery-strips-item');
        
        if (slides.length < 2) {
            console.log('Thumbnail Debug: Not enough slides');
            return false;
        }
        
        // Remove existing thumbnail navigation
        const existing = sliderSection.querySelector('.auto-thumbnail-nav');
        if (existing) {
            existing.remove();
        }
        
        // Create thumbnail navigation container
        const thumbnailNav = document.createElement('div');
        thumbnailNav.className = `auto-thumbnail-nav ${SETTINGS.layout}`;
        
        // Add mobile class if on mobile
        if (isMobile) {
            thumbnailNav.classList.add('mobile-mode');
            console.log('Thumbnail Debug: Mobile mode enabled');
        }
        
        // Apply pin mode if enabled
        if (SETTINGS.pinMode) {
            thumbnailNav.classList.add('pin-mode');
            console.log('Thumbnail Debug: Pin mode enabled - thumbnails will stick to viewport');
        }
        
        // Store reference for resize handling
        currentThumbnailNav = thumbnailNav;
        
        // Apply positioning
        if (SETTINGS.position === 'manual') {
            thumbnailNav.style.top = SETTINGS.manualPosition.top;
            thumbnailNav.style.bottom = SETTINGS.manualPosition.bottom;
            thumbnailNav.style.left = SETTINGS.manualPosition.left;
            thumbnailNav.style.right = SETTINGS.manualPosition.right;
            thumbnailNav.style.transform = SETTINGS.manualPosition.transform;
        } else {
            thumbnailNav.classList.add(SETTINGS.position);
        }
        
        // Calculate dimensions
        const gap = calculateGap(SETTINGS.width, SETTINGS.layout);
        const height = calculateHeight(SETTINGS.width, SETTINGS.aspect);
        
        thumbnailNav.style.gap = gap + 'px';
        
        // Configure timeline mode dimensions
        if (SETTINGS.timeline) {
            thumbnailNav.style.overflow = 'visible';
            
            if (SETTINGS.layout === 'horizontal') {
                thumbnailNav.style.width = (SETTINGS.width * 3.5 + gap * 2) + 'px';
                thumbnailNav.style.height = height + 'px';
            } else if (SETTINGS.layout === 'vertical') {
                thumbnailNav.style.height = (height * 3.5 + gap * 2) + 'px';
                thumbnailNav.style.width = SETTINGS.width + 'px';
            }
        }
        
        // Ensure slider section has relative positioning
        if (window.getComputedStyle(sliderSection).position === 'static') {
            sliderSection.style.position = 'relative';
        }
        
        // Determine image source function
        let thumbnailCount = slides.length;
        let getImageForSlide = (i) => extractImageFromSlide(slides[i]);
        
        if (SETTINGS.customImages.enabled) {
            getImageForSlide = (i) => {
                const customImg = SETTINGS.customImages.images[i];
                return customImg && customImg.trim() !== '' ? `url("${customImg}")` : extractImageFromSlide(slides[i]);
            };
            console.log('Thumbnail Debug: Using custom images with', thumbnailCount, 'total thumbnails for timeline looping');
        }
        
        // Create individual thumbnail elements
        for (let i = 0; i < thumbnailCount; i++) {
            console.log('Thumbnail Debug: Processing slide', i);
            
            const bgImage = getImageForSlide(i);
            const thumb = document.createElement('div');
            
            thumb.className = 'auto-slide-thumbnail';
            thumb.dataset.slideIndex = i;
            thumb.style.backgroundImage = bgImage;
            thumb.style.width = SETTINGS.width + 'px';
            thumb.style.height = height + 'px';
            
            // Timeline progression styling
            if (SETTINGS.timeline && SETTINGS.layout.includes('progression')) {
                thumb.style.opacity = '1';
                thumb.style.transform = 'scale(1)';
            }
            
            // Handle missing images
            if (bgImage === 'none') {
                thumb.style.backgroundColor = '#ddd';
                thumb.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:12px;color:#666;">${i + 1}</div>`;
            }
            
            // Add click event listener with hover state management
            thumb.addEventListener('click', () => {
                console.log('Thumbnail Debug: Clicked thumbnail', i);
                
                // Remove clicked-active class from all thumbnails
                document.querySelectorAll('.auto-slide-thumbnail').forEach(t => {
                    t.classList.remove('clicked-active');
                });
                
                // Add clicked-active class to this thumbnail
                thumb.classList.add('clicked-active');
                
                if (willMyersSwiper && i < slides.length) {
                    if (willMyersSwiper.slideToLoop) {
                        willMyersSwiper.slideToLoop(i);
                    } else if (willMyersSwiper.slideTo) {
                        willMyersSwiper.slideTo(i);
                    }
                }
            });
            
            // Add hover event listeners for click state management
            thumb.addEventListener('mouseenter', () => {
                // Remove clicked-active from other thumbnails when hovering
                document.querySelectorAll('.auto-slide-thumbnail').forEach(t => {
                    if (t !== thumb) {
                        t.classList.remove('clicked-active');
                    }
                });
            });
            
            thumbnailNav.appendChild(thumb);
        }
        
        // Add thumbnail navigation to slider section
        sliderSection.appendChild(thumbnailNav);
        console.log('Thumbnail Debug: Thumbnails created and added');
        
        // Set initial active state
        const currentIndex = willMyersSwiper ? (willMyersSwiper.realIndex || willMyersSwiper.activeIndex || 0) : 0;
        updateActive(currentIndex);
        
        return true;
    }
    
    /* =============================================================================
       THUMBNAIL STATE MANAGEMENT
       ============================================================================= */
    
    /**
     * Update active thumbnail and handle timeline positioning
     */
    function updateActive(index) {
        const SETTINGS = getCurrentSettings();
        const thumbnails = document.querySelectorAll('.auto-slide-thumbnail');
        const totalSlides = thumbnails.length;
        
        // Update header image
        updateHeaderImage(index);
        
        // Timeline mode with more than 3 slides
        if (SETTINGS.timeline && totalSlides > 3) {
            let visibleIndices = [];
            
            // Determine which thumbnails should be visible
            if (index === 0) {
                visibleIndices = [0, 1, 2];
            } else if (index === 1) {
                visibleIndices = [1, 2, 3];
            } else if (index >= totalSlides - 2) {
                if (index === totalSlides - 2) {
                    visibleIndices = [totalSlides - 2, totalSlides - 1, 0];
                } else {
                    visibleIndices = [totalSlides - 1, 0, 1];
                }
            } else {
                visibleIndices = [index, index + 1, index + 2];
            }
            
            // Calculate positioning
            const gap = calculateGap(SETTINGS.width, SETTINGS.layout);
            const height = calculateHeight(SETTINGS.width, SETTINGS.aspect);
            const naturalPositions = [];
            
            for (let pos = 0; pos < 3; pos++) {
                if (SETTINGS.layout === 'horizontal' || SETTINGS.layout === 'progression-horizontal') {
                    naturalPositions.push({
                        left: (pos * (SETTINGS.width + gap)) + 'px',
                        top: '0px'
                    });
                } else {
                    naturalPositions.push({
                        left: '0px',
                        top: (pos * (height + gap)) + 'px'
                    });
                }
            }
            
            // Apply positioning and styling to each thumbnail
            thumbnails.forEach((thumb, i) => {
                const positionInWindow = visibleIndices.indexOf(i);
                const isVisible = positionInWindow !== -1;
                const isActive = i === index;
                
                thumb.style.position = 'absolute';
                thumb.style.display = 'flex';
                thumb.style.transition = 'all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.5s ease-out, transform 0.6s ease-out';
                
                if (isVisible) {
                    // Position visible thumbnails
                    const slotPosition = naturalPositions[positionInWindow];
                    thumb.style.left = slotPosition.left;
                    thumb.style.top = slotPosition.top;
                    
                    if (isActive) {
                        thumb.style.opacity = '1';
                        thumb.style.transform = `scale(1.3)`;
                        thumb.style.zIndex = '10';
                    } else {
                        thumb.style.opacity = '0.7';
                        thumb.style.transform = 'scale(1)';
                        thumb.style.zIndex = '1';
                    }
                } else {
                    // Hide non-visible thumbnails with smooth upward transition
                    thumb.style.opacity = '0';
                    thumb.style.transform = 'scale(0.8) translateY(-20px)';
                    thumb.style.zIndex = '1';
                    
                    if (SETTINGS.layout === 'horizontal' || SETTINGS.layout === 'progression-horizontal') {
                        thumb.style.left = '-200px';
                        thumb.style.top = '0px';
                    } else {
                        thumb.style.left = '0px';
                        thumb.style.top = '-200px';
                    }
                }
                
                // Update active class
                if (isActive) {
                    thumb.classList.add('active');
                } else {
                    thumb.classList.remove('active');
                }
            });
        } else {
            // Standard mode (non-timeline)
            thumbnails.forEach((thumb, i) => {
                thumb.style.position = 'relative';
                thumb.style.display = 'flex';
                thumb.style.opacity = '1';
                thumb.style.transform = 'scale(1)';
                thumb.style.zIndex = '1';
                thumb.style.left = 'auto';
                thumb.style.top = 'auto';
                
                if (i === index) {
                    thumb.classList.add('active');
                } else {
                    thumb.classList.remove('active');
                }
            });
        }
    }
    
    /* =============================================================================
       EVENT HANDLING
       ============================================================================= */
    
    /**
     * Set up event listeners for slider changes
     */
    function setupEvents() {
        if (!willMyersSwiper || !willMyersSwiper.on) {
            console.log('Thumbnail Debug: No swiper events available');
            return;
        }
        
        // Listen to multiple events to catch all slide changes
        willMyersSwiper.on('slideChange', () => {
            const currentIndex = willMyersSwiper.realIndex !== undefined ? willMyersSwiper.realIndex : willMyersSwiper.activeIndex || 0;
            console.log('Thumbnail Debug: slideChange event - slide', currentIndex);
            updateActive(currentIndex);
        });
        
        willMyersSwiper.on('slideChangeTransitionEnd', () => {
            const currentIndex = willMyersSwiper.realIndex !== undefined ? willMyersSwiper.realIndex : willMyersSwiper.activeIndex || 0;
            console.log('Thumbnail Debug: slideChangeTransitionEnd event - slide', currentIndex);
            updateActive(currentIndex);
        });
        
        willMyersSwiper.on('slideChangeTransitionStart', () => {
            const currentIndex = willMyersSwiper.realIndex !== undefined ? willMyersSwiper.realIndex : willMyersSwiper.activeIndex || 0;
            console.log('Thumbnail Debug: slideChangeTransitionStart event - slide', currentIndex);
            updateActive(currentIndex);
        });
        
        // Also listen for touch/drag events
        willMyersSwiper.on('touchEnd', () => {
            setTimeout(() => {
                const currentIndex = willMyersSwiper.realIndex !== undefined ? willMyersSwiper.realIndex : willMyersSwiper.activeIndex || 0;
                console.log('Thumbnail Debug: touchEnd event - slide', currentIndex);
                updateActive(currentIndex);
            }, 100);
        });
        
        console.log('Thumbnail Debug: Multiple events set up for better slide detection');
    }
    
    /* =============================================================================
       INITIALIZATION
       ============================================================================= */
    
    /**
     * Initialize just the dynamic header functionality (for mobile when thumbnails are disabled)
     */
    function initializeHeaderOnly() {
        console.log('Thumbnail Debug: Initializing header-only mode for mobile...');
        
        if (findSlider()) {
            console.log('Thumbnail Debug: Slider found for header-only mode');
            
            // Initialize dynamic header
            initializeDynamicHeader();
            
            // Set up events for header changes only
            if (willMyersSwiper && willMyersSwiper.on) {
                // Listen to multiple events for better detection
                willMyersSwiper.on('slideChange', () => {
                    const currentIndex = willMyersSwiper.realIndex !== undefined ? willMyersSwiper.realIndex : willMyersSwiper.activeIndex || 0;
                    console.log('Thumbnail Debug: Mobile slideChange - slide', currentIndex);
                    updateHeaderImage(currentIndex);
                });
                
                willMyersSwiper.on('slideChangeTransitionEnd', () => {
                    const currentIndex = willMyersSwiper.realIndex !== undefined ? willMyersSwiper.realIndex : willMyersSwiper.activeIndex || 0;
                    console.log('Thumbnail Debug: Mobile slideChangeTransitionEnd - slide', currentIndex);
                    updateHeaderImage(currentIndex);
                });
                
                willMyersSwiper.on('slideChangeTransitionStart', () => {
                    const currentIndex = willMyersSwiper.realIndex !== undefined ? willMyersSwiper.realIndex : willMyersSwiper.activeIndex || 0;
                    console.log('Thumbnail Debug: Mobile slideChangeTransitionStart - slide', currentIndex);
                    updateHeaderImage(currentIndex);
                });
                
                willMyersSwiper.on('touchEnd', () => {
                    setTimeout(() => {
                        const currentIndex = willMyersSwiper.realIndex !== undefined ? willMyersSwiper.realIndex : willMyersSwiper.activeIndex || 0;
                        console.log('Thumbnail Debug: Mobile touchEnd - slide', currentIndex);
                        updateHeaderImage(currentIndex);
                    }, 100);
                });
                
                // Set initial header state
                const currentIndex = willMyersSwiper.realIndex || willMyersSwiper.activeIndex || 0;
                updateHeaderImage(currentIndex);
                
                console.log('Thumbnail Debug: Header-only initialization complete with multiple events');
                return true;
            }
        }
        
        console.log('Thumbnail Debug: Header-only initialization failed');
        return false;
    }

    /**
     * Main initialization function
     */
    function initialize() {
        console.log('Thumbnail Debug: Initializing...');
        
        if (findSlider()) {
            console.log('Thumbnail Debug: Slider found');
            
            // Initialize dynamic header
            initializeDynamicHeader();
            
            // Check if we should create thumbnails or just initialize headers
            const SETTINGS = getCurrentSettings();
            
            if (!SETTINGS) {
                // Thumbnails disabled on mobile, but still initialize headers
                console.log('Thumbnail Debug: Thumbnails disabled, initializing header-only mode');
                return initializeHeaderOnly();
            }
            
            if (createThumbnails()) {
                setupEvents();
                console.log('Thumbnail Debug: Full initialization complete');
                return true;
            }
        }
        
        console.log('Thumbnail Debug: Initialization failed');
        return false;
    }
    
    /* =============================================================================
       RESPONSIVE HANDLING
       ============================================================================= */
    
    /**
     * Handle window resize to switch between desktop and mobile settings
     */
    function handleResize() {
        const newIsMobile = detectMobile();
        
        // Only recreate if mobile state changed
        if (newIsMobile !== isMobile) {
            console.log('Thumbnail Debug: Screen size changed, recreating thumbnails');
            
            // Remove existing thumbnails
            if (currentThumbnailNav && currentThumbnailNav.parentNode) {
                currentThumbnailNav.parentNode.removeChild(currentThumbnailNav);
                currentThumbnailNav = null;
            }
            
            // Recreate with new settings (or hide if disabled on mobile)
            if (createThumbnails()) {
                setupEvents();
                
                // Update active state
                const currentIndex = willMyersSwiper ? (willMyersSwiper.realIndex || willMyersSwiper.activeIndex || 0) : 0;
                updateActive(currentIndex);
            }
        }
    }
    
    // Add resize listener with debouncing
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 250);
    });
    
    /* =============================================================================
       AUTO-INITIALIZATION WITH RETRY LOGIC
       ============================================================================= */
    
    let attempts = 0;
    const maxAttempts = 40;
    
    const tryInit = setInterval(() => {
        attempts++;
        console.log('Thumbnail Debug: Attempt', attempts);
        
        if (initialize()) {
            clearInterval(tryInit);
        } else if (attempts >= maxAttempts) {
            clearInterval(tryInit);
            console.log('Thumbnail Debug: Gave up after', maxAttempts, 'attempts');
        }
    }, 1000);
    
})();
</script>
<script>(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'9716f547660c9878',t:'MTc1NTU3ODI3Mi4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();</script>