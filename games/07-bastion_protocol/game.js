// ============================================================
// NGN4 GAME 7: BASTION PROTOCOL - Tower Defense
// ============================================================
(function(){
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('bastion-protocol'); } catch(e) {}


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const GRID = 40;
const COLS = 20, ROWS = 15;

// --- Audio ---
let audioCtx = null;
function getAudioCtx() { if (!audioCtx) try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} return audioCtx; }
function playTone(freq, dur, type='square', vol=0.12){
  if (!getAudioCtx()) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}
function sfxShoot(){ playTone(800, 0.08, 'square', 0.1); }
function sfxExplosion(){ playTone(100, 0.3, 'sawtooth', 0.15); }
function sfxPlace(){ playTone(400, 0.1, 'sine', 0.1); }
function sfxSell(){ playTone(300, 0.15, 'triangle', 0.1); }
function sfxWaveStart(){ playTone(200, 0.2); setTimeout(()=>playTone(300, 0.2), 150); }
function sfxLeak(){ playTone(150, 0.4, 'sawtooth', 0.2); }
function sfxVictory(){ [400,500,600,800].forEach((f,i)=>setTimeout(()=>playTone(f,0.2,'sine',0.12), i*100)); }
function sfxHero(){ playTone(600, 0.15, 'sine', 0.1); setTimeout(()=>playTone(900, 0.2, 'sine', 0.12), 100); }
function sfxAchieve(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,0.15,'sine',0.1), i*60)); }

// --- Rewards ---
function getCoins(){
  return JSON.parse(localStorage.getItem('ngn4_rewards') || '{}').coins || 0;
}
function addCoins(n){
  const r = JSON.parse(localStorage.getItem('ngn4_rewards') || '{}');
  r.coins = (r.coins || 0) + n;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
  updateCoinDisplays();
}
function updateCoinDisplays(){
  document.getElementById('coinDisplay').textContent = getCoins();
  const hc = document.getElementById('hud-coins');
  if(hc) hc.textContent = game ? game.coins : 0;
}

// --- Tower Definitions ---
const TOWER_DEFS = {
  cannon:  { name:'Cannon',  cost:50,  dmg:25,  range:2.5, rate:1.5, color:'#f80', projColor:'#fa0', projSpeed:3, splash:1.2, desc:'Slow heavy damage, splash', canHitAir: true },
  laser:   { name:'Laser',   cost:30,  dmg:10,  range:3,   rate:0.4, color:'#0f0', projColor:'#0f0', projSpeed:12, desc:'Fast single target', canHitAir: true },
  frost:   { name:'Frost',   cost:40,  dmg:5,   range:2.5, rate:1.0, color:'#0df', projColor:'#0df', projSpeed:5, slow:0.5, desc:'Slows enemies', canHitAir: true },
  tesla:   { name:'Tesla',   cost:80,  dmg:15,  range:2,   rate:1.2, color:'#ff0', projColor:'#ff0', projSpeed:8, chain:3, desc:'Chain lightning', canHitAir: true },
  missile: { name:'Missile', cost:100, dmg:40,  range:3.5, rate:2.5, color:'#f0f', projColor:'#f0f', projSpeed:2.5, splash:1.8, desc:'AOE missiles', canHitAir: true },
  antiair: { name:'Anti-Air',cost:60,  dmg:18,  range:3.5, rate:0.8, color:'#4ff', projColor:'#4ff', projSpeed:15, desc:'Bonus vs flying', canHitAir: true, airBonus: 2.5 }
};

// --- Enemy Definitions ---
const ENEMY_DEFS = {
  drone:   { name:'Drone',   hp:30,  speed:2,   reward:5,  color:'#0f0', size:8, flying:false },
  speeder: { name:'Speeder', hp:20,  speed:3.5, reward:7,  color:'#ff0', size:7, flying:false },
  tank:    { name:'Tank',    hp:100, speed:1,   reward:15, color:'#f80', size:12, flying:false },
  shield:  { name:'Shield',  hp:60,  speed:1.5, reward:12, color:'#0af', size:10, shield:30, flying:false },
  heavy:   { name:'Heavy',   hp:150, speed:0.8, reward:20, color:'#f00', size:14, flying:false },
  boss:    { name:'Boss',    hp:500, speed:0.6, reward:80, color:'#f0f', size:18, flying:false },
  flyer:   { name:'Flyer',   hp:40,  speed:2.5, reward:15, color:'#8ff', size:10, flying:true },
  flyboss: { name:'Fly Boss',hp:300, speed:1.5, reward:60, color:'#fff', size:16, flying:true }
};

// --- Map Layouts ---
const MAP_LAYOUTS = [
  { name:'Classic Zigzag', points:[{x:0,y:7},{x:3,y:7},{x:3,y:3},{x:7,y:3},{x:7,y:11},{x:11,y:11},{x:11,y:5},{x:15,y:5},{x:15,y:10},{x:19,y:10}] },
  { name:'S-Curve', points:[{x:0,y:7},{x:5,y:7},{x:5,y:2},{x:10,y:2},{x:10,y:12},{x:15,y:12},{x:15,y:7},{x:19,y:7}] },
  { name:'Cross Roads', points:[{x:0,y:7},{x:7,y:7},{x:7,y:3},{x:12,y:3},{x:12,y:7},{x:19,y:7},{x:12,y:7},{x:12,y:11},{x:7,y:11},{x:7,y:7},{x:19,y:7},{x:7,y:7},{x:7,y:11}] },
  { name:'Spiral', points:[{x:0,y:7},{x:16,y:7},{x:16,y:2},{x:3,y:2},{x:3,y:12},{x:14,y:12},{x:14,y:4},{x:6,y:4},{x:6,y:10},{x:19,y:10}] },
  { name:'Double Path', points:[{x:0,y:4},{x:8,y:4},{x:8,y:0},{x:12,y:0},{x:12,y:4},{x:19,y:4},{x:19,y:11},{x:0,y:11},{x:8,y:11},{x:8,y:14},{x:12,y:14},{x:12,y:11},{x:19,y:11}] },
  { name:'Diamond', points:[{x:0,y:7},{x:4,y:7},{x:10,y:1},{x:16,y:7},{x:10,y:13},{x:10,y:7},{x:19,y:7}] }
];

