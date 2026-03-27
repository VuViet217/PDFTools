// ═════════════════════════════════════════════════════════════════════════════
// i18n.js - Multilingual Support System (Vietnamese & Japanese)
// ═════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  vi: {
    // Navbar
    nav_app_title:       "PDF Tools",
    nav_split_merge:     "Tách / Nối PDF",
    nav_editor:          "Chỉnh sửa PDF",
    lang_switch_btn:     "🇯🇵 日本語",

    // Trang Split/Merge
    tab_split:           "Tách PDF",
    tab_merge:           "Nối PDF",
    upload_hint:         "Kéo thả file PDF vào đây hoặc click để chọn",
    pages_label:         "Nhập nhóm trang",
    pages_hint:          "Mỗi nhóm cách nhau dấu phẩy • Bỏ trống = tách từng trang",
    btn_split:           "TÁCH PDF",
    btn_add_file:        "➕ Thêm PDF",
    btn_remove:          "Xoá",
    btn_merge:           "🔗 NỐI PDF",
    btn_download:        "⬇ Tải xuống",
    processing:          "Đang xử lý...",
    split_result_title:  "Kết quả tách PDF",
    tab_split_section:   "Tách PDF",
    tab_merge_section:   "Nối PDF",
    file_list_label:     "Danh sách file",
    drag_to_reorder:     "Kéo để sắp xếp",

    // Trang Editor
    editor_title:        "Chỉnh sửa PDF",
    upload_pdf_editor:   "Upload PDF để bắt đầu chỉnh sửa",
    btn_rotate:          "Xoay 90°",
    btn_delete_page:     "Xoá trang",
    btn_insert_here:     "Chèn vào đây",
    btn_delete_blank:    "🗑 Xoá trang trắng",
    btn_reverse:         "↕ Đảo thứ tự",
    btn_export:          "📄 Xuất PDF",
    confirm_delete:      "Bạn có chắc muốn xoá trang này không?",
    page_label:          "Trang",
    select_all:          "Chọn tất cả",
    deselect_all:        "Bỏ chọn tất cả",
    bulk_delete:         "Xoá các trang đã chọn",

    // Toast
    toast_upload_ok:     "Upload thành công!",
    toast_process_ok:    "Xử lý hoàn tất!",
    toast_error:         "Có lỗi xảy ra. Vui lòng thử lại.",
    toast_file_large:    "File quá lớn (tối đa 50MB)",
    toast_no_file:       "Vui lòng chọn file PDF",
    toast_invalid_format: "Định dạng trang không hợp lệ",

    // Footer
    footer_text:         "Hệ thống nội bộ — Chỉ dành cho nhân viên công ty",
  },

  ja: {
    // Navbar
    nav_app_title:       "PDF ツール",
    nav_split_merge:     "分割 / 結合",
    nav_editor:          "PDF 編集",
    lang_switch_btn:     "🇻🇳 Tiếng Việt",

    // Split/Merge
    tab_split:           "PDF 分割",
    tab_merge:           "PDF 結合",
    upload_hint:         "PDFファイルをここにドラッグするか、クリックして選択",
    pages_label:         "ページグループを入力",
    pages_hint:          "カンマで区切る • 空白 = 1ページずつ分割",
    btn_split:           "PDF を分割",
    btn_add_file:        "➕ PDF を追加",
    btn_remove:          "削除",
    btn_merge:           "🔗 PDF を結合",
    btn_download:        "⬇ ダウンロード",
    processing:          "処理中...",
    split_result_title:  "PDF分割結果",
    tab_split_section:   "分割",
    tab_merge_section:   "結合",
    file_list_label:     "ファイルリスト",
    drag_to_reorder:     "ドラッグして並べ替え",

    // Editor
    editor_title:        "PDF 編集",
    upload_pdf_editor:   "編集するPDFをアップロード",
    btn_rotate:          "90°回転",
    btn_delete_page:     "ページ削除",
    btn_insert_here:     "ここに挿入",
    btn_delete_blank:    "🗑 空白ページ削除",
    btn_reverse:         "↕ 順序を逆にする",
    btn_export:          "📄 PDFを出力",
    confirm_delete:      "このページを削除してもよろしいですか？",
    page_label:          "ページ",
    select_all:          "すべて選択",
    deselect_all:        "選択を解除",
    bulk_delete:         "選択したページを削除",

    // Toast
    toast_upload_ok:     "アップロード完了！",
    toast_process_ok:    "処理が完了しました！",
    toast_error:         "エラーが発生しました。もう一度お試しください。",
    toast_file_large:    "ファイルが大きすぎます（最大50MB）",
    toast_no_file:       "PDFファイルを選択してください",
    toast_invalid_format: "ページ形式が無効です",

    // Footer
    footer_text:         "社内システム — 社員専用",
  }
};

// 現在の言語（localStorageから取得、デフォルトは"vi"）
let currentLang = localStorage.getItem("lang") || "vi";

// keyに基づいてテキストを取得する関数
function t(key) {
  return TRANSLATIONS[currentLang][key] || key;
}

// 全DOM にタイムズ適用
// HTMLエレメントには data-i18n="key" 属性が必要
// 例: <button data-i18n="btn_split">TÁCH PDF</button>
function applyLang() {
  // Text content
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  // Placeholder
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });

  // Title attribute
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });

  // Trigger custom event for page-specific updates
  document.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang: currentLang } }));
}

// 言語の切り替え（言語切り替えボタンに割り当て）
function toggleLang() {
  currentLang = currentLang === "vi" ? "ja" : "vi";
  localStorage.setItem("lang", currentLang);
  applyLang();
}

// ページロード完了時に実行
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyLang);
} else {
  applyLang();
}
