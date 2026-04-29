// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('outbreak-zone'); } catch(e) {}

// OUTBREAK ZONE - NGN4 Game #38 - Zombie Survival
(function(){
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
canvas.width=900;canvas.height=700;

let AC=null;function getAC(){if(!AC)try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}return AC;}
function snd(f,d,t='square',v=0.06){if(!getAC())return;const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d);}
function gunSnd(w){if(w===0)snd(400,0.08,'square',0.05);else if(w===1)snd(100,0.2,'sawtooth',0.1);else if(w===2)snd(600,0.04,'square',0.04);else if(w===3)snd(350,0.1,'square',0.06);else if(w===4)snd(800,0.15,'sine',0.07);else if(w===5)snd(150,0.05,'sawtooth',0.04);else if(w===6)snd(80,0.3,'sawtooth',0.12);else snd(500,0.03,'square',0.03);}
function explodeSnd(){snd(50,0.5,'sawtooth',0.12);}
function zombieSnd(){snd(80+Math.random()*40,0.2,'sawtooth',0.03);}
function pickupSnd(){snd(600,0.1,'sine',0.08);setTimeout(()=>snd(900,0.1,'sine',0.08),80);}
function coinSnd(){snd(1000,0.08,'sine',0.06);}

function getCoins(){try{const d=JSON.parse(localStorage.getItem('ngn4_rewards')||'{}');return d.coins||0;}catch(e){return 0;}}
function saveCoins(c){try{const d=JSON.parse(localStorage.getItem('ngn4_rewards')||'{}');d.coins=c;localStorage.setItem('ngn4_rewards',JSON.stringify(d));}catch(e){}}

let state='menu',waveIdx=0,totalKills=0,waveKills=0,score=0;
let player,zombies,bullets,barricades,supplies,survivors,particles,bloodStains;
let keys={},mouse={x:450,y:350,down:false};
let fireTimer=0,spawnTimer=0,zombiesRemaining=0,zombiesToSpawn=0;
let nightMode=false,waveTimer=0,barricadeCount=0;
let shakeT=0,shakeA=0;

// Weapons
const weaponDefs=[
  {name:'Pistol',dmg:15,rate:15,ammo:12,maxAmmo:12,reload:40,spread:0.03,bullets:1,color:'#ff0',speed:12,cost:0},
  {name:'Shotgun',dmg:8,rate:30,ammo:6,maxAmmo:6,reload:60,spread:0.15,bullets:5,color:'#f80',speed:10,cost:100},
  {name:'SMG',dmg:8,rate:5,ammo:30,maxAmmo:30,reload:50,spread:0.08,bullets:1,color:'#ff0',speed:14,cost:150},
  {name:'Rifle',dmg:25,rate:20,ammo:20,maxAmmo:20,reload:50,spread:0.02,bullets:1,color:'#fff',speed:16,cost:200},
  {name:'Sniper',dmg:80,rate:50,ammo:5,maxAmmo:5,reload:70,spread:0,bullets:1,color:'#0ff',speed:22,cost:300},
  {name:'Flamethrower',dmg:3,rate:2,ammo:100,maxAmmo:100,reload:80,spread:0.2,bullets:3,color:'#f80',speed:8,cost:250,flame:true},
  {name:'Rocket',dmg:100,rate:60,ammo:3,maxAmmo:3,reload:90,spread:0.02,bullets:1,color:'#f00',speed:7,cost:400,explosive:true},
  {name:'Minigun',dmg:6,rate:2,ammo:100,maxAmmo:100,reload:100,spread:0.1,bullets:1,color:'#ff0',speed:15,cost:500}
];
let ownedWeapons=[true,false,false,false,false,false,false,false];
let currentWeapon=0;

// Zombie types
const zombieTypes={
  walker:{name:'Walker',hp:30,speed:1,dmg:10,size:12,color:'#4a4',score:5,coins:5},
  runner:{name:'Runner',hp:15,speed:2.8,dmg:8,size:10,color:'#a4a',score:8,coins:8},
  tank:{name:'Tank',hp:150,speed:0.6,dmg:25,size:22,color:'#844',score:20,coins:15},
  spitter:{name:'Spitter',hp:20,speed:1.2,dmg:5,size:11,color:'#4a8',score:10,coins:10,ranged:true},
  exploder:{name:'Exploder',hp:25,speed:1.5,dmg:40,size:14,color:'#aa4',score:12,coins:12,explode:true},
  boss:{name:'Boss',hp:500,speed:0.8,dmg:30,size:30,color:'#a00',score:100,coins:100,isBoss:true},
  necromancer:{name:'Necro',hp:80,speed:0.7,dmg:15,size:16,color:'#60a',score:30,coins:25,isNecro:true,spawnTimer:0}
};

// Perks
const PERK_DEFS=[
  {name:'Faster Reload',desc:'-30% reload time',apply:p=>{p.perks.fasterReload=true;}},
  {name:'Extra HP',desc:'+25 max HP',apply:p=>{p.maxHp+=25;p.hp+=25;}},
  {name:'Speed Boost',desc:'+15% movement speed',apply:p=>{p.perks.speedBoost=true;}},
  {name:'Bullet Penetration',desc:'Bullets pierce 1 target',apply:p=>{p.perks.penetration=true;}},
  {name:'Regeneration',desc:'+1 HP every 2s',apply:p=>{p.perks.regeneration=true;}},
  {name:'Scavenger',desc:'Enemies drop more supplies',apply:p=>{p.perks.scavenger=true;}}
];

