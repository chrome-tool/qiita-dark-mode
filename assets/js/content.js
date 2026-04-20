/**
 * Qiita Dark Mode - Content Script
 *
 * 責務：
 * 1. ページ読み込み時に保存されたテーマ設定を適用する
 * 2. ストレージの変更を監視し、テーマの切り替えをリアルタイムに適用する
 * 3. DOMの変更を監視し、新しく挿入されたメディア要素にスタイルクラスを追加する
 * 4. ダークモードのスケジュール起動/停止をサポートする
 */

const CONFIG = window.CONFIG;

/**
 * テーマをDOMに適用する
 */
function applyTheme(enabled) {
  try {
    const root = document.documentElement;
    const attr = enabled ? "on" : "off";

    root.setAttribute(CONFIG.ROOT_ATTRIBUTE, attr);

    if (document.body) {
      document.body.setAttribute(CONFIG.ROOT_ATTRIBUTE, attr);
    }
  } catch (e) {
    window.logError("テーマの適用中にエラーが発生しました", e);
  }
}

/**
 * メディアノードのダークモードスタイルを初期化または更新する
 */
function normalizeMediaNodesImpl() {
  try {
    const nodes = window.findMediaNodes(CONFIG.MEDIA_SELECTORS);
    window.applyMediaClass(nodes, CONFIG.MEDIA_CLASS);
  } catch (e) {
    window.logError("メディアノードの処理中にエラーが発生しました", e);
  }
}

/**
 * デバウンス版のメディアノード処理関数
 */
const debouncedNormalizeMediaNodes = new window.DebouncedFunction(
  normalizeMediaNodesImpl,
  CONFIG.DEBOUNCE_DELAY,
);

/**
 * テーマとメディアノード処理の初期化
 */
function initializeTheme() {
  try {
    chrome.storage.sync.get(
      {
        [CONFIG.DARK_MODE_KEY]: true,
        [CONFIG.SCHEDULE_KEY]: CONFIG.DEFAULT_SCHEDULE,
      },
      (result) => {
        const userManuallyEnabled = Boolean(
          result[CONFIG.DARK_MODE_KEY] ?? false,
        );
        const schedule = result[CONFIG.SCHEDULE_KEY] || CONFIG.DEFAULT_SCHEDULE;

        // 最終的に適用すべき状態を総合的に判断
        const shouldEnable = window.resolveFinalDarkModeState(
          userManuallyEnabled,
          schedule,
        );

        applyTheme(shouldEnable);
        debouncedNormalizeMediaNodes.call();
      },
    );
  } catch (e) {
    window.logError("テーマの初期化中にエラーが発生しました", e);
  }
}

/**
 * ストレージの変更を監視
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  try {
    if (changes[CONFIG.DARK_MODE_KEY]) {
      const enabled = Boolean(changes[CONFIG.DARK_MODE_KEY].newValue);
      applyTheme(enabled);
    }

    if (changes[CONFIG.SCHEDULE_KEY]) {
      initializeTheme();
    }
  } catch (e) {
    window.logError("ストレージ変更の処理中にエラーが発生しました", e);
  }
});

/**
 * MutationObserverを設定してDOMの変更を監視
 */
function setupMutationObserver() {
  try {
    const observer = new MutationObserver((mutations) => {
      const hasAddedNodes = mutations.some((m) => m.addedNodes.length > 0);

      if (hasAddedNodes) {
        debouncedNormalizeMediaNodes.call();
      }
    });

    observer.observe(
      document.documentElement,
      CONFIG.MUTATION_OBSERVER_OPTIONS,
    );

    return observer;
  } catch (e) {
    window.logError("MutationObserverの設定中にエラーが発生しました", e);
    return null;
  }
}

/**
 * スケジュール状態を定期的にチェック
 */
let scheduleIntervalId = null;
function setupScheduleChecker() {
  try {
    // Clear existing interval if any
    if (scheduleIntervalId) {
      clearInterval(scheduleIntervalId);
    }

    scheduleIntervalId = setInterval(() => {
      if (!chrome.runtime?.id) return;
      chrome.storage.sync.get(
        {
          [CONFIG.DARK_MODE_KEY]: true,

          [CONFIG.SCHEDULE_KEY]: CONFIG.DEFAULT_SCHEDULE,
        },

        (result) => {
          if (
            !result[CONFIG.SCHEDULE_KEY] ||
            !result[CONFIG.SCHEDULE_KEY].enabled
          ) {
            return;
          }

          const userManuallyEnabled = Boolean(result[CONFIG.DARK_MODE_KEY]);

          const schedule = result[CONFIG.SCHEDULE_KEY];

          const finalState = window.resolveFinalDarkModeState(
            userManuallyEnabled,

            schedule,
          );

          const currentAttr = document.documentElement.getAttribute(
            CONFIG.ROOT_ATTRIBUTE,
          );

          const currentState = currentAttr === "on";

          if (currentState !== finalState) {
            applyTheme(finalState);
          }
        },
      );
    }, 20000); // 20 seconds interval
  } catch (e) {
    window.logError("スケジュールチェッカーの設定中にエラーが発生しました", e);
  }
}

// Cleanup function to call when the extension unloads or page unloads
function cleanupScheduleChecker() {
  if (scheduleIntervalId) {
    clearInterval(scheduleIntervalId);
    scheduleIntervalId = null;
  }
}

// Listen for page unload to clean up
window.addEventListener("beforeunload", cleanupScheduleChecker);

/**
 * ページ読み込み完了時のクリーンアップ
 */
window.addEventListener("load", () => {
  try {
    debouncedNormalizeMediaNodes.flush();
  } catch (e) {
    window.logError(
      "ページ読み込み完了イベントの処理中にエラーが発生しました",
      e,
    );
  }
});

/**
 * 初期化処理の実行
 */
(function initialize() {
  try {
    // 1. テーマの初期化
    initializeTheme();

    // 2. DOM変更監視の設定
    setupMutationObserver();

    // 3. スケジュールが有効な場合、定期チェックを設定
    setupScheduleChecker();
  } catch (e) {
    window.logError("Content Scriptの初期化中にエラーが発生しました", e);
  }
})();
