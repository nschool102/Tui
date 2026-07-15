// =========================================================================
// HÀM XỬ LÝ NGÀY THÁNG CHO VIỆT NAM (GMT+7)
// =========================================================================

// Lấy thời gian hiện tại theo GMT+7
function getVietnamNow() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() + (offset + 420) * 60000);
} // end function getVietnamNow

// Format ngày theo định dạng yyyy-mm-dd hh:mm:ss (GMT+7)
function formatVietnamDateTime(date) {
    if (!date) return '';
    
    let d;
    if (typeof date === 'string') {
        d = new Date(date);
    } else {
        d = new Date(date);
    }
    
    if (isNaN(d.getTime())) {
        console.log('⚠️ formatVietnamDateTime: Invalid date');
        return '';
    }
    
    // Điều chỉnh về GMT+7
    const offset = d.getTimezoneOffset();
    const vietnamTime = new Date(d.getTime() + (offset + 420) * 60000);
    
    const year = vietnamTime.getFullYear();
    const month = String(vietnamTime.getMonth() + 1).padStart(2, '0');
    const day = String(vietnamTime.getDate()).padStart(2, '0');
    const hours = String(vietnamTime.getHours()).padStart(2, '0');
    const minutes = String(vietnamTime.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
} // end function formatVietnamDateTime

// Format date chỉ lấy phần ngày (yyyy-mm-dd)
function formatDateOnly(d) {
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
} // end function formatDateOnly

// Chuẩn hóa timestamp để so sánh dedup an toàn:
// - cắt bỏ giây nếu có (giữ tới phút: yyyy-mm-dd hh:mm)
// - trim khoảng trắng, bỏ ký tự T/Z nếu sót lại từ ISO string
function normalizeTimestampForCompare(ts) {
    if (!ts) return '';
    let s = String(ts).trim();
    s = s.replace('T', ' ').replace('Z', '');
    // Cắt giây nếu có dạng yyyy-mm-dd hh:mm:ss(.xxx)
    const match = s.match(/^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})/);
    return match ? match[1] : s;
} // end function normalizeTimestampForCompare

// Chuyển bất kỳ giá trị ngày (ISO string "2025-04-22T17:00:00.000Z",
// "yyyy-mm-dd hh:mm", hoặc "yyyy-mm-dd") thành định dạng hiển thị dd-mm-yyyy.
// Trả về chuỗi gốc nếu không nhận diện được (để không làm mất dữ liệu khi hiển thị).
function formatDisplayDateDMY(value) {
    if (!value || value === "-") return value || "-";
    const str = String(value).trim();

    // Dạng yyyy-mm-dd hoặc yyyy-mm-ddThh:mm:ss... (ISO) hoặc yyyy-mm-dd hh:mm
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return `${day}-${month}-${year}`;
    }

    // Dạng dd/mm/yyyy đã có sẵn (ví dụ dữ liệu cũ) -> chuyển dấu / thành -
    const slashMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (slashMatch) {
        const [, day, month, year] = slashMatch;
        return `${day}-${month}-${year}`;
    }

    // Fallback: thử parse bằng Date(), nếu hợp lệ thì format lại
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }

    return str;
} // end function formatDisplayDateDMY

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
        navigator.serviceWorker.register('/Tui/sw.js')
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
                    icon: 'icon.png'
                });
            } else {
                new Notification(title, {
                    body: body,
                    icon: 'icon.png',
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
        const response = await fetch('/Tui/manifest.json');
        if (!response.ok) {
            throw new Error('Không tìm thấy manifest.json');
        }
        const manifest = await response.json();
        return {
            version: manifest.version || '1.0.0',
            name: manifest.name || 'TÔI - Quản lý tài chính',
            shortName: manifest.short_name || 'TÔI'
        };
    } catch (error) {
        console.log('Không thể tải manifest.json:', error.message);
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
// CẬP NHẬT TỔNG THU/CHI TRONG THÁNG - TAB THU/CHI
// =========================================================================
function updateSummaryTotals() {
    getAllTransactions(data => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let totalThu = 0;
        let totalChi = 0;
        
        data.forEach(t => {
            const tDate = new Date(t.timestamp);
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
                if (t.amount > 0) {
                    totalThu += t.amount;
                } else {
                    totalChi += Math.abs(t.amount);
                }
            }
        });
        
        const thuEl = document.getElementById('total-thu-month');
        if (thuEl) {
            thuEl.textContent = formatVND(totalThu);
        }
        
        const chiEl = document.getElementById('total-chi-month');
        if (chiEl) {
            chiEl.textContent = formatVND(totalChi);
        }
    });
} // end function updateSummaryTotals
// end CẬP NHẬT TỔNG THU/CHI TRONG THÁNG

// =========================================================================
// KHỞI TẠO INDEXEDDB
// =========================================================================
function initDB() {
    const request = indexedDB.open("FamilyFinancePWA", 5);
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
        if (!db.objectStoreNames.contains("diary")) {
            db.createObjectStore("diary", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("health")) {
            db.createObjectStore("health", { keyPath: "id", autoIncrement: true });
        }
    };
    request.onsuccess = function(e) {
        db = e.target.result;
        console.log('✅ IndexedDB opened successfully, version:', db.version);
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
    document.getElementById("main-nav-tabs").addEventListener("click", function(e) {
        const btn = e.target.closest(".tab-btn");
        if (btn) {
            const tabName = btn.getAttribute("data-tab");
            switchTab(tabName);
        }
    });

    document.getElementById("chi-type").addEventListener("change", () => updateSubtypes('chi'));
    document.getElementById("thu-type").addEventListener("change", () => updateSubtypes('thu'));

    document.getElementById("form-chi").addEventListener("submit", (e) => saveTransaction(e, 'chi'));
    document.getElementById("form-thu").addEventListener("submit", (e) => saveTransaction(e, 'thu'));
    
    document.getElementById("form-diary").addEventListener("submit", (e) => saveDiaryEntry(e));
    
    // Thêm event cho button Lưu Health
    const btnHealthOnly = document.getElementById("btn-save-health-only");
    if (btnHealthOnly) {
        btnHealthOnly.addEventListener("click", saveHealthOnly);
    }
    
    setupDiaryPlaceToggle();
    setupStatTimeEvents();
    setupBloodPressureMask();
    
    document.getElementById("form-nhachen").addEventListener("submit", (e) => saveReminder(e));

    document.getElementById("chi-amount").addEventListener("input", (e) => formatCurrency(e.target));
    document.getElementById("thu-amount").addEventListener("input", (e) => formatCurrency(e.target));

    document.getElementById("chi-top-period").addEventListener("change", () => renderTopExpenses());
    document.getElementById("sec4-period").addEventListener("change", () => renderSection4());

    document.getElementById("rem-frequency").addEventListener("change", toggleCustomReminderFields);

    document.getElementById("btn-verify-family").addEventListener("click", verifyFamilyAuth);

    document.getElementById("darkModeToggle").addEventListener("change", (e) => toggleDarkMode(e.target.checked));
    document.getElementById("setting-color").addEventListener("change", applyTheme);
    document.getElementById("btn-sync-data").addEventListener("click", syncAllDataFromSheet);
    document.getElementById("btn-reset-app").addEventListener("click", resetAppCompletely);

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
    if (tabName === 'diary') {
        renderDiaryHistory();
        initDiaryDateTime();
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

        const now = getVietnamNow();
        const dateInput = document.getElementById(`${mode}-date`);
        if (dateInput) {
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    });
    initReminderDateOptions();
    initColorSettings();
    initDiaryDateTime();
} // end function initFormOptions

function initColorSettings() {
    const sColor = document.getElementById("setting-color");
    if (!sColor || sColor.children.length > 0) return;

    const textNames = ["Xanh Lá", "Xanh Bơ", "Xanh Dương", "Hồng", "Tím", "Đỏ", "Cam", "Vàng"];
    PALETTE.forEach((hex, i) => {
        let opt = document.createElement("option");
        opt.value = hex;
        opt.textContent = textNames[i];
        sColor.appendChild(opt);
    });
} // end function initColorSettings

function toggleCustomReminderFields() {
    const freq = document.getElementById("rem-frequency").value;
    const customBox = document.getElementById("custom-reminder-fields");
    if (customBox) {
        customBox.style.display = (freq === "CUSTOM") ? "block" : "none";
    }
} // end function toggleCustomReminderFields

function initReminderDateOptions() {
    const dSel = document.getElementById("rem-day");
    const mSel = document.getElementById("rem-month");
    const ySel = document.getElementById("rem-year");
    if (!dSel || !mSel || !ySel) return;

    dSel.innerHTML = "";
    mSel.innerHTML = "";
    ySel.innerHTML = "";

    for (let i = 1; i <= 31; i++) {
        dSel.innerHTML += `<option value="${i}">${String(i).padStart(2,'0')}</option>`;
    }
    for (let i = 1; i <= 12; i++) {
        mSel.innerHTML += `<option value="${i}">Tháng ${String(i).padStart(2,'0')}</option>`;
    }

    const currYear = new Date().getFullYear();
    for (let i = currYear; i <= currYear + 5; i++) {
        ySel.innerHTML += `<option value="${i}">Năm ${i}</option>`;
    }

    const today = new Date();
    dSel.value = today.getDate();
    mSel.value = today.getMonth() + 1;
    ySel.value = today.getFullYear();
} // end function initReminderDateOptions
// end HÀM TIỆN ÍCH

// =========================================================================
// XỬ LÝ GIAO DỊCH (TRANSACTIONS) - TAB THU / CHI
// =========================================================================
function saveTransaction(event, mode) {
    event.preventDefault();
    
    console.log('💾 saveTransaction - mode:', mode);

    const type = document.getElementById(`${mode}-type`).value;
    const subtype = document.getElementById(`${mode}-subtype`).value;
    let amount = parseCurrency(document.getElementById(`${mode}-amount`).value);
    const dateVal = document.getElementById(`${mode}-date`).value;
    const note = document.getElementById(`${mode}-note`).value;

    console.log('📝 Dữ liệu nhập:', { type, subtype, amount, dateVal, note });

    if (mode === 'chi') amount = -Math.abs(amount);
    if (mode === 'thu') amount = Math.abs(amount);

    const formattedNote = toSentenceCase(note);

    let date;
    if (dateVal) {
        date = new Date(dateVal);
    } else {
        date = new Date();
    }
    
    const timestamp = formatVietnamDateTime(date);
    console.log('📅 Timestamp:', timestamp);

    const transaction = {
        timestamp: timestamp,
        type: type,
        subtype: subtype,
        amount: amount,
        note: formattedNote,
        synced: 0
    };

    console.log('💾 Transaction object:', transaction);

    const tx = db.transaction("transactions", "readwrite");
    const store = tx.objectStore("transactions");
    const request = store.add(transaction);
    
    request.onsuccess = function(e) {
        console.log('✅ Đã lưu vào IndexedDB với id:', e.target.result);
        alert("Đã lưu giao dịch cục bộ!");
        document.getElementById(`form-${mode}`).reset();
        initFormOptions();
        renderChartsAndStats();
        
        console.log('🔄 Gọi syncToGoogleSheets...');
        syncToGoogleSheets();
    };
    
    request.onerror = function(e) {
        console.error('❌ Lỗi lưu IndexedDB:', e.target.error);
        alert("Lỗi lưu giao dịch: " + e.target.error);
    };
} // end function saveTransaction

// =========================================================================
// LẤY TẤT CẢ GIAO DỊCH TỪ INDEXEDDB
// =========================================================================
function getAllTransactions(callback) {
    if (!db) {
        console.log('❌ getAllTransactions: Chưa có database');
        callback([]);
        return;
    }
    
    const tx = db.transaction("transactions", "readonly");
    const store = tx.objectStore("transactions");
    const request = store.getAll();
    
    request.onsuccess = function(e) {
        const result = e.target.result || [];
        console.log('📊 getAllTransactions: Lấy được', result.length, 'transactions');
        callback(result);
    };
    
    request.onerror = function(e) {
        console.error('❌ getAllTransactions: Lỗi đọc', e.target.error);
        callback([]);
    };
} // end function getAllTransactions

// =========================================================================
// ĐỒNG BỘ GIAO DỊCH LÊN GOOGLE SHEET
// =========================================================================
function syncToGoogleSheets() {
    console.log('🔍 syncToGoogleSheets - Bắt đầu');
    
    if (!navigator.onLine) {
        console.log('❌ Offline - không thể sync');
        return;
    }
    
    if (isSyncing) {
        console.log('⏳ Đang sync, bỏ qua');
        return;
    }
    
    if (!CONFIG.apiEndpoint) {
        console.log('❌ Không có API endpoint');
        return;
    }

    if (!db) {
        console.log('❌ Chưa có database');
        return;
    }

    const tx = db.transaction("transactions", "readonly");
    const store = tx.objectStore("transactions");
    const request = store.getAll();
    
    request.onsuccess = function(e) {
        const transactions = e.target.result || [];
        console.log('📊 Tổng transactions trong IndexedDB:', transactions.length);
        
        const unsynced = transactions.filter(t => t.synced === 0);
        console.log('📊 Số transactions chưa sync:', unsynced.length);
        
        if (unsynced.length === 0) {
            console.log('📭 Không có giao dịch chưa sync');
            return;
        }

        console.log('📤 Dữ liệu gửi lên:', JSON.stringify(unsynced, null, 2));

        isSyncing = true;
        
        fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
                action: 'syncTransactions',
                data: unsynced.map(t => ({
                    timestamp: t.timestamp,
                    type: t.type,
                    subtype: t.subtype,
                    amount: t.amount,
                    note: t.note || ''
                }))
            })
        })
        .then(res => {
            console.log('📥 Response status:', res.status);
            return res.json();
        })
        .then(resData => {
            console.log('📥 Response từ server:', resData);
            
            if (resData.status === "success") {
                console.log('✅ Sync thành công! Số giao dịch đã sync:', resData.count || unsynced.length);
                
                const tx2 = db.transaction("transactions", "readwrite");
                const store2 = tx2.objectStore("transactions");
                
                unsynced.forEach(t => {
                    t.synced = 1;
                    store2.put(t);
                });
                
                tx2.oncomplete = function() {
                    console.log('✅ Đã cập nhật trạng thái synced trong IndexedDB');
                    renderChartsAndStats();
                };
                
                tx2.onerror = function(e) {
                    console.error('❌ Lỗi cập nhật trạng thái synced:', e.target.error);
                };
            } else {
                console.log('❌ Sync thất bại:', resData.message);
            }
            
            isSyncing = false;
        })
        .catch(err => {
            console.error('❌ Lỗi fetch:', err);
            isSyncing = false;
        });
    };
    
    request.onerror = function(e) {
        console.error('❌ Lỗi đọc IndexedDB:', e.target.error);
        isSyncing = false;
    };
} // end function syncToGoogleSheets
// end XỬ LÝ GIAO DỊCH (TRANSACTIONS)