// Achievements
let achievements={};
try{achievements=JSON.parse(localStorage.getItem('ngn4_oz_ach')||'{}');}catch(e){}
function saveAch(){localStorage.setItem('ngn4_oz_ach',JSON.stringify(achievements));}
function checkAch(id,name){
  if(achievements[id])return;
  achievements[id]=Date.now();
  saveAch();
  if(state==='playing')addNotification('ACHIEVEMENT: '+name);
}

// Wave types
function getWaveType(waveNum){
  if(waveNum%10===0)return 'necromancer';
  if(waveNum%5===0)return 'boss';
  const types=['normal','runner','horde'];
  return types[(waveNum-1)%3]||'normal';
}

// Wave label
function getWaveLabel(type){
  switch(type){
    case 'boss':return 'BOSS WAVE';
    case 'runner':return 'RUNNER WAVE';
    case 'horde':return 'HORDE WAVE';
    case 'necromancer':return 'NECROMANCER WAVE';
    default:return '';
  }
}

// Touch controls
let touchJoy={active:false,baseX:0,baseY:0,dx:0,dy:0,id:null};
let touchFire={active:false,id:null};
let touchBarricade={active:false};
let touchWeaponBtn={active:false,dir:0};

function initGame(){
  const waveNum=waveIdx+1;
  const waveType=getWaveType(waveNum);
  player={x:450,y:350,angle:0,speed:2.8,hp:100,maxHp:100,armor:0,
    weapons:weaponDefs.map(w=>({...w,ammo:w.maxAmmo,reloadTimer:0})),
    invuln:0,perks:{fasterReload:false,speedBoost:false,penetration:false,regeneration:false,scavenger:false},
    regenTimer:0};
  zombies=[];bullets=[];barricades=[];supplies=[];survivors=[];particles=[];bloodStains=[];
  waveKills=0;fireTimer=0;spawnTimer=0;waveTimer=0;
  nightMode=waveIdx%2===1;
  barricadeCount=0;

  // Generate map obstacles
  for(let i=0;i<12;i++){
    const ox=50+Math.random()*800,oy=50+Math.random()*600;
    barricades.push({x:ox,y:oy,w:30+Math.random()*20,h:30+Math.random()*20,hp:60,maxHp:60,type:'metal',placed:true});
  }
  barricadeCount=0;

  // Wave setup based on type
  let baseCount=5+waveNum*3+(nightMode?5:0);
  switch(waveType){
    case 'boss': baseCount=Math.floor(baseCount*0.6); break;
    case 'runner': break;
    case 'horde': baseCount*=3; break;
    case 'necromancer': baseCount=Math.floor(baseCount*0.7); break;
  }
  zombiesToSpawn=baseCount;
  zombiesRemaining=zombiesToSpawn;
  spawnTimer=0;

  // Spawn supplies
  if(waveIdx>0){
    const sc=2+Math.floor(Math.random()*3);
    for(let i=0;i<sc;i++){
      supplies.push({x:50+Math.random()*800,y:50+Math.random()*600,
        type:['health','ammo','coins'][Math.floor(Math.random()*3)],life:600});
    }
  }

  // Spawn survivors occasionally
  if(waveIdx>=3&&survivors.length<2&&Math.random()<0.3){
    survivors.push({x:400+Math.random()*100,y:300+Math.random()*100,hp:60,maxHp:60,
      angle:0,fireTimer:0,speed:1.8});
  }

  updateHUD();
}

function getWeapon(idx){return player.weapons[idx];}

function spawnZombie(){
  const waveNum=waveIdx+1;
  const waveType=getWaveType(waveNum);
  let type='walker';
  const r=Math.random();

  // Override type for special waves
  if(waveType==='runner')type='runner';
  else if(waveType==='boss'&&r<0.15)type='boss';
  else if(waveType==='necromancer'&&r<0.1)type='necromancer';
  else if(waveNum>=18&&r<0.05)type='boss';
  else if(waveNum>=12&&r<0.15)type='tank';
  else if(waveNum>=8&&r<0.25)type='exploder';
  else if(waveNum>=5&&r<0.35)type='spitter';
  else if(r<0.3+waveNum*0.02)type='runner';

  const zt=zombieTypes[type];
  const nightMult=nightMode?1.3:1;
  const side=Math.floor(Math.random()*4);
  let x,y;
  if(side===0){x=Math.random()*900;y=-20;}
  else if(side===1){x=Math.random()*900;y=720;}
  else if(side===2){x=-20;y=Math.random()*700;}
  else{x=920;y=Math.random()*700;}

  zombies.push({
    x,y,type,hp:Math.ceil(zt.hp*(1+waveNum*0.08)*nightMult),maxHp:Math.ceil(zt.hp*(1+waveNum*0.08)*nightMult),
    speed:zt.speed*nightMult,dmg:zt.dmg,size:zt.size,color:zt.color,
    score:zt.score,coins:zt.coins,isBoss:zt.isBoss||false,
    ranged:zt.ranged||false,explode:zt.explode||false,
    isNecro:zt.isNecro||false,necroSpawnTimer:0,
    attackTimer:0,fireTimer:0,angle:0
  });
}

function addParticle(x,y,color,count){
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,s=1+Math.random()*4;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:20+Math.random()*25,maxLife:45,color,size:2+Math.random()*3});
  }
}

function addBlood(x,y){
  bloodStains.push({x:x+(Math.random()-0.5)*10,y:y+(Math.random()-0.5)*10,size:5+Math.random()*10,a:0.3+Math.random()*0.3});
  if(bloodStains.length>200)bloodStains.shift();
}

function addNotification(text){
  notifications.push({text,timer:3,y:350});
}
let notifications=[];

