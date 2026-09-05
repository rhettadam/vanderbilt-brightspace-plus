const { DEFAULT_SETTINGS, THEME_PRESETS, loadSettings, saveSettings, resetSettings } =
  window.VandyExtSettings;

const navButtons = document.querySelectorAll(".options-nav-btn");
const panels = document.querySelectorAll(".options-panel");
const themeGrid = document.getElementById("theme-grid");
const saveStatus = document.getElementById("save-status");
const coursesList = document.getElementById("courses-list");
const coursesEmpty = document.getElementById("courses-empty");

const fields = {
  darkModeEnabled: document.getElementById("setting-dark-mode"),
  fontSize: document.getElementById("setting-font-size"),
  fullWidth: document.getElementById("setting-full-width"),
  bannerBrightness: document.getElementById("setting-banner-brightness"),
  removeBanner: document.getElementById("setting-remove-banner"),
  bannerOverlay: document.getElementById("setting-banner-overlay"),
  customLogo: document.getElementById("setting-custom-logo"),
  interiorStyling: document.getElementById("setting-interior-styling"),
  calendarStyling: document.getElementById("setting-calendar-styling"),
  shadowTheme: document.getElementById("setting-shadow-theme"),
  apiIntegrations: document.getElementById("setting-api-integrations"),
  hideHomepageWidgets: document.getElementById("setting-hide-widgets"),
  hiddenHomepageWidgets: document.getElementById("setting-hidden-widgets"),
  goldFocusRings: document.getElementById("setting-focus-rings"),
  customScrollbars: document.getElementById("setting-scrollbars"),
  cardHoverGlow: document.getElementById("setting-card-hover"),
  pinStarGold: document.getElementById("setting-pin-gold"),
};

const fontSizeValue = document.getElementById("font-size-value");
const bannerBrightnessValue = document.getElementById("banner-brightness-value");

/** @type {typeof DEFAULT_SETTINGS} */
let draft = { ...DEFAULT_SETTINGS };
/** @type {Array<{orgUnitId:string|number, name:string, code?:string}>} */
let syncedCourses = [];

function showTab(tabId) {
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  panels.forEach((panel) => {
    const active = panel.dataset.panel === tabId;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });

  draft.activeTab = tabId;
  if (tabId === "courses") renderCoursesList();
}

function renderThemeCards() {
  themeGrid.replaceChildren();

  for (const preset of Object.values(THEME_PRESETS)) {
    const card = document.createElement("article");
    card.className = "theme-card";
    card.dataset.preset = preset.id;
    if (preset.id === draft.themePreset) card.classList.add("selected");

    const swatch = document.createElement("div");
    swatch.className = "theme-swatch";
    for (const color of preset.swatch) {
      const span = document.createElement("span");
      span.style.background = color;
      swatch.appendChild(span);
    }

    const title = document.createElement("h3");
    title.textContent = preset.label;

    const desc = document.createElement("p");
    desc.textContent = preset.description;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-apply";
    btn.textContent = preset.id === draft.themePreset ? "Applied" : "Apply";
    if (preset.id === draft.themePreset) btn.classList.add("applied");

    btn.addEventListener("click", () => {
      draft.themePreset = preset.id;
      renderThemeCards();
      persistDraft(true);
    });

    card.append(swatch, title, desc, btn);
    themeGrid.appendChild(card);
  }
}

function parseWidgetList(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function widgetsToText(list) {
  return (list || []).join("\n");
}

function ensureCourseOverrides() {
  if (!draft.courseOverrides || typeof draft.courseOverrides !== "object") {
    draft.courseOverrides = {};
  }
  return draft.courseOverrides;
}

function upsertCourseOverride(id, patch) {
  const overrides = ensureCourseOverrides();
  const key = String(id);
  const current = { ...(overrides[key] || {}) };
  Object.assign(current, patch);

  const empty =
    !current.nickname &&
    !current.accent &&
    !current.hide;

  if (empty) delete overrides[key];
  else overrides[key] = current;
}

function renderCoursesList() {
  if (!coursesList || !coursesEmpty) return;
  coursesList.replaceChildren();

  if (!syncedCourses.length) {
    coursesEmpty.hidden = false;
    return;
  }

  coursesEmpty.hidden = true;
  const overrides = ensureCourseOverrides();

  for (const course of syncedCourses) {
    const id = String(course.orgUnitId);
    const ov = overrides[id] || {};

    const row = document.createElement("div");
    row.className = "course-row";
    row.dataset.courseId = id;

    const meta = document.createElement("div");
    meta.className = "course-meta";
    const name = document.createElement("strong");
    name.textContent = course.name || `Course ${id}`;
    name.title = course.name || "";
    const code = document.createElement("small");
    code.textContent = course.code ? `${course.code} · ID ${id}` : `ID ${id}`;
    meta.append(name, code);

    const nick = document.createElement("input");
    nick.type = "text";
    nick.placeholder = "Nickname";
    nick.value = ov.nickname || "";
    nick.addEventListener("change", () => {
      upsertCourseOverride(id, { nickname: nick.value.trim() });
    });

    const accent = document.createElement("input");
    accent.type = "color";
    accent.title = "Accent color";
    accent.value = ov.accent || "#f4c430";
    accent.addEventListener("change", () => {
      upsertCourseOverride(id, { accent: accent.value });
    });

    const hideLabel = document.createElement("label");
    hideLabel.className = "course-hide";
    const hide = document.createElement("input");
    hide.type = "checkbox";
    hide.checked = Boolean(ov.hide);
    hide.addEventListener("change", () => {
      upsertCourseOverride(id, { hide: hide.checked });
    });
    hideLabel.append(hide, document.createTextNode("Hide"));

    row.append(meta, nick, accent, hideLabel);
    coursesList.appendChild(row);
  }
}

function loadSyncedCourses() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(["vandyextApiCache"], (data) => {
        const courses = data?.vandyextApiCache?.courses;
        resolve(Array.isArray(courses) ? courses : []);
      });
    } catch {
      resolve([]);
    }
  });
}

