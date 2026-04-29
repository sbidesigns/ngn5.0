// ═══════════════════════════════════════════
// NGN4 — GAME 35: RING CHAMPION (Boxing)
// Boxing Game with 12 Opponents
// ═══════════════════════════════════════════
(function() {
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('ring-champion'); } catch(e) {}


let canvas, ctx;
let audioCtx;
let animFrame;
let gameState = 'menu'; // menu, fight, roundEnd, train, gameover

// ── Player Stats ──
let playerStats = JSON.parse(localStorage.getItem('ngn4_boxer_stats') || 'null') || {
  power: 10, speed: 10, stamina: 10, defense: 10,
  hp: 100, maxHp: 100, sp: 100, maxSp: 100,
  wins: 0, losses: 0, kos: 0, currentOpponent: 0,
  coins: 0
};

// ── Opponents ──
const OPPONENTS = [
  { name: 'Rookie Rick', style: 'balanced', power: 8, speed: 8, stamina: 9, defense: 7, hp: 90, emoji: '🥊', title: 'Gym Newbie' },
  { name: 'Slugger Sam', style: 'aggressive', power: 12, speed: 6, stamina: 8, defense: 5, hp: 100, emoji: '💪', title: 'Brawler' },
  { name: 'Quick Quinn', style: 'counter', power: 7, speed: 13, stamina: 7, defense: 8, hp: 85, emoji: '⚡', title: 'Speed Demon' },
  { name: 'Tank Tina', style: 'defensive', power: 9, speed: 5, stamina: 14, defense: 12, hp: 130, emoji: '🛡', title: 'Iron Wall' },
  { name: 'Shadow Silva', style: 'counter', power: 11, speed: 12, stamina: 8, defense: 9, hp: 100, emoji: '🌑', title: 'Night Fighter' },
  { name: 'Crusher Carl', style: 'aggressive', power: 14, speed: 7, stamina: 9, defense: 6, hp: 110, emoji: '🔨', title: 'Heavy Hitter' },
  { name: 'Matrix Mike', style: 'counter', power: 10, speed: 14, stamina: 9, defense: 10, hp: 100, emoji: '🔮', title: 'The Untouchable' },
  { name: 'Boulder Bob', style: 'defensive', power: 11, speed: 4, stamina: 16, defense: 14, hp: 150, emoji: '🗿', title: 'Mountain' },
  { name: 'Viper Vanessa', style: 'aggressive', power: 13, speed: 13, stamina: 8, defense: 7, hp: 105, emoji: '🐍', title: 'Strike Queen' },
  { name: 'Thunder Tom', style: 'balanced', power: 15, speed: 10, stamina: 10, defense: 10, hp: 120, emoji: '⛈', title: 'Storm Bringer' },
  { name: 'Ghost Grace', style: 'counter', power: 12, speed: 15, stamina: 9, defense: 11, hp: 110, emoji: '👻', title: 'Phantom' },
  { name: 'CHAMPION X', style: 'balanced', power: 18, speed: 14, stamina: 12, defense: 13, hp: 140, emoji: '👑', title: 'Undisputed Champion' },
];

// ── Fight State ──
let fightState = {
  player: { x: 200, y: 200, vx: 0, vy: 0, hp: 100, sp: 100, blocking: false, hitTimer: 0, punching: false, punchType: '', punchTimer: 0, knockdown: false, knockdownTimer: 0 },
  ai: { x: 400, y: 200, vx: 0, vy: 0, hp: 100, sp: 100, blocking: false, hitTimer: 0, punching: false, punchType: '', punchTimer: 0, knockdown: false, knockdownTimer: 0, actionTimer: 0, currentAction: '' },
  round: 1,
  time: 90,
  roundWins: [0, 0],
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  totalDamage: 0,
  totalHits: 0,
  hitsLanded: 0,
  roundActive: false,
  roundOver: false,
  opponent: null,
  particles: [],
  shakeTimer: 0,
  shakeX: 0,
  shakeY: 0,
  message: '',
  messageTimer: 0,
  koAnimTimer: 0,
};

let keys = {};
let lastTime = 0;

// ── Audio ──
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playSound(freq, dur, type='square', vol=0.06) {
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
function sndJab() { playSound(300, 0.08, 'square', 0.04); }
function sndHook() { playSound(200, 0.12, 'sawtooth', 0.05); }
function sndUppercut() { playSound(150, 0.15, 'sawtooth', 0.06); }
function sndBlock() { playSound(500, 0.06, 'triangle', 0.03); }
function sndKO() { [200,150,100,80,60].forEach((f,i) => setTimeout(()=>playSound(f,0.3,'sawtooth',0.05),i*100)); }
function sndBell() { playSound(800, 0.5, 'sine', 0.08); }
function sndHit() { playSound(100 + Math.random()*100, 0.1, 'sawtooth', 0.05); }

// ── Rewards ──
function getCoins() { return parseInt(localStorage.getItem('ngn4_rewards') || '0'); }
function addCoins(n) {
  const c = getCoins() + n;
  localStorage.setItem('ngn4_rewards', c);
  document.getElementById('coins').textContent = c;
}
function spendCoins(n) {
  const c = getCoins();
  if (c < n) return false;
  localStorage.setItem('ngn4_rewards', c - n);
  document.getElementById('coins').textContent = c - n;
  return true;
}
function saveStats() { localStorage.setItem('ngn4_boxer_stats', JSON.stringify(playerStats)); }

// ── Particles ──
function spawnHitParticles(x, y, color, count=8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    fightState.particles.push({
      x, y, vx: Math.cos(angle) * (2 + Math.random() * 4), vy: Math.sin(angle) * (2 + Math.random() * 4),
      life: 1, decay: 0.03 + Math.random() * 0.03, color, size: 2 + Math.random() * 3
    });
  }
}

function updateParticles() {
  const ps = fightState.particles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= p.decay;
    if (p.life <= 0) ps.splice(i, 1);
  }
}

