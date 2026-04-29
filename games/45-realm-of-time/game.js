// ============================================================
// REALM OF TIME - Complete Action-RPG Game Engine (NGN4)
// ============================================================
(function() {
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('realm-of-time'); } catch(e) {}


// ---- CONSTANTS ----
const W = 900, H = 700, TILE = 40;
const COLS = 22, ROWS = 17;
const MAX_HEARTS = 12, MAX_MAGIC = 100, MAX_LEVEL = 20;
const SHARD_TOTAL = 7;
const DIR = {N:0,NE:1,E:2,SE:3,S:4,SW:5,W:6,NW:7};
const DX = [0,1,1,1,0,-1,-1,-1];
const DY = [-1,-1,0,1,1,1,0,-1];
const STATE = {
  MENU:'menu',PLAYING:'playing',PAUSED:'paused',DIALOGUE:'dialogue',
  SHOP:'shop',GAMEOVER:'gameover',BOSS_INTRO:'boss_intro',
  VICTORY:'victory',AD:'ad',REWARDED_AD:'rewarded_ad',
  ACHIEVEMENTS:'achievements',MINIGAME:'minigame',TRANSITION:'transition'
};
const ERA = {PAST:'past',PRESENT:'present'};

// ---- DUNGEON DEFINITIONS ----
const DUNGEONS = [
  {id:'forest',name:'Forest Temple',color:'#2a5',boss:'Gohma',miniboss:'Deku Scrub King',
   pastDesc:'Overgrown ancient grove',presentDesc:'Corrupted thorny maze',
   puzzle:'light_torches',shardReward:true},
  {id:'water',name:'Water Temple',color:'#28f',boss:'Morpha',miniboss:'Dark Octopus',
   pastDesc:'Dry riverbed ruins',presentDesc:'Flooded underwater passages',
   puzzle:'water_level',shardReward:true},
  {id:'fire',name:'Fire Temple',color:'#f42',boss:'Volvagia',miniboss:'Flare Dancer',
   pastDesc:'Dormant volcanic cavern',presentDesc:'Erupting lava streams',
   puzzle:'lava_flow',shardReward:true},
  {id:'shadow',name:'Shadow Temple',color:'#a2a',boss:'Bongo Bongo',miniboss:'Dead Hand',
   pastDesc:'Hidden village spirits',presentDesc:'Dark void abyss',
   puzzle:'mirrors',shardReward:true},
  {id:'wind',name:'Wind Temple',color:'#8fc',boss:'Mothula',miniboss:'Eye Switch Guard',
   pastDesc:'Calm floating platforms',presentDesc:'Tornado chaos',
   puzzle:'wind_timing',shardReward:true},
  {id:'ice',name:'Ice Temple',color:'#4cf',boss:'Freezard',miniboss:'Ice Wraith',
   pastDesc:'Flowing spring waters',presentDesc:'Frozen crystal caverns',
   puzzle:'freeze_melt',shardReward:true},
  {id:'time',name:'Time Citadel',color:'#ff4',boss:'Malachar',miniboss:null,
   pastDesc:'Grand citadel at its peak',presentDesc:'Ruined corrupted fortress',
   puzzle:'combined',shardReward:true}
];

// ---- ENEMY TYPES ----
const ENEMY_TYPES = [
  {id:'slime',name:'Slime',hp:3,atk:1,spd:0.8,color:'#4f4',size:14,xp:5},
  {id:'skeleton',name:'Skeleton',hp:6,atk:2,spd:1.2,color:'#ddd',size:16,xp:10},
  {id:'dark_knight',name:'Dark Knight',hp:15,atk:4,spd:0.9,color:'#a33',size:20,xp:25},
  {id:'wraith',name:'Wraith',hp:8,atk:3,spd:1.5,color:'#a6f',size:16,xp:15},
  {id:'bat',name:'Shadow Bat',hp:2,atk:1,spd:2,color:'#646',size:10,xp:3},
  {id:'spider',name:'Giant Spider',hp:5,atk:2,spd:1.3,color:'#443',size:14,xp:8},
  {id:'goron',name:'Corrupted Goron',hp:20,atk:5,spd:0.5,color:'#a84',size:24,xp:30},
  {id:'zora',name:'Dark Zora',hp:10,atk:3,spd:1.6,color:'#26a',size:16,xp:18},
  {id:'eye',name:'Beamos Eye',hp:4,atk:3,spd:0,color:'#f22',size:12,xp:12},
  {id:'wizrobe',name:'Wizrobe',hp:12,atk:4,spd:0.7,color:'#f8f',size:18,xp:22},
  {id:'ironknuckle',name:'Iron Knuckle',hp:25,atk:6,spd:0.6,color:'#886',size:22,xp:35},
  {id:'redead',name:'ReDead',hp:18,atk:5,spd:0.4,color:'#343',size:20,xp:28}
];

// ---- BOSS DATA ----
const BOSSES = {
  'Gohma':{hp:40,atk:4,spd:1.2,color:'#f44',size:30,xp:100,phase2:false},
  'Morpha':{hp:55,atk:5,spd:1,color:'#44f',size:35,xp:120,phase2:false},
  'Volvagia':{hp:65,atk:6,spd:1.5,color:'#f80',size:32,xp:150,phase2:true},
  'Bongo Bongo':{hp:70,atk:7,spd:1.3,color:'#a2a',size:38,xp:170,phase2:false},
  'Mothula':{hp:50,atk:5,spd:2,color:'#8fc',size:28,xp:130,phase2:false},
  'Freezard':{hp:60,atk:8,spd:0.8,color:'#4cf',size:34,xp:140,phase2:false},
  'Malachar':{hp:120,atk:10,spd:1,color:'#f0f',size:40,xp:300,phase2:true}
};

// ---- ITEMS ----
const ITEMS = {
  sword:{name:"Hero's Sword",type:'weapon',icon:'⚔',desc:'Basic sword',atk:3},
  bow:{name:'Ancient Bow',type:'weapon',icon:'🏹',desc:'Ranged attack',atk:2,ammo:30},
  boomerang:{name:'Boomerang',type:'tool',icon:'🪃',desc:'Stuns & collects',stun:2},
  bomb:{name:'Bomb',type:'tool',icon:'💣',desc:'Destroys walls',dmg:5,ammo:10},
  hookshot:{name:'Hookshot',type:'tool',icon:'🔗',desc:'Cross gaps',range:5},
  shield:{name:'Hero Shield',type:'armor',icon:'🛡',desc:'Blocks attacks',def:2},
  healthpot:{name:'Health Potion',type:'consumable',icon:'❤',desc:'Restore 3 hearts',heal:6},
  magicpot:{name:'Magic Potion',type:'consumable',icon:'💎',desc:'Restore 50 MP',magic:50},
  map_item:{name:'Dungeon Map',type:'key',icon:'🗺',desc:'Reveals map'},
  compass:{name:'Compass',type:'key',icon:'🧭',desc:'Shows secrets'},
  boss_key:{name:'Boss Key',type:'key',icon:'🔑',desc:'Opens boss door'},
  small_key:{name:'Small Key',type:'key',icon:'🗝',desc:'Opens locked doors'},
  heart_piece:{name:'Heart Piece',type:'collectible',icon:'💔',desc:'Collect 4 for a heart'},
  rupee_silver:{name:'Silver Rupee',type:'currency',icon:'💎',desc:'Worth 50 rupees',value:50},
  shard:{name:'Crystal Shard',type:'collectible',icon:'💠',desc:'Time Crystal piece'}
};

// ---- SHOP INVENTORY ----
const SHOP_ITEMS = [
  {item:'healthpot',price:30},
  {item:'magicpot',price:40},
  {item:'bomb',price:20,ammoRefill:true},
  {item:'bow',price:80,ammoRefill:true},
  {item:'heart_piece',price:200}
];

// ---- ACHIEVEMENTS ----
const ACHIEVEMENTS = [
  {id:'first_shard',name:'First Shard',desc:'Collect your first Crystal Shard',icon:'💠'},
  {id:'all_shards',name:'Time Restored',desc:'Collect all 7 Crystal Shards',icon:'⏳'},
  {id:'first_boss',name:'Boss Slayer',desc:'Defeat your first dungeon boss',icon:'💀'},
  {id:'all_bosses',name:'Champion',desc:'Defeat all 7 dungeon bosses',icon:'🏆'},
  {id:'max_hearts',name:'Full Life',desc:'Reach maximum 12 hearts',icon:'❤'},
  {id:'max_level',name:'Legendary Hero',desc:'Reach maximum level 20',icon:'⭐'},
  {id:'time_master',name:'Time Master',desc:'Shift between eras 100 times',icon:'🔄'},
  {id:'speed_clear',name:'Speed Runner',desc:'Complete a dungeon in under 3 minutes',icon:'⚡'},
  {id:'no_damage',name:'Untouchable',desc:'Defeat a boss without taking damage',icon:'✨'},
  {id:'all_secrets',name:'Explorer',desc:'Find all overworld secrets',icon:'🗺'},
  {id:'rich',name:'Wealthy',desc:'Hold 500 rupees at once',icon:'💰'},
  {id:'mini_fish',name:'Angler',desc:'Catch a fish in the fishing game',icon:'🐟'},
  {id:'mini_shoot',name:'Marksman',desc:'Get perfect score in target shooting',icon:'🎯'},
  {id:'mini_treasure',name:'Treasure Hunter',desc:'Find all buried treasures',icon:'🏆'},
  {id:'dodge_master',name:'Dodge Master',desc:'Dodge 50 attacks',icon:'💨'},
  {id:'kill_100',name:'Warrior',desc:'Defeat 100 enemies',icon:'⚔'},
  {id:'kill_500',name:'Annihilator',desc:'Defeat 500 enemies',icon:'🔥'},
  {id:'save_5',name:'Careful Saver',desc:'Save the game 5 times',icon:'💾'},
  {id:'potion_10',name:'Alchemist',desc:'Use 10 potions',icon:'🧪'},
  {id:'victory',name:'Realm Saved',desc:'Complete the game',icon:'👑'}
];

// ---- OVERWORLD MAP DATA ----
const OVERWORLD_MAP = [];
const OVERWORLD_WIDTH = 30, OVERWORLD_HEIGHT = 24;
// Tile types: 0=grass,1=wall,2=water,3=tree,4=path,5=portal,6=dungeon entrance,
//   7=house(NPC),8=shop,9=secret,10=bridge,11=sand,12=flower
const TILE_GROUND=0,TILE_WALL=1,TILE_WATER=2,TILE_TREE=3,TILE_PATH=4,
      TILE_PORTAL=5,TILE_DUNGEON=6,TILE_NPC=7,TILE_SHOP=8,TILE_SECRET=9,
      TILE_BRIDGE=10,TILE_SAND=11,TILE_FLOWER=12;
const TILE_COLORS = {
  0:'#2a5a2a',1:'#555566',2:'#2244aa',3:'#1a4a1a',4:'#8a7a5a',
  5:'#a855f7',6:'#aa6633',7:'#aa7744',8:'#ddaa33',9:'#ffdd44',
  10:'#8a6a4a',11:'#c8b878',12:'#2a6a2a'
};
const TILE_COLORS_PAST = {
  0:'#3a7a3a',1:'#556655',2:'#4488cc',3:'#2a6a2a',4:'#9a8a6a',
  5:'#66ddaa',6:'#886633',7:'#bb8855',8:'#eebb44',9:'#ffee66',
  10:'#9a7a5a',11:'#d8c888',12:'#3a8a3a'
};
const TILE_COLORS_PRESENT = {
  0:'#1a3a1a',1:'#444455',2:'#112266',3:'#0a2a0a',4:'#6a5a3a',
  5:'#8844cc',6:'#884422',7:'#885533',8:'#bb8822',9:'#cc9922',
  10:'#6a4a2a',11:'#a89868',12:'#1a4a1a'
};

// ---- GENERATE OVERWORLD ----
function generateOverworld() {
  const map = [];
  for (let y = 0; y < OVERWORLD_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < OVERWORLD_WIDTH; x++) {
      if (x === 0 || y === 0 || x === OVERWORLD_WIDTH-1 || y === OVERWORLD_HEIGHT-1) {
        map[y][x] = TILE_WALL;
      } else {
        map[y][x] = TILE_GROUND;
      }
    }
  }
  // River through middle
  for (let x = 0; x < OVERWORLD_WIDTH; x++) {
    let ry = Math.floor(OVERWORLD_HEIGHT/2) + Math.sin(x*0.5)*2;
    ry = Math.max(1, Math.min(OVERWORLD_HEIGHT-2, ry));
    map[ry][x] = TILE_WATER;
    if (map[ry-1]) map[ry-1][x] = TILE_WATER;
  }
  // Bridges
  map[Math.floor(OVERWORLD_HEIGHT/2)][8] = TILE_BRIDGE;
  map[Math.floor(OVERWORLD_HEIGHT/2)][20] = TILE_BRIDGE;
  if (map[Math.floor(OVERWORLD_HEIGHT/2)-1]) {
    map[Math.floor(OVERWORLD_HEIGHT/2)-1][8] = TILE_BRIDGE;
    map[Math.floor(OVERWORLD_HEIGHT/2)-1][20] = TILE_BRIDGE;
  }
  // Paths from center
  const cx = 15, cy = 12;
  for (let i = 0; i < 8; i++) { map[cy][cx+i] = TILE_PATH; map[cy][cx-i] = TILE_PATH; }
  for (let i = 0; i < 6; i++) { map[cy+i][cx] = TILE_PATH; map[cy-i][cx] = TILE_PATH; }
  // Trees scattered
  for (let i = 0; i < 60; i++) {
    let tx = 2+Math.floor(Math.random()*(OVERWORLD_WIDTH-4));
    let ty = 2+Math.floor(Math.random()*(OVERWORLD_HEIGHT-4));
    if (map[ty][tx] === TILE_GROUND) map[ty][tx] = TILE_TREE;
  }
  // Flowers
  for (let i = 0; i < 20; i++) {
    let tx = 2+Math.floor(Math.random()*(OVERWORLD_WIDTH-4));
    let ty = 2+Math.floor(Math.random()*(OVERWORLD_HEIGHT-4));
    if (map[ty][tx] === TILE_GROUND) map[ty][tx] = TILE_FLOWER;
  }
  // Dungeon entrances around the map
  map[3][3] = TILE_DUNGEON; // Forest
  map[3][27] = TILE_DUNGEON; // Water
  map[20][3] = TILE_DUNGEON; // Fire
  map[20][27] = TILE_DUNGEON; // Shadow
  map[3][15] = TILE_DUNGEON; // Wind
  map[20][15] = TILE_DUNGEON; // Ice
  map[12][15] = TILE_DUNGEON; // Time Citadel (center)
  // Time portals
  map[8][10] = TILE_PORTAL; map[8][20] = TILE_PORTAL;
  map[16][10] = TILE_PORTAL; map[16][20] = TILE_PORTAL;
  // NPC houses
  map[6][12] = TILE_NPC; map[6][18] = TILE_NPC;
  map[18][12] = TILE_NPC; map[18][18] = TILE_NPC;
  // Shop
  map[10][5] = TILE_SHOP; map[10][25] = TILE_SHOP;
  // Secrets
  map[5][8] = TILE_SECRET; map[5][22] = TILE_SECRET;
  map[19][8] = TILE_SECRET; map[19][22] = TILE_SECRET;
  map[10][15] = TILE_SECRET;
  return map;
}

