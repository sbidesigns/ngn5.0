// ============================================================
// NGN4 GAME 9: COMMAND GRID - Turn-Based Strategy
// ============================================================
(function(){
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('command-grid'); } catch(e) {}


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

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
function sfxSelect(){ playTone(600, 0.08, 'sine', 0.1); }
function sfxMove(){ playTone(400, 0.1, 'triangle', 0.08); }
function sfxAttack(){ playTone(200, 0.15, 'sawtooth', 0.15); playTone(100, 0.1, 'square', 0.1); }
function sfxCapture(){ playTone(500, 0.15); setTimeout(()=>playTone(700, 0.2), 100); }
function sfxVictory(){ [400,500,600,800].forEach((f,i)=>setTimeout(()=>playTone(f,0.2,'sine',0.12), i*120)); }
function sfxDefeat(){ playTone(200, 0.3, 'sawtooth', 0.15); playTone(100, 0.4, 'sawtooth', 0.1); }
function sfxLevelUp(){ playTone(400,0.15); setTimeout(()=>playTone(500,0.15),100); setTimeout(()=>playTone(700,0.2),200); }
function sfxAchieve(){ playTone(600,0.1); setTimeout(()=>playTone(900,0.2),100); setTimeout(()=>playTone(1200,0.25),200); }
function sfxSave(){ playTone(300,0.1,'sine',0.08); playTone(500,0.15,'sine',0.08); }

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

// --- Unit Types ---
const UNIT_TYPES = {
  scout:   { name:'Scout',   hp:40,  atk:8,  def:2, move:4, range:1, color:'#0f0', symbol:'S' },
  soldier: { name:'Soldier', hp:60,  atk:12, def:4, move:3, range:1, color:'#0af', symbol:'A' },
  heavy:   { name:'Heavy',   hp:100, atk:18, def:8, move:2, range:1, color:'#fa0', symbol:'H' },
  sniper:  { name:'Sniper',  hp:35,  atk:20, def:1, move:2, range:4, color:'#a0f', symbol:'R' },
  medic:   { name:'Medic',   hp:45,  atk:5,  def:3, move:3, range:1, color:'#0ff', symbol:'M', heal:15 },
  archer:  { name:'Archer',  hp:30,  atk:10, def:1, move:3, range:3, color:'#ff0', symbol:'B' },
  cavalry: { name:'Cavalry', hp:70,  atk:16, def:3, move:4, range:1, color:'#f80', symbol:'C' },
  mage:    { name:'Mage',    hp:28,  atk:14, def:1, move:2, range:2, color:'#f0f', symbol:'G', splash:true }
};

// --- Terrain ---
const TERRAIN = {
  plains:   { name:'Plains',    def:0, move:1, color:'#0d0d1a', moveColor:'#1a1a30', hides:false },
  forest:   { name:'Forest',    def:2, move:2, color:'#0a1a0a', moveColor:'#1a301a', hides:true },
  mountain: { name:'Mountain',  def:0, move:99, color:'#1a1a1a', moveColor:null, blocksLOS:true },
  building: { name:'Building',  def:4, move:2, color:'#1a0a0a', moveColor:'#301a1a', hides:false },
  water:    { name:'Water',     def:0, move:99, color:'#0a0a2a', moveColor:null, blocksLOS:false }
};

// --- Achievements ---
const ACHIEVEMENTS = {
  flawless: { name:'Flawless Victory', desc:'Complete a mission without losing a unit', unlocked:false },
  tactician: { name:'Tactician', desc:'Complete a mission in under 8 turns', unlocked:false },
  maxLevel: { name:'Max Level', desc:'Get a unit to level 5', unlocked:false },
  allMissions: { name:'All Missions', desc:'Complete all 8 missions', unlocked:false }
};

function loadAchievements(){
  try{ const d=JSON.parse(localStorage.getItem('ngn4_cg_achievements')||'{}');
    Object.keys(ACHIEVEMENTS).forEach(k=>{if(d[k])ACHIEVEMENTS[k].unlocked=d[k].unlocked;});
  }catch(e){}
}
function saveAchievements(){
  const d={};
  Object.keys(ACHIEVEMENTS).forEach(k=>{d[k]={unlocked:ACHIEVEMENTS[k].unlocked};});
  try{localStorage.setItem('ngn4_cg_achievements',JSON.stringify(d));}catch(e){}
}
function unlockAchievement(key){
  if(ACHIEVEMENTS[key]&&!ACHIEVEMENTS[key].unlocked){
    ACHIEVEMENTS[key].unlocked=true;saveAchievements();sfxAchieve();
    showAchievementPopup(ACHIEVEMENTS[key]);
  }
}
function showAchievementPopup(ach){
  const el=document.createElement('div');
  el.style.cssText='position:fixed;top:10%;left:50%;transform:translateX(-50%);background:#111;border:2px solid #ff0;padding:12px 24px;color:#ff0;font-family:monospace;font-size:14px;z-index:1000;white-space:nowrap;';
  el.textContent=`🏆 ${ach.name}: ${ach.desc}`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),3000);
}

