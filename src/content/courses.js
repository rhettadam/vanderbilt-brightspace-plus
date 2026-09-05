/**
 * Per-course nickname / accent / hide overrides on the org homepage.
 */
(function () {
  const STYLE_ID = "vandyext-course-overrides";
  const ATTR = "data-vandyext-course-id";

  function getSettings() {
    return window.VandyExtSettings?.getCachedSettings?.() ?? null;
  }

  function getOverrides() {
    const overrides = getSettings()?.courseOverrides;
    return overrides && typeof overrides === "object" ? overrides : {};
  }

  function extractOrgUnitId(href) {
    if (!href) return null;
    const home = href.match(/\/d2l\/home\/(\d+)/i);
    if (home) return home[1];
    const ou = href.match(/[?&]ou=(\d+)/i);
    if (ou) return ou[1];
    const le = href.match(/\/d2l\/le\/[^/]+\/(\d+)/i);
    if (le) return le[1];
    return null;
  }

  function findCourseCards() {
    const cards = new Map();

    document
      .querySelectorAll(
        "d2l-enrollment-card, d2l-card, .d2l-enrollment-card, a[href*='/d2l/home/']"
      )
      .forEach((el) => {
        if (!(el instanceof HTMLElement)) return;

        let href =
          el.getAttribute("href") ||
          el.querySelector?.("a[href*='/d2l/home/']")?.getAttribute("href") ||
          "";
        if (!href && el.shadowRoot) {
          href = el.shadowRoot.querySelector("a[href*='/d2l/home/']")?.getAttribute("href") || "";
        }

        const id = extractOrgUnitId(href);
        if (!id) return;

        const host =
          el.closest("d2l-enrollment-card, d2l-card, .d2l-enrollment-card") || el;
        if (host instanceof HTMLElement) cards.set(id, host);
      });

    return cards;
  }

  function findTitleNode(card) {
    const selectors = [
      ".d2l-enrollment-card-title",
      ".d2l-card-content .d2l-heading",
      ".d2l-heading",
      "[slot='content'] .d2l-heading",
      "h2",
      "h3",
    ];

    for (const sel of selectors) {
      const node = card.querySelector(sel);
      if (node?.textContent?.trim()) return node;
    }

    if (card.shadowRoot) {
      for (const sel of selectors) {
        const node = card.shadowRoot.querySelector(sel);
        if (node?.textContent?.trim()) return node;
      }
      const slotted = card.shadowRoot.querySelector("slot[name='content'], slot");
      const assigned = slotted?.assignedElements?.() || [];
      for (const el of assigned) {
        const heading = el.querySelector?.(".d2l-heading, h2, h3");
        if (heading?.textContent?.trim()) return heading;
      }
    }

    return null;
  }

  function ensureOverrideStyles(overrides) {
    let style = document.getElementById(STYLE_ID);
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }

    const rules = Object.entries(overrides)
      .map(([id, ov]) => {
        if (!ov || typeof ov !== "object") return "";
        const accent = ov.accent || "";
        const hide = Boolean(ov.hide);
        const parts = [];
        if (hide) {
          parts.push(`
            [${ATTR}="${id}"] {
              display: none !important;
            }
          `);
        }
        if (accent) {
          parts.push(`
            [${ATTR}="${id}"] {
              border-color: ${accent} !important;
              box-shadow: inset 0 0 0 1px ${accent} !important;
            }
            [${ATTR}="${id}"] .d2l-heading,
            [${ATTR}="${id}"] .d2l-enrollment-card-title {
              color: ${accent} !important;
            }
          `);
        }
        return parts.join("\n");
      })
      .join("\n");

    style.textContent = rules;
  }

  function applyCourseOverrides() {
    if (!window.VandyExtSettings?.isOrgHomepage?.()) return;

    const overrides = getOverrides();
    ensureOverrideStyles(overrides);

    const cards = findCourseCards();
    cards.forEach((card, id) => {
      card.setAttribute(ATTR, id);
      const ov = overrides[id];
      if (!ov) return;

      if (ov.nickname) {
        const title = findTitleNode(card);
        if (title && title.dataset.vandyextNickname !== ov.nickname) {
          if (!title.dataset.vandyextOriginalTitle) {
            title.dataset.vandyextOriginalTitle = title.textContent.trim();
          }
          title.textContent = ov.nickname;
          title.dataset.vandyextNickname = ov.nickname;
        }
      }
    });
  }

  function init() {
    applyCourseOverrides();

    document.addEventListener("vandyext-settings-applied", applyCourseOverrides);
    document.addEventListener("vandyext-api-ready", applyCourseOverrides);

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        applyCourseOverrides();
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.VandyExtCourses = { applyCourseOverrides };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
