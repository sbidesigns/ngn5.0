// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('chefs-arena'); } catch(e) {}

// CHEF'S ARENA - NGN4 Game #39 - Cooking Game
(function(){
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
canvas.width=900;canvas.height=700;

let AC=null;function getAC(){if(!AC)try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}return AC;}
function snd(f,d,t='sine',v=0.06){if(!getAC())return;const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d);}
function chopSnd(){snd(800,0.05,'square',0.04);}
function cookSnd(){snd(200,0.15,'sawtooth',0.05);}
function serveSnd(){snd(600,0.1,'sine',0.08);setTimeout(()=>snd(900,0.1,'sine',0.08),100);}
function burnSnd(){snd(100,0.3,'sawtooth',0.08);}
function coinSnd(){snd(1000,0.08,'sine',0.06);}
function failSnd(){snd(200,0.2,'square',0.06);}
function orderSnd(){snd(500,0.15,'sine',0.06);setTimeout(()=>snd(700,0.1,'sine',0.06),120);}

let coins=parseInt(localStorage.getItem('ngn4_rewards')||'0');
function getCoins(){return parseInt(localStorage.getItem('ngn4_rewards')||'0');}
function saveCoins(c){localStorage.setItem('ngn4_rewards',c);}

let state='menu',levelIdx=0;
let money=0,served=0,failed=0,combo=0,comboTimer=0,maxCombo=0;
let levelTimer=0,customersLeft=0;
let currentRecipe=null,currentIngredients=[],currentStep=0;
let cookingStation=null,cookingTimer=0,cookingDish=null,isCooking=false;
let cookingBurnTimer=0;

// Upgrades
let upgrades={stoveSpeed:0,ovenSpeed:0,grillSpeed:0,fryerSpeed:0,tipBonus:0,patience:0};
const upgradeCosts=[80,160,320,640,1280];

// Recipes: 30 across 5 cuisines, 6 each
const cuisines={
  american:[
    {name:'Burger',ingredients:['Bun','Patty','Lettuce','Tomato'],station:'grill',time:4,color:'#a85'},
    {name:'Hot Dog',ingredients:['Bun','Sausage','Mustard','Ketchup'],station:'grill',time:3,color:'#c85'},
    {name:'Pancakes',ingredients:['Flour','Egg','Milk','Butter'],station:'stove',time:3,color:'#da8'},
    {name:'Fried Chicken',ingredients:['Chicken','Flour','Egg','Oil'],station:'fryer',time:5,color:'#c96'},
    {name:'Mac & Cheese',ingredients:['Pasta','Cheese','Milk','Butter'],station:'stove',time:4,color:'#ed8'},
    {name:'Pizza',ingredients:['Dough','Sauce','Cheese','Pepperoni'],station:'oven',time:5,color:'#e84'}
  ],
  japanese:[
    {name:'Sushi Roll',ingredients:['Rice','Nori','Fish','Wasabi'],station:null,time:2,color:'#e8e'},
    {name:'Ramen',ingredients:['Noodles','Broth','Pork','Egg'],station:'stove',time:5,color:'#ee8'},
    {name:'Tempura',ingredients:['Shrimp','Flour','Egg','Oil'],station:'fryer',time:4,color:'#ec8'},
    {name:'Gyoza',ingredients:['Wrappers','Pork','Cabbage','Oil'],station:'fryer',time:4,color:'#dc8'},
    {name:'Teriyaki',ingredients:['Chicken','Soy','Sugar','Ginger'],station:'stove',time:4,color:'#c84'},
    {name:'Miso Soup',ingredients:['Miso','Tofu','Seaweed','Broth'],station:'stove',time:3,color:'#ca8'}
  ],
  italian:[
    {name:'Pasta',ingredients:['Pasta','Sauce','Garlic','Basil'],station:'stove',time:4,color:'#e84'},
    {name:'Lasagna',ingredients:['Pasta','Sauce','Cheese','Meat'],station:'oven',time:6,color:'#d84'},
    {name:'Bruschetta',ingredients:['Bread','Tomato','Basil','Oil'],station:null,time:2,color:'#e94'},
    {name:'Risotto',ingredients:['Rice','Broth','Cheese','Butter'],station:'stove',time:5,color:'#ed8'},
    {name:'Calzone',ingredients:['Dough','Cheese','Meat','Sauce'],station:'oven',time:5,color:'#e85'},
    {name:'Tiramisu',ingredients:['Cream','Coffee','Mascarpone','Cocoa'],station:null,time:2,color:'#a74'}
  ],
  mexican:[
    {name:'Taco',ingredients:['Tortilla','Beef','Lettuce','Salsa'],station:null,time:2,color:'#ec4'},
    {name:'Burrito',ingredients:['Tortilla','Rice','Beans','Cheese'],station:null,time:2,color:'#dc4'},
    {name:'Enchilada',ingredients:['Tortilla','Sauce','Cheese','Chicken'],station:'oven',time:4,color:'#e64'},
    {name:'Quesadilla',ingredients:['Tortilla','Cheese','Pepper','Oil'],station:'grill',time:3,color:'#ee4'},
    {name:'Guacamole',ingredients:['Avocado','Lime','Onion','Cilantro'],station:null,time:2,color:'#8c4'},
    {name:'Churros',ingredients:['Dough','Sugar','Cinnamon','Oil'],station:'fryer',time:4,color:'#ca6'}
  ],
  indian:[
    {name:'Butter Chicken',ingredients:['Chicken','Butter','Cream','Spice'],station:'stove',time:5,color:'#e86'},
    {name:'Naan',ingredients:['Flour','Yogurt','Butter','Garlic'],station:'oven',time:3,color:'#ec8'},
    {name:'Samosa',ingredients:['Dough','Potato','Peas','Spice'],station:'fryer',time:4,color:'#dc6'},
    {name:'Curry',ingredients:['Chicken','Onion','Tomato','Spice'],station:'stove',time:5,color:'#e64'},
    {name:'Biryani',ingredients:['Rice','Chicken','Spice','Saffron'],station:'stove',time:6,color:'#ea4'},
    {name:'Mango Lassi',ingredients:['Mango','Yogurt','Milk','Sugar'],station:null,time:2,color:'#ee4'}
  ]
};