let selectedMapLayout = 0;
let currentPathPoints = null;

// --- Achievement System ---
let achievements = JSON.parse(localStorage.getItem('ngn4_bastion_achievements') || '{}');
function unlockAchievement(id, name){
  if(achievements[id]) return;
  achievements[id] = { unlocked: true, name, time: Date.now() };
  localStorage.setItem('ngn4_bastion_achievements', JSON.stringify(achievements));
  sfxAchieve();
  showAchievementPopup(name);
}
function showAchievementPopup(name){
  const el = document.getElementById('achievement-popup');
  if(!el){
    const popup = document.createElement('div');
    popup.id = 'achievement-popup';
    popup.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#ffd700,#f80);color:#000;padding:8px 20px;border-radius:6px;font:bold 14px monospace;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;';
    popup.textContent = '🏆 ' + name;
    document.body.appendChild(popup);
    setTimeout(()=>{ popup.style.opacity='1'; setTimeout(()=>{ popup.style.opacity='0'; },2500); },50);
  } else {
    el.textContent = '🏆 ' + name;
    el.style.opacity = '1';
    setTimeout(()=>{ el.style.opacity = '0'; },3000);
  }
}
function checkAchievements(){
  if(!game) return;
  if(game.waveLeaks === 0 && game.currentWave >= 14) unlockAchievement('no_leaks','No Leaks');
  if(game.wavesCompletedTime > 0 && game.wavesCompletedTime < 120) unlockAchievement('speed_run','Speed Run');
  if(game.towersBuilt >= 20) unlockAchievement('master_builder','Master Builder');
  if(game.hero && game.hero.level >= 3) unlockAchievement('hero_level3','Hero Level 3');
}

// --- Hero System ---
const HERO_DEFS = {
  name: 'Vanguard',
  costs: [0, 150, 400],
  dmgPerLevel: [15, 30, 55],
  rangePerLevel: [2, 2.5, 3],
  ratePerLevel: [1.0, 0.7, 0.4],
  specialPerLevel: ['None', 'Slow Pulse', 'EMP Blast']
};

// --- Targeting Priorities ---
const TARGETING_MODES = ['first','last','strongest','fastest','close'];
const TARGETING_LABELS = { first:'First', last:'Last', strongest:'Strong', fastest:'Fast', close:'Close' };

// --- Path Definition ---
function buildPath(pts){
  const waypoints = pts.map(p=>({x: p.x * GRID + GRID/2, y: p.y * GRID + GRID/2}));
  return waypoints;
}

// --- Game State ---
let game = null;
let state = 'menu'; // menu, mapSelect, playing, paused, ad, results
let selectedTower = null;
let selectedPlacedTower = null;
let gameSpeed = 1;
let mouseX = 0, mouseY = 0;
let totalScore = 0;
let currentLevel = 0;
let particles = [];

// --- Gamepad ---
let gpCursorX = W/2, gpCursorY = H/2;
let gpPrevButtons = {};
function pollGamepad(){
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gps[0];
  if(!gp) return;
  const dead = 0.15;
  if(Math.abs(gp.axes[0])>dead) gpCursorX += gp.axes[0]*8;
  if(Math.abs(gp.axes[1])>dead) gpCursorY += gp.axes[1]*8;
  gpCursorX = Math.max(0,Math.min(W,gpCursorX));
  gpCursorY = Math.max(0,Math.min(H,gpCursorY));
  mouseX = gpCursorX; mouseY = gpCursorY;
  const pressed = {};
  for(let i=0;i<gp.buttons.length;i++) pressed[i] = gp.buttons[i].pressed;
  // A=place/upgrade
  if(pressed[0] && !gpPrevButtons[0]) handleGamepadA();
  // B=sell
  if(pressed[1] && !gpPrevButtons[1]) handleGamepadB();
  // X=next wave
  if(pressed[2] && !gpPrevButtons[2]) document.getElementById('btn-wave').click();
  // Start=pause
  if(pressed[9] && !gpPrevButtons[9]) togglePause();
  gpPrevButtons = pressed;
}
function handleGamepadA(){
  if(state!=='playing'||!game) return;
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  if(selectedTower) {
    const gx = Math.floor(mouseX/GRID), gy = Math.floor(mouseY/GRID);
    if(gx>=0&&gx<COLS&&gy>=0&&gy<ROWS&&game.grid[gy][gx]===0){
      if(!game.towers.some(t=>t.gx===gx&&t.gy===gy)){
        const def = TOWER_DEFS[selectedTower];
        if(game.coins>=def.cost){game.coins-=def.cost;game.towers.push(createTower(selectedTower,gx,gy));sfxPlace();updateHUD();}
      }
    }
  } else {
    const gx=Math.floor(mouseX/GRID),gy=Math.floor(mouseY/GRID);
    const clicked=game.towers.find(t=>t.gx===gx&&t.gy===gy);
    if(clicked) showTowerInfo(clicked);
    else if(game.hero) tryClickHero(mouseX,mouseY);
    else hideTowerInfo();
  }
}
function handleGamepadB(){
  if(state!=='playing'||!game||!selectedPlacedTower) return;
  sellTower(selectedPlacedTower);
}
function togglePause(){
  if(state==='playing'){state='paused';sfxPlace();}
  else if(state==='paused'){state='playing';sfxPlace();}
}

