// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('iron-siege'); } catch(e) {}

// IRON SIEGE - NGN4 Game #37 - Tank Battle
(function(){
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
canvas.width=900;canvas.height=700;
const MAP_W=1800,MAP_H=1400;

let audioCtx=null;function getAudioCtx(){if(!audioCtx)try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}return audioCtx;}
function snd(f,d,t='square',v=0.08){if(!getAudioCtx())return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+d);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d);}
function cannonSnd(){snd(100,0.3,'sawtooth',0.12);snd(60,0.4,'square',0.08);}
function hitSnd(){snd(200,0.1,'sawtooth',0.06);}
function explodeSnd(){snd(60,0.5,'sawtooth',0.15);}
function pickupSnd(){snd(500,0.1,'sine',0.08);setTimeout(()=>snd(800,0.1,'sine',0.08),80);}
function coinSnd(){snd(1000,0.08,'sine',0.06);}
function reloadSnd(){snd(300,0.15,'square',0.05);}

function getCoins(){try{const d=JSON.parse(localStorage.getItem('ngn4_rewards')||'{}');return d.coins||0;}catch(e){return 0;}}
function saveCoins(c){try{const d=JSON.parse(localStorage.getItem('ngn4_rewards')||'{}');d.coins=c;localStorage.setItem('ngn4_rewards',JSON.stringify(d));}catch(e){}}

let state='menu',missionIdx=0,score=0,kills=0,friendlyLosses=0;
let upgrades={dmg:0,armor:0,speed:0,ammoMax:0,reload:0};
const upgradeCosts=[60,120,250,500,1000];

// Tank types
const tankTypes={
  light:{name:'Light Tank',hp:60,armor:10,speed:3.5,dmg:8,ammo:8,reload:45,size:14,color:'#0f0'},
  medium:{name:'Medium Tank',hp:100,armor:20,speed:2.5,dmg:15,ammo:6,reload:60,size:17,color:'#0ff'},
  heavy:{name:'Heavy Tank',hp:180,armor:40,speed:1.5,dmg:25,ammo:4,reload:90,size:22,color:'#f80'},
  artillery:{name:'Artillery',hp:70,armor:10,speed:1.2,dmg:40,ammo:3,reload:120,size:18,color:'#ff0',range:400},
  scout:{name:'Scout',hp:40,armor:5,speed:4.5,dmg:5,ammo:10,reload:30,size:11,color:'#aaf'},
  super:{name:'Super Tank',hp:250,armor:50,speed:2,dmg:35,ammo:8,reload:50,size:26,color:'#f0f'}
};

// 20 Missions
const missions=[];
const mDescs=[
  "Scout the forward area. Eliminate enemy recon units.",
  "Push through enemy lines. Destroy all resistance.",
  "Escort the supply convoy through hostile territory.",
  "Capture the enemy outpost. Secure the crossroads.",
  "Defend HQ from incoming armor assault.",
  "Forest warfare. Enemy ambush in the woods.",
  "Bridge assault. Secure the crossing point.",
  "Urban combat. Clear the town sector by sector.",
  "Night raid. Strike before dawn.",
  "Heavy armor engagement. Enemy sends their best.",
  "Artillery barrage support. Take the high ground.",
  "Swamp crossing. Navigate the treacherous terrain.",
  "Factory assault. Destroy enemy production.",
  "Deep penetration. Get behind enemy lines.",
  "Last stand. Defend until reinforcements arrive.",
  "Mountain pass. Bottleneck warfare.",
  "Enemy headquarters assault. Full assault.",
  "Train ambush. Destroy the armored train.",
  "Super weapon facility. Stop the doomsday device.",
  "Final battle. End the Iron War once and for all."
];
const mObjs=[
  "Destroy 4 enemy tanks","Destroy 6 enemy tanks","Escort convoy, destroy 5 enemies","Capture 2 bases, destroy 4 tanks",
  "Survive 3 waves, protect HQ","Destroy 8 enemies in forest","Capture bridge, destroy 6 tanks","Clear 10 enemies from town",
  "Destroy 6 enemies (limited visibility)","Destroy 3 heavy tanks","Capture hill, destroy 8 enemies","Navigate swamp, destroy 5",
  "Destroy factory + 7 enemies","Destroy 10 enemies behind lines","Survive 5 waves","Destroy 6 enemies in pass",
  "Capture HQ, destroy 10 enemies","Destroy armored train","Destroy facility","Destroy everything. Win the war."
];
for(let i=0;i<20;i++){
  const enemyCount=4+Math.floor(i*0.8);
  const hasBase=i%3===2||i>=15;
  missions.push({
    name:'Battlefield '+(i+1),desc:mDescs[i],obj:mObjs[i],
    enemyCount:enemyCount,basesToCapture:hasBase?(i>=15?3:2):0,
    enemyType:i<5?'light':i<10?'medium':i<15?'heavy':'mixed',
    tankType:i<3?'light':i<8?'medium':i<13?'heavy':i<18?'artillery':'super',
    terrain:i%5
  });
}

// Game vars
let player,cam,bullets,enemies,friendlies,terrain,tiles,bases,buildings,pickups,particles;
let keys={},mouse={x:450,y:350,down:false};
let reloadTimer=0,shakeT=0,shakeA=0,gameTimer=0;
let enemiesLeft=0,basesCaptured=0,totalBases=0,missionDone=false;

