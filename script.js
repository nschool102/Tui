// =========================================================================
// CẤU HÌNH APP
// =========================================================================
const CONFIG = {
    googleSheetId: '19Tsmkh53nPAqhTYy2DU5dSfYXJRAwyc9VI0VaeM3LMw',
    apiEndpoint: 'https://script.google.com/macros/s/AKfycbxC72RzXFo9yG8iP9FRgyjY7sYhH_ffHxR1qkK0u5GbwFnmODsZ0E2_M_Hl38328S3T/exec'
};

const CATEGORIES = {
    thu: {
        "Lương": ["Lương tháng", "Bổ sung lương", "Ứng lương", "Trực lễ tết", "Công tác phí", "Hoàn thuế"],
        "Thưởng": ["Bất thường", "Bổ sung thưởng", "Thưởng lễ tết", "Thưởng năm", "Thưởng quí"],
        "Phụ cấp": ["Mĩ phẩm", "Vệ sinh viên"],
        "Phúc lợi": ["HSG", "Phụ nữ", "Sinh nhật", "Thiếu nhi"],
        "Thu khác": ["Bảo hiểm refund"],
        "Bất thường": ["Tặng cho", "Trúng số"],
        "CON CỢP": ["Lương tháng", "Bổ sung lương", "Bổ sung thưởng"]
    },
    chi: {
        "Chi khác": ["Từ thiện", "Biếu tặng", "Dịch vụ công"],
        "Chi tiêu thiết yếu": ["Đi chợ, siêu thị", "Điện", "Nước", "Internet", "Xăng", "Tiền tiêu vặt", "Điện thoại", "Transportation"],
        "Đầu tư, tiết kiệm": ["Vàng", "Tiền mặt", "USDT", "Cho mượn"],
        "Giải trí": ["Cafe", "Coi phim", "Du lịch", "Nhà hàng"],
        "Giáo dục": ["Học phí", "Học thêm", "Quĩ lớp", "Lệ phí"],
        "Mua sắm": ["Đồ ăn, thức uống", "Đồ chơi", "Đồ gia dụng", "Mĩ phẩm", "Phụ kiện", "Quần áo", "Sách, Văn phòng phẩm", "Thực phẩm chức năng"],
        "Y tế": ["Khám, chữa bệnh", "Thuốc"]
    }
};

const PALETTE = ["#4CAF50", "#8BC34A", "#2196F3", "#E91E63", "#9C27B0", "#F44336", "#FF9800", "#FFEB3B"];

const DEFAULT_THEME_COLOR = "#FFC107";
const DEFAULT_DARK_MODE = true;

let db;
let charts = {};
let localFamilyData = [];
let localReminderData = [];
let isSyncing = false;
let notificationCheckInterval = null;

// =========================================================================
// THÔNG BÁO ĐẨY (PUSH NOTIFICATION)
// =========================================================================
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("Trình duyệt không hỗ trợ Notification");
        return;
    }
    
    if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Đã được cấp quyền thông báo");
                registerServiceWorker();
            } else {
                console.log("Từ chối quyền thông báo");
            }
        });
    } else if (Notification.permission === "granted") {
        registerServiceWorker();
    }
} // end function requestNotificationPermission

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('Service Worker đăng ký thành công:', reg);
            })
            .catch(err => {
                console.log('Lỗi đăng ký Service Worker:', err);
            });
    }
} // end function registerServiceWorker

function triggerPushNotification(title, body) {
    if (!("Notification" in window)) {
        console.log("Trình duyệt không hỗ trợ Notification");
        return;
    }
    
    if (Notification.permission === "granted") {
        try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SHOW_NOTIFICATION',
                    title: title,
                    body: body,
                    icon: 'icon-192.png'
                });
            } else {
                new Notification(title, {
                    body: body,
                    icon: 'icon-192.png',
                    vibrate: [200, 100, 200]
                });
            }
        } catch(e) {
            console.log("Lỗi gửi thông báo:", e);
            try {
                new Notification(title, { body: body });
            } catch(e2) {
                console.log("Không thể gửi thông báo:", e2);
            }
        }
    } else {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                triggerPushNotification(title, body);
            }
        });
    }
} // end function triggerPushNotification
// end THÔNG BÁO ĐẨY

