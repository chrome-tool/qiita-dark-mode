const STORAGE_KEY = "qiita-dark-mode-enabled";

const toggle = document.getElementById("theme-toggle");
const status = document.getElementById("status");

function renderStatus(enabled) {
  status.textContent = enabled ? "Dark mode is enabled." : "Dark mode is disabled.";
}

chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
  const enabled = Boolean(result[STORAGE_KEY]);
  toggle.checked = enabled;
  renderStatus(enabled);
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ [STORAGE_KEY]: enabled }, () => {
    renderStatus(enabled);
  });
});
