// Grand Circuit - NGN4 Racing Game
// Complete kart racing game with 8 tracks, items, championship mode, and upgrades
(function() {
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('grand-circuit'); } catch(e) {}


// ============================================================
// CONSTANTS
// ============================================================
const CW = 900, CH = 700;
const TRACK_W = 70;
const LAPS = 3;
const POINTS_TABLE = [10, 8, 6, 5, 4, 3, 2, 1];
const COLORS = ['#0ff','#f44','#4f4','#ff0','#f80','#f4f','#4ff','#888'];
const ITEM_TYPES = [
  { name:'Speed Boost', icon:'⚡', color:'#ff0', dur:2000 },
  { name:'Shield', icon:'🛡️', color:'#4af', dur:4000 },
  { name:'Missile', icon:'🚀', color:'#f44', dur:0 },
  { name:'Oil Slick', icon:'🛢️', color:'#333', dur:0 },
  { name:'EMP', icon:'💀', color:'#a0f', dur:3000 },
  { name:'Star', icon:'⭐', color:'#ff0', dur:5000 },
  { name:'Coin Magnet', icon:'🧲', color:'#f80', dur:6000 }
];

// ============================================================
// TRACK DEFINITIONS (8 unique tracks)
// ============================================================
function makeTracks() {
  return [
    {
      name:'Neon Oval', diff:'Beginner', diffStars:1,
      bg:'#0a0a1a', roadColor:'#1a1a2e', accent:'#0ff',
      // Control points for the center line of the track
      centerPoints: generateOvalPoints(450, 350, 300, 220),
      itemSpots: [[450,130],[450,570],[150,350],[750,350]],
      coins: generateCoinsForTrack(0)
    },
    {
      name:'Coastal Highway', diff:'Medium', diffStars:2,
      bg:'#0a1a1a', roadColor:'#1a2a2e', accent:'#4ff',
      centerPoints: generateSCurvePoints(),
      itemSpots: [[200,200],[500,150],[700,350],[500,550],[200,500]],
      coins: generateCoinsForTrack(1)
    },
    {
      name:'Mountain Pass', diff:'Medium', diffStars:2,
      bg:'#1a1a0a', roadColor:'#2a2a1e', accent:'#8f8',
      centerPoints: generateHairpinPoints(),
      itemSpots: [[200,150],[600,200],[700,400],[400,550],[150,450]],
      coins: generateCoinsForTrack(2)
    },
    {
      name:'City Streets', diff:'Hard', diffStars:3,
      bg:'#0f0a1a', roadColor:'#1e1a2e', accent:'#f8f',
      centerPoints: generateCityPoints(),
      itemSpots: [[250,200],[500,150],[700,300],[650,500],[350,550],[150,400]],
      coins: generateCoinsForTrack(3)
    },
    {
      name:'Desert Storm', diff:'Hard', diffStars:3,
      bg:'#1a1a0a', roadColor:'#2a2010', accent:'#fa0',
      centerPoints: generateDesertPoints(),
      itemSpots: [[300,180],[650,250],[750,450],[400,580],[150,400]],
      coins: generateCoinsForTrack(4)
    },
    {
      name:'Ice Glacier', diff:'Expert', diffStars:4,
      bg:'#0a1520', roadColor:'#1a2535', accent:'#aff',
      centerPoints: generateIcePoints(),
      itemSpots: [[200,200],[550,150],[700,350],[500,550],[200,500]],
      coins: generateCoinsForTrack(5)
    },
    {
      name:'Volcano Track', diff:'Expert', diffStars:4,
      bg:'#1a0a0a', roadColor:'#2a1510', accent:'#f80',
      centerPoints: generateVolcanoPoints(),
      itemSpots: [[250,150],[600,200],[750,400],[500,550],[150,450]],
      coins: generateCoinsForTrack(6)
    },
    {
      name:'Sky Circuit', diff:'Final', diffStars:5,
      bg:'#0a0a1a', roadColor:'#1a1a3e', accent:'#fff',
      centerPoints: generateSkyPoints(),
      itemSpots: [[200,100],[500,80],[750,200],[800,450],[550,600],[250,550]],
      coins: generateCoinsForTrack(7)
    }
  ];
}

// Track generation functions
function generateOvalPoints(cx, cy, rx, ry) {
  const pts = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

function generateSCurvePoints() {
  return [
    {x:100,y:350},{x:180,y:300},{x:280,y:200},{x:400,y:180},
    {x:520,y:220},{x:600,y:300},{x:620,y:420},{x:560,y:520},
    {x:440,y:560},{x:320,y:540},{x:220,y:470},{x:160,y:420}
  ];
}

function generateHairpinPoints() {
  return [
    {x:100,y:200},{x:200,y:140},{x:350,y:120},{x:480,y:140},
    {x:560,y:200},{x:600,y:300},{x:620,y:400},{x:580,y:500},
    {x:500,y:560},{x:380,y:580},{x:260,y:550},{x:180,y:480},
    {x:130,y:380},{x:100,y:300}
  ];
}

function generateCityPoints() {
  return [
    {x:150,y:150},{x:280,y:120},{x:400,y:150},{x:480,y:200},
    {x:500,y:300},{x:680,y:280},{x:780,y:350},{x:720,y:460},
    {x:600,y:500},{x:480,y:540},{x:350,y:500},{x:260,y:560},
    {x:160,y:520},{x:120,y:420},{x:130,y:300}
  ];
}

function generateDesertPoints() {
  return [
    {x:100,y:250},{x:200,y:180},{x:350,y:150},{x:500,y:180},
    {x:620,y:140},{x:740,y:200},{x:780,y:320},{x:740,y:440},
    {x:640,y:520},{x:500,y:560},{x:350,y:540},{x:220,y:500},
    {x:130,y:440},{x:100,y:350}
  ];
}

function generateIcePoints() {
  return [
    {x:80,y:300},{x:160,y:200},{x:280,y:130},{x:420,y:100},
    {x:560,y:130},{x:660,y:220},{x:700,y:340},{x:660,y:460},
    {x:560,y:550},{x:420,y:600},{x:280,y:560},{x:160,y:480},
    {x:100,y:400}
  ];
}

function generateVolcanoPoints() {
  return [
    {x:120,y:180},{x:250,y:120},{x:400,y:100},{x:550,y:120},
    {x:680,y:180},{x:760,y:280},{x:780,y:400},{x:720,y:500},
    {x:600,y:560},{x:450,y:580},{x:300,y:550},{x:200,y:480},
    {x:130,y:380},{x:100,y:280}
  ];
}

function generateSkyPoints() {
  return [
    {x:100,y:150},{x:220,y:80},{x:380,y:60},{x:540,y:80},
    {x:680,y:120},{x:790,y:220},{x:830,y:360},{x:790,y:480},
    {x:680,y:570},{x:540,y:620},{x:380,y:630},{x:220,y:600},
    {x:110,y:510},{x:80,y:380},{x:80,y:250}
  ];
}

function generateCoinsForTrack(trackIdx) {
  const coins = [];
  const count = 15 + trackIdx * 2;
  for (let i = 0; i < count; i++) {
    coins.push({ x: 100 + Math.random() * 700, y: 80 + Math.random() * 540, collected: false });
  }
  return coins;
}

// ============================================================
// AI PERSONALITIES
// ============================================================
const AI_NAMES = ['Blaze','Frost','Venom','Titan','Shadow','Pulse'];
const AI_PERSONALITIES = [
  { name:'aggressive', accelMul:1.0, speedMul:1.05, skill:0.85, itemUse:0.8, aggression:0.9 },
  { name:'cautious', accelMul:1.1, speedMul:0.95, skill:0.75, itemUse:0.6, aggression:0.2 },
  { name:'balanced', accelMul:1.0, speedMul:1.0, skill:0.80, itemUse:0.7, aggression:0.5 },
  { name:'hoarder', accelMul:0.95, speedMul:1.0, skill:0.80, itemUse:0.95, aggression:0.3 },
  { name:'drifter', accelMul:1.05, speedMul:1.0, skill:0.90, itemUse:0.5, aggression:0.4 },
  { name:'kamikaze', accelMul:1.1, speedMul:0.9, skill:0.65, itemUse:0.9, aggression:1.0 }
];

// ============================================================
// ACHIEVEMENTS
// ============================================================
const ACHIEVEMENTS = [
  { id:'first_win', name:'First Victory', desc:'Win your first race', icon:'🏆' },
  { id:'grand_slam', name:'Grand Slam', desc:'Win all 8 tracks', icon:'🌟' },
  { id:'drift_king', name:'Drift King', desc:'Drift for 30 seconds total', icon:'💨' },
  { id:'item_master', name:'Item Master', desc:'Use 50 items total', icon:'🎯' },
  { id:'perfect_race', name:'Perfect Race', desc:'Win a race without taking damage', icon:'💎' },
  { id:'champion', name:'Champion', desc:'Win the championship', icon:'👑' },
  { id:'coin_hunter', name:'Coin Hunter', desc:'Collect 500 coins total', icon:'🪙' },
  { id:'speed_demon', name:'Speed Demon', desc:'Reach max speed', icon:'⚡' },
  { id:'level_10', name:'Veteran', desc:'Reach level 10', icon:'🎖️' },
  { id:'all_items', name:'Arsenal', desc:'Use every item type', icon:'🎒' },
  { id:'lap_record', name:'Lap Record', desc:'Complete a lap in under 15 seconds', icon:'⏱️' },
  { id:'comeback', name:'Comeback Kid', desc:'Win after being in last place', icon:'🔄' }
];

// ============================================================
// AUDIO SYSTEM (Procedural)
// ============================================================
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
}

function playSound(type) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    switch(type) {
      case 'engine':
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(80, t);
        gain.gain.setValueAtTime(0.03, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.1);
        osc.start(t); osc.stop(t+0.1); break;
      case 'boost':
        osc.type = 'square'; osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t+0.3);
        gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialDecayToValueAtTime(0.001, t+0.3);
        osc.start(t); osc.stop(t+0.3); break;
      case 'item':
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(800, t+0.15);
        gain.gain.setValueAtTime(0.06, t); gain.gain.exponentialDecayToValueAtTime(0.001, t+0.15);
        osc.start(t); osc.stop(t+0.15); break;
      case 'hit':
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t+0.2);
        gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialDecayToValueAtTime(0.001, t+0.2);
        osc.start(t); osc.stop(t+0.2); break;
      case 'drift':
        osc.type = 'triangle'; osc.frequency.setValueAtTime(300, t);
        gain.gain.setValueAtTime(0.02, t); gain.gain.exponentialDecayToValueAtTime(0.001, t+0.15);
        osc.start(t); osc.stop(t+0.15); break;
      case 'lap':
        osc.type = 'sine'; osc.frequency.setValueAtTime(500, t);
        osc.frequency.setValueAtTime(700, t+0.1);
        osc.frequency.setValueAtTime(900, t+0.2);
        gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialDecayToValueAtTime(0.001, t+0.4);
        osc.start(t); osc.stop(t+0.4); break;
      case 'victory':
        osc.type = 'sine';
        [523,659,784,1047].forEach((f,i) => osc.frequency.setValueAtTime(f, t+i*0.15));
        gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialDecayToValueAtTime(0.001, t+0.8);
        osc.start(t); osc.stop(t+0.8); break;
      case 'coin':
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, t);
        osc.frequency.setValueAtTime(1200, t+0.05);
        gain.gain.setValueAtTime(0.04, t); gain.gain.exponentialDecayToValueAtTime(0.001, t+0.1);
        osc.start(t); osc.stop(t+0.1); break;
      case 'countdown':
        osc.type = 'square'; osc.frequency.setValueAtTime(440, t);
        gain.gain.setValueAtTime(0.06, t); gain.gain.exponentialDecayToValueAtTime(0.001, t+0.2);
        osc.start(t); osc.stop(t+0.2); break;
      case 'go':
        osc.type = 'square'; osc.frequency.setValueAtTime(880, t);
        gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialDecayToValueAtTime(0.001, t+0.4);
        osc.start(t); osc.stop(t+0.4); break;
      case 'missile':
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(50, t+0.5);
        gain.gain.setValueAtTime(0.06, t); gain.gain.exponentialDecayToValueAtTime(0.001, t+0.5);
        osc.start(t); osc.stop(t+0.5); break;
    }
  } catch(e) {}
}