// =========================================================================
// THÔNG TIN ỨNG DỤNG - TỰ ĐỘNG CẬP NHẬT
// =========================================================================
async function loadAppInfoFromManifest() {
    try {
        const response = await fetch('/manifest.json');
        const manifest = await response.json();
        return {
            version: manifest.version || '1.0.0',
            name: manifest.name || 'TÔI - Quản lý tài chính',
            shortName: manifest.short_name || 'TÔI'
        };
    } catch (error) {
        console.log('Không thể tải manifest.json:', error);
        return {
            version: '1.0.0',
            name: 'TÔI - Quản lý tài chính',
            shortName: 'TÔI'
        };
    }
} // end function loadAppInfoFromManifest

function getBuildTime() {
    const scripts = document.getElementsByTagName('script');
    let buildTime = new Date();
    for (let script of scripts) {
        if (script.src && script.src.includes('script.js')) {
            const urlParams = new URLSearchParams(script.src.split('?')[1] || '');
            const timestamp = urlParams.get('v');
            if (timestamp) {
                buildTime = new Date(parseInt(timestamp));
            } else {
                buildTime = new Date();
            }
            break;
        }
    }
    return buildTime;
} // end function getBuildTime

function formatBuildTime(date) {
    if (!date || isNaN(date.getTime())) {
        return '--/--/---- --:--:--';
    }
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
} // end function formatBuildTime

let APP_CONFIG = {
    version: '1.0.0',
    name: 'TÔI - Quản lý tài chính',
    shortName: 'TÔI',
    buildDate: formatBuildTime(new Date())
};

async function initAppConfig() {
    const manifestInfo = await loadAppInfoFromManifest();
    APP_CONFIG.version = manifestInfo.version;
    APP_CONFIG.name = manifestInfo.name;
    APP_CONFIG.shortName = manifestInfo.shortName;
    const buildTime = getBuildTime();
    APP_CONFIG.buildDate = formatBuildTime(buildTime);
    updateAppInfo();
    console.log('✅ App config initialized:', APP_CONFIG);
} // end function initAppConfig

function openAppInfoModal() {
    const modal = document.getElementById('appInfoModal');
    if (modal) {
        modal.style.display = 'flex';
        updateAppInfo();
    }
} // end function openAppInfoModal

function closeAppInfoModal() {
    const modal = document.getElementById('appInfoModal');
    if (modal) {
        modal.style.display = 'none';
    }
} // end function closeAppInfoModal

function updateAppInfo() {
    const versionEl = document.getElementById('app-version');
    const buildDateEl = document.getElementById('app-build-date');
    const lastSyncEl = document.getElementById('app-last-sync');
    const totalTxEl = document.getElementById('app-total-transactions');
    const totalRemEl = document.getElementById('app-total-reminders');
    const totalFamilyEl = document.getElementById('app-total-family');
    const versionMiniEl = document.getElementById('app-version-mini');
    
    if (versionEl) versionEl.textContent = APP_CONFIG.version;
    if (versionMiniEl) versionMiniEl.textContent = APP_CONFIG.version;
    if (buildDateEl) buildDateEl.textContent = APP_CONFIG.buildDate;
    
    if (lastSyncEl) {
        const lastSyncTime = localStorage.getItem('lastSyncTime');
        if (lastSyncTime) {
            lastSyncEl.textContent = lastSyncTime;
        } else {
            lastSyncEl.textContent = 'Chưa đồng bộ';
        }
    }
    
    if (db && totalTxEl) {
        const tx = db.transaction('transactions', 'readonly');
        const store = tx.objectStore('transactions');
        const countRequest = store.count();
        countRequest.onsuccess = function(e) {
            totalTxEl.textContent = e.target.result || 0;
        };
        countRequest.onerror = function() {
            totalTxEl.textContent = '0';
        };
    }
    
    if (db && totalRemEl) {
        const tx = db.transaction('reminders', 'readonly');
        const store = tx.objectStore('reminders');
        const countRequest = store.count();
        countRequest.onsuccess = function(e) {
            totalRemEl.textContent = e.target.result || 0;
        };
        countRequest.onerror = function() {
            totalRemEl.textContent = '0';
        };
    }
    
    if (totalFamilyEl) {
        totalFamilyEl.textContent = localFamilyData ? localFamilyData.length : 0;
    }
} // end function updateAppInfo

function updateLastSyncTime() {
    const now = new Date();
    const timeString = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    localStorage.setItem('lastSyncTime', timeString);
    const lastSyncEl = document.getElementById('app-last-sync');
    if (lastSyncEl) {
        lastSyncEl.textContent = timeString;
    }
} // end function updateLastSyncTime
// end THÔNG TIN ỨNG DỤNG

