// ==================== 游戏配置 ====================
const GRID_SIZE = 4; // 4x4网格
const EMPTY_CELL = 0; // 空格子用0表示
const MAX_UNDO_TIMES = 3; // 改为3次，增加游戏体验
const SWIPE_THRESHOLD = 30; // 滑动阈值，iOS优化
const ANIMATION_DURATION = 200; // 动画时长

// ==================== 游戏状态 ====================
let grid = [];
let score = 0;
let bestScore = 0;
let gameOver = false;
let gameWon = false;
let history = [];
let undoUsed = 0;
let canUndo = true;
let lastMoveTime = 0; // 防止快速连续滑动
let isAnimating = false; // 防止动画期间操作

// ==================== DOM元素 ====================
const gridElement = document.getElementById('grid');
const scoreElement = document.getElementById('score');
const bestElement = document.getElementById('best');
const messageElement = document.getElementById('message');
const restartButton = document.getElementById('restart');
const undoButton = document.getElementById('undo');

// ==================== 修复：游戏初始化 ====================
function initGame() {
    console.log('🎮 初始化游戏...');
    
    // 重置游戏状态
    grid = createEmptyGrid();
    score = 0;
    gameOver = false;
    gameWon = false;
    history = [];
    undoUsed = 0;
    canUndo = true;
    isAnimating = false;
    
    // 加载最高分
    const savedBest = localStorage.getItem('2048-best-score');
    bestScore = savedBest ? parseInt(savedBest) : 0;
    
    // 清空消息
    if (messageElement) {
        messageElement.textContent = '';
        messageElement.className = 'game-message';
    }
    
    // 🔧 修复：检查并确保网格元素存在
    if (!gridElement) {
        console.error('❌ 找不到网格元素 #grid');
        showMessage('游戏初始化失败，请刷新页面', 'error');
        return;
    }
    
    // 🔧 修复：清空并重新创建网格
    console.log('🔄 创建游戏网格...');
    createGameGrid();
    
    // 添加初始数字块
    addRandomTile();
    addRandomTile();
    
    // 更新显示
    updateGridDisplay();
    updateScoreDisplay();
    updateUndoDisplay();
    
    // 检查URL参数决定加载方式
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    if (mode === 'continue') {
        // 尝试加载存档
        const loaded = loadGameState();
        if (loaded) {
            showMessage('游戏进度已加载！', 'success');
        }
    }
    
    // 保存初始状态
    saveGameState();
    
    console.log('✅ 游戏初始化完成');
}

// 🔧 修复：创建游戏网格函数
function createGameGrid() {
    if (!gridElement) return;
    
    // 清空网格
    gridElement.innerHTML = '';
    
    // 创建4x4网格（16宫格）
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.id = `cell-${row}-${col}`;
            gridElement.appendChild(cell);
        }
    }
    
    console.log(`✅ 创建了${GRID_SIZE}x${GRID_SIZE}游戏网格`);
}

// 创建空网格
function createEmptyGrid() {
    return Array.from({ length: GRID_SIZE }, () => 
        new Array(GRID_SIZE).fill(EMPTY_CELL)
    );
}

// ==================== 核心游戏逻辑 ====================

// 优化的添加随机方块函数
function addRandomTile() {
    const emptyCells = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (grid[row][col] === EMPTY_CELL) {
                emptyCells.push({ row, col });
            }
        }
    }
    
    if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        grid[randomCell.row][randomCell.col] = value;
        
        // 优化动画：使用CSS transition
        const cellElement = document.getElementById(`cell-${randomCell.row}-${randomCell.col}`);
        if (cellElement) {
            cellElement.classList.add('new-tile');
            
            setTimeout(() => {
                cellElement.classList.remove('new-tile');
            }, ANIMATION_DURATION);
        }
    }
    
    return emptyCells.length > 0;
}

