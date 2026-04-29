// ═══════════════════════════════════════════
// NGN4 — GAME 32: COSMIC FLIP (Pinball)
// Canvas 2D Pinball Simulation
// ═══════════════════════════════════════════
(function() {
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('cosmic-flip'); } catch(e) {}


let canvas, ctx;
let audioCtx;
let score = 0;
let ballsLeft = 3;
let combo = 1;
let comboTimer = 0;
let jackpot = 0;
let ballSaveTime = 3;
let currentTable = 'neon';
let gameOver = false;
let launching = false;
let launchPower = 0;
let animFrame;
let lastTime = 0;
let multiballActive = false;
let ballSaveActive = false;
let ballSaveTimer = 0;
let jackpotMode = false;
let jackpotModeTimer = 0;
let maxCombo = 1;
let totalTablesPlayed = new Set();
let achievements = JSON.parse(localStorage.getItem('ngn4_pinball_achievements') || '{}');

// Physics constants
const GRAVITY = 0.15;
const FRICTION = 0.999;
const BALL_RADIUS = 8;
const FLIPPER_LEN = 55;
const FLIPPER_WIDTH = 8;

// Game objects
let balls = [];
let flippers = [];
let bumpers = [];
let ramps = [];
let targets = [];
let kickbacks = [];
let slingshots = [];
let spinners = [];
let walls = [];
let particles = [];

const TABLES = {
  neon:   { bg1:'#0a001a', bg2:'#1a0030', accent:'#f0f', accent2:'#0ff', wall:'#f0f' },
  galaxy: { bg1:'#000520', bg2:'#001040', accent:'#0af', accent2:'#a0f', wall:'#0af' },
  void:   { bg1:'#0a0000', bg2:'#200010', accent:'#f44', accent2:'#f80', wall:'#f44' }
};

let highScores = JSON.parse(localStorage.getItem('ngn4_pinball_scores') || '{}');

// ── Audio ──
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playSound(freq, dur, type='square', vol=0.08) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}
function sndBumper() { playSound(800, 0.1); }
function sndFlipper() { playSound(200, 0.08, 'sawtooth'); }
function sndLaunch() { playSound(150, 0.3, 'sawtooth', 0.06); }
function sndJackpot() { [523,659,784,1047].forEach((f,i) => setTimeout(() => playSound(f, 0.2, 'sine', 0.1), i*80)); }
function sndDrain() { playSound(100, 0.5, 'sawtooth', 0.06); }
function sndSlingshot() { playSound(600, 0.12, 'triangle', 0.1); }
function sndSpinner() { playSound(1200, 0.05, 'sine', 0.04); }
function sndMultiball() { [300,400,500,600,800].forEach((f,i) => setTimeout(() => playSound(f, 0.15, 'sine', 0.1), i*60)); }
function sndAchieve() { [523,659,784,1047].forEach((f,i) => setTimeout(() => playSound(f, 0.15, 'sine', 0.1), i*60)); }

// ── Rewards ──
function getRewards() { try { return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, gems: 0 }; } catch { return { coins: 0, gems: 0 }; } }
function getCoins() { return getRewards().coins || 0; }
function addCoins(n) {
  const r = getRewards(); r.coins = (r.coins || 0) + n;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
  document.getElementById('coins').textContent = r.coins;
}

// ── Achievements ──
function unlockAchievement(id, name) {
  if(achievements[id]) return;
  achievements[id] = true;
  localStorage.setItem('ngn4_pinball_achievements', JSON.stringify(achievements));
  sndAchieve();
  // Also unlock via NGN4 system
  try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.unlock('pinball_' + id, name); } catch(e) {}
  const el = document.getElementById('achieve-toast');
  if(el){ el.textContent='🏆 '+name; el.style.opacity='1'; setTimeout(()=>el.style.opacity='0', 3000); }
}

