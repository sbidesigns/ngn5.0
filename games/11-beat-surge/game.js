// ========================================
// NGN4 - BEAT SURGE (Game 11)
// Rhythm/Music Game
// ========================================
(function(){
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('beat-surge'); } catch(e) {}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Audio Context
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let musicSource = null;
let musicGain = null;
let musicPlaying = false;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
}

function playHitSound(freq = 440, dur = 0.08, type = 'square') {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
}

function playMissSound() {
    playHitSound(150, 0.15, 'sawtooth');
}

function playComboSound(combo) {
    const freq = 300 + combo * 15;
    playHitSound(Math.min(freq, 1200), 0.12, 'sine');
}

// Rewards system
function getRewards() {
    try {
        return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, games_played: 0 };
    } catch { return { coins: 0, games_played: 0 }; }
}
function saveRewards(r) {
    localStorage.setItem('ngn4_rewards', JSON.stringify(r));
}
function addCoins(amount) {
    const r = getRewards();
    r.coins += amount;
    saveRewards(r);
    updateCoinsDisplay();
}
function updateCoinsDisplay() {
    const r = getRewards();
    const el1 = document.getElementById('coins');
    const el2 = document.getElementById('menu-coins-val');
    if (el1) el1.textContent = r.coins;
    if (el2) el2.textContent = r.coins;
}

// Song definitions with audio properties
const SONGS = [
    { id: 0, name: 'First Pulse', bpm: 80, duration: 40, cost: 0, unlocked: true, pattern: 'simple', key: 'C', bassNote: 65.41, leadNotes: [261.63, 293.66, 329.63, 349.23] },
    { id: 1, name: 'City Lights', bpm: 95, duration: 45, cost: 0, unlocked: true, pattern: 'basic', key: 'G', bassNote: 98, leadNotes: [392, 440, 493.88, 523.25] },
    { id: 2, name: 'Neon Rain', bpm: 110, duration: 50, cost: 0, unlocked: true, pattern: 'step', key: 'E', bassNote: 82.41, leadNotes: [329.63, 369.99, 415.30, 466.16] },
    { id: 3, name: 'Grid Runner', bpm: 120, duration: 45, cost: 50, unlocked: false, pattern: 'zigzag', key: 'A', bassNote: 110, leadNotes: [440, 493.88, 554.37, 659.25] },
    { id: 4, name: 'Pulse Width', bpm: 130, duration: 50, cost: 100, unlocked: false, pattern: 'double', key: 'D', bassNote: 73.42, leadNotes: [293.66, 329.63, 369.99, 440] },
    { id: 5, name: 'Data Stream', bpm: 140, duration: 55, cost: 150, unlocked: false, pattern: 'wave', key: 'B', bassNote: 61.74, leadNotes: [246.94, 277.18, 329.63, 369.99] },
    { id: 6, name: 'Circuit Break', bpm: 150, duration: 50, cost: 200, unlocked: false, pattern: 'chaos', key: 'F#', bassNote: 92.5, leadNotes: [369.99, 415.30, 493.88, 554.37] },
    { id: 7, name: 'Overclock', bpm: 160, duration: 55, cost: 300, unlocked: false, pattern: 'flood', key: 'C#', bassNote: 69.3, leadNotes: [277.18, 329.63, 369.99, 415.30] },
    { id: 8, name: 'System Crash', bpm: 170, duration: 50, cost: 400, unlocked: false, pattern: 'barrage', key: 'Ab', bassNote: 103.83, leadNotes: [415.30, 466.16, 523.25, 622.25] },
    { id: 9, name: 'Beat Singularity', bpm: 180, duration: 60, cost: 500, unlocked: false, pattern: 'extreme', key: 'Eb', bassNote: 77.78, leadNotes: [311.13, 349.23, 415.30, 466.16] }
];

// Load unlock state
function loadUnlockState() {
    try {
        const s = JSON.parse(localStorage.getItem('ngn4_beatsurge'));
        if (s) s.unlocked.forEach(id => { if (SONGS[id]) SONGS[id].unlocked = true; });
    } catch {}
}
function saveUnlockState() {
    const unlocked = SONGS.filter(s => s.unlocked).map(s => s.id);
    localStorage.setItem('ngn4_beatsurge', JSON.stringify({ unlocked }));
}

// Game State
const LANES = [
    { key: 'D', keyCode: 'KeyD', color: '#ff3366', x: 200 },
    { key: 'F', keyCode: 'KeyF', color: '#00ff66', x: 320 },
    { key: 'J', keyCode: 'KeyJ', color: '#3366ff', x: 480 },
    { key: 'K', keyCode: 'KeyK', color: '#ffcc00', x: 600 }
];

