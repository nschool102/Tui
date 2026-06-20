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

let db;
let charts = {};
let localFamilyData = []; 
let localReminderData = [];
let isSyncing = false;
let notificationCheckInterval = null;

// =========================================================================
// KHỞI TẠO INDEXEDDB
// =========================================================================
function initDB() {
    const request = indexedDB.open("FamilyFinancePWA", 3);
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
        loadInitialSettings();
        requestNotificationPermission();
        startDailyReminderCheck();
    };
    request.onerror = function(e) {
        console.error("Lỗi mở IndexedDB:", e.target.error);
    };
} // end function initDB

// =========================================================================
// KHỞI TẠO DOM EVENTS
// =========================================================================
function setupEventListeners() {
    // Sự kiện Click Tab
    document.getElementById("main-nav-tabs").addEventListener("click", function(e) {
        const btn = e.target.closest(".tab-btn");
        if (btn) {
            const tabName = btn.getAttribute("data-tab");
            switchTab(tabName);
        }
    });

    // Cập nhật Subtype
    document.getElementById("chi-type").addEventListener("change", () => updateSubtypes('chi'));
    document.getElementById("thu-type").addEventListener("change", () => updateSubtypes('thu'));

    // Submit Forms
    document.getElementById("form-chi").addEventListener("submit", (e) => saveTransaction(e, 'chi'));
    document.getElementById("form-thu").addEventListener("submit", (e) => saveTransaction(e, 'thu'));
    document.getElementById("form-nhachen").addEventListener("submit", (e) => saveReminder(e));

    // Định dạng tiền tệ
    document.getElementById("chi-amount").addEventListener("input", (e) => formatCurrency(e.target));
    document.getElementById("thu-amount").addEventListener("input", (e) => formatCurrency(e.target));

    // Bộ lọc
    document.getElementById("chi-top-period").addEventListener("change", () => renderTopExpenses());
    document.getElementById("sec4-period").addEventListener("change", () => renderSection4());

    // Nhắc hẹn
    document.getElementById("rem-frequency").addEventListener("change", toggleCustomReminderFields);

    // Family
    document.getElementById("btn-verify-family").addEventListener("click", verifyFamilyAuth);

    // Modal
    document.getElementById("btn-close-modal").addEventListener("click", closeModal);

    // Settings
    document.getElementById("darkModeToggle").addEventListener("change", (e) => toggleDarkMode(e.target.checked));
    document.getElementById("setting-color").addEventListener("change", applyTheme);
    document.getElementById("btn-sync-data").addEventListener("click", syncAllDataFromSheet);
    document.getElementById("btn-reset-app").addEventListener("click", resetAppCompletely);

    // Scroll
    document.getElementById("scrollTopBtn").addEventListener("click", scrollToTop);
} // end function setupEventListeners

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
    
    // Xử lý riêng cho từng tab
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
    if (!sColor || sColor.children.length > 0) return;
    
    const textNames = ["Xanh Lá", "Xanh Bơ", "Xanh Dương", "Hồng", "Tím", "Đỏ", "Cam", "Vàng"];
    PALETTE.forEach((hex, i) => {
        let opt = document.createElement("option");
        opt.value = hex;
        opt.textContent = textNames[i];
        sColor.appendChild(opt);
    });
} // end function initColorSettings

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
    
    // Chi thì số tiền âm
    if (mode === 'chi') amount = -Math.abs(amount);

    const transaction = {
        timestamp: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
        type: type,
        subtype: subtype,
        amount: amount,
        note: note || "",
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

// =========================================================================
// ĐỒ THỊ & THỐNG KÊ
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
                        color: function(context) {
                            const bgColors = context.chart.data.datasets[0].backgroundColor;
                            return bgColors[context.index] || '#ffffff';
                        },
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

        // Sắp xếp dữ liệu
        let sortedData = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        let expList = sortedData.filter(t => t.amount < 0).slice(0, 20);
        let incList = sortedData.filter(t => t.amount > 0).slice(0, 20);

        // Render lịch sử Chi
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
        
        // Render lịch sử Thu
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

        // Tính toán thống kê
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

        // Section 1: Cảnh báo
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

        // Section 2: Tổng quan
        document.getElementById("sec2-thu").textContent = formatVND(totalThu);
        document.getElementById("sec2-chi").textContent = formatVND(totalChi);
        document.getElementById("sec2-remain").textContent = formatVND(totalThu - totalChi);
        renderPieChart('chart-sec2-pie', ['Tổng Thu', 'Tổng Chi'], [totalThu, totalChi]);

        // Section 3: Nguồn thu
        document.getElementById("sec3-Mine").textContent = formatVND(sum_Mine);
        document.getElementById("sec3-Tiger").textContent = formatVND(sum_Tiger);
        renderPieChart('chart-sec3-pie', ['MÌNH', 'CON CỢP'], [sum_Mine, sum_Tiger], ['#8BC34A', '#E91E63']);

        // Section 4: Báo cáo định kỳ
        renderSection4(data);
        
        // Biểu đồ chi tiêu
        renderPieChart('chart-chi-overview', ['Tổng Thu', 'Tổng Chi'], [totalThu, totalChi]);
        renderTopExpenses();
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
    members.forEach(m => {
        let btn = document.createElement("button");
        btn.className = "member-btn";
        btn.textContent = m.nickname || m.fullname || "Thành viên";
        btn.onclick = () => showFamilyModal(m);
        container.appendChild(btn);
    });
} // end function renderFamilyGrid

