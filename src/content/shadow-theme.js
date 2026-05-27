/**
 * Brightspace renders much of its UI inside shadow DOM with light-theme tokens.
 * This module applies dark D2L CSS variables and injects overrides as components mount.
 */
(function () {
  const SHADOW_STYLE_ID = "vandyext-shadow-theme";
  const CUSTOM_LOGO_URL = (() => {
    try {
      return chrome?.runtime?.getURL?.("assets/custom-vandy-logo.png") ?? "";
    } catch {
      return "";
    }
  })();

  const HOST_CSS_VARS = {
    "--d2l-color-regolith": "#0f1115",
    "--d2l-color-sylvite": "#12151c",
    "--d2l-color-gypsum": "#2d3444",
    "--d2l-color-mica": "#3a4154",
    "--d2l-color-corundum": "#4d566d",
    "--d2l-color-chromite": "#6f788a",
    "--d2l-color-galena": "#9aa3b5",
    "--d2l-color-tungsten": "#cdd5dc",
    "--d2l-color-ferrite": "#e8eaef",
    "--d2l-theme-background-color-base": "#171a21",
    "--d2l-theme-background-color-elevated": "#1f2430",
    "--d2l-theme-background-color-floating": "#1f2430",
    "--d2l-theme-background-color-sunken": "#0a0c10",
    "--d2l-theme-background-color-interactive-faint-default": "#151820",
    "--d2l-theme-background-color-interactive-faint-hover": "#181c26",
    "--d2l-theme-background-color-interactive-secondary-default": "#0f1115",
    "--d2l-theme-background-color-interactive-secondary-hover": "#151820",
    "--d2l-theme-background-color-interactive-tertiary-default": "transparent",
    "--d2l-theme-background-color-interactive-tertiary-hover": "rgba(207, 174, 112, 0.1)",
    "--d2l-theme-icon-color-standard": "#e8eaef",
    "--d2l-theme-text-color-static-standard": "#e8eaef",
    "--d2l-theme-text-color-static-subtle": "#9aa3b5",
    "--d2l-theme-border-color-subtle": "#2d3444",
    "--d2l-theme-border-color-standard": "#3a4154",
    "--d2l-theme-brand-color-primary-default": "#f4c430",
    "--d2l-theme-brand-color-primary-hover": "#ffe08a",
    "--d2l-theme-text-color-interactive-default": "#f4c430",
    "--d2l-theme-text-color-interactive-hover": "#ffe08a",
    "--d2l-popover-default-background-color": "#171a21",
    "--d2l-popover-background-color": "#171a21",
    "--d2l-popover-default-border-color": "#2d3444",
    "--d2l-popover-border-color": "#2d3444",
    "--d2l-menu-background-color": "#171a21",
    "--d2l-menu-background-color-hover": "#1f2430",
    "--d2l-menu-border-color": "#2d3444",
    "--d2l-menu-foreground-color": "#e8eaef",
    "--d2l-focus-ring-color": "#f4c430",
    "--d2l-focus-ring-offset": "2px",
    "--d2l-input-background-color": "#1f2430",
    "--d2l-input-border-color": "#2d3444",
    "--d2l-input-text-color": "#e8eaef",
    "--d2l-input-placeholder-text-color": "#9aa3b5",
    "--d2l-dropdown-background-color": "#171a21",
    "--d2l-dropdown-border-color": "#2d3444",
    "--d2l-table-row-color-hover": "rgba(207, 174, 112, 0.1)",
    "--d2l-table-row-color-selected": "rgba(207, 174, 112, 0.18)",
    "--d2l-tree-node-background-color-hover": "rgba(207, 174, 112, 0.1)",
    "--d2l-tree-node-background-color-selected": "rgba(207, 174, 112, 0.18)",
    "--d2l-collapse-panel-header-background-color": "#1f2430",
    "--d2l-collapse-panel-content-background-color": "#171a21",
  };

  const CARD_BANNER_OVERLAY = `
    .d2l-card-header-image,
    .d2l-card-image,
    .d2l-enrollment-card-image,
    .d2l-card-banner,
    .d2l-enrollment-card-banner,
    [class*="card-image"],
    [class*="card-banner"] {
      position: relative !important;
    }

    .d2l-card-header-image::after,
    .d2l-card-image::after,
    .d2l-enrollment-card-image::after,
    .d2l-card-banner::after,
    .d2l-enrollment-card-banner::after {
      content: "" !important;
      position: absolute !important;
      inset: 0 !important;
      background: linear-gradient(
        180deg,
        rgba(15, 17, 21, 0.05) 0%,
        rgba(15, 17, 21, 0.45) 55%,
        rgba(15, 17, 21, 0.92) 100%
      ) !important;
      pointer-events: none !important;
      z-index: 1 !important;
    }

    ::slotted([slot="header"]) .d2l-line.d2l-body-compact,
    ::slotted([slot="content"]) .d2l-line.d2l-body-compact,
    .d2l-card-content .d2l-line.d2l-body-compact,
    .d2l-enrollment-card-content .d2l-line.d2l-body-compact,
    .d2l-card-subtitle,
    .d2l-enrollment-card-subtitle {
      color: #9aa3b5 !important;
      font-size: 0.78rem !important;
      letter-spacing: 0.04em !important;
      text-transform: uppercase !important;
      font-weight: 500 !important;
    }

    ::slotted([slot="content"]) .d2l-heading,
    ::slotted([slot="header"]) .d2l-heading,
    .d2l-card-content .d2l-heading,
    .d2l-enrollment-card-content .d2l-heading {
      font-weight: 650 !important;
      color: #e8eaef !important;
      line-height: 1.25 !important;
    }

    ::slotted(d2l-button-icon[icon="tier1:pin"]),
    ::slotted(d2l-button-icon[icon="tier1:unpin"]),
    ::slotted(d2l-button-icon[icon="tier1:pin-filled"]),
    d2l-button-icon[icon="tier1:pin"],
    d2l-button-icon[icon="tier1:unpin"],
    d2l-button-icon[icon="tier1:pin-filled"] {
      --d2l-button-icon-fill-color: #f4c430 !important;
      --d2l-button-icon-fill-color-hover: #ffe08a !important;
      --d2l-theme-icon-color-standard: #f4c430 !important;
    }
  `;

  const SHADOW_POLISH_CSS = `
    input:focus-visible,
    textarea:focus-visible,
    select:focus-visible,
    button:focus-visible,
    a:focus-visible {
      outline: none !important;
      box-shadow: 0 0 0 3px rgba(244, 196, 48, 0.42) !important;
    }

    * {
      scrollbar-width: thin;
      scrollbar-color: #3a4154 #0f1115;
    }

    *::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }

    *::-webkit-scrollbar-track {
      background: #0f1115;
    }

    *::-webkit-scrollbar-thumb {
      background: #3a4154;
      border-radius: 999px;
      border: 2px solid #0f1115;
    }

    *::-webkit-scrollbar-thumb:hover {
      background: #cfae70;
    }
  `;

  const SHADOW_CSS_BASE = `
    ${SHADOW_POLISH_CSS}
    :host {
      color: #e8eaef !important;
      border-color: #2d3444 !important;
    }

    /* Vanderbilt logo replacement inside shadow DOM (Labs nav). */
    ${CUSTOM_LOGO_URL ? `
      .d2l-labs-navigation-link-image-container {
        background-image: url("${CUSTOM_LOGO_URL}") !important;
        background-repeat: no-repeat !important;
        background-position: left center !important;
        background-size: contain !important;
      }

      .d2l-labs-navigation-link-image-container img,
      .d2l-labs-navigation-link-image-container d2l-image,
      .d2l-labs-navigation-link-image-container svg {
        opacity: 0 !important;
      }
    ` : ``}

    .d2l-navigation-gutter,
    .d2l-navigation-centerer,
    .d2l-gutter,
    [class*="navigation-gutter"],
    [class*="navigation-centerer"],
    .d2l-navigation-s-main-wrapper,
    .d2l-navigation-s-wrapper,
    .d2l-navigation-s-header,
    .d2l-navigation-s-button-wrapper,
    .d2l-navigation-header,
    .d2l-navigation-band,
    .d2l-navigation-main-header,
    .d2l-navigation-main-footer,
    header,
    footer,
    nav {
      background-color: #0f1115 !important;
      background: #0f1115 !important;
    }

    .d2l-navigation-s-link,
    .d2l-navigation-s-text,
    .d2l-navigation-s-personality-text,
    span,
    label {
      color: #e8eaef;
    }

    .d2l-empty-state,
    .d2l-empty-state-container,
    [class*="empty-state"] {
      background-color: transparent !important;
      color: #9aa3b5 !important;
    }
  `;

  /** Course card menus: slotted under d2l-card actions or nested in enrollment tiles. */
  function isCourseCardActionIcon(host) {
    if (host?.tagName?.toLowerCase?.() !== "d2l-button-icon") return false;

    const slot = host.assignedSlot;
    if (slot) {
      const slotName = slot.name || "";
      if (slotName === "actions" || slotName === "dropdown" || slotName === "opener") {
        const root = slot.getRootNode();
        if (root instanceof ShadowRoot) {
          const slotHost = root.host?.tagName?.toLowerCase?.() ?? "";
          if (slotHost === "d2l-card" || slotHost === "d2l-enrollment-card") return true;
        }
      }
    }

    return Boolean(
      host.closest?.(
        "d2l-card, d2l-enrollment-card, .d2l-enrollment-card, .d2l-card, .d2l-enrollments-container, .d2l-my-courses-container, .d2l-homepage"
      )
    );
  }

  function cssForShadowHost(host) {
    const tag = host?.tagName?.toLowerCase?.() ?? "";

    if (tag === "d2l-card") {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          background-color: #171a21 !important;
          background-image: none !important;
          color: #e8eaef !important;
          border: 1px solid #2d3444 !important;
          border-radius: 8px !important;
          box-shadow: none !important;
          overflow: visible !important;
          transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
        }

        :host([subtle]) {
          background-color: #171a21 !important;
          border: 1px solid #2d3444 !important;
        }

        :host(:hover),
        :host([href]:not([_active]):hover) {
          border-color: rgba(207, 174, 112, 0.5) !important;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.32) !important;
        }

        /* Match D2L: only clip the banner image at the top corners */
        .d2l-card-header {
          border-start-end-radius: 8px;
          border-start-start-radius: 8px;
          overflow: hidden;
        }

        .d2l-card-container,
        .d2l-card-header,
        .d2l-card-content,
        .d2l-card-footer,
        .d2l-card-badge,
        .d2l-card-actions {
          background-color: #171a21 !important;
          color: #e8eaef !important;
        }

        .d2l-card-actions ::slotted(d2l-button-icon),
        .d2l-card-actions ::slotted(button),
        .d2l-card-actions ::slotted([role="button"]) {
          background: transparent !important;
          background-color: transparent !important;
          border-color: transparent !important;
          color: #f4c430 !important;
          --d2l-button-icon-background-color-default: transparent !important;
          --d2l-button-icon-background-color-hover-default: rgba(207, 174, 112, 0.16) !important;
          --d2l-button-icon-fill-color: #f4c430 !important;
          --d2l-button-icon-fill-color-hover: #ffe08a !important;
          --d2l-theme-icon-color-standard: #f4c430 !important;
        }

        :host([href]) .d2l-card-link-container-hover,
        :host([href][_active]) .d2l-card-content {
          color: #f4c430 !important;
        }

        ${CARD_BANNER_OVERLAY}
      `;
    }

    if (tag === "d2l-enrollment-card") {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          background-color: #171a21 !important;
          color: #e8eaef !important;
          border: 1px solid #2d3444 !important;
          border-radius: 8px !important;
          overflow: visible !important;
        }

        .d2l-enrollment-card-container,
        .d2l-enrollment-card-header,
        .d2l-enrollment-card-content,
        .d2l-enrollment-card-footer {
          background-color: #171a21 !important;
          color: #e8eaef !important;
        }

        ${CARD_BANNER_OVERLAY}
      `;
    }

    if (tag === "d2l-button-icon") {
      const cardAction = isCourseCardActionIcon(host);
      const iconColor = cardAction ? "#f4c430" : "rgba(232, 234, 239, 0.95)";
      const hoverBg = cardAction
        ? "rgba(207, 174, 112, 0.16)"
        : "rgba(207, 174, 112, 0.12)";

      return `
        ${SHADOW_CSS_BASE}
        :host {
          background: transparent !important;
          background-color: transparent !important;
          --d2l-button-icon-background-color: transparent !important;
          --d2l-button-icon-background-color-default: transparent !important;
          --d2l-button-icon-background-color-hover: ${hoverBg} !important;
          --d2l-button-icon-background-color-hover-default: ${hoverBg} !important;
          --d2l-theme-background-color-interactive-tertiary-default: transparent !important;
          --d2l-theme-background-color-interactive-secondary-default: transparent !important;
          --d2l-theme-icon-color-standard: ${iconColor};
          --d2l-button-icon-fill-color: ${iconColor} !important;
          --d2l-button-icon-fill-color-hover: ${cardAction ? "#ffe08a" : iconColor} !important;
        }

        :host([theme="dark"]) {
          background: transparent !important;
          background-color: transparent !important;
          --d2l-button-icon-background-color-default: transparent !important;
        }

        button:not(:hover):not(:focus):not([disabled]) {
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
        }

        button:hover:not([disabled]),
        button:focus:not([disabled]),
        :host([active]) button:not([disabled]) {
          background-color: ${hoverBg} !important;
        }

        button:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(244, 196, 48, 0.42) !important;
        }
      `;
    }

    const isOverlayHost =
      tag === "d2l-dropdown-content" ||
      tag === "d2l-dropdown-menu" ||
      tag === "d2l-menu" ||
      tag === "d2l-menu-item" ||
      tag === "d2l-menu-item-link" ||
      tag.startsWith("d2l-dropdown") ||
      tag.startsWith("d2l-popover");

    if (isOverlayHost) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          --d2l-popover-default-background-color: #171a21 !important;
          --d2l-popover-background-color: #171a21 !important;
          --d2l-popover-default-border-color: #2d3444 !important;
          --d2l-popover-border-color: #2d3444 !important;
          --d2l-menu-background-color: #171a21 !important;
          --d2l-menu-background-color-hover: #1f2430 !important;
          --d2l-menu-border-color: #2d3444 !important;
          --d2l-menu-foreground-color: #e8eaef !important;
          background-color: transparent !important;
          color: #e8eaef !important;
        }

        .content-width,
        .content-container,
        .content-position,
        .dropdown-content-layout,
        .dropdown-content,
        .dropdown-header,
        .dropdown-footer,
        .d2l-menu-items,
        .pointer > div {
          background-color: #171a21 !important;
          background: #171a21 !important;
          border-color: #2d3444 !important;
          color: #e8eaef !important;
          border-radius: 12px !important;
        }

        .dropdown-content,
        .content-width {
          overflow: hidden;
        }

        .dropdown-header,
        .dropdown-footer {
          border-color: #2d3444 !important;
        }

        d2l-menu-item:hover,
        d2l-menu-item:focus,
        d2l-menu-item-link:hover,
        d2l-menu-item-link:focus,
        .d2l-menu-item-content:hover {
          background-color: #1f2430 !important;
          color: #f4c430 !important;
        }

        d2l-menu-item[selected],
        d2l-menu-item-link[selected] {
          background-color: rgba(207, 174, 112, 0.14) !important;
        }

        .d2l-datalist-item-content:hover,
        .d2l-datalist-item-actionable:hover {
          background-color: #1f2430 !important;
        }

        .d2l-user-profile-card,
        .d2l-messagebucket-header,
        .d2l-messagebucket-footer {
          background-color: #171a21 !important;
          border-color: #2d3444 !important;
          color: #e8eaef !important;
        }
      `;
    }

    if (tag === "d2l-tree" || tag === "d2l-tree-node") {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          background-color: transparent !important;
          color: #e8eaef !important;
          --d2l-tree-node-background-color-hover: rgba(207, 174, 112, 0.1);
          --d2l-tree-node-background-color-selected: rgba(207, 174, 112, 0.18);
        }

        .d2l-tree-node-content:hover,
        .d2l-tree-node-content:focus {
          background-color: rgba(207, 174, 112, 0.1) !important;
        }

        .d2l-tree-node-selected > .d2l-tree-node-content,
        [selected] > .d2l-tree-node-content {
          background-color: rgba(207, 174, 112, 0.18) !important;
          color: #f4c430 !important;
        }
      `;
    }

    if (
      tag === "d2l-collapse-panel" ||
      tag === "d2l-expand-collapse-content" ||
      tag.startsWith("d2l-labs-accordion")
    ) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          background-color: #171a21 !important;
          color: #e8eaef !important;
          border-color: #2d3444 !important;
        }

        .d2l-collapse-panel-header,
        .d2l-collapse-panel-header-content,
        [slot="header"] {
          background-color: #1f2430 !important;
          color: #e8eaef !important;
          border-color: #2d3444 !important;
        }

        .d2l-collapse-panel-content,
        .d2l-collapse-panel-content-inner {
          background-color: #171a21 !important;
          color: #e8eaef !important;
        }
      `;
    }

    if (
      tag.startsWith("d2l-input") ||
      tag === "d2l-textarea" ||
      tag === "d2l-select" ||
      tag === "d2l-textarea-container"
    ) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          --d2l-input-background-color: #1f2430 !important;
          --d2l-input-border-color: #2d3444 !important;
          --d2l-input-text-color: #e8eaef !important;
          --d2l-input-placeholder-text-color: #9aa3b5 !important;
          color: #e8eaef !important;
        }

        input,
        textarea,
        select {
          background-color: #1f2430 !important;
          border-color: #2d3444 !important;
          color: #e8eaef !important;
        }

        input:focus-visible,
        textarea:focus-visible,
        select:focus-visible {
          border-color: rgba(244, 196, 48, 0.55) !important;
          box-shadow: 0 0 0 3px rgba(244, 196, 48, 0.35) !important;
        }
      `;
    }

    if (tag === "d2l-button" || tag === "d2l-button-subtle" || tag === "d2l-button-filter") {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          --d2l-button-background-color: #1f2430 !important;
          --d2l-button-border-color: #2d3444 !important;
          --d2l-button-text-color: #e8eaef !important;
        }

        :host([primary]) {
          --d2l-button-background-color: #2a2318 !important;
          --d2l-button-border-color: rgba(207, 174, 112, 0.45) !important;
          --d2l-button-text-color: #f4c430 !important;
        }

        button {
          border-radius: 8px !important;
        }
      `;
    }

    if (tag.startsWith("d2l-table")) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          background-color: #171a21 !important;
          color: #e8eaef !important;
          --d2l-table-row-color-hover: rgba(207, 174, 112, 0.1);
          --d2l-table-row-color-selected: rgba(207, 174, 112, 0.18);
        }

        th,
        thead,
        .d2l-table-header {
          background-color: #1f2430 !important;
          color: #f4c430 !important;
          border-color: #2d3444 !important;
        }

        td,
        tbody tr {
          background-color: #171a21 !important;
          border-color: #2d3444 !important;
          color: #e8eaef !important;
        }

        tbody tr:hover td {
          background-color: rgba(207, 174, 112, 0.08) !important;
        }
      `;
    }

    if (tag.startsWith("d2l-tab") && !tag.startsWith("d2l-table")) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          background-color: transparent !important;
          color: #e8eaef !important;
        }

        .d2l-tabs-container,
        .d2l-tab-panel {
          background-color: #171a21 !important;
          border-color: #2d3444 !important;
        }

        .d2l-tab.d2l-tab-selected,
        [selected] {
          color: #f4c430 !important;
          border-color: #f4c430 !important;
        }
      `;
    }

    if (tag.startsWith("d2l-list")) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          background-color: #171a21 !important;
          color: #e8eaef !important;
        }

        .d2l-list-item:hover,
        .d2l-list-item-action-hover:hover {
          background-color: rgba(207, 174, 112, 0.1) !important;
        }
      `;
    }

    if (tag === "d2l-progress-bar" || tag === "d2l-meter-linear" || tag.startsWith("d2l-meter")) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          --d2l-meter-background-color: #1f2430 !important;
          --d2l-meter-fill-color: #f4c430 !important;
        }
      `;
    }

    if (tag.startsWith("d2l-file") || tag === "d2l-upload" || tag.startsWith("d2l-upload")) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          background-color: transparent !important;
          color: #e8eaef !important;
        }

        .d2l-file-upload-dropzone,
        .d2l-upload-dropzone,
        [class*="dropzone"] {
          background-color: #1f2430 !important;
          border: 1px dashed rgba(207, 174, 112, 0.45) !important;
          border-radius: 12px !important;
          color: #9aa3b5 !important;
        }

        [class*="dropzone"]:hover,
        [class*="dropzone"][active] {
          background-color: rgba(207, 174, 112, 0.1) !important;
          border-color: #f4c430 !important;
          color: #f4c430 !important;
        }
      `;
    }

    if (tag === "d2l-calendar" || tag.startsWith("d2l-calendar")) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          background-color: #171a21 !important;
          color: #e8eaef !important;
          border: 1px solid #2d3444 !important;
          border-radius: 12px !important;
        }

        th,
        td,
        .d2l-calendar-mini-day {
          background-color: #171a21 !important;
          color: #e8eaef !important;
          border-color: #2d3444 !important;
        }

        .d2l-calendar-mini-day:hover,
        td.d2l-calendar-mini-day:hover {
          background-color: rgba(207, 174, 112, 0.16) !important;
          color: #f4c430 !important;
        }

        .d2l-calendar-mini-today,
        td.d2l-calendar-mini-today {
          background-color: rgba(207, 174, 112, 0.22) !important;
          color: #f4c430 !important;
        }
      `;
    }

    if (tag === "d2l-more-less" || tag.startsWith("d2l-more-less")) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          background-color: transparent !important;
          color: #e8eaef !important;
        }

        .d2l-more-less,
        .more-less-blur {
          background: linear-gradient(transparent, #171a21) !important;
        }
      `;
    }

    if (tag === "d2l-radio" || tag === "d2l-checkbox" || tag.startsWith("d2l-radio") || tag.startsWith("d2l-checkbox")) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          color: #e8eaef !important;
          --d2l-checkbox-border-color: #3a4154 !important;
          --d2l-checkbox-background-color: #1f2430 !important;
          --d2l-checkbox-checkmark-color: #f4c430 !important;
        }
      `;
    }

    if (tag === "d2l-html-block" || tag.startsWith("d2l-html-block")) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          background-color: transparent !important;
          color: #e8eaef !important;
        }
      `;
    }

    const isNavHost =
      tag === "d2l-navigation-s" ||
      tag === "d2l-navigation" ||
      tag === "d2l-navigation-band" ||
      tag === "d2l-navigation-main-header" ||
      tag === "d2l-navigation-main-footer" ||
      tag === "d2l-labs-navigation-main-footer" ||
      tag.startsWith("d2l-navigation-");

    if (isNavHost) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          background-color: #0f1115 !important;
          background: #0f1115 !important;
          background-image: none !important;
          border-color: #2d3444 !important;
        }
      `;
    }

    if (tag === "d2l-dialog" || tag === "d2l-dialog-confirm" || tag.startsWith("d2l-dialog")) {
      return `
        ${SHADOW_CSS_BASE}
        :host {
          --d2l-focus-ring-color: #f4c430;
        }

        .d2l-dialog,
        .d2l-dialog-inner,
        .d2l-dialog-content,
        .d2l-dialog-header,
        .d2l-dialog-footer {
          border-radius: 12px !important;
          background-color: #171a21 !important;
          color: #e8eaef !important;
          border-color: #2d3444 !important;
        }

        .d2l-dialog-header {
          border-start-start-radius: 12px !important;
          border-start-end-radius: 12px !important;
        }
      `;
    }

    return `
      ${SHADOW_CSS_BASE}

      /* Default: do NOT paint the host background.
         Many Brightspace navigation/action controls are web components too,
         and painting :host caused the odd gray wrappers around top-bar icons. */

      .d2l-card-container,
      .d2l-card-header,
      .d2l-card-content,
      .d2l-card-footer,
      .d2l-card-badge,
      .d2l-card-actions {
        background-color: #171a21 !important;
        color: #e8eaef !important;
      }

      .d2l-card-content *,
      .d2l-card-footer * {
        color: #e8eaef !important;
      }

      :host([href]) .d2l-card-link-container-hover,
      :host([href][_active]) .d2l-card-content {
        color: #f4c430 !important;
      }
    `;
  }

  function isShadowThemeEnabled() {
    const settings = window.VandyExtSettings?.getCachedSettings?.();
    if (!settings) return true;
    return settings.darkModeEnabled !== false && settings.shadowTheme !== false;
  }

  function getMergedCssVars() {
    const settings = window.VandyExtSettings?.getCachedSettings?.();
    const presetVars = window.VandyExtSettings?.getPresetVars?.(settings?.themePreset) ?? {};
    return { ...HOST_CSS_VARS, ...presetVars };
  }

  function getAccentColor() {
    const settings = window.VandyExtSettings?.getCachedSettings?.();
    const presetVars = window.VandyExtSettings?.getPresetVars?.(settings?.themePreset);
    return presetVars?.["--vandy-gold-bright"] ?? "#f4c430";
  }

  function applyDocumentDarkMode() {
    if (!isShadowThemeEnabled()) return;

    const html = document.documentElement;
    for (const [name, value] of Object.entries(getMergedCssVars())) {
      html.style.setProperty(name, value);
    }
  }

  function applyHostVariables(host) {
    if (!host || !host.style || !isShadowThemeEnabled()) return;
    for (const [name, value] of Object.entries(getMergedCssVars())) {
      host.style.setProperty(name, value);
    }

    const accent = getAccentColor();

    if (host.tagName?.toLowerCase?.() === "d2l-button-icon") {
      const transparentVars = {
        "--d2l-button-icon-background-color": "transparent",
        "--d2l-button-icon-background-color-default": "transparent",
        "--d2l-theme-background-color-interactive-tertiary-default": "transparent",
        "--d2l-theme-background-color-interactive-secondary-default": "transparent",
      };
      for (const [name, value] of Object.entries(transparentVars)) {
        host.style.setProperty(name, value, "important");
      }

      if (isCourseCardActionIcon(host)) {
        host.style.setProperty("--d2l-button-icon-fill-color", accent, "important");
        host.style.setProperty("--d2l-theme-icon-color-standard", accent, "important");
      }
    }
  }

  /**
   * Re-run on MutationObserver: Lit can remove injected styles during re-render.
   * Never skip a root permanently (old WeakSet caused white cards/icons after updates).
   */
  function injectShadowStyles(shadowRoot, host) {
    if (!shadowRoot || !isShadowThemeEnabled()) return;

    applyHostVariables(host);

    const css = cssForShadowHost(host);
    let style = shadowRoot.getElementById(SHADOW_STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = SHADOW_STYLE_ID;
      shadowRoot.appendChild(style);
    }
    style.textContent = css;
    // Keep our overrides after Lit re-injected component styles.
    shadowRoot.appendChild(style);

    shadowRoot.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot) injectShadowStyles(el.shadowRoot, /** @type {HTMLElement} */ (el));
    });
  }

  function walkElement(element) {
    if (!(element instanceof Element)) return;

    if (element.shadowRoot) {
      injectShadowStyles(element.shadowRoot, element);
    }

    for (const child of element.children) {
      walkElement(child);
    }
  }

  function scanPage() {
    applyDocumentDarkMode();
    if (!isShadowThemeEnabled()) return;
    walkElement(document.documentElement);
  }

  let scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scanPage();
    });
  }

  function initShadowTheme() {
    applyDocumentDarkMode();
    scanPage();

    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-color-mode", "class"],
    });
  }

  window.VandyExtShadow = { initShadowTheme, scanPage };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initShadowTheme, { once: true });
  } else {
    initShadowTheme();
  }
})();
