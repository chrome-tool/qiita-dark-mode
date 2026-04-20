/**
 * Qiita Dark Mode - Content Script
 *
 * 責務：
 * 1. ページ読み込み時に保存されたテーマ設定を適用する
 * 2. ストレージの変更を監視し、テーマの切り替えをリアルタイムに適用する
 * 3. DOMの変更を監視し、新しく挿入されたメディア要素にスタイルクラスを追加する
 * 4. ダークモードのスケジュール起動/停止をサポートする
 *
 * パフォーマンス最適化：
 * - デバウンス機構を使用し、頻繁なDOMスキャンの重複を防ぐ
 * - 実際にノードが挿入された場合のみ処理をトリガーする
 * - Setを使用し、同じノードの重複処理を防ぐ
 */

import {
  DebouncedFunction,
  resolveFinalDarkModeState,
  applyMediaClass,
  findMediaNodes,
  getStorage,
  setStorage,
} from "./utils.js";

import { CONFIG } from "./config.js";
import { logError } from "./logger.js";

/**
 * テーマをDOMに適用する
 * data-qiita-dark-mode属性を通じて、theme.cssのスタイル適用を制御する
 *
 * @param {boolean} enabled - ダークモードを有効にするかどうか
 */
function applyTheme(enabled) {
  try {
    const root = document.documentElement;
    const attr = enabled ? "on" : "off";

    // ルート要素に適用
    root.setAttribute(CONFIG.ROOT_ATTRIBUTE, attr);

    // bodyがすでに読み込まれている場合、bodyにも適用（予備）
    if (document.body) {
      document.body.setAttribute(CONFIG.ROOT_ATTRIBUTE, attr);
    }
  } catch (e) {
    logError("テーマの適用中にエラーが発生しました", e);
  }
}

/**
 * メディアノードのダークモードスタイルを初期化または更新する
 * この関数はデバウンスでラップされ、頻繁な実行を回避します
 */
function normalizeMediaNodesImpl() {
  try {
    const nodes = findMediaNodes(CONFIG.MEDIA_SELECTORS);
    applyMediaClass(nodes, CONFIG.MEDIA_CLASS);
  } catch (e) {
    logError("メディアノードの処理中にエラーが発生しました", e);
  }
}

/**
 * デバウンス版のメディアノード処理関数
 * 300ms以内の繰り返し呼び出しは1回の実行に統合されます
 */
const debouncedNormalizeMediaNodes = new DebouncedFunction(
  normalizeMediaNodesImpl,
  CONFIG.DEBOUNCE_DELAY,
);

/**
 * テーマとメディアノード処理の初期化
 * ストレージからユーザー設定とスケジュール設定を読み込みます
 */
async function initializeTheme() {
  try {
    const result = await getStorage([
      CONFIG.DARK_MODE_KEY,
      CONFIG.SCHEDULE_KEY,
    ]);

    const userManuallyEnabled = Boolean(result[CONFIG.DARK_MODE_KEY] ?? false);
    const schedule = result[CONFIG.SCHEDULE_KEY] || CONFIG.DEFAULT_SCHEDULE;

    // 最終的に適用すべき状態を総合的に判断
    const shouldEnable = resolveFinalDarkModeState(
      userManuallyEnabled,
      schedule,
    );

    applyTheme(shouldEnable);
    debouncedNormalizeMediaNodes.call();
  } catch (e) {
    logError("テーマの初期化中にエラーが発生しました", e);
  }
}

/**
 * ストレージの変更を監視
 * ユーザーがポップアップで設定を切り替えたとき、すぐに変更を適用します
 */
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  // syncストレージのみを対象
  if (areaName !== "sync") {
    return;
  }

  try {
    // ユーザーによる手動スイッチの変更
    if (changes[CONFIG.DARK_MODE_KEY]) {
      const enabled = Boolean(changes[CONFIG.DARK_MODE_KEY].newValue);
      applyTheme(enabled);
    }

    // スケジュール設定の変更
    if (changes[CONFIG.SCHEDULE_KEY]) {
      // 新しいスケジュールルールを適用するために再初期化
      await initializeTheme();
    }
  } catch (e) {
    logError("ストレージ変更の処理中にエラーが発生しました", e);
  }
});

/**
 * MutationObserverを設定してDOMの変更を監視
 * 新しいメディア要素が挿入されたとき、スタイルクラスを追加します
 */
function setupMutationObserver() {
  try {
    const observer = new MutationObserver((mutations) => {
      // 実際にノードが追加された場合のみ処理をトリガー
      // これにより、属性変更による不要な処理を回避します
      const hasAddedNodes = mutations.some((m) => m.addedNodes.length > 0);

      if (hasAddedNodes) {
        debouncedNormalizeMediaNodes.call();
      }
    });

    // 観察設定を適用
    observer.observe(
      document.documentElement,
      CONFIG.MUTATION_OBSERVER_OPTIONS,
    );

    return observer;
  } catch (e) {
    logError("MutationObserverの設定中にエラーが発生しました", e);
    return null;
  }
}

/**
 * スケジュール状態を定期的にチェック
 * スケジュールモードが有効な場合、1分ごとにテーマの切り替えが必要かどうかを確認します
 */
function setupScheduleChecker() {
  try {
    setInterval(() => {
      const result = getStorage({
        [CONFIG.DARK_MODE_KEY]: true,
        [CONFIG.SCHEDULE_KEY]: CONFIG.DEFAULT_SCHEDULE,
      });

      if (
        !result[CONFIG.SCHEDULE_KEY] ||
        !result[CONFIG.SCHEDULE_KEY].enabled
      ) {
        return;
      }
      const userManuallyEnabled = Boolean(result[CONFIG.DARK_MODE_KEY]);
      const schedule = result[CONFIG.SCHEDULE_KEY];
      const finalState = resolveFinalDarkModeState(
        userManuallyEnabled,
        schedule,
      );

      // 現在のDOM状態が、あるべき状態と一致しているか確認
      const currentAttr = document.documentElement.getAttribute(
        CONFIG.ROOT_ATTRIBUTE,
      );
      const currentState = currentAttr === "on";

      if (currentState !== finalState) {
        applyTheme(finalState);
      }
    }, 10000);
  } catch (e) {
    logError("スケジュールチェッカーの設定中にエラーが発生しました", e);
  }
}

/**
 * ページ読み込み完了時のクリーンアップ
 * 動的に読み込まれたすべてのメディア要素が確実に処理されるようにします
 */
window.addEventListener("load", () => {
  try {
    // 完全なスキャンを強制的に1回実行（デバウンスをスキップ）
    debouncedNormalizeMediaNodes.flush();
  } catch (e) {
    logError("ページ読み込み完了イベントの処理中にエラーが発生しました", e);
  }
});

/**
 * ページアンロード時のクリーンアップ
 */
(async function () {
  // 1. テーマの初期化
  initializeTheme();

  // 2. DOM変更監視の設定
  setupMutationObserver();

  // 3. スケジュールが有効な場合、定期チェックを設定
  setupScheduleChecker();
})();
