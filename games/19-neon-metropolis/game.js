// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('neon-metropolis'); } catch(e) {}

function generateRewards19(amt) {
  let r = JSON.parse(localStorage.getItem('ngn4_rewards') || '{}');
  r.coins = (r.coins || 0) + amt;
  r.total = (r.total || 0) + amt;
  r.games19 = (r.games19 || 0) + 1;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
}

function getCoins19() { return (JSON.parse(localStorage.getItem('ngn4_rewards') || '{}').coins || 0); }

const BUILDINGS = [
  { id: 'residential', name: 'Residential', emoji: '🏠', cost: 100, pop: 10, power: -2, happy: 0, income: 0, desc: 'Houses citizens' },
  { id: 'commercial', name: 'Commercial', emoji: '🏪', cost: 200, pop: 0, power: -3, happy: 2, income: 15, desc: 'Earns credits' },
  { id: 'industrial', name: 'Industrial', emoji: '🏭', cost: 300, pop: 0, power: -5, happy: -3, income: 25, desc: 'High income' },
  { id: 'power', name: 'Power Plant', emoji: '⚡', cost: 400, pop: 0, power: 20, happy: -2, income: 0, desc: 'Generates power' },
  { id: 'solar', name: 'Solar Array', emoji: '☀️', cost: 500, pop: 0, power: 10, happy: 0, income: 0, desc: 'Clean energy' },
  { id: 'police', name: 'Police Station', emoji: '🚔', cost: 350, pop: 0, power: -2, happy: 5, income: -5, desc: 'Reduces crime' },
  { id: 'hospital', name: 'Hospital', emoji: '🏥', cost: 500, pop: 0, power: -4, happy: 8, income: -10, desc: 'Healthcare' },
  { id: 'school', name: 'School', emoji: '🎓', cost: 300, pop: 0, power: -2, happy: 5, income: -5, desc: 'Education' },
  { id: 'park', name: 'Park', emoji: '🌳', cost: 150, pop: 0, power: 0, happy: 4, income: -2, desc: 'Recreation' },
  { id: 'road', name: 'Road', emoji: '🛤️', cost: 20, pop: 0, power: 0, happy: 0, income: 0, desc: 'Infrastructure' },
  { id: 'fire', name: 'Fire Station', emoji: '🚒', cost: 350, pop: 0, power: -2, happy: 3, income: -5, desc: 'Fire safety' },
  { id: 'stadium', name: 'Stadium', emoji: '🏟️', cost: 1000, pop: 0, power: -8, happy: 12, income: 30, desc: 'Entertainment' },
  { id: 'mall', name: 'Mall', emoji: '🏬', cost: 800, pop: 0, power: -5, happy: 6, income: 40, desc: 'Shopping center' },
  { id: 'apartment', name: 'Apartments', emoji: '🏢', cost: 400, pop: 30, power: -4, happy: -1, income: 0, desc: 'Dense housing' },
  { id: 'lab', name: 'Research Lab', emoji: '🔬', cost: 700, pop: 0, power: -6, happy: 3, income: -15, desc: 'Boosts all' },
];

const ZONES = [
  { id: 'zone_residential', name: 'R Zone', emoji: '🟢', color: '#00ff4420' },
  { id: 'zone_commercial', name: 'C Zone', emoji: '🔵', color: '#4488ff20' },
  { id: 'zone_industrial', name: 'I Zone', emoji: '🟠', color: '#ff884420' },
];

const EVENTS = [
  { title: '🚨 Crime Wave!', text: 'Crime is on the rise in the city!', options: [
    { text: 'Hire more police (-200💰)', effect: (g) => { g.credits -= 200; g.happiness += 5; } },
    { text: 'Ignore it', effect: (g) => { g.happiness -= 15; } }
  ]},
  { title: '🎉 Festival!', text: 'Citizens want to celebrate!', options: [
    { text: 'Fund the festival (-150💰)', effect: (g) => { g.credits -= 150; g.happiness += 20; } },
    { text: 'Too expensive', effect: (g) => { g.happiness -= 5; } }
  ]},
  { title: '🌪️ Storm!', text: 'A severe storm is approaching!', options: [
    { text: 'Evacuate (-300💰)', effect: (g) => { g.credits -= 300; } },
    { text: 'Shelter in place', effect: (g) => { g.happiness -= 10; g.population -= Math.floor(g.population * 0.05); } }
  ]},
  { title: '📈 Economic Boom!', text: 'The economy is thriving!', options: [
    { text: 'Invest in growth', effect: (g) => { g.credits += 300; } },
    { text: 'Save for later', effect: (g) => { g.credits += 150; } }
  ]},
  { title: '💀 Pandemic!', text: 'A disease is spreading!', options: [
    { text: 'Build hospital (-500💰)', effect: (g) => { g.credits -= 500; g.happiness += 5; } },
    { text: 'Quarantine', effect: (g) => { g.happiness -= 20; g.population -= Math.floor(g.population * 0.1); } }
  ]},
  { title: '🌟 Tourism Surge!', text: 'Tourists are flocking to the city!', options: [
    { text: 'Welcome them (+200💰)', effect: (g) => { g.credits += 200; g.happiness += 5; } },
    { text: 'Limit visitors', effect: (g) => { g.credits += 50; } }
  ]},
  { title: '⚡ Power Outage!', text: 'The grid is failing!', options: [
    { text: 'Emergency repair (-250💰)', effect: (g) => { g.credits -= 250; } },
    { text: 'Let it resolve', effect: (g) => { g.happiness -= 15; } }
  ]},
  { title: '🏗️ Construction Boom!', text: 'Builders offer discounts!', options: [
    { text: 'Accept discount', effect: (g) => { g.buildDiscount = 0.8; g.discountDays = 5; } },
    { text: 'Decline', effect: () => {} }
  ]},
  { title: '🔥 FIRE OUTBREAK!', text: 'A fire is spreading through the city!', options: [
    { text: 'Deploy fire teams (-400💰)', effect: (g) => { g.credits -= 400; } },
    { text: 'Let it burn', effect: (g) => { g.triggerDisaster('fire'); } }
  ]},
  { title: '🌋 EARTHQUAKE!', text: 'An earthquake shakes the city!', options: [
    { text: 'Emergency repairs (-500💰)', effect: (g) => { g.credits -= 500; } },
    { text: 'Assess damage', effect: (g) => { g.triggerDisaster('earthquake'); } }
  ]},
  { title: '👽 ALIEN INVASION!', text: 'Aliens are destroying buildings!', options: [
    { text: 'Fight back! (-600💰)', effect: (g) => { g.credits -= 600; g.happiness -= 5; } },
    { text: 'Surrender', effect: (g) => { g.triggerDisaster('alien'); } }
  ]},
];

