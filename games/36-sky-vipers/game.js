// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('sky-vipers'); } catch(e) {}

// SKY VIPERS - NGN4 Game #36 - Air Combat
(function(){
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
canvas.width=900;canvas.height=700;

// Audio
let audioCtx=null;function getAudioCtx(){if(!audioCtx)try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}return audioCtx;}
function playSound(freq,dur,type='square',vol=0.1){
  if(!getAudioCtx())return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type;o.frequency.value=freq;g.gain.value=vol;
  g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+dur);
  o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);
}
function shootSound(){playSound(800,0.08,'square',0.06)}
function missileSound(){playSound(200,0.3,'sawtooth',0.08)}
function laserSound(){playSound(1200,0.05,'sine',0.04)}
function explodeSound(){playSound(80,0.4,'sawtooth',0.12)}
function pickupSound(){playSound(600,0.15,'sine',0.1);setTimeout(()=>playSound(900,0.15,'sine',0.1),100)}
function coinSound(){playSound(1000,0.1,'sine',0.08)}
function medalSound(){[400,500,600,800].forEach((f,i)=>setTimeout(()=>playSound(f,0.2,'sine',0.1),i*80));}

// Achievements
let svAchievements=JSON.parse(localStorage.getItem('ngn4_skyvipers_achievements')||'{}');
function unlockSVAchieve(id,name){
  if(svAchievements[id])return;
  svAchievements[id]=true;
  localStorage.setItem('ngn4_skyvipers_achievements',JSON.stringify(svAchievements));
  medalSound();
}

// Game state
let state='menu',missionIdx=0,score=0,kills=0,missionKills=0,bossKills=0;
let upgrades={mgDmg:0,misDmg:0,lasDmg:0,hpMax:0,armorMax:0,speed:0};
let upgradeCosts=[50,100,200,400,800];
let missionStartTime=0,damageTaken=0;
let medalsEarned=new Set();

// Missions
const missions=[
  {name:"First Sortie",desc:"Destroy all enemy fighters.",obj:"Destroy 5 fighters",type:"destroy",count:5,enemies:'fighters'},
  {name:"Convoy Escort",desc:"Escort the transport to safety.",obj:"Protect transport",type:"escort",count:4,enemies:'mixed'},
  {name:"Base Defense",desc:"Defend the forward base.",obj:"Protect base",type:"defend",count:8,enemies:'bombers'},
  {name:"Deep Strike",desc:"Destroy enemy fuel depot.",obj:"Destroy all targets",type:"destroy",count:10,enemies:'turrets'},
  {name:"Dogfight Alley",desc:"Intense aerial combat.",obj:"Destroy 12 enemies",type:"destroy",count:12,enemies:'fighters'},
  {name:"Helicopter Hunt",desc:"Stop weapon transports.",obj:"Destroy all helis",type:"destroy",count:6,enemies:'helis'},
  {name:"Drone Swarm",desc:"Intercept combat drones.",obj:"Destroy 15 drones",type:"destroy",count:15,enemies:'drones'},
  {name:"Fortress Assault",desc:"Heavy AA defenses ahead.",obj:"Destroy fortress",type:"destroy",count:10,enemies:'mixed_heavy'},
  {name:"VIPER LEADER",desc:"Boss fight with the Ace.",obj:"Defeat the Ace",type:"boss",count:1,enemies:'boss'},
  {name:"Final Assault",desc:"Destroy the Command Ship.",obj:"Destroy Command Ship",type:"boss",count:1,enemies:'final_boss'}
];

// Player
let player,bullets,enemies,pickups,particles,clouds,wingman,baseHP,baseMaxHP,transportHP,transportMaxHP,transport;
let keys={},mouse={x:450,y:350,down:false};
let weaponIdx=0,fireTimer=0,shakeTimer=0,shakeAmt=0;
let missionEnemiesLeft=0,missionDone=false,missionFail=false,adShown=false;
let missionMedal='';

// Mobile touch
let touchJoystick={active:false,startX:0,startY:0,dx:0,dy:0};
let touchFire=false,touchWeaponSwitch=false;

function getCoins(){try{const d=JSON.parse(localStorage.getItem('ngn4_rewards')||'{}');return d.coins||0;}catch(e){return 0;}}
function saveCoins(c){try{const d=JSON.parse(localStorage.getItem('ngn4_rewards')||'{}');d.coins=c;localStorage.setItem('ngn4_rewards',JSON.stringify(d));}catch(e){}}

function initPlayer(){
  const spd=3+upgrades.speed*0.3;
  const hp=100+upgrades.hpMax*20;
  player={x:450,y:500,angle:0,vx:0,vy:0,speed:spd,hp:hp,maxHp:hp,armor:50+upgrades.armorMax*10,maxArmor:50+upgrades.armorMax*10,
    weapon:0,ammo:[999,20,100],maxAmmo:[999,20,100],invuln:0};
  bullets=[];enemies=[];pickups=[];particles=[];clouds=[];
  fireTimer=0;missionKills=0;bossKills=0;missionDone=false;missionFail=false;adShown=false;
  damageTaken=0;missionMedal='';
  wingman={x:380,y:520,angle:0,hp:80,target:null,fireTimer:0};
  transport=null;
  baseHP=0;baseMaxHP=0;transportHP=0;transportMaxHP=0;
  for(let i=0;i<8;i++)clouds.push({x:Math.random()*900,y:Math.random()*700,w:80+Math.random()*120,h:30+Math.random()*50,a:0.15+Math.random()*0.15,vx:-0.3-Math.random()*0.5});
  missionStartTime=Date.now();
}