// 获取单元格DOM元素
function getCellElement(row, col) {
    return document.getElementById(`cell-${row}-${col}`) || 
           document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

// 优化网格显示更新（减少DOM操作）
function updateGridDisplay() {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cellValue = grid[row][col];
            const cellElement = getCellElement(row, col);
            
            if (!cellElement) continue;
            
            // 清空单元格
            cellElement.textContent = '';
            cellElement.className = 'cell';
            cellElement.removeAttribute('data-value');
            
            // 设置内容和样式
            if (cellValue !== EMPTY_CELL) {
                cellElement.textContent = cellValue;
                cellElement.classList.add(`tile-${cellValue}`);
                cellElement.setAttribute('data-value', cellValue);
                
                // 大数字样式调整
                if (cellValue >= 1000) {
                    cellElement.classList.add('tile-large');
                }
            }
        }
    }
}

// 更新分数显示
function updateScoreDisplay() {
    if (scoreElement) {
        scoreElement.textContent = score;
    }
    
    if (bestElement) {
        bestElement.textContent = bestScore;
    }
    
    // 更新顶部显示
    const topScoreElement = document.getElementById('top-score');
    if (topScoreElement) {
        topScoreElement.innerHTML = `当前分数: <span>${score}</span>`;
    }
    
    // 更新最高分
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('2048-best-score', bestScore);
    }
}

// ==================== 修复后的移动算法 ====================

// 保存状态到历史记录
function saveState() {
    const gridCopy = grid.map(row => [...row]);
    const state = {
        grid: gridCopy,
        score: score,
        undoUsed: undoUsed
    };
    
    history.push(state);
    
    // 限制历史记录长度
    if (history.length > 20) {
        history.shift();
    }
}

// 主移动函数
function move(direction) {
    if (gameOver || isAnimating) {
        console.log('游戏已结束或动画中，无法移动');
        return false;
    }
    
    const now = Date.now();
    if (now - lastMoveTime < 100) return false; // 防止过快操作
    lastMoveTime = now;
    
    // 保存移动前状态
    saveState();
    
    let moved = false;
    
    isAnimating = true;
    
    switch(direction) {
        case 'up':
            moved = moveTilesUp();
            break;
        case 'down':
            moved = moveTilesDown();
            break;
        case 'left':
            moved = moveTilesLeft();
            break;
        case 'right':
            moved = moveTilesRight();
            break;
    }
    
    // 如果发生了移动
    if (moved) {
        // 添加新方块
        setTimeout(() => {
            addRandomTile();
            updateGridDisplay();
            updateScoreDisplay();
            updateUndoDisplay();
            checkGameStatus();
            saveGameState();
            isAnimating = false;
        }, ANIMATION_DURATION);
        
        // 立即更新网格显示（给用户即时反馈）
        updateGridDisplay();
        return true;
    } else {
        // 没有移动，移除保存的状态
        history.pop();
        isAnimating = false;
        return false;
    }
}

// 修复后的向上移动算法
function moveTilesUp() {
    let moved = false;
    
    for (let col = 0; col < GRID_SIZE; col++) {
        // 第一步：将所有方块向上移动到底部（不含合并）
        for (let row = 1; row < GRID_SIZE; row++) {
            if (grid[row][col] !== EMPTY_CELL) {
                let targetRow = row;
                while (targetRow > 0 && grid[targetRow - 1][col] === EMPTY_CELL) {
                    grid[targetRow - 1][col] = grid[targetRow][col];
                    grid[targetRow][col] = EMPTY_CELL;
                    targetRow--;
                    moved = true;
                }
            }
        }
        
        // 第二步：合并相邻相同数字（从顶部开始）
        for (let row = 0; row < GRID_SIZE - 1; row++) {
            if (grid[row][col] !== EMPTY_CELL && grid[row][col] === grid[row + 1][col]) {
                grid[row][col] *= 2;
                grid[row + 1][col] = EMPTY_CELL;
                score += grid[row][col];
                moved = true;
                
                // 合并动画
                const cellElement = getCellElement(row, col);
                if (cellElement) {
                    cellElement.classList.add('merge');
                    setTimeout(() => cellElement.classList.remove('merge'), ANIMATION_DURATION);
                }
                
                // 跳过下一个格子（因为已合并）
                row++;
            }
        }
        
        // 第三步：再次向上移动（处理合并后可能产生的空位）
        for (let row = 1; row < GRID_SIZE; row++) {
            if (grid[row][col] !== EMPTY_CELL) {
                let targetRow = row;
                while (targetRow > 0 && grid[targetRow - 1][col] === EMPTY_CELL) {
                    grid[targetRow - 1][col] = grid[targetRow][col];
                    grid[targetRow][col] = EMPTY_CELL;
                    targetRow--;
                    moved = true;
                }
            }
        }
    }
    
    return moved;
}