// --- Missions ---
const MISSIONS = [
  {
    title: 'Mission 1: First Contact',
    briefing: 'Secure 3 of the 5 control points scattered across the grid. The enemy has deployed scouts and soldiers. Use terrain to your advantage.',
    map: 'plains', playerUnits: [{type:'soldier',x:1,y:1},{type:'soldier',x:2,y:1},{type:'scout',x:1,y:2}],
    enemyUnits: [{type:'soldier',x:8,y:8},{type:'soldier',x:7,y:8},{type:'scout',x:8,y:7}],
    controlPoints: [{x:4,y:4},{x:5,y:5},{x:2,y:7},{x:7,y:2},{x:5,y:0}],
    fogOfWar: false, parTurns: 12
  },
  {
    title: 'Mission 2: Forest Ambush',
    briefing: 'The enemy hides in the forest. Capture 3 control points. Forests provide cover but slow movement. Deploy snipers for long range.',
    map: 'forest', playerUnits: [{type:'soldier',x:0,y:1},{type:'sniper',x:1,y:0},{type:'scout',x:0,y:2},{type:'medic',x:1,y:1}],
    enemyUnits: [{type:'soldier',x:8,y:7},{type:'soldier',x:9,y:8},{type:'heavy',x:7,y:9},{type:'scout',x:9,y:6}],
    controlPoints: [{x:4,y:4},{x:6,y:2},{x:3,y:7},{x:7,y:5},{x:5,y:9}],
    fogOfWar: true, parTurns: 14
  },
  {
    title: 'Mission 3: Urban Warfare',
    briefing: 'Fight through city blocks. Buildings provide strong defensive cover. Capture the central district control points.',
    map: 'urban', playerUnits: [{type:'soldier',x:1,y:1},{type:'soldier',x:1,y:3},{type:'heavy',x:0,y:2},{type:'medic',x:2,y:2}],
    enemyUnits: [{type:'soldier',x:8,y:7},{type:'soldier',x:8,y:9},{type:'heavy',x:9,y:8},{type:'sniper',x:7,y:9}],
    controlPoints: [{x:4,y:4},{x:5,y:5},{x:3,y:6},{x:6,y:3},{x:5,y:8}],
    fogOfWar: true, parTurns: 14
  },
  {
    title: 'Mission 4: River Crossing',
    briefing: 'A river divides the map. Find the bridges and cross to capture enemy positions. The enemy has fortified the far bank.',
    map: 'river', playerUnits: [{type:'soldier',x:1,y:2},{type:'soldier',x:2,y:1},{type:'scout',x:1,y:4},{type:'sniper',x:0,y:3},{type:'medic',x:2,y:3}],
    enemyUnits: [{type:'soldier',x:8,y:2},{type:'soldier',x:8,y:4},{type:'heavy',x:9,y:3},{type:'sniper',x:7,y:1},{type:'scout',x:7,y:5}],
    controlPoints: [{x:3,y:2},{x:3,y:4},{x:6,y:2},{x:6,y:4},{x:5,y:3}],
    fogOfWar: true, parTurns: 16
  },
  {
    title: 'Mission 5: Mountain Pass',
    briefing: 'Mountains block most paths. Navigate through narrow passes to reach control points. Heavies struggle here — use scouts and snipers.',
    map: 'mountain', playerUnits: [{type:'scout',x:0,y:4},{type:'sniper',x:1,y:3},{type:'scout',x:1,y:5},{type:'soldier',x:0,y:3}],
    enemyUnits: [{type:'scout',x:9,y:4},{type:'sniper',x:8,y:5},{type:'soldier',x:9,y:3},{type:'soldier',x:8,y:3}],
    controlPoints: [{x:3,y:3},{x:3,y:5},{x:6,y:3},{x:6,y:5},{x:5,y:4}],
    fogOfWar: true, parTurns: 14
  },
  {
    title: 'Mission 6: Dual Front',
    briefing: 'The enemy attacks from two directions. Defend your control points while capturing theirs. Cavalry and archers join the fray.',
    map: 'dual', playerUnits: [{type:'soldier',x:4,y:1},{type:'soldier',x:5,y:1},{type:'heavy',x:4,y:0},{type:'medic',x:5,y:0},{type:'scout',x:3,y:1},{type:'archer',x:5,y:2}],
    enemyUnits: [{type:'soldier',x:4,y:8},{type:'soldier',x:5,y:8},{type:'heavy',x:4,y:9},{type:'sniper',x:6,y:9},{type:'scout',x:6,y:8},{type:'archer',x:3,y:8}],
    controlPoints: [{x:2,y:4},{x:7,y:4},{x:4,y:4},{x:5,y:4},{x:5,y:5}],
    fogOfWar: true, parTurns: 16
  },
  {
    title: 'Mission 7: Full Assault',
    briefing: 'All unit types available including mages. Capture 3 control points against a numerically superior enemy force.',
    map: 'full', playerUnits: [{type:'soldier',x:0,y:1},{type:'soldier',x:0,y:3},{type:'heavy',x:0,y:5},{type:'sniper',x:1,y:2},{type:'scout',x:1,y:4},{type:'medic',x:1,y:6},{type:'mage',x:0,y:7}],
    enemyUnits: [{type:'soldier',x:9,y:1},{type:'soldier',x:9,y:3},{type:'soldier',x:9,y:5},{type:'soldier',x:9,y:7},{type:'heavy',x:8,y:4},{type:'sniper',x:8,y:2},{type:'mage',x:9,y:6}],
    controlPoints: [{x:3,y:2},{x:3,y:6},{x:6,y:2},{x:6,y:6},{x:5,y:4}],
    fogOfWar: true, parTurns: 18
  },
  {
    title: 'Mission 8: Final Command',
    briefing: 'The final battle. Capture the central command point and hold it against overwhelming enemy forces. Victory means total grid control.',
    map: 'final', playerUnits: [{type:'soldier',x:1,y:1},{type:'soldier',x:1,y:8},{type:'heavy',x:0,y:4},{type:'heavy',x:0,y:5},{type:'sniper',x:2,y:0},{type:'sniper',x:2,y:9},{type:'medic',x:1,y:4},{type:'medic',x:1,y:5},{type:'cavalry',x:2,y:5}],
    enemyUnits: [{type:'soldier',x:8,y:1},{type:'soldier',x:8,y:8},{type:'heavy',x:9,y:4},{type:'heavy',x:9,y:5},{type:'sniper',x:7,y:0},{type:'sniper',x:7,y:9},{type:'soldier',x:8,y:4},{type:'soldier',x:8,y:5},{type:'cavalry',x:7,y:5}],
    controlPoints: [{x:4,y:4},{x:5,y:5},{x:5,y:4},{x:4,y:5},{x:5,y:3}],
    fogOfWar: true, parTurns: 20
  }
];

// --- Game State ---
const GRID_SIZE = 10;
const CELL = 50;
const OFFSET_X = (W - GRID_SIZE * CELL) / 2;
const OFFSET_Y = (H - GRID_SIZE * CELL) / 2 + 15;

let state = 'menu';
let gameMap = [];
let playerUnits = [];
let enemyUnits = [];
let controlPoints = [];
let selectedUnit = null;
let moveTargets = [];
let attackTargets = [];
let currentTurn = 1;
let phase = 'select'; // select, move, attack, ai
let fogOfWar = false;
let currentMission = 0;
let missionMode = 'campaign';
let totalCoinsEarned = 0;
let enemiesKilled = 0;
let unitsLost = 0;
let hoverCell = null;
let animating = false;
let damageAnims = [];
let undoState = null; // For undo
let undoUsed = false; // One undo per turn
let completedMissions = new Set();

