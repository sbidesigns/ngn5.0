// ANCIENT RELIC HUNTER - NGN4 Game #43
(function(){
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('ancient-relic-hunter'); } catch(e) {}

const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
canvas.width=900;canvas.height=700;

// ========== AUDIO ==========
let AC=null;function getAC(){if(!AC)try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}return AC;}
function snd(f,d,t='square',v=0.05){try{if(AC.state==='suspended')try{getAC();if(AC)try{getAC();if(AC)AC.resume();}catch(e){};}catch(e){}const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d);}catch(e){}}
function footstepSnd(){snd(80+Math.random()*40,0.06,'triangle',0.03);}
function pistolSnd(){snd(800,0.08,'square',0.05);snd(400,0.06,'sawtooth',0.03);}
function shotgunSnd(){snd(100,0.2,'sawtooth',0.1);snd(60,0.15,'square',0.06);}
function rifleSnd(){snd(600,0.1,'square',0.06);snd(900,0.05,'sine',0.04);}
function bladeSnd(){snd(200,0.12,'sawtooth',0.05);snd(300,0.08,'triangle',0.04);}
function enemyHitSnd(){snd(150+Math.random()*100,0.1,'sawtooth',0.04);}
function enemyDeathSnd(){snd(80,0.3,'sawtooth',0.06);snd(60,0.2,'square',0.04);}
function playerHitSnd(){snd(200,0.15,'sawtooth',0.06);snd(100,0.1,'square',0.05);}
function pickupSnd(){snd(600,0.1,'sine',0.07);setTimeout(()=>snd(900,0.1,'sine',0.07),80);}
function relicSnd(){snd(400,0.2,'sine',0.08);setTimeout(()=>snd(600,0.2,'sine',0.08),150);setTimeout(()=>snd(800,0.3,'sine',0.1),300);}
function puzzleSnd(){snd(500,0.1,'sine',0.06);setTimeout(()=>snd(700,0.15,'sine',0.08),100);setTimeout(()=>snd(1000,0.2,'sine',0.1),200);}
function doorOpenSnd(){snd(100,0.3,'sawtooth',0.06);snd(150,0.2,'triangle',0.04);}
function switchSnd(){snd(300,0.08,'square',0.04);snd(500,0.08,'square',0.04);}
function lavaSnd(){snd(50+Math.random()*30,0.2,'sawtooth',0.02);}
function bossSnd(){snd(60,0.4,'sawtooth',0.08);snd(90,0.3,'square',0.06);}

// ========== NGN4 COINS ==========
function getCoins(){try{const d=JSON.parse(localStorage.getItem('ngn4_rewards')||'{}');return d.coins||0;}catch(e){return 0;}}
function saveCoins(c){try{const d=JSON.parse(localStorage.getItem('ngn4_rewards')||'{}');d.coins=c;localStorage.setItem('ngn4_rewards',JSON.stringify(d));}catch(e){}}

// ========== SAVE SYSTEM ==========
function saveGame(){
  try{
    const d={
      templesCleared:templesCleared.slice(),
      relicsFound:relicsFound.slice(),
      totalKills,totalXp,totalCoinsEarned,totalSecrets,totalPuzzlesSolved,
      achievements:unlockedAchievements.slice(),
      weaponUpgrades:weaponUpgrades.slice(),
      currentLevel:currentLevel,
      playerHP:player.hp,playerMaxHP:player.maxHp,playerArmor:player.armor,
      playerAmmo:weapons.map(w=>w.ammo),
      keysHeld:keysHeld
    };
    localStorage.setItem('ngn4_relichunter',JSON.stringify(d));
  }catch(e){}
}
function loadGame(){
  try{
    const d=JSON.parse(localStorage.getItem('ngn4_relichunter'));
    if(!d)return false;
    templesCleared=d.templesCleared||[];relicsFound=d.relicsFound||[];
    totalKills=d.totalKills||0;totalXp=d.totalXp||0;totalCoinsEarned=d.totalCoinsEarned||0;
    totalSecrets=d.totalSecrets||0;totalPuzzlesSolved=d.totalPuzzlesSolved||0;unlockedAchievements=d.achievements||[];
    weaponUpgrades=d.weaponUpgrades||[0,0,0,0];currentLevel=d.currentLevel||0;
    keysHeld=d.keysHeld||0;
    return true;
  }catch(e){return false;}
}
function hasSavedGame(){return !!localStorage.getItem('ngn4_relichunter');}

// ========== STATE ==========
let state='menu';
let currentLevel=0;
let selectedMapNode=0;
let templesCleared=[],relicsFound=[];
let totalKills=0,totalXp=0,totalCoinsEarned=0,totalSecrets=0;
let unlockedAchievements=[];
let weaponUpgrades=[0,0,0,0];
let keysHeld=0;
let levelTimer=0,levelKills=0,levelCoins=0,levelSecrets=0,levelPuzzles=0;
let noDamageRun=true;
let keys={},mouse={x:450,y:350,down:false};
let totalPuzzlesSolved=0;
let shakeT=0,shakeA=0;
let particles=[],bullets=[],enemies=[],items=[],interactables=[];
let messages=[];
let ambientTimer=0;
let footstepTimer=0;

// ========== TEMPLES ==========
const TEMPLES=[
  {name:'Temple of Sand',icon:'🏜️',desc:'Egyptian desert temple filled with spike traps and ancient mummies.',story:'Dr. North arrives at the Sahara, where the first relic lies beneath the Temple of Sand. Ancient mechanisms still guard the way.',
    bgColor:'#1a1408',floorColor:'#2a2010',wallColor:'#4a3820',accentColor:'#f80',
    enemies:['mummy'],traps:['spikes'],puzzles:['push_block','pressure_plate'],hasRelic:true,relicName:'Sun Amulet',
    enemyCount:6,trapCount:4,width:45,height:35},
  {name:'Temple of Ice',icon:'🏔️',desc:'Frozen caverns with slippery floors, ice golems, and melting platforms.',story:'The second relic lies deep within glacial caves in the Himalayas. Sub-zero temperatures and frozen guardians block the path.',
    bgColor:'#0a1018',floorColor:'#152030',wallColor:'#3a5060',accentColor:'#8cf',
    enemies:['ice_golem'],traps:['ice_spike'],puzzles:['ice_block','torch'],hasRelic:true,relicName:'Frost Crystal',
    enemyCount:7,trapCount:5,width:48,height:36},
  {name:'Temple of Flame',icon:'🌋',desc:'Volcanic ruins with lava pits, fire demons, and heat puzzles.',story:'Somewhere beneath a Pacific volcano, the third relic burns within the Temple of Flame. Rivers of lava separate treasure from danger.',
    bgColor:'#180808',floorColor:'#201010',wallColor:'#502020',accentColor:'#f44',
    enemies:['fire_demon'],traps:['lava'],puzzles:['lever','fire_block'],hasRelic:true,relicName:'Ember Stone',
    enemyCount:8,trapCount:6,width:50,height:38},
  {name:'Temple of Shadows',icon:'🌑',desc:'Dark jungle temple with limited visibility and shadow beasts.',story:'Deep in the Amazon rainforest, the Temple of Shadows hides the fourth relic. Only torchlight can reveal the way.',
    bgColor:'#080810',floorColor:'#101018',wallColor:'#282830',accentColor:'#a8e',
    enemies:['shadow_beast'],traps:['shadow_trap'],puzzles:['torch_sequence'],hasRelic:true,relicName:'Shadow Orb',
    enemyCount:9,trapCount:5,width:52,height:40},
  {name:'Temple of Storms',icon:'⛈️',desc:'Mountain peak temple with wind mechanics and lightning puzzles.',story:'Atop the Andes mountains, the Temple of Storms holds the fifth relic. Gale-force winds and crackling lightning guard the ancient halls.',
    bgColor:'#0a0a10',floorColor:'#151820',wallColor:'#2a3040',accentColor:'#4df',
    enemies:['eagle'],traps:['wind_zone'],puzzles:['lightning_sequence'],hasRelic:true,relicName:'Thunder Rune',
    enemyCount:10,trapCount:5,width:50,height:38},
  {name:'Celestial Chamber',icon:'🔱',desc:'Final temple combining all mechanics. The Temple Guardian awaits.',story:'All five relics pulse with energy, revealing the location of the Celestial Chamber. The Temple Guardian, an ancient construct, stands between Dr. North and ultimate power.',
    bgColor:'#100818',floorColor:'#181020',wallColor:'#3a2850',accentColor:'#f8f',
    enemies:['mummy','ice_golem','fire_demon','shadow_beast','eagle','guardian'],traps:['spikes','lava','shadow_trap'],
    puzzles:['pressure_plate','lever','torch_sequence'],hasRelic:true,relicName:'Celestial Core',
    enemyCount:14,trapCount:8,width:55,height:42,bossLevel:true}
];

// ========== WEAPONS ==========
const WEAPON_DEFS=[
  {name:'Dual Pistols',dmg:12,rate:12,ammo:999,maxAmmo:999,spread:0.08,bullets:1,speed:11,color:'#ff0',range:300,melee:false,type:'gun'},
  {name:'Shotgun',dmg:8,rate:28,ammo:24,maxAmmo:30,spread:0.2,bullets:5,speed:9,color:'#f80',range:180,melee:false,type:'gun'},
  {name:'Rifle',dmg:28,rate:22,ammo:20,maxAmmo:25,spread:0.02,bullets:1,speed:16,color:'#fff',range:450,melee:false,type:'gun'},
  {name:'Relic Blade',dmg:35,rate:18,ammo:999,maxAmmo:999,spread:0,bullets:1,speed:0,color:'#f8f',range:45,melee:true,type:'melee'}
];
let weapons=[];
let currentWeapon=0;