// ── Particle System ──
function spawnParticles(x, y, color, count=8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * (2 + Math.random() * 3),
      vy: Math.sin(angle) * (2 + Math.random() * 3),
      life: 1,
      decay: 0.02 + Math.random() * 0.03,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Ball ──
function createBall(x, y) {
  return { x, y, vx: 0, vy: 0, active: true, trail: [] };
}

// ── Setup Table ──
function setupTable() {
  const t = TABLES[currentTable];
  bumpers = [];
  ramps = [];
  targets = [];
  kickbacks = [];
  slingshots = [];
  spinners = [];
  walls = [];

  // Main walls (same for all tables)
  walls.push({ x1: 30, y1: 0, x2: 30, y2: 580 });
  walls.push({ x1: 30, y1: 0, x2: 370, y2: 0 });
  walls.push({ x1: 370, y1: 0, x2: 370, y2: 580 });
  walls.push({ x1: 370, y1: 0, x2: 395, y2: 0 });
  walls.push({ x1: 395, y1: 0, x2: 395, y2: 680 });
  walls.push({ x1: 370, y1: 80, x2: 395, y2: 80 });
  walls.push({ x1: 30, y1: 580, x2: 120, y2: 640 });
  walls.push({ x1: 370, y1: 580, x2: 280, y2: 640 });

  // Flippers
  flippers = [
    { x: 130, y: 635, angle: 0.4, targetAngle: 0.4, restAngle: 0.4, activeAngle: -0.6, side: 'left' },
    { x: 270, y: 635, angle: Math.PI - 0.4, targetAngle: Math.PI - 0.4, restAngle: Math.PI - 0.4, activeAngle: Math.PI + 0.6, side: 'right' }
  ];

  // Slingshots (triangular kickers near flippers)
  slingshots.push({ x1: 85, y1: 580, x2: 85, y2: 610, x3: 115, y2: 610, hitTimer: 0, force: 6 });
  slingshots.push({ x1: 315, y1: 580, x2: 315, y2: 610, x3: 285, y2: 610, hitTimer: 0, force: 6 });

  if (currentTable === 'neon') {
    // Standard layout
    const bumperPositions = [
      {x: 140, y: 180}, {x: 260, y: 180}, {x: 200, y: 130},
      {x: 120, y: 300}, {x: 280, y: 300}, {x: 200, y: 250},
      {x: 150, y: 400}, {x: 250, y: 400}, {x: 200, y: 350},
      {x: 200, y: 480}
    ];
    bumperPositions.forEach((pos, i) => {
      bumpers.push({ x: pos.x, y: pos.y, radius: 18, hitTimer: 0, points: 100 + i * 20, color: i < 3 ? t.accent : i < 6 ? t.accent2 : '#fff', hitCount: 0 });
    });
    targets.push({ x: 60, y: 100, w: 30, h: 80, hit: false, points: 500, label: 'R' });
    targets.push({ x: 60, y: 200, w: 30, h: 80, hit: false, points: 500, label: 'A' });
    targets.push({ x: 310, y: 100, w: 30, h: 80, hit: false, points: 500, label: 'M' });
    targets.push({ x: 310, y: 200, w: 30, h: 80, hit: false, points: 500, label: 'P' });
    targets.push({ x: 175, y: 50, w: 50, h: 25, hit: false, points: 1000, label: 'JP' });
    // Spinners
    spinners.push({ x: 200, y: 80, angle: 0, speed: 0, points: 50, hitTimer: 0 });
  } else if (currentTable === 'galaxy') {
    // Galaxy: wider, more bumpers
    const bumperPositions = [
      {x: 100, y: 150}, {x: 200, y: 120}, {x: 300, y: 150},
      {x: 80, y: 250}, {x: 160, y: 230}, {x: 240, y: 260}, {x: 320, y: 250},
      {x: 120, y: 350}, {x: 200, y: 330}, {x: 280, y: 350},
      {x: 150, y: 430}, {x: 250, y: 430},
      {x: 200, y: 500}
    ];
    bumperPositions.forEach((pos, i) => {
      bumpers.push({ x: pos.x, y: pos.y, radius: 20, hitTimer: 0, points: 80 + i * 15, color: i < 4 ? t.accent : i < 8 ? t.accent2 : '#aef', hitCount: 0 });
    });
    targets.push({ x: 50, y: 80, w: 25, h: 100, hit: false, points: 600, label: 'G' });
    targets.push({ x: 325, y: 80, w: 25, h: 100, hit: false, points: 600, label: 'X' });
    targets.push({ x: 50, y: 220, w: 25, h: 80, hit: false, points: 500, label: 'A' });
    targets.push({ x: 325, y: 220, w: 25, h: 80, hit: false, points: 500, label: 'L' });
    targets.push({ x: 175, y: 40, w: 50, h: 25, hit: false, points: 1000, label: 'JP' });
    spinners.push({ x: 100, y: 300, angle: 0, speed: 0, points: 75, hitTimer: 0 });
    spinners.push({ x: 300, y: 300, angle: 0, speed: 0, points: 75, hitTimer: 0 });
  } else {
    // Void: narrower, fewer bumpers but more targets
    const bumperPositions = [
      {x: 150, y: 200}, {x: 250, y: 200},
      {x: 200, y: 300},
      {x: 120, y: 400}, {x: 280, y: 400},
      {x: 200, y: 500}
    ];
    bumperPositions.forEach((pos, i) => {
      bumpers.push({ x: pos.x, y: pos.y, radius: 22, hitTimer: 0, points: 150 + i * 30, color: i < 2 ? t.accent : i < 4 ? t.accent2 : '#f88', hitCount: 0 });
    });
    targets.push({ x: 60, y: 80, w: 25, h: 60, hit: false, points: 800, label: 'V' });
    targets.push({ x: 60, y: 170, w: 25, h: 60, hit: false, points: 700, label: 'O' });
    targets.push({ x: 60, y: 260, w: 25, h: 60, hit: false, points: 600, label: 'I' });
    targets.push({ x: 315, y: 80, w: 25, h: 60, hit: false, points: 800, label: 'D' });
    targets.push({ x: 315, y: 170, w: 25, h: 60, hit: false, points: 700, label: '!' });
    targets.push({ x: 175, y: 50, w: 50, h: 25, hit: false, points: 1000, label: 'JP' });
    spinners.push({ x: 200, y: 450, angle: 0, speed: 0, points: 100, hitTimer: 0 });
  }

  // Kickbacks (side bumpers near drain)
  kickbacks.push({ x: 80, y: 600, width: 20, height: 40, active: true, used: false });
  kickbacks.push({ x: 300, y: 600, width: 20, height: 40, active: true, used: false });
}

// ── Physics ──
function updateBall(ball, dt) {
  if (!ball.active) return;

  ball.vy += GRAVITY;
  ball.vx *= FRICTION;
  ball.vy *= FRICTION;

  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed > 15) {
    ball.vx = (ball.vx / speed) * 15;
    ball.vy = (ball.vy / speed) * 15;
  }

  ball.x += ball.vx;
  ball.y += ball.vy;

  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 15) ball.trail.shift();

  for (const w of walls) collideWall(ball, w);
  for (const b of bumpers) collideBumper(ball, b);
  for (const t of targets) {
    if (!t.hit && ball.x > t.x && ball.x < t.x + t.w && ball.y > t.y && ball.y < t.y + t.h) {
      t.hit = true;
      addScore(t.points);
      spawnParticles(t.x + t.w/2, t.y + t.h/2, TABLES[currentTable].accent, 12);
      playSound(600, 0.1, 'sine', 0.1);
      checkTargetsComplete();
    }
  }
  for (const k of kickbacks) {
    if (k.active && !k.used && ball.x > k.x && ball.x < k.x + k.width && ball.y > k.y && ball.y < k.y + k.height) {
      ball.vx = -ball.vx * 1.5;
      ball.vy = -Math.abs(ball.vy) - 3;
      k.used = true;
      addScore(200);
      spawnParticles(k.x + k.width/2, k.y, '#0f0', 8);
      playSound(400, 0.15, 'sawtooth');
    }
  }
  // Slingshot collisions
  for (const s of slingshots) {
    if (s.hitTimer > 0) { s.hitTimer -= dt; continue; }
    if (pointInTriangle(ball.x, ball.y, s.x1, s.y1, s.x2, s.y2, s.x3, s.y2)) {
      const cx = (s.x1+s.x2+s.x3)/3, cy = (s.y1+s.y2+s.y2)/3;
      const dx = ball.x - cx, dy = ball.y - cy;
      const dist = Math.max(1, Math.sqrt(dx*dx+dy*dy));
      ball.vx = (dx/dist) * s.force;
      ball.vy = (dy/dist) * s.force - 2;
      s.hitTimer = 0.2;
      addScore(100);
      spawnParticles(cx, cy, TABLES[currentTable].accent, 6);
      sndSlingshot();
    }
  }
  // Spinner collisions
  for (const sp of spinners) {
    if (sp.hitTimer > 0) { sp.hitTimer -= dt; continue; }
    const dx = ball.x - sp.x, dy = ball.y - sp.y;
    if (Math.sqrt(dx*dx+dy*dy) < 20) {
      sp.speed = 15;
      sp.hitTimer = 0.1;
      addScore(sp.points);
      sndSpinner();
    }
  }
  for (const f of flippers) collideFlipper(ball, f);

  if (ball.x < 30 + BALL_RADIUS) { ball.x = 30 + BALL_RADIUS; ball.vx = Math.abs(ball.vx) * 0.8; }
  if (ball.x > 395 - BALL_RADIUS) { ball.x = 395 - BALL_RADIUS; ball.vx = -Math.abs(ball.vx) * 0.8; }
  if (ball.y < BALL_RADIUS) { ball.y = BALL_RADIUS; ball.vy = Math.abs(ball.vy) * 0.8; }

  // Ball save
  if (ballSaveActive && ball.y > 650) {
    ball.y = 600;
    ball.vy = -8;
    ball.vx = (Math.random() - 0.5) * 3;
    ballSaveActive = false;
    spawnParticles(ball.x, ball.y, '#0f0', 10);
  }

  // Drain
  if (ball.y > 690) {
    ball.active = false;
    sndDrain();
  }
}

