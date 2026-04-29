// ═══════════════════════════════════════════
// NGN4 — GAME 34: FAIRWAY FURY (Mini Golf)
// Top-down Mini Golf with 18 Holes
// ═══════════════════════════════════════════
(function() {
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('fairway-fury'); } catch(e) {}


let canvas, ctx;
let audioCtx;
let ball = { x: 0, y: 0, vx: 0, vy: 0, r: 6 };
let hole = { x: 0, y: 0, r: 10 };
let currentHole = 0;
let strokes = 0;
let totalStrokes = 0;
let scores = [];
let aiming = false;
let aimStart = { x: 0, y: 0 };
let ballMoving = false;
let holeComplete = false;
let particles = [];
let trail = [];
let celebrationTimer = 0;
let animFrame;
let courseName = '';

const FRICTION = 0.985;
const SAND_FRICTION = 0.96;
const BOUNCE = 0.7;
const MAX_POWER = 15;
const MIN_SPEED = 0.1;

// ── Hole Definitions ──
// Each hole: { name, par, ball, hole, walls, water, sand, bumpers, wind, teleporters }
const HOLES = [
  // ─ Course 1: Neon City (Holes 1-6)
  {
    name: "Neon City 1 - Straight Shot", par: 2,
    ball: {x:100,y:200}, hole: {x:500,y:200},
    walls: [{x1:50,y1:150,x2:550,y2:150},{x1:50,y1:250,x2:550,y2:250}],
    water: [], sand: [], bumpers: [], wind: {x:0,y:0}, teleporters: [], course: 'Neon City'
  },
  {
    name: "Neon City 2 - The L-Bend", par: 3,
    ball: {x:100,y:100}, hole: {x:500,y:300},
    walls: [{x1:50,y1:50,x2:300,y2:50},{x1:50,y1:50,x2:50,y2:350},{x1:50,y1:350,x2:300,y2:350},
            {x1:300,y1:150,x2:300,y2:350},{x1:300,y1:350,x2:550,y2:350},{x1:550,y1:150,x2:550,y2:350},
            {x1:300,y1:150,x2:550,y2:150}],
    water: [], sand: [{x:350,y:250,w:60,h:60}], bumpers: [], wind: {x:0,y:0}, teleporters: [], course: 'Neon City'
  },
  {
    name: "Neon City 3 - Bumper Alley", par: 3,
    ball: {x:80,y:200}, hole: {x:520,y:200},
    walls: [{x1:50,y1:100,x2:550,y2:100},{x1:50,y1:300,x2:550,y2:300}],
    water: [], sand: [],
    bumpers: [{x:200,y:150,r:15},{x:300,y:250,r:15},{x:400,y:170,r:15},{x:250,y:200,r:12},{x:350,y:220,r:12}],
    wind: {x:0,y:0}, teleporters: [], course: 'Neon City'
  },
  {
    name: "Neon City 4 - Water Hazard", par: 3,
    ball: {x:100,y:200}, hole: {x:500,y:200},
    walls: [{x1:50,y1:100,x2:550,y2:100},{x1:50,y1:300,x2:550,y2:300}],
    water: [{x:220,y:120,w:160,h:160}],
    sand: [{x:400,y:240,w:60,h:40}], bumpers: [], wind: {x:0,y:0}, teleporters: [], course: 'Neon City'
  },
  {
    name: "Neon City 5 - Wind Tunnel", par: 3,
    ball: {x:100,y:350}, hole: {x:500,y:80},
    walls: [{x1:50,y1:50,x2:550,y2:50},{x1:50,y1:380,x2:550,y2:380}],
    water: [], sand: [],
    bumpers: [{x:300,y:200,r:20}],
    wind: {x:0.03,y:-0.04}, teleporters: [], course: 'Neon City'
  },
  {
    name: "Neon City 6 - Teleporter", par: 3,
    ball: {x:100,y:200}, hole: {x:500,y:300},
    walls: [{x1:50,y1:100,x2:350,y2:100},{x1:50,y1:300,x2:350,y2:300},{x1:50,y1:100,x2:50,y2:300},
            {x1:400,y1:250,x2:550,y2:250},{x1:400,y1:350,x2:550,y2:350},{x1:400,y1:250,x2:400,y2:350},
            {x1:550,y1:250,x2:550,y2:350}],
    water: [], sand: [],
    bumpers: [],
    wind: {x:0,y:0},
    teleporters: [{x1:300,y1:150,x2:450,y2:300}],
    course: 'Neon City'
  },
  // ─ Course 2: Crystal Cave (Holes 7-12)
  {
    name: "Crystal Cave 1 - Narrow Passage", par: 3,
    ball: {x:100,y:200}, hole: {x:500,y:200},
    walls: [{x1:50,y1:100,x2:550,y2:100},{x1:50,y1:300,x2:550,y2:300},{x1:250,y1:100,x2:250,y2:160},{x1:250,y1:240,x2:250,y2:300},{x1:350,y1:100,x2:350,y2:160},{x1:350,y1:240,x2:350,y2:300}],
    water: [], sand: [], bumpers: [], wind: {x:0,y:0}, teleporters: [], course: 'Crystal Cave'
  },
  {
    name: "Crystal Cave 2 - Diamond", par: 4,
    ball: {x:300,y:50}, hole: {x:300,y:350},
    walls: [{x1:150,y1:100,x2:300,y2:50},{x1:300,y1:50,x2:450,y2:100},{x1:450,y1:100,x2:450,y2:300},
            {x1:450,y1:300,x2:300,y2:350},{x1:300,y1:350,x2:150,y2:300},{x1:150,y1:300,x2:150,y2:100}],
    water: [{x:270,y:170,w:60,h:60}], sand: [{x:180,y:250,w:40,h:40}],
    bumpers: [{x:300,y:200,r:10}], wind: {x:0,y:0}, teleporters: [], course: 'Crystal Cave'
  },
  {
    name: "Crystal Cave 3 - Zigzag", par: 4,
    ball: {x:80,y:350}, hole: {x:520,y:80},
    walls: [{x1:50,y1:50,x2:550,y2:50},{x1:50,y1:380,x2:550,y2:380},
            {x1:200,y1:50,x2:200,y2:280},{x1:350,y1:120,x2:350,y2:380}],
    water: [], sand: [{x:250,y:300,w:80,h:40}], bumpers: [{x:430,y:150,r:12}], wind: {x:0,y:0}, teleporters: [], course: 'Crystal Cave'
  },
  {
    name: "Crystal Cave 4 - Bumper Room", par: 3,
    ball: {x:100,y:200}, hole: {x:500,y:200},
    walls: [{x1:50,y1:80,x2:550,y2:80},{x1:50,y1:320,x2:550,y2:320}],
    water: [], sand: [],
    bumpers: [{x:180,y:150,r:18},{x:250,y:250,r:18},{x:320,y:160,r:18},{x:390,y:240,r:18},{x:300,y:200,r:14}],
    wind: {x:0,y:0}, teleporters: [], course: 'Crystal Cave'
  },
  {
    name: "Crystal Cave 5 - Dual Water", par: 4,
    ball: {x:100,y:350}, hole: {x:500,y:80},
    walls: [{x1:50,y1:50,x2:550,y2:50},{x1:50,y1:380,x2:550,y2:380}],
    water: [{x:180,y:120,w:100,h:100},{x:350,y:220,w:100,h:100}],
    sand: [{x:100,y:240,w:60,h:50}],
    bumpers: [{x:300,y:350,r:14}], wind: {x:0.02,y:0}, teleporters: [], course: 'Crystal Cave'
  },
  {
    name: "Crystal Cave 6 - The Maze", par: 5,
    ball: {x:80,y:360}, hole: {x:520,y:60},
    walls: [{x1:50,y1:50,x2:550,y2:50},{x1:50,y1:380,x2:550,y2:380},
            {x1:50,y1:50,x2:50,y2:380},{x1:550,y1:50,x2:550,y2:380},
            {x1:150,y1:50,x2:150,y2:300},{x1:250,y1:100,x2:250,y2:380},
            {x1:350,y1:50,x2:350,y2:280},{x1:450,y1:130,x2:450,y2:380}],
    water: [], sand: [{x:160,y:320,w:80,h:40}],
    bumpers: [{x:200,y:150,r:10},{x:400,y:320,r:10}], wind: {x:0,y:0}, teleporters: [], course: 'Crystal Cave'
  },
  // ─ Course 3: Sky Islands (Holes 13-18)
  {
    name: "Sky Islands 1 - First Flight", par: 3,
    ball: {x:100,y:200}, hole: {x:500,y:200},
    walls: [{x1:50,y1:120,x2:180,y2:120},{x1:50,y1:280,x2:180,y2:280},
            {x1:380,y1:120,x2:550,y2:120},{x1:380,y1:280,x2:550,y2:280}],
    water: [{x:180,y:100,w:200,h:200}], sand: [],
    bumpers: [{x:300,y:200,r:15}], wind: {x:0.02,y:-0.01}, teleporters: [], course: 'Sky Islands'
  },
  {
    name: "Sky Islands 2 - Crosswind", par: 3,
    ball: {x:100,y:200}, hole: {x:500,y:200},
    walls: [{x1:50,y1:100,x2:550,y2:100},{x1:50,y1:300,x2:550,y2:300}],
    water: [{x:250,y:100,w:100,h:80}], sand: [{x:350,y:240,w:80,h:50}],
    bumpers: [],
    wind: {x:-0.06,y:0}, teleporters: [], course: 'Sky Islands'
  },
  {
    name: "Sky Islands 3 - Triple Jump", par: 4,
    ball: {x:80,y:200}, hole: {x:520,y:200},
    walls: [{x1:30,y1:140,x2:160,y2:140},{x1:30,y1:260,x2:160,y2:260},
            {x1:210,y1:110,x2:340,y2:110},{x1:210,y1:290,x2:340,y2:290},
            {x1:390,y1:140,x2:570,y2:140},{x1:390,y1:260,x2:570,y2:260}],
    water: [{x:160,y:120,w:50,h:160},{x:340,y:100,w:50,h:200}], sand: [],
    bumpers: [{x:270,y:200,r:12}], wind: {x:0.03,y:0}, teleporters: [], course: 'Sky Islands'
  },
  {
    name: "Sky Islands 4 - Gauntlet", par: 4,
    ball: {x:100,y:350}, hole: {x:500,y:80},
    walls: [{x1:50,y1:50,x2:550,y2:50},{x1:50,y1:380,x2:550,y2:380},
            {x1:200,y1:50,x2:200,y2:200},{x1:400,y1:180,x2:400,y2:380}],
    water: [{x:250,y:250,w:100,h:80}],
    sand: [{x:100,y:100,w:80,h:50}],
    bumpers: [{x:300,y:140,r:14},{x:470,y:150,r:12}],
    wind: {x:0.02,y:-0.03}, teleporters: [], course: 'Sky Islands'
  },
  {
    name: "Sky Islands 5 - The Vortex", par: 5,
    ball: {x:100,y:350}, hole: {x:500,y:80},
    walls: [{x1:50,y1:30,x2:550,y2:30},{x1:50,y1:400,x2:550,y2:400},
            {x1:50,y1:30,x2:50,y2:400},{x1:550,y1:30,x2:550,y2:400}],
    water: [{x:200,y:100,w:80,h:80},{x:350,y:250,w:80,h:80}],
    sand: [{x:100,y:180,w:70,h:70}],
    bumpers: [{x:300,y:200,r:20},{x:150,y:300,r:12},{x:450,y:120,r:12}],
    wind: {x:0,y:0},
    teleporters: [{x1:250,y1:320,x2:400,y2:120}],
    course: 'Sky Islands'
  },
  {
    name: "Sky Islands 6 - Championship", par: 5,
    ball: {x:80,y:360}, hole: {x:520,y:60},
    walls: [{x1:30,y1:30,x2:570,y2:30},{x1:30,y1:390,x2:570,y2:390},{x1:30,y1:30,x2:30,y2:390},{x1:570,y1:30,x2:570,y2:390},
            {x1:150,y1:30,x2:150,y2:250},{x1:300,y1:140,x2:300,y2:390},{x1:450,y1:30,x2:450,y2:280}],
    water: [{x:160,y:280,w:130,h:100},{x:320,y:40,w:120,h:90}],
    sand: [{x:460,y:300,w:80,h:60},{x:50,y:150,w:80,h:60}],
    bumpers: [{x:220,y:180,r:14},{x:380,y:180,r:14},{x:300,y:320,r:10}],
    wind: {x:0.03,y:-0.02}, teleporters: [], course: 'Sky Islands'
  }
];

const COURSE_COLORS = {
  'Neon City': { grass: '#0a1a0a', wall: '#0f8', hole: '#0f0', sand: '#8B7355', water: '#0af', accent: '#0f8' },
  'Crystal Cave': { grass: '#0a0a1a', wall: '#a0f', hole: '#f0f', sand: '#5a5a7a', water: '#44a', accent: '#a0f' },
  'Sky Islands': { grass: '#0a1a1a', wall: '#0ff', hole: '#0ff', sand: '#7a8B55', water: '#048', accent: '#0ff' }
};

// ── Audio ──
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playSound(freq, dur, type='sine', vol=0.06) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}
function sndHit(power) { playSound(200 + power * 400, 0.15, 'square', 0.04); }
function sndWall() { playSound(150, 0.08, 'square', 0.03); }
function sndWater() { playSound(100, 0.4, 'sine', 0.04); }
function sndHoleIn() { [523,659,784,1047,1319].forEach((f,i) => setTimeout(()=>playSound(f,0.3,'sine',0.08),i*80)); }
function sndBumper() { playSound(800, 0.08, 'square', 0.04); }