// Engine loop
let engineLoopId = null;
function startEngineLoop() {
  if (engineLoopId) return;
  let phase = 0;
  function tick() {
    if (state !== 'playing') { engineLoopId = null; return; }
    phase += 0.05;
    playSound('engine');
    engineLoopId = setTimeout(tick, 100);
  }
  tick();
}
function stopEngineLoop() {
  if (engineLoopId) { clearTimeout(engineLoopId); engineLoopId = null; }
}

// ============================================================
// GAME STATE
// ============================================================
let state = 'menu';
let canvas, ctx, mmCanvas, mmCtx;
let tracks = [];
let player = null;
let aiRacers = [];
let allRacers = [];
let currentTrack = null;
let trackIdx = 0;
let raceTime = 0;
let countdown = 0;
let raceFinished = false;
let coinsOnTrack = [];
let hazardsOnTrack = [];
let missilesOnTrack = [];
let particles = [];

// Save data
let saveData = {
  coins: 0, xp: 0, level: 1,
  upgrades: { speed: 0, accel: 0, handling: 0, armor: 0 },
  achievements: [],
  tracksWon: [],
  totalDriftTime: 0, totalItemsUsed: 0, totalCoinsCollected: 0,
  itemsUsedTypes: new Set(),
  wasLastPlace: false
};

// Championship
let championship = {
  active: false,
  raceIndex: 0,
  standings: {} // name -> points
};

// XP system
function xpForLevel(lvl) { return lvl * 100; }

// ============================================================
// SAVE/LOAD
// ============================================================
function loadSave() {
  try {
    const raw = localStorage.getItem('ngn4_rewards');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.coins !== undefined) saveData.coins = parsed.coins || 0;
    }
    const gs = localStorage.getItem('gc_save');
    if (gs) {
      const parsed = JSON.parse(gs);
      Object.assign(saveData, parsed);
      if (!saveData.itemsUsedTypes) saveData.itemsUsedTypes = new Set();
      else saveData.itemsUsedTypes = new Set(parsed.itemsUsedTypes || []);
      if (!saveData.tracksWon) saveData.tracksWon = [];
    }
  } catch(e) {}
}

function saveSave() {
  try {
    const ngn4 = { coins: saveData.coins, games: {} };
    localStorage.setItem('ngn4_rewards', JSON.stringify(ngn4));
    const toSave = Object.assign({}, saveData, { itemsUsedTypes: Array.from(saveData.itemsUsedTypes) });
    localStorage.setItem('gc_save', JSON.stringify(toSave));
  } catch(e) {}
}

function loadNGN4Coins() {
  try {
    const raw = localStorage.getItem('ngn4_rewards');
    if (raw) { const p = JSON.parse(raw); saveData.coins = p.coins || 0; }
  } catch(e) {}
}

