// ============================================================
// NGN4 GAME 10: COURT LEGENDS - Basketball
// ============================================================
(function(){
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('court-legends'); } catch(e) {}


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// --- Court dimensions ---
const COURT_Y = 80;
const COURT_H = H - COURT_Y - 40;
const COURT_LEFT = 60;
const COURT_RIGHT = W - 60;
const COURT_W = COURT_RIGHT - COURT_LEFT;
const HOOP_Y = COURT_Y + 40;
const HOOP_LEFT = COURT_LEFT + 15;
const HOOP_RIGHT = COURT_RIGHT - 15;
const THREE_PT_LEFT = COURT_LEFT + 120;
const THREE_PT_RIGHT = COURT_RIGHT - 120;
const GROUND_Y = COURT_Y + COURT_H;

// --- Audio ---
let audioCtx = null;
function getAudioCtx() { if (!audioCtx) try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} return audioCtx; }
function playTone(freq, dur, type='square', vol=0.1){
  if (!getAudioCtx()) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}
function sfxBounce(){ playTone(150, 0.08, 'triangle', 0.1); }
function sfxShoot(){ playTone(300, 0.15, 'sine', 0.1); playTone(500, 0.1, 'sine', 0.08); }
function sfxScore(){ playTone(400, 0.1); setTimeout(()=>playTone(500, 0.1), 80); setTimeout(()=>playTone(700, 0.2), 160); }
function sfxMiss(){ playTone(200, 0.2, 'sawtooth', 0.1); }
function sfxBuzzer(){ playTone(200, 0.5, 'square', 0.15); playTone(150, 0.5, 'sawtooth', 0.1); }
function sfxSwish(){ playTone(800, 0.15, 'sine', 0.08); playTone(1000, 0.1, 'sine', 0.06); }
function sfxSteal(){ playTone(600, 0.1, 'square', 0.1); }
function sfxBlock(){ playTone(300, 0.15, 'sawtooth', 0.15); }
function sfxDunk(){ playTone(100, 0.3, 'sawtooth', 0.2); sfxScore(); }
function sfxUpgrade(){ playTone(500, 0.1); setTimeout(()=>playTone(700, 0.15), 80); }
function sfxFoul(){ playTone(250, 0.2, 'square', 0.15); playTone(200, 0.3, 'sawtooth', 0.1); }
function sfxAchievement(){ playTone(523, 0.15, 'sine', 0.1); setTimeout(()=>playTone(659, 0.15, 'sine', 0.1), 100); setTimeout(()=>playTone(784, 0.2, 'sine', 0.12), 200); }

// --- Rewards ---
function getCoins(){
  return JSON.parse(localStorage.getItem('ngn4_rewards') || '{}').coins || 0;
}
function addCoins(n){
  const r = JSON.parse(localStorage.getItem('ngn4_rewards') || '{}');
  r.coins = (r.coins || 0) + n;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
  document.getElementById('coinDisplay').textContent = getCoins();
}

// --- Player Stats ---
let playerStats = JSON.parse(localStorage.getItem('ngn4_court_stats') || 'null') || {
  accuracy: 5, speed: 5, power: 5, defense: 5, stamina: 5
};
function saveStats(){
  localStorage.setItem('ngn4_court_stats', JSON.stringify(playerStats));
}

// --- Upgrade System ---
const UPGRADES = [
  { key:'accuracy', name:'Accuracy', desc:'Shot accuracy bonus', baseCost:30, max:20 },
  { key:'speed', name:'Speed', desc:'Movement speed', baseCost:30, max:20 },
  { key:'power', name:'Power', desc:'Dunk/steal power', baseCost:30, max:20 },
  { key:'defense', name:'Defense', desc:'Block effectiveness', baseCost:30, max:20 },
  { key:'stamina', name:'Stamina', desc:'Sprint duration', baseCost:25, max:20 }
];

function openUpgrades(){
  const container = document.getElementById('upgrade-items');
  container.innerHTML = '';
  UPGRADES.forEach(u => {
    const lvl = playerStats[u.key];
    const cost = Math.floor(u.baseCost * (1 + lvl * 0.5));
    const div = document.createElement('div');
    div.className = 'upgrade-item';
    div.innerHTML = `<div><div class="upgrade-name">${u.name}</div><div class="upgrade-level">${u.desc} (Lv.${lvl})</div></div><div class="upgrade-cost">${lvl >= u.max ? 'MAX' : cost + ' coins'}</div>`;
    div.onclick = () => {
      if(lvl >= u.max) return;
      if(getCoins() >= cost){
        addCoins(-cost);
        playerStats[u.key]++;
        saveStats();
        sfxUpgrade();
        openUpgrades();
      }
    };
    container.appendChild(div);
  });
  document.getElementById('upgrades-screen').classList.remove('hidden');
}

// --- Difficulty System ---
let difficulty = 'allstar'; // rookie, allstar, halloffame
const DIFF_MULT = {
  rookie:    { aiSpeed: 0.7, aiAccuracy: 0.55, aiSteal: 0.003, foulRate: 0.01, aiShotClock: 20 },
  allstar:   { aiSpeed: 1.0, aiAccuracy: 0.70, aiSteal: 0.005, foulRate: 0.008, aiShotClock: 24 },
  halloffame: { aiSpeed: 1.3, aiAccuracy: 0.85, aiSteal: 0.008, foulRate: 0.005, aiShotClock: 24 }
};

// --- Achievement System ---
let careerStats = JSON.parse(localStorage.getItem('ngn4_court_career') || 'null') || {
  gamesWon: 0, totalThrees: 0, gamesPlayed: 0, bestPoints: 0,
  perfectQuarters: 0, tournamentWins: 0,
  unlocked: []
};

function saveCareer(){
  localStorage.setItem('ngn4_court_career', JSON.stringify(careerStats));
}

function unlockAchievement(id, name, desc){
  if(careerStats.unlocked.includes(id)) return;
  careerStats.unlocked.push(id);
  saveCareer();
  sfxAchievement();
  addCoins(25);
  // Show popup
  const popup = document.getElementById('achievement-popup');
  popup.innerHTML = `<div style="font-size:18px;color:#ff0">🏆 Achievement Unlocked!</div><div style="color:#0ff;font-weight:bold">${name}</div><div style="color:#aaa;font-size:12px">${desc}</div>`;
  popup.classList.remove('hidden');
  popup.style.top = '60px';
  setTimeout(()=>{ popup.style.top = '-80px'; }, 3500);
  setTimeout(()=>{ popup.classList.add('hidden'); }, 4000);
}

