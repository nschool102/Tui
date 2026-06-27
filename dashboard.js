<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ứng dụng Thu Chi</title>
    
    <!-- Thư viện bên ngoài -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-chart-treemap"></script>
    
    <!-- CSS của Dashboard -->
    <link rel="stylesheet" href="dashboard.css">
    
    <style>
        /* Style cho trang chính */
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: #f0f4f8;
            padding: 20px;
        }
        .app-header {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .btn-open-dashboard {
            padding: 14px 32px;
            background: #0b1e33;
            color: white;
            border: none;
            border-radius: 40px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: 0.2s;
        }
        .btn-open-dashboard:hover {
            background: #1f3348;
            transform: scale(1.02);
        }
        .info-text {
            margin-top: 12px;
            color: #64748b;
            font-size: 14px;
        }
        .badge {
            display: inline-block;
            background: #dcfce7;
            color: #166534;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="app-header">
        <h1 style="display:flex; align-items:center; gap:12px;">
            <i class="fas fa-wallet" style="color:#2a7de1;"></i>
            Ứng dụng Quản lý Thu Chi
            <span class="badge">v2.0</span>
        </h1>
        <p style="color:#475569; margin: 8px 0 16px;">Quản lý giao dịch và xem báo cáo chi tiết</p>
        
        <button class="btn-open-dashboard" onclick="openDashboard()">
            <i class="fas fa-chart-pie"></i> Mở Dashboard
        </button>
        <div class="info-text">
            <i class="fas fa-info-circle"></i> 
            Dữ liệu được lấy từ sheet <strong>TRANSACTIONS</strong> 
            (cấu hình trong <code>config.js</code>)
        </div>
    </div>

    <!-- Include Dashboard HTML -->
    <div id="dashboard-container">
        <!-- Nội dung từ dashboard.html sẽ được include ở đây -->
    </div>

    <!-- Scripts -->
    <script src="config.js"></script>
    <script src="dashboard.js"></script>
</body>
</html>// /Tui/dashboard.js
// ============================================================
// DASHBOARD - Sử dụng config từ config.js
// ============================================================

// Biến toàn cục
let allTransactions = [];
let filteredTransactions = [];
let chartInstances = {};
let isDataLoaded = false;

// ============================================================
// LẤY DỮ LIỆU TỪ SHEET TRANSACTIONS
// ============================================================
function loadDataFromSheet() {
    return new Promise((resolve, reject) => {
        // Kiểm tra môi trường Google Apps Script
        if (typeof google !== 'undefined' && google.script && google.script.run) {
            // Chạy trong Google Apps Script Web App
            google.script.run
                .withSuccessHandler(function(data) {
                    if (data.error) {
                        reject(new Error(data.error));
                    } else {
                        resolve(data);
                    }
                })
                .withFailureHandler(function(error) {
                    reject(error);
                })
                .getTransactions(); // Hàm này được định nghĩa trong dashboard.gs
        } else {
            // Fallback: Lấy từ localStorage (PWA / local)
            try {
                const stored = localStorage.getItem('TRANSACTIONS');
                if (stored) {
                    const data = JSON.parse(stored);
                    resolve(data);
                } else {
                    // Nếu không có dữ liệu, tạo dữ liệu mẫu từ CATEGORIES
                    const sampleData = generateSampleData();
                    localStorage.setItem('TRANSACTIONS', JSON.stringify(sampleData));
                    resolve(sampleData);
                }
            } catch (e) {
                reject(new Error('Không thể đọc dữ liệu: ' + e.message));
            }
        }
    });
}

// ============================================================
// TẠO DỮ LIỆU MẪU TỪ CATEGORIES (Sử dụng config)
// ============================================================
function generateSampleData() {
    const data = [];
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-06-27');
    const types = ['thu', 'chi'];
    
    for (let i = 0; i < 60; i++) {
        const type = types[Math.floor(Math.random() * 2)];
        const catKeys = Object.keys(CATEGORIES[type]);
        const category = catKeys[Math.floor(Math.random() * catKeys.length)];
        const subList = CATEGORIES[type][category];
        const subcategory = subList[Math.floor(Math.random() * subList.length)];
        
        const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        const timestamp = randomDate.toISOString().replace('T', ' ').substring(0, 19);
        
        let amount;
        if (type === 'thu') {
            amount = Math.round((Math.random() * 5000000 + 500000) / 1000) * 1000;
        } else {
            amount = -Math.round((Math.random() * 2000000 + 50000) / 1000) * 1000;
        }
        
        data.push({
            timestamp,
            category,
            subcategory,
            amount,
            note: `Giao dịch ${i+1}`
        });
    }
    return data;
}

// ============================================================
// XỬ LÝ DỮ LIỆU & FILTER
// ============================================================
function getDateRange(period) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(today);
    const end = new Date(today);
    
    switch(period) {
        case 'today':
            return { start: today, end: today };
        case 'week':
            start.setDate(today.getDate() - today.getDay());
            end.setDate(start.getDate() + 6);
            return { start, end };
        case 'month':
            start.setDate(1);
            end.setMonth(start.getMonth() + 1);
            end.setDate(0);
            return { start, end };
        case 'quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            start.setMonth(quarter * 3, 1);
            end.setMonth(quarter * 3 + 3, 0);
            return { start, end };
        case 'year':
            start.setMonth(0, 1);
            end.setMonth(11, 31);
            return { start, end };
        default:
            return null;
    }
}

function applyFilters() {
    const period = document.getElementById('periodFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    let filtered = [...allTransactions];
    
    // Filter by period
    if (period !== 'all') {
        const range = getDateRange(period);
        if (range) {
            filtered = filtered.filter(t => {
                const d = new Date(t.timestamp);
                return d >= range.start && d <= range.end;
            });
        }
    }
    
    // Filter by custom date
    if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0,0,0,0);
        filtered = filtered.filter(t => new Date(t.timestamp) >= from);
    }
    if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23,59,59,999);
        filtered = filtered.filter(t => new Date(t.timestamp) <= to);
    }
    
    // Filter by type
    if (typeFilter !== 'all') {
        filtered = filtered.filter(t => {
            const type = t.amount >= 0 ? 'thu' : 'chi';
            return type === typeFilter;
        });
    }
    
    filteredTransactions = filtered;
    renderDashboard();
}

