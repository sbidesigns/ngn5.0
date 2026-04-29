// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('goal-rush'); } catch(e) {}

function generateRewards17(amt) {
  let r = JSON.parse(localStorage.getItem('ngn4_rewards') || '{}');
  r.coins = (r.coins || 0) + amt;
  r.total = (r.total || 0) + amt;
  r.games17 = (r.games17 || 0) + 1;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
}

function getCoins17() {
  return (JSON.parse(localStorage.getItem('ngn4_rewards') || '{}').coins || 0);
}

const TEAMS = [
  { name: "Street Cats", color: "#0ff", gk: "#0aa", formation: "4-3-2" },
  { name: "Neon Wolves", color: "#f44", gk: "#a22", formation: "4-4-1" },
  { name: "Thunder FC", color: "#ff0", gk: "#aa0", formation: "3-4-2" },
  { name: "Shadow Strikers", color: "#808", gk: "#404", formation: "4-3-2" },
  { name: "Solar Flares", color: "#f80", gk: "#a50", formation: "2-4-3" },
  { name: "Ice Breakers", color: "#0af", gk: "#07a", formation: "4-4-1" },
  { name: "Crimson Hawks", color: "#f08", gk: "#a05", formation: "3-4-2" },
  { name: "Dark Stars", color: "#aaa", gk: "#666", formation: "4-3-2" },
  { name: "Green Machine", color: "#0f0", gk: "#0a0", formation: "2-4-3" }
];

const ACHIEVEMENTS_DEF = [
  { id: 'hat_trick', name: 'Hat Trick', desc: 'Score 3 goals in a single game', check: (g) => g.score[0] >= 3 },
  { id: 'clean_sheet', name: 'Clean Sheet', desc: 'No goals conceded in a game', check: (g) => g.matchEnded && g.score[1] === 0 },
  { id: 'playmaker', name: 'Playmaker', desc: 'Get 5 assists in a game', check: (g) => g.assists >= 5 },
  { id: 'champion', name: 'Champion', desc: 'Win the league/season', check: (g) => g.isChampion },
  { id: 'goals_50', name: 'Half Century', desc: 'Score 50 total goals', check: (g) => g.totalGoals >= 50 },
  { id: 'wins_10', name: 'Veteran', desc: 'Win 10 matches', check: (g) => g.totalWins >= 10 },
  { id: 'tackles_20', name: 'Defender', desc: 'Make 20 successful tackles', check: (g) => g.totalTackles >= 20 },
  { id: 'through_balls_10', name: 'Vision', desc: 'Complete 10 through balls', check: (g) => g.totalThroughBalls >= 10 },
];

class GoalRush {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.W = 800;
    this.H = 564;
    this.FIELD_X = 50;
    this.FIELD_Y = 20;
    this.FIELD_W = 700;
    this.FIELD_H = 520;
    this.GOAL_W = 10;
    this.GOAL_H = 120;

    this.state = 'menu';
    this.keys = {};
    this.powerHeld = 0;
    this.powerCharging = false;
    this.audioCtx = null;

    // Mouse aiming
    this.mouseX = 0;
    this.mouseY = 0;
    this.aimAngle = 0;
    this.hasAim = false;

    // Mobile controls
    this.mobileControls = false;
    this.joystickActive = false;
    this.joystickX = 0;
    this.joystickY = 0;
    this.joystickTouchId = null;
    this.mobileTackleActive = false;

    // Double-tap pass detection
    this.lastPassTime = 0;
    this.isThroughBall = false;

    // GK control
    this.controllingGK = false;

    // League mode
    this.leagueMode = false;
    this.leagueTable = [];
    this.leagueRound = 0;
    this.leagueSchedule = [];
    this.isChampion = false;

    // Stats tracking
    this.totalGoals = 0;
    this.totalWins = 0;
    this.totalTackles = 0;
    this.totalThroughBalls = 0;
    this.matchEnded = false;

    // Achievements
    this.achievements = new Set();

    // Gamepad
    this.gamepadConnected = false;
    this.gamepadPrevButtons = [];

    this.playerStats = {
      speed: 3, shot: 5, pass: 5, defense: 4,
      uniform: 0, formation: '4-3-2'
    };

