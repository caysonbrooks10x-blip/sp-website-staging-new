/**
 * Optimized Vanta.js Manager
 * 
 * Usage:
 * 1. Add `data-vanta-effect="FOG"` (or other effect name) to your target element.
 * 2. Optionally add `data-vanta-options='{"highlightColor": 0xff0000}'` for custom overrides.
 * 3. Include this script after Three.js and Vanta.js scripts.
 */

(function () {
    const DEBUG = true;

    // Scroll Tracking for Pause Logic
    let isScrolling = false;
    let scrollTimeout;

    window.addEventListener("scroll", () => {
        isScrolling = true;
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
        }, 100);
    }, { passive: true });

    /**
     * Initialize Vanta on an element
     */
    function initVanta(el) {
        if (el.vantaEffect) return; // Already running

        const effectName = el.dataset.vantaEffect || "FOG";

        // Check if global Vanta object exists
        if (!window.VANTA || !window.VANTA[effectName]) {
            console.warn(`Vanta Manager: VANTA.${effectName} not found.`);
            return;
        }

        // Parse custom options
        let customOptions = {};
        try {
            if (el.dataset.vantaOptions) {
                customOptions = JSON.parse(el.dataset.vantaOptions);
            }
        } catch (e) {
            console.error("Vanta Manager: Invalid JSON in data-vanta-options", e);
        }

        // Merge options
        const options = { ...DEFAULTS, ...customOptions, el: el };

        // Optimization 1: Downgrade for low power
        if (isLowPower) {
            options.quality = "low";
            if (options.size) options.size *= 1.5;
            options.controlOnly = false;
        }

        // Disable heavy controls
        options.mouseControls = false;
        options.touchControls = false;

        try {
            const effect = window.VANTA[effectName](options);
            el.vantaEffect = effect;

            // Optimization 2: DPR Clamping (Retina)
            if (effect.renderer) {
                const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
                effect.renderer.setPixelRatio(dpr);
            }

            // Optimization 3: Loop Hijack (FPS Cap + Pause on Scroll)
            if (effect.renderer && typeof effect.renderer.setAnimationLoop === "function") {
                effect.renderer.setAnimationLoop(null); // Stop internal loop

                let lastFrameTime = 0;
                const targetFPS = 30;
                const frameInterval = 1000 / targetFPS;

                // Bind custom tick to this element/effect
                const tick = (time) => {
                    if (!el.vantaEffect) return; // Destroyed

                    // A. Pause on scroll
                    if (isScrolling) {
                        el.vantaFrameId = requestAnimationFrame(tick);
                        return;
                    }

                    // B. FPS Cap
                    const delta = time - lastFrameTime;
                    if (delta >= frameInterval) {
                        lastFrameTime = time - (delta % frameInterval);

                        // Update & Render
                        if (effect.update) effect.update(); // Vanta update
                        if (effect.renderer && effect.scene && effect.camera) {
                            effect.renderer.render(effect.scene, effect.camera);
                        }
                    }

                    el.vantaFrameId = requestAnimationFrame(tick);
                };

                el.vantaFrameId = requestAnimationFrame(tick);
            }

            if (DEBUG) console.log(`Vanta Manager: Initialized ${effectName} on`, el);
        } catch (e) {
            console.error("Vanta Manager: Init failed", e);
        }
    }

    /**
     * Destroy Vanta on an element
     */
    function destroyVanta(el) {
        if (el.vantaFrameId) {
            cancelAnimationFrame(el.vantaFrameId);
            el.vantaFrameId = null;
        }

        if (el.vantaEffect) {
            try {
                el.vantaEffect.destroy();
            } catch (e) { }
            el.vantaEffect = null;
            if (DEBUG) console.log("Vanta Manager: Destroyed effect to save GPU.");
        }
    }

    // Intersection Observer to handle scroll visibility
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // STRICT Threshold: Only render when 10% visible
            if (entry.isIntersecting && entry.intersectionRatio > 0) {
                // Init with slight delay
                setTimeout(() => initVanta(entry.target), 100);
            } else {
                destroyVanta(entry.target);
            }
        });
    }, {
        rootMargin: "0px",
        threshold: 0.1
    });

    // Auto-discover elements
    function scanAndObserve() {
        const elements = document.querySelectorAll('[data-vanta-effect]');
        elements.forEach(el => observer.observe(el));
    }

    // Run on load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", scanAndObserve);
    } else {
        scanAndObserve();
    }

    // Expose global API
    window.VantaManager = {
        scan: scanAndObserve,
        init: initVanta,
        destroy: destroyVanta
    };

})();