// ---- DUNGEON MAP GENERATION ----
function generateDungeon(dungeonIdx) {
  const w = 16, h = 12;
  const map = [];
  for (let y = 0; y < h; y++) {
    map[y] = [];
    for (let x = 0; x < w; x++) {
      map[y][x] = (x===0||y===0||x===w-1||y===h-1) ? TILE_WALL : TILE_GROUND;
    }
  }
  // Rooms
  const rooms = [{x:1,y:1,w:5,h:4},{x:10,y:1,w:5,h:4},{x:1,y:7,w:5,h:4},{x:10,y:7,w:5,h:4},{x:6,y:5,w:4,h:3}];
  rooms.forEach(r => {
    for (let dy=0;dy<r.h;dy++) for (let dx=0;dx<r.w;dx++) {
      if (r.y+dy<h-1 && r.x+dx<w-1) map[r.y+dy][r.x+dx] = TILE_GROUND;
    }
  });
  // Corridors
  for (let x=5;x<10;x++) { map[2][x]=TILE_GROUND; map[9][x]=TILE_GROUND; }
  for (let y=4;y<7;y++) { map[y][3]=TILE_GROUND; map[y][12]=TILE_GROUND; }
  for (let y=5;y<7;y++) map[y][7]=TILE_GROUND;
  // Boss room features
  const d = DUNGEONS[dungeonIdx];
  if (dungeonIdx < 6) {
    // Puzzle elements
    map[2][2] = TILE_SECRET; map[2][4] = TILE_SECRET; // puzzle clues
    map[9][11] = TILE_SECRET; map[9][13] = TILE_SECRET;
    map[5][6] = TILE_PORTAL; // mini-boss area portal
    map[6][8] = TILE_DUNGEON; // boss door
  }
  return {map, w, h, rooms};
}

// ---- AUDIO SYSTEM (Procedural) ----
const AudioSys = {
  ctx: null,
  masterGain: null,
  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch(e) { /* audio not available */ }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  play(type) {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    switch(type) {
      case 'sword': this._tone(220,0.08,'sawtooth',0.3,t); this._tone(440,0.05,'square',0.15,t+0.02); break;
      case 'shield': this._noise(0.1,0.15,t); break;
      case 'bow': this._tone(660,0.1,'sine',0.2,t); this._tone(880,0.08,'sine',0.15,t+0.05); break;
      case 'bomb': this._tone(80,0.4,'sawtooth',0.4,t); this._noise(0.3,0.3,t+0.05); break;
      case 'puzzle': this._tone(440,0.15,'sine',0.2,t); this._tone(554,0.15,'sine',0.2,t+0.15); this._tone(660,0.2,'sine',0.25,t+0.3); break;
      case 'heart': this._tone(523,0.1,'sine',0.2,t); this._tone(659,0.1,'sine',0.2,t+0.1); this._tone(784,0.15,'sine',0.25,t+0.2); break;
      case 'hit': this._noise(0.08,0.2,t); this._tone(150,0.06,'square',0.15,t); break;
      case 'hurt': this._tone(200,0.15,'sawtooth',0.2,t); this._tone(150,0.15,'sawtooth',0.15,t+0.1); break;
      case 'die': for(let i=0;i<4;i++) this._tone(300-i*50,0.2,'sawtooth',0.2,t+i*0.2); break;
      case 'victory': [523,659,784,1047].forEach((f,i)=>this._tone(f,0.3,'sine',0.2,t+i*0.25)); break;
      case 'timeshift': this._tone(880,0.3,'sine',0.15,t); this._tone(1100,0.4,'sine',0.12,t+0.1); this._tone(660,0.3,'sine',0.1,t+0.2); break;
      case 'boss': this._tone(110,0.5,'sawtooth',0.3,t); this._tone(130,0.4,'sawtooth',0.25,t+0.2); this._tone(90,0.6,'sawtooth',0.3,t+0.4); break;
      case 'open': this._tone(440,0.1,'sine',0.15,t); this._tone(554,0.1,'sine',0.15,t+0.1); break;
      case 'pickup': this._tone(600,0.06,'square',0.1,t); this._tone(900,0.06,'square',0.1,t+0.06); break;
      case 'magic': this._tone(500,0.2,'sine',0.15,t); this._tone(700,0.2,'sine',0.15,t+0.1); this._tone(900,0.3,'sine',0.2,t+0.2); break;
      case 'dodge': this._tone(400,0.1,'triangle',0.15,t); break;
      default: this._tone(440,0.1,'sine',0.1,t);
    }
  },
  _tone(freq, dur, type, vol, t) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t+dur);
      osc.connect(gain); gain.connect(this.masterGain);
      osc.start(t); osc.stop(t+dur+0.05);
    } catch(e){}
  },
  _noise(dur, vol, t) {
    try {
      const bufSize = this.ctx.sampleRate * dur;
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i=0;i<bufSize;i++) data[i]=(Math.random()*2-1);
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      src.buffer = buf;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t+dur);
      src.connect(gain); gain.connect(this.masterGain);
      src.start(t); src.stop(t+dur+0.05);
    } catch(e){}
  }
};

// ---- INPUT SYSTEM ----
const Input = {
  keys: {}, pressed: {}, gamepad: null, touch: {active:false,dx:0,dy:0,actions:{}},
  init(canvas) {
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    // Touch
    if ('ontouchstart' in window) {
      document.getElementById('touch-controls').classList.remove('hidden');
      this._initTouch();
    }
    // Gamepad
    window.addEventListener('gamepadconnected', e => { this.gamepad = e.gamepad; });
  },
  update() {
    // Gamepad polling
    if (this.gamepad) {
      const gp = navigator.getGamepads()[this.gamepad.index];
      if (gp) this._pollGamepad(gp);
    }
  },
  _pollGamepad(gp) {
    const deadzone = 0.15;
    this.gamepadAxes = [0,0];
    if (Math.abs(gp.axes[0]) > deadzone) this.gamepadAxes[0] = gp.axes[0];
    if (Math.abs(gp.axes[1]) > deadzone) this.gamepadAxes[1] = gp.axes[1];
    this.gamepadButtons = {};
    const btnMap = {0:'sword',1:'shield',2:'item',3:'dodge',4:'timeshift',5:'interact',6:'pause'};
    gp.buttons.forEach((b,i) => {
      if (btnMap[i] && b.pressed) {
        if (!this.pressed['_gp'+i]) this.pressed['_gp'+i] = true;
        this.gamepadButtons[btnMap[i]] = true;
      }
    });
  },
  _initTouch() {
    const base = document.getElementById('joystick-base');
    const stick = document.getElementById('joystick-stick');
    const joystick = {active:false, touchId:null, startX:0, startY:0};
    base.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joystick.active = true; joystick.touchId = t.identifier;
      const rect = base.getBoundingClientRect();
      joystick.startX = rect.left + rect.width/2;
      joystick.startY = rect.top + rect.height/2;
    });
    base.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === joystick.touchId) {
          let dx = t.clientX - joystick.startX;
          let dy = t.clientY - joystick.startY;
          const maxR = 40;
          const dist = Math.sqrt(dx*dx+dy*dy);
          if (dist > maxR) { dx *= maxR/dist; dy *= maxR/dist; }
          stick.style.transform = `translate(${dx}px, ${dy}px)`;
          this.touch.active = true;
          this.touch.dx = dx/maxR;
          this.touch.dy = dy/maxR;
        }
      }
    });
    const endJoystick = () => {
      joystick.active = false; joystick.touchId = null;
      stick.style.transform = 'translate(0,0)';
      this.touch.active = false; this.touch.dx = 0; this.touch.dy = 0;
    };
    base.addEventListener('touchend', endJoystick);
    base.addEventListener('touchcancel', endJoystick);
    // Action buttons
    document.querySelectorAll('.touch-btn').forEach(btn => {
      const action = btn.dataset.action;
      btn.addEventListener('touchstart', e => { e.preventDefault(); this.touch.actions[action] = true; });
      btn.addEventListener('touchend', e => { e.preventDefault(); this.touch.actions[action] = false; });
    });
  },
  getMove() {
    let dx = 0, dy = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy = -1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy = 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx = -1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx = 1;
    if (this.touch.active) { dx = this.touch.dx; dy = this.touch.dy; }
    if (this.gamepadAxes) { dx += this.gamepadAxes[0]; dy += this.gamepadAxes[1]; }
    const len = Math.sqrt(dx*dx+dy*dy);
    if (len > 1) { dx/=len; dy/=len; }
    return {dx, dy, moving: len > 0.15};
  },
  justPressed(action) {
    switch(action) {
      case 'sword': return this.pressed['KeyJ'] || this.pressed['_gpsword'] || this.touch.actions.sword;
      case 'shield': return this.pressed['KeyK'] || this.pressed['_gpshield'] || this.touch.actions.shield;
      case 'item': return this.pressed['KeyL'] || this.pressed['_gpitem'] || this.touch.actions.item;
      case 'dodge': return this.pressed['Space'] || this.pressed['_gpdodge'] || this.touch.actions.dodge;
      case 'interact': return this.pressed['KeyE'] || this.pressed['Enter'] || this.pressed['_gpinteract'] || this.touch.actions.interact;
      case 'timeshift': return this.pressed['KeyT'] || this.pressed['ShiftRight'] || this.pressed['_gptimeshift'] || this.touch.actions.timeshift;
      case 'pause': return this.pressed['Escape'] || this.pressed['KeyP'] || this.pressed['_gppause'];
      case 'confirm': return this.pressed['Enter'] || this.pressed['Space'];
      case 'cancel': return this.pressed['Escape'] || this.pressed['KeyX'];
      case 'item_up': return this.pressed['ArrowUp'];
      case 'item_down': return this.pressed['ArrowDown'];
    }
    return false;
  },
  clearPressed() { this.pressed = {}; this.gamepadAxes = null; this.gamepadButtons = null; }
};