function weaponStats(w){
  const diffMult=1+missionIdx*0.08;
  if(w===0)return{name:'MG',dmg:(5+upgrades.mgDmg*3)*diffMult,speed:12,rate:4,color:'#ff0',size:3};
  if(w===1)return{name:'MSL',dmg:(25+upgrades.misDmg*10)*diffMult,speed:7,rate:30,color:'#f80',size:5,tracking:true};
  return{name:'LAS',dmg:(2+upgrades.lasDmg*1)*diffMult,speed:20,rate:2,color:'#f0f',size:2};
}

function spawnEnemy(type){
  const diffMult=1+missionIdx*0.15;
  let e={x:0,y:0,type,hp:0,maxHp:0,speed:0,fireTimer:0,fireRate:0,dmg:0,size:15,angle:0,score:10,coins:10,isBoss:false,behavior:'chase',bossPhase:1};
  const side=Math.random();
  if(side<0.3){e.x=Math.random()*900;e.y=-30;}
  else if(side<0.6){e.x=Math.random()*900;e.y=730;}
  else{e.x=-30;e.y=Math.random()*700;}
  switch(type){
    case'fighter':e.hp=20*diffMult;e.maxHp=20*diffMult;e.speed=2.5+missionIdx*0.1;e.fireRate=40;e.dmg=5*diffMult;e.score=10;e.coins=10;break;
    case'bomber':e.hp=60*diffMult;e.maxHp=60*diffMult;e.speed=1.2+missionIdx*0.05;e.fireRate=80;e.dmg=15*diffMult;e.size=22;e.score=25;e.coins=25;e.behavior='strafe';break;
    case'heli':e.hp=40*diffMult;e.maxHp=40*diffMult;e.speed=1.8+missionIdx*0.08;e.fireRate=50;e.dmg=10*diffMult;e.size=20;e.score=20;e.coins=20;e.behavior='circle';break;
    case'drone':e.hp=8*diffMult;e.maxHp=8*diffMult;e.speed=3+missionIdx*0.1;e.fireRate=30;e.dmg=3*diffMult;e.size=10;e.score=5;e.coins=5;e.behavior='swarm';break;
    case'turret':e.hp=50*diffMult;e.maxHp=50*diffMult;e.speed=0;e.fireRate=60;e.dmg=12*diffMult;e.size=18;e.score=20;e.coins=20;e.behavior='stationary';e.x=100+Math.random()*700;e.y=50+Math.random()*300;break;
    case'boss':e.hp=300*diffMult;e.maxHp=300*diffMult;e.speed=1;e.fireRate=20;e.dmg=15*diffMult;e.size=35;e.score=200;e.coins=200;e.isBoss=true;e.x=450;e.y=80;e.behavior='boss';break;
    case'final_boss':e.hp=600*diffMult;e.maxHp=600*diffMult;e.speed=0.8;e.fireRate=15;e.dmg=20*diffMult;e.size=45;e.score=300;e.coins=300;e.isBoss=true;e.x=450;e.y=80;e.behavior='boss';break;
  }
  enemies.push(e);
}

function spawnEnemies(){
  const m=missions[missionIdx];
  const types={fighters:['fighter','fighter','fighter'],mixed:['fighter','fighter','bomber','drone'],bombers:['bomber','bomber','fighter','turret'],turrets:['turret','turret','fighter','drone'],helis:['heli','heli','heli','fighter'],drones:['drone','drone','drone','drone'],mixed_heavy:['bomber','turret','heli','fighter','turret'],boss:['boss','fighter','fighter','drone'],final_boss:['final_boss','bomber','bomber','turret','fighter']};
  const pool=types[m.enemies]||types.fighters;
  const total=m.count;
  for(let i=0;i<total;i++){
    const t=pool[Math.floor(Math.random()*pool.length)];
    if(i===0&&(m.type==='boss'))spawnEnemy(pool[0]);
    else spawnEnemy(t);
  }
  missionEnemiesLeft=enemies.length;
  if(m.type==='defend'){baseHP=200;baseMaxHP=200;}
  if(m.type==='escort'){
    transportHP=150;transportMaxHP=150;
    transport={x:100,y:350,pathIdx:0,speed:0.5,hp:150,maxHp:150};
  }
}

function addParticle(x,y,color,count){
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,s=1+Math.random()*4;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:30+Math.random()*30,maxLife:60,color,size:2+Math.random()*3});
  }
}

function spawnPickup(x,y){if(Math.random()<0.25){const types=['health','ammo','weapon'];pickups.push({x,y,type:types[Math.floor(Math.random()*types.length)],life:300});}}

function damagePlayer(dmg){
  if(player.invuln>0)return;
  if(player.armor>0){const ab=Math.min(player.armor,dmg);player.armor-=ab;dmg-=ab;}
  player.hp-=dmg;player.invuln=15;shakeTimer=10;shakeAmt=5;
  damageTaken+=dmg;
  if(player.hp<=0){player.hp=0;gameOver();}
}

