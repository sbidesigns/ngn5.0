// ============================================================
// NGN4 GAME 8: STREET NEON - Beat 'em Up
// ============================================================
(function(){
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('street-neon'); } catch(e) {}


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const GROUND_Y = H - 80;

// --- Audio ---
let audioCtx = null;
function getAudioCtx() { if (!audioCtx) try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} return audioCtx; }
function playTone(freq, dur, type='square', vol=0.12){
  if (!getAudioCtx()) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}
function sfxPunch(){ playTone(150, 0.1, 'sawtooth', 0.2); playTone(80, 0.08, 'square', 0.15); }
function sfxKick(){ playTone(100, 0.15, 'sawtooth', 0.25); }
function sfxJump(){ playTone(300, 0.1, 'sine', 0.1); playTone(500, 0.1, 'sine', 0.08); }
function sfxSpecial(){ playTone(200, 0.3, 'sawtooth', 0.2); playTone(400, 0.2, 'sine', 0.15); }
function sfxPickup(){ playTone(600, 0.1); playTone(800, 0.15); }
function sfxHit(){ playTone(200, 0.15, 'sawtooth', 0.2); }
function sfxKO(){ playTone(100, 0.3, 'sawtooth', 0.2); playTone(60, 0.4, 'square', 0.15); }
function sfxStageClear(){ [400,500,600,800,1000].forEach((f,i)=>setTimeout(()=>playTone(f,0.2,'sine',0.12), i*100)); }
function sfxBlock(){ playTone(400, 0.1, 'triangle', 0.15); }
function sfxGrab(){ playTone(180, 0.15, 'sawtooth', 0.15); }
function sfxThrow(){ playTone(250, 0.2, 'square', 0.2); playTone(350, 0.1, 'sine', 0.15); }
function sfxAchievement(){ playTone(523, 0.15, 'sine', 0.1); setTimeout(()=>playTone(659, 0.15, 'sine', 0.1), 100); setTimeout(()=>playTone(784, 0.2, 'sine', 0.12), 200); }

// --- Rewards ---
function getCoins(){
  return JSON.parse(localStorage.getItem('ngn4_rewards') || '{}').coins || 0;
}
function addCoins(n){
  const r = JSON.parse(localStorage.getItem('ngn4_rewards') || '{}');
  r.coins = (r.coins || 0) + n;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
  updateCoinDisplays();
}
function updateCoinDisplays(){
  document.getElementById('coinDisplay').textContent = getCoins();
}

// --- Achievement System ---
let careerData = JSON.parse(localStorage.getItem('ngn4_sn_career') || 'null') || {
  maxCombo: 0, stagesCleared: 0, noDamageBoss: false, charsPlayed: [],
  unlocked: []
};
function saveCareer(){ localStorage.setItem('ngn4_sn_career', JSON.stringify(careerData)); }

function unlockAch(id, name, desc){
  if(careerData.unlocked.includes(id)) return;
  careerData.unlocked.push(id);
  saveCareer();
  sfxAchievement();
  addCoins(25);
  const popup = document.getElementById('achievement-popup');
  if(popup){
    popup.innerHTML = `<div style="font-size:18px;color:#f0f">🏆 Achievement!</div><div style="color:#0ff;font-weight:bold">${name}</div><div style="color:#aaa;font-size:12px">${desc}</div>`;
    popup.classList.remove('hidden');
    popup.style.top = '60px';
    setTimeout(()=>{ popup.style.top = '-80px'; }, 3500);
    setTimeout(()=>{ popup.classList.add('hidden'); }, 4000);
  }
}

function checkAchievements(){
  if(!careerData.unlocked.includes('combo_master') && careerData.maxCombo >= 20){
    unlockAch('combo_master', 'Combo Master', 'Land a 20+ hit combo');
  }
  if(!careerData.unlocked.includes('stage_clear_all') && careerData.stagesCleared >= STAGES.length){
    unlockAch('stage_clear_all', 'Stage Clear All', 'Clear all stages');
  }
  if(!careerData.unlocked.includes('no_damage_boss') && careerData.noDamageBoss){
    unlockAch('no_damage_boss', 'No Damage Boss', 'Beat a boss without taking damage');
  }
  if(!careerData.unlocked.includes('all_chars') && careerData.charsPlayed.length >= 3){
    unlockAch('all_chars', 'All Characters Played', 'Play as all 3 characters');
  }
}

// --- Weapon Definitions ---
const WEAPONS = {
  none:   { name:'Fists',   atkMult: 1.0, range: 40, color: null,     speed: 1.0 },
  pipe:   { name:'Pipe',   atkMult: 1.5, range: 55, color: '#888',   speed: 0.9 },
  knife:  { name:'Knife',  atkMult: 1.8, range: 45, color: '#ccc',   speed: 1.3 },
  sword:  { name:'Sword',  atkMult: 2.2, range: 65, color: '#ff0',   speed: 0.8 }
};

// --- Character Definitions ---
const CHAR_DEFS = {
  brawler: { name:'Brawler', hp:150, maxHp:150, atk:15, def:3, speed:2.5, jumpPow:10, color:'#f80', special:'Ground Pound' },
  ninja:   { name:'Ninja',   hp:80,  maxHp:80,  atk:8,  def:1, speed:5,   jumpPow:14, color:'#0f0', special:'Shadow Strike' },
  tech:    { name:'Tech',    hp:110, maxHp:110, atk:12, def:2, speed:3.5, jumpPow:11, color:'#0ff', special:'EMP Blast' }
};