// ---- PARTICLE SYSTEM ----
const Particles = {
  list: [],
  emit(x,y,count,color,opts={}) {
    for (let i=0;i<count;i++) {
      this.list.push({
        x, y,
        vx: (opts.vx||0) + (Math.random()-0.5)*(opts.spread||3),
        vy: (opts.vy||0) + (Math.random()-0.5)*(opts.spread||3),
        life: opts.life || 0.5 + Math.random()*0.5,
        maxLife: opts.life || 0.5 + Math.random()*0.5,
        color: color,
        size: opts.size || 2+Math.random()*3,
        gravity: opts.gravity || 0
      });
    }
  },
  update(dt) {
    for (let i = this.list.length-1; i >= 0; i--) {
      const p = this.list[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vy += p.gravity * dt * 60;
      p.life -= dt;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  },
  draw(ctx, camX, camY) {
    this.list.forEach(p => {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - camX - p.size/2, p.y - camY - p.size/2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }
};

// ---- GAME STATE ----
let canvas, ctx;
let gameState = STATE.MENU;
let era = ERA.PAST;
let frameCount = 0, lastTime = 0, deltaTime = 0;

// Player
let player = {};
// World
let overworldMap = null;
let currentDungeon = null;
let currentDungeonIdx = -1;
let currentRoomIdx = 0;
let inDungeon = false;
// Enemies
let enemies = [];
let projectiles = [];
// NPCs
let npcs = [];
// Dialogue
let dialogueQueue = [];
let dialogueCallback = null;
// Boss
let bossActive = false;
let bossData = null;
let bossHp = 0;
let bossMaxHp = 0;
let bossDamageTaken = 0;
let bossTimer = 0;
// Puzzle
let puzzleState = {};
// Camera
let camX = 0, camY = 0;
// UI
let showItemSelect = false;
// Minigame
let minigameData = null;
// Ad timer
let adTimer = 0;
// Stats
let stats = {};
// Save
let hasSave = false;
// Interaction tracking (prevents dialogue loops)
let lastTriggerTile = null;

function initPlayer() {
  return {
    x: 450, y: 480, w: 28, h: 28,
    speed: 2.5,
    dir: DIR.S,
    facing: {dx:0, dy:1},
    hearts: 3, maxHearts: 3,
    magic: MAX_MAGIC, maxMagic: MAX_MAGIC,
    xp: 0, xpNext: 50, level: 1,
    atk: 3, def: 1,
    rupees: 50,
    shards: [],
    items: {sword:1, shield:1, healthpot:3, bomb:10, bow:30, boomerang:1, hookshot:0,
            magicpot:1, map_item:0, compass:0, boss_key:0, small_key:0,
            heart_pieces:0, shard:0},
    equippedA: 'sword',
    equippedB: 'bow',
    dungeonKeys: {},
    dungeonCleared: {},
    dungeonMaps: {},
    overworldSecrets: [],
    timeShifts: 0,
    enemiesKilled: 0,
    potionsUsed: 0,
    dodges: 0,
    saves: 0,
    bossDamageTaken: 0,
    bossNoDamage: false,
    dungeonStartTime: 0,
    dungeonClearedFast: false,
    // Combat state
    attacking: false, attackTimer: 0, attackDir: 0,
    shielding: false, shieldTimer: 0,
    dodging: false, dodgeTimer: 0, dodgeCooldown: 0,
    invincible: false, invTimer: 0,
    animFrame: 0, animTimer: 0,
    // Movement in tile coords
    tileX: 15, tileY: 12
  };
}

function initStats() {
  return {
    playTime: 0,
    totalKills: 0,
    totalShards: 0,
    bossesDefeated: 0,
    dungeonsCompleted: 0,
    secretsFound: 0,
    achievementsUnlocked: [],
    miniGameScores: {fishing:0, shooting:0, treasure:0}
  };
}

function resetGame() {
  player = initPlayer();
  stats = initStats();
  enemies = [];
  projectiles = [];
  npcs = [];
  era = ERA.PAST;
  inDungeon = false;
  currentDungeon = null;
  currentDungeonIdx = -1;
  bossActive = false;
  bossData = null;
  dialogueQueue = [];
  overworldMap = generateOverworld();
  Particles.list = [];
  puzzleState = {};
  spawnOverworldNPCs();
}

// ---- NPC SYSTEM ----
function spawnOverworldNPCs() {
  npcs = [
    {x:5*TILE+TILE/2, y:7*TILE+TILE/2, name:'Elder Mora', icon:'👵',
     pastLines:['Welcome, young Lyra. The Time Crystal has been shattered...','Find the 7 shards across Aethoria to restore it.','Use the Time Portals to shift between eras. Each reveals different paths.'],
     presentLines:['The corruption... it is spreading still...','You must hurry, Lyra. Malachar grows stronger.']},
    {x:18*TILE+TILE/2, y:7*TILE+TILE/2, name:'Sage Aldric', icon:'🧙',
     pastLines:['The dungeons hold great power... and danger.','Each temple has a puzzle. Solve it in the past to unlock the boss room.','May wisdom guide your path.'],
     presentLines:['The sages are gone... consumed by darkness.','Their knowledge lives on in the temples. Seek it out.']},
    {x:12*TILE+TILE/2, y:19*TILE+TILE/2, name:'Merchant Finn', icon:'🧑‍🏭',
     pastLines:['Trade is good in Aethoria! Need supplies?','Visit the shops marked on the map. They have potions and ammo.'],
     presentLines:['Shops still stand, though goods are scarce now...','I have what little remains. Be careful out there.']},
    {x:22*TILE+TILE/2, y:19*TILE+TILE/2, name:'Scout Rina', icon:'🏹',
     pastLines:['I have explored the realm and mapped the dangers.','The dungeons get harder as you progress. Prepare well!','The Time Citadel in the center requires all 6 shards to enter.'],
     presentLines:['The monsters are relentless in this era...','Use your time shifting wisely. Some enemies only exist in one era.']}
  ];
}

// ---- SHOP SYSTEM ----
function openShop() {
  gameState = STATE.SHOP;
  showScreen('shop-screen');
  document.getElementById('shop-title').textContent = 'General Shop';
  document.getElementById('shop-rupees').textContent = player.rupees;
  const container = document.getElementById('shop-items');
  container.innerHTML = '';
  SHOP_ITEMS.forEach(si => {
    const item = ITEMS[si.item];
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `<div class="item-name">${item.icon} ${item.name}</div>
      <div class="item-desc">${item.desc}</div>
      <div class="item-price">${si.price} Rupees</div>`;
    div.onclick = () => buyItem(si);
    container.appendChild(div);
  });
}

function buyItem(shopEntry) {
  if (player.rupees < shopEntry.price) {
    queueDialogue('Shopkeeper', 'Not enough rupees, hero!');
    return;
  }
  player.rupees -= shopEntry.price;
  const item = ITEMS[shopEntry.item];
  if (shopEntry.ammoRefill) {
    player.items[shopEntry.item] = (player.items[shopEntry.item]||0) + 10;
  } else {
    player.items[shopEntry.item] = (player.items[shopEntry.item]||0) + 1;
  }
  AudioSys.play('pickup');
  document.getElementById('shop-rupees').textContent = player.rupees;
  queueDialogue('Shopkeeper', `Here you go! ${item.icon} ${item.name} acquired!`);
}

// ---- DIALOGUE SYSTEM ----
function queueDialogue(speaker, text, callback) {
  if (gameState === STATE.DIALOGUE) {
    dialogueQueue.push({speaker, text, callback});
    return;
  }
  dialogueCallback = callback;
  showScreen('dialogue-box');
  document.getElementById('dialogue-speaker').textContent = speaker;
  document.getElementById('dialogue-text').textContent = text;
  gameState = STATE.DIALOGUE;
}

function advanceDialogue() {
  if (dialogueQueue.length > 0) {
    const next = dialogueQueue.shift();
    document.getElementById('dialogue-speaker').textContent = next.speaker;
    document.getElementById('dialogue-text').textContent = next.text;
    dialogueCallback = next.callback;
  } else {
    hideScreen('dialogue-box');
    gameState = STATE.PLAYING;
    if (dialogueCallback) { dialogueCallback(); dialogueCallback = null; }
  }
}

// ---- SCREEN MANAGEMENT ----
function showScreen(id) { document.getElementById(id).classList.remove('hidden'); }
function hideScreen(id) { document.getElementById(id).classList.add('hidden'); }

function showPlayingUI() {
  ['menu-screen','pause-screen','gameover-screen','victory-screen','shop-screen',
   'ad-screen','rewarded-ad-screen','achievements-screen','minigame-screen',
   'boss-intro-screen'].forEach(hideScreen);
  showScreen('hud');
}

// ---- COMBAT SYSTEM ----
function playerAttack() {
  if (player.attacking || player.dodging) return;
  player.attacking = true;
  player.attackTimer = 0.3;
  player.attackDir = player.dir;
  AudioSys.play('sword');
  // Sword hitbox
  const range = 30;
  const angle = player.attackDir * (Math.PI/4);
  const hitX = player.x + Math.sin(angle) * range;
  const hitY = player.y - Math.cos(angle) * range;
  Particles.emit(hitX, hitY, 5, '#fff', {spread:2, life:0.2});
  // Check hits
  const atkPow = player.atk + (ITEMS[player.equippedA] ? ITEMS[player.equippedA].atk || 0 : 0);
  enemies.forEach(e => {
    if (e.dead) return;
    const dx = e.x - hitX, dy = e.y - hitY;
    if (Math.sqrt(dx*dx+dy*dy) < (e.size || 16) + 10) {
      damageEnemy(e, atkPow);
    }
  });
  if (bossActive && bossData) {
    const dx = bossData.x - hitX, dy = bossData.y - hitY;
    if (Math.sqrt(dx*dx+dy*dy) < (bossData.size||30) + 10) {
      damageBoss(atkPow);
    }
  }
}

function playerShoot() {
  const weapon = player.equippedB;
  if (weapon === 'bow') {
    if (!player.items.bow || player.items.bow <= 0) return;
    player.items.bow--;
    AudioSys.play('bow');
    const angle = player.dir * (Math.PI/4);
    projectiles.push({
      x: player.x, y: player.y,
      vx: Math.sin(angle)*5, vy: -Math.cos(angle)*5,
      type:'arrow', dmg: player.atk + 2, life: 2,
      color:'#aaa', size:4, owner:'player'
    });
  } else if (weapon === 'boomerang') {
    if (!player.items.boomerang || player.items.boomerang <= 0) return;
    AudioSys.play('bow');
    const angle = player.dir * (Math.PI/4);
    projectiles.push({
      x: player.x, y: player.y,
      vx: Math.sin(angle)*4, vy: -Math.cos(angle)*4,
      type:'boomerang', dmg: 1, life: 0.8, maxLife: 0.8,
      startX: player.x, startY: player.y,
      color:'#8f8', size:8, owner:'player', stun: true
    });
  } else if (weapon === 'bomb') {
    if (!player.items.bomb || player.items.bomb <= 0) return;
    player.items.bomb--;
    AudioSys.play('bomb');
    const angle = player.dir * (Math.PI/4);
    projectiles.push({
      x: player.x + Math.sin(angle)*30,
      y: player.y - Math.cos(angle)*30,
      vx: Math.sin(angle)*2, vy: -Math.cos(angle)*2,
      type:'bomb', dmg: 5, life: 1.5,
      color:'#f80', size:10, owner:'player', explodes:true
    });
  } else if (weapon === 'hookshot') {
    if (!player.items.hookshot || player.items.hookshot <= 0) return;
    AudioSys.play('bow');
    const angle = player.dir * (Math.PI/4);
    projectiles.push({
      x: player.x, y: player.y,
      vx: Math.sin(angle)*7, vy: -Math.cos(angle)*7,
      type:'hookshot', dmg: 2, life: 0.5,
      color:'#aaa', size:6, owner:'player'
    });
  } else if (weapon === 'healthpot') {
    if (!player.items.healthpot || player.items.healthpot <= 0) return;
    player.items.healthpot--;
    player.hearts = Math.min(player.maxHearts, player.hearts + 3);
    AudioSys.play('heart');
    stats.potionsUsed++;
    checkAchievement('potion_10', stats.potionsUsed >= 10);
    Particles.emit(player.x, player.y, 15, '#ff4488', {spread:3, life:0.5});
  } else if (weapon === 'magicpot') {
    if (!player.items.magicpot || player.items.magicpot <= 0) return;
    player.items.magicpot--;
    player.magic = Math.min(player.maxMagic, player.magic + 50);
    AudioSys.play('magic');
    stats.potionsUsed++;
    checkAchievement('potion_10', stats.potionsUsed >= 10);
    Particles.emit(player.x, player.y, 15, '#4488ff', {spread:3, life:0.5});
  }
}

function damageEnemy(e, dmg) {
  e.hp -= dmg;
  e.hitTimer = 0.2;
  Particles.emit(e.x, e.y, 8, e.color || '#f44', {spread:3, life:0.3});
  AudioSys.play('hit');
  if (e.hp <= 0) {
    e.dead = true;
    player.xp += e.xp || 5;
    player.rupees += Math.floor(Math.random()*5)+1;
    stats.totalKills++;
    player.enemiesKilled++;
    checkLevelUp();
    checkAchievement('kill_100', stats.totalKills >= 100);
    checkAchievement('kill_500', stats.totalKills >= 500);
    if (e.drops) {
      e.drops.forEach(d => {
        if (Math.random() < d.chance) spawnDrop(e.x, e.y, d.type, d.count||1);
      });
    }
  }
}

function damageBoss(dmg) {
  bossHp -= dmg;
  bossDamageTaken += dmg;
  Particles.emit(bossData.x, bossData.y, 12, bossData.color, {spread:4, life:0.4});
  AudioSys.play('hit');
  document.getElementById('boss-hp-bar').style.width = Math.max(0, (bossHp/bossMaxHp)*100) + '%';
  if (bossHp <= 0) {
    if (bossData.phase2 && !bossData.inPhase2) {
      // Phase 2
      bossData.inPhase2 = true;
      bossHp = Math.floor(bossMaxHp * 0.6);
      bossData.hp = bossHp;
      bossData.atk += 3;
      bossData.spd += 0.5;
      bossMaxHp = bossHp;
      document.getElementById('boss-hp-bar').style.width = '100%';
      Particles.emit(bossData.x, bossData.y, 30, '#f0f', {spread:5, life:0.6});
      AudioSys.play('boss');
      queueDialogue('System', `${bossData.name} enters a rage! Phase 2!`);
    } else {
      defeatBoss();
    }
  }
}

function defeatBoss() {
  bossActive = false;
  bossData = null;
  AudioSys.play('victory');
  stats.bossesDefeated++;
  if (!player.bossDamageTaken) {
    player.bossNoDamage = true;
    checkAchievement('no_damage', true);
  }
  checkAchievement('first_boss', true);
  checkAchievement('all_bosses', stats.bossesDefeated >= 7);
  Particles.emit(player.x, player.y, 40, '#ffd700', {spread:5, life:0.8, size:4});
  // Drop shard
  if (currentDungeonIdx < 7) {
    const d = DUNGEONS[currentDungeonIdx];
    if (!player.shards.includes(d.id)) {
      player.shards.push(d.id);
      stats.totalShards++;
      checkAchievement('first_shard', true);
      checkAchievement('all_shards', player.shards.length >= 7);
      queueDialogue('System', `Obtained the ${d.name} Crystal Shard! (${player.shards.length}/7)`);
      // Give heart container from boss
      if (player.maxHearts < MAX_HEARTS) {
        player.maxHearts++;
        player.hearts = player.maxHearts;
        checkAchievement('max_hearts', player.maxHearts >= MAX_HEARTS);
      }
      // Save dungeon progress
      player.dungeonCleared[d.id] = true;
      stats.dungeonsCompleted++;
    }
  }
  // Check for final victory
  if (currentDungeonIdx === 6 && player.shards.length >= 7) {
    setTimeout(() => {
      gameState = STATE.VICTORY;
      checkAchievement('victory', true);
      showVictoryScreen();
    }, 2000);
  } else {
    // Return to overworld
    setTimeout(() => {
      exitDungeon();
    }, 2000);
  }
}

function spawnDrop(x, y, type, count) {
  for (let i = 0; i < count; i++) {
    projectiles.push({
      x: x + (Math.random()-0.5)*20,
      y: y + (Math.random()-0.5)*20,
      vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2,
      type: 'drop', dropType: type, life: 5,
      color: type==='heart'?'#f44':type==='magic'?'#48f':'#fd0',
      size: 8, owner: 'world'
    });
  }
}

function hurtPlayer(dmg) {
  if (player.invincible || player.dodging) return;
  if (player.shielding) {
    dmg = Math.max(0, dmg - player.def - 2);
    if (dmg <= 0) { AudioSys.play('shield'); return; }
    AudioSys.play('shield');
  }
  player.hearts -= Math.max(1, dmg - player.def);
  player.invincible = true;
  player.invTimer = 1;
  AudioSys.play('hurt');
  Particles.emit(player.x, player.y, 10, '#f44', {spread:3, life:0.3});
  if (bossActive) player.bossDamageTaken += dmg;
  if (player.hearts <= 0) {
    player.hearts = 0;
    gameOver();
  }
}

function gameOver() {
  gameState = STATE.GAMEOVER;
  AudioSys.play('die');
  showScreen('gameover-screen');
  hideScreen('hud');
}

function dodgeRoll() {
  if (player.dodging || player.dodgeCooldown > 0) return;
  player.dodging = true;
  player.dodgeTimer = 0.3;
  player.dodgeCooldown = 0.8;
  player.invincible = true;
  player.invTimer = 0.3;
  AudioSys.play('dodge');
  stats.dodges++;
  checkAchievement('dodge_master', stats.dodges >= 50);
}

// ---- LEVEL SYSTEM ----
function checkLevelUp() {
  while (player.xp >= player.xpNext && player.level < MAX_LEVEL) {
    player.xp -= player.xpNext;
    player.level++;
    player.xpNext = Math.floor(player.xpNext * 1.4);
    player.maxHearts = Math.min(MAX_HEARTS, player.maxHearts + 0.5);
    player.hearts = player.maxHearts;
    player.atk += 1;
    player.def += 0.5;
    player.maxMagic = Math.min(200, player.maxMagic + 10);
    player.magic = player.maxMagic;
    AudioSys.play('victory');
    Particles.emit(player.x, player.y, 20, '#ffd700', {spread:4, life:0.6, size:3});
    queueDialogue('System', `Level Up! You are now level ${player.level}!`);
    if (player.level >= MAX_LEVEL) checkAchievement('max_level', true);
  }
}

// ---- TIME SHIFT ----
function timeShift() {
  if (inDungeon) return; // Only shift in overworld portals
  // Check if near portal
  const tile = getOverworldTile(player.tileX, player.tileY);
  if (tile !== TILE_PORTAL && !isAdjacentToTile(player.tileX, player.tileY, TILE_PORTAL)) {
    return;
  }
  era = (era === ERA.PAST) ? ERA.PRESENT : ERA.PAST;
  player.timeShifts++;
  AudioSys.play('timeshift');
  // Flash effect
  const flash = document.createElement('div');
  flash.className = 'time-flash';
  flash.style.background = era === ERA.PAST ? '#4ff8' : '#f64f';
  document.getElementById('game-container').appendChild(flash);
  setTimeout(() => flash.remove(), 700);
  checkAchievement('time_master', player.timeShifts >= 100);
  // Respawn enemies based on era
  spawnOverworldEnemies();
}

function isAdjacentToTile(tx, ty, tileType) {
  return getOverworldTile(tx-1,ty)===tileType || getOverworldTile(tx+1,ty)===tileType ||
         getOverworldTile(tx,ty-1)===tileType || getOverworldTile(tx,ty+1)===tileType;
}

// ---- MAP HELPERS ----
function getOverworldTile(tx, ty) {
  if (!overworldMap || ty < 0 || ty >= OVERWORLD_HEIGHT || tx < 0 || tx >= OVERWORLD_WIDTH) return TILE_WALL;
  return overworldMap[ty][tx];
}

function isWalkable(tx, ty) {
  const tile = inDungeon ? getDungeonTile(tx, ty) : getOverworldTile(tx, ty);
  return tile !== TILE_WALL && tile !== TILE_WATER && tile !== TILE_TREE;
}

function getDungeonTile(tx, ty) {
  if (!currentDungeon) return TILE_WALL;
  const map = currentDungeon.map;
  if (ty < 0 || ty >= currentDungeon.h || tx < 0 || tx >= currentDungeon.w) return TILE_WALL;
  return map[ty][tx];
}

// ---- DUNGEON ENTRY ----
function enterDungeon(idx) {
  if (idx === 6) {
    // Time Citadel requires all 6 shards
    if (player.shards.length < 6) {
      queueDialogue('System', 'The Time Citadel requires all 6 Crystal Shards to enter. You have ' + player.shards.length + '.');
      return;
    }
  }
  currentDungeonIdx = idx;
  currentDungeon = generateDungeon(idx);
  inDungeon = true;
  currentRoomIdx = 0;
  player.x = 2 * TILE;
  player.y = 2 * TILE;
  enemies = [];
  bossActive = false;
  bossData = null;
  spawnDungeonEnemies(idx);
  if (idx === 6) {
    // Final dungeon - show boss intro
    showBossIntro('Malachar', 'The Time Devourer');
  } else {
    const d = DUNGEONS[idx];
    queueDialogue('System', `Entered ${d.name}. Era: ${era.toUpperCase()}. ${era===ERA.PAST?d.pastDesc:d.presentDesc}`);
  }
  player.dungeonStartTime = Date.now();
  player.bossDamageTaken = 0;
}

function exitDungeon() {
  inDungeon = false;
  currentDungeon = null;
  currentDungeonIdx = -1;
  enemies = [];
  bossActive = false;
  bossData = null;
  player.x = 15 * TILE;
  player.y = 12 * TILE;
  spawnOverworldEnemies();
  // Check speed clear
  const elapsed = (Date.now() - player.dungeonStartTime) / 1000;
  if (elapsed < 180) {
    player.dungeonClearedFast = true;
    checkAchievement('speed_clear', true);
  }
}

// ---- ENEMY SPAWNING ----
function spawnOverworldEnemies() {
  enemies = [];
  const count = era === ERA.PRESENT ? 12 : 3;
  for (let i = 0; i < count; i++) {
    let tx, ty, attempts = 0;
    do {
      tx = 2 + Math.floor(Math.random()*(OVERWORLD_WIDTH-4));
      ty = 2 + Math.floor(Math.random()*(OVERWORLD_HEIGHT-4));
      attempts++;
    } while (attempts < 50 && (overworldMap[ty][tx] !== TILE_GROUND && overworldMap[ty][tx] !== TILE_PATH &&
             overworldMap[ty][tx] !== TILE_SAND && overworldMap[ty][tx] !== TILE_FLOWER));
    if (attempts < 50) {
      const typeIdx = Math.floor(Math.random() * Math.min(4 + (era===ERA.PRESENT?4:0), ENEMY_TYPES.length));
      const et = ENEMY_TYPES[typeIdx];
      enemies.push(createEnemy(et, tx*TILE+TILE/2, ty*TILE+TILE/2));
    }
  }
}

function spawnDungeonEnemies(dungeonIdx) {
  enemies = [];
  const d = DUNGEONS[dungeonIdx];
  // Regular enemies
  const count = 4 + dungeonIdx * 2;
  for (let i = 0; i < count; i++) {
    let tx, ty, attempts = 0;
    do {
      tx = 1 + Math.floor(Math.random()*(currentDungeon.w-2));
      ty = 1 + Math.floor(Math.random()*(currentDungeon.h-2));
      attempts++;
    } while (attempts < 30 && getDungeonTile(tx,ty) === TILE_WALL);
    if (attempts < 30) {
      const typeIdx = Math.floor(Math.random() * Math.min(3 + dungeonIdx, ENEMY_TYPES.length));
      const et = ENEMY_TYPES[typeIdx];
      enemies.push(createEnemy(et, tx*TILE+TILE/2, ty*TILE+TILE/2));
    }
  }
  // Mini-boss at dungeon 5+
  if (d.miniboss && dungeonIdx >= 1) {
    const mb = BOSSES[d.miniboss] || {hp:20,atk:3,spd:0.8,color:'#f80',size:22,xp:50,phase2:false};
    enemies.push(createEnemy({...mb, name:d.miniboss, isMiniboss:true}, 7*TILE, 5*TILE));
  }
  // Puzzle markers
  puzzleState = {solved: false, progress: 0, total: 3};
  if (era === ERA.PAST) puzzleState.solved = true; // Puzzles auto-solved in past
}

function createEnemy(template, x, y) {
  return {
    x, y,
    vx: 0, vy: 0,
    hp: template.hp,
    maxHp: template.hp,
    atk: template.atk,
    spd: template.spd,
    color: template.color,
    size: template.size,
    xp: template.xp || 10,
    name: template.name || 'Enemy',
    dead: false,
    hitTimer: 0,
    aiTimer: Math.random() * 2,
    aiState: 'wander',
    drops: [
      {type:'rupee', chance:0.3},
      {type:'heart', chance:0.1},
      {type:'magic', chance:0.05}
    ],
    isMiniboss: template.isMiniboss || false,
    phase2: template.phase2 || false,
    inPhase2: false
  };
}

// ---- BOSS INTRO ----
function showBossIntro(name, title) {
  gameState = STATE.BOSS_INTRO;
  showScreen('boss-intro-screen');
  document.getElementById('boss-name').textContent = name;
  document.getElementById('boss-title').textContent = title;
  AudioSys.play('boss');
  bossTimer = 3;
}

function startBossFight() {
  hideScreen('boss-intro-screen');
  gameState = STATE.PLAYING;
  bossActive = true;
  const b = BOSSES[DUNGEONS[currentDungeonIdx].boss] || BOSSES['Malachar'];
  bossData = {
    x: currentDungeon.w * TILE / 2,
    y: 5 * TILE,
    hp: b.hp,
    maxHp: b.hp,
    atk: b.atk,
    spd: b.spd,
    color: b.color,
    size: b.size,
    xp: b.xp,
    name: DUNGEONS[currentDungeonIdx].boss,
    phase2: b.phase2,
    inPhase2: false,
    aiTimer: 0,
    aiState: 'idle',
    attackTimer: 0
  };
  bossHp = bossData.hp;
  bossMaxHp = bossData.maxHp;
  player.bossDamageTaken = 0;
  player.bossNoDamage = true;
}

// ---- VICTORY SCREEN ----
function showVictoryScreen() {
  showScreen('victory-screen');
  hideScreen('hud');
  const elapsed = Math.floor(stats.playTime / 60);
  document.getElementById('victory-stats').innerHTML =
    `<p>Time: ${elapsed} minutes</p>
     <p>Enemies Defeated: ${stats.totalKills}</p>
     <p>Level: ${player.level}</p>
     <p>Achievements: ${stats.achievementsUnlocked.length}/${ACHIEVEMENTS.length}</p>`;
}

// ---- ACHIEVEMENT SYSTEM ----
function checkAchievement(id, condition) {
  if (!condition || stats.achievementsUnlocked.includes(id)) return;
  stats.achievementsUnlocked.push(id);
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (ach) {
    AudioSys.play('victory');
    Particles.emit(player.x, player.y, 25, '#ffd700', {spread:5, life:0.8, size:3});
  }
}

function showAchievements() {
  gameState = STATE.ACHIEVEMENTS;
  showScreen('achievements-screen');
  hideScreen('hud');
  const list = document.getElementById('achievements-list');
  list.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const unlocked = stats.achievementsUnlocked.includes(a.id);
    const div = document.createElement('div');
    div.className = 'achievement' + (unlocked ? ' unlocked' : '');
    div.innerHTML = `<span class="ach-icon">${unlocked ? a.icon : '🔒'}</span>
      <div class="ach-name">${a.name}</div>
      <div class="ach-desc">${a.desc}</div>`;
    list.appendChild(div);
  });
}

// ---- MINI-GAMES ----
function startMinigame(type) {
  gameState = STATE.MINIGAME;
  showScreen('minigame-screen');
  hideScreen('hud');
  const area = document.getElementById('minigame-area');
  document.getElementById('minigame-title').textContent =
    type === 'fishing' ? 'Fishing' : type === 'shooting' ? 'Target Shooting' : 'Treasure Hunt';
  minigameData = {type, score: 0, timer: 30, active: true};
  area.innerHTML = '<canvas id="minigame-canvas" width="600" height="400"></canvas>';
  const mc = document.getElementById('minigame-canvas');
  const mctx = mc.getContext('2d');
  if (type === 'fishing') {
    minigameData.fishY = 200;
    minigameData.hookY = 50;
    minigameData.caught = false;
    minigameData.reeling = false;
    minigameData.fishTimer = 0;
    minigameData._update = (dt) => {
      minigameData.fishTimer += dt;
      minigameData.fishY = 250 + Math.sin(minigameData.fishTimer * 2) * 80;
      if (minigameData.reeling) {
        minigameData.hookY -= 2;
        if (minigameData.hookY < 50) {
          minigameData.caught = false;
          minigameData.reeling = false;
        }
        if (Math.abs(minigameData.hookY - minigameData.fishY) < 20) {
          minigameData.score++;
          minigameData.caught = true;
          minigameData.reeling = false;
          checkAchievement('mini_fish', true);
          AudioSys.play('pickup');
        }
      } else {
        minigameData.hookY += 1.5;
        if (minigameData.hookY > 380) minigameData.hookY = 50;
      }
    };
    minigameData._draw = () => {
      mctx.fillStyle = '#1a3a6a';
      mctx.fillRect(0, 0, 600, 400);
      // Water
      mctx.fillStyle = '#2255aa';
      mctx.fillRect(0, 100, 600, 300);
      // Fish
      mctx.fillStyle = '#ff8844';
      mctx.beginPath();
      mctx.ellipse(300, minigameData.fishY, 15, 8, 0, 0, Math.PI*2);
      mctx.fill();
      mctx.fillStyle = '#ffaa66';
      mctx.beginPath();
      mctx.moveTo(285, minigameData.fishY);
      mctx.lineTo(270, minigameData.fishY-10);
      mctx.lineTo(270, minigameData.fishY+10);
      mctx.fill();
      // Hook
      mctx.strokeStyle = '#aaa';
      mctx.lineWidth = 2;
      mctx.beginPath();
      mctx.moveTo(300, 0);
      mctx.lineTo(300, minigameData.hookY);
      mctx.stroke();
      mctx.fillStyle = '#888';
      mctx.beginPath();
      mctx.arc(300, minigameData.hookY, 5, 0, Math.PI*2);
      mctx.fill();
      // UI
      mctx.fillStyle = '#fff';
      mctx.font = '16px sans-serif';
      mctx.fillText(`Fish: ${minigameData.score} | Time: ${Math.ceil(minigameData.timer)}s | Press Space/E to reel!`, 20, 30);
    };
    minigameData._interact = () => { minigameData.reeling = true; };
  } else if (type === 'shooting') {
    minigameData.targets = [];
    for (let i = 0; i < 5; i++) spawnTarget(minigameData);
    minigameData._update = (dt) => {
      minigameData.targets.forEach((t,i) => {
        t.y += t.spd * dt * 60;
        if (t.y > 420) spawnTarget(minigameData, i);
      });
    };
    minigameData._draw = () => {
      mctx.fillStyle = '#1a2a1a';
      mctx.fillRect(0, 0, 600, 400);
      minigameData.targets.forEach(t => {
        mctx.fillStyle = t.color;
        mctx.beginPath();
        mctx.arc(t.x, t.y, t.r, 0, Math.PI*2);
        mctx.fill();
        mctx.fillStyle = '#fff';
        mctx.beginPath();
        mctx.arc(t.x, t.y, t.r*0.4, 0, Math.PI*2);
        mctx.fill();
      });
      mctx.fillStyle = '#fff';
      mctx.font = '16px sans-serif';
      mctx.fillText(`Hits: ${minigameData.score} | Time: ${Math.ceil(minigameData.timer)}s | Press Space/E to shoot!`, 20, 30);
    };
    minigameData._interact = () => {
      // Check closest target to center bottom
      let best = -1, bestDist = 999;
      minigameData.targets.forEach((t,i) => {
        const d = Math.abs(t.x - 300) + Math.abs(t.y - 350);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      if (best >= 0 && bestDist < 60) {
        minigameData.score++;
        spawnTarget(minigameData, best);
        AudioSys.play('bow');
        if (minigameData.score >= 10) checkAchievement('mini_shoot', true);
      }
    };
  } else {
    minigameData.spots = [];
    for (let i = 0; i < 8; i++) {
      minigameData.spots.push({
        x: 50 + Math.random()*500, y: 50 + Math.random()*300,
        found: false, r: 12
      });
    }
    minigameData.digX = 300;
    minigameData.digY = 200;
    minigameData._update = () => {};
    minigameData._draw = () => {
      mctx.fillStyle = '#8a6a3a';
      mctx.fillRect(0, 0, 600, 400);
      minigameData.spots.forEach(s => {
        if (s.found) {
          mctx.fillStyle = '#ffd700';
          mctx.beginPath();
          mctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
          mctx.fill();
        }
      });
      mctx.fillStyle = '#a88';
      mctx.beginPath();
      mctx.arc(minigameData.digX, minigameData.digY, 8, 0, Math.PI*2);
      mctx.fill();
      mctx.fillStyle = '#fff';
      mctx.font = '16px sans-serif';
      mctx.fillText(`Found: ${minigameData.score}/8 | Time: ${Math.ceil(minigameData.timer)}s | WASD+Space to dig`, 20, 30);
    };
    minigameData._interact = () => {
      minigameData.spots.forEach(s => {
        if (!s.found) {
          const dx = minigameData.digX - s.x, dy = minigameData.digY - s.y;
          if (Math.sqrt(dx*dx+dy*dy) < 25) {
            s.found = true;
            minigameData.score++;
            AudioSys.play('pickup');
          }
        }
      });
      if (minigameData.score >= 8) checkAchievement('mini_treasure', true);
    };
    minigameData._move = (mx, my) => { minigameData.digX += mx*3; minigameData.digY += my*3; };
  }
}

function spawnTarget(mg, idx) {
  if (idx === undefined) {
    mg.targets.push({
      x: 50 + Math.random()*500, y: -20 - Math.random()*100,
      r: 15 + Math.random()*10, spd: 1 + Math.random()*2,
      color: ['#f44','#ff0','#4f4','#48f'][Math.floor(Math.random()*4)]
    });
  } else {
    mg.targets[idx] = {
      x: 50 + Math.random()*500, y: -20 - Math.random()*100,
      r: 15 + Math.random()*10, spd: 1 + Math.random()*2,
      color: ['#f44','#ff0','#4f4','#48f'][Math.floor(Math.random()*4)]
    };
  }
}

function updateMinigame(dt) {
  if (!minigameData || !minigameData.active) return;
  minigameData.timer -= dt;
  if (minigameData.timer <= 0) {
    minigameData.active = false;
    queueDialogue('System', `Mini-game over! Score: ${minigameData.score}`);
    setTimeout(() => {
      hideScreen('minigame-screen');
      showPlayingUI();
      gameState = STATE.PLAYING;
    }, 500);
    return;
  }
  if (minigameData._update) minigameData._update(dt);
  if (minigameData._move && Input.keys['KeyW']) minigameData._move(0,-1);
  if (minigameData._move && Input.keys['KeyS']) minigameData._move(0,1);
  if (minigameData._move && Input.keys['KeyA']) minigameData._move(-1,0);
  if (minigameData._move && Input.keys['KeyD']) minigameData._move(1,0);
  if (Input.justPressed('interact') && minigameData._interact) minigameData._interact();
  if (minigameData._draw) {
    const mc = document.getElementById('minigame-canvas');
    if (mc) minigameData._draw();
  }
}

// ---- SAVE / LOAD ----
function saveGame() {
  const saveData = {
    player: {...player},
    stats: {...stats},
    era: era,
    version: 1
  };
  try {
    localStorage.setItem('realm_of_time_save', JSON.stringify(saveData));
    player.saves++;
    checkAchievement('save_5', player.saves >= 5);
    queueDialogue('System', 'Game saved!');
  } catch(e) {
    queueDialogue('System', 'Save failed!');
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem('realm_of_time_save');
    if (!raw) return false;
    const saveData = JSON.parse(raw);
    player = {...initPlayer(), ...saveData.player};
    stats = {...initStats(), ...saveData.stats};
    era = saveData.era || ERA.PAST;
    overworldMap = generateOverworld();
    spawnOverworldNPCs();
    spawnOverworldEnemies();
    return true;
  } catch(e) {
    return false;
  }
}

function hasSaveData() {
  return !!localStorage.getItem('realm_of_time_save');
}

// ---- NGN4 REWARD FORMAT ----
function getNGN4Rewards() {
  return {
    ngn4_rewards: {
      coins: player.rupees,
      achievements: stats.achievementsUnlocked,
      shards: player.shards.length,
      level: player.level
    }
  };
}

// ---- AD SYSTEM ----
function showRewardedAd() {
  gameState = STATE.REWARDED_AD;
  showScreen('rewarded-ad-screen');
  hideScreen('hud');
  adTimer = 5;
  document.getElementById('btn-claim-reward').classList.add('hidden');
}

function updateRewardedAd(dt) {
  adTimer -= dt;
  if (adTimer <= 0) {
    document.getElementById('btn-claim-reward').classList.remove('hidden');
  }
}

function claimAdReward() {
  // Refill health and magic
  player.hearts = player.maxHearts;
  player.magic = player.maxMagic;
  AudioSys.play('victory');
  hideScreen('rewarded-ad-screen');
  showPlayingUI();
  gameState = STATE.PLAYING;
  queueDialogue('System', 'Health and Magic fully restored!');
}

// ---- UPDATE LOOP ----
function update(dt) {
  Input.update();
  frameCount++;

  switch (gameState) {
    case STATE.MENU:
      updateMenu();
      break;
    case STATE.PLAYING:
      updatePlaying(dt);
      break;
    case STATE.DIALOGUE:
      if (Input.justPressed('interact') || Input.justPressed('confirm')) advanceDialogue();
      break;
    case STATE.PAUSED:
      updatePause();
      break;
    case STATE.SHOP:
      if (Input.justPressed('cancel') || Input.justPressed('pause')) {
        hideScreen('shop-screen');
        showPlayingUI();
        gameState = STATE.PLAYING;
      }
      break;
    case STATE.GAMEOVER:
      updateGameOver();
      break;
    case STATE.BOSS_INTRO:
      bossTimer -= dt;
      if (bossTimer <= 0) startBossFight();
      break;
    case STATE.REWARDED_AD:
      updateRewardedAd(dt);
      break;
    case STATE.MINIGAME:
      updateMinigame(dt);
      break;
    case STATE.ACHIEVEMENTS:
      if (Input.justPressed('cancel') || Input.justPressed('pause')) {
        hideScreen('achievements-screen');
        showScreen('menu-screen');
        gameState = STATE.MENU;
      }
      break;
  }
  Input.clearPressed();
}

function updateMenu() {
  if (Input.justPressed('confirm')) {
    // Default: new game
  }
}

function updatePlaying(dt) {
  if (Input.justPressed('pause')) {
    gameState = STATE.PAUSED;
    showScreen('pause-screen');
    buildPauseUI();
    return;
  }
  if (Input.justPressed('timeshift')) timeShift();
  // Movement
  const move = Input.getMove();
  if (move.moving && !player.attacking) {
    if (player.dodging) {
      player.x += move.dx * 6;
      player.y += move.dy * 6;
    } else {
      player.x += move.dx * player.speed;
      player.y += move.dy * player.speed;
    }
    // Update facing direction
    let bestDir = player.dir;
    let bestDot = -1;
    for (let d = 0; d < 8; d++) {
      const dot = DX[d]*move.dx + DY[d]*move.dy;
      if (dot > bestDot) { bestDot = dot; bestDir = d; }
    }
    player.dir = bestDir;
    player.facing = {dx: DX[bestDir], dy: DY[bestDir]};
  }
  // Tile collision
  player.tileX = Math.floor(player.x / TILE);
  player.tileY = Math.floor(player.y / TILE);
  // World bounds
  const mapW = inDungeon ? currentDungeon.w : OVERWORLD_WIDTH;
  const mapH = inDungeon ? currentDungeon.h : OVERWORLD_HEIGHT;
  player.x = Math.max(TILE, Math.min((mapW-1)*TILE, player.x));
  player.y = Math.max(TILE, Math.min((mapH-1)*TILE, player.y));
  // Attack
  if (Input.justPressed('sword')) playerAttack();
  if (Input.justPressed('item')) playerShoot();
  if (Input.justPressed('shield')) {
    player.shielding = true;
    player.shieldTimer = 0.5;
  }
  if (Input.justPressed('dodge')) dodgeRoll();
  if (Input.justPressed('interact')) interact();
  // Timers
  if (player.attackTimer > 0) { player.attackTimer -= dt; if (player.attackTimer <= 0) player.attacking = false; }
  if (player.shieldTimer > 0) { player.shieldTimer -= dt; if (player.shieldTimer <= 0) player.shielding = false; }
  if (player.dodgeTimer > 0) { player.dodgeTimer -= dt; if (player.dodgeTimer <= 0) { player.dodging = false; player.invincible = false; } }
  if (player.dodgeCooldown > 0) player.dodgeCooldown -= dt;
  if (player.invTimer > 0) { player.invTimer -= dt; if (player.invTimer <= 0) player.invincible = false; }
  // Animation
  player.animTimer += dt;
  if (player.animTimer > 0.2) { player.animTimer = 0; player.animFrame = (player.animFrame+1) % 4; }
  // Magic regen
  if (player.magic < player.maxMagic) player.magic = Math.min(player.maxMagic, player.magic + 0.05);
  // Update enemies
  updateEnemies(dt);
  // Update projectiles
  updateProjectiles(dt);
  // Update boss
  if (bossActive && bossData) updateBoss(dt);
  // Puzzle check
  if (inDungeon && !puzzleState.solved) checkPuzzle();
  // Overworld interactions
  if (!inDungeon) checkOverworldInteraction();
  // Particles
  Particles.update(dt);
  // Camera
  camX = player.x - W/2;
  camY = player.y - H/2;
  const cw = mapW * TILE, ch = mapH * TILE;
  camX = Math.max(0, Math.min(cw - W, camX));
  camY = Math.max(0, Math.min(ch - H, camY));
  // Rich check
  if (player.rupees >= 500) checkAchievement('rich', true);
  // Stats
  stats.playTime += dt;
  // Update HUD
  updateHUD();
}

function interact() {
  if (inDungeon) {
    // Dungeon interaction: check for puzzle elements
    if (!puzzleState.solved) {
      const nearSecret = isAdjacentToTileDungeon(player.tileX, player.tileY, TILE_SECRET);
      if (nearSecret) {
        puzzleState.progress++;
        AudioSys.play('open');
        Particles.emit(player.x, player.y, 10, '#ff0', {spread:3, life:0.4});
        if (puzzleState.progress >= puzzleState.total) {
          puzzleState.solved = true;
          AudioSys.play('puzzle');
          Particles.emit(player.x, player.y, 25, '#0ff', {spread:5, life:0.6});
          queueDialogue('System', 'Puzzle solved! The way forward is open!');
        } else {
          queueDialogue('System', `Puzzle progress: ${puzzleState.progress}/${puzzleState.total}`);
        }
        return;
      }
    }
    // Check boss door
    if (puzzleState.solved) {
      const nearBoss = isAdjacentToTileDungeon(player.tileX, player.tileY, TILE_DUNGEON);
      if (nearBoss && !bossActive) {
        showBossIntro(DUNGEONS[currentDungeonIdx].boss, 'Dungeon Boss');
        return;
      }
    }
  } else {
    // Overworld NPC interaction
    for (const npc of npcs) {
      const dx = player.x - npc.x, dy = player.y - npc.y;
      if (Math.sqrt(dx*dx+dy*dy) < 50) {
        const lines = era === ERA.PAST ? npc.pastLines : npc.presentLines;
        const line = lines[Math.floor(Math.random()*lines.length)];
        queueDialogue(npc.name, line);
        return;
      }
    }
    // Minigame NPC near specific tiles
    const tile = getOverworldTile(player.tileX, player.tileY);
    if (tile === TILE_SECRET) {
      if (!player.overworldSecrets.includes(player.tileX+','+player.tileY)) {
        player.overworldSecrets.push(player.tileX+','+player.tileY);
        player.rupees += 20;
        player.items.heart_piece = (player.items.heart_piece||0) + 1;
        AudioSys.play('heart');
        stats.secretsFound++;
        checkAchievement('all_secrets', stats.secretsFound >= 5);
        queueDialogue('System', 'Found a secret! +20 Rupees and a Heart Piece!');
        // Check heart container
        if (player.items.heart_piece >= 4) {
          player.items.heart_piece -= 4;
          player.maxHearts++;
          player.hearts = player.maxHearts;
          AudioSys.play('victory');
          queueDialogue('System', '4 Heart Pieces combined! Max Hearts increased!');
        }
      }
    }
  }
}

function isAdjacentToTileDungeon(tx, ty, tileType) {
  if (!currentDungeon) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx===0 && dy===0) continue;
      const nx = tx+dx, ny = ty+dy;
      if (ny >= 0 && ny < currentDungeon.h && nx >= 0 && nx < currentDungeon.w) {
        if (currentDungeon.map[ny][nx] === tileType) return true;
      }
    }
  }
  return false;
}

function checkPuzzle() {
  // Puzzles are solved by interacting with SECRET tiles in the dungeon
  // Already handled in interact()
}

function checkOverworldInteraction() {
  const tile = getOverworldTile(player.tileX, player.tileY);
  // Dungeon entrance
  if (tile === TILE_DUNGEON) {
    // Determine which dungeon
    const dungeonPositions = [[3,3],[27,3],[3,20],[27,20],[15,3],[15,20],[15,12]];
    let dIdx = dungeonPositions.findIndex(p => p[0]===player.tileX && p[1]===player.tileY);
    if (dIdx >= 0) {
      const d = DUNGEONS[dIdx];
      if (dIdx === 6 && player.shards.length < 6) return;
      if (player.dungeonCleared[d.id]) {
        queueDialogue('System', `${d.name} - Already cleared! The Crystal Shard has been claimed.`);
        return;
      }
      enterDungeon(dIdx);
    }
  }
  // Shop
  if (tile === TILE_SHOP) {
    openShop();
  }
}

// ---- ENEMY AI ----
function updateEnemies(dt) {
  enemies.forEach(e => {
    if (e.dead) return;
    if (e.hitTimer > 0) e.hitTimer -= dt;
    e.aiTimer -= dt;
    const dx = player.x - e.x, dy = player.y - e.y;
    const dist = Math.sqrt(dx*dx+dy*dy);
    // AI
    if (e.aiTimer <= 0) {
      if (dist < 200) {
        e.aiState = 'chase';
      } else if (dist < 400) {
        e.aiState = Math.random() > 0.5 ? 'chase' : 'wander';
      } else {
        e.aiState = 'wander';
      }
      e.aiTimer = 0.5 + Math.random();
    }
    if (e.aiState === 'chase' && dist > 20) {
      e.x += (dx/dist) * e.spd;
      e.y += (dy/dist) * e.spd;
    } else if (e.aiState === 'wander') {
      e.x += (Math.random()-0.5) * e.spd;
      e.y += (Math.random()-0.5) * e.spd;
    }
    // Attack player
    if (dist < (e.size||16) + 15) {
      hurtPlayer(e.atk);
    }
  });
}

function updateBoss(dt) {
  if (!bossData) return;
  bossData.aiTimer -= dt;
  bossData.attackTimer -= dt;
  const dx = player.x - bossData.x, dy = player.y - bossData.y;
  const dist = Math.sqrt(dx*dx+dy*dy);
  // Boss AI
  if (bossData.aiTimer <= 0) {
    if (bossData.inPhase2) {
      // Phase 2: more aggressive
      bossData.aiState = Math.random() > 0.3 ? 'charge' : 'shoot';
    } else {
      bossData.aiState = Math.random() > 0.5 ? 'chase' : 'circle';
    }
    bossData.aiTimer = 1;
  }
  switch (bossData.aiState) {
    case 'chase':
      if (dist > 40) {
        bossData.x += (dx/dist) * bossData.spd;
        bossData.y += (dy/dist) * bossData.spd;
      }
      break;
    case 'charge':
      if (dist > 10) {
        bossData.x += (dx/dist) * bossData.spd * 2;
        bossData.y += (dy/dist) * bossData.spd * 2;
      }
      break;
    case 'circle':
      if (dist > 20) {
        bossData.x += (-dy/dist) * bossData.spd * 0.8;
        bossData.y += (dx/dist) * bossData.spd * 0.8;
      }
      break;
    case 'shoot':
      if (bossData.attackTimer <= 0) {
        bossData.attackTimer = 1.5;
        const angle = Math.atan2(dy, dx);
        for (let i = -1; i <= 1; i++) {
          projectiles.push({
            x: bossData.x, y: bossData.y,
            vx: Math.cos(angle+i*0.3)*3, vy: Math.sin(angle+i*0.3)*3,
            type:'enemy_proj', dmg: bossData.atk, life: 3,
            color: bossData.color, size: 6, owner: 'enemy'
          });
        }
      }
      break;
  }
  // Boss attack player
  if (dist < (bossData.size||30) + 15) {
    hurtPlayer(bossData.atk);
  }
}

// ---- PROJECTILE UPDATE ----
function updateProjectiles(dt) {
  for (let i = projectiles.length-1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= dt;
    if (p.type === 'boomerang') {
      // Return to player after half life
      if (p.life < p.maxLife/2) {
        const dx = player.x - p.x, dy = player.y - p.y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d > 5) { p.vx = (dx/d)*5; p.vy = (dy/d)*5; }
        if (d < 20) p.life = 0;
      }
    }
    // Hit detection
    if (p.owner === 'player') {
      enemies.forEach(e => {
        if (e.dead) return;
        const dx = p.x - e.x, dy = p.y - e.y;
        if (Math.sqrt(dx*dx+dy*dy) < (e.size||16) + p.size) {
          damageEnemy(e, p.dmg);
          if (p.stun) e.aiTimer = 2;
          if (p.type !== 'boomerang') p.life = 0;
        }
      });
      if (bossActive && bossData) {
        const dx = p.x - bossData.x, dy = p.y - bossData.y;
        if (Math.sqrt(dx*dx+dy*dy) < (bossData.size||30) + p.size) {
          damageBoss(p.dmg);
          p.life = 0;
        }
      }
    } else if (p.owner === 'enemy') {
      const dx = p.x - player.x, dy = p.y - player.y;
      if (Math.sqrt(dx*dx+dy*dy) < 15 + p.size) {
        hurtPlayer(p.dmg);
        p.life = 0;
      }
    } else if (p.owner === 'world') {
      // Drops
      const dx = p.x - player.x, dy = p.y - player.y;
      if (Math.sqrt(dx*dx+dy*dy) < 25) {
        if (p.dropType === 'heart') {
          player.hearts = Math.min(player.maxHearts, player.hearts + 0.5);
          AudioSys.play('heart');
        } else if (p.dropType === 'magic') {
          player.magic = Math.min(player.maxMagic, player.magic + 10);
          AudioSys.play('magic');
        } else {
          player.rupees += 5;
          AudioSys.play('pickup');
        }
        p.life = 0;
      }
    }
    if (p.explodes && p.life <= 0) {
      // Bomb explosion
      AudioSys.play('bomb');
      Particles.emit(p.x, p.y, 20, '#f80', {spread:5, life:0.5, size:4});
      Particles.emit(p.x, p.y, 10, '#ff0', {spread:3, life:0.3, size:3});
      enemies.forEach(e => {
        if (e.dead) return;
        const dx = p.x - e.x, dy = p.y - e.y;
        if (Math.sqrt(dx*dx+dy*dy) < 60) damageEnemy(e, p.dmg);
      });
      if (bossActive && bossData) {
        const dx = p.x - bossData.x, dy = p.y - bossData.y;
        if (Math.sqrt(dx*dx+dy*dy) < 60) damageBoss(p.dmg);
      }
    }
    if (p.life <= 0) projectiles.splice(i, 1);
  }
}