// =========================================================================
// ĐỒ THỊ & THỐNG KÊ - TAB CHI / THỐNG KÊ
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
                        padding: 12,
                        generateLabels: function(chart) {
                            const original = Chart.overrides.pie.plugins.legend.labels.generateLabels(chart);
                            const bgColors = chart.data.datasets[0].backgroundColor;
                            original.forEach((item, i) => {
                                item.fontColor = getReadableLegendColor(bgColors[i]);
                                item.strokeStyle = bgColors[i];
                            });
                            return original;
                        }
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

function getReadableLegendColor(hexColor) {
    return hexColor || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#333333');
} // end function getReadableLegendColor

function renderChartsAndStats() {
    getAllTransactions(data => {
        let totalThu = 0, totalChi = 0, sum_Tiger = 0, sum_Mine = 0;
        let catCurrentMonth = { "Tổng": 0, "Ăn uống": 0, "Đồ chơi": 0, "Mỹ phẩm": 0, "Quần áo": 0 };
        let catPrevMonth = { "Tổng": 0, "Ăn uống": 0, "Đồ chơi": 0, "Mỹ phẩm": 0, "Quần áo": 0 };

        const now = new Date();
        const cM = now.getMonth();
        const cY = now.getFullYear();
        let pM = cM - 1;
        let pY = cY;
        if (pM < 0) { pM = 11; pY--; }

        let sortedData = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        let expList = sortedData.filter(t => t.amount < 0).slice(0, 20);
        let incList = sortedData.filter(t => t.amount > 0).slice(0, 20);

        const expContainer = document.getElementById("expense-history-container");
        if (expList.length && expContainer) {
            let htmlChi = `<table class="history-table"><tbody>`;
            expList.forEach(t => {
                let dStr = new Date(t.timestamp).toLocaleDateString('vi-VN');
                let contentStr = `${t.subtype} ${t.note ? `<br><small style="opacity:0.7;"><i>📝 ${t.note}</i></small>` : ''}`;
                htmlChi += `<tr><td>${dStr}</td><td>${t.type}</td><td>${contentStr}</td><td class="amount-col" style="color:var(--danger-color);">${formatVND(Math.abs(t.amount))}</td></tr>`;
            });
            htmlChi += `</tbody></table>`;
            expContainer.innerHTML = htmlChi;
        } else if (expContainer) {
            expContainer.innerHTML = "Chưa có khoản chi nào.";
        }

        const incContainer = document.getElementById("income-history-container");
        if (incList.length && incContainer) {
            let htmlThu = `<table class="history-table"><tbody>`;
            incList.forEach(t => {
                let dStr = new Date(t.timestamp).toLocaleDateString('vi-VN');
                let contentStr = `${t.subtype} ${t.note ? `<br><small style="opacity:0.7;"><i>📝 ${t.note}</i></small>` : ''}`;
                htmlThu += `<tr><td>${dStr}</td><td>${t.type}</td><td>${contentStr}</td><td class="amount-col" style="color:var(--success-color);">${formatVND(t.amount)}</td></tr>`;
            });
            htmlThu += `</tbody></table>`;
            incContainer.innerHTML = htmlThu;
        } else if (incContainer) {
            incContainer.innerHTML = "Chưa có khoản thu nào.";
        }

        data.forEach(t => {
            const tDate = new Date(t.timestamp);
            const amt = t.amount;

            if (amt > 0) {
                totalThu += amt;
                if (t.type === "CON CỢP") sum_Tiger += amt;
                if (t.type === "Lương" || t.type === "Thưởng") sum_Mine += amt;
            } else {
                totalChi += Math.abs(amt);
                let absAmt = Math.abs(amt);

                if (tDate.getFullYear() === cY && tDate.getMonth() === cM) {
                    catCurrentMonth["Tổng"] += absAmt;
                    if (t.subtype === "Đi chợ, siêu thị" || t.type === "Giải trí") {
                        catCurrentMonth["Ăn uống"] += absAmt;
                    }
                    if (t.subtype === "Đồ chơi") catCurrentMonth["Đồ chơi"] += absAmt;
                    if (t.subtype === "Mỹ phẩm") catCurrentMonth["Mỹ phẩm"] += absAmt;
                    if (t.subtype === "Quần áo") catCurrentMonth["Quần áo"] += absAmt;
                } else if (tDate.getFullYear() === pY && tDate.getMonth() === pM) {
                    catPrevMonth["Tổng"] += absAmt;
                    if (t.subtype === "Đi chợ, siêu thị" || t.type === "Giải trí") {
                        catPrevMonth["Ăn uống"] += absAmt;
                    }
                    if (t.subtype === "Đồ chơi") catPrevMonth["Đồ chơi"] += absAmt;
                    if (t.subtype === "Mỹ phẩm") catPrevMonth["Mỹ phẩm"] += absAmt;
                    if (t.subtype === "Quần áo") catPrevMonth["Quần áo"] += absAmt;
                }
            }
        });

        const alertDiv = document.getElementById("section1-alerts");
        if (alertDiv) {
            alertDiv.innerHTML = "";
            let hasAlert = false;
            Object.keys(catCurrentMonth).forEach(cat => {
                let cur = catCurrentMonth[cat];
                let prev = catPrevMonth[cat];
                if (prev > 0 && cur > prev) {
                    hasAlert = true;
                    alertDiv.innerHTML += `<div class="alert-box">Hạng mục <strong>${cat}</strong> chi vượt <strong>${((cur - prev) / prev * 100).toFixed(1)}%</strong> so với tháng trước!</div>`;
                }
            });
            if (!hasAlert) {
                alertDiv.innerHTML = "<p style='color:green;'>An toàn! Không có hạng mục nào chi vượt tháng trước.</p>";
            }
        }

        document.getElementById("sec2-thu").textContent = formatVND(totalThu);
        document.getElementById("sec2-chi").textContent = formatVND(totalChi);
        document.getElementById("sec2-remain").textContent = formatVND(totalThu - totalChi);
        renderPieChart('chart-sec2-pie', ['Tổng Thu', 'Tổng Chi'], [totalThu, totalChi]);

        document.getElementById("sec3-Mine").textContent = formatVND(sum_Mine);
        document.getElementById("sec3-Tiger").textContent = formatVND(sum_Tiger);
        renderPieChart('chart-sec3-pie', ['MÌNH', 'CON CỢP'], [sum_Mine, sum_Tiger], ['#8BC34A', '#E91E63']);

        renderSection4(data);
        renderPieChart('chart-chi-overview', ['Tổng Thu', 'Tổng Chi'], [totalThu, totalChi]);
        renderTopExpenses();
        
        updateSummaryTotals();
    });
} // end function renderChartsAndStats