// ========== ENEMY DEFS ==========
const ENEMY_DEFS={
  mummy:{name:'Mummy',hp:40,speed:0.8,dmg:8,size:14,color:'#a86',score:20,coins:10,xp:15},
  ice_golem:{name:'Ice Golem',hp:70,speed:0.6,dmg:12,size:18,color:'#6ad',score:30,coins:15,xp:25},
  fire_demon:{name:'Fire Demon',hp:55,speed:1.2,dmg:15,size:15,color:'#f64',score:35,coins:18,xp:30},
  shadow_beast:{name:'Shadow Beast',hp:45,speed:1.5,dmg:10,size:13,color:'#84a',score:30,coins:14,xp:25},
  eagle:{name:'Eagle',hp:25,speed:2.0,dmg:6,size:11,color:'#cf8',score:25,coins:12,xp:20},
  guardian:{name:'Temple Guardian',hp:300,speed:0.5,dmg:25,size:26,color:'#f8f',score:200,coins:100,xp:150,isBoss:true}
};

// ========== ACHIEVEMENTS ==========
const ACHIEVEMENTS=[
  {id:'first_blood',name:'First Blood',desc:'Defeat your first enemy',icon:'🩸'},
  {id:'puzzle_master',name:'Puzzle Master',desc:'Solve 5 puzzles total',icon:'🧩'},
  {id:'speed_runner',name:'Speed Runner',desc:'Clear a temple in under 90 seconds',icon:'⚡'},
  {id:'all_secrets',name:'All Secrets',desc:'Find 10 secrets total',icon:'🔍'},
  {id:'relic_collector',name:'Relic Collector',desc:'Collect your first relic',icon:'🏺'},
  {id:'no_damage',name:'Untouchable',desc:'Clear a temple without taking damage',icon:'🛡️'},
  {id:'marksman',name:'Marksman',desc:'Kill 50 enemies total',icon:'🎯'},
  {id:'explorer',name:'Explorer',desc:'Visit all 6 temples',icon:'🗺️'},
  {id:'boss_slayer',name:'Boss Slayer',desc:'Defeat the Temple Guardian',icon:'💀'},
  {id:'centurion',name:'Centurion',desc:'Kill 100 enemies total',icon:'⚔️'},
  {id:'treasure_hunter',name:'Treasure Hunter',desc:'Collect 500 coins total',icon:'💰'},
  {id:'master_hunter',name:'Master Hunter',desc:'Collect all 6 relics',icon:'🔱'},
  {id:'blade_master',name:'Blade Master',desc:'Kill 10 enemies with the Relic Blade',icon:'🗡️'},
  {id:'survivor',name:'Survivor',desc:'Complete 3 temples',icon:'❤️'},
  {id:'max_level',name:'Legendary',desc:'Reach 1000 total XP',icon:'⭐'},
  {id:'completionist',name:'Completionist',desc:'Clear all 6 temples',icon:'🏆'}
];

// ========== PLAYER ==========
let player={};
let mapTiles=[];let mapW=0,mapH=0;let TILE=20;let camX=0,camY=0;
let exitZone=null;let relicZone=null;let bossSpawned=false;let bossAlive=false;

function initPlayer(){
  const hpBonus=(weaponUpgrades[0]+weaponUpgrades[1]+weaponUpgrades[2]+weaponUpgrades[3])*5;
  player={x:3*TILE+TILE/2,y:3*TILE+TILE/2,angle:0,speed:2.5,hp:100+hpBonus,maxHp:100+hpBonus,
    armor:0,invuln:0,crouching:false,interactTarget:null,footstepClock:0,
    bladeKills:0,templesVisited:0};
  weapons=WEAPON_DEFS.map((w,i)=>({...w,dmg:w.dmg*(1+weaponUpgrades[i]*0.15),ammo:w.maxAmmo,fireTimer:0}));
  currentWeapon=0;keysHeld=0;
  bullets=[];enemies=[];items=[];interactables=[];particles=[];messages=[];
  exitZone=null;relicZone=null;bossSpawned=false;bossAlive=false;
  levelTimer=0;levelKills=0;levelCoins=0;levelSecrets=0;levelPuzzles=0;noDamageRun=true;
}

// ========== MAP GENERATION ==========
function generateMap(tIdx){
  const T=TEMPLES[tIdx];mapW=T.width;mapH=T.height;
  mapTiles=[];
  for(let y=0;y<mapH;y++){mapTiles[y]=[];for(let x=0;x<mapW;x++){mapTiles[y][x]=0;}}
  // Border walls
  for(let x=0;x<mapW;x++){mapTiles[0][x]=1;mapTiles[mapH-1][x]=1;}
  for(let y=0;y<mapH;y++){mapTiles[y][0]=1;mapTiles[y][mapW-1]=1;}
  // Room layout
  generateRooms(tIdx);
  // Place player spawn
  mapTiles[2][2]=0;mapTiles[2][3]=0;mapTiles[3][2]=0;mapTiles[3][3]=0;
  player.x=2.5*TILE;player.y=2.5*TILE;
  // Place exit
  const ex=Math.floor(mapW/2),ey=mapH-3;
  mapTiles[ey][ex]=0;mapTiles[ey][ex+1]=0;mapTiles[ey-1][ex]=0;mapTiles[ey-1][ex+1]=0;
  exitZone={x:ex*TILE+TILE,y:ey*TILE+TILE,w:TILE*2,h:TILE*2};
  // Place enemies
  placeEnemies(tIdx);
  // Place items
  placeItems(tIdx);
  // Place traps
  placeTraps(tIdx);
  // Place puzzles
  placePuzzles(tIdx);
  // Place relic
  if(T.hasRelic){
    const rx=mapW-4,ry=2;
    mapTiles[ry][rx]=0;mapTiles[ry][rx+1]=0;mapTiles[ry+1][rx]=0;mapTiles[ry+1][rx+1]=0;
    relicZone={x:rx*TILE+TILE,y:ry*TILE+TILE,w:TILE*2,h:TILE*2,collected:false,name:T.relicName};
  }
  // Place secrets
  for(let i=0;i<3;i++){
    let sx,sy,tries=0;
    do{sx=4+Math.floor(Math.random()*(mapW-8));sy=4+Math.floor(Math.random()*(mapH-8));tries++;}
    while(mapTiles[sy][sx]!==0&&tries<50);
    if(mapTiles[sy][sx]===0){
      items.push({x:sx*TILE+TILE/2,y:sy*TILE+TILE/2,type:'secret',life:9999});
    }
  }
}

function generateRooms(tIdx){
  // Create corridors and rooms
  const cx=Math.floor(mapW/2),cy=Math.floor(mapH/2);
  // Main corridors
  for(let x=3;x<mapW-3;x++){mapTiles[cy][x]=0;mapTiles[cy+1][x]=0;}
  for(let y=3;y<mapH-3;y++){mapTiles[y][cx]=0;mapTiles[y][cx+1]=0;}
  // Additional corridors
  for(let x=3;x<mapW-3;x+=8){
    const ry=5+Math.floor(Math.random()*(mapH-10));
    for(let r=0;r<3;r++)mapTiles[ry+r][x]=0;
  }
  for(let y=3;y<mapH-3;y+=7){
    const rx=5+Math.floor(Math.random()*(mapW-10));
    for(let r=0;r<3;r++)mapTiles[y][rx+r]=0;
  }
  // Rooms at intersections
  const roomPositions=[[5,5],[mapW-7,5],[5,mapH-7],[mapW-7,mapH-7],[cx-3,cy-3],[cx+2,cy+2]];
  roomPositions.forEach(([rx,ry])=>{
    for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){
      if(ry+dy>0&&ry+dy<mapH-1&&rx+dx>0&&rx+dx<mapW-1)mapTiles[ry+dy][rx+dx]=0;
    }
  });
  // Some additional wall blocks for complexity
  for(let i=0;i<15+Math.floor(Math.random()*10);i++){
    const wx=4+Math.floor(Math.random()*(mapW-8));
    const wy=4+Math.floor(Math.random()*(mapH-8));
    if(mapTiles[wy][wx]===0&&Math.abs(wx-2.5)>3&&Math.abs(wy-2.5)>3){
      mapTiles[wy][wx]=1;
    }
  }
  // Lava/water special tiles for certain temples
  if(tIdx===2){// Temple of Flame - lava
    for(let i=0;i<12;i++){
      const lx=4+Math.floor(Math.random()*(mapW-8));
      const ly=4+Math.floor(Math.random()*(mapH-8));
      if(mapTiles[ly][lx]===0){mapTiles[ly][lx]=4;}
    }
  }
  if(tIdx===3){// Temple of Shadows - dark zones
    for(let i=0;i<10;i++){
      const dx=4+Math.floor(Math.random()*(mapW-8));
      const dy=4+Math.floor(Math.random()*(mapH-8));
      if(mapTiles[dy][dx]===0){mapTiles[dy][dx]=5;}
    }
  }
}