const allRecipes=Object.values(cuisines).flat();

// Ingredient colors
const ingredientColors={
  Bun:'#da8',Patty:'#844',Lettuce:'#4a4',Tomato:'#e44',Sausage:'#a64',Mustard:'#ee4',Ketchup:'#e22',
  Flour:'#eed',Egg:'#fe8',Milk:'#fff',Butter:'#fe4',Chicken:'#fa6',Oil:'#ee8',Pasta:'#ee4',Cheese:'#fe4',
  Sauce:'#c44',Pepperoni:'#a33',Dough:'#ec8',Rice:'#eee',Nori:'#284',Fish:'#f86',Wasabi:'#4f4',
  Noodles:'#ee8',Broth:'#ca8',Pork:'#d96',Shrimp:'#f96',Wrappers:'#eee',Cabbage:'#8c8',
  Soy:'#6a2',Sugar:'#ffe',Ginger:'#c84',Miso:'#a64',Tofu:'#fee',Seaweed:'#264',Garlic:'#ee8',Basil:'#4c4',
  Meat:'#a44',Cream:'#fee',Coffee:'#844',Mascarpone:'#ffe',Cocoa:'#842',Bread:'#ec4',
  Tortilla:'#ec4',Beef:'#a44',Salsa:'#e64',Rice:'#eee',Beans:'#8a4',Avocado:'#8c4',Lime:'#4e4',
  Onion:'#fa4',Cilantro:'#4c4',Cinnamon:'#a62',Yogurt:'#ffe',Potato:'#da8',Peas:'#4a4',
  Spice:'#e64',Cream:'#fee',Saffron:'#ea4',Mango:'#fe4'
};

// Levels: 15 levels
const levels=[];
const cuisineNames=['American','Japanese','Italian','Mexican','Indian'];
const levelDescs=[
  "Welcome to Chef's Arena! Start with simple American classics.",
  "More American dishes. Speed matters now!",
  "Master the American menu. Customers are getting impatient.",
  "New cuisine! Japanese cooking requires precision.",
  "Japanese dishes get more complex. Watch the grill!",
  "Final Japanese challenge. Ramen rush hour!",
  "Italian cuisine! Pasta and pizza time.",
  "Italian oven mastery. Baking takes patience.",
  "Italian perfection. No mistakes allowed!",
  "Mexican fiesta! Fresh and fast.",
  "Mexican heat! The fryer is your friend.",
  "Mexican mastery. Complex flavor combinations.",
  "Indian spice journey begins. Curry up!",
  "Indian complexity. Multi-spice dishes.",
  "Grand Finale! All cuisines. Be the Champion!"
];
for(let i=0;i<15;i++){
  const ci=Math.floor(i/3);
  const cuisine=cuisineNames[ci];
  const recipePool=cuisines[cuisineNames[ci].toLowerCase()];
  const numRecipes=Math.min(2+Math.floor(i/3),6);
  const recipes=recipePool.slice(0,numRecipes);
  levels.push({
    name:'Level '+(i+1)+': '+cuisine,
    desc:levelDescs[i],
    obj:'Serve '+Math.min(8+i*2,25)+' customers! ('+numRecipes+' recipes)',
    target:Math.min(8+i*2,25),
    recipes:recipes,
    timeLimit:90+i*10,
    customerRate:Math.max(80-i*3,35),
    patience:40+i*2
  });
}

// Game objects
let customers=[],ingredients=[],cookingAreas=[];
let kitchenUpgrades={stoveSpd:1,ovenSpd:1,grillSpd:1,fryerSpd:1};
let custSpawnTimer=0,activeIngredients=[]; // current recipe ingredients shown
let selectedStation=null;
let toastMsg='',toastTimer=0;

// ── Obstacle System ──
let fires=[];           // fire hazards on stations
let pests=[];           // rats/mice moving across kitchen
let spoiledIngredients=[]; // spoiled ingredients in palette
let rushHourTimer=0;    // countdown to next rush hour
let rushHourActive=false;
let rushHourDuration=0;
let pestSpawnTimer=0;
let fireSpawnTimer=0;
let hazardFlashes=[];   // visual flash effects for hazards