// =========================================================================
// HÀM CHUYỂN ĐỔI SENTENCE CASE
// =========================================================================
function toSentenceCase(str) {
    if (!str || typeof str !== 'string') return str || '';
    if (str.trim() === '') return str;
    if (str === str.toUpperCase()) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
} // end function toSentenceCase

// =========================================================================
// KHỞI TẠO INDEXEDDB
// =========================================================================
function initDB() {
    const request = indexedDB.open("FamilyFinancePWA", 4);
    request.onupgradeneeded = function(e) {
        db = e.target.result;
        if (!db.objectStoreNames.contains("transactions")) {
            db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("settings")) {
            db.createObjectStore("settings", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("reminders")) {
            db.createObjectStore("reminders", { keyPath: "id", autoIncrement: true });
        }
    };
    request.onsuccess = function(e) {
        db = e.target.result;
        cleanupCorruptedReminders(() => {
            loadInitialSettings();
            requestNotificationPermission();
            startDailyReminderCheck();
        });
    };
    request.onerror = function(e) {
        console.error("Lỗi mở IndexedDB:", e.target.error);
    };
} // end function initDB
// end KHỞI TẠO INDEXEDDB

// =========================================================================
// KHỞI TẠO DOM EVENTS
// =========================================================================
function setupEventListeners() {
    // Navigation tabs
    document.getElementById("main-nav-tabs").addEventListener("click", function(e) {
        const btn = e.target.closest(".tab-btn");
        if (btn) {
            const tabName = btn.getAttribute("data-tab");
            switchTab(tabName);
        }
    });

    // Chi/Thu subtype update
    document.getElementById("chi-type").addEventListener("change", () => updateSubtypes('chi'));
    document.getElementById("thu-type").addEventListener("change", () => updateSubtypes('thu'));

    // Form submit
    document.getElementById("form-chi").addEventListener("submit", (e) => saveTransaction(e, 'chi'));
    document.getElementById("form-thu").addEventListener("submit", (e) => saveTransaction(e, 'thu'));
    document.getElementById("form-nhachen").addEventListener("submit", (e) => saveReminder(e));

    // Currency formatting
    document.getElementById("chi-amount").addEventListener("input", (e) => formatCurrency(e.target));
    document.getElementById("thu-amount").addEventListener("input", (e) => formatCurrency(e.target));

    // Filters
    document.getElementById("chi-top-period").addEventListener("change", () => renderTopExpenses());
    document.getElementById("sec4-period").addEventListener("change", () => renderSection4());

    // Reminder frequency
    document.getElementById("rem-frequency").addEventListener("change", toggleCustomReminderFields);

    // Family
    document.getElementById("btn-verify-family").addEventListener("click", verifyFamilyAuth);

    // Dark mode toggle
    document.getElementById("darkModeToggle").addEventListener("change", (e) => toggleDarkMode(e.target.checked));

    // Theme color
    document.getElementById("setting-color").addEventListener("change", applyTheme);

    // Sync button
    document.getElementById("btn-sync-data").addEventListener("click", syncAllDataFromSheet);

    // Reset app
    document.getElementById("btn-reset-app").addEventListener("click", resetAppCompletely);

    // Scroll to top
    document.getElementById("scrollTopBtn").addEventListener("click", scrollToTop);

    // ============================================================
    // FAMILY MODAL - ĐÓNG BẰNG NÚT X, CLICK OUTSIDE, ESC
    // ============================================================
    const btnCloseFamily = document.getElementById("btn-close-modal-family");
    if (btnCloseFamily) {
        btnCloseFamily.addEventListener("click", closeModal);
    }

    const familyModal = document.getElementById("familyModal");
    if (familyModal) {
        familyModal.addEventListener("click", function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }

    // ============================================================
    // APP INFO MODAL - MỞ, ĐÓNG, LÀM MỚI
    // ============================================================
    const btnAppInfo = document.getElementById("btn-app-info");
    if (btnAppInfo) {
        btnAppInfo.addEventListener("click", openAppInfoModal);
    }

    const btnCloseAppInfo = document.getElementById("btn-close-app-info");
    if (btnCloseAppInfo) {
        btnCloseAppInfo.addEventListener("click", closeAppInfoModal);
    }

    const appInfoModal = document.getElementById("appInfoModal");
    if (appInfoModal) {
        appInfoModal.addEventListener("click", function(e) {
            if (e.target === this) {
                closeAppInfoModal();
            }
        });
    }

    const btnRefreshAppInfo = document.getElementById("btn-refresh-app-info");
    if (btnRefreshAppInfo) {
        btnRefreshAppInfo.addEventListener("click", function() {
            updateAppInfo();
            this.textContent = "✅ Đã làm mới!";
            setTimeout(() => {
                this.textContent = "🔄 Làm mới";
            }, 1500);
        });
    }

    // ============================================================
    // ĐÓNG MODAL BẰNG PHÍM ESC
    // ============================================================
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            const familyModal = document.getElementById("familyModal");
            if (familyModal && familyModal.style.display === "flex") {
                closeModal();
            }
            const appInfoModal = document.getElementById("appInfoModal");
            if (appInfoModal && appInfoModal.style.display === "flex") {
                closeAppInfoModal();
            }
        }
    });
} // end function setupEventListeners
// end KHỞI TẠO DOM EVENTS