// --- Enemy Definitions ---
const ENEMY_DEFS = {
  grunt:  { name:'Grunt',  hp:30,  atk:5,  speed:1.5, color:'#f55', size:16, score:10, coins:5 },
  heavy:  { name:'Heavy',  hp:80,  atk:10, speed:0.8, color:'#fa0', size:22, score:25, coins:10 },
  rusher: { name:'Rusher', hp:20,  atk:7,  speed:3.5, color:'#ff0', size:14, score:15, coins:7 },
  boss:   { name:'Boss',   hp:200, atk:15, speed:1.2, color:'#f0f', size:30, score:100, coins:50 }
};

// --- Stage Definitions ---
const STAGES = [
  { name:'Neon Alley',   bg:'#0a0a18', enemies:[{type:'grunt',count:5},{type:'heavy',count:1}], boss:{type:'boss',name:'Razor'} },
  { name:'Data District', bg:'#0a120a', enemies:[{type:'grunt',count:6},{type:'rusher',count:3},{type:'heavy',count:2}], boss:{type:'boss',name:'Cipher'} },
  { name:'Synth Street',  bg:'#120a0a', enemies:[{type:'grunt',count:8},{type:'rusher',count:4},{type:'heavy',count:3}], boss:{type:'boss',name:'Voltage'} },
  { name:'Hacker Highway',bg:'#0a0a20', enemies:[{type:'grunt',count:10},{type:'rusher',count:5},{type:'heavy',count:4}], boss:{type:'boss',name:'Glitch'} },
  { name:'Neon Core',     bg:'#150a1a', enemies:[{type:'grunt',count:12},{type:'rusher',count:6},{type:'heavy',count:5},{type:'rusher',count:8}], boss:{type:'boss',name:'Neon King'} },
  { name:'Syndicate HQ',  bg:'#1a0a0a', enemies:[{type:'heavy',count:8},{type:'rusher',count:10}], boss:{type:'boss',name:'The Syndicate'} }
];

// --- State ---
let state = 'menu';
let selectedChar = 'brawler';
let player = null;
let enemies = [];
let pickups = [];
let particles = [];
let camera = { x: 0 };
let currentStage = 0;
let stagePhase = 'intro';
let stageTimer = 0;
let totalScore = 0;
let totalCoins = 0;
let maxComboThisRun = 0;
let combo = 0;
let comboTimer = 0;
let keys = {};
let attackCooldown = 0;
let specialCooldown = 0;
let stageScrollSpeed = 0.5;
let bossTookDamage = false; // Track if boss dealt damage to player for achievement

// Touch controls
let touchKeys = {};

// Gamepad
let gamepadIndex = null;
let gpButtons = {};
let prevGPButtons = {};

// --- Touch Setup ---
function setupTouchControls(){
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
  if(isMobile){
    document.getElementById('touch-controls').style.display = 'block';
  }

  ['tb-left','tb-right','tb-up','tb-down'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    const k = id.replace('tb-','');
    el.addEventListener('touchstart', e => { e.preventDefault(); touchKeys[k] = true; }, {passive:false});
    el.addEventListener('touchend', e => { e.preventDefault(); touchKeys[k] = false; });
  });

  const tbPunch = document.getElementById('tb-punch');
  const tbKick = document.getElementById('tb-kick');
  const tbSpecial = document.getElementById('tb-special');

  if(tbPunch){
    tbPunch.addEventListener('touchstart', e => { e.preventDefault(); touchKeys['z'] = true; }, {passive:false});
    tbPunch.addEventListener('touchend', e => { e.preventDefault(); touchKeys['z'] = false; });
  }
  if(tbKick){
    tbKick.addEventListener('touchstart', e => { e.preventDefault(); touchKeys['x'] = true; }, {passive:false});
    tbKick.addEventListener('touchend', e => { e.preventDefault(); touchKeys['x'] = false; });
  }
  if(tbSpecial){
    tbSpecial.addEventListener('touchstart', e => { e.preventDefault(); touchKeys['c'] = true; }, {passive:false});
    tbSpecial.addEventListener('touchend', e => { e.preventDefault(); touchKeys['c'] = false; });
  }
}

// --- Gamepad Setup ---
function setupGamepad(){
  window.addEventListener('gamepadconnected', e => { gamepadIndex = e.gamepad.index; });
  window.addEventListener('gamepaddisconnected', e => { if(e.gamepad.index === gamepadIndex) gamepadIndex = null; });
  setInterval(()=>{
    if(gamepadIndex === null){
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      for(let i=0;i<gps.length;i++){ if(gps[i]){gamepadIndex=i;break;} }
    }
    if(gamepadIndex === null) return;
    const gp = navigator.getGamepads()[gamepadIndex];
    if(!gp) return;
    prevGPButtons = {...gpButtons};
    for(let i=0;i<gp.buttons.length;i++) gpButtons[i] = gp.buttons[i].pressed || gp.buttons[i].value > 0.5;
  }, 16);
}

function gpJustPressed(b){ return gpButtons[b] && !prevGPButtons[b]; }
function gpAxis(i){
  if(gamepadIndex===null) return 0;
  const gp = navigator.getGamepads()[gamepadIndex];
  if(!gp||!gp.axes[i]) return 0;
  return Math.abs(gp.axes[i]) < 0.15 ? 0 : gp.axes[i];
}