function initLevel(){
  const lv=levels[levelIdx];
  money=0;served=0;failed=0;combo=0;comboTimer=0;maxCombo=0;
  levelTimer=lv.timeLimit*60;customersLeft=lv.target;
  currentRecipe=null;currentIngredients=[];currentStep=0;
  cookingStation=null;cookingTimer=0;cookingDish=null;isCooking=false;cookingBurnTimer=0;
  customers=[];custSpawnTimer=0;activeIngredients=[];selectedStation=null;
  toastMsg='';toastTimer=0;
  fires=[];pests=[];spoiledIngredients=[];
  rushHourTimer=600+Math.random()*600; // first rush hour after 10-20s
  rushHourActive=false;rushHourDuration=0;
  pestSpawnTimer=300+Math.random()*300;
  fireSpawnTimer=400+Math.random()*400;

  // Set kitchen upgrade multipliers
  kitchenUpgrades.stoveSpd=1+upgrades.stoveSpeed*0.15;
  kitchenUpgrades.ovenSpd=1+upgrades.ovenSpeed*0.15;
  kitchenUpgrades.grillSpd=1+upgrades.grillSpeed*0.15;
  kitchenUpgrades.fryerSpd=1+upgrades.fryerSpeed*0.15;

  // Ingredient buttons for current level
  const allIngr=new Set();
  lv.recipes.forEach(r=>r.ingredients.forEach(i=>allIngr.add(i)));
  ingredients=[...allIngr];

  state='playing';
  showScreen(null);
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('hud-level').textContent=lv.name;
}

function showToast(msg){toastMsg=msg;toastTimer=120;}

function spawnCustomer(){
  const lv=levels[levelIdx];
  const recipe=lv.recipes[Math.floor(Math.random()*lv.recipes.length)];
  const patience=lv.patience+upgrades.patience*5;
  const y=80+Math.random()*100;
  customers.push({
    x:950,y:y,targetX:600+Math.random()*200,
    recipe:recipe,patience:patience*60,maxPatience:patience*60,
    state:'entering',served:false,
    tipMultiplier:1+upgrades.tipBonus*0.2
  });
  orderSnd();
}

function startCooking(recipe){
  if(isCooking)return;
  currentRecipe=recipe;
  currentIngredients=[...recipe.ingredients];
  currentStep=0;
  isCooking=true;
  cookingDish={name:recipe.name,color:recipe.color,steps:0,maxSteps:recipe.ingredients.length,
    station:recipe.station,stationTime:recipe.time*60,needsCooking:!!recipe.station};
  cookingTimer=0;
  cookingBurnTimer=0;
  activeIngredients=currentIngredients.map(name=>({
    name,color:ingredientColors[name]||'#888',x:0,y:0,
    selected:false,size:40
  }));
  // Position ingredients in a row
  const startY=400;
  const spacing=90;
  const startX=200;
  activeIngredients.forEach((ing,i)=>{
    ing.x=startX+i*spacing;ing.y=startY;
  });
}

function finishIngredientClick(ingName){
  if(!isCooking||!cookingDish)return;
  if(currentStep>=currentIngredients.length)return;
  
  const expected=currentIngredients[currentStep];
  if(ingName===expected){
    currentStep++;
    chopSnd();
    activeIngredients[currentStep-1].selected=true;
    cookingDish.steps=currentStep;
    
    if(currentStep>=currentIngredients.length){
      if(cookingDish.needsCooking){
        // Move to cooking station
        showToast('Now cook on '+cookingDish.station.toUpperCase()+'!');
        selectedStation=cookingDish.station;
        cookingTimer=0;
      }else{
        // Dish ready to serve
        completeDish();
      }
    }
  }else{
    failSnd();
    combo=0;
    showToast('Wrong ingredient! Order reset.');
    // Reset current dish
    isCooking=false;cookingDish=null;activeIngredients=[];
  }
}

function cookOnStation(station){
  if(!cookingDish||cookingDish.station!==station)return;
  cookSnd();
  let speedMult=1;
  if(station==='stove')speedMult=kitchenUpgrades.stoveSpd;
  if(station==='oven')speedMult=kitchenUpgrades.ovenSpd;
  if(station==='grill')speedMult=kitchenUpgrades.grillSpd;
  if(station==='fryer')speedMult=kitchenUpgrades.fryerSpd;
  cookingTimer+=Math.ceil(speedMult*10);
  cookingBurnTimer+=10;
  
  if(cookingTimer>=cookingDish.stationTime){
    if(cookingBurnTimer>cookingDish.stationTime*1.5){
      burnSnd();
      showToast('BURNT! Dish ruined!');
      isCooking=false;cookingDish=null;activeIngredients=[];selectedStation=null;
      return;
    }
    completeDish();
  }
}