// =========================================================================
// ĐIỀU HƯỚNG TABS
// =========================================================================
function switchTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add("active");

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    if (tabName === 'chi' || tabName === 'thongke') {
        renderChartsAndStats();
    }
    if (tabName === 'family') {
        checkFamilyTabAccess();
    }
    if (tabName === 'nhachen') {
        generateRemindersInterface();
    }
} // end function switchTab
// end ĐIỀU HƯỚNG TABS

// =========================================================================
// HÀM TIỆN ÍCH
// =========================================================================
function formatCurrency(input) {
    let value = input.value.replace(/[^0-9.]/g, "");
    let parts = value.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    input.value = parts.join(".");
} // end function formatCurrency

function parseCurrency(str) {
    return str ? parseFloat(str.replace(/,/g, "")) : 0;
} // end function parseCurrency

function formatVND(num) {
    return num.toLocaleString('en-US') + " đ";
} // end function formatVND

function updateSubtypes(mode) {
    const typeSelect = document.getElementById(`${mode}-type`);
    const subtypeSelect = document.getElementById(`${mode}-subtype`);
    if (!typeSelect || !subtypeSelect) return;

    const selectedType = typeSelect.value;
    subtypeSelect.innerHTML = "";

    if (CATEGORIES[mode] && CATEGORIES[mode][selectedType]) {
        CATEGORIES[mode][selectedType].forEach(sub => {
            let opt = document.createElement("option");
            opt.value = sub;
            opt.textContent = sub;
            subtypeSelect.appendChild(opt);
        });
    }
} // end function updateSubtypes

function initFormOptions() {
    ['chi', 'thu'].forEach(mode => {
        const typeSelect = document.getElementById(`${mode}-type`);
        if (!typeSelect) return;

        typeSelect.innerHTML = "";
        Object.keys(CATEGORIES[mode]).forEach(type => {
            let opt = document.createElement("option");
            opt.value = type;
            opt.textContent = type;
            typeSelect.appendChild(opt);
        });
        updateSubtypes(mode);

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const dateInput = document.getElementById(`${mode}-date`);
        if (dateInput) dateInput.value = now.toISOString().slice(0, 16);
    });
    initReminderDateOptions();
    initColorSettings();
} // end function initFormOptions

function initColorSettings() {
    const sColor = document.getElementById("setting-color");
    if (!sColor) return;
    
    // Clear existing options
    sColor.innerHTML = "";
    
    const textNames = ["Xanh Lá", "Xanh Bơ", "Xanh Dương", "Hồng", "Tím", "Đỏ", "Cam", "Vàng"];
    PALETTE.forEach((hex, i) => {
        let opt = document.createElement("option");
        opt.value = hex;
        opt.textContent = textNames[i];
        // Thêm style màu cho option
        opt.style.backgroundColor = hex;
        opt.style.color = '#fff';
        opt.style.padding = '4px';
        sColor.appendChild(opt);
    });
    
    // Set default value
    const savedColor = localStorage.getItem('themeColor') || DEFAULT_THEME_COLOR;
    sColor.value = savedColor;
} // end function initColorSettings
// end HÀM TIỆN ÍCH

