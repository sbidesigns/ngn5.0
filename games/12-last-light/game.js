// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('last-light'); } catch(e) {}

// ========================================
// NGN4 - LAST LIGHT (Game 12)
// Survival Game
// ========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Audio
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function initAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }

function playSound(freq, dur, type = 'square', vol = 0.1) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
}

// Rewards
function getRewards() {
    try { return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, games_played: 0 }; }
    catch { return { coins: 0, games_played: 0 }; }
}
function saveRewards(r) { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); }
function addCoins(n) { const r = getRewards(); r.coins += n; saveRewards(r); }
function updateCoinsDisplay() {
    const c = getRewards().coins;
    ['coins-val', 'menu-coins-val'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = c;
    });
}

// World
const WORLD_W = 1600, WORLD_H = 1200;
const DAY_DURATION = 180; // seconds
const NIGHT_DURATION = 120;
const TOTAL_DAYS = 10;

// Touch controls
let touchJoystick = { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0 };
let touchActions = { attack: false, interact: false, build: false };
let touchActionBtns = [];

// Gamepad
let gamepadConnected = false;
let gamepadAxes = [0, 0];
let gamepadBtns = {};
window.addEventListener('gamepadconnected', e => { gamepadConnected = true; });
window.addEventListener('gamepaddisconnected', e => { gamepadConnected = false; });
function pollGamepad() {
    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    if (!gp) return;
    gamepadAxes = [gp.axes[0] || 0, gp.axes[1] || 0];
    gamepadBtns = { a: gp.buttons[0]?.pressed, b: gp.buttons[1]?.pressed, x: gp.buttons[2]?.pressed, y: gp.buttons[3]?.pressed, lb: gp.buttons[4]?.pressed, rb: gp.buttons[5]?.pressed, lt: gp.buttons[6]?.pressed, rt: gp.buttons[7]?.pressed, start: gp.buttons[9]?.pressed };
}

// Weather system
const WEATHER_TYPES = ['clear', 'rain', 'fog', 'storm'];

// Achievements
const ACHIEVEMENTS = {
    survivor: { name: 'Survivor', desc: 'Survive all 10 nights', done: false },
    builder: { name: 'Builder', desc: 'Build 20 structures in one run', done: false },
    craftsman: { name: 'Craftsman', desc: 'Build one of each structure type', done: false },
    noDamage: { name: 'No Damage', desc: 'Complete a night without taking damage', done: false }
};
let achievementUnlocks = JSON.parse(localStorage.getItem('ngn4_ach_12') || '{}');
function checkAchievements() {
    function unlock(key) {
        if (ACHIEVEMENTS[key] && !achievementUnlocks[key]) {
            achievementUnlocks[key] = true;
            ACHIEVEMENTS[key].done = true;
            localStorage.setItem('ngn4_ach_12', JSON.stringify(achievementUnlocks));
            addNotification('🏆 Achievement: ' + ACHIEVEMENTS[key].name + '!');
            playSound(800, 0.2, 'sine', 0.15);
            setTimeout(() => playSound(1000, 0.2, 'sine', 0.15), 150);
            addCoins(50);
        }
    }
    if (G.nightsSurvived >= 10) unlock('survivor');
    if (G.totalStructuresBuilt >= 20) unlock('builder');
    const types = new Set(G.structureTypesBuilt);
    if (types.has('torch') && types.has('wall') && types.has('turret') && types.has('barricade') && types.has('spike_trap') && types.has('healing_station') && types.has('watch_tower')) unlock('craftsman');
    if (G.noDamageNight) unlock('noDamage');
}

// Equipment pickups
const EQUIPMENT_TYPES = {
    speed_boots: { name: 'Speed Boots', desc: '+30% movement speed', color: '#00ccff', effect: p => { p.speed *= 1.3; p.sprintSpeed *= 1.3; } },
    damage_boost: { name: 'Damage Boost', desc: '+50% attack damage', color: '#ff4444', effect: p => { p.damageMultiplier = (p.damageMultiplier || 1) * 1.5; } },
    armor_vest: { name: 'Armor Vest', desc: '+30 max HP, heal 30', color: '#8888ff', effect: p => { p.maxHp += 30; p.hp = Math.min(p.hp + 30, p.maxHp); } },
    flashlight_battery: { name: 'Extended Battery', desc: '+50% beacon light radius', color: '#ffff44', effect: p => { G.beacon.lightRadius *= 1.5; } }
};

// Boss enemies
const BOSS_TYPES = [
    { name: 'Shadow Lord', hp: 200, speed: 0.8, damage: 20, size: 30, color: '#330066', coins: 50, special: 'teleport' },
    { name: 'Void Titan', hp: 300, speed: 0.5, damage: 30, size: 40, color: '#110022', coins: 80, special: 'summon' },
    { name: 'Dark Herald', hp: 250, speed: 1.0, damage: 25, size: 35, color: '#440044', coins: 65, special: 'rage' }
];

// Weather
let weatherParticles = [];

// Game State
let G = {};
function resetGame() {
    G = {
        screen: 'menu',
        day: 1,
        phase: 'day', // day or night
        phaseTime: 0,
        totalCoinsEarned: 0,
        totalResources: 0,
        totalKills: 0,
        nightsSurvived: 0,
        player: {
            x: 800, y: 600, hp: 100, maxHp: 100,
            stamina: 100, maxStamina: 100,
            speed: 2.5, sprintSpeed: 4.5,
            inv: { wood: 0, food: 0, scrap: 0 },
            torches: 0, walls: 0, turrets: 0, healthpacks: 0,
            attackCooldown: 0, attackRange: 40,
            invincible: 0
        },
        beacon: { x: 800, y: 600, hp: 100, maxHp: 100, lightRadius: 200 },
        resources: [],
        enemies: [],
        structures: [], // walls, turrets
        particles: [],
        notifications: [],
        camera: { x: 0, y: 0 },
        keys: {},
        mouse: { x: 0, y: 0 },
        turretTimers: {},
        waveNum: 0,
        waveSize: 0,
        spawnTimer: 0,
        enemiesSpawned: 0,
        beaconGlow: 0,
        weather: 'clear',
        weatherTimer: 0,
        weatherDuration: 0,
        totalStructuresBuilt: 0,
        structureTypesBuilt: [],
        noDamageNight: true,
        equipment: [],
        bossActive: false,
        bossSpawnDay: 3,
        notificationQueue: []
    };
}
resetGame();