function calcMedal(){
  const elapsed=(Date.now()-missionStartTime)/1000;
  const noDamage=damageTaken<10;
  const fast=elapsed<60;
  const allKills=missionKills>=missions[missionIdx].count;
  if(noDamage&&fast&&allKills)missionMedal='GOLD';
  else if(noDamage||fast||allKills)missionMedal='SILVER';
  else missionMedal='BRONZE';
  medalsEarned.add(missionMedal);
  if(damageTaken<5)unlockSVAchieve('perfect_mission','Perfect Mission');
  if(missionMedal==='GOLD')unlockSVAchieve('ace_pilot','Ace Pilot');
  if(missions[missionIdx].type==='escort'&&transportHP>50)unlockSVAchieve('wingman_saved','Wingman Saved');
  if(medalsEarned.size>=3)unlockSVAchieve('all_medals','All Medals');
}

function gameOver(){
  state='result';
  calcMedal();
  const earned=missionKills*10+bossKills*200;
  saveCoins(getCoins()+earned);
  document.getElementById('result-title').textContent='MISSION FAILED';
  document.getElementById('result-title').style.color='#f44';
  document.getElementById('result-stats').innerHTML=`<p>Kills: <span>${missionKills}</span></p><p>Medal: <span>${missionMedal}</span></p><p>Score: <span>${score}</span></p>`;
  document.getElementById('result-coins').textContent='+'+earned;
  showScreen('result-screen');document.getElementById('hud').classList.add('hidden');
}

function missionComplete(){
  state='result';
  calcMedal();
  const medalBonus=missionMedal==='GOLD'?200:missionMedal==='SILVER'?100:50;
  const earned=missionKills*10+50+bossKills*200+medalBonus;
  saveCoins(getCoins()+earned);
  document.getElementById('result-title').textContent='MISSION COMPLETE';
  document.getElementById('result-title').style.color='#0f0';
  document.getElementById('result-stats').innerHTML=`<p>Kills: <span>${missionKills}</span></p><p>Medal: <span style="color:${missionMedal==='GOLD'?'#ffd700':missionMedal==='SILVER'?'#c0c0c0':'#cd7f32'}">${missionMedal}</span></p><p>Score: <span>${score}</span></p><p>Bonus: <span>+${medalBonus}</span></p>`;
  document.getElementById('result-coins').textContent='+'+earned;
  const nextBtn=document.getElementById('btn-next');
  nextBtn.textContent=missionIdx>=9?'VICTORY! PLAY AGAIN':'NEXT MISSION';
  showScreen('result-screen');document.getElementById('hud').classList.add('hidden');
  medalSound();
  if(missionIdx>=9){nextBtn.onclick=()=>{missionIdx=0;score=0;showMissionBrief();};}
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  if(id)document.getElementById(id).classList.add('active');
}

function showMissionBrief(){
  if(missionIdx>=10){showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();return;}
  const m=missions[missionIdx];
  document.getElementById('mission-title').textContent='MISSION '+(missionIdx+1)+': '+m.name;
  document.getElementById('mission-desc').textContent=m.desc;
  document.getElementById('mission-obj').textContent='OBJECTIVE: '+m.obj;
  showScreen('mission-brief');
}

function startMission(){
  initPlayer();
  const m=missions[missionIdx];
  document.getElementById('hud-mission').textContent='MISSION '+(missionIdx+1)+': '+m.name;
  document.getElementById('hud-obj').textContent=m.obj;
  state='playing';
  showScreen(null);
  document.getElementById('hud').classList.remove('hidden');
  spawnEnemies();
}

function showAd(){
  state='ad';let timer=3;
  document.getElementById('ad-timer').textContent=timer;showScreen('ad-screen');
  const iv=setInterval(()=>{timer--;document.getElementById('ad-timer').textContent=timer;if(timer<=0){clearInterval(iv);player.hp=player.maxHp;player.armor=player.maxArmor;player.ammo=[...player.maxAmmo];showMissionBrief();}},1000);
}