// --- Wave Generator ---
function generateWaves(level){
  const waves = [];
  const mult = 1 + level * 0.4;
  for(let w = 0; w < 15; w++){
    const wave = [];
    const difficulty = w + level * 3;
    let count = 5 + Math.floor(difficulty * 1.2);
    if(w === 14) count = Math.floor(count * 0.6);
    const isFlyingWave = (w+1) % 5 === 0 && w < 14;
    for(let i = 0; i < count; i++){
      let type;
      const r = Math.random();
      if(isFlyingWave){
        type = i===0 && w===9 ? 'flyboss' : 'flyer';
      } else if(w === 14 && i === 0){
        type = 'boss';
      } else if(difficulty < 3){
        type = r < 0.7 ? 'drone' : 'speeder';
      } else if(difficulty < 6){
        type = r < 0.35 ? 'drone' : r < 0.55 ? 'speeder' : r < 0.8 ? 'tank' : 'shield';
      } else {
        type = r < 0.15 ? 'drone' : r < 0.3 ? 'speeder' : r < 0.5 ? 'tank' : r < 0.7 ? 'shield' : 'heavy';
      }
      wave.push({ type, delay: i * (0.6 - Math.min(difficulty * 0.02, 0.3)) });
    }
    waves.push(wave);
  }
  return waves;
}

// --- Initialize Game ---
function initGame(level, layoutIdx){
  currentPathPoints = MAP_LAYOUTS[layoutIdx || 0].points;
  const path = buildPath(currentPathPoints);
  const grid = Array.from({length:ROWS}, ()=>Array(COLS).fill(0));
  for(let i=0; i<currentPathPoints.length - 1; i++){
    const a = currentPathPoints[i], b = currentPathPoints[i+1];
    if(a.x === b.x){
      const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
      for(let y=minY; y<=maxY; y++) grid[y][a.x] = 1;
    } else {
      const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
      for(let x=minX; x<=maxX; x++) grid[a.y][x] = 1;
    }
  }

  game = {
    level, layoutIdx: layoutIdx||0, path, grid, towers: [], enemies: [], projectiles: [],
    coins: 200 + level * 50, lives: 20, score: 0,
    waves: generateWaves(level),
    currentWave: -1, waveActive: false, waveSpawning: false,
    spawnQueue: [], spawnTimer: 0,
    waveTimer: 0, totalKills: 0, totalEarned: 0,
    towersBuilt: 0, waveLeaks: 0, wavesCompletedTime: 0,
    hero: {
      level: 1, x: path[0].x, y: path[0].y,
      pathIdx: 0, pathDir: 1, cooldown: 0,
      dmg: HERO_DEFS.dmgPerLevel[0], range: HERO_DEFS.rangePerLevel[0]*GRID,
      rate: HERO_DEFS.ratePerLevel[0], kills: 0, target: null, specialCooldown: 0
    }
  };
  selectedTower = null;
  selectedPlacedTower = null;
  gameSpeed = 1;
  particles = [];
  document.getElementById('btn-speed').textContent = '1x';
  updateHUD();
}

// --- Path Utilities ---
function getPathLength(path){
  let len = 0;
  for(let i=1; i<path.length; i++){
    const dx = path[i].x - path[i-1].x, dy = path[i].y - path[i-1].y;
    len += Math.sqrt(dx*dx + dy*dy);
  }
  return len;
}

function getPositionOnPath(path, dist){
  let traveled = 0;
  for(let i=1; i<path.length; i++){
    const dx = path[i].x - path[i-1].x, dy = path[i].y - path[i-1].y;
    const segLen = Math.sqrt(dx*dx + dy*dy);
    if(traveled + segLen >= dist){
      const t = (dist - traveled) / segLen;
      return { x: path[i-1].x + dx * t, y: path[i-1].y + dy * t };
    }
    traveled += segLen;
  }
  return { x: path[path.length-1].x, y: path[path.length-1].y };
}

// --- Enemy ---
function createEnemy(type){
  const def = ENEMY_DEFS[type];
  const mult = 1 + game.level * 0.4;
  const startPt = game.path[0];
  return {
    type, x: startPt.x, y: startPt.y,
    hp: Math.floor(def.hp * mult), maxHp: Math.floor(def.hp * mult),
    speed: def.speed, baseSpeed: def.speed,
    reward: Math.floor(def.reward * mult),
    color: def.color, size: def.size,
    dist: 0, alive: true, reached: false,
    slowTimer: 0, shieldHp: def.shield ? Math.floor(def.shield * mult) : 0,
    hitFlash: 0, flying: def.flying || false
  };
}

// --- Tower ---
function createTower(type, gx, gy){
  const def = TOWER_DEFS[type];
  game.towersBuilt++;
  return {
    type, gx, gy,
    x: gx * GRID + GRID/2, y: gy * GRID + GRID/2,
    level: 1, dmg: def.dmg, range: def.range * GRID,
    rate: def.rate, cooldown: 0,
    color: def.color, totalCost: def.cost,
    kills: 0, angle: 0,
    targeting: 'first'
  };
}

function upgradeTower(tower){
  const def = TOWER_DEFS[tower.type];
  if(tower.level >= 3) return false;
  const cost = Math.floor(def.cost * tower.level * 0.8);
  if(game.coins < cost) return false;
  game.coins -= cost;
  tower.level++;
  tower.dmg = Math.floor(def.dmg * (1 + tower.level * 0.5));
  tower.range = def.range * GRID * (1 + tower.level * 0.15);
  tower.rate = def.rate * (1 - tower.level * 0.1);
  tower.totalCost += cost;
  sfxPlace();
  updateHUD();
  return true;
}

function sellTower(tower){
  const refund = Math.floor(tower.totalCost * 0.6);
  game.coins += refund;
  game.towers = game.towers.filter(t => t !== tower);
  addCoins(refund);
  selectedPlacedTower = null;
  hideTowerInfo();
  sfxSell();
  updateHUD();
}