function checkAchievements(){
  if(!careerStats.unlocked.includes('first_basket') && (playerScore > 0 || gameStats.shotsMade > 0)){
    unlockAchievement('first_basket', 'First Basket', 'Score your first basket');
  }
  if(!careerStats.unlocked.includes('double_digit') && playerScore >= 10){
    unlockAchievement('double_digit', 'Double Digit', 'Score 10+ points in a game');
  }
  if(!careerStats.unlocked.includes('three_pt_king') && gameStats.threesInGame >= 5){
    unlockAchievement('three_pt_king', 'Three-Point King', 'Make 5 three-pointers in a game');
  }
  if(!careerStats.unlocked.includes('perfect_quarter') && gameStats.hadPerfectQuarter){
    unlockAchievement('perfect_quarter', 'Perfect Quarter', 'Shoot 100% in a quarter (min 3 shots)');
  }
  if(!careerStats.unlocked.includes('tournament_champion') && careerStats.tournamentWins >= 1){
    unlockAchievement('tournament_champion', 'Tournament Champion', 'Win a tournament');
  }
  if(!careerStats.unlocked.includes('career_50_wins') && careerStats.gamesWon >= 50){
    unlockAchievement('career_50_wins', '50 Career Wins', 'Win 50 games total');
  }
  if(!careerStats.unlocked.includes('mvp') && playerScore >= 30){
    unlockAchievement('mvp', 'MVP', 'Score 30+ points in a game');
  }
}

// --- Game State ---
let state = 'menu';
let gameMode = 'tournament';
let tournamentRound = 0;
let playerScore = 0, aiScore = 0;
let quarter = 1, quarterTime = 60;
let shotClock = 24;
let aiShotClock = 24;
let hasBall = true;
let ball = { x: W/2, y: GROUND_Y, vx: 0, vy: 0, inFlight: false, owner: null };
let player = { x: W * 0.6, y: GROUND_Y, vy: 0, grounded: true, facing: 1, sprint: false, stamina: 100 };
let ai = { x: W * 0.4, y: GROUND_Y, vy: 0, grounded: true, facing: 1, targetX: W * 0.4, dribbleTimer: 0, driveTimer: 0, holdTimer: 0, state: 'idle' };
let keys = {};
let particles = [];
let totalCoinsEarned = 0;

// Shot meter state
let shotPhase = 'none';
let powerValue = 0, powerDir = 1, powerSpeed = 2;
let arcValue = 0, arcDir = 1, arcSpeed = 2.5;
let shotType = 'midrange';
let shotAnim = null;

// Free throw state
let freeThrowState = null; // { shooter: 'player'|'ai', attempts: 2, made: 0, current: 0 }
let foulOnPlay = false;
let playerFouls = 0, aiFouls = 0;

// Per-game stats for achievements
let gameStats = { shotsMade: 0, shotsTaken: 0, threesInGame: 0, quarterShots: 0, quarterMakes: 0, hadPerfectQuarter: false };

// Touch controls
let touchJoystick = { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0 };
let touchButtons = { shoot: false, steal: false, sprint: false };

// Gamepad
let gamepadIndex = null;
let gamepadButtons = {};
let prevGamepadButtons = {};

// Timing
let lastTime = 0;
let gameTimer = 0;

// --- Touch Controls Setup ---
function setupTouchControls(){
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
  if(isMobile){
    document.getElementById('touch-controls').style.display = 'block';
  }

  const joyZone = document.getElementById('touch-joystick');
  const thumb = document.getElementById('joystick-thumb');
  if(!joyZone) return;

  joyZone.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const r = joyZone.getBoundingClientRect();
    touchJoystick.active = true;
    touchJoystick.id = t.identifier;
    touchJoystick.cx = r.left + r.width/2;
    touchJoystick.cy = r.top + r.height/2;
  }, {passive:false});

  joyZone.addEventListener('touchmove', e => {
    e.preventDefault();
    for(const t of e.changedTouches){
      if(t.identifier === touchJoystick.id){
        const dx = t.clientX - touchJoystick.cx;
        const dy = t.clientY - touchJoystick.cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxR = 50;
        const clamp = Math.min(dist, maxR);
        if(dist > 0){
          touchJoystick.dx = (dx/dist) * (clamp/maxR);
          touchJoystick.dy = (dy/dist) * (clamp/maxR);
        }
        thumb.style.left = (35 + touchJoystick.dx * 35) + 'px';
        thumb.style.top = (35 + touchJoystick.dy * 35) + 'px';
      }
    }
  }, {passive:false});

  const endTouch = e => {
    for(const t of e.changedTouches){
      if(t.identifier === touchJoystick.id){
        touchJoystick.active = false;
        touchJoystick.dx = 0;
        touchJoystick.dy = 0;
        touchJoystick.id = null;
        thumb.style.left = '35px';
        thumb.style.top = '35px';
      }
    }
  };
  joyZone.addEventListener('touchend', endTouch);
  joyZone.addEventListener('touchcancel', endTouch);

  // Buttons
  const tbShoot = document.getElementById('tb-shoot');
  const tbSteal = document.getElementById('tb-steal');
  const tbSprint = document.getElementById('tb-sprint');

  if(tbShoot){
    tbShoot.addEventListener('touchstart', e => { e.preventDefault(); touchButtons.shoot = true; doShootAction(); }, {passive:false});
    tbShoot.addEventListener('touchend', e => { e.preventDefault(); touchButtons.shoot = false; });
  }
  if(tbSteal){
    tbSteal.addEventListener('touchstart', e => { e.preventDefault(); touchButtons.steal = true; }, {passive:false});
    tbSteal.addEventListener('touchend', e => { e.preventDefault(); touchButtons.steal = false; });
  }
  if(tbSprint){
    tbSprint.addEventListener('touchstart', e => { e.preventDefault(); touchButtons.sprint = true; }, {passive:false});
    tbSprint.addEventListener('touchend', e => { e.preventDefault(); touchButtons.sprint = false; });
  }
}