// Resource types
const RES_TYPES = ['wood', 'food', 'scrap'];
const RES_COLORS = { wood: '#8B4513', food: '#ff6644', scrap: '#aaaacc' };
const RES_SIZES = { wood: 12, food: 10, scrap: 8 };

function generateResources() {
    G.resources = [];
    const count = 30 + G.day * 5;
    for (let i = 0; i < count; i++) {
        const type = RES_TYPES[Math.floor(Math.random() * 3)];
        G.resources.push({
            x: 100 + Math.random() * (WORLD_W - 200),
            y: 100 + Math.random() * (WORLD_H - 200),
            type, amount: 1 + Math.floor(Math.random() * 2),
            id: i
        });
    }
}

// Enemy types
const ENEMY_TYPES = [
    { name: 'Shade', hp: 20, speed: 1.2, damage: 5, size: 12, color: '#442266', coins: 5 },
    { name: 'Wraith', hp: 35, speed: 1.8, damage: 8, size: 14, color: '#662244', coins: 8 },
    { name: 'Darkling', hp: 15, speed: 2.5, damage: 4, size: 10, color: '#333355', coins: 4 },
    { name: 'Void Beast', hp: 60, speed: 1.0, damage: 15, size: 20, color: '#220033', coins: 15 },
    { name: 'Shadow Fiend', hp: 40, speed: 2.0, damage: 10, size: 16, color: '#440044', coins: 12 }
];

function spawnEnemy() {
    if (G.enemiesSpawned >= G.waveSize) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = 400 + Math.random() * 200;
    const typeIdx = Math.min(Math.floor(Math.random() * (1 + G.day * 0.5)), ENEMY_TYPES.length - 1);
    const template = ENEMY_TYPES[typeIdx];
    const mult = 1 + (G.day - 1) * 0.15;

    G.enemies.push({
        x: G.beacon.x + Math.cos(angle) * dist,
        y: G.beacon.y + Math.sin(angle) * dist,
        hp: template.hp * mult,
        maxHp: template.hp * mult,
        speed: template.speed,
        damage: template.damage * mult,
        size: template.size,
        color: template.color,
        coins: template.coins,
        name: template.name,
        attackTimer: 0,
        target: null, // null=beacon, 'player'
        flash: 0
    });
    G.enemiesSpawned++;
}

function startNight() {
    G.phase = 'night';
    G.phaseTime = 0;
    G.waveNum++;
    G.waveSize = 8 + G.day * 4 + G.waveNum * 2;
    G.enemiesSpawned = 0;
    G.spawnTimer = 0;
    G.enemies = [];
    G.bossActive = false;
    // Player returns near beacon
    G.player.x = G.beacon.x + (Math.random() - 0.5) * 100;
    G.player.y = G.beacon.y + 80;
}

function startDay() {
    G.phase = 'day';
    G.phaseTime = 0;
    G.nightsSurvived++;
    G.totalCoinsEarned += 100;
    addCoins(100);
    addNotification('+100 coins for surviving the night!');
    generateResources();
    // Keep structures
}

function addNotification(text) {
    G.notifications.push({ text, timer: 3, y: 0 });
}

// Crafting recipes
const RECIPES = {
    torch: { wood: 2, food: 0, scrap: 0, desc: 'Place a light source (wards enemies)' },
    wall: { wood: 3, food: 0, scrap: 2, desc: 'Place a barrier' },
    turret: { wood: 2, food: 0, scrap: 5, desc: 'Auto-attacks enemies' },
    healthpack: { wood: 0, food: 3, scrap: 0, desc: 'Restore 40 HP (use with E near beacon)' },
    barricade: { wood: 5, food: 0, scrap: 1, desc: 'Strong barricade wall (150 HP)' },
    spike_trap: { wood: 1, food: 0, scrap: 4, desc: 'Damages enemies walking over it' },
    healing_station: { wood: 2, food: 4, scrap: 2, desc: 'Heals player nearby (20 HP/s)' },
    watch_tower: { wood: 4, food: 0, scrap: 6, desc: 'Extended vision range (300px)' }
};

function canCraft(item) {
    const r = RECIPES[item];
    const inv = G.player.inv;
    return inv.wood >= r.wood && inv.food >= r.food && inv.scrap >= r.scrap;
}

function craftItem(item) {
    if (!canCraft(item)) return;
    const r = RECIPES[item];
    G.player.inv.wood -= r.wood;
    G.player.inv.food -= r.food;
    G.player.inv.scrap -= r.scrap;

    if (item === 'healthpack') {
        G.player.hp = Math.min(G.player.maxHp, G.player.hp + 40);
        addNotification('+40 HP restored!');
        playSound(600, 0.15, 'sine', 0.15);
    } else if (item === 'torch') {
        G.structures.push({
            type: 'torch', x: G.player.x, y: G.player.y,
            hp: 50, lightRadius: 120, lifetime: 0
        });
        addNotification('Torch placed!');
        playSound(800, 0.1, 'sine', 0.1);
    } else if (item === 'wall') {
        G.structures.push({
            type: 'wall', x: G.player.x, y: G.player.y,
            hp: 100, size: 20
        });
        addNotification('Wall built!');
        playSound(200, 0.1, 'square', 0.1);
    } else if (item === 'turret') {
        const id = Date.now() + Math.random();
        G.structures.push({
            type: 'turret', x: G.player.x, y: G.player.y,
            hp: 60, range: 150, damage: 10, cooldown: 0, id
        });
        addNotification('Turret deployed!');
        playSound(400, 0.08, 'square', 0.1);
        playSound(600, 0.08, 'square', 0.1);
    } else if (item === 'barricade') {
        G.structures.push({ type: 'barricade', x: G.player.x, y: G.player.y, hp: 150, size: 24 });
        addNotification('Barricade built!');
        playSound(200, 0.1, 'square', 0.1);
        playSound(300, 0.08, 'square', 0.08);
    } else if (item === 'spike_trap') {
        G.structures.push({ type: 'spike_trap', x: G.player.x, y: G.player.y, hp: 80, damage: 8, cooldown: 0, size: 18 });
        addNotification('Spike trap placed!');
        playSound(600, 0.1, 'sawtooth', 0.08);
    } else if (item === 'healing_station') {
        G.structures.push({ type: 'healing_station', x: G.player.x, y: G.player.y, hp: 60, range: 100, cooldown: 0 });
        addNotification('Healing station built!');
        playSound(500, 0.1, 'sine', 0.1);
        playSound(700, 0.08, 'sine', 0.08);
    } else if (item === 'watch_tower') {
        G.structures.push({ type: 'watch_tower', x: G.player.x, y: G.player.y, hp: 80, range: 300 });
        addNotification('Watch tower built! Extended vision!');
        playSound(400, 0.1, 'sine', 0.1);
        playSound(600, 0.1, 'sine', 0.1);
    }
    G.totalStructuresBuilt++;
    if (item !== 'healthpack' && !G.structureTypesBuilt.includes(item)) {
        G.structureTypesBuilt.push(item);
    }
    checkAchievements();
}

