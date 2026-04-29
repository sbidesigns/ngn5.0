// ============================================================
// NGN4 - Star Vanguard - 3D Space Shooter
// Babylon.js Forward-scrolling Space Shooter
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
                if(type==='laser'){o.frequency.value=1000;g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.08);o.start();o.stop(ctx.currentTime+0.08);}
                else if(type==='explosion'){o.type='sawtooth';o.frequency.value=80;g.gain.value=0.15;g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);o.start();o.stop(ctx.currentTime+0.3);}
                else if(type==='hit'){o.type='square';o.frequency.value=200;g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.1);o.start();o.stop(ctx.currentTime+0.1);}
                else if(type==='powerup'){o.frequency.value=600;o.frequency.linearRampToValueAtTime(1200,ctx.currentTime+0.15);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2);o.start();o.stop(ctx.currentTime+0.2);}
                else if(type==='boss'){o.type='sawtooth';o.frequency.value=60;g.gain.value=0.2;g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);o.start();o.stop(ctx.currentTime+0.5);}
                else if(type==='shield'){o.frequency.value=300;o.frequency.linearRampToValueAtTime(500,ctx.currentTime+0.2);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);o.start();o.stop(ctx.currentTime+0.3);}
                setTimeout(()=>ctx.close(),1000);
            }catch(e){}
        }
    };

    // --- Sectors (Levels) ---
    const SECTORS = [
        { name: 'Outer Defense', desc: 'First wave incoming', waves: 10, enemyHpMult: 1, enemySpeedMult: 1, bossHp: 500 },
        { name: 'Asteroid Belt', desc: 'Navigate the debris', waves: 10, enemyHpMult: 1.3, enemySpeedMult: 1.2, bossHp: 800 },
        { name: 'Nebula Core', desc: 'Reduced visibility', waves: 10, enemyHpMult: 1.6, enemySpeedMult: 1.4, bossHp: 1200 },
        { name: 'Void Approach', desc: 'They are everywhere', waves: 10, enemyHpMult: 2, enemySpeedMult: 1.6, bossHp: 1800 },
        { name: 'Void Gate', desc: 'Destroy the mothership', waves: 10, enemyHpMult: 2.5, enemySpeedMult: 1.8, bossHp: 2500 }
    ];

    // --- Upgrades ---
    let upgrades = { damage: 1, fireRate: 1, shield: 1, hull: 1, speed: 1 };
    const UPG_COSTS = { damage: 150, fireRate: 150, shield: 200, hull: 200, speed: 100 };

    // --- State ---
    let engine, scene, camera, canvas;
    let state = 'menu';
    let currentSector = 0;
    let currentWave = 1;
    let score = 0;
    let sessionCoins = 0;
    let totalKills = 0;
    let lives = 3;
    let maxLives = 3;

    // Player
    let player = { mesh: null, health: 100, maxHealth: 100, shield: 50, maxShield: 50, fireTimer: 0, invincible: 0 };
    let playerProjectiles = [];
    let enemyProjectiles = [];
    let enemies = [];
    let powerups = [];
    let particles = [];

    // Power-up state
    let activePowerup = null;
    let powerupTimer = 0;

    // Input
    let keys = {};
    let touchPos = null;
    let autoFire = false;

    // Stars background
    let stars = [];

    // Frame
    let frameCount = 0;

    // DOM
    let els = {};

    // --- Init ---
    function init() {
        canvas = document.getElementById('gameCanvas');
        engine = new BABYLON.Engine(canvas, true);
        NGN4Settings.init();
        NGN4Achievements.init('04-star-vanguard');

        els = {
            hud: document.getElementById('hud'),
            shieldBar: document.getElementById('shield-bar'), shieldText: document.getElementById('shield-text'),
            healthBar: document.getElementById('health-bar'), healthText: document.getElementById('health-text'),
            waveNum: document.getElementById('wave-num'), levelNum: document.getElementById('level-num'),
            scoreVal: document.getElementById('score-val'), coinsVal: document.getElementById('coins-val'),
            weaponName: document.getElementById('weapon-name'),
            powerupDisplay: document.getElementById('powerup-display'),
            menuScreen: document.getElementById('menu-screen'),
            btnPlay: document.getElementById('btn-play'), btnHangar: document.getElementById('btn-hangar'),
            totalCoins: document.getElementById('total-coins'),
            hangarScreen: document.getElementById('hangar-screen'),
            buyDmg: document.getElementById('buy-dmg'), buyRate: document.getElementById('buy-rate'),
            buyShield: document.getElementById('buy-shield'), buyHull: document.getElementById('buy-hull'),
            buySpeed: document.getElementById('buy-speed'),
            hDmgLv: document.getElementById('h-dmg-lv'), hRateLv: document.getElementById('h-rate-lv'),
            hShieldLv: document.getElementById('h-shield-lv'), hHullLv: document.getElementById('h-hull-lv'),
            hSpeedLv: document.getElementById('h-speed-lv'),
            btnHangarClose: document.getElementById('btn-hangar-close'),
            levelIntroScreen: document.getElementById('level-intro-screen'),
            liTitle: document.getElementById('li-title'), liDesc: document.getElementById('li-desc'),
            liObj: document.getElementById('li-obj'), btnLiStart: document.getElementById('btn-li-start'),
            waveBanner: document.getElementById('wave-banner'), waveBannerText: document.getElementById('wave-banner-text'),
            pauseScreen: document.getElementById('pause-screen'),
            btnResume: document.getElementById('btn-resume'), btnQuit: document.getElementById('btn-quit'),
            gameoverScreen: document.getElementById('gameover-screen'),
            goScore: document.getElementById('go-score'), goWaves: document.getElementById('go-waves'),
            goKills: document.getElementById('go-kills'), goCoins: document.getElementById('go-coins'),
            btnRevive: document.getElementById('btn-revive'),
            btnRetry: document.getElementById('btn-retry'), btnGoMenu: document.getElementById('btn-go-menu'),
            levelCompleteScreen: document.getElementById('level-complete-screen'),
            lcompTitle: document.getElementById('lcomp-title'),
            lcScore: document.getElementById('lc-score'), lcKills: document.getElementById('lc-kills'),
            lcCoins: document.getElementById('lc-coins'), lcBonus: document.getElementById('lc-bonus'),
            btnNextSector: document.getElementById('btn-next-sector'), btnLcMenu: document.getElementById('btn-lc-menu'),
            victoryScreen: document.getElementById('victory-screen'),
            vScore: document.getElementById('v-score'), vCoins: document.getElementById('v-coins'),
            btnVMenu: document.getElementById('btn-v-menu'),
            adScreen: document.getElementById('ad-screen'), adTimerNum: document.getElementById('ad-timer-num'),
            btnSkipAd: document.getElementById('btn-skip-ad'),
            rewardedScreen: document.getElementById('rewarded-ad-screen'),
            rewardBar: document.getElementById('reward-bar'), rewardStatus: document.getElementById('reward-status'),
            btnCloseReward: document.getElementById('btn-close-reward')
        };

        loadUpgrades();
        bindEvents();
        engine.runRenderLoop(() => { if(scene){if(state==='playing')updateGame();scene.render();} });
        window.addEventListener('resize', () => engine.resize());
    }

    function bindEvents() {
        window.addEventListener('keydown', e => {
            keys[e.key.toLowerCase()] = true;
            if(e.key==='p'&&state==='playing'){state='paused';els.pauseScreen.classList.remove('hidden');}
            if(e.key===' '&&state==='playing')e.preventDefault();
        });
        window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

        canvas.addEventListener('mousedown', () => { if(state==='playing') autoFire=true; });
        canvas.addEventListener('mouseup', () => { autoFire=false; });
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            if(state==='playing'){autoFire=true;touchPos={x:e.touches[0].clientX,y:e.touches[0].clientY};}
        },{passive:false});
        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            if(e.touches.length>0)touchPos={x:e.touches[0].clientX,y:e.touches[0].clientY};
        },{passive:false});
        canvas.addEventListener('touchend', e => { e.preventDefault(); autoFire=false; touchPos=null; },{passive:false});

        els.btnPlay.addEventListener('click', () => startSector(0));
        els.btnHangar.addEventListener('click', showHangar);
        els.btnHangarClose.addEventListener('click', () => hideAll('menu'));
        els.buyDmg.addEventListener('click', () => buyUpgrade('damage'));
        els.buyRate.addEventListener('click', () => buyUpgrade('fireRate'));
        els.buyShield.addEventListener('click', () => buyUpgrade('shield'));
        els.buyHull.addEventListener('click', () => buyUpgrade('hull'));
        els.buySpeed.addEventListener('click', () => buyUpgrade('speed'));
        els.btnLiStart.addEventListener('click', beginPlay);
        els.btnResume.addEventListener('click', resumeGame);
        els.btnQuit.addEventListener('click', () => { disposeScene(); hideAll('menu'); });
        els.btnRetry.addEventListener('click', () => startSector(currentSector));
        els.btnGoMenu.addEventListener('click', () => { disposeScene(); hideAll('menu'); });
        els.btnRevive.addEventListener('click', () => showRewardedAd(() => { player.health=player.maxHealth; player.shield=player.maxShield; resumeGame(); }));
        els.btnNextSector.addEventListener('click', () => { showInterstitialAd(() => startSector(currentSector+1)); });
        els.btnLcMenu.addEventListener('click', () => { disposeScene(); hideAll('menu'); });
        els.btnVMenu.addEventListener('click', () => { disposeScene(); hideAll('menu'); });
    }

    function loadUpgrades() {
        const r=NGN4.loadRewards();
        if(r.games&&r.games['star-vanguard']&&r.games['star-vanguard'].upgrades) upgrades=r.games['star-vanguard'].upgrades;
        updateHangar();
    }

    function saveUpgrades() {
        const r=NGN4.loadRewards();
        if(!r.games)r.games={};
        r.games['star-vanguard']={upgrades};
        NGN4.saveRewards(r);
    }

    function updateHangar() {
        els.hDmgLv.textContent=upgrades.damage;els.hRateLv.textContent=upgrades.fireRate;
        els.hShieldLv.textContent=upgrades.shield;els.hHullLv.textContent=upgrades.hull;els.hSpeedLv.textContent=upgrades.speed;
        els.buyDmg.textContent=upgrades.damage>=5?'MAX':`🪙${upgrades.damage*150}`;els.buyDmg.disabled=upgrades.damage>=5;
        els.buyRate.textContent=upgrades.fireRate>=5?'MAX':`🪙${upgrades.fireRate*150}`;els.buyRate.disabled=upgrades.fireRate>=5;
        els.buyShield.textContent=upgrades.shield>=5?'MAX':`🪙${upgrades.shield*200}`;els.buyShield.disabled=upgrades.shield>=5;
        els.buyHull.textContent=upgrades.hull>=5?'MAX':`🪙${upgrades.hull*200}`;els.buyHull.disabled=upgrades.hull>=5;
        els.buySpeed.textContent=upgrades.speed>=5?'MAX':`🪙${upgrades.speed*100}`;els.buySpeed.disabled=upgrades.speed>=5;
    }

    function buyUpgrade(type) {
        const cost=upgrades[type]*UPG_COSTS[type];
        if(upgrades[type]>=5||NGN4.getCoins()<cost)return;
        NGN4.addCoins(-cost);upgrades[type]++;saveUpgrades();updateHangar();
        els.totalCoins.querySelector('span').textContent=NGN4.getCoins();
        NGN4.playSound('powerup');
    }

    function showHangar() { hideAll();state='hangar';updateHangar();els.hangarScreen.classList.remove('hidden'); }

    // --- Screens ---
    function hideAll(s) {
        ['menuScreen','hangarScreen','levelIntroScreen','pauseScreen','gameoverScreen','levelCompleteScreen','victoryScreen','adScreen','rewardedScreen'].forEach(k=>els[k].classList.add('hidden'));
        els.waveBanner.classList.add('hidden');els.hud.classList.add('hidden');
        if(s==='menu'){state='menu';els.menuScreen.classList.remove('hidden');els.totalCoins.querySelector('span').textContent=NGN4.getCoins();}
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

    // --- Sector Start ---
    function startSector(num) {
        currentSector = num;
        currentWave = 1;
        score = 0;
        sessionCoins = 0;
        totalKills = 0;
        hideAll(); state='levelIntro';
        const sec = SECTORS[num];
        els.liTitle.textContent = `SECTOR ${num+1}`;
        els.liDesc.textContent = sec.name;
        els.liObj.textContent = `Survive ${sec.waves} waves`;
        els.levelIntroScreen.classList.remove('hidden');
    }

    function beginPlay() {
        hideAll(); disposeScene();
        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);

        // Camera
        camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 15, -20), scene);
        camera.setTarget(new BABYLON.Vector3(0, 0, 15));
        camera.minZ = 1;

        // Lighting
        const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0,1,0), scene);
        hemi.intensity = 0.4;

        const gl = new BABYLON.GlowLayer('glow', scene);
        gl.intensity = 0.6;

        // Stars background
        for (let i = 0; i < 200; i++) {
            const star = BABYLON.MeshBuilder.CreateSphere(`star_${i}`, {diameter:0.1+Math.random()*0.2}, scene);
            star.position.set((Math.random()-0.5)*80, (Math.random()-0.5)*40, Math.random()*100+10);
            const mat = new BABYLON.StandardMaterial(`smat_${i}`, scene);
            mat.emissiveColor = new BABYLON.Color3(0.8, 0.8, 1);
            mat.diffuseColor = new BABYLON.Color3(0,0,0);
            star.material = mat;
            stars.push({mesh:star, speed:0.1+Math.random()*0.3});
        }

        // Player ship
        player.mesh = createShipMesh('player', 0x00ffaa);
        player.mesh.position.set(0, 0, 0);
        player.health = 100 + (upgrades.hull-1) * 20;
        player.maxHealth = player.health;
        player.shield = 50 + (upgrades.shield-1) * 15;
        player.maxShield = player.shield;
        player.fireTimer = 0;
        player.invincible = 0;
        activePowerup = null;
        powerupTimer = 0;

        playerProjectiles = [];
        enemyProjectiles = [];
        enemies = [];
        powerups = [];
        particles = [];
        frameCount = 0;
        spawnCounter = 0;
        lives = 3;

        state = 'playing';
        els.hud.classList.remove('hidden');
        els.levelNum.textContent = currentSector + 1;
        updateHUD();
        showWaveBanner();
    }

    function createShipMesh(name, color) {
        const parent = new BABYLON.TransformNode(name, scene);

        // Main body
        const body = BABYLON.MeshBuilder.CreateBox(`${name}_body`, {width:1.5,height:0.5,depth:2.5}, scene);
        body.parent = parent;
        const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
        mat.diffuseColor = new BABYLON.Color3((color>>16&0xff)/255,(color>>8&0xff)/255,(color&0xff)/255);
        mat.emissiveColor = new BABYLON.Color3((color>>16&0xff)/510,(color>>8&0xff)/510,(color&0xff)/510);
        body.material = mat;

        // Wings
        for (let s=-1; s<=1; s+=2) {
            const wing = BABYLON.MeshBuilder.CreateBox(`${name}_wing${s}`, {width:2,height:0.2,depth:1.5}, scene);
            wing.position.set(s*1.5, 0, 0.3);
            wing.parent = parent;
            wing.material = mat;
        }

        // Engine glow
        const eng = BABYLON.MeshBuilder.CreateSphere(`${name}_eng`, {diameter:0.6}, scene);
        eng.position.set(0, 0, -1.5);
        eng.parent = parent;
        const engMat = new BABYLON.StandardMaterial(`${name}_emat`, scene);
        engMat.emissiveColor = new BABYLON.Color3(0, 0.5, 1);
        engMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
        eng.material = engMat;

        return parent;
    }

    function showWaveBanner() {
        const isBoss = currentWave % 5 === 0;
        els.waveBannerText.textContent = isBoss ? '⚠ BOSS WAVE ⚠' : `WAVE ${currentWave}`;
        els.waveBannerText.style.color = isBoss ? '#ff0044' : '#ff6600';
        els.waveBanner.classList.remove('hidden');
        setTimeout(() => els.waveBanner.classList.add('hidden'), 2500);
        if (isBoss) NGN4.playSound('boss');
    }

    // --- Game Loop ---
    function updateGame() {
        frameCount++;
        const sector = SECTORS[currentSector];
        const moveSpeed = 0.2 + upgrades.speed * 0.04;

        // Player movement
        let mx = 0, my = 0;
        if (keys['a']||keys['arrowleft']) mx = -moveSpeed;
        if (keys['d']||keys['arrowright']) mx = moveSpeed;
        if (keys['w']||keys['arrowup']) my = moveSpeed;
        if (keys['s']||keys['arrowdown']) my = -moveSpeed;

        // Touch movement
        if (touchPos) {
            const cx = window.innerWidth/2, cy = window.innerHeight/2;
            const dx = (touchPos.x - cx) / cx;
            const dy = (touchPos.y - cy) / cy;
            mx = dx * moveSpeed;
            my = -dy * moveSpeed;
        }

        player.mesh.position.x = Math.max(-12, Math.min(12, player.mesh.position.x + mx));
        player.mesh.position.y = Math.max(-6, Math.min(6, player.mesh.position.y + my));

        if (player.invincible > 0) player.invincible--;

        // Auto fire / space fire
        player.fireTimer--;
        if ((keys[' '] || autoFire) && player.fireTimer <= 0) {
            firePlayerWeapon();
        }

        // Power-up timer
        if (activePowerup) {
            powerupTimer--;
            if (powerupTimer <= 0) { activePowerup = null; els.powerupDisplay.classList.add('hidden'); }
        }

        // Spawn enemies
        spawnEnemies();

        // Update projectiles
        updateProjectiles();

        // Update enemies
        updateEnemies();

        // Update powerups
        updatePowerups();

        // Update particles
        updateParticles();

        // Update stars (scroll effect)
        stars.forEach(s => {
            s.mesh.position.z -= s.speed;
            if (s.mesh.position.z < -5) s.mesh.position.z = 100;
        });

        // Check wave completion
        if (enemies.length === 0 && frameCount % 60 === 0 && frameCount > 60) {
            currentWave++;
            if (currentWave > sector.waves) {
                completeSector();
                return;
            }
            spawnCounter = 0;
            showWaveBanner();
        }

        // Camera follow
        camera.position.x = player.mesh.position.x * 0.3;
        camera.position.y = 12 + player.mesh.position.y * 0.3;
        camera.setTarget(new BABYLON.Vector3(player.mesh.position.x*0.2, player.mesh.position.y*0.2, 20));

        updateHUD();
    }

    let spawnCounter = 0;
    function spawnEnemies() {
        spawnCounter++;
        const sector = SECTORS[currentSector];
        const isBoss = currentWave % 5 === 0;

        if (isBoss) {
            if (spawnCounter === 60 && enemies.filter(e=>e.isBoss).length === 0) {
                spawnBoss(sector);
            }
        } else {
            const rate = Math.max(30, 80 - currentWave * 3 - currentSector * 5);
            if (spawnCounter % rate === 0 && enemies.length < 15) {
                const type = Math.random() < 0.5 ? 'scout' : (Math.random() < 0.6 ? 'cruiser' : 'destroyer');
                spawnEnemy(type, sector);
            }
        }
    }

    function spawnEnemy(type, sector) {
        const templates = {
            scout: { hp: 30, speed: 0.15, size: 0.8, color: 0xff4444, coins: 10, score: 50, fireRate: 90, damage: 8 },
            cruiser: { hp: 80, speed: 0.08, size: 1.5, color: 0xff8800, coins: 25, score: 150, fireRate: 60, damage: 15 },
            destroyer: { hp: 150, speed: 0.05, size: 2, color: 0xcc44ff, coins: 50, score: 300, fireRate: 45, damage: 25 }
        };
        const t = templates[type];
        const mesh = createShipMesh(`e_${enemies.length}`, t.color);
        mesh.position.set((Math.random()-0.5)*20, (Math.random()-0.5)*8, 50+Math.random()*20);

        enemies.push({
            mesh, type, hp: t.hp * sector.enemyHpMult, maxHp: t.hp * sector.enemyHpMult,
            speed: t.speed * sector.enemySpeedMult, size: t.size, coins: t.coins,
            score: t.score, fireRate: t.fireRate, damage: t.damage,
            fireTimer: Math.random()*t.fireRate, isBoss: false,
            phase: Math.random()*Math.PI*2
        });
    }

    function spawnBoss(sector) {
        const mesh = createShipMesh('boss', 0xff0044);
        mesh.scaling.setAll(2.5);
        mesh.position.set(0, 0, 60);
        enemies.push({
            mesh, type: 'boss', hp: sector.bossHp, maxHp: sector.bossHp,
            speed: 0.03, size: 5, coins: 200, score: 1000,
            fireRate: 20, damage: 30, fireTimer: 0, isBoss: true,
            phase: 0
        });
    }

    function firePlayerWeapon() {
        const baseRate = Math.max(3, 12 - upgrades.fireRate * 2);
        const dmg = 10 + (upgrades.damage-1) * 5;
        let shots = 1;
        let spread = 0;

        if (activePowerup === 'spread') { shots = 3; spread = 0.2; player.fireTimer = baseRate; }
        else if (activePowerup === 'rapid') { player.fireTimer = Math.max(2, baseRate - 4); }
        else { player.fireTimer = baseRate; }

        NGN4.playSound('laser');

        for (let i = 0; i < shots; i++) {
            const offset = shots > 1 ? (i - (shots-1)/2) * spread : 0;
            const proj = BABYLON.MeshBuilder.CreateSphere(`pp_${frameCount}_${i}`, {diameter:0.3}, scene);
            proj.position.set(player.mesh.position.x + offset*10, player.mesh.position.y, player.mesh.position.z + 2);
            const mat = new BABYLON.StandardMaterial(`ppm_${frameCount}_${i}`, scene);
            mat.emissiveColor = new BABYLON.Color3(0, 1, 0.66);
            mat.diffuseColor = new BABYLON.Color3(0,0,0);
            proj.material = mat;
            playerProjectiles.push({ mesh: proj, vx: offset*0.5, vy: 0, vz: 0.8, damage: dmg, life: 120 });
        }
    }

    function updateProjectiles() {
        // Player projectiles
        for (let i = playerProjectiles.length-1; i >= 0; i--) {
            const p = playerProjectiles[i];
            p.mesh.position.x += p.vx;
            p.mesh.position.y += p.vy;
            p.mesh.position.z += p.vz;
            p.life--;

            if (p.life <= 0 || p.mesh.position.z > 70) {
                p.mesh.dispose();
                playerProjectiles.splice(i, 1);
                continue;
            }

            // Hit enemies
            for (let j = enemies.length-1; j >= 0; j--) {
                const e = enemies[j];
                const dist = BABYLON.Vector3.Distance(p.mesh.position, e.mesh.position);
                if (dist < e.size) {
                    e.hp -= p.damage;
                    p.mesh.dispose();
                    playerProjectiles.splice(i, 1);
                    NGN4.playSound('hit');
                    spawnExplosion(p.mesh.position, 0.2, 3);

                    if (e.hp <= 0) destroyEnemy(j);
                    break;
                }
            }
        }

        // Enemy projectiles
        for (let i = enemyProjectiles.length-1; i >= 0; i--) {
            const p = enemyProjectiles[i];
            p.mesh.position.x += p.vx;
            p.mesh.position.y += p.vy;
            p.mesh.position.z += p.vz;
            p.life--;

            if (p.life <= 0 || p.mesh.position.z < -5) {
                p.mesh.dispose();
                enemyProjectiles.splice(i, 1);
                continue;
            }

            // Hit player
            const dist = BABYLON.Vector3.Distance(p.mesh.position, player.mesh.position);
            if (dist < 1.5 && player.invincible <= 0) {
                damagePlayer(p.damage);
                p.mesh.dispose();
                enemyProjectiles.splice(i, 1);
                NGN4.playSound('hit');
            }
        }
    }

    function updateEnemies() {
        for (let i = enemies.length-1; i >= 0; i--) {
            const e = enemies[i];

            // Move toward player area
            if (e.isBoss) {
                e.phase += 0.01;
                e.mesh.position.z = Math.max(30, e.mesh.position.z - 0.02);
                e.mesh.position.x = Math.sin(e.phase) * 8;
                e.mesh.position.y = Math.cos(e.phase * 0.7) * 3;
            } else {
                e.mesh.position.z -= e.speed;
                e.mesh.position.x += Math.sin(frameCount * 0.02 + e.phase) * 0.05;
            }

            // Fire at player
            e.fireTimer--;
            if (e.fireTimer <= 0 && e.mesh.position.z < 50 && e.mesh.position.z > 0) {
                e.fireTimer = e.fireRate;
                const dir = player.mesh.position.subtract(e.mesh.position).normalize();
                const proj = BABYLON.MeshBuilder.CreateSphere(`ep_${frameCount}_${i}`, {diameter:0.3}, scene);
                proj.position = e.mesh.position.clone();
                const mat = new BABYLON.StandardMaterial(`epm_${frameCount}_${i}`, scene);
                mat.emissiveColor = new BABYLON.Color3(1, 0.2, 0);
                mat.diffuseColor = new BABYLON.Color3(0,0,0);
                proj.material = mat;
                enemyProjectiles.push({ mesh: proj, vx: dir.x*0.3, vy: dir.y*0.3, vz: dir.z*0.3, damage: e.damage, life: 150 });
            }

            // Remove if passed player
            if (e.mesh.position.z < -10 && !e.isBoss) {
                e.mesh.dispose();
                enemies.splice(i, 1);
            }

            // Direct collision with player
            if (!e.isBoss && e.mesh.position.z > -3 && e.mesh.position.z < 3) {
                const dist = BABYLON.Vector3.Distance(e.mesh.position, player.mesh.position);
                if (dist < (e.size * 0.5 + 1) && player.invincible <= 0) {
                    damagePlayer(e.damage * 0.5);
                    e.hp -= 50;
                    if (e.hp <= 0) { e.mesh.dispose(); enemies.splice(i, 1); }
                }
            }
        }
    }

    function updatePowerups() {
        for (let i = powerups.length-1; i >= 0; i--) {
            const pu = powerups[i];
            pu.mesh.position.z -= 0.08;
            pu.mesh.rotation.y += 0.05;

            if (pu.mesh.position.z < -5) {
                pu.mesh.dispose();
                powerups.splice(i, 1);
                continue;
            }

            const dist = BABYLON.Vector3.Distance(pu.mesh.position, player.mesh.position);
            if (dist < 2) {
                NGN4.playSound('powerup');
                if (pu.type === 'shield') { player.shield = Math.min(player.maxShield, player.shield + 30); }
                else if (pu.type === 'rapid') { activePowerup = 'rapid'; powerupTimer = 300; els.powerupDisplay.textContent = '⚡ RAPID FIRE'; els.powerupDisplay.classList.remove('hidden'); }
                else if (pu.type === 'spread') { activePowerup = 'spread'; powerupTimer = 300; els.powerupDisplay.textContent = '✦ SPREAD SHOT'; els.powerupDisplay.classList.remove('hidden'); }
                else if (pu.type === 'health') { player.health = Math.min(player.maxHealth, player.health + 30); }
                else if (pu.type === 'missile') { activePowerup = 'missile'; powerupTimer = 200; els.powerupDisplay.textContent = '🚀 MISSILE'; els.powerupDisplay.classList.remove('hidden'); }

                pu.mesh.dispose();
                powerups.splice(i, 1);
            }
        }
    }

    function destroyEnemy(index) {
        const e = enemies[index];
        NGN4.playSound('explosion');
        spawnExplosion(e.mesh.position, e.size, 12);

        sessionCoins += e.coins;
        NGN4.addCoins(e.coins);
        score += e.score;
        totalKills++;

        // Drop power-up
        if (Math.random() < (e.isBoss ? 1 : 0.15)) {
            const types = ['shield', 'rapid', 'spread', 'health', 'missile'];
            const type = types[Math.floor(Math.random()*types.length)];
            const colors = {shield:0x4488ff,rapid:0xffff00,spread:0x00ff88,health:0xff4444,missile:0xff6600};
            const pu = BABYLON.MeshBuilder.CreatePolyhedron(`pu_${frameCount}`, {type:1,size:0.4}, scene);
            pu.position = e.mesh.position.clone();
            const mat = new BABYLON.StandardMaterial(`pumat_${frameCount}`, scene);
            mat.diffuseColor = new BABYLON.Color3((colors[type]>>16&0xff)/255,(colors[type]>>8&0xff)/255,(colors[type]&0xff)/255);
            mat.emissiveColor = mat.diffuseColor.scale(0.5);
            pu.material = mat;
            powerups.push({ mesh: pu, type });
        }

        e.mesh.dispose();
        enemies.splice(index, 1);
    }

    function spawnExplosion(pos, size, count) {
        for (let i = 0; i < count; i++) {
            const p = BABYLON.MeshBuilder.CreateSphere(`exp_${frameCount}_${i}`, {diameter:0.2+Math.random()*0.3}, scene);
            p.position = pos.clone();
            const mat = new BABYLON.StandardMaterial(`expm_${frameCount}_${i}`, scene);
            mat.emissiveColor = new BABYLON.Color3(1, 0.5+Math.random()*0.5, Math.random()*0.3);
            mat.diffuseColor = new BABYLON.Color3(0,0,0);
            mat.alpha = 0.8;
            p.material = mat;
            particles.push({
                mesh: p,
                vx: (Math.random()-0.5)*0.5,
                vy: (Math.random()-0.5)*0.5,
                vz: (Math.random()-0.5)*0.3,
                life: 30+Math.random()*20
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length-1; i >= 0; i--) {
            const p = particles[i];
            p.mesh.position.x += p.vx;
            p.mesh.position.y += p.vy;
            p.mesh.position.z += p.vz;
            p.life--;
            if (p.life <= 0) {
                p.mesh.dispose();
                particles.splice(i, 1);
            }
        }
    }

    function damagePlayer(amount) {
        if (player.invincible > 0) return;

        // Shield absorbs first
        let dmg = amount;
        if (player.shield > 0) {
            const absorbed = Math.min(player.shield, dmg * 0.7);
            player.shield -= absorbed;
            dmg -= absorbed;
            NGN4.playSound('shield');
        }

        player.health -= dmg;
        player.invincible = 30;
        spawnExplosion(player.mesh.position, 0.5, 5);

        if (player.health <= 0) {
            player.health = 0;
            lives--;
            spawnExplosion(player.mesh.position, 2, 20);
            NGN4.playSound('explosion');

            if (lives <= 0) {
                showGameOver();
            } else {
                // Respawn
                player.health = player.maxHealth;
                player.shield = player.maxShield;
                player.invincible = 90;
                player.mesh.position.set(0, 0, 0);
            }
        }
    }

    function updateHUD() {
        els.healthBar.style.width = Math.max(0, (player.health/player.maxHealth)*100)+'%';
        els.healthText.textContent = Math.max(0, Math.ceil(player.health));
        els.shieldBar.style.width = Math.max(0, (player.shield/player.maxShield)*100)+'%';
        els.shieldText.textContent = Math.max(0, Math.ceil(player.shield));
        els.waveNum.textContent = Math.min(currentWave, SECTORS[currentSector].waves);
        els.scoreVal.textContent = score;
        els.coinsVal.textContent = sessionCoins;
        els.weaponName.textContent = activePowerup ? activePowerup.toUpperCase() : 'SINGLE';
    }

    function showGameOver() {
        state = 'gameover';
        hideAll();
        els.goScore.textContent = score;
        els.goWaves.textContent = currentWave;
        els.goKills.textContent = totalKills;
        els.goCoins.textContent = sessionCoins;
        els.btnRevive.classList.remove('hidden');
        els.gameoverScreen.classList.remove('hidden');
    }

    function completeSector() {
        state = 'levelComplete';
        const bonus = 300 + currentSector * 100;
        sessionCoins += bonus;
        NGN4.addCoins(bonus);

        hideAll();
        els.lcompTitle.textContent = `SECTOR ${currentSector+1} CLEAR`;
        els.lcScore.textContent = score;
        els.lcKills.textContent = totalKills;
        els.lcCoins.textContent = sessionCoins;
        els.lcBonus.textContent = `+${bonus}`;
        els.levelCompleteScreen.classList.remove('hidden');

        if (currentSector >= SECTORS.length - 1) {
            els.btnNextSector.textContent = 'VIEW RESULTS ▶';
            els.btnNextSector.onclick = () => showVictory();
        } else {
            els.btnNextSector.textContent = 'NEXT SECTOR ▶';
            els.btnNextSector.onclick = () => showInterstitialAd(() => startSector(currentSector+1));
        }
    }

    function showVictory() {
        hideAll();
        els.vScore.textContent = score;
        els.vCoins.textContent = sessionCoins;
        els.victoryScreen.classList.remove('hidden');
    }

    function resumeGame() { hideAll(); state='playing'; els.hud.classList.remove('hidden'); }
    function disposeScene() { if(scene){scene.dispose();scene=null;} playerProjectiles=[]; enemyProjectiles=[]; enemies=[]; powerups=[]; particles=[]; stars=[]; }

    window.addEventListener('DOMContentLoaded', init);
})();
