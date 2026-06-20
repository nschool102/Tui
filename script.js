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

// ==========================================================================
// KẾT NỐI INDEXEDDB
// ==========================================================================
function initDB() {
    const request = indexedDB.open("FamilyFinancePWA", 3);
    request.onupgradeneeded = function(e) {
        db = e.target.result;
        if (!db.objectStoreNames.contains("transactions")) db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
        if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
        if (!db.objectStoreNames.contains("reminders")) db.createObjectStore("reminders", { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = function(e) {
        db = e.target.result;
        loadInitialSettings();
        requestNotificationPermission();
    };
}

// ==========================================================================
// KHỞI TẠO ĐĂNG KÝ SỰ KIỆN (DOM EVENTS)
// ==========================================================================
function setupEventListeners() {
    // Sự kiện Click Tab điều hướng công khai
    document.getElementById("main-nav-tabs").addEventListener("click", function(e) {
        const btn = e.target.closest(".tab-btn");
        if (btn) {
            const tabName = btn.getAttribute("data-tab");
            switchTab(tabName);
        }
    });

    // Cập nhật Subtype khi thay đổi Type
    document.getElementById("chi-type").addEventListener("change", () => updateSubtypes('chi'));
    document.getElementById("thu-type").addEventListener("change", () => updateSubtypes('thu'));

    // Gửi Form dữ liệu
    document.getElementById("form-chi").addEventListener("submit", (e) => saveTransaction(e, 'chi'));
    document.getElementById("form-thu").addEventListener("submit", (e) => saveTransaction(e, 'thu'));
    document.getElementById("form-nhachen").addEventListener("submit", (e) => saveReminder(e));

    // Định dạng tiền tệ thời gian thực khi gõ
    document.getElementById("chi-amount").addEventListener("input", (e) => formatCurrency(e.target));
    document.getElementById("thu-amount").addEventListener("input", (e) => formatCurrency(e.target));

    // Đổi bộ lọc thời gian Top chi tiêu
    document.getElementById("chi-top-period").addEventListener("change", () => renderTopExpenses());
    document.getElementById("sec4-period").addEventListener("change", () => renderSection4());

    // Các tính năng tùy chọn khác
    document.getElementById("rem-frequency").addEventListener("change", toggleCustomReminderFields);
    document.getElementById("btn-verify-family").addEventListener("click", verifyFamilyAuth);
    document.getElementById("btn-close-modal").addEventListener("click", closeModal);
    document.getElementById("darkModeToggle").addEventListener("change", (e) => toggleDarkMode(e.target.checked));
    document.getElementById("setting-color").addEventListener("change", applyTheme);
    document.getElementById("btn-sync-data").addEventListener("click", syncAllDataFromSheet);
    document.getElementById("btn-reset-app").addEventListener("click", resetAppCompletely);
    document.getElementById("scrollTopBtn").addEventListener("click", scrollToTop);
}

// ==========================================================================
// ĐIỀU HƯỚNG TABS THÔNG MINH
// ==========================================================================
function switchTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add("active");
    
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add("active");
    
    if (tabName === 'chi' || tabName === 'thongke') renderChartsAndStats();
    if (tabName === 'family') checkFamilyTabAccess();
    if (tabName === 'nhachen') generateRemindersInterface();
}

// ==========================================================================
// XỬ LÝ FORMAT & LIÊN KẾT DANH MỤC SELECTBOX
// ==========================================================================
function formatCurrency(input) {
    let value = input.value.replace(/[^0-9.]/g, "");
    let parts = value.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    input.value = parts.join(".");
}
function parseCurrency(str) { return str ? parseFloat(str.replace(/,/g, "")) : 0; }
function formatVND(num) { return num.toLocaleString('en-US') + " đ"; }

function updateSubtypes(mode) {
    const typeSelect = document.getElementById(`${mode}-type`);
    const subtypeSelect = document.getElementById(`${mode}-subtype`);
    if (!typeSelect || !subtypeSelect) return;
    const selectedType = typeSelect.value;
    
    subtypeSelect.innerHTML = "";
    if (CATEGORIES[mode] && CATEGORIES[mode][selectedType]) {
        CATEGORIES[mode][selectedType].forEach(sub => {
            let opt = document.createElement("option");
            opt.value = sub; opt.textContent = sub;
            subtypeSelect.appendChild(opt);
        });
    }
}

function initFormOptions() {
    ['chi', 'thu'].forEach(mode => {
        const typeSelect = document.getElementById(`${mode}-type`);
        if (!typeSelect) return;
        typeSelect.innerHTML = "";
        Object.keys(CATEGORIES[mode]).forEach(type => {
            let opt = document.createElement("option");
            opt.value = type; opt.textContent = type;
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
}

function initColorSettings() {
    const sColor = document.getElementById("setting-color");
    if (!sColor || sColor.children.length > 0) return;
    const textNames = ["Xanh Lá", "Xanh Bơ", "Xanh Dương", "Hồng", "Tím", "Đỏ", "Cam", "Vàng"];
    PALETTE.forEach((hex, i) => {
        let opt = document.createElement("option");
        opt.value = hex; opt.textContent = textNames[i];
        sColor.appendChild(opt);
    });
}

// ==========================================================================
// QUẢN LÝ DỮ LIỆU THU CHI (TRANSACTIONS)
// ==========================================================================
function saveTransaction(event, mode) {
    event.preventDefault();
    const type = document.getElementById(`${mode}-type`).value;
    const subtype = document.getElementById(`${mode}-subtype`).value;
    let amount = parseCurrency(document.getElementById(`${mode}-amount`).value);
    const dateVal = document.getElementById(`${mode}-date`).value;
    const note = document.getElementById(`${mode}-note`).value;
    
    if (mode === 'chi') amount = -Math.abs(amount);

    const transaction = {
        timestamp: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
        type: type, subtype: subtype, amount: amount, note: note || "", synced: 0
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
}

function getAllTransactions(callback) {
    if (!db) return;
    db.transaction("transactions", "readonly").objectStore("transactions").getAll().onsuccess = function(e) {
        callback(e.target.result);
    };
}

function syncToGoogleSheets() {
    if (!navigator.onLine || isSyncing || !CONFIG.apiEndpoint) return;
    getAllTransactions(transactions => {
        const unsynced = transactions.filter(t => t.synced === 0);
        if (unsynced.length === 0) return;
        isSyncing = true;
        fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'syncTransactions', data: unsynced })
        })
        .then(res => res.json())
        .then(resData => {
            if (resData.status === "success") {
                const tx = db.transaction("transactions", "readwrite");
                const store = tx.objectStore("transactions");
                unsynced.forEach(t => { t.synced = 1; store.put(t); });
                renderChartsAndStats(); 
            }
            isSyncing = false; 
        }).catch(() => { isSyncing = false; });
    });
}
window.addEventListener('online', syncToGoogleSheets);

// ==========================================================================
// VẼ ĐỒ THỊ VÀ THỐNG KÊ (CHARTS & STATS)
// ==========================================================================
function renderPieChart(canvasId, labels, dataset, customColors = null) {
    if (charts[canvasId]) charts[canvasId].destroy();
    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    let total = dataset.reduce((a, b) => a + Math.abs(b), 0);
    let defaultColors = ['#4CAF50', '#F44336', '#FF9800', '#2196F3', '#9C27B0', '#E91E63'];
    
    charts[canvasId] = new Chart(ctx, {
        type: 'pie',
        data: { labels: labels, datasets: [{ data: dataset, backgroundColor: customColors || defaultColors }] },
        plugins: [ChartDataLabels], 
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true, position: 'top',
                    labels: {
                        color: function(context) {
                            const bgColors = context.chart.data.datasets[0].backgroundColor;
                            return bgColors[context.index] || '#ffffff';
                        },
                        font: { size: 13, weight: 'bold' }, padding: 12
                    }
                },
                datalabels: {
                    color: ctx => { let c = ctx.dataset.backgroundColor[ctx.dataIndex]; return (c === '#FFEB3B' || c === '#8BC34A') ? '#111111' : '#ffffff'; },
                    font: { weight: 'bold', size: 12 }, anchor: 'center', align: 'center',
                    formatter: (value) => { return (total > 0 && (Math.abs(value) / total * 100) > 3) ? (Math.abs(value) / total * 100).toFixed(1) + "%" : ''; }
                },
                tooltip: {
                    callbacks: { label: ctx => ctx.label + ": " + Math.abs(ctx.raw).toLocaleString() + " (" + (total > 0 ? (Math.abs(ctx.raw) / total * 100).toFixed(1) + "%" : "0%") + ")" }
                }
            }
        }
    });
}

