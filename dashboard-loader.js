// /Tui/dashboard-loader.js
// ============================================================
// TỰ ĐỘNG LOAD DASHBOARD HTML VÀO TRANG
// ============================================================

(function() {
    'use strict';
    
    // Kiểm tra xem dashboard đã được load chưa
    if (document.getElementById('dashboard-container')) {
        console.log('Dashboard đã được load!');
        return;
    }

    // Tạo container cho dashboard
    const container = document.createElement('div');
    container.id = 'dashboard-container';
    document.body.appendChild(container);

    // Load dashboard.html
    fetch('/Tui/dashboard.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Không thể tải dashboard.html: ' + response.status);
            }
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            console.log('Dashboard loaded successfully!');
            
            // Thêm event listener cho modal sau khi load xong
            const modal = document.getElementById('dashboardModal');
            if (modal) {
                modal.addEventListener('click', function(e) {
                    if (e.target === this) closeDashboard();
                });
            }
            
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('dashboardModal');
                    if (modal && modal.classList.contains('active')) {
                        closeDashboard();
                    }
                }
            });
        })
        .catch(error => {
            console.error('Lỗi load dashboard:', error);
            container.innerHTML = `
                <div style="display:none;"></div>
            `;
        });
})();