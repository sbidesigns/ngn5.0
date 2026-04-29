// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('depths-unknown'); } catch(e) {}

// ========================================
// NGN4 - DEPTHS UNKNOWN (Game 13)
// Dungeon Crawler Roguelike
// ========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 680;
canvas.height = 600;

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function initAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
function playSound(f, d, t = 'square', v = 0.08) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
}

function getRewards() { try { return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, games_played: 0 }; } catch { return { coins: 0, games_played: 0 }; } }
function saveRewards(r) { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); }
function addCoins(n) { const r = getRewards(); r.coins += n; saveRewards(r); }
function updateCoins() {
    const c = getRewards().coins;
    const el1 = document.getElementById('coins');
    const el2 = document.getElementById('menu-coins-val');
    if (el1) el1.textContent = G.player ? G.player.coins : c;
    if (el2) el2.textContent = c;
}

// Classes
const CLASSES = {
    warrior: { name: 'Warrior', hp: 40, atk: 6, def: 5, cost: 0, desc: 'High HP & DEF. Melee master.' },
    rogue: { name: 'Rogue', hp: 28, atk: 7, def: 2, cost: 200, desc: 'High ATK. Critical hits.' },
    mage: { name: 'Mage', hp: 25, atk: 9, def: 1, cost: 300, desc: 'Magic damage. Low HP.' },
    cleric: { name: 'Cleric', hp: 35, atk: 4, def: 4, cost: 400, desc: 'Balanced. Self-heals.' }
};

// Load unlocked classes
let unlockedClasses = ['warrior'];
try {
    const s = JSON.parse(localStorage.getItem('ngn4_depths'));
    if (s && s.classes) unlockedClasses = s.classes;
} catch {}

function saveClassUnlocks() {
    localStorage.setItem('ngn4_depths', JSON.stringify({ classes: unlockedClasses }));
}

// Items
const ITEMS = {
    // Weapons
    iron_sword: { name: 'Iron Sword', type: 'weapon', atk: 3, cost: 30, desc: '+3 ATK' },
    steel_sword: { name: 'Steel Sword', type: 'weapon', atk: 6, cost: 60, desc: '+6 ATK' },
    shadow_blade: { name: 'Shadow Blade', type: 'weapon', atk: 10, cost: 120, desc: '+10 ATK' },
    // Armor
    leather_armor: { name: 'Leather Armor', type: 'armor', def: 2, cost: 25, desc: '+2 DEF' },
    chain_mail: { name: 'Chain Mail', type: 'armor', def: 4, cost: 55, desc: '+4 DEF' },
    plate_armor: { name: 'Plate Armor', type: 'armor', def: 7, cost: 110, desc: '+7 DEF' },
    // Potions
    health_potion: { name: 'Health Potion', type: 'potion', heal: 15, cost: 15, desc: 'Heal 15 HP', consumable: true },
    big_health_potion: { name: 'Big Health Pot', type: 'potion', heal: 35, cost: 35, desc: 'Heal 35 HP', consumable: true },
    // Scrolls
    fire_scroll: { name: 'Fire Scroll', type: 'scroll', damage: 20, cost: 25, desc: '20 damage to all visible enemies', consumable: true },
    teleport_scroll: { name: 'Teleport Scroll', type: 'scroll', cost: 30, desc: 'Teleport to random room', consumable: true },
    map_scroll: { name: 'Map Scroll', type: 'scroll', cost: 20, desc: 'Reveal entire floor', consumable: true },
    // Rings
    ring_power: { name: 'Ring of Power', type: 'ring', atk: 3, cost: 80, desc: '+3 ATK' },
    ring_protection: { name: 'Ring of Protection', type: 'ring', def: 3, cost: 80, desc: '+3 DEF' },
    ring_hunger: { name: 'Ring of Sustenance', type: 'ring', cost: 100, desc: 'No hunger drain' }
};

const ITEM_KEYS = Object.keys(ITEMS);

// Enemy types
const ENEMY_TYPES = [
    { name: 'Rat', symbol: 'r', color: '#888', hp: 8, atk: 2, def: 0, xp: 5, coins: 2 },
    { name: 'Bat', symbol: 'b', color: '#666', hp: 6, atk: 3, def: 0, xp: 6, coins: 2 },
    { name: 'Goblin', symbol: 'g', color: '#4a4', hp: 15, atk: 4, def: 1, xp: 10, coins: 5 },
    { name: 'Skeleton', symbol: 's', color: '#ccc', hp: 20, atk: 5, def: 3, xp: 15, coins: 8 },
    { name: 'Spider', symbol: 'S', color: '#844', hp: 12, atk: 7, def: 1, xp: 12, coins: 6 },
    { name: 'Orc', symbol: 'O', color: '#484', hp: 30, atk: 6, def: 4, xp: 20, coins: 12 },
    { name: 'Wraith', symbol: 'W', color: '#88f', hp: 25, atk: 8, def: 2, xp: 25, coins: 15 },
    { name: 'Troll', symbol: 'T', color: '#864', hp: 45, atk: 7, def: 5, xp: 35, coins: 20 }
];

