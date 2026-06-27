// dashboard.gs
// ============================================================
// GOOGLE APPS SCRIPT - LẤY DỮ LIỆU CHO DASHBOARD
// ============================================================

/**
 * Lấy tất cả giao dịch từ sheet TRANSACTIONS
 * @returns {Array|Object} Mảng các giao dịch hoặc object lỗi
 */
function getTransactions() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('TRANSACTIONS');
        
        if (!sheet) {
            return { error: 'Sheet TRANSACTIONS không tồn tại' };
        }
        
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return []; // Không có dữ liệu
        }
        
        // Lấy dữ liệu từ cột A đến E, bắt đầu từ hàng 2
        const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
        
        // Chuyển đổi thành mảng object
        const transactions = data.map(row => ({
            timestamp: row[0] || '',
            category: row[1] || '',
            subcategory: row[2] || '',
            amount: parseFloat(row[3]) || 0,
            note: row[4] || ''
        }));
        
        return transactions;
        
    } catch (e) {
        return { error: e.toString() };
    }
}

/**
 * Lấy dữ liệu thống kê cho Dashboard
 * @returns {Object} Dữ liệu thống kê
 */
function getDashboardStats() {
    try {
        const transactions = getTransactions();
        
        if (transactions.error) {
            return transactions;
        }
        
        if (transactions.length === 0) {
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
        
    } catch (e) {
        return { error: e.toString() };
    }
}

/**
 * Lấy dữ liệu theo khoảng thời gian
 * @param {string} startDate - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} endDate - Ngày kết thúc (YYYY-MM-DD)
 * @returns {Array} Danh sách giao dịch trong khoảng thời gian
 */
function getTransactionsByDateRange(startDate, endDate) {
    try {
        const transactions = getTransactions();
        
        if (transactions.error) {
            return transactions;
        }
        
        if (!startDate && !endDate) {
            return transactions;
        }
        
        const start = startDate ? new Date(startDate) : new Date('1970-01-01');
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        
        const filtered = transactions.filter(t => {
            const d = new Date(t.timestamp);
            return d >= start && d <= end;
        });
        
        return filtered;
        
    } catch (e) {
        return { error: e.toString() };
    }
}

/**
 * Lấy tổng thu theo tháng
 * @param {number} year - Năm
 * @param {number} month - Tháng (1-12)
 * @returns {number} Tổng thu
 */
function getMonthlyIncome(year, month) {
    try {
        const transactions = getTransactions();
        
        if (transactions.error) {
            return 0;
        }
        
        const monthStr = String(month).padStart(2, '0');
        const prefix = `${year}-${monthStr}`;
        
        const total = transactions
            .filter(t => t.amount >= 0 && t.timestamp.startsWith(prefix))
            .reduce((sum, t) => sum + t.amount, 0);
        
        return total;
        
    } catch (e) {
        return 0;
    }
}

/**
 * Lấy tổng chi theo tháng
 * @param {number} year - Năm
 * @param {number} month - Tháng (1-12)
 * @returns {number} Tổng chi
 */
function getMonthlyExpense(year, month) {
    try {
        const transactions = getTransactions();
        
        if (transactions.error) {
            return 0;
        }
        
        const monthStr = String(month).padStart(2, '0');
        const prefix = `${year}-${monthStr}`;
        
        const total = transactions
            .filter(t => t.amount < 0 && t.timestamp.startsWith(prefix))
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        return total;
        
    } catch (e) {
        return 0;
    }
}

// ============================================================
// HÀM TIỆN ÍCH - CÓ THỂ DÙNG CHO WEB APP
// ============================================================

/**
 * doGet() - Cho phép chạy như Web App
 * Trả về dữ liệu dạng JSON
 */
function doGet() {
    try {
        const transactions = getTransactions();
        
        if (transactions.error) {
            return ContentService
                .createTextOutput(JSON.stringify({ error: transactions.error }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        return ContentService
            .createTextOutput(JSON.stringify({
                success: true,
                data: transactions,
                count: transactions.length
            }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (e) {
        return ContentService
            .createTextOutput(JSON.stringify({ error: e.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * doPost() - Nhận request POST để lọc dữ liệu
 */
function doPost(e) {
    try {
        const params = JSON.parse(e.postData.contents);
        const { startDate, endDate, type } = params;
        
        let transactions = getTransactions();
        
        if (transactions.error) {
            return ContentService
                .createTextOutput(JSON.stringify({ error: transactions.error }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        // Lọc theo ngày
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : new Date('1970-01-01');
            const end = endDate ? new Date(endDate) : new Date();
            end.setHours(23, 59, 59, 999);
            
            transactions = transactions.filter(t => {
                const d = new Date(t.timestamp);
                return d >= start && d <= end;
            });
        }
        
        // Lọc theo loại
        if (type && type !== 'all') {
            transactions = transactions.filter(t => {
                const tType = t.amount >= 0 ? 'thu' : 'chi';
                return tType === type;
            });
        }
        
        return ContentService
            .createTextOutput(JSON.stringify({
                success: true,
                data: transactions,
                count: transactions.length
            }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (e) {
        return ContentService
            .createTextOutput(JSON.stringify({ error: e.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}