function placeEnemies(tIdx){
  const T=TEMPLES[tIdx];
  const types=T.enemies;
  const hasGuardian=types.includes('guardian');
  const nonBossTypes=types.filter(t=>t!=='guardian');
  let guardianPlaced=false;
  for(let i=0;i<T.enemyCount;i++){
    let ex,ey,tries=0;
    do{ex=5+Math.floor(Math.random()*(mapW-10));ey=5+Math.floor(Math.random()*(mapH-10));tries++;}
    while((mapTiles[ey][ex]!==0||(Math.abs(ex-2.5)<5&&Math.abs(ey-2.5)<5))&&tries<80);
    if(mapTiles[ey][ex]===0){
      let et;
      if(hasGuardian&&!guardianPlaced&&i>=T.enemyCount-1){
        et='guardian';guardianPlaced=true;
      }else if(hasGuardian&&!guardianPlaced&&i===T.enemyCount-2){
        et='guardian';guardianPlaced=true;
      }else{
        et=nonBossTypes[Math.floor(Math.random()*nonBossTypes.length)];
      }
      const ed=ENEMY_DEFS[et];
      const isBoss=et==='guardian';
      const hpMult=1+tIdx*0.15;
      enemies.push({x:ex*TILE+TILE/2,y:ey*TILE+TILE/2,type:et,
        hp:Math.ceil(ed.hp*hpMult),maxHp:Math.ceil(ed.hp*hpMult),
        speed:ed.speed,dmg:ed.dmg,size:ed.size,color:ed.color,
        score:ed.score,coins:ed.coins,xp:ed.xp,
        isBoss:isBoss||false,angle:0,attackTimer:0,
        patrolAngle:Math.random()*Math.PI*2,patrolTimer:0,
        state:'patrol',aggroRange:isBoss?300:180
      });
    }
  }
}

function placeItems(tIdx){
  // Health potions
  for(let i=0;i<4;i++){
    let ix,iy,tries=0;
    do{ix=4+Math.floor(Math.random()*(mapW-8));iy=4+Math.floor(Math.random()*(mapH-8));tries++;}
    while(mapTiles[iy][ix]!==0&&tries<50);
    if(mapTiles[iy][ix]===0)items.push({x:ix*TILE+TILE/2,y:iy*TILE+TILE/2,type:'health',life:9999});
  }
  // Ammo
  for(let i=0;i<3;i++){
    let ix,iy,tries=0;
    do{ix=4+Math.floor(Math.random()*(mapW-8));iy=4+Math.floor(Math.random()*(mapH-8));tries++;}
    while(mapTiles[iy][ix]!==0&&tries<50);
    if(mapTiles[iy][ix]===0)items.push({x:ix*TILE+TILE/2,y:iy*TILE+TILE/2,type:'ammo',life:9999});
  }
  // Coins
  for(let i=0;i<6;i++){
    let ix,iy,tries=0;
    do{ix=4+Math.floor(Math.random()*(mapW-8));iy=4+Math.floor(Math.random()*(mapH-8));tries++;}
    while(mapTiles[iy][ix]!==0&&tries<50);
    if(mapTiles[iy][ix]===0)items.push({x:ix*TILE+TILE/2,y:iy*TILE+TILE/2,type:'coins',life:9999,amount:5+Math.floor(Math.random()*15)});
  }
  // Armor
  if(Math.random()<0.4){
    let ix,iy,tries=0;
    do{ix=4+Math.floor(Math.random()*(mapW-8));iy=4+Math.floor(Math.random()*(mapH-8));tries++;}
    while(mapTiles[iy][ix]!==0&&tries<50);
    if(mapTiles[iy][ix]===0)items.push({x:ix*TILE+TILE/2,y:iy*TILE+TILE/2,type:'armor',life:9999});
  }
  // Keys (for locked doors)
  if(tIdx>0){
    let kx,ky,tries=0;
    do{kx=4+Math.floor(Math.random()*(mapW-8));ky=4+Math.floor(Math.random()*(mapH-8));tries++;}
    while(mapTiles[ky][kx]!==0&&tries<50);
    if(mapTiles[ky][kx]===0)items.push({x:kx*TILE+TILE/2,y:ky*TILE+TILE/2,type:'key',life:9999});
  }
  // Shotgun pickup (temple 2+)
  if(tIdx>=1){
    let wx,wy,tries=0;
    do{wx=4+Math.floor(Math.random()*(mapW-8));wy=4+Math.floor(Math.random()*(mapH-8));tries++;}
    while(mapTiles[wy][wx]!==0&&tries<50);
    if(mapTiles[wy][wx]===0)items.push({x:wx*TILE+TILE/2,y:wy*TILE+TILE/2,type:'weapon_shotgun',life:9999});
  }
  // Rifle pickup (temple 3+)
  if(tIdx>=2){
    let wx,wy,tries=0;
    do{wx=4+Math.floor(Math.random()*(mapW-8));wy=4+Math.floor(Math.random()*(mapH-8));tries++;}
    while(mapTiles[wy][wx]!==0&&tries<50);
    if(mapTiles[wy][wx]===0)items.push({x:wx*TILE+TILE/2,y:wy*TILE+TILE/2,type:'weapon_rifle',life:9999});
  }
  // Blade pickup (temple 4+)
  if(tIdx>=3){
    let wx,wy,tries=0;
    do{wx=4+Math.floor(Math.random()*(mapW-8));wy=4+Math.floor(Math.random()*(mapH-8));tries++;}
    while(mapTiles[wy][wx]!==0&&tries<50);
    if(mapTiles[wy][wx]===0)items.push({x:wx*TILE+TILE/2,y:wy*TILE+TILE/2,type:'weapon_blade',life:9999});
  }
}

function placeTraps(tIdx){
  const T=TEMPLES[tIdx];
  for(let i=0;i<T.trapCount;i++){
    let tx,ty,tries=0;
    do{tx=4+Math.floor(Math.random()*(mapW-8));ty=4+Math.floor(Math.random()*(mapH-8));tries++;}
    while((mapTiles[ty][tx]!==0||(Math.abs(tx-2.5)<4&&Math.abs(ty-2.5)<4))&&tries<50);
    if(mapTiles[ty][tx]===0){
      const trapType=T.traps[Math.floor(Math.random()*T.traps.length)];
      interactables.push({x:tx*TILE+TILE/2,y:ty*TILE+TILE/2,type:'trap',trapType,
        active:true,timer:0,period:trapType==='spikes'?90:60});
    }
  }
}

function placePuzzles(tIdx){
  const T=TEMPLES[tIdx];
  const puzzleTypes=['pressure_plate','lever','torch','push_block'];
  const count=2+Math.floor(Math.random()*2);
  for(let i=0;i<count;i++){
    const pt=puzzleTypes[Math.floor(Math.random()*puzzleTypes.length)];
    let px,py,tries=0;
    do{px=4+Math.floor(Math.random()*(mapW-8));py=4+Math.floor(Math.random()*(mapH-8));tries++;}
    while(mapTiles[py][px]!==0&&tries<50);
    if(mapTiles[py][px]===0){
      // Find a nearby wall to toggle as the "gate"
      let gateX=px,gateY=py;
      if(pt==='pressure_plate'||pt==='lever'){
        // Place gate somewhere nearby
        const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
        const d=dirs[Math.floor(Math.random()*4)];
        let gx=px+d[0]*3,gy=py+d[1]*3;
        if(gx>1&&gx<mapW-2&&gy>1&&gy<mapH-2){
          mapTiles[gy][gx]=3; // gate tile
          interactables.push({x:px*TILE+TILE/2,y:py*TILE+TILE/2,type:'puzzle',puzzleType:pt,
            activated:false,gateX:gx,gateY:gy});
        }
      }else{
        interactables.push({x:px*TILE+TILE/2,y:py*TILE+TILE/2,type:'puzzle',puzzleType:pt,
          activated:false,gateX:-1,gateY:-1});
      }
    }
  }
}

// ========== COLLISION ==========
function tileAt(px,py){
  const tx=Math.floor(px/TILE),ty=Math.floor(py/TILE);
  if(tx<0||tx>=mapW||ty<0||ty>=mapH)return 1;
  return mapTiles[ty][tx];
}
function isWall(px,py){
  const t=tileAt(px,py);
  return t===1||t===3; // wall or closed gate
}
function canMove(x,y,r){
  r=r||8;
  return !isWall(x-r,y-r)&&!isWall(x+r,y-r)&&!isWall(x-r,y+r)&&!isWall(x+r,y+r);
}

// ========== PARTICLES ==========
function addParticle(x,y,color,count,spread){
  spread=spread||4;
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,s=0.5+Math.random()*spread;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
      life:15+Math.random()*25,maxLife:40,color,size:1.5+Math.random()*2.5});
  }
}

// ========== MESSAGES ==========
function addMessage(text,duration){
  duration=duration||120;
  messages.push({text,timer:duration,maxTimer:duration,y:0});
}

// ========== ACHIEVEMENTS ==========
function unlockAchievement(id){
  if(unlockedAchievements.includes(id))return;
  unlockedAchievements.push(id);
  const ach=ACHIEVEMENTS.find(a=>a.id===id);
  if(ach){addMessage('🏆 '+ach.name+' - '+ach.desc,180);relicSnd();}
}

function checkAchievements(){
  if(totalKills>=1)unlockAchievement('first_blood');
  if(totalKills>=50)unlockAchievement('marksman');
  if(totalKills>=100)unlockAchievement('centurion');
  if(totalSecrets>=10)unlockAchievement('all_secrets');
  if(relicsFound.length>=1)unlockAchievement('relic_collector');
  if(relicsFound.length>=6)unlockAchievement('master_hunter');
  if(templesCleared.length>=3)unlockAchievement('survivor');
  if(templesCleared.length>=6)unlockAchievement('completionist');
  if(totalXp>=1000)unlockAchievement('max_level');
  if(totalCoinsEarned>=500)unlockAchievement('treasure_hunter');
  if(player.bladeKills>=10)unlockAchievement('blade_master');
  if(totalPuzzlesSolved>=5)unlockAchievement('puzzle_master');
}