const BOSS = { name: 'Heart Guardian', symbol: 'H', color: '#ff0', hp: 150, atk: 12, def: 8, xp: 100, coins: 100 };

// Tile types
const TILE = { WALL: 0, FLOOR: 1, DOOR: 2, STAIRS: 3, CHEST: 4, SHOP: 5 };

// Map constants
const MAP_W = 60, MAP_H = 45;
const TILE_SIZE = 14;
const VIEW_W = Math.ceil(680 / TILE_SIZE);
const VIEW_H = Math.ceil(600 / TILE_SIZE);

// Game State
let G = {
    screen: 'menu',
    selectedClass: 'warrior',
    player: null,
    map: null,
    rooms: [],
    revealed: null,
    visible: null,
    enemies: [],
    items_on_floor: [],
    floor: 1,
    log: [],
    totalKills: 0,
    totalCoins: 0,
    turns: 0
};

function addLog(text, type = 'info') {
    G.log.unshift({ text, type, id: Date.now() + Math.random() });
    if (G.log.length > 50) G.log.pop();
    updateLogUI();
}

function updateLogUI() {
    const el = document.getElementById('log-content');
    el.innerHTML = G.log.slice(0, 20).map(l => `<div class="log-${l.type}">${l.text}</div>`).join('');
}

// Dungeon generation
function generateDungeon(floor) {
    const map = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(TILE.WALL));
    const revealed = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
    const visible = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));

    const rooms = [];
    const numRooms = 8 + Math.floor(floor * 1.2);

    for (let attempts = 0; attempts < 200 && rooms.length < numRooms; attempts++) {
        const w = 5 + Math.floor(Math.random() * 6);
        const h = 4 + Math.floor(Math.random() * 5);
        const x = 2 + Math.floor(Math.random() * (MAP_W - w - 4));
        const y = 2 + Math.floor(Math.random() * (MAP_H - h - 4));

        let overlap = false;
        for (const r of rooms) {
            if (x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y) {
                overlap = true; break;
            }
        }
        if (!overlap) {
            rooms.push({ x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) });
            for (let ry = y; ry < y + h; ry++)
                for (let rx = x; rx < x + w; rx++)
                    map[ry][rx] = TILE.FLOOR;
        }
    }

    // Corridors between rooms
    for (let i = 0; i < rooms.length - 1; i++) {
        const a = rooms[i], b = rooms[i + 1];
        let cx = a.cx, cy = a.cy;
        while (cx !== b.cx) {
            map[cy][cx] = map[cy][cx] === TILE.WALL ? TILE.FLOOR : map[cy][cx];
            cx += cx < b.cx ? 1 : -1;
        }
        while (cy !== b.cy) {
            map[cy][cx] = map[cy][cx] === TILE.WALL ? TILE.FLOOR : map[cy][cx];
            cy += cy < b.cy ? 1 : -1;
        }
    }

    // Place stairs in last room
    if (floor < 10) {
        const lastRoom = rooms[rooms.length - 1];
        map[lastRoom.cy][lastRoom.cx] = TILE.STAIRS;
    } else {
        // Boss floor - stairs are the heart
        const lastRoom = rooms[rooms.length - 1];
        map[lastRoom.cy][lastRoom.cx] = TILE.STAIRS;
    }

    // Place shop on every 3rd floor
    if (floor % 3 === 0 && floor > 0) {
        const shopRoom = rooms[Math.floor(rooms.length / 2)];
        map[shopRoom.cy][shopRoom.cx] = TILE.SHOP;
    }

    // Place chests
    const chestCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < chestCount; i++) {
        const room = rooms[1 + Math.floor(Math.random() * (rooms.length - 2))];
        const cx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
        const cy = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
        if (map[cy][cx] === TILE.FLOOR) map[cy][cx] = TILE.CHEST;
    }

    // Place enemies
    const enemies = [];
    const enemyCount = 6 + floor * 3;
    for (let i = 0; i < enemyCount; i++) {
        const room = rooms[1 + Math.floor(Math.random() * (rooms.length - 1))];
        const ex = room.x + Math.floor(Math.random() * room.w);
        const ey = room.y + Math.floor(Math.random() * room.h);
        if (map[ey][ex] === TILE.FLOOR) {
            const typeIdx = Math.min(Math.floor(Math.random() * (2 + Math.floor(floor / 2))), ENEMY_TYPES.length - 1);
            const template = ENEMY_TYPES[typeIdx];
            const scale = 1 + (floor - 1) * 0.12;
            enemies.push({
                ...template,
                x: ex, y: ey,
                hp: Math.ceil(template.hp * scale),
                maxHp: Math.ceil(template.hp * scale),
                atk: Math.ceil(template.atk * scale),
                def: Math.ceil(template.def * scale),
                coins: Math.ceil(template.coins * scale),
                xp: Math.ceil(template.xp * scale)
            });
        }
    }

    // Boss on floor 10
    if (floor === 10) {
        const lastRoom = rooms[rooms.length - 1];
        const bx = lastRoom.cx + 2, by = lastRoom.cy;
        enemies.push({
            ...BOSS, x: bx, y: by, hp: BOSS.hp, maxHp: BOSS.hp,
            isBoss: true
        });
    }

    return { map, rooms, revealed, visible, enemies, items_on_floor: [] };
}

