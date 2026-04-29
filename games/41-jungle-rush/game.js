(function() {
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('jungle-rush'); } catch(e) {}


// ========================
// CONSTANTS & CONFIG
// ========================
var CW = 900, CH = 700;
var GRAVITY = 0.55;
var TILE = 40;
var SAVE_KEY = 'ngn4_jungle_rush_save';
var COIN_KEY = 'ngn4_rewards';

// ========================
// DOM REFERENCES
// ========================
var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');
canvas.width = CW;
canvas.height = CH;

var screens = {
  menu: document.getElementById('menu-screen'),
  howto: document.getElementById('howto-screen'),
  levelSelect: document.getElementById('level-select-screen'),
  hud: document.getElementById('hud-screen'),
  pause: document.getElementById('pause-screen'),
  gameover: document.getElementById('gameover-screen'),
  levelComplete: document.getElementById('levelcomplete-screen'),
  victory: document.getElementById('victory-screen'),
  upgrades: document.getElementById('upgrade-screen'),
  achievements: document.getElementById('achievements-screen'),
  ad: document.getElementById('ad-screen'),
  rewardedAd: document.getElementById('rewarded-ad-screen')
};

var mobileControls = document.getElementById('mobile-controls');
var isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || ('ontouchstart' in window);
if (isMobile) mobileControls.classList.add('visible');

// ========================
// AUDIO ENGINE
// ========================
var audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
}
function playSound(type) {
  if (!audioCtx) return;
  try {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    var t = audioCtx.currentTime;
    switch(type) {
      case 'jump':
        osc.type = 'square'; osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
        gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start(t); osc.stop(t + 0.15); break;
      case 'doubleJump':
        osc.type = 'sine'; osc.frequency.setValueAtTime(500, t);
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.12);
        gain.gain.setValueAtTime(0.12, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start(t); osc.stop(t + 0.15); break;
      case 'spin':
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.08);
        gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.start(t); osc.stop(t + 0.12); break;
      case 'collect':
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
        gain.gain.setValueAtTime(0.12, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.start(t); osc.stop(t + 0.12); break;
      case 'gem':
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, t);
        osc.frequency.setValueAtTime(800, t + 0.08);
        osc.frequency.setValueAtTime(1000, t + 0.16);
        gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.start(t); osc.stop(t + 0.25); break;
      case 'enemyDefeat':
        osc.type = 'square'; osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.start(t); osc.stop(t + 0.2); break;
      case 'hurt':
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);
        gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        osc.start(t); osc.stop(t + 0.35); break;
      case 'death':
        osc.type = 'square'; osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.6);
        gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.7);
        osc.start(t); osc.stop(t + 0.7); break;
      case 'levelUp':
        osc.type = 'sine'; osc.frequency.setValueAtTime(500, t);
        osc.frequency.setValueAtTime(700, t + 0.1);
        osc.frequency.setValueAtTime(900, t + 0.2);
        osc.frequency.setValueAtTime(1100, t + 0.3);
        gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        osc.start(t); osc.stop(t + 0.5); break;
      case 'levelComplete':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.setValueAtTime(800, t + 0.15);
        osc.frequency.setValueAtTime(1000, t + 0.3);
        osc.frequency.setValueAtTime(1200, t + 0.45);
        gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.7);
        osc.start(t); osc.stop(t + 0.7); break;
      case 'boss':
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(80, t);
        osc.frequency.setValueAtTime(120, t + 0.2);
        osc.frequency.setValueAtTime(80, t + 0.4);
        gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        osc.start(t); osc.stop(t + 0.5); break;
      case 'groundPound':
        osc.type = 'triangle'; osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
        gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.start(t); osc.stop(t + 0.25); break;
      case 'slide':
        osc.type = 'triangle'; osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(250, t + 0.08);
        gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t); osc.stop(t + 0.1); break;
      case 'button':
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, t);
        gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
        osc.start(t); osc.stop(t + 0.06); break;
    }
  } catch(e) {}
}

// ========================
// SAVE SYSTEM
// ========================
var defaultSave = {
  lives: 3, gems: 0, xp: 0, playerLevel: 1,
  levelsCompleted: {}, highScores: {},
  upgrades: { speed: 0, jump: 0, spin: 0, shield: 0 },
  achievements: {},
  totalCrystals: 0, totalEnemiesDefeated: 0,
  totalDeaths: 0, totalTime: 0
};

var saveData;
function loadSave() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      saveData = JSON.parse(raw);
      for (var k in defaultSave) {
        if (saveData[k] === undefined) saveData[k] = defaultSave[k];
      }
      if (!saveData.upgrades) saveData.upgrades = {speed:0,jump:0,spin:0,shield:0};
      if (!saveData.achievements) saveData.achievements = {};
      if (!saveData.levelsCompleted) saveData.levelsCompleted = {};
    } else {
      saveData = JSON.parse(JSON.stringify(defaultSave));
    }
  } catch(e) {
    saveData = JSON.parse(JSON.stringify(defaultSave));
  }
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); } catch(e) {}
}
function addCoins(n) {
  try {
    var raw = localStorage.getItem(COIN_KEY);
    var data = raw ? JSON.parse(raw) : {coins:0, games:{}};
    data.coins = (data.coins || 0) + n;
    localStorage.setItem(COIN_KEY, JSON.stringify(data));
  } catch(e) {}
}

// ========================
// UPGRADES DEFINITION
// ========================
var UPGRADES = [
  {id:'speed', name:'Speed Boost', desc:'Run faster through zones', icon:'⚡', maxLevel:5, costs:[5,8,12,18,25], effect:function(lv){return 1 + lv * 0.15;}},
  {id:'jump', name:'Jump Height', desc:'Jump higher to reach platforms', icon:'🦘', maxLevel:5, costs:[4,7,10,15,20], effect:function(lv){return 1 + lv * 0.12;}},
  {id:'spin', name:'Spin Attack', desc:'Spin lasts longer & hits harder', icon:'🌀', maxLevel:3, costs:[8,14,22], effect:function(lv){return 1 + lv * 0.25;}},
  {id:'shield', name:'Shield', desc:'Absorb one extra hit per life', icon:'🛡️', maxLevel:3, costs:[10,18,30], effect:function(lv){return lv;}}
];

// ========================
// ACHIEVEMENTS DEFINITION
// ========================
var ACHIEVEMENTS = [
  {id:'first_crystal', name:'Crystal Collector', desc:'Collect your first crystal', icon:'💎', check:function(s){return s.totalCrystals >= 1;}},
  {id:'crystals_50', name:'Crystal Hoarder', desc:'Collect 50 crystals total', icon:'💎', check:function(s){return s.totalCrystals >= 50;}},
  {id:'crystals_all', name:'Perfect Run', desc:'Get all crystals in any zone', icon:'⭐', check:function(s){return s._lastPerfect;}},
  {id:'speed_run', name:'Speed Demon', desc:'Complete a zone under 60 seconds', icon:'⏱️', check:function(s){return s._lastSpeedRun;}},
  {id:'no_death', name:'Untouchable', desc:'Complete a zone without dying', icon:'😎', check:function(s){return s._lastNoDeath;}},
  {id:'boss_slayer', name:'Boss Slayer', desc:'Defeat the Temple Guardian', icon:'🐉', check:function(s){return s._bossDefeated;}},
  {id:'all_zones', name:'Temple Master', desc:'Complete all 8 zones', icon:'🏆', check:function(s){return Object.keys(s.levelsCompleted).length >= 8;}},
  {id:'max_upgrade', name:'Fully Upgraded', desc:'Max out any upgrade', icon:'⬆️', check:function(s){for(var k in s.upgrades){var u=UPGRADES.find(function(x){return x.id===k;});if(u&&s.upgrades[k]>=u.maxLevel)return true;}return false;}},
  {id:'gem_collector', name:'Gem Hunter', desc:'Collect 20 gems total', icon:'💠', check:function(s){return s.gems >= 20;}},
  {id:'enemy_slayer', name:'Enemy Crusher', desc:'Defeat 50 enemies total', icon:'💥', check:function(s){return s.totalEnemiesDefeated >= 50;}},
  {id:'level_5', name:'Seasoned Explorer', desc:'Reach player level 5', icon:'🌟', check:function(s){return s.playerLevel >= 5;}},
  {id:'three_star', name:'Star Collector', desc:'Earn 3 stars on any zone', icon:'🌟', check:function(s){for(var k in s.highScores){if(s.highScores[k]&&s.highScores[k].stars>=3)return true;}return false;}}
];

function checkAchievements(extra) {
  var count = 0;
  ACHIEVEMENTS.forEach(function(a) {
    if (!saveData.achievements[a.id] && a.check(saveData)) {
      saveData.achievements[a.id] = true;
      count++;
    }
  });
  if (count > 0) writeSave();
  return count;
}

