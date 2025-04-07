// 游戏常量
const CARD_ROWS = 4;
const CARD_COLS = 5;
const TOTAL_CARDS = CARD_ROWS * CARD_COLS;
const MEMORIZE_TIME = 5; // 记牌时间（秒）
const CARD_SUITS = ['♠', '♥', '♣', '♦']; // 黑桃、红心、梅花、方块
// 修改：使用花色数量代替数字
const CARD_VALUES = [1, 2, 3, 4, 5]; // 花色数量
const CARD_COLORS = {
    '♠': '#000000', // 黑色
    '♥': '#ff0000', // 红色
    '♣': '#000000', // 黑色
    '♦': '#ff0000'  // 红色
};

// 鼓励语列表 - 修改为繁体中文
const ENCOURAGEMENTS = [
    "哇塞，你真棒！",
    "加油，你是最棒的！",
    "太厲害了，繼續保持！",
    "你就是今天的記憶之星！",
    "記憶力超群，佩服佩服！",
    "這波操作，滿分！",
    "腦力擔當就是你！",
    "記憶力MAX，無人能敵！",
    "這記性，簡直了！",
    "大腦CPU超頻運行中！"
];

// 游戏状态
let gameState = {
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    correctCount: 0, // 答对次数
    totalAttempts: 0, // 修改：总答题次数（替代原来的wrongCount）
    score: "0/0",    // 分数格式为 "答对/总答题"
    timer: MEMORIZE_TIME,
    gamePhase: 'start', // 'start', 'memorize', 'play', 'end'
    timerInterval: null,
    particles: [],
    isChecking: false // 新增：是否正在检查卡牌匹配
    // 移除 endGameTimer
};

// DOM元素
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const timerElement = document.getElementById('timer');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');
const finalEncouragementElement = document.getElementById('final-encouragement');
const encouragementElement = document.getElementById('encouragement');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// 音频元素
const bgm = document.getElementById('bgm');
const flipSound = document.getElementById('flip-sound');
const matchSound = document.getElementById('match-sound');
const failSound = document.getElementById('fail-sound');

// 初始化游戏
function initGame() {
    // 设置Canvas尺寸
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 初始化卡牌
    initCards();
    
    // 事件监听
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);
    canvas.addEventListener('click', handleCardClick);
    canvas.addEventListener('touchstart', handleCardTouch, { passive: false });
    
    // 开始游戏循环
    requestAnimationFrame(gameLoop);
}