// Update
function update(){
  if(state!=='playing')return;
  // Gamepad
  pollGamepad();
  // Player movement
  let dx=0,dy=0;
  if(keys['w']||keys['arrowup'])dy=-1;
  if(keys['s']||keys['arrowdown'])dy=1;
  if(keys['a']||keys['arrowleft'])dx=-1;
  if(keys['d']||keys['arrowright'])dx=1;
  // Touch joystick
  if(touchJoystick.active){dx=touchJoystick.dx;dy=touchJoystick.dy;}
  if(dx||dy){const len=Math.sqrt(dx*dx+dy*dy);dx/=len;dy/=len;}
  player.vx=dx*player.speed;player.vy=dy*player.speed;
  player.x+=player.vx;player.y+=player.vy;
  player.x=Math.max(15,Math.min(885,player.x));
  player.y=Math.max(15,Math.min(685,player.y));
  player.angle=Math.atan2(mouse.y-player.y,mouse.x-player.x);
  if(player.invuln>0)player.invuln--;

  // Fire
  fireTimer--;
  if(((mouse.down||keys[' ']||touchFire)&&fireTimer<=0)){
    const w=weaponStats(player.weapon);
    if(player.ammo[player.weapon]>0){
      const bx=player.x+Math.cos(player.angle)*20;
      const by=player.y+Math.sin(player.angle)*20;
      if(player.weapon===0){shootSound();player.ammo[0]--;}
      else if(player.weapon===1){missileSound();player.ammo[1]--;}
      else{laserSound();player.ammo[2]--;}
      bullets.push({x:bx,y:by,vx:Math.cos(player.angle)*w.speed,vy:Math.sin(player.angle)*w.speed,dmg:w.dmg,color:w.color,size:w.size,life:60,tracking:w.tracking||false,owner:'player'});
      fireTimer=w.rate;
    }
  }

  // Transport movement (escort) - follows player
  if(transport&&transport.hp>0){
    // Follow the player with an offset and slight delay
    const targetX=player.x-60;
    const targetY=player.y+40;
    transport.x+=(targetX-transport.x)*0.03;
    transport.y+=(targetY-transport.y)*0.03;
    transport.x=Math.max(50,Math.min(850,transport.x));
    transport.y=Math.max(50,Math.min(650,transport.y));
    transport.angle=Math.atan2(player.y-transport.y,player.x-transport.x);
    transport.pathIdx+=transport.speed*0.02;
    if(transport.pathIdx>20){
      // Escort complete - transport reached destination
      missionDone=true;
      setTimeout(missionComplete,500);
    }
  }

  // Wingman AI
  if(wingman.hp>0){
    let nearest=null,nd=Infinity;
    enemies.forEach(e=>{const d=Math.hypot(e.x-wingman.x,e.y-wingman.y);if(d<nd){nd=d;nearest=e;}});
    if(nearest){
      wingman.angle=Math.atan2(nearest.y-wingman.y,nearest.x-wingman.x);
      wingman.x+=Math.cos(wingman.angle)*2.2;
      wingman.y+=Math.sin(wingman.angle)*2.2;
      wingman.fireTimer--;
      if(wingman.fireTimer<=0&&nd<300){
        bullets.push({x:wingman.x,y:wingman.y,vx:Math.cos(wingman.angle)*10,vy:Math.sin(wingman.angle)*10,dmg:4,color:'#0ff',size:2,life:40,owner:'wingman'});
        wingman.fireTimer=8;
      }
    }else{wingman.x+=(player.x-wingman.x)*0.02;wingman.y+=(player.y-wingman.y)*0.02;}
    wingman.x=Math.max(10,Math.min(890,wingman.x));
    wingman.y=Math.max(10,Math.min(690,wingman.y));
  }

  // Bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    if(b.tracking&&enemies.length>0){
      let near=null,nd=Infinity;
      enemies.forEach(e=>{const d=Math.hypot(e.x-b.x,e.y-b.y);if(d<nd){nd=d;near=e;}});
      if(near){const ta=Math.atan2(near.y-b.y,near.x-b.x);const ca=Math.atan2(b.vy,b.vx);let diff=ta-ca;while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;const turn=Math.sign(diff)*Math.min(Math.abs(diff),0.08);const na=ca+turn;const sp=Math.sqrt(b.vx*b.vx+b.vy*b.vy);b.vx=Math.cos(na)*sp;b.vy=Math.sin(na)*sp;}
    }
    b.x+=b.vx;b.y+=b.vy;b.life--;
    if(b.life<=0||b.x<-10||b.x>910||b.y<-10||b.y>710){bullets.splice(i,1);continue;}
    if(b.owner!=='player'&&b.owner!=='wingman'){
      const d=Math.hypot(b.x-player.x,b.y-player.y);
      if(d<18){damagePlayer(b.dmg);bullets.splice(i,1);addParticle(b.x,b.y,'#f80',5);continue;}
      if(wingman.hp>0){const d2=Math.hypot(b.x-wingman.x,b.y-wingman.y);if(d2<15){wingman.hp-=b.dmg;bullets.splice(i,1);addParticle(b.x,b.y,'#f80',3);if(wingman.hp<=0)addParticle(wingman.x,wingman.y,'#0ff',20);continue;}}
      // Transport hit detection (for escort missions)
      if(transport&&transport.hp>0&&(b.owner==='enemy_transport'||b.owner==='enemy')){
        const d3=Math.hypot(b.x-transport.x,b.y-transport.y);
        if(d3<22){
          transport.hp-=b.dmg;
          transportHP=transport.hp;
          bullets.splice(i,1);
          addParticle(b.x,b.y,'#ff0',4);
          if(transport.hp<=0){
            addParticle(transport.x,transport.y,'#f80',25);
            explodeSound();
            transport=null;
            transportHP=0;
          }
          continue;
        }
      }
    }
    if(b.owner==='player'||b.owner==='wingman'){
      for(let j=enemies.length-1;j>=0;j--){
        const e=enemies[j];
        const d=Math.hypot(b.x-e.x,b.y-e.y);
        if(d<e.size){
          e.hp-=b.dmg;addParticle(b.x,b.y,b.color,3);bullets.splice(i,1);
          if(e.hp<=0){explodeSound();addParticle(e.x,e.y,'#f80',15);addParticle(e.x,e.y,'#ff0',10);if(e.isBoss)bossKills++;missionKills++;score+=e.score;spawnPickup(e.x,e.y);enemies.splice(j,1);missionEnemiesLeft--;}
          break;
        }
      }
    }
  }

  // Enemies AI
  enemies.forEach(e=>{
    e.fireTimer--;
    switch(e.behavior){
      case'chase':e.angle=Math.atan2(player.y-e.y,player.x-e.x);e.x+=Math.cos(e.angle)*e.speed;e.y+=Math.sin(e.angle)*e.speed;if(e.fireTimer<=0){e.fireTimer=e.fireRate;fireEnemyBullet(e);}break;
      case'strafe':e.angle=Math.atan2(player.y-e.y,player.x-e.x);e.x+=Math.cos(e.angle+Math.PI/2)*e.speed*0.8;e.y+=Math.sin(e.angle)*e.speed*0.5;if(e.fireTimer<=0){e.fireTimer=e.fireRate;fireEnemyBullet(e);}break;
      case'circle':const ca=Math.atan2(player.y-e.y,player.x-e.x)+Math.PI/3;e.angle=ca;e.x+=Math.cos(ca)*e.speed;e.y+=Math.sin(ca)*e.speed;if(e.fireTimer<=0){e.fireTimer=e.fireRate;fireEnemyBullet(e);}break;
      case'swarm':e.angle=Math.atan2(player.y-e.y,player.x-e.x)+Math.sin(Date.now()/200)*0.5;e.x+=Math.cos(e.angle)*e.speed;e.y+=Math.sin(e.angle)*e.speed;if(e.fireTimer<=0){e.fireTimer=e.fireRate;fireEnemyBullet(e);}break;
      case'stationary':e.angle=Math.atan2(player.y-e.y,player.x-e.x);if(e.fireTimer<=0){e.fireTimer=e.fireRate;fireEnemyBullet(e);}break;
      case'boss':
        if(e.y<150)e.y+=e.speed;
        // Boss phases
        const hpPct=e.hp/e.maxHp;
        const prevPhase=e.bossPhase||1;
        if(hpPct>0.66)e.bossPhase=1;
        else if(hpPct>0.33)e.bossPhase=2;
        else e.bossPhase=3;
        if(e.bossPhase!==prevPhase){addParticle(e.x,e.y,'#ff0',20);playSound(150,0.3,'sawtooth',0.15);}
        const bAngle=Math.atan2(player.y-e.y,player.x-e.x);
        e.angle=bAngle;
        e.x+=Math.sin(Date.now()/500)*2;
        if(e.fireTimer<=0){
          e.fireTimer=e.fireRate;
          if(e.bossPhase===1){
            // Phase 1: aimed burst (3 shots)
            fireEnemyBullet(e);
            setTimeout(()=>{if(e.hp>0)fireEnemyBullet(e);},100);
            setTimeout(()=>{if(e.hp>0)fireEnemyBullet(e);},200);
          }else if(e.bossPhase===2){
            // Phase 2: spread shot (8 projectiles)
            for(let a=0;a<8;a++){const ba=(Math.PI*2/8)*a;bullets.push({x:e.x,y:e.y,vx:Math.cos(ba)*4,vy:Math.sin(ba)*4,dmg:e.dmg*0.7,color:'#f00',size:4,life:80,owner:'enemy'});}
            // Summon minions
            if(Math.random()<0.1&&enemies.length<10){spawnEnemy('drone');spawnEnemy('drone');}
          }else{
            // Phase 3: rapid fire + charge
            for(let r=0;r<3;r++){setTimeout(()=>{if(e.hp>0)fireEnemyBullet(e);},r*50);}
            // Shield regen hint (small heal)
            e.hp=Math.min(e.maxHp,e.hp+1);
          }
        }
        break;
    }
    e.x=Math.max(-50,Math.min(950,e.x));
    e.y=Math.max(-50,Math.min(750,e.y));

    // Escort: enemies attack transport
    if(transport&&transport.hp>0){
      const td=Math.hypot(e.x-transport.x,e.y-transport.y);
      if(td<200&&e.fireTimer<=0){
        e.fireTimer=e.fireRate*2;
        const ta=Math.atan2(transport.y-e.y,transport.x-e.x);
        bullets.push({x:e.x,y:e.y,vx:Math.cos(ta)*5,vy:Math.sin(ta)*5,dmg:e.dmg,color:'#f80',size:3,life:60,owner:'enemy_transport'});
      }
    }
    // Defend: enemies attack base
    if(baseHP>0&&e.type==='bomber'){
      const bd=Math.hypot(e.x-450,e.y-600);
      if(bd<100){baseHP-=0.2;e.hp-=1;if(e.hp<=0){explodeSound();addParticle(e.x,e.y,'#f80',10);e.hp=-999;missionEnemiesLeft--;}}
    }
  });
  // Clean up dead enemies from forEach iteration
  for(let i=enemies.length-1;i>=0;i--){if(enemies[i].hp<=0)enemies.splice(i,1);}

  // Check transport/base damage from bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    if(b.owner==='enemy_transport'&&transport&&transport.hp>0){
      const d=Math.hypot(b.x-transport.x,b.y-transport.y);
      if(d<25){transport.hp-=b.dmg;bullets.splice(i,1);addParticle(b.x,b.y,'#f80',3);if(transport.hp<=0){explodeSound();addParticle(transport.x,transport.y,'#f80',20);transport=null;gameOver();}continue;}
    }
  }

  // Particles
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.life--;p.vx*=0.96;p.vy*=0.96;if(p.life<=0)particles.splice(i,1);}
  // Clouds
  clouds.forEach(c=>{c.x+=c.vx;if(c.x+c.w<0)c.x=900+Math.random()*100;});
  // Pickups
  for(let i=pickups.length-1;i>=0;i--){
    const p=pickups[i];p.life--;
    if(p.life<=0){pickups.splice(i,1);continue;}
    if(Math.hypot(p.x-player.x,p.y-player.y)<25){
      pickupSound();
      if(p.type==='health')player.hp=Math.min(player.maxHp,player.hp+30);
      if(p.type==='ammo'){player.ammo[1]=Math.min(player.maxAmmo[1],player.ammo[1]+5);player.ammo[2]=Math.min(player.maxAmmo[2],player.ammo[2]+25);}
      if(p.type==='weapon'){const w=weaponIdx;player.weapon=(w+1)%3;}
      pickups.splice(i,1);
    }
  }
  if(shakeTimer>0)shakeTimer--;

  // HUD update
  document.getElementById('hud-hp').textContent=Math.ceil(player.hp);
  document.getElementById('hud-arm').textContent=Math.ceil(player.armor);
  document.getElementById('hud-wpn').textContent=weaponStats(player.weapon).name;
  document.getElementById('hud-ammo').textContent=player.ammo[player.weapon];
  document.getElementById('hud-score').textContent=score;
  document.getElementById('hud-coins').textContent=getCoins();
  document.getElementById('hud-obj').textContent=missions[missionIdx].obj+(baseHP>0?' | BASE: '+Math.ceil(baseHP)+'/'+baseMaxHP:'')+(transport?' | TRANSPORT: '+Math.ceil(transport.hp)+'/'+transport.maxHp:'');

  // Check mission complete
  if(missionEnemiesLeft<=0&&!missionDone){missionDone=true;setTimeout(missionComplete,1000);}
  // Base destroyed
  if(baseHP>0&&baseHP<=0){baseHP=0;gameOver();}
  // Transport destroyed
  if(transport&&transport.hp<=0){transport=null;gameOver();}
  // Escort mission: if enemies are all cleared and escort alive, complete
  if(missions[missionIdx].type==='escort'&&missionEnemiesLeft<=0&&!missionDone&&transport&&transport.hp>0){
    missionDone=true;
    setTimeout(missionComplete,500);
  }
}

