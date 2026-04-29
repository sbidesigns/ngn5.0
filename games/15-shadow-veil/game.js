// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('shadow-veil'); } catch(e) {}

// ========================================
// NGN4 - SHADOW VEIL (Game 15)
// Stealth Action Game
// ========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function initAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
function playSound(f, d, t = 'square', v = 0.06) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
}

function getRewards() { try { return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, games_played: 0 }; } catch { return { coins: 0, games_played: 0 }; } }
function saveRewards(r) { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); }
function addCoins(n) { const r = getRewards(); r.coins += n; saveRewards(r); updateCoinsUI(); }
function updateCoinsUI() {
    const c = getRewards().coins;
    ['coins-hud', 'menu-coins-val'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = c; });
}

// Load progress
let maxLevelUnlocked = 1;
let gadgetInventory = { coins: 3, noisemakers: 2, takedowns: 2 };
try {
    const s = JSON.parse(localStorage.getItem('ngn4_shadowveil'));
    if (s) {
        maxLevelUnlocked = s.maxLevel || 1;
        gadgetInventory = s.gadgets || gadgetInventory;
    }
} catch {}
function saveProgress() {
    localStorage.setItem('ngn4_shadowveil', JSON.stringify({ maxLevel: maxLevelUnlocked, gadgets: gadgetInventory }));
}

// ========================================
// LEVEL DEFINITIONS
// ========================================
const LEVELS = [
    { // Level 1
        name: 'Training Grounds',
        width: 800, height: 600,
        playerStart: { x: 50, y: 300 },
        extraction: { x: 750, y: 300 },
        objective: 'Reach extraction point',
        walls: [
            // Outer walls
            { x: 0, y: 0, w: 800, h: 20 },
            { x: 0, y: 580, w: 800, h: 20 },
            { x: 0, y: 0, w: 20, h: 600 },
            { x: 780, y: 0, w: 20, h: 600 },
            // Internal
            { x: 300, y: 150, w: 20, h: 200 },
            { x: 500, y: 250, w: 20, h: 200 }
        ],
        guards: [
            { x: 400, y: 200, patrol: [{ x: 350, y: 200 }, { x: 350, y: 350 }, { x: 480, y: 350 }, { x: 480, y: 200 }], speed: 1.2, sightAngle: 90, sightRange: 120 }
        ],
        hidingSpots: [
            { x: 200, y: 100, w: 40, h: 40, type: 'shadow' },
            { x: 600, y: 400, w: 40, h: 40, type: 'shadow' }
        ],
        cameras: [],
        keycards: [],
        lockedDoors: [],
        secondaryObjectives: []
    },
    { // Level 2
        name: 'Server Room',
        width: 800, height: 600,
        playerStart: { x: 50, y: 50 },
        extraction: { x: 750, y: 550 },
        objective: 'Steal data from terminal',
        walls: [
            { x: 0, y: 0, w: 800, h: 20 }, { x: 0, y: 580, w: 800, h: 20 },
            { x: 0, y: 0, w: 20, h: 600 }, { x: 780, y: 0, w: 20, h: 600 },
            { x: 200, y: 0, w: 20, h: 350 },
            { x: 400, y: 250, w: 20, h: 350 },
            { x: 600, y: 0, w: 20, h: 300 },
            { x: 300, y: 200, w: 100, h: 20 },
            { x: 500, y: 400, w: 100, h: 20 }
        ],
        guards: [
            { x: 300, y: 100, patrol: [{ x: 100, y: 100 }, { x: 100, y: 300 }, { x: 280, y: 300 }, { x: 280, y: 100 }], speed: 1.3, sightAngle: 90, sightRange: 130 },
            { x: 500, y: 400, patrol: [{ x: 420, y: 400 }, { x: 420, y: 550 }, { x: 700, y: 550 }, { x: 700, y: 400 }], speed: 1.2, sightAngle: 90, sightRange: 120 }
        ],
        hidingSpots: [
            { x: 150, y: 400, w: 40, h: 40, type: 'shadow' },
            { x: 350, y: 500, w: 40, h: 40, type: 'vent' },
            { x: 700, y: 150, w: 40, h: 40, type: 'shadow' }
        ],
        cameras: [{ x: 500, y: 50, angle: 180, range: 200, sweepSpeed: 30 }],
        keycards: [],
        lockedDoors: [],
        secondaryObjectives: [{ x: 300, y: 250, type: 'terminal', text: 'Download data' }]
    },
    { // Level 3
        name: 'Research Wing',
        width: 800, height: 600,
        playerStart: { x: 50, y: 300 },
        extraction: { x: 750, y: 300 },
        objective: 'Reach extraction (requires keycard)',
        walls: [
            { x: 0, y: 0, w: 800, h: 20 }, { x: 0, y: 580, w: 800, h: 20 },
            { x: 0, y: 0, w: 20, h: 600 }, { x: 780, y: 0, w: 20, h: 600 },
            { x: 250, y: 0, w: 20, h: 250 },
            { x: 250, y: 350, w: 20, h: 250 },
            { x: 550, y: 0, w: 20, h: 200 },
            { x: 550, y: 300, w: 20, h: 300 },
            { x: 350, y: 200, w: 200, h: 20 },
            { x: 350, y: 400, w: 200, h: 20 }
        ],
        guards: [
            { x: 400, y: 150, patrol: [{ x: 270, y: 150 }, { x: 540, y: 150 }], speed: 1.4, sightAngle: 100, sightRange: 140 },
            { x: 400, y: 450, patrol: [{ x: 270, y: 450 }, { x: 540, y: 450 }], speed: 1.3, sightAngle: 90, sightRange: 130 },
            { x: 650, y: 300, patrol: [{ x: 570, y: 200 }, { x: 570, y: 500 }], speed: 1.5, sightAngle: 90, sightRange: 150 }
        ],
        hidingSpots: [
            { x: 150, y: 100, w: 40, h: 40, type: 'locker' },
            { x: 150, y: 450, w: 40, h: 40, type: 'locker' },
            { x: 450, y: 300, w: 50, h: 30, type: 'vent' },
            { x: 680, y: 500, w: 40, h: 40, type: 'shadow' }
        ],
        cameras: [{ x: 400, y: 30, angle: 0, range: 250, sweepSpeed: 40 }],
        keycards: [{ x: 150, y: 300 }],
        lockedDoors: [{ x: 650, y: 280, w: 20, h: 40, keycardRequired: true }],
        secondaryObjectives: [{ x: 450, y: 500, type: 'document', text: 'Steal documents' }]
    }
];

