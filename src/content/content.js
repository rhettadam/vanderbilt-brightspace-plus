(() => {
  const { customBranding, homepageWidgetsToHide } = window.VandyExt;

  const LOGO_STYLE_ID = "vandyext-custom-logo-style";
  const HIDDEN_WIDGET_CLASS = "vandyext-hidden-widget";

  function getSettings() {
    return window.VandyExtSettings?.getCachedSettings?.() ?? null;
  }

  function init() {
    if (document.documentElement.dataset.vandyextInit) return;
    document.documentElement.dataset.vandyextInit = "true";

    initCustomLogoReplacement();
    initHomepageWidgetHiding();

    document.addEventListener("vandyext-settings-applied", () => {
      initCustomLogoReplacement();
      refreshHomepageWidgetHiding();
    });
  }

  function initCustomLogoReplacement() {
    const settings = getSettings();
    const useLogo = settings ? settings.customLogo !== false : true;

    if (!useLogo || !customBranding?.logoPath) {
      document.getElementById(LOGO_STYLE_ID)?.remove();
      return;
    }

    applyCustomLogo();

    if (document.documentElement.dataset.vandyextLogoObserver) return;
    document.documentElement.dataset.vandyextLogoObserver = "true";

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        applyCustomLogo();
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function applyCustomLogo() {
    const customLogoUrl = getExtensionAssetUrl(customBranding.logoPath);
    if (!customLogoUrl) return;
    ensureCustomLogoStyles(customLogoUrl);

    const imgSelectors = [
      "d2l-navigation-link-image",
      "d2l-navigation-link-image.d2l-navigation-s-logo",
      "img.d2l-navigation-s-logo",
      "a.d2l-navigation-s-logo-link img",
      ".d2l-navigation-link-image-container img",
      "header img[alt*='Vanderbilt' i]",
      "header img[alt*='Brightspace' i]",
    ];

    for (const selector of imgSelectors) {
      document.querySelectorAll(selector).forEach((element) => {
        if (!(element instanceof HTMLElement)) return;

        if (element.tagName === "IMG") {
          /** @type {HTMLImageElement} */ (element).src = customLogoUrl;
        } else {
          element.setAttribute("src", customLogoUrl);
          const imgInShadow = element.shadowRoot?.querySelector("img");
          if (imgInShadow instanceof HTMLImageElement) imgInShadow.src = customLogoUrl;
        }
      });
    }

    const containerSelectors = [
      ".d2l-labs-navigation-link-image-container",
      "a.d2l-navigation-s-logo-link",
      ".d2l-navigation-s-logo-link",
      ".d2l-navigation-link-image-container",
      "d2l-navigation-link-image.d2l-navigation-s-logo",
      "d2l-navigation-link-image",
    ];

    for (const selector of containerSelectors) {
      document.querySelectorAll(selector).forEach((element) => {
        if (element instanceof HTMLElement) applyCustomLogoToContainer(element, customLogoUrl);
      });
    }
  }

  function ensureCustomLogoStyles(customLogoUrl) {
    let style = document.getElementById(LOGO_STYLE_ID);
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement("style");
      style.id = LOGO_STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = `
      .vandyext-logo-host {
        position: relative !important;
        overflow: visible !important;
      }
      .vandyext-logo-host .vandyext-custom-logo-overlay {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: left center;
        pointer-events: none;
        z-index: 3;
      }
      .vandyext-logo-host img.vandyext-hide-native-logo {
        opacity: 0 !important;
      }
      .d2l-labs-navigation-link-image-container,
      .d2l-labs-navigation-link-image-container[style*="/d2l/lp/navbars/"] {
        background-image: url("${customLogoUrl}") !important;
        background-repeat: no-repeat !important;
        background-position: left center !important;
        background-size: contain !important;
      }
      .d2l-labs-navigation-link-image-container img,
      .d2l-labs-navigation-link-image-container d2l-image,
      .d2l-labs-navigation-link-image-container svg {
        opacity: 0 !important;
      }
    `;
  }

  function applyCustomLogoToContainer(container, customLogoUrl) {
    container.classList.add("vandyext-logo-host");
    container.style.backgroundImage = `url("${customLogoUrl}")`;
    container.style.backgroundRepeat = "no-repeat";
    container.style.backgroundPosition = "left center";
    container.style.backgroundSize = "contain";

    container.querySelectorAll("img").forEach((img) => {
      if (img instanceof HTMLImageElement) img.classList.add("vandyext-hide-native-logo");
    });

    let overlay = container.querySelector(".vandyext-custom-logo-overlay");
    if (!(overlay instanceof HTMLImageElement)) {
      overlay = document.createElement("img");
      overlay.className = "vandyext-custom-logo-overlay";
      overlay.alt = "Vanderbilt University";
      container.appendChild(overlay);
    }

    overlay.src = customLogoUrl;
  }

  function getExtensionAssetUrl(relativePath) {
    if (!relativePath) return null;
    try {
      return globalThis.chrome?.runtime?.getURL?.(relativePath) ?? null;
    } catch {
      return null;
    }
  }

  function normalizeWidgetTitle(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function getHiddenHomepageWidgetTitles() {
    const settings = getSettings();
    if (settings?.hideHomepageWidgets === false) return [];

    const list = settings?.hiddenHomepageWidgets ?? homepageWidgetsToHide ?? [];
    return list.map(normalizeWidgetTitle).filter(Boolean);
  }

  function restoreHiddenWidgets() {
    document.querySelectorAll(`.${HIDDEN_WIDGET_CLASS}`).forEach((tile) => {
      if (!(tile instanceof HTMLElement)) return;
      tile.classList.remove(HIDDEN_WIDGET_CLASS);
      tile.removeAttribute("aria-hidden");
      delete tile.dataset.vandyextHidden;
    });

    document.querySelectorAll(".homepage-row.vandyext-hidden-widget").forEach((row) => {
      if (!(row instanceof HTMLElement)) return;
      row.classList.remove(HIDDEN_WIDGET_CLASS);
      row.removeAttribute("aria-hidden");
    });
  }

  function refreshHomepageWidgetHiding() {
    restoreHiddenWidgets();
    hideHomepageWidgets();
  }

  function getWidgetTitle(widget) {
    const heading = widget.querySelector(
      ".d2l-widget-header .d2l-heading, .d2l-widget-header h2, .d2l-widget-header h3, .d2l-widget-header h4"
    );
    if (heading?.textContent) return heading.textContent.trim();

    const labelled = widget.querySelector("[aria-label]");
    return labelled?.getAttribute("aria-label")?.trim() ?? "";
  }

  function hideWidgetElement(widget) {
    const tile =
      widget.closest(".d2l-tile.d2l-widget, .d2l-widget.d2l-tile, .d2l-widget") ?? widget;

    if (!(tile instanceof HTMLElement) || tile.classList.contains(HIDDEN_WIDGET_CLASS)) return;

    tile.classList.add(HIDDEN_WIDGET_CLASS);
    tile.setAttribute("aria-hidden", "true");
    tile.dataset.vandyextHidden = "true";

    const row = tile.closest(".homepage-row");
    if (row instanceof HTMLElement) {
      const hasVisibleChild = [...row.children].some(
        (child) =>
          child instanceof HTMLElement && !child.classList.contains(HIDDEN_WIDGET_CLASS)
      );
      if (!hasVisibleChild) {
        row.classList.add(HIDDEN_WIDGET_CLASS);
        row.setAttribute("aria-hidden", "true");
      }
    }
  }

  function hideHomepageWidgets() {
    const titles = getHiddenHomepageWidgetTitles();
    if (!window.VandyExtSettings?.isOrgHomepage?.() || titles.length === 0) return;

    document
      .querySelectorAll(".d2l-widget, .d2l-tile.d2l-widget, .homepage-container .d2l-tile")
      .forEach((widget) => {
        if (!(widget instanceof HTMLElement) || widget.dataset.vandyextHidden === "true") return;

        const title = getWidgetTitle(widget);
        if (titles.includes(normalizeWidgetTitle(title))) hideWidgetElement(widget);
      });
  }

  function initHomepageWidgetHiding() {
    refreshHomepageWidgetHiding();

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        hideHomepageWidgets();
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
