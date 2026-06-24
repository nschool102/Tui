// =========================================================================
// SERVICE WORKER CHO PWA - HỖ TRỢ IOS
// =========================================================================

const CACHE_NAME = 'toi-app-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    '/icon.png'
];

// =========================================================================
// CÀI ĐẶT SERVICE WORKER
// =========================================================================

// Cài đặt Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cache mở thành công');
                return cache.addAll(ASSETS);
            })
            .then(() => {
                console.log('[SW] Assets cached successfully');
                return self.skipWaiting();
            })
            .catch(err => {
                console.log('[SW] Lỗi cache:', err);
                // Vẫn tiếp tục cài đặt dù cache có lỗi
                return self.skipWaiting();
            })
    );
}); // end event install

// Kích hoạt Service Worker
self.addEventListener('activate', event => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Xóa cache cũ:', key);
                        return caches.delete(key);
                    })
            );
        })
        .then(() => {
            console.log('[SW] Service Worker activated');
            return self.clients.claim();
        })
    );
}); // end event activate

// Xử lý fetch - phục vụ từ cache
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Trả về từ cache nếu có, nếu không fetch từ network
                return response || fetch(event.request)
                    .then(networkResponse => {
                        // Cache các request thành công
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Fallback nếu offline và không có cache
                        return new Response('Offline - Không thể tải tài nguyên', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
}); // end event fetch

// =========================================================================
// XỬ LÝ THÔNG BÁO ĐẨY - HỖ TRỢ IOS
// =========================================================================

// Nhận thông báo push từ server (FCM)
self.addEventListener('push', event => {
    console.log('[SW] Push notification received');
    
    let data = {};
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.log('[SW] Lỗi parse push data:', e);
        data = {
            title: 'TÔI - Nhắc hẹn',
            body: 'Bạn có lịch hẹn sắp tới!'
        };
    }
    
    const title = data.title || 'TÔI - Nhắc hẹn';
    const options = {
        body: data.body || 'Bạn có lịch hẹn sắp tới!',
        icon: data.icon || '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        // Thêm các option cho iOS
        requireInteraction: true,
        silent: false,
        tag: data.tag || 'reminder-notification',
        renotify: true,
        actions: [
            {
                action: 'open',
                title: '📱 Mở ứng dụng'
            },
            {
                action: 'dismiss',
                title: '✕ Bỏ qua'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
            .then(() => {
                console.log('[SW] Notification shown successfully');
            })
            .catch(err => {
                console.log('[SW] Lỗi hiển thị notification:', err);
            })
    );
}); // end event push

// Xử lý click vào thông báo
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification clicked');
    event.notification.close();
    
    const action = event.action;
    const notificationData = event.notification.data || {};
    
    if (action === 'dismiss') {
        // User đã dismiss notification
        console.log('[SW] Notification dismissed');
        return;
    }
    
    // Mở ứng dụng và chuyển đến trang tương ứng
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        })
        .then(clients => {
            // Nếu có window đang mở, focus vào nó
            for (let client of clients) {
                if (client.url && client.url.includes('/index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Nếu không có window nào, mở mới
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
        .catch(err => {
            console.log('[SW] Lỗi mở window:', err);
            // Fallback: thử mở window
            return clients.openWindow('/');
        })
    );
}); // end event notificationclick

// Nhận message từ main thread
self.addEventListener('message', event => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, icon } = event.data;
        
        const options = {
            body: body || '',
            icon: icon || '/icon.png',
            badge: '/icon.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            silent: false,
            tag: 'toast-notification',
            renotify: true
        };
        
        event.waitUntil(
            self.registration.showNotification(title || 'TÔI', options)
                .then(() => {
                    console.log('[SW] Notification from message shown');
                })
                .catch(err => {
                    console.log('[SW] Lỗi show notification from message:', err);
                })
        );
    }
}); // end event message

// =========================================================================
// XỬ LÝ BACKGROUND SYNC - HỖ TRỢ IOS
// =========================================================================