// ── Rewards ──
function getCoins() { return parseInt(localStorage.getItem('ngn4_rewards') || '0'); }
function addCoins(n) {
  const c = getCoins() + n;
  localStorage.setItem('ngn4_rewards', c);
  document.getElementById('coins').textContent = c;
}

// ── Particles ──
function spawnParticles(x, y, color, count=10) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    particles.push({
      x, y, vx: Math.cos(angle) * (1 + Math.random() * 3), vy: Math.sin(angle) * (1 + Math.random() * 3),
      life: 1, decay: 0.02 + Math.random() * 0.02, color, size: 2 + Math.random() * 2
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Physics ──
function updateBall() {
  if (!ballMoving) return;
  const h = HOLES[currentHole];
  const colors = COURSE_COLORS[h.course];

  // Wind
  ball.vx += h.wind.x;
  ball.vy += h.wind.y;

  // Sand check
  let inSand = false;
  for (const s of h.sand) {
    if (ball.x > s.x && ball.x < s.x + s.w && ball.y > s.y && ball.y < s.y + s.h) {
      inSand = true; break;
    }
  }

  const fric = inSand ? SAND_FRICTION : FRICTION;
  ball.vx *= fric;
  ball.vy *= fric;
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Trail
  if (Math.abs(ball.vx) > 0.5 || Math.abs(ball.vy) > 0.5) {
    trail.push({ x: ball.x, y: ball.y, life: 1 });
    if (trail.length > 30) trail.shift();
  }

  // Wall collisions
  for (const w of h.walls) {
    collideWall(w);
  }

  // Bumper collisions
  for (const b of h.bumpers) {
    const dx = ball.x - b.x;
    const dy = ball.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ball.r + b.r && dist > 0) {
      const nx = dx / dist, ny = dy / dist;
      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;
      ball.vx += nx * 1.5;
      ball.vy += ny * 1.5;
      ball.x = b.x + nx * (ball.r + b.r + 1);
      ball.y = b.y + ny * (ball.r + b.r + 1);
      sndBumper();
      spawnParticles(b.x, b.y, colors.accent, 5);
    }
  }

  // Teleporters
  for (const t of h.teleporters) {
    const dx = ball.x - t.x1;
    const dy = ball.y - t.y1;
    if (Math.sqrt(dx*dx + dy*dy) < 15) {
      ball.x = t.x2;
      ball.y = t.y2;
      ball.vx *= 0.5;
      ball.vy *= 0.5;
      spawnParticles(t.x1, t.y1, '#f0f', 10);
      spawnParticles(t.x2, t.y2, '#0ff', 10);
      playSound(500, 0.2, 'sine', 0.05);
    }
  }

  // Water check
  for (const w of h.water) {
    if (ball.x > w.x && ball.x < w.x + w.w && ball.y > w.y && ball.y < w.y + w.h) {
      strokes++; // Penalty stroke
      ball.x = h.ball.x;
      ball.y = h.ball.y;
      ball.vx = 0; ball.vy = 0;
      ballMoving = false;
      sndWater();
      setMessage('💦 Water hazard! +1 penalty stroke');
      updateHUD();
      return;
    }
  }

  // Hole check
  const hdx = ball.x - hole.x;
  const hdy = ball.y - hole.y;
  const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

  if (hdist < hole.r && speed < 5) {
    // Ball in hole!
    ballMoving = false;
    ball.vx = 0; ball.vy = 0;
    holeComplete = true;
    celebrationTimer = 3;

    const scoreNames = { '-3':'Albatross! 🦅','-2':'Eagle! 🦅','-1':'Birdie! 🐦','0':'Par','1':'Bogey','2':'Double Bogey' };
    const diff = strokes - h.par;
    const name = strokes === 1 ? 'HOLE IN ONE! 🏆🎉' : (scoreNames[diff.toString()] || `+${diff}`);

    sndHoleIn();
    setMessage(name);
    spawnParticles(hole.x, hole.y, colors.hole, 20);

    scores.push(strokes);
    setTimeout(nextHole, 2500);
    return;
  }

  // Stop check
  if (speed < MIN_SPEED) {
    ball.vx = 0;
    ball.vy = 0;
    ballMoving = false;
  }

  updateHUD();
}

function collideWall(w) {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const nx = -dy / len;
  const ny = dx / len;
  const bx = ball.x - w.x1;
  const by = ball.y - w.y1;
  const dist = bx * nx + by * ny;

  if (Math.abs(dist) < ball.r) {
    const dot = ball.vx * nx + ball.vy * ny;
    ball.vx -= 2 * dot * nx * BOUNCE;
    ball.vy -= 2 * dot * ny * BOUNCE;
    const push = ball.r - dist;
    ball.x += nx * push * (dist > 0 ? 1 : -1);
    ball.y += ny * push * (dist > 0 ? 1 : -1);
    sndWall();
  }
}

// ── Drawing ──
function draw() {
  const h = HOLES[currentHole];
  const colors = COURSE_COLORS[h.course];

  // Background
  ctx.fillStyle = colors.grass;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = colors.accent + '10';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < canvas.width; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

  // Water
  for (const w of h.water) {
    ctx.fillStyle = colors.water + '66';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = colors.water;
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
    // Waves
    ctx.strokeStyle = colors.water + '44';
    const waveOff = Date.now() * 0.003;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      for (let x = w.x; x < w.x + w.w; x += 3) {
        const yOff = Math.sin(x * 0.1 + waveOff + i * 2) * 3;
        if (x === w.x) ctx.moveTo(x, w.y + 10 + i * (h.h / 3) + yOff);
        else ctx.lineTo(x, w.y + 10 + i * (h.h / 3) + yOff);
      }
      ctx.stroke();
    }
  }

  // Sand
  for (const s of h.sand) {
    ctx.fillStyle = colors.sand + '66';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = colors.sand;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    ctx.setLineDash([]);
  }

  // Bumpers
  for (const b of h.bumpers) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = colors.accent + '33';
    ctx.fill();
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Teleporters
  for (const t of h.teleporters) {
    const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
    ctx.beginPath();
    ctx.arc(t.x1, t.y1, 12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,0,255,${pulse * 0.3})`;
    ctx.fill();
    ctx.strokeStyle = '#f0f';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(t.x2, t.y2, 12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,255,255,${pulse * 0.3})`;
    ctx.fill();
    ctx.strokeStyle = '#0ff';
    ctx.stroke();
  }

  // Walls
  ctx.strokeStyle = colors.wall;
  ctx.lineWidth = 3;
  ctx.shadowColor = colors.wall;
  ctx.shadowBlur = 8;
  for (const w of h.walls) {
    ctx.beginPath();
    ctx.moveTo(w.x1, w.y1);
    ctx.lineTo(w.x2, w.y2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Hole
  ctx.beginPath();
  ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.strokeStyle = colors.hole;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Flag
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hole.x, hole.y);
  ctx.lineTo(hole.x, hole.y - 25);
  ctx.stroke();
  ctx.fillStyle = colors.hole;
  ctx.beginPath();
  ctx.moveTo(hole.x, hole.y - 25);
  ctx.lineTo(hole.x + 15, hole.y - 20);
  ctx.lineTo(hole.x, hole.y - 15);
  ctx.fill();

  // Ball trail
  for (let i = 0; i < trail.length; i++) {
    const t = trail[i];
    t.life -= 0.02;
    if (t.life > 0) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * t.life * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${t.life * 0.3})`;
      ctx.fill();
    }
  }
  trail = trail.filter(t => t.life > 0);

  // Ball
  if (!holeComplete) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    const ballGrad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.r);
    ballGrad.addColorStop(0, '#fff');
    ballGrad.addColorStop(1, '#ddd');
    ctx.fillStyle = ballGrad;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Aiming line
  if (aiming && !ballMoving) {
    const dx = aimStart.x - mouseX;
    const dy = aimStart.y - mouseY;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy) / 30, MAX_POWER);
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x + Math.cos(angle) * power * 10, ball.y + Math.sin(angle) * power * 10);
    ctx.strokeStyle = `rgba(255,255,255,${power / MAX_POWER})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Power indicator
    ctx.fillStyle = '#fff';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`Power: ${Math.floor(power / MAX_POWER * 100)}%`, 300, 390);
    ctx.textAlign = 'start';
  }

  // Wind indicator
  if (Math.abs(h.wind.x) > 0.001 || Math.abs(h.wind.y) > 0.001) {
    ctx.fillStyle = '#0ff';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText('WIND', 590, 15);
    ctx.beginPath();
    ctx.moveTo(580, 25);
    ctx.lineTo(580 + h.wind.x * 500, 25 + h.wind.y * 500);
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'start';
  }

  drawParticles();
}

