/**
 * MV3 service worker — cache fan-out and future cross-origin proxies (e.g. RMP).
 */
const API_CACHE_KEY = "vandyextApiCache";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "vandyext-api-cache-updated") {
    if (message.data) {
      chrome.storage.local.set({ [API_CACHE_KEY]: message.data }, () => {
        sendResponse({ ok: true });
      });
      return true;
    }
    sendResponse({ ok: false });
    return;
  }

  if (message.type === "vandyext-get-api-cache") {
    chrome.storage.local.get([API_CACHE_KEY], (data) => {
      sendResponse({ ok: true, data: data?.[API_CACHE_KEY] || null });
    });
    return true;
  }

  return undefined;
});