function createPlayer(classId) {
    const cls = CLASSES[classId];
    return {
        x: 0, y: 0,
        hp: cls.hp, maxHp: cls.hp,
        atk: cls.atk, def: cls.def,
        level: 1, xp: 0, xpNext: 20,
        class: classId, className: cls.name,
        coins: 0, hunger: 100,
        inventory: [],
        equipped: { weapon: null, armor: null, ring: null },
        hasSustenance: false
    };
}

function initGame() {
    initAudio();
    const r = getRewards(); r.games_played = (r.games_played || 0) + 1; saveRewards(r);
    G.screen = 'playing';
    G.floor = 1;
    G.log = [];
    G.totalKills = 0;
    G.totalCoins = 0;
    G.turns = 0;
    G.player = createPlayer(G.selectedClass);
    generateFloor();
    showScreen('playing');
    addLog('You descend into the Depths...', 'info');
}

function generateFloor() {
    const result = generateDungeon(G.floor);
    G.map = result.map;
    G.rooms = result.rooms;
    G.revealed = result.revealed;
    G.visible = result.visible;
    G.enemies = result.enemies;
    G.items_on_floor = result.items_on_floor;

    // Place player in first room
    const firstRoom = G.rooms[0];
    G.player.x = firstRoom.cx;
    G.player.y = firstRoom.cy;
    G.map[firstRoom.cy][firstRoom.cx] = TILE.FLOOR;

    updateVisibility();
    updateStatsUI();
}

// FOV / Visibility
function updateVisibility() {
    const p = G.player;
    // Reset visible
    for (let y = 0; y < MAP_H; y++)
        for (let x = 0; x < MAP_W; x++)
            G.visible[y][x] = false;

    // Simple raycast FOV
    const radius = 7;
    for (let angle = 0; angle < 360; angle += 1) {
        const rad = angle * Math.PI / 180;
        const dx = Math.cos(rad);
        const dy = Math.sin(rad);
        for (let d = 0; d <= radius; d += 0.5) {
            const tx = Math.round(p.x + dx * d);
            const ty = Math.round(p.y + dy * d);
            if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) break;
            G.visible[ty][tx] = true;
            G.revealed[ty][tx] = true;
            if (G.map[ty][tx] === TILE.WALL) break;
        }
    }
}

// Movement and turn
function movePlayer(dx, dy) {
    if (G.screen !== 'playing') return;
    const p = G.player;
    const nx = p.x + dx;
    const ny = p.y + dy;

    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;

    const tile = G.map[ny][nx];

    // Check for enemy
    const enemy = G.enemies.find(e => e.x === nx && e.y === ny);
    if (enemy) {
        attackEnemy(enemy);
        endTurn();
        return;
    }

    if (tile === TILE.WALL) return;

    p.x = nx;
    p.y = ny;

    // Check tile effects
    if (tile === TILE.STAIRS) {
        if (G.floor >= 10) {
            // Check if boss is dead
            const boss = G.enemies.find(e => e.isBoss);
            if (!boss) {
                winGame();
                return;
            }
        } else {
            G.floor++;
            addLog(`Descending to floor ${G.floor}...`, 'info');
            generateFloor();
            if (G.floor === 6) {
                showAdScreen();
            }
            return;
        }
    } else if (tile === TILE.CHEST) {
        G.map[ny][nx] = TILE.FLOOR;
        openChest(nx, ny);
    } else if (tile === TILE.SHOP) {
        openShop();
        return; // Don't end turn
    }

    endTurn();
}

