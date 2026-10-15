const INSTALL_URL = 'https://brightspace.vanderbilt.edu/d2l/home';

chrome.runtime.onInstalled.addListener(function (object) {
  if (object.reason === 'install') {
    chrome.tabs.create({ url: INSTALL_URL });
    chrome.storage.sync.set({ install_time: new Date().getTime() });
  }
});