function renderTopExpenses() {
    const periodSelect = document.getElementById("chi-top-period");
    if (!periodSelect) return;

    const period = periodSelect.value;
    const now = new Date();

    getAllTransactions(data => {
        let filtered = data.filter(t => t.amount < 0).filter(t => {
            let d = new Date(t.timestamp);
            if (period === 'week') {
                return (now - d) <= 7 * 24 * 60 * 60 * 1000;
            }
            if (period === 'month') {
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }
            if (period === 'year') {
                return d.getFullYear() === now.getFullYear();
            }
            return true;
        });

        let groupedData = {};
        filtered.forEach(t => {
            let groupKey = `${t.type} (${t.subtype})`;
            if (!groupedData[groupKey]) groupedData[groupKey] = 0;
            groupedData[groupKey] += Math.abs(t.amount);
        });

        let sortedGroups = Object.keys(groupedData).map(key => {
            return { category: key, totalAmount: groupedData[key] };
        }).sort((a, b) => b.totalAmount - a.totalAmount);

        const container = document.getElementById("top-expenses-list");
        if (!container) return;

        if (sortedGroups.length === 0) {
            container.innerHTML = "<p>Không có dữ liệu chi tiêu.</p>";
            return;
        }

        let html = '';
        sortedGroups.slice(0, 5).forEach((g, i) => {
            let parts = g.category.match(/^(.*?)\s*\((.*?)\)$/);
            let type = parts ? parts[1] : g.category;
            let subtype = parts ? parts[2] : '--';

            html += `<div class="stat-row" style="display: grid; grid-template-columns: 30px 1fr 1fr 100px; gap: 8px; padding: 10px 4px; align-items: center;">
                <span style="font-weight: bold; color: var(--text-color); opacity: 0.5;">${i+1}</span>
                <span style="font-weight: 600; color: var(--theme-color);">${type}</span>
                <span style="color: var(--text-color); opacity: 0.7; font-size: 0.9rem;">${subtype}</span>
                <span style="font-weight: bold; color: var(--danger-color); text-align: right;">${formatVND(g.totalAmount)}</span>
            </div>`;
        });
        container.innerHTML = html;
    });
} // end function renderTopExpenses

function renderSection4(allData) {
    const periodSelect = document.getElementById("sec4-period");
    if (!periodSelect) return;

    const period = periodSelect.value;
    const run = data => {
        const now = new Date();
        let currentBalance = 0;
        let totalThu = 0;
        let fullChi = 0;
        let investmentSavings = 0;

        data.forEach(t => {
            let d = new Date(t.timestamp);
            currentBalance += t.amount;

            let isMatch = false;
            if (period === 'month') {
                isMatch = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            } else {
                isMatch = d.getFullYear() === now.getFullYear();
            }

            if (isMatch) {
                if (t.amount > 0) {
                    totalThu += t.amount;
                } else {
                    if (t.type === "Đầu tư, tiết kiệm") {
                        investmentSavings += Math.abs(t.amount);
                    } else {
                        fullChi += Math.abs(t.amount);
                    }
                }
            }
        });

        document.getElementById("sec4-balance").textContent = formatVND(currentBalance);
        document.getElementById("sec4-thu").textContent = formatVND(totalThu);
        document.getElementById("sec4-net-chi").textContent = formatVND(fullChi);
        document.getElementById("sec4-savings").textContent = formatVND(investmentSavings);
        renderPieChart('chart-sec4-pie', ['Tổng Thu', 'Tổng Chi Thực Tế', 'Tiết Kiệm'],
                       [totalThu, fullChi, investmentSavings], ['#4CAF50', '#F44336', '#FFEB3B']);
    };

    if (allData) {
        run(allData);
    } else {
        getAllTransactions(run);
    }
} // end function renderSection4
// end ĐỒ THỊ & THỐNG KÊ

// =========================================================================
// FAMILY - BẢO MẬT & HIỂN THỊ - TAB FAMILY
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
    const sanitizePhoneForTel = (val) => {
        if (!val || val === "-") return "";
        return String(val).replace(/[^\d+]/g, "");
    };

    const fields = [
        { l: "Biệt danh", v: m.nickname || "-" },
        { l: "Họ tên", v: m.fullname || "-" },
        { l: "Ngày sinh", v: formatDisplayDateDMY(m.dob) },
        { l: "Nơi sinh", v: m.noisinh || "-" },
        { l: "Địa chỉ", v: m.diachi || "-" },
        { l: "Điện thoại", v: m.dienthoai || "-", isPhone: true },
        { l: "CCCD: Số", v: m.cccd?.so || "-" },
        { l: "CCCD: Ngày cấp", v: formatDisplayDateDMY(m.cccd?.ngaycap) },
        { l: "CCCD: Ngày hết hạn", v: formatDisplayDateDMY(m.cccd?.ngayhethan) },
        { l: "CCCD: Nơi cấp", v: m.cccd?.noicap || "-" },
        { l: "Hộ chiếu: Số", v: m.hochieu?.so || "-" },
        { l: "Hộ chiếu: Ngày cấp", v: formatDisplayDateDMY(m.hochieu?.ngaycap) },
        { l: "Hộ chiếu: Ngày hết hạn", v: formatDisplayDateDMY(m.hochieu?.ngayhethan) },
        { l: "Hộ chiếu: Nơi cấp", v: m.hochieu?.noicap || "-" },
        { l: "Thẻ BHYT", v: m.bhyt || "-" },
        { l: "Mã số BHXH", v: m.bhxh || "-" },
        { l: "Mã số thuế", v: m.masothue || "-" },
        { l: "LLTP: Số", v: m.lltp?.so || "-" },
        { l: "LLTP: Ngày cấp", v: formatDisplayDateDMY(m.lltp?.ngaycap) },
        { l: "LLTP: Nơi cấp", v: m.lltp?.noicap || "-" }
    ];

    const detailsDiv = document.getElementById("modal-member-details");
    if (!detailsDiv) return;

    detailsDiv.innerHTML = "";
    let fullBlockText = "";
    let lastGroup = "";

    fields.forEach(f => {
        fullBlockText += `${f.l}: ${f.v}\n`;
        let currentGroup = "";
        let cleanLabel = f.l;

        if (f.l.startsWith("CCCD:")) {
            currentGroup = "CCCD";
            cleanLabel = f.l.replace("CCCD:", "").trim();
        } else if (f.l.startsWith("Hộ chiếu:")) {
            currentGroup = "Hộ chiếu";
            cleanLabel = f.l.replace("Hộ chiếu:", "").trim();
        } else if (f.l.startsWith("LLTP:")) {
            currentGroup = "Lí lịch tư pháp";
            cleanLabel = f.l.replace("LLTP:", "").trim();
        }

        if (currentGroup && currentGroup !== lastGroup) {
            let groupHeader = document.createElement("div");
            groupHeader.style = "margin-top:18px; margin-bottom:4px; padding:6px 8px; font-size:1.1rem; font-weight:bold; color:var(--theme-color); border-bottom:1px dashed var(--border-color);";
            groupHeader.textContent = currentGroup;
            detailsDiv.appendChild(groupHeader);
            lastGroup = currentGroup;
        }

        let row = document.createElement("div");
        row.className = "info-row";

        const telNumber = f.isPhone ? sanitizePhoneForTel(f.v) : "";
        const callBtnHtml = telNumber
            ? `<a href="tel:${telNumber}" class="btn-call-phone" title="Gọi ${f.v}" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin-left:8px;border-radius:50%;background:var(--theme-color);color:#000;text-decoration:none;font-size:0.9rem;vertical-align:middle;">📞</a>`
            : "";

        if (currentGroup) {
            row.innerHTML = `<div class="info-label" style="padding-left:15px; font-size:0.9rem;">- ${cleanLabel}</div><div class="info-value" style="padding-left:25px; font-weight:500;">${f.v}${callBtnHtml}</div>`;
        } else {
            if (!currentGroup) lastGroup = "";
            row.innerHTML = `<div class="info-label">${f.l}</div><div class="info-value">${f.v}${callBtnHtml}</div>`;
        }

        if (telNumber) {
            const callBtn = row.querySelector(".btn-call-phone");
            if (callBtn) {
                callBtn.onclick = (e) => {
                    e.stopPropagation();
                };
            }
        }

        row.onclick = () => {
            if (f.v !== "-") {
                navigator.clipboard.writeText(f.v).then(() => {
                    alert(`Đã copy: ${f.v}`);
                }).catch(() => {
                    const textArea = document.createElement('textarea');
                    textArea.value = f.v;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert(`Đã copy: ${f.v}`);
                });
            }
        };
        detailsDiv.appendChild(row);
    });

    document.getElementById("btn-copy-all").onclick = () => {
        navigator.clipboard.writeText(fullBlockText).then(() => {
            alert("Đã copy toàn bộ thông tin lí lịch!");
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = fullBlockText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert("Đã copy toàn bộ thông tin lí lịch!");
        });
    };

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
// end FAMILY - BẢO MẬT & HIỂN THỊ

