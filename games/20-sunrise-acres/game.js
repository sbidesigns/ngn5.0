// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('sunrise-acres'); } catch(e) {}

function generateRewards20(amt) {
  let r = JSON.parse(localStorage.getItem('ngn4_rewards') || '{}');
  r.coins = (r.coins || 0) + amt;
  r.total = (r.total || 0) + amt;
  r.games20 = (r.games20 || 0) + 1;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
}

function getCoins20() { return (JSON.parse(localStorage.getItem('ngn4_rewards') || '{}').coins || 0); }

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];
const SEASON_EMOJI = ['🌱', '☀️', '🍂', '❄️'];
const SEASON_COLORS = ['#4f4', '#ff0', '#f80', '#88f'];
const DAYS_PER_SEASON = 30;

const CROPS = [
  { id: 'wheat', name: 'Wheat', emoji: '🌾', seasons: ['Spring','Fall'], growDays: 4, seedCost: 10, sellPrice: 25, harvest: 1 },
  { id: 'corn', name: 'Corn', emoji: '🌽', seasons: ['Summer'], growDays: 6, seedCost: 15, sellPrice: 40, harvest: 1 },
  { id: 'tomato', name: 'Tomato', emoji: '🍅', seasons: ['Summer','Spring'], growDays: 5, seedCost: 12, sellPrice: 30, harvest: 2 },
  { id: 'carrot', name: 'Carrot', emoji: '🥕', seasons: ['Spring','Fall'], growDays: 3, seedCost: 8, sellPrice: 20, harvest: 2 },
  { id: 'strawberry', name: 'Strawberry', emoji: '🍓', seasons: ['Spring','Summer'], growDays: 5, seedCost: 20, sellPrice: 45, harvest: 2 },
  { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', seasons: ['Fall'], growDays: 8, seedCost: 25, sellPrice: 60, harvest: 1 },
  { id: 'potato', name: 'Potato', emoji: '🥔', seasons: ['Spring','Fall'], growDays: 5, seedCost: 10, sellPrice: 28, harvest: 3 },
  { id: 'lettuce', name: 'Lettuce', emoji: '🥬', seasons: ['Spring','Fall'], growDays: 3, seedCost: 8, sellPrice: 18, harvest: 2 },
  { id: 'melon', name: 'Melon', emoji: '🍈', seasons: ['Summer'], growDays: 7, seedCost: 20, sellPrice: 50, harvest: 1 },
  { id: 'grape', name: 'Grape', emoji: '🍇', seasons: ['Summer','Fall'], growDays: 6, seedCost: 18, sellPrice: 42, harvest: 2 },
  { id: 'cabbage', name: 'Cabbage', emoji: '🥬', seasons: ['Fall','Winter'], growDays: 4, seedCost: 10, sellPrice: 22, harvest: 2 },
  { id: 'snowpea', name: 'Snow Pea', emoji: '🫛', seasons: ['Winter'], growDays: 5, seedCost: 15, sellPrice: 35, harvest: 2 },
];

const ANIMALS = [
  { id: 'chicken', name: 'Chicken', emoji: '🐔', cost: 100, product: 'Egg', prodEmoji: '🥚', prodValue: 15, prodDays: 1 },
  { id: 'cow', name: 'Cow', emoji: '🐄', cost: 500, product: 'Milk', prodEmoji: '🥛', prodValue: 30, prodDays: 2 },
  { id: 'pig', name: 'Pig', emoji: '🐷', cost: 400, product: 'Truffle', prodEmoji: '🍄', prodValue: 50, prodDays: 3 },
  { id: 'sheep', name: 'Sheep', emoji: '🐑', cost: 350, product: 'Wool', prodEmoji: '🧶', prodValue: 35, prodDays: 2 },
  { id: 'horse', name: 'Horse', emoji: '🐴', cost: 800, product: 'None', prodEmoji: '', prodValue: 0, prodDays: 0 },
  { id: 'duck', name: 'Duck', emoji: '🦆', cost: 150, product: 'Duck Egg', prodEmoji: '🥚', prodValue: 20, prodDays: 1 },
];

const TOOLS = [
  { id: 'hoe', name: 'Hoe', emoji: '⛏️', desc: 'Till soil for planting' },
  { id: 'water', name: 'Water Can', emoji: '💧', desc: 'Water your crops' },
  { id: 'harvest', name: 'Harvest', emoji: '🫴', desc: 'Harvest ready crops' },
  { id: 'seed', name: 'Plant Seeds', emoji: '🌱', desc: 'Plant selected seed' },
  { id: 'pet', name: 'Pet Animals', emoji: '🤗', desc: 'Interact with animals' },
  { id: 'remove', name: 'Remove', emoji: '❌', desc: 'Clear a tile' },
];

const QUESTS = [
  { text: 'My neighbor needs 5 Wheat! Can you help?', need: {wheat: 5}, reward: 150 },
  { text: 'Can you grow 3 Tomatoes for the soup kitchen?', need: {tomato: 3}, reward: 200 },
  { text: 'I need 10 Carrots for my rabbits!', need: {carrot: 10}, reward: 250 },
  { text: 'The bakery needs 4 Pumpkins!', need: {pumpkin: 4}, reward: 350 },
  { text: 'Can you spare 3 Strawberry baskets?', need: {strawberry: 3}, reward: 280 },
  { text: 'The school wants 8 Lettuce heads!', need: {lettuce: 8}, reward: 220 },
  { text: 'I need 5 Melons for the fruit stand!', need: {melon: 5}, reward: 400 },
  { text: 'The winery requests 6 Grape bunches!', need: {grape: 6}, reward: 380 },
];

class SunriseAcres {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.CW = 640; this.CH = 440;
    this.TILE = 32;
    this.FARM_W = 12; this.FARM_H = 10;
    this.state = 'menu';
    this.audioCtx = null;
    this.selectedTool = 'hoe';
    this.selectedSeed = 'wheat';
    this.hoverTile = null;
    this.camX = 0; this.camY = 0;
    this.particles = [];
    this.updateCoins();
    this.setupInput();
    this.loop();
  }

  updateCoins() { const el = document.getElementById('menu-coins'); if (el) el.textContent = getCoins20(); }

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

  initFarm() {
    this.farmGrid = [];
    for (let y = 0; y < this.FARM_H; y++) {
      this.farmGrid[y] = [];
      for (let x = 0; x < this.FARM_W; x++) {
        this.farmGrid[y][x] = { tilled: false, watered: false, crop: null, growth: 0, growTarget: 0 };
      }
    }
    this.animalPen = [];
    this.inventory = {};
    this.coins = 500;
    this.energy = 100;
    this.maxEnergy = 100;
    this.day = 1;
    this.seasonIdx = 0;
    this.year = 1;
    this.hour = 6;
    this.festivalScore = 0;
    this.festivalWins = 0;
    this.totalEarned = 0;
    this.totalHarvested = 0;
    this.questsCompleted = 0;
    this.currentQuest = null;
    this.questTimer = 5;
    this.priceFluctuation = {};
    this.upgrades = { waterCan: 0, hoe: 0, bagSize: 0, expanded: false };
    CROPS.forEach(c => { this.priceFluctuation[c.id] = 1; });
    this.selectedTool = 'hoe';
    this.selectedSeed = 'wheat';
    this.buildToolbar();
  }

  newFarm() {
    this.initFarm();
    this.state = 'playing';
    this.showSeasonScreen();
  }

  continueFarm() {
    const s = JSON.parse(localStorage.getItem('ngn4_sunriseacres') || 'null');
    if (!s) { this.newFarm(); return; }
    this.farmGrid = s.farmGrid;
    this.animalPen = s.animalPen || [];
    this.inventory = s.inventory || {};
    this.coins = s.coins;
    this.energy = s.energy;
    this.maxEnergy = s.maxEnergy;
    this.day = s.day;
    this.seasonIdx = s.seasonIdx;
    this.year = s.year;
    this.hour = s.hour;
    this.festivalScore = s.festivalScore || 0;
    this.festivalWins = s.festivalWins || 0;
    this.totalEarned = s.totalEarned || 0;
    this.totalHarvested = s.totalHarvested || 0;
    this.questsCompleted = s.questsCompleted || 0;
    this.currentQuest = s.currentQuest || null;
    this.questTimer = s.questTimer || 5;
    this.priceFluctuation = s.priceFluctuation || {};
    this.upgrades = s.upgrades || { waterCan: 0, hoe: 0, bagSize: 0, expanded: false };
    CROPS.forEach(c => { if (!this.priceFluctuation[c.id]) this.priceFluctuation[c.id] = 1; });
    this.selectedTool = 'hoe';
    this.selectedSeed = 'wheat';
    this.buildToolbar();
    this.state = 'playing';
    this.showScreen('game-screen');
    this.updateHud();
  }

  saveFarm() {
    localStorage.setItem('ngn4_sunriseacres', JSON.stringify({
      farmGrid: this.farmGrid, animalPen: this.animalPen, inventory: this.inventory,
      coins: this.coins, energy: this.energy, maxEnergy: this.maxEnergy,
      day: this.day, seasonIdx: this.seasonIdx, year: this.year, hour: this.hour,
      festivalScore: this.festivalScore, festivalWins: this.festivalWins,
      totalEarned: this.totalEarned, totalHarvested: this.totalHarvested,
      questsCompleted: this.questsCompleted, currentQuest: this.currentQuest,
      questTimer: this.questTimer, priceFluctuation: this.priceFluctuation,
      upgrades: this.upgrades
    }));
  }

  get season() { return SEASONS[this.seasonIdx]; }

  showSeasonScreen() {
    document.getElementById('season-title').textContent = `${SEASON_EMOJI[this.seasonIdx]} ${this.season} - Year ${this.year}`;
    const availCrops = CROPS.filter(c => c.seasons.includes(this.season));
    document.getElementById('season-text').textContent =
      `A new ${this.season.toLowerCase()} begins! Available crops: ${availCrops.map(c => c.emoji + c.name).join(', ')}`;
    document.getElementById('season-reward').textContent = `💰 ${this.coins} coins`;
    this.showScreen('season-screen');
    if (this.seasonIdx === 0 && this.day === 1 && this.year === 1) {
      this.playTone(440, 0.3, 'sine', 0.08);
      setTimeout(() => this.playTone(550, 0.3, 'sine', 0.08), 200);
      setTimeout(() => this.playTone(660, 0.4, 'sine', 0.08), 400);
    }
  }

  startSeason() {
    this.state = 'playing';
    this.showScreen('game-screen');
    this.updateHud();
  }

  buildToolbar() {
    const tb = document.getElementById('toolbar');
    tb.innerHTML = '<div style="color:#4f4;font-size:11px;padding:4px;text-align:center;">TOOLS</div>';
    TOOLS.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (this.selectedTool === t.id ? ' selected' : '');
      btn.innerHTML = `<span class="emoji">${t.emoji}</span><span>${t.name}</span><span class="key">${i+1}</span>`;
      btn.title = t.desc;
      btn.onclick = () => {
        this.selectedTool = t.id;
        tb.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
      tb.appendChild(btn);
    });
    // Seed selector
    tb.innerHTML += '<div style="color:#8f8;font-size:10px;padding:6px 4px 2px;">SEED TYPE:</div>';
    const availSeeds = CROPS.filter(c => c.seasons.includes(this.season));
    availSeeds.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (this.selectedSeed === c.id ? ' selected' : '');
      btn.innerHTML = `<span class="emoji">${c.emoji}</span><span style="font-size:10px">${c.name}</span>`;
      btn.onclick = () => {
        this.selectedSeed = c.id;
        tb.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
      tb.appendChild(btn);
    });
    // Market button
    const marketBtn = document.createElement('button');
    marketBtn.className = 'tool-btn';
    marketBtn.style.borderColor = '#f80';
    marketBtn.style.color = '#f80';
    marketBtn.innerHTML = `<span class="emoji">🏪</span><span>Market</span>`;
    marketBtn.onclick = () => this.openMarket();
    tb.appendChild(marketBtn);
    // Festival button
    const festBtn = document.createElement('button');
    festBtn.className = 'tool-btn';
    festBtn.style.borderColor = '#ff0';
    festBtn.style.color = '#ff0';
    festBtn.innerHTML = `<span class="emoji">🌻</span><span>Festival</span>`;
    festBtn.onclick = () => this.enterFestival();
    tb.appendChild(festBtn);
  }

  setupInput() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.hoverTile = { x: Math.floor(mx / this.TILE), y: Math.floor(my / this.TILE) };
      this.updateInfoBar();
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.state !== 'playing' || !this.hoverTile) return;
      this.useTool(this.hoverTile.x, this.hoverTile.y);
    });

    document.addEventListener('keydown', (e) => {
      if (this.state !== 'playing') return;
      if (e.key >= '1' && e.key <= '6') {
        this.selectedTool = TOOLS[parseInt(e.key) - 1].id;
        this.buildToolbar();
      }
      if (e.key.toLowerCase() === 'm') this.openMarket();
      if (e.key.toLowerCase() === 'n') this.nextDay();
      if (e.key.toLowerCase() === 'f') this.enterFestival();
    });
  }

  useTool(tx, ty) {
    if (tx < 0 || tx >= this.FARM_W || ty < 0 || ty >= this.FARM_H) return;
    if (this.energy <= 0) return;

    const tile = this.farmGrid[ty][tx];
    const energyCost = 5;

    switch (this.selectedTool) {
      case 'hoe':
        if (!tile.tilled) {
          tile.tilled = true;
          tile.crop = null;
          tile.growth = 0;
          this.energy -= energyCost;
          this.hour += 0.5;
          this.playTone(200, 0.1, 'triangle', 0.06);
        }
        break;

      case 'water':
        if (tile.tilled && tile.crop && !tile.watered) {
          tile.watered = true;
          this.energy -= energyCost;
          this.hour += 0.5;
          this.playTone(400, 0.1, 'sine', 0.05);
          this.addParticles(tx * this.TILE + 16, ty * this.TILE + 16, '#48f', 5);
        }
        break;

      case 'seed':
        if (tile.tilled && !tile.crop) {
          const cropDef = CROPS.find(c => c.id === this.selectedSeed);
          if (cropDef && cropDef.seasons.includes(this.season) && this.coins >= cropDef.seedCost) {
            this.coins -= cropDef.seedCost;
            tile.crop = this.selectedSeed;
            tile.growth = 0;
            tile.growTarget = cropDef.growDays;
            this.energy -= energyCost;
            this.hour += 0.5;
            this.playTone(500, 0.1, 'sine', 0.06);
            this.addParticles(tx * this.TILE + 16, ty * this.TILE + 16, '#8f8', 5);
          }
        }
        break;

      case 'harvest':
        if (tile.crop && tile.growth >= tile.growTarget) {
          const cropDef = CROPS.find(c => c.id === tile.crop);
          const amount = cropDef.harvest * (this.upgrades.bagSize + 1);
          this.inventory[tile.crop] = (this.inventory[tile.crop] || 0) + amount;
          this.totalHarvested += amount;
          tile.crop = null;
          tile.growth = 0;
          tile.tilled = false;
          tile.watered = false;
          this.energy -= energyCost;
          this.hour += 0.5;
          this.playTone(700, 0.15, 'sine', 0.08);
          this.addParticles(tx * this.TILE + 16, ty * this.TILE + 16, '#ff0', 8);
        }
        break;

      case 'pet':
        // Pet animals
        this.animalPen.forEach(a => {
          a.happiness = Math.min(100, (a.happiness || 50) + 5);
        });
        this.energy -= 3;
        this.hour += 0.3;
        this.playTone(600, 0.1, 'sine', 0.05);
        break;

      case 'remove':
        if (tile.crop || tile.tilled) {
          tile.tilled = false;
          tile.watered = false;
          tile.crop = null;
          tile.growth = 0;
          this.energy -= energyCost;
          this.hour += 0.3;
          this.playTone(150, 0.15, 'sawtooth', 0.06);
        }
        break;
    }

    this.updateHud();
    this.saveFarm();
  }

  nextDay() {
    this.day++;
    this.hour = 6;
    this.energy = this.maxEnergy;
    this.questTimer--;

    // Grow crops
    for (let y = 0; y < this.FARM_H; y++) {
      for (let x = 0; x < this.FARM_W; x++) {
        const tile = this.farmGrid[y][x];
        if (tile.crop) {
          const growRate = tile.watered ? 1 : 0.5;
          tile.growth += growRate * (this.upgrades.hoe + 1) * 0.5;
          tile.watered = false;
        }
      }
    }

    // Animal production
    this.animalPen.forEach(a => {
      const aDef = ANIMALS.find(x => x.id === a.type);
      if (aDef.prodDays > 0) {
        a.prodTimer = (a.prodTimer || 0) + 1;
        if (a.prodTimer >= aDef.prodDays) {
          a.prodTimer = 0;
          const prodKey = a.type + '_product';
          this.inventory[prodKey] = (this.inventory[prodKey] || 0) + 1;
          a.happiness = Math.min(100, (a.happiness || 50) + 2);
        }
      }
      a.happiness = Math.max(0, (a.happiness || 50) - 2);
    });

    // Price fluctuation
    CROPS.forEach(c => {
      this.priceFluctuation[c.id] = Math.max(0.5, Math.min(2, this.priceFluctuation[c.id] + (Math.random() - 0.5) * 0.15));
    });

    // Season change
    if (this.day > DAYS_PER_SEASON) {
      this.day = 1;
      this.seasonIdx = (this.seasonIdx + 1) % 4;
      if (this.seasonIdx === 0) this.year++;
      // Kill off-season crops
      for (let y = 0; y < this.FARM_H; y++) {
        for (let x = 0; x < this.FARM_W; x++) {
          const tile = this.farmGrid[y][x];
          if (tile.crop) {
            const cropDef = CROPS.find(c => c.id === tile.crop);
            if (!cropDef.seasons.includes(this.season)) {
              tile.crop = null; tile.growth = 0; tile.tilled = false;
            }
          }
        }
      }
      this.buildToolbar();
      this.showAd(() => this.showSeasonScreen());
      this.saveFarm();
      return;
    }

    // Quest timer
    if (this.questTimer <= 0 && !this.currentQuest) {
      this.triggerQuest();
      this.questTimer = 8 + Math.floor(Math.random() * 8);
    }

    this.updateHud();
    this.saveFarm();
    this.playTone(440, 0.1, 'sine', 0.04);
  }

  triggerQuest() {
    const quest = QUESTS[Math.floor(Math.random() * QUESTS.length)];
    // Check if player can potentially fulfill
    this.currentQuest = {...quest};
    document.getElementById('quest-text').textContent = quest.text;
    const opts = document.getElementById('quest-options');
    opts.innerHTML = '';
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'btn';
    acceptBtn.textContent = `Accept (+${quest.reward}💰)`;
    acceptBtn.onclick = () => { this.state = 'playing'; this.showScreen('game-screen'); };
    const declineBtn = document.createElement('button');
    declineBtn.className = 'btn';
    declineBtn.textContent = 'Decline';
    declineBtn.onclick = () => { this.currentQuest = null; this.state = 'playing'; this.showScreen('game-screen'); };
    opts.appendChild(acceptBtn);
    opts.appendChild(declineBtn);
    this.state = 'quest';
    this.showScreen('quest-screen');
  }

  tryCompleteQuest() {
    if (!this.currentQuest) return;
    let canComplete = true;
    for (const [crop, amt] of Object.entries(this.currentQuest.need)) {
      if ((this.inventory[crop] || 0) < amt) { canComplete = false; break; }
    }
    if (canComplete) {
      for (const [crop, amt] of Object.entries(this.currentQuest.need)) {
        this.inventory[crop] -= amt;
      }
      this.coins += this.currentQuest.reward;
      this.totalEarned += this.currentQuest.reward;
      this.questsCompleted++;
      generateRewards20(this.currentQuest.reward);
      this.updateCoins();
      this.currentQuest = null;
      this.playTone(600, 0.2, 'sine', 0.08);
      setTimeout(() => this.playTone(800, 0.3, 'sine', 0.08), 150);
    }
  }

  openMarket() {
    const seedShop = document.getElementById('seed-shop');
    seedShop.innerHTML = '';
    const availCrops = CROPS.filter(c => c.seasons.includes(this.season));
    availCrops.forEach(c => {
      const div = document.createElement('div');
      div.className = 'market-item';
      const price = Math.floor(c.seedCost * this.priceFluctuation[c.id]);
      div.innerHTML = `<div class="emoji">${c.emoji}</div><div class="name">${c.name} Seeds</div><div class="price">${price}💰</div><div class="desc">${c.growDays} days, sells ${c.sellPrice}💰</div>`;
      div.onclick = () => {
        if (this.coins >= price) { this.coins -= price; this.inventory['seed_' + c.id] = (this.inventory['seed_' + c.id] || 0) + 1; this.playTone(500,0.1,'sine',0.06); this.openMarket(); }
      };
      seedShop.appendChild(div);
    });

    const sellList = document.getElementById('sell-list');
    sellList.innerHTML = '';
    Object.entries(this.inventory).forEach(([key, amt]) => {
      if (amt <= 0) return;
      let name, emoji, value;
      if (key.startsWith('seed_')) {
        const cropId = key.replace('seed_', '');
        const c = CROPS.find(x => x.id === cropId);
        name = c.name + ' Seeds'; emoji = c.emoji; value = Math.floor(c.seedCost * 0.5);
      } else {
        const c = CROPS.find(x => x.id === key);
        if (c) { name = c.name; emoji = c.emoji; value = Math.floor(c.sellPrice * this.priceFluctuation[c.id]); }
        else {
          const a = ANIMALS.find(x => x.type + '_product' === key || key.includes(x.id));
          name = key; emoji = '📦'; value = 20;
        }
      }
      if (!name) return;
      const div = document.createElement('div');
      div.className = 'market-item';
      div.innerHTML = `<div class="emoji">${emoji}</div><div class="name">${name} x${amt}</div><div class="price">${value}💰 ea</div>`;
      div.onclick = () => {
        if (this.inventory[key] > 0) {
          this.inventory[key]--;
          this.coins += value;
          this.totalEarned += value;
          generateRewards20(Math.floor(value * 0.5));
          this.updateCoins();
          this.tryCompleteQuest();
          this.playTone(600, 0.1, 'sine', 0.06);
          this.openMarket();
        }
      };
      sellList.appendChild(div);
    });

    const animalShop = document.getElementById('animal-shop');
    animalShop.innerHTML = '';
    ANIMALS.forEach(a => {
      const div = document.createElement('div');
      div.className = 'market-item';
      const owned = this.animalPen.filter(x => x.type === a.id).length;
      div.innerHTML = `<div class="emoji">${a.emoji}</div><div class="name">${a.name}</div><div class="price">${a.cost}💰</div><div class="desc">${a.product ? a.prodEmoji + ' ' + a.product : 'Speed boost'}</div><div style="color:#888;font-size:10px">Owned: ${owned}</div>`;
      div.onclick = () => {
        if (this.coins >= a.cost && this.animalPen.length < 10) {
          this.coins -= a.cost;
          this.animalPen.push({ type: a.id, happiness: 50, prodTimer: 0 });
          this.playTone(400, 0.2, 'sine', 0.06);
          this.openMarket();
        }
      };
      animalShop.appendChild(div);
    });

    const upgradeShop = document.getElementById('upgrade-shop');
    upgradeShop.innerHTML = '';
    const upgrades = [
      { id: 'waterCan', name: 'Better Watering Can', desc: 'Water more efficiently', cost: 200, max: 3 },
      { id: 'hoe', name: 'Better Hoe', desc: 'Faster crop growth', cost: 250, max: 3 },
      { id: 'bagSize', name: 'Bigger Bag', desc: 'Harvest more per crop', cost: 300, max: 3 },
      { id: 'expanded', name: 'Farm Expansion', desc: 'Expand farm grid', cost: 1000, max: 1 },
    ];
    upgrades.forEach(u => {
      const current = this.upgrades[u.id] || 0;
      const div = document.createElement('div');
      div.className = 'market-item';
      const done = current >= u.max;
      div.innerHTML = `<div class="name">${u.name}</div><div class="desc">${u.desc}</div><div class="price">${done ? 'MAX' : u.cost + '💰'}</div><div style="color:#888;font-size:10px">Level ${current}/${u.max}</div>`;
      if (!done) {
        div.onclick = () => {
          if (this.coins >= u.cost) {
            this.coins -= u.cost;
            this.upgrades[u.id] = current + 1;
            if (u.id === 'expanded') {
              this.FARM_W += 4;
              this.FARM_H += 3;
              for (let y = 0; y < this.FARM_H; y++) {
                if (!this.farmGrid[y]) this.farmGrid[y] = [];
                for (let x = 0; x < this.FARM_W; x++) {
                  if (!this.farmGrid[y][x]) this.farmGrid[y][x] = { tilled: false, watered: false, crop: null, growth: 0, growTarget: 0 };
                }
              }
            }
            if (u.id === 'waterCan') this.maxEnergy += 10;
            this.playTone(700, 0.2, 'sine', 0.08);
            this.openMarket();
          }
        };
      }
      upgradeShop.appendChild(div);
    });

    this.state = 'market';
    this.showScreen('market-screen');
  }

  closeMarket() {
    this.state = 'playing';
    this.showScreen('game-screen');
    this.updateHud();
    this.buildToolbar();
    this.saveFarm();
  }

  enterFestival() {
    // Calculate score based on harvests this season
    let score = 0;
    Object.entries(this.inventory).forEach(([key, amt]) => {
      const c = CROPS.find(x => x.id === key);
      if (c) score += amt * c.sellPrice;
    });
    this.festivalScore = score;

    const tier = score >= 500 ? '🏆 GOLD' : score >= 300 ? '🥈 SILVER' : score >= 100 ? '🥉 BRONZE' : '😅 Participation';
    const reward = score >= 500 ? 500 : score >= 300 ? 250 : score >= 100 ? 100 : 30;

    if (score >= 300) this.festivalWins++;

    generateRewards20(reward);
    this.updateCoins();

    document.getElementById('festival-content').innerHTML =
      `Season ${this.season} Harvest Festival!<br><br>Your harvest value: <span style="color:#ff0">${score}💰</span><br>Award: <b>${tier}</b><br><br>Animals: ${this.animalPen.length}<br>Quests completed: ${this.questsCompleted}`;
    document.getElementById('festival-reward').textContent = `+${reward} 🪙 ${tier} AWARD!`;
    this.state = 'festival';
    this.showScreen('festival-screen');
    this.playTone(523, 0.2, 'sine', 0.08);
    setTimeout(() => this.playTone(659, 0.2, 'sine', 0.08), 100);
    setTimeout(() => this.playTone(784, 0.3, 'sine', 0.1), 200);
  }

  closeFestival() {
    this.state = 'playing';
    this.showScreen('game-screen');
    this.updateHud();
    this.saveFarm();
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

  addParticles(x, y, color, count=6) {
    for (let i = 0; i < count; i++) {
      this.particles.push({ x, y, vx: (Math.random()-0.5)*4, vy: -Math.random()*3, life: 30, color });
    }
  }

  updateInfoBar() {
    const bar = document.getElementById('info-bar');
    if (!this.hoverTile || this.state !== 'playing') { bar.textContent = ''; return; }
    const tx = this.hoverTile.x, ty = this.hoverTile.y;
    if (tx < 0 || tx >= this.FARM_W || ty < 0 || ty >= this.FARM_H) { bar.textContent = ''; return; }
    const tile = this.farmGrid[ty][tx];
    let info = `[${tx},${ty}] `;
    if (!tile.tilled) info += 'Untilled grass';
    else if (tile.crop) {
      const c = CROPS.find(x => x.id === tile.crop);
      const pct = Math.min(100, Math.floor((tile.growth / tile.growTarget) * 100));
      info += `${c.emoji} ${c.name} - ${pct}% grown${tile.watered ? ' 💧' : ''}${pct >= 100 ? ' ✅ READY!' : ''}`;
    } else {
      info += 'Tilled soil (ready for planting)';
    }
    if (this.currentQuest) info += ` | 📋 Quest: ${this.currentQuest.text.substring(0, 40)}...`;
    bar.innerHTML = info;
  }

  updateHud() {
    document.getElementById('hud-day').textContent = `Day ${this.day}/${DAYS_PER_SEASON}`;
    document.getElementById('hud-season').textContent = `${SEASON_EMOJI[this.seasonIdx]} ${this.season} Y${this.year}`;
    document.getElementById('hud-coins').textContent = `💰 ${this.coins}`;
    document.getElementById('hud-energy').textContent = `⚡ ${Math.floor(this.energy)}/${this.maxEnergy}`;
    const h = Math.floor(this.hour);
    const m = Math.floor((this.hour - h) * 60);
    document.getElementById('hud-time').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  render() {
    const ctx = this.ctx;
    const T = this.TILE;
    ctx.clearRect(0, 0, this.CW, this.CH);

    const seasonBg = ['#0a1a0a', '#1a1a0a', '#1a0f0a', '#0a0a1a'];
    ctx.fillStyle = seasonBg[this.seasonIdx];
    ctx.fillRect(0, 0, this.CW, this.CH);

    // Draw farm tiles
    for (let y = 0; y < this.FARM_H; y++) {
      for (let x = 0; x < this.FARM_W; x++) {
        const sx = x * T, sy = y * T;
        const tile = this.farmGrid[y][x];

        if (!tile.tilled) {
          // Grass
          ctx.fillStyle = this.seasonIdx === 3 ? '#2a2a3a' : `rgb(${20 + Math.sin(x+y)*10}, ${40 + Math.cos(x)*15}, ${15 + Math.sin(y)*10})`;
          ctx.fillRect(sx, sy, T, T);
          ctx.strokeStyle = 'rgba(0,255,100,0.05)';
          ctx.strokeRect(sx, sy, T, T);
        } else {
          // Tilled soil
          ctx.fillStyle = tile.watered ? '#2a1a0a' : '#3a2a1a';
          ctx.fillRect(sx, sy, T, T);
          ctx.strokeStyle = '#4a3a2a';
          ctx.strokeRect(sx, sy, T, T);

          if (tile.crop) {
            const cropDef = CROPS.find(c => c.id === tile.crop);
            const pct = Math.min(1, tile.growth / tile.growTarget);
            // Growth stage rendering
            if (pct < 0.33) {
              ctx.fillStyle = '#4a4';
              ctx.fillRect(sx + 14, sy + 20, 4, 8);
            } else if (pct < 0.66) {
              ctx.fillStyle = '#4a4';
              ctx.fillRect(sx + 14, sy + 14, 4, 14);
              ctx.fillStyle = '#6c6';
              ctx.beginPath();
              ctx.arc(sx + 16, sy + 12, 6, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillStyle = pct >= 1 ? '#af8' : '#6c6';
              ctx.fillRect(sx + 14, sy + 12, 4, 16);
              ctx.font = '16px serif';
              ctx.textAlign = 'center';
              ctx.fillText(cropDef.emoji, sx + 16, sy + 12);
              if (pct >= 1) {
                // Glow for ready
                ctx.shadowColor = '#ff0';
                ctx.shadowBlur = 8;
                ctx.fillText(cropDef.emoji, sx + 16, sy + 12);
                ctx.shadowBlur = 0;
              }
            }
            if (tile.watered) {
              ctx.fillStyle = 'rgba(0,100,255,0.15)';
              ctx.fillRect(sx, sy, T, T);
            }
          }
        }

        // Hover highlight
        if (this.hoverTile && this.hoverTile.x === x && this.hoverTile.y === y) {
          ctx.strokeStyle = this.selectedTool === 'remove' ? 'rgba(255,0,0,0.8)' : 'rgba(0,255,100,0.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx, sy, T, T);
          ctx.lineWidth = 1;
        }
      }
    }

    // Animal pen area
    const penX = this.FARM_W * T + 10;
    if (penX < this.CW - 40) {
      ctx.fillStyle = 'rgba(100,80,60,0.2)';
      ctx.fillRect(penX, 10, this.CW - penX - 10, this.CH - 20);
      ctx.strokeStyle = '#864';
      ctx.strokeRect(penX, 10, this.CW - penX - 10, this.CH - 20);
      ctx.fillStyle = '#a84';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ANIMAL PEN', penX + (this.CW - penX - 10)/2, 25);

      this.animalPen.forEach((a, i) => {
        const aDef = ANIMALS.find(x => x.id === a.type);
        const ax = penX + 15 + (i % 3) * 40;
        const ay = 35 + Math.floor(i / 3) * 45;
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.fillText(aDef.emoji, ax + 16, ay + 24);
        // Happiness indicator
        ctx.fillStyle = a.happiness > 70 ? '#0f0' : a.happiness > 30 ? '#ff0' : '#f00';
        ctx.fillRect(ax, ay + 28, 32 * (a.happiness / 100), 3);
      });
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    // Season transition effects
    const time = Date.now() / 1000;
    if (this.seasonIdx === 3) { // Winter snow
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.random()*0.2})`;
        ctx.fillRect(Math.random() * this.CW, (time * 20 + i * 100) % this.CH, 2, 2);
      }
    }
  }

  loop() {
    if (this.state === 'playing') {
      this.render();
      this.updateHud();
      this.tryCompleteQuest();
    }
    requestAnimationFrame(() => this.loop());
  }
}

const game = new SunriseAcres();
