<p align="center">
  <img src="https://img.shields.io/badge/Version-8.1.0-3ea6ff?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTMgNWgxOGwtNyA4djZsLTQgMnYtOGwtNy0yeiIvPjwvc3ZnPg==&logoColor=white" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Platform-YouTube-red?style=flat-square&logo=youtube&logoColor=white" alt="Platform">
  <img src="https://img.shields.io/badge/Made%20with-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript">
</p>

<h1 align="center">🧩 YouTube Homepage Suite</h1>

<p align="center">
  <b>Das modulare Power-User-Toolkit für YouTube.</b><br>
  Feed-Filter · Player-Control · Decluttering · SponsorBlock · Transkript-Export · Shortcuts
</p>

<p align="center">
  <a href="#installation">⚡ One-Click Install</a> ·
  <a href="#features">✨ Features</a> ·
  <a href="#shortcuts">⌨️ Shortcuts</a> ·
  <a href="#screenshots">📸 Screenshots</a>
</p>

---

## ✨ Features

### 🎯 Feed & Filter
- **🚫 Shorts entfernen** — Vollständige Entfernung aus Feed, Suche, Sidebar, Guide & Chip-Leiste
- **🛡️ Keyword-Blacklist** — Titelfilter mit Substring- *und* Regex-Support (`/reagiert|reaktion/`)
- **📛 Kanal-Blacklist** — Exakte Kanalnamen + Hover-Block-Button (✕) auf jedem Thumbnail
- **👁️ Gesehene Videos ausblenden** — Fortschrittsbasiert, einstellbarer Threshold
- **📺 Livestreams & Premieren ausblenden**
- **📢 Feed-Werbung & Promo-Banner** — Ad-Slots, Mealbar, Umfragen, Statement-Banner

### 🧹 Aufräumen (Decluttering)
- **🧘 Fokusmodus** — Startseiten-Feed komplett leeren (gegen Doomscroll)
- **➡️ Empfehlungs-Sidebar ausblenden**
- **💬 Kommentare ausblenden**
- **💭 Live-Chat ausblenden**
- **🎬 Endcards & Overlays entfernen**
- **👆 Hover-Autoplay deaktivieren**
- **📝 Vollständige Titel anzeigen** — Kein "…"-Abschnitt mehr

### 🎮 Player
- **🔊 Mausrad-Lautstärke** — Über dem Player scrollen
- **⏩ Geschwindigkeits-Steuerung** — Alt + . / Alt + , / Alt + 0
- **🎥 Qualität erzwingen** — 240p bis 4K+, mit Fallback
- **🎬 Kinomodus automatisch**
- **▶️ Autoplay deaktivieren**
- **📊 Fortschrittsbalken dauerhaft**
- **⏭️ Überspringbare Ads auto-skip**
- **🛡️ SponsorBlock-Integration** — Community-Segmente überspringen (sponsor, selfpromo, intro, outro, ...)

### 🛠️ Werkzeuge
- **📄 Transkript-Export** — TXT, SRT oder Markdown mit Zeitmarken (Alt + D)
- **⌨️ 11 Power-Shortcuts** — Schnellzugriff auf alle Funktionen
- **📊 Live-Trefferzähler** — Zeigt, wie viel diese Sitzung gefiltert wurde

---

## ⚡ Installation

### Schritt 1: Userscript-Manager installieren

