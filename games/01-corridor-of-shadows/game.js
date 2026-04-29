/* ================================================================
   NGN5 GAME 01: CORRIDOR OF SHADOWS — 1D FPS
   Built on NGN5 Engine — demonstrates universal input,
   pause, settings, achievements, audio integration
   ================================================================ */
(function () {
  'use strict';

  const game = NGN5.createGame({
    id: 'corridor-of-shadows',
    title: 'Corridor of Shadows',
    canvasId: 'gameCanvas',
    lives: 3,

    onInit() {
      // Player
      this.player = {
        x: 0, y: 0, hp: 100, maxHp: 100,
        shield: 0, maxShield: 50,
        weapon: 0, // 0=rifle, 1=shotgun, 2=plasma
        ammo: [999, 30, 20],
        fireRate: [0.15, 0.5, 0.3],
        fireCooldown: 0,
        damage: [25, 60, 40],
        speed: 5
      };
      this.score = 0;
      this.wave = 0;
      this.waveTimer = 0;
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      this pickups = [];
      this.screenShake = 0;
      this.flashAlpha = 0;
      this.comboCount = 0;
      this.comboTimer = 0;
      this.totalKills = 0;
      this.difficulty = 'normal';

      // Weapon definitions
      this.weapons = [
        { name: 'Pulse Rifle', color: '#0ff', fireRate: 0.15, damage: 25, speed: 12, spread: 0.05, count: 1 },
        { name: 'Scatter Gun', color: '#f80', fireRate: 0.5, damage: 15, speed: 10, spread: 0.3, count: 5 },
        { name: 'Plasma Cannon', color: '#f0f', fireRate: 0.3, damage: 40, speed: 8, spread: 0.08, count: 1, explosive: true }
      ];

      // Achievements
      NGN5.Achievements.registerCheck && NGN5.Achievements.registerCheck('first_blood', () => this.totalKills >= 1, 'First Blood', 'Kill your first enemy', { coins: 25 });
      NGN5.Achievements.registerCheck && NGN5.Achievements.registerCheck('wave_5', () => this.wave >= 5, 'Wave Runner', 'Survive 5 waves', { coins: 100 });
      NGN5.Achievements.registerCheck && NGN5.Achievements.registerCheck('wave_10', () => this.wave >= 10, 'Veteran', 'Survive 10 waves', { coins: 200 });
      NGN5.Achievements.registerCheck && NGN5.Achievements.registerCheck('combo_10', () => this.comboCount >= 10, 'Combo Master', 'Get a 10-kill combo', { coins: 150 });

      // Difficulty settings
      const diff = NGN5.Settings.get('difficulty');
      this.diffMult = diff === 'easy' ? 0.7 : diff === 'hard' ? 1.5 : 1.0;
    },

    onStart() {
      this.player.hp = this.player.maxHp;
      this.player.shield = 0;
      this.player.weapon = 0;
      this.player.ammo = [999, 30, 20];
      this.score = 0;
      this.wave = 0;
      this.waveTimer = 2;
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      this.pickups = [];
      this.totalKills = 0;
      this.comboCount = 0;
      this.comboTimer = 0;
      this.screenShake = 0;
      this.flashAlpha = 0;
      NGN5.Audio.playMusic('tense');
      NGN5.UI.toast('WAVE 1 INCOMING', '#f00');
    },

    onPlaying() {
      const dt = this._dt;
      const c = this.input;

      // Wave management
      this.waveTimer -= dt;
      if (this.waveTimer <= 0 && this.enemies.length === 0) {
        this.wave++;
        this.waveTimer = 3;
        this.spawnWave();
        NGN5.UI.toast('WAVE ' + this.wave, '#f00');
        NGN5.Audio.play('alert');
      }

      // Player movement (1D — left/right + dodge)
      const speed = this.player.speed;
      if (c.left) this.player.x -= speed;
      if (c.right) this.player.x += speed;
      if (c.crouch && c.left) this.player.x -= speed * 0.5;
      if (c.crouch && c.right) this.player.x += speed * 0.5;
      this.player.x = Math.max(40, Math.min(this.W - 40, this.player.x));

      // Dodge/dash
      if (c.actionJustPressed && !this._dodging) {
        this._dodging = true;
        this._dodgeTimer = 0.2;
        this._dodgeDir = c.left ? -1 : c.right ? 1 : 0;
        NGN5.Audio.play('dash');
      }
      if (this._dodging) {
        this._dodgeTimer -= dt;
        this.player.x += this._dodgeDir * speed * 3;
        this.player.x = Math.max(40, Math.min(this.W - 40, this.player.x));
        if (this._dodgeTimer <= 0) this._dodging = false;
      }

      // Weapon switch (1/2/3 keys or slot buttons)
      if (c.slot1JustPressed) { this.player.weapon = 0; NGN5.Audio.play('click'); }
      if (c.slot2JustPressed) { this.player.weapon = 1; NGN5.Audio.play('click'); }
      if (c.slot3JustPressed) { this.player.weapon = 2; NGN5.Audio.play('click'); }

      // Firing
      this.player.fireCooldown -= dt;
      const w = this.weapons[this.player.weapon];
      if ((c.action || c.mouseDown) && this.player.fireCooldown <= 0 && this.player.ammo[this.player.weapon] > 0) {
        this.player.fireCooldown = w.fireRate;
        this.player.ammo[this.player.weapon]--;
        this.fireWeapon(w);
      }

      // Shield recharge
      if (this.player.shield < this.player.maxShield) {
        this.player.shield = Math.min(this.player.maxShield, this.player.shield + 2 * dt);
      }

      // Update projectiles
      this.updateProjectiles(dt);

      // Update enemies
      this.updateEnemies(dt);

      // Update pickups
      this.updatePickups(dt);

      // Update particles
      this.particles = this.particles.filter(p => {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.life -= dt;
        p.vy += 0.1;
        return p.life > 0;
      });

      // Screen shake decay
      this.screenShake *= 0.9;
      this.flashAlpha *= 0.92;

      // Combo timer
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.comboCount = 0;
      }

      // Check death
      if (this.player.hp <= 0) {
        this.player.hp = 0;
        NGN5.Audio.play('death');
        NGN5.Audio.stopMusic();
        this.recordGame(this.score, false, this.totalKills, this.score);
        NGN5.addCoins(Math.floor(this.score / 10));
        this.state = NGN5.GAME_STATES.RESULTS;
      }
    },

    onRender() {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;

      // Screen shake offset
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Background — dark corridor
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0a0a12');
      grad.addColorStop(0.5, '#060610');
      grad.addColorStop(1, '#0a0a12');
      ctx.fillStyle = grad;
      ctx.fillRect(-10, -10, W + 20, H + 20);

      // Corridor walls
      ctx.strokeStyle = '#1a1a2a';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const x = (i + 1) * W / 6;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      // Floor grid
      ctx.strokeStyle = '#0f0f1a';
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Enemy spawn zone indicator
      ctx.fillStyle = '#20000008';
      ctx.fillRect(0, 0, W, 60);

      // Render pickups
      for (const p of this.pickups) {
        const glow = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        ctx.globalAlpha = glow;
        ctx.fillStyle = p.type === 'health' ? '#0f0' : p.type === 'shield' ? '#0ff' : '#ff0';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.type === 'health' ? '+' : p.type === 'shield' ? 'O' : '*', p.x, p.y);
        ctx.globalAlpha = 1;
      }

      // Render enemies
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const eColor = e.type === 'grunt' ? '#f44' : e.type === 'fast' ? '#ff0' : e.type === 'tank' ? '#f80' : '#f0f';
        // Enemy body
        ctx.fillStyle = eColor;
        ctx.shadowColor = eColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        if (e.type === 'tank') {
          ctx.fillRect(e.x - 20, e.y - 25, 40, 50);
        } else if (e.type === 'fast') {
          ctx.moveTo(e.x, e.y - 15);
          ctx.lineTo(e.x + 12, e.y + 10);
          ctx.lineTo(e.x - 12, e.y + 10);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.arc(e.x, e.y, 15, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // HP bar
        if (e.hp < e.maxHp) {
          const barW = 30;
          ctx.fillStyle = '#333';
          ctx.fillRect(e.x - barW / 2, e.y - 25, barW, 3);
          ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#0f0' : '#f00';
          ctx.fillRect(e.x - barW / 2, e.y - 25, barW * (e.hp / e.maxHp), 3);
        }
      }

      // Render projectiles
      for (const p of this.projectiles) {
        ctx.fillStyle = p.color || '#0ff';
        ctx.shadowColor = p.color || '#0ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(p.x - p.vx * 0.3, p.y - p.vy * 0.3, (p.size || 3) * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // Render particles
      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // Render player
      const p = this.player;
      const pGlow = this._dodging ? '#fff' : '#0f0';
      ctx.fillStyle = pGlow;
      ctx.shadowColor = pGlow;
      ctx.shadowBlur = this._dodging ? 20 : 12;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 20);
      ctx.lineTo(p.x + 12, p.y + 15);
      ctx.lineTo(p.x - 12, p.y + 15);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Weapon indicator
      const w = this.weapons[p.weapon];
      ctx.fillStyle = w.color;
      ctx.fillRect(p.x - 8, p.y + 15, 16, 6);
      // Muzzle flash
      if (p.fireCooldown > w.fireRate * 0.7) {
        ctx.fillStyle = w.color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 25, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Damage flash
      if (this.flashAlpha > 0.01) {
        ctx.fillStyle = 'rgba(255,0,0,' + (this.flashAlpha * 0.3) + ')';
        ctx.fillRect(-10, -10, W + 20, H + 20);
      }

      ctx.restore(); // undo shake

      // ── HUD (not affected by shake) ──
      this.drawHUD(ctx, W, H);
    },

    onMenu() {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;

      ctx.fillStyle = '#060610';
      ctx.fillRect(0, 0, W, H);

      // Animated background particles
      const t = Date.now() * 0.001;
      ctx.fillStyle = '#0f03';
      for (let i = 0; i < 30; i++) {
        const x = (Math.sin(t + i * 0.7) * 0.5 + 0.5) * W;
        const y = (Math.cos(t * 0.8 + i * 1.1) * 0.5 + 0.5) * H;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f0';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('CORRIDOR OF SHADOWS', W / 2, H * 0.25);

      ctx.fillStyle = '#0ff';
      ctx.font = '14px monospace';
      ctx.fillText('1D FPS DEFENSE', W / 2, H * 0.32);

      ctx.fillStyle = '#666';
      ctx.font = '12px monospace';
      ctx.fillText('Defend the corridor against waves of Void Fleet enemies', W / 2, H * 0.40);

      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.fillText('PRESS ENTER OR START', W / 2, H * 0.55);

      ctx.fillStyle = '#444';
      ctx.font = '11px monospace';
      const controls = [
        'A/D or Arrows: Move | SPACE/Click: Fire',
        '1/2/3: Switch Weapons | SHIFT: Dodge',
        'ENTER/START: Pause | ESC: Back | SHIFT+ESC: Settings'
      ];
      controls.forEach((line, i) => {
        ctx.fillText(line, W / 2, H * 0.68 + i * 18);
      });

      // Coins
      ctx.fillStyle = '#ff0';
      ctx.font = '12px monospace';
      ctx.fillText('Coins: ' + NGN5.getCoins(), W / 2, H * 0.88);
    },

    onResults() {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;

      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#f00';
      ctx.font = 'bold 28px monospace';
      ctx.fillText('MISSION FAILED', W / 2, H * 0.25);

      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.fillText('Score: ' + this.score, W / 2, H * 0.38);
      ctx.fillText('Waves Survived: ' + this.wave, W / 2, H * 0.44);
      ctx.fillText('Enemies Defeated: ' + this.totalKills, W / 2, H * 0.50);
      ctx.fillText('Best Combo: ' + this.comboCount + 'x', W / 2, H * 0.56);

      const coinsEarned = Math.floor(this.score / 10);
      ctx.fillStyle = '#ff0';
      ctx.fillText('Coins Earned: ' + coinsEarned, W / 2, H * 0.66);

      ctx.fillStyle = '#0ff';
      ctx.font = '14px monospace';
      ctx.fillText('PRESS ENTER TO RETRY', W / 2, H * 0.78);
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.fillText('PRESS ESC FOR MENU', W / 2, H * 0.84);
    },

    onDestroy() {
      NGN5.Audio.stopMusic();
    },

    // ── Game Logic Methods ──

    fireWeapon(w) {
      const p = this.player;
      NGN5.Audio.play('shoot');
      for (let i = 0; i < w.count; i++) {
        const spread = (Math.random() - 0.5) * w.spread * 2;
        this.projectiles.push({
          x: p.x, y: p.y - 22,
          vx: spread * w.speed,
          vy: -w.speed,
          damage: w.damage,
          color: w.color,
          size: w.explosive ? 4 : 2,
          explosive: w.explosive || false,
          owner: 'player'
        });
      }
      this.screenShake = Math.max(this.screenShake, w.explosive ? 4 : 1.5);
    },

    spawnWave() {
      const count = 3 + this.wave * 2 + Math.floor(this.wave / 3) * 2;
      for (let i = 0; i < count; i++) {
        const r = Math.random();
        let type = 'grunt';
        if (this.wave >= 3 && r > 0.7) type = 'fast';
        if (this.wave >= 5 && r > 0.85) type = 'tank';
        if (this.wave >= 8 && r > 0.92) type = 'boss';

        const stats = {
          grunt: { hp: 40, speed: 1.5 + this.wave * 0.1, damage: 8, score: 10, color: '#f44', size: 15 },
          fast:  { hp: 20, speed: 3 + this.wave * 0.15, damage: 5, score: 15, color: '#ff0', size: 12 },
          tank:  { hp: 120, speed: 0.8, damage: 15, score: 30, color: '#f80', size: 25 },
          boss:  { hp: 300, speed: 0.6, damage: 20, score: 100, color: '#f0f', size: 35 }
        }[type];

        this.enemies.push({
          x: 60 + Math.random() * (this.W - 120),
          y: -20 - Math.random() * 100,
          type,
          hp: stats.hp * this.diffMult,
          maxHp: stats.hp * this.diffMult,
          speed: stats.speed * this.diffMult,
          damage: stats.damage * this.diffMult,
          score: stats.score,
          color: stats.color,
          size: stats.size,
          fireTimer: Math.random() * 2
        });
      }
    },

    updateProjectiles(dt) {
      this.projectiles = this.projectiles.filter(proj => {
        proj.x += proj.vx * dt * 60;
        proj.y += proj.vy * dt * 60;

        // Off screen
        if (proj.y < -20 || proj.y > this.H + 20 || proj.x < -20 || proj.x > this.W + 20) return false;

        // Player projectile vs enemy
        if (proj.owner === 'player') {
          for (const e of this.enemies) {
            if (e.hp <= 0) continue;
            const dist = Math.hypot(proj.x - e.x, proj.y - e.y);
            if (dist < e.size + 4) {
              e.hp -= proj.damage;
              NGN5.Audio.play('hit');
              this.spawnParticles(proj.x, proj.y, proj.color, 5);

              if (proj.explosive) {
                // Splash damage
                NGN5.Audio.play('explode');
                this.screenShake = 6;
                for (const e2 of this.enemies) {
                  if (e2 === e || e2.hp <= 0) continue;
                  if (Math.hypot(proj.x - e2.x, proj.y - e2.y) < 50) {
                    e2.hp -= proj.damage * 0.5;
                  }
                }
                this.spawnParticles(proj.x, proj.y, '#f80', 15);
              }

              if (e.hp <= 0) {
                this.onEnemyKill(e);
              }
              return false;
            }
          }
        }

        // Enemy projectile vs player
        if (proj.owner === 'enemy') {
          const dist = Math.hypot(proj.x - this.player.x, proj.y - this.player.y);
          if (dist < 15) {
            this.playerHit(proj.damage);
            return false;
          }
        }

        return true;
      });
    },

    updateEnemies(dt) {
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;

        // Move toward player Y
        const targetY = this.H * 0.65;
        if (e.y < targetY - 20) {
          e.y += e.speed * dt * 60;
        }

        // Horizontal movement — move toward player X with some randomness
        const dx = this.player.x - e.x;
        e.x += Math.sign(dx) * e.speed * 0.3 * dt * 60;
        e.x += Math.sin(Date.now() * 0.002 + e.y * 0.1) * 0.5;
        e.x = Math.max(20, Math.min(this.W - 20, e.x));

        // Contact damage
        const distToPlayer = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (distToPlayer < e.size + 12) {
          this.playerHit(e.damage * dt * 3);
        }

        // Enemy shooting (for tanks and bosses)
        if ((e.type === 'tank' || e.type === 'boss') && e.y > 0) {
          e.fireTimer -= dt;
          if (e.fireTimer <= 0) {
            e.fireTimer = e.type === 'boss' ? 1.0 : 2.0;
            const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
            this.projectiles.push({
              x: e.x, y: e.y + e.size,
              vx: Math.cos(angle) * 4,
              vy: Math.sin(angle) * 4,
              damage: e.damage * 0.5,
              color: '#f44',
              size: 4,
              owner: 'enemy'
            });
            NGN5.Audio.play('shoot');
          }
        }
      }

      // Remove dead enemies
      this.enemies = this.enemies.filter(e => e.hp > 0 || e.y > this.H + 50);
    },

    onEnemyKill(e) {
      NGN5.Audio.play('explode');
      this.screenShake = 3;
      this.spawnParticles(e.x, e.y, e.color, 12);
      this.score += e.score;
      this.totalKills++;
      this.comboCount++;
      this.comboTimer = 3;
      NGN5.trackStat('kills', 1);

      // Combo bonus
      if (this.comboCount >= 5 && this.comboCount % 5 === 0) {
        this.score += this.comboCount * 5;
        NGN5.UI.toast(this.comboCount + 'x COMBO! +' + (this.comboCount * 5), '#ff0');
      }

      // Random drops
      const dropRoll = Math.random();
      if (dropRoll < 0.15) {
        this.pickups.push({ x: e.x, y: e.y, type: 'health', value: 25, life: 8 });
      } else if (dropRoll < 0.25) {
        this.pickups.push({ x: e.x, y: e.y, type: 'shield', value: 20, life: 8 });
      } else if (dropRoll < 0.32) {
        this.pickups.push({ x: e.x, y: e.y, type: 'ammo', value: 10, life: 8 });
      }
    },

    playerHit(damage) {
      if (this._dodging) return;
      NGN5.Audio.play('damage');
      this.flashAlpha = 1;
      this.screenShake = Math.max(this.screenShake, 3);

      // Shield absorbs first
      if (this.player.shield > 0) {
        const absorbed = Math.min(this.player.shield, damage);
        this.player.shield -= absorbed;
        damage -= absorbed;
        NGN5.Audio.play('shield');
      }

      this.player.hp -= damage;
      if (this.player.hp <= 0) {
        this.player.hp = 0;
      }
    },

    updatePickups(dt) {
      this.pickups = this.pickups.filter(pk => {
        pk.life -= dt;
        if (pk.life <= 0) return false;
        pk.y += 0.3;

        const dist = Math.hypot(pk.x - this.player.x, pk.y - this.player.y);
        if (dist < 25) {
          if (pk.type === 'health') {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + pk.value);
            NGN5.Audio.play('heal');
            NGN5.UI.toast('+' + pk.value + ' HP', '#0f0');
          } else if (pk.type === 'shield') {
            this.player.shield = Math.min(this.player.maxShield, this.player.shield + pk.value);
            NGN5.Audio.play('shield');
            NGN5.UI.toast('+' + pk.value + ' Shield', '#0ff');
          } else if (pk.type === 'ammo') {
            this.player.ammo[this.player.weapon] += pk.value;
            NGN5.Audio.play('pickup');
            NGN5.UI.toast('+' + pk.value + ' Ammo', '#ff0');
          }
          return false;
        }
        return true;
      });
    },

    spawnParticles(x, y, color, count) {
      if (!NGN5.Settings.get('particles')) return;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          color,
          size: 2 + Math.random() * 3,
          life: 0.3 + Math.random() * 0.4,
          maxLife: 0.7
        });
      }
    },

    drawHUD(ctx, W, H) {
      if (this.state !== NGN5.GAME_STATES.PLAYING && this.state !== NGN5.GAME_STATES.PAUSED) return;

      const p = this.player;

      // HP bar
      ctx.fillStyle = '#222';
      ctx.fillRect(20, H - 50, 150, 12);
      ctx.fillStyle = p.hp / p.maxHp > 0.5 ? '#0f0' : p.hp / p.maxHp > 0.25 ? '#ff0' : '#f00';
      ctx.fillRect(20, H - 50, 150 * (p.hp / p.maxHp), 12);
      ctx.strokeStyle = '#444';
      ctx.strokeRect(20, H - 50, 150, 12);
      ctx.fillStyle = '#fff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('HP ' + Math.ceil(p.hp) + '/' + p.maxHp, 24, H - 41);

      // Shield bar
      ctx.fillStyle = '#222';
      ctx.fillRect(20, H - 34, 100, 8);
      ctx.fillStyle = '#0ff';
      ctx.fillRect(20, H - 34, 100 * (p.shield / p.maxShield), 8);
      ctx.strokeStyle = '#444';
      ctx.strokeRect(20, H - 34, 100, 8);
      ctx.fillStyle = '#0ff';
      ctx.font = '8px monospace';
      ctx.fillText('SHIELD', 24, H - 28);

      // Score & Wave
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('SCORE: ' + this.score, W - 20, H - 38);
      ctx.fillStyle = '#f80';
      ctx.font = '12px monospace';
      ctx.fillText('WAVE ' + this.wave, W - 20, H - 20);

      // Combo
      if (this.comboCount >= 3) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff0';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(this.comboCount + 'x COMBO', W / 2, 30);
      }

      // Weapon indicator
      ctx.textAlign = 'left';
      const w = this.weapons[p.weapon];
      ctx.fillStyle = w.color;
      ctx.font = '11px monospace';
      ctx.fillText(w.name + ' [' + (p.weapon + 1) + ']', 20, 20);
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.fillText('1:Rifle  2:Shotgun  3:Plasma', 20, 34);

      // Input mode indicator
      ctx.textAlign = 'right';
      ctx.fillStyle = '#555';
      ctx.font = '9px monospace';
      const mode = this.input.inputMode === 'gamepad' ? 'GAMEPAD' : this.input.inputMode === 'touch' ? 'TOUCH' : 'KEYBOARD';
      ctx.fillText(mode, W - 20, 20);

      // Difficulty
      ctx.fillStyle = '#444';
      ctx.fillText(this.difficulty.toUpperCase(), W - 20, 34);
    }
  });

  // ── Initialize ──
  game.init();
  game.start();

})();