// 调整Canvas尺寸
function resizeCanvas() {
    const containerWidth = gameScreen.clientWidth - 40; // 减去padding
    const containerHeight = window.innerHeight * 0.7; // 使用视口高度的70%
    
    // 设置Canvas尺寸，保持4:5的比例
    const aspectRatio = CARD_ROWS / CARD_COLS;
    let canvasWidth = containerWidth;
    let canvasHeight = canvasWidth * aspectRatio;
    
    // 如果计算出的高度超过容器高度，则以高度为基准
    if (canvasHeight > containerHeight) {
        canvasHeight = containerHeight;
        canvasWidth = canvasHeight / aspectRatio;
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // 如果游戏已经开始，重新绘制卡牌
    if (gameState.gamePhase !== 'start') {
        drawCards();
    }
}

// 初始化卡牌
function initCards() {
    gameState.cards = [];
    gameState.flippedCards = [];
    gameState.matchedPairs = 0;
    
    // 创建10对卡牌（共20张）
    const cardPairs = [];
    // 创建10组不同的数字+花色组合
    const usedCombinations = new Set();
    
    for (let i = 0; i < TOTAL_CARDS / 2; i++) {
        let suit, value, combination;
        
        // 确保每对卡牌都有唯一的数字+花色组合
        do {
            suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
            value = CARD_VALUES[Math.floor(Math.random() * CARD_VALUES.length)];
            combination = `${value}${suit}`;
        } while (usedCombinations.has(combination));
        
        usedCombinations.add(combination);
        
        // 添加一对相同的卡牌
        cardPairs.push({ suit, value, matched: false });
        cardPairs.push({ suit, value, matched: false });
    }
    
    // 洗牌算法
    for (let i = cardPairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
    }
    
    // 设置卡牌位置
    const cardWidth = canvas.width / CARD_COLS;
    const cardHeight = canvas.height / CARD_ROWS;
    
    for (let row = 0; row < CARD_ROWS; row++) {
        for (let col = 0; col < CARD_COLS; col++) {
            const index = row * CARD_COLS + col;
            const card = cardPairs[index];
            card.x = col * cardWidth;
            card.y = row * cardHeight;
            card.width = cardWidth;
            card.height = cardHeight;
            card.flipped = true; // 初始状态为正面朝上（记忆阶段）
            gameState.cards.push(card);
        }
    }
}

// 开始游戏
function startGame() {
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    gameState.gamePhase = 'memorize';
    gameState.timer = MEMORIZE_TIME;
    gameState.correctCount = 0; // 重置答对次数
    gameState.totalAttempts = 0; // 修改：重置总答题次数
    updateScore();
    
    // 播放背景音乐
    bgm.volume = 0.3;
    bgm.play().catch(e => console.log("無法自動播放音頻:", e));
    
    // 开始记牌计时 - 修改为繁体中文
    timerElement.textContent = `記牌時間: ${gameState.timer}`;
    gameState.timerInterval = setInterval(() => {
        gameState.timer--;
        timerElement.textContent = `記牌時間: ${gameState.timer}`;
        
        if (gameState.timer <= 0) {
            clearInterval(gameState.timerInterval);
            startPlayPhase();
        }
    }, 1000);
}

// 开始游戏阶段
function startPlayPhase() {
    gameState.gamePhase = 'play';
    timerElement.textContent = '開始翻牌吧！';
    
    // 将所有卡牌翻面
    gameState.cards.forEach(card => {
        card.flipped = false;
    });
}

// 重新开始游戏
function restartGame() {
    endScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    initCards();
    startGame();
}

// 处理卡牌点击 - 修复点击位置问题
function handleCardClick(event) {
    if (gameState.gamePhase !== 'play') return;
    
    const rect = canvas.getBoundingClientRect();
    // 计算点击位置相对于Canvas的坐标，考虑Canvas的缩放比例
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    checkCardFlip(x, y);
}

// 处理卡牌触摸 - 修复触摸位置问题
function handleCardTouch(event) {
    if (gameState.gamePhase !== 'play') return;
    
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    // 计算触摸位置相对于Canvas的坐标，考虑Canvas的缩放比例
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    
    checkCardFlip(x, y);
}

// 检查卡牌翻转
function checkCardFlip(x, y) {
    // 如果已经翻开两张牌或正在检查匹配，则不能再翻
    if (gameState.flippedCards.length >= 2 || gameState.isChecking) return;
    
    // 检查点击的是哪张卡牌
    for (let i = 0; i < gameState.cards.length; i++) {
        const card = gameState.cards[i];
        
        // 如果卡牌已经匹配或已经翻开，则跳过
        if (card.matched || card.flipped) continue;
        
        // 检查点击是否在卡牌范围内
        if (x >= card.x && x <= card.x + card.width &&
            y >= card.y && y <= card.y + card.height) {
            
            // 播放翻牌音效
            flipSound.currentTime = 0;
            flipSound.play().catch(e => console.log("無法播放音效:", e));
            
            // 翻转卡牌
            card.flipped = true;
            gameState.flippedCards.push(card);
            
            // 如果翻开了两张牌，检查是否匹配
            if (gameState.flippedCards.length === 2) {
                gameState.isChecking = true; // 设置正在检查状态
                setTimeout(checkMatch, 500);
            }
            
            break;
        }
    }
}

// 检查卡牌是否匹配
function checkMatch() {
    const [card1, card2] = gameState.flippedCards;
    
    // 更新总答题次数
    gameState.totalAttempts++;
    updateScore();
    
    // 检查卡牌的花色和数字是否都匹配
    if (card1.suit === card2.suit && card1.value === card2.value) {
        // 匹配成功
        card1.matched = true;
        card2.matched = true;
        gameState.matchedPairs++;
        
        // 播放匹配成功音效
        matchSound.currentTime = 0;
        matchSound.play().catch(e => console.log("無法播放音效:", e));
        
        // 更新答对次数和分数
        gameState.correctCount++;
        updateScore();
        
        // 显示鼓励语和粒子效果
        showEncouragement();
        createParticles(canvas.width / 2, canvas.height / 2);
        
        // 检查游戏是否结束
        if (gameState.matchedPairs === TOTAL_CARDS / 2) {
            setTimeout(endGame, 1000);
        }
        
        // 重置检查状态
        gameState.isChecking = false;
    } else {
        // 匹配失败，将卡牌翻回
        setTimeout(() => {
            card1.flipped = false;
            card2.flipped = false;
            
            // 播放匹配失败音效
            failSound.currentTime = 0;
            failSound.play().catch(e => console.log("無法播放音效:", e));
            
            // 重置检查状态，允许玩家继续翻牌
            gameState.isChecking = false;
        }, 500);
    }
    
    // 清空已翻开的卡牌
    gameState.flippedCards = [];
}

// 更新分数 - 修改为显示答对/总答题的格式，使用繁体中文
function updateScore() {
    gameState.score = `${gameState.correctCount}/${gameState.totalAttempts}`;
    scoreElement.textContent = `分數: ${gameState.score}`;
}

// 显示鼓励语
function showEncouragement() {
    const randomIndex = Math.floor(Math.random() * ENCOURAGEMENTS.length);
    const encouragement = ENCOURAGEMENTS[randomIndex];
    
    encouragementElement.textContent = encouragement;
    encouragementElement.classList.remove('hidden');
    
    setTimeout(() => {
        encouragementElement.classList.add('hidden');
    }, 2000);
}

// 创建粒子效果
function createParticles(x, y) {
    const particleCount = 50;
    const colors = ['#ff6b6b', '#feca57', '#1dd1a1', '#5f27cd', '#54a0ff'];
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        const size = 5 + Math.random() * 10;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        gameState.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            color,
            life: 100
        });
    }
}

