// BIOHAZARD OUTBREAK - NGN4 Game #44 - Survival Horror
(function(){
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('biohazard-outbreak'); } catch(e) {}

const C=document.getElementById('gameCanvas'),X=C.getContext('2d');
C.width=900;C.height=700;

// ===== AUDIO ENGINE =====
let AC=null;function getAC(){if(!AC)try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}return AC;}
function snd(f,d,t='square',v=0.05){try{const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d);}catch(e){}}
function sfx(name){
  if(AC.state==='suspended')try{getAC();if(AC)try{getAC();if(AC)AC.resume();}catch(e){};}catch(e){}
  switch(name){
    case'handgun':snd(300,0.08,'square',0.06);snd(150,0.12,'sawtooth',0.04);break;
    case'shotgun':snd(80,0.2,'sawtooth',0.1);snd(60,0.3,'square',0.06);break;
    case'magnum':snd(200,0.15,'square',0.08);snd(100,0.25,'sawtooth',0.06);break;
    case'knife':snd(800+Math.random()*400,0.05,'sawtooth',0.03);break;
    case'zombie_groan':snd(60+Math.random()*30,0.3,'sawtooth',0.03);break;
    case'zombie_hit':snd(120,0.1,'square',0.04);snd(80,0.15,'sawtooth',0.03);break;
    case'zombie_die':snd(200,0.15,'sawtooth',0.05);snd(80,0.3,'square',0.03);break;
    case'licker':snd(500+Math.random()*300,0.1,'sawtooth',0.04);break;
    case'hunter':snd(150,0.2,'sawtooth',0.06);snd(100,0.15,'square',0.04);break;
    case'tyrant':snd(40,0.4,'sawtooth',0.1);snd(60,0.3,'square',0.08);break;
    case'chimera':snd(30,0.5,'sawtooth',0.12);snd(80,0.3,'square',0.08);snd(50,0.4,'triangle',0.06);break;
    case'player_hit':snd(200,0.15,'sawtooth',0.08);snd(100,0.2,'square',0.05);break;
    case'player_die':snd(300,0.3,'sawtooth',0.1);snd(100,0.5,'square',0.06);snd(50,0.8,'triangle',0.04);break;
    case'footstep':snd(100+Math.random()*50,0.04,'square',0.015);break;
    case'door':snd(80,0.3,'sawtooth',0.04);snd(120,0.2,'square',0.03);break;
    case'pickup':snd(600,0.08,'sine',0.06);setTimeout(()=>snd(900,0.08,'sine',0.06),80);break;
    case'keycard':snd(500,0.1,'sine',0.06);setTimeout(()=>snd(700,0.1,'sine',0.06),100);setTimeout(()=>snd(1000,0.12,'sine',0.06),200);break;
    case'save':snd(400,0.15,'sine',0.05);setTimeout(()=>snd(600,0.15,'sine',0.05),200);setTimeout(()=>snd(800,0.2,'sine',0.05),400);break;
    case'puzzle_solve':snd(500,0.1,'sine',0.06);setTimeout(()=>snd(700,0.1,'sine',0.06),150);setTimeout(()=>snd(900,0.15,'sine',0.06),300);break;
    case'heal':snd(400,0.15,'sine',0.05);setTimeout(()=>snd(600,0.2,'sine',0.05),200);break;
    case'combine':snd(500,0.08,'sine',0.06);snd(700,0.08,'sine',0.06);break;
    case'ambience':snd(40+Math.random()*20,2,'sawtooth',0.008);break;
    case'alert':snd(800,0.05,'square',0.06);setTimeout(()=>snd(600,0.05,'square',0.06),100);break;
    case'explosion':snd(40,0.5,'sawtooth',0.12);snd(60,0.4,'square',0.08);break;
    case'boss_hit':snd(60,0.15,'sawtooth',0.06);snd(40,0.2,'square',0.04);break;
    default:snd(440,0.1,'sine',0.03);
  }
}

// Ambient horror loop
let ambTimer=0;
function ambientLoop(){if(state==='playing'){ambTimer++;if(ambTimer%180===0)sfx('ambience');if(ambTimer%300===0&&Math.random()<0.3)sfx('zombie_groan');}}

// ===== COIN SYSTEM =====
function getCoins(){try{const d=JSON.parse(localStorage.getItem('ngn4_rewards')||'{}');return d.coins||0;}catch(e){return 0;}}
function saveCoins(c){try{const d=JSON.parse(localStorage.getItem('ngn4_rewards')||'{}');d.coins=c;localStorage.setItem('ngn4_rewards',JSON.stringify(d));}catch(e){}}
function earnCoins(n){saveCoins(getCoins()+n);}

// ===== SCREEN MANAGEMENT =====
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));if(id)document.getElementById(id).classList.add('active');}
function showEl(id){document.getElementById(id).classList.remove('hidden');}
function hideEl(id){document.getElementById(id).classList.add('hidden');}

// ===== GAME STATE =====
let state='menu'; // menu,difficulty,playing,paused,inventory,gameover,chapter_complete,ending,doc_reading,ad,rewarded_ad
let difficulty='normal';
let difficultyMult={easy:{hp:1.5,dmg:0.6,ammo:1.5,enemyHp:0.7,saves:true},normal:{hp:1,dmg:1,ammo:1,enemyHp:1,saves:true},hard:{hp:0.8,dmg:1.3,ammo:0.7,enemyHp:1.3,saves:true},nightmare:{hp:0.5,dmg:2,ammo:0.4,enemyHp:2,saves:false}};

// Player
let P={x:450,y:350,angle:0,speed:2.2,hp:100,maxHp:100,poison:0,invuln:0,
  weapon:0,fireTimer:0,footTimer:0,xp:0,level:1,kills:0,
  documentsFound:0,playTime:0,chStart:0,
  survivorsSaved:0,antidote:false,allDocuments:false,knifeOnly:false,
  dmgTaken:0,chKills:0,chDmg:0,chDocs:0,knifeKills:0,saveCount:0};

// Weapons: [handgun, shotgun, magnum, knife]
let weapons=[
  {name:'HANDGUN',ammo:15,maxAmmo:15,reserve:60,dmg:12,rate:12,spread:0.04,color:'#ff0',speed:14,range:400},
  {name:'SHOTGUN',ammo:0,maxAmmo:6,reserve:0,dmg:8,rate:25,spread:0.2,color:'#f80',speed:11,range:200,pellets:5},
  {name:'MAGNUM',ammo:0,maxAmmo:6,reserve:0,dmg:45,rate:30,spread:0.02,color:'#f0f',speed:16,range:500},
  {name:'KNIFE',ammo:999,maxAmmo:999,reserve:999,dmg:8,rate:8,spread:0,color:'#ccc',speed:0,range:35,melee:true}
];

// Inventory (6 slots)
let inventory=new Array(6).fill(null);
let invSelected=-1;
let combineMode=false;
let combineFirst=-1;

// Item box storage
let itemBox=[];

// ===== ITEMS =====
const ITEMS={
  green_herb:{name:'Green Herb',desc:'Restores 25 HP.',icon:'🌿',type:'heal',value:25,stack:false},
  red_herb:{name:'Red Herb',desc:'Restores full HP when combined.',icon:'🔴',type:'herb',value:100,stack:false},
  blue_herb:{name:'Blue Herb',desc:'Cures poison.',icon:'🔵',type:'cure',value:0,stack:false},
  herb_mix:{name:'Mixed Herbs',desc:'Restores 50 HP.',icon:'💊',type:'heal',value:50,stack:false},
  first_aid:{name:'First Aid Spray',desc:'Restores full HP.',icon:'🧴',type:'heal',value:999,stack:false},
  handgun_ammo:{name:'Handgun Ammo',desc:'15 rounds.',icon:'🔫',type:'ammo',weapon:0,value:15,stack:true},
  shotgun_ammo:{name:'Shotgun Shells',desc:'6 shells.',icon:'🫳',type:'ammo',weapon:1,value:6,stack:true},
  magnum_ammo:{name:'Magnum Rounds',desc:'6 rounds.',icon:'💎',type:'ammo',weapon:2,value:6,stack:true},
  keycard_lv1:{name:'Level 1 Keycard',desc:'Opens security doors.',icon:'🪪',type:'key',level:1,stack:false},
  keycard_lv2:{name:'Level 2 Keycard',desc:'Opens research doors.',icon:'🪪',type:'key',level:2,stack:false},
  keycard_lv3:{name:'Level 3 Keycard',desc:'Opens executive doors.',icon:'🪪',type:'key',level:3,stack:false},
  master_key:{name:'Master Key',desc:'Opens all doors.',icon:'🗝️',type:'key',level:99,stack:false},
  fuse:{name:'Fuse',desc:'Circuit fuse for power systems.',icon:'🔌',type:'puzzle',stack:false},
  circuit_board:{name:'Circuit Board',desc:'For security terminal.',icon:'💾',type:'puzzle',stack:false},
  chemical_a:{name:'Chemical A',desc:'Red reactive agent.',icon:'🧪',type:'puzzle',stack:false},
  chemical_b:{name:'Chemical B',desc:'Blue reactive agent.',icon:'🧪',type:'puzzle',stack:false},
  chemical_c:{name:'Chemical C',desc:'Green stabilizer.',icon:'🧪',type:'puzzle',stack:false},
  antidote_formula:{name:'Antidote Formula',desc:'CHIMERA cure research notes.',icon:'📋',type:'quest',stack:false},
  antivirus_sample:{name:'Antivirus Sample',desc:'Purified CHIMERA antidote.',icon:'💉',type:'quest',stack:false},
  valve_handle:{name:'Valve Handle',desc:'Controls water flow.',icon:'🔧',type:'puzzle',stack:false},
  crank:{name:'Crank',desc:'Opens mechanical doors.',icon:'⚙️',type:'puzzle',stack:false},
  document:{name:'Document',desc:'A research file.',icon:'📄',type:'doc',stack:false}
};

function addItem(itemId){
  // Stack ammo
  const def=ITEMS[itemId];
  if(!def)return;
  if(def.stack){
    // Check existing
    for(let i=0;i<6;i++){
      if(inventory[i]&&inventory[i].id===itemId){
        if(def.type==='ammo'){
          weapons[def.weapon].reserve+=def.value;
        }
        sfx('pickup');
        return true;
      }
    }
  }
  // Find empty slot
  for(let i=0;i<6;i++){
    if(!inventory[i]){
      inventory[i]={id:itemId,...def};
      if(def.type==='ammo')weapons[def.weapon].reserve+=def.value;
      sfx('pickup');
      return true;
    }
  }
  return false; // Full
}

function removeItem(slot){
  const item=inventory[slot];
  if(item){
    inventory[slot]=null;
    return item;
  }
  return null;
}

function hasItem(itemId){
  return inventory.some(i=>i&&i.id===itemId);
}

function useItem(slot){
  const item=inventory[slot];
  if(!item)return;
  switch(item.type){
    case'heal':
      P.hp=Math.min(P.maxHp,P.hp+item.value);
      sfx('heal');removeItem(slot);break;
    case'cure':
      P.poison=0;sfx('heal');removeItem(slot);break;
    default:break;
  }
}

function combineItems(slot1,slot2){
  const a=inventory[slot1],b=inventory[slot2];
  if(!a||!b)return false;
  // Herb + Herb = Mix
  const herbs=['green_herb','red_herb','blue_herb'];
  if(herbs.includes(a.id)&&herbs.includes(b.id)){
    removeItem(slot1);removeItem(slot2);
    if((a.id==='green_herb'&&b.id==='red_herb')||(a.id==='red_herb'&&b.id==='green_herb')){
      addItem('herb_mix');addItem('herb_mix');sfx('combine');return true;
    }
    if((a.id==='green_herb'&&b.id==='blue_herb')||(a.id==='blue_herb'&&b.id==='green_herb')){
      // Blue+Green makes antidote
      inventory[slot1]={id:'herb_mix',...ITEMS.herb_mix};sfx('combine');return true;
    }
    addItem('herb_mix');sfx('combine');return true;
  }
  // Chemical A + B = formula progress
  if((a.id==='chemical_a'&&b.id==='chemical_b')||(a.id==='chemical_b'&&b.id==='chemical_a')){
    removeItem(slot1);removeItem(slot2);addItem('antidote_formula');sfx('combine');return true;
  }
  // Formula + C = antivirus
  if((a.id==='antidote_formula'&&b.id==='chemical_c')||(a.id==='chemical_c'&&b.id==='antidote_formula')){
    removeItem(slot1);removeItem(slot2);addItem('antivirus_sample');sfx('combine');return true;
  }
  return false;
}

// ===== CHAPTERS & MAPS =====
let currentChapter=0;
let currentRoom=0;
let roomTransition=null; // {timer, targetRoom}
let mapData={}; // Current chapter map

