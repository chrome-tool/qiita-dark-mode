const STORAGE_KEY = "qiita-dark-mode-enabled";
const ROOT_ATTRIBUTE = "data-qiita-dark-mode";

function applyTheme(enabled) {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  root.setAttribute(ROOT_ATTRIBUTE, enabled ? "on" : "off");
  document.body?.setAttribute(ROOT_ATTRIBUTE, enabled ? "on" : "off");
}

function normalizeLateNodes() {
  const selectors = [
    "iframe",
    "img",
    "video",
    "svg image",
    "[style*='background-image']"
  ];

  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((node) => {
      node.classList.add("qiita-darkmode-media");
    });
  }
}

function boot() {
  chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
    applyTheme(Boolean(result[STORAGE_KEY]));
    normalizeLateNodes();
  });
}

boot();

const observer = new MutationObserver(() => {
  normalizeLateNodes();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !changes[STORAGE_KEY]) {
    return;
  }

  applyTheme(Boolean(changes[STORAGE_KEY].newValue));
});