function update(){
  if(state!=='playing')return;
  waveTimer++;

  // Player movement
  let dx=0,dy=0;
  if(keys['w']||keys['arrowup'])dy=-1;
  if(keys['s']||keys['arrowdown'])dy=1;
  if(keys['a']||keys['arrowleft'])dx=-1;
  if(keys['d']||keys['arrowright'])dx=1;
  // Touch joystick
  if(touchJoy.active){dx=touchJoy.dx;dy=touchJoy.dy;}
  if(dx||dy){const l=Math.sqrt(dx*dx+dy*dy);dx/=l;dy/=l;}

  const spd=player.perks.speedBoost?player.speed*1.15:player.speed;
  let nx=player.x+dx*spd,ny=player.y+dy*spd;
  // Barricade collision with sliding
  let blockedX=false,blockedY=false;
  barricades.forEach(b=>{
    if(b.hp<=0)return;
    if(nx>b.x-b.w/2-10&&nx<b.x+b.w/2+10&&ny>b.y-b.h/2-10&&ny<b.y+b.h/2+10){blockedX=true;blockedY=true;}
    else{
      if(nx>b.x-b.w/2-10&&nx<b.x+b.w/2+10&&player.y>b.y-b.h/2-10&&player.y<b.y+b.h/2+10)blockedX=true;
      if(ny>b.y-b.h/2-10&&ny<b.y+b.h/2+10&&player.x>b.x-b.w/2-10&&player.x<b.x+b.w/2+10)blockedY=true;
    }
  });
  if(!blockedX)player.x=nx;
  if(!blockedY)player.y=ny;
  player.x=Math.max(15,Math.min(885,player.x));
  player.y=Math.max(15,Math.min(685,player.y));
  player.angle=Math.atan2(mouse.y-player.y,mouse.x-player.x);
  if(touchJoy.active&&touchFire.active){
    // Auto-aim nearest zombie
    let near=null,nd=Infinity;
    zombies.forEach(z=>{if(z.hp<=0)return;const d=Math.hypot(z.x-player.x,z.y-player.y);if(d<nd){nd=d;near=z;}});
    if(near)player.angle=Math.atan2(near.y-player.y,near.x-player.x);
  }
  if(player.invuln>0)player.invuln--;

  // Regeneration perk
  if(player.perks.regeneration){
    player.regenTimer=(player.regenTimer||0)+1;
    if(player.regenTimer>=120){player.regenTimer=0;player.hp=Math.min(player.maxHp,player.hp+1);}
  }

  // Reload
  const w=getWeapon(currentWeapon);
  const reloadMult=player.perks.fasterReload?0.7:1;
  if(w.reloadTimer>0)w.reloadTimer--;
  if(keys['r']&&w.ammo<w.maxAmmo&&w.reloadTimer<=0)w.reloadTimer=Math.floor(w.reload*reloadMult);
  if(w.ammo<=0&&w.reloadTimer<=0)w.reloadTimer=Math.floor(w.reload*reloadMult);

  // Build barricade
  if((keys['b']||touchBarricade.active)&&barricadeCount<5){
    keys['b']=false;
    touchBarricade.active=false;
    const bx=player.x+Math.cos(player.angle)*40;
    const by=player.y+Math.sin(player.angle)*40;
    barricades.push({x:bx,y:by,w:25,h:25,hp:40,maxHp:40,type:'wood',placed:false});
    barricadeCount++;
    checkAch('builder','Builder');
  }

  // Fire
  fireTimer--;
  const shouldFire=mouse.down||touchFire.active;
  if(shouldFire&&fireTimer<=0&&w.reloadTimer<=0&&w.ammo>0){
    gunSnd(currentWeapon);
    const ba=w.bullets;
    for(let i=0;i<ba;i++){
      const spread=(Math.random()-0.5)*w.spread*2;
      const a=player.angle+spread;
      bullets.push({x:player.x+Math.cos(player.angle)*15,y:player.y+Math.sin(player.angle)*15,
        vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,
        dmg:w.dmg,color:w.color,life:40,size:w.explosive?4:w.flame?3:2,
        owner:'player',explosive:w.explosive||false,flame:w.flame||false,
        pierce:player.perks.penetration?1:0});
    }
    w.ammo--;fireTimer=w.rate;
  }

  // Spawn zombies
  if(zombiesToSpawn>0){
    spawnTimer--;
    if(spawnTimer<=0){
      spawnZombie();zombiesToSpawn--;
      spawnTimer=Math.max(10,40-waveIdx*2);
    }
  }

  // Update survivors
  survivors.forEach(s=>{
    if(s.hp<=0)return;
    let near=null,nd=Infinity;
    zombies.forEach(z=>{const d=Math.hypot(z.x-s.x,z.y-s.y);if(d<nd){nd=d;near=z;}});
    if(near&&nd<250){
      s.angle=Math.atan2(near.y-s.y,near.x-s.x);
      const mx=s.x+Math.cos(s.angle)*s.speed;
      const my=s.y+Math.sin(s.angle)*s.speed;
      let blk=false;
      barricades.forEach(b=>{if(b.hp>0&&mx>b.x-b.w/2-8&&mx<b.x+b.w/2+8&&my>b.y-b.h/2-8&&my<b.y+b.h/2+8)blk=true;});
      if(!blk){s.x=mx;s.y=my;}
      s.fireTimer--;
      if(s.fireTimer<=0&&nd<200){
        bullets.push({x:s.x,y:s.y,vx:Math.cos(s.angle)*10,vy:Math.sin(s.angle)*10,
          dmg:10,color:'#0f0',life:30,size:2,owner:'survivor'});
        s.fireTimer=12;
      }
    }else{
      s.x+=(player.x-s.x)*0.01;s.y+=(player.y-s.y)*0.01;
    }
  });

  // Update zombies
  zombies.forEach(z=>{
    if(z.hp<=0)return;
    z.attackTimer--;

    // Find target
    let tx=player.x,ty=player.y,td=Math.hypot(tx-z.x,ty-z.y);
    survivors.forEach(s=>{
      if(s.hp<=0)return;
      const d=Math.hypot(s.x-z.x,s.y-z.y);
      if(d<td){td=d;tx=s.x;ty=s.y;}
    });

    z.angle=Math.atan2(ty-z.x,tx-z.y);

    // Necromancer spawn
    if(z.isNecro){
      z.necroSpawnTimer=(z.necroSpawnTimer||0)+1;
      if(z.necroSpawnTimer>=180&&zombies.length<30){
        z.necroSpawnTimer=0;
        const sx=z.x+(Math.random()-0.5)*60;
        const sy=z.y+(Math.random()-0.5)*60;
        zombies.push({x:sx,y:sy,type:'walker',hp:Math.ceil(zombieTypes.walker.hp*1.1),maxHp:Math.ceil(zombieTypes.walker.hp*1.1),
          speed:zombieTypes.walker.speed,dmg:zombieTypes.walker.dmg,size:zombieTypes.walker.size,color:zombieTypes.walker.color,
          score:zombieTypes.walker.score,coins:zombieTypes.walker.coins,isBoss:false,ranged:false,explode:false,
          isNecro:false,necroSpawnTimer:0,attackTimer:0,fireTimer:0,angle:0});
        addParticle(sx,sy,'#60a',8);
      }
    }

    // Movement with wall avoidance/sliding
    let mvx=Math.cos(z.angle)*z.speed;
    let mvy=Math.sin(z.angle)*z.speed;
    let canMoveX=true,canMoveY=true;
    const fnx=z.x+mvx,fny=z.y+mvy;

    // Barricade avoidance
    let hitBarricade=false;
    barricades.forEach(b=>{
      if(b.hp<=0)return;
      if(z.x>b.x-b.w/2-z.size&&z.x<b.x+b.w/2+z.size&&z.y>b.y-b.h/2-z.size&&z.y<b.y+b.h/2+z.size){
        hitBarricade=true;
        if(z.attackTimer<=0){b.hp-=z.dmg;z.attackTimer=30;if(b.hp<=0)addParticle(b.x,b.y,'#a85',8);}
      }
    });

    if(!hitBarricade){
      barricades.forEach(b=>{
        if(b.hp<=0)return;
        if(fnx>b.x-b.w/2-z.size&&fnx<b.x+b.w/2+z.size&&z.y>b.y-b.h/2-z.size&&z.y<b.y+b.h/2+z.size)canMoveX=false;
        if(z.x>b.x-b.w/2-z.size&&z.x<b.x+b.w/2+z.size&&fny>b.y-b.h/2-z.size&&fny<b.y+b.h/2+z.size)canMoveY=false;
      });
      if(canMoveX)z.x+=mvx;
      if(canMoveY)z.y+=mvy;
    }

    // Boundary
    z.x=Math.max(5,Math.min(895,z.x));
    z.y=Math.max(5,Math.min(695,z.y));

    // Attack player
    if(Math.hypot(z.x-player.x,z.y-player.y)<z.size+12&&z.attackTimer<=0){
      damagePlayer(z.dmg);z.attackTimer=30;zombieSnd();
    }
    // Attack survivors
    survivors.forEach(s=>{
      if(s.hp<=0)return;
      if(Math.hypot(z.x-s.x,z.y-s.y)<z.size+10&&z.attackTimer<=0){
        s.hp-=z.dmg;z.attackTimer=30;
        if(s.hp<=0)addParticle(s.x,s.y,'#0f0',10);
      }
    });

    // Spitter ranged attack
    if(z.ranged&&z.attackTimer<=0&&td<300){
      z.attackTimer=60;
      bullets.push({x:z.x,y:z.y,vx:Math.cos(z.angle)*5,vy:Math.sin(z.angle)*5,
        dmg:z.dmg,color:'#4f4',life:50,size:4,owner:'zombie'});
    }
  });

  // Bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];b.x+=b.vx;b.y+=b.vy;b.life--;
    if(b.life<=0||b.x<-20||b.x>920||b.y<-20||b.y>720){bullets.splice(i,1);continue;}

    if(b.owner==='zombie'){
      if(Math.hypot(b.x-player.x,b.y-player.y)<15){damagePlayer(b.dmg);bullets.splice(i,1);continue;}
      continue;
    }

    // Hit zombies
    let hitZ=false;
    for(let j=zombies.length-1;j>=0;j--){
      const z=zombies[j];if(z.hp<=0)continue;
      if(Math.hypot(b.x-z.x,b.y-z.y)<z.size){
        z.hp-=b.dmg;addParticle(b.x,b.y,b.color,3);addBlood(z.x,z.y);
        if(b.explosive){
          explodeSnd();addParticle(b.x,b.y,'#f80',20);addParticle(b.x,b.y,'#ff0',15);
          zombies.forEach(zz=>{if(zz.hp>0&&Math.hypot(zz.x-b.x,zz.y-b.y)<60)zz.hp-=50;});
        }
        if(z.hp<=0){
          if(z.explode){explodeSnd();addParticle(z.x,z.y,'#f80',25);
            zombies.forEach(zz=>{if(zz.hp>0&&Math.hypot(zz.x-z.x,zz.y-z.y)<50){zz.hp-=30;addBlood(zz.x,zz.y);}});
            if(Math.hypot(z.x-player.x,z.y-player.y)<50)damagePlayer(15);
          }
          explodeSnd();addParticle(z.x,z.y,'#a00',12);addBlood(z.x,z.y);addBlood(z.x,z.y);addBlood(z.x,z.y);
          waveKills++;totalKills++;score+=z.score;zombiesRemaining--;
          if(z.coins>0){saveCoins(getCoins()+z.coins);coinSnd();}

          // Scavenger perk
          if(player.perks.scavenger&&Math.random()<0.3){
            const st=['health','ammo','coins'][Math.floor(Math.random()*3)];
            supplies.push({x:z.x+(Math.random()-0.5)*20,y:z.y+(Math.random()-0.5)*20,type:st,life:600});
          }

          // Achievement checks
          if(totalKills>=500)checkAch('headshotter','Headshotter');
          if(ownedWeapons.every(o=>o))checkAch('arsenal','Arsenal');
        }

        // Penetration: bullet passes through
        if(b.pierce&&b.pierce>0){b.pierce--;b.dmg=Math.floor(b.dmg*0.6);}
        else{bullets.splice(i,1);hitZ=true;break;}
      }
    }
    if(hitZ)continue;
  }

  // Clean dead zombies
  for(let i=zombies.length-1;i>=0;i--){if(zombies[i].hp<=0)zombies.splice(i,1);}

  // Supplies
  for(let i=supplies.length-1;i>=0;i--){
    const s=supplies[i];s.life--;
    if(s.life<=0){supplies.splice(i,1);continue;}
    if(Math.hypot(s.x-player.x,s.y-player.y)<25){
      pickupSnd();
      if(s.type==='health')player.hp=Math.min(player.maxHp,player.hp+30);
      if(s.type==='ammo'){const w=getWeapon(currentWeapon);w.ammo=w.maxAmmo;w.reloadTimer=0;}
      if(s.type==='coins'){saveCoins(getCoins()+20);}
      supplies.splice(i,1);
    }
  }

  // Particles
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.life--;p.vx*=0.95;p.vy*=0.95;
    if(p.life<=0)particles.splice(i,1);
  }

  // Notifications
  for(let i=notifications.length-1;i>=0;i--){
    notifications[i].timer-=1/60;
    notifications[i].y-=0.5;
    if(notifications[i].timer<=0)notifications.splice(i,1);
  }

  if(shakeT>0)shakeT--;
  updateHUD();

  // Check wave complete
  if(zombiesRemaining<=0&&zombiesToSpawn<=0&&zombies.length===0){
    // Check achievements
    if(waveIdx>=19)checkAch('laststand','Last Stand');

    state='result';
    const earned=waveKills*5+50;
    saveCoins(getCoins()+earned);
    document.getElementById('result-title').textContent='WAVE '+(waveIdx+1)+' COMPLETE';
    document.getElementById('result-title').style.color='#0f0';
    document.getElementById('result-stats').innerHTML=`<p>Zombies Killed: <span>${waveKills}</span></p><p>Total Kills: <span>${totalKills}</span></p><p>Score: <span>${score}</span></p><p>Wave Bonus: <span>+50</span></p>`;
    document.getElementById('result-coins').textContent='+'+earned;
    const nextBtn=document.getElementById('btn-next-wave');
    nextBtn.textContent=waveIdx>=19?'VICTORY!':'NEXT WAVE';
    showScreen('result-screen');document.getElementById('hud').classList.add('hidden');
  }
}