// ========== UPDATE ==========
function update(){
  if(state!=='playing')return;
  levelTimer++;
  ambientTimer++;
  if(ambientTimer%180===0){
    const T=TEMPLES[currentLevel];
    if(T.name.includes('Flame'))lavaSnd();
  }

  // Player movement
  let dx=0,dy=0;
  if(keys['w']||keys['arrowup'])dy=-1;
  if(keys['s']||keys['arrowdown'])dy=1;
  if(keys['a']||keys['arrowleft'])dx=-1;
  if(keys['d']||keys['arrowright'])dx=1;
  if(dx||dy){
    const l=Math.sqrt(dx*dx+dy*dy);dx/=l;dy/=l;
    const spd=player.crouching?player.speed*0.5:player.speed;
    const nx=player.x+dx*spd,ny=player.y+dy*spd;
    if(canMove(nx,player.y,7))player.x=nx;
    if(canMove(player.x,ny,7))player.y=ny;
    player.x=Math.max(TILE,Math.min((mapW-1)*TILE,player.x));
    player.y=Math.max(TILE,Math.min((mapH-1)*TILE,player.y));
    // Footsteps
    player.footstepClock++;
    if(player.footstepClock%12===0)footstepSnd();
  }

  // Player angle toward mouse (world coords)
  const worldMX=mouse.x+camX,worldMY=mouse.y+camY;
  player.angle=Math.atan2(worldMY-player.y,worldMX-player.x);

  if(player.invuln>0)player.invuln--;

  // Crouch
  if(keys['c']){player.crouching=true;}else{player.crouching=false;}

  // Weapon fire
  const w=weapons[currentWeapon];
  w.fireTimer--;
  if(keys[' ']&&w.fireTimer<=0&&w.ammo>0){
    if(w.melee){
      bladeSnd();
      // Melee attack in arc
      enemies.forEach(e=>{
        if(e.hp<=0)return;
        const d=Math.hypot(e.x-player.x,e.y-player.y);
        const angleDiff=Math.abs(Math.atan2(e.y-player.y,e.x-player.x)-player.angle);
        if(d<w.range+e.size&&(angleDiff<0.8||angleDiff>Math.PI-0.8)){
          e.hp-=w.dmg;enemyHitSnd();addParticle(e.x,e.y,w.color,5);
          if(e.hp<=0){onEnemyKill(e);player.bladeKills++;}
        }
      });
      addParticle(player.x+Math.cos(player.angle)*20,player.y+Math.sin(player.angle)*20,w.color,8,3);
    }else{
      if(w.name.includes('Pistol'))pistolSnd();
      else if(w.name.includes('Shotgun'))shotgunSnd();
      else if(w.name.includes('Rifle'))rifleSnd();
      for(let i=0;i<w.bullets;i++){
        const spread=(Math.random()-0.5)*w.spread*2;
        const a=player.angle+spread;
        bullets.push({x:player.x+Math.cos(player.angle)*12,y:player.y+Math.sin(player.angle)*12,
          vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,
          dmg:w.dmg,color:w.color,life:Math.floor(w.range/w.speed),size:2,owner:'player'});
      }
      w.ammo--;
    }
    w.fireTimer=w.rate;
  }

  // Interact
  player.interactTarget=null;
  // Check items
  for(let i=items.length-1;i>=0;i--){
    const it=items[i];
    if(Math.hypot(it.x-player.x,it.y-player.y)<18){
      player.interactTarget=it;
    }
  }
  // Check puzzles
  interactables.forEach(ib=>{
    if(ib.type==='puzzle'&&!ib.activated&&Math.hypot(ib.x-player.x,ib.y-player.y)<22){
      player.interactTarget=ib;
    }
  });

  if(keys['e']&&player.interactTarget){
    keys['e']=false;
    const it=player.interactTarget;
    if(it.type==='health'){player.hp=Math.min(player.maxHp,player.hp+35);pickupSnd();addMessage('+35 Health',90);items.splice(items.indexOf(it),1);}
    else if(it.type==='ammo'){weapons.forEach(ww=>{if(ww.type==='gun')ww.ammo=ww.maxAmmo;});pickupSnd();addMessage('Ammo Refilled!',90);items.splice(items.indexOf(it),1);}
    else if(it.type==='armor'){player.armor=Math.min(100,player.armor+30);pickupSnd();addMessage('+30 Armor',90);items.splice(items.indexOf(it),1);}
    else if(it.type==='coins'){const amt=it.amount||10;levelCoins+=amt;totalCoinsEarned+=amt;saveCoins(getCoins()+amt);pickupSnd();addMessage('+'+amt+' Coins',60);items.splice(items.indexOf(it),1);}
    else if(it.type==='key'){keysHeld++;pickupSnd();addMessage('Key Found! (Total: '+keysHeld+')',90);items.splice(items.indexOf(it),1);}
    else if(it.type==='secret'){totalSecrets++;levelSecrets++;pickupSnd();addMessage('🔍 Secret Discovered!',120);items.splice(items.indexOf(it),1);}
    else if(it.type==='weapon_shotgun'){weapons[1].ammo=weapons[1].maxAmmo;pickupSnd();addMessage('Shotgun Acquired!',120);items.splice(items.indexOf(it),1);}
    else if(it.type==='weapon_rifle'){weapons[2].ammo=weapons[2].maxAmmo;pickupSnd();addMessage('Rifle Acquired!',120);items.splice(items.indexOf(it),1);}
    else if(it.type==='weapon_blade'){weapons[3].ammo=999;pickupSnd();addMessage('Relic Blade Acquired!',120);items.splice(items.indexOf(it),1);}
    else if(it.type==='puzzle'){
      if(it.puzzleType==='pressure_plate'){
        it.activated=true;puzzleSnd();levelPuzzles++;totalPuzzlesSolved++;
        if(it.gateX>=0){mapTiles[it.gateY][it.gateX]=0;doorOpenSnd();addMessage('Gate Opened!',90);}
        addMessage('Pressure plate activated!',90);
      }else if(it.puzzleType==='lever'){
        it.activated=!it.activated;switchSnd();levelPuzzles++;totalPuzzlesSolved++;
        if(it.gateX>=0){mapTiles[it.gateY][it.gateX]=it.activated?0:3;if(it.activated)doorOpenSnd();addMessage(it.activated?'Gate Opened!':'Gate Closed!',90);}
        else addMessage(it.activated?'Lever ON':'Lever OFF',60);
      }else if(it.puzzleType==='torch'){
        it.activated=true;puzzleSnd();levelPuzzles++;totalPuzzlesSolved++;addMessage('Torch Lit!',60);
      }else if(it.puzzleType==='push_block'){
        it.activated=true;puzzleSnd();levelPuzzles++;totalPuzzlesSolved++;addMessage('Block Pushed!',60);
      }
    }
  }

  // Check relic
  if(relicZone&&!relicZone.collected){
    if(player.x>relicZone.x-relicZone.w/2&&player.x<relicZone.x+relicZone.w/2&&
       player.y>relicZone.y-relicZone.h/2&&player.y<relicZone.y+relicZone.h/2){
      relicZone.collected=true;
      relicsFound.push(relicZone.name);
      relicSnd();
      addMessage('🏺 '+relicZone.name+' Collected!',180);
      addParticle(player.x,player.y,'#f80',30,6);
      unlockAchievement('relic_collector');
      if(relicsFound.length>=6)unlockAchievement('master_hunter');
    }
  }

  // Check exit
  if(exitZone){
    if(player.x>exitZone.x-exitZone.w/2&&player.x<exitZone.x+exitZone.w/2&&
       player.y>exitZone.y-exitZone.h/2&&player.y<exitZone.y+exitZone.h/2){
      if(relicZone&&!relicZone.collected){
        if(!messages.some(m=>m.text.includes('Relic')))addMessage('Find the relic before leaving!',90);
      }else{
        levelComplete();
        return;
      }
    }
  }

  // Lava tile damage
  const playerTile=tileAt(player.x,player.y);
  if(playerTile===4&&!player.crouching){
    if(levelTimer%30===0){damagePlayer(5);lavaSnd();}
  }

  // Shadow tile slow
  if(playerTile===5){player.speed=1.5;}else{player.speed=2.5;}

  // Enemies update
  enemies.forEach(e=>{
    if(e.hp<=0)return;
    const dist=Math.hypot(e.x-player.x,e.y-player.y);
    e.attackTimer--;
    e.patrolTimer++;

    if(dist<e.aggroRange){e.state='chase';}
    if(dist>e.aggroRange*1.5){e.state='patrol';}

    if(e.state==='patrol'){
      if(e.patrolTimer%120===0)e.patrolAngle+=Math.PI*(0.3+Math.random()*0.4);
      const mvx=Math.cos(e.patrolAngle)*e.speed*0.4;
      const mvy=Math.sin(e.patrolAngle)*e.speed*0.4;
      if(canMove(e.x+mvx,e.y,e.size))e.x+=mvx;
      if(canMove(e.x,e.y+mvy,e.size))e.y+=mvy;
    }else{
      // Chase player
      e.angle=Math.atan2(player.y-e.y,player.x-e.x);
      const mvx=Math.cos(e.angle)*e.speed;
      const mvy=Math.sin(e.angle)*e.speed;
      if(canMove(e.x+mvx,e.y,e.size))e.x+=mvx;
      if(canMove(e.x,e.y+mvy,e.size))e.y+=mvy;
      // Attack
      if(dist<e.size+12&&e.attackTimer<=0){
        damagePlayer(e.dmg);e.attackTimer=e.isBoss?40:30;
        if(e.isBoss)bossSnd();
      }
      // Ranged for certain enemies
      if(e.type==='eagle'&&dist<200&&dist>60&&e.attackTimer<=0){
        e.attackTimer=45;
        bullets.push({x:e.x,y:e.y,vx:Math.cos(e.angle)*5,vy:Math.sin(e.angle)*5,
          dmg:e.dmg,color:'#ff0',life:40,size:3,owner:'enemy'});
      }
      if(e.isBoss&&e.attackTimer<=0&&dist<250&&dist>50){
        e.attackTimer=60;
        for(let a=0;a<8;a++){
          const ba=a*Math.PI/4;
          bullets.push({x:e.x,y:e.y,vx:Math.cos(ba)*3,vy:Math.sin(ba)*3,
            dmg:10,color:'#f8f',life:50,size:4,owner:'enemy'});
        }
      }
    }
    // Keep in bounds
    e.x=Math.max(TILE+e.size,Math.min((mapW-1)*TILE-e.size,e.x));
    e.y=Math.max(TILE+e.size,Math.min((mapH-1)*TILE-e.size,e.y));
  });

  // Bullets update
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];b.x+=b.vx;b.y+=b.vy;b.life--;
    if(b.life<=0||isWall(b.x,b.y)){bullets.splice(i,1);continue;}

    if(b.owner==='enemy'){
      if(Math.hypot(b.x-player.x,b.y-player.y)<12){
        damagePlayer(b.dmg);bullets.splice(i,1);continue;
      }
      continue;
    }

    // Hit enemies
    let hit=false;
    for(let j=0;j<enemies.length;j++){
      const e=enemies[j];if(e.hp<=0)continue;
      if(Math.hypot(b.x-e.x,b.y-e.y)<e.size){
        e.hp-=b.dmg;enemyHitSnd();addParticle(b.x,b.y,b.color,4);
        if(e.hp<=0){onEnemyKill(e);}
        bullets.splice(i,1);hit=true;break;
      }
    }
  }

  // Trap damage
  interactables.forEach(ib=>{
    if(ib.type!=='trap'||!ib.active)return;
    ib.timer++;
    if(ib.timer%ib.period<20){// Trap is active
      if(Math.hypot(ib.x-player.x,ib.y-player.y)<TILE*0.6&&!player.crouching){
        if(ib.timer%ib.period===0)damagePlayer(ib.trapType==='lava'?12:8);
      }
    }
  });

  // Clean dead enemies
  for(let i=enemies.length-1;i>=0;i--){if(enemies[i].hp<=0)enemies.splice(i,1);}

  // Expire dropped loot items (life < 9999)
  for(let i=items.length-1;i>=0;i--){
    const it=items[i];
    if(it.life!==9999){it.life--;if(it.life<=0)items.splice(i,1);}
  }

  // Particles
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.life--;p.vx*=0.96;p.vy*=0.96;
    if(p.life<=0)particles.splice(i,1);
  }

  // Messages
  for(let i=messages.length-1;i>=0;i--){
    messages[i].timer--;
    if(messages[i].timer<=0)messages.splice(i,1);
  }

  // Camera
  const targetCX=player.x-450,targetCY=player.y-350;
  camX+=(targetCX-camX)*0.1;camY+=(targetCY-camY)*0.1;
  camX=Math.max(0,Math.min(mapW*TILE-900,camX));
  camY=Math.max(0,Math.min(mapH*TILE-700,camY));

  if(shakeT>0)shakeT--;
  checkAchievements();
  updateHUD();
}