// Mobile touch
let isTouchJoy={active:false,id:null,sx:0,sy:0,dx:0,dy:0};
let isTouchFire=false,isTouchMine=false;
let lbMinePrev=false;// track previous gamepad mine button state

// Gamepad
let isGPConnected=false;
window.addEventListener('gamepadconnected',()=>isGPConnected=true);
window.addEventListener('gamepaddisconnected',()=>isGPConnected=false);
function getISGP(){return navigator.getGamepads?navigator.getGamepads()[0]:null;}

// Mines
let mines=[];let mineCount=0;const MAX_MINES=5;

// Achievements
const IS_ACHIEVE={
  oneManArmy:{name:'One Man Army',desc:'Complete a mission solo'},
  mineExpert:{name:'Mine Expert',desc:'Kill 3 enemies with mines'},
  unscathed:{name:'Unscathed',desc:'Complete without damage'},
  allGold:{name:'All Medals Gold',desc:'Gold on 10 missions'}
};
let isAchData=JSON.parse(localStorage.getItem('ngn4_ach_37')||'{}');
let isTotalKills=0,isMineKills=0,isMissionsPlayed=0;

function initMission(){
  const m=missions[missionIdx];
  const tt=tankTypes[m.tankType];
  const hp=tt.hp+upgrades.armor*25;
  const sp=tt.speed+upgrades.speed*0.2;
  const dm=tt.dmg+upgrades.dmg*5;
  const am=tt.ammo+upgrades.ammoMax;
  const rl=Math.max(15,tt.reload-upgrades.reload*8);
  player={x:100,y:MAP_H/2,bodyAngle:0,turretAngle:0,vx:0,vy:0,
    hp:hp,maxHp:hp,armor:tt.armor+upgrades.armor*5,
    speed:sp,dmg:dm,ammo:am,maxAmmo:am,reloadTime:rl,reloadTimer:0,
    size:tt.size,color:tt.color,name:tt.name,type:m.tankType,invuln:0};
  cam={x:0,y:0};
  bullets=[];enemies=[];friendlies=[];pickups=[];particles=[];
  kills=0;friendlyLosses=0;gameTimer=0;missionDone=false;
  reloadTimer=0;basesCaptured=0;mines=[];mineCount=3+missionIdx;

  // Generate terrain tiles
  tiles=[];terrain=[];
  for(let tx=0;tx<MAP_W/40;tx++){
    tiles[tx]=[];terrain[tx]=[];
    for(let ty=0;ty<MAP_H/40;ty++){
      terrain[tx][ty]=0;
      if(m.terrain===1&&Math.random()<0.15)terrain[tx][ty]=2;//forest
      if(m.terrain===2&&Math.random()<0.08)terrain[tx][ty]=3;//water
      if(m.terrain===3&&Math.random()<0.2)terrain[tx][ty]=1;//buildings
      if(m.terrain===4){if(Math.random()<0.1)terrain[tx][ty]=2;if(Math.random()<0.1)terrain[tx][ty]=3;if(Math.random()<0.1)terrain[tx][ty]=1;}
      // Border water
      if(tx<2||tx>=MAP_W/40-2||ty<2||ty>=MAP_H/40-2)terrain[tx][ty]=3;
    }
  }

  // Buildings (destructible)
  buildings=[];
  for(let tx=3;tx<MAP_W/40-3;tx++){
    for(let ty=3;ty<MAP_H/40-3;ty++){
      if(terrain[tx][ty]===1)buildings.push({x:tx*40+20,y:ty*40+20,hp:40,maxHp:40,tx:tx,ty:ty});
    }
  }

  // Bases
  bases=[];totalBases=m.basesToCapture;
  for(let i=0;i<m.basesToCapture;i++){
    let bx,by;
    do{bx=400+Math.random()*(MAP_W-800);by=200+Math.random()*(MAP_H-400);}
    while(terrain[Math.floor(bx/40)]&&terrain[Math.floor(bx/40)][Math.floor(by/40)]===3);
    bases.push({x:bx,y:by,radius:50,owner:'enemy',captureProgress:0,side:50});
  }

  // Spawn enemies
  enemiesLeft=m.enemyCount;
  for(let i=0;i<m.enemyCount;i++){
    const types=m.enemyType==='mixed'?['light','medium','heavy','scout']:m.enemyType==='light'?['light','scout']:m.enemyType==='heavy'?['heavy','medium']:['medium','medium'];
    const et=tankTypes[types[Math.floor(Math.random()*types.length)]];
    let ex,ey;
    do{ex=MAP_W-200+Math.random()*200-Math.random()*600;ey=100+Math.random()*(MAP_H-200);}
    while(terrain[Math.floor(ex/40)]&&terrain[Math.floor(ex/40)][Math.floor(ey/40)]===3);
    enemies.push({
      x:ex,y:ey,bodyAngle:Math.random()*Math.PI*2,turretAngle:0,
      hp:et.hp*0.7,maxHp:et.hp*0.7,speed:et.speed*0.7,dmg:et.dmg*0.6,
      reloadTime:et.reload+20,reloadTimer:Math.random()*et.reload,
      size:et.size,color:et.color,name:et.name,ai:'patrol',patrolAngle:Math.random()*Math.PI*2,
      fireRange:m.enemyType==='artillery'?350:250
    });
  }

  // Spawn friendlies
  if(missionIdx>=2){
    const fc=1+Math.floor(missionIdx/5);
    for(let i=0;i<fc;i++){
      const ft=tankTypes['light'];
      friendlies.push({
        x:80+Math.random()*100,y:MAP_H/2-100+i*100,
        bodyAngle:0,turretAngle:0,hp:ft.hp,maxHp:ft.hp,
        speed:ft.speed,dmg:ft.dmg*0.6,reloadTime:ft.reload+10,reloadTimer:0,
        size:ft.size,color:'#0a0',name:'Ally',fireTimer:0,target:null
      });
    }
  }
}