// ========================
// LEVEL DEFINITIONS (8 LEVELS)
// ========================
function makeLevel(num) {
  var L = {
    num: num, crystals: [], enemies: [], gems: [], platforms: [],
    movingPlatforms: [], spikes: [], ropes: [], waterZones: [],
    lavaZones: [], clouds: [], darkZones: [], fallingLogs: [],
    portal: {x:0,y:0,w:40,h:60}, width: 5000, bgType: 0,
    boss: null, hasBoss: false,
    checkpointCrates: [], tntCrates: []
  };
  var W = L.width;

  switch(num) {
    case 1: // Jungle Entry - Tutorial
      L.bgType = 0; L.width = 4500;
      L.platforms = [
        {x:0,y:520,w:400,h:40},{x:480,y:520,w:300,h:40},{x:860,y:480,w:200,h:40},
        {x:1140,y:520,w:300,h:40},{x:1520,y:460,w:150,h:40},{x:1750,y:520,w:400,h:40},
        {x:2230,y:480,w:200,h:40},{x:2510,y:520,w:300,h:40},{x:2900,y:460,w:200,h:40},
        {x:3180,y:520,w:400,h:40},{x:3660,y:480,w:300,h:40},{x:4040,y:520,w:400,h:40}
      ];
      for(var i=0;i<10;i++) L.crystals.push({x:250+i*400, y:460, collected:false});
      L.gems.push({x:800, y:420, collected:false});
      L.enemies.push({x:600,y:490,w:30,h:30,type:'beetle',dir:1,speed:1.2,alive:true,minX:490,maxX:760});
      L.enemies.push({x:1200,y:490,w:30,h:30,type:'beetle',dir:1,speed:1.2,alive:true,minX:1150,maxX:1420});
      L.enemies.push({x:1900,y:490,w:30,h:30,type:'beetle',dir:-1,speed:1.5,alive:true,minX:1760,maxX:2130});
      L.enemies.push({x:2600,y:490,w:30,h:30,type:'beetle',dir:1,speed:1.3,alive:true,minX:2520,maxX:2790});
      L.enemies.push({x:3300,y:490,w:30,h:30,type:'beetle',dir:-1,speed:1.4,alive:true,minX:3190,maxX:3560});
      L.checkpointCrates.push({x:2000,y:490,w:32,h:32,activated:false});
      L.portal = {x:4350,y:455,w:40,h:60};
      break;

    case 2: // Stone Ruins
      L.bgType = 1; L.width = 5200;
      L.platforms = [
        {x:0,y:520,w:350,h:40},{x:430,y:520,w:250,h:40},{x:760,y:480,w:200,h:40},
        {x:1040,y:520,w:300,h:40},{x:1420,y:440,w:150,h:40},{x:1650,y:520,w:350,h:40},
        {x:2080,y:480,w:200,h:40},{x:2360,y:520,w:300,h:40},{x:2740,y:460,w:200,h:40},
        {x:3020,y:520,w:350,h:40},{x:3450,y:480,w:200,h:40},{x:3730,y:440,w:150,h:40},
        {x:3960,y:520,w:300,h:40},{x:4340,y:480,w:200,h:40},{x:4620,y:520,w:500,h:40}
      ];
      L.spikes = [{x:1100,y:500,w:40,h:20},{x:2780,y:440,w:60,h:20},{x:4400,y:460,w:60,h:20}];
      L.movingPlatforms = [
        {x:1340,y:480,w:80,h:16,minY:440,maxY:520,speed:1.2,dir:1,moving:'y'},
        {x:2900,y:480,w:80,h:16,minY:440,maxY:520,speed:1.5,dir:-1,moving:'y'},
        {x:3600,y:480,w:80,h:16,minX:3450,maxX:3730,speed:1,dir:1,moving:'x'}
      ];
      for(var i=0;i<10;i++) L.crystals.push({x:280+i*460, y:440, collected:false});
      L.gems.push({x:1450,y:380, collected:false});
      L.gems.push({x:3700,y:380, collected:false});
      L.enemies.push({x:500,y:490,w:30,h:30,type:'golem',dir:1,speed:0.8,alive:true,minX:440,maxX:670});
      L.enemies.push({x:1700,y:490,w:35,h:35,type:'golem',dir:-1,speed:0.9,alive:true,minX:1660,maxX:1980});
      L.enemies.push({x:2400,y:490,w:30,h:30,type:'rockThrower',dir:-1,speed:0.6,alive:true,minX:2370,maxX:2640,throwTimer:0,throwCD:120});
      L.enemies.push({x:3100,y:490,w:35,h:35,type:'golem',dir:-1,speed:0.7,alive:true,minX:3030,maxX:3350});
      L.enemies.push({x:4000,y:490,w:30,h:30,type:'beetle',dir:1,speed:1.5,alive:true,minX:3970,maxX:4240});
      L.checkpointCrates.push({x:3500,y:490,w:32,h:32,activated:false});
      L.tntCrates.push({x:1500,y:490,w:28,h:28,exploded:false,timer:0});
      L.tntCrates.push({x:1530,y:490,w:28,h:28,exploded:false,timer:0});
      L.portal = {x:5050,y:455,w:40,h:60};
      break;

    case 3: // Canopy Bridges
      L.bgType = 2; L.width = 5500;
      L.platforms = [
        {x:0,y:520,w:300,h:40},{x:400,y:460,w:180,h:20},{x:680,y:400,w:180,h:20},
        {x:960,y:460,w:180,h:20},{x:1240,y:520,w:300,h:40},{x:1620,y:440,w:180,h:20},
        {x:1900,y:380,w:180,h:20},{x:2180,y:460,w:180,h:20},{x:2460,y:520,w:300,h:40},
        {x:2840,y:440,w:180,h:20},{x:3120,y:380,w:200,h:20},{x:3400,y:460,w:180,h:20},
        {x:3680,y:520,w:300,h:40},{x:4060,y:440,w:180,h:20},{x:4340,y:380,w:200,h:20},
        {x:4620,y:520,w:400,h:40},{x:5100,y:520,w:300,h:40}
      ];
      L.ropes = [{x:860,y:300,len:100},{x:2060,y:280,len:120},{x:3600,y:300,len:110},{x:4500,y:300,len:100}];
      L.fallingLogs = [{x:1540,y:440,w:80,h:20,triggered:false,vy:0,origY:440,fell:false}];
      for(var i=0;i<10;i++) L.crystals.push({x:300+i*500, y:360, collected:false});
      L.gems.push({x:1100,y:340, collected:false});
      L.gems.push({x:3200,y:320, collected:false});
      L.enemies.push({x:1300,y:490,w:30,h:30,type:'beetle',dir:1,speed:1.5,alive:true,minX:1250,maxX:1520});
      L.enemies.push({x:2500,y:490,w:30,h:30,type:'rhino',dir:1,speed:0,alive:true,minX:2470,maxX:2740,charging:false,chargeSpeed:4,maxCharge:300,chargeTimer:0});
      L.enemies.push({x:3700,y:490,w:30,h:30,type:'golem',dir:1,speed:0.9,alive:true,minX:3690,maxX:3960});
      L.enemies.push({x:4700,y:490,w:30,h:30,type:'spider',dir:-1,speed:1.2,alive:true,minX:4630,maxX:5000,jumpTimer:0,jumpCD:80,baseY:490});
      L.checkpointCrates.push({x:2000,y:490,w:32,h:32,activated:false});
      L.tntCrates.push({x:800,y:490,w:28,h:28,exploded:false,timer:0});
      L.tntCrates.push({x:3400,y:490,w:28,h:28,exploded:false,timer:0});
      L.portal = {x:5300,y:455,w:40,h:60};
      break;

    case 4: // Underground Caverns
      L.bgType = 3; L.width = 5800;
      L.platforms = [
        {x:0,y:520,w:400,h:40},{x:480,y:480,w:200,h:40},{x:760,y:520,w:300,h:40},
        {x:1140,y:460,w:200,h:40},{x:1420,y:520,w:300,h:40},{x:1800,y:440,w:200,h:40},
        {x:2080,y:520,w:350,h:40},{x:2510,y:480,w:200,h:40},{x:2790,y:520,w:300,h:40},
        {x:3170,y:460,w:200,h:40},{x:3450,y:520,w:300,h:40},{x:3830,y:440,w:200,h:40},
        {x:4110,y:520,w:350,h:40},{x:4540,y:480,w:200,h:40},{x:4820,y:520,w:300,h:40},
        {x:5200,y:460,w:200,h:40},{x:5480,y:520,w:300,h:40}
      ];
      L.darkZones = [{x:1000,y:0,w:800,h:CH},{x:2600,y:0,w:800,h:CH},{x:4200,y:0,w:800,h:CH}];
      L.spikes = [{x:800,y:500,w:60,h:20},{x:2200,y:500,w:80,h:20},{x:3800,y:500,w:60,h:20},{x:5000,y:500,w:60,h:20}];
      L.movingPlatforms = [
        {x:1360,y:500,w:80,h:16,minX:1140,maxX:1420,speed:1.5,dir:1,moving:'x'},
        {x:2990,y:500,w:80,h:16,minX:2790,maxX:3170,speed:1.8,dir:-1,moving:'x'},
        {x:4700,y:500,w:80,h:16,minY:460,maxY:540,speed:1.3,dir:1,moving:'y'}
      ];
      for(var i=0;i<10;i++) L.crystals.push({x:300+i*540, y:440, collected:false});
      L.gems.push({x:1200,y:380, collected:false},{x:4400,y:380, collected:false});
      L.enemies.push({x:600,y:450,w:30,h:30,type:'bat',dir:1,speed:1.2,alive:true,minX:490,maxX:670,flying:true,baseY:400,flyAmp:40,flySpeed:0.03});
      L.enemies.push({x:1500,y:450,w:30,h:30,type:'bat',dir:-1,speed:1.5,alive:true,minX:1430,maxX:1700,flying:true,baseY:420,flyAmp:50,flySpeed:0.025});
      L.enemies.push({x:2400,y:450,w:30,h:30,type:'golem',dir:1,speed:0.8,alive:true,minX:2090,maxX:2410});
      L.enemies.push({x:3300,y:450,w:30,h:30,type:'bat',dir:-1,speed:1.3,alive:true,minX:3180,maxX:3450,flying:true,baseY:410,flyAmp:45,flySpeed:0.03});
      L.enemies.push({x:4200,y:450,w:30,h:30,type:'golem',dir:1,speed:0.9,alive:true,minX:4120,maxX:4440});
      L.portal = {x:5700,y:455,w:40,h:60};
      break;

    case 5: // Water Temple
      L.bgType = 4; L.width = 5500;
      L.platforms = [
        {x:0,y:520,w:350,h:40},{x:440,y:480,w:120,h:20},{x:660,y:440,w:120,h:20},
        {x:880,y:520,w:250,h:40},{x:1220,y:460,w:120,h:20},{x:1440,y:400,w:120,h:20},
        {x:1660,y:340,w:120,h:20},{x:1880,y:520,w:300,h:40},{x:2260,y:480,w:120,h:20},
        {x:2480,y:420,w:120,h:20},{x:2700,y:520,w:250,h:40},{x:3040,y:460,w:120,h:20},
        {x:3260,y:400,w:120,h:20},{x:3480,y:520,w:300,h:40},{x:3860,y:460,w:120,h:20},
        {x:4080,y:400,w:120,h:20},{x:4300,y:340,w:120,h:20},{x:4520,y:520,w:400,h:40},
        {x:5000,y:520,w:400,h:40}
      ];
      L.waterZones = [{x:400,y:560,w:500,h:140},{x:1800,y:560,w:500,h:140},{x:3400,y:560,w:500,h:140},{x:4500,y:560,w:500,h:140}];
      for(var i=0;i<10;i++) L.crystals.push({x:280+i*520, y:380, collected:false});
      L.gems.push({x:800,y:340, collected:false},{x:3500,y:340, collected:false});
      L.enemies.push({x:1000,y:490,w:30,h:30,type:'beetle',dir:1,speed:1.3,alive:true,minX:890,maxX:1110});
      L.enemies.push({x:2000,y:490,w:30,h:30,type:'bat',dir:-1,speed:1.4,alive:true,minX:1890,maxX:2160,flying:true,baseY:440,flyAmp:40,flySpeed:0.03});
      L.enemies.push({x:2800,y:490,w:30,h:30,type:'beetle',dir:1,speed:1.5,alive:true,minX:2710,maxX:2930});
      L.enemies.push({x:3600,y:490,w:35,h:35,type:'golem',dir:-1,speed:0.8,alive:true,minX:3490,maxX:3760});
      L.enemies.push({x:4700,y:490,w:30,h:30,type:'bat',dir:1,speed:1.6,alive:true,minX:4530,maxX:4900,flying:true,baseY:430,flyAmp:50,flySpeed:0.025});
      L.portal = {x:5300,y:455,w:40,h:60};
      break;

    case 6: // Lava Chambers
      L.bgType = 5; L.width = 6000;
      L.platforms = [
        {x:0,y:520,w:300,h:40},{x:390,y:460,w:150,h:20},{x:620,y:400,w:150,h:20},
        {x:850,y:520,w:250,h:40},{x:1180,y:460,w:150,h:20},{x:1410,y:400,w:150,h:20},
        {x:1640,y:520,w:300,h:40},{x:2020,y:460,w:150,h:20},{x:2250,y:400,w:150,h:20},
        {x:2480,y:520,w:250,h:40},{x:2810,y:460,w:150,h:20},{x:3040,y:400,w:150,h:20},
        {x:3270,y:520,w:300,h:40},{x:3650,y:460,w:150,h:20},{x:3880,y:400,w:150,h:20},
        {x:4110,y:520,w:250,h:40},{x:4440,y:460,w:150,h:20},{x:4670,y:400,w:150,h:20},
        {x:4900,y:520,w:400,h:40},{x:5380,y:480,w:200,h:40},{x:5660,y:520,w:340,h:40}
      ];
      L.lavaZones = [{x:350,y:560,w:600,h:140},{x:1600,y:560,w:600,h:140},{x:3200,y:560,w:600,h:140},{x:4800,y:560,w:600,h:140}];
      L.spikes = [{x:900,y:500,w:50,h:20},{x:2500,y:500,w:50,h:20},{x:4100,y:500,w:50,h:20}];
      for(var i=0;i<10;i++) L.crystals.push({x:250+i*580, y:360, collected:false});
      L.gems.push({x:1500,y:320, collected:false},{x:4300,y:320, collected:false});
      L.enemies.push({x:500,y:430,w:30,h:30,type:'fireBat',dir:1,speed:1.5,alive:true,minX:400,maxX:620,flying:true,baseY:400,flyAmp:30,flySpeed:0.04});
      L.enemies.push({x:1300,y:430,w:30,h:30,type:'fireBat',dir:-1,speed:1.6,alive:true,minX:1160,maxX:1350,flying:true,baseY:390,flyAmp:35,flySpeed:0.035});
      L.enemies.push({x:2100,y:430,w:35,h:35,type:'guard',dir:1,speed:1,alive:true,minX:2030,maxX:2350});
      L.enemies.push({x:2900,y:430,w:30,h:30,type:'fireBat',dir:1,speed:1.7,alive:true,minX:2820,maxX:3040,flying:true,baseY:380,flyAmp:40,flySpeed:0.03});
      L.enemies.push({x:3700,y:430,w:35,h:35,type:'guard',dir:-1,speed:1.1,alive:true,minX:3660,maxX:3980});
      L.enemies.push({x:4500,y:430,w:30,h:30,type:'fireBat',dir:1,speed:1.8,alive:true,minX:4450,maxX:4670,flying:true,baseY:390,flyAmp:35,flySpeed:0.04});
      L.portal = {x:5900,y:455,w:40,h:60};
      break;

    case 7: // Sky Ruins
      L.bgType = 6; L.width = 6000;
      L.platforms = [
        {x:0,y:520,w:250,h:40},{x:340,y:460,w:120,h:20},{x:560,y:380,w:120,h:20},
        {x:780,y:300,w:120,h:20},{x:1000,y:380,w:120,h:20},{x:1220,y:460,w:120,h:20},
        {x:1440,y:520,w:200,h:40},{x:1730,y:440,w:120,h:20},{x:1950,y:360,w:120,h:20},
        {x:2170,y:280,w:120,h:20},{x:2390,y:360,w:120,h:20},{x:2610,y:440,w:120,h:20},
        {x:2830,y:520,w:250,h:40},{x:3170,y:440,w:120,h:20},{x:3390,y:360,w:120,h:20},
        {x:3610,y:280,w:120,h:20},{x:3830,y:360,w:120,h:20},{x:4050,y:440,w:120,h:20},
        {x:4270,y:520,w:250,h:40},{x:4610,y:440,w:120,h:20},{x:4830,y:360,w:120,h:20},
        {x:5050,y:280,w:120,h:20},{x:5270,y:360,w:120,h:20},{x:5490,y:440,w:120,h:20},
        {x:5710,y:520,w:290,h:40}
      ];
      L.clouds = [{x:300,y:250,w:150,h:30},{x:1600,y:220,w:150,h:30},{x:3100,y:230,w:150,h:30},{x:4600,y:220,w:150,h:30}];
      L.movingPlatforms = [
        {x:1680,y:480,w:80,h:16,minY:380,maxY:520,speed:1.5,dir:1,moving:'y'},
        {x:3120,y:480,w:80,h:16,minY:380,maxY:520,speed:1.8,dir:-1,moving:'y'},
        {x:4560,y:480,w:80,h:16,minY:360,maxY:520,speed:2,dir:1,moving:'y'}
      ];
      for(var i=0;i<10;i++) L.crystals.push({x:250+i*570, y:330, collected:false});
      L.gems.push({x:780,y:240, collected:false},{x:3610,y:220, collected:false});
      L.enemies.push({x:1480,y:490,w:30,h:30,type:'bat',dir:1,speed:1.4,alive:true,minX:1450,maxX:1620,flying:true,baseY:430,flyAmp:50,flySpeed:0.03});
      L.enemies.push({x:2400,y:390,w:30,h:30,type:'fireBat',dir:-1,speed:1.5,alive:true,minX:2340,maxX:2500,flying:true,baseY:350,flyAmp:40,flySpeed:0.035});
      L.enemies.push({x:3400,y:390,w:30,h:30,type:'bat',dir:1,speed:1.6,alive:true,minX:3360,maxX:3520,flying:true,baseY:340,flyAmp:50,flySpeed:0.03});
      L.enemies.push({x:4300,y:490,w:35,h:35,type:'guard',dir:-1,speed:1.1,alive:true,minX:4280,maxX:4500});
      L.enemies.push({x:5100,y:390,w:30,h:30,type:'fireBat',dir:1,speed:1.7,alive:true,minX:5040,maxX:5200,flying:true,baseY:340,flyAmp:45,flySpeed:0.04});
      L.portal = {x:5920,y:455,w:40,h:60};
      break;

    case 8: // Heart Chamber - Boss Fight
      L.bgType = 7; L.width = 1200;
      L.platforms = [
        {x:0,y:520,w:1200,h:40},{x:100,y:380,w:150,h:20},{x:400,y:300,w:150,h:20},
        {x:700,y:380,w:150,h:20},{x:950,y:300,w:150,h:20},{x:500,y:180,w:200,h:20}
      ];
      L.movingPlatforms = [
        {x:250,y:440,w:80,h:16,minX:150,maxX:400,speed:1.2,dir:1,moving:'x'},
        {x:800,y:440,w:80,h:16,minX:700,maxX:950,speed:1.5,dir:-1,moving:'x'}
      ];
      for(var i=0;i<8;i++) L.crystals.push({x:100+i*140, y:470, collected:false});
      L.gems.push({x:550,y:130, collected:false});
      L.boss = {
        x:600, y:400, w:60, h:70, hp: 15, maxHp: 15, dir: -1, speed: 1.5,
        phase: 1, attackTimer: 0, attackCooldown: 90, alive: true,
        minX: 50, maxX: 1100, vy: 0, onGround: true,
        jumpTimer: 0, invincible: 0
      };
      L.hasBoss = true;
      L.portal = {x:50,y:440,w:40,h:60}; // Shows after boss defeated
      break;
  }

  // Add 1UP extra lives at specific spots per level
  if (num % 2 === 0) {
    L.crystals.push({x: L.width * 0.6, y: 380, collected: false, isLife: true});
  }

  return L;
}

