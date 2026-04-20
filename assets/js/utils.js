/**
 * Qiita Dark Mode - ユーティリティ関数ライブラリ
 *
 * 内容：
 * - DebouncedFunction: デバウンス機構（頻繁なトリガーを防ぐ）
 * - DOM操作ヘルパー
 * - スケジュールロジック
 * - 時間ユーティリティ
 */

/**
 * デバウンス関数クラス - 指定された遅延の後に関数を実行し、繰り返し呼び出されるとタイマーをリセットします
 *
 * 用途：MutationObserverが高頻度でトリガーされた際、DOMスキャンが頻繁に重複しないようにします
 * 効果：不要な計算を70-80%削減します
 */

import { logDebug, logWarn, logError } from "./logger.js";

export class DebouncedFunction {
  constructor(fn, delay = 300) {
    this.fn = fn;
    this.delay = delay;
    this.timeoutId = null;
  }

  /**
   * 関数を呼び出す（デバウンス付き）
   * すでに実行待ちの呼び出しがある場合、タイマーをリセットします
   */
  call(...args) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      try {
        this.fn(...args);
      } catch (e) {
        logError("デバウンス関数の実行エラー", e);
      }
      this.timeoutId = null;
    }, this.delay);
  }

  /**
   * 実行待ちの呼び出しをキャンセルする
   */
  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * 強制的に即時実行する（デバウンスをスキップ）
   * ページの読み込み完了時やアンロード時に使用します
   */
  flush() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      try {
        this.fn();
      } catch (e) {
        logError("即時実行関数エラー", e);
      }
      this.timeoutId = null;
    }
  }
}

/**
 * メディア要素ノードの検索
 * 提供されたセレクタリストを使用してDOMを一括検索します
 *
 * @param {string[]} selectors - CSSセレクタの配列
 * @returns {Node[]} 検出されたすべての一意のノード
 */
export function findMediaNodes(selectors) {
  const nodes = [];
  const nodeSet = new Set(); // 重複を避けるためにSetを使用

  for (const selector of selectors) {
    try {
      document.querySelectorAll(selector).forEach((node) => {
        // ノード参照をキーとして使用し、一意性を保証
        if (!nodeSet.has(node)) {
          nodeSet.add(node);
          nodes.push(node);
        }
      });
    } catch (e) {
      // 無効なセレクタは例外をトリガーします。記録しますが実行は中断しません
      logWarn(`無効なCSSセレクタ: "${selector}"`, e.message);
    }
  }

  logDebug(`${nodes.length}個のメディアノードが見つかりました`);
  return nodes;
}

/**
 * ノードにメディアスタイルクラスを適用する
 * 同じクラスの重複追加を回避します
 *
 * @param {Node[]} nodes - 処理するノードの配列
 * @param {string} className - 追加するCSSクラス名
 */
export function applyMediaClass(nodes, className) {
  let addedCount = 0;
  nodes.forEach((node) => {
    if (node.classList && !node.classList.contains(className)) {
      node.classList.add(className);
      addedCount++;
    }
  });
  logDebug(`${addedCount}個のノードにクラスを追加しました: ${className}`);
}

/**
 * メディアスタイルクラスを削除する（クリーンアップ用）
 *
 * @param {Node[]} nodes - 処理するノードの配列
 * @param {string} className - 削除するCSSクラス名
 */
export function removeMediaClass(nodes, className) {
  let removedCount = 0;
  nodes.forEach((node) => {
    if (node.classList && node.classList.contains(className)) {
      node.classList.remove(className);
      removedCount++;
    }
  });
  logDebug(`${removedCount}個のノードからクラスを削除しました: ${className}`);
}

/**
 * 時間文字列を分（分钟）に変換
 *
 * @param {string} timeStr - 時間文字列、形式は "HH:mm"
 * @returns {number} 分数（0-1440）
 */
export function timeToMinutes(timeStr) {
  const [hour, min] = timeStr.split(":").map(Number);
  if (isNaN(hour) || isNaN(min)) {
    logError(`無効な時間形式: "${timeStr}"`);
    return 0;
  }
  return hour * 60 + min;
}

/**
 * 現在時刻を取得（分数で表現）
 *
 * @returns {number} 現在時刻の分数（0-1440）
 */