// Update
function update(dt) {
    if (G.screen !== 'playing') return;

    const p = G.player;
    const k = G.keys;

    // Phase timer
    G.phaseTime += dt;
    const maxTime = G.phase === 'day' ? DAY_DURATION : NIGHT_DURATION;
    if (G.phaseTime >= maxTime) {
        if (G.phase === 'day') {
            startNight();
        } else {
            if (G.day >= TOTAL_DAYS) {
                winGame();
                return;
            }
            G.day++;
            startDay();
        }
    }

    // Poll gamepad
    pollGamepad();

    // Player movement
    let dx = 0, dy = 0;
    if (k['KeyW'] || k['ArrowUp']) dy -= 1;
    if (k['KeyS'] || k['ArrowDown']) dy += 1;
    if (k['KeyA'] || k['ArrowLeft']) dx -= 1;
    if (k['KeyD'] || k['ArrowRight']) dx += 1;
    // Touch joystick
    if (touchJoystick.active) { dx += touchJoystick.dx; dy += touchJoystick.dy; }
    // Gamepad left stick
    if (gamepadConnected) { dx += gamepadAxes[0]; dy += gamepadAxes[1]; if (Math.abs(gamepadAxes[0]) < 0.15) dx -= gamepadAxes[0]; if (Math.abs(gamepadAxes[1]) < 0.15) dy -= gamepadAxes[1]; }

    if (dx || dy) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len; dy /= len;

        const sprinting = (k['ShiftLeft'] || k['ShiftRight']) && p.stamina > 0;
        const spd = sprinting ? p.sprintSpeed : p.speed;
        if (sprinting) p.stamina = Math.max(0, p.stamina - 20 * dt);
        else p.stamina = Math.min(p.maxStamina, p.stamina + 10 * dt);

        p.x += dx * spd;
        p.y += dy * spd;
        p.x = Math.max(10, Math.min(WORLD_W - 10, p.x));
        p.y = Math.max(10, Math.min(WORLD_H - 10, p.y));
    } else {
        p.stamina = Math.min(p.maxStamina, p.stamina + 15 * dt);
    }

    // Cooldowns
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.invincible > 0) p.invincible -= dt;

    // Resource gathering (day only, walk over)
    if (G.phase === 'day') {
        for (let i = G.resources.length - 1; i >= 0; i--) {
            const r = G.resources[i];
            if (r.type === 'equipment') continue; // handled separately
            const dist = Math.hypot(p.x - r.x, p.y - r.y);
            if (dist < 25) {
                p.inv[r.type] += r.amount;
                G.totalResources += r.amount;
                addCoins(5 * r.amount);
                G.totalCoinsEarned += 5 * r.amount;
                addNotification(`+${r.amount} ${r.type} (+${5 * r.amount} coins)`);
                playSound(500 + Math.random() * 300, 0.08, 'sine', 0.08);
                // Spawn particle
                for (let j = 0; j < 5; j++) {
                    G.particles.push({
                        x: r.x, y: r.y,
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3,
                        life: 0.8, color: RES_COLORS[r.type], size: 3
                    });
                }
                G.resources.splice(i, 1);
            }
        }
    }

    // Weather system
    G.weatherTimer += dt;
    if (G.weatherTimer >= G.weatherDuration) {
        G.weatherTimer = 0;
        G.weatherDuration = 30 + Math.random() * 60;
        if (G.phase === 'night') {
            G.weather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
            if (G.weather !== 'clear') addNotification('Weather: ' + G.weather.toUpperCase());
        } else {
            G.weather = 'clear';
        }
    }
    // Weather effects
    if (G.weather === 'storm') {
        G.structures.forEach(s => { if (s.hp > 0 && s.type !== 'beacon' && Math.random() < 0.0003) { s.hp -= 2; if (s.hp <= 0) addNotification('Storm damaged a ' + s.type + '!'); } });
    }
    // Weather particles
    if (G.weather === 'rain' || G.weather === 'storm') {
        for (let i = 0; i < 3; i++) {
            weatherParticles.push({ x: Math.random() * 800, y: -10, vx: G.weather === 'storm' ? -2 : -0.5, vy: 8 + Math.random() * 4, life: 1 });
        }
    }
    for (let i = weatherParticles.length - 1; i >= 0; i--) {
        weatherParticles[i].x += weatherParticles[i].vx; weatherParticles[i].y += weatherParticles[i].vy;
        if (weatherParticles[i].y > 600) weatherParticles.splice(i, 1);
    }

    // Equipment pickup (from scrap/food resources during day)
    if (G.phase === 'day' && Math.random() < 0.002 && G.resources.length < 40) {
        const eqKeys = Object.keys(EQUIPMENT_TYPES);
        const eqKey = eqKeys[Math.floor(Math.random() * eqKeys.length)];
        const eq = EQUIPMENT_TYPES[eqKey];
        G.resources.push({ x: 100 + Math.random() * (WORLD_W - 200), y: 100 + Math.random() * (WORLD_H - 200), type: 'equipment', equipmentKey: eqKey, amount: 1, id: Date.now() });
    }

    // Attack enemies (click or E key near enemy)
    if ((k['KeyE'] || k['Space'] || touchActions.attack || gamepadBtns.a) && p.attackCooldown <= 0) {
        p.attackCooldown = 0.4;
        let hitAny = false;
        for (let i = G.enemies.length - 1; i >= 0; i--) {
            const e = G.enemies[i];
            const dist = Math.hypot(p.x - e.x, p.y - e.y);
            if (dist < p.attackRange + e.size) {
                const dmg = (15 + Math.floor(Math.random() * 10)) * (p.damageMultiplier || 1);
                e.hp -= dmg;
                e.flash = 0.3;
                hitAny = true;
                playSound(300, 0.1, 'sawtooth', 0.12);

                for (let j = 0; j < 6; j++) {
                    G.particles.push({
                        x: e.x, y: e.y,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 4,
                        life: 0.5, color: '#ff6644', size: 3
                    });
                }

                if (e.hp <= 0) {
                    G.totalKills++;
                    addCoins(e.coins);
                    G.totalCoinsEarned += e.coins;
                    addNotification(`Killed ${e.name}! +${e.coins} coins`);
                    G.enemies.splice(i, 1);
                    playSound(150, 0.2, 'square', 0.1);
                }
            }
        }
        if (hitAny) playSound(200, 0.15, 'sawtooth', 0.08);
    }

    // Enemy AI (night)
    if (G.phase === 'night') {
        // Boss spawning every 3 nights
        if (!G.bossActive && G.day >= G.bossSpawnDay && G.enemiesSpawned === 0) {
            const bossIdx = Math.floor((G.day - G.bossSpawnDay) / 3) % BOSS_TYPES.length;
            const boss = BOSS_TYPES[Math.min(bossIdx, BOSS_TYPES.length - 1)];
            const mult = 1 + (G.day - 1) * 0.15;
            G.enemies.push({
                x: G.beacon.x + 500, y: G.beacon.y,
                hp: boss.hp * mult, maxHp: boss.hp * mult,
                speed: boss.speed, damage: boss.damage * mult,
                size: boss.size, color: boss.color, coins: boss.coins,
                name: boss.name + ' (BOSS)', attackTimer: 0, target: null,
                flash: 0, isBoss: true, special: boss.special, specialTimer: 5
            });
            G.bossActive = true;
            addNotification('⚠ BOSS: ' + boss.name + ' has appeared!');
            playSound(100, 0.5, 'sawtooth', 0.2);
            G.bossSpawnDay += 3;
        }

        // Spawn enemies
        G.spawnTimer -= dt;
        if (G.spawnTimer <= 0 && G.enemiesSpawned < G.waveSize) {
            spawnEnemy();
            G.spawnTimer = Math.max(0.5, 3 - G.day * 0.2);
        }

        // Update enemies
        for (const e of G.enemies) {
            e.flash = Math.max(0, e.flash - dt);
            e.attackTimer -= dt;
            if (e.specialTimer !== undefined) e.specialTimer -= dt;

            // Boss special attacks
            if (e.isBoss && e.specialTimer <= 0) {
                if (e.special === 'teleport') {
                    const ang = Math.random() * Math.PI * 2;
                    const dist = 100 + Math.random() * 150;
                    e.x = p.x + Math.cos(ang) * dist;
                    e.y = p.y + Math.sin(ang) * dist;
                    e.specialTimer = 8;
                    addNotification(e.name + ' teleported!');
                } else if (e.special === 'summon' && e.specialTimer <= 0) {
                    for (let si = 0; si < 3; si++) {
                        const ang = Math.random() * Math.PI * 2;
                        G.enemies.push({ x: e.x + Math.cos(ang) * 50, y: e.y + Math.sin(ang) * 50, hp: 15, maxHp: 15, speed: 2, damage: 5, size: 10, color: '#442244', coins: 3, name: 'Minion', attackTimer: 0, target: null, flash: 0 });
                    }
                    e.specialTimer = 12;
                    addNotification(e.name + ' summoned minions!');
                } else if (e.special === 'rage') {
                    e.speed *= 1.5; e.damage *= 1.3;
                    e.specialTimer = 15;
                    addNotification(e.name + ' enters RAGE mode!');
                }
            }

            // Check torch proximity - enemies avoid torches
            let torchRepel = { x: 0, y: 0 };
            for (const s of G.structures) {
                if (s.type === 'torch') {
                    const d = Math.hypot(e.x - s.x, e.y - s.y);
                    if (d < s.lightRadius) {
                        const ang = Math.atan2(e.y - s.y, e.x - s.x);
                        torchRepel.x += Math.cos(ang) * 0.5;
                        torchRepel.y += Math.sin(ang) * 0.5;
                    }
                }
            }

            // Check wall/barricade collision
            let blocked = false;
            for (const s of G.structures) {
                if ((s.type === 'wall' || s.type === 'barricade') && s.hp > 0) {
                    const d = Math.hypot(e.x - s.x, e.y - s.y);
                    if (d < s.size + e.size) {
                        // Attack wall
                        if (e.attackTimer <= 0) {
                            s.hp -= e.damage;
                            e.attackTimer = 1;
                            if (s.hp <= 0) {
                                s.hp = 0; // Mark for removal
                            }
                        }
                        blocked = true;
                        break;
                    }
                }
            }

            if (!blocked) {
                // Move toward beacon (or player if close)
                const distToPlayer = Math.hypot(e.x - p.x, e.y - p.y);
                const distToBeacon = Math.hypot(e.x - G.beacon.x, e.y - G.beacon.y);
                let targetX, targetY;

                if (distToPlayer < 120) {
                    targetX = p.x;
                    targetY = p.y;
                } else {
                    targetX = G.beacon.x;
                    targetY = G.beacon.y;
                }

                const ang = Math.atan2(targetY - e.y, targetX - e.x);
                e.x += (Math.cos(ang) * e.speed + torchRepel.x);
                e.y += (Math.sin(ang) * e.speed + torchRepel.y);

                // Attack player
                if (distToPlayer < 20 + e.size && e.attackTimer <= 0) {
                    if (p.invincible <= 0) {
                        p.hp -= e.damage;
                        G.noDamageNight = false;
                        p.invincible = 0.5;
                        playSound(100, 0.2, 'sawtooth', 0.15);
                        addNotification(`-${e.damage} HP from ${e.name}!`);
                        if (p.hp <= 0) { p.hp = 0; loseGame('You were consumed by darkness.'); return; }
                    }
                    e.attackTimer = 1;
                }

                // Spike trap damage
                for (const s of G.structures) {
                    if (s.type === 'spike_trap' && s.hp > 0 && s.cooldown <= 0) {
                        const d = Math.hypot(e.x - s.x, e.y - s.y);
                        if (d < s.size + e.size) {
                            e.hp -= s.damage; e.flash = 0.2; s.cooldown = 1;
                            if (e.hp <= 0) { G.totalKills++; addCoins(e.coins); G.totalCoinsEarned += e.coins; addNotification('Spike trap killed ' + e.name + '!'); playSound(150, 0.2, 'square', 0.1); const idx = G.enemies.indexOf(e); if (idx >= 0) G.enemies.splice(idx, 1); }
                        }
                    }
                }

                // Attack beacon
                if (distToBeacon < 25 + e.size && e.attackTimer <= 0) {
                    G.beacon.hp -= e.damage;
                    e.attackTimer = 1;
                    playSound(80, 0.3, 'sawtooth', 0.12);
                    G.beaconGlow = 1;
                    if (G.beacon.hp <= 0) { G.beacon.hp = 0; loseGame('The beacon was destroyed.'); return; }
                }
            }
        }

        // Turret, healing station, watch tower updates
        for (const s of G.structures) {
            if (s.type === 'turret' && s.hp > 0) {
                s.cooldown -= dt;
                if (s.cooldown <= 0) {
                    for (const e of G.enemies) {
                        const d = Math.hypot(e.x - s.x, e.y - s.y);
                        if (d < s.range) {
                            e.hp -= s.damage;
                            e.flash = 0.2;
                            s.cooldown = 1.2;
                            playSound(900, 0.06, 'square', 0.06);
                            // Bullet trail particle
                            G.particles.push({
                                x: s.x, y: s.y, vx: (e.x - s.x) * 0.1, vy: (e.y - s.y) * 0.1,
                                life: 0.2, color: '#ff4444', size: 2
                            });
                            if (e.hp <= 0) {
                                G.totalKills++;
                                addCoins(e.coins);
                                G.totalCoinsEarned += e.coins;
                                const idx = G.enemies.indexOf(e);
                                if (idx >= 0) G.enemies.splice(idx, 1);
                            }
                            break;
                        }
                    }
                }
            }
            if (s.type === 'healing_station' && s.hp > 0) {
                s.cooldown -= dt;
                if (s.cooldown <= 0) {
                    const d = Math.hypot(p.x - s.x, p.y - s.y);
                    if (d < s.range && p.hp < p.maxHp) {
                        p.hp = Math.min(p.maxHp, p.hp + 20 * dt);
                        if (p.hp >= p.maxHp) s.cooldown = 0.5;
                    }
                }
            }
        }
    }

    // Equipment resource pickup
    for (let i = G.resources.length - 1; i >= 0; i--) {
        const r = G.resources[i];
        if (r.type === 'equipment' && G.phase === 'day') {
            const dist = Math.hypot(p.x - r.x, p.y - r.y);
            if (dist < 25) {
                const eq = EQUIPMENT_TYPES[r.equipmentKey];
                if (eq) {
                    eq.effect(p);
                    G.equipment.push(r.equipmentKey);
                    addNotification('Picked up ' + eq.name + '! ' + eq.desc);
                    playSound(800, 0.15, 'sine', 0.12);
                    addCoins(10);
                    G.totalCoinsEarned += 10;
                }
                G.resources.splice(i, 1);
            }
        }
    }

    // Remove dead structures
    G.structures = G.structures.filter(s => s.hp > 0);

    // Update particles
    for (let i = G.particles.length - 1; i >= 0; i--) {
        const p = G.particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= dt * 1.5;
        if (p.life <= 0) G.particles.splice(i, 1);
    }

    // Notifications
    for (let i = G.notifications.length - 1; i >= 0; i--) {
        G.notifications[i].timer -= dt;
        if (G.notifications[i].timer <= 0) G.notifications.splice(i, 1);
    }

    G.beaconGlow = Math.max(0, G.beaconGlow - dt * 2);

    // Check achievements
    checkAchievements();

    // Camera
    G.camera.x = p.x - 400;
    G.camera.y = p.y - 300;
    G.camera.x = Math.max(0, Math.min(WORLD_W - 800, G.camera.x));
    G.camera.y = Math.max(0, Math.min(WORLD_H - 600, G.camera.y));

    updateHUD();
}