const HIT_Y = 520;
const HIT_ZONE = 50;
const PERFECT_ZONE = 18;
const GREAT_ZONE = 32;
const GOOD_ZONE = HIT_ZONE;

let state = {
    screen: 'menu',
    selectedSong: 0,
    difficulty: 'medium',
    notes: [],
    particles: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    multiplier: 1,
    health: 100,
    totalNotes: 0,
    hitNotes: 0,
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    songTime: 0,
    songDuration: 0,
    laneFlash: [0, 0, 0, 0],
    keyDown: [false, false, false, false],
    comboPopups: [],
    beatPulse: 0,
    stars: 0,
    noteSpeed: 300,
    highScores: JSON.parse(localStorage.getItem('ngn4_bs_highscores') || '{}'),
    songFinished: false
};

// Achievements
const BS_ACHIEVE = {
    perfect_song: { name: 'Perfect Song', desc: '100% accuracy on any song', done: false },
    combo_master: { name: 'Combo Master', desc: 'Reach 50x combo', done: false },
    all_stars: { name: 'All Stars', desc: '3-star all songs', done: false }
};
let bsAchData = JSON.parse(localStorage.getItem('ngn4_ach_bs') || '{}');

// Gamepad
let bsGamepadConnected = false;
let bsGpBtns = {};
window.addEventListener('gamepadconnected', () => bsGamepadConnected = true);
window.addEventListener('gamepaddisconnected', () => bsGamepadConnected = false);
setInterval(() => {
    if (!bsGamepadConnected || state.screen !== 'playing') return;
    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    if (!gp) return;
    // D-pad = lanes (up=0, right=1, down=2, left=3)
    if (gp.buttons[12]?.pressed && !bsGpBtns.du) { bsGpBtns.du = true; hitNote(0); }
    if (!gp.buttons[12]?.pressed) bsGpBtns.du = false;
    if (gp.buttons[15]?.pressed && !bsGpBtns.dr) { bsGpBtns.dr = true; hitNote(1); }
    if (!gp.buttons[15]?.pressed) bsGpBtns.dr = false;
    if (gp.buttons[13]?.pressed && !bsGpBtns.dd) { bsGpBtns.dd = true; hitNote(2); }
    if (!gp.buttons[13]?.pressed) bsGpBtns.dd = false;
    if (gp.buttons[14]?.pressed && !bsGpBtns.dl) { bsGpBtns.dl = true; hitNote(3); }
    if (!gp.buttons[14]?.pressed) bsGpBtns.dl = false;
    // A/B/X/Y = lane buttons
    if (gp.buttons[0]?.pressed && !bsGpBtns.a) { bsGpBtns.a = true; hitNote(0); }
    if (!gp.buttons[0]?.pressed) bsGpBtns.a = false;
    if (gp.buttons[1]?.pressed && !bsGpBtns.b) { bsGpBtns.b = true; hitNote(1); }
    if (!gp.buttons[1]?.pressed) bsGpBtns.b = false;
    if (gp.buttons[2]?.pressed && !bsGpBtns.x) { bsGpBtns.x = true; hitNote(2); }
    if (!gp.buttons[2]?.pressed) bsGpBtns.x = false;
    if (gp.buttons[3]?.pressed && !bsGpBtns.y) { bsGpBtns.y = true; hitNote(3); }
    if (!gp.buttons[3]?.pressed) bsGpBtns.y = false;
}, 50);

const diffMultipliers = { easy: 0.6, medium: 1.0, hard: 1.5 };
const diffDmg = { easy: 8, medium: 12, hard: 18 };

