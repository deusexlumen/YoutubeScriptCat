// ==UserScript==
// @name         YouTube Homepage Suite
// @namespace    ScriptCatCore.YT
// @version      8.1.0
// @description  Modulares Power-User-Toolkit für YouTube: Feed-Filter, Player-Control, Decluttering, SponsorBlock, Transkript-Export, Shortcuts. CSS-first, SPA-fest, Trusted-Types-sicher.
// @author       ScriptCat-Core
// @match        *://www.youtube.com/*
// @exclude      *://*.youtube.com/embed/*
// @exclude      *://*.youtube.com/live_chat*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      sponsor.ajay.app
// @run-at       document-start
// @noframes
// ==/UserScript==

/* global GM_getValue, GM_setValue, GM_addStyle, GM_registerMenuCommand, GM_xmlhttpRequest, unsafeWindow */

(() => {
    'use strict';

    // ════════════════════════════════════════════════════════════
    // 0 | ENVIRONMENT BRIDGE
    // ════════════════════════════════════════════════════════════

    /** Page-World-Fenster. Nötig, weil Firefox/Xray Polymer-Methoden sonst wegfiltert. */
    const PAGE = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;

    const GM = {
        get: (k, d) => (typeof GM_getValue === 'function' ? GM_getValue(k, d) : d),
        set: (k, v) => { if (typeof GM_setValue === 'function') GM_setValue(k, v); },
        menu: (t, f) => { if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand(t, f); },
        xhr: typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : null,
        style: (css) => {
            if (typeof GM_addStyle === 'function') { try { return GM_addStyle(css); } catch { /* fallthrough */ } }
            const el = document.createElement('style');
            el.textContent = css;
            (document.head || document.documentElement).appendChild(el);
            return el;
        }
    };

    const LOG_PREFIX = '%c[YT-Suite]';
    const LOG_STYLE = 'color:#3ea6ff;font-weight:600';
    const log = (...a) => { if (CFG?.options?.debug) console.log(LOG_PREFIX, LOG_STYLE, ...a); };
    const warn = (...a) => console.warn('[YT-Suite]', ...a);

    // ════════════════════════════════════════════════════════════
    // 1 | SELEKTOR-KATALOG
    //     Zentral, weil YouTube regelmäßig Renderer austauscht.
    //     Ein Ort zum Nachziehen statt 30 verstreute Strings.
    // ════════════════════════════════════════════════════════════

    const SEL = {
        card: [
            'ytd-rich-item-renderer',
            'ytd-video-renderer',
            'ytd-compact-video-renderer',
            'ytd-grid-video-renderer',
            'ytd-playlist-video-renderer',
            'yt-lockup-view-model'
        ].join(','),
        title: [
            '#video-title',
            'a#video-title-link',
            'h3 a.yt-lockup-metadata-view-model-wiz__title',
            '.yt-lockup-metadata-view-model-wiz__title',
            'h3 .yt-core-attributed-string'
        ].join(','),
        channel: [
            'ytd-channel-name a',
            'ytd-channel-name #text',
            '#channel-name a',
            '#channel-name #text',
            '.yt-content-metadata-view-model-wiz__metadata-text',
            'yt-content-metadata-view-model a'
        ].join(','),
        thumb: [
            'ytd-thumbnail',
            'a#thumbnail',
            '#thumbnail',
            'yt-thumbnail-view-model',
            '.yt-lockup-view-model-wiz__content-image',
            '.yt-thumbnail-view-model__image'
        ].join(','),
        progress: [
            'ytd-thumbnail-overlay-resume-playback-renderer #progress',
            '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
            '.ytProgressBarLineProgressBarPlayedFill',
            '#progress'
        ].join(','),
        ad: [
            'ytd-ad-slot-renderer',
            'ytd-in-feed-ad-layout-renderer',
            'ytd-display-ad-renderer',
            'ytd-promoted-sparkles-web-renderer',
            'ytd-promoted-video-renderer',
            'ytd-companion-slot-renderer',
            'ytd-action-companion-ad-renderer',
            '.badge-style-type-ad'
        ].join(','),
        player: '#movie_player',
        video: 'video.html5-main-video, #movie_player video',
        masthead: 'ytd-masthead #end, ytd-masthead #buttons'
    };

    const AD_BADGE_WORDS = ['gesponsert', 'sponsored', 'werbung', 'anzeige'];

    // ════════════════════════════════════════════════════════════
    // 2 | KONFIGURATION
    //     Schema wird aus der Modul-Registry abgeleitet → keine
    //     doppelte Wahrheit zwischen Feature-Liste und Defaults.
    // ════════════════════════════════════════════════════════════

    const STORAGE_KEY = 'yts_config_v8';
    let CFG = { modules: {}, options: {} };
    let generation = 0;

    const OPTION_DEFAULTS = {
        keywords: ['spoiler', 'clickbait'],
        channels: [],
        watchedThreshold: 90,
        quality: 'hd1080',
        defaultSpeed: 1,
        speedStep: 0.25,
        volumeStep: 5,
        sponsorCategories: ['sponsor', 'selfpromo', 'interaction'],
        transcriptFormat: 'txt',
        debug: false
    };

    const asList = (v, fallback) => {
        if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
        if (typeof v === 'string') {
            const parts = v.split(',').map(s => s.trim()).filter(Boolean);
            return parts.length ? parts : [...fallback];
        }
        return [...fallback];
    };

    const clamp = (v, min, max, fb) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
    };

    const normalize = (raw) => {
        const modules = {};
        for (const m of MODULES) {
            modules[m.id] = raw?.modules?.[m.id] !== undefined ? raw.modules[m.id] === true : m.default === true;
        }
        const o = raw?.options || {};
        return {
            modules,
            options: {
                keywords: asList(o.keywords, OPTION_DEFAULTS.keywords),
                channels: asList(o.channels, OPTION_DEFAULTS.channels),
                watchedThreshold: clamp(o.watchedThreshold, 1, 100, OPTION_DEFAULTS.watchedThreshold),
                quality: typeof o.quality === 'string' ? o.quality : OPTION_DEFAULTS.quality,
                defaultSpeed: clamp(o.defaultSpeed, 0.25, 4, OPTION_DEFAULTS.defaultSpeed),
                speedStep: clamp(o.speedStep, 0.05, 1, OPTION_DEFAULTS.speedStep),
                volumeStep: clamp(o.volumeStep, 1, 25, OPTION_DEFAULTS.volumeStep),
                sponsorCategories: asList(o.sponsorCategories, OPTION_DEFAULTS.sponsorCategories),
                transcriptFormat: ['txt', 'srt', 'md'].includes(o.transcriptFormat) ? o.transcriptFormat : 'txt',
                debug: o.debug === true
            }
        };
    };

    const loadConfig = () => {
        let raw = null;
        try {
            const stored = GM.get(STORAGE_KEY, null);
            if (stored) raw = typeof stored === 'string' ? JSON.parse(stored) : stored;
        } catch (e) { warn('Config unlesbar:', e); }

        if (!raw) raw = migrateLegacy();
        CFG = normalize(raw || {});
        compileMatchers();
    };

    /** Übernimmt v6/v7-Stände, damit niemand seine Blacklists neu tippt. */
    const migrateLegacy = () => {
        try {
            const v7 = GM.get('yts_config_v7', null);
            if (v7) {
                const p = typeof v7 === 'string' ? JSON.parse(v7) : v7;
                warn('Migriere v7 → v8');
                return {
                    modules: { shorts: p.removeShorts, feedAds: p.removeAds, watched: p.hideWatched },
                    options: { keywords: p.keywords, channels: p.channels, watchedThreshold: p.watchedThreshold, debug: p.debug }
                };
            }
            const kw = GM.get('yt_suite_keywords', null);
            const ch = GM.get('yt_suite_channels', null);
            if (kw || ch) {
                warn('Migriere v6 → v8');
                return { options: { keywords: kw, channels: ch } };
            }
        } catch (e) { warn('Migration fehlgeschlagen:', e); }
        return null;
    };

    const saveConfig = () => {
        try { GM.set(STORAGE_KEY, JSON.stringify(CFG)); } catch (e) { warn('Speichern fehlgeschlagen:', e); }
    };

    const on = (id) => CFG.modules[id] === true;
    const opt = (key) => CFG.options[key];

    // ════════════════════════════════════════════════════════════
    // 3 | MATCHER (Substring + /regex/-Syntax)
    // ════════════════════════════════════════════════════════════

    let kwMatchers = [];
    let chMatchers = [];

    const compileOne = (pattern) => {
        const m = /^\/(.+)\/([gimsuy]*)$/.exec(pattern);
        if (m) {
            try {
                const flags = (m[2].includes('i') ? m[2] : `${m[2]}i`).replace('g', '');
                return new RegExp(m[1], flags);
            } catch { warn(`Ungültige Regex: ${pattern}`); }
        }
        return pattern.toLowerCase();
    };

    const compileMatchers = () => {
        kwMatchers = opt('keywords').map(compileOne);
        chMatchers = opt('channels').map(compileOne);
    };

    const hitsKeyword = (text) => {
        if (!text) return false;
        const l = text.toLowerCase();
        return kwMatchers.some(m => (m instanceof RegExp ? m.test(text) : l.includes(m)));
    };

    /** Kanäle exakt — sonst blockt "Kurz" auch "Kurzgesagt". */
    const hitsChannel = (name) => {
        if (!name) return false;
        const l = name.toLowerCase();
        return chMatchers.some(m => (m instanceof RegExp ? m.test(name) : l === m));
    };

    // ════════════════════════════════════════════════════════════
    // 4 | DOM-UTILITIES (observerbasiert, keine Polling-Timer)
    // ════════════════════════════════════════════════════════════

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const text = (root, sel) => {
        const el = root.querySelector(sel);
        if (!el) return '';
        return (el.getAttribute('title') || el.textContent || '').trim().replace(/\s+/g, ' ');
    };

    /** Wartet einmalig auf ein Element. Timeout bricht sauber ab statt endlos zu observen. */
    const waitFor = (selector, timeout = 12000) => new Promise((resolve) => {
        const hit = $(selector);
        if (hit) return resolve(hit);
        const mo = new MutationObserver(() => {
            const el = $(selector);
            if (!el) return;
            mo.disconnect(); clearTimeout(t); resolve(el);
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
        const t = setTimeout(() => { mo.disconnect(); resolve(null); }, timeout);
    });

    const idle = PAGE.requestIdleCallback || ((cb) => requestAnimationFrame(() => cb({ timeRemaining: () => 8 })));

    const makeThrottle = (fn, timeout = 250) => {
        let pending = false;
        return () => {
            if (pending) return;
            pending = true;
            idle(() => { pending = false; fn(); }, { timeout });
        };
    };

    const download = (filename, content, mime = 'text/plain;charset=utf-8') => {
        const url = URL.createObjectURL(new Blob([content], { type: mime }));
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    };

    const sanitize = (s) => s.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120).trim() || 'youtube';

    // ════════════════════════════════════════════════════════════
    // 5 | HUD / TOAST
    // ════════════════════════════════════════════════════════════

    let toastEl = null;
    let toastTimer = null;

    const toast = (message, ms = 1400) => {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'yts-toast';
            toastEl.setAttribute('role', 'status');
            toastEl.setAttribute('aria-live', 'polite');
        }
        const host = $(SEL.player) || document.body;
        if (toastEl.parentElement !== host) host.appendChild(toastEl);
        toastEl.textContent = message;
        toastEl.classList.add('yts-toast--on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('yts-toast--on'), ms);
    };

    // ════════════════════════════════════════════════════════════
    // 6 | PLAYER-BRIDGE
    //     Kapselt die undokumentierte Polymer-API an genau einer
    //     Stelle. Bricht YouTube etwas, stirbt nur diese Datei-Zone.
    // ════════════════════════════════════════════════════════════

    const Player = {
        get el() { return PAGE.document.getElementById('movie_player'); },
        get video() { return PAGE.document.querySelector(SEL.video); },
        get id() {
            const p = new URL(location.href).searchParams.get('v');
            if (p) return p;
            const s = /\/shorts\/([\w-]+)/.exec(location.pathname);
            return s ? s[1] : null;
        },
        call(method, ...args) {
            const el = this.el;
            if (!el || typeof el[method] !== 'function') return undefined;
            try { return el[method](...args); } catch (e) { warn(`Player.${method}:`, e); return undefined; }
        },
        get volume() { const v = this.call('getVolume'); return Number.isFinite(v) ? v : null; },
        set volume(v) { this.call('unMute'); this.call('setVolume', Math.round(Math.min(100, Math.max(0, v)))); },
        get speed() { return this.video?.playbackRate ?? 1; },
        set speed(r) { const v = this.video; if (v) v.playbackRate = Math.min(4, Math.max(0.0625, r)); },
        get time() { return this.video?.currentTime ?? 0; },
        set time(t) { const v = this.video; if (v) v.currentTime = t; },
        isAdPlaying() { return !!this.el?.classList.contains('ad-showing'); }
    };

    const QUALITY_LEVELS = [
        ['auto', 'Automatisch'], ['highres', '4320p+'], ['hd2160', '2160p'], ['hd1440', '1440p'],
        ['hd1080', '1080p'], ['hd720', '720p'], ['large', '480p'], ['medium', '360p'], ['small', '240p']
    ];

    // ════════════════════════════════════════════════════════════
    // 7 | MODUL-REGISTRY
    //     Jedes Feature ist ein Objekt mit optionalen Hooks:
    //       css       → deklarative Regeln, gated per html.yts-m-<id>
    //       onCard    → pro Videokarte im Feed
    //       onNav     → nach jeder SPA-Navigation
    //       onEnable / onDisable → Live-Umschaltung
    //     Das Settings-Panel wird daraus generiert. Eine Wahrheit.
    // ════════════════════════════════════════════════════════════

    const G = { FEED: 'Feed & Filter', CLUTTER: 'Aufräumen', PLAYER: 'Player', TOOLS: 'Werkzeuge' };

    const MODULES = [

        // ───────── FEED & FILTER ─────────
        {
            id: 'shorts', group: G.FEED, default: true,
            label: 'Shorts entfernen',
            hint: 'Feed, Suche, Sidebar, Guide, Chip-Leiste',
            css: [
                'ytd-rich-shelf-renderer[is-shorts]',
                'ytd-reel-shelf-renderer',
                'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
                'ytd-rich-section-renderer:has(ytd-reel-shelf-renderer)',
                'ytd-item-section-renderer:has(ytd-reel-shelf-renderer)',
                'ytd-rich-item-renderer:has(ytm-shorts-lockup-view-model)',
                'ytd-rich-item-renderer:has(ytd-reel-item-renderer)',
                'ytd-rich-item-renderer:has(a[href^="/shorts/"])',
                'ytd-video-renderer:has(a[href^="/shorts/"])',
                'ytd-compact-video-renderer:has(a[href^="/shorts/"])',
                'yt-lockup-view-model:has(a[href^="/shorts/"])',
                'grid-shelf-view-model',
                'ytd-guide-entry-renderer:has(a[href="/shorts"])',
                'ytd-mini-guide-entry-renderer:has(a[href="/shorts"])',
                'yt-chip-cloud-chip-renderer:has([title="Shorts"])'
            ]
        },
        {
            id: 'feedAds', group: G.FEED, default: true,
            label: 'Feed-Werbung & Promo-Banner',
            hint: 'Ad-Slots, Mealbar, Umfragen, Statement-Banner',
            css: [
                'ytd-ad-slot-renderer', 'ytd-in-feed-ad-layout-renderer', 'ytd-display-ad-renderer',
                'ytd-promoted-sparkles-web-renderer', 'ytd-promoted-video-renderer',
                'ytd-companion-slot-renderer', 'ytd-action-companion-ad-renderer',
                'ytd-statement-banner-renderer', 'ytd-brand-video-shelf-renderer',
                'ytd-brand-video-singleton-renderer', 'ytd-mealbar-promo-renderer',
                'ytd-inline-survey-renderer', '#masthead-ad',
                'tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer)',
                'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
                'ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer)',
                'ytd-rich-section-renderer:has(ytd-statement-banner-renderer)',
                'ytd-rich-section-renderer:has(ytd-inline-survey-renderer)'
            ],
            onCard(card) {
                if (card.matches(SEL.ad) || card.querySelector(SEL.ad)) return 'Werbung';
                const badge = card.querySelector('ytd-badge-supported-renderer, badge-shape');
                if (!badge) return false;
                const label = (badge.getAttribute('aria-label') || badge.textContent || '').toLowerCase();
                return AD_BADGE_WORDS.some(w => label.includes(w)) ? 'Werbung' : false;
            }
        },
        {
            id: 'keywords', group: G.FEED, default: true,
            label: 'Keyword-Blacklist',
            hint: 'Titeltreffer. Unterstützt /regex/-Syntax.',
            settings: [{ key: 'keywords', type: 'list', label: 'Begriffe', placeholder: 'spoiler, clickbait, /reagiert|reaktion/' }],
            onCard(card) { return hitsKeyword(text(card, SEL.title)) ? 'Keyword' : false; }
        },
        {
            id: 'channels', group: G.FEED, default: true,
            label: 'Kanal-Blacklist + Block-Button',
            hint: 'Exakter Namensvergleich. Hover über Thumbnail → ✕',
            settings: [{ key: 'channels', type: 'list', label: 'Kanäle', placeholder: 'Beispielkanal, NochEinKanal' }],
            onCard(card) {
                const ch = text(card, SEL.channel);
                if (hitsChannel(ch)) return 'Kanal';
                attachBlockButton(card);
                return false;
            }
        },
        {
            id: 'watched', group: G.FEED, default: false,
            label: 'Gesehene Videos ausblenden',
            hint: 'Anhand des Fortschrittsbalkens im Thumbnail',
            settings: [{ key: 'watchedThreshold', type: 'number', label: 'Ab Fortschritt (%)', min: 1, max: 100 }],
            onCard(card) {
                const bar = card.querySelector(SEL.progress);
                if (!bar) return false;
                let pct = Number.parseFloat(bar.style.width);
                if (!Number.isFinite(pct)) {
                    const outer = bar.parentElement?.getBoundingClientRect().width || 0;
                    pct = outer > 0 ? (bar.getBoundingClientRect().width / outer) * 100 : 0;
                }
                return pct >= opt('watchedThreshold') ? 'Gesehen' : false;
            }
        },
        {
            id: 'noLive', group: G.FEED, default: false,
            label: 'Livestreams & Premieren ausblenden',
            css: [
                'ytd-rich-item-renderer:has(ytd-badge-supported-renderer .badge-style-type-live-now)',
                'ytd-video-renderer:has(.badge-style-type-live-now)',
                'ytd-rich-item-renderer:has(ytd-thumbnail-overlay-time-status-renderer[overlay-style="LIVE"])'
            ]
        },

        // ───────── AUFRÄUMEN ─────────
        {
            id: 'zenHome', group: G.CLUTTER, default: false,
            label: 'Startseiten-Feed leeren (Fokusmodus)',
            hint: 'Abos & Suche bleiben nutzbar. Gegen den Doomscroll.',
            css: ['ytd-browse[page-subtype="home"] ytd-rich-grid-renderer #contents']
        },
        {
            id: 'noSidebar', group: G.CLUTTER, default: false,
            label: 'Empfehlungen neben dem Player ausblenden',
            css: ['#secondary.ytd-watch-flexy #related', 'ytd-watch-next-secondary-results-renderer']
        },
        {
            id: 'noComments', group: G.CLUTTER, default: false,
            label: 'Kommentare ausblenden',
            css: ['ytd-comments#comments', '#comments.ytd-watch-flexy']
        },
        {
            id: 'noLiveChat', group: G.CLUTTER, default: false,
            label: 'Live-Chat ausblenden',
            css: ['#chat-container', 'ytd-live-chat-frame']
        },
        {
            id: 'noEndscreen', group: G.CLUTTER, default: true,
            label: 'Endcards & Endscreen-Overlays entfernen',
            hint: 'Die Kacheln, die dir die letzten 20 Sekunden zukleben',
            css: ['.ytp-ce-element', '.ytp-endscreen-content', '.iv-branding', '.annotation']
        },
        {
            id: 'noHoverPreview', group: G.CLUTTER, default: false,
            label: 'Autoplay-Vorschau beim Hover deaktivieren',
            css: ['ytd-video-preview', '#video-preview', 'ytd-moving-thumbnail-renderer']
        },
        {
            id: 'fullTitles', group: G.CLUTTER, default: true,
            label: 'Vollständige Titel anzeigen',
            hint: 'Kein "…"-Abschnitt mehr im Feed',
            css: [] // reines Overriding, siehe extraCss unten
        },

        // ───────── PLAYER ─────────
        {
            id: 'volumeScroll', group: G.PLAYER, default: true,
            label: 'Lautstärke per Mausrad über dem Player',
            settings: [{ key: 'volumeStep', type: 'number', label: 'Schrittweite (%)', min: 1, max: 25 }],
            onNav() { PlayerFeatures.bindWheel(); }
        },
        {
            id: 'speedControl', group: G.PLAYER, default: true,
            label: 'Geschwindigkeits-Steuerung',
            hint: 'Alt + . schneller, Alt + , langsamer, Alt + 0 zurück auf 1×',
            settings: [
                { key: 'defaultSpeed', type: 'number', label: 'Startgeschwindigkeit', min: 0.25, max: 4, step: 0.25 },
                { key: 'speedStep', type: 'number', label: 'Schrittweite', min: 0.05, max: 1, step: 0.05 }
            ],
            onNav() { PlayerFeatures.applyDefaultSpeed(); }
        },
        {
            id: 'forceQuality', group: G.PLAYER, default: false,
            label: 'Wiedergabequalität erzwingen',
            settings: [{ key: 'quality', type: 'select', label: 'Ziel', options: QUALITY_LEVELS }],
            onNav() { PlayerFeatures.forceQuality(); }
        },
        {
            id: 'forceTheater', group: G.PLAYER, default: false,
            label: 'Kinomodus automatisch aktivieren',
            onNav() { PlayerFeatures.forceTheater(); }
        },
        {
            id: 'noAutoplay', group: G.PLAYER, default: true,
            label: 'Autoplay des nächsten Videos deaktivieren',
            onNav() { PlayerFeatures.killAutoplay(); }
        },
        {
            id: 'alwaysProgress', group: G.PLAYER, default: false,
            label: 'Fortschrittsbalken dauerhaft einblenden',
            css: ['.ytp-chrome-bottom { opacity: 1 !important; }']
        },
        {
            id: 'autoSkipAd', group: G.PLAYER, default: false,
            label: 'Überspringbare Anzeigen automatisch überspringen',
            hint: 'Klickt nur den Skip-Button, den YouTube selbst anbietet.',
            onNav() { PlayerFeatures.watchSkipButton(); }
        },
        {
            id: 'sponsorBlock', group: G.PLAYER, default: false,
            label: 'SponsorBlock-Segmente überspringen',
            hint: 'Fragt die Community-API (gehashter Video-ID-Präfix) ab.',
            settings: [{
                key: 'sponsorCategories', type: 'list', label: 'Kategorien',
                placeholder: 'sponsor, selfpromo, interaction, intro, outro, music_offtopic, filler'
            }],
            onNav() { SponsorBlock.load(); }
        },

        // ───────── WERKZEUGE ─────────
        {
            id: 'transcript', group: G.TOOLS, default: true,
            label: 'Transkript-Export',
            hint: 'Alt + D oder Button unter dem Video',
            settings: [{
                key: 'transcriptFormat', type: 'select', label: 'Format',
                options: [['txt', 'Text'], ['srt', 'SRT-Untertitel'], ['md', 'Markdown mit Zeitmarken']]
            }],
            onNav() { Transcript.injectButton(); }
        },
        {
            id: 'shortcuts', group: G.TOOLS, default: true,
            label: 'Power-User-Shortcuts',
            hint: 'Vollständige Liste im Hilfe-Tab (Alt + H)'
        },
        {
            id: 'counter', group: G.TOOLS, default: true,
            label: 'Trefferzähler im Masthead',
            hint: 'Zeigt, wie viel diese Sitzung geschluckt hat'
        }
    ];

    const MODULE_BY_ID = new Map(MODULES.map(m => [m.id, m]));

    const VERSION = '8.1.0';

    /** SponsorBlock-Kategorien mit Klartext für die Hilfe-Sektion. */
    const SPONSOR_CATEGORIES = [
        ['sponsor', 'Bezahlte Produktplatzierung'],
        ['selfpromo', 'Eigenwerbung, Merch, Patreon'],
        ['interaction', 'Aufforderung zu Like und Abo'],
        ['intro', 'Intro-Animation ohne Inhalt'],
        ['outro', 'Abspann mit Endcards'],
        ['preview', 'Zusammenfassung des Videos vorab'],
        ['music_offtopic', 'Nicht-musikalische Passagen in Musikvideos'],
        ['filler', 'Abschweifungen und Füllmaterial']
    ];

    /**
     * Eine Wahrheit für Tastatur-Handler UND Hilfe-Tabelle.
     * Bewusst ohne Alt+Pfeil (Browser-Verlauf), Alt+D (Adressleiste)
     * und Alt+F (Chrome-Menü).
     */
    const SHORTCUTS = [
        { code: 'KeyY', combo: 'Alt + Y', desc: 'Einstellungen öffnen', always: true, run: () => Panel.open() },
        { code: 'KeyH', combo: 'Alt + H', desc: 'Hilfe öffnen', always: true, run: () => Panel.open(HELP_TAB) },
        { code: 'KeyS', combo: 'Alt + S', desc: 'Shorts an/aus', run: () => toggleModule('shorts') },
        { code: 'KeyK', combo: 'Alt + K', desc: 'Kommentare an/aus', run: () => toggleModule('noComments') },
        { code: 'KeyR', combo: 'Alt + R', desc: 'Empfehlungs-Sidebar an/aus', run: () => toggleModule('noSidebar') },
        { code: 'KeyZ', combo: 'Alt + Z', desc: 'Fokusmodus an/aus (Startseite leeren)', run: () => toggleModule('zenHome') },
        { code: 'KeyT', combo: 'Alt + T', desc: 'Kinomodus umschalten', run: () => $('.ytp-size-button')?.click() },
        { code: 'KeyX', combo: 'Alt + X', desc: 'Transkript speichern', run: () => Transcript.run() },
        { code: 'Period', combo: 'Alt + .', desc: 'Wiedergabe schneller', run: () => PlayerFeatures.nudgeSpeed(+1) },
        { code: 'Comma', combo: 'Alt + ,', desc: 'Wiedergabe langsamer', run: () => PlayerFeatures.nudgeSpeed(-1) },
        { code: 'Digit0', combo: 'Alt + 0', desc: 'Tempo zurück auf 1×', run: () => PlayerFeatures.resetSpeed() }
    ];

    // ════════════════════════════════════════════════════════════
    // 8 | STYLES
    //     Modul-CSS wird generiert und über html.yts-m-<id> gegated.
    //     Deshalb ist jedes CSS-Feature ohne Reload umschaltbar und
    //     greift schon vor dem ersten Paint.
    // ════════════════════════════════════════════════════════════

    const buildModuleCss = () => MODULES
        .filter(m => Array.isArray(m.css) && m.css.length)
        .map((m) => {
            const gate = `html.yts-m-${m.id} `;
            const withBlocks = m.css.filter(s => s.includes('{'));
            const plain = m.css.filter(s => !s.includes('{'));
            const out = [];
            if (plain.length) out.push(`${plain.map(s => gate + s).join(',\n')} { display: none !important; }`);
            for (const rule of withBlocks) out.push(gate + rule);
            return out.join('\n');
        }).join('\n');

    const BASE_CSS = `
.yts-hidden { display: none !important; }

/* Vollständige Titel */
html.yts-m-fullTitles #video-title,
html.yts-m-fullTitles .yt-lockup-metadata-view-model-wiz__title {
    display: block !important;
    max-height: none !important;
    -webkit-line-clamp: unset !important;
    overflow: visible !important;
    white-space: normal !important;
}

/* Block-Button auf dem Thumbnail */
.yts-block {
    position: absolute; top: 6px; right: 6px;
    inline-size: 30px; block-size: 30px;
    display: none; align-items: center; justify-content: center;
    border: none; border-radius: 50%;
    background: rgba(0,0,0,.82); color: #fff;
    font-size: 15px; line-height: 1; cursor: pointer;
    z-index: 60; opacity: 0;
    transition: opacity .12s ease, background-color .12s ease, transform .12s ease;
}
ytd-rich-item-renderer:hover .yts-block,
ytd-video-renderer:hover .yts-block,
ytd-compact-video-renderer:hover .yts-block,
ytd-grid-video-renderer:hover .yts-block,
yt-lockup-view-model:hover .yts-block,
.yts-block:focus-visible { display: flex; opacity: 1; }
.yts-block:hover { background: #c00; transform: scale(1.08); }
.yts-block:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

/* Masthead-Button */
#yts-btn {
    display: inline-flex; align-items: center; gap: 6px;
    height: 32px; padding: 0 14px; margin-inline-end: 8px;
    border: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,.2));
    border-radius: 16px;
    background: var(--yt-spec-badge-chip-background, rgba(255,255,255,.08));
    color: var(--yt-spec-text-primary, #f1f1f1);
    font: 500 13px/1 "Roboto", "Arial", sans-serif;
    cursor: pointer; white-space: nowrap;
}
#yts-btn:hover { background: var(--yt-spec-10-percent-layer, rgba(255,255,255,.15)); }
#yts-count {
    min-inline-size: 18px; padding: 1px 5px; border-radius: 9px;
    background: var(--yt-spec-call-to-action, #3ea6ff);
    color: var(--yt-spec-static-brand-black, #0f0f0f);
    font-size: 11px; font-weight: 700;
}

/* Transkript-Button in der Aktionsleiste */
#yts-transcript-btn {
    display: inline-flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 16px;
    border: none; border-radius: 18px;
    background: var(--yt-spec-badge-chip-background, rgba(255,255,255,.1));
    color: var(--yt-spec-text-primary, #f1f1f1);
    font: 500 14px "Roboto", sans-serif; cursor: pointer;
    margin-inline-start: 8px;
}
#yts-transcript-btn:hover { background: var(--yt-spec-10-percent-layer, rgba(255,255,255,.2)); }

/* HUD */
.yts-toast {
    position: absolute; left: 50%; bottom: 12%;
    transform: translateX(-50%) translateY(6px);
    padding: 8px 16px; border-radius: 6px;
    background: rgba(0,0,0,.85); color: #fff;
    font: 500 14px "Roboto", sans-serif;
    pointer-events: none; opacity: 0; z-index: 2147483000;
    transition: opacity .15s ease, transform .15s ease;
}
.yts-toast--on { opacity: 1; transform: translateX(-50%) translateY(0); }
body > .yts-toast { position: fixed; bottom: 32px; }

/* ═══ Settings-Panel ═══ */
#yts-panel {
    inline-size: min(760px, calc(100vw - 32px));
    block-size: min(84vh, 740px);
    padding: 0; border: 1px solid var(--yt-spec-10-percent-layer, #303030);
    border-radius: 14px;
    background: var(--yt-spec-menu-background, var(--yt-spec-base-background, #212121));
    color: var(--yt-spec-text-primary, #f1f1f1);
    font-family: "Roboto", "Arial", sans-serif;
    box-shadow: 0 24px 64px rgba(0,0,0,.6);
    overflow: hidden;
}
#yts-panel::backdrop { background: rgba(0,0,0,.65); backdrop-filter: blur(3px); }
.yts-shell { display: flex; block-size: 100%; }

/* ── Seitenleiste ── */
.yts-rail {
    flex: none; inline-size: 208px;
    display: flex; flex-direction: column;
    padding: 16px 10px;
    background: var(--yt-spec-general-background-a, rgba(0,0,0,.22));
    border-inline-end: 1px solid var(--yt-spec-10-percent-layer, #303030);
}
.yts-brand { display: flex; align-items: baseline; gap: 6px; padding: 0 10px 14px; }
.yts-brand b { font-size: 15px; font-weight: 600; letter-spacing: -.2px; }
.yts-brand span { font-size: 11px; color: var(--yt-spec-text-secondary, #aaa); }
.yts-rail nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.yts-tab {
    display: flex; align-items: center; gap: 8px;
    inline-size: 100%; padding: 9px 10px;
    border: none; border-radius: 8px; background: transparent;
    color: var(--yt-spec-text-secondary, #aaa);
    font: 500 13px "Roboto", sans-serif; text-align: start; cursor: pointer;
    transition: background-color .12s ease, color .12s ease;
}
.yts-tab:hover { background: var(--yt-spec-10-percent-layer, rgba(255,255,255,.07)); }
.yts-tab[aria-selected="true"] {
    background: var(--yt-spec-10-percent-layer, rgba(255,255,255,.12));
    color: var(--yt-spec-text-primary, #f1f1f1);
}
.yts-tab .yts-tab-label { flex: 1; }
.yts-tab .yts-pill {
    flex: none; padding: 1px 7px; border-radius: 9px;
    background: var(--yt-spec-badge-chip-background, rgba(255,255,255,.1));
    font-size: 11px; font-variant-numeric: tabular-nums;
}
.yts-tab[aria-selected="true"] .yts-pill { background: var(--yt-spec-call-to-action, #3ea6ff); color: var(--yt-spec-static-brand-black, #0f0f0f); }
.yts-rail-foot { padding: 12px 10px 0; font-size: 11px; color: var(--yt-spec-text-secondary, #aaa); border-top: 1px solid var(--yt-spec-10-percent-layer, #303030); }

/* ── Hauptbereich ── */
.yts-main { flex: 1; display: flex; flex-direction: column; min-inline-size: 0; }
.yts-top { padding: 14px 20px 10px; border-bottom: 1px solid var(--yt-spec-10-percent-layer, #303030); }
#yts-search {
    inline-size: 100%; height: 36px; padding: 0 14px;
    border: 1px solid var(--yt-spec-10-percent-layer, #303030); border-radius: 18px;
    background: var(--yt-spec-general-background-a, #181818);
    color: inherit; font: 13px "Roboto", sans-serif;
}
#yts-search:focus-visible { outline: 2px solid var(--yt-spec-call-to-action, #3ea6ff); outline-offset: -1px; border-color: transparent; }
.yts-body { flex: 1; overflow-y: auto; padding: 6px 20px 18px; scrollbar-width: thin; }
.yts-body section { display: none; }
.yts-body section.is-active { display: block; }
.yts-sechead { margin: 14px 0 4px; font-size: 12px; color: var(--yt-spec-text-secondary, #aaa); }
.yts-empty { padding: 32px 0; text-align: center; font-size: 13px; color: var(--yt-spec-text-secondary, #aaa); }

/* ── Modulzeile ── */
.yts-row { padding: 11px 0; border-bottom: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,.07)); }
.yts-row:last-child { border-bottom: none; }
.yts-row.is-hidden { display: none; }
.yts-head-row { display: flex; align-items: flex-start; gap: 12px; }
.yts-texts { flex: 1; min-inline-size: 0; cursor: pointer; }
.yts-label { display: flex; align-items: center; gap: 7px; font-size: 14px; }
.yts-dot { inline-size: 6px; block-size: 6px; border-radius: 50%; background: var(--yt-spec-call-to-action, #3ea6ff); opacity: 0; flex: none; }
.yts-row.is-changed .yts-dot { opacity: 1; }
.yts-hint { display: block; margin-top: 3px; font-size: 12px; line-height: 1.45; color: var(--yt-spec-text-secondary, #aaa); }

/* Schalter im YouTube-Stil */
.yts-sw {
    appearance: none; -webkit-appearance: none;
    flex: none; inline-size: 36px; block-size: 20px; margin: 2px 0 0;
    border: none; border-radius: 10px; position: relative; cursor: pointer;
    background: var(--yt-spec-icon-disabled, #606060);
    transition: background-color .15s ease;
}
.yts-sw::after {
    content: ''; position: absolute; inset-block-start: 2px; inset-inline-start: 2px;
    inline-size: 16px; block-size: 16px; border-radius: 50%;
    background: #fff; transition: transform .15s ease;
}
.yts-sw:checked { background: var(--yt-spec-call-to-action, #3ea6ff); }
.yts-sw:checked::after { transform: translateX(16px); }
.yts-sw:focus-visible { outline: 2px solid var(--yt-spec-call-to-action, #3ea6ff); outline-offset: 3px; }

/* ── Optionen ── */
.yts-opts { margin: 10px 0 2px 0; display: flex; flex-direction: column; gap: 10px; }
.yts-opts.is-off { opacity: .35; pointer-events: none; }
.yts-opt { display: flex; align-items: flex-start; gap: 10px; font-size: 12px; color: var(--yt-spec-text-secondary, #aaa); }
.yts-opt > span { flex: none; inline-size: 116px; padding-top: 7px; }
.yts-opt input[type="number"], .yts-opt select, .yts-opt input[type="text"] {
    padding: 6px 10px; border: 1px solid var(--yt-spec-10-percent-layer, #303030); border-radius: 6px;
    background: var(--yt-spec-general-background-a, #181818);
    color: var(--yt-spec-text-primary, #f1f1f1); font: 13px "Roboto", sans-serif;
}
.yts-opt input[type="number"] { inline-size: 88px; }
.yts-opt select { min-inline-size: 180px; }

/* Chip-Editor */
.yts-chips {
    flex: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
    min-block-size: 34px; padding: 5px 8px;
    border: 1px solid var(--yt-spec-10-percent-layer, #303030); border-radius: 8px;
    background: var(--yt-spec-general-background-a, #181818);
    cursor: text;
}
.yts-chips:focus-within { border-color: var(--yt-spec-call-to-action, #3ea6ff); }
.yts-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 4px 3px 9px; border-radius: 12px;
    background: var(--yt-spec-badge-chip-background, rgba(255,255,255,.11));
    color: var(--yt-spec-text-primary, #f1f1f1);
    font-size: 12px; max-inline-size: 100%; overflow-wrap: anywhere;
}
.yts-chip--re { font-family: "Roboto Mono", monospace; box-shadow: inset 0 0 0 1px var(--yt-spec-call-to-action, #3ea6ff); }
.yts-chip button {
    inline-size: 16px; block-size: 16px; flex: none;
    display: grid; place-items: center;
    border: none; border-radius: 50%; background: transparent;
    color: var(--yt-spec-text-secondary, #aaa); font-size: 11px; cursor: pointer; padding: 0;
}
.yts-chip button:hover { background: rgba(255,255,255,.16); color: #fff; }
.yts-chip-input {
    flex: 1; min-inline-size: 120px;
    border: none; background: transparent; color: inherit;
    font: 13px "Roboto", sans-serif; outline: none; padding: 4px 2px;
}

/* ── Hilfe ── */
.yts-help h4 { margin: 22px 0 8px; font-size: 13px; font-weight: 600; }
.yts-help h4:first-child { margin-top: 12px; }
.yts-help p { margin: 0 0 8px; font-size: 13px; line-height: 1.55; color: var(--yt-spec-text-secondary, #aaa); }
.yts-help code {
    padding: 1px 5px; border-radius: 4px;
    background: var(--yt-spec-general-background-a, #181818);
    font: 12px "Roboto Mono", monospace; color: var(--yt-spec-text-primary, #f1f1f1);
}
.yts-keys { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; align-items: center; font-size: 13px; }
.yts-kbd {
    justify-self: start; padding: 3px 8px; border-radius: 5px;
    border: 1px solid var(--yt-spec-10-percent-layer, #3d3d3d);
    border-block-end-width: 2px;
    background: var(--yt-spec-general-background-a, #181818);
    font: 500 12px "Roboto Mono", monospace; white-space: nowrap;
}
.yts-help ul { margin: 0 0 8px; padding-inline-start: 18px; font-size: 13px; line-height: 1.6; color: var(--yt-spec-text-secondary, #aaa); }
.yts-help li { margin-bottom: 3px; }
.yts-help li b { color: var(--yt-spec-text-primary, #f1f1f1); font-weight: 500; }
.yts-glossary { display: grid; grid-template-columns: 1fr; gap: 2px; font-size: 12px; }
.yts-glossary div { display: flex; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,.06)); }
.yts-glossary b { flex: none; inline-size: 210px; font-weight: 500; color: var(--yt-spec-text-primary, #f1f1f1); }
.yts-glossary span { color: var(--yt-spec-text-secondary, #aaa); }

/* ── Fußzeile ── */
.yts-foot {
    display: flex; align-items: center; gap: 6px;
    padding: 12px 20px; flex: none;
    border-top: 1px solid var(--yt-spec-10-percent-layer, #303030);
    background: var(--yt-spec-general-background-a, rgba(0,0,0,.2));
}
.yts-foot .yts-spacer { flex: 1; }
.yts-foot button {
    height: 36px; padding: 0 16px; border: none; border-radius: 18px;
    font: 500 14px "Roboto", sans-serif; cursor: pointer;
}
.yts-ghost { background: transparent; color: var(--yt-spec-text-primary, #f1f1f1); }
.yts-ghost:hover { background: var(--yt-spec-10-percent-layer, rgba(255,255,255,.1)); }
.yts-danger { color: #ff6b6b; }
.yts-danger.is-armed { background: rgba(255,0,0,.16); }
.yts-primary { background: var(--yt-spec-call-to-action, #3ea6ff); color: var(--yt-spec-static-brand-black, #0f0f0f); }
.yts-primary:hover:not(:disabled) { filter: brightness(1.12); }
.yts-primary:disabled { opacity: .35; cursor: default; }
#yts-status { font-size: 12px; color: var(--yt-spec-text-secondary, #aaa); padding-inline-start: 6px; }

@media (prefers-reduced-motion: reduce) {
    .yts-block, .yts-toast, #yts-btn { transition: none !important; }
}
`;

    const applyGates = () => {
        const root = document.documentElement;
        for (const m of MODULES) root.classList.toggle(`yts-m-${m.id}`, on(m.id));
    };

    // ════════════════════════════════════════════════════════════
    // 9 | KARTEN-PIPELINE
    // ════════════════════════════════════════════════════════════

    const stats = { hidden: 0 };
    let counterEl = null;

    const renderCounter = () => { if (counterEl) counterEl.textContent = String(stats.hidden); };

    const setHidden = (node, hidden, reason) => {
        const already = node.classList.contains('yts-hidden');
        if (hidden === already) return;
        node.classList.toggle('yts-hidden', hidden);
        if (hidden) {
            stats.hidden += 1;
            renderCounter();
            log('ausgeblendet:', reason, text(node, SEL.title).slice(0, 60));
        }
    };

    const videoKey = (card) => {
        const a = card.querySelector('a#thumbnail[href], a#video-title-link[href], a[href*="/watch?v="], a[href^="/shorts/"]');
        const href = a?.getAttribute('href');
        if (!href) return null;
        return (/[?&]v=([\w-]{6,})/.exec(href) || /\/shorts\/([\w-]{6,})/.exec(href) || [null, href])[1];
    };

    function attachBlockButton(card) {
        const thumb = card.querySelector(SEL.thumb);
        if (!thumb || thumb.querySelector('.yts-block')) return;
        if (getComputedStyle(thumb).position === 'static') thumb.style.position = 'relative';
        const btn = document.createElement('button');
        btn.className = 'yts-block';
        btn.type = 'button';
        btn.textContent = '\u2715';
        btn.title = 'Kanal blockieren';
        btn.setAttribute('aria-label', 'Kanal blockieren');
        thumb.appendChild(btn);
    }

    let cardModules = [];
    const refreshCardModules = () => { cardModules = MODULES.filter(m => typeof m.onCard === 'function'); };

    const processCard = (card) => {
        try {
            if (!(card instanceof Element) || !card.isConnected) return;
            const key = videoKey(card);
            if (!key) return;

            const stamp = `${generation}:${key}`;
            if (card.dataset.ytsStamp === stamp) return;
            card.dataset.ytsStamp = stamp;

            // Noch nicht hydratisiert → Stempel zurücknehmen, nächste Runde erneut prüfen.
            if (!text(card, SEL.title) && !text(card, SEL.channel) && !card.querySelector(SEL.ad)) {
                delete card.dataset.ytsStamp;
                return;
            }

            let reason = false;
            for (const m of cardModules) {
                if (!on(m.id)) continue;
                reason = m.onCard(card);
                if (reason) break;
            }
            setHidden(card, !!reason, reason);
        } catch (e) { warn('processCard:', e); }
    };

    const sweep = (root = document) => {
        const cards = root.querySelectorAll(SEL.card);
        for (const c of cards) processCard(c);
    };

    const scheduleSweep = makeThrottle(() => sweep());

    // ════════════════════════════════════════════════════════════
    // 10 | PLAYER-FEATURES
    // ════════════════════════════════════════════════════════════

    const PlayerFeatures = {
        wheelBound: null,
        skipObserver: null,

        bindWheel() {
            waitFor(SEL.player).then((el) => {
                if (!el || this.wheelBound === el) return;
                this.wheelBound = el;
                el.addEventListener('wheel', (e) => {
                    if (!on('volumeScroll')) return;
                    if (e.target.closest('.ytp-chrome-bottom, .ytp-popup, .ytp-settings-menu')) return;
                    e.preventDefault();
                    const step = opt('volumeStep');
                    const cur = Player.volume;
                    if (cur === null) return;
                    const next = cur + (e.deltaY < 0 ? step : -step);
                    Player.volume = next;
                    toast(`Lautstärke ${Math.round(Math.min(100, Math.max(0, next)))} %`, 900);
                }, { passive: false });
                log('Mausrad-Lautstärke gebunden');
            });
        },

        applyDefaultSpeed() {
            const target = opt('defaultSpeed');
            if (target === 1) return;
            waitFor(SEL.video, 8000).then((v) => { if (v) Player.speed = target; });
        },

        nudgeSpeed(dir) {
            const step = opt('speedStep');
            const next = Math.round((Player.speed + dir * step) * 100) / 100;
            Player.speed = next;
            toast(`${Player.speed.toFixed(2).replace(/\.?0+$/, '')}×`, 900);
        },

        resetSpeed() { Player.speed = 1; toast('1×', 900); },

        forceQuality() {
            const q = opt('quality');
            if (q === 'auto') return;
            waitFor(SEL.player, 8000).then((el) => {
                if (!el) return;
                const available = Player.call('getAvailableQualityLevels') || [];
                const order = QUALITY_LEVELS.map(([id]) => id).filter(id => id !== 'auto');
                const start = order.indexOf(q);
                // Fallback nach unten, wenn die Wunschauflösung fehlt.
                const pick = order.slice(start < 0 ? 0 : start).find(id => available.includes(id)) || available[0];
                if (!pick) return;
                Player.call('setPlaybackQualityRange', pick, pick);
                log('Qualität erzwungen:', pick);
            });
        },

        forceTheater() {
            waitFor('ytd-watch-flexy', 8000).then((flexy) => {
                if (!flexy || flexy.hasAttribute('theater')) return;
                $('.ytp-size-button')?.click();
            });
        },

        killAutoplay() {
            waitFor('.ytp-autonav-toggle-button', 8000).then((btn) => {
                if (btn?.getAttribute('aria-checked') === 'true') {
                    btn.click();
                    log('Autoplay deaktiviert');
                }
            });
        },

        watchSkipButton() {
            this.skipObserver?.disconnect();
            waitFor(SEL.player, 8000).then((el) => {
                if (!el) return;
                const trySkip = () => {
                    if (!on('autoSkipAd')) return;
                    const btn = el.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button');
                    if (btn && btn.offsetParent !== null) { btn.click(); toast('Anzeige übersprungen', 1000); }
                };
                this.skipObserver = new MutationObserver(trySkip);
                this.skipObserver.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
                trySkip();
            });
        }
    };

    // ════════════════════════════════════════════════════════════
    // 11 | SPONSORBLOCK
    //     Nutzt den Hash-Präfix-Endpunkt: es geht nur ein 4-stelliger
    //     SHA-256-Präfix raus, nicht die Video-ID im Klartext.
    // ════════════════════════════════════════════════════════════

    const SponsorBlock = {
        segments: [],
        videoId: null,
        video: null,
        handler: null,

        async load() {
            this.detach();
            this.segments = [];
            const id = Player.id;
            if (!id || !GM.xhr) return;
            this.videoId = id;

            try {
                const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
                const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
                const prefix = hex.slice(0, 4);
                const cats = encodeURIComponent(JSON.stringify(opt('sponsorCategories')));
                const url = `https://sponsor.ajay.app/api/skipSegments/${prefix}?categories=${cats}`;

                GM.xhr({
                    method: 'GET', url, timeout: 8000,
                    onload: (res) => {
                        if (res.status !== 200) return;
                        try {
                            const data = JSON.parse(res.responseText);
                            const entry = data.find(d => d.videoID === id);
                            if (!entry?.segments?.length) return;
                            if (Player.id !== id) return; // Nutzer ist längst weiter
                            this.segments = entry.segments
                                .map(s => ({ start: s.segment[0], end: s.segment[1], category: s.category }))
                                .sort((a, b) => a.start - b.start);
                            this.attach();
                            log(`SponsorBlock: ${this.segments.length} Segmente`);
                        } catch (e) { warn('SponsorBlock-Parsing:', e); }
                    },
                    onerror: () => warn('SponsorBlock nicht erreichbar'),
                    ontimeout: () => warn('SponsorBlock-Timeout')
                });
            } catch (e) { warn('SponsorBlock:', e); }
        },

        attach() {
            const v = Player.video;
            if (!v) return;
            this.video = v;
            this.handler = () => {
                if (!on('sponsorBlock')) return;
                const t = v.currentTime;
                for (const s of this.segments) {
                    if (t >= s.start && t < s.end - 0.4) {
                        v.currentTime = s.end;
                        toast(`Übersprungen: ${s.category}`, 1200);
                        break;
                    }
                }
            };
            v.addEventListener('timeupdate', this.handler);
        },

        detach() {
            if (this.video && this.handler) this.video.removeEventListener('timeupdate', this.handler);
            this.video = null; this.handler = null;
        }
    };

    // ════════════════════════════════════════════════════════════
    // 12 | TRANSKRIPT-EXPORT
    //     Liest ausschließlich das Panel aus, das YouTube dir ohnehin
    //     anzeigt. Kein Netzwerkzugriff, keine API-Umgehung.
    // ════════════════════════════════════════════════════════════

    const Transcript = {
        async openPanel() {
            let list = $('ytd-transcript-segment-list-renderer');
            if (list) return list;

            const direct = $$('button, yt-button-shape button')
                .find(b => /transkript|transcript/i.test(b.textContent || b.getAttribute('aria-label') || ''));
            if (direct) direct.click();
            else {
                $('#description-inline-expander tp-yt-paper-button#expand, #expand')?.click();
                const later = $$('button')
                    .find(b => /transkript|transcript/i.test(b.textContent || b.getAttribute('aria-label') || ''));
                later?.click();
            }
            list = await waitFor('ytd-transcript-segment-list-renderer', 6000);
            return list;
        },

        parse(list) {
            return $$('ytd-transcript-segment-renderer', list).map((seg) => ({
                time: text(seg, '.segment-timestamp'),
                line: text(seg, '.segment-text, yt-formatted-string.segment-text')
            })).filter(s => s.line);
        },

        toSeconds(stamp) {
            const parts = stamp.split(':').map(Number);
            if (parts.some(n => !Number.isFinite(n))) return 0;
            return parts.reduce((acc, n) => acc * 60 + n, 0);
        },

        srtTime(sec) {
            const h = String(Math.floor(sec / 3600)).padStart(2, '0');
            const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
            const s = String(Math.floor(sec % 60)).padStart(2, '0');
            return `${h}:${m}:${s},000`;
        },

        format(rows, kind, title) {
            if (kind === 'txt') return rows.map(r => r.line).join('\n');
            if (kind === 'md') return `# ${title}\n\n${location.href}\n\n${rows.map(r => `- \`${r.time}\` ${r.line}`).join('\n')}\n`;
            return rows.map((r, i) => {
                const start = this.toSeconds(r.time);
                const end = i + 1 < rows.length ? this.toSeconds(rows[i + 1].time) : start + 4;
                return `${i + 1}\n${this.srtTime(start)} --> ${this.srtTime(end)}\n${r.line}\n`;
            }).join('\n');
        },

        async run() {
            toast('Transkript wird gelesen …', 2500);
            const list = await this.openPanel();
            if (!list) { toast('Kein Transkript verfügbar'); return; }
            const rows = this.parse(list);
            if (!rows.length) { toast('Transkript leer'); return; }
            const title = text(document, 'h1.ytd-watch-metadata, h1.title') || 'transkript';
            const kind = opt('transcriptFormat');
            const ext = kind === 'md' ? 'md' : kind === 'srt' ? 'srt' : 'txt';
            download(`${sanitize(title)}.${ext}`, this.format(rows, kind, title));
            toast(`${rows.length} Zeilen exportiert`);
        },

        injectButton() {
            if (!location.pathname.startsWith('/watch')) return;
            waitFor('#actions #top-level-buttons-computed, ytd-watch-metadata #actions', 8000).then((host) => {
                if (!host || $('#yts-transcript-btn')) return;
                const btn = document.createElement('button');
                btn.id = 'yts-transcript-btn';
                btn.type = 'button';
                btn.textContent = 'Transkript speichern';
                btn.addEventListener('click', () => this.run());
                host.appendChild(btn);
            });
        }
    };

    // ════════════════════════════════════════════════════════════
    // 13 | SETTINGS-PANEL (reine DOM-API → Trusted Types safe)
    // ════════════════════════════════════════════════════════════

    /** Kompakter DOM-Builder. Kein innerHTML — YouTube erzwingt Trusted Types. */
    const h = (tag, attrs = {}, ...kids) => {
        const node = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (v === undefined || v === null) continue;
            if (k === 'class') node.className = v;
            else if (k === 'text') node.textContent = v;
            else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
            else node.setAttribute(k, String(v));
        }
        for (const kid of kids.flat()) {
            if (kid === null || kid === undefined || kid === false) continue;
            node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
        }
        return node;
    };

    const HELP_TAB = '__help';

    const Panel = {
        el: null,
        inputs: new Map(),        // Modul-ID  → checkbox
        optionInputs: new Map(),  // Options-Key → { get, set }
        activeTab: null,
        baseline: '',
        resetArmed: false,

        // ─────────── Aufbau ───────────
        build() {
            const groups = [...new Set(MODULES.map(m => m.group))];
            this.activeTab = groups[0];

            const rail = h('aside', { class: 'yts-rail' },
                h('div', { class: 'yts-brand' }, h('b', { text: 'YT-Suite' }), h('span', { text: `v${VERSION}` })));

            const nav = h('nav', { role: 'tablist' });
            const body = h('div', { class: 'yts-body' });

            for (const name of groups) {
                nav.appendChild(this.buildTab(name, name));
                const section = h('section', { 'data-panel': name });
                for (const mod of MODULES.filter(m => m.group === name)) section.appendChild(this.buildRow(mod));
                body.appendChild(section);
            }
            nav.appendChild(this.buildTab(HELP_TAB, 'Hilfe & Shortcuts', true));
            body.appendChild(this.buildHelp());

            rail.appendChild(nav);
            rail.appendChild(h('div', { class: 'yts-rail-foot', id: 'yts-active-count' }));

            const search = h('input', {
                id: 'yts-search', type: 'search', placeholder: 'Modul suchen \u2026',
                'aria-label': 'Module durchsuchen',
                oninput: () => this.filter(search.value)
            });

            const status = h('span', { id: 'yts-status' });
            const saveBtn = h('button', { class: 'yts-primary', type: 'button', text: 'Speichern', disabled: 'disabled', onclick: () => this.commit() });
            const resetBtn = h('button', { class: 'yts-ghost yts-danger', type: 'button', text: 'Zur\u00fccksetzen', onclick: () => this.reset(resetBtn) });

            const foot = h('div', { class: 'yts-foot' },
                h('button', { class: 'yts-ghost', type: 'button', text: 'Export', onclick: () => this.export() }),
                h('button', { class: 'yts-ghost', type: 'button', text: 'Import', onclick: () => this.import() }),
                resetBtn, status,
                h('span', { class: 'yts-spacer' }),
                h('button', { class: 'yts-ghost', type: 'button', text: 'Schlie\u00dfen', onclick: () => this.el.close() }),
                saveBtn
            );

            const dlg = h('dialog', { id: 'yts-panel' },
                h('div', { class: 'yts-shell' }, rail,
                    h('div', { class: 'yts-main' }, h('div', { class: 'yts-top' }, search), body, foot)));

            dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
            dlg.addEventListener('close', () => this.disarmReset(resetBtn));
            dlg.addEventListener('keydown', (e) => {
                if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
            });

            document.body.appendChild(dlg);
            this.el = dlg;
            this.saveBtn = saveBtn;
            this.searchEl = search;
            this.showTab(this.activeTab);
        },

        buildTab(id, label, isHelp = false) {
            const pill = isHelp ? null : h('span', { class: 'yts-pill', 'data-count-for': id });
            return h('button', {
                class: 'yts-tab', type: 'button', role: 'tab', 'data-tab': id, 'aria-selected': 'false',
                onclick: () => { this.searchEl.value = ''; this.filter(''); this.showTab(id); }
            }, h('span', { class: 'yts-tab-label', text: label }), pill);
        },

        buildRow(mod) {
            const box = h('input', { type: 'checkbox', class: 'yts-sw', id: `yts-mod-${mod.id}`, role: 'switch' });
            const texts = h('div', { class: 'yts-texts' },
                h('div', { class: 'yts-label' }, h('span', { class: 'yts-dot' }), h('span', { text: mod.label })),
                mod.hint ? h('span', { class: 'yts-hint', text: mod.hint }) : null);
            texts.addEventListener('click', () => { box.checked = !box.checked; box.dispatchEvent(new Event('change', { bubbles: true })); });

            const row = h('div', { class: 'yts-row', 'data-mod': mod.id },
                h('div', { class: 'yts-head-row' }, texts, box));
            row.dataset.search = `${mod.label} ${mod.hint || ''} ${mod.group}`.toLowerCase();
            this.inputs.set(mod.id, box);

            if (mod.settings?.length) {
                const opts = h('div', { class: 'yts-opts' });
                for (const spec of mod.settings) opts.appendChild(this.buildOption(spec));
                row.appendChild(opts);
                box.addEventListener('change', () => opts.classList.toggle('is-off', !box.checked));
            }
            box.addEventListener('change', () => this.touch());
            return row;
        },

        buildOption(spec) {
            let control;
            if (spec.type === 'list') {
                control = this.makeChips(spec);
            } else if (spec.type === 'select') {
                const sel = h('select', { id: `yts-opt-${spec.key}`, onchange: () => this.touch() });
                for (const [value, label] of spec.options) sel.appendChild(h('option', { value, text: label }));
                control = { node: sel, get: () => sel.value, set: (v) => { sel.value = String(v); } };
            } else {
                const inp = h('input', {
                    type: spec.type === 'number' ? 'number' : 'text', id: `yts-opt-${spec.key}`,
                    min: spec.min, max: spec.max, step: spec.step, oninput: () => this.touch()
                });
                control = { node: inp, get: () => inp.value, set: (v) => { inp.value = String(v); } };
            }
            this.optionInputs.set(spec.key, control);
            return h('div', { class: 'yts-opt' }, h('span', { text: spec.label }), control.node);
        },

        /** Chip-Editor: Enter oder Komma legt an, Backspace im leeren Feld entfernt den letzten. */
        makeChips(spec) {
            let values = [];
            const input = h('input', {
                class: 'yts-chip-input', type: 'text', spellcheck: 'false',
                placeholder: spec.placeholder || 'Eintrag + Enter', 'aria-label': spec.label
            });
            const wrap = h('div', { class: 'yts-chips', onclick: (e) => { if (e.target === wrap) input.focus(); } });

            const render = () => {
                for (const c of Array.from(wrap.querySelectorAll('.yts-chip'))) c.remove();
                values.forEach((value, i) => {
                    const isRegex = /^\/.+\/[gimsuy]*$/.test(value);
                    const chip = h('span', { class: `yts-chip${isRegex ? ' yts-chip--re' : ''}` }, value,
                        h('button', {
                            type: 'button', text: '\u2715', 'aria-label': `${value} entfernen`,
                            onclick: (e) => { e.stopPropagation(); values.splice(i, 1); render(); this.touch(); }
                        }));
                    wrap.insertBefore(chip, input);
                });
            };
            const add = (raw) => {
                for (const v of String(raw).split(',').map(s => s.trim()).filter(Boolean)) {
                    if (!values.includes(v)) values.push(v);
                }
                input.value = ''; render(); this.touch();
            };
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); e.stopPropagation(); add(input.value); }
                else if (e.key === 'Backspace' && !input.value && values.length) { values.pop(); render(); this.touch(); }
            });
            input.addEventListener('blur', () => { if (input.value.trim()) add(input.value); });
            wrap.appendChild(input);
            return { node: wrap, get: () => values.join(', '), set: (v) => { values = asList(v, []); render(); } };
        },

        // ─────────── Hilfe ───────────
        buildHelp() {
            const keys = h('div', { class: 'yts-keys' });
            for (const s of SHORTCUTS) {
                keys.appendChild(h('span', { class: 'yts-kbd', text: s.combo }));
                keys.appendChild(h('span', { text: s.desc }));
            }

            const cats = h('ul', {});
            for (const [id, label] of SPONSOR_CATEGORIES) {
                cats.appendChild(h('li', {}, h('b', { text: id }), ` \u2014 ${label}`));
            }

            const glossary = h('div', { class: 'yts-glossary' });
            for (const m of MODULES) {
                glossary.appendChild(h('div', {}, h('b', { text: m.label }), h('span', { text: m.hint || m.group })));
            }

            const debugBox = h('input', { type: 'checkbox', class: 'yts-sw', id: 'yts-opt-debug', onchange: () => this.touch() });
            this.optionInputs.set('debug', { node: debugBox, get: () => debugBox.checked, set: (v) => { debugBox.checked = v === true; } });

            const wrap = h('section', { 'data-panel': HELP_TAB, class: 'yts-help' },
                h('h4', { text: 'Tastenk\u00fcrzel' }),
                h('p', { text: 'Gelten \u00fcberall auf youtube.com, au\u00dfer w\u00e4hrend du in ein Textfeld tippst. Alt+Pfeiltasten sind bewusst frei gelassen \u2014 die geh\u00f6ren dem Browser-Verlauf.' }),
                keys,

                h('h4', { text: 'Keyword-Blacklist' }),
                h('p', {}, 'Einfache Begriffe treffen als Teilstring, Gro\u00df-/Kleinschreibung egal. Wer mehr braucht, schreibt eine Regex in Schr\u00e4gstrichen: ',
                    h('code', { text: '/reagiert|reaktion/' }), ' oder ', h('code', { text: '/^\\[LIVE\\]/' }),
                    '. Regex-Chips sind blau umrandet.'),

                h('h4', { text: 'Kanal-Blacklist' }),
                h('p', {}, 'Kan\u00e4le werden ', h('b', { text: 'exakt' }), ' verglichen \u2014 sonst w\u00fcrde \u201eKurz\u201c auch \u201eKurzgesagt\u201c erwischen. Schneller geht es \u00fcber das \u2715 oben rechts im Thumbnail, wenn du mit der Maus dr\u00fcber f\u00e4hrst.'),

                h('h4', { text: 'SponsorBlock-Kategorien' }),
                h('p', { text: 'Standardm\u00e4\u00dfig aus. Ist es an, geht ein vierstelliger SHA-256-Pr\u00e4fix der Video-ID an sponsor.ajay.app \u2014 nicht die ID im Klartext. Verf\u00fcgbare Kategorien:' }),
                cats,

                h('h4', { text: 'Wenn etwas nicht greift' }),
                h('ul', {},
                    h('li', {}, h('b', { text: 'Z\u00e4hler bleibt auf 0' }), ' \u2014 YouTube hat vermutlich Renderer umbenannt. Logging unten aktivieren, Konsole \u00f6ffnen, nach [YT-Suite] filtern.'),
                    h('li', {}, h('b', { text: 'Filter greift verz\u00f6gert' }), ' \u2014 normal. Textbasierte Filter warten, bis YouTube die Karte bef\u00fcllt hat. Shorts und Werbung gehen \u00fcber CSS und sind sofort weg.'),
                    h('li', {}, h('b', { text: 'Player-Features tot' }), ' \u2014 die Wiedergabe-API ist undokumentiert. Seite neu laden, dann pr\u00fcfen.'),
                    h('li', {}, h('b', { text: 'Alles kaputt' }), ' \u2014 \u201eZur\u00fccksetzen\u201c unten. Vorher \u201eExport\u201c, falls dir deine Listen lieb sind.')),

                h('h4', { text: 'Sichern & \u00dcbertragen' }),
                h('p', { text: 'Export legt die komplette Konfiguration als JSON in die Zwischenablage. Import nimmt sie auf einem anderen Rechner wieder entgegen. Ein Sync passiert nicht von allein \u2014 Userscript-Speicher ist lokal.' }),

                h('h4', { text: 'Diagnose' }),
                h('div', { class: 'yts-opt' }, h('span', { text: 'Konsolen-Logging' }), debugBox),
                h('p', { class: 'yts-hint', id: 'yts-meta' }),

                h('h4', { text: 'Modul\u00fcbersicht' }),
                glossary
            );
            return wrap;
        },

        // ─────────── Zustand ───────────
        showTab(id) {
            this.activeTab = id;
            for (const tab of $$('.yts-tab', this.el)) tab.setAttribute('aria-selected', String(tab.dataset.tab === id));
            for (const sec of $$('.yts-body section', this.el)) sec.classList.toggle('is-active', sec.dataset.panel === id);
            this.el.querySelector('.yts-body').scrollTop = 0;
        },

        filter(query) {
            const q = query.trim().toLowerCase();
            const searching = q.length > 0;
            for (const sec of $$('.yts-body section', this.el)) {
                if (sec.dataset.panel === HELP_TAB) { sec.classList.toggle('is-active', !searching && this.activeTab === HELP_TAB); continue; }
                let anyVisible = false;
                for (const row of $$('.yts-row', sec)) {
                    const hit = !searching || row.dataset.search.includes(q);
                    row.classList.toggle('is-hidden', !hit);
                    if (hit) anyVisible = true;
                }
                sec.classList.toggle('is-active', searching ? anyVisible : sec.dataset.panel === this.activeTab);
            }
            if (searching) for (const tab of $$('.yts-tab', this.el)) tab.setAttribute('aria-selected', 'false');
            else this.showTab(this.activeTab);
        },

        counts() {
            let active = 0;
            const perGroup = new Map();
            for (const m of MODULES) {
                const isOn = this.inputs.get(m.id)?.checked === true;
                if (isOn) active += 1;
                const g = perGroup.get(m.group) || { on: 0, total: 0 };
                g.total += 1; if (isOn) g.on += 1;
                perGroup.set(m.group, g);
            }
            for (const pill of $$('.yts-pill', this.el)) {
                const g = perGroup.get(pill.dataset.countFor);
                if (g) pill.textContent = `${g.on}/${g.total}`;
            }
            const foot = $('#yts-active-count', this.el);
            if (foot) foot.textContent = `${active} von ${MODULES.length} Modulen aktiv`;
        },

        snapshot() {
            const mods = {}; for (const [id, box] of this.inputs) mods[id] = box.checked;
            const opts = {}; for (const [k, c] of this.optionInputs) opts[k] = c.get();
            return JSON.stringify({ mods, opts });
        },

        /** Nach jeder Interaktion: Zähler, Dirty-Markierung, Save-Button. */
        touch() {
            this.counts();
            const before = JSON.parse(this.baseline || '{"mods":{},"opts":{}}');
            let changed = 0;
            for (const [id, box] of this.inputs) {
                const diff = before.mods[id] !== box.checked;
                this.el.querySelector(`.yts-row[data-mod="${id}"]`)?.classList.toggle('is-changed', diff);
                if (diff) changed += 1;
            }
            for (const [k, c] of this.optionInputs) if (String(before.opts[k]) !== String(c.get())) changed += 1;
            this.saveBtn.disabled = changed === 0;
            this.status(changed === 0 ? '' : `${changed} \u00c4nderung${changed === 1 ? '' : 'en'}`);
        },

        fill() {
            for (const [id, box] of this.inputs) box.checked = on(id);
            for (const [key, ctl] of this.optionInputs) ctl.set(opt(key));
            for (const row of $$('.yts-row', this.el)) {
                const box = this.inputs.get(row.dataset.mod);
                row.querySelector('.yts-opts')?.classList.toggle('is-off', !box?.checked);
                row.classList.remove('is-changed');
            }
            const meta = $('#yts-meta', this.el);
            if (meta) meta.textContent = `Version ${VERSION} \u00b7 ${MODULES.length} Module \u00b7 Konfiguration ${JSON.stringify(CFG).length} Bytes`;
            this.baseline = this.snapshot();
            this.counts();
            this.saveBtn.disabled = true;
            this.status('');
        },

        // ─────────── Aktionen ───────────
        commit() {
            const raw = { modules: {}, options: {} };
            for (const [id, box] of this.inputs) raw.modules[id] = box.checked;
            for (const [key, ctl] of this.optionInputs) raw.options[key] = ctl.get();
            CFG = normalize(raw);
            compileMatchers();
            saveConfig();
            applyLive();
            this.fill();
            this.status('Gespeichert');
            toast('Einstellungen gespeichert');
        },

        async export() {
            const json = JSON.stringify(CFG, null, 2);
            try { await navigator.clipboard.writeText(json); this.status('In Zwischenablage kopiert'); }
            catch { PAGE.prompt('Konfiguration kopieren:', json); }
        },

        import() {
            const raw = PAGE.prompt('Konfiguration als JSON einf\u00fcgen:');
            if (!raw) return;
            try {
                CFG = normalize(JSON.parse(raw));
                compileMatchers(); saveConfig(); applyLive(); this.fill();
                this.status('Importiert');
            } catch { this.status('Ung\u00fcltiges JSON \u2014 nichts ge\u00e4ndert'); }
        },

        /** Zwei Klicks, weil einer davon die Blacklists killt. */
        reset(btn) {
            if (!this.resetArmed) {
                this.resetArmed = true;
                btn.classList.add('is-armed');
                btn.textContent = 'Wirklich?';
                this.status('Setzt alle Module und Listen zur\u00fcck');
                this.resetTimer = setTimeout(() => this.disarmReset(btn), 4000);
                return;
            }
            this.disarmReset(btn);
            CFG = normalize({});
            compileMatchers(); saveConfig(); applyLive(); this.fill();
            this.status('Auf Standard zur\u00fcckgesetzt');
        },

        disarmReset(btn) {
            clearTimeout(this.resetTimer);
            this.resetArmed = false;
            btn.classList.remove('is-armed');
            btn.textContent = 'Zur\u00fccksetzen';
        },

        status(msg) { const s = $('#yts-status', this.el); if (s) s.textContent = msg; },

        open(tab) {
            if (!this.el) this.build();
            this.fill();
            this.searchEl.value = '';
            this.filter('');
            if (tab) this.showTab(tab);
            if (!this.el.open) this.el.showModal();
        }
    };

    // ════════════════════════════════════════════════════════════
    // 14 | LIVE-ANWENDUNG
    // ════════════════════════════════════════════════════════════

    const applyLive = () => {
        generation += 1;
        stats.hidden = 0;
        renderCounter();
        if (counterEl) counterEl.style.display = on('counter') ? '' : 'none';
        applyGates();
        refreshCardModules();
        $$('.yts-hidden').forEach(n => n.classList.remove('yts-hidden'));
        sweep();
        runNavHooks();
    };

    const runNavHooks = () => {
        for (const m of MODULES) {
            if (!on(m.id) || typeof m.onNav !== 'function') continue;
            try { m.onNav(); } catch (e) { warn(`onNav(${m.id}):`, e); }
        }
    };

    // ════════════════════════════════════════════════════════════
    // 15 | MASTHEAD-BUTTON
    // ════════════════════════════════════════════════════════════

    const injectMasthead = () => {
        if ($('#yts-btn')) return;
        waitFor(SEL.masthead).then((host) => {
            if (!host || $('#yts-btn')) return;
            const btn = document.createElement('button');
            btn.id = 'yts-btn';
            btn.type = 'button';
            btn.title = 'YT-Suite (Alt+Y)';
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('viewBox', '0 0 24 24');
            icon.setAttribute('width', '15');
            icon.setAttribute('height', '15');
            icon.setAttribute('aria-hidden', 'true');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('fill', 'currentColor');
            path.setAttribute('d', 'M3 5h18l-7 8v6l-4 2v-8L3 5z');
            icon.appendChild(path);
            btn.appendChild(icon);
            const label = document.createElement('span');
            label.textContent = 'YT-Suite';
            counterEl = document.createElement('span');
            counterEl.id = 'yts-count';
            counterEl.textContent = String(stats.hidden);
            btn.append(label, counterEl);
            btn.addEventListener('click', () => Panel.open());
            host.prepend(btn);
            if (!on('counter')) counterEl.style.display = 'none';
        });
    };

    // ════════════════════════════════════════════════════════════
    // 16 | SHORTCUTS
    // ════════════════════════════════════════════════════════════

    const isTyping = () => {
        const a = document.activeElement;
        if (!a) return false;
        return a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
    };

    const toggleModule = (id) => {
        const mod = MODULE_BY_ID.get(id);
        if (!mod) return;
        CFG.modules[id] = !CFG.modules[id];
        saveConfig();
        applyLive();
        toast(`${mod.label}: ${CFG.modules[id] ? 'an' : 'aus'}`);
    };

    document.addEventListener('keydown', (e) => {
        if (!e.altKey || e.ctrlKey || e.metaKey || isTyping()) return;
        const hit = SHORTCUTS.find(s => s.code === e.code);
        if (!hit) return;
        if (!hit.always && !on('shortcuts')) return;
        e.preventDefault();
        e.stopPropagation();
        try { hit.run(); } catch (err) { warn(`Shortcut ${hit.combo}:`, err); }
    }, true);

    // Block-Button
    document.addEventListener('click', (e) => {
        const btn = e.target.closest?.('.yts-block');
        if (!btn) return;
        e.preventDefault(); e.stopPropagation();
        const card = btn.closest(SEL.card);
        if (!card) return;
        const channel = text(card, SEL.channel);
        if (!channel) { toast('Kanalname nicht lesbar'); return; }
        if (!opt('channels').some(c => c.toLowerCase() === channel.toLowerCase())) {
            CFG.options.channels.push(channel);
            compileMatchers();
            saveConfig();
        }
        setHidden(card, true, 'Kanal');
        toast(`Blockiert: ${channel}`);
        scheduleSweep();
    }, true);

    // ════════════════════════════════════════════════════════════
    // 17 | OBSERVER & ROUTER
    // ════════════════════════════════════════════════════════════

    let observer = null;

    const startObserver = () => {
        if (observer) return;
        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    if (node.matches(SEL.card)) { processCard(node); continue; }
                    if (node.tagName === 'YTD-MASTHEAD') { injectMasthead(); continue; }
                    const nested = node.querySelectorAll?.(SEL.card);
                    if (nested?.length) for (const c of nested) processCard(c);
                }
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    let lastPath = '';
    const onNavigate = () => {
        const path = location.pathname + location.search;
        applyGates();
        injectMasthead();
        scheduleSweep();
        if (path === lastPath) return;
        lastPath = path;
        SponsorBlock.detach();
        runNavHooks();
        log('Navigation:', path);
    };

    ['yt-navigate-finish', 'yt-page-data-updated', 'yt-player-updated'].forEach(evt => {
        document.addEventListener(evt, onNavigate);
    });

    // ════════════════════════════════════════════════════════════
    // 18 | BOOTSTRAP
    // ════════════════════════════════════════════════════════════

    GM.menu('YT-Suite öffnen', () => Panel.open());
    GM.menu('Hilfe & Shortcuts', () => Panel.open(HELP_TAB));

    loadConfig();
    refreshCardModules();
    GM.style(BASE_CSS + '\n' + buildModuleCss());
    applyGates();

    const boot = () => {
        injectMasthead();
        startObserver();
        sweep();
        onNavigate();
        if (!GM.get('yts_intro_seen', false)) {
            GM.set('yts_intro_seen', true);
            setTimeout(() => toast('YT-Suite aktiv \u2014 Alt + Y \u00f6ffnet die Einstellungen, Alt + H die Hilfe', 5200), 1500);
        }
        log(`v${VERSION} aktiv — ${MODULES.filter(m => on(m.id)).length}/${MODULES.length} Module`);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