// Tile types: 0=floor, 1=wall, 2=door, 3=locked_door, 4=save_room_door, 5=exit
// Interactables on map
let interactables=[];
let enemies=[];
let bullets=[];
let particles=[];
let pickups=[];
let bloodStains=[];
let projectiles=[];
let documents=[];
let saveRooms={};

// 5 Chapters, each with multiple rooms
const CHAPTERS=[
  {name:'GROUND FLOOR',rooms:['Main Lobby','Corridor A','Security Office','Storage Room','East Wing','Save Room 1F'],objectives:['Explore the main lobby','Find the security office','Obtain the Level 1 Keycard','Unlock the east wing']},
  {name:'RESEARCH LABS',rooms:['Lab Entrance','Chemical Storage','Lab Alpha','Lab Beta','Server Room','Save Room Lab'],objectives:['Search the chemical storage','Find Chemical A and B','Mix the antidote formula','Access the server room']},
  {name:'BASEMENT',rooms:['Stairwell','Basement Hall','Flooded Chamber','Generator Room','Utility Tunnel','Save Room B1'],objectives:['Find the valve handle','Drain the flooded chamber','Restore power to the elevator','Reach the executive level']},
  {name:'EXECUTIVE LEVEL',rooms:['Elevator Hall','Executive Corridor','Board Room','Dr. Mercer Office','Security Hub','Save Room Exec'],objectives:['Hack the security terminal','Find Dr. Mercers files','Obtain the Level 3 Keycard','Reach the BSL-4 lab']},
  {name:'BSL-4 LAB',rooms:['Airlock','Containment Hall','Specimen Chamber','Control Room','The Pit','Final Chamber'],objectives:['Navigate the containment hall','Find the antivirus sample','Defeat the Tyrant','Face the Chimera','Choose your ending']}
];

// Hand-crafted room maps (15x11 grid, each tile=60px -> 900x660)
function buildRoom(chapter,room){
  const W=15,H=11,S=60;
  let tiles=[],interacts=[],ens=[],picks=[],docs=[];
  // Default: all walls
  for(let y=0;y<H;y++){tiles[y]=[];for(let x=0;x<W;x++)tiles[y][x]=1;}
  
  if(chapter===0){
    if(room===0){ // Main Lobby
      for(let y=2;y<9;y++)for(let x=2;x<13;x++)tiles[y][x]=0;
      tiles[2][4]=2;tiles[2][10]=2; // Doors
      picks.push({x:4*S+S/2,y:5*S+S/2,id:'green_herb'});
      picks.push({x:9*S+S/2,y:7*S+S/2,id:'handgun_ammo'});
      ens.push({x:7*S,y:6*S,type:'zombie',hp:30*difficultyMult[difficulty].enemyHp,awake:false});
      ens.push({x:10*S,y:4*S,type:'zombie',hp:30*difficultyMult[difficulty].enemyHp,awake:false});
      docs.push({x:3*S+S/2,y:3*S+S/2,title:'Emergency Protocol',body:'All personnel must evacuate immediately. The containment failure in Sub-Level B4 is critical. This is not a drill. — Director Hale'});
    }else if(room===1){ // Corridor A
      for(let y=0;y<H;y++){tiles[y][2]=0;tiles[y][12]=0;}
      for(let x=3;x<12;x++){tiles[2][x]=0;tiles[8][x]=0;}
      tiles[2][2]=0;tiles[2][12]=0;
      ens.push({x:5*S,y:3*S,type:'zombie',hp:30*difficultyMult[difficulty].enemyHp,awake:false});
      ens.push({x:9*S,y:7*S,type:'zombie',hp:30*difficultyMult[difficulty].enemyHp,awake:true});
      picks.push({x:7*S,y:5*S,id:'green_herb'});
    }else if(room===2){ // Security Office
      for(let y=2;y<9;y++)for(let x=3;x<12;x++)tiles[y][x]=0;
      tiles[2][7]=2;
      interacts.push({x:8*S,y:4*S,type:'keycard',item:'keycard_lv1',msg:'Found Level 1 Keycard!'});
      picks.push({x:4*S,y:7*S,id:'handgun_ammo'});
      docs.push({x:5*S,y:3*S,title:'Security Log',body:"Day 14: The creatures are getting more aggressive. Dr. Mercer insists on continuing experiments. I've hidden the emergency keycard in my desk. If anyone finds this, get out. — Security Chief Torres"});
    }else if(room===3){ // Storage Room
      for(let y=2;y<9;y++)for(let x=2;x<8;x++)tiles[y][x]=0;
      tiles[2][5]=3; // Locked door (needs keycard lv1)
      picks.push({x:3*S,y:4*S,id:'green_herb'});
      picks.push({x:6*S,y:6*S,id:'handgun_ammo'});
      ens.push({x:5*S,y:5*S,type:'zombie',hp:30*difficultyMult[difficulty].enemyHp,awake:false});
      interacts.push({x:4*S,y:3*S,type:'item_box',msg:'Item Box'});
    }else if(room===4){ // East Wing
      for(let y=2;y<9;y++)for(let x=2;x<13;x++)tiles[y][x]=0;
      tiles[8][7]=5; // Exit to next chapter
      ens.push({x:4*S,y:4*S,type:'zombie',hp:30*difficultyMult[difficulty].enemyHp,awake:true});
      ens.push({x:8*S,y:6*S,type:'zombie',hp:30*difficultyMult[difficulty].enemyHp,awake:false});
      ens.push({x:10*S,y:5*S,type:'zombie',hp:35*difficultyMult[difficulty].enemyHp,awake:true});
      picks.push({x:6*S,y:3*S,id:'shotgun_ammo'});
      interacts.push({x:11*S,y:8*S,type:'chapter_exit',msg:'Proceed to Research Labs?'});
    }else if(room===5){ // Save Room
      for(let y=3;y<8;y++)for(let x=3;x<8;x++)tiles[y][x]=0;
      tiles[3][5]=2;
      interacts.push({x:5*S,y:5*S,type:'typewriter',msg:'Save progress?'});
      interacts.push({x:4*S,y:4*S,type:'item_box',msg:'Item Box'});
      picks.push({x:6*S,y:6*S,id:'green_herb'});
    }
  }else if(chapter===1){
    if(room===0){ // Lab Entrance
      for(let y=2;y<9;y++)for(let x=2;x<13;x++)tiles[y][x]=0;
      tiles[2][3]=2;tiles[2][11]=2;
      ens.push({x:5*S,y:5*S,type:'zombie',hp:35*difficultyMult[difficulty].enemyHp,awake:true});
      ens.push({x:9*S,y:4*S,type:'licker',hp:50*difficultyMult[difficulty].enemyHp,awake:false,ceiling:true});
      picks.push({x:7*S,y:7*S,id:'handgun_ammo'});
    }else if(room===1){ // Chemical Storage
      for(let y=2;y<9;y++)for(let x=2;x<10;x++)tiles[y][x]=0;
      tiles[2][6]=2;
      interacts.push({x:3*S,y:4*S,type:'pickup_item',item:'chemical_a',msg:'Found Chemical A!'});
      interacts.push({x:7*S,y:6*S,type:'pickup_item',item:'chemical_b',msg:'Found Chemical B!'});
      docs.push({x:5*S,y:3*S,title:'Research Notes - Dr. Chen',body:"Chemical A (red agent) combined with Chemical B (blue catalyst) produces the base formula. We need Chemical C from the basement to stabilize it. If Mercer finds out I'm making an antidote..."});
      ens.push({x:6*S,y:5*S,type:'zombie',hp:35*difficultyMult[difficulty].enemyHp,awake:false});
    }else if(room===2){ // Lab Alpha
      for(let y=1;y<10;y++)for(let x=2;x<13;x++)tiles[y][x]=0;
      tiles[1][7]=2;tiles[5][6]=1;tiles[5][7]=1;tiles[5][8]=1;
      ens.push({x:4*S,y:3*S,type:'zombie',hp:40*difficultyMult[difficulty].enemyHp,awake:true});
      ens.push({x:10*S,y:7*S,type:'licker',hp:55*difficultyMult[difficulty].enemyHp,awake:true,ceiling:true});
      ens.push({x:8*S,y:2*S,type:'zombie',hp:35*difficultyMult[difficulty].enemyHp,awake:false});
      picks.push({x:3*S,y:8*S,id:'green_herb'});
      picks.push({x:11*S,y:3*S,id:'blue_herb'});
      interacts.push({x:6*S,y:4*S,type:'combine_station',msg:'Combine chemicals here?'});
    }else if(room===3){ // Lab Beta
      for(let y=2;y<9;y++)for(let x=2;x<10;x++)tiles[y][x]=0;
      tiles[2][6]=2;
      ens.push({x:5*S,y:4*S,type:'hunter',hp:80*difficultyMult[difficulty].enemyHp,awake:false});
      picks.push({x:4*S,y:7*S,id:'shotgun_ammo'});
      docs.push({x:7*S,y:3*S,title:'Project CHIMERA - Overview',body:'CHIMERA is a bio-organic weapon designed to create the ultimate soldier. Test subjects exhibit increased aggression, cellular regeneration, and... unexpected mutations. Phase 3 trials have exceeded all projections. — Dr. Mercer'});
    }else if(room===4){ // Server Room
      for(let y=2;y<9;y++)for(let x=3;x<12;x++)tiles[y][x]=0;
      tiles[2][7]=2;tiles[8][7]=5;
      interacts.push({x:7*S,y:4*S,type:'terminal',msg:'Download research data?',puzzle:'hack'});
      picks.push({x:5*S,y:6*S,id:'magnum_ammo'});
      docs.push({x:9*S,y:3*S,title:'Encrypted Email',body:"To: Board of Directors. The BSL-4 lab is ready. Phase 4 begins tomorrow. We have enough CHIMERA specimens for full deployment. The military contract is secure. This will be Meridian's crowning achievement. — CEO Blackwood"});
      ens.push({x:10*S,y:5*S,type:'hunter',hp:80*difficultyMult[difficulty].enemyHp,awake:true});
    }else if(room===5){ // Save Room Lab
      for(let y=3;y<8;y++)for(let x=3;x<8;x++)tiles[y][x]=0;
      tiles[3][5]=2;
      interacts.push({x:5*S,y:5*S,type:'typewriter',msg:'Save progress?'});
      interacts.push({x:4*S,y:4*S,type:'item_box',msg:'Item Box'});
      picks.push({x:6*S,y:6*S,id:'first_aid'});
    }
  }else if(chapter===2){
    if(room===0){ // Stairwell
      for(let y=0;y<H;y++){tiles[y][7]=0;tiles[y][8]=0;}
      for(let x=3;x<12;x++){tiles[4][x]=0;tiles[6][x]=0;}
      tiles[0][7]=2;
      ens.push({x:7*S,y:3*S,type:'zombie',hp:40*difficultyMult[difficulty].enemyHp,awake:true});
      ens.push({x:8*S,y:8*S,type:'crawler',hp:30*difficultyMult[difficulty].enemyHp,awake:false});
      picks.push({x:5*S,y:5*S,id:'green_herb'});
    }else if(room===1){ // Basement Hall
      for(let y=2;y<9;y++)for(let x=2;x<13;x++)tiles[y][x]=0;
      tiles[2][3]=2;tiles[2][11]=2;
      for(let x=4;x<10;x++){tiles[5][x]=1;tiles[6][x]=1;} // Central wall
      ens.push({x:3*S,y:4*S,type:'crawler',hp:30*difficultyMult[difficulty].enemyHp,awake:false});
      ens.push({x:11*S,y:7*S,type:'crawler',hp:35*difficultyMult[difficulty].enemyHp,awake:true});
      picks.push({x:5*S,y:3*S,id:'handgun_ammo'});
      picks.push({x:10*S,y:4*S,id:'green_herb'});
    }else if(room===2){ // Flooded Chamber
      for(let y=2;y<9;y++)for(let x=2;x<13;x++)tiles[y][x]=0;
      tiles[2][7]=2;tiles[5][7]=1; // Blocked
      interacts.push({x:7*S,y:4*S,type:'valve',msg:'Turn the valve to drain water?',needs:'valve_handle'});
      docs.push({x:3*S,y:3*S,title:'Maintenance Log',body:'The flood in Chamber B3 was caused by the valve failure during the containment breach. Someone removed the valve handle. Probably one of Mercers people. They did not want anyone accessing the generator.'});
      ens.push({x:10*S,y:6*S,type:'zombie',hp:40*difficultyMult[difficulty].enemyHp,awake:false});
    }else if(room===3){ // Generator Room
      for(let y=2;y<9;y++)for(let x=3;x<12;x++)tiles[y][x]=0;
      tiles[2][7]=2;tiles[8][7]=5;
      interacts.push({x:7*S,y:5*S,type:'fuse_box',msg:'Install fuse?',needs:'fuse'});
      picks.push({x:4*S,y:4*S,id:'fuse'});
      picks.push({x:9*S,y:7*S,id:'shotgun_ammo'});
      ens.push({x:5*S,y:6*S,type:'hunter',hp:90*difficultyMult[difficulty].enemyHp,awake:true});
      docs.push({x:8*S,y:3*S,title:'Generator Manual',body:'To restore power: 1) Install backup fuse. 2) Activate main breaker. The elevator requires full power. Warning: Do NOT activate emergency lighting — it attracts THEM.'});
    }else if(room===4){ // Utility Tunnel
      for(let y=3;y<8;y++)for(let x=1;x<14;x++)tiles[y][x]=0;
      tiles[3][1]=2;tiles[7][13]=2;
      ens.push({x:3*S,y:5*S,type:'crawler',hp:35*difficultyMult[difficulty].enemyHp,awake:true});
      ens.push({x:7*S,y:5*S,type:'crawler',hp:35*difficultyMult[difficulty].enemyHp,awake:false});
      ens.push({x:11*S,y:6*S,type:'zombie',hp:40*difficultyMult[difficulty].enemyHp,awake:true});
      picks.push({x:5*S,y:4*S,id:'green_herb'});
    }else if(room===5){ // Save Room B1
      for(let y=3;y<8;y++)for(let x=3;x<8;x++)tiles[y][x]=0;
      tiles[3][5]=2;
      interacts.push({x:5*S,y:5*S,type:'typewriter',msg:'Save progress?'});
      interacts.push({x:4*S,y:4*S,type:'item_box',msg:'Item Box'});
      picks.push({x:6*S,y:6*S,id:'blue_herb'});
    }
  }else if(chapter===3){
    if(room===0){ // Elevator Hall
      for(let y=2;y<9;y++)for(let x=3;x<12;x++)tiles[y][x]=0;
      tiles[2][7]=2;tiles[8][7]=1; // elevator blocked until powered
      interacts.push({x:7*S,y:7*S,type:'elevator',msg:'Elevator requires power.',needs:'power_on'});
      ens.push({x:5*S,y:4*S,type:'hunter',hp:100*difficultyMult[difficulty].enemyHp,awake:true});
      picks.push({x:9*S,y:6*S,id:'handgun_ammo'});
    }else if(room===1){ // Executive Corridor
      for(let y=2;y<9;y++)for(let x=2;x<13;x++)tiles[y][x]=0;
      tiles[2][3]=2;tiles[2][11]=2;
      for(let y=4;y<7;y++)for(let x=6;x<9;x++)tiles[y][x]=1;
      ens.push({x:4*S,y:4*S,type:'hunter',hp:100*difficultyMult[difficulty].enemyHp,awake:false});
      ens.push({x:10*S,y:7*S,type:'hunter',hp:100*difficultyMult[difficulty].enemyHp,awake:true});
      ens.push({x:8*S,y:3*S,type:'zombie',hp:50*difficultyMult[difficulty].enemyHp,awake:false});
      picks.push({x:5*S,y:8*S,id:'green_herb'});
      picks.push({x:11*S,y:3*S,id:'magnum_ammo'});
    }else if(room===2){ // Board Room
      for(let y=3;y<8;y++)for(let x=3;x<12;x++)tiles[y][x]=0;
      tiles[3][7]=2;
      docs.push({x:5*S,y:4*S,title:'Board Meeting Minutes',body:'CLASSIFIED. Project CHIMERA has been approved for military deployment. Meridian Corp will receive $4.2 billion. Test subjects from... [redacted]. Dr. Mercer promoted to Head of Special Projects. Any leak will be dealt with severely.'});
      ens.push({x:9*S,y:6*S,type:'hunter',hp:110*difficultyMult[difficulty].enemyHp,awake:false});
      picks.push({x:7*S,y:5*S,id:'first_aid'});
    }else if(room===3){ // Dr. Mercer Office
      for(let y=2;y<9;y++)for(let x=2;x<10;x++)tiles[y][x]=0;
      tiles[2][6]=2;
      interacts.push({x:5*S,y:4*S,type:'pickup_item',item:'keycard_lv3',msg:'Found Level 3 Keycard!'});
      docs.push({x:3*S,y:7*S,title:'Dr. Mercer - Personal Journal',body:"Day 45: They're beautiful. My CHIMERA specimens have exceeded every expectation. The board doesn't understand — this isn't just a weapon. It's evolution. Day 52: The escape was... unfortunate. But it proves they're ready. If only the others could see what I see."});
      docs.push({x:7*S,y:3*S,title:'Mercer - Final Entry',body:"I've hidden the master key in the control room. If Kira Reeves has made it this far... she deserves the truth. The antivirus sample is in containment. Use it wisely. Not everyone can be saved. — Mercer"});
      picks.push({x:8*S,y:6*S,id:'shotgun_ammo'});
    }else if(room===4){ // Security Hub
      for(let y=2;y<9;y++)for(let x=3;x<12;x++)tiles[y][x]=0;
      tiles[2][7]=2;tiles[8][7]=5;
      interacts.push({x:7*S,y:4*S,type:'terminal',msg:'Hack security terminal?',puzzle:'hack'});
      interacts.push({x:5*S,y:6*S,type:'pickup_item',item:'circuit_board',msg:'Found Circuit Board!'});
      ens.push({x:4*S,y:5*S,type:'hunter',hp:120*difficultyMult[difficulty].enemyHp,awake:true});
      ens.push({x:10*S,y:4*S,type:'hunter',hp:120*difficultyMult[difficulty].enemyHp,awake:true});
      picks.push({x:9*S,y:7*S,id:'green_herb'});
    }else if(room===5){ // Save Room Exec
      for(let y=3;y<8;y++)for(let x=3;x<8;x++)tiles[y][x]=0;
      tiles[3][5]=2;
      interacts.push({x:5*S,y:5*S,type:'typewriter',msg:'Save progress?'});
      interacts.push({x:4*S,y:4*S,type:'item_box',msg:'Item Box'});
      picks.push({x:6*S,y:6*S,id:'first_aid'});
    }
  }else if(chapter===4){
    if(room===0){ // Airlock
      for(let y=2;y<9;y++)for(let x=3;x<8;x++)tiles[y][x]=0;
      tiles[2][5]=2;tiles[8][5]=1; // Needs circuit board
      interacts.push({x:5*S,y:7*S,type:'airlock',msg:'Install circuit board?',needs:'circuit_board'});
      docs.push({x:4*S,y:3*S,title:'BSL-4 Protocols',body:'Bio-Safety Level 4. Maximum containment. All personnel must wear positive-pressure suits. In case of breach: Seal airlock, activate incineration protocol, EVACUATE. There is no scenario where re-entry is authorized after seal.'});
    }else if(room===1){ // Containment Hall
      for(let y=1;y<10;y++)for(let x=2;x<13;x++)tiles[y][x]=0;
      tiles[1][7]=2;tiles[9][7]=1;
      for(let y=3;y<7;y++){tiles[y][5]=1;tiles[y][9]=1;}
      ens.push({x:4*S,y:2*S,type:'zombie',hp:50*difficultyMult[difficulty].enemyHp,awake:true});
      ens.push({x:10*S,y:8*S,type:'licker',hp:70*difficultyMult[difficulty].enemyHp,awake:true,ceiling:true});
      ens.push({x:7*S,y:5*S,type:'hunter',hp:130*difficultyMult[difficulty].enemyHp,awake:true});
      picks.push({x:3*S,y:8*S,id:'green_herb'});
      picks.push({x:11*S,y:2*S,id:'magnum_ammo'});
    }else if(room===2){ // Specimen Chamber
      for(let y=2;y<9;y++)for(let x=2;x<13;x++)tiles[y][x]=0;
      tiles[2][7]=2;
      interacts.push({x:7*S,y:5*S,type:'specimen_tank',msg:'The antivirus sample!',needs:'antidote_formula'});
      ens.push({x:4*S,y:4*S,type:'zombie',hp:50*difficultyMult[difficulty].enemyHp,awake:true});
      ens.push({x:10*S,y:6*S,type:'hunter',hp:130*difficultyMult[difficulty].enemyHp,awake:false});
      docs.push({x:5*S,y:3*S,title:'Specimen Report',body:'CHIMERA Prime - The original specimen. It has grown beyond our containment measures. Its cells replicate at 300x normal rate. It has consumed 14 test subjects. Recommend immediate destruction. Request DENIED by CEO Blackwood.'});
    }else if(room===3){ // Control Room
      for(let y=2;y<9;y++)for(let x=2;x<10;x++)tiles[y][x]=0;
      tiles[2][6]=2;
      interacts.push({x:4*S,y:5*S,type:'pickup_item',item:'master_key',msg:'Found Master Key!'});
      interacts.push({x:7*S,y:4*S,type:'terminal',msg:'Activate self-destruct sequence?',puzzle:'final_choice'});
      docs.push({x:3*S,y:7*S,title:'The Truth',body:"Project CHIMERA was never meant to be a weapon. It was a cure — for immortality. Blackwood is dying. He funded everything to extend his own life. The mutations were side effects. Everyone in this facility was a test subject. I'm sorry. — Dr. Mercer's final log"});
      ens.push({x:5*S,y:3*S,type:'hunter',hp:140*difficultyMult[difficulty].enemyHp,awake:true});
    }else if(room===4){ // The Pit
      for(let y=1;y<10;y++)for(let x=1;x<14;x++)tiles[y][x]=0;
      tiles[1][7]=2;tiles[9][7]=2;
      // Tyrant encounter
      ens.push({x:7*S,y:3*S,type:'tyrant',hp:300*difficultyMult[difficulty].enemyHp,awake:true,boss:true});
      picks.push({x:3*S,y:5*S,id:'first_aid'});
      picks.push({x:11*S,y:5*S,id:'shotgun_ammo'});
      picks.push({x:7*S,y:8*S,id:'magnum_ammo'});
    }else if(room===5){ // Final Chamber
      for(let y=1;y<10;y++)for(let x=1;x<14;x++)tiles[y][x]=0;
      tiles[1][7]=2;
      // Chimera final boss
      ens.push({x:7*S,y:4*S,type:'chimera',hp:500*difficultyMult[difficulty].enemyHp,awake:true,boss:true});
      picks.push({x:3*S,y:8*S,id:'first_aid'});
      picks.push({x:11*S,y:2*S,id:'green_herb'});
      interacts.push({x:7*S,y:8*S,type:'escape_helicopter',msg:'Escape via emergency exit?'});
    }
  }
  
  return{tiles,W,H,S,interactables:interacts,enemies:ens,pickups:picks,documents:docs};
}

