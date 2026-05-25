# YouTube Homepage Suite

A powerful Userscript for YouTube that helps you customize your homepage experience by filtering unwanted content.

## Features

- **Keyword Blocking**: Hide videos containing specific keywords in their titles
- **Channel Blocking**: Block videos from specific channels
- **Shorts Removal**: Automatically remove YouTube Shorts from your homepage
- **Per-Video Blocking**: Quick block button on each video card
- **Configuration Dialog**: Easy-to-use settings interface accessible from the YouTube header

## Installation

### Prerequisites

You need a userscript manager installed in your browser:

- [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Safari, Edge)
- [Greasemonkey](https://www.greasespot.net/) (Firefox)
- [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge)
- [ScriptCat](https://docs.scriptcat.org/) (Advanced users)

### Install the Script

1. Install a userscript manager extension in your browser
2. Click on the raw version of `youtube_suite.user.js` or `youtube_suite_fixed.user.js`
3. Your userscript manager should detect it and prompt you to install
4. Click "Install" to activate the script

Alternatively, download the `.user.js` file and import it into your userscript manager.

## Usage

Once installed, the script runs automatically on all YouTube pages.

### Configuration

Access the configuration dialog by:

1. Clicking the **"YT Suite"** button in the YouTube header
2. Using your userscript manager's menu command: **"⚙️ Configure YT Suite"**

### Settings

In the configuration dialog, you can:

- **Blocked Keywords**: Enter comma-separated keywords to filter out videos (e.g., `spoiler, clickbait, unfassbar`)
- **Blocked Channels**: Enter comma-separated channel names to block (e.g., `NervigerCreatorTV`)
- **Remove Shorts**: Toggle to show/hide YouTube Shorts

### Per-Video Blocking

Hover over any video card on your homepage to reveal a block button (🚫) in the top-right corner. Click it to instantly hide that video.

## Files

| File | Description |
|------|-------------|
| `youtube_suite.user.js` | Main userscript with keyword/channel blocking and shorts removal |
| `youtube_suite_fixed.user.js` | Alternative/fixed version of the script |

## Technical Details

- **Version**: 7.0.0
- **Author**: ScriptCat-Core
- **License**: Open source (Userscript)
- **Compatible Sites**: `*.youtube.com/*`
- **Required Permissions**: 
  - `GM_getValue` / `GM_setValue` - For storing preferences
  - `GM_registerMenuCommand` - For menu integration
  - `GM_notification` - For user notifications

## How It Works

The script uses a MutationObserver to monitor YouTube's dynamic content loading. When new video cards appear, it:

1. Checks video titles against blocked keywords
2. Checks channel names against blocked channels
3. Identifies and removes Shorts content
4. Adds block buttons to each video card

All filtering happens client-side in your browser.

## Troubleshooting

**Videos not being filtered?**
- Refresh the page after changing settings
- Check that keywords/channel names match exactly
- Ensure your userscript manager is enabled

**Script not working?**
- Verify your userscript manager is active
- Check browser console for errors (F12 → Console)
- Try reinstalling the script

## Contributing

Feel free to modify the script for your needs. The configuration is stored using GM storage functions, making it persistent across sessions.

## Disclaimer

This userscript is provided as-is without any warranty. Use at your own risk. This script is not affiliated with or endorsed by YouTube/Google.