function damagePlayer(dmg){
  if(player.invuln>0)return;
  player.hp-=dmg;player.invuln=15;shakeT=8;shakeA=5;
  if(player.hp<=0){
    player.hp=0;state='result';
    const earned=waveKills*5;
    saveCoins(getCoins()+earned);
    document.getElementById('result-title').textContent='YOU DIED';
    document.getElementById('result-title').style.color='#f44';
    document.getElementById('result-stats').innerHTML=`<p>Survived to Wave: <span>${waveIdx+1}</span></p><p>Kills: <span>${totalKills}</span></p><p>Score: <span>${score}</span></p>`;
    document.getElementById('result-coins').textContent='+'+earned;
    document.getElementById('btn-next-wave').textContent='TRY AGAIN';
    showScreen('result-screen');document.getElementById('hud').classList.add('hidden');
  }
}

function updateHUD(){
  const w=getWeapon(currentWeapon);
  document.getElementById('hud-hp').textContent=Math.ceil(player.hp);
  document.getElementById('hud-wpn').textContent=w.name;
  document.getElementById('hud-ammo').textContent=w.reloadTimer>0?'RELOADING':w.ammo+'/'+w.maxAmmo;
  document.getElementById('hud-wave').textContent=(waveIdx+1);
  document.getElementById('hud-kills').textContent=totalKills;
  document.getElementById('hud-time').textContent=nightMode?'NIGHT':'DAY';
  document.getElementById('hud-time').style.color=nightMode?'#aaf':'#ff0';
  document.getElementById('hud-coins').textContent=getCoins();
  document.getElementById('hud-remaining').textContent='ZOMBIES: '+zombiesRemaining;
  document.getElementById('hud-barr').textContent=barricadeCount+'/5';
  renderWeaponBar();
}