function fireEnemyBullet(e){
  bullets.push({x:e.x,y:e.y,vx:Math.cos(e.angle)*5,vy:Math.sin(e.angle)*5,dmg:e.dmg,color:'#f44',size:3,life:60,owner:'enemy'});
}

// Gamepad
let gpPrev={};
function pollGamepad(){
  const gps=navigator.getGamepads?navigator.getGamepads():[];const gp=gps[0];if(!gp)return;
  const p={};for(let i=0;i<gp.buttons.length;i++)p[i]=gp.buttons[i].pressed;
  if(p[0]&&!gpPrev[0])touchFire=true;if(!p[0])touchFire=false;
  if(p[1]&&!gpPrev[1]){player.weapon=(player.weapon+1)%3;}
  if(p[2]&&!gpPrev[2]&&state==='playing'){const w=weaponStats(player.weapon);if(player.ammo[player.weapon]>0){const bx=player.x+Math.cos(player.angle)*20;const by=player.y+Math.sin(player.angle)*20;shootSound();bullets.push({x:bx,y:by,vx:Math.cos(player.angle)*w.speed,vy:Math.sin(player.angle)*w.speed,dmg:w.dmg,color:w.color,size:w.size,life:60,owner:'player'});player.ammo[player.weapon]--;}}
  gpPrev=p;
}