function cycleTargeting(tower){
  const idx = TARGETING_MODES.indexOf(tower.targeting);
  tower.targeting = TARGETING_MODES[(idx+1) % TARGETING_MODES.length];
  sfxPlace();
  if(selectedPlacedTower === tower) showTowerInfo(tower);
}

// --- Projectile ---
function createProjectile(tower, target){
  const def = TOWER_DEFS[tower.type];
  return {
    x: tower.x, y: tower.y, target,
    speed: def.projSpeed * GRID,
    dmg: tower.dmg, color: def.projColor,
    splash: def.splash ? def.splash * GRID : 0,
    slow: def.slow || 0, chain: def.chain || 0,
    alive: true, type: tower.type,
    airBonus: def.airBonus || 0
  };
}

// --- Find target by priority ---
function findTarget(tower){
  let candidates = game.enemies.filter(e=>{
    if(!e.alive) return false;
    const dx = e.x - tower.x, dy = e.y - tower.y;
    return Math.sqrt(dx*dx+dy*dy) <= tower.range;
  });
  if(candidates.length === 0) return null;
  const def = TOWER_DEFS[tower.type];
  if(!def.canHitAir) candidates = candidates.filter(e=>!e.flying);
  if(candidates.length === 0) return null;
  switch(tower.targeting){
    case 'first': return candidates.reduce((a,b)=>a.dist>b.dist?a:b);
    case 'last': return candidates.reduce((a,b)=>a.dist<b.dist?a:b);
    case 'strongest': return candidates.reduce((a,b)=>a.maxHp>b.maxHp?a:b);
    case 'fastest': return candidates.reduce((a,b)=>a.baseSpeed>b.baseSpeed?a:b);
    case 'close': return candidates.reduce((a,b)=>{const da=Math.hypot(a.x-tower.x,a.y-tower.y);const db=Math.hypot(b.x-tower.x,b.y-tower.y);return da<db?a:b;});
    default: return candidates.reduce((a,b)=>a.dist>b.dist?a:b);
  }
}

// --- Hero Update ---
function updateHero(adt){
  if(!game || !game.hero) return;
  const hero = game.hero;
  hero.cooldown -= adt;
  hero.specialCooldown -= adt;
  // Move along path
  if(hero.pathDir > 0){
    hero.pathIdx += adt * 1.5;
    if(hero.pathIdx >= game.path.length - 1){ hero.pathIdx = game.path.length - 1; hero.pathDir = -1; }
  } else {
    hero.pathIdx -= adt * 1.5;
    if(hero.pathIdx <= 0){ hero.pathIdx = 0; hero.pathDir = 1; }
  }
  // Interpolate position
  const idx = Math.floor(hero.pathIdx);
  const frac = hero.pathIdx - idx;
  const nextIdx = Math.min(idx+1, game.path.length-1);
  hero.x = game.path[idx].x + (game.path[nextIdx].x - game.path[idx].x) * frac;
  hero.y = game.path[idx].y + (game.path[nextIdx].y - game.path[idx].y) * frac;
  // Auto attack
  if(hero.cooldown <= 0){
    let bestTarget = null, bestDist = hero.range;
    for(const e of game.enemies){
      if(!e.alive) continue;
      const dx = e.x - hero.x, dy = e.y - hero.y;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if(dist < bestDist){ bestDist = dist; bestTarget = e; }
    }
    if(bestTarget){
      bestTarget.hp -= hero.dmg;
      bestTarget.hitFlash = 1;
      hero.target = bestTarget;
      hero.cooldown = hero.rate;
      spawnParticles(bestTarget.x, bestTarget.y, '#0ff', 4);
      if(hero.level >= 2){
        // Slow pulse
        for(const e of game.enemies){
          if(!e.alive) continue;
          const dx2 = e.x-hero.x, dy2 = e.y-hero.y;
          if(Math.sqrt(dx2*dx2+dy2*dy2)<hero.range*0.7) e.slowTimer = 1;
        }
      }
      if(bestTarget.hp <= 0){
        bestTarget.alive = false;
        game.coins += bestTarget.reward;
        game.totalEarned += bestTarget.reward;
        game.score += bestTarget.reward * 2;
        game.totalKills++;
        hero.kills++;
        spawnParticles(bestTarget.x, bestTarget.y, bestTarget.color, 8);
      }
    }
  }
  // Special ability (level 3)
  if(hero.level >= 3 && hero.specialCooldown <= 0){
    let nearbyCount = game.enemies.filter(e=>e.alive && Math.hypot(e.x-hero.x,e.y-hero.y)<hero.range).length;
    if(nearbyCount >= 3){
      hero.specialCooldown = 10;
      // EMP blast
      for(const e of game.enemies){
        if(!e.alive) continue;
        const dx=e.x-hero.x, dy=e.y-hero.y;
        if(Math.sqrt(dx*dx+dy*dy)<hero.range*1.5){
          e.hp -= Math.floor(hero.dmg * 0.5);
          e.slowTimer = 3;
          if(e.hp<=0){ e.alive=false; game.totalKills++; game.totalEarned+=e.reward; game.score+=e.reward*2; game.coins+=e.reward; spawnParticles(e.x,e.y,'#fff',6); }
        }
      }
      spawnParticles(hero.x, hero.y, '#fff', 15);
      sfxHero();
    }
  }
}

function tryClickHero(mx, my){
  if(!game || !game.hero) return;
  const h = game.hero;
  if(Math.hypot(mx-h.x, my-h.y) < 25){
    const cost = HERO_DEFS.costs[h.level];
    if(h.level >= 3) return;
    if(game.coins < cost) return;
    game.coins -= cost;
    h.level++;
    h.dmg = HERO_DEFS.dmgPerLevel[h.level-1];
    h.range = HERO_DEFS.rangePerLevel[h.level-1] * GRID;
    h.rate = HERO_DEFS.ratePerLevel[h.level-1];
    sfxHero();
    updateHUD();
    checkAchievements();
  }
}