| Browser | Empfohlen |
|---------|-----------|
| Chrome / Edge / Brave | [Tampermonkey](https://www.tampermonkey.net/) oder [Violentmonkey](https://violentmonkey.github.io/) |
| Firefox | [Tampermonkey](https://www.tampermonkey.net/) oder [Greasemonkey](https://www.greasespot.net/) |
| Safari | [Tampermonkey](https://www.tampermonkey.net/) |

> **💡 Pro-Tipp:** [ScriptCat](https://docs.scriptcat.org/) wird für erweiterte Features empfohlen.

### Schritt 2: Script installieren

**🔵 [→ Direkt installieren (youtube-homepage-suite.user.js)](https://github.com/deusexlumen/YoutubeScriptCat/raw/main/youtube-homepage-suite.user.js)**

Klicke auf den Link oben — dein Userscript-Manager erkennt die `.user.js`-Datei automatisch und fragt nach der Installation.

<details>
<summary>📝 Manuelle Installation</summary>

1. Lade [`youtube-homepage-suite.user.js`](https://github.com/deusexlumen/YoutubeScriptCat/raw/main/youtube-homepage-suite.user.js) herunter
2. Öffne deinen Userscript-Manager → "Neues Script" / "Importieren"
3. Füge den Inhalt ein → Speichern

</details>

---

## 🎮 Nutzung

### Schnellstart

Nach Installation läuft das Script automatisch auf allen `youtube.com/*`-Seiten.

| Aktion | Methode |
|--------|---------|
| **Einstellungen öffnen** | `Alt + Y` oder "YT Suite"-Button im Header |
| **Hilfe & Shortcuts** | `Alt + H` |
| **Transkript exportieren** | `Alt + D` oder Button unter dem Video |
| **Kanal blockieren** | Hover über Thumbnail → ✕-Button |
| **Shorts an/aus** | `Alt + S` |
| **Kommentare an/aus** | `Alt + K` |

### Konfigurations-Panel

Das Settings-Panel ist in **4 Gruppen** organisiert:

1. **Feed & Filter** — Was du nicht sehen willst
2. **Aufräumen** — Weniger Ablenkung
3. **Player** — Wiedergabe-Verhalten
4. **Werkzeuge** — Produktivität

**Features des Panels:**
- 🔍 **Live-Suche** — Module schnell finden (`/` fokussiert die Suche)
- 💾 **Export/Import** — Konfiguration als JSON in die Zwischenablage
- 🔄 **Zurücksetzen** — Doppelklick-Schutz gegen versehentliches Löschen
- 🎨 **YouTube-Native UI** — Passt sich dem Dark/Light-Theme an

---

## ⌨️ Shortcuts

> Alle Shortcuts funktionieren global auf YouTube — außer du tippst gerade in ein Textfeld.  
> **Bewusst nicht belegt:** Alt+Pfeiltasten (Browser-Verlauf), Alt+D (Adressleiste)

| Shortcut | Funktion |
|----------|----------|
| `Alt + Y` | Einstellungen öffnen |
| `Alt + H` | Hilfe & Shortcuts |
| `Alt + S` | Shorts an/aus |
| `Alt + K` | Kommentare an/aus |
| `Alt + R` | Empfehlungs-Sidebar an/aus |
| `Alt + Z` | Fokusmodus an/aus |
| `Alt + T` | Kinomodus umschalten |
| `Alt + X` | Transkript speichern |
| `Alt + .` | Wiedergabe schneller |
| `Alt + ,` | Wiedergabe langsamer |
| `Alt + 0` | Tempo zurück auf 1× |

---

## 📸 Screenshots

<p align="center">
  <i>🖼️ Screenshots folgen — PRs mit Screenshots willkommen!</i>
</p>

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────┐
│  YT-Suite v8.1.0                        │
├─────────────────────────────────────────┤
│  CSS-Gated Modules (html.yts-m-*)      │
│  ├── Feed & Filter (5 Module)          │
│  ├── Decluttering (6 Module)           │
│  ├── Player (8 Module)                 │
│  └── Tools (3 Module)                  │
├─────────────────────────────────────────┤
│  MutationObserver (SPA-fest)            │
│  Trusted Types Safe (kein innerHTML)    │
│  Config: GM_getValue / GM_setValue      │
│  v6/v7 Migration (Legacy-Support)       │
└─────────────────────────────────────────┘
```

### Technische Highlights

- **🔄 SPA-fest** — Überlebt YouTube's client-side Navigation via `MutationObserver` + `yt-navigate-finish`
- **🛡️ Trusted Types** — Reine DOM-API, kein `innerHTML` (YouTube-enforced)
- **⚡ CSS-First** — Features werden per `html.yts-m-*`-Klasse gegated → kein Reload nötig
- **📦 Modular** — Jedes Feature ist ein eigenes Objekt mit Hooks (`onCard`, `onNav`, `css`)
- **🧠 Smart Matching** — Keywords als Substring *oder* Regex; Kanäle exakt (keine False-Positives)
- **🔒 Privacy-First** — SponsorBlock nutzt nur 4-stellige SHA-256-Präfixe, nie Klartext-Video-IDs

---

## 🔧 Troubleshooting

**Zähler bleibt auf 0?**
→ YouTube hat Renderer umbenannt. Aktiviere Debug-Logging im Hilfe-Tab, öffne die Konsole (F12), filtere nach `[YT-Suite]`.

**Filter greift verzögert?**
→ Normal. Textbasierte Filter warten, bis YouTube die Karte befüllt hat. Shorts und Werbung gehen über CSS und sind sofort weg.

**Player-Features tot?**
→ Die Wiedergabe-API ist undokumentiert. Seite neu laden, dann prüfen.

**Alles kaputt?**
→ "Zurücksetzen" im Panel. Vorher "Export" drücken, falls dir deine Listen lieb sind.

---

## 📋 Changelog

### v8.1.0 (Current)
- Modularer Rewrite mit 20+ unabhängigen Modulen
- SponsorBlock-Integration (Privacy-preserving)
- Transkript-Export (TXT/SRT/MD)
- Power-User-Shortcuts (11 Tastenkombinationen)
- Config Import/Export
- Chip-Editor für Listen mit Regex-Unterstützung
- CSS-gated Live-Umschaltung (kein Reload)

### v7.0.0
- Keyword & Channel Blocking
- Shorts Removal
- Per-Video Blocking
- Settings Dialog

---

## 🤝 Mitwirken

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/amazing-feature`)
3. Committe deine Änderungen (`git commit -m 'Add amazing feature'`)
4. Pushe zum Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

**→ [Issues & Feature Requests](https://github.com/deusexlumen/YoutubeScriptCat/issues)**

---

## 📜 Lizenz

MIT License — Open Source, frei verwendbar, frei modifizierbar.

> **Disclaimer:** Dieses Userscript wird ohne Gewährleistung bereitgestellt. Es steht in keiner Verbindung zu YouTube/Google.

---

<p align="center">
  <b>Made with ❤️ by ScriptCat-Core</b><br>
  <sub>Resonanz ist das Einzige, was zählt.</sub>
</p>
