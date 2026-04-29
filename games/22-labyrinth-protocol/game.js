// ═══════════════════════════════════════════════════
// NGN4 Game 22: LABYRINTH PROTOCOL — Maze Runner
// ═══════════════════════════════════════════════════

(function() {
  'use strict';

  // ── NGN4 Universal Systems Init ──
  try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
  try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('22-labyrinth-protocol'); } catch(e) {}

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  function initAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
  function playTone(freq, dur, type='square', vol=0.06) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
  }
  function sfxStep() { playTone(150 + Math.random()*80, 0.06, 'triangle', 0.03); }
  function sfxPickup() { playTone(880, 0.15, 'sine', 0.08); playTone(1320, 0.15, 'sine', 0.06); }
  function sfxDoor() { playTone(220, 0.3, 'sawtooth', 0.06); }
  function sfxWin() { [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f, 0.3, 'sine', 0.1), i*100)); }
  function sfxLose() { playTone(200, 0.5, 'sawtooth', 0.08); playTone(150, 0.8, 'sawtooth', 0.06); }
  function sfxTrap() { playTone(100, 0.3, 'sawtooth', 0.1); }
  function sfxAttack() { playTone(300, 0.1, 'sawtooth', 0.1); playTone(200, 0.08, 'square', 0.08); }
  function sfxKill() { playTone(400, 0.1, 'sine', 0.08); playTone(600, 0.15, 'sine', 0.06); }
  function sfxBuy() { playTone(500, 0.1, 'sine', 0.08); setTimeout(()=>playTone(700, 0.15, 'sine', 0.1), 80); }
  function sfxAchievement() { playTone(523, 0.15, 'sine', 0.1); setTimeout(()=>playTone(659, 0.15, 'sine', 0.1), 100); setTimeout(()=>playTone(784, 0.2, 'sine', 0.12), 200); }
  function sfxBoss() { playTone(100, 0.5, 'sawtooth', 0.12); playTone(80, 0.3, 'square', 0.1); }

  // ── Rewards ──
  function loadRewards() {
    try { const d = JSON.parse(localStorage.getItem('ngn4_rewards')||'{}'); return {coins:d.coins||0,gems:d.gems||0}; } catch(e) { return {coins:0,gems:0}; }
  }
  function saveRewards(r) { try { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); } catch(e){} }
  let rewards = loadRewards();

  const $ = id => document.getElementById(id);
  const canvas = $('game-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // ── Save System ──
  let saveData = JSON.parse(localStorage.getItem('ngn4_lab_save') || 'null') || {
    currentLevel: 1, maxLevel: 1, totalKills: 0, totalGems: 0, totalTime: 0,
    upgrades: { speed: 0, vision: 0, weaponDmg: 0, maxHp: 0 },
    unlocked: []
  };
  function saveSaveData() { try { localStorage.setItem('ngn4_lab_save', JSON.stringify(saveData)); } catch(e){} }

  // ── Upgrade Shop ──
  const UPGRADE_DEFS = [
    { key: 'speed', name: 'Speed Boost', desc: '+10% move speed', baseCost: 30, max: 5, icon: '🏃' },
    { key: 'vision', name: 'Vision Range', desc: '+1 reveal radius', baseCost: 40, max: 5, icon: '👁️' },
    { key: 'weaponDmg', name: 'Weapon Damage', desc: '+1 sword damage', baseCost: 50, max: 5, icon: '⚔️' },
    { key: 'maxHp', name: 'Max HP', desc: '+1 heart', baseCost: 35, max: 5, icon: '❤️' }
  ];

  function getUpgradeCost(key) {
    const def = UPGRADE_DEFS.find(u => u.key === key);
    if (!def) return 999;
    return Math.floor(def.baseCost * (1 + saveData.upgrades[key] * 0.6));
  }

  function openShop() {
    const shopItems = $('shop-items');
    if (!shopItems) return;
    shopItems.innerHTML = '';
    $('shop-coins').textContent = `🪙 ${rewards.coins}`;
    UPGRADE_DEFS.forEach(u => {
      const lvl = saveData.upgrades[u.key];
      const cost = getUpgradeCost(u.key);
      const maxed = lvl >= u.max;
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px;margin:6px 0;background:rgba(0,255,200,0.05);border:1px solid #0ff3;border-radius:6px;color:#ccc;font-family:monospace';
      div.innerHTML = `<span>${u.icon} ${u.name} (Lv.${lvl}/${u.max})</span><span style="color:#888;font-size:12px">${u.desc}</span><span style="color:#ff0">${maxed ? 'MAX' : cost + ' 🪙'}</span>`;
      if (!maxed) {
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => {
          if (rewards.coins >= cost) {
            rewards.coins -= cost;
            saveRewards(rewards);
            saveData.upgrades[u.key]++;
            saveSaveData();
            sfxBuy();
            openShop();
            updateHUD();
          }
        });
      }
      shopItems.appendChild(div);
    });
    showScreen($('shop-screen'));
  }

  // ── Achievement System ──
  function unlockAch(id, name, desc) {
    if (saveData.unlocked.includes(id)) return;
    saveData.unlocked.push(id);
    saveSaveData();
    sfxAchievement();
    const popup = $('achievement-popup');
    if (popup) {
      popup.innerHTML = `<div style="font-size:18px;color:#0f0">🏆 Achievement!</div><div style="color:#ff0;font-weight:bold">${name}</div><div style="color:#aaa;font-size:12px">${desc}</div>`;
      popup.style.display = 'block';
      popup.style.top = '60px';
      setTimeout(()=>{ popup.style.top = '-80px'; }, 3500);
      setTimeout(()=>{ popup.style.display = 'none'; }, 4000);
    }
  }

  function checkAchievements() {
    const lvl = currentLevel;
    if (!saveData.unlocked.includes('speed_runner') && lvl >= 5 && levelStartTime > 0) {
      const elapsed = (Date.now() - levelStartTime) / 1000;
      if (elapsed < 30 + lvl * 3) unlockAch('speed_runner', 'Speed Runner', 'Complete a level fast');
    }
    if (!saveData.unlocked.includes('pacifist') && saveData.totalKills === 0 && saveData.maxLevel >= 3) {
      unlockAch('pacifist', 'Pacifist', 'Reach level 3 without killing');
    }
    if (!saveData.unlocked.includes('explorer') && gemsCollected >= 50) {
      unlockAch('explorer', 'Explorer', 'Collect 50 total gems');
    }
    if (!saveData.unlocked.includes('full_clear') && saveData.maxLevel >= MAX_LEVEL) {
      unlockAch('full_clear', 'Full Clear', 'Complete all 15 levels');
    }
  }

  // ── Game State ──
  let currentLevel = 1;
  const MAX_LEVEL = 15;
  let maze = [];
  let mazeW = 0, mazeH = 0;
  let baseSpeed = 0.04;
  let player = { x: 1.5, y: 1.5, angle: 0, speed: 0.04, turnSpeed: 0.04, hp: 3, maxHp: 3, hasWeapon: false, weaponDmg: 1, attackCooldown: 0, shieldTimer: 0, speedBoostTimer: 0, invincibleTimer: 0 };
  let keys = { held: 0, total: 0 };
  let gemsCollected = 0;
  let gemsThisLevel = 0;
  let totalGemsThisRun = 0;
  let totalScore = 0;
  let totalKillsThisLevel = 0;
  let timeLeft = 60;
  let timerInterval = null;
  let gameActive = false;
  let revealed = new Set();
  let items = [];
  let enemies = [];
  let exitPos = { x: 0, y: 0 };
  let slowTimer = 0;
  let showExitHint = false;
  let stepCooldown = 0;
  let levelStartTime = 0;
  let levelType = 'normal'; // normal, boss, trap, treasure
  let bossAlive = false;

  // Gamepad
  let gamepadIndex = null;
  let gpButtons = {};
  let prevGPButtons = {};

  // ── Maze Generation ──
  function getMazeSize(level) {
    const s = 8 + level;
    return { w: Math.min(s, 25), h: Math.min(s, 25) };
  }

  function generateMaze(w, h) {
    const grid = [];
    for (let y = 0; y < h * 2 + 1; y++) {
      grid[y] = [];
      for (let x = 0; x < w * 2 + 1; x++) grid[y][x] = 1;
    }
    const visited = [];
    for (let y = 0; y < h; y++) { visited[y] = []; for (let x = 0; x < w; x++) visited[y][x] = false; }

    function carve(cx, cy) {
      visited[cy][cx] = true;
      grid[cy * 2 + 1][cx * 2 + 1] = 0;
      const dirs = [[0,-1],[0,1],[-1,0],[1,0]].sort(() => Math.random() - 0.5);
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny][nx]) {
          grid[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = 0;
          carve(nx, ny);
        }
      }
    }
    carve(0, 0);
    return grid;
  }

  function placeItems(grid, gw, gh) {
    items = [];
    const openCells = [];
    for (let y = 1; y < gh * 2; y += 2) {
      for (let x = 1; x < gw * 2; x += 2) {
        if (grid[y][x] === 0 && !(x === 1 && y === 1)) openCells.push({ x, y });
      }
    }
    openCells.sort(() => Math.random() - 0.5);

    let maxDist = 0, exitCell = openCells[openCells.length - 1];
    for (const c of openCells) {
      const d = Math.abs(c.x - 1) + Math.abs(c.y - 1);
      if (d > maxDist) { maxDist = d; exitCell = c; }
    }
    exitPos = { x: exitCell.x, y: exitCell.y };

    // Keys
    const numKeys = Math.min(1 + Math.floor(currentLevel / 3), 3);
    for (let i = 0; i < numKeys && i < openCells.length; i++) {
      const c = openCells[i];
      if (c.x !== exitPos.x || c.y !== exitPos.y)
        items.push({ type: 'key', x: c.x, y: c.y, collected: false });
    }

    // Gems
    const numGems = 3 + currentLevel;
    for (let i = numKeys; i < numKeys + numGems && i < openCells.length; i++) {
      const c = openCells[i];
      if (c.x !== exitPos.x || c.y !== exitPos.y)
        items.push({ type: 'gem', x: c.x, y: c.y, collected: false });
    }

    // Traps (teleport, slow)
    const numTraps = Math.floor(currentLevel / 2);
    for (let i = numKeys + numGems; i < numKeys + numGems + numTraps && i < openCells.length; i++) {
      items.push({ type: 'trap', x: openCells[i].x, y: openCells[i].y, subtype: Math.random() < 0.5 ? 'teleport' : 'slow', triggered: false });
    }

    // NEW: Item variety
    // Sword (combat weapon)
    if (!player.hasWeapon && currentLevel >= 2) {
      const si = numKeys + numGems + numTraps;
      if (si < openCells.length) items.push({ type: 'sword', x: openCells[si].x, y: openCells[si].y, collected: false });
    }
    // Health potion
    const hpi = numKeys + numGems + numTraps + 1;
    if (hpi < openCells.length && Math.random() < 0.5)
      items.push({ type: 'health', x: openCells[hpi].x, y: openCells[hpi].y, collected: false });
    // Speed boots
    const sbi = hpi + 1;
    if (sbi < openCells.length && Math.random() < 0.4)
      items.push({ type: 'speedboots', x: openCells[sbi].x, y: openCells[sbi].y, collected: false });
    // Shield
    const shi = sbi + 1;
    if (shi < openCells.length && Math.random() < 0.3)
      items.push({ type: 'shield', x: openCells[shi].x, y: openCells[shi].y, collected: false });
    // Map reveal
    const mri = shi + 1;
    if (mri < openCells.length && Math.random() < 0.25)
      items.push({ type: 'mapreveal', x: openCells[mri].x, y: openCells[mri].y, collected: false });
    // Teleport scroll
    const tsi = mri + 1;
    if (tsi < openCells.length && Math.random() < 0.2)
      items.push({ type: 'teleportscroll', x: openCells[tsi].x, y: openCells[tsi].y, collected: false });
  }

  function placeEnemies(grid, gw, gh) {
    enemies = [];
    const openCells = [];
    for (let y = 1; y < gh * 2; y += 2) {
      for (let x = 1; x < gw * 2; x += 2) {
        if (grid[y][x] === 0 && (Math.abs(x - 1) + Math.abs(y - 1)) > 6)
          openCells.push({ x, y });
      }
    }
    openCells.sort(() => Math.random() - 0.5);

    // Level type determination
    if (currentLevel % 5 === 0) {
      levelType = 'boss';
      sfxBoss();
    } else if (currentLevel % 4 === 0) {
      levelType = 'trap';
    } else if (currentLevel % 3 === 0) {
      levelType = 'treasure';
    } else {
      levelType = 'normal';
    }

    let numEnemies = Math.min(Math.floor(currentLevel / 2), 5);

    if (levelType === 'boss') {
      // Boss room - one big enemy at exit
      enemies.push({
        x: exitPos.x + 0.5, y: exitPos.y + 0.5,
        dx: 0.015, dy: 0.015, color: '#ff0', type: 'boss',
        hp: 3, maxHp: 3, size: 0.8
      });
      bossAlive = true;
    } else {
      // Varied enemy types
      for (let i = 0; i < numEnemies && i < openCells.length; i++) {
        const etype = Math.random() < 0.3 ? 'chaser' : (Math.random() < 0.2 ? 'teleporter' : 'patroller');
        enemies.push({
          x: openCells[i].x + 0.5,
          y: openCells[i].y + 0.5,
          dx: (Math.random() < 0.5 ? 1 : -1) * 0.015,
          dy: 0,
          color: `hsl(${Math.random()*360}, 80%, 60%)`,
          type: etype,
          hp: 1, maxHp: 1, size: 0.4,
          teleTimer: 0
        });
      }
    }

    if (levelType === 'treasure') {
      // Extra gems
      for (let i = numEnemies; i < numEnemies + 5 && i < openCells.length; i++) {
        items.push({ type: 'gem', x: openCells[i].x, y: openCells[i].y, collected: false });
      }
    }
  }

  function initLevel() {
    const { w, h } = getMazeSize(currentLevel);
    mazeW = w; mazeH = h;
    maze = generateMaze(w, h);

    // Apply upgrades
    const spdUp = saveData.upgrades.speed * 0.008;
    const visUp = saveData.upgrades.vision;
    const wpnUp = saveData.upgrades.weaponDmg;
    const hpUp = saveData.upgrades.maxHp;

    player = {
      x: 1.5, y: 1.5, angle: 0,
      speed: baseSpeed + spdUp,
      turnSpeed: 0.04,
      hp: 3 + hpUp,
      maxHp: 3 + hpUp,
      hasWeapon: player ? player.hasWeapon : false,
      weaponDmg: 1 + wpnUp,
      attackCooldown: 0,
      shieldTimer: 0,
      speedBoostTimer: 0,
      invincibleTimer: 0
    };

    keys = { held: 0, total: 0 };
    gemsCollected = 0;
    gemsThisLevel = 0;
    totalKillsThisLevel = 0;
    timeLeft = 45 + currentLevel * 3;
    revealed = new Set();
    slowTimer = 0;
    showExitHint = false;
    stepCooldown = 0;
    bossAlive = false;
    levelStartTime = Date.now();

    placeItems(maze, w, h);
    placeEnemies(maze, w, h);
    revealAround(player.x, player.y, 3 + visUp);
    gameActive = true;
    updateHUD();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!gameActive) return;
      timeLeft--;
      if (slowTimer > 0) slowTimer--;
      if (player.shieldTimer > 0) player.shieldTimer--;
      if (player.speedBoostTimer > 0) player.speedBoostTimer--;
      if (timeLeft <= 0) {
        gameActive = false;
        clearInterval(timerInterval);
        sfxLose();
        $('go-text').textContent = `You were trapped on Level ${currentLevel}.`;
        showScreen($('gameover-screen'));
      }
      updateHUD();
    }, 1000);
  }

  function revealAround(px, py, radius) {
    const gx = Math.floor(px), gy = Math.floor(py);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = gx + dx, ny = gy + dy;
        if (nx >= 0 && nx < mazeW * 2 + 1 && ny >= 0 && ny < mazeH * 2 + 1)
          revealed.add(ny * 100 + nx);
      }
    }
  }

  function updateHUD() {
    $('hud-level').textContent = `Level ${currentLevel}/${MAX_LEVEL}`;
    $('hud-keys').textContent = `🔑 ${keys.held}`;
    $('hud-gems').textContent = `💎 ${gemsCollected}`;
    $('hud-time').textContent = `⏱ ${timeLeft}s`;
    $('hud-score').textContent = `🪙 ${totalScore}`;
    $('hud-hp').textContent = `❤️ ${player.hp}/${player.maxHp}`;
    $('hud-weapon').textContent = player.hasWeapon ? `⚔️+${player.weaponDmg}` : (player.shieldTimer > 0 ? '🛡️' : '');
    $('gems-display').textContent = rewards.gems;
    $('coins-display').textContent = rewards.coins;
  }

  // ── Input ──
  const inputState = { forward: false, backward: false, left: false, right: false, attack: false };
  const kbState = { forward: false, backward: false, left: false, right: false };
  document.addEventListener('keydown', e => {
    if (['ArrowUp','w','W'].includes(e.key)) { inputState.forward = true; kbState.forward = true; }
    if (['ArrowDown','s','S'].includes(e.key)) { inputState.backward = true; kbState.backward = true; }
    if (['ArrowLeft','a','A'].includes(e.key)) { inputState.left = true; kbState.left = true; }
    if (['ArrowRight','d','D'].includes(e.key)) { inputState.right = true; kbState.right = true; }
    if (e.key === ' ' || e.key === 'e' || e.key === 'E') { inputState.attack = true; e.preventDefault(); }
    e.preventDefault();
  });
  document.addEventListener('keyup', e => {
    if (['ArrowUp','w','W'].includes(e.key)) { inputState.forward = false; kbState.forward = false; }
    if (['ArrowDown','s','S'].includes(e.key)) { inputState.backward = false; kbState.backward = false; }
    if (['ArrowLeft','a','A'].includes(e.key)) { inputState.left = false; kbState.left = false; }
    if (['ArrowRight','d','D'].includes(e.key)) { inputState.right = false; kbState.right = false; }
    if (e.key === ' ' || e.key === 'e' || e.key === 'E') inputState.attack = false;
  });

  // Mobile
  ['btn-fwd','btn-back-mov','btn-left','btn-right'].forEach(id => {
    const el = $(id);
    if (!el) return;
    const key = id === 'btn-fwd' ? 'forward' : id === 'btn-back-mov' ? 'backward' : id === 'btn-left' ? 'left' : 'right';
    el.addEventListener('touchstart', e => { e.preventDefault(); inputState[key] = true; });
    el.addEventListener('touchend', e => { e.preventDefault(); inputState[key] = false; });
    el.addEventListener('mousedown', () => inputState[key] = true);
    el.addEventListener('mouseup', () => inputState[key] = false);
  });

  // Attack button
  const attackBtn = $('btn-attack');
  if (attackBtn) {
    attackBtn.addEventListener('touchstart', e => { e.preventDefault(); inputState.attack = true; });
    attackBtn.addEventListener('touchend', e => { e.preventDefault(); inputState.attack = false; });
    attackBtn.addEventListener('mousedown', () => inputState.attack = true);
    attackBtn.addEventListener('mouseup', () => inputState.attack = false);
  }

  // Gamepad
  function setupGamepad() {
    window.addEventListener('gamepadconnected', e => { gamepadIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', e => { if (e.gamepad.index === gamepadIndex) gamepadIndex = null; });
    setInterval(() => {
      if (gamepadIndex === null) {
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < gps.length; i++) { if (gps[i]) { gamepadIndex = i; break; } }
      }
      if (gamepadIndex === null) return;
      const gp = navigator.getGamepads()[gamepadIndex];
      if (!gp) return;
      prevGPButtons = {...gpButtons};
      for (let i = 0; i < gp.buttons.length; i++) gpButtons[i] = gp.buttons[i].pressed || gp.buttons[i].value > 0.5;
    }, 16);
  }

  function gpJustPressed(b) { return gpButtons[b] && !prevGPButtons[b]; }
  function gpAxis(i) {
    if (gamepadIndex === null) return 0;
    const gp = navigator.getGamepads()[gamepadIndex];
    if (!gp || !gp.axes[i]) return 0;
    return Math.abs(gp.axes[i]) < 0.15 ? 0 : gp.axes[i];
  }

  // ── Raycasting ──
  const FOV = Math.PI / 3;
  const NUM_RAYS = 200;

  function castRay(px, py, angle) {
    const step = 0.02;
    let dist = 0;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let hitType = 1;
    while (dist < 20) {
      dist += step;
      const rx = px + dx * dist;
      const ry = py + dy * dist;
      const gx = Math.floor(rx), gy = Math.floor(ry);
      if (gx < 0 || gy < 0 || gy >= maze.length || gx >= maze[0].length) { hitType = 1; break; }
      if (maze[gy][gx] === 1) { hitType = maze[gy][gx]; break; }
    }
    return { dist, hitType };
  }

  // ── Attack/Combat ──
  function tryAttack() {
    if (player.attackCooldown > 0 || !player.hasWeapon) return;
    player.attackCooldown = 20;
    sfxAttack();

    // Attack in facing direction
    const ax = player.x + Math.cos(player.angle) * 1.5;
    const ay = player.y + Math.sin(player.angle) * 1.5;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (Math.abs(e.x - ax) < 1.0 && Math.abs(e.y - ay) < 1.0) {
        e.hp -= player.weaponDmg;
        sfxKill();
        if (e.hp <= 0) {
          // Kill enemy
          enemies.splice(i, 1);
          saveData.totalKills++;
          totalKillsThisLevel++;
          saveSaveData();
          if (e.type === 'boss') {
            bossAlive = false;
            sfxWin();
            timeLeft += 15; // Time bonus for killing boss
          }
        }
        break;
      }
    }
  }

  // ── Rendering ──
  function render() {
    const grad = ctx.createLinearGradient(0, 0, 0, H / 2);
    grad.addColorStop(0, '#050510');
    grad.addColorStop(1, '#151530');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H / 2);

    const grad2 = ctx.createLinearGradient(0, H / 2, 0, H);
    grad2.addColorStop(0, '#101020');
    grad2.addColorStop(1, '#0a0a15');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, H / 2, W, H / 2);

    for (let i = 0; i < NUM_RAYS; i++) {
      const rayAngle = player.angle - FOV / 2 + (i / NUM_RAYS) * FOV;
      const ray = castRay(player.x, player.y, rayAngle);
      const perpDist = ray.dist * Math.cos(rayAngle - player.angle);
      const wallHeight = Math.min(H * 2, (1 / Math.max(perpDist, 0.01)) * H * 0.8);
      const brightness = Math.max(0.05, 1 - perpDist / 15);

      const r = Math.floor(100 * brightness);
      const g = Math.floor(50 * brightness);
      const b = Math.floor(200 * brightness);

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      const x = (i / NUM_RAYS) * W;
      const sliceW = W / NUM_RAYS + 1;
      ctx.fillRect(x, (H - wallHeight) / 2, sliceW, wallHeight);
    }

    if (slowTimer > 0) {
      ctx.fillStyle = 'rgba(0,100,255,0.1)';
      ctx.fillRect(0, 0, W, H);
    }
    if (player.shieldTimer > 0) {
      ctx.strokeStyle = 'rgba(0,150,255,0.3)';
      ctx.lineWidth = 4;
      ctx.strokeRect(5, 5, W - 10, H - 10);
      ctx.lineWidth = 1;
    }

    // Level type indicator
    if (levelType === 'boss' && bossAlive) {
      ctx.fillStyle = '#ff0444';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ BOSS ROOM ⚠', W / 2, 25);
    } else if (levelType === 'treasure') {
      ctx.fillStyle = '#ffaa0088';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💰 TREASURE ROOM', W / 2, 25);
    } else if (levelType === 'trap') {
      ctx.fillStyle = '#ff444488';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ TRAP ROOM ⚠', W / 2, 25);
    }

    drawMinimap();
  }

  function drawMinimap() {
    const mapSize = 140;
    const mx = W - mapSize - 10;
    const my = 10;
    const cellSize = Math.max(2, Math.min(6, mapSize / (mazeW * 2 + 1)));
    const mapW = (mazeW * 2 + 1) * cellSize;
    const mapH = (mazeH * 2 + 1) * cellSize;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(mx - 2, my - 2, mapW + 4, mapH + 4);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(mx - 2, my - 2, mapW + 4, mapH + 4);

    for (let y = 0; y < mazeH * 2 + 1; y++) {
      for (let x = 0; x < mazeW * 2 + 1; x++) {
        if (!revealed.has(y * 100 + x)) continue;
        if (maze[y][x] === 1) {
          ctx.fillStyle = '#334';
          ctx.fillRect(mx + x * cellSize, my + y * cellSize, cellSize, cellSize);
        } else {
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(mx + x * cellSize, my + y * cellSize, cellSize, cellSize);
        }
      }
    }

    if (showExitHint || revealed.has(exitPos.y * 100 + exitPos.x)) {
      ctx.fillStyle = bossAlive ? '#ff0' : '#00ffcc';
      ctx.fillRect(mx + exitPos.x * cellSize, my + exitPos.y * cellSize, cellSize, cellSize);
    }

    items.forEach(item => {
      if (item.collected || item.type === 'trap') return;
      if (!revealed.has(item.y * 100 + item.x)) return;
      if (item.type === 'key') ctx.fillStyle = '#ffaa00';
      else if (item.type === 'gem') ctx.fillStyle = '#ff44ff';
      else if (item.type === 'sword') ctx.fillStyle = '#ff4444';
      else if (item.type === 'health') ctx.fillStyle = '#44ff44';
      else if (item.type === 'speedboots') ctx.fillStyle = '#44ffff';
      else if (item.type === 'shield') ctx.fillStyle = '#4488ff';
      else if (item.type === 'mapreveal') ctx.fillStyle = '#ffff44';
      else if (item.type === 'teleportscroll') ctx.fillStyle = '#aa44ff';
      else ctx.fillStyle = '#fff';
      ctx.fillRect(mx + item.x * cellSize - 1, my + item.y * cellSize - 1, cellSize + 2, cellSize + 2);
    });

    enemies.forEach(e => {
      const gx = Math.floor(e.x), gy = Math.floor(e.y);
      if (revealed.has(gy * 100 + gx)) {
        ctx.fillStyle = e.type === 'boss' ? '#ff0' : '#ff0000';
        const sz = e.type === 'boss' ? cellSize + 3 : cellSize + 1;
        ctx.fillRect(mx + e.x * cellSize - 1, my + e.y * cellSize - 1, sz, sz);
      }
    });

    ctx.fillStyle = '#00ff88';
    ctx.fillRect(mx + player.x * cellSize - 2, my + player.y * cellSize - 2, 5, 5);
    ctx.strokeStyle = '#00ff88';
    ctx.beginPath();
    ctx.moveTo(mx + player.x * cellSize, my + player.y * cellSize);
    ctx.lineTo(mx + (player.x + Math.cos(player.angle) * 2) * cellSize, my + (player.y + Math.sin(player.angle) * 2) * cellSize);
    ctx.stroke();
  }

  // ── Game Logic ──
  function update() {
    if (!gameActive) return;

    // Gamepad input
    const gpX = gpAxis(0);
    const gpY = gpAxis(1);
    if (gpX < -0.15) inputState.left = true;
    else if (!kbState.left) inputState.left = false;
    if (gpX > 0.15) inputState.right = true;
    else if (!kbState.right) inputState.right = false;
    if (gpY < -0.15) inputState.forward = true;
    else if (!kbState.forward) inputState.forward = false;
    if (gpY > 0.15) inputState.backward = true;
    else if (!kbState.backward) inputState.backward = false;
    if (gpJustPressed(0) || gpJustPressed(2)) inputState.attack = true; // A or X

    const spdUp = saveData.upgrades.speed * 0.008;
    const spd = (baseSpeed + spdUp) * (slowTimer > 0 ? 0.4 : 1) * (player.speedBoostTimer > 0 ? 1.5 : 1);
    let moved = false;

    if (inputState.left) { player.angle -= player.turnSpeed; }
    if (inputState.right) { player.angle += player.turnSpeed; }

    if (inputState.forward) {
      const nx = player.x + Math.cos(player.angle) * spd;
      const ny = player.y + Math.sin(player.angle) * spd;
      if (canMove(nx, player.y)) { player.x = nx; moved = true; }
      if (canMove(player.x, ny)) { player.y = ny; moved = true; }
    }
    if (inputState.backward) {
      const nx = player.x - Math.cos(player.angle) * spd * 0.6;
      const ny = player.y - Math.sin(player.angle) * spd * 0.6;
      if (canMove(nx, player.y)) { player.x = nx; moved = true; }
      if (canMove(player.x, ny)) { player.y = ny; moved = true; }
    }

    // Attack
    if (inputState.attack) {
      tryAttack();
      inputState.attack = false; // Consume
    }
    if (player.attackCooldown > 0) player.attackCooldown--;
    if (player.invincibleTimer > 0) player.invincibleTimer--;

    if (moved) {
      stepCooldown--;
      if (stepCooldown <= 0) { sfxStep(); stepCooldown = 5; }
      const visUp = saveData.upgrades.vision;
      revealAround(player.x, player.y, 3 + visUp);
    }

    // Item pickup
    const pgx = Math.floor(player.x), pgy = Math.floor(player.y);
    items.forEach(item => {
      if (item.collected) return;
      if (item.x === pgx && item.y === pgy) {
        if (item.type === 'key') {
          item.collected = true; keys.held++; sfxPickup();
        } else if (item.type === 'gem') {
          item.collected = true; gemsCollected++; gemsThisLevel++;
          totalGemsThisRun++;
          rewards.gems++; saveRewards(rewards); sfxPickup();
        } else if (item.type === 'sword') {
          item.collected = true; player.hasWeapon = true; sfxPickup();
        } else if (item.type === 'health') {
          item.collected = true;
          player.hp = Math.min(player.maxHp, player.hp + 1);
          sfxPickup();
        } else if (item.type === 'speedboots') {
          item.collected = true;
          player.speedBoostTimer = 20;
          sfxPickup();
        } else if (item.type === 'shield') {
          item.collected = true;
          player.shieldTimer = 30;
          sfxPickup();
        } else if (item.type === 'mapreveal') {
          item.collected = true;
          revealAll();
          sfxPickup();
        } else if (item.type === 'teleportscroll') {
          item.collected = true;
          // Teleport to exit area
          player.x = exitPos.x + 0.5;
          player.y = exitPos.y + 0.5;
          revealAround(player.x, player.y, 5);
          sfxTrap();
        } else if (item.type === 'trap' && !item.triggered) {
          item.triggered = true; sfxTrap();
          if (item.subtype === 'teleport') {
            const openCells = [];
            for (let y = 1; y < mazeH * 2; y += 2) {
              for (let x = 1; x < mazeW * 2; x += 2) {
                if (maze[y][x] === 0 && (Math.abs(x - pgx) + Math.abs(y - pgy)) > 8)
                  openCells.push({ x: x + 0.5, y: y + 0.5 });
              }
            }
            if (openCells.length > 0) {
              const dest = openCells[Math.floor(Math.random() * openCells.length)];
              player.x = dest.x; player.y = dest.y;
              revealAround(player.x, player.y, 3);
            }
          } else if (item.subtype === 'slow') {
            slowTimer = 10;
          }
        }
        updateHUD();
      }
    });

    // Check exit
    if (pgx === exitPos.x && pgy === exitPos.y) {
      if (bossAlive) {
        sfxDoor(); // Can't exit while boss alive
      } else if (keys.held >= Math.min(1 + Math.floor(currentLevel / 3), 3)) {
        gameActive = false;
        clearInterval(timerInterval);
        sfxWin();
        const timeBonus = timeLeft * 2;
        const levelReward = 50;
        const gemReward = gemsCollected * 10;
        const killReward = totalKillsThisLevel * 5;
        const total = timeBonus + levelReward + gemReward + killReward;
        totalScore += total;
        rewards.coins += total;
        saveRewards(rewards);

        if (currentLevel > saveData.maxLevel) saveData.maxLevel = currentLevel;
        saveData.totalGems += gemsThisLevel;
        saveSaveData();

        $('res-time').textContent = timeBonus;
        $('res-gems').textContent = gemReward;
        $('res-level').textContent = levelReward;
        $('res-kills').textContent = killReward;
        $('res-total').textContent = total;
        $('result-title').textContent = currentLevel >= MAX_LEVEL ? 'ALL LEVELS COMPLETE!' : `LEVEL ${currentLevel} COMPLETE!`;
        $('btn-next').textContent = currentLevel >= MAX_LEVEL ? '🏆 FINISH' : 'NEXT LEVEL ▶';

        // Show shop button between levels
        $('btn-shop-open').style.display = '';

        checkAchievements();
        showScreen($('result-screen'));
      } else {
        sfxDoor();
      }
    }

    // Enemy movement with varied AI
    enemies.forEach(e => {
      if (e.type === 'patroller') {
        const nx = e.x + e.dx, ny = e.y;
        if (canMoveEnemy(nx, ny)) { e.x = nx; }
        else { e.dx = -e.dx; }
      } else if (e.type === 'chaser') {
        // Follow player
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0.5) {
          const speed = 0.012;
          const nx = e.x + (dx / dist) * speed;
          const ny = e.y + (dy / dist) * speed;
          if (canMoveEnemy(nx, ny)) { e.x = nx; }
          if (canMoveEnemy(e.x, ny)) { e.y = ny; }
        }
      } else if (e.type === 'teleporter') {
        // Patrol but occasionally teleport near player
        e.teleTimer = (e.teleTimer || 0) + 1;
        if (e.teleTimer > 120) {
          e.teleTimer = 0;
          const openCells = [];
          for (let y = 1; y < mazeH * 2; y += 2) {
            for (let x = 1; x < mazeW * 2; x += 2) {
              const d = Math.abs(x - player.x) + Math.abs(y - player.y);
              if (maze[y][x] === 0 && d > 3 && d < 10) openCells.push({x: x + 0.5, y: y + 0.5});
            }
          }
          if (openCells.length > 0) {
            const dest = openCells[Math.floor(Math.random() * openCells.length)];
            e.x = dest.x; e.y = dest.y;
          }
        }
        // Normal patrol between teleports
        const nx = e.x + e.dx, ny = e.y;
        if (canMoveEnemy(nx, ny)) e.x = nx;
        else e.dx = -e.dx;
      } else if (e.type === 'boss') {
        // Boss slowly follows player
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 1.5) {
          const speed = 0.008;
          const nx = e.x + (dx / dist) * speed;
          const ny = e.y + (dy / dist) * speed;
          if (canMoveEnemy(nx, ny)) e.x = nx;
          if (canMoveEnemy(e.x, ny)) e.y = ny;
        }
      }

      // Check collision with player
      if (Math.abs(e.x - player.x) < 0.6 && Math.abs(e.y - player.y) < 0.6 && player.invincibleTimer <= 0) {
        if (player.hasWeapon && player.attackCooldown > 10) {
          // Player is attacking, kill enemy
          e.hp -= player.weaponDmg;
          sfxKill();
          if (e.hp <= 0) {
            const idx = enemies.indexOf(e);
            if (idx >= 0) enemies.splice(idx, 1);
            saveData.totalKills++;
            totalKillsThisLevel++;
            saveSaveData();
            if (e.type === 'boss') { bossAlive = false; sfxWin(); timeLeft += 15; }
          }
          player.attackCooldown = 0;
        } else if (player.shieldTimer > 0) {
          // Shield absorbs hit
          player.shieldTimer = 0;
          e.dx = -e.dx; e.x += e.dx * 5;
          sfxTrap();
        } else {
          timeLeft = Math.max(0, timeLeft - (e.type === 'boss' ? 10 : 5));
          player.hp--;
          player.invincibleTimer = 30; // Brief invincibility after hit
          sfxTrap();
          // Knockback enemy away from player
          const kbDist = e.type === 'boss' ? 2.0 : 1.5;
          const kbx = e.x - player.x, kby = e.y - player.y;
          const kbLen = Math.sqrt(kbx*kbx + kby*kby) || 1;
          e.x += (kbx / kbLen) * kbDist;
          e.y += (kby / kbLen) * kbDist;
          updateHUD();
          if (player.hp <= 0) {
            // Player dies - save progress, restart level
            gameActive = false;
            clearInterval(timerInterval);
            sfxLose();
            $('go-text').textContent = `You died on Level ${currentLevel}. Progress saved!`;
            showScreen($('gameover-screen'));
          }
        }
        updateHUD();
      }
    });

    render();
  }

  function revealAll() {
    for (let y = 0; y < mazeH * 2 + 1; y++)
      for (let x = 0; x < mazeW * 2 + 1; x++)
        revealed.add(y * 100 + x);
  }

  function canMove(x, y) {
    const margin = 0.2;
    return getCell(x - margin, y - margin) === 0 &&
           getCell(x + margin, y - margin) === 0 &&
           getCell(x - margin, y + margin) === 0 &&
           getCell(x + margin, y + margin) === 0;
  }

  function canMoveEnemy(x, y) { return getCell(x, y) === 0; }

  function getCell(x, y) {
    const gx = Math.floor(x), gy = Math.floor(y);
    if (gx < 0 || gy < 0 || gy >= maze.length || gx >= (maze[0] ? maze[0].length : 0)) return 1;
    return maze[gy][gx];
  }

  // ── Game Loop ──
  function gameLoop() {
    if (!gameActive) return;
    update();
    requestAnimationFrame(gameLoop);
  }

  // ── Screens ──
  function showScreen(screen) {
    ['menu-screen','how-screen','game-screen','result-screen','gameover-screen','ad-screen','win-screen','shop-screen'].forEach(id => {
      const el = $(id);
      if (el) el.style.display = 'none';
    });
    if (screen) screen.style.display = 'block';
  }

  // ── Ad System ──
  function showAd(callback) {
    showScreen($('ad-screen'));
    let t = 5;
    $('ad-timer').textContent = t;
    $('ad-fill').style.width = '0%';
    const iv = setInterval(() => {
      t--;
      $('ad-timer').textContent = t;
      $('ad-fill').style.width = ((5 - t) / 5 * 100) + '%';
      if (t <= 0) { clearInterval(iv); callback(); }
    }, 1000);
  }

  // ── Navigation ──
  $('btn-play').addEventListener('click', () => {
    initAudio();
    currentLevel = saveData.maxLevel || 1;
    totalScore = 0;
    totalGemsThisRun = 0;
    showScreen($('game-screen'));
    initLevel();
    requestAnimationFrame(gameLoop);
  });

  $('btn-how').addEventListener('click', () => showScreen($('how-screen')));
  $('btn-back').addEventListener('click', () => showScreen($('menu-screen')));

  $('btn-next').addEventListener('click', () => {
    if (currentLevel >= MAX_LEVEL) {
      $('win-coins').textContent = `Total earned: ${totalScore} coins`;
      showScreen($('win-screen'));
    } else {
      currentLevel++;
      showScreen($('game-screen'));
      initLevel();
      requestAnimationFrame(gameLoop);
      if (currentLevel % 3 === 0) {
        showAd(() => {
          showScreen($('game-screen'));
          showExitHint = true;
        });
      }
    }
  });

  $('btn-shop-open').addEventListener('click', () => {
    openShop();
  });

  $('btn-shop-close').addEventListener('click', () => {
    if (currentLevel >= MAX_LEVEL) {
      $('win-coins').textContent = `Total earned: ${totalScore} coins`;
      showScreen($('win-screen'));
    } else {
      currentLevel++;
      showScreen($('game-screen'));
      initLevel();
      requestAnimationFrame(gameLoop);
    }
  });

  $('btn-retry').addEventListener('click', () => {
    showScreen($('game-screen'));
    initLevel();
    requestAnimationFrame(gameLoop);
  });

  $('btn-skip').addEventListener('click', () => {
    if (rewards.gems >= 10) {
      rewards.gems -= 10;
      saveRewards(rewards);
      totalScore += 50;
      if (currentLevel >= MAX_LEVEL) {
        $('win-coins').textContent = `Total earned: ${totalScore} coins`;
        showScreen($('win-screen'));
      } else {
        currentLevel++;
        showScreen($('game-screen'));
        initLevel();
        requestAnimationFrame(gameLoop);
      }
    }
  });

  ['btn-menu-res', 'btn-menu-go', 'btn-menu-main', 'btn-menu-win'].forEach(id => {
    $(id).addEventListener('click', () => {
      gameActive = false;
      if (timerInterval) clearInterval(timerInterval);
      rewards = loadRewards();
      saveData = JSON.parse(localStorage.getItem('ngn4_lab_save') || 'null') || saveData;
      $('gems-display').textContent = rewards.gems;
      $('coins-display').textContent = rewards.coins;
      showScreen($('menu-screen'));
    });
  });

  setupGamepad();
  updateHUD();
})();
