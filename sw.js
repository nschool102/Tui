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
                return response || fetch(event.request)
                    .then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
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
    
    if (action === 'dismiss') {
        console.log('[SW] Notification dismissed');
        return;
    }
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        })
        .then(clients => {
            for (let client of clients) {
                if (client.url && client.url.includes('/index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
        .catch(err => {
            console.log('[SW] Lỗi mở window:', err);
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
// LOG SERVICE WORKER EVENTS
// =========================================================================

console.log('[SW] Service Worker loaded');

// Lắng nghe lỗi
self.addEventListener('error', event => {
    console.log('[SW] Error:', event.message, event.filename, event.lineno);
});

self.addEventListener('unhandledrejection', event => {
    console.log('[SW] Unhandled rejection:', event.reason);
});

// end SERVICE WORKER