// ---- PAUSE MENU ----
function updatePause() {
  if (Input.justPressed('pause') || Input.justPressed('cancel')) {
    hideScreen('pause-screen');
    showPlayingUI();
    gameState = STATE.PLAYING;
  }
  // Tab switching
  document.querySelectorAll('.pause-tab').forEach(tab => {
    if (Input.justPressed('confirm')) {
      // Already handled by click
    }
  });
}

function buildPauseUI() {
  // Inventory
  const invGrid = document.getElementById('inventory-grid');
  invGrid.innerHTML = '';
  Object.keys(player.items).forEach(key => {
    const count = player.items[key];
    if (!count || count <= 0 && !ITEMS[key]) return;
    const item = ITEMS[key];
    if (!item) return;
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    slot.innerHTML = `${item.icon}${count > 1 ? `<span class="inv-count">x${count}</span>` : ''}`;
    slot.title = `${item.name}: ${item.desc}`;
    invGrid.appendChild(slot);
  });
  // Equipment
  const eqList = document.getElementById('equipment-list');
  eqList.innerHTML = `
    <div class="equip-item equipped">A: ${ITEMS[player.equippedA]?.icon||''} ${ITEMS[player.equippedA]?.name||'Empty'}</div>
    <div class="equip-item equipped">B: ${ITEMS[player.equippedB]?.icon||''} ${ITEMS[player.equippedB]?.name||'Empty'}</div>
    <div class="equip-item">ATK: ${Math.floor(player.atk)}</div>
    <div class="equip-item">DEF: ${Math.floor(player.def)}</div>
    <div class="equip-item">SPD: ${player.speed.toFixed(1)}</div>
  `;
  // Quest
  const questList = document.getElementById('quest-list');
  questList.innerHTML = '';
  const quests = [
    {text:`Find Crystal Shards (${player.shards.length}/7)`, done: player.shards.length >= 7},
    {text:`Defeat Malachar in Time Citadel`, done: player.dungeonCleared['time']},
    {text:`Explore all overworld secrets`, done: player.overworldSecrets.length >= 5},
    {text:`Reach Level ${player.level}/${MAX_LEVEL}`, done: player.level >= MAX_LEVEL}
  ];
  quests.forEach(q => {
    const li = document.createElement('li');
    li.textContent = (q.done ? '✅ ' : '⬜ ') + q.text;
    questList.appendChild(li);
  });
  // Shards
  const shardList = document.getElementById('shard-list');
  shardList.innerHTML = '';
  DUNGEONS.forEach(d => {
    const li = document.createElement('li');
    const collected = player.shards.includes(d.id);
    li.className = collected ? 'collected' : 'uncollected';
    li.textContent = `${collected ? '✅' : '❌'} ${d.name} Shard - ${collected ? 'Obtained' : 'Missing'}`;
    shardList.appendChild(li);
  });
  // Map
  drawMinimap();
}