    this.loadSave();
    this.setupInput();
    this.detectMobile();
    this.updateCoins();
    this.loop();
  }

  detectMobile() {
    this.mobileControls = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.updateControlsUI();
  }

  updateControlsUI() {
    const hint = document.querySelector('.controls-hint');
    if (!hint) return;
    if (this.mobileControls) {
      hint.innerHTML = '<span>Left: Joystick</span><span>Shoot/Pass/Tackle/Sprint: Buttons</span><span>GK: Switch to keeper</span>';
    } else {
      hint.innerHTML = '<span>WASD: Move</span><span>Space: Shoot</span><span>Q: Pass</span><span>E: Switch</span><span>Shift: Sprint</span><span>T: Tackle</span><span>G: Switch to GK</span>';
    }
  }

  loadSave() {
    const s = JSON.parse(localStorage.getItem('ngn4_goalrush') || '{}');
    if (s.stats) this.playerStats = {...this.playerStats, ...s.stats};
    this.upgrades = s.upgrades || {};
    this.tournamentProgress = s.tournamentProgress || 0;
    this.totalGoals = s.totalGoals || 0;
    this.totalWins = s.totalWins || 0;
    this.totalTackles = s.totalTackles || 0;
    this.totalThroughBalls = s.totalThroughBalls || 0;
    this.achievements = new Set(s.achievements || []);
    this.leagueTable = s.leagueTable || [];
  }

  saveSave() {
    localStorage.setItem('ngn4_goalrush', JSON.stringify({
      stats: this.playerStats,
      upgrades: this.upgrades,
      tournamentProgress: this.tournamentProgress,
      totalGoals: this.totalGoals,
      totalWins: this.totalWins,
      totalTackles: this.totalTackles,
      totalThroughBalls: this.totalThroughBalls,
      achievements: [...this.achievements],
      leagueTable: this.leagueTable
    }));
  }

  updateCoins() {
    const el = document.getElementById('menu-coins');
    if (el) el.textContent = getCoins17();
  }

  initAudio() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playTone(freq, dur, type='sine', vol=0.12) {
    this.initAudio();
    const o = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + dur);
    o.connect(g); g.connect(this.audioCtx.destination);
    o.start(); o.stop(this.audioCtx.currentTime + dur);
  }

  playSfx(n) {
    switch(n) {
      case 'kick': this.playTone(200, 0.1, 'square', 0.15); break;
      case 'goal': [523,659,784,1047].forEach((f,i) => setTimeout(()=>this.playTone(f,0.3,'sine',0.12),i*80)); break;
      case 'whistle': this.playTone(800, 0.4, 'sine', 0.1); setTimeout(()=>this.playTone(1000,0.3,'sine',0.08),200); break;
      case 'tackle': this.playTone(150, 0.15, 'sawtooth', 0.1); break;
      case 'save': this.playTone(400, 0.2, 'triangle', 0.1); break;
      case 'achievement': this.playTone(523,0.15,'sine',0.1); setTimeout(()=>this.playTone(784,0.2,'sine',0.1),100); break;
    }
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  showMenu() { this.state = 'menu'; this.showScreen('menu-screen'); this.updateCoins(); }
  showHow() { this.showScreen('how-screen'); }

  showShop() {
    this.showScreen('shop-screen');
    const grid = document.getElementById('shop-items');
    grid.innerHTML = '';
    const items = [
      { id: 'speed', name: 'Speed +1', desc: 'Run faster', cost: 100 },
      { id: 'shot', name: 'Shot Power +1', desc: 'Stronger kicks', cost: 100 },
      { id: 'pass', name: 'Passing +1', desc: 'Better passes', cost: 80 },
      { id: 'defense', name: 'Defense +1', desc: 'Better tackling', cost: 80 },
      { id: 'sprint', name: 'Sprint Boost', desc: 'Longer sprint', cost: 150 },
      { id: 'uniform1', name: 'Gold Uniform', desc: 'Look sharp', cost: 200 },
      { id: 'uniform2', name: 'Fire Uniform', desc: 'Blaze on the field', cost: 300 },
      { id: 'uniform3', name: 'Ice Uniform', desc: 'Cool as ice', cost: 300 },
      { id: 'formation1', name: '4-4-1', desc: 'Defensive', cost: 150 },
      { id: 'formation2', name: '3-4-2', desc: 'Balanced', cost: 150 },
      { id: 'formation3', name: '2-4-3', desc: 'Attacking', cost: 150 },
      { id: 'stadium', name: 'Neon Stadium', desc: 'Futuristic arena', cost: 500 },
    ];
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'shop-item' + (this.upgrades[item.id] ? ' owned' : '');
      div.innerHTML = `<div class="name">${item.name}</div><div class="desc">${item.desc}</div><div class="price">${this.upgrades[item.id] ? 'OWNED' : item.cost + ' 🪙'}</div>`;
      if (!this.upgrades[item.id]) {
        div.onclick = () => this.buyItem(item);
      }
      grid.appendChild(div);
    });
  }

  buyItem(item) {
    const coins = getCoins17();
    if (coins < item.cost) return;
    generateRewards17(-item.cost);
    this.upgrades[item.id] = true;
    if (['speed','shot','pass','defense'].includes(item.id)) {
      this.playerStats[item.id]++;
    }
    if (item.id === 'formation1') this.playerStats.formation = '4-4-1';
    if (item.id === 'formation2') this.playerStats.formation = '3-4-2';
    if (item.id === 'formation3') this.playerStats.formation = '2-4-3';
    this.saveSave();
    this.updateCoins();
    this.playTone(600, 0.2, 'sine', 0.1);
    this.showShop();
  }

  setupInput() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ' && this.state === 'playing') {
        e.preventDefault();
        this.powerCharging = true;
      }
      if (e.key.toLowerCase() === 'q' && this.state === 'playing') this.passBall();
      if (e.key.toLowerCase() === 'e' && this.state === 'playing') this.switchPlayer();
      if (e.key.toLowerCase() === 'g' && this.state === 'playing') this.switchToGK();
      if (e.key.toLowerCase() === 't' && this.state === 'playing') this.attemptTackle();
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      if (e.key === ' ' && this.state === 'playing') {
        e.preventDefault();
        this.shootBall();
      }
    });

    // Mouse aiming
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.state !== 'playing') return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
      this.hasAim = true;
    }, {
      // Keyboard aim with arrow keys (when no mouse aim)
      // aimAngleX and aimAngleY are updated in updateControlledPlayer
    });
    this.canvas.addEventListener('mouseleave', () => { this.hasAim = false; });

    // Mobile touch controls
    this.canvas.addEventListener('touchstart', (e) => {
      if (this.state !== 'playing' || !this.mobileControls) return;
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const rect = this.canvas.getBoundingClientRect();
        const tx = (touch.clientX - rect.left) / rect.width;
        const ty = (touch.clientY - rect.top) / rect.height;

        // Left half = joystick area
        if (tx < 0.4 && this.joystickTouchId === null) {
          this.joystickTouchId = touch.identifier;
          this.joystickBaseX = touch.clientX;
          this.joystickBaseY = touch.clientY;
          this.joystickX = 0;
          this.joystickY = 0;
        } else {
          // Right side = aim direction + buttons
          this.mouseX = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
          this.mouseY = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
          this.hasAim = true;
          if (ty > 0.7 && tx < 0.65) {
            // Shoot area (bottom left of right side)
            this.powerCharging = true;
          } else if (ty < 0.4 && tx < 0.65) {
            // Pass area (top left of right side) - double tap for through ball
            const now = Date.now();
            if (now - this.lastPassTime < 300) {
              this.isThroughBall = true;
            }
            this.lastPassTime = now;
            this.passBall();
          } else if (ty > 0.7 && tx >= 0.65) {
            // Sprint area
            this.mobileSprintActive = true;
          } else if (ty < 0.4 && tx >= 0.65) {
            // Tackle area
            this.attemptTackle();
          }
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (this.state !== 'playing' || !this.mobileControls) return;
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.joystickTouchId) {
          const dx = touch.clientX - this.joystickBaseX;
          const dy = touch.clientY - this.joystickBaseY;
          const dist = Math.hypot(dx, dy);
          const maxDist = 40;
          if (dist > 0) {
            const clampedDist = Math.min(dist, maxDist);
            this.joystickX = (dx / dist) * (clampedDist / maxDist);
            this.joystickY = (dy / dist) * (clampedDist / maxDist);
          }
        } else {
          const rect = this.canvas.getBoundingClientRect();
          this.mouseX = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
          this.mouseY = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
          this.hasAim = true;
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      if (!this.mobileControls) return;
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this.joystickX = 0;
          this.joystickY = 0;
        }
        // If was shooting, release
        if (this.powerCharging) {
          this.shootBall();
          this.mobileSprintActive = false;
        }
      }
    }, { passive: false });

    // Gamepad
    window.addEventListener('gamepadconnected', () => { this.gamepadConnected = true; });
    window.addEventListener('gamepaddisconnected', () => { this.gamepadConnected = false; });
  }

  setupMobileUI() {
    if (!this.mobileControls) return;
    let overlay = document.getElementById('mobile-overlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'mobile-overlay';
    overlay.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:120px;pointer-events:none;z-index:10;';
    overlay.innerHTML = `
      <div style="position:absolute;left:10px;bottom:10px;width:100px;height:100px;border:2px solid rgba(0,255,255,0.3);border-radius:50%;pointer-events:auto;">
        <div id="joystick-knob" style="position:absolute;left:38px;top:38px;width:24px;height:24px;background:rgba(0,255,255,0.5);border-radius:50%;"></div>
      </div>
      <div style="position:absolute;right:10px;bottom:10px;display:grid;grid-template-columns:50px 50px;grid-template-rows:50px 50px;gap:5px;pointer-events:auto;">
        <button id="mob-tackle" style="background:rgba(255,100,0,0.4);border:2px solid #f80;color:#fff;font-size:10px;border-radius:8px;">TACKLE</button>
        <button id="mob-sprint" style="background:rgba(255,255,0,0.4);border:2px solid #ff0;color:#fff;font-size:10px;border-radius:8px;">SPRINT</button>
        <button id="mob-pass" style="background:rgba(0,100,255,0.4);border:2px solid #08f;color:#fff;font-size:10px;border-radius:8px;">PASS</button>
        <button id="mob-shoot" style="background:rgba(255,0,0,0.4);border:2px solid #f44;color:#fff;font-size:10px;border-radius:8px;">SHOOT</button>
      </div>
      <button id="mob-gk" style="position:absolute;right:120px;bottom:60px;background:rgba(0,255,0,0.3);border:2px solid #0f0;color:#fff;font-size:9px;padding:5px 10px;border-radius:5px;pointer-events:auto;">GK</button>
    `;
    document.getElementById('game-screen').appendChild(overlay);

    // Button handlers
    const tackleBtn = document.getElementById('mob-tackle');
    const sprintBtn = document.getElementById('mob-sprint');
    const passBtn = document.getElementById('mob-pass');
    const shootBtn = document.getElementById('mob-shoot');
    const gkBtn = document.getElementById('mob-gk');

    tackleBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this.attemptTackle(); });
    sprintBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this.mobileSprintActive = true; });
    sprintBtn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); this.mobileSprintActive = false; });
    passBtn.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      const now = Date.now();
      if (now - this.lastPassTime < 300) this.isThroughBall = true;
      this.lastPassTime = now;
      this.passBall();
    });
    shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this.powerCharging = true; });
    shootBtn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); this.shootBall(); });
    gkBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this.switchToGK(); });
  }

  createTeam(teamIdx, isPlayer) {
    const team = TEAMS[teamIdx];
    const players = [];
    const positions = this.getFormation(isPlayer, team.formation);
    for (let i = 0; i < 5; i++) {
      players.push({
        x: positions[i].x,
        y: positions[i].y,
        vx: 0, vy: 0,
        radius: 12,
        speed: isPlayer ? this.playerStats.speed : 2 + teamIdx * 0.3,
        shot: isPlayer ? this.playerStats.shot : 4 + teamIdx * 0.2,
        team: isPlayer ? 0 : 1,
        gk: i === 0,
        controlled: isPlayer && i === 1,
        dribbling: false,
        tackleCooldown: 0,
        homeX: positions[i].x,
        homeY: positions[i].y,
        name: team.name
      });
    }
    return { name: team.name, color: team.color, gkColor: team.gk, players, isPlayer, formation: team.formation };
  }

  getFormation(isPlayer, formation) {
    const fx = isPlayer ? 0.15 : 0.85;
    const bx = isPlayer ? 0.85 : 0.15;
    const gkX = isPlayer ? 0.05 : 0.95;

    // Different formations per opponent
    let forwardPositions = [];
    if (formation === '4-4-1') {
      forwardPositions = [0.25, 0.35, 0.45, 0.55, 0.85];
    } else if (formation === '3-4-2') {
      forwardPositions = [0.25, 0.35, 0.45, 0.55, 0.75];
    } else if (formation === '2-4-3') {
      forwardPositions = [0.25, 0.35, 0.55, 0.7, 0.8];
    } else {
      forwardPositions = [0.25, 0.35, 0.45, 0.55, 0.75];
    }
    const ffx = isPlayer ? 1 - forwardPositions[0] : forwardPositions[0];

    return [
      { x: this.FIELD_X + this.FIELD_W * (isPlayer ? gkX : 1 - gkX), y: this.FIELD_Y + this.FIELD_H * 0.5 },
      { x: this.FIELD_X + this.FIELD_W * (isPlayer ? ffx : 1 - ffx), y: this.FIELD_Y + this.FIELD_H * 0.2 },
      { x: this.FIELD_X + this.FIELD_W * (isPlayer ? (isPlayer ? 0.2 : 0.8) : (isPlayer ? 0.2 : 0.8)), y: this.FIELD_Y + this.FIELD_H * 0.4 },
      { x: this.FIELD_X + this.FIELD_W * (isPlayer ? (isPlayer ? 0.3 : 0.7) : (isPlayer ? 0.3 : 0.7)), y: this.FIELD_Y + this.FIELD_H * 0.6 },
      { x: this.FIELD_X + this.FIELD_W * (isPlayer ? (isPlayer ? 0.35 : 0.65) : (isPlayer ? 0.35 : 0.65)), y: this.FIELD_Y + this.FIELD_H * 0.8 },
    ];
  }

  initMatch(opponentIdx) {
    this.matchTime = 120 * 60;
    this.half = 1;
    this.score = [0, 0];
    this.goals = [];
    this.assists = 0;
    this.lastKicker = null;
    this.matchEnded = false;
    this.controllingGK = false;

    this.team1 = this.createTeam(0, true);
    this.team2 = this.createTeam(opponentIdx, false);

    this.ball = {
      x: this.FIELD_X + this.FIELD_W / 2,
      y: this.FIELD_Y + this.FIELD_H / 2,
      vx: 0, vy: 0,
      radius: 6,
      owner: null
    };

    this.kickoff();
    this.state = 'playing';
    this.showScreen('game-screen');
    this.playSfx('whistle');
    if (this.mobileControls) this.setupMobileUI();
  }

  kickoff() {
    this.ball.x = this.FIELD_X + this.FIELD_W / 2;
    this.ball.y = this.FIELD_Y + this.FIELD_H / 2;
    this.ball.vx = 0; this.ball.vy = 0;
    this.ball.owner = this.team1.players[1];
  }

  // ===== LEAGUE MODE =====
  startLeague() {
    this.leagueMode = true;
    // Initialize league table with all teams
    this.leagueTable = TEAMS.map((t, i) => ({
      idx: i, name: t.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0
    }));
    // Round-robin: each team plays each other twice (home and away)
    // Player is always team 0
    this.leagueSchedule = [];
    const opponents = TEAMS.slice(1);
    for (let i = 0; i < opponents.length; i++) {
      this.leagueSchedule.push({ home: 0, away: i + 1 });
      this.leagueSchedule.push({ home: i + 1, away: 0 });
    }
    this.leagueRound = 0;
    this.isChampion = false;
    this.playLeagueMatch();
  }

  playLeagueMatch() {
    if (this.leagueRound >= this.leagueSchedule.length) {
      this.leagueFinished();
      return;
    }
    const match = this.leagueSchedule[this.leagueRound];
    this.currentOpponent = match.away === 0 ? match.home : match.away;
    this.initMatch(this.currentOpponent);
  }

  leagueFinished() {
    // Sort table by points
    this.leagueTable.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
    const winner = this.leagueTable[0];
    if (winner.idx === 0) {
      this.isChampion = true;
      generateRewards17(500);
      this.checkAchievements();
    }
    this.state = 'league_result';
    this.showScreen('tournament-win-screen');
    document.getElementById('tournament-stats').innerHTML = `
      <div style="font-size:14px;margin-bottom:10px;">LEAGUE TABLE</div>
      ${this.leagueTable.map((t, i) => {
        const color = t.idx === 0 ? '#0ff' : '#fff';
        return `<div style="color:${color};font-size:12px;padding:2px 0;">${i+1}. ${t.name}: ${t.pts}pts (W${t.won} D${t.drawn} L${t.lost})</div>`;
      }).join('')}
    `;
    document.getElementById('tournament-reward').textContent = this.isChampion ? '+500 🪙 LEAGUE CHAMPION!' : 'Better luck next season!';
    this.saveSave();
    this.updateCoins();
  }

  startTournament() {
    this.leagueMode = false;
    this.tournamentRound = this.tournamentProgress;
    this.tournamentMatches = [];
    for (let i = 1; i < TEAMS.length; i++) this.tournamentMatches.push(i);
    this.tournamentWins = 0;
    this.playTournamentMatch();
  }

  playTournamentMatch() {
    if (this.tournamentRound >= this.tournamentMatches.length) {
      this.tournamentWin();
      return;
    }
    const opp = this.tournamentMatches[this.tournamentRound];
    this.currentOpponent = opp;
    this.initMatch(opp);
  }

  quickMatch() {
    this.leagueMode = false;
    this.tournamentRound = 0;
    this.currentOpponent = 1 + Math.floor(Math.random() * (TEAMS.length - 1));
    this.initMatch(this.currentOpponent);
  }

  // ===== PLAYER SWITCHING & GK =====
  switchPlayer() {
    const team = this.team1;
    const ball = this.ball;
    let closest = null, minDist = Infinity;
    team.players.forEach(p => {
      if (p.controlled || p.gk) return;
      const d = Math.hypot(p.x - ball.x, p.y - ball.y);
      if (d < minDist) { minDist = d; closest = p; }
    });
    if (closest) {
      team.players.forEach(p => p.controlled = false);
      closest.controlled = true;
      this.controllingGK = false;
    }
  }

  switchToGK() {
    this.team1.players.forEach(p => p.controlled = false);
    this.team1.players[0].controlled = true;
    this.controllingGK = true;
  }

  // ===== PASSING & THROUGH BALLS =====
  passBall() {
    if (this.ball.owner && this.ball.owner.team === 0) {
      let closest = null, minDist = Infinity;
      this.team1.players.forEach(p => {
        if (p === this.ball.owner) return;
        const d = Math.hypot(p.x - this.ball.x, p.y - this.ball.y);
        if (d < minDist && d < 300) { minDist = d; closest = p; }
      });
      if (closest) {
        const dx = closest.x - this.ball.x;
        const dy = closest.y - this.ball.y;
        const dist = Math.hypot(dx, dy);
        const speed = 5 + this.playerStats.pass * 0.5;

        if (this.isThroughBall) {
          // Through ball: send ball AHEAD of teammate toward opponent goal
          const goalX = this.FIELD_X + this.FIELD_W;
          const goalY = this.FIELD_Y + this.FIELD_H / 2;
          const aheadX = closest.x + (goalX - closest.x) * 0.5;
          const aheadY = closest.y + (goalY - closest.y) * 0.2;
          const tdx = aheadX - this.ball.x;
          const tdy = aheadY - this.ball.y;
          const tdist = Math.hypot(tdx, tdy);
          this.ball.vx = (tdx / tdist) * speed * 1.2;
          this.ball.vy = (tdy / tdist) * speed * 1.2;
          this.totalThroughBalls++;
          this.isThroughBall = false;
          this.checkAchievements();
        } else {
          this.ball.vx = (dx / dist) * speed;
          this.ball.vy = (dy / dist) * speed;
        }

        this.ball.owner = null;
        this.lastKicker = this.team1.players.find(p => p.controlled);
        this.assists++;
        this.playSfx('kick');
      }
    }
    this.isThroughBall = false;
  }

  // ===== TACKLING =====
  attemptTackle() {
    const cp = this.team1.players.find(p => p.controlled);
    if (!cp || cp.tackleCooldown > 0) return;

    // Find nearest opponent near the controlled player
    let nearest = null, minDist = Infinity;
    this.team2.players.forEach(p => {
      const d = Math.hypot(p.x - cp.x, p.y - cp.y);
      if (d < 40 && d < minDist) { minDist = d; nearest = p; }
    });

    if (nearest && this.ball.owner === nearest) {
      // Timing-based: success chance increases if opponent is dribbling
      const isDribbling = nearest.dribbling;
      const successChance = isDribbling ? 0.65 : 0.25;
      const tackleBonus = this.playerStats.defense * 0.03;

      if (Math.random() < successChance + tackleBonus) {
        // Successful tackle
        this.ball.owner = cp;
        nearest.dribbling = false;
        this.totalTackles++;
        this.checkAchievements();
        this.playSfx('tackle');
      } else {
        this.playTone(100, 0.1, 'sawtooth', 0.05);
      }
      cp.tackleCooldown = 20;
    }
  }

  // ===== SHOOTING WITH AIM =====
  shootBall() {
    this.powerCharging = false;
    if (!this.ball.owner || this.ball.owner.team !== 0) return;
    const power = Math.min(this.powerHeld, 100) / 100;
    this.powerHeld = 0;

    // Determine aim direction
    let dx, dy, dist;
    if (this.hasAim && this.mobileControls) {
      // Mobile: aim toward touch position
      dx = this.mouseX - this.ball.x;
      dy = this.mouseY - this.ball.y;
      dist = Math.hypot(dx, dy);
    } else if (this.hasAim) {
      // Desktop: aim toward mouse position
      dx = this.mouseX - this.ball.x;
      dy = this.mouseY - this.ball.y;
      dist = Math.hypot(dx, dy);
    } else {
      // Fallback: aim at goal center
      dx = (this.FIELD_X + this.FIELD_W) - this.ball.x;
      dy = (this.FIELD_Y + this.FIELD_H / 2) - this.ball.y;
      dist = Math.hypot(dx, dy);
    }
    if (dist === 0) { dx = 1; dist = 1; }

    const speed = 5 + power * 10 + this.playerStats.shot * 0.5;
    const accuracy = 1 - power * 0.7; // Higher power = more accurate
    this.ball.vx = (dx / dist) * speed + (Math.random() - 0.5) * accuracy * 2;
    this.ball.vy = (dy / dist) * speed + (Math.random() - 0.5) * accuracy * 2;
    this.ball.owner = null;
    this.lastKicker = this.team1.players.find(p => p.controlled);
    this.playSfx('kick');
  }

  updateControlledPlayer() {
    const cp = this.team1.players.find(p => p.controlled);
    if (!cp) return;
    let dx = 0, dy = 0;

    if (this.joystickTouchId !== null || (this.joystickX !== 0 || this.joystickY !== 0)) {
      // Mobile joystick
      dx = this.joystickX;
      dy = this.joystickY;
    } else {
      // Keyboard
      if (this.keys['w']) dy = -1;
      if (this.keys['s']) dy = 1;
      if (this.keys['a']) dx = -1;
      if (this.keys['d']) dx = 1;
    }

    let speed = cp.speed + (this.upgrades['sprint'] ? 0.5 : 0);
    if (this.keys['shift'] || this.mobileSprintActive) speed *= 1.3;

    // GK movement restrictions
    if (cp.gk) {
      speed *= 0.9;
      const gkMinX = this.FIELD_X + 10;
      const gkMaxX = this.FIELD_X + 60;
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        cp.x += (dx / len) * speed;
        cp.y += (dy / len) * speed;
      }
      cp.x = Math.max(gkMinX, Math.min(gkMaxX, cp.x));
      const top = this.FIELD_Y + this.FIELD_H / 2 - this.GOAL_H / 2;
      const bot = this.FIELD_Y + this.FIELD_H / 2 + this.GOAL_H / 2;
      cp.y = Math.max(top, Math.min(bot, cp.y));

      // GK dive if ball is near and heading to goal
      if (this.ball.owner !== cp && !this.ball.owner) {
        const ballDist = Math.hypot(this.ball.x - cp.x, this.ball.y - cp.y);
        if (ballDist < 100 && this.ball.x < this.FIELD_X + 60) {
          cp.y += (this.ball.y - cp.y) * 0.15;
        }
      }
    } else {
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        cp.x += (dx / len) * speed;
        cp.y += (dy / len) * speed;
      }
      cp.x = Math.max(this.FIELD_X + cp.radius, Math.min(this.FIELD_X + this.FIELD_W - cp.radius, cp.x));
      cp.y = Math.max(this.FIELD_Y + cp.radius, Math.min(this.FIELD_Y + this.FIELD_H - cp.radius, cp.y));
    }

    // Carry ball
    if (this.ball.owner === cp) {
      const carryDist = cp.gk ? 12 : 18;
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        this.ball.x = cp.x + (dx / len) * carryDist;
        this.ball.y = cp.y + (dy / len) * carryDist;
      } else {
        this.ball.x = cp.x + carryDist;
        this.ball.y = cp.y;
      }
    }

    // Tackle cooldown
    if (cp.tackleCooldown > 0) cp.tackleCooldown--;

    if (this.powerCharging) {
      this.powerHeld = Math.min(this.powerHeld + 1.5, 100);
    }
    document.getElementById('power-bar').style.width = this.powerHeld + '%';

    // Calculate aim angle
    if (this.hasAim && this.ball.owner === cp) {
      this.aimAngle = Math.atan2(this.mouseY - cp.y, this.mouseX - cp.x);
    }

    // Keyboard aiming with arrow keys (when no mouse on canvas)
    if (!this.hasAim && this.ball.owner === cp) {
      let aimDx = 0, aimDy = 0;
      if (this.keys['arrowup']) aimDy = -1;
      if (this.keys['arrowdown']) aimDy = 1;
      if (this.keys['arrowleft']) aimDx = -1;
      if (this.keys['arrowright']) aimDx = 1;
      if (aimDx || aimDy) {
        this.aimAngle = Math.atan2(aimDy, aimDx);
        this.hasAim = true;
        // Store aim direction for shooting
        this.mouseX = cp.x + Math.cos(this.aimAngle) * 200;
        this.mouseY = cp.y + Math.sin(this.aimAngle) * 200;
      }
    }
  }

  // ===== IMPROVED AI =====
  updateAI() {
    // Teammates AI
    this.team1.players.forEach(p => {
      if (p.controlled || p.gk) return;
      if (p.tackleCooldown > 0) p.tackleCooldown--;

      if (this.ball.owner === p) {
        // Teammate has ball - move forward and look to pass/shoot
        const goalX = this.FIELD_X + this.FIELD_W;
        const goalY = this.FIELD_Y + this.FIELD_H / 2;
        const dx = goalX - p.x;
        const dy = goalY - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 250 && Math.random() < 0.01) {
          // Shoot
          const speed = 5 + p.shot * 0.3;
          this.ball.vx = (dx / dist) * speed + (Math.random() - 0.5) * 3;
          this.ball.vy = (dy / dist) * speed + (Math.random() - 0.5) * 3;
          this.ball.owner = null;
          this.playSfx('kick');
        } else if (Math.random() < 0.005) {
          // Pass to nearest teammate
          let closest = null, minDist = Infinity;
          this.team1.players.forEach(tp => {
            if (tp === p || tp.gk) return;
            const d = Math.hypot(tp.x - p.x, tp.y - p.y);
            if (d < minDist) { minDist = d; closest = tp; }
          });
          if (closest) {
            const pdx = closest.x - p.x;
            const pdy = closest.y - p.y;
            const pdist = Math.hypot(pdx, pdy);
            this.ball.vx = (pdx / pdist) * 5;
            this.ball.vy = (pdy / pdist) * 5;
            this.ball.owner = null;
            this.playSfx('kick');
          }
        } else {
          p.dribbling = true;
          p.x += (dx / dist) * p.speed * 0.6;
          p.y += (dy / dist) * p.speed * 0.6;
          this.ball.x = p.x + (dx / dist) * 16;
          this.ball.y = p.y + (dy / dist) * 16;
        }
      } else if (!this.ball.owner) {
        // Chase ball
        const dx = this.ball.x - p.x;
        const dy = this.ball.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 15) {
          p.x += (dx / dist) * p.speed * 0.6;
          p.y += (dy / dist) * p.speed * 0.6;
        }
      } else {
        // Position based on formation
        p.x += (p.homeX - p.x) * 0.03;
        p.y += (p.homeY - p.y) * 0.03;
      }

      p.x = Math.max(this.FIELD_X + p.radius, Math.min(this.FIELD_X + this.FIELD_W - p.radius, p.x));
      p.y = Math.max(this.FIELD_Y + p.radius, Math.min(this.FIELD_Y + this.FIELD_H - p.radius, p.y));
    });

    // Player GK AI (when not controlled)
    const gk1 = this.team1.players[0];
    if (!gk1.controlled) {
      const gkTargetY = this.FIELD_Y + this.FIELD_H / 2 + (this.ball.y - (this.FIELD_Y + this.FIELD_H / 2)) * 0.5;
      gk1.x += (this.FIELD_X + 20 - gk1.x) * 0.1;
      gk1.y += (gkTargetY - gk1.y) * 0.08;
      const gkGoalTop = this.FIELD_Y + this.FIELD_H / 2 - this.GOAL_H / 2 - 30;
      const gkGoalBot = this.FIELD_Y + this.FIELD_H / 2 + this.GOAL_H / 2 + 30;
      gk1.y = Math.max(gkGoalTop, Math.min(gkGoalBot, gk1.y));

      // GK auto-save
      if (!this.ball.owner && this.ball.x < this.FIELD_X + 50 && Math.abs(this.ball.y - gk1.y) < 40) {
        const dx = this.ball.x - gk1.x;
        const dy = this.ball.y - gk1.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 30) {
          this.ball.owner = gk1;
          this.ball.vx = 0; this.ball.vy = 0;
          this.playSfx('save');
          // Clear ball after save
          setTimeout(() => {
            if (this.ball.owner === gk1) {
              this.ball.owner = null;
              const target = this.team1.players.find(p => !p.gk && Math.hypot(p.x - gk1.x, p.y - gk1.y) < 300);
              if (target) {
                const tdx = target.x - gk1.x;
                const tdy = target.y - gk1.y;
                const tdist = Math.hypot(tdx, tdy);
                this.ball.vx = (tdx / tdist) * 6;
                this.ball.vy = (tdy / tdist) * 6;
              }
            }
          }, 300);
        }
      }
    }

    // Opponent AI with formations and passing
    const opponentFormation = this.team2.formation || '4-3-2';
    const gk2 = this.team2.players[0];
    const gk2TargetY = this.FIELD_Y + this.FIELD_H / 2 + (this.ball.y - (this.FIELD_Y + this.FIELD_H / 2)) * 0.5;
    gk2.x += (this.FIELD_X + this.FIELD_W - 20 - gk2.x) * 0.1;
    gk2.y += (gk2TargetY - gk2.y) * 0.08;
    const gk2GoalTop = this.FIELD_Y + this.FIELD_H / 2 - this.GOAL_H / 2 - 30;
    const gk2GoalBot = this.FIELD_Y + this.FIELD_H / 2 + this.GOAL_H / 2 + 30;
    gk2.y = Math.max(gk2GoalTop, Math.min(gk2GoalBot, gk2.y));

    // Opponent GK auto-save
    if (!this.ball.owner && this.ball.x > this.FIELD_X + this.FIELD_W - 50 && Math.abs(this.ball.y - gk2.y) < 40) {
      const dx = this.ball.x - gk2.x;
      const dy = this.ball.y - gk2.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 30) {
        this.ball.owner = gk2;
        this.ball.vx = 0; this.ball.vy = 0;
        this.playSfx('save');
        setTimeout(() => {
          if (this.ball.owner === gk2) {
            this.ball.owner = null;
            const target = this.team2.players.find(p => !p.gk && Math.hypot(p.x - gk2.x, p.y - gk2.y) < 300);
            if (target) {
              const tdx = target.x - gk2.x;
              const tdy = target.y - gk2.y;
              const tdist = Math.hypot(tdx, tdy);
              this.ball.vx = (tdx / tdist) * 6;
              this.ball.vy = (tdy / tdist) * 6;
            }
          }
        }, 300);
      }
    }

    // Opponent field players - different behavior per formation
    const formationAggression = opponentFormation === '2-4-3' ? 1.3 : opponentFormation === '3-4-2' ? 1.0 : 0.7;

    for (let i = 1; i < this.team2.players.length; i++) {
      const p = this.team2.players[i];
      if (this.ball.owner === p) {
        p.dribbling = true;
        const goalX = this.FIELD_X;
        const goalY = this.FIELD_Y + this.FIELD_H / 2 + (Math.random() - 0.5) * 80;
        const dx = goalX - p.x;
        const dy = goalY - p.y;
        const dist = Math.hypot(dx, dy);
        const shootRange = 200 * formationAggression;

        if (dist < shootRange && Math.random() < 0.02 * formationAggression) {
          const speed = 6 + p.shot * 0.3;
          this.ball.vx = (dx / dist) * speed + (Math.random() - 0.5) * 2;
          this.ball.vy = (dy / dist) * speed + (Math.random() - 0.5) * 2;
          this.ball.owner = null;
          p.dribbling = false;
          this.playSfx('kick');
        } else if (Math.random() < 0.008) {
          // AI passing between teammates
          let closest = null, minDist = Infinity;
          this.team2.players.forEach(tp => {
            if (tp === p || tp.gk) return;
            const d = Math.hypot(tp.x - p.x, tp.y - p.y);
            if (d < minDist && d < 250) { minDist = d; closest = tp; }
          });
          if (closest && closest.x < p.x) {
            // Only pass backward or sideways (not forward)
            const pdx = closest.x - p.x;
            const pdy = closest.y - p.y;
            const pdist = Math.hypot(pdx, pdy);
            this.ball.vx = (pdx / pdist) * 5;
            this.ball.vy = (pdy / pdist) * 5;
            this.ball.owner = null;
            p.dribbling = false;
            this.playSfx('kick');
          }
        } else {
          p.x += (dx / dist) * p.speed * 0.8;
          p.y += (dy / dist) * p.speed * 0.8;
          this.ball.x = p.x + (dx / dist) * 18;
          this.ball.y = p.y + (dy / dist) * 18;
        }
      } else if (!this.ball.owner) {
        // Chase ball - nearest player goes, others hold position
        let nearestDist = Infinity;
        this.team2.players.forEach(tp => { if (!tp.gk) { const d = Math.hypot(this.ball.x - tp.x, this.ball.y - tp.y); if (d < nearestDist) nearestDist = d; }});
        const isNearest = Math.hypot(this.ball.x - p.x, this.ball.y - p.y) < nearestDist + 5;

        if (isNearest) {
          const dx = this.ball.x - p.x;
          const dy = this.ball.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 15) {
            p.x += (dx / dist) * p.speed * 0.65;
            p.y += (dy / dist) * p.speed * 0.65;
          }
        } else {
          // Hold formation position
          p.x += (p.homeX - p.x) * 0.02;
          p.y += (p.homeY - p.y) * 0.02;
        }
      } else if (this.ball.owner.team === 0) {
        // Defending - mark nearest player or ball
        const ballDist = Math.hypot(this.ball.x - p.x, this.ball.y - p.y);
        if (ballDist < 150) {
          const dx = this.ball.x - p.x;
          const dy = this.ball.y - p.y;
          const dist = Math.hypot(dx, dy);
          p.x += (dx / dist) * p.speed * 0.4;
          p.y += (dy / dist) * p.speed * 0.4;
        } else {
          p.x += (p.homeX - p.x) * 0.02;
          p.y += (p.homeY - p.y) * 0.02;
        }
      } else {
        // Teammate has ball - support run
        const supporter = this.ball.owner;
        const dx = supporter.x + (this.FIELD_X - supporter.x) * 0.3 - p.x;
        const dy = supporter.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 50) {
          p.x += (dx / dist) * p.speed * 0.3;
          p.y += (dy / dist) * p.speed * 0.3;
        }
      }
      p.x = Math.max(this.FIELD_X + p.radius, Math.min(this.FIELD_X + this.FIELD_W - p.radius, p.x));
      p.y = Math.max(this.FIELD_Y + p.radius, Math.min(this.FIELD_Y + this.FIELD_H - p.radius, p.y));
    }
  }

  updateBall() {
    if (this.ball.owner) {
      // Tackle detection
      const owner = this.ball.owner;
      const opponent = owner.team === 0 ? this.team2 : this.team1;
      for (let p of opponent.players) {
        const d = Math.hypot(p.x - owner.x, p.y - owner.y);
        if (d < 24 && Math.random() < 0.05 + (owner.team === 1 ? 0 : this.playerStats.defense * 0.01)) {
          this.ball.owner = p;
          owner.dribbling = false;
          if (owner.team === 1) {
            // AI tackled our player
            this.playSfx('tackle');
          }
          break;
        }
      }
      return;
    }

    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;
    this.ball.vx *= 0.985;
    this.ball.vy *= 0.985;

    // Ball bounces off actual field top/bottom edges
    if (this.ball.y < this.FIELD_Y + this.ball.radius) { this.ball.y = this.FIELD_Y + this.ball.radius; this.ball.vy *= -0.6; }
    if (this.ball.y > this.FIELD_Y + this.FIELD_H - this.ball.radius) { this.ball.y = this.FIELD_Y + this.FIELD_H - this.ball.radius; this.ball.vy *= -0.6; }

    // Goals (only within actual goal opening)
    const goalTop = this.FIELD_Y + this.FIELD_H / 2 - this.GOAL_H / 2;
    const goalBot = this.FIELD_Y + this.FIELD_H / 2 + this.GOAL_H / 2;
    if (this.ball.x <= this.FIELD_X && this.ball.y > goalTop && this.ball.y < goalBot) {
      this.score[1]++;
      this.goals.push({ team: 1, time: 120 - Math.floor(this.matchTime / 60) });
      this.ball.vx = 0; this.ball.vy = 0;
      this.playSfx('goal');
      this.resetPositions(1);
      return;
    }
    if (this.ball.x >= this.FIELD_X + this.FIELD_W && this.ball.y > goalTop && this.ball.y < goalBot) {
      this.score[0]++;
      this.totalGoals++;
      this.goals.push({ team: 0, time: 120 - Math.floor(this.matchTime / 60) });
      generateRewards17(5);
      this.ball.vx = 0; this.ball.vy = 0;
      this.playSfx('goal');
      this.resetPositions(0);
      return;
    }

    if (this.ball.x < this.FIELD_X - 20 || this.ball.x > this.FIELD_X + this.FIELD_W + 20) {
      this.resetPositions(this.ball.x < this.FIELD_X + this.FIELD_W / 2 ? 1 : 0);
      return;
    }

    const allPlayers = [...this.team1.players, ...this.team2.players];
    for (let p of allPlayers) {
      const d = Math.hypot(p.x - this.ball.x, p.y - this.ball.y);
      if (d < p.radius + this.ball.radius + 5) {
        this.ball.owner = p;
        this.ball.vx = 0; this.ball.vy = 0;
        break;
      }
    }
  }

  resetPositions(goalTeam) {
    setTimeout(() => {
      const form1 = this.getFormation(true, '4-3-2');
      const form2 = this.getFormation(false, this.team2.formation);
      this.team1.players.forEach((p, i) => { p.x = form1[i].x; p.y = form1[i].y; p.dribbling = false; });
      this.team2.players.forEach((p, i) => { p.x = form2[i].x; p.y = form2[i].y; p.dribbling = false; });
      this.ball.x = this.FIELD_X + this.FIELD_W / 2;
      this.ball.y = this.FIELD_Y + this.FIELD_H / 2;
      this.ball.vx = 0; this.ball.vy = 0;
      this.ball.owner = goalTeam === 0 ? this.team2.players[1] : this.team1.players[1];
    }, 500);
  }

  updateTimer() {
    this.matchTime--;
    const secs = Math.floor(this.matchTime / 60);
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    document.getElementById('hud-time').textContent = `${mins}:${String(remSecs).padStart(2, '0')}`;
    document.getElementById('hud-score').textContent = `${this.score[0]} - ${this.score[1]}`;
    document.getElementById('hud-half').textContent = this.half === 1 ? '1ST HALF' : '2ND HALF';

    if (this.matchTime <= 0) {
      if (this.half === 1) {
        this.half = 2;
        this.matchTime = 120 * 60;
        this.resetPositions(Math.random() > 0.5 ? 0 : 1);
        this.playSfx('whistle');
      } else {
        this.endMatch();
      }
    }
  }

  endMatch() {
    this.matchEnded = true;
    this.state = 'result';
    this.playSfx('whistle');
    const won = this.score[0] > this.score[1];
    const draw = this.score[0] === this.score[1];
    let coins = this.score[0] * 5 + this.assists * 2;
    if (won) coins += 50;
    if (draw) coins += 20;
    generateRewards17(coins);
    if (won) this.totalWins++;
    this.updateCoins();

    // Update league table
    if (this.leagueMode) {
      const entry = this.leagueTable.find(t => t.idx === 0);
      const oppEntry = this.leagueTable.find(t => t.idx === this.currentOpponent);
      if (entry && oppEntry) {
        entry.played++; oppEntry.played++;
        entry.gf += this.score[0]; entry.ga += this.score[1];
        oppEntry.gf += this.score[1]; oppEntry.ga += this.score[0];
        if (won) { entry.won++; entry.pts += 3; oppEntry.lost++; }
        else if (draw) { entry.drawn++; entry.pts += 1; oppEntry.drawn++; oppEntry.pts += 1; }
        else { entry.lost++; oppEntry.won++; oppEntry.pts += 3; }
      }
    }

    this.checkAchievements();
    this.saveSave();

    document.getElementById('match-result-title').textContent = won ? 'VICTORY!' : draw ? 'DRAW!' : 'DEFEAT';
    document.getElementById('match-result-title').className = 'title' + (won ? ' success' : '');
    document.getElementById('match-result-score').textContent = `${this.score[0]} - ${this.score[1]}`;
    const goalStr = this.goals.map(g => `${g.team === 0 ? '⚽' : '🔴'} ${g.time}'`).join('  ');
    document.getElementById('match-stats').innerHTML = `Goals: ${goalStr || 'None'}<br>Assists: ${this.assists}<br>Achievements: ${this.achievements.size}/${ACHIEVEMENTS_DEF.length}`;
    document.getElementById('match-reward').textContent = `+${coins} 🪙`;

    const nextBtn = document.getElementById('next-match-btn');
    if (this.leagueMode) {
      nextBtn.style.display = 'inline-block';
      nextBtn.textContent = this.leagueRound < this.leagueSchedule.length - 1 ? 'NEXT LEAGUE MATCH →' : 'VIEW RESULTS →';
    } else {
      nextBtn.style.display = won ? 'inline-block' : 'none';
      nextBtn.textContent = 'NEXT MATCH →';
    }
    this.showScreen('match-result-screen');
  }

  nextMatch() {
    if (this.leagueMode) {
      this.leagueRound++;
      this.saveSave();
      this.playLeagueMatch();
    } else {
      this.tournamentProgress = this.tournamentRound + 1;
      this.tournamentWins++;
      this.saveSave();
      this.tournamentRound++;
      if (this.tournamentRound >= this.tournamentMatches.length) {
        this.tournamentWin();
      } else {
        this.showAd(() => this.playTournamentMatch());
      }
    }
  }

  tournamentWin() {
    this.state = 'tournament_win';
    generateRewards17(200);
    this.updateCoins();
    this.tournamentProgress = 0;
    this.saveSave();
    document.getElementById('tournament-stats').innerHTML = `Tournament Champion!<br>Wins: ${this.tournamentWins}<br>Final Score: ${this.score[0]} - ${this.score[1]}`;
    document.getElementById('tournament-reward').textContent = '+200 🪙 CHAMPIONSHIP BONUS!';
    this.showScreen('tournament-win-screen');
  }

  showAd(callback) {
    this.state = 'ad';
    this.showScreen('ad-screen');
    let t = 5;
    const el = document.getElementById('ad-timer-val');
    el.textContent = t;
    const iv = setInterval(() => {
      t--;
      el.textContent = t;
      if (t <= 0) { clearInterval(iv); this.state = 'ad_done'; }
    }, 1000);
    this._adCb = () => { clearInterval(iv); callback(); };
  }

  closeAd() {
    if (this.state === 'ad_done' && this._adCb) { this._adCb(); this._adCb = null; }
  }

  // ===== ACHIEVEMENTS =====
  checkAchievements() {
    for (const a of ACHIEVEMENTS_DEF) {
      if (!this.achievements.has(a.id) && a.check(this)) {
        this.achievements.add(a.id);
        this.playSfx('achievement');
        this.showAchievementPopup(a.name, a.desc);
      }
    }
  }

  showAchievementPopup(name, desc) {
    const popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#0a2a0a;border:2px solid #0f0;padding:15px 25px;z-index:9999;font-family:monospace;text-align:center;color:#fff;pointer-events:none;';
    popup.innerHTML = `<div style="color:#0f0;font-size:14px;">🏆 ACHIEVEMENT: ${name}</div><div style="color:#888;font-size:12px;margin-top:5px">${desc}</div>`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
  }

  // ===== GAMEPAD =====
  updateGamepad() {
    if (this.state !== 'playing') return;
    const gamepads = navigator.getGamepads();
    if (!gamepads || !gamepads[0]) return;
    const gp = gamepads[0];

    // Left stick = movement
    const deadzone = 0.15;
    let lx = 0, ly = 0;
    if (gp.axes[0] && Math.abs(gp.axes[0]) > deadzone) lx = gp.axes[0];
    if (gp.axes[1] && Math.abs(gp.axes[1]) > deadzone) ly = gp.axes[1];

    // Simulate WASD from stick
    this.keys['w'] = ly < -0.1;
    this.keys['s'] = ly > 0.1;
    this.keys['a'] = lx < -0.1;
    this.keys['d'] = lx > 0.1;

    // Right stick = aim
    if (gp.axes[2] || gp.axes[3]) {
      const cp = this.team1.players.find(p => p.controlled);
      if (cp && this.ball.owner === cp) {
        this.mouseX = cp.x + (gp.axes[2] || 0) * 200;
        this.mouseY = cp.y + (gp.axes[3] || 0) * 200;
        this.hasAim = true;
      }
    }

    // A button (0) = shoot
    if (gp.buttons[0] && gp.buttons[0].pressed && (!this.gamepadPrevButtons[0] || !this.gamepadPrevButtons[0].pressed)) {
      this.powerCharging = true;
    }
    if (!gp.buttons[0] || !gp.buttons[0].pressed) {
      if (this.powerCharging && this.gamepadPrevButtons[0] && this.gamepadPrevButtons[0].pressed) {
        this.shootBall();
      }
    }

    // B button (1) = pass
    if (gp.buttons[1] && gp.buttons[1].pressed && (!this.gamepadPrevButtons[1] || !this.gamepadPrevButtons[1].pressed)) {
      this.passBall();
    }

    // X button (2) = tackle
    if (gp.buttons[2] && gp.buttons[2].pressed && (!this.gamepadPrevButtons[2] || !this.gamepadPrevButtons[2].pressed)) {
      this.attemptTackle();
    }

    // Y button (3) = switch player
    if (gp.buttons[3] && gp.buttons[3].pressed && (!this.gamepadPrevButtons[3] || !this.gamepadPrevButtons[3].pressed)) {
      this.switchPlayer();
    }

    // LB (4) = switch to GK
    if (gp.buttons[4] && gp.buttons[4].pressed && (!this.gamepadPrevButtons[4] || !this.gamepadPrevButtons[4].pressed)) {
      this.switchToGK();
    }

    // RB (5) = through ball
    if (gp.buttons[5] && gp.buttons[5].pressed && (!this.gamepadPrevButtons[5] || !this.gamepadPrevButtons[5].pressed)) {
      this.isThroughBall = true;
      this.passBall();
    }

    // RT (7) = sprint
    this.keys['shift'] = gp.buttons[7] && gp.buttons[7].pressed;

    this.gamepadPrevButtons = [...gp.buttons];
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    // Field background
    ctx.fillStyle = '#0a3a0a';
    ctx.fillRect(this.FIELD_X, this.FIELD_Y, this.FIELD_W, this.FIELD_H);

    // Grass stripes
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,80,0,0.3)' : 'rgba(0,60,0,0.3)';
      ctx.fillRect(this.FIELD_X + i * 70, this.FIELD_Y, 70, this.FIELD_H);
    }

    // Field lines
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.FIELD_X, this.FIELD_Y, this.FIELD_W, this.FIELD_H);

    ctx.beginPath();
    ctx.moveTo(this.FIELD_X + this.FIELD_W / 2, this.FIELD_Y);
    ctx.lineTo(this.FIELD_X + this.FIELD_W / 2, this.FIELD_Y + this.FIELD_H);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.FIELD_X + this.FIELD_W / 2, this.FIELD_Y + this.FIELD_H / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,255,0,0.5)';
    ctx.beginPath();
    ctx.arc(this.FIELD_X + this.FIELD_W / 2, this.FIELD_Y + this.FIELD_H / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Goals
    const goalTop = this.FIELD_Y + this.FIELD_H / 2 - this.GOAL_H / 2;
    ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.fillRect(this.FIELD_X - this.GOAL_W, goalTop, this.GOAL_W, this.GOAL_H);
    ctx.strokeStyle = '#0ff';
    ctx.strokeRect(this.FIELD_X - this.GOAL_W, goalTop, this.GOAL_W, this.GOAL_H);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.fillRect(this.FIELD_X + this.FIELD_W, goalTop, this.GOAL_W, this.GOAL_H);
    ctx.strokeStyle = '#f44';
    ctx.strokeRect(this.FIELD_X + this.FIELD_W, goalTop, this.GOAL_W, this.GOAL_H);

    // Goal nets
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let y = goalTop; y < goalTop + this.GOAL_H; y += 15) {
      ctx.beginPath(); ctx.moveTo(this.FIELD_X - this.GOAL_W, y); ctx.lineTo(this.FIELD_X, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.FIELD_X + this.FIELD_W, y); ctx.lineTo(this.FIELD_X + this.FIELD_W + this.GOAL_W, y); ctx.stroke();
    }

    // Penalty areas
    ctx.strokeStyle = 'rgba(0,255,0,0.2)';
    ctx.strokeRect(this.FIELD_X, goalTop + 20, 60, this.GOAL_H - 40);
    ctx.strokeRect(this.FIELD_X + this.FIELD_W - 60, goalTop + 20, 60, this.GOAL_H - 40);

    // Draw players
    const drawPlayer = (p, team) => {
      const color = p.gk ? team.gkColor : team.color;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = p.controlled ? 15 : 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Tackle cooldown indicator
      if (p.tackleCooldown > 0 && p.team === 0) {
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 3, -Math.PI / 2, -Math.PI / 2 + (1 - p.tackleCooldown / 20) * Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // Controlled indicator
      if (p.controlled) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = '#0f0';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - p.radius - 10);
        ctx.lineTo(p.x - 5, p.y - p.radius - 16);
        ctx.lineTo(p.x + 5, p.y - p.radius - 16);
        ctx.closePath();
        ctx.fill();
      }

      // GK label
      if (p.gk) {
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GK', p.x, p.y + 3);
      }
    };

    this.team1.players.forEach(p => drawPlayer(p, this.team1));
    this.team2.players.forEach(p => drawPlayer(p, this.team2));

    // Ball
    if (!this.ball.owner) {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Aim arrow
    if (this.hasAim && this.ball.owner && this.ball.owner.team === 0 && this.ball.owner.controlled) {
      const cp = this.ball.owner;
      const angle = Math.atan2(this.mouseY - cp.y, this.mouseX - cp.x);
      const arrowLen = 40 + this.powerHeld * 0.5;
      const arrowX = cp.x + Math.cos(angle) * arrowLen;
      const arrowY = cp.y + Math.sin(angle) * arrowLen;

      ctx.strokeStyle = this.powerCharging ? `rgba(255, ${Math.floor(255 - this.powerHeld * 2)}, 0, 0.8)` : 'rgba(0, 255, 0, 0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(cp.x, cp.y);
      ctx.lineTo(arrowX, arrowY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead
      const headLen = 10;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - Math.cos(angle - 0.3) * headLen, arrowY - Math.sin(angle - 0.3) * headLen);
      ctx.lineTo(arrowX - Math.cos(angle + 0.3) * headLen, arrowY - Math.sin(angle + 0.3) * headLen);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1;

      // Power indicator text
      if (this.powerCharging) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.floor(this.powerHeld) + '%', cp.x, cp.y - cp.radius - 20);
      }
    }

    // Mobile joystick visualization
    if (this.mobileControls && this.joystickTouchId !== null) {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(60, this.H - 60, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(60 + this.joystickX * 30, this.H - 60 + this.joystickY * 30, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    // GK mode indicator
    if (this.controllingGK) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('🧤 GK CONTROL', this.FIELD_X + 5, this.FIELD_Y + 15);
    }
  }

  loop() {
    if (this.state === 'playing') {
      this.updateGamepad();
      this.updateControlledPlayer();
      this.updateAI();
      this.updateBall();
      this.updateTimer();
      this.render();
    }
    requestAnimationFrame(() => this.loop());
  }
}

const game = new GoalRush();