// ── Input ──
let mouseX = 0, mouseY = 0;

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

canvas = null;

function handleMouseDown(e) {
  if (ballMoving || holeComplete) return;
  const pos = getCanvasCoords(e);
  const dx = pos.x - ball.x;
  const dy = pos.y - ball.y;
  if (Math.sqrt(dx * dx + dy * dy) < 30) {
    aiming = true;
    aimStart = { x: pos.x, y: pos.y };
    mouseX = pos.x;
    mouseY = pos.y;
    initAudio();
  }
}

function handleMouseMove(e) {
  if (aiming) {
    const pos = getCanvasCoords(e);
    mouseX = pos.x;
    mouseY = pos.y;
  }
}

function handleMouseUp(e) {
  if (!aiming) return;
  aiming = false;
  const dx = aimStart.x - mouseX;
  const dy = aimStart.y - mouseY;
  const power = Math.min(Math.sqrt(dx * dx + dy * dy) / 30, MAX_POWER);
  const angle = Math.atan2(dy, dx);

  if (power > 0.5) {
    ball.vx = Math.cos(angle) * power;
    ball.vy = Math.sin(angle) * power;
    ballMoving = true;
    strokes++;
    trail = [];
    sndHit(power / MAX_POWER);
    updateHUD();
  }
}

