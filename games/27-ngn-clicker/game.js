// ═══════════════════════════════════════════════
// NGN4 GAME 27: NGN CLICKER - Idle/Clicker Game
// ═══════════════════════════════════════════════

(function() {
  'use strict';

  // ── NGN4 Universal Systems Init ──
  try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
  try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('27-ngn-clicker'); } catch(e) {}

  // ── Audio ──
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  function ensureAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
  function playTone(freq, dur, type = 'sine', vol = 0.1) {
    ensureAudio();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
  }
  function sfxClick() { playTone(800 + Math.random() * 400, 0.06, 'square', 0.06); }
  function sfxBuy() { playTone(600, 0.1, 'sine', 0.08); setTimeout(() => playTone(900, 0.1, 'sine', 0.08), 60); }
  function sfxAchieve() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'sine', 0.1), i * 100)); }
  function sfxPrestige() { [440, 554, 659, 880, 1109, 1319].forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'triangle', 0.12), i * 80)); }
  function sfxBoss() { playTone(150, 0.3, 'sawtooth', 0.1); }

  // ── Save System ──
  function getSave() {
    try { return JSON.parse(localStorage.getItem('ngn4_clicker')) || defaultSave(); } catch { return defaultSave(); }
  }
  function defaultSave() {
    return {
      data: 0, totalData: 0, totalClicks: 0, clickPower: 1,
      upgrades: {}, prestigeCount: 0, prestigeMultiplier: 1,
      gems: 0, achievements: {}, skills: {},
      lastSave: Date.now(), bossLevel: 1, bossDefeated: 0,
      stats: { startTime: Date.now(), totalPlaytime: 0 },
      ascensionCount: 0, angelMultiplier: 1, buildingUpgrades: {}
    };
  }
  function saveGame(s) { s.lastSave = Date.now(); localStorage.setItem('ngn4_clicker', JSON.stringify(s)); }

  function getRewards() {
    try { return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, gems: 0 }; }
    catch { return { coins: 0, gems: 0 }; }
  }
  function saveRewards(r) { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); }
  function addCoins(n) { const r = getRewards(); r.coins += n; saveRewards(r); updateCoinsDisplay(); }
  function addGems(n) { const r = getRewards(); r.gems += n; saveRewards(r); updateCoinsDisplay(); }

  function updateCoinsDisplay() {
    const r = getRewards();
    const mc = document.getElementById('menu-coins');
    const mg = document.getElementById('menu-gems');
    if (mc) mc.textContent = r.coins;
    if (mg) mg.textContent = r.gems;
  }

  // ── Upgrades ──
  const UPGRADES = [
    { id: 'cursor', name: 'Auto Cursor', icon: '👆', desc: '+0.1 data/sec', baseCost: 15, baseGain: 0.1, costMult: 1.15 },
    { id: 'processor', name: 'Processor', icon: '🔲', desc: '+0.5 data/sec', baseCost: 100, baseGain: 0.5, costMult: 1.15 },
    { id: 'gpu', name: 'GPU Core', icon: '🎮', desc: '+2 data/sec', baseCost: 500, baseGain: 2, costMult: 1.15 },
    { id: 'server', name: 'Server Farm', icon: '🖥️', desc: '+10 data/sec', baseCost: 3000, baseGain: 10, costMult: 1.15 },
    { id: 'datacenter', name: 'Data Center', icon: '🏢', desc: '+40 data/sec', baseCost: 15000, baseGain: 40, costMult: 1.15 },
    { id: 'ai', name: 'AI Engine', icon: '🤖', desc: '+100 data/sec', baseCost: 100000, baseGain: 100, costMult: 1.15 },
    { id: 'quantum', name: 'Quantum Chip', icon: '⚛️', desc: '+400 data/sec', baseCost: 500000, baseGain: 400, costMult: 1.15 },
    { id: 'neural', name: 'Neural Net', icon: '🧠', desc: '+1500 data/sec', baseCost: 2e6, baseGain: 1500, costMult: 1.15 },
    { id: 'nano', name: 'Nano Fabricator', icon: '🔬', desc: '+5000 data/sec', baseCost: 10e6, baseGain: 5000, costMult: 1.15 },
    { id: 'singularity', name: 'Singularity', icon: '🌀', desc: '+20000 data/sec', baseCost: 50e6, baseGain: 20000, costMult: 1.15 },
    { id: 'dimension', name: 'Dimension Fold', icon: '🌌', desc: '+100000 data/sec', baseCost: 250e6, baseGain: 100000, costMult: 1.15 },
    { id: 'clicker1', name: 'Click Boost I', icon: '👆', desc: '+1 click power', baseCost: 50, baseGain: 1, costMult: 1.5, clickUpgrade: true },
    { id: 'clicker2', name: 'Click Boost II', icon: '👆', desc: '+5 click power', baseCost: 5000, baseGain: 5, costMult: 1.5, clickUpgrade: true },
    { id: 'clicker3', name: 'Click Boost III', icon: '👆', desc: '+25 click power', baseCost: 500000, baseGain: 25, costMult: 1.5, clickUpgrade: true },
    { id: 'clicker4', name: 'Mega Click', icon: '💥', desc: '+100 click power', baseCost: 50e6, baseGain: 100, costMult: 1.5, clickUpgrade: true },
  ];

  // ── Achievements (50+) ──
  const ACHIEVEMENTS = [
    { id: 'click10', name: 'Baby Steps', icon: '👶', desc: 'Click 10 times', check: s => s.totalClicks >= 10 },
    { id: 'click100', name: 'Clicker', icon: '👆', desc: 'Click 100 times', check: s => s.totalClicks >= 100 },
    { id: 'click1000', name: 'Dedicated', icon: '💪', desc: 'Click 1000 times', check: s => s.totalClicks >= 1000 },
    { id: 'click5000', name: 'Click Master', icon: '🏆', desc: 'Click 5000 times', check: s => s.totalClicks >= 5000 },
    { id: 'data100', name: 'First Byte', icon: '💾', desc: 'Earn 100 data', check: s => s.totalData >= 100 },
    { id: 'data1k', name: 'Kilobyte', icon: '📊', desc: 'Earn 1,000 data', check: s => s.totalData >= 1000 },
    { id: 'data10k', name: 'Megabyte', icon: '💎', desc: 'Earn 10,000 data', check: s => s.totalData >= 10000 },
    { id: 'data100k', name: 'Gigabyte', icon: '🌐', desc: 'Earn 100,000 data', check: s => s.totalData >= 100000 },
    { id: 'data1m', name: 'Terabyte', icon: '🚀', desc: 'Earn 1,000,000 data', check: s => s.totalData >= 1e6 },
    { id: 'data10m', name: 'Petabyte', icon: '⭐', desc: 'Earn 10,000,000 data', check: s => s.totalData >= 1e7 },
    { id: 'data100m', name: 'Exabyte', icon: '🌟', desc: 'Earn 100,000,000 data', check: s => s.totalData >= 1e8 },
    { id: 'data1b', name: 'Zettabyte', icon: '👑', desc: 'Earn 1,000,000,000 data', check: s => s.totalData >= 1e9 },
    { id: 'data1t', name: 'Yottabyte', icon: '🔮', desc: 'Earn 1,000,000,000,000 data', check: s => s.totalData >= 1e12 },
    { id: 'upg1', name: 'First Upgrade', icon: '🔧', desc: 'Buy first upgrade', check: s => Object.values(s.upgrades).some(v => v > 0) },
    { id: 'upg5', name: 'Collector', icon: '📦', desc: 'Own 5 of any upgrade', check: s => Object.values(s.upgrades).some(v => v >= 5) },
    { id: 'upg10', name: 'Stockpiler', icon: '🏭', desc: 'Own 10 of any upgrade', check: s => Object.values(s.upgrades).some(v => v >= 10) },
    { id: 'upg25', name: 'Massive', icon: '🏛️', desc: 'Own 25 of any upgrade', check: s => Object.values(s.upgrades).some(v => v >= 25) },
    { id: 'upg50', name: 'Unstoppable', icon: '🔥', desc: 'Own 50 of any upgrade', check: s => Object.values(s.upgrades).some(v => v >= 50) },
    { id: 'prestige1', name: 'New Beginning', icon: '💎', desc: 'Prestige once', check: s => s.prestigeCount >= 1 },
    { id: 'prestige5', name: 'Veteran', icon: '💎', desc: 'Prestige 5 times', check: s => s.prestigeCount >= 5 },
    { id: 'prestige10', name: 'Transcendent', icon: '👑', desc: 'Prestige 10 times', check: s => s.prestigeCount >= 10 },
    { id: 'boss1', name: 'Boss Slayer', icon: '👾', desc: 'Defeat first boss', check: s => s.bossDefeated >= 1 },
    { id: 'boss5', name: 'Boss Hunter', icon: '🗡️', desc: 'Defeat 5 bosses', check: s => s.bossDefeated >= 5 },
    { id: 'boss10', name: 'Boss Legend', icon: '🏅', desc: 'Defeat 10 bosses', check: s => s.bossDefeated >= 10 },
    { id: 'cps10', name: 'Automation', icon: '⚙️', desc: 'Reach 10 data/sec', check: () => getDPS() >= 10 },
    { id: 'cps100', name: 'Factory', icon: '🏭', desc: 'Reach 100 data/sec', check: () => getDPS() >= 100 },
    { id: 'cps1k', name: 'Industrial', icon: '🏗️', desc: 'Reach 1,000 data/sec', check: () => getDPS() >= 1000 },
    { id: 'cps10k', name: 'Empire', icon: '🏰', desc: 'Reach 10,000 data/sec', check: () => getDPS() >= 10000 },
    { id: 'cps100k', name: 'Dominion', icon: '🌌', desc: 'Reach 100,000 data/sec', check: () => getDPS() >= 100000 },
    { id: 'cps1m', name: 'Omnipotent', icon: '👁️', desc: 'Reach 1,000,000 data/sec', check: () => getDPS() >= 1e6 },
    { id: 'speed1', name: 'Quick Start', icon: '⚡', desc: '100 data in first minute', check: s => s.totalData >= 100 },
    { id: 'allAuto', name: 'Full Auto', icon: '🤖', desc: 'Own all auto upgrades', check: s => {
      const auto = UPGRADES.filter(u => !u.clickUpgrade);
      return auto.every(u => (s.upgrades[u.id] || 0) >= 1);
    }},
    { id: 'coins100', name: 'Wealthy', icon: '💰', desc: 'Exchange 100+ data to coins', check: s => getRewards().coins >= 100 },
    { id: 'coins1k', name: 'Rich', icon: '🤑', desc: 'Have 1,000+ coins', check: s => getRewards().coins >= 1000 },
    { id: 'offline', name: 'AFK Master', icon: '😴', desc: 'Earn 1000+ offline data', check: () => false },
    { id: 'skill1', name: 'Skilled', icon: '🌳', desc: 'Purchase first skill', check: s => Object.keys(s.skills).length > 0 },
    { id: 'skill5', name: 'Scholar', icon: '📚', desc: 'Purchase 5 skills', check: s => Object.keys(s.skills).length >= 5 },
    { id: 'play1h', name: 'One Hour', icon: '⏰', desc: 'Play for 1 hour', check: s => s.stats.totalPlaytime >= 3600000 },
    { id: 'play24h', name: 'Dedicated', icon: '📅', desc: 'Play for 24 hours total', check: s => s.stats.totalPlaytime >= 86400000 },
    { id: 'clickpw10', name: 'Power Clicker', icon: '💥', desc: 'Reach 10 click power', check: s => getClickPower(s) >= 10 },
    { id: 'clickpw100', name: 'Super Clicker', icon: '💥', desc: 'Reach 100 click power', check: s => getClickPower(s) >= 100 },
    { id: 'clickpw1k', name: 'Ultra Clicker', icon: '💫', desc: 'Reach 1,000 click power', check: s => getClickPower(s) >= 1000 },
    { id: 'unique5', name: 'Diversified', icon: '🌈', desc: 'Own 5 different upgrade types', check: s => Object.values(s.upgrades).filter(v => v > 0).length >= 5 },
    { id: 'unique10', name: 'Diverse', icon: '🎨', desc: 'Own 10 different upgrade types', check: s => Object.values(s.upgrades).filter(v => v > 0).length >= 10 },
    { id: 'unique15', name: 'Complete Set', icon: '✨', desc: 'Own all upgrade types', check: s => Object.values(s.upgrades).filter(v => v > 0).length >= UPGRADES.length },
    { id: 'milestone1', name: 'NGN Initiate', icon: '🔰', desc: 'Start your journey', check: () => true },
    { id: 'milestone2', name: 'NGN Builder', icon: '🔨', desc: 'Buy any auto upgrade', check: s => {
      const auto = UPGRADES.filter(u => !u.clickUpgrade);
      return auto.some(u => (s.upgrades[u.id] || 0) >= 1);
    }},
    { id: 'milestone3', name: 'NGN Architect', icon: '🏗️', desc: 'Reach 1000 DPS', check: () => getDPS() >= 1000 },
    { id: 'milestone4', name: 'NGN Overlord', icon: '👁️', desc: 'Prestige and have 100K DPS', check: s => s.prestigeCount >= 1 && getDPS() >= 100000 },
    { id: 'x2used', name: 'Ad Powered', icon: '📺', desc: 'Use a 2x production boost', check: s => s.usedAd || false },
  ];

  // ── Skills ──
  const SKILLS = {
    power: [
      { id: 'pw1', name: 'Strong Fingers', desc: '+2 click power', cost: 50, clickBonus: 2 },
      { id: 'pw2', name: 'Precision', desc: '+5 click power', cost: 200, clickBonus: 5 },
      { id: 'pw3', name: 'Mega Tap', desc: '+20 click power', cost: 1000, clickBonus: 20 },
      { id: 'pw4', name: 'Hyper Click', desc: '+50 click power', cost: 5000, clickBonus: 50 },
      { id: 'pw5', name: 'Infinity Tap', desc: '+200 click power', cost: 25000, clickBonus: 200 },
    ],
    automation: [
      { id: 'au1', name: 'Efficiency I', desc: '+10% auto speed', cost: 30, autoMult: 0.1 },
      { id: 'au2', name: 'Efficiency II', desc: '+15% auto speed', cost: 150, autoMult: 0.15 },
      { id: 'au3', name: 'Overclock', desc: '+25% auto speed', cost: 500, autoMult: 0.25 },
      { id: 'au4', name: 'Turbo Mode', desc: '+50% auto speed', cost: 2000, autoMult: 0.5 },
      { id: 'au5', name: 'Max Overdrive', desc: '+100% auto speed', cost: 10000, autoMult: 1.0 },
    ],
    economy: [
      { id: 'ec1', name: 'Smart Buy', desc: '-5% upgrade costs', cost: 40, costReduction: 0.05 },
      { id: 'ec2', name: 'Bargain', desc: '-10% upgrade costs', cost: 200, costReduction: 0.10 },
      { id: 'ec3', name: 'Market Manip', desc: '-15% upgrade costs', cost: 800, costReduction: 0.15 },
      { id: 'ec4', name: 'Monopoly', desc: '-10% more costs', cost: 3000, costReduction: 0.10 },
      { id: 'ec5', name: 'Free Market', desc: '-20% more costs', cost: 15000, costReduction: 0.20 },
    ]
  };

  // ── Boss Data ──
  const BOSSES = [
    { name: 'Glitch Worm', hp: 500, icon: '🐛', reward: 100 },
    { name: 'Firewall Drake', hp: 2500, icon: '🐉', reward: 500 },
    { name: 'Virus Beast', hp: 15000, icon: '🦠', reward: 2500 },
    { name: 'Trojan Titan', hp: 75000, icon: '🗿', reward: 10000 },
    { name: 'Malware Lord', hp: 400000, icon: '👹', reward: 50000 },
  ];

  // ── Buy Quantity ──
  let buyQty = 1;

  // ── Golden Cookie ──
  let goldenCookieTimer = null;
  let goldenCookieActive = false;
  let goldenCookieTimerEnd = 0;
  let frenzyMult = 1;
  let frenzyTimer = null;
  let clickFrenzyMult = 1;
  let clickFrenzyTimer = null;
  let goldenCookieEl = null;

  // ── Ascension ──
  const ASCENSION_REQ = 100;

  // ── Per-Building Upgrades ──
  const BUILDING_UPGRADES = {};
  UPGRADES.filter(u => !u.clickUpgrade).forEach(upg => {
    BUILDING_UPGRADES[upg.id] = [
      { id: upg.id + '_u1', name: upg.name + ' Boost I', desc: 'x2 ' + upg.name + ' output', cost: Math.floor(upg.baseCost * 5), mult: 2 },
      { id: upg.id + '_u2', name: upg.name + ' Boost II', desc: 'x3 ' + upg.name + ' output', cost: Math.floor(upg.baseCost * 50), mult: 3 },
      { id: upg.id + '_u3', name: upg.name + ' Boost III', desc: 'x5 ' + upg.name + ' output', cost: Math.floor(upg.baseCost * 500), mult: 5 },
    ];
  });

  // ── Gamepad ──
  let gpPollId = null;
  function pollGamepad() {
    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    if (gp && gameActive) {
      if (gp.buttons[0] && !gp._prevA) { window.handleClick({ currentTarget: document.getElementById('click-area') }); }
    }
    if (gp) gp._prevA = gp.buttons[0];
    else gp._prevA = false;
    gpPollId = requestAnimationFrame(pollGamepad);
  }

  // ── Game State ──
  let save = getSave();
  let gameActive = false;
  let doubleMultiplier = 1;
  let doubleTimer = null;
  let particles = [];
  let canvas, ctx;

  // ── Calculations ──
  function getUpgradeCount(id) { return save.upgrades[id] || 0; }

  function getUpgradeCost(upg) {
    const count = getUpgradeCount(upg.id);
    let cost = Math.floor(upg.baseCost * Math.pow(upg.costMult, count));
    // Skill cost reduction
    const costRed = getTotalSkillValue('costReduction');
    cost = Math.floor(cost * (1 - costRed));
    return Math.max(1, cost);
  }

  // Keep old buyUpgrade for single buys (backwards compat)
  function buyUpgradeSingle(upg) {
    const cost = getUpgradeCost(upg);
    if (save.data < cost) return;
    sfxBuy();
    save.data -= cost;
    save.upgrades[upg.id] = (save.upgrades[upg.id] || 0) + 1;
  }

  function getDPS() {
    let dps = 0;
    UPGRADES.filter(u => !u.clickUpgrade).forEach(u => {
      const count = getUpgradeCount(u.id);
      let gain = count * u.baseGain;
      // Per-building upgrades
      if (BUILDING_UPGRADES[u.id]) {
        BUILDING_UPGRADES[u.id].forEach((bu, i) => {
          if (save.buildingUpgrades[bu.id]) gain *= bu.mult;
        });
      }
      dps += gain;
    });
    dps *= save.prestigeMultiplier;
    dps *= save.angelMultiplier;
    const autoMult = 1 + getTotalSkillValue('autoMult');
    dps *= autoMult;
    dps *= doubleMultiplier;
    dps *= frenzyMult;
    return dps;
  }

  function getClickPower(s) {
    if (!s) s = save;
    let power = 1;
    UPGRADES.filter(u => u.clickUpgrade).forEach(u => {
      power += getUpgradeCount(u.id) * u.baseGain;
    });
    power *= s.prestigeMultiplier;
    power *= s.angelMultiplier;
    power += getTotalSkillValue('clickBonus');
    power *= doubleMultiplier;
    power *= clickFrenzyMult;
    return power;
  }

  function getTotalSkillValue(type) {
    let total = 0;
    Object.values(SKILLS).forEach(branch => {
      branch.forEach(sk => {
        if (save.skills[sk.id]) {
          total += (sk[type] || 0);
        }
      });
    });
    return total;
  }

  function getPrestigeGems() {
    // Gems based on total data earned this run
    return Math.max(1, Math.floor(Math.sqrt(save.totalData / 10000)));
  }

  // ── Format Numbers ──
  function fmt(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    if (n >= 100) return Math.floor(n).toString();
    if (n >= 1) return n.toFixed(1);
    return n.toFixed(2);
  }

  // ── Offline Earnings ──
  function calculateOffline() {
    const now = Date.now();
    const elapsed = (now - save.lastSave) / 1000;
    if (elapsed < 60) return 0;
    const offSec = Math.min(elapsed, 86400); // Cap at 24h
    return Math.floor(getDPS() * offSec * 0.5); // 50% offline efficiency
  }

  // ── Screen Management ──
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  window.showMenu = function() {
    showScreen('menu-screen');
    updateCoinsDisplay();
  };

  // ── Start Game ──
  // ── Golden Cookie ──
  function spawnGoldenCookie() {
    if (goldenCookieActive) return;
    if (!gameActive) return;
    goldenCookieActive = true;
    const el = document.createElement('div');
    el.className = 'golden-cookie';
    el.style.cssText = 'position:absolute;width:60px;height:60px;font-size:40px;cursor:pointer;z-index:100;animation:goldenFloat 1s ease-in-out infinite alternate;filter:drop-shadow(0 0 10px #ffd700);top:' + (20 + Math.random() * 60) + '%;left:' + (20 + Math.random() * 60) + '%;transition:transform 0.1s;';
    el.textContent = '🍪';
    el.onclick = (e) => { e.stopPropagation(); clickGoldenCookie(); };
    document.getElementById('main-area').style.position = 'relative';
    document.getElementById('main-area').appendChild(el);
    goldenCookieEl = el;
    goldenCookieTimerEnd = Date.now() + 5000;
    sfxAchieve();
    showToast('🍪 Golden Cookie appeared!');
  }

  function clickGoldenCookie() {
    if (!goldenCookieActive) return;
    goldenCookieActive = false;
    if (goldenCookieEl) goldenCookieEl.remove();
    const bonuses = ['frenzy', 'clickFrenzy', 'lucky'];
    const bonus = bonuses[Math.floor(Math.random() * bonuses.length)];
    if (bonus === 'frenzy') {
      frenzyMult = 7;
      if (frenzyTimer) clearTimeout(frenzyTimer);
      frenzyTimer = setTimeout(() => { frenzyMult = 1; showToast('Frenzy ended!'); }, 30000);
      showToast('🔥 FRENZY! x7 production for 30s!');
    } else if (bonus === 'clickFrenzy') {
      clickFrenzyMult = 777;
      if (clickFrenzyTimer) clearTimeout(clickFrenzyTimer);
      clickFrenzyTimer = setTimeout(() => { clickFrenzyMult = 1; showToast('Click Frenzy ended!'); }, 10000);
      showToast('💫 CLICK FRENZY! x777 clicks for 10s!');
    } else {
      const bankBonus = Math.floor(save.data * 0.1);
      save.data += bankBonus;
      save.totalData += bankBonus;
      showToast(`🍀 Lucky! +${fmt(bankBonus)} data (10% of bank)!`);
    }
    checkAchievements();
    updateHUD();
  }

  function scheduleGoldenCookie() {
    if (goldenCookieTimer) clearTimeout(goldenCookieTimer);
    const delay = 60000 + Math.random() * 120000;
    goldenCookieTimer = setTimeout(spawnGoldenCookie, delay);
  }

  // ── Ascension ──
  window.doAscension = function() {
    if (save.prestigeCount < ASCENSION_REQ) return;
    sfxPrestige();
    save.ascensionCount++;
    save.angelMultiplier = 1 + save.ascensionCount * 0.1;
    save.data = 0; save.totalData = 0;
    save.upgrades = {}; save.buildingUpgrades = {};
    save.prestigeCount = 0;
    save.prestigeMultiplier = 1;
    save.skills = {};
    save.bossLevel = 1;
    renderUpgrades(); renderPrestige(); renderBossTab(); updateHUD();
    showToast(`Ascended! Angel multiplier: x${save.angelMultiplier.toFixed(1)}`);
  };

  // ── Buy Quantity ──
  window.setBuyQty = function(qty) {
    buyQty = qty;
    renderUpgrades();
  };

  function getBulkCost(upg, qty) {
    const baseCount = getUpgradeCount(upg.id);
    let total = 0;
    let costRed = getTotalSkillValue('costReduction');
    for (let i = 0; i < qty; i++) {
    total += Math.max(1, Math.floor(upg.baseCost * Math.pow(upg.costMult, baseCount + i) * (1 - costRed)));
  }
    return total;
  }

  function getMaxBuyable(upg) {
    let count = getUpgradeCount(upg.id);
    let costRed = getTotalSkillValue('costReduction');
    let budget = save.data;
    let max = 0;
    while (budget > 0) {
    const cost = Math.max(1, Math.floor(upg.baseCost * Math.pow(upg.costMult, count) * (1 - costRed)));
    if (budget >= cost) { budget -= cost; max++; count++; } else break;
  }
    return max;
  }

  window.startGame = function() {
    sfxClick();
    gameActive = true;

    // Offline earnings
    const offline = calculateOffline();
    if (offline > 0) {
      save.data += offline;
      save.totalData += offline;
      showToast(`Welcome back! Earned ${fmt(offline)} data while away!`);
    }

    save.stats.totalPlaytime = (save.stats.totalPlaytime || 0);
    renderUpgrades();
    renderPrestige();
    renderBossTab();
    showScreen('game-screen');
    updateCoinsDisplay();
    scheduleGoldenCookie();
    if (gpPollId) cancelAnimationFrame(gpPollId);
    gpPollId = requestAnimationFrame(pollGamepad);
  };

  // ── Click Handler ──
  window.handleClick = function(e) {
    if (!gameActive) return;
    sfxClick();
    const power = getClickPower();
    save.data += power;
    save.totalData += power;
    save.totalClicks++;

    // Float number
    const rect = e.currentTarget.getBoundingClientRect();
    const float = document.createElement('div');
    float.className = 'float-num';
    float.textContent = '+' + fmt(power);
    float.style.left = (e.clientX - rect.left - 20) + 'px';
    float.style.top = (e.clientY - rect.top - 10) + 'px';
    document.getElementById('float-container').appendChild(float);
    setTimeout(() => float.remove(), 1000);

    // Exchange to coins periodically
    if (save.totalData >= 1000 && save.totalClicks % 50 === 0) {
      const exchange = Math.floor(save.totalData / 1000);
      addCoins(exchange);
    }

    checkAchievements();
    updateHUD();
  };

  // ── Tabs ──
  window.switchTab = function(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    document.getElementById(tab + '-tab').classList.add('active');
  };

  // ── Render Upgrades ──
  function renderUpgrades() {
    const container = document.getElementById('upgrades-tab');
    container.innerHTML = '';
    // Buy quantity buttons
    const qtyBar = document.createElement('div');
    qtyBar.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;justify-content:center;';
    [1, 10, 100, 'Max'].forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-small' + (buyQty === q ? ' btn-primary' : ' btn-secondary');
     btn.textContent = q === 'Max' ? 'MAX' : 'x' + q;
      btn.style.fontSize = '0.7rem'; btn.style.padding = '2px 8px';
      btn.onclick = () => window.setBuyQty(q);
      qtyBar.appendChild(btn);
    });
    container.appendChild(qtyBar);

    // Building upgrades section
    const buSection = document.createElement('div');
    buSection.style.cssText = 'border-top:1px solid #333;margin-top:8px;padding-top:8px;';
    buSection.innerHTML = '<div style="color:#a6f;font-size:0.8rem;margin-bottom:4px">BUILDING UPGRADES</div>';
    container.appendChild(buSection);

    UPGRADES.forEach(upg => {
      const count = getUpgradeCount(upg.id);
      const isBuyAll = buyQty === 'Max' || buyQty > 1;
      let cost, qtyToBuy;
      if (buyQty === 'Max') {
        qtyToBuy = getMaxBuyable(upg);
        cost = getBulkCost(upg, qtyToBuy);
      } else {
        qtyToBuy = buyQty;
        cost = isBuyAll ? getBulkCost(upg, qtyToBuy) : getUpgradeCost(upg);
      }
      const canAfford = save.data >= cost && qtyToBuy > 0;
      const item = document.createElement('div');
      item.className = 'upgrade-item' + (canAfford ? '' : ' locked');
      item.innerHTML = `
        <span class="u-icon">${upg.icon}</span>
        <div class="u-info">
          <div class="u-name">${upg.name}</div>
          <div class="u-desc">${upg.desc}</div>
        </div>
        <span class="u-count">${count}${isBuyAll ? '' : ''}</span>
        <span class="u-cost">${fmt(cost)}${isBuyAll ? ' (' + qtyToBuy + ')' : ''}</span>
      `;
      if (canAfford) {
        item.onclick = () => {
          const actualQty = buyQty === 'Max' ? getMaxBuyable(upg) : buyQty;
          const actualCost = buyQty === 'Max' ? getBulkCost(upg, actualQty) : (actualQty > 1 ? getBulkCost(upg, actualQty) : getUpgradeCost(upg));
          if (save.data < actualCost) return;
          sfxBuy();
          save.data -= actualCost;
          for (let i = 0; i < actualQty; i++) save.upgrades[upg.id] = (save.upgrades[upg.id] || 0) + 1;
          renderUpgrades(); updateHUD(); checkAchievements();
        };
      }
      container.appendChild(item);

      // Per-building upgrade buttons
      if (BUILDING_UPGRADES[upg.id]) {
        BUILDING_UPGRADES[upg.id].forEach(bu => {
          const bought = save.buildingUpgrades[bu.id];
          const buBtn = document.createElement('div');
          buBtn.className = 'upgrade-item' + (bought ? ' locked' : '');
          buBtn.style.fontSize = '0.75rem';
          buBtn.innerHTML = `
            <span class="u-icon">⬆️</span>
            <div class="u-info">
              <div class="u-name" style="color:${bought ? '#666' : '#ffd700'}">${bu.name}</div>
              <div class="u-desc">${bu.desc} (${bought ? 'OWNED' : fmt(bu.cost) + ' data'})</div>
            </div>
          `;
          if (!bought) {
            buBtn.onclick = () => {
              if (save.data >= bu.cost) {
                sfxBuy(); save.data -= bu.cost;
                save.buildingUpgrades[bu.id] = true;
                renderUpgrades(); updateHUD(); checkAchievements();
 }
            };
          }
          container.appendChild(buBtn);
        });
      }
    });
  }

  function buyUpgrade(upg) {
    const cost = getUpgradeCost(upg);
    if (save.data < cost) return;
    sfxBuy();
    save.data -= cost;
    save.upgrades[upg.id] = (save.upgrades[upg.id] || 0) + 1;
    renderUpgrades();
    updateHUD();
    checkAchievements();
  }

  // ── Prestige ──
  function renderPrestige() {
    const container = document.getElementById('prestige-tab');
    const gems = getPrestigeGems();
    const canAscend = save.prestigeCount >= ASCENSION_REQ;
    container.innerHTML = `
      <div class="prestige-panel">
        <h3>💎 PRESTIGE</h3>
        <p class="prestige-info">Current multiplier: x${save.prestigeMultiplier.toFixed(1)}</p>
        <p class="prestige-info">Angel bonus: x${save.angelMultiplier.toFixed(1)} (${save.ascensionCount} ascensions)</p>
        <p class="prestige-info">Times prestiged: ${save.prestigeCount}</p>
        <p class="prestige-info">Data this run: ${fmt(save.totalData)}</p>
        <p class="prestige-info">Gems on prestige: <strong style="color:#aa44ff">${gems}</strong></p>
        <p class="prestige-info" style="color:var(--muted); font-size:0.7rem">Prestige resets data & upgrades but grants a permanent x1.5 multiplier per prestige plus gems.</p>
        <br>
        <button class="btn prestige-btn" onclick="doPrestige()" ${gems < 1 ? 'disabled style="opacity:0.4"' : ''}>💎 PRESTIGE (${gems} gems)</button>
        <br>
        ${canAscend ? `<button class="btn prestige-btn" onclick="doAscension()" style="border-color:#ffd700;color:#ffd700;margin-top:8px">🐉 ASCEND (Lv${save.prestigeCount} → Angel x${(1 + (save.prestigeCount + 1) * 0.1).toFixed(1)})</button>
        <p class="prestige-info" style="color:#ffd700;font-size:0.7rem">Ascension requires 100+ prestiges. Resets everything except angel multiplier.</p>` : `
        <p class="prestige-info" style="color:var(--muted);font-size:0.7rem">🐉 Ascension unlocks at 100 prestiges (currently ${save.prestigeCount}/100)</p>`
        }
        <br>
        <button class="btn btn-small btn-secondary" onclick="showRewardedAd()">📺 Watch Ad: 2x Production (60s)</button>
      </div>
    `;
  }

  window.doPrestige = function() {
    const gems = getPrestigeGems();
    if (gems < 1) return;
    sfxPrestige();
    addGems(gems);
    save.prestigeCount++;
    save.prestigeMultiplier = 1 + (save.prestigeCount * 0.5);
    save.data = 0;
    save.totalData = 0;
    save.upgrades = {};
    renderUpgrades();
    renderPrestige();
    renderBossTab();
    updateHUD();
    showToast(`Prestige! x${save.prestigeMultiplier.toFixed(1)} multiplier, +${gems} gems!`);
  };

  // ── Boss Tab ──
  function renderBossTab() {
    const container = document.getElementById('boss-tab');
    const bossIdx = Math.min(save.bossLevel - 1, BOSSES.length - 1);
    const boss = BOSSES[bossIdx];
    container.innerHTML = `
      <div class="prestige-panel">
        <h3>👾 BOSS BATTLE - Lv${save.bossLevel}</h3>
        <p style="font-size:2rem">${boss.icon} ${boss.name}</p>
        <p class="prestige-info">HP: ${fmt(boss.hp * save.bossLevel)}</p>
        <p class="prestige-info">Your DPS: ${fmt(getDPS())}/sec</p>
        <p class="prestige-info">Reward: ${fmt(boss.reward * save.bossLevel)} data</p>
        <br>
        <button class="btn prestige-btn" onclick="fightBoss()" style="border-color:#ff3333;color:#ff3333">⚔️ FIGHT BOSS</button>
      </div>
    `;
  }

  window.fightBoss = function() {
    if (getDPS() < 1) { showToast('Need at least 1 DPS to fight!'); return; }
    sfxBoss();
    const bossIdx = Math.min(save.bossLevel - 1, BOSSES.length - 1);
    const boss = BOSSES[bossIdx];
    const totalHp = Math.floor(boss.hp * save.bossLevel);
    const timeToKill = totalHp / getDPS();

    if (timeToKill > 120) {
      showToast('Boss too strong! Need more DPS.');
      return;
    }

    // Simulate boss fight
    showScreen('boss-battle-screen');
    const bCanvas = document.getElementById('bossCanvas');
    const bCtx = bCanvas.getContext('2d');
    bCanvas.width = 300;
    bCanvas.height = 200;

    let bossHp = totalHp;
    let bossFrame = 0;

    function drawBoss() {
      bCtx.fillStyle = '#0a0a0f';
      bCtx.fillRect(0, 0, 300, 200);

      // Boss sprite
      const shake = bossHp < totalHp * 0.3 ? (Math.random() * 4 - 2) : 0;
      bCtx.font = '60px serif';
      bCtx.textAlign = 'center';
      bCtx.fillText(boss.icon, 150 + shake, 110 + Math.sin(bossFrame * 0.05) * 5);

      // HP bar
      const barW = 250;
      const hpRatio = bossHp / totalHp;
      bCtx.fillStyle = '#1a1a2e';
      bCtx.fillRect(25, 160, barW, 16);
      bCtx.fillStyle = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
      bCtx.fillRect(25, 160, barW * hpRatio, 16);
      bCtx.strokeStyle = '#333';
      bCtx.strokeRect(25, 160, barW, 16);

      bossFrame++;
    }

    const fightInterval = setInterval(() => {
      const damage = getDPS() * 0.1;
      bossHp = Math.max(0, bossHp - damage);
      drawBoss();

      if (bossHp <= 0) {
        clearInterval(fightInterval);
        // Victory!
        const reward = Math.floor(boss.reward * save.bossLevel);
        save.data += reward;
        save.totalData += reward;
        save.bossDefeated++;
        save.bossLevel++;

        // Boss death animation
        bCtx.fillStyle = '#0a0a0f';
        bCtx.fillRect(0, 0, 300, 200);
        bCtx.font = '24px "JetBrains Mono", monospace';
        bCtx.fillStyle = '#00ffcc';
        bCtx.textAlign = 'center';
        bCtx.fillText('VICTORY!', 150, 90);
        bCtx.fillStyle = '#ffd700';
        bCtx.fillText(`+${fmt(reward)} data`, 150, 120);
        sfxAchieve();

        setTimeout(() => {
          showScreen('game-screen');
          renderUpgrades();
          renderPrestige();
          renderBossTab();
          updateHUD();
          checkAchievements();
        }, 2000);
      }
    }, 100);
  };

  window.closeBoss = function() {
    showScreen('game-screen');
  };

  // ── Rewarded Ad ──
  window.showRewardedAd = function() {
    showAd();
  };

  function showAd() {
    showScreen('ad-screen');
    const bar = document.getElementById('ad-progress');
    const timerEl = document.getElementById('ad-timer');
    const closeBtn = document.getElementById('ad-close-btn');
    bar.style.width = '0%';
    closeBtn.style.display = 'none';
    timerEl.textContent = '5s';
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.1;
      bar.style.width = `${(elapsed / 5) * 100}%`;
      timerEl.textContent = `${Math.ceil(5 - elapsed)}s`;
      if (elapsed >= 5) {
        clearInterval(interval);
        closeBtn.style.display = 'inline-block';
        timerEl.textContent = '✓';
      }
    }, 100);
  }

  window.closeAd = function() {
    sfxBuy();
    doubleMultiplier = 2;
    save.usedAd = true;
    if (doubleTimer) clearTimeout(doubleTimer);
    doubleTimer = setTimeout(() => { doubleMultiplier = 1; showToast('2x boost ended!'); }, 60000);
    showToast('2x Production for 60 seconds!');
    showScreen('game-screen');
    renderPrestige();
  };

  // ── Achievements ──
  function checkAchievements() {
    let newAchievements = 0;
    ACHIEVEMENTS.forEach(ach => {
      if (!save.achievements[ach.id] && ach.check(save)) {
        save.achievements[ach.id] = Date.now();
        newAchievements++;
        addCoins(5); // Small reward per achievement
      }
    });
    if (newAchievements > 0) {
      sfxAchieve();
      showToast(`${newAchievements} achievement(s) unlocked! +${newAchievements * 5} 🪙`);
    }
  }

  window.showAchievements = function() {
    sfxClick();
    const list = document.getElementById('achievements-list');
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(ach => {
      const unlocked = !!save.achievements[ach.id];
      const item = document.createElement('div');
      item.className = 'ach-item' + (unlocked ? ' unlocked' : '');
      item.innerHTML = `
        <span class="ach-icon">${unlocked ? ach.icon : '🔒'}</span>
        <span class="ach-name" style="color:${unlocked ? '#ffd700' : 'var(--muted)'}">${ach.name}</span>
        <span class="ach-desc">${ach.desc}</span>
      `;
      list.appendChild(item);
    });
    showScreen('achievements-screen');
  };

  // ── Stats ──
  window.showStats = function() {
    sfxClick();
    const grid = document.getElementById('stats-grid');
    const offData = calculateOffline();
    grid.innerHTML = `
      <div class="stat-row"><span class="stat-label">Total Data Earned</span><span class="stat-value">${fmt(save.totalData)}</span></div>
      <div class="stat-row"><span class="stat-label">Current Data</span><span class="stat-value">${fmt(save.data)}</span></div>
      <div class="stat-row"><span class="stat-label">Data Per Second</span><span class="stat-value">${fmt(getDPS())}/s</span></div>
      <div class="stat-row"><span class="stat-label">Click Power</span><span class="stat-value">${fmt(getClickPower())}</span></div>
      <div class="stat-row"><span class="stat-label">Total Clicks</span><span class="stat-value">${save.totalClicks.toLocaleString()}</span></div>
      <div class="stat-row"><span class="stat-label">Prestige Count</span><span class="stat-value">${save.prestigeCount}</span></div>
      <div class="stat-row"><span class="stat-label">Prestige Multiplier</span><span class="stat-value">x${save.prestigeMultiplier.toFixed(1)}</span></div>
      <div class="stat-row"><span class="stat-label">Bosses Defeated</span><span class="stat-value">${save.bossDefeated}</span></div>
      <div class="stat-row"><span class="stat-label">Boss Level</span><span class="stat-value">${save.bossLevel}</span></div>
      <div class="stat-row"><span class="stat-label">Achievements</span><span class="stat-value">${Object.keys(save.achievements).length}/${ACHIEVEMENTS.length}</span></div>
      <div class="stat-row"><span class="stat-label">Pending Offline Data</span><span class="stat-value">${fmt(offData)}</span></div>
      <div class="stat-row"><span class="stat-label">NGN4 Coins</span><span class="stat-value">${getRewards().coins}</span></div>
      <div class="stat-row"><span class="stat-label">NGN4 Gems</span><span class="stat-value">${getRewards().gems}</span></div>
    `;
    showScreen('stats-screen');
  };

  // ── Skill Tree ──
  window.showSkillTree = function() {
    sfxClick();
    const container = document.getElementById('skill-tree-content');
    container.innerHTML = '';
    const branches = [
      { key: 'power', name: '⚡ Power Branch', items: SKILLS.power },
      { key: 'automation', name: '⚙️ Automation Branch', items: SKILLS.automation },
      { key: 'economy', name: '💰 Economy Branch', items: SKILLS.economy },
    ];
    branches.forEach(branch => {
      const div = document.createElement('div');
      div.className = 'skill-branch';
      div.innerHTML = `<h3>${branch.name}</h3>`;
      branch.items.forEach(sk => {
        const purchased = !!save.skills[sk.id];
        const canAfford = save.data >= sk.cost;
        const node = document.createElement('span');
        node.className = 'skill-node' + (purchased ? ' purchased' : canAfford ? '' : ' locked');
        node.textContent = `${sk.name} (${fmt(sk.cost)})`;
        node.title = sk.desc;
        if (canAfford && !purchased) {
          node.onclick = () => {
            if (save.data < sk.cost) return;
            sfxBuy();
            save.data -= sk.cost;
            save.skills[sk.id] = true;
            showSkillTree();
            updateHUD();
            checkAchievements();
          };
        }
        div.appendChild(node);
      });
      container.appendChild(div);
    });
    showScreen('skill-screen');
  };

  window.closeSkillTree = function() {
    sfxClick();
    if (gameActive) showScreen('game-screen');
    else showMenu();
  };

  // ── HUD Update ──
  function updateHUD() {
    document.getElementById('hud-data').textContent = fmt(save.data);
    document.getElementById('hud-persec').textContent = fmt(getDPS()) + '/s';
    document.getElementById('hud-click-power').textContent = '+' + fmt(getClickPower()) + '/click';
    document.getElementById('node-level').textContent = 'Lv ' + save.prestigeCount;

    // Update node appearance based on prestige
    const node = document.getElementById('node-symbol');
    const icons = ['⚡', '🔥', '💎', '🌀', '👁️', '🚀', '🌌', '👑'];
    node.textContent = icons[Math.min(save.prestigeCount, icons.length - 1)];
  }

  // ── Toast ──
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ── Game Loop ──
  let lastSave = Date.now();
  let lastTick = Date.now();

  function gameTick() {
    if (!gameActive) return;

    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    // Auto production
    const production = getDPS() * dt;
    if (production > 0) {
      save.data += production;
      save.totalData += production;
    }

    // Update playtime
    save.stats.totalPlaytime += dt * 1000;

    // Auto-save every 30 seconds
    if (now - lastSave > 30000) {
      saveGame(save);
      lastSave = now;
    }

    // Update HUD
    updateHUD();

    // Re-render upgrades occasionally
    if (Math.random() < 0.05) renderUpgrades();

    // Periodic coin exchange
    if (Math.random() < 0.01 && save.totalData >= 5000) {
      const exchange = Math.floor(save.totalData / 5000);
      if (exchange > 0) {
        addCoins(exchange);
        save.totalData -= exchange * 5000;
      }
    }

    // Re-render prestige tab if active
    if (document.getElementById('prestige-tab').classList.contains('active')) {
      if (Math.random() < 0.02) renderPrestige();
    }

    checkAchievements();
    requestAnimationFrame(gameTick);
  }

  // ── Init ──
  function init() {
    canvas = document.getElementById('gameCanvas');
    if (canvas) {
      ctx = canvas.getContext('2d');
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
    }
    updateCoinsDisplay();
    showScreen('menu-screen');

    // Game tick loop
    lastTick = Date.now();
    requestAnimationFrame(gameTick);
  }

  function resizeCanvas() {
    if (!canvas) return;
    const area = document.getElementById('main-area');
    if (area) {
      canvas.width = area.clientWidth || 300;
      canvas.height = area.clientHeight || 200;
    }
  }

  // Golden cookie CSS
  const gcStyle = document.createElement('style');
  gcStyle.textContent = `@keyframes goldenFloat{0%{transform:translateY(0) scale(1)}100%{transform:translateY(-20px) scale(1.1)}}`;
  document.head.appendChild(gcStyle);

  // Save on close
  window.addEventListener('beforeunload', () => saveGame(save));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