// ── Damage Calculation ──
function calcDamage(attacker, punchType, defender) {
  let baseDamage;
  const pow = attacker === 'player' ? playerStats.power : fightState.opponent.power;
  const def = defender === 'player' ? playerStats.defense : fightState.opponent.defense;

  switch (punchType) {
    case 'jab': baseDamage = pow * 0.8; break;
    case 'hook': baseDamage = pow * 1.3; break;
    case 'uppercut': baseDamage = pow * 1.8; break;
    default: baseDamage = pow;
  }

  const blockReduction = fightState[defender].blocking ? 0.3 : 1;
  const defReduction = Math.max(0.3, 1 - def * 0.03);
  return Math.floor(baseDamage * blockReduction * defReduction * (0.9 + Math.random() * 0.2));
}

function staminaCost(punchType) {
  switch (punchType) {
    case 'jab': return 8;
    case 'hook': return 15;
    case 'uppercut': return 25;
    default: return 10;
  }
}

// ── AI ──
function updateAI(dt) {
  const ai = fightState.ai;
  const pl = fightState.player;
  const opp = fightState.opponent;

  if (ai.knockdown || fightState.roundOver) return;

  // Stamina regen
  ai.sp = Math.min(100, ai.sp + dt * (8 + opp.stamina * 0.3));

  // Distance to player
  const dx = pl.x - ai.x;
  const dy = pl.y - ai.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  ai.actionTimer -= dt;
  if (ai.actionTimer <= 0) {
    ai.actionTimer = 0.3 + Math.random() * 0.5;
    const spd = opp.speed * 0.5;

    switch (opp.style) {
      case 'aggressive':
        // Move toward player, punch often
        if (dist > 70) {
          ai.vx = (dx / dist) * spd;
          ai.vy = (dy / dist) * spd * 0.3;
          ai.currentAction = 'approach';
        } else if (ai.sp > 20) {
          const r = Math.random();
          if (r < 0.5) { ai.punchType = 'jab'; ai.punchTimer = 0.15; }
          else if (r < 0.8) { ai.punchType = 'hook'; ai.punchTimer = 0.25; }
          else { ai.punchType = 'uppercut'; ai.punchTimer = 0.35; }
          ai.punching = true;
          ai.currentAction = 'attack';
        }
        break;

      case 'defensive':
        // Block often, counter
        if (dist < 80) {
          ai.vx = -(dx / dist) * spd * 0.5;
          ai.currentAction = 'retreat';
          if (pl.punching && Math.random() < 0.4) {
            ai.blocking = true;
            ai.currentAction = 'block';
          }
        } else if (dist > 150) {
          ai.vx = (dx / dist) * spd * 0.3;
          ai.currentAction = 'approach';
        }
        if (!ai.blocking && dist < 90 && ai.sp > 30 && Math.random() < 0.3) {
          ai.punchType = 'jab'; ai.punchTimer = 0.15; ai.punching = true;
          ai.currentAction = 'attack';
        }
        break;

      case 'counter':
        // Wait for player to attack, then counter
        if (pl.punching && dist < 100) {
          ai.blocking = true;
          ai.currentAction = 'block';
          setTimeout(() => {
            if (ai.sp > 20 && !fightState.roundOver) {
              ai.punchType = Math.random() < 0.4 ? 'hook' : 'uppercut';
              ai.punchTimer = 0.25;
              ai.punching = true;
              ai.blocking = false;
              ai.currentAction = 'counter';
            }
          }, 200 + Math.random() * 300);
        } else {
          ai.blocking = false;
          if (dist > 120) { ai.vx = (dx / dist) * spd * 0.5; ai.currentAction = 'approach'; }
          else if (dist < 60) { ai.vx = -(dx / dist) * spd * 0.3; ai.currentAction = 'retreat'; }
          if (Math.random() < 0.15 && ai.sp > 20 && dist < 100) {
            ai.punchType = 'jab'; ai.punchTimer = 0.15; ai.punching = true;
            ai.currentAction = 'attack';
          }
        }
        break;

      default: // balanced
        if (dist > 100) { ai.vx = (dx / dist) * spd; ai.currentAction = 'approach'; }
        else if (dist < 60) { ai.vx = -(dx / dist) * spd * 0.5; ai.currentAction = 'retreat'; }
        if (dist < 100 && ai.sp > 20) {
          const r = Math.random();
          if (r < 0.6) { ai.punchType = 'jab'; ai.punchTimer = 0.15; }
          else if (r < 0.85) { ai.punchType = 'hook'; ai.punchTimer = 0.25; }
          else { ai.punchType = 'uppercut'; ai.punchTimer = 0.35; }
          ai.punching = true;
          ai.currentAction = 'attack';
        }
        if (Math.random() < 0.2 && dist < 80) ai.blocking = true;
        else if (Math.random() < 0.3) ai.blocking = false;
    }
  }

  // Apply movement
  ai.x += ai.vx;
  ai.y += ai.vy;
  ai.vx *= 0.85;
  ai.vy *= 0.85;
  ai.x = Math.max(50, Math.min(550, ai.x));
  ai.y = Math.max(80, Math.min(280, ai.y));
}

