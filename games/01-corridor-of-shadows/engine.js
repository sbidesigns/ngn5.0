/* ================================================================
   NGN5 ENGINE CORE v5.0
   ================================================================
   Universal game engine — every NGN5 game loads this single file.
   Provides: input, UI, audio, achievements, rewards, game loop,
   pause/menu system, gamepad, touch, and the base Game class.

   Standard Controls (ALL games):
     Enter / Start (gamepad)  →  Start game / Pause / Resume
     Escape                    →  Back / Menu
     Shift+Escape              →  Settings overlay
     P (keyboard)              →  Pause
   ================================================================ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     SECTION 1: STORAGE
     ───────────────────────────────────────────── */
  const Storage = {
    get(key, fallback) {
      try { const v = localStorage.getItem('ngn5_' + key); return v !== null ? JSON.parse(v) : fallback; }
      catch (e) { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem('ngn5_' + key, JSON.stringify(val)); } catch (e) { }
    },
    remove(key) {
      try { localStorage.removeItem('ngn5_' + key); } catch (e) { }
    }
  };

  /* ─────────────────────────────────────────────
     SECTION 2: AUDIO SYSTEM
     Procedural Web Audio API — zero external files
     ───────────────────────────────────────────── */
  const Audio_ = (() => {
    let ctx = null;
    let masterVol = 1;
    let sfxVol = 0.7;
    let musicVol = 0.5;
    let musicOsc = null;
    let musicGain = null;

    function getCtx() {
      if (!ctx) {
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function tone(freq, dur, type, vol, detune) {
      const c = getCtx();
      if (!c || vol <= 0) return;
      try {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(freq, c.currentTime);
        if (detune) o.detune.setValueAtTime(detune, c.currentTime);
        g.gain.setValueAtTime(vol * sfxVol * masterVol, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (dur || 0.1));
        o.connect(g);
        g.connect(c.destination);
        o.start(c.currentTime);
        o.stop(c.currentTime + (dur || 0.1));
      } catch (e) { }
    }

    function noise(dur, vol) {
      const c = getCtx();
      if (!c || vol <= 0) return;
      try {
        const bufferSize = c.sampleRate * dur;
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource();
        const g = c.createGain();
        src.buffer = buffer;
        g.gain.setValueAtTime(vol * sfxVol * masterVol, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        src.connect(g);
        g.connect(c.destination);
        src.start();
      } catch (e) { }
    }

    // 40+ procedural sound effects
    const SFX = {
      shoot:      () => { tone(800, 0.08, 'square', 0.06); tone(1200, 0.05, 'sawtooth', 0.03); },
      hit:        () => { tone(200, 0.12, 'sawtooth', 0.08); noise(0.08, 0.04); },
      explode:    () => { noise(0.3, 0.12); tone(100, 0.25, 'sawtooth', 0.08); tone(60, 0.3, 'sine', 0.06); },
      pickup:     () => { tone(600, 0.06, 'sine', 0.05); setTimeout(() => tone(900, 0.08, 'sine', 0.05), 60); },
      jump:       () => { tone(400, 0.06, 'square', 0.04); tone(700, 0.06, 'square', 0.04); },
      doubleJump: () => { tone(600, 0.06, 'square', 0.04); tone(1000, 0.08, 'square', 0.05); },
      wallJump:   () => { tone(500, 0.08, 'triangle', 0.05); tone(800, 0.06, 'square', 0.04); },
      land:       () => { tone(150, 0.06, 'triangle', 0.04); noise(0.04, 0.02); },
      crystal:    () => { tone(800, 0.06, 'sine', 0.05); tone(1200, 0.1, 'sine', 0.05); },
      key:        () => { tone(500, 0.08, 'sine', 0.06); tone(750, 0.08, 'sine', 0.06); tone(1000, 0.12, 'sine', 0.06); },
      door:       () => { tone(300, 0.15, 'triangle', 0.06); tone(450, 0.15, 'triangle', 0.06); },
      checkpoint: () => { tone(600, 0.1, 'sine', 0.05); tone(800, 0.1, 'sine', 0.05); tone(1000, 0.15, 'sine', 0.06); },
      bounce:     () => { tone(350, 0.06, 'square', 0.04); },
      stomp:      () => { tone(250, 0.1, 'square', 0.06); tone(500, 0.08, 'square', 0.04); },
      levelup:    () => { [500, 700, 900, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.06), i * 80)); },
      upgrade:    () => { tone(600, 0.1, 'sine', 0.05); tone(900, 0.15, 'sine', 0.06); },
      achieve:    () => { [600, 800, 1000, 1200, 1400].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'sine', 0.06), i * 60)); },
      boost:      () => { tone(300, 0.08, 'sawtooth', 0.05); tone(600, 0.12, 'sawtooth', 0.07); },
      item:       () => { tone(700, 0.06, 'sine', 0.05); tone(1000, 0.08, 'sine', 0.05); },
      shield:     () => { tone(400, 0.1, 'triangle', 0.04); tone(600, 0.1, 'triangle', 0.04); },
      heal:       () => { tone(500, 0.1, 'sine', 0.05); tone(800, 0.15, 'sine', 0.05); },
      damage:     () => { tone(150, 0.15, 'sawtooth', 0.08); noise(0.1, 0.04); },
      click:      () => { tone(1000, 0.03, 'sine', 0.03); },
      coin:       () => { tone(1200, 0.05, 'sine', 0.04); tone(1600, 0.06, 'sine', 0.04); },
      engine:     () => { /* continuous — handled per-game */ },
      horn:       () => { tone(400, 0.2, 'sawtooth', 0.06); },
      drift:      () => { tone(200, 0.15, 'sawtooth', 0.04); noise(0.1, 0.03); },
      race_start: () => { [300, 400, 600, 800].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'square', 0.06), i * 150)); },
      tire_squeal:() => { noise(0.15, 0.06); tone(800, 0.1, 'sawtooth', 0.03); },
      miss:       () => { tone(200, 0.15, 'sawtooth', 0.06); },
      correct:    () => { tone(600, 0.08, 'sine', 0.05); tone(900, 0.1, 'sine', 0.05); },
      wrong:      () => { tone(200, 0.2, 'sawtooth', 0.06); },
      tick:       () => { tone(1000, 0.02, 'sine', 0.02); },
      place:      () => { tone(500, 0.06, 'square', 0.04); },
      destroy:    () => { noise(0.2, 0.08); tone(150, 0.2, 'sawtooth', 0.07); },
      cast:       () => { tone(400, 0.15, 'triangle', 0.05); tone(800, 0.2, 'triangle', 0.06); },
      bite:       () => { tone(300, 0.1, 'sawtooth', 0.06); tone(500, 0.08, 'sawtooth', 0.04); },
      splash:     () => { noise(0.15, 0.05); tone(200, 0.15, 'sine', 0.04); },
      punch:      () => { noise(0.08, 0.1); tone(200, 0.06, 'square', 0.06); },
      kick:       () => { noise(0.1, 0.12); tone(150, 0.08, 'square', 0.07); },
      block:      () => { tone(300, 0.05, 'square', 0.04); },
      ko:         () => { noise(0.3, 0.12); tone(100, 0.3, 'sawtooth', 0.1); tone(200, 0.4, 'sine', 0.06); },
      round_bell: () => { tone(800, 0.3, 'sine', 0.08); tone(1200, 0.2, 'sine', 0.06); },
      menu_open:  () => { tone(600, 0.05, 'sine', 0.04); tone(900, 0.08, 'sine', 0.04); },
      menu_close: () => { tone(900, 0.05, 'sine', 0.04); tone(600, 0.08, 'sine', 0.04); },
      ui_hover:   () => { tone(800, 0.02, 'sine', 0.02); },
      ui_select:  () => { tone(600, 0.04, 'sine', 0.03); tone(900, 0.06, 'sine', 0.04); },
      footstep:   () => { noise(0.04, 0.03); },
      swim:       () => { noise(0.1, 0.02); tone(300, 0.08, 'sine', 0.02); },
      alert:      () => { tone(1000, 0.1, 'square', 0.06); tone(800, 0.15, 'square', 0.06); },
      powerup:    () => { [400, 600, 800, 1000, 1200].forEach((f, i) => setTimeout(() => tone(f, 0.08, 'sine', 0.05), i * 40)); },
      low_health: () => { tone(200, 0.15, 'sawtooth', 0.04); setTimeout(() => tone(200, 0.15, 'sawtooth', 0.04), 300); },
      death:      () => { tone(400, 0.1, 'sawtooth', 0.08); tone(300, 0.15, 'sawtooth', 0.08); tone(150, 0.3, 'sawtooth', 0.1); },
      victory:    () => { [400, 500, 600, 800].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', 0.08), i * 120)); },
      defeat:     () => { tone(200, 0.3, 'sawtooth', 0.1); tone(100, 0.4, 'sawtooth', 0.08); },
      pause_on:   () => { tone(600, 0.06, 'sine', 0.04); tone(800, 0.08, 'sine', 0.04); },
      pause_off:  () => { tone(800, 0.06, 'sine', 0.04); tone(600, 0.08, 'sine', 0.04); },
      countdown:  () => { tone(800, 0.15, 'square', 0.06); },
      go:         () => { tone(1200, 0.3, 'square', 0.08); tone(1600, 0.2, 'sine', 0.06); },
      turbo:      () => { noise(0.1, 0.06); tone(300, 0.1, 'sawtooth', 0.05); tone(500, 0.08, 'sawtooth', 0.04); },
      brake:      () => { noise(0.08, 0.04); tone(200, 0.06, 'sawtooth', 0.03); },
      crash:      () => { noise(0.25, 0.12); tone(100, 0.2, 'sawtooth', 0.08); },
      chat:       () => { tone(1000, 0.02, 'sine', 0.03); tone(1200, 0.03, 'sine', 0.02); },
      whip:       () => { noise(0.08, 0.06); tone(600, 0.05, 'sawtooth', 0.04); },
      dash:       () => { tone(500, 0.06, 'square', 0.04); tone(800, 0.06, 'square', 0.04); },
      slide:      () => { noise(0.12, 0.05); tone(300, 0.08, 'triangle', 0.03); }
    };

    // Simple procedural background music
    let musicPlaying = false;
    let musicInterval = null;
    let currentGenre = null;

    const MUSIC_PATTERNS = {
      ambient:  { bpm: 60, notes: [220, 261, 330, 261, 220, 196, 220, 261], wave: 'sine', noteLen: 0.4 },
      action:   { bpm: 140, notes: [330, 440, 330, 220, 330, 440, 550, 440], wave: 'square', noteLen: 0.15 },
      tense:    { bpm: 80, notes: [196, 208, 220, 208, 196, 185, 196, 208], wave: 'triangle', noteLen: 0.35 },
      happy:    { bpm: 120, notes: [330, 392, 440, 523, 440, 392, 330, 392], wave: 'sine', noteLen: 0.2 },
      dark:     { bpm: 70, notes: [165, 196, 220, 196, 165, 147, 165, 196], wave: 'sawtooth', noteLen: 0.35 },
      menu:     { bpm: 90, notes: [262, 330, 392, 330, 262, 330, 392, 523], wave: 'sine', noteLen: 0.25 },
      racing:   { bpm: 150, notes: [220, 277, 330, 440, 330, 277, 220, 330], wave: 'square', noteLen: 0.12 },
      fight:    { bpm: 160, notes: [220, 220, 330, 220, 220, 165, 220, 330], wave: 'sawtooth', noteLen: 0.12 },
      horror:   { bpm: 50, notes: [110, 130, 110, 98, 110, 130, 147, 130], wave: 'sawtooth', noteLen: 0.5 },
      puzzle:   { bpm: 100, notes: [262, 294, 330, 349, 392, 349, 330, 294], wave: 'sine', noteLen: 0.22 },
      rpg:      { bpm: 110, notes: [262, 330, 392, 523, 494, 392, 330, 262], wave: 'triangle', noteLen: 0.2 },
      sports:   { bpm: 130, notes: [330, 392, 440, 494, 523, 494, 440, 392], wave: 'square', noteLen: 0.15 },
      stealth:  { bpm: 75, notes: [196, 220, 233, 220, 196, 185, 175, 185], wave: 'triangle', noteLen: 0.35 },
      boss:     { bpm: 170, notes: [165, 220, 165, 131, 165, 220, 262, 220], wave: 'sawtooth', noteLen: 0.12 }
    };

    function playMusic(genre) {
      if (genre === currentGenre && musicPlaying) return;
      stopMusic();
      currentGenre = genre;
      musicPlaying = true;
      const pattern = MUSIC_PATTERNS[genre] || MUSIC_PATTERNS.ambient;
      let idx = 0;
      const interval = (60 / pattern.bpm) * 1000;
      musicInterval = setInterval(() => {
        if (!musicPlaying) return;
        const c = getCtx();
        if (!c) return;
        try {
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = pattern.wave;
          o.frequency.setValueAtTime(pattern.notes[idx % pattern.notes.length], c.currentTime);
          g.gain.setValueAtTime(0.03 * musicVol * masterVol, c.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + pattern.noteLen);
          o.connect(g);
          g.connect(c.destination);
          o.start(c.currentTime);
          o.stop(c.currentTime + pattern.noteLen);
        } catch (e) { }
        idx++;
      }, interval);
    }

    function stopMusic() {
      musicPlaying = false;
      currentGenre = null;
      if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
    }

    return {
      play: (name) => { if (SFX[name]) SFX[name](); },
      playMusic,
      stopMusic,
      setMasterVolume: (v) => { masterVol = Math.max(0, Math.min(1, v)); Storage.set('audio_master', masterVol); },
      setSFXVolume: (v) => { sfxVol = Math.max(0, Math.min(1, v)); Storage.set('audio_sfx', sfxVol); },
      setMusicVolume: (v) => { musicVol = Math.max(0, Math.min(1, v)); Storage.set('audio_music', musicVol); },
      getMasterVolume: () => masterVol,
      getSFXVolume: () => sfxVol,
      getMusicVolume: () => musicVol,
      resume: () => { getCtx(); }
    };
  })();

  /* ─────────────────────────────────────────────
     SECTION 3: INPUT SYSTEM
     Keyboard + Gamepad + Mouse/Touch — unified
     ───────────────────────────────────────────── */
  const Input_ = (() => {
    // Keyboard state
    const keys = {};
    const keysJustPressed = {};
    const keysJustReleased = {};
    const keyMap = {
      'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
      'w': 'up', 'W': 'up', 's': 'down', 'S': 'down',
      'a': 'left', 'A': 'left', 'd': 'right', 'D': 'right',
      ' ': 'action', 'Enter': 'start', 'Escape': 'back', 'p': 'pause', 'P': 'pause',
      'Shift': 'shift', 'Tab': 'info', 'e': 'interact', 'E': 'interact',
      'q': 'ability1', 'Q': 'ability1', 'f': 'ability2', 'F': 'ability2',
      'r': 'reload', 'R': 'reload', 'c': 'crouch', 'C': 'crouch',
      'z': 'special', 'Z': 'special', 'x': 'cancel', 'X': 'cancel',
      '1': 'slot1', '2': 'slot2', '3': 'slot3', '4': 'slot4',
      'Control': 'ctrl', 'Alt': 'alt'
    };

    // Gamepad state
    const gamepadConnected = { value: false };
    let rawGamepad = null;
    const gpButtons = {};
    const gpAxes = [0, 0, 0, 0];
    const gpPrevButtons = {};

    // Touch state
    const touches = [];
    let touchActive = false;
    let touchStartX = 0, touchStartY = 0;
    let touchDX = 0, touchDY = 0;
    const virtualButtons = {};

    // Mouse state
    let mouseX = 0, mouseY = 0;
    let mouseDown = false;
    let mouseJustClicked = false;
    let mouseJustReleased = false;
    let mouseWheel = 0;

    // Unified virtual controller (games read from this)
    const controller = {
      up: false, down: false, left: false, right: false,
      action: false, start: false, back: false, pause: false,
      interact: false, ability1: false, ability2: false,
      special: false, cancel: false, crouch: false, reload: false,
      shift: false, info: false, ctrl: false, alt: false,
      slot1: false, slot2: false, slot3: false, slot4: false,
      // Analog values
      moveX: 0, moveY: 0,     // -1 to 1 (left stick / WASD)
      lookX: 0, lookY: 0,     // -1 to 1 (right stick / mouse delta)
      triggerL: 0, triggerR: 0, // 0 to 1 (gamepad triggers)
      // Just-pressed tracking
      startJustPressed: false, backJustPressed: false,
      actionJustPressed: false, pauseJustPressed: false,
      interactJustPressed: false,
      // Mouse
      mouseX: 0, mouseY: 0,
      mouseDown: false, mouseJustClicked: false,
      mouseWheel: 0,
      // Touch
      touchActive: false, touchX: 0, touchY: 0, touchDX: 0, touchDY: 0,
      // Meta
      inputMode: 'keyboard', // 'keyboard', 'gamepad', 'touch'
      gamepadConnected: false
    };

    // Keyboard handlers
    function onKeyDown(e) {
      const mapped = keyMap[e.key] || e.key.toLowerCase();
      if (!keys[mapped]) {
        keysJustPressed[mapped] = true;
        keys[mapped] = true;
      }
      controller.inputMode = 'keyboard';
      // Prevent default for game keys
      if (['action', 'start', 'back', 'pause', 'up', 'down', 'left', 'right', 'info'].includes(mapped)) {
        e.preventDefault();
      }
    }
    function onKeyUp(e) {
      const mapped = keyMap[e.key] || e.key.toLowerCase();
      keys[mapped] = false;
      keysJustReleased[mapped] = true;
    }

    // Gamepad handlers
    const GP_BUTTON_MAP = {
      0: 'action',    // A / Cross
      1: 'back',      // B / Circle
      2: 'cancel',    // X / Square
      3: 'start',     // Y / Triangle
      8: 'back',      // Back / Select
      9: 'start',     // Start
      4: 'special',   // LB / L1
      5: 'ability1',  // RB / R1
      6: 'shift',     // LT / L2
      7: 'reload',    // RT / R2
      12: 'up',       // D-pad up
      13: 'down',     // D-pad down
      14: 'left',     // D-pad left
      15: 'right',    // D-pad right
      16: 'info'      // Home / Guide
    };

    function pollGamepad() {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      rawGamepad = null;
      for (const gp of gamepads) {
        if (gp) { rawGamepad = gp; break; }
      }
      if (!rawGamepad) {
        gamepadConnected.value = false;
        controller.gamepadConnected = false;
        return;
      }
      gamepadConnected.value = true;
      controller.gamepadConnected = true;
      controller.inputMode = 'gamepad';

      // Buttons
      for (let i = 0; i < rawGamepad.buttons.length; i++) {
        const name = GP_BUTTON_MAP[i];
        if (name) {
          const pressed = rawGamepad.buttons[i].pressed;
          if (!gpPrevButtons[name] && pressed) keysJustPressed[name] = true;
          gpPrevButtons[name] = pressed;
          gpButtons[name] = pressed;
        }
      }

      // Axes (sticks)
      const deadzone = 0.15;
      const lx = rawGamepad.axes[0] || 0;
      const ly = rawGamepad.axes[1] || 0;
      const rx = rawGamepad.axes[2] || 0;
      const ry = rawGamepad.axes[3] || 0;
      gpAxes[0] = Math.abs(lx) < deadzone ? 0 : lx;
      gpAxes[1] = Math.abs(ly) < deadzone ? 0 : ly;
      gpAxes[2] = Math.abs(rx) < deadzone ? 0 : rx;
      gpAxes[3] = Math.abs(ry) < deadzone ? 0 : ry;

      // Triggers
      controller.triggerL = rawGamepad.buttons[6] ? rawGamepad.buttons[6].value : 0;
      controller.triggerR = rawGamepad.buttons[7] ? rawGamepad.buttons[7].value : 0;
    }

    // Touch handlers
    function onTouchStart(e) {
      e.preventDefault();
      controller.inputMode = 'touch';
      touchActive = true;
      controller.touchActive = true;
      const t = e.touches[0];
      if (t) {
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        controller.touchX = t.clientX;
        controller.touchY = t.clientY;
        touchDX = 0;
        touchDY = 0;
      }
    }
    function onTouchMove(e) {
      e.preventDefault();
      const t = e.touches[0];
      if (t) {
        touchDX = (t.clientX - touchStartX) * 0.02;
        touchDY = (t.clientY - touchStartY) * 0.02;
        touchDX = Math.max(-1, Math.min(1, touchDX));
        touchDY = Math.max(-1, Math.min(1, touchDY));
        controller.touchX = t.clientX;
        controller.touchY = t.clientY;
        controller.touchDX = touchDX;
        controller.touchDY = touchDY;
      }
    }
    function onTouchEnd(e) {
      if (e.touches.length === 0) {
        touchActive = false;
        controller.touchActive = false;
        touchDX = 0;
        touchDY = 0;
        controller.touchDX = 0;
        controller.touchDY = 0;
        // Tap = action
        if (Math.abs(touchStartX - controller.touchX) < 10 && Math.abs(touchStartY - controller.touchY) < 10) {
          keysJustPressed['action'] = true;
        }
      }
    }

    // Mouse handlers
    function onMouseMove(e) { mouseX = e.clientX; mouseY = e.clientY; }
    function onMouseDown(e) {
      mouseDown = true;
      mouseJustClicked = true;
      controller.inputMode = controller.inputMode === 'touch' ? 'touch' : 'keyboard';
    }
    function onMouseUp(e) {
      mouseDown = false;
      mouseJustReleased = true;
    }
    function onWheel(e) { mouseWheel = e.deltaY; }

    // Update — call every frame before game logic
    function update() {
      pollGamepad();

      // Build unified controller state from all input sources
      const c = controller;

      // Keyboard directional
      const kUp = keys['up'] || false;
      const kDown = keys['down'] || false;
      const kLeft = keys['left'] || false;
      const kRight = keys['right'] || false;

      // Gamepad directional
      const gUp = gpButtons['up'] || gpAxes[1] < -0.4;
      const gDown = gpButtons['down'] || gpAxes[1] > 0.4;
      const gLeft = gpButtons['left'] || gpAxes[0] < -0.4;
      const gRight = gpButtons['right'] || gpAxes[0] > 0.4;

      // Touch directional
      const tUp = touchDY < -0.3;
      const tDown = touchDY > 0.3;
      const tLeft = touchDX < -0.3;
      const tRight = touchDX > 0.3;

      // Merge all sources
      c.up = kUp || gUp || tUp;
      c.down = kDown || gDown || tDown;
      c.left = kLeft || gLeft || tLeft;
      c.right = kRight || gRight || tRight;

      // Buttons
      for (const btn of ['action', 'start', 'back', 'pause', 'interact', 'ability1', 'ability2', 'special', 'cancel', 'crouch', 'reload', 'shift', 'info', 'ctrl', 'alt', 'slot1', 'slot2', 'slot3', 'slot4']) {
        c[btn] = keys[btn] || gpButtons[btn] || virtualButtons[btn] || false;
      }

      // Just-pressed
      c.startJustPressed = keysJustPressed['start'] || false;
      c.backJustPressed = keysJustPressed['back'] || false;
      c.actionJustPressed = keysJustPressed['action'] || false;
      c.pauseJustPressed = keysJustPressed['pause'] || false;
      c.interactJustPressed = keysJustPressed['interact'] || false;

      // Analog
      if (gamepadConnected.value) {
        c.moveX = gpAxes[0];
        c.moveY = gpAxes[1];
        c.lookX = gpAxes[2];
        c.lookY = gpAxes[3];
      } else {
        c.moveX = (c.right ? 1 : 0) - (c.left ? 1 : 0);
        c.moveY = (c.down ? 1 : 0) - (c.up ? 1 : 0);
        c.lookX = 0;
        c.lookY = 0;
      }

      // Mouse
      c.mouseX = mouseX;
      c.mouseY = mouseY;
      c.mouseDown = mouseDown;
      c.mouseJustClicked = mouseJustClicked;
      c.mouseWheel = mouseWheel;

      // Clear frame flags
      for (const k in keysJustPressed) delete keysJustPressed[k];
      for (const k in keysJustReleased) delete keysJustReleased[k];
      mouseJustClicked = false;
      mouseJustReleased = false;
      mouseWheel = 0;
    }

    function registerVirtualButton(id) {
      virtualButtons[id] = false;
      return {
        press: () => { virtualButtons[id] = true; },
        release: () => { virtualButtons[id] = false; }
      };
    }

    function bind(elementId) {
      const el = document.getElementById(elementId);
      if (!el) return null;
      const vb = registerVirtualButton(elementId);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); vb.press(); keysJustPressed[elementId] = true; }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); vb.release(); });
      el.addEventListener('mousedown', (e) => { e.preventDefault(); vb.press(); keysJustPressed[elementId] = true; });
      el.addEventListener('mouseup', (e) => { e.preventDefault(); vb.release(); });
      return vb;
    }

    function init() {
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('wheel', onWheel, { passive: true });
      document.addEventListener('touchstart', onTouchStart, { passive: false });
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd, { passive: false });
      window.addEventListener('gamepadconnected', () => { gamepadConnected.value = true; controller.gamepadConnected = true; });
      window.addEventListener('gamepaddisconnected', () => { gamepadConnected.value = false; controller.gamepadConnected = false; });
    }

    return { init, update, controller, bind, registerVirtualButton };
  })();

  /* ─────────────────────────────────────────────
     SECTION 4: REWARDS SYSTEM
     Coins, Gems, XP, Leveling, persistence
     ───────────────────────────────────────────── */
  const Rewards_ = (() => {
    const DEFAULTS = {
      coins: 0, gems: 0, xp: 0, level: 1,
      totalPlaytime: 0, gamesPlayed: 0, gamesWon: 0,
      highScores: {}, achievements: [],
      unlockedItems: ['starter_pack'],
      dailyStreak: 0, lastDailyClaim: null
    };

    let data = null;

    function load() {
      if (data) return data;
      data = Storage.get('rewards', null);
      if (!data) { data = JSON.parse(JSON.stringify(DEFAULTS)); }
      return data;
    }

    function save() {
      if (data) Storage.set('rewards', data);
    }

    return {
      load, save,
      getCoins:    () => load().coins || 0,
      addCoins:    (n) => { const r = load(); r.coins = Math.max(0, (r.coins || 0) + n); save(); return r.coins; },
      getGems:     () => load().gems || 0,
      addGems:     (n) => { const r = load(); r.gems = Math.max(0, (r.gems || 0) + n); save(); return r.gems; },
      getXP:       () => load().xp || 0,
      getLevel:    () => load().level || 1,
      addXP:       (n) => {
        const r = load();
        r.xp += n;
        const xpForLevel = (lv) => Math.floor(100 * Math.pow(1.25, lv - 1));
        while (r.xp >= xpForLevel(r.level)) {
          r.xp -= xpForLevel(r.level);
          r.level++;
          Audio_.play('levelup');
        }
        save();
      },
      getHighScore: (id) => { const r = load(); return (r.highScores && r.highScores[id]) || 0; },
      setHighScore: (id, score) => {
        const r = load();
        if (!r.highScores) r.highScores = {};
        if (score > (r.highScores[id] || 0)) { r.highScores[id] = score; save(); return true; }
        return false;
      },
      getData: () => JSON.parse(JSON.stringify(load())),
      reset: () => { data = JSON.parse(JSON.stringify(DEFAULTS)); save(); }
    };
  })();

  /* ─────────────────────────────────────────────
     SECTION 5: ACHIEVEMENTS SYSTEM
     ───────────────────────────────────────────── */
  const Achievements_ = (() => {
    let gameId = null;
    let gameData = null;
    let globalData = null;
    const popups = [];

    function init(id) {
      gameId = id;
      globalData = Storage.get('ach_global', null) || {
        unlocked: [], totalGamesPlayed: 0, totalGamesWon: 0,
        totalScore: 0, totalCoinsEarned: 0, totalPlaytime: 0,
        level: 1, xp: 0, streak: 0, lastPlayDate: null
      };
      gameData = Storage.get('ach_' + id, null) || {
        highScore: 0, gamesPlayed: 0, gamesWon: 0,
        totalKills: 0, totalCoins: 0, level: 1, xp: 0,
        stats: {}, unlocked: [], milestones: {}
      };
    }

    function saveGlobal() { Storage.set('ach_global', globalData); }
    function saveGame() { Storage.set('ach_' + gameId, gameData); }
    function xpForLevel(lv) { return Math.floor(100 * Math.pow(1.25, lv - 1)); }

    function addXP(amount, isGameLevel) {
      if (isGameLevel) {
        gameData.xp += amount;
        while (gameData.xp >= xpForLevel(gameData.level)) {
          gameData.xp -= xpForLevel(gameData.level);
          gameData.level++;
          addPopup({ type: 'levelup', text: 'Level ' + gameData.level + '!', color: '#0f0' });
        }
        saveGame();
      } else {
        globalData.xp += amount;
        while (globalData.xp >= xpForLevel(globalData.level)) {
          globalData.xp -= xpForLevel(globalData.level);
          globalData.level++;
          addPopup({ type: 'global_levelup', text: 'NGN Level ' + globalData.level + '!', color: '#ff0' });
        }
        saveGlobal();
      }
    }

    function unlock(id, name, desc, rewards) {
      if (!gameData || !globalData) return false;
      const rw = Object.assign({ coins: 50, gems: 2, xp: 100 }, rewards || {});
      const globalKey = gameId + '_' + id;
      if (globalData.unlocked.includes(globalKey)) return false;
      if (gameData.unlocked.includes(id)) return false;
      gameData.unlocked.push(id);
      globalData.unlocked.push(globalKey);
      gameData.totalCoins += rw.coins;
      globalData.totalCoinsEarned += rw.coins;
      Rewards_.addCoins(rw.coins);
      Rewards_.addGems(rw.gems);
      addXP(rw.xp, false);
      addPopup({ type: 'achievement', id, name, desc, text: rw.coins + ' coins + ' + rw.gems + ' gems', color: '#0ff' });
      Audio_.play('achieve');
      saveGlobal();
      saveGame();
      return true;
    }

    function recordGame(score, won, kills, coins, playtime) {
      if (!gameData || !globalData) return;
      gameData.gamesPlayed++;
      globalData.totalGamesPlayed++;
      gameData.totalKills += (kills || 0);
      gameData.totalCoins += (coins || 0);
      globalData.totalCoinsEarned += (coins || 0);
      globalData.totalPlaytime += (playtime || 0);
      if (score > gameData.highScore) {
        gameData.highScore = score;
        addPopup({ type: 'highscore', text: 'New High Score: ' + score, color: '#ff0' });
        Rewards_.setHighScore(gameId, score);
      }
      if (won) {
        gameData.gamesWon++;
        globalData.totalGamesWon++;
        addXP(50, true);
        addXP(25, false);
        Rewards_.addCoins(30);
      } else {
        addXP(10, true);
        addXP(5, false);
      }
      saveGame();
      saveGlobal();
    }

    function trackStat(key, val) {
      if (!gameData) return;
      if (!gameData.stats) gameData.stats = {};
      gameData.stats[key] = (gameData.stats[key] || 0) + (val || 1);
      saveGame();
    }

    function addPopup(popup) {
      popups.push(Object.assign({}, popup, { time: Date.now() }));
    }

    function renderPopups() {
      const container = document.getElementById('ngn5-popup-container');
      if (!container) return;
      const pending = popups.splice(0);
      pending.forEach(p => {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;top:-80px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:8px;background:rgba(0,0,0,0.92);border:2px solid ' + (p.color || '#0ff') + ';color:#fff;font-family:monospace;font-size:14px;text-align:center;max-width:350px;transition:top 0.5s ease;pointer-events:auto;box-shadow:0 0 20px ' + (p.color || '#0ff') + '40';
        el.innerHTML = '<div style="color:' + (p.color || '#0ff') + ';font-weight:bold;font-size:16px">' + p.text + '</div>' +
          (p.name ? '<div style="color:#aaa;font-size:12px;margin-top:2px">' + p.name + (p.desc ? ': ' + p.desc : '') + '</div>' : '');
        container.appendChild(el);
        requestAnimationFrame(() => { el.style.top = '60px'; });
        setTimeout(() => { el.style.top = '-80px'; setTimeout(() => el.remove(), 500); }, 3000);
      });
    }

    return { init, unlock, isUnlocked: (id) => gameData ? gameData.unlocked.includes(id) : false, recordGame, trackStat, getStat: (k) => gameData ? (gameData.stats || {})[k] || 0 : 0, getHighScore: () => gameData ? gameData.highScore : 0, getGamesPlayed: () => gameData ? gameData.gamesPlayed : 0, addXP, renderPopups, getGameLevel: () => gameData ? gameData.level : 1, getGlobalLevel: () => globalData ? globalData.level : 1 };
  })();

  /* ─────────────────────────────────────────────
     SECTION 6: SETTINGS SYSTEM
     ───────────────────────────────────────────── */
  const Settings_ = (() => {
    const defaults = {
      sfxVolume: 0.7, musicVolume: 0.5, masterVolume: 1.0,
      screenShake: true, particles: true, showFPS: false, difficulty: 'normal'
    };
    let data = null;
    let el = null;
    let visible = false;
    let fpsEl = null;
    let fpsFrames = 0;
    let fpsTime = 0;
    let currentFPS = 0;

    function load() {
      data = Object.assign({}, defaults, Storage.get('settings', {}));
      Audio_.setSFXVolume(data.sfxVolume);
      Audio_.setMusicVolume(data.musicVolume);
      Audio_.setMasterVolume(data.masterVolume);
    }

    function get(key) { return data ? data[key] : defaults[key]; }
    function set(key, val) { if (data) { data[key] = val; Storage.set('settings', data); } }

    function createUI() {
      if (el) return;
      el = document.createElement('div');
      el.id = 'ngn5-settings-overlay';
      el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:none;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;color:#fff;padding:20px;box-sizing:border-box';
      el.innerHTML =
        '<div style="max-width:420px;width:100%;background:#111;border:2px solid #0ff;border-radius:12px;padding:24px;box-shadow:0 0 30px rgba(0,255,255,0.2)">' +
          '<h2 style="margin:0 0 20px;text-align:center;color:#0ff;font-size:20px;letter-spacing:2px">SETTINGS</h2>' +
          '<div style="display:flex;flex-direction:column;gap:16px">' +
            '<div class="ngn5-sr"><label style="flex:1;font-size:13px">Master Volume</label><input type="range" min="0" max="100" value="' + Math.round((data.masterVolume || 1) * 100) + '" class="ngn5-ss" data-key="masterVolume" style="width:140px;accent-color:#0ff"><span class="ngn5-sv" style="width:35px;text-align:right;font-size:12px;color:#0ff">' + Math.round((data.masterVolume || 1) * 100) + '%</span></div>' +
            '<div class="ngn5-sr"><label style="flex:1;font-size:13px">SFX Volume</label><input type="range" min="0" max="100" value="' + Math.round((data.sfxVolume || 0.7) * 100) + '" class="ngn5-ss" data-key="sfxVolume" style="width:140px;accent-color:#0ff"><span class="ngn5-sv" style="width:35px;text-align:right;font-size:12px;color:#0ff">' + Math.round((data.sfxVolume || 0.7) * 100) + '%</span></div>' +
            '<div class="ngn5-sr"><label style="flex:1;font-size:13px">Music Volume</label><input type="range" min="0" max="100" value="' + Math.round((data.musicVolume || 0.5) * 100) + '" class="ngn5-ss" data-key="musicVolume" style="width:140px;accent-color:#0ff"><span class="ngn5-sv" style="width:35px;text-align:right;font-size:12px;color:#0ff">' + Math.round((data.musicVolume || 0.5) * 100) + '%</span></div>' +
            _toggleRow('Screen Shake', 'screenShake') +
            _toggleRow('Particles', 'particles') +
            _toggleRow('Show FPS', 'showFPS') +
          '</div>' +
          '<div style="margin-top:24px;text-align:center"><button id="ngn5-settings-close" style="padding:10px 40px;background:#0ff;color:#000;border:none;font-family:monospace;font-size:14px;font-weight:bold;cursor:pointer;border-radius:6px;letter-spacing:1px">CLOSE</button></div>' +
          '<div style="margin-top:12px;text-align:center;font-size:10px;color:#555">SHIFT+ESC to toggle | START to resume</div>' +
        '</div>';
      document.body.appendChild(el);

      // Slider bindings
      el.querySelectorAll('.ngn5-ss').forEach(slider => {
        slider.addEventListener('input', () => {
          const key = slider.dataset.key;
          const val = slider.value / 100;
          data[key] = val;
          slider.nextElementSibling.textContent = Math.round(val * 100) + '%';
          Storage.set('settings', data);
          if (key === 'sfxVolume') Audio_.setSFXVolume(val);
          if (key === 'musicVolume') Audio_.setMusicVolume(val);
          if (key === 'masterVolume') Audio_.setMasterVolume(val);
        });
      });

      // Toggle bindings
      el.querySelectorAll('.ngn5-st').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          data[key] = !data[key];
          const active = data[key];
          btn.textContent = active ? 'ON' : 'OFF';
          btn.style.background = active ? '#0ff' : 'transparent';
          btn.style.color = active ? '#000' : '#0ff';
          Storage.set('settings', data);
        });
      });

      document.getElementById('ngn5-settings-close').addEventListener('click', () => hide());
    }

    function _toggleRow(label, key) {
      const active = data[key];
      return '<div class="ngn5-sr" style="justify-content:space-between;align-items:center"><label style="font-size:13px">' + label + '</label><button class="ngn5-st" data-key="' + key + '" style="padding:6px 18px;border:1px solid #0ff;background:' + (active ? '#0ff' : 'transparent') + ';color:' + (active ? '#000' : '#0ff') + ';font-family:monospace;font-size:12px;cursor:pointer;border-radius:4px">' + (active ? 'ON' : 'OFF') + '</button></div>';
    }

    function show() { if (!el) createUI(); el.style.display = 'flex'; visible = true; Audio_.play('menu_open'); }
    function hide() { if (!el) return; el.style.display = 'none'; visible = false; Audio_.play('menu_close'); }
    function toggle() { visible ? hide() : show(); }
    function isVisible() { return visible; }

    function updateFPS(timestamp) {
      if (!data || !data.showFPS) {
        if (fpsEl) { fpsEl.remove(); fpsEl = null; }
        return;
      }
      if (!fpsEl) {
        fpsEl = document.createElement('div');
        fpsEl.style.cssText = 'position:fixed;top:4px;right:4px;color:#0f0;font:12px monospace;z-index:99998;background:rgba(0,0,0,0.6);padding:2px 6px;border-radius:3px';
        fpsEl.textContent = 'FPS: --';
        document.body.appendChild(fpsEl);
      }
      fpsFrames++;
      if (timestamp - fpsTime >= 1000) {
        currentFPS = fpsFrames;
        fpsFrames = 0;
        fpsTime = timestamp;
      }
      fpsEl.textContent = 'FPS: ' + currentFPS;
    }

    return { load, get, set, createUI, show, hide, toggle, isVisible, updateFPS, init: load };
  })();

  /* ─────────────────────────────────────────────
     SECTION 7: UI FRAMEWORK
     Pause overlay, notification toasts, HUD
     ───────────────────────────────────────────── */
  const UI_ = (() => {
    let pauseEl = null;
    let pauseVisible = false;
    let pauseCallback = null; // called when pause is toggled
    let onResume = null;
    let onQuit = null;
    let coinDisplayEl = null;

    function createPauseOverlay() {
      if (pauseEl) return;
      pauseEl = document.createElement('div');
      pauseEl.id = 'ngn5-pause-overlay';
      pauseEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99990;display:none;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;color:#fff';
      pauseEl.innerHTML =
        '<div style="background:#111;border:2px solid #0ff;border-radius:12px;padding:30px 40px;text-align:center;box-shadow:0 0 30px rgba(0,255,255,0.15)">' +
          '<h2 style="margin:0 0 8px;color:#0ff;font-size:24px;letter-spacing:3px">PAUSED</h2>' +
          '<p style="color:#666;font-size:11px;margin:0 0 24px">' + (Input_.controller.gamepadConnected ? 'START to resume' : 'ENTER or P to resume') + '</p>' +
          '<div style="display:flex;flex-direction:column;gap:10px;min-width:200px">' +
            '<button id="ngn5-pause-resume" class="ngn5-pause-btn" style="padding:12px 32px;background:#0ff;color:#000;border:none;font-family:monospace;font-size:14px;font-weight:bold;cursor:pointer;border-radius:6px;letter-spacing:1px">RESUME</button>' +
            '<button id="ngn5-pause-settings" class="ngn5-pause-btn" style="padding:10px 32px;background:transparent;color:#0ff;border:1px solid #0ff;font-family:monospace;font-size:13px;cursor:pointer;border-radius:6px">SETTINGS</button>' +
            '<button id="ngn5-pause-quit" class="ngn5-pause-btn" style="padding:10px 32px;background:transparent;color:#f44;border:1px solid #f44;font-family:monospace;font-size:13px;cursor:pointer;border-radius:6px">QUIT TO MENU</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(pauseEl);

      document.getElementById('ngn5-pause-resume').addEventListener('click', () => unpause());
      document.getElementById('ngn5-pause-settings').addEventListener('click', () => { Settings_.show(); });
      document.getElementById('ngn5-pause-quit').addEventListener('click', () => {
        unpause();
        if (onQuit) onQuit();
      });
    }

    function pause() {
      if (pauseVisible) return;
      if (!pauseEl) createPauseOverlay();
      pauseVisible = true;
      pauseEl.style.display = 'flex';
      Audio_.play('pause_on');
      if (Audio_.getMusicVolume() > 0) Audio_.setMusicVolume(Audio_.getMusicVolume() * 0.3);
      if (pauseCallback) pauseCallback(true);
    }

    function unpause() {
      if (!pauseVisible) return;
      pauseVisible = false;
      pauseEl.style.display = 'none';
      Audio_.play('pause_off');
      if (Settings_.isVisible()) Settings_.hide();
      if (pauseCallback) pauseCallback(false);
    }

    function toggle() {
      pauseVisible ? unpause() : pause();
    }

    function isPaused() { return pauseVisible; }

    function onToggle(cb) { pauseCallback = cb; }
    function setOnResume(cb) { onResume = cb; }
    function setOnQuit(cb) { onQuit = cb; }

    // Toast notifications
    function toast(msg, color, duration) {
      const container = document.getElementById('ngn5-popup-container');
      if (!container) return;
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;top:-60px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:6px;background:rgba(0,0,0,0.9);border:1px solid ' + (color || '#0ff') + ';color:' + (color || '#0ff') + ';font-family:monospace;font-size:13px;white-space:nowrap;transition:top 0.4s ease;z-index:10001';
      el.textContent = msg;
      container.appendChild(el);
      requestAnimationFrame(() => { el.style.top = '10px'; });
      setTimeout(() => { el.style.top = '-60px'; setTimeout(() => el.remove(), 500); }, duration || 2000);
    }

    // Coin display
    function updateCoinDisplay() {
      if (!coinDisplayEl) {
        coinDisplayEl = document.getElementById('ngn5-coin-display');
        if (!coinDisplayEl) {
          // Create if not in DOM
          coinDisplayEl = document.createElement('div');
          coinDisplayEl.id = 'ngn5-coin-display';
          coinDisplayEl.style.cssText = 'position:fixed;top:4px;left:4px;color:#ff0;font:12px monospace;z-index:99998;background:rgba(0,0,0,0.6);padding:2px 8px;border-radius:3px;display:none';
          document.body.appendChild(coinDisplayEl);
        }
      }
      coinDisplayEl.textContent = '\u2B50 ' + Rewards_.getCoins();
    }

    function showCoinDisplay() {
      if (!coinDisplayEl) coinDisplayEl = document.getElementById('ngn5-coin-display');
      if (coinDisplayEl) coinDisplayEl.style.display = 'block';
    }

    return {
      pause, unpause, toggle, isPaused,
      onToggle, setOnResume, setOnQuit,
      toast, updateCoinDisplay, showCoinDisplay,
      createPauseOverlay
    };
  })();

  /* ─────────────────────────────────────────────
     SECTION 8: GAME BASE CLASS
     Every NGN5 game extends this via NGN5.createGame(config)
     ───────────────────────────────────────────── */

  const GAME_STATES = { MENU: 0, PLAYING: 1, PAUSED: 2, RESULTS: 3, LOADING: 4, CUTSCENE: 5 };

  let activeGame = null;

  class Game {
    constructor(config) {
      this.id = config.id || 'unknown';
      this.title = config.title || 'NGN5 Game';
      this.canvasId = config.canvasId || 'gameCanvas';
      this.use3D = config.use3D || false;
      this.state = GAME_STATES.MENU;
      this.running = false;
      this._rafId = null;
      this._lastTime = 0;
      this._dt = 0;
      this._fpsCounter = 0;
      this._fpsTimer = 0;
      this._fps = 0;

      // Canvas
      this.canvas = document.getElementById(this.canvasId);
      this.ctx = null;
      this.W = 0;
      this.H = 0;

      // 3D (Babylon.js)
      this.engine3D = null;
      this.scene = null;
      this.camera = null;

      // State
      this.score = 0;
      this.lives = config.lives || 3;
      this.level = 1;
      this.difficulty = Settings_.get('difficulty');
      this.gameTime = 0;

      // Callbacks that games override
      this.onInit = config.onInit || (() => { });
      this.onUpdate = config.onUpdate || (() => { });
      this.onRender = config.onRender || (() => { });
      this.onMenu = config.onMenu || (() => { });
      this.onPlaying = config.onPlaying || (() => { });
      this.onPause = config.onPause || (() => { });
      this.onResume = config.onResume || (() => { });
      this.onResults = config.onResults || (() => { });
      this.onDestroy = config.onDestroy || (() => { });
      this.onStart = config.onStart || (() => { });
      this.onQuit = config.onQuit || (() => { });

      activeGame = this;
    }

    init() {
      // Init engine systems
      Settings_.load();
      Input_.init();
      Achievements_.init(this.id);
      UI_.createPauseOverlay();

      // Create popup container
      if (!document.getElementById('ngn5-popup-container')) {
        const pc = document.createElement('div');
        pc.id = 'ngn5-popup-container';
        pc.style.cssText = 'position:fixed;top:0;left:0;width:100%;pointer-events:none;z-index:100000';
        document.body.appendChild(pc);
      }

      // Setup canvas
      if (this.canvas) {
        this.ctx = this.canvas.getContext('2d');
        this.W = this.canvas.width;
        this.H = this.canvas.height;
      }

      // Setup 3D if needed
      if (this.use3D && this.canvas && typeof BABYLON !== 'undefined') {
        this.engine3D = new BABYLON.Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true });
      }

      // Pause callbacks
      UI_.setOnResume(() => {
        this.state = GAME_STATES.PLAYING;
        this.onResume();
      });
      UI_.setOnQuit(() => {
        this.state = GAME_STATES.MENU;
        this.onQuit();
      });

      // Audio context resume on first interaction
      const resumeAudio = () => { Audio_.resume(); document.removeEventListener('click', resumeAudio); document.removeEventListener('touchstart', resumeAudio); };
      document.addEventListener('click', resumeAudio);
      document.addEventListener('touchstart', resumeAudio);

      this.onInit();
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.state = GAME_STATES.PLAYING;
      UI_.showCoinDisplay();
      this.onStart();

      const loop = (timestamp) => {
        if (!this.running) return;
        this._rafId = requestAnimationFrame(loop);

        // Delta time
        if (this._lastTime === 0) this._lastTime = timestamp;
        this._dt = Math.min((timestamp - this._lastTime) / 1000, 0.05); // Cap at 50ms
        this._lastTime = timestamp;

        // FPS
        this._fpsCounter++;
        this._fpsTimer += this._dt;
        if (this._fpsTimer >= 1) { this._fps = this._fpsCounter; this._fpsCounter = 0; this._fpsTimer = 0; }

        // Update input FIRST
        Input_.update();

        // Handle universal pause/menu
        this._handleSystemInput();

        // Settings overlay blocks game input
        if (Settings_.isVisible() || UI_.isPaused()) {
          Settings_.updateFPS(timestamp);
          Achievements_.renderPopups();
          UI_.updateCoinDisplay();
          if (this.use3D && this.engine3D && this.scene) {
            // Don't render 3D when paused
          } else if (this.ctx) {
            this.onRender();
          }
          return;
        }

        // Update & render based on state
        switch (this.state) {
          case GAME_STATES.MENU:
            this.gameTime = 0;
            this.onMenu();
            break;
          case GAME_STATES.PLAYING:
            this.gameTime += this._dt;
            this.onPlaying();
            this.onUpdate(this._dt);
            break;
          case GAME_STATES.RESULTS:
            this.onResults();
            break;
          case GAME_STATES.LOADING:
            break;
          case GAME_STATES.CUTSCENE:
            break;
        }

        // Render
        if (this.use3D && this.engine3D && this.scene) {
          this.engine3D.render();
        } else if (this.ctx) {
          this.onRender();
        }

        // Systems
        Settings_.updateFPS(timestamp);
        Achievements_.renderPopups();
        UI_.updateCoinDisplay();
      };

      this._lastTime = 0;
      this._rafId = requestAnimationFrame(loop);
    }

    stop() {
      this.running = false;
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this.onDestroy();
    }

    _handleSystemInput() {
      const c = Input_.controller;

      // Enter / Start → Start game from menu, or toggle pause
      if (c.startJustPressed || c.pauseJustPressed) {
        if (this.state === GAME_STATES.MENU) {
          this.state = GAME_STATES.PLAYING;
          this.onStart();
        } else if (this.state === GAME_STATES.PLAYING) {
          this.state = GAME_STATES.PAUSED;
          UI_.pause();
          this.onPause();
        } else if (this.state === GAME_STATES.PAUSED) {
          this.state = GAME_STATES.PLAYING;
          UI_.unpause();
          this.onResume();
        }
      }

      // Escape / Back → back to menu
      if (c.backJustPressed) {
        if (this.state === GAME_STATES.PLAYING) {
          this.state = GAME_STATES.PAUSED;
          UI_.pause();
          this.onPause();
        } else if (this.state === GAME_STATES.PAUSED) {
          this.state = GAME_STATES.MENU;
          UI_.unpause();
          Audio_.stopMusic();
          this.onQuit();
        } else if (this.state === GAME_STATES.RESULTS) {
          this.state = GAME_STATES.MENU;
          Audio_.stopMusic();
        }
      }

      // Shift+Escape → Settings (checked via raw key)
      // This is handled in the keyboard handler directly
    }

    // Convenience methods
    playSound(name) { Audio_.play(name); }
    playMusic(genre) { Audio_.playMusic(genre); }
    stopMusic() { Audio_.stopMusic(); }
    addCoins(n) { return Rewards_.addCoins(n); }
    getCoins() { return Rewards_.getCoins(); }
    unlock(id, name, desc, rewards) { return Achievements_.unlock(id, name, desc, rewards); }
    toast(msg, color, duration) { UI_.toast(msg, color, duration); }
    trackStat(key, val) { Achievements_.trackStat(key, val); }
    recordGame(score, won, kills, coins) { Achievements_.recordGame(score, won, kills, coins, this.gameTime); }

    // Access to subsystems
    get input() { return Input_.controller; }
    get settings() { return Settings_; }
    get audio() { return Audio_; }
    get achievements() { return Achievements_; }
    get rewards() { return Rewards_; }
    get ui() { return UI_; }
  }

  /* ─────────────────────────────────────────────
     SECTION 9: SHIFT+ESC SETTINGS BINDING
     Must be outside game loop so it always works
     ───────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      Settings_.toggle();
    }
  });

  /* ─────────────────────────────────────────────
     SECTION 10: VIEWPORT FIX
     ───────────────────────────────────────────── */
  (function () {
    function updateViewport() {
      document.documentElement.style.setProperty('--ngn-vh', window.innerHeight + 'px');
      document.documentElement.style.setProperty('--ngn-vw', window.innerWidth + 'px');
    }
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', function () { setTimeout(updateViewport, 100); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', updateViewport);
  })();

  /* ─────────────────────────────────────────────
     SECTION 11: PUBLIC API
     window.NGN5 — the single entry point
     ───────────────────────────────────────────── */
  window.NGN5 = {
    createGame: (config) => new Game(config),
    Game,
    Audio: Audio_,
    Input: Input_,
    Settings: Settings_,
    Achievements: Achievements_,
    Rewards: Rewards_,
    UI: UI_,
    GAME_STATES,
    Storage,
    getActiveGame: () => activeGame
  };

})();
