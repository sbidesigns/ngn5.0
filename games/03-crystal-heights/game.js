// ============================================================
// NGN4 - Crystal Heights - 3D Platformer
// Babylon.js 3D Platforms, Collect Crystals, Reach Portal
// ============================================================

(function() {
    'use strict';

    // --- NGN4 Shared Systems ---
    const NGN4 = {
        loadRewards() { try { const d=localStorage.getItem('ngn4_rewards'); return d?JSON.parse(d):{coins:0,games:{}}; } catch(e) { return {coins:0,games:{}}; } },
        saveRewards(r) { try { localStorage.setItem('ngn4_rewards',JSON.stringify(r)); } catch(e){} },
        addCoins(a) { const r=this.loadRewards(); r.coins=(r.coins||0)+a; this.saveRewards(r); return r.coins; },
        getCoins() { return this.loadRewards().coins||0; },
        playSound(type) {
            try {
                const ctx=new(window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain();
                o.connect(g); g.connect(ctx.destination); g.gain.value=0.12;
                if(type==='jump'){o.frequency.value=400;o.frequency.linearRampToValueAtTime(800,ctx.currentTime+0.1);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);o.start();o.stop(ctx.currentTime+0.15);}
                else if(type==='doublejump'){o.frequency.value=600;o.frequency.linearRampToValueAtTime(1200,ctx.currentTime+0.12);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.18);o.start();o.stop(ctx.currentTime+0.18);}
                else if(type==='crystal'){o.frequency.value=800;o.frequency.linearRampToValueAtTime(1600,ctx.currentTime+0.1);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2);o.start();o.stop(ctx.currentTime+0.2);}
                else if(type==='hurt'){o.type='sawtooth';o.frequency.value=200;g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);o.start();o.stop(ctx.currentTime+0.3);}
                else if(type==='bounce'){o.frequency.value=300;o.frequency.linearRampToValueAtTime(600,ctx.currentTime+0.15);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2);o.start();o.stop(ctx.currentTime+0.2);}
                else if(type==='portal'){o.frequency.value=500;o.frequency.linearRampToValueAtTime(1000,ctx.currentTime+0.2);o.frequency.linearRampToValueAtTime(1500,ctx.currentTime+0.4);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);o.start();o.stop(ctx.currentTime+0.5);}
                else if(type==='die'){o.type='sawtooth';o.frequency.value=300;o.frequency.linearRampToValueAtTime(50,ctx.currentTime+0.5);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.6);o.start();o.stop(ctx.currentTime+0.6);}
                else if(type==='stomp'){o.frequency.value=200;o.frequency.linearRampToValueAtTime(400,ctx.currentTime+0.1);o.frequency.linearRampToValueAtTime(600,ctx.currentTime+0.15);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2);o.start();o.stop(ctx.currentTime+0.2);}
                else if(type==='key'){o.frequency.value=500;o.frequency.linearRampToValueAtTime(700,ctx.currentTime+0.1);o.frequency.linearRampToValueAtTime(1000,ctx.currentTime+0.2);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);o.start();o.stop(ctx.currentTime+0.3);}
                else if(type==='door'){o.frequency.value=300;o.frequency.linearRampToValueAtTime(500,ctx.currentTime+0.15);o.frequency.linearRampToValueAtTime(700,ctx.currentTime+0.3);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);o.start();o.stop(ctx.currentTime+0.4);}
                else if(type==='checkpoint'){o.frequency.value=400;o.frequency.linearRampToValueAtTime(600,ctx.currentTime+0.1);o.frequency.linearRampToValueAtTime(800,ctx.currentTime+0.2);o.frequency.linearRampToValueAtTime(1000,ctx.currentTime+0.3);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);o.start();o.stop(ctx.currentTime+0.4);}
                else if(type==='walljump'){o.frequency.value=500;o.frequency.linearRampToValueAtTime(900,ctx.currentTime+0.1);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);o.start();o.stop(ctx.currentTime+0.15);}
                else if(type==='boss'){o.type='sawtooth';o.frequency.value=150;o.frequency.linearRampToValueAtTime(50,ctx.currentTime+0.4);g.gain.value=0.15;g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);o.start();o.stop(ctx.currentTime+0.5);}
                else if(type==='upgrade'){o.frequency.value=600;o.frequency.linearRampToValueAtTime(1200,ctx.currentTime+0.15);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25);o.start();o.stop(ctx.currentTime+0.25);}
                else if(type==='achieve'){o.frequency.value=700;o.frequency.linearRampToValueAtTime(900,ctx.currentTime+0.1);setTimeout(()=>{const o2=ctx.createOscillator();const g2=ctx.createGain();o2.connect(g2);g2.connect(ctx.destination);g2.gain.value=0.12;o2.frequency.value=900;o2.frequency.linearRampToValueAtTime(1200,ctx.currentTime+0.15);g2.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2);o2.start();o2.stop(ctx.currentTime+0.2);},150);}
                setTimeout(()=>ctx.close(),1000);
            } catch(e){}
        }
    };

    // --- Achievements ---
    const ACHIEVEMENTS = {
        allStars: { name:'All Stars', desc:'3-star all levels', unlocked: false },
        speedDemon: { name:'Speed Demon', desc:'Complete all levels under par time', unlocked: false },
        collectEverything: { name:'Collect Everything', desc:'All crystals in a level', unlocked: false },
        noDeath: { name:'No Death Run', desc:'Complete 3 levels without dying', unlocked: false }
    };
    let noDeathStreak = 0;

    function loadAchievements() {
        try { const d=JSON.parse(localStorage.getItem('ngn4_ch_achievements')||'{}');
            Object.keys(ACHIEVEMENTS).forEach(k=>{if(d[k])ACHIEVEMENTS[k].unlocked=d[k].unlocked;});
        } catch(e){}
    }
    function saveAchievements() {
        const d={}; Object.keys(ACHIEVEMENTS).forEach(k=>{d[k]={unlocked:ACHIEVEMENTS[k].unlocked};});
        try{localStorage.setItem('ngn4_ch_achievements',JSON.stringify(d));}catch(e){}
    }
    function unlockAchievement(key) {
        if(ACHIEVEMENTS[key]&&!ACHIEVEMENTS[key].unlocked){
            ACHIEVEMENTS[key].unlocked=true; saveAchievements(); NGN4.playSound('achieve');
            const el=document.createElement('div');
            el.className='score-popup';
            el.style.cssText='position:fixed;top:15%;left:50%;transform:translateX(-50%);color:#ffcc00;font-size:16px;font-weight:bold;z-index:1000;text-shadow:0 0 10px #ff6600;white-space:nowrap;';
            el.textContent=`🏆 ${ACHIEVEMENTS[key].name}`;
            document.getElementById('ui-overlay').appendChild(el);
            setTimeout(()=>el.remove(),3000);
        }
    }

    // --- Upgrade Shop ---
    const UPGRADES = {
        doubleJump: { name:'Double Jump+', desc:'Higher double jump', level:0, maxLevel:5, baseCost:100, costMult:1.5 },
        speed: { name:'Speed Boost', desc:'Move faster', level:0, maxLevel:5, baseCost:80, costMult:1.4 },
        extraLife: { name:'Extra Life Cap', desc:'+1 max lives', level:0, maxLevel:3, baseCost:200, costMult:2 },
        magnet: { name:'Magnet Range', desc:'Attract nearby crystals', level:0, maxLevel:5, baseCost:60, costMult:1.3 },
        shield: { name:'Shield', desc:'Absorb 1 hit (rebuyable)', level:0, maxLevel:1, baseCost:150, costMult:1 }
    };

    function loadUpgrades() {
        try { const d=JSON.parse(localStorage.getItem('ngn4_ch_upgrades')||'{}');
            Object.keys(UPGRADES).forEach(k=>{if(d[k])UPGRADES[k].level=d[k].level;});
        } catch(e){}
    }
    function saveUpgrades() {
        const d={}; Object.keys(UPGRADES).forEach(k=>{d[k]={level:UPGRADES[k].level};});
        try{localStorage.setItem('ngn4_ch_upgrades',JSON.stringify(d));}catch(e){}
    }
    function getUpgradeCost(key) {
        const u=UPGRADES[key];
        return Math.floor(u.baseCost * Math.pow(u.costMult, u.level));
    }
    function hasShield() { return UPGRADES.shield.level > 0; }
    function useShield() { if(UPGRADES.shield.level>0){UPGRADES.shield.level=0;return true;} return false; }
    function getMagnetRange() { return UPGRADES.magnet.level * 2; }

    // --- Level Definitions ---
    function generateLevel(num) {
        const plats = [];
        const crystals = [];
        const enemies = [];
        const bouncePads = [];
        const movingPlats = [];
        const checkpoints = [];
        const keys = [];
        const doors = [];

        plats.push({ x:0, y:0, z:0, w:6, d:6, h:0.5 });

        let px = 0, py = 0, pz = 0;
        const totalPlatforms = 8 + num * 2;

        for (let i = 0; i < totalPlatforms; i++) {
            const gap = 2 + Math.random() * (1 + num * 0.3);
            const dir = i % 3 === 0 ? 'z' : 'x';
            const dist = 4 + Math.random() * 2;
            const rise = 1 + Math.random() * (1 + num * 0.2);

            if (dir === 'x') px += dist;
            else pz += dist;
            py += rise;

            const w = 3 + Math.random() * 2;
            const d = 3 + Math.random() * 2;
            plats.push({ x: px, y: py, z: pz, w: w, d: d, h: 0.5 });

            // Checkpoint every ~5 platforms
            if (i > 2 && i % 5 === 0) {
                checkpoints.push({ x: px, y: py + 0.5, z: pz });
            }

            // Moving platform
            if (num >= 2 && i > 2 && i % 4 === 0) {
                movingPlats.push({ platIndex: plats.length - 1, axis: i % 2 === 0 ? 'x' : 'z', range: 2 + num * 0.3, speed: 0.5 + num * 0.1 });
            }

            // Crystals
            if (Math.random() < 0.7) {
                const ctype = Math.random() < 0.6 ? 'blue' : (Math.random() < 0.5 ? 'red' : 'gold');
                crystals.push({ x: px + (Math.random()-0.5)*w*0.5, y: py + 1.5 + Math.random(), z: pz + (Math.random()-0.5)*d*0.5, type: ctype });
            }

            // Enemies
            if (num >= 3 && i > 3 && Math.random() < 0.3 + num * 0.05) {
                enemies.push({ x: px, y: py + 0.5, z: pz, patrolX: px - 1.5, patrolZ: pz - 1.5, patrolW: w - 1, patrolD: d - 1, speed: 0.5 + num * 0.1, phase: Math.random()*Math.PI*2, alive: true });
            }

            // Bounce pads
            if (num >= 4 && i > 2 && Math.random() < 0.2) {
                bouncePads.push({ x: px, y: py + 0.3, z: pz, power: 8 + num });
            }

            // Keys and doors (num >= 2)
            if (num >= 2 && i === Math.floor(totalPlatforms * 0.4)) {
                keys.push({ x: px + 1, y: py + 1.5, z: pz, collected: false });
            }
            if (num >= 2 && i === Math.floor(totalPlatforms * 0.6)) {
                doors.push({ x: px, y: py, z: pz, w: w, d: d, locked: true });
            }
        }

        // Boss fight every 4 levels
        let boss = null;
        if (num > 0 && num % 4 === 0) {
            boss = {
                x: px, y: py + 2, z: pz,
                hp: 3 + num, maxHp: 3 + num,
                phase: 0, attackTimer: 0,
                moveDir: 1, alive: true,
                weakPointY: py + 3
            };
        }

        const portalPos = { x: px, y: py + 2, z: pz };

        return { platforms: plats, crystals, enemies, bouncePads, movingPlats, portal: portalPos, checkpoints, keys, doors, boss };
    }

    const LEVELS = [
        { name:'Foundation Spire', desc:'Learn the basics', platforms: null, star3Time:60, star2Time:90 },
        { name:'Crystal Garden', desc:'Moving platforms ahead', platforms: null, star3Time:55, star2Time:85 },
        { name:'Shadow Corridor', desc:'Enemies patrol these heights', platforms: null, star3Time:50, star2Time:80 },
        { name:'Bounce Tower', desc:'Launch skyward!', platforms: null, star3Time:50, star2Time:75 },
        { name:'The Gauntlet', desc:'Everything combined', platforms: null, star3Time:55, star2Time:85 },
        { name:'Frozen Ascent', desc:'Slippery platforms', platforms: null, star3Time:50, star2Time:80 },
        { name:'Shadow Council', desc:'The council awaits', platforms: null, star3Time:45, star2Time:70 },
        { name:'Apex Crystal', desc:'The final climb!', platforms: null, star3Time:40, star2Time:65 }
    ];
    // Generate levels lazily
    LEVELS.forEach((lv, i) => { lv.platforms = generateLevel(i + 1); });

    // --- State ---
    let engine, scene, camera, canvas;
    let state = 'menu';
    let currentLevel = 0;
    let lives = 3;
    let maxLives = 3;
    let score = 0;
    let sessionCoins = 0;
    let crystalsCollected = 0;
    let totalCrystals = 0;
    let levelTime = 0;
    let levelData = null;
    let levelStars = {};
    let meshRefs = {};
    let diedThisLevel = false;

    // Player
    let player = {
        mesh: null,
        velocity: new BABYLON.Vector3(0, 0, 0),
        onGround: false,
        jumpsLeft: 2,
        height: 1,
        wallSliding: false,
        lastCheckpoint: { x: 0, y: 2, z: 0 },
        invincibleTimer: 0
    };

    let keys_collected = 0; // keys the player has
    let doorsOpened = new Set();

    let keys_input = {};
    let mobileLeft = false, mobileRight = false, mobileJump = false;
    let els = {};

    // --- Init ---
    function init() {
        canvas = document.getElementById('gameCanvas');
        engine = new BABYLON.Engine(canvas, true);
        NGN4Settings.init();
        NGN4Achievements.init('03-crystal');

        els = {
            hud: document.getElementById('hud'),
            livesVal: document.getElementById('lives-val'),
            levelNum: document.getElementById('level-num'),
            crystalVal: document.getElementById('crystal-val'),
            crystalTotal: document.getElementById('crystal-total'),
            scoreVal: document.getElementById('score-val'),
            coinsVal: document.getElementById('coins-val'),
            timerVal: document.getElementById('timer-val'),
            heightVal: document.getElementById('height-val'),
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
            liDesc: document.getElementById('li-desc'),
            liStars: document.getElementById('li-stars'),
            btnLiStart: document.getElementById('btn-li-start'),
            pauseScreen: document.getElementById('pause-screen'),
            btnResume: document.getElementById('btn-resume'),
            btnQuit: document.getElementById('btn-quit'),
            levelCompleteScreen: document.getElementById('level-complete-screen'),
            lcompTitle: document.getElementById('lcomp-title'),
            lcompStars: document.getElementById('lcomp-stars'),
            lcCrystals: document.getElementById('lc-crystals'),
            lcScore: document.getElementById('lc-score'),
            lcTime: document.getElementById('lc-time'),
            lcCoins: document.getElementById('lc-coins'),
            btnWatchAdLc: document.getElementById('btn-watch-ad-lc'),
            btnNextLevel: document.getElementById('btn-next-level'),
            btnLcMenu: document.getElementById('btn-lc-menu'),
            gameOverScreen: document.getElementById('game-over-screen'),
            btnWatchAdGo: document.getElementById('btn-watch-ad-go'),
            btnRetry: document.getElementById('btn-retry'),
            btnGoMenu: document.getElementById('btn-go-menu'),
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
            mbLeft: document.getElementById('mb-left'),
            mbJump: document.getElementById('mb-jump'),
            mbRight: document.getElementById('mb-right')
        };

        loadProgress();
        loadAchievements();
        loadUpgrades();
        maxLives = 3 + UPGRADES.extraLife.level;
        bindEvents();
        engine.runRenderLoop(() => { if (scene && state === 'playing') { updateGame(); } if (scene) scene.render(); });
        window.addEventListener('resize', () => engine.resize());

        // Gamepad
        window.addEventListener('gamepadconnected', () => { requestAnimationFrame(pollGamepad); });
    }

    function bindEvents() {
        window.addEventListener('keydown', e => {
            keys_input[e.key.toLowerCase()] = true;
            if ((e.key === ' ' || e.key === 'w' || e.key === 'ArrowUp') && state === 'playing') { e.preventDefault(); tryJump(); }
            if (e.key === 'Escape') { if (state === 'playing') { state = 'paused'; hideAll(); els.pauseScreen.classList.remove('hidden'); } else if (state === 'paused') resumeGame(); }
        });
        window.addEventListener('keyup', e => { keys_input[e.key.toLowerCase()] = false; });

        function addTouchEvents(el, onDown, onUp) {
            el.addEventListener('touchstart', e => { e.preventDefault(); onDown(); }, {passive:false});
            el.addEventListener('touchend', e => { e.preventDefault(); onUp(); }, {passive:false});
            el.addEventListener('mousedown', e => { e.preventDefault(); onDown(); });
            el.addEventListener('mouseup', e => { e.preventDefault(); onUp(); });
        }
        addTouchEvents(els.mbLeft, () => mobileLeft=true, () => mobileLeft=false);
        addTouchEvents(els.mbRight, () => mobileRight=true, () => mobileRight=false);
        addTouchEvents(els.mbJump, () => { mobileJump=true; tryJump(); }, () => mobileJump=false);

        els.btnPlay.addEventListener('click', () => startLevel(0));
        els.btnLevels.addEventListener('click', showLevelSelect);
        els.btnLsBack.addEventListener('click', () => hideAll('menu'));
        els.btnLiStart.addEventListener('click', () => beginLevelPlay());
        els.btnResume.addEventListener('click', () => resumeGame());
        els.btnQuit.addEventListener('click', () => { disposeScene(); hideAll('menu'); });
        els.btnRetry.addEventListener('click', () => startLevel(currentLevel));
        els.btnGoMenu.addEventListener('click', () => { disposeScene(); showLevelSelect(); });
        els.btnLcMenu.addEventListener('click', () => { disposeScene(); showLevelSelect(); });
        els.btnNextLevel.addEventListener('click', () => {
            if (currentLevel < LEVELS.length - 1) { showInterstitialAd(() => startLevel(currentLevel + 1)); }
            else { showVictory(); }
        });
        els.btnVMenu.addEventListener('click', () => { disposeScene(); hideAll('menu'); });
        els.btnWatchAdLc.addEventListener('click', () => showRewardedAd(() => { lives = Math.min(maxLives, lives+1); updateHUD(); }));
        els.btnWatchAdGo.addEventListener('click', () => showRewardedAd(() => { lives = 1; disposeScene(); startLevel(currentLevel); }));
    }

    function loadProgress() {
        const r = NGN4.loadRewards();
        levelStars = (r.games && r.games['crystal-heights'] && r.games['crystal-heights'].stars) || {};
    }
    function saveProgress() {
        const r = NGN4.loadRewards();
        if (!r.games) r.games = {};
        r.games['crystal-heights'] = { stars: levelStars };
        NGN4.saveRewards(r);
    }

    // --- Screens ---
    function hideAll(s) {
        ['menuScreen','levelSelectScreen','levelIntroScreen','pauseScreen','levelCompleteScreen','gameOverScreen','victoryScreen','adScreen','rewardedScreen'].forEach(k => els[k].classList.add('hidden'));
        document.getElementById('mobile-controls').classList.add('hidden');
        els.hud.classList.add('hidden');
        if (s==='menu') {
            state='menu'; els.menuScreen.classList.remove('hidden');
            els.totalCoins.querySelector('span').textContent = NGN4.getCoins();
            // Add shop button if not exists
            let shopBtn = document.getElementById('btn-shop');
            if (!shopBtn) {
                shopBtn = document.createElement('button');
                shopBtn.id = 'btn-shop';
                shopBtn.className = 'btn-secondary';
                shopBtn.textContent = '🏪 UPGRADE SHOP';
                shopBtn.style.cssText = 'display:block;margin:5px auto;';
                els.menuScreen.querySelector('.menu-buttons').insertBefore(shopBtn, els.totalCoins);
                shopBtn.addEventListener('click', showUpgradeShop);
            }
        }
    }

    function showUpgradeShop() {
        hideAll(); state='shop';
        let shopEl = document.getElementById('upgrade-shop-container');
        if (!shopEl) {
            shopEl = document.createElement('div');
            shopEl.id = 'upgrade-shop-container';
            document.getElementById('ui-overlay').appendChild(shopEl);
        }
        const coins = NGN4.getCoins();
        let html = `<div class="screen" style="display:flex;flex-direction:column;align-items:center;gap:10px;">
            <h2 style="color:#00ffaa;font-family:'Orbitron',sans-serif;">UPGRADE SHOP</h2>
            <p style="color:#aaa;">Crystals: 💎 ${coins}</p>`;

        Object.keys(UPGRADES).forEach(k => {
            const u = UPGRADES[k];
            const maxed = u.level >= u.maxLevel;
            const cost = maxed ? 0 : getUpgradeCost(k);
            const canBuy = !maxed && coins >= cost;
            html += `<div style="background:#111;border:1px solid ${maxed?'#0f0':'#444'};padding:10px;margin:4px;width:280px;">
                <div style="color:#fff;font-weight:bold;">${u.name} (${u.level}/${u.maxLevel})</div>
                <div style="color:#888;font-size:12px;">${u.desc}</div>
                ${maxed ? '<div style="color:#0f0;">MAXED</div>' :
                `<button class="btn-secondary" ${canBuy?'':'disabled'} style="margin-top:4px;" data-upgrade="${k}">${cost} 💎</button>`}
            </div>`;
        });

        html += `<button class="btn-primary" id="btn-shop-close2">BACK</button></div>`;
        shopEl.innerHTML = html;
        shopEl.style.display = '';

        shopEl.querySelectorAll('[data-upgrade]').forEach(btn => {
            btn.addEventListener('click', () => {
                const k = btn.dataset.upgrade;
                const cost = getUpgradeCost(k);
                if (NGN4.getCoins() >= cost && UPGRADES[k].level < UPGRADES[k].maxLevel) {
                    NGN4.addCoins(-cost);
                    UPGRADES[k].level++;
                    saveUpgrades();
                    maxLives = 3 + UPGRADES.extraLife.level;
                    NGN4.playSound('upgrade');
                    showUpgradeShop(); // Refresh
                }
            });
        });

        document.getElementById('btn-shop-close2').addEventListener('click', () => { shopEl.style.display='none'; hideAll('menu'); });
    }

    function showLevelSelect() {
        hideAll(); state='levelSelect';
        els.levelGrid.innerHTML = '';
        const maxUnlocked = Object.keys(levelStars).length;
        LEVELS.forEach((lv, i) => {
            const card = document.createElement('div');
            card.className = 'level-card' + (i > maxUnlocked ? ' locked' : '');
            const stars = levelStars[i] || 0;
            card.innerHTML = `<div class="lc-num">${i+1}</div><div class="lc-stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div>`;
            if (i <= maxUnlocked) card.addEventListener('click', () => startLevel(i));
            els.levelGrid.appendChild(card);
        });
        els.levelSelectScreen.classList.remove('hidden');
    }

    function showInterstitialAd(cb) {
        hideAll(); state='ad'; let t=5;
        els.adTimerNum.textContent=t; els.adScreen.classList.remove('hidden'); els.btnSkipAd.classList.add('hidden');
        const iv=setInterval(()=>{t--;els.adTimerNum.textContent=Math.max(0,t);if(t<=0){clearInterval(iv);els.btnSkipAd.classList.remove('hidden');}},1000);
        els.btnSkipAd.onclick=()=>{clearInterval(iv);cb();};
    }
    function showRewardedAd(cb) {
        hideAll(); state='rewardedAd'; let p=0;
        els.rewardBar.style.width='0%'; els.rewardStatus.textContent='Please wait...';
        els.btnCloseReward.classList.add('hidden'); els.rewardedScreen.classList.remove('hidden');
        const iv=setInterval(()=>{p+=5;els.rewardBar.style.width=p+'%';if(p>=100){clearInterval(iv);els.rewardStatus.textContent='Reward ready!';els.btnCloseReward.classList.remove('hidden');}},200);
        els.btnCloseReward.onclick=()=>{clearInterval(iv);cb();};
    }

    function startLevel(num) {
        currentLevel = num;
        maxLives = 3 + UPGRADES.extraLife.level;
        lives = maxLives;
        score = 0;
        sessionCoins = 0;
        crystalsCollected = 0;
        diedThisLevel = false;
        keys_collected = 0;
        doorsOpened = new Set();

        hideAll(); state='levelIntro';
        const lv = LEVELS[num];
        const stars = levelStars[num] || 0;
        els.liTitle.textContent = `Level ${num+1}`;
        els.liName.textContent = lv.name;
        els.liDesc.textContent = lv.desc;
        els.liStars.textContent = '★'.repeat(stars) + '☆'.repeat(3-stars);
        els.btnLiStart.classList.remove('hidden');
        els.levelIntroScreen.classList.remove('hidden');
    }

    function beginLevelPlay() {
        hideAll(); disposeScene();
        const lv = LEVELS[currentLevel];
        levelData = JSON.parse(JSON.stringify(lv.platforms));
        totalCrystals = levelData.crystals.length;

        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.03, 0.03, 0.08, 1);
        scene.gravity = new BABYLON.Vector3(0, -0.4, 0);
        scene.collisionsEnabled = true;

        camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 10, -15), scene);
        camera.setTarget(BABYLON.Vector3.Zero());
        camera.minZ = 0.5;

        const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0,1,0), scene);
        hemi.intensity = 0.5;
        const point = new BABYLON.PointLight('point', new BABYLON.Vector3(0,15,0), scene);
        point.intensity = 0.6;
        point.diffuse = new BABYLON.Color3(0.2, 0.5, 1);

        const gl = new BABYLON.GlowLayer('glow', scene);
        gl.intensity = 0.6;

        meshRefs.platforms = [];
        meshRefs.crystalMeshes = [];
        meshRefs.enemyMeshes = [];
        meshRefs.bounceMeshes = [];
        meshRefs.portalMesh = null;
        meshRefs.checkpointMeshes = [];
        meshRefs.keyMeshes = [];
        meshRefs.doorMeshes = [];
        meshRefs.bossMesh = null;

        levelData.platforms.forEach((p, i) => {
            const box = BABYLON.MeshBuilder.CreateBox(`plat_${i}`, {width: p.w, height: p.h, depth: p.d}, scene);
            box.position.set(p.x, p.y, p.z);
            box.checkCollisions = true;
            const mat = new BABYLON.StandardMaterial(`pmat_${i}`, scene);
            mat.diffuseColor = i === 0 ? new BABYLON.Color3(0.1,0.15,0.2) : new BABYLON.Color3(0.08,0.1,0.18);
            mat.emissiveColor = i === 0 ? new BABYLON.Color3(0,0.05,0.08) : new BABYLON.Color3(0.02,0.03,0.08);
            box.material = mat;
            meshRefs.platforms.push(box);
        });

        // Checkpoints
        levelData.checkpoints.forEach((cp, i) => {
            const torus = BABYLON.MeshBuilder.CreateTorus(`cp_${i}`, {diameter:1.2, thickness:0.15, tessellation:16}, scene);
            torus.position.set(cp.x, cp.y, cp.z);
            const mat = new BABYLON.StandardMaterial(`cpmat_${i}`, scene);
            mat.diffuseColor = new BABYLON.Color3(0, 1, 0.5);
            mat.emissiveColor = new BABYLON.Color3(0, 0.5, 0.25);
            mat.alpha = 0.7;
            torus.material = mat;
            meshRefs.checkpointMeshes.push(torus);
        });

        // Keys
        levelData.keys.forEach((k, i) => {
            const box = BABYLON.MeshBuilder.CreateBox(`key_${i}`, {width:0.4,height:0.6,depth:0.2}, scene);
            box.position.set(k.x, k.y, k.z);
            const mat = new BABYLON.StandardMaterial(`kmat_${i}`, scene);
            mat.diffuseColor = new BABYLON.Color3(1, 0.8, 0);
            mat.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0);
            box.material = mat;
            meshRefs.keyMeshes.push(box);
        });

        // Doors
        levelData.doors.forEach((d, i) => {
            const box = BABYLON.MeshBuilder.CreateBox(`door_${i}`, {width:d.w, height:1.5, depth:d.d}, scene);
            box.position.set(d.x, d.y + 0.75, d.z);
            const mat = new BABYLON.StandardMaterial(`dmat_${i}`, scene);
            mat.diffuseColor = new BABYLON.Color3(0.5, 0.3, 0);
            mat.emissiveColor = new BABYLON.Color3(0.25, 0.15, 0);
            mat.alpha = 0.5;
            box.material = mat;
            meshRefs.doorMeshes.push(box);
        });

        // Crystals
        levelData.crystals.forEach((c, i) => {
            const sphere = BABYLON.MeshBuilder.CreatePolyhedron(`crystal_${i}`, {type:1, size:0.3}, scene);
            sphere.position.set(c.x, c.y, c.z);
            const mat = new BABYLON.StandardMaterial(`cmat_${i}`, scene);
            if (c.type==='blue') { mat.diffuseColor=new BABYLON.Color3(0.2,0.4,1); mat.emissiveColor=new BABYLON.Color3(0.1,0.2,0.6); }
            else if (c.type==='red') { mat.diffuseColor=new BABYLON.Color3(1,0.2,0.2); mat.emissiveColor=new BABYLON.Color3(0.6,0.1,0.1); }
            else { mat.diffuseColor=new BABYLON.Color3(1,0.8,0); mat.emissiveColor=new BABYLON.Color3(0.6,0.4,0); }
            sphere.material = mat;
            meshRefs.crystalMeshes.push(sphere);
        });

        // Enemies
        levelData.enemies.forEach((e, i) => {
            const box = BABYLON.MeshBuilder.CreateBox(`enemy_${i}`, {width:0.8,height:0.8,depth:0.8}, scene);
            box.position.set(e.x, e.y, e.z);
            const mat = new BABYLON.StandardMaterial(`emat_${i}`, scene);
            mat.diffuseColor = new BABYLON.Color3(0.4,0,0.6);
            mat.emissiveColor = new BABYLON.Color3(0.2,0,0.3);
            mat.alpha = 0.8;
            box.material = mat;
            meshRefs.enemyMeshes.push(box);
        });

        // Bounce pads
        levelData.bouncePads.forEach((b, i) => {
            const disc = BABYLON.MeshBuilder.CreateCylinder(`bounce_${i}`, {diameter:1.5,height:0.3,tessellation:12}, scene);
            disc.position.set(b.x, b.y, b.z);
            const mat = new BABYLON.StandardMaterial(`bmat_${i}`, scene);
            mat.diffuseColor = new BABYLON.Color3(0,1,0.5);
            mat.emissiveColor = new BABYLON.Color3(0,0.5,0.25);
            disc.material = mat;
            meshRefs.bounceMeshes.push(disc);
        });

        // Boss
        if (levelData.boss) {
            const b = levelData.boss;
            const bossMesh = BABYLON.MeshBuilder.CreateBox('boss', {width:2,height:2,depth:2}, scene);
            bossMesh.position.set(b.x, b.y, b.z);
            const mat = new BABYLON.StandardMaterial('bossmat', scene);
            mat.diffuseColor = new BABYLON.Color3(0.8, 0, 0);
            mat.emissiveColor = new BABYLON.Color3(0.4, 0, 0);
            bossMesh.material = mat;
            meshRefs.bossMesh = bossMesh;
        }

        // Portal
        const portal = BABYLON.MeshBuilder.CreateTorus('portal', {diameter:3,thickness:0.3,tessellation:20}, scene);
        portal.position.set(levelData.portal.x, levelData.portal.y, levelData.portal.z);
        const pmat = new BABYLON.StandardMaterial('portalMat', scene);
        pmat.diffuseColor = new BABYLON.Color3(0,1,0.66);
        pmat.emissiveColor = new BABYLON.Color3(0,0.8,0.5);
        pmat.alpha = 0.7;
        portal.material = pmat;
        meshRefs.portalMesh = portal;

        // Player
        player.mesh = BABYLON.MeshBuilder.CreateBox('player', {width:0.8,height:0.8,depth:0.8}, scene);
        player.mesh.position.set(0, 1, 0);
        player.mesh.checkCollisions = true;
        const pMat = new BABYLON.StandardMaterial('playerMat', scene);
        pMat.diffuseColor = new BABYLON.Color3(0,1,0.66);
        pMat.emissiveColor = new BABYLON.Color3(0,0.4,0.3);
        player.mesh.material = pMat;

        player.velocity = new BABYLON.Vector3(0,0,0);
        player.onGround = false;
        player.jumpsLeft = 2;
        player.wallSliding = false;
        player.lastCheckpoint = { x: 0, y: 2, z: 0 };
        player.invincibleTimer = 0;
        levelTime = 0;

        state = 'playing';
        els.hud.classList.remove('hidden');
        els.levelNum.textContent = currentLevel+1;
        els.crystalTotal.textContent = totalCrystals;
        els.mobileControls = document.getElementById('mobile-controls');
        els.mobileControls.classList.remove('hidden');
        updateHUD();
    }

    function tryJump() {
        if (state !== 'playing') return;
        if (player.jumpsLeft > 0) {
            const jumpHeight = 0.28 + UPGRADES.doubleJump.level * 0.02;
            player.velocity.y = player.jumpsLeft === 2 ? jumpHeight : jumpHeight * 0.85;
            player.jumpsLeft--;
            player.onGround = false;
            player.wallSliding = false;
            if (player.jumpsLeft === 1) NGN4.playSound('jump');
            else NGN4.playSound('doublejump');
        }
    }

    function tryWallJump() {
        if (player.wallSliding) {
            player.velocity.y = 0.26 + UPGRADES.doubleJump.level * 0.015;
            player.velocity.x = -playerWallSlideDir * 0.1; // Push away from wall
            player.jumpsLeft = 1;
            player.wallSliding = false;
            NGN4.playSound('walljump');
        }
    }

    let playerWallSlideDir = 0;

    // --- Game Update ---
    let frameCount = 0;

    function updateGame() {
        frameCount++;
        const dt = 1;
        levelTime += 1/60;

        const baseSpeed = 0.12 + UPGRADES.speed.level * 0.015;
        const gravity = -0.015;
        let moveX = 0, moveZ = 0;

        if (keys_input['a']||keys_input['arrowleft']||mobileLeft) moveX = -baseSpeed;
        if (keys_input['d']||keys_input['arrowright']||mobileRight) moveX = baseSpeed;
        if (keys_input['w']||keys_input['arrowup']) moveZ = baseSpeed;
        if (keys_input['s']||keys_input['arrowdown']) moveZ = -baseSpeed;

        player.invincibleTimer = Math.max(0, player.invincibleTimer - 1);

        // Apply gravity
        player.velocity.y += gravity;
        if ((keys_input['s']||keys_input['arrowdown']) && !player.onGround) player.velocity.y -= 0.008;

        // Apply movement
        player.mesh.position.x += moveX;
        player.mesh.position.z += moveZ;
        player.mesh.position.y += player.velocity.y;

        // Reset wall sliding
        player.wallSliding = false;
        playerWallSlideDir = 0;

        // Platform collision
        player.onGround = false;

        for (let i = 0; i < meshRefs.platforms.length; i++) {
            const p = levelData.platforms[i];
            const plat = meshRefs.platforms[i];

            // Check if this platform has a locked door
            if (levelData.doors) {
                const doorIdx = levelData.doors.findIndex((d, di) => d.x === p.x && d.z === p.z && d.locked && !doorsOpened.has(di));
                if (doorIdx >= 0) continue; // Can't collide with locked door platform
            }

            const mp = levelData.movingPlats.find(mp => mp.platIndex === i);
            if (mp) {
                const offset = Math.sin(frameCount * 0.02 * mp.speed) * mp.range;
                if (mp.axis === 'x') { plat.position.x = p.x + offset; p.x = plat.position.x; }
                else { plat.position.z = p.z + offset; p.z = plat.position.z; }
            }

            const halfW = p.w/2, halfD = p.d/2;
            const px = player.mesh.position.x, py = player.mesh.position.y, pz = player.mesh.position.z;

            if (px > p.x - halfW && px < p.x + halfW && pz > p.z - halfD && pz < p.z + halfD) {
                // Top collision
                if (py - 0.4 < p.y + p.h/2 && py - 0.4 > p.y - p.h/2 - 0.3 && player.velocity.y <= 0) {
                    player.mesh.position.y = p.y + p.h/2 + 0.4;
                    player.velocity.y = 0;
                    player.onGround = true;
                    player.jumpsLeft = 2;
                }
                // Side collision (wall sliding)
                const fromLeft = px - (p.x - halfW);
                const fromRight = (p.x + halfW) - px;
                if (fromLeft < 0.6 || fromRight < 0.6) {
                    if (!player.onGround && player.velocity.y < 0) {
                        player.wallSliding = true;
                        playerWallSlideDir = fromLeft < 0.6 ? 1 : -1;
                        player.velocity.y = Math.max(player.velocity.y, -0.005); // Slow fall
                    }
                }
            }
        }

        // Wall jump on key press while wall sliding
        if (player.wallSliding && (keys_input['w']||keys_input['arrowup']||mobileJump)) {
            tryWallJump();
        }

        // Crystal collection with magnet
        const magnetRange = getMagnetRange();
        for (let i = meshRefs.crystalMeshes.length - 1; i >= 0; i--) {
            const c = levelData.crystals[i];
            const cm = meshRefs.crystalMeshes[i];
            cm.rotation.y += 0.03;

            let dist = BABYLON.Vector3.Distance(player.mesh.position, cm.position);

            // Magnet pull
            if (magnetRange > 0 && dist < magnetRange + 2) {
                const dir = BABYLON.Vector3.Normalize(player.mesh.position.subtract(cm.position));
                const pullSpeed = 0.05 * (magnetRange - dist + 2) / magnetRange;
                cm.position.add(dir.scale(pullSpeed));
                dist = BABYLON.Vector3.Distance(player.mesh.position, cm.position);
            }

            if (dist < 1.2) {
                NGN4.playSound('crystal');
                let pts = 0, coinVal = 0;
                if (c.type === 'blue') { pts = 100; coinVal = 10; }
                else if (c.type === 'red') { pts = 50; lives = Math.min(maxLives, lives+1); }
                else { pts = 500; coinVal = 50; }
                score += pts;
                sessionCoins += coinVal;
                NGN4.addCoins(coinVal);
                crystalsCollected++;
                cm.dispose();
                meshRefs.crystalMeshes.splice(i, 1);
                levelData.crystals.splice(i, 1);
            }
        }

        // Key collection
        levelData.keys.forEach((k, i) => {
            if (k.collected) return;
            const km = meshRefs.keyMeshes[i];
            if (!km) return;
            km.rotation.y += 0.05;
            const dist = BABYLON.Vector3.Distance(player.mesh.position, km.position);
            if (dist < 1.2) {
                k.collected = true;
                keys_collected++;
                km.dispose();
                meshRefs.keyMeshes[i] = null;
                NGN4.playSound('key');
            }
        });

        // Door opening
        levelData.doors.forEach((d, i) => {
            if (!d.locked || doorsOpened.has(i)) return;
            if (keys_collected > 0) {
                keys_collected--;
                doorsOpened.add(i);
                d.locked = false;
                if (meshRefs.doorMeshes[i]) { meshRefs.doorMeshes[i].dispose(); meshRefs.doorMeshes[i] = null; }
                NGN4.playSound('door');
            }
        });

        // Checkpoint activation
        levelData.checkpoints.forEach((cp, i) => {
            if (!meshRefs.checkpointMeshes[i]) return;
            meshRefs.checkpointMeshes[i].rotation.y += 0.02;
            const dist = BABYLON.Vector3.Distance(
                new BABYLON.Vector3(player.mesh.position.x, cp.y, player.mesh.position.z),
                new BABYLON.Vector3(cp.x, cp.y, cp.z)
            );
            if (dist < 1.5) {
                player.lastCheckpoint = { x: cp.x, y: cp.y + 1.5, z: cp.z };
                // Visual feedback - make checkpoint brighter
                meshRefs.checkpointMeshes[i].material.emissiveColor = new BABYLON.Color3(0, 1, 0.5);
                NGN4.playSound('checkpoint');
                // Remove mesh so it doesn't trigger again
                meshRefs.checkpointMeshes[i].dispose();
                meshRefs.checkpointMeshes[i] = null;
            }
        });

        // Bounce pads
        meshRefs.bounceMeshes.forEach((bm, i) => {
            const b = levelData.bouncePads[i];
            const dist = BABYLON.Vector3.Distance(
                new BABYLON.Vector3(player.mesh.position.x, player.mesh.position.y - 0.4, player.mesh.position.z),
                new BABYLON.Vector3(b.x, b.y, b.z)
            );
            if (dist < 1.2 && player.velocity.y <= 0) {
                player.velocity.y = b.power * 0.035;
                player.jumpsLeft = 2;
                NGN4.playSound('bounce');
            }
        });

        // Enemy collision (with stomping)
        meshRefs.enemyMeshes.forEach((em, i) => {
            const e = levelData.enemies[i];
            if (!e.alive) return;
            const ex = e.patrolX + Math.sin(frameCount * 0.02 * e.speed + e.phase) * e.patrolW/2;
            const ez = e.patrolZ + Math.cos(frameCount * 0.02 * e.speed + e.phase) * e.patrolD/2;
            em.position.set(ex, e.y, ez);

            const dist = BABYLON.Vector3.Distance(player.mesh.position, em.position);
            if (dist < 1) {
                // Check if stomping (player above enemy and falling)
                if (player.velocity.y < 0 && player.mesh.position.y > e.y) {
                    // Stomp!
                    e.alive = false;
                    em.dispose();
                    meshRefs.enemyMeshes[i] = null;
                    player.velocity.y = 0.2; // Bounce off
                    player.jumpsLeft = 2;
                    score += 200;
                    sessionCoins += 20;
                    NGN4.addCoins(20);
                    NGN4.playSound('stomp');
                } else if (player.invincibleTimer <= 0) {
                    hurtPlayer();
                }
            }
        });

        // Boss fight
        if (levelData.boss && levelData.boss.alive && meshRefs.bossMesh) {
            const b = levelData.boss;
            b.attackTimer++;

            // Boss movement
            b.x += b.moveDir * 0.03;
            if (Math.abs(b.x) > 3) b.moveDir *= -1;
            meshRefs.bossMesh.position.set(b.x, b.y + Math.sin(frameCount * 0.03) * 0.5, b.z);

            // Boss attack pattern
            if (b.attackTimer > 120) {
                b.attackTimer = 0;
                // Shoot projectile - check if player is in range
                const dist = BABYLON.Vector3.Distance(player.mesh.position, meshRefs.bossMesh.position);
                if (dist < 8 && player.invincibleTimer <= 0) {
                    // Simple: damage player if close
                    hurtPlayer();
                    NGN4.playSound('boss');
                }
            }

            // Boss collision
            const bossDist = BABYLON.Vector3.Distance(player.mesh.position, meshRefs.bossMesh.position);
            if (bossDist < 1.8) {
                if (player.velocity.y < 0 && player.mesh.position.y > b.y) {
                    // Stomp boss
                    b.hp--;
                    player.velocity.y = 0.25;
                    player.jumpsLeft = 2;
                    NGN4.playSound('stomp');

                    if (b.hp <= 0) {
                        b.alive = false;
                        meshRefs.bossMesh.dispose();
                        meshRefs.bossMesh = null;
                        score += 500;
                        sessionCoins += 50;
                        NGN4.addCoins(50);
                    }
                } else if (player.invincibleTimer <= 0) {
                    hurtPlayer();
                }
            }
        }

        // Portal check (only if boss is dead or no boss)
        if (meshRefs.portalMesh && (!levelData.boss || !levelData.boss.alive)) {
            meshRefs.portalMesh.rotation.y += 0.02;
            const portalDist = BABYLON.Vector3.Distance(player.mesh.position, meshRefs.portalMesh.position);
            if (portalDist < 2) {
                NGN4.playSound('portal');
                completeLevel();
                return;
            }
        }

        // Fall detection
        if (player.mesh.position.y < -10) {
            NGN4.playSound('die');
            lives--;
            diedThisLevel = true;
            if (lives <= 0) { showGameOver(); return; }
            else { respawnPlayer(); }
        }

        // Camera follow
        camera.position = new BABYLON.Vector3(player.mesh.position.x, player.mesh.position.y + 8, player.mesh.position.z - 12);
        camera.setTarget(player.mesh.position.clone());

        updateHUD();
    }

    function hurtPlayer() {
        if (player.invincibleTimer > 0) return;
        if (hasShield()) {
            useShield();
            player.invincibleTimer = 60;
            NGN4.playSound('crystal');
            return;
        }
        lives--;
        NGN4.playSound('hurt');
        player.velocity.y = 0.2;
        player.jumpsLeft = 2;
        player.invincibleTimer = 120; // 2 seconds invincibility
        if (lives <= 0) showGameOver();
    }

    function respawnPlayer() {
        player.mesh.position.set(player.lastCheckpoint.x, player.lastCheckpoint.y, player.lastCheckpoint.z);
        player.velocity = new BABYLON.Vector3(0, 0, 0);
        player.jumpsLeft = 2;
        player.invincibleTimer = 120;
    }

    function updateHUD() {
        els.livesVal.textContent = '❤️'.repeat(Math.max(0, lives));
        if (hasShield()) els.livesVal.textContent += ' 🛡️';
        els.crystalVal.textContent = crystalsCollected;
        els.scoreVal.textContent = score;
        els.coinsVal.textContent = sessionCoins;
        els.timerVal.textContent = formatTime(levelTime);
        if (player.mesh) els.heightVal.textContent = Math.max(0, Math.round(player.mesh.position.y));
    }

    function formatTime(t) {
        const m = Math.floor(t/60), s = Math.floor(t%60);
        return `${m}:${s.toString().padStart(2,'0')}`;
    }

    function completeLevel() {
        state = 'levelComplete';
        const lv = LEVELS[currentLevel];

        let stars = 1;
        if (levelTime < lv.star2Time) stars = 2;
        if (levelTime < lv.star3Time) stars = 3;

        levelStars[currentLevel] = Math.max(levelStars[currentLevel] || 0, stars);
        saveProgress();

        if (crystalsCollected >= totalCrystals) unlockAchievement('collectEverything');
        if (!diedThisLevel) { noDeathStreak++; if (noDeathStreak >= 3) unlockAchievement('noDeath'); }
        else noDeathStreak = 0;

        const bonus = (stars - 1) * 100;
        sessionCoins += bonus;
        NGN4.addCoins(bonus);

        hideAll();
        els.lcompTitle.textContent = `LEVEL ${currentLevel+1} COMPLETE!`;
        els.lcompStars.textContent = '★'.repeat(stars) + '☆'.repeat(3-stars);
        els.lcCrystals.textContent = `${crystalsCollected}/${totalCrystals}`;
        els.lcScore.textContent = score;
        els.lcTime.textContent = formatTime(levelTime);
        els.lcCoins.textContent = sessionCoins;
        els.btnWatchAdLc.classList.remove('hidden');
        els.levelCompleteScreen.classList.remove('hidden');

        // Check all stars achievement
        const allThree = LEVELS.every((_, i) => (levelStars[i] || 0) >= 3);
        if (allThree) unlockAchievement('allStars');

        // Check speed demon
        const allUnderPar = LEVELS.every((lv, i) => {
            if (!levelStars[i]) return false;
            // We don't store times, so check if 3-star (means under star3Time)
            return levelStars[i] >= 3;
        });
        if (allUnderPar && Object.keys(levelStars).length >= LEVELS.length) unlockAchievement('speedDemon');
    }

    function showGameOver() {
        state = 'gameOver';
        hideAll();
        els.gameOverScreen.classList.remove('hidden');
        els.btnWatchAdGo.classList.remove('hidden');
    }

    function showVictory() {
        hideAll();
        const totalStars = Object.values(levelStars).reduce((a,b)=>a+b, 0);
        els.vScore.textContent = score;
        els.vCoins.textContent = sessionCoins;
        els.vStars.textContent = totalStars;
        els.victoryScreen.classList.remove('hidden');
    }

    function resumeGame() {
        hideAll();
        state = 'playing';
        els.hud.classList.remove('hidden');
        document.getElementById('mobile-controls').classList.remove('hidden');
    }

    function disposeScene() {
        if (scene) { scene.dispose(); scene = null; }
        meshRefs = {};
    }

    // --- Gamepad Support ---
    let gpPrevButtons = [];
    function pollGamepad() {
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (let i = 0; i < gps.length; i++) { if (gps[i]) { gp = gps[i]; break; } }
        if (!gp) { requestAnimationFrame(pollGamepad); return; }

        if (state === 'playing') {
            // D-pad left/right
            if (gp.axes[0] < -0.5) mobileLeft = true; else mobileLeft = false;
            if (gp.axes[0] > 0.5) mobileRight = true; else mobileRight = false;

            // A button = jump
            if (gp.buttons[0] && gp.buttons[0].pressed && !gpPrevButtons[0]) {
                gpPrevButtons[0] = true;
                tryJump();
            } else if (!gp.buttons[0] || !gp.buttons[0].pressed) gpPrevButtons[0] = false;

            // B button = fast fall
            if (gp.buttons[1] && gp.buttons[1].pressed) keys_input['s'] = true;
            else keys_input['s'] = false;

            // Start = pause
            if (gp.buttons[9] && gp.buttons[9].pressed && !gpPrevButtons[9]) {
                gpPrevButtons[9] = true;
                if (state === 'playing') { state = 'paused'; hideAll(); els.pauseScreen.classList.remove('hidden'); }
                else if (state === 'paused') resumeGame();
            } else gpPrevButtons[9] = false;
        }

        requestAnimationFrame(pollGamepad);
    }

    window.addEventListener('DOMContentLoaded', init);
})();