// ============================================================
// RACER CLASS
// ============================================================
class Racer {
  constructor(name, color, isPlayer, personality) {
    this.name = name;
    this.color = color;
    this.isPlayer = isPlayer;
    this.personality = personality || { accelMul:1, speedMul:1, skill:0.8, itemUse:0.7, aggression:0.5 };
    this.x = 0; this.y = 0;
    this.angle = 0;
    this.speed = 0;
    this.baseMaxSpeed = 3.5;
    this.baseAccel = 0.08;
    this.baseHandling = 0.04;
    this.maxSpeed = 3.5;
    this.accel = 0.08;
    this.handling = 0.04;
    this.item = null;
    this.lap = 0;
    this.checkpoint = 0;
    this.totalDist = 0;
    this.racePos = 1;
    this.finished = false;
    this.finishTime = 0;
    this.shielded = false;
    this.shieldTimer = 0;
    this.boosted = false;
    this.boostTimer = 0;
    this.emped = false;
    this.empTimer = 0;
    this.starred = false;
    this.starTimer = 0;
    this.magnet = false;
    this.magnetTimer = 0;
    this.drifting = false;
    this.driftTime = 0;
    this.driftBoost = 0;
    this.hitThisRace = false;
    this.lapStartTime = 0;
    this.bestLap = Infinity;
    this.totalLapTime = 0;
    // AI
    this.targetWP = 0;
    this.aiItemTimer = 0;
    this.aiSteer = 0;
    this.spinTimer = 0;
    // Visual
    this.trail = [];
  }

  applyUpgrades() {
    if (!this.isPlayer) return;
    const u = saveData.upgrades;
    this.maxSpeed = this.baseMaxSpeed + u.speed * 0.3;
    this.accel = this.baseAccel + u.accel * 0.015;
    this.handling = this.baseHandling + u.handling * 0.008;
    this.maxSpeed *= this.personality.speedMul;
    this.accel *= this.personality.accelMul;
  }

  update(dt, keys) {
    if (this.finished) return;

    // Timers
    this.updateTimers(dt);
    if (this.spinTimer > 0) {
      this.spinTimer -= dt;
      this.angle += 0.15;
      this.speed *= 0.95;
      return;
    }

    // Determine max speed with modifiers
    let curMaxSpeed = this.maxSpeed;
    if (this.boosted) curMaxSpeed *= 1.4;
    if (this.emped) curMaxSpeed *= 0.6;
    if (this.starred) curMaxSpeed *= 1.2;

    // Input
    if (this.isPlayer) {
      this.handlePlayerInput(keys, curMaxSpeed);
    } else {
      this.handleAI(curMaxSpeed);
    }

    // Off-track detection
    if (!this.isOnTrack()) {
      this.speed *= 0.97;
    }

    // Track-specific modifiers
    if (currentTrack) {
      if (trackIdx === 5) { // Ice - low traction
        this.handling = (this.baseHandling + (this.isPlayer ? saveData.upgrades.handling * 0.008 : 0)) * 0.6;
      }
    }

    // Clamp speed
    this.speed = Math.max(0, Math.min(this.speed, curMaxSpeed));

    // Move
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    this.totalDist += this.speed;

    // Keep in bounds
    this.x = Math.max(10, Math.min(CW - 10, this.x));
    this.y = Math.max(10, Math.min(CH - 10, this.y));

    // Checkpoints & laps
    this.updateCheckpoints();

    // Trail
    if (this.speed > 0.5) {
      this.trail.push({ x: this.x, y: this.y, age: 0 });
      if (this.trail.length > 20) this.trail.shift();
    }
    this.trail.forEach(t => t.age++);

    // Coin magnet
    if (this.magnet) {
      coinsOnTrack.forEach(c => {
        if (!c.collected) {
          const dx = this.x - c.x, dy = this.y - c.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 100) {
            c.x += dx * 0.1;
            c.y += dy * 0.1;
          }
        }
      });
    }

    // Coin collection
    coinsOnTrack.forEach(c => {
      if (!c.collected) {
        const dx = this.x - c.x, dy = this.y - c.y;
        if (dx*dx + dy*dy < 400) {
          c.collected = true;
          if (this.isPlayer) {
            saveData.coins += 1;
            saveData.totalCoinsCollected++;
            playSound('coin');
          }
        }
      }
    });

    // Hazard collision
    for (let hi = hazardsOnTrack.length - 1; hi >= 0; hi--) {
      const h = hazardsOnTrack[hi];
      const dx = this.x - h.x, dy = this.y - h.y;
      if (dx*dx + dy*dy < 500) {
        if (this.shielded) {
          this.shielded = false;
          this.shieldTimer = 0;
          hazardsOnTrack.splice(hi, 1);
        } else if (!this.starred) {
          this.speed *= 0.3;
          this.spinTimer = 500;
          this.hitThisRace = true;
          playSound('hit');
        }
      }
    }

    // Missile collision
    for (let i = missilesOnTrack.length - 1; i >= 0; i--) {
      const m = missilesOnTrack[i];
      if (m.target === this) {
        const dx = this.x - m.x, dy = this.y - m.y;
        if (dx*dx + dy*dy < 600) {
          if (this.shielded) {
            this.shielded = false;
          } else if (!this.starred) {
            this.speed *= 0.3;
            this.spinTimer = 800;
            this.hitThisRace = true;
            playSound('hit');
          }
          missilesOnTrack.splice(i, 1);
        }
      }
    }

