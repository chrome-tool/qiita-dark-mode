/**
 * Qiita Dark Mode - ユーティリティ関数ライブラリ
 */

/**
 * デバウンス関数クラス
 */
window.DebouncedFunction = class {
  constructor(fn, delay = 300) {
    this.fn = fn;
    this.delay = delay;
    this.timeoutId = null;
  }

  call(...args) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      try {
        this.fn(...args);
      } catch (e) {
        window.logError("デバウンス関数の実行エラー", e);
      }
      this.timeoutId = null;
    }, this.delay);
  }

  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  flush() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      try {
        this.fn();
      } catch (e) {
        window.logError("即時実行関数エラー", e);
      }
      this.timeoutId = null;
    }
  }
};

/**
 * メディア要素ノードの検索
 */
window.findMediaNodes = function (selectors) {
  const nodes = [];
  const nodeSet = new Set();

  for (const selector of selectors) {
    try {
      document.querySelectorAll(selector).forEach((node) => {
        if (!nodeSet.has(node)) {
          nodeSet.add(node);
          nodes.push(node);
        }
      });
    } catch (e) {
      window.logWarn(`無効なCSSセレクタ: "${selector}"`, e.message);
    }
  }

  return nodes;
};

/**
 * ノードにメディアスタイルクラスを適用する
 */
window.applyMediaClass = function (nodes, className) {
  let addedCount = 0;
  nodes.forEach((node) => {
    if (node.classList && !node.classList.contains(className)) {
      node.classList.add(className);
      addedCount++;
    }
  });
};

/**
 * メディアスタイルクラスを削除する
 */
window.removeMediaClass = function (nodes, className) {
  let removedCount = 0;
  nodes.forEach((node) => {
    if (node.classList && node.classList.contains(className)) {
      node.classList.remove(className);
      removedCount++;
    }
  });
};

/**
 * 時間文字列を分に変換
 */
window.timeToMinutes = function (timeStr) {
  const [hour, min] = timeStr.split(":").map(Number);
  if (isNaN(hour) || isNaN(min)) {
    return 0;
  }
  return hour * 60 + min;
};

/**
 * 現在時刻を取得（分数で表現）
 */
window.getCurrentTimeInMinutes = function () {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/**
 * 現在時刻が指定された時間範囲内かどうかを確認
 */
window.isCurrentTimeInRange = function (startMin, endMin) {
  const currentMin = window.getCurrentTimeInMinutes();

  if (startMin > endMin) {
    return currentMin >= startMin || currentMin < endMin;
  } else {
    return currentMin >= startMin && currentMin < endMin;
  }
};

/**
 * スケジュールに基づいてダークモードを有効にすべきかどうかを確認
 */
window.shouldEnableDarkModeBySchedule = function (schedule) {
  if (!schedule || !schedule.enabled) {
    return null;
  }

  const now = new Date();
  const dayOfWeek = now.getDay();

  if (!schedule.days || schedule.days.length === 0) {
    window.logWarn("スケジュール設定の days が空です");
    return null;
  }

  if (!schedule.days.includes(dayOfWeek)) {
    return false;
  }

  const startMin = window.timeToMinutes(schedule.startTime);
  const endMin = window.timeToMinutes(schedule.endTime);
  const inTimeRange = window.isCurrentTimeInRange(startMin, endMin);

  return inTimeRange;
};

/**
 * 最終的にダークモードを有効にすべきかどうかを決定
 */
window.resolveFinalDarkModeState = function (userManuallyEnabled, schedule) {
  const scheduleOverride = window.shouldEnableDarkModeBySchedule(schedule);

  if (!userManuallyEnabled && scheduleOverride !== null) {
    return scheduleOverride;
  }
  return userManuallyEnabled;
};

/**
 * DOMの準備完了を待機
 */
window.waitForDOMReady = function (timeout = 5000) {
  return new Promise((resolve) => {
    if (document.documentElement && document.body) {
      resolve(true);
      return;
    }

    const timer = setTimeout(() => {
      window.logWarn(`DOM準備完了チェックのタイムアウト (${timeout}ms)`);
      resolve(false);
    }, timeout);

    document.addEventListener("DOMContentLoaded", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
};
