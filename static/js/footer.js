// Footer Visitor Stats Handler
(function() {
    const FOOTER_ID = "appFooter";
    
    // Tạo footer HTML - Trực tiếp access TRANSLATIONS từ i18n.js
    function createFooter() {
        // Lấy ngôn ngữ hiện tại từ window scope (set bởi i18n.js)
        const lang = window.currentLang || localStorage.getItem("lang") || "vi";
        const trans = window.TRANSLATIONS && window.TRANSLATIONS[lang] ? window.TRANSLATIONS[lang] : {};
        
        // Debug log
        console.log('[footer] Current lang:', lang);
        console.log('[footer] Translations object:', window.TRANSLATIONS);
        console.log('[footer] Footer brand (trans):', trans.footer_brand);
        
        // Lấy text từ TRANSLATIONS hoặc dùng fallback Việt
        const fallbackBrand = "Được phát triển bởi <strong>Việt Đinh - IT OVNC</strong> • Hệ thống nội bộ — Chỉ dành cho nhân viên công ty";
        const fallbackOnline = "Online";
        const fallbackVisits = "Tổng truy cập";
        
        const brandText = trans.footer_brand || fallbackBrand;
        const onlineLabel = trans.footer_online || fallbackOnline;
        const totalVisitsLabel = trans.footer_total_visits || fallbackVisits;
        
        console.log('[footer] Using brandText:', brandText);
        
        const footerHTML = `
            <footer class="app-footer">
                <div class="footer-container">
                    <div class="footer-brand">
                        <p>${brandText}</p>
                    </div>
                    <div class="footer-stats">
                        <span class="stat-item">👥 ${onlineLabel}: <strong id="currentVisitors">-</strong></span>
                        <span class="stat-separator">|</span>
                        <span class="stat-item">📊 ${totalVisitsLabel}: <strong id="totalVisits">-</strong></span>
                    </div>
                </div>
            </footer>
        `;
        return footerHTML;
    }
    
    // Thêm CSS cho footer
    function addFooterStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .app-footer {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 0.8rem 1.5rem;
                text-align: center;
                border-top: 2px solid #667eea;
                font-size: 0.85rem;
                margin-top: 2rem;
            }
            
            .footer-container {
                max-width: 1400px;
                margin: 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: nowrap;
                gap: 1.5rem;
            }
            
            .footer-brand p {
                margin: 0;
                font-weight: 500;
                font-size: 0.85rem;
                display: inline;
            }
            
            .footer-brand strong {
                color: #ffd700;
                font-weight: 600;
            }
            
            .footer-stats {
                display: flex;
                align-items: center;
                gap: 0.8rem;
                white-space: nowrap;
            }
            
            .stat-item {
                display: flex;
                align-items: center;
                gap: 0.3rem;
                font-size: 0.85rem;
            }
            
            .stat-item strong {
                color: #ffd700;
                font-weight: 600;
                min-width: 2rem;
            }
            
            .stat-separator {
                opacity: 0.7;
            }
            
            @media (max-width: 920px) {
                .footer-container {
                    flex-direction: column;
                    gap: 0.8rem;
                }
                
                .footer-brand p:first-child {
                    display: block;
                    margin-bottom: 0.3rem;
                }
                
                .footer-stats {
                    flex-direction: row;
                }
                
                .stat-separator {
                    display: inline;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Fetch visitor stats từ API
    async function loadVisitorStats() {
        try {
            const response = await fetch('/api/visitor-stats');
            if (!response.ok) throw new Error('Failed to fetch stats');
            
            const data = await response.json();
            
            const currentVisitorsEl = document.getElementById('currentVisitors');
            const totalVisitsEl = document.getElementById('totalVisits');
            
            if (currentVisitorsEl) {
                currentVisitorsEl.textContent = data.current_visitors || 0;
            }
            if (totalVisitsEl) {
                totalVisitsEl.textContent = data.total_visits || 0;
            }
        } catch (error) {
            console.error('Error loading visitor stats:', error);
        }
    }
    
    // Initialize footer
    function init() {
        addFooterStyles();
        
        // Tìm hoặc tạo footer container
        let footerContainer = document.getElementById(FOOTER_ID);
        if (!footerContainer) {
            footerContainer = document.createElement('div');
            footerContainer.id = FOOTER_ID;
            document.body.appendChild(footerContainer);
        }
        
        footerContainer.innerHTML = createFooter();
        
        // Load stats ngay và cập nhật mỗi 10 giây
        loadVisitorStats();
        setInterval(loadVisitorStats, 10000);
    }
    
    // Lắng nghe sự thay đổi ngôn ngữ (attach OUTSIDE init để chắc chắn được attach ngay)
    document.addEventListener('languageChanged', function() {
        const footerContainer = document.getElementById(FOOTER_ID);
        if (footerContainer) {
            footerContainer.innerHTML = createFooter();
            // Reload stats khi đổi ngôn ngữ
            loadVisitorStats();
        }
    });
    
    // Export updateFooter function để i18n.js có thể gọi
    window.updateFooter = function() {
        const footerContainer = document.getElementById(FOOTER_ID);
        if (footerContainer) {
            footerContainer.innerHTML = createFooter();
            loadVisitorStats();
        }
    };
    
    // Đợi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