    // Particles
    if (this.drifting) {
      for (let i = 0; i < 2; i++) {
        particles.push({
          x: this.x - Math.cos(this.angle) * 12,
          y: this.y - Math.sin(this.angle) * 12,
          vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2,
          life: 20, color: this.color
        });
      }
    }
    if (this.boosted) {
      particles.push({
        x: this.x - Math.cos(this.angle) * 15,
        y: this.y - Math.sin(this.angle) * 15,
        vx: -Math.cos(this.angle)*3, vy: -Math.sin(this.angle)*3,
        life: 15, color: '#ff0'
      });
    }
    if (this.starred) {
      particles.push({
        x: this.x + (Math.random()-0.5)*20,
        y: this.y + (Math.random()-0.5)*20,
        vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3,
        life: 20, color: ['#ff0','#f80','#f00','#0ff'][Math.floor(Math.random()*4)]
      });
    }
  }

  handlePlayerInput(keys, curMaxSpeed) {
    const accelInput = keys.up || keys.rightTrigger > 0.2;
    const brakeInput = keys.down || keys.leftTrigger > 0.2;
    const leftInput = keys.left || keys.leftStickX < -0.2;
    const rightInput = keys.right || keys.leftStickX > 0.2;
    const driftInput = keys.shift || keys.gamepadY;
    const itemInput = keys.space || keys.gamepadX;

    if (accelInput) {
      this.speed += this.accel;
    } else {
      this.speed *= 0.98;
    }
    if (brakeInput) {
      this.speed -= this.accel * 1.5;
    }

    const turnRate = this.handling * (this.drifting ? 1.5 : 1) * (this.speed / this.maxSpeed);
    if (leftInput) this.angle -= turnRate;
    if (rightInput) this.angle += turnRate;

    // Drifting
    if (driftInput && this.speed > 1.5 && (leftInput || rightInput)) {
      if (!this.drifting) {
        this.drifting = true;
        this.driftTime = 0;
        this.driftBoost = 0;
      }
      this.driftTime += 16;
      saveData.totalDriftTime += 16;
      if (this.driftTime % 200 < 20) playSound('drift');
    } else {
      if (this.drifting && this.driftBoost > 0) {
        this.speed = Math.min(this.speed + this.driftBoost, curMaxSpeed * 1.3);
        playSound('boost');
      }
      this.drifting = false;
    }
    if (this.drifting) {
      this.driftBoost = Math.min(this.driftBoost + 0.002, 2);
    }

    // Item
    if (itemInput && this.item !== null) {
      this.useItem();
    }
  }

  handleAI(curMaxSpeed) {
    if (!currentTrack) return;
    const wp = currentTrack.centerPoints;
    if (!wp || wp.length === 0) return;

    const target = wp[this.targetWP % wp.length];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const dist = Math.sqrt(dx*dx + dy*dy);

    // Steer
    const steerAmount = Math.min(Math.abs(angleDiff), this.handling * 1.2) * Math.sign(angleDiff);
    this.angle += steerAmount;

    // Speed control - slow down for turns
    let speedFactor = 1;
    if (Math.abs(angleDiff) > 0.5) speedFactor = 0.7;
    if (Math.abs(angleDiff) > 1.0) speedFactor = 0.5;

    // Add personality variance
    const variance = (Math.sin(Date.now() * 0.001 + this.name.charCodeAt(0)) * 0.1);
    speedFactor += variance;

    this.speed += this.accel * speedFactor;
    this.speed *= 0.98;

    // AI drift for skill boost
    if (Math.abs(angleDiff) > 0.4 && this.speed > 2 && this.personality.name === 'drifter') {
      this.drifting = true;
      this.driftBoost = Math.min((this.driftBoost || 0) + 0.003, 2);
      if (Math.random() < 0.05) {
        this.speed += this.driftBoost;
        this.driftBoost = 0;
      }
    } else {
      if (this.drifting && this.driftBoost > 0) {
        this.speed += this.driftBoost * 0.5;
        this.driftBoost = 0;
      }
      this.drifting = false;
    }

    // Waypoint progression
    if (dist < 50) {
      this.targetWP = (this.targetWP + 1) % wp.length;
    }

    // AI item use
    this.aiItemTimer += 16;
    if (this.item !== null && this.aiItemTimer > 2000 * (1 - this.personality.itemUse)) {
      if (Math.random() < this.personality.itemUse) {
        this.useItem();
      }
      this.aiItemTimer = 0;
    }
  }

  updateTimers(dt) {
    if (this.shieldTimer > 0) { this.shieldTimer -= dt; if (this.shieldTimer <= 0) this.shielded = false; }
    if (this.boostTimer > 0) { this.boostTimer -= dt; if (this.boostTimer <= 0) this.boosted = false; }
    if (this.empTimer > 0) { this.empTimer -= dt; if (this.empTimer <= 0) this.emped = false; }
    if (this.starTimer > 0) { this.starTimer -= dt; if (this.starTimer <= 0) this.starred = false; }
    if (this.magnetTimer > 0) { this.magnetTimer -= dt; if (this.magnetTimer <= 0) this.magnet = false; }
  }

  updateCheckpoints() {
    if (!currentTrack) return;
    const wp = currentTrack.centerPoints;
    if (!wp || wp.length === 0) return;

    // Lap detection FIRST: check start area before incrementing checkpoint
    const startPt = wp[0];
    const sdx = this.x - startPt.x, sdy = this.y - startPt.y;
    if (sdx*sdx + sdy*sdy < 60*60 && this.checkpoint >= wp.length * 0.7) {
      this.lap++;
      this.checkpoint = 0;
      const lapTime = raceTime - this.lapStartTime;
      this.lapStartTime = raceTime;
      if (lapTime < this.bestLap) this.bestLap = lapTime;
      if (this.isPlayer) {
        playSound('lap');
        if (lapTime < 15000) unlockAchievement('lap_record');
      }
      if (this.lap >= LAPS) {
        this.finished = true;
        this.finishTime = raceTime;
      }
      return; // Don't process further checkpoints this frame
    }

    // Checkpoint progression
    const nextIdx = (this.checkpoint + 1) % wp.length;
    const cp = wp[nextIdx];
    const dx = this.x - cp.x, dy = this.y - cp.y;
    if (dx*dx + dy*dy < 60*60) {
      this.checkpoint = nextIdx;
    }
  }

  useItem() {
    if (this.item === null) return;
    const itemDef = ITEM_TYPES[this.item];
    if (!itemDef) { this.item = null; return; }

    if (this.isPlayer) {
      saveData.totalItemsUsed++;
      saveData.itemsUsedTypes.add(this.item);
    }
    playSound('item');

    switch(this.item) {
      case 0: // Speed Boost
        this.boosted = true;
        this.boostTimer = itemDef.dur;
        spawnParticles(this.x, this.y, '#ff0', 10);
        break;
      case 1: // Shield
        this.shielded = true;
        this.shieldTimer = itemDef.dur;
        break;
      case 2: // Missile
        const target = this.findTarget();
        if (target) {
          missilesOnTrack.push({
            x: this.x, y: this.y,
            target: target, speed: 5,
            life: 120, owner: this
          });
        }
        playSound('missile');
        break;
      case 3: // Oil Slick
        hazardsOnTrack.push({
          x: this.x - Math.cos(this.angle) * 30,
          y: this.y - Math.sin(this.angle) * 30,
          life: 600, type: 'oil'
        });
        break;
      case 4: // EMP
        allRacers.forEach(r => {
          if (r !== this && !r.finished) {
            const dx = r.x - this.x, dy = r.y - this.y;
            if (dx*dx + dy*dy < 250*250) {
              r.emped = true;
              r.empTimer = itemDef.dur;
            }
          }
        });
        spawnParticles(this.x, this.y, '#a0f', 20);
        break;
      case 5: // Star
        this.starred = true;
        this.starTimer = itemDef.dur;
        break;
      case 6: // Coin Magnet
        this.magnet = true;
        this.magnetTimer = itemDef.dur;
        break;
    }

    if (saveData.totalItemsUsed >= 50) unlockAchievement('item_master');
    if (saveData.itemsUsedTypes.size >= ITEM_TYPES.length) unlockAchievement('all_items');

    this.item = null;
  }

  findTarget() {
    let closest = null, closestDist = Infinity;
    allRacers.forEach(r => {
      if (r !== this && !r.finished) {
        const dx = r.x - this.x, dy = r.y - this.y;
        const d = dx*dx + dy*dy;
        if (d < closestDist && d < 400*400) {
          closestDist = d;
          closest = r;
        }
      }
    });
    // If no one close, target race leader
    if (!closest) {
      closest = allRacers.reduce((a,b) => (a.totalDist > b.totalDist ? a : b));
      if (closest === this) closest = allRacers.find(r => r !== this);
    }
    return closest;
  }

  isOnTrack() {
    if (!currentTrack) return true;
    const wp = currentTrack.centerPoints;
    for (let i = 0; i < wp.length; i++) {
      const dx = this.x - wp[i].x, dy = this.y - wp[i].y;
      if (dx*dx + dy*dy < TRACK_W * TRACK_W) return true;
    }
    return false;
  }

  draw(ctx) {
    // Trail
    this.trail.forEach((t, i) => {
      if (t.age < 20) {
        ctx.globalAlpha = (1 - t.age / 20) * 0.3;
        ctx.fillStyle = this.starred ? '#ff0' : this.color;
        ctx.fillRect(t.x - 2, t.y - 2, 4, 4);
      }
    });
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Spin effect
    if (this.spinTimer > 0) {
      ctx.rotate(this.spinTimer * 0.1);
    }

    // Star glow
    if (this.starred) {
      ctx.shadowColor = '#ff0';
      ctx.shadowBlur = 20;
    }
    // Shield glow
    if (this.shielded) {
      ctx.shadowColor = '#4af';
      ctx.shadowBlur = 15;
    }
    // EMP glow
    if (this.emped) {
      ctx.shadowColor = '#a0f';
      ctx.shadowBlur = 10;
    }

    // Kart body
    ctx.fillStyle = this.color;
    ctx.fillRect(-12, -8, 24, 16);

    // Windshield
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(4, -5, 6, 10);

    // Wheels
    ctx.fillStyle = '#222';
    ctx.fillRect(-10, -10, 5, 4);
    ctx.fillRect(-10, 6, 5, 4);
    ctx.fillRect(6, -10, 5, 4);
    ctx.fillRect(6, 6, 5, 4);

    // Boost flame
    if (this.boosted) {
      ctx.fillStyle = '#f80';
      ctx.fillRect(-16, -3, 5, 6);
      ctx.fillStyle = '#ff0';
      ctx.fillRect(-18, -2, 4, 4);
    }

    // Drift sparks
    if (this.drifting) {
      ctx.fillStyle = '#ff0';
      ctx.fillRect(-14, -10 + Math.random()*20, 2, 2);
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    // Name tag
    ctx.fillStyle = '#fff';
    ctx.font = '9px Share Tech Mono';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y - 16);

    // Shield visual
    if (this.shielded) {
      ctx.strokeStyle = 'rgba(68,170,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random()-0.5)*6,
      vy: (Math.random()-0.5)*6,
      life: 30,
      color
    });
  }
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const tenth = Math.floor((ms % 1000) / 100);
  return `${m}:${sec.toString().padStart(2,'0')}.${tenth}`;
}

