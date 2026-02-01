// 版本控制
const CACHE_VERSION = '1.2.0';
const CACHE_NAME = `2048-v${CACHE_VERSION}`;

// 需要缓存的资源
const ASSETS_TO_CACHE = [
    // 主文件
    './',
    './index.html',
    './game.html',
    
    // CSS文件
    './style.css',
    './game-style.css',
    
    // JavaScript文件
    './game.js',
    './main.js',
    '/save-manager.js',
    
    // 图标文件
    './icon-192.png',
    './icon-512.png',
    
    // 配置文件
    './manifest.json'
];

// 安装事件
// 获取事件 - 使用修复后的缓存优先策略
self.addEventListener('fetch', event => {
    // 只处理同源的GET请求
    if (event.request.method !== 'GET' || event.request.url.indexOf(self.location.origin) !== 0) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // 如果缓存中有，直接返回
                if (cachedResponse) {
                    console.log(`[SW] 从缓存返回: ${event.request.url}`);
                    return cachedResponse;
                }

                // 缓存中没有，去网络获取
                return fetch(event.request)
                    .then(networkResponse => {
                        // 检查响应是否有效
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }

                        // 克隆响应并存入缓存
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                                console.log(`[SW] 已缓存新资源: ${event.request.url}`);
                            });

                        return networkResponse;
                    })
                    .catch(error => {
                        console.error(`[SW] 获取失败: ${event.request.url}`, error);
                        // 如果是页面请求，可以返回一个基础的离线回退页面，这里直接返回错误
                        // 你可以创建一个 offline.html 文件并在这里返回它
                        if (event.request.headers.get('accept').includes('text/html')) {
                            // 可选：返回一个自定义的离线页面
                            // return caches.match('/offline.html');
                        }
                        // 对于其他资源，直接让请求失败
                        throw error;
                    });
            })
    );
});

// 激活事件
self.addEventListener('activate', event => {
    console.log('🟡 Service Worker 激活中...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // 删除旧版本的缓存
                    if (cacheName !== CACHE_NAME) {
                        console.log(`🗑️ 清理旧缓存: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker 激活完成');
            return self.clients.claim();
        })
    );
});

// 获取事件 - 缓存优先策略
self.addEventListener('fetch', event => {
    // 只处理GET请求
    if (event.request.method !== 'GET') return;
    
    // 检查请求的URL
    const requestUrl = new URL(event.request.url);
    
    // 跳过非同源请求（可选）
    if (requestUrl.origin !== self.location.origin) {
        return;
    }
    
    // 处理API请求和静态资源分开
    if (event.request.url.includes('/api/')) {
        // API请求：网络优先策略
        event.respondWith(networkFirstStrategy(event));
    } else {
        // 静态资源：缓存优先策略
        event.respondWith(cacheFirstStrategy(event));
    }
});

// 缓存优先策略
function cacheFirstStrategy(event) {
    return caches.match(event.request)
        .then(cachedResponse => {
            if (cachedResponse) {
                // 如果缓存中有，返回缓存并更新缓存
                console.log(`📦 从缓存返回: ${event.request.url}`);
                updateCache(event.request);
                return cachedResponse;
            }
            
            // 否则从网络获取
            return fetch(event.request)
                .then(networkResponse => {
                    // 只缓存成功的响应
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    
                    // 克隆响应以进行缓存
                    const responseToCache = networkResponse.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            console.log(`💾 缓存新资源: ${event.request.url}`);
                            cache.put(event.request, responseToCache);
                        });
                    
                    return networkResponse;
                })
                .catch(error => {
                    console.error('❌ 获取资源失败:', error);
                    
                    // 如果是HTML页面，返回离线页面
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('./index.html');
                    }
                    
                    // 返回一个简单的错误响应
                    return new Response('网络连接失败，请检查网络设置', {
                        status: 408,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                });
        });
}

// 网络优先策略（用于API请求）
function networkFirstStrategy(event) {
    return fetch(event.request)
        .then(networkResponse => {
            // 更新缓存
            caches.open(CACHE_NAME)
                .then(cache => {
                    cache.put(event.request, networkResponse.clone());
                });
            return networkResponse;
        })
        .catch(() => {
            // 网络失败时尝试从缓存获取
            return caches.match(event.request);
        });
}

// 更新缓存
function updateCache(request) {
    fetch(request)
        .then(response => {
            if (response.status === 200) {
                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(request, response);
                    });
            }
        })
        .catch(() => {
            // 静默失败
        });
}

// 接收来自页面的消息
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'SAVE_GAME') {
        console.log('💾 接收到游戏保存数据');
        // 这里可以处理游戏数据的缓存
    }
});

// 后台同步（如果需要）
self.addEventListener('sync', event => {
    if (event.tag === 'sync-game-data') {
        console.log('🔄 后台同步数据');
        event.waitUntil(syncGameData());
    }
});

// 推送通知（如果需要）
self.addEventListener('push', event => {
    console.log('🔔 收到推送通知');
    
    const options = {
        body: event.data ? event.data.text() : '2048游戏通知',
        icon: 'icon-192.png',
        badge: 'icon-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'play',
                title: '开始游戏'
            },
            {
                action: 'close',
                title: '关闭'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('2048游戏', options)
    );
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
    console.log('🔔 通知被点击');
    
    event.notification.close();
    
    if (event.action === 'play') {
        event.waitUntil(
            clients.openWindow('/index.html?start=continue')
        );
    } else {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});