// Touch controls
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    const rect=canvas.getBoundingClientRect();
    const x=(t.clientX-rect.left)/rect.width*900;
    const y=(t.clientY-rect.top)/rect.height*700;
    if(x<300){touchJoystick={active:true,startX:t.clientX,startY:t.clientY,dx:0,dy:0};}
    else if(x>600){touchFire=true;}
    else{player.weapon=(player.weapon+1)%3;touchWeaponSwitch=true;}
  }
},{passive:false});
canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    if(touchJoystick.active){
      touchJoystick.dx=(t.clientX-touchJoystick.startX)/60;
      touchJoystick.dy=(t.clientY-touchJoystick.startY)/60;
      const len=Math.sqrt(touchJoystick.dx*touchJoystick.dx+touchJoystick.dy*touchJoystick.dy);
      if(len>1){touchJoystick.dx/=len;touchJoystick.dy/=len;}
    }else{
      const rect=canvas.getBoundingClientRect();
      mouse.x=(t.clientX-rect.left)/rect.width*900;
      mouse.y=(t.clientY-rect.top)/rect.height*700;
    }
  }
},{passive:false});
canvas.addEventListener('touchend',e=>{
  e.preventDefault();
  touchJoystick.active=false;touchJoystick.dx=0;touchJoystick.dy=0;touchFire=false;touchWeaponSwitch=false;
},{passive:false});

