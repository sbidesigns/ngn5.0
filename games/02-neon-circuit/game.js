// ============================================================
// NGN4 - Neon Circuit - 3D Racing Game
// Babylon.js 3D Racing with Items, Drift-Boost, Car Select
// ============================================================

(function() {
    'use strict';

    // --- NGN4 Shared Systems ---
    const NGN4 = {
        loadRewards() {
            try { const d = localStorage.getItem('ngn4_rewards'); return d ? JSON.parse(d) : { coins: 0, games: {} }; }
            catch(e) { return { coins: 0, games: {} }; }
        },
        saveRewards(r) { try { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); } catch(e) {} },
        addCoins(a) { const r = this.loadRewards(); r.coins = (r.coins||0)+a; this.saveRewards(r); return r.coins; },
        getCoins() { return this.loadRewards().coins || 0; },
        playSound(type) {
            try {
                const ctx = new (window.AudioContext||window.webkitAudioContext)();
                const osc = ctx.createOscillator(); const g = ctx.createGain();
                osc.connect(g); g.connect(ctx.destination); g.gain.value = 0.12;
                if (type==='boost') { osc.frequency.value=400; osc.frequency.linearRampToValueAtTime(1200,ctx.currentTime+0.2); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3); osc.start(); osc.stop(ctx.currentTime+0.3); }
                else if (type==='drift') { osc.type='sawtooth'; osc.frequency.value=150; g.gain.value=0.08; osc.start(); osc.stop(ctx.currentTime+0.15); }
                else if (type==='finish') { osc.frequency.value=500; osc.frequency.linearRampToValueAtTime(1000,ctx.currentTime+0.3); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5); osc.start(); osc.stop(ctx.currentTime+0.5); }
                else if (type==='countdown') { osc.frequency.value=800; g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15); osc.start(); osc.stop(ctx.currentTime+0.15); }
                else if (type==='go') { osc.frequency.value=1200; g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4); osc.start(); osc.stop(ctx.currentTime+0.4); }
                else if (type==='item') { osc.frequency.value=600; osc.frequency.linearRampToValueAtTime(900,ctx.currentTime+0.1); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2); osc.start(); osc.stop(ctx.currentTime+0.2); }
                else if (type==='hit') { osc.type='sawtooth'; osc.frequency.value=200; g.gain.value=0.15; osc.start(); osc.stop(ctx.currentTime+0.2); }
                else if (type==='achievement') { osc.frequency.value=523; osc.frequency.linearRampToValueAtTime(784,ctx.currentTime+0.3); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5); osc.start(); osc.stop(ctx.currentTime+0.5); }
                setTimeout(()=>ctx.close(),1000);
            } catch(e){}
        }
    };

    // --- Car Definitions ---
    const CARS = [
        { name: 'Blaze', color: 0x00ffaa, speed: 1.0, accel: 1.0, handling: 1.0, desc: 'Balanced all-rounder' },
        { name: 'Phantom', color: 0xff4444, speed: 1.3, accel: 0.8, handling: 0.7, desc: 'Top speed king' },
        { name: 'Viper', color: 0x44aaff, speed: 0.85, accel: 1.3, handling: 1.2, desc: 'Agile handler' },
        { name: 'Titan', color: 0xffaa00, speed: 0.9, accel: 1.1, handling: 0.9, desc: 'Heavy accelerator' }
    ];
    let selectedCar = 0;

    // --- Track Definitions (real shapes, not ellipses) ---
    function generateTrackPoints(type) {
        const pts = [];
        if (type === 'circuit') {
            // Circuit track with hairpin + chicanes
            const cp = [
                [0,0],[15,0],[30,-2],[40,-10],[42,-20],[38,-30],[25,-35],
                [15,-30],[10,-20],[5,-15],[-5,-25],[-15,-35],[-20,-30],
                [-25,-20],[-30,-5],[-25,5],[-15,8],[-5,5],[0,0]
            ];
            for (let i = 0; i < cp.length; i++) {
                pts.push(cp[i]);
            }
        } else if (type === 'street') {
            // Street track with tight 90-degree turns
            const cp = [
                [0,0],[20,0],[25,0],[25,-15],[25,-25],[15,-25],[5,-25],
                [-5,-25],[-5,-15],[-5,-5],[5,5],[15,5],[20,5],[20,15],
                [10,15],[0,15],[-10,15],[-10,5],[-10,-10],[0,-10],[0,0]
            ];
            for (let i = 0; i < cp.length; i++) {
                pts.push(cp[i]);
            }
        } else if (type === 'mountain') {
            // Mountain pass with sweeping S-curves
            const cp = [];
            for (let i = 0; i <= 40; i++) {
                const t = i / 40;
                const x = Math.cos(t * Math.PI * 2) * 35 + Math.sin(t * Math.PI * 4) * 12;
                const y = Math.sin(t * Math.PI * 2) * 25 + Math.cos(t * Math.PI * 6) * 8;
                cp.push([x, y]);
            }
            for (const p of cp) pts.push(p);
        }
        return pts;
    }

    const TRACKS = [
        { name: 'Neon Circuit', desc: 'Technical circuit with hairpins', laps: 3, type: 'circuit', aiSpeed: 0.6, unlockCost: 0, difficulty: 'Easy' },
        { name: 'Street Chaos', desc: 'Tight city streets', laps: 3, type: 'street', aiSpeed: 0.75, unlockCost: 300, difficulty: 'Medium' },
        { name: 'Mountain Pass', desc: 'Sweeping S-curves', laps: 3, type: 'mountain', aiSpeed: 0.85, unlockCost: 600, difficulty: 'Hard' },
        { name: 'Plasma Loop', desc: 'High speed oval', laps: 3, type: 'oval', aiSpeed: 0.95, unlockCost: 1000, difficulty: 'Expert' },
        { name: 'Void Gauntlet', desc: 'Extreme all tracks', laps: 3, type: 'mountain', aiSpeed: 1.1, unlockCost: 2000, difficulty: 'Master' }
    ];

    // --- Item System ---
    const ITEMS = {
        boost: { icon: '⚡', color: 0xff8800, duration: 2 },
        shield: { icon: '🛡️', color: 0x0088ff, duration: 5 },
        missile: { icon: '🚀', color: 0xff0000, duration: 0 },
        oil: { icon: '🛢️', color: 0x333333, duration: 0 },
        banana: { icon: '🍌', color: 0xffff00, duration: 0 }
    };
    const ITEM_KEYS = Object.keys(ITEMS);

    // --- Achievement System ---
    let careerData = JSON.parse(localStorage.getItem('ngn4_nc_career') || 'null') || {
        racesWon: 0, racesPlayed: 0, totalDriftBoosts: 0, itemsUsed: 0,
        bestPosition: 4, unlocked: []
    };
    function saveCareer() { try { localStorage.setItem('ngn4_nc_career', JSON.stringify(careerData)); } catch(e){} }

    function unlockAch(id, name, desc) {
        if (careerData.unlocked.includes(id)) return;
        careerData.unlocked.push(id);
        saveCareer();
        NGN4.addCoins(25);
        NGN4.playSound('achievement');
        const popup = document.getElementById('achievement-popup');
        const txt = document.getElementById('ach-text');
        if (popup && txt) {
            txt.innerHTML = `<div style="font-size:18px;color:#0f0">🏆 Achievement!</div><div style="color:#ff0;font-weight:bold">${name}</div><div style="color:#aaa;font-size:12px">${desc}</div>`;
            popup.classList.remove('hidden');
            popup.style.top = '60px';
            setTimeout(()=>{ popup.style.top = '-80px'; }, 3500);
            setTimeout(()=>{ popup.classList.add('hidden'); }, 4000);
        }
    }

    function checkAchievements(pos) {
        if (!careerData.unlocked.includes('first_win') && pos === 1) unlockAch('first_win', 'First Victory', 'Win your first race');
        if (!careerData.unlocked.includes('drift_master') && careerData.totalDriftBoosts >= 10) unlockAch('drift_master', 'Drift Master', 'Use 10 drift boosts');
        if (!careerData.unlocked.includes('item_user') && careerData.itemsUsed >= 5) unlockAch('item_user', 'Item User', 'Use 5 items in races');
        if (!careerData.unlocked.includes('speed_demon') && pos === 1) unlockAch('speed_demon', 'Speed Demon', 'Finish in 1st place');
        if (!careerData.unlocked.includes('triple_crown') && careerData.racesWon >= 3) unlockAch('triple_crown', 'Triple Crown', 'Win 3 races');
    }

    // --- State ---
    let engine, scene, camera, canvas;
    let state = 'menu';
    let currentTrack = 0;
    let sessionCoins = 0;
    let raceTime = 0;
    let lapTime = 0;
    let bestLap = Infinity;
    let currentLap = 0;
    let raceFinished = false;
    let finishPosition = 0;

    // Player car
    let playerCar = null;
    let playerT = 0; // Track parameter (0 to 1)
    let playerSpeed = 0;
    let playerDrift = 0;
    let isDrifting = false;
    let isBoosting = false;
    let boostTimer = 0;
    let driftBoostMeter = 0; // 0-100
    let hasShield = false;
    let shieldTimer = 0;
    let currentItem = null; // item key or null
    let oilSlicks = []; // { t: trackParam, timer: number }
    let bananas = []; // { t: trackParam }
    let missiles = []; // { mesh, speed, trackT, active }

    // Upgrades
    let upgrades = { speed: 1, accel: 1, handling: 1 };

    // AI cars
    let aiCars = [];
    const AI_COLORS = [0xff4444, 0x4488ff, 0xffaa00];

    // Track
    let trackMeshes = [];
    let boostPads = [];
    let itemBoxes = []; // { t: trackParam, mesh, active: true }

    // Track spline
    let trackPoints = []; // Array of {x, z} world positions
    let trackNormals = []; // Direction at each point
    let trackLength = 0;

    // Input
    let keys = {};
    let mobileInput = { accelerate: false, brake: false, left: false, right: false, boost: false };

    // Gamepad
    let gamepadIndex = null;
    let gamepadButtons = {};
    let prevGPButtons = {};

    // DOM
    let els = {};

    // --- Init ---
    function init() {
        canvas = document.getElementById('gameCanvas');
        engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
        NGN4Settings.init();
        NGN4Achievements.init('02-neon-circuit');

        els = {
            hud: document.getElementById('hud'),
            speedVal: document.getElementById('speed-val'),
            boostDisplay: document.getElementById('boost-display'),
            posVal: document.getElementById('pos-val'),
            lapVal: document.getElementById('lap-val'),
            timeVal: document.getElementById('time-val'),
            raceCoinsVal: document.getElementById('race-coins-val'),
            trackNameVal: document.getElementById('track-name-val'),
            driftDisplay: document.getElementById('drift-display'),
            itemDisplay: document.getElementById('item-display'),
            driftBoostFill: document.getElementById('drift-boost-fill'),
            menuScreen: document.getElementById('menu-screen'),
            btnPlay: document.getElementById('btn-play'),
            btnShop: document.getElementById('btn-shop'),
            totalCoins: document.getElementById('total-coins'),
            shopScreen: document.getElementById('shop-screen'),
            buySpeed: document.getElementById('buy-speed'),
            buyAccel: document.getElementById('buy-accel'),
            buyHandling: document.getElementById('buy-handling'),
            shopSpeedLv: document.getElementById('shop-speed-lv'),
            shopAccelLv: document.getElementById('shop-accel-lv'),
            shopHandlingLv: document.getElementById('shop-handling-lv'),
            btnShopClose: document.getElementById('btn-shop-close'),
            trackSelectScreen: document.getElementById('track-select-screen'),
            trackList: document.getElementById('track-list'),
            btnTrackBack: document.getElementById('btn-track-back'),
            carSelectScreen: document.getElementById('car-select-screen'),
            carList: document.getElementById('car-list'),
            btnCarBack: document.getElementById('btn-car-back'),
            countdownScreen: document.getElementById('countdown-screen'),
            countdownText: document.getElementById('countdown-text'),
            pauseScreen: document.getElementById('pause-screen'),
            btnResume: document.getElementById('btn-resume'),
            btnQuitRace: document.getElementById('btn-quit-race'),
            raceResults: document.getElementById('race-results-screen'),
            resultsTitle: document.getElementById('results-title'),
            resPos: document.getElementById('res-pos'),
            resTime: document.getElementById('res-time'),
            resCoins: document.getElementById('res-coins'),
            resBestlap: document.getElementById('res-bestlap'),
            btnWatchAdResults: document.getElementById('btn-watch-ad-results'),
            btnNextRace: document.getElementById('btn-next-race'),
            btnResultsMenu: document.getElementById('btn-results-menu'),
            adScreen: document.getElementById('ad-screen'),
            adTimerNum: document.getElementById('ad-timer-num'),
            btnSkipAd: document.getElementById('btn-skip-ad'),
            rewardedScreen: document.getElementById('rewarded-ad-screen'),
            rewardBar: document.getElementById('reward-bar'),
            rewardStatus: document.getElementById('reward-status'),
            btnCloseReward: document.getElementById('btn-close-reward')
        };

        loadUpgrades();
        updateMenuCoins();
        bindEvents();
        buildTrackList();
        buildCarList();
        setupGamepad();
        engine.runRenderLoop(() => { if (scene) scene.render(); });
        window.addEventListener('resize', () => engine.resize());
    }

    function setupGamepad() {
        window.addEventListener('gamepadconnected', e => { gamepadIndex = e.gamepad.index; });
        window.addEventListener('gamepaddisconnected', e => { if (e.gamepad.index === gamepadIndex) gamepadIndex = null; });
        setInterval(() => {
            if (gamepadIndex === null) {
                const gps = navigator.getGamepads ? navigator.getGamepads() : [];
                for (let i = 0; i < gps.length; i++) { if (gps[i]) { gamepadIndex = i; break; } }
            }
            if (gamepadIndex === null) return;
            const gp = navigator.getGamepads()[gamepadIndex];
            if (!gp) return;
            prevGPButtons = {...gamepadButtons};
            for (let i = 0; i < gp.buttons.length; i++) gamepadButtons[i] = gp.buttons[i].pressed || gp.buttons[i].value > 0.5;
        }, 16);
    }

    function isGPJustPressed(b) { return gamepadButtons[b] && !prevGPButtons[b]; }
    function getGPAxis(i) {
        if (gamepadIndex === null) return 0;
        const gp = navigator.getGamepads()[gamepadIndex];
        if (!gp || !gp.axes[i]) return 0;
        return Math.abs(gp.axes[i]) < 0.15 ? 0 : gp.axes[i];
    }

    function bindEvents() {
        window.addEventListener('keydown', e => {
            keys[e.key.toLowerCase()] = true;
            if (e.key === ' ' && state === 'racing') { e.preventDefault(); activateBoost(); }
            if ((e.key === 'e' || e.key === 'E') && state === 'racing') { e.preventDefault(); useItem(); }
            if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && state === 'racing') { e.preventDefault(); pauseRace(); }
            else if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && state === 'paused') { e.preventDefault(); resumeRace(); }
        });
        window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

        els.btnPlay.addEventListener('click', () => { showCarSelect(); });
        els.btnShop.addEventListener('click', showShop);
        els.btnShopClose.addEventListener('click', () => hideAllScreens('menu'));
        els.buySpeed.addEventListener('click', () => buyUpgrade('speed'));
        els.buyAccel.addEventListener('click', () => buyUpgrade('accel'));
        els.buyHandling.addEventListener('click', () => buyUpgrade('handling'));
        els.btnTrackBack.addEventListener('click', () => hideAllScreens('menu'));
        els.btnCarBack.addEventListener('click', showTrackSelect);
        els.btnResume.addEventListener('click', resumeRace);
        els.btnQuitRace.addEventListener('click', () => { disposeScene(); hideAllScreens('menu'); });
        els.btnNextRace.addEventListener('click', () => { showInterstitialAd(() => showTrackSelect()); });
        els.btnResultsMenu.addEventListener('click', () => { disposeScene(); hideAllScreens('menu'); });
        els.btnWatchAdResults.addEventListener('click', () => showRewardedAd(c => {
            sessionCoins += c;
            NGN4.addCoins(c);
            els.resCoins.textContent = sessionCoins;
            els.btnWatchAdResults.classList.add('hidden');
        }));

        canvas.addEventListener('touchstart', handleTouch, { passive: false });
        canvas.addEventListener('touchmove', handleTouch, { passive: false });
        canvas.addEventListener('touchend', () => { mobileInput = { accelerate: false, brake: false, left: false, right: false, boost: false }; }, { passive: false });
    }

    function handleTouch(e) {
        e.preventDefault();
        if (state !== 'racing') return;
        const t = e.touches[0];
        const x = t.clientX / window.innerWidth;
        mobileInput.accelerate = x > 0.3 && x < 0.7;
        mobileInput.left = x < 0.3;
        mobileInput.right = x > 0.7;
        mobileInput.boost = t.clientY < window.innerHeight * 0.3;
    }

    function buildCarList() {
        if (!els.carList) return;
        els.carList.innerHTML = '';
        CARS.forEach((c, i) => {
            const div = document.createElement('div');
            div.className = 'track-item' + (i === selectedCar ? ' selected' : '');
            const hex = '#' + c.color.toString(16).padStart(6, '0');
            div.innerHTML = `<span class="tname" style="color:${hex}">${c.name}</span><span class="tdiff">${c.desc} | SPD:${(c.speed*100).toFixed(0)} ACC:${(c.accel*100).toFixed(0)} HND:${(c.handling*100).toFixed(0)}</span>`;
            div.addEventListener('click', () => {
                selectedCar = i;
                buildCarList();
            });
            els.carList.appendChild(div);
        });
    }

    function showCarSelect() {
        hideAllScreens();
        state = 'carSelect';
        buildCarList();
        els.carSelectScreen.classList.remove('hidden');
    }

    function loadUpgrades() {
        const r = NGN4.loadRewards();
        if (r.games && r.games['neon-circuit'] && r.games['neon-circuit'].upgrades) {
            upgrades = r.games['neon-circuit'].upgrades;
        }
        updateShopDisplay();
    }

    function saveUpgrades() {
        const r = NGN4.loadRewards();
        if (!r.games) r.games = {};
        r.games['neon-circuit'] = { upgrades: upgrades, bestTrack: currentTrack };
        NGN4.saveRewards(r);
    }

    function updateMenuCoins() { els.totalCoins.querySelector('span').textContent = NGN4.getCoins(); }

    function updateShopDisplay() {
        els.shopSpeedLv.textContent = `Lv.${upgrades.speed}`;
        els.shopAccelLv.textContent = `Lv.${upgrades.accel}`;
        els.shopHandlingLv.textContent = `Lv.${upgrades.handling}`;
        const cost = getUpgradeCost(upgrades.speed);
        els.buySpeed.textContent = upgrades.speed >= 5 ? 'MAX' : `🪙 ${cost}`;
        els.buySpeed.disabled = upgrades.speed >= 5;
        els.buyAccel.textContent = upgrades.accel >= 5 ? 'MAX' : `🪙 ${getUpgradeCost(upgrades.accel)}`;
        els.buyAccel.disabled = upgrades.accel >= 5;
        els.buyHandling.textContent = upgrades.handling >= 5 ? 'MAX' : `🪙 ${getUpgradeCost(upgrades.handling)}`;
        els.buyHandling.disabled = upgrades.handling >= 5;
    }

    function getUpgradeCost(lv) { return lv * 200; }

    function buyUpgrade(type) {
        const cost = getUpgradeCost(upgrades[type]);
        if (upgrades[type] >= 5 || NGN4.getCoins() < cost) return;
        NGN4.addCoins(-cost);
        upgrades[type]++;
        saveUpgrades();
        updateShopDisplay();
        updateMenuCoins();
        NGN4.playSound('boost');
    }

    function buildTrackList() {
        els.trackList.innerHTML = '';
        const unlocked = getUnlockedTracks();
        TRACKS.forEach((t, i) => {
            const div = document.createElement('div');
            div.className = 'track-item' + (i > unlocked ? ' locked' : '');
            div.innerHTML = `<span class="tname">${t.name}</span><span class="tdiff">${t.difficulty}${i > 0 ? ` (🪙${t.unlockCost})` : ''}</span>`;
            if (i <= unlocked) {
                div.addEventListener('click', () => { currentTrack = i; startRace(); });
            } else {
                div.addEventListener('click', () => {
                    if (NGN4.getCoins() >= t.unlockCost) {
                        NGN4.addCoins(-t.unlockCost);
                        const r = NGN4.loadRewards();
                        if (!r.games) r.games = {};
                        if (!r.games['neon-circuit']) r.games['neon-circuit'] = {};
                        r.games['neon-circuit'].unlockedTrack = i;
                        NGN4.saveRewards(r);
                        buildTrackList();
                        updateMenuCoins();
                    }
                });
            }
            els.trackList.appendChild(div);
        });
    }

    function getUnlockedTracks() {
        const r = NGN4.loadRewards();
        return (r.games && r.games['neon-circuit'] && r.games['neon-circuit'].unlockedTrack) || 0;
    }

    function hideAllScreens(screen) {
        ['menuScreen','shopScreen','trackSelectScreen','carSelectScreen','countdownScreen','pauseScreen','raceResults','adScreen','rewardedScreen'].forEach(s => {
            if(els[s]) els[s].classList.add('hidden');
        });
        els.hud.classList.add('hidden');
        if (screen === 'menu') { state = 'menu'; els.menuScreen.classList.remove('hidden'); updateMenuCoins(); }
    }

    function showShop() { hideAllScreens(); state = 'shop'; updateShopDisplay(); els.shopScreen.classList.remove('hidden'); }
    function showTrackSelect() { hideAllScreens(); state = 'trackSelect'; buildTrackList(); els.trackSelectScreen.classList.remove('hidden'); }

    function showInterstitialAd(cb) {
        hideAllScreens(); state = 'ad';
        let timer = 5;
        els.adTimerNum.textContent = timer;
        els.adScreen.classList.remove('hidden');
        els.btnSkipAd.classList.add('hidden');
        const iv = setInterval(() => {
            timer--;
            els.adTimerNum.textContent = Math.max(0, timer);
            if (timer <= 0) { clearInterval(iv); els.btnSkipAd.classList.remove('hidden'); }
        }, 1000);
        els.btnSkipAd.onclick = () => { clearInterval(iv); cb(); };
    }

    function showRewardedAd(cb) {
        hideAllScreens(); state = 'rewardedAd';
        let prog = 0;
        els.rewardBar.style.width = '0%';
        els.rewardStatus.textContent = 'Please watch to earn reward...';
        els.btnCloseReward.classList.add('hidden');
        els.rewardedScreen.classList.remove('hidden');
        const iv = setInterval(() => {
            prog += 5;
            els.rewardBar.style.width = prog + '%';
            if (prog >= 100) { clearInterval(iv); els.rewardStatus.textContent = 'Reward ready!'; els.btnCloseReward.classList.remove('hidden'); }
        }, 200);
        els.btnCloseReward.onclick = () => { clearInterval(iv); cb(200); };
    }

    // --- Track Spline ---
    function buildTrackSpline() {
        const track = TRACKS[currentTrack];
        trackPoints = [];
        trackNormals = [];

        if (track.type === 'oval') {
            // Fallback oval for "Plasma Loop"
            const rx = 40, rz = 25;
            const segs = 100;
            for (let i = 0; i < segs; i++) {
                const a = (i / segs) * Math.PI * 2;
                trackPoints.push(new BABYLON.Vector3(Math.cos(a) * rx, 0, Math.sin(a) * rz));
            }
        } else {
            // Build from control points with Catmull-Rom interpolation
            const cp = generateTrackPoints(track.type);
            const scale = 1.5;
            const smoothPts = [];
            // Catmull-Rom through control points
            for (let i = 0; i < cp.length; i++) {
                const p0 = cp[(i - 1 + cp.length) % cp.length];
                const p1 = cp[i];
                const p2 = cp[(i + 1) % cp.length];
                const p3 = cp[(i + 2) % cp.length];
                for (let t = 0; t < 1; t += 0.2) {
                    const t2 = t * t, t3 = t2 * t;
                    const x = 0.5 * ((2*p1[0]) + (-p0[0]+p2[0])*t + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3);
                    const z = 0.5 * ((2*p1[1]) + (-p0[1]+p2[1])*t + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3);
                    smoothPts.push([x, z]);
                }
            }
            for (const p of smoothPts) {
                trackPoints.push(new BABYLON.Vector3(p[0] * scale, 0, p[1] * scale));
            }
        }

        // Calculate normals and total length
        trackLength = 0;
        for (let i = 0; i < trackPoints.length; i++) {
            const next = trackPoints[(i + 1) % trackPoints.length];
            const prev = trackPoints[(i - 1 + trackPoints.length) % trackPoints.length];
            const normal = next.subtract(prev).normalize();
            trackNormals.push(normal);
            trackLength += BABYLON.Vector3.Distance(trackPoints[i], next);
        }
    }

    function getTrackPos(t) {
        // t is 0..1 around the track
        const idx = ((t % 1 + 1) % 1) * trackPoints.length;
        const i0 = Math.floor(idx) % trackPoints.length;
        const i1 = (i0 + 1) % trackPoints.length;
        const frac = idx - Math.floor(idx);
        return BABYLON.Vector3.Lerp(trackPoints[i0], trackPoints[i1], frac);
    }

    function getTrackDir(t) {
        const idx = ((t % 1 + 1) % 1) * trackPoints.length;
        const i = Math.floor(idx) % trackPoints.length;
        return trackNormals[i];
    }

    // --- 3D Scene ---
    function createScene() {
        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.06, 1);
        scene.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.15);

        camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 15, -30), scene);
        camera.setTarget(new BABYLON.Vector3(0, 0, 10));
        camera.minZ = 1;

        const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
        hemi.intensity = 0.4;
        hemi.diffuse = new BABYLON.Color3(0.5, 0.5, 0.8);

        const pLight = new BABYLON.PointLight('plight', new BABYLON.Vector3(0, 10, 0), scene);
        pLight.intensity = 0.6;
        pLight.diffuse = new BABYLON.Color3(0, 1, 0.66);

        const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 200, height: 200 }, scene);
        const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
        groundMat.diffuseColor = new BABYLON.Color3(0.03, 0.03, 0.08);
        groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
        ground.material = groundMat;

        buildTrackSpline();
        buildTrackMesh();

        const gl = new BABYLON.GlowLayer('glow', scene);
        gl.intensity = 0.8;

        return scene;
    }

    function buildTrackMesh() {
        const trackWidth = 6;
        const segs = trackPoints.length;

        for (let i = 0; i < segs; i++) {
            const p1 = trackPoints[i];
            const p2 = trackPoints[(i + 1) % segs];
            const dist = BABYLON.Vector3.Distance(p1, p2);

            const box = BABYLON.MeshBuilder.CreateBox(`track_${i}`, { width: trackWidth, height: 0.2, depth: dist + 0.3 }, scene);
            box.position = BABYLON.Vector3.Lerp(p1, p2, 0.5);
            box.position.y = 0.1;
            box.lookAt(p2);
            box.rotation.y += Math.PI / 2;

            const mat = new BABYLON.StandardMaterial(`tmat_${i}`, scene);
            mat.diffuseColor = new BABYLON.Color3(i % 10 < 5 ? 0.08 : 0.1, i % 10 < 5 ? 0.08 : 0.1, i % 10 < 5 ? 0.12 : 0.15);
            mat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.04);
            box.material = mat;
            trackMeshes.push(box);

            // Neon edges
            if (i % 5 === 0) {
                for (let side = -1; side <= 1; side += 2) {
                    const edge = BABYLON.MeshBuilder.CreateBox(`edge_${i}_${side}`, { width: 0.15, height: 0.3, depth: dist + 0.3 }, scene);
                    edge.position = BABYLON.Vector3.Lerp(p1, p2, 0.5);
                    edge.position.y = 0.25;
                    const dir = p2.subtract(p1).normalize();
                    const perp = new BABYLON.Vector3(-dir.z, 0, dir.x);
                    edge.position.addInPlace(perp.scale(side * trackWidth / 2));
                    edge.lookAt(p2);
                    edge.rotation.y += Math.PI / 2;
                    const eMat = new BABYLON.StandardMaterial(`emat_${i}_${side}`, scene);
                    eMat.diffuseColor = new BABYLON.Color3(0, 0.5, 0.33);
                    eMat.emissiveColor = new BABYLON.Color3(0, 1, 0.66);
                    edge.material = eMat;
                    trackMeshes.push(edge);
                }
            }

            // Boost pads every ~20 segments
            if (i % 20 === 0 && i > 0) {
                const pad = BABYLON.MeshBuilder.CreateBox(`boost_${i}`, { width: trackWidth * 0.8, height: 0.1, depth: 3 }, scene);
                pad.position = BABYLON.Vector3.Lerp(p1, p2, 0.5);
                pad.position.y = 0.25;
                pad.lookAt(p2);
                pad.rotation.y += Math.PI / 2;
                const pMat = new BABYLON.StandardMaterial(`pmat_${i}`, scene);
                pMat.diffuseColor = new BABYLON.Color3(1, 0.4, 0);
                pMat.emissiveColor = new BABYLON.Color3(1, 0.4, 0);
                pad.material = pMat;
                boostPads.push({ mesh: pad, t: i / segs, active: true });
                trackMeshes.push(pad);
            }

            // Item boxes every ~15 segments
            if (i % 15 === 7 && i > 5) {
                const ib = BABYLON.MeshBuilder.CreateBox(`itembox_${i}`, { width: 1.5, height: 1.5, depth: 1.5 }, scene);
                ib.position = BABYLON.Vector3.Lerp(p1, p2, 0.5);
                ib.position.y = 1;
                const ibMat = new BABYLON.StandardMaterial(`ibmat_${i}`, scene);
                ibMat.diffuseColor = new BABYLON.Color3(1, 1, 0);
                ibMat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0);
                ibMat.alpha = 0.8;
                ib.material = ibMat;
                itemBoxes.push({ mesh: ib, t: i / segs, active: true, respawnTimer: 0 });
                trackMeshes.push(ib);
            }
        }
    }

    function createCar(color, name) {
        const body = BABYLON.MeshBuilder.CreateBox(`${name}_body`, { width: 2, height: 0.8, depth: 4 }, scene);
        const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
        mat.diffuseColor = new BABYLON.Color3((color >> 16 & 0xff) / 255, (color >> 8 & 0xff) / 255, (color & 0xff) / 255);
        mat.emissiveColor = new BABYLON.Color3((color >> 16 & 0xff) / 510, (color >> 8 & 0xff) / 510, (color & 0xff) / 510);
        body.material = mat;

        const cockpit = BABYLON.MeshBuilder.CreateBox(`${name}_cock`, { width: 1.4, height: 0.5, depth: 1.5 }, scene);
        cockpit.position.y = 0.5;
        cockpit.position.z = -0.3;
        cockpit.parent = body;
        const cMat = new BABYLON.StandardMaterial(`${name}_cmat`, scene);
        cMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.2);
        cMat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.1);
        cockpit.material = cMat;

        for (let s = -1; s <= 1; s += 2) {
            const light = BABYLON.MeshBuilder.CreateSphere(`${name}_hl${s}`, { diameter: 0.3 }, scene);
            light.position.set(s * 0.7, 0.2, 2);
            light.parent = body;
            const hlMat = new BABYLON.StandardMaterial(`${name}_hlmat${s}`, scene);
            hlMat.diffuseColor = new BABYLON.Color3(1, 1, 0.8);
            hlMat.emissiveColor = new BABYLON.Color3(1, 1, 0.8);
            light.material = hlMat;
        }

        // Shield visual (hidden by default)
        const shieldMesh = BABYLON.MeshBuilder.CreateSphere(`${name}_shield`, { diameter: 4 }, scene);
        shieldMesh.parent = body;
        shieldMesh.position.y = 0.4;
        const sMat = new BABYLON.StandardMaterial(`${name}_smat`, scene);
        sMat.diffuseColor = new BABYLON.Color3(0, 0.5, 1);
        sMat.emissiveColor = new BABYLON.Color3(0, 0.3, 0.6);
        sMat.alpha = 0.3;
        shieldMesh.material = sMat;
        shieldMesh.isVisible = false;
        body._shieldMesh = shieldMesh;

        return body;
    }

    // --- Item System ---
    function pickupItem() {
        if (currentItem) return; // Already have one
        const itemKey = ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)];
        currentItem = itemKey;
        NGN4.playSound('item');
        if (els.itemDisplay) {
            els.itemDisplay.textContent = ITEMS[itemKey].icon;
            els.itemDisplay.classList.remove('hidden');
        }
    }

    function useItem() {
        if (!currentItem || state !== 'racing') return;
        careerData.itemsUsed++;
        const item = currentItem;
        currentItem = null;
        if (els.itemDisplay) {
            els.itemDisplay.classList.add('hidden');
        }

        if (item === 'boost') {
            isBoosting = true;
            boostTimer = 2;
            NGN4.playSound('boost');
        } else if (item === 'shield') {
            hasShield = true;
            shieldTimer = 5;
            if (playerCar && playerCar._shieldMesh) playerCar._shieldMesh.isVisible = true;
        } else if (item === 'missile') {
            // Fire missile forward along track
            const pos = getTrackPos(playerT);
            const dir = getTrackDir(playerT);
            missiles.push({
                t: playerT + 0.05,
                speed: 0.008,
                active: true,
                owner: 'player',
                life: 3
            });
            NGN4.playSound('item');
        } else if (item === 'oil') {
            oilSlicks.push({ t: playerT - 0.01, timer: 15 });
            NGN4.playSound('item');
        } else if (item === 'banana') {
            bananas.push({ t: playerT - 0.01 });
            NGN4.playSound('item');
        }
        checkAchievements(finishPosition);
        saveCareer();
    }

    // --- Race Logic ---
    function startRace() {
        hideAllScreens();
        disposeScene();

        scene = createScene();

        const carDef = CARS[selectedCar];
        playerCar = createCar(carDef.color, 'player');
        playerT = 0;
        const startPos = getTrackPos(playerT);
        playerCar.position = startPos;
        const startDir = getTrackDir(playerT);
        playerCar.rotation.y = Math.atan2(startDir.x, startDir.z);

        playerSpeed = 0;
        playerDrift = 0;
        isDrifting = false;
        isBoosting = false;
        boostTimer = 0;
        driftBoostMeter = 0;
        hasShield = false;
        shieldTimer = 0;
        currentItem = null;
        oilSlicks = [];
        bananas = [];
        missiles = [];
        raceTime = 0;
        lapTime = 0;
        bestLap = Infinity;
        currentLap = 0;
        raceFinished = false;
        finishPosition = 0;
        sessionCoins = 0;

        aiCars = [];
        for (let i = 0; i < 3; i++) {
            const aiCar = createCar(AI_COLORS[i], `ai_${i}`);
            const aiT = 0.01 + (i + 1) * 0.015;
            const aiPos = getTrackPos(aiT);
            const offset = -1 + (i - 1) * 1.5;
            const dir = getTrackDir(aiT);
            const perp = new BABYLON.Vector3(-dir.z, 0, dir.x);
            aiCar.position = aiPos.add(perp.scale(offset));
            aiCar.rotation.y = Math.atan2(dir.x, dir.z);
            aiCars.push({
                mesh: aiCar,
                t: aiT,
                speed: 0,
                targetSpeed: 0.3 + Math.random() * 0.2,
                lap: 0,
                baseSpeed: TRACKS[currentTrack].aiSpeed * (0.85 + Math.random() * 0.3),
                variance: Math.random() * 0.3,
                offset: offset,
                item: null,
                shieldTimer: 0,
                stunned: 0
            });
        }

        state = 'countdown';
        showCountdown();
    }

    function showCountdown() {
        hideAllScreens();
        els.countdownScreen.classList.remove('hidden');
        let count = 3;
        els.countdownText.textContent = count;
        NGN4.playSound('countdown');
        const iv = setInterval(() => {
            count--;
            if (count > 0) {
                els.countdownText.textContent = count;
                NGN4.playSound('countdown');
            } else if (count === 0) {
                els.countdownText.textContent = 'GO!';
                NGN4.playSound('go');
            } else {
                clearInterval(iv);
                els.countdownScreen.classList.add('hidden');
                state = 'racing';
                els.hud.classList.remove('hidden');
                els.trackNameVal.textContent = TRACKS[currentTrack].name;
                registerGameLoop();
            }
        }, 1000);
    }

    let gameLoopObserver = null;

    function registerGameLoop() {
        if (gameLoopObserver) gameLoopObserver.dispose();
        gameLoopObserver = scene.onBeforeRenderObservable.add(updateRace);
    }

    function activateBoost() {
        // Use drift boost if meter is full, otherwise nothing
        if (driftBoostMeter >= 80 && !isBoosting) {
            isBoosting = true;
            boostTimer = 1.5 + (driftBoostMeter / 100) * 1.5;
            driftBoostMeter = 0;
            careerData.totalDriftBoosts++;
            saveCareer();
            NGN4.playSound('boost');
            checkAchievements(finishPosition);
        } else if (currentItem === 'boost') {
            useItem();
        }
    }

    function updateRace() {
        if (state !== 'racing') return;

        const dt = engine.getDeltaTime() / 1000;
        raceTime += dt;
        lapTime += dt;

        const carDef = CARS[selectedCar];
        const maxSpeed = (1.5 + upgrades.speed * 0.3) * carDef.speed;
        const accel = (0.02 + upgrades.accel * 0.008) * carDef.accel;
        const handling = (0.03 + upgrades.handling * 0.006) * carDef.handling;

        const gpLeft = getGPAxis(0);
        const gpAccel = gamepadButtons[7] || gamepadButtons[0]; // RT or A
        const gpBrake = gamepadButtons[6]; // LT
        const gpSteer = gpLeft;
        const gpItem = isGPJustPressed(3); // Y
        if (gpItem) useItem();

        const wantAccel = keys['w'] || keys['arrowup'] || mobileInput.accelerate || gpAccel;
        const wantBrake = keys['s'] || keys['arrowdown'] || mobileInput.brake || gpBrake;
        const wantLeft = keys['a'] || keys['arrowleft'] || mobileInput.left || gpSteer < -0.15;
        const wantRight = keys['d'] || keys['arrowright'] || mobileInput.right || gpSteer > 0.15;

        // Speed
        if (wantAccel) playerSpeed = Math.min(maxSpeed, playerSpeed + accel);
        else if (wantBrake) playerSpeed = Math.max(-0.3, playerSpeed - accel * 1.5);
        else playerSpeed *= 0.995;

        // Boost
        if (isBoosting) {
            playerSpeed = Math.min(maxSpeed * 1.5, playerSpeed + accel * 2);
            boostTimer -= dt;
            els.boostDisplay.classList.remove('hidden');
            if (boostTimer <= 0) { isBoosting = false; if (playerCar._shieldMesh && !hasShield) playerCar._shieldMesh.isVisible = false; }
        } else {
            els.boostDisplay.classList.add('hidden');
        }

        // Shield timer
        if (hasShield) {
            shieldTimer -= dt;
            if (shieldTimer <= 0) {
                hasShield = false;
                if (playerCar && playerCar._shieldMesh) playerCar._shieldMesh.isVisible = false;
            }
        }

        // Steering
        if (wantLeft) playerDrift = Math.max(playerDrift - handling * 0.3, -handling);
        else if (wantRight) playerDrift = Math.min(playerDrift + handling * 0.3, handling);
        else playerDrift *= 0.9;

        // Drift detection & boost meter
        isDrifting = Math.abs(playerDrift) > handling * 0.7 && playerSpeed > maxSpeed * 0.6;
        if (isDrifting) {
            driftBoostMeter = Math.min(100, driftBoostMeter + dt * 25);
            els.driftDisplay.classList.remove('hidden');
            if (Math.random() < 0.05) NGN4.playSound('drift');
        } else {
            els.driftDisplay.classList.add('hidden');
        }
        if (els.driftBoostFill) els.driftBoostFill.style.width = driftBoostMeter + '%';

        // Move along track
        const prevT = playerT;
        playerT += (playerSpeed * 0.008 + playerDrift * 0.003) * dt;

        // Check oil/banana hazards
        for (let i = oilSlicks.length - 1; i >= 0; i--) {
            oilSlicks[i].timer -= dt;
            if (oilSlicks[i].timer <= 0) { oilSlicks.splice(i, 1); continue; }
            if (Math.abs(playerT - oilSlicks[i].t) < 0.015) {
                playerSpeed *= 0.3; // Slow down
                NGN4.playSound('hit');
                oilSlicks.splice(i, 1);
            }
        }
        for (let i = bananas.length - 1; i >= 0; i--) {
            if (Math.abs(playerT - bananas[i].t) < 0.008) {
                playerSpeed *= 0.2;
                playerDrift = (Math.random() - 0.5) * handling * 2;
                NGN4.playSound('hit');
                bananas.splice(i, 1);
            }
        }

        // Check for lap completion
        if (playerT >= Math.floor(playerT) + 1 && playerT > 0.1) {
            currentLap++;
            if (lapTime < bestLap) bestLap = lapTime;
            lapTime = 0;
            if (currentLap >= TRACKS[currentTrack].laps && !raceFinished) { finishRace(); return; }
        }

        // Position on track
        const pos = getTrackPos(playerT);
        playerCar.position = pos;
        const dir = getTrackDir(playerT);
        playerCar.rotation.y = Math.atan2(dir.x, dir.z) + playerDrift * 0.3;

        // Check boost pads
        boostPads.forEach(pad => {
            if (pad.active && Math.abs(playerT - pad.t) < 0.01) {
                isBoosting = true;
                boostTimer = 1.5;
                NGN4.playSound('boost');
            }
        });

        // Check item boxes
        itemBoxes.forEach(ib => {
            if (!ib.active) {
                ib.respawnTimer -= dt;
                if (ib.respawnTimer <= 0) {
                    ib.active = true;
                    ib.mesh.isVisible = true;
                }
                return;
            }
            if (Math.abs(playerT - ib.t) < 0.01) {
                pickupItem();
                ib.active = false;
                ib.mesh.isVisible = false;
                ib.respawnTimer = 5;
            }
        });

        // Update missiles
        for (let i = missiles.length - 1; i >= 0; i--) {
            const m = missiles[i];
            m.t += m.speed;
            m.life -= dt;
            if (m.life <= 0) { missiles.splice(i, 1); continue; }
            // Check if missile hits AI
            if (m.owner === 'player') {
                for (const ai of aiCars) {
                    if (Math.abs(m.t - ai.t) < 0.01) {
                        ai.speed *= 0.1; // Stun AI
                        ai.stunned = 2;
                        NGN4.playSound('hit');
                        missiles.splice(i, 1);
                        break;
                    }
                }
            } else {
                // AI missile hits player
                if (Math.abs(m.t - playerT) < 0.01) {
                    if (hasShield) {
                        hasShield = false;
                        shieldTimer = 0;
                        if (playerCar._shieldMesh) playerCar._shieldMesh.isVisible = false;
                    } else {
                        playerSpeed *= 0.3;
                    }
                    NGN4.playSound('hit');
                    missiles.splice(i, 1);
                }
            }
        }

        // --- AI Update (with rubber-banding) ---
        const playerProgress = currentLap + playerT;
        aiCars.forEach(ai => {
            if (ai.stunned > 0) {
                ai.stunned -= dt;
                ai.speed *= 0.95;
            } else {
                const aiProgress = ai.lap + ai.t;
                const behind = playerProgress - aiProgress;
                // Rubber-banding: speed up when behind, slow when ahead
                const rubberBand = behind > 0.5 ? 1.3 : behind < -0.5 ? 0.75 : 1.0;
                const aiMaxSpeed = (ai.baseSpeed + TRACKS[currentTrack].aiSpeed * 0.2) * rubberBand;
                const aiAccel = 0.015 + Math.sin(raceTime * ai.variance) * 0.005;

                if (Math.random() < 0.01) ai.targetSpeed = ai.baseSpeed * (0.8 + Math.random() * 0.4) * rubberBand;
                ai.speed += (ai.targetSpeed - ai.speed) * 0.05;
                ai.speed = Math.min(aiMaxSpeed, Math.max(0.2, ai.speed));
                if (Math.random() < 0.002) ai.speed = aiMaxSpeed * 1.3;
            }

            const prevAiT = ai.t;
            ai.t += ai.speed * 0.006 * dt;

            if (ai.t >= Math.floor(ai.t) + 1 && ai.t > 0.1) ai.lap++;

            const aiPos = getTrackPos(ai.t);
            const aiDir = getTrackDir(ai.t);
            const perp = new BABYLON.Vector3(-aiDir.z, 0, aiDir.x);
            ai.mesh.position = aiPos.add(perp.scale(ai.offset));
            ai.mesh.rotation.y = Math.atan2(aiDir.x, aiDir.z);

            // Collision between player and AI
            const dist = BABYLON.Vector3.Distance(playerCar.position, ai.mesh.position);
            if (dist < 3.5 && dist > 0) {
                const push = playerCar.position.subtract(ai.mesh.position).normalize();
                if (!hasShield) playerSpeed *= 0.9;
                ai.speed *= 0.9;
                // Push apart
                const pushForce = 0.003;
                playerT += pushForce;
                ai.t -= pushForce;
                if (dist < 2) NGN4.playSound('hit');
            }

            // AI item box pickup
            itemBoxes.forEach(ib => {
                if (ib.active && Math.abs(ai.t - ib.t) < 0.01 && !ai.item && Math.random() < 0.3) {
                    ai.item = ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)];
                    ib.active = false;
                    ib.mesh.isVisible = false;
                    ib.respawnTimer = 5;
                }
            });

            // AI use item
            if (ai.item && Math.random() < 0.003) {
                if (ai.item === 'boost') {
                    ai.speed *= 1.5;
                    ai.item = null;
                } else if (ai.item === 'missile') {
                    missiles.push({ t: ai.t + 0.05, speed: 0.007, active: true, owner: 'ai', life: 3 });
                    ai.item = null;
                } else {
                    ai.item = null;
                }
            }
        });

        // --- Calculate positions ---
        const allRacers = [
            { name: 'player', progress: currentLap + playerT },
            ...aiCars.map((a, i) => ({ name: `ai_${i}`, progress: a.lap + a.t }))
        ];
        allRacers.sort((a, b) => b.progress - a.progress);
        finishPosition = allRacers.findIndex(r => r.name === 'player') + 1;

        // --- Camera ---
        const camTarget = pos.clone();
        const camBack = dir.scale(-20);
        const camPos = pos.add(camBack).add(new BABYLON.Vector3(0, 12, 0));
        camera.position = BABYLON.Vector3.Lerp(camera.position, camPos, 0.05);
        camera.setTarget(BABYLON.Vector3.Lerp(camera.getForwardRay(10).origin.add(camTarget), camTarget, 0.08));

        // --- HUD ---
        els.speedVal.textContent = Math.round(playerSpeed * 200);
        els.posVal.textContent = `${finishPosition}/4`;
        els.lapVal.textContent = `${Math.min(currentLap + 1, TRACKS[currentTrack].laps)}/${TRACKS[currentTrack].laps}`;
        els.timeVal.textContent = formatTime(raceTime);
        els.raceCoinsVal.textContent = sessionCoins;
    }

    function finishRace() {
        raceFinished = true;
        state = 'results';
        NGN4.playSound('finish');

        let coins = [25, 50, 100, 200][finishPosition - 1] || 25;
        if (bestLap < 15) coins += 50;
        sessionCoins = coins;
        NGN4.addCoins(coins);

        careerData.racesPlayed++;
        if (finishPosition === 1) careerData.racesWon++;
        if (finishPosition < careerData.bestPosition) careerData.bestPosition = finishPosition;
        saveCareer();
        checkAchievements(finishPosition);

        const ordinals = ['1st', '2nd', '3rd', '4th'];
        hideAllScreens();
        els.resultsTitle.textContent = finishPosition === 1 ? '🏆 VICTORY!' : `Finished ${ordinals[finishPosition - 1]}`;
        els.resPos.textContent = ordinals[finishPosition - 1];
        els.resTime.textContent = formatTime(raceTime);
        els.resCoins.textContent = coins;
        els.resBestlap.textContent = bestLap < Infinity ? formatTime(bestLap) : 'N/A';
        els.btnWatchAdResults.classList.remove('hidden');
        els.raceResults.classList.remove('hidden');

        const r = NGN4.loadRewards();
        if (!r.games) r.games = {};
        if (!r.games['neon-circuit']) r.games['neon-circuit'] = {};
        r.games['neon-circuit'].bestTrack = Math.max(r.games['neon-circuit'].bestTrack || 0, currentTrack);
        NGN4.saveRewards(r);
    }

    function pauseRace() { state = 'paused'; els.pauseScreen.classList.remove('hidden'); }
    function resumeRace() { hideAllScreens(); state = 'racing'; els.hud.classList.remove('hidden'); }

    function formatTime(t) {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function disposeScene() {
        if (scene) { scene.dispose(); scene = null; }
        trackMeshes = []; boostPads = []; aiCars = []; itemBoxes = []; missiles = [];
        playerCar = null; trackPoints = []; trackNormals = [];
        if (gameLoopObserver) { gameLoopObserver.dispose(); gameLoopObserver = null; }
    }

    window.addEventListener('DOMContentLoaded', init);
})();
