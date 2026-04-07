// ═════════════════════════════════════════════════════════════════════════════
// i18n.js - Multilingual Support System (Vietnamese & Japanese)
// ═════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  vi: {
    // Navbar
    nav_app_title:       "PDF Tools",
    nav_pdf_tools:       "PDF Tools",
    nav_image_converter: "Chuyển đổi ảnh",
    nav_split_merge:     "Tách / Nối PDF",
    nav_extract_pages:   "Tách Trang Cụ Thể",
    nav_editor:          "Chỉnh sửa PDF",
    nav_compress:        "Nén PDF",
    nav_security:        "Bảo mật",
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

    // Extract Pages
    extract_pages_btn:   "✂️ Tách Trang Cụ Thể",
    extract_title:       "Tách Trang Cụ Thể từ PDF",
    extract_choose_file: "Chọn file PDF:",
    extract_drag_drop:   "📁 Kéo thả file PDF hoặc click để chọn",
    extract_max_size:    "Tối đa 50MB",
    extract_file_label:  "File:",
    extract_page_range:  "Danh sách trang:",
    extract_placeholder: "Ví dụ: 1,2,5-10,15",
    extract_hint:        "Nhập số trang hoặc dãy trang (1-indexed). Ví dụ: 1,3,5-10,15",
    extract_total_pages: "Tổng số trang:",
    extract_btn:         "✂️ Tách Trang PDF",
    extract_success:     "Tách trang thành công! File đang tải xuống...",
    extract_example_title: "Ví dụ cách nhập:",
    extract_example_1:   "Lấy trang 1, 3, 5",
    extract_example_2:   "Lấy trang 1 đến 5",
    extract_example_3:   "Lấy trang 1, từ 3 đến 5, và trang 10",
    extract_example_4:   "Kết hợp cả hai cách",
    extract_processing:  "Đang xử lý PDF...",
    btn_reset:           "Xóa",

    // Trang Editor
    editor_title:        "Chỉnh sửa PDF",
    upload_pdf_editor:   "Upload PDF để bắt đầu chỉnh sửa",
    btn_insert_pdf:      "➕ Chèn PDF",
    btn_insert_blank:    "📄 Chèn trang trắng",
    btn_watermark:       "🔤 Chèn Watermark",
    watermark_prompt:    "Nhập chữ Watermark (Để trống = Bỏ)",
    watermark_placeholder: "VD: BẢN NHÁP, BẢO MẬT...",
    btn_rotate:          "Xoay 90°",
    btn_delete_page:     "Xoá trang",
    btn_insert_here:     "Chèn vào đây",
    btn_delete_blank:    "🗑 Xoá trang trắng",
    select_blank_pages:  "📄 Chọn trang trắng",
    no_blank_pages:      "Không tìm thấy trang trắng",
    blank_pages_selected: "Đã chọn {count} trang trắng",
    blank_pages_deleted:  "Đã xóa {count} trang trắng",
    confirm_delete_blank: "Tìm thấy {count} trang trắng. Bạn có muốn xóa?",
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
    toast_compress_ok:   "Nén thành công!",
    toast_error:         "Có lỗi xảy ra. Vui lòng thử lại.",
    toast_file_large:    "File quá lớn (tối đa 50MB)",
    toast_no_file:       "Vui lòng chọn file PDF",
    toast_invalid_format: "Định dạng trang không hợp lệ",

    // Footer
    footer_text:         "Hệ thống nội bộ — Chỉ dành cho nhân viên công ty",

    // Compress
    compress_title:      "Nén dung lượng PDF",
    compress_desc:       "Giảm dung lượng file PDF tối đa mà vẫn giữ chất lượng tốt",
    upload_compress_hint:"Kéo thả file PDF vào đây hoặc click để chọn",
    btn_compress:        "NÉN PDF",
    
    // Security
    tab_protect:         "Khóa PDF",
    tab_unlock:          "Gỡ mật khẩu",
    protect_desc:        "Bảo vệ file PDF của bạn bằng mật khẩu mã hóa AES-128",
    unlock_desc:         "Gỡ bỏ hoàn toàn mật khẩu khỏi file PDF nếu bạn có mật khẩu đúng",
    password_label:      "Nhập mật khẩu",
    password_current_label: "Nhập mật khẩu hiện tại của file",
    password_protect_hint:"Nhập mật khẩu cần đặt",
    password_unlock_hint: "Nhập mật khẩu để mở file",
    btn_protect:         "🔒 KHÓA PDF",
    btn_unlock:          "🔓 MỞ KHÓA PDF",
    
    // Tools Dashboard
    company_tools:       "Công Cụ",
    company_tools_subtitle: "Bộ công cụ giúp bạn làm việc nhanh hơn tại OVNC",
    tool_pdf:            "PDF Tools",
    tool_pdf_desc:       "Tách, nối, chỉnh sửa, nén, bảo mật PDF",
    tool_image:          "Chuyển đổi ảnh",
    tool_image_desc:     "Chuyển đổi, nén, thay đổi kích thước ảnh",
    tool_password:       "Tạo Mật Khẩu",
    tool_password_desc:  "Tạo mật khẩu ngẫu nhiên mạnh với tùy chỉnh",
    tool_word_compare:   "So Sánh Word",
    tool_word_compare_desc: "So sánh 2 file Word (.docx) và highlight sự khác biệt",
    tool_excel_compare:  "So Sánh Excel",
    tool_excel_compare_desc: "So sánh 2 file Excel (.xlsx) và highlight dữ liệu thay đổi",
    btn_use_now:         "Sử dụng",
    coming_soon:         "Sắp ra mắt",
    
    // OCR Scanner
    ocr_title:           "Quét OCR",
    ocr_desc:            "Nhận dạng text từ ảnh, chuyển đổi ảnh thành văn bản",

    // Image Converter
    image_converter_title: "Chuyển đổi ảnh",
    image_converter_desc: "Chuyển đổi giữa các định dạng ảnh, giữ nguyên chất lượng, hỗ trợ 14+ định dạng",
    image_upload_text: "Kéo thả ảnh vào đây",
    image_upload_hint: "hoặc click để chọn file",
    image_file_name: "Tên file:",
    image_file_size: "Dung lượng:",
    image_file_format: "Định dạng:",
    image_selected_files: "Ảnh đã chọn",
    image_add_more: "+ Thêm ảnh khác",
    image_raster_formats: "Định dạng Raster",
    image_raw_formats: "Định dạng Raw",
    image_quality_label: "Chất lượng:",
    image_convert_btn: "🔄 Chuyển đổi",
    image_convert_all_btn: "🔄 Chuyển đổi tất cả",
    image_reset_btn: "↻ Reset",
    image_convert_success: "✅ Chuyển đổi thành công!",
    image_download_btn: "⬇ Tải xuống",
    image_select_format: "Vui lòng chọn định dạng",
    toast_invalid_image: "Định dạng ảnh không được hỗ trợ",

    // Password Generator
    pwd_gen_title: "Tạo Mật Khẩu",
    pwd_length_label: "Số lượng ký tự",
    pwd_length_hint: "Tối thiểu 8 ký tự, tối đa 64 ký tự",
    pwd_uppercase: "Chữ In Hoa (A-Z)",
    pwd_lowercase: "Chữ Thường (a-z)",
    pwd_numbers: "Số (0-9)",
    pwd_symbols: "Ký Tự Đặc Biệt (!@#$%)",
    pwd_required_label: "Từ bắt buộc có trong mật khẩu (tuỳ chọn)",
    pwd_required_placeholder: "VD: abc123",
    pwd_required_hint: "Để trống nếu không cần yêu cầu ký tự cụ thể",
    pwd_generate_btn: "🔐 Tạo Mật Khẩu",
    pwd_strength_weak: "Yếu",
    pwd_strength_fair: "Trung Bình",
    pwd_strength_good: "Tốt",
    pwd_strength_strong: "Mạnh",
    pwd_strength_very_strong: "Rất Mạnh",
    pwd_error_no_options: "Vui lòng chọn ít nhất một tùy chọn (chữ In Hoa, chữ Thường, Số, hoặc Ký Tự Đặc Biệt)",
    pwd_error_min_length: "Bắt buộc tối thiểu 8 ký tự",
    pwd_error_required_longer: "Từ bắt buộc không được dài hơn số lượng ký tự",

    // Clipboard Cleaner
    cc_title: "Clipboard Cleaner",
    cc_desc: "Làm sạch và chuẩn hóa văn bản copy từ PDF, website, email, Excel…",
    cc_opt_merge: "Gộp dòng",
    cc_opt_spaces: "Xóa khoảng trắng thừa",
    cc_opt_special: "Xóa ký tự ẩn",
    cc_opt_punctuation: "Chuẩn hóa dấu câu",
    cc_opt_accents: "Bỏ dấu tiếng Việt",
    cc_opt_case: "Chữ hoa/thường:",
    cc_case_none: "Không đổi",
    cc_case_upper: "CHỮ HOA",
    cc_case_lower: "chữ thường",
    cc_case_title: "Viết Hoa Đầu",
    cc_input_label: "Văn bản gốc",
    cc_input_placeholder: "Dán văn bản cần làm sạch vào đây...",
    cc_output_label: "Kết quả",
    cc_output_placeholder: "Kết quả sẽ hiển thị ở đây...",
    cc_btn_clean: "🧹 Làm sạch",
    cc_btn_copy: "📋 Copy kết quả",
    cc_btn_replace: "🔄 Thay thế input",
    cc_btn_clear: "🗑 Xóa tất cả",
    cc_processing: "Đang xử lý...",
    cc_success: "Làm sạch thành công!",
    cc_copied: "✅ Đã copy vào clipboard!",
    cc_error_empty: "Vui lòng nhập văn bản",
    cc_stat_chars_removed: "Ký tự đã xóa:",
    cc_stat_lines_before: "Số dòng trước:",
    cc_stat_lines_after: "Số dòng sau:",
    tool_clipboard: "Clipboard Cleaner",
    tool_clipboard_desc: "Làm sạch văn bản copy từ PDF, web, email, Excel",

    // PDF Page Number
    pn_title: "Đánh Số Trang PDF",
    pn_desc: "Tự động thêm số trang vào footer mỗi trang PDF",
    pn_upload_hint: "Kéo thả file PDF vào đây hoặc click để chọn",
    pn_options: "⚙️ Tùy chọn",
    pn_position: "Vị trí",
    pn_pos_left: "Dưới trái",
    pn_pos_center: "Dưới giữa",
    pn_pos_right: "Dưới phải",
    pn_format: "Định dạng",
    pn_start_number: "Bắt đầu từ",
    pn_font_size: "Cỡ chữ",
    pn_margin: "Khoảng cách dưới (pt)",
    pn_color: "Màu chữ",
    pn_preview: "Xem trước:",
    pn_btn_process: "📄 Đánh số trang",
    pn_btn_download: "⬇ Tải xuống",
    pn_processing: "Đang xử lý...",
    pn_success: "Đánh số trang thành công!",
    pn_result_info: "Đã đánh số {total} trang thành công",

    // Word Compare
    word_compare_title: "So Sánh Word",
    word_compare_upload1: "Tải lên File 1 (.docx)",
    word_compare_upload2: "Tải lên File 2 (.docx)",
    word_compare_hint: "Kéo thả file hoặc click để chọn",
    word_compare_btn: "📊 So Sánh",
    word_compare_removed: "Nội dung bị xóa",
    word_compare_added: "Nội dung thêm vào",
    word_compare_unchanged: "Nội dung giữ nguyên",
    word_compare_space_diff: "Khác biệt khoảng trắng (·)",
    compare_result_title: "Kết Quả So Sánh",
    view_side_by_side: "Cột Kép",
    view_unified: "Thống Nhất",
    reset_btn: "↻ Reset",
    processing: "Đang xử lý...",

    // Excel Compare
    excel_compare_title: "So Sánh Excel",
    excel_compare_upload1: "Tải lên File 1 (.xlsx)",
    excel_compare_upload2: "Tải lên File 2 (.xlsx)",
    excel_compare_hint: "Kéo thả file hoặc click để chọn",
    excel_compare_btn: "📊 So Sánh",
    excel_compare_removed: "Dòng bị xóa",
    excel_compare_added: "Dòng được thêm",
    excel_compare_modified: "Dòng được sửa",
    excel_compare_unchanged: "Dòng giữ nguyên",
    view_summary: "Tóm Tắt",
    view_detailed: "Chi Tiết",
    btn_download: "⬇ Tải xuống",
    
    // PDF to Image
    pdf_to_image_title: "Chuyển đổi PDF sang Ảnh",
    pdf_to_image_desc: "Chuyển đổi PDF thành ảnh PNG hoặc JPG với chất lượng cao",
    upload_pdf_to_image_hint: "Kéo thả file PDF vào đây hoặc click để chọn",
    pdf_to_image_format: "Định dạng ảnh",
    pdf_to_image_quality: "Chất lượng ảnh",
    btn_pdf_to_image: "🖼️ CHUYỂN ĐỔI",
    pdf_to_image_success: "Chuyển đổi thành công!",
    pdf_to_image_images: "ảnh",

    // PDF to Excel
    pdf_to_excel_title: "PDF sang Excel",
    pdf_to_excel_desc: "Xuất bảng trong PDF ra file Excel để dễ copy dữ liệu",
    pte_drag_drop: "📁 Kéo thả file PDF hoặc click để chọn",
    pte_max_size: "Tối đa 50MB",
    pte_scan_warning: "File PDF dạng scan (ảnh) có thể không trích xuất được bảng. Chức năng này hoạt động tốt nhất với PDF có bảng dạng text.",
    pte_preview_btn: "🔍 Xem trước bảng",
    pte_download_btn: "📊 Tải Excel",
    pte_preview_title: "📋 Xem trước bảng tìm thấy",
    pte_success: "Tải xuống thành công!",

    // Extract Images from PDF
    pei_title: "Xuất hình ảnh từ PDF",
    pei_desc: "Trích xuất tất cả hình ảnh có trong file PDF",
    pei_drag_drop: "📁 Kéo thả file PDF hoặc click để chọn",
    pei_max_size: "Tối đa 50MB",
    pei_btn: "🖼️ Xuất hình ảnh",
    pei_processing: "Đang trích xuất hình ảnh...",
    pei_success: "Trích xuất thành công {count} hình ảnh! File đang tải xuống...",
    pei_error_PDF_EMPTY: "PDF trống, không có trang nào",
    pei_error_NO_IMAGES: "Không tìm thấy hình ảnh nào trong PDF",

    // Annotate PDF
    annotate_title: "Annotate PDF",
    annotate_desc: "Thêm chữ, highlight, vẽ, ký tên, chèn ảnh lên PDF",
    annotate_drag_drop: "Kéo thả file PDF hoặc click để chọn",
    annotate_max_size: "Tối đa 100MB",
    annotate_back: "Quay lại",
    annotate_text: "Thêm chữ",
    annotate_highlight: "Highlight",
    annotate_draw: "Vẽ",
    annotate_sign: "Ký tên",
    annotate_image: "Ảnh",
    annotate_save: "Lưu PDF",
    annotate_font_size: "Cỡ chữ:",
    annotate_color: "Màu:",
    annotate_opacity: "Độ mờ:",
    annotate_stroke_width: "Độ dày:",
    annotate_page: "Trang",
    annotate_sign_title: "Tạo chữ ký",
    annotate_sign_draw: "Vẽ",
    annotate_sign_upload: "Upload ảnh",
    annotate_sign_clear: "Xóa",
    annotate_sign_apply: "Áp dụng",
    annotate_sign_empty: "Vui lòng vẽ hoặc upload chữ ký",
    annotate_cancel: "Hủy",
    annotate_no_changes: "Không có thay đổi để lưu",
    annotate_save_success: "Lưu PDF thành công!",
    annotate_eraser: "Tẩy",
    annotate_eraser_size: "Kích thước tẩy:",
    annotate_eraser_hint: "Click vào đối tượng để xóa",
    annotate_shapes: "Hình",
    annotate_rectangle: "Hình chữ nhật",
    annotate_ellipse: "Hình elip",
    annotate_line: "Đường thẳng",
    annotate_arrow: "Mũi tên",
    annotate_polygon: "Đa giác",
    annotate_polyline: "Đường gấp khúc",
    annotate_stroke_color: "Viền:",
    annotate_fill_color: "Nền:",
    annotate_no_fill: "Không nền",
    annotate_line_style: "Nét:",
    annotate_solid: "Liền",
    annotate_dashed: "Nét đứt",
    annotate_dotted: "Chấm",
    annotate_sides: "Cạnh:",

    // Homepage - Extract Pages Card
    extract_pages_desc: "Trích xuất những trang cụ thể (VD: 1,2,5-10) từ PDF",

    // Footer
    footer_brand: "Được phát triển bởi <strong>Việt Đinh - IT OVNC</strong> • Hệ thống nội bộ — Chỉ dành cho nhân viên công ty",
    footer_online: "Online",
    footer_total_visits: "Tổng truy cập",

    // 404 Error Page
    error_404_title: "Trang không tìm thấy",
    error_404_description: "Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa. Vui lòng kiểm tra URL hoặc quay lại trang chủ.",
    error_404_action: "← Quay lại trang chủ",
  },

  ja: {
    // Navbar
    nav_app_title:       "PDF ツール",
    nav_split_merge:     "分割 / 結合",
    nav_extract_pages:   "特定ページを抽出",
    nav_editor:          "PDF 編集",
    nav_compress:        "PDF 圧縮",
    nav_security:        "セキュリティ",
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

    // Extract Pages
    extract_pages_btn:   "✂️ 特定ページを抽出",
    extract_title:       "PDFから特定ページを抽出",
    extract_choose_file: "PDFファイルを選択:",
    extract_drag_drop:   "📁 PDFファイルをドラッグするか、クリックして選択",
    extract_max_size:    "最大50MB",
    extract_file_label:  "ファイル:",
    extract_page_range:  "ページリスト:",
    extract_placeholder: "例：1,2,5-10,15",
    extract_hint:        "ページ番号または範囲を入力（1始まり）。例：1,3,5-10,15",
    extract_total_pages: "総ページ数:",
    extract_btn:         "✂️ PDFページを抽出",
    extract_success:     "ページの抽出に成功しました！ファイルをダウンロード中...",
    extract_example_title: "入力例:",
    extract_example_1:   "ページ1、3、5を取得",
    extract_example_2:   "ページ1～5を取得",
    extract_example_3:   "ページ1、3～5、10を取得",
    extract_example_4:   "両方の方法を組み合わせ",
    extract_processing:  "PDF処理中...",
    btn_reset:           "クリア",

    // Editor
    editor_title:        "PDF 編集",
    upload_pdf_editor:   "編集するPDFをアップロード",
    btn_insert_pdf:      "➕ PDF 挿入",
    btn_insert_blank:    "📄 空白ページ挿入",
    btn_watermark:       "🔤 透かし挿入",
    watermark_prompt:    "透かしのテキストを入力",
    watermark_placeholder: "例: 社外秘, ドラフト...",
    btn_rotate:          "90°回転",
    btn_delete_page:     "ページ削除",
    btn_insert_here:     "ここに挿入",
    btn_delete_blank:    "🗑 空白ページ削除",
    select_blank_pages:  "📄 空白ページを選択",
    no_blank_pages:      "空白ページが見つかりません",
    blank_pages_selected: "{count}件の空白ページを選択しました",
    blank_pages_deleted:  "{count}件の空白ページを削除しました",
    confirm_delete_blank: "{count}件の空白ページが見つかりました。削除しますか？",
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
    toast_compress_ok:   "圧縮完了！",
    toast_error:         "エラーが発生しました。もう一度お試しください。",
    toast_file_large:    "ファイルが大きすぎます（最大50MB）",
    toast_no_file:       "PDFファイルを選択してください",
    toast_invalid_format: "ページ形式が無効です",

    // Footer
    footer_text:         "社内システム — 社員専用",

    // Compress
    compress_title:      "PDFを圧縮",
    compress_desc:       "品質を保ちながらPDFのファイルサイズを縮小します",
    upload_compress_hint:"PDFファイルをここにドラッグするか、クリックして選択",
    btn_compress:        "PDFを圧縮",
    
    // Security
    tab_protect:         "PDFをロック",
    tab_unlock:          "パスワード解除",
    protect_desc:        "AES-128暗号化パスワードでPDFファイルを保護します",
    unlock_desc:         "正しいパスワードをお持ちの場合、PDFからパスワードを完全に削除します",
    password_label:      "パスワードを入力",
    password_current_label: "現在のパスワードを入力",
    password_protect_hint:"設定するパスワードを入力",
    password_unlock_hint: "ファイルを開くためのパスワードを入力",
    btn_protect:         "🔒 ロック",
    btn_unlock:          "🔓 解除",

    // Tools Dashboard
    company_tools:       "ツール",
    company_tools_subtitle: "OVNC での仕事をより高速化するツール集",
    tool_pdf:            "PDF ツール",
    tool_pdf_desc:       "PDF を分割、結合、編集、圧縮、保護",
    tool_image:          "画像変換",
    tool_image_desc:     "画像を変換、圧縮、リサイズする",
    tool_password:       "パスワード生成",
    tool_password_desc:  "カスタマイズ可能な強いランダムパスワードを生成する",
    tool_word_compare:   "Word比較",
    tool_word_compare_desc: "2つのWord ファイル (.docx) を比較して違いをハイライト",
    tool_excel_compare:  "Excel比較",
    tool_excel_compare_desc: "2つの Excel ファイル (.xlsx) を比較して変更データをハイライト",
    btn_use_now:         "使用",
    coming_soon:         "近日公開",

    // OCR Scanner
    ocr_title:           "OCR スキャン",
    ocr_desc:            "画像からテキストを認識、画像をテキストに変換",

    // Image Converter
    nav_pdf_tools:       "PDF ツール",
    nav_image_converter: "画像変換",
    image_converter_title: "画像変換",
    image_converter_desc: "複数の形式で画像を相互変換し、品質を保持します。14以上の形式をサポート",
    image_upload_text: "ここに画像をドラッグ",
    image_upload_hint: "またはクリックして選択",
    image_file_name: "ファイル名:",
    image_file_size: "ファイルサイズ:",
    image_file_format: "形式:",
    image_selected_files: "選択済みの画像",
    image_add_more: "+ 他の画像を追加",
    image_raster_formats: "ラスタ形式",
    image_vector_formats: "ベクタ形式",

    // Clipboard Cleaner
    cc_title: "クリップボードクリーナー",
    cc_desc: "PDF、ウェブサイト、メール、Excelからコピーしたテキストを整形・正規化",
    cc_opt_merge: "行を結合",
    cc_opt_spaces: "余分なスペースを削除",
    cc_opt_special: "隠し文字を削除",
    cc_opt_punctuation: "句読点を正規化",
    cc_opt_accents: "ベトナム語のアクセントを削除",
    cc_opt_case: "大文字/小文字:",
    cc_case_none: "変更なし",
    cc_case_upper: "大文字",
    cc_case_lower: "小文字",
    cc_case_title: "タイトルケース",
    cc_input_label: "元のテキスト",
    cc_input_placeholder: "ここにテキストを貼り付けてください...",
    cc_output_label: "結果",
    cc_output_placeholder: "結果がここに表示されます...",
    cc_btn_clean: "🧹 クリーン",
    cc_btn_copy: "📋 結果をコピー",
    cc_btn_replace: "🔄 入力を置換",
    cc_btn_clear: "🗑 すべてクリア",
    cc_processing: "処理中...",
    cc_success: "クリーン完了！",
    cc_copied: "✅ クリップボードにコピーしました！",
    cc_error_empty: "テキストを入力してください",
    cc_stat_chars_removed: "削除された文字:",
    cc_stat_lines_before: "処理前の行数:",
    cc_stat_lines_after: "処理後の行数:",
    tool_clipboard: "クリップボードクリーナー",
    tool_clipboard_desc: "PDF、ウェブ、メール、Excelからコピーしたテキストを整形",

    // Image Converter (continued)
    image_quality_label: "品質:",
    image_convert_btn: "🔄 変換",
    image_convert_all_btn: "🔄 すべて変換",
    image_reset_btn: "↻ リセット",
    image_convert_success: "✅ 変換に成功しました!",
    image_download_btn: "⬇ ダウンロード",
    image_select_format: "形式を選択してください",
    toast_invalid_image: "サポートされていない画像形式です",

    // Password Generator
    pwd_gen_title: "パスワード生成",
    pwd_length_label: "文字数",
    pwd_length_hint: "最小8文字、最大64文字",
    pwd_uppercase: "大文字 (A-Z)",
    pwd_lowercase: "小文字 (a-z)",
    pwd_numbers: "数字 (0-9)",
    pwd_symbols: "特殊文字 (!@#$%)",
    pwd_required_label: "必須文字を含める（オプション）",
    pwd_required_placeholder: "例: abc123",
    pwd_required_hint: "特定の文字が必要ない場合は空白のままにしてください",
    pwd_generate_btn: "🔐 パスワード生成",
    pwd_strength_weak: "弱い",
    pwd_strength_fair: "普通",
    pwd_strength_good: "良い",
    pwd_strength_strong: "強い",
    pwd_strength_very_strong: "非常に強い",
    pwd_error_no_options: "少なくとも1つのオプションを選択してください（大文字、小文字、数字、または特殊文字）",
    pwd_error_min_length: "最小8文字が必須です",
    pwd_error_required_longer: "必須文字数がキャラクタ数より長くすることはできません",

    // PDF Page Number
    pn_title: "PDFページ番号",
    pn_desc: "各ページのフッターに自動的にページ番号を追加",
    pn_upload_hint: "PDFファイルをここにドラッグするか、クリックして選択",
    pn_options: "⚙️ オプション",
    pn_position: "位置",
    pn_pos_left: "左下",
    pn_pos_center: "中央下",
    pn_pos_right: "右下",
    pn_format: "フォーマット",
    pn_start_number: "開始番号",
    pn_font_size: "フォントサイズ",
    pn_margin: "下余白 (pt)",
    pn_color: "文字色",
    pn_preview: "プレビュー:",
    pn_btn_process: "📄 ページ番号を追加",
    pn_btn_download: "⬇ ダウンロード",
    pn_processing: "処理中...",
    pn_success: "ページ番号の追加が完了しました！",
    pn_result_info: "{total}ページに番号を追加しました",

    // Word Compare
    word_compare_title: "Word比較",
    word_compare_upload1: "ファイル1をアップロード (.docx)",
    word_compare_upload2: "ファイル2をアップロード (.docx)",
    word_compare_hint: "ファイルをドラッグするか、クリックして選択",
    word_compare_btn: "📊 比較",
    word_compare_removed: "削除されたコンテンツ",
    word_compare_added: "追加されたコンテンツ",
    word_compare_unchanged: "変更されていないコンテンツ",
    word_compare_space_diff: "スペースの違い (·)",
    compare_result_title: "比較結果",
    view_side_by_side: "サイドバイサイド",
    view_unified: "統合表示",
    reset_btn: "↻ リセット",
    processing: "処理中...",

    // Excel Compare
    excel_compare_title: "Excel比較",
    excel_compare_upload1: "ファイル1をアップロード (.xlsx)",
    excel_compare_upload2: "ファイル2をアップロード (.xlsx)",
    excel_compare_hint: "ファイルをドラッグするか、クリックして選択",
    excel_compare_btn: "📊 比較",
    excel_compare_removed: "削除されたロー",
    excel_compare_added: "追加されたロー",
    excel_compare_modified: "変更されたロー",
    excel_compare_unchanged: "変更されていないロー",
    view_summary: "サマリー",
    view_detailed: "詳細",
    btn_download: "⬇ ダウンロード",
    
    // PDF to Image
    pdf_to_image_title: "PDFを画像に変換",
    pdf_to_image_desc: "PDFをPNGまたはJPG画像に高品質で変換します",
    upload_pdf_to_image_hint: "PDFファイルをここにドラッグするか、クリックして選択",
    pdf_to_image_format: "画像フォーマット",
    pdf_to_image_quality: "画像品質",
    btn_pdf_to_image: "🖼️ 変換",
    pdf_to_image_success: "変換に成功しました！",
    pdf_to_image_images: "画像",

    // PDF to Excel
    pdf_to_excel_title: "PDFをExcelに変換",
    pdf_to_excel_desc: "PDF内の表をExcelファイルに出力してデータを簡単にコピー",
    pte_drag_drop: "📁 PDFファイルをドラッグ＆ドロップまたはクリックして選択",
    pte_max_size: "最大50MB",
    pte_scan_warning: "スキャンされたPDF（画像）は表を抽出できない場合があります。この機能はテキストベースの表を含むPDFで最適に動作します。",
    pte_preview_btn: "🔍 表をプレビュー",
    pte_download_btn: "📊 Excelダウンロード",
    pte_preview_title: "📋 検出された表のプレビュー",
    pte_success: "ダウンロード成功！",

    // Extract Images from PDF
    pei_title: "PDFから画像を抽出",
    pei_desc: "PDFファイル内のすべての画像を抽出する",
    pei_drag_drop: "📁 PDFファイルをドラッグするか、クリックして選択",
    pei_max_size: "最大50MB",
    pei_btn: "🖼️ 画像を抽出",
    pei_processing: "画像を抽出中...",
    pei_success: "{count}枚の画像を抽出しました！ダウンロード中...",
    pei_error_PDF_EMPTY: "PDFが空です。ページがありません",
    pei_error_NO_IMAGES: "PDFに画像が見つかりません",

    // Annotate PDF
    annotate_title: "PDF注釈",
    annotate_desc: "PDF上にテキスト、ハイライト、描画、署名、画像を追加",
    annotate_drag_drop: "PDFファイルをドラッグ＆ドロップまたはクリックして選択",
    annotate_max_size: "最大100MB",
    annotate_back: "戻る",
    annotate_text: "テキスト追加",
    annotate_highlight: "ハイライト",
    annotate_draw: "描画",
    annotate_sign: "署名",
    annotate_image: "画像",
    annotate_save: "PDF保存",
    annotate_font_size: "フォントサイズ:",
    annotate_color: "色:",
    annotate_opacity: "不透明度:",
    annotate_stroke_width: "線の太さ:",
    annotate_page: "ページ",
    annotate_sign_title: "署名を作成",
    annotate_sign_draw: "描画",
    annotate_sign_upload: "画像アップロード",
    annotate_sign_clear: "クリア",
    annotate_sign_apply: "適用",
    annotate_sign_empty: "署名を描画またはアップロードしてください",
    annotate_cancel: "キャンセル",
    annotate_no_changes: "保存する変更がありません",
    annotate_save_success: "PDF保存成功！",
    annotate_eraser: "消しゴム",
    annotate_eraser_size: "消しゴムサイズ:",
    annotate_eraser_hint: "オブジェクトをクリックして削除",
    annotate_shapes: "図形",
    annotate_rectangle: "四角形",
    annotate_ellipse: "楕円",
    annotate_line: "直線",
    annotate_arrow: "矢印",
    annotate_polygon: "多角形",
    annotate_polyline: "折れ線",
    annotate_stroke_color: "線色:",
    annotate_fill_color: "塗り:",
    annotate_no_fill: "塗りなし",
    annotate_line_style: "線種:",
    annotate_solid: "実線",
    annotate_dashed: "破線",
    annotate_dotted: "点線",
    annotate_sides: "辺数:",

    // Homepage - Extract Pages Card
    extract_pages_desc: "PDFから特定のページを抽出する（例：1,2,5-10）",

    // Footer
    footer_brand: "<strong>Việt Đinh - IT OVNC</strong> が開発 • 社内システム — 社員専用",
    footer_online: "オンライン",
    footer_total_visits: "総アクセス数",

    // 404 Error Page
    error_404_title: "ページが見つかりません",
    error_404_description: "申し訳ございません。お探しのページが存在しないか削除されています。URLを確認するか、ホームページに戻りください。",
    error_404_action: "← ホームへ戻る",
  }
};