function onEnemyKill(e){
  enemyDeathSnd();addParticle(e.x,e.y,e.color,15,5);
  levelKills++;totalKills++;
  totalXp+=e.xp;saveCoins(getCoins()+e.coins);levelCoins+=e.coins;
  addMessage('+'+e.xp+' XP',60);
  if(e.isBoss){unlockAchievement('boss_slayer');addParticle(e.x,e.y,'#f8f',40,8);}
  if(e.type==='guardian')bossAlive=false;
  // Drop loot
  if(Math.random()<0.3)items.push({x:e.x,y:e.y,type:'health',life:600});
  if(Math.random()<0.2)items.push({x:e.x+10,y:e.y,type:'ammo',life:600});
}

function damagePlayer(dmg){
  if(player.invuln>0)return;
  let actualDmg=dmg;
  if(player.armor>0){const absorbed=Math.min(player.armor,Math.floor(dmg*0.6));player.armor-=absorbed;actualDmg-=absorbed;}
  player.hp-=actualDmg;player.invuln=20;shakeT=8;shakeA=4;noDamageRun=false;
  playerHitSnd();addParticle(player.x,player.y,'#f44',8);
  if(player.hp<=0){player.hp=0;gameOver();}
}

function levelComplete(){
  state='level-complete';
  if(!templesCleared.includes(currentLevel))templesCleared.push(currentLevel);
  const completionBonus=50+currentLevel*20;
  saveCoins(getCoins()+completionBonus);totalCoinsEarned+=completionBonus;
  totalXp+=100;
  // Check speed run
  if(levelTimer<90*60)unlockAchievement('speed_runner');
  if(noDamageRun)unlockAchievement('no_damage');
  if(templesCleared.length>=6)unlockAchievement('completionist');
  saveGame();
  document.getElementById('lc-title').textContent=TEMPLES[currentLevel].name+' CLEARED!';
  document.getElementById('lc-title').style.color='#f80';
  document.getElementById('lc-stats').innerHTML=
    `<p>Enemies Defeated: <span>${levelKills}</span></p>`+
    `<p>Puzzles Solved: <span>${levelPuzzles}</span></p>`+
    `<p>Secrets Found: <span>${levelSecrets}</span></p>`+
    `<p>Time: <span>${Math.floor(levelTimer/60)}s</span></p>`+
    `<p>XP Earned: <span>100</span></p>`+
    (!relicZone||!relicZone.collected?'':'<p>Relic: <span>'+relicZone.name+' ✓</span></p>');
  document.getElementById('lc-coins').textContent='+'+completionBonus;
  if(templesCleared.length>=6){
    document.getElementById('btn-next-level').textContent='VICTORY!';
  }else{
    document.getElementById('btn-next-level').textContent='RETURN TO MAP';
  }
  showScreen('level-complete-screen');
  document.getElementById('hud').classList.add('hidden');
}

function gameOver(){
  state='game-over';
  document.getElementById('go-stats').innerHTML=
    `<p>Enemies Defeated: <span>${levelKills}</span></p>`+
    `<p>Time Survived: <span>${Math.floor(levelTimer/60)}s</span></p>`+
    `<p>Temple: <span>${TEMPLES[currentLevel].name}</span></p>`;
  showScreen('game-over-screen');
  document.getElementById('hud').classList.add('hidden');
}