// =========================================================================
// NHẮC HẸN - TAB NHẮC HẸN
// =========================================================================
const VALID_REMINDER_FREQUENCIES = ["ONCE", "DAILY", "WEEKLY", "MONTHLY", "CUSTOM"];

function cleanupCorruptedReminders(callback) {
    if (!db || !db.objectStoreNames.contains("reminders")) {
        if (callback) callback();
        return;
    }

    const tx = db.transaction("reminders", "readwrite");
    const store = tx.objectStore("reminders");
    const request = store.getAll();

    request.onsuccess = function(e) {
        const list = e.target.result || [];
        let removedCount = 0;

        list.forEach(r => {
            if (isCorruptedReminder(r)) {
                store.delete(r.id);
                removedCount++;
            }
        });

        tx.oncomplete = function() {
            if (removedCount > 0) {
                console.log(`Đã tự động xóa ${removedCount} reminder bị hỏng.`);
            }
            if (callback) callback();
        };
        tx.onerror = function() {
            if (callback) callback();
        };
    };

    request.onerror = function(e) {
        console.error("Lỗi đọc reminders khi dọn dẹp:", e.target.error);
        if (callback) callback();
    };
} // end function cleanupCorruptedReminders

function isCorruptedReminder(r) {
    if (!r || typeof r !== 'object') return true;
    if (!r.content || typeof r.content !== 'string' || !r.content.trim()) return true;
    if (!VALID_REMINDER_FREQUENCIES.includes(r.frequency)) return true;
    if (!isValidDateOnlyString(r.startDate)) return true;
    if (r.nextReminderDate && !isValidDateOnlyString(r.nextReminderDate)) return true;
    return false;
} // end function isCorruptedReminder