// Render
function render(){
  ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,900,700);
  if(!player)return;
  ctx.strokeStyle='rgba(0,255,255,0.03)';ctx.lineWidth=1;
  for(let i=0;i<900;i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,700);ctx.stroke();}
  for(let i=0;i<700;i+=40){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(900,i);ctx.stroke();}
  let sx=0,sy=0;
  if(shakeTimer>0){sx=(Math.random()-0.5)*shakeAmt;sy=(Math.random()-0.5)*shakeAmt;}
  ctx.save();ctx.translate(sx,sy);
  clouds.forEach(c=>{ctx.fillStyle=`rgba(150,180,220,${c.a})`;ctx.fillRect(c.x,c.y,c.w,c.h);});
  // Base HP bar (defend missions)
  if(baseMaxHP>0){
    ctx.fillStyle='#333';ctx.fillRect(350,660,200,15);
    ctx.fillStyle=baseHP/baseMaxHP>0.5?'#0f0':'#f00';ctx.fillRect(350,660,200*(baseHP/baseMaxHP),15);
    ctx.strokeStyle='#fff';ctx.strokeRect(350,660,200,15);
    ctx.fillStyle='#fff';ctx.font='10px monospace';ctx.fillText('BASE HP',405,672);
  }
  // Transport
  if(transport&&transport.hp>0){
    ctx.save();ctx.translate(transport.x,transport.y);
    ctx.fillStyle='#0a0';ctx.strokeStyle='#0f0';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-20,0);ctx.lineTo(20,0);ctx.lineTo(20,-12);ctx.lineTo(-20,-12);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#ff0';ctx.fillRect(-20,-12,40,4);
    ctx.restore();
    // Transport HP bar (larger, more visible)
    const tpct=transport.hp/transport.maxHp;
    ctx.fillStyle='#333';ctx.fillRect(transport.x-30,transport.y-30,60,6);
    ctx.fillStyle=tpct>0.5?'#0f0':'#f00';ctx.fillRect(transport.x-30,transport.y-30,60*tpct,6);
    ctx.strokeStyle='#fff';ctx.strokeRect(transport.x-30,transport.y-30,60,6);
    ctx.fillStyle='#fff';ctx.font='bold 10px monospace';ctx.textAlign='center';
    ctx.fillText('ESCORT '+Math.ceil(transport.hp)+'/'+transport.maxHp,transport.x,transport.y-34);
    ctx.textAlign='start';
  }
  // Pickups
  pickups.forEach(p=>{const pulse=Math.sin(Date.now()/200)*3;ctx.save();ctx.translate(p.x,p.y);
    if(p.type==='health'){ctx.fillStyle='#0f0';ctx.beginPath();ctx.arc(0,0,8+pulse,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-1,-5,2,10);ctx.fillRect(-5,-1,10,2);}
    else if(p.type==='ammo'){ctx.fillStyle='#ff0';ctx.fillRect(-6,-3,12,6);}
    else{ctx.fillStyle='#f0f';ctx.beginPath();ctx.moveTo(0,-8-pulse);ctx.lineTo(6,4);ctx.lineTo(-6,4);ctx.closePath();ctx.fill();}
    ctx.restore();});
  // Enemies
  enemies.forEach(e=>{ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle);
    if(e.isBoss){
      ctx.fillStyle=e.hp<e.maxHp*0.3?'#f00':e.hp<e.maxHp*0.66?'#f80':'#ff0';
      ctx.beginPath();ctx.moveTo(e.size,0);ctx.lineTo(-e.size,-e.size*0.7);ctx.lineTo(-e.size*0.5,0);ctx.lineTo(-e.size,e.size*0.7);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#ff0';ctx.lineWidth=2;ctx.stroke();
      // Boss phase indicator
      ctx.fillStyle='#fff';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText('P'+e.bossPhase,0,-e.size-5);
    }else{
      ctx.fillStyle=e.type==='bomber'?'#a55':e.type==='heli'?'#5a5':e.type==='drone'?'#55f':e.type==='turret'?'#a85':'#f55';
      ctx.beginPath();ctx.moveTo(e.size,0);ctx.lineTo(-e.size,-e.size*0.6);ctx.lineTo(-e.size*0.3,0);ctx.lineTo(-e.size,e.size*0.6);ctx.closePath();ctx.fill();
    }
    if(e.hp<e.maxHp){const bw=e.size*2;ctx.fillStyle='#333';ctx.fillRect(-bw/2,-e.size-8,bw,3);ctx.fillStyle='#0f0';ctx.fillRect(-bw/2,-e.size-8,bw*(e.hp/e.maxHp),3);}
    ctx.restore();});
  // Wingman
  if(wingman.hp>0){ctx.save();ctx.translate(wingman.x,wingman.y);ctx.rotate(wingman.angle);ctx.fillStyle='#0ff';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-10,-7);ctx.lineTo(-5,0);ctx.lineTo(-10,7);ctx.closePath();ctx.fill();ctx.restore();}
  // Player
  if(player.invuln<=0||Math.floor(player.invuln/3)%2===0){ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.angle);ctx.fillStyle='#0ff';ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(-12,-9);ctx.lineTo(-6,0);ctx.lineTo(-12,9);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#08f';ctx.beginPath();ctx.arc(-10,0,4,0,Math.PI*2);ctx.fill();ctx.restore();}
  // Bullets
  bullets.forEach(b=>{ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.size,0,Math.PI*2);ctx.fill();ctx.fillStyle=b.color;ctx.globalAlpha=0.3;ctx.beginPath();ctx.arc(b.x-b.vx*0.5,b.y-b.vy*0.5,b.size*0.8,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;});
  // Particles
  particles.forEach(p=>{const a=p.life/p.maxLife;ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*a,0,Math.PI*2);ctx.fill();});
  ctx.globalAlpha=1;ctx.restore();
  // Radar
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(760,540,130,130);ctx.strokeStyle='#0ff';ctx.lineWidth=1;ctx.strokeRect(760,540,130,130);
  ctx.fillStyle='#0ff';ctx.beginPath();ctx.arc(760+player.x/900*130,540+player.y/700*130,3,0,Math.PI*2);ctx.fill();
  if(wingman.hp>0){ctx.fillStyle='#0aa';ctx.beginPath();ctx.arc(760+wingman.x/900*130,540+wingman.y/700*130,2,0,Math.PI*2);ctx.fill();}
  enemies.forEach(e=>{ctx.fillStyle=e.isBoss?'#f00':'#f44';ctx.beginPath();ctx.arc(760+e.x/900*130,540+e.y/700*130,e.isBoss?4:2,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle='#fff';ctx.font='8px monospace';ctx.fillText('RADAR',790,552);
  // Touch joystick
  if(touchJoystick.active){
    ctx.globalAlpha=0.3;ctx.fillStyle='#0ff';ctx.beginPath();ctx.arc(150,500,40,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(150+touchJoystick.dx*30,500+touchJoystick.dy*30,15,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
}

function gameLoop(){update();render();requestAnimationFrame(gameLoop);}

// Input
document.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;
  if(state==='playing'){if(e.key==='1')player.weapon=0;if(e.key==='2')player.weapon=1;if(e.key==='3')player.weapon=2;}
  if(e.key===' '&&state==='playing')e.preventDefault();});
document.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*900;mouse.y=(e.clientY-r.top)/r.height*700;});
canvas.addEventListener('mousedown',e=>{mouse.down=true;if(audioCtx.state==='suspended')try{getAudioCtx();if(audioCtx)try{getAudioCtx();if(audioCtx)audioCtx.resume();}catch(e){};}catch(e){}});
canvas.addEventListener('mouseup',()=>{mouse.down=false;});
canvas.addEventListener('wheel',e=>{if(state==='playing'){player.weapon=(player.weapon+(e.deltaY>0?1:-1)+3)%3;}});

// Menu
document.getElementById('btn-start').onclick=()=>{missionIdx=0;score=0;showMissionBrief();};
document.getElementById('btn-how').onclick=()=>showScreen('how-screen');
document.getElementById('btn-upgrades').onclick=()=>renderUpgrades();showScreen('upgrade-screen');
document.getElementById('btn-back-how').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-back-upgrade').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-launch').onclick=()=>startMission();
document.getElementById('btn-next').onclick=()=>{missionIdx++;showAd();};
document.getElementById('btn-menu').onclick=()=>{state='menu';showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};