function renderChartsAndStats() {
    getAllTransactions(data => {
        let totalThu = 0, totalChi = 0, sum_Tiger = 0, sum_Mine = 0;
        let catCurrentMonth = { "Tổng": 0, "Ăn uống": 0, "Đồ chơi": 0, "Mỹ phẩm": 0, "Quần áo": 0 };
        let catPrevMonth = { "Tổng": 0, "Ăn uống": 0, "Đồ chơi": 0, "Mỹ phẩm": 0, "Quần áo": 0 };
        const now = new Date(), cM = now.getMonth(), cY = now.getFullYear();
        let pM = cM - 1, pY = cY; if (pM < 0) { pM = 11; pY--; }

        let sortedData = [...data].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        let expList = sortedData.filter(t => t.amount < 0).slice(0, 20);
        let incList = sortedData.filter(t => t.amount > 0).slice(0, 20);

        // Render bảng Lịch sử Chi
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
        } else if (expContainer) expContainer.innerHTML = "Chưa có khoản chi nào.";
        
        // Render bảng Lịch sử Thu
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
        } else if (incContainer) incContainer.innerHTML = "Chưa có khoản thu nào.";

        data.forEach(t => {
            const tDate = new Date(t.timestamp), amt = t.amount;
            if (amt > 0) {
                totalThu += amt;
                if (t.type === "CON CỢP") sum_Tiger += amt;
                if (t.type === "Lương" || t.type === "Thưởng") sum_Mine += amt;
            } else {
                totalChi += Math.abs(amt);
                let absAmt = Math.abs(amt);
                if (tDate.getFullYear() === cY && tDate.getMonth() === cM) {
                    catCurrentMonth["Tổng"] += absAmt;
                    if (t.subtype === "Đi chợ, siêu thị" || t.type === "Giải trí") catCurrentMonth["Ăn uống"] += absAmt;
                    if (t.subtype === "Đồ chơi") catCurrentMonth["Đồ chơi"] += absAmt;
                    if (t.subtype === "Mỹ phẩm") catCurrentMonth["Mỹ phẩm"] += absAmt;
                    if (t.subtype === "Quần áo") catCurrentMonth["Quần áo"] += absAmt;
                } else if (tDate.getFullYear() === pY && tDate.getMonth() === pM) {
                    catPrevMonth["Tổng"] += absAmt;
                    if (t.subtype === "Đi chợ, siêu thị" || t.type === "Giải trí") catPrevMonth["Ăn uống"] += absAmt;
                    if (t.subtype === "Đồ chơi") catPrevMonth["Đồ chơi"] += absAmt;
                    if (t.subtype === "Mỹ phẩm") catPrevMonth["Mỹ phẩm"] += absAmt;
                    if (t.subtype === "Quần áo") catPrevMonth["Quần áo"] += absAmt;
                }
            }
        });

        renderPieChart('chart-chi-overview', ['Tổng Thu', 'Tổng Chi'], [totalThu, totalChi]);
        renderTopExpenses();

        const alertDiv = document.getElementById("section1-alerts");
        if (alertDiv) {
            alertDiv.innerHTML = "";
            Object.keys(catCurrentMonth).forEach(cat => {
                let cur = catCurrentMonth[cat], prev = catPrevMonth[cat];
                if (prev > 0 && cur > prev) alertDiv.innerHTML += `<div class="alert-box">Hạng mục <strong>${cat}</strong> chi vượt <strong>${((cur - prev) / prev * 100).toFixed(1)}%</strong> so với tháng trước!</div>`;
            });
            if (!alertDiv.innerHTML) alertDiv.innerHTML = "<p style='color:green;'>An toàn! Không có hạng mục nào chi vượt tháng trước.</p>";
        }

        if (document.getElementById("sec2-thu")) document.getElementById("sec2-thu").textContent = formatVND(totalThu);
        if (document.getElementById("sec2-chi")) document.getElementById("sec2-chi").textContent = formatVND(totalChi);
        if (document.getElementById("sec2-remain")) document.getElementById("sec2-remain").textContent = formatVND(totalThu - totalChi);
        renderPieChart('chart-sec2-pie', ['Tổng Thu', 'Tổng Chi'], [totalThu, totalChi]);

        if (document.getElementById("sec3-Mine")) document.getElementById("sec3-Mine").textContent = formatVND(sum_Mine);
        if (document.getElementById("sec3-Tiger")) document.getElementById("sec3-Tiger").textContent = formatVND(sum_Tiger);
        renderPieChart('chart-sec3-pie', ['MÌNH', 'CON CỢP'], [sum_Mine, sum_Tiger], ['#8BC34A', '#E91E63']);

        renderSection4(data);
    });
}