// ===== ENEMY TYPES =====
const ENEMY_TYPES={
  zombie:{name:'Zombie',hp:30,speed:0.8,dmg:8,size:12,color:'#5a5',xp:15,
    draw:function(e){
      X.fillStyle=e.color;
      X.save();X.translate(e.x,e.y);X.rotate(e.angle);
      X.fillRect(-e.size,-e.size*0.6,e.size*2,e.size*1.2);
      X.fillRect(e.size-4,-e.size-2,5,e.size*0.6);
      X.fillRect(e.size-4,e.size*0.4,5,e.size*0.6);
      // Head
      X.fillStyle='#6a6';X.beginPath();X.arc(0,-e.size-4,7,0,Math.PI*2);X.fill();
      X.restore();
    }},
  licker:{name:'Licker',hp:50,speed:1.8,dmg:15,size:14,color:'#a5a',xp:30,ceiling:true,
    draw:function(e){
      X.save();X.translate(e.x,e.y);X.rotate(e.angle);
      X.fillStyle=e.color;
      X.beginPath();X.ellipse(0,0,e.size,e.size*0.7,0,0,Math.PI*2);X.fill();
      // Tongue
      X.strokeStyle='#f88';X.lineWidth=2;
      X.beginPath();X.moveTo(e.size,0);X.lineTo(e.size+15+Math.sin(Date.now()/100)*5,0);X.stroke();
      // Brain exposed
      X.fillStyle='#faa';X.beginPath();X.arc(0,0,6,0,Math.PI*2);X.fill();
      X.restore();
    }},
  crawler:{name:'Crawler',hp:30,speed:1.5,dmg:10,size:10,color:'#588',xp:20,
    draw:function(e){
      X.save();X.translate(e.x,e.y);X.rotate(e.angle);
      X.fillStyle=e.color;
      X.beginPath();X.ellipse(0,0,e.size,e.size*0.5,0,0,Math.PI*2);X.fill();
      // Legs
      for(let i=-2;i<=2;i++){
        X.fillStyle='#477';X.fillRect(i*6,-e.size-2,2,6);
        X.fillRect(i*6,e.size-4,2,6);
      }
      X.restore();
    }},
  hunter:{name:'Hunter',hp:80,speed:1.4,dmg:20,size:16,color:'#885',xp:50,
    draw:function(e){
      X.save();X.translate(e.x,e.y);X.rotate(e.angle);
      X.fillStyle=e.color;
      X.beginPath();X.ellipse(0,0,e.size,e.size*0.8,0,0,Math.PI*2);X.fill();
      // Claws
      X.fillStyle='#aa6';
      X.fillRect(e.size-2,-8,10,3);X.fillRect(e.size-2,5,10,3);
      // Eyes
      X.fillStyle='#ff0';X.beginPath();X.arc(e.size*0.4,-4,3,0,Math.PI*2);X.fill();
      X.beginPath();X.arc(e.size*0.4,4,3,0,Math.PI*2);X.fill();
      X.restore();
    }},
  tyrant:{name:'TYRANT',hp:300,speed:0.7,dmg:30,size:24,color:'#833',xp:200,boss:true,
    draw:function(e){
      X.save();X.translate(e.x,e.y);X.rotate(e.angle);
      X.fillStyle=e.color;
      // Body
      X.beginPath();X.ellipse(0,0,e.size,e.size,0,0,Math.PI*2);X.fill();
      X.strokeStyle='#a44';X.lineWidth=2;X.stroke();
      // Coat
      X.fillStyle='#522';X.fillRect(-e.size*0.6,-e.size,e.size*1.2,e.size*2);
      // Face
      X.fillStyle='#daa';X.beginPath();X.arc(e.size*0.3,0,8,0,Math.PI*2);X.fill();
      // Glowing eye
      X.fillStyle='#f00';X.beginPath();X.arc(e.size*0.5,-3,3,0,Math.PI*2);X.fill();
      X.restore();
      // Boss HP bar
      if(e.hp<e.maxHp){
        const bw=80,bh=6;
        X.fillStyle='#333';X.fillRect(e.x-bw/2,e.y-e.size-15,bw,bh);
        X.fillStyle='#f00';X.fillRect(e.x-bw/2,e.y-e.size-15,bw*(e.hp/e.maxHp),bh);
        X.fillStyle='#fff';X.font='9px monospace';X.textAlign='center';
        X.fillText('TYRANT',e.x,e.y-e.size-18);
      }
    }},
  chimera:{name:'CHIMERA',hp:500,speed:1.0,dmg:25,size:30,color:'#639',xp:500,boss:true,
    draw:function(e){
      X.save();X.translate(e.x,e.y);
      const t=Date.now()/500;
      X.fillStyle=e.color;
      // Amorphous body
      X.beginPath();
      for(let a=0;a<Math.PI*2;a+=0.3){
        const r=e.size+Math.sin(t+a*3)*5;
        X.lineTo(Math.cos(a)*r,Math.sin(a)*r);
      }
      X.closePath();X.fill();
      X.strokeStyle='#a6c';X.lineWidth=2;X.stroke();
      // Tendrils
      for(let i=0;i<4;i++){
        const ta=t+i*Math.PI/2;
        X.strokeStyle='#96c';X.lineWidth=3;X.beginPath();
        X.moveTo(0,0);
        X.quadraticCurveTo(Math.cos(ta)*20,Math.sin(ta)*20,Math.cos(ta)*40+Math.sin(t*2+i)*8,Math.sin(ta)*40+Math.cos(t*2+i)*8);
        X.stroke();
      }
      // Eye
      X.fillStyle='#f0f';X.beginPath();X.arc(0,0,8,0,Math.PI*2);X.fill();
      X.fillStyle='#fff';X.beginPath();X.arc(0,0,4,0,Math.PI*2);X.fill();
      X.restore();
      // Boss HP bar
      const bw=100,bh=8;
      X.fillStyle='#333';X.fillRect(e.x-bw/2,e.y-e.size-20,bw,bh);
      const hpPct=Math.max(0,e.hp/e.maxHp);
      X.fillStyle=hpPct>0.5?'#a0f':hpPct>0.25?'#f80':'#f00';
      X.fillRect(e.x-bw/2,e.y-e.size-20,bw*hpPct,bh);
      X.fillStyle='#fff';X.font='bold 10px monospace';X.textAlign='center';
      X.fillText('CHIMERA',e.x,e.y-e.size-23);
    }}
};