const ACHIEVEMENTS_DEF = [
  { id: 'pop_1000', name: 'Population 1000', desc: 'Reach 1000 population', check: (g) => g.population >= 1000 },
  { id: 'income_10k', name: 'Income 10K/day', desc: 'Earn 10,000 credits per day', check: (g) => g.incomePerDay >= 10000 },
  { id: 'happy_90', name: 'Happiness 90%+', desc: 'Reach 90% happiness', check: (g) => g.happiness >= 90 },
  { id: 'mega_city', name: 'Mega City', desc: 'Place all building types', check: (g) => {
    const types = new Set(g.buildings.map(b => b.type));
    return BUILDINGS.every(b => types.has(b.id));
  }},
  { id: 'city_100', name: 'Day 100', desc: 'Reach day 100', check: (g) => g.day >= 100 },
  { id: 'credits_50k', name: 'Wealthy Mayor', desc: 'Have 50,000 credits', check: (g) => g.credits >= 50000 },
  { id: 'build_100', name: 'Builder', desc: 'Place 100 buildings', check: (g) => g.buildings.length >= 100 },
  { id: 'survive_fire', name: 'Fireproof', desc: 'Survive a fire disaster', check: (g) => g.disastersSurvived >= 1 },
  { id: 'survive_quake', name: 'Earthquake Resistant', desc: 'Survive an earthquake', check: (g) => g.disastersSurvived >= 2 },
];

class NeonMetropolis {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.CW = 640; this.CH = 480;
    this.canvas.width = this.CW;
    this.canvas.height = this.CH;
    this.TILE = 24;
    this.GRID_W = 40;
    this.GRID_H = 30;
    this.state = 'menu';
    this.selectedBuilding = null;
    this.selectedZone = null;
    this.demolishMode = false;
    this.camX = 0; this.camY = 0;
    this.zoom = 1.0;
    this.day = 1;
    this.taxTimer = 0;
    this.audioCtx = null;
    this.hoverTile = null;

    // Camera drag state
    this.isDragging = false;
    this.dragStartX = 0; this.dragStartY = 0;
    this.dragCamStartX = 0; this.dragCamStartY = 0;
    this.lastMouseX = 0; this.lastMouseY = 0;
    this.didDrag = false;
    this.mouseDownPos = null;

    // Pinch zoom state
    this.lastPinchDist = 0;

    // Citizens
    this.citizens = [];

    // Achievements
    this.achievements = new Set();
    this.disastersSurvived = 0;

    // Gamepad
    this.gamepadConnected = false;
    this.gamepadPrevButtons = [];

    // Disaster fire state
    this.fireCells = [];
    this.fireTimer = 0;

