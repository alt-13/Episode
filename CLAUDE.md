# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Episode++** is a Chrome Extension (Manifest V3) that tracks TV series and automatically opens the next unwatched episode. Single-clicking the extension icon opens the next episode; double-clicking opens the series management popup.

## Development Setup

There is no build system, no package manager, and no test framework. All files are plain JavaScript loaded directly by Chrome.

To develop/test:
1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `src/` directory

After editing any file, click the refresh icon on the extension card in `chrome://extensions` to reload it.

## Architecture

### Script Loading Model

`background.js` (the service worker) uses `importScripts('utils.js', 'series.js', 'context_menus.js')` to load shared code. The popup/edit/options HTML pages load these same scripts via `<script>` tags. This means `utils.js`, `series.js`, and `context_menus.js` must be written to work in both a service worker context and a DOM context.

### Data Storage

- **Series list**: `chrome.storage.sync` under key `episode++Series`. Because sync storage has an 8KB-per-item limit, the series list is automatically chunked using a `__fragments__` counter when it exceeds 8000 bytes.
- **Options**: `chrome.storage.sync` under key `episode++Options` (defined as `storedOptions` in `utils.js`).
- **Tab IDs**: `chrome.storage.local` under key `episode++TabIDs`. Tracks which tab(s) the extension opened so it can reuse/update them. Encoded as a pipe-delimited string: `srcWindowID|windowID|tabID|i/n[|...]`.
- **Form state**: `localStorage` under key `episode++FormContent` (edit page only, persists the edit form across reloads).

### URL Obfuscation

URLs are not stored in plaintext by default. `encodeURL`/`decodeURL` in `series.js` apply a character-shift cipher (offset by position mod 10) plus `encodeURIComponent`. The last character of an encoded URL is the shift seed digit. When `options.plainTextURL` is true this encoding is skipped. The `SeriesList` constructor and `merge()` detect encoded URLs by checking whether they start with `http`.

### Adding Support for a New Streaming Site

1. Write a `buildXxxURL(url, series, seriesList, options)` function in `background.js`. It receives a parsed URL object (from `parseURL` in `utils.js`), the current series data, and calls `openURL(...)` with the constructed episode URL.
2. Register it in the `funMap` object in `background.js`, keyed by hostname or partial hostname.

### Key Files

| File | Purpose |
|---|---|
| `src/manifest.json` | MV3 manifest; declares permissions (`tabs`, `storage`, `notifications`, `contextMenus`) and host permissions |
| `src/background.js` | Service worker; click detection, site-specific URL builders, `funMap` dispatch |
| `src/utils.js` | Shared utilities: `openURL`, `parseURL`, `setPopup`/`unsetPopup`, tab ID helpers, `setIconColor` (uses `OffscreenCanvas` for MV3 compatibility), drag-and-drop helpers |
| `src/series.js` | `Series` class, `SeriesList` class, `restore()` to load from sync storage, `encodeURL`/`decodeURL` |
| `src/context_menus.js` | Context menu creation (up to 5 series + "Episode – –" decrement item) and click listeners |
| `src/popup.js` | Popup UI: series dropdown, select/edit/delete actions; inline delete confirmation |
| `src/edit.js` | Add/edit series form; saves to sync storage on submit |
| `src/options.js` | Options page; domain and mirror list management with drag-to-reorder |
| `src/mirror.js` | `DomainList` class used by options page |
| `src/_locales/` | i18n message files (en, de, es); used via `chrome.i18n.getMessage()` and `localizeHtmlPage()` |

### Click Handling (background.js)

- A 250ms timer distinguishes single vs. double click on the extension icon.
- **Single click**: calls `restore()` → `ifListFoundOpenNewestEpisode()` → `selectService()` → site-specific builder → `openURL()`. Also increments the stored episode counter.
- **Double click**: calls `setPopup()` to attach `popup.html`, then the click opens it.

### `restore()` (series.js)

The central async pattern for reading storage. Takes `ifListNotFound` and `ifListFound` callbacks. Reads all storage fragments recursively, constructs a `SeriesList`, and calls the appropriate callback with `(seriesList, options)`.

### Popup UI Patterns

- **Delete confirmation**: Does not use a modal/overlay. Clicking delete hides `#selection` and shows `#confirmationDialog` as an inline block; cancel reverses this. This keeps the Chrome popup window height flush with the actual content.
- **Button state**: `updateActionButtons()` in `popup.js` disables the edit and delete buttons (via a `disabled` CSS class with `pointer-events: none`) whenever the "add new series" option is selected in the dropdown.
- **Edit/popup width**: Both pages share the `.popup` class (`width: 13em`). The edit page adds `.edit-popup { box-sizing: border-box }` so its `1em` padding is absorbed into that same width.

### Pipe-separated URLs

A series URL can be `url1 | url2` to open two tabs simultaneously. `background.js` splits on ` | ` and calls `openURL` for each. `openURL` uses `openURLCallCount` to cycle through tracked tab IDs when reusing tabs.