// Procedural music engine
function startMusic(song) {
    if (!audioCtx) return;
    stopMusic();
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.08;
    musicGain.connect(audioCtx.destination);
    musicPlaying = true;
    const beatInterval = 60 / song.bpm;
    let nextBeat = audioCtx.currentTime + 0.1;
    let beatCount = 0;
    const scheduleBeats = () => {
        if (!musicPlaying) return;
        while (nextBeat < audioCtx.currentTime + 0.2) {
            // Kick on beats 1, 3
            if (beatCount % 4 === 0 || beatCount % 4 === 2) {
                const kick = audioCtx.createOscillator();
                const kg = audioCtx.createGain();
                kick.type = 'sine'; kick.frequency.setValueAtTime(60, nextBeat);
                kick.frequency.exponentialRampToValueAtTime(30, nextBeat + 0.15);
                kg.gain.setValueAtTime(0.4, nextBeat);
                kg.gain.exponentialRampToValueAtTime(0.001, nextBeat + 0.15);
                kick.connect(kg); kg.connect(musicGain);
                kick.start(nextBeat); kick.stop(nextBeat + 0.15);
            }
            // Snare on beats 2, 4
            if (beatCount % 4 === 1 || beatCount % 4 === 3) {
                const noise = audioCtx.createBufferSource();
                const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
                const data = buf.getChannelData(0);
                for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
                noise.buffer = buf;
                const ng = audioCtx.createGain();
                ng.gain.setValueAtTime(0.3, nextBeat);
                ng.gain.exponentialRampToValueAtTime(0.001, nextBeat + 0.1);
                const hp = audioCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1000;
                noise.connect(hp); hp.connect(ng); ng.connect(musicGain);
                noise.start(nextBeat); noise.stop(nextBeat + 0.1);
            }
            // Hihat on every beat and off-beat
            if (beatCount % 2 === 0 || (song.bpm > 120 && beatCount % 2 === 1)) {
                const hh = audioCtx.createBufferSource();
                const hbuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.03, audioCtx.sampleRate);
                const hd = hbuf.getChannelData(0);
                for (let i = 0; i < hd.length; i++) hd[i] = (Math.random() * 2 - 1) * 0.15;
                hh.buffer = hbuf;
                const hg = audioCtx.createGain();
                hg.gain.setValueAtTime(0.15, nextBeat);
                hg.gain.exponentialRampToValueAtTime(0.001, nextBeat + 0.03);
                const hhp = audioCtx.createBiquadFilter(); hhp.type = 'highpass'; hhp.frequency.value = 5000;
                hh.connect(hhp); hhp.connect(hg); hg.connect(musicGain);
                hh.start(nextBeat); hh.stop(nextBeat + 0.05);
            }
            // Bass line on every beat
            const bass = audioCtx.createOscillator();
            const bg = audioCtx.createGain();
            bass.type = 'sawtooth';
            bass.frequency.setValueAtTime(song.bassNote * (1 + (Math.floor(beatCount / 4) % 2) * 0.05), nextBeat);
            bg.gain.setValueAtTime(0.2, nextBeat);
            bg.gain.exponentialRampToValueAtTime(0.001, nextBeat + beatInterval * 0.8);
            const bf = audioCtx.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 400;
            bass.connect(bf); bf.connect(bg); bg.connect(musicGain);
            bass.start(nextBeat); bass.stop(nextBeat + beatInterval * 0.9);
            // Lead melody on some beats
            if (beatCount % 2 === 0 && song.leadNotes) {
                const lead = audioCtx.createOscillator();
                const lg = audioCtx.createGain();
                lead.type = 'square';
                const noteIdx = (Math.floor(beatCount / 2) + Math.floor(beatCount / 8)) % song.leadNotes.length;
                lead.frequency.setValueAtTime(song.leadNotes[noteIdx], nextBeat);
                lg.gain.setValueAtTime(0.08, nextBeat);
                lg.gain.exponentialRampToValueAtTime(0.001, nextBeat + beatInterval * 1.5);
                lead.connect(lg); lg.connect(musicGain);
                lead.start(nextBeat); lead.stop(nextBeat + beatInterval * 1.6);
            }
            beatCount++;
            nextBeat += beatInterval / 2;
        }
        if (musicPlaying) setTimeout(scheduleBeats, 100);
    };
    scheduleBeats();
}
function stopMusic() {
    musicPlaying = false;
    if (musicGain) { try { musicGain.disconnect(); } catch(e) {} musicGain = null; }
}

// Pattern generators
function generateNotes(song, difficulty) {
    const notes = [];
    const beatInterval = 60 / song.bpm;
    const density = diffMultipliers[difficulty];
    const interval = beatInterval / density;
    let t = 2; // Start after 2 seconds
    const end = song.duration - 1;

    const patterns = {
        simple: (t, i) => [i % 4],
        basic: (t, i) => i % 3 === 0 ? [i % 4, (i + 2) % 4] : [i % 4],
        step: (t, i) => [i % 4],
        zigzag: (t, i) => {
            const p = i % 8;
            return p < 4 ? [p] : [6 - p];
        },
        double: (t, i) => i % 2 === 0 ? [i % 4, (i + 1) % 4] : [(i + 2) % 4],
        wave: (t, i) => {
            const w = Math.round(Math.sin(i * 0.3) * 1.5 + 1.5);
            return [Math.max(0, Math.min(3, w))];
        },
        chaos: (t, i) => {
            const lanes = [];
            if (Math.random() < 0.3) lanes.push(Math.floor(Math.random() * 4));
            if (Math.random() < 0.5) lanes.push(Math.floor(Math.random() * 4));
            if (lanes.length === 0) lanes.push(i % 4);
            return [...new Set(lanes)];
        },
        flood: (t, i) => {
            if (i % 4 === 0) return [0, 1, 2, 3];
            return [Math.floor(Math.random() * 4)];
        },
        barrage: (t, i) => {
            const count = Math.random() < 0.3 ? 3 : Math.random() < 0.5 ? 2 : 1;
            const lanes = [];
            for (let j = 0; j < count; j++) lanes.push(Math.floor(Math.random() * 4));
            return [...new Set(lanes)];
        },
        extreme: (t, i) => {
            const lanes = [];
            for (let j = 0; j < 4; j++) if (Math.random() < 0.45) lanes.push(j);
            return lanes.length > 0 ? [...new Set(lanes)] : [i % 4];
        }
    };

    const gen = patterns[song.pattern] || patterns.simple;
    let idx = 0;
    while (t < end) {
        const lanes = gen(t, idx);
        lanes.forEach(lane => {
            notes.push({
                lane,
                time: t,
                hit: false,
                missed: false,
                y: 0,
                alpha: 1
            });
        });
        idx++;
        t += interval;
    }
    return notes;
}