// Đăng ký background sync (nếu được hỗ trợ)
self.addEventListener('sync', event => {
    console.log('[SW] Background sync event:', event.tag);
    
    if (event.tag === 'sync-reminders') {
        event.waitUntil(
            checkAndSendReminders()
                .then(() => {
                    console.log('[SW] Background sync completed');
                })
                .catch(err => {
                    console.log('[SW] Background sync error:', err);
                })
        );
    }
}); // end event sync

// Hàm kiểm tra và gửi reminders từ background
async function checkAndSendReminders() {
    console.log('[SW] Checking reminders in background...');
    
    try {
        // Lấy dữ liệu reminders từ cache
        const cache = await caches.open('reminder-cache');
        const response = await cache.match('/reminders-data');
        
        if (!response) {
            console.log('[SW] No reminder data in cache');
            return;
        }
        
        const reminders = await response.json();
        console.log('[SW] Found reminders:', reminders.length);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayStr = formatDateOnly(today);
        const tomorrowStr = formatDateOnly(tomorrow);
        
        let notifications = [];
        
        reminders.forEach(r => {
            if (r.status === "DISABLED") return;
            
            const targetDateStr = r.nextReminderDate || r.startDate;
            if (!targetDateStr) return;
            
            if (targetDateStr === tomorrowStr) {
                notifications.push({
                    title: "🔔 NHẮC TRƯỚC 1 NGÀY",
                    body: `Ngày mai bạn có hẹn: ${r.content}`
                });
            }
            
            if (targetDateStr === todayStr) {
                const alreadyTriggeredToday = r.lastTriggeredAt && 
                    r.lastTriggeredAt.slice(0, 10) === todayStr;
                    
                if (!alreadyTriggeredToday) {
                    notifications.push({
                        title: "⏰ HÔM NAY CÓ HẸN",
                        body: r.content
                    });
                }
            }
        });
        
        // Gửi từng notification
        for (let noti of notifications) {
            await self.registration.showNotification(noti.title, {
                body: noti.body,
                icon: '/icon.png',
                badge: '/icon.png',
                vibrate: [200, 100, 200],
                requireInteraction: true,
                silent: false
            });
            console.log('[SW] Background notification sent:', noti.title);
        }
        
        console.log('[SW] Sent', notifications.length, 'notifications from background');
        
    } catch (error) {
        console.log('[SW] Error in background sync:', error);
    }
} // end function checkAndSendReminders

// Hàm format date
function formatDateOnly(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
} // end function formatDateOnly

// =========================================================================
// XỬ LÝ OFFLINE - HIỂN THỊ TRANG OFFLINE
// =========================================================================

// Tạo trang offline fallback
const OFFLINE_PAGE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - TÔI</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #1a1a1a;
            color: #fff;
            text-align: center;
        }
        .offline-container {
            max-width: 400px;
            padding: 20px;
        }
        .offline-icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        p {
            opacity: 0.7;
            font-size: 14px;
        }
        .btn {
            background: #FFC107;
            color: #111;
            border: none;
            padding: 14px 30px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📡</div>
        <h1>Không có kết nối mạng</h1>
        <p>Vui lòng kiểm tra kết nối Internet của bạn và thử lại.</p>
        <button class="btn" onclick="location.reload()">🔄 Thử lại</button>
    </div>
</body>
</html>
`;

// =========================================================================
// LOG SERVICE WORKER EVENTS
// =========================================================================

// Log khi service worker được cài đặt
console.log('[SW] Service Worker loaded');

// Lưu trữ offline page
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Lưu trang offline
                const offlineResponse = new Response(OFFLINE_PAGE, {
                    headers: { 'Content-Type': 'text/html' }
                });
                return cache.put('/offline.html', offlineResponse);
            })
    );
}); // end event install

// Xử lý fetch cho offline
self.addEventListener('fetch', event => {
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match('/offline.html');
                })
        );
        return;
    }
    // ... phần fetch còn lại giữ nguyên
}); // end event fetch

// =========================================================================
// THÔNG BÁO LỖI - GIÚP DEBUG
// =========================================================================

// Lắng nghe lỗi
self.addEventListener('error', event => {
    console.log('[SW] Error:', event.message, event.filename, event.lineno);
});

self.addEventListener('unhandledrejection', event => {
    console.log('[SW] Unhandled rejection:', event.reason);
});

// end SERVICE WORKER
