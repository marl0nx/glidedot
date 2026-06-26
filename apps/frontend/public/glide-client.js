(function() {
    if (window.self === window.top) {
        console.log('[glide] Not running in iframe, In-Context Editor disabled.');
        return;
    }

    let translations = {};
    let isHovering = false;

    // Listen for messages from glide. dashboard
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || data.source !== 'glide-dashboard') return;

        if (data.type === 'GLIDE_TRANSLATIONS') {
            translations = data.translations;
            updateDOM();
        }
    });

    let isUpdatingDOM = false;
    const observer = new MutationObserver((mutations) => {
        if (isUpdatingDOM) return;
        
        let shouldUpdate = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0 || mutation.type === 'characterData') {
                // Ignore our own outline/styling changes
                if (mutation.target.dataset && mutation.target.dataset.glideSetup) continue;
                shouldUpdate = true;
                break;
            }
        }
        
        if (shouldUpdate) {
            clearTimeout(window.glideUpdateTimeout);
            window.glideUpdateTimeout = setTimeout(() => {
                updateDOM();
            }, 50);
        }
    });

    function startObserving() {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    function updateDOM() {
        isUpdatingDOM = true;
        observer.disconnect();

        // 1. Update elements with data-glide-key attribute
        document.querySelectorAll('[data-glide-key]').forEach(el => {
            const key = el.getAttribute('data-glide-key');
            
            // Store the original text on first pass so we can revert to it if translation is missing
            if (el.dataset.glideOriginalText === undefined) {
                el.dataset.glideOriginalText = key;
            }
            
            if (translations[key]) {
                el.innerText = translations[key];
            } else {
                el.innerText = el.dataset.glideOriginalText;
            }
            makeEditable(el, key);
        });

        // 2. Scan text nodes for raw keys with dots (e.g., homepage.hero.title)
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const nodesToWrap = [];
        const KEY_PATTERN = /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+$/;

        while(node = walk.nextNode()) {
            const val = node.nodeValue.trim();
            // Match keys with dots and ensure they contain letters to avoid matching pure floats or IP addresses
            if (KEY_PATTERN.test(val) && /[a-zA-Z]/.test(val)) {
                nodesToWrap.push({ node, key: val });
            }
        }

        nodesToWrap.forEach(({ node, key }) => {
            const parent = node.parentNode;
            if (!parent) return;

            // Prevent double wrapping
            if (parent.tagName === 'SPAN' && parent.getAttribute('data-glide-key') === key) {
                return;
            }

            const span = document.createElement('span');
            span.setAttribute('data-glide-key', key);
            span.dataset.glideOriginalText = key;
            span.innerText = translations[key] || key;

            parent.replaceChild(span, node);
            makeEditable(span, key);
        });

        startObserving();
        isUpdatingDOM = false;
    }

    function makeEditable(el, key) {
        if (el.dataset.glideSetup) return;
        el.dataset.glideSetup = "true";

        el.style.cursor = 'pointer';
        el.style.transition = 'all 0.2s';

        el.addEventListener('mouseenter', () => {
            el.dataset.glideOriginalOutline = el.style.outline;
            el.dataset.glideOriginalOutlineOffset = el.style.outlineOffset;
            el.dataset.glideOriginalBg = el.style.backgroundColor;

            el.style.outline = '2px dashed #00DC82'; // Nuxt Green
            el.style.outlineOffset = '2px';
            el.style.backgroundColor = 'rgba(0, 220, 130, 0.1)';
        });

        el.addEventListener('mouseleave', () => {
            el.style.outline = el.dataset.glideOriginalOutline || '';
            el.style.outlineOffset = el.dataset.glideOriginalOutlineOffset || '';
            el.style.backgroundColor = el.dataset.glideOriginalBg || '';
        });

        el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Tell glide. dashboard to open the edit modal for this key
            window.parent.postMessage({
                source: 'glide-client',
                type: 'GLIDE_EDIT_REQUEST',
                key: key
            }, '*');
        });
    }

    // Tell parent we are ready
    window.parent.postMessage({
        source: 'glide-client',
        type: 'GLIDE_INIT'
    }, '*');

    // Run initial scan
    updateDOM();
})();