function doShootAction(){
  if(state === 'playing' && hasBall && player.grounded && shotPhase === 'none'){
    initShot();
  } else if(state === 'shooting' && shotPhase === 'power'){
    confirmPower();
  } else if(state === 'shooting' && shotPhase === 'arc'){
    confirmArc();
  }
}

// --- Gamepad Setup ---
function setupGamepad(){
  window.addEventListener('gamepadconnected', e => { gamepadIndex = e.gamepad.index; });
  window.addEventListener('gamepaddisconnected', e => { if(e.gamepad.index === gamepadIndex) gamepadIndex = null; });
  setInterval(pollGamepad, 16);
}

function pollGamepad(){
  if(gamepadIndex === null){
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for(let i = 0; i < gps.length; i++){ if(gps[i]){ gamepadIndex = i; break; } }
  }
  if(gamepadIndex === null) return;
  const gp = navigator.getGamepads()[gamepadIndex];
  if(!gp) return;
  prevGamepadButtons = {...gamepadButtons};
  for(let i = 0; i < gp.buttons.length; i++){
    gamepadButtons[i] = gp.buttons[i].pressed || gp.buttons[i].value > 0.5;
  }
}

function isGamepadJustPressed(btn){
  return gamepadButtons[btn] && !prevGamepadButtons[btn];
}
function getGamepadAxis(i){
  if(gamepadIndex === null) return 0;
  const gp = navigator.getGamepads()[gamepadIndex];
  if(!gp || !gp.axes[i]) return 0;
  return Math.abs(gp.axes[i]) < 0.15 ? 0 : gp.axes[i];
}

// --- Start Game ---
function startGame(){
  playerScore = 0;
  aiScore = 0;
  quarter = 1;
  quarterTime = 60;
  hasBall = true;
  playerFouls = 0;
  aiFouls = 0;
  freeThrowState = null;
  gameStats = { shotsMade: 0, shotsTaken: 0, threesInGame: 0, quarterShots: 0, quarterMakes: 0, hadPerfectQuarter: false };
  resetPositions();
  state = 'playing';
  shotPhase = 'none';
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('game-hud').classList.remove('hidden');
  document.getElementById('controls-hint').classList.remove('hidden');
  document.getElementById('shot-meter').classList.add('hidden');
  gameTimer = 0;
  careerStats.gamesPlayed++;
  saveCareer();
}

function resetPositions(){
  player.x = hasBall ? W * 0.6 : W * 0.7;
  player.y = GROUND_Y;
  player.vy = 0;
  player.grounded = true;
  player.sprint = false;
  player.stamina = 100;
  ai.x = hasBall ? W * 0.35 : W * 0.5;
  ai.y = GROUND_Y;
  ai.vy = 0;
  ai.grounded = true;
  ai.state = 'idle';
  ai.holdTimer = 0;
  ball.inFlight = false;
  ball.owner = hasBall ? 'player' : 'ai';
  shotClock = 24;
  aiShotClock = DIFF_MULT[difficulty].aiShotClock;
  shotPhase = 'none';
  document.getElementById('shot-meter').classList.add('hidden');
}

// --- Update ---
function updateGame(dt){
  if(state !== 'playing' && state !== 'shooting') return;

  // Free throw mode - only return early if not in ball flight
  if(freeThrowState && !ball.inFlight){
    updateFreeThrow(dt);
    // Still update shot meter during free throws
    if(shotPhase === 'power'){
      powerValue += powerDir * powerSpeed * dt * 100;
      if(powerValue >= 100){ powerValue = 100; powerDir = -1; }
      if(powerValue <= 0){ powerValue = 0; powerDir = 1; }
      document.getElementById('power-fill').style.width = powerValue + '%';
      document.getElementById('power-marker').style.left = powerValue + '%';
    }
    return;
  }

  // Quarter timer
  gameTimer += dt;
  if(gameTimer >= 1){
    gameTimer -= 1;
    quarterTime--;
    if(hasBall){
      shotClock--;
      if(shotClock <= 0){
        // Shot clock violation - player
        hasBall = false;
        resetPositions();
      }
    } else {
      aiShotClock--;
      if(aiShotClock <= 0){
        // AI shot clock violation
        hasBall = true;
        resetPositions();
      }
    }
    if(quarterTime <= 0){
      sfxBuzzer();
      // Check perfect quarter
      if(gameStats.quarterShots >= 3 && gameStats.quarterMakes === gameStats.quarterShots && !gameStats.hadPerfectQuarter){
        gameStats.hadPerfectQuarter = true;
      }
      gameStats.quarterShots = 0;
      gameStats.quarterMakes = 0;
      quarter++;
      if(quarter > 4){
        endGame();
        return;
      }
      quarterTime = 60;
      hasBall = quarter % 2 === 1;
      resetPositions();
    }
  }

  // Player movement (keyboard + touch + gamepad)
  const speed = (playerStats.speed * 0.3 + 2) * (player.sprint ? 1.5 : 1) * DIFF_MULT[difficulty].aiSpeed;
  let moveDir = 0;
  if(keys['arrowleft']) moveDir -= 1;
  if(keys['arrowright']) moveDir += 1;
  if(touchJoystick.active) moveDir += touchJoystick.dx;
  const gpX = getGamepadAxis(0);
  if(Math.abs(gpX) > 0.1) moveDir += gpX;
  if(moveDir !== 0) player.facing = moveDir > 0 ? 1 : -1;
  player.x += moveDir * speed;
  player.x = Math.max(COURT_LEFT + 20, Math.min(COURT_RIGHT - 20, player.x));

  // Sprint
  if((keys['a'] || touchButtons.sprint || gamepadButtons[6]) && player.stamina > 0){
    player.sprint = true;
    player.stamina -= dt * 30;
  } else {
    player.sprint = false;
    player.stamina = Math.min(100, player.stamina + dt * 15);
  }

  // Player jump / shoot / block
  if(keys[' '] && player.grounded && state === 'playing'){
    // handled in keydown
  }
  // Gamepad shoot (A button = 0)
  if(isGamepadJustPressed(0)){
    doShootAction();
  }
  // Gamepad steal (B button = 1)
  if(isGamepadJustPressed(1)){
    keys['s'] = true;
    setTimeout(()=>{ keys['s'] = false; }, 100);
  }
  // Gamepad sprint (LB = 4)
  // Handled via gamepadButtons[6] above

  // Gravity
  if(!player.grounded){
    player.vy += 0.4;
    player.y += player.vy;
    if(player.y >= GROUND_Y){
      player.y = GROUND_Y;
      player.vy = 0;
      player.grounded = true;
      sfxBounce();
    }
  }

  // Ball follows owner
  if(!ball.inFlight){
    if(ball.owner === 'player'){
      ball.x = player.x + player.facing * 15;
      ball.y = player.y - 25;
    } else if(ball.owner === 'ai'){
      ball.x = ai.x + ai.facing * 15;
      ball.y = ai.y - 25;
    }
  }

  // Ball in flight
  if(ball.inFlight && shotAnim){
    shotAnim.t += dt * 2;
    if(shotAnim.t >= 1){
      const result = shotAnim.result;
      if(result === 'score'){
        handleScore(shotAnim.points);
      } else {
        handleMiss();
      }
      ball.inFlight = false;
      shotAnim = null;
    } else {
      const t = shotAnim.t;
      ball.x = shotAnim.startX + (shotAnim.endX - shotAnim.startX) * t;
      ball.y = shotAnim.startY + (shotAnim.endY - shotAnim.startY) * t - shotAnim.arcHeight * Math.sin(t * Math.PI);
    }
  }

  // Shot meter
  if(shotPhase === 'power'){
    powerValue += powerDir * powerSpeed * dt * 100;
    if(powerValue >= 100){ powerValue = 100; powerDir = -1; }
    if(powerValue <= 0){ powerValue = 0; powerDir = 1; }
    document.getElementById('power-fill').style.width = powerValue + '%';
    document.getElementById('power-marker').style.left = powerValue + '%';
  } else if(shotPhase === 'arc'){
    arcValue += arcDir * arcSpeed * dt * 100;
    if(arcValue >= 100){ arcValue = 100; arcDir = -1; }
    if(arcValue <= 0){ arcValue = 0; arcDir = 1; }
    document.getElementById('arc-fill').style.width = arcValue + '%';
    document.getElementById('arc-marker').style.left = arcValue + '%';
  }

  // AI behavior
  updateAI(dt);

  // Steal attempt
  if((keys['s'] || touchButtons.steal) && !hasBall){
    const dist = Math.abs(player.x - ai.x);
    if(dist < 40 && Math.random() < 0.03 + playerStats.power * 0.005){
      hasBall = true;
      sfxSteal();
      resetPositions();
    }
  }

  // Block attempt
  if(keys[' '] && !hasBall && !player.grounded){
    const dist = Math.abs(player.x - ball.x);
    if(ball.inFlight && shotAnim && dist < 50 && Math.random() < 0.02 + playerStats.defense * 0.008){
      sfxBlock();
      handleMiss(true);
      ball.inFlight = false;
      shotAnim = null;
      hasBall = true;
      resetPositions();
    }
  }

  // Particles
  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
    return p.life > 0;
  });

  checkAchievements();
  updateHUD();
}