function isValidDateOnlyString(str) {
    if (!str || typeof str !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const d = new Date(str);
    return !isNaN(d.getTime());
} // end function isValidDateOnlyString

function computeNextReminderDate(fromDateStr, frequency, everyValue, everyUnit) {
    const d = new Date(fromDateStr);
    d.setHours(0, 0, 0, 0);

    if (frequency === "DAILY") {
        d.setDate(d.getDate() + 1);
    } else if (frequency === "WEEKLY") {
        d.setDate(d.getDate() + 7);
    } else if (frequency === "MONTHLY") {
        d.setMonth(d.getMonth() + 1);
    } else if (frequency === "CUSTOM") {
        const n = parseInt(everyValue) || 1;
        if (everyUnit === "DAYS") d.setDate(d.getDate() + n);
        else if (everyUnit === "WEEKS") d.setDate(d.getDate() + (n * 7));
        else if (everyUnit === "MONTHS") d.setMonth(d.getMonth() + n);
    } else {
        return null;
    }

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
} // end function computeNextReminderDate

function saveReminder(event) {
    event.preventDefault();

    const content = document.getElementById("rem-content").value.trim();
    const day = document.getElementById("rem-day").value;
    const month = document.getElementById("rem-month").value;
    const year = document.getElementById("rem-year").value;
    const frequency = document.getElementById("rem-frequency").value;
    const everyVal = document.getElementById("rem-every-val").value;
    const everyUnit = document.getElementById("rem-every-unit").value;

    if (!content) {
        alert("Vui lòng nhập nội dung nhắc hẹn!");
        return;
    }

    if (frequency === "CUSTOM" && (!everyVal || parseInt(everyVal) < 1)) {
        alert("Vui lòng nhập số lượng hợp lệ cho tần suất tùy chỉnh!");
        return;
    }

    const formattedContent = toSentenceCase(content);
    const startDateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

    const reminderItem = {
        content: formattedContent,
        startDate: startDateStr,
        frequency: frequency,
        everyValue: frequency === "CUSTOM" ? parseInt(everyVal) : null,
        everyUnit: frequency === "CUSTOM" ? everyUnit : null,
        nextReminderDate: startDateStr,
        lastTriggeredAt: "",
        synced: 0,
        status: "ENABLED"
    };

    console.log("Lưu reminder:", reminderItem);

    const tx = db.transaction("reminders", "readwrite");
    const store = tx.objectStore("reminders");
    const request = store.add(reminderItem);

    request.onsuccess = function(e) {
        console.log("Reminder đã lưu với id:", e.target.result);
        alert("Đã thêm nhắc hẹn cục bộ!");
        document.getElementById("form-nhachen").reset();
        toggleCustomReminderFields();
        initReminderDateOptions();
        generateRemindersInterface();
        syncRemindersToSheet();
    };

    request.onerror = function(e) {
        console.error("Lỗi lưu reminder:", e.target.error);
        alert("Lỗi lưu nhắc hẹn: " + e.target.error);
    };
} // end function saveReminder

function generateRemindersInterface() {
    const container = document.getElementById("reminder-list-container");
    if (!container) return;

    if (!db) {
        container.innerHTML = "Lỗi cơ sở dữ liệu.";
        return;
    }

    const tx = db.transaction("reminders", "readonly");
    const store = tx.objectStore("reminders");
    const request = store.getAll();

    request.onsuccess = function(e) {
        const list = e.target.result || [];
        localReminderData = list;
        renderRemindersList(list);
        checkAndTriggerReminders(list);
    };
    request.onerror = function(e) {
        container.innerHTML = "Lỗi đọc dữ liệu nhắc hẹn.";
        console.error("Lỗi đọc reminders:", e.target.error);
    };
} // end function generateRemindersInterface

function renderRemindersList(list) {
    const container = document.getElementById("reminder-list-container");
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = "<p style='color: #aaa; text-align: center;'>📭 Chưa có lịch nhắc hẹn nào.</p>";
        return;
    }

    const sortedList = [...list].sort((a, b) => {
        const aDate = a.nextReminderDate || a.startDate;
        const bDate = b.nextReminderDate || b.startDate;
        if (aDate < bDate) return -1;
        if (aDate > bDate) return 1;
        return 0;
    });

    let html = `<table class="history-table"><thead><tr><th>Nội dung</th><th>Ngày nhắc tiếp theo</th><th>Tần suất</th><th>Trạng thái</th></tr></thead><tbody>`;

    sortedList.forEach(r => {
        let freqText = formatFrequencyLabel(r);

        let displayDateSource = r.nextReminderDate || r.startDate;
        let displayDate = formatDisplayDateDMY(displayDateSource);

        let statusColor = r.status === "ENABLED" ? "var(--success-color)" : "var(--danger-color)";
        let statusText = r.status === "ENABLED" ? "✅ Hoạt động" : "⛔ Tắt";

        const today = new Date();
        today.setHours(0,0,0,0);
        const remDate = new Date(displayDateSource);
        remDate.setHours(0,0,0,0);
        let isPast = remDate < today && r.frequency === "ONCE";

        html += `<tr style="${isPast ? 'opacity:0.5;' : ''}">
            <td style="font-weight:600; color:var(--theme-color);">${r.content}</td>
            <td>${displayDate} ${isPast ? '<span style="color:#999;font-size:0.8rem;">(đã qua)</span>' : ''}</td>
            <td><small class="theme-bg" style="padding:2px 6px; border-radius:4px; font-size:0.75rem;">${freqText}</small></td>
            <td style="color:${statusColor}; font-size:0.85rem;">${statusText}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
} // end function renderRemindersList

function formatFrequencyLabel(r) {
    const freqMap = {
        'ONCE': 'Một lần',
        'DAILY': 'Hàng ngày',
        'WEEKLY': 'Hàng tuần',
        'MONTHLY': 'Hàng tháng'
    };
    if (r.frequency === "CUSTOM") {
        const unitMap = { 'DAYS': 'Ngày', 'WEEKS': 'Tuần', 'MONTHS': 'Tháng' };
        const unitText = unitMap[r.everyUnit] || r.everyUnit || '';
        return `Mỗi ${r.everyValue || 1} ${unitText}`;
    }
    return freqMap[r.frequency] || r.frequency || "ONCE";
} // end function formatFrequencyLabel

function checkAndTriggerReminders(reminders) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = formatDateOnly(today);
    const tomorrowStr = formatDateOnly(tomorrow);

    let hasChanges = false;

    reminders.forEach(r => {
        if (r.status === "DISABLED") return;

        const targetDateStr = r.nextReminderDate || r.startDate;
        if (!targetDateStr) return;

        const targetDate = new Date(targetDateStr);
        targetDate.setHours(0,0,0,0);

        if (r.frequency === "ONCE" && targetDate < today) return;

        const alreadyTriggeredToday = r.lastTriggeredAt && r.lastTriggeredAt.slice(0, 10) === todayStr;

        if (targetDateStr === tomorrowStr) {
            triggerPushNotification("🔔 NHẮC TRƯỚC 1 NGÀY", `Ngày mai bạn có hẹn: ${r.content}`);
        }

        if (targetDateStr === todayStr && !alreadyTriggeredToday) {
            triggerPushNotification("⏰ HÔM NAY CÓ HẸN", r.content);

            r.lastTriggeredAt = new Date().toISOString();
            r.synced = 0;
            hasChanges = true;

            if (r.frequency === "ONCE") {
                r.status = "DISABLED";
            } else {
                const nextDate = computeNextReminderDate(todayStr, r.frequency, r.everyValue, r.everyUnit);
                if (nextDate) r.nextReminderDate = nextDate;
            }

            updateReminderInDB(r);
        }
    });

    if (hasChanges) {
        renderRemindersList(reminders);
    }
} // end function checkAndTriggerReminders

function updateReminderInDB(reminderItem) {
    if (!db || !reminderItem.id) return;
    const tx = db.transaction("reminders", "readwrite");
    tx.objectStore("reminders").put(reminderItem);
    tx.oncomplete = function() {
        syncRemindersToSheet();
    };
} // end function updateReminderInDB

function startDailyReminderCheck() {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }

    notificationCheckInterval = setInterval(() => {
        if (db) {
            const tx = db.transaction("reminders", "readonly");
            const store = tx.objectStore("reminders");
            const request = store.getAll();
            request.onsuccess = function(e) {
                const list = e.target.result || [];
                checkAndTriggerReminders(list);
            };
        }
    }, 30 * 60 * 1000);

    setTimeout(() => {
        generateRemindersInterface();
    }, 3000);
} // end function startDailyReminderCheck
// end NHẮC HẸN

// =========================================================================
// ĐỒNG BỘ NHẮC HẸN LÊN GOOGLE SHEET (REMINDERS)
// =========================================================================
function syncRemindersToSheet() {
    if (!navigator.onLine || !CONFIG.apiEndpoint) {
        console.log("Không thể sync: offline hoặc không có endpoint");
        return;
    }

    if (!db) {
        console.log("Chưa có database");
        return;
    }

    const tx = db.transaction("reminders", "readonly");
    const store = tx.objectStore("reminders");
    const request = store.getAll();

    request.onsuccess = function(e) {
        const list = e.target.result || [];
        const unsynced = list.filter(r => r.synced === 0);

        console.log("Số lượng reminder chưa sync:", unsynced.length);

        if (unsynced.length === 0) return;

        const dataToSend = unsynced.map(r => ({
            content: r.content || "",
            frequency: encodeFrequencyForSheet(r),
            startDate: r.startDate || "",
            status: r.status || "ENABLED",
            nextReminderDate: r.nextReminderDate || r.startDate || "",
            lastTriggeredAt: r.lastTriggeredAt || ""
        }));

        console.log("Dữ liệu gửi lên server:", JSON.stringify(dataToSend));

        fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
                action: 'syncReminders',
                data: dataToSend
            })
        })
        .then(res => {
            console.log("Response status:", res.status);
            return res.json();
        })
        .then(resData => {
            console.log("Response data:", resData);
            if (resData.status === "success") {
                const tx2 = db.transaction("reminders", "readwrite");
                const store2 = tx2.objectStore("reminders");
                unsynced.forEach(r => {
                    r.synced = 1;
                    store2.put(r);
                });
                console.log("Đã đánh dấu reminders đã sync");
            } else {
                console.error("Lỗi sync reminders:", resData.message);
            }
        })
        .catch(err => {
            console.error("Lỗi fetch syncReminders:", err);
        });
    };

    request.onerror = function(e) {
        console.error("Lỗi đọc reminders từ IndexedDB:", e.target.error);
    };
} // end function syncRemindersToSheet

function encodeFrequencyForSheet(r) {
    if (r.frequency === "CUSTOM") {
        return `CUSTOM:${r.everyValue || 1}:${r.everyUnit || 'DAYS'}`;
    }
    return r.frequency || "ONCE";
} // end function encodeFrequencyForSheet

function decodeFrequencyFromSheet(rawFrequency) {
    if (rawFrequency && rawFrequency.toString().startsWith("CUSTOM:")) {
        const parts = rawFrequency.toString().split(":");
        return {
            frequency: "CUSTOM",
            everyValue: parseInt(parts[1]) || 1,
            everyUnit: parts[2] || "DAYS"
        };
    }
    return { frequency: rawFrequency || "ONCE", everyValue: null, everyUnit: null };
} // end function decodeFrequencyFromSheet
// end ĐỒNG BỘ NHẮC HẸN LÊN GOOGLE SHEET

// =========================================================================
// NHẬT KÍ - TAB DIARY
// =========================================================================

function formatDiaryDateTime(date) {
    if (!date) return '';
    
    let d;
    if (typeof date === 'string') {
        d = new Date(date);
    } else {
        d = new Date(date);
    }
    
    if (isNaN(d.getTime())) {
        console.log('⚠️ formatDiaryDateTime: Invalid date');
        return '';
    }
    
    const offset = d.getTimezoneOffset();
    const vietnamTime = new Date(d.getTime() + (offset + 420) * 60000);
    
    const day = String(vietnamTime.getDate()).padStart(2, '0');
    const month = String(vietnamTime.getMonth() + 1).padStart(2, '0');
    const year = vietnamTime.getFullYear();
    const hours = String(vietnamTime.getHours()).padStart(2, '0');
    const minutes = String(vietnamTime.getMinutes()).padStart(2, '0');
    const seconds = String(vietnamTime.getSeconds()).padStart(2, '0');
    
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
} // end function formatDiaryDateTime

function getDiaryEntries(callback) {
    if (!db) {
        console.log('❌ getDiaryEntries: Chưa có database');
        callback([]);
        return;
    }
    
    const tx = db.transaction("diary", "readonly");
    const store = tx.objectStore("diary");
    const request = store.getAll();
    
    request.onsuccess = function(e) {
        const result = e.target.result || [];
        console.log('📊 getDiaryEntries: Lấy được', result.length, 'entries');
        callback(result);
    };
    
    request.onerror = function(e) {
        console.error('❌ getDiaryEntries: Lỗi đọc', e.target.error);
        callback([]);
    };
} // end function getDiaryEntries

// Lưu chỉ health check (không lưu diary)
function saveHealthOnly() {
    console.log('💾 saveHealthOnly - Bắt đầu');
    
    // Lấy giá trị từ form
    let datetimeVal = document.getElementById('diary-datetime').value;
    const bloodPressure = document.getElementById('diary-blood-pressure').value.trim();
    const heartRate = parseInt(document.getElementById('diary-heart-rate').value);
    const dau = document.getElementById('diary-dau').checked;
    
    // Kiểm tra có dữ liệu health không
    if (!bloodPressure && isNaN(heartRate) && !dau) {
        alert('Vui lòng nhập ít nhất một thông tin health (huyết áp, nhịp tim hoặc dâu)!');
        return;
    }
    
    // Validate
    if (bloodPressure && !/^\d{2,3}\/\d{2}$/.test(bloodPressure)) {
        alert('Huyết áp không đúng định dạng! Vui lòng nhập theo dạng ###/## (ví dụ: 120/80)');
        return;
    }
    
    if (!isNaN(heartRate) && (heartRate < 30 || heartRate > 200)) {
        alert('Vui lòng nhập nhịp tim hợp lệ (30-200 bpm)!');
        return;
    }
    
    // Xử lý datetime
    let date;
    if (datetimeVal) {
        date = new Date(datetimeVal);
    } else {
        date = new Date();
    }
    
    // Format datetime cho health: dd/mm/yyyy hh:mm
    const healthDateTime = formatHealthDateTime(date);
    console.log('📅 Health Datetime:', healthDateTime);
    
    // Kiểm tra db
    if (!db) {
        console.error('❌ Database chưa được khởi tạo');
        alert('Lỗi: Database chưa sẵn sàng. Vui lòng tải lại trang!');
        return;
    }
    
    // Kiểm tra object store health
    if (!db.objectStoreNames.contains("health")) {
        console.error('❌ Health store not found in database');
        alert('Lỗi: Object store health không tồn tại. Vui lòng tải lại trang!');
        return;
    }
    
    const healthEntry = {
        datetime: healthDateTime,
        bloodPressure: bloodPressure || '',
        heartRate: heartRate || 0,
        dau: dau || false,
        nextDauPrediction: '',
        synced: 0,
        diaryId: null
    };
    
    console.log('💾 Health entry:', healthEntry);
    
    const tx = db.transaction("health", "readwrite");
    const store = tx.objectStore("health");
    const request = store.add(healthEntry);
    
    request.onsuccess = function(e) {
        console.log('✅ Đã lưu health check vào IndexedDB với id:', e.target.result);
        alert("Đã lưu health check cục bộ!");
        // Reset chỉ các field health
        document.getElementById('diary-blood-pressure').value = '';
        document.getElementById('diary-heart-rate').value = '';
        document.getElementById('diary-dau').checked = false;
        syncHealthToSheet();
    };
    
    request.onerror = function(e) {
        console.error('❌ Lỗi lưu health check:', e.target.error);
        alert("Lỗi lưu health check: " + e.target.error);
    };
} // end function saveHealthOnly

// Đồng bộ health check lên Google Sheet
function syncHealthToSheet() {
    console.log('🔍 syncHealthToSheet - Bắt đầu');
    
    if (!navigator.onLine) {
        console.log('❌ Offline - không thể sync health');
        return;
    }
    
    if (!CONFIG.apiEndpoint) {
        console.log('❌ Không có API endpoint');
        return;
    }
    
    if (!db) {
        console.log('❌ Chưa có database');
        return;
    }
    
    const tx = db.transaction("health", "readonly");
    const store = tx.objectStore("health");
    const request = store.getAll();
    
    request.onsuccess = function(e) {
        const entries = e.target.result || [];
        const unsynced = entries.filter(t => t.synced === 0);
        console.log('📊 Số health check chưa sync:', unsynced.length);
        
        if (unsynced.length === 0) {
            console.log('📭 Không có health check chưa sync');
            return;
        }
        
        // Log dữ liệu để debug
        console.log('📤 Dữ liệu health gửi lên:', JSON.stringify(unsynced, null, 2));
        
        fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
                action: 'syncHealth',
                data: unsynced.map(t => ({
                    datetime: t.datetime,
                    bloodPressure: t.bloodPressure,
                    heartRate: t.heartRate,
                    dau: t.dau,
                    nextDauPrediction: t.nextDauPrediction || ''
                }))
            })
        })
        .then(res => {
            console.log('📥 Response status:', res.status);
            return res.json();
        })
        .then(resData => {
            console.log('📥 Response từ server:', resData);
            
            if (resData.status === "success") {
                console.log('✅ Sync health thành công!');
                
                const tx2 = db.transaction("health", "readwrite");
                const store2 = tx2.objectStore("health");
                
                unsynced.forEach(t => {
                    t.synced = 1;
                    store2.put(t);
                });
                
                tx2.oncomplete = function() {
                    console.log('✅ Đã cập nhật trạng thái synced cho health');
                };
            } else {
                console.log('❌ Sync health thất bại:', resData.message);
            }
        })
        .catch(err => {
            console.error('❌ Lỗi fetch health:', err);
        });
    };
    
    request.onerror = function(e) {
        console.error('❌ Lỗi đọc IndexedDB health:', e.target.error);
    };
} // end function syncHealthToSheet

// Lưu nhật kí vào IndexedDB và sync lên sheet
function saveDiaryEntry(event) {
    event.preventDefault();
    
    console.log('💾 saveDiaryEntry - Bắt đầu');
    
    // Lấy giá trị từ form
    let datetimeVal = document.getElementById('diary-datetime').value;
    const placeSelect = document.getElementById('diary-place');
    const place = placeSelect.value;
    let detail = document.getElementById('diary-detail').value.trim();
    
    // Lấy giá trị Health Check
    const bloodPressure = document.getElementById('diary-blood-pressure').value.trim();
    const heartRate = parseInt(document.getElementById('diary-heart-rate').value);
    const dau = document.getElementById('diary-dau').checked;
    
    // Xử lý Custom place
    let finalPlace = place;
    if (place === 'Custom') {
        const customPlace = document.getElementById('diary-custom-place').value.trim();
        if (!customPlace) {
            alert('Vui lòng nhập địa điểm!');
            return;
        }
        finalPlace = customPlace;
    }
    
    // Xử lý datetime
    let date;
    if (datetimeVal) {
        date = new Date(datetimeVal);
    } else {
        date = new Date();
    }
    
    // Format datetime cho diary: dd-mm-yyyy HH:mm:ss
    const formattedDateTime = formatDiaryDateTime(date);
    console.log('📅 Datetime:', formattedDateTime);
    
    // Kiểm tra có dữ liệu health không
    const hasHealthData = bloodPressure || !isNaN(heartRate) || dau;
    
    // Validate health nếu có dữ liệu
    if (hasHealthData) {
        // Validate huyết áp format ###/## (nếu có nhập)
        if (bloodPressure && !/^\d{2,3}\/\d{2}$/.test(bloodPressure)) {
            alert('Huyết áp không đúng định dạng! Vui lòng nhập theo dạng ###/## (ví dụ: 120/80)');
            return;
        }
        
        // Validate nhịp tim (nếu có nhập)
        if (!isNaN(heartRate) && (heartRate < 30 || heartRate > 200)) {
            alert('Vui lòng nhập nhịp tim hợp lệ (30-200 bpm)!');
            return;
        }
    }
    
    // Tạo diary entry
    const diaryEntry = {
        datetime: formattedDateTime,
        place: finalPlace,
        detail: detail || '',
        // Lưu health data vào diary để hiển thị (nếu có)
        bloodPressure: bloodPressure || '',
        heartRate: heartRate || 0,
        dau: dau || false,
        synced: 0
    };
    
    console.log('💾 Diary entry:', diaryEntry);
    
    // Kiểm tra db
    if (!db) {
        console.error('❌ Database chưa được khởi tạo');
        alert('Lỗi: Database chưa sẵn sàng. Vui lòng tải lại trang!');
        return;
    }
    
    // LƯU DIARY
    const tx1 = db.transaction("diary", "readwrite");
    const diaryStore = tx1.objectStore("diary");
    const diaryRequest = diaryStore.add(diaryEntry);
    
    diaryRequest.onsuccess = function(e) {
        const diaryId = e.target.result;
        console.log('✅ Đã lưu diary vào IndexedDB với id:', diaryId);
        
        // CHỈ LƯU HEALTH KHI CÓ DỮ LIỆU HEALTH
        if (hasHealthData && bloodPressure) {
            const healthDateTime = formatHealthDateTime(date);
            
            const healthEntry = {
                datetime: healthDateTime,
                bloodPressure: bloodPressure || '',
                heartRate: heartRate || 0,
                dau: dau || false,
                nextDauPrediction: '',
                synced: 0,
                diaryId: diaryId
            };
            
            console.log('💾 Health entry (từ diary):', healthEntry);
            
            // Lưu vào health store
            const tx2 = db.transaction("health", "readwrite");
            const healthStore = tx2.objectStore("health");
            const healthRequest = healthStore.add(healthEntry);
            
            healthRequest.onsuccess = function() {
                console.log('✅ Đã lưu health check vào IndexedDB');
            };
            
            healthRequest.onerror = function(e) {
                console.error('❌ Lỗi lưu health check:', e.target.error);
            };
            
            tx2.oncomplete = function() {
                console.log('✅ Health transaction completed');
                syncHealthToSheet();
            };
            
            tx2.onerror = function(e) {
                console.error('❌ Health transaction error:', e.target.error);
            };
        } else {
            console.log('ℹ️ Không có dữ liệu health, bỏ qua lưu health check');
        }
        
        tx1.oncomplete = function() {
            console.log('✅ Diary transaction completed');
            alert("Đã lưu nhật kí cục bộ!");
            document.getElementById('form-diary').reset();
            document.getElementById('diary-custom-place-group').style.display = 'none';
            renderDiaryHistory();
            syncDiaryToSheet();
        };
    };
    
    diaryRequest.onerror = function(e) {
        console.error('❌ Lỗi lưu diary:', e.target.error);
        alert("Lỗi lưu nhật kí: " + e.target.error);
    };
} // end function saveDiaryEntry

// Hiển thị lịch sử nhật kí
function renderDiaryHistory() {
    const container = document.getElementById('diary-history-container');
    if (!container) return;
    
    getDiaryEntries(entries => {
        if (entries.length === 0) {
            container.innerHTML = '<p style="color: #aaa; text-align: center;">📭 Chưa có nhật kí nào.</p>';
            return;
        }
        
        // Sắp xếp theo datetime mới nhất trước
        const sorted = [...entries].sort((a, b) => {
            const aDate = a.datetime.split(' ')[0].split('-').reverse().join('-') + ' ' + (a.datetime.split(' ')[1] || '');
            const bDate = b.datetime.split(' ')[0].split('-').reverse().join('-') + ' ' + (b.datetime.split(' ')[1] || '');
            return bDate.localeCompare(aDate);
        });
        
        let html = `<table class="history-table"><thead><tr>
            <th>Ngày giờ</th>
            <th>Địa điểm</th>
            <th>Chi tiết</th>
            <th>🩺 Health</th>
        </tr></thead><tbody>`;
        
        sorted.slice(0, 50).forEach(entry => {
            // Tạo health info nếu có
            let healthInfo = '';
            if (entry.bloodPressure || entry.heartRate || entry.dau !== undefined) {
                const dauText = entry.dau ? '✅' : '';
                healthInfo = `<span style="font-size:0.75rem; color:var(--stat-label-color);">
                    ${entry.bloodPressure ? '🩸' + entry.bloodPressure : ''}
                    ${entry.heartRate ? ' 💓' + entry.heartRate : ''}
                    ${dauText ? ' 🌸' + dauText : ''}
                </span>`;
            }
            
            html += `<tr>
                <td style="white-space: nowrap; font-size: 0.85rem;">${entry.datetime}</td>
                <td><span style="font-weight: 500; color: var(--theme-color);">${entry.place}</span></td>
                <td>${entry.detail || ''}</td>
                <td>${healthInfo}</td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        if (sorted.length > 50) {
            html += `<p style="text-align: center; color: var(--stat-label-color); font-size: 0.8rem;">Hiển thị 50/ ${sorted.length} bản ghi</p>`;
        }
        container.innerHTML = html;
    });
} // end function renderDiaryHistory