// =========================================================================
// XỬ LÝ GIAO DỊCH (TRANSACTIONS)
// =========================================================================
function saveTransaction(event, mode) {
    event.preventDefault();

    const type = document.getElementById(`${mode}-type`).value;
    const subtype = document.getElementById(`${mode}-subtype`).value;
    let amount = parseCurrency(document.getElementById(`${mode}-amount`).value);
    const dateVal = document.getElementById(`${mode}-date`).value;
    const note = document.getElementById(`${mode}-note`).value;

    if (mode === 'chi') amount = -Math.abs(amount);
    if (mode === 'thu') amount = Math.abs(amount);

    const formattedNote = toSentenceCase(note);

    const transaction = {
        timestamp: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
        type: type,
        subtype: subtype,
        amount: amount,
        note: formattedNote,
        synced: 0
    };

    const tx = db.transaction("transactions", "readwrite");
    tx.objectStore("transactions").add(transaction);
    tx.oncomplete = function() {
        alert("Đã lưu giao dịch cục bộ!");
        document.getElementById(`form-${mode}`).reset();
        initFormOptions();
        renderChartsAndStats();
        syncToGoogleSheets();
    };
    tx.onerror = function(e) {
        alert("Lỗi lưu giao dịch: " + e.target.error);
    };
} // end function saveTransaction

function getAllTransactions(callback) {
    if (!db) {
        callback([]);
        return;
    }
    const tx = db.transaction("transactions", "readonly");
    const store = tx.objectStore("transactions");
    const request = store.getAll();
    request.onsuccess = function(e) {
        callback(e.target.result || []);
    };
    request.onerror = function(e) {
        console.error("Lỗi đọc transactions:", e.target.error);
        callback([]);
    };
} // end function getAllTransactions

function syncToGoogleSheets() {
    if (!navigator.onLine || isSyncing || !CONFIG.apiEndpoint) return;

    getAllTransactions(transactions => {
        const unsynced = transactions.filter(t => t.synced === 0);
        if (unsynced.length === 0) return;

        isSyncing = true;
        fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'syncTransactions',
                data: unsynced.map(t => ({
                    timestamp: t.timestamp,
                    type: t.type,
                    subtype: t.subtype,
                    amount: t.amount,
                    note: t.note
                }))
            })
        })
        .then(res => res.json())
        .then(resData => {
            if (resData.status === "success") {
                const tx = db.transaction("transactions", "readwrite");
                const store = tx.objectStore("transactions");
                unsynced.forEach(t => {
                    t.synced = 1;
                    store.put(t);
                });
                renderChartsAndStats();
            }
            isSyncing = false;
        })
        .catch(() => {
            isSyncing = false;
        });
    });
} // end function syncToGoogleSheets
// end XỬ LÝ GIAO DỊCH (TRANSACTIONS)

// =========================================================================
// ĐỒ THỊ & THỐNG KÊ (Rút gọn - giữ nguyên logic cũ)
// =========================================================================
function renderPieChart(canvasId, labels, dataset, customColors = null) {
    if (charts[canvasId]) {
        charts[canvasId].destroy();
        delete charts[canvasId];
    }

    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl) return;

    const ctx = canvasEl.getContext('2d');
    let total = dataset.reduce((a, b) => a + Math.abs(b), 0);
    let defaultColors = ['#4CAF50', '#F44336', '#FF9800', '#2196F3', '#9C27B0', '#E91E63'];
    let colors = customColors || defaultColors;

    charts[canvasId] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: dataset,
                backgroundColor: colors
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 13, weight: 'bold' },
                        padding: 12
                    }
                },
                datalabels: {
                    color: function(ctx) {
                        let c = ctx.dataset.backgroundColor[ctx.dataIndex];
                        return (c === '#FFEB3B' || c === '#8BC34A') ? '#111111' : '#ffffff';
                    },
                    font: { weight: 'bold', size: 12 },
                    anchor: 'center',
                    align: 'center',
                    formatter: function(value) {
                        if (total > 0 && (Math.abs(value) / total * 100) > 3) {
                            return (Math.abs(value) / total * 100).toFixed(1) + "%";
                        }
                        return '';
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ctx.label + ": " + Math.abs(ctx.raw).toLocaleString() +
                                   " (" + (total > 0 ? (Math.abs(ctx.raw) / total * 100).toFixed(1) + "%" : "0%") + ")";
                        }
                    }
                }
            }
        }
    });
} // end function renderPieChart