function updateHUD() {
    document.getElementById('day-num').textContent = G.day;
    const maxT = G.phase === 'day' ? DAY_DURATION : NIGHT_DURATION;
    const remain = Math.max(0, maxT - G.phaseTime);
    const mins = Math.floor(remain / 60);
    const secs = Math.floor(remain % 60);
    document.getElementById('time-left').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('time-icon').textContent = G.phase === 'day' ? '☀' : '☾';
    document.getElementById('phase-display').textContent = G.phase.toUpperCase();
    document.getElementById('phase-display').style.color = G.phase === 'day' ? '#ff9944' : '#6666ff';

    document.getElementById('beacon-health-fill').style.width = (G.beacon.hp / G.beacon.maxHp * 100) + '%';
    document.getElementById('player-hp').textContent = Math.ceil(G.player.hp);
    document.getElementById('stamina').textContent = Math.ceil(G.player.stamina);
    updateCoinsDisplay();

    document.getElementById('inv-wood').textContent = G.player.inv.wood;
    document.getElementById('inv-food').textContent = G.player.inv.food;
    document.getElementById('inv-scrap').textContent = G.player.inv.scrap;

    // Craft button states
    document.querySelectorAll('.craft-btn').forEach(btn => {
        const item = btn.dataset.craft;
        btn.classList.toggle('disabled', !canCraft(item));
    });
}