// --- Free Throw System ---
function updateFreeThrow(dt){
  if(!freeThrowState) return;
  // Free throw uses simplified shot meter
  // Player presses space to set power, then again for accuracy
}

function startFreeThrow(shooter, attempts){
  freeThrowState = { shooter, attempts, made: 0, current: 0, phase: 'power', power: 0, powerDir: 1 };
  // Position shooter at free throw line
  if(shooter === 'player'){
    player.x = HOOP_LEFT + 180;
    player.y = GROUND_Y;
    player.facing = -1;
  } else {
    ai.x = HOOP_RIGHT - 180;
    ai.y = GROUND_Y;
    ai.facing = 1;
  }
  shotPhase = 'power';
  powerValue = 0; powerDir = 1;
  document.getElementById('shot-meter').classList.remove('hidden');
  document.getElementById('arc-bar-container').style.visibility = 'hidden';
  document.getElementById('shot-type-label').textContent = 'FREE THROW';
  powerSpeed = 1.8;
  state = 'shooting';
}

// --- AI ---
function updateAI(dt){
  const dm = DIFF_MULT[difficulty];

  if(!hasBall){
    // AI has ball
    ai.holdTimer++;

    // AI dribble moves
    ai.dribbleTimer = (ai.dribbleTimer || 0) + dt;
    if(ai.dribbleTimer > 1.5 + Math.random() * 2){
      ai.dribbleTimer = 0;
      // Cross-over, between legs, etc. (visual)
      ai.facing *= -1;
    }

    // Defensive positioning - check if player is close
    const distToPlayer = Math.abs(ai.x - player.x);
    if(distToPlayer < 60 && Math.random() < dm.foulRate * dt * 60){
      // AI commits foul!
      sfxFoul();
      aiFouls++;
      // Check if shooting foul
      const distToHoop = Math.abs(ai.x - HOOP_RIGHT);
      if(distToHoop < 80){
        // Shooting foul - free throws
        freeThrowState = null;
        startFreeThrow('player', 2);
        hasBall = true;
        return;
      }
    }

    // AI decision making
    const hoopX = HOOP_RIGHT;
    const distToHoop = Math.abs(ai.x - hoopX);
    const aiSpeedBase = (1.5 + (gameMode === 'tournament' ? tournamentRound * 0.3 : 0.5)) * dm.aiSpeed;

    // Drive to basket with varied shot selection
    if(ai.state === 'idle'){
      if(ai.holdTimer > 8 + Math.random() * 6){
        ai.state = Math.random() < 0.6 ? 'drive' : 'pullup';
        ai.driveTimer = 0;
      }
    }

    if(ai.state === 'drive'){
      ai.driveTimer += dt;
      // Drive toward basket
      const driveSpeed = aiSpeedBase * (0.8 + Math.random() * 0.4);
      if(distToHoop > 40){
        ai.x += (hoopX > ai.x ? 1 : -1) * driveSpeed;
        ai.facing = hoopX > ai.x ? 1 : -1;
        // Dribble past defender
        if(distToPlayer < 50){
          ai.x += (ai.x > player.x ? 1 : -1) * driveSpeed * 1.5;
        }
      } else {
        // Close enough - shoot or drive for dunk
        if(Math.random() < 0.3 && ai.grounded){
          aiShoot('layup');
        } else {
          aiShoot('midrange');
        }
        ai.state = 'idle';
        ai.holdTimer = 0;
      }
      // Timeout - pull up for shot
      if(ai.driveTimer > 4){
        aiShoot(distToHoop < 120 ? 'midrange' : 'three_pointer');
        ai.state = 'idle';
        ai.holdTimer = 0;
      }
    } else if(ai.state === 'pullup'){
      // Pull up jumper
      aiShoot(ai.x < THREE_PT_RIGHT ? 'three_pointer' : 'midrange');
      ai.state = 'idle';
      ai.holdTimer = 0;
    } else {
      // Idle - move toward hoop slowly
      if(distToHoop > 150){
        ai.x += (hoopX > ai.x ? 1 : -1) * aiSpeedBase * 0.5;
        ai.facing = hoopX > ai.x ? 1 : -1;
      }
    }
  } else {
    // AI defending
    const targetX = player.x - 40 * player.facing;
    ai.x += (targetX - ai.x) * 0.03 * dm.aiSpeed;
    // AI steal attempt
    if(Math.random() < dm.aiSteal * dm.aiSpeed){
      const dist = Math.abs(ai.x - player.x);
      if(dist < 40){
        hasBall = false;
        sfxSteal();
        resetPositions();
      }
    }
  }

  ai.x = Math.max(COURT_LEFT + 20, Math.min(COURT_RIGHT - 20, ai.x));
}