function pointInTriangle(px,py,x1,y1,x2,y2,x3,y3){
  const d1=sign(px,py,x1,y1,x2,y2), d2=sign(px,py,x2,y2,x3,y3), d3=sign(px,py,x3,y3,x1,y1);
  const hasNeg=(d1<0)||(d2<0)||(d3<0), hasPos=(d1>0)||(d2>0)||(d3>0);
  return !(hasNeg&&hasPos);
}
function sign(px,py,x1,y1,x2,y2){return(px-x2)*(y1-y2)-(x1-x2)*(py-y2);}

function collideWall(ball, w) {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const nx = -dy / len;
  const ny = dx / len;
  const bx = ball.x - w.x1;
  const by = ball.y - w.y1;
  const dist = bx * nx + by * ny;
  if (Math.abs(dist) < BALL_RADIUS) {
    const dot = ball.vx * nx + ball.vy * ny;
    ball.vx -= 2 * dot * nx;
    ball.vy -= 2 * dot * ny;
    ball.vx *= 0.85;
    ball.vy *= 0.85;
    ball.x += nx * (BALL_RADIUS - dist) * (dist > 0 ? 1 : -1);
    ball.y += ny * (BALL_RADIUS - dist) * (dist > 0 ? 1 : -1);
  }
}

function collideBumper(ball, bumper) {
  const dx = ball.x - bumper.x;
  const dy = ball.y - bumper.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = BALL_RADIUS + bumper.radius;
  if (dist < minDist && dist > 0) {
    const nx = dx / dist;
    const ny = dy / dist;
    const dot = ball.vx * nx + ball.vy * ny;
    ball.vx -= 2 * dot * nx;
    ball.vy -= 2 * dot * ny;
    ball.vx += nx * 2;
    ball.vy += ny * 2;
    ball.x = bumper.x + nx * minDist;
    ball.y = bumper.y + ny * minDist;
    if (bumper.hitTimer <= 0) {
      bumper.hitTimer = 0.3;
      bumper.hitCount = (bumper.hitCount || 0) + 1;
      addScore(bumper.points);
      sndBumper();
      spawnParticles(bumper.x, bumper.y, bumper.color, 6);
      chargeMultiball();
    }
  }
}

