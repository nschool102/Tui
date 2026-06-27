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
        "Ăn uống": ["Ăn sáng", "Ăn trưa", "Ăn tối", "Đi chợ, Siêu thị", "Ăn vặt, Đồ ngọt"],
        "Chi tiêu thiết yếu": ["Điện", "Nước", "Internet", "Điện thoại", "Xăng xe", "Taxi, bus, xe công nghệ"],
        "Mua sắm & Cá nhân": ["Quần áo", "Phụ kiện", "Mĩ phẩm", "Đồ gia dụng", "Đồ chơi", "Sách, Văn phòng phẩm"],
        "Y tế & Sức khỏe": ["Khám, chữa bệnh", "Thuốc", "Thực phẩm chức năng"],
        "Giáo dục": ["Học phí", "Học thêm", "Quĩ lớp", "Lệ phí"],
        "Giải trí": ["Coi phim", "Du lịch", "Quán cafe", "Nhà hàng"],
        "Đầu tư, tiết kiệm": ["Vàng", "Tiền mặt", "USDT", "Cho mượn"],
        "Chi khác & Giao tế": ["Từ thiện", "Biếu tặng"]
    }
};

const PALETTE = ["#4CAF50", "#8BC34A", "#2196F3", "#E91E63", "#9C27B0", "#F44336", "#FF9800", "#FFEB3B"];

// Theme mặc định: Vàng (#FFC107) + Dark Mode bật sẵn
const DEFAULT_THEME_COLOR = "#FFC107";
const DEFAULT_DARK_MODE = true;

let db;
let charts = {};
let localFamilyData = [];
let localReminderData = [];
let isSyncing = false;
let notificationCheckInterval = null;