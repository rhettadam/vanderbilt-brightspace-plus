/**
 * Loads Brightspace session data (whoami + enrollments) when enabled.
 * Cached locally for popup / future in-page widgets — no remote servers.
 */
(function () {
  const REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
  let inflight = null;

  function isEnabled(settings) {
    const s = settings ?? window.VandyExtSettings?.getCachedSettings?.();
    return s?.apiIntegrations !== false;
  }

  async function refreshIfNeeded(force = false) {
    if (!isEnabled()) return null;
    if (!window.VandyExtValence) return null;

    if (!force) {
      const cached = await window.VandyExtValence.loadCache();
      if (cached?.updatedAt && Date.now() - cached.updatedAt < REFRESH_COOLDOWN_MS) {
        document.dispatchEvent(
          new CustomEvent("vandyext-api-ready", { detail: cached })
        );
        return cached;
      }
    }

    if (inflight) return inflight;

    inflight = window.VandyExtValence
      .refreshUserData()
      .then(async (data) => {
        try {
          const withAgenda = await window.VandyExtValence.refreshAgenda({ days: 14, limit: 6 });
          return withAgenda || data;
        } catch {
          return data;
        }
      })
      .then((data) => {
        document.dispatchEvent(new CustomEvent("vandyext-api-ready", { detail: data }));
        try {
          chrome.runtime.sendMessage({ type: "vandyext-api-cache-updated", data });
        } catch {
          /* no SW / closed */
        }
        return data;
      })
      .catch((err) => {
        console.info("[Vandy Brightspace+] API refresh skipped:", err?.message || err);
        return null;
      })
      .finally(() => {
        inflight = null;
      });

    return inflight;
  }

  async function init() {
    const api = window.VandyExtSettings;
    if (!api) return;

    const settings = await api.loadSettings();
    if (isEnabled(settings)) {
      // Defer slightly so Brightspace can finish auth/bootstrap.
      setTimeout(() => refreshIfNeeded(false), 1200);
    }

    api.onSettingsChanged((next) => {
      if (isEnabled(next)) refreshIfNeeded(true);
    });
  }

  window.VandyExtApi = { refreshIfNeeded };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