function posName(p) {
  const names = ['1st','2nd','3rd','4th','5th','6th','7th'];
  return names[p-1] || p+'th';
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function updateMenuStats() {
  document.getElementById('menu-coins').textContent = saveData.coins;
  document.getElementById('menu-level').textContent = saveData.level;
  document.getElementById('menu-xp').textContent = saveData.xp;
  document.getElementById('menu-xp-max').textContent = xpForLevel(saveData.level);
}

// ============================================================
// TRACK SELECT
// ============================================================
function buildTrackSelect() {
  const grid = document.getElementById('track-grid');
  grid.innerHTML = '';
  tracks.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'track-card';
    card.innerHTML = `<div class="track-name">${t.name}</div><div class="track-diff ${t.diffStars>=3?'star':''}">${t.diff} ${'★'.repeat(t.diffStars)}</div>`;
    card.onclick = () => startRace(i);
    grid.appendChild(card);
  });
}

// ============================================================
// RACE INITIALIZATION
// ============================================================
function startRace(tIdx) {
  initAudio();
  trackIdx = tIdx;
  currentTrack = tracks[tIdx];

  // Create player
  player = new Racer('You', COLORS[0], true);
  player.applyUpgrades();

  // Create AI racers
  aiRacers = AI_NAMES.map((name, i) => {
    const r = new Racer(name, COLORS[i+1], false, AI_PERSONALITIES[i]);
    r.maxSpeed = r.baseMaxSpeed * (0.9 + tIdx * 0.015); // Scale difficulty with track
    r.accel = r.baseAccel * (0.9 + tIdx * 0.01);
    return r;
  });

  allRacers = [player, ...aiRacers];

  // Position racers on start line
  const startPt = currentTrack.centerPoints[0];
  const nextPt = currentTrack.centerPoints[1];
  const startAngle = Math.atan2(nextPt.y - startPt.y, nextPt.x - startPt.x);

  allRacers.forEach((r, i) => {
    const perpAngle = startAngle + Math.PI / 2;
    const row = Math.floor(i / 2);
    const col = i % 2;
    r.x = startPt.x - Math.cos(startAngle) * (row * 30 + 20) + Math.cos(perpAngle) * (col === 0 ? -20 : 20);
    r.y = startPt.y - Math.sin(startAngle) * (row * 30 + 20) + Math.sin(perpAngle) * (col === 0 ? -20 : 20);
    r.angle = startAngle;
    r.targetWP = 1;
  });

  // Reset race state
  raceTime = 0;
  countdown = 3;
  countdownTimer = 0;
  raceFinished = false;
  saveData.wasLastPlace = false;
  particles = [];
  missilesOnTrack = [];
  hazardsOnTrack = [];

  // Clone coins for this race
  coinsOnTrack = currentTrack.coins.map(c => ({...c, collected: false}));

  // Reset item boxes on track
  currentTrack.itemSpots.forEach(spot => {
    spot.cooldown = 0;
  });

  state = 'countdown';
  showScreen('hud');
  stopEngineLoop();
}

// ============================================================
// ITEM BOX SYSTEM
// ============================================================
function checkItemBoxes(racer) {
  if (!currentTrack) return;
  currentTrack.itemSpots.forEach(spot => {
    if (racer.item === null) {
      const dx = racer.x - spot[0], dy = racer.y - spot[1];
      if (dx*dx + dy*dy < 30*30) {
        if (!spot.cooldown || spot.cooldown <= 0) {
          // Better items for lower positions
          let maxItem = ITEM_TYPES.length;
          const pos = getRacerPosition(racer);
          if (pos >= 5) maxItem = Math.min(maxItem, 5); // Better items for back
          racer.item = Math.floor(Math.random() * maxItem);
          spot.cooldown = 5000;
          playSound('item');
        }
      }
    }
  });
}

function getRacerPosition(racer) {
  const sorted = [...allRacers].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    if (a.lap !== b.lap) return b.lap - a.lap;
    return b.totalDist - a.totalDist;
  });
  return sorted.indexOf(racer) + 1;
}

function updatePositions() {
  const sorted = [...allRacers].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    if (a.lap !== b.lap) return b.lap - a.lap;
    return b.totalDist - a.totalDist;
  });
  sorted.forEach((r, i) => r.racePos = i + 1);
}

// ============================================================
// MISSILE & HAZARD UPDATES
// ============================================================
function updateMissiles() {
  for (let i = missilesOnTrack.length - 1; i >= 0; i--) {
    const m = missilesOnTrack[i];
    if (m.life <= 0 || !m.target) {
      missilesOnTrack.splice(i, 1);
      continue;
    }
    const dx = m.target.x - m.x, dy = m.target.y - m.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 0) {
      m.x += (dx/dist) * m.speed;
      m.y += (dy/dist) * m.speed;
    }
    m.life--;
    // Missile trail particles (in update, not render)
    particles.push({
      x: m.x, y: m.y,
      vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2,
      life: 8, color: '#f80'
    });
  }
}