// Generate levels 4-10 procedurally
for (let i = 3; i < 10; i++) {
    const guardCount = 3 + i;
    const cameraCount = Math.floor(i / 2);
    const keycardCount = i > 4 ? Math.floor(i / 3) : 0;
    const hidingCount = 3 + i;
    const secondaryCount = Math.floor(i / 2);

    const walls = [
        { x: 0, y: 0, w: 800, h: 20 }, { x: 0, y: 580, w: 800, h: 20 },
        { x: 0, y: 0, w: 20, h: 600 }, { x: 780, y: 0, w: 20, h: 600 }
    ];

    // Add internal walls
    const wallCount = 5 + i * 2;
    for (let w = 0; w < wallCount; w++) {
        const isVertical = Math.random() < 0.5;
        if (isVertical) {
            walls.push({ x: 100 + Math.random() * 650, y: 0, w: 15 + Math.random() * 10, h: 150 + Math.random() * 300 });
        } else {
            walls.push({ x: 50 + Math.random() * 600, y: 50 + Math.random() * 450, w: 150 + Math.random() * 250, h: 15 + Math.random() * 10 });
        }
    }

    const guards = [];
    for (let g = 0; g < guardCount; g++) {
        const cx = 100 + Math.random() * 600;
        const cy = 100 + Math.random() * 400;
        const patrol = [];
        const points = 3 + Math.floor(Math.random() * 3);
        for (let p = 0; p < points; p++) {
            patrol.push({ x: cx + (Math.random() - 0.5) * 200, y: cy + (Math.random() - 0.5) * 200 });
        }
        guards.push({
            x: cx, y: cy, patrol,
            speed: 1.0 + i * 0.12 + Math.random() * 0.3,
            sightAngle: 80 + Math.random() * 30,
            sightRange: 120 + i * 8
        });
    }

    const hidingSpots = [];
    for (let h = 0; h < hidingCount; h++) {
        const types = ['shadow', 'locker', 'vent'];
        hidingSpots.push({
            x: 50 + Math.random() * 700,
            y: 50 + Math.random() * 500,
            w: 30 + Math.random() * 20,
            h: 30 + Math.random() * 20,
            type: types[Math.floor(Math.random() * 3)]
        });
    }

    const cameras = [];
    for (let c = 0; c < cameraCount; c++) {
        cameras.push({
            x: 50 + Math.random() * 700,
            y: 30 + Math.random() * 40,
            angle: Math.random() * 360,
            range: 150 + i * 10,
            sweepSpeed: 25 + Math.random() * 20
        });
    }

    const keycards = [];
    for (let k = 0; k < keycardCount; k++) {
        keycards.push({ x: 50 + Math.random() * 700, y: 50 + Math.random() * 500 });
    }

    const lockedDoors = [];
    for (let d = 0; d < keycardCount; d++) {
        lockedDoors.push({ x: 300 + d * 150, y: 250 + Math.random() * 100, w: 20, h: 50, keycardRequired: true });
    }

    const secondaryObjectives = [];
    const secTypes = ['terminal', 'document', 'prisoner'];
    for (let s = 0; s < secondaryCount; s++) {
        secondaryObjectives.push({
            x: 100 + Math.random() * 600,
            y: 100 + Math.random() * 400,
            type: secTypes[s % 3],
            text: s % 3 === 0 ? 'Download data' : s % 3 === 1 ? 'Steal documents' : 'Rescue prisoner'
        });
    }

    LEVELS.push({
        name: `Sector ${String.fromCharCode(65 + i)}`,
        width: 800, height: 600,
        playerStart: { x: 50, y: 50 },
        extraction: { x: 750, y: 550 },
        objective: i < 6 ? 'Reach extraction' : 'Complete objectives and extract',
        walls, guards, hidingSpots, cameras, keycards, lockedDoors, secondaryObjectives
    });
}