function drawMinimap() {
  const mc = document.getElementById('map-canvas');
  if (!mc) return;
  const mctx = mc.getContext('2d');
  mctx.fillStyle = '#0a0a14';
  mctx.fillRect(0, 0, 400, 300);
  const mapW = inDungeon ? currentDungeon.w : OVERWORLD_WIDTH;
  const mapH = inDungeon ? currentDungeon.h : OVERWORLD_HEIGHT;
  const scale = Math.min(380/mapW, 280/mapH);
  const offX = (400 - mapW*scale)/2;
  const offY = (300 - mapH*scale)/2;
  const map = inDungeon ? currentDungeon.map : overworldMap;
  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      const tile = map[y][x];
      const colors = era === ERA.PAST ? TILE_COLORS_PAST : TILE_COLORS_PRESENT;
      mctx.fillStyle = colors[tile] || '#333';
      mctx.fillRect(offX + x*scale, offY + y*scale, scale, scale);
    }
  }
  // Player dot
  mctx.fillStyle = '#fff';
  mctx.beginPath();
  mctx.arc(offX + (player.x/TILE)*scale, offY + (player.y/TILE)*scale, 3, 0, Math.PI*2);
  mctx.fill();
  // Dungeon markers
  if (!inDungeon) {
    DUNGEONS.forEach((d,i) => {
      const positions = [[3,3],[27,3],[3,20],[27,20],[15,3],[15,20],[15,12]];
      const px = positions[i];
      mctx.fillStyle = player.dungeonCleared[d.id] ? '#0f0' : d.color;
      mctx.fillRect(offX + px[0]*scale - 2, offY + px[1]*scale - 2, 4, 4);
    });
  }
}