// ── Game Loop ──
function gameLoop() {
  updateBall();
  updateParticles();
  if (celebrationTimer > 0) celebrationTimer -= 0.016;
  draw();
  animFrame = requestAnimationFrame(gameLoop);
}

// ── HUD ──
function updateHUD() {
  document.getElementById('hole-num').textContent = `${currentHole + 1}/18`;
  const h = HOLES[currentHole];
  document.getElementById('hole-par').textContent = h.par;
  document.getElementById('strokes').textContent = strokes;
  document.getElementById('total-strokes').textContent = totalStrokes + strokes;
  document.getElementById('hole-name').textContent = h.name + ' — ' + h.course;
}

function setMessage(msg) {
  document.getElementById('message').textContent = msg;
}

// ── Hole Management ──
function loadHole(idx) {
  currentHole = idx;
  const h = HOLES[idx];
  ball.x = h.ball.x;
  ball.y = h.ball.y;
  ball.vx = 0;
  ball.vy = 0;
  hole.x = h.hole.x;
  hole.y = h.hole.y;
  strokes = 0;
  ballMoving = false;
  holeComplete = false;
  aiming = false;
  trail = [];
  particles = [];
  setMessage('');
  updateHUD();
}

function nextHole() {
  totalStrokes += strokes;
  if (currentHole < 17) {
    loadHole(currentHole + 1);
  } else {
    showScorecard();
  }
}

