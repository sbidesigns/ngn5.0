// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('dead-signal'); } catch(e) {}

function generateRewards18(amt) {
  let r = JSON.parse(localStorage.getItem('ngn4_rewards') || '{}');
  r.coins = (r.coins || 0) + amt;
  r.total = (r.total || 0) + amt;
  r.games18 = (r.games18 || 0) + 1;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
}

function getCoins18() { return (JSON.parse(localStorage.getItem('ngn4_rewards') || '{}').coins || 0); }

const CHAPTERS = [
  { name: "The Signal", desc: "You dock with the derelict station. The air is cold. Something is wrong.", mapW: 30, mapH: 25 },
  { name: "Power Grid", desc: "Restore power to access deeper sections. But the creature stirs...", mapW: 35, mapH: 30 },
  { name: "The Labs", desc: "Research logs reveal what happened here. The experiment gone wrong.", mapW: 40, mapH: 30 },
  { name: "Hunting Ground", desc: "It knows you're here. The creature is faster now. Run.", mapW: 40, mapH: 35 },
  { name: "Dead Signal", desc: "The source of the signal awaits. Your final choice will determine everything.", mapW: 45, mapH: 35 }
];

const ITEM_TYPES = {
  battery: { emoji: '🔋', name: 'Battery' },
  keycard_red: { emoji: '🔑', name: 'Red Keycard' },
  keycard_blue: { emoji: '🗝️', name: 'Blue Keycard' },
  keycard_green: { emoji: '🟢', name: 'Green Keycard' },
  medkit: { emoji: '💊', name: 'Medkit' },
  flare: { emoji: '🔥', name: 'Signal Flare' },
  document: { emoji: '📄', name: 'Document' },
  note: { emoji: '📝', name: 'Note' },
  fuse: { emoji: '🔌', name: 'Fuse' },
  code_document: { emoji: '📋', name: 'Code Doc' }
};

// Touch controls
let touchJoy = { active: false, id: null, sx: 0, sy: 0, dx: 0, dy: 0 };
let touchBtns = { interact: false, flashlight: false, item: false };

// Gamepad
let gpConnected = false;
window.addEventListener('gamepadconnected', () => gpConnected = true);
window.addEventListener('gamepaddisconnected', () => gpConnected = false);
function getGP() { return navigator.getGamepads ? navigator.getGamepads()[0] : null; }

// Achievements
const ACHIEVE_18 = {
  ghost: { name: 'Ghost', desc: 'Complete a chapter without being detected' },
  collector: { name: 'Collector', desc: 'Find all documents' },
  speedrun: { name: 'Speedrunner', desc: 'Complete a chapter in under 60 seconds' },
  noDeath: { name: 'Untouchable', desc: 'Complete all chapters without dying' }
};
let ach18Data = JSON.parse(localStorage.getItem('ngn4_ach_18') || '{}');
function unlock18(key, game) {
  if (ach18Data[key]) return;
  ach18Data[key] = true;
  localStorage.setItem('ngn4_ach_18', JSON.stringify(ach18Data));
  if (game) {
    game.addMessage('🏆 Achievement: ' + ACHIEVE_18[key].name);
    game.playTone(800, 0.2, 'sine', 0.12);
  }
}

// Screen effects
let screenShake = { x: 0, y: 0, intensity: 0 };
let glitchTimer = 0;

