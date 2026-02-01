// ==================== 主界面控制器 ====================
class GameController {
    constructor() {
        // 页面状态
        this.currentPage = 'main'; // main, game, about, stats, settings
        
        // 游戏统计数据
        this.stats = {
            bestScore: 0,
            totalGames: 0,
            totalWins: 0,
            averageScore: 0
        };
        
        // 初始化
        this.init();
    }
    
    // 初始化
    init() {
        // 加载统计数据
        this.loadStats();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 显示主界面
        this.showMainMenu();
        
        // 检查是否有存档
        this.checkForSavedGame();
        
        // 添加iOS PWA优化
        this.optimizeForIOS();
        
        console.log('🎮 2048游戏控制器已加载');
    }
    
    // 加载统计数据
    loadStats() {
        try {
            this.stats.bestScore = parseInt(localStorage.getItem('2048-best-score') || '0');
            this.stats.totalGames = parseInt(localStorage.getItem('2048-total-games') || '0');
            this.stats.totalWins = parseInt(localStorage.getItem('2048-total-wins') || '0');
            
            // 计算平均分
            const totalScores = parseInt(localStorage.getItem('2048-total-scores') || '0');
            if (this.stats.totalGames > 0) {
                this.stats.averageScore = Math.round(totalScores / this.stats.totalGames);
            }
        } catch (e) {
            console.warn('加载统计数据失败:', e);
        }
    }
    
    // 保存统计数据
    saveStats() {
        try {
            localStorage.setItem('2048-best-score', this.stats.bestScore);
            localStorage.setItem('2048-total-games', this.stats.totalGames);
            localStorage.setItem('2048-total-wins', this.stats.totalWins);
        } catch (e) {
            console.warn('保存统计数据失败:', e);
        }
    }
    
    // 检查是否有存档
    checkForSavedGame() {
        const hasSavedGame = localStorage.getItem('2048-current-game') !== null;
        const continueBtn = document.getElementById('continue-btn');
        
        if (continueBtn) {
            continueBtn.disabled = !hasSavedGame;
            continueBtn.classList.toggle('disabled', !hasSavedGame);
            
            if (hasSavedGame) {
                // 显示存档信息
                this.showSavedGameInfo();
            }
        }
    }
    
    // 显示存档信息
    showSavedGameInfo() {
        try {
            const savedGame = JSON.parse(localStorage.getItem('2048-current-game'));
            if (!savedGame) return;
            
            const infoElement = document.getElementById('saved-game-info');
            if (!infoElement) return;
            
            const daysOld = Math.floor((Date.now() - savedGame.timestamp) / (1000 * 60 * 60 * 24));
            let timeText = '';
            
            if (daysOld === 0) {
                timeText = '今天';
            } else if (daysOld === 1) {
                timeText = '昨天';
            } else {
                timeText = `${daysOld}天前`;
            }
            
            infoElement.innerHTML = `
                <div class="saved-game-card">
                    <div class="saved-game-score">
                        <span>分数: ${savedGame.score || 0}</span>
                        <span>${timeText}</span>
                    </div>
                    <div class="saved-game-grid">
                        ${this.renderMiniGrid(savedGame.grid)}
                    </div>
                </div>
            `;
            infoElement.style.display = 'block';
        } catch (e) {
            console.warn('显示存档信息失败:', e);
        }
    }
    
    // 渲染迷你网格（用于显示存档）
    renderMiniGrid(grid) {
        if (!grid) return '';
        
        let html = '';
        for (let row = 0; row < 4; row++) {
            html += '<div class="mini-row">';
            for (let col = 0; col < 4; col++) {
                const value = grid[row]?.[col] || 0;
                const className = value > 0 ? `mini-tile tile-${Math.min(value, 2048)}` : 'mini-empty';
                html += `<div class="${className}">${value > 0 ? value : ''}</div>`;
            }
            html += '</div>';
        }
        return html;
    }
    
    // ==================== 核心功能：直接跳转到 game.html ====================
    