var LEVEL_NAMES = [
  'Jungle Entry', 'Stone Ruins', 'Canopy Bridges', 'Underground Caverns',
  'Water Temple', 'Lava Chambers', 'Sky Ruins', 'Heart Chamber'
];

var LEVEL_BG_COLORS = [
  ['#1a3a1a','#0d260d','#2a5a2a'],  // Jungle
  ['#2a2a2a','#1a1a1a','#4a3a2a'],  // Stone
  ['#1a2a1a','#0d1a0d','#3a4a2a'],  // Canopy
  ['#0a0a15','#050510','#1a1a2a'],  // Underground
  ['#0a2a3a','#051a25','#1a4a5a'],  // Water
  ['#2a0a0a','#1a0505','#4a1a0a'],  // Lava
  ['#1a1a3a','#0d0d25','#3a3a6a'],  // Sky
  ['#1a0a2a','#0d051a','#3a1a4a']   // Heart
];

// ========================
// GAME STATE
// ========================
var STATE = {
  currentScreen: 'menu',
  playing: false,
  paused: false,
  levelNum: 1,
  level: null,
  camera: {x: 0},
  player: null,
  time: 0,
  startTime: 0,
  frameCount: 0,
  levelDeaths: 0,
  levelCrystals: 0,
  levelGems: 0,
  levelEnemies: 0,
  levelXP: 0,
  input: {left:false,right:false,up:false,down:false,jumpPressed:false,spinPressed:false,slidePressed:false},
  prevInput: {},
  particles: [],
  textPopups: [],
  shakeTimer: 0,
  shakeIntensity: 0,
  gamepadIndex: -1,
  bossPhase: 0,
  bossDead: false,
  flashTimer: 0,
  // NEW: Wall jump, checkpoint, Aku Aku, bonus, gem paths, TNT
  wallSliding: false, wallDir: 0,
  lastCheckpoint: {x:80, y:400},
  akuAkuHits: 0, akuAkuTimer: 0,
  bonusActive: false, bonusTimer: 0, bonusGemsCollected: 0,
  gemPathCollected: 0,
  tntCrates: [], tntChainTimer: 0,
  enemyProjectiles: [],
  checkpointCrates: []
};

function resetPlayer() {
  var spd = UPGRADES[0].effect(saveData.upgrades.speed);
  var jmp = UPGRADES[1].effect(saveData.upgrades.jump);
  STATE.player = {
    x: STATE.lastCheckpoint.x, y: STATE.lastCheckpoint.y, w: 24, h: 36, vx: 0, vy: 0,
    onGround: false, jumpsLeft: 2, maxJumps: 2,
    speed: 3.8 * spd, jumpForce: -11 * jmp,
    facing: 1, spinTimer: 0, spinDuration: 20 * UPGRADES[2].effect(saveData.upgrades.spin),
    sliding: false, slideTimer: 0, groundPounding: false,
    invincible: 0, shieldHits: UPGRADES[3].effect(saveData.upgrades.shield),
    animFrame: 0, animTimer: 0,
    // NEW: Wall jump, Aku Aku state
    wallSliding: false, wallDir: 0, wallTimer: 0,
    akuAkuHits: STATE.akuAkuHits || 0, akuAkuTimer: STATE.akuAkuTimer || 0
  };
}

// ========================
// SCREEN MANAGEMENT
// ========================
function showScreen(name) {
  for (var k in screens) screens[k].classList.remove('active');
  STATE.currentScreen = name;
  if (screens[name]) screens[name].classList.add('active');
  STATE.playing = (name === 'hud');
  STATE.paused = false;
}

// ========================
// UI BUILDERS
// ========================
function buildLevelSelect() {
  var grid = document.getElementById('level-grid');
  grid.innerHTML = '';
  for (var i = 1; i <= 8; i++) {
    var unlocked = i === 1 || saveData.levelsCompleted[i - 1];
    var card = document.createElement('div');
    card.className = 'level-card' + (unlocked ? '' : ' locked');
    var stars = 0;
    if (saveData.highScores[i]) stars = saveData.highScores[i].stars || 0;
    card.innerHTML = '<span class="zone-num">' + (unlocked ? i : '🔒') + '</span>' +
      '<span class="zone-name">' + LEVEL_NAMES[i-1] + '</span>' +
      '<span class="zone-stars">' + (unlocked ? ('★'.repeat(stars) + '☆'.repeat(3-stars)) : '') + '</span>';
    if (unlocked) {
      (function(num) {
        card.addEventListener('click', function() { startLevel(num); });
      })(i);
    }
    grid.appendChild(card);
  }
}

function buildUpgradeShop() {
  var list = document.getElementById('upgrade-list');
  list.innerHTML = '';
  document.getElementById('shop-gems').textContent = saveData.gems;
  UPGRADES.forEach(function(u) {
    var lv = saveData.upgrades[u.id] || 0;
    var maxed = lv >= u.maxLevel;
    var cost = maxed ? '-' : u.costs[lv];
    var item = document.createElement('div');
    item.className = 'upgrade-item';
    item.innerHTML = '<div class="upgrade-info"><div class="upgrade-name">' + u.icon + ' ' + u.name + '</div>' +
      '<div class="upgrade-desc">' + u.desc + '</div>' +
      '<div class="upgrade-level">Level ' + lv + '/' + u.maxLevel + '</div></div>' +
      '<button class="upgrade-buy' + (maxed ? ' maxed' : '') + '">' + (maxed ? 'MAX' : '💎 ' + cost) + '</button>';
    if (!maxed) {
      (function(upgrade, level) {
        item.querySelector('.upgrade-buy').addEventListener('click', function() {
          if (saveData.gems >= upgrade.costs[level]) {
            saveData.gems -= upgrade.costs[level];
            saveData.upgrades[upgrade.id] = level + 1;
            writeSave();
            playSound('gem');
            buildUpgradeShop();
            unlockNotify('upgrade');
          }
        });
      })(u, lv);
    }
    list.appendChild(item);
  });
}

function buildAchievements() {
  var list = document.getElementById('achievement-list');
  list.innerHTML = '';
  ACHIEVEMENTS.forEach(function(a) {
    var unlocked = saveData.achievements[a.id];
    var item = document.createElement('div');
    item.className = 'achievement-item ' + (unlocked ? 'unlocked' : 'locked');
    item.innerHTML = '<div class="ach-icon">' + (unlocked ? a.icon : '🔒') + '</div>' +
      '<div class="ach-info"><div class="ach-name">' + a.name + '</div>' +
      '<div class="ach-desc">' + a.desc + '</div></div>';
    list.appendChild(item);
  });
}

function unlockNotify(type) {
  if (type === 'achievement') {
    addCoins(5);
  }
}

// ========================
// LEVEL MANAGEMENT
// ========================
function startLevel(num) {
  initAudio();
  playSound('button');
  STATE.levelNum = num;
  STATE.level = makeLevel(num);
  STATE.camera = {x: 0};
  STATE.time = 0;
  STATE.startTime = Date.now();
  STATE.frameCount = 0;
  STATE.levelDeaths = 0;
  STATE.levelCrystals = 0;
  STATE.levelGems = 0;
  STATE.levelEnemies = 0;
  STATE.levelXP = 0;
  STATE.bossDead = false;
  STATE.particles = [];
  STATE.textPopups = [];
  STATE.shakeTimer = 0;
 STATE.flashTimer = 0;
  STATE.wallSliding = false; STATE.wallDir = 0;
  STATE.lastCheckpoint = {x:80, y:400};
  STATE.akuAkuHits = 0; STATE.akuAkuTimer = 0;
  STATE.bonusActive = false; STATE.bonusTimer = 0; STATE.bonusGemsCollected = 0;
  STATE.gemPathCollected = 0;
  STATE.tntCrates = []; STATE.tntChainTimer = 0;
  STATE.enemyProjectiles = [];
  STATE.checkpointCrates = [];
  STATE.breakableCrates = [];
  STATE.nitroCrates = [];
  STATE.boulders = [];
  STATE.timeTrialMode = false;
  STATE.timeTrialBest = null;
  // Initialize crates from level data
  if (STATE.level.checkpointCrates) STATE.checkpointCrates = STATE.level.checkpointCrates.map(function(c){return {x:c.x,y:c.y,w:c.w,h:c.h,activated:c.activated||false};});
  if (STATE.level.tntCrates) STATE.tntCrates = STATE.level.tntCrates.map(function(c){return {x:c.x,y:c.y,w:c.w||28,h:c.h||28,exploded:false,timer:0};});
  // Generate breakable crates throughout levels
  generateBreakableCrates();
  // Generate Aku Aku mask pickup in specific levels
  generateAkuAkuMasks();
  // Generate boulders in select levels
  generateBoulders();
  resetPlayer();
  showScreen('hud');
}

function generateBreakableCrates() {
  var lvl = STATE.level;
  STATE.breakableCrates = [];
  var crateCount = 3 + lvl.num;
  for (var i = 0; i < crateCount; i++) {
    var placed = false, tries = 0;
    while (!placed && tries < 50) {
      var cx = 200 + Math.random() * (lvl.width - 400);
      var cy = 400;
      // Find a platform to place on
      for (var j = 0; j < lvl.platforms.length; j++) {
        var pl = lvl.platforms[j];
        if (cx > pl.x && cx < pl.x + pl.w - 30) {
          cy = pl.y - 28;
          STATE.breakableCrates.push({x:cx, y:cy, w:28, h:28, broken:false, type: Math.random()<0.15?'gem':(Math.random()<0.2?'life':'crystal')});
          placed = true; break;
        }
      }
      tries++;
    }
  }
  // Generate nitro crates near TNT
  STATE.nitroCrates = [];
  for (var i = 0; i < STATE.tntCrates.length; i++) {
    var tc = STATE.tntCrates[i];
    STATE.nitroCrates.push({x:tc.x + 60, y:tc.y, w:24, h:24, exploded:false});
    STATE.nitroCrates.push({x:tc.x - 60, y:tc.y, w:24, h:24, exploded:false});
  }
}

function generateAkuAkuMasks() {
  var lvl = STATE.level;
  STATE.akuAkuMasks = [];
  // Place Aku Aku in levels 3, 5, 7
  if (lvl.num === 3 || lvl.num === 5 || lvl.num === 7) {
    var maskX = lvl.width * 0.7;
    var maskY = 400;
    for (var j = 0; j < lvl.platforms.length; j++) {
      var pl = lvl.platforms[j];
      if (maskX > pl.x && maskX < pl.x + pl.w - 30) {
        maskY = pl.y - 30; break;
      }
    }
    STATE.akuAkuMasks.push({x: maskX, y: maskY, w: 30, h: 30, collected: false, bobTimer: 0});
  }
}

function generateBoulders() {
  var lvl = STATE.level;
  STATE.boulders = [];
  if (lvl.num === 2 || lvl.num === 4 || lvl.num === 6) {
    var boulderCount = 2 + Math.floor(lvl.num / 2);
    for (var i = 0; i < boulderCount; i++) {
      var bx = 500 + i * 1200;
      var by = 440;
      for (var j = 0; j < lvl.platforms.length; j++) {
        var pl = lvl.platforms[j];
        if (bx > pl.x && bx < pl.x + pl.w) {
          by = pl.y - 32; break;
        }
      }
      STATE.boulders.push({x: bx, y: by, w: 32, h: 32, vx: 0, vy: 0, active: false, triggered: false, groundY: by});
    }
  }
}

function completeLevel() {
  playSound('levelComplete');
  STATE.playing = false;
  var crystalsGot = STATE.levelCrystals;
  var totalCrystals = STATE.level.crystals.filter(function(c){return !c.isLife;}).length;
  var elapsed = STATE.time;
  var stars = 1;
  if (crystalsGot >= totalCrystals * 0.6) stars = 2;
  if (crystalsGot >= totalCrystals && elapsed < 120) stars = 3;

  var prev = saveData.highScores[STATE.levelNum] || {stars:0,time:999999};
  if (stars > prev.stars) prev.stars = stars;
  if (elapsed < prev.time) prev.time = elapsed;
  saveData.highScores[STATE.levelNum] = prev;
  saveData.levelsCompleted[STATE.levelNum] = true;
  saveData.totalTime += elapsed;

  saveData._lastPerfect = (crystalsGot >= totalCrystals);
  saveData._lastSpeedRun = (elapsed < 60);
  saveData._lastNoDeath = (STATE.levelDeaths === 0);

  // XP
  var xpGained = crystalsGot * 15 + STATE.levelEnemies * 25 + STATE.levelGems * 40 + stars * 50;
  saveData.xp += xpGained;
  STATE.levelXP = xpGained;
  addXP();

  writeSave();
  checkAchievements();

  // Update UI
  document.getElementById('lc-crystals').textContent = crystalsGot + '/' + totalCrystals;
  var mins = Math.floor(elapsed / 60);
  var secs = Math.floor(elapsed % 60);
  document.getElementById('lc-time').textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
  document.getElementById('lc-xp').textContent = '+' + xpGained;
  document.getElementById('lc-gems').textContent = '+' + STATE.levelGems;
  var starsHtml = '';
  for (var i = 0; i < 3; i++) starsHtml += i < stars ? '⭐' : '☆';
  document.getElementById('lc-stars').textContent = starsHtml;

  // Check if last level
  if (STATE.levelNum >= 8) {
    showVictory();
  } else {
    showInterstitial(function() {
      showScreen('levelComplete');
    });
  }
}

