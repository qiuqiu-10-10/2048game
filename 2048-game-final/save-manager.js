// 存档管理器
class SaveManager {
    constructor() {
        this.STORAGE_KEY = '2048-save-data';
        this.loadData();
    }
    
    loadData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            this.data = JSON.parse(data);
        } else {
            this.data = {
                bestScore: 0,
                totalGames: 0,
                totalWins: 0,
                gameHistory: []
            };
        }
    }
    
    saveData() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    }
    
    saveGame(gameState) {
        // 保存当前游戏
        localStorage.setItem('2048-current-game', JSON.stringify(gameState));
        
        // 更新统计数据
        this.data.totalGames++;
        if (gameState.score > this.data.bestScore) {
            this.data.bestScore = gameState.score;
        }
        
        // 保存到历史记录（最多保留10条）
        this.data.gameHistory.unshift({
            score: gameState.score,
            timestamp: Date.now(),
            grid: gameState.grid
        });
        
        if (this.data.gameHistory.length > 10) {
            this.data.gameHistory = this.data.gameHistory.slice(0, 10);
        }
        
        this.saveData();
        return true;
    }
    
    getCurrentGame() {
        return JSON.parse(localStorage.getItem('2048-current-game') || 'null');
    }
    
    clearCurrentGame() {
        localStorage.removeItem('2048-current-game');
    }
    
    hasSavedGame() {
        return !!localStorage.getItem('2048-current-game');
    }
    
    getStats() {
        return {
            bestScore: this.data.bestScore,
            totalGames: this.data.totalGames,
            totalWins: this.data.totalWins,
            winRate: this.data.totalGames > 0 
                ? Math.round((this.data.totalWins / this.data.totalGames) * 100) 
                : 0
        };
    }
}

// 导出全局实例
window.saveManager = new SaveManager();