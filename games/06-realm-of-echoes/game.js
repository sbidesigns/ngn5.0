// ============================================================
// NGN4 GAME 6: REALM OF ECHOES - RPG Adventure
// ============================================================
(function(){
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('realm-of-echoes'); } catch(e) {}


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// --- Audio System ---
let audioCtx = null;
function getAudioCtx() { if (!audioCtx) try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} return audioCtx; }
function playTone(freq, dur, type='square', vol=0.15){
  if (!getAudioCtx()) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}
function sfxHit(){ playTone(200, 0.15, 'sawtooth', 0.2); }
function sfxMagic(){ playTone(600, 0.3, 'sine', 0.15); playTone(800, 0.3, 'sine', 0.1); }
function sfxPickup(){ playTone(500, 0.1); playTone(700, 0.15); }
function sfxLevelUp(){ playTone(400, 0.15); setTimeout(()=>playTone(500, 0.15), 100); setTimeout(()=>playTone(700, 0.2), 200); }
function sfxDeath(){ playTone(150, 0.4, 'sawtooth', 0.2); }
function sfxStep(){ playTone(80 + Math.random()*40, 0.05, 'triangle', 0.05); }
function sfxVictory(){ [400,500,600,800].forEach((f,i)=>setTimeout(()=>playTone(f,0.2,'sine',0.15), i*120)); }
function sfxAchieve(){ playTone(600,0.1,'sine',0.12); setTimeout(()=>playTone(900,0.15,'sine',0.12),100); setTimeout(()=>playTone(1200,0.2,'sine',0.15),200); }
function sfxSave(){ playTone(300,0.1,'sine',0.08); playTone(500,0.15,'sine',0.08); }

// --- Rewards System ---
function getCoins(){
  const r = JSON.parse(localStorage.getItem('ngn4_rewards') || '{}');
  return r.coins || 0;
}
function addCoins(n){
  const r = JSON.parse(localStorage.getItem('ngn4_rewards') || '{}');
  r.coins = (r.coins || 0) + n;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
  updateCoinDisplay();
}
function updateCoinDisplay(){
  document.getElementById('coinDisplay').textContent = getCoins();
  const hc = document.getElementById('hud-coins');
  if(hc) hc.textContent = getCoins();
}

// --- Achievements ---
const ACHIEVEMENTS = {
  firstBoss: { name:'Boss Slayer', desc:'Defeat the Echo Dragon Lord', unlocked:false },
  maxLevel: { name:'Max Level', desc:'Reach level 10', unlocked:false },
  allEquip: { name:'Fully Equipped', desc:'Have all 3 equipment slots filled', unlocked:false },
  speedRun: { name:'Speed Runner', desc:'Complete in under 10 minutes', unlocked:false }
};
function loadAchievements(){
  try{const d=JSON.parse(localStorage.getItem('ngn4_roe_achievements')||'{}');
    Object.keys(ACHIEVEMENTS).forEach(k=>{if(d[k])ACHIEVEMENTS[k].unlocked=d[k].unlocked;});
  }catch(e){}
}
function saveAchievements(){
  const d={};Object.keys(ACHIEVEMENTS).forEach(k=>{d[k]={unlocked:ACHIEVEMENTS[k].unlocked};});
  try{localStorage.setItem('ngn4_roe_achievements',JSON.stringify(d));}catch(e){}
}
function unlockAchievement(key){
  if(ACHIEVEMENTS[key]&&!ACHIEVEMENTS[key].unlocked){
    ACHIEVEMENTS[key].unlocked=true;saveAchievements();sfxAchieve();
    const el=document.createElement('div');
    el.style.cssText='position:fixed;top:15%;left:50%;transform:translateX(-50%);background:#111;border:2px solid #ff0;padding:12px 24px;color:#ff0;font-family:monospace;font-size:14px;z-index:1000;white-space:nowrap;';
    el.textContent=`🏆 ${ACHIEVEMENTS[key].name}: ${ACHIEVEMENTS[key].desc}`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),3000);
  }
}

// --- Character Classes ---
const CLASSES = {
  warrior: { name:'Warrior', hp:130, mp:30, atk:15, def:8, speed:2.2, desc:'High ATK & HP', color:'#f44' },
  mage:    { name:'Mage', hp:70, mp:80, atk:10, def:3, speed:2.5, desc:'High MP & magic', color:'#a0f' },
  rogue:   { name:'Rogue', hp:90, mp:50, atk:13, def:4, speed:3.0, desc:'High crit & speed', color:'#0f0' },
  cleric:  { name:'Cleric', hp:100, mp:60, atk:8, def:6, speed:2.3, desc:'Healing focus', color:'#ff0' }
};

// --- Status Effects ---
const STATUS_EFFECTS = {
  poison: { name:'Poison', color:'#0f0', duration:3, dmgPerTurn:5 },
  burn:   { name:'Burn', color:'#f80', duration:2, dmgPerTurn:8 },
  freeze: { name:'Freeze', color:'#0af', duration:1, skipTurn:true },
  stun:   { name:'Stun', color:'#ff0', duration:1, skipTurn:true }
};

// --- State ---
let state = 'menu';
let selectedClass = 'warrior';
let player, dungeon, currentFloor, enemies, chests, combatEnemy, combatLog, combatTurn;
let animFrame, stepTimer = 0;
let keys_pressed = {};
let totalCoinsEarned = 0;
let resultsData = null;
let adCallback = null;
let hasSave = false;
let gameStartTime = 0;
let npcs = []; // NPCs in dungeon
let questLog = []; // Active quests
let dialogActive = false;
let dialogNPC = null;
let dialogOptions = [];

// --- Player ---
function createPlayer(cls){
  const c = CLASSES[cls];
  return {
    x: 400, y: 300, w: 24, h: 24, speed: c.speed,
    hp: c.hp, maxHp: c.hp, mp: c.mp, maxMp: c.mp,
    atk: c.atk, def: c.def, level: 1, xp: 0, xpNext: 100,
    hpPotions: 3, mpPotions: 2,
    equipment: { sword: null, shield: null, armor: null },
    gold: 0, animTimer: 0, cls: cls,
    statusEffects: [], // {type, turnsLeft}
    critChance: cls === 'rogue' ? 0.25 : 0.05
  };
}

function getPlayerStats(){
  let atk = player.atk, def = player.def;
  if(player.equipment.sword) atk += player.equipment.sword.atk;
  if(player.equipment.shield) def += player.equipment.shield.def;
  if(player.equipment.armor) def += player.equipment.armor.def;
  return { atk, def };
}

function xpToLevel(){
  player.xp -= player.xpNext;
  player.level++;
  player.xpNext = Math.floor(player.xpNext * 1.5);
  player.maxHp += 15;
  player.maxMp += 8;
  player.hp = player.maxHp;
  player.mp = player.maxMp;
  player.atk += 3;
  player.def += 2;
  if(player.cls==='warrior'){player.maxHp+=5;player.hp+=5;player.atk+=2;}
  else if(player.cls==='mage'){player.maxMp+=10;player.mp+=10;}
  else if(player.cls==='rogue'){player.critChance=Math.min(0.5,player.critChance+0.03);}
  else if(player.cls==='cleric'){player.maxHp+=10;player.hp+=10;player.maxMp+=5;player.mp+=5;}
  const bonus = player.level * 10;
  addCoins(bonus);
  player.gold += bonus;
  totalCoinsEarned += bonus;
  sfxLevelUp();
  addCombatLog(`LEVEL UP! Now level ${player.level}! +${bonus} coins!`);
  if(player.level >= 10) unlockAchievement('maxLevel');
  if(player.equipment.sword&&player.equipment.shield&&player.equipment.armor) unlockAchievement('allEquip');
}