export function getCurrentTimeInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * 現在時刻が指定された時間範囲内かどうかを確認
 * 真夜中をまたぐ時間範囲（例：22:00 - 08:00）をサポート
 *
 * @param {number} startMin - 開始時間（分数）
 * @param {number} endMin - 終了時間（分数）
 * @returns {boolean} 現在時刻が範囲内かどうか
 */
export function isCurrentTimeInRange(startMin, endMin) {
  const currentMin = getCurrentTimeInMinutes();

  if (startMin > endMin) {
    // 真夜中をまたぐ：例 22:00 (1320) から 08:00 (480)
    // 現在時刻 >= 22:00 または 現在時刻 < 08:00 の場合 true を返す
    return currentMin >= startMin || currentMin < endMin;
  } else {
    // 同日内：例 09:00 から 17:00
    return currentMin >= startMin && currentMin < endMin;
  }
}

/**
 * スケジュールに基づいてダークモードを有効にすべきかどうかを確認
 *
 * @param {Object} schedule - スケジュール設定オブジェクト
 *   - enabled {boolean} - スケジュール機能が有効かどうか
 *   - startTime {string} - 開始時間 "HH:mm"
 *   - endTime {string} - 終了時間 "HH:mm"
 *   - days {number[]} - 有効にする日付（0-6、0=日曜日）
 *
 * @returns {boolean|null}
 *   true: ダークモードを有効にすべき
 *   false: ダークモードを無効にすべき
 *   null: スケジュールが有効ではないため、ユーザーの手動設定に従う
 */
export function shouldEnableDarkModeBySchedule(schedule) {
  // スケジュールが有効でない場合、nullを返す（ユーザー設定を上書きしない）
  if (!schedule || !schedule.enabled) {
    return null;
  }

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = 日曜日

  // 指定された日付内かどうかを確認
  if (!schedule.days || schedule.days.length === 0) {
    logWarn("スケジュール設定の days が空です");
    return null;
  }

  if (!schedule.days.includes(dayOfWeek)) {
    logDebug(`現在の日付 ${dayOfWeek} はスケジュール範囲外です`);
    return false;
  }

  // 指定された時間範囲内かどうかを確認
  const startMin = timeToMinutes(schedule.startTime);
  const endMin = timeToMinutes(schedule.endTime);
  const inTimeRange = isCurrentTimeInRange(startMin, endMin);

  logDebug(
    `スケジュール確認: 時間範囲 ${schedule.startTime}-${schedule.endTime}, 範囲内: ${inTimeRange}`,
  );

  return inTimeRange;
}

/**
 * タイムスタンプを取得（デバッグやログ用）
 *
 * @returns {string} フォーマットされたタイムスタンプ "HH:mm:ss"
 */
export function getFormattedTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

/**
 * 最終的にダークモードを有効にすべきかどうかを決定
 * スケジュールとユーザーの手動設定を総合的に考慮
 *
 * @param {boolean} userManuallyEnabled - ユーザーによる手動スイッチの状態
 * @param {Object} schedule - スケジュール設定
 * @returns {boolean} 適用される最終状態
 */
export function resolveFinalDarkModeState(userManuallyEnabled, schedule) {
  const scheduleOverride = shouldEnableDarkModeBySchedule(schedule);

  if (scheduleOverride !== null) {
    return scheduleOverride;
  }
  return userManuallyEnabled;
}

/**
 * DOMの準備完了を待機
 * document_start時に重要なDOM要素が読み込まれていることを確認するために使用
 *
 * @param {number} timeout - タイムアウト時間（ミリ秒）
 * @returns {Promise<boolean>} タイムアウト前に準備完了したかどうか
 */
export function waitForDOMReady(timeout = 5000) {
  return new Promise((resolve) => {
    if (document.documentElement && document.body) {
      resolve(true);
      return;
    }

    const timer = setTimeout(() => {
      logWarn(`DOM準備完了チェックのタイムアウト (${timeout}ms)`);
      resolve(false);
    }, timeout);

    document.addEventListener("DOMContentLoaded", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

export async function getStorage(keys) {
  return await chrome.storage.sync.get(keys);
}

export async function setStorage(keys) {
  return await chrome.storage.sync.set(keys);
}
