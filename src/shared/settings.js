(() => {
  const STORAGE_KEY = "vandyextSettings";

  const DEFAULT_SETTINGS = {
    activeTab: "themes",
    darkModeEnabled: true,
    themePreset: "vanderbilt",
    customLogo: true,
    fullWidth: false,
    fontSize: 16,
    bannerBrightness: 100,
    removeBanner: false,
    bannerOverlay: true,
    interiorStyling: true,
    calendarStyling: true,
    shadowTheme: true,
    hideHomepageWidgets: true,
    hiddenHomepageWidgets: ["Instructor Announcements"],
    goldFocusRings: true,
    customScrollbars: true,
    cardHoverGlow: true,
    pinStarGold: true,
  };

  const THEME_PRESETS = {
    vanderbilt: {
      id: "vanderbilt",
      label: "Vanderbilt Gold",
      description: "Black and gold — the default Vanderbilt look.",
      swatch: ["#0f1115", "#f4c430"],
      vars: {
        "--vandy-gold": "#cfae70",
        "--vandy-gold-bright": "#f4c430",
        "--vandy-black": "#0f1115",
        "--vandy-surface": "#171a21",
        "--vandy-surface-2": "#1f2430",
        "--vandy-border": "#2d3444",
        "--vandy-text": "#e8eaef",
        "--vandy-muted": "#9aa3b5",
        "--d2l-theme-brand-color-primary-default": "#f4c430",
        "--d2l-theme-text-color-interactive-default": "#f4c430",
        "--d2l-focus-ring-color": "#f4c430",
      },
    },
    midnight: {
      id: "midnight",
      label: "Midnight",
      description: "Cool blue-gray nights with ice-blue accents.",
      swatch: ["#080b12", "#7eb8da"],
      vars: {
        "--vandy-gold": "#5a8fb8",
        "--vandy-gold-bright": "#7eb8da",
        "--vandy-black": "#080b12",
        "--vandy-surface": "#101622",
        "--vandy-surface-2": "#161e2e",
        "--vandy-border": "#243044",
        "--vandy-text": "#e4eaf2",
        "--vandy-muted": "#8a9bb5",
        "--d2l-theme-brand-color-primary-default": "#7eb8da",
        "--d2l-theme-text-color-interactive-default": "#7eb8da",
        "--d2l-focus-ring-color": "#7eb8da",
      },
    },
    amethyst: {
      id: "amethyst",
      label: "Amethyst",
      description: "Deep purple surfaces with violet highlights.",
      swatch: ["#0e0818", "#c4a0ff"],
      vars: {
        "--vandy-gold": "#9b7fd4",
        "--vandy-gold-bright": "#c4a0ff",
        "--vandy-black": "#0e0818",
        "--vandy-surface": "#161022",
        "--vandy-surface-2": "#1f1630",
        "--vandy-border": "#342a4a",
        "--vandy-text": "#ece8f4",
        "--vandy-muted": "#a89bc0",
        "--d2l-theme-brand-color-primary-default": "#c4a0ff",
        "--d2l-theme-text-color-interactive-default": "#c4a0ff",
        "--d2l-focus-ring-color": "#c4a0ff",
      },
    },
    forest: {
      id: "forest",
      label: "Forest",
      description: "Dark greens inspired by classic D2L++ themes.",
      swatch: ["#000400", "#4e9f3d"],
      vars: {
        "--vandy-gold": "#4e9f3d",
        "--vandy-gold-bright": "#7ecf5a",
        "--vandy-black": "#000400",
        "--vandy-surface": "#0c1b10",
        "--vandy-surface-2": "#122818",
        "--vandy-border": "#1e3a24",
        "--vandy-text": "#d8ead8",
        "--vandy-muted": "#6f9a72",
        "--d2l-theme-brand-color-primary-default": "#7ecf5a",
        "--d2l-theme-text-color-interactive-default": "#7ecf5a",
        "--d2l-focus-ring-color": "#7ecf5a",
      },
    },
    slate: {
      id: "slate",
      label: "Slate",
      description: "Neutral charcoal with soft silver accents.",
      swatch: ["#111318", "#c8cdd8"],
      vars: {
        "--vandy-gold": "#9aa3b5",
        "--vandy-gold-bright": "#c8cdd8",
        "--vandy-black": "#111318",
        "--vandy-surface": "#181b22",
        "--vandy-surface-2": "#22262f",
        "--vandy-border": "#333844",
        "--vandy-text": "#e8eaef",
        "--vandy-muted": "#8b919e",
        "--d2l-theme-brand-color-primary-default": "#c8cdd8",
        "--d2l-theme-text-color-interactive-default": "#c8cdd8",
        "--d2l-focus-ring-color": "#c8cdd8",
      },
    },
  };

  let cache = null;

  function getStorage() {
    try {
      return globalThis.chrome?.storage?.local ?? null;
    } catch {
      return null;
    }
  }

  function mergeSettings(stored) {
    const merged = { ...DEFAULT_SETTINGS, ...(stored || {}) };
    if (!Array.isArray(merged.hiddenHomepageWidgets)) {
      merged.hiddenHomepageWidgets = [...DEFAULT_SETTINGS.hiddenHomepageWidgets];
    }
    if (!THEME_PRESETS[merged.themePreset]) {
      merged.themePreset = DEFAULT_SETTINGS.themePreset;
    }
    return merged;
  }

  function loadSettings() {
    if (cache) return Promise.resolve(cache);

    const storage = getStorage();
    if (!storage) {
      cache = mergeSettings(null);
      return Promise.resolve(cache);
    }

    return new Promise((resolve) => {
      storage.get([STORAGE_KEY], (data) => {
        cache = mergeSettings(data?.[STORAGE_KEY]);
        resolve(cache);
      });
    });
  }

  function saveSettings(settings) {
    cache = mergeSettings(settings);
    const storage = getStorage();
    if (!storage) return Promise.resolve(cache);

    return new Promise((resolve) => {
      storage.set({ [STORAGE_KEY]: cache }, () => resolve(cache));
    });
  }

  function resetSettings() {
    cache = mergeSettings(null);
    return saveSettings(cache);
  }

  function getCachedSettings() {
    return cache ? mergeSettings(cache) : mergeSettings(null);
  }

  function onSettingsChanged(callback) {
    getStorage()?.onChanged?.addListener((changes, area) => {
      if (area !== "local" || !changes[STORAGE_KEY]) return;
      cache = mergeSettings(changes[STORAGE_KEY].newValue);
      callback(cache);
    });
  }

  function getPresetVars(presetId) {
    return THEME_PRESETS[presetId]?.vars ?? THEME_PRESETS.vanderbilt.vars;
  }

  function getPresetIds() {
    return Object.keys(THEME_PRESETS);
  }

  function isInteriorPage(path = location.pathname) {
    return (
      /\/d2l\/home\/\d+/i.test(path) ||
      /\/d2l\/le\//i.test(path) ||
      /\/d2l\/lp\//i.test(path) ||
      /\/d2l\/lms\//i.test(path)
    );
  }

  function isCalendarPage(path = location.pathname) {
    return /\/d2l\/le\/calendar/i.test(path);
  }

  function isOrgHomepage(path = location.pathname) {
    return /^\/d2l\/home\/?(?:\?.*)?$/i.test(path);
  }

  globalThis.VandyExtSettings = {
    STORAGE_KEY,
    DEFAULT_SETTINGS,
    THEME_PRESETS,
    mergeSettings,
    loadSettings,
    saveSettings,
    resetSettings,
    getCachedSettings,
    onSettingsChanged,
    getPresetVars,
    getPresetIds,
    isInteriorPage,
    isCalendarPage,
    isOrgHomepage,
  };
})();