// ========== RENDER ==========
function render(){
  if(state!=='playing'&&state!=='inventory'&&state!=='pause')return;
  const T=TEMPLES[currentLevel];
  // BG
  ctx.fillStyle=T.bgColor;ctx.fillRect(0,0,900,700);
  let sx=0,sy=0;
  if(shakeT>0){sx=(Math.random()-0.5)*shakeA;sy=(Math.random()-0.5)*shakeA;}
  ctx.save();ctx.translate(-camX+sx,-camY+sy);

  // Tiles
  const startX=Math.max(0,Math.floor(camX/TILE));
  const startY=Math.max(0,Math.floor(camY/TILE));
  const endX=Math.min(mapW,startX+Math.ceil(900/TILE)+2);
  const endY=Math.min(mapH,startY+Math.ceil(700/TILE)+2);

  for(let y=startY;y<endY;y++){
    for(let x=startX;x<endX;x++){
      const t=mapTiles[y][x];
      const px=x*TILE,py=y*TILE;
      if(t===0){
        ctx.fillStyle=T.floorColor;ctx.fillRect(px,py,TILE,TILE);
        // Subtle grid
        ctx.strokeStyle='rgba(255,255,255,0.02)';ctx.strokeRect(px,py,TILE,TILE);
      }else if(t===1){
        ctx.fillStyle=T.wallColor;ctx.fillRect(px,py,TILE,TILE);
        ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(px+2,py+2,TILE-2,TILE-2);
        ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.strokeRect(px,py,TILE,TILE);
      }else if(t===3){// Gate
        ctx.fillStyle='#866';ctx.fillRect(px,py,TILE,TILE);
        ctx.strokeStyle='#a84';ctx.lineWidth=2;ctx.strokeRect(px+2,py+2,TILE-4,TILE-4);ctx.lineWidth=1;
      }else if(t===4){// Lava
        const flicker=Math.sin(Date.now()/200+x*0.5+y*0.3)*0.2;
        ctx.fillStyle=`rgb(${180+Math.floor(flicker*60)},${50+Math.floor(flicker*30)},0)`;
        ctx.fillRect(px,py,TILE,TILE);
      }else if(t===5){// Shadow
        ctx.fillStyle='#080810';ctx.fillRect(px,py,TILE,TILE);
      }
    }
  }

  // Interactables (puzzles)
  interactables.forEach(ib=>{
    if(ib.type==='trap'&&ib.active){
      const active=ib.timer%ib.period<20;
      if(active){
        ctx.fillStyle=ib.trapType==='lava'?'rgba(255,60,0,0.4)':'rgba(255,255,255,0.3)';
        ctx.fillRect(ib.x-TILE*0.4,ib.y-TILE*0.4,TILE*0.8,TILE*0.8);
        ctx.strokeStyle=ib.trapType==='lava'?'#f40':'#fff';ctx.lineWidth=1;
        ctx.strokeRect(ib.x-TILE*0.4,ib.y-TILE*0.4,TILE*0.8,TILE*0.8);
        // Spikes visual
        if(ib.trapType==='spikes'){
          ctx.fillStyle='#aaa';
          for(let s=0;s<4;s++){
            const spx=ib.x-TILE*0.3+s*TILE*0.2;
            ctx.beginPath();ctx.moveTo(spx,ib.y+5);ctx.lineTo(spx+3,ib.y-5);ctx.lineTo(spx+6,ib.y+5);ctx.fill();
          }
        }
      }else{
        ctx.fillStyle='rgba(100,100,100,0.15)';ctx.fillRect(ib.x-TILE*0.4,ib.y-TILE*0.4,TILE*0.8,TILE*0.8);
      }
    }
    if(ib.type==='puzzle'){
      if(ib.puzzleType==='pressure_plate'){
        ctx.fillStyle=ib.activated?'#4a4':'#a86';
        ctx.fillRect(ib.x-8,ib.y-8,16,16);
        ctx.strokeStyle=ib.activated?'#0f0':'#f80';ctx.strokeRect(ib.x-8,ib.y-8,16,16);
      }else if(ib.puzzleType==='lever'){
        ctx.fillStyle=ib.activated?'#4a4':'#a66';
        ctx.fillRect(ib.x-3,ib.y-10,6,20);
        ctx.fillStyle=ib.activated?'#0f0':'#f00';
        ctx.fillRect(ib.x-6,ib.activated?ib.y-10:ib.y+4,12,6);
      }else if(ib.puzzleType==='torch'){
        ctx.fillStyle='#842';ctx.fillRect(ib.x-2,ib.y-5,4,10);
        if(ib.activated){
          ctx.fillStyle='#f80';ctx.beginPath();ctx.arc(ib.x,ib.y-8,4+Math.sin(Date.now()/100)*1.5,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#ff0';ctx.beginPath();ctx.arc(ib.x,ib.y-8,2,0,Math.PI*2);ctx.fill();
        }
      }else if(ib.puzzleType==='push_block'){
        ctx.fillStyle=ib.activated?'#665':'#886';
        ctx.fillRect(ib.x-8,ib.y-8,16,16);
        ctx.strokeStyle='#aa8';ctx.strokeRect(ib.x-8,ib.y-8,16,16);
      }
    }
  });

  // Exit zone
  if(exitZone){
    const pulse=Math.sin(Date.now()/300)*0.2+0.5;
    ctx.fillStyle=`rgba(0,255,100,${pulse*0.2})`;
    ctx.fillRect(exitZone.x-exitZone.w/2,exitZone.y-exitZone.h/2,exitZone.w,exitZone.h);
    ctx.strokeStyle=`rgba(0,255,100,${pulse})`;ctx.lineWidth=2;
    ctx.strokeRect(exitZone.x-exitZone.w/2,exitZone.y-exitZone.h/2,exitZone.w,exitZone.h);ctx.lineWidth=1;
    ctx.fillStyle='#0f0';ctx.font='bold 10px monospace';ctx.textAlign='center';
    ctx.fillText('EXIT',exitZone.x,exitZone.y+4);ctx.textAlign='left';
  }

  // Relic zone
  if(relicZone&&!relicZone.collected){
    const glow=Math.sin(Date.now()/400)*0.3+0.7;
    ctx.fillStyle=`rgba(255,136,0,${glow*0.3})`;
    ctx.fillRect(relicZone.x-relicZone.w/2,relicZone.y-relicZone.h/2,relicZone.w,relicZone.h);
    ctx.strokeStyle=`rgba(255,136,0,${glow})`;ctx.lineWidth=2;
    ctx.strokeRect(relicZone.x-relicZone.w/2,relicZone.y-relicZone.h/2,relicZone.w,relicZone.h);ctx.lineWidth=1;
    // Relic icon
    ctx.fillStyle='#f80';ctx.font='16px serif';ctx.textAlign='center';
    ctx.fillText('🏺',relicZone.x,relicZone.y+5);ctx.textAlign='left';
  }

  // Items
  items.forEach(it=>{
    if(it.life<=0&&it.life!==9999)return;
    const bob=Math.sin(Date.now()/300+it.x)*2;
    let color='#fff',icon='?';
    if(it.type==='health'){color='#0f0';icon='+';}
    else if(it.type==='ammo'){color='#ff0';icon='A';}
    else if(it.type==='armor'){color='#88f';icon='S';}
    else if(it.type==='coins'){color='#f80';icon='$';}
    else if(it.type==='key'){color='#ff0';icon='🔑';}
    else if(it.type==='secret'){color='#f8f';icon='★';}
    else if(it.type.startsWith('weapon')){color='#f8f';icon='⚔';}
    ctx.fillStyle=color;ctx.globalAlpha=0.8;
    ctx.beginPath();ctx.arc(it.x,it.y+bob,6,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle='#000';ctx.font='bold 8px monospace';ctx.textAlign='center';
    ctx.fillText(icon,it.x,it.y+bob+3);ctx.textAlign='left';
  });

  // Enemies
  enemies.forEach(e=>{
    if(e.hp<=0)return;
    ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle);
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(0,e.size*0.5,e.size*0.7,4,0,0,Math.PI*2);ctx.fill();
    // Body
    ctx.fillStyle=e.color;
    if(e.isBoss){
      // Boss - larger, detailed
      ctx.beginPath();ctx.arc(0,0,e.size,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.lineWidth=1;
      // Crown
      ctx.fillStyle='#f80';
      ctx.beginPath();ctx.moveTo(-10,-e.size);ctx.lineTo(-6,-e.size-8);ctx.lineTo(-2,-e.size);
      ctx.lineTo(2,-e.size-8);ctx.lineTo(6,-e.size);ctx.lineTo(10,-e.size-8);ctx.lineTo(14,-e.size);
      ctx.closePath();ctx.fill();
      // Eyes
      ctx.fillStyle='#f00';ctx.beginPath();ctx.arc(6,-5,4,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(6,5,4,0,Math.PI*2);ctx.fill();
    }else if(e.type==='mummy'){
      ctx.fillRect(-e.size,-e.size*0.8,e.size*2,e.size*1.6);
      ctx.strokeStyle='#d8c';ctx.lineWidth=1;
      for(let s=-e.size;s<e.size;s+=5){ctx.beginPath();ctx.moveTo(s,-e.size*0.8);ctx.lineTo(s+3,e.size*0.8);ctx.stroke();}
      ctx.lineWidth=1;
    }else if(e.type==='ice_golem'){
      ctx.fillRect(-e.size,-e.size,e.size*2,e.size*2);
      ctx.fillStyle='#adf';ctx.fillRect(-e.size+3,-e.size+3,e.size*2-6,e.size*2-6);
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(4,-3,3,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(4,5,3,0,Math.PI*2);ctx.fill();
    }else if(e.type==='fire_demon'){
      ctx.beginPath();ctx.moveTo(e.size,0);ctx.lineTo(-e.size,-e.size);ctx.lineTo(-e.size*0.5,0);ctx.lineTo(-e.size,e.size);ctx.closePath();ctx.fill();
      ctx.fillStyle='#fa0';ctx.beginPath();ctx.moveTo(e.size*0.5,0);ctx.lineTo(-e.size*0.5,-e.size*0.5);ctx.lineTo(-e.size*0.2,0);ctx.lineTo(-e.size*0.5,e.size*0.5);ctx.closePath();ctx.fill();
    }else if(e.type==='shadow_beast'){
      ctx.beginPath();ctx.arc(0,0,e.size,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#000';ctx.beginPath();ctx.arc(0,0,e.size*0.6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f0f';
      ctx.beginPath();ctx.arc(4,-3,2.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(4,3,2.5,0,Math.PI*2);ctx.fill();
    }else if(e.type==='eagle'){
      // Wings
      ctx.beginPath();ctx.moveTo(e.size,0);ctx.lineTo(-e.size,-e.size*1.2);ctx.lineTo(-e.size*0.3,0);
      ctx.lineTo(-e.size,e.size*1.2);ctx.closePath();ctx.fill();
      ctx.fillStyle='#8f6';ctx.beginPath();ctx.arc(e.size*0.3,0,4,0,Math.PI*2);ctx.fill();
    }else{
      ctx.beginPath();ctx.arc(0,0,e.size,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    // HP bar
    if(e.hp<e.maxHp){
      const bw=Math.max(20,e.size*1.5);
      ctx.fillStyle='#333';ctx.fillRect(e.x-bw/2,e.y-e.size-8,bw,3);
      ctx.fillStyle=e.isBoss?'#f0f':e.hp>e.maxHp*0.5?'#0f0':'#f00';
      ctx.fillRect(e.x-bw/2,e.y-e.size-8,bw*(e.hp/e.maxHp),3);
    }
    // Aggro indicator
    if(e.state==='chase'){
      ctx.fillStyle='#f00';ctx.font='bold 12px monospace';ctx.textAlign='center';
      ctx.fillText('!',e.x,e.y-e.size-12);ctx.textAlign='left';
    }
  });

  // Player
  if(player.invuln<=0||Math.floor(player.invuln/3)%2===0){
    ctx.save();ctx.translate(player.x,player.y);
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(0,10,10,4,0,0,Math.PI*2);ctx.fill();
    ctx.rotate(player.angle);
    // Body
    const crouchOffset=player.crouching?3:0;
    ctx.fillStyle=player.crouching?'#864':'#a86';
    ctx.beginPath();ctx.arc(0,crouchOffset,9,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#f80';ctx.lineWidth=1.5;ctx.stroke();ctx.lineWidth=1;
    // Gun
    const w=weapons[currentWeapon];
    if(w.melee){
      ctx.fillStyle='#f8f';ctx.fillRect(6,crouchOffset-2,14,4);
      ctx.fillStyle='#fff';ctx.fillRect(18,crouchOffset-4,6,8);
    }else{
      ctx.fillStyle='#888';ctx.fillRect(6,crouchOffset-2,14,4);
      ctx.fillStyle='#666';ctx.fillRect(18,crouchOffset-3,5,6);
    }
    // Direction indicator
    ctx.fillStyle='#f80';ctx.beginPath();ctx.arc(12,crouchOffset,2,0,Math.PI*2);ctx.fill();
    ctx.restore();
    // HP bar
    ctx.fillStyle='#222';ctx.fillRect(player.x-16,player.y-20,32,4);
    ctx.fillStyle=player.hp>player.maxHp*0.5?'#0c0':player.hp>player.maxHp*0.25?'#cc0':'#c00';
    ctx.fillRect(player.x-16,player.y-20,32*(player.hp/player.maxHp),4);
    // Armor bar
    if(player.armor>0){
      ctx.fillStyle='#222';ctx.fillRect(player.x-16,player.y-25,32,3);
      ctx.fillStyle='#88f';ctx.fillRect(player.x-16,player.y-25,32*(player.armor/100),3);
    }
  }

  // Bullets
  bullets.forEach(b=>{
    ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.size,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=0.3;ctx.beginPath();ctx.arc(b.x-b.vx,b.y-b.vy,b.size*0.8,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  });

  // Particles
  particles.forEach(p=>{
    ctx.globalAlpha=Math.max(0,p.life/p.maxLife);ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,p.size*(p.life/p.maxLife),0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;

  ctx.restore();// camera transform

  // Temple of Shadows limited visibility
  if(currentLevel===3){
    ctx.fillStyle='rgba(0,0,20,0.7)';ctx.fillRect(0,0,900,700);
    const grd=ctx.createRadialGradient(450+sx,350+sy,40,450+sx,350+sy,220);
    grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(0,0,20,0.85)');
    ctx.fillStyle=grd;ctx.fillRect(0,0,900,700);
  }

  // Temple of Storms wind particles
  if(currentLevel===4&&Math.random()<0.3){
    ctx.fillStyle='rgba(150,200,255,0.2)';
    ctx.fillRect(Math.random()*900,Math.random()*700,15+Math.random()*20,1);
  }

  // Messages
  let msgY=100;
  messages.forEach(m=>{
    const alpha=Math.min(1,m.timer/30);
    ctx.globalAlpha=alpha;ctx.fillStyle='#f80';ctx.font='bold 13px monospace';ctx.textAlign='center';
    ctx.fillText(m.text,450,msgY);ctx.textAlign='left';ctx.globalAlpha=1;
    msgY+=22;
  });

  // Minimap
  const mmScale=2.5;
  const mmW=mapW*mmScale,mmH=mapH*mmScale;
  const mmX=900-mmW-8,mmY=40;
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(mmX-2,mmY-2,mmW+4,mmH+4);
  for(let y=0;y<mapH;y++){
    for(let x=0;x<mapW;x++){
      const t=mapTiles[y][x];
      if(t===1){ctx.fillStyle='#444';ctx.fillRect(mmX+x*mmScale,mmY+y*mmScale,mmScale,mmScale);}
      else if(t===3){ctx.fillStyle='#864';ctx.fillRect(mmX+x*mmScale,mmY+y*mmScale,mmScale,mmScale);}
      else if(t===4){ctx.fillStyle='#a30';ctx.fillRect(mmX+x*mmScale,mmY+y*mmScale,mmScale,mmScale);}
      else if(t===0){ctx.fillStyle='#222';ctx.fillRect(mmX+x*mmScale,mmY+y*mmScale,mmScale,mmScale);}
    }
  }
  // Enemies on minimap
  enemies.forEach(e=>{
    if(e.hp<=0)return;
    ctx.fillStyle=e.isBoss?'#f0f':'#f44';
    ctx.fillRect(mmX+(e.x/TILE)*mmScale-1,mmY+(e.y/TILE)*mmScale-1,e.isBoss?4:2,e.isBoss?4:2);
  });
  // Player on minimap
  ctx.fillStyle='#0f0';
  ctx.fillRect(mmX+(player.x/TILE)*mmScale-1.5,mmY+(player.y/TILE)*mmScale-1.5,3,3);
  // Relic on minimap
  if(relicZone&&!relicZone.collected){
    ctx.fillStyle='#f80';
    ctx.fillRect(mmX+(relicZone.x/TILE)*mmScale-1.5,mmY+(relicZone.y/TILE)*mmScale-1.5,3,3);
  }
  // Exit on minimap
  if(exitZone){
    ctx.fillStyle='#0f0';
    ctx.fillRect(mmX+(exitZone.x/TILE)*mmScale-1.5,mmY+(exitZone.y/TILE)*mmScale-1.5,3,3);
  }
}

// ========== HUD ==========
function updateHUD(){
  const w=weapons[currentWeapon];
  document.getElementById('hud-hp').textContent=Math.ceil(player.hp);
  document.getElementById('hud-maxhp').textContent=player.maxHp;
  document.getElementById('hud-armor').textContent=Math.ceil(player.armor);
  document.getElementById('hud-wpn').textContent=w.name;
  document.getElementById('hud-ammo').textContent=w.melee?'∞':w.ammo+'/'+w.maxAmmo;
  document.getElementById('hud-level').textContent=(currentLevel+1);
  document.getElementById('hud-xp').textContent=totalXp;
  document.getElementById('hud-coins').textContent=getCoins();
  document.getElementById('hud-relics').textContent='RELICS: '+relicsFound.length+'/6';
  document.getElementById('hud-keys').textContent=keysHeld;
  const interEl=document.getElementById('hud-interact');
  if(player.interactTarget){interEl.style.display='block';}else{interEl.style.display='none';}
}

// ========== SCREENS ==========
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  if(id)document.getElementById(id).classList.add('active');
}

function renderWorldMap(){
  const container=document.getElementById('world-map');
  container.innerHTML='';
  TEMPLES.forEach((t,i)=>{
    const node=document.createElement('div');
    node.className='map-node';
    if(templesCleared.includes(i))node.classList.add('completed');
    if(i===selectedMapNode)node.classList.add('selected');
    // Unlock logic: first always, others need previous cleared
    if(i>0&&!templesCleared.includes(i-1)&&!templesCleared.includes(i)){
      node.classList.add('locked');
    }
    node.innerHTML=`<div class="map-icon">${t.icon}</div><div class="map-name">${t.name}</div>`;
    node.onclick=()=>{
      if(node.classList.contains('locked'))return;
      selectedMapNode=i;
      document.getElementById('map-desc').textContent=t.desc;
      renderWorldMap();
    };
    container.appendChild(node);
  });
  document.getElementById('map-desc').textContent=TEMPLES[selectedMapNode].desc;
}

function renderAchievements(){
  const list=document.getElementById('achievements-list');
  list.innerHTML='';
  ACHIEVEMENTS.forEach(a=>{
    const unlocked=unlockedAchievements.includes(a.id);
    const div=document.createElement('div');
    div.className='ach-item'+(unlocked?' unlocked':'');
    div.innerHTML=`<div class="ach-icon">${a.icon}</div><div class="ach-info"><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>`;
    list.appendChild(div);
  });
}

function renderInventory(){
  const panel=document.getElementById('inventory-panel');
  let html='<div class="inv-section"><h3>Weapons</h3><div>';
  weapons.forEach((w,i)=>{
    html+=`<div class="inv-weapon${i===currentWeapon?' active':''}">${w.name} - DMG:${Math.floor(w.dmg)} ${w.melee?'':'AMMO:'+w.ammo+'/'+w.maxAmmo}</div>`;
  });
  html+='</div></div>';
  html+='<div class="inv-section"><h3>Relics ('+relicsFound.length+'/6)</h3><div>';
  TEMPLES.forEach(t=>{
    if(t.hasRelic){
      const found=relicsFound.includes(t.relicName);
      html+=`<div class="inv-relic${found?' found':''}">${t.icon} ${t.relicName} ${found?'✓':'?'}</div>`;
    }
  });
  html+='</div></div>';
  html+='<div class="inv-section"><h3>Stats</h3><div>';
  html+=`<div class="inv-item"><span class="item-name">Health</span><span class="item-val">${Math.ceil(player.hp)}/${player.maxHp}</span></div>`;
  html+=`<div class="inv-item"><span class="item-name">Armor</span><span class="item-val">${Math.ceil(player.armor)}</span></div>`;
  html+=`<div class="inv-item"><span class="item-name">Keys</span><span class="item-val">${keysHeld}</span></div>`;
  html+=`<div class="inv-item"><span class="item-name">Total Kills</span><span class="item-val">${totalKills}</span></div>`;
  html+=`<div class="inv-item"><span class="item-name">Total XP</span><span class="item-val">${totalXp}</span></div>`;
  html+=`<div class="inv-item"><span class="item-name">Total Secrets</span><span class="item-val">${totalSecrets}</span></div>`;
  html+=`<div class="inv-item"><span class="item-name">Blade Kills</span><span class="item-val">${player.bladeKills}</span></div>`;
  html+='</div></div>';
  panel.innerHTML=html;
}

function showRewardedAd(){
  state='rewarded-ad';
  let t=5;
  document.getElementById('rewarded-timer').textContent=t;
  showScreen('rewarded-ad-screen');
  const iv=setInterval(()=>{
    t--;document.getElementById('rewarded-timer').textContent=t;
    if(t<=0){
      clearInterval(iv);
      player.hp=player.maxHp;player.armor=100;
      weapons.forEach(w=>{if(w.type==='gun')w.ammo=w.maxAmmo;});
      addMessage('Supplies Refilled!',120);pickupSnd();
      state='playing';showScreen(null);
    }
  },1000);
}

// ========== LEVEL INTRO ==========
function showLevelIntro(tIdx){
  currentLevel=tIdx;
  player.templesVisited++;
  if(player.templesVisited>=6)unlockAchievement('explorer');
  const T=TEMPLES[tIdx];
  document.getElementById('level-title').textContent=T.icon+' '+T.name;
  document.getElementById('level-story').textContent=T.story;
  let objText='Find the '+T.relicName+' and reach the exit.';
  if(T.bossLevel)objText+=' WARNING: Temple Guardian boss fight!';
  document.getElementById('level-obj').textContent=objText;
  showScreen('level-intro-screen');
}

function startLevel(){
  initPlayer();
  // Restore saved HP if continuing
  generateMap(currentLevel);
  state='playing';
  showScreen(null);
  document.getElementById('hud').classList.remove('hidden');
  updateHUD();
}

// ========== INPUT ==========
document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  keys[k]=true;
  if(AC.state==='suspended')try{getAC();if(AC)try{getAC();if(AC)AC.resume();}catch(e){};}catch(e){}

  if(state==='playing'){
    if(k==='q'){
      currentWeapon=(currentWeapon+1)%weapons.length;
      snd(300,0.05,'sine',0.04);
    }
    if(k==='i'){state='inventory';renderInventory();showScreen('inventory-screen');}
    if(k==='p'||k==='escape'){state='pause';showScreen('pause-screen');}
    if(k===' '||k==='e')e.preventDefault();
  }else if(state==='inventory'){
    if(k==='i'||k==='escape'){state='playing';showScreen(null);}
  }else if(state==='pause'){
    if(k==='p'||k==='escape'){state='playing';showScreen(null);}
  }
});
// Pause screen settings button
document.getElementById('btn-settings').onclick=()=>{try{if(typeof NGN4Settings!=='undefined')NGN4Settings.show();}catch(e){}};
document.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;});
canvas.addEventListener('mousedown',e=>{mouse.down=true;if(AC.state==='suspended')try{getAC();if(AC)try{getAC();if(AC)AC.resume();}catch(e){};}catch(e){}e.preventDefault();});
canvas.addEventListener('mouseup',()=>{mouse.down=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

// ========== MENU BUTTONS ==========
document.getElementById('btn-new-game').onclick=()=>{
  templesCleared=[];relicsFound=[];totalKills=0;totalXp=0;totalCoinsEarned=0;
  totalSecrets=0;totalPuzzlesSolved=0;unlockedAchievements=[];weaponUpgrades=[0,0,0,0];keysHeld=0;
  currentLevel=0;selectedMapNode=0;
  try{localStorage.removeItem('ngn4_relichunter');}catch(e){}
  document.getElementById('btn-continue').style.display='none';
  renderWorldMap();showScreen('world-map-screen');
};
document.getElementById('btn-continue').onclick=()=>{
  if(loadGame()){
    selectedMapNode=currentLevel;
    renderWorldMap();showScreen('world-map-screen');
  }
};
document.getElementById('btn-how').onclick=()=>showScreen('how-screen');
document.getElementById('btn-achievements').onclick=()=>{renderAchievements();showScreen('achievements-screen');};
document.getElementById('btn-back-how').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-back-ach').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-enter-temple').onclick=()=>{
  if(selectedMapNode>0&&!templesCleared.includes(selectedMapNode-1)&&!templesCleared.includes(selectedMapNode)){
    addMessage('Clear the previous temple first!',90);return;
  }
  // Interstitial ad for non-first temples
  if(selectedMapNode>0&&templesCleared.length>0&&templesCleared.length%2===0){
    state='ad';let t=3;
    document.getElementById('ad-timer').textContent=t;
    showScreen('ad-screen');
    const iv=setInterval(()=>{
      t--;document.getElementById('ad-timer').textContent=t;
      if(t<=0){clearInterval(iv);showLevelIntro(selectedMapNode);}
    },1000);
  }else{
    showLevelIntro(selectedMapNode);
  }
};
document.getElementById('btn-back-map').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-start-level').onclick=()=>startLevel();
document.getElementById('btn-resume').onclick=()=>{state='playing';showScreen(null);};
document.getElementById('btn-rewarded-ad').onclick=()=>showRewardedAd();
document.getElementById('btn-quit').onclick=()=>{state='menu';saveGame();showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-close-inv').onclick=()=>{state='playing';showScreen(null);};
document.getElementById('btn-retry').onclick=()=>{showLevelIntro(currentLevel);};
document.getElementById('btn-go-menu').onclick=()=>{state='menu';showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-next-level').onclick=()=>{
  if(templesCleared.length>=6){
    // Victory!
    state='victory';
    document.getElementById('v-stats').innerHTML=
      `<p>Temples Cleared: <span>${templesCleared.length}/6</span></p>`+
      `<p>Relics Collected: <span>${relicsFound.length}/6</span></p>`+
      `<p>Total Kills: <span>${totalKills}</span></p>`+
      `<p>Total XP: <span>${totalXp}</span></p>`+
      `<p>Achievements: <span>${unlockedAchievements.length}/${ACHIEVEMENTS.length}</span></p>`;
    document.getElementById('v-coins').textContent=getCoins();
    showScreen('victory-screen');
    unlockAchievement('completionist');
    unlockAchievement('master_hunter');
    try{localStorage.removeItem('ngn4_relichunter');}catch(e){}
    document.getElementById('btn-continue').style.display='none';
  }else{
    renderWorldMap();showScreen('world-map-screen');
  }
};
document.getElementById('btn-v-menu').onclick=()=>{
  state='menu';showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();
};

// ========== TOUCH CONTROLS ==========
let touchMove={active:false,id:-1,startX:0,startY:0,curX:0,curY:0};
let touchAction=false;
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();if(AC.state==='suspended')try{getAC();if(AC)try{getAC();if(AC)AC.resume();}catch(e){};}catch(e){}
  const rect=canvas.getBoundingClientRect();
  for(const t of e.changedTouches){
    const x=t.clientX-rect.left,y=t.clientY-rect.top;
    if(x<180){// Left side = movement
      touchMove.active=true;touchMove.id=t.identifier;
      touchMove.startX=x;touchMove.startY=y;touchMove.curX=x;touchMove.curY=y;
    }else if(x>720){// Right side = action (fire + interact)
      touchAction=true;keys[' ']=true;keys['e']=true;mouse.down=true;mouse.x=x;mouse.y=y;
    }else{// Middle = aim
      mouse.x=x;mouse.y=y;
    }
  }
},{passive:false});
canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  const rect=canvas.getBoundingClientRect();
  for(const t of e.changedTouches){
    const x=t.clientX-rect.left,y=t.clientY-rect.top;
    if(t.identifier===touchMove.id){
      touchMove.curX=x;touchMove.curY=y;
      const dx=touchMove.curX-touchMove.startX,dy=touchMove.curY-touchMove.startY;
      const deadzone=15;
      keys['w']=dy<-deadzone;keys['s']=dy>deadzone;
      keys['a']=dx<-deadzone;keys['d']=dx>deadzone;
    }else{
      mouse.x=x;mouse.y=y;
    }
  }
},{passive:false});
canvas.addEventListener('touchend',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    if(t.identifier===touchMove.id){
      touchMove.active=false;keys['w']=false;keys['s']=false;keys['a']=false;keys['d']=false;
    }
  }
  if(e.touches.length===0){touchAction=false;mouse.down=false;keys[' ']=false;keys['e']=false;}
},{passive:false});

// ========== GAMEPAD ==========
let gpPrevButtons={};
function pollGamepad(){
  const gps=navigator.getGamepads?navigator.getGamepads():[];
  const gp=gps[0];
  if(!gp)return;
  const axes=gp.axes;
  // Left stick = movement
  const deadzone=0.2;
  keys['a']=axes[0]<-deadzone;keys['d']=axes[0]>deadzone;
  keys['w']=axes[1]<-deadzone;keys['s']=axes[1]>deadzone;
  // Buttons
  const btns=gp.buttons;
  // A (0) = shoot/interact
  if(btns[0]&&btns[0].pressed&&!gpPrevButtons[0]){keys[' ']=true;keys['e']=true;}
  else if(!btns[0]||!btns[0].pressed){keys[' ']=false;keys['e']=false;}
  // X (2) = weapon cycle
  if(btns[2]&&btns[2].pressed&&!gpPrevButtons[2]){currentWeapon=(currentWeapon+1)%weapons.length;snd(300,0.05,'sine',0.04);}
  // Y (3) = crouch
  if(btns[3])keys['c']=true;else keys['c']=false;
  // B (1) = dodge (just crouch briefly)
  if(btns[1]&&btns[1].pressed&&!gpPrevButtons[1]){keys['c']=true;setTimeout(()=>{keys['c']=false;},300);}
  // Start (9) = pause
  if(btns[9]&&btns[9].pressed&&!gpPrevButtons[9]){
    if(state==='playing'){state='pause';showScreen('pause-screen');}
    else if(state==='pause'){state='playing';showScreen(null);}
  }
  // Save prev state
  gpPrevButtons={};
  btns.forEach((b,i)=>{gpPrevButtons[i]=b&&b.pressed;});
}

// ========== GAME LOOP ==========
function gameLoop(){
  pollGamepad();
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// ========== INIT ==========
if(hasSavedGame()){
  loadGame();
  document.getElementById('btn-continue').style.display='inline-block';
}
document.getElementById('menu-coins').textContent=getCoins();
gameLoop();

})();