function resetFilters() {
    document.getElementById('periodFilter').value = 'all';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('typeFilter').value = 'all';
    filteredTransactions = [...allTransactions];
    renderDashboard();
}

// ============================================================
// XỬ LÝ DỮ LIỆU THỐNG KÊ
// ============================================================
function processData(transactions) {
    if (!transactions || transactions.length === 0) {
        return {
            totalIncome: 0,
            totalExpense: 0,
            balance: 0,
            ratio: 0,
            transactionCount: 0,
            incomeByCategory: {},
            expenseByCategory: {},
            details: [],
            trendData: [],
            treemapData: []
        };
    }

    const income = transactions.filter(t => t.amount >= 0);
    const expense = transactions.filter(t => t.amount < 0);
    
    const totalIncome = income.reduce((s, t) => s + t.amount, 0);
    const totalExpense = Math.abs(expense.reduce((s, t) => s + t.amount, 0));
    const balance = totalIncome - totalExpense;
    const ratio = totalIncome > 0 ? (totalExpense / totalIncome * 100) : 0;
    const transactionCount = transactions.length;

    // Group by category
    const incomeByCategory = {};
    const expenseByCategory = {};
    
    income.forEach(t => {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
    });
    expense.forEach(t => {
        const cat = t.category;
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Math.abs(t.amount);
    });

    // Chi tiết theo category + subcategory
    const detailMap = {};
    transactions.forEach(t => {
        const key = `${t.category}|${t.subcategory}`;
        if (!detailMap[key]) {
            detailMap[key] = { 
                category: t.category, 
                subcategory: t.subcategory, 
                count: 0, 
                total: 0, 
                type: t.amount >= 0 ? 'thu' : 'chi' 
            };
        }
        detailMap[key].count++;
        detailMap[key].total += Math.abs(t.amount);
    });
    const details = Object.values(detailMap).sort((a, b) => b.total - a.total);

    // Monthly trend
    const months = {};
    [...income, ...expense].forEach(t => {
        const m = t.timestamp.substring(0, 7);
        if (!months[m]) months[m] = { income: 0, expense: 0 };
        if (t.amount >= 0) months[m].income += t.amount;
        else months[m].expense += Math.abs(t.amount);
    });
    const sortedMonths = Object.keys(months).sort();
    const trendData = sortedMonths.map(m => ({
        month: m,
        income: months[m].income,
        expense: months[m].expense
    }));

    // Treemap data
    const treemapData = details.map(d => ({
        category: d.category,
        subcategory: d.subcategory,
        value: d.total
    }));

    return { 
        totalIncome, totalExpense, balance, ratio, transactionCount,
        incomeByCategory, expenseByCategory, 
        details, trendData, treemapData
    };
}