// ===== PUZZLE SYSTEM =====
let puzzleActive=false;
let puzzleData={};
function startPuzzle(type){
  puzzleActive=true;
  if(type==='hack'){
    // Simon-says style hacking
    const seq=[];for(let i=0;i<4+currentChapter;i++)seq.push(Math.floor(Math.random()*4));
    puzzleData={type:'hack',seq,progress:0,input:[],timer:600,showTimer:120,colors:['#f00','#0f0','#00f','#ff0']};
  }else if(type==='final_choice'){
    puzzleData={type:'final_choice',choice:0};
  }
}

// ===== ACHIEVEMENTS =====
const ACHIEVEMENTS=[
  {id:'first_blood',name:'First Blood',desc:'Kill your first enemy.',check:()=>P.kills>=1},
  {id:'survivor',name:'Survivor',desc:'Complete Chapter 1.',check:()=>currentChapter>0},
  {id:'scientist',name:'Scientist',desc:'Complete Chapter 2.',check:()=>currentChapter>1},
  {id:'descent',name:'Into Darkness',desc:'Complete Chapter 3.',check:()=>currentChapter>2},
  {id:'executive',name:'Executive Clearance',desc:'Complete Chapter 4.',check:()=>currentChapter>3},
  {id:'escapist',name:'Escapist',desc:'Beat the game.',check:()=>state==='ending'},
  {id:'doc_collector',name:'Document Collector',desc:'Find 10 documents.',check:()=>P.documentsFound>=10},
  {id:'all_docs',name:'Archivist',desc:'Find all documents.',check:()=>P.documentsFound>=totalDocuments},
  {id:'no_damage_ch',name:'Untouchable',desc:'Complete a chapter without damage.',check:()=>P.chDmg===0&&currentChapter>0},
  {id:'knife_master',name:'Knife Master',desc:'Kill 10 enemies with knife.',check:()=>P.knifeKills>=10},
  {id:'speed_run',name:'Speed Run',desc:'Beat game under 30 minutes.',check:()=>state==='ending'&&P.playTime<1800},
  {id:'level_5',name:'Veteran',desc:'Reach level 5.',check:()=>P.level>=5},
  {id:'full_inventory',name:'Packer',desc:'Fill all 6 inventory slots.',check:()=>inventory.every(i=>i!==null)},
  {id:'saver',name:'Careful Planner',desc:'Save 3 times in one run.',check:()=>P.saveCount>=3},
  {id:'all_weapons',name:'Arsenal',desc:'Find all weapons.',check:()=>weapons[1].reserve>0&&weapons[2].reserve>0},
  {id:'antidote',name:'Cure Finder',desc:'Create the antivirus.',check:()=>hasItem('antivirus_sample')},
  {id:'nightmare_clear',name:'Nightmare Survivor',desc:'Beat game on Nightmare.',check:()=>state==='ending'&&difficulty==='nightmare'}
];
let unlockedAch=[];
function checkAchievements(){
  ACHIEVEMENTS.forEach(a=>{
    if(!unlockedAch.includes(a.id)&&a.check()){
      unlockedAch.push(a.id);
      sfx('puzzle_solve');
      showAchNotification(a);
    }
  });
}
function showAchNotification(a){
  const el=document.createElement('div');el.className='ach-popup';
  el.textContent='ACHIEVEMENT: '+a.name;
  const cont=document.getElementById('go-achievements')||document.getElementById('end-achievements')||document.body;
  cont.appendChild(el);
  setTimeout(()=>el.remove(),4000);
}

function countTotalDocuments(){let c=0;CHAPTERS.forEach(ch=>{const rooms=ch.rooms;rooms.forEach((r,idx)=>{const data=buildRoom(CHAPTERS.indexOf(ch),idx);c+=data.documents.length;});});return c;}
let totalDocuments=countTotalDocuments();

// ===== SCREEN SHAKE =====
let shakeT=0,shakeA=0;

// ===== INPUT =====
let keys={},mouse={x:450,y:350,down:false,clicked:false};
let touchKeys={};

document.addEventListener('keydown',e=>{
  keys[e.key.toLowerCase()]=true;
  if(e.key==='Escape'){
    if(state==='playing'){state='paused';showScreen('pause-screen');}
    else if(state==='paused'){state='playing';showScreen(null);}
    else if(state==='inventory'){state='playing';showScreen(null);}
  }
  if(e.key.toLowerCase()==='i'&&(state==='playing'||state==='paused')){
    if(state==='playing')state='inventory';
    else state='playing';
    renderInventory();showScreen(state==='inventory'?'inventory-screen':null);
  }
  if(e.key.toLowerCase()==='e'&&state==='playing')interact();
  if(e.key==='Tab'&&state==='playing'){e.preventDefault();renderInventory();state='inventory';showScreen('inventory-screen');}
});
document.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
C.addEventListener('mousemove',e=>{const r=C.getBoundingClientRect();mouse.x=(e.clientX-r.left)*(C.width/r.width);mouse.y=(e.clientY-r.top)*(C.height/r.height);});
C.addEventListener('mousedown',e=>{mouse.down=true;mouse.clicked=true;if(AC.state==='suspended')try{getAC();if(AC)try{getAC();if(AC)AC.resume();}catch(e){};}catch(e){}});
C.addEventListener('mouseup',()=>{mouse.down=false;});

// Touch controls
function isMobile(){return'ontouchstart'in window||navigator.maxTouchPoints>0;}
if(isMobile())showEl('touch-controls');
['touch-up','touch-down','touch-left','touch-right'].forEach(id=>{
  const el=document.getElementById(id);if(!el)return;
  const k=id.split('-')[1]==='up'?'w':id.split('-')[1]==='down'?'s':id.split('-')[1]==='left'?'a':'d';
  el.addEventListener('touchstart',e=>{e.preventDefault();touchKeys[k]=true;});
  el.addEventListener('touchend',e=>{e.preventDefault();touchKeys[k]=false;});
});
document.getElementById('touch-fire')?.addEventListener('touchstart',e=>{e.preventDefault();mouse.down=true;mouse.clicked=true;});
document.getElementById('touch-fire')?.addEventListener('touchend',e=>{e.preventDefault();mouse.down=false;});
document.getElementById('touch-interact')?.addEventListener('touchstart',e=>{e.preventDefault();if(state==='playing')interact();});
document.getElementById('touch-inventory')?.addEventListener('touchstart',e=>{e.preventDefault();
  if(state==='playing'){state='inventory';renderInventory();showScreen('inventory-screen');}
  else if(state==='inventory'){state='playing';showScreen(null);}
});

// Gamepad support
let gpState={lx:0,ly:0,rx:0,ry:0};
function pollGamepad(){
  const gp=navigator.getGamepads?navigator.getGamepads()[0]:null;
  if(!gp)return;
  gpState.lx=Math.abs(gp.axes[0])>0.15?gp.axes[0]:0;
  gpState.ly=Math.abs(gp.axes[1])>0.15?gp.axes[1]:0;
  gpState.rx=Math.abs(gp.axes[2])>0.15?gp.axes[2]:0;
  gpState.ry=Math.abs(gp.axes[3])>0.15?gp.axes[3]:0;
  // A=fire, X=interact, B=knife, Y=inventory
  if(gp.buttons[0]&&gp.buttons[0].pressed)mouse.down=true;
  else if(!gp.buttons[0]||!gp.buttons[0].pressed)mouse.down=false;
  if(gp.buttons[2]&&gp.buttons[2].pressed&&state==='playing')interact(); // X
  if(gp.buttons[1]&&gp.buttons[1].pressed)P.weapon=3; // B = knife
  if(gp.buttons[3]&&gp.buttons[3].pressed){ // Y = inventory
    if(state==='playing'){state='inventory';renderInventory();showScreen('inventory-screen');}
  }
}

// ===== SAVE/LOAD =====
let saveCount=0;
function saveGame(){
  if(!difficultyMult[difficulty].saves)return;
  const data={chapter:currentChapter,room:currentRoom,
    hp:P.hp,maxHp:P.maxHp,xp:P.xp,level:P.level,kills:P.kills,
    documentsFound:P.documentsFound,survivorsSaved:P.survivorsSaved,
    antidote:P.antidote,allDocuments:P.allDocuments,playTime:P.playTime,
    inventory:inventory.map(i=>i?i.id:null),
    weapons:weapons.map(w=>({reserve:w.reserve,ammo:w.ammo})),
    itemBox:itemBox.map(i=>i?i.id:null),
    difficulty:difficulty,unlockedAch:unlockedAch,saveCount:saveCount,
    mapFlags:mapFlags,doorFlags:doorFlags
  };
  try{localStorage.setItem('biohazard_save',JSON.stringify(data));sfx('save');showEl('save-indicator');
    setTimeout(()=>hideEl('save-indicator'),2000);saveCount++;P.saveCount=saveCount;}catch(e){}
}