// Rendering
function draw() {
    if (G.screen !== 'playing') return;
    const cam = G.camera;

    // Sky color based on phase
    const nightAlpha = G.phase === 'night' ? 1 : Math.min(1, G.phaseTime / DAY_DURATION);
    const dayAlpha = 1 - nightAlpha;

    ctx.fillStyle = `rgb(${Math.floor(10 * dayAlpha + 2 * nightAlpha)}, ${Math.floor(15 * dayAlpha + 2 * nightAlpha)}, ${Math.floor(25 * dayAlpha + 8 * nightAlpha)})`;
    ctx.fillRect(0, 0, 800, 600);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // Grid
    ctx.strokeStyle = '#ffffff08';
    ctx.lineWidth = 1;
    const gs = 80;
    for (let x = 0; x < WORLD_W; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke();
    }
    for (let y = 0; y < WORLD_H; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke();
    }

    // Beacon glow
    const glowR = G.beacon.lightRadius + G.beaconGlow * 50;
    const glow = ctx.createRadialGradient(G.beacon.x, G.beacon.y, 0, G.beacon.x, G.beacon.y, glowR);
    glow.addColorStop(0, G.phase === 'night' ? 'rgba(255,153,68,0.3)' : 'rgba(255,200,100,0.15)');
    glow.addColorStop(0.7, 'rgba(255,153,68,0.05)');
    glow.addColorStop(1, 'rgba(255,153,68,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(G.beacon.x, G.beacon.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Resources (day)
    if (G.phase === 'day') {
        for (const r of G.resources) {
            if (r.type === 'equipment') {
                const eq = EQUIPMENT_TYPES[r.equipmentKey];
                if (!eq) continue;
                ctx.fillStyle = eq.color;
                ctx.shadowColor = eq.color;
                ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(r.x, r.y, 14, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Courier New'; ctx.textAlign = 'center';
                ctx.fillText(eq.name.split(' ')[0], r.x, r.y + 4);
                ctx.shadowBlur = 0;
                continue;
            }
            ctx.fillStyle = RES_COLORS[r.type];
            ctx.shadowColor = RES_COLORS[r.type];
            ctx.shadowBlur = 5;
            const sz = RES_SIZES[r.type];
            if (r.type === 'wood') {
                ctx.fillRect(r.x - sz / 2, r.y - sz, sz, sz * 2);
                ctx.fillRect(r.x - sz, r.y - sz / 2, sz * 2, sz);
            } else if (r.type === 'food') {
                ctx.beginPath(); ctx.arc(r.x, r.y, sz, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.save();
                ctx.translate(r.x, r.y);
                ctx.rotate(r.id);
                ctx.fillRect(-sz, -sz / 2, sz * 2, sz);
                ctx.restore();
            }
            ctx.shadowBlur = 0;
        }
    }

    // Structures
    for (const s of G.structures) {
        if (s.type === 'wall') {
            ctx.fillStyle = '#555566';
            ctx.fillRect(s.x - s.size, s.y - s.size, s.size * 2, s.size * 2);
            ctx.strokeStyle = '#777788';
            ctx.strokeRect(s.x - s.size, s.y - s.size, s.size * 2, s.size * 2);
        } else if (s.type === 'torch') {
            ctx.fillStyle = '#ff9944';
            ctx.shadowColor = '#ff9944';
            ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.fill();
            // Light
            const tg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.lightRadius);
            tg.addColorStop(0, 'rgba(255,153,68,0.15)');
            tg.addColorStop(1, 'rgba(255,153,68,0)');
            ctx.fillStyle = tg;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.lightRadius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        } else if (s.type === 'turret') {
            ctx.fillStyle = '#888899';
            ctx.fillRect(s.x - 10, s.y - 10, 20, 20);
            ctx.fillStyle = '#ff4444';
            ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ff444422';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.range, 0, Math.PI * 2); ctx.stroke();
        } else if (s.type === 'barricade') {
            ctx.fillStyle = '#665544';
            ctx.fillRect(s.x - s.size, s.y - s.size, s.size * 2, s.size * 2);
            ctx.strokeStyle = '#998866'; ctx.lineWidth = 2;
            ctx.strokeRect(s.x - s.size, s.y - s.size, s.size * 2, s.size * 2);
            ctx.lineWidth = 1;
            // X pattern
            ctx.strokeStyle = '#775533';
            ctx.beginPath(); ctx.moveTo(s.x - s.size, s.y - s.size); ctx.lineTo(s.x + s.size, s.y + s.size); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(s.x + s.size, s.y - s.size); ctx.lineTo(s.x - s.size, s.y + s.size); ctx.stroke();
        } else if (s.type === 'spike_trap') {
            ctx.fillStyle = '#555555';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
            for (let si = 0; si < 6; si++) {
                const a = si * Math.PI / 3;
                ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * 5, s.y + Math.sin(a) * 5);
                ctx.lineTo(s.x + Math.cos(a) * s.size, s.y + Math.sin(a) * s.size); ctx.stroke();
            }
        } else if (s.type === 'healing_station') {
            ctx.fillStyle = '#005500';
            ctx.fillRect(s.x - 12, s.y - 12, 24, 24);
            ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 2;
            ctx.strokeRect(s.x - 12, s.y - 12, 24, 24);
            ctx.fillStyle = '#00ff00'; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center';
            ctx.fillText('+', s.x, s.y + 5);
            // Range indicator
            ctx.strokeStyle = '#00ff0022';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.range, 0, Math.PI * 2); ctx.stroke();
        } else if (s.type === 'watch_tower') {
            ctx.fillStyle = '#444466';
            ctx.fillRect(s.x - 8, s.y - 15, 16, 30);
            ctx.fillStyle = '#6666aa';
            ctx.fillRect(s.x - 14, s.y - 20, 28, 8);
            ctx.strokeStyle = '#6666aa33';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.range, 0, Math.PI * 2); ctx.stroke();
        }
    }

    // Beacon
    ctx.fillStyle = '#ff9944';
    ctx.shadowColor = '#ff9944';
    ctx.shadowBlur = 20 + G.beaconGlow * 30;
    ctx.beginPath(); ctx.arc(G.beacon.x, G.beacon.y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Beacon HP bar
    ctx.fillStyle = '#333';
    ctx.fillRect(G.beacon.x - 25, G.beacon.y - 25, 50, 5);
    ctx.fillStyle = '#ff9944';
    ctx.fillRect(G.beacon.x - 25, G.beacon.y - 25, 50 * (G.beacon.hp / G.beacon.maxHp), 5);

    // Enemies
    for (const e of G.enemies) {
        ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = e.isBoss ? 20 : 8;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // Boss crown/icon
        if (e.isBoss) {
            ctx.fillStyle = '#ffcc00'; ctx.font = '16px serif'; ctx.textAlign = 'center';
            ctx.fillText('💀', e.x, e.y - e.size - 5);
            ctx.font = '8px monospace'; ctx.fillText('BOSS', e.x, e.y + 3);
        }
        // HP bar
        if (e.hp < e.maxHp) {
            ctx.fillStyle = '#333';
            ctx.fillRect(e.x - e.size, e.y - e.size - 6, e.size * 2, 3);
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(e.x - e.size, e.y - e.size - 6, e.size * 2 * (e.hp / e.maxHp), 3);
        }
    }

    // Player
    const p = G.player;
    ctx.fillStyle = p.invincible > 0 ? (Math.floor(Date.now() / 100) % 2 ? '#ffffff' : '#00ff88') : '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Direction indicator
    const dirX = (G.keys['KeyD'] || G.keys['ArrowRight'] ? 1 : 0) - (G.keys['KeyA'] || G.keys['ArrowLeft'] ? 1 : 0);
    const dirY = (G.keys['KeyS'] || G.keys['ArrowDown'] ? 1 : 0) - (G.keys['KeyW'] || G.keys['ArrowUp'] ? 1 : 0);
    if (dirX || dirY) {
        const dl = Math.sqrt(dirX * dirX + dirY * dirY);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + dirX / dl * 18, p.y + dirY / dl * 18);
        ctx.stroke();
    }

    // Particles
    for (const pt of G.particles) {
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // Night overlay + weather effects
    if (G.phase === 'night') {
        ctx.fillStyle = 'rgba(0,0,20,0.4)';
        ctx.fillRect(0, 0, 800, 600);
    }
    // Fog overlay
    if (G.weather === 'fog') {
        ctx.fillStyle = 'rgba(100,100,120,0.25)';
        ctx.fillRect(0, 0, 800, 600);
    }
    // Weather particles
    if (G.weather === 'rain' || G.weather === 'storm') {
        ctx.strokeStyle = G.weather === 'storm' ? 'rgba(150,180,255,0.5)' : 'rgba(100,150,255,0.3)';
        ctx.lineWidth = 1;
        weatherParticles.forEach(wp => {
            ctx.beginPath(); ctx.moveTo(wp.x, wp.y); ctx.lineTo(wp.x + wp.vx * 2, wp.y + wp.vy * 2); ctx.stroke();
        });
    }
    // Storm flash
    if (G.weather === 'storm' && Math.random() < 0.005) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(0, 0, 800, 600);
    }

    // Notifications
    let ny = 80;
    for (const n of G.notifications) {
        ctx.globalAlpha = Math.min(1, n.timer);
        ctx.font = '13px Courier New';
        ctx.fillStyle = '#ffcc00';
        ctx.textAlign = 'center';
        ctx.fillText(n.text, 400, ny);
        ny += 20;
    }
    ctx.globalAlpha = 1;

    // Weather display
    if (G.weather !== 'clear') {
        ctx.font = '11px Courier New'; ctx.textAlign = 'right';
        ctx.fillStyle = G.weather === 'rain' ? '#6688ff' : G.weather === 'fog' ? '#aaaaaa' : '#ff8844';
        ctx.fillText('WEATHER: ' + G.weather.toUpperCase(), 790, 20);
    }
    // Equipment display
    if (G.equipment.length > 0) {
        ctx.font = '10px Courier New'; ctx.textAlign = 'left';
        ctx.fillStyle = '#aaaaff'; ctx.fillText('EQUIPMENT:', 10, 530);
        G.equipment.forEach((eq, i) => {
            const eqd = EQUIPMENT_TYPES[eq];
            if (eqd) { ctx.fillStyle = eqd.color; ctx.fillText('● ' + eqd.name, 10, 545 + i * 14); }
        });
    }
    // Achievement display
    const achKeys = Object.keys(ACHIEVEMENTS);
    const doneAchs = achKeys.filter(k => achievementUnlocks[k]);
    if (doneAchs.length > 0) {
        ctx.font = '9px Courier New'; ctx.textAlign = 'right'; ctx.fillStyle = '#ffcc00';
        ctx.fillText('🏆 ' + doneAchs.length + '/' + achKeys.length + ' Achievements', 790, 530);
    }

    // Mobile touch overlay
    if ('ontouchstart' in window) {
        // Joystick base
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.arc(80, 500, 50, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(80, 500, 50, 0, Math.PI * 2); ctx.stroke();
        if (touchJoystick.active) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath(); ctx.arc(80 + touchJoystick.dx * 30, 500 + touchJoystick.dy * 30, 20, 0, Math.PI * 2); ctx.fill();
        }
        // Action buttons
        const abtns = [
            { label: 'ATK', x: 680, y: 480, color: '#ff4444' },
            { label: 'USE', x: 740, y: 520, color: '#44ff44' },
            { label: 'BLD', x: 620, y: 520, color: '#ffaa44' }
        ];
        abtns.forEach(btn => {
            ctx.fillStyle = btn.color + '44';
            ctx.beginPath(); ctx.arc(btn.x, btn.y, 25, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = btn.color; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(btn.x, btn.y, 25, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
            ctx.fillText(btn.label, btn.x, btn.y + 4);
        });
    }

    // Minimap
    drawMinimap();
}

function drawMinimap() {
    const mx = 700, my = 540, mw = 90, mh = 55;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(mx, my, mw, mh);

    const sx = mw / WORLD_W, sy = mh / WORLD_H;

    // Beacon
    ctx.fillStyle = '#ff9944';
    ctx.beginPath();
    ctx.arc(mx + G.beacon.x * sx, my + G.beacon.y * sy, 2, 0, Math.PI * 2);
    ctx.fill();

    // Resources
    if (G.phase === 'day') {
        ctx.fillStyle = '#888';
        for (const r of G.resources) {
            ctx.fillRect(mx + r.x * sx - 0.5, my + r.y * sy - 0.5, 1, 1);
        }
    }

    // Enemies
    ctx.fillStyle = '#ff3366';
    for (const e of G.enemies) {
        ctx.beginPath();
        ctx.arc(mx + e.x * sx, my + e.y * sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Player
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(mx + G.player.x * sx, my + G.player.y * sy, 2, 0, Math.PI * 2);
    ctx.fill();

    // Structures
    for (const s of G.structures) {
        ctx.fillStyle = s.type === 'turret' ? '#ff4444' : s.type === 'torch' ? '#ff9944' : '#888';
        ctx.fillRect(mx + s.x * sx - 1, my + s.y * sy - 1, 2, 2);
    }
}

// Win/Lose
function winGame() {
    G.screen = 'results';
    document.getElementById('results-title').textContent = 'THE LIGHT ENDURES!';
    document.getElementById('results-title').style.color = '#ff9944';
    document.getElementById('results-stats').innerHTML = `
        <div>Days Survived: ${G.day}</div>
        <div>Nights Survived: ${G.nightsSurvived}</div>
        <div>Enemies Killed: ${G.totalKills}</div>
        <div>Resources Gathered: ${G.totalResources}</div>
        <div>Beacon HP Remaining: ${Math.ceil(G.beacon.hp)}/${G.beacon.maxHp}</div>
        <div>Player HP Remaining: ${Math.ceil(G.player.hp)}/${G.player.maxHp}</div>
    `;
    const bonus = 500;
    G.totalCoinsEarned += bonus;
    addCoins(bonus);
    document.getElementById('earned-coins').textContent = `+${G.totalCoinsEarned} TOTAL COINS (+${bonus} victory bonus!)`;
    showScreen('results');
}

function loseGame(msg) {
    G.screen = 'death';
    document.getElementById('death-msg').textContent = msg;
    document.getElementById('death-stats').innerHTML = `
        <div>Days Survived: ${G.day}</div>
        <div>Enemies Killed: ${G.totalKills}</div>
        <div>Coins Earned: ${G.totalCoinsEarned}</div>
    `;
    showScreen('death');
}

// Screen management
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const hud = document.getElementById('hud');
    const inv = document.getElementById('inventory-bar');
    hud.classList.remove('active');
    inv.classList.remove('active');

    if (name === 'menu') {
        document.getElementById('menu-screen').classList.add('active');
        updateCoinsDisplay();
    } else if (name === 'playing') {
        hud.classList.add('active');
        inv.classList.add('active');
    } else if (name === 'results') {
        document.getElementById('results-screen').classList.add('active');
    } else if (name === 'ad') {
        document.getElementById('ad-screen').classList.add('active');
        startAdTimer();
    } else if (name === 'death') {
        document.getElementById('death-screen').classList.add('active');
    }
}

function startAdTimer() {
    let count = 5;
    document.getElementById('ad-countdown').textContent = count;
    const interval = setInterval(() => {
        count--;
        document.getElementById('ad-countdown').textContent = count;
        if (count <= 0) {
            clearInterval(interval);
            showScreen('menu');
        }
    }, 1000);
}

// Input
document.addEventListener('keydown', e => {
    G.keys[e.code] = true;
    if (G.screen !== 'playing') return;
    if (e.code === 'Digit1') craftItem('torch');
    if (e.code === 'Digit2') craftItem('wall');
    if (e.code === 'Digit3') craftItem('turret');
    if (e.code === 'Digit4') craftItem('healthpack');
});
document.addEventListener('keyup', e => { G.keys[e.code] = false; });

// Buttons
document.getElementById('start-btn').onclick = () => {
    initAudio();
    resetGame();
    G.screen = 'playing';
    generateResources();
    showScreen('playing');
};

document.getElementById('continue-btn').onclick = () => showScreen('ad');
document.getElementById('retry-btn').onclick = () => {
    initAudio();
    resetGame();
    G.screen = 'playing';
    generateResources();
    showScreen('playing');
};
document.getElementById('menu-btn').onclick = () => showScreen('menu');

// Craft buttons
document.querySelectorAll('.craft-btn').forEach(btn => {
    btn.onclick = () => {
        if (G.screen === 'playing') craftItem(btn.dataset.craft);
    };
});

// Game loop
let lastTime = 0;
function gameLoop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}

showScreen('menu');
updateCoinsDisplay();
requestAnimationFrame(gameLoop);

// Touch event handlers
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        const rect = canvas.getBoundingClientRect();
        const x = t.clientX - rect.left, y = t.clientY - rect.top;
        if (x < 160 && y > 430) { // Joystick area
            touchJoystick.active = true; touchJoystick.id = t.identifier;
            touchJoystick.startX = x; touchJoystick.startY = y;
            touchJoystick.dx = 0; touchJoystick.dy = 0;
        } else if (x > 580 && y > 450) { // Action buttons
            if (x > 660 && x < 710) touchActions.attack = true;
            else if (x > 710) touchActions.interact = true;
            else if (x < 660) touchActions.build = true;
        }
    }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (t.identifier === touchJoystick.id) {
            const rect = canvas.getBoundingClientRect();
            const x = t.clientX - rect.left, y = t.clientY - rect.top;
            let dx = (x - touchJoystick.startX) / 50;
            let dy = (y - touchJoystick.startY) / 50;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 1) { dx /= len; dy /= len; }
            touchJoystick.dx = dx; touchJoystick.dy = dy;
        }
    }
}, { passive: false });
canvas.addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
        if (t.identifier === touchJoystick.id) {
            touchJoystick.active = false; touchJoystick.dx = 0; touchJoystick.dy = 0;
        }
    }
    touchActions.attack = false; touchActions.interact = false; touchActions.build = false;
});

// Gamepad button handling
setInterval(() => {
    if (!gamepadConnected || G.screen !== 'playing') return;
    pollGamepad();
    if (gamepadBtns.y && G.player.attackCooldown <= 0) craftItem('torch');
    if (gamepadBtns.b && G.player.attackCooldown <= 0) craftItem('wall');
    if (gamepadBtns.x && G.player.attackCooldown <= 0) craftItem('turret');
    if (gamepadBtns.rb && G.player.attackCooldown <= 0) craftItem('healthpack');
    if (gamepadBtns.lb && G.player.attackCooldown <= 0) craftItem('barricade');
}, 200);