function renderWeaponBar(){
  const bar=document.getElementById('weapon-bar');
  if(!bar)return;
  let html='';
  weaponDefs.forEach((wd,i)=>{
    const owned=ownedWeapons[i];
    const active=i===currentWeapon&&owned;
    const w=getWeapon(i);
    const ammoStr=w?(w.reloadTimer>0?'R':w.ammo):'';
    html+=`<div class="wpn-slot ${active?'active':''} ${owned?'owned':'locked'}" data-idx="${i}">
      <div class="wpn-name">${wd.name}</div>
      <div class="wpn-ammo">${owned?ammoStr:'--'}</div>
    </div>`;
  });
  bar.innerHTML=html;
  bar.querySelectorAll('.wpn-slot.owned').forEach(el=>{
    el.onclick=()=>{currentWeapon=parseInt(el.dataset.idx);gunSnd(currentWeapon);};
  });
}

function render(){
  if(!player)return;
  // Background
  const bg=nightMode?'#080810':'#0a0f0a';
  ctx.fillStyle=bg;ctx.fillRect(0,0,900,700);

  // Grid
  ctx.strokeStyle=nightMode?'rgba(100,100,255,0.03)':'rgba(0,255,0,0.03)';ctx.lineWidth=1;
  for(let i=0;i<900;i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,700);ctx.stroke();}
  for(let i=0;i<700;i+=40){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(900,i);ctx.stroke();}

  let sx=0,sy=0;
  if(shakeT>0){sx=(Math.random()-0.5)*shakeA;sy=(Math.random()-0.5)*shakeA;}
  ctx.save();ctx.translate(sx,sy);

  // Blood stains
  bloodStains.forEach(b=>{ctx.fillStyle=`rgba(100,0,0,${b.a})`;ctx.beginPath();ctx.arc(b.x,b.y,b.size,0,Math.PI*2);ctx.fill();});

  // Barricades
  barricades.forEach(b=>{
    if(b.hp<=0)return;
    const a=b.hp/b.maxHp;
    ctx.fillStyle=b.type==='wood'?'#8B4513':'#666';
    ctx.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h);
    ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.strokeRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h);
    if(a<0.5){ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(b.x-b.w/2,b.y-b.h/2,b.w*(1-a*2),b.h);}
  });

  // Supplies
  supplies.forEach(s=>{
    const pulse=Math.sin(Date.now()/200)*3;
    ctx.fillStyle=s.type==='health'?'#0f0':s.type==='ammo'?'#ff0':'#f0f';
    ctx.beginPath();ctx.arc(s.x,s.y,8+pulse,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.font='bold 10px monospace';
    ctx.fillText(s.type==='health'?'+':s.type==='ammo'?'A':'$',s.x-3,s.y+4);
  });

  // Survivors
  survivors.forEach(s=>{
    if(s.hp<=0)return;
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);
    ctx.fillStyle='#0a0';ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#0f0';ctx.fillRect(5,-2,12,4);
    ctx.restore();
  });

  // Zombies
  zombies.forEach(z=>{
    if(z.hp<=0)return;
    ctx.save();ctx.translate(z.x,z.y);ctx.rotate(z.angle);
    ctx.fillStyle=z.color;
    if(z.isBoss){
      ctx.beginPath();ctx.arc(0,0,z.size,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#ff0';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#ff0';ctx.beginPath();ctx.arc(z.size*0.4,-5,4,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(z.size*0.4,5,4,0,Math.PI*2);ctx.fill();
    }else if(z.isNecro){
      ctx.beginPath();ctx.arc(0,0,z.size,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#a0f';ctx.lineWidth=2;ctx.stroke();
      // Spawn aura
      ctx.strokeStyle='rgba(160,0,255,0.3)';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(0,0,z.size+8+Math.sin(Date.now()/200)*4,0,Math.PI*2);ctx.stroke();
    }else if(z.explode){
      ctx.beginPath();ctx.arc(0,0,z.size,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#ff0';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);
    }else{
      ctx.fillRect(-z.size,-z.size*0.7,z.size*2,z.size*1.4);
      ctx.fillRect(z.size-5,-z.size,6,z.size*0.5);
      ctx.fillRect(z.size-5,z.size*0.5,6,z.size*0.5);
    }
    ctx.restore();
    if(z.maxHp>30&&z.hp<z.maxHp){
      ctx.fillStyle='#333';ctx.fillRect(z.x-15,z.y-z.size-8,30,3);
      ctx.fillStyle='#f00';ctx.fillRect(z.x-15,z.y-z.size-8,30*(z.hp/z.maxHp),3);
    }
  });

  // Player
  if(player.invuln<=0||Math.floor(player.invuln/3)%2===0){
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.angle);
    ctx.fillStyle='#0ff';ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.fillRect(5,-3,15,6);
    ctx.fillStyle='#08f';ctx.fillRect(15,-2,4,4);
    ctx.restore();
    ctx.fillStyle='#333';ctx.fillRect(player.x-18,player.y-22,36,4);
    ctx.fillStyle=player.hp>50?'#0f0':player.hp>25?'#ff0':'#f00';
    ctx.fillRect(player.x-18,player.y-22,36*(player.hp/player.maxHp),4);
  }

  // Bullets
  bullets.forEach(b=>{
    ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.size,0,Math.PI*2);ctx.fill();
    if(b.flame){ctx.globalAlpha=0.3;ctx.beginPath();ctx.arc(b.x-b.vx,b.y-b.vy,b.size*1.5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  });

  // Particles
  particles.forEach(p=>{
    ctx.globalAlpha=p.life/p.maxLife;ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,p.size*(p.life/p.maxLife),0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;
  ctx.restore();

  // Night overlay
  if(nightMode){
    ctx.fillStyle='rgba(0,0,40,0.3)';ctx.fillRect(0,0,900,700);
    const grd=ctx.createRadialGradient(player.x+sx,player.y+sy,30,player.x+sx,player.y+sy,200);
    grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(0,0,40,0.5)');
    ctx.fillStyle=grd;ctx.fillRect(0,0,900,700);
  }

  // Notifications
  notifications.forEach(n=>{
    ctx.globalAlpha=Math.min(1,n.timer);
    ctx.fillStyle='#ff0';ctx.font='bold 14px monospace';ctx.textAlign='center';
    ctx.fillText(n.text,450,n.y);
  });
  ctx.globalAlpha=1;

  // Touch controls
  renderTouchControls();
}

function renderTouchControls(){
  if(!('ontouchstart' in window))return;
  // Left joystick area
  ctx.fillStyle='rgba(255,255,255,0.05)';
  ctx.beginPath();ctx.arc(120,550,60,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=2;ctx.stroke();
  if(touchJoy.active){
    ctx.fillStyle='rgba(0,255,255,0.3)';
    ctx.beginPath();ctx.arc(120+touchJoy.dx*40,550+touchJoy.dy*40,25,0,Math.PI*2);ctx.fill();
  }
  // Fire button
  ctx.fillStyle=touchFire.active?'rgba(255,0,0,0.4)':'rgba(255,0,0,0.15)';
  ctx.beginPath();ctx.arc(800,550,45,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,0,0,0.5)';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='bold 14px monospace';ctx.textAlign='center';
  ctx.fillText('FIRE',800,555);
  // Barricade button
  ctx.fillStyle='rgba(168,133,0,0.15)';
  ctx.beginPath();ctx.arc(800,480,30,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(168,133,0,0.4)';ctx.stroke();
  ctx.fillStyle='#a85';ctx.font='10px monospace';
  ctx.fillText('BARR',800,484);
}

function gameLoop(){update();render();requestAnimationFrame(gameLoop);}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));if(id)document.getElementById(id).classList.add('active');}

// Perk selection between waves
function showPerkSelection(){
  const perks=[];
  const shuffled=[...PERK_DEFS].sort(()=>Math.random()-0.5);
  for(let i=0;i<3;i++)perks.push(shuffled[i]);

  const container=document.getElementById('perk-selection');
  container.innerHTML='';
  container.style.display='flex';

  perks.forEach((perk,i)=>{
    const div=document.createElement('div');
    div.className='perk-card';
    div.innerHTML=`<div class="perk-name">${perk.name}</div><div class="perk-desc">${perk.desc}</div>`;
    div.onclick=()=>{
      perk.apply(player);
      container.style.display='none';
      state='playing';
      showScreen(null);
      document.getElementById('hud').classList.remove('hidden');
      addNotification('Perk: '+perk.name);
      pickupSnd();
    };
    container.appendChild(div);
  });
}

function showWaveScreen(){
  if(waveIdx>=20){showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();return;}
  nightMode=waveIdx%2===1;
  const waveType=getWaveType(waveIdx+1);
  const waveLabel=getWaveLabel(waveType);
  document.getElementById('wave-title').textContent='WAVE '+(waveIdx+1)+(waveLabel?' - '+waveLabel:'');
  document.getElementById('wave-desc').textContent=nightMode?'Night falls... the horde grows stronger.':'Day '+(47+waveIdx)+'. Stay alive.';
  document.getElementById('wave-obj').textContent='Survivors remain: '+survivors.filter(s=>s.hp>0).length+'. Barricades: '+barricadeCount+'/5.';
  showScreen('wave-screen');
}

function showAd(){
  state='ad';let t=3;
  document.getElementById('ad-timer').textContent=t;
  showScreen('ad-screen');
  const iv=setInterval(()=>{t--;document.getElementById('ad-timer').textContent=t;
    if(t<=0){clearInterval(iv);player.hp=player.maxHp;
      player.weapons.forEach(w=>{w.ammo=w.maxAmmo;w.reloadTimer=0;});
      barricadeCount=0;
      supplies.push({x:450,y:350,type:'health',life:600});
      supplies.push({x:350,y:250,type:'ammo',life:600});
      showWaveScreen();}
  },1000);
}

function renderShop(){
  const list=document.getElementById('shop-list');
  list.innerHTML='';
  weaponDefs.forEach((w,i)=>{
    const owned=ownedWeapons[i];
    const canBuy=!owned&&getCoins()>=w.cost;
    const div=document.createElement('div');div.className='shop-item';
    div.innerHTML=`<div class="shop-info"><div class="shop-name">${w.name}</div><div class="shop-desc">DMG:${w.dmg} Rate:${w.rate} Ammo:${w.maxAmmo}</div></div>`;
    if(owned){const btn=document.createElement('button');btn.className='shop-btn owned';btn.textContent='OWNED';btn.disabled=true;div.appendChild(btn);}
    else{const btn=document.createElement('button');btn.className='shop-btn';btn.textContent=w.cost+' coins';btn.disabled=!canBuy;
      btn.onclick=()=>{if(getCoins()>=w.cost){saveCoins(getCoins()-w.cost);ownedWeapons[i]=true;coinSnd();renderShop();}};div.appendChild(btn);}
    list.appendChild(div);
  });
  document.getElementById('shop-coins').textContent=getCoins();
}

// Input - Keyboard
document.addEventListener('keydown',e=>{
  keys[e.key.toLowerCase()]=true;
  if(state==='playing'){
    const n=parseInt(e.key);
    if(n>=1&&n<=8&&ownedWeapons[n-1])currentWeapon=n-1;
  }
});
document.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;});
canvas.addEventListener('mousedown',e=>{mouse.down=true;if(AC.state==='suspended')try{getAC();if(AC)try{getAC();if(AC)AC.resume();}catch(e){};}catch(e){}});
canvas.addEventListener('mouseup',()=>{mouse.down=false;});

// Scroll wheel weapon switch
canvas.addEventListener('wheel',e=>{
  if(state!=='playing')return;
  e.preventDefault();
  let dir=e.deltaY>0?1:-1;
  let next=currentWeapon+dir;
  for(let tries=0;tries<8;tries++){
    next=((next%8)+8)%8;
    if(ownedWeapons[next]){currentWeapon=next;gunSnd(currentWeapon);break;}
    next+=dir;
  }
},{passive:false});

// Touch controls
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  if(AC.state==='suspended')try{getAC();if(AC)try{getAC();if(AC)AC.resume();}catch(e){};}catch(e){}
  for(const t of e.changedTouches){
    const r=canvas.getBoundingClientRect();
    const tx=t.clientX-r.left,ty=t.clientY-r.top;
    if(tx<240&&ty>450){
      // Left joystick
      touchJoy={active:true,baseX:120,baseY:550,dx:0,dy:0,id:t.identifier};
    }else if(tx>660&&ty>440){
      const dx=tx-800,dy=ty-550;
      if(Math.hypot(dx,dy)<50){
        touchFire={active:true,id:t.identifier};
      }else{
        touchBarricade.active=true;
      }
    }
  }
},{passive:false});
canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    if(t.identifier===touchJoy.id){
      const r=canvas.getBoundingClientRect();
      const tx=t.clientX-r.left-touchJoy.baseX;
      const ty=t.clientY-r.top-touchJoy.baseY;
      const d=Math.hypot(tx,ty);
      if(d>5){
        touchJoy.dx=Math.max(-1,Math.min(1,tx/50));
        touchJoy.dy=Math.max(-1,Math.min(1,ty/50));
      }
    }
  }
},{passive:false});
canvas.addEventListener('touchend',e=>{
  for(const t of e.changedTouches){
    if(t.identifier===touchJoy.id)touchJoy={active:false,baseX:0,baseY:0,dx:0,dy:0,id:null};
    if(t.identifier===touchFire.id)touchFire={active:false,id:null};
  }
},{passive:false});