function completeDish(){
  serveSnd();
  isCooking=false;
  const dish=cookingDish;
  cookingDish=null;activeIngredients=[];selectedStation=null;
  
  // Try to serve to matching customer
  let servedCustomer=false;
  for(let i=0;i<customers.length;i++){
    const c=customers[i];
    if(!c.served&&c.recipe.name===dish.name){
      c.served=true;c.state='leaving';
      combo++;comboTimer=180;
      if(combo>maxCombo)maxCombo=combo;
      const tip=Math.floor(10*combo*c.tipMultiplier*(c.patience/c.maxPatience));
      money+=tip;served++;
      showToast('Served '+dish.name+'! +'+tip+' (x'+combo+')');
      customersLeft--;
      coinSnd();
      servedCustomer=true;
      break;
    }
  }
  if(!servedCustomer){
    showToast('No customer waiting for '+dish.name+'!');
    combo=0;
  }
}

function update(){
  if(state!=='playing')return;
  levelTimer--;
  
  // Combo timer
  if(comboTimer>0){comboTimer--;}else{combo=0;}
  if(toastTimer>0)toastTimer--;

  // ── Obstacle Updates ──
  // Rush hour system
  if(!rushHourActive){
    rushHourTimer--;
    if(rushHourTimer<=0){
      rushHourActive=true;
      rushHourDuration=300+Math.floor(Math.random()*300);
      showToast('⚠ RUSH HOUR! Customers incoming fast!');
      orderSnd();
    }
  }else{
    rushHourDuration--;
    if(rushHourDuration<=0){
      rushHourActive=false;
      rushHourTimer=600+Math.random()*600;
      showToast('Rush hour over!');
    }
  }

  // Fire hazard spawning
  fireSpawnTimer--;
  if(fireSpawnTimer<=0&&levelIdx>=2){
    fireSpawnTimer=500+Math.floor(Math.random()*400);
 const stKeys=['stove','oven','grill','fryer'];
    const stNames=['STOVE','OVEN','GRILL','FRYER'];
    const fi=Math.floor(Math.random()*4);
    // Don't spawn fire on a station being used
    const onActiveStation=isCooking&&cookingDish&&cookingDish.station===stKeys[fi];
    if(!onActiveStation&&!fires.some(f=>f.station===stKeys[fi])){
      fires.push({station:stKeys[fi],name:stNames[fi],timer:600,x:50+fi*180,y:560,extinguished:false});
      burnSnd();
    }
  }

  // Update fires
  for(let i=fires.length-1;i>=0;i--){
    const f=fires[i];
    if(f.extinguished){f.timer--;if(f.timer<=0)fires.splice(i,1);continue;}
    f.timer--;
    if(f.timer<=0){
      showToast('🔥 '+f.name+' caught fire! Station disabled!');
      burnSnd();
      // Fire penalty: lose a customer's patience
      const waiting=customers.find(c=>c.state==='waiting'&&!c.served);
      if(waiting){waiting.patience-=120;combo=0;}
      fires.splice(i,1);
    }
  }

  // Pest (rat) spawning
  pestSpawnTimer--;
  if(pestSpawnTimer<=0&&levelIdx>=3){
    pestSpawnTimer=400+Math.floor(Math.random()*400);
    const fromLeft=Math.random()<0.5;
    pests.push({
      x:fromLeft?-30:930,y:350+Math.random()*150,
      vx:(fromLeft?1.5:-1.5)*(0.8+Math.random()*0.7),
      timer:200+Math.floor(Math.random()*100),caught:false
    });
  }

  // Update pests
  for(let i=pests.length-1;i>=0;i--){
    const p=pests[i];
    p.x+=p.vx;p.timer--;
    if(p.caught){p.timer--;if(p.timer<=0)pests.splice(i,1);continue;}
    if(p.timer<=0||p.x<-50||p.x>950){
      // Pest reached other side - steal an ingredient or penalty
      if(Math.random()<0.5){
        combo=0;showToast('🐀 Rat stole a tip! -combo');
        const waiting=customers.find(c=>c.state==='waiting'&&!c.served);
        if(waiting)waiting.patience-=80;
      }
      pests.splice(i,1);
    }
  }

  // Spoiled ingredient spawning (level 4+)
  if(levelIdx>=4&&Math.random()<0.003){
    if(spoiledIngredients.length<2&&ingredients.length>0){
      const si=ingredients[Math.floor(Math.random()*ingredients.length)];
      if(!spoiledIngredients.some(s=>s.name===si)){
        spoiledIngredients.push({name:si,timer:400+Math.floor(Math.random()*200)});
      }
    }
  }
  // Update spoiled ingredients
  for(let i=spoiledIngredients.length-1;i>=0;i--){
    spoiledIngredients[i].timer--;
    if(spoiledIngredients[i].timer<=0)spoiledIngredients.splice(i,1);
  }

  // Hazard visual flashes
  for(let i=hazardFlashes.length-1;i>=0;i--){
    hazardFlashes[i].timer--;
    if(hazardFlashes[i].timer<=0)hazardFlashes.splice(i,1);
  }

  // Spawn customers
  custSpawnTimer--;
  const spawnRate=rushHourActive?Math.max(20,levels[levelIdx].customerRate-30):levels[levelIdx].customerRate;
  if(custSpawnTimer<=0&&customersLeft>0){
    spawnCustomer();
    custSpawnTimer=spawnRate;
  }

  // Update customers
  for(let i=customers.length-1;i>=0;i--){
    const c=customers[i];
    if(c.state==='entering'){
      c.x+=(c.targetX-c.x)*0.05;
      if(Math.abs(c.x-c.targetX)<5){c.x=c.targetX;c.state='waiting';}
    }
    if(c.state==='waiting'){
      c.patience--;
      if(c.patience<=0){
        c.state='leaving';failed++;combo=0;customersLeft--;
        failSnd();showToast('Customer left! (-patience)');
      }
    }
    if(c.state==='leaving'){
      c.x+=5;
      if(c.x>950)customers.splice(i,1);
    }
  }

  // Check if fire blocks station click (penalty for trying to use burning station)
  // (handled in click handler)

  // Check level end
  if(levelTimer<=0||(customersLeft<=0&&customers.length===0)){
    const lv=levels[levelIdx];
    state='result';
    const earned=money+(served>=lv.target?100:0);
    coins=getCoins()+earned;saveCoins(coins);
    const pass=served>=Math.floor(lv.target*0.6);
    document.getElementById('result-title').textContent=pass?'LEVEL COMPLETE!':'LEVEL FAILED';
    document.getElementById('result-title').style.color=pass?'#0f0':'#f44';
    document.getElementById('result-stats').innerHTML=
      `<p>Dishes Served: <span>${served}</span>/${lv.target}</p>`+
      `<p>Failed Orders: <span>${failed}</span></p>`+
      `<p>Tips Earned: <span>${money}</span></p>`+
      `<p>Max Combo: <span>x${maxCombo}</span></p>`+
      (served>=lv.target?`<p>Level Bonus: <span>+100</span></p>`:'');
    document.getElementById('result-coins').textContent='+'+earned;
    const nextBtn=document.getElementById('btn-next');
    nextBtn.textContent=levelIdx>=14?'CHAMPION!':'NEXT LEVEL';
    showScreen('result-screen');document.getElementById('hud').classList.add('hidden');
  }

  // HUD
  document.getElementById('hud-money').textContent=money;
  document.getElementById('hud-combo').textContent='COMBO: x'+Math.max(1,combo)+(rushHourActive?' 🔥':'');
  document.getElementById('hud-combo').style.color=combo>=5?'#f80':combo>=3?'#ff0':'#0ff';
  document.getElementById('hud-served').textContent=served;
  document.getElementById('hud-failed').textContent=failed;
  document.getElementById('hud-timer').textContent=Math.ceil(levelTimer/60);
  document.getElementById('hud-timer').style.color=levelTimer<600?'#f44':'#fff';
  document.getElementById('hud-coins').textContent=getCoins();
}