// ── Player Attack ──
function playerPunch(type) {
  const pl = fightState.player;
  const ai = fightState.ai;
  if (pl.punching || pl.knockdown || fightState.roundOver || fightState.koAnimTimer > 0) return;

  const cost = staminaCost(type);
  if (pl.sp < cost) return;

  pl.sp -= cost;
  pl.punching = true;
  pl.punchType = type;
  pl.punchTimer = type === 'jab' ? 0.12 : type === 'hook' ? 0.2 : 0.3;

  switch (type) {
    case 'jab': sndJab(); break;
    case 'hook': sndHook(); break;
    case 'uppercut': sndUppercut(); break;
  }
}

// ── Update ──
function update(dt) {
  const fs = fightState;
  if (gameState !== 'fight') return;

  // Timer
  if (fs.roundActive && !fs.roundOver) {
    fs.time -= dt;
    if (fs.time <= 0) {
      fs.time = 0;
      endRound();
      return;
    }
    document.getElementById('round-time').textContent = Math.ceil(fs.time);
  }

  // Shake
  if (fs.shakeTimer > 0) {
    fs.shakeTimer -= dt;
    fs.shakeX = (Math.random() - 0.5) * fs.shakeTimer * 20;
    fs.shakeY = (Math.random() - 0.5) * fs.shakeTimer * 20;
  } else {
    fs.shakeX = 0; fs.shakeY = 0;
  }

  // Message timer
  if (fs.messageTimer > 0) {
    fs.messageTimer -= dt;
    if (fs.messageTimer <= 0) fs.message = '';
  }

  // KO animation
  if (fs.koAnimTimer > 0) {
    fs.koAnimTimer -= dt;
    return;
  }

  // Combo timer
  if (fs.comboTimer > 0) {
    fs.comboTimer -= dt;
    if (fs.comboTimer <= 0) fs.combo = 0;
  }

  const pl = fs.player;
  const ai = fs.ai;

  // Player stamina regen
  if (!pl.punching) {
    pl.sp = Math.min(100, pl.sp + dt * (10 + playerStats.stamina * 0.3));
    if (pl.blocking) pl.sp = Math.min(100, pl.sp + dt * 3);
  }

  // Player movement
  const pSpeed = playerStats.speed * 0.6;
  if (!pl.punching && !pl.knockdown) {
    if (keys['arrowleft']) pl.vx -= pSpeed * dt * 10;
    if (keys['arrowright']) pl.vx += pSpeed * dt * 10;
    if (keys['arrowup']) pl.vy -= pSpeed * dt * 5;
    if (keys['arrowdown']) pl.vy += pSpeed * dt * 5;
    pl.blocking = !!keys[' '];
    if (pl.blocking) sndBlock();
  }

  pl.x += pl.vx;
  pl.y += pl.vy;
  pl.vx *= 0.88;
  pl.vy *= 0.88;
  pl.x = Math.max(50, Math.min(550, pl.x));
  pl.y = Math.max(80, Math.min(280, pl.y));

  // Player punch timer
  if (pl.punching) {
    pl.punchTimer -= dt;
    if (pl.punchTimer <= 0) {
      pl.punching = false;
      // Check hit
      const dist = Math.sqrt((pl.x - ai.x) ** 2 + (pl.y - ai.y) ** 2);
      if (dist < 80) {
        const dmg = calcDamage('player', pl.punchType, 'ai');
        ai.hp = Math.max(0, ai.hp - dmg);
        ai.hitTimer = 0.15;
        fs.totalDamage += dmg;
        fs.hitsLanded++;
        fs.totalHits++;
        fs.combo++;
        fs.comboTimer = 1.5;
        if (fs.combo > fs.maxCombo) fs.maxCombo = fs.combo;
        const comboMult = 1 + (fs.combo - 1) * 0.1;
        const finalDmg = Math.floor(dmg * comboMult);
        ai.hp = Math.max(0, ai.hp - (finalDmg - dmg));

        spawnHitParticles(ai.x, ai.y, '#f80', 6);
        fs.shakeTimer = 0.1;
        sndHit();

        if (ai.hp <= 0) {
          ai.knockdown = true;
          ai.knockdownTimer = 3;
          fs.koAnimTimer = 2;
          sndKO();
          fs.message = '💥 KNOCKOUT!';
          fs.messageTimer = 3;
          spawnHitParticles(ai.x, ai.y, '#f44', 20);
          fs.shakeTimer = 0.5;
        }
      }
    }
  }

  // AI punch timer
  if (ai.punching) {
    ai.punchTimer -= dt;
    if (ai.punchTimer <= 0) {
      ai.punching = false;
      const dist = Math.sqrt((pl.x - ai.x) ** 2 + (pl.y - ai.y) ** 2);
      if (dist < 80) {
        const cost = staminaCost(ai.punchType);
        if (ai.sp >= cost) {
          ai.sp -= cost;
          const dmg = calcDamage('ai', ai.punchType, 'player');
          pl.hp = Math.max(0, pl.hp - dmg);
          pl.hitTimer = 0.15;
          fs.totalHits++;
          spawnHitParticles(pl.x, pl.y, '#f44', 6);
          fs.shakeTimer = 0.08;
          sndHit();

          if (pl.hp <= 0) {
            pl.knockdown = true;
            pl.knockdownTimer = 3;
            fs.koAnimTimer = 2;
            sndKO();
            fs.message = '💀 YOU\'RE DOWN!';
            fs.messageTimer = 3;
            spawnHitParticles(pl.x, pl.y, '#f00', 20);
            fs.shakeTimer = 0.5;
          }
        }
      }
    }
  }

  // Hit timers
  if (pl.hitTimer > 0) pl.hitTimer -= dt;
  if (ai.hitTimer > 0) ai.hitTimer -= dt;

  // Knockdown handling
  if (pl.knockdown) {
    pl.knockdownTimer -= dt;
    if (pl.knockdownTimer <= 0) {
      if (pl.hp <= 0) {
        endRound();
        return;
      }
      pl.knockdown = false;
      pl.hp = Math.max(10, pl.hp); // Get back up with some HP
    }
  }
  if (ai.knockdown) {
    ai.knockdownTimer -= dt;
    if (ai.knockdownTimer <= 0) {
      if (ai.hp <= 0) {
        endRound();
        return;
      }
      ai.knockdown = false;
      ai.hp = Math.max(10, ai.hp);
    }
  }

  // AI update
  updateAI(dt);

  // Update particles
  updateParticles();

  // Update HUD
  updateHUD();
}