function renderUpgrades(){
  const list=document.getElementById('upgrade-list');
  const ups=[{key:'mgDmg',name:'Machine Gun Damage',desc:'More bullet damage'},{key:'misDmg',name:'Missile Damage',desc:'More missile damage'},{key:'lasDmg',name:'Laser Damage',desc:'More laser damage'},{key:'hpMax',name:'Max Health',desc:'More HP'},{key:'armorMax',name:'Max Armor',desc:'More armor'},{key:'speed',name:'Speed',desc:'Faster movement'}];
  list.innerHTML='';
  ups.forEach(u=>{const lvl=upgrades[u.key];const cost=upgradeCosts[lvl]||999;const canBuy=getCoins()>=cost&&lvl<5;const div=document.createElement('div');div.className='upgrade-item';div.innerHTML=`<div class="upgrade-info"><div class="upgrade-name">${u.name}</div><div class="upgrade-level">${u.desc} (Lv ${lvl}/5)</div></div>`;if(lvl<5){const btn=document.createElement('button');btn.className='upgrade-btn';btn.textContent=cost+' coins';btn.disabled=!canBuy;btn.onclick=()=>{if(getCoins()>=cost){saveCoins(getCoins()-cost);upgrades[u.key]++;renderUpgrades();coinSound();}};div.appendChild(btn);}else{const sp=document.createElement('span');sp.style.color='#0f0';sp.textContent='MAX';div.appendChild(sp);}list.appendChild(div);});
  document.getElementById('upgrade-coins').textContent=getCoins();
}

document.getElementById('menu-coins').textContent=getCoins();
gameLoop();
})();
