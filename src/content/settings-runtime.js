(function () {
  const STYLE_ID = "vandyext-dynamic-settings";
  const PRESET_CLASS_PREFIX = "vandyext-preset-";

  function applySettings(settings) {
    const api = window.VandyExtSettings;
    const html = document.documentElement;
    const s = settings ?? api?.getCachedSettings?.() ?? {};

    for (const id of api?.getPresetIds?.() ?? []) {
      html.classList.remove(`${PRESET_CLASS_PREFIX}${id}`);
    }

    html.classList.toggle("vandyext-theme-off", !s.darkModeEnabled);
    html.classList.toggle("vandyext-fullwidth", Boolean(s.fullWidth));
    html.classList.toggle("vandyext-no-focus-rings", !s.goldFocusRings);
    html.classList.toggle("vandyext-no-scrollbars", !s.customScrollbars);
    html.classList.toggle("vandyext-no-card-hover", !s.cardHoverGlow);
    html.classList.toggle("vandyext-no-banner-overlay", !s.bannerOverlay);
    html.classList.toggle("vandyext-remove-banner", Boolean(s.removeBanner));
    html.classList.toggle("vandyext-no-pin-gold", !s.pinStarGold);
    html.classList.toggle("vandyext-no-widget-hide", !s.hideHomepageWidgets);

    if (s.darkModeEnabled) {
      html.classList.add("vandyext-dark");
      html.setAttribute("data-color-mode", "dark");
      html.classList.add(`${PRESET_CLASS_PREFIX}${s.themePreset || "vanderbilt"}`);

      const presetVars = api?.getPresetVars?.(s.themePreset) ?? {};
      for (const [name, value] of Object.entries(presetVars)) {
        html.style.setProperty(name, value);
      }
    } else {
      html.classList.remove("vandyext-dark");
      html.removeAttribute("data-color-mode");
    }

    html.classList.toggle(
      "vandyext-interior",
      Boolean(s.interiorStyling) && api?.isInteriorPage?.()
    );
    html.classList.toggle(
      "vandyext-calendar",
      Boolean(s.calendarStyling) && api?.isCalendarPage?.()
    );

    applyDynamicStyle(s);
    document.dispatchEvent(new CustomEvent("vandyext-settings-applied", { detail: s }));
    window.VandyExtShadow?.scanPage?.();
  }

  function applyDynamicStyle(settings) {
    let style = document.getElementById(STYLE_ID);
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }

    const fontSize = Number(settings.fontSize) || 16;
    const brightness = Math.min(200, Math.max(0, Number(settings.bannerBrightness) || 100));
    const filter = settings.removeBanner ? "none" : `brightness(${brightness / 100})`;

    style.textContent = `
      html.vandyext-dark {
        font-size: ${fontSize}px !important;
      }

      html.vandyext-remove-banner .d2l-card-header-image,
      html.vandyext-remove-banner .d2l-card-image,
      html.vandyext-remove-banner .d2l-enrollment-card-image,
      html.vandyext-remove-banner .d2l-card-banner,
      html.vandyext-remove-banner .d2l-enrollment-card-banner,
      html.vandyext-remove-banner d2l-card .d2l-card-header,
      html.vandyext-remove-banner d2l-enrollment-card .d2l-enrollment-card-header {
        display: none !important;
      }

      html.vandyext-dark:not(.vandyext-remove-banner) .d2l-card-header-image,
      html.vandyext-dark:not(.vandyext-remove-banner) .d2l-card-image,
      html.vandyext-dark:not(.vandyext-remove-banner) .d2l-enrollment-card-image,
      html.vandyext-dark:not(.vandyext-remove-banner) .d2l-card-banner,
      html.vandyext-dark:not(.vandyext-remove-banner) .d2l-enrollment-card-banner,
      html.vandyext-dark:not(.vandyext-remove-banner) .course-image.d2l-course-tile {
        filter: ${filter} !important;
      }

      html.vandyext-theme-off,
      html.vandyext-theme-off body {
        background: revert-layer !important;
        color: revert-layer !important;
      }
    `;
  }

  async function init() {
    const api = window.VandyExtSettings;
    if (!api) return;

    applySettings(await api.loadSettings());
    api.onSettingsChanged(applySettings);
  }

  init();
})();