// --- Map Generation ---
function generateMap(mapType){
  const map = Array.from({length:GRID_SIZE}, ()=>Array(GRID_SIZE).fill('plains'));

  if(mapType === 'forest'){
    for(let y=0;y<GRID_SIZE;y++) for(let x=0;x<GRID_SIZE;x++)
      if(Math.random()<0.35) map[y][x]='forest';
  } else if(mapType === 'urban'){
    for(let i=0;i<8;i++){
      const bx=1+Math.floor(Math.random()*(GRID_SIZE-3));
      const by=1+Math.floor(Math.random()*(GRID_SIZE-3));
      for(let dy=0;dy<2;dy++) for(let dx=0;dx<2;dx++)
        if(by+dy<GRID_SIZE&&bx+dx<GRID_SIZE) map[by+dy][bx+dx]='building';
    }
  } else if(mapType === 'river'){
    const riverX = 4 + Math.floor(Math.random()*2);
    for(let y=0;y<GRID_SIZE;y++) map[y][riverX] = 'water';
    map[2][riverX] = 'plains'; map[7][riverX] = 'plains';
  } else if(mapType === 'mountain'){
    for(let y=0;y<GRID_SIZE;y++) for(let x=0;x<GRID_SIZE;x++)
      if(Math.random()<0.3) map[y][x]='mountain';
    for(let x=0;x<GRID_SIZE;x++){ map[4][x]='plains'; map[5][x]='plains'; }
    map[3][3]='plains'; map[3][6]='plains'; map[6][3]='plains'; map[6][6]='plains';
  } else if(mapType === 'dual'){
    for(let y=3;y<7;y++) for(let x=3;x<7;x++) map[y][x]='building';
    map[4][3]='plains'; map[4][6]='plains'; map[5][3]='plains'; map[5][6]='plains';
  } else if(mapType === 'full'){
    for(let y=0;y<GRID_SIZE;y++) for(let x=0;x<GRID_SIZE;x++)
      if(Math.random()<0.2) map[y][x]=Math.random()<0.5?'forest':'mountain';
    for(let x=0;x<GRID_SIZE;x++){ map[4][x]='plains'; map[5][x]='plains'; }
    for(let y=0;y<GRID_SIZE;y++){ map[y][3]='plains'; map[y][6]='plains'; }
  } else if(mapType === 'final'){
    for(let y=0;y<GRID_SIZE;y++) for(let x=0;x<GRID_SIZE;x++)
      if(Math.random()<0.15) map[y][x]='building';
    for(let y=3;y<7;y++) for(let x=3;x<7;x++) map[y][x]='plains';
  }

  MISSIONS[currentMission].playerUnits.forEach(u => { map[u.y][u.x] = 'plains'; });
  MISSIONS[currentMission].enemyUnits.forEach(u => { map[u.y][u.x] = 'plains'; });
  MISSIONS[currentMission].controlPoints.forEach(cp => { map[cp.y][cp.x] = 'plains'; });

  return map;
}

// --- Create Units with XP/Leveling ---
function createUnit(type, x, y, team){
  const def = UNIT_TYPES[type];
  return {
    type, team, x, y, hp: def.hp, maxHp: def.hp,
    atk: def.atk, def: def.def, move: def.move, range: def.range,
    color: team === 'player' ? '#0f0' : '#f00',
    acted: false, moved: false, attacked: false,
    heal: def.heal || 0, symbol: def.symbol, name: def.name,
    splash: def.splash || false,
    xp: 0, level: 1, xpToLevel: 30
  };
}

function addUnitXP(unit, amount){
  if(unit.level >= 5) return;
  unit.xp += amount;
  while(unit.xp >= unit.xpToLevel && unit.level < 5){
    unit.xp -= unit.xpToLevel;
    unit.level++;
    unit.xpToLevel = Math.floor(unit.xpToLevel * 1.8);
    // Level up bonuses
    unit.atk += 2;
    unit.maxHp += 3;
    unit.hp = Math.min(unit.hp + 3, unit.maxHp);
    unit.def += 1;
    sfxLevelUp();
    damageAnims.push({x:unit.x, y:unit.y, dmg:'LV'+unit.level, color:'#ff0', timer:60});
    if(unit.level >= 5) unlockAchievement('maxLevel');
  }
}

// --- Initialize Mission ---
function initMission(missionIdx){
  currentMission = missionIdx;
  const mission = MISSIONS[missionIdx];
  gameMap = generateMap(mission.map);
  fogOfWar = mission.fogOfWar;
  playerUnits = mission.playerUnits.map(u => createUnit(u.type, u.x, u.y, 'player'));
  enemyUnits = mission.enemyUnits.map(u => createUnit(u.type, u.x, u.y, 'enemy'));
  controlPoints = mission.controlPoints.map(cp => ({x:cp.x, y:cp.y, owner:null}));
  currentTurn = 1;
  phase = 'select';
  selectedUnit = null;
  moveTargets = [];
  attackTargets = [];
  enemiesKilled = 0;
  unitsLost = 0;
  damageAnims = [];
  animating = false;
  totalCoinsEarned = 0;
  undoState = null;
  undoUsed = false;

  document.getElementById('briefing-title').textContent = mission.title;
  document.getElementById('briefing-text').textContent = mission.briefing;
  document.getElementById('briefing-screen').classList.remove('hidden');
  document.getElementById('game-hud').classList.add('hidden');
  document.getElementById('unit-panel').classList.add('hidden');

  updateHUD();
}

function startMission(){
  document.getElementById('briefing-screen').classList.add('hidden');
  state = 'playing';
  document.getElementById('game-hud').classList.remove('hidden');
  document.getElementById('btn-undo').classList.remove('hidden');
  document.getElementById('btn-save').classList.remove('hidden');
  phase = 'select';
}

// --- Save/Load ---
function saveMission(){
  const saveData = {
    currentMission, currentTurn, missionMode,
    gameMap, controlPoints, enemiesKilled, unitsLost, totalCoinsEarned,
    playerUnits: playerUnits.map(u => ({...u})),
    enemyUnits: enemyUnits.map(u => ({...u})),
    undoUsed
  };
  try{ localStorage.setItem('ngn4_cg_save', JSON.stringify(saveData)); } catch(e){}
  sfxSave();
  damageAnims.push({x:5, y:0, dmg:'SAVED', color:'#0f0', timer:60});
}

function loadMission(){
  try{
    const d = JSON.parse(localStorage.getItem('ngn4_cg_save'));
    if(!d) return false;
    currentMission = d.currentMission;
    currentTurn = d.currentTurn;
    missionMode = d.missionMode;
    gameMap = d.gameMap;
    controlPoints = d.controlPoints;
    enemiesKilled = d.enemiesKilled;
    unitsLost = d.unitsLost;
    totalCoinsEarned = d.totalCoinsEarned;
    undoUsed = d.undoUsed || false;
    playerUnits = d.playerUnits;
    enemyUnits = d.enemyUnits;
    fogOfWar = MISSIONS[currentMission].fogOfWar;
    phase = 'select';
    selectedUnit = null;
    moveTargets = [];
    attackTargets = [];
    animating = false;
    undoState = null;
    state = 'playing';
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('game-hud').classList.remove('hidden');
    document.getElementById('btn-undo').classList.remove('hidden');
    document.getElementById('btn-save').classList.remove('hidden');
    document.getElementById('unit-panel').classList.add('hidden');
    document.getElementById('ai-thinking').classList.add('hidden');
    updateHUD();
    return true;
  }catch(e){ return false; }
}

// --- Undo ---
function saveUndoState(){
  undoState = {
    playerUnits: playerUnits.map(u => ({...u})),
    phase: phase,
    selectedUnit: selectedUnit ? {...selectedUnit} : null,
    moveTargets: moveTargets.map(m => ({...m})),
    attackTargets: attackTargets.map(a => ({...a}))
  };
}