function showFamilyModal(m) {
    const fields = [
        { l: "Biệt danh", v: m.nickname || "-" },
        { l: "Họ tên", v: m.fullname || "-" },
        { l: "Ngày sinh", v: m.dob || "-" },
        { l: "Nơi sinh", v: m.noisinh || "-" },
        { l: "Địa chỉ", v: m.diachi || "-" },
        { l: "CCCD: Số", v: m.cccd?.so || "-" },
        { l: "CCCD: Ngày cấp", v: m.cccd?.ngaycap || "-" },
        { l: "CCCD: Ngày hết hạn", v: m.cccd?.ngayhethan || "-" },
        { l: "CCCD: Nơi cấp", v: m.cccd?.noicap || "-" },
        { l: "Hộ chiếu: Số", v: m.hochieu?.so || "-" },
        { l: "Hộ chiếu: Ngày cấp", v: m.hochieu?.ngaycap || "-" },
        { l: "Hộ chiếu: Ngày hết hạn", v: m.hochieu?.ngayhethan || "-" },
        { l: "Hộ chiếu: Nơi cấp", v: m.hochieu?.noicap || "-" },
        { l: "Thẻ BHYT", v: m.bhyt || "-" },
        { l: "Mã số BHXH", v: m.bhxh || "-" },
        { l: "Mã số thuế", v: m.masothue || "-" },
        { l: "LLTP: Số", v: m.lltp?.so || "-" },
        { l: "LLTP: Ngày cấp", v: m.lltp?.ngaycap || "-" },
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
        if (currentGroup) {
            row.innerHTML = `<div class="info-label" style="padding-left:15px; font-size:0.9rem;">- ${cleanLabel}</div><div class="info-value" style="padding-left:25px; font-weight:500;">${f.v}</div>`;
        } else {
            if (!currentGroup) lastGroup = "";
            row.innerHTML = `<div class="info-label">${f.l}</div><div class="info-value">${f.v}</div>`;
        }
        
        row.onclick = () => {
            if (f.v !== "-") {
                navigator.clipboard.writeText(f.v).then(() => {
                    alert(`Đã copy: ${f.v}`);
                }).catch(() => {
                    // Fallback
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
    
    document.getElementById("familyModal").style.display = "flex";
} // end function showFamilyModal

function closeModal() {
    document.getElementById("familyModal").style.display = "none";
} // end function closeModal

// =========================================================================
// NHẮC HẸN
// =========================================================================
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

function toggleCustomReminderFields() {
    const freq = document.getElementById("rem-frequency").value;
    const customBox = document.getElementById("custom-reminder-fields");
    if (customBox) {
        customBox.style.display = (freq === "CUSTOM") ? "block" : "none";
    }
} // end function toggleCustomReminderFields

function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
} // end function requestNotificationPermission

function triggerPushNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            new Notification(title, { body: body, icon: "favicon.ico" });
        } catch(e) {
            console.log("Notification error:", e);
        }
    }
} // end function triggerPushNotification

function saveReminder(event) {
    event.preventDefault();
    
    const content = document.getElementById("rem-content").value.trim();
    const day = document.getElementById("rem-day").value;
    const month = document.getElementById("rem-month").value;
    const year = document.getElementById("rem-year").value;
    const frequency = document.getElementById("rem-frequency").value;
    
    if (!content) {
        alert("Vui lòng nhập nội dung nhắc hẹn!");
        return;
    }
    
    const startDateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    
    // Tính ngày cần nhắc (ngày bắt đầu)
    const reminderItem = {
        content: content,
        startDate: startDateStr,
        frequency: frequency,
        synced: 0,
        status: "ENABLED"
    };

    const tx = db.transaction("reminders", "readwrite");
    tx.objectStore("reminders").add(reminderItem);
    tx.oncomplete = function() {
        alert("Đã thêm nhắc hẹn cục bộ!");
        document.getElementById("form-nhachen").reset();
        toggleCustomReminderFields();
        initReminderDateOptions();
        generateRemindersInterface();
        syncRemindersToSheet();
    };
    tx.onerror = function(e) {
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

    // Sắp xếp theo ngày bắt đầu
    const sortedList = [...list].sort((a, b) => {
        if (a.startDate < b.startDate) return -1;
        if (a.startDate > b.startDate) return 1;
        return 0;
    });

    let html = `<table class="history-table"><thead><tr><th>Nội dung</th><th>Ngày bắt đầu</th><th>Tần suất</th><th>Trạng thái</th></tr></thead><tbody>`;
    
    sortedList.forEach(r => {
        let freqText = r.frequency || "ONCE";
        const freqMap = {
            'ONCE': 'Một lần',
            'DAILY': 'Hàng ngày',
            'WEEKLY': 'Hàng tuần',
            'MONTHLY': 'Hàng tháng',
            'CUSTOM': 'Tùy chỉnh'
        };
        freqText = freqMap[freqText] || freqText;
        
        let displayDate = r.startDate;
        if (r.startDate) {
            let parts = r.startDate.split("-");
            if (parts.length === 3) {
                displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        
        let statusColor = r.status === "ENABLED" ? "var(--success-color)" : "var(--danger-color)";
        let statusText = r.status === "ENABLED" ? "✅ Hoạt động" : "⛔ Tắt";
        
        // Kiểm tra xem ngày nhắc đã qua chưa
        const today = new Date();
        today.setHours(0,0,0,0);
        const remDate = new Date(r.startDate);
        remDate.setHours(0,0,0,0);
        let isPast = remDate < today && r.frequency !== "ONCE";
        
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

function checkAndTriggerReminders(reminders) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    reminders.forEach(r => {
        if (r.status === "DISABLED") return;
        
        const startRemDate = new Date(r.startDate);
        startRemDate.setHours(0,0,0,0);
        
        // Kiểm tra nếu ngày bắt đầu đã qua thì bỏ qua
        if (startRemDate < today && r.frequency !== "ONCE") return;
        
        // Nếu là nhắc một lần và ngày đã qua thì bỏ qua
        if (r.frequency === "ONCE" && startRemDate < today) return;
        
        // Kiểm tra đúng ngày hôm nay
        if (startRemDate.getTime() === today.getTime()) {
            triggerPushNotification("⏰ HÔM NAY CÓ HẸN", r.content);
        } 
        // Kiểm tra ngày mai
        else if (startRemDate.getTime() === tomorrow.getTime()) {
            triggerPushNotification("🔔 NHẮC TRƯỚC 1 NGÀY", `Ngày mai bạn có hẹn: ${r.content}`);
        }
        
        // Xử lý nhắc theo tần suất
        if (r.frequency === "DAILY" || r.frequency === "WEEKLY" || r.frequency === "MONTHLY") {
            // Tính số ngày kể từ ngày bắt đầu đến hôm nay
            const diffDays = Math.floor((today - startRemDate) / (1000 * 60 * 60 * 24));
            
            if (r.frequency === "DAILY" && diffDays > 0 && diffDays % 1 === 0) {
                triggerPushNotification("🔄 NHẮC HÀNG NGÀY", r.content);
            } else if (r.frequency === "WEEKLY" && diffDays > 0 && diffDays % 7 === 0) {
                triggerPushNotification("🔄 NHẮC HÀNG TUẦN", r.content);
            } else if (r.frequency === "MONTHLY" && diffDays > 0 && diffDays % 30 === 0) {
                triggerPushNotification("🔄 NHẮC HÀNG THÁNG", r.content);
            }
        }
    });
} // end function checkAndTriggerReminders

function startDailyReminderCheck() {
    // Kiểm tra mỗi 30 phút
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
    }, 30 * 60 * 1000); // 30 phút
    
    // Kiểm tra ngay khi khởi động
    setTimeout(() => {
        generateRemindersInterface();
    }, 3000);
} // end function startDailyReminderCheck

function syncRemindersToSheet() {
    if (!navigator.onLine || !CONFIG.apiEndpoint) return;
    
    const tx = db.transaction("reminders", "readonly");
    const store = tx.objectStore("reminders");
    const request = store.getAll();
    
    request.onsuccess = function(e) {
        const list = e.target.result || [];
        const unsynced = list.filter(r => r.synced === 0);
        if (unsynced.length === 0) return;

        fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'syncReminders',
                data: unsynced.map(r => ({
                    content: r.content,
                    startDate: r.startDate,
                    frequency: r.frequency,
                    status: r.status || "ENABLED"
                }))
            })
        })
        .then(res => res.json())
        .then(resData => {
            if (resData.status === "success") {
                const tx2 = db.transaction("reminders", "readwrite");
                const store2 = tx2.objectStore("reminders");
                unsynced.forEach(r => {
                    r.synced = 1;
                    store2.put(r);
                });
            }
        })
        .catch(() => {});
    };
} // end function syncRemindersToSheet

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
    const themeColor = document.getElementById("setting-color")?.value || "#8BC34A";
    const root = document.documentElement;
    root.style.setProperty('--theme-color', themeColor.toLowerCase());
    root.classList.toggle("theme-yellow", /yellow|#ffeb3b/i.test(themeColor));
    
    // Tính toán màu chữ tương phản
    let r = parseInt(themeColor.slice(1,3), 16);
    let g = parseInt(themeColor.slice(3,5), 16);
    let b = parseInt(themeColor.slice(5,7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    root.style.setProperty('--text-on-theme', brightness > 150 ? '#111111' : '#ffffff');
    
    localStorage.setItem('themeColor', themeColor);
} // end function applyTheme

function loadTheme() {
    const savedDark = localStorage.getItem('darkMode');
    const isDark = savedDark !== null ? savedDark === 'true' : true;
    
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = isDark;
    
    let savedColor = localStorage.getItem('themeColor') || "#8BC34A";
    const colorSelect = document.getElementById("setting-color");
    if (colorSelect) {
        colorSelect.value = savedColor;
    }
    applyTheme();
} // end function loadTheme

// =========================================================================
// ĐỒNG BỘ TOÀN DIỆN
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

    // Bước 1: Đồng bộ transactions local lên sheet
    getAllTransactions(localTransactions => {
        const unsynced = localTransactions.filter(t => t.synced === 0);
        
        // Bước 2: Tải dữ liệu mới từ sheet
        const downloadData = () => {
            fetch(`${CONFIG.apiEndpoint}?action=getAllAppData`)
                .then(res => res.json())
                .then(resData => {
                    if (resData.status === "success" && resData.data) {
                        const serverFamily = resData.data.family || [];
                        const serverTransactions = resData.data.transactions || [];
                        const serverReminders = resData.data.reminders || [];

                        // Cập nhật family data
                        localFamilyData = serverFamily;
                        if (db) {
                            db.transaction("settings", "readwrite")
                              .objectStore("settings")
                              .put({ key: "family_data", value: serverFamily });
                        }

                        // Cập nhật transactions
                        if (db && serverTransactions.length > 0) {
                            const tx = db.transaction("transactions", "readwrite");
                            const store = tx.objectStore("transactions");
                            serverTransactions.forEach(sTx => {
                                // Kiểm tra trùng lặp bằng timestamp + amount + subtype
                                const isDuplicate = localTransactions.some(lTx => 
                                    lTx.timestamp === sTx.timestamp && 
                                    parseFloat(lTx.amount) === parseFloat(sTx.amount) &&
                                    lTx.subtype === sTx.subtype
                                );
                                if (!isDuplicate) {
                                    sTx.synced = 1;
                                    store.add(sTx);
                                }
                            });
                        }

                        // Cập nhật reminders
                        if (db && serverReminders.length > 0) {
                            const tx = db.transaction("reminders", "readwrite");
                            const store = tx.objectStore("reminders");
                            serverReminders.forEach(sRem => {
                                const isDuplicate = localReminderData.some(lRem =>
                                    lRem.startDate === sRem.ngayBatDau && 
                                    lRem.content === sRem.noiDungNhac
                                );
                                if (!isDuplicate) {
                                    store.add({
                                        content: sRem.noiDungNhac,
                                        startDate: sRem.ngayBatDau,
                                        frequency: sRem.tanSuat || "ONCE",
                                        status: sRem.trangThai || "ENABLED",
                                        synced: 1
                                    });
                                }
                            });
                        }

                        // Cập nhật thời gian sync
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
                });
        };

        // Nếu có dữ liệu chưa sync, gửi lên trước
        if (unsynced.length > 0 && CONFIG.apiEndpoint) {
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
                }
                downloadData();
            })
            .catch(() => {
                downloadData();
            });
        } else {
            downloadData();
        }
    });
} // end function syncAllDataFromSheet

function resetAppCompletely() {
    if (!confirm("⚠️ Bạn có chắc chắn muốn xóa toàn bộ lịch sử thiết bị không?\nHành động này không thể hoàn tác!")) return;
    
    // Tạo modal xác thực
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

        loadTheme();
        initFormOptions();
        renderChartsAndStats();
        generateRemindersInterface();
    };
    
    request.onerror = function(e) {
        console.error("Lỗi load settings:", e.target.error);
        loadTheme();
        initFormOptions();
        renderChartsAndStats();
        generateRemindersInterface();
    };
} // end function loadInitialSettings

// =========================================================================
// KHỞI TẠO APP
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    initDB();
});

// Xử lý online/offline
window.addEventListener('online', () => {
    syncToGoogleSheets();
    syncRemindersToSheet();
});

// end APP