// Format datetime cho health: dd/mm/yyyy hh:mm (24h)
function formatHealthDateTime(date) {
    if (!date) return '';
    
    let d;
    if (typeof date === 'string') {
        d = new Date(date);
    } else {
        d = new Date(date);
    }
    
    if (isNaN(d.getTime())) {
        console.log('⚠️ formatHealthDateTime: Invalid date');
        return '';
    }
    
    // Điều chỉnh về GMT+7
    const offset = d.getTimezoneOffset();
    const vietnamTime = new Date(d.getTime() + (offset + 420) * 60000);
    
    const day = String(vietnamTime.getDate()).padStart(2, '0');
    const month = String(vietnamTime.getMonth() + 1).padStart(2, '0');
    const year = vietnamTime.getFullYear();
    const hours = String(vietnamTime.getHours()).padStart(2, '0');
    const minutes = String(vietnamTime.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
} // end function formatHealthDateTime

// Thêm vào setupEventListeners() hoặc sau khi DOM load
function setupBloodPressureMask() {
    const bpInput = document.getElementById('diary-blood-pressure');
    if (!bpInput) return;
    
    bpInput.addEventListener('input', function(e) {
        // Chỉ cho phép số và dấu /
        let value = this.value.replace(/[^0-9/]/g, '');
        
        // Giới hạn độ dài
        if (value.length > 7) {
            value = value.slice(0, 7);
        }
        
        // Tự động thêm dấu / sau 3 số
        if (value.length === 3 && !value.includes('/')) {
            value = value + '/';
        }
        
        // Nếu đã có / thì chỉ cho phép 2 số sau /
        if (value.includes('/')) {
            const parts = value.split('/');
            if (parts[0].length > 3) {
                parts[0] = parts[0].slice(0, 3);
            }
            if (parts[1] && parts[1].length > 2) {
                parts[1] = parts[1].slice(0, 2);
            }
            value = parts.join('/');
        }
        
        this.value = value;
    });
    
    // Xử lý paste
    bpInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text');
        const clean = pasted.replace(/[^0-9/]/g, '');
        if (clean) {
            // Tự động format
            let value = clean;
            if (value.length >= 3 && !value.includes('/')) {
                value = value.slice(0, 3) + '/' + value.slice(3);
            }
            this.value = value.slice(0, 7);
        }
    });
} // end function setupBloodPressureMask