// 向下移动（修复后）
function moveTilesDown() {
    let moved = false;
    
    for (let col = 0; col < GRID_SIZE; col++) {
        // 第一步：向下移动
        for (let row = GRID_SIZE - 2; row >= 0; row--) {
            if (grid[row][col] !== EMPTY_CELL) {
                let targetRow = row;
                while (targetRow < GRID_SIZE - 1 && grid[targetRow + 1][col] === EMPTY_CELL) {
                    grid[targetRow + 1][col] = grid[targetRow][col];
                    grid[targetRow][col] = EMPTY_CELL;
                    targetRow++;
                    moved = true;
                }
            }
        }
        
        // 第二步：合并
        for (let row = GRID_SIZE - 1; row > 0; row--) {
            if (grid[row][col] !== EMPTY_CELL && grid[row][col] === grid[row - 1][col]) {
                grid[row][col] *= 2;
                grid[row - 1][col] = EMPTY_CELL;
                score += grid[row][col];
                moved = true;
                
                const cellElement = getCellElement(row, col);
                if (cellElement) {
                    cellElement.classList.add('merge');
                    setTimeout(() => cellElement.classList.remove('merge'), ANIMATION_DURATION);
                }
                
                row--;
            }
        }
        
        // 第三步：再次向下移动
        for (let row = GRID_SIZE - 2; row >= 0; row--) {
            if (grid[row][col] !== EMPTY_CELL) {
                let targetRow = row;
                while (targetRow < GRID_SIZE - 1 && grid[targetRow + 1][col] === EMPTY_CELL) {
                    grid[targetRow + 1][col] = grid[targetRow][col];
                    grid[targetRow][col] = EMPTY_CELL;
                    targetRow++;
                    moved = true;
                }
            }
        }
    }
    
    return moved;
}

// 向左移动（修复后）
function moveTilesLeft() {
    let moved = false;
    
    for (let row = 0; row < GRID_SIZE; row++) {
        // 第一步：向左移动
        for (let col = 1; col < GRID_SIZE; col++) {
            if (grid[row][col] !== EMPTY_CELL) {
                let targetCol = col;
                while (targetCol > 0 && grid[row][targetCol - 1] === EMPTY_CELL) {
                    grid[row][targetCol - 1] = grid[row][targetCol];
                    grid[row][targetCol] = EMPTY_CELL;
                    targetCol--;
                    moved = true;
                }
            }
        }
        
        // 第二步：合并
        for (let col = 0; col < GRID_SIZE - 1; col++) {
            if (grid[row][col] !== EMPTY_CELL && grid[row][col] === grid[row][col + 1]) {
                grid[row][col] *= 2;
                grid[row][col + 1] = EMPTY_CELL;
                score += grid[row][col];
                moved = true;
                
                const cellElement = getCellElement(row, col);
                if (cellElement) {
                    cellElement.classList.add('merge');
                    setTimeout(() => cellElement.classList.remove('merge'), ANIMATION_DURATION);
                }
                
                col++;
            }
        }
        
        // 第三步：再次向左移动
        for (let col = 1; col < GRID_SIZE; col++) {
            if (grid[row][col] !== EMPTY_CELL) {
                let targetCol = col;
                while (targetCol > 0 && grid[row][targetCol - 1] === EMPTY_CELL) {
                    grid[row][targetCol - 1] = grid[row][targetCol];
                    grid[row][targetCol] = EMPTY_CELL;
                    targetCol--;
                    moved = true;
                }
            }
        }
    }
    
    return moved;
}

