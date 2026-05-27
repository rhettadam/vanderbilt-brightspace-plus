# Vandy Brightspace+

Chrome extension for [Vanderbilt Brightspace](https://brightspace.vanderbilt.edu/): darker UI, quick links to common campus tools, and optional instructor lookup via Rate My Professor search URLs (no scraping).

## Install (developer / unpacked)

1. Open Chrome → **Extensions** → enable **Developer mode**.
2. **Load unpacked** and choose this folder (`vandyext`).
3. Icons: Replace placeholder PNGs in `icons/` or remove `icons` references from `manifest.json` temporarily (Chrome may warn; you can ignore for local testing by adding minimal icons).

## Customize

Edit `src/content/links.js`:

- **`vandyLinks`** — URLs and labels shown in the in-page drawer and popup.
- **`rateMyProfessorSchoolSid`** — RMP school id used in search URLs. Confirm on [ratemyprofessors.com](https://www.ratemyprofessors.com/) for Vanderbilt if search results look wrong.

## Reality checks (D2L + browsers)

- **CSS:** Brightspace “Daylight” uses many Shadow DOM widgets. Global `theme.css` improves chrome, headers, and a lot of the shell; some widgets may stay light until you extend styles or add narrower overrides.
- **Rate My Professor:** Inline ratings typically require scraping or unofficial APIs and may conflict with site terms of use. This project only opens **search** links keyed off visible instructor text so you click through safely.
- **Privacy:** Host permission is limited to `https://brightspace.vanderbilt.edu/*` only—no analytics or remote calls unless you add them.

## Icons

Chrome expects `icons/` PNGs referenced in `manifest.json`. Easiest bootstrap: export any 128×128 image to 16 / 48 / 128 PNGs named `icon16.png`, etc.
