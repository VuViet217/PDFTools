// ═════════════════════════════════════════════════════════════════════════════
// header.js - Global Header Component
// ═════════════════════════════════════════════════════════════════════════════

console.log("[header] header.js loaded");

// Hàm chính tạo header
function createHeader() {
  console.log("[header] createHeader() called");
  
  // Xoá navbar cũ (các trang con)
  const oldNavbar = document.querySelector('nav.navbar');
  if (oldNavbar) {
    console.log("[header] Removing old navbar");
    oldNavbar.style.display = 'none';
    oldNavbar.remove();
  }

  // Kiểm tra header đã tồn tại chưa
  if (document.querySelector('header.app-header')) {
    console.log("[header] Header already exists, skipping creation");
    return;
  }

  const headerHTML = `
    <header class="app-header">
      <div class="header-container">
        <!-- Logo -->
        <div class="header-logo">
          <a href="/" class="logo-link">
            <span class="logo-icon">📊</span>
            <span class="logo-text">OVNC Tools</span>
          </a>
        </div>

        <!-- Navigation Menu -->
        <nav class="header-nav">
          <div class="nav-item dropdown">
            <span class="nav-link" data-i18n="tool_pdf">PDF Tools</span>
            <div class="dropdown-menu">
              <a href="/split-merge" class="dropdown-item" data-i18n="nav_split_merge">Tách / Nối PDF</a>
              <a href="/extract-pages" class="dropdown-item" data-i18n="nav_extract_pages">Tách Trang Cụ Thể</a>
              <a href="/editor" class="dropdown-item" data-i18n="nav_editor">Chỉnh sửa PDF</a>
              <a href="/compress" class="dropdown-item" data-i18n="nav_compress">Nén PDF</a>
              <a href="/security" class="dropdown-item" data-i18n="nav_security">Bảo mật</a>
              <a href="/pdf-to-image" class="dropdown-item" data-i18n="pdf_to_image_title">Chuyển đổi PDF sang Ảnh</a>
              <a href="/pdf-to-excel" class="dropdown-item" data-i18n="pdf_to_excel_title">PDF sang Excel</a>
              <a href="/annotate" class="dropdown-item" data-i18n="annotate_title">Annotate PDF</a>
              <a href="/extract-images" class="dropdown-item" data-i18n="pei_title">Xuất hình ảnh từ PDF</a>
            </div>
          </div>

          <a href="/image-converter" class="nav-link" data-i18n="tool_image">Chuyển đổi ảnh</a>

          <a href="/password-generator" class="nav-link" data-i18n="tool_password">Tạo Mật Khẩu</a>

          <a href="/word-compare" class="nav-link" data-i18n="tool_word_compare">So Sánh Word</a>

          <a href="/excel-compare" class="nav-link" data-i18n="tool_excel_compare">So Sánh Excel</a>
        </nav>

        <!-- Language Selector with Flags -->
        <div class="header-language">
          <button class="lang-btn lang-btn-vi active" onclick="setLang('vi')" title="Tiếng Việt">🇻🇳</button>
          <button class="lang-btn lang-btn-ja" onclick="setLang('ja')" title="日本語">🇯🇵</button>
        </div>
      </div>
    </header>
  `;

  // Insert header at the beginning of body
  try {
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
    console.log("[header] Header HTML injected successfully");
    
    // Gọi applyLangToHeader sau khi HTML được thêm vào
    setTimeout(function() {
      if (typeof applyLangToHeader === 'function') {
        applyLangToHeader();
      } else {
        console.warn("[header] applyLangToHeader function not found");
      }
      setupDropdownMenu();
    }, 50);
  } catch (e) {
    console.error("[header] Error injecting header:", e);
  }
}

// Apply language translations to header
function applyLangToHeader() {
  console.log("[header] applyLangToHeader() called");
  
  if (typeof t !== 'function') {
    console.warn("[header] t() function not available yet, will retry");
    setTimeout(applyLangToHeader, 50);
    return;
  }
  
  const headerElements = document.querySelectorAll('header.app-header [data-i18n]');
  console.log("[header] Found", headerElements.length, "elements to translate");
  
  headerElements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    try {
      const translation = t(key);
      el.textContent = translation;
      console.log("[header] Translated:", key, "=>", translation);
    } catch (e) {
      console.warn("[header] Translation error for key:", key, e);
    }
  });
}

// Listen for language changes
document.addEventListener('languageChanged', function(e) {
  console.log("[header] Language changed event received, lang:", e.detail?.lang);
  applyLangToHeader();
});

// Setup dropdown menu interactions
function setupDropdownMenu() {
  console.log("[header] Setting up dropdown menu");
  
  const dropdowns = document.querySelectorAll('header.app-header .dropdown');
  console.log("[header] Found", dropdowns.length, "dropdown elements");
  
  dropdowns.forEach(dropdown => {
    let closeTimer;
    
    dropdown.addEventListener('mouseenter', function() {
      const menu = this.querySelector('.dropdown-menu');
      if (menu) {
        clearTimeout(closeTimer);
        menu.style.display = 'block';
        console.log("[header] Dropdown opened");
      }
    });
    
    dropdown.addEventListener('mouseleave', function() {
      const menu = this.querySelector('.dropdown-menu');
      if (menu) {
        closeTimer = setTimeout(() => {
          menu.style.display = 'none';
          console.log("[header] Dropdown closed");
        }, 200);
      }
    });
    
    // Giữ menu mở khi chuột ở trong menu
    const menu = dropdown.querySelector('.dropdown-menu');
    if (menu) {
      menu.addEventListener('mouseenter', function() {
        clearTimeout(closeTimer);
      });
      
      menu.addEventListener('mouseleave', function() {
        closeTimer = setTimeout(() => {
          menu.style.display = 'none';
          console.log("[header] Dropdown closed");
        }, 200);
      });
    }
  });

  // Mobile menu
  const navLinks = document.querySelectorAll('header.app-header .dropdown .nav-link');
  navLinks.forEach(item => {
    item.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        const menu = this.nextElementSibling;
        if (menu) {
          menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        }
      }
    });
  });
}

// Hàm khởi tạo chính
function initializeHeader() {
  console.log("[header] initializeHeader() called, document.readyState:", document.readyState);
  
  // Đợi body có sẵn
  if (!document.body) {
    console.log("[header] Body not ready, waiting...");
    setTimeout(initializeHeader, 50);
    return;
  }
  
  // Đợi i18n.js sẵn sàng (kiểm tra window.TRANSLATIONS)
  if (typeof window.TRANSLATIONS === 'undefined') {
    console.log("[header] Waiting for i18n.js to load...");
    setTimeout(initializeHeader, 50);
    return;
  }
  
  console.log("[header] Ready to create header");
  createHeader();
}

// Khởi tạo header ngay lập tức nếu có thể
if (document.body) {
  initializeHeader();
} else {
  // Hoặc đợi DOMContentLoaded
  document.addEventListener('DOMContentLoaded', initializeHeader);
}

// Cũng thử sau một chút delay để đảm bảo tất cả script đã load
setTimeout(initializeHeader, 100);