class DeadSignal {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.W = 800; this.H = 564;
    this.TILE = 32;
    this.camX = 0; this.camY = 0;
    this.state = 'menu';
    this.keys = {};
    this.audioCtx = null;
    this.flashlightOn = true;
    this.flashlightAngle = 0;
    this.flashlightCone = Math.PI / 4;
    this.flashlightRange = 200;
    this.player = { x: 2, y: 2, speed: 2.5 };
    this.inventory = [];
    this.maxInventory = 5;
    this.battery = 100;
    this.sanity = 100;
    this.creatures = [];
    this.creature = { x: 20, y: 15, speed: 1.5, state: 'patrol', patrolPath: [], patrolIdx: 0, alertTimer: 0, lastKnownX: 0, lastKnownY: 0, type: 'stalker' };
    this.fuseBoxes = [];
    this.combinationLocks = [];
    this.foundCodes = {};
    this.footstepNoise = 0;
    this.isRunning = false;
    this.chapterStartTime = 0;
    this.map = [];
    this.items = [];
    this.doors = [];
    this.hidingSpots = [];
    this.terminals = [];
    this.exitPos = { x: 28, y: 23 };
    this.currentChapter = 0;
    this.documentsFound = [];
    this.hiding = false;
    this.chaptersComplete = [];
    this.noDeaths = true;
    this.flickerTimer = 0;
    this.jumpScare = 0;
    this.messages = [];
    this.totalTime = 0;
    this.loadSave();
    this.setupInput();
    this.updateCoins();
    this.loop();
  }

  loadSave() {
    const s = JSON.parse(localStorage.getItem('ngn4_deadsignal') || '{}');
    this.chaptersComplete = s.chaptersComplete || [];
    this.documentsFound = s.documentsFound || [];
    this.currentChapter = s.currentChapter || 0;
    this.inventory = s.inventory || [];
    this.noDeaths = s.noDeaths !== false;
  }

  saveSave() {
    localStorage.setItem('ngn4_deadsignal', JSON.stringify({
      chaptersComplete: this.chaptersComplete,
      documentsFound: this.documentsFound,
      currentChapter: this.currentChapter,
      inventory: this.inventory,
      noDeaths: this.noDeaths
    }));
  }

  updateCoins() { const el = document.getElementById('menu-coins'); if (el) el.textContent = getCoins18(); }

  initAudio() { if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

  playTone(freq, dur, type='sine', vol=0.08) {
    this.initAudio();
    const o = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + dur);
    o.connect(g); g.connect(this.audioCtx.destination);
    o.start(); o.stop(this.audioCtx.currentTime + dur);
  }

  playAmbient() {
    if (Math.random() < 0.01) this.playTone(40 + Math.random() * 30, 2, 'sine', 0.03);
    if (Math.random() < 0.005) this.playTone(200 + Math.random() * 100, 0.1, 'sawtooth', 0.04);
  }

  playSfx(n) {
    switch(n) {
      case 'pickup': this.playTone(600, 0.15, 'sine', 0.08); break;
      case 'door': this.playTone(150, 0.3, 'sawtooth', 0.06); break;
      case 'hide': this.playTone(80, 0.5, 'sine', 0.05); break;
      case 'scream': this.playTone(100, 1, 'sawtooth', 0.2); this.playTone(300, 0.8, 'square', 0.15); break;
      case 'step': this.playTone(100+Math.random()*50, 0.05, 'triangle', 0.03); break;
      case 'chase': this.playTone(80, 0.3, 'sawtooth', 0.1); break;
    }
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  showMenu() { this.state = 'menu'; this.showScreen('menu-screen'); this.updateCoins(); }
  showHow() { this.showScreen('how-screen'); }

  setupInput() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (this.state !== 'playing') return;
      if (e.key.toLowerCase() === 'f') this.flashlightOn = !this.flashlightOn;
      if (e.key.toLowerCase() === 'e') this.interact();
      if (e.key === 'Tab') { e.preventDefault(); this.showInventory(); }
      if (e.key >= '1' && e.key <= '5') this.useItem(parseInt(e.key) - 1);
    });
    document.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
  }

  startGame() {
    this.currentChapter = 0;
    this.inventory = [];
    this.documentsFound = [];
    this.noDeaths = true;
    this.chaptersComplete = [];
    this.showChapterIntro(0);
  }

  continueGame() {
    if (this.chaptersComplete.length >= 5) {
      this.state = 'menu';
      alert('You have completed all chapters! Start a new game.');
      return;
    }
    this.showChapterIntro(this.currentChapter);
  }

  showChapterIntro(idx) {
    if (idx >= CHAPTERS.length) {
      this.showEnding();
      return;
    }
    this.currentChapter = idx;
    const ch = CHAPTERS[idx];
    document.getElementById('chapter-title').textContent = `Chapter ${idx + 1}: ${ch.name}`;
    document.getElementById('chapter-text').textContent = ch.desc;
    this.showScreen('chapter-intro');
  }

  startChapter() {
    this.generateMap(this.currentChapter);
    this.battery = 100;
    this.sanity = 100;
    this.hiding = false;
    this.jumpScare = 0;
    this.messages = [];
    this.flashlightOn = true;
    this.totalTime = 0;
    this.state = 'playing';
    this.showScreen('game-screen');
    this.updateHud();
    this.updateInventoryBar();
  }

  generateMap(chapter) {
    const ch = CHAPTERS[chapter];
    const w = ch.mapW, h = ch.mapH;
    this.mapW = w; this.mapH = h;
    this.map = [];

    // Generate rooms
    const rooms = [];
    for (let i = 0; i < 8 + chapter * 2; i++) {
      const rw = 4 + Math.floor(Math.random() * 5);
      const rh = 4 + Math.floor(Math.random() * 5);
      const rx = 1 + Math.floor(Math.random() * (w - rw - 2));
      const ry = 1 + Math.floor(Math.random() * (h - rh - 2));
      rooms.push({ x: rx, y: ry, w: rw, h: rh });
    }

    // Init map (all walls)
    for (let y = 0; y < h; y++) {
      this.map[y] = [];
      for (let x = 0; x < w; x++) this.map[y][x] = 1;
    }

    // Carve rooms
    rooms.forEach(r => {
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++)
          if (y > 0 && y < h-1 && x > 0 && x < w-1) this.map[y][x] = 0;
    });

    // Connect rooms with corridors
    for (let i = 0; i < rooms.length - 1; i++) {
      const a = rooms[i], b = rooms[i+1];
      const ax = Math.floor(a.x + a.w/2), ay = Math.floor(a.y + a.h/2);
      const bx = Math.floor(b.x + b.w/2), by = Math.floor(b.y + b.h/2);
      let cx = ax, cy = ay;
      while (cx !== bx) {
        if (cy >= 0 && cy < h && cx >= 0 && cx < w) this.map[cy][cx] = 0;
        cx += cx < bx ? 1 : -1;
      }
      while (cy !== by) {
        if (cy >= 0 && cy < h && cx >= 0 && cx < w) this.map[cy][cx] = 0;
        cy += cy < by ? 1 : -1;
      }
    }

    // Player start in first room
    this.player.x = rooms[0].x + 2;
    this.player.y = rooms[0].y + 2;

    // Exit in last room
    this.exitPos = { x: rooms[rooms.length-1].x + Math.floor(rooms[rooms.length-1].w/2),
                     y: rooms[rooms.length-1].y + Math.floor(rooms[rooms.length-1].h/2) };

    // Place items
    this.items = [];
    const placeItem = (type, roomFilter) => {
      const validRooms = roomFilter ? rooms.filter(roomFilter) : rooms;
      if (validRooms.length === 0) return;
      const r = validRooms[Math.floor(Math.random() * validRooms.length)];
      const ix = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
      const iy = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
      this.items.push({ x: ix, y: iy, type, picked: false });
    };

    // Batteries
    for (let i = 0; i < 3 + chapter; i++) placeItem('battery');
    // Keycards
    const keycardTypes = ['keycard_red', 'keycard_blue', 'keycard_green'];
    for (let i = 0; i < Math.min(chapter + 1, 3); i++) placeItem(keycardTypes[i]);
    // Medkits
    for (let i = 0; i < 2; i++) placeItem('medkit');
    // Flares
    if (chapter >= 1) placeItem('flare');
    // Documents
    for (let i = 0; i < 2 + chapter; i++) placeItem('document');

    // Doors
    this.doors = [];
    for (let i = 0; i < chapter + 1; i++) {
      const r = rooms[1 + Math.floor(Math.random() * (rooms.length - 2))];
      const dx = r.x;
      const dy = r.y + Math.floor(r.h / 2);
      if (dy > 0 && dy < h - 1 && this.map[dy][dx] === 0) {
        const keyType = keycardTypes[i % keycardTypes.length];
        this.doors.push({ x: dx, y: dy, locked: true, keyType });
        this.map[dy][dx] = 2; // door
      }
    }

    // Hiding spots
    this.hidingSpots = [];
    rooms.forEach(r => {
      if (Math.random() > 0.4) {
        this.hidingSpots.push({ x: r.x + 1, y: r.y + 1, occupied: false });
      }
    });

    // Creature setup - multiple creature types
    this.creatures = [];
    const cr = rooms[rooms.length - 2];
    this.creature = { x: cr.x + 2, y: cr.y + 2, speed: 1.2 + chapter * 0.3, state: 'patrol', alertTimer: 0, lastKnownX: 0, lastKnownY: 0, type: 'stalker', patrolPath: rooms.map(r => ({ x: r.x + Math.floor(r.w/2), y: r.y + Math.floor(r.h/2) })), patrolIdx: 0 };
    this.creatures.push(this.creature);
    // Add Stalker (fast, only in darkness)
    if (chapter >= 2) {
      const sr = rooms[rooms.length - 3];
      this.creatures.push({ x: sr.x + 2, y: sr.y + 2, speed: 2.0 + chapter * 0.2, state: 'patrol', alertTimer: 0, lastKnownX: 0, lastKnownY: 0, type: 'stalker', patrolPath: rooms.map(r => ({ x: r.x + Math.floor(r.w/2), y: r.y + Math.floor(r.h/2) })), patrolIdx: Math.floor(rooms.length / 3), color: '#660000' });
    }
    // Add Shadow (teleports when not observed)
    if (chapter >= 3) {
      const shr = rooms[Math.floor(rooms.length / 2)];
      this.creatures.push({ x: shr.x + 2, y: shr.y + 2, speed: 0.8, state: 'patrol', alertTimer: 0, lastKnownX: 0, lastKnownY: 0, type: 'shadow', patrolPath: rooms.map(r => ({ x: r.x + Math.floor(r.w/2), y: r.y + Math.floor(r.h/2) })), patrolIdx: Math.floor(rooms.length / 2), teleportCooldown: 0, color: '#330066' });
    }
    // Add Brute (slow, high damage, breaks doors)
    if (chapter >= 4) {
      const br = rooms[rooms.length - 4];
      this.creatures.push({ x: br.x + 2, y: br.y + 2, speed: 0.6 + chapter * 0.1, state: 'patrol', alertTimer: 0, lastKnownX: 0, lastKnownY: 0, type: 'brute', damage: 1, patrolPath: rooms.map(r => ({ x: r.x + Math.floor(r.w/2), y: r.y + Math.floor(r.h/2) })), patrolIdx: 0, color: '#663300', size: 18 });
    }

    // Fuse boxes (environmental puzzles)
    this.fuseBoxes = [];
    for (let i = 0; i < Math.min(chapter, 3); i++) {
      const fr = rooms[2 + i];
      if (fr) {
        this.fuseBoxes.push({ x: fr.x + 1, y: fr.y + 1, solved: false, powered: false, needsFuse: true });
      }
    }
    // Combination locks
    this.combinationLocks = [];
    if (chapter >= 1) {
      const code = '' + (1000 + Math.floor(Math.random() * 9000));
      const lr = rooms[3];
      if (lr) {
        this.combinationLocks.push({ x: lr.x + lr.w - 2, y: lr.y + Math.floor(lr.h / 2), code, solved: false, input: '' });
        this.foundCodes['lock_0'] = code;
      }
    }
    this.chapterStartTime = this.totalTime;
  }

  updatePlayer() {
    if (this.hiding) return;
    let dx = 0, dy = 0;
    if (this.keys['w']) dy = -1;
    if (this.keys['s']) dy = 1;
    if (this.keys['a']) dx = -1;
    if (this.keys['d']) dx = 1;
    // Touch joystick
    if (touchJoy.active) { dx += touchJoy.dx; dy += touchJoy.dy; }
    // Gamepad
    const gp = getGP();
    if (gp) {
      dx += (Math.abs(gp.axes[0]) > 0.15 ? gp.axes[0] : 0);
      dy += (Math.abs(gp.axes[1]) > 0.15 ? gp.axes[1] : 0);
      if (gp.buttons[0]?.pressed && !this._gpA) { this._gpA = true; this.interact(); }
      if (!gp.buttons[0]?.pressed) this._gpA = false;
      if (gp.buttons[2]?.pressed && !this._gpX) { this._gpX = true; this.flashlightOn = !this.flashlightOn; }
      if (!gp.buttons[2]?.pressed) this._gpX = false;
    }

    this.isRunning = dx !== 0 || dy !== 0;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      const nx = this.player.x + (dx / len) * this.player.speed * 0.1;
      const ny = this.player.y + (dy / len) * this.player.speed * 0.1;

      // Collision check
      const tx = Math.floor(nx), ty = Math.floor(ny);
      if (this.isWalkable(tx, ty)) {
        this.player.x = nx;
        this.player.y = ny;
        if (this.totalTime % 15 === 0) this.playSfx('step');
      }
    }

    // Footstep noise for stealth
    if (this.isRunning) this.footstepNoise = Math.min(200, this.footstepNoise + 2);
    else this.footstepNoise = Math.max(0, this.footstepNoise - 1);

    // Flashlight angle toward mouse or movement
    if (dx || dy) {
      this.flashlightAngle = Math.atan2(dy, dx);
    }

    // Battery drain
    if (this.flashlightOn) {
      this.battery -= 0.02;
      if (this.battery <= 0) {
        this.battery = 0;
        this.flashlightOn = false;
      }
    }

    // Sanity drain in dark
    if (!this.flashlightOn) this.sanity -= 0.01;

    // Sanity recovery near lights
    if (this.flashlightOn && this.sanity < 100) this.sanity += 0.005;

    // Item pickup
    this.items.forEach(item => {
      if (!item.picked && Math.floor(this.player.x) === item.x && Math.floor(this.player.y) === item.y) {
        if (this.inventory.length < this.maxInventory) {
          item.picked = true;
          this.inventory.push({ type: item.type });
          this.playSfx('pickup');
          this.addMessage(`Picked up ${ITEM_TYPES[item.type].name}`);
          if (item.type === 'document') {
            const titles = ["Log Entry #47","Lab Report","Crew Manifest","Emergency Protocol","Research Notes","Captain's Log","Distress Signal Log","Incident Report"];
            const docTitle = titles[Math.floor(Math.random() * titles.length)];
            this.documentsFound.push({ chapter: this.currentChapter, title: docTitle });
            this.addMessage(`Found document: "${docTitle}"`);
          }
          this.updateInventoryBar();
        } else {
          this.addMessage("Inventory full!");
        }
      }
    });

    // Exit check
    if (Math.floor(this.player.x) === this.exitPos.x && Math.floor(this.player.y) === this.exitPos.y) {
      this.completeChapter();
    }
  }

  isWalkable(x, y) {
    if (x < 0 || x >= this.mapW || y < 0 || y >= this.mapH) return false;
    if (this.map[y][x] === 1) return false;
    // Check doors
    for (let d of this.doors) {
      if (d.x === x && d.y === y && d.locked) return false;
    }
    return true;
  }

  interact() {
    const px = Math.floor(this.player.x), py = Math.floor(this.player.y);

    // Doors
    for (let d of this.doors) {
      if (Math.abs(d.x - px) <= 1 && Math.abs(d.y - py) <= 1 && d.locked) {
        const hasKey = this.inventory.some(i => i.type === d.keyType);
        if (hasKey) {
          d.locked = false;
          this.map[d.y][d.x] = 0;
          this.inventory = this.inventory.filter(i => i.type !== d.keyType);
          this.playSfx('door');
          this.addMessage(`Door unlocked with ${ITEM_TYPES[d.keyType].name}`);
          this.updateInventoryBar();
        } else {
          this.addMessage(`Need ${ITEM_TYPES[d.keyType].name}`);
        }
        return;
      }
    }

    // Hiding spots
    for (let h of this.hidingSpots) {
      if (Math.abs(h.x - px) <= 1 && Math.abs(h.y - py) <= 1) {
        if (this.hiding) {
          this.hiding = false;
          this.addMessage("Left hiding spot");
        } else {
          this.hiding = true;
          this.playSfx('hide');
          this.addMessage("Hiding...");
        }
        return;
      }
    }
  }

  useItem(idx) {
    if (idx >= this.inventory.length) return;
    const item = this.inventory[idx];
    switch (item.type) {
      case 'battery':
        this.battery = Math.min(100, this.battery + 40);
        this.flashlightOn = true;
        this.addMessage("Battery +40%");
        break;
      case 'medkit':
        this.sanity = Math.min(100, this.sanity + 30);
        this.addMessage("Sanity +30");
        break;
      case 'flare':
        this.flashlightRange = 350;
        this.addMessage("Flare active! Increased vision!");
        setTimeout(() => { this.flashlightRange = 200; }, 10000);
        break;
      default:
        this.addMessage(`Can't use ${ITEM_TYPES[item.type].name} here`);
        return;
    }
    this.inventory.splice(idx, 1);
    this.playSfx('pickup');
    this.updateInventoryBar();
  }

  // Line of sight raycast check
  hasLineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / 0.5);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = Math.floor(x1 + dx * t), cy = Math.floor(y1 + dy * t);
      if (cx >= 0 && cx < this.mapW && cy >= 0 && cy < this.mapH) {
        if (this.map[cy][cx] === 1) return false;
        for (const d of this.doors) {
          if (d.x === cx && d.y === cy && d.locked) return false;
        }
      }
    }
    return true;
  }

  updateCreature() {
    // Update all creatures
    for (const c of this.creatures) {
      const px = this.player.x, py = this.player.y;
      const dist = Math.hypot(c.x - px, c.y - py);
      const los = this.hasLineOfSight(c.x, c.y, px, py);
      let canSeePlayer = !this.hiding && dist < (this.flashlightOn ? 250 : 150) && los;

      // Stalker: only in darkness
      if (c.type === 'stalker' && this.flashlightOn) canSeePlayer = false;
      // Shadow: teleport when not observed
      if (c.type === 'shadow') {
        if (!los || this.hiding) {
          c.teleportCooldown = (c.teleportCooldown || 0) - 1;
          if (c.teleportCooldown <= 0) {
            c.x = px + (Math.random() - 0.5) * 10;
            c.y = py + (Math.random() - 0.5) * 10;
            c.teleportCooldown = 300;
          }
        } else {
          c.teleportCooldown = (c.teleportCooldown || 0);
        }
      }

      // Sound detection
      const soundDist = this.footstepNoise > 50 ? this.footstepNoise : 0;

    switch (c.state) {
      case 'patrol':
        if (canSeePlayer || dist < soundDist) {
          c.state = 'alert';
          c.alertTimer = 60;
          c.lastKnownX = px;
          c.lastKnownY = py;
          this.playSfx('chase');
          break;
        }
        // Move to patrol point
        const target = c.patrolPath[c.patrolIdx];
        if (target) {
          const dx = target.x - c.x;
          const dy = target.y - c.y;
          const d = Math.hypot(dx, dy);
          if (d < 1) {
            c.patrolIdx = (c.patrolIdx + 1) % c.patrolPath.length;
          } else {
            const nx = c.x + (dx / d) * c.speed * 0.3;
            const ny = c.y + (dy / d) * c.speed * 0.3;
            if (this.isWalkable(Math.floor(nx), Math.floor(ny))) {
              c.x = nx; c.y = ny;
            } else {
              c.patrolIdx = (c.patrolIdx + 1) % c.patrolPath.length;
            }
          }
        }
        break;

      case 'alert':
        c.alertTimer--;
        if (c.alertTimer <= 0) {
          c.state = canSeePlayer ? 'chase' : 'investigate';
          break;
        }
        break;

      case 'investigate':
        const iDist = Math.hypot(c.x - c.lastKnownX, c.y - c.lastKnownY);
        if (iDist < 2) {
          c.state = 'patrol';
          break;
        }
        if (canSeePlayer) {
          c.state = 'chase';
          this.playSfx('chase');
          break;
        }
        const idx2 = c.lastKnownX - c.x, idy2 = c.lastKnownY - c.y;
        const id = Math.hypot(idx2, idy2);
        if (id > 0) { c.x += (idx2 / id) * c.speed * 0.5; c.y += (idy2 / id) * c.speed * 0.5; }
        break;

      case 'chase':
        if (dist < 1) {
          // Caught!
          this.die("The creature caught you...");
          return;
        }
        if (this.hiding) {
          c.state = 'investigate';
          c.lastKnownX = px;
          c.lastKnownY = py;
          c.alertTimer = 120;
          break;
        }
        const cdx = px - c.x, cdy = py - c.y;
        const cd = Math.hypot(cdx, cdy);
        if (cd > 0) {
        const nx = c.x + (cdx / cd) * c.speed * 0.7;
        const ny = c.y + (cdy / cd) * c.speed * 0.7;
        if (this.isWalkable(Math.floor(nx), Math.floor(ny))) {
          c.x = nx; c.y = ny;
        }
        // Sanity drain when creature is close
        if (dist < 100) this.sanity -= 0.1;
        if (dist > 400) c.state = 'investigate';
        }
        break;
    }

    // Sanity effects
    if (this.sanity <= 0) {
      this.die("Your mind shattered in the darkness...");
    }
    }
  }

  die(msg) {
    this.state = 'death';
    this.noDeaths = false;
    this.jumpScare = 30;
    this.playSfx('scream');
    document.getElementById('death-msg').textContent = msg;
    this.saveSave();
    setTimeout(() => this.showScreen('death-screen'), 1500);
  }

  completeChapter() {
    this.state = 'chapter_complete';
    this.chaptersComplete.push(this.currentChapter);
    let coins = 100 + this.documentsFound.filter(d => d.chapter === this.currentChapter).length * 50;
    if (this.noDeaths) coins += 50;
    // Achievement checks
    const elapsed = this.totalTime - this.chapterStartTime;
    if (elapsed < 3600) { // ~60 seconds at 60fps
      try { unlock18('speedrun', this); } catch(e) {}
    }
    if (this.documentsFound.length >= 15) {
      try { unlock18('collector', this); } catch(e) {}
    }
    if (this.noDeaths && this.chaptersComplete.length >= 5) {
      try { unlock18('noDeath', this); } catch(e) {}
    }
    generateRewards18(coins);
    this.updateCoins();

    const docs = this.documentsFound.filter(d => d.chapter === this.currentChapter);
    document.getElementById('chapter-stats').innerHTML =
      `Documents found: ${docs.length}<br>Sanity remaining: ${Math.floor(this.sanity)}%<br>Battery remaining: ${Math.floor(this.battery)}%` +
      (this.noDeaths ? '<br><span style="color:#0f0">No-death bonus!</span>' : '');
    document.getElementById('chapter-reward').textContent = `+${coins} 🪙`;
    document.getElementById('next-ch-btn').style.display = this.currentChapter < 4 ? 'inline-block' : 'none';
    this.saveSave();
    this.showScreen('chapter-complete');
  }

  nextChapter() {
    if (this.currentChapter + 1 >= CHAPTERS.length) {
      this.showEnding();
    } else {
      this.showAd(() => this.showChapterIntro(this.currentChapter + 1));
    }
  }

  showEnding() {
    let title, text;
    if (this.noDeaths && this.documentsFound.length >= 10) {
      title = "TRUE ENDING: Signal Silenced";
      text = "You destroyed the source of the signal and escaped unharmed. The truth about the experiment is safe. The crew can finally rest.";
      generateRewards18(300);
    } else if (this.documentsFound.length >= 5) {
      title = "GOOD ENDING: The Truth";
      text = "You escaped with the research data. The world will know what happened here. But the creature still roams the station...";
      generateRewards18(200);
    } else {
      title = "BAD ENDING: Barely Alive";
      text = "You barely made it out alive. The station remains, the signal still broadcasting into the void. Some questions will never be answered.";
      generateRewards18(100);
    }
    this.updateCoins();
    document.getElementById('ending-title').textContent = title;
    document.getElementById('ending-text').textContent = text;
    document.getElementById('ending-reward').textContent = `ENDING BONUS AWARDED`;
    this.showScreen('ending-screen');
  }

  retryChapter() {
    this.showChapterIntro(this.currentChapter);
  }

  showInventory() {
    if (this.state !== 'playing') return;
    this.state = 'inventory';
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < this.maxInventory; i++) {
      const div = document.createElement('div');
      div.className = 'inv-item';
      if (this.inventory[i]) {
        div.innerHTML = `${ITEM_TYPES[this.inventory[i].type].emoji}<div class="iname">${ITEM_TYPES[this.inventory[i].type].name}</div>`;
      } else {
        div.style.opacity = '0.3';
        div.innerHTML = `<div class="iname">Empty</div>`;
      }
      grid.appendChild(div);
    }
    this.showScreen('inventory-screen');
    document.addEventListener('keydown', this._invHandler = (e) => {
      if (e.key === 'Tab' || e.key === 'Escape') {
        e.preventDefault();
        document.removeEventListener('keydown', this._invHandler);
        this.state = 'playing';
        this.showScreen('game-screen');
      }
    });
  }

  showAd(callback) {
    this.state = 'ad';
    this.showScreen('ad-screen');
    let t = 5;
    const el = document.getElementById('ad-timer-val');
    el.textContent = t;
    const iv = setInterval(() => {
      t--; el.textContent = t;
      if (t <= 0) { clearInterval(iv); this.state = 'ad_done'; }
    }, 1000);
    this._adCb = () => { clearInterval(iv); callback(); };
  }

  closeAd() { if (this.state === 'ad_done' && this._adCb) { this._adCb(); this._adCb = null; } }

  addMessage(msg) {
    this.messages.push({ text: msg, timer: 180 });
    if (this.messages.length > 4) this.messages.shift();
  }

  updateHud() {
    document.getElementById('hud-chapter').textContent = `Ch.${this.currentChapter + 1}: ${CHAPTERS[this.currentChapter].name}`;
    document.getElementById('hud-battery').textContent = `🔋 ${Math.floor(this.battery)}%`;
    document.getElementById('hud-sanity').textContent = `🧠 ${Math.floor(this.sanity)}%`;
    document.getElementById('hud-item').textContent = `📦 ${this.inventory.length}/${this.maxInventory}`;
  }

  updateInventoryBar() {
    const bar = document.getElementById('inventory-bar');
    bar.innerHTML = '';
    for (let i = 0; i < this.maxInventory; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot' + (this.inventory[i] ? ' has-item' : '');
      slot.innerHTML = `<span class="slot-key">${i + 1}</span>${this.inventory[i] ? ITEM_TYPES[this.inventory[i].type].emoji : ''}`;
      bar.appendChild(slot);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.W, this.H);

    // Camera
    this.camX = this.player.x * this.TILE - this.W / 2;
    this.camY = this.player.y * this.TILE - this.H / 2;

    // Draw map tiles
    const startTX = Math.floor(this.camX / this.TILE) - 1;
    const startTY = Math.floor(this.camY / this.TILE) - 1;
    const endTX = startTX + Math.ceil(this.W / this.TILE) + 2;
    const endTY = startTY + Math.ceil(this.H / this.TILE) + 2;

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        if (tx < 0 || tx >= this.mapW || ty < 0 || ty >= this.mapH) continue;
        const sx = tx * this.TILE - this.camX;
        const sy = ty * this.TILE - this.camY;
        if (this.map[ty][tx] === 1) {
          ctx.fillStyle = '#1a1a2a';
          ctx.fillRect(sx, sy, this.TILE, this.TILE);
          ctx.strokeStyle = '#222244';
          ctx.strokeRect(sx, sy, this.TILE, this.TILE);
        } else if (this.map[ty][tx] === 2) {
          ctx.fillStyle = '#553300';
          ctx.fillRect(sx, sy, this.TILE, this.TILE);
          ctx.strokeStyle = '#884400';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx + 2, sy + 2, this.TILE - 4, this.TILE - 4);
          ctx.lineWidth = 1;
        } else {
          ctx.fillStyle = '#0a0a12';
          ctx.fillRect(sx, sy, this.TILE, this.TILE);
        }
      }
    }

    // Hiding spots
    this.hidingSpots.forEach(h => {
      const sx = h.x * this.TILE - this.camX;
      const sy = h.y * this.TILE - this.camY;
      ctx.fillStyle = 'rgba(100, 100, 150, 0.3)';
      ctx.fillRect(sx + 4, sy + 4, this.TILE - 8, this.TILE - 8);
      ctx.strokeStyle = '#446';
      ctx.strokeRect(sx + 4, sy + 4, this.TILE - 8, this.TILE - 8);
      ctx.fillStyle = '#668';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HIDE', sx + this.TILE/2, sy + this.TILE/2 + 3);
    });

    // Items
    this.items.forEach(item => {
      if (item.picked) return;
      const sx = item.x * this.TILE - this.camX + this.TILE/2;
      const sy = item.y * this.TILE - this.camY + this.TILE/2;
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.fillText(ITEM_TYPES[item.type].emoji, sx, sy + 6);
    });

    // Exit
    const exSx = this.exitPos.x * this.TILE - this.camX;
    const exSy = this.exitPos.y * this.TILE - this.camY;
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.fillRect(exSx, exSy, this.TILE, this.TILE);
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(exSx + 2, exSy + 2, this.TILE - 4, this.TILE - 4);
    ctx.lineWidth = 1;
    ctx.fillStyle = '#0f0';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', exSx + this.TILE/2, exSy + this.TILE/2 + 4);

    // Creature
    const c = this.creature;
    const csx = c.x * this.TILE - this.camX;
    const csy = c.y * this.TILE - this.camY;
    if (c.state === 'chase') {
      ctx.fillStyle = `rgba(255, 0, 0, ${0.5 + Math.random() * 0.3})`;
    } else {
      ctx.fillStyle = 'rgba(150, 0, 0, 0.6)';
    }
    ctx.beginPath();
    ctx.arc(csx + this.TILE/2, csy + this.TILE/2, this.TILE/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f00';
    ctx.beginPath();
    ctx.arc(csx + this.TILE/2 - 4, csy + this.TILE/2 - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(csx + this.TILE/2 + 4, csy + this.TILE/2 - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Player
    const psx = this.player.x * this.TILE - this.camX;
    const psy = this.player.y * this.TILE - this.camY;
    ctx.fillStyle = this.hiding ? '#446' : '#0ff';
    ctx.beginPath();
    ctx.arc(psx + this.TILE/2, psy + this.TILE/2, this.TILE/2 - 4, 0, Math.PI * 2);
    ctx.fill();

    // Flashlight cone
    if (this.flashlightOn) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      const plx = psx + this.TILE/2;
      const ply = psy + this.TILE/2;
      const ambientR = 40;

      // Ambient visibility circle
      const ambGrad = ctx.createRadialGradient(plx, ply, 0, plx, ply, ambientR);
      ambGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
      ambGrad.addColorStop(1, 'rgba(255,255,255,0.3)');
      ctx.fillStyle = ambGrad;
      ctx.fillRect(0, 0, this.W, this.H);

      // Flashlight cone
      ctx.beginPath();
      ctx.moveTo(plx, ply);
      ctx.arc(plx, ply, this.flashlightRange, this.flashlightAngle - this.flashlightCone/2, this.flashlightAngle + this.flashlightCone/2);
      ctx.closePath();
      const flGrad = ctx.createRadialGradient(plx, ply, 0, plx, ply, this.flashlightRange);
      flGrad.addColorStop(0, 'rgba(255,255,255,1)');
      flGrad.addColorStop(0.7, 'rgba(255,255,255,0.6)');
      flGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = flGrad;
      ctx.fill();
      ctx.restore();

      // Flicker effect when battery low
      if (this.battery < 20 && Math.random() < 0.1) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.5})`;
        ctx.fillRect(0, 0, this.W, this.H);
      }
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      const plx = psx + this.TILE/2;
      const ply = psy + this.TILE/2;
      const darkGrad = ctx.createRadialGradient(plx, ply, 0, plx, ply, 50);
      darkGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
      darkGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = darkGrad;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    }

    // Darkness overlay for atmosphere
    ctx.fillStyle = `rgba(0, 0, 10, 0.3)`;
    ctx.fillRect(0, 0, this.W, this.H);

    // Sanity visual effects
    if (this.sanity < 50) {
      ctx.strokeStyle = `rgba(255, 0, 0, ${(50 - this.sanity) / 200})`;
      ctx.lineWidth = 20;
      ctx.strokeRect(0, 0, this.W, this.H);
      ctx.lineWidth = 1;
    }
    // Glitch effect when sanity low
    if (this.sanity < 30) {
      glitchTimer++;
      if (glitchTimer % 60 < 5) {
        ctx.fillStyle = `rgba(255, 0, 255, ${Math.random() * 0.15})`;
        ctx.fillRect(Math.random() * this.W, Math.random() * this.H, Math.random() * 200, Math.random() * 50);
      }
      // Hallucination shadows
      if (Math.random() < 0.02) {
        ctx.fillStyle = 'rgba(80, 0, 0, 0.3)';
        const hx = Math.random() * this.W, hy = Math.random() * this.H;
        ctx.beginPath(); ctx.arc(hx, hy, 15 + Math.random() * 20, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Screen shake
    if (screenShake.intensity > 0) {
      screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
      screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
      screenShake.intensity *= 0.9;
      if (screenShake.intensity < 0.5) screenShake.intensity = 0;
      ctx.save();
      ctx.translate(screenShake.x, screenShake.y);
    }
    // Fuse boxes
    this.fuseBoxes.forEach(fb => {
      const sx = fb.x * this.TILE - this.camX;
      const sy = fb.y * this.TILE - this.camY;
      ctx.fillStyle = fb.solved ? '#0a3a0a' : '#3a3a0a';
      ctx.fillRect(sx + 4, sy + 4, this.TILE - 8, this.TILE - 8);
      ctx.strokeStyle = fb.solved ? '#0f0' : '#aa0';
      ctx.strokeRect(sx + 4, sy + 4, this.TILE - 8, this.TILE - 8);
      ctx.fillStyle = '#ff0'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(fb.solved ? 'ON' : 'FUSE', sx + this.TILE/2, sy + this.TILE/2 + 3);
    });
    // Combination locks
    this.combinationLocks.forEach(cl => {
      const sx = cl.x * this.TILE - this.camX;
      const sy = cl.y * this.TILE - this.camY;
      ctx.fillStyle = cl.solved ? '#0a0a3a' : '#3a0a0a';
      ctx.fillRect(sx + 2, sy + 2, this.TILE - 4, this.TILE - 4);
      ctx.strokeStyle = cl.solved ? '#66f' : '#f66';
      ctx.strokeRect(sx + 2, sy + 2, this.TILE - 4, this.TILE - 4);
      ctx.fillStyle = '#fff'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(cl.solved ? 'OPEN' : 'LOCK', sx + this.TILE/2, sy + this.TILE/2 + 3);
    });

    // Multiple creatures rendering
    for (let ci = 1; ci < this.creatures.length; ci++) {
      const cr = this.creatures[ci];
      const csx = cr.x * this.TILE - this.camX;
      const csy = cr.y * this.TILE - this.camY;
      const sz = cr.size || this.TILE/2 - 2;
      ctx.fillStyle = cr.color || (cr.state === 'chase' ? `rgba(255,0,0,${0.5+Math.random()*0.3})` : 'rgba(150,0,0,0.6)');
      ctx.beginPath(); ctx.arc(csx + this.TILE/2, csy + this.TILE/2, sz, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cr.type === 'shadow' ? '#a0f' : '#f00';
      ctx.font = '8px monospace'; ctx.textAlign = 'center';
      ctx.fillText(cr.type === 'stalker' ? 'STK' : cr.type === 'shadow' ? 'SHD' : 'BRT', csx + this.TILE/2, csy + this.TILE/2 + 3);
    }

    // Touch controls overlay
    if ('ontouchstart' in window) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath(); ctx.arc(60, this.H - 60, 40, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(60, this.H - 60, 40, 0, Math.PI * 2); ctx.stroke();
      if (touchJoy.active) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(60 + touchJoy.dx * 25, this.H - 60 + touchJoy.dy * 25, 15, 0, Math.PI * 2); ctx.fill();
      }
      const tbs = [
        { l: 'E', x: this.W - 50, y: this.H - 120, c: '#0ff' },
        { l: 'F', x: this.W - 50, y: this.H - 60, c: '#ff0' }
      ];
      tbs.forEach(b => {
        ctx.fillStyle = b.c + '44'; ctx.beginPath(); ctx.arc(b.x, b.y, 20, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = b.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, 20, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText(b.l, b.x, b.y + 4);
      });
    }
    if (screenShake.intensity > 0) ctx.restore();

    // Jump scare
    if (this.jumpScare > 0) {
      this.jumpScare--;
      ctx.fillStyle = `rgba(255, 0, 0, ${this.jumpScare / 30 * 0.7})`;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = '#f00';
      ctx.font = '80px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💀', this.W/2, this.H/2 + 30);
    }

    // Messages
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    this.messages.forEach((m, i) => {
      m.timer--;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(m.timer / 60, 1)})`;
      ctx.fillText(m.text, 10, this.H - 40 - i * 18);
    });
    this.messages = this.messages.filter(m => m.timer > 0);

    // Hiding indicator
    if (this.hiding) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = '#888';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[ HIDING - Press E to leave ]', this.W/2, this.H/2);
    }

    // Achievement notification
    const achKeys = Object.keys(ACHIEVE_18);
    const achDone = achKeys.filter(k => ach18Data[k]);
    if (achDone.length > 0) {
      ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffcc00';
      ctx.fillText('🏆 ' + achDone.length + '/' + achKeys.length + ' Achievements', 10, 15);
    }
  }

  loop() {
    if (this.state === 'playing') {
      this.totalTime++;
      this.updatePlayer();
      this.updateCreature();
      this.updateHud();
      this.playAmbient();
      this.render();
    } else if (this.state === 'death') {
      this.render();
    }
    requestAnimationFrame(() => this.loop());
  }
}