// 向右移动（修复后）
function moveTilesRight() {
    let moved = false;
    
    for (let row = 0; row < GRID_SIZE; row++) {
        // 第一步：向右移动
        for (let col = GRID_SIZE - 2; col >= 0; col--) {
            if (grid[row][col] !== EMPTY_CELL) {
                let targetCol = col;
                while (targetCol < GRID_SIZE - 1 && grid[row][targetCol + 1] === EMPTY_CELL) {
                    grid[row][targetCol + 1] = grid[row][targetCol];
                    grid[row][targetCol] = EMPTY_CELL;
                    targetCol++;
                    moved = true;
                }
            }
        }
        
        // 第二步：合并
        for (let col = GRID_SIZE - 1; col > 0; col--) {
            if (grid[row][col] !== EMPTY_CELL && grid[row][col] === grid[row][col - 1]) {
                grid[row][col] *= 2;
                grid[row][col - 1] = EMPTY_CELL;
                score += grid[row][col];
                moved = true;
                
                const cellElement = getCellElement(row, col);
                if (cellElement) {
                    cellElement.classList.add('merge');
                    setTimeout(() => cellElement.classList.remove('merge'), ANIMATION_DURATION);
                }
                
                col--;
            }
        }
        
        // 第三步：再次向右移动
        for (let col = GRID_SIZE - 2; col >= 0; col--) {
            if (grid[row][col] !== EMPTY_CELL) {
                let targetCol = col;
                while (targetCol < GRID_SIZE - 1 && grid[row][targetCol + 1] === EMPTY_CELL) {
                    grid[row][targetCol + 1] = grid[row][targetCol];
                    grid[row][targetCol] = EMPTY_CELL;
                    targetCol++;
                    moved = true;
                }
            }
        }
    }
    
    return moved;
}

// ==================== 撤销系统 ====================