// ── Drawing ──
function drawFighter(x, y, fighter, isPlayer) {
  const hit = fighter.hitTimer > 0;
  const kd = fighter.knockdown;
  const blocking = fighter.blocking;
  const color = isPlayer ? '#0f8' : '#f44';
  const bodyColor = hit ? '#fff' : color;

  ctx.save();
  if (kd) {
    ctx.translate(x, y + 30);
    ctx.rotate(isPlayer ? 0.3 : -0.3);
  } else {
    ctx.translate(x, y);
  }

  // Body
  ctx.fillStyle = bodyColor + '44';
  ctx.beginPath();
  ctx.ellipse(0, 0, 25, 35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.arc(0, -35, 15, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor + '66';
  ctx.fill();
  ctx.strokeStyle = bodyColor;
  ctx.stroke();

  // Face direction
  const faceDir = isPlayer ? 1 : -1;

  // Arms
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 4;

  if (fighter.punching) {
    // Punching arm
    const punchLen = fighter.punchType === 'uppercut' ? 35 : 45;
    const punchAngle = fighter.punchType === 'jab' ? 0.2 : fighter.punchType === 'hook' ? -0.8 : -1.2;
    ctx.beginPath();
    ctx.moveTo(faceDir * 15, -25);
    ctx.lineTo(faceDir * (15 + punchLen), -25 + punchAngle * 30);
    ctx.stroke();

    // Glove
    ctx.beginPath();
    ctx.arc(faceDir * (15 + punchLen), -25 + punchAngle * 30, 6, 0, Math.PI * 2);
    ctx.fillStyle = hit ? '#fff' : '#f80';
    ctx.fill();

    // Other arm guard
    ctx.beginPath();
    ctx.moveTo(-faceDir * 15, -25);
    ctx.lineTo(-faceDir * 5, -15);
    ctx.stroke();
  } else if (blocking) {
    // Blocking stance
    ctx.beginPath();
    ctx.moveTo(15, -25); ctx.lineTo(5, -40);
    ctx.moveTo(-15, -25); ctx.lineTo(-5, -40);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -42, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#44f';
    ctx.fill();
  } else {
    // Guard stance
    ctx.beginPath();
    ctx.moveTo(15, -25); ctx.lineTo(20, -35);
    ctx.moveTo(-15, -25); ctx.lineTo(-20, -35);
    ctx.stroke();
    // Gloves
    ctx.beginPath();
    ctx.arc(20, -35, 5, 0, Math.PI * 2);
    ctx.fillStyle = isPlayer ? '#0af' : '#f80';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-20, -35, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Legs
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, 30); ctx.lineTo(-12, 55);
  ctx.moveTo(8, 30); ctx.lineTo(12, 55);
  ctx.stroke();

  ctx.restore();
}

function draw() {
  if (gameState !== 'fight') return;
  const fs = fightState;

  ctx.save();
  ctx.translate(fs.shakeX, fs.shakeY);

  // Ring background
  const grad = ctx.createRadialGradient(300, 175, 50, 300, 175, 300);
  grad.addColorStop(0, '#1a1a2a');
  grad.addColorStop(1, '#0a0a0f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ring ropes
  ctx.strokeStyle = '#f44';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const y = 50 + i * 130;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(580, y);
    ctx.stroke();
  }

  // Ring posts
  ctx.fillStyle = '#f44';
  ctx.fillRect(20, 40, 6, 340);
  ctx.fillRect(574, 40, 6, 340);

  // Floor
  ctx.fillStyle = '#111122';
  ctx.fillRect(30, 310, 540, 40);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  for (let x = 30; x < 570; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 310); ctx.lineTo(x, 350); ctx.stroke();
  }

  // Fighters
  drawFighter(fs.player.x, fs.player.y, fs.player, true);
  drawFighter(fs.ai.x, fs.ai.y, fs.ai, false);

  // Particles
  for (const p of fs.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // KO text
  if (fs.koAnimTimer > 0) {
    ctx.fillStyle = '#f44';
    ctx.font = 'bold 60px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const scale = 1 + (1 - fs.koAnimTimer / 2) * 0.5;
    ctx.save();
    ctx.translate(300, 175);
    ctx.scale(scale, scale);
    ctx.fillText('K.O.!', 0, 0);
    ctx.restore();
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  ctx.restore();
}

// ── HUD ──
function updateHUD() {
  const fs = fightState;
  document.getElementById('player-health-fill').style.width = `${Math.max(0, fs.player.hp)}%`;
  document.getElementById('ai-health-fill').style.width = `${Math.max(0, fs.ai.hp)}%`;
  document.getElementById('player-stamina-fill').style.width = `${fs.player.sp}%`;
  document.getElementById('ai-stamina-fill').style.width = `${fs.ai.sp}%`;
  document.getElementById('player-stamina-text').textContent = Math.floor(fs.player.sp);
  document.getElementById('round-num').textContent = fs.round;
  document.getElementById('fight-message').textContent = fs.message;

  if (fs.combo > 1) {
    document.getElementById('combo-display').textContent = `🔥 COMBO x${fs.combo}!`;
  } else {
    document.getElementById('combo-display').textContent = '';
  }

  // Color health bars when low
  const pFill = document.getElementById('player-health-fill');
  const aFill = document.getElementById('ai-health-fill');
  pFill.style.background = fs.player.hp < 25 ? '#f44' : 'linear-gradient(90deg, #0f8, #0fa)';
  aFill.style.background = fs.ai.hp < 25 ? '#f44' : 'linear-gradient(90deg, #f44, #f88)';
}

// ── Round Management ──
function startFight() {
  const oppIdx = playerStats.currentOpponent;
  const opp = OPPONENTS[Math.min(oppIdx, OPPONENTS.length - 1)];
  fightState.opponent = opp;
  fightState.round = 1;
  fightState.roundWins = [0, 0];
  fightState.maxCombo = 0;
  fightState.totalDamage = 0;
  fightState.totalHits = 0;
  fightState.hitsLanded = 0;

  document.getElementById('ai-name').textContent = `${opp.emoji} ${opp.name} (${opp.title})`;
  document.getElementById('player-name').textContent = '🥊 You';

  startRound();
  gameState = 'fight';
  document.getElementById('menu-screen').style.display = 'none';
  document.getElementById('fight-screen').style.display = 'block';
  lastTime = performance.now();
  animFrame = requestAnimationFrame(gameLoop);
}

function startRound() {
  const fs = fightState;
  const opp = fs.opponent;

  fs.player.hp = playerStats.maxHp;
  fs.player.sp = playerStats.maxSp;
  fs.player.x = 180;
  fs.player.y = 200;
  fs.player.vx = 0;
  fs.player.vy = 0;
  fs.player.blocking = false;
  fs.player.punching = false;
  fs.player.knockdown = false;
  fs.player.hitTimer = 0;

  fs.ai.hp = opp.hp;
  fs.ai.sp = 100;
  fs.ai.x = 420;
  fs.ai.y = 200;
  fs.ai.vx = 0;
  fs.ai.vy = 0;
  fs.ai.blocking = false;
  fs.ai.punching = false;
  fs.ai.knockdown = false;
  fs.ai.hitTimer = 0;
  fs.ai.actionTimer = 1;

  fs.time = 90;
  fs.combo = 0;
  fs.comboTimer = 0;
  fs.roundActive = true;
  fs.roundOver = false;
  fs.koAnimTimer = 0;
  fs.message = `Round ${fs.round} — FIGHT!`;
  fs.messageTimer = 2;
  fs.particles = [];

  sndBell();
  updateHUD();
}

function endRound() {
  const fs = fightState;
  fs.roundActive = false;
  fs.roundOver = true;

  let winner;
  if (fs.player.hp <= 0 && fs.ai.hp > 0) winner = 'ai';
  else if (fs.ai.hp <= 0 && fs.player.hp > 0) winner = 'player';
  else if (fs.player.hp > fs.ai.hp) winner = 'player';
  else if (fs.ai.hp > fs.player.hp) winner = 'ai';
  else winner = 'draw';

  if (winner === 'player') {
    fs.roundWins[0]++;
    fs.message = `Round ${fs.round} — YOU WIN!`;
    if (fs.ai.hp <= 0) { playerStats.kos++; sndKO(); }
  } else if (winner === 'ai') {
    fs.roundWins[1]++;
    fs.message = `Round ${fs.round} — OPPONENT WINS`;
    // sndKO already played on knockdown in update()
  } else {
    fs.message = `Round ${fs.round} — DRAW`;
  }
  fs.messageTimer = 3;

  // Determine if fight is over
  const totalRounds = 3;
  const needed = 2;
  if (fs.roundWins[0] >= needed || fs.roundWins[1] >= needed || fs.round >= totalRounds) {
    // Fight over
    setTimeout(() => showFightResult(), 2000);
  } else {
    fs.round++;
    setTimeout(() => startRound(), 2500);
  }
}

function showFightResult() {
  cancelAnimationFrame(animFrame);
  gameState = 'roundEnd';

  const fs = fightState;
  const won = fs.roundWins[0] > fs.roundWins[1];

  document.getElementById('fight-screen').style.display = 'none';
  document.getElementById('round-result').style.display = 'block';

  const title = document.getElementById('round-result-title');
  const stats = document.getElementById('round-result-stats');

  if (won) {
    title.textContent = '🏆 VICTORY!';
    title.style.color = '#0f0';
    playerStats.wins++;
  } else {
    title.textContent = '💀 DEFEAT';
    title.style.color = '#f44';
    playerStats.losses++;
  }

  stats.innerHTML = `Rounds Won: ${fs.roundWins[0]} - ${fs.roundWins[1]}<br>` +
    `Damage Dealt: ${fs.totalDamage}<br>Hits Landed: ${fs.hitsLanded}/${fs.totalHits}<br>` +
    `Max Combo: x${fs.maxCombo}`;

  // Coins
  let coins = 0;
  coins += fs.roundWins[0] * 30;
  if (won) coins += 100;
  if (won && playerStats.currentOpponent >= 11) coins += 500;

  if (won && playerStats.currentOpponent < OPPONENTS.length - 1) {
    playerStats.currentOpponent++;
  }

  document.getElementById('round-scores').textContent = `🪙 +${coins} coins earned!`;
  addCoins(coins);
  saveStats();

  // Show ad between fights
  document.getElementById('ad-mockup').style.display = 'block';

  // Reset ad button
  const adBtn = document.getElementById('watch-ad-btn');
  adBtn.textContent = '▶ Watch Ad (30s)';
  adBtn.disabled = false;
  adBtn.style.background = '#ffd700';

  document.getElementById('next-round-btn').textContent = won ? 'Next Opponent →' : 'Retrain & Retry';
}

// ── Training ──
let trainAnim = null;
function doTraining(stat) {
  initAudio();
  if (!spendCoins(20)) {
    document.getElementById('train-result').textContent = 'Not enough coins!';
    return;
  }

  const gain = 1 + Math.floor(Math.random() * 2);
  playerStats[stat] = Math.min(20, playerStats[stat] + gain);

  // HP/SP increase
  playerStats.maxHp = 80 + playerStats.stamina * 4 + playerStats.defense * 2;
  playerStats.maxSp = 80 + playerStats.stamina * 3;

  saveStats();
  document.getElementById('train-result').textContent = `+${gain} ${stat.toUpperCase()}! (${playerStats[stat]})`;
  playSound(600, 0.1, 'sine', 0.06);

  // Simple training animation
  const tc = document.getElementById('train-canvas');
  tc.style.display = 'block';
  const tctx = tc.getContext('2d');
  let frames = 0;
  if (trainAnim) cancelAnimationFrame(trainAnim);

  function animTrain() {
    frames++;
    tctx.fillStyle = '#0a0a0f';
    tctx.fillRect(0, 0, 400, 200);

    if (stat === 'power') {
      // Heavy bag
      tctx.fillStyle = '#8B4513';
      tctx.fillRect(180, 40, 40, 80);
      tctx.strokeStyle = '#8B4513';
      tctx.lineWidth = 2;
      tctx.beginPath(); tctx.moveTo(200, 40); tctx.lineTo(200, 10); tctx.stroke();
      if (frames % 10 < 5) {
        tctx.fillStyle = '#f80';
        tctx.beginPath(); tctx.arc(195, 60, 8, 0, Math.PI * 2); tctx.fill();
        tctx.fillStyle = '#fff';
        tctx.font = '20px serif';
        tctx.textAlign = 'center';
        tctx.fillText('💥', 170, 60);
      }
    } else if (stat === 'speed') {
      // Speed bag
      tctx.fillStyle = '#f44';
      tctx.beginPath();
      tctx.arc(200, 80 + Math.sin(frames * 0.5) * 15, 15, 0, Math.PI * 2);
      tctx.fill();
    } else if (stat === 'stamina') {
      // Jump rope
      tctx.fillStyle = '#0af';
      tctx.fillRect(185, 120, 30, 40);
      const ropeY = 100 + Math.sin(frames * 0.3) * 30;
      tctx.strokeStyle = '#0f8';
      tctx.lineWidth = 2;
      tctx.beginPath(); tctx.arc(200, ropeY, 25, 0, Math.PI); tctx.stroke();
    } else {
      // Sparring
      tctx.fillStyle = '#0f8';
      tctx.beginPath(); tctx.ellipse(180, 100, 15, 25, 0, 0, Math.PI*2); tctx.fill();
      tctx.fillStyle = '#f44';
      tctx.beginPath(); tctx.ellipse(220, 100, 15, 25, 0, 0, Math.PI*2); tctx.fill();
    }

    tctx.fillStyle = '#fff';
    tctx.font = '12px Courier New';
    tctx.textAlign = 'center';
    tctx.fillText(`Training ${stat.toUpperCase()}...`, 200, 190);

    if (frames < 90) trainAnim = requestAnimationFrame(animTrain);
    else { tc.style.display = 'none'; }
  }
  animTrain();
}

// ── Game Loop ──
function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  if (gameState === 'fight') animFrame = requestAnimationFrame(gameLoop);
}

// ── Input ──
document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') e.preventDefault();
  if (gameState === 'fight') {
    if (e.key.toLowerCase() === 'z') playerPunch('jab');
    if (e.key.toLowerCase() === 'x') playerPunch('hook');
    if (e.key.toLowerCase() === 'c') playerPunch('uppercut');
  }
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// ── Init ──
function init() {
  canvas = document.getElementById('boxing-canvas');
  ctx = canvas.getContext('2d');
  document.getElementById('coins').textContent = getCoins();

  // Update max HP/SP
  playerStats.maxHp = 80 + playerStats.stamina * 4 + playerStats.defense * 2;
  playerStats.maxSp = 80 + playerStats.stamina * 3;

  updateMenuDisplay();

  document.getElementById('fight-btn').addEventListener('click', () => {
    initAudio();
    startFight();
  });

  document.getElementById('train-btn').addEventListener('click', () => {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('train-screen').style.display = 'block';
  });

  document.getElementById('stats-btn').addEventListener('click', () => {
    const oppIdx = Math.min(playerStats.currentOpponent, OPPONENTS.length - 1);
    const opp = OPPONENTS[oppIdx];
    alert(`YOUR STATS\nPower: ${playerStats.power}/20\nSpeed: ${playerStats.speed}/20\nStamina: ${playerStats.stamina}/20\nDefense: ${playerStats.defense}/20\nHP: ${playerStats.maxHp}\nSP: ${playerStats.maxSp}\n\nRecord: ${playerStats.wins}W - ${playerStats.losses}L\nKOs: ${playerStats.kos}\nNext: ${opp.emoji} ${opp.name} (${opp.title})`);
  });

  document.querySelectorAll('.train-btn').forEach(btn => {
    btn.addEventListener('click', () => doTraining(btn.dataset.stat));
  });

  document.getElementById('train-back').addEventListener('click', () => {
    document.getElementById('train-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
    updateMenuDisplay();
  });

  document.getElementById('next-round-btn').addEventListener('click', () => {
    document.getElementById('round-result').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
    updateMenuDisplay();
  });

  document.getElementById('retreat-btn').addEventListener('click', () => {
    document.getElementById('round-result').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
    updateMenuDisplay();
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
        btn.textContent = '✅ Stamina Restored!'; btn.style.background = '#0f0';
        playerStats.maxHp = 80 + playerStats.stamina * 4 + playerStats.defense * 2;
        playerStats.maxSp = 80 + playerStats.stamina * 3;
        saveStats();
      }
    }, 1000);
  });

  document.getElementById('gameover-menu-btn').addEventListener('click', () => {
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
    updateMenuDisplay();
  });
}

function updateMenuDisplay() {
  const oppIdx = Math.min(playerStats.currentOpponent, OPPONENTS.length - 1);
  const opp = OPPONENTS[oppIdx];

  document.getElementById('opponent-preview').innerHTML =
    `Next Opponent: ${opp.emoji} <strong>${opp.name}</strong> (${opp.title})<br>` +
    `Style: ${opp.style.toUpperCase()} | PWR:${opp.power} SPD:${opp.speed} STA:${opp.stamina} DEF:${opp.defense} HP:${opp.hp}`;

  document.getElementById('player-info-panel').innerHTML =
    `PWR: ${playerStats.power} | SPD: ${playerStats.speed} | STA: ${playerStats.stamina} | DEF: ${playerStats.defense}<br>` +
    `HP: ${playerStats.maxHp} | SP: ${playerStats.maxSp} | Record: ${playerStats.wins}W-${playerStats.losses}L | KOs: ${playerStats.kos}<br>` +
    `Opponent: ${oppIdx + 1}/${OPPONENTS.length}`;
}

document.addEventListener('DOMContentLoaded', init);
})();