function doUndo(){
  if(!undoState || undoUsed || phase === 'ai') return;
  undoUsed = true;
  playerUnits = undoState.playerUnits;
  phase = undoState.phase;
  // Restore selectedUnit reference from the restored array
  if(undoState.selectedUnit){
    selectedUnit = playerUnits.find(u => u.x === undoState.selectedUnit.x && u.y === undoState.selectedUnit.y) || null;
  } else {
    selectedUnit = null;
  }
  moveTargets = undoState.moveTargets;
  attackTargets = undoState.attackTargets;
  undoState = null;
  document.getElementById('btn-undo').style.opacity = '0.5';
  sfxSelect();
}

// --- LOS Check ---
function hasLineOfSight(x1, y1, x2, y2){
  const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  let cx = x1, cy = y1;
  while(cx !== x2 || cy !== y2){
    const e2 = 2 * err;
    if(e2 > -dy){ err -= dy; cx += sx; }
    if(e2 < dx){ err += dx; cy += sy; }
    if(cx === x2 && cy === y2) return true;
    if(cx >= 0 && cy >= 0 && cx < GRID_SIZE && cy < GRID_SIZE){
      const t = gameMap[cy][cx];
      if(TERRAIN[t].blocksLOS) return false;
    }
  }
  return true;
}

// --- Pathfinding ---
function getMovableCells(unit){
  const cells = [];
  const visited = {};
  const queue = [{x:unit.x, y:unit.y, remaining:unit.move}];
  while(queue.length > 0){
    const {x, y, remaining} = queue.shift();
    const key = `${x},${y}`;
    if(visited[key]) continue;
    visited[key] = remaining;
    if(x !== unit.x || y !== unit.y){
      if(!getUnitAt(x, y, null)) cells.push({x, y, cost: unit.move - remaining});
    }
    if(remaining <= 0) continue;
    [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}].forEach(({dx,dy})=>{
      const nx = x+dx, ny = y+dy;
      if(nx<0||ny<0||nx>=GRID_SIZE||ny>=GRID_SIZE) return;
      const terrain = gameMap[ny][nx];
      const tDef = TERRAIN[terrain];
      if(tDef.move === 99) return;
      const moveCost = tDef.move;
      if(!visited[`${nx},${ny}`] && !getUnitAt(nx, ny, null)){
        queue.push({x:nx, y:ny, remaining: remaining - moveCost});
      }
    });
  }
  return cells;
}

function getAttackTargets(unit){
  const targets = [];
  const allEnemies = unit.team === 'player' ? enemyUnits : playerUnits;
  for(const e of allEnemies){
    if(e.hp <= 0) continue;
    const dist = Math.abs(e.x - unit.x) + Math.abs(e.y - unit.y);
    if(dist <= unit.range){
      // LOS check for ranged units
      if(unit.range > 1 && !hasLineOfSight(unit.x, unit.y, e.x, e.y)) continue;
      // Forest hides units from sight
      const eTerrain = TERRAIN[gameMap[e.y][e.x]];
      if(eTerrain.hides && unit.range > 1) continue;
      targets.push(e);
    }
  }
  return targets;
}

function getUnitAt(x, y, excludeTeam){
  const all = [...playerUnits, ...enemyUnits];
  return all.find(u => u.x === x && u.y === y && u.hp > 0 && u.team !== excludeTeam) || null;
}

function isVisible(x, y){
  if(!fogOfWar) return true;
  for(const u of playerUnits){
    if(u.hp <= 0) continue;
    const dist = Math.abs(u.x - x) + Math.abs(u.y - y);
    if(dist <= 3){
      if(!hasLineOfSight(u.x, u.y, x, y)) continue;
      return true;
    }
  }
  return false;
}

// --- Combat ---
function resolveCombat(attacker, defender){
  const atkTerrain = TERRAIN[gameMap[attacker.y][attacker.x]];
  const defTerrain = TERRAIN[gameMap[defender.y][defender.x]];
  const atkDef = attacker.atk;
  const defDef = defender.def + defTerrain.def;

  const dmg = Math.max(1, atkDef - defDef + Math.floor(Math.random()*6) - 2);
  defender.hp -= dmg;
  sfxAttack();

  damageAnims.push({x:defender.x, y:defender.y, dmg, color:'#f00', timer:30});

  // Splash damage for mages
  if(attacker.splash){
    const allEnemies = defender.team === 'player' ? playerUnits : enemyUnits;
    allEnemies.forEach(e => {
      if(e === defender || e.hp <= 0) return;
      const dist = Math.abs(e.x - defender.x) + Math.abs(e.y - defender.y);
      if(dist <= 1){
        const splashDmg = Math.max(1, Math.floor(dmg * 0.5));
        e.hp -= splashDmg;
        damageAnims.push({x:e.x, y:e.y, dmg:splashDmg, color:'#f80', timer:30});
        if(e.hp <= 0){
          e.hp = 0;
          if(e.team === 'enemy') enemiesKilled++;
          else unitsLost++;
          spawnParticles(e.x * CELL + OFFSET_X + CELL/2, e.y * CELL + OFFSET_Y + CELL/2, e.color, 10);
        }
      }
    });
  }

  if(defender.hp <= 0){
    defender.hp = 0;
    if(defender.team === 'enemy') enemiesKilled++;
    else unitsLost++;
    addUnitXP(attacker, 20);
    spawnParticles(defender.x * CELL + OFFSET_X + CELL/2, defender.y * CELL + OFFSET_Y + CELL/2, defender.color, 10);
  }

  // Counter attack
  if(defender.hp > 0){
    const counterDist = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
    if(counterDist <= defender.range){
      const counterDmg = Math.max(1, Math.floor(defender.atk * 0.7) - (attacker.def + atkTerrain.def) + Math.floor(Math.random()*4) - 2);
      if(counterDmg > 0){
        attacker.hp -= counterDmg;
        damageAnims.push({x:attacker.x, y:attacker.y, dmg:counterDmg, color:'#ff0', timer:30});
        if(attacker.hp <= 0){
          attacker.hp = 0;
          if(attacker.team === 'enemy') enemiesKilled++;
          else unitsLost++;
        }
      }
    }
  }

  attacker.attacked = true;
  attacker.acted = true;
}

// --- Heal ---
function healAdjacent(medic){
  const allies = medic.team === 'player' ? playerUnits : enemyUnits;
  let healed = false;
  for(const a of allies){
    if(a === medic || a.hp <= 0) continue;
    const dist = Math.abs(a.x - medic.x) + Math.abs(a.y - medic.y);
    if(dist <= 1 && a.hp < a.maxHp){
      const healAmt = medic.heal;
      a.hp = Math.min(a.maxHp, a.hp + healAmt);
      damageAnims.push({x:a.x, y:a.y, dmg:healAmt, color:'#0f0', timer:30, heal:true});
      sfxSelect();
      healed = true;
    }
  }
  medic.attacked = true;
  medic.acted = true;
  return healed;
}