// ========================================
// GAME STATE
// ========================================
let G = {
    screen: 'menu',
    level: 0,
    player: { x: 0, y: 0, speed: 2.5, radius: 10, hidden: false, detection: 0, alerts: 0 },
    guards: [],
    cameras: [],
    hidingSpots: [],
    keycards: [],
    lockedDoors: [],
    secondaryObjectives: [],
    walls: [],
    extraction: { x: 0, y: 0 },
    gadgets: { coins: 0, noisemakers: 0, takedowns: 0 },
    keycardsHeld: 0,
    detection: 0,
    detected: false,
    totalDetections: 0,
    objectivesComplete: [],
    timeStarted: 0,
    timeElapsed: 0,
    noiseSources: [],
    particles: [],
    notifications: [],
    keys: {},
    showGuardPaths: false
};

function resetLevel(lvlIdx) {
    const lvl = LEVELS[lvlIdx];
    G.level = lvlIdx;
    G.screen = 'playing';
    G.detected = false;
    G.detection = 0;
    G.totalDetections = 0;
    G.objectivesComplete = [];
    G.timeStarted = Date.now();
    G.timeElapsed = 0;
    G.noiseSources = [];
    G.particles = [];
    G.notifications = [];
    G.keycardsHeld = 0;
    G.showGuardPaths = false;

    G.player = { x: lvl.playerStart.x, y: lvl.playerStart.y, speed: 2.5, radius: 10, hidden: false };
    G.walls = lvl.walls;
    G.extraction = lvl.extraction;
    G.gadgets = { coins: gadgetInventory.coins, noisemakers: gadgetInventory.noisemakers, takedowns: gadgetInventory.takedowns };

    // Deep copy guards
    G.guards = lvl.guards.map(g => ({
        x: g.x, y: g.y, patrol: g.patrol.map(p => ({ ...p })),
        speed: g.speed, sightAngle: g.sightAngle, sightRange: g.sightRange,
        state: 'patrol', // patrol, investigate, alert
        patrolIdx: 0, direction: 1,
        facing: 0, investigateTimer: 0, alertTimer: 0,
        lastKnownX: 0, lastKnownY: 0, knockedOut: false
    }));

    G.cameras = lvl.cameras.map(c => ({
        x: c.x, y: c.y, angle: c.angle, range: c.range,
        sweepSpeed: c.sweepSpeed, currentAngle: c.angle, sweepDir: 1
    }));

    G.hidingSpots = lvl.hidingSpots.map(h => ({ ...h, occupied: false }));
    G.keycards = lvl.keycards.map(k => ({ ...k, collected: false }));
    G.lockedDoors = lvl.lockedDoors.map(d => ({ ...d, open: false }));
    G.secondaryObjectives = lvl.secondaryObjectives.map(o => ({ ...o, completed: false }));

    updateHUD();
}

// ========================================
// COLLISION
// ========================================
function rectContains(rect, px, py) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
    const nearX = Math.max(rx, Math.min(cx, rx + rw));
    const nearY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nearX, dy = cy - nearY;
    return (dx * dx + dy * dy) < (cr * cr);
}

function lineRectIntersect(x1, y1, x2, y2, rx, ry, rw, rh) {
    // Simple check
    return rectContains({ x: rx, y: ry, w: rw, h: rh }, x1, y1) ||
           rectContains({ x: rx, y: ry, w: rw, h: rh }, x2, y2);
}

function canMoveTo(x, y, radius) {
    // Check walls
    for (const w of G.walls) {
        if (circleRectCollision(x, y, radius, w.x, w.y, w.w, w.h)) return false;
    }
    // Check locked doors
    for (const d of G.lockedDoors) {
        if (!d.open && circleRectCollision(x, y, radius, d.x, d.y, d.w, d.h)) return false;
    }
    return true;
}

// ========================================
// GUARD AI
// ========================================
function dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
}

function angleDiff(a, b) {
    let d = ((b - a + 180) % 360 + 360) % 360 - 180;
    return Math.abs(d);
}

function canSee(guard, tx, ty) {
    const d = dist(guard.x, guard.y, tx, ty);
    if (d > guard.sightRange) return false;
    const angle = angleBetween(guard.x, guard.y, tx, ty);
    if (angleDiff(guard.facing, angle) > guard.sightAngle / 2) return false;
    return true;
}