function addParticle(x,y,color,count){
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,s=1+Math.random()*5;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:20+Math.random()*30,maxLife:50,color,size:2+Math.random()*4});
  }
}

function isBlocked(x,y){
  const tx=Math.floor(x/40),ty=Math.floor(y/40);
  if(tx<0||tx>=MAP_W/40||ty<0||ty>=MAP_H/40)return true;
  return terrain[tx][ty]===1||terrain[tx][ty]===3;
}

function damageTank(tank,dmg,fromPlayer){
  let d=dmg;
  if(tank.armor)d=Math.max(1,d-tank.armor*0.3);
  tank.hp-=d;
  if(fromPlayer&&tank.invuln!==undefined)tank.invuln=5;
  addParticle(tank.x,tank.y,'#ff0',3);
  hitSnd();
  if(tank.hp<=0){
    explodeSnd();addParticle(tank.x,tank.y,'#f80',20);addParticle(tank.x,tank.y,'#ff0',15);addParticle(tank.x,tank.y,'#f00',10);
    if(fromPlayer){kills++;score+=15;}
    return true;
  }
  return false;
}

function update(){
  if(state!=='playing')return;
  gameTimer++;

  // Player movement
  let dx=0,dy=0;
  if(keys['w']||keys['arrowup'])dy=-1;
  if(keys['s']||keys['arrowdown'])dy=1;
  if(keys['a']||keys['arrowleft'])dx=-1;
  if(keys['d']||keys['arrowright'])dx=1;
  // Touch joystick
  if(isTouchJoy.active){dx+=isTouchJoy.dx;dy+=isTouchJoy.dy;}
  // Gamepad
  const igp=getISGP();
  if(igp){
    dx+=(Math.abs(igp.axes[0])>0.15?igp.axes[0]:0);
    dy+=(Math.abs(igp.axes[1])>0.15?igp.axes[1]:0);
  }
  if(dx||dy){
    const len=Math.sqrt(dx*dx+dy*dy);dx/=len;dy/=len;
    const ma=Math.atan2(dy,dx);
    player.bodyAngle+=(ma-player.bodyAngle+Math.PI*3)%(Math.PI*2)-Math.PI;
    // Terrain speed modifiers
    let speedMod=1;
    const ptx=Math.floor(player.x/40),pty=Math.floor(player.y/40);
    if(ptx>=0&&ptx<MAP_W/40&&pty>=0&&pty<MAP_H/40){
      if(terrain[ptx][pty]===2)speedMod=0.5; // forest slows
      if(terrain[ptx][pty]===3)speedMod=0; // water impassable
    }
    if(speedMod===0){/* stuck */}
    else{
      const nx=player.x+dx*player.speed*speedMod,ny=player.y+dy*player.speed*speedMod;
      if(!isBlocked(nx,player.y))player.x=nx;
      if(!isBlocked(player.x,ny))player.y=ny;
    }
    player.x=Math.max(20,Math.min(MAP_W-20,player.x));
    player.y=Math.max(20,Math.min(MAP_H-20,player.y));
  }

  // Turret aim
  if(igp&&igp.axes[2]!==undefined){
    player.turretAngle=Math.atan2(igp.axes[3]||0,igp.axes[2]||0);
  }else{
  const wmx=mouse.x+cam.x,wmy=mouse.y+cam.y;
  player.turretAngle=Math.atan2(wmy-player.y,wmx-player.x);
  }

  // Reload
  if(player.reloadTimer>0)player.reloadTimer--;
  if(player.ammo<=0)player.reloadTimer=player.reloadTime;
  if(keys['r']&&player.ammo<player.maxAmmo)player.reloadTimer=player.reloadTime;

  // Camera
  cam.x=player.x-450;cam.y=player.y-350;
  cam.x=Math.max(0,Math.min(MAP_W-900,cam.x));
  cam.y=Math.max(0,Math.min(MAP_H-700,cam.y));

  // Player fire
  if((mouse.down||isTouchFire||((igp)&&(igp.buttons[7]?.pressed)))&&player.reloadTimer<=0&&player.ammo>0){
    cannonSnd();
    player.ammo--;player.reloadTimer=player.reloadTime;
    const bs=8;
    bullets.push({x:player.x+Math.cos(player.turretAngle)*player.size,
      y:player.y+Math.sin(player.turretAngle)*player.size,
      vx:Math.cos(player.turretAngle)*bs,vy:Math.sin(player.turretAngle)*bs,
      dmg:player.dmg,owner:'player',life:80,size:4,color:'#ff0'});
    if(player.reloadTimer===player.reloadTime)reloadSnd();
  }

  // Mine placement
  if((keys['m']||isTouchMine||((igp)&&(igp.buttons[4]?.pressed&&!lbMinePrev)))&&mineCount>0){
    lbMinePrev=igp?igp.buttons[4]?.pressed:false;
    mines.push({x:player.x,y:player.y,owner:'player',life:1200});
    mineCount--;
    pickupSnd();
    isTouchMine=false;
  }

  // Mine explosions
  for(let i=mines.length-1;i>=0;i--){
    const m=mines[i];m.life--;
    if(m.life<=0){mines.splice(i,1);continue;}
    // Check enemy collision with mines
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];if(e.hp<=0)continue;
      if(Math.hypot(m.x-e.x,m.y-e.y)<25){
        explodeSnd();addParticle(m.x,m.y,'#f80',20);addParticle(m.x,m.y,'#ff0',15);
        // Damage all nearby enemies
        for(const ne of enemies){
          if(ne.hp>0&&Math.hypot(m.x-ne.x,m.y-ne.y)<80){
            if(damageTank(ne,60,true)){
              enemiesLeft--;score+=15;
              if(Math.random()<0.2)pickups.push({x:ne.x,y:ne.y,type:'ammo',life:600});
            }
          }
        }
        isMineKills++;
        mines.splice(i,1);
        break;
      }
    }
  }

  // Friendly AI
  friendlies.forEach(f=>{
    if(f.hp<=0)return;
    let near=null,nd=Infinity;
    enemies.forEach(e=>{if(e.hp<=0)return;const d=Math.hypot(e.x-f.x,e.y-f.y);if(d<nd){nd=d;near=e;}});
    if(near&&nd<300){
      const ta=Math.atan2(near.y-f.y,near.x-f.x);
      f.turretAngle+=(ta-f.turretAngle+Math.PI*3)%(Math.PI*2)-Math.PI;
      const nx=f.x+Math.cos(ta)*f.speed*0.7;
      const ny=f.y+Math.sin(ta)*f.speed*0.7;
      if(!isBlocked(nx,f.y))f.x=nx;
      if(!isBlocked(f.x,ny))f.y=ny;
      f.bodyAngle=ta;
      f.fireTimer--;
      if(f.fireTimer<=0&&nd<250){
        bullets.push({x:f.x+Math.cos(f.turretAngle)*f.size,y:f.y+Math.sin(f.turretAngle)*f.size,
          vx:Math.cos(f.turretAngle)*7,vy:Math.sin(f.turretAngle)*7,
          dmg:f.dmg,owner:'friendly',life:60,size:3,color:'#0f0'});
        f.fireTimer=f.reloadTime;
      }
    }else{
      f.x+=(player.x-f.x)*0.01;f.y+=(player.y-f.y)*0.01;
    }
  });

  // Enemy AI
  enemies.forEach(e=>{
    if(e.hp<=0)return;
    e.reloadTimer--;
    const pd=Math.hypot(e.x-player.x,e.y-player.y);
    
    if(e.ai==='patrol'){
      e.x+=Math.cos(e.patrolAngle)*e.speed*0.5;
      e.y+=Math.sin(e.patrolAngle)*e.speed*0.5;
      if(Math.random()<0.01)e.patrolAngle+=Math.random()*1-0.5;
      if(isBlocked(e.x,e.y))e.patrolAngle+=Math.PI;
      if(pd<e.fireRange)e.ai='engage';
    }
    if(e.ai==='engage'){
      const ta=Math.atan2(player.y-e.y,player.x-e.x);
      e.turretAngle+=(ta-e.turretAngle+Math.PI*3)%(Math.PI*2)-Math.PI;
      if(pd>e.fireRange*0.6){
        const nx=e.x+Math.cos(ta)*e.speed;const ny=e.y+Math.sin(ta)*e.speed;
        if(!isBlocked(nx,e.y))e.x=nx;
        if(!isBlocked(e.x,ny))e.y=ny;
        e.bodyAngle=ta;
      }
      if(e.reloadTimer<=0&&pd<e.fireRange){
        bullets.push({x:e.x+Math.cos(e.turretAngle)*e.size,y:e.y+Math.sin(e.turretAngle)*e.size,
          vx:Math.cos(e.turretAngle)*6,vy:Math.sin(e.turretAngle)*6,
          dmg:e.dmg,owner:'enemy',life:70,size:3,color:'#f44'});
        e.reloadTimer=e.reloadTime;
      }
      if(pd>e.fireRange*2)e.ai='patrol';
    }
    e.x=Math.max(20,Math.min(MAP_W-20,e.x));
    e.y=Math.max(20,Math.min(MAP_H-20,e.y));
  });

  // Bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];b.x+=b.vx;b.y+=b.vy;b.life--;
    if(b.life<=0){bullets.splice(i,1);continue;}
    // Hit buildings
    let hitBuilding=false;
    for(let j=buildings.length-1;j>=0;j--){
      const bd=buildings[j];
      if(bd.hp<=0)continue;
      if(Math.hypot(b.x-bd.x,b.y-bd.y)<25){
        bd.hp-=b.dmg;hitBuilding=true;
        addParticle(b.x,b.y,'#a85',3);
        if(bd.hp<=0){
          terrain[bd.tx][bd.ty]=0;
          addParticle(bd.x,bd.y,'#f80',15);
          explodeSnd();
        }
        break;
      }
    }
    if(hitBuilding||isBlocked(b.x,b.y)){bullets.splice(i,1);continue;}
    
    // Hit player
    if(b.owner==='enemy'){
      if(Math.hypot(b.x-player.x,b.y-player.y)<player.size){
        damageTank(player,b.dmg,false);shakeT=8;shakeA=4;
        if(player.hp<=0)gameOver();
        bullets.splice(i,1);continue;
      }
      // Hit friendlies
      for(let f of friendlies){
        if(f.hp<=0)continue;
        if(Math.hypot(b.x-f.x,b.y-f.y)<f.size){
          if(damageTank(f,b.dmg,false)){friendlyLosses++;}
          bullets.splice(i,1);break;
        }
      }
    }
    // Hit enemies
    if(b.owner==='player'||b.owner==='friendly'){
      for(let j=enemies.length-1;j>=0;j--){
        const e=enemies[j];
        if(e.hp<=0)continue;
        if(Math.hypot(b.x-e.x,b.y-e.y)<e.size){
          const killed=damageTank(e,b.dmg,b.owner==='player');
          if(killed){
            enemiesLeft--;
            score+=b.owner==='player'?15:5;
            if(Math.random()<0.3)pickups.push({x:e.x,y:e.y,type:Math.random()<0.5?'ammo':'health',life:600});
          }
          bullets.splice(i,1);break;
        }
      }
    }
  }

  // Base capture
  bases.forEach(b=>{
    if(b.owner==='player')return;
    const d=Math.hypot(b.x-player.x,b.y-player.y);
    if(d<b.radius+30){
      b.captureProgress++;
      if(b.captureProgress>=120){b.owner='player';basesCaptured++;score+=50;}
    }else{
      b.captureProgress=Math.max(0,b.captureProgress-0.5);
    }
  });

  // Particles
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.life--;p.vx*=0.95;p.vy*=0.95;
    if(p.life<=0)particles.splice(i,1);
  }

  // Pickups
  for(let i=pickups.length-1;i>=0;i--){
    const p=pickups[i];p.life--;
    if(p.life<=0){pickups.splice(i,1);continue;}
    if(Math.hypot(p.x-player.x,p.y-player.y)<30){
      pickupSnd();
      if(p.type==='health')player.hp=Math.min(player.maxHp,player.hp+30);
      if(p.type==='ammo')player.ammo=player.maxAmmo;
      pickups.splice(i,1);
    }
  }

  if(shakeT>0)shakeT--;

  // HUD
  document.getElementById('hud-hp').textContent=Math.ceil(player.hp);
  document.getElementById('hud-ammo').textContent=player.ammo;
  document.getElementById('hud-max-ammo').textContent=player.maxAmmo;
  document.getElementById('hud-reload').textContent=player.reloadTimer>0?'RELOADING...':'READY';
  document.getElementById('hud-reload').style.color=player.reloadTimer>0?'#f80':'#0f0';
  document.getElementById('hud-kills').textContent=kills;
  document.getElementById('hud-bases').textContent=basesCaptured+'/'+totalBases;
  document.getElementById('hud-coins').textContent=getCoins();
  document.getElementById('hud-tank-type').textContent=player.name.toUpperCase();

  // Check win
  if(enemiesLeft<=0&&basesCaptured>=totalBases&&!missionDone){
    missionDone=true;
    isMissionsPlayed++;
    // Achievements
    if(player.hp>=player.maxHp&&isAchData.unscathed===undefined){
      isAchData.unscathed=true;localStorage.setItem('ngn4_ach_37',JSON.stringify(isAchData));
    }
    if(friendlyLosses===0&&isAchData.oneManArmy===undefined){
      isAchData.oneManArmy=true;localStorage.setItem('ngn4_ach_37',JSON.stringify(isAchData));
    }
    if(isMineKills>=3&&isAchData.mineExpert===undefined){
      isAchData.mineExpert=true;localStorage.setItem('ngn4_ach_37',JSON.stringify(isAchData));
    }
    setTimeout(missionComplete,1000);
  }
}