// Particle system
function spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 2 + Math.random() * 4;
        state.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 1,
            decay: 0.02 + Math.random() * 0.02,
            color,
            size: 2 + Math.random() * 3
        });
    }
}

function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= p.decay;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
}

// Combo popups
function addPopup(text, x, y, color) {
    state.comboPopups.push({ text, x, y, alpha: 1, vy: -2, color, scale: 1.5 });
}

function updatePopups() {
    for (let i = state.comboPopups.length - 1; i >= 0; i--) {
        const p = state.comboPopups[i];
        p.y += p.vy;
        p.alpha -= 0.02;
        p.scale = Math.max(1, p.scale - 0.03);
        if (p.alpha <= 0) state.comboPopups.splice(i, 1);
    }
}

// UI Management
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const hud = document.getElementById('hud');
    hud.classList.remove('active');
    state.screen = name;

    if (name === 'menu') {
        document.getElementById('menu-screen').classList.add('active');
        updateCoinsDisplay();
        buildSongList();
    } else if (name === 'playing') {
        hud.classList.add('active');
    } else if (name === 'results') {
        document.getElementById('results-screen').classList.add('active');
    } else if (name === 'ad') {
        document.getElementById('ad-screen').classList.add('active');
        startAdTimer();
    } else if (name === 'fail') {
        document.getElementById('fail-screen').classList.add('active');
    } else if (name === 'unlock') {
        document.getElementById('unlock-screen').classList.add('active');
    }
}

function buildSongList() {
    const list = document.getElementById('song-list');
    list.innerHTML = '';
    SONGS.forEach((song, i) => {
        const div = document.createElement('div');
        div.className = `song-item ${i === state.selectedSong ? 'selected' : ''} ${!song.unlocked ? 'locked' : ''}`;
        div.innerHTML = `
            <div class="song-info">
                <span class="song-name">${song.unlocked ? song.name : '🔒 ' + song.name}</span>
                <span class="song-meta">BPM: ${song.bpm} | ${song.duration}s${!song.unlocked ? ' | Cost: ' + song.cost + ' coins' : ''}</span>
                ${state.highScores[song.id] ? '<span class="song-meta" style="color:#ffcc00">BEST: ' + state.highScores[song.id].score + ' (' + state.highScores[song.id].stars + '★)</span>' : ''}
            </div>
            ${song.unlocked ? '<span style="color:#00ffff">▶</span>' : '<span style="color:#ffcc00">💰</span>'}
        `;
        div.onclick = () => {
            if (!song.unlocked) {
                state.selectedSong = i;
                const r = getRewards();
                document.getElementById('unlock-cost').textContent = `Unlock "${song.name}" for ${song.cost} coins? (You have ${r.coins})`;
                showScreen('unlock');
                return;
            }
            state.selectedSong = i;
            document.querySelectorAll('.song-item').forEach(s => s.classList.remove('selected'));
            div.classList.add('selected');
        };
        list.appendChild(div);
    });
}

// Start game
function startGame() {
    initAudio();
    const song = SONGS[state.selectedSong];
    if (!song.unlocked) return;

    state.notes = generateNotes(song, state.difficulty);
    state.particles = [];
    state.comboPopups = [];
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.multiplier = 1;
    state.health = 100;
    state.totalNotes = state.notes.length;
    state.hitNotes = 0;
    state.perfect = 0;
    state.great = 0;
    state.good = 0;
    state.miss = 0;
    state.songTime = 0;
    state.songDuration = song.duration;
    state.laneFlash = [0, 0, 0, 0];
    state.keyDown = [false, false, false, false];
    state.beatPulse = 0;
    state.stars = 0;
    state.songFinished = false;

    document.getElementById('song-title').textContent = song.name + ' - ' + song.bpm + ' BPM';
    showScreen('playing');
    startMusic(song);
}

