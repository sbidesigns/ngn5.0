// ═══════════════════════════════════════════════════
// NGN4 Game 24: NEON BREAKER — Breakout/Arkanoid
// ═══════════════════════════════════════════════════

(function() {
  'use strict';

  // ── NGN4 Universal Systems Init ──
  try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
  try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('24-neon-breaker'); } catch(e) {}

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
  function sfxHit() { playTone(440, 0.06); }
  function sfxBrick() { playTone(600, 0.08, 'triangle', 0.06); }
  function sfxPowerup() { playTone(880, 0.15, 'sine', 0.08); playTone(1100, 0.12, 'sine', 0.06); }
  function sfxLose() { playTone(200, 0.4, 'sawtooth', 0.07); }
  function sfxWin() { [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f, 0.25, 'sine', 0.08), i*80)); }
  function sfxBoss() { playTone(100, 0.3, 'sawtooth', 0.08); }

  function loadRewards() {
    try { const d = JSON.parse(localStorage.getItem('ngn4_rewards')||'{}'); return {coins:d.coins||0,gems:d.gems||0}; } catch(e) { return {coins:0,gems:0}; }
  }
  function saveRewards(r) { try { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); } catch(e){} }
  let rewards = loadRewards();

  const $ = id => document.getElementById(id);
  const canvas = $('game-canvas');
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;

  // ── Brick Types ──
  const BT = {
    NORMAL: 1, TOUGH: 2, METAL: 3, EXPLOSIVE: 4,
    INDESTRUCTIBLE: 5, POWERUP: 6, MULTI_BALL: 7, LASER: 8
  };

  const BRICK_COLORS = {
    [BT.NORMAL]: '#ff44aa',
    [BT.TOUGH]: '#ffaa00',
    [BT.METAL]: '#88aacc',
    [BT.EXPLOSIVE]: '#ff4422',
    [BT.INDESTRUCTIBLE]: '#444466',
    [BT.POWERUP]: '#44ffaa',
    [BT.MULTI_BALL]: '#4488ff',
    [BT.LASER]: '#ff44ff'
  };

  const BRICK_HP = {
    [BT.NORMAL]: 1, [BT.TOUGH]: 2, [BT.METAL]: 3,
    [BT.EXPLOSIVE]: 1, [BT.INDESTRUCTIBLE]: 999, [BT.POWERUP]: 1,
    [BT.MULTI_BALL]: 1, [BT.LASER]: 1
  };

  // ── Power-up Types ──
  const PU = {
    WIDE: { name: 'WIDE', color: '#44ffaa', icon: '↔' },
    MULTI: { name: 'MULTI', color: '#4488ff', icon: '⊕' },
    LASER: { name: 'LASER', color: '#ff44ff', icon: '↑' },
    FIRE: { name: 'FIRE', color: '#ff6622', icon: '🔥' },
    SLOW: { name: 'SLOW', color: '#4488ff', icon: '❄' },
    STICKY: { name: 'STICKY', color: '#ffaa00', icon: '●' },
    LIFE: { name: '+1 LIFE', color: '#ff4466', icon: '❤' },
    COINS: { name: 'COINS', color: '#ffcc00', icon: '🪙' },
    SHIELD: { name: 'SHIELD', color: '#88ffcc', icon: '🛡' },
    MAGNET: { name: 'MAGNET', color: '#ff88ff', icon: '🧲' }
  };
  const PU_KEYS = Object.keys(PU);

  // ── Level Generation ──
  const COLS = 14, ROWS = 8;
  const BW = CW / COLS, BH = 22;
  const OFFSET_Y = 40;

  function generateLevel(num) {
    const bricks = [];
    const isBoss = num % 10 === 0;

    if (isBoss) {
      // Boss level: indestructible bricks with a weak spot
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (r === 3 && c >= 5 && c <= 8) {
            bricks.push({ x: c, y: r, type: BT.METAL, hp: 5, maxHp: 5 });
          } else {
            bricks.push({ x: c, y: r, type: BT.INDESTRUCTIBLE, hp: 999, maxHp: 999 });
          }
        }
      }
      return bricks;
    }

    const difficulty = Math.floor(num / 3);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (Math.random() < 0.15 + difficulty * 0.02) continue;
        let type = BT.NORMAL;
        const rng = Math.random();
        if (rng < 0.05 * (difficulty + 1)) type = BT.INDESTRUCTIBLE;
        else if (rng < 0.1 + difficulty * 0.02) type = BT.METAL;
        else if (rng < 0.18 + difficulty * 0.02) type = BT.TOUGH;
        else if (rng < 0.22) type = BT.EXPLOSIVE;
        else if (rng < 0.25) type = BT.POWERUP;
        else if (rng < 0.27) type = BT.MULTI_BALL;
        else if (rng < 0.28) type = BT.LASER;

        bricks.push({ x: c, y: r, type, hp: BRICK_HP[type], maxHp: BRICK_HP[type] });
      }
    }
    return bricks;
  }

  // ── Game State ──
  let currentLevel = 1;
  const MAX_LEVEL = 30;
  let bricks = [];
  let paddle = { x: CW / 2, y: CH - 30, w: 80, h: 12 };
  let balls = [];
  let powerups = [];
  let particles = [];
  let lasers = [];
  let score = 0;
  let lives = 3;
  let combo = 0;
  let bricksBroken = 0;
  let powerupsCollected = 0;
  let gameActive = false;
  let stickyBall = false;
  let hasShield = false;
  let hasMagnet = false;
  let hasLaser = false;
  let laserTimer = 0;
  let wideTimer = 0;
  let fireBall = false;
  let fireTimer = 0;
  let animFrame = null;
  let useCustomLevel = false;
  let customBricks = null;

  function resetBall() {
    balls = [{
      x: paddle.x, y: paddle.y - 10,
      dx: 3 * (Math.random() < 0.5 ? 1 : -1),
      dy: -4,
      r: 5, stuck: true
    }];
    stickyBall = false;
  }

  function startLevel(levelNum) {
    bricks = useCustomLevel && customBricks ? customBricks : generateLevel(levelNum);
    paddle = { x: CW / 2, y: CH - 30, w: 80, h: 12 };
    powerups = [];
    particles = [];
    lasers = [];
    combo = 0;
    bricksBroken = 0;
    powerupsCollected = 0;
    hasShield = false;
    hasMagnet = false;
    hasLaser = false;
    fireBall = false;
    stickyBall = false;
    wideTimer = 0;
    laserTimer = 0;
    fireTimer = 0;
    resetBall();
    gameActive = true;
    updateHUD();
    showScreen($('game-screen'));
    if (animFrame) cancelAnimationFrame(animFrame);
    gameLoop();
  }

  function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        dx: (Math.random() - 0.5) * 6,
        dy: (Math.random() - 0.5) * 6,
        life: 30 + Math.random() * 20,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  function spawnPowerup(x, y) {
    const type = PU_KEYS[Math.floor(Math.random() * PU_KEYS.length)];
    powerups.push({ x, y, type, dy: 2, r: 10 });
  }

  function addScore(pts) {
    combo++;
    score += pts * Math.min(combo, 20);
    updateHUD();
  }

  // ── Game Loop ──
  function gameLoop() {
    if (!gameActive) return;
    update();
    render();
    animFrame = requestAnimationFrame(gameLoop);
  }

  function update() {
    // Paddle width timer
    if (wideTimer > 0) {
      wideTimer--;
      paddle.w = 120;
      if (wideTimer <= 0) paddle.w = 80;
    }
    if (fireTimer > 0) {
      fireTimer--;
      if (fireTimer <= 0) fireBall = false;
    }
    if (laserTimer > 0) {
      laserTimer--;
      if (laserTimer <= 0) hasLaser = false;
    }

    // Balls
    const deadBalls = [];
    balls.forEach((ball, bi) => {
      if (ball.stuck) {
        ball.x = paddle.x;
        ball.y = paddle.y - ball.r - paddle.h / 2;
        return;
      }

      ball.x += ball.dx;
      ball.y += ball.dy;

      // Wall collisions
      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.dx = Math.abs(ball.dx); sfxHit(); }
      if (ball.x + ball.r > CW) { ball.x = CW - ball.r; ball.dx = -Math.abs(ball.dx); sfxHit(); }
      if (ball.y - ball.r < 0) { ball.y = ball.r; ball.dy = Math.abs(ball.dy); sfxHit(); }

      // Bottom
      if (ball.y > CH + 20) {
        if (hasShield) {
          hasShield = false;
          ball.dy = -Math.abs(ball.dy);
          ball.y = CH - 10;
        } else {
          deadBalls.push(bi);
        }
        return;
      }

      // Paddle collision
      if (ball.dy > 0 &&
          ball.y + ball.r >= paddle.y - paddle.h / 2 &&
          ball.y + ball.r <= paddle.y + paddle.h / 2 + 5 &&
          ball.x >= paddle.x - paddle.w / 2 &&
          ball.x <= paddle.x + paddle.w / 2) {
        const hit = (ball.x - paddle.x) / (paddle.w / 2);
        const angle = hit * (Math.PI / 3);
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        ball.dx = speed * Math.sin(angle);
        ball.dy = -speed * Math.cos(angle);
        ball.y = paddle.y - paddle.h / 2 - ball.r;
        sfxHit();
        combo = 0;

        if (stickyBall) {
          ball.stuck = true;
        }
        if (hasMagnet) {
          ball.dx *= 0.8;
        }
      }

      // Brick collisions
      bricks.forEach((brick, bri) => {
        if (brick.hp <= 0) return;
        const bx = brick.x * BW, by = brick.y * BH + OFFSET_Y;
        if (ball.x + ball.r > bx && ball.x - ball.r < bx + BW &&
            ball.y + ball.r > by && ball.y - ball.r < by + BH) {

          if (!fireBall) {
            // Reflect
            const overlapX = Math.min(ball.x + ball.r - bx, bx + BW - (ball.x - ball.r));
            const overlapY = Math.min(ball.y + ball.r - by, by + BH - (ball.y - ball.r));
            if (overlapX < overlapY) ball.dx = -ball.dx;
            else ball.dy = -ball.dy;
          }

          if (brick.type !== BT.INDESTRUCTIBLE) {
            brick.hp--;
            sfxBrick();
            if (brick.hp <= 0) {
              bricksBroken++;
              addScore(10);
              rewards.coins += 1;
              spawnParticles(bx + BW/2, by + BH/2, BRICK_COLORS[brick.type]);

              if (brick.type === BT.EXPLOSIVE) {
                // Chain reaction
                bricks.forEach((b2, b2i) => {
                  if (b2.hp <= 0 || b2.type === BT.INDESTRUCTIBLE) return;
                  const dist = Math.abs(b2.x - brick.x) + Math.abs(b2.y - brick.y);
                  if (dist <= 2) {
                    b2.hp = 0;
                    bricksBroken++;
                    addScore(5);
                    spawnParticles(b2.x * BW + BW/2, b2.y * BH + BH/2 + OFFSET_Y, '#ff6622', 12);
                  }
                });
                sfxBoss();
              }
              if (brick.type === BT.POWERUP) spawnPowerup(bx + BW/2, by + BH/2);
              if (brick.type === BT.MULTI_BALL) {
                for (let i = 0; i < 2 && balls.length < 8; i++) {
                  balls.push({
                    x: ball.x, y: ball.y,
                    dx: ball.dx + (Math.random()-0.5)*3,
                    dy: ball.dy + (Math.random()-0.5)*2,
                    r: 5, stuck: false
                  });
                }
              }
            }
          } else {
            sfxHit();
          }
        }
      });
    });

    // Remove dead balls
    for (let i = deadBalls.length - 1; i >= 0; i--) {
      balls.splice(deadBalls[i], 1);
    }

    // All balls lost
    if (balls.length === 0) {
      lives--;
      combo = 0;
      sfxLose();
      if (lives <= 0) {
        gameActive = false;
        saveRewards(rewards);
        $('go-text').textContent = `You fell at Level ${currentLevel}. Score: ${score}`;
        showScreen($('gameover-screen'));
        return;
      }
      resetBall();
      updateHUD();
    }

    // Falling powerups
    powerups = powerups.filter(pu => {
      pu.y += pu.dy;
      if (pu.y > CH + 20) return false;
      // Paddle catch
      if (pu.y + pu.r >= paddle.y - paddle.h/2 &&
          pu.x >= paddle.x - paddle.w/2 &&
          pu.x <= paddle.x + paddle.w/2) {
        applyPowerup(pu.type);
        sfxPowerup();
        powerupsCollected++;
        rewards.coins += 5;
        saveRewards(rewards);
        updateHUD();
        return false;
      }
      return true;
    });

    // Lasers
    if (hasLaser && Math.random() < 0.08) {
      lasers.push({ x: paddle.x - 15, y: paddle.y - paddle.h/2, dy: -6 });
      lasers.push({ x: paddle.x + 15, y: paddle.y - paddle.h/2, dy: -6 });
    }
    lasers.forEach(l => {
      l.y += l.dy;
      bricks.forEach(b => {
        if (b.hp <= 0) return;
        const bx = b.x * BW, by = b.y * BH + OFFSET_Y;
        if (l.x > bx && l.x < bx + BW && l.y > by && l.y < by + BH && b.type !== BT.INDESTRUCTIBLE) {
          b.hp--;
          if (b.hp <= 0) {
            bricksBroken++;
            addScore(10);
            spawnParticles(bx + BW/2, by + BH/2, BRICK_COLORS[b.type]);
          }
          sfxHit();
        }
      });
    });
    lasers = lasers.filter(l => l.y > 0);

    // Particles
    particles = particles.filter(p => {
      p.x += p.dx; p.y += p.dy;
      p.dy += 0.1;
      p.life--;
      return p.life > 0;
    });

    // Check level complete (all destructible bricks gone)
    const remaining = bricks.filter(b => b.hp > 0 && b.type !== BT.INDESTRUCTIBLE);
    if (remaining.length === 0) {
      gameActive = false;
      sfxWin();
      const lifeBonus = lives * 10;
      const levelReward = 50;
      const total = levelReward + lifeBonus + powerupsCollected * 5;
      rewards.coins += total;
      saveRewards(rewards);
      $('res-bricks').textContent = bricksBroken;
      $('res-powerups').textContent = powerupsCollected;
      $('res-lives').textContent = lifeBonus;
      $('res-total').textContent = total;
      $('result-title').textContent = currentLevel >= MAX_LEVEL ? 'ALL LEVELS COMPLETE!' : `LEVEL ${currentLevel} CLEAR!`;
      $('btn-next').textContent = currentLevel >= MAX_LEVEL ? '🏆 FINISH' : 'NEXT LEVEL ▶';
      showScreen($('result-screen'));
    }

    // Combo display
    if (combo > 1) {
      $('hud-combo').style.display = 'inline';
      $('hud-combo').textContent = `Combo: x${combo}`;
    } else {
      $('hud-combo').style.display = 'none';
    }
  }

  function applyPowerup(type) {
    const p = PU[type];
    switch(type) {
      case 'WIDE': paddle.w = 120; wideTimer = 600; break;
      case 'MULTI':
        if (balls.length > 0) {
          const b = balls.find(b => !b.stuck) || balls[0];
          for (let i = 0; i < 2 && balls.length < 8; i++) {
            balls.push({ x: b.x, y: b.y, dx: b.dx + (Math.random()-0.5)*4, dy: b.dy + (Math.random()-0.5)*3, r: 5, stuck: false });
          }
        }
        break;
      case 'LASER': hasLaser = true; laserTimer = 600; break;
      case 'FIRE': fireBall = true; fireTimer = 500; break;
      case 'SLOW':
        balls.forEach(b => { if (!b.stuck) { b.dx *= 0.6; b.dy *= 0.6; } });
        break;
      case 'STICKY': stickyBall = true; break;
      case 'LIFE': lives = Math.min(lives + 1, 9); break;
      case 'COINS': rewards.coins += 20; saveRewards(rewards); break;
      case 'SHIELD': hasShield = true; break;
      case 'MAGNET': hasMagnet = true; break;
    }
    $('powerup-bar').innerHTML = `<span style="color:${p.color};font-size:0.8em">${p.icon} ${p.name}</span>`;
    setTimeout(() => { $('powerup-bar').innerHTML = ''; }, 2000);
  }

  // ── Rendering ──
  function render() {
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, CW, CH);

    // Bricks
    bricks.forEach(b => {
      if (b.hp <= 0) return;
      const bx = b.x * BW, by = b.y * BH + OFFSET_Y;
      const color = BRICK_COLORS[b.type];
      ctx.fillStyle = color;
      ctx.fillRect(bx + 1, by + 1, BW - 2, BH - 2);

      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.fillRect(bx + 1, by + 1, BW - 2, BH - 2);
      ctx.shadowBlur = 0;

      // HP indicator for tough/metal
      if (b.maxHp > 1 && b.type !== BT.INDESTRUCTIBLE) {
        ctx.fillStyle = '#000';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(b.hp, bx + BW/2, by + BH/2 + 4);
      }
      if (b.type === BT.INDESTRUCTIBLE) {
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 2, by + 2, BW - 4, BH - 4);
      }
    });

    // Paddle
    const pw = paddle.w, ph = paddle.h;
    const grad = ctx.createLinearGradient(paddle.x - pw/2, paddle.y, paddle.x + pw/2, paddle.y);
    grad.addColorStop(0, '#ff44aa');
    grad.addColorStop(0.5, '#ff88cc');
    grad.addColorStop(1, '#ff44aa');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ff44aa';
    ctx.shadowBlur = 10;
    ctx.fillRect(paddle.x - pw/2, paddle.y - ph/2, pw, ph);
    ctx.shadowBlur = 0;

    // Shield indicator
    if (hasShield) {
      ctx.strokeStyle = 'rgba(136,255,204,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, CH - 5);
      ctx.lineTo(CW, CH - 5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Balls
    balls.forEach(ball => {
      ctx.fillStyle = fireBall ? '#ff6622' : '#ffffff';
      ctx.shadowColor = fireBall ? '#ff4400' : '#aaaaff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Lasers
    lasers.forEach(l => {
      ctx.fillStyle = '#ff44ff';
      ctx.shadowColor = '#ff44ff';
      ctx.shadowBlur = 6;
      ctx.fillRect(l.x - 1, l.y, 3, 10);
      ctx.shadowBlur = 0;
    });

    // Powerups
    powerups.forEach(pu => {
      const p = PU[pu.type];
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000';
      ctx.font = '10px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, pu.x, pu.y);
    });

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life / 50;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }

  function updateHUD() {
    $('hud-level').textContent = `Level ${currentLevel}/${MAX_LEVEL}`;
    $('hud-score').textContent = `Score: ${score}`;
    $('hud-lives').textContent = '❤️ '.repeat(lives);
    $('gems-display').textContent = rewards.gems;
    $('coins-display').textContent = rewards.coins;
  }

  // ── Input ──
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    paddle.x = (e.clientX - rect.left) * scaleX;
    paddle.x = Math.max(paddle.w / 2, Math.min(CW - paddle.w / 2, paddle.x));
  });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    paddle.x = (e.touches[0].clientX - rect.left) * scaleX;
    paddle.x = Math.max(paddle.w / 2, Math.min(CW - paddle.w / 2, paddle.x));
  });

  canvas.addEventListener('click', () => {
    if (!gameActive) return;
    balls.forEach(b => { if (b.stuck) { b.stuck = false; b.dy = -4; b.dx = 3 * (Math.random() < 0.5 ? 1 : -1); } });
  });

  // ── Level Editor ──
  const editorCanvas = $('editor-canvas');
  const edCtx = editorCanvas.getContext('2d');
  const ECOLS = 14, EROWS = 10;
  const EBW = editorCanvas.width / ECOLS, EBH = editorCanvas.height / EROWS;
  let editorGrid = [];
  const BRICK_TYPES_LIST = [BT.NORMAL, BT.TOUGH, BT.METAL, BT.EXPLOSIVE, BT.INDESTRUCTIBLE, BT.POWERUP, BT.MULTI_BALL, BT.LASER];

  function initEditor() {
    editorGrid = [];
    for (let r = 0; r < EROWS; r++) {
      editorGrid[r] = [];
      for (let c = 0; c < ECOLS; c++) editorGrid[r][c] = 0;
    }
    renderEditor();
  }

  function renderEditor() {
    edCtx.fillStyle = '#0a0a15';
    edCtx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);
    for (let r = 0; r < EROWS; r++) {
      for (let c = 0; c < ECOLS; c++) {
        const val = editorGrid[r][c];
        if (val > 0) {
          edCtx.fillStyle = BRICK_COLORS[val] || '#ff44aa';
          edCtx.fillRect(c * EBW + 1, r * EBH + 1, EBW - 2, EBH - 2);
        }
        edCtx.strokeStyle = '#1a1a2e';
        edCtx.strokeRect(c * EBW, r * EBH, EBW, EBH);
      }
    }
  }

  editorCanvas.addEventListener('click', e => {
    const rect = editorCanvas.getBoundingClientRect();
    const sx = editorCanvas.width / rect.width;
    const sy = editorCanvas.height / rect.height;
    const c = Math.floor((e.clientX - rect.left) * sx / EBW);
    const r = Math.floor((e.clientY - rect.top) * sy / EBH);
    if (r >= 0 && r < EROWS && c >= 0 && c < ECOLS) {
      editorGrid[r][c] = editorGrid[r][c] === 0 ? 1 : 0;
      renderEditor();
    }
  });

  editorCanvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const rect = editorCanvas.getBoundingClientRect();
    const sx = editorCanvas.width / rect.width;
    const sy = editorCanvas.height / rect.height;
    const c = Math.floor((e.clientX - rect.left) * sx / EBW);
    const r = Math.floor((e.clientY - rect.top) * sy / EBH);
    if (r >= 0 && r < EROWS && c >= 0 && c < ECOLS) {
      const current = editorGrid[r][c];
      const idx = BRICK_TYPES_LIST.indexOf(current);
      editorGrid[r][c] = idx >= 0 && idx < BRICK_TYPES_LIST.length - 1
        ? BRICK_TYPES_LIST[idx + 1] : 0;
      renderEditor();
    }
  });

  $('btn-play-custom').addEventListener('click', () => {
    customBricks = [];
    for (let r = 0; r < EROWS; r++) {
      for (let c = 0; c < ECOLS; c++) {
        if (editorGrid[r][c] > 0) {
          const t = editorGrid[r][c];
          customBricks.push({ x: c, y: r, type: t, hp: BRICK_HP[t], maxHp: BRICK_HP[t] });
        }
      }
    }
    if (customBricks.length === 0) return;
    useCustomLevel = true;
    currentLevel = 1;
    score = 0;
    lives = 3;
    initAudio();
    startLevel(1);
  });

  $('btn-clear-editor').addEventListener('click', () => { initEditor(); });

  // ── Screens ──
  function showScreen(screen) {
    ['menu-screen','how-screen','game-screen','result-screen','gameover-screen','editor-screen','ad-screen'].forEach(id => {
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
  $('btn-play').addEventListener('click', () => {
    initAudio();
    currentLevel = 1;
    score = 0;
    lives = 3;
    useCustomLevel = false;
    startLevel(1);
  });

  $('btn-how').addEventListener('click', () => showScreen($('how-screen')));
  $('btn-back').addEventListener('click', () => showScreen($('menu-screen')));
  $('btn-editor').addEventListener('click', () => { initEditor(); showScreen($('editor-screen')); });
  $('btn-back-editor').addEventListener('click', () => showScreen($('menu-screen')));

  $('btn-next').addEventListener('click', () => {
    if (currentLevel >= MAX_LEVEL) {
      showScreen($('menu-screen'));
    } else {
      currentLevel++;
      useCustomLevel = false;
      if (currentLevel % 10 === 0 && currentLevel < MAX_LEVEL) {
        // Ad between level sets
        showAd(() => { startLevel(currentLevel); });
      } else {
        startLevel(currentLevel);
      }
    }
  });

  $('btn-retry').addEventListener('click', () => { lives = 3; startLevel(currentLevel); });

  $('btn-continue').addEventListener('click', () => {
    if (rewards.gems >= 5) {
      rewards.gems -= 5;
      saveRewards(rewards);
      showAd(() => {
        lives = 3;
        startLevel(currentLevel);
      });
    }
  });

  ['btn-menu-res', 'btn-menu-go'].forEach(id => {
    $(id).addEventListener('click', () => {
      gameActive = false;
      if (animFrame) cancelAnimationFrame(animFrame);
      rewards = loadRewards();
      $('gems-display').textContent = rewards.gems;
      $('coins-display').textContent = rewards.coins;
      showScreen($('menu-screen'));
    });
  });

  updateHUD();
})();