// ── Scorecard ──
function showScorecard() {
  cancelAnimationFrame(animFrame);
  document.getElementById('game-screen').style.display = 'none';
  document.getElementById('scorecard-screen').style.display = 'block';

  let totalPar = 0;
  let html = '<div class="score-row"><div class="score-cell header">Hole</div>';
  for (let i = 0; i < 18; i++) html += `<div class="score-cell header">${i + 1}</div>`;
  html += '<div class="score-cell header">Total</div></div>';

  html += '<div class="score-row"><div class="score-cell header">Par</div>';
  for (let i = 0; i < 18; i++) {
    html += `<div class="score-cell">${HOLES[i].par}</div>`;
    totalPar += HOLES[i].par;
  }
  html += `<div class="score-cell header">${totalPar}</div></div>`;

  html += '<div class="score-row"><div class="score-cell header">Score</div>';
  let totalScore = 0;
  for (let i = 0; i < scores.length; i++) {
    const diff = scores[i] - HOLES[i].par;
    let cls = '';
    if (scores[i] === 1) cls = 'hio';
    else if (diff <= -2) cls = 'eagle';
    else if (diff < 0) cls = 'under';
    else if (diff > 0) cls = 'over';
    html += `<div class="score-cell ${cls}">${scores[i]}</div>`;
    totalScore += scores[i];
  }
  // Fill remaining if game ended early
  for (let i = scores.length; i < 18; i++) html += '<div class="score-cell">-</div>';
  html += `<div class="score-cell ${totalScore < totalPar ? 'under' : totalScore > totalPar ? 'over' : ''}">${totalScore}</div></div>`;

  document.getElementById('scorecard').innerHTML = html;

  const diff = totalScore - totalPar;
  const diffStr = diff > 0 ? `+${diff}` : diff === 0 ? 'E' : `${diff}`;
  document.getElementById('round-summary').innerHTML =
    `Total: ${totalScore} (${diffStr}) | Par: ${totalPar}`;

  // Calculate coins
  let coinsEarned = 0;
  for (let i = 0; i < scores.length; i++) {
    const d = scores[i] - HOLES[i].par;
    if (scores[i] === 1) coinsEarned += 100;       // Hole in one
    else if (d <= -2) coinsEarned += 25;            // Eagle
    else if (d === -1) coinsEarned += 10;           // Birdie
    else if (d <= 0) coinsEarned += 3;              // Par or under
  }
  if (totalScore <= totalPar) coinsEarned += 20;    // Course completion bonus under par

  document.getElementById('rewards-earned').textContent = `🪙 +${coinsEarned} coins earned!`;
  addCoins(coinsEarned);

  // Save high score
  const hs = parseInt(localStorage.getItem('ngn4_golf_hs') || '999');
  if (totalScore < hs) localStorage.setItem('ngn4_golf_hs', totalScore);
}