function updateGuard(guard, dt) {
    if (guard.knockedOut) return;

    switch (guard.state) {
        case 'patrol': {
            const target = guard.patrol[guard.patrolIdx];
            const d = dist(guard.x, guard.y, target.x, target.y);
            guard.facing = angleBetween(guard.x, guard.y, target.x, target.y);

            if (d < 5) {
                guard.patrolIdx += guard.direction;
                if (guard.patrolIdx >= guard.patrol.length) { guard.patrolIdx = guard.patrol.length - 2; guard.direction = -1; }
                if (guard.patrolIdx < 0) { guard.patrolIdx = 1; guard.direction = 1; }
            } else {
                const angle = Math.atan2(target.y - guard.y, target.x - guard.x);
                guard.x += Math.cos(angle) * guard.speed;
                guard.y += Math.sin(angle) * guard.speed;
            }

            // Check if sees player
            if (!G.player.hidden && canSee(guard, G.player.x, G.player.y)) {
                guard.state = 'alert';
                guard.alertTimer = 0;
                G.detection += 40;
                G.totalDetections++;
                addNotification('GUARD SPOTTED YOU!');
                playSound(800, 0.2, 'sawtooth', 0.12);
            }

            // Check noise
            for (const noise of G.noiseSources) {
                if (dist(guard.x, guard.y, noise.x, noise.y) < 150) {
                    guard.state = 'investigate';
                    guard.lastKnownX = noise.x;
                    guard.lastKnownY = noise.y;
                    guard.investigateTimer = 5;
                }
            }
            break;
        }
        case 'investigate': {
            guard.investigateTimer -= dt;
            const d = dist(guard.x, guard.y, guard.lastKnownX, guard.lastKnownY);
            guard.facing = angleBetween(guard.x, guard.y, guard.lastKnownX, guard.lastKnownY);

            if (d > 10) {
                const angle = Math.atan2(guard.lastKnownY - guard.y, guard.lastKnownX - guard.x);
                guard.x += Math.cos(angle) * guard.speed * 1.3;
                guard.y += Math.sin(angle) * guard.speed * 1.3;
            }

            if (guard.investigateTimer <= 0) {
                guard.state = 'patrol';
            }

            // Still can see player
            if (!G.player.hidden && canSee(guard, G.player.x, G.player.y)) {
                guard.state = 'alert';
                guard.alertTimer = 0;
                G.detection += 40;
                G.totalDetections++;
            }
            break;
        }
        case 'alert': {
            guard.alertTimer += dt;
            // Chase player
            if (!G.player.hidden) {
                guard.facing = angleBetween(guard.x, guard.y, G.player.x, G.player.y);
                const d = dist(guard.x, guard.y, G.player.x, G.player.y);
                if (d > 30) {
                    const angle = Math.atan2(G.player.y - guard.y, G.player.x - guard.x);
                    guard.x += Math.cos(angle) * guard.speed * 1.5;
                    guard.y += Math.sin(angle) * guard.speed * 1.5;
                }
                if (d < 25) {
                    G.detected = true;
                }
            } else {
                guard.state = 'investigate';
                guard.lastKnownX = G.player.x;
                guard.lastKnownY = G.player.y;
                guard.investigateTimer = 3;
            }
            break;
        }
    }
}

// Camera update
function updateCamera(cam, dt) {
    cam.currentAngle += cam.sweepSpeed * cam.sweepDir * dt;
    if (cam.currentAngle > cam.angle + 45 || cam.currentAngle < cam.angle - 45) {
        cam.sweepDir *= -1;
    }

    if (!G.player.hidden) {
        const d = dist(cam.x, cam.y, G.player.x, G.player.y);
        if (d < cam.range) {
            const angle = angleBetween(cam.x, cam.y, G.player.x, G.player.y);
            if (angleDiff(cam.currentAngle, angle) < 25) {
                G.detection += 30 * dt;
                if (G.detection >= 100) {
                    G.detected = true;
                    if (G.totalDetections === 0) G.totalDetections++;
                }
            }
        }
    }
}

// ========================================
// ACTIONS
// ========================================
function addNotification(text) {
    G.notifications.push({ text, timer: 2.5 });
}

function throwCoin() {
    if (G.gadgets.coins <= 0) return;
    G.gadgets.coins--;
    gadgetInventory.coins = G.gadgets.coins;
    // Throw in facing direction
    const angle = Math.atan2(G.player.y - 300, G.player.x - 400); // Simplified direction
    const tx = G.player.x + Math.cos(angle) * 100 + (Math.random() - 0.5) * 40;
    const ty = G.player.y + Math.sin(angle) * 100 + (Math.random() - 0.5) * 40;
    G.noiseSources.push({ x: tx, y: ty, timer: 3 });
    addNotification('Coin thrown!');
    playSound(2000, 0.05, 'sine', 0.06);
    // Particle
    for (let i = 0; i < 5; i++) {
        G.particles.push({ x: G.player.x, y: G.player.y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 0.5, color: '#ffcc00' });
    }
}