function showInterstitial(callback) {
  showScreen('ad');
  var timerEl = document.getElementById('ad-timer');
  var count = 3;
  timerEl.textContent = 'Closing in ' + count + '...';
  var iv = setInterval(function() {
    count--;
    if (count <= 0) {
      clearInterval(iv);
      if (callback) callback();
    } else {
      timerEl.textContent = 'Closing in ' + count + '...';
    }
  }, 1000);
}

function showRewardedAd(callback) {
  showScreen('rewardedAd');
  var timerEl = document.getElementById('reward-timer');
  var btn = document.getElementById('btn-claim-reward');
  btn.style.display = 'none';
  timerEl.style.display = 'block';
  var count = 3;
  timerEl.textContent = 'Wait ' + count + 's...';
  var iv = setInterval(function() {
    count--;
    if (count <= 0) {
      clearInterval(iv);
      timerEl.style.display = 'none';
      btn.style.display = 'block';
      btn.onclick = function() {
        playSound('gem');
        saveData.lives++;
        writeSave();
        if (callback) callback();
      };
    } else {
      timerEl.textContent = 'Wait ' + count + 's...';
    }
  }, 1000);
}

function showGameOver() {
  STATE.playing = false;
  playSound('death');
  document.getElementById('go-score').textContent = STATE.levelXP + STATE.levelEnemies * 25 + STATE.levelGems * 40;
  document.getElementById('go-crystals').textContent = STATE.levelCrystals;
  showScreen('gameover');
}

function showVictory() {
  playSound('levelComplete');
  saveData._bossDefeated = true;
  checkAchievements();
  writeSave();
  document.getElementById('v-score').textContent = saveData.xp;
  document.getElementById('v-crystals').textContent = saveData.totalCrystals;
  var totalMins = Math.floor(saveData.totalTime / 60);
  var totalSecs = Math.floor(saveData.totalTime % 60);
  document.getElementById('v-time').textContent = totalMins + 'm ' + totalSecs + 's';
  document.getElementById('v-achievements').textContent = Object.keys(saveData.achievements).length + '/' + ACHIEVEMENTS.length;
  addCoins(20);
  showScreen('victory');
}

function addXP() {
  var thresholds = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000, 5500, 7500, 10000];
  while (saveData.playerLevel < thresholds.length && saveData.xp >= thresholds[saveData.playerLevel]) {
    saveData.playerLevel++;
    playSound('levelUp');
    STATE.textPopups.push({text: 'LEVEL UP! Lv.' + saveData.playerLevel, x: CW/2, y: CH/2, timer: 120, color: '#ff0'});
  }
}

// ========================
// PARTICLE SYSTEM
// ========================
function spawnParticles(x, y, color, count, spread) {
  spread = spread || 3;
  for (var i = 0; i < count; i++) {
    STATE.particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * spread * 2,
      vy: (Math.random() - 1) * spread,
      life: 30 + Math.random() * 30,
      color: color,
      size: 2 + Math.random() * 3
    });
  }
}

function spawnTextPopup(x, y, text, color) {
  STATE.textPopups.push({text: text, x: x, y: y, timer: 60, color: color || '#fff', vy: -1.5});
}

// ========================
// INPUT HANDLING
// ========================
var keys = {};
document.addEventListener('keydown', function(e) {
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyX','KeyZ'].indexOf(e.code) >= 0) e.preventDefault();
  initAudio();

  if (STATE.playing && !STATE.paused) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') STATE.input.jumpPressed = true;
    if (e.code === 'KeyX' || e.code === 'KeyZ') STATE.input.spinPressed = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') STATE.input.slidePressed = true;
  }
  if (STATE.paused && e.code === 'Escape') resumeGame();
  if (STATE.playing && !STATE.paused && e.code === 'Escape') pauseGame();
});
document.addEventListener('keyup', function(e) {
  keys[e.code] = false;
});

function updateInput() {
  STATE.prevInput = JSON.parse(JSON.stringify(STATE.input));
  STATE.input.left = keys['ArrowLeft'] || keys['KeyA'];
  STATE.input.right = keys['ArrowRight'] || keys['KeyD'];
  STATE.input.up = keys['ArrowUp'] || keys['KeyW'];
  STATE.input.down = keys['ArrowDown'] || keys['KeyS'];
}

// Touch controls
function setupTouch(id, field) {
  var el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('touchstart', function(e) { e.preventDefault(); initAudio(); STATE.input[field] = true; if(field==='jumpPressed'||field==='spinPressed'||field==='slidePressed') STATE.input[field]=true; });
  el.addEventListener('touchend', function(e) { e.preventDefault(); STATE.input[field] = false; });
}
setupTouch('touch-left', 'left');
setupTouch('touch-right', 'right');
setupTouch('touch-jump', 'jumpPressed');
setupTouch('touch-spin', 'spinPressed');
setupTouch('touch-slide', 'slidePressed');

// Gamepad
window.addEventListener('gamepadconnected', function(e) {
  STATE.gamepadIndex = e.gamepad.index;
});
window.addEventListener('gamepaddisconnected', function(e) {
  if (STATE.gamepadIndex === e.gamepad.index) STATE.gamepadIndex = -1;
});

function updateGamepad() {
  if (STATE.gamepadIndex < 0) return;
  var gp = navigator.getGamepads()[STATE.gamepadIndex];
  if (!gp) return;
  var deadzone = 0.2;
  STATE.input.left = gp.axes[0] < -deadzone || gp.buttons[14].pressed;
  STATE.input.right = gp.axes[0] > deadzone || gp.buttons[15].pressed;
  STATE.input.down = gp.axes[1] > deadzone || gp.buttons[6].pressed;

  // Jump (A = button 0)
  if (gp.buttons[0].pressed && !STATE._gpJump) { STATE.input.jumpPressed = true; STATE._gpJump = true; }
  else if (!gp.buttons[0].pressed) STATE._gpJump = false;

  // Spin (X = button 2)
  if (gp.buttons[2].pressed && !STATE._gpSpin) { STATE.input.spinPressed = true; STATE._gpSpin = true; }
  else if (!gp.buttons[2].pressed) STATE._gpSpin = false;

  // Slide (B = button 1)
  if (gp.buttons[1].pressed && !STATE._gpSlide) { STATE.input.slidePressed = true; STATE._gpSlide = true; }
  else if (!gp.buttons[1].pressed) STATE._gpSlide = false;

  // Start = pause
  if (gp.buttons[9].pressed && !STATE._gpStart) {
    STATE._gpStart = true;
    if (STATE.paused) resumeGame(); else if (STATE.playing) pauseGame();
  } else if (!gp.buttons[9].pressed) STATE._gpStart = false;
}

// ========================
// PHYSICS & COLLISION
// ========================
function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function isOnPlatform(px, py, pw, ph, plat) {
  return px + pw > plat.x && px < plat.x + plat.w && py + ph >= plat.y && py + ph <= plat.y + 12;
}