function updateHazards() {
  for (let i = hazardsOnTrack.length - 1; i >= 0; i--) {
    hazardsOnTrack[i].life--;
    if (hazardsOnTrack[i].life <= 0) {
      hazardsOnTrack.splice(i, 1);
    }
  }
  // Item box cooldowns
  if (currentTrack) {
    currentTrack.itemSpots.forEach(spot => {
      if (spot.cooldown > 0) spot.cooldown -= 16;
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ============================================================
// RENDERING
// ============================================================
function render() {
  ctx.fillStyle = currentTrack ? currentTrack.bg : '#0a0a1a';
  ctx.fillRect(0, 0, CW, CH);

  if (!currentTrack) return;

  // Draw track
  drawTrack();

  // Draw item boxes
  drawItemBoxes();

  // Draw coins
  drawCoins();

  // Draw hazards
  drawHazards();

  // Draw missiles
  drawMissiles();

  // Draw racers (sorted by Y for pseudo-depth)
  const sortedRacers = [...allRacers].sort((a, b) => a.y - b.y);
  sortedRacers.forEach(r => r.draw(ctx));

  // Draw particles
  particles.forEach(p => {
    ctx.globalAlpha = p.life / 30;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  });
  ctx.globalAlpha = 1;

  // Track-specific decorations
  drawTrackDecorations();

  // Draw minimap
  drawMinimap();

  // Update HUD
  updateHUD();
}

function drawTrack() {
  const wp = currentTrack.centerPoints;
  if (!wp || wp.length === 0) return;

  // Road borders (drawn first, wider)
  ctx.strokeStyle = currentTrack.accent + '40';
  ctx.lineWidth = TRACK_W + 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(wp[0].x, wp[0].y);
  for (let i = 1; i < wp.length; i++) {
    ctx.lineTo(wp[i].x, wp[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  // Draw road segments (on top of borders)
  ctx.strokeStyle = currentTrack.roadColor;
  ctx.lineWidth = TRACK_W;
  ctx.beginPath();
  ctx.moveTo(wp[0].x, wp[0].y);
  for (let i = 1; i < wp.length; i++) {
    ctx.lineTo(wp[i].x, wp[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  // Center line (dashed)
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(wp[0].x, wp[0].y);
  for (let i = 1; i < wp.length; i++) {
    ctx.lineTo(wp[i].x, wp[i].y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Start/finish line
  const s = wp[0], n = wp[1];
  const angle = Math.atan2(n.y - s.y, n.x - s.x);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(angle + Math.PI/2);
  ctx.fillStyle = '#fff';
  for (let i = -TRACK_W/2; i < TRACK_W/2; i += 10) {
    ctx.fillStyle = (Math.floor(i/10) % 2 === 0) ? '#fff' : '#000';
    ctx.fillRect(i, -3, 10, 6);
  }
  ctx.restore();
}

function drawItemBoxes() {
  if (!currentTrack) return;
  currentTrack.itemSpots.forEach(spot => {
    if (!spot.cooldown || spot.cooldown <= 0) {
      ctx.save();
      ctx.translate(spot[0], spot[1]);
      ctx.rotate(Date.now() * 0.002);
      ctx.fillStyle = 'rgba(255,255,0,0.3)';
      ctx.fillRect(-10, -10, 20, 20);
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 2;
      ctx.strokeRect(-10, -10, 20, 20);
      ctx.fillStyle = '#ff0';
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 0);
      ctx.restore();
    }
  });
}

function drawCoins() {
  coinsOnTrack.forEach(c => {
    if (!c.collected) {
      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fa0';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', c.x, c.y);
    }
  });
}

function drawHazards() {
  hazardsOnTrack.forEach(h => {
    ctx.globalAlpha = Math.min(1, h.life / 100);
    if (h.type === 'oil') {
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

function drawMissiles() {
  missilesOnTrack.forEach(m => {
    ctx.fillStyle = '#f44';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawTrackDecorations() {
  // Track-specific visual effects
  const t = Date.now() * 0.001;
  switch(trackIdx) {
    case 0: // Neon Oval - neon barriers
      drawNeonBarriers();
      break;
    case 1: // Coastal - water effect
      ctx.fillStyle = 'rgba(0,100,200,0.03)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(100 + i*180, 600 + Math.sin(t+i)*20, 40, 0, Math.PI*2);
        ctx.fill();
      }
      break;
    case 2: // Mountain - rock obstacles
      ctx.fillStyle = '#555';
      [[60,100],[830,200],[750,550],[120,500]].forEach(([x,y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(x-5, y-5, 15, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#555';
      });
      break;
    case 3: // City - buildings
      ctx.fillStyle = '#111';
      [[30,30],[30,400],[860,50],[860,500],[420,20]].forEach(([x,y]) => {
        ctx.fillRect(x, y, 25, 80);
        ctx.fillStyle = '#1a1a3a';
        for (let j = 0; j < 4; j++) {
          ctx.fillRect(x+5, y+8+j*18, 7, 8);
          ctx.fillRect(x+14, y+12+j*18, 7, 8);
        }
        ctx.fillStyle = '#111';
      });
      break;
    case 4: // Desert - sand dunes
      ctx.fillStyle = 'rgba(200,150,50,0.05)';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(100+i*100, 50+Math.sin(i*1.5)*200, 60, 0, Math.PI*2);
        ctx.fill();
      }
      break;
    case 5: // Ice - ice patches
      ctx.fillStyle = 'rgba(150,200,255,0.08)';
      for (let i = 0; i < 6; i++) {
        const x = 150+i*120, y = 100+i*90;
        ctx.beginPath();
        ctx.arc(x, y, 25+Math.sin(t+i)*5, 0, Math.PI*2);
        ctx.fill();
      }
      break;
    case 6: // Volcano - lava
      ctx.fillStyle = `rgba(255,80,0,${0.05+Math.sin(t*2)*0.03})`;
      currentTrack.centerPoints.forEach((p,i) => {
        if (i % 5 === 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 80, 0, Math.PI*2);
          ctx.fill();
        }
      });
      break;
    case 7: // Sky - clouds
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let i = 0; i < 5; i++) {
        const x = (t*20+i*200)%CW;
        ctx.beginPath();
        ctx.arc(x, 50+i*130, 30, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x+25, 50+i*130, 25, 0, Math.PI*2);
        ctx.fill();
      }
      break;
  }
}

function drawNeonBarriers() {
  const wp = currentTrack.centerPoints;
  const t = Date.now() * 0.001;
  for (let i = 0; i < wp.length; i += 3) {
    const a = (i / wp.length) * Math.PI * 2 + t;
    ctx.fillStyle = `rgba(0,255,255,${0.1+Math.sin(a)*0.05})`;
    const next = wp[(i+1)%wp.length];
    const perp = Math.atan2(next.y-wp[i].y, next.x-wp[i].x) + Math.PI/2;
    ctx.beginPath();
    ctx.arc(wp[i].x + Math.cos(perp)*TRACK_W/2, wp[i].y + Math.sin(perp)*TRACK_W/2, 4, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(wp[i].x - Math.cos(perp)*TRACK_W/2, wp[i].y - Math.sin(perp)*TRACK_W/2, 4, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawMinimap() {
  if (!mmCtx || !currentTrack) return;
  const mc = mmCtx;
  const mw = 140, mh = 140;
  mc.clearRect(0, 0, mw, mh);
  mc.fillStyle = 'rgba(0,0,0,0.5)';
  mc.fillRect(0, 0, mw, mh);

  // Scale factors
  const sx = mw / CW, sy = mh / CH;

  // Draw track outline
  const wp = currentTrack.centerPoints;
  mc.strokeStyle = currentTrack.accent + '60';
  mc.lineWidth = 3;
  mc.beginPath();
  wp.forEach((p, i) => {
    const px = p.x * sx, py = p.y * sy;
    if (i === 0) mc.moveTo(px, py);
    else mc.lineTo(px, py);
  });
  mc.closePath();
  mc.stroke();

  // Draw racers
  allRacers.forEach(r => {
    mc.fillStyle = r.isPlayer ? '#fff' : r.color;
    mc.beginPath();
    mc.arc(r.x * sx, r.y * sy, r.isPlayer ? 3 : 2, 0, Math.PI * 2);
    mc.fill();
  });
}

function updateHUD() {
  if (!player) return;
  document.getElementById('hud-lap').textContent = `LAP ${Math.min(player.lap+1, LAPS)}/${LAPS}`;
  document.getElementById('hud-pos').textContent = posName(player.racePos);
  document.getElementById('hud-pos').style.color = player.racePos === 1 ? '#ff0' : player.racePos <= 3 ? '#0ff' : '#fff';
  document.getElementById('hud-time').textContent = formatTime(raceTime);
  document.getElementById('hud-speed').textContent = `${Math.round(player.speed * 50)} km/h`;

  if (player.item !== null) {
    document.getElementById('hud-item-icon').textContent = ITEM_TYPES[player.item].icon;
    document.getElementById('hud-item-box').style.borderColor = ITEM_TYPES[player.item].color;
  } else {
    document.getElementById('hud-item-icon').textContent = '-';
    document.getElementById('hud-item-box').style.borderColor = 'rgba(0,255,255,0.5)';
  }
}

// ============================================================
// RACE FINISH
// ============================================================
function finishRace() {
  state = 'results';
  stopEngineLoop();

  const sorted = [...allRacers].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.totalDist - a.totalDist;
  });

  const playerPos = sorted.indexOf(player) + 1;
  const coinsEarned = Math.max(1, (8 - playerPos) * 5 + Math.floor(saveData.coins * 0));
  const xpEarned = Math.max(5, (8 - playerPos) * 10 + 5);

  saveData.coins += coinsEarned;
  saveData.xp += xpEarned;

  // Level up check
  while (saveData.xp >= xpForLevel(saveData.level)) {
    saveData.xp -= xpForLevel(saveData.level);
    saveData.level++;
    if (saveData.level >= 10) unlockAchievement('level_10');
  }

  // Achievement checks
  if (playerPos === 1) {
    unlockAchievement('first_win');
    if (!saveData.tracksWon.includes(trackIdx)) saveData.tracksWon.push(trackIdx);
    if (saveData.tracksWon.length >= 8) unlockAchievement('grand_slam');
    if (!player.hitThisRace) unlockAchievement('perfect_race');
    if (saveData.wasLastPlace) unlockAchievement('comeback'); // was last during race, won
    saveData.wasLastPlace = false;
  }

  if (saveData.totalDriftTime >= 30000) unlockAchievement('drift_king');
  if (saveData.totalCoinsCollected >= 500) unlockAchievement('coin_hunter');
  if (player.speed >= player.maxSpeed * 0.98) unlockAchievement('speed_demon');

  // Championship points
  if (championship.active) {
    const pts = POINTS_TABLE[playerPos - 1] || 0;
    championship.standings['You'] = (championship.standings['You'] || 0) + pts;
    aiRacers.forEach((ai, i) => {
      const aiPos = sorted.indexOf(ai) + 1;
      championship.standings[ai.name] = (championship.standings[ai.name] || 0) + (POINTS_TABLE[aiPos-1] || 0);
    });
  }

  // Show results
  const resultsEl = document.getElementById('results-positions');
  resultsEl.innerHTML = '';
  sorted.forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'result-row' + (r.isPlayer ? ' player' : '');
    const timeStr = r.finished ? formatTime(r.finishTime) : 'DNF';
    row.innerHTML = `<span class="result-pos">${posName(i+1)}</span><span class="result-name">${r.name}</span><span class="result-time">${timeStr}</span>`;
    resultsEl.appendChild(row);
  });

  document.getElementById('results-stats').innerHTML =
    `Position: ${posName(playerPos)} | Coins: +${coinsEarned} | XP: +${xpEarned}`;

  // Check for rewarded ad eligibility
  const rewardsEl = document.getElementById('results-rewards');
  if (playerPos <= 3) {
    rewardsEl.className = '';
    rewardsEl.innerHTML = '🎉 Great finish! Bonus coins available!';
  } else {
    rewardsEl.className = 'hidden';
  }

  showScreen('results-screen');
  saveSave();
  if (playerPos === 1) playSound('victory');
}

// ============================================================
// AD SYSTEM
// ============================================================
function showInterstitialAd(callback) {
  state = 'ad';
  let timer = 3;
  document.getElementById('ad-timer').textContent = `Closing in ${timer}...`;
  showScreen('ad-screen');
  const interval = setInterval(() => {
    timer--;
    if (timer <= 0) {
      clearInterval(interval);
      callback();
    } else {
      document.getElementById('ad-timer').textContent = `Closing in ${timer}...`;
    }
  }, 1000);
}

function showRewardedAd(callback) {
  state = 'rewarded-ad';
  showScreen('rewarded-ad-screen');
  window._rewardedCallback = callback;
}

// ============================================================
// CHAMPIONSHIP
// ============================================================
function startChampionship() {
  championship.active = true;
  championship.raceIndex = 0;
  championship.standings = {};
  allRacers && allRacers.forEach(r => {
    championship.standings[r.name] = 0;
  });
  ['You', ...AI_NAMES].forEach(n => championship.standings[n] = 0);
  startRace(0);
}

function continueChampionship() {
  championship.raceIndex++;

  // Check if player won championship
  const sorted = Object.entries(championship.standings).sort((a, b) => b[1] - a[1]);
  const playerChampPos = sorted.findIndex(e => e[0] === 'You') + 1;

  if (championship.raceIndex >= 8) {
    // Championship over
    championship.active = false;
    if (playerChampPos === 1) {
      unlockAchievement('champion');
    }
    showChampionshipResults(playerChampPos);
    return;
  }

  // Show standings
  const table = document.getElementById('standings-table');
  table.innerHTML = '';
  sorted.forEach(([name, pts], i) => {
    const row = document.createElement('div');
    row.className = 'standing-row' + (name === 'You' ? ' player' : '');
    row.innerHTML = `<span class="standing-pos">${posName(i+1)}</span><span class="standing-name">${name}</span><span class="standing-pts">${pts}</span>`;
    table.appendChild(row);
  });

  document.getElementById('standings-info').textContent =
    `Race ${championship.raceIndex + 1} of 8: ${tracks[championship.raceIndex].name}`;

  showScreen('standings-screen');
}

function nextChampionshipRace() {
  showInterstitialAd(() => {
    startRace(championship.raceIndex);
  });
}

function showChampionshipResults(playerPos) {
  const sorted = Object.entries(championship.standings).sort((a, b) => b[1] - a[1]);
  const table = document.getElementById('standings-table');
  table.innerHTML = '';
  sorted.forEach(([name, pts], i) => {
    const row = document.createElement('div');
    row.className = 'standing-row' + (name === 'You' ? ' player' : '');
    row.innerHTML = `<span class="standing-pos">${posName(i+1)}</span><span class="standing-name">${name}</span><span class="standing-pts">${pts}</span>`;
    table.appendChild(row);
  });

  if (playerPos === 1) {
    document.getElementById('victory-msg').textContent =
      `Congratulations! You won the Grand Circuit Championship with ${championship.standings['You']} points!`;
    document.getElementById('victory-stats').innerHTML = '';
    showScreen('victory-screen');
  } else {
    document.getElementById('results-title').textContent = 'Championship Results';
    document.getElementById('results-stats').innerHTML = `You finished ${posName(playerPos)} in the championship`;
    document.getElementById('results-rewards').className = 'hidden';
    document.querySelector('#results-screen .neon-btn').textContent = 'Main Menu';
    showScreen('results-screen');
  }
}

// ============================================================
// ACHIEVEMENTS
// ============================================================
function unlockAchievement(id) {
  if (saveData.achievements.includes(id)) return;
  saveData.achievements.push(id);
  saveSave();
}

function renderAchievements() {
  const list = document.getElementById('achievements-list');
  list.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const unlocked = saveData.achievements.includes(a.id);
    const row = document.createElement('div');
    row.className = 'achievement-row ' + (unlocked ? 'unlocked' : 'locked');
    row.innerHTML = `<span class="achievement-icon">${a.icon}</span><div class="achievement-info"><div class="achievement-name">${a.name}</div><div class="achievement-desc">${a.desc}</div></div>`;
    list.appendChild(row);
  });
}

// ============================================================
// GARAGE
// ============================================================
function renderGarage() {
  const u = saveData.upgrades;
  const stats = document.getElementById('garage-stats');
  const statNames = ['Speed', 'Accel', 'Handling', 'Armor'];
  const statKeys = ['speed', 'accel', 'handling', 'armor'];
  stats.innerHTML = '';
  statKeys.forEach((key, i) => {
    const div = document.createElement('div');
    div.className = 'garage-stat';
    div.innerHTML = `<div class="stat-label">${statNames[i]}</div><div class="stat-val">${u[key]}/4</div>`;
    stats.appendChild(div);
  });

  const upgradesEl = document.getElementById('garage-upgrades');
  upgradesEl.innerHTML = '';
  statKeys.forEach((key, i) => {
    const cost = (u[key] + 1) * 50;
    const maxed = u[key] >= 4;
    const btn = document.createElement('button');
    btn.className = 'upgrade-btn' + (maxed ? ' maxed' : '');
    btn.textContent = maxed ? `${statNames[i]} MAX` : `Upgrade ${statNames[i]} 🪙${cost}`;
    if (!maxed) {
      btn.onclick = () => {
        if (saveData.coins >= cost) {
          saveData.coins -= cost;
          u[key]++;
          saveSave();
          renderGarage();
          playSound('item');
        }
      };
    }
    upgradesEl.appendChild(btn);
  });

  document.getElementById('garage-coin-count').textContent = saveData.coins;
}

// ============================================================
// PAUSE / RESUME
// ============================================================
function pauseRace() {
  if (state !== 'playing') return;
  state = 'paused';
  stopEngineLoop();
  showScreen('pause-screen');
}
function resumeRace() {
  if (state !== 'paused') return;
  state = 'playing';
  startEngineLoop();
  showScreen('hud');
}

// ============================================================
// INPUT SYSTEM
// ============================================================
const keys = {
  up: false, down: false, left: false, right: false,
  space: false, shift: false,
  leftStickX: 0, rightTrigger: 0, leftTrigger: 0,
  gamepadX: false, gamepadY: false
};

document.addEventListener('keydown', e => {
  initAudio();
  switch(e.code) {
    case 'ArrowUp': case 'KeyW': keys.up = true; e.preventDefault(); break;
    case 'ArrowDown': case 'KeyS': keys.down = true; e.preventDefault(); break;
    case 'ArrowLeft': case 'KeyA': keys.left = true; e.preventDefault(); break;
    case 'ArrowRight': case 'KeyD': keys.right = true; e.preventDefault(); break;
    case 'Space': keys.space = true; e.preventDefault(); break;
    case 'ShiftLeft': case 'ShiftRight': keys.shift = true; break;
    case 'Escape':
      if (state === 'playing') pauseRace();
      else if (state === 'paused') resumeRace();
      break;
  }
});

document.addEventListener('keyup', e => {
  switch(e.code) {
    case 'ArrowUp': case 'KeyW': keys.up = false; break;
    case 'ArrowDown': case 'KeyS': keys.down = false; break;
    case 'ArrowLeft': case 'KeyA': keys.left = false; break;
    case 'ArrowRight': case 'KeyD': keys.right = false; break;
    case 'Space': keys.space = false; break;
    case 'ShiftLeft': case 'ShiftRight': keys.shift = false; break;
  }
});

// Gamepad
function pollGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gamepads) {
    if (!gp) continue;
    // Left stick
    keys.leftStickX = gp.axes[0] || 0;
    // Triggers (varies by browser)
    if (gp.buttons[6]) keys.leftTrigger = gp.buttons[6].value;
    if (gp.buttons[7]) keys.rightTrigger = gp.buttons[7].value;
    // Buttons
    if (gp.buttons[0] && gp.buttons[0].pressed) keys.rightTrigger = Math.max(keys.rightTrigger, 0.5); // A=accel
    if (gp.buttons[1] && gp.buttons[1].pressed) keys.leftTrigger = Math.max(keys.leftTrigger, 0.5); // B=brake
    keys.gamepadX = gp.buttons[2] && gp.buttons[2].pressed; // X=item
    keys.gamepadY = gp.buttons[3] && gp.buttons[3].pressed; // Y=drift
    // Start = pause
    if (gp.buttons[9] && gp.buttons[9].pressed && state === 'playing') pauseRace();
    break;
  }
}

// Mobile touch controls
function setupTouchControls() {
  const touchLeft = document.getElementById('touch-left');
  const touchRight = document.getElementById('touch-right');
  const touchItem = document.getElementById('touch-item');
  const touchAccel = document.getElementById('touch-accel');
  const touchBrake = document.getElementById('touch-brake');

  function addTouchEvents(el, onDown, onUp) {
    el.addEventListener('touchstart', e => { e.preventDefault(); initAudio(); onDown(); });
    el.addEventListener('touchend', e => { e.preventDefault(); onUp(); });
    el.addEventListener('touchcancel', e => { e.preventDefault(); onUp(); });
  }

  addTouchEvents(touchLeft, () => keys.left = true, () => keys.left = false);
  addTouchEvents(touchRight, () => keys.right = true, () => keys.right = false);
  addTouchEvents(touchItem, () => { keys.space = true; setTimeout(() => keys.space = false, 100); }, () => {});
  if (touchAccel) addTouchEvents(touchAccel, () => keys.up = true, () => keys.up = false);
  if (touchBrake) addTouchEvents(touchBrake, () => keys.down = true, () => keys.down = false);
}

// ============================================================
// GAME LOOP
// ============================================================
let lastTime = 0;
let countdownTimer = 0;

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;

  pollGamepad();

  switch(state) {
    case 'menu':
      updateMenuStats();
      break;

    case 'countdown':
      countdownTimer += dt;
      if (countdownTimer >= 1000) {
        countdownTimer -= 1000;
        countdown--;
        if (countdown > 0) {
          playSound('countdown');
        } else if (countdown === 0) {
          playSound('go');
        }
      }
      if (countdown <= -1) {
        state = 'playing';
        startEngineLoop();
        document.getElementById('hud-countdown').classList.add('hidden');
      } else {
        const cdEl = document.getElementById('hud-countdown');
        cdEl.classList.remove('hidden');
        cdEl.textContent = countdown > 0 ? countdown : 'GO!';
        cdEl.style.color = countdown > 0 ? '#0ff' : '#0f0';
      }
      render();
      break;

    case 'playing':
      raceTime += dt;

      // Update racers
      allRacers.forEach(r => r.update(dt, keys));
      updatePositions();

      // Track if player was ever in last place during this race
      if (player.racePos >= 7) saveData.wasLastPlace = true;

      // Check item boxes
      allRacers.forEach(r => checkItemBoxes(r));

      // Update missiles & hazards
      updateMissiles();
      updateHazards();
      updateParticles();

      // Check race end
      if (player.finished && !raceFinished) {
        // Wait for AI to finish or timeout
        raceFinished = true;
        setTimeout(() => {
          // Force finish remaining
          allRacers.forEach(r => {
            if (!r.finished) { r.finished = true; r.finishTime = raceTime + 10000; }
          });
          finishRace();
        }, 2000);
      }

      render();
      break;

    case 'paused':
      render();
      break;

    case 'results':
    case 'ad':
    case 'rewarded-ad':
      // Handled by screen system
      break;
  }
}

// ============================================================
// PUBLIC API (GC object)
// ============================================================
window.GC = {
  championship() {
    initAudio();
    startChampionship();
  },

  quickRace() {
    initAudio();
    buildTrackSelect();
    showScreen('track-select-screen');
    state = 'track-select';
  },

  showMenu() {
    state = 'menu';
    championship.active = false;
    stopEngineLoop();
    showScreen('menu-screen');
    updateMenuStats();
    document.querySelector('#results-screen .neon-btn').textContent = 'Continue';
  },

  showGarage() {
    renderGarage();
    showScreen('garage-screen');
  },

  showAchievements() {
    renderAchievements();
    showScreen('achievements-screen');
  },

  showControls() {
    showScreen('controls-screen');
  },

  pause() { pauseRace(); },

  resume() { resumeRace(); },

  continueResults() {
    if (championship.active) {
      continueChampionship();
    } else {
      // Offer rewarded ad
      showRewardedAd(() => {
        saveData.coins += 20;
        saveSave();
        GC.showMenu();
      });
    }
  },

  nextChampionshipRace() {
    nextChampionshipRaceInternal();
  },

  nextChampionshipRaceInternal() {
    showInterstitialAd(() => {
      startRace(championship.raceIndex);
    });
  },

  claimReward() {
    saveData.coins += 20;
    saveSave();
    playSound('coin');
    if (window._rewardedCallback) window._rewardedCallback();
    GC.showMenu();
  },

  skipReward() {
    GC.showMenu();
  }
};

// ============================================================
// INITIALIZATION
// ============================================================
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  mmCanvas = document.getElementById('minimapCanvas');
  mmCtx = mmCanvas.getContext('2d');

  loadSave();
  loadNGN4Coins();
  tracks = makeTracks();
  setupTouchControls();
  showScreen('menu-screen');
  updateMenuStats();
  requestAnimationFrame(gameLoop);
}

// Start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
