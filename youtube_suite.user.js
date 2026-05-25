// ==UserScript==
// @name         YouTube Homepage Suite v7.0.0 (Working Version)
// @namespace    ScriptCatCore.YT
// @version      7.0.0
// @description  Simplified working version - blocks videos by keyword/channel, removes shorts
// @author       ScriptCat-Core
// @match        *://*.youtube.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ================= CONFIGURATION =================
    let STATE = {
        keywords: (GM_getValue('yt_suite_keywords') || 'spoiler, clickbait, unfassbar').split(',').map(s => s.trim()).filter(s => s),
        channels: (GM_getValue('yt_suite_channels') || 'NervigerCreatorTV').split(',').map(s => s.trim()).filter(s => s),
        removeShorts: GM_getValue('yt_suite_remove_shorts') !== false
    };

    const log = (...args) => console.log('[YT-Suite]', ...args);
    // ================================================

    // ================= STYLES =================
    const injectStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            .yt-suite-hidden {
                display: none !important;
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
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.6);
                pointer-events: auto;
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
                color: #fff;
                border: 1px solid #333;
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
                z-index: 999999;
            }
            #yt-suite-config-dialog::backdrop {
                background: rgba(0, 0, 0, 0.65);
            }
            .yt-suite-form-group { display: flex; flex-direction: column; margin-bottom: 16px; }
            .yt-suite-form-group label { margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #aaaaaa; }
            .yt-suite-form-group textarea { background: #181818; color: #fff; border: 1px solid #3d3d3d; border-radius: 4px; padding: 8px; resize: vertical; min-height: 60px; font-family: monospace; }
            .yt-suite-form-checkbox { display: flex; align-items: center; gap: 12px; font-size: 14px; margin-bottom: 24px; cursor: pointer; }
            .yt-suite-dialog-actions { display: flex; justify-content: flex-end; gap: 12px; }
            .yt-suite-btn { padding: 8px 16px; border: none; border-radius: 18px; cursor: pointer; font-weight: 500; }
            .yt-suite-btn-cancel { background: transparent; color: #fff; }
            .yt-suite-btn-cancel:hover { background: rgba(255,255,255,0.1); }
            .yt-suite-btn-save { background: #3ea6ff; color: #0f0f0f; }
            .yt-suite-btn-save:hover { background: #65b8ff; }
        `;
        document.head.appendChild(style);
    };
    // ==========================================

    // ================= CONFIG DIALOG =================
    let configDialog = null;

    const renderConfigDialog = () => {
        if (configDialog) {
            configDialog.showModal();
            return;
        }

        configDialog = document.createElement('dialog');
        configDialog.id = 'yt-suite-config-dialog';
        
        configDialog.innerHTML = `
            <h2 style="margin: 0 0 20px 0; font-size: 18px;">⚙️ Suite Settings</h2>
            <div class="yt-suite-form-group">
                <label>Keyword Blacklist (Comma separated)</label>
                <textarea id="yt-suite-input-keywords">${STATE.keywords.join(', ')}</textarea>
            </div>
            <div class="yt-suite-form-group">
                <label>Channel Blacklist (Comma separated)</label>
                <textarea id="yt-suite-input-channels">${STATE.channels.join(', ')}</textarea>
            </div>
            <label class="yt-suite-form-checkbox">
                <input type="checkbox" id="yt-suite-input-shorts" ${STATE.removeShorts ? 'checked' : ''}>
                Remove Shorts Shelf
            </label>
            <div class="yt-suite-dialog-actions">
                <button class="yt-suite-btn yt-suite-btn-cancel" id="yt-suite-btn-close">Cancel</button>
                <button class="yt-suite-btn yt-suite-btn-save" id="yt-suite-btn-save">Save & Reload</button>
            </div>
        `;
        
        document.body.appendChild(configDialog);

        configDialog.querySelector('#yt-suite-btn-close').addEventListener('click', () => configDialog.close());
        configDialog.querySelector('#yt-suite-btn-save').addEventListener('click', () => {
            const parseInput = (str) => str.split(',').map(s => s.trim()).filter(s => s.length > 0);
            
            const newKeywords = parseInput(configDialog.querySelector('#yt-suite-input-keywords').value);
            const newChannels = parseInput(configDialog.querySelector('#yt-suite-input-channels').value);
            const newRemoveShorts = configDialog.querySelector('#yt-suite-input-shorts').checked;

            GM_setValue('yt_suite_keywords', newKeywords.join(', '));
            GM_setValue('yt_suite_channels', newChannels.join(', '));
            GM_setValue('yt_suite_remove_shorts', newRemoveShorts);

            STATE.keywords = newKeywords;
            STATE.channels = newChannels;
            STATE.removeShorts = newRemoveShorts;

            window.location.reload();
        });

        configDialog.addEventListener('click', (e) => {
            const rect = configDialog.getBoundingClientRect();
            const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                                rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
            if (!isInDialog) configDialog.close();
        });

        configDialog.showModal();
    };
    // =================================================

    // ================= HEADER BUTTON =================
    const injectHeaderButton = () => {
        // Try to find the header end element
        const masthead = document.querySelector('ytd-masthead');
        if (!masthead) return false;

        // YouTube uses shadow DOM for masthead
        const shadowRoot = masthead.shadowRoot;
        if (!shadowRoot) return false;

        const endContainer = shadowRoot.querySelector('#end');
        if (!endContainer) return false;

        // Check if button already exists
        if (document.getElementById('yt-suite-header-btn')) return true;

        const btn = document.createElement('button');
        btn.id = 'yt-suite-header-btn';
        btn.innerHTML = '⚙️ YT-Suite';
        btn.onclick = renderConfigDialog;
        endContainer.prepend(btn);
        
        log('Header button injected');
        return true;
    };

    // Retry header injection multiple times
    const injectHeaderButtonWithRetry = () => {
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryInject = () => {
            attempts++;
            if (injectHeaderButton()) {
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(tryInject, 500);
            } else {
                log('Failed to inject header button after', maxAttempts, 'attempts');
            }
        };
        
        tryInject();
    };
    // ================================================

    // ================= VIDEO PROCESSING =================
    const hideNode = (node) => {
        if (node && !node.classList.contains('yt-suite-hidden')) {
            node.classList.add('yt-suite-hidden');
        }
    };

    const extractVideoInfo = (card) => {
        try {
            // Extract video ID
            const anchor = card.querySelector('a#thumbnail, a#video-title-link, a#video-title, a.ytd-rich-grid-media');
            let videoId = null;
            if (anchor) {
                const href = anchor.getAttribute('href');
                if (href) {
                    const match = href.match(/[?&]v=([^&#]+)/);
                    videoId = match ? match[1] : href;
                }
            }
            
            // Extract title
            const titleEl = card.querySelector('#video-title, yt-lockup-metadata-view-model, h3.yt-core-attributed-string');
            const titleText = titleEl ? String(titleEl.textContent || titleEl.innerText || '').trim() : '';
            
            // Extract channel name
            const channelEl = card.querySelector('ytd-channel-name a, #channel-name a, yt-lockup-metadata-view-model a');
            const channelName = channelEl ? String(channelEl.textContent || channelEl.innerText || '').trim() : '';

            return { videoId, titleText, channelName };
        } catch (e) {
            log('Error extracting video info:', e);
            return { videoId: null, titleText: '', channelName: '' };
        }
    };

    const processCard = (card) => {
        try {
            // Skip if already processed with same video ID
            const info = extractVideoInfo(card);
            if (!info || !info.videoId) {
                return;
            }

            // Skip if already hidden
            if (card.classList.contains('yt-suite-hidden')) {
                return;
            }

            // Check for ads
            const isAd = card.querySelector('ytd-ad-slot-renderer, .badge-style-type-ad, [class*="ad"]');
            if (isAd) {
                hideNode(card);
                return;
            }

            // Check for Shorts shelf
            if (STATE.removeShorts) {
                const shortsShelf = card.closest('ytd-rich-shelf-renderer[is-shorts]');
                const hasShortsIcon = card.closest('ytd-rich-section-renderer')?.querySelector('[overlay-style="SHORTS"], yt-icon[icon="shorts_logo"]');
                if (shortsShelf || hasShortsIcon) {
                    hideNode(shortsShelf || card.closest('ytd-rich-shelf-renderer') || card);
                    return;
                }
            }

            // Check keyword blacklist
            const matchesKeyword = STATE.keywords.some(keyword => 
                String(info.titleText || '').toLowerCase().includes(String(keyword || '').toLowerCase())
            );

            // Check channel blacklist
            const matchesChannel = STATE.channels.some(blocked => 
                String(info.channelName || '').toLowerCase() === String(blocked || '').toLowerCase()
            );

            if (matchesKeyword || matchesChannel) {
                hideNode(card);
                log('Blocked:', info.titleText || info.channelName);
                return;
            }

            // Add block button to thumbnail
            const thumbnailContainer = card.querySelector('ytd-thumbnail, #thumbnail, .yt-core-image');
            if (thumbnailContainer && !thumbnailContainer.querySelector('.yt-suite-block-btn')) {
                const blockBtn = document.createElement('button');
                blockBtn.className = 'yt-suite-block-btn';
                blockBtn.innerHTML = '🚫';
                blockBtn.title = 'Block Channel: ' + (info.channelName || 'Unknown');
                blockBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addChannelToBlacklist(info.channelName || '');
                    hideNode(card);
                };
                thumbnailContainer.style.position = 'relative';
                thumbnailContainer.appendChild(blockBtn);
            }
        } catch (e) {
            log('Error processing card:', e);
        }
    };

    const addChannelToBlacklist = (channelName) => {
        if (!channelName || STATE.channels.includes(channelName)) return;
        
        STATE.channels.push(channelName);
        GM_setValue('yt_suite_channels', STATE.channels.join(', '));
        
        GM_notification({
            text: 'Channel "' + channelName + '" added to blocklist!',
            title: 'YT Suite',
            timeout: 3000
        });
        
        log('Added channel to blacklist:', channelName);
    };
    // ================================================

    // ================= MAIN PROCESSING =================
    const runFullSweep = () => {
        injectHeaderButton();
        
        // Process all video cards
        document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer').forEach(processCard);
        
        // Process sections (for Shorts shelf)
        if (STATE.removeShorts) {
            document.querySelectorAll('ytd-rich-shelf-renderer[is-shorts], ytd-rich-section-renderer').forEach(section => {
                const hasShorts = section.querySelector('[overlay-style="SHORTS"], yt-icon[icon="shorts_logo"]');
                if (hasShorts || section.getAttribute('is-shorts') === 'true') {
                    hideNode(section);
                }
            });
        }
    };

    const initObserver = () => {
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;
            
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldProcess = true;
                    
                    // Process newly added nodes immediately
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'YTD-MASTHEAD') {
                                injectHeaderButton();
                            } else if (['YTD-RICH-ITEM-RENDERER', 'YTD-VIDEO-RENDERER', 'YTD-COMPACT-VIDEO-RENDERER'].includes(node.tagName)) {
                                processCard(node);
                            }
                        }
                    }
                }
            }
            
            if (shouldProcess) {
                requestAnimationFrame(runFullSweep);
            }
        });

        observer.observe(document.documentElement, { 
            childList: true, 
            subtree: true 
        });
    };
    // ================================================

    // ================= INITIALIZATION =================
    const init = () => {
        log('Initializing YouTube Suite...');
        injectStyles();
        
        // Wait a bit for YouTube to fully load
        setTimeout(() => {
            runFullSweep();
            injectHeaderButtonWithRetry();
            initObserver();
        }, 500);
    };

    // Register menu command
    GM_registerMenuCommand('⚙️ Configure YT Suite', renderConfigDialog);

    // Start when page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-run on SPA navigation
    document.addEventListener('yt-navigate-finish', () => {
        setTimeout(runFullSweep, 300);
    });
    // ================================================
})();