function renderTopExpenses() {
    const periodSelect = document.getElementById("chi-top-period");
    if (!periodSelect) return;
    const period = periodSelect.value, now = new Date();
    
    getAllTransactions(data => {
        let filtered = data.filter(t => t.amount < 0).filter(t => {
            let d = new Date(t.timestamp);
            if (period === 'week') return (now - d) <= 7 * 24 * 60 * 60 * 1000;
            if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            if (period === 'year') return d.getFullYear() === now.getFullYear();
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
}

function renderSection4(allData) {
    const periodSelect = document.getElementById("sec4-period");
    if (!periodSelect) return;
    const period = periodSelect.value;
    
    const run = data => {
        const now = new Date(); let currentBalance = 0, totalThu = 0, fullChi = 0, investmentSavings = 0;
        data.forEach(t => {
            let d = new Date(t.timestamp); currentBalance += t.amount; 
            let isMatch = (period === 'month') ? (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) : (d.getFullYear() === now.getFullYear());
            if (isMatch) {
                if (t.amount > 0) totalThu += t.amount;
                else {
                    if (t.type === "Đầu tư, tiết kiệm") investmentSavings += Math.abs(t.amount);
                    else fullChi += Math.abs(t.amount);
                }
            }
        });

        if (document.getElementById("sec4-balance")) document.getElementById("sec4-balance").textContent = formatVND(currentBalance);
        if (document.getElementById("sec4-thu")) document.getElementById("sec4-thu").textContent = formatVND(totalThu);
        if (document.getElementById("sec4-net-chi")) document.getElementById("sec4-net-chi").textContent = formatVND(fullChi);
        if (document.getElementById("sec4-savings")) document.getElementById("sec4-savings").textContent = formatVND(investmentSavings);
        renderPieChart('chart-sec4-pie', ['Tổng Thu', 'Tổng Chi Thực Tế', 'Tiết Kiệm'], [totalThu, fullChi, investmentSavings], ['#4CAF50', '#F44336', '#FFEB3B']);
    };
    if (allData) run(allData); else getAllTransactions(run);
}

// ==========================================================================
// BẢO MẬT & HIỂN THỊ LÝ LỊCH GIA ĐÌNH (FAMILY)
// ==========================================================================
function checkFamilyTabAccess() {
    const isUnlocked = localStorage.getItem("family_unlocked") === "true";
    const authView = document.getElementById("family-auth-view");
    const mainView = document.getElementById("family-main-view");
    if (!authView || !mainView) return;

    if (isUnlocked) {
        authView.style.setProperty("display", "none", "important");
        mainView.style.setProperty("display", "block", "important");
        generateFamilyInterface();
    } else {
        authView.style.setProperty("display", "block", "important");
        mainView.style.setProperty("display", "none", "important");
    }
}

function verifyFamilyAuth() {
    const inputPass = document.getElementById("family-password").value;
    if (!inputPass.trim()) { alert("Vui lòng nhập mật khẩu!"); return; }
    fetch(`${CONFIG.apiEndpoint}?action=checkResetPassword&password=${encodeURIComponent(inputPass.trim())}`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "success" && res.match === true) {
                localStorage.setItem("family_unlocked", "true");
                checkFamilyTabAccess();
            } else alert("Mật khẩu không khớp!");
        }).catch(() => { alert("Không thể kết nối xác thực!"); });
}

function generateFamilyInterface() {
    const container = document.getElementById("family-buttons-container");
    if (!container) return;
    if (localFamilyData && localFamilyData.length > 0) { renderFamilyGrid(localFamilyData); return; }
    
    container.innerHTML = "<p style='color: #aaa; text-align: center;'>🔄 Đang tải dữ liệu...</p>";
    fetch(`${CONFIG.apiEndpoint}?action=getFamilyData`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "success" && res.data) {
                localFamilyData = res.data;
                if (db) db.transaction("settings", "readwrite").objectStore("settings").put({ key: "family_data", value: res.data });
                renderFamilyGrid(res.data);
            } else container.innerHTML = "<p style='color: #aaa; text-align: center;'>📭 Chưa có dữ liệu.</p>";
        }).catch(() => { container.innerHTML = "<p style='color: #f44336; text-align: center;'>❌ Lỗi kết nối!</p>"; });
}