function collideFlipper(ball, flipper) {
  const endX = flipper.x + Math.cos(flipper.angle) * FLIPPER_LEN;
  const endY = flipper.y + Math.sin(flipper.angle) * FLIPPER_LEN;
  const dx = endX - flipper.x;
  const dy = endY - flipper.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const nx = -dy / len;
  const ny = dx / len;
  const bx = ball.x - flipper.x;
  const by = ball.y - flipper.y;
  const dist = bx * nx + by * ny;
  const along = bx * (dx / len) + by * (dy / len);
  if (along < -BALL_RADIUS || along > len + BALL_RADIUS) return;
  if (Math.abs(dist) < BALL_RADIUS + FLIPPER_WIDTH) {
    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0 || Math.abs(dist) < BALL_RADIUS) {
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;
      if (flipper.side === 'left' && (keys['z'] || keys['a'] || touchLeftFlip)) {
        ball.vy -= 8; ball.vx += 3;
      }
      if (flipper.side === 'right' && (keys['m'] || keys['l'] || touchRightFlip)) {
        ball.vy -= 8; ball.vx -= 3;
      }
      ball.x += nx * (BALL_RADIUS + FLIPPER_WIDTH - Math.abs(dist)) * (dist > 0 ? 1 : -1);
      ball.y += ny * (BALL_RADIUS + FLIPPER_WIDTH - Math.abs(dist)) * (dist > 0 ? 1 : -1);
    }
  }
}

