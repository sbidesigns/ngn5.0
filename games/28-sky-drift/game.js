// ═══════════════════════════════════════════════
// NGN4 GAME 28: SKY DRIFT - Flappy-Style Game
// ═══════════════════════════════════════════════

(function() {
  'use strict';

  // ── NGN4 Universal Systems Init ──
  try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
  try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('28-sky-drift'); } catch(e) {}

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
  function sfxFlap() { playTone(400 + Math.random() * 200, 0.08, 'sine', 0.08); }
  function sfxScore() { playTone(880, 0.1, 'sine', 0.1); }
  function sfxCoin() { playTone(1200, 0.12, 'sine', 0.08); setTimeout(() => playTone(1500, 0.12, 'sine', 0.08), 60); }
  function sfxDeath() { playTone(200, 0.4, 'sawtooth', 0.15); setTimeout(() => playTone(100, 0.5, 'sawtooth', 0.12), 200); }
  function sfxPowerup() { [600, 800, 1000, 1200].forEach((f, i) => setTimeout(() => playTone(f, 0.1, 'sine', 0.08), i * 50)); }
  function sfxMedal() { playTone(1047, 0.15, 'sine', 0.1); setTimeout(() => playTone(1319, 0.2, 'sine', 0.1), 120); }
  function sfxClick() { playTone(440, 0.05, 'square', 0.05); }

  // ── Rewards ──
  function getRewards() {
    try { return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, gems: 0 }; }
    catch { return { coins: 0, gems: 0 }; }
  }
  function saveRewards(r) { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); }
  function addCoins(n) { const r = getRewards(); r.coins += n; saveRewards(r); }

  // ── Save ──
  function getSave() {
    try { return JSON.parse(localStorage.getItem('ngn4_skydrift')) || { best: 0, bestEnv: [0,0,0,0,0], coins: 0, skin: 0, ownedSkins: [0], dailyDate: '', dailyBest: 0, medals: {bronze:0,silver:0,gold:0,plat:0} }; }
    catch { return { best: 0, bestEnv: [0,0,0,0,0], coins: 0, skin: 0, ownedSkins: [0], dailyDate: '', dailyBest: 0, medals: {bronze:0,silver:0,gold:0,plat:0} }; }
  }
  function saveSave(s) { localStorage.setItem('ngn4_skydrift', JSON.stringify(s)); }

  // ── Skins ──
  const SKINS = [
    { id: 0, name: 'Classic', icon: '🐦', color: '#ffcc00', trailColor: '#ffcc0044', cost: 0, effect: 'none' },
    { id: 1, name: 'Phoenix', icon: '🔥', color: '#ff4400', trailColor: '#ff440066', cost: 50, effect: 'fire' },
    { id: 2, name: 'Ice Bird', icon: '❄️', color: '#44ccff', trailColor: '#44ccff66', cost: 100, effect: 'ice' },
    { id: 3, name: 'Shadow', icon: '‍🖤', color: '#8844ff', trailColor: '#8844ff44', cost: 150, effect: 'ghost' },
    { id: 4, name: 'Neon', icon: '💡', color: '#00ff88', trailColor: '#00ff8866', cost: 200, effect: 'glow' },
    { id: 5, name: 'Golden', icon: '✨', color: '#ffd700', trailColor: '#ffd70066', cost: 300, effect: 'sparkle' },
    { id: 6, name: 'Cyber', icon: '🤖', color: '#ff00aa', trailColor: '#ff00aa66', cost: 500, effect: 'cyber' },
    { id: 7, name: 'Cosmic', icon: '🌟', color: '#ffffff', trailColor: '#ffffff44', cost: 750, effect: 'cosmic' },
  ];

  // ── Environments ──
  const ENVIRONMENTS = [
    { name: 'Neon Canyon', bg1: '#0a0a1a', bg2: '#0f0520', pipeColor: '#00ffcc', groundColor: '#0a1a0a', unlockScore: 0 },
    { name: 'Crystal Cave', bg1: '#0a0a2a', bg2: '#050520', pipeColor: '#44ccff', groundColor: '#0a0a2a', unlockScore: 15 },
    { name: 'Storm Clouds', bg1: '#1a1a1a', bg2: '#0a0a0a', pipeColor: '#ffaa00', groundColor: '#1a1a0a', unlockScore: 30 },
    { name: 'Solar Flare', bg1: '#1a0a00', bg2: '#200500', pipeColor: '#ff4400', groundColor: '#1a0a00', unlockScore: 50 },
    { name: 'The Void', bg1: '#000000', bg2: '#050005', pipeColor: '#aa44ff', groundColor: '#050005', unlockScore: 75 },
  ];

  // ── Game State ──
  let canvas, ctx;
  let W, H;
  let gameState = 'menu'; // menu, playing, dead
  let bird, pipes, coins, particles, bgStars;
  let score, coinCount, sessionCoins;
  let velocity, gravity, flapStrength;
  let pipeTimer, pipeInterval, pipeGap, pipeWidth, pipeSpeed;
  let groundY;
  let currentEnv, currentSkin;
  let save;
  let ghostRun = null;
  let ghostFrame = 0;
  let dailyMode = false;
  let powerup = null; // { type: 'slowmo'|'shield', timer: 0 }
  let shakeTimer = 0;
  let flashTimer = 0;
  let afterAdAction = null;

  // ── Constants ──
  const GRAVITY = 0.35;
  const FLAP = -6.5;
  const PIPE_GAP_BASE = 150;
  const PIPE_SPEED_BASE = 2.5;
  const PIPE_INTERVAL_BASE = 90;

  // ── Screen Management ──
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  window.showMenu = function() {
    gameState = 'menu';
    save = getSave();
    document.getElementById('menu-best').textContent = save.best;
    document.getElementById('menu-coins').textContent = getRewards().coins;
    showScreen('menu-screen');
  };

  // ── Skins Screen ──
  window.showSkins = function() {
    sfxClick();
    save = getSave();
    const grid = document.getElementById('skins-grid');
    grid.innerHTML = '';
    SKINS.forEach((sk, i) => {
      const owned = save.ownedSkins.includes(i);
      const active = save.skin === i;
      const card = document.createElement('div');
      card.className = 'skin-card' + (active ? ' active' : owned ? ' owned' : ' locked');
      card.innerHTML = `
        <span class="skin-icon">${sk.icon}</span>
        <span class="skin-name">${sk.name}</span>
        ${!owned ? `<span class="skin-cost">${sk.cost} 🪙</span>` : active ? '<span class="skin-cost" style="color:var(--accent)">EQUIPPED</span>' : '<span class="skin-cost">OWNED</span>'}
      `;
      card.onclick = () => {
        if (owned) {
          save.skin = i;
          saveSave(save);
          showSkins();
          showToast(`Equipped ${sk.name}!`);
        } else {
          const r = getRewards();
          if (r.coins >= sk.cost) {
            r.coins -= sk.cost;
            saveRewards(r);
            save.ownedSkins.push(i);
            save.skin = i;
            saveSave(save);
            showSkins();
            showToast(`Unlocked ${sk.name}!`);
          } else {
            showToast(`Need ${sk.cost} coins!`);
          }
        }
        sfxClick();
      };
      grid.appendChild(card);
    });
    showScreen('skins-screen');
  };

  // ── Daily Challenge ──
  window.showDailyChallenge = function() {
    sfxClick();
    save = getSave();
    const today = new Date().toDateString();
    if (save.dailyDate !== today) {
      save.dailyBest = 0;
      save.dailyDate = today;
      saveSave(save);
    }
    showToast(`Daily Best Today: ${save.dailyBest}. Click FLY to start daily!`);
    dailyMode = true;
    startGame();
  };

  // ── Start Game ──
  window.startGame = function() {
    sfxClick();
    save = getSave();
    currentSkin = SKINS[save.skin] || SKINS[0];
    currentEnv = ENVIRONMENTS[0]; // Default
    initGame();
    showScreen('game-screen');
    gameState = 'playing';
    canvas.focus();
  };

  function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    W = canvas.width = canvas.parentElement.clientWidth || 400;
    H = canvas.height = canvas.parentElement.clientHeight || 600;
    groundY = H - 50;

    bird = { x: W * 0.25, y: H * 0.4, vy: 0, rotation: 0, size: 18 };
    velocity = 0;
    pipes = [];
    coins = [];
    particles = [];
    score = 0;
    coinCount = 0;
    sessionCoins = 0;
    pipeTimer = 0;
    pipeInterval = PIPE_INTERVAL_BASE;
    pipeGap = PIPE_GAP_BASE;
    pipeWidth = 50;
    pipeSpeed = PIPE_SPEED_BASE;
    powerup = null;
    shakeTimer = 0;
    flashTimer = 0;

    // Generate background stars
    bgStars = [];
    for (let i = 0; i < 60; i++) {
      bgStars.push({ x: Math.random() * W, y: Math.random() * groundY, size: Math.random() * 2 + 0.5, speed: Math.random() * 0.3 + 0.1, alpha: Math.random() * 0.5 + 0.2 });
    }

    // Check environment unlocks
    for (let i = ENVIRONMENTS.length - 1; i >= 0; i--) {
      if (save.best >= ENVIRONMENTS[i].unlockScore) {
        currentEnv = ENVIRONMENTS[i];
        break;
      }
    }

    document.getElementById('hud-score').textContent = 'Score: 0';
    document.getElementById('hud-coins').textContent = '🪙 0';
    document.getElementById('hud-env').textContent = currentEnv.name;
    document.getElementById('hud-best').textContent = 'Best: ' + save.best;
  }

  // ── Input ──
  function flap() {
    if (gameState !== 'playing') return;
    bird.vy = FLAP;
    sfxFlap();

    // Trail particles
    for (let i = 0; i < 3; i++) {
      particles.push(createParticle(bird.x, bird.y, currentSkin.trailColor));
    }
  }

  function createParticle(x, y, color) {
    return {
      x, y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2 + 1,
      life: 1, decay: Math.random() * 0.03 + 0.02, size: Math.random() * 4 + 2, color
    };
  }

  // ── Pipe Generation ──
  function spawnPipe() {
    const minGapY = 80;
    const maxGapY = groundY - pipeGap - 80;
    const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

    pipes.push({
      x: W + 10,
      gapY: gapY,
      gapH: pipeGap,
      width: pipeWidth,
      scored: false,
      flash: 0
    });

    // Spawn coin between pipes (50% chance)
    if (Math.random() < 0.5) {
      coins.push({
        x: W + pipeWidth + 60,
        y: gapY + pipeGap / 2 + (Math.random() - 0.5) * (pipeGap * 0.4),
        size: 10, collected: false, bob: Math.random() * Math.PI * 2
      });
    }

    // Power-up (10% chance)
    if (Math.random() < 0.1 && !powerup) {
      const type = Math.random() < 0.5 ? 'slowmo' : 'shield';
      coins.push({
        x: W + pipeWidth + 120,
        y: gapY + pipeGap / 2,
        size: 12, collected: false, bob: 0, type: type
      });
    }
  }

  // ── Collision ──
  function checkCollision() {
    const bx = bird.x, by = bird.y, bs = bird.size;

    // Ground/ceiling
    if (by + bs > groundY || by - bs < 0) return true;

    // Pipes
    for (const pipe of pipes) {
      if (bx + bs > pipe.x && bx - bs < pipe.x + pipe.width) {
        if (by - bs < pipe.gapY || by + bs > pipe.gapY + pipe.gapH) {
          return true;
        }
      }
    }

    // Shield protection
    if (powerup && powerup.type === 'shield') return false;

    return false;
  }

  // ── Game Loop ──
  let lastTime = 0;
  function gameLoop(time) {
    const dt = Math.min((time - lastTime) / 16.67, 3); // Normalize to ~60fps
    lastTime = time;

    if (canvas && ctx) {
      if (gameState === 'playing') {
        update(dt);
      }
      if (gameState === 'playing' || gameState === 'dead') {
        // Decay visual effects even when dead so shake/flash render
        if (gameState === 'dead') {
          if (shakeTimer > 0) shakeTimer -= dt;
          if (flashTimer > 0) flashTimer -= dt;
        }
        draw();
      }
    }

    requestAnimationFrame(gameLoop);
  }

  function update(dt) {
    const speedMult = powerup && powerup.type === 'slowmo' ? 0.5 : 1;

    // Bird physics
    bird.vy += GRAVITY * dt;
    bird.y += bird.vy * dt;
    bird.rotation = Math.min(Math.max(bird.vy * 3, -30), 90);

    // Pipe movement
    pipeTimer += dt;
    if (pipeTimer >= pipeInterval / speedMult) {
      pipeTimer = 0;
      spawnPipe();
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
      const pipe = pipes[i];
      pipe.x -= pipeSpeed * speedMult * dt;

      // Score
      if (!pipe.scored && pipe.x + pipe.width < bird.x) {
        pipe.scored = true;
        pipe.flash = 1;
        score++;
        sessionCoins++;
        sfxScore();
        document.getElementById('hud-score').textContent = 'Score: ' + score;

        // Increase difficulty
        pipeSpeed = PIPE_SPEED_BASE + score * 0.05;
        pipeGap = Math.max(100, PIPE_GAP_BASE - score * 1.5);
        pipeInterval = Math.max(50, PIPE_INTERVAL_BASE - score * 0.5);
      }

      // Flash decay
      if (pipe.flash > 0) pipe.flash -= 0.05 * dt;

      // Remove off-screen
      if (pipe.x + pipe.width < -10) pipes.splice(i, 1);
    }

    // Coin collection
    for (let i = coins.length - 1; i >= 0; i--) {
      const coin = coins[i];
      coin.x -= pipeSpeed * speedMult * dt;
      coin.bob += 0.05 * dt;

      if (!coin.collected) {
        const dx = bird.x - coin.x;
        const dy = bird.y - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bird.size + coin.size) {
          coin.collected = true;
          if (coin.type) {
            // Power-up
            powerup = { type: coin.type, timer: coin.type === 'slowmo' ? 300 : 1 };
            sfxPowerup();
            showToast(coin.type === 'slowmo' ? '🐌 Slow Motion!' : '🛡️ Shield!');
            document.getElementById('powerup-indicator').style.display = 'block';
            document.getElementById('powerup-indicator').textContent = coin.type === 'slowmo' ? '🐌 SLOW MO' : '🛡️ SHIELD';
          } else {
            coinCount++;
            sessionCoins += 5;
            sfxCoin();
            document.getElementById('hud-coins').textContent = '🪙 ' + sessionCoins;
            for (let j = 0; j < 8; j++) particles.push(createParticle(coin.x, coin.y, '#ffd700'));
          }
        }
      }

      if (coin.x < -20) coins.splice(i, 1);
    }

    // Power-up timer
    if (powerup) {
      if (powerup.type === 'slowmo') {
        powerup.timer -= dt;
        if (powerup.timer <= 0) {
          powerup = null;
          document.getElementById('powerup-indicator').style.display = 'none';
        }
      } else if (powerup.type === 'shield') {
        if (checkCollisionWithoutShield()) {
          powerup = null;
          document.getElementById('powerup-indicator').style.display = 'none';
          shakeTimer = 10;
          showToast('Shield absorbed hit!');
          bird.vy = -3; // Bounce
        }
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

    // Background stars
    bgStars.forEach(s => {
      s.x -= s.speed * speedMult * dt;
      if (s.x < 0) { s.x = W; s.y = Math.random() * groundY; }
    });

    // Shake
    if (shakeTimer > 0) shakeTimer -= dt;
    if (flashTimer > 0) flashTimer -= dt;

    // Skin trail effect
    if (Math.random() < 0.3) {
      particles.push(createParticle(bird.x - 10, bird.y, currentSkin.trailColor));
    }

    // Collision check
    if (checkCollision()) {
      die();
    }
  }

  function checkCollisionWithoutShield() {
    const bx = bird.x, by = bird.y, bs = bird.size;
    if (by + bs > groundY || by - bs < 0) return true;
    for (const pipe of pipes) {
      if (bx + bs > pipe.x && bx - bs < pipe.x + pipe.width) {
        if (by - bs < pipe.gapY || by + bs > pipe.gapY + pipe.gapH) return true;
      }
    }
    return false;
  }

  function draw() {
    ctx.save();

    // Shake
    if (shakeTimer > 0) {
      ctx.translate(Math.random() * 6 - 3, Math.random() * 6 - 3);
    }

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, currentEnv.bg1);
    grad.addColorStop(1, currentEnv.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    bgStars.forEach(s => {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1;

    // Pipes
    pipes.forEach(pipe => {
      const flash = pipe.flash > 0;
      ctx.fillStyle = flash ? '#ffffff' : currentEnv.pipeColor;
      ctx.globalAlpha = flash ? pipe.flash : 0.9;

      // Top pipe
      ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapY);
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.gapY + pipe.gapH, pipe.width, groundY - pipe.gapY - pipe.gapH);

      // Pipe caps
      ctx.fillStyle = flash ? '#ffffff' : currentEnv.pipeColor;
      ctx.globalAlpha = 1;
      ctx.fillRect(pipe.x - 3, pipe.gapY - 15, pipe.width + 6, 15);
      ctx.fillRect(pipe.x - 3, pipe.gapY + pipe.gapH, pipe.width + 6, 15);

      // Neon glow
      ctx.shadowColor = currentEnv.pipeColor;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = currentEnv.pipeColor + '66';
      ctx.lineWidth = 1;
      ctx.strokeRect(pipe.x, 0, pipe.width, pipe.gapY);
      ctx.strokeRect(pipe.x, pipe.gapY + pipe.gapH, pipe.width, groundY - pipe.gapY - pipe.gapH);
      ctx.shadowBlur = 0;
    });

    // Coins
    coins.forEach(coin => {
      if (coin.collected) return;
      const bobY = Math.sin(coin.bob) * 3;
      ctx.save();
      ctx.translate(coin.x, coin.y + bobY);
      if (coin.type) {
        // Power-up
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.fillText(coin.type === 'slowmo' ? '🐌' : '🛡️', 0, 5);
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ffcc88';
        ctx.stroke();
      } else {
        // Coin
        ctx.beginPath();
        ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#aa8800';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
      }
      ctx.restore();
    });

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;

    // Bird
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation * Math.PI / 180);

    // Shield visual
    if (powerup && powerup.type === 'shield') {
      ctx.beginPath();
      ctx.arc(0, 0, bird.size + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ffcc88';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Bird body
    ctx.font = `${bird.size * 2}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentSkin.icon, 0, 0);

    ctx.restore();

    // Ground
    ctx.fillStyle = currentEnv.groundColor;
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.strokeStyle = currentEnv.pipeColor + '44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // Ground pattern
    ctx.fillStyle = currentEnv.pipeColor + '22';
    for (let x = 0; x < W; x += 20) {
      ctx.fillRect(x, groundY + 5, 10, 3);
    }

    // Score flash
    if (flashTimer > 0) {
      ctx.globalAlpha = flashTimer * 0.1;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ── Die ──
  function die() {
    gameState = 'dead';
    sfxDeath();
    shakeTimer = 20;
    flashTimer = 5;

    const totalCoins = sessionCoins;
    addCoins(totalCoins);

    // Medal
    let medal = '';
    let medalName = '';
    if (score >= 40) { medal = '💎'; medalName = 'PLATINUM'; save.medals.plat++; }
    else if (score >= 25) { medal = '🥇'; medalName = 'GOLD'; save.medals.gold++; }
    else if (score >= 15) { medal = '🥈'; medalName = 'SILVER'; save.medals.silver++; }
    else if (score >= 5) { medal = '🥉'; medalName = 'BRONZE'; save.medals.bronze++; }

    if (medal) sfxMedal();

    // New best
    let isNewBest = false;
    if (score > save.best) {
      save.best = score;
      isNewBest = true;
      addCoins(20);
    }

    // Daily
    if (dailyMode) {
      const today = new Date().toDateString();
      if (save.dailyDate !== today) { save.dailyDate = today; save.dailyBest = 0; }
      if (score > save.dailyBest) save.dailyBest = score;
    }

    // Env best
    const envIdx = ENVIRONMENTS.indexOf(currentEnv);
    if (envIdx >= 0 && score > save.bestEnv[envIdx]) save.bestEnv[envIdx] = score;

    saveSave(save);

    // Show death screen
    setTimeout(() => {
      document.getElementById('death-title').textContent = score >= 40 ? 'INCREDIBLE!' : score >= 25 ? 'AMAZING!' : score >= 10 ? 'GOOD RUN!' : 'CRASHED!';
      document.getElementById('death-stats').innerHTML = `
        <div>Score: ${score}</div>
        <div>Coins: ${coinCount}</div>
        <div>Distance: ${score}</div>
        <div>${isNewBest ? '🏆 NEW BEST!' : 'Best: ' + save.best}</div>
      `;
      document.getElementById('death-medal').textContent = medal ? `${medal} ${medalName}` : 'No Medal';
      document.getElementById('death-rewards').innerHTML = `
        <div class="reward-line">+${score} 🪙 (distance)</div>
        <div class="reward-line">+${coinCount * 5} 🪙 (coins x5)</div>
        ${isNewBest ? '<div class="reward-line">+20 🪙 (new best!)</div>' : ''}
        <div class="reward-line" style="color:#00ffcc">Total: +${totalCoins + (isNewBest ? 20 : 0)} 🪙</div>
      `;
      document.getElementById('continue-btn').style.display = 'inline-block';
      showScreen('death-screen');
      dailyMode = false;
    }, 800);
  }

  // ── Continue Ad ──
  window.watchContinueAd = function() {
    showAd(() => {
      // Continue from where we died - place bird safely
      gameState = 'playing';
      bird.y = H * 0.3;
      bird.vy = 0;
      // Remove nearby pipes
      pipes = pipes.filter(p => p.x > bird.x + 100);
      document.getElementById('powerup-indicator').style.display = 'none';
      showScreen('game-screen');
    });
  };

  // ── Ad System ──
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
      if (elapsed >= 5) {
        clearInterval(interval);
        closeBtn.style.display = 'inline-block';
        timerEl.textContent = '✓';
      }
    }, 100);
    afterAdAction = callback;
  }

  window.closeAd = function() {
    sfxClick();
    if (afterAdAction) { afterAdAction(); afterAdAction = null; }
    else showScreen('menu-screen');
  };

  // ── Toast ──
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  }

  // ── Event Listeners ──
  function setupInput() {
    const c = document.getElementById('gameCanvas');
    c.addEventListener('click', (e) => { e.preventDefault(); flap(); });
    c.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); }, { passive: false });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); }
    });
  }

  // ── Init ──
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    setupInput();
    save = getSave();
    document.getElementById('menu-best').textContent = save.best;
    document.getElementById('menu-coins').textContent = getRewards().coins;
    showScreen('menu-screen');
    requestAnimationFrame(gameLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