// Hit detection
function hitNote(laneIdx) {
    const now = state.songTime;
    let bestNote = null;
    let bestDist = Infinity;

    for (const note of state.notes) {
        if (note.lane !== laneIdx || note.hit || note.missed) continue;
        const dist = Math.abs(note.time - now);
        if (dist < bestDist && dist < GOOD_ZONE / 60) {
            bestDist = dist;
            bestNote = note;
        }
    }

    if (bestNote) {
        bestNote.hit = true;
        state.hitNotes++;
        state.combo++;
        if (state.combo > state.maxCombo) state.maxCombo = state.combo;

        // Update multiplier
        if (state.combo >= 50) state.multiplier = 8;
        else if (state.combo >= 30) state.multiplier = 6;
        else if (state.combo >= 20) state.multiplier = 4;
        else if (state.combo >= 10) state.multiplier = 3;
        else if (state.combo >= 5) state.multiplier = 2;
        else state.multiplier = 1;

        // Achievement check: combo master
        if (state.combo >= 50) {
            if (!bsAchData.combo_master) {
                bsAchData.combo_master = true;
                localStorage.setItem('ngn4_ach_bs', JSON.stringify(bsAchData));
            }
        }
        // NGN4 Achievement system integration
        try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.runChecks(); } catch(e) {}

        let rating, points, color;
        if (bestDist < PERFECT_ZONE / 60) {
            rating = 'PERFECT'; points = 10; color = '#00ffff';
            state.perfect++;
            state.laneFlash[laneIdx] = 1;
            playHitSound(880, 0.06, 'sine');
            spawnParticles(LANES[laneIdx].x, HIT_Y, color, 16);
        } else if (bestDist < GREAT_ZONE / 60) {
            rating = 'GREAT'; points = 7; color = '#66ff66';
            state.great++;
            state.laneFlash[laneIdx] = 0.7;
            playHitSound(660, 0.06, 'sine');
            spawnParticles(LANES[laneIdx].x, HIT_Y, color, 10);
        } else {
            rating = 'GOOD'; points = 3; color = '#ffcc00';
            state.good++;
            state.laneFlash[laneIdx] = 0.4;
            playHitSound(440, 0.06, 'sine');
            spawnParticles(LANES[laneIdx].x, HIT_Y, color, 6);
        }

        const earned = points * state.multiplier;
        state.score += earned;
        addPopup(`${rating} +${earned}`, LANES[laneIdx].x, HIT_Y - 40, color);

        if (state.combo > 0 && state.combo % 10 === 0) {
            playComboSound(state.combo);
            addPopup(`${state.combo} COMBO!`, 400, HIT_Y - 100, '#ffcc00');
        }
    } else {
        // Empty press - small penalty
        playHitSound(200, 0.04, 'sine');
    }
}

// Note missed
function missNote(note) {
    note.missed = true;
    state.miss++;
    state.combo = 0;
    state.multiplier = 1;
    state.health -= diffDmg[state.difficulty];
    addPopup('MISS', LANES[note.lane].x, HIT_Y - 40, '#ff3366');
    playMissSound();
    if (state.health <= 0) {
        state.health = 0;
        failSong();
    }
}

function getLetterGrade(accuracy) {
    if (accuracy >= 100) return { grade: 'S', color: '#ff00ff' };
    if (accuracy >= 90) return { grade: 'A', color: '#00ff00' };
    if (accuracy >= 75) return { grade: 'B', color: '#ffff00' };
    if (accuracy >= 50) return { grade: 'C', color: '#ff8800' };
    return { grade: 'D', color: '#ff3333' };
}