// --- Control Point Check ---
function checkControlPoints(){
  for(const cp of controlPoints){
    const playerNear = playerUnits.some(u => u.hp > 0 && u.x === cp.x && u.y === cp.y);
    const enemyNear = enemyUnits.some(u => u.hp > 0 && u.x === cp.x && u.y === cp.y);
    if(playerNear && !enemyNear && cp.owner !== 'player'){
      cp.owner = 'player';
      sfxCapture();
    } else if(enemyNear && !playerNear && cp.owner !== 'enemy'){
      cp.owner = 'enemy';
    }
  }

  const playerCP = controlPoints.filter(cp => cp.owner === 'player').length;
  const enemyCP = controlPoints.filter(cp => cp.owner === 'enemy').length;
  if(playerCP >= 3) endMission(true);
  else if(enemyCP >= 3) endMission(false);

  if(enemyUnits.every(u => u.hp <= 0)) endMission(true);
  if(playerUnits.every(u => u.hp <= 0)) endMission(false);
}

// --- End Turn / Improved AI ---
function endPlayerTurn(){
  playerUnits.forEach(u => { u.acted = false; u.moved = false; u.attacked = false; });
  selectedUnit = null;
  moveTargets = [];
  attackTargets = [];
  phase = 'ai';
  undoUsed = false;
  document.getElementById('btn-undo').style.opacity = '1';
  document.getElementById('hud-phase').textContent = 'Enemy Turn';
  document.getElementById('hud-phase').style.color = '#f00';
  document.getElementById('ai-thinking').classList.remove('hidden');
  document.getElementById('unit-panel').classList.add('hidden');

  setTimeout(()=>{
    runAI();
    enemyUnits.forEach(u => { u.acted = false; u.moved = false; u.attacked = false; });
    checkControlPoints();
    if(state !== 'playing') return;
    currentTurn++;
    phase = 'select';
    document.getElementById('hud-phase').textContent = 'Select Unit';
    document.getElementById('hud-phase').style.color = '#0f0';
    document.getElementById('ai-thinking').classList.add('hidden');
    updateHUD();
  }, 800);
}

function runAI(){
  // Improved AI: threat assessment, flanking, focus fire, retreat, heal
  const aliveEnemies = enemyUnits.filter(u => u.hp > 0);
  const alivePlayers = playerUnits.filter(u => u.hp > 0);

  // Sort by priority: low HP allies to heal first, then by threat
  for(const unit of aliveEnemies){
    if(unit.hp <= 0) continue;

    // Check if should retreat (low HP)
    if(unit.hp < unit.maxHp * 0.25){
      const nearestPlayer = [...alivePlayers].sort((a,b) =>
        (Math.abs(a.x-unit.x)+Math.abs(a.y-unit.y)) - (Math.abs(b.x-unit.x)+Math.abs(b.y-unit.y))
      )[0];
      if(nearestPlayer){
        const dist = Math.abs(nearestPlayer.x-unit.x)+Math.abs(nearestPlayer.y-unit.y);
        if(dist <= 2){
          // Retreat: move away from nearest player
          const movable = getMovableCells(unit);
          if(movable.length > 0){
            movable.sort((a,b) => {
              const distA = Math.abs(a.x - nearestPlayer.x) + Math.abs(a.y - nearestPlayer.y);
              const distB = Math.abs(b.x - nearestPlayer.x) + Math.abs(b.y - nearestPlayer.y);
              return distB - distA; // Farthest from player
            });
            unit.x = movable[0].x; unit.y = movable[0].y;
            sfxMove();
            unit.acted = true;
            continue;
          }
        }
      }
    }

    // Try to attack with focus fire on weak targets
    const targets = getAttackTargets(unit);
    if(targets.length > 0){
      // Focus fire: pick lowest HP target
      const target = targets.reduce((best, t) => t.hp < best.hp ? t : best);
      resolveCombat(unit, target);
      continue;
    }

    // Try to heal if medic
    if(unit.heal > 0){
      const allies = enemyUnits.filter(u => u !== unit && u.hp > 0 && u.hp < u.maxHp &&
        Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y) <= 1);
      if(allies.length > 0){
        healAdjacent(unit);
        continue;
      }
    }

    // Move with flanking behavior
    let targetX, targetY;
    const uncaptured = controlPoints.filter(cp => cp.owner !== 'enemy');
    if(uncaptured.length > 0 && Math.random() < 0.6){
      const cp = uncaptured[Math.floor(Math.random() * uncaptured.length)];
      targetX = cp.x; targetY = cp.y;
    } else {
      const nearest = [...alivePlayers].sort((a,b) =>
        (Math.abs(a.x-unit.x)+Math.abs(a.y-unit.y)) - (Math.abs(b.x-unit.x)+Math.abs(b.y-unit.y))
      )[0];
      if(nearest){ targetX = nearest.x; targetY = nearest.y; }
      else continue;
    }

    const movable = getMovableCells(unit);
    if(movable.length > 0){
      // Flanking: prefer positions to the side of the target
      movable.sort((a,b) => {
        const distA = Math.abs(a.x - targetX) + Math.abs(a.y - targetY);
        const distB = Math.abs(b.x - targetX) + Math.abs(b.y - targetY);
        // Prefer side positions (not directly in front)
        const flankA = Math.abs(a.x - targetX) > Math.abs(a.y - targetY) ? -0.5 : 0;
        const flankB = Math.abs(b.x - targetX) > Math.abs(b.y - targetY) ? -0.5 : 0;
        return (distA + flankA) - (distB + flankB);
      });
      const best = movable[0];
      unit.x = best.x; unit.y = best.y;
      sfxMove();

      const newTargets = getAttackTargets(unit);
      if(newTargets.length > 0){
        const target = newTargets.reduce((best, t) => t.hp < best.hp ? t : best);
        resolveCombat(unit, target);
      }

      if(unit.heal > 0) healAdjacent(unit);
    }
    unit.acted = true;
  }
}