function loadGame(){
  try{
    const raw=localStorage.getItem('biohazard_save');
    if(!raw)return false;
    const d=JSON.parse(raw);
    difficulty=d.difficulty||'normal';
    currentChapter=d.chapter||0;currentRoom=d.room||0;
    P.hp=d.hp||100;P.maxHp=d.maxHp||100;P.xp=d.xp||0;P.level=d.level||1;
    P.kills=d.kills||0;P.documentsFound=d.documentsFound||0;
    P.survivorsSaved=d.survivorsSaved||0;P.antidote=d.antidote||false;
    P.allDocuments=d.allDocuments||false;P.playTime=d.playTime||0;
    P.saveCount=d.saveCount||0;P.knifeKills=d.knifeKills||0;
    inventory=new Array(6).fill(null);
    (d.inventory||[]).forEach((id,i)=>{if(id&&ITEMS[id])inventory[i]={id,...ITEMS[id]};});
    (d.weapons||[]).forEach((w,i)=>{if(weapons[i]){weapons[i].reserve=w.reserve||0;weapons[i].ammo=w.ammo||0;}});
    itemBox=(d.itemBox||[]).map(id=>id&&ITEMS[id]?{id,...ITEMS[id]}:null);
    unlockedAch=d.unlockedAch||[];mapFlags=d.mapFlags||{};doorFlags=d.doorFlags||{};
    saveCount=d.saveCount||0;
    return true;
  }catch(e){return false;}
}

let mapFlags={}; // Flags for puzzle completion etc.
let doorFlags={}; // Which doors have been opened

// ===== GAME INIT =====
function initNewGame(){
  P={x:450,y:350,angle:0,speed:2.2,hp:100,maxHp:100,poison:0,invuln:0,
    weapon:0,fireTimer:0,footTimer:0,xp:0,level:1,kills:0,
    documentsFound:0,playTime:0,chStart:Date.now(),
    survivorsSaved:0,antidote:false,allDocuments:false,knifeOnly:false,
    dmgTaken:0,chKills:0,chDmg:0,chDocs:0,knifeKills:0,saveCount:0};
  weapons=[
    {name:'HANDGUN',ammo:15,maxAmmo:15,reserve:30,dmg:12,rate:12,spread:0.04,color:'#ff0',speed:14,range:400},
    {name:'SHOTGUN',ammo:0,maxAmmo:6,reserve:0,dmg:8,rate:25,spread:0.2,color:'#f80',speed:11,range:200,pellets:5},
    {name:'MAGNUM',ammo:0,maxAmmo:6,reserve:0,dmg:45,rate:30,spread:0.02,color:'#f0f',speed:16,range:500},
    {name:'KNIFE',ammo:999,maxAmmo:999,reserve:999,dmg:8,rate:8,spread:0,color:'#ccc',speed:0,range:35,melee:true}
  ];
  inventory=new Array(6).fill(null);
  itemBox=[];unlockedAch=[];mapFlags={};doorFlags={};saveCount=0;
  currentChapter=0;currentRoom=0;
  loadRoom(currentChapter,currentRoom);
}

function loadRoom(ch,room){
  const data=buildRoom(ch,room);
  mapData=data;
  interactables=data.interactables;
  enemies=data.enemies.map(e=>{const et=ENEMY_TYPES[e.type]||ENEMY_TYPES.zombie;return{...e,...et,maxHp:e.hp,angle:0,attackTimer:0,state:'idle',stunTimer:0};});
  pickups=data.pickups.map(p=>({...p,life:9999}));
  documents=data.documents;
  bullets=[];particles=[];bloodStains=[];projectiles=[];
  puzzleActive=false;
  // Place player at door
  if(room===0&&ch===0){P.x=7*60;P.y=4*60;}
  else{P.x=7*60;P.y=5*60;}
  P.invuln=30;
  updateHUD();
}

// ===== INTERACTION =====
function interact(){
  const S=mapData.S;
  // Check interactables
  interactables.forEach(obj=>{
    const dx=obj.x-P.x,dy=obj.y-P.y;
    if(Math.sqrt(dx*dx+dy*dy)<S*0.8){
      switch(obj.type){
        case'typewriter':
          saveGame();break;
        case'item_box':
          openItemBox();break;
        case'keycard':case'pickup_item':
          if(obj.item){
            if(addItem(obj.item)){sfx('keycard');interactables.splice(interactables.indexOf(obj),1);}
            else{showMessage('Inventory full!');}
          }
          break;
        case'valve':
          if(hasItem('valve_handle')){
            removeItem(inventory.findIndex(i=>i&&i.id==='valve_handle'));
            mapFlags.flood_drained=true;sfx('puzzle_solve');
            showMessage('Water drained!');P.xp+=30;
            // Open path
            if(mapData.tiles[5])mapData.tiles[5][7]=0;
          }else{showMessage('Need a valve handle.');}
          break;
        case'fuse_box':
          if(hasItem('fuse')){
            removeItem(inventory.findIndex(i=>i&&i.id==='fuse'));
            mapFlags.power_on=true;sfx('puzzle_solve');
            showMessage('Power restored!');P.xp+=30;
          }else{showMessage('Need a fuse.');}
          break;
        case'terminal':
          if(obj.puzzle==='hack'){startPuzzle('hack');}
          else if(obj.puzzle==='final_choice'){startPuzzle('final_choice');}
          break;
        case'elevator':
          if(mapFlags.power_on){showMessage('Elevator activated!');sfx('door');P.xp+=50;}
          else{showMessage('No power.');}
          break;
        case'airlock':
          if(hasItem('circuit_board')){
            removeItem(inventory.findIndex(i=>i&&i.id==='circuit_board'));
            mapFlags.bsl4_open=true;sfx('puzzle_solve');showMessage('Airlock opened!');P.xp+=30;
            if(mapData.tiles[8])mapData.tiles[8][5]=0;
          }else{showMessage('Need a circuit board.');}
          break;
        case'specimen_tank':
          if(hasItem('antidote_formula')){
            removeItem(inventory.findIndex(i=>i&&i.id==='antidote_formula'));
            addItem('antivirus_sample');sfx('puzzle_solve');showMessage('Antivirus sample obtained!');P.xp+=50;
            interactables.splice(interactables.indexOf(obj),1);
          }else{showMessage('Need the antidote formula.');}
          break;
        case'combine_station':
          if(hasItem('chemical_a')&&hasItem('chemical_b')){
            const aSlot=inventory.findIndex(i=>i&&i.id==='chemical_a');
            const bSlot=inventory.findIndex(i=>i&&i.id==='chemical_b');
            combineItems(aSlot,bSlot);
            showMessage('Antidote formula created!');P.xp+=40;
          }else{showMessage('Need Chemical A and B.');}
          break;
        case'chapter_exit':
          if(currentChapter<4){state='chapter_complete';P.chStart=Date.now();showChapterComplete();}
          break;
        case'escape_helicopter':
          triggerEnding();break;
      }
    }
  });
  // Check documents
  documents.forEach((doc,i)=>{
    const dx=doc.x-P.x,dy=doc.y-P.y;
    if(Math.sqrt(dx*dx+dy*dy)<S*0.7){
      P.documentsFound++;P.xp+=15;P.chDocs++;sfx('pickup');
      showMessage(doc.title+' - collected!');
      showDocReader(doc);
      documents.splice(i,1);
    }
  });
  // Check pickups
  for(let i=pickups.length-1;i>=0;i--){
    const pk=pickups[i];
    const dx=pk.x-P.x,dy=pk.y-P.y;
    if(Math.sqrt(dx*dx+dy*dy)<S*0.6){
      if(addItem(pk.id)){pickups.splice(i,1);}
      else{showMessage('Inventory full!');}
    }
  }
  // Check doors
  const px=Math.floor(P.x/S),py=Math.floor(P.y/S);
  if(px>=0&&px<mapData.W&&py>=0&&py<mapData.H){
    const tile=mapData.tiles[py][px];
    if(tile===2||tile===3||tile===4||tile===5){
      handleDoor(px,py,tile);
    }
  }
}

let messageText='',messageTimer=0;
function showMessage(msg){messageText=msg;messageTimer=180;}
function showDocReader(doc){
  // Create doc reader overlay
  let el=document.getElementById('doc-reader');
  if(!el){
    el=document.createElement('div');el.id='doc-reader';
    el.innerHTML='<div class="doc-file"><div class="doc-title"></div><div class="doc-body"></div></div><div class="doc-close">Press any key to close</div>';
    document.getElementById('game-container').appendChild(el);
  }
  el.querySelector('.doc-title').textContent=doc.title;
  el.querySelector('.doc-body').textContent=doc.body;
  el.classList.add('active');
  state='doc_reading';
  const closeDoc=()=>{el.classList.remove('active');state='playing';
    document.removeEventListener('keydown',closeDoc);document.removeEventListener('mousedown',closeDoc);
    document.removeEventListener('touchstart',closeDoc);};
  setTimeout(()=>{document.addEventListener('keydown',closeDoc);document.addEventListener('mousedown',closeDoc);document.addEventListener('touchstart',closeDoc);},100);
}

function handleDoor(px,py,tile){
  const key=`${currentChapter}_${currentRoom}_${px}_${py}`;
  if(doorFlags[key])return;
  if(tile===2){sfx('door');changeRoom(px,py);doorFlags[key]=true;}
  else if(tile===3){
    // Check keycard
    if(hasItem('keycard_lv1')||hasItem('master_key')){
      sfx('keycard');changeRoom(px,py);doorFlags[key]=true;
    }else{showMessage('Need Level 1 Keycard.');}
  }else if(tile===4){
    // Save room door
    sfx('door');changeRoom(px,py);doorFlags[key]=true;
  }else if(tile===5){
    // Exit
    sfx('door');changeRoom(px,py);doorFlags[key]=true;
  }
}

function changeRoom(px,py){
  let newRoom=-1;
  // Determine which room based on door position
  if(py<=3)newRoom=currentRoom-1; // North
  else if(py>=mapData.H-3)newRoom=currentRoom+1; // South
  else if(px<=3)newRoom=Math.max(0,currentRoom-1); // West
  else if(px>=mapData.W-3)newRoom=Math.min(CHAPTERS[currentChapter].rooms.length-1,currentRoom+1); // East
  
  if(newRoom<0){
    // Go to previous chapter
    if(currentChapter>0){currentChapter--;currentRoom=CHAPTERS[currentChapter].rooms.length-1;loadRoom(currentChapter,currentRoom);}
  }else if(newRoom>=CHAPTERS[currentChapter].rooms.length){
    // Go to next chapter
    if(currentChapter<4){currentChapter++;currentRoom=0;loadRoom(currentChapter,currentRoom);}
  }else{
    currentRoom=newRoom;loadRoom(currentChapter,currentRoom);
  }
}

// ===== ITEM BOX =====
function openItemBox(){
  // Simple item box: swap items between inventory and box
  if(invSelected>=0&&inventory[invSelected]){
    if(itemBox.length<20){
      itemBox.push(inventory[invSelected]);
      inventory[invSelected]=null;sfx('pickup');
      showMessage('Item stored.');
    }else{showMessage('Item box full!');}
  }else if(itemBox.length>0){
    // Get last item from box
    for(let i=0;i<6;i++){
      if(!inventory[i]){inventory[i]=itemBox.pop();sfx('pickup');showMessage('Item retrieved.');break;}
    }
  }
}

// ===== INVENTORY UI =====
function renderInventory(){
  const grid=document.getElementById('inventory-grid');
  grid.innerHTML='';
  for(let i=0;i<6;i++){
    const slot=document.createElement('div');
    slot.className='inv-slot'+(inventory[i]?' has-item':'')+(invSelected===i?' selected':'');
    if(inventory[i]){
      slot.textContent=inventory[i].icon;
      slot.title=inventory[i].name+': '+inventory[i].desc;
    }
    slot.onclick=()=>{
      if(combineMode&&combineFirst>=0&&combineFirst!==i){
        if(combineItems(combineFirst,i)){showMessage('Combined!');combineMode=false;combineFirst=-1;}
        else{showMessage('Cannot combine these.');}
      }else if(combineMode){
        combineFirst=i;
      }else{
        invSelected=invSelected===i?-1:i;
      }
      renderInventory();
    };
    grid.appendChild(slot);
  }
  document.getElementById('inv-lvl').textContent=P.level;
  document.getElementById('inv-xp').textContent=P.xp;
  document.getElementById('inv-kills').textContent=P.kills;
  document.getElementById('inv-docs').textContent=P.documentsFound+'/'+totalDocuments;
  
  const useBtn=document.getElementById('btn-use-item');
  const combBtn=document.getElementById('btn-combine-item');
  const nameEl=document.getElementById('item-name');
  const descEl=document.getElementById('item-desc');
  const details=document.getElementById('item-details');
  
  if(invSelected>=0&&inventory[invSelected]){
    details.classList.remove('hidden');
    nameEl.textContent=inventory[invSelected].name;
    descEl.textContent=inventory[invSelected].desc;
    useBtn.classList.remove('hidden');
    useBtn.onclick=()=>{useItem(invSelected);renderInventory();};
    combBtn.classList.remove('hidden');
    combBtn.textContent=combineMode?'CANCEL COMBINE':'COMBINE';
    combBtn.onclick=()=>{combineMode=!combineMode;combineFirst=combineMode?invSelected:-1;renderInventory();};
  }else{
    details.classList.add('hidden');
  }
}