// Song end
function endSong() {
    if (state.songFinished) return;
    state.songFinished = true;
    stopMusic();
    const accuracy = state.totalNotes > 0 ? (state.hitNotes / state.totalNotes) * 100 : 0;
    const perfectPct = state.totalNotes > 0 ? (state.perfect / state.totalNotes) * 100 : 0;
    const greatPct = state.totalNotes > 0 ? (state.great / state.totalNotes) * 100 : 0;
    const goodPct = state.totalNotes > 0 ? (state.good / state.totalNotes) * 100 : 0;
    const missPct = state.totalNotes > 0 ? (state.miss / state.totalNotes) * 100 : 0;

    // Star rating
    if (perfectPct > 80) state.stars = 3;
    else if (accuracy > 85) state.stars = 2;
    else if (accuracy > 50) state.stars = 1;
    else state.stars = 0;

    // Coins
    const completionBonus = state.stars * 50;
    const coinEarned = Math.floor(state.score / 10) + completionBonus;
    addCoins(coinEarned);

    // High score
    const songId = SONGS[state.selectedSong].id;
    if (!state.highScores[songId] || state.score > state.highScores[songId].score) {
        state.highScores[songId] = { score: state.score, stars: state.stars, accuracy: accuracy };
        localStorage.setItem('ngn4_bs_highscores', JSON.stringify(state.highScores));
    }

    // Achievements
    if (accuracy >= 100 && !bsAchData.perfect_song) {
        bsAchData.perfect_song = true;
        localStorage.setItem('ngn4_ach_bs', JSON.stringify(bsAchData));
        state.comboPopups.push({ text: '🏆 Perfect Song!', x: 400, y: 300, alpha: 1.5, vy: -1, color: '#ff00ff', scale: 2 });
    }
    if (state.maxCombo >= 50 && !bsAchData.combo_master) {
        bsAchData.combo_master = true;
        localStorage.setItem('ngn4_ach_bs', JSON.stringify(bsAchData));
        state.comboPopups.push({ text: '🏆 Combo Master!', x: 400, y: 300, alpha: 1.5, vy: -1, color: '#ffcc00', scale: 2 });
    }
    // Check All Stars
    const allThree = SONGS.every(s => s.unlocked && state.highScores[s.id] && state.highScores[s.id].stars >= 3);
    if (allThree && !bsAchData.all_stars) {
        bsAchData.all_stars = true;
        localStorage.setItem('ngn4_ach_bs', JSON.stringify(bsAchData));
    }
    // NGN4 Achievement system integration
    try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.runChecks(); } catch(e) {}

    const gradeInfo = getLetterGrade(accuracy);
    document.getElementById('star-rating').innerHTML = 
        `<span style="color:${gradeInfo.color};font-size:48px;font-weight:bold">${gradeInfo.grade}</span><br>` +
        '★'.repeat(state.stars) + '☆'.repeat(3 - state.stars);
    const hsText = state.highScores[songId] ? `HIGH SCORE: ${state.highScores[songId].score}` : '';
    document.getElementById('results-stats').innerHTML = `
        <div><span class="rating-perfect">PERFECT: ${state.perfect} (${perfectPct.toFixed(1)}%)</span></div>
        <div><span class="rating-great">GREAT: ${state.great} (${greatPct.toFixed(1)}%)</span></div>
        <div><span class="rating-good">GOOD: ${state.good} (${goodPct.toFixed(1)}%)</span></div>
        <div><span class="rating-miss">MISS: ${state.miss} (${missPct.toFixed(1)}%)</span></div>
        <div>MAX COMBO: ${state.maxCombo}</div>
        <div>FINAL SCORE: ${state.score}</div>
        <div>ACCURACY: ${accuracy.toFixed(1)}%</div>
        ${hsText ? `<div style="color:#ffcc00">${hsText}</div>` : ''}
    `;
    document.getElementById('earned-coins').textContent = `+${coinEarned} COINS EARNED!`;
    showScreen('results');
}

function failSong() {
    if (state.songFinished) return;
    state.songFinished = true;
    stopMusic();
    const coins = Math.floor(state.score / 20);
    addCoins(coins);
    document.getElementById('fail-stats').innerHTML = `
        <div>SCORE: ${state.score}</div>
        <div>MAX COMBO: ${state.maxCombo}</div>
        <div>Earned: ${coins} coins</div>
    `;
    showScreen('fail');
}

// Ad system
let adTimer = null;
function startAdTimer() {
    let count = 5;
    document.getElementById('ad-countdown').textContent = count;
    clearInterval(adTimer);
    adTimer = setInterval(() => {
        count--;
        document.getElementById('ad-countdown').textContent = count;
        if (count <= 0) {
            clearInterval(adTimer);
            // Return to menu after ad
            showScreen('menu');
        }
    }, 1000);
}

// Revive via ad
function reviveWithAd() {
    state.health = 50;
    state.songFinished = false;
    showScreen('playing');
    startMusic(SONGS[state.selectedSong]);
}

// Input
document.addEventListener('keydown', (e) => {
    if (state.screen !== 'playing') return;
    initAudio();
    const laneIdx = LANES.findIndex(l => l.keyCode === e.code);
    if (laneIdx >= 0 && !state.keyDown[laneIdx]) {
        state.keyDown[laneIdx] = true;
        hitNote(laneIdx);
    }
});

document.addEventListener('keyup', (e) => {
    const laneIdx = LANES.findIndex(l => l.keyCode === e.code);
    if (laneIdx >= 0) state.keyDown[laneIdx] = false;
});

// Button handlers
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.difficulty = btn.dataset.diff;
    };
});

document.getElementById('start-btn').onclick = () => {
    const song = SONGS[state.selectedSong];
    if (!song.unlocked) {
        const r = getRewards();
        document.getElementById('unlock-cost').textContent = `Unlock "${song.name}" for ${song.cost} coins? (You have ${r.coins})`;
        showScreen('unlock');
        return;
    }
    startGame();
};