// --- Game Update ---
let gameStartTime = 0;
function updateGame(dt){
  if(state !== 'playing') return;
  pollGamepad();
  const adt = dt * gameSpeed;

  // Spawn enemies
  if(game.waveSpawning && game.spawnQueue.length > 0){
    game.spawnTimer -= adt;
    if(game.spawnTimer <= 0){
      const next = game.spawnQueue.shift();
      game.enemies.push(createEnemy(next));
      game.spawnTimer = next.delay != null ? next.delay : 0.5;
      if(game.spawnQueue.length === 0) game.waveSpawning = false;
    }
  }

  // Update enemies
  for(const e of game.enemies){
    if(!e.alive) continue;
    if(e.slowTimer > 0){
      e.slowTimer -= adt;
      e.speed = e.baseSpeed * 0.4;
    } else {
      e.speed = e.baseSpeed;
    }
    e.dist += e.speed * adt * 60;
    e.hitFlash = Math.max(0, e.hitFlash - adt * 5);
    const pos = getPositionOnPath(game.path, e.dist);
    if(e.flying){
      e.x = pos.x + Math.sin(e.dist * 0.05) * 30;
      e.y = pos.y - 20; // fly above the path
    } else {
      e.x = pos.x; e.y = pos.y;
    }
    const totalPathLen = getPathLength(game.path);
    if(e.dist >= totalPathLen){
      e.alive = false; e.reached = true;
      game.lives--;
      game.waveLeaks++;
      sfxLeak();
      spawnParticles(e.x, e.y, '#f00', 8);
      if(game.lives <= 0) endGame(false);
    }
  }

  // Update towers
  for(const t of game.towers){
    t.cooldown -= adt;
    if(t.cooldown <= 0){
      const bestTarget = findTarget(t);
      if(bestTarget){
        t.angle = Math.atan2(bestTarget.y - t.y, bestTarget.x - t.x);
        game.projectiles.push(createProjectile(t, bestTarget));
        t.cooldown = t.rate;
        sfxShoot();
      }
    }
  }

  // Update hero
  updateHero(adt);

  // Update projectiles
  for(const p of game.projectiles){
    if(!p.alive) continue;
    if(!p.target || !p.target.alive){
      p.alive = false; continue;
    }
    const dx = p.target.x - p.x, dy = p.target.y - p.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist < 8){
      let dmg = p.dmg;
      if(p.airBonus && p.target.flying) dmg = Math.floor(dmg * p.airBonus);
      hitEnemy(p.target, {dmg, splash:p.splash, chain:p.chain, slow:p.slow});
      if(p.splash > 0){
        for(const e of game.enemies){
          if(e === p.target || !e.alive) continue;
          const sdx = e.x - p.target.x, sdy = e.y - p.target.y;
          if(Math.sqrt(sdx*sdx + sdy*sdy) < p.splash){
            let sd = Math.floor(dmg * 0.5);
            if(p.airBonus && e.flying) sd = Math.floor(sd * p.airBonus);
            hitEnemy(e, {dmg:sd, splash:0, chain:0, slow:0});
          }
        }
        spawnParticles(p.target.x, p.target.y, p.color, 15);
      }
      if(p.chain > 0){
        let lastTarget = p.target;
        for(let c = 0; c < p.chain; c++){
          let nearest = null, nd = Infinity;
          for(const e of game.enemies){
            if(!e.alive || e === lastTarget) continue;
            const cx = e.x - lastTarget.x, cy = e.y - lastTarget.y;
            const cd = Math.sqrt(cx*cx + cy*cy);
            if(cd < 4 * GRID && cd < nd){ nd = cd; nearest = e; }
          }
          if(nearest){
            let cd2 = Math.floor(dmg * 0.6);
            if(p.airBonus && nearest.flying) cd2 = Math.floor(cd2 * p.airBonus);
            hitEnemy(nearest, {dmg:cd2, splash:0, chain:0, slow:0});
            spawnParticles((lastTarget.x+nearest.x)/2, (lastTarget.y+nearest.y)/2, '#ff0', 5);
            lastTarget = nearest;
          }
        }
      }
      if(p.splash > 0 || p.chain > 0) sfxExplosion();
      p.alive = false;
    } else {
      p.x += (dx/dist) * p.speed * adt * 60;
      p.y += (dy/dist) * p.speed * adt * 60;
    }
  }

  // Cleanup
  game.enemies = game.enemies.filter(e => e.alive);
  game.projectiles = game.projectiles.filter(p => p.alive);

  // Check wave complete
  if(game.waveActive && !game.waveSpawning && game.enemies.length === 0){
    game.waveActive = false;
    const bonus = Math.floor(game.waves[game.currentWave].length * 2);
    game.coins += bonus;
    game.totalEarned += bonus;
    if(game.currentWave >= 14){
      game.wavesCompletedTime = (Date.now() - gameStartTime) / 1000;
      endGame(true);
    } else {
      document.getElementById('btn-wave').textContent = 'Send Wave';
    }
    updateHUD();
  }

  // Particles
  particles = particles.filter(p=>{
    p.x += p.vx * adt * 60;
    p.y += p.vy * adt * 60;
    p.vy += 0.15 * adt * 60;
    p.life -= adt * 60;
    return p.life > 0;
  });

  checkAchievements();
}

function hitEnemy(enemy, proj){
  let dmg = proj.dmg;
  if(enemy.shieldHp > 0){
    const absorbed = Math.min(enemy.shieldHp, dmg);
    enemy.shieldHp -= absorbed;
    dmg -= absorbed;
  }
  enemy.hp -= dmg;
  enemy.hitFlash = 1;
  if(proj.slow > 0) enemy.slowTimer = 2;
  if(enemy.hp <= 0){
    enemy.alive = false;
    game.coins += enemy.reward;
    game.totalEarned += enemy.reward;
    game.score += enemy.reward * 2;
    game.totalKills++;
    addCoins(enemy.reward);
    spawnParticles(enemy.x, enemy.y, enemy.color, 10);
  }
  updateHUD();
}