function renderFamilyGrid(members) {
    const container = document.getElementById("family-buttons-container");
    if (!container) return; 
    container.innerHTML = "";
    
    members.forEach(m => {
        let btn = document.createElement("button"); 
        btn.className = "member-btn"; 
        btn.textContent = m.nickname || m.fullname; 
        btn.onclick = () => showFamilyModal(m);
        container.appendChild(btn);
    });
}

function showFamilyModal(m) {
    const fields = [
        { l: "Biệt danh", v: m.nickname || "-" }, { l: "Họ tên", v: m.fullname || "-" }, { l: "Ngày sinh", v: m.dob || "-" }, { l: "Nơi sinh", v: m.noisinh || "-" }, { l: "Địa chỉ", v: m.diachi || "-" },
        { l: "CCCD: Số", v: m.cccd?.so || "-" }, { l: "CCCD: Ngày cấp", v: m.cccd?.ngaycap || "-" }, { l: "CCCD: Ngày hết hạn", v: m.cccd?.ngayhethan || "-" }, { l: "CCCD: Nơi cấp", v: m.cccd?.noicap || "-" },
        { l: "Hộ chiếu: Số", v: m.hochieu?.so || "-" }, { l: "Hộ chiếu: Ngày cấp", v: m.hochieu?.ngaycap || "-" }, { l: "Hộ chiếu: Ngày hết hạn", v: m.hochieu?.ngayhethan || "-" }, { l: "Hộ chiếu: Nơi cấp", v: m.hochieu?.noicap || "-" },
        { l: "Thẻ BHYT", v: m.bhyt || "-" }, { l: "Mã số BHXH", v: m.bhxh || "-" }, { l: "Mã số thuế", v: m.masothue || "-" }, 
        { l: "LLTP: Số", v: m.lltp?.so || "-" }, { l: "LLTP: Ngày cấp", v: m.lltp?.ngaycap || "-" }, { l: "LLTP: Nơi cấp", v: m.lltp?.noicap || "-" }
    ];
    const detailsDiv = document.getElementById("modal-member-details");
    if (!detailsDiv) return; detailsDiv.innerHTML = ""; let fullBlockText = "";
    
    let lastGroup = ""; 
    fields.forEach(f => {
        fullBlockText += `${f.l}: ${f.v}\n`;
        let currentGroup = "";
        let cleanLabel = f.l;
        
        if (f.l.startsWith("CCCD:")) { currentGroup = "CCCD"; cleanLabel = f.l.replace("CCCD:", "").trim(); } 
        else if (f.l.startsWith("Hộ chiếu:")) { currentGroup = "Hộ chiếu"; cleanLabel = f.l.replace("Hộ chiếu:", "").trim(); } 
        else if (f.l.startsWith("LLTP:")) { currentGroup = "Lí lịch tư pháp"; cleanLabel = f.l.replace("LLTP:", "").trim(); }

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
        
        row.onclick = () => { if (f.v !== "-") { navigator.clipboard.writeText(f.v); alert(`Đã copy: ${f.v}`); } };
        detailsDiv.appendChild(row);
    });
    
    document.getElementById("btn-copy-all").onclick = () => { navigator.clipboard.writeText(fullBlockText); alert("Đã copy toàn bộ thông tin lí lịch!"); };
    document.getElementById("familyModal").style.display = "flex";
}
function closeModal() { document.getElementById("familyModal").style.display = "none"; }

