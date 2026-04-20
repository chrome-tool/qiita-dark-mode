/**
 * Qiita Dark Mode - Popup Script
 *
 * 責務：
 * 1. ストレージから現在のテーマ設定とスケジュール設定を読み込む
 * 2. UI状態の同期（チェックボックス、時間入力、日付選択）
 * 3. ユーザー操作を監視し、ストレージを更新する
 * 4. ステータステキストをリアルタイムで更新する
 * 5. スケジュール制御パネルの表示/非表示を管理する
 */

import { CONFIG } from "./config.js";
import { getStorage, setStorage } from "./utils.js";

// ===== DOM要素の参照 =====
const toggle = document.getElementById("theme-toggle");
const status = document.getElementById("status");
const scheduleToggle = document.getElementById("schedule-toggle");
const scheduleControls = document.getElementById("schedule-controls");
const startTimeInput = document.getElementById("start-time");
const endTimeInput = document.getElementById("end-time");
const daysCheckboxes = document.querySelectorAll("input[name='day']");

/**
 * ステータステキストの描画
 * 現在のダークモードの状態とスケジュール情報を表示
 *
 * @param {boolean} enabled - ダークモードが有効かどうか
 * @param {Object} schedule - スケジュール設定オブジェクト
 */
function renderStatus(enabled, schedule) {
  let text = enabled ? "ダークモード: 有効" : "ダークモード: 無効";

  if (schedule && schedule.enabled) {
    const days = getDayLabels(schedule.days);
    text += ` (スケジュール: ${schedule.startTime} - ${schedule.endTime}, 毎週${days})`;
  }

  status.textContent = text;
}

/**
 * 曜日配列を読みやすいラベルに変換
 *
 * @param {number[]} days - 0-6 は日曜日から土曜日を表す
 * @returns {string} 例: "月水金"
 */
function getDayLabels(days) {
  if (!days || days.length === 0) return "なし";
  if (days.length === 7) return "毎日";

  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  return days.map((d) => dayNames[d]).join("");
}

/**
 * スケジュール制御パネルの表示状態を更新
 * スケジュールが有効な場合は詳細制御を表示、そうでない場合は非表示
 */
function updateScheduleControlsVisibility() {
  const isScheduleEnabled = scheduleToggle.checked;
  scheduleControls.style.display = isScheduleEnabled ? "block" : "none";
}

/**
 * UIからスケジュール設定を読み込む
 *
 * @returns {Object} スケジュール設定オブジェクト
 */
function readScheduleFromUI() {
  const days = Array.from(daysCheckboxes)
    .map((cb, index) => (cb.checked ? index : null))
    .filter((i) => i !== null);

  return {
    enabled: scheduleToggle.checked,
    startTime: startTimeInput.value,
    endTime: endTimeInput.value,
    days: days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6], // デフォルトは毎日
  };
}

/**
 * スケジュール設定をUIに同期する
 *
 * @param {Object} schedule - スケジュール設定オブジェクト
 */
function syncScheduleToUI(schedule) {
  scheduleToggle.checked = schedule.enabled;
  startTimeInput.value = schedule.startTime;
  endTimeInput.value = schedule.endTime;

  daysCheckboxes.forEach((checkbox, index) => {
    checkbox.checked = schedule.days.includes(index);
  });

  updateScheduleControlsVisibility();
}

/**
 * ストレージ内のスケジュール設定を更新
 * 現在のUI状態を読み取り、ストレージに保存
 */
function updateSchedule() {
  const schedule = readScheduleFromUI();

  chrome.storage.sync.set({ [CONFIG.SCHEDULE_KEY]: schedule }, () => {
    // 保存成功後、ステータス表示を更新
    chrome.storage.sync.get(CONFIG.DARK_MODE_KEY, (result) => {
      const enabled = Boolean(result[CONFIG.DARK_MODE_KEY]);
      renderStatus(enabled, schedule);
    });
  });
}

/**
 * Popup UIの初期化
 * ストレージから現在の設定を読み込み、UIに同期
 */
async function initializeUI() {
  try {
    const result = await chrome.storage.sync.get({
      [CONFIG.DARK_MODE_KEY]: true,
      [CONFIG.SCHEDULE_KEY]: CONFIG.DEFAULT_SCHEDULE,
    });

    const enabled = Boolean(result[CONFIG.DARK_MODE_KEY]);
    const schedule = result[CONFIG.SCHEDULE_KEY] || CONFIG.DEFAULT_SCHEDULE;

    // テーマトグルの同期
    toggle.checked = enabled;

    // スケジュールUIの同期
    syncScheduleToUI(schedule);

    // ステータス表示の更新
    renderStatus(enabled, schedule);
  } catch (e) {
    console.error(
      "[Qiita Dark Mode] Popup UIの初期化中にエラーが発生しました",
      e,
    );
  }
}

/**
 * === イベントリスナー ===
 */

/**
 * テーマトグルイベント
 * ユーザーがダークモードを切り替えたときにトリガー
 */
toggle.addEventListener("change", () => {
  try {
    const enabled = toggle.checked;

    chrome.storage.sync.set({ [CONFIG.DARK_MODE_KEY]: enabled }, () => {
      // 保存成功後、ステータス表示を更新
      chrome.storage.sync.get(CONFIG.SCHEDULE_KEY, (result) => {
        const schedule = result[CONFIG.SCHEDULE_KEY] || CONFIG.DEFAULT_SCHEDULE;
        renderStatus(enabled, schedule);
      });
    });
  } catch (e) {
    console.error("[Qiita Dark Mode] テーマ切り替えエラー", e);
  }
});

/**
 * スケジュール有効/無効トグルイベント
 */
scheduleToggle.addEventListener("change", () => {
  try {
    updateScheduleControlsVisibility();
    updateSchedule();
  } catch (e) {
    console.error("[Qiita Dark Mode] スケジュール切り替えエラー", e);
  }
});

/**
 * 開始時間入力イベント
 */
startTimeInput.addEventListener("change", () => {
  try {
    updateSchedule();
  } catch (e) {
    console.error("[Qiita Dark Mode] 開始時間の更新エラー", e);
  }
});

/**
 * 終了時間入力イベント
 */
endTimeInput.addEventListener("change", () => {
  try {
    updateSchedule();
  } catch (e) {
    console.error("[Qiita Dark Mode] 終了時間の更新エラー", e);
  }
});

/**
 * 曜日チェックボックスイベント
 * ユーザーが特定の曜日を選択/選択解除したときにトリガー
 */
daysCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    try {
      updateSchedule();
    } catch (e) {
      console.error("[Qiita Dark Mode] 曜日選択の更新エラー", e);
    }
  });
});

/**
 * === 初期化 ===
 */
document.addEventListener("DOMContentLoaded", async () => {
  const popupContainer = document.querySelector(".popup");
  if (popupContainer) {
    await initializeUI();
  }
});
