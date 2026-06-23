// =========================================================================
// SERVICE WORKER CHO PWA
// =========================================================================

// Tên cache và danh sách assets cần cache
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

// Sự kiện cài đặt - cache các assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache mở thành công');
                return cache.addAll(ASSETS);
            })
            .catch(err => console.log('Lỗi cache:', err))
    );
    // Kích hoạt ngay lập tức
    self.skipWaiting();
}); // end event install

// Sự kiện kích hoạt - xóa cache cũ
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
    // Kiểm soát các tab đang mở
    self.clients.claim();
}); // end event activate

// Sự kiện fetch - phục vụ từ cache
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
}); // end event fetch

// end CÀI ĐẶT SERVICE WORKER

// =========================================================================
// XỬ LÝ THÔNG BÁO ĐẨY
// =========================================================================

// Nhận thông báo push từ server (dành cho Firebase Cloud Messaging)
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'TÔI - Nhắc hẹn';
    const options = {
        body: data.body || 'Bạn có lịch hẹn sắp tới!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        data: data.data || {}
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
}); // end event push

// Xử lý khi người dùng click vào thông báo
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    // Mở ứng dụng khi click vào thông báo
    event.waitUntil(
        clients.openWindow('/')
    );
}); // end event notificationclick

// Nhận message từ main thread để hiển thị thông báo
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, icon } = event.data;
        self.registration.showNotification(title, {
            body: body,
            icon: icon || '/icon-192.png',
            vibrate: [200, 100, 200]
        });
    }
}); // end event message

// end XỬ LÝ THÔNG BÁO ĐẨY