// ---- GAME OVER ----
function updateGameOver() {
  if (Input.justPressed('confirm')) {
    // Default: retry
    resetGame();
    showPlayingUI();
    gameState = STATE.PLAYING;
  }
}

// ---- HUD UPDATE ----
function updateHUD() {
  // Hearts
  const hc = document.getElementById('hearts-container');
  let heartsHTML = '';
  for (let i = 0; i < player.maxHearts; i++) {
    if (i < Math.floor(player.hearts)) {
      heartsHTML += '<span class="heart heart-full">♥</span>';
    } else if (i < player.hearts) {
      heartsHTML += '<span class="heart heart-half">♥</span>';
    } else {
      heartsHTML += '<span class="heart heart-empty">♡</span>';
    }
  }
  hc.innerHTML = heartsHTML;
  // Magic
  document.getElementById('magic-bar').style.width = (player.magic / player.maxMagic * 100) + '%';
  // XP
  document.getElementById('xp-bar').style.width = (player.xp / player.xpNext * 100) + '%';
  document.getElementById('level-text').textContent = `Lv ${player.level}`;
  // Rupees
  document.getElementById('rupee-count').textContent = `${player.rupees} Rupees`;
  // Shards
  document.getElementById('shard-count').textContent = `${player.shards.length}/7 Shards`;
  // Era
  const eraEl = document.getElementById('time-era');
  eraEl.textContent = era.toUpperCase();
  eraEl.className = 'era-' + era.toLowerCase();
  // Equipped
  document.getElementById('slot-a').textContent = `A: ${ITEMS[player.equippedA]?.name || 'Empty'}`;
  document.getElementById('slot-b').textContent = `B: ${ITEMS[player.equippedB]?.name || 'Empty'}`;
}