    // 开始新游戏
    startNewGame() {
        // 确认是否放弃当前存档
        const hasSavedGame = localStorage.getItem('2048-current-game') !== null;
        
        if (hasSavedGame) {
            if (!confirm('开始新游戏将覆盖当前存档，是否继续？')) {
                return;
            }
        }
        
        console.log('🎮 开始新游戏');
        
        // 构建URL：直接跳转到 game.html
        const url = new URL('game.html', window.location.href);
        url.searchParams.delete('mode'); // 确保是新游戏模式
        
        // 记录新游戏开始时间
        localStorage.setItem('2048-new-game-start', Date.now());
        
        // 直接跳转到游戏页面
        window.location.href = url.toString();
    }
    
    // 继续游戏
    continueGame() {
        console.log('🔄 继续游戏');
        
        // 构建URL：跳转到 game.html 并传递继续模式
        const url = new URL('game.html', window.location.href);
        url.searchParams.set('mode', 'continue');
        
        // 直接跳转到游戏页面
        window.location.href = url.toString();
    }
    
    // 从游戏页面返回主菜单
    returnFromGame() {
        console.log('🏠 从游戏返回主菜单');
        this.showMainMenu();
    }
    
    // ==================== 页面管理 ====================
    
    // 显示主菜单
    showMainMenu() {
        this.currentPage = 'main';
        
        // 隐藏其他页面，显示主菜单
        this.hideAllPages();
        document.getElementById('main-menu').style.display = 'flex';
        
        // 更新统计数据
        this.updateStatsDisplay();
        
        // 更新存档检查
        this.checkForSavedGame();
        
        // 更新页面标题
        document.title = '2048 - 主菜单';
        
        // 添加动画效果
        this.animateMenuButtons();
    }
    
    // 隐藏所有页面
    hideAllPages() {
        const pages = ['main-menu', 'stats-page', 'about-page', 'settings-page'];
        pages.forEach(page => {
            const element = document.getElementById(page);
            if (element) element.style.display = 'none';
        });
    }
    
    // 更新统计数据显示
    updateStatsDisplay() {
        // 主菜单统计数据
        document.getElementById('best-score-display').textContent = this.stats.bestScore;
        document.getElementById('total-games-display').textContent = this.stats.totalGames;
        document.getElementById('total-wins-display').textContent = this.stats.totalWins;
        document.getElementById('average-score-display').textContent = this.stats.averageScore;
        
        // 统计页面详细数据
        const statsBestScore = document.getElementById('stats-best-score');
        const statsTotalGames = document.getElementById('stats-total-games');
        const statsTotalWins = document.getElementById('stats-total-wins');
        const statsWinRate = document.getElementById('stats-win-rate');
        const statsAverageScore = document.getElementById('stats-average-score');
        
        if (statsBestScore) statsBestScore.textContent = this.stats.bestScore;
        if (statsTotalGames) statsTotalGames.textContent = this.stats.totalGames;
        if (statsTotalWins) statsTotalWins.textContent = this.stats.totalWins;
        if (statsWinRate) {
            statsWinRate.textContent = this.stats.totalGames > 0 ? 
                Math.round((this.stats.totalWins / this.stats.totalGames) * 100) + '%' : 
                '0%';
        }
        if (statsAverageScore) statsAverageScore.textContent = this.stats.averageScore;
    }
    
    // 显示统计页面
    showStats() {
        this.currentPage = 'stats';
        this.hideAllPages();
        
        const statsPage = document.getElementById('stats-page');
        if (statsPage) {
            statsPage.style.display = 'block';
        }
        
        // 更新页面标题
        document.title = '2048 - 游戏统计';
        
        // 更新统计数据
        this.updateStatsDisplay();
        
        // 生成游戏历史图表
        this.generateStatsChart();
    }
    
    // 显示关于页面
    showAbout() {
        this.currentPage = 'about';
        this.hideAllPages();
        
        const aboutPage = document.getElementById('about-page');
        if (aboutPage) {
            aboutPage.style.display = 'block';
        }
        
        // 更新页面标题
        document.title = '2048 - 关于游戏';
        
        // 显示游戏说明
        this.showGameInstructions();
    }
    