function gameOver(){
  state='result';
  const earned=kills*15;
  saveCoins(getCoins()+earned);
  document.getElementById('result-title').textContent='DEFEAT';
  document.getElementById('result-title').style.color='#f44';
  document.getElementById('result-stats').innerHTML=`<p>Kills: <span>${kills}</span></p><p>Losses: <span>${friendlyLosses}</span></p><p>Score: <span>${score}</span></p>`;
  document.getElementById('result-medal').textContent='';
  document.getElementById('result-coins').textContent='+'+earned;
  showScreen('result-screen');document.getElementById('hud').classList.add('hidden');
}

function missionComplete(){
  state='result';
  const noLoss=friendlyLosses===0?50:0;
  const medal=kills>=enemies.length&&noLoss>0?'GOLD':kills>=enemies.length*0.7?'SILVER':'BRONZE';
  const medalBonus=medal==='GOLD'?100:medal==='SILVER'?50:25;
  const earned=kills*15+100+noLoss+medalBonus;
  saveCoins(getCoins()+earned);
  document.getElementById('result-title').textContent='VICTORY';
  document.getElementById('result-title').style.color='#0f0';
  document.getElementById('result-stats').innerHTML=`<p>Kills: <span>${kills}</span></p><p>Losses: <span>${friendlyLosses}</span></p><p>Score: <span>${score}</span></p><p>No-Loss Bonus: <span>+${noLoss}</span></p>`;
  const mc=medal==='GOLD'?'#ff0':medal==='SILVER'?'#ccc':'#a85';
  document.getElementById('result-medal').innerHTML=`<span style="color:${mc};font-size:28px">MEDAL: ${medal}</span>`;
  document.getElementById('result-coins').textContent='+'+earned;
  const nextBtn=document.getElementById('btn-next');
  nextBtn.textContent=missionIdx>=19?'VICTORY!':'NEXT BATTLE';
  showScreen('result-screen');document.getElementById('hud').classList.add('hidden');
}