// ── Init ──
function init() {
  canvas = document.getElementById('golf-canvas');
  ctx = canvas.getContext('2d');
  document.getElementById('coins').textContent = getCoins();

  const hs = localStorage.getItem('ngn4_golf_hs');
  if (hs && hs !== '999') {
    document.getElementById('high-scores').textContent = `Best Round: ${hs} strokes`;
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); handleMouseDown(e); }, { passive: false });
  canvas.addEventListener('touchmove', e => { e.preventDefault(); handleMouseMove(e); }, { passive: false });
  canvas.addEventListener('touchend', e => { e.preventDefault(); handleMouseUp(e); }, { passive: false });

  document.getElementById('start-btn').addEventListener('click', () => {
    initAudio();
    scores = [];
    totalStrokes = 0;
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    loadHole(0);
    animFrame = requestAnimationFrame(gameLoop);
  });

  document.getElementById('play-again-btn').addEventListener('click', () => {
    scores = [];
    totalStrokes = 0;
    document.getElementById('scorecard-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    loadHole(0);
    animFrame = requestAnimationFrame(gameLoop);
  });

  document.getElementById('menu-btn').addEventListener('click', () => {
    document.getElementById('scorecard-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
  });

  document.getElementById('watch-ad-btn').addEventListener('click', () => {
    const btn = document.getElementById('watch-ad-btn');
    btn.textContent = '⏳ Watching...'; btn.disabled = true;
    let sec = 30;
    const iv = setInterval(() => {
      sec--;
      btn.textContent = `⏳ ${sec}s...`;
      if (sec <= 0) {
        clearInterval(iv);
        btn.textContent = '✅ Mulligan earned!'; btn.style.background = '#0f0';
        // Replay last hole
        if (scores.length > 0) {
          scores.pop();
          document.getElementById('scorecard-screen').style.display = 'none';
          document.getElementById('game-screen').style.display = 'block';
          loadHole(Math.min(currentHole, 17));
          animFrame = requestAnimationFrame(gameLoop);
        }
      }
    }, 1000);
  });
}

document.addEventListener('DOMContentLoaded', init);
})();