// Gamepad support
let gpPrevButtons={};
function pollGamepad(){
  const gp=navigator.getGamepads?navigator.getGamepads()[0]:null;
  if(!gp)return;

  if(state!=='playing')return;

  // Left stick = movement
  const deadzone=0.2;
  let gx=0,gy=0;
  if(Math.abs(gp.axes[0])>deadzone)gx=gp.axes[0];
  if(Math.abs(gp.axes[1])>deadzone)gy=gp.axes[1];
  if(gx||gy){
    keys['a']=gx<0;keys['d']=gx>0;keys['w']=gy<0;keys['s']=gy>0;
  }else{
    keys['a']=keys['d']=keys['w']=keys['s']=false;
  }

  // Right stick = aim
  if(gp.axes.length>=4){
    const rxa=gp.axes[2],rya=gp.axes[3];
    if(Math.abs(rxa)>deadzone||Math.abs(rya)>deadzone){
      mouse.x=player.x+rxa*200;
      mouse.y=player.y+rya*200;
    }
  }

  // A = fire
  if(gp.buttons[0]&&gp.buttons[0].pressed)mouse.down=true;
  else if(gpPrevButtons[0]&&!gp.buttons[0].pressed)mouse.down=false;

  // B = barricade
  if(gp.buttons[1]&&gp.buttons[1].pressed&&!gpPrevButtons[1])keys['b']=true;

  // X = reload
  if(gp.buttons[2]&&gp.buttons[2].pressed&&!gpPrevButtons[2])keys['r']=true;

  // D-pad = weapon switch
  if(gp.buttons[12]&&!gpPrevButtons[12]){// Up
    let next=currentWeapon-1;
    for(let t=0;t<8;t++){next=((next%8)+8)%8;if(ownedWeapons[next]){currentWeapon=next;gunSnd(currentWeapon);break;}next--;}
  }
  if(gp.buttons[13]&&!gpPrevButtons[13]){// Down
    let next=currentWeapon+1;
    for(let t=0;t<8;t++){next=((next%8)+8)%8;if(ownedWeapons[next]){currentWeapon=next;gunSnd(currentWeapon);break;}next++;}
  }

  // Start = pause equivalent
  if(gp.buttons[9]&&!gpPrevButtons[9]){
    // Toggle state
    if(state==='playing'){}
  }

  gpPrevButtons={};
  gp.buttons.forEach((b,i)=>gpPrevButtons[i]=b.pressed);
}
setInterval(pollGamepad,16);

// Menu
document.getElementById('btn-start').onclick=()=>{waveIdx=0;totalKills=0;score=0;zombies=[];survivors=[];showWaveScreen();};
document.getElementById('btn-how').onclick=()=>showScreen('how-screen');
document.getElementById('btn-shop').onclick=()=>{renderShop();showScreen('shop-screen');};
document.getElementById('btn-back-how').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-back-shop').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-wave-start').onclick=()=>{
  initGame();state='playing';showScreen(null);document.getElementById('hud').classList.remove('hidden');
  // Show perk selection on wave 2+
  if(waveIdx>0){showPerkSelection();}
};
document.getElementById('btn-next-wave').onclick=()=>{
  if(waveIdx>=19){showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();return;}
  waveIdx++;
  if((waveIdx)%5===0){showAd();}
  else{showWaveScreen();}
};
document.getElementById('btn-menu').onclick=()=>{state='menu';showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};

document.getElementById('menu-coins').textContent=getCoins();
gameLoop();
})();