// ===== UPDATE =====
let frameCount=0;
function update(){
  if(state!=='playing')return;
  frameCount++;
  P.playTime+=1/60;
  ambientLoop();
  pollGamepad();
  
  const S=mapData.S;
  const dm=difficultyMult[difficulty];
  
  // Player movement
  let dx=0,dy=0;
  if(keys['w']||keys['arrowup']||touchKeys['w'])dy=-1;
  if(keys['s']||keys['arrowdown']||touchKeys['s'])dy=1;
  if(keys['a']||keys['arrowleft']||touchKeys['a'])dx=-1;
  if(keys['d']||keys['arrowright']||touchKeys['d'])dx=1;
  
  // Gamepad movement
  if(gpState.lx||gpState.ly){dx=gpState.lx;dy=gpState.ly;}
  
  if(dx||dy){
    const l=Math.sqrt(dx*dx+dy*dy);dx/=l;dy/=l;
    let nx=P.x+dx*P.speed,ny=P.y+dy*P.speed;
    
    // Wall collision
    const tpx=Math.floor(nx/S),tpy=Math.floor(ny/S);
    if(tpx>=0&&tpx<mapData.W&&tpy>=0&&tpy<mapData.H&&mapData.tiles[tpy][tpx]!==1){
      P.x=nx;P.y=ny;
    }else{
      // Slide along walls
      const tpx2=Math.floor(nx/S),tpy2=Math.floor(P.y/S);
      if(tpx2>=0&&tpx2<mapData.W&&tpy2>=0&&tpy2<mapData.H&&mapData.tiles[tpy2][tpx2]!==1)P.x=nx;
      const tpx3=Math.floor(P.x/S),tpy3=Math.floor(ny/S);
      if(tpx3>=0&&tpx3<mapData.W&&tpy3>=0&&tpy3<mapData.H&&mapData.tiles[tpy3][tpx3]!==1)P.y=ny;
    }
    
    // Footstep sounds
    P.footTimer++;
    if(P.footTimer%20===0)sfx('footstep');
  }
  
  // Mouse aim / gamepad aim
  if(gpState.rx||gpState.ry){P.angle=Math.atan2(gpState.ry,gpState.rx);}
  else{P.angle=Math.atan2(mouse.y-P.y,mouse.x-P.x);}
  
  // Weapon switching
  if(keys['1'])P.weapon=0;
  if(keys['2']&&weapons[1].reserve>0)P.weapon=1;
  if(keys['3']&&weapons[2].reserve>0)P.weapon=2;
  if(keys['4'])P.weapon=3;
  
  // Reload
  const w=weapons[P.weapon];
  if(w.ammo<=0&&w.reserve>0){
    const refill=Math.min(w.maxAmmo,w.reserve);
    w.ammo=refill;w.reserve-=refill;
  }
  
  // Firing
  P.fireTimer--;
  if((mouse.down||mouse.clicked)&&P.fireTimer<=0&&w.ammo>0){
    mouse.clicked=false;
    const wName=['handgun','shotgun','magnum','knife'][P.weapon];
    sfx(wName);
    
    if(w.melee){
      // Knife attack
      const kx=P.x+Math.cos(P.angle)*w.range,ky=P.y+Math.sin(P.angle)*w.range;
      enemies.forEach(e=>{
        if(e.hp<=0)return;
        if(Math.sqrt((e.x-kx)**2+(e.y-ky)**2)<e.size+10){
          damageEnemy(e,w.dmg*dm.dmg);
          if(e.hp<=0){P.knifeKills++;P.kills++;}
        }
      });
      addParticle(kx,ky,'#ccc',3);
      P.fireTimer=w.rate;
    }else{
      const count=w.pellets||1;
      for(let i=0;i<count;i++){
        const spread=(Math.random()-0.5)*w.spread*2;
        const a=P.angle+spread;
        bullets.push({x:P.x+Math.cos(P.angle)*15,y:P.y+Math.sin(P.angle)*15,
          vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,
          dmg:w.dmg*dm.dmg,color:w.color,life:Math.ceil(w.range/w.speed),size:2});
      }
      if(P.weapon===0)w.ammo--;else if(P.weapon===1)w.ammo--;else if(P.weapon===2)w.ammo--;
      P.fireTimer=w.rate;
    }
  }
  if(!puzzleActive)mouse.clicked=false;
  
  // Invulnerability
  if(P.invuln>0)P.invuln--;
  
  // Poison
  if(P.poison>0){
    P.poison-=0.02;
    if(frameCount%60===0){P.hp-=1;P.dmgTaken++;P.chDmg++;}
  }
  
  // Enemy updates
  enemies.forEach(e=>{
    if(e.hp<=0)return;
    if(e.stunTimer>0){e.stunTimer--;return;}
    
    const dist=Math.sqrt((e.x-P.x)**2+(e.y-P.y)**2);
    
    // Wake up
    if(!e.awake&&dist<250){e.awake=true;sfx(e.type==='zombie'?'zombie_groan':e.type==='licker'?'licker':e.type==='hunter'?'hunter':'zombie_groan');}
    if(!e.awake)return;
    
    const et=ENEMY_TYPES[e.type];
    e.attackTimer--;
    
    // Move toward player
    e.angle=Math.atan2(P.y-e.y,P.x-e.x);
    
    // Tyrant: slow but persistent
    let spd=et.speed;
    if(e.boss&&e.type==='tyrant')spd*=0.8;
    
    // Check if path is clear (simple)
    let canMove=true;
    const enx=e.x+Math.cos(e.angle)*spd,eny=e.y+Math.sin(e.angle)*spd;
    const etx=Math.floor(enx/S),ety=Math.floor(eny/S);
    if(etx>=0&&etx<mapData.W&&ety>=0&&ety<mapData.H&&mapData.tiles[ety][etx]===1)canMove=false;
    
    if(canMove&&dist>e.size+15){e.x=enx;e.y=eny;}
    
    // Attack
    if(dist<e.size+15&&e.attackTimer<=0){
      const dmg=Math.ceil(et.dmg*dm.dmg*(1/dm.hp));
      P.hp-=dmg;P.invuln=20;shakeT=10;shakeA=6;P.dmgTaken+=dmg;P.chDmg+=dmg;
      e.attackTimer=et.boss?40:30;
      sfx('player_hit');
      if(e.type==='tyrant')sfx('tyrant');
      if(P.hp<=0){playerDeath();}
    }
    
    // Boss special attacks
    if(e.boss&&e.type==='chimera'&&dist<200&&e.attackTimer<=0){
      // Chimera shoots projectiles
      for(let i=0;i<3;i++){
        const a=e.angle+(i-1)*0.3;
        projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,dmg:15*dm.dmg,life:80,size:5,color:'#c0f'});
      }
      e.attackTimer=60;sfx('chimera');
    }
    if(e.boss&&e.type==='tyrant'&&dist<60&&e.attackTimer<=0){
      // Tyrant ground pound
      shakeT=15;shakeA=10;
      if(dist<80)P.hp-=20*dm.dmg;
      P.dmgTaken+=20;P.chDmg+=20;sfx('tyrant');
      e.attackTimer=50;
    }
    
    // Licker ceiling drop
    if(e.ceiling&&dist<100&&Math.random()<0.005){
      e.ceiling=false;e.stunTimer=30;
      sfx('licker');shakeT=5;shakeA=3;
    }
    
    // Random sounds
    if(frameCount%300===0&&Math.random()<0.3)sfx(e.type==='zombie'?'zombie_groan':'alert');
  });
  
  // Bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];b.x+=b.vx;b.y+=b.vy;b.life--;
    if(b.life<=0||b.x<0||b.x>900||b.y<0||b.y>700){bullets.splice(i,1);continue;}
    
    // Hit enemies
    let hit=false;
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];if(e.hp<=0||!e.awake)continue;
      if(Math.sqrt((b.x-e.x)**2+(b.y-e.y)**2)<e.size){
        damageEnemy(e,b.dmg);
        addParticle(b.x,b.y,b.color,3);
        bullets.splice(i,1);hit=true;break;
      }
    }
    if(hit)continue;
    
    // Hit walls
    const tx=Math.floor(b.x/S),ty=Math.floor(b.y/S);
    if(tx>=0&&tx<mapData.W&&ty>=0&&ty<mapData.H&&mapData.tiles[ty][tx]===1){
      addParticle(b.x,b.y,'#888',2);bullets.splice(i,1);
    }
  }
  
  // Enemy projectiles
  for(let i=projectiles.length-1;i>=0;i--){
    const pr=projectiles[i];pr.x+=pr.vx;pr.y+=pr.vy;pr.life--;
    if(pr.life<=0){projectiles.splice(i,1);continue;}
    if(Math.sqrt((pr.x-P.x)**2+(pr.y-P.y)**2)<15){
      P.hp-=pr.dmg;P.invuln=15;shakeT=8;shakeA=5;P.dmgTaken+=pr.dmg;P.chDmg+=pr.dmg;
      sfx('player_hit');projectiles.splice(i,1);
      if(P.hp<=0)playerDeath();
    }
  }
  
  // Clean dead enemies
  enemies=enemies.filter(e=>e.hp>0);
  
  // Particles
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.life--;p.vx*=0.92;p.vy*=0.92;
    if(p.life<=0)particles.splice(i,1);
  }
  
  // Check interact proximity
  let nearInteract=false;
  interactables.forEach(obj=>{
    if(Math.sqrt((obj.x-P.x)**2+(obj.y-P.y)**2)<mapData.S*0.8)nearInteract=true;
  });
  documents.forEach(doc=>{
    if(Math.sqrt((doc.x-P.x)**2+(doc.y-P.y)**2)<mapData.S*0.7)nearInteract=true;
  });
  pickups.forEach(pk=>{
    if(Math.sqrt((pk.x-P.x)**2+(pk.y-P.y)**2)<mapData.S*0.6)nearInteract=true;
  });
  // Check doors
  const ppx=Math.floor(P.x/S),ppy=Math.floor(P.y/S);
  if(ppx>=0&&ppx<mapData.W&&ppy>=0&&ppy<mapData.H){
    const t=mapData.tiles[ppy][ppx];
    if(t>=2)nearInteract=true;
  }
  
  if(nearInteract)showEl('interact-prompt');else hideEl('interact-prompt');
  
  // Puzzle update
  if(puzzleActive)updatePuzzle();
  
  // Message timer
  if(messageTimer>0){messageTimer--;if(messageTimer<=0)messageText='';}
  
  if(shakeT>0)shakeT--;
  
  // Level up check
  const xpNeeded=P.level*100;
  if(P.xp>=xpNeeded){P.xp-=xpNeeded;P.level++;P.maxHp+=10;P.hp=Math.min(P.hp+20,P.maxHp);sfx('puzzle_solve');showMessage('LEVEL UP! Level '+P.level);}
  
  // Check chapter completion (all objectives or exit reached)
  checkAchievements();
  try{if(typeof NGN4Achievements!=='undefined')NGN4Achievements.runChecks();}catch(e){}
  updateHUD();
}

function damageEnemy(e,dmg){
  e.hp-=dmg;e.stunTimer=5;
  addParticle(e.x,e.y,'#a00',4);addBlood(e.x,e.y);
  if(e.boss)sfx('boss_hit');else sfx('zombie_hit');
  if(e.hp<=0){
    const et=ENEMY_TYPES[e.type];
    P.xp+=et.xp;P.kills++;P.chKills++;
    addParticle(e.x,e.y,'#800',12);addBlood(e.x,e.y);addBlood(e.x,e.y);addBlood(e.x,e.y);
    sfx(e.type==='zombie'?'zombie_die':'explosion');
    // Drop loot
    if(Math.random()<0.25){
      const loot=['green_herb','handgun_ammo','shotgun_ammo'][Math.floor(Math.random()*3)];
      pickups.push({x:e.x,y:e.y,id:loot,life:9999});
    }
    // Tyrant drops special loot
    if(e.type==='tyrant'){
      pickups.push({x:e.x,y:e.y,id:'magnum_ammo',life:9999});
      pickups.push({x:e.x+20,y:e.y,id:'first_aid',life:9999});
    }
  }
}

function addParticle(x,y,color,count){
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,s=1+Math.random()*3;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:15+Math.random()*20,maxLife:35,color,size:1.5+Math.random()*2.5});
  }
}
function addBlood(x,y){
  bloodStains.push({x:x+(Math.random()-0.5)*8,y:y+(Math.random()-0.5)*8,size:4+Math.random()*8,a:0.2+Math.random()*0.2});
  if(bloodStains.length>150)bloodStains.shift();
}