function handlePlayerPhysics() {
  var p = STATE.player;
  var lvl = STATE.level;

  // Movement
  if (!p.groundPounding) {
    if (STATE.input.left) { p.vx = -p.speed; p.facing = -1; }
    else if (STATE.input.right) { p.vx = p.speed; p.facing = 1; }
    else { p.vx *= 0.75; if (Math.abs(p.vx) < 0.1) p.vx = 0; }
  }

  // Sliding
  if (STATE.input.slidePressed && p.onGround && !p.sliding && !p.groundPounding) {
    p.sliding = true;
    p.slideTimer = 25;
    p.h = 20;
    p.y += 16;
    playSound('slide');
    STATE.input.slidePressed = false;
  }
  if (p.sliding) {
    p.slideTimer--;
    p.vx = p.facing * p.speed * 1.6;
    if (p.slideTimer <= 0) {
      p.sliding = false;
      p.h = 36;
      p.y -= 16;
    }
  }

  // Jump
  if (STATE.input.jumpPressed) {
    if (STATE.input.down && !p.onGround && p.jumpsLeft < p.maxJumps) {
      // Ground pound
      p.groundPounding = true;
      p.vy = 14;
      p.vx = 0;
      STATE.input.jumpPressed = false;
      playSound('groundPound');
    } else if (p.jumpsLeft > 0) {
      if (p.jumpsLeft === p.maxJumps) {
        p.vy = p.jumpForce;
        playSound('jump');
      } else {
        p.vy = p.jumpForce * 0.85;
        playSound('doubleJump');
        spawnParticles(p.x + p.w/2, p.y + p.h, '#fff', 5, 2);
      }
      p.jumpsLeft--;
      p.onGround = false;
      p.groundPounding = false;
      STATE.input.jumpPressed = false;
    }
  }

  // Wall sliding & wall jumping
  if (!p.onGround && !p.sliding && !p.groundPounding && p.vy >= 0) {
    var allPlatsW = lvl.platforms.slice();
    lvl.movingPlatforms.forEach(function(mp) { allPlatsW.push({x:mp.x,y:mp.y,w:mp.w,h:mp.h}); });
    STATE.wallSliding = false;
    allPlatsW.forEach(function(plat) {
      if (p.y + p.h > plat.y && p.y + p.h < plat.y + 10 &&
          ((p.x + p.w > plat.x - 2 && p.x < plat.x + 5) ||
           (p.x > plat.x + plat.w - 5 && p.x + p.w < plat.x + plat.w + 2))) {
        STATE.wallSliding = true;
        STATE.wallDir = (p.x + p.w/2 < plat.x + plat.w/2) ? -1 : 1;
        p.vy = Math.min(p.vy, 1.5);
        p.jumpsLeft = 1;
      }
    });
  }
  if (STATE.wallSliding) {
    p.vy += 0.3;
    p.jumpsLeft = 1;
    spawnParticles(p.x + (STATE.wallDir > 0 ? 0 : p.w), p.y + p.h/2, '#8af', 1, 1);
    if (!STATE.input.left && !STATE.input.right) {
      STATE.wallSliding = false;
    }
  }

  // Wall jump
  if (STATE.wallSliding && STATE.input.jumpPressed) {
    STATE.wallSliding = false;
    p.vy = p.jumpForce * 0.9;
    p.vx = -STATE.wallDir * p.speed * 1.2;
    p.facing = -STATE.wallDir;
    p.jumpsLeft = 0;
    STATE.input.jumpPressed = false;
    playSound('doubleJump');
    spawnParticles(p.x + p.w/2, p.y + p.h, '#fff', 6, 2);
  }

  // Spin
  if (STATE.input.spinPressed && p.spinTimer <= 0) {
    p.spinTimer = p.spinDuration;
    STATE.input.spinPressed = false;
    playSound('spin');
  }

  // Gravity
  if (!p.groundPounding) {
    p.vy += GRAVITY;
    if (p.vy > 12) p.vy = 12;
  }

  // Move X
  p.x += p.vx;
  p.onGround = false;

  // Platform collision X
  var allPlats = lvl.platforms.slice();
  lvl.movingPlatforms.forEach(function(mp) { allPlats.push({x:mp.x,y:mp.y,w:mp.w,h:mp.h}); });

  allPlats.forEach(function(plat) {
    if (rectCollide(p, plat)) {
      if (p.vx > 0) p.x = plat.x - p.w;
      else if (p.vx < 0) p.x = plat.x + plat.w;
      p.vx = 0;
    }
  });

  // Move Y
  p.y += p.vy;

  allPlats.forEach(function(plat) {
    if (rectCollide(p, plat)) {
      if (p.vy > 0) {
        p.y = plat.y - p.h;
        p.vy = 0;
        p.onGround = true;
        p.jumpsLeft = p.maxJumps;
        if (p.groundPounding) {
          p.groundPounding = false;
          STATE.shakeTimer = 8;
          STATE.shakeIntensity = 4;
          playSound('groundPound');
          spawnParticles(p.x + p.w/2, p.y + p.h, '#fff', 12, 4);
        }
      } else if (p.vy < 0) {
        p.y = plat.y + plat.h;
        p.vy = 0;
      }
    }
  });

  // Moving platform ride
  lvl.movingPlatforms.forEach(function(mp) {
    if (p.onGround && isOnPlatform(p.x, p.y, p.w, p.h, {x:mp.x,y:mp.y,w:mp.w,h:mp.h})) {
      if (mp.moving === 'x') p.x += mp.speed * mp.dir;
      if (mp.moving === 'y') p.y += mp.speed * mp.dir;
    }
  });

  // World bounds
  if (p.x < 0) p.x = 0;
  if (p.x > lvl.width - p.w) p.x = lvl.width - p.w;

  // Fall death
  if (p.y > CH + 50) {
    playerDie();
    return;
  }

  // Spin timer
  if (p.spinTimer > 0) p.spinTimer--;

  // Invincibility
  if (p.invincible > 0) p.invincible--;

  // Animation
  if (Math.abs(p.vx) > 0.5 && p.onGround) {
    p.animTimer++;
    if (p.animTimer > 6) { p.animTimer = 0; p.animFrame = (p.animFrame + 1) % 4; }
  } else {
    p.animFrame = 0;
  }

  // Update camera
  var targetCam = p.x - CW * 0.35;
  STATE.camera.x += (targetCam - STATE.camera.x) * 0.1;
  if (STATE.camera.x < 0) STATE.camera.x = 0;
  if (STATE.camera.x > lvl.width - CW) STATE.camera.x = lvl.width - CW;

  // Crystal collection
  lvl.crystals.forEach(function(c) {
    if (!c.collected && Math.abs(p.x + p.w/2 - c.x) < 24 && Math.abs(p.y + p.h/2 - c.y) < 24) {
      c.collected = true;
      STATE.levelCrystals++;
      saveData.totalCrystals++;
      STATE.levelXP += 15;
      if (c.isLife) {
        saveData.lives++;
        spawnTextPopup(c.x, c.y, '+1 LIFE', '#f44');
        spawnParticles(c.x, c.y, '#f44', 10, 3);
        playSound('gem');
      } else {
        spawnParticles(c.x, c.y, '#0ff', 8, 2);
        spawnTextPopup(c.x, c.y, '+15 XP', '#0ff');
        playSound('collect');
      }
    }
  });

  // Gem collection
  lvl.gems.forEach(function(g) {
    if (!g.collected && Math.abs(p.x + p.w/2 - g.x) < 24 && Math.abs(p.y + p.h/2 - g.y) < 24) {
      g.collected = true;
      STATE.levelGems++;
      saveData.gems++;
      spawnParticles(g.x, g.y, '#f0f', 12, 3);
      spawnTextPopup(g.x, g.y, '+1 GEM', '#f0f');
      playSound('gem');
    }
  });

  // Spike collision
  lvl.spikes.forEach(function(s) {
    if (rectCollide(p, s) && p.invincible <= 0) playerHurt();
  });

  // Water zones
  var inWater = false;
  lvl.waterZones.forEach(function(w) {
    if (p.x + p.w > w.x && p.x < w.x + w.w && p.y + p.h > w.y + 10) {
      inWater = true;
      p.vy -= 0.3; // Slow fall in water
      if (p.vy < -3) p.vy = -3;
      p.speed = 2.5; // Slow in water
    }
  });
  if (!inWater && p.speed < 3.8 * UPGRADES[0].effect(saveData.upgrades.speed) - 0.1) {
    p.speed = 3.8 * UPGRADES[0].effect(saveData.upgrades.speed);
  }

  // Lava zones
  lvl.lavaZones.forEach(function(w) {
    if (p.x + p.w > w.x && p.x < w.x + w.w && p.y + p.h > w.y + 10 && p.invincible <= 0) {
      playerHurt();
      p.vy = -8;
    }
  });

  // Portal check
  if (!lvl.hasBoss || STATE.bossDead) {
    if (rectCollide(p, lvl.portal)) completeLevel();
  }

  // Boss fight
  if (lvl.hasBoss && lvl.boss && lvl.boss.alive) {
    handleBoss(p, lvl.boss);
  }

  // Checkpoint crates
  STATE.checkpointCrates.forEach(function(cc) {
    if (!cc.activated && rectCollide(p, cc)) {
      cc.activated = true;
      STATE.lastCheckpoint = {x: cc.x, y: cc.y - 10};
      spawnParticles(cc.x + cc.w/2, cc.y + cc.h/2, '#0f0', 15, 3);
      spawnTextPopup(cc.x, cc.y - 20, 'CHECKPOINT!', '#0f0');
      playSound('collect');
    }
  });

  // Breakable crates
  STATE.breakableCrates.forEach(function(crate) {
    if (crate.broken) return;
    if (rectCollide(p, crate)) {
      var breakFromAbove = p.vy > 2 && p.y + p.h - crate.y < 15;
      if (p.spinTimer > 0 || breakFromAbove || p.groundPounding) {
        crate.broken = true;
        STATE.shakeTimer = 4; STATE.shakeIntensity = 2;
        spawnParticles(crate.x + crate.w/2, crate.y + crate.h/2, '#c84', 10, 3);
        playSound('enemyDefeat');
        STATE.levelXP += 10;
        // Reward based on type
        switch (crate.type) {
          case 'gem':
            STATE.levelGems++; saveData.gems++;
            spawnTextPopup(crate.x, crate.y - 15, '+1 GEM', '#f0f'); playSound('gem'); break;
          case 'life':
            saveData.lives++;
            spawnTextPopup(crate.x, crate.y - 15, '+1 LIFE!', '#f44'); playSound('gem'); break;
          case 'crystal': default:
            STATE.levelCrystals++; saveData.totalCrystals++;
            spawnTextPopup(crate.x, crate.y - 15, '+1 CRYSTAL', '#0ff'); playSound('collect'); break;
        }
      }
    }
  });

  // Aku Aku masks
  if (STATE.akuAkuMasks) {
    STATE.akuAkuMasks.forEach(function(mask) {
      if (mask.collected) return;
      mask.bobTimer += 0.05;
      if (rectCollide(p, mask)) {
        mask.collected = true;
        STATE.akuAkuHits = Math.min(STATE.akuAkuHits + 1, 3);
        STATE.akuAkuTimer = 600; // 10 seconds at 60fps
        spawnParticles(mask.x + mask.w/2, mask.y + mask.h/2, '#ff0', 20, 4);
        spawnTextPopup(mask.x, mask.y - 20, 'AKU AKU!', '#ff0');
        playSound('gem');
      }
    });
  }

  // Aku Aku timer
  if (STATE.akuAkuTimer > 0) {
    STATE.akuAkuTimer--;
    if (STATE.akuAkuTimer <= 0) {
      STATE.akuAkuHits = 0;
    }
    p.akuAkuHits = STATE.akuAkuHits;
    p.akuAkuTimer = STATE.akuAkuTimer;
  }

  // TNT crates - chain reaction
  STATE.tntCrates.forEach(function(tc) {
    if (tc.exploded && tc.timer <= 0) return;
    var hitFromAbove = p.vy > 2 && p.y + p.h - tc.y < 15;
    var spinHit = p.spinTimer > 0 && rectCollide(p, tc);
    var groundPoundHit = p.groundPounding && rectCollide(p, tc);
    if (spinHit || hitFromAbove || groundPoundHit) {
      tc.exploded = true;
      tc.timer = 30; // Countdown to explosion
      STATE.shakeTimer = 6; STATE.shakeIntensity = 4;
      playSound('hurt');
      spawnParticles(tc.x + tc.w/2, tc.y + tc.h/2, '#f80', 8, 3);
    }
    if (tc.timer > 0) {
      tc.timer--;
      if (tc.timer <= 0) {
        // EXPLODE!
        STATE.shakeTimer = 12; STATE.shakeIntensity = 8;
        spawnParticles(tc.x + tc.w/2, tc.y + tc.h/2, '#ff0', 30, 6);
        spawnParticles(tc.x + tc.w/2, tc.y + tc.h/2, '#f80', 20, 5);
        playSound('death');
        // Damage nearby enemies
        STATE.level.enemies.forEach(function(e) {
          if (e.alive) {
            var dx = e.x - tc.x, dy = e.y - tc.y;
            if (dx*dx + dy*dy < 120*120) {
              e.alive = false;
              STATE.levelEnemies++; saveData.totalEnemiesDefeated++;
              spawnParticles(e.x + e.w/2, e.y + e.h/2, getEnemyColor(e.type), 15, 4);
              spawnTextPopup(e.x, e.y - 10, '+25 XP', '#ff0');
              STATE.levelXP += 25;
            }
          }
        });
        // Chain to nearby nitro crates
        STATE.nitroCrates.forEach(function(nc) {
          if (!nc.exploded) {
            var dx = nc.x - tc.x, dy = nc.y - tc.y;
            if (dx*dx + dy*dy < 200*200) {
              nc.timer = 10; // Chain reaction!
              nc.exploded = true;
            }
          }
        });
        // Damage player if too close
        var pdx = p.x + p.w/2 - tc.x, pdy = p.y + p.h/2 - tc.y;
        if (pdx*pdx + pdy*pdy < 80*80 && p.invincible <= 0) {
          if (STATE.akuAkuHits > 0) { STATE.akuAkuHits--; STATE.akuAkuTimer = 600; }
          else playerHurt();
        }
      }
    }
  });

  // Nitro crate explosions
  STATE.nitroCrates.forEach(function(nc) {
    if (!nc.exploded) return;
    if (nc.timer > 0) {
      nc.timer--;
      if (nc.timer <= 0) {
        STATE.shakeTimer = 10; STATE.shakeIntensity = 6;
        spawnParticles(nc.x + nc.w/2, nc.y + nc.h/2, '#f0f', 25, 5);
        playSound('death');
        // Chain to other nitro
        STATE.nitroCrates.forEach(function(nc2) {
          if (!nc2.exploded && nc2 !== nc) {
            var dx = nc2.x - nc.x, dy = nc2.y - nc.y;
            if (dx*dx + dy*dy < 150*150) {
              nc2.timer = 8; nc2.exploded = true;
            }
          }
        });
        // TNT chain reaction
        STATE.tntCrates.forEach(function(tc2) {
          if (!tc2.exploded) {
            var dx = tc2.x - nc.x, dy = tc2.y - nc.y;
            if (dx*dx + dy*dy < 150*150) {
              tc2.exploded = true; tc2.timer = 15;
            }
          }
        });
        var pdx = p.x + p.w/2 - nc.x, pdy = p.y + p.h/2 - nc.y;
        if (pdx*pdx + pdy*pdy < 100*100 && p.invincible <= 0) {
          if (STATE.akuAkuHits > 0) { STATE.akuAkuHits--; STATE.akuAkuTimer = 600; }
          else playerHurt();
        }
      }
    }
  });

  // Boulders
  STATE.boulders.forEach(function(b) {
    if (!b.triggered) {
      var dist = Math.abs(p.x + p.w/2 - b.x);
      if (dist < 80 && p.x + p.w/2 < b.x) {
        b.triggered = true;
        b.active = true;
        b.vx = -3 - Math.random() * 2;
        playSound('boss');
 }
    }
    if (b.active) {
      b.x += b.vx;
      b.vy += GRAVITY;
      b.y += b.vy;
      // Ground collision
      lvl.platforms.forEach(function(pl) {
        if (b.x + b.w > pl.x && b.x < pl.x + pl.w && b.y + b.h >= pl.y && b.y + b.h <= pl.y + 10) {
          b.y = pl.y - b.h;
          b.vy = 0;
        }
      });
      // Player collision
      if (rectCollide(p, b) && p.invincible <= 0) {
        if (STATE.akuAkuHits > 0) { STATE.akuAkuHits--; STATE.akuAkuTimer = 600; }
        else playerHurt();
 }
      // Kill enemies
      STATE.level.enemies.forEach(function(e) {
        if (e.alive && rectCollide(b, e)) {
          e.alive = false;
          STATE.levelEnemies++; saveData.totalEnemiesDefeated++;
          spawnParticles(e.x + e.w/2, e.y + e.h/2, getEnemyColor(e.type), 12, 4);
          STATE.levelXP += 25;
        }
      });
      // Destroy breakable crates
      STATE.breakableCrates.forEach(function(cr) {
        if (!cr.broken && rectCollide(b, cr)) {
          cr.broken = true;
          spawnParticles(cr.x + cr.w/2, cr.y + cr.h/2, '#c84', 8, 3);
        }
      });
      if (b.x < -50 || b.y > CH + 50) b.active = false;
    }
  });

  // Enemy projectiles (rock throwers)
  STATE.level.enemies.forEach(function(e) {
    if (e.type === 'rockThrower' && e.alive) {
      e.throwTimer = (e.throwTimer || 0) + 1;
      if (e.throwTimer >= (e.throwCD || 120)) {
        e.throwTimer = 0;
        var dx = p.x - e.x, dy = p.y - e.y;
        var dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 350 && dist > 30) {
          STATE.enemyProjectiles.push({x:e.x+e.w/2, y:e.y+e.h/2, vx:(dx/dist)*4, vy:(dy/dist)*4, life:90, w:8, h:8});
        }
      }
    }
  });
  STATE.enemyProjectiles.forEach(function(proj) {
    proj.x += proj.vx; proj.y += proj.vy; proj.life--;
    if (proj.life <= 0) return;
    if (rectCollide(p, proj) && p.invincible <= 0) {
      if (STATE.akuAkuHits > 0) { STATE.akuAkuHits--; STATE.akuAkuTimer = 600; }
      else playerHurt();
    }
  });
  STATE.enemyProjectiles = STATE.enemyProjectiles.filter(function(pr) { return pr.life > 0; });

  // Rhino charge behavior
  STATE.level.enemies.forEach(function(e) {
    if (e.type === 'rhino' && e.alive) {
      var dx = p.x - e.x;
      if (Math.abs(dx) < 200 && !e.charging) {
        e.charging = true;
        e.chargeTimer = 30;
      }
      if (e.charging) {
        e.chargeTimer--;
        e.vx = (dx > 0 ? 1 : -1) * e.chargeSpeed;
        e.x += e.vx;
        if (e.chargeTimer <= 0) {
          e.charging = false;
          e.chargeSpeed = 0;
        }
        if (e.x <= e.minX || e.x >= e.maxX) {
          e.charging = false;
          e.chargeSpeed = 0;
        }
        // Spin kills charging rhino
        if (p.spinTimer > 0 && rectCollide(p, e)) {
          e.alive = false;
          STATE.levelEnemies++; saveData.totalEnemiesDefeated++;
          spawnParticles(e.x + e.w/2, e.y + e.h/2, '#a86', 15, 4);
          spawnTextPopup(e.x, e.y - 10, '+50 XP', '#ff0');
          STATE.levelXP += 50;
          playSound('enemyDefeat');
        }
      }
 }
  });

  // Spider jump behavior
  STATE.level.enemies.forEach(function(e) {
    if (e.type === 'spider' && e.alive) {
      e.jumpTimer = (e.jumpTimer || 0) + 1;
      if (e.jumpTimer >= (e.jumpCD || 80)) {
        e.jumpTimer = 0;
        var dx = p.x - e.x;
        if (Math.abs(dx) < 150) {
          e.vy = -6;
        }
      }
      if (e.vy !== undefined) {
        e.vy = (e.vy || 0) + GRAVITY;
        e.y += e.vy;
      }
      var groundY = e.baseY || 490;
      if (e.y >= groundY) {
        e.y = groundY; e.vy = 0;
      }
    }
  });
}