    this.milestones = [
      { pop: 50, title: 'Village Established!', reward: 50, achieved: false },
      { pop: 100, title: 'Growing Town!', reward: 100, achieved: false },
      { pop: 250, title: 'Bustling Borough!', reward: 200, achieved: false },
      { pop: 500, title: 'Thriving City!', reward: 500, achieved: false },
      { pop: 1000, title: 'Neon Metropolis!', reward: 1000, achieved: false },
    ];
    this.updateCoins();
    this.setupInput();
    this.setupGamepad();
    this.loop();
  }

  updateCoins() { const el = document.getElementById('menu-coins'); if (el) el.textContent = getCoins19(); }

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

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  showMenu() { this.state = 'menu'; this.showScreen('menu-screen'); this.updateCoins(); }
  showHow() { this.showScreen('how-screen'); }

  initGame() {
    this.grid = [];
    this.zones = [];
    for (let y = 0; y < this.GRID_H; y++) {
      this.grid[y] = [];
      this.zones[y] = [];
      for (let x = 0; x < this.GRID_W; x++) {
        this.grid[y][x] = null;
        this.zones[y][x] = null;
      }
    }
    this.credits = 5000;
    this.population = 0;
    this.powerUsed = 0;
    this.powerCap = 0;
    this.incomePerDay = 0;
    this.happiness = 50;
    this.day = 1;
    this.taxTimer = 0;
    this.buildings = [];
    this.buildDiscount = 1;
    this.discountDays = 0;
    this.totalIncome = 0;
    this.totalSpent = 0;
    this.selectedBuilding = null;
    this.selectedZone = null;
    this.demolishMode = false;
    this.citizens = [];
    this.achievements = new Set();
    this.disastersSurvived = 0;
    this.fireCells = [];
    this.fireTimer = 0;
    this.milestones.forEach(m => m.achieved = false);
    this.camX = 0; this.camY = 0;
    this.zoom = 1.0;
    this.state = 'playing';
    this.buildPanel();
    this.showScreen('game-screen');
    this.updateHud();
    this.spawnCitizens();
  }

  newGame() { this.initGame(); }

  continueGame() {
    const s = JSON.parse(localStorage.getItem('ngn4_metropolis') || 'null');
    if (!s) { this.initGame(); return; }
    this.grid = s.grid;
    this.zones = s.zones || [];
    if (!this.zones.length) {
      this.zones = [];
      for (let y = 0; y < this.GRID_H; y++) { this.zones[y] = []; for (let x = 0; x < this.GRID_W; x++) this.zones[y][x] = null; }
    }
    this.credits = s.credits;
    this.population = s.population;
    this.happiness = s.happiness;
    this.day = s.day;
    this.buildings = s.buildings;
    this.buildDiscount = s.buildDiscount || 1;
    this.discountDays = s.discountDays || 0;
    this.totalIncome = s.totalIncome || 0;
    this.totalSpent = s.totalSpent || 0;
    this.milestones = s.milestones || this.milestones;
    this.achievements = new Set(s.achievements || []);
    this.disastersSurvived = s.disastersSurvived || 0;
    this.citizens = [];
    this.fireCells = [];
    this.fireTimer = 0;
    this.camX = s.camX || 0; this.camY = s.camY || 0;
    this.zoom = s.zoom || 1.0;
    this.state = 'playing';
    this.buildPanel();
    this.showScreen('game-screen');
    this.recalcResources();
    this.updateHud();
    this.spawnCitizens();
  }

  saveGame() {
    localStorage.setItem('ngn4_metropolis', JSON.stringify({
      grid: this.grid, zones: this.zones, credits: this.credits, population: this.population,
      happiness: this.happiness, day: this.day, buildings: this.buildings,
      buildDiscount: this.buildDiscount, discountDays: this.discountDays,
      totalIncome: this.totalIncome, totalSpent: this.totalSpent,
      milestones: this.milestones, achievements: [...this.achievements],
      disastersSurvived: this.disastersSurvived, camX: this.camX, camY: this.camY, zoom: this.zoom
    }));
  }

  buildPanel() {
    const panel = document.getElementById('build-panel');
    panel.innerHTML = '<div style="color:#f0f;font-size:12px;padding:4px;text-align:center;">BUILD PANEL</div>';

    // Zone buttons
    ZONES.forEach(z => {
      const btn = document.createElement('button');
      btn.className = 'build-btn zone-btn';
      btn.dataset.id = z.id;
      btn.innerHTML = `<span class="emoji">${z.emoji}</span><span>${z.name}</span>`;
      btn.onclick = () => {
        document.querySelectorAll('.build-btn').forEach(x => x.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedZone = z;
        this.selectedBuilding = null;
        this.demolishMode = false;
      };
      panel.appendChild(btn);
    });

    BUILDINGS.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'build-btn';
      btn.dataset.id = b.id;
      const cost = Math.floor(b.cost * this.buildDiscount);
      btn.innerHTML = `<span class="emoji">${b.emoji}</span><span>${b.name}</span><span class="cost">${cost}</span>`;
      btn.title = b.desc;
      btn.onclick = () => {
        document.querySelectorAll('.build-btn').forEach(x => x.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedBuilding = b;
        this.selectedZone = null;
        this.demolishMode = false;
      };
      panel.appendChild(btn);
    });

    // Demolish button
    const demoBtn = document.createElement('button');
    demoBtn.className = 'build-btn';
    demoBtn.style.borderColor = '#f44';
    demoBtn.style.color = '#f44';
    demoBtn.innerHTML = `<span class="emoji">💥</span><span>Demolish</span>`;
    demoBtn.onclick = () => {
      document.querySelectorAll('.build-btn').forEach(x => x.classList.remove('selected'));
      demoBtn.classList.add('selected');
      this.demolishMode = true;
      this.selectedBuilding = null;
      this.selectedZone = null;
    };
    panel.appendChild(demoBtn);

    // Stats button
    const statsBtn = document.createElement('button');
    statsBtn.className = 'build-btn';
    statsBtn.innerHTML = `<span class="emoji">📊</span><span>Statistics</span>`;
    statsBtn.onclick = () => this.showStats();
    panel.appendChild(statsBtn);
  }

  // ===== CAMERA PAN/ZOOM =====
  setupInput() {
    const canvas = this.canvas;

    // Mouse move - track hover and camera drag
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;
      const mx = canvasX / this.zoom + this.camX;
      const my = canvasY / this.zoom + this.camY;
      this.hoverTile = { x: Math.floor(mx / this.TILE), y: Math.floor(my / this.TILE) };

      if (this.isDragging && this.mouseDownPos) {
        const dx = e.clientX - this.mouseDownPos.x;
        const dy = e.clientY - this.mouseDownPos.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          this.didDrag = true;
        }
        // Pan camera
        this.camX = this.dragCamStartX - (e.clientX - this.dragStartX) / this.zoom;
        this.camY = this.dragCamStartY - (e.clientY - this.dragStartY) / this.zoom;
        this.clampCamera();
      }
    });

    // Mouse down
    canvas.addEventListener('mousedown', (e) => {
      if (this.state !== 'playing') return;
      this.isDragging = true;
      this.didDrag = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragCamStartX = this.camX;
      this.dragCamStartY = this.camY;
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
    });

    // Mouse up - place if didn't drag
    canvas.addEventListener('mouseup', (e) => {
      if (this.state !== 'playing') { this.isDragging = false; return; }
      this.isDragging = false;
      if (!this.didDrag && this.hoverTile) {
        this.handleClick(this.hoverTile.x, this.hoverTile.y);
      }
      this.mouseDownPos = null;
    });

    // Scroll wheel zoom
    canvas.addEventListener('wheel', (e) => {
      if (this.state !== 'playing') return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;
      const worldX = canvasX / this.zoom + this.camX;
      const worldY = canvasY / this.zoom + this.camY;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(0.4, Math.min(3.0, this.zoom * delta));

      // Zoom toward cursor
      this.camX = worldX - canvasX / this.zoom;
      this.camY = worldY - canvasY / this.zoom;
      this.clampCamera();
    }, { passive: false });

    // Touch events
    let touches = [];
    let lastTapTime = 0;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.state !== 'playing') return;
      touches = [...e.touches];

      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.isDragging = true;
        this.didDrag = false;
        this.dragStartX = t.clientX;
        this.dragStartY = t.clientY;
        this.dragCamStartX = this.camX;
        this.dragCamStartY = this.camY;
        this.mouseDownPos = { x: t.clientX, y: t.clientY };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = (t.clientX - rect.left) * scaleX;
        const canvasY = (t.clientY - rect.top) * scaleY;
        const mx = canvasX / this.zoom + this.camX;
        const my = canvasY / this.zoom + this.camY;
        this.hoverTile = { x: Math.floor(mx / this.TILE), y: Math.floor(my / this.TILE) };

        // Double tap
        const now = Date.now();
        if (now - lastTapTime < 300) {
          // Double tap - upgrade building
          if (this.hoverTile && this.grid[this.hoverTile.y]?.[this.hoverTile.x]) {
            this.hoverTile = { x: this.hoverTile.x, y: this.hoverTile.y };
            this.upgradeBuilding();
          }
        }
        lastTapTime = now;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        this.lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        this.dragStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        this.dragStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        this.dragCamStartX = this.camX;
        this.dragCamStartY = this.camY;
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.state !== 'playing') return;

      if (e.touches.length === 1 && this.isDragging) {
        const t = e.touches[0];
        const dx = t.clientX - this.dragStartX;
        const dy = t.clientY - this.dragStartY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) this.didDrag = true;

        this.camX = this.dragCamStartX - dx / this.zoom;
        this.camY = this.dragCamStartY - dy / this.zoom;
        this.clampCamera();

        // Update hover
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = (t.clientX - rect.left) * scaleX;
        const canvasY = (t.clientY - rect.top) * scaleY;
        const mx = canvasX / this.zoom + this.camX;
        const my = canvasY / this.zoom + this.camY;
        this.hoverTile = { x: Math.floor(mx / this.TILE), y: Math.floor(my / this.TILE) };
      } else if (e.touches.length === 2) {
        // Pinch zoom
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        if (this.lastPinchDist > 0) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const canvasX = (centerX - rect.left) * scaleX;
          const canvasY = (centerY - rect.top) * scaleY;
          const worldX = canvasX / this.zoom + this.camX;
          const worldY = canvasY / this.zoom + this.camY;

          this.zoom = Math.max(0.4, Math.min(3.0, this.zoom * (dist / this.lastPinchDist)));

          this.camX = worldX - canvasX / this.zoom;
          this.camY = worldY - canvasY / this.zoom;
          this.clampCamera();
        }
        this.lastPinchDist = dist;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        if (!this.didDrag && this.hoverTile) {
          this.handleClick(this.hoverTile.x, this.hoverTile.y);
        }
        this.isDragging = false;
        this.lastPinchDist = 0;
        this.mouseDownPos = null;
      } else if (e.touches.length === 1) {
        this.lastPinchDist = 0;
      }
    }, { passive: false });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (this.state !== 'playing') return;
      if (e.key === 'd' || e.key === 'D') {
        this.demolishMode = !this.demolishMode;
        this.selectedBuilding = null;
        this.selectedZone = null;
        document.querySelectorAll('.build-btn').forEach(x => x.classList.remove('selected'));
      }
      if (e.key === ' ') { e.preventDefault(); this.advanceDay(); }
      if (e.key === 'u' || e.key === 'U') this.upgradeBuilding();
      // Arrow keys for camera
      const panSpeed = 20 / this.zoom;
      if (e.key === 'ArrowLeft') { this.camX -= panSpeed; this.clampCamera(); }
      if (e.key === 'ArrowRight') { this.camX += panSpeed; this.clampCamera(); }
      if (e.key === 'ArrowUp') { this.camY -= panSpeed; this.clampCamera(); }
      if (e.key === 'ArrowDown') { this.camY += panSpeed; this.clampCamera(); }
      // +/- for zoom
      if (e.key === '=' || e.key === '+') { this.zoom = Math.min(3, this.zoom * 1.1); this.clampCamera(); }
      if (e.key === '-') { this.zoom = Math.max(0.4, this.zoom * 0.9); this.clampCamera(); }
    });
  }

  clampCamera() {
    const worldW = this.GRID_W * this.TILE;
    const worldH = this.GRID_H * this.TILE;
    const viewW = this.CW / this.zoom;
    const viewH = this.CH / this.zoom;
    if (viewW >= worldW) {
      this.camX = (worldW - viewW) / 2;
    } else {
      this.camX = Math.max(0, Math.min(worldW - viewW, this.camX));
    }
    if (viewH >= worldH) {
      this.camY = (worldH - viewH) / 2;
    } else {
      this.camY = Math.max(0, Math.min(worldH - viewH, this.camY));
    }
  }

  handleClick(tx, ty) {
    if (this.selectedZone) {
      this.paintZone(tx, ty);
    } else {
      this.placeBuilding(tx, ty);
    }
  }

  // ===== ZONING =====
  paintZone(tx, ty) {
    if (tx < 0 || tx >= this.GRID_W || ty < 0 || ty >= this.GRID_H) return;
    if (this.grid[ty][tx]) return; // Can't zone over buildings
    this.zones[ty][tx] = this.selectedZone.id;
    this.playTone(600, 0.05, 'sine', 0.04);
  }

  // ===== ROAD CONNECTIVITY & ADJACENCY =====
  hasAdjacentRoad(tx, ty) {
    const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
    for (const [dx, dy] of dirs) {
      const nx = tx + dx, ny = ty + dy;
      if (nx >= 0 && nx < this.GRID_W && ny >= 0 && ny < this.GRID_H) {
        if (this.grid[ny][nx] && this.grid[ny][nx].type === 'road') return true;
      }
    }
    return false;
  }

  getAdjacentTypes(tx, ty) {
    const types = new Set();
    const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
    for (const [dx, dy] of dirs) {
      const nx = tx + dx, ny = ty + dy;
      if (nx >= 0 && nx < this.GRID_W && ny >= 0 && ny < this.GRID_H && this.grid[ny][nx]) {
        types.add(this.grid[ny][nx].type);
      }
    }
    return types;
  }

  placeBuilding(tx, ty) {
    if (tx < 0 || tx >= this.GRID_W || ty < 0 || ty >= this.GRID_H) return;

    if (this.demolishMode) {
      if (this.grid[ty][tx]) {
        const b = this.grid[ty][tx];
        const def = BUILDINGS.find(x => x.id === b.type);
        this.credits += Math.floor(def.cost * 0.5);
        this.grid[ty][tx] = null;
        this.buildings = this.buildings.filter(x => !(x.x === tx && x.y === ty));
        this.recalcResources();
        this.playTone(200, 0.2, 'sawtooth', 0.08);
      }
      return;
    }

    if (!this.selectedBuilding) return;
    if (this.grid[ty][tx]) return;

    const cost = Math.floor(this.selectedBuilding.cost * this.buildDiscount);
    if (this.credits < cost) return;

    this.credits -= cost;
    this.totalSpent += cost;
    this.grid[ty][tx] = { type: this.selectedBuilding.id, level: 1 };
    this.buildings.push({ x: tx, y: ty, type: this.selectedBuilding.id, level: 1 });

    // Clear zone if placed
    this.zones[ty][tx] = null;

    this.recalcResources();
    this.playTone(500 + tx * 5, 0.1, 'sine', 0.06);
    this.checkMilestones();
    this.checkAchievements();
    this.saveGame();
  }

  upgradeBuilding() {
    if (!this.hoverTile) return;
    const tx = this.hoverTile.x, ty = this.hoverTile.y;
    const cell = this.grid[ty]?.[tx];
    if (!cell || cell.level >= 3) return;

    const def = BUILDINGS.find(b => b.id === cell.type);
    const cost = Math.floor(def.cost * cell.level * this.buildDiscount);
    if (this.credits < cost) return;

    this.credits -= cost;
    this.totalSpent += cost;
    cell.level++;
    const bObj = this.buildings.find(b => b.x === tx && b.y === ty);
    if (bObj) bObj.level = cell.level;

    this.recalcResources();
    this.playTone(700, 0.15, 'sine', 0.08);
    this.saveGame();
  }

  recalcResources() {
    let pop = 0, powerGen = 0, powerUse = 0, happy = 50, income = 0;
    let hasLab = false;

    this.buildings.forEach(b => {
      const def = BUILDINGS.find(x => x.id === b.type);
      const mult = b.level;
      let bPop = (def.pop || 0) * mult;
      let bIncome = (def.income || 0) * mult;
      let bHappy = (def.happy || 0) * mult;

      // Adjacency bonuses
      const adj = this.getAdjacentTypes(b.x, b.y);
      if (adj.has('road')) {
        // Buildings near roads get 2x income
        bIncome *= 2;
      }
      if (b.type === 'residential' && adj.has('park')) {
        bHappy += 3; // Residential near park = +happiness
      }
      if (b.type === 'commercial' && adj.has('residential')) {
        bIncome = Math.floor(bIncome * 1.5); // Commercial near residential = +income
      }
      if (b.type === 'industrial' && adj.has('road')) {
        bIncome = Math.floor(bIncome * 1.3); // Industrial near road = +production (on top of 2x)
      }

      pop += bPop;
      if (def.power > 0) powerGen += def.power * mult;
      else powerUse += Math.abs(def.power) * mult;
      happy += bHappy;
      income += bIncome;
      if (b.type === 'lab') hasLab = true;
    });

    if (hasLab) { income = Math.floor(income * 1.2); happy += 3; }
    if (powerUse > powerGen) happy -= 10;

    this.population = Math.max(0, pop);
    this.powerCap = powerGen;
    this.powerUsed = powerUse;
    this.happiness = Math.max(0, Math.min(100, happy));
    this.incomePerDay = income;
  }

  // ===== DISASTERS =====
  triggerDisaster(type) {
    if (type === 'fire') {
      // Fire spreads from a random building
      const burnable = this.buildings.filter(b => b.type !== 'road');
      if (burnable.length === 0) return;
      const start = burnable[Math.floor(Math.random() * burnable.length)];
      this.fireCells = [{ x: start.x, y: start.y, timer: 120 }];
      this.fireTimer = 120;
      this.playTone(100, 0.5, 'sawtooth', 0.12);
    } else if (type === 'earthquake') {
      // Random damage to 3-8 buildings
      const count = 3 + Math.floor(Math.random() * 6);
      for (let i = 0; i < count && this.buildings.length > 0; i++) {
        const idx = Math.floor(Math.random() * this.buildings.length);
        const b = this.buildings[idx];
        if (b.type !== 'road' && Math.random() < 0.6) {
          this.grid[b.y][b.x] = null;
          this.buildings.splice(idx, 1);
        }
      }
      this.recalcResources();
      this.playTone(80, 0.8, 'sawtooth', 0.15);
    } else if (type === 'alien') {
      // Destroy 2-5 random buildings
      const count = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count && this.buildings.length > 0; i++) {
        const idx = Math.floor(Math.random() * this.buildings.length);
        const b = this.buildings[idx];
        this.grid[b.y][b.x] = null;
        this.buildings.splice(idx, 1);
      }
      this.recalcResources();
      this.playTone(150, 0.6, 'square', 0.1);
    }
    this.disastersSurvived++;
    this.checkAchievements();
    this.saveGame();
  }

  updateFire() {
    if (this.fireTimer <= 0 || this.fireCells.length === 0) return;
    this.fireTimer--;

    // Fire spread
    const hasFireStation = this.buildings.some(b => b.type === 'fire');
    if (this.fireTimer % 30 === 0 && this.fireCells.length > 0 && !hasFireStation) {
      const newFires = [];
      for (const fc of this.fireCells) {
        const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
        for (const [dx, dy] of dirs) {
          const nx = fc.x + dx, ny = fc.y + dy;
          if (nx >= 0 && nx < this.GRID_W && ny >= 0 && ny < this.GRID_H && this.grid[ny][nx] && this.grid[ny][nx].type !== 'road') {
            if (Math.random() < 0.3 && !this.fireCells.some(f => f.x === nx && f.y === ny)) {
              newFires.push({ x: nx, y: ny, timer: 90 });
            }
          }
        }
      }
      this.fireCells.push(...newFires);
    }

    // Fire station extinguishes
    if (hasFireStation && this.fireTimer % 20 === 0) {
      this.fireCells.splice(0, Math.min(2, this.fireCells.length));
    }

    // Burn down buildings
    if (this.fireTimer % 40 === 0) {
      for (const fc of this.fireCells) {
        if (this.grid[fc.y][fc.x]) {
          this.grid[fc.y][fc.x] = null;
          this.buildings = this.buildings.filter(b => !(b.x === fc.x && b.y === fc.y));
        }
      }
      this.recalcResources();
    }

    // Fire dies out
    if (this.fireTimer <= 0) {
      this.fireCells = [];
    }
  }

  // ===== CITIZENS =====
  spawnCitizens() {
    this.citizens = [];
    const maxCitizens = Math.min(30, Math.floor(this.population / 10));
    for (let i = 0; i < maxCitizens; i++) {
      this.citizens.push(this.createCitizen());
    }
  }

  createCitizen() {
    const roadCells = [];
    for (let y = 0; y < this.GRID_H; y++) {
      for (let x = 0; x < this.GRID_W; x++) {
        if (this.grid[y] && this.grid[y][x] && this.grid[y][x].type === 'road') {
          roadCells.push({ x, y });
        }
      }
    }
    if (roadCells.length < 2) return null;
    const start = roadCells[Math.floor(Math.random() * roadCells.length)];
    let end = roadCells[Math.floor(Math.random() * roadCells.length)];
    while (end.x === start.x && end.y === start.y) {
      end = roadCells[Math.floor(Math.random() * roadCells.length)];
    }
    return {
      x: start.x * this.TILE + this.TILE / 2,
      y: start.y * this.TILE + this.TILE / 2,
      targetX: end.x * this.TILE + this.TILE / 2,
      targetY: end.y * this.TILE + this.TILE / 2,
      speed: 0.3 + Math.random() * 0.3,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    };
  }

  updateCitizens() {
    const maxCitizens = Math.min(30, Math.floor(this.population / 10));
    while (this.citizens.length < maxCitizens) {
      const c = this.createCitizen();
      if (c) this.citizens.push(c);
      else break;
    }
    while (this.citizens.length > maxCitizens) this.citizens.pop();

    for (let i = this.citizens.length - 1; i >= 0; i--) {
      const c = this.citizens[i];
      if (!c) { this.citizens.splice(i, 1); continue; }
      const dx = c.targetX - c.x;
      const dy = c.targetY - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        // Pick new target on a road
        const roadCells = [];
        for (let y = 0; y < this.GRID_H; y++) {
          for (let x = 0; x < this.GRID_W; x++) {
            if (this.grid[y] && this.grid[y][x] && this.grid[y][x].type === 'road') {
              roadCells.push({ x, y });
            }
          }
        }
        if (roadCells.length < 2) continue;
        const target = roadCells[Math.floor(Math.random() * roadCells.length)];
        c.targetX = target.x * this.TILE + this.TILE / 2;
        c.targetY = target.y * this.TILE + this.TILE / 2;
      } else {
        c.x += (dx / dist) * c.speed;
        c.y += (dy / dist) * c.speed;
      }
    }
  }

  // ===== ACHIEVEMENTS =====
  checkAchievements() {
    for (const a of ACHIEVEMENTS_DEF) {
      if (!this.achievements.has(a.id) && a.check(this)) {
        this.achievements.add(a.id);
        generateRewards19(25);
        this.updateCoins();
        this.showAchievementPopup(a.name, a.desc);
        this.playTone(523, 0.2, 'sine', 0.1);
        setTimeout(() => this.playTone(784, 0.3, 'sine', 0.1), 150);
      }
    }
  }

  showAchievementPopup(name, desc) {
    const popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1a1a2e;border:2px solid #f0f;padding:15px 25px;z-index:9999;font-family:monospace;text-align:center;color:#fff;pointer-events:none;';
    popup.innerHTML = `<div style="color:#f0f;font-size:14px;">🏆 ACHIEVEMENT: ${name}</div><div style="color:#888;font-size:12px;margin-top:5px">${desc} (+25🪙)</div>`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
  }

  // ===== GAMEPAD =====
  setupGamepad() {
    window.addEventListener('gamepadconnected', () => { this.gamepadConnected = true; });
    window.addEventListener('gamepaddisconnected', () => { this.gamepadConnected = false; });
  }

  updateGamepad() {
    const gamepads = navigator.getGamepads();
    if (!gamepads || !gamepads[0]) return;
    const gp = gamepads[0];

    // Left stick / D-pad for camera pan
    const deadzone = 0.2;
    let lx = 0, ly = 0;
    if (gp.axes[0]) lx = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
    if (gp.axes[1]) ly = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;

    // D-pad
    if (gp.buttons[12] && gp.buttons[12].pressed) lx = -1;
    if (gp.buttons[13] && gp.buttons[13].pressed) ly = -1;
    if (gp.buttons[14] && gp.buttons[14].pressed) lx = 1;
    if (gp.buttons[15] && gp.buttons[15].pressed) ly = 1;

    const panSpeed = 4 / this.zoom;
    this.camX -= lx * panSpeed;
    this.camY -= ly * panSpeed;
    this.clampCamera();

    // A button (0) = place/select
    if (gp.buttons[0] && gp.buttons[0].pressed && (!this.gamepadPrevButtons[0] || !this.gamepadPrevButtons[0].pressed)) {
      if (this.hoverTile) this.handleClick(this.hoverTile.x, this.hoverTile.y);
    }
    // B button (1) = demolish toggle
    if (gp.buttons[1] && gp.buttons[1].pressed && (!this.gamepadPrevButtons[1] || !this.gamepadPrevButtons[1].pressed)) {
      this.demolishMode = !this.demolishMode;
      this.selectedBuilding = null;
      this.selectedZone = null;
    }
    // X button (2) = advance day
    if (gp.buttons[2] && gp.buttons[2].pressed && (!this.gamepadPrevButtons[2] || !this.gamepadPrevButtons[2].pressed)) {
      this.advanceDay();
    }
    // Y button (3) = upgrade
    if (gp.buttons[3] && gp.buttons[3].pressed && (!this.gamepadPrevButtons[3] || !this.gamepadPrevButtons[3].pressed)) {
      this.upgradeBuilding();
    }
    // RT (7) = zoom in, LT (6) = zoom out
    if (gp.buttons[7] && gp.buttons[7].pressed) { this.zoom = Math.min(3, this.zoom * 1.02); this.clampCamera(); }
    if (gp.buttons[6] && gp.buttons[6].pressed) { this.zoom = Math.max(0.4, this.zoom * 0.98); this.clampCamera(); }

    // RB/LB for cycling buildings
    if (gp.buttons[5] && gp.buttons[5].pressed && (!this.gamepadPrevButtons[5] || !this.gamepadPrevButtons[5].pressed)) {
      this.cycleBuilding(1);
    }
    if (gp.buttons[4] && gp.buttons[4].pressed && (!this.gamepadPrevButtons[4] || !this.gamepadPrevButtons[4].pressed)) {
      this.cycleBuilding(-1);
    }

    this.gamepadPrevButtons = [...gp.buttons];
  }

  cycleBuilding(dir) {
    const allItems = [...ZONES, ...BUILDINGS];
    let idx = -1;
    if (this.selectedBuilding) {
      idx = allItems.findIndex(b => b.id === this.selectedBuilding.id);
    } else if (this.selectedZone) {
      idx = allItems.findIndex(z => z.id === this.selectedZone.id);
    }
    idx = (idx + dir + allItems.length) % allItems.length;
    const item = allItems[idx];
    this.selectedBuilding = ZONES.includes(item) ? null : item;
    this.selectedZone = ZONES.includes(item) ? item : null;
    this.demolishMode = false;
  }

  advanceDay() {
    this.day++;
    this.taxTimer++;
    if (this.discountDays > 0) {
      this.discountDays--;
      if (this.discountDays <= 0) this.buildDiscount = 1;
    }

    // Tax income
    const tax = Math.floor(this.population * 0.5) + this.incomePerDay;
    this.credits += tax;
    this.totalIncome += tax;

    // Happiness effects
    if (this.happiness > 70) {
      this.population += Math.floor(this.population * 0.02) + 1;
    }
    if (this.happiness < 30) {
      this.population = Math.max(0, this.population - Math.floor(this.population * 0.03) - 1);
    }

    // Service costs
    this.credits -= this.buildings.filter(b => b.type === 'police' || b.type === 'hospital' || b.type === 'fire').length * 3;

    // Zone auto-build: buildings auto-generate in zones
    this.processZones();

    // Random events (every 10-20 days)
    if (this.taxTimer >= 10 + Math.floor(Math.random() * 10)) {
      this.taxTimer = 0;
      if (Math.random() < 0.6) {
        this.triggerEvent();
        return;
      }
    }

    // Random disasters (low chance)
    if (this.day > 20 && Math.random() < 0.03) {
      const disasters = ['fire', 'earthquake', 'alien'];
      this.triggerDisaster(disasters[Math.floor(Math.random() * disasters.length)]);
    }

    this.updateFire();
    this.recalcResources();
    this.checkMilestones();
    this.checkAchievements();
    this.spawnCitizens();
    this.saveGame();
    this.updateHud();
    this.playTone(400, 0.1, 'sine', 0.05);
  }

  processZones() {
    // Auto-generate buildings in zones occasionally
    if (Math.random() > 0.15) return;
    for (let y = 0; y < this.GRID_H; y++) {
      for (let x = 0; x < this.GRID_W; x++) {
        if (!this.zones[y][x] || this.grid[y][x]) continue;
        // Check if zone has a road nearby
        if (!this.hasAdjacentRoad(x, y)) continue;
        // Random chance to auto-build
        if (Math.random() > 0.05) continue;

        let buildType = null;
        if (this.zones[y][x] === 'zone_residential') buildType = 'residential';
        else if (this.zones[y][x] === 'zone_commercial') buildType = 'commercial';
        else if (this.zones[y][x] === 'zone_industrial') buildType = 'industrial';

        if (buildType) {
          const def = BUILDINGS.find(b => b.id === buildType);
          if (this.credits >= def.cost) {
            this.credits -= def.cost;
            this.grid[y][x] = { type: buildType, level: 1 };
            this.buildings.push({ x, y, type: buildType, level: 1 });
            this.zones[y][x] = null;
            this.recalcResources();
          }
        }
      }
    }
  }

  triggerEvent() {
    const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    this.state = 'event';
    document.getElementById('event-title').textContent = event.title;
    document.getElementById('event-text').textContent = event.text;
    const opts = document.getElementById('event-options');
    opts.innerHTML = '';
    event.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = opt.text;
      btn.onclick = () => {
        opt.effect(this);
        this.recalcResources();
        this.checkMilestones();
        this.checkAchievements();
        this.saveGame();
        this.state = 'playing';
        this.showScreen('game-screen');
        this.updateHud();
      };
      opts.appendChild(btn);
    });
    this.showScreen('event-screen');
    this.playTone(200, 0.5, 'sawtooth', 0.06);
  }

  checkMilestones() {
    for (let m of this.milestones) {
      if (!m.achieved && this.population >= m.pop) {
        m.achieved = true;
        generateRewards19(m.reward);
        this.updateCoins();
        document.getElementById('milestone-title').textContent = `🏆 ${m.title}`;
        document.getElementById('milestone-text').textContent = `Population reached ${m.pop}! The city is growing!`;
        document.getElementById('milestone-reward').textContent = `+${m.reward} 🪙`;
        this.state = 'milestone';
        this.showScreen('milestone-screen');
        this.playTone(523, 0.2, 'sine', 0.1);
        setTimeout(() => { this.playTone(659, 0.2, 'sine', 0.1); }, 100);
        setTimeout(() => { this.playTone(784, 0.3, 'sine', 0.1); }, 200);
        break;
      }
    }
  }

  showStats() {
    const content = document.getElementById('stats-content');
    const powered = this.powerUsed <= this.powerCap;
    content.innerHTML = `
      <div style="color:#f0f;font-size:16px;margin-bottom:10px;">📊 City Dashboard</div>
      Day: ${this.day}<br>
      Population: ${this.population}<br>
      Happiness: ${this.happiness}%<br>
      Power: ${this.powerUsed}/${this.powerCap} ${powered ? '✅' : '⚠️'}<br>
      Income/Day: ${this.incomePerDay}💰<br>
      Tax/Day: ${Math.floor(this.population * 0.5)}💰<br>
      Total Income: ${this.totalIncome}💰<br>
      Total Spent: ${this.totalSpent}💰<br>
      Buildings: ${this.buildings.length}<br>
      <br><span style="color:#888;">Building Breakdown:</span><br>
      ${BUILDINGS.map(b => {
        const count = this.buildings.filter(x => x.type === b.id).length;
        return count > 0 ? `${b.emoji} ${b.name}: ${count}` : '';
      }).filter(Boolean).join('<br>')}
      <br><span style="color:#888;">Milestones:</span><br>
      ${this.milestones.map(m => `${m.achieved ? '✅' : '⬜'} ${m.title} (${m.pop} pop)`).join('<br>')}
      <br><span style="color:#888;">Achievements (${this.achievements.size}/${ACHIEVEMENTS_DEF.length}):</span><br>
      ${ACHIEVEMENTS_DEF.map(a => `${this.achievements.has(a.id) ? '✅' : '⬜'} ${a.name}: ${a.desc}`).join('<br>')}
    `;
    this.state = 'stats';
    this.showScreen('stats-screen');
  }

  resumeGame() { this.state = 'playing'; this.showScreen('game-screen'); this.updateHud(); }

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

  updateHud() {
    document.getElementById('hud-credits').textContent = `💰 ${this.credits}`;
    document.getElementById('hud-pop').textContent = `👥 ${this.population}`;
    document.getElementById('hud-power').textContent = `⚡ ${this.powerUsed}/${this.powerCap}`;
    document.getElementById('hud-happy').textContent = `😊 ${this.happiness}%`;
    document.getElementById('hud-day').textContent = `Day ${this.day}`;
  }

  render() {
    const ctx = this.ctx;
    const T = this.TILE;
    ctx.clearRect(0, 0, this.CW, this.CH);

    // Apply zoom
    ctx.save();
    ctx.scale(this.zoom, this.zoom);

    // Calculate visible area
    const viewW = this.CW / this.zoom;
    const viewH = this.CH / this.zoom;

    // Background
    ctx.fillStyle = '#06060e';
    ctx.fillRect(this.camX, this.camY, viewW, viewH);

    // Draw grid
    const startTX = Math.floor(this.camX / T);
    const startTY = Math.floor(this.camY / T);
    const endTX = startTX + Math.ceil(viewW / T) + 1;
    const endTY = startTY + Math.ceil(viewH / T) + 1;

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        const sx = tx * T - this.camX;
        const sy = ty * T - this.camY;

        // Ground
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(sx, sy, T, T);

        // Zone overlay
        if (ty >= 0 && ty < this.GRID_H && tx >= 0 && tx < this.GRID_W) {
          if (this.zones[ty] && this.zones[ty][tx]) {
            const zDef = ZONES.find(z => z.id === this.zones[ty][tx]);
            if (zDef) {
              ctx.fillStyle = zDef.color;
              ctx.fillRect(sx, sy, T, T);
            }
          }
        }

        // Grid line
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.05)';
        ctx.strokeRect(sx, sy, T, T);

        // Building
        if (ty >= 0 && ty < this.GRID_H && tx >= 0 && tx < this.GRID_W && this.grid[ty] && this.grid[ty][tx]) {
          const cell = this.grid[ty][tx];
          const def = BUILDINGS.find(b => b.id === cell.type);

          // Check if on fire
          const onFire = this.fireCells.some(f => f.x === tx && f.y === ty);

          // Building background
          const colors = { residential: '#1a3a2a', commercial: '#2a2a1a', industrial: '#2a1a1a', power: '#3a3a00', solar: '#2a2a00',
            police: '#1a1a3a', hospital: '#3a1a1a', school: '#1a2a3a', park: '#1a3a1a', road: '#1a1a1a',
            fire: '#3a2a00', stadium: '#2a003a', mall: '#2a1a2a', apartment: '#1a2a2a', lab: '#002a2a' };
          ctx.fillStyle = onFire ? '#662200' : (colors[cell.type] || '#1a1a1a');
          ctx.fillRect(sx + 1, sy + 1, T - 2, T - 2);

          // Fire animation
          if (onFire) {
            ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.5 + Math.random() * 0.5})`;
            ctx.fillRect(sx + 2, sy + 2, T - 4, T - 4);
          }

          // Level indicators
          if (cell.level > 1) {
            ctx.fillStyle = '#f0f';
            for (let l = 0; l < cell.level; l++) {
              ctx.fillRect(sx + 2 + l * 6, sy + T - 5, 4, 3);
            }
          }

          // Road adjacency bonus indicator (small green dot)
          if (cell.type !== 'road' && this.hasAdjacentRoad(tx, ty)) {
            ctx.fillStyle = '#00ff4466';
            ctx.beginPath();
            ctx.arc(sx + T - 4, sy + 4, 2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Emoji
          ctx.font = '14px serif';
          ctx.textAlign = 'center';
          ctx.fillText(def.emoji, sx + T/2, sy + T/2 + 5);
        }

        // Hover
        if (this.hoverTile && this.hoverTile.x === tx && this.hoverTile.y === ty) {
          ctx.strokeStyle = this.demolishMode ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 0, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx, sy, T, T);
          ctx.lineWidth = 1;

          if (this.selectedBuilding && (!this.grid[ty] || !this.grid[ty][tx])) {
            ctx.fillStyle = 'rgba(255, 0, 255, 0.15)';
            ctx.fillRect(sx, sy, T, T);
            ctx.font = '12px serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.selectedBuilding.emoji, sx + T/2, sy + T/2 + 4);
          }
          if (this.selectedZone && (!this.grid[ty] || !this.grid[ty][tx])) {
            ctx.fillStyle = ZONES.find(z => z.id === this.selectedZone.id)?.color || '#ffffff20';
            ctx.fillRect(sx, sy, T, T);
          }
        }
      }
    }

    // Draw citizens
    this.citizens.forEach(c => {
      if (!c) return;
      const sx = c.x - this.camX;
      const sy = c.y - this.camY;
      if (sx < -T || sx > viewW + T || sy < -T || sy > viewH + T) return;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Power warning overlay
    if (this.powerUsed > this.powerCap) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
      ctx.fillRect(this.camX, this.camY, viewW, viewH);
      ctx.fillStyle = '#f44';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ POWER DEFICIT', this.camX + viewW / 2, this.camY + 20);
    }

    // Fire warning
    if (this.fireCells.length > 0) {
      ctx.fillStyle = '#f80';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`🔥 FIRE! ${this.fireCells.length} buildings burning!`, this.camX + viewW / 2, this.camY + 38);
    }

    // Minimap
    ctx.restore();
    this.renderMinimap();
  }

  renderMinimap() {
    const ctx = this.ctx;
    const mmW = 80, mmH = 60;
    const mmX = this.CW - mmW - 5, mmY = 5;

    ctx.fillStyle = '#00000088';
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.strokeStyle = '#f0f44';
    ctx.strokeRect(mmX, mmY, mmW, mmH);

    const scaleX = mmW / (this.GRID_W * this.TILE);
    const scaleY = mmH / (this.GRID_H * this.TILE);

    // Buildings on minimap
    for (let y = 0; y < this.GRID_H; y++) {
      for (let x = 0; x < this.GRID_W; x++) {
        if (this.grid[y] && this.grid[y][x]) {
          const def = BUILDINGS.find(b => b.id === this.grid[y][x].type);
          const colors = { residential: '#0a5', commercial: '#aa5', industrial: '#a33', power: '#aa0', solar: '#aa0',
            police: '#33a', hospital: '#a33', school: '#3a5', park: '#0a0', road: '#333',
            fire: '#a60', stadium: '#a0a', mall: '#a3a', apartment: '#0a5', lab: '#0aa' };
          ctx.fillStyle = colors[this.grid[y][x].type] || '#555';
          ctx.fillRect(mmX + x * this.TILE * scaleX, mmY + y * this.TILE * scaleY, Math.max(1, this.TILE * scaleX), Math.max(1, this.TILE * scaleY));
        }
      }
    }

    // Camera viewport indicator
    ctx.strokeStyle = '#f0f';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mmX + this.camX * scaleX,
      mmY + this.camY * scaleY,
      (this.CW / this.zoom) * scaleX,
      (this.CH / this.zoom) * scaleY
    );
  }

  loop() {
    if (this.state === 'playing') {
      this.updateGamepad();
      this.updateFire();
      this.updateCitizens();
      this.render();
      this.updateHud();
    }
    requestAnimationFrame(() => this.loop());
  }
}

const game = new NeonMetropolis();