function render(){
  ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,900,700);

  // Kitchen floor
  ctx.fillStyle='#111';ctx.fillRect(0,200,900,500);
  ctx.strokeStyle='rgba(255,136,0,0.05)';ctx.lineWidth=1;
  for(let i=0;i<900;i+=30){ctx.beginPath();ctx.moveTo(i,200);ctx.lineTo(i,700);ctx.stroke();}
  for(let i=200;i<700;i+=30){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(900,i);ctx.stroke();}

  // Counter
  ctx.fillStyle='#2a1a0a';ctx.fillRect(0,190,900,15);
  ctx.fillStyle='#3a2a1a';ctx.fillRect(0,180,900,12);

  // Customer area (top)
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(0,0,900,180);

  // ── Draw Obstacles ──
  // Rush hour indicator
  if(rushHourActive){
    ctx.fillStyle=`rgba(255,50,0,${0.1+Math.sin(Date.now()*0.01)*0.05})`;
    ctx.fillRect(0,0,900,700);
    ctx.fillStyle='#f44';ctx.font='16px monospace';ctx.textAlign='center';
    ctx.fillText('🔥 RUSH HOUR! ('+Math.ceil(rushHourDuration/60)+'s)',450,210);
    ctx.textAlign='left';
  }

  // Fire hazards
  fires.forEach(f=>{
    const flash=Math.sin(Date.now()*0.02)>0;
    ctx.fillStyle=f.extinguished?'#444':(flash?'#f80':'#f44');
    ctx.font='24px serif';ctx.textAlign='center';
    const stIdx=['stove','oven','grill','fryer'].indexOf(f.station);
 const fx=50+stIdx*180+80,fy=560;
    ctx.fillText('🔥',fx,fy-15);
    if(!f.extinguished){
      ctx.fillStyle='#f44';ctx.font='9px monospace';
      ctx.fillText('FIRE! CLICK!',fx,fy+20);
      ctx.fillStyle='#f80';ctx.font='8px monospace';
      ctx.fillText(Math.ceil(f.timer/60)+'s',fx,fy+32);
    }else{
      ctx.fillStyle='#888';ctx.font='9px monospace';
      ctx.fillText('extinguished',fx,fy+20);
    }
    ctx.textAlign='left';
  });

  // Pests (rats)
  pests.forEach(p=>{
    if(p.caught)return;
    ctx.fillStyle='#865';ctx.font='20px serif';
    ctx.fillText('🐀',p.x,p.y);
    // Clickable area hint
    ctx.strokeStyle='#f80';ctx.lineWidth=1;
    ctx.strokeRect(p.x-12,p.y-18,24,24);
  });

  // Spoiled ingredients indicator
  spoiledIngredients.forEach(si=>{
    const idx=ingredients.indexOf(si.name);
    if(idx>=0){
      const row=Math.floor(idx/2),col=idx%2;
      const bx=20+col*60,by=250+row*42;
      ctx.fillStyle='rgba(255,0,0,0.3)';ctx.fillRect(bx,by,55,36);
      ctx.fillStyle='#f00';ctx.font='10px monospace';ctx.fillText('⚠ SPOILED',bx+2,by+10);
    }
  });

  // Hazard flashes
  hazardFlashes.forEach(hf=>{
    ctx.fillStyle=`rgba(${hf.r},${hf.g},${hf.b},${hf.timer/30})`;
    ctx.font=hf.font||'20px serif';
    ctx.textAlign='center';
    ctx.fillText(hf.text,hf.x,hf.y);
    ctx.textAlign='left';
  });

  // Draw customers
  customers.forEach(c=>{
    if(c.x<-50||c.x>950)return;
    // Customer body
    const pRatio=c.patience/c.maxPatience;
    ctx.fillStyle=c.served?'#4a4':'#aaf';
    ctx.beginPath();ctx.arc(c.x,c.y-20,18,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(c.x-5,c.y-25,3,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(c.x+5,c.y-25,3,0,Math.PI*2);ctx.fill();
    
    // Order bubble
    if(c.state==='waiting'&&!c.served){
      ctx.fillStyle='rgba(255,255,255,0.9)';
      ctx.beginPath();ctx.arc(c.x,c.y-55,22,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=c.recipe.color;ctx.fillRect(c.x-10,c.y-63,20,16);
      ctx.font='8px monospace';ctx.fillStyle='#000';ctx.fillText(c.recipe.name,c.x-18,c.y-45);
      
      // Patience bar
      ctx.fillStyle='#333';ctx.fillRect(c.x-15,c.y+2,30,4);
      ctx.fillStyle=pRatio>0.5?'#0f0':pRatio>0.25?'#ff0':'#f00';
      ctx.fillRect(c.x-15,c.y+2,30*pRatio,4);
    }
  });

  // Cooking stations
  const stations=[
    {name:'STOVE',x:50,y:580,w:160,h:100,color:'#a44',key:'stove'},
    {name:'OVEN',x:230,y:580,w:160,h:100,color:'#884',key:'oven'},
    {name:'GRILL',x:410,y:580,w:160,h:100,color:'#864',key:'grill'},
    {name:'FRYER',x:590,y:580,w:160,h:100,color:'#a84',key:'fryer'}
  ];
  stations.forEach(s=>{
    ctx.fillStyle='#1a1a1a';ctx.fillRect(s.x,s.y,s.w,s.h);
    ctx.strokeStyle=selectedStation===s.key?'#ff0':s.color;ctx.lineWidth=2;
    ctx.strokeRect(s.x,s.y,s.w,s.h);
    ctx.fillStyle=s.color;ctx.font='14px monospace';ctx.fillText(s.name,s.x+10,s.y+25);
    
    // Cooking progress
    if(isCooking&&cookingDish&&cookingDish.station===s.key){
      const prog=cookingTimer/cookingDish.stationTime;
      const burnProg=cookingBurnTimer/(cookingDish.stationTime*1.5);
      ctx.fillStyle='#333';ctx.fillRect(s.x+10,s.y+40,s.w-20,15);
      ctx.fillStyle=burnProg>0.8?'#f00':prog>=1?'#0f0':'#ff0';
      ctx.fillRect(s.x+10,s.y+40,(s.w-20)*Math.min(prog,1),15);
      if(prog>=1){ctx.fillStyle='#0f0';ctx.font='12px monospace';ctx.fillText('DONE! CLICK!',s.x+30,s.y+80);}
      if(burnProg>0.7){ctx.fillStyle='#f44';ctx.font='10px monospace';ctx.fillText('BURNING!',s.x+40,s.y+95);}
    }
  });

  // Serve area
  ctx.fillStyle='#1a1a0a';ctx.fillRect(770,580,120,100);
  ctx.strokeStyle='#ff0';ctx.lineWidth=2;ctx.strokeRect(770,580,120,100);
  ctx.fillStyle='#ff0';ctx.font='12px monospace';ctx.fillText('SERVE',800,610);
  ctx.fillText('HERE',808,625);

  // Active ingredients (being assembled)
  if(activeIngredients.length>0){
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(150,340,600,100);
    ctx.strokeStyle='#f80';ctx.lineWidth=1;ctx.strokeRect(150,340,600,100);
    ctx.fillStyle='#fff';ctx.font='11px monospace';ctx.fillText('RECIPE: '+(currentRecipe?currentRecipe.name:''),160,358);
    
    // Step indicator
    ctx.fillStyle='#888';ctx.font='10px monospace';
    if(currentRecipe)ctx.fillText('Step '+(currentStep+1)+'/'+currentIngredients.length,500,358);
    
    activeIngredients.forEach((ing,i)=>{
      ctx.fillStyle=ing.selected?'#444':'rgba(0,0,0,0.6)';
      ctx.fillRect(ing.x-20,ing.y-18,42,42);
      ctx.strokeStyle=ing.selected?'#0f0':(i===currentStep?'#ff0':'#666');
      ctx.lineWidth=i===currentStep?2:1;
      ctx.strokeRect(ing.x-20,ing.y-18,42,42);
      // Ingredient color circle
      ctx.fillStyle=ing.color;ctx.beginPath();ctx.arc(ing.x+1,ing.y+3,12,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='8px monospace';ctx.fillText(ing.name,ing.x-18,ing.y+32);
      // Checkmark if selected
      if(ing.selected){ctx.fillStyle='#0f0';ctx.font='16px monospace';ctx.fillText('✓',ing.x+12,ing.y+10);}
    });
  }

  // Ingredient palette (left side)
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(10,220,130,340);
  ctx.strokeStyle='#f80';ctx.lineWidth=1;ctx.strokeRect(10,220,130,340);
  ctx.fillStyle='#f80';ctx.font='11px monospace';ctx.fillText('INGREDIENTS',20,238);
  ingredients.forEach((name,i)=>{
    const row=Math.floor(i/2),col=i%2;
    const bx=20+col*60,by=250+row*42;
    ctx.fillStyle='rgba(30,30,30,0.8)';ctx.fillRect(bx,by,55,36);
    ctx.strokeStyle='#444';ctx.strokeRect(bx,by,55,36);
    ctx.fillStyle=ingredientColors[name]||'#888';
    ctx.beginPath();ctx.arc(bx+15,by+18,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ccc';ctx.font='7px monospace';
    ctx.fillText(name.slice(0,6),bx+26,by+14);
    ctx.fillText(name.slice(6,12),bx+26,by+24);
  });

  // Recipe quick reference
  const lv=levels[levelIdx];
  if(lv){
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(770,220,120,340);
    ctx.strokeStyle='#0ff';ctx.lineWidth=1;ctx.strokeRect(770,220,120,340);
    ctx.fillStyle='#0ff';ctx.font='10px monospace';ctx.fillText('RECIPES',780,238);
    lv.recipes.forEach((r,i)=>{
      ctx.fillStyle=r.color;ctx.fillRect(780,248+i*45,100,38);
      ctx.fillStyle='#000';ctx.font='9px monospace';
      ctx.fillText(r.name,785,262+i*45);
      ctx.font='7px monospace';
      const steps=r.ingredients.join('>');
      ctx.fillText(steps.slice(0,16),785,274+i*45);
      if(steps.length>16)ctx.fillText(steps.slice(16,32),785,284+i*45);
      ctx.fillStyle='#888';ctx.font='7px monospace';
      ctx.fillText(r.station?r.station.toUpperCase():'RAW',785,294+i*45);
    });
  }

  // Toast message
  if(toastTimer>0){
    ctx.fillStyle=`rgba(0,0,0,${Math.min(toastTimer/30,0.8)*0.8})`;
    ctx.fillRect(250,300,400,40);
    ctx.strokeStyle='#f80';ctx.strokeRect(250,300,400,40);
    ctx.fillStyle='#fff';ctx.font='14px monospace';
    ctx.fillText(toastMsg,270,325);
  }
}

function gameLoop(){update();render();requestAnimationFrame(gameLoop);}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));if(id)document.getElementById(id).classList.add('active');}

function showLevelBrief(){
  if(levelIdx>=15){showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();return;}
  const lv=levels[levelIdx];
  document.getElementById('level-title').textContent=lv.name;
  document.getElementById('level-desc').textContent=lv.desc;
  document.getElementById('level-obj').textContent='OBJECTIVE: '+lv.obj;
  showScreen('level-brief');
}

function showAd(){
  state='ad';let t=3;
  document.getElementById('ad-timer').textContent=t;
  showScreen('ad-screen');
  const iv=setInterval(()=>{t--;document.getElementById('ad-timer').textContent=t;
    if(t<=0){clearInterval(iv);showLevelBrief();}
  },1000);
}

// Click handler
canvas.addEventListener('click',e=>{
  if(AC.state==='suspended')try{getAC();if(AC)try{getAC();if(AC)AC.resume();}catch(e){};}catch(e){}
  if(state!=='playing')return;
  const r=canvas.getBoundingClientRect();
  const mx=e.clientX-r.left,my=e.clientY-r.top;

  // Click ingredient palette
  if(mx>=20&&mx<=140&&my>=250&&my<=580){
    const col=Math.floor((mx-20)/60);
    const row=Math.floor((my-250)/42);
    const idx=row*2+col;
    if(idx<ingredients.length){
      const ingName=ingredients[idx];
      // Check if ingredient is spoiled
      if(spoiledIngredients.some(s=>s.name===ingName)){
        failSnd();showToast('⚠ That ingredient is SPOILED!');
        combo=0;money=Math.max(0,money-5);
        hazardFlashes.push({x:mx,y:my,text:'☠',r:255,g:0,b:0,timer:30,font:'24px serif'});
        return;
      }
      finishIngredientClick(ingName);
    }
    return;
  }

  // Click cooking stations (also handles fire hazard clicks)
  const stKeys=['stove','oven','grill','fryer'];
  const stX=[50,230,410,590];
  for(let i=0;i<4;i++){
    if(mx>=stX[i]&&mx<=stX[i]+160&&my>=560&&my<=680){
      // Check for fire hazard first
      const fire=fires.find(f=>f.station===stKeys[i]&&!f.extinguished);
      if(fire){
        fire.extinguished=true;fire.timer=60;
        showToast('🔥 Fire extinguished on '+fire.name+'!');
        coinSnd();
        hazardFlashes.push({x:stX[i]+80,y:570,text:'💨',r:100,g:200,b:255,timer:30,font:'24px serif'});
        return;
      }
      // Normal station interaction
      if(isCooking&&cookingDish&&cookingDish.needsCooking&&cookingDish.station===stKeys[i]){
        if(cookingTimer>=cookingDish.stationTime){
          completeDish();
        }else{
          cookOnStation(stKeys[i]);
        }
      }else if(isCooking&&cookingDish&&cookingDish.station===stKeys[i]){
        cookOnStation(stKeys[i]);
      }
      return;
    }
  }

  // Click on pests to catch them
  for(let i=pests.length-1;i>=0;i--){
    const p=pests[i];
    if(p.caught)continue;
    if(mx>p.x-15&&mx<p.x+15&&my>p.y-20&&my<p.y+10){
      p.caught=true;p.timer=30;
      money+=3;coinSnd();
      showToast('🐀 Caught the rat! +3');
      hazardFlashes.push({x:p.x,y:p.y,text:'💥',r:255,g:200,b:0,timer:25,font:'20px serif'});
      return;
    }
  }

  // Click serve area
  if(mx>=770&&mx<=890&&my>=580&&my<=680){
    if(isCooking&&cookingDish&&!cookingDish.needsCooking&&currentStep>=currentIngredients.length){
      completeDish();
    }
    return;
  }

  // Click waiting customer to take order
  customers.forEach(c=>{
    if(c.state==='waiting'&&!c.served){
      if(mx>c.x-20&&mx<c.x+20&&my>c.y-40&&my<c.y+10){
        if(!isCooking){
          startCooking(c.recipe);
          showToast('Making: '+c.recipe.name+' ('+c.recipe.ingredients.join(' → ')+')');
        }
      }
    }
  });
});

// Menu buttons
document.getElementById('btn-start').onclick=()=>{levelIdx=0;showLevelBrief();};
document.getElementById('btn-how').onclick=()=>showScreen('how-screen');
document.getElementById('btn-kitchen').onclick=()=>{renderKitchen();showScreen('kitchen-screen');};
document.getElementById('btn-back-how').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-back-kitchen').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();};
document.getElementById('btn-level-start').onclick=()=>initLevel();
document.getElementById('btn-next').onclick=()=>{
  levelIdx++;
  if(levelIdx>=15){showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();return;}
  showAd();
};
document.getElementById('btn-menu').onclick=()=>{
  state='menu';showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();
};

function renderKitchen(){
  const list=document.getElementById('kitchen-list');
  const ups=[
    {key:'stoveSpeed',name:'Stove Speed',desc:'Faster stove cooking'},
    {key:'ovenSpeed',name:'Oven Speed',desc:'Faster oven cooking'},
    {key:'grillSpeed',name:'Grill Speed',desc:'Faster grill cooking'},
    {key:'fryerSpeed',name:'Fryer Speed',desc:'Faster frying'},
    {key:'tipBonus',name:'Tip Bonus',desc:'+20% tips per level'},
    {key:'patience',name:'Customer Patience',desc:'Customers wait longer'}
  ];
  list.innerHTML='';
  ups.forEach(u=>{
    const lvl=upgrades[u.key];const cost=upgradeCosts[lvl]||999;const canBuy=getCoins()>=cost&&lvl<5;
    const div=document.createElement('div');div.className='upgrade-item';
    div.innerHTML=`<div class="upgrade-info"><div class="upgrade-name">${u.name}</div><div class="upgrade-level">${u.desc} (Lv ${lvl}/5)</div></div>`;
    if(lvl<5){const btn=document.createElement('button');btn.className='upgrade-btn';btn.textContent=cost+' coins';btn.disabled=!canBuy;
      btn.onclick=()=>{if(getCoins()>=cost){saveCoins(getCoins()-cost);upgrades[u.key]++;renderKitchen();coinSnd();}};div.appendChild(btn);}
    else{const sp=document.createElement('span');sp.style.color='#0f0';sp.textContent='MAX';div.appendChild(sp);}
    list.appendChild(div);
  });
  document.getElementById('kitchen-coins').textContent=getCoins();
}

document.getElementById('menu-coins').textContent=getCoins();
gameLoop();
})();