function attackEnemy(enemy) {
    const p = G.player;
    const weaponAtk = p.equipped.weapon ? ITEMS[p.equipped.weapon].atk || 0 : 0;
    const ringAtk = p.equipped.ring && ITEMS[p.equipped.ring].atk ? ITEMS[p.equipped.ring].atk : 0;

    let atk = p.atk + weaponAtk + ringAtk;
    let crit = false;
    if (p.class === 'rogue' && Math.random() < 0.2) { atk *= 2; crit = true; }

    const dmg = Math.max(1, atk - enemy.def);
    enemy.hp -= dmg;

    playSound(crit ? 800 : 400, 0.1, 'sawtooth', 0.1);
    if (crit) playSound(1200, 0.15, 'sine', 0.08);

    addLog(`You hit ${enemy.name} for ${dmg}${crit ? ' CRIT!' : ''} dmg`, 'damage');

    if (enemy.hp <= 0) {
        killEnemy(enemy);
    }
}

function killEnemy(enemy) {
    const idx = G.enemies.indexOf(enemy);
    if (idx >= 0) G.enemies.splice(idx, 1);
    G.totalKills++;

    // Drop coins
    const coinDrop = enemy.coins + Math.floor(Math.random() * enemy.coins * 0.5);
    G.player.coins += coinDrop;
    G.totalCoins += coinDrop;
    addCoins(coinDrop);

    // XP
    gainXP(enemy.xp);

    addLog(`${enemy.name} defeated! +${coinDrop} coins, +${enemy.xp} XP`, 'item');

    if (enemy.isBoss) {
        addLog('The Heart Guardian falls! The Heart of the Mountain is yours!', 'item');
        if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.unlock('boss_slayer');
    }

    playSound(200, 0.2, 'square', 0.08);
}

function gainXP(amount) {
    const p = G.player;
    p.xp += amount;
    while (p.xp >= p.xpNext) {
        p.xp -= p.xpNext;
        p.level++;
        p.xpNext = Math.floor(p.xpNext * 1.5);
        p.maxHp += 5;
        p.hp = Math.min(p.maxHp, p.hp + 10);
        p.atk += 1;
        p.def += 1;
        addLog(`LEVEL UP! Now level ${p.level}. HP+5, ATK+1, DEF+1`, 'heal');
        playSound(500, 0.1, 'sine', 0.1);
        playSound(700, 0.1, 'sine', 0.1);
        playSound(900, 0.15, 'sine', 0.08);
    }
}

function openChest(x, y) {
    // Random loot
    const roll = Math.random();
    if (roll < 0.3) {
        // Potion
        const key = Math.random() < 0.5 ? 'health_potion' : 'big_health_potion';
        G.items_on_floor.push({ x, y, itemKey: key });
        addLog(`Found: ${ITEMS[key].name}!`, 'item');
    } else if (roll < 0.5) {
        const key = Math.random() < 0.5 ? 'fire_scroll' : 'teleport_scroll';
        G.items_on_floor.push({ x, y, itemKey: key });
        addLog(`Found: ${ITEMS[key].name}!`, 'item');
    } else if (roll < 0.65) {
        const weapons = ['iron_sword', 'steel_sword', 'shadow_blade'];
        const key = weapons[Math.floor(Math.random() * weapons.length)];
        G.items_on_floor.push({ x, y, itemKey: key });
        addLog(`Found: ${ITEMS[key].name}!`, 'item');
    } else if (roll < 0.8) {
        const armors = ['leather_armor', 'chain_mail', 'plate_armor'];
        const key = armors[Math.floor(Math.random() * armors.length)];
        G.items_on_floor.push({ x, y, itemKey: key });
        addLog(`Found: ${ITEMS[key].name}!`, 'item');
    } else {
        const coins = 10 + Math.floor(Math.random() * 20 * G.floor);
        G.player.coins += coins;
        G.totalCoins += coins;
        addCoins(coins);
        addLog(`Found ${coins} coins!`, 'item');
    }
    playSound(600, 0.08, 'sine', 0.1);
    playSound(800, 0.08, 'sine', 0.08);
}

