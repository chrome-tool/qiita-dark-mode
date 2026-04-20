/**
 * Qiita Dark Mode - グローバル設定
 * 
 * このファイルにはすべての定数と設定項目が含まれており、
 * 複数のファイルでの重複定義を防ぎます。
 */

window.CONFIG = {
  // ストレージキー名
  DARK_MODE_KEY: "qiita-dark-mode-enabled",
  SCHEDULE_KEY: "qiita-dark-mode-schedule",
  
  // DOM属性
  ROOT_ATTRIBUTE: "data-qiita-dark-mode",
  MEDIA_CLASS: "qiita-darkmode-media",
  
  // メディア要素セレクタ - モダンなHTMLタグや様々なメディアコンテナをサポート
  MEDIA_SELECTORS: [
    // 基本的なメディア要素
    "img",
    "video",
    "iframe",
    "svg",
    "svg image",
    
    // モダンなHTML構造
    "picture",
    "source",
    
    // 背景画像（様々な記述方法）
    "[style*='background-image']",
    "[style*='background:']",
    "[style*='backgroundImage']",
    
    // 一般的なチャートや外部コンテンツライブラリ
    "[class*='gist']",
    "[class*='embed']",
    "[class*='widget']",
  ],
  
  // パフォーマンス設定
  DEBOUNCE_DELAY: 300,  // デバウンス遅延（ミリ秒）
  MUTATION_OBSERVER_OPTIONS: {
    childList: true,  // 子ノードの追加・削除を監視
    subtree: true,    // すべての子孫を監視
  },
  
  // デフォルトのスケジュール設定
  DEFAULT_SCHEDULE: {
    enabled: false,
    startTime: "22:00",   // 24時間表記、HH:mm 形式
    endTime: "08:00",     // 日付をまたぐ対応
    days: [0, 1, 2, 3, 4, 5, 6],  // 0=日曜日、6=土曜日、毎日有効
  },
  
  // デバッグモード
  DEBUG: false,
  
  // ログプレフィックス
  LOG_PREFIX: "[Qiita Dark Mode]",
};