function playerHurt() {
  var p = STATE.player;
  if (p.invincible > 0) return;
  if (p.shieldHits > 0) {
    p.shieldHits--;
    p.invincible = 60;
    STATE.shakeTimer = 6;
    STATE.shakeIntensity = 3;
    spawnParticles(p.x + p.w/2, p.y + p.h/2, '#0af', 10, 3);
    playSound('hurt');
    return;
  }
  p.invincible = 60;
  STATE.shakeTimer = 8;
  STATE.shakeIntensity = 5;
  STATE.flashTimer = 15;
  playSound('hurt');
  saveData.totalDeaths++;
  STATE.levelDeaths++;
  saveData.lives--;
  writeSave();
  spawnParticles(p.x + p.w/2, p.y + p.h/2, '#f00', 15, 4);
  if (saveData.lives <= 0) {
    showGameOver();
  }
}

function playerDie() {
  STATE.shakeTimer = 12;
  STATE.shakeIntensity = 6;
  playSound('death');
  saveData.totalDeaths++;
  STATE.levelDeaths++;
  saveData.lives--;
  writeSave();
  if (saveData.lives <= 0) {
    showGameOver();
    return;
  }
  // Respawn at checkpoint
  STATE.player.x = STATE.lastCheckpoint.x;
  STATE.player.y = STATE.lastCheckpoint.y;
  STATE.player.vx = 0;
  STATE.player.vy = 0;
  STATE.player.invincible = 90;
  STATE.camera.x = 0;
}

// ========================
// ENEMY AI
// ========================
function updateEnemies() {
  var p = STATE.player;
  STATE.level.enemies.forEach(function(e) {
    if (!e.alive) return;

    // Movement
    if (e.flying) {
      e.timer = (e.timer || 0) + 1;
      e.y = e.baseY + Math.sin(e.timer * (e.flySpeed || 0.03)) * (e.flyAmp || 40);
      e.x += e.speed * e.dir;
      if (e.x <= e.minX || e.x + e.w >= e.maxX) e.dir *= -1;
    } else if (e.type !== 'rhino' && e.type !== 'spider') {
      e.x += e.speed * e.dir;
      if (e.x <= e.minX || e.x + e.w >= e.maxX) e.dir *= -1;
    }
    // Guard patrol behavior - faster when player near
    if (e.type === 'guard') {
      var distToP = Math.abs(STATE.player.x - e.x);
      if (distToP < 200) {
        e.speed = 1.8;
      } else {
        e.speed = 1;
      }
    }
    // FireBat periodically shoots fireballs
    if (e.type === 'fireBat' && e.alive) {
      e.shootTimer = (e.shootTimer || 0) + 1;
      if (e.shootTimer >= 150) {
        e.shootTimer = 0;
        var fdx = STATE.player.x - e.x, fdy = STATE.player.y - e.y;
        var fdist = Math.sqrt(fdx*fdx + fdy*fdy);
        if (fdist < 300) {
          STATE.enemyProjectiles.push({x:e.x+e.w/2, y:e.y+e.h/2, vx:(fdx/fdist)*3, vy:(fdy/fdist)*3, life:80, w:6, h:6, fire:true});
        }
      }
    }

    // Player collision
    if (p.invincible <= 0 && rectCollide(p, e)) {
      // Spin attack or ground pound kills
      if (p.spinTimer > 0 || p.groundPounding || (p.vy > 2 && p.y + p.h - e.y < 15)) {
        e.alive = false;
        STATE.levelEnemies++;
        saveData.totalEnemiesDefeated++;
        STATE.levelXP += 25;
        spawnParticles(e.x + e.w/2, e.y + e.h/2, getEnemyColor(e.type), 12, 3);
        spawnTextPopup(e.x, e.y - 10, '+25 XP', '#ff0');
        playSound('enemyDefeat');
        p.vy = -8; // Bounce
      } else {
        playerHurt();
      }
    }
  });

  // Moving platforms
  STATE.level.movingPlatforms.forEach(function(mp) {
    if (mp.moving === 'y') {
      mp.y += mp.speed * mp.dir;
      if (mp.y <= mp.minY || mp.y >= mp.maxY) mp.dir *= -1;
    }
    if (mp.moving === 'x') {
      mp.x += mp.speed * mp.dir;
      if (mp.x <= mp.minX || mp.x >= mp.maxX) mp.dir *= -1;
    }
  });

  // Falling logs
  STATE.level.fallingLogs.forEach(function(fl) {
    if (!fl.triggered) {
      var dist = Math.abs(STATE.player.x - fl.x);
      if (dist < 60) fl.triggered = true;
    }
    if (fl.triggered && !fl.fell) {
      fl.vy += 0.3;
      fl.y += fl.vy;
      if (fl.y > CH + 50) fl.fell = true;
    }
  });
}

function getEnemyColor(type) {
  switch(type) {
    case 'beetle': return '#0a0';
    case 'golem': return '#886';
    case 'bat': return '#808';
    case 'fireBat': return '#f80';
    case 'guard': return '#c00';
    case 'rockThrower': return '#886';
    case 'spider': return '#333';
    case 'rhino': return '#a86';
    default: return '#fff';
  }
}

// ========================
// BOSS AI
// ========================
function handleBoss(p, boss) {
  if (!boss.alive) return;

  boss.attackTimer++;
  if (boss.invincible > 0) boss.invincible--;

  // Movement
  var dist = p.x - boss.x;
  if (Math.abs(dist) > 40) {
    boss.x += boss.speed * (dist > 0 ? 1 : -1);
  }

  // Boss gravity
  boss.vy += GRAVITY;
  boss.y += boss.vy;
  STATE.level.platforms.forEach(function(plat) {
    if (boss.x + boss.w > plat.x && boss.x < plat.x + plat.w && boss.y + boss.h >= plat.y && boss.y + boss.h <= plat.y + 16) {
      boss.y = plat.y - boss.h;
      boss.vy = 0;
    }
  });

  // Boss attacks
  var phaseMultiplier = boss.hp < boss.maxHp * 0.3 ? 2 : (boss.hp < boss.maxHp * 0.6 ? 1.5 : 1);
  var cooldown = Math.floor(boss.attackCooldown / phaseMultiplier);

  if (boss.attackTimer >= cooldown) {
    boss.attackTimer = 0;
    // Jump attack
    if (boss.onGround || boss.y + boss.h >= 515) {
      boss.vy = -13 - Math.random() * 3;
      boss.onGround = false;
      playSound('boss');
    }
    // Fire projectile
    if (boss.hp < boss.maxHp * 0.5 && Math.random() < 0.4) {
      spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#f80', 5, 2);
    }
  }

  // Player collision with boss
  if (p.invincible <= 0 && rectCollide(p, boss)) {
    if (p.spinTimer > 0 || p.groundPounding || (p.vy > 2 && p.y + p.h - boss.y < 20)) {
      if (boss.invincible <= 0) {
        boss.hp--;
        boss.invincible = 30;
        STATE.levelXP += 50;
        spawnParticles(boss.x + boss.w/2, boss.y, '#ff0', 15, 4);
        spawnTextPopup(boss.x, boss.y - 20, '-1 HP', '#f80');
        playSound('enemyDefeat');
        STATE.shakeTimer = 8;
        STATE.shakeIntensity = 5;
        p.vy = -10;

        if (boss.hp <= 0) {
          boss.alive = false;
          STATE.bossDead = true;
          saveData._bossDefeated = true;
          saveData.totalEnemiesDefeated++;
          STATE.levelXP += 200;
          spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#f80', 40, 6);
          spawnTextPopup(boss.x, boss.y - 40, 'BOSS DEFEATED!', '#ff0');
          playSound('levelComplete');
          STATE.level.portal.x = 550;
          STATE.level.portal.y = 455;
        }
      }
    } else {
      playerHurt();
    }
  }
}

// ========================
// RENDERING
// ========================
function drawBackground(bgType) {
  var colors = LEVEL_BG_COLORS[bgType] || LEVEL_BG_COLORS[0];
  var grad = ctx.createLinearGradient(0, 0, 0, CH);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.5, colors[1]);
  grad.addColorStop(1, colors[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CW, CH);

  // Parallax layers
  var cx = STATE.camera.x;
  ctx.globalAlpha = 0.3;

  // Background trees/ruins
  for (var i = 0; i < 12; i++) {
    var tx = (i * 200 - cx * 0.2) % (CW + 200) - 100;
    if (tx < -100) tx += CW + 200;
    switch(bgType) {
      case 0: // Jungle
        drawTree(tx, 300 + Math.sin(i * 2.3) * 40, 80 + i * 5, '#0a3a0a');
        break;
      case 1: // Stone
        drawPillar(tx, 320, 120 + i * 3, '#3a3020');
        break;
      case 2: // Canopy
        drawVine(tx, 100 + i * 20, 200, '#1a3a1a');
        break;
      case 3: // Underground
        drawStalactite(tx, 0, 60 + i * 8, '#1a1a2a');
        break;
      case 4: // Water
        drawReed(tx, 480, 60 + i * 5, '#0a4a3a');
        break;
      case 5: // Lava
        drawRock(tx, 480, 40 + i * 6, '#3a1a0a');
        break;
      case 6: // Sky
        drawCloudShape(tx, 100 + Math.sin(i * 1.7) * 60, 80, '#2a2a5a');
        break;
      case 7: // Heart
        drawCrystal(tx, 200 + Math.sin(i * 1.5) * 80, 30 + i * 3, '#3a1a4a');
        break;
    }
  }
  ctx.globalAlpha = 1;

  // Ground decoration
  ctx.fillStyle = colors[2];
  ctx.fillRect(0, 560, CW, CH - 560);
}

function drawTree(x, y, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 10, y, 16, h);
  ctx.beginPath();
  ctx.arc(x + 18, y, 30, 0, Math.PI * 2);
  ctx.fill();
}
function drawPillar(x, y, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 30, h);
  ctx.fillRect(x - 5, y, 40, 10);
  ctx.fillRect(x - 5, y + h - 10, 40, 10);
}
function drawVine(x, y, h, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (var i = 0; i < h; i += 20) {
    ctx.lineTo(x + Math.sin(i * 0.1) * 10, y + i);
  }
  ctx.stroke();
}
function drawStalactite(x, y, h, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 15, y + h);
  ctx.lineTo(x + 30, y);
  ctx.fill();
}
function drawReed(x, y, h, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + Math.sin(STATE.frameCount * 0.05 + x) * 5, y);
  ctx.stroke();
}
function drawRock(x, y, w, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w * 0.3, y - w * 0.6);
  ctx.lineTo(x + w * 0.7, y - w * 0.4);
  ctx.lineTo(x + w, y);
  ctx.fill();
}
function drawCloudShape(x, y, w, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x + w/2, y, w/2, w/4, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawCrystal(x, y, h, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + h * 0.3, y - h);
  ctx.lineTo(x + h * 0.6, y);
  ctx.fill();
}

