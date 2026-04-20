/**
 * Qiita Dark Mode - ログ機能
 */

window.logDebug = function(message, data = null) {
  if (window.CONFIG && window.CONFIG.DEBUG) {
    console.log(
      `%c${window.CONFIG.LOG_PREFIX}`,
      "color: #8fd3ff; font-weight: bold;",
      message,
      data || ""
    );
  }
};

window.logWarn = function(message, data = null) {
  console.warn(
    `%c${window.CONFIG.LOG_PREFIX}`,
    "color: #ffa500; font-weight: bold;",
    message,
    data || ""
  );
};

window.logError = function(message, error = null) {
  console.error(
    `%c${window.CONFIG.LOG_PREFIX}`,
    "color: #ff6b6b; font-weight: bold;",
    message,
    error || ""
  );
};
