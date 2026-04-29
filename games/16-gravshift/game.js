// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('gravshift'); } catch(e) {}

const GRAV_ARROW = ['↓','→','↑','←'];
const GRAV_DX = [0,1,0,-1];
const GRAV_DY = [1,0,-1,0];

function generateRewards(amt) {
  let r = JSON.parse(localStorage.getItem('ngn4_rewards') || '{}');
  r.coins = (r.coins || 0) + amt;
  r.total = (r.total || 0) + amt;
  r.games16 = (r.games16 || 0) + 1;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
}

function getCoins() {
  return (JSON.parse(localStorage.getItem('ngn4_rewards') || '{}').coins || 0);
}

// --- Achievements ---
let gravAchievements = JSON.parse(localStorage.getItem('ngn4_gravshift_achievements') || '{}');
function unlockGravAchieve(id, name) {
  if(gravAchievements[id]) return;
  gravAchievements[id] = true;
  localStorage.setItem('ngn4_gravshift_achievements', JSON.stringify(gravAchievements));
  // Show toast
  let t = document.getElementById('grav-achieve-toast');
  if(!t){ t=document.createElement('div'); t.id='grav-achieve-toast'; t.style.cssText='position:fixed;top:80px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#0ff,#08f);color:#000;padding:8px 20px;border-radius:6px;font:bold 14px monospace;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;'; document.body.appendChild(t); }
  t.textContent='🏆 '+name; t.style.opacity='1'; setTimeout(()=>t.style.opacity='0',3000);
  if(typeof game !== 'undefined' && game.audioCtx) game.playSfx('win');
}
function checkGravAchievements(){
  const stars = game.levelStars;
  const allStarred = Object.keys(stars).every(k=>stars[k]===3);
  if(allStarred && Object.keys(stars).length >= game.levels.length) unlockGravAchieve('puzzle_master','Puzzle Master');
  // Check par times
  let allUnderPar = true;
  for(let i=0;i<game.levels.length;i++){
    if(!game.levelBestMoves[i] || game.levelBestMoves[i] > 15) allUnderPar=false;
  }
  if(allUnderPar && game.levels.length > 0) unlockGravAchieve('speed_runner','Speed Runner');
  // Minimalist - check if any level solved with minimum moves
  if(game.minMovesUsed <= 5) unlockGravAchieve('minimalist','Minimalist');
}