function render(){
  ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,900,700);
  if(!player)return;
  let sx=0,sy=0;
  if(shakeT>0){sx=(Math.random()-0.5)*shakeA;sy=(Math.random()-0.5)*shakeA;}
  ctx.save();ctx.translate(-cam.x+sx,-cam.y+sy);

  // Terrain tiles
  for(let tx=Math.max(0,Math.floor(cam.x/40));tx<Math.min(MAP_W/40,Math.ceil((cam.x+900)/40));tx++){
    for(let ty=Math.max(0,Math.floor(cam.y/40));ty<Math.min(MAP_H/40,Math.ceil((cam.y+700)/40));ty++){
      const t=terrain[tx][ty];
      if(t===0)ctx.fillStyle='#1a1a12';
      else if(t===2){ctx.fillStyle='#0a2a0a';}
      else if(t===3){ctx.fillStyle='#0a1a2a';}
      else if(t===1){ctx.fillStyle='#2a1a0a';}
      ctx.fillRect(tx*40,ty*40,40,40);
      if(t===2){// Trees
        ctx.fillStyle='#0f0';
        ctx.beginPath();ctx.arc(tx*40+20,ty*40+15,6,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#2a0a0a';
        ctx.fillRect(tx*40+18,ty*40+20,4,8);
      }
      ctx.strokeStyle='rgba(255,255,255,0.03)';ctx.strokeRect(tx*40,ty*40,40,40);
    }
  }

  // Bases
  bases.forEach(b=>{
    ctx.strokeStyle=b.owner==='player'?'#0f0':'#f00';
    ctx.lineWidth=2;ctx.setLineDash([5,5]);
    ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
    if(b.captureProgress>0){
      ctx.fillStyle='rgba(0,255,0,0.2)';
      ctx.beginPath();ctx.arc(b.x,b.y,b.radius*(b.captureProgress/120),0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle=b.owner==='player'?'#0f0':'#f00';ctx.font='10px monospace';
    ctx.fillText(b.owner==='player'?'CAPTURED':'CAPTURE',b.x-25,b.y+4);
  });

  // Pickups
  pickups.forEach(p=>{
    ctx.fillStyle=p.type==='health'?'#0f0':'#ff0';
    ctx.beginPath();ctx.arc(p.x,p.y,8+Math.sin(Date.now()/200)*2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.font='bold 10px monospace';
    ctx.fillText(p.type==='health'?'+':'A',p.x-3,p.y+4);
  });

  // Friendlies
  friendlies.forEach(f=>{
    if(f.hp<=0)return;
    ctx.save();ctx.translate(f.x,f.y);
    ctx.rotate(f.bodyAngle);ctx.fillStyle=f.color;
    ctx.fillRect(-f.size,-f.size*0.7,f.size*2,f.size*1.4);
    ctx.rotate(f.turretAngle-f.bodyAngle);
    ctx.fillStyle='#0a0';ctx.fillRect(0,-2,f.size+5,4);
    ctx.restore();
    if(f.hp<f.maxHp){
      ctx.fillStyle='#333';ctx.fillRect(f.x-15,f.y-f.size-10,30,3);
      ctx.fillStyle='#0f0';ctx.fillRect(f.x-15,f.y-f.size-10,30*(f.hp/f.maxHp),3);
    }
  });

  // Mines
  mines.forEach(m=>{
    ctx.fillStyle=m.life<300?'#ff0':'#a00';
    ctx.beginPath();ctx.arc(m.x,m.y,6,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#f80';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(m.x,m.y,10,0,Math.PI*2);ctx.stroke();
    ctx.lineWidth=1;
  });

  // Enemy fog of war - only show if within player vision
  const visionRange=350;
  const turretDir=player.turretAngle;
  enemies.forEach(e=>{
    if(e.hp<=0)return;
    const d=Math.hypot(e.x-player.x,e.y-player.y);
    const angToE=Math.atan2(e.y-player.y,e.x-player.x);
    let angDiff=Math.abs(angToE-turretDir);
    if(angDiff>Math.PI)angDiff=Math.PI*2-angDiff;
    const inVision=d<visionRange&&(angDiff<Math.PI/2.5||d<visionRange*0.4);
    if(!inVision)return;// skip rendering - fog of war
    ctx.save();ctx.translate(e.x,e.y);
    ctx.rotate(e.bodyAngle);ctx.fillStyle=e.color;
    ctx.fillRect(-e.size,-e.size*0.7,e.size*2,e.size*1.4);
    ctx.rotate(e.turretAngle-e.bodyAngle);
    ctx.fillStyle='#800';ctx.fillRect(0,-2,e.size+5,4);
    ctx.restore();
    if(e.hp<e.maxHp){
      ctx.fillStyle='#333';ctx.fillRect(e.x-15,e.y-e.size-10,30,3);
      ctx.fillStyle='#f00';ctx.fillRect(e.x-15,e.y-e.size-10,30*(e.hp/e.maxHp),3);
    }
  });

  // Player
  ctx.save();ctx.translate(player.x,player.y);
  ctx.rotate(player.bodyAngle);ctx.fillStyle=player.color;
  ctx.fillRect(-player.size,-player.size*0.7,player.size*2,player.size*1.4);
  ctx.rotate(player.turretAngle-player.bodyAngle);
  ctx.fillStyle='#ff0';ctx.fillRect(0,-3,player.size+8,6);
  ctx.fillStyle='#fff';ctx.fillRect(player.size+3,-2,4,4);
  ctx.restore();
  // Player HP bar
  ctx.fillStyle='#333';ctx.fillRect(player.x-20,player.y-player.size-12,40,4);
  ctx.fillStyle=player.hp>player.maxHp*0.5?'#0f0':player.hp>player.maxHp*0.25?'#ff0':'#f00';
  ctx.fillRect(player.x-20,player.y-player.size-12,40*(player.hp/player.maxHp),4);

  // Bullets
  bullets.forEach(b=>{
    ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.size,0,Math.PI*2);ctx.fill();
  });

  // Particles
  particles.forEach(p=>{
    ctx.globalAlpha=p.life/p.maxLife;ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,p.size*(p.life/p.maxLife),0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;
  ctx.restore();

  // Minimap
  const mmx=10,mmy=700-110,mmw=150,mmh=100;
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(mmx,mmy,mmw,mmh);
  ctx.strokeStyle='#f80';ctx.lineWidth=1;ctx.strokeRect(mmx,mmy,mmw,mmh);
  const sx2=mmw/MAP_W,sy2=mmh/MAP_H;
  bases.forEach(b=>{ctx.fillStyle=b.owner==='player'?'#0f0':'#f00';ctx.fillRect(mmx+b.x*sx2-2,mmy+b.y*sy2-2,5,5);});
  friendlies.forEach(f=>{if(f.hp<=0)return;ctx.fillStyle='#0a0';ctx.fillRect(mmx+f.x*sx2-1,mmy+f.y*sy2-1,3,3);});
  enemies.forEach(e=>{if(e.hp<=0)return;ctx.fillStyle='#f44';ctx.fillRect(mmx+e.x*sx2-1,mmy+e.y*sy2-1,3,3);});
  ctx.fillStyle='#ff0';ctx.fillRect(mmx+player.x*sx2-2,mmy+player.y*sy2-2,5,5);
  ctx.fillStyle='#fff';ctx.font='8px monospace';ctx.fillText('MAP',mmx+5,mmy+10);
  ctx.strokeStyle='#0f0';ctx.strokeRect(mmx+cam.x*sx2,mmy+cam.y*sy2,900*sx2,700*sy2);
  
  // Mines on minimap
  mines.forEach(m=>{ctx.fillStyle='#f80';ctx.fillRect(mmx+m.x*sx2-1,mmy+m.y*sy2-1,3,3);});

  // Objective tracking arrows
  const drawArrow=(tx,ty,color,label)=>{
    const sx=tx-player.x+cam.x,sy=ty-player.y+cam.y;
    if(Math.abs(sx)<50&&Math.abs(sy)<50)return;
    const ang=Math.atan2(sy,sx);
    const ax=450+Math.cos(ang)*60,ay=350+Math.sin(ang)*60;
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(ax+Math.cos(ang)*12,ay+Math.sin(ang)*12);
    ctx.lineTo(ax+Math.cos(ang+2.5)*8,ay+Math.sin(ang+2.5)*8);
    ctx.lineTo(ax+Math.cos(ang-2.5)*8,ay+Math.sin(ang-2.5)*8);ctx.fill();
    ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText(label,ax,ay-12);
  };
  enemies.forEach(e=>{if(e.hp>0&&Math.hypot(e.x-player.x,e.y-player.y)>200)drawArrow(e.x,e.y,'#f44','Enemy');});
  bases.forEach(b=>{if(b.owner!=='player')drawArrow(b.x,b.y,'#0f0','Base');});
  pickups.forEach(p=>{drawArrow(p.x,p.y,'#ff0','Item');});

  // Touch controls
  if('ontouchstart' in window){
    ctx.fillStyle='rgba(255,255,255,0.1)';
    ctx.beginPath();ctx.arc(80,620,40,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(80,620,40,0,Math.PI*2);ctx.stroke();
    if(isTouchJoy.active){ctx.fillStyle='rgba(255,255,255,0.3)';
      ctx.beginPath();ctx.arc(80+isTouchJoy.dx*25,620+isTouchJoy.dy*25,15,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='rgba(255,0,0,0.3)';ctx.beginPath();ctx.arc(820,600,30,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#f44';ctx.lineWidth=2;ctx.beginPath();ctx.arc(820,600,30,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('FIRE',820,604);
    ctx.fillStyle='rgba(255,150,0,0.3)';ctx.beginPath();ctx.arc(820,540,25,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#f80';ctx.lineWidth=2;ctx.beginPath();ctx.arc(820,540,25,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='bold 10px monospace';ctx.fillText('MINE('+mineCount+')',820,544);
    ctx.lineWidth=1;
  }
  ctx.fillStyle='#f80';ctx.font='12px monospace';ctx.textAlign='left';ctx.fillText('MINES: '+mineCount,10,25);
  const isAchKeys=Object.keys(IS_ACHIEVE);
  const isAchDone=isAchKeys.filter(k=>isAchData[k]);
  if(isAchDone.length>0){ctx.fillStyle='#ffcc00';ctx.font='9px monospace';ctx.fillText('🏆 '+isAchDone.length+'/'+isAchKeys.length+' Achievements',10,40);}
}

function gameLoop(){update();render();requestAnimationFrame(gameLoop);}

function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));if(id)document.getElementById(id).classList.add('active');}

function showBrief(){
  if(missionIdx>=20){showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();return;}
  const m=missions[missionIdx];
  document.getElementById('mission-title').textContent=m.name.toUpperCase();
  document.getElementById('mission-desc').textContent=m.desc;
  document.getElementById('mission-obj').textContent='OBJECTIVE: '+m.obj;
  showScreen('mission-brief');
}

function startMission(){
  initMission();
  document.getElementById('hud-mission').textContent=missions[missionIdx].name.toUpperCase();
  state='playing';showScreen(null);
  document.getElementById('hud').classList.remove('hidden');
}

function showAd(){
  state='ad';let t=3;
  document.getElementById('ad-timer').textContent=t;
  showScreen('ad-screen');
  const iv=setInterval(()=>{t--;document.getElementById('ad-timer').textContent=t;
    if(t<=0){clearInterval(iv);player.hp=player.maxHp;player.ammo=player.maxAmmo;player.reloadTimer=0;showBrief();}
  },1000);
}

// Input
document.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;});
document.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*900;mouse.y=(e.clientY-r.top)/r.height*700;});
canvas.addEventListener('mousedown',e=>{mouse.down=true;if(audioCtx.state==='suspended')try{getAudioCtx();if(audioCtx)try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){};}catch(e){}});
canvas.addEventListener('mouseup',()=>{mouse.down=false;});

// Menu buttons
document.getElementById('btn-start').onclick=()=>{missionIdx=0;score=0;showBrief();};
document.getElementById('btn-how').onclick=()=>showScreen('how-screen');
document.getElementById('btn-upgrades').onclick=()=>{renderUpgrades();showScreen('upgrade-screen');};
document.getElementById('btn-back-how').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-back-upgrade').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-launch').onclick=()=>startMission();
document.getElementById('btn-next').onclick=()=>{missionIdx++;if(missionIdx>=20){showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();}else showAd();};
document.getElementById('btn-menu').onclick=()=>{state='menu';showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};

function renderUpgrades(){
  const list=document.getElementById('upgrade-list');
  const ups=[
    {key:'dmg',name:'Cannon Damage',desc:'More damage per shot'},
    {key:'armor',name:'Armor Plating',desc:'More HP and armor'},
    {key:'speed',name:'Engine Upgrade',desc:'Faster movement'},
    {key:'ammoMax',name:'Ammo Capacity',desc:'More rounds per reload'},
    {key:'reload',name:'Autoloader',desc:'Faster reload time'}
  ];
  list.innerHTML='';
  ups.forEach(u=>{
    const lvl=upgrades[u.key];const cost=upgradeCosts[lvl]||999;const canBuy=getCoins()>=cost&&lvl<5;
    const div=document.createElement('div');div.className='upgrade-item';
    div.innerHTML=`<div class="upgrade-info"><div class="upgrade-name">${u.name}</div><div class="upgrade-level">${u.desc} (Lv ${lvl}/5)</div></div>`;
    if(lvl<5){const btn=document.createElement('button');btn.className='upgrade-btn';btn.textContent=cost+' coins';btn.disabled=!canBuy;
      btn.onclick=()=>{if(getCoins()>=cost){saveCoins(getCoins()-cost);upgrades[u.key]++;renderUpgrades();coinSnd();}};div.appendChild(btn);}
    else{const sp=document.createElement('span');sp.style.color='#0f0';sp.textContent='MAX';div.appendChild(sp);}
    list.appendChild(div);
  });
  document.getElementById('upgrade-coins').textContent=getCoins();
}

document.getElementById('menu-coins').textContent=getCoins();
gameLoop();

// Touch handlers
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    const r=canvas.getBoundingClientRect();const x=t.clientX-r.left,y=t.clientY-r.top;
    if(x<160&&y>560){isTouchJoy.active=true;isTouchJoy.id=t.identifier;isTouchJoy.sx=x;isTouchJoy.sy=y;}
    else if(Math.hypot(x-820,y-600)<35)isTouchFire=true;
    else if(Math.hypot(x-820,y-540)<30)isTouchMine=true;
  }
},{passive:false});
canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    if(t.identifier===isTouchJoy.id){
      const r=canvas.getBoundingClientRect();const x=t.clientX-r.left,y=t.clientY-r.top;
      let dx=(x-isTouchJoy.sx)/40,dy=(y-isTouchJoy.sy)/40;
      const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}isTouchJoy.dx=dx;isTouchJoy.dy=dy;
    }
  }
},{passive:false});
canvas.addEventListener('touchend',e=>{
  for(const t of e.changedTouches){
    if(t.identifier===isTouchJoy.id){isTouchJoy.active=false;isTouchJoy.dx=0;isTouchJoy.dy=0;}
  }
  isTouchFire=false;isTouchMine=false;
});
})();