function aiShoot(type){
  const dm = DIFF_MULT[difficulty];
  if(!type) type = 'midrange';
  const dist = Math.abs(ai.x - HOOP_RIGHT);
  if(!type || type === 'auto'){
    if(dist < 40) type = 'layup';
    else if(ai.x < THREE_PT_RIGHT) type = 'three_pointer';
    else type = 'midrange';
  }

  const accuracy = dm.aiAccuracy + tournamentRound * 0.03 + (gameMode === 'quick' ? 0.05 : 0);
  const made = Math.random() < accuracy * (type === 'layup' ? 1.2 : type === 'three_pointer' ? 0.7 : 1);

  const hoopX = HOOP_RIGHT;
  const hoopY2 = HOOP_Y;

  shotAnim = {
    startX: ai.x, startY: ai.y - 25,
    endX: hoopX, endY: hoopY2,
    arcHeight: type === 'three_pointer' ? 120 : type === 'layup' ? 30 : 80,
    t: 0, result: made ? 'score' : 'miss',
    points: type === 'three_pointer' ? 3 : 2
  };

  ball.inFlight = true;
  ball.owner = null;
  hasBall = false;
  ai.holdTimer = 0;
  aiShotClock = dm.aiShotClock;
  sfxShoot();

  if(type === 'dunk' || type === 'layup') setTimeout(()=>{ if(shotAnim) sfxDunk(); }, 400);

  // Check foul on shot
  if(Math.random() < dm.foulRate && made){
    // And-one! Free throw after score
    setTimeout(()=>{
      if(state === 'playing'){
        addCoins(2);
        // Bonus free throw
      }
    }, 1200);
  }
}

// --- Player Shoot ---
function initShot(){
  if(!hasBall || ball.inFlight) return;

  // Check if in free throw mode
  if(freeThrowState){
    state = 'shooting';
    shotPhase = 'power';
    powerValue = 0; powerDir = 1;
    document.getElementById('shot-meter').classList.remove('hidden');
    document.getElementById('arc-bar-container').style.visibility = 'hidden';
    document.getElementById('shot-type-label').textContent = 'FREE THROW';
    powerSpeed = 1.8;
    return;
  }

  state = 'shooting';
  shotPhase = 'power';
  powerValue = 0;
  powerDir = 1;
  document.getElementById('shot-meter').classList.remove('hidden');
  document.getElementById('arc-bar-container').style.visibility = 'hidden';

  const distToLeft = Math.abs(player.x - HOOP_LEFT);
  const distToRight = Math.abs(player.x - HOOP_RIGHT);
  const hoopDist = Math.min(distToLeft, distToRight);

  if(player.x < THREE_PT_LEFT) shotType = 'three_pointer';
  else if(hoopDist < 40) shotType = player.grounded ? 'layup' : 'dunk';
  else shotType = 'midrange';

  document.getElementById('shot-type-label').textContent = shotType.replace('_', ' ').toUpperCase();
  powerSpeed = shotType === 'three_pointer' ? 2.5 : shotType === 'dunk' ? 1.5 : 2;
  arcSpeed = 2.5;
}

function confirmPower(){
  if(shotPhase !== 'power') return;

  if(freeThrowState){
    // Free throw - single meter, then confirm
    freeThrowState.power = powerValue;
    shotPhase = 'none';
    document.getElementById('shot-meter').classList.add('hidden');
    executeFreeThrow();
    return;
  }

  shotPhase = 'arc';
  arcValue = 0;
  arcDir = 1;
  document.getElementById('arc-bar-container').style.visibility = 'visible';
  sfxShoot();
}

function executeFreeThrow(){
  if(!freeThrowState) return;
  const diff = Math.abs(freeThrowState.power - 55);
  const accBonus = playerStats.accuracy * 2;
  const hitChance = Math.max(0.5, 1 - diff / 60) + accBonus / 100;
  const made = Math.random() < hitChance;

  const hoopX = freeThrowState.shooter === 'player' ? HOOP_LEFT : HOOP_RIGHT;
  shotAnim = {
    startX: player.x, startY: player.y - 25,
    endX: hoopX, endY: HOOP_Y,
    arcHeight: 60, t: 0,
    result: made ? 'score' : 'miss',
    points: 1, isFreeThrow: true
  };
  ball.inFlight = true;
  ball.owner = null;
  sfxShoot();
  state = 'playing';
  freeThrowState.current++;

  // Track for result
  shotAnim._ftState = freeThrowState;
}