// Các hàm renderChartsAndStats, renderTopExpenses, renderSection4 giữ nguyên
// (đã có trong code gốc, tôi không viết lại để tránh dài)
// ... [giữ nguyên các hàm này từ code cũ] ...

// =========================================================================
// FAMILY - BẢO MẬT & HIỂN THỊ
// =========================================================================
function checkFamilyTabAccess() {
    const isUnlocked = localStorage.getItem("family_unlocked") === "true";
    const authView = document.getElementById("family-auth-view");
    const mainView = document.getElementById("family-main-view");

    if (!authView || !mainView) return;

    if (isUnlocked) {
        authView.style.display = "none";
        mainView.style.display = "block";
        generateFamilyInterface();
    } else {
        authView.style.display = "block";
        mainView.style.display = "none";
    }
} // end function checkFamilyTabAccess

function verifyFamilyAuth() {
    const inputPass = document.getElementById("family-password").value;
    if (!inputPass.trim()) {
        alert("Vui lòng nhập mật khẩu!");
        return;
    }

    fetch(`${CONFIG.apiEndpoint}?action=checkResetPassword&password=${encodeURIComponent(inputPass.trim())}`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "success" && res.match === true) {
                localStorage.setItem("family_unlocked", "true");
                checkFamilyTabAccess();
            } else {
                alert("Mật khẩu không khớp!");
            }
        })
        .catch(() => {
            alert("Không thể kết nối xác thực!");
        });
} // end function verifyFamilyAuth

function generateFamilyInterface() {
    const container = document.getElementById("family-buttons-container");
    if (!container) return;

    if (localFamilyData && localFamilyData.length > 0) {
        renderFamilyGrid(localFamilyData);
        return;
    }

    container.innerHTML = "<p style='color: #aaa; text-align: center;'>🔄 Đang tải dữ liệu...</p>";
    fetch(`${CONFIG.apiEndpoint}?action=getFamilyData`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "success" && res.data) {
                localFamilyData = res.data;
                if (db) {
                    db.transaction("settings", "readwrite")
                      .objectStore("settings")
                      .put({ key: "family_data", value: res.data });
                }
                renderFamilyGrid(res.data);
            } else {
                container.innerHTML = "<p style='color: #aaa; text-align: center;'>📭 Chưa có dữ liệu.</p>";
            }
        })
        .catch(() => {
            container.innerHTML = "<p style='color: #f44336; text-align: center;'>❌ Lỗi kết nối!</p>";
        });
} // end function generateFamilyInterface

function renderFamilyGrid(members) {
    const container = document.getElementById("family-buttons-container");
    if (!container) return;

    container.innerHTML = "";

    let validMembers = 0;
    members.forEach(m => {
        const displayName = m.nickname && m.nickname !== "-" ? m.nickname : (m.fullname || "Thành viên");
        if (displayName.toUpperCase() === "NICKNAME") return;

        validMembers++;
        let btn = document.createElement("button");
        btn.className = "member-btn";
        btn.textContent = displayName;
        btn.onclick = () => showFamilyModal(m);
        container.appendChild(btn);
    });

    const totalFamilyEl = document.getElementById('app-total-family');
    if (totalFamilyEl) {
        totalFamilyEl.textContent = validMembers;
    }
} // end function renderFamilyGrid

function showFamilyModal(m) {
    // ... [giữ nguyên logic hiển thị modal] ...
    const modal = document.getElementById("familyModal");
    if (modal) {
        modal.style.display = "flex";
    }
} // end function showFamilyModal

function closeModal() {
    const modal = document.getElementById("familyModal");
    if (modal) {
        modal.style.display = "none";
    }
} // end function closeModal
// end FAMILY

// =========================================================================
// NHẮC HẸN
// =========================================================================
// ... [giữ nguyên toàn bộ code nhắc hẹn] ...
// end NHẮC HẸN

// =========================================================================
// CÀI ĐẶT GIAO DIỆN (THEMES)
// =========================================================================
function toggleDarkMode(enable) {
    document.documentElement.setAttribute('data-theme', enable ? 'dark' : 'light');
    localStorage.setItem('darkMode', enable ? 'true' : 'false');

    const colorInput = document.getElementById("setting-color");
    if (colorInput) {
        const slider = document.querySelector('.slider');
        if (slider) {
            slider.style.backgroundColor = enable ? colorInput.value : '#ccc';
        }
    }
} // end function toggleDarkMode