const game = new DeadSignal();

// Touch handlers for Dead Signal
const dsCanvas = document.getElementById('gameCanvas');
dsCanvas.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const r = dsCanvas.getBoundingClientRect();
    const x = t.clientX - r.left, y = t.clientY - r.top;
    if (x < 120 && y > game.H - 120) {
      touchJoy.active = true; touchJoy.id = t.identifier; touchJoy.sx = x; touchJoy.sy = y;
    } else if (x > game.W - 80) {
      if (y < game.H - 80) { touchBtns.interact = true; setTimeout(() => { touchBtns.interact = false; game.interact(); }, 100); }
      else { touchBtns.flashlight = true; setTimeout(() => { touchBtns.flashlight = false; game.flashlightOn = !game.flashlightOn; }, 100); }
    }
  }
}, { passive: false });
dsCanvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === touchJoy.id) {
      const r = dsCanvas.getBoundingClientRect();
      const x = t.clientX - r.left, y = t.clientY - r.top;
      let dx = (x - touchJoy.sx) / 40, dy = (y - touchJoy.sy) / 40;
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      touchJoy.dx = dx; touchJoy.dy = dy;
    }
  }
}, { passive: false });
dsCanvas.addEventListener('touchend', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === touchJoy.id) { touchJoy.active = false; touchJoy.dx = 0; touchJoy.dy = 0; }
  }
});