document.getElementById('continue-btn').onclick = () => {
    // Show ad between songs then back to menu
    showScreen('ad');
};

document.getElementById('retry-btn').onclick = () => startGame();
document.getElementById('menu-btn').onclick = () => showScreen('menu');
document.getElementById('ad-revive-btn').onclick = reviveWithAd;

document.getElementById('unlock-yes').onclick = () => {
    const song = SONGS[state.selectedSong];
    const r = getRewards();
    if (r.coins >= song.cost) {
        r.coins -= song.cost;
        saveRewards(r);
        song.unlocked = true;
        saveUnlockState();
        updateCoinsDisplay();
        buildSongList();
        showScreen('menu');
    }
};
document.getElementById('unlock-no').onclick = () => showScreen('menu');

// Rendering
function drawBackground() {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, 800, 600);

    // Grid lines
    ctx.strokeStyle = '#0f0f2a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 800; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 600);
        ctx.stroke();
    }
    for (let i = 0; i < 600; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(800, i);
        ctx.stroke();
    }
}

function drawLanes() {
    const laneWidth = 100;

    // Lane backgrounds
    LANES.forEach((lane, i) => {
        const x = lane.x - laneWidth / 2;
        const flash = state.laneFlash[i];

        ctx.fillStyle = `rgba(${flash > 0 ? '50,50,100' : '10,10,20'}, ${0.5 + flash * 0.3})`;
        ctx.fillRect(x, 0, laneWidth, 600);

        if (flash > 0) {
            const grad = ctx.createLinearGradient(x, HIT_Y - 100, x, HIT_Y + 50);
            grad.addColorStop(0, `rgba(255,255,255,0)`);
            grad.addColorStop(0.5, lane.color + Math.floor(flash * 80).toString(16).padStart(2, '0'));
            grad.addColorStop(1, `rgba(255,255,255,0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(x, HIT_Y - 100, laneWidth, 150);
            state.laneFlash[i] = Math.max(0, flash - 0.04);
        }
    });

    // Lane dividers
    ctx.strokeStyle = '#1a1a3a';
    ctx.lineWidth = 2;
    LANES.forEach(lane => {
        ctx.beginPath();
        ctx.moveTo(lane.x - laneWidth / 2, 0);
        ctx.lineTo(lane.x - laneWidth / 2, 600);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lane.x + laneWidth / 2, 0);
        ctx.lineTo(lane.x + laneWidth / 2, 600);
        ctx.stroke();
    });

    // Hit line
    ctx.strokeStyle = '#ffffff44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, HIT_Y);
    ctx.lineTo(700, HIT_Y);
    ctx.stroke();

    // Key labels at bottom
    ctx.font = '20px Courier New';
    ctx.textAlign = 'center';
    LANES.forEach((lane, i) => {
        const pressed = state.keyDown[i];
        ctx.fillStyle = pressed ? lane.color : '#444';
        ctx.fillText(lane.key, lane.x, 590);
        if (pressed) {
            ctx.shadowColor = lane.color;
            ctx.shadowBlur = 15;
            ctx.fillText(lane.key, lane.x, 590);
            ctx.shadowBlur = 0;
        }
    });
}

function drawNotes() {
    const noteSpeed = state.noteSpeed;
    const lookAhead = 2; // seconds

    state.notes.forEach(note => {
        if (note.hit || note.missed) return;

        const timeDiff = note.time - state.songTime;
        if (timeDiff < -1 || timeDiff > lookAhead) return;

        const y = HIT_Y - (timeDiff * noteSpeed);
        const lane = LANES[note.lane];
        const w = 70;
        const h = 20;

        // Note glow
        ctx.shadowColor = lane.color;
        ctx.shadowBlur = 10;

        // Note body
        const grad = ctx.createLinearGradient(lane.x - w / 2, y - h / 2, lane.x + w / 2, y + h / 2);
        grad.addColorStop(0, lane.color);
        grad.addColorStop(1, lane.color + '88');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.roundRect(lane.x - w / 2, y - h / 2, w, h, 5);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Bright center
        ctx.fillStyle = '#ffffff88';
        ctx.beginPath();
        ctx.roundRect(lane.x - w / 4, y - h / 4, w / 2, h / 2, 3);
        ctx.fill();
    });
}

function drawParticles() {
    state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

function drawPopups() {
    state.comboPopups.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.font = `bold ${16 * p.scale}px Courier New`;
        ctx.fillStyle = p.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

function drawBeatPulse() {
    if (state.beatPulse > 0) {
        ctx.strokeStyle = `rgba(0, 255, 255, ${state.beatPulse * 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(400, HIT_Y, (1 - state.beatPulse) * 200, 0, Math.PI * 2);
        ctx.stroke();
        state.beatPulse -= 0.03;
    }
}

function updateHUD() {
    document.getElementById('score').textContent = state.score;
    document.getElementById('combo').textContent = state.combo;
    document.getElementById('multiplier').textContent = state.multiplier;
    document.getElementById('coins').textContent = getRewards().coins;
    const acc = state.hitNotes + state.miss > 0 ? (state.hitNotes / (state.hitNotes + state.miss)) * 100 : 100;
    document.getElementById('accuracy').textContent = acc.toFixed(0);
    document.getElementById('health-bar').style.width = state.health + '%';
}

// Beat pulse based on BPM
let lastBeatTime = 0;
function checkBeat() {
    const song = SONGS[state.selectedSong];
    const beatInterval = 60 / song.bpm;
    if (state.songTime - lastBeatTime >= beatInterval) {
        lastBeatTime = state.songTime;
        state.beatPulse = 1;
    }
}

// Main loop
let lastTime = 0;
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    if (state.screen === 'playing') {
        state.songTime += dt;

        // Check for missed notes
        for (const note of state.notes) {
            if (!note.hit && !note.missed && state.songTime - note.time > GOOD_ZONE / 60) {
                missNote(note);
            }
        }

        // Check song end
        const activeNotes = state.notes.filter(n => !n.hit && !n.missed);
        if (activeNotes.length === 0 && state.songTime > 5) {
            endSong();
        }

        // Check for end of song duration (safety)
        if (state.songTime >= state.songDuration) {
            endSong();
        }

        checkBeat();
        updateParticles();
        updatePopups();

        // NGN4 Achievement popups
        try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.renderPopups(); } catch(e) {}

        // Draw
        drawBackground();
        drawLanes();
        drawNotes();
        drawBeatPulse();
        drawParticles();
        drawPopups();
        updateHUD();

    // Mobile touch zones
    if ('ontouchstart' in window && state.screen === 'playing') {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(100, HIT_Y, 120, 80);
        ctx.fillRect(220, HIT_Y, 120, 80);
        ctx.fillRect(340, HIT_Y, 120, 80);
        ctx.fillRect(460, HIT_Y, 120, 80);
    }
}
}

// Initialize
loadUnlockState();
updateCoinsDisplay();
buildSongList();
showScreen('menu');
requestAnimationFrame(gameLoop);

// Touch controls for 4 tap zones
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (state.screen !== 'playing') return;
    initAudio();
    for (const t of e.changedTouches) {
        const r = canvas.getBoundingClientRect();
        const x = t.clientX - r.left;
        let laneIdx = -1;
        if (x < 260) laneIdx = 0;
        else if (x < 400) laneIdx = 1;
        else if (x < 540) laneIdx = 2;
        else laneIdx = 3;
        if (laneIdx >= 0) hitNote(laneIdx);
    }
}, { passive: false });

// Pause support
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.screen === 'playing') {
    state.screen = 'paused';
    if (!audioCtx || audioCtx.state === 'suspended') initAudio();
    stopMusic();
    document.getElementById('hud').classList.remove('active');
    if (document.getElementById('pause-screen-bs')) document.getElementById('pause-screen-bs').classList.add('active');
    e.preventDefault();
    return;
  }
  if (e.key === 'Escape' && state.screen === 'paused') {
    state.screen = 'playing';
    startMusic(SONGS[state.selectedSong]);
    document.getElementById('hud').classList.add('active');
    if (document.getElementById('pause-screen-bs')) document.getElementById('pause-screen-bs').classList.remove('active');
    e.preventDefault();
    return;
  }
});

document.getElementById('pause-resume-bs')?.addEventListener('click', () => {
  state.screen = 'playing';
  startMusic(SONGS[state.selectedSong]);
  document.getElementById('hud').classList.add('active');
  document.getElementById('pause-screen-bs').classList.remove('active');
});
document.getElementById('pause-settings-bs')?.addEventListener('click', () => {
  try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.show(); } catch(e) {}
});
document.getElementById('pause-menu-bs')?.addEventListener('click', () => {
  stopMusic();
  state.screen = 'menu';
  document.getElementById('hud').classList.remove('active');
  document.getElementById('pause-screen-bs').classList.remove('active');
  showScreen('menu');
});

// Note speed adjustment
document.addEventListener('keydown', (e) => {
    if (state.screen !== 'playing') return;
    if (e.code === 'BracketLeft') state.noteSpeed = Math.max(150, state.noteSpeed - 30);
    if (e.code === 'BracketRight') state.noteSpeed = Math.min(600, state.noteSpeed + 30);
});

})();