function applyTheme() {
    const colorSelect = document.getElementById("setting-color");
    if (!colorSelect) return;
    
    const themeColor = colorSelect.value || DEFAULT_THEME_COLOR;
    const root = document.documentElement;
    root.style.setProperty('--theme-color', themeColor.toLowerCase());
    root.classList.toggle("theme-yellow", /yellow|#ffc107|#ffeb3b/i.test(themeColor));

    let r = parseInt(themeColor.slice(1,3), 16);
    let g = parseInt(themeColor.slice(3,5), 16);
    let b = parseInt(themeColor.slice(5,7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    root.style.setProperty('--text-on-theme', brightness > 150 ? '#111111' : '#ffffff');

    localStorage.setItem('themeColor', themeColor);
    
    // Update slider color
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const slider = document.querySelector('.slider');
    if (slider) {
        slider.style.backgroundColor = isDark ? themeColor : '#ccc';
    }
} // end function applyTheme

function loadTheme() {
    const savedDark = localStorage.getItem('darkMode');
    const isDark = savedDark !== null ? savedDark === 'true' : DEFAULT_DARK_MODE;

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = isDark;

    const colorSelect = document.getElementById("setting-color");
    if (colorSelect) {
        let savedColor = localStorage.getItem('themeColor') || DEFAULT_THEME_COLOR;
        colorSelect.value = savedColor;
    }
    applyTheme();
} // end function loadTheme
// end CÀI ĐẶT GIAO DIỆN (THEMES)

// =========================================================================
// ĐỒNG BỘ TOÀN DIỆN
// =========================================================================
function syncAllDataFromSheet() {
    if (!navigator.onLine) {
        alert("Thiết bị đang ngoại tuyến! Vui lòng kết nối mạng để đồng bộ.");
        return;
    }

    const syncBtn = document.getElementById("btn-sync-data");
    if (!syncBtn) return;
    
    const originalText = syncBtn.innerHTML;
    syncBtn.disabled = true;
    syncBtn.innerHTML = "⏳ Đang đồng bộ...";
    syncBtn.style.opacity = "0.7";

    // ... [giữ nguyên logic sync từ code cũ] ...
    
    // Sau khi sync xong
    syncBtn.disabled = false;
    syncBtn.innerHTML = originalText;
    syncBtn.style.opacity = "1";
    updateAppInfo();
} // end function syncAllDataFromSheet
// end ĐỒNG BỘ TOÀN DIỆN

// =========================================================================
// RESET APP
// =========================================================================
function resetAppCompletely() {
    if (!confirm("⚠️ Bạn có chắc chắn muốn xóa toàn bộ lịch sử thiết bị không?\nHành động này không thể hoàn tác!")) return;

    // ... [giữ nguyên logic reset] ...
} // end function resetAppCompletely
// end RESET APP

// =========================================================================
// LOAD INITIAL SETTINGS
// =========================================================================
function loadInitialSettings() {
    if (!db) return;

    const tx = db.transaction("settings", "readonly");
    const store = tx.objectStore("settings");
    const request = store.getAll();

    request.onsuccess = function(e) {
        const results = e.target.result || [];

        const savedFamily = results.find(item => item.key === "family_data");
        if (savedFamily) {
            localFamilyData = savedFamily.value;
        }

        const lastSync = results.find(item => item.key === "last_sync_time");
        const statusEl = document.getElementById("sync-status");
        if (lastSync && statusEl) {
            statusEl.innerHTML = `Last sync: ${lastSync.value}`;
        }

        // Load theme trước
        loadTheme();
        // Sau đó mới init các thành phần khác
        initFormOptions();
        renderChartsAndStats();
        generateRemindersInterface();

        initAppConfig().then(() => {
            updateAppInfo();
        });
    };

    request.onerror = function(e) {
        console.error("Lỗi load settings:", e.target.error);
        loadTheme();
        initFormOptions();
        renderChartsAndStats();
        generateRemindersInterface();
        initAppConfig().then(() => {
            updateAppInfo();
        });
    };
} // end function loadInitialSettings
// end LOAD INITIAL SETTINGS

// =========================================================================
// KHỞI TẠO APP
// =========================================================================
document.addEventListener("DOMContentLoaded", function() {
    setupEventListeners();
    initDB();
});

window.addEventListener('online', () => {
    if (db) {
        syncToGoogleSheets();
        syncRemindersToSheet();
    }
});
// end KHỞI TẠO APP