function endTurn() {
    G.turns++;

    // Hunger
    if (!G.player.hasSustenance) {
        G.player.hunger -= 0.5;
        if (G.player.hunger <= 0) {
            G.player.hunger = 0;
            G.player.hp -= 2;
            if (G.turns % 5 === 0) addLog('Starving! -2 HP', 'damage');
        }
        if (G.turns % 20 === 0 && G.player.hunger < 30) addLog('Getting hungry...', 'info');
    }

    // Enemy movement
    const p = G.player;
    for (const e of G.enemies) {
        const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
        if (dist <= 8 && G.visible[e.y][e.x]) {
            // Chase player
            let dx = 0, dy = 0;
            if (Math.abs(e.x - p.x) > Math.abs(e.y - p.y)) {
                dx = e.x < p.x ? 1 : -1;
            } else {
                dy = e.y < p.y ? 1 : -1;
            }

            const nx = e.x + dx, ny = e.y + dy;
            if (nx === p.x && ny === p.y) {
                // Attack player
                const armorDef = p.equipped.armor ? ITEMS[p.equipped.armor].def || 0 : 0;
                const ringDef = p.equipped.ring && ITEMS[p.equipped.ring].def ? ITEMS[p.equipped.ring].def : 0;
                const totalDef = p.def + armorDef + ringDef;
                const dmg = Math.max(1, e.atk - totalDef);
                p.hp -= dmg;
                addLog(`${e.name} hits you for ${dmg} dmg!`, 'enemy');
                playSound(150, 0.15, 'sawtooth', 0.12);

                if (p.hp <= 0) {
                    p.hp = 0;
                    loseGame(`${e.name} defeated you on floor ${G.floor}.`);
                    return;
                }
            } else if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H &&
                       G.map[ny][nx] !== TILE.WALL &&
                       !G.enemies.find(o => o !== e && o.x === nx && o.y === ny)) {
                e.x = nx;
                e.y = ny;
            }
        } else if (dist <= 5) {
            // Random movement
            const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
            const d = dirs[Math.floor(Math.random() * dirs.length)];
            const nx = e.x + d[0], ny = e.y + d[1];
            if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H &&
                G.map[ny][nx] !== TILE.WALL &&
                nx !== p.x && ny !== p.y &&
                !G.enemies.find(o => o !== e && o.x === nx && o.y === ny)) {
                e.x = nx; e.y = ny;
            }
        }
    }

    // Cleric self-heal
    if (p.class === 'cleric' && p.hp < p.maxHp && G.turns % 8 === 0) {
        const heal = 2 + p.level;
        p.hp = Math.min(p.maxHp, p.hp + heal);
        if (heal > 0) addLog(`Divine healing: +${heal} HP`, 'heal');
    }

    updateVisibility();
    updateStatsUI();

    // Pick up items on floor
    for (let i = G.items_on_floor.length - 1; i >= 0; i--) {
        const item = G.items_on_floor[i];
        if (item.x === p.x && item.y === p.y) {
            G.player.inventory.push(item.itemKey);
            addLog(`Picked up ${ITEMS[item.itemKey].name}`, 'item');
            playSound(500, 0.06, 'sine', 0.08);
            G.items_on_floor.splice(i, 1);
        }
    }
}

// Inventory management
function useItem(idx) {
    const p = G.player;
    if (idx >= p.inventory.length) return;
    const key = p.inventory[idx];
    const item = ITEMS[key];

    if (item.type === 'weapon') {
        if (p.equipped.weapon) p.inventory.push(p.equipped.weapon);
        p.equipped.weapon = key;
        p.inventory.splice(idx, 1);
        addLog(`Equipped ${item.name}`, 'item');
    } else if (item.type === 'armor') {
        if (p.equipped.armor) p.inventory.push(p.equipped.armor);
        p.equipped.armor = key;
        p.inventory.splice(idx, 1);
        addLog(`Equipped ${item.name}`, 'item');
    } else if (item.type === 'ring') {
        if (p.equipped.ring) p.inventory.push(p.equipped.ring);
        p.equipped.ring = key;
        p.inventory.splice(idx, 1);
        addLog(`Equipped ${item.name}`, 'item');
        if (key === 'ring_hunger') p.hasSustenance = true;
        else p.hasSustenance = false;
    } else if (item.type === 'potion') {
        const heal = item.heal + Math.floor(p.level * 0.5);
        p.hp = Math.min(p.maxHp, p.hp + heal);
        p.inventory.splice(idx, 1);
        addLog(`Used ${item.name}: +${heal} HP`, 'heal');
        playSound(600, 0.1, 'sine', 0.1);
        endTurn();
    } else if (item.type === 'scroll') {
        if (key === 'fire_scroll') {
            let count = 0;
            for (const e of G.visibleEnemies()) {
                e.hp -= item.damage;
                count++;
                if (e.hp <= 0) killEnemy(e);
            }
            addLog(`Fire scroll burns ${count} enemies for ${item.damage}!`, 'damage');
            playSound(100, 0.2, 'sawtooth', 0.1);
        } else if (key === 'teleport_scroll') {
            const room = G.rooms[Math.floor(Math.random() * G.rooms.length)];
            p.x = room.cx;
            p.y = room.cy;
            addLog('Teleported to a random room!', 'info');
            playSound(800, 0.1, 'sine', 0.1);
        } else if (key === 'map_scroll') {
            for (let y = 0; y < MAP_H; y++)
                for (let x = 0; x < MAP_W; x++)
                    G.revealed[y][x] = true;
            addLog('Map revealed!', 'info');
        }
        p.inventory.splice(idx, 1);
        endTurn();
    }
    updateInventoryUI();
    updateStatsUI();
}

// Extend game object for convenience
G.visibleEnemies = function() {
    return G.enemies.filter(e => G.visible[e.y] && G.visible[e.y][e.x]);
};