function playerDeath(){
  P.hp=0;state='gameover';sfx('player_die');
  const earned=P.kills*2;
  earnCoins(earned);
  document.getElementById('go-ch').textContent=currentChapter+1;
  document.getElementById('go-kills').textContent=P.kills;
  document.getElementById('go-docs').textContent=P.documentsFound;
  document.getElementById('go-time').textContent=formatTime(P.playTime);
  document.getElementById('go-coins').textContent=earned;
  showScreen('gameover-screen');
  document.getElementById('hud').classList.add('hidden');
}

function formatTime(s){const m=Math.floor(s/60);return String(m).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0');}

function showChapterComplete(){
  checkAchievements();
  try{if(typeof NGN4Achievements!=='undefined')NGN4Achievements.runChecks();}catch(e){}
  const chTime=(Date.now()-P.chStart)/1000;
  const xpEarned=P.chKills*10+P.chDocs*15+50;
  P.xp+=xpEarned;
  checkAchievements();
  try{if(typeof NGN4Achievements!=='undefined')NGN4Achievements.runChecks();}catch(e){}
  document.getElementById('cc-title').textContent='CHAPTER '+(currentChapter+1)+' COMPLETE';
  document.getElementById('cc-chapter').textContent=CHAPTERS[currentChapter].name;
  document.getElementById('cc-kills').textContent=P.chKills;
  document.getElementById('cc-docs').textContent=P.chDocs;
  document.getElementById('cc-time').textContent=formatTime(chTime);
  document.getElementById('cc-xp').textContent=xpEarned;
  document.getElementById('btn-next-chapter').textContent=currentChapter<4?'NEXT CHAPTER':'FINAL CHAPTER';
  showScreen('chapter-complete-screen');
  document.getElementById('hud').classList.add('hidden');
}

function triggerEnding(){
  state='ending';
  let endType='bad';
  if(hasItem('antivirus_sample')&&P.documentsFound>=totalDocuments)endType='secret';
  else if(hasItem('antivirus_sample'))endType='good';
  
  const texts={
    good:'Agent Reeves escapes the facility with the antivirus sample. Meridian Corp is exposed. The surviving staff receive treatment. CHIMERA is contained... for now.',
    bad:'Agent Reeves escapes, but without the antidote, CHIMERA will spread beyond the facility. The outbreak has only just begun.',
    secret:"Agent Reeves not only escapes with the cure, but with full evidence of Project CHIMERA. Meridian Corp is dismantled. Dr. Mercer's research leads to legitimate medical breakthroughs. The truth sets everyone free."
  };
  
  const endColors={good:'#0f0',bad:'#f00',secret:'#f0f'};
  document.getElementById('ending-title').textContent=endType.toUpperCase()+' ENDING';
  document.getElementById('ending-title').style.color=endColors[endType];
  document.getElementById('ending-text').textContent=texts[endType];
  document.getElementById('end-time').textContent=formatTime(P.playTime);
  document.getElementById('end-kills').textContent=P.kills;
  document.getElementById('end-docs').textContent=P.documentsFound;
  document.getElementById('end-docs-total').textContent=totalDocuments;
  document.getElementById('end-type').textContent=endType.toUpperCase();
  const earned=P.kills*3+P.documentsFound*10+(endType==='secret'?200:endType==='good'?100:50);
  earnCoins(earned);
  document.getElementById('end-coins').textContent=earned;
  checkAchievements();
  try{if(typeof NGN4Achievements!=='undefined')NGN4Achievements.runChecks();}catch(e){}
  showScreen('ending-screen');
  document.getElementById('hud').classList.add('hidden');
  try{localStorage.removeItem('biohazard_save');}catch(e){}
}

// ===== PUZZLE UPDATE =====
function updatePuzzle(){
  if(puzzleData.type==='hack'){
    if(puzzleData.showTimer>0){puzzleData.showTimer--;return;}
    puzzleData.timer--;
    if(puzzleData.timer<=0){puzzleActive=false;showMessage('Hack failed! Try again.');}
  }
}

// ===== HUD =====
function updateHUD(){
  const w=weapons[P.weapon];
  document.getElementById('health-text').textContent=Math.max(0,Math.ceil(P.hp));
  document.getElementById('health-bar').style.width=Math.max(0,P.hp/P.maxHp*100)+'%';
  document.getElementById('health-bar').style.background=P.hp>50?'linear-gradient(90deg,#0a0,#0f0)':P.hp>25?'linear-gradient(90deg,#a80,#ff0)':'linear-gradient(90deg,#a00,#f00)';
  document.getElementById('ch-num').textContent=currentChapter+1;
  document.getElementById('ch-name').textContent=CHAPTERS[currentChapter].name;
  document.getElementById('loc-name').textContent=CHAPTERS[currentChapter].rooms[currentRoom]||'Unknown';
  document.getElementById('weapon-name').textContent=w.name;
  document.getElementById('ammo-display').textContent=w.melee?'--':w.ammo+' / '+w.reserve;
  document.getElementById('xp-num').textContent=P.xp;
  document.getElementById('lvl-num').textContent=P.level;
  const objIdx=Math.min(Math.floor(P.kills/5),CHAPTERS[currentChapter].objectives.length-1);
  document.getElementById('obj-text').textContent=CHAPTERS[currentChapter].objectives[Math.max(0,objIdx)];
  
  if(P.poison>0)showEl('poison-bar-container');else hideEl('poison-bar-container');
}

// ===== RENDER =====
function render(){
  X.fillStyle='#050508';X.fillRect(0,0,900,700);
  
  if(state==='menu'||state==='difficulty')return;
  
  const S=mapData.S||60;
  const W=mapData.W||15,H=mapData.H||11;
  
  let sx=0,sy=0;
  if(shakeT>0){sx=(Math.random()-0.5)*shakeA;sy=(Math.random()-0.5)*shakeA;}
  X.save();X.translate(sx,sy);
  
  // Draw tiles
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const tx=x*S,ty=y*S;
      const tile=mapData.tiles?mapData.tiles[y][x]:1;
      
      if(tile===1){
        // Wall
        X.fillStyle='#1a1a22';X.fillRect(tx,ty,S,S);
        X.fillStyle='#22222c';X.fillRect(tx+2,ty+2,S-4,S-4);
        // Texture
        X.fillStyle='#181820';
        if((x+y)%3===0)X.fillRect(tx+S/2-1,ty+S/2-1,3,3);
      }else if(tile===0){
        // Floor
        X.fillStyle='#0e0e14';X.fillRect(tx,ty,S,S);
        // Floor tiles
        X.strokeStyle='rgba(255,255,255,0.02)';X.strokeRect(tx,ty,S,S);
        // Random floor details
        if((x*7+y*13)%11===0){X.fillStyle='rgba(255,0,0,0.03)';X.fillRect(tx+10,ty+10,S-20,S-20);}
      }else if(tile===2){
        // Door
        X.fillStyle='#0e0e14';X.fillRect(tx,ty,S,S);
        X.fillStyle='#2a2a35';X.fillRect(tx+5,ty+5,S-10,S-10);
        X.fillStyle='#3a3a45';X.fillRect(tx+S/2-3,ty+S/2-3,6,6);
      }else if(tile===3){
        // Locked door
        X.fillStyle='#0e0e14';X.fillRect(tx,ty,S,S);
        X.fillStyle='#2a1515';X.fillRect(tx+5,ty+5,S-10,S-10);
        X.fillStyle='#f00';X.fillRect(tx+S/2-2,ty+S/2-2,4,4);
        X.fillStyle='rgba(255,0,0,0.1)';X.fillRect(tx,ty,S,S);
      }else if(tile===4){
        // Save room door
        X.fillStyle='#0e0e14';X.fillRect(tx,ty,S,S);
        X.fillStyle='#152a15';X.fillRect(tx+5,ty+5,S-10,S-10);
        X.fillStyle='#0f0';X.fillRect(tx+S/2-2,ty+S/2-2,4,4);
      }else if(tile===5){
        // Exit
        X.fillStyle='#0e0e14';X.fillRect(tx,ty,S,S);
        X.fillStyle='#2a2a15';X.fillRect(tx+5,ty+5,S-10,S-10);
        const pulse=Math.sin(Date.now()/300)*0.3+0.7;
        X.fillStyle=`rgba(255,255,0,${pulse*0.3})`;X.fillRect(tx,ty,S,S);
      }
    }
  }
  
  // Blood stains
  bloodStains.forEach(b=>{X.fillStyle=`rgba(80,0,0,${b.a})`;X.beginPath();X.arc(b.x,b.y,b.size,0,Math.PI*2);X.fill();});
  
  // Pickups
  pickups.forEach(pk=>{
    const def=ITEMS[pk.id];if(!def)return;
    const pulse=Math.sin(Date.now()/300)*3;
    X.save();X.translate(pk.x,pk.y);
    X.fillStyle='rgba(255,255,255,0.05)';X.beginPath();X.arc(0,0,14+pulse,0,Math.PI*2);X.fill();
    X.font='20px serif';X.textAlign='center';X.textBaseline='middle';
    X.fillText(def.icon,0,0);
    X.restore();
  });
  
  // Documents
  documents.forEach(doc=>{
    const pulse=Math.sin(Date.now()/400)*2;
    X.save();X.translate(doc.x,doc.y);
    X.fillStyle='rgba(255,255,255,0.05)';X.beginPath();X.arc(0,0,14+pulse,0,Math.PI*2);X.fill();
    X.font='18px serif';X.textAlign='center';X.textBaseline='middle';
    X.fillText('📄',0,0);
    X.restore();
  });
  
  // Interactables
  interactables.forEach(obj=>{
    X.save();X.translate(obj.x,obj.y);
    const pulse=Math.sin(Date.now()/400)*0.3+0.7;
    switch(obj.type){
      case'typewriter':
        X.fillStyle='#555';X.fillRect(-12,-8,24,16);X.fillStyle='#777';X.fillRect(-10,-6,20,12);
        X.fillStyle='#999';X.fillRect(-8,-4,16,8);break;
      case'item_box':
        X.fillStyle='#4a3a2a';X.fillRect(-15,-10,30,20);X.strokeStyle='#6a5a4a';X.lineWidth=2;X.strokeRect(-15,-10,30,20);break;
      case'terminal':
        X.fillStyle='#1a2a3a';X.fillRect(-15,-12,30,24);X.fillStyle='#0af';X.fillRect(-12,-9,24,18);
        X.fillStyle='#0af';X.font='10px monospace';X.textAlign='center';X.fillText('>',0,0);break;
      case'elevator':
        X.fillStyle='#333';X.fillRect(-14,-18,28,36);X.strokeStyle=`rgba(255,255,0,${pulse})`;X.lineWidth=2;X.strokeRect(-14,-18,28,36);
        X.fillStyle='#ff0';X.font='14px monospace';X.textAlign='center';X.fillText(mapFlags.power_on?'▲':'✕',0,2);break;
      default:
        // Generic interactable glow
        X.fillStyle=`rgba(255,0,0,${pulse*0.15})`;X.beginPath();X.arc(0,0,20,0,Math.PI*2);X.fill();
    }
    X.restore();
  });
  
  // Enemies
  enemies.forEach(e=>{
    if(e.hp<=0)return;
    const et=ENEMY_TYPES[e.type];if(!et)return;
    if(!e.awake){
      // Sleeping enemies - dimmed
      X.globalAlpha=0.5;
    }
    if(e.ceiling&&e.awake){
      X.globalAlpha=0.3+Math.sin(Date.now()/200)*0.1;
    }
    et.draw(e);
    X.globalAlpha=1;
    
    // HP bar for tough enemies
    if(e.maxHp>40&&e.hp<e.maxHp&&!e.boss){
      X.fillStyle='#333';X.fillRect(e.x-15,e.y-e.size-10,30,3);
      X.fillStyle='#f00';X.fillRect(e.x-15,e.y-e.size-10,30*(e.hp/e.maxHp),3);
    }
  });
  
  // Player
  if(P.invuln<=0||Math.floor(P.invuln/3)%2===0){
    X.save();X.translate(P.x,P.y);X.rotate(P.angle);
    // Body
    X.fillStyle='#3a6';X.beginPath();X.arc(0,0,12,0,Math.PI*2);X.fill();
    X.strokeStyle='#5c8';X.lineWidth=1.5;X.stroke();
    // Gun
    const w=weapons[P.weapon];
    if(!w.melee){
      X.fillStyle='#888';X.fillRect(8,-3,16,6);
      X.fillStyle='#666';X.fillRect(20,-2,6,4);
    }else{
      // Knife
      X.fillStyle='#ccc';X.fillRect(8,-1,12,2);
      X.fillStyle='#999';X.fillRect(4,-3,6,6);
    }
    X.restore();
    
    // Flashlight cone (for basement chapter)
    if(currentChapter===2){
      X.save();
      const flX=P.x,flY=P.y,flA=P.angle;
      const grad=X.createRadialGradient(flX,flY,20,flX,flY,180);
      grad.addColorStop(0,'rgba(0,0,0,0)');
      grad.addColorStop(1,'rgba(0,0,0,0.85)');
      X.globalCompositeOperation='multiply';
      X.beginPath();
      X.moveTo(flX,flY);
      X.arc(flX,flY,180,flA-0.5,flA+0.5);
      X.closePath();
      X.fillStyle=grad;X.fill();
      X.globalCompositeOperation='source-over';
      X.restore();
      
      // Darkness overlay
      X.fillStyle='rgba(0,0,10,0.6)';X.fillRect(0,0,900,700);
      // Light around player
      const lg=X.createRadialGradient(P.x,P.y,10,P.x,P.y,120);
      lg.addColorStop(0,'rgba(0,0,10,0)');
      lg.addColorStop(1,'rgba(0,0,10,0.8)');
      X.fillStyle=lg;X.fillRect(0,0,900,700);
    }
  }
  
  // Bullets
  bullets.forEach(b=>{
    X.fillStyle=b.color;X.beginPath();X.arc(b.x,b.y,b.size,0,Math.PI*2);X.fill();
    X.globalAlpha=0.3;X.beginPath();X.arc(b.x-b.vx,b.y-b.vy,b.size*0.7,0,Math.PI*2);X.fill();X.globalAlpha=1;
  });
  
  // Projectiles
  projectiles.forEach(pr=>{
    X.fillStyle=pr.color;X.beginPath();X.arc(pr.x,pr.y,pr.size,0,Math.PI*2);X.fill();
    X.fillStyle='rgba(200,100,255,0.3)';X.beginPath();X.arc(pr.x,pr.y,pr.size*2,0,Math.PI*2);X.fill();
  });
  
  // Particles
  particles.forEach(p=>{
    X.globalAlpha=p.life/p.maxLife;X.fillStyle=p.color;
    X.beginPath();X.arc(p.x,p.y,p.size*(p.life/p.maxLife),0,Math.PI*2);X.fill();
  });
  X.globalAlpha=1;
  
  // Puzzle overlay
  if(puzzleActive)renderPuzzle();
  
  // Message
  if(messageTimer>0&&messageText){
    X.save();
    X.globalAlpha=Math.min(1,messageTimer/30);
    X.fillStyle='rgba(0,0,0,0.7)';X.fillRect(200,640,500,30);
    X.fillStyle='#f88';X.font='13px "Share Tech Mono",monospace';X.textAlign='center';
    X.fillText(messageText,450,660);
    X.restore();
  }
  
  // Blood vignette when low HP
  if(P.hp<40&&P.hp>0){
    const intensity=1-P.hp/40;
    const vg=X.createRadialGradient(450,350,200,450,350,500);
    vg.addColorStop(0,'rgba(100,0,0,0)');
    vg.addColorStop(1,`rgba(100,0,0,${intensity*0.4})`);
    X.fillStyle=vg;X.fillRect(0,0,900,700);
  }
  
  X.restore(); // shake
}