function confirmArc(){
  if(shotPhase !== 'arc') return;
  shotPhase = 'none';
  document.getElementById('shot-meter').classList.add('hidden');

  const powerSweet = 50 + (shotType === 'dunk' ? 10 : 0);
  const arcSweet = 55;
  const powerDiff = Math.abs(powerValue - powerSweet);
  const arcDiff = Math.abs(arcValue - arcSweet);
  const accuracyBonus = playerStats.accuracy * 2;
  const totalDiff = powerDiff + arcDiff;
  const hitChance = Math.max(0.1, 1 - totalDiff / 80) + accuracyBonus / 100;

  const made = Math.random() < hitChance;

  const hoopX = HOOP_LEFT;
  const hoopY2 = HOOP_Y;

  let points = 2;
  if(shotType === 'three_pointer') points = 3;
  if(shotType === 'dunk') points = 2;

  const isSwish = powerDiff < 5 && arcDiff < 5;

  // Track stats
  gameStats.shotsTaken++;
  if(shotType === 'three_pointer' && made) gameStats.threesInGame++;
  gameStats.quarterShots++;
  if(made){
    gameStats.shotsMade++;
    gameStats.quarterMakes++;
    careerStats.totalThrees += (shotType === 'three_pointer' ? 1 : 0);
  }

  shotAnim = {
    startX: player.x, startY: player.y - 25,
    endX: hoopX, endY: hoopY2,
    arcHeight: shotType === 'three_pointer' ? 130 : shotType === 'layup' ? 25 : shotType === 'dunk' ? 40 : 80,
    t: 0, result: made ? 'score' : 'miss',
    points, isSwish, isDunk: shotType === 'dunk'
  };

  ball.inFlight = true;
  ball.owner = null;
  hasBall = false;
  state = 'playing';

  if(shotType === 'dunk') sfxDunk();
}

function handleScore(points){
  // Check if this is a free throw
  if(shotAnim && shotAnim.isFreeThrow && shotAnim._ftState){
    const ft = shotAnim._ftState;
    if(ft.shooter === 'player') playerScore += points;
    else aiScore += points;
    if(ft.current < ft.attempts){
      setTimeout(()=>startFreeThrow(ft.shooter, ft.attempts), 1000);
    } else {
      freeThrowState = null;
      setTimeout(()=>{ hasBall = ft.shooter !== 'player'; resetPositions(); }, 1000);
    }
    sfxScore();
    return;
  }

  playerScore += points;
  const coins = points;
  totalCoinsEarned += coins;
  addCoins(coins);
  spawnParticles(ball.x, ball.y, '#0ff', 20, 5);
  if(shotAnim && shotAnim.isSwish) sfxSwish();
  else sfxScore();
  hasBall = false;
  checkAchievements();
  setTimeout(()=>resetPositions(), 1000);
}

function handleScoreAI(points){
  aiScore += points;
  sfxScore();
  hasBall = true;
  resetPositions();
}

function handleMiss(blocked=false){
  // Check if free throw miss
  if(shotAnim && shotAnim.isFreeThrow && shotAnim._ftState){
    const ft = shotAnim._ftState;
    if(ft.current < ft.attempts){
      setTimeout(()=>startFreeThrow(ft.shooter, ft.attempts), 800);
    } else {
      freeThrowState = null;
      hasBall = ft.shooter === 'player';
      resetPositions();
    }
    if(!blocked) sfxMiss();
    return;
  }

  if(!blocked) sfxMiss();
  spawnParticles(ball.x, ball.y, '#f80', 8, 3);
  hasBall = false;
  setTimeout(()=>resetPositions(), 800);
}

// Fix aiShoot to use handleScoreAI
const _origAiShoot = aiShoot;
// Override score handling in shotAnim resolution
const _origBallFlight = null;

// Patch updateGame ball flight to handle AI scoring
const origUpdateGame = updateGame;
// We need to handle AI scores in the ball flight section - already done via handleScore/handleMiss
// But aiShoot creates shotAnim with result 'score' which goes to handleScore for player.
// We need to track who shot. Let's add a shooter field.

// Actually let me fix the ball-in-flight logic in updateGame to check shooter:
// The shotAnim already has the info. When AI shoots, ball.owner is set to null and hasBall is set to false.
// So when shotAnim resolves with 'score', it currently always calls handleScore (player score).
// We need to distinguish. Let me add a 'shooter' field to shotAnim.

// The cleanest fix is to override the ball-in-flight section. Since this is all in one IIFE,
// I'll restructure by checking if AI shot (when ai was the last shooter).

let lastShooter = 'player'; // Track who took the last shot

// --- End Game ---
function endGame(){
  state = 'results';
  const won = playerScore > aiScore;
  const gameCoins = won ? 50 : 0;
  const pointCoins = playerScore * 2;
  const total = gameCoins + pointCoins;
  addCoins(total);
  totalCoinsEarned += total;

  if(won) careerStats.gamesWon++;
  if(playerScore > careerStats.bestPoints) careerStats.bestPoints = playerScore;
  saveCareer();
  checkAchievements();

  document.getElementById('results-title').textContent = won ? 'Victory!' : 'Defeat';
  document.getElementById('results-title').style.color = won ? '#0f0' : '#f00';
  document.getElementById('results-details').innerHTML =
    `Final Score: <span>${playerScore} - ${aiScore}</span><br>Points scored: <span>${playerScore}</span> (+${pointCoins})<br>Game bonus: <span>${won ? '+50' : '+0'}</span><br>Fouls: <span>You:${playerFouls} CPU:${aiFouls}</span><br>Total coins: <span>${total}</span>`;
  document.getElementById('results-screen').classList.remove('hidden');
  document.getElementById('game-hud').classList.add('hidden');
  document.getElementById('controls-hint').classList.add('hidden');
  document.getElementById('shot-meter').classList.add('hidden');
  if(won) sfxScore();
}