// --- End Mission ---
function endMission(won){
  state = 'results';
  const killCoins = enemiesKilled * 10;
  const winCoins = won ? 30 : 0;
  const flawless = unitsLost === 0 && won;
  const flawlessBonus = flawless ? 50 : 0;
  const total = killCoins + winCoins + flawlessBonus;
  addCoins(total);
  totalCoinsEarned = total;

  if(won){
    completedMissions.add(currentMission);
    if(completedMissions.size >= MISSIONS.length) unlockAchievement('allMissions');
    if(unitsLost === 0) unlockAchievement('flawless');
    const par = MISSIONS[currentMission].parTurns || 12;
    if(currentTurn <= par) unlockAchievement('tactician');
  }

  document.getElementById('results-title').textContent = won ? 'Victory!' : 'Defeat!';
  document.getElementById('results-title').style.color = won ? '#0f0' : '#f00';
  document.getElementById('results-details').innerHTML = won
    ? `Mission: <span>${MISSIONS[currentMission].title}</span><br>Enemies eliminated: <span>${enemiesKilled}</span> (+${killCoins})<br>Mission bonus: <span>+${winCoins}</span>${flawless ? '<br>Flawless victory: <span>+50</span>' : ''}<br>Units lost: <span>${unitsLost}</span><br>Turns: <span>${currentTurn}</span><br>Total coins: <span>${total}</span>`
    : `Mission: <span>${MISSIONS[currentMission].title}</span><br>Enemies eliminated: <span>${enemiesKilled}</span><br>Units lost: <span>${unitsLost}</span><br>The grid falls to the enemy...`;
  document.getElementById('results-screen').classList.remove('hidden');
  document.getElementById('game-hud').classList.add('hidden');
  document.getElementById('unit-panel').classList.add('hidden');
  document.getElementById('ai-thinking').classList.add('hidden');
  document.getElementById('btn-undo').classList.add('hidden');
  document.getElementById('btn-save').classList.add('hidden');
  if(won) sfxVictory(); else sfxDefeat();
}

// --- Particles ---
let particles = [];
function spawnParticles(x, y, color, count){
  for(let i=0;i<count;i++){
    particles.push({
      x, y, vx:(Math.random()-0.5)*4, vy:(Math.random()-0.5)*4,
      life:20+Math.random()*15, maxLife:35, color, size:2+Math.random()*3
    });
  }
}

// --- Drawing ---
function draw(){
  ctx.fillStyle = '#06060c';
  ctx.fillRect(0, 0, W, H);

  if(state === 'menu') return;
  if(!gameMap.length) return;

  // Draw grid
  for(let y=0; y<GRID_SIZE; y++){
    for(let x=0; x<GRID_SIZE; x++){
      const px = x * CELL + OFFSET_X;
      const py = y * CELL + OFFSET_Y;
      const terrain = gameMap[y][x];
      const tDef = TERRAIN[terrain];

      if(!isVisible(x, y) && fogOfWar){
        ctx.fillStyle = '#030306';
        ctx.fillRect(px, py, CELL, CELL);
        ctx.strokeStyle = '#0a0a15';
        ctx.strokeRect(px, py, CELL, CELL);
        continue;
      }

      ctx.fillStyle = tDef.color;
      ctx.fillRect(px, py, CELL, CELL);

      if(terrain === 'forest'){
        ctx.fillStyle = '#0a300a';
        ctx.beginPath();
        ctx.arc(px+CELL/2, py+CELL/2-5, 12, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#2a0a0a';
        ctx.fillRect(px+CELL/2-2, py+CELL/2+5, 4, 12);
      } else if(terrain === 'mountain'){
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(px+CELL/2, py+8);
        ctx.lineTo(px+10, py+CELL-8);
        ctx.lineTo(px+CELL-10, py+CELL-8);
        ctx.closePath();
        ctx.fill();
      } else if(terrain === 'building'){
        ctx.fillStyle = '#2a1515';
        ctx.fillRect(px+6, py+6, CELL-12, CELL-12);
        ctx.fillStyle = 'rgba(255,68,0,0.53)';
        ctx.fillRect(px+10, py+10, 5, 5);
        ctx.fillRect(px+CELL-15, py+10, 5, 5);
        ctx.fillRect(px+10, py+CELL-15, 5, 5);
      } else if(terrain === 'water'){
        ctx.fillStyle = '#0a0a3a';
        ctx.fillRect(px, py, CELL, CELL);
        ctx.strokeStyle = '#1a1a5a';
        for(let i=0;i<3;i++){
          ctx.beginPath();
          ctx.moveTo(px+5, py+15+i*12);
          ctx.quadraticCurveTo(px+CELL/2, py+10+i*12, px+CELL-5, py+15+i*12);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = '#1a1a25';
      ctx.strokeRect(px, py, CELL, CELL);
    }
  }

  // Move targets
  for(const mt of moveTargets){
    const px = mt.x * CELL + OFFSET_X;
    const py = mt.y * CELL + OFFSET_Y;
    ctx.fillStyle = 'rgba(0,255,0,0.08)';
    ctx.fillRect(px, py, CELL, CELL);
    ctx.strokeStyle = '#0f0';
    ctx.strokeRect(px+1, py+1, CELL-2, CELL-2);
  }

  // Attack targets
  for(const at of attackTargets){
    const px = at.x * CELL + OFFSET_X;
    const py = at.y * CELL + OFFSET_Y;
    ctx.fillStyle = 'rgba(255,0,0,0.08)';
    ctx.fillRect(px, py, CELL, CELL);
    ctx.strokeStyle = '#f00';
    ctx.strokeRect(px+1, py+1, CELL-2, CELL-2);
  }

  // Control points
  for(const cp of controlPoints){
    const px = cp.x * CELL + OFFSET_X;
    const py = cp.y * CELL + OFFSET_Y;
    const color = cp.owner === 'player' ? '#0f0' : cp.owner === 'enemy' ? '#f00' : '#ff0';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(px+3, py+3, CELL-6, CELL-6);
    ctx.fillStyle = color + '15';
    ctx.fillRect(px+3, py+3, CELL-6, CELL-6);
    ctx.lineWidth = 1;
    ctx.fillStyle = color;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CP', px+CELL/2, py+CELL/2+3);
  }

  // Hover
  if(hoverCell && phase === 'select'){
    const px = hoverCell.x * CELL + OFFSET_X;
    const py = hoverCell.y * CELL + OFFSET_Y;
    ctx.strokeStyle = '#fff3';
    ctx.strokeRect(px, py, CELL, CELL);
  }

  // Draw units
  const allUnits = [...playerUnits, ...enemyUnits];
  for(const u of allUnits){
    if(u.hp <= 0) continue;
    if(fogOfWar && u.team === 'enemy' && !isVisible(u.x, u.y)) continue;

    const px = u.x * CELL + OFFSET_X + CELL/2;
    const py = u.y * CELL + OFFSET_Y + CELL/2;

    ctx.fillStyle = u.team === 'player' ? '#0f0' : '#f00';
    ctx.shadowColor = u.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, 16, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#0008';
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(u.symbol, px, py + 4);

    // Level badge
    if(u.level > 1){
      ctx.fillStyle = '#ff0';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(u.level.toString(), px + 12, py - 12);
    }

    // HP bar
    if(u.hp < u.maxHp){
      const barW = 30;
      ctx.fillStyle = '#333';
      ctx.fillRect(px-barW/2, py-22, barW, 4);
      ctx.fillStyle = u.hp/u.maxHp > 0.5 ? '#0f0' : '#f00';
      ctx.fillRect(px-barW/2, py-22, barW*(u.hp/u.maxHp), 4);
    }

    if(u.acted){
      ctx.fillStyle = '#000a';
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI*2);
      ctx.fill();
    }

    if(u === selectedUnit){
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 19, 0, Math.PI*2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  // Damage animations
  damageAnims = damageAnims.filter(d => {
    d.timer--;
    const px = d.x * CELL + OFFSET_X + CELL/2;
    const py = d.y * CELL + OFFSET_Y + CELL/2 - (30 - d.timer);
    ctx.fillStyle = d.heal ? '#0f0' : d.color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.globalAlpha = d.timer / 30;
    ctx.fillText((d.heal ? '+' : '-') + d.dmg, px, py);
    ctx.globalAlpha = 1;
    return d.timer > 0;
  });

  // Particles
  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x-p.size/2, p.y-p.size/2, p.size, p.size);
    ctx.globalAlpha = 1;
    return p.life > 0;
  });
}

// --- HUD ---
function updateHUD(){
  document.getElementById('hud-mission').textContent = `Mission: ${currentMission+1}`;
  document.getElementById('hud-turn').textContent = `Turn: ${currentTurn}`;
  const playerCP = controlPoints.filter(cp => cp.owner === 'player').length;
  document.getElementById('hud-cp').textContent = `CP: ${playerCP}/3`;
}

function showUnitInfo(unit){
  document.getElementById('unit-panel').classList.remove('hidden');
  const terrain = TERRAIN[gameMap[unit.y][unit.x]];
  document.getElementById('up-name').textContent = `${unit.name} (${unit.team}) Lv.${unit.level}`;
  document.getElementById('up-stats').innerHTML =
    `HP: ${unit.hp}/${unit.maxHp}<br>ATK: ${unit.atk} | DEF: ${unit.def}<br>Move: ${unit.move} | Range: ${unit.range}<br>Terrain: ${terrain.name} (+${terrain.def} DEF)<br>XP: ${unit.xp}/${unit.xpToLevel}<br>${unit.heal ? `Heal: ${unit.heal}/turn` : ''}${unit.splash ? '| Splash' : ''}<br>${unit.acted ? '<span style="color:#888">Already acted</span>' : ''}`;
}

// --- Input ---
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top) * (H / rect.height);
  const gx = Math.floor((mx - OFFSET_X) / CELL);
  const gy = Math.floor((my - OFFSET_Y) / CELL);
  if(gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) hoverCell = {x:gx, y:gy};
  else hoverCell = null;
});