// Shop
function openShop() {
    G.screen = 'shop';
    const shopItems = document.getElementById('shop-items');
    shopItems.innerHTML = '';

    // Food item for hunger
    const foods = [
        { key: 'bread', name: 'Bread', cost: 10, desc: '+20 hunger' },
        { key: 'ration', name: 'Ration', cost: 20, desc: '+50 hunger' }
    ];

    const shopStock = [];
    // Random selection of items
    for (let i = 0; i < 6; i++) {
        const key = ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)];
        const item = ITEMS[key];
        shopStock.push({ key, ...item });
    }
    // Add food
    shopStock.push(...foods);

    shopStock.forEach(si => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `<h5>${si.name}</h5><p>${si.desc}</p><div class="price">${si.cost} coins</div>`;
        div.onclick = () => {
            if (G.player.coins >= si.cost) {
                G.player.coins -= si.cost;
                if (si.key === 'bread') {
                    G.player.hunger = Math.min(100, G.player.hunger + 20);
                    addLog('Ate bread: +20 hunger', 'heal');
                } else if (si.key === 'ration') {
                    G.player.hunger = Math.min(100, G.player.hunger + 50);
                    addLog('Ate ration: +50 hunger', 'heal');
                } else {
                    G.player.inventory.push(si.key);
                    addLog(`Bought ${si.name}`, 'item');
                }
                playSound(700, 0.08, 'sine', 0.08);
                updateStatsUI();
                updateInventoryUI();
                openShop(); // Refresh
            }
        };
        shopItems.appendChild(div);
    });

    document.getElementById('shop-screen').classList.add('active');
}

function closeShop() {
    G.screen = 'playing';
    document.getElementById('shop-screen').classList.remove('active');
}

// UI Updates
function updateStatsUI() {
    const p = G.player;
    document.getElementById('class-name').textContent = p.className.toUpperCase();
    document.getElementById('hp').textContent = p.hp;
    document.getElementById('max-hp').textContent = p.maxHp;
    document.getElementById('level').textContent = p.level;
    document.getElementById('xp').textContent = p.xp;
    document.getElementById('xp-next').textContent = p.xpNext;
    const wAtk = p.equipped.weapon && ITEMS[p.equipped.weapon] ? ITEMS[p.equipped.weapon].atk || 0 : 0;
    const rAtk = p.equipped.ring && ITEMS[p.equipped.ring] ? ITEMS[p.equipped.ring].atk || 0 : 0;
    const aDef = p.equipped.armor && ITEMS[p.equipped.armor] ? ITEMS[p.equipped.armor].def || 0 : 0;
    const rDef = p.equipped.ring && ITEMS[p.equipped.ring] ? ITEMS[p.equipped.ring].def || 0 : 0;
    document.getElementById('atk').textContent = p.atk + wAtk + rAtk;
    document.getElementById('def').textContent = p.def + aDef + rDef;
    document.getElementById('floor-num').textContent = G.floor;
    document.getElementById('coins').textContent = p.coins;
    document.getElementById('hunger').textContent = Math.ceil(p.hunger);
    document.getElementById('hunger').style.color = p.hunger < 20 ? '#ff3366' : p.hunger < 50 ? '#ffcc00' : '#66ff66';
    updateCoins();
}

function updateInventoryUI() {
    const el = document.getElementById('inv-slots');
    const p = G.player;
    let html = '';
    p.inventory.forEach((key, i) => {
        const item = ITEMS[key];
        const equipped = (p.equipped.weapon === key || p.equipped.armor === key || p.equipped.ring === key);
        html += `<div class="inv-item ${equipped ? 'equipped' : ''}" onclick="useItem(${i})" title="${item.desc}">${item.name}</div>`;
    });
    el.innerHTML = html;
}

// Rendering
const COLORS = {
    [TILE.WALL]: '#1a1a2e',
    [TILE.FLOOR]: '#2a2a3e',
    [TILE.DOOR]: '#4a3a2a',
    [TILE.STAIRS]: '#aa66ff',
    [TILE.CHEST]: '#ffcc00',
    [TILE.SHOP]: '#66ccff'
};

