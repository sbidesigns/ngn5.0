// ═══════════════════════════════════════════════
// NGN4 GAME 29: NEON DASH - Endless Runner
// ═══════════════════════════════════════════════

(function() {
  'use strict';

  // ── NGN4 Universal Systems Init ──
  try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
  try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('29-neon-dash'); } catch(e) {}

  // ── Audio ──
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  function ensureAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
  function playTone(f, d, t = 'sine', v = 0.1) {
    ensureAudio();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.value = f;
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
  }
  function sfxJump() { playTone(300 + Math.random() * 200, 0.1, 'square', 0.06); }
  function sfxCoin() { playTone(1200, 0.1, 'sine', 0.08); setTimeout(() => playTone(1500, 0.1, 'sine', 0.08), 50); }
  function sfxHit() { playTone(100, 0.3, 'sawtooth', 0.15); }
  function sfxPowerup() { [600, 800, 1000].forEach((f, i) => setTimeout(() => playTone(f, 0.1, 'sine', 0.08), i * 50)); }
  function sfxSlide() { playTone(200, 0.15, 'triangle', 0.06); }
  function sfxClick() { playTone(440, 0.05, 'square', 0.05); }
  function sfxMission() { [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'sine', 0.1), i * 100)); }

  // ── Rewards ──
  function getRewards() { try { return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, gems: 0 }; } catch { return { coins: 0, gems: 0 }; } }
  function saveRewards(r) { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); }
  function addCoins(n) { const r = getRewards(); r.coins += n; saveRewards(r); }

  // ── Save ──
  function getSave() {
    try { return JSON.parse(localStorage.getItem('ngn4_neondash')) || defaultSave(); }
    catch { return defaultSave(); }
  }
  function defaultSave() {
    return {
      best: 0, totalCoins: 0, vehicle: 0, ownedVehicles: [0],
      missions: {},
      missionProgress: { coins: 0, jumps: 0, distance: 0, slides: 0, runs: 0 },
      totalRuns: 0, totalJumps: 0, totalSlides: 0, totalDistance: 0
    };
  }
  function saveSave(s) { localStorage.setItem('ngn4_neondash', JSON.stringify(s)); }

  // ── Vehicles ──
  const VEHICLES = [
    { id: 0, name: 'Runner', icon: '🏃', width: 20, height: 35, cost: 0, bonus: 'none' },
    { id: 1, name: 'Hoverboard', icon: '🛹', width: 25, height: 20, cost: 100, bonus: 'float' },
    { id: 2, name: 'Motorcycle', icon: '🏍️', width: 30, height: 22, cost: 250, bonus: 'speed' },
    { id: 3, name: 'Sports Car', icon: '🏎️', width: 40, height: 25, cost: 500, bonus: 'shield' },
    { id: 4, name: 'Jet', icon: '✈️', width: 45, height: 28, cost: 1000, bonus: 'fly' },
  ];

  // ── Missions ──
  const MISSIONS = [
    { id: 'm1', desc: 'Collect 50 coins in one run', target: 50, type: 'coins', reward: 50, icon: '🪙' },
    { id: 'm2', desc: 'Jump 30 times in one run', target: 30, type: 'jumps', reward: 40, icon: '⬆️' },
    { id: 'm3', desc: 'Survive 1000m', target: 1000, type: 'distance', reward: 60, icon: '📏' },
    { id: 'm4', desc: 'Slide 15 times in one run', target: 15, type: 'slides', reward: 30, icon: '⬇️' },
    { id: 'm5', desc: 'Collect 100 coins total', target: 100, type: 'totalCoins', reward: 80, icon: '💰' },
    { id: 'm6', desc: 'Complete 5 runs', target: 5, type: 'runs', reward: 50, icon: '🔄' },
    { id: 'm7', desc: 'Reach 500m in one run', target: 500, type: 'distance', reward: 70, icon: '🏆' },
    { id: 'm8', desc: 'Jump 50 times in one run', target: 50, type: 'jumps', reward: 60, icon: '🦘' },
    { id: 'm9', desc: 'Collect 200 coins total', target: 200, type: 'totalCoins', reward: 120, icon: '💎' },
    { id: 'm10', desc: 'Reach 2000m in one run', target: 2000, type: 'distance', reward: 100, icon: '🌟' },
  ];

  // ── Power-ups ──
  const POWERUP_TYPES = [
    { id: 'magnet', name: 'MAGNET', icon: '🧲', color: '#ff00aa', duration: 300 },
    { id: 'shield', name: 'SHIELD', icon: '🛡️', color: '#00aaff', duration: 200 },
    { id: 'double', name: '2X COINS', icon: '✨', color: '#ffd700', duration: 300 },
    { id: 'mega', name: 'MEGA JUMP', icon: '🚀', color: '#ff6600', duration: 1 },
  ];

  // ── Game State ──
  let canvas, ctx, W, H;
  let gameState = 'menu';
  let player, obstacles, coins, powerups, particles, bgElements;
  let distance, coinsCollected, jumpsThisRun, slidesThisRun;
  let speed, baseSpeed;
  let groundY;
  let isJumping, isSliding, canDoubleJump;
  let activePowerup;
  let shieldActive;
  let currentLane = 1; // 0=top, 1=middle, 2=bottom
  let laneY; // computed lane Y positions
  let runStats;
  let afterAdAction;
  let obstacleTimer;
  let laneSwitchCooldown = 0;

  const LANE_COUNT = 3;
  const LANE_SPACING = 55;
  const GROUND_RATIO = 0.82;

  // ── Screen Management ──
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  window.showMenu = function() {
    gameState = 'menu';
    const s = getSave();
    document.getElementById('menu-best').textContent = s.best;
    document.getElementById('menu-coins').textContent = getRewards().coins;
    showScreen('menu-screen');
  };

  // ── Vehicle Garage ──
  window.showGarage = function() {
    sfxClick();
    const s = getSave();
    const grid = document.getElementById('vehicle-grid');
    grid.innerHTML = '';
    VEHICLES.forEach((v, i) => {
      const owned = s.ownedVehicles.includes(i);
      const active = s.vehicle === i;
      const card = document.createElement('div');
      card.className = 'vehicle-card' + (active ? ' active' : owned ? ' owned' : ' locked');
      card.innerHTML = `
        <span class="v-icon">${v.icon}</span>
        <span class="v-name">${v.name}</span>
        ${!owned ? `<span class="v-cost">${v.cost} 🪙</span>` : active ? '<span class="v-cost" style="color:var(--accent)">ACTIVE</span>' : '<span class="v-cost">OWNED</span>'}
      `;
      card.onclick = () => {
        if (owned) {
          s.vehicle = i;
          saveSave(s);
          showGarage();
          showToast(`Equipped ${v.name}!`);
        } else {
          const r = getRewards();
          if (r.coins >= v.cost) {
            r.coins -= v.cost;
            saveRewards(r);
            s.ownedVehicles.push(i);
            s.vehicle = i;
            saveSave(s);
            showGarage();
            showToast(`Unlocked ${v.name}!`);
          } else {
            showToast(`Need ${v.cost} coins!`);
          }
        }
        sfxClick();
      };
      grid.appendChild(card);
    });
    showScreen('garage-screen');
  };

  // ── Missions ──
  window.showMissions = function() {
    sfxClick();
    const s = getSave();
    const list = document.getElementById('missions-list');
    list.innerHTML = '';
    MISSIONS.forEach(m => {
      const completed = !!s.missions[m.id];
      let progress = 0;
      if (m.type === 'totalCoins') progress = Math.min(s.totalCoins || 0, m.target);
      else if (m.type === 'runs') progress = Math.min(s.totalRuns || 0, m.target);
      else progress = Math.min(s.missionProgress[m.type] || 0, m.target);

      const item = document.createElement('div');
      item.className = 'mission-item' + (completed ? ' completed' : '');
      item.innerHTML = `
        <span class="m-icon">${completed ? '✅' : m.icon}</span>
        <span class="m-desc">${m.desc}</span>
        <span class="m-progress">${progress}/${m.target}</span>
        <span class="m-reward">+${m.reward} 🪙</span>
      `;
      list.appendChild(item);
    });
    showScreen('missions-screen');
  };

  // ── Start Game ──
  window.startGame = function() {
    sfxClick();
    const s = getSave();
    const veh = VEHICLES[s.vehicle] || VEHICLES[0];
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    W = canvas.width = canvas.parentElement.clientWidth || 600;
    H = canvas.height = canvas.parentElement.clientHeight || 500;
    groundY = H * GROUND_RATIO;
    // Compute 3 lane Y positions (bottom of each lane)
    laneY = [
      groundY - LANE_SPACING * 2,  // top lane
      groundY - LANE_SPACING,       // middle lane
      groundY                         // bottom lane
    ];

    // Init player
    player = {
      x: 80,
      y: laneY[1] - veh.height,
      targetY: laneY[1] - veh.height,
      w: veh.width,
      h: veh.height,
      vy: 0,
      icon: veh.icon,
      bonus: veh.bonus,
      sliding: false
    };
    currentLane = 1;
    laneSwitchCooldown = 0;

    obstacles = [];
    coins = [];
    powerups = [];
    particles = [];
    bgElements = [];

    distance = 0;
    coinsCollected = 0;
    jumpsThisRun = 0;
    slidesThisRun = 0;
    speed = 4;
    baseSpeed = 4;
    isJumping = false;
    isSliding = false;
    canDoubleJump = true;
    activePowerup = null;
    shieldActive = false;
    obstacleTimer = 0;

    // Init run stats
    runStats = { coins: 0, jumps: 0, slides: 0, distance: 0 };

    // Generate bg elements
    for (let i = 0; i < 20; i++) {
      bgElements.push({
        x: Math.random() * W,
        y: Math.random() * (groundY - 50) + 20,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.2,
        type: Math.random() < 0.3 ? 'building' : 'star'
      });
    }

    // Init missions progress
    const sv = getSave();
    sv.missionProgress = { coins: 0, jumps: 0, distance: 0, slides: 0, runs: 0 };
    saveSave(sv);

    gameState = 'playing';
    showScreen('game-screen');
    document.getElementById('hud-powerup').style.display = 'none';
    canvas.focus();
  };

  // ── Lane Switching ──
  function switchLane(dir) {
    // dir: -1 = up (lane 0), +1 = down (lane 2)
    if (gameState !== 'playing' || laneSwitchCooldown > 0) return;
    const newLane = Math.max(0, Math.min(LANE_COUNT - 1, currentLane + dir));
    if (newLane === currentLane) return;
    currentLane = newLane;
    player.targetY = laneY[currentLane] - player.h;
    laneSwitchCooldown = 8;
    sfxSlide();
    // Lane switch particles
    for (let i = 0; i < 4; i++) {
      particles.push({ x: player.x + player.w, y: player.y + player.h / 2, vx: Math.random() * 2, vy: (Math.random() - 0.5) * 3, life: 0.6, decay: 0.04, size: 3, color: '#00ff88' });
    }
  }

  // ── Input ──
  function jump() {
    if (gameState !== 'playing') return;
    if (isSliding) {
      isSliding = false;
      player.h = VEHICLES[getSave().vehicle || 0].height;
      player.targetY = laneY[currentLane] - player.h;
      return;
    }

    if (!isJumping) {
      player.vy = -12;
      isJumping = true;
      canDoubleJump = true;
      jumpsThisRun++;
      runStats.jumps++;
      sfxJump();
    } else if (canDoubleJump && player.bonus !== 'fly') {
      player.vy = -10;
      canDoubleJump = false;
      jumpsThisRun++;
      runStats.jumps++;
      sfxJump();
      for (let i = 0; i < 5; i++) {
        particles.push({ x: player.x, y: player.y + player.h, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 2, life: 1, decay: 0.03, size: 3, color: '#00ff88' });
      }
    }
  }

  function slide() {
    if (gameState !== 'playing' || isJumping) return;
    if (!isSliding) {
      isSliding = true;
      player.h = 15;
      slidesThisRun++;
      runStats.slides++;
      sfxSlide();
      setTimeout(() => {
        if (isSliding) {
          isSliding = false;
          player.h = VEHICLES[getSave().vehicle || 0].height;
          player.targetY = laneY[currentLane] - player.h;
        }
      }, 600);
    }
  }

  // ── Spawn Obstacles ──
  function spawnObstacle() {
    const types = ['barrier', 'lowbeam', 'laser'];
    const type = types[Math.floor(Math.random() * types.length)];
    // Pick a random lane for this obstacle
    const obsLane = Math.floor(Math.random() * LANE_COUNT);
    const ly = laneY[obsLane];
    let obs = { x: W + 10, type: type, lane: obsLane, scored: false };

    switch (type) {
      case 'barrier':
        obs.y = ly - 40;
        obs.w = 25 + Math.random() * 15;
        obs.h = 40;
        obs.color = '#ff3333';
        break;
      case 'lowbeam':
        obs.y = ly - 25;
        obs.w = 50 + Math.random() * 30;
        obs.h = 15;
        obs.color = '#ff00aa';
        break;
      case 'laser':
        obs.y = ly - 55 - Math.random() * 20;
        obs.w = 80;
        obs.h = 5;
        obs.color = '#ff0044';
        break;
    }
    obstacles.push(obs);

    // Sometimes spawn a second obstacle in a different lane (double obstacle)
    if (distance > 300 && Math.random() < 0.35) {
      let lane2 = (obsLane + 1 + Math.floor(Math.random() * 2)) % LANE_COUNT;
      const ly2 = laneY[lane2];
      let obs2 = { x: W + 10, type: 'barrier', lane: lane2, scored: false, y: ly2 - 40, w: 25, h: 40, color: '#ff5555' };
      obstacles.push(obs2);
    }

    // Coins in a lane (often a different lane from the obstacle)
    if (Math.random() < 0.7) {
      const coinLane = Math.random() < 0.6 ? (obsLane + 1 + Math.floor(Math.random() * 2)) % LANE_COUNT : obsLane;
      const coinCount = Math.floor(Math.random() * 4) + 1;
      const cly = laneY[coinLane];
      for (let i = 0; i < coinCount; i++) {
        coins.push({
          x: obs.x + 30 + i * 25,
          y: cly - 30 - Math.random() * 20,
          lane: coinLane,
          size: 8, collected: false
        });
      }
    }

    // Power-up (8% chance)
    if (Math.random() < 0.08 && !activePowerup) {
      const pu = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      const puLane = Math.floor(Math.random() * LANE_COUNT);
      powerups.push({
        x: obs.x + 50,
        y: laneY[puLane] - 50,
        lane: puLane,
        size: 12, collected: false,
        type: pu.id, name: pu.name, icon: pu.icon, color: pu.color, duration: pu.duration
      });
    }
  }

  // ── Collision ──
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ── Game Loop ──
  let lastTime = 0;
  function gameLoop(time) {
    const dt = Math.min((time - lastTime) / 16.67, 3);
    lastTime = time;
    if (gameState === 'playing') { update(dt); draw(); }
    requestAnimationFrame(gameLoop);
  }

  function update(dt) {
    // Speed increases
    speed = baseSpeed + distance * 0.002;
    distance += speed * dt * 0.5;
    runStats.distance = distance;

    // Lane switch cooldown
    if (laneSwitchCooldown > 0) laneSwitchCooldown -= dt;

    // Smooth lane switching
    if (!isJumping) {
      const diff = player.targetY - player.y;
      if (Math.abs(diff) > 1) {
        player.y += diff * 0.2 * dt;
      } else {
        player.y = player.targetY;
      }
    }

    // Player physics (jumping within lane)
    if (isJumping) {
      player.vy += 0.6 * dt;
      player.y += player.vy * dt;
      const laneFloor = laneY[currentLane] - player.h;
      if (player.y >= laneFloor) {
        player.y = laneFloor;
        player.vy = 0;
        isJumping = false;
        canDoubleJump = true;
        player.targetY = laneFloor;
      }
    }

    // Fly bonus
    if (player.bonus === 'fly' && !isSliding) {
      player.y = groundY - player.h - 10 - Math.sin(Date.now() * 0.003) * 8;
      isJumping = false;
    }

    // Shield bonus (from vehicle)
    shieldActive = player.bonus === 'shield';

    // Speed bonus
    if (player.bonus === 'speed') speed *= 1.15;

    // Obstacle spawning
    obstacleTimer += dt;
    const spawnInterval = Math.max(30, 80 - distance * 0.01);
    if (obstacleTimer >= spawnInterval) {
      obstacleTimer = 0;
      spawnObstacle();
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= speed * dt;

      // Only collide with obstacles in the player's current lane
      if (obs.lane !== undefined && obs.lane !== currentLane) continue;

      // Collision
      if (rectsOverlap(player, obs)) {
        if (shieldActive || (activePowerup && activePowerup.type === 'shield')) {
          obstacles.splice(i, 1);
          sfxPowerup();
          shieldActive = false;
          if (activePowerup && activePowerup.type === 'shield') activePowerup = null;
          showToast('Shield blocked!');
          continue;
        }
        if (obs.type === 'lowbeam' && isSliding) continue;
        if (obs.type === 'laser' && player.y + player.h < obs.y) continue;
        if (obs.type === 'barrier' && isJumping && player.y + player.h < obs.y) continue;
        die();
        return;
      }

      // Score
      if (!obs.scored && obs.x + obs.w < player.x) {
        obs.scored = true;
      }

      if (obs.x + obs.w < -20) obstacles.splice(i, 1);
    }

    // Update coins
    const magnetRange = activePowerup && activePowerup.type === 'magnet' ? 150 : 0;
    for (let i = coins.length - 1; i >= 0; i--) {
      const coin = coins[i];
      coin.x -= speed * dt;

      if (!coin.collected) {
        const dx = player.x + player.w / 2 - coin.x;
        const dy = player.y + player.h / 2 - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Magnet effect
        if (magnetRange > 0 && dist < magnetRange) {
          coin.x += dx * 0.1 * dt;
          coin.y += dy * 0.1 * dt;
        }

        if (dist < player.w / 2 + coin.size) {
          coin.collected = true;
          const value = (activePowerup && activePowerup.type === 'double') ? 2 : 1;
          coinsCollected += value;
          runStats.coins += value;
          sfxCoin();
          for (let j = 0; j < 4; j++) {
            particles.push({ x: coin.x, y: coin.y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, life: 1, decay: 0.04, size: 3, color: '#ffd700' });
          }
        }
      }

      if (coin.x < -20) coins.splice(i, 1);
    }

    // Update power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.x -= speed * dt;
      if (!pu.collected) {
        const dx = player.x + player.w / 2 - pu.x;
        const dy = player.y + player.h / 2 - pu.y;
        if (Math.sqrt(dx * dx + dy * dy) < player.w / 2 + pu.size) {
          pu.collected = true;
          activePowerup = { type: pu.type, timer: pu.duration };
          sfxPowerup();
          showToast(`${pu.icon} ${pu.name}!`);
          document.getElementById('hud-powerup').style.display = 'inline';
          document.getElementById('hud-powerup').textContent = pu.icon + ' ' + pu.name;

          if (pu.type === 'mega') {
            player.vy = -18;
            isJumping = true;
          }
        }
      }
      if (pu.x < -20) powerups.splice(i, 1);
    }

    // Power-up timer
    if (activePowerup) {
      activePowerup.timer -= dt;
      if (activePowerup.timer <= 0) {
        activePowerup = null;
        document.getElementById('hud-powerup').style.display = 'none';
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Running particles
    if (!isJumping && Math.random() < 0.3) {
      particles.push({
        x: player.x, y: groundY, vx: -Math.random() * 2, vy: -Math.random() * 1.5,
        life: 0.6, decay: 0.03, size: 2, color: '#00ff8844'
      });
    }

    // BG elements
    bgElements.forEach(bg => {
      bg.x -= (bg.speed + speed * 0.3) * dt;
      if (bg.x < -10) { bg.x = W + 10; bg.y = Math.random() * (groundY - 50) + 20; }
    });

    // HUD
    document.getElementById('hud-distance').textContent = Math.floor(distance) + 'm';
    document.getElementById('hud-coins-hud').textContent = '🪙 ' + coinsCollected;
    document.getElementById('hud-speed').textContent = 'SPD: ' + speed.toFixed(1);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, '#050510');
    skyGrad.addColorStop(1, '#0a0a20');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, groundY);

    // BG elements (buildings/stars)
    bgElements.forEach(bg => {
      if (bg.type === 'building') {
        ctx.fillStyle = '#0f0f1a';
        const bh = 30 + bg.size * 20;
        ctx.fillRect(bg.x, groundY - bh, 15 + bg.size * 5, bh);
        ctx.fillStyle = '#00ff8808';
        for (let wy = groundY - bh + 5; wy < groundY - 5; wy += 8) {
          for (let wx = bg.x + 3; wx < bg.x + 12; wx += 6) {
            if (Math.random() < 0.3) ctx.fillRect(wx, wy, 3, 3);
          }
        }
      } else {
        ctx.fillStyle = '#ffffff33';
        ctx.fillRect(bg.x, bg.y, bg.size, bg.size);
      }
    });

    // Ground and lane markings
    ctx.fillStyle = '#0a0a15';
    ctx.fillRect(0, laneY[2], W, H - laneY[2]);

    // Draw lane dividers
    ctx.strokeStyle = '#00ff8822';
    ctx.lineWidth = 1;
    ctx.setLineDash([15, 12]);
    for (let l = 0; l < LANE_COUNT - 1; l++) {
      const divY = laneY[l] + (laneY[l + 1] - laneY[l]) / 2;
      ctx.beginPath();
      ctx.moveTo(0, divY);
      ctx.lineTo(W, divY);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Highlight current lane
    ctx.fillStyle = '#00ff8808';
    const laneTop = laneY[currentLane] - LANE_SPACING;
    ctx.fillRect(0, laneTop, W, LANE_SPACING);

    // Lane edges (bright)
    ctx.strokeStyle = '#00ff8833';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, laneY[0] - LANE_SPACING);
    ctx.lineTo(W, laneY[0] - LANE_SPACING);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // Lane labels (subtle)
    ctx.fillStyle = '#00ff8815';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let l = 0; l < LANE_COUNT; l++) {
      ctx.fillText(['TOP', 'MID', 'BTM'][l], W - 8, laneY[l] - LANE_SPACING + 12);
    }

    // Obstacles
    obstacles.forEach(obs => {
      ctx.fillStyle = obs.color;
      ctx.shadowColor = obs.color;
      ctx.shadowBlur = 8;

      if (obs.type === 'gap') {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 1;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        // Warning stripes
        ctx.fillStyle = '#ff660033';
        for (let sx = obs.x; sx < obs.x + obs.w; sx += 10) {
          ctx.fillRect(sx, obs.y, 5, obs.h);
        }
      } else if (obs.type === 'laser') {
        ctx.strokeStyle = obs.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + obs.h / 2);
        ctx.lineTo(obs.x + obs.w, obs.y + obs.h / 2);
        ctx.stroke();
        // Glow
        ctx.strokeStyle = obs.color + '44';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + obs.h / 2);
        ctx.lineTo(obs.x + obs.w, obs.y + obs.h / 2);
        ctx.stroke();
      } else {
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        // Neon border
        ctx.strokeStyle = obs.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      }
      ctx.shadowBlur = 0;
    });

    // Coins
    coins.forEach(coin => {
      if (coin.collected) return;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coin.size, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#aa8800';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', coin.x, coin.y);
    });

    // Power-ups
    powerups.forEach(pu => {
      if (pu.collected) return;
      ctx.save();
      ctx.translate(pu.x, pu.y);
      // Glow
      ctx.beginPath();
      ctx.arc(0, 0, pu.size + 4, 0, Math.PI * 2);
      ctx.fillStyle = pu.color + '22';
      ctx.fill();
      ctx.strokeStyle = pu.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Icon
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.icon, 0, 0);
      ctx.restore();
    });

    // Player
    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
    if (isSliding) {
      ctx.rotate(Math.PI / 2);
      ctx.scale(0.8, 0.5);
    }
    ctx.font = `${player.h * 0.9}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shield glow
    if (shieldActive) {
      ctx.shadowColor = '#00aaff';
      ctx.shadowBlur = 15;
    }
    ctx.fillText(player.icon, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }

  // ── Die ──
  function die() {
    gameState = 'dead';
    sfxHit();
    const s = getSave();

    // Save stats
    s.totalCoins += coinsCollected;
    s.totalJumps += jumpsThisRun;
    s.totalSlides += slidesThisRun;
    s.totalDistance = Math.max(s.totalDistance || 0, Math.floor(distance));
    s.totalRuns = (s.totalRuns || 0) + 1;
    s.missionProgress.coins = runStats.coins;
    s.missionProgress.jumps = runStats.jumps;
    s.missionProgress.distance = Math.floor(runStats.distance);
    s.missionProgress.slides = runStats.slides;
    s.missionProgress.runs = s.totalRuns;

    let isNewBest = false;
    if (distance > s.best) {
      s.best = Math.floor(distance);
      isNewBest = true;
    }

    // Check missions
    let missionRewards = 0;
    MISSIONS.forEach(m => {
      if (s.missions[m.id]) return;
      let progress = 0;
      if (m.type === 'totalCoins') progress = s.totalCoins;
      else if (m.type === 'runs') progress = s.totalRuns;
      else if (m.type === 'distance') progress = Math.floor(distance);
      else progress = s.missionProgress[m.type] || 0;

      if (progress >= m.target) {
        s.missions[m.id] = Date.now();
        missionRewards += m.reward;
        sfxMission();
      }
    });

    addCoins(coinsCollected + missionRewards + (isNewBest ? 10 : 0));
    saveSave(s);

    setTimeout(() => {
      document.getElementById('death-title').textContent = distance > 2000 ? 'INCREDIBLE!' : distance > 500 ? 'GREAT RUN!' : 'WIPEOUT!';
      document.getElementById('death-stats').innerHTML = `
        <div>Distance: ${Math.floor(distance)}m</div>
        <div>Coins: ${coinsCollected}</div>
        <div>Jumps: ${jumpsThisRun}</div>
        <div>${isNewBest ? '🏆 NEW BEST!' : 'Best: ' + s.best + 'm'}</div>
      `;
      document.getElementById('death-rewards').innerHTML = `
        <div class="reward-line">+${coinsCollected} 🪙 (coins collected)</div>
        ${missionRewards > 0 ? `<div class="reward-line">+${missionRewards} 🪙 (missions)</div>` : ''}
        ${isNewBest ? '<div class="reward-line">+10 🪙 (new best!)</div>' : ''}
      `;
      document.getElementById('continue-btn').style.display = 'inline-block';
      showScreen('death-screen');
    }, 500);
  }

  // ── Continue Ad ──
  window.watchContinueAd = function() {
    showAd(() => {
      gameState = 'playing';
      isJumping = true;
      player.vy = -10;
      player.y = groundY - player.h - 50;
      // Clear nearby obstacles
      obstacles = obstacles.filter(o => o.x > player.x + 150);
      shieldActive = true;
      activePowerup = { type: 'shield', timer: 100 };
      showToast('🛡️ Shield activated!');
      document.getElementById('hud-powerup').style.display = 'inline';
      document.getElementById('hud-powerup').textContent = '🛡️ SHIELD';
      showScreen('game-screen');
    });
  };

  // ── Ad ──
  function showAd(callback) {
    showScreen('ad-screen');
    const bar = document.getElementById('ad-progress');
    const timerEl = document.getElementById('ad-timer');
    const closeBtn = document.getElementById('ad-close-btn');
    bar.style.width = '0%';
    closeBtn.style.display = 'none';
    timerEl.textContent = '5s';
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.1;
      bar.style.width = `${(elapsed / 5) * 100}%`;
      timerEl.textContent = `${Math.ceil(5 - elapsed)}s`;
      if (elapsed >= 5) { clearInterval(interval); closeBtn.style.display = 'inline-block'; timerEl.textContent = '✓'; }
    }, 100);
    afterAdAction = callback;
  }

  window.closeAd = function() {
    sfxClick();
    if (afterAdAction) { afterAdAction(); afterAdAction = null; }
    else showScreen('menu-screen');
  };

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  }

  // ── Input ──
  function setupInput() {
    const c = document.getElementById('gameCanvas');
    c.addEventListener('click', (e) => { e.preventDefault(); jump(); });
    c.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); jump(); }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); switchLane(-1); }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); switchLane(1); }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); switchLane(-1); }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); switchLane(1); }
    });
    // Swipe for lane switching and slide
    let touchStartY = 0;
    let touchStartX = 0;
    c.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; touchStartX = e.touches[0].clientX; }, { passive: true });
    c.addEventListener('touchend', (e) => {
      const dy = e.changedTouches[0].clientY - touchStartY;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) {
        if (dy > 30) switchLane(1);
        else switchLane(-1);
      } else if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
        jump();
      }
    }, { passive: true });

    // Gamepad support
    let gpIndex = null;
    let prevGPButtons = {};
    setInterval(() => {
      if (gpIndex === null) {
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < gps.length; i++) { if (gps[i]) { gpIndex = i; break; } }
      }
      if (gpIndex === null) return;
      const gp = navigator.getGamepads()[gpIndex];
      if (!gp) return;
      const btns = {};
      for (let i = 0; i < gp.buttons.length; i++) btns[i] = gp.buttons[i].pressed;
      // A button = jump
      if (btns[0] && !prevGPButtons[0]) jump();
      // D-pad up/down = lane switch
      if (gp.axes[1] < -0.5) switchLane(-1);
      if (gp.axes[1] > 0.5) switchLane(1);
      prevGPButtons = btns;
    }, 16);
  }

  // ── Init ──
  function init() {
    setupInput();
    showMenu();
    requestAnimationFrame(gameLoop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