canvas.addEventListener('click', e => {
  if(state !== 'playing' || phase === 'ai' || animating) return;
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top) * (H / rect.height);
  const gx = Math.floor((mx - OFFSET_X) / CELL);
  const gy = Math.floor((my - OFFSET_Y) / CELL);

  if(gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return;

  if(phase === 'select'){
    const unit = playerUnits.find(u => u.hp > 0 && u.x === gx && u.y === gy && !u.acted);
    if(unit){
      selectedUnit = unit;
      saveUndoState();
      moveTargets = getMovableCells(unit);
      attackTargets = [];
      phase = 'move';
      sfxSelect();
      showUnitInfo(unit);
    }
  } else if(phase === 'move'){
    const moveTarget = moveTargets.find(mt => mt.x === gx && mt.y === gy);
    if(moveTarget){
      selectedUnit.x = gx;
      selectedUnit.y = gy;
      selectedUnit.moved = true;
      sfxMove();
      moveTargets = [];
      attackTargets = getAttackTargets(selectedUnit);
      if(attackTargets.length > 0){
        phase = 'attack';
        document.getElementById('hud-phase').textContent = 'Select Target';
        document.getElementById('hud-phase').style.color = '#f80';
      } else {
        if(selectedUnit.heal > 0) healAdjacent(selectedUnit);
        selectedUnit.acted = true;
        phase = 'select';
        selectedUnit = null;
        document.getElementById('hud-phase').textContent = 'Select Unit';
        document.getElementById('hud-phase').style.color = '#0f0';
        checkControlPoints();
      }
      showUnitInfo(selectedUnit);
    } else {
      const enemy = enemyUnits.find(u => u.hp > 0 && u.x === gx && u.y === gy);
      if(enemy){
        const dist = Math.abs(enemy.x - selectedUnit.x) + Math.abs(enemy.y - selectedUnit.y);
        if(dist <= selectedUnit.range && !selectedUnit.attacked){
          resolveCombat(selectedUnit, enemy);
          selectedUnit.acted = true;
          attackTargets = [];
          phase = 'select';
          selectedUnit = null;
          document.getElementById('hud-phase').textContent = 'Select Unit';
          document.getElementById('hud-phase').style.color = '#0f0';
          checkControlPoints();
          updateHUD();
        }
      } else {
        selectedUnit = null;
        moveTargets = [];
        phase = 'select';
        document.getElementById('hud-phase').textContent = 'Select Unit';
        document.getElementById('hud-phase').style.color = '#0f0';
        document.getElementById('unit-panel').classList.add('hidden');
      }
    }
  } else if(phase === 'attack'){
    const target = attackTargets.find(t => t.x === gx && t.y === gy);
    if(target){
      resolveCombat(selectedUnit, target);
      selectedUnit.acted = true;
      attackTargets = [];
      phase = 'select';
      selectedUnit = null;
      document.getElementById('hud-phase').textContent = 'Select Unit';
      document.getElementById('hud-phase').style.color = '#0f0';
      checkControlPoints();
      updateHUD();
    } else {
      if(selectedUnit.heal > 0) healAdjacent(selectedUnit);
      selectedUnit.acted = true;
      attackTargets = [];
      phase = 'select';
      selectedUnit = null;
      document.getElementById('hud-phase').textContent = 'Select Unit';
      document.getElementById('hud-phase').style.color = '#0f0';
      document.getElementById('unit-panel').classList.add('hidden');
    }
  }
});