// --- Dungeon Generation ---
const ROOM_MIN = 5, ROOM_MAX = 9;
const TILE = 40;
const MAP_W = 20, MAP_H = 15;

function generateDungeon(floor){
  const map = Array.from({length:MAP_H}, ()=> Array(MAP_W).fill(1));
  const rooms = [];
  const numRooms = 4 + Math.min(floor, 4);

  for(let attempt = 0; attempt < 100 && rooms.length < numRooms; attempt++){
    const rw = ROOM_MIN + Math.floor(Math.random()*(ROOM_MAX-ROOM_MIN));
    const rh = ROOM_MIN + Math.floor(Math.random()*(ROOM_MAX-ROOM_MIN));
    const rx = 1 + Math.floor(Math.random()*(MAP_W - rw - 2));
    const ry = 1 + Math.floor(Math.random()*(MAP_H - rh - 2));
    let overlap = false;
    for(const room of rooms){
      if(rx < room.x+room.w+1 && rx+rw+1 > room.x && ry < room.y+room.h+1 && ry+rh+1 > room.y){
        overlap = true; break;
      }
    }
    if(!overlap){
      rooms.push({x:rx, y:ry, w:rw, h:rh});
      for(let y=ry; y<ry+rh; y++)
        for(let x=rx; x<rx+rw; x++)
          map[y][x] = 0;
    }
  }

  for(let i=1; i<rooms.length; i++){
    const a = {x: Math.floor(rooms[i-1].x + rooms[i-1].w/2), y: Math.floor(rooms[i-1].y + rooms[i-1].h/2)};
    const b = {x: Math.floor(rooms[i].x + rooms[i].w/2), y: Math.floor(rooms[i].y + rooms[i].h/2)};
    let cx = a.x;
    while(cx !== b.x){ map[a.y][cx] = 0; cx += cx < b.x ? 1 : -1; }
    map[a.y][cx] = 0;
    let cy = a.y;
    while(cy !== b.y){ map[cy][b.x] = 0; cy += cy < b.y ? 1 : -1; }
    map[cy][b.x] = 0;
  }

  const lastRoom = rooms[rooms.length - 1];
  const stairs = {
    x: (lastRoom.x + Math.floor(lastRoom.w/2)) * TILE + TILE/2,
    y: (lastRoom.y + Math.floor(lastRoom.h/2)) * TILE + TILE/2
  };

  const firstRoom = rooms[0];
  const spawn = {
    x: (firstRoom.x + Math.floor(firstRoom.w/2)) * TILE + TILE/2,
    y: (firstRoom.y + Math.floor(firstRoom.h/2)) * TILE + TILE/2
  };

  const floorEnemies = [];
  for(let i=1; i<rooms.length - 1; i++){
    const r = rooms[i];
    const numE = 1 + Math.floor(Math.random() * 3);
    for(let j=0; j<numE; j++){
      floorEnemies.push({
        x: (r.x + 1 + Math.floor(Math.random()*(r.w-2))) * TILE + TILE/2,
        y: (r.y + 1 + Math.floor(Math.random()*(r.h-2))) * TILE + TILE/2,
        type: getRandomEnemyType(floor),
        alive: true
      });
    }
  }

  const floorChests = [];
  for(let i=1; i<rooms.length; i++){
    if(Math.random() < 0.5){
      const r = rooms[i];
      floorChests.push({
        x: (r.x + 1 + Math.floor(Math.random()*(r.w-2))) * TILE + TILE/2,
        y: (r.y + 1 + Math.floor(Math.random()*(r.h-2))) * TILE + TILE/2,
        opened: false
      });
    }
  }

  // NPCs - merchant and quest giver in specific rooms
  const floorNPCs = [];
  if(rooms.length > 2){
    const merchantRoom = rooms[1];
    floorNPCs.push({
      x: (merchantRoom.x + Math.floor(merchantRoom.w/2)) * TILE + TILE/2,
      y: (merchantRoom.y + Math.floor(merchantRoom.h/2)) * TILE + TILE/2,
      type: 'merchant', name: 'Merchant Mira',
      dialogues: [
        'Welcome, Wanderer! I have wares for sale.',
        'The deeper you go, the stronger the enemies.',
        'May the Echo Spirit guide your path.'
      ]
    });
  }
  if(rooms.length > 3){
    const questRoom = rooms[2];
    floorNPCs.push({
      x: (questRoom.x + Math.floor(questRoom.w/2)) * TILE + TILE/2,
      y: (questRoom.y + Math.floor(questRoom.h/2)) * TILE + TILE/2,
      type: 'questgiver', name: 'Sage Echo',
      dialogues: [
        'The spirits grow restless...',
        'Defeat 5 enemies and I shall reward you.',
        'The Dragon Lord awaits on the deepest floor.'
      ],
      quest: { type:'kill', target:5, progress:0, reward:100, rewardItem:null, accepted:false }
    });
  }

  return { map, rooms, stairs, spawn, enemies: floorEnemies, chests: floorChests, npcs: floorNPCs };
}

function getRandomEnemyType(floor){
  const types = ['slime'];
  if(floor >= 1) types.push('skeleton');
  if(floor >= 2) types.push('dark_mage');
  if(floor >= 3) types.push('skeleton', 'dark_mage');
  if(floor >= 4) types.push('dragon');
  return types[Math.floor(Math.random() * types.length)];
}

// --- Enemy Templates ---
const ENEMY_TEMPLATES = {
  slime: { name:'Slime', hp:25, atk:6, def:2, xp:20, coins:15, color:'#0f0' },
  skeleton: { name:'Skeleton', hp:40, atk:10, def:4, xp:35, coins:20, color:'#ccc' },
  dark_mage: { name:'Dark Mage', hp:35, atk:14, def:3, xp:45, coins:25, color:'#a0f', mpAtk: true },
  dragon: { name:'Dragon', hp:120, atk:20, def:10, xp:150, coins:50, color:'#f50', isBoss:true }
};

const BOSS_TEMPLATE = { name:'Echo Dragon Lord', hp:200, atk:25, def:12, xp:300, coins:200, color:'#f00', isBoss:true };

// --- Equipment ---
const EQUIPMENT_TABLE = {
  sword: [
    { name:'Rusty Sword', atk:3, def:0, cost:50 },
    { name:'Steel Blade', atk:6, def:0, cost:120 },
    { name:'Echo Edge', atk:10, def:0, cost:250 },
    { name:'Dragon Slayer', atk:16, def:0, cost:500 }
  ],
  shield: [
    { name:'Wood Shield', atk:0, def:3, cost:40 },
    { name:'Iron Guard', atk:0, def:6, cost:100 },
    { name:'Echo Ward', atk:0, def:10, cost:220 },
    { name:'Dragon Scale', atk:0, def:15, cost:450 }
  ],
  armor: [
    { name:'Leather Vest', atk:0, def:4, cost:60 },
    { name:'Chain Mail', atk:0, def:8, cost:130 },
    { name:'Echo Plate', atk:0, def:13, cost:280 },
    { name:'Dragon Hide', atk:0, def:18, cost:520 }
  ]
};

function getRandomEquipment(floor){
  const slot = ['sword','shield','armor'][Math.floor(Math.random()*3)];
  const tier = Math.min(Math.floor(floor / 1.5), EQUIPMENT_TABLE[slot].length - 1);
  const table = EQUIPMENT_TABLE[slot];
  const item = table[Math.min(table.length - 1, Math.max(0, tier + Math.floor(Math.random()*2) - 1))];
  return { slot, ...item };
}