// --- Player ---
function createPlayer(charType){
  const def = CHAR_DEFS[charType];
  return {
    ...def, charType, x: 100, y: GROUND_Y, vy: 0,
    w: 24, h: 48, facing: 1, grounded: true,
    attacking: false, attackFrame: 0, attackType: 0,
    specialMeter: 0, maxSpecial: 100,
    invincible: 0, animFrame: 0, hitFlash: 0,
    comboChain: 0, comboTimer: 0,
    blocking: false,
    weapon: 'none', // none, pipe, knife, sword
    grabbing: null, // enemy being grabbed
    throwTimer: 0
  };
}

// --- Enemy ---
function createEnemy(type, x, bossName){
  const def = ENEMY_DEFS[type];
  const stageMult = 1 + currentStage * 0.3;
  return {
    ...def, type, x, y: GROUND_Y, vy: 0,
    hp: Math.floor(def.hp * stageMult),
    maxHp: Math.floor(def.hp * stageMult),
    atk: Math.floor(def.atk * stageMult),
    grounded: true, facing: -1,
    name: bossName || def.name,
    state: 'idle',
    stateTimer: 0, attackFrame: 0,
    aiTimer: 0, hitFlash: 0,
    // Improved AI state
    blocking: false,
    flankDir: Math.random() < 0.5 ? 1 : -1,
    aiRole: type === 'boss' ? 'boss' : (Math.random() < 0.3 ? 'flanker' : 'standard'),
    engageDelay: Math.random() * 60 // Staggered engagement
  };
}

// --- Particles ---
function spawnParticles(x, y, color, count=8, spread=4){
  for(let i=0; i<count; i++){
    particles.push({
      x, y, vx:(Math.random()-0.5)*spread*2, vy:(Math.random()-0.5)*spread*2 - 2,
      life:20+Math.random()*20, maxLife:40, color, size:2+Math.random()*3
    });
  }
}

function spawnText(x, y, text, color='#ff0'){
  particles.push({
    x, y, vx:0, vy:-2, life:40, maxLife:40, color, size:0, text
  });
}

// --- Stage Init ---
function initStage(stageIdx){
  const stage = STAGES[stageIdx];
  enemies = [];
  pickups = [];
  particles = [];
  combo = 0;
  comboTimer = 0;
  camera.x = 0;
  stagePhase = 'intro';
  stageTimer = 120;
  player.x = 100;
  player.y = GROUND_Y;
  player.vy = 0;
  player.grounded = true;
  player.attacking = false;
  player.facing = 1;
  player.grabbing = null;
  bossTookDamage = false;

  document.getElementById('hud-stage').textContent = `Stage ${stageIdx+1}: ${stage.name}`;
}

function spawnWaveEnemies(){
  const stage = STAGES[currentStage];
  for(const group of stage.enemies){
    for(let i=0; i<group.count; i++){
      const ex = W + 100 + Math.random() * 400 + i * 60;
      enemies.push(createEnemy(group.type, ex));
    }
  }
}

function spawnBoss(){
  const stage = STAGES[currentStage];
  const boss = createEnemy('boss', W + 200, stage.boss.name);
  boss.hp = Math.floor(boss.hp * 1.5);
  boss.maxHp = boss.hp;
  boss.atk = Math.floor(boss.atk * 1.5);
  boss.color = '#f0f';
  enemies.push(boss);
}

// --- Stage Grade ---
function calcGrade(){
  let grade = 'D';
  const hpPct = player.hp / player.maxHp;
  const score = totalScore;
  if(hpPct > 0.8 && score > 500 && combo >= 10) grade = 'S';
  else if(hpPct > 0.6 && score > 300) grade = 'A';
  else if(hpPct > 0.4 && score > 150) grade = 'B';
  else if(hpPct > 0.2) grade = 'C';
  const colors = {S:'#ff0',A:'#0f0',B:'#0ff',C:'#f80',D:'#f00'};
  return { grade, color: colors[grade] };
}