// ==========================================================================
// TÍNH NĂNG NHẮC HẸN & THÔNG BÁO ĐẨY (REMINDERS)
// ==========================================================================
function initReminderDateOptions() {
    const dSel = document.getElementById("rem-day");
    const mSel = document.getElementById("rem-month");
    const ySel = document.getElementById("rem-year");
    if (!dSel || !mSel || !ySel) return;

    dSel.innerHTML = ""; mSel.innerHTML = ""; ySel.innerHTML = "";
    for (let i = 1; i <= 31; i++) dSel.innerHTML += `<option value="${i}">${String(i).padStart(2,'0')}</option>`;
    for (let i = 1; i <= 12; i++) mSel.innerHTML += `<option value="${i}">Tháng ${String(i).padStart(2,'0')}</option>`;
    
    const currYear = new Date().getFullYear();
    for (let i = currYear; i <= currYear + 5; i++) ySel.innerHTML += `<option value="${i}">Năm ${i}</option>`;

    const today = new Date();
    dSel.value = today.getDate();
    mSel.value = today.getMonth() + 1;
    ySel.value = today.getFullYear();
}

function toggleCustomReminderFields() {
    const freq = document.getElementById("rem-frequency").value;
    const customBox = document.getElementById("custom-reminder-fields");
    if (customBox) customBox.style.display = (freq === "CUSTOM") ? "block" : "none";
}