// --- Spells ---
const SPELLS = {
  echoBlast: { name:'Echo Blast', mpCost:15, desc:'1.8x ATK magic damage', type:'damage', mult:1.8 },
  fire: { name:'Fire', mpCost:20, desc:'2.5x ATK fire damage', type:'damage', mult:2.5, status:'burn' },
  ice: { name:'Ice', mpCost:18, desc:'1.5x ATK + slow', type:'damage', mult:1.5, status:'freeze' },
  heal: { name:'Heal', mpCost:15, desc:'Restore 30 HP', type:'heal', amount:30 },
  shield: { name:'Shield', mpCost:10, desc:'+50% DEF for combat', type:'buff', stat:'def', mult:1.5 }
};

// --- Combat System ---
let combatShieldBuff = false;
let combatShieldTurns = 0;

function startCombat(enemyData){
  state = 'combat';
  combatShieldBuff = false;
  combatShieldTurns = 0;
  const template = ENEMY_TEMPLATES[enemyData.type] || ENEMY_TEMPLATES.slime;
  const floorMult = 1 + currentFloor * 0.2;
  combatEnemy = {
    name: template.name,
    hp: Math.floor(template.hp * floorMult),
    maxHp: Math.floor(template.hp * floorMult),
    atk: Math.floor(template.atk * floorMult),
    def: Math.floor(template.def * floorMult),
    xp: Math.floor(template.xp * floorMult),
    coins: Math.floor(template.coins * floorMult),
    color: template.color,
    mpAtk: template.mpAtk || false,
    isBoss: template.isBoss || false,
    animY: 0,
    statusEffects: [],
    bossPhase: template.isBoss ? 0 : -1,
    bossPhaseHp: template.isBoss ? [0.7, 0.4] : []
  };
  combatLog = [`A wild ${combatEnemy.name} appeared!`];
  combatTurn = 'player';
  enemyData.alive = false;
  updateCombatUI();
  document.getElementById('combat-ui').classList.remove('hidden');
}

function updateCombatUI(){
  const stats = getPlayerStats();
  let atkDisplay = stats.atk;
  let defDisplay = stats.def;
  if(combatShieldBuff){ defDisplay = Math.floor(defDisplay * 1.5); }

  let enemyStatusStr = '';
  combatEnemy.statusEffects.forEach(se => {
    enemyStatusStr += ` [${STATUS_EFFECTS[se.type].name}(${se.turnsLeft})]`;
  });

  document.getElementById('enemy-info').innerHTML =
    `<span style="color:${combatEnemy.color}">${combatEnemy.name}</span> HP: ${combatEnemy.hp}/${combatEnemy.maxHp} ${combatEnemy.isBoss?'[BOSS Phase '+(combatEnemy.bossPhase+1)+']':''}${enemyStatusStr}`;
  document.getElementById('combat-log').innerHTML = combatLog.join('<br>');
  document.getElementById('combat-log').scrollTop = 9999;
  document.getElementById('player-combat-stats').innerHTML =
    `HP: ${player.hp}/${player.maxHp} | MP: ${player.mp}/${player.maxMp} | ATK: ${atkDisplay} | DEF: ${defDisplay}${combatShieldBuff?' [SHIELDED]':''}`;
  const actions = document.getElementById('combat-actions');
  actions.innerHTML = '';
  if(combatTurn === 'player'){
    const btns = [
      {label:'Attack', fn:combatAttack},
      {label:'Echo Blast (15 MP)', fn:()=>castSpell('echoBlast'), disabled: player.mp < 15},
      {label:'Fire (20 MP)', fn:()=>castSpell('fire'), disabled: player.mp < 20},
      {label:'Ice (18 MP)', fn:()=>castSpell('ice'), disabled: player.mp < 18},
      {label:'Heal (15 MP)', fn:()=>castSpell('heal'), disabled: player.mp < 15},
      {label:'Shield (10 MP)', fn:()=>castSpell('shield'), disabled: player.mp < 10},
      {label:'HP Potion', fn:()=>combatUsePotion('hp'), disabled: player.hpPotions <= 0},
      {label:'MP Potion', fn:()=>combatUsePotion('mp'), disabled: player.mpPotions <= 0},
      {label:'Flee', fn:combatFlee}
    ];
    btns.forEach(b=>{
      const btn = document.createElement('button');
      btn.textContent = b.label;
      btn.onclick = b.fn;
      btn.disabled = b.disabled || false;
      actions.appendChild(btn);
    });
  }
}

function addCombatLog(msg){
  combatLog.push(msg);
  if(combatLog.length > 50) combatLog.shift();
}

function combatAttack(){
  const stats = getPlayerStats();
  let isCrit = Math.random() < player.critChance;
  let dmg = Math.max(1, stats.atk - combatEnemy.def + Math.floor(Math.random()*5) - 2);
  if(isCrit) dmg = Math.floor(dmg * 2);
  combatEnemy.hp -= dmg;
  sfxHit();
  addCombatLog(`You attack for ${dmg} damage!${isCrit?' CRITICAL!':''}`);
  combatEnemy.animY = -8;
  if(combatEnemy.hp <= 0) endCombatVictory();
  else { combatTurn = 'enemy'; setTimeout(enemyTurn, 600); }
  updateCombatUI();
}

function castSpell(spellKey){
  const spell = SPELLS[spellKey];
  if(player.mp < spell.mpCost) return;
  player.mp -= spell.mpCost;

  if(spell.type === 'damage'){
    const stats = getPlayerStats();
    let dmg = Math.floor(stats.atk * spell.mult + Math.random()*8);
    let isCrit = Math.random() < player.critChance;
    if(isCrit) dmg = Math.floor(dmg * 1.5);
    combatEnemy.hp -= dmg;
    sfxMagic();
    addCombatLog(`${spell.name} for ${dmg} magic damage!${isCrit?' CRITICAL!':''}`);
    combatEnemy.animY = -12;
    if(spell.status){
      combatEnemy.statusEffects.push({type: spell.status, turnsLeft: STATUS_EFFECTS[spell.status].duration});
      addCombatLog(`${combatEnemy.name} is ${STATUS_EFFECTS[spell.status].name}ed!`);
    }
    if(combatEnemy.hp <= 0) endCombatVictory();
    else { combatTurn = 'enemy'; setTimeout(enemyTurn, 600); }
  } else if(spell.type === 'heal'){
    let healAmt = spell.amount + player.level * 5;
    if(player.cls === 'cleric') healAmt = Math.floor(healAmt * 1.5);
    player.hp = Math.min(player.maxHp, player.hp + healAmt);
    sfxPickup();
    addCombatLog(`${spell.name}! +${healAmt} HP`);
    combatTurn = 'enemy';
    setTimeout(enemyTurn, 600);
  } else if(spell.type === 'buff'){
    combatShieldBuff = true;
    combatShieldTurns = 3;
    sfxMagic();
    addCombatLog(`${spell.name} activated! DEF +50% for 3 turns!`);
    combatTurn = 'enemy';
    setTimeout(enemyTurn, 600);
  }
  updateCombatUI();
}

function combatUsePotion(type){
  if(type === 'hp'){
    player.hpPotions--;
    const heal = 30 + player.level * 5;
    player.hp = Math.min(player.maxHp, player.hp + heal);
    addCombatLog(`Used HP Potion! +${heal} HP`);
    sfxPickup();
  } else {
    player.mpPotions--;
    const restore = 20 + player.level * 3;
    player.mp = Math.min(player.maxMp, player.mp + restore);
    addCombatLog(`Used MP Potion! +${restore} MP`);
    sfxPickup();
  }
  combatTurn = 'enemy';
  setTimeout(enemyTurn, 600);
  updateCombatUI();
}

