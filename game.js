// ==================== 游戏状态枚举（添加到文件开头） ====================
const GameState = {
    READY: 'ready',           // 准备就绪，可以操作
    ANIMATING: 'animating',   // 动画中，不可操作
    GAME_OVER: 'game_over',   // 游戏结束
    PAUSED: 'paused',         // 暂停状态
    WIN: 'win'                // 胜利状态
};

// 当前游戏状态
let currentGameState = GameState.READY;

// 性能监控（可选）
const performanceMonitor = {
    moves: 0,
    startTime: performance.now(),
    totalAnimationTime: 0,
    
    logMove() {
        this.moves++;
        const now = performance.now();
        const totalTime = (now - this.startTime) / 1000;
        
        if (this.moves % 10 === 0) {
            const movesPerSecond = this.moves / totalTime;
            console.log(`📊 性能统计: ${movesPerSecond.toFixed(1)} 次移动/秒, 总移动: ${this.moves}`);
            
            // 性能警告
            if (movesPerSecond < 3 && !this.warned) {
                console.warn('⚠️ 游戏性能较低，建议关闭其他标签页');
                this.warned = true;
            }
        }
    }
};
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
    
    // 新增：重置状态管理器
    currentGameState = GameState.READY;
    
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
// ==================== 主移动函数（优化版） ====================
function move(direction) {
    // 1. 状态检查（使用新的状态管理）
    if (gameOver || currentGameState === GameState.ANIMATING) {
        console.log('⏸️ 游戏已结束或动画中，无法移动');
        return false;
    }
    
    // 2. 防快速操作（使用performance.now更精确）
    const now = performance.now();
    if (now - lastMoveTime < 150) { // 增加到150ms防止过快
        console.log('⚡ 操作过快，请稍后');
        return false;
    }
    lastMoveTime = now;
    
    // 3. 保存移动前状态（深拷贝）
    const previousState = {
        grid: grid.map(row => [...row]), // 深拷贝数组
        score: score,
        undoUsed: undoUsed,
        timestamp: now
    };
    
    // 4. 执行移动逻辑
    let moved = false;
    let mergeScore = 0; // 记录本次合并得分
    
    // 立即设置为动画状态，防止其他操作
    currentGameState = GameState.ANIMATING;
    
    // 根据方向执行移动
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
        default:
            console.error('❌ 未知移动方向:', direction);
            currentGameState = GameState.READY;
            return false;
    }
    
    // 5. 如果没有发生移动
    if (!moved) {
        console.log('🚫 没有可移动的方块');
        
        // 恢复状态（确保原子性）
        currentGameState = GameState.READY;
        
        // 使用微任务确保状态同步
        Promise.resolve().then(() => {
            if (currentGameState !== GameState.READY) {
                console.warn('⚠️ 状态不一致，强制恢复');
                currentGameState = GameState.READY;
            }
        });
        
        return false;
    }
    
    // 6. 发生移动，准备动画
    console.log(`🎮 移动方向: ${direction}, 得分: ${score}`);
    
    // 立即更新网格显示（给用户即时反馈）
    updateGridDisplay();
    
    // 7. 创建动画Promise
    const animationPromise = new Promise((resolve) => {
        // 使用requestAnimationFrame确保与浏览器刷新同步
        let animationStartTime = null;
        const animationDuration = ANIMATION_DURATION;
        
        function animateFrame(timestamp) {
            if (!animationStartTime) {
                animationStartTime = timestamp;
            }
            
            const elapsed = timestamp - animationStartTime;
            const progress = Math.min(elapsed / animationDuration, 1);
            
            // 可以在这里添加动画进度更新（如果需要）
            
            if (progress < 1) {
                // 继续动画
                requestAnimationFrame(animateFrame);
            } else {
                // 动画完成
                resolve();
            }
        }
        
        // 开始动画
        requestAnimationFrame(animateFrame);
    });
    
    // 8. 动画完成后执行的操作
    animationPromise
        .then(() => {
            // 添加新方块
            const tileAdded = addRandomTile();
            
            // 更新所有显示
            updateGridDisplay();
            updateScoreDisplay();
            updateUndoDisplay();
            
            // 检查游戏状态
            checkGameStatus();
            
            // 保存游戏状态
            saveGameState();
            
            // 保存到历史记录（动画完成后）
            history.push(previousState);
            
            // 限制历史记录长度
            if (history.length > 20) {
                history.shift();
            }
            
            // 更新性能监控
            if (typeof performanceMonitor !== 'undefined') {
                performanceMonitor.logMove();
            }
            
            // 恢复就绪状态
            currentGameState = gameOver ? GameState.GAME_OVER : GameState.READY;
            
            console.log(`✅ 移动完成, 状态: ${currentGameState}`);
            
            // 动画完成后的额外检查
            setTimeout(() => {
                if (currentGameState === GameState.ANIMATING) {
                    console.warn('⚠️ 动画状态未正确恢复，强制恢复');
                    currentGameState = GameState.READY;
                }
            }, 100);
        })
        .catch((error) => {
            console.error('❌ 动画执行出错:', error);
            
            // 错误恢复：强制恢复到就绪状态
            currentGameState = GameState.READY;
            updateGridDisplay(); // 强制刷新显示
        });
    
    return true;
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
    if (currentGameState === GameState.ANIMATING) {
        showMessage('动画中，请稍后撤销', 'warning');
        return false;
    }
    
    if (!canUndo || undoUsed >= MAX_UNDO_TIMES) {
        showMessage('无法撤销！', 'warning');
        return false;
    }
    
    if (currentGameState === GameState.GAME_OVER) {
        showMessage('游戏已结束，无法撤销', 'warning');
        return false;
    }
        
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
    } 
    {
        showMessage('没有可撤销的操作', 'info');
        return false;
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
                    currentGameState = GameState.WIN; // 更新状态
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
        currentGameState = GameState.GAME_OVER; // 更新状态
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
// ==================== 调试辅助函数 ====================
function getGameStatus() {
    return {
        state: currentGameState,
        isAnimating: currentGameState === GameState.ANIMATING,
        canMove: currentGameState === GameState.READY,
        score: score,
        bestScore: bestScore,
        undoRemaining: MAX_UNDO_TIMES - undoUsed,
        emptyCells: countEmptyCells(),
        historyLength: history.length
    };
}

function countEmptyCells() {
    let count = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (grid[row][col] === EMPTY_CELL) {
                count++;
            }
        }
    }
    return count;
}

// 暴露给控制台调试
window.debug2048 = {
    getStatus: getGameStatus,
    getGrid: () => grid,
    getHistory: () => history,
    forceReady: () => { currentGameState = GameState.READY; console.log('强制设置为就绪状态'); },
    simulateMove: (direction) => move(direction)
};