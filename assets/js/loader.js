(async () => {
  try {
    const js = chrome.runtime.getURL("assets/js/content.js");
    await import(js);
  } catch (e) {
    console.error(e);
  }
})();