function render() {
    if (G.screen !== 'playing') return;
    const p = G.player;

    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, 680, 600);

    // Camera centered on player
    const camX = Math.max(0, Math.min(MAP_W - VIEW_W, p.x - Math.floor(VIEW_W / 2)));
    const camY = Math.max(0, Math.min(MAP_H - VIEW_H, p.y - Math.floor(VIEW_H / 2)));

    for (let vy = 0; vy < VIEW_H; vy++) {
        for (let vx = 0; vx < VIEW_W; vx++) {
            const mx = camX + vx;
            const my = camY + vy;
            if (mx >= MAP_W || my >= MAP_H) continue;

            const sx = vx * TILE_SIZE;
            const sy = vy * TILE_SIZE;

            if (G.visible[my][mx]) {
                ctx.fillStyle = COLORS[G.map[my][mx]] || '#2a2a3e';
                ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

                // Tile details
                if (G.map[my][mx] === TILE.STAIRS) {
                    ctx.fillStyle = '#aa66ff';
                    ctx.font = `${TILE_SIZE - 2}px Courier New`;
                    ctx.textAlign = 'center';
                    ctx.fillText(G.floor >= 10 ? '♦' : '▼', sx + TILE_SIZE / 2, sy + TILE_SIZE - 2);
                } else if (G.map[my][mx] === TILE.CHEST) {
                    ctx.fillStyle = '#ffcc00';
                    ctx.font = `${TILE_SIZE - 2}px Courier New`;
                    ctx.textAlign = 'center';
                    ctx.fillText('$', sx + TILE_SIZE / 2, sy + TILE_SIZE - 2);
                } else if (G.map[my][mx] === TILE.SHOP) {
                    ctx.fillStyle = '#66ccff';
                    ctx.font = `${TILE_SIZE - 2}px Courier New`;
                    ctx.textAlign = 'center';
                    ctx.fillText('S', sx + TILE_SIZE / 2, sy + TILE_SIZE - 2);
                }
            } else if (G.revealed[my][mx]) {
                ctx.fillStyle = '#0f0f18';
                ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Draw items on floor
    for (const item of G.items_on_floor) {
        if (!G.visible[item.y] || !G.visible[item.y][item.x]) continue;
        const sx = (item.x - camX) * TILE_SIZE;
        const sy = (item.y - camY) * TILE_SIZE;
        if (sx < -TILE_SIZE || sx > 680 || sy < -TILE_SIZE || sy > 600) continue;
        ctx.fillStyle = '#ffcc00';
        ctx.font = `${TILE_SIZE - 4}px Courier New`;
        ctx.textAlign = 'center';
        ctx.fillText('·', sx + TILE_SIZE / 2, sy + TILE_SIZE - 3);
    }

    // Draw enemies
    for (const e of G.enemies) {
        if (!G.visible[e.y] || !G.visible[e.y][e.x]) continue;
        const sx = (e.x - camX) * TILE_SIZE;
        const sy = (e.y - camY) * TILE_SIZE;
        if (sx < -TILE_SIZE || sx > 680 || sy < -TILE_SIZE || sy > 600) continue;
        ctx.fillStyle = e.color;
        ctx.font = `bold ${TILE_SIZE - 1}px Courier New`;
        ctx.textAlign = 'center';
        ctx.fillText(e.symbol, sx + TILE_SIZE / 2, sy + TILE_SIZE - 2);
        // HP bar
        if (e.hp < e.maxHp) {
            const bw = TILE_SIZE - 2;
            ctx.fillStyle = '#333';
            ctx.fillRect(sx + 1, sy - 3, bw, 2);
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(sx + 1, sy - 3, bw * (e.hp / e.maxHp), 2);
        }
    }

    // Draw player
    const px = (p.x - camX) * TILE_SIZE;
    const py = (p.y - camY) * TILE_SIZE;
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;
    ctx.font = `bold ${TILE_SIZE}px Courier New`;
    ctx.textAlign = 'center';
    ctx.fillText('@', px + TILE_SIZE / 2, py + TILE_SIZE - 1);
    ctx.shadowBlur = 0;

    // Floor indicator
    ctx.fillStyle = '#aa66ff';
    ctx.font = '14px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(`Floor ${G.floor}/10  Turn ${G.turns}`, 10, 20);

    // Hunger bar
    const hbw = 100;
    ctx.fillStyle = '#333';
    ctx.fillRect(10, 30, hbw, 6);
    ctx.fillStyle = p.hunger < 20 ? '#ff3366' : p.hunger < 50 ? '#ffcc00' : '#66ff66';
    ctx.fillRect(10, 30, hbw * (p.hunger / 100), 6);
    ctx.fillStyle = '#888';
    ctx.font = '10px Courier New';
    ctx.fillText('HUNGER', 115, 37);

    updateInventoryUI();
}

// Win/Lose
function winGame() {
    if (typeof NGN4Achievements !== 'undefined') {
        NGN4Achievements.unlock('depths_conqueror');
        if (G.player.level >= 10) NGN4Achievements.unlock('max_level');
        if (G.totalKills >= 50) NGN4Achievements.unlock('slayer');
    }
    const bonus = 500;
    const carryPct = Math.floor(G.player.coins * 0.3);
    const total = G.totalCoins + bonus + carryPct;
    addCoins(bonus + carryPct);

    // Unlock all classes
    ['warrior', 'rogue', 'mage', 'cleric'].forEach(c => {
        if (!unlockedClasses.includes(c)) unlockedClasses.push(c);
    });
    saveClassUnlocks();

    G.screen = 'win';
    document.getElementById('win-stats').innerHTML = `
        <div>Floors Cleared: ${G.floor}</div>
        <div>Level Reached: ${G.player.level}</div>
        <div>Enemies Slain: ${G.totalKills}</div>
        <div>Turns Taken: ${G.turns}</div>
        <div>Coins Earned: ${G.totalCoins}</div>
    `;
    document.getElementById('earned-coins').textContent = `+${total} COINS (+${bonus} victory + ${carryPct} carried)`;
    showScreen('win');
}

function loseGame(msg) {
    G.screen = 'death';
    const carryPct = Math.floor(G.player.coins * 0.1);
    addCoins(carryPct);

    document.getElementById('death-msg').textContent = msg;
    document.getElementById('death-stats').innerHTML = `
        <div>Floor Reached: ${G.floor}</div>
        <div>Level: ${G.player.level}</div>
        <div>Enemies Slain: ${G.totalKills}</div>
        <div>Turns: ${G.turns}</div>
        <div>Coins Earned: ${G.totalCoins}</div>
        <div>Carried to next run: ${carryPct} coins</div>
    `;
    showScreen('death');
}

// Screen management
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('active');

    if (name === 'menu') {
        document.getElementById('menu-screen').classList.add('active');
        buildClassList();
        updateCoins();
    } else if (name === 'playing') {
        sidebar.classList.add('active');
    } else if (name === 'death') {
        document.getElementById('death-screen').classList.add('active');
    } else if (name === 'win') {
        document.getElementById('win-screen').classList.add('active');
    } else if (name === 'shop') {
        document.getElementById('shop-screen').classList.add('active');
    } else if (name === 'ad') {
        document.getElementById('ad-screen').classList.add('active');
        startAdTimer();
    }
}

function buildClassList() {
    const list = document.getElementById('class-list');
    list.innerHTML = '';
    Object.entries(CLASSES).forEach(([id, cls]) => {
        const unlocked = unlockedClasses.includes(id);
        const div = document.createElement('div');
        div.className = `class-card ${id === G.selectedClass ? 'selected' : ''} ${!unlocked ? 'locked' : ''}`;
        div.innerHTML = `<h4>${cls.name}</h4><p>HP:${cls.hp} ATK:${cls.atk} DEF:${cls.def}</p><p>${cls.desc}</p>${!unlocked ? `<p style="color:#ffcc00">Cost: ${cls.cost} coins</p>` : ''}`;
        div.onclick = () => {
            if (!unlocked) {
                const r = getRewards();
                if (r.coins >= cls.cost) {
                    r.coins -= cls.cost;
                    saveRewards(r);
                    unlockedClasses.push(id);
                    saveClassUnlocks();
                    G.selectedClass = id;
                    buildClassList();
                    updateCoins();
                }
                return;
            }
            G.selectedClass = id;
            buildClassList();
        };
        list.appendChild(div);
    });
}

function startAdTimer() {
    let count = 5;
    document.getElementById('ad-countdown').textContent = count;
    const interval = setInterval(() => {
        count--;
        document.getElementById('ad-countdown').textContent = count;
        if (count <= 0) {
            clearInterval(interval);
            G.screen = 'playing';
            showScreen('playing');
        }
    }, 1000);
}

function showAdScreen() {
    showScreen('ad');
}

// Input
document.addEventListener('keydown', e => {
    if (G.screen !== 'playing') return;
    initAudio();
    switch (e.code) {
        case 'KeyW': case 'ArrowUp': movePlayer(0, -1); break;
        case 'KeyS': case 'ArrowDown': movePlayer(0, 1); break;
        case 'KeyA': case 'ArrowLeft': movePlayer(-1, 0); break;
        case 'KeyD': case 'ArrowRight': movePlayer(1, 0); break;
        case 'KeyE': case 'Space': // Wait a turn
            if (G.screen === 'playing') { addLog('Waiting...', 'info'); endTurn(); }
            break;
    }
    e.preventDefault();
});

// Buttons
document.getElementById('start-btn').onclick = () => {
    if (!unlockedClasses.includes(G.selectedClass)) return;
    initGame();
};
document.getElementById('retry-btn').onclick = () => initGame();
document.getElementById('menu-btn').onclick = () => showScreen('menu');
document.getElementById('win-menu-btn').onclick = () => showScreen('menu');
document.getElementById('shop-close').onclick = closeShop;
document.getElementById('death-ad-btn').onclick = () => {
    // Ad to save some items
    showScreen('ad');
};

// Game loop
function gameLoop() {
    render();
    requestAnimationFrame(gameLoop);
}

showScreen('menu');
requestAnimationFrame(gameLoop);