// Expose global variables cho các scripts khác (như footer.js)
window.TRANSLATIONS = TRANSLATIONS;

// 現在の言語（localStorageから取得、デフォルトは"vi"）
let currentLang = localStorage.getItem("lang") || "vi";

// Debug: Log localStorage value
console.log("[i18n] localStorage.getItem('lang'):", localStorage.getItem("lang"));
console.log("[i18n] Initial currentLang:", currentLang);

// Expose currentLang directly to window
window.currentLang = currentLang;

// Function để lấy current language
window.getCurrentLang = function() {
  return currentLang;
};

// キーに基づいてテキストを取得する関数
function t(key) {
  const translation = TRANSLATIONS[currentLang][key] || key;
  return translation;
}

// 全DOM にタイムズ適用
// HTMLエレメントには data-i18n="key" 属性が必要
// 例: <button data-i18n="btn_split">TÁCH PDF</button>
function applyLang() {
  console.log("[i18n] applyLang() called with currentLang:", currentLang);
  console.log("[i18n] TRANSLATIONS[currentLang] exists:", !!TRANSLATIONS[currentLang]);
  
  // Text content
  const dataI18nElements = document.querySelectorAll("[data-i18n]");
  console.log("[i18n] Elements with data-i18n:", dataI18nElements.length);
  
  dataI18nElements.forEach(el => {
    const key = el.getAttribute("data-i18n");
    const translation = t(key);
    el.textContent = translation;
    console.log("[i18n] Translated:", key, "=>", translation);
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
  
  // Gọi updateFooter nếu footer.js đã load
  if (typeof window.updateFooter === 'function') {
    window.updateFooter();
  }
}

// 言語の切り替え（言語切り替えボタンに割り当て）
function toggleLang() {
  currentLang = currentLang === "vi" ? "ja" : "vi";
  window.currentLang = currentLang; // Update window.currentLang
  localStorage.setItem("lang", currentLang);
  applyLang();
}

// Set language (mới - sử dụng cho các button VN/JP)
function setLang(lang) {
  console.log("[i18n] setLang() called with:", lang);
  if (lang !== "vi" && lang !== "ja") {
    console.log("[i18n] Invalid language:", lang);
    return;
  }
  currentLang = lang;
  window.currentLang = currentLang;
  console.log("[i18n] Before localStorage.setItem - localStorage.getItem('lang'):", localStorage.getItem("lang"));
  localStorage.setItem("lang", currentLang);
  console.log("[i18n] After localStorage.setItem - localStorage.getItem('lang'):", localStorage.getItem("lang"));
  applyLang();
  updateLangButtons();
}

// Update language button states
function updateLangButtons() {
  // Delay để chắc chắn DOM fully rendered
  setTimeout(function() {
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.classList.remove("active");
    });
    
    const activeBtn = document.querySelector(".lang-btn-" + currentLang);
    if (activeBtn) {
      activeBtn.classList.add("active");
    }
    
    console.log("[i18n] Button updated for lang:", currentLang);
  }, 100);
}

// ページロード完了時に実行
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() {
    applyLang();
    // Không gọi updateLangButtons() lần load đầu vì HTML đã có active class
    // Chi gọi khi user click buttons (inside setLang function)
  });
} else {
  applyLang();
  // Không gọi updateLangButtons() lần load đầu vì HTML đã có active class
}

// Debug: kiểm tra xem bản dịch có được load đúng không
console.log("[i18n] Current language:", currentLang);
console.log("[i18n] Available keys in VI:", Object.keys(TRANSLATIONS.vi));
console.log("[i18n] word_compare_title VI:", TRANSLATIONS.vi.word_compare_title);
console.log("[i18n] word_compare_upload1 VI:", TRANSLATIONS.vi.word_compare_upload1);