// --- Update ---
function updateGame(){
  if(state !== 'playing') return;

  if(stagePhase === 'intro'){
    stageTimer--;
    if(stageTimer <= 0){
      stagePhase = 'fighting';
      spawnWaveEnemies();
    }
    return;
  }

  camera.x += stageScrollSpeed;

  // Player movement
  let moveX = 0;
  if(keys['arrowleft'] || touchKeys['left']) moveX -= player.speed;
  if(keys['arrowright'] || touchKeys['right']) moveX += player.speed;
  const gpX = gpAxis(0);
  if(Math.abs(gpX) > 0.1) moveX += gpX * player.speed * 2;

  if(moveX !== 0) player.facing = moveX > 0 ? 1 : -1;
  player.x = Math.max(20, Math.min(W - 20, player.x + moveX));
  if(moveX !== 0) player.animFrame += 0.15;

  // Blocking (hold back direction while enemy nearby)
  player.blocking = false;
  const nearEnemy = enemies.some(e => e.state !== 'dead' && Math.abs(e.x - player.x) < 60);
  if(nearEnemy && (keys['arrowleft'] && player.facing === 1 || keys['arrowright'] && player.facing === -1)){
    player.blocking = true;
  }
  if(nearEnemy && gpButtons[6]){ // LT on gamepad
    player.blocking = true;
  }

  // Jump
  if((keys['x'] || keys['arrowup'] || touchKeys['up'] || gpJustPressed(0)) && player.grounded){
    player.vy = -player.jumpPow;
    player.grounded = false;
    sfxJump();
  }

  // Gravity
  if(!player.grounded){
    player.vy += 0.5;
    player.y += player.vy;
    if(player.y >= GROUND_Y){
      player.y = GROUND_Y;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // Grab/Throw mechanic (V key or gamepad B)
  const grabKey = keys['v'] || gpJustPressed(1);
  if(grabKey && !player.grabbing && !player.attacking){
    // Try to grab nearby enemy
    for(const e of enemies){
      if(e.state === 'dead') continue;
      if(Math.abs(e.x - player.x) < 45 && Math.abs(e.y - player.y) < 30){
        player.grabbing = e;
        e.state = 'grabbed';
        sfxGrab();
        break;
      }
    }
  }
  if(grabKey && player.grabbing){
    // Throw grabbed enemy
    const e = player.grabbing;
    e.state = 'hurt';
    e.stateTimer = 20;
    e.x += player.facing * 120;
    e.vy = -8;
    e.hp -= player.atk * 2;
    spawnParticles(e.x, e.y - 20, e.color, 10, 5);
    sfxThrow();
    // Damage other enemies it hits
    for(const other of enemies){
      if(other === e || other.state === 'dead') continue;
      if(Math.abs(other.x - e.x) < 50){
        other.hp -= player.atk;
        other.hitFlash = 10;
        other.state = 'hurt';
        other.stateTimer = 15;
        spawnText(other.x, other.y - 40, `-${player.atk}`, '#ff0');
      }
    }
    if(e.hp <= 0){
      e.state = 'dead'; e.stateTimer = 30;
      totalScore += e.score * 2;
      totalCoins += e.coins * 2;
      addCoins(e.coins * 2);
      spawnText(e.x, e.y - 50, `THROW! +${e.coins*2}`, '#f0f');
      sfxKO();
    }
    player.grabbing = null;
  }

  // Attack (Z key or gamepad X)
  if(attackCooldown > 0) attackCooldown--;
  if((keys['z'] || touchKeys['z'] || gpJustPressed(2)) && attackCooldown <= 0 && !player.attacking && !player.grabbing){
    player.attacking = true;
    const weaponDef = WEAPONS[player.weapon];
    player.attackFrame = Math.floor(12 * weaponDef.speed);
    player.comboChain = (player.comboChain + 1) % 4;
    attackCooldown = Math.floor(10 / weaponDef.speed);
    sfxPunch();

    const atkRange = player.charType === 'tech' ? 60 : weaponDef.range;
    const atkX = player.x + player.facing * 25;
    const dmg = Math.floor(player.atk * weaponDef.atkMult) + player.comboChain * 3;

    for(const e of enemies){
      if(e.state === 'dead') continue;
      const dx = Math.abs(e.x - atkX);
      const dy = Math.abs(e.y - player.y);
      if(dx < atkRange && dy < 30){
        // Check if enemy is blocking
        if(e.blocking){
          spawnText(e.x, e.y - 40, 'BLOCKED', '#888');
          sfxBlock();
          continue;
        }
        e.hp -= dmg;
        e.hitFlash = 8;
        e.state = 'hurt';
        e.stateTimer = 10;
        e.x += player.facing * 15;
        sfxHit();
        spawnParticles(e.x, e.y - 20, e.color, 6);
        spawnText(e.x, e.y - 40, `-${dmg}`, '#ff0');

        combo++;
        comboTimer = 90;
        if(combo > maxComboThisRun) maxComboThisRun = combo;
        if(combo > careerData.maxCombo) careerData.maxCombo = combo;
        player.specialMeter = Math.min(player.maxSpecial, player.specialMeter + 5);

        if(e.hp <= 0){
          e.state = 'dead'; e.stateTimer = 30;
          totalScore += e.score * (1 + Math.floor(combo/5));
          const coinAmt = e.coins + (combo > 5 ? 5 : 0);
          totalCoins += coinAmt;
          addCoins(coinAmt);
          spawnText(e.x, e.y - 50, `+${coinAmt}`, '#ff0');
          sfxKO();

          if(combo >= 10 && combo % 10 === 0){
            const bonus = 20;
            totalCoins += bonus;
            addCoins(bonus);
            spawnText(player.x, player.y - 60, `COMBO x${combo}! +${bonus}`, '#f0f');
            sfxSpecial();
          }

          // Drop weapon or health
          if(Math.random() < 0.25){
            const weaponDrop = ['pipe','knife','sword'][Math.floor(Math.random()*3)];
            pickups.push({ x: e.x, y: GROUND_Y, type: 'weapon', weapon: weaponDrop, timer: 300 });
          } else if(Math.random() < 0.4){
            pickups.push({ x: e.x, y: GROUND_Y, type: Math.random() < 0.7 ? 'health' : 'special', timer: 300 });
          }
        }
      }
    }
  }

  if(player.attacking){
    player.attackFrame--;
    if(player.attackFrame <= 0) player.attacking = false;
  }

  // Special (C key or gamepad Y)
  if((keys['c'] || touchKeys['c'] || gpJustPressed(3)) && player.specialMeter >= player.maxSpecial && specialCooldown <= 0){
    specialCooldown = 60;
    player.specialMeter = 0;
    sfxSpecial();

    if(player.charType === 'brawler'){
      for(const e of enemies){
        if(e.state === 'dead') continue;
        if(Math.abs(e.x - player.x) < 80 && Math.abs(e.y - player.y) < 50){
          e.hp -= player.atk * 3;
          e.hitFlash = 12; e.state = 'hurt'; e.stateTimer = 15;
          spawnParticles(e.x, e.y - 20, '#f80', 12, 6);
          if(e.hp <= 0){ e.state = 'dead'; e.stateTimer = 30; totalScore += e.score; totalCoins += e.coins; addCoins(e.coins); }
        }
      }
      spawnParticles(player.x, player.y - 20, '#f80', 20, 8);
    } else if(player.charType === 'ninja'){
      const dashDist = 200;
      const startX = player.x;
      for(const e of enemies){
        if(e.state === 'dead') continue;
        if((e.x > startX && e.x < startX + dashDist * player.facing) || (e.x < startX && e.x > startX + dashDist * player.facing)){
          e.hp -= player.atk * 4; e.hitFlash = 12; e.state = 'hurt';
          spawnParticles(e.x, e.y - 20, '#0f0', 10, 5);
          if(e.hp <= 0){ e.state = 'dead'; e.stateTimer = 30; totalScore += e.score; totalCoins += e.coins; addCoins(e.coins); }
        }
      }
      player.x += player.facing * dashDist * 0.5;
      player.x = Math.max(20, Math.min(W-20, player.x));
      spawnParticles(startX, player.y - 20, '#0f0', 25, 4);
    } else {
      for(const e of enemies){
        if(e.state === 'dead') continue;
        e.hp -= player.atk * 2; e.hitFlash = 12; e.state = 'hurt'; e.stateTimer = 15;
        spawnParticles(e.x, e.y - 20, '#0ff', 8, 4);
        if(e.hp <= 0){ e.state = 'dead'; e.stateTimer = 30; totalScore += e.score; totalCoins += e.coins; addCoins(e.coins); }
      }
      spawnParticles(player.x, player.y - 20, '#0ff', 30, 10);
    }
  }
  if(specialCooldown > 0) specialCooldown--;

  if(player.invincible > 0) player.invincible--;
  if(player.hitFlash > 0) player.hitFlash--;

  if(comboTimer > 0){
    comboTimer--;
    if(comboTimer <= 0) combo = 0;
  }

  // Update grabbed enemy position
  if(player.grabbing){
    player.grabbing.x = player.x + player.facing * 35;
  }

  // Update enemies with IMPROVED AI
  for(const e of enemies){
    if(e.state === 'dead'){ e.stateTimer--; continue; }
    if(e.state === 'grabbed'){ e.x = player.x + player.facing * 35; e.y = GROUND_Y; continue; }
    e.hitFlash = Math.max(0, e.hitFlash - 1);

    if(e.state === 'hurt'){
      e.stateTimer--;
      if(e.stateTimer <= 0) e.state = 'idle';
      continue;
    }

    // Staggered engagement
    if(e.engageDelay > 0){ e.engageDelay--; continue; }

    const dx = player.x - e.x;
    const dist = Math.abs(dx);
    e.facing = dx > 0 ? 1 : -1;

    // Improved AI: flanking, blocking, group tactics
    if(e.aiRole === 'flanker'){
      // Try to approach from behind/side
      const flankTarget = player.x + e.flankDir * 80;
      if(Math.abs(e.x - flankTarget) > 20){
        e.x += (flankTarget > e.x ? 1 : -1) * e.speed;
      }
      // When in position, rush in
      if(Math.abs(e.x - flankTarget) < 30 && dist < 100){
        e.x += e.facing * e.speed * 1.5;
      }
    }

    // Blocking AI (heavier enemies block sometimes)
    if((e.type === 'heavy' || e.type === 'boss') && dist < 50 && player.attacking && Math.random() < 0.4){
      e.blocking = true;
    } else {
      e.blocking = false;
    }

    // Group tactics: not all rush at once
    const nearbyAllies = enemies.filter(o => o !== e && o.state !== 'dead' && Math.abs(o.x - e.x) < 80).length;
    const tooCrowded = nearbyAllies >= 2 && dist < 60;

    if(dist < 40 && e.grounded && !tooCrowded){
      e.stateTimer--;
      if(e.stateTimer <= 0){
        e.state = 'attack';
        e.attackFrame = 15;
        e.stateTimer = 30 + Math.random() * 20;
        sfxPunch();
      }
    } else if(dist < 250 && !tooCrowded){
      if(e.aiRole !== 'flanker' || dist > 60){
        e.x += e.facing * e.speed;
      }
      e.animFrame = (e.animFrame || 0) + 0.1;
      e.state = 'approach';
    } else if(tooCrowded && dist > 80){
      // Wait for allies to move
      e.state = 'idle';
    } else {
      e.state = 'idle';
    }

    // Attack damage
    if(e.state === 'attack' && e.attackFrame === 10){
      if(player.invincible <= 0 && dist < 50){
        let dmg = Math.max(1, e.atk - player.def);
        // Blocking reduces damage by 70%
        if(player.blocking){
          dmg = Math.floor(dmg * 0.3);
          spawnText(player.x, player.y - 50, 'BLOCKED', '#0ff');
          sfxBlock();
        } else {
          player.hp -= dmg;
          player.hitFlash = 10;
          player.invincible = 30;
          player.x += (player.x > e.x ? 1 : -1) * 20;
          spawnParticles(player.x, player.y - 20, '#f00', 5);
          spawnText(player.x, player.y - 50, `-${dmg}`, '#f00');
          sfxHit();

          if(e.type === 'boss') bossTookDamage = true;
        }

        if(player.hp <= 0){
          player.hp = 0;
          state = 'gameover';
          document.getElementById('gameover-screen').classList.remove('hidden');
          document.getElementById('go-details').innerHTML =
            `Stage: <span style="color:#f80">${STAGES[currentStage].name}</span><br>Score: <span style="color:#0ff">${totalScore}</span><br>Coins: <span style="color:#ff0">${totalCoins}</span><br>Grade: <span style="color:${calcGrade().color}">${calcGrade().grade}</span>`;
          sfxKO();
        }
      }
    }
    if(e.attackFrame > 0) e.attackFrame--;
    e.x = Math.max(-50, Math.min(W + 200, e.x));
  }

  enemies = enemies.filter(e => e.state !== 'dead' || e.stateTimer > 0);

  // Update pickups
  for(const p of pickups){
    p.timer--;
    const dx = Math.abs(player.x - p.x);
    const dy = Math.abs(player.y - p.y);
    if(dx < 25 && dy < 25){
      if(p.type === 'health'){
        player.hp = Math.min(player.maxHp, player.hp + 30);
        spawnText(p.x, p.y - 30, '+30 HP', '#0f0');
      } else if(p.type === 'special'){
        player.specialMeter = Math.min(player.maxSpecial, player.specialMeter + 30);
        spawnText(p.x, p.y - 30, '+30 SP', '#0ff');
      } else if(p.type === 'weapon'){
        player.weapon = p.weapon;
        spawnText(p.x, p.y - 30, WEAPONS[p.weapon].name + '!', '#ff0');
      }
      sfxPickup();
      p.timer = 0;
    }
  }
  pickups = pickups.filter(p => p.timer > 0);

  particles = particles.filter(p=>{
    p.x += (p.vx || 0);
    p.y += (p.vy || 0);
    if(!p.text) p.vy += 0.1;
    p.life--;
    return p.life > 0;
  });

  // Check stage clear
  const stage = STAGES[currentStage];
  const aliveEnemies = enemies.filter(e => e.state !== 'dead');
  if(aliveEnemies.length === 0){
    if(stagePhase === 'fighting'){
      // All wave enemies dead - check if we should spawn boss or clear
      if(stage.boss){
        stagePhase = 'boss';
        spawnBoss();
        stageTimer = 120;
        bossTookDamage = false;
      } else {
        stagePhase = 'clear';
        stageTimer = 60;
        careerData.stagesCleared = Math.max(careerData.stagesCleared, currentStage + 1);
        totalCoins += 100;
        addCoins(100);
        sfxStageClear();
        saveCareer();
        checkAchievements();
        setTimeout(()=>{ showResults(true, currentStage >= STAGES.length - 1); }, 1500);
      }
    } else if(stagePhase === 'boss'){
      careerData.stagesCleared = Math.max(careerData.stagesCleared, currentStage + 1);
      if(currentStage >= STAGES.length - 1) careerData.stagesCleared = STAGES.length;
      if(!bossTookDamage) careerData.noDamageBoss = true;
      saveCareer();
      checkAchievements();
      totalCoins += 200;
      addCoins(200);
      sfxStageClear();
      setTimeout(()=>{ showResults(true, currentStage >= STAGES.length - 1); }, 1500);
    }
  }

  updateHUD();
}

// --- Drawing ---
function draw(){
  const stage = STAGES[currentStage];
  ctx.fillStyle = stage ? stage.bg : '#0a0a12';
  ctx.fillRect(0, 0, W, H);

  if(state === 'menu' || !player) return;

  drawBackground();

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, GROUND_Y + 20, W, H - GROUND_Y);
  ctx.strokeStyle = '#0ff3';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 20);
  ctx.lineTo(W, GROUND_Y + 20);
  ctx.stroke();

  // Draw pickups
  for(const p of pickups){
    const glow = Math.sin(Date.now()/200) * 0.3 + 0.7;
    ctx.globalAlpha = glow;
    if(p.type === 'weapon'){
      const wDef = WEAPONS[p.weapon];
      ctx.fillStyle = wDef.color || '#fff';
      ctx.shadowColor = wDef.color || '#fff';
    } else {
      ctx.fillStyle = p.type === 'health' ? '#0f0' : '#0ff';
      ctx.shadowColor = p.type === 'health' ? '#0f0' : '#0ff';
    }
    ctx.shadowBlur = 8;
    ctx.fillRect(p.x - 8, p.y - 24, 16, 16);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const label = p.type === 'health' ? '+' : p.type === 'special' ? '⚡' : (WEAPONS[p.weapon] ? WEAPONS[p.weapon].name.charAt(0) : '?');
    ctx.fillText(label, p.x, p.y - 12);
    ctx.globalAlpha = 1;
  }

  // Draw enemies
  for(const e of enemies){
    if(e.state === 'dead' && e.stateTimer <= 0) continue;
    const alpha = e.state === 'dead' ? e.stateTimer / 30 : 1;
    ctx.globalAlpha = alpha;
    const color = e.hitFlash > 0 ? '#fff' : e.color;

    ctx.fillStyle = color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(e.x - e.size/2, e.y - e.size * 2, e.size, e.size * 2);
    ctx.shadowBlur = 0;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(e.x, e.y - e.size * 2 - 6, e.size/2 + 2, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    const eyeX = e.x + e.facing * 3;
    ctx.fillRect(eyeX - 2, e.y - e.size * 2 - 8, 3, 3);

    if(e.type === 'boss' || e.hp < e.maxHp){
      const barW = e.size * 2;
      ctx.fillStyle = '#333';
      ctx.fillRect(e.x - barW/2, e.y - e.size * 2 - 18, barW, 4);
      ctx.fillStyle = e.hp/e.maxHp > 0.5 ? '#0f0' : '#f00';
      ctx.fillRect(e.x - barW/2, e.y - e.size * 2 - 18, barW * (e.hp/e.maxHp), 4);
    }

    if(e.type === 'boss'){
      ctx.fillStyle = '#f0f';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(e.name, e.x, e.y - e.size * 2 - 24);
    }

    // Blocking indicator
    if(e.blocking){
      ctx.fillStyle = '#fff4';
      ctx.fillRect(e.x - e.size/2 - 3, e.y - e.size * 2 - 3, e.size + 6, e.size * 2 + 6);
    }

    if(e.state === 'attack' && e.attackFrame > 5){
      ctx.fillStyle = '#fff8';
      ctx.fillRect(e.x + e.facing * e.size, e.y - e.size, 15, 5);
    }

    ctx.globalAlpha = 1;
  }

  // Draw player
  if(state === 'playing' || state === 'gameover'){
    const pFlash = player.hitFlash > 0 && player.hitFlash % 4 < 2;
    if(!pFlash || player.invincible <= 0){
      ctx.fillStyle = player.color;
      ctx.shadowColor = player.color;
      ctx.shadowBlur = 10;
      ctx.fillRect(player.x - 12, player.y - 48, 24, 36);
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 54, 10, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(player.x + player.facing * 3 - 1, player.y - 56, 3, 3);
    }

    // Weapon display
    if(player.weapon !== 'none'){
      const wDef = WEAPONS[player.weapon];
      ctx.fillStyle = wDef.color;
      ctx.shadowColor = wDef.color;
      ctx.shadowBlur = 6;
      if(player.weapon === 'pipe'){
        ctx.fillRect(player.x + player.facing * 15, player.y - 35, player.facing * 30, 4);
      } else if(player.weapon === 'knife'){
        ctx.fillRect(player.x + player.facing * 12, player.y - 38, player.facing * 20, 3);
      } else if(player.weapon === 'sword'){
        ctx.fillRect(player.x + player.facing * 10, player.y - 42, player.facing * 40, 4);
        ctx.fillRect(player.x + player.facing * 15, player.y - 38, 3, 8);
      }
      ctx.shadowBlur = 0;
    }

    // Blocking indicator
    if(player.blocking){
      ctx.strokeStyle = '#0ff8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 30, 25, 0, Math.PI*2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Attack effect
    if(player.attacking){
      ctx.fillStyle = '#fff';
      ctx.shadowColor = player.color;
      ctx.shadowBlur = 15;
      const ax = player.x + player.facing * 20;
      const ay = player.y - 30;
      if(player.charType === 'tech'){
        ctx.fillRect(ax, ay - 3, player.facing * 50, 6);
      } else {
        ctx.beginPath();
        ctx.arc(ax, ay, 8, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    if(player.comboChain > 0){
      ctx.fillStyle = '#ff0';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`x${player.comboChain+1}`, player.x, player.y - 68);
    }

    // Grab indicator
    if(player.grabbing){
      ctx.fillStyle = '#f80';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GRAB!', player.x + player.facing * 35, player.y - 60);
    }
  }

  // Draw particles
  for(const p of particles){
    ctx.globalAlpha = p.life / p.maxLife;
    if(p.text){
      ctx.fillStyle = p.color;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;

  // Stage intro
  if(stagePhase === 'intro' && stageTimer > 60){
    ctx.fillStyle = '#f0f';
    ctx.font = '24px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Stage ${currentStage+1}`, W/2, H/2 - 20);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#f80';
    ctx.fillText(STAGES[currentStage].name, W/2, H/2 + 10);
  }

  // Stage clear grade
  if(stagePhase === 'clear' && stageTimer > 20){
    const g = calcGrade();
    ctx.fillStyle = g.color;
    ctx.font = '48px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.grade, W/2, H/2);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('STAGE CLEAR!', W/2, H/2 + 30);
  }

  // Combo display
  if(combo >= 3){
    ctx.fillStyle = '#ff0';
    ctx.font = `${16 + Math.min(combo, 20)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.8;
    ctx.fillText(`COMBO x${combo}`, W/2, 80);
    ctx.globalAlpha = 1;
  }

  // Weapon indicator
  if(player && player.weapon !== 'none'){
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Weapon: ${WEAPONS[player.weapon].name}`, 10, H - 5);
  }
}

function drawBackground(){
  ctx.fillStyle = '#0d0d1a';
  for(let i=0; i<15; i++){
    const bx = (i * 80 - (camera.x * 0.3) % 80 + W) % (W + 200) - 100;
    const bh = 100 + (i * 37) % 150;
    ctx.fillRect(bx, GROUND_Y + 20 - bh, 50, bh);
    ctx.fillStyle = ((i*137+42)%50===0) ? '#ff08' : '#0ff08';
    for(let wy = 0; wy < bh - 10; wy += 15){
      for(let wx = 5; wx < 40; wx += 12){
        if(((i*137+wy*7+wx*3)%10) < 4) ctx.fillRect(bx + wx, GROUND_Y + 10 - bh + wy + 5, 6, 8);
      }
    }
    ctx.fillStyle = '#0d0d1a';
  }
  const t = Date.now() / 1000;
  ctx.fillStyle = `rgba(255,0,255,${0.1 + Math.sin(t) * 0.05})`;
  ctx.fillRect(200, 80, 80, 20);
  ctx.fillStyle = '#f0f';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NEON', 240, 94);
}

// --- HUD ---
function updateHUD(){
  if(!player) return;
  const hpPct = (player.hp / player.maxHp) * 100;
  const spPct = (player.specialMeter / player.maxSpecial) * 100;
  document.getElementById('hud-hp-bar').innerHTML = `<div style="width:${hpPct}%;height:100%;background:${hpPct>50?'#0f0':hpPct>25?'#ff0':'#f00'}"></div>`;
  document.getElementById('hud-special-bar').innerHTML = `<div style="width:${spPct}%;height:100%;background:#0ff"></div>`;
  document.getElementById('hud-combo').textContent = `Combo: ${combo}`;
  document.getElementById('hud-score').textContent = `Score: ${totalScore}`;
  document.getElementById('hud-coins').textContent = `Coins: ${totalCoins}`;
}

// --- Results ---
function showResults(won, finalWin=false){
  state = 'results';
  const g = calcGrade();
  document.getElementById('results-title').textContent = finalWin ? 'CHAMPION!' : 'Stage Clear!';
  document.getElementById('results-title').style.color = finalWin ? '#ff0' : '#0f0';
  document.getElementById('results-title').style.textShadow = finalWin ? '0 0 30px #ff0' : '';
  document.getElementById('results-details').innerHTML = won
    ? `Stage: <span>${STAGES[currentStage].name}</span><br>Score: <span>${totalScore}</span><br>Max Combo: <span>${maxComboThisRun}</span><br>Coins earned: <span>${totalCoins}</span><br>Grade: <span style="color:${g.color};font-size:1.2em">${g.grade}</span>${finalWin ? '<br><span style="color:#ff0;font-size:16px">★ NEON SYNDICATE DEFEATED ★</span>' : ''}`
    : '';
  document.getElementById('results-screen').classList.remove('hidden');
  document.getElementById('game-hud').classList.add('hidden');
  document.getElementById('controls-hint').classList.add('hidden');
  if(finalWin) sfxStageClear();
}

// --- Ad System ---
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

// --- Input ---
document.addEventListener('keydown', e=>{
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Escape' && state === 'playing') {
    state = 'paused';
    document.getElementById('pause-screen').classList.remove('hidden');
    e.preventDefault();
  }
  e.preventDefault();
});
document.addEventListener('keyup', e=>{
  keys[e.key.toLowerCase()] = false;
});

// --- Menu ---
document.querySelectorAll('.char-option').forEach(opt=>{
  opt.addEventListener('click', ()=>{
    document.querySelectorAll('.char-option').forEach(o=>o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedChar = opt.dataset.char;
  });
});

document.getElementById('btn-fight').onclick = ()=>{
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  player = createPlayer(selectedChar);
  if(!careerData.charsPlayed.includes(selectedChar)){
    careerData.charsPlayed.push(selectedChar);
    saveCareer();
    checkAchievements();
  }
  currentStage = 0;
  totalScore = 0;
  totalCoins = 0;
  maxComboThisRun = 0;
  state = 'playing';
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('game-hud').classList.remove('hidden');
  document.getElementById('controls-hint').classList.remove('hidden');
  initStage(0);
};

document.getElementById('btn-results-continue').onclick = ()=>{
  document.getElementById('results-screen').classList.add('hidden');
  if(currentStage < STAGES.length - 1){
    currentStage++;
    showAd(()=>{
      player.hp = player.maxHp;
      player.specialMeter = player.maxSpecial;
      state = 'playing';
      document.getElementById('game-hud').classList.remove('hidden');
      document.getElementById('controls-hint').classList.remove('hidden');
      initStage(currentStage);
    });
  } else {
    state = 'menu';
    document.getElementById('menu-screen').classList.remove('hidden');
  }
};

document.getElementById('btn-retry').onclick = ()=>{
  document.getElementById('gameover-screen').classList.add('hidden');
  player = createPlayer(selectedChar);
  totalScore = 0;
  totalCoins = 0;
  maxComboThisRun = 0;
  state = 'playing';
  document.getElementById('game-hud').classList.remove('hidden');
  document.getElementById('controls-hint').classList.remove('hidden');
  initStage(currentStage);
};

document.getElementById('btn-go-menu').onclick = ()=>{
  document.getElementById('gameover-screen').classList.add('hidden');
  state = 'menu';
  document.getElementById('menu-screen').classList.remove('hidden');
};

// Pause screen buttons
document.getElementById('btn-pause-resume').onclick = ()=>{
  document.getElementById('pause-screen').classList.add('hidden');
  state = 'playing';
};
document.getElementById('btn-pause-settings').onclick = ()=>{
  try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.show(); } catch(e) {}
};
document.getElementById('btn-pause-quit').onclick = ()=>{
  document.getElementById('pause-screen').classList.add('hidden');
  state = 'menu';
  document.getElementById('menu-screen').classList.remove('hidden');
  document.getElementById('game-hud').classList.add('hidden');
  document.getElementById('controls-hint').classList.add('hidden');
};

document.getElementById('btn-ad-skip').onclick = ()=>{};
document.getElementById('btn-ad-reward').onclick = ()=>{
  document.getElementById('ad-overlay').classList.add('hidden');
  if(window._adCallback) window._adCallback();
};

// --- Game Loop ---
function gameLoop(){
  if(state === 'playing') updateGame();
  draw();
  requestAnimationFrame(gameLoop);
}

updateCoinDisplays();
setupTouchControls();
setupGamepad();
gameLoop();

})();