function readFormIntoDraft() {
  draft.darkModeEnabled = fields.darkModeEnabled.checked;
  draft.fontSize = Number(fields.fontSize.value);
  draft.fullWidth = fields.fullWidth.checked;
  draft.bannerBrightness = Number(fields.bannerBrightness.value);
  draft.removeBanner = fields.removeBanner.checked;
  draft.bannerOverlay = fields.bannerOverlay.checked;
  draft.customLogo = fields.customLogo.checked;
  draft.interiorStyling = fields.interiorStyling.checked;
  draft.calendarStyling = fields.calendarStyling.checked;
  draft.shadowTheme = fields.shadowTheme.checked;
  draft.apiIntegrations = fields.apiIntegrations.checked;
  draft.hideHomepageWidgets = fields.hideHomepageWidgets.checked;
  draft.hiddenHomepageWidgets = parseWidgetList(fields.hiddenHomepageWidgets.value);
  draft.goldFocusRings = fields.goldFocusRings.checked;
  draft.customScrollbars = fields.customScrollbars.checked;
  draft.cardHoverGlow = fields.cardHoverGlow.checked;
  draft.pinStarGold = fields.pinStarGold.checked;
  ensureCourseOverrides();
}

function writeDraftToForm() {
  fields.darkModeEnabled.checked = draft.darkModeEnabled;
  fields.fontSize.value = String(draft.fontSize);
  fields.fullWidth.checked = draft.fullWidth;
  fields.bannerBrightness.value = String(draft.bannerBrightness);
  fields.removeBanner.checked = draft.removeBanner;
  fields.bannerOverlay.checked = draft.bannerOverlay;
  fields.customLogo.checked = draft.customLogo;
  fields.interiorStyling.checked = draft.interiorStyling;
  fields.calendarStyling.checked = draft.calendarStyling;
  fields.shadowTheme.checked = draft.shadowTheme;
  fields.apiIntegrations.checked = draft.apiIntegrations;
  fields.hideHomepageWidgets.checked = draft.hideHomepageWidgets;
  fields.hiddenHomepageWidgets.value = widgetsToText(draft.hiddenHomepageWidgets);
  fields.goldFocusRings.checked = draft.goldFocusRings;
  fields.customScrollbars.checked = draft.customScrollbars;
  fields.cardHoverGlow.checked = draft.cardHoverGlow;
  fields.pinStarGold.checked = draft.pinStarGold;

  fontSizeValue.textContent = `${draft.fontSize}px`;
  bannerBrightnessValue.textContent = `${draft.bannerBrightness}%`;
  toggleBannerControls(draft.removeBanner);
  renderThemeCards();
  renderCoursesList();
}

function toggleBannerControls(removeBanner) {
  fields.bannerBrightness.disabled = removeBanner;
  fields.bannerOverlay.disabled = removeBanner;
}

function flashStatus(message) {
  saveStatus.textContent = message;
  if (!message) return;
  window.clearTimeout(flashStatus.timer);
  flashStatus.timer = window.setTimeout(() => {
    saveStatus.textContent = "";
  }, 2200);
}

async function persistDraft(showMessage = true) {
  readFormIntoDraft();
  await saveSettings(draft);
  if (showMessage) flashStatus("Saved!");
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    showTab(btn.dataset.tab);
  });
});

fields.fontSize.addEventListener("input", () => {
  fontSizeValue.textContent = `${fields.fontSize.value}px`;
});

fields.bannerBrightness.addEventListener("input", () => {
  bannerBrightnessValue.textContent = `${fields.bannerBrightness.value}%`;
});

fields.removeBanner.addEventListener("change", (event) => {
  toggleBannerControls(event.target.checked);
});

document.getElementById("btn-save").addEventListener("click", () => {
  persistDraft(true);
});

document.getElementById("btn-reset").addEventListener("click", async () => {
  if (!window.confirm("Reset all settings to defaults?")) return;
  draft = { ...(await resetSettings()) };
  writeDraftToForm();
  flashStatus("Reset to defaults");
});

try {
  const manifest = chrome.runtime.getManifest();
  document.getElementById("about-version").textContent = manifest.version;
} catch {
  // Ignore outside extension context.
}

Promise.all([loadSettings(), loadSyncedCourses()]).then(([settings, courses]) => {
  draft = { ...settings };
  ensureCourseOverrides();
  syncedCourses = courses;
  writeDraftToForm();
  showTab(draft.activeTab || "themes");
});