class GravShift {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.TILE = 40;
    this.COLS = 20;
    this.ROWS = 14;
    this.gravity = 0;
    this.player = { x: 1, y: 1, drawX: 1, drawY: 1 };
    this.boxes = [];
    this.balls = [];
    this.chips = [];
    this.spikes = [];
    this.lasers = [];
    this.switches = [];
    this.doors = [];
    this.exit = { x: 18, y: 12 };
    this.chipsCollected = 0;
    this.totalChips = 0;
    this.moves = 0;
    this.history = [];
    this.currentLevel = 0;
    this.levels = this.generateLevels();
    this.levelStars = JSON.parse(localStorage.getItem('ngn4_gravshift_stars') || '{}');
    this.levelUnlocked = JSON.parse(localStorage.getItem('ngn4_gravshift_unlocked') || '{"0":true}');
    this.levelBestMoves = JSON.parse(localStorage.getItem('ngn4_gravshift_best') || '{}');
    this.minMovesUsed = Infinity;
    this.state = 'menu';
    this.animating = false;
    this.animProgress = 0;
    this.animDuration = 150; // ms
    this.animFrame = 0;
    this.particles = [];
    this.audioCtx = null;
    this.updateCoins();
    this.setupInput();
    this.setupTouchInput();
    this.setupGamepad();
    this.loop();
  }

  updateCoins() {
    document.getElementById('menu-coins').textContent = getCoins();
  }

  initAudio() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playTone(freq, dur, type='sine', vol=0.15) {
    this.initAudio();
    const o = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + dur);
    o.connect(g);
    g.connect(this.audioCtx.destination);
    o.start();
    o.stop(this.audioCtx.currentTime + dur);
  }

  playSfx(name) {
    switch(name) {
      case 'grav': this.playTone(200, 0.3, 'sawtooth', 0.1); break;
      case 'chip': this.playTone(800, 0.15, 'sine', 0.12); this.playTone(1200, 0.15, 'sine', 0.1); break;
      case 'die': this.playTone(100, 0.5, 'sawtooth', 0.15); break;
      case 'win': [523,659,784,1047].forEach((f,i) => setTimeout(()=>this.playTone(f,0.3,'sine',0.12), i*100)); break;
      case 'push': this.playTone(300, 0.1, 'square', 0.08); break;
      case 'switch': this.playTone(600, 0.2, 'triangle', 0.1); break;
      case 'door': this.playTone(400, 0.3, 'sawtooth', 0.08); break;
    }
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  showMenu() { this.state = 'menu'; this.showScreen('menu-screen'); this.updateCoins(); }

  showHow() { this.showScreen('how-screen'); }

  showLevelSelect() {
    this.showScreen('level-select-screen');
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    this.levels.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.className = 'level-btn';
      const unlocked = this.levelUnlocked[i];
      if (!unlocked) btn.classList.add('locked');
      if (this.levelStars[i]) btn.classList.add('completed');
      btn.innerHTML = `${i+1}<div class="star-row">${'★'.repeat(this.levelStars[i]||0)}${'☆'.repeat(3-(this.levelStars[i]||0))}</div>`;
      if (unlocked) btn.onclick = () => this.loadLevel(i);
      grid.appendChild(btn);
    });
  }

  startGame() {
    this.currentLevel = 0;
    this.loadLevel(0);
  }

  generateLevels() {
    const levels = [];
    // Hand-crafted levels 0-14
    for (let i = 0; i < 20; i++) {
      const diff = Math.floor(i / 5);
      const lvl = this.createLevel(i, diff);
      levels.push(lvl);
    }
    return levels;
  }

  createLevel(num, diff) {
    const T = this.TILE;
    const walls = new Set();
    const w = (x,y) => walls.add(`${x},${y}`);

    for (let x = 0; x < this.COLS; x++) { w(x, 0); w(x, this.ROWS - 1); }
    for (let y = 0; y < this.ROWS; y++) { w(0, y); w(this.COLS - 1, y); }

    const boxes = [];
    const balls = [];
    const chips = [];
    const spikes = [];
    const lasers = [];
    const switches = [];
    const doors = [];
    let exit = { x: this.COLS - 2, y: this.ROWS - 2 };
    let start = { x: 1, y: 1 };

    if (num === 0) {
      start = {x:1,y:1}; exit = {x:18,y:12};
      for (let y = 2; y < 12; y++) w(4, y);
      chips.push({x:8,y:6});
    } else if (num === 1) {
      start = {x:1,y:12}; exit = {x:18,y:1};
      for (let x = 1; x < 18; x++) w(x, 7);
      w(10, 7);
      chips.push({x:10,y:7});
    } else if (num === 2) {
      start = {x:1,y:1}; exit = {x:18,y:12};
      for (let x = 3; x < 18; x++) w(x, 4);
      for (let x = 1; x < 16; x++) w(x, 10);
      w(3, 4); w(16, 10);
      chips.push({x:10,y:7}); chips.push({x:5,y:2});
      spikes.push({x:12,y:7});
    } else if (num === 3) {
      start = {x:1,y:7}; exit = {x:18,y:7};
      for (let y = 2; y < 13; y++) { if (y !== 7) w(6, y); }
      for (let y = 2; y < 13; y++) { if (y !== 7) w(14, y); }
      boxes.push({x:10,y:7});
      switches.push({x:3,y:7, active:false, doorId:0});
      doors.push({x:16,y:7, open:false, id:0});
      chips.push({x:10,y:3});
    } else if (num === 4) {
      start = {x:1,y:12}; exit = {x:18,y:1};
      for (let x = 2; x < 18; x++) w(x, 3);
      for (let x = 2; x < 18; x++) w(x, 6);
      for (let x = 2; x < 18; x++) w(x, 9);
      w(5,3); w(10,6); w(15,9);
      chips.push({x:5,y:2}); chips.push({x:10,y:5}); chips.push({x:15,y:8});
      boxes.push({x:5,y:8});
      switches.push({x:8,y:2, active:false, doorId:0});
      doors.push({x:17,y:1, open:false, id:0});
    } else if (num === 5) {
      // Gravity maze - need to switch gravity 4 times
      start = {x:1,y:1}; exit = {x:18,y:12};
      for (let y = 1; y < 13; y++) w(5, y);
      w(5, 4); w(5, 8);
      for (let y = 1; y < 13; y++) w(10, y);
      w(10, 3); w(10, 9);
      for (let y = 1; y < 13; y++) w(15, y);
      w(15, 5); w(15, 10);
      chips.push({x:3,y:6}); chips.push({x:8,y:2}); chips.push({x:13,y:10});
      spikes.push({x:7,y:11}); spikes.push({x:12,y:7});
    } else if (num === 6) {
      // Box puzzle - push box onto switch
      start = {x:1,y:1}; exit = {x:18,y:12};
      for (let x = 3; x < 18; x++) w(x, 6);
      w(8, 6); w(12, 6);
      boxes.push({x:5,y:5}); boxes.push({x:15,y:7});
      switches.push({x:8,y:7, active:false, doorId:0});
      switches.push({x:12,y:5, active:false, doorId:1});
      doors.push({x:16,y:1, open:false, id:0});
      doors.push({x:16,y:12, open:false, id:1});
      chips.push({x:10,y:3}); chips.push({x:10,y:9});
    } else if (num === 7) {
      // Laser gauntlet
      start = {x:1,y:7}; exit = {x:18,y:7};
      for (let y = 2; y < 13; y++) { if (y !== 7) w(6, y); }
      for (let y = 2; y < 13; y++) { if (y !== 7) w(14, y); }
      lasers.push({x:3,y:3,horizontal:true,on:true,timer:0,interval:100});
      lasers.push({x:3,y:11,horizontal:true,on:true,timer:50,interval:100});
      lasers.push({x:10,y:5,horizontal:true,on:true,timer:25,interval:80});
      lasers.push({x:10,y:9,horizontal:true,on:true,timer:75,interval:80});
      chips.push({x:8,y:7}); chips.push({x:16,y:4}); chips.push({x:16,y:10});
      spikes.push({x:12,y:7});
    } else if (num === 8) {
      // The Cross
      start = {x:1,y:1}; exit = {x:18,y:12};
      for (let x = 1; x < 18; x++) w(x, 7);
      for (let y = 1; y < 13; y++) w(10, y);
      w(10, 7); w(5, 7); w(15, 7); w(10, 3); w(10, 11);
      chips.push({x:3,y:4}); chips.push({x:7,y:2}); chips.push({x:15,y:10}); chips.push({x:7,y:11});
      balls.push({x:8,y:8}); balls.push({x:12,y:6});
      spikes.push({x:12,y:8}); spikes.push({x:8,y:5});
    } else if (num === 9) {
      // Spiral descent
      start = {x:1,y:1}; exit = {x:10,y:7};
      for (let x = 1; x < 17; x++) w(x, 2);
      for (let y = 2; y < 12; y++) w(16, y);
      w(16, 7);
      for (let x = 3; x < 17; x++) w(x, 11);
      for (let y = 5; y < 12; y++) w(3, y);
      w(3, 7);
      for (let x = 3; x < 10; x++) w(x, 5);
      for (let y = 1; y < 6; y++) w(9, y);
      w(9, 7);
      chips.push({x:8,y:1}); chips.push({x:15,y:6}); chips.push({x:5,y:10});
      boxes.push({x:7,y:7});
      spikes.push({x:13,y:9}); spikes.push({x:6,y:4});
    } else if (num === 10) {
      // Twin corridors
      start = {x:1,y:4}; exit = {x:18,y:9};
      for (let x = 3; x < 18; x++) w(x, 3);
      for (let x = 3; x < 18; x++) w(x, 6);
      for (let x = 3; x < 18; x++) w(x, 10);
      w(6,3); w(6,6); w(12,6); w(12,10);
      chips.push({x:5,y:2}); chips.push({x:10,y:5}); chips.push({x:15,y:8});
      switches.push({x:10,y:9,active:false,doorId:0});
      doors.push({x:17,y:9,open:false,id:0});
      lasers.push({x:8,y:4,horizontal:true,on:true,timer:0,interval:90});
      lasers.push({x:14,y:7,horizontal:true,on:true,timer:45,interval:90});
    } else if (num === 11) {
      // Pinball machine
      start = {x:1,y:1}; exit = {x:18,y:12};
      for (let x = 2; x < 17; x++) { w(x,2); w(x,12); }
      for (let y = 2; y < 13; y++) { w(2,y); w(17,y); }
      for (let y = 4; y < 11; y++) { if(y!==7) w(5,y); }
      for (let y = 4; y < 11; y++) { if(y!==7) w(10,y); }
      for (let y = 4; y < 11; y++) { if(y!==7) w(14,y); }
      w(5,7); w(10,7); w(14,7);
      chips.push({x:3,y:7}); chips.push({x:8,y:3}); chips.push({x:12,y:11}); chips.push({x:16,y:7});
      balls.push({x:7,y:5}); balls.push({x:12,y:9});
      spikes.push({x:4,y:4}); spikes.push({x:4,y:10}); spikes.push({x:15,y:4}); spikes.push({x:15,y:10});
    } else if (num === 12) {
      // The staircase
      start = {x:1,y:1}; exit = {x:18,y:12};
      for(let i=0;i<6;i++){for(let x=1+i*3;x<4+i*3&&x<18;x++)w(x,2+i*2);}
      w(4,2);w(7,4);w(10,6);w(13,8);w(16,10);
      chips.push({x:3,y:3});chips.push({x:6,y:5});chips.push({x:9,y:7});chips.push({x:12,y:9});chips.push({x:15,y:11});
      boxes.push({x:8,y:8});
      switches.push({x:15,y:7,active:false,doorId:0});
      doors.push({x:18,y:11,open:false,id:0});
    } else if (num === 13) {
      // Chaos chamber
      start = {x:1,y:1}; exit = {x:18,y:12};
      for(let x=4;x<17;x+=4)for(let y=2;y<12;y+=3)for(let dx=0;dx<2;dx++)for(let dy=0;dy<2;dy++){if(x+dx<this.COLS&&y+dy<this.ROWS-1)w(x+dx,y+dy);}
      w(5,4);w(5,10);w(13,4);w(13,10);w(9,7);
      chips.push({x:3,y:7});chips.push({x:9,y:2});chips.push({x:9,y:11});chips.push({x:16,y:7});
      balls.push({x:7,y:3});balls.push({x:11,y:9});
      spikes.push({x:6,y:6});spikes.push({x:12,y:6});
      lasers.push({x:7,y:7,horizontal:true,on:true,timer:0,interval:120});
    } else if (num === 14) {
      // Grand finale
      start = {x:1,y:7}; exit = {x:18,y:7};
      for(let y=2;y<13;y++){if(y!==7)w(5,y);}
      for(let y=2;y<13;y++){if(y!==7)w(15,y);}
      for(let x=5;x<16;x++)w(x,4);w(10,4);
      for(let x=5;x<16;x++)w(x,10);w(10,10);
      boxes.push({x:8,y:7});boxes.push({x:12,y:7});
      balls.push({x:7,y:6});balls.push({x:13,y:8});
      switches.push({x:3,y:7,active:false,doorId:0});
      switches.push({x:17,y:7,active:false,doorId:1});
      doors.push({x:10,y:4,open:false,id:0});
      doors.push({x:10,y:10,open:false,id:1});
      chips.push({x:10,y:2});chips.push({x:10,y:12});chips.push({x:7,y:5});chips.push({x:13,y:9});
      lasers.push({x:8,y:6,horizontal:true,on:true,timer:0,interval:80});
      lasers.push({x:12,y:8,horizontal:true,on:true,timer:40,interval:80});
      spikes.push({x:10,y:7});
    } else {
      // Procedural levels 15-19 with BFS validation
      start = {x: 1, y: this.ROWS - 2};
      exit = {x: this.COLS - 2, y: 1 };
      const numWalls = 15 + diff * 8;
      const numChips = 2 + diff;
      const numBoxes = diff;
      const numSpikes = diff * 2;
      const numLasers = Math.floor(diff / 2);

      let attempts = 0;
      let valid = false;
      while(!valid && attempts < 50){
        attempts++;
        walls.clear();
        for (let x = 0; x < this.COLS; x++) { w(x, 0); w(x, this.ROWS - 1); }
        for (let y = 0; y < this.ROWS; y++) { w(0, y); w(this.COLS - 1, y); }

        for (let w2 = 0; w2 < numWalls; w2++) {
          const wx = 2 + Math.floor(Math.random() * (this.COLS - 4));
          const wy = 2 + Math.floor(Math.random() * (this.ROWS - 4));
          if (!(wx === start.x && wy === start.y) && !(wx === exit.x && wy === exit.y)) {
            w(wx, wy);
            if (Math.random() > 0.5) {
              const dx2 = Math.random() > 0.5 ? 1 : 0;
              const dy2 = dx2 === 0 ? 1 : 0;
              const nx = wx + dx2, ny = wy + dy2;
              if (nx > 0 && nx < this.COLS-1 && ny > 0 && ny < this.ROWS-1) {
                if (!(nx === start.x && ny === start.y) && !(nx === exit.x && ny === exit.y)) {
                  w(nx, ny);
                }
              }
            }
          }
        }
        for (let dx2 = -1; dx2 <= 1; dx2++)
          for (let dy2 = -1; dy2 <= 1; dy2++) {
            walls.delete(`${start.x+dx2},${start.y+dy2}`);
            walls.delete(`${exit.x+dx2},${exit.y+dy2}`);
          }
        valid = this.validateLevel(walls, start, exit);
      }

      for (let c = 0; c < numChips; c++) {
        let cx, cy;
        do { cx = 2+Math.floor(Math.random()*(this.COLS-4)); cy = 2+Math.floor(Math.random()*(this.ROWS-4)); }
        while (walls.has(`${cx},${cy}`));
        chips.push({x:cx, y:cy});
      }
      for (let b = 0; b < numBoxes; b++) {
        let bx, by;
        do { bx = 3+Math.floor(Math.random()*(this.COLS-6)); by = 3+Math.floor(Math.random()*(this.ROWS-6)); }
        while (walls.has(`${bx},${by}`));
        boxes.push({x:bx, y:by});
      }
      for (let s = 0; s < numSpikes; s++) {
        let sx, sy;
        do { sx = 2+Math.floor(Math.random()*(this.COLS-4)); sy = 2+Math.floor(Math.random()*(this.ROWS-4)); }
        while (walls.has(`${sx},${sy}`));
        spikes.push({x:sx, y:sy});
      }
      if (numLasers > 0) {
        for (let l = 0; l < numLasers; l++) {
          const horizontal = Math.random() > 0.5;
          let lx, ly;
          do { lx = 2+Math.floor(Math.random()*(this.COLS-4)); ly = 2+Math.floor(Math.random()*(this.ROWS-4)); }
          while (walls.has(`${lx},${ly}`));
          lasers.push({x:lx, y:ly, horizontal, on: true, timer: 0, interval: 120 + Math.random()*120});
        }
      }
      if (diff >= 1 && Math.random() > 0.3) {
        let sx, sy;
        do { sx = 3+Math.floor(Math.random()*(this.COLS-6)); sy = 3+Math.floor(Math.random()*(this.ROWS-6)); }
        while (walls.has(`${sx},${sy}`));
        const did = switches.length;
        switches.push({x:sx, y:sy, active:false, doorId:did});
        let dx2, dy2;
        do { dx2 = 2+Math.floor(Math.random()*(this.COLS-4)); dy2 = 2+Math.floor(Math.random()*(this.ROWS-4)); }
        while (walls.has(`${dx2},${dy2}`));
        doors.push({x:dx2, y:dy2, open:false, id:did});
      }
      for (let b = 0; b < diff; b++) {
        let bx, by;
        do { bx = 3+Math.floor(Math.random()*(this.COLS-6)); by = 3+Math.floor(Math.random()*(this.ROWS-6)); }
        while (walls.has(`${bx},${by}`));
        balls.push({x:bx, y:by});
      }
    }

    return { num, start, exit, walls, boxes, balls, chips, spikes, lasers, switches, doors };
  }

  // BFS validation: check path exists using gravity switches
  validateLevel(walls, start, exit) {
    // BFS from start, can move in 4 gravity directions
    const visited = new Set();
    const queue = [{x:start.x, y:start.y}];
    visited.add(`${start.x},${start.y}`);
    while(queue.length > 0) {
      const cur = queue.shift();
      if(cur.x === exit.x && cur.y === exit.y) return true;
      for(let d = 0; d < 4; d++){
        let x = cur.x, y = cur.y;
        // Simulate gravity: move in direction d until hitting wall
        while(true){
          const nx = x + GRAV_DX[d], ny = y + GRAV_DY[d];
          if(walls.has(`${nx},${ny}`)) break;
          x = nx; y = ny;
        }
        const key = `${x},${y}`;
        if(!visited.has(key)){
          visited.add(key);
          queue.push({x,y});
        }
      }
    }
    return false;
  }

  loadLevel(idx) {
    this.currentLevel = idx;
    const lvl = this.levels[idx];
    this.player = { x: lvl.start.x, y: lvl.start.y, drawX: lvl.start.x, drawY: lvl.start.y };
    this.boxes = lvl.boxes.map(b => ({...b}));
    this.balls = lvl.balls.map(b => ({...b}));
    this.chips = lvl.chips.map(c => ({...c, collected: false}));
    this.spikes = [...lvl.spikes];
    this.lasers = lvl.lasers.map(l => ({...l}));
    this.switches = lvl.switches.map(s => ({...s}));
    this.doors = lvl.doors.map(d => ({...d}));
    this.exit = {...lvl.exit};
    this.walls = new Set(lvl.walls);
    this.chipsCollected = 0;
    this.totalChips = this.chips.length;
    this.moves = 0;
    this.history = [];
    this.gravity = 0;
    this.state = 'playing';
    this.animating = false;
    this.showScreen('game-screen');
    this.updateHud();
    this.particles = [];
  }

  updateHud() {
    document.getElementById('hud-level').textContent = `Level ${this.currentLevel + 1}`;
    document.getElementById('hud-chips').textContent = `Chips: ${this.chipsCollected}/${this.totalChips}`;
    document.getElementById('hud-moves').textContent = `Moves: ${this.moves}`;
    document.getElementById('hud-grav').textContent = `Gravity: ${GRAV_ARROW[this.gravity]}`;
  }

  setupInput() {
    document.addEventListener('keydown', (e) => {
      if (this.state !== 'playing' || this.animating) return;
      switch(e.key) {
        case 'ArrowDown': case '1': this.setGravity(0); break;
        case 'ArrowRight': case '2': this.setGravity(1); break;
        case 'ArrowUp': case '3': this.setGravity(2); break;
        case 'ArrowLeft': case '4': this.setGravity(3); break;
        case 'z': case 'Z': this.undo(); break;
        case 'r': case 'R': this.loadLevel(this.currentLevel); break;
      }
      if (['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)) e.preventDefault();
    });
  }

  // --- Touch Swipe Controls ---
  setupTouchInput() {
    let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.initAudio();
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartTime = Date.now();
    }, {passive: false});

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.state !== 'playing' || this.animating) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const elapsed = Date.now() - touchStartTime;

      if (dist < 20 && elapsed < 300) {
        // Tap = undo
        this.undo();
        return;
      }
      if (dist < 30) return;

      // Determine swipe direction
      if (Math.abs(dx) > Math.abs(dy)) {
        this.setGravity(dx > 0 ? 1 : 3); // right : left
      } else {
        this.setGravity(dy > 0 ? 0 : 2); // down : up
      }
    }, {passive: false});
  }

  // --- Gamepad Support ---
  setupGamepad() {
    let gpPrev = {};
    const poll = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gps[0];
      if(!gp){ requestAnimationFrame(poll); return; }
      const pressed = {};
      for(let i=0;i<gp.buttons.length;i++) pressed[i]=gp.buttons[i].pressed;
      if(this.state==='playing' && !this.animating){
        if(pressed[12]&&!gpPrev[12]) this.setGravity(2); // Up
        if(pressed[13]&&!gpPrev[13]) this.setGravity(0); // Down
        if(pressed[14]&&!gpPrev[14]) this.setGravity(3); // Left
        if(pressed[15]&&!gpPrev[15]) this.setGravity(1); // Right
        if(pressed[0]&&!gpPrev[0]) this.undo(); // A = undo
        if(pressed[9]&&!gpPrev[9]) this.loadLevel(this.currentLevel); // Start = restart
      }
      gpPrev = pressed;
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }

  // --- Level Editor ---
  saveCustomLevel() {
    const data = {
      start: {x: parseInt(prompt('Start X (1-18):','1'))||1, y: parseInt(prompt('Start Y (1-12):','1'))||1},
      exit: {x: parseInt(prompt('Exit X (1-18):','18'))||18, y: parseInt(prompt('Exit Y (1-12):','12'))||12},
      walls: this.walls, boxes: this.boxes, chips: this.chips,
      spikes: this.spikes, lasers: this.lasers, switches: this.switches, doors: this.doors
    };
    const saved = JSON.parse(localStorage.getItem('ngn4_gravshift_custom') || '[]');
    saved.push(data);
    localStorage.setItem('ngn4_gravshift_custom', JSON.stringify(saved));
    alert('Level saved! (slot ' + saved.length + ')');
  }
  loadCustomLevel(idx) {
    const saved = JSON.parse(localStorage.getItem('ngn4_gravshift_custom') || '[]');
    if(idx >= saved.length) return;
    const data = saved[idx];
    this.currentLevel = -1; // custom
    this.player = { x: data.start.x, y: data.start.y, drawX: data.start.x, drawY: data.start.y };
    this.boxes = data.boxes.map(b=>({...b}));
    this.balls = (data.balls||[]).map(b=>({...b}));
    this.chips = data.chips.map(c=>({...c,collected:false}));
    this.spikes = [...data.spikes];
    this.lasers = data.lasers.map(l=>({...l}));
    this.switches = data.switches.map(s=>({...s}));
    this.doors = data.doors.map(d=>({...d}));
    this.exit = {...data.exit};
    this.walls = new Set(data.walls);
    this.chipsCollected = 0;
    this.totalChips = this.chips.length;
    this.moves = 0;
    this.history = [];
    this.gravity = 0;
    this.state = 'playing';
    this.animating = false;
    this.showScreen('game-screen');
    this.updateHud();
    this.particles = [];
  }

  saveState() {
    this.history.push({
      px: this.player.x, py: this.player.y, pdx: this.player.drawX, pdy: this.player.drawY,
      boxes: this.boxes.map(b => ({...b})),
      balls: this.balls.map(b => ({...b})),
      chips: this.chips.map(c => c.collected),
      chipsCollected: this.chipsCollected,
      switches: this.switches.map(s => ({...s})),
      doors: this.doors.map(d => ({...d})),
      gravity: this.gravity,
      moves: this.moves
    });
    if (this.history.length > 100) this.history.shift();
  }

  undo() {
    if (this.history.length === 0) return;
    const s = this.history.pop();
    this.player.x = s.px; this.player.y = s.py;
    this.player.drawX = s.pdx; this.player.drawY = s.pdy;
    this.boxes = s.boxes;
    this.balls = s.balls;
    this.chips.forEach((c,i) => c.collected = s.chips[i]);
    this.chipsCollected = s.chipsCollected;
    this.switches = s.switches;
    this.doors = s.doors;
    this.gravity = s.gravity;
    this.moves = s.moves;
    this.updateHud();
    this.playSfx('grav');
  }

  isWall(x, y) { return this.walls.has(`${x},${y}`); }
  isDoor(x, y) { return this.doors.some(d => d.x === x && d.y === y && !d.open); }
  isBlocked(x, y) { return this.isWall(x, y) || this.isDoor(x, y); }
  isBox(x, y) { return this.boxes.findIndex(b => b.x === x && b.y === y); }

  setGravity(dir) {
    if (this.gravity === dir) return;
    this.saveState();
    this.gravity = dir;
    this.playSfx('grav');

    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: this.player.x * this.TILE + this.TILE/2,
        y: this.player.y * this.TILE + this.TILE/2 + 36,
        vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4,
        life: 30, color: '#0ff'
      });
    }

    // Store pre-move positions for animation
    const prevPlayerX = this.player.x, prevPlayerY = this.player.y;
    const prevBoxes = this.boxes.map(b=>({x:b.x, y:b.y}));
    const prevBalls = this.balls.map(b=>({x:b.x, y:b.y}));

    this.applyPhysics();

    // Set up animation
    this._animFrom = {
      px: prevPlayerX, py: prevPlayerY,
      boxes: prevBoxes, balls: prevBalls
    };
    this._animTo = {
      px: this.player.x, py: this.player.y,
      boxes: this.boxes.map(b=>({x:b.x,y:b.y})),
      balls: this.balls.map(b=>({x:b.x,y:b.y}))
    };
    this.animating = true;
    this.animProgress = 0;
    this.animStartTime = performance.now();

    this.moves++;
    this.updateHud();
  }

  applyPhysics() {
    let moved = true;
    let maxIter = 40;
    while (moved && maxIter > 0) {
      moved = false;
      maxIter--;
      const movedBalls = new Set();
      for (let b of this.balls) {
        if (movedBalls.has(b)) continue;
        const nx = b.x + GRAV_DX[this.gravity];
        const ny = b.y + GRAV_DY[this.gravity];
        if (!this.isBlocked(nx, ny) && this.isBox(nx, ny) === -1 && !this.balls.some(ob => ob !== b && ob.x === nx && ob.y === ny)) {
          b.x = nx; b.y = ny;
          moved = true;
          movedBalls.add(b);
        }
      }
      for (let b of this.boxes) {
        const nx = b.x + GRAV_DX[this.gravity];
        const ny = b.y + GRAV_DY[this.gravity];
        if (!this.isBlocked(nx, ny) && this.isBox(nx, ny) === -1 &&
            !this.balls.some(ob => ob.x === nx && ob.y === ny) &&
            !(nx === this.player.x && ny === this.player.y)) {
          b.x = nx; b.y = ny;
          moved = true;
        }
      }
      const nx = this.player.x + GRAV_DX[this.gravity];
      const ny = this.player.y + GRAV_DY[this.gravity];
      if (!this.isBlocked(nx, ny) && this.isBox(nx, ny) === -1 &&
          !this.balls.some(ob => ob.x === nx && ob.y === ny)) {
        this.player.x = nx;
        this.player.y = ny;
        moved = true;
      }
      if (this.checkHazards()) return;
      this.checkChipPickup();
    }
    this.checkSwitches();
    this.checkWin();
  }

  checkHazards() {
    for (let s of this.spikes) {
      if (this.player.x === s.x && this.player.y === s.y) { this.die("You fell into the spikes!"); return true; }
    }
    for (let l of this.lasers) {
      if (!l.on) continue;
      if (l.horizontal) {
        if (this.player.y === l.y) {
          for (let x = l.x - 5; x <= l.x + 5; x++) {
            if (!this.isWall(x, l.y) && !this.isDoor(x, l.y)) { if (this.player.x === x) { this.die("Hit by a laser beam!"); return true; } } else break;
          }
          for (let x = l.x + 1; x <= l.x + 5; x++) {
            if (!this.isWall(x, l.y) && !this.isDoor(x, l.y)) { if (this.player.x === x) { this.die("Hit by a laser beam!"); return true; } } else break;
          }
        }
      } else {
        if (this.player.x === l.x) {
          for (let y = l.y - 5; y <= l.y + 5; y++) {
            if (!this.isWall(l.x, y) && !this.isDoor(l.x, y)) { if (this.player.y === y) { this.die("Hit by a laser beam!"); return true; } } else break;
          }
          for (let y = l.y + 1; y <= l.y + 5; y++) {
            if (!this.isWall(l.x, y) && !this.isDoor(l.x, y)) { if (this.player.y === y) { this.die("Hit by a laser beam!"); return true; } } else break;
          }
        }
      }
    }
    return false;
  }

  checkChipPickup() {
    for (let c of this.chips) {
      if (!c.collected && this.player.x === c.x && this.player.y === c.y) {
        c.collected = true;
        this.chipsCollected++;
        this.playSfx('chip');
        this.addParticles(c.x * this.TILE + 20, c.y * this.TILE + 36, '#ff0', 12);
      }
    }
    this.updateHud();
  }

  checkSwitches() {
    for (let s of this.switches) {
      const wasActive = s.active;
      s.active = this.boxes.some(b => b.x === s.x && b.y === s.y) ||
                 this.balls.some(b => b.x === s.x && b.y === s.y) ||
                 (this.player.x === s.x && this.player.y === s.y);
      if (s.active !== wasActive) {
        const door = this.doors.find(d => d.id === s.doorId);
        if (door) { door.open = s.active; this.playSfx(s.active ? 'switch' : 'door'); }
      }
    }
  }

  checkWin() {
    if (this.player.x === this.exit.x && this.player.y === this.exit.y) this.win();
  }

  win() {
    this.state = 'win';
    const moves = this.moves;
    const stars = this.chipsCollected === this.totalChips ? (moves < 15 ? 3 : moves < 30 ? 2 : 1) :
                  this.chipsCollected >= this.totalChips / 2 ? 1 : 0;
    const coins = 20 + (stars * 10) + (this.chipsCollected * 5);
    const prevStars = this.levelStars[this.currentLevel] || 0;
    if (stars > prevStars) {
      this.levelStars[this.currentLevel] = stars;
      localStorage.setItem('ngn4_gravshift_stars', JSON.stringify(this.levelStars));
    }
    // Track best moves
    const prevBest = this.levelBestMoves[this.currentLevel] || Infinity;
    if(moves < prevBest){
      this.levelBestMoves[this.currentLevel] = moves;
      localStorage.setItem('ngn4_gravshift_best', JSON.stringify(this.levelBestMoves));
    }
    if(moves < this.minMovesUsed) this.minMovesUsed = moves;
    if (this.currentLevel + 1 < this.levels.length) {
      this.levelUnlocked[this.currentLevel + 1] = true;
      localStorage.setItem('ngn4_gravshift_unlocked', JSON.stringify(this.levelUnlocked));
    }
    generateRewards(coins);
    this.playSfx('win');
    document.getElementById('win-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3-stars);
    document.getElementById('win-stats').innerHTML = `Moves: ${moves}<br>Chips: ${this.chipsCollected}/${this.totalChips}`;
    document.getElementById('win-reward').textContent = `+${coins} 🪙`;
    if ((this.currentLevel + 1) % 5 === 0 && this.currentLevel < this.levels.length - 1) {
      setTimeout(() => this.showAd(() => this.showScreen('win-screen')), 500);
    } else {
      this.showScreen('win-screen');
    }
    this.updateCoins();
    checkGravAchievements();
  }

  die(msg) {
    this.state = 'lose';
    this.playSfx('die');
    document.getElementById('lose-msg').textContent = msg;
    this.showScreen('lose-screen');
  }

  retryLevel() { this.loadLevel(this.currentLevel); }
  nextLevel() {
    if (this.currentLevel + 1 < this.levels.length) this.loadLevel(this.currentLevel + 1);
    else this.showMenu();
  }
  watchAdSkip() { this.showAd(() => this.nextLevel()); }

  showAd(callback) {
    this.state = 'ad';
    this.showScreen('ad-screen');
    let t = 5;
    const el = document.getElementById('ad-timer-val');
    el.textContent = t;
    const iv = setInterval(() => { t--; el.textContent = t; if (t <= 0) { clearInterval(iv); this.state = 'ad_done'; } }, 1000);
    this._adCallback = () => { clearInterval(iv); if (callback) callback(); };
  }
  closeAd() { if (this.state === 'ad_done' && this._adCallback) { this._adCallback(); this._adCallback = null; } }

  addParticles(x, y, color, count=8) {
    for (let i = 0; i < count; i++) {
      this.particles.push({ x, y, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, life: 20 + Math.random()*20, color });
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  updateLasers() {
    for (let l of this.lasers) {
      l.timer = (l.timer || 0) + 1;
      if (l.timer >= l.interval) { l.on = !l.on; l.timer = 0; }
    }
  }

  // --- Animation lerp ---
  lerp(a, b, t) { return a + (b - a) * Math.min(1, t); }

  render() {
    const ctx = this.ctx;
    const T = this.TILE;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update animation
    if(this.animating) {
      const elapsed = performance.now() - this.animStartTime;
      const t = Math.min(1, elapsed / this.animDuration);
      const eased = t < 0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; // ease in-out
      this.player.drawX = this.lerp(this._animFrom.px, this._animTo.px, eased);
      this.player.drawY = this.lerp(this._animFrom.py, this._animTo.py, eased);
      this.boxes.forEach((b,i) => {
        if(this._animFrom.boxes[i]) {
          b._drawX = this.lerp(this._animFrom.boxes[i].x, this._animTo.boxes[i].x, eased);
          b._drawY = this.lerp(this._animFrom.boxes[i].y, this._animTo.boxes[i].y, eased);
        } else { b._drawX = b.x; b._drawY = b.y; }
      });
      this.balls.forEach((b,i) => {
        if(this._animFrom.balls[i]) {
          b._drawX = this.lerp(this._animFrom.balls[i].x, this._animTo.balls[i].x, eased);
          b._drawY = this.lerp(this._animFrom.balls[i].y, this._animTo.balls[i].y, eased);
        } else { b._drawX = b.x; b._drawY = b.y; }
      });
      if(t >= 1) {
        this.animating = false;
        this.player.drawX = this.player.x;
        this.player.drawY = this.player.y;
      }
    } else {
      this.player.drawX = this.player.x;
      this.player.drawY = this.player.y;
      this.boxes.forEach(b => { b._drawX = b.x; b._drawY = b.y; });
      this.balls.forEach(b => { b._drawX = b.x; b._drawY = b.y; });
    }

    // Background grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.COLS; x++) { ctx.beginPath(); ctx.moveTo(x*T, 0); ctx.lineTo(x*T, this.ROWS*T); ctx.stroke(); }
    for (let y = 0; y < this.ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y*T); ctx.lineTo(this.COLS*T, y*T); ctx.stroke(); }

    // Walls
    ctx.fillStyle = '#1a1a3a';
    this.walls.forEach(k => {
      const [wx, wy] = k.split(',').map(Number);
      ctx.fillRect(wx*T, wy*T, T, T);
      ctx.strokeStyle = '#2a2a5a'; ctx.strokeRect(wx*T, wy*T, T, T);
    });

    // Doors
    for (let d of this.doors) {
      if (!d.open) {
        ctx.fillStyle = '#f80'; ctx.fillRect(d.x*T+2, d.y*T+2+36, T-4, T-4);
        ctx.strokeStyle = '#fa0'; ctx.lineWidth = 2; ctx.strokeRect(d.x*T+2, d.y*T+2+36, T-4, T-4); ctx.lineWidth = 1;
        ctx.fillStyle = '#000'; ctx.font = '16px monospace'; ctx.textAlign = 'center';
        ctx.fillText('🔒', d.x*T+T/2, d.y*T+T/2+42);
      }
    }

    // Switches
    for (let s of this.switches) {
      ctx.fillStyle = s.active ? '#0f0' : '#555';
      ctx.beginPath(); ctx.arc(s.x*T+T/2, s.y*T+T/2+36, 12, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = s.active ? '#0f0' : '#333'; ctx.stroke();
    }

    // Spikes
    for (let s of this.spikes) {
      ctx.fillStyle = '#f44';
      const cx = s.x*T + T/2, cy = s.y*T + T/2 + 36;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - 12 + i*8, cy + 8);
        ctx.lineTo(cx - 8 + i*8, cy - 8);
        ctx.lineTo(cx - 4 + i*8, cy + 8);
        ctx.fill();
      }
    }

    // Lasers
    for (let l of this.lasers) {
      if (l.on) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'; ctx.lineWidth = 3;
        ctx.shadowColor = '#f00'; ctx.shadowBlur = 10;
        if (l.horizontal) {
          let startX = l.x, endX = l.x;
          while (startX > 0 && !this.isWall(startX, l.y) && !this.isDoor(startX, l.y)) startX--;
          while (endX < this.COLS && !this.isWall(endX, l.y) && !this.isDoor(endX, l.y)) endX++;
          ctx.beginPath(); ctx.moveTo((startX+1)*T+T/2, l.y*T+T/2+36); ctx.lineTo((endX)*T-T/2, l.y*T+T/2+36); ctx.stroke();
        } else {
          let startY = l.y, endY = l.y;
          while (startY > 0 && !this.isWall(l.x, startY) && !this.isDoor(l.x, startY)) startY--;
          while (endY < this.ROWS && !this.isWall(l.x, endY) && !this.isDoor(l.x, endY)) endY++;
          ctx.beginPath(); ctx.moveTo(l.x*T+T/2, (startY+1)*T+T/2+36); ctx.lineTo(l.x*T+T/2, (endY)*T-T/2+36); ctx.stroke();
        }
        ctx.shadowBlur = 0; ctx.lineWidth = 1;
      }
      ctx.fillStyle = l.on ? '#f00' : '#600';
      ctx.fillRect(l.x*T+T/2-4, l.y*T+T/2+36-4, 8, 8);
    }

    // Chips
    const time = Date.now() / 1000;
    for (let c of this.chips) {
      if (!c.collected) {
        const bob = Math.sin(time * 3 + c.x) * 3;
        ctx.fillStyle = '#ff0'; ctx.shadowColor = '#ff0'; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(c.x*T+T/2, c.y*T+T/2+36-10+bob);
        ctx.lineTo(c.x*T+T/2+10, c.y*T+T/2+36+bob);
        ctx.lineTo(c.x*T+T/2, c.y*T+T/2+36+10+bob);
        ctx.lineTo(c.x*T+T/2-10, c.y*T+T/2+36+bob);
        ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      }
    }

    // Boxes (with animation)
    for (let b of this.boxes) {
      const bx = (b._drawX !== undefined ? b._drawX : b.x) * T;
      const by = (b._drawY !== undefined ? b._drawY : b.y) * T;
      ctx.fillStyle = '#864'; ctx.fillRect(bx+2, by+2+36, T-4, T-4);
      ctx.strokeStyle = '#a86'; ctx.lineWidth = 2; ctx.strokeRect(bx+2, by+2+36, T-4, T-4); ctx.lineWidth = 1;
      ctx.fillStyle = '#fff'; ctx.font = '14px monospace'; ctx.textAlign = 'center';
      ctx.fillText('□', bx+T/2, by+T/2+40);
    }

    // Balls (with animation)
    for (let b of this.balls) {
      const bx2 = (b._drawX !== undefined ? b._drawX : b.x) * T;
      const by2 = (b._drawY !== undefined ? b._drawY : b.y) * T;
      ctx.fillStyle = '#66f'; ctx.shadowColor = '#66f'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(bx2+T/2, by2+T/2+36, 14, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    }

    // Exit
    const exitPulse = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.fillStyle = `rgba(0, 255, 0, ${0.2 + exitPulse * 0.3})`;
    ctx.fillRect(this.exit.x*T, this.exit.y*T+36, T, T);
    ctx.strokeStyle = '#0f0'; ctx.lineWidth = 2;
    ctx.strokeRect(this.exit.x*T+2, this.exit.y*T+2+36, T-4, T-4); ctx.lineWidth = 1;
    ctx.fillStyle = '#0f0'; ctx.font = '20px monospace'; ctx.textAlign = 'center';
    ctx.fillText('🚪', this.exit.x*T+T/2, this.exit.y*T+T/2+42);

    // Player (with animation)
    const px = this.player.drawX * T + T/2;
    const py = this.player.drawY * T + T/2 + 36;
    ctx.fillStyle = '#0ff'; ctx.shadowColor = '#0ff'; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0a0f'; ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(GRAV_ARROW[this.gravity], px, py); ctx.textBaseline = 'alphabetic';

    // Gravity direction indicator
    ctx.fillStyle = 'rgba(0,255,255,0.1)';
    const gx = GRAV_DX[this.gravity], gy = GRAV_DY[this.gravity];
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath(); ctx.arc(px + gx*i*20, py + gy*i*20, 4, 0, Math.PI*2); ctx.fill();
    }

    // Particles
    for (let p of this.particles) {
      ctx.globalAlpha = p.life / 50; ctx.fillStyle = p.color;
      ctx.fillRect(p.x-2, p.y-2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  loop() {
    if (this.state === 'playing') this.updateLasers();
    this.updateParticles();
    if (this.state === 'playing') this.render();
    requestAnimationFrame(() => this.loop());
  }
}

const game = new GravShift();