function renderPuzzle(){
  if(puzzleData.type==='hack'){
    X.fillStyle='rgba(0,0,0,0.85)';X.fillRect(0,0,900,700);
    X.fillStyle='#f00';X.font='bold 20px "Orbitron",sans-serif';X.textAlign='center';
    X.fillText('SECURITY TERMINAL',450,150);
    X.fillStyle='#888';X.font='12px "Share Tech Mono",monospace';
    X.fillText('Repeat the sequence: '+puzzleData.seq.length+' inputs',450,180);
    
    if(puzzleData.showTimer>0){
      // Show sequence
      for(let i=0;i<puzzleData.seq.length;i++){
        const bx=450-(puzzleData.seq.length*35)+i*70+35;
        const ci=puzzleData.seq[i];
        X.fillStyle=puzzleData.colors[ci];X.globalAlpha=0.8;
        X.fillRect(bx-25,220,50,50);
        X.globalAlpha=1;
        X.fillStyle='#fff';X.font='bold 20px monospace';X.fillText(i+1,bx,250);
      }
    }else{
      // Input buttons
      for(let i=0;i<4;i++){
        const bx=450-(4*55)+i*110+55;
        const by=350;
        const hover=Math.sqrt((mouse.x-bx)**2+(mouse.y-by)**2)<30;
        X.fillStyle=puzzleData.colors[i];X.globalAlpha=hover?1:0.6;
        X.fillRect(bx-25,by-25,50,50);
        X.globalAlpha=1;
        if(hover&&mouse.clicked){
          puzzleData.input.push(i);
          sfx('alert');
          if(puzzleData.input[puzzleData.input.length-1]!==puzzleData.seq[puzzleData.input.length-1]){
            // Wrong
            puzzleActive=false;showMessage('Hack failed!');sfx('player_hit');
          }else if(puzzleData.input.length===puzzleData.seq.length){
            // Success
            puzzleActive=false;sfx('puzzle_solve');P.xp+=40;showMessage('Hack successful!');
            if(currentChapter===3){mapFlags.security_hacked=true;mapFlags.bsl4_open=true;}
            if(currentChapter===1){mapFlags.data_downloaded=true;P.xp+=30;}
          }
        }
      }
      // Progress
      X.fillStyle='#fff';X.font='14px monospace';X.textAlign='center';
      X.fillText('Progress: '+puzzleData.input.length+'/'+puzzleData.seq.length,450,430);
    }
    
    X.fillStyle='#666';X.font='11px monospace';X.fillText('ESC to cancel',450,480);
  }
  
  if(puzzleData.type==='final_choice'){
    X.fillStyle='rgba(0,0,0,0.9)';X.fillRect(0,0,900,700);
    X.fillStyle='#f00';X.font='bold 24px "Orbitron",sans-serif';X.textAlign='center';
    X.fillText('CHOOSE YOUR PATH',450,200);
    
    const choices=[
      {text:'DESTROY THE FACILITY',desc:'Activate self-destruct. No one survives. CHIMERA is erased.',color:'#f00',y:300},
      {text:'SAVE THE SURVIVORS',desc:'Evacuate with everyone. CHIMERA may spread.',color:'#0f0',y:400},
      {text:'RETRIEVE THE CURE',desc:'Take the antivirus research. Escape alone.',color:'#ff0',y:500}
    ];
    
    choices.forEach((c,i)=>{
      const hover=mouse.x>250&&mouse.x<650&&mouse.y>c.y-20&&mouse.y<c.y+20;
      X.fillStyle=c.color;X.globalAlpha=hover?1:0.6;
      X.font='bold 16px "Orbitron",sans-serif';X.fillText(c.text,450,c.y);
      X.font='11px "Share Tech Mono",monospace';X.fillStyle='#888';X.globalAlpha=hover?1:0.5;
      X.fillText(c.desc,450,c.y+20);
      X.globalAlpha=1;
      if(hover&&mouse.clicked){
        puzzleData.choice=i+1;
        if(i===0){P.antidote=false;sfx('explosion');}
        else if(i===1){P.survivorsSaved=3;sfx('save');}
        else if(i===2){if(hasItem('antivirus_sample'))P.antidote=true;sfx('keycard');}
        puzzleActive=false;
      }
    });
  }
}

// ===== GAME LOOP =====
function gameLoop(){
  update();
  render();
  try{if(typeof NGN4Achievements!=='undefined')NGN4Achievements.renderPopups();}catch(e){}
  mouse.clicked=false;
  requestAnimationFrame(gameLoop);
}

// ===== INIT & CONTINUE =====
if(localStorage.getItem('biohazard_save')){showEl('btn-continue');}
document.getElementById('total-coins').querySelector('span').textContent=getCoins();

// ===== BUTTON HANDLERS =====
document.getElementById('btn-new-game').onclick=()=>{
  showScreen('difficulty-screen');state='difficulty';
};
document.getElementById('btn-continue').onclick=()=>{
  if(loadGame()){loadRoom(currentChapter,currentRoom);state='playing';showScreen(null);document.getElementById('hud').classList.remove('hidden');}
};
document.getElementById('btn-easy').onclick=()=>{difficulty='easy';startNewGame();};
document.getElementById('btn-normal').onclick=()=>{difficulty='normal';startNewGame();};
document.getElementById('btn-hard').onclick=()=>{difficulty='hard';startNewGame();};
document.getElementById('btn-nightmare').onclick=()=>{difficulty='nightmare';startNewGame();};
document.getElementById('btn-back-diff').onclick=()=>{showScreen('menu-screen');state='menu';};

function startNewGame(){
  initNewGame();
  state='playing';
  showScreen(null);
  document.getElementById('hud').classList.remove('hidden');
  sfx('door');
  // Tutorial message
  showMessage('Use WASD to move, mouse to aim, click to shoot, E to interact.');
}

// Difficulty button styling
document.querySelectorAll('.btn-difficulty').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.btn-difficulty').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  };
});

document.getElementById('btn-resume').onclick=()=>{state='playing';showScreen(null);};
document.getElementById('btn-pause-inv').onclick=()=>{state='inventory';renderInventory();showScreen('inventory-screen');};
document.getElementById('btn-quit').onclick=()=>{state='menu';showScreen('menu-screen');document.getElementById('hud').classList.add('hidden');};
document.getElementById('btn-close-inv').onclick=()=>{
  state='playing';showScreen(null);combineMode=false;combineFirst=-1;invSelected=-1;
};

document.getElementById('btn-retry').onclick=()=>{
  loadRoom(currentChapter,currentRoom);P.hp=P.maxHp;state='playing';showScreen(null);document.getElementById('hud').classList.remove('hidden');
};
document.getElementById('btn-go-menu').onclick=()=>{state='menu';showScreen('menu-screen');document.getElementById('hud').classList.add('hidden');};

document.getElementById('btn-next-chapter').onclick=()=>{
  P.chKills=0;P.chDmg=0;P.chDocs=0;P.chStart=Date.now();
  if(currentChapter<4){
    currentChapter++;currentRoom=0;
    loadRoom(currentChapter,currentRoom);
    state='playing';showScreen(null);document.getElementById('hud').classList.remove('hidden');
    sfx('door');
  }else{
    triggerEnding();
  }
};
document.getElementById('btn-save-continue').onclick=()=>{
  saveGame();
  if(currentChapter<4){
    currentChapter++;currentRoom=0;P.chKills=0;P.chDmg=0;P.chDocs=0;P.chStart=Date.now();
    loadRoom(currentChapter,currentRoom);
  }
  state='playing';showScreen(null);document.getElementById('hud').classList.remove('hidden');
};

document.getElementById('btn-end-menu').onclick=()=>{state='menu';showScreen('menu-screen');document.getElementById('hud').classList.add('hidden');
  document.getElementById('total-coins').querySelector('span').textContent=getCoins();};

// Rewarded ad
document.getElementById('btn-watch-ad').onclick=()=>showRewardedAd('gameover');
document.getElementById('btn-watch-ad-cc').onclick=()=>showRewardedAd('chapter');

function showRewardedAd(from){
  state='rewarded_ad';showScreen('rewarded-ad-screen');
  let progress=0;
  const bar=document.getElementById('reward-bar');
  const status=document.getElementById('reward-status');
  const closeBtn=document.getElementById('btn-close-reward');
  closeBtn.classList.add('hidden');
  
  const iv=setInterval(()=>{
    progress+=2;
    bar.style.width=progress+'%';
    if(progress>=100){
      clearInterval(iv);
      status.textContent='Reward ready!';
      closeBtn.classList.remove('hidden');
      closeBtn.onclick=()=>{
        // Apply reward
        if(from==='gameover'){
          P.hp=P.maxHp;weapons.forEach(w=>{if(!w.melee){w.ammo=w.maxAmmo;w.reserve+=w.maxAmmo*2;}});
          loadRoom(currentChapter,currentRoom);state='playing';showScreen(null);document.getElementById('hud').classList.remove('hidden');
        }else{
          P.xp+=50;showMessage('+50 XP bonus!');
          state='chapter_complete';showScreen('chapter-complete-screen');
        }
      };
    }else{
      status.textContent='Watching ad... '+progress+'%';
    }
  },60);
}

// Interstitial ad between chapters
function showInterstitial(){
  state='ad';showScreen('ad-screen');
  let t=5;
  const timerEl=document.getElementById('ad-timer-num');
  const skipBtn=document.getElementById('btn-skip-ad');
  skipBtn.classList.add('hidden');timerEl.textContent=t;
  const iv=setInterval(()=>{
    t--;timerEl.textContent=t;
    if(t<=0){clearInterval(iv);skipBtn.classList.remove('hidden');
      skipBtn.onclick=()=>{state='playing';showScreen(null);document.getElementById('hud').classList.remove('hidden');};
    }
  },1000);
}

// Check for save on load
if(loadGame()){
  showEl('btn-continue');
}

document.getElementById('total-coins').querySelector('span').textContent=getCoins();

// Count total documents
totalDocuments=0;
for(let ch=0;ch<5;ch++){
  for(let rm=0;rm<CHAPTERS[ch].rooms.length;rm++){
    totalDocuments+=buildRoom(ch,rm).documents.length;
  }
}

// Start
gameLoop();
})();