function spawnParticles(x, y, color, count){
  for(let i=0; i<count; i++){
    particles.push({
      x, y, vx:(Math.random()-0.5)*4, vy:(Math.random()-0.5)*4,
      life: 20+Math.random()*20, maxLife:40, color, size: 2+Math.random()*3
    });
  }
}

// --- Drawing ---
function draw(){
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);

  if(!game) return;

  // Draw grid
  for(let y=0; y<ROWS; y++){
    for(let x=0; x<COLS; x++){
      const px = x*GRID, py = y*GRID;
      if(game.grid[y][x] === 1){
        ctx.fillStyle = '#1a1a30';
        ctx.fillRect(px, py, GRID, GRID);
        ctx.fillStyle = '#252540';
        ctx.fillRect(px+2, py+2, GRID-4, GRID-4);
      } else if(game.grid[y][x] === 0){
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(px, py, GRID, GRID);
        ctx.strokeStyle = '#151525';
        ctx.strokeRect(px, py, GRID, GRID);
      }
    }
  }

  // Draw path direction arrows
  ctx.fillStyle = '#2a2a4080';
  if(currentPathPoints){
    for(let i=0; i<currentPathPoints.length-1; i++){
      const a = currentPathPoints[i], b = currentPathPoints[i+1];
      const mx = (a.x + b.x) / 2 * GRID + GRID/2;
      const my = (a.y + b.y) / 2 * GRID + GRID/2;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-4, -5);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Server (end point)
  if(currentPathPoints){
    const last = currentPathPoints[currentPathPoints.length - 1];
    ctx.fillStyle = '#f00';
    ctx.shadowColor = '#f00';
    ctx.shadowBlur = 15;
    ctx.fillRect(last.x*GRID+8, last.y*GRID+8, GRID-16, GRID-16);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SRV', last.x*GRID+GRID/2, last.y*GRID+GRID/2+3);

    // Start point
    const first = currentPathPoints[0];
    ctx.fillStyle = '#0f0';
    ctx.shadowColor = '#0f0';
    ctx.shadowBlur = 10;
    ctx.fillRect(first.x*GRID+10, first.y*GRID+10, GRID-20, GRID-20);
    ctx.shadowBlur = 0;
  }

  // Draw tower range preview
  if(selectedPlacedTower){
    ctx.beginPath();
    ctx.arc(selectedPlacedTower.x, selectedPlacedTower.y, selectedPlacedTower.range, 0, Math.PI*2);
    ctx.strokeStyle = '#ffffff30';
    ctx.stroke();
    ctx.fillStyle = '#ffffff08';
    ctx.fill();
  }

  // Draw towers
  for(const t of game.towers){
    const def = TOWER_DEFS[t.type];
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(t.x-12, t.y-12, 24, 24);
    ctx.shadowBlur = 0;
    // Level indicator
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★'.repeat(t.level), t.x, t.y + 3);
    // Turret direction
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + Math.cos(t.angle)*16, t.y + Math.sin(t.angle)*16);
    ctx.stroke();
    ctx.lineWidth = 1;
    // Targeting mode indicator
    ctx.fillStyle = '#888';
    ctx.font = '7px monospace';
    ctx.fillText(TARGETING_LABELS[t.targeting], t.x, t.y + 14);
  }

  // Draw hero
  if(game.hero){
    const h = game.hero;
    // Hero range
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.range, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(0,255,255,0.33)';
    ctx.stroke();
    // Hero body
    ctx.fillStyle = '#0ff';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 12, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Hero inner
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(h.x, h.y, 6, 0, Math.PI*2);
    ctx.fill();
    // Level
    ctx.fillStyle = '#000';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(h.level, h.x, h.y + 3);
    // Label
    ctx.fillStyle = '#0ff';
    ctx.font = '8px monospace';
    ctx.fillText('HERO', h.x, h.y - 16);
    // Special cooldown
    if(h.level >= 3 && h.specialCooldown > 0){
      ctx.fillStyle = 'rgba(255,68,0,0.53)';
      ctx.font = '7px monospace';
      ctx.fillText('EMP:'+Math.ceil(h.specialCooldown)+'s', h.x, h.y + 22);
    }
  }

  // Draw placement preview
  if(selectedTower && state === 'playing'){
    const gx = Math.floor(mouseX / GRID);
    const gy = Math.floor(mouseY / GRID);
    if(gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS && game.grid[gy][gx] === 0){
      const canPlace = !game.towers.some(t=>t.gx===gx&&t.gy===gy);
      const def = TOWER_DEFS[selectedTower];
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = canPlace ? def.color : '#f00';
      ctx.fillRect(gx*GRID, gy*GRID, GRID, GRID);
      ctx.beginPath();
      ctx.arc(gx*GRID+GRID/2, gy*GRID+GRID/2, def.range*GRID, 0, Math.PI*2);
      ctx.strokeStyle = canPlace ? def.color : '#f00';
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Draw enemies
  for(const e of game.enemies){
    if(!e.alive) continue;
    ctx.fillStyle = e.hitFlash > 0 ? '#fff' : e.color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = e.size;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Flying indicator
    if(e.flying){
      ctx.strokeStyle = '#8ff';
      ctx.lineWidth = 1;
      // Wings
      ctx.beginPath();
      ctx.moveTo(e.x-12, e.y);
      ctx.lineTo(e.x-4, e.y-4);
      ctx.moveTo(e.x+12, e.y);
      ctx.lineTo(e.x+4, e.y-4);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    // Shield
    if(e.shieldHp > 0){
      ctx.strokeStyle = '#0af';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    // HP bar
    if(e.hp < e.maxHp){
      const barW = e.size * 2;
      ctx.fillStyle = '#333';
      ctx.fillRect(e.x - barW/2, e.y - e.size - 6, barW, 3);
      ctx.fillStyle = e.hp/e.maxHp > 0.5 ? '#0f0' : '#f00';
      ctx.fillRect(e.x - barW/2, e.y - e.size - 6, barW * (e.hp/e.maxHp), 3);
    }
    // Slow indicator
    if(e.slowTimer > 0){
      ctx.fillStyle = '#0df';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('❄', e.x, e.y - e.size - 9);
    }
  }

  // Draw projectiles
  for(const p of game.projectiles){
    if(!p.alive) continue;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    if(p.type === 'laser'){
      ctx.fillRect(p.x-1, p.y-1, 4, 4);
    } else if(p.type === 'tesla'){
      ctx.fillRect(p.x-1, p.y-6, 2, 12);
    } else if(p.type === 'antiair'){
      ctx.fillRect(p.x-2, p.y-2, 4, 4);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // Draw particles
  for(const p of particles){
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Flying wave indicator
  if(game.currentWave >= 0 && (game.currentWave+1) % 5 === 0 && game.currentWave < 14 && game.waveActive){
    ctx.fillStyle = '#8ff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ FLYING WAVE — Anti-Air towers recommended! ⚠', W/2, 18);
    ctx.textAlign = 'start';
  }

  // Pause overlay
  if(state === 'paused'){
    ctx.fillStyle = '#000a';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W/2, H/2);
    ctx.font = '14px monospace';
    ctx.fillText('Press Start/Escape to resume', W/2, H/2+30);
    ctx.textAlign = 'start';
  }

  // Gamepad cursor
  if(navigator.getGamepads && navigator.getGamepads()[0]){
    ctx.strokeStyle = '#0ff6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(gpCursorX, gpCursorY, 15, 0, Math.PI*2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gpCursorX-20,gpCursorY); ctx.lineTo(gpCursorX-8,gpCursorY);
    ctx.moveTo(gpCursorX+8,gpCursorY); ctx.lineTo(gpCursorX+20,gpCursorY);
    ctx.moveTo(gpCursorX,gpCursorY-20); ctx.lineTo(gpCursorX,gpCursorY-8);
    ctx.moveTo(gpCursorX,gpCursorY+8); ctx.lineTo(gpCursorX,gpCursorY+20);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

// --- HUD ---
function updateHUD(){
  if(!game) return;
  document.getElementById('hud-wave').textContent = `Wave: ${Math.max(0,game.currentWave+1)}/15`;
  document.getElementById('hud-lives').textContent = `Lives: ${game.lives}`;
  document.getElementById('hud-coins').textContent = `Coins: ${game.coins}`;
  document.getElementById('hud-score').textContent = `Score: ${game.score}`;
}

function showTowerInfo(tower){
  selectedPlacedTower = tower;
  const def = TOWER_DEFS[tower.type];
  const panel = document.getElementById('tower-info');
  panel.classList.add('visible');
  panel.style.left = Math.min(tower.x + 20, W - 160) + 'px';
  panel.style.top = Math.max(tower.y - 60, 10) + 'px';
  document.getElementById('ti-name').textContent = `${def.name} Lv.${tower.level} [${TARGETING_LABELS[tower.targeting]}]`;
  document.getElementById('ti-stats').innerHTML =
    `DMG: ${tower.dmg}<br>Range: ${(tower.range/GRID).toFixed(1)}<br>Rate: ${tower.rate.toFixed(1)}s<br>Kills: ${tower.kills}<br><small>Click Upgrade again to cycle targeting</small>`;
  const upgCost = tower.level < 3 ? Math.floor(def.cost * tower.level * 0.8) : 'MAX';
  const sellVal = Math.floor(tower.totalCost * 0.6);
  document.getElementById('btn-upgrade').textContent = `Upgrade (${upgCost})`;
  document.getElementById('btn-upgrade').disabled = tower.level >= 3;
  document.getElementById('btn-sell').textContent = `Sell (+${sellVal})`;
}

function hideTowerInfo(){
  document.getElementById('tower-info').classList.remove('visible');
  selectedPlacedTower = null;
}

// --- Game End ---
function endGame(won){
  state = 'results';
  totalScore += game.score;
  const livesBonus = won ? game.lives * 10 : 0;
  addCoins(game.totalEarned + livesBonus);

  document.getElementById('results-title').textContent = won ? 'Level Complete!' : 'Server Lost!';
  document.getElementById('results-title').style.color = won ? '#0f0' : '#f00';
  document.getElementById('results-details').innerHTML = won
    ? `Level: <span>${game.level}</span><br>Waves survived: <span>15/15</span><br>Enemies destroyed: <span>${game.totalKills}</span><br>Lives remaining: <span>${game.lives}</span> (+${livesBonus} bonus)<br>Total score: <span>${game.score}</span><br>Coins earned: <span>${game.totalEarned + livesBonus}</span>`
    : `Level: <span>${game.level}</span><br>Waves survived: <span>${game.currentWave+1}/15</span><br>Enemies destroyed: <span>${game.totalKills}</span><br>Coins earned: <span>${game.totalEarned}</span>`;
  document.getElementById('results-screen').classList.remove('hidden');
  document.getElementById('tower-panel').classList.add('hidden');
  document.getElementById('game-hud').classList.add('hidden');
  if(won) sfxVictory(); else sfxLeak();
}

// --- Ad System ---
function showAd(callback){
  state = 'ad';
  document.getElementById('ad-overlay').classList.remove('hidden');
  document.getElementById('btn-ad-skip').style.display = '';
  document.getElementById('btn-ad-reward').style.display = 'none';
  let timer = 5;
  document.getElementById('ad-timer').textContent = timer;
  const iv = setInterval(()=>{
    timer--;
    document.getElementById('ad-timer').textContent = timer;
    if(timer <= 0){
      clearInterval(iv);
      document.getElementById('btn-ad-skip').style.display = 'none';
      document.getElementById('btn-ad-reward').style.display = '';
    }
  }, 1000);
  window._adCallback = callback;
}

// --- Input ---
canvas.addEventListener('mousemove', e=>{
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) * (W / rect.width);
  mouseY = (e.clientY - rect.top) * (H / rect.height);
});

canvas.addEventListener('click', e=>{
  if(state !== 'playing' || !game) return;
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}

  const gx = Math.floor(mouseX / GRID);
  const gy = Math.floor(mouseY / GRID);

  if(selectedTower){
    if(gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS && game.grid[gy][gx] === 0){
      if(!game.towers.some(t=>t.gx===gx&&t.gy===gy)){
        const def = TOWER_DEFS[selectedTower];
        if(game.coins >= def.cost){
          game.coins -= def.cost;
          game.towers.push(createTower(selectedTower, gx, gy));
          sfxPlace();
          updateHUD();
        }
      }
    }
    return;
  }

  // Check hero click
  if(game.hero && Math.hypot(mouseX-game.hero.x, mouseY-game.hero.y) < 25){
    tryClickHero(mouseX, mouseY);
    return;
  }

  const clicked = game.towers.find(t=>t.gx===gx && t.gy===gy);
  if(clicked){
    showTowerInfo(clicked);
  } else {
    hideTowerInfo();
  }
});

// Tower panel buttons
document.querySelectorAll('.tower-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
    const type = btn.dataset.tower;
    if(selectedTower === type){
      selectedTower = null;
      btn.classList.remove('selected');
    } else {
      document.querySelectorAll('.tower-btn').forEach(b=>b.classList.remove('selected'));
      selectedTower = type;
      btn.classList.add('selected');
      hideTowerInfo();
    }
  });
});

document.getElementById('btn-upgrade').onclick = ()=>{
  if(selectedPlacedTower){
    if(selectedPlacedTower.level >= 3){
      cycleTargeting(selectedPlacedTower);
    } else {
      upgradeTower(selectedPlacedTower);
    }
    if(selectedPlacedTower) showTowerInfo(selectedPlacedTower);
  }
};
document.getElementById('btn-sell').onclick = ()=>{
  if(selectedPlacedTower) sellTower(selectedPlacedTower);
  updateHUD();
};

document.getElementById('btn-wave').onclick = ()=>{
  if(!game || game.waveActive) return;
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  game.currentWave++;
  game.waveActive = true;
  game.waveSpawning = true;
  const waveData = game.waves[game.currentWave];
  game.spawnQueue = waveData.map(e=>({...e}));
  game.spawnTimer = 0;
  if(game.currentWave === 0) gameStartTime = Date.now();
  sfxWaveStart();
  document.getElementById('btn-wave').textContent = `Wave ${game.currentWave+1}/15`;
  updateHUD();
};

document.getElementById('btn-speed').onclick = ()=>{
  gameSpeed = gameSpeed === 1 ? 2 : gameSpeed === 2 ? 3 : 1;
  document.getElementById('btn-speed').textContent = gameSpeed + 'x';
};

// Escape to pause
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape') togglePause();
});