// --- Gamepad Support ---
let gpPrevButtons = [];
function pollGamepad(){
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for(let i=0;i<gps.length;i++){if(gps[i]){gp=gps[i];break;}}
  if(!gp){requestAnimationFrame(pollGamepad);return;}

  if(state==='playing'&&phase!=='ai'){
    // D-pad: navigate grid cursor
    if(gp.axes[1]<-0.5&&!gpPrevButtons[12]){hoverCell={x:(hoverCell?hoverCell.x:5),y:Math.max(0,(hoverCell?hoverCell.y:5)-1)};gpPrevButtons[12]=true;}
    else gpPrevButtons[12]=false;
    if(gp.axes[1]>0.5&&!gpPrevButtons[16]){hoverCell={x:(hoverCell?hoverCell.x:5),y:Math.min(GRID_SIZE-1,(hoverCell?hoverCell.y:5)+1)};gpPrevButtons[16]=true;}
    else gpPrevButtons[16]=false;
    if(gp.axes[0]<-0.5&&!gpPrevButtons[14]){hoverCell={x:Math.max(0,(hoverCell?hoverCell.x:5)-1),y:(hoverCell?hoverCell.y:5)};gpPrevButtons[14]=true;}
    else gpPrevButtons[14]=false;
    if(gp.axes[0]>0.5&&!gpPrevButtons[15]){hoverCell={x:Math.min(GRID_SIZE-1,(hoverCell?hoverCell.x:5)+1),y:(hoverCell?hoverCell.y:5)};gpPrevButtons[15]=true;}
    else gpPrevButtons[15]=false;

    // A button = select
    if(gp.buttons[0]&&gp.buttons[0].pressed&&!gpPrevButtons[0]){
      gpPrevButtons[0]=true;
      if(hoverCell){
        const ev = new MouseEvent('click',{clientX:0,clientY:0});
        // Simulate by calling the logic directly
        const gx=hoverCell.x,gy=hoverCell.y;
        if(phase==='select'){
          const unit=playerUnits.find(u=>u.hp>0&&u.x===gx&&u.y===gy&&!u.acted);
          if(unit){selectedUnit=unit;saveUndoState();moveTargets=getMovableCells(unit);attackTargets=[];phase='move';sfxSelect();showUnitInfo(unit);}
        }else if(phase==='move'){
          const mt=moveTargets.find(m=>m.x===gx&&m.y===gy);
          if(mt){selectedUnit.x=gx;selectedUnit.y=gy;selectedUnit.moved=true;sfxMove();moveTargets=[];attackTargets=getAttackTargets(selectedUnit);
            if(attackTargets.length>0){phase='attack';document.getElementById('hud-phase').textContent='Select Target';document.getElementById('hud-phase').style.color='#f80';}
            else{if(selectedUnit.heal>0)healAdjacent(selectedUnit);selectedUnit.acted=true;phase='select';selectedUnit=null;document.getElementById('hud-phase').textContent='Select Unit';document.getElementById('hud-phase').style.color='#0f0';checkControlPoints();}
            showUnitInfo(selectedUnit);}
        }else if(phase==='attack'){
          const target=attackTargets.find(t=>t.x===gx&&t.y===gy);
          if(target){resolveCombat(selectedUnit,target);selectedUnit.acted=true;attackTargets=[];phase='select';selectedUnit=null;document.getElementById('hud-phase').textContent='Select Unit';document.getElementById('hud-phase').style.color='#0f0';checkControlPoints();updateHUD();}
          else{if(selectedUnit.heal>0)healAdjacent(selectedUnit);selectedUnit.acted=true;attackTargets=[];phase='select';selectedUnit=null;document.getElementById('hud-phase').textContent='Select Unit';document.getElementById('hud-phase').style.color='#0f0';document.getElementById('unit-panel').classList.add('hidden');}
        }
      }
    }else if(!gp.buttons[0]||!gp.buttons[0].pressed)gpPrevButtons[0]=false;

    // Y button = undo
    if(gp.buttons[3]&&gp.buttons[3].pressed&&!gpPrevButtons[3]){gpPrevButtons[3]=true;doUndo();}
    else gpPrevButtons[3]=false;

    // LB = end turn
    if(gp.buttons[4]&&gp.buttons[4].pressed&&!gpPrevButtons[4]){gpPrevButtons[4]=true;if(phase!=='ai'&&state==='playing')endPlayerTurn();}
    else gpPrevButtons[4]=false;

    // Start = save
    if(gp.buttons[9]&&gp.buttons[9].pressed&&!gpPrevButtons[9]){gpPrevButtons[9]=true;saveMission();}
    else gpPrevButtons[9]=false;
  }
  requestAnimationFrame(pollGamepad);
}
window.addEventListener('gamepadconnected',()=>{requestAnimationFrame(pollGamepad);});

// --- Buttons ---
// Add undo and save buttons
const undoBtn = document.createElement('button');
undoBtn.className = 'neon-btn small-btn';
undoBtn.id = 'btn-undo';
undoBtn.textContent = 'Undo';
undoBtn.style.cssText = 'position:fixed;top:60px;left:10px;z-index:100;';
undoBtn.classList.add('hidden');
document.body.appendChild(undoBtn);

const saveBtn = document.createElement('button');
saveBtn.className = 'neon-btn small-btn';
saveBtn.id = 'btn-save';
saveBtn.textContent = 'Save';
saveBtn.style.cssText = 'position:fixed;top:60px;right:10px;z-index:100;';
saveBtn.classList.add('hidden');
document.body.appendChild(saveBtn);

const loadBtn = document.createElement('button');
loadBtn.className = 'neon-btn';
loadBtn.textContent = 'Load Game';
loadBtn.style.cssText = 'display:block;margin:5px auto;';
document.getElementById('menu-screen').insertBefore(loadBtn, document.getElementById('btn-skirmish'));

undoBtn.onclick = () => { if(phase!=='ai'&&state==='playing') doUndo(); };
saveBtn.onclick = () => { if(state==='playing') saveMission(); };
loadBtn.onclick = () => { try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){} loadMission(); };

document.getElementById('btn-end-turn').onclick = ()=>{
  if(phase !== 'ai' && state === 'playing') endPlayerTurn();
};

document.getElementById('btn-wait').onclick = ()=>{
  if(selectedUnit){
    selectedUnit.acted = true;
    moveTargets = [];
    attackTargets = [];
    selectedUnit = null;
    phase = 'select';
    document.getElementById('hud-phase').textContent = 'Select Unit';
    document.getElementById('hud-phase').style.color = '#0f0';
    document.getElementById('unit-panel').classList.add('hidden');
  }
};

document.getElementById('btn-campaign').onclick = ()=>{
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  missionMode = 'campaign';
  initMission(0);
};

document.getElementById('btn-skirmish').onclick = ()=>{
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  missionMode = 'skirmish';
  initMission(Math.floor(Math.random() * MISSIONS.length));
};

document.getElementById('btn-start-mission').onclick = ()=>{
  startMission();
};

document.getElementById('btn-results-continue').onclick = ()=>{
  document.getElementById('results-screen').classList.add('hidden');
  const won = document.getElementById('results-title').textContent.includes('Victory');
  if(won && missionMode === 'campaign' && currentMission < MISSIONS.length - 1){
    showAd(()=>{
      playerUnits.forEach(u => { if(u.hp > 0) u.hp = u.maxHp; });
      initMission(currentMission + 1);
    });
  } else {
    state = 'menu';
    document.getElementById('menu-screen').classList.remove('hidden');
  }
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
function gameLoop(){
  draw();
  requestAnimationFrame(gameLoop);
}

document.getElementById('coinDisplay').textContent = getCoins();
loadAchievements();
// Check for save on load
if(localStorage.getItem('ngn4_cg_save')){
  loadBtn.style.color = '#ff0';
  loadBtn.textContent = 'Load Game (Save Found!)';
}
gameLoop();

})();
