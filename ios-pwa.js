// iOS PWA安装助手
class iOSPWAHelper {
  constructor() {
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    this.isStandalone = window.navigator.standalone;
  }
  
  // 检查iOS安装条件
  checkInstallConditions() {
    return {
      isIOS: this.isIOS,
      isSafari: this.isSafari,
      isHTTPS: window.location.protocol === 'https:',
      isStandalone: this.isStandalone,
      hasAppleIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
      hasAppleCapable: !!document.querySelector('meta[name="apple-mobile-web-app-capable"][content="yes"]'),
      iconExists: this.checkIconExists()
    };
  }
  
  // 检查图标文件是否存在
  async checkIconExists() {
    try {
      const iconUrl = document.querySelector('link[rel="apple-touch-icon"]')?.href || './icon-192.png';
      const response = await fetch(iconUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // 显示iOS安装指引
  showInstallGuide() {
    if (!this.isIOS || this.isStandalone) return;
    
    const guide = document.createElement('div');
    guide.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: rgba(119, 110, 101, 0.95);
        color: white;
        padding: 15px;
        border-radius: 10px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
      ">
        <h3 style="margin: 0 0 10px 0;">📱 安装到iPhone桌面</h3>
        <ol style="margin: 0; padding-left: 20px;">
          <li>点击Safari底部 <strong>分享按钮</strong> 📤</li>
          <li>向下滑动找到 <strong>「添加到主屏幕」</strong></li>
          <li>点击 <strong>「添加」</strong></li>
          <li>从桌面图标打开游戏</li>
        </ol>
        <button id="close-guide" style="
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
        ">×</button>
      </div>
    `;
    
    document.body.appendChild(guide);
    
    // 关闭按钮
    guide.querySelector('#close-guide').addEventListener('click', () => {
      guide.style.opacity = '0';
      setTimeout(() => guide.remove(), 300);
    });
    
    // 10秒后自动隐藏
    setTimeout(() => {
      if (guide.parentNode) {
        guide.style.opacity = '0';
        setTimeout(() => guide.remove(), 300);
      }
    }, 10000);
  }
  
  // 显示状态
  showStatus() {
    const conditions = this.checkInstallConditions();
    console.log('📱 iOS PWA状态检查:', conditions);
    
    if (conditions.isIOS && !conditions.isStandalone) {
      setTimeout(() => this.showInstallGuide(), 3000);
    }
  }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  const iosHelper = new iOSPWAHelper();
  iosHelper.showStatus();
  
  // 暴露给全局，方便调试
  window.iOSPWAHelper = iosHelper;
});