// ── Score & Combo ──
function addScore(pts) {
  const mult = jackpotMode ? 2 : 1;
  const earned = pts * combo * mult;
  score += earned;
  comboTimer = 2;
  combo = Math.min(combo + 1, 10);
  if (combo > maxCombo) maxCombo = combo;
  jackpot += Math.floor(pts * 0.1);
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('combo').textContent = `x${combo}`;
  document.getElementById('jackpot').textContent = jackpot.toLocaleString();
  if (score >= 100000) unlockAchievement('high_roller', 'High Roller');
}

function checkTargetsComplete() {
  const rampTargets = targets.slice(0, 4);
  if (rampTargets.length >= 4 && rampTargets.every(t => t.hit)) {
    // Enter Jackpot Mode
    jackpotMode = true;
    jackpotModeTimer = 15;
    unlockAchievement('jackpot', 'Jackpot');
    addScore(jackpot || 5000);
    jackpot = 0;
    sndJackpot();
    rampTargets.forEach(t => t.hit = false);
    if (targets[4]) targets[4].hit = false;
    spawnParticles(200, 300, '#ffd700', 20);
    // RAMP completion also triggers multiball
    if (!multiballActive) {
      multiballCharge = 0;
      triggerMultiball();
    }
  }
  if (targets.length > 4 && targets[4].hit) {
    score += 5000;
    sndJackpot();
    targets[4].hit = false;
    spawnParticles(200, 62, '#ffd700', 15);
  }
}

// ── Touch Controls ──
let touchLeftFlip = false, touchRightFlip = false, touchLaunch = false;

function setupTouchControls() {
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    initAudio();
    for (const touch of e.changedTouches) {
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const w = rect.width;
      const relX = x / w;
      if (y > rect.height * 0.5) {
        if (relX < 0.33) touchLeftFlip = true;
        else if (relX > 0.66) touchRightFlip = true;
      }
      if (y < rect.height * 0.15) {
        touchLaunch = true;
        launching = true;
        launchPower = 0;
      }
    }
  }, {passive: false});

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    touchLeftFlip = false;
    touchRightFlip = false;
    if (touchLaunch && launching) {
      launchBall();
      touchLaunch = false;
    }
  }, {passive: false});
}

// ── Gamepad ──
let gpButtons = {};
function pollGamepad() {
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gps[0];
  if (!gp) return;
  const pressed = {};
  for (let i = 0; i < gp.buttons.length; i++) pressed[i] = gp.buttons[i].pressed;
  // D-pad or left stick for flippers
  if (gp.axes[0] < -0.5 || pressed[14]) touchLeftFlip = true; else if (!keys['z'] && !keys['a']) touchLeftFlip = false;
  if (gp.axes[0] > 0.5 || pressed[15]) touchRightFlip = true; else if (!keys['m'] && !keys['l']) touchRightFlip = false;
  // A = launch
  if (pressed[0] && !gpButtons[0] && !launching) { launching = true; launchPower = 0; touchLaunch = true; }
  if (!pressed[0] && gpButtons[0] && launching) { launchBall(); touchLaunch = false; }
  gpButtons = pressed;
}

// ── Input ──
let keys = {};
document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ' || e.key === 'Space') {
    e.preventDefault();
    if (!launching && !gameOver) {
      launching = true;
      launchPower = 0;
    }
  }
});
document.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
  if (e.key === ' ' && launching) {
    launchBall();
  }
});

function launchBall() {
  if (ballsLeft <= 0 || gameOver) { launching = false; return; }
  launching = false;
  const ball = createBall(383, 640);
  ball.vy = -(5 + launchPower * 10);
  ball.vx = -1;
  balls.push(ball);
  sndLaunch();

  // Ball save
  ballSaveActive = true;
  ballSaveTimer = ballSaveTime;
}