function drawPlatforms() {
  var cx = STATE.camera.x;
  var lvl = STATE.level;

  // Draw platforms
  ctx.fillStyle = '#2a4a2a';
  lvl.platforms.forEach(function(plat) {
    var sx = plat.x - cx;
    if (sx + plat.w < -50 || sx > CW + 50) return;
    ctx.fillStyle = '#3a5a3a';
    ctx.fillRect(sx, plat.y, plat.w, plat.h);
    ctx.fillStyle = '#4a7a4a';
    ctx.fillRect(sx, plat.y, plat.w, 6);
    // Grass details
    ctx.fillStyle = '#5a9a5a';
    for (var i = 0; i < plat.w; i += 12) {
      ctx.fillRect(sx + i, plat.y - 2, 6, 4);
    }
  });

  // Moving platforms
  lvl.movingPlatforms.forEach(function(mp) {
    var sx = mp.x - cx;
    if (sx + mp.w < -50 || sx > CW + 50) return;
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(sx, mp.y, mp.w, mp.h);
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(sx, mp.y, mp.w, 4);
  });

  // Falling logs
  lvl.fallingLogs.forEach(function(fl) {
    if (fl.fell) return;
    var sx = fl.x - cx;
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(sx, fl.y, fl.w, fl.h);
  });

  // Spikes
  lvl.spikes.forEach(function(s) {
    var sx = s.x - cx;
    ctx.fillStyle = '#c0c0c0';
    for (var i = 0; i < s.w; i += 10) {
      ctx.beginPath();
      ctx.moveTo(sx + i, s.y + s.h);
      ctx.lineTo(sx + i + 5, s.y);
      ctx.lineTo(sx + i + 10, s.y + s.h);
      ctx.fill();
    }
  });

  // Water zones
  lvl.waterZones.forEach(function(w) {
    var sx = w.x - cx;
    if (sx + w.w < -50 || sx > CW + 50) return;
    ctx.fillStyle = 'rgba(0,100,200,0.3)';
    ctx.fillRect(sx, w.y, w.w, w.h);
    // Waves
    ctx.strokeStyle = 'rgba(100,200,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < w.w; i += 5) {
      ctx.lineTo(sx + i, w.y + 5 + Math.sin((i + STATE.frameCount * 2) * 0.05) * 4);
    }
    ctx.stroke();
  });

  // Lava zones
  lvl.lavaZones.forEach(function(w) {
    var sx = w.x - cx;
    if (sx + w.w < -50 || sx > CW + 50) return;
    ctx.fillStyle = 'rgba(200,50,0,0.4)';
    ctx.fillRect(sx, w.y, w.w, w.h);
    // Glow
    ctx.fillStyle = 'rgba(255,100,0,0.2)';
    for (var i = 0; i < w.w; i += 30) {
      var blobY = w.y + 5 + Math.sin((i + STATE.frameCount * 3) * 0.08) * 6;
      ctx.beginPath();
      ctx.arc(sx + i + 15, blobY, 10 + Math.sin(STATE.frameCount * 0.1 + i) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Clouds (sky level)
  lvl.clouds.forEach(function(c) {
    var sx = c.x - cx * 0.3;
    ctx.fillStyle = 'rgba(200,200,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(sx + c.w/2, c.y, c.w/2, c.h/2, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Dark zones (underground)
  lvl.darkZones.forEach(function(d) {
    var sx = d.x - cx;
    if (sx + d.w < 0 || sx > CW) return;
    var grad = ctx.createRadialGradient(STATE.player.x - cx + 12, STATE.player.y + 18, 30, STATE.player.x - cx + 12, STATE.player.y + 18, 250);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(Math.max(0, sx), 0, Math.min(CW, sx + d.w) - Math.max(0, sx), CH);
  });

  // Portal
  var portal = lvl.portal;
  var psx = portal.x - cx;
  ctx.save();
  ctx.translate(psx + portal.w/2, portal.y + portal.h/2);
  ctx.rotate(STATE.frameCount * 0.03);
  ctx.fillStyle = 'rgba(0,255,100,0.3)';
  ctx.fillRect(-portal.w/2, -portal.h/2, portal.w, portal.h);
  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 3;
  ctx.strokeRect(-portal.w/2, -portal.h/2, portal.w, portal.h);
  ctx.restore();
  // Portal glow
  ctx.fillStyle = 'rgba(0,255,100,0.1)';
  ctx.beginPath();
  ctx.arc(psx + portal.w/2, portal.y + portal.h/2, 30 + Math.sin(STATE.frameCount * 0.08) * 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f0';
  ctx.font = '16px Orbitron';
  ctx.textAlign = 'center';
  ctx.fillText('🌀', psx + portal.w/2, portal.y - 8);
}

function drawCollectibles() {
  var cx = STATE.camera.x;
  var lvl = STATE.level;

  lvl.crystals.forEach(function(c) {
    if (c.collected) return;
    var sx = c.x - cx;
    if (sx < -30 || sx > CW + 30) return;
    var bob = Math.sin(STATE.frameCount * 0.08 + c.x * 0.01) * 4;
    if (c.isLife) {
      ctx.fillStyle = '#f44';
      ctx.font = '18px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText('❤️', sx, c.y + bob + 6);
    } else {
      // Crystal shape
      ctx.fillStyle = '#0ff';
      ctx.beginPath();
      ctx.moveTo(sx, c.y + bob - 8);
      ctx.lineTo(sx + 7, c.y + bob);
      ctx.lineTo(sx, c.y + bob + 8);
      ctx.lineTo(sx - 7, c.y + bob);
      ctx.fill();
      ctx.fillStyle = '#aff';
      ctx.beginPath();
      ctx.moveTo(sx - 2, c.y + bob - 5);
      ctx.lineTo(sx + 3, c.y + bob);
      ctx.lineTo(sx - 2, c.y + bob + 5);
      ctx.fill();
    }
  });

  lvl.gems.forEach(function(g) {
    if (g.collected) return;
    var sx = g.x - cx;
    if (sx < -30 || sx > CW + 30) return;
    var bob = Math.sin(STATE.frameCount * 0.06 + g.x * 0.02) * 5;
    ctx.fillStyle = '#f0f';
    ctx.beginPath();
    ctx.moveTo(sx, g.y + bob - 10);
    ctx.lineTo(sx + 8, g.y + bob);
    ctx.lineTo(sx + 4, g.y + bob + 10);
    ctx.lineTo(sx - 4, g.y + bob + 10);
    ctx.lineTo(sx - 8, g.y + bob);
    ctx.fill();
    ctx.fillStyle = '#faf';
    ctx.beginPath();
    ctx.arc(sx, g.y + bob, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEnemies() {
  var cx = STATE.camera.x;
  STATE.level.enemies.forEach(function(e) {
    if (!e.alive) return;
    var sx = e.x - cx;
    if (sx + e.w < -30 || sx > CW + 30) return;

    ctx.save();
    switch(e.type) {
      case 'beetle':
        ctx.fillStyle = '#0a0';
        ctx.fillRect(sx, e.y + 4, e.w, e.h - 4);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(sx + 4, e.y + 8, e.w - 8, e.h - 12);
        // Eyes
        ctx.fillStyle = '#ff0';
        ctx.fillRect(sx + (e.dir > 0 ? e.w - 10 : 4), e.y + 6, 4, 4);
        ctx.fillRect(sx + (e.dir > 0 ? e.w - 16 : 10), e.y + 6, 4, 4);
        // Legs animation
        ctx.fillStyle = '#080';
        var legOff = Math.sin(STATE.frameCount * 0.2 + e.x) * 3;
        ctx.fillRect(sx + 4, e.y + e.h - 2, 4, 4 + legOff);
        ctx.fillRect(sx + e.w - 8, e.y + e.h - 2, 4, 4 - legOff);
        break;

      case 'golem':
        ctx.fillStyle = '#665';
        ctx.fillRect(sx, e.y + 4, e.w, e.h - 4);
        ctx.fillStyle = '#887';
        ctx.fillRect(sx + 3, e.y + 7, e.w - 6, e.h - 11);
        // Face
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(sx + (e.dir > 0 ? e.w - 12 : 5), e.y + 10, 5, 4);
        break;

      case 'bat':
      case 'fireBat':
        var bColor = e.type === 'fireBat' ? '#f80' : '#808';
        ctx.fillStyle = bColor;
        // Wings
        var wingOff = Math.sin(STATE.frameCount * 0.3 + e.x) * 8;
        ctx.beginPath();
        ctx.moveTo(sx + e.w/2, e.y + e.h/2);
        ctx.lineTo(sx - 8, e.y + wingOff);
        ctx.lineTo(sx + 2, e.y + e.h/2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sx + e.w/2, e.y + e.h/2);
        ctx.lineTo(sx + e.w + 8, e.y + wingOff);
        ctx.lineTo(sx + e.w - 2, e.y + e.h/2);
        ctx.fill();
        // Body
        ctx.fillStyle = e.type === 'fireBat' ? '#fa0' : '#a0a';
        ctx.fillRect(sx + 6, e.y + 8, e.w - 12, e.h - 12);
        // Eyes
        ctx.fillStyle = '#f00';
        ctx.fillRect(sx + 10, e.y + 12, 3, 3);
        ctx.fillRect(sx + e.w - 13, e.y + 12, 3, 3);
        break;

      case 'guard':
        ctx.fillStyle = '#822';
        ctx.fillRect(sx, e.y + 4, e.w, e.h - 4);
        ctx.fillStyle = '#a33';
        ctx.fillRect(sx + 3, e.y + 6, e.w - 6, e.h - 10);
        // Helmet
        ctx.fillStyle = '#555';
        ctx.fillRect(sx + 2, e.y, e.w - 4, 10);
        // Spear
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx + e.w/2, e.y);
        ctx.lineTo(sx + e.w/2 + e.dir * 15, e.y - 15);
        ctx.stroke();
        break;

      case 'rockThrower':
        ctx.fillStyle = '#664';
        ctx.fillRect(sx, e.y + 4, e.w, e.h - 4);
        ctx.fillStyle = '#886';
        ctx.fillRect(sx + 3, e.y + 7, e.w - 6, e.h - 11);
        // Head wrap
        ctx.fillStyle = '#a80';
        ctx.fillRect(sx + 2, e.y, e.w - 4, 8);
        // Eyes
        ctx.fillStyle = '#ff0';
        ctx.fillRect(sx + (e.dir > 0 ? e.w - 10 : 4), e.y + 4, 4, 3);
        break;

      case 'spider':
        ctx.fillStyle = '#333';
        ctx.fillRect(sx + 4, e.y + 4, e.w - 8, e.h - 8);
        // Legs
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        var legOff2 = Math.sin(STATE.frameCount * 0.25 + e.x) * 3;
        ctx.beginPath();
        ctx.moveTo(sx + 4, e.y + 10); ctx.lineTo(sx - 4, e.y + 4 + legOff2);
        ctx.moveTo(sx + e.w - 4, e.y + 10); ctx.lineTo(sx + e.w + 4, e.y + 4 - legOff2);
        ctx.moveTo(sx + 4, e.y + 18); ctx.lineTo(sx - 4, e.y + 26 - legOff2);
        ctx.moveTo(sx + e.w - 4, e.y + 18); ctx.lineTo(sx + e.w + 4, e.y + 26 + legOff2);
        ctx.stroke();
        // Eyes (red, multiple)
        ctx.fillStyle = '#f00';
        ctx.fillRect(sx + 8, e.y + 6, 3, 2);
        ctx.fillRect(sx + e.w - 11, e.y + 6, 3, 2);
        ctx.fillRect(sx + 11, e.y + 9, 2, 2);
        ctx.fillRect(sx + e.w - 13, e.y + 9, 2, 2);
        break;
    }
    ctx.restore();
  });

  // Boss
  if (STATE.level.hasBoss && STATE.level.boss && STATE.level.boss.alive) {
    var boss = STATE.level.boss;
    var bsx = boss.x - cx;
    if (boss.invincible > 0 && Math.floor(STATE.frameCount / 3) % 2) {
      ctx.globalAlpha = 0.5;
    }
    // Body
    ctx.fillStyle = '#6a1a3a';
    ctx.fillRect(bsx, boss.y + 10, boss.w, boss.h - 10);
    ctx.fillStyle = '#8a2a4a';
    ctx.fillRect(bsx + 5, boss.y + 15, boss.w - 10, boss.h - 20);
    // Head
    ctx.fillStyle = '#5a0a2a';
    ctx.fillRect(bsx + 8, boss.y, boss.w - 16, 20);
    // Eyes (glowing)
    ctx.fillStyle = '#f00';
    ctx.fillRect(bsx + 14, boss.y + 6, 6, 6);
    ctx.fillRect(bsx + boss.w - 20, boss.y + 6, 6, 6);
    // Crown
    ctx.fillStyle = '#ff0';
    ctx.fillRect(bsx + 10, boss.y - 6, 8, 8);
    ctx.fillRect(bsx + boss.w - 18, boss.y - 6, 8, 8);
    ctx.fillRect(bsx + boss.w/2 - 4, boss.y - 10, 8, 12);
    // HP bar
    ctx.globalAlpha = 1;
    var hpPct = boss.hp / boss.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(bsx - 10, boss.y - 25, boss.w + 20, 8);
    ctx.fillStyle = hpPct > 0.5 ? '#0f0' : (hpPct > 0.25 ? '#ff0' : '#f00');
    ctx.fillRect(bsx - 10, boss.y - 25, (boss.w + 20) * hpPct, 8);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('TEMPLE GUARDIAN', bsx + boss.w/2, boss.y - 30);
    ctx.globalAlpha = 1;
  }
}

function drawPlayer() {
  var p = STATE.player;
  var cx = STATE.camera.x;
  var sx = p.x - cx;

  if (p.invincible > 0 && Math.floor(STATE.frameCount / 3) % 2) return;

  ctx.save();
  ctx.translate(sx + p.w/2, p.y + p.h/2);
  if (p.facing < 0) ctx.scale(-1, 1);

  if (p.spinTimer > 0) {
    // Spin animation
    ctx.rotate(STATE.frameCount * 0.5);
    // Body
    ctx.fillStyle = '#0a5';
    ctx.fillRect(-12, -18, 24, 36);
    // Explorer hat
    ctx.fillStyle = '#854';
    ctx.fillRect(-14, -22, 28, 8);
    ctx.fillRect(-8, -28, 16, 8);
  } else if (p.sliding) {
    // Slide animation
    ctx.fillStyle = '#0a5';
    ctx.fillRect(-16, -8, 32, 16);
    // Hat
    ctx.fillStyle = '#854';
    ctx.fillRect(8, -12, 16, 6);
  } else if (p.groundPounding) {
    // Ground pound
    ctx.fillStyle = '#0a5';
    ctx.fillRect(-12, -18, 24, 36);
    // Face
    ctx.fillStyle = '#fdb';
    ctx.fillRect(-8, -14, 16, 12);
    // Hat
    ctx.fillStyle = '#854';
    ctx.fillRect(-14, -22, 28, 8);
    ctx.fillRect(-8, -28, 16, 8);
    // Determined eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(-5, -10, 4, 4);
    ctx.fillRect(3, -10, 4, 4);
  } else {
    // Normal / running
    var legOffset = p.onGround && Math.abs(p.vx) > 0.5 ? Math.sin(p.animFrame * Math.PI / 2) * 6 : 0;

    // Body
    ctx.fillStyle = '#0a5';
    ctx.fillRect(-10, -16, 20, 26);

    // Explorer outfit details
    ctx.fillStyle = '#0b6';
    ctx.fillRect(-10, -8, 20, 4); // Belt

    // Head
    ctx.fillStyle = '#fdb';
    ctx.fillRect(-7, -22, 14, 10);

    // Explorer hat
    ctx.fillStyle = '#854';
    ctx.fillRect(-12, -26, 24, 6);
    ctx.fillRect(-7, -32, 14, 8);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(-4, -19, 3, 3);
    ctx.fillRect(3, -19, 3, 3);

    // Legs
    ctx.fillStyle = '#4a3';
    ctx.fillRect(-8, 10, 6, 10 + legOffset);
    ctx.fillRect(2, 10, 6, 10 - legOffset);

    // Arms
    ctx.fillStyle = '#fdb';
    ctx.fillRect(-13, -12, 4, 10);
    ctx.fillRect(9, -12, 4, 10);
  }

  ctx.restore();

  // Shield indicator
  if (p.shieldHits > 0) {
    ctx.strokeStyle = 'rgba(0,170,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx + p.w/2, p.y + p.h/2, 22, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles() {
  STATE.particles.forEach(function(pt) {
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = pt.life / 60;
    ctx.fillRect(pt.x - pt.size/2, pt.y - pt.size/2, pt.size, pt.size);
  });
  ctx.globalAlpha = 1;

  STATE.textPopups.forEach(function(tp) {
    ctx.fillStyle = tp.color;
    ctx.font = 'bold 14px Orbitron';
    ctx.textAlign = 'center';
    ctx.globalAlpha = tp.timer / 60;
    ctx.fillText(tp.text, tp.x, tp.y);
  });
  ctx.globalAlpha = 1;
}

function drawHUD() {
  var lvl = STATE.level;
  var totalC = lvl.crystals.filter(function(c){return !c.isLife;}).length;

  // Update HUD elements (handled in updateHUD)
}

function updateHUD() {
  var lvl = STATE.level;
  var totalC = lvl.crystals.filter(function(c){return !c.isLife;}).length;
  document.getElementById('hud-zone').textContent = 'Zone ' + STATE.levelNum + ': ' + LEVEL_NAMES[STATE.levelNum - 1];
  document.getElementById('hud-crystals').textContent = '💎 ' + STATE.levelCrystals + '/' + totalC;
  document.getElementById('hud-lives').textContent = '❤️ ' + saveData.lives;
  document.getElementById('hud-xp').textContent = '⭐ Lv.' + saveData.playerLevel;

  var elapsed = STATE.time;
  var mins = Math.floor(elapsed / 60);
  var secs = Math.floor(elapsed % 60);
  document.getElementById('hud-time').textContent = '⏱ ' + mins + ':' + (secs < 10 ? '0' : '') + secs;

  document.getElementById('coin-display').style.display = 'flex';
  document.getElementById('coin-count').textContent = saveData.gems;
}

// ========================
// UPDATE LOOP
// ========================
function update() {
  if (!STATE.playing || STATE.paused) return;

  STATE.frameCount++;
  STATE.time = (Date.now() - STATE.startTime) / 1000;

  updateInput();
  updateGamepad();
  handlePlayerPhysics();
  updateEnemies();

  // Update particles
  STATE.particles = STATE.particles.filter(function(pt) {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vy += 0.05;
    pt.life--;
    return pt.life > 0;
  });

  STATE.textPopups = STATE.textPopups.filter(function(tp) {
    tp.y += tp.vy;
    tp.timer--;
    return tp.timer > 0;
  });

  if (STATE.shakeTimer > 0) STATE.shakeTimer--;
  if (STATE.flashTimer > 0) STATE.flashTimer--;

  updateHUD();
}

function render() {
  ctx.clearRect(0, 0, CW, CH);

  if (!STATE.playing) {
    // Draw a nice background for menu screens
    var grad = ctx.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, '#0a1a0a');
    grad.addColorStop(1, '#050f05');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);
    // Animated jungle bg
    ctx.globalAlpha = 0.15;
    for (var i = 0; i < 8; i++) {
      drawTree(i * 120 + Math.sin(STATE.frameCount * 0.01 + i) * 10, 350 + i * 20, 100 + i * 10, '#0a3a0a');
    }
    ctx.globalAlpha = 1;
    STATE.frameCount++;
    return;
  }

  ctx.save();

  // Screen shake
  if (STATE.shakeTimer > 0) {
    var shakeX = (Math.random() - 0.5) * STATE.shakeIntensity * 2;
    var shakeY = (Math.random() - 0.5) * STATE.shakeIntensity * 2;
    ctx.translate(shakeX, shakeY);
  }

  drawBackground(STATE.level.bgType);
  drawPlatforms();
  drawCollectibles();
  drawEnemies();
  drawPlayer();
  drawParticles();

  // Hurt flash
  if (STATE.flashTimer > 0) {
    ctx.fillStyle = 'rgba(255,0,0,' + (STATE.flashTimer / 30) + ')';
    ctx.fillRect(0, 0, CW, CH);
  }

  // Dark overlay with flashlight effect for underground areas
  if (STATE.level.darkZones) {
    var px = STATE.player.x;
    STATE.level.darkZones.forEach(function(d) {
      if (px > d.x && px < d.x + d.w) {
        ctx.fillStyle = 'rgba(0,0,10,0.65)';
        ctx.fillRect(0, 0, CW, CH);
        // Flashlight circle around player
        var plx = STATE.player.x + STATE.player.w/2 - STATE.camera.x;
        var ply = STATE.player.y + STATE.player.h/2;
        var lightRadius = 100 + Math.sin(STATE.frameCount * 0.05) * 5;
        var grad = ctx.createRadialGradient(plx, ply, 0, plx, ply, lightRadius);
        grad.addColorStop(0, 'rgba(0,0,10,0)');
        grad.addColorStop(0.7, 'rgba(0,0,10,0.6)');
        grad.addColorStop(1, 'rgba(0,0,10,0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CW, CH);
      }
    });
  }

  // Draw breakable crates
  STATE.breakableCrates.forEach(function(crate) {
    if (crate.broken) return;
    var sx = crate.x - STATE.camera.x, sy = crate.y;
    ctx.fillStyle = '#c84';
    ctx.fillRect(sx, sy, crate.w, crate.h);
    ctx.strokeStyle = '#a62';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, crate.w, crate.h);
    ctx.fillStyle = '#843';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', sx + crate.w/2, sy + crate.h/2 + 4);
    // Type indicator
    if (crate.type === 'gem') { ctx.fillStyle = '#f0f'; ctx.fillText('💎', sx + crate.w/2, sy + crate.h/2 + 4); }
    else if (crate.type === 'life') { ctx.fillStyle = '#f44'; ctx.fillText('❤', sx + crate.w/2, sy + crate.h/2 + 4); }
  });

  // Draw TNT and Nitro crates
  STATE.tntCrates.forEach(function(tc) {
    if (tc.exploded && tc.timer <= 0) return;
    var sx = tc.x - STATE.camera.x, sy = tc.y;
    var flash = tc.timer > 0 && Math.floor(tc.timer / 5) % 2 === 0;
    ctx.fillStyle = flash ? '#ff0' : '#f44';
    ctx.fillRect(sx, sy, tc.w, tc.h);
    ctx.strokeStyle = '#800';
  ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, tc.w, tc.h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('TNT', sx + tc.w/2, sy + tc.h/2);
  });
  STATE.nitroCrates.forEach(function(nc) {
    if (nc.exploded && nc.timer <= 0) return;
    var sx = nc.x - STATE.camera.x, sy = nc.y;
    var flash = nc.timer > 0 && Math.floor(nc.timer / 4) % 2 === 0;
    ctx.fillStyle = flash ? '#ff0' : '#04a';
    ctx.fillRect(sx, sy, nc.w, nc.h);
    ctx.strokeStyle = '#028'; ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, nc.w, nc.h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NITRO', sx + nc.w/2, sy + nc.h/2);
  });

  // Draw checkpoint crates
  STATE.checkpointCrates.forEach(function(cc) {
    var sx = cc.x - STATE.camera.x, sy = cc.y;
    ctx.fillStyle = cc.activated ? '#0a0' : '#4a0';
    ctx.fillRect(sx, sy, cc.w, cc.h);
    ctx.strokeStyle = cc.activated ? '#0f0' : '#080';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, cc.w, cc.h);
    if (cc.activated) {
      ctx.fillStyle = '#0f0'; ctx.font = '12px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✓', sx + cc.w/2, sy + cc.h/2);
    }
  });

  // Draw boulders
  STATE.boulders.forEach(function(b) {
    if (!b.triggered && !b.active) {
      var sx = b.x - STATE.camera.x, sy = b.y;
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(sx + b.w/2, sy + b.h/2, b.w/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.stroke();
    } else if (b.active) {
      var sx = b.x - STATE.camera.x, sy = b.y;
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(sx + b.w/2, sy + b.h/2, b.w/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
      spawnParticles(b.x, b.y + b.h, '#888', 1, 1);
    }
  });

  // Draw enemy projectiles
  STATE.enemyProjectiles.forEach(function(proj) {
    var sx = proj.x - STATE.camera.x, sy = proj.y;
    ctx.fillStyle = '#886';
    ctx.beginPath();
    ctx.arc(sx + proj.w/2, sy + proj.h/2, proj.w/2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw Aku Aku masks
  if (STATE.akuAkuMasks) {
    STATE.akuAkuMasks.forEach(function(mask) {
      if (mask.collected) return;
      var sx = mask.x - STATE.camera.x;
      var sy = mask.y + Math.sin(mask.bobTimer) * 5;
      // Glowing mask
      ctx.save();
      ctx.shadowColor = '#ff0';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      ctx.arc(sx + mask.w/2, sy + mask.h/2, mask.w/2 + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('A', sx + mask.w/2, sy + mask.h/2);
    });
  }

  // Draw Aku Aku indicator on player
  if (STATE.akuAkuHits > 0) {
    var akuAlpha = STATE.akuAkuTimer < 120 ? (STATE.akuAkuTimer / 120) : 1;
    if (Math.floor(STATE.frameCount / 3) % 2 === 0) akuAlpha = Math.min(akuAlpha, 0.8);
    ctx.globalAlpha = akuAlpha * 0.4;
    var plx = STATE.player.x + STATE.player.w/2 - STATE.camera.x;
    var ply = STATE.player.y + STATE.player.h/2;
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(plx, ply, 22 + STATE.akuAkuHits * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ========================
// GAME LOOP
// ========================
var lastTime = 0;
var accumulator = 0;
var TICK_RATE = 1000 / 60;

function gameLoop(timestamp) {
  if (lastTime === 0) lastTime = timestamp;
  var delta = timestamp - lastTime;
  lastTime = timestamp;

  if (delta > 100) delta = 100; // Cap
  accumulator += delta;

  while (accumulator >= TICK_RATE) {
    update();
    accumulator -= TICK_RATE;
  }

  render();
  requestAnimationFrame(gameLoop);
}

// ========================
// BUTTON EVENTS
// ========================
function pauseGame() {
  STATE.paused = true;
  showScreen('pause');
  STATE.currentScreen = 'pause';
  screens.hud.classList.add('active');
  screens.pause.classList.add('active');
  STATE.playing = true;
}

function resumeGame() {
  STATE.paused = false;
  screens.pause.classList.remove('active');
  STATE.currentScreen = 'hud';
}

document.getElementById('btn-play').addEventListener('click', function() {
  initAudio(); playSound('button');
  updateMenuStats();
  buildLevelSelect();
  showScreen('levelSelect');
});

document.getElementById('btn-upgrades').addEventListener('click', function() {
  initAudio(); playSound('button');
  buildUpgradeShop();
  showScreen('upgrades');
});

document.getElementById('btn-achievements').addEventListener('click', function() {
  initAudio(); playSound('button');
  buildAchievements();
  showScreen('achievements');
});

document.getElementById('btn-how').addEventListener('click', function() {
  initAudio(); playSound('button');
  showScreen('howto');
});

document.getElementById('btn-how-back').addEventListener('click', function() {
  playSound('button'); showScreen('menu');
});

document.getElementById('btn-level-back').addEventListener('click', function() {
  playSound('button'); showScreen('menu');
});

document.getElementById('btn-pause').addEventListener('click', function() {
  if (STATE.playing && !STATE.paused) pauseGame();
});

document.getElementById('btn-resume').addEventListener('click', function() {
  playSound('button'); resumeGame();
});

document.getElementById('btn-quit').addEventListener('click', function() {
  playSound('button'); STATE.playing = false; STATE.paused = false; updateMenuStats(); showScreen('menu');
});

document.getElementById('btn-retry').addEventListener('click', function() {
  playSound('button');
  saveData.lives = Math.max(saveData.lives, 1);
  writeSave();
  startLevel(STATE.levelNum);
});

document.getElementById('btn-go-menu').addEventListener('click', function() {
  playSound('button');
  saveData.lives = Math.max(saveData.lives, 1);
  writeSave();
  updateMenuStats(); showScreen('menu');
});

document.getElementById('btn-next-zone').addEventListener('click', function() {
  playSound('button');
  startLevel(STATE.levelNum + 1);
});

document.getElementById('btn-lc-menu').addEventListener('click', function() {
  playSound('button'); updateMenuStats(); showScreen('menu');
});

document.getElementById('btn-victory-menu').addEventListener('click', function() {
  playSound('button'); updateMenuStats(); showScreen('menu');
});

document.getElementById('btn-victory-replay').addEventListener('click', function() {
  playSound('button');
  saveData = JSON.parse(JSON.stringify(defaultSave));
  writeSave();
  updateMenuStats(); showScreen('menu');
});

document.getElementById('btn-shop-back').addEventListener('click', function() {
  playSound('button'); updateMenuStats(); showScreen('menu');
});

document.getElementById('btn-ach-back').addEventListener('click', function() {
  playSound('button'); showScreen('menu');
});

// Rewarded ad close
document.getElementById('rewarded-ad-screen').querySelector('.btn-secondary, .btn-primary').addEventListener('click', function() {
  if (this.id === 'btn-claim-reward') {
    // handled above
  } else {
    showScreen('gameover');
  }
});

function updateMenuStats() {
  document.getElementById('menu-lives').textContent = saveData.lives;
  document.getElementById('menu-gems').textContent = saveData.gems;
  document.getElementById('menu-xplevel').textContent = saveData.playerLevel;
}

// ========================
// INIT
// ========================
loadSave();
updateMenuStats();
addCoins(1); // Initial coins for playing
requestAnimationFrame(gameLoop);

})();