// --- Draw ---
function draw(){
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);

  if(state === 'menu' || state === 'results' || state === 'ad') {
    const t = Date.now() / 1000;
    for(let i=0; i<3; i++){
      ctx.globalAlpha = 0.02;
      ctx.fillStyle = i%2===0 ? '#f80' : '#ff0';
      ctx.beginPath();
      ctx.arc(W/2 + Math.sin(t+i)*150, H/2 + Math.cos(t+i)*100, 100+i*40, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Show difficulty on menu
    if(state === 'menu'){
      ctx.fillStyle = '#888';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Difficulty: ' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1), W/2, H - 10);
    }
    return;
  }

  // Court background
  ctx.fillStyle = '#1a1208';
  ctx.fillRect(COURT_LEFT, COURT_Y, COURT_W, COURT_H);

  // Court lines
  ctx.strokeStyle = '#f808';
  ctx.lineWidth = 2;
  ctx.strokeRect(COURT_LEFT, COURT_Y, COURT_W, COURT_H);

  // Center line
  ctx.beginPath();
  ctx.moveTo(W/2, COURT_Y);
  ctx.lineTo(W/2, GROUND_Y);
  ctx.stroke();

  // Center circle
  ctx.beginPath();
  ctx.arc(W/2, COURT_Y + COURT_H/2, 40, 0, Math.PI*2);
  ctx.stroke();

  // Three point lines
  ctx.strokeStyle = '#f805';
  ctx.beginPath();
  ctx.moveTo(THREE_PT_LEFT, COURT_Y);
  ctx.lineTo(THREE_PT_LEFT, GROUND_Y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(THREE_PT_RIGHT, COURT_Y);
  ctx.lineTo(THREE_PT_RIGHT, GROUND_Y);
  ctx.stroke();

  // Free throw line
  ctx.strokeStyle = '#fff3';
  ctx.beginPath();
  ctx.moveTo(HOOP_LEFT + 150, COURT_Y);
  ctx.lineTo(HOOP_LEFT + 150, GROUND_Y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(HOOP_RIGHT - 150, COURT_Y);
  ctx.lineTo(HOOP_RIGHT - 150, GROUND_Y);
  ctx.stroke();

  // Hoops
  drawHoop(HOOP_LEFT, HOOP_Y, '#0ff');
  drawHoop(HOOP_RIGHT, HOOP_Y, '#f80');

  // Ground
  ctx.fillStyle = '#2a1a08';
  ctx.fillRect(COURT_LEFT, GROUND_Y, COURT_W, 10);
  ctx.fillStyle = '#f803';
  ctx.fillRect(COURT_LEFT, GROUND_Y, COURT_W, 1);

  // Player
  drawPlayer(player.x, player.y, '#0ff', player.facing, player.grounded, false);

  // AI
  drawPlayer(ai.x, ai.y, '#f80', ai.facing, ai.grounded, true);

  // Ball
  ctx.fillStyle = '#ff0';
  ctx.shadowColor = '#ff0';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 6, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Ball lines
  ctx.strokeStyle = '#aa08';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 6, 0, Math.PI*2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ball.x-6, ball.y);
  ctx.lineTo(ball.x+6, ball.y);
  ctx.stroke();

  // Shot trajectory preview
  if(shotPhase === 'power' || shotPhase === 'arc'){
    const hoopX = HOOP_LEFT;
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 25);
    ctx.lineTo(hoopX, HOOP_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Particles
  for(const p of particles){
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Score flash
  if(shotAnim && shotAnim.result === 'score' && shotAnim.t > 0.8){
    ctx.fillStyle = '#0ff';
    ctx.font = 'bold 30px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 1 - (shotAnim.t - 0.8) * 5;
    const pts = shotAnim.points;
    const shooter = shotAnim.shooter || 'player';
    if(shooter === 'ai'){
      ctx.fillStyle = '#f80';
      ctx.fillText(pts === 3 ? 'THREE!' : 'CPU SCORES!', W/2, H/2);
    } else {
      ctx.fillText(pts === 3 ? 'THREE!' : shotAnim.isDunk ? 'SLAM DUNK!' : shotAnim.isSwish ? 'SWISH!' : (shotAnim.isFreeThrow ? 'FREE THROW!' : 'SCORE!'), W/2, H/2);
    }
    ctx.globalAlpha = 1;
  }

  // Free throw indicator
  if(freeThrowState){
    ctx.fillStyle = '#ff0';
    ctx.font = '16px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`FREE THROW ${freeThrowState.current + 1}/${freeThrowState.attempts}`, W/2, COURT_Y - 10);
  }

  // Difficulty indicator
  ctx.fillStyle = '#666';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(difficulty.toUpperCase(), W - 10, H - 5);
}

function drawHoop(x, y, color){
  ctx.fillStyle = '#333';
  ctx.fillRect(x - 3, y - 20, 6, 30);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 12, y);
  ctx.lineTo(x + 12, y);
  ctx.stroke();
  ctx.strokeStyle = color + '40';
  ctx.beginPath();
  ctx.moveTo(x - 12, y);
  ctx.lineTo(x - 8, y + 15);
  ctx.moveTo(x + 12, y);
  ctx.lineTo(x + 8, y + 15);
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 15);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawPlayer(x, y, color, facing, grounded, isAI){
  ctx.fillStyle = '#0005';
  ctx.beginPath();
  ctx.ellipse(x, GROUND_Y + 3, 12, 4, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillRect(x - 8, y - 40, 16, 24);
  ctx.beginPath();
  ctx.arc(x, y - 46, 8, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = color;
  if(grounded){
    ctx.fillRect(x - 7, y - 16, 6, 16);
    ctx.fillRect(x + 1, y - 16, 6, 16);
  } else {
    ctx.fillRect(x - 10, y - 16, 6, 12);
    ctx.fillRect(x + 4, y - 20, 6, 12);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  if(!isAI && hasBall){
    ctx.beginPath();
    ctx.moveTo(x + facing * 6, y - 36);
    ctx.lineTo(x + facing * 20, y - 28);
    ctx.stroke();
  } else if(isAI && !hasBall){
    ctx.beginPath();
    ctx.moveTo(x + facing * 6, y - 36);
    ctx.lineTo(x + facing * 20, y - 28);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 36);
    ctx.lineTo(x - 12, y - 24);
    ctx.moveTo(x + 6, y - 36);
    ctx.lineTo(x + 12, y - 24);
    ctx.stroke();
  }
  ctx.lineWidth = 1;

  ctx.fillStyle = '#fff';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(isAI ? 'CPU' : 'YOU', x, y - 56);
}

function spawnParticles(x, y, color, count, spread){
  for(let i=0; i<count; i++){
    particles.push({
      x, y, vx:(Math.random()-0.5)*spread*2, vy:(Math.random()-0.5)*spread*2 - 2,
      life:25+Math.random()*20, maxLife:45, color, size:2+Math.random()*3
    });
  }
}

// --- HUD ---
function updateHUD(){
  document.getElementById('hud-score-p').textContent = `You: ${playerScore}`;
  document.getElementById('hud-score-a').textContent = `CPU: ${aiScore}`;
  document.getElementById('hud-quarter').textContent = `Q${quarter}: ${quarterTime}`;
  document.getElementById('hud-shot-clock').textContent = hasBall ? `Shot: ${shotClock}` : `AI: ${aiShotClock}`;
  document.getElementById('hud-ball').textContent = hasBall ? '● YOUR BALL' : '○ CPU BALL';
  document.getElementById('hud-ball').style.color = hasBall ? '#ff0' : '#f80';
  document.getElementById('hud-stamina').textContent = `Stamina: ${Math.floor(player.stamina)}`;
}

// --- Input ---
document.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if(key === ' '){
    e.preventDefault();
    doShootAction();
  }
});
document.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

// --- Menu ---
document.getElementById('btn-tournament').onclick = ()=>{
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  document.getElementById('difficulty-screen').classList.remove('hidden');
  document.getElementById('difficulty-screen').style.display = 'flex';
  pendingMode = 'tournament';
};

document.getElementById('btn-quick-play').onclick = ()=>{
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  document.getElementById('difficulty-screen').classList.remove('hidden');
  document.getElementById('difficulty-screen').style.display = 'flex';
  pendingMode = 'quick';
};

let pendingMode = 'tournament';

document.getElementById('btn-rookie').onclick = ()=>{
  difficulty = 'rookie';
  document.getElementById('difficulty-screen').style.display = 'none';
  document.getElementById('difficulty-screen').classList.add('hidden');
  gameMode = pendingMode;
  tournamentRound = 0;
  startGame();
};
document.getElementById('btn-allstar').onclick = ()=>{
  difficulty = 'allstar';
  document.getElementById('difficulty-screen').style.display = 'none';
  document.getElementById('difficulty-screen').classList.add('hidden');
  gameMode = pendingMode;
  tournamentRound = 0;
  startGame();
};
document.getElementById('btn-halloffame').onclick = ()=>{
  difficulty = 'halloffame';
  document.getElementById('difficulty-screen').style.display = 'none';
  document.getElementById('difficulty-screen').classList.add('hidden');
  gameMode = pendingMode;
  tournamentRound = 0;
  startGame();
};

document.getElementById('btn-upgrades').onclick = ()=>{
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  openUpgrades();
};

document.getElementById('btn-upgrades-close').onclick = ()=>{
  document.getElementById('upgrades-screen').classList.add('hidden');
};

document.getElementById('btn-results-continue').onclick = ()=>{
  document.getElementById('results-screen').classList.add('hidden');

  if(gameMode === 'tournament'){
    const won = playerScore > aiScore;
    if(won){
      tournamentRound++;
      if(tournamentRound >= 5){
        addCoins(200);
        totalCoinsEarned += 200;
        careerStats.tournamentWins++;
        saveCareer();
        checkAchievements();
        state = 'menu';
        document.getElementById('menu-screen').classList.remove('hidden');
        tournamentRound = 0;
        return;
      }
      showAd(()=>{
        UPGRADES.forEach(u => { playerStats[u.key] = Math.min(u.max, (playerStats[u.key] || 0) + 5); });
        saveStats();
        startGame();
      });
      return;
    }
  }
  state = 'menu';
  document.getElementById('menu-screen').classList.remove('hidden');
};

// --- Ad ---
function showAd(callback){
  state = 'ad';
  document.getElementById('ad-overlay').classList.remove('hidden');
  document.getElementById('btn-ad-skip').style.display = '';
  document.getElementById('btn-ad-reward').style.display = 'none';
  let timer = 5;
  document.getElementById('ad-timer').textContent = timer;
  const iv = setInterval(()=>{
    timer--;
    document.getElementById('ad-timer').textContent = timer;
    if(timer <= 0){
      clearInterval(iv);
      document.getElementById('btn-ad-skip').style.display = 'none';
      document.getElementById('btn-ad-reward').style.display = '';
    }
  }, 1000);
  window._adCallback = callback;
}

document.getElementById('btn-ad-skip').onclick = ()=>{};
document.getElementById('btn-ad-reward').onclick = ()=>{
  document.getElementById('ad-overlay').classList.add('hidden');
  if(window._adCallback) window._adCallback();
};

// --- Game Loop ---
function gameLoop(time){
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  // Handle ball-in-flight scoring with shooter awareness
  if(ball.inFlight && shotAnim && shotAnim.t !== undefined){
    // Already handled in updateGame
  }

  updateGame(dt);
  draw();

  // Handle AI shot result scoring separately
  if(ball.inFlight && shotAnim && shotAnim.t >= 1){
    // This is handled inside updateGame already
  }

  requestAnimationFrame(gameLoop);
}

// Override the ball-in-flight section to handle AI vs Player scoring
// We patch by wrapping the original updateGame
const _origUpdate = updateGame;
// Actually, let me just fix the handleScore to check lastShooter

// We need to set lastShooter when aiShoot is called and when player shoots
const _origAiShootFn = aiShoot;
// Monkey-patch: set lastShooter in aiShoot
// Actually the simplest approach: modify the ball-in-flight handler in updateGame
// Since we wrote the code above, let me just add a shooter field to shotAnim

// Patch: wrap aiShoot to add shooter field
const __origAiShoot = aiShoot;
aiShoot = function(type){
  __origAiShoot(type);
  if(shotAnim) shotAnim.shooter = 'ai';
};

// Patch: wrap confirmArc to add shooter field
const __origConfirmArc = confirmArc;
confirmArc = function(){
  __origConfirmArc();
  if(shotAnim && !shotAnim.isFreeThrow) shotAnim.shooter = 'player';
};

// Patch: wrap executeFreeThrow
const __origExecFT = executeFreeThrow;
executeFreeThrow = function(){
  __origExecFT();
  if(shotAnim) shotAnim.shooter = freeThrowState ? freeThrowState.shooter : 'player';
};

// Now patch handleScore to check shooter
const __origHandleScore = handleScore;
handleScore = function(points){
  if(shotAnim && shotAnim.shooter === 'ai'){
    handleScoreAI(points);
    return;
  }
  __origHandleScore(points);
};

const __origHandleMiss = handleMiss;
handleMiss = function(blocked){
  // AI misses go to normal miss handling (same behavior)
  __origHandleMiss(blocked);
};

// --- Init ---
document.getElementById('coinDisplay').textContent = getCoins();
setupTouchControls();
setupGamepad();
requestAnimationFrame(gameLoop);

})();