// 更新粒子
function updateParticles() {
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const particle = gameState.particles[i];
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // 重力
        particle.life -= 1;
        
        if (particle.life <= 0) {
            gameState.particles.splice(i, 1);
        }
    }
}

// 绘制粒子
function drawParticles() {
    for (const particle of gameState.particles) {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 100;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// 结束游戏
function endGame() {
    gameState.gamePhase = 'end';
    clearInterval(gameState.timerInterval);
    
    // 隐藏游戏屏幕并直接显示结束屏幕
    gameScreen.classList.add('hidden');
    endScreen.classList.remove('hidden');
    
    // 设置最终得分
    finalScoreElement.textContent = `你的最終得分: ${gameState.score}`;
    
    // 根据正确率显示不同的鼓励语 - 修改为繁体中文
    let finalEncouragement = "";
    const correctRatio = gameState.totalAttempts === 0 ? 1 : gameState.correctCount / gameState.totalAttempts;
    
    if (correctRatio === 1) {
        finalEncouragement = "太厲害了！你的記憶力簡直無人能敵！";
    } else if (correctRatio >= 0.7) {
        finalEncouragement = "很棒的表現！你的記憶力令人印象深刻！";
    } else {
        finalEncouragement = "不錯的嘗試！再來一次，你一定能做得更好！";
    }
    
    finalEncouragementElement.textContent = finalEncouragement;
    
    // 移除3秒倒計時相關代碼
}

// 重新开始游戏
function restartGame() {
    endScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    // 移除清除計時器的代碼
    
    initCards();
    startGame();
}

// 绘制卡牌
function drawCards() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (const card of gameState.cards) {
        const padding = Math.min(card.width, card.height) * 0.1;
        
        // 绘制卡牌背景
        ctx.fillStyle = card.flipped ? '#ffffff' : '#4a6fa5';
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        
        // 圆角矩形
        const radius = Math.min(card.width, card.height) * 0.1;
        ctx.beginPath();
        ctx.moveTo(card.x + padding + radius, card.y + padding);
        ctx.lineTo(card.x + card.width - padding - radius, card.y + padding);
        ctx.arcTo(card.x + card.width - padding, card.y + padding, card.x + card.width - padding, card.y + padding + radius, radius);
        ctx.lineTo(card.x + card.width - padding, card.y + card.height - padding - radius);
        ctx.arcTo(card.x + card.width - padding, card.y + card.height - padding, card.x + card.width - padding - radius, card.y + card.height - padding, radius);
        ctx.lineTo(card.x + padding + radius, card.y + card.height - padding);
        ctx.arcTo(card.x + padding, card.y + card.height - padding, card.x + padding, card.y + card.height - padding - radius, radius);
        ctx.lineTo(card.x + padding, card.y + padding + radius);
        ctx.arcTo(card.x + padding, card.y + padding, card.x + padding + radius, card.y + padding, radius);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        
        // 如果卡牌正面朝上，绘制花色和数字
        if (card.flipped) {
            ctx.fillStyle = CARD_COLORS[card.suit];
            
            // 修改：使用花色排列布局代替简单重复显示
            const fontSize = Math.min(card.width, card.height) * 0.25;
            ctx.font = `bold ${fontSize}px Arial`;
            
            // 根据value值确定花色的排列方式
            if (card.value === 1) {
                // 居中显示1个花色
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(card.suit, card.x + card.width / 2, card.y + card.height / 2);
            } else if (card.value === 2) {
                // 上下排列2个花色
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(card.suit, card.x + card.width / 2, card.y + card.height * 0.3);
                ctx.fillText(card.suit, card.x + card.width / 2, card.y + card.height * 0.7);
            } else if (card.value === 3) {
                // 三角形排列3个花色
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(card.suit, card.x + card.width / 2, card.y + card.height * 0.25);
                ctx.fillText(card.suit, card.x + card.width * 0.3, card.y + card.height * 0.7);
                ctx.fillText(card.suit, card.x + card.width * 0.7, card.y + card.height * 0.7);
            } else if (card.value === 4) {
                // 四角排列4个花色
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(card.suit, card.x + card.width * 0.3, card.y + card.height * 0.3);
                ctx.fillText(card.suit, card.x + card.width * 0.7, card.y + card.height * 0.3);
                ctx.fillText(card.suit, card.x + card.width * 0.3, card.y + card.height * 0.7);
                ctx.fillText(card.suit, card.x + card.width * 0.7, card.y + card.height * 0.7);
            } else if (card.value === 5) {
                // 五点骰子排列5个花色
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(card.suit, card.x + card.width * 0.3, card.y + card.height * 0.3);
                ctx.fillText(card.suit, card.x + card.width * 0.7, card.y + card.height * 0.3);
                ctx.fillText(card.suit, card.x + card.width / 2, card.y + card.height / 2);
                ctx.fillText(card.suit, card.x + card.width * 0.3, card.y + card.height * 0.7);
                ctx.fillText(card.suit, card.x + card.width * 0.7, card.y + card.height * 0.7);
            }
            
            // 如果已匹配，添加一个绿色边框
            if (card.matched) {
                ctx.strokeStyle = '#1dd1a1';
                ctx.lineWidth = 4;
                ctx.stroke();
            }
        } else {
            // 卡牌背面图案
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.min(card.width, card.height) * 0.2}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', card.x + card.width / 2, card.y + card.height / 2);
        }
    }
}

// 游戏循环
function gameLoop() {
    // 更新粒子
    updateParticles();
    
    // 绘制卡牌
    drawCards();
    
    // 绘制粒子
    drawParticles();
    
    // 继续游戏循环
    requestAnimationFrame(gameLoop);
}

// 初始化游戏
window.addEventListener('load', initGame);