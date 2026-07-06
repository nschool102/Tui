// =========================================================================
// THỐNG KÊ THỜI GIAN - MODAL TRONG TAB NHẬT KÍ
// =========================================================================

// Mở modal thống kê thời gian
function openStatTimeModal() {
    const modal = document.getElementById('statTimeModal');
    if (modal) {
        modal.style.display = 'flex';
        renderStatTime();
    }
} // end function openStatTimeModal

// Đóng modal thống kê thời gian
function closeStatTimeModal() {
    const modal = document.getElementById('statTimeModal');
    if (modal) {
        modal.style.display = 'none';
    }
} // end function closeStatTimeModal

// Render thống kê thời gian
function renderStatTime() {
    const periodSelect = document.getElementById('stat-time-period');
    if (!periodSelect) return;
    
    const period = periodSelect.value;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (!db) {
        console.log('❌ renderStatTime: Chưa có database');
        return;
    }
    
    const tx = db.transaction("diary", "readonly");
    const store = tx.objectStore("diary");
    const request = store.getAll();
    
    request.onsuccess = function(e) {
        const entries = e.target.result || [];
        console.log('📊 renderStatTime: Lấy được', entries.length, 'diary entries');
        
        let filtered = entries.filter(entry => {
            if (!entry.datetime) return false;
            
            const parts = entry.datetime.split(' ');
            if (parts.length < 1) return false;
            
            const dateParts = parts[0].split('-');
            if (dateParts.length !== 3) return false;
            
            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1;
            const year = parseInt(dateParts[2]);
            
            if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
            
            if (period === 'month') {
                return month === currentMonth && year === currentYear;
            } else if (period === 'year') {
                return year === currentYear;
            }
            return true;
        });
        
        console.log('📊 renderStatTime: Sau khi lọc:', filtered.length, 'entries');
        
        let nhaMinh = 0;
        let nhaMe = 0;
        let noiKhac = 0;
        let placeCount = {};
        
        filtered.forEach(entry => {
            const place = entry.place || '';
            const normalizedPlace = place.trim().toLowerCase();
            
            if (normalizedPlace === 'nhà mình' || normalizedPlace === 'nha minh') {
                nhaMinh++;
            } else if (normalizedPlace === 'nhà mẹ' || normalizedPlace === 'nha me') {
                nhaMe++;
            } else if (place && place.trim() !== '') {
                noiKhac++;
            }
            
            if (place && place.trim() !== '') {
                placeCount[place] = (placeCount[place] || 0) + 1;
            }
        });
        
        document.getElementById('stat-nhaminh').textContent = nhaMinh;
        document.getElementById('stat-nhame').textContent = nhaMe;
        document.getElementById('stat-noikhac').textContent = noiKhac;
        document.getElementById('stat-total').textContent = (nhaMinh + nhaMe + noiKhac) + ' ngày';
        
        renderStatBarChart('chart-stat-bar', placeCount);
        renderStatPieChart('chart-stat-pie', nhaMinh, nhaMe, noiKhac);
    };
    
    request.onerror = function(e) {
        console.error('❌ renderStatTime: Lỗi đọc diary', e.target.error);
    };
} // end function renderStatTime

// Vẽ biểu đồ cột cho modal thống kê
function renderStatBarChart(canvasId, data) {
    if (charts[canvasId]) {
        charts[canvasId].destroy();
        delete charts[canvasId];
    }
    
    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl) return;
    
    const ctx = canvasEl.getContext('2d');
    
    const sortedData = Object.entries(data)
        .filter(([key, value]) => value > 0 && key.trim() !== '')
        .sort((a, b) => b[1] - a[1]);
    
    const labels = sortedData.map(item => item[0]);
    const values = sortedData.map(item => item[1]);
    
    const colors = labels.map(label => {
        const normalized = label.trim().toLowerCase();
        if (normalized === 'nhà mình' || normalized === 'nha minh') {
            return '#FFC107';
        } else if (normalized === 'nhà mẹ' || normalized === 'nha me') {
            return '#4CAF50';
        } else {
            return '#FF9800';
        }
    });
    
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Số ngày',
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(c => c),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                datalabels: {
                    color: '#ffffff',
                    font: { weight: 'bold', size: 10 },
                    anchor: 'end',
                    align: 'end',
                    formatter: function(value) {
                        return value > 0 ? value : '';
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: { size: 10 }
                    }
                },
                x: {
                    ticks: {
                        font: { size: 9 },
                        maxRotation: 30,
                        minRotation: 30
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
} // end function renderStatBarChart

// Vẽ biểu đồ tròn cho modal thống kê
function renderStatPieChart(canvasId, nhaMinh, nhaMe, noiKhac) {
    if (charts[canvasId]) {
        charts[canvasId].destroy();
        delete charts[canvasId];
    }
    
    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl) return;
    
    const ctx = canvasEl.getContext('2d');
    const total = nhaMinh + nhaMe + noiKhac;
    
    charts[canvasId] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['🏠 Nhà mình', '🏡 Nhà mẹ', '🌍 Nơi khác'],
            datasets: [{
                data: [nhaMinh, nhaMe, noiKhac],
                backgroundColor: ['#FFC107', '#4CAF50', '#FF9800']
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: { size: 11 },
                        padding: 10
                    }
                },
                datalabels: {
                    color: '#ffffff',
                    font: { weight: 'bold', size: 11 },
                    anchor: 'center',
                    align: 'center',
                    formatter: function(value) {
                        if (total > 0 && (value / total * 100) > 5) {
                            return (value / total * 100).toFixed(1) + '%';
                        }
                        return '';
                    }
                }
            }
        }
    });
} // end function renderStatPieChart

// Setup events cho modal thống kê thời gian
function setupStatTimeEvents() {
    const btnStatTime = document.getElementById('btn-stat-time');
    if (btnStatTime) {
        btnStatTime.addEventListener('click', openStatTimeModal);
    }
    
    const btnClose = document.getElementById('btn-close-stat-time');
    if (btnClose) {
        btnClose.addEventListener('click', closeStatTimeModal);
    }
    
    const modal = document.getElementById('statTimeModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeStatTimeModal();
            }
        });
    }
    
    const periodSelect = document.getElementById('stat-time-period');
    if (periodSelect) {
        periodSelect.addEventListener('change', renderStatTime);
    }
    
    const btnRefresh = document.getElementById('btn-refresh-stat');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', function() {
            renderStatTime();
            this.textContent = '✅ Đã làm mới!';
            setTimeout(() => {
                this.textContent = '🔄 Làm mới';
            }, 1500);
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('statTimeModal');
            if (modal && modal.style.display === 'flex') {
                closeStatTimeModal();
            }
        }
    });
} // end function setupStatTimeEvents

// end THỐNG KÊ THỜI GIAN