// 更新撤销显示
function updateUndoDisplay() {
    const remaining = MAX_UNDO_TIMES - undoUsed;
    
    // 更新按钮
    if (undoButton) {
        undoButton.textContent = `撤销 (${remaining}/${MAX_UNDO_TIMES})`;
        undoButton.disabled = !canUndo || remaining <= 0;
        undoButton.classList.toggle('disabled', !canUndo || remaining <= 0);
        
        const undoBadge = document.getElementById('undo-chances');
        if (undoBadge) undoBadge.textContent = remaining;
    }
    
    // 更新撤销数字显示
    const undoCountElement = document.getElementById('undo-count');
    if (undoCountElement) undoCountElement.textContent = remaining;
    
    const undoWarningElement = document.getElementById('undo-warning');
    if (undoWarningElement) undoWarningElement.textContent = remaining;
    
    // 更新撤销点
    const undoDots = document.querySelectorAll('.undo-dot');
    if (undoDots) {
        undoDots.forEach((dot, index) => {
            if (index < remaining) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
}

// 撤销上一步
function undo() {
    if (!canUndo || undoUsed >= MAX_UNDO_TIMES || isAnimating) {
        showMessage('无法撤销！', 'warning');
        return false;
    }
    
    if (gameOver) {
        showMessage('游戏已结束，无法撤销', 'warning');
        return false;
    }
    
    if (history.length > 0) {
        undoUsed++;
        
        const lastState = history.pop();
        grid = lastState.grid.map(row => [...row]);
        score = lastState.score;
        
        updateGridDisplay();
        updateScoreDisplay();
        updateUndoDisplay();
        
        // 如果撤销次数用完
        if (undoUsed >= MAX_UNDO_TIMES) {
            canUndo = false;
            showMessage('⚠️ 撤销次数已用完！', 'warning');
        } else {
            showMessage(`已撤销！剩余次数: ${MAX_UNDO_TIMES - undoUsed}`, 'info');
        }
        
        saveGameState();
        return true;
    } else {
        showMessage('没有可撤销的操作', 'info');
        return false;
    }
}

// ==================== 存档系统 ====================

// 保存游戏状态
function saveGameState() {
    if (gameOver) {
        localStorage.removeItem('2048-current-game');
        return;
    }
    
    const gameState = {
        grid: grid,
        score: score,
        bestScore: bestScore,
        undoUsed: undoUsed,
        canUndo: canUndo,
        history: history.slice(-5), // 只保存最近5步
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem('2048-current-game', JSON.stringify(gameState));
        
        // 更新游戏统计
        updateGameStatistics();
        return true;
    } catch (e) {
        console.warn('保存游戏状态失败:', e);
        // iOS Safari存储空间限制处理
        if (e.name === 'QuotaExceededError') {
            clearOldGameData();
        }
        return false;
    }
}

// 加载游戏状态
function loadGameState() {
    try {
        const saved = localStorage.getItem('2048-current-game');
        if (!saved) return false;
        
        const gameState = JSON.parse(saved);
        
        // 检查是否过期（超过7天）
        const daysOld = (Date.now() - gameState.timestamp) / (1000 * 60 * 60 * 24);
        if (daysOld > 7) {
            localStorage.removeItem('2048-current-game');
            return false;
        }
        
        grid = gameState.grid;
        score = gameState.score;
        bestScore = gameState.bestScore || 0;
        undoUsed = gameState.undoUsed || 0;
        canUndo = gameState.canUndo !== false;
        history = gameState.history || [];
        
        // 更新显示
        updateGridDisplay();
        updateScoreDisplay();
        updateUndoDisplay();
        
        return true;
    } catch (e) {
        console.warn('加载游戏状态失败:', e);
        return false;
    }
}

// 更新游戏统计
function updateGameStatistics() {
    try {
        // 游戏次数
        const totalGames = parseInt(localStorage.getItem('2048-total-games') || '0');
        localStorage.setItem('2048-total-games', totalGames + 1);
        
        // 胜利次数（当达到2048时更新）
        if (gameWon) {
            const totalWins = parseInt(localStorage.getItem('2048-total-wins') || '0');
            localStorage.setItem('2048-total-wins', totalWins + 1);
        }
        
        // 最高分数
        if (score > bestScore) {
            localStorage.setItem('2048-best-score', score);
        }
    } catch (e) {
        // 静默失败
    }
}

// 清理旧游戏数据
function clearOldGameData() {
    const keysToKeep = ['2048-best-score', '2048-total-games', '2048-total-wins'];
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
        if (key.startsWith('2048-') && !keysToKeep.includes(key)) {
            localStorage.removeItem(key);
        }
    });
}

// ==================== 游戏状态检查 ====================

// 检查游戏状态
function checkGameStatus() {
    // 检查是否获胜
    if (!gameWon) {
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (grid[row][col] === 2048) {
                    gameWon = true;
                    showMessage('恭喜！你获得了2048！🎉', 'success');
                    
                    // 更新胜利统计
                    const totalWins = parseInt(localStorage.getItem('2048-total-wins') || '0') + 1;
                    localStorage.setItem('2048-total-wins', totalWins);
                    
                    // 显示胜利弹窗
                    showGameResult('🎉 恭喜获胜！', score, '你成功合成了2048方块！', true);
                }
            }
        }
    }
    
    // 检查是否结束
    if (!hasEmptyCells() && !canMerge()) {
        gameOver = true;
        showMessage('游戏结束！😢', 'error');
        
        // 显示失败弹窗
        showGameResult('😢 游戏结束', score, '没有可移动的方块了', false);
        
        // 游戏结束时清除存档
        setTimeout(() => {
            localStorage.removeItem('2048-current-game');
        }, 5000);
    }
}

// 检查是否有空格子
function hasEmptyCells() {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (grid[row][col] === EMPTY_CELL) {
                return true;
            }
        }
    }
    return false;
}

// 检查是否可以合并
function canMerge() {
    // 检查水平方向
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE - 1; col++) {
            if (grid[row][col] === grid[row][col + 1]) {
                return true;
            }
        }
    }
    
    // 检查垂直方向
    for (let col = 0; col < GRID_SIZE; col++) {
        for (let row = 0; row < GRID_SIZE - 1; row++) {
            if (grid[row][col] === grid[row + 1][col]) {
                return true;
            }
        }
    }
    
    return false;
}

// 显示消息
function showMessage(text, type) {
    if (messageElement) {
        messageElement.textContent = text;
        messageElement.className = `game-message ${type}`;
        
        // 自动清除消息
        setTimeout(() => {
            if (messageElement.textContent === text) {
                messageElement.textContent = '';
                messageElement.className = 'game-message';
            }
        }, 3000);
    }
}