function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function triggerPushNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: body, icon: "favicon.ico" });
    }
}

function saveReminder(event) {
    event.preventDefault();
    const content = document.getElementById("rem-content").value.trim();
    const day = document.getElementById("rem-day").value;
    const month = document.getElementById("rem-month").value;
    const year = document.getElementById("rem-year").value;
    const frequency = document.getElementById("rem-frequency").value;
    
    let everyVal = ""; let everyUnit = "";
    if (frequency === "CUSTOM") {
        everyVal = document.getElementById("rem-every-val").value;
        everyUnit = document.getElementById("rem-every-unit").value;
    }

    const startDateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const reminderItem = {
        content: content, startDate: startDateStr, frequency: frequency,
        everyVal: everyVal, everyUnit: everyUnit, synced: 0
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
}

function generateRemindersInterface() {
    const container = document.getElementById("reminder-list-container");
    if (!container) return;
    if (!db) { container.innerHTML = "Lỗi cơ sở dữ liệu."; return; }
    
    db.transaction("reminders", "readonly").objectStore("reminders").getAll().onsuccess = function(e) {
        const list = e.target.result || [];
        localReminderData = list;
        renderRemindersList(list);
        checkAndTriggerReminders(list);
    };
}

function renderRemindersList(list) {
    const container = document.getElementById("reminder-list-container");
    if (!container) return;
    if (list.length === 0) {
        container.innerHTML = "<p style='color: #aaa; text-align: center;'>📭 Chưa có lịch nhắc hẹn nào.</p>";
        return;
    }

    let html = `<table class="history-table"><thead><tr><th>Nội dung</th><th>Ngày bắt đầu</th><th>Tần suất</th></tr></thead><tbody>`;
    list.forEach(r => {
        let freqText = r.frequency;
        if (r.frequency === "CUSTOM") freqText = `Mỗi ${r.everyVal} ${r.everyUnit}`;
        let dateParts = r.startDate.split("-");
        let displayDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        html += `<tr><td style="font-weight:600; color:var(--theme-color);">${r.content}</td><td>${displayDate}</td><td><small class="theme-bg" style="padding:2px 6px; border-radius:4px; font-size:0.75rem;">${freqText}</small></td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function checkAndTriggerReminders(reminders) {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    reminders.forEach(r => {
        const startRemDate = new Date(r.startDate); startRemDate.setHours(0,0,0,0);
        if (startRemDate.getTime() === today.getTime()) {
            triggerPushNotification("⏰ HÔM NAY CÓ HẸN", r.content);
        } else if (startRemDate.getTime() === tomorrow.getTime()) {
            triggerPushNotification("🔔 NHẮC TRƯỚC 1 NGÀY", `Ngày mai bạn có hẹn: ${r.content}`);
        }
    });
}

function syncRemindersToSheet() {
    if (!navigator.onLine || !CONFIG.apiEndpoint) return;
    db.transaction("reminders", "readonly").objectStore("reminders").getAll().onsuccess = function(e) {
        const list = e.target.result || [];
        const unsynced = list.filter(r => r.synced === 0);
        if (unsynced.length === 0) return;

        fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'syncReminders', data: unsynced })
        })
        .then(res => res.json())
        .then(resData => {
            if (resData.status === "success") {
                const tx = db.transaction("reminders", "readwrite");
                const store = tx.objectStore("reminders");
                unsynced.forEach(r => { r.synced = 1; store.put(r); });
            }
        }).catch(()=>{});
    });
}

// ==========================================================================
// CÀI ĐẶT GIAO DIỆN (THEMES)
// ==========================================================================
function toggleDarkMode(enable) {
    document.documentElement.setAttribute('data-theme', enable ? 'dark' : 'light');
    localStorage.setItem('darkMode', enable ? 'true' : 'false');
    const colorInput = document.getElementById("setting-color");
    if (colorInput) { 
        const slider = document.querySelector('.slider'); 
        if (slider) slider.style.backgroundColor = enable ? colorInput.value : '#ccc'; 
    }
}

function applyTheme() {
    const themeColor = document.getElementById("setting-color")?.value || "#8BC34A";
    const root = document.documentElement;
    root.style.setProperty('--theme-color', themeColor.toLowerCase());
    root.classList.toggle("theme-yellow", /yellow|#ffeb3b/i.test(themeColor));
    
    let r = parseInt(themeColor.slice(1,3),16), g = parseInt(themeColor.slice(3,5),16), b = parseInt(themeColor.slice(5,7),16);
    root.style.setProperty('--text-on-theme', ((r*299 + g*587 + b*114)/1000) > 150 ? '#111111' : '#ffffff');
    localStorage.setItem('themeColor', themeColor);
}

function loadTheme() {
    const savedDark = localStorage.getItem('darkMode');
    const isDark = savedDark !== null ? savedDark === 'true' : true; 
    
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (document.getElementById('darkModeToggle')) document.getElementById('darkModeToggle').checked = isDark;
    
    let savedColor = localStorage.getItem('themeColor') || "#8BC34A";
    if (document.getElementById("setting-color")) {
        document.getElementById("setting-color").value = savedColor;
    }
    applyTheme();
}

// ==========================================================================
// ĐỒNG BỘ TOÀN DIỆN (FULL SYSTEM SYNC)
// ==========================================================================
function syncAllDataFromSheet() {
    if (!navigator.onLine) { alert("Thiết bị đang ngoại tuyến!"); return; }
    const syncBtn = document.getElementById("btn-sync-data"); 
    const originalText = syncBtn.innerHTML;
    
    syncBtn.disabled = true; 
    syncBtn.innerHTML = "⏳ Đang đồng bộ toàn diện..."; 
    syncBtn.style.opacity = "0.7";

    getAllTransactions(localTransactions => {
        const unsynced = localTransactions.filter(t => t.synced === 0);
        
        const proceedToDownload = () => {
            fetch(`${CONFIG.apiEndpoint}?action=getAllAppData`)
            .then(res => res.json())
            .then(resData => {
                if (resData.status === "success" && resData.data) {
                    const serverFamily = resData.data.family || [];
                    const serverTransactions = resData.data.transactions || [];
                    const serverReminders = resData.data.reminders || [];

                    localFamilyData = serverFamily;
                    if (db) db.transaction("settings", "readwrite").objectStore("settings").put({ key: "family_data", value: serverFamily });

                    if (db && serverTransactions.length > 0) {
                        const tx = db.transaction("transactions", "readwrite");
                        const store = tx.objectStore("transactions");
                        serverTransactions.forEach(sTx => {
                            const isDuplicate = localTransactions.some(lTx => 
                                lTx.timestamp === sTx.timestamp && parseFloat(lTx.amount) === parseFloat(sTx.amount)
                            );
                            if (!isDuplicate) { sTx.synced = 1; store.add(sTx); }
                        });
                    }

                    if (db && serverReminders.length > 0) {
                        const tx = db.transaction("reminders", "readwrite");
                        const store = tx.objectStore("reminders");
                        serverReminders.forEach(sRem => {
                            const isDuplicate = localReminderData.some(lRem =>
                                lRem.startDate === sRem.startDate && lRem.content === sRem.content
                            );
                            if (!isDuplicate) { sRem.synced = 1; store.add(sRem); }
                        });
                    }

                    const now = new Date();
                    const timeString = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    if (document.getElementById("sync-status")) document.getElementById("sync-status").innerHTML = `Last sync: ${timeString}`;
                    if (db) db.transaction("settings", "readwrite").objectStore("settings").put({ key: "last_sync_time", value: timeString });
                    
                    alert("✅ Đồng bộ thành công! Đã tải Thu/Chi, Nhắc Hẹn và Lý lịch gia đình mới nhất.");
                } else alert("⚠️ Đồng bộ xong nhưng định dạng dữ liệu không đúng.");
            })
            .catch(() => { alert("❌ Lỗi kết nối! Không thể tải dữ liệu từ Google Sheet xuống."); })
            .finally(() => {
                syncBtn.disabled = false; syncBtn.innerHTML = originalText; syncBtn.style.opacity = "1";
                initFormOptions(); renderChartsAndStats(); generateRemindersInterface();
            });
        };

        if (unsynced.length > 0 && CONFIG.apiEndpoint) {
            fetch(CONFIG.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'syncTransactions', data: unsynced })
            })
            .then(res => res.json())
            .then(resData => {
                if (resData.status === "success") {
                    const tx = db.transaction("transactions", "readwrite");
                    const store = tx.objectStore("transactions");
                    unsynced.forEach(t => { t.synced = 1; store.put(t); });
                }
                proceedToDownload();
            }).catch(() => { proceedToDownload(); });
        } else proceedToDownload();
    });
}

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
        if (!passVal.trim()) { alert("Vui lòng không để trống mật khẩu!"); return; }
        
        fetch(`${CONFIG.apiEndpoint}?action=checkResetPassword&password=${encodeURIComponent(passVal.trim())}`)
            .then(res => res.json())
            .then(res => {
                if (res.status === "success" && res.match === true) {
                    mask.remove(); localStorage.clear(); 
                    if (window.indexedDB) indexedDB.deleteDatabase("FamilyFinancePWA");
                    alert("🗑️ Đã xóa sạch dữ liệu thiết bị và đặt lại ứng dụng thành công!"); 
                    window.location.reload(true); 
                } else alert("❌ Mật khẩu xác nhận không chính xác!");
            }).catch(() => { alert("Lỗi kết nối đến máy chủ xác thực!"); });
    };
}

window.onscroll = function() {
    const btn = document.getElementById("scrollTopBtn");
    if (btn) btn.style.display = (document.body.scrollTop > 250 || document.documentElement.scrollTop > 250) ? "flex" : "none";
};
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

function loadInitialSettings() {
    db.transaction("settings", "readonly").objectStore("settings").getAll().onsuccess = function(e) {
        const results = e.target.result || [];
        const savedFamily = results.find(item => item.key === "family_data");
        if (savedFamily) localFamilyData = savedFamily.value;

        const lastSync = results.find(item => item.key === "last_sync_time");
        if (lastSync && document.getElementById("sync-status")) document.getElementById("sync-status").innerHTML = `Last sync: ${lastSync.value}`;

        loadTheme();
        initFormOptions(); 
        renderChartsAndStats();
        generateRemindersInterface();
    };
}

// Khi tài liệu load xong, kích hoạt lắng nghe sự kiện
document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    initDB();
});