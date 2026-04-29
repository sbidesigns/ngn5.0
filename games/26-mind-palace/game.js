// ═══════════════════════════════════════════════
// NGN4 GAME 26: MIND PALACE - Memory Match
// ═══════════════════════════════════════════════

(function() {
  'use strict';

  // ── NGN4 Universal Systems Init ──
  try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
  try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('26-mind-palace'); } catch(e) {}

  // ── Audio Engine ──
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  function ensureAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }

  function playTone(freq, dur, type = 'sine', vol = 0.15) {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  }

  function sfxFlip() { playTone(600, 0.08, 'square', 0.08); }
  function sfxMatch() { playTone(800, 0.15, 'sine', 0.12); setTimeout(() => playTone(1000, 0.15, 'sine', 0.12), 100); }
  function sfxMismatch() { playTone(200, 0.2, 'sawtooth', 0.1); }
  function sfxCombo() { playTone(1200, 0.1, 'sine', 0.1); setTimeout(() => playTone(1500, 0.15, 'sine', 0.12), 80); }
  function sfxWin() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'sine', 0.12), i * 120)); }
  function sfxClick() { playTone(440, 0.05, 'square', 0.06); }
  function sfxHint() { playTone(700, 0.3, 'triangle', 0.1); }

  // ── Rewards ──
  function getRewards() {
    try { return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, gems: 0 }; }
    catch { return { coins: 0, gems: 0 }; }
  }
  function saveRewards(r) { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); }
  function addCoins(n) { const r = getRewards(); r.coins += n; saveRewards(r); updateCoinsDisplay(); }
  function updateCoinsDisplay() {
    const r = getRewards();
    const el = document.getElementById('menu-coins');
    if (el) el.textContent = r.coins;
  }

  // ── Level Data ──
  const LEVELS = [
    { id: 1, name: 'First Steps', cols: 4, rows: 3, theme: 'symbols', par: 18, cardBack: '#1a3a5c' },
    { id: 2, name: 'Color Wheel', cols: 4, rows: 3, theme: 'colors', par: 16, cardBack: '#3a1a1a' },
    { id: 3, name: 'Number Crunch', cols: 4, rows: 4, theme: 'numbers', par: 26, cardBack: '#1a3a1a' },
    { id: 4, name: 'NGN Squad', cols: 4, rows: 4, theme: 'ngn', par: 24, cardBack: '#2a1a3a' },
    { id: 5, name: 'Wider Field', cols: 5, rows: 4, theme: 'symbols', par: 32, cardBack: '#3a3a1a' },
    { id: 6, name: 'Deep Colors', cols: 5, rows: 4, theme: 'colors', par: 30, cardBack: '#1a2a3a' },
    { id: 7, name: 'Math Memory', cols: 5, rows: 4, theme: 'numbers', par: 28, cardBack: '#2a3a2a' },
    { id: 8, name: 'NGN Masters', cols: 5, rows: 4, theme: 'ngn', par: 28, cardBack: '#3a2a1a' },
    { id: 9, name: 'Grand Grid', cols: 6, rows: 4, theme: 'symbols', par: 36, cardBack: '#1a1a3a' },
    { id: 10, name: 'Rainbow Rush', cols: 6, rows: 4, theme: 'colors', par: 34, cardBack: '#3a1a2a' },
    { id: 11, name: 'Digit Domain', cols: 6, rows: 5, theme: 'numbers', par: 42, cardBack: '#2a2a1a' },
    { id: 12, name: 'NGN Elite', cols: 6, rows: 5, theme: 'ngn', par: 40, cardBack: '#1a2a2a' },
    { id: 13, name: 'Mega Match', cols: 6, rows: 5, theme: 'symbols', par: 38, cardBack: '#2a1a1a' },
    { id: 14, name: 'Color Storm', cols: 6, rows: 5, theme: 'colors', par: 36, cardBack: '#1a1a1a' },
    { id: 15, name: 'Numplex', cols: 6, rows: 6, theme: 'numbers', par: 52, cardBack: '#33331a' },
    { id: 16, name: 'NGN Legends', cols: 6, rows: 6, theme: 'ngn', par: 50, cardBack: '#1a3333' },
    { id: 17, name: 'Symbolic', cols: 6, rows: 6, theme: 'symbols', par: 48, cardBack: '#331a33' },
    { id: 18, name: 'Chromatic', cols: 6, rows: 6, theme: 'colors', par: 46, cardBack: '#1a331a' },
    { id: 19, name: 'Final Numbers', cols: 6, rows: 6, theme: 'numbers', par: 44, cardBack: '#332a1a' },
    { id: 20, name: 'Grand Palace', cols: 6, rows: 6, theme: 'mixed', par: 48, cardBack: '#2a1a33' }
  ];

  const SYMBOLS = ['★', '♦', '♠', '♣', '♥', '◆', '▲', '●', '■', '✦', '⬡', '⊕', '∞', '⚡', '☾', '✿', '⬢', '◈'];
  const COLORS = ['#ff0055', '#00ff88', '#4488ff', '#ffaa00', '#ff00ff', '#00ffff', '#ffff00', '#ff8800', '#88ff00', '#ff0088', '#0088ff', '#ff5533', '#33ffaa', '#aa33ff', '#ff6688', '#33aaff', '#ffcc33', '#33ff66'];
  const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
  const NGN_CHARS = ['N', 'G', 'n', '4', '#', '@', '&', '%', 'Ω', 'Σ', 'Δ', 'Φ', 'Ψ', 'Λ', 'Ξ', 'Π', 'Θ', 'β'];

  function getCardValues(theme, count) {
    let pool;
    switch (theme) {
      case 'colors': pool = COLORS.slice(); break;
      case 'numbers': pool = NUMBERS.slice(); break;
      case 'ngn': pool = NGN_CHARS.slice(); break;
      case 'mixed': pool = [...SYMBOLS.slice(0, 6), ...COLORS.slice(0, 6), ...NGN_CHARS.slice(0, 6)]; break;
      default: pool = SYMBOLS.slice();
    }
    // Shuffle and pick
    pool = shuffleArray(pool);
    return pool.slice(0, count);
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Progress ──
  function getProgress() {
    try { return JSON.parse(localStorage.getItem('ngn4_mindpalace')) || { completed: {}, stars: {}, bestMoves: {} }; }
    catch { return { completed: {}, stars: {}, bestMoves: {} }; }
  }
  function saveProgress(p) { localStorage.setItem('ngn4_mindpalace', JSON.stringify(p)); }

  // ── Game State ──
  let canvas, ctx;
  let currentLevel = null;
  let currentLevelIdx = 0;
  let cards = [];
  let flippedCards = [];
  let matchedPairs = 0;
  let totalPairs = 0;
  let moves = 0;
  let combo = 0;
  let maxCombo = 0;
  let timerStart = 0;
  let timerElapsed = 0;
  let timerInterval = null;
  let isLocked = false;
  let gameActive = false;
  let hintUsed = false;
  let particles = [];
  let cardAnimations = [];
  let peekMode = false;
  let afterAdAction = null;

  // ── Card Object ──
  class Card {
    constructor(id, value, col, row, x, y, w, h, theme) {
      this.id = id;
      this.value = value;
      this.col = col;
      this.row = row;
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.theme = theme;
      this.faceUp = false;
      this.matched = false;
      this.flipProgress = 0; // 0 = face down, 1 = face up
      this.flipTarget = 0;
      this.scale = 1;
      this.scaleTarget = 1;
      this.glowIntensity = 0;
      this.shakeX = 0;
      this.shakeAmount = 0;
    }

    update(dt) {
      const speed = 5;
      if (this.flipProgress < this.flipTarget) {
        this.flipProgress = Math.min(this.flipTarget, this.flipProgress + dt * speed);
      } else if (this.flipProgress > this.flipTarget) {
        this.flipProgress = Math.max(this.flipTarget, this.flipProgress - dt * speed);
      }
      this.scale += (this.scaleTarget - this.scale) * dt * 10;
      if (this.shakeAmount > 0) {
        this.shakeX = Math.sin(Date.now() * 0.05) * this.shakeAmount;
        this.shakeAmount *= 0.9;
        if (this.shakeAmount < 0.5) this.shakeAmount = 0;
      }
      if (this.matched && this.glowIntensity < 1) {
        this.glowIntensity = Math.min(1, this.glowIntensity + dt * 3);
      }
    }

    draw(ctx, cardBackColor) {
      ctx.save();
      const cx = this.x + this.w / 2 + this.shakeX;
      const cy = this.y + this.h / 2;
      const scaleX = Math.abs(Math.cos(this.flipProgress * Math.PI));
      ctx.translate(cx, cy);
      ctx.scale(scaleX * this.scale, this.scale);
      ctx.translate(-cx, -cy);

      const showingFace = this.flipProgress > 0.5;

      // Glow for matched cards
      if (this.matched && this.glowIntensity > 0) {
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 15 * this.glowIntensity;
      }

      // Card body
      const r = 6;
      ctx.beginPath();
      ctx.roundRect(this.x + 2, this.y + 2, this.w - 4, this.h - 4, r);

      if (showingFace) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = this.matched ? '#00ffcc' : '#00ffcc88';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw value
        ctx.shadowBlur = 0;
        const isColor = this.theme === 'colors' || (this.theme === 'mixed' && this.value.startsWith('#'));
        if (isColor) {
          ctx.fillStyle = this.value;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.min(this.w, this.h) * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff44';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = this.theme === 'ngn' ? '#00ffcc' : this.theme === 'numbers' ? '#ffaa00' : '#ff00aa';
          ctx.font = `bold ${Math.min(this.w, this.h) * 0.4}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.value, cx, cy);
        }

        if (this.matched) {
          ctx.strokeStyle = '#00ffcc66';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(this.x + 10, this.y + 10);
          ctx.lineTo(this.x + this.w - 10, this.y + this.h - 10);
          ctx.moveTo(this.x + this.w - 10, this.y + 10);
          ctx.lineTo(this.x + 10, this.y + this.h - 10);
          ctx.stroke();
        }
      } else {
        // Card back
        ctx.fillStyle = cardBackColor || '#1a2a3a';
        ctx.fill();
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pattern on back
        ctx.fillStyle = '#ffffff08';
        ctx.font = `bold ${Math.min(this.w, this.h) * 0.35}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N', cx, cy);
      }

      ctx.restore();
    }

    containsPoint(px, py) {
      return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
    }
  }

  // ── Particles ──
  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 200;
      this.vy = (Math.random() - 0.5) * 200 - 50;
      this.life = 1;
      this.decay = Math.random() * 1.5 + 1;
      this.size = Math.random() * 4 + 2;
      this.color = color || '#00ffcc';
    }
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += 200 * dt;
      this.life -= this.decay * dt;
    }
    draw(ctx) {
      if (this.life <= 0) return;
      ctx.globalAlpha = this.life;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
      ctx.globalAlpha = 1;
    }
  }

  function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, color));
    }
  }

  // ── Screen Management ──
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  window.showMenu = function() {
    stopTimer();
    gameActive = false;
    showScreen('menu-screen');
    updateCoinsDisplay();
  };

  window.showSettings = function() {
    sfxClick();
    showToast('Settings: Audio ON, Theme: Neon');
  };

  // ── Level Select ──
  window.selectLevel = function() {
    sfxClick();
    const progress = getProgress();
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    LEVELS.forEach((lvl, idx) => {
      const btn = document.createElement('button');
      const unlocked = idx === 0 || progress.completed[LEVELS[idx - 1].id];
      const stars = progress.stars[lvl.id] || 0;
      btn.className = 'level-btn' + (unlocked ? '' : ' locked') + (progress.completed[lvl.id] ? ' completed' : '');
      btn.innerHTML = `${lvl.id}<span class="level-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`;
      if (unlocked) {
        btn.onclick = () => { sfxClick(); startLevel(idx); };
      }
      grid.appendChild(btn);
    });
    showScreen('level-select');
  };

  // ── Start Game / Level ──
  window.startGame = function() {
    sfxClick();
    const progress = getProgress();
    let startIdx = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      if (!progress.completed[LEVELS[i].id]) { startIdx = i; break; }
      if (i === LEVELS.length - 1) startIdx = i;
    }
    startLevel(startIdx);
  };

  function startLevel(idx) {
    currentLevelIdx = idx;
    currentLevel = LEVELS[idx];
    initCards();
    gameActive = true;
    matchedPairs = 0;
    moves = 0;
    combo = 0;
    maxCombo = 0;
    flippedCards = [];
    isLocked = false;
    hintUsed = false;
    peekMode = false;
    particles = [];
    timerStart = Date.now();
    timerElapsed = 0;
    startTimer();

    document.getElementById('hud-level').textContent = `Lv${currentLevel.id}: ${currentLevel.name}`;
    updateHUD();
    showScreen('game-screen');
    resizeCanvas();
  }

  function initCards() {
    cards = [];
    const lvl = currentLevel;
    totalPairs = (lvl.cols * lvl.rows) / 2;
    const values = getCardValues(lvl.theme, totalPairs);
    let allValues = [...values, ...values];
    allValues = shuffleArray(allValues);

    const cw = canvas.width;
    const ch = canvas.height;
    const padding = 10;
    const gap = 6;
    const availW = cw - padding * 2 - gap * (lvl.cols - 1);
    const availH = ch - padding * 2 - gap * (lvl.rows - 1);
    const cardW = availW / lvl.cols;
    const cardH = availH / lvl.rows;

    let id = 0;
    for (let r = 0; r < lvl.rows; r++) {
      for (let c = 0; c < lvl.cols; c++) {
        const x = padding + c * (cardW + gap);
        const y = padding + r * (cardH + gap);
        const card = new Card(id++, allValues[r * lvl.cols + c], c, r, x, y, cardW, cardH, lvl.theme);
        cards.push(card);
      }
    }
  }

  // ── Canvas ──
  function repositionCards() {
    if (!currentLevel || cards.length === 0) return;
    const lvl = currentLevel;
    const cw = canvas.width;
    const ch = canvas.height;
    const padding = 10;
    const gap = 6;
    const availW = cw - padding * 2 - gap * (lvl.cols - 1);
    const availH = ch - padding * 2 - gap * (lvl.rows - 1);
    const cardW = availW / lvl.cols;
    const cardH = availH / lvl.rows;
    cards.forEach(card => {
      card.x = padding + card.col * (cardW + gap);
      card.y = padding + card.row * (cardH + gap);
      card.w = cardW;
      card.h = cardH;
    });
  }

  function resizeCanvas() {
    if (!canvas) return;
    const container = document.getElementById('game-container');
    const hudH = 50;
    canvas.width = Math.min(container.clientWidth, 900);
    canvas.height = container.clientHeight - hudH;
    if (currentLevel && cards.length > 0) repositionCards();
  }

  // ── Timer ──
  function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
      if (gameActive) {
        timerElapsed = Math.floor((Date.now() - timerStart) / 1000);
        const m = Math.floor(timerElapsed / 60);
        const s = timerElapsed % 60;
        document.getElementById('hud-timer').textContent = `Time: ${m}:${s.toString().padStart(2, '0')}`;
      }
    }, 200);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function updateHUD() {
    document.getElementById('hud-moves').textContent = `Moves: ${moves}`;
    document.getElementById('hud-combo').textContent = combo > 1 ? `Combo: x${combo} 🔥` : `Combo: x1`;
    document.getElementById('hud-pairs').textContent = `Pairs: ${matchedPairs}/${totalPairs}`;
  }

  // ── Card Interaction ──
  function handleCanvasClick(e) {
    if (!gameActive || isLocked || peekMode) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    for (const card of cards) {
      if (!card.faceUp && !card.matched && card.containsPoint(mx, my)) {
        flipCard(card);
        break;
      }
    }
  }

  function flipCard(card) {
    card.faceUp = true;
    card.flipTarget = 1;
    card.scaleTarget = 1.05;
    setTimeout(() => { card.scaleTarget = 1; }, 150);
    flippedCards.push(card);
    sfxFlip();

    if (flippedCards.length === 2) {
      moves++;
      isLocked = true;

      if (flippedCards[0].value === flippedCards[1].value) {
        // Match!
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        matchedPairs++;

        setTimeout(() => {
          flippedCards.forEach(c => { c.matched = true; });
          const cx = (flippedCards[0].x + flippedCards[1].x) / 2 + currentLevel.cols * 10;
          const cy = (flippedCards[0].y + flippedCards[1].y) / 2;
          spawnParticles(cx, cy, 15, '#00ffcc');
          spawnParticles(flippedCards[0].x + flippedCards[0].w / 2, flippedCards[0].y + flippedCards[0].h / 2, 8, '#ff00aa');
          spawnParticles(flippedCards[1].x + flippedCards[1].w / 2, flippedCards[1].y + flippedCards[1].h / 2, 8, '#ff00aa');

          if (combo >= 3) { sfxCombo(); showToast(`Combo x${combo}! 🔥`); }
          else sfxMatch();

          // Rewards
          addCoins(2);
          if (combo >= 3) addCoins(20); // combo bonus

          flippedCards = [];
          isLocked = false;
          updateHUD();

          if (matchedPairs >= totalPairs) {
            setTimeout(() => winLevel(), 500);
          }
        }, 300);
      } else {
        // Mismatch
        combo = 0;
        setTimeout(() => {
          flippedCards.forEach(c => {
            c.faceUp = false;
            c.flipTarget = 0;
            c.shakeAmount = 5;
          });
          sfxMismatch();
          flippedCards = [];
          isLocked = false;
          updateHUD();
        }, 700);
      }
    }
  }

  // ── Hint System ──
  window.useHint = function() {
    if (!gameActive || isLocked) return;
    const rewards = getRewards();
    if (rewards.coins < 10) {
      showToast('Need 10 coins for a hint!');
      return;
    }
    sfxHint();
    rewards.coins -= 10;
    saveRewards(rewards);
    updateCoinsDisplay();

    // Briefly show all unmatched cards
    peekMode = true;
    cards.filter(c => !c.matched).forEach(c => {
      c.faceUp = true;
      c.flipTarget = 1;
    });

    setTimeout(() => {
      cards.filter(c => !c.matched && !flippedCards.includes(c)).forEach(c => {
        c.faceUp = false;
        c.flipTarget = 0;
      });
      peekMode = false;
    }, 1000);
  };

  // ── Win Level ──
  function winLevel() {
    stopTimer();
    gameActive = false;
    sfxWin();

    const progress = getProgress();
    const par = currentLevel.par;
    const ratio = moves / par;
    let stars = 1;
    if (ratio <= 1.0) stars = 3;
    else if (ratio <= 1.4) stars = 2;

    const prevStars = progress.stars[currentLevel.id] || 0;
    if (stars > prevStars) progress.stars[currentLevel.id] = stars;
    progress.completed[currentLevel.id] = true;
    if (!progress.bestMoves[currentLevel.id] || moves < progress.bestMoves[currentLevel.id]) {
      progress.bestMoves[currentLevel.id] = moves;
    }
    saveProgress(progress);

    // Calculate rewards
    let matchReward = totalPairs * 2;
    let comboBonus = maxCombo >= 3 ? 20 : 0;
    let levelClear = 50;
    let starBonus = stars * 15;
    let totalReward = matchReward + comboBonus + levelClear + starBonus;

    // Show results
    document.getElementById('results-title').textContent = stars === 3 ? '★ PERFECT! ★' : stars === 2 ? 'GREAT!' : 'CLEARED!';
    document.getElementById('results-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);

    document.getElementById('results-stats').innerHTML = `
      <div>Level: ${currentLevel.id} - ${currentLevel.name}</div>
      <div>Moves: ${moves} (Par: ${par})</div>
      <div>Time: ${formatTime(timerElapsed)}</div>
      <div>Max Combo: x${maxCombo}</div>
      <div>Theme: ${currentLevel.theme}</div>
      <div>Grid: ${currentLevel.cols}×${currentLevel.rows}</div>
    `;

    document.getElementById('results-rewards').innerHTML = `
      <div class="reward-line">Match Rewards: +${matchReward} 🪙</div>
      ${comboBonus > 0 ? `<div class="reward-line">Combo Bonus: +${comboBonus} 🪙</div>` : ''}
      <div class="reward-line">Level Clear: +${levelClear} 🪙</div>
      <div class="reward-line">Star Bonus: +${starBonus} 🪙</div>
      <div class="reward-line" style="color:#00ffcc;font-size:1.2rem;margin-top:8px">TOTAL: +${totalReward} 🪙</div>
    `;

    addCoins(totalReward - matchReward - comboBonus); // match coins already added during play

    const nextBtn = document.getElementById('next-level-btn');
    nextBtn.style.display = currentLevelIdx < LEVELS.length - 1 ? 'inline-block' : 'none';

    // Show ad before results on even levels
    if (currentLevel.id % 2 === 0 && currentLevelIdx < LEVELS.length - 1) {
      afterAdAction = () => showScreen('results-screen');
      showAd(false);
    } else {
      showScreen('results-screen');
    }
  }

  window.nextLevel = function() {
    sfxClick();
    if (currentLevelIdx < LEVELS.length - 1) {
      startLevel(currentLevelIdx + 1);
    }
  };

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Pause ──
  window.pauseGame = function() {
    sfxClick();
    gameActive = false;
    document.getElementById('pause-overlay').style.display = 'flex';
  };

  window.resumeGame = function() {
    sfxClick();
    gameActive = true;
    timerStart = Date.now() - timerElapsed * 1000;
    document.getElementById('pause-overlay').style.display = 'none';
  };

  window.restartLevel = function() {
    sfxClick();
    document.getElementById('pause-overlay').style.display = 'none';
    startLevel(currentLevelIdx);
  };

  window.quitToMenu = function() {
    sfxClick();
    stopTimer();
    document.getElementById('pause-overlay').style.display = 'none';
    showMenu();
  };

  // ── Ad System ──
  function showAd(rewarded) {
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
  }

  window.closeAd = function() {
    sfxClick();
    if (afterAdAction) {
      afterAdAction();
      afterAdAction = null;
    } else {
      showScreen('results-screen');
    }
  };

  // ── Toast ──
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // ── Game Loop ──
  let lastTime = 0;
  function gameLoop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    if (canvas && ctx && document.getElementById('game-screen').classList.contains('active')) {
      // Clear
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle grid background
      ctx.strokeStyle = '#ffffff06';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Update & draw cards
      cards.forEach(card => {
        card.update(dt);
        card.draw(ctx, currentLevel ? currentLevel.cardBack : '#1a2a3a');
      });

      // Particles
      particles.forEach(p => { p.update(dt); p.draw(ctx); });
      particles = particles.filter(p => p.life > 0);
    }

    requestAnimationFrame(gameLoop);
  }

  // ── Init ──
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', resizeCanvas);
    updateCoinsDisplay();
    resizeCanvas();
    requestAnimationFrame(gameLoop);
    showScreen('menu-screen');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
