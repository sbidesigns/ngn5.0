// ============================================================
// NGN4 - Chromatic Mind - 3D Match-3 Puzzle
// Babylon.js 3D Match-3 on 8x8 Grid of Colored Cubes
// ============================================================

(function() {
    'use strict';

    // --- NGN4 Shared ---
    const NGN4 = {
        loadRewards() { try{const d=localStorage.getItem('ngn4_rewards');return d?JSON.parse(d):{coins:0,games:{}};}catch(e){return{coins:0,games:{}};} },
        saveRewards(r){try{localStorage.setItem('ngn4_rewards',JSON.stringify(r));}catch(e){}},
        addCoins(a){const r=this.loadRewards();r.coins=(r.coins||0)+a;this.saveRewards(r);return r.coins;},
        getCoins(){return this.loadRewards().coins||0;},
        playSound(type){
            try{
                const ctx=new(window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator();const g=ctx.createGain();
                o.connect(g);g.connect(ctx.destination);g.gain.value=0.1;
                if(type==='match'){o.frequency.value=500;o.frequency.linearRampToValueAtTime(1000,ctx.currentTime+0.1);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);o.start();o.stop(ctx.currentTime+0.15);}
                else if(type==='combo'){o.frequency.value=700;o.frequency.linearRampToValueAtTime(1400,ctx.currentTime+0.15);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2);o.start();o.stop(ctx.currentTime+0.2);}
                else if(type==='swap'){o.frequency.value=300;g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.05);o.start();o.stop(ctx.currentTime+0.05);}
                else if(type==='invalid'){o.type='square';o.frequency.value=150;g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);o.start();o.stop(ctx.currentTime+0.15);}
                else if(type==='special'){o.frequency.value=400;o.frequency.linearRampToValueAtTime(800,ctx.currentTime+0.1);o.frequency.linearRampToValueAtTime(1200,ctx.currentTime+0.2);o.frequency.linearRampToValueAtTime(1600,ctx.currentTime+0.3);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);o.start();o.stop(ctx.currentTime+0.4);}
                else if(type==='fail'){o.type='sawtooth';o.frequency.value=300;o.frequency.linearRampToValueAtTime(100,ctx.currentTime+0.4);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);o.start();o.stop(ctx.currentTime+0.5);}
                else if(type==='win'){o.frequency.value=400;o.frequency.linearRampToValueAtTime(600,ctx.currentTime+0.15);o.frequency.linearRampToValueAtTime(800,ctx.currentTime+0.3);o.frequency.linearRampToValueAtTime(1200,ctx.currentTime+0.5);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.6);o.start();o.stop(ctx.currentTime+0.6);}
                else if(type==='booster'){o.frequency.value=300;o.frequency.linearRampToValueAtTime(900,ctx.currentTime+0.15);o.frequency.linearRampToValueAtTime(1200,ctx.currentTime+0.25);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);o.start();o.stop(ctx.currentTime+0.3);}
                else if(type==='obstacle'){o.type='sawtooth';o.frequency.value=600;o.frequency.linearRampToValueAtTime(300,ctx.currentTime+0.1);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);o.start();o.stop(ctx.currentTime+0.15);}
                else if(type==='hint'){o.frequency.value=400;o.type='sine';o.frequency.linearRampToValueAtTime(600,ctx.currentTime+0.15);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2);o.start();o.stop(ctx.currentTime+0.2);}
                setTimeout(()=>ctx.close(),1000);
            }catch(e){}
        }
    };

    // --- Constants ---
    const GRID_SIZE = 8;
    const CUBE_SIZE = 1.0;
    const CUBE_GAP = 0.08;
    const COLORS = [
        { name: 'Red', hex: 0xff2244, emissive: new BABYLON.Color3(0.6,0.05,0.1) },
        { name: 'Blue', hex: 0x2244ff, emissive: new BABYLON.Color3(0.05,0.05,0.6) },
        { name: 'Green', hex: 0x22ff44, emissive: new BABYLON.Color3(0.05,0.6,0.1) },
        { name: 'Yellow', hex: 0xffdd22, emissive: new BABYLON.Color3(0.6,0.5,0.05) },
        { name: 'Purple', hex: 0xaa22ff, emissive: new BABYLON.Color3(0.3,0.05,0.6) },
        { name: 'Cyan', hex: 0x22ffee, emissive: new BABYLON.Color3(0.05,0.6,0.6) }
    ];
    const SPECIAL_TYPES = { NONE: 0, BOMB: 1, LIGHTNING: 2, RAINBOW: 3 };

    // Obstacle types
    const OBSTACLE_TYPES = { NONE: 0, JELLY: 1, ICE: 2, CHAIN: 3, CHOCOLATE: 4 };

    // Level types
    const LEVEL_TYPE = { SCORE: 'score', JELLY: 'jelly', INGREDIENTS: 'ingredients', COLLECT_COLORS: 'collectColors', TIMED: 'timed' };

    // --- Level Definitions ---
    const LEVELS = [
        { name:'First Resonance', type: LEVEL_TYPE.SCORE, target:500, moves:30, colors:4, targetColor:null, targetColorCount:0 },
        { name:'Jelly Awakening', type: LEVEL_TYPE.JELLY, target:0, moves:25, colors:4, jellyCount:8, targetColor:null, targetColorCount:0 },
        { name:'Color Shift', type: LEVEL_TYPE.SCORE, target:800, moves:28, colors:5, targetColor:null, targetColorCount:0 },
        { name:'Falling Stars', type: LEVEL_TYPE.INGREDIENTS, target:3, moves:30, colors:4, targetColor:null, targetColorCount:0 },
        { name:'Deep Resonance', type: LEVEL_TYPE.SCORE, target:1200, moves:26, colors:5, targetColor:null, targetColorCount:0 },
        { name:'Ice Fortress', type: LEVEL_TYPE.JELLY, target:0, moves:22, colors:5, jellyCount:12, iceCount:6, targetColor:null, targetColorCount:0 },
        { name:'Prismatic', type: LEVEL_TYPE.COLLECT_COLORS, target:0, moves:25, colors:6, targetColor:0, targetColorCount:15 },
        { name:'Chaos Theory', type: LEVEL_TYPE.SCORE, target:2000, moves:25, colors:6, targetColor:null, targetColorCount:0 },
        { name:'Chain Reaction', type: LEVEL_TYPE.INGREDIENTS, target:4, moves:28, colors:5, targetColor:null, targetColorCount:0 },
        { name:'Speed Match', type: LEVEL_TYPE.TIMED, target:1500, moves:0, timeLimit:45, colors:5, targetColor:null, targetColorCount:0 }
    ];

    // --- Achievements ---
    const ACHIEVEMENTS = {
        comboKing: { name: 'Combo King', desc: 'Get a 5x combo', unlocked: false },
        sugarCrush: { name: 'Sugar Crush', desc: 'Clear all cubes', unlocked: false },
        noMovesLeft: { name: 'No Moves Left', desc: 'Fail without moves', unlocked: false },
        starCollector: { name: 'Star Collector', desc: '3-star all levels', unlocked: false }
    };

    // --- Lives System ---
    const MAX_LIVES = 5;
    const LIFE_REFILL_MS = 10 * 60 * 1000; // 10 minutes
    let lives = MAX_LIVES;
    let lastLifeTime = Date.now();

    function loadLives() {
        try {
            const d = JSON.parse(localStorage.getItem('ngn4_cm_lives') || '{}');
            lives = d.lives || MAX_LIVES;
            lastLifeTime = d.lastLifeTime || Date.now();
            refillLives();
        } catch(e) { lives = MAX_LIVES; lastLifeTime = Date.now(); }
    }

    function saveLives() {
        try { localStorage.setItem('ngn4_cm_lives', JSON.stringify({ lives, lastLifeTime })); } catch(e) {}
    }

    function refillLives() {
        const now = Date.now();
        const elapsed = now - lastLifeTime;
        const livesToAdd = Math.floor(elapsed / LIFE_REFILL_MS);
        if (livesToAdd > 0) {
            lives = Math.min(MAX_LIVES, lives + livesToAdd);
            lastLifeTime += livesToAdd * LIFE_REFILL_MS;
            saveLives();
        }
    }

    function getLifeRefillTimeLeft() {
        if (lives >= MAX_LIVES) return 0;
        return Math.max(0, LIFE_REFILL_MS - (Date.now() - lastLifeTime));
    }

    function useLife() {
        if (lives <= 0) return false;
        lives--;
        saveLives();
        return true;
    }

    // --- Booster Shop State ---
    let activeBoosters = { extraMoves: 0, colorBomb: false, hammer: false, shuffle: false };

    // --- State ---
    let engine, scene, camera, canvas;
    let state = 'menu';
    let currentLevel = 0;
    let levelStars = {};
    let score = 0;
    let movesLeft = 30;
    let combo = 0;
    let comboTimer = 0;
    let sessionCoins = 0;
    let totalScore = 0;
    let timeLeft = 0;
    let timerInterval = null;

    // Grid: 2D array of { colorIndex, special, obstacle, mesh, row, col, iceHits, chained }
    let grid = [];
    let selectedCell = null;
    let isAnimating = false;
    let hintUsed = false;
    let hintTimer = 0;
    let hintCells = [];
    let maxCombo = 0;

    // Ingredient tracking
    let ingredients = [];
    let ingredientsCollected = 0;
    let ingredientTarget = 0;

    // Jelly tracking
    let totalJelly = 0;
    let jellyCleared = 0;

    // Color collection tracking
    let colorCollectCount = 0;
    let targetColorIdx = 0;

    // Floating score popups
    let scorePopups = [];
    // Particles
    let particles = [];
    // Camera
    let camTarget = null;
    // DOM
    let els = {};

    // --- Init ---
    function init() {
        canvas = document.getElementById('gameCanvas');
        engine = new BABYLON.Engine(canvas, true);
        try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
        try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('05-chromatic'); } catch(e) {}

        els = {
            hud: document.getElementById('hud'),
            levelNum: document.getElementById('level-num'),
            movesVal: document.getElementById('moves-val'),
            scoreVal: document.getElementById('score-val'),
            targetVal: document.getElementById('target-val'),
            comboVal: document.getElementById('combo-val'),
            coinsVal: document.getElementById('coins-val'),
            timerDisplay: document.getElementById('timer-display'),
            timerVal: document.getElementById('timer-val'),
            menuScreen: document.getElementById('menu-screen'),
            btnPlay: document.getElementById('btn-play'),
            btnLevels: document.getElementById('btn-levels'),
            totalCoins: document.getElementById('total-coins'),
            levelSelectScreen: document.getElementById('level-select-screen'),
            levelGrid: document.getElementById('level-grid'),
            btnLsBack: document.getElementById('btn-ls-back'),
            levelIntroScreen: document.getElementById('level-intro-screen'),
            liTitle: document.getElementById('li-title'),
            liName: document.getElementById('li-name'),
            liTargetVal: document.getElementById('li-target-val'),
            liMovesVal: document.getElementById('li-moves-val'),
            liStars: document.getElementById('li-stars'),
            btnLiStart: document.getElementById('btn-li-start'),
            hintDisplay: document.getElementById('hint-display'),
            hintText: document.getElementById('hint-text'),
            levelCompleteScreen: document.getElementById('level-complete-screen'),
            lcompTitle: document.getElementById('lcomp-title'),
            lcompStars: document.getElementById('lcomp-stars'),
            lcScore: document.getElementById('lc-score'),
            lcTarget: document.getElementById('lc-target'),
            lcMoves: document.getElementById('lc-moves'),
            lcCoins: document.getElementById('lc-coins'),
            btnWatchAdLc: document.getElementById('btn-watch-ad-lc'),
            btnNextLevel: document.getElementById('btn-next-level'),
            btnLcMenu: document.getElementById('btn-lc-menu'),
            levelFailScreen: document.getElementById('level-fail-screen'),
            btnWatchAdFail: document.getElementById('btn-watch-ad-fail'),
            btnRetry: document.getElementById('btn-retry'),
            btnFailMenu: document.getElementById('btn-fail-menu'),
            victoryScreen: document.getElementById('victory-screen'),
            vScore: document.getElementById('v-score'),
            vCoins: document.getElementById('v-coins'),
            vStars: document.getElementById('v-stars'),
            btnVMenu: document.getElementById('btn-v-menu'),
            adScreen: document.getElementById('ad-screen'),
            adTimerNum: document.getElementById('ad-timer-num'),
            btnSkipAd: document.getElementById('btn-skip-ad'),
            rewardedScreen: document.getElementById('rewarded-ad-screen'),
            rewardBar: document.getElementById('reward-bar'),
            rewardStatus: document.getElementById('reward-status'),
            btnCloseReward: document.getElementById('btn-close-reward'),
            scorePopup: document.getElementById('score-popup')
        };

        loadProgress();
        loadLives();
        loadAchievements();
        bindEvents();
        engine.runRenderLoop(() => { if(scene) scene.render(); });
        window.addEventListener('resize', () => engine.resize());

        // Hint timer check
        setInterval(() => {
            if (state === 'playing' && !isAnimating && movesLeft > 0) {
                hintTimer++;
                if (hintTimer >= 300) { // 5s at 60fps
                    showHint();
                    hintTimer = 0;
                }
            }
        }, 1000/60);

        // Life refill timer
        setInterval(() => {
            refillLives();
        }, 30000);
    }

    function bindEvents() {
        canvas.addEventListener('click', onCanvasClick);
        canvas.addEventListener('touchstart', e => { e.preventDefault(); onCanvasTouch(e); }, {passive:false});

        els.btnPlay.addEventListener('click', () => {
            if (lives <= 0) { NGN4.playSound('fail'); return; }
            startLevel(0);
        });
        els.btnLevels.addEventListener('click', showLevelSelect);
        els.btnLsBack.addEventListener('click', () => hideAll('menu'));
        els.btnLiStart.addEventListener('click', beginLevel);
        els.btnNextLevel.addEventListener('click', () => {
            if(currentLevel < LEVELS.length-1) showInterstitialAd(() => startLevel(currentLevel+1));
            else showVictory();
        });
        els.btnLcMenu.addEventListener('click', () => { disposeScene(); showLevelSelect(); });
        els.btnRetry.addEventListener('click', () => {
            if (lives <= 0) { NGN4.playSound('fail'); return; }
            startLevel(currentLevel);
        });
        els.btnFailMenu.addEventListener('click', () => { disposeScene(); showLevelSelect(); });
        els.btnWatchAdFail.addEventListener('click', () => showRewardedAd(() => { movesLeft += 5; hideAll(); state='playing'; els.hud.classList.remove('hidden'); updateHUD(); }));
        els.btnWatchAdLc.addEventListener('click', () => showRewardedAd(() => { hintUsed=true; }));
        els.btnVMenu.addEventListener('click', () => { disposeScene(); hideAll('menu'); });

        // Gamepad support
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
            requestAnimationFrame(pollGamepad);
        });

        // ESC pause support
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (state === 'playing') {
                    state = 'paused';
                    showPauseOverlay();
                } else if (state === 'paused') {
                    state = 'playing';
                    hidePauseOverlay();
                }
            }
        });
    }

    // --- Gamepad Support ---
    let gpPrevButtons = [];
    let gpPointer = { row: 0, col: 0 };
    let gpSelected = false;

    function pollGamepad() {
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (let i = 0; i < gps.length; i++) { if (gps[i]) { gp = gps[i]; break; } }
        if (!gp) { requestAnimationFrame(pollGamepad); return; }

        if (state === 'playing' && !isAnimating) {
            // D-pad navigation
            const axes = gp.axes;
            if (axes[0] !== undefined) {
                if (axes[0] < -0.5) { if (!gpPrevButtons[14]) { gpPointer.col = Math.max(0, gpPointer.col - 1); gpPrevButtons[14] = true; } }
                else gpPrevButtons[14] = false;
                if (axes[0] > 0.5) { if (!gpPrevButtons[15]) { gpPointer.col = Math.min(GRID_SIZE-1, gpPointer.col + 1); gpPrevButtons[15] = true; } }
                else gpPrevButtons[15] = false;
            }
            if (axes[1] !== undefined) {
                if (axes[1] < -0.5) { if (!gpPrevButtons[12]) { gpPointer.row = Math.max(0, gpPointer.row - 1); gpPrevButtons[12] = true; } }
                else gpPrevButtons[12] = false;
                if (axes[1] > 0.5) { if (!gpPrevButtons[16]) { gpPointer.row = Math.min(GRID_SIZE-1, gpPointer.row + 1); gpPrevButtons[16] = true; } }
                else gpPrevButtons[16] = false;
            }

            // Button A (0) = select/swap
            if (gp.buttons[0] && gp.buttons[0].pressed && !gpPrevButtons[0]) {
                gpPrevButtons[0] = true;
                handleGamepadSelect(gpPointer.row, gpPointer.col);
            } else if (!gp.buttons[0] || !gp.buttons[0].pressed) {
                gpPrevButtons[0] = false;
            }

            // Highlight current pointer
            unhighlightHintCells();
            if (grid[gpPointer.row] && grid[gpPointer.row][gpPointer.col] && grid[gpPointer.row][gpPointer.col].mesh) {
                const m = grid[gpPointer.row][gpPointer.col].mesh;
                m.scaling.setAll(1.1);
                setTimeout(() => { if (m && !m.isDisposed()) m.scaling.setAll(1); }, 200);
            }
        }

        requestAnimationFrame(pollGamepad);
    }

    function handleGamepadSelect(row, col) {
        if (!grid[row] || !grid[row][col]) return;
        if (selectedCell === null) {
            selectedCell = { row, col };
            highlightCell(row, col);
            NGN4.playSound('swap');
        } else {
            const dr = Math.abs(selectedCell.row - row);
            const dc = Math.abs(selectedCell.col - col);
            if (dr + dc === 1) {
                attemptSwap(selectedCell.row, selectedCell.col, row, col);
                unhighlightCell(selectedCell.row, selectedCell.col);
                selectedCell = null;
                hintTimer = 0;
            } else {
                unhighlightCell(selectedCell.row, selectedCell.col);
                selectedCell = { row, col };
                highlightCell(row, col);
                NGN4.playSound('swap');
            }
        }
    }

    function loadProgress() {
        const r=NGN4.loadRewards();
        levelStars = (r.games&&r.games['chromatic-mind']&&r.games['chromatic-mind'].stars) || {};
    }

    function saveProgress() {
        const r=NGN4.loadRewards();
        if(!r.games)r.games={};
        r.games['chromatic-mind']={stars:levelStars};
        NGN4.saveRewards(r);
    }

    function loadAchievements() {
        try {
            const d = JSON.parse(localStorage.getItem('ngn4_cm_achievements') || '{}');
            Object.keys(ACHIEVEMENTS).forEach(k => { if (d[k]) ACHIEVEMENTS[k].unlocked = d[k].unlocked; });
        } catch(e) {}
    }

    function saveAchievements() {
        const d = {};
        Object.keys(ACHIEVEMENTS).forEach(k => { d[k] = { unlocked: ACHIEVEMENTS[k].unlocked }; });
        try { localStorage.setItem('ngn4_cm_achievements', JSON.stringify(d)); } catch(e) {}
    }

    function unlockAchievement(key) {
        if (ACHIEVEMENTS[key] && !ACHIEVEMENTS[key].unlocked) {
            ACHIEVEMENTS[key].unlocked = true;
            saveAchievements();
            NGN4.playSound('special');
            showAchievementPopup(ACHIEVEMENTS[key]);
        }
    }

    function showAchievementPopup(ach) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);color:#ffcc00;font-size:18px;font-weight:bold;z-index:1000;text-shadow:0 0 10px #ff6600;white-space:nowrap;';
        popup.textContent = `🏆 ${ach.name}: ${ach.desc}`;
        document.getElementById('ui-overlay').appendChild(popup);
        setTimeout(() => popup.remove(), 3000);
    }

    // --- Screens ---
    function hideAll(s) {
        ['menuScreen','levelSelectScreen','levelIntroScreen','levelCompleteScreen','levelFailScreen','victoryScreen','adScreen','rewardedScreen','hintDisplay','boosterShopScreen'].forEach(k=>{
            const el = els[k];
            if (el) el.classList.add('hidden');
        });
        els.hud.classList.add('hidden');
        if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
        if(s==='menu'){state='menu';els.menuScreen.classList.remove('hidden');els.totalCoins.querySelector('span').textContent=NGN4.getCoins();
            // Update lives display on menu
            refillLives();
            let livesHtml = '❤️ '.repeat(lives);
            if (lives < MAX_LIVES) {
                const secs = Math.ceil(getLifeRefillTimeLeft()/1000);
                livesHtml += ` (${Math.floor(secs/60)}:${(secs%60).toString().padStart(2,'0')})`;
            }
            const livesEl = document.getElementById('menu-lives');
            if(livesEl) livesEl.textContent = livesHtml;
        }
    }

    function showLevelSelect() {
        hideAll(); state='levelSelect';
        els.levelGrid.innerHTML='';
        const maxUnlocked = Object.keys(levelStars).length;
        LEVELS.forEach((lv,i) => {
            const card = document.createElement('div');
            card.className='level-card'+(i>maxUnlocked?' locked':'');
            const st = levelStars[i]||0;
            card.innerHTML=`<div class="lc-num">${i+1}</div><div class="lc-stars">${'★'.repeat(st)}${'☆'.repeat(3-st)}</div>`;
            if(i<=maxUnlocked)card.addEventListener('click',()=>{
                if(lives<=0){NGN4.playSound('fail');return;}
                startLevel(i);
            });
            els.levelGrid.appendChild(card);
        });
        els.levelSelectScreen.classList.remove('hidden');
    }

    function showInterstitialAd(cb) {
        hideAll();state='ad';let t=5;
        els.adTimerNum.textContent=t;els.adScreen.classList.remove('hidden');els.btnSkipAd.classList.add('hidden');
        const iv=setInterval(()=>{t--;els.adTimerNum.textContent=Math.max(0,t);if(t<=0){clearInterval(iv);els.btnSkipAd.classList.remove('hidden');}},1000);
        els.btnSkipAd.onclick=()=>{clearInterval(iv);cb();};
    }

    function showRewardedAd(cb) {
        hideAll();state='rewardedAd';let p=0;
        els.rewardBar.style.width='0%';els.rewardStatus.textContent='Please wait...';
        els.btnCloseReward.classList.add('hidden');els.rewardedScreen.classList.remove('hidden');
        const iv=setInterval(()=>{p+=5;els.rewardBar.style.width=p+'%';if(p>=100){clearInterval(iv);els.rewardStatus.textContent='Reward ready!';els.btnCloseReward.classList.remove('hidden');}},200);
        els.btnCloseReward.onclick=()=>{clearInterval(iv);cb();};
    }

    // --- Booster Shop ---
    function showBoosterShop() {
        hideAll(); state='boosterShop';
        let shopEl = document.getElementById('booster-shop-container');
        if (!shopEl) {
            shopEl = document.createElement('div');
            shopEl.id = 'booster-shop-container';
            document.getElementById('ui-overlay').appendChild(shopEl);
        }
        const coins = NGN4.getCoins();
        shopEl.innerHTML = `
            <div id="boosterShopScreen" class="screen" style="display:flex;flex-direction:column;align-items:center;gap:12px;">
                <h2 style="color:#ffcc00;font-family:'Orbitron',sans-serif;">BOOSTER SHOP</h2>
                <p style="color:#aaa;">Coins: 🪙 ${coins}</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
                    <button class="btn-secondary booster-btn" data-booster="extraMoves" data-cost="30">+5 Moves (30🪙)</button>
                    <button class="btn-secondary booster-btn" data-booster="colorBomb" data-cost="50">Color Bomb (50🪙)</button>
                    <button class="btn-secondary booster-btn" data-booster="hammer" data-cost="40">Hammer (40🪙)</button>
                    <button class="btn-secondary booster-btn" data-booster="shuffle" data-cost="20">Shuffle (20🪙)</button>
                </div>
                <button class="btn-primary" id="btn-start-with-boosters">BEGIN ▶</button>
                <button class="btn-secondary" id="btn-skip-boosters">Skip</button>
            </div>`;
        shopEl.style.display = '';

        const lv = LEVELS[currentLevel];
        document.querySelectorAll('.booster-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.booster;
                const cost = parseInt(btn.dataset.cost);
                if (NGN4.getCoins() >= cost) {
                    NGN4.addCoins(-cost);
                    if (type === 'extraMoves') activeBoosters.extraMoves++;
                    else activeBoosters[type] = true;
                    NGN4.playSound('booster');
                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';
                    btn.textContent = btn.textContent + ' ✓';
                    // Update coin display
                    shopEl.querySelector('p').textContent = `Coins: 🪙 ${NGN4.getCoins()}`;
                } else {
                    NGN4.playSound('invalid');
                }
            });
        });

        document.getElementById('btn-start-with-boosters').addEventListener('click', () => { shopEl.style.display='none'; beginLevel(); });
        document.getElementById('btn-skip-boosters').addEventListener('click', () => { shopEl.style.display='none'; beginLevel(); });
    }

    // --- Pause Overlay ---
    let pauseOverlayEl = null;
    function showPauseOverlay() {
        if (!pauseOverlayEl) {
            pauseOverlayEl = document.createElement('div');
            pauseOverlayEl.id = 'pause-overlay';
            pauseOverlayEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;font-family:Orbitron,sans-serif;';
            pauseOverlayEl.innerHTML = `
                <h2 style="color:#ffcc00;font-size:32px;margin-bottom:30px;text-shadow:0 0 20px #ff6600;">PAUSED</h2>
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <button id="pause-resume-btn" style="padding:12px 40px;font-size:16px;font-family:Orbitron,sans-serif;background:linear-gradient(135deg,#2a6,#28a);color:#fff;border:2px solid #4c4;border-radius:8px;cursor:pointer;min-width:200px;">RESUME</button>
                    <button id="pause-settings-btn" style="padding:12px 40px;font-size:16px;font-family:Orbitron,sans-serif;background:linear-gradient(135deg,#44a,#66c);color:#fff;border:2px solid #88e;border-radius:8px;cursor:pointer;min-width:200px;">SETTINGS</button>
                    <button id="pause-quit-btn" style="padding:12px 40px;font-size:16px;font-family:Orbitron,sans-serif;background:linear-gradient(135deg,#a44,#c66);color:#fff;border:2px solid #f88;border-radius:8px;cursor:pointer;min-width:200px;">QUIT TO MENU</button>
                </div>
            `;
            document.body.appendChild(pauseOverlayEl);
            document.getElementById('pause-resume-btn').addEventListener('click', () => {
                state = 'playing';
                hidePauseOverlay();
            });
            document.getElementById('pause-settings-btn').addEventListener('click', () => {
                try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.show(); } catch(e) {}
            });
            document.getElementById('pause-quit-btn').addEventListener('click', () => {
                hidePauseOverlay();
                disposeScene();
                hideAll('menu');
            });
        }
        pauseOverlayEl.style.display = 'flex';
    }
    function hidePauseOverlay() {
        if (pauseOverlayEl) pauseOverlayEl.style.display = 'none';
    }

    // --- Level Start ---
    function startLevel(num) {
        hidePauseOverlay();
        currentLevel = num;
        const lv = LEVELS[num];
        const stars = levelStars[num] || 0;

        // Reset boosters
        activeBoosters = { extraMoves: 0, colorBomb: false, hammer: false, shuffle: false };

        hideAll(); state='levelIntro';
        els.liTitle.textContent = `LEVEL ${num+1}`;
        els.liName.textContent = lv.name;

        // Show target based on level type
        let targetText = '';
        if (lv.type === LEVEL_TYPE.SCORE) targetText = `Target: ${lv.target} points`;
        else if (lv.type === LEVEL_TYPE.JELLY) targetText = `Clear all jelly!`;
        else if (lv.type === LEVEL_TYPE.INGREDIENTS) targetText = `Bring down ${lv.target} ingredients!`;
        else if (lv.type === LEVEL_TYPE.COLLECT_COLORS) targetText = `Collect ${lv.targetColorCount} ${COLORS[lv.targetColor].name} cubes!`;
        else if (lv.type === LEVEL_TYPE.TIMED) targetText = `Score ${lv.target} in ${lv.timeLimit}s!`;

        els.liTargetVal.textContent = targetText;
        els.liMovesVal.textContent = lv.type === LEVEL_TYPE.TIMED ? `Time: ${lv.timeLimit}s` : `Moves: ${lv.moves}`;
        els.liStars.textContent = '★'.repeat(stars) + '☆'.repeat(3-stars);
        els.levelIntroScreen.classList.remove('hidden');

        // Replace start button with shop flow
        const startBtn = els.btnLiStart;
        const newBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newBtn, startBtn);
        newBtn.id = 'btn-li-start';
        els.btnLiStart = newBtn;
        els.btnLiStart.addEventListener('click', () => showBoosterShop());
    }

    function beginLevel() {
        // Use a life
        if (!useLife()) { hideAll('menu'); return; }

        hideAll(); disposeScene();
        const lv = LEVELS[currentLevel];

        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.03, 0.02, 0.06, 1);

        camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 14, -10), scene);
        camera.setTarget(BABYLON.Vector3.Zero());
        camera.minZ = 1;

        const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0,1,0), scene);
        hemi.intensity = 0.5;
        const point = new BABYLON.PointLight('point', new BABYLON.Vector3(0,10,0), scene);
        point.intensity = 0.4;
        point.diffuse = new BABYLON.Color3(0.8, 0.4, 1);

        const gl = new BABYLON.GlowLayer('glow', scene);
        gl.intensity = 0.5;

        score = 0;
        movesLeft = lv.moves + activeBoosters.extraMoves * 5;
        combo = 0;
        comboTimer = 0;
        sessionCoins = 0;
        selectedCell = null;
        isAnimating = false;
        hintUsed = false;
        hintTimer = 0;
        hintCells = [];
        maxCombo = 0;
        particles = [];
        scorePopups = [];
        grid = [];
        timeLeft = lv.timeLimit || 0;
        ingredientsCollected = 0;
        ingredientTarget = lv.target || 0;
        jellyCleared = 0;
        totalJelly = lv.jellyCount || 0;
        colorCollectCount = 0;
        targetColorIdx = lv.targetColor || 0;

        // Generate obstacle positions
        let jellyPositions = new Set();
        let icePositions = new Set();
        let chainPositions = new Set();
        let chocolatePositions = new Set();

        if (lv.jellyCount) {
            while (jellyPositions.size < lv.jellyCount) {
                jellyPositions.add(`${Math.floor(Math.random()*GRID_SIZE)}_${Math.floor(Math.random()*GRID_SIZE)}`);
            }
        }
        if (lv.iceCount) {
            while (icePositions.size < lv.iceCount) {
                const pos = `${Math.floor(Math.random()*GRID_SIZE)}_${Math.floor(Math.random()*GRID_SIZE)}`;
                if (!jellyPositions.has(pos)) icePositions.add(pos);
            }
        }
        // Add some chain and chocolate on harder levels
        if (currentLevel >= 5) {
            const chainCount = 3 + Math.floor(currentLevel / 3);
            while (chainPositions.size < chainCount) {
                const pos = `${Math.floor(Math.random()*GRID_SIZE)}_${Math.floor(Math.random()*GRID_SIZE)}`;
                if (!jellyPositions.has(pos) && !icePositions.has(pos)) chainPositions.add(pos);
            }
        }
        if (currentLevel >= 7) {
            const chocCount = 2 + Math.floor(currentLevel / 4);
            while (chocolatePositions.size < chocCount) {
                const pos = `${Math.floor(Math.random()*GRID_SIZE)}_${Math.floor(Math.random()*GRID_SIZE)}`;
                if (!jellyPositions.has(pos) && !icePositions.has(pos) && !chainPositions.has(pos)) chocolatePositions.add(pos);
            }
        }

        // Create grid data
        for (let r = 0; r < GRID_SIZE; r++) {
            grid[r] = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                let colorIdx;
                do {
                    colorIdx = Math.floor(Math.random() * lv.colors);
                } while (wouldMatch(r, c, colorIdx));

                let obstacle = OBSTACLE_TYPES.NONE;
                const key = `${r}_${c}`;
                if (jellyPositions.has(key)) obstacle = OBSTACLE_TYPES.JELLY;
                if (icePositions.has(key)) obstacle = OBSTACLE_TYPES.ICE;
                if (chainPositions.has(key)) obstacle = OBSTACLE_TYPES.CHAIN;

                grid[r][c] = {
                    colorIndex: colorIdx,
                    special: SPECIAL_TYPES.NONE,
                    obstacle: obstacle,
                    mesh: null,
                    row: r, col: c,
                    iceHits: 0,
                    chained: chainPositions.has(key)
                };
            }
        }

        // Add chocolate (can overlap with empty-ish cells)
        chocolatePositions.forEach(key => {
            const [r, c] = key.split('_').map(Number);
            if (grid[r][c]) grid[r][c].obstacle = OBSTACLE_TYPES.CHOCOLATE;
        });

        // Create ingredient positions (top 2 rows)
        ingredients = [];
        if (lv.type === LEVEL_TYPE.INGREDIENTS) {
            for (let i = 0; i < ingredientTarget; i++) {
                const r = Math.floor(Math.random() * 2);
                const c = Math.floor(Math.random() * GRID_SIZE);
                ingredients.push({ row: r, col: c, collected: false });
            }
        }

        createGridMeshes();

        state = 'playing';
        els.hud.classList.remove('hidden');
        els.levelNum.textContent = currentLevel + 1;
        updateTargetDisplay();
        updateHUD();

        // Timed mode
        if (lv.type === LEVEL_TYPE.TIMED) {
            els.timerDisplay.classList.remove('hidden');
            timeLeft = lv.timeLimit;
            timerInterval = setInterval(() => {
                if (state !== 'playing') return;
                timeLeft--;
                els.timerVal.textContent = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`;
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    checkLevelState();
                }
            }, 1000);
        }

        // Apply shuffle booster
        if (activeBoosters.shuffle) {
            setTimeout(() => { shuffleGrid(); NGN4.playSound('booster'); }, 500);
        }

        setTimeout(() => processAllMatches(), 500);
    }

    function updateTargetDisplay() {
        const lv = LEVELS[currentLevel];
        if (lv.type === LEVEL_TYPE.SCORE) els.targetVal.textContent = lv.target;
        else if (lv.type === LEVEL_TYPE.JELLY) els.targetVal.textContent = `Jelly: ${jellyCleared}/${totalJelly}`;
        else if (lv.type === LEVEL_TYPE.INGREDIENTS) els.targetVal.textContent = `Items: ${ingredientsCollected}/${ingredientTarget}`;
        else if (lv.type === LEVEL_TYPE.COLLECT_COLORS) els.targetVal.textContent = `${COLORS[targetColorIdx].name}: ${colorCollectCount}/${lv.targetColorCount}`;
        else if (lv.type === LEVEL_TYPE.TIMED) els.targetVal.textContent = lv.target;
    }

    function wouldMatch(row, col, colorIdx) {
        if (col >= 2 && grid[row][col-1] && grid[row][col-2] &&
            grid[row][col-1].colorIndex === colorIdx && grid[row][col-2].colorIndex === colorIdx) return true;
        if (row >= 2 && grid[row-1] && grid[row-2] &&
            grid[row-1][col] && grid[row-2][col] &&
            grid[row-1][col].colorIndex === colorIdx && grid[row-2][col].colorIndex === colorIdx) return true;
        return false;
    }

    function gridToWorld(row, col) {
        const offset = (GRID_SIZE - 1) * (CUBE_SIZE + CUBE_GAP) / 2;
        return new BABYLON.Vector3(col * (CUBE_SIZE + CUBE_GAP) - offset, row * (CUBE_SIZE + CUBE_GAP) - offset, 0);
    }

    function createGridMeshes() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                createCubeMesh(r, c);
            }
        }
        // Create ingredient meshes
        ingredients.forEach((ing, i) => {
            if (ing.collected) return;
            const pos = gridToWorld(ing.row, ing.col);
            const mesh = BABYLON.MeshBuilder.CreateSphere(`ing_${i}`, {diameter:0.8}, scene);
            mesh.position = pos;
            const mat = new BABYLON.StandardMaterial(`ingmat_${i}`, scene);
            mat.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
            mat.emissiveColor = new BABYLON.Color3(0.5, 0.25, 0);
            mesh.material = mat;
            ing.mesh = mesh;
        });
    }

    function createCubeMesh(row, col) {
        const cell = grid[row][col];
        if (!cell) return null;
        const pos = gridToWorld(row, col);
        const color = COLORS[cell.colorIndex];

        const mesh = BABYLON.MeshBuilder.CreateBox(`cube_${row}_${col}`, {size:CUBE_SIZE}, scene);
        mesh.position = pos;
        const mat = new BABYLON.StandardMaterial(`cmat_${row}_${col}`, scene);
        mat.diffuseColor = new BABYLON.Color3((color.hex>>16&0xff)/255,(color.hex>>8&0xff)/255,(color.hex&0xff)/255);
        mat.emissiveColor = color.emissive.clone();
        mat.specularColor = new BABYLON.Color3(0.2,0.2,0.2);
        mat.alpha = 1;
        mesh.material = mat;
        mesh.scaling.setAll(1);

        // Special block visual
        if (cell.special === SPECIAL_TYPES.BOMB) {
            mesh.scaling.setAll(1.1);
            mat.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
        } else if (cell.special === SPECIAL_TYPES.LIGHTNING) {
            mat.emissiveColor = new BABYLON.Color3(0, 1, 1);
        } else if (cell.special === SPECIAL_TYPES.RAINBOW) {
            mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
            mat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        }

        // Obstacle visuals
        if (cell.obstacle === OBSTACLE_TYPES.JELLY) {
            mat.emissiveColor = new BABYLON.Color3(0.6, 0.2, 0.8);
            mat.alpha = 0.7;
        } else if (cell.obstacle === OBSTACLE_TYPES.ICE) {
            mat.diffuseColor = new BABYLON.Color3(0.7, 0.85, 1);
            mat.emissiveColor = new BABYLON.Color3(0.3, 0.4, 0.6);
        } else if (cell.obstacle === OBSTACLE_TYPES.CHAIN) {
            mat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        } else if (cell.obstacle === OBSTACLE_TYPES.CHOCOLATE) {
            mat.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
            mat.emissiveColor = new BABYLON.Color3(0.2, 0.1, 0.05);
        }

        cell.mesh = mesh;
        return mesh;
    }

    // --- Click Handling ---
    function onCanvasClick(e) {
        if (state !== 'playing' || isAnimating) return;
        handlePick(e.clientX, e.clientY);
    }

    function onCanvasTouch(e) {
        if (state !== 'playing' || isAnimating) return;
        if (e.touches.length > 0) handlePick(e.touches[0].clientX, e.touches[0].clientY);
    }

    function handlePick(screenX, screenY) {
        hintTimer = 0;
        unhighlightHintCells();

        // Check if hammer booster is active - single click to break
        if (activeBoosters.hammer) {
            const pickResult = scene.pick(screenX, screenY);
            if (pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name.startsWith('cube_')) {
                const parts = pickResult.pickedMesh.name.split('_');
                const row = parseInt(parts[1]);
                const col = parseInt(parts[2]);
                if (grid[row][col]) {
                    activeBoosters.hammer = false;
                    const toRemove = [{ row, col }];
                    removeCells(toRemove, 0);
                    movesLeft--;
                    updateHUD();
                    NGN4.playSound('booster');
                }
            }
            return;
        }

        // Check if color bomb is active - select any cube to clear all of that color
        if (activeBoosters.colorBomb) {
            const pickResult = scene.pick(screenX, screenY);
            if (pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name.startsWith('cube_')) {
                const parts = pickResult.pickedMesh.name.split('_');
                const row = parseInt(parts[1]);
                const col = parseInt(parts[2]);
                if (grid[row][col]) {
                    activeBoosters.colorBomb = false;
                    const colorIdx = grid[row][col].colorIndex;
                    const toRemove = [];
                    for (let r = 0; r < GRID_SIZE; r++) {
                        for (let c = 0; c < GRID_SIZE; c++) {
                            if (grid[r][c] && grid[r][c].colorIndex === colorIdx) {
                                toRemove.push({ row: r, col: c });
                            }
                        }
                    }
                    removeCells(toRemove, toRemove.length * 10);
                    movesLeft--;
                    updateHUD();
                    NGN4.playSound('booster');
                }
            }
            return;
        }

        const pickResult = scene.pick(screenX, screenY);
        if (!pickResult.hit || !pickResult.pickedMesh) return;

        const meshName = pickResult.pickedMesh.name;
        if (!meshName.startsWith('cube_')) return;

        const parts = meshName.split('_');
        const row = parseInt(parts[1]);
        const col = parseInt(parts[2]);

        if (!grid[row] || !grid[row][col]) return;

        // Check if it's a chained cell - can't select chained cells
        if (grid[row][col].chained) {
            NGN4.playSound('invalid');
            return;
        }

        if (selectedCell === null) {
            selectedCell = { row, col };
            highlightCell(row, col);
            NGN4.playSound('swap');
        } else {
            const dr = Math.abs(selectedCell.row - row);
            const dc = Math.abs(selectedCell.col - col);

            if (dr + dc === 1) {
                // Check if target is also chained
                if (grid[row][col].chained) {
                    NGN4.playSound('invalid');
                    unhighlightCell(selectedCell.row, selectedCell.col);
                    selectedCell = null;
                    return;
                }
                attemptSwap(selectedCell.row, selectedCell.col, row, col);
                unhighlightCell(selectedCell.row, selectedCell.col);
                selectedCell = null;
            } else {
                unhighlightCell(selectedCell.row, selectedCell.col);
                selectedCell = { row, col };
                highlightCell(row, col);
                NGN4.playSound('swap');
            }
        }
    }

    function highlightCell(row, col) {
        const cell = grid[row][col];
        if (cell && cell.mesh) {
            cell.mesh.scaling.setAll(1.15);
            cell.mesh.material.emissiveColor = new BABYLON.Color3(1, 1, 0.5);
        }
    }

    function unhighlightCell(row, col) {
        const cell = grid[row][col];
        if (cell && cell && cell.mesh) {
            cell.mesh.scaling.setAll(1);
            const color = COLORS[cell.colorIndex];
            cell.mesh.material.emissiveColor = color.emissive;
        }
    }

    function unhighlightHintCells() {
        hintCells.forEach(({row, col}) => {
            const cell = grid[row] && grid[row][col];
            if (cell && cell.mesh) cell.mesh.scaling.setAll(1);
        });
        hintCells = [];
    }

    // --- Hint System ---
    function findHintMove() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (!grid[r][c]) continue;
                // Try swap right
                if (c < GRID_SIZE - 1 && grid[r][c+1]) {
                    swapInGrid(r, c, r, c+1);
                    if (findMatches().length > 0) { swapInGrid(r, c, r, c+1); return [{row:r,col:c},{row:r,col:c+1}]; }
                    swapInGrid(r, c, r, c+1);
                }
                // Try swap down
                if (r < GRID_SIZE - 1 && grid[r+1][c]) {
                    swapInGrid(r, c, r+1, c);
                    if (findMatches().length > 0) { swapInGrid(r, c, r+1, c); return [{row:r,col:c},{row:r+1,col:c}]; }
                    swapInGrid(r, c, r+1, c);
                }
            }
        }
        return null;
    }

    function showHint() {
        const hint = findHintMove();
        if (!hint) return;
        NGN4.playSound('hint');
        hintCells = hint;
        hint.forEach(({row, col}) => {
            const cell = grid[row][col];
            if (cell && cell.mesh) {
                cell.mesh.scaling.setAll(1.2);
                cell.mesh.material.emissiveColor = new BABYLON.Color3(1, 1, 0.3);
            }
        });
        // Auto-hide after 2s
        setTimeout(() => unhighlightHintCells(), 2000);
    }

    // --- Swap Logic ---
    function attemptSwap(r1, c1, r2, c2) {
        isAnimating = true;
        NGN4.playSound('swap');

        // Check rainbow activation
        const cell1 = grid[r1][c1];
        const cell2 = grid[r2][c2];
        let rainbowActivated = false;

        if (cell1.special === SPECIAL_TYPES.RAINBOW || cell2.special === SPECIAL_TYPES.RAINBOW) {
            rainbowActivated = true;
            const rainbowCell = cell1.special === SPECIAL_TYPES.RAINBOW ? cell1 : cell2;
            const otherCell = cell1.special === SPECIAL_TYPES.RAINBOW ? cell2 : cell1;
            const targetColor = otherCell.colorIndex;

            // Clear all cubes of target color
            const toRemove = [];
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (grid[r][c] && grid[r][c].colorIndex === targetColor) {
                        toRemove.push({ row: r, col: c });
                    }
                }
            }
            // Also remove the rainbow itself
            const rRow = rainbowCell.row, rCol = rainbowCell.col;
            toRemove.push({ row: rRow, col: rCol });

            combo++;
            comboTimer = 60;
            const pts = toRemove.length * 10 * Math.min(combo, 10);
            score += pts;
            removeCells(toRemove, pts);
            movesLeft--;
            updateHUD();

            setTimeout(() => {
                cascadeGrid();
                setTimeout(() => {
                    rebuildMeshes();
                    setTimeout(() => {
                        const newMatches = findMatches();
                        if (newMatches.length > 0) processMatches(newMatches);
                        else { isAnimating = false; updateHUD(); checkLevelState(); }
                    }, 300);
                }, 300);
            }, 200);
            return;
        }

        // Normal swap
        swapInGrid(r1, c1, r2, c2);
        const pos1 = gridToWorld(r1, c1);
        const pos2 = gridToWorld(r2, c2);
        animatePosition(grid[r1][c1].mesh, pos1, 200);
        animatePosition(grid[r2][c2].mesh, pos2, 200);
        grid[r1][c1].row=r1; grid[r1][c1].col=c1;
        grid[r2][c2].row=r2; grid[r2][c2].col=c2;
        if(grid[r1][c1].mesh) grid[r1][c1].mesh.name = `cube_${r1}_${c1}`;
        if(grid[r2][c2].mesh) grid[r2][c2].mesh.name = `cube_${r2}_${c2}`;

        setTimeout(() => {
            const matches = findMatches();
            if (matches.length > 0) {
                movesLeft--;
                combo = 0;
                processMatches(matches);
                // Spread chocolate after each move
                spreadChocolate();
            } else {
                swapInGrid(r1, c1, r2, c2);
                const bp1 = gridToWorld(r1, c1);
                const bp2 = gridToWorld(r2, c2);
                animatePosition(grid[r1][c1].mesh, bp1, 200);
                animatePosition(grid[r2][c2].mesh, bp2, 200);
                grid[r1][c1].row=r1;grid[r1][c1].col=c1;
                grid[r2][c2].row=r2;grid[r2][c2].col=c2;
                if(grid[r1][c1].mesh) grid[r1][c1].mesh.name=`cube_${r1}_${c1}`;
                if(grid[r2][c2].mesh) grid[r2][c2].mesh.name=`cube_${r2}_${c2}`;
                NGN4.playSound('invalid');
                setTimeout(() => { isAnimating = false; updateHUD(); }, 250);
            }
        }, 250);
    }

    function spreadChocolate() {
        const newChocolates = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] && grid[r][c].obstacle === OBSTACLE_TYPES.CHOCOLATE) {
                    const dirs = [{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];
                    for (const d of dirs) {
                        const nr = r + d.dr, nc = c + d.dc;
                        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE &&
                            grid[nr][nc] && grid[nr][nc].obstacle === OBSTACLE_TYPES.NONE && Math.random() < 0.3) {
                            newChocolates.push({ row: nr, col: nc });
                        }
                    }
                }
            }
        }
        newChocolates.forEach(({row, col}) => {
            grid[row][col].obstacle = OBSTACLE_TYPES.CHOCOLATE;
            if (grid[row][col].mesh) {
                grid[row][col].mesh.material.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
                grid[row][col].mesh.material.emissiveColor = new BABYLON.Color3(0.2, 0.1, 0.05);
            }
        });
    }

    function animatePosition(mesh, target, duration) {
        if (!mesh) return;
        const start = mesh.position.clone();
        const startTime = performance.now();
        function tick() {
            const elapsed = performance.now() - startTime;
            const t = Math.min(1, elapsed / duration);
            mesh.position = BABYLON.Vector3.Lerp(start, target, t);
            if (t < 1) requestAnimationFrame(tick);
        }
        tick();
    }

    // --- Match Finding ---
    function findMatches() {
        const matches = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            let start = 0;
            for (let c = 1; c <= GRID_SIZE; c++) {
                if (c < GRID_SIZE && grid[r][c] && grid[r][start] &&
                    grid[r][c].colorIndex === grid[r][start].colorIndex) continue;
                const len = c - start;
                if (len >= 3) {
                    const cells = [];
                    for (let k = start; k < c; k++) cells.push({row:r, col:k});
                    matches.push(cells);
                }
                start = c;
            }
        }
        for (let c = 0; c < GRID_SIZE; c++) {
            let start = 0;
            for (let r = 1; r <= GRID_SIZE; r++) {
                if (r < GRID_SIZE && grid[r][c] && grid[start][c] &&
                    grid[r][c].colorIndex === grid[start][c].colorIndex) continue;
                const len = r - start;
                if (len >= 3) {
                    const cells = [];
                    for (let k = start; k < r; k++) cells.push({row:k, col:c});
                    matches.push(cells);
                }
                start = r;
            }
        }
        return matches;
    }

    function removeCells(toRemove, points) {
        toRemove.forEach(cell => {
            const g = grid[cell.row] && grid[cell.row][cell.col];
            if (!g) return;

            // Handle obstacle logic
            if (g.obstacle === OBSTACLE_TYPES.JELLY) {
                jellyCleared++;
                g.obstacle = OBSTACLE_TYPES.NONE;
                NGN4.playSound('obstacle');
                // Don't remove the cube, just clear jelly
                if (g.mesh) {
                    g.mesh.material.emissiveColor = COLORS[g.colorIndex].emissive.clone();
                    g.mesh.material.alpha = 1;
                }
                // Remove from toRemove processing
                return;
            }
            if (g.obstacle === OBSTACLE_TYPES.ICE) {
                g.iceHits++;
                if (g.iceHits >= 2) {
                    g.obstacle = OBSTACLE_TYPES.NONE;
                    NGN4.playSound('obstacle');
                    if (g.mesh) {
                        g.mesh.material.diffuseColor = new BABYLON.Color3((COLORS[g.colorIndex].hex>>16&0xff)/255,(COLORS[g.colorIndex].hex>>8&0xff)/255,(COLORS[g.colorIndex].hex&0xff)/255);
                        g.mesh.material.emissiveColor = COLORS[g.colorIndex].emissive.clone();
                    }
                    // Actually remove on second hit
                    if (g.mesh) { spawnParticles(g.mesh.position, COLORS[g.colorIndex].hex, 6); g.mesh.dispose(); g.mesh = null; }
                    grid[cell.row][cell.col] = null;
                } else {
                    // First hit - crack visual
                    if (g.mesh) {
                        g.mesh.material.diffuseColor = new BABYLON.Color3(0.5, 0.65, 0.8);
                    }
                    return;
                }
                return;
            }
            if (g.obstacle === OBSTACLE_TYPES.CHAIN) {
                // Can't remove chained cubes directly
                return;
            }
            if (g.obstacle === OBSTACLE_TYPES.CHOCOLATE) {
                NGN4.playSound('obstacle');
                if (g.mesh) { spawnParticles(g.mesh.position, 0x663311, 6); g.mesh.dispose(); g.mesh = null; }
                grid[cell.row][cell.col] = null;
                return;
            }

            // Normal removal
            if (g.mesh) {
                spawnParticles(g.mesh.position, COLORS[g.colorIndex].hex, 6);
                g.mesh.dispose();
                g.mesh = null;
            }
            grid[cell.row][cell.col] = null;
        });
    }

    // --- Match Processing ---
    function processMatches(matches) {
        combo++;
        comboTimer = 60;
        if (combo > maxCombo) maxCombo = combo;
        const comboMult = Math.min(combo, 10);

        // Check achievement
        if (combo >= 5) unlockAchievement('comboKing');

        const toRemove = new Map();
        matches.forEach(m => {
            m.forEach(cell => {
                const key = `${cell.row}_${cell.col}`;
                if (!toRemove.has(key)) toRemove.set(key, cell);
            });

            if (m.length === 4) {
                const mid = m[Math.floor(m.length/2)];
                const cell = grid[mid.row][mid.col];
                if (cell) {
                    toRemove.delete(`${mid.row}_${mid.col}`);
                    cell.special = SPECIAL_TYPES.LIGHTNING;
                    NGN4.playSound('special');
                }
            } else if (m.length >= 5) {
                const mid = m[Math.floor(m.length/2)];
                const cell = grid[mid.row][mid.col];
                if (cell) {
                    toRemove.delete(`${mid.row}_${mid.col}`);
                    cell.special = SPECIAL_TYPES.RAINBOW;
                    NGN4.playSound('special');
                }
            }
        });

        // Handle special block triggers
        const additionalRemovals = [];
        toRemove.forEach((cell, key) => {
            const g = grid[cell.row][cell.col];
            if (g && g.special === SPECIAL_TYPES.BOMB) {
                for (let dr=-1; dr<=1; dr++) {
                    for (let dc=-1; dc<=1; dc++) {
                        const nr = cell.row+dr, nc = cell.col+dc;
                        if (nr>=0 && nr<GRID_SIZE && nc>=0 && nc<GRID_SIZE) {
                            additionalRemovals.push({row:nr,col:nc});
                        }
                    }
                }
            } else if (g && g.special === SPECIAL_TYPES.LIGHTNING) {
                for (let c=0; c<GRID_SIZE; c++) additionalRemovals.push({row:cell.row,col:c});
            }
        });

        additionalRemovals.forEach(cell => toRemove.set(`${cell.row}_${cell.col}`, cell));

        // Track color collection
        const lv = LEVELS[currentLevel];
        toRemove.forEach((cell) => {
            const g = grid[cell.row][cell.col];
            if (g && lv.type === LEVEL_TYPE.COLLECT_COLORS && g.colorIndex === targetColorIdx) {
                colorCollectCount++;
            }
        });

        const matchPoints = toRemove.size * 10 * comboMult;
        score += matchPoints;

        if (combo > 1) NGN4.playSound('combo');
        else NGN4.playSound('match');

        if (toRemove.size > 0) {
            const firstCell = toRemove.values().next().value;
            const worldPos = gridToWorld(firstCell.row, firstCell.col);
            showScorePopup(worldPos, `+${matchPoints}`, combo > 1 ? '#ff6600' : '#ffcc00');
        }

        // Remove cells (handles obstacles)
        removeCells(toRemove, matchPoints);

        // Check chain clearing: if adjacent cell was matched, unchain chained cells
        unchainAdjacent(toRemove);

        // Cascade: drop cubes down and fill from top
        setTimeout(() => {
            cascadeGrid();
            setTimeout(() => {
                rebuildMeshes();
                updateIngredients();
                setTimeout(() => {
                    const newMatches = findMatches();
                    if (newMatches.length > 0) {
                        processMatches(newMatches);
                    } else {
                        isAnimating = false;
                        updateHUD();
                        checkLevelState();
                    }
                }, 300);
            }, 300);
        }, 200);
    }

    function unchainAdjacent(matchedCells) {
        const matchedSet = new Set();
        matchedCells.forEach(cell => matchedSet.add(`${cell.row}_${cell.col}`));
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] && grid[r][c].chained) {
                    const dirs = [{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];
                    for (const d of dirs) {
                        const nr = r + d.dr, nc = c + d.dc;
                        if (matchedSet.has(`${nr}_${nc}`)) {
                            grid[r][c].chained = false;
                            grid[r][c].obstacle = OBSTACLE_TYPES.NONE;
                            if (grid[r][c].mesh) {
                                grid[r][c].mesh.material.emissiveColor = COLORS[grid[r][c].colorIndex].emissive.clone();
                            }
                            NGN4.playSound('obstacle');
                            break;
                        }
                    }
                }
            }
        }
    }

    function updateIngredients() {
        if (LEVELS[currentLevel].type !== LEVEL_TYPE.INGREDIENTS) return;
        // Move ingredients down as cells are removed
        ingredients.forEach(ing => {
            if (ing.collected) return;
            // Check if ingredient can fall
            while (ing.row < GRID_SIZE - 1 && (!grid[ing.row + 1][ing.col] || grid[ing.row + 1][ing.col] === null)) {
                ing.row++;
            }
            // Check if reached bottom
            if (ing.row >= GRID_SIZE - 1) {
                ing.collected = true;
                ingredientsCollected++;
                if (ing.mesh) { ing.mesh.dispose(); ing.mesh = null; }
                NGN4.playSound('special');
                score += 100;
            } else if (ing.mesh) {
                const pos = gridToWorld(ing.row, ing.col);
                animatePosition(ing.mesh, pos, 200);
            }
        });
    }

    function cascadeGrid() {
        const lv = LEVELS[currentLevel];
        for (let c = 0; c < GRID_SIZE; c++) {
            let writePos = GRID_SIZE - 1;
            for (let r = GRID_SIZE - 1; r >= 0; r--) {
                if (grid[r][c] !== null) {
                    grid[writePos][c] = grid[r][c];
                    grid[writePos][c].row = writePos;
                    grid[writePos][c].col = c;
                    if (r !== writePos) grid[r][c] = null;
                    writePos--;
                }
            }
            for (let r = writePos; r >= 0; r--) {
                const colorIdx = Math.floor(Math.random() * lv.colors);
                grid[r][c] = { colorIndex: colorIdx, special: SPECIAL_TYPES.NONE, obstacle: OBSTACLE_TYPES.NONE, mesh: null, row: r, col: c, iceHits: 0, chained: false };
            }
        }
    }

    function rebuildMeshes() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = grid[r][c];
                if (cell && !cell.mesh) {
                    createCubeMesh(r, c);
                    const target = gridToWorld(r, c);
                    cell.mesh.position.y = target.y + 8;
                    animatePosition(cell.mesh, target, 200);
                } else if (cell && cell.mesh) {
                    const target = gridToWorld(r, c);
                    animatePosition(cell.mesh, target, 200);
                    cell.mesh.name = `cube_${r}_${c}`;
                }
            }
        }
    }

    function processAllMatches() {
        isAnimating = true;
        const matches = findMatches();
        if (matches.length > 0) {
            processMatches(matches);
        } else {
            isAnimating = false;
        }
    }

    // --- Score Popup ---
    function showScorePopup(worldPos, text, color) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = text;
        popup.style.color = color;
        popup.style.left = '50%';
        popup.style.top = '50%';
        document.getElementById('ui-overlay').appendChild(popup);
        setTimeout(() => popup.remove(), 1000);
    }

    // --- Particles ---
    function spawnParticles(pos, colorHex, count) {
        if (!scene) return;
        for (let i = 0; i < count; i++) {
            const p = BABYLON.MeshBuilder.CreateSphere(`part_${Date.now()}_${i}`, {diameter:0.15}, scene);
            p.position = pos.clone();
            const mat = new BABYLON.StandardMaterial(`pmat_${Date.now()}_${i}`, scene);
            mat.emissiveColor = new BABYLON.Color3((colorHex>>16&0xff)/255,(colorHex>>8&0xff)/255,(colorHex&0xff)/255);
            mat.diffuseColor = new BABYLON.Color3(0,0,0);
            p.material = mat;
            particles.push({ mesh: p, vx: (Math.random()-0.5)*0.15, vy: (Math.random()-0.5)*0.15, vz: (Math.random()-0.5)*0.1, life: 30 });
        }
    }

    function updateParticles() {
        if (!scene) return;
        for (let i = particles.length-1; i >= 0; i--) {
            const p = particles[i];
            p.mesh.position.x += p.vx;
            p.mesh.position.y += p.vy;
            p.mesh.position.z += p.vz;
            p.life--;
            if (p.life <= 0) { p.mesh.dispose(); particles.splice(i, 1); }
        }
    }

    // --- HUD ---
    function updateHUD() {
        const lv = LEVELS[currentLevel];
        if (lv.type === LEVEL_TYPE.TIMED) {
            els.movesVal.textContent = `${timeLeft}s`;
        } else {
            els.movesVal.textContent = movesLeft;
        }
        els.scoreVal.textContent = score;
        els.comboVal.textContent = Math.min(combo, 10);
        els.coinsVal.textContent = sessionCoins;
        updateTargetDisplay();
        if (movesLeft <= 5 && lv.type !== LEVEL_TYPE.TIMED) els.movesVal.style.color = '#ff4444';
        else els.movesVal.style.color = '#44aaff';
    }

    // --- Level State ---
    function checkLevelState() {
        const lv = LEVELS[currentLevel];
        let completed = false;

        if (lv.type === LEVEL_TYPE.SCORE && score >= lv.target) completed = true;
        else if (lv.type === LEVEL_TYPE.JELLY && totalJelly > 0 && jellyCleared >= totalJelly) completed = true;
        else if (lv.type === LEVEL_TYPE.INGREDIENTS && ingredientsCollected >= ingredientTarget) completed = true;
        else if (lv.type === LEVEL_TYPE.COLLECT_COLORS && colorCollectCount >= lv.targetColorCount) completed = true;
        else if (lv.type === LEVEL_TYPE.TIMED && score >= lv.target) completed = true;

        // Check sugar crush (all non-obstacle cubes cleared)
        let cubeCount = 0;
        for (let r = 0; r < GRID_SIZE; r++)
            for (let c = 0; c < GRID_SIZE; c++)
                if (grid[r][c] && grid[r][c].obstacle === OBSTACLE_TYPES.NONE) cubeCount++;
        if (cubeCount === 0) unlockAchievement('sugarCrush');

        if (completed) {
            totalScore += score;
            // Star calculation based on level type
            let stars;
            if (lv.type === LEVEL_TYPE.SCORE || lv.type === LEVEL_TYPE.TIMED) {
                stars = score >= lv.target * 2 ? 3 : score >= lv.target * 1.5 ? 2 : 1;
            } else if (lv.type === LEVEL_TYPE.JELLY) {
                stars = movesLeft >= lv.moves * 0.5 ? 3 : movesLeft >= lv.moves * 0.25 ? 2 : 1;
            } else if (lv.type === LEVEL_TYPE.INGREDIENTS || lv.type === LEVEL_TYPE.COLLECT_COLORS) {
                stars = movesLeft >= lv.moves * 0.5 ? 3 : movesLeft >= lv.moves * 0.25 ? 2 : 1;
            } else {
                stars = 1;
            }
            levelStars[currentLevel] = Math.max(levelStars[currentLevel] || 0, stars);
            saveProgress();

            const coinReward = Math.floor(score / 10);
            const starBonus = (stars - 1) * 50;
            sessionCoins = coinReward + starBonus;
            NGN4.addCoins(sessionCoins);

            NGN4.playSound('win');
            hideAll();
            els.lcompTitle.textContent = `LEVEL ${currentLevel+1} COMPLETE!`;
            els.lcompStars.textContent = '★'.repeat(stars) + '☆'.repeat(3-stars);
            els.lcScore.textContent = score;
            els.lcTarget.textContent = lv.target;
            els.lcMoves.textContent = movesLeft;
            els.lcCoins.textContent = sessionCoins;
            els.btnWatchAdLc.classList.remove('hidden');
            els.levelCompleteScreen.classList.remove('hidden');

            // Check star collector
            const allThreeStars = LEVELS.every((_, i) => (levelStars[i] || 0) >= 3);
            if (allThreeStars) unlockAchievement('starCollector');
        } else if (movesLeft <= 0 && lv.type !== LEVEL_TYPE.TIMED) {
            // Check no moves left achievement
            if (!hasPossibleMoves()) unlockAchievement('noMovesLeft');

            NGN4.playSound('fail');
            hideAll();
            els.levelFailScreen.classList.remove('hidden');
            els.btnWatchAdFail.classList.remove('hidden');
        } else if (!hasPossibleMoves()) {
            shuffleGrid();
        }
    }

    function hasPossibleMoves() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (!grid[r][c]) continue;
                if (grid[r][c].chained) continue; // Chained cells can't be swapped
                if (c < GRID_SIZE - 1 && grid[r][c+1] && !grid[r][c+1].chained) {
                    swapInGrid(r, c, r, c+1);
                    if (findMatches().length > 0) { swapInGrid(r, c, r, c+1); return true; }
                    swapInGrid(r, c, r, c+1);
                }
                if (r < GRID_SIZE - 1 && grid[r+1][c] && !grid[r+1][c].chained) {
                    swapInGrid(r, c, r+1, c);
                    if (findMatches().length > 0) { swapInGrid(r, c, r+1, c); return true; }
                    swapInGrid(r, c, r+1, c);
                }
            }
        }
        return false;
    }

    function swapInGrid(r1, c1, r2, c2) {
        if (!grid[r1] || !grid[r2]) return;
        const temp = grid[r1][c1];
        grid[r1][c1] = grid[r2][c2];
        grid[r2][c2] = temp;
        if(grid[r1][c1]){grid[r1][c1].row=r1;grid[r1][c1].col=c1;}
        if(grid[r2][c2]){grid[r2][c2].row=r2;grid[r2][c2].col=c2;}
    }

    function shuffleGrid() {
        const lv = LEVELS[currentLevel];
        const all = [];
        for (let r = 0; r < GRID_SIZE; r++)
            for (let c = 0; c < GRID_SIZE; c++)
                if (grid[r][c]) all.push(grid[r][c].colorIndex);
        for (let i = all.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [all[i], all[j]] = [all[j], all[i]];
        }
        let idx = 0;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c]) {
                    grid[r][c].colorIndex = all[idx++];
                    grid[r][c].special = SPECIAL_TYPES.NONE;
                }
            }
        }
        for (let r = 0; r < GRID_SIZE; r++)
            for (let c = 0; c < GRID_SIZE; c++)
                if (grid[r][c] && grid[r][c].mesh) grid[r][c].mesh.dispose();
        createGridMeshes();
    }

    function showVictory() {
        hideAll();
        const totalStars = Object.values(levelStars).reduce((a,b) => a+b, 0);
        els.vScore.textContent = totalScore;
        els.vCoins.textContent = NGN4.getCoins();
        els.vStars.textContent = totalStars;
        els.victoryScreen.classList.remove('hidden');
    }

    function disposeScene() {
        if(scene){scene.dispose();scene=null;}
        particles=[];grid=[];selectedCell=null;
        ingredients.forEach(ing => { if(ing.mesh) ing.mesh.dispose(); });
        ingredients = [];
    }

    setInterval(updateParticles, 33);

    window.addEventListener('DOMContentLoaded', init);
})();
