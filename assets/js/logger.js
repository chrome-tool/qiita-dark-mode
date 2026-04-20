import { CONFIG } from "./config.js";

export function logDebug(message, data = null) {
  if (CONFIG.DEBUG) {
    console.log(
      `%c${CONFIG.LOG_PREFIX}`,
      "color: #8fd3ff; font-weight: bold;",
      message,
      data || "",
    );
  }
}

export function logWarn(message, data = null) {
  console.warn(
    `%c${CONFIG.LOG_PREFIX}`,
    "color: #ffa500; font-weight: bold;",
    message,
    data || "",
  );
}

export function logError(message, error = null) {
  console.error(
    `%c${CONFIG.LOG_PREFIX}`,
    "color: #ff6b6b; font-weight: bold;",
    message,
    error || "",
  );
}