function combatFlee(){
  if(combatEnemy.isBoss){
    addCombatLog("Can't flee from a boss!");
    updateCombatUI();
    return;
  }
  if(Math.random() < 0.6){
    addCombatLog('You fled successfully!');
    sfxStep();
    setTimeout(()=>{
      document.getElementById('combat-ui').classList.add('hidden');
      state = 'explore';
    }, 800);
  } else {
    addCombatLog('Failed to flee!');
    combatTurn = 'enemy';
    setTimeout(enemyTurn, 600);
  }
  updateCombatUI();
}

function enemyTurn(){
  // Check enemy status effects
  let skipTurn = false;
  combatEnemy.statusEffects = combatEnemy.statusEffects.filter(se => {
    se.turnsLeft--;
    const seDef = STATUS_EFFECTS[se.type];
    if(seDef.dmgPerTurn){
      combatEnemy.hp -= seDef.dmgPerTurn;
      addCombatLog(`${combatEnemy.name} takes ${seDef.dmgPerTurn} ${se.type} damage!`);
    }
    if(seDef.skipTurn && se.turnsLeft >= 0){
      skipTurn = true;
      addCombatLog(`${combatEnemy.name} is ${seDef.name}d and can't move!`);
    }
    return se.turnsLeft > 0;
  });

  if(combatEnemy.hp <= 0){
    endCombatVictory();
    return;
  }

  if(skipTurn){
    combatTurn = 'player';
    updateCombatUI();
    return;
  }

  // Shield buff countdown
  if(combatShieldBuff){
    combatShieldTurns--;
    if(combatShieldTurns <= 0) combatShieldBuff = false;
  }

  const stats = getPlayerStats();
  let defDisplay = stats.def;
  if(combatShieldBuff) defDisplay = Math.floor(defDisplay * 1.5);

  // Boss phases
  if(combatEnemy.isBoss && combatEnemy.bossPhase >= 0){
    const hpPct = combatEnemy.hp / combatEnemy.maxHp;
    const newPhase = combatEnemy.bossPhaseHp.filter(t => hpPct <= t).length;
    if(newPhase > combatEnemy.bossPhase){
      combatEnemy.bossPhase = newPhase;
      combatEnemy.atk = Math.floor(combatEnemy.atk * 1.3);
      addCombatLog(`[BOSS PHASE ${newPhase+1}] ${combatEnemy.name} becomes enraged!`);
    }
  }

  let dmg;
  if(combatEnemy.mpAtk && Math.random() < 0.4){
    dmg = Math.floor(combatEnemy.atk * 1.5 - defDisplay * 0.5 + Math.random()*5);
    addCombatLog(`${combatEnemy.name} casts Dark Bolt for ${Math.max(1,dmg)} damage!`);
    sfxMagic();
  } else {
    dmg = Math.max(1, combatEnemy.atk - defDisplay + Math.floor(Math.random()*5) - 2);
    addCombatLog(`${combatEnemy.name} attacks for ${dmg} damage!`);
    sfxHit();
  }
  player.hp -= Math.max(1, dmg);

  // Boss may apply status
  if(combatEnemy.isBoss && Math.random() < 0.3){
    const statuses = ['poison','burn'];
    const st = statuses[Math.floor(Math.random()*statuses.length)];
    player.statusEffects.push({type:st, turnsLeft:STATUS_EFFECTS[st].duration});
    addCombatLog(`You are ${STATUS_EFFECTS[st].name}ed!`);
  }

  if(player.hp <= 0){
    player.hp = 0;
    addCombatLog('You have fallen...');
    sfxDeath();
    updateCombatUI();
    setTimeout(()=>{
      document.getElementById('combat-ui').classList.add('hidden');
      showResults(false);
    }, 1200);
  } else {
    combatTurn = 'player';
    updateCombatUI();
  }
}

function endCombatVictory(){
  addCombatLog(`${combatEnemy.name} defeated!`);
  const xpGain = combatEnemy.xp;
  const coinGain = combatEnemy.coins;
  player.xp += xpGain;
  addCoins(coinGain);
  player.gold += coinGain;
  totalCoinsEarned += coinGain;
  addCombatLog(`+${xpGain} XP, +${coinGain} coins!`);
  sfxPickup();

  if(combatEnemy.isBoss) unlockAchievement('firstBoss');

  // Quest progress
  (dungeon ? dungeon.npcs : []).forEach(npc => {
    if(npc.quest && npc.quest.accepted && npc.quest.type === 'kill'){
      npc.quest.progress++;
      if(npc.quest.progress >= npc.quest.target && !npc.quest.completed){
        npc.quest.completed = true;
        addCombatLog(`Quest complete! See ${npc.name} for reward.`);
      }
    }
  });

  let equipDrop = null;
  if(Math.random() < (combatEnemy.isBoss ? 1.0 : 0.2)){
    equipDrop = getRandomEquipment(currentFloor);
    showEquipmentComparison(equipDrop);
  }

  while(player.xp >= player.xpNext) xpToLevel();

  setTimeout(()=>{
    document.getElementById('combat-ui').classList.add('hidden');
    state = 'explore';
  }, 1000);
  updateCombatUI();
  updateHUD();
}

function showEquipmentComparison(newItem){
  const current = player.equipment[newItem.slot];
  const newTotal = newItem.atk + newItem.def;
  const curTotal = current ? current.atk + current.def : 0;

  if(!current || newTotal > curTotal){
    player.equipment[newItem.slot] = newItem;
    addCombatLog(`Found ${newItem.name}! Equipped! (+${newItem.atk} ATK, +${newItem.def} DEF)`);
  } else {
    // Show comparison but don't auto-equip
    addCombatLog(`Found ${newItem.name} (+${newItem.atk} ATK, +${newItem.def} DEF) - Current: ${current.name} is better`);
    // Give gold value instead
    const sellValue = Math.floor(newItem.cost * 0.3);
    player.gold += sellValue;
    addCoins(sellValue);
    addCombatLog(`Sold for ${sellValue} coins.`);
  }
}

// --- NPC Interaction ---
function interactNPC(npc){
  if(dialogActive) return;
  dialogActive = true;
  dialogNPC = npc;
  const dialogue = npc.dialogues[Math.floor(Math.random()*npc.dialogues.length)];
  dialogOptions = [];

  if(npc.type === 'merchant'){
    dialogOptions.push({label:'Shop', fn:()=>{
      dialogActive = false;
      openShop();
    }});
  } else if(npc.type === 'questgiver'){
    if(npc.quest && npc.quest.completed){
      dialogOptions.push({label:'Claim Reward', fn:()=>{
        player.gold += npc.quest.reward;
        addCoins(npc.quest.reward);
        totalCoinsEarned += npc.quest.reward;
        addCombatLog(`Quest reward: +${npc.quest.reward} coins!`);
        npc.quest = null;
        dialogActive = false;
        sfxPickup();
      }});
    } else if(npc.quest && npc.quest.accepted && !npc.quest.completed){
      dialogOptions.push({label:`Quest: ${npc.quest.progress}/${npc.quest.target} kills`, fn:()=>{dialogActive=false;}});
    } else if(npc.quest && !npc.quest.accepted){
      dialogOptions.push({label:'Accept Quest', fn:()=>{
        npc.quest.accepted = true;
        npc.quest.progress = 0;
        npc.quest.completed = false;
        addCombatLog(`Quest accepted: Defeat ${npc.quest.target} enemies!`);
        dialogActive = false;
        sfxPickup();
      }});
    }
  }
  dialogOptions.push({label:'Leave', fn:()=>{dialogActive=false;}});

  // Draw dialog
  drawDialog(npc.name, dialogue, dialogOptions);
}