function throwNoisemaker() {
    if (G.gadgets.noisemakers <= 0) return;
    G.gadgets.noisemakers--;
    gadgetInventory.noisemakers = G.gadgets.noisemakers;
    const tx = G.player.x + (Math.random() - 0.5) * 200;
    const ty = G.player.y + (Math.random() - 0.5) * 200;
    G.noiseSources.push({ x: tx, y: ty, timer: 5 });
    addNotification('Noisemaker deployed!');
    playSound(1000, 0.1, 'sine', 0.08);
}

function performTakedown() {
    if (G.gadgets.takedowns <= 0) return;
    G.gadgets.takedowns--;
    gadgetInventory.takedowns = G.gadgets.takedowns;

    for (const guard of G.guards) {
        if (guard.knockedOut) continue;
        const d = dist(G.player.x, G.player.y, guard.x, guard.y);
        if (d < 35) {
            guard.knockedOut = true;
            guard.state = 'patrol';
            addNotification('Guard neutralized!');
            playSound(300, 0.15, 'sine', 0.1);
            playSound(200, 0.2, 'sine', 0.08);
            for (let i = 0; i < 8; i++) {
                G.particles.push({ x: guard.x, y: guard.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 0.8, color: '#ff4444' });
            }
            saveProgress();
            return;
        }
    }
    addNotification('No guard in range!');
}

function tryHide() {
    G.player.hidden = false;
    for (const spot of G.hidingSpots) {
        const cx = spot.x + spot.w / 2;
        const cy = spot.y + spot.h / 2;
        if (dist(G.player.x, G.player.y, cx, cy) < 40) {
            G.player.hidden = true;
            G.player.x = cx;
            G.player.y = cy;
            addNotification(`Hiding in ${spot.type}...`);
            playSound(400, 0.1, 'sine', 0.06);
            return;
        }
    }
}

function interact() {
    const p = G.player;

    // Check keycards
    for (const k of G.keycards) {
        if (!k.collected && dist(p.x, p.y, k.x, k.y) < 30) {
            k.collected = true;
            G.keycardsHeld++;
            addNotification('Keycard acquired!');
            playSound(600, 0.1, 'sine', 0.08);
            updateHUD();
            return;
        }
    }

    // Check locked doors
    for (const d of G.lockedDoors) {
        if (!d.open && dist(p.x, p.y, d.x + d.w / 2, d.y + d.h / 2) < 40) {
            if (G.keycardsHeld > 0) {
                d.open = true;
                G.keycardsHeld--;
                addNotification('Door unlocked!');
                playSound(500, 0.1, 'sine', 0.08);
                playSound(700, 0.1, 'sine', 0.06);
            } else {
                addNotification('Need keycard!');
            }
            return;
        }
    }

    // Check secondary objectives
    for (const obj of G.secondaryObjectives) {
        if (!obj.completed && dist(p.x, p.y, obj.x, obj.y) < 30) {
            obj.completed = true;
            G.objectivesComplete.push(obj.text);
            addNotification(`${obj.text} - Complete!`);
            playSound(800, 0.1, 'sine', 0.1);
            updateHUD();
            return;
        }
    }

    // Check extraction
    if (dist(p.x, p.y, G.extraction.x, G.extraction.y) < 30) {
        const allSecondaryDone = G.secondaryObjectives.every(o => o.completed);
        if (G.secondaryObjectives.length === 0 || allSecondaryDone) {
            completeLevel();
        } else {
            addNotification('Complete all objectives first!');
        }
        return;
    }

    // Try hide if near hiding spot
    tryHide();
}

function completeLevel() {
    G.screen = 'levelcomplete';
    G.timeElapsed = (Date.now() - G.timeStarted) / 1000;

    // Star rating
    let stars = 1;
    if (G.totalDetections <= 1) stars = 2;
    if (G.totalDetections === 0) stars = 3;

    // Coins
    let coins = 50;
    if (stars === 3) coins += 25;
    coins += G.objectivesComplete.length * 10;
    addCoins(coins);

    if (G.level + 1 > maxLevelUnlocked && G.level + 1 <= 10) {
        maxLevelUnlocked = G.level + 1;
        saveProgress();
    }

    document.getElementById('star-display').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    document.getElementById('level-stats').innerHTML = `
        <div>Time: ${Math.floor(G.timeElapsed)}s</div>
        <div>Detections: ${G.totalDetections}</div>
        <div>Objectives: ${G.objectivesComplete.length}/${G.secondaryObjectives.length}</div>
    `;
    document.getElementById('earned-coins').textContent = `+${coins} coins${stars === 3 ? ' (Zero detection bonus!)' : ''}`;
    showScreen('levelcomplete');
}