// ---- RENDER ----
function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  switch (gameState) {
    case STATE.PLAYING:
    case STATE.PAUSED:
    case STATE.DIALOGUE:
      renderWorld();
      break;
    case STATE.MINIGAME:
      // Minigame renders its own canvas
      break;
  }
}

function renderWorld() {
  ctx.save();
  ctx.translate(-camX, -camY);
  const map = inDungeon ? currentDungeon.map : overworldMap;
  const mapW = inDungeon ? currentDungeon.w : OVERWORLD_WIDTH;
  const mapH = inDungeon ? currentDungeon.h : OVERWORLD_HEIGHT;
  const colors = era === ERA.PAST ? TILE_COLORS_PAST : TILE_COLORS_PRESENT;
  // Draw visible tiles
  const startCol = Math.max(0, Math.floor(camX / TILE));
  const endCol = Math.min(mapW, Math.ceil((camX + W) / TILE) + 1);
  const startRow = Math.max(0, Math.floor(camY / TILE));
  const endRow = Math.min(mapH, Math.ceil((camY + H) / TILE) + 1);
  for (let y = startRow; y < endRow; y++) {
    for (let x = startCol; x < endCol; x++) {
      const tile = map[y][x];
      let c = colors[tile] || (era===ERA.PAST ? TILE_COLORS_PAST[0] : TILE_COLORS_PRESENT[0]);
      // Special tiles
      if (tile === TILE_PORTAL) {
        c = era === ERA.PAST ? '#66ddaa' : '#8844cc';
        // Glow effect
        const glow = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
        ctx.globalAlpha = glow * 0.3;
        ctx.fillStyle = c;
        ctx.fillRect(x*TILE - 5, y*TILE - 5, TILE+10, TILE+10);
        ctx.globalAlpha = 1;
      }
      if (tile === TILE_DUNGEON) {
        const dIdx = getDungeonIdxAtTile(x, y);
        if (dIdx >= 0 && !player.dungeonCleared[DUNGEONS[dIdx].id]) {
          c = DUNGEONS[dIdx].color;
        } else {
          c = '#555';
        }
      }
      if (tile === TILE_SECRET) {
        if (player.overworldSecrets.includes(x+','+y) || (inDungeon && puzzleState.solved)) {
          c = '#555';
        } else {
          const shimmer = Math.sin(frameCount * 0.08 + x + y) * 0.2 + 0.8;
          c = `rgba(255,221,68,${shimmer})`;
        }
      }
      ctx.fillStyle = c;
      ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
      // Tile borders
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x*TILE, y*TILE, TILE, TILE);
      // Tree tops
      if (tile === TILE_TREE) {
        ctx.fillStyle = era === ERA.PAST ? '#2a6a2a' : '#1a3a1a';
        ctx.beginPath();
        ctx.arc(x*TILE+TILE/2, y*TILE+TILE/2, TILE/2-2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = era === ERA.PAST ? '#3a8a3a' : '#2a4a2a';
        ctx.beginPath();
        ctx.arc(x*TILE+TILE/2, y*TILE+TILE/3, TILE/3, 0, Math.PI*2);
        ctx.fill();
      }
      // Water animation
      if (tile === TILE_WATER) {
        ctx.fillStyle = `rgba(100,150,255,${0.1 + Math.sin(frameCount*0.03+x*0.5+y*0.3)*0.05})`;
        ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
      }
    }
  }
  // Draw NPCs
  npcs.forEach(npc => {
    ctx.fillStyle = '#ffdd44';
    ctx.beginPath();
    ctx.arc(npc.x, npc.y, 12, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillText(npc.icon, npc.x, npc.y + 5);
    // Name tag
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.fillText(npc.name, npc.x, npc.y - 18);
  });
  // Draw enemies
  enemies.forEach(e => {
    if (e.dead) return;
    // Hit flash
    if (e.hitTimer > 0) {
      ctx.fillStyle = '#fff';
    } else {
      ctx.fillStyle = e.color;
    }
    // Body
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size || 14, 0, Math.PI*2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = era === ERA.PRESENT ? '#f00' : '#fff';
    ctx.beginPath();
    ctx.arc(e.x - 4, e.y - 3, 2, 0, Math.PI*2);
    ctx.arc(e.x + 4, e.y - 3, 2, 0, Math.PI*2);
    ctx.fill();
    // HP bar for mini-bosses
    if (e.isMiniboss) {
      ctx.fillStyle = '#333';
      ctx.fillRect(e.x - 15, e.y - (e.size||14) - 8, 30, 4);
      ctx.fillStyle = '#f44';
      ctx.fillRect(e.x - 15, e.y - (e.size||14) - 8, 30 * (e.hp/e.maxHp), 4);
    }
  });
  // Draw boss
  if (bossActive && bossData) {
    // Boss body
    const pulse = Math.sin(frameCount * 0.05) * 3;
    ctx.fillStyle = bossData.color;
    ctx.beginPath();
    ctx.arc(bossData.x, bossData.y, (bossData.size||30) + pulse, 0, Math.PI*2);
    ctx.fill();
    // Boss inner
    ctx.fillStyle = bossData.inPhase2 ? '#f00' : '#fff';
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(bossData.x, bossData.y, (bossData.size||30)*0.6, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Boss eyes
    ctx.fillStyle = bossData.inPhase2 ? '#ff0' : '#f00';
    ctx.beginPath();
    ctx.arc(bossData.x - 8, bossData.y - 5, 4, 0, Math.PI*2);
    ctx.arc(bossData.x + 8, bossData.y - 5, 4, 0, Math.PI*2);
    ctx.fill();
    // Boss name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bossData.name, bossData.x, bossData.y - (bossData.size||30) - 14);
    // Boss HP on canvas
    ctx.fillStyle = '#333';
    ctx.fillRect(bossData.x - 40, bossData.y - (bossData.size||30) - 10, 80, 6);
    ctx.fillStyle = '#f44';
    ctx.fillRect(bossData.x - 40, bossData.y - (bossData.size||30) - 10, 80 * (bossHp/bossMaxHp), 6);
  }
  // Draw projectiles
  projectiles.forEach(p => {
    ctx.fillStyle = p.color;
    if (p.type === 'bomb') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      // Fuse spark
      ctx.arc(p.x + Math.sin(frameCount*0.3)*3, p.y - p.size, 3, 0, Math.PI*2);
      ctx.fill();
    } else if (p.type === 'boomerang') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(frameCount * 0.2);
      ctx.fillRect(-p.size/2, -2, p.size, 4);
      ctx.restore();
    } else if (p.type === 'drop') {
      ctx.globalAlpha = 0.6 + Math.sin(frameCount*0.1)*0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size/2, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size/2, 0, Math.PI*2);
      ctx.fill();
    }
  });
  // Draw player
  drawPlayer();
  // Draw particles
  Particles.draw(ctx, 0, 0);
  ctx.restore();
  // Era overlay
  if (era === ERA.PRESENT) {
    ctx.fillStyle = 'rgba(80,20,0,0.08)';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = 'rgba(20,80,40,0.05)';
    ctx.fillRect(0, 0, W, H);
  }
  // Minimap in corner when playing
  if (gameState === STATE.PLAYING) {
    drawCornerMinimap();
  }
}