// Menu - now with map selection
document.getElementById('btn-play').onclick = ()=>{
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  state = 'mapSelect';
  document.getElementById('menu-screen').classList.add('hidden');
  showMapSelectScreen();
};

function showMapSelectScreen(){
  // Create map select overlay
  let overlay = document.getElementById('map-select-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'map-select-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#08080fee;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#0ff;font-family:monospace;';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  overlay.innerHTML = '<h2 style="color:#0ff;font-size:24px;margin-bottom:10px;">SELECT MAP LAYOUT</h2>' +
    '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:600px;margin-bottom:20px;">' +
    MAP_LAYOUTS.map((m,i) => `<button class="neon-btn" style="min-width:160px;" onclick="window._selectMap(${i})">${m.name}</button>`).join('') +
    '</div>' +
    '<button class="neon-btn" onclick="document.getElementById(\'map-select-overlay\').style.display=\'none\';document.getElementById(\'menu-screen\').classList.remove(\'hidden\');">← Back</button>';
  window._selectMap = function(idx){
    overlay.style.display = 'none';
    selectedMapLayout = idx;
    currentLevel++;
    initGame(currentLevel, idx);
    state = 'playing';
    document.getElementById('tower-panel').classList.remove('hidden');
    document.getElementById('game-hud').classList.remove('hidden');
  };
}

document.getElementById('btn-how').onclick = ()=>{
  document.getElementById('how-screen').classList.remove('hidden');
};
document.getElementById('btn-how-close').onclick = ()=>{
  document.getElementById('how-screen').classList.add('hidden');
};

document.getElementById('btn-results-continue').onclick = ()=>{
  document.getElementById('results-screen').classList.add('hidden');
  if(game && game.lives > 0){
    showAd(()=>{
      addCoins(500);
      currentLevel++;
      initGame(currentLevel, game.layoutIdx);
      state = 'playing';
      document.getElementById('tower-panel').classList.remove('hidden');
      document.getElementById('game-hud').classList.remove('hidden');
    });
  } else {
    currentLevel = 0;
    totalScore = 0;
    state = 'menu';
    document.getElementById('menu-screen').classList.remove('hidden');
  }
};

document.getElementById('btn-ad-skip').onclick = ()=>{};
document.getElementById('btn-ad-reward').onclick = ()=>{
  document.getElementById('ad-overlay').classList.add('hidden');
  if(window._adCallback) window._adCallback();
};

// --- Game Loop ---
let lastTime = 0;
function gameLoop(time){
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  updateGame(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

updateCoinDisplays();
requestAnimationFrame(gameLoop);

})();