function triggerMultiball() {
  if (multiballActive || gameOver) return;
  multiballActive = true;
  // Find the current active ball position to spawn from
  const refBall = balls.find(b => b.active);
  const spawnX = refBall ? refBall.x : 200;
  const spawnY = refBall ? refBall.y : 200;
  // Spawn 3 extra balls from current ball position
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 / 3) * i + Math.random() * 0.5;
    const ball2 = createBall(spawnX, spawnY);
    ball2.vy = Math.sin(angle) * (3 + Math.random() * 3);
    ball2.vx = Math.cos(angle) * (3 + Math.random() * 3);
    balls.push(ball2);
  }
  sndMultiball();
  spawnParticles(spawnX, spawnY, '#ffd700', 20);
  unlockAchievement('multiball_master', 'Multiball Master');
}

// Multiball charge: hitting all bumpers charges the multiball meter
let multiballCharge = 0;
const MULTIBALL_NEEDED = 8;
function chargeMultiball() {
  multiballCharge++;
  if (multiballCharge >= MULTIBALL_NEEDED && !multiballActive) {
    triggerMultiball();
    multiballCharge = 0;
  }
}

// ── Update ──
function update(dt) {
  if (gameOver) return;
  pollGamepad();

  if (launching) launchPower = Math.min(1, launchPower + dt * 1.5);

  // Jackpot mode timer
  if (jackpotMode) {
    jackpotModeTimer -= dt;
    if (jackpotModeTimer <= 0) jackpotMode = false;
  }

  // Update flippers
  for (const f of flippers) {
    if (f.side === 'left' && (keys['z'] || keys['a'] || touchLeftFlip)) {
      f.targetAngle = f.activeAngle;
    } else if (f.side === 'right' && (keys['m'] || keys['l'] || touchRightFlip)) {
      f.targetAngle = f.activeAngle;
    } else {
      f.targetAngle = f.restAngle;
    }
    f.angle += (f.targetAngle - f.angle) * 0.3;
  }

  // Update spinners
  for (const sp of spinners) {
    sp.angle += sp.speed * dt;
    sp.speed *= 0.97;
    if (sp.speed > 0.5 && !sp._scored) {
      sp._scored = true;
      addScore(sp.points > 75 ? 5 : 3);
    }
    if (sp.speed <= 0.5) sp._scored = false;
  }

  // Update balls
  for (const ball of balls) updateBall(ball, dt);

  // Ball count display
  const activeBalls = balls.filter(b => b.active);
  document.getElementById('balls-left').textContent = multiballActive ? activeBalls.length : ballsLeft;

  // Remove inactive balls
  if (activeBalls.length === 0 && balls.length > 0) {
    balls = [];
    if (multiballActive) {
      multiballActive = false;
    } else {
      ballsLeft--;
    }
    kickbacks.forEach(k => k.used = false);
    if (ballsLeft <= 0) {
      endGame();
    } else {
      launching = false;
    }
  }

  // Combo decay
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) { combo = 1; document.getElementById('combo').textContent = 'x1'; }
  }

  // Ball save timer
  if (ballSaveActive) {
    ballSaveTimer -= dt;
    if (ballSaveTimer <= 0) ballSaveActive = false;
  }

  for (const b of bumpers) { if (b.hitTimer > 0) b.hitTimer -= dt; }

  updateParticles(dt);
}

