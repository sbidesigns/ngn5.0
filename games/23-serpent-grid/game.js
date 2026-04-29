// ═══════════════════════════════════════════════════
// NGN4 Game 23: SERPENT GRID — Modern Snake
// ═══════════════════════════════════════════════════

(function() {
  'use strict';

  // ── NGN4 Universal Systems Init ──
  try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
  try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('23-serpent-grid'); } catch(e) {}

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  function initAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
  function playTone(f, d, t='square', v=0.06) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
  }
  function sfxEat() { playTone(600, 0.08); playTone(900, 0.06, 'sine', 0.04); }
  function sfxPowerup() { playTone(880, 0.1, 'sine', 0.08); playTone(1100, 0.15, 'sine', 0.06); }
  function sfxDie() { playTone(200, 0.4, 'sawtooth', 0.08); }
  function sfxCombo() { playTone(1000, 0.06, 'sine', 0.05); }

  function loadRewards() {
    try { const d = JSON.parse(localStorage.getItem('ngn4_rewards')||'{}'); return {coins:d.coins||0,gems:d.gems||0}; } catch(e) { return {coins:0,gems:0}; }
  }
  function saveRewards(r) { try { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); } catch(e){} }
  let rewards = loadRewards();

  const $ = id => document.getElementById(id);
  const canvas = $('game-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // ── Constants ──
  const GRID = 20;
  const CELL = W / GRID;

  const MODES = [
    { name: 'Classic', desc: 'Eat, grow, survive. No time limit.', timed: false },
    { name: 'Time Attack', desc: '60 seconds — score as high as possible!', timed: true, time: 60 },
    { name: 'Survival', desc: 'Obstacles spawn as you grow!', timed: false, obstacles: true },
    { name: 'Speed', desc: 'The Serpent gets faster over time!', timed: false, speedUp: true },
    { name: 'Maze', desc: 'Navigate through maze walls!', timed: false, mazeMode: true }
  ];

  const SKINS = [
    { name: 'Default', color: '#00ff88', cost: 0 },
    { name: 'Neon Blue', color: '#0088ff', cost: 10 },
    { name: 'Fire', color: '#ff4422', cost: 10 },
    { name: 'Royal', color: '#aa44ff', cost: 15 },
    { name: 'Gold', color: '#ffaa00', cost: 20 },
    { name: 'Ice', color: '#44ddff', cost: 15 },
    { name: 'Toxic', color: '#88ff00', cost: 15 },
    { name: 'Blood', color: '#ff0044', cost: 20 },
    { name: 'Cyber', color: '#ff00ff', cost: 25 },
    { name: 'Ocean', color: '#0066cc', cost: 15 },
    { name: 'Lava', color: '#ff6600', cost: 20 },
    { name: 'Shadow', color: '#444466', cost: 30 },
    { name: 'Rainbow', color: 'rainbow', cost: 50 },
    { name: 'Matrix', color: '#00ff00', cost: 25 },
    { name: 'Plasma', color: '#ff44aa', cost: 30 },
    { name: 'Arctic', color: '#aaddff', cost: 20 },
    { name: 'Ember', color: '#cc4400', cost: 20 },
    { name: 'Volt', color: '#ccff00', cost: 25 },
    { name: 'Nebula', color: '#6622aa', cost: 35 },
    { name: 'Void', color: '#220033', cost: 40 }
  ];

  const POWERUP_TYPES = [
    { name: 'Speed Boost', icon: '⚡', color: '#ffaa00', duration: 5000, effect: 'speed' },
    { name: 'Slow Mo', icon: '🐌', color: '#4488ff', duration: 5000, effect: 'slow' },
    { name: 'Magnet', icon: '🧲', color: '#ff44ff', duration: 8000, effect: 'magnet' },
    { name: 'Shield', icon: '🛡️', color: '#44ffaa', duration: 10000, effect: 'shield' },
    { name: 'Score x2', icon: '✨', color: '#ffff00', duration: 8000, effect: 'double' }
  ];

  // ── State ──
  let currentMode = 0;
  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = null;
  let powerup = null;
  let obstacles = [];
  let mazeWalls = [];
  let score = 0;
  let foodEaten = 0;
  let combo = 0;
  let maxCombo = 0;
  let comboTimer = 0;
  let gameActive = false;
  let gameLoopTimer = null;
  let baseSpeed = 120;
  let currentSpeed = 120;
  let timeLeft = 0;
  let timerInterval = null;
  let activePowerup = null;
  let powerupTimeout = null;
  let speedRevertTimeout = null;
  let activeSkin = 0;
  let unlockedSkins = new Set([0]);
  let highScores = {};
  let hasContinued = false;
  let level = 1;

  // Load saved data
  try {
    const d = JSON.parse(localStorage.getItem('ngn4_serpent') || '{}');
    if (d.unlockedSkins) unlockedSkins = new Set(d.unlockedSkins);
    if (d.activeSkin !== undefined) activeSkin = d.activeSkin;
    if (d.highScores) highScores = d.highScores;
  } catch(e) {}

  function saveData() {
    try {
      localStorage.setItem('ngn4_serpent', JSON.stringify({
        unlockedSkins: [...unlockedSkins],
        activeSkin, highScores
      }));
    } catch(e) {}
  }

  // ── Mode Selection ──
  function renderModeList() {
    const list = $('mode-list');
    list.innerHTML = '';
    MODES.forEach((m, i) => {
      const hs = highScores[m.name] || 0;
      const div = document.createElement('div');
      div.className = 'mode-item';
      div.innerHTML = `
        <div><div class="mode-name">${m.name}</div><div class="mode-desc">${m.desc}</div></div>
        <div class="mode-hs">🏆 ${hs}</div>
      `;
      div.addEventListener('click', () => {
        initAudio();
        currentMode = i;
        startGame();
      });
      list.appendChild(div);
    });
  }

  // ── Skins ──
  function renderSkins() {
    const list = $('skin-list');
    list.innerHTML = '';
    SKINS.forEach((s, i) => {
      const unlocked = unlockedSkins.has(i);
      const isActive = i === activeSkin;
      const div = document.createElement('div');
      div.className = 'skin-item' + (isActive ? ' active' : '') + (!unlocked ? ' locked' : '');
      const previewColor = s.color === 'rainbow' ? '🌈' : '■';
      div.innerHTML = `
        <div class="skin-preview" style="color:${s.color === 'rainbow' ? '#fff' : s.color}">${previewColor}</div>
        <div class="skin-name">${s.name}</div>
        ${!unlocked ? `<div class="skin-cost">${s.cost}🪙</div>` : ''}
      `;
      div.addEventListener('click', () => {
        initAudio();
        if (unlocked) {
          activeSkin = i;
          saveData();
          renderSkins();
          sfxEat();
        } else if (rewards.coins >= s.cost) {
          rewards.coins -= s.cost;
          saveRewards(rewards);
          unlockedSkins.add(i);
          activeSkin = i;
          saveData();
          renderSkins();
          sfxPowerup();
          $('coins-display').textContent = rewards.coins;
        }
      });
      list.appendChild(div);
    });
  }

  // ── Maze Generation ──
  function generateMazeWalls() {
    mazeWalls = [];
    const border = [];
    for (let x = 0; x < GRID; x++) { border.push({x,y:0}); border.push({x,y:GRID-1}); }
    for (let y = 0; y < GRID; y++) { border.push({x:0,y}); border.push({x:GRID-1,y}); }
    mazeWalls.push(...border);

    // Internal walls based on level
    const patterns = [
      // Cross
      () => {
        for (let i = 3; i < GRID - 3; i++) { mazeWalls.push({x:GRID/2,y:i}); mazeWalls.push({x:i,y:GRID/2}); }
      },
      // Rooms
      () => {
        for (let x = 4; x < 8; x++) { mazeWalls.push({x,y:3}); mazeWalls.push({x,y:8}); }
        for (let y = 4; y < 8; y++) { mazeWalls.push({x:4,y}); mazeWalls.push({x:7,y}); }
        for (let x = 12; x < 16; x++) { mazeWalls.push({x,y:11}); mazeWalls.push({x,y:16}); }
        for (let y = 12; y < 16; y++) { mazeWalls.push({x:12,y}); mazeWalls.push({x:15,y}); }
      },
      // Spiral-ish
      () => {
        for (let i = 2; i < GRID - 2; i++) mazeWalls.push({x:i,y:2});
        for (let i = 3; i < GRID - 2; i++) mazeWalls.push({x:GRID-3,y:i});
        for (let i = GRID-4; i > 3; i--) mazeWalls.push({x:i,y:GRID-3});
        for (let i = GRID-4; i > 4; i--) mazeWalls.push({x:3,y:i});
      }
    ];
    patterns[level % patterns.length]();

    // Ensure snake start area is clear
    mazeWalls = mazeWalls.filter(w => !(w.x >= 1 && w.x <= 3 && w.y >= Math.floor(GRID/2)-1 && w.y <= Math.floor(GRID/2)+1));
  }

  // ── Game Init ──
  function startGame() {
    hasContinued = false;
    snake = [];
    const startY = Math.floor(GRID / 2);
    for (let i = 0; i < 3; i++) snake.push({ x: 3 - i, y: startY });
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    foodEaten = 0;
    combo = 0;
    maxCombo = 0;
    comboTimer = 0;
    obstacles = [];
    mazeWalls = [];
    activePowerup = null;
    if (powerupTimeout) clearTimeout(powerupTimeout);
    if (speedRevertTimeout) clearTimeout(speedRevertTimeout);
    const mode = MODES[currentMode];
    baseSpeed = mode.speedUp ? 130 : 120;
    currentSpeed = baseSpeed;

    if (mode.timed) {
      timeLeft = mode.time;
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        if (!gameActive) return;
        timeLeft--;
        $('hud-timer').textContent = `⏱ ${timeLeft}s`;
        if (timeLeft <= 0) { endGame(); }
      }, 1000);
      $('hud-timer').style.display = 'inline';
    } else {
      $('hud-timer').style.display = 'none';
    }

    if (mode.mazeMode) generateMazeWalls();

    spawnFood();
    gameActive = true;
    $('hud-mode').textContent = mode.name.toUpperCase();
    updateHUD();
    showScreen($('game-screen'));

    if (gameLoopTimer) clearInterval(gameLoopTimer);
    gameLoopTimer = setInterval(gameTick, currentSpeed);
  }

  function spawnFood() {
    const allWalls = new Set([...obstacles, ...mazeWalls].map(w => w.x + ',' + w.y));
    const snakeSet = new Set(snake.map(s => s.x + ',' + s.y));
    let attempts = 0;
    do {
      food = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
      attempts++;
    } while ((allWalls.has(food.x + ',' + food.y) || snakeSet.has(food.x + ',' + food.y)) && attempts < 200);
  }

  function spawnPowerup() {
    if (powerup) return;
    const snakeSet = new Set(snake.map(s => s.x + ',' + s.y));
    let attempts = 0;
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
      attempts++;
    } while (snakeSet.has(pos.x + ',' + pos.y) && attempts < 100);
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    powerup = { ...pos, ...type, timer: 15000 };
  }

  // ── Game Tick ──
  function gameTick() {
    if (!gameActive) return;

    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wrapped first
    head.x = ((head.x % GRID) + GRID) % GRID;
    head.y = ((head.y % GRID) + GRID) % GRID;

    // Wall/obstacle collision check AFTER wrapping
    const hitObstacle = obstacles.some(w => w.x === head.x && w.y === head.y);
    const hitMazeWall = mazeWalls.some(w => w.x === head.x && w.y === head.y);

    // Survival: obstacle collision kills
    if (hitObstacle) {
      if (activePowerup && activePowerup.effect === 'shield') {
        activePowerup = null;
        $('powerup-display').style.display = 'none';
      } else {
        endGame(); return;
      }
    }

    // Maze mode: wall collision
    if (MODES[currentMode].mazeMode && hitMazeWall) {
      if (activePowerup && activePowerup.effect === 'shield') {
        activePowerup = null;
        $('powerup-display').style.display = 'none';
      } else {
        endGame(); return;
      }
    }

    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      if (activePowerup && activePowerup.effect === 'shield') {
        activePowerup = null;
        $('powerup-display').style.display = 'none';
      } else {
        endGame(); return;
      }
    }

    snake.unshift(head);

    // Magnet effect
    if (activePowerup && activePowerup.effect === 'magnet' && food) {
      const dx = head.x - food.x, dy = head.y - food.y;
      if (Math.abs(dx) + Math.abs(dy) <= 3) {
        food.x = head.x;
        food.y = head.y;
      }
    }

    let ate = false;
    if (food && head.x === food.x && head.y === food.y) {
      ate = true;
      foodEaten++;
      combo++;
      comboTimer = 60;
      if (combo > maxCombo) maxCombo = combo;
      const comboMult = Math.min(combo, 10);
      const scoreMult = (activePowerup && activePowerup.effect === 'double') ? 2 : 1;
      const pts = 10 * comboMult * scoreMult;
      score += pts;
      rewards.coins += 1;
      if (combo > 1) sfxCombo();
      sfxEat();
      spawnFood();
      if (foodEaten % 5 === 0) spawnPowerup();

      // Survival: add obstacles
      if (MODES[currentMode].obstacles && foodEaten % 3 === 0) {
        let attempts = 0;
        let pos;
        const snakeSet = new Set(snake.map(s => s.x + ',' + s.y));
        do {
          pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
          attempts++;
        } while (snakeSet.has(pos.x + ',' + pos.y) && attempts < 50);
        if (attempts < 50) obstacles.push(pos);
      }

      // Speed mode: speed up
      if (MODES[currentMode].speedUp && foodEaten % 3 === 0) {
        currentSpeed = Math.max(50, currentSpeed - 5);
        clearInterval(gameLoopTimer);
        gameLoopTimer = setInterval(gameTick, currentSpeed);
      }

      // Level up every 10 food
      if (foodEaten % 10 === 0) {
        level = Math.min(15, Math.floor(foodEaten / 10) + 1);
      }
    } else {
      snake.pop();
    }

    // Combo decay
    if (!ate) {
      if (comboTimer > 0) comboTimer--;
      else combo = 0;
    }

    // Powerup pickup
    if (powerup && head.x === powerup.x && head.y === powerup.y) {
      activePowerup = powerup;
      sfxPowerup();
      rewards.coins += 5;
      powerup = null;
      $('powerup-display').textContent = `${activePowerup.icon} ${activePowerup.name} ACTIVE`;
      $('powerup-display').style.display = 'block';
      $('powerup-display').style.color = activePowerup.color;

      if (powerupTimeout) clearTimeout(powerupTimeout);
      powerupTimeout = setTimeout(() => {
        activePowerup = null;
        $('powerup-display').style.display = 'none';
        powerupTimeout = null;
      }, activePowerup.duration);

      if (activePowerup.effect === 'speed') {
        clearInterval(gameLoopTimer);
        gameLoopTimer = setInterval(gameTick, Math.max(40, currentSpeed - 40));
        if (speedRevertTimeout) clearTimeout(speedRevertTimeout);
        speedRevertTimeout = setTimeout(() => {
          clearInterval(gameLoopTimer);
          gameLoopTimer = setInterval(gameTick, currentSpeed);
          speedRevertTimeout = null;
        }, activePowerup.duration);
      } else if (activePowerup.effect === 'slow') {
        clearInterval(gameLoopTimer);
        gameLoopTimer = setInterval(gameTick, currentSpeed + 60);
        if (speedRevertTimeout) clearTimeout(speedRevertTimeout);
        speedRevertTimeout = setTimeout(() => {
          clearInterval(gameLoopTimer);
          gameLoopTimer = setInterval(gameTick, currentSpeed);
          speedRevertTimeout = null;
        }, activePowerup.duration);
      }
    }

    // Powerup timeout on field
    if (powerup) {
      powerup.timer -= currentSpeed;
      if (powerup.timer <= 0) powerup = null;
    }

    saveRewards(rewards);
    updateHUD();
    render();
  }

  // ── Rendering ──
  function render() {
    ctx.fillStyle = '#0a0a15';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#151525';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
    }

    // Maze walls
    ctx.fillStyle = '#334';
    mazeWalls.forEach(w => {
      ctx.fillRect(w.x * CELL, w.y * CELL, CELL, CELL);
    });

    // Obstacles
    ctx.fillStyle = '#662222';
    obstacles.forEach(o => {
      ctx.fillRect(o.x * CELL + 1, o.y * CELL + 1, CELL - 2, CELL - 2);
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x * CELL + 1, o.y * CELL + 1, CELL - 2, CELL - 2);
    });

    // Food
    if (food) {
      const pulse = 0.8 + Math.sin(Date.now() / 200) * 0.2;
      ctx.fillStyle = '#ff3366';
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = 10 * pulse;
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL/2, food.y * CELL + CELL/2, CELL/2 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Powerup
    if (powerup) {
      ctx.font = `${CELL - 2}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(powerup.icon, powerup.x * CELL + CELL/2, powerup.y * CELL + CELL/2);
    }

    // Snake
    const skin = SKINS[activeSkin];
    snake.forEach((s, i) => {
      const isHead = i === 0;
      let color;
      if (skin.color === 'rainbow') {
        color = `hsl(${(i * 15 + Date.now() / 10) % 360}, 80%, 55%)`;
      } else {
        const brightness = isHead ? 1 : Math.max(0.3, 1 - (i / snake.length) * 0.7);
        color = skin.color;
        ctx.globalAlpha = brightness;
      }

      ctx.fillStyle = color;
      if (isHead) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
      }
      const pad = isHead ? 0 : 1;
      ctx.fillRect(s.x * CELL + pad, s.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Eyes
      if (isHead) {
        ctx.fillStyle = '#000';
        const ex = s.x * CELL + CELL/2 + dir.x * 4;
        const ey = s.y * CELL + CELL/2 + dir.y * 4;
        ctx.beginPath();
        ctx.arc(ex - 3, ey - 3, 2, 0, Math.PI * 2);
        ctx.arc(ex + 3, ey - 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Shield visual
    if (activePowerup && activePowerup.effect === 'shield') {
      ctx.strokeStyle = 'rgba(68,255,170,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(snake[0].x * CELL + CELL/2, snake[0].y * CELL + CELL/2, CELL, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function updateHUD() {
    $('hud-score').textContent = `Score: ${score}`;
    $('hud-level').textContent = `Lv${level}`;
    if (combo > 1) {
      $('hud-combo').style.display = 'inline';
      $('hud-combo').textContent = `Combo: x${combo}`;
    } else {
      $('hud-combo').style.display = 'none';
    }
    $('gems-display').textContent = rewards.gems;
    $('coins-display').textContent = rewards.coins;
  }

  // ── End Game ──
  function endGame() {
    gameActive = false;
    clearInterval(gameLoopTimer);
    if (timerInterval) clearInterval(timerInterval);
    if (powerupTimeout) clearTimeout(powerupTimeout);
    if (speedRevertTimeout) clearTimeout(speedRevertTimeout);
    sfxDie();

    const modeName = MODES[currentMode].name;
    let earnedCoins = foodEaten;
    let isNewHS = false;
    if (!highScores[modeName] || score > highScores[modeName]) {
      highScores[modeName] = score;
      isNewHS = true;
      earnedCoins += 20;
      saveData();
    }
    rewards.coins += earnedCoins;
    saveRewards(rewards);

    $('go-score').textContent = score;
    $('go-food').textContent = foodEaten;
    $('go-combo').textContent = `x${maxCombo}`;
    $('go-reward').textContent = `+${earnedCoins} coins`;
    $('go-highscore').style.display = isNewHS ? 'block' : 'none';
    $('btn-continue').style.display = hasContinued ? 'none' : 'inline-block';
    showScreen($('gameover-screen'));
  }

  // ── Input ──
  document.addEventListener('keydown', e => {
    if (!gameActive) return;
    const key = e.key;
    if ((key === 'ArrowUp' || key === 'w' || key === 'W') && dir.y !== 1) { nextDir = {x:0,y:-1}; e.preventDefault(); }
    else if ((key === 'ArrowDown' || key === 's' || key === 'S') && dir.y !== -1) { nextDir = {x:0,y:1}; e.preventDefault(); }
    else if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && dir.x !== 1) { nextDir = {x:-1,y:0}; e.preventDefault(); }
    else if ((key === 'ArrowRight' || key === 'd' || key === 'D') && dir.x !== -1) { nextDir = {x:1,y:0}; e.preventDefault(); }
  });

  // Swipe support
  let touchStart = null;
  canvas.addEventListener('touchstart', e => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    e.preventDefault();
  });
  canvas.addEventListener('touchmove', e => e.preventDefault());
  canvas.addEventListener('touchend', e => {
    if (!touchStart || !gameActive) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && dir.x !== -1) nextDir = {x:1,y:0};
      else if (dx < -20 && dir.x !== 1) nextDir = {x:-1,y:0};
    } else {
      if (dy > 20 && dir.y !== -1) nextDir = {x:0,y:1};
      else if (dy < -20 && dir.y !== 1) nextDir = {x:0,y:-1};
    }
    touchStart = null;
  });

  // ── Ad ──
  function showAd(callback) {
    showScreen($('ad-screen'));
    let t = 5;
    $('ad-timer').textContent = t;
    $('ad-fill').style.width = '0%';
    const iv = setInterval(() => {
      t--;
      $('ad-timer').textContent = t;
      $('ad-fill').style.width = ((5-t)/5*100) + '%';
      if (t <= 0) { clearInterval(iv); callback(); }
    }, 1000);
  }

  // ── Navigation ──
  function showScreen(screen) {
    ['menu-screen','how-screen','mode-screen','skins-screen','game-screen','gameover-screen','ad-screen'].forEach(id => {
      $(id).style.display = 'none';
    });
    screen.style.display = 'block';
  }

  $('btn-play').addEventListener('click', () => { initAudio(); renderModeList(); showScreen($('mode-screen')); });
  $('btn-how').addEventListener('click', () => showScreen($('how-screen')));
  $('btn-back').addEventListener('click', () => showScreen($('menu-screen')));
  $('btn-skins').addEventListener('click', () => { renderSkins(); showScreen($('skins-screen')); });
  $('btn-back-mode').addEventListener('click', () => showScreen($('menu-screen')));
  $('btn-back-skins').addEventListener('click', () => showScreen($('menu-screen')));

  $('btn-retry').addEventListener('click', () => { startGame(); });
  $('btn-menu-go').addEventListener('click', () => {
    gameActive = false;
    clearInterval(gameLoopTimer);
    rewards = loadRewards();
    $('gems-display').textContent = rewards.gems;
    $('coins-display').textContent = rewards.coins;
    showScreen($('menu-screen'));
  });

  $('btn-continue').addEventListener('click', () => {
    if (hasContinued) return;
    hasContinued = true;
    showAd(() => {
      // Continue: reset snake position, keep score
      const mode = MODES[currentMode];
      if (mode.timed) timeLeft += 15;
      snake = [];
      const startY = Math.floor(GRID / 2);
      for (let i = 0; i < 3; i++) snake.push({ x: 3 - i, y: startY });
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      combo = 0;
      activePowerup = null;
      $('powerup-display').style.display = 'none';
      gameActive = true;
      showScreen($('game-screen'));
      gameLoopTimer = setInterval(gameTick, currentSpeed);
    });
  });

  // Init
  $('gems-display').textContent = rewards.gems;
  $('coins-display').textContent = rewards.coins;
})();
