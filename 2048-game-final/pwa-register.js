/**
 * PWA Service Worker 注册脚本
 * 将此文件引入到你的HTML中即可
 */

(function() {
  'use strict';
  
  // 检查浏览器是否支持
  if (!('serviceWorker' in navigator)) {
    console.log('当前浏览器不支持Service Worker');
    return;
  }
  
  // 检查是否在本地环境（file://协议）
  if (window.location.protocol === 'file:') {
    console.log('本地文件模式，Service Worker无法注册（需要HTTPS）');
    return;
  }
  
  window.addEventListener('load', function() {
    const swUrl = 'service-worker.js';
    
    // 注册Service Worker
    navigator.serviceWorker.register(swUrl)
      .then(function(registration) {
        console.log('✅ Service Worker注册成功，作用域:', registration.scope);
        
        // 检查更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 Service Worker更新找到:', newWorker.state);
          
          newWorker.addEventListener('statechange', () => {
            console.log('🔄 Service Worker状态变更:', newWorker.state);
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('📱 新内容可用，请刷新页面！');
              // 这里可以添加更新提示
              if (confirm('游戏有新版本可用，是否立即刷新？')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch(function(error) {
        console.error('❌ Service Worker注册失败:', error);
      });
    
    // 监听Controller变更
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker控制器变更');
    });
  });
  
  // 离线状态检测
  window.addEventListener('online', () => {
    console.log('🌐 网络已连接');
    document.body.classList.remove('offline');
  });
  
  window.addEventListener('offline', () => {
    console.log('📴 网络已断开');
    document.body.classList.add('offline');
  });
})();