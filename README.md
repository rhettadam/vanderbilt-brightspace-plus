# Vandy Brightspace+

Chrome extension for [Vanderbilt Brightspace](https://brightspace.vanderbilt.edu/): darker UI, quick links to common campus tools, optional Brightspace API sync (name + courses, local cache), and Rate My Professor search URLs (no scraping).

## Install (developer / unpacked)

1. Open Chrome → **Extensions** → enable **Developer mode**.
2. **Load unpacked** and choose this folder (`vanderbilt-brightspace-plus`).
3. Icons: Replace placeholder PNGs in `icons/` or remove `icons` references from `manifest.json` temporarily (Chrome may warn; you can ignore for local testing by adding minimal icons).

## Customize

Edit `src/content/links.js`:

- **`vandyLinks`** — URLs and labels shown in the popup.
- **`rateMyProfessorSchoolSid`** — RMP school id used in search URLs. Confirm on [ratemyprofessors.com](https://www.ratemyprofessors.com/) for Vanderbilt if search results look wrong.

Open **Options** for themes, layout, feature toggles (including Shadow DOM theming and Brightspace data sync).

## Reality checks (D2L + browsers)

- **CSS:** Brightspace “Daylight” uses Lit web components + Shadow DOM. We set `data-color-mode="dark"`, remap Daylight tokens, inject shadow CSS, and patch `adoptedStyleSheets` in the page MAIN world so Lit cannot eject styles.
- **APIs:** With **Brightspace data sync** enabled, the extension uses your session XSRF token to call Brightspace Valence APIs (`whoami`, enrollments) and caches results in `chrome.storage.local` only.
- **Rate My Professor:** Inline ratings typically require scraping or unofficial APIs and may conflict with site terms of use. This project only opens **search** links so you click through safely.
- **Privacy:** Host permission is limited to `https://brightspace.vanderbilt.edu/*` only—no analytics.

## Icons

Chrome expects `icons/` PNGs referenced in `manifest.json`. Easiest bootstrap: export any 128×128 image to 16 / 48 / 128 PNGs named `icon16.png`, etc.