function drawDialog(name, text, options){
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);
  if(dungeon) drawDungeonBg();

  const dw = W - 100, dh = 200;
  const dx = 50, dy = H/2 - 100;
  ctx.fillStyle = '#111';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(dx, dy, dw, dh);
  ctx.lineWidth = 1;

  ctx.fillStyle = '#0ff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(name, dx + 20, dy + 30);

  ctx.fillStyle = '#ccc';
  ctx.font = '14px monospace';
  // Word wrap
  const words = text.split(' ');
  let line = '';
  let ly = dy + 60;
  words.forEach(w => {
    const test = line + w + ' ';
    if(ctx.measureText(test).width > dw - 40){
      ctx.fillText(line, dx + 20, ly);
      line = w + ' ';
      ly += 20;
    } else {
      line = test;
    }
  });
  ctx.fillText(line, dx + 20, ly);

  // Draw options as clickable areas
  dialogOptions.forEach((opt, i) => {
    const oy = dy + dh - 40 - (dialogOptions.length - 1 - i) * 30;
    ctx.fillStyle = '#ff0';
    ctx.font = '14px monospace';
    ctx.fillText(`[${i+1}] ${opt.label}`, dx + 40, oy);
  });
}

// --- Exploration ---
function updateExploration(){
  // Process player status effects
  player.statusEffects = player.statusEffects.filter(se => {
    se.turnsLeft--;
    const seDef = STATUS_EFFECTS[se.type];
    if(seDef.dmgPerTurn){
      player.hp -= seDef.dmgPerTurn;
      if(player.hp <= 0){player.hp=0;showResults(false);}
    }
    return se.turnsLeft > 0;
  });

  if(state !== 'explore') return;
  if(dialogActive) {
    // Handle dialog input
    const numKey = Object.keys(keys_pressed).find(k => k >= '1' && k <= '9');
    if(numKey){
      const idx = parseInt(numKey) - 1;
      if(dialogOptions[idx]){
        dialogOptions[idx].fn();
        keys_pressed[numKey] = false;
      }
    }
    // Also allow clicking dialog options via mouse
    return;
  }

  const speed = player.speed;
  let nx = player.x, ny = player.y;
  if(keys_pressed['w'] || keys_pressed['arrowup'] || touchDpad.up) ny -= speed;
  if(keys_pressed['s'] || keys_pressed['arrowdown'] || touchDpad.down) ny += speed;
  if(keys_pressed['a'] || keys_pressed['arrowleft'] || touchDpad.left) nx -= speed;
  if(keys_pressed['d'] || keys_pressed['arrowright'] || touchDpad.right) nx += speed;

  const moving = nx !== player.x || ny !== player.y;

  const margin = 10;
  const checkTile = (px, py) => {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if(tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
    return dungeon.map[ty][tx] === 1;
  };

  if(!checkTile(nx - margin, player.y - margin) && !checkTile(nx + margin, player.y - margin) &&
     !checkTile(nx - margin, player.y + margin) && !checkTile(nx + margin, player.y + margin)){
    player.x = nx;
  }
  if(!checkTile(player.x - margin, ny - margin) && !checkTile(player.x + margin, ny - margin) &&
     !checkTile(player.x - margin, ny + margin) && !checkTile(player.x + margin, ny + margin)){
    player.y = ny;
  }

  if(moving){
    stepTimer++;
    if(stepTimer % 15 === 0) sfxStep();
  }

  player.animTimer += moving ? 0.15 : 0;

  // Enemy collision
  for(const e of dungeon.enemies){
    if(!e.alive) continue;
    const dx = player.x - e.x, dy = player.y - e.y;
    if(Math.sqrt(dx*dx + dy*dy) < 30){
      startCombat(e);
      return;
    }
  }

  // Chest collision
  for(const c of dungeon.chests){
    if(c.opened) continue;
    const dx = player.x - c.x, dy = player.y - c.y;
    if(Math.sqrt(dx*dx + dy*dy) < 28){
      c.opened = true;
      sfxPickup();
      const coinAmt = 50;
      addCoins(coinAmt);
      player.gold += coinAmt;
      totalCoinsEarned += coinAmt;
      if(Math.random() < 0.5) { player.hpPotions++; }
      if(Math.random() < 0.3) { player.mpPotions++; }
    }
  }

  // NPC collision
  for(const npc of dungeon.npcs){
    const dx = player.x - npc.x, dy = player.y - npc.y;
    if(Math.sqrt(dx*dx + dy*dy) < 35){
      interactNPC(npc);
      return;
    }
  }

  // Stairs collision
  const dx2 = player.x - dungeon.stairs.x, dy2 = player.y - dungeon.stairs.y;
  if(Math.sqrt(dx2*dx2 + dy2*dy2) < 28){
    nextFloor();
  }

  updateHUD();
}

function nextFloor(){
  if(currentFloor >= 5){
    if(!dungeon._bossSpawned){
      dungeon._bossSpawned = true;
      const template = BOSS_TEMPLATE;
      combatEnemy = {
        name: template.name,
        hp: template.hp, maxHp: template.hp,
        atk: template.atk, def: template.def,
        xp: template.xp, coins: template.coins,
        color: template.color, isBoss: true, animY: 0,
        statusEffects: [], bossPhase: 0,
        bossPhaseHp: [0.7, 0.4]
      };
      combatLog = ['The Echo Dragon Lord emerges!'];
      combatTurn = 'player';
      combatShieldBuff = false;
      combatShieldTurns = 0;
      state = 'combat';
      updateCombatUI();
      document.getElementById('combat-ui').classList.remove('hidden');
      return;
    }
    sfxVictory();
    showResults(true);
    return;
  }

  currentFloor++;
  showAd(()=>{
    dungeon = generateDungeon(currentFloor);
    player.x = dungeon.spawn.x;
    player.y = dungeon.spawn.y;
    state = 'explore';
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    player.statusEffects = [];
  }, true);
}

// --- Save/Load ---
function saveGame(){
  const saveData = {
    player: {...player},
    currentFloor,
    totalCoinsEarned,
    gameStartTime,
    npcs: npcs.map(n => ({...n, quest: n.quest ? {...n.quest} : null}))
  };
  try{localStorage.setItem('ngn4_roe_save', JSON.stringify(saveData));}catch(e){}
  sfxSave();
  if(combatLog) addCombatLog('Game saved!');
}

function loadGame(){
  try{
    const d = JSON.parse(localStorage.getItem('ngn4_roe_save'));
    if(!d) return false;
    player = d.player;
    currentFloor = d.currentFloor;
    totalCoinsEarned = d.totalCoinsEarned;
    gameStartTime = d.gameStartTime || Date.now();
    npcs = d.npcs || [];
    dungeon = generateDungeon(currentFloor);
    player.x = dungeon.spawn.x;
    player.y = dungeon.spawn.y;
    state = 'explore';
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('inventory-bar').classList.remove('hidden');
    updateHUD();
    hasSave = true;
    return true;
  }catch(e){return false;}
}

// --- Rendering ---
function drawDungeonBg(){
  const camX = Math.max(0, Math.min(player.x - W/2, MAP_W * TILE - W));
  const camY = Math.max(0, Math.min(player.y - H/2, MAP_H * TILE - H));
  ctx.save();
  ctx.translate(-camX, -camY);

  for(let y=0; y<MAP_H; y++){
    for(let x=0; x<MAP_W; x++){
      const tx = x * TILE, ty = y * TILE;
      if(dungeon.map[y][x] === 1){
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(tx, ty, TILE, TILE);
        ctx.strokeStyle = '#252535';
        ctx.strokeRect(tx, ty, TILE, TILE);
      } else {
        ctx.fillStyle = (x+y)%2===0?'#0d0d18':'#111122';
        ctx.fillRect(tx, ty, TILE, TILE);
      }
    }
  }

  const sx = dungeon.stairs.x, sy = dungeon.stairs.y;
  ctx.fillStyle = '#f0f';
  ctx.globalAlpha = 0.5 + Math.sin(Date.now()/300) * 0.3;
  ctx.fillRect(sx - 12, sy - 12, 24, 24);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(currentFloor >= 5 ? 'BOSS' : '▼', sx, sy + 5);

  for(const c of dungeon.chests){
    if(c.opened){
      ctx.fillStyle = '#443300';
      ctx.fillRect(c.x-10, c.y-8, 20, 16);
    } else {
      ctx.fillStyle = '#ff0';
      ctx.globalAlpha = 0.6 + Math.sin(Date.now()/400 + c.x) * 0.3;
      ctx.fillRect(c.x-10, c.y-8, 20, 16);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#aa0';
      ctx.strokeRect(c.x-10, c.y-8, 20, 16);
    }
  }

  // NPCs
  for(const npc of dungeon.npcs){
    ctx.fillStyle = npc.type === 'merchant' ? '#ff0' : '#0ff';
    ctx.beginPath();
    ctx.arc(npc.x, npc.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(npc.type === 'merchant' ? 'M' : 'Q', npc.x, npc.y + 4);
    ctx.font = '8px monospace';
    ctx.fillText(npc.name, npc.x, npc.y - 18);
  }

  for(const e of dungeon.enemies){
    if(!e.alive) continue;
    const tmpl = ENEMY_TEMPLATES[e.type];
    ctx.fillStyle = tmpl.color;
    const bob = Math.sin(Date.now()/200 + e.x) * 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(tmpl.name.charAt(0), e.x, e.y + bob + 3);
  }

  const pBob = Math.sin(player.animTimer) * 2;
  ctx.fillStyle = '#0ff';
  ctx.shadowColor = '#0ff';
  ctx.shadowBlur = 10;
  ctx.fillRect(player.x - 10, player.y - 10 + pBob, 20, 20);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(CLASSES[player.cls].name.charAt(0), player.x, player.y + pBob + 4);

  if(player.equipment.sword){
    ctx.fillStyle = '#ff0';
    ctx.fillRect(player.x + 8, player.y - 6 + pBob, 6, 3);
  }
  if(player.equipment.shield){
    ctx.fillStyle = '#aaf';
    ctx.fillRect(player.x - 16, player.y - 8 + pBob, 5, 10);
  }

  ctx.restore();

  // Mini map
  ctx.globalAlpha = 0.7;
  const mmScale = 4;
  const mmX = W - MAP_W * mmScale - 10, mmY = 10;
  ctx.fillStyle = '#000a';
  ctx.fillRect(mmX - 2, mmY - 2, MAP_W * mmScale + 4, MAP_H * mmScale + 4);
  for(let y=0; y<MAP_H; y++){
    for(let x=0; x<MAP_W; x++){
      ctx.fillStyle = dungeon.map[y][x] === 1 ? '#222' : '#444';
      ctx.fillRect(mmX + x*mmScale, mmY + y*mmScale, mmScale, mmScale);
    }
  }
  ctx.fillStyle = '#0ff';
  ctx.fillRect(mmX + (player.x/TILE)*mmScale - 1, mmY + (player.y/TILE)*mmScale - 1, 3, 3);
  ctx.fillStyle = '#f0f';
  ctx.fillRect(mmX + (dungeon.stairs.x/TILE)*mmScale - 1, mmY + (dungeon.stairs.y/TILE)*mmScale - 1, 3, 3);
  ctx.globalAlpha = 1;
}

function drawDungeon(){
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);
  if(!dungeon) return;
  drawDungeonBg();
}

function drawCombatEnemy(){
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);
  const ex = W/2, ey = H/2 - 40 + (combatEnemy.animY || 0);
  ctx.fillStyle = combatEnemy.color;
  ctx.shadowColor = combatEnemy.color;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(ex, ey, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#0008';
  ctx.beginPath();
  ctx.arc(ex, ey, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ex - 12, ey - 8, 6, 0, Math.PI * 2);
  ctx.arc(ex + 12, ey - 8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f00';
  ctx.beginPath();
  ctx.arc(ex - 12, ey - 8, 3, 0, Math.PI * 2);
  ctx.arc(ex + 12, ey - 8, 3, 0, Math.PI * 2);
  ctx.fill();

  const barW = 200, barH = 12;
  const hpPct = combatEnemy.hp / combatEnemy.maxHp;
  ctx.fillStyle = '#333';
  ctx.fillRect(ex - barW/2, ey + 55, barW, barH);
  ctx.fillStyle = hpPct > 0.5 ? '#0f0' : hpPct > 0.25 ? '#ff0' : '#f00';
  ctx.fillRect(ex - barW/2, ey + 55, barW * hpPct, barH);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(ex - barW/2, ey + 55, barW, barH);

  if(combatEnemy.animY < 0) combatEnemy.animY += 1;
  drawParticles();
}

let particles = [];
function spawnParticles(x, y, color, count=10){
  for(let i=0; i<count; i++){
    particles.push({
      x, y, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6,
      life: 30 + Math.random()*20, maxLife: 50, color, size: 2+Math.random()*3
    });
  }
}
function drawParticles(){
  particles = particles.filter(p=>{
    p.x += p.vx; p.y += p.vy; p.life--;
    p.vy += 0.1;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    ctx.globalAlpha = 1;
    return p.life > 0;
  });
}

// --- UI Helpers ---
function updateHUD(){
  if(!player) return;
  document.getElementById('hud-floor').textContent = currentFloor;
  document.getElementById('hud-hp').textContent = `${player.hp}/${player.maxHp}`;
  document.getElementById('hud-mp').textContent = `${player.mp}/${player.maxMp}`;
  document.getElementById('hud-lvl').textContent = player.level;
  document.getElementById('hud-coins').textContent = getCoins();
  document.getElementById('hud-xp').textContent = `${player.xp}/${player.xpNext}`;
  document.getElementById('inv-hp-count').textContent = player.hpPotions;
  document.getElementById('inv-mp-count').textContent = player.mpPotions;
  const eq = player.equipment;
  document.getElementById('hud-equip').textContent =
    `Sword:${eq.sword?eq.sword.name:'None'}|Shield:${eq.shield?eq.shield.name:'None'}|Armor:${eq.armor?eq.armor.name:'None'}`;
}

function showResults(won){
  state = 'results';
  resultsData = won;
  if(won){
    const elapsed = (Date.now() - gameStartTime) / 60000;
    if(elapsed < 10) unlockAchievement('speedRun');
  }
  document.getElementById('results-title').textContent = won ? 'Victory!' : 'Defeated...';
  document.getElementById('results-title').style.color = won ? '#0f0' : '#f00';
  document.getElementById('results-details').innerHTML = won
    ? `Floor reached: <span>${currentFloor}</span><br>Level: <span>${player.level}</span><br>Total coins: <span>${totalCoinsEarned}</span><br>The Realm of Echoes is restored!`
    : `Floor reached: <span>${currentFloor}</span><br>Level: <span>${player.level}</span><br>Total coins: <span>${totalCoinsEarned}</span><br>The echoes fade...`;
  document.getElementById('results-screen').classList.remove('hidden');
  try{localStorage.removeItem('ngn4_roe_save');}catch(e){}
}

// --- Ad System ---
function showAd(callback, reward=false){
  state = 'ad';
  adCallback = callback;
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
      if(reward) document.getElementById('btn-ad-reward').style.display = '';
      else { closeAd(); }
    }
  }, 1000);
}

