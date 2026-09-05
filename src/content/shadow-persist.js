/**
 * MAIN-world shadow persistence (document_start).
 * Lit replaces adoptedStyleSheets during render and can eject isolated-world styles.
 * This patch re-appends our shared sheet on every write while dark theme is on.
 */
(function () {
  if (window.__vandyextShadowPersist) return;
  window.__vandyextShadowPersist = true;

  const EVENT = "vandyext-shadow-persist";
  const FLAG = "vandyext-shadow-on";

  let sheet = null;
  let enabled = false;
  const trackedRoots = new Set();

  function ensureSheet() {
    if (sheet) return sheet;
    try {
      sheet = new CSSStyleSheet();
      sheet.__vandyext = true;
    } catch {
      sheet = null;
    }
    return sheet;
  }

  function isOn() {
    return enabled && document.documentElement.classList.contains(FLAG);
  }

  function inject(root) {
    const s = ensureSheet();
    if (!s || !root) return;
    try {
      const list = root.adoptedStyleSheets || [];
      if (list.indexOf(s) === -1) {
        root.adoptedStyleSheets = list.concat(s);
      }
    } catch {
      /* closed / unsupported */
    }
  }

  function uninject(root) {
    if (!sheet || !root) return;
    try {
      const list = root.adoptedStyleSheets || [];
      if (list.indexOf(sheet) !== -1) {
        root.adoptedStyleSheets = list.filter((x) => x !== sheet);
      }
    } catch {
      /* ignore */
    }
  }

  function applyAll(on) {
    trackedRoots.forEach((root) => {
      try {
        if (!root.host?.isConnected) {
          trackedRoots.delete(root);
          return;
        }
      } catch {
        trackedRoots.delete(root);
        return;
      }
      if (on) inject(root);
      else uninject(root);
    });
  }

  function walkAndTrack(node) {
    if (!node) return;
    if (node.shadowRoot) {
      trackedRoots.add(node.shadowRoot);
      walkAndTrack(node.shadowRoot);
    }
    const kids = node.children || node.childNodes;
    if (!kids) return;
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];
      if (child.nodeType === 1) walkAndTrack(child);
    }
  }

  const originalAttachShadow = Element.prototype.attachShadow;
  if (originalAttachShadow) {
    Element.prototype.attachShadow = function (init) {
      const root = originalAttachShadow.call(this, init);
      trackedRoots.add(root);
      if (isOn()) inject(root);
      return root;
    };
  }

  const adDesc = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, "adoptedStyleSheets");
  if (adDesc?.set) {
    const origSet = adDesc.set;
    const origGet = adDesc.get;
    Object.defineProperty(ShadowRoot.prototype, "adoptedStyleSheets", {
      configurable: true,
      enumerable: adDesc.enumerable,
      get() {
        return origGet.call(this);
      },
      set(sheets) {
        if (!isOn()) {
          origSet.call(this, sheets);
          return;
        }
        const s = ensureSheet();
        if (!s) {
          origSet.call(this, sheets);
          return;
        }
        trackedRoots.add(this);
        const arr = sheets ? Array.prototype.slice.call(sheets) : [];
        if (arr.indexOf(s) === -1) arr.push(s);
        origSet.call(this, arr);
      },
    });
  }

  function onPersistEvent(event) {
    const detail = event?.detail || {};
    enabled = Boolean(detail.enabled);
    const html = document.documentElement;

    if (enabled) {
      html.classList.add(FLAG);
      const s = ensureSheet();
      if (s && typeof detail.css === "string") {
        try {
          s.replaceSync(detail.css);
        } catch {
          try {
            s.replace(detail.css);
          } catch {
            /* ignore */
          }
        }
      }
      walkAndTrack(html);
      applyAll(true);
    } else {
      html.classList.remove(FLAG);
      applyAll(false);
    }
  }

  document.addEventListener(EVENT, onPersistEvent);

  // Catch declarative shadow roots after parse.
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        if (isOn()) {
          walkAndTrack(document.documentElement);
          applyAll(true);
        }
      },
      { once: true }
    );
  }
})();