// ── Draw ──
function draw() {
  const t = TABLES[currentTable];

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, t.bg1);
  grad.addColorStop(1, t.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = t.accent + '15';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < canvas.width; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

  ctx.strokeStyle = t.wall; ctx.lineWidth = 2;
  for (const w of walls) { ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke(); }

  // Bumpers
  for (const b of bumpers) {
    const hit = b.hitTimer > 0;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = hit ? '#fff' : b.color + '44'; ctx.fill();
    ctx.strokeStyle = hit ? '#fff' : b.color; ctx.lineWidth = hit ? 3 : 2; ctx.stroke();
    if (hit) { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius + 5, 0, Math.PI * 2); ctx.strokeStyle = b.color + '66'; ctx.lineWidth = 1; ctx.stroke(); }
  }

  // Targets
  for (const tgt of targets) {
    ctx.fillStyle = tgt.hit ? '#0f06' : t.accent2 + '44';
    ctx.fillRect(tgt.x, tgt.y, tgt.w, tgt.h);
    ctx.strokeStyle = tgt.hit ? '#0f0' : t.accent2; ctx.lineWidth = 1; ctx.strokeRect(tgt.x, tgt.y, tgt.w, tgt.h);
    ctx.fillStyle = tgt.hit ? '#0f0' : '#fff'; ctx.font = '10px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(tgt.label, tgt.x + tgt.w/2, tgt.y + tgt.h/2 + 4);
  }

  // Kickbacks
  for (const k of kickbacks) {
    ctx.fillStyle = k.used ? '#333066' : '#0f044';
    ctx.fillRect(k.x, k.y, k.width, k.height);
    ctx.strokeStyle = k.used ? '#333' : '#0f0'; ctx.lineWidth = 2; ctx.strokeRect(k.x, k.y, k.width, k.height);
  }

  // Slingshots
  for (const s of slingshots) {
    const hit = s.hitTimer > 0;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.lineTo(s.x3, s.y3); ctx.closePath();
    ctx.fillStyle = hit ? '#fff3' : t.accent + '22'; ctx.fill();
    ctx.strokeStyle = hit ? '#fff' : t.accent; ctx.lineWidth = 2; ctx.stroke();
  }

  // Spinners
  for (const sp of spinners) {
    ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(sp.angle);
    ctx.strokeStyle = t.accent; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 15); ctx.stroke();
    ctx.restore();
    if (sp.speed > 1) {
      ctx.fillStyle = t.accent + '44'; ctx.beginPath(); ctx.arc(sp.x, sp.y, 18, 0, Math.PI*2); ctx.fill();
    }
  }

  // Flippers
  for (const f of flippers) {
    const endX = f.x + Math.cos(f.angle) * FLIPPER_LEN;
    const endY = f.y + Math.sin(f.angle) * FLIPPER_LEN;
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(endX, endY);
    ctx.strokeStyle = t.accent; ctx.lineWidth = FLIPPER_WIDTH; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.arc(f.x, f.y, 6, 0, Math.PI * 2); ctx.fillStyle = t.accent; ctx.fill();
  }

  // Balls
  for (const ball of balls) {
    if (!ball.active) continue;
    for (let i = 0; i < ball.trail.length; i++) {
      const alpha = i / ball.trail.length * 0.4;
      ctx.beginPath(); ctx.arc(ball.trail[i].x, ball.trail[i].y, BALL_RADIUS * (i / ball.trail.length), 0, Math.PI * 2);
      ctx.fillStyle = t.accent + Math.floor(alpha * 255).toString(16).padStart(2, '0'); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    const ballGrad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_RADIUS);
    ballGrad.addColorStop(0, '#fff'); ballGrad.addColorStop(1, t.accent);
    ctx.fillStyle = ballGrad; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
  }

  // Ball save indicator
  if (ballSaveActive) {
    ctx.fillStyle = '#0f0'; ctx.font = '12px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`BALL SAVE: ${Math.ceil(ballSaveTimer)}s`, 200, 670);
  }

  // Jackpot mode indicator
  if (jackpotMode) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 100);
    ctx.fillStyle = `rgba(255, 215, 0, ${0.1 + pulse * 0.2})`;
    ctx.fillRect(0, 0, 400, 680);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 16px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`★ JACKPOT MODE ★ ${Math.ceil(jackpotModeTimer)}s — 2x SCORING!`, 200, 20);
  }

  // Multiball charge meter (top-right)
  if (!multiballActive && multiballCharge > 0) {
    const pct = Math.min(1, multiballCharge / MULTIBALL_NEEDED);
    ctx.fillStyle = '#333'; ctx.fillRect(350, 30, 40, 8);
    ctx.fillStyle = pct >= 1 ? '#ffd700' : '#f0f'; ctx.fillRect(350, 30, 40 * pct, 8);
    ctx.strokeStyle = '#f0f6'; ctx.strokeRect(350, 30, 40, 8);
    ctx.fillStyle = '#f0f'; ctx.font = '9px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('MB ' + multiballCharge + '/' + MULTIBALL_NEEDED, 370, 48);
  }
  if (multiballActive) {
    const activeBalls = balls.filter(b => b.active);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'right';
    ctx.fillText('MULTIBALL x' + activeBalls.length, 393, 38);
  }

  // Launch power meter
  if (launching) {
    ctx.fillStyle = '#333'; ctx.fillRect(385, 640, 10, -100);
    ctx.fillStyle = t.accent; ctx.fillRect(385, 640, 10, -launchPower * 100);
    ctx.strokeStyle = t.accent; ctx.strokeRect(385, 540, 10, 100);
  }

  if (balls.length === 0 && !gameOver) {
    ctx.fillStyle = '#fff'; ctx.font = '14px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('Hold SPACE to charge, release to launch', 200, 660);
  }

  // Mobile touch zones hint
  ctx.fillStyle = '#ffffff08'; ctx.font = '10px Courier New'; ctx.textAlign = 'center';
  ctx.fillText('LEFT FLIP', 66, 665);
  ctx.fillText('RIGHT FLIP', 333, 665);

  drawParticles();
  ctx.textAlign = 'start';
}