function syncDiaryToSheet() {
    console.log('🔍 syncDiaryToSheet - Bắt đầu');
    
    if (!navigator.onLine) {
        console.log('❌ Offline - không thể sync diary');
        return;
    }
    
    if (!CONFIG.apiEndpoint) {
        console.log('❌ Không có API endpoint');
        return;
    }
    
    if (!db) {
        console.log('❌ Chưa có database');
        return;
    }
    
    const tx = db.transaction("diary", "readonly");
    const store = tx.objectStore("diary");
    const request = store.getAll();
    
    request.onsuccess = function(e) {
        const entries = e.target.result || [];
        const unsynced = entries.filter(t => t.synced === 0);
        console.log('📊 Số nhật kí chưa sync:', unsynced.length);
        
        if (unsynced.length === 0) {
            console.log('📭 Không có nhật kí chưa sync');
            return;
        }
        
        fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
                action: 'syncDiary',
                data: unsynced.map(t => ({
                    datetime: t.datetime,
                    place: t.place,
                    detail: t.detail
                }))
            })
        })
        .then(res => {
            console.log('📥 Response status:', res.status);
            return res.json();
        })
        .then(resData => {
            console.log('📥 Response từ server:', resData);
            
            if (resData.status === "success") {
                console.log('✅ Sync diary thành công!');
                
                const tx2 = db.transaction("diary", "readwrite");
                const store2 = tx2.objectStore("diary");
                
                unsynced.forEach(t => {
                    t.synced = 1;
                    store2.put(t);
                });
                
                tx2.oncomplete = function() {
                    console.log('✅ Đã cập nhật trạng thái synced cho diary');
                };
            } else {
                console.log('❌ Sync diary thất bại:', resData.message);
            }
        })
        .catch(err => {
            console.error('❌ Lỗi fetch diary:', err);
        });
    };
    
    request.onerror = function(e) {
        console.error('❌ Lỗi đọc IndexedDB diary:', e.target.error);
    };
} // end function syncDiaryToSheet

function setupDiaryPlaceToggle() {
    const placeSelect = document.getElementById('diary-place');
    const customGroup = document.getElementById('diary-custom-place-group');
    
    if (placeSelect && customGroup) {
        placeSelect.addEventListener('change', function() {
            if (this.value === 'Custom') {
                customGroup.style.display = 'block';
            } else {
                customGroup.style.display = 'none';
            }
        });
    }
} // end function setupDiaryPlaceToggle

function initDiaryDateTime() {
    const now = getVietnamNow();
    const datetimeInput = document.getElementById('diary-datetime');
    if (datetimeInput) {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        datetimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
} // end function initDiaryDateTime
// end NHẬT KÍ

// =========================================================================
// CÀI ĐẶT GIAO DIỆN (THEMES) - TAB SETTINGS
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
    const themeColor = document.getElementById("setting-color")?.value || DEFAULT_THEME_COLOR;
    const root = document.documentElement;
    root.style.setProperty('--theme-color', themeColor.toLowerCase());
    root.classList.toggle("theme-yellow", /yellow|#ffc107|#ffeb3b/i.test(themeColor));

    let r = parseInt(themeColor.slice(1,3), 16);
    let g = parseInt(themeColor.slice(3,5), 16);
    let b = parseInt(themeColor.slice(5,7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    root.style.setProperty('--text-on-theme', brightness > 150 ? '#111111' : '#ffffff');

    localStorage.setItem('themeColor', themeColor);
} // end function applyTheme

function loadTheme() {
    const savedDark = localStorage.getItem('darkMode');
    const isDark = savedDark !== null ? savedDark === 'true' : DEFAULT_DARK_MODE;

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = isDark;

    let savedColor = localStorage.getItem('themeColor') || DEFAULT_THEME_COLOR;
    const colorSelect = document.getElementById("setting-color");
    if (colorSelect) {
        colorSelect.value = savedColor;
    }
    applyTheme();
} // end function loadTheme
// end CÀI ĐẶT GIAO DIỆN (THEMES)

// =========================================================================
// ĐỒNG BỘ TOÀN DIỆN - TAB SETTINGS
// =========================================================================
function syncAllDataFromSheet() {
    if (!navigator.onLine) {
        alert("Thiết bị đang ngoại tuyến! Vui lòng kết nối mạng để đồng bộ.");
        return;
    }

    const syncBtn = document.getElementById("btn-sync-data");
    const originalText = syncBtn.innerHTML;
    syncBtn.disabled = true;
    syncBtn.innerHTML = "⏳ Đang đồng bộ...";
    syncBtn.style.opacity = "0.7";

    getAllTransactions(localTransactions => {
        const pushTransactions = () => new Promise(resolve => {
            const unsyncedTx = localTransactions.filter(t => t.synced === 0);
            if (unsyncedTx.length === 0 || !CONFIG.apiEndpoint) {
                resolve();
                return;
            }
            fetch(CONFIG.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'syncTransactions',
                    data: unsyncedTx.map(t => ({
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
                    unsyncedTx.forEach(t => {
                        t.synced = 1;
                        store.put(t);
                    });
                }
                resolve();
            })
            .catch(() => resolve());
        });

        const pushReminders = () => new Promise(resolve => {
            const tx = db.transaction("reminders", "readonly");
            const store = tx.objectStore("reminders");
            const req = store.getAll();
            req.onsuccess = function(e) {
                const list = e.target.result || [];
                const unsyncedRem = list.filter(r => r.synced === 0);
                if (unsyncedRem.length === 0 || !CONFIG.apiEndpoint) {
                    resolve();
                    return;
                }
                fetch(CONFIG.apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'syncReminders',
                        data: unsyncedRem.map(r => ({
                            content: r.content || "",
                            frequency: encodeFrequencyForSheet(r),
                            startDate: r.startDate || "",
                            status: r.status || "ENABLED",
                            nextReminderDate: r.nextReminderDate || r.startDate || "",
                            lastTriggeredAt: r.lastTriggeredAt || ""
                        }))
                    })
                })
                .then(res => res.json())
                .then(resData => {
                    if (resData.status === "success") {
                        const tx2 = db.transaction("reminders", "readwrite");
                        const store2 = tx2.objectStore("reminders");
                        unsyncedRem.forEach(r => {
                            r.synced = 1;
                            store2.put(r);
                        });
                    }
                    resolve();
                })
                .catch(() => resolve());
            };
            req.onerror = () => resolve();
        });

        const pushDiary = () => new Promise(resolve => {
            if (!db) {
                resolve();
                return;
            }
            const tx = db.transaction("diary", "readonly");
            const store = tx.objectStore("diary");
            const req = store.getAll();
            req.onsuccess = function(e) {
                const list = e.target.result || [];
                const unsyncedDiary = list.filter(r => r.synced === 0);
                console.log('📊 Số diary chưa sync:', unsyncedDiary.length);
                
                if (unsyncedDiary.length === 0 || !CONFIG.apiEndpoint) {
                    resolve();
                    return;
                }
                fetch(CONFIG.apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'syncDiary',
                        data: unsyncedDiary.map(r => ({
                            datetime: r.datetime || "",
                            place: r.place || "",
                            detail: r.detail || ""
                        }))
                    })
                })
                .then(res => res.json())
                .then(resData => {
                    if (resData.status === "success") {
                        const tx2 = db.transaction("diary", "readwrite");
                        const store2 = tx2.objectStore("diary");
                        unsyncedDiary.forEach(r => {
                            r.synced = 1;
                            store2.put(r);
                        });
                        console.log('✅ Đã đánh dấu diary đã sync');
                    }
                    resolve();
                })
                .catch(() => resolve());
            };
            req.onerror = () => resolve();
        });

        const downloadData = () => {
            fetch(`${CONFIG.apiEndpoint}?action=getAllAppData`)
                .then(res => res.json())
                .then(resData => {
                    if (resData.status === "success" && resData.data) {
                        const serverFamily = resData.data.family || [];
                        const serverTransactions = resData.data.transactions || [];
                        const serverReminders = resData.data.reminders || [];
                        const serverDiary = resData.data.diary || [];

                        localFamilyData = serverFamily;
                        if (db) {
                            db.transaction("settings", "readwrite")
                              .objectStore("settings")
                              .put({ key: "family_data", value: serverFamily });
                        }

                        if (db && serverTransactions.length > 0) {
                            const tx = db.transaction("transactions", "readwrite");
                            const store = tx.objectStore("transactions");
                            serverTransactions.forEach(sTx => {
                                const isDuplicate = localTransactions.some(lTx =>
                                    normalizeTimestampForCompare(lTx.timestamp) === normalizeTimestampForCompare(sTx.timestamp) &&
                                    parseFloat(lTx.amount) === parseFloat(sTx.amount) &&
                                    lTx.subtype === sTx.subtype
                                );
                                if (!isDuplicate) {
                                    sTx.synced = 1;
                                    store.add(sTx);
                                }
                            });
                        }

                        if (db && serverReminders.length > 0) {
                            const tx = db.transaction("reminders", "readwrite");
                            const store = tx.objectStore("reminders");

                            const getExisting = store.getAll();
                            getExisting.onsuccess = function(e) {
                                const existingList = e.target.result || [];

                                serverReminders.forEach(sRem => {
                                    const isDuplicate = existingList.some(lRem =>
                                        normalizeTimestampForCompare(lRem.startDate) === normalizeTimestampForCompare(sRem.startDate) &&
                                        lRem.content === sRem.content
                                    );
                                    if (!isDuplicate) {
                                        const decoded = decodeFrequencyFromSheet(sRem.frequency);
                                        store.add({
                                            content: sRem.content,
                                            startDate: sRem.startDate,
                                            frequency: decoded.frequency,
                                            everyValue: decoded.everyValue,
                                            everyUnit: decoded.everyUnit,
                                            status: sRem.status || "ENABLED",
                                            nextReminderDate: sRem.nextReminderDate || sRem.startDate,
                                            lastTriggeredAt: sRem.lastTriggeredAt || "",
                                            synced: 1
                                        });
                                    }
                                });
                            };
                        }

                        if (db && serverDiary.length > 0) {
                            const tx = db.transaction("diary", "readwrite");
                            const store = tx.objectStore("diary");

                            const getExisting = store.getAll();
                            getExisting.onsuccess = function(e) {
                                const existingList = e.target.result || [];
                                let addedCount = 0;

                                serverDiary.forEach(sDiary => {
                                    const isDuplicate = existingList.some(lDiary =>
                                        lDiary.datetime === sDiary.datetime &&
                                        lDiary.place === sDiary.place
                                    );
                                    if (!isDuplicate) {
                                        store.add({
                                            datetime: sDiary.datetime,
                                            place: sDiary.place,
                                            detail: sDiary.detail || "",
                                            synced: 1
                                        });
                                        addedCount++;
                                    }
                                });
                                
                                if (addedCount > 0) {
                                    console.log('✅ Đã thêm ' + addedCount + ' diary entries từ server');
                                }
                            };
                        }

                        updateLastSyncTime();

                        const now = new Date();
                        const timeString = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                        const statusEl = document.getElementById("sync-status");
                        if (statusEl) statusEl.innerHTML = `Last sync: ${timeString}`;
                        if (db) {
                            db.transaction("settings", "readwrite")
                              .objectStore("settings")
                              .put({ key: "last_sync_time", value: timeString });
                        }

                        alert("✅ Đồng bộ thành công!");
                    } else {
                        alert("⚠️ Đồng bộ xong nhưng định dạng dữ liệu không đúng.");
                    }
                })
                .catch(err => {
                    console.error("Sync error:", err);
                    alert("❌ Lỗi kết nối! Không thể tải dữ liệu từ Google Sheet xuống.");
                })
                .finally(() => {
                    syncBtn.disabled = false;
                    syncBtn.innerHTML = originalText;
                    syncBtn.style.opacity = "1";
                    initFormOptions();
                    renderChartsAndStats();
                    generateRemindersInterface();
                    renderDiaryHistory();
                    updateAppInfo();
                    updateSummaryTotals();
                });
        };

        Promise.all([pushTransactions(), pushReminders(), pushDiary()]).then(downloadData);
    });
} // end function syncAllDataFromSheet
// end ĐỒNG BỘ TOÀN DIỆN

