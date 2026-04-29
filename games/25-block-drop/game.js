// ═══════════════════════════════════════════════════
// NGN4 Game 25: BLOCK DROP — Tetris
// ═══════════════════════════════════════════════════

(function() {
  'use strict';

  // ── NGN4 Universal Systems Init ──
  try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
  try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('25-block-drop'); } catch(e) {}

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  function initAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
  function playTone(f, d, t='square', v=0.05) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
  }
  function sfxMove() { playTone(300, 0.04, 'triangle', 0.03); }
  function sfxRotate() { playTone(500, 0.06, 'triangle', 0.04); }
  function sfxDrop() { playTone(150, 0.1, 'triangle', 0.06); }
  function sfxClear(n) {
    const freqs = n >= 4 ? [523,659,784,1047] : n >= 2 ? [440,660] : [440];
    freqs.forEach((f,i) => setTimeout(() => playTone(f, 0.2, 'sine', 0.08), i * 60));
  }
  function sfxTetris() { [523,659,784,1047,1319].forEach((f,i) => setTimeout(() => playTone(f, 0.2, 'sine', 0.1), i * 50)); }
  function sfxGameOver() { playTone(200, 0.5, 'sawtooth', 0.07); }
  function sfxHold() { playTone(600, 0.08, 'sine', 0.04); }

  function loadRewards() {
    try { const d = JSON.parse(localStorage.getItem('ngn4_rewards')||'{}'); return {coins:d.coins||0,gems:d.gems||0}; } catch(e) { return {coins:0,gems:0}; }
  }
  function saveRewards(r) { try { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); } catch(e){} }
  let rewards = loadRewards();

  const $ = id => document.getElementById(id);
  const canvas = $('game-canvas');
  const ctx = canvas.getContext('2d');
  const holdCanvas = $('hold-canvas');
  const holdCtx = holdCanvas.getContext('2d');
  const nextCanvas = $('next-canvas');
  const nextCtx = nextCanvas.getContext('2d');

  // ── Tetromino Definitions ──
  const COLS = 10, ROWS = 20, CELL = 30;
  const PIECE_COLORS = {
    I: '#00f0f0', O: '#f0f000', T: '#a000f0',
    S: '#00f000', Z: '#f00000', L: '#f0a000', J: '#0000f0'
  };

  // Shapes as 2D arrays (rotations)
  const SHAPES = {
    I: [
      [[0,0],[1,0],[2,0],[3,0]],
      [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0]],
      [[0,0],[0,1],[0,2],[0,3]]
    ],
    O: [
      [[0,0],[1,0],[0,1],[1,1]],
      [[0,0],[1,0],[0,1],[1,1]],
      [[0,0],[1,0],[0,1],[1,1]],
      [[0,0],[1,0],[0,1],[1,1]]
    ],
    T: [
      [[0,0],[1,0],[2,0],[1,1]],
      [[0,0],[0,1],[0,2],[1,1]],
      [[1,0],[0,1],[1,1],[2,1]],
      [[1,0],[1,1],[1,2],[0,1]]
    ],
    S: [
      [[1,0],[2,0],[0,1],[1,1]],
      [[0,0],[0,1],[1,1],[1,2]],
      [[1,0],[2,0],[0,1],[1,1]],
      [[0,0],[0,1],[1,1],[1,2]]
    ],
    Z: [
      [[0,0],[1,0],[1,1],[2,1]],
      [[1,0],[0,1],[1,1],[0,2]],
      [[0,0],[1,0],[1,1],[2,1]],
      [[1,0],[0,1],[1,1],[0,2]]
    ],
    L: [
      [[0,0],[0,1],[1,1],[2,1]],
      [[0,0],[1,0],[0,1],[0,2]],
      [[0,0],[1,0],[2,0],[2,1]],
      [[1,0],[1,1],[0,2],[1,2]]
    ],
    J: [
      [[2,0],[0,1],[1,1],[2,1]],
      [[0,0],[0,1],[0,2],[1,2]],
      [[0,0],[1,0],[2,0],[0,1]],
      [[0,0],[1,0],[1,1],[1,2]]
    ]
  };

  const PIECE_NAMES = Object.keys(SHAPES);

  // ── SRS Wall Kick Data ──
  const WALL_KICKS = {
    normal: [
      [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
      [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
      [[0,0],[1,0],[1,-1],[0,2],[1,2]],
      [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]]
    ],
    I: [
      [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
      [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
      [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
      [[0,0],[-2,0],[1,0],[-2,1],[1,-2]]
    ]
  };

  // ── Game State ──
  let board = [];
  let currentPiece = null;
  let holdPiece = null;
  let canHold = true;
  let bag = [];
  let nextPieces = [];
  let score = 0;
  let level = 1;
  let linesCleared = 0;
  let totalLines = 0;
  let combo = -1;
  let maxCombo = 0;
  let tetrises = 0;
  let gameMode = 'marathon';
  let gameActive = false;
  let paused = false;
  let dropTimer = 0;
  let lockTimer = 0;
  let lockDelay = 500;
  let lastTime = 0;
  let animFrame = null;
  let sprintTimer = 0;
  let hasContinued = false;
  let flashLines = [];
  let flashTimer = 0;
  let lastLineClearWasTspin = false;

  function getDropInterval() {
    // NES-style speed curve
    const speeds = [800,717,633,550,467,383,300,217,133,100,83,67,50,33,17];
    return speeds[Math.min(level - 1, speeds.length - 1)];
  }

  function initBoard() {
    board = [];
    for (let y = 0; y < ROWS; y++) {
      board[y] = [];
      for (let x = 0; x < COLS; x++) board[y][x] = null;
    }
  }

  // ── 7-Bag Randomizer ──
  function getNextPiece() {
    if (bag.length === 0) {
      bag = [...PIECE_NAMES];
      // Fisher-Yates shuffle
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop();
  }

  function fillNextPieces() {
    while (nextPieces.length < 3) {
      nextPieces.push(getNextPiece());
    }
  }

  function spawnPiece(type) {
    if (!type) type = nextPieces.shift();
    fillNextPieces();
    const piece = {
      type,
      rotation: 0,
      x: Math.floor(COLS / 2) - 1,
      y: type === 'I' ? -1 : 0,
      cells: () => SHAPES[type][currentPiece ? currentPiece.rotation : 0]
    };
    currentPiece = piece;
    canHold = true;
    lockTimer = 0;
    if (checkCollision(piece.x, piece.y, piece.rotation)) {
      // Game over
      gameOver();
    }
  }

  function getCells(type, rot) {
    return SHAPES[type][rot];
  }

  function checkCollision(px, py, rot) {
    const cells = getCells(currentPiece.type, rot);
    for (const [cx, cy] of cells) {
      const nx = px + cx, ny = py + cy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
    return false;
  }

  function rotatePiece(dir) {
    if (!currentPiece || currentPiece.type === 'O') return;
    const oldRot = currentPiece.rotation;
    const newRot = ((oldRot + dir) % 4 + 4) % 4;
    const kickData = currentPiece.type === 'I' ? WALL_KICKS.I[oldRot] : WALL_KICKS.normal[oldRot];

    for (const [kx, ky] of kickData) {
      if (!checkCollision(currentPiece.x + kx, currentPiece.y + ky, newRot)) {
        currentPiece.x += kx;
        currentPiece.y += ky;
        currentPiece.rotation = newRot;
        sfxRotate();
        lockTimer = 0; // Reset lock delay on successful rotation
        return;
      }
    }
  }

  function movePiece(dx, dy) {
    if (!currentPiece) return false;
    if (!checkCollision(currentPiece.x + dx, currentPiece.y + dy, currentPiece.rotation)) {
      currentPiece.x += dx;
      currentPiece.y += dy;
      if (dx !== 0) { sfxMove(); lockTimer = 0; }
      return true;
    }
    return false;
  }

  function hardDrop() {
    if (!currentPiece) return;
    let dropped = 0;
    while (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.rotation)) {
      currentPiece.y++;
      dropped++;
    }
    score += dropped * 2;
    sfxDrop();
    lockPiece();
  }

  function getGhostY() {
    if (!currentPiece) return 0;
    let gy = currentPiece.y;
    while (!checkCollision(currentPiece.x, gy + 1, currentPiece.rotation)) {
      gy++;
    }
    return gy;
  }

  function isTSpin() {
    if (!currentPiece || currentPiece.type !== 'T') return false;
    const cx = currentPiece.x + 1, cy = currentPiece.y + 1;
    let filled = 0;
    const corners = [[-1,-1],[1,-1],[-1,1],[1,1]];
    for (const [dx, dy] of corners) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || board[ny][nx]) filled++;
    }
    return filled >= 3;
  }

  function lockPiece() {
    if (!currentPiece) return;
    const cells = getCells(currentPiece.type, currentPiece.rotation);
    const tspin = isTSpin();
    lastLineClearWasTspin = tspin;

    for (const [cx, cy] of cells) {
      const nx = currentPiece.x + cx, ny = currentPiece.y + cy;
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
        board[ny][nx] = currentPiece.type;
      }
    }

    // Check line clears
    const clearedRows = [];
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every(c => c !== null)) {
        clearedRows.push(y);
      }
    }

    if (clearedRows.length > 0) {
      flashLines = clearedRows;
      flashTimer = 10;

      // Remove lines
      clearedRows.sort((a, b) => a - b);
      for (const row of clearedRows) {
        board.splice(row, 1);
        board.unshift(new Array(COLS).fill(null));
      }

      const n = clearedRows.length;
      combo++;
      if (combo > maxCombo) maxCombo = combo;

      // Scoring
      let lineScore = [0, 100, 300, 500, 800][n] * level;
      let tspinBonus = 0;
      if (tspin) {
        tspinBonus = [0, 400, 800, 1200, 1600][n] * level;
        if (n === 0) tspinBonus = 100 * level; // T-spin mini
      }
      const comboBonus = combo > 0 ? 50 * combo * level : 0;
      score += lineScore + tspinBonus + comboBonus;

      totalLines += n;
      linesCleared += n;
      if (n === 4) { tetrises++; sfxTetris(); }
      else sfxClear(n);

      // Rewards
      const coinReward = [0, 1, 3, 5, 10][n];
      rewards.coins += coinReward;
      if (n === 4) rewards.coins += 5; // Tetris bonus
      saveRewards(rewards);

      // Level up (every 10 lines in marathon, every 5 in sprint)
      const linesPerLevel = gameMode === 'sprint' ? 5 : 10;
      const newLevel = Math.floor(totalLines / linesPerLevel) + 1;
      if (newLevel > level) level = Math.min(newLevel, 15);

      // Check mode completion
      if (gameMode === 'marathon' && totalLines >= 150) {
        endGame(true);
        return;
      }
      if (gameMode === 'sprint' && totalLines >= 40) {
        endGame(true);
        return;
      }
    } else {
      combo = -1;
    }

    // Next piece
    spawnPiece();
  }

  function holdCurrentPiece() {
    if (!currentPiece || !canHold) return;
    canHold = false;
    sfxHold();
    const type = currentPiece.type;
    if (holdPiece) {
      const held = holdPiece;
      holdPiece = type;
      spawnPiece(held);
    } else {
      holdPiece = type;
      spawnPiece();
    }
    drawHold();
  }

  // ── Rendering ──
  function drawBoard() {
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = '#151525';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL); ctx.stroke();
    }

    // Placed blocks
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (board[y][x]) {
          drawBlock(ctx, x, y, PIECE_COLORS[board[y][x]], false);
        }
      }
    }

    // Flash lines
    if (flashTimer > 0) {
      flashTimer--;
      ctx.fillStyle = `rgba(255,255,255,${flashTimer / 10 * 0.5})`;
      flashLines.forEach(y => {
        ctx.fillRect(0, y * CELL, COLS * CELL, CELL);
      });
    }

    if (!currentPiece) return;

    // Ghost piece
    const ghostY = getGhostY();
    if (ghostY !== currentPiece.y) {
      const cells = getCells(currentPiece.type, currentPiece.rotation);
      ctx.globalAlpha = 0.2;
      for (const [cx, cy] of cells) {
        drawBlock(ctx, currentPiece.x + cx, ghostY + cy, PIECE_COLORS[currentPiece.type], false);
      }
      ctx.globalAlpha = 1;
    }

    // Current piece
    const cells = getCells(currentPiece.type, currentPiece.rotation);
    for (const [cx, cy] of cells) {
      if (currentPiece.y + cy >= 0) {
        drawBlock(ctx, currentPiece.x + cx, currentPiece.y + cy, PIECE_COLORS[currentPiece.type], true);
      }
    }
  }

  function drawBlock(context, x, y, color, glow) {
    const px = x * CELL, py = y * CELL;
    context.fillStyle = color;
    if (glow) {
      context.shadowColor = color;
      context.shadowBlur = 6;
    }
    context.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    // Highlight
    context.fillStyle = 'rgba(255,255,255,0.15)';
    context.fillRect(px + 1, py + 1, CELL - 2, 3);
    context.fillRect(px + 1, py + 1, 3, CELL - 2);
    // Shadow
    context.fillStyle = 'rgba(0,0,0,0.2)';
    context.fillRect(px + CELL - 4, py + 1, 3, CELL - 2);
    context.fillRect(px + 1, py + CELL - 4, CELL - 2, 3);
    context.shadowBlur = 0;
  }

  function drawPreview(context, type, canvasW, canvasH, offsetY = 0) {
    if (!type) return;
    const cells = getCells(type, 0);
    // Center the preview
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [cx, cy] of cells) {
      minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
    }
    const pw = (maxX - minX + 1), ph = (maxY - minY + 1);
    const previewCell = 20;
    const ox = (canvasW - pw * previewCell) / 2 - minX * previewCell;
    const oy = offsetY + (80 - ph * previewCell) / 2 - minY * previewCell;

    context.clearRect(0, 0, canvasW, canvasH);
    for (const [cx, cy] of cells) {
      const px = ox + cx * previewCell, py = oy + cy * previewCell;
      context.fillStyle = PIECE_COLORS[type];
      context.fillRect(px + 1, py + 1, previewCell - 2, previewCell - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px + 1, py + 1, previewCell - 2, 2);
    }
  }

  function drawHold() {
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (holdPiece) {
      drawPreview(holdCtx, holdPiece, holdCanvas.width, holdCanvas.height);
      if (!canHold) {
        holdCtx.fillStyle = 'rgba(0,0,0,0.5)';
        holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
      }
    }
  }

  function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextPieces.forEach((type, i) => {
      drawPreview(nextCtx, type, nextCanvas.width, 80, i * 85);
    });
  }

  function updateHUD() {
    $('hud-score').textContent = `SCORE: ${score}`;
    const linesDisplay = gameMode === 'marathon' ? `Lines: ${totalLines}/150` :
                          gameMode === 'sprint' ? `Lines: ${totalLines}/40` :
                          `Lines: ${totalLines}`;
    $('stat-mode').textContent = gameMode.toUpperCase();
    $('stat-level').textContent = `Level: ${level}`;
    $('stat-lines').textContent = linesDisplay;
    $('stat-combo').textContent = combo > 0 ? `Combo: ${combo}` : 'Combo: 0';
    $('stat-combo').style.color = combo > 2 ? '#ff4444' : combo > 0 ? '#ffaa00' : '#888';
    $('gems-display').textContent = rewards.gems;
    $('coins-display').textContent = rewards.coins;

    if (gameMode === 'sprint' && gameActive) {
      $('hud-time').style.display = 'inline';
      $('hud-time').textContent = `⏱ ${(sprintTimer / 1000).toFixed(1)}s`;
    } else {
      $('hud-time').style.display = 'none';
    }
  }

  // ── Game Loop ──
  function gameLoop(timestamp) {
    if (!gameActive || paused) return;
    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    if (gameMode === 'sprint') sprintTimer += dt;

    dropTimer += dt;
    const interval = getDropInterval();

    if (currentPiece) {
      // Check if piece is on ground
      if (checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.rotation)) {
        lockTimer += dt;
        if (lockTimer >= lockDelay) {
          lockPiece();
        }
      } else {
        lockTimer = 0;
      }

      if (dropTimer >= interval) {
        dropTimer = 0;
        if (!checkCollision(currentPiece.x, currentPiece.y + 1, currentPiece.rotation)) {
          currentPiece.y++;
        }
      }
    }

    drawBoard();
    drawNext();
    drawHold();
    updateHUD();
    animFrame = requestAnimationFrame(gameLoop);
  }

  // ── Start Game ──
  function startGame(mode) {
    gameMode = mode;
    initBoard();
    bag = [];
    nextPieces = [];
    holdPiece = null;
    canHold = true;
    score = 0;
    level = 1;
    linesCleared = 0;
    totalLines = 0;
    combo = -1;
    maxCombo = 0;
    tetrises = 0;
    dropTimer = 0;
    lockTimer = 0;
    lastTime = 0;
    sprintTimer = 0;
    hasContinued = false;
    flashLines = [];
    flashTimer = 0;
    fillNextPieces();
    spawnPiece();
    gameActive = true;
    paused = false;
    showScreen($('game-screen'));
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(gameLoop);
  }

  function gameOver() {
    gameActive = false;
    sfxGameOver();
    saveRewards(rewards);
    $('go-text').textContent = `Score: ${score} | Lines: ${totalLines}`;
    $('btn-continue').style.display = hasContinued ? 'none' : 'inline-block';
    showScreen($('gameover-screen'));
  }

  function endGame(complete) {
    gameActive = false;
    const coinReward = Math.floor(score / 100) + totalLines;
    rewards.coins += coinReward;
    saveRewards(rewards);
    sfxTetris();
    $('res-score').textContent = score;
    $('res-lines').textContent = totalLines;
    $('res-tetrises').textContent = tetrises;
    $('res-combo').textContent = maxCombo;
    $('res-coins').textContent = `+${coinReward} coins`;
    $('result-title').textContent = complete ? 'GAME COMPLETE!' : 'GAME OVER';
    showScreen($('result-screen'));
  }

  // ── Input ──
  document.addEventListener('keydown', e => {
    if (!gameActive) return;
    if (paused && e.key !== 'Escape') return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
        movePiece(-1, 0);
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
        movePiece(1, 0);
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
        if (movePiece(0, 1)) { score += 1; dropTimer = 0; }
        e.preventDefault();
        break;
      case 'ArrowUp':
      case 'w':
        rotatePiece(1);
        e.preventDefault();
        break;
      case 'z':
      case 'Z':
        rotatePiece(-1);
        e.preventDefault();
        break;
      case ' ':
        hardDrop();
        e.preventDefault();
        break;
      case 'c':
      case 'C':
        holdCurrentPiece();
        e.preventDefault();
        break;
      case 'Escape':
        paused = !paused;
        if (paused) {
          showScreen($('pause-screen'));
        } else {
          showScreen($('game-screen'));
          lastTime = 0;
          animFrame = requestAnimationFrame(gameLoop);
        }
        e.preventDefault();
        break;
    }
  });

  // DAS (Delayed Auto Shift) for smoother movement
  let dasKeys = {};
  let dasTimers = {};
  document.addEventListener('keydown', e => {
    if (['ArrowLeft','ArrowRight','ArrowDown'].includes(e.key)) {
      dasKeys[e.key] = true;
      if (!dasTimers[e.key]) {
        dasTimers[e.key] = setTimeout(() => {
          dasTimers[e.key] = setInterval(() => {
            if (!dasKeys[e.key] || !gameActive || paused) return;
            if (e.key === 'ArrowLeft') movePiece(-1, 0);
            else if (e.key === 'ArrowRight') movePiece(1, 0);
            else if (e.key === 'ArrowDown') { if (movePiece(0, 1)) { score += 1; dropTimer = 0; } }
          }, 50);
        }, 170);
      }
    }
  });
  document.addEventListener('keyup', e => {
    dasKeys[e.key] = false;
    if (dasTimers[e.key]) {
      clearTimeout(dasTimers[e.key]);
      clearInterval(dasTimers[e.key]);
      dasTimers[e.key] = null;
    }
  });

  // ── Screens ──
  function showScreen(screen) {
    ['menu-screen','how-screen','game-screen','result-screen','gameover-screen','pause-screen','ad-screen'].forEach(id => {
      $(id).style.display = 'none';
    });
    screen.style.display = 'block';
  }

  function showAd(cb) {
    showScreen($('ad-screen'));
    let t = 5;
    $('ad-timer').textContent = t;
    $('ad-fill').style.width = '0%';
    const iv = setInterval(() => {
      t--;
      $('ad-timer').textContent = t;
      $('ad-fill').style.width = ((5-t)/5*100)+'%';
      if (t <= 0) { clearInterval(iv); cb(); }
    }, 1000);
  }

  // ── Navigation ──
  $('btn-marathon').addEventListener('click', () => { initAudio(); startGame('marathon'); });
  $('btn-sprint').addEventListener('click', () => { initAudio(); startGame('sprint'); });
  $('btn-zen').addEventListener('click', () => { initAudio(); startGame('zen'); });
  $('btn-how').addEventListener('click', () => showScreen($('how-screen')));
  $('btn-back').addEventListener('click', () => showScreen($('menu-screen')));

  $('btn-pause').addEventListener('click', () => {
    if (!gameActive) return;
    paused = !paused;
    if (paused) showScreen($('pause-screen'));
    else { showScreen($('game-screen')); lastTime = 0; animFrame = requestAnimationFrame(gameLoop); }
  });

  $('btn-resume').addEventListener('click', () => {
    paused = false;
    showScreen($('game-screen'));
    lastTime = 0;
    animFrame = requestAnimationFrame(gameLoop);
  });

  ['btn-menu-main', 'btn-menu-pause', 'btn-menu-res', 'btn-menu-go'].forEach(id => {
    $(id).addEventListener('click', () => {
      gameActive = false;
      paused = false;
      if (animFrame) cancelAnimationFrame(animFrame);
      rewards = loadRewards();
      $('gems-display').textContent = rewards.gems;
      $('coins-display').textContent = rewards.coins;
      showScreen($('menu-screen'));
    });
  });

  $('btn-retry').addEventListener('click', () => { startGame(gameMode); });
  $('btn-play-again').addEventListener('click', () => { startGame(gameMode); });

  $('btn-continue').addEventListener('click', () => {
    if (hasContinued) return;
    hasContinued = true;
    showAd(() => {
      // Continue: add some empty rows at bottom to give breathing room
      for (let i = 0; i < 3; i++) {
        board.shift();
        board.push(new Array(COLS).fill(null));
      }
      gameActive = true;
      paused = false;
      showScreen($('game-screen'));
      lastTime = 0;
      spawnPiece();
      animFrame = requestAnimationFrame(gameLoop);
    });
  });

  updateHUD();
})();