// ========================================
// UPDATE & RENDER
// ========================================
function update(dt) {
    if (G.screen !== 'playing') return;
    const p = G.player;
    const k = G.keys;

    // Player movement
    if (!p.hidden) {
        let dx = 0, dy = 0;
        if (k['KeyW'] || k['ArrowUp']) dy -= 1;
        if (k['KeyS'] || k['ArrowDown']) dy += 1;
        if (k['KeyA'] || k['ArrowLeft']) dx -= 1;
        if (k['KeyD'] || k['ArrowRight']) dx += 1;
        if (dx || dy) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len; dy /= len;
            const nx = p.x + dx * p.speed;
            const ny = p.y + dy * p.speed;
            if (canMoveTo(nx, p.y, p.radius)) p.x = nx;
            if (canMoveTo(p.x, ny, p.radius)) p.y = ny;
        }
    } else {
        // Exit hiding on move
        if (k['KeyW'] || k['KeyS'] || k['KeyA'] || k['KeyD'] ||
            k['ArrowUp'] || k['ArrowDown'] || k['ArrowLeft'] || k['ArrowRight']) {
            p.hidden = false;
        }
    }

    // Update guards
    for (const guard of G.guards) updateGuard(guard, dt);

    // Update cameras
    for (const cam of G.cameras) updateCamera(cam, dt);

    // Update noise sources
    for (let i = G.noiseSources.length - 1; i >= 0; i--) {
        G.noiseSources[i].timer -= dt;
        if (G.noiseSources[i].timer <= 0) G.noiseSources.splice(i, 1);
    }

    // Detection decay
    if (!G.player.hidden) {
        const nearGuard = G.guards.some(g => !g.knockedOut && canSee(g, p.x, p.y));
        const nearCam = G.cameras.some(c => {
            const d = dist(c.x, c.y, p.x, p.y);
            return d < c.range && angleDiff(c.currentAngle, angleBetween(c.x, c.y, p.x, p.y)) < 25;
        });
        if (!nearGuard && !nearCam) {
            G.detection = Math.max(0, G.detection - 15 * dt);
        }
    } else {
        G.detection = Math.max(0, G.detection - 25 * dt);
    }

    // Check game over
    if (G.detection >= 100) {
        G.detected = true;
    }
    if (G.detected) {
        G.screen = 'gameover';
        showScreen('gameover');
        return;
    }

    // Update particles
    for (let i = G.particles.length - 1; i >= 0; i--) {
        const pt = G.particles[i];
        pt.x += pt.vx; pt.y += pt.vy;
        pt.life -= dt * 2;
        if (pt.life <= 0) G.particles.splice(i, 1);
    }

    // Notifications
    for (let i = G.notifications.length - 1; i >= 0; i--) {
        G.notifications[i].timer -= dt;
        if (G.notifications[i].timer <= 0) G.notifications.splice(i, 1);
    }

    updateHUD();
}

function updateHUD() {
    document.getElementById('level-num').textContent = G.level + 1;
    document.getElementById('objective-text').textContent = `OBJECTIVE: ${LEVELS[G.level].objective}`;
    document.getElementById('detection-fill').style.width = G.detection + '%';

    const alertEl = document.getElementById('alert-status');
    if (G.detection < 30) { alertEl.textContent = 'STEALTH'; alertEl.style.color = '#44ddaa'; }
    else if (G.detection < 70) { alertEl.textContent = 'SUSPICIOUS'; alertEl.style.color = '#ffcc00'; }
    else { alertEl.textContent = 'ALERT'; alertEl.style.color = '#ff3366'; }

    document.getElementById('coin-count').textContent = G.gadgets.coins;
    document.getElementById('noise-count').textContent = G.gadgets.noisemakers;
    document.getElementById('take-count').textContent = G.gadgets.takedowns;
    document.getElementById('keycard-count').textContent = G.keycardsHeld;
    const gc = G.gadgets.coins + G.gadgets.noisemakers + G.gadgets.takedowns;
    document.getElementById('gadget-count').textContent = gc;
    updateCoinsUI();
}