function drawPlayer() {
  const px = player.x, py = player.y;
  // Invincibility flash
  if (player.invincible && Math.floor(frameCount/4) % 2 === 0) return;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(px, py + 14, 10, 4, 0, 0, Math.PI*2);
  ctx.fill();
  // Body
  ctx.fillStyle = era === ERA.PAST ? '#44aaff' : '#6688cc';
  ctx.beginPath();
  ctx.arc(px, py, 12, 0, Math.PI*2);
  ctx.fill();
  // Head
  ctx.fillStyle = '#ffddaa';
  ctx.beginPath();
  ctx.arc(px, py - 8, 7, 0, Math.PI*2);
  ctx.fill();
  // Hair
  ctx.fillStyle = era === ERA.PAST ? '#ff8' : '#88f';
  ctx.beginPath();
  ctx.arc(px, py - 12, 6, Math.PI, Math.PI*2);
  ctx.fill();
  // Eyes based on direction
  ctx.fillStyle = '#222';
  const ed = player.facing;
  ctx.beginPath();
  ctx.arc(px + ed.dx*3 - 2, py - 9 + ed.dy*2, 1.5, 0, Math.PI*2);
  ctx.arc(px + ed.dx*3 + 2, py - 9 + ed.dy*2, 1.5, 0, Math.PI*2);
  ctx.fill();
  // Sword attack animation
  if (player.attacking) {
    const angle = player.attackDir * (Math.PI/4);
    const prog = 1 - (player.attackTimer / 0.3);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const sAngle = angle - 0.8 + prog * 1.6;
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.sin(sAngle)*28, py - Math.cos(sAngle)*28);
    ctx.stroke();
    // Sword tip
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px + Math.sin(sAngle)*28, py - Math.cos(sAngle)*28, 3, 0, Math.PI*2);
    ctx.fill();
  }
  // Shield
  if (player.shielding) {
    const angle = player.dir * (Math.PI/4);
    ctx.fillStyle = 'rgba(100,150,255,0.6)';
    ctx.beginPath();
    ctx.arc(px + Math.sin(angle)*14, py - Math.cos(angle)*14, 16, angle-0.8, angle+0.8);
    ctx.fill();
    ctx.strokeStyle = '#88aaff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Dodge trail
  if (player.dodging) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#88f';
    ctx.beginPath();
    ctx.arc(px - player.facing.dx*15, py - player.facing.dy*15, 10, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawCornerMinimap() {
  const mmW = 120, mmH = 90;
  const mmX = W - mmW - 10, mmY = H - mmH - 10;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(mmX, mmY, mmW, mmH);
  ctx.strokeStyle = 'rgba(68,68,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX, mmY, mmW, mmH);
  const mapW = inDungeon ? currentDungeon.w : OVERWORLD_WIDTH;
  const mapH = inDungeon ? currentDungeon.h : OVERWORLD_HEIGHT;
  const map = inDungeon ? currentDungeon.map : overworldMap;
  const sx = mmW/mapW, sy = mmH/mapH;
  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      const t = map[y][x];
      if (t === TILE_WALL) continue;
      const colors = era === ERA.PAST ? TILE_COLORS_PAST : TILE_COLORS_PRESENT;
      ctx.fillStyle = colors[t] || '#333';
      ctx.fillRect(mmX + x*sx, mmY + y*sy, Math.ceil(sx), Math.ceil(sy));
    }
  }
  // Player dot
  ctx.fillStyle = '#fff';
  const pdx = mmX + (player.x/TILE)*sx;
  const pdy = mmY + (player.y/TILE)*sy;
  ctx.beginPath();
  ctx.arc(pdx, pdy, 2, 0, Math.PI*2);
  ctx.fill();
}

function getDungeonIdxAtTile(tx, ty) {
  const positions = [[3,3],[27,3],[3,20],[27,20],[15,3],[15,20],[15,12]];
  return positions.findIndex(p => p[0]===tx && p[1]===ty);
}

// ---- GAME LOOP ----
function gameLoop(timestamp) {
  deltaTime = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  update(deltaTime);
  render();
  requestAnimationFrame(gameLoop);
}

// ---- INIT ----
function init() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  AudioSys.init();
  Input.init(canvas);
  overworldMap = generateOverworld();
  spawnOverworldNPCs();
  // Button events
  document.getElementById('btn-new-game').onclick = () => {
    resetGame();
    showPlayingUI();
    gameState = STATE.PLAYING;
    AudioSys.resume();
    queueDialogue('Elder Mora', 'Lyra, the Time Crystal has been shattered by the dark sorcerer Malachar. You must find the 7 Crystal Shards across Aethoria and restore the crystal before all is lost.');
    setTimeout(() => {
      queueDialogue('Elder Mora', 'Use WASD to move, J to attack, K to shield, Space to dodge, L for items. Press T near Time Portals to shift between Past and Present. Good luck, hero!');
    }, 100);
  };
  document.getElementById('btn-continue').onclick = () => {
    if (loadGame()) {
      showPlayingUI();
      gameState = STATE.PLAYING;
      AudioSys.resume();
      queueDialogue('System', 'Game loaded. Welcome back, Lyra!');
    }
  };
  document.getElementById('btn-achievements').onclick = () => showAchievements();
  document.getElementById('btn-resume').onclick = () => {
    hideScreen('pause-screen');
    gameState = STATE.PLAYING;
  };
  document.getElementById('btn-save-game').onclick = () => {
    saveGame();
    hideScreen('pause-screen');
    gameState = STATE.PLAYING;
  };
  document.getElementById('btn-settings').onclick = () => {
    try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.show(); } catch(e) {}
  };
  document.getElementById('btn-leave-shop').onclick = () => {
    hideScreen('shop-screen');
    showPlayingUI();
    gameState = STATE.PLAYING;
  };
  document.getElementById('btn-retry').onclick = () => {
    resetGame();
    showPlayingUI();
    gameState = STATE.PLAYING;
  };
  document.getElementById('btn-menu').onclick = () => {
    hideScreen('gameover-screen');
    showScreen('menu-screen');
    gameState = STATE.MENU;
  };
  document.getElementById('btn-ad-revive').onclick = () => showRewardedAd();
  document.getElementById('btn-skip-ad').onclick = () => {
    hideScreen('ad-screen');
    showPlayingUI();
    gameState = STATE.PLAYING;
  };
  document.getElementById('btn-claim-reward').onclick = () => claimAdReward();
  document.getElementById('btn-back-menu').onclick = () => {
    hideScreen('achievements-screen');
    showScreen('menu-screen');
    gameState = STATE.MENU;
  };
  document.getElementById('btn-play-again').onclick = () => {
    resetGame();
    showPlayingUI();
    gameState = STATE.PLAYING;
  };
  document.getElementById('btn-victory-menu').onclick = () => {
    hideScreen('victory-screen');
    showScreen('menu-screen');
    gameState = STATE.MENU;
  };
  document.getElementById('btn-leave-minigame').onclick = () => {
    hideScreen('minigame-screen');
    showPlayingUI();
    gameState = STATE.PLAYING;
    minigameData = null;
  };
  // Pause tabs
  document.querySelectorAll('.pause-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.pause-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.pause-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('pause-tab-' + tab.dataset.tab).classList.add('active');
    };
  });
  // Check for existing save
  hasSave = hasSaveData();
  if (!hasSave) document.getElementById('btn-continue').style.opacity = '0.4';
  // Mobile detection for touch controls
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.getElementById('touch-controls').classList.remove('hidden');
  }
  // Start loop
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