// ============================================================
// RENDER DASHBOARD
// ============================================================
function renderDashboard() {
    const container = document.getElementById('dashboardContent');
    const data = processData(filteredTransactions);
    
    // Kiểm tra nếu không có dữ liệu
    if (filteredTransactions.length === 0) {
        container.innerHTML = `
            <div class="card card-full">
                <div class="no-data">
                    <i class="fas fa-inbox"></i>
                    <p>Không có dữ liệu giao dịch trong khoảng thời gian này</p>
                    <p style="font-size:13px; margin-top:8px;">Hãy thêm giao dịch hoặc thay đổi bộ lọc</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Build HTML
    container.innerHTML = `
        <!-- KPI -->
        <div class="kpi-grid">
            <div class="kpi-item">
                <div class="label">Tổng thu</div>
                <div class="value positive">${data.totalIncome.toLocaleString('vi-VN')}</div>
                <div class="sub">VNĐ</div>
            </div>
            <div class="kpi-item">
                <div class="label">Tổng chi</div>
                <div class="value negative">${data.totalExpense.toLocaleString('vi-VN')}</div>
                <div class="sub">VNĐ</div>
            </div>
            <div class="kpi-item">
                <div class="label">Số dư</div>
                <div class="value ${data.balance >= 0 ? 'positive' : 'negative'}">${data.balance.toLocaleString('vi-VN')}</div>
                <div class="sub">VNĐ</div>
            </div>
            <div class="kpi-item">
                <div class="label">Tỷ lệ chi/thu</div>
                <div class="value">${data.ratio.toFixed(1)}%</div>
                <div class="sub">${data.transactionCount} giao dịch</div>
            </div>
        </div>

        <!-- Biểu đồ 1: Thu theo nhóm -->
        <div class="card card-third">
            <h3><i class="fas fa-arrow-up" style="color:#22c55e;"></i> Thu theo nhóm</h3>
            <div class="chart-container"><canvas id="incomeChart"></canvas></div>
        </div>

        <!-- Biểu đồ 2: Chi theo nhóm -->
        <div class="card card-third">
            <h3><i class="fas fa-arrow-down" style="color:#ef4444;"></i> Chi theo nhóm</h3>
            <div class="chart-container"><canvas id="expenseChart"></canvas></div>
        </div>

        <!-- Biểu đồ 3: Treemap -->
        <div class="card card-third">
            <h3><i class="fas fa-diagram-project"></i> Treemap - Chi tiết danh mục</h3>
            <div class="chart-container treemap"><canvas id="treemapChart"></canvas></div>
        </div>

        <!-- Biểu đồ 4: Xu hướng -->
        <div class="card card-half">
            <h3><i class="fas fa-chart-line"></i> Xu hướng Thu - Chi theo tháng</h3>
            <div class="chart-container tall"><canvas id="trendChart"></canvas></div>
        </div>

        <!-- Bảng phân tích chi tiết -->
        <div class="card card-half">
            <h3><i class="fas fa-table"></i> Phân tích chi tiết theo nhóm</h3>
            <div class="detail-table-wrap" id="detailTableWrap">
                <table>
                    <thead><tr>
                        <th>Nhóm</th>
                        <th>Danh mục</th>
                        <th>Số GD</th>
                        <th>Tổng tiền</th>
                        <th>TB/GD</th>
                        <th>%</th>
                    </tr></thead>
                    <tbody id="detailTableBody"></tbody>
                </table>
            </div>
        </div>

        <!-- Giao dịch gần đây -->
        <div class="card card-full">
            <h3><i class="fas fa-history"></i> Giao dịch gần đây</h3>
            <div class="detail-table-wrap">
                <table>
                    <thead><tr>
                        <th>Thời gian</th>
                        <th>Loại</th>
                        <th>Nhóm</th>
                        <th>Danh mục</th>
                        <th>Số tiền</th>
                        <th>Ghi chú</th>
                    </tr></thead>
                    <tbody id="recentTransactionBody"></tbody>
                </table>
            </div>
        </div>
    `;

    // Render charts after DOM update
    setTimeout(() => {
        renderCharts(data);
        renderDetailTable(data);
        renderRecentTransactions(filteredTransactions);
    }, 50);
}

// ============================================================
// RENDER CHARTS (Sử dụng CHART_COLORS từ config)
// ============================================================
function renderCharts(data) {
    // Destroy old charts
    Object.values(chartInstances).forEach(c => { 
        if (c) { 
            try { c.destroy(); } catch(e) {} 
        } 
    });
    chartInstances = {};

    // 1. Income Chart
    const ctx1 = document.getElementById('incomeChart')?.getContext('2d');
    if (ctx1 && Object.keys(data.incomeByCategory).length > 0) {
        chartInstances.income = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data.incomeByCategory),
                datasets: [{
                    data: Object.values(data.incomeByCategory),
                    backgroundColor: CHART_COLORS.income.slice(0, Object.keys(data.incomeByCategory).length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } }
                }
            }
        });
    }

    // 2. Expense Chart
    const ctx2 = document.getElementById('expenseChart')?.getContext('2d');
    if (ctx2 && Object.keys(data.expenseByCategory).length > 0) {
        chartInstances.expense = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data.expenseByCategory),
                datasets: [{
                    data: Object.values(data.expenseByCategory),
                    backgroundColor: CHART_COLORS.expense.slice(0, Object.keys(data.expenseByCategory).length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } }
                }
            }
        });
    }

    // 3. Treemap Chart
    const ctx3 = document.getElementById('treemapChart')?.getContext('2d');
    if (ctx3 && data.treemapData.length > 0 && typeof ChartTreemap !== 'undefined') {
        const treeData = data.treemapData.map(d => ({
            x: d.subcategory,
            y: d.category,
            v: d.value
        }));
        
        chartInstances.treemap = new Chart(ctx3, {
            type: 'treemap',
            data: {
                datasets: [{
                    tree: treeData,
                    key: 'v',
                    groups: ['y', 'x'],
                    backgroundColor: (ctx) => {
                        const value = ctx.raw && ctx.raw.v;
                        if (!value) return '#e2e8f0';
                        const max = Math.max(...data.treemapData.map(d => d.value));
                        const ratio = value / max;
                        const red = Math.round(200 - ratio * 150);
                        const green = Math.round(200 - ratio * 50);
                        return `rgb(${red}, ${green}, 230)`;
                    },
                    borderColor: 'white',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const raw = ctx.raw;
                                if (raw && raw.v) {
                                    return `${raw.x}: ${raw.v.toLocaleString('vi-VN')} VNĐ`;
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        });
    }

    // 4. Trend Chart
    const ctx4 = document.getElementById('trendChart')?.getContext('2d');
    if (ctx4 && data.trendData.length > 0) {
        chartInstances.trend = new Chart(ctx4, {
            type: 'line',
            data: {
                labels: data.trendData.map(d => d.month),
                datasets: [
                    { 
                        label: 'Thu', 
                        data: data.trendData.map(d => d.income), 
                        borderColor: '#22c55e', 
                        backgroundColor: 'rgba(34,197,94,0.1)', 
                        fill: true, 
                        tension: 0.3,
                        pointBackgroundColor: '#22c55e'
                    },
                    { 
                        label: 'Chi', 
                        data: data.trendData.map(d => d.expense), 
                        borderColor: '#ef4444', 
                        backgroundColor: 'rgba(239,68,68,0.1)', 
                        fill: true, 
                        tension: 0.3,
                        pointBackgroundColor: '#ef4444'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { 
                            callback: v => v.toLocaleString('vi-VN'),
                            font: { size: 10 }
                        } 
                    },
                    x: { ticks: { font: { size: 10 } } }
                }
            }
        });
    }
}

// ============================================================
// RENDER BẢNG CHI TIẾT
// ============================================================
function renderDetailTable(data) {
    const tbody = document.getElementById('detailTableBody');
    if (!tbody) return;
    
    const total = data.totalIncome + data.totalExpense;
    if (data.details.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Không có dữ liệu</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.details.slice(0, 20).map(d => {
        const pct = total > 0 ? (d.total / total * 100) : 0;
        return `<tr>
            <td><strong>${d.category}</strong></td>
            <td>${d.subcategory}</td>
            <td>${d.count}</td>
            <td style="font-weight:600; color:${d.type === 'thu' ? '#22c55e' : '#ef4444'}">${d.total.toLocaleString('vi-VN')}</td>
            <td>${Math.round(d.total/d.count).toLocaleString('vi-VN')}</td>
            <td>${pct.toFixed(1)}%</td>
        </tr>`;
    }).join('');
}

function renderRecentTransactions(transactions) {
    const tbody = document.getElementById('recentTransactionBody');
    if (!tbody) return;
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Không có giao dịch</td></tr>';
        return;
    }
    
    const sorted = [...transactions].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 15);
    tbody.innerHTML = sorted.map(t => {
        const isIncome = t.amount >= 0;
        return `<tr>
            <td>${t.timestamp}</td>
            <td><span class="tag ${isIncome ? 'income' : 'expense'}">${isIncome ? 'Thu' : 'Chi'}</span></td>
            <td>${t.category}</td>
            <td>${t.subcategory}</td>
            <td style="color:${isIncome ? '#22c55e' : '#ef4444'}; font-weight:600;">${t.amount.toLocaleString('vi-VN')}</td>
            <td>${t.note || ''}</td>
        </tr>`;
    }).join('');
}

// ============================================================
// MỞ / ĐÓNG / REFRESH
// ============================================================
async function openDashboard() {
    const modal = document.getElementById('dashboardModal');
    const loading = document.getElementById('loadingOverlay');
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Hiển thị loading
    loading.classList.remove('hidden');
    document.getElementById('dashboardContent').innerHTML = '';
    
    try {
        // Load dữ liệu từ sheet
        const data = await loadDataFromSheet();
        allTransactions = data;
        filteredTransactions = [...allTransactions];
        isDataLoaded = true;
        
        // Render dashboard
        renderDashboard();
    } catch (error) {
        console.error('Lỗi tải dữ liệu:', error);
        document.getElementById('dashboardContent').innerHTML = `
            <div class="card card-full">
                <div class="no-data">
                    <i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i>
                    <p>Không thể tải dữ liệu từ sheet</p>
                    <p style="font-size:13px; margin-top:8px; color:#ef4444;">${error.message}</p>
                    <button onclick="refreshData()" style="margin-top:16px; padding:10px 24px; background:#2a7de1; color:white; border:none; border-radius:8px; cursor:pointer;">
                        <i class="fas fa-sync"></i> Thử lại
                    </button>
                </div>
            </div>
        `;
    } finally {
        loading.classList.add('hidden');
    }
}

function closeDashboard() {
    const modal = document.getElementById('dashboardModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Destroy charts để giải phóng bộ nhớ
    Object.values(chartInstances).forEach(c => { 
        if (c) { 
            try { c.destroy(); } catch(e) {} 
        } 
    });
    chartInstances = {};
}

async function refreshData() {
    const loading = document.getElementById('loadingOverlay');
    loading.classList.remove('hidden');
    
    try {
        const data = await loadDataFromSheet();
        allTransactions = data;
        filteredTransactions = [...allTransactions];
        renderDashboard();
    } catch (error) {
        console.error('Lỗi refresh:', error);
        alert('Không thể tải lại dữ liệu: ' + error.message);
    } finally {
        loading.classList.add('hidden');
    }
}

// ============================================================
// KHỞI TẠO - Thêm sự kiện
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Đóng modal khi click overlay
    const modal = document.getElementById('dashboardModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeDashboard();
        });
    }

    // Phím ESC để đóng modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('dashboardModal');
            if (modal && modal.classList.contains('active')) {
                closeDashboard();
            }
        }
    });
});

console.log('Dashboard loaded! Using config from config.js');