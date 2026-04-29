// ═══════════════════════════════════════════════════
// NGN4 Game 21: DATA EMPIRE — Business Tycoon
// ═══════════════════════════════════════════════════

(function() {
  'use strict';

  // ── Audio Engine ──
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  function initAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
  function playTone(freq, dur, type = 'square', vol = 0.08) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + dur);
  }
  function sfxClick() { playTone(800, 0.08); playTone(1200, 0.06, 'sine', 0.05); }
  function sfxBuy() { playTone(440, 0.1, 'triangle'); playTone(660, 0.1, 'triangle'); }
  function sfxPrestige() { playTone(523, 0.3, 'sine', 0.1); playTone(659, 0.3, 'sine', 0.1); playTone(784, 0.5, 'sine', 0.1); }
  function sfxEvent() { playTone(300, 0.2, 'sawtooth', 0.06); playTone(500, 0.3, 'sawtooth', 0.06); }
  function sfxGolden() { playTone(1000, 0.15, 'sine', 0.1); playTone(1200, 0.15, 'sine', 0.1); playTone(1500, 0.2, 'sine', 0.1); }

  // ── Rewards ──
  function loadRewards() {
    try {
      const d = JSON.parse(localStorage.getItem('ngn4_rewards') || '{}');
      return { coins: d.coins || 0, gems: d.gems || 0 };
    } catch(e) { return { coins: 0, gems: 0 }; }
  }
  function saveRewards(r) {
    try { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); } catch(e) {}
  }

  // ── Save/Load Game ──
  const SAVE_KEY = 'ngn4_data_empire';
  function loadGame() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (d) return d;
    } catch(e) {}
    return null;
  }
  function saveGame() {
    const d = {
      money, totalEarned, clickPower, prestigeCount, prestigeMultiplier,
      transcendCount, transcendMultiplier, doubleIncomeTimer, stockShares, stockHistory,
      businesses, managerHired, achievements, marketEvent, stockPrice,
      clickUpgrades, bizUpgrades, buyQuantity, lastSaveTime, totalClicks, totalTimePlayed,
      goldenCookieTimer
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch(e) {}
  }

  // ── Business Definitions ──
  const BIZ_DEFS = [
    { name: 'Startup', icon: '🚀', baseCost: 15, baseIncome: 1, costMult: 1.15, unlockCost: 0 },
    { name: 'App', icon: '📱', baseCost: 100, baseIncome: 8, costMult: 1.15, unlockCost: 50 },
    { name: 'Platform', icon: '🌐', baseCost: 1100, baseIncome: 47, costMult: 1.14, unlockCost: 500 },
    { name: 'Cloud Service', icon: '☁️', baseCost: 12000, baseIncome: 260, costMult: 1.13, unlockCost: 5000 },
    { name: 'AI Division', icon: '🤖', baseCost: 130000, baseIncome: 1400, costMult: 1.12, unlockCost: 50000 },
    { name: 'Quantum Lab', icon: '⚛️', baseCost: 1400000, baseIncome: 7800, costMult: 1.11, unlockCost: 500000 },
    { name: 'Space Corp', icon: '🛸', baseCost: 20000000, baseIncome: 44000, costMult: 1.10, unlockCost: 10000000 },
    { name: 'Galactic Empire', icon: '🌌', baseCost: 330000000, baseIncome: 260000, costMult: 1.09, unlockCost: 100000000 }
  ];

  const MANAGER_COST = [50, 500, 5000, 50000, 500000, 5000000, 50000000, 500000000];

  const BIZ_UPGRADES = [
    { name: '2x', mult: 2, costMult: 100 },
    { name: '3x', mult: 3, costMult: 500 },
    { name: 'Auto-Mgr', mult: 1, costMult: 1000, isAutoManager: true }
  ];

  const CLICK_UPGRADES = [
    { id: 'double_click', name: 'Double Click Power', desc: '2x click power', cost: 500, effect: () => { clickPower *= 2; }, bought: false },
    { id: 'click_storm', name: 'Click Storm', desc: 'Auto-click for 10s', cost: 2000, effect: () => { clickStormTimer = 600; }, bought: false, repeatable: true },
    { id: 'crit_click', name: 'Critical Click', desc: '10% chance of 10x click', cost: 5000, effect: () => { critClickChance += 0.1; }, bought: false },
  ];

  const GOLDEN_EVENTS = [
    { name: '🟡 FRENZY!', desc: '7x production for 30s!', mult: 7, duration: 30000, type: 'frenzy' },
    { name: '🟡 CLICK FRENZY!', desc: '777x click power for 10s!', mult: 777, duration: 10000, type: 'click_frenzy' },
    { name: '🟡 BONUS!', desc: 'Instant cash bonus!', mult: 0, duration: 0, type: 'instant', bonusMult: 0.1 }
  ];

  const MARKET_EVENTS = [
    { name: '🚀 BOOM! Tech stocks surge!', mult: 3, duration: 30000 },
    { name: '📉 BUST! Market crashes!', mult: 0.3, duration: 30000 },
    { name: '📰 Viral PR! Income +50%!', mult: 1.5, duration: 20000 },
    { name: '⚡ Innovation breakthrough! 2x income!', mult: 2, duration: 15000 },
    { name: '🔬 R&D bonus! Click power x3!', mult: 1, duration: 20000, clickBoost: 3 },
    { name: '💸 Investor funding! $5000 bonus!', mult: 1, duration: 1, cashBonus: 5000 },
  ];

  const ACHIEVEMENTS = [
    { id: 'first_click', name: 'First Click', desc: 'Generate your first revenue', check: () => totalEarned >= 1 },
    { id: 'first_biz', name: 'Entrepreneur', desc: 'Buy your first business', check: () => businesses.reduce((s,b) => s + b.count, 0) >= 1 },
    { id: 'all_biz', name: 'Diversified', desc: 'Own all 8 business types', check: () => businesses.filter(b => b.count > 0).length >= 8 },
    { id: 'first_manager', name: 'Delegator', desc: 'Hire your first manager', check: () => managerHired.filter(h => h).length >= 1 },
    { id: 'all_managers', name: 'CEO', desc: 'Hire all managers', check: () => managerHired.filter(h => h).length >= 8 },
    { id: 'rich_1', name: 'Millionaire', desc: 'Earn $1,000,000 total', check: () => totalEarned >= 1000000 },
    { id: 'rich_2', name: 'Billionaire', desc: 'Earn $1,000,000,000 total', check: () => totalEarned >= 1000000000 },
    { id: 'prestige_1', name: 'Rebirth', desc: 'Prestige for the first time', check: () => prestigeCount >= 1 },
    { id: 'prestige_5', name: 'Veteran', desc: 'Prestige 5 times', check: () => prestigeCount >= 5 },
    { id: 'transcend_1', name: 'Ascended', desc: 'Transcend for the first time', check: () => transcendCount >= 1 },
    { id: 'stock_profit', name: 'Wall Street', desc: 'Sell stocks for profit', check: () => achievements.earned.has('stock_profit') },
    { id: 'click_100', name: 'Click Master', desc: 'Click 100 times', check: () => totalClicks >= 100 },
    { id: 'click_1000', name: 'Click Legend', desc: 'Click 1000 times', check: () => totalClicks >= 1000 },
    { id: 'golden_1', name: 'Golden Touch', desc: 'Click a golden cookie', check: () => achievements.earned.has('golden_click') },
    { id: 'offline_earn', name: 'Executive', desc: 'Earn from offline time', check: () => achievements.earned.has('offline_earned') },
    { id: 'all_upgrades', name: 'Maxed Out', desc: 'Buy all click upgrades', check: () => clickUpgrades.every(u => u.bought && !u.repeatable) },
  ];

  // ── Game State ──
  let money = 0;
  let totalEarned = 0;
  let clickPower = 1;
  let prestigeCount = 0;
  let prestigeMultiplier = 1;
  let transcendCount = 0;
  let transcendMultiplier = 1;
  let doubleIncomeTimer = 0;
  let stockShares = 0;
  let stockPrice = 100;
  let stockHistory = [];
  let stockInterval = null;
  let totalClicks = 0;
  let totalTimePlayed = 0;
  let businesses = [];
  let managerHired = [];
  let achievements = { earned: new Set() };
  let marketEvent = null;
  let marketEventTimer = 0;
  let nextEventTime = 30000 + Math.random() * 60000;
  let lastTime = 0;
  let lastSaveTime = 0;
  let rewards = loadRewards();
  let gameRunning = false;
  let autoSaveInterval = null;

  // Buy quantity
  let buyQuantity = 1;

  // Click upgrades
  let clickUpgrades = CLICK_UPGRADES.map(u => ({...u}));
  let critClickChance = 0;
  let clickStormTimer = 0;
  let coinsExtracted = 0;

  // Per-business upgrades
  let bizUpgrades = {}; // { bizIdx: [level0, level1, level2] }

  // Golden cookie
  let goldenCookieTimer = 0;
  let goldenCookieActive = false;
  let goldenCookieTimeout = null;
  let goldenEvent = null;
  let goldenEventTimer = 0;
  let goldenFrenzyTimer = 0;

  function initBusinesses() {
    businesses = BIZ_DEFS.map(def => ({
      ...def,
      count: 0,
      incomeTimer: 0,
      incomeInterval: 1000
    }));
    managerHired = new Array(8).fill(false);
    for (let i = 0; i < 100; i++) {
      stockPrice += (Math.random() - 0.48) * 5;
      stockPrice = Math.max(10, stockPrice);
      stockHistory.push(stockPrice);
    }
  }

  function getBizCost(idx, count) {
    const def = BIZ_DEFS[idx];
    let cost = def.baseCost;
    const qty = count || buyQuantity;
    for (let i = 0; i < businesses[idx].count; i++) {
      cost = Math.floor(cost * def.costMult);
    }
    if (qty === 1) return cost;
    // Sum of geometric series
    let total = 0;
    for (let i = 0; i < qty; i++) {
      total += cost;
      cost = Math.floor(cost * def.costMult);
    }
    return total;
  }

  function getMaxBuyable(idx) {
    let count = 0;
    let cost = BIZ_DEFS[idx].baseCost;
    for (let i = 0; i < businesses[idx].count; i++) {
      cost = Math.floor(cost * BIZ_DEFS[idx].costMult);
    }
    let total = 0;
    while (total + cost <= money) {
      total += cost;
      cost = Math.floor(cost * BIZ_DEFS[idx].costMult);
      count++;
      if (count > 10000) break;
    }
    return count;
  }

  function getBuyCount(idx) {
    if (buyQuantity === -1) return getMaxBuyable(idx);
    return Math.min(buyQuantity, getMaxBuyable(idx));
  }

  function getBizUpgradeCost(idx, level) {
    return Math.floor(BIZ_DEFS[idx].baseCost * BIZ_UPGRADES[level].costMult);
  }

  function getIncomePerSec() {
    let ips = 0;
    const eventMult = marketEvent ? marketEvent.mult : 1;
    const doubleMult = doubleIncomeTimer > 0 ? 2 : 1;
    const goldenMult = goldenFrenzyTimer > 0 ? 7 : 1;
    businesses.forEach((b, i) => {
      if (b.count > 0) {
        let bizMult = 1;
        // Apply per-business upgrades
        if (bizUpgrades[i]) {
          for (let lvl = 0; lvl < 3; lvl++) {
            if (bizUpgrades[i][lvl]) {
              bizMult *= BIZ_UPGRADES[lvl].mult;
            }
          }
        }
        ips += (b.baseIncome * b.count * prestigeMultiplier * transcendMultiplier * eventMult * doubleMult * goldenMult * bizMult) / (b.incomeInterval / 1000);
      }
    });
    return ips;
  }

  function formatMoney(n) {
    if (n < 0) return '-' + formatMoney(-n);
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K';
    return '$' + Math.floor(n).toLocaleString();
  }

  // ── DOM Refs ──
  const $ = id => document.getElementById(id);
  const menuScreen = $('menu-screen');
  const howScreen = $('how-screen');
  const gameScreen = $('game-screen');
  const stockScreen = $('stock-screen');
  const adScreen = $('ad-screen');
  const prestigeScreen = $('prestige-screen');
  const statsScreen = $('stats-screen');
  const transcendScreen = $('transcend-screen');

  function showScreen(screen) {
    [menuScreen, howScreen, gameScreen, stockScreen, adScreen, prestigeScreen, statsScreen, transcendScreen].forEach(s => s.style.display = 'none');
    screen.style.display = 'block';
  }

  // ── Offline Earnings ──
  function calculateOfflineEarnings() {
    const saved = loadGame();
    if (!saved || !saved.lastSaveTime) return 0;

    const now = Date.now();
    const elapsed = Math.min(now - saved.lastSaveTime, 24 * 60 * 60 * 1000); // Cap at 24h
    if (elapsed < 60000) return 0; // Less than 1 min = no offline earnings

    const seconds = elapsed / 1000;
    // Calculate what the IPS would have been at save time
    let ips = 0;
    if (saved.businesses) {
      saved.businesses.forEach((b, i) => {
        if (b.count > 0) {
          let bizMult = 1;
          if (saved.bizUpgrades && saved.bizUpgrades[i]) {
            for (let lvl = 0; lvl < 3; lvl++) {
              if (saved.bizUpgrades[i][lvl]) bizMult *= BIZ_UPGRADES[lvl].mult;
            }
          }
          const pm = saved.prestigeMultiplier || 1;
          const tm = saved.transcendMultiplier || 1;
          ips += (BIZ_DEFS[i].baseIncome * b.count * pm * tm * bizMult) / (b.incomeInterval / 1000);
        }
      });
    }

    const offlineEarnings = Math.floor(ips * seconds * 0.5); // 50% efficiency
    return offlineEarnings;
  }

  function showOfflinePopup(amount) {
    if (amount <= 0) return;
    achievements.earned.add('offline_earned');
    const popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.95);border:2px solid #ffaa00;padding:30px 40px;z-index:10000;font-family:Orbitron,sans-serif;text-align:center;color:#fff;max-width:90vw;';
    popup.innerHTML = `
      <div style="font-size:24px;color:#ffaa00;margin-bottom:15px;">📱 WELCOME BACK!</div>
      <div style="color:#ccc;font-size:14px;margin-bottom:10px;">Your businesses were earning while you were away!</div>
      <div style="font-size:28px;color:#0f0;margin:15px 0;">${formatMoney(amount)}</div>
      <div style="color:#888;font-size:12px;">(50% efficiency while offline)</div>
      <button onclick="this.parentElement.remove();" style="margin-top:20px;padding:10px 30px;background:#0a4;color:#fff;border:1px solid #0f0;border-radius:5px;cursor:pointer;font-family:monospace;font-size:14px;">COLLECT</button>
    `;
    document.body.appendChild(popup);
    money += amount;
    totalEarned += amount;
  }

  // ── UI Update ──
  function updateUI() {
    $('income-display').textContent = formatMoney(money);
    const ips = getIncomePerSec();
    $('per-sec').textContent = '(' + formatMoney(ips) + '/s)';
    const mult = prestigeMultiplier * transcendMultiplier;
    $('multiplier-display').textContent = 'x' + mult.toFixed(1) + (doubleIncomeTimer > 0 ? ' 🔥2X' : '') + (goldenFrenzyTimer > 0 ? ' 🟡7X' : '');
    $('gems-display').textContent = rewards.gems;
    $('coins-display').textContent = rewards.coins;
    $('stat-total').textContent = formatMoney(totalEarned);
    $('stat-biz').textContent = businesses.filter(b => b.count > 0).length;
    $('stat-prestige').textContent = prestigeCount;
    $('stat-mult').textContent = 'x' + mult.toFixed(1);

    renderBusinesses();

    const banner = $('event-banner');
    if (goldenFrenzyTimer > 0) {
      banner.style.display = 'block';
      banner.textContent = '🟡 GOLDEN FRENZY! 7x production! ' + Math.ceil(goldenFrenzyTimer / 1000) + 's';
      banner.style.borderColor = '#ffaa00';
    } else if (marketEvent && marketEvent.duration > 1) {
      banner.style.display = 'block';
      banner.textContent = marketEvent.name;
      banner.style.borderColor = '';
    } else {
      banner.style.display = 'none';
    }

    // Click storm timer
    const stormEl = $('click-storm-timer');
    if (stormEl) {
      if (clickStormTimer > 0) {
        stormEl.style.display = 'block';
        stormEl.textContent = `⚡ Click Storm: ${Math.ceil(clickStormTimer / 60)}s`;
      } else {
        stormEl.style.display = 'none';
      }
    }
  }

  function renderBusinesses() {
    const list = $('business-list');
    list.innerHTML = '';

    // Buy quantity toggle
    const qtyDiv = document.createElement('div');
    qtyDiv.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;justify-content:center;';
    [1, 10, 100, -1].forEach(q => {
      const btn = document.createElement('button');
      btn.style.cssText = `padding:4px 10px;background:${buyQuantity === q ? '#2a2a4a' : '#1a1a2e'};color:${buyQuantity === q ? '#ffaa00' : '#888'};border:1px solid ${buyQuantity === q ? '#ffaa00' : '#333'};border-radius:3px;cursor:pointer;font-family:monospace;font-size:11px;`;
      btn.textContent = q === -1 ? 'MAX' : 'x' + q;
      btn.onclick = (e) => { e.preventDefault(); buyQuantity = q; renderBusinesses(); };
      qtyDiv.appendChild(btn);
    });
    list.appendChild(qtyDiv);

    businesses.forEach((b, i) => {
      const qty = buyQuantity === -1 ? getMaxBuyable(i) : buyQuantity;
      const cost = getBizCost(i, qty);
      const canAfford = money >= cost && totalEarned >= b.unlockCost;
      const locked = totalEarned < b.unlockCost;
      const hasManager = managerHired[i];
      const progress = (b.incomeTimer / b.incomeInterval) * 100;

      const div = document.createElement('div');
      div.className = 'biz-item' + (locked ? ' locked' : '');

      // Per-business upgrade indicators
      let upgradeIndicators = '';
      if (bizUpgrades[i]) {
        for (let lvl = 0; lvl < 3; lvl++) {
          if (bizUpgrades[i][lvl]) {
            upgradeIndicators += `<span style="color:#ffaa00;font-size:10px;">${BIZ_UPGRADES[lvl].name}</span> `;
          }
        }
      }

      div.innerHTML = `
        <div class="biz-name">${b.icon} ${b.name} <span style="color:#888;font-size:0.75em">x${b.count}</span></div>
        <div class="biz-info">${locked ? '🔒 Unlock at ' + formatMoney(b.unlockCost) + ' total' : formatMoney(b.baseIncome * b.count * prestigeMultiplier * transcendMultiplier) + ' / ' + (b.incomeInterval/1000) + 's'}</div>
        ${upgradeIndicators ? '<div style="margin:2px 0;">' + upgradeIndicators + '</div>' : ''}
        ${hasManager ? '<div class="biz-manager">👤 Manager Active</div>' : ''}
        <div class="biz-progress"><div class="biz-progress-fill" style="width:${progress}%"></div></div>
        <button class="biz-btn" ${(!canAfford || locked) ? 'disabled' : ''} data-idx="${i}">
          BUY x${qty === -1 ? getMaxBuyable(i) : qty} — ${formatMoney(cost)} ${locked ? '(LOCKED)' : ''}
        </button>
        ${!hasManager && b.count > 0 ? `<button class="biz-btn" style="border-color:#ffaa00;color:#ffaa00;margin-top:4px" data-mgr="${i}">HIRE MANAGER — ${formatMoney(MANAGER_COST[i])}</button>` : ''}
        <div style="margin-top:4px;">
          ${BIZ_UPGRADES.map((up, lvl) => {
            const owned = bizUpgrades[i] && bizUpgrades[i][lvl];
            const upCost = getBizUpgradeCost(i, lvl);
            if (!owned && b.count > 0) {
              return `<button class="biz-btn" style="font-size:10px;padding:2px 6px;border-color:#aa88ff;color:#aa88ff;" data-bizup="${i}-${lvl}">${up.name} ${BIZ_DEFS[i].name} — ${formatMoney(upCost)}</button>`;
            }
            return '';
          }).join('')}
        </div>
      `;
      list.appendChild(div);
    });

    list.querySelectorAll('[data-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(btn.dataset.idx);
        const qty = buyQuantity === -1 ? getMaxBuyable(idx) : buyQuantity;
        for (let q = 0; q < qty; q++) buyBusiness(idx);
      });
    });
    list.querySelectorAll('[data-mgr]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(btn.dataset.mgr);
        hireManager(idx);
      });
    });
    list.querySelectorAll('[data-bizup]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const [idx, lvl] = btn.dataset.bizup.split('-').map(Number);
        buyBizUpgrade(idx, lvl);
      });
    });
  }

  function buyBusiness(idx) {
    const cost = getBizCost(idx, 1);
    if (money >= cost) {
      money -= cost;
      businesses[idx].count++;
      sfxBuy();
    }
  }

  function hireManager(idx) {
    if (money >= MANAGER_COST[idx] && businesses[idx].count > 0 && !managerHired[idx]) {
      money -= MANAGER_COST[idx];
      managerHired[idx] = true;
      sfxBuy();
      playTone(880, 0.2, 'sine', 0.08);
    }
  }

  function buyBizUpgrade(idx, lvl) {
    if (!bizUpgrades[idx]) bizUpgrades[idx] = [false, false, false];
    if (bizUpgrades[idx][lvl]) return;
    const cost = getBizUpgradeCost(idx, lvl);
    if (money >= cost) {
      money -= cost;
      bizUpgrades[idx][lvl] = true;
      if (BIZ_UPGRADES[lvl].isAutoManager) {
        managerHired[idx] = true;
      }
      sfxPrestige();
    }
  }

  // ── Revenue Click ──
  function doClick() {
    initAudio();
    const mult = marketEvent && marketEvent.clickBoost ? marketEvent.clickBoost : 1;
    const goldenMult = goldenFrenzyTimer > 0 ? 7 : 1;
    let earned = clickPower * prestigeMultiplier * transcendMultiplier * mult * goldenMult;

    // Critical click
    if (critClickChance > 0 && Math.random() < critClickChance) {
      earned *= 10;
      const popup = document.createElement('div');
      popup.style.cssText = 'position:fixed;top:40%;left:50%;transform:translateX(-50%);color:#ff0;font-size:24px;font-family:Orbitron;z-index:9999;pointer-events:none;';
      popup.textContent = '💥 CRITICAL! x10';
      document.body.appendChild(popup);
      setTimeout(() => popup.remove(), 500);
    }

    money += earned;
    totalEarned += earned;
    totalClicks++;
    sfxClick();
    updateUI();
  }

  $('btn-click').addEventListener('click', () => doClick());

  // ── Game Loop ──
  function gameLoop(timestamp) {
    if (!gameRunning) return;
    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    totalTimePlayed += dt;

    // Double income timer
    if (doubleIncomeTimer > 0) {
      doubleIncomeTimer -= dt;
      if (doubleIncomeTimer < 0) doubleIncomeTimer = 0;
    }

    // Golden frenzy timer
    if (goldenFrenzyTimer > 0) {
      goldenFrenzyTimer -= dt;
      if (goldenFrenzyTimer < 0) goldenFrenzyTimer = 0;
    }

    // Click storm timer
    if (clickStormTimer > 0) {
      clickStormTimer--;
      if (clickStormTimer <= 0) {
        clickStormTimer = 0;
      } else if (clickStormTimer % 6 === 0) {
        doClick();
      }
    }

    // Market events
    nextEventTime -= dt;
    if (nextEventTime <= 0 && !marketEvent) {
      triggerMarketEvent();
      nextEventTime = 30000 + Math.random() * 60000;
    }
    if (marketEvent) {
      marketEventTimer -= dt;
      if (marketEventTimer <= 0) {
        marketEvent = null;
        marketEventTimer = 0;
      }
    }

    // Golden cookie spawning
    goldenCookieTimer -= dt;
    if (goldenCookieTimer <= 0 && !goldenCookieActive) {
      spawnGoldenCookie();
      goldenCookieTimer = 60000 + Math.random() * 120000; // 1-3 minutes
    }

    // Golden event timer
    if (goldenEvent) {
      goldenEventTimer -= dt;
      if (goldenEventTimer <= 0) {
        goldenEvent = null;
        goldenEventTimer = 0;
      }
    }

    // Business income
    const eventMult = marketEvent ? marketEvent.mult : 1;
    const doubleMult = doubleIncomeTimer > 0 ? 2 : 1;
    const goldenMult = goldenFrenzyTimer > 0 ? 7 : 1;
    businesses.forEach((b, i) => {
      if (b.count > 0) {
        let bizMult = 1;
        if (bizUpgrades[i]) {
          for (let lvl = 0; lvl < 3; lvl++) {
            if (bizUpgrades[i][lvl]) bizMult *= BIZ_UPGRADES[lvl].mult;
          }
        }
        const effectiveMult = eventMult * doubleMult * goldenMult * bizMult;
        b.incomeTimer += dt * effectiveMult;
        if (b.incomeTimer >= b.incomeInterval) {
          const cycles = Math.floor(b.incomeTimer / b.incomeInterval);
          b.incomeTimer -= cycles * b.incomeInterval;
          const earned = b.baseIncome * b.count * cycles * prestigeMultiplier * transcendMultiplier;
          money += earned;
          totalEarned += earned;
        }
      }
    });

    // Check achievements
    checkAchievements();

    // Coin rewards (1 coin per $1000 earned)
    const newCoins = Math.floor(totalEarned / 1000) - coinsExtracted;
    if (newCoins > 0) {
      coinsExtracted += newCoins;
      rewards.coins += newCoins;
      saveRewards(rewards);
    }

    updateUI();
    requestAnimationFrame(gameLoop);
  }

  // ── Golden Cookie ──
  function spawnGoldenCookie() {
    goldenCookieActive = true;
    const cookie = document.createElement('div');
    cookie.id = 'golden-cookie';
    cookie.style.cssText = 'position:fixed;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle,#ffd700,#ff8c00);cursor:pointer;z-index:9999;animation:goldenPulse 0.5s infinite alternate;box-shadow:0 0 20px #ffaa00;display:flex;align-items:center;justify-content:center;font-size:24px;pointer-events:auto;';
    cookie.textContent = '✨';

    // Random position
    const x = 100 + Math.random() * (window.innerWidth - 200);
    const y = 100 + Math.random() * (window.innerHeight - 200);
    cookie.style.left = x + 'px';
    cookie.style.top = y + 'px';

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = '@keyframes goldenPulse { from { transform: scale(1); } to { transform: scale(1.2); } }';
    if (!document.getElementById('golden-style')) { style.id = 'golden-style'; document.head.appendChild(style); }

    cookie.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      clickGoldenCookie(cookie);
    };

    document.body.appendChild(cookie);
    sfxGolden();

    // Auto-disappear after 3 seconds
    goldenCookieTimeout = setTimeout(() => {
      removeGoldenCookie();
    }, 3000);
  }

  function clickGoldenCookie(cookie) {
    clearTimeout(goldenCookieTimeout);
    removeGoldenCookie();

    const event = GOLDEN_EVENTS[Math.floor(Math.random() * GOLDEN_EVENTS.length)];
    goldenEvent = { ...event };
    achievements.earned.add('golden_click');
    sfxPrestige();

    switch (event.type) {
      case 'frenzy':
        goldenFrenzyTimer = event.duration;
        goldenEventTimer = event.duration;
        showGoldenPopup(event.name, event.desc);
        break;
      case 'click_frenzy':
        goldenFrenzyTimer = 0; // Don't double with frenzy
        clickPower *= 777;
        goldenEventTimer = event.duration;
        showGoldenPopup(event.name, event.desc);
        setTimeout(() => { clickPower = Math.max(1, clickPower / 777); }, event.duration);
        break;
      case 'instant':
        const bonus = totalEarned * event.bonusMult;
        money += bonus;
        totalEarned += bonus;
        showGoldenPopup(event.name, `+${formatMoney(bonus)}!`);
        break;
    }
  }

  function removeGoldenCookie() {
    goldenCookieActive = false;
    const cookie = document.getElementById('golden-cookie');
    if (cookie) cookie.remove();
  }

  function showGoldenPopup(name, desc) {
    const popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:30%;left:50%;transform:translateX(-50%);background:rgba(20,15,0,0.95);border:2px solid #ffd700;padding:20px 30px;z-index:10000;font-family:Orbitron;text-align:center;pointer-events:none;';
    popup.innerHTML = `<div style="font-size:22px;color:#ffd700;">${name}</div><div style="color:#ccc;font-size:14px;margin-top:8px;">${desc}</div>`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
  }

  function triggerMarketEvent() {
    const evt = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
    marketEvent = { ...evt };
    marketEventTimer = evt.duration;
    if (evt.cashBonus) {
      money += evt.cashBonus;
      totalEarned += evt.cashBonus;
    }
    sfxEvent();
  }

  function checkAchievements() {
    ACHIEVEMENTS.forEach(a => {
      if (!achievements.earned.has(a.id) && a.check()) {
        achievements.earned.add(a.id);
        rewards.gems += 5;
        saveRewards(rewards);
        sfxPrestige();
        showAchievementPopup(a.name, a.desc);
      }
    });
  }

  function showAchievementPopup(name, desc) {
    const popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1a1a2e;border:2px solid #ffaa00;padding:15px 25px;z-index:9999;font-family:Orbitron,sans-serif;text-align:center;animation:pulse-glow 1s;';
    popup.innerHTML = `<div style="color:#ffaa00;font-size:0.85em">🏆 ACHIEVEMENT: ${name}</div><div style="color:#888;font-size:0.7em;margin-top:5px">${desc} (+5💎)</div>`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
  }

  // ── Stock Market ──
  const stockCanvas = $('stock-canvas');
  const stockCtx = stockCanvas.getContext('2d');

  $('btn-stock').addEventListener('click', () => {
    showScreen(stockScreen);
    drawStockChart();
  });
  $('btn-close-stock').addEventListener('click', () => showScreen(gameScreen));

  $('btn-buy-stock').addEventListener('click', () => {
    initAudio();
    if (money >= 100) {
      money -= 100;
      stockShares += Math.floor(100 / Math.max(1, stockPrice));
      sfxBuy();
      $('portfolio-val').textContent = formatMoney(stockShares * stockPrice);
    }
  });
  $('btn-sell-stock').addEventListener('click', () => {
    initAudio();
    if (stockShares > 0) {
      const val = stockShares * stockPrice;
      money += val;
      if (val > 0) achievements.earned.add('stock_profit');
      stockShares = 0;
      sfxPrestige();
      $('portfolio-val').textContent = '$0';
    }
  });

  function updateStock() {
    stockPrice += (Math.random() - 0.48) * 3;
    stockPrice = Math.max(5, stockPrice);
    stockHistory.push(stockPrice);
    if (stockHistory.length > 100) stockHistory.shift();
  }

  function drawStockChart() {
    const w = stockCanvas.width, h = stockCanvas.height;
    stockCtx.clearRect(0, 0, w, h);
    stockCtx.fillStyle = '#0a0a15';
    stockCtx.fillRect(0, 0, w, h);

    if (stockHistory.length < 2) return;
    const min = Math.min(...stockHistory) * 0.9;
    const max = Math.max(...stockHistory) * 1.1;
    const range = max - min || 1;

    stockCtx.strokeStyle = '#1a1a2e';
    stockCtx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = h * 0.1 + (h * 0.8 / 4) * i;
      stockCtx.beginPath(); stockCtx.moveTo(0, y); stockCtx.lineTo(w, y); stockCtx.stroke();
      const val = max - (range / 4) * i;
      stockCtx.fillStyle = '#555';
      stockCtx.font = '10px JetBrains Mono';
      stockCtx.fillText('$' + val.toFixed(1), 5, y - 3);
    }

    stockCtx.beginPath();
    stockCtx.strokeStyle = '#00ffcc';
    stockCtx.lineWidth = 2;
    stockHistory.forEach((v, i) => {
      const x = (i / (stockHistory.length - 1)) * w;
      const y = h * 0.9 - ((v - min) / range) * h * 0.8;
      i === 0 ? stockCtx.moveTo(x, y) : stockCtx.lineTo(x, y);
    });
    stockCtx.stroke();

    stockCtx.shadowColor = '#00ffcc';
    stockCtx.shadowBlur = 8;
    stockCtx.stroke();
    stockCtx.shadowBlur = 0;

    stockCtx.fillStyle = stockPrice > (stockHistory[0] || 100) ? '#00ff88' : '#ff4444';
    stockCtx.font = 'bold 16px Orbitron';
    stockCtx.fillText('$' + stockPrice.toFixed(2), w - 120, 25);
    stockCtx.fillStyle = '#888';
    stockCtx.font = '11px JetBrains Mono';
    stockCtx.fillText('Shares: ' + stockShares, w - 120, 45);
    $('portfolio-val').textContent = formatMoney(stockShares * stockPrice);
  }

  // ── Stats Tab ──
  function showStats() {
    const content = $('stats-content');
    const ips = getIncomePerSec();
    const totalBiz = businesses.reduce((s, b) => s + b.count, 0);
    const timeStr = totalTimePlayed > 3600000 ? (totalTimePlayed / 3600000).toFixed(1) + 'h' :
                    totalTimePlayed > 60000 ? (totalTimePlayed / 60000).toFixed(1) + 'm' :
                    Math.floor(totalTimePlayed / 1000) + 's';

    content.innerHTML = `
      <div style="color:#ffaa00;font-size:16px;margin-bottom:15px;">📊 STATISTICS & NUMBERS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;">
        <div>Total Earned: ${formatMoney(totalEarned)}</div>
        <div>Current Money: ${formatMoney(money)}</div>
        <div>Total Clicks: ${totalClicks.toLocaleString()}</div>
        <div>Click Power: ${clickPower.toFixed(1)}</div>
        <div>Crit Chance: ${(critClickChance * 100).toFixed(0)}%</div>
        <div>Income/sec: ${formatMoney(ips)}</div>
        <div>Total Businesses: ${totalBiz}</div>
        <div>Managers: ${managerHired.filter(h => h).length}/8</div>
        <div>Prestige: ${prestigeCount} (x${prestigeMultiplier.toFixed(1)})</div>
        <div>Transcend: ${transcendCount} (x${transcendMultiplier.toFixed(1)})</div>
        <div>Total Time: ${timeStr}</div>
        <div>Stock Price: $${stockPrice.toFixed(2)}</div>
        <div>Achievements: ${achievements.earned.size}/${ACHIEVEMENTS.length}</div>
        <div>Gems: ${rewards.gems}</div>
      </div>
      <div style="margin-top:15px;color:#888;font-size:11px;">
        <div style="color:#ffaa00;margin-bottom:5px;">Business Milestones:</div>
        ${BIZ_DEFS.map(b => {
          const count = businesses.find(x => x.name === b.name)?.count || 0;
          const milestones = [25, 50, 100, 200];
          const next = milestones.find(m => count < m);
          return `${b.icon} ${b.name}: ${count}${next ? ` (next: ${next})` : ' ✅'}`;
        }).join('<br>')}
      </div>
      <div style="margin-top:15px;color:#888;font-size:11px;">
        <div style="color:#ffaa00;margin-bottom:5px;">Achievements:</div>
        ${ACHIEVEMENTS.map(a => `${achievements.earned.has(a.id) ? '✅' : '⬜'} ${a.name}: ${a.desc}`).join('<br>')}
      </div>
    `;
    showScreen(statsScreen);
  }

  // ── Prestige ──
  $('btn-prestige').addEventListener('click', () => {
    initAudio();
    if (totalEarned < 100000) return;
    const newGems = Math.floor(Math.sqrt(totalEarned / 10000));
    $('prestige-gems').textContent = newGems;
    const newMult = 1 + (prestigeCount + 1) * 0.5;
    $('prestige-mult').textContent = 'x' + newMult.toFixed(1);
    showScreen(prestigeScreen);
  });

  $('btn-do-prestige').addEventListener('click', () => {
    const newGems = Math.floor(Math.sqrt(totalEarned / 10000));
    prestigeCount++;
    prestigeMultiplier = 1 + prestigeCount * 0.5;
    rewards.gems += newGems;
    saveRewards(rewards);
    money = 0;
    totalEarned = 0;
    coinsExtracted = 0;
    clickPower = Math.max(1, clickPower); // Keep click power from click upgrades
    businesses.forEach(b => { b.count = 0; b.incomeTimer = 0; });
    managerHired = new Array(8).fill(false);
    bizUpgrades = {};
    marketEvent = null;
    achievements.earned = new Set();
    goldenCookieTimer = 60000 + Math.random() * 60000;
    sfxPrestige();
    showScreen(gameScreen);
    updateUI();
  });

  $('btn-cancel-prestige').addEventListener('click', () => showScreen(gameScreen));

  // ── Transcend (Second Prestige Layer) ──
  $('btn-transcend').addEventListener('click', () => {
    initAudio();
    if (prestigeCount < 3) return; // Need at least 3 prestiges
    const newGems = Math.floor(Math.sqrt(prestigeCount) * 10);
    const newMult = 1 + (transcendCount + 1) * 1.0;
    $('transcend-gems').textContent = newGems;
    $('transcend-mult').textContent = 'x' + newMult.toFixed(1);
    showScreen(transcendScreen);
  });

  $('btn-do-transcend').addEventListener('click', () => {
    const newGems = Math.floor(Math.sqrt(prestigeCount) * 10);
    transcendCount++;
    transcendMultiplier = 1 + transcendCount * 1.0;
    rewards.gems += newGems;
    saveRewards(rewards);
    // Reset further but keep transcend multiplier
    prestigeCount = 0;
    prestigeMultiplier = 1;
    money = 0;
    totalEarned = 0;
    coinsExtracted = 0;
    clickPower = 1;
    critClickChance = 0;
    clickUpgrades = CLICK_UPGRADES.map(u => ({...u, bought: false}));
    clickStormTimer = 0;
    businesses.forEach(b => { b.count = 0; b.incomeTimer = 0; });
    managerHired = new Array(8).fill(false);
    bizUpgrades = {};
    marketEvent = null;
    achievements.earned = new Set();
    sfxPrestige();
    setTimeout(() => sfxPrestige(), 300);
    showScreen(gameScreen);
    updateUI();
  });

  $('btn-cancel-transcend').addEventListener('click', () => showScreen(gameScreen));

  // ── Ad System ──
  $('btn-ad').addEventListener('click', () => {
    initAudio();
    showScreen(adScreen);
    let t = 5;
    $('ad-timer').textContent = t;
    const iv = setInterval(() => {
      t--;
      $('ad-timer').textContent = t;
      if (t <= 0) {
        clearInterval(iv);
        doubleIncomeTimer = 30000;
        showScreen(gameScreen);
        playTone(880, 0.2, 'sine', 0.1);
      }
    }, 1000);
  });

  // ── Navigation ──
  $('btn-play').addEventListener('click', () => {
    initAudio();
    // Check offline earnings first
    const offlineEarnings = calculateOfflineEarnings();
    showScreen(gameScreen);
    gameRunning = true;
    lastTime = 0;
    lastSaveTime = Date.now();
    requestAnimationFrame(gameLoop);
    updateUI();
    stockInterval = setInterval(updateStock, 2000);
    autoSaveInterval = setInterval(saveGame, 10000);
    if (offlineEarnings > 0) {
      setTimeout(() => showOfflinePopup(offlineEarnings), 500);
    }
  });

  $('btn-how').addEventListener('click', () => showScreen(howScreen));
  $('btn-back').addEventListener('click', () => showScreen(menuScreen));
  $('btn-stats').addEventListener('click', () => showStats());
  const statsBackBtn = $('btn-stats-back');
  if (statsBackBtn) statsBackBtn.addEventListener('click', () => showScreen(gameScreen));
  $('btn-menu-main').addEventListener('click', () => {
    gameRunning = false;
    saveGame();
    if (stockInterval) clearInterval(stockInterval);
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    showScreen(menuScreen);
  });

  // ── Gamepad Support ──
  function updateGamepad() {
    const gamepads = navigator.getGamepads();
    if (!gamepads || !gamepads[0]) return;
    const gp = gamepads[0];

    // A button (0) = click
    if (gp.buttons[0] && gp.buttons[0].pressed) doClick();
  }
  setInterval(updateGamepad, 100);

  // ── Init ──
    NGN4Settings.init();
    NGN4Achievements.init('21-data-empire');
  initBusinesses();

  // Load saved game
  const saved = loadGame();
  if (saved) {
    money = saved.money || 0;
    totalEarned = saved.totalEarned || 0;
    clickPower = saved.clickPower || 1;
    prestigeCount = saved.prestigeCount || 0;
    prestigeMultiplier = saved.prestigeMultiplier || 1;
    transcendCount = saved.transcendCount || 0;
    transcendMultiplier = saved.transcendMultiplier || 1;
    doubleIncomeTimer = saved.doubleIncomeTimer || 0;
    stockShares = saved.stockShares || 0;
    stockHistory = saved.stockHistory || stockHistory;
    stockPrice = saved.stockPrice || 100;
    totalClicks = saved.totalClicks || 0;
    totalTimePlayed = saved.totalTimePlayed || 0;
    goldenCookieTimer = saved.goldenCookieTimer || (60000 + Math.random() * 60000);
    if (saved.businesses) {
      saved.businesses.forEach((sb, i) => {
        if (businesses[i]) {
          businesses[i].count = sb.count || 0;
          businesses[i].incomeTimer = sb.incomeTimer || 0;
        }
      });
    }
    if (saved.managerHired) managerHired = saved.managerHired;
    achievements = { earned: new Set() };
    if (saved.achievements && saved.achievements.earned) {
      achievements.earned = new Set(saved.achievements.earned);
    }
    if (saved.bizUpgrades) bizUpgrades = saved.bizUpgrades;
    if (saved.clickUpgrades) {
      saved.clickUpgrades.forEach((u, i) => {
        if (u.bought) clickUpgrades[i].bought = true;
        if (u.repeatable) clickUpgrades[i] = u;
      });
    }
  }

  rewards = loadRewards();
  $('gems-display').textContent = rewards.gems;
  $('coins-display').textContent = rewards.coins;

})();
