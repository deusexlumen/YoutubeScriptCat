// ==UserScript==
// @name         YouTube Homepage Suite v6.0.0 (Fixed)
// @namespace    ScriptCatCore.YT
// @version      6.0.0
// @description  Fixed version with proper Shorts detection and blocking
// @author       ScriptCat-Core
// @match        *://*.youtube.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const DEBUG = true;
    const log = (...args) => { if (DEBUG) console.log('[YT-Suite]', ...args); };
    const error = (...args) => { if (DEBUG) console.error('[YT-Suite Error]', ...args); };

    // ================= CONFIGURATION STATE =================
    let STATE = {};
    
    const loadState = () => {
        try {
            STATE = {
                keywords: GM_getValue('yt_suite_keywords', ['spoiler', 'clickbait', 'unfassbar']),
                channels: GM_getValue('yt_suite_channels', ['NervigerCreatorTV']),
                removeShorts: GM_getValue('yt_suite_remove_shorts', true)
            };
            log('State loaded:', STATE);
        } catch (e) {
            error('Failed to load state:', e);
            STATE = {
                keywords: ['spoiler', 'clickbait', 'unfassbar'],
                channels: ['NervigerCreatorTV'],
                removeShorts: true
            };
        }
    };
    
    const saveState = () => {
        try {
            GM_setValue('yt_suite_keywords', STATE.keywords);
            GM_setValue('yt_suite_channels', STATE.channels);
            GM_setValue('yt_suite_remove_shorts', STATE.removeShorts);
            log('State saved');
        } catch (e) {
            error('Failed to save state:', e);
        }
    };
    // =======================================================

    // Inject CSS styles
    const injectStyles = () => {
        if (document.getElementById('yt-suite-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'yt-suite-styles';
        style.textContent = `
            .yt-suite-hidden {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                width: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                pointer-events: none !important;
                position: absolute !important;
                clip: rect(0, 0, 0, 0) !important;
            }
            
            .yt-suite-block-btn {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 32px;
                height: 32px;
                background-color: rgba(15, 15, 15, 0.95);
                color: #ff4e4e;
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 50%;
                cursor: pointer;
                z-index: 10000 !important;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.6);
                transition: transform 0.1s ease, background-color 0.2s;
                pointer-events: auto !important;
            }
            
            ytd-rich-item-renderer:hover .yt-suite-block-btn,
            ytd-video-renderer:hover .yt-suite-block-btn,
            ytd-compact-video-renderer:hover .yt-suite-block-btn {
                display: flex !important;
            }
            
            .yt-suite-block-btn:hover {
                background-color: #ff0000 !important;
                color: #ffffff !important;
                transform: scale(1.15);
            }
            
            #yt-suite-header-btn {
                background: rgba(255, 255, 255, 0.1);
                color: var(--yt-spec-text-primary, #fff);
                border: 1px solid var(--yt-spec-10-percent-layer, #333);
                padding: 6px 14px;
                border-radius: 18px;
                cursor: pointer;
                margin-right: 12px;
                font-family: "Roboto", sans-serif;
                font-size: 13px;
                font-weight: 500;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            
            #yt-suite-header-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            #yt-suite-config-dialog {
                background: #212121;
                color: #ffffff;
                border: 1px solid #3d3d3d;
                border-radius: 8px;
                padding: 24px;
                width: 400px;
                max-width: 90vw;
                box-shadow: 0 10px 30px rgba(0,0,0,0.7);
                font-family: "Roboto", "Arial", sans-serif;
                z-index: 999999 !important;
            }
            
            #yt-suite-config-dialog::backdrop {
                background: rgba(0, 0, 0, 0.65);
                backdrop-filter: blur(2px);
            }
            
            .yt-suite-form-group { 
                display: flex; 
                flex-direction: column; 
                margin-bottom: 16px; 
            }
            
            .yt-suite-form-group label { 
                margin-bottom: 8px; 
                font-size: 14px; 
                font-weight: 500; 
                color: #aaaaaa; 
            }
            
            .yt-suite-form-group textarea { 
                background: #181818; 
                color: #fff; 
                border: 1px solid #3d3d3d; 
                border-radius: 4px; 
                padding: 8px; 
                resize: vertical; 
                min-height: 60px; 
                font-family: monospace; 
            }
            
            .yt-suite-form-checkbox { 
                display: flex; 
                align-items: center; 
                gap: 12px; 
                font-size: 14px; 
                margin-bottom: 24px; 
                cursor: pointer; 
            }
            
            .yt-suite-dialog-actions { 
                display: flex; 
                justify-content: flex-end; 
                gap: 12px; 
            }
            
            .yt-suite-btn { 
                padding: 8px 16px; 
                border: none; 
                border-radius: 18px; 
                cursor: pointer; 
                font-weight: 500; 
            }
            
            .yt-suite-btn-cancel { 
                background: transparent; 
                color: #fff; 
            }
            
            .yt-suite-btn-cancel:hover { 
                background: rgba(255,255,255,0.1); 
            }
            
            .yt-suite-btn-save { 
                background: #3ea6ff; 
                color: #0f0f0f; 
            }
            
            .yt-suite-btn-save:hover { 
                background: #65b8ff; 
            }
        `;
        document.head.appendChild(style);
        log('Styles injected');
    };

    // Render configuration dialog
    const renderConfigDialog = () => {
        log('Opening config dialog');
        let dialog = document.getElementById('yt-suite-config-dialog');
        
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'yt-suite-config-dialog';
            
            const h2 = document.createElement('h2');
            h2.style.margin = '0 0 20px 0';
            h2.style.fontSize = '18px';
            h2.textContent = '⚙️ Suite Settings';
            dialog.appendChild(h2);
            
            // Keywords group
            const kwGroup = document.createElement('div');
            kwGroup.className = 'yt-suite-form-group';
            const kwLabel = document.createElement('label');
            kwLabel.textContent = 'Keyword Blacklist (Comma separated)';
            const kwTextarea = document.createElement('textarea');
            kwTextarea.id = 'yt-suite-input-keywords';
            kwTextarea.value = STATE.keywords.join(', ');
            kwGroup.appendChild(kwLabel);
            kwGroup.appendChild(kwTextarea);
            dialog.appendChild(kwGroup);
            
            // Channels group
            const chGroup = document.createElement('div');
            chGroup.className = 'yt-suite-form-group';
            const chLabel = document.createElement('label');
            chLabel.textContent = 'Channel Blacklist (Comma separated)';
            const chTextarea = document.createElement('textarea');
            chTextarea.id = 'yt-suite-input-channels';
            chTextarea.value = STATE.channels.join(', ');
            chGroup.appendChild(chLabel);
            chGroup.appendChild(chTextarea);
            dialog.appendChild(chGroup);
            
            // Shorts checkbox
            const checkboxLabel = document.createElement('label');
            checkboxLabel.className = 'yt-suite-form-checkbox';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'yt-suite-input-shorts';
            checkbox.checked = STATE.removeShorts;
            const checkboxText = document.createTextNode(' Remove Shorts Shelf');
            checkboxLabel.appendChild(checkbox);
            checkboxLabel.appendChild(checkboxText);
            dialog.appendChild(checkboxLabel);
            
            // Actions
            const actions = document.createElement('div');
            actions.className = 'yt-suite-dialog-actions';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'yt-suite-btn yt-suite-btn-cancel';
            cancelBtn.id = 'yt-suite-btn-close';
            cancelBtn.textContent = 'Cancel';
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'yt-suite-btn yt-suite-btn-save';
            saveBtn.id = 'yt-suite-btn-save';
            saveBtn.textContent = 'Save & Reload';
            
            actions.appendChild(cancelBtn);
            actions.appendChild(saveBtn);
            dialog.appendChild(actions);
            
            document.body.appendChild(dialog);

            cancelBtn.addEventListener('click', () => dialog.close());
            saveBtn.addEventListener('click', () => {
                const parseInput = (str) => str.split(',').map(s => s.trim()).filter(s => s.length > 0);
                
                STATE.keywords = parseInput(document.getElementById('yt-suite-input-keywords').value);
                STATE.channels = parseInput(document.getElementById('yt-suite-input-channels').value);
                STATE.removeShorts = document.getElementById('yt-suite-input-shorts').checked;
                
                saveState();
                window.location.reload();
            });

            dialog.addEventListener('click', (e) => {
                const rect = dialog.getBoundingClientRect();
                const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                                    rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
                if (!isInDialog) dialog.close();
            });
        }
        dialog.showModal();
    };

    // Inject header menu button with retry
    let headerInjectAttempts = 0;
    const MAX_HEADER_INJECT_ATTEMPTS = 10;
    
    const injectHeaderMenuButton = () => {
        if (headerInjectAttempts >= MAX_HEADER_INJECT_ATTEMPTS) {
            log('Max header inject attempts reached');
            return;
        }
        
        // Try to find masthead in shadow DOM
        const masthead = document.querySelector('ytd-masthead');
        const mastheadShadow = masthead?.shadowRoot;
        const endContainer = mastheadShadow?.querySelector('#end') || document.querySelector('ytd-masthead #end');
        
        if (endContainer) {
            if (!document.getElementById('yt-suite-header-btn')) {
                const btn = document.createElement('button');
                btn.id = 'yt-suite-header-btn';
                btn.textContent = '⚙️ YT-Suite';
                btn.onclick = renderConfigDialog;
                endContainer.prepend(btn);
                log('Header button injected');
            }
        } else {
            headerInjectAttempts++;
            log(`Header inject attempt ${headerInjectAttempts}/${MAX_HEADER_INJECT_ATTEMPTS}`);
            setTimeout(injectHeaderMenuButton, 500);
        }
    };

    GM_registerMenuCommand('⚙️ Configure YT Suite', renderConfigDialog);

    let activeHoveredCard = null;
    let mainObserverInstance = null;

    // Hover tracking
    document.addEventListener('pointerover', (e) => {
        const card = e.target.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer');
        if (card) activeHoveredCard = card;
    }, { passive: true });

    // Block button click handler
    document.addEventListener('click', (e) => {
        if (e.target.matches('.yt-suite-block-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const card = e.target.closest('ytd-rich-item-renderer, ytd-video-renderer');
            if (card) {
                log('Block button clicked, adding channel to blacklist');
                const channelEl = card.querySelector('ytd-channel-name a');
                if (channelEl) {
                    const cName = channelEl.textContent.trim();
                    if (cName && !STATE.channels.includes(cName)) {
                        STATE.channels.push(cName);
                        saveState();
                        hideNode(card);
                        log(`Channel "${cName}" added to blacklist`);
                    }
                }
            }
        }
    }, true);

    const hideNode = (node) => {
        if (node && !node.classList.contains('yt-suite-hidden')) {
            node.classList.add('yt-suite-hidden');
            log('Node hidden:', node.tagName);
        }
    };

    // Extract video ID from card
    const extractVideoId = (card) => {
        try {
            const anchor = card.querySelector('a#thumbnail, a#video-title-link, a#video-title, a.ytd-rich-grid-media');
            if (!anchor) return null;
            const href = anchor.getAttribute('href');
            if (!href) return null;
            const match = href.match(/[?&]v=([^&#]+)/);
            return match ? match[1] : href;
        } catch (e) {
            return null;
        }
    };

    // Process individual video cards
    const processCardNode = (card) => {
        try {
            if (!card || !(card instanceof Element)) return;
            
            const videoId = extractVideoId(card);
            if (!videoId) {
                log('No video ID found, skipping');
                return;
            }

            // Skip if already processed
            if (card.dataset.suiteVideoId === videoId) return;
            card.dataset.suiteVideoId = videoId;
            card.classList.remove('yt-suite-hidden');

            // Check for ads
            const isSponsored = card.querySelector('ytd-ad-slot-renderer, .badge-style-type-ad, .yt-badge-shape');
            if (isSponsored) {
                hideNode(card);
                log('Ad hidden');
                return;
            }

            // Get title and channel
            const titleEl = card.querySelector('#video-title, yt-lockup-metadata-view-model');
            const channelEl = card.querySelector('ytd-channel-name a, yt-lockup-metadata-view-model a');
            const titleText = titleEl ? titleEl.textContent.trim() : '';
            const channelName = channelEl ? channelEl.textContent.trim() : '';

            if (titleText === '' && channelName === '') {
                log('Empty title and channel, skipping');
                return;
            }

            // Check filters
            const matchesKeyword = STATE.keywords.some(pattern => 
                titleText.toLowerCase().includes(pattern.toLowerCase())
            );
            const matchesChannel = STATE.channels.some(blocked => 
                channelName.toLowerCase() === blocked.toLowerCase()
            );

            if (matchesKeyword || matchesChannel) {
                hideNode(card);
                log(`Card hidden - Keyword: ${matchesKeyword}, Channel: ${matchesChannel}`);
                return;
            }

            // Add block button
            const thumbnailContainer = card.querySelector('ytd-thumbnail, #thumbnail, .yt-core-image');
            if (thumbnailContainer && !thumbnailContainer.querySelector('.yt-suite-block-btn')) {
                const blockBtn = document.createElement('button');
                blockBtn.className = 'yt-suite-block-btn';
                blockBtn.textContent = '🚫';
                blockBtn.title = 'Block Channel';
                thumbnailContainer.style.position = 'relative';
                thumbnailContainer.appendChild(blockBtn);
                log('Block button added');
            }
        } catch (e) {
            error('Error processing card:', e);
        }
    };

    // Process Shorts shelves - IMPROVED DETECTION
    const processShortsShelf = (section) => {
        try {
            if (!section || !(section instanceof Element)) return false;
            
            if (!STATE.removeShorts) return false;
            
            // Multiple detection methods for Shorts
            const isShortsShelf = 
                section.tagName === 'YTD-RICH-SHELF-RENDERER' && section.hasAttribute('is-shorts') ||
                section.tagName === 'YTD-REEL-SHELF-RENDERER' ||
                section.querySelector('ytd-rich-shelf-renderer[is-shorts]') !== null ||
                section.querySelector('ytd-reel-shelf-renderer') !== null ||
                section.querySelector('yt-icon[icon="shorts_logo"]') !== null ||
                section.querySelector('[overlay-style="SHORTS"]') !== null ||
                section.querySelector('ytd-short-form-video-entry-point-view-model') !== null ||
                section.querySelector('ytd-rich-grid-renderer[is-shorts]') !== null ||
                (section.getAttribute('aria-label') || '').toLowerCase().includes('shorts');
            
            if (isShortsShelf) {
                hideNode(section);
                log('Shorts shelf hidden');
                return true;
            }
            
            return false;
        } catch (e) {
            error('Error processing shorts shelf:', e);
            return false;
        }
    };

    // Process other structural sections
    const processStructuralSection = (section) => {
        try {
            if (!section || !(section instanceof Element)) return;
            
            // Hide statement banners
            if (section.querySelector('ytd-statement-banner-renderer')) {
                hideNode(section);
                log('Statement banner hidden');
                return;
            }

            // Process Shorts
            processShortsShelf(section);
        } catch (e) {
            error('Error processing section:', e);
        }
    };

    // Full sweep of the page
    const runFullSweep = () => {
        log('Running full sweep...');
        injectHeaderMenuButton();
        
        // Process all sections
        document.querySelectorAll('ytd-rich-section-renderer').forEach(processStructuralSection);
        
        // Process all video cards
        document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer').forEach(processCardNode);
        
        // Also check for standalone Shorts shelves
        document.querySelectorAll('ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer').forEach(hideNode);
        
        log('Full sweep complete');
    };

    // Initialize mutation observer
    const initObserver = () => {
        if (mainObserverInstance) mainObserverInstance.disconnect();

        mainObserverInstance = new MutationObserver((mutations) => {
            let needsSweep = false;
            
            for (const mutation of mutations) {
                if (mutation.addedNodes.length === 0) continue;
                
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue; // Not an element
                    
                    const tag = node.tagName;
                    
                    if (tag === 'YTD-MASTHEAD') {
                        injectHeaderMenuButton();
                    } else if (tag === 'YTD-RICH-ITEM-RENDERER' || 
                               tag === 'YTD-VIDEO-RENDERER' || 
                               tag === 'YTD-COMPACT-VIDEO-RENDERER') {
                        processCardNode(node);
                    } else if (tag === 'YTD-RICH-SECTION-RENDERER' ||
                               tag === 'YTD-RICH-SHELF-RENDERER' ||
                               tag === 'YTD-REEL-SHELF-RENDERER') {
                        processStructuralSection(node);
                        needsSweep = true;
                    } else if (tag === 'YTD-TWO-COLUMN-BROWSE-RENDERER' ||
                               tag === 'YTD-BROWSE-RENDERER') {
                        needsSweep = true;
                    }
                }
            }

            if (needsSweep) {
                requestAnimationFrame(runFullSweep);
            }
        });

        mainObserverInstance.observe(document.documentElement, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['href', 'data-suite-video-id', 'is-shorts'] 
        });
        
        log('Observer initialized');
    };

    // Bootstrap function
    const bootstrap = () => {
        log('Bootstrapping...');
        loadState();
        injectStyles();
        
        // Wait for initial render
        setTimeout(() => {
            runFullSweep();
            initObserver();
        }, 500);
    };

    // Handle SPA navigation
    document.addEventListener('yt-navigate-finish', () => {
        log('Navigation finished');
        runFullSweep();
    });

    // Start based on document state
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
    
    log('Script initialized');
})();