// 显示游戏结果弹窗
function showGameResult(title, score, message, isWin) {
    const overlay = document.getElementById('game-overlay');
    const resultTitle = document.getElementById('result-title');
    const resultScore = document.getElementById('result-score');
    const resultMessage = document.getElementById('result-message');
    
    if (overlay && resultTitle && resultScore && resultMessage) {
        resultTitle.textContent = title;
        resultScore.innerHTML = `得分: <span class="score-highlight">${score}</span>`;
        resultMessage.textContent = message;
        
        overlay.style.display = 'block';
        overlay.className = `game-overlay ${isWin ? 'win' : 'lose'}`;
    }
}

// ==================== iOS触摸事件优化 ====================

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// 初始化触摸事件
function initTouchEvents() {
    if (!gridElement) return;
    
    // 优化的触摸开始事件
    gridElement.addEventListener('touchstart', (event) => {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            event.preventDefault(); // 防止滚动
        }
    }, { passive: false });
    
    // 优化的触摸结束事件
    gridElement.addEventListener('touchend', (event) => {
        if (event.changedTouches.length === 1) {
            const touch = event.changedTouches[0];
            touchEndX = touch.clientX;
            touchEndY = touch.clientY;
            
            handleSwipe();
            event.preventDefault();
        }
    }, { passive: false });
}

// 处理滑动
function handleSwipe() {
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    // 检查是否达到阈值
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
        return; // 滑动距离太小
    }
    
    // 判断滑动方向
    if (Math.abs(dx) > Math.abs(dy)) {
        // 水平滑动
        if (dx > 0) {
            move('right');
        } else {
            move('left');
        }
    } else {
        // 垂直滑动
        if (dy > 0) {
            move('down');
        } else {
            move('up');
        }
    }
}

// ==================== 键盘控制 ====================

document.addEventListener('keydown', (event) => {
    if (gameOver || isAnimating) return;
    
    let direction = null;
    
    switch(event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            direction = 'up';
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            direction = 'down';
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            direction = 'left';
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            direction = 'right';
            break;
        case 'u':
        case 'U': // 支持键盘撤销
            if (event.ctrlKey || event.metaKey) {
                undo();
            }
            return;
        case 'r':
        case 'R': // 重新开始
            if (restartButton) restartButton.click();
            return;
        case 'Escape': // 返回菜单
            const backButton = document.getElementById('back-to-menu');
            if (backButton) backButton.click();
            return;
    }
    
    if (direction) {
        event.preventDefault();
        move(direction);
    }
});

// ==================== 按钮事件 ====================

// 重新开始
if (restartButton) {
    restartButton.addEventListener('click', () => {
        if (confirm('确定要重新开始吗？当前进度将丢失。')) {
            initGame();
        }
    });
}

// 撤销按钮
if (undoButton) {
    undoButton.addEventListener('click', undo);
}

// ==================== 页面初始化 ====================

// 页面加载完成后初始化
window.addEventListener('load', () => {
    console.log('📱 页面加载完成，初始化游戏...');
    
    // 检测iOS设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
        // iOS特定优化
        document.body.classList.add('ios-device');
        
        // 修复iOS 100ms点击延迟
        document.addEventListener('touchstart', () => {}, { passive: true });
    }
    
    // 初始化触摸事件
    initTouchEvents();
    
    // 初始化游戏
    initGame();
    
    // 更新底部统计数据
    updateFooterStats();
    
    console.log('✅ 游戏准备就绪！');
});

// 更新底部统计数据
function updateFooterStats() {
    try {
        const totalGames = localStorage.getItem('2048-total-games') || '0';
        const totalWins = localStorage.getItem('2048-total-wins') || '0';
        
        const totalGamesElement = document.getElementById('total-games-footer');
        const totalWinsElement = document.getElementById('total-wins-footer');
        
        if (totalGamesElement) totalGamesElement.textContent = totalGames;
        if (totalWinsElement) totalWinsElement.textContent = totalWins;
    } catch (e) {
        console.warn('更新统计数据失败:', e);
    }
}

// 页面关闭前保存
window.addEventListener('beforeunload', () => {
    if (!gameOver) {
        saveGameState();
    }
});

// 导出函数（用于模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initGame,
        move,
        undo,
        saveGameState,
        loadGameState
    };
}