// ── Game Loop ──
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  update(dt);
  draw();
  if (!gameOver) animFrame = requestAnimationFrame(gameLoop);
}

// ── End Game ──
function endGame() {
  gameOver = true;
  cancelAnimationFrame(animFrame);

  totalTablesPlayed.add(currentTable);
  if (totalTablesPlayed.size >= 3) unlockAchievement('table_complete', 'Table Complete');

  if (!highScores[currentTable] || score > highScores[currentTable]) {
    highScores[currentTable] = score;
    localStorage.setItem('ngn4_pinball_scores', JSON.stringify(highScores));
  }

  setTimeout(() => {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    const coinsEarned = Math.floor(score / 1000);
    document.getElementById('result-title').textContent = `GAME OVER — ${score.toLocaleString()}`;
    document.getElementById('result-stats').innerHTML =
      `Table: ${currentTable.toUpperCase()}<br>Final Score: ${score.toLocaleString()}<br>Max Combo: x${maxCombo}<br>High Score: ${(highScores[currentTable]||0).toLocaleString()}`;
    document.getElementById('rewards-earned').textContent = `🪙 +${coinsEarned} coins earned!`;
    addCoins(coinsEarned);
  }, 500);
}

// ── Init ──
function init() {
  canvas = document.getElementById('pinball-canvas');
  ctx = canvas.getContext('2d');
  document.getElementById('coins').textContent = getCoins();

  // Add achievement toast
  const toast = document.createElement('div');
  toast.id = 'achieve-toast';
  toast.style.cssText = 'position:fixed;top:50px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#ffd700,#f80);color:#000;padding:8px 20px;border-radius:6px;font:bold 14px monospace;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;';
  document.body.appendChild(toast);

  function updateHighScoreDisplay() {
    const el = document.getElementById('high-scores');
    const lines = Object.entries(highScores).map(([k,v]) => `${k.toUpperCase()}: ${v.toLocaleString()}`);
    el.textContent = lines.length ? 'HIGH SCORES\n' + lines.join('\n') : 'No scores yet';
  }
  updateHighScoreDisplay();

  document.querySelectorAll('.table-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.table-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTable = btn.dataset.table;
    });
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    initAudio();
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    startGame();
  });

  document.getElementById('play-again-btn').addEventListener('click', () => {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    startGame();
  });
  document.getElementById('result-menu-btn').addEventListener('click', () => {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
    updateHighScoreDisplay();
  });

  document.getElementById('watch-ad-btn').addEventListener('click', () => {
    const btn = document.getElementById('watch-ad-btn');
    btn.textContent = '⏳ Watching...'; btn.disabled = true;
    let sec = 30;
    const iv = setInterval(() => {
      sec--;
      btn.textContent = `⏳ ${sec}s...`;
      if (sec <= 0) { clearInterval(iv); btn.textContent = '✅ Watched!'; btn.style.background = '#0f0'; ballSaveTime = 8; }
    }, 1000);
  });

  setupTouchControls();
}

function startGame() {
  score = 0;
  ballsLeft = 3;
  combo = 1;
  comboTimer = 0;
  jackpot = 0;
  gameOver = false;
  launching = false;
  launchPower = 0;
  balls = [];
  particles = [];
  multiballActive = false;
  multiballCharge = 0;
  ballSaveActive = false;
  jackpotMode = false;
  jackpotModeTimer = 0;
  maxCombo = 1;

  setupTable();

  document.getElementById('score').textContent = '0';
  document.getElementById('balls-left').textContent = ballsLeft;
  document.getElementById('combo').textContent = 'x1';
  document.getElementById('jackpot').textContent = '0';

  lastTime = performance.now();
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', init);
})();