function closeAd(){
  document.getElementById('ad-overlay').classList.add('hidden');
  if(adCallback) adCallback();
}

// --- Shop ---
function openShop(){
  state = 'shop';
  const container = document.getElementById('shop-items');
  container.innerHTML = '';
  ['sword','shield','armor'].forEach(slot=>{
    EQUIPMENT_TABLE[slot].forEach((item, idx)=>{
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = `<div><div class="shop-item-name">${item.name} (${slot})</div>
        <div class="shop-item-desc">ATK+${item.atk} DEF+${item.def||0}</div></div>
        <div class="shop-item-cost">${item.cost} coins</div>`;
      div.onclick = ()=>{
        if(player.gold >= item.cost){
          player.gold -= item.cost;
          player.equipment[slot] = {slot, ...item};
          sfxPickup();
          updateHUD();
          updateCoinDisplay();
          openShop();
        }
      };
      container.appendChild(div);
    });
  });
  const hpDiv = document.createElement('div');
  hpDiv.className = 'shop-item';
  hpDiv.innerHTML = `<div><div class="shop-item-name">HP Potion</div><div class="shop-item-desc">Restores 30+ HP</div></div><div class="shop-item-cost">20 gold</div>`;
  hpDiv.onclick = ()=>{
    if(player.gold >= 20){ player.gold -= 20; player.hpPotions++; sfxPickup(); updateHUD(); updateCoinDisplay(); openShop(); }
  };
  container.appendChild(hpDiv);
  const mpDiv = document.createElement('div');
  mpDiv.className = 'shop-item';
  mpDiv.innerHTML = `<div><div class="shop-item-name">MP Potion</div><div class="shop-item-desc">Restores 20+ MP</div></div><div class="shop-item-cost">15 gold</div>`;
  mpDiv.onclick = ()=>{
    if(player.gold >= 15){ player.gold -= 15; player.mpPotions++; sfxPickup(); updateHUD(); updateCoinDisplay(); openShop(); }
  };
  container.appendChild(mpDiv);
  document.getElementById('shop-screen').classList.remove('hidden');
}