function render() {
    if (G.screen !== 'playing') return;
    const p = G.player;

    // Background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, 800, 600);

    // Grid
    ctx.strokeStyle = '#111122';
    for (let x = 0; x < 800; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke(); }
    for (let y = 0; y < 600; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke(); }

    // Walls
    ctx.fillStyle = '#2a2a3e';
    ctx.strokeStyle = '#3a3a5e';
    for (const w of G.walls) {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeRect(w.x, w.y, w.w, w.h);
    }

    // Locked doors
    for (const d of G.lockedDoors) {
        if (!d.open) {
            ctx.fillStyle = '#664400';
            ctx.fillRect(d.x, d.y, d.w, d.h);
            ctx.strokeStyle = '#ffcc00';
            ctx.strokeRect(d.x, d.y, d.w, d.h);
        }
    }

    // Hiding spots
    for (const h of G.hidingSpots) {
        const colors = { shadow: '#0a0a1a', locker: '#2a2a3a', vent: '#1a2a2a' };
        ctx.fillStyle = colors[h.type] || '#1a1a2e';
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.strokeStyle = '#333';
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(h.x, h.y, h.w, h.h);
        ctx.setLineDash([]);
        ctx.fillStyle = '#555';
        ctx.font = '9px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(h.type.toUpperCase(), h.x + h.w / 2, h.y + h.h / 2 + 3);
    }

    // Keycards
    for (const k of G.keycards) {
        if (k.collected) continue;
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(k.x, k.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.font = '8px Courier New';
        ctx.fillText('K', k.x - 3, k.y + 3);
    }

    // Secondary objectives
    for (const obj of G.secondaryObjectives) {
        const colors = { terminal: '#4488ff', document: '#ffcc00', prisoner: '#66ff66' };
        ctx.fillStyle = obj.completed ? '#333' : (colors[obj.type] || '#888');
        ctx.shadowColor = colors[obj.type] || '#888';
        ctx.shadowBlur = obj.completed ? 0 : 8;
        ctx.beginPath(); ctx.arc(obj.x, obj.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.font = '8px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(obj.completed ? '✓' : '?', obj.x - 3, obj.y + 3);
    }

    // Extraction point
    ctx.strokeStyle = '#44ddaa';
    ctx.shadowColor = '#44ddaa';
    ctx.shadowBlur = 10 + Math.sin(Date.now() / 300) * 5;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(G.extraction.x, G.extraction.y, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#44ddaa22';
    ctx.beginPath(); ctx.arc(G.extraction.x, G.extraction.y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.fillStyle = '#44ddaa';
    ctx.font = '9px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', G.extraction.x, G.extraction.y + 28);

    // Camera vision cones
    for (const cam of G.cameras) {
        const rad = cam.currentAngle * Math.PI / 180;
        const halfFov = 25 * Math.PI / 180;
        ctx.fillStyle = 'rgba(255,50,50,0.08)';
        ctx.beginPath();
        ctx.moveTo(cam.x, cam.y);
        ctx.arc(cam.x, cam.y, cam.range, rad - halfFov, rad + halfFov);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ff3366';
        ctx.beginPath(); ctx.arc(cam.x, cam.y, 5, 0, Math.PI * 2); ctx.fill();
    }

    // Guard sight cones and guards
    for (const guard of G.guards) {
        if (guard.knockedOut) {
            ctx.fillStyle = '#444';
            ctx.beginPath(); ctx.arc(guard.x, guard.y, 8, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ff4444';
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.arc(guard.x, guard.y, 8, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            continue;
        }

        // Vision cone
        const rad = guard.facing * Math.PI / 180;
        const halfFov = (guard.sightAngle / 2) * Math.PI / 180;
        const coneColor = guard.state === 'alert' ? 'rgba(255,50,50,0.15)' :
                          guard.state === 'investigate' ? 'rgba(255,200,50,0.1)' :
                          'rgba(255,255,100,0.05)';
        ctx.fillStyle = coneColor;
        ctx.beginPath();
        ctx.moveTo(guard.x, guard.y);
        ctx.arc(guard.x, guard.y, guard.sightRange, rad - halfFov, rad + halfFov);
        ctx.closePath();
        ctx.fill();

        // Patrol path (if showGuardPaths)
        if (G.showGuardPaths) {
            ctx.strokeStyle = '#44ddaa33';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            guard.patrol.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Guard body
        const guardColor = guard.state === 'alert' ? '#ff3366' : guard.state === 'investigate' ? '#ffcc00' : '#8844aa';
        ctx.fillStyle = guardColor;
        ctx.shadowColor = guardColor;
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(guard.x, guard.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Direction indicator
        ctx.strokeStyle = guardColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(guard.x, guard.y);
        ctx.lineTo(guard.x + Math.cos(rad) * 15, guard.y + Math.sin(rad) * 15);
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    // Noise sources
    for (const n of G.noiseSources) {
        ctx.fillStyle = '#ffcc0044';
        ctx.beginPath(); ctx.arc(n.x, n.y, 15 + Math.sin(Date.now() / 200) * 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcc00';
        ctx.font = '8px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('!', n.x, n.y + 3);
    }

    // Player
    if (!p.hidden) {
        ctx.fillStyle = '#44ddaa';
        ctx.shadowColor = '#44ddaa';
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = '#44ddaa33';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
    }

    // Particles
    for (const pt of G.particles) {
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 2 * pt.life, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Notifications
    let ny = 70;
    for (const n of G.notifications) {
        ctx.globalAlpha = Math.min(1, n.timer);
        ctx.font = '12px Courier New';
        ctx.fillStyle = '#44ddaa';
        ctx.textAlign = 'center';
        ctx.fillText(n.text, 400, ny);
        ny += 18;
    }
    ctx.globalAlpha = 1;

    // Level info overlay
    ctx.fillStyle = '#ffffff11';
    ctx.font = '11px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(`${LEVELS[G.level].name} - Level ${G.level + 1}`, 25, 565);
}

// ========================================
// SCREEN MANAGEMENT
// ========================================
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const hud = document.getElementById('hud');
    const inv = document.getElementById('inventory-bar');
    hud.classList.remove('active');
    inv.classList.remove('active');

    if (name === 'menu') {
        document.getElementById('menu-screen').classList.add('active');
        updateCoinsUI();
        renderGadgetShop();
    } else if (name === 'playing') {
        hud.classList.add('active');
        inv.classList.add('active');
    } else if (name === 'levelcomplete') {
        document.getElementById('level-complete').classList.add('active');
    } else if (name === 'gameover') {
        document.getElementById('game-over').classList.add('active');
    } else if (name === 'ad') {
        document.getElementById('ad-screen').classList.add('active');
        startAdTimer();
    }
}

function renderGadgetShop() {
    const el = document.getElementById('shop-items');
    const items = [
        { name: 'Coins x3', cost: 30, action: () => { gadgetInventory.coins += 3; saveProgress(); } },
        { name: 'Noisemaker x2', cost: 50, action: () => { gadgetInventory.noisemakers += 2; saveProgress(); } },
        { name: 'Takedown x2', cost: 60, action: () => { gadgetInventory.takedowns += 2; saveProgress(); } },
        { name: 'Full Kit', cost: 120, action: () => { gadgetInventory.coins += 3; gadgetInventory.noisemakers += 2; gadgetInventory.takedowns += 2; saveProgress(); } }
    ];
    el.innerHTML = items.map(item => {
        return `<div class="shop-item"><span>${item.name}</span> <span class="price">${item.cost}c</span></div>`;
    }).join('');
    el.querySelectorAll('.shop-item').forEach((el, i) => {
        el.onclick = () => {
            const r = getRewards();
            if (r.coins >= items[i].cost) {
                r.coins -= items[i].cost;
                saveRewards(r);
                items[i].action();
                updateCoinsUI();
                renderGadgetShop();
                playSound(600, 0.08, 'sine', 0.08);
            }
        };
    });
}

function startAdTimer() {
    let count = 5;
    document.getElementById('ad-countdown').textContent = count;
    const reward = document.getElementById('ad-reward-text');
    reward.textContent = 'Reward: All guard patrol routes revealed!';
    G.showGuardPaths = true;
    const interval = setInterval(() => {
        count--;
        document.getElementById('ad-countdown').textContent = count;
        if (count <= 0) {
            clearInterval(interval);
            showScreen('menu');
        }
    }, 1000);
}

// ========================================
// INPUT
// ========================================
document.addEventListener('keydown', e => {
    G.keys[e.code] = true;
    if (G.screen !== 'playing') return;
    initAudio();
    if (e.code === 'KeyE') interact();
    if (e.code === 'KeyT') performTakedown();
    if (e.code === 'Digit1') throwCoin();
    if (e.code === 'Digit2') throwNoisemaker();
    if (e.code === 'Escape') {
        G.player.hidden = false;
    }
});
document.addEventListener('keyup', e => { G.keys[e.code] = false; });

// ========================================
// BUTTONS
// ========================================
document.getElementById('start-btn').onclick = () => {
    initAudio();
    resetLevel(maxLevelUnlocked - 1);
    showScreen('playing');
};
document.getElementById('next-btn').onclick = () => {
    if (G.level + 1 < 10) {
        // Show ad between levels
        const showAd = (G.level + 1) % 3 === 0;
        if (showAd) {
            showScreen('ad');
            setTimeout(() => {
                resetLevel(G.level + 1);
                showScreen('playing');
            }, 5500);
        } else {
            resetLevel(G.level + 1);
            showScreen('playing');
        }
    } else {
        // Victory - all 10 levels complete
        const victoryBonus = 200;
        addCoins(victoryBonus);
        G.screen = 'victory';
        showScreen('menu');
        document.getElementById('go-menu-btn').click();
        setTimeout(() => {
            if (typeof NGN4Achievements !== 'undefined') {
                NGN4Achievements.unlock('shadow_master');
            }
        }, 100);
    }
};
document.getElementById('retry-btn').onclick = () => {
    initAudio();
    resetLevel(G.level);
    showScreen('playing');
};
document.getElementById('menu-btn').onclick = () => showScreen('menu');
document.getElementById('go-menu-btn').onclick = () => showScreen('menu');

// Inventory bar clicks
document.getElementById('slot-coin').onclick = () => { if (G.screen === 'playing') throwCoin(); };
document.getElementById('slot-noisemaker').onclick = () => { if (G.screen === 'playing') throwNoisemaker(); };
document.getElementById('slot-takedown').onclick = () => { if (G.screen === 'playing') performTakedown(); };

// ========================================
// GAME LOOP
// ========================================
let lastTime = 0;
function gameLoop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
}

showScreen('menu');
requestAnimationFrame(gameLoop);