    // 显示设置页面
    showSettings() {
        this.currentPage = 'settings';
        this.hideAllPages();
        
        const settingsPage = document.getElementById('settings-page');
        if (settingsPage) {
            settingsPage.style.display = 'block';
        }
        
        // 更新页面标题
        document.title = '2048 - 设置';
        
        // 加载当前设置
        this.loadSettings();
    }
    
    // ==================== 事件监听器设置 ====================
    
    setupEventListeners() {
        // 主菜单按钮
        document.getElementById('new-game-btn')?.addEventListener('click', () => this.startNewGame());
        document.getElementById('continue-btn')?.addEventListener('click', () => this.continueGame());
        document.getElementById('stats-btn')?.addEventListener('click', () => this.showStats());
        document.getElementById('about-btn')?.addEventListener('click', () => this.showAbout());
        document.getElementById('settings-btn')?.addEventListener('click', () => this.showSettings());
        
        // 统计页面按钮
        document.getElementById('reset-stats-btn')?.addEventListener('click', () => this.resetGameData());
        
        // 设置页面按钮
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('reset-data-btn')?.addEventListener('click', () => this.resetGameData());
        
        // 返回按钮（在各个页面）
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showMainMenu());
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleGlobalShortcuts(e));
        
        // PWA安装提示
        this.setupPWAInstall();
    }
    
    // 处理全局快捷键
    handleGlobalShortcuts(e) {
        // ESC键返回主菜单（如果在统计、关于或设置页面）
        if (e.key === 'Escape' && this.currentPage !== 'main') {
            this.showMainMenu();
        }
        
        // F1显示帮助
        if (e.key === 'F1') {
            e.preventDefault();
            this.showAbout();
        }
        
        // 数字键快捷开始游戏
        if (e.key === '1') {
            this.startNewGame();
        }
        if (e.key === '2') {
            this.continueGame();
        }
    }
    
    // ==================== 设置管理 ====================
    
    // 加载设置
    loadSettings() {
        // 动画设置
        const animationsEnabled = localStorage.getItem('2048-animations') !== 'false';
        const animationsToggle = document.getElementById('animations-toggle');
        if (animationsToggle) animationsToggle.checked = animationsEnabled;
        
        // 声音设置
        const soundEnabled = localStorage.getItem('2048-sound') !== 'false';
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) soundToggle.checked = soundEnabled;
        
        // 震动反馈（仅移动端）
        if ('vibrate' in navigator) {
            const vibrationEnabled = localStorage.getItem('2048-vibration') !== 'false';
            const vibrationToggle = document.getElementById('vibration-toggle');
            const vibrationSetting = document.getElementById('vibration-setting');
            
            if (vibrationToggle) vibrationToggle.checked = vibrationEnabled;
            if (vibrationSetting) vibrationSetting.style.display = 'block';
        }
        
        // 深色模式
        const darkModeEnabled = localStorage.getItem('2048-dark-mode') === 'true';
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) darkModeToggle.checked = darkModeEnabled;
        
        // 网格大小
        const gridSize = localStorage.getItem('2048-grid-size') || '4';
        const gridSizeSelect = document.getElementById('grid-size-select');
        if (gridSizeSelect) gridSizeSelect.value = gridSize;
    }
    
    // 保存设置
    saveSettings() {
        // 动画
        const animationsToggle = document.getElementById('animations-toggle');
        if (animationsToggle) {
            localStorage.setItem('2048-animations', animationsToggle.checked);
        }
        
        // 声音
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            localStorage.setItem('2048-sound', soundToggle.checked);
        }
        
        // 震动
        if ('vibrate' in navigator) {
            const vibrationToggle = document.getElementById('vibration-toggle');
            if (vibrationToggle) {
                localStorage.setItem('2048-vibration', vibrationToggle.checked);
            }
        }
        
        // 深色模式
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            localStorage.setItem('2048-dark-mode', darkModeToggle.checked);
            
            // 立即应用深色模式
            if (darkModeToggle.checked) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
        
        // 网格大小
        const gridSizeSelect = document.getElementById('grid-size-select');
        if (gridSizeSelect) {
            localStorage.setItem('2048-grid-size', gridSizeSelect.value);
        }
        
        this.showMessage('设置已保存', 'success');
    }
    
    // 重置游戏数据
    resetGameData() {
        if (confirm('确定要重置所有游戏数据吗？这将清除：\n✅ 游戏存档\n✅ 游戏统计\n✅ 最高分数\n\n此操作不可撤销！')) {
            // 清除所有游戏相关数据
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('2048-')) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // 重新加载统计数据
            this.loadStats();
            this.updateStatsDisplay();
            
            // 更新存档检查
            this.checkForSavedGame();
            
            this.showMessage('游戏数据已重置', 'success');
        }
    }
    
    // ==================== 其他功能 ====================
    
    // 显示游戏说明
    showGameInstructions() {
        const instructions = document.getElementById('game-instructions');
        if (!instructions) return;
        
        instructions.innerHTML = `
            <h3>🎮 游戏规则</h3>
            <ol>
                <li>使用 <strong>方向键</strong> 或 <strong>手指滑动</strong> 移动方块</li>
                <li>相同数字的方块碰撞时会<strong>合并</strong>成为它们的和</li>
                <li>每次移动后，会在空白处随机生成一个<strong>2或4</strong></li>
                <li>当方块无法移动且没有空位时，游戏结束</li>
                <li>目标：合并出<strong>2048</strong>方块！</li>
            </ol>
            
            <h3>🎯 游戏技巧</h3>
            <ul>
                <li>尽量将大数字方块放在角落</li>
                <li>保持一行或一列填满，避免打乱布局</li>
                <li>优先横向移动，再纵向移动</li>
                <li>合理使用<strong>撤销</strong>功能（每局3次）</li>
            </ul>
            
            <h3>📱 操作说明</h3>
            <div class="controls-info">
                <div class="control-item">
                    <span class="control-key">↑ ↓ ← →</span>
                    <span>移动方块</span>
                </div>
                <div class="control-item">
                    <span class="control-key">Ctrl+U</span>
                    <span>撤销移动</span>
                </div>
                <div class="control-item">
                    <span class="control-key">ESC</span>
                    <span>返回主菜单</span>
                </div>
                <div class="control-item">
                    <span class="control-icon">👆</span>
                    <span>手机上手指滑动控制</span>
                </div>
            </div>
            
            <div class="game-tips">
                <p><strong>💡 提示：</strong>游戏进度会自动保存，下次可以继续玩</p>
                <p><strong>📊 统计：</strong>查看统计页面了解你的游戏记录</p>
                <p><strong>🌐 离线：</strong>添加到主屏幕后可离线游玩</p>
            </div>
        `;
    }
    
    // 生成统计图表
    generateStatsChart() {
        const canvas = document.getElementById('stats-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 如果没有数据，显示提示
        if (this.stats.totalGames === 0) {
            ctx.fillStyle = '#776e65';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('暂无游戏数据', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        // 绘制简单的统计图表
        const winRate = this.stats.totalGames > 0 ? 
            (this.stats.totalWins / this.stats.totalGames) * 100 : 0;
        
        // 绘制胜利率的饼图
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) * 0.4;
        
        // 胜利部分
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, 0, (winRate / 100) * Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = '#4CAF50';
        ctx.fill();
        
        // 失败部分
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, (winRate / 100) * Math.PI * 2, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = '#F44336';
        ctx.fill();
        
        // 中心文字
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(winRate)}%`, centerX, centerY + 7);
        
        // 图例
        ctx.font = '14px Arial';
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('胜利', centerX - 40, centerY + radius + 30);
        ctx.fillStyle = '#F44336';
        ctx.fillText('失败', centerX + 40, centerY + radius + 30);
    }
    
    // 设置PWA安装提示
    setupPWAInstall() {
        let deferredPrompt;
        const installBtn = document.getElementById('install-pwa-btn');
        
        if (!installBtn) return;
        
        // 隐藏安装按钮，直到可安装
        installBtn.style.display = 'none';
        
        window.addEventListener('beforeinstallprompt', (e) => {
            // 阻止浏览器默认安装提示
            e.preventDefault();
            // 保存事件，以便稍后触发
            deferredPrompt = e;
            // 显示安装按钮
            installBtn.style.display = 'block';
            
            installBtn.addEventListener('click', () => {
                // 显示安装提示
                deferredPrompt.prompt();
                
                // 等待用户选择
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('用户接受了PWA安装');
                        installBtn.style.display = 'none';
                    } else {
                        console.log('用户拒绝了PWA安装');
                    }
                    deferredPrompt = null;
                });
            });
        });
        
        // 检测是否已安装
        window.addEventListener('appinstalled', () => {
            console.log('PWA已安装');
            installBtn.style.display = 'none';
        });
        
        // 检查是否已以独立模式运行
        if (window.navigator.standalone) {
            installBtn.style.display = 'none';
        }
    }
    
    // 优化iOS设备
    optimizeForIOS() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS) {
            // 添加iOS特定类名
            document.body.classList.add('ios-device');
            
            // 修复iOS点击延迟
            document.addEventListener('touchstart', () => {}, { passive: true });
            
            // 添加iOS状态栏颜色
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.content = '#faf8ef';
            }
        }
    }
    
    // 显示消息
    showMessage(text, type = 'info') {
        // 创建消息元素
        let messageElement = document.getElementById('global-message');
        
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'global-message';
            messageElement.className = 'global-message';
            document.body.appendChild(messageElement);
        }
        
        // 设置消息内容
        messageElement.textContent = text;
        messageElement.className = `global-message ${type}`;
        
        // 显示消息
        messageElement.style.display = 'block';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }
    
    // 动画菜单按钮
    animateMenuButtons() {
        const buttons = document.querySelectorAll('.menu-btn');
        buttons.forEach((btn, index) => {
            btn.style.animationDelay = `${index * 0.1}s`;
            btn.classList.add('animate-in');
            
            // 动画结束后移除类名
            setTimeout(() => {
                btn.classList.remove('animate-in');
            }, 1000);
        });
    }
}

// ==================== 初始化 ====================

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 创建游戏控制器实例
    window.gameController = new GameController();
    
    // 添加键盘控制说明
    console.log('🎮 2048游戏已启动');
    console.log('🏠 主菜单：F1查看帮助，ESC返回主菜单');
    console.log('🎮 快捷键：1-新游戏，2-继续游戏');
    console.log('📱 手机：添加到主屏幕获得最佳体验');
    
    // 检查是否从游戏页面返回
    const urlParams = new URLSearchParams(window.location.search);
    const fromGame = urlParams.get('from');
    
    if (fromGame === 'game') {
        // 显示从游戏返回的消息
        window.gameController.showMessage('已从游戏返回主菜单', 'info');
        
        // 清理URL参数
        const url = new URL(window.location);
        url.searchParams.delete('from');
        window.history.replaceState({}, '', url);
    }
    
    // 检查是否需要自动开始游戏（通过快捷键）
    const autoStart = urlParams.get('start');
    if (autoStart === 'new') {
        setTimeout(() => {
            window.gameController.startNewGame();
        }, 500);
    } else if (autoStart === 'continue') {
        setTimeout(() => {
            window.gameController.continueGame();
        }, 500);
    }
});

// PWA Service Worker注册
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker 注册成功:', registration.scope);
                
                // 检查更新
                if (registration.waiting) {
                    console.log('🔄 新版本已就绪，请刷新页面');
                    window.gameController?.showMessage('新版本可用，请刷新页面获取更新', 'info');
                }
                
                // 监听更新
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 发现新版本，正在安装...');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🔄 新版本安装完成，请刷新页面');
                            window.gameController?.showMessage('新版本已就绪，刷新页面应用更新', 'info');
                        }
                    });
                });
            })
            .catch(error => {
                console.log('❌ Service Worker 注册失败:', error);
            });
    });
}

// 页面可见性变化处理
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('📱 页面隐藏，自动保存数据');
        // 保存游戏设置等
        if (window.gameController) {
            window.gameController.saveStats();
        }
    }
});

// 导出控制器（用于模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GameController
    };
}