// --- Mobile Touch Controls ---
let touchDpad = { up:false, down:false, left:false, right:false };

function initTouchControls(){
  // Create virtual D-pad and action buttons
  const touchLayer = document.createElement('div');
  touchLayer.id = 'touch-controls';
  touchLayer.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;height:150px;z-index:500;pointer-events:none;';

  // D-pad
  const dpad = document.createElement('div');
  dpad.style.cssText = 'position:absolute;bottom:20px;left:20px;width:120px;height:120px;pointer-events:auto;';
  const dirs = [
    {dir:'up',x:40,y:0,w:40,h:40,label:'▲'},
    {dir:'down',x:40,y:80,w:40,h:40,label:'▼'},
    {dir:'left',x:0,y:40,w:40,h:40,label:'◀'},
    {dir:'right',x:80,y:40,w:40,h:40,label:'▶'}
  ];
  dirs.forEach(d=>{
    const btn = document.createElement('button');
    btn.style.cssText = `position:absolute;left:${d.x}px;top:${d.y}px;width:${d.w}px;height:${d.h}px;background:rgba(0,255,255,0.2);border:1px solid rgba(0,255,255,0.4);color:#0ff;font-size:16px;cursor:pointer;touch-action:none;`;
    btn.textContent = d.label;
    btn.addEventListener('touchstart', e=>{e.preventDefault();touchDpad[d.dir]=true;},{passive:false});
    btn.addEventListener('touchend', e=>{e.preventDefault();touchDpad[d.dir]=false;},{passive:false});
    dpad.appendChild(btn);
  });
  touchLayer.appendChild(dpad);

  // Action buttons
  const actions = document.createElement('div');
  actions.style.cssText = 'position:absolute;bottom:20px;right:20px;pointer-events:auto;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;width:180px;';
  const actionBtns = [
    {label:'ATK', fn:()=>{if(state==='combat'&&combatTurn==='player')combatAttack();}},
    {label:'MAG', fn:()=>{if(state==='combat'&&combatTurn==='player')castSpell('echoBlast');}},
    {label:'POT', fn:()=>{if(state==='combat'&&combatTurn==='player')combatUsePotion('hp');}},
    {label:'TALK', fn:()=>{
      if(state==='explore'&&dialogActive){
        dialogOptions.forEach((opt,i)=>{
          if(i===0)opt.fn();
        });
      } else if(state==='explore'){
        // Try interact with nearest NPC
        for(const npc of (dungeon?dungeon.npcs:[])){
          const dx=player.x-npc.x,dy=player.y-npc.y;
          if(Math.sqrt(dx*dx+dy*dy)<35){interactNPC(npc);return;}
        }
      }
    }}
  ];
  actionBtns.forEach(a=>{
    const btn = document.createElement('button');
    btn.style.cssText = 'width:80px;height:50px;background:rgba(255,0,100,0.3);border:1px solid rgba(255,0,100,0.5);color:#f0f;font-size:12px;font-weight:bold;cursor:pointer;touch-action:none;';
    btn.textContent = a.label;
    btn.addEventListener('touchstart', e=>{e.preventDefault();a.fn();},{passive:false});
    actions.appendChild(btn);
  });
  touchLayer.appendChild(actions);

  document.body.appendChild(touchLayer);
}

// --- Game Loop ---
function gameLoop(){
  if(state === 'explore'){
    updateExploration();
    drawDungeon();
  } else if(state === 'combat'){
    drawCombatEnemy();
  } else if(state === 'menu' || state === 'results' || state === 'shop' || state === 'ad' || state === 'dead' || state === 'classSelect'){
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);
    const t = Date.now() / 1000;
    for(let i=0; i<5; i++){
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = i%2 === 0 ? '#0ff' : '#f0f';
      ctx.beginPath();
      ctx.arc(W/2 + Math.sin(t + i)*100, H/2 + Math.cos(t + i)*80, 80 + i*30, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if(state === 'classSelect') drawClassSelect();
    if(dialogActive && dialogNPC) drawDialog(dialogNPC.name, dialogNPC.dialogues[0], dialogOptions);
  }
  animFrame = requestAnimationFrame(gameLoop);
}

function drawClassSelect(){
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#0ff';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CHOOSE YOUR CLASS', W/2, 60);

  const classKeys = Object.keys(CLASSES);
  classKeys.forEach((cls, i) => {
    const c = CLASSES[cls];
    const bx = 80 + i * 165, by = 100, bw = 150, bh = 200;
    const isSelected = selectedClass === cls;

    ctx.fillStyle = isSelected ? '#1a1a3a' : '#111';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = isSelected ? c.color : '#333';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.lineWidth = 1;

    ctx.fillStyle = c.color;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(c.name, bx + bw/2, by + 30);

    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    const lines = [
      c.desc,
      `HP: ${c.hp} MP: ${c.mp}`,
      `ATK: ${c.atk} DEF: ${c.def}`,
      `SPD: ${c.speed}`,
      '',
      `Press ${i+1}`
    ];
    lines.forEach((line, li) => {
      ctx.fillText(line, bx + bw/2, by + 60 + li * 20);
    });
  });
}

// --- Gamepad Support ---
let gpPrevButtons = [];
function pollGamepad(){
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for(let i=0;i<gps.length;i++){if(gps[i]){gp=gps[i];break;}}
  if(!gp){requestAnimationFrame(pollGamepad);return;}

  if(state === 'explore' && !dialogActive){
    if(gp.axes[1]<-0.5) touchDpad.up=true; else touchDpad.up=false;
    if(gp.axes[1]>0.5) touchDpad.down=true; else touchDpad.down=false;
    if(gp.axes[0]<-0.5) touchDpad.left=true; else touchDpad.left=false;
    if(gp.axes[0]>0.5) touchDpad.right=true; else touchDpad.right=false;

    // A button = interact
    if(gp.buttons[0]&&gp.buttons[0].pressed&&!gpPrevButtons[0]){
      gpPrevButtons[0]=true;
      for(const npc of (dungeon?dungeon.npcs:[])){
        const dx=player.x-npc.x,dy=player.y-npc.y;
        if(Math.sqrt(dx*dx+dy*dy)<35){interactNPC(npc);return;}
      }
    }else gpPrevButtons[0]=false;

    // B button = save
    if(gp.buttons[1]&&gp.buttons[1].pressed&&!gpPrevButtons[1]){gpPrevButtons[1]=true;saveGame();}
    else gpPrevButtons[1]=false;
  }

  if(state === 'combat' && combatTurn === 'player'){
    if(gp.buttons[0]&&gp.buttons[0].pressed&&!gpPrevButtons[0]){gpPrevButtons[0]=true;combatAttack();}
    else gpPrevButtons[0]=false;
    if(gp.buttons[1]&&gp.buttons[1].pressed&&!gpPrevButtons[1]){gpPrevButtons[1]=true;castSpell('echoBlast');}
    else gpPrevButtons[1]=false;
    if(gp.buttons[2]&&gp.buttons[2].pressed&&!gpPrevButtons[2]){gpPrevButtons[2]=true;combatUsePotion('hp');}
    else gpPrevButtons[2]=false;
    if(gp.buttons[3]&&gp.buttons[3].pressed&&!gpPrevButtons[3]){gpPrevButtons[3]=true;combatFlee();}
    else gpPrevButtons[3]=false;
  }

  if(state === 'classSelect'){
    const classKeys = Object.keys(CLASSES);
    classKeys.forEach((cls, i) => {
      if(gp.buttons[i]&&gp.buttons[i].pressed&&!gpPrevButtons[i]){
        gpPrevButtons[i]=true;
        selectedClass = cls;
      } else gpPrevButtons[i]=false;
    });
    if(gp.buttons[7]&&gp.buttons[7].pressed&&!gpPrevButtons[7]){
      gpPrevButtons[7]=true;
      // Start button
      try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
      player = createPlayer(selectedClass);
      currentFloor = 1;
      totalCoinsEarned = 0;
      gameStartTime = Date.now();
      dungeon = generateDungeon(1);
      player.x = dungeon.spawn.x;
      player.y = dungeon.spawn.y;
      state = 'explore';
      document.getElementById('menu-screen').classList.add('hidden');
      document.getElementById('hud').classList.remove('hidden');
      document.getElementById('inventory-bar').classList.remove('hidden');
      updateHUD();
      sfxStep();
    } else gpPrevButtons[7]=false;
  }

  requestAnimationFrame(pollGamepad);
}
window.addEventListener('gamepadconnected',()=>{requestAnimationFrame(pollGamepad);});

// --- Input ---
document.addEventListener('keydown', e=>{
  keys_pressed[e.key.toLowerCase()] = true;
  if(state === 'explore'){
    if(e.key === '1' && player.hpPotions > 0){
      player.hpPotions--;
      player.hp = Math.min(player.maxHp, player.hp + 30 + player.level * 5);
      sfxPickup(); updateHUD();
    }
    if(e.key === '2' && player.mpPotions > 0){
      player.mpPotions--;
      player.mp = Math.min(player.maxMp, player.mp + 20 + player.level * 3);
      sfxPickup(); updateHUD();
    }
    if(e.key === 'e' || e.key === 'E'){
      // Interact with nearest NPC
      for(const npc of (dungeon?dungeon.npcs:[])){
        const dx=player.x-npc.x,dy=player.y-npc.y;
        if(Math.sqrt(dx*dx+dy*dy)<35){interactNPC(npc);return;}
      }
    }
    if(e.key === 'F5'){e.preventDefault();saveGame();}
  }

  // Class select
  if(state === 'classSelect'){
    const classKeys = Object.keys(CLASSES);
    classKeys.forEach((cls, i) => {
      if(e.key === (i+1).toString()) selectedClass = cls;
    });
    if(e.key === 'Enter'){
      try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
      player = createPlayer(selectedClass);
      currentFloor = 1;
      totalCoinsEarned = 0;
      gameStartTime = Date.now();
      dungeon = generateDungeon(1);
      player.x = dungeon.spawn.x;
      player.y = dungeon.spawn.y;
      state = 'explore';
      document.getElementById('menu-screen').classList.add('hidden');
      document.getElementById('hud').classList.remove('hidden');
      document.getElementById('inventory-bar').classList.remove('hidden');
      updateHUD();
      sfxStep();
    }
  }
});
document.addEventListener('keyup', e=> keys_pressed[e.key.toLowerCase()] = false);

// --- Menu Buttons ---
document.getElementById('btn-new-game').onclick = ()=>{
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  state = 'classSelect';
  document.getElementById('menu-screen').classList.add('hidden');
};

// Load game button
const loadBtn = document.createElement('button');
loadBtn.className = 'neon-btn';
loadBtn.id = 'btn-load-game';
loadBtn.textContent = 'Load Game';
loadBtn.style.display = 'none';
loadBtn.style.margin = '5px auto';
document.getElementById('menu-screen').insertBefore(loadBtn, document.getElementById('btn-shop'));
loadBtn.onclick = ()=>{
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  loadGame();
};

document.getElementById('btn-shop').onclick = ()=>{
  try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){}
  openShop();
};

document.getElementById('btn-shop-close').onclick = ()=>{
  document.getElementById('shop-screen').classList.add('hidden');
  state = 'menu';
};

document.getElementById('btn-results-continue').onclick = ()=>{
  document.getElementById('results-screen').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('inventory-bar').classList.add('hidden');
  state = 'menu';
};

document.getElementById('btn-ad-skip').onclick = ()=>{};
document.getElementById('btn-ad-reward').onclick = ()=>{ closeAd(); };

document.getElementById('inv-hp').onclick = ()=>{
  if(state==='explore' && player.hpPotions > 0){
    player.hpPotions--;
    player.hp = Math.min(player.maxHp, player.hp + 30 + player.level * 5);
    sfxPickup(); updateHUD();
  }
};
document.getElementById('inv-mp').onclick = ()=>{
  if(state==='explore' && player.mpPotions > 0){
    player.mpPotions--;
    player.mp = Math.min(player.maxMp, player.mp + 20 + player.level * 3);
    sfxPickup(); updateHUD();
  }
};

// --- Init ---
updateCoinDisplay();
loadAchievements();

// Check for save
if(localStorage.getItem('ngn4_roe_save')){
  loadBtn.style.display = '';
  hasSave = true;
}

initTouchControls();
gameLoop();

})();
