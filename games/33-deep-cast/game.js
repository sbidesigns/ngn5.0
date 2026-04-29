// ═══════════════════════════════════════════
// NGN4 — GAME 33: DEEP CAST (Fishing)
// Fishing Simulation with Collection System
// ═══════════════════════════════════════════
(function() {
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('deep-cast'); } catch(e) {}


let canvas, ctx;
let audioCtx;
let state = 'idle'; // idle, casting, waiting, bite, reeling, caught, lost
let currentLocation = 'pond';
let castPower = 0;
let castDir = 1;
let biteTimer = 0;
let reelProgress = 0;
let reelTarget = 0;
let reelZone = 0;
let currentFish = null;
let sessionFish = [];
let sessionCoins = 0;
let weather = 'clear';
let fishY = 250; // fish position (separate from player hook position)
let hookY = 250;
let bobberY = 200;
let lineAngle = 0;
let waterOffset = 0;
let fishSwimTimer = 0;
let castDistance = 0.5;
let castQualityBonus = 0;

// Player data
let playerData = JSON.parse(localStorage.getItem('ngn4_fishing_data') || 'null') || {
  bait: 'worm',
  rod: 'basic',
  reel: 'basic',
  line: 'basic',
  journal: {},
  totalCaught: 0,
  coinsSpent: 0
};

// ── Fish Database ──
const FISH = [
  { id:'bluegill', name:'Bluegill', rarity:'common', minW:0.2, maxW:1.5, value:5, difficulty:0.2, locations:['pond','river'], emoji:'🐟' },
  { id:'perch', name:'Yellow Perch', rarity:'common', minW:0.3, maxW:2, value:8, difficulty:0.25, locations:['pond','river','ocean'], emoji:'🐟' },
  { id:'carp', name:'Common Carp', rarity:'common', minW:1, maxW:8, value:10, difficulty:0.3, locations:['pond','river'], emoji:'🐟' },
  { id:'catfish', name:'Channel Catfish', rarity:'common', minW:2, maxW:15, value:12, difficulty:0.35, locations:['river'], emoji:'🐱' },
  { id:'bass', name:'Largemouth Bass', rarity:'uncommon', minW:1, maxW:10, value:20, difficulty:0.4, locations:['pond','river','ocean'], emoji:'🐠' },
  { id:'trout', name:'Rainbow Trout', rarity:'uncommon', minW:0.5, maxW:6, value:25, difficulty:0.45, locations:['river'], emoji:'🐠' },
  { id:'pike', name:'Northern Pike', rarity:'uncommon', minW:3, maxW:20, value:35, difficulty:0.5, locations:['river','ocean'], emoji:'🦈' },
  { id:'walleye', name:'Walleye', rarity:'uncommon', minW:1, maxW:8, value:30, difficulty:0.45, locations:['river','ocean'], emoji:'🐠' },
  { id:'salmon', name:'Atlantic Salmon', rarity:'rare', minW:4, maxW:25, value:60, difficulty:0.6, locations:['river','ocean'], emoji:'🐟' },
  { id:'tuna', name:'Bluefin Tuna', rarity:'rare', minW:20, maxW:200, value:80, difficulty:0.65, locations:['ocean','deep'], emoji:'🐠' },
  { id:'swordfish', name:'Swordfish', rarity:'rare', minW:30, maxW:300, value:100, difficulty:0.7, locations:['ocean','deep'], emoji:'🗡️' },
  { id:'eel', name:'Electric Eel', rarity:'rare', minW:5, maxW:20, value:90, difficulty:0.65, locations:['river','deep'], emoji:'⚡' },
  { id:'marlin', name:'Blue Marlin', rarity:'rare', minW:50, maxW:500, value:120, difficulty:0.75, locations:['deep','ocean'], emoji:'🐟' },
  { id:'shark', name:'Great White Shark', rarity:'epic', minW:100, maxW:1000, value:150, difficulty:0.8, locations:['deep'], emoji:'🦈' },
  { id:'giant_octopus', name:'Giant Octopus', rarity:'epic', minW:20, maxW:100, value:130, difficulty:0.75, locations:['deep','abyss'], emoji:'🐙' },
  { id:'manta', name:'Giant Manta Ray', rarity:'epic', minW:50, maxW:500, value:140, difficulty:0.78, locations:['deep','abyss'], emoji:'🦑' },
  { id:'anglerfish', name:'Anglerfish', rarity:'epic', minW:5, maxW:30, value:160, difficulty:0.82, locations:['abyss'], emoji:'🔮' },
  { id:'leviathan', name:'Leviathan', rarity:'legendary', minW:500, maxW:5000, value:500, difficulty:0.95, locations:['abyss'], emoji:'🐉' },
  { id:'kraken', name:'Kraken Jr.', rarity:'legendary', minW:200, maxW:2000, value:600, difficulty:0.92, locations:['abyss'], emoji:'🐙' },
  { id:'golden_koi', name:'Golden Koi', rarity:'legendary', minW:1, maxW:5, value:800, difficulty:0.9, locations:['pond','river'], emoji:'✨' },
];

const LOCATIONS = {
  pond:  { name:'Pond', depth:'Shallow', color:'#1a3a2a', fishRate:0.8, rarityBonus:0 },
  river: { name:'River', depth:'Medium', color:'#1a2a3a', fishRate:0.7, rarityBonus:0.1 },
  ocean: { name:'Ocean', depth:'Deep', color:'#0a1a3a', fishRate:0.6, rarityBonus:0.2 },
  deep:  { name:'Deep Sea', depth:'Abyssal', color:'#050a2a', fishRate:0.5, rarityBonus:0.35 },
  abyss: { name:'The Abyss', depth:'Void', color:'#020510', fishRate:0.35, rarityBonus:0.5 },
};

const BAITS = {
  worm:    { name:'Earthworm', cost:0, rarityBonus:0 },
  cricket: { name:'Cricket', cost:20, rarityBonus:0.1 },
  shrimp:  { name:'Shrimp', cost:50, rarityBonus:0.2 },
  lure:    { name:'Silver Lure', cost:100, rarityBonus:0.3 },
  golden:  { name:'Golden Lure', cost:200, rarityBonus:0.5 },
};

const EQUIPMENT = {
  rod: [
    { id:'basic', name:'Basic Rod', cost:0, reelBonus:0, desc:'Standard rod' },
    { id:'carbon', name:'Carbon Rod', cost:100, reelBonus:0.1, desc:'+10% reel speed' },
    { id:'titanium', name:'Titanium Rod', cost:300, reelBonus:0.2, desc:'+20% reel speed' },
  ],
  reel: [
    { id:'basic', name:'Basic Reel', cost:0, zoneBonus:0, desc:'Standard reel' },
    { id:'spinning', name:'Spinning Reel', cost:80, zoneBonus:5, desc:'+5% reel zone' },
    { id:'baitcaster', name:'Baitcaster', cost:250, zoneBonus:10, desc:'+10% reel zone' },
  ],
  line: [
    { id:'basic', name:'Basic Line', cost:0, strengthBonus:0, desc:'Standard line' },
    { id:'braided', name:'Braided Line', cost:60, strengthBonus:1, desc:'+1 strength level' },
    { id:'fluoro', name:'Fluorocarbon', cost:200, strengthBonus:2, desc:'+2 strength level' },
  ]
};

const WEATHER = ['clear','cloudy','rainy','stormy','foggy'];
const WEATHER_ICONS = { clear:'☀', cloudy:'☁', rainy:'🌧', stormy:'⛈', foggy:'🌫' };
const WEATHER_BONUS = { clear:0, cloudy:0.1, rainy:0.2, stormy:0.3, foggy:0.15 };

// ── Audio ──
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playSound(freq, dur, type='sine', vol=0.06) {
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
function sndCast() { playSound(300, 0.3, 'sine'); playSound(500, 0.2, 'sine'); }
function sndSplash() { playSound(100, 0.4, 'sawtooth', 0.04); }
function sndBite() { playSound(800, 0.1); setTimeout(()=>playSound(1000,0.1), 100); setTimeout(()=>playSound(1200,0.1), 200); }
function sndCatch() { [523,659,784,1047].forEach((f,i) => setTimeout(() => playSound(f, 0.2, 'sine', 0.08), i*100)); }
function sndLost() { playSound(200, 0.4, 'sawtooth', 0.05); }

// ── Rewards ──
function getRewards() { try { return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, gems: 0 }; } catch { return { coins: 0, gems: 0 }; } }
function getCoins() { return getRewards().coins || 0; }
function addCoins(n) {
  const r = getRewards(); r.coins = (r.coins || 0) + n;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
  document.getElementById('coins').textContent = r.coins;
}
function spendCoins(n) {
  const r = getRewards();
  const c = r.coins || 0;
  if (c < n) return false;
  r.coins = c - n;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
  document.getElementById('coins').textContent = r.coins;
  return true;
}

function savePlayerData() { localStorage.setItem('ngn4_fishing_data', JSON.stringify(playerData)); }

// ── Weather ──
function rollWeather() {
  const r = Math.random();
  if (r < 0.35) weather = 'clear';
  else if (r < 0.55) weather = 'cloudy';
  else if (r < 0.75) weather = 'rainy';
  else if (r < 0.88) weather = 'stormy';
  else weather = 'foggy';
}

// ── Fish Selection ──
function selectFish() {
  const loc = LOCATIONS[currentLocation];
  const bait = BAITS[playerData.bait];
  const bonus = loc.rarityBonus + bait.rarityBonus + WEATHER_BONUS[weather] + castQualityBonus;

  const available = FISH.filter(f => f.locations.includes(currentLocation));
  // Rarity weighting
  const weights = available.map(f => {
    const rarityMult = { common:10, uncommon:5, rare:2, epic:0.8, legendary:0.2 };
    let w = rarityMult[f.rarity] || 1;
    if (bonus > 0 && f.rarity !== 'common') w *= (1 + bonus);
    if (f.rarity === 'legendary') w *= (0.3 + bonus * 0.5);
    // Cast distance bonus: high power casts can reach deeper fish
    if (castDistance > 0.7 && (f.rarity === 'rare' || f.rarity === 'epic' || f.rarity === 'legendary')) {
      w *= 1 + (castDistance - 0.7) * 2;
    }
    return w;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    r -= weights[i];
    if (r <= 0) return available[i];
  }
  return available[0];
}

// ── Reeling Mini-game ──
function startReel() {
  const rod = EQUIPMENT.rod.find(r => r.id === playerData.rod);
  const reelEq = EQUIPMENT.reel.find(r => r.id === playerData.reel);
  const baseZone = 30 + (reelEq ? reelEq.zoneBonus : 0);
  reelZone = Math.min(50, baseZone - currentFish.difficulty * 20);
  reelProgress = 0;
  reelTarget = 100;
  hookY = 250;
  state = 'reeling';
}

function updateReeling() {
  if (state !== 'reeling') return;
  const rod = EQUIPMENT.rod.find(r => r.id === playerData.rod);
  const speed = 1 + (rod ? rod.reelBonus : 0);
  const fishSpeed = currentFish.difficulty * 3;

  // Fish moves independently (fishY is the fish target position)
  fishSwimTimer += 0.02;
  fishY = 250 + Math.sin(fishSwimTimer * (2 + currentFish.difficulty * 3)) * (100 + currentFish.difficulty * 50);
  fishY += Math.sin(fishSwimTimer * 5) * fishSpeed;
  fishY = Math.max(80, Math.min(420, fishY));

  // Player controls reel zone position
  if (keys[' '] || keys['arrowup']) {
    hookY -= 2 * speed;
  }
  if (keys['arrowdown']) {
    hookY += 2 * speed;
  }
  hookY = Math.max(80, Math.min(420, hookY));

  // Check if fish is near player's hook position
  const dist = Math.abs(hookY - fishY);
  const catchRadius = reelZone / 2;
  if (dist < catchRadius) {
    reelProgress += 0.5 * speed;
  } else {
    reelProgress -= 0.3;
  }
  reelProgress = Math.max(0, Math.min(reelTarget, reelProgress));

  if (reelProgress >= reelTarget) {
    catchFish();
  } else if (reelProgress <= 0 && Math.random() < 0.05) {
    loseFish();
  }
}

  function catchFish() {
    state = 'caught';
    const weight = +(currentFish.minW + Math.random() * (currentFish.maxW - currentFish.minW)).toFixed(1);
    const isGolden = Math.random() < 0.05;
    const caught = { ...currentFish, weight, isGolden, id: currentFish.id + '_' + Date.now() };
    sessionFish.push(caught);

    // Update journal
    if (!playerData.journal[currentFish.id]) {
      playerData.journal[currentFish.id] = { caught: 0, maxWeight: 0, bestValue: 0 };
    }
    playerData.journal[currentFish.id].caught++;
    if (weight > playerData.journal[currentFish.id].maxWeight) {
      playerData.journal[currentFish.id].maxWeight = weight;
    }
    playerData.totalCaught++;

    // NGN4 Achievements
    try {
      if (typeof NGN4Achievements !== 'undefined') {
        if (playerData.totalCaught >= 1) NGN4Achievements.unlock('first_catch', 'First Catch');
        if (playerData.totalCaught >= 10) NGN4Achievements.unlock('catch_10', 'Catch 10 Fish');
        if (playerData.totalCaught >= 50) NGN4Achievements.unlock('catch_50', 'Catch 50 Fish');
        if (caught.rarity === 'legendary') NGN4Achievements.unlock('legendary_catch', 'Legendary Catch');
        if (caught.rarity === 'epic') NGN4Achievements.unlock('epic_catch', 'Epic Catch');
        if (isGolden) NGN4Achievements.unlock('golden_catch', 'Golden Catch');
        if (Object.keys(playerData.journal).length >= FISH.length) NGN4Achievements.unlock('complete_journal', 'Complete Journal');
      }
    } catch(e) {}

    savePlayerData();

    sndCatch();
    showCatchScreen(caught);
  }

function loseFish() {
  state = 'lost';
  sndLost();
  setMessage('The fish got away! 😢');
  setTimeout(() => { state = 'idle'; }, 1500);
}

// ── Catch Screen ──
function showCatchScreen(fish) {
  const val = isGoldenValue(fish);
  document.getElementById('catch-title').textContent = fish.isGolden ? '✨ GOLDEN CATCH! ✨' : `🎉 ${fish.name}!`;
  document.getElementById('catch-info').innerHTML = `
    <div style="font-size:3rem;margin:10px">${fish.emoji}</div>
    <div>${fish.isGolden ? '⭐ ' : ''}${fish.name}</div>
    <div style="color:#888">Rarity: <span style="color:${rarityColor(fish.rarity)}">${fish.rarity.toUpperCase()}</span></div>
    <div>Weight: ${fish.weight} lbs</div>
    <div>Value: 🪙 ${val}</div>
  `;
  currentFish = fish;
  document.getElementById('fishing-screen').style.display = 'none';
  document.getElementById('catch-screen').style.display = 'block';
}

function rarityColor(r) {
  return { common:'#aaa', uncommon:'#0f0', rare:'#0af', epic:'#f0f', legendary:'#ffd700' }[r] || '#fff';
}
function isGoldenValue(fish) {
  const base = fish.value * (0.5 + fish.weight / fish.maxW * 0.5);
  return Math.floor(base * (fish.isGolden ? 5 : 1));
}

// ── Drawing ──
function draw() {
  const loc = LOCATIONS[currentLocation];
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 200);
  skyGrad.addColorStop(0, '#0a0a1a');
  skyGrad.addColorStop(1, '#1a1a3a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, 200);

  // Stars
  ctx.fillStyle = '#ffffff44';
  for (let i = 0; i < 30; i++) {
    const sx = (i * 67 + 13) % canvas.width;
    const sy = (i * 43 + 7) % 180;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Weather effects
  if (weather === 'rainy' || weather === 'stormy') {
    ctx.strokeStyle = '#4af4';
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const rx = (Date.now() * 0.1 + i * 37) % canvas.width;
      const ry = (Date.now() * 0.5 + i * 53) % canvas.height;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 2, ry + 10);
      ctx.stroke();
    }
  }

  // Water
  waterOffset += 0.02;
  ctx.fillStyle = loc.color;
  ctx.fillRect(0, 200, canvas.width, 300);

  // Water surface waves
  ctx.beginPath();
  ctx.moveTo(0, 200);
  for (let x = 0; x <= canvas.width; x += 5) {
    ctx.lineTo(x, 200 + Math.sin(x * 0.03 + waterOffset * 3) * 5 + Math.sin(x * 0.01 + waterOffset) * 3);
  }
  ctx.lineTo(canvas.width, 210);
  ctx.lineTo(0, 210);
  ctx.closePath();
  ctx.fillStyle = '#0af3';
  ctx.fill();

  // Underwater effects
  for (let i = 0; i < 5; i++) {
    const bx = 50 + i * 100 + Math.sin(waterOffset + i) * 20;
    const by = 300 + Math.cos(waterOffset * 0.5 + i * 2) * 50;
    ctx.beginPath();
    ctx.arc(bx, by, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#0af2';
    ctx.fill();
  }

  // Power meter during casting
  if (state === 'casting') {
    const barX = 380, barY = 30, barW = 140, barH = 18;
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#0af';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);
    // Power fill with gradient color
    const pColor = castPower < 0.3 ? '#4f4' : castPower < 0.7 ? '#ff0' : '#f44';
    ctx.fillStyle = pColor;
    ctx.fillRect(barX + 2, barY + 2, (barW - 4) * castPower, barH - 4);
    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '11px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('POWER: ' + Math.round(castPower * 100) + '%', barX + barW / 2, barY + barH + 15);
    // Depth zone indicator
    const zoneText = castPower > 0.7 ? 'DEEP WATER' : castPower > 0.4 ? 'MID RANGE' : 'SHALLOW';
    const zoneColor = castPower > 0.7 ? '#a4f' : castPower > 0.4 ? '#0af' : '#4f4';
    ctx.fillStyle = zoneColor;
    ctx.font = '12px Courier New';
    ctx.fillText('🎣 ' + zoneText, barX + barW / 2, barY - 8);
    // Animated charging indicator
    ctx.fillStyle = '#fff';
    ctx.font = '14px Courier New';
    ctx.fillText('>>> RELEASE TO CAST <<<', 250, canvas.height - 20);
    ctx.textAlign = 'start';
  }

  // Fishing line
  if (state !== 'idle') {
    ctx.strokeStyle = '#fff8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(250, 50);
    if (state === 'casting') {
      ctx.lineTo(250, 50 + castPower * 2);
    } else {
      const bobX = 250;
      const bobYPos = 200 + Math.sin(waterOffset * 3) * 5;
      ctx.lineTo(bobX, bobYPos);
      // Bobber
      ctx.beginPath();
      ctx.arc(bobX, bobYPos, 5, 0, Math.PI * 2);
      ctx.fillStyle = state === 'bite' ? '#f00' : '#f44';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (state === 'bite') {
        ctx.fillStyle = '#f00';
        ctx.font = '16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('!! BITE !!', 250, 185);
      }
    }
    ctx.stroke();
  }

  // Reel mini-game overlay
  if (state === 'reeling') {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Reel bar
    const barX = 220, barW = 60, barH = 400, barY = 50;
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#0af';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);

    // Reel zone (green area)
    const zoneY = 250 - reelZone / 2;
    ctx.fillStyle = '#0f04';
    ctx.fillRect(barX, zoneY, barW, reelZone);
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, zoneY, barW, reelZone);

    // Fish position (emoji)
    ctx.fillStyle = currentFish.emoji;
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.fillText(currentFish.emoji, 180, fishY);

    // Player hook position
    ctx.beginPath();
    ctx.moveTo(barX - 10, hookY);
    ctx.lineTo(barX + barW + 10, hookY);
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.arc(barX - 15, hookY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Progress bar
    ctx.fillStyle = '#333';
    ctx.fillRect(50, 470, 400, 20);
    ctx.fillStyle = '#0af';
    ctx.fillRect(50, 470, (reelProgress / reelTarget) * 400, 20);
    ctx.strokeStyle = '#0af';
    ctx.strokeRect(50, 470, 400, 20);

    ctx.fillStyle = '#fff';
    ctx.font = '12px Courier New';
    ctx.fillText(`Reeling: ${currentFish.name} (${currentFish.weight} lbs)`, 250, 30);
    ctx.fillText('SPACE/UP to reel up, DOWN to move down', 250, 498);
  }

  // Rod
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(250, 50);
  ctx.lineTo(235, 10);
  ctx.stroke();
  ctx.fillStyle = '#0af';
  ctx.beginPath();
  ctx.arc(235, 10, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'start';
}

// ── Game Loop ──
let lastTime = 0;
let animFrame;
function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (state === 'casting') {
    // Hold-to-charge: power increases while holding
    castPower += dt * 1.2;
    if (castPower > 1) castPower = 1;
  }

  if (state === 'waiting') {
    biteTimer -= dt;
    if (biteTimer <= 0) {
      state = 'bite';
      sndBite();
      setMessage('🐟 BITE! Click REEL IN!');
      document.getElementById('reel-btn').style.display = 'inline-block';
    }
  }

  if (state === 'reeling') {
    updateReeling();
  }

  draw();
  if (state !== 'idle') animFrame = requestAnimationFrame(gameLoop);
  else cancelAnimationFrame(animFrame);
}

function setMessage(msg) {
  document.getElementById('fish-message').textContent = msg;
}

// ── Screens ──
function showScreen(id) {
  ['menu-screen','fishing-screen','shop-screen','journal-screen','equip-screen','catch-screen','result-screen'].forEach(s => {
    document.getElementById(s).style.display = 'none';
  });
  if (id) document.getElementById(id).style.display = 'block';
}

function updatePlayerStats() {
  const totalSpecies = Object.keys(playerData.journal).length;
  document.getElementById('player-stats').innerHTML =
    `Rod: ${playerData.rod} | Reel: ${playerData.reel} | Line: ${playerData.line}<br>` +
    `Bait: ${playerData.bait} | Species: ${totalSpecies}/${FISH.length} | Total Caught: ${playerData.totalCaught}`;
}

function renderShop() {
  document.getElementById('shop-coins').textContent = getCoins();
  const el = document.getElementById('shop-items');
  el.innerHTML = '';
  for (const [id, bait] of Object.entries(BAITS)) {
    const owned = playerData.bait === id;
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <div><strong>${bait.name}</strong> — +${bait.rarityBonus*100}% rarity bonus ${owned?'(OWNED)':''}</div>
      <div><button class="btn" ${owned?'disabled style="opacity:0.5"':''}>🪙 ${bait.cost}</button></div>
    `;
    if (!owned) {
      div.querySelector('button').addEventListener('click', () => {
        if (spendCoins(bait.cost)) {
          playerData.bait = id;
          savePlayerData();
          renderShop();
          playSound(600, 0.1, 'sine');
        }
      });
    }
    el.appendChild(div);
  }
}

function renderJournal() {
  const el = document.getElementById('journal-list');
  el.innerHTML = '';
  const caught = Object.keys(playerData.journal).length;
  document.getElementById('journal-progress').textContent = `${caught}/${FISH.length} species discovered`;
  for (const fish of FISH) {
    const data = playerData.journal[fish.id];
    const div = document.createElement('div');
    div.className = 'journal-entry ' + (data ? 'caught' : 'uncaught');
    div.innerHTML = data
      ? `${fish.emoji} ${fish.name} <span style="color:${rarityColor(fish.rarity)}">[${fish.rarity}]</span> — Caught: ${data.caught}, Best: ${data.maxWeight} lbs`
      : `??? — <span style="color:${rarityColor(fish.rarity)}">[${fish.rarity}]</span> — Undiscovered`;
    el.appendChild(div);
  }
}

function renderEquipment() {
  const el = document.getElementById('equip-list');
  el.innerHTML = '';
  for (const [slot, items] of Object.entries(EQUIPMENT)) {
    const header = document.createElement('div');
    header.style.cssText = 'color:#0af;padding:8px 0;font-weight:bold;border-bottom:1px solid #0af2';
    header.textContent = slot.toUpperCase();
    el.appendChild(header);
    for (const item of items) {
      const owned = playerData[slot] === item.id;
      const div = document.createElement('div');
      div.className = 'equip-item';
      div.innerHTML = `
        <div>${owned?'✅':'⬜'} ${item.name} — ${item.desc}</div>
        <div><button class="btn" ${owned?'disabled style="opacity:0.5"':''}>🪙 ${item.cost}</button></div>
      `;
      if (!owned) {
        div.querySelector('button').addEventListener('click', () => {
          if (spendCoins(item.cost)) {
            playerData[slot] = item.id;
            savePlayerData();
            renderEquipment();
            playSound(600, 0.1, 'sine');
          }
        });
      }
      el.appendChild(div);
    }
  }
}

function endSession() {
  showScreen('result-screen');
  const totalValue = sessionFish.reduce((s, f) => s + isGoldenValue(f), 0);
  const legendary = sessionFish.filter(f => f.rarity === 'legendary').length;
  document.getElementById('result-stats').innerHTML =
    `Fish Caught: ${sessionFish.length}<br>` +
    `Total Value: 🪙 ${totalValue}<br>` +
    `Legendary: ${legendary}<br>` +
    `Location: ${LOCATIONS[currentLocation].name}`;
  document.getElementById('rewards-earned').textContent = `🪙 Session earnings: ${sessionCoins} coins`;
}

// ── Input ──
let keys = {};
document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// ── Init ──
function init() {
  canvas = document.getElementById('fishing-canvas');
  ctx = canvas.getContext('2d');
  document.getElementById('coins').textContent = getCoins();
  rollWeather();
  updatePlayerStats();

  document.querySelectorAll('.loc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.loc-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLocation = btn.dataset.loc;
    });
  });

  document.getElementById('fish-btn').addEventListener('click', () => {
    initAudio();
    showScreen('fishing-screen');
    state = 'idle';
    sessionFish = [];
    sessionCoins = 0;
    rollWeather();
    document.getElementById('location-name').textContent = LOCATIONS[currentLocation].name;
    document.getElementById('weather-display').textContent = WEATHER_ICONS[weather] + ' ' + weather;
    document.getElementById('fish-count').textContent = '🐟 0';
    document.getElementById('cast-btn').style.display = 'inline-block';
    document.getElementById('reel-btn').style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  });

  // Hold-to-charge casting: mousedown starts charging, mouseup releases cast
  let isCharging = false;
  const castBtn = document.getElementById('cast-btn');
  castBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (state === 'idle') {
      initAudio();
      state = 'casting';
      castPower = 0;
      isCharging = true;
      castBtn.textContent = '🎣 HOLD TO CHARGE...';
      sndCast();
    }
  });
  castBtn.addEventListener('mouseup', (e) => {
    e.preventDefault();
    if (isCharging && state === 'casting') {
      isCharging = false;
      doCast(castPower);
    }
  });
  castBtn.addEventListener('mouseleave', (e) => {
    if (isCharging && state === 'casting') {
      isCharging = false;
      doCast(castPower);
    }
  });
  castBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (state === 'idle') {
      initAudio();
      state = 'casting';
      castPower = 0;
      isCharging = true;
      castBtn.textContent = '🎣 HOLD TO CHARGE...';
      sndCast();
    }
  }, { passive: false });
  castBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (isCharging && state === 'casting') {
      isCharging = false;
      doCast(castPower);
    }
  });

  // Keyboard support: hold Space to charge, release to cast
  let spaceHeld = false;
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !spaceHeld) {
      const fishingScreen = document.getElementById('fishing-screen');
      if (fishingScreen.style.display === 'none') return;
      e.preventDefault();
      spaceHeld = true;
      if (state === 'idle') {
        initAudio();
        state = 'casting';
        castPower = 0;
        castBtn.textContent = '🎣 HOLD TO CHARGE...';
        sndCast();
      }
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spaceHeld = false;
      if (state === 'casting') {
        doCast(castPower);
      }
    }
  });

  function doCast(power) {
    // Power determines cast distance: 0=near shore, 1=max distance
    // Higher power = can reach deeper/rarer fish
    state = 'waiting';
    sndSplash();
    const loc = LOCATIONS[currentLocation];
    // Power affects bite timer: higher power = slightly longer wait but better fish
    const powerBonus = 0.5 + power * 0.5; // 0.5 to 1.0
    biteTimer = (2 + Math.random() * 5) / ((loc.fishRate + WEATHER_BONUS[weather]) * powerBonus);
    // Store cast distance for visuals
    castDistance = 0.2 + power * 0.8; // 20% to 100% of max distance
    // Power affects fish selection: higher power unlocks deeper water fish
    castQualityBonus = power * 0.3; // Up to 30% rarity bonus from casting far
    setMessage('Cast at ' + Math.round(power * 100) + '% power — ' + (power > 0.7 ? 'Deep water!' : power > 0.4 ? 'Mid range' : 'Shore line'));
    document.getElementById('cast-btn').style.display = 'inline-block';
    document.getElementById('cast-btn').textContent = '🎣 Re-cast';
  }

  document.getElementById('reel-btn').addEventListener('click', () => {
    if (state === 'bite') {
      currentFish = selectFish();
      startReel();
      document.getElementById('reel-btn').style.display = 'none';
    }
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    state = 'idle';
    if (sessionFish.length > 0) endSession();
    else showScreen('menu-screen');
  });

  document.getElementById('shop-btn').addEventListener('click', () => { showScreen('shop-screen'); renderShop(); });
  document.getElementById('journal-btn').addEventListener('click', () => { showScreen('journal-screen'); renderJournal(); });
  document.getElementById('equip-btn').addEventListener('click', () => { showScreen('equip-screen'); renderEquipment(); });
  document.getElementById('shop-back').addEventListener('click', () => { showScreen('menu-screen'); updatePlayerStats(); });
  document.getElementById('journal-back').addEventListener('click', () => showScreen('menu-screen'));
  document.getElementById('equip-back').addEventListener('click', () => { showScreen('menu-screen'); updatePlayerStats(); });

  document.getElementById('sell-btn').addEventListener('click', () => {
    const val = isGoldenValue(currentFish);
    addCoins(val);
    sessionCoins += val;
    document.getElementById('fish-count').textContent = `🐟 ${sessionFish.length}`;
    showScreen('fishing-screen');
    state = 'idle';
    document.getElementById('cast-btn').style.display = 'inline-block';
    document.getElementById('cast-btn').textContent = '🎣 Cast Line';
    setMessage(`Sold for 🪙 ${val}!`);
  });

  document.getElementById('keep-btn').addEventListener('click', () => {
    showScreen('fishing-screen');
    state = 'idle';
    document.getElementById('cast-btn').style.display = 'inline-block';
    document.getElementById('cast-btn').textContent = '🎣 Cast Line';
    setMessage('Fish added to collection!');
  });

  document.getElementById('continue-btn').addEventListener('click', () => {
    showScreen('menu-screen');
    updatePlayerStats();
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
        btn.textContent = '✅ Watched!'; btn.style.background = '#0f0';
        playerData.bait = 'golden';
        savePlayerData();
        updatePlayerStats();
      }
    }, 1000);
  });
}

document.addEventListener('DOMContentLoaded', init);
})();