// =========================================================================
// RESET APP - TAB SETTINGS
// =========================================================================
function resetAppCompletely() {
    if (!confirm("⚠️ Bạn có chắc chắn muốn xóa toàn bộ lịch sử thiết bị không?\nHành động này không thể hoàn tác!")) return;

    let mask = document.createElement('div');
    mask.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;justify-content:center;align-items:center;";

    let box = document.createElement('div');
    box.className = "card";
    box.style = "width:90%;max-width:320px;padding:20px;text-align:center;background:var(--card-bg);color:var(--text-color);";
    box.innerHTML = `
        <h3 style="margin-top:0;color:var(--danger-color);">🔒 Xác Thực Xóa App</h3>
        <p style="font-size:13px;opacity:0.8;">Vui lòng nhập mật khẩu xác nhận định danh:</p>
        <input type="password" id="secure-reset-pass" class="form-control" style="text-align:center;margin-bottom:15px;" placeholder="••••••••">
        <div style="display:flex;gap:10px;">
            <button class="btn" id="btn-cancel-reset" style="background:#555 !important;flex:1;">Hủy</button>
            <button class="btn" id="btn-confirm-reset" style="background:var(--danger-color) !important;flex:1;">Xóa Sạch</button>
        </div>
    `;
    mask.appendChild(box);
    document.body.appendChild(mask);
    document.getElementById("secure-reset-pass").focus();

    document.getElementById("btn-cancel-reset").onclick = () => mask.remove();
    document.getElementById("btn-confirm-reset").onclick = () => {
        const passVal = document.getElementById("secure-reset-pass").value;
        if (!passVal.trim()) {
            alert("Vui lòng không để trống mật khẩu!");
            return;
        }

        fetch(`${CONFIG.apiEndpoint}?action=checkResetPassword&password=${encodeURIComponent(passVal.trim())}`)
            .then(res => res.json())
            .then(res => {
                if (res.status === "success" && res.match === true) {
                    mask.remove();
                    localStorage.clear();
                    if (window.indexedDB) {
                        indexedDB.deleteDatabase("FamilyFinancePWA");
                    }
                    if (notificationCheckInterval) {
                        clearInterval(notificationCheckInterval);
                    }
                    alert("🗑️ Đã xóa sạch dữ liệu thiết bị và đặt lại ứng dụng thành công!");
                    window.location.reload(true);
                } else {
                    alert("❌ Mật khẩu xác nhận không chính xác!");
                }
            })
            .catch(() => {
                alert("Lỗi kết nối đến máy chủ xác thực!");
            });
    };
} // end function resetAppCompletely
// end RESET APP

// =========================================================================
// SCROLL TO TOP
// =========================================================================
window.onscroll = function() {
    const btn = document.getElementById("scrollTopBtn");
    if (btn) {
        btn.style.display = (document.body.scrollTop > 250 || document.documentElement.scrollTop > 250) ? "flex" : "none";
    }
};

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
} // end function scrollToTop
// end SCROLL TO TOP

// =========================================================================
// LOAD INITIAL SETTINGS
// =========================================================================
function loadInitialSettings() {
    if (!db) return;

    // Kiểm tra object stores
    console.log('📦 Object stores in database:', Array.from(db.objectStoreNames));
    
    // Kiểm tra health store
    if (!db.objectStoreNames.contains("health")) {
        console.error('❌ Health store not found!');
        // Thử tạo lại bằng cách tăng version
        try {
            const currentVersion = db.version;
            const newVersion = currentVersion + 1;
            db.close();
            
            const newRequest = indexedDB.open("FamilyFinancePWA", newVersion);
            newRequest.onupgradeneeded = function(e) {
                const newDb = e.target.result;
                if (!newDb.objectStoreNames.contains("health")) {
                    newDb.createObjectStore("health", { keyPath: "id", autoIncrement: true });
                    console.log('✅ Created health store on version ' + newVersion);
                }
                if (!newDb.objectStoreNames.contains("diary")) {
                    newDb.createObjectStore("diary", { keyPath: "id", autoIncrement: true });
                    console.log('✅ Created diary store on version ' + newVersion);
                }
                // Đảm bảo các store khác cũng tồn tại
                if (!newDb.objectStoreNames.contains("transactions")) {
                    newDb.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
                }
                if (!newDb.objectStoreNames.contains("settings")) {
                    newDb.createObjectStore("settings", { keyPath: "key" });
                }
                if (!newDb.objectStoreNames.contains("reminders")) {
                    newDb.createObjectStore("reminders", { keyPath: "id", autoIncrement: true });
                }
            };
            newRequest.onsuccess = function(e) {
                db = e.target.result;
                console.log('✅ Reopened database with health store, version:', db.version);
                continueLoadSettings();
            };
            newRequest.onerror = function(e) {
                console.error('❌ Failed to reopen database:', e.target.error);
                // Fallback: load bình thường
                continueLoadSettings();
            };
            return;
        } catch(err) {
            console.error('❌ Cannot recreate stores:', err);
            continueLoadSettings();
        }
    }
    
    // Nếu health store tồn tại, tiếp tục load
    continueLoadSettings();
} // end function loadInitialSettings

// Hàm tiếp tục load settings sau khi đã có db
function continueLoadSettings() {
    if (!db) {
        console.error('❌ continueLoadSettings: Database not available');
        // Thử load lại sau 1 giây
        setTimeout(() => {
            if (db) {
                continueLoadSettings();
            } else {
                console.error('❌ Still no database after retry');
            }
        }, 1000);
        return;
    }
    
    // Kiểm tra settings store
    if (!db.objectStoreNames.contains("settings")) {
        console.error('❌ Settings store not found!');
        // Tạo settings store
        try {
            const currentVersion = db.version;
            const newVersion = currentVersion + 1;
            db.close();
            
            const newRequest = indexedDB.open("FamilyFinancePWA", newVersion);
            newRequest.onupgradeneeded = function(e) {
                const newDb = e.target.result;
                if (!newDb.objectStoreNames.contains("settings")) {
                    newDb.createObjectStore("settings", { keyPath: "key" });
                    console.log('✅ Created settings store on version ' + newVersion);
                }
            };
            newRequest.onsuccess = function(e) {
                db = e.target.result;
                console.log('✅ Reopened with settings store');
                // Gọi lại chính nó
                continueLoadSettings();
            };
            newRequest.onerror = function(e) {
                console.error('❌ Failed to create settings store:', e.target.error);
                // Vẫn thử load với transaction fallback
                fallbackLoadSettings();
            };
            return;
        } catch(err) {
            console.error('❌ Cannot create settings store:', err);
            fallbackLoadSettings();
            return;
        }
    }
    
    // Load settings từ store
    try {
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

            loadTheme();
            initFormOptions();
            renderChartsAndStats();
            generateRemindersInterface();
            renderDiaryHistory();
            updateSummaryTotals();

            initAppConfig().then(() => {
                updateAppInfo();
            });
        };

        request.onerror = function(e) {
            console.error("Lỗi load settings:", e.target.error);
            fallbackLoadSettings();
        };
    } catch(err) {
        console.error("Lỗi transaction settings:", err);
        fallbackLoadSettings();
    }
} // end function continueLoadSettings

// Fallback khi không thể load settings
function fallbackLoadSettings() {
    console.log('🔄 Using fallback load settings');
    loadTheme();
    initFormOptions();
    renderChartsAndStats();
    generateRemindersInterface();
    renderDiaryHistory();
    updateSummaryTotals();
    initAppConfig().then(() => {
        updateAppInfo();
    });
} // end function fallbackLoadSettings
// end LOAD INITIAL SETTINGS

// =========================================================================
// KHỞI TẠO APP
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    initDB();
});

window.addEventListener('online', () => {
    syncToGoogleSheets();
    syncRemindersToSheet();
    syncDiaryToSheet();
    syncHealthToSheet();
});
// end KHỞI TẠO APP
