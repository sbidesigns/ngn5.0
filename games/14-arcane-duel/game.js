// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('arcane-duel'); } catch(e) {}

// ========================================
// NGN4 - ARCANE DUEL (Game 14)
// Card Battle Game
// ========================================

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function initAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
function playSound(f, d, t = 'square', v = 0.08) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
}

function getRewards() { try { return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, games_played: 0 }; } catch { return { coins: 0, games_played: 0 }; } }
function saveRewards(r) { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); }
function addCoins(n) { const r = getRewards(); r.coins += n; saveRewards(r); updateCoinsUI(); }
function updateCoinsUI() {
    const c = getRewards().coins;
    ['coins-val', 'menu-coins-val'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = c; });
}

// ========================================
// CARD DATABASE - 40 Cards, 4 Schools
// ========================================
const SCHOOL_COLORS = { fire: '#ff4422', ice: '#4488ff', nature: '#44cc44', shadow: '#aa44ff' };

const CARDS_DB = [
    { id: 'f1', name: 'Ember', school: 'fire', cost: 1, type: 'spell', rarity: 'common', desc: 'Deal 2 damage', dmg: 2 },
    { id: 'f2', name: 'Fire Sprite', school: 'fire', cost: 2, type: 'creature', rarity: 'common', desc: '', atk: 2, hp: 1 },
    { id: 'f3', name: 'Fireball', school: 'fire', cost: 3, type: 'spell', rarity: 'common', desc: 'Deal 4 damage', dmg: 4 },
    { id: 'f4', name: 'Flame Hound', school: 'fire', cost: 3, type: 'creature', rarity: 'common', desc: '', atk: 3, hp: 2 },
    { id: 'f5', name: 'Inferno', school: 'fire', cost: 5, type: 'spell', rarity: 'rare', desc: 'Deal 6 damage', dmg: 6 },
    { id: 'f6', name: 'Fire Drake', school: 'fire', cost: 5, type: 'creature', rarity: 'rare', desc: '', atk: 5, hp: 4 },
    { id: 'f7', name: 'Phoenix', school: 'fire', cost: 7, type: 'creature', rarity: 'epic', desc: 'Resurrect once', atk: 6, hp: 5, special: 'resurrect' },
    { id: 'f8', name: 'Meteor', school: 'fire', cost: 8, type: 'spell', rarity: 'epic', desc: 'Deal 8 damage', dmg: 8 },
    { id: 'f9', name: 'Dragon\'s Breath', school: 'fire', cost: 4, type: 'spell', rarity: 'rare', desc: 'Deal 3 to enemy + all creatures', dmg: 3, aoe: true },
    { id: 'f10', name: 'Sun God', school: 'fire', cost: 10, type: 'creature', rarity: 'legendary', desc: 'Deal 2 to all on summon', atk: 8, hp: 8, special: 'aoe_summon', aoeDmg: 2 },
    { id: 'i1', name: 'Frost Shard', school: 'ice', cost: 1, type: 'spell', rarity: 'common', desc: 'Deal 1 damage, freeze 1 turn', dmg: 1, freeze: 1 },
    { id: 'i2', name: 'Ice Elemental', school: 'ice', cost: 2, type: 'creature', rarity: 'common', desc: '', atk: 1, hp: 3 },
    { id: 'i3', name: 'Blizzard', school: 'ice', cost: 3, type: 'spell', rarity: 'common', desc: 'Freeze enemy 1 turn', freeze: 1 },
    { id: 'i4', name: 'Frost Wolf', school: 'ice', cost: 3, type: 'creature', rarity: 'common', desc: '', atk: 3, hp: 2 },
    { id: 'i5', name: 'Ice Shield', school: 'ice', cost: 2, type: 'spell', rarity: 'common', desc: 'Gain 4 armor', armor: 4 },
    { id: 'i6', name: 'Frost Giant', school: 'ice', cost: 6, type: 'creature', rarity: 'rare', desc: 'Freeze on hit', atk: 4, hp: 7, special: 'freeze_hit' },
    { id: 'i7', name: 'Absolute Zero', school: 'ice', cost: 5, type: 'spell', rarity: 'rare', desc: 'Deal 3, freeze all enemies', dmg: 3, freezeAll: true },
    { id: 'i8', name: 'Glacial Wall', school: 'ice', cost: 4, type: 'creature', rarity: 'rare', desc: 'Taunt', atk: 0, hp: 8, special: 'taunt' },
    { id: 'i9', name: 'Ice Queen', school: 'ice', cost: 8, type: 'creature', rarity: 'epic', desc: 'Freeze all on summon', atk: 5, hp: 6, special: 'freeze_summon' },
    { id: 'i10', name: 'Permafrost', school: 'ice', cost: 10, type: 'spell', rarity: 'legendary', desc: 'Freeze 2 turns, deal 5', dmg: 5, freeze: 2 },
    { id: 'n1', name: 'Seedling', school: 'nature', cost: 1, type: 'creature', rarity: 'common', desc: '', atk: 1, hp: 2 },
    { id: 'n2', name: 'Heal', school: 'nature', cost: 2, type: 'spell', rarity: 'common', desc: 'Restore 3 HP', heal: 3 },
    { id: 'n3', name: 'Forest Scout', school: 'nature', cost: 2, type: 'creature', rarity: 'common', desc: '', atk: 2, hp: 2 },
    { id: 'n4', name: 'Vine Trap', school: 'nature', cost: 3, type: 'spell', rarity: 'common', desc: 'Deal 2, heal 2', dmg: 2, heal: 2 },
    { id: 'n5', name: 'Ent', school: 'nature', cost: 4, type: 'creature', rarity: 'common', desc: 'Taunt', atk: 2, hp: 6, special: 'taunt' },
    { id: 'n6', name: 'Greater Heal', school: 'nature', cost: 4, type: 'spell', rarity: 'rare', desc: 'Restore 6 HP', heal: 6 },
    { id: 'n7', name: 'Treant', school: 'nature', cost: 5, type: 'creature', rarity: 'rare', desc: 'Heal 2 on summon', atk: 4, hp: 5, special: 'heal_summon', healAmt: 2 },
    { id: 'n8', name: 'Druid', school: 'nature', cost: 3, type: 'creature', rarity: 'rare', desc: 'Heal 1 per turn', atk: 2, hp: 3, special: 'heal_turn', healAmt: 1 },
    { id: 'n9', name: 'Ancient', school: 'nature', cost: 7, type: 'creature', rarity: 'epic', desc: 'Taunt, heal 3 on summon', atk: 5, hp: 9, special: 'taunt heal_summon', healAmt: 3 },
    { id: 'n10', name: 'World Tree', school: 'nature', cost: 9, type: 'creature', rarity: 'legendary', desc: 'Heal 4 per turn, Taunt', atk: 4, hp: 10, special: 'taunt heal_turn', healAmt: 4 },
    { id: 's1', name: 'Shadow Bolt', school: 'shadow', cost: 2, type: 'spell', rarity: 'common', desc: 'Deal 3 damage', dmg: 3 },
    { id: 's2', name: 'Imp', school: 'shadow', cost: 1, type: 'creature', rarity: 'common', desc: '', atk: 2, hp: 1 },
    { id: 's3', name: 'Weaken', school: 'shadow', cost: 2, type: 'spell', rarity: 'common', desc: '-2 ATK to enemy creature', debuff: 'atk', debuffAmt: 2 },
    { id: 's4', name: 'Dark Acolyte', school: 'shadow', cost: 3, type: 'creature', rarity: 'common', desc: '', atk: 3, hp: 3 },
    { id: 's5', name: 'Drain Life', school: 'shadow', cost: 3, type: 'spell', rarity: 'common', desc: 'Deal 2, heal 2', dmg: 2, heal: 2 },
    { id: 's6', name: 'Assassin', school: 'shadow', cost: 4, type: 'creature', rarity: 'rare', desc: 'Kill damaged', atk: 4, hp: 2, special: 'execute' },
    { id: 's7', name: 'Corrupt', school: 'shadow', cost: 4, type: 'spell', rarity: 'rare', desc: '-3 HP to creature', dmg: 3, targetCreature: true },
    { id: 's8', name: 'Vampire', school: 'shadow', cost: 5, type: 'creature', rarity: 'rare', desc: 'Heal on kill', atk: 5, hp: 4, special: 'lifesteal' },
    { id: 's9', name: 'Shadow Lord', school: 'shadow', cost: 7, type: 'creature', rarity: 'epic', desc: '+1/+1 per shadow card played', atk: 5, hp: 5, special: 'shadow_growth' },
    { id: 's10', name: 'Void Ritual', school: 'shadow', cost: 8, type: 'spell', rarity: 'legendary', desc: 'Deal 5, steal 3 HP', dmg: 5, steal: 3 }
];

const OPPONENTS = [
    { name: 'Apprentice Pyra', school: 'fire', hp: 25, deck: ['f1','f1','f2','f2','f3','f3','f4','f4','f1','f2','f3','f4','f5','f1','f2','f3','f4','f1','f2','f3'], beaten: false },
    { name: 'Frost Witch', school: 'ice', hp: 25, deck: ['i1','i1','i2','i2','i3','i3','i4','i4','i5','i1','i2','i3','i4','i5','i1','i2','i3','i4','i6','i1'], beaten: false },
    { name: 'Forest Warden', school: 'nature', hp: 28, deck: ['n1','n1','n2','n2','n3','n3','n4','n4','n5','n1','n2','n3','n4','n5','n6','n1','n2','n3','n4','n5'], beaten: false },
    { name: 'Shadow Cultist', school: 'shadow', hp: 28, deck: ['s1','s1','s2','s2','s3','s3','s4','s4','s5','s1','s2','s3','s4','s5','s6','s1','s2','s3','s4','s5'], beaten: false },
    { name: 'Elementalist', school: 'fire', hp: 32, deck: ['f3','f4','f5','f6','i3','i4','i5','i6','n3','n4','n5','n6','s1','s2','s3','s4','f3','f6','i6','n5'], beaten: false },
    { name: 'Archmage Kel', school: 'ice', hp: 35, deck: ['i5','i6','i7','i8','i9','f5','f6','f7','f8','n5','n6','n7','n8','n9','s5','s6','s7','s8','s9','i10'], beaten: false },
    { name: 'Dark Archon', school: 'shadow', hp: 38, deck: ['s5','s6','s7','s8','s9','s10','f5','f6','f7','f8','i6','i7','i8','i9','n7','n8','n9','s5','s6','s7'], beaten: false },
    { name: 'The Grandmaster', school: 'fire', hp: 40, deck: ['f7','f8','f10','i9','i10','n9','n10','s9','s10','f6','f7','f8','i8','i9','n8','n9','s8','s9','f10','s10'], beaten: false }
];

// Load state
let collection = [];
let deck = [];
let beatenOpps = [];
try {
    const s = JSON.parse(localStorage.getItem('ngn4_arcaneduel'));
    if (s) {
        collection = s.collection || [];
        deck = s.deck || [];
        beatenOpps = s.beatenOpps || [];
    }
} catch {}
function saveState() {
    localStorage.setItem('ngn4_arcaneduel', JSON.stringify({ collection, deck, beatenOpps }));
}
if (collection.length === 0) {
    collection = ['f1','f1','f2','f2','f3','f3','i1','i1','i2','i2','n1','n1','n2','n2','s1','s1','s2','s2','f4','i3'];
    deck = collection.slice(0, 20);
    saveState();
}

// Daily quests
let dailyQuests = {};
try { dailyQuests = JSON.parse(localStorage.getItem('ngn4_arcane_quests') || '{}'); } catch {}
function getDailyDate(){return new Date().toDateString();}
function initDailyQuests(){
    const today=getDailyDate();
    if(dailyQuests.date!==today){
        const quests=[
            {id:'q1',desc:'Win 3 games',target:3,type:'wins',progress:0,reward:30,done:false},
            {id:'q2',desc:'Play 10 spells',target:10,type:'spells',progress:0,reward:25,done:false},
            {id:'q3',desc:'Deal 100 damage',target:100,type:'damage',progress:0,reward:35,done:false}
        ];
        dailyQuests={date:today,quests};
        saveDailyQuests();
    }
}
function saveDailyQuests(){localStorage.setItem('ngn4_arcane_quests',JSON.stringify(dailyQuests));}
function updateQuestProgress(type,amount){
    initDailyQuests();
    dailyQuests.quests.forEach(q=>{
        if(q.done)return;
        if(q.type===type){q.progress+=amount;}
    });
    saveDailyQuests();
}

// Achievements
let achievements={};
try{achievements=JSON.parse(localStorage.getItem('ngn4_arcane_ach')||'{}');}catch{}
function saveAch(){localStorage.setItem('ngn4_arcane_ach',JSON.stringify(achievements));}
function checkAch(id,name){
    if(achievements[id])return;
    achievements[id]=Date.now();saveAch();
    showToast('ACHIEVEMENT: '+name+'!');
}

// Animations
let anims=[];
function addAnim(type,data){
    anims.push({type,data,frame:0,maxFrames:type==='damage'?30:type==='death'?20:15});
}
function updateAnims(){
    for(let i=anims.length-1;i>=0;i--){
        anims[i].frame++;
        if(anims[i].frame>=anims[i].maxFrames)anims.splice(i,1);
    }
}

// Game State
let G = {
    screen: 'menu',
    turn: 0,
    playerTurn: true,
    player: { hp: 30, maxHp: 30, mana: 0, maxMana: 0, hand: [], field: [], deck: [], frozen: 0, armor: 0 },
    enemy: { hp: 30, maxHp: 30, mana: 0, maxMana: 0, hand: [], field: [], deck: [], frozen: 0, armor: 0, ai: 0 },
    selectedOpponent: -1,
    combatLog: [],
    shadowCardsPlayed: 0,
    animQueue: [],
    processing: false,
    targeting: null, // { cardIdx, source: 'hand', card }
    spellsPlayedThisGame: 0,
    damageThisGame: 0,
    winsThisRun: 0,
    // Arena mode
    arenaMode: false,
    arenaDeck: [],
    arenaRound: 0,
    arenaWins: 0,
    arenaChoices: [],
    // Cursor for gamepad
    cursorPos: { x: 0, y: 0 }
};

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

function getCard(id) { return CARDS_DB.find(c => c.id === id); }

function showToast(msg){
    const t=document.getElementById('toast');
    if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
}

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (name === 'menu') {
        document.getElementById('menu-screen').classList.add('active');
        updateCoinsUI();
    } else if (name === 'deck') {
        document.getElementById('deck-screen').classList.add('active');
        renderDeckBuilder();
    } else if (name === 'battle') {
        // hide screens, show game
    } else if (name === 'result') {
        document.getElementById('result-screen').classList.add('active');
    } else if (name === 'select') {
        document.getElementById('select-screen').classList.add('active');
        renderOpponents();
    } else if (name === 'ad') {
        document.getElementById('ad-screen').classList.add('active');
        startAdTimer();
    } else if (name === 'arena') {
        document.getElementById('arena-screen').classList.add('active');
        renderArenaDraft();
    } else if (name === 'quests') {
        document.getElementById('quests-screen').classList.add('active');
        renderDailyQuests();
    } else if (name === 'collection') {
        document.getElementById('collection-screen').classList.add('active');
        renderCollection();
    }
}

// Card Collection Tracking
function renderCollection(){
    initDailyQuests();
    const el=document.getElementById('collection-grid');
    el.innerHTML='';
    const schools=['fire','ice','nature','shadow'];
    let html='<h3 style="color:#ff44aa;margin-bottom:10px">CARD COLLECTION</h3>';
    schools.forEach(school=>{
        const schoolCards=CARDS_DB.filter(c=>c.school===school);
        const ownedIds=new Set(collection);
        const ownedCount=schoolCards.filter(c=>ownedIds.has(c.id)).length;
        html+=`<div style="margin-bottom:12px"><div style="color:${SCHOOL_COLORS[school]};font-weight:bold;margin-bottom:4px">${school.toUpperCase()} (${ownedCount}/${schoolCards.length})</div>`;
        html+='<div style="display:flex;flex-wrap:wrap;gap:4px">';
        schoolCards.forEach(c=>{
            const owned=ownedIds.has(c.id);
            const cnt=collection.filter(id=>id===c.id).length;
            html+=`<div class="card card-${c.rarity} ${c.school} mini" style="opacity:${owned?1:0.2}" title="${c.name}${owned?' (x'+cnt+')':''}">
                <div class="card-cost">${c.cost}</div>
                <div class="card-name">${c.name}</div>
                ${c.type==='creature'?`<div class="card-stats"><span class="card-atk">${c.atk}</span>/<span class="card-hp">${c.hp}</span></div>`:`<div class="card-desc">${c.desc}</div>`}
            </div>`;
        });
        html+='</div></div>';
    });
    html+=`<div style="color:#888;margin-top:8px">Total Unique: ${new Set(collection).size}/${CARDS_DB.length}</div>`;
    if(new Set(collection).size>=30)checkAch('collector','Collector');
    el.innerHTML=html;
}

// Daily Quests Screen
function renderDailyQuests(){
    initDailyQuests();
    const el=document.getElementById('quest-list');
    let html='';
    dailyQuests.quests.forEach(q=>{
        const pct=Math.min(100,Math.floor(q.progress/q.target*100));
        html+=`<div class="quest-item" style="border:1px solid ${q.done?'#66ff66':'#333'};padding:10px;margin:6px 0;border-radius:4px">
            <div style="color:#e0e0e0">${q.desc} ${q.done?'✅':''}</div>
            <div style="margin-top:4px">
                <div style="width:200px;height:8px;background:#1a1a2e;border-radius:4px">
                    <div style="width:${pct}%;height:100%;background:${q.done?'#66ff66':'#ff44aa'};border-radius:4px"></div>
                </div>
                <div style="color:#888;font-size:10px">${Math.min(q.progress,q.target)}/${q.target} | +${q.reward} coins</div>
            </div>
        </div>`;
    });
    el.innerHTML=html;
}

// Arena/Draft Mode
function startArena(){
    initAudio();
    G.arenaMode=true;G.arenaDeck=[];G.arenaRound=0;G.arenaWins=0;
    draftArenaRound();
}

function draftArenaRound(){
    if(G.arenaRound>=10){
        // Start arena battle
        startArenaBattle();
        return;
    }
    const pool=shuffle([...CARDS_DB]).slice(0,3);
    G.arenaChoices=pool;
    G.arenaRound++;
    showScreen('arena');
    renderArenaDraft();
}

function renderArenaDraft(){
    const el=document.getElementById('arena-choices');
    el.innerHTML=`<h3 style="color:#ff44aa">ARENA DRAFT - Round ${G.arenaRound}/10</h3>`;
    G.arenaChoices.forEach((card,i)=>{
        const div=document.createElement('div');
        div.className=`card card-${card.rarity} ${card.school}`;
        div.style.width='100px';div.style.minHeight='140px';div.style.cursor='pointer';
        div.innerHTML=`
            <div class="card-cost" style="font-size:16px">${card.cost}</div>
            <div class="card-name" style="font-size:11px">${card.name}</div>
            ${card.type==='creature'?`<div class="card-stats" style="font-size:14px"><span class="card-atk">${card.atk}</span>/<span class="card-hp">${card.hp}</span></div>`:`<div class="card-desc" style="font-size:9px">${card.desc}</div>`}
            <div style="margin-top:8px;color:#ffcc00;font-size:9px">${card.rarity.toUpperCase()}</div>
        `;
        div.onclick=()=>{
            G.arenaDeck.push(card.id);
            playSound(500,0.1,'sine',0.08);
            draftArenaRound();
        };
        el.appendChild(div);
    });
}

function startArenaBattle(){
    G.selectedOpponent=-1;
    const opp={
        name:'Arena Opponent',
        school:['fire','ice','nature','shadow'][G.arenaWins%4],
        hp:25+G.arenaWins*5,
        deck:shuffle([...CARDS_DB]).slice(0,20).map(c=>c.id)
    };
    G.screen='battle';G.turn=0;G.playerTurn=true;G.shadowCardsPlayed=0;G.processing=false;
    G.spellsPlayedThisGame=0;G.damageThisGame=0;
    G.player={hp:30,maxHp:30,mana:0,maxMana:0,hand:[],field:[],deck:shuffle([...G.arenaDeck]),frozen:0,armor:0};
    G.enemy={hp:opp.hp,maxHp:opp.hp,mana:0,maxMana:0,hand:[],deck:shuffle([...opp.deck]),field:[],frozen:0,armor:0,ai:-1};
    for(let i=0;i<4;i++){drawCard(G.player);drawCard(G.enemy);}
    startTurn();renderBattle();
}

window.pickArenaCard=function(i){
    G.arenaDeck.push(G.arenaChoices[i].id);
    playSound(500,0.1,'sine',0.08);
    draftArenaRound();
};

// Deck Builder
function renderDeckBuilder() {
    const collEl = document.getElementById('collection');
    const deckEl = document.getElementById('deck-cards');
    document.getElementById('deck-count').textContent = deck.length;
    collEl.innerHTML = collection.map((id, i) => {
        const c = getCard(id);
        return `<div class="card card-${c.rarity} ${c.school} mini" onclick="addToDeck(${i})" title="${c.desc}">
            <div class="card-cost">${c.cost}</div>
            <div class="card-name">${c.name}</div>
            ${c.type === 'creature' ? `<div class="card-stats"><span class="card-atk">${c.atk}</span>/<span class="card-hp">${c.hp}</span></div>` : ''}
        </div>`;
    }).join('');
    deckEl.innerHTML = deck.map((id, i) => {
        const c = getCard(id);
        return `<div class="card card-${c.rarity} ${c.school} mini" onclick="removeFromDeck(${i})" title="${c.desc}">
            <div class="card-cost">${c.cost}</div>
            <div class="card-name">${c.name}</div>
            ${c.type === 'creature' ? `<div class="card-stats"><span class="card-atk">${c.atk}</span>/<span class="card-hp">${c.hp}</span></div>` : ''}
        </div>`;
    }).join('');
}

window.addToDeck = function(idx) {
    if (deck.length >= 20) return;
    const id = collection[idx];
    deck.push(id);
    saveState();
    renderDeckBuilder();
};
window.removeFromDeck = function(idx) {
    deck.splice(idx, 1);
    saveState();
    renderDeckBuilder();
};

function buyPack() {
    const r = getRewards();
    if (r.coins < 100) return;
    r.coins -= 100;
    saveRewards(r);
    updateCoinsUI();
    for (let i = 0; i < 3; i++) {
        const roll = Math.random();
        let pool;
        if (roll < 0.5) pool = CARDS_DB.filter(c => c.rarity === 'common');
        else if (roll < 0.8) pool = CARDS_DB.filter(c => c.rarity === 'rare');
        else if (roll < 0.95) pool = CARDS_DB.filter(c => c.rarity === 'epic');
        else pool = CARDS_DB.filter(c => c.rarity === 'legendary');
        const card = pool[Math.floor(Math.random() * pool.length)];
        collection.push(card.id);
    }
    saveState();
    playSound(500, 0.1, 'sine', 0.1);
    playSound(700, 0.1, 'sine', 0.08);
    playSound(900, 0.15, 'sine', 0.06);
    alert('Pack opened! Check your collection.');
}

function renderOpponents() {
    const el = document.getElementById('opponent-list');
    el.innerHTML = OPPONENTS.map((opp, i) => {
        const beaten = beatenOpps.includes(i);
        return `<div class="opp-card ${beaten ? 'beaten' : ''}" onclick="selectOpponent(${i})">
            <h4>${opp.name}</h4>
            <div class="opp-school">${opp.school.toUpperCase()}</div>
            <p>HP: ${opp.hp}</p>
            ${beaten ? '<p style="color:#66ff66">DEFEATED</p>' : ''}
        </div>`;
    }).join('');
}

window.selectOpponent = function(idx) {
    if (beatenOpps.includes(idx)) return;
    G.selectedOpponent = idx;
    startBattle(idx);
};

// ========================================
// BATTLE SYSTEM
// ========================================
function startBattle(oppIdx) {
    initAudio();initDailyQuests();
    const opp = OPPONENTS[oppIdx];
    G.screen = 'battle';G.turn = 0;G.playerTurn = true;G.shadowCardsPlayed = 0;G.processing = false;
    G.spellsPlayedThisGame=0;G.damageThisGame=0;G.arenaMode=false;
    G.player = { hp: 30, maxHp: 30, mana: 0, maxMana: 0, hand: [], field: [], deck: shuffle([...deck]), frozen: 0, armor: 0 };
    G.enemy = { hp: opp.hp, maxHp: opp.hp, mana: 0, maxMana: 0, hand: [], deck: shuffle([...opp.deck]), field: [], frozen: 0, armor: 0, ai: oppIdx };
    for (let i = 0; i < 4; i++) { drawCard(G.player); drawCard(G.enemy); }
    startTurn();renderBattle();
}

function drawCard(who) {
    if (who.deck.length === 0) { who.hp -= G.turn; return; }
    if (who.hand.length >= 8) return;
    who.hand.push(who.deck.pop());
}

function startTurn() {
    G.turn++;
    const who = G.playerTurn ? G.player : G.enemy;
    who.mana = Math.min(10, who.maxMana + 1);
    who.maxMana = who.mana;
    who.frozen = Math.max(0, who.frozen - 1);
    drawCard(who);
    for (const c of who.field) {
        if (c.special && c.special.includes('heal_turn')) {
            const owner = who;
            owner.hp = Math.min(owner.maxHp, owner.hp + c.healAmt);
        }
    }
    if (!G.playerTurn) { setTimeout(aiTurn, 800); }
    renderBattle();
}

function endTurn() {
    if (G.processing || !G.playerTurn) return;
    G.targeting=null;
    G.playerTurn = false;
    enemyCombatPhase();
}

function enemyCombatPhase() {
    for (const creature of G.enemy.field) {
        if (creature.attacked) continue;
        const hasTaunt = G.player.field.some(c => c.special && c.special.includes('taunt'));
        if (hasTaunt) {
            const target = G.player.field.find(c => c.special && c.special.includes('taunt'));
            if (target) attackCreature(G.enemy, creature, target, G.player);
        } else {
            attackPlayer(G.player, creature);
        }
    }
    G.enemy.field.forEach(c => c.attacked = false);
    G.player.field.forEach(c => { c.attacked = false; c.canAttack = false; });
    if (G.player.hp <= 0) { endBattle(false); return; }
    if (G.enemy.hp <= 0) { endBattle(true); return; }
    if (G.enemy.deck.length === 0 && G.enemy.hand.length === 0) { endBattle(true); return; }
    G.playerTurn = false;
    startTurn();
}

function playerCombatPhase() {
    G.player.field.forEach(c => { c.attacked = false; c.canAttack = true; });
}

// Targeted spell casting
function needsTarget(card){
    if(card.type!=='spell')return false;
    return !!(card.targetCreature || card.armor || card.debuff);
}

window.playPlayerCard = function(idx) {
    if (!G.playerTurn || G.processing) return;
    initAudio();
    const cardId=G.player.hand[idx];
    const card=getCard(cardId);
    if(!card||card.cost>G.player.mana)return;

    // Check if needs targeting
    if(needsTarget(card)){
        G.targeting={cardIdx:idx,card:card};
        renderBattle();
        showToast('Select a target!');
        return;
    }

    if(playCard(G.player,idx)){
        addAnim('playcard',{side:'player',card:card});
    }
};

window.selectTarget=function(type,fieldIdx,side){
    if(!G.targeting)return;
    const card=G.targeting.card;
    const idx=G.targeting.cardIdx;
    const targetField=side==='enemy'?G.enemy.field:G.player.field;
    const target=targetField[fieldIdx];
    if(!target)return;

    // Execute targeted spell
    if(card.cost>G.player.mana)return;
    G.player.mana-=card.cost;
    G.player.hand.splice(idx,1);
    playSound(500+card.cost*50,0.08,'sine',0.08);

    if(card.dmg){
        target.currentHp-=card.dmg;
        addAnim('damage',{x:0,y:0,amount:card.dmg,side:side});
        G.damageThisGame+=card.dmg;
        updateQuestProgress('damage',card.dmg);
    }
    if(card.heal){
        const owner=side==='player'?G.player:G.enemy;
        owner.hp=Math.min(owner.maxHp,owner.hp+card.heal);
    }
    if(card.debuff==='atk'){
        target.currentAtk=Math.max(0,target.currentAtk-card.debuffAmt);
    }

    // Cleanup dead
    if(side==='enemy')G.enemy.field=G.enemy.field.filter(c=>c.currentHp>0);
    else G.player.field=G.player.field.filter(c=>c.currentHp>0);

    G.targeting=null;
    G.spellsPlayedThisGame++;
    updateQuestProgress('spells',1);
    renderBattle();
};

window.cancelTargeting=function(){
    G.targeting=null;
    renderBattle();
};

function playCard(who, cardIdx, targetIdx) {
    const cardId = who.hand[cardIdx];
    const card = getCard(cardId);
    if (!card) return false;
    if (card.cost > who.mana) return false;
    who.mana -= card.cost;
    who.hand.splice(cardIdx, 1);
    playSound(500 + card.cost * 50, 0.08, 'sine', 0.08);

    if (card.type === 'spell') {
        castSpell(who, card);
        if(who===G.player){G.spellsPlayedThisGame++;updateQuestProgress('spells',1);}
    } else {
        const instance = { ...card, currentHp: card.hp, currentAtk: card.atk, attacked: true, canAttack: false, id: Date.now() + Math.random() };
        if (card.special) {
            if (card.special.includes('aoe_summon')) {
                const enemy = who === G.player ? G.enemy : G.player;
                enemy.hp -= card.aoeDmg;
                G.damageThisGame+=card.aoeDmg;updateQuestProgress('damage',card.aoeDmg);
                enemy.field.forEach(c => c.currentHp -= card.aoeDmg);
                enemy.field = enemy.field.filter(c => c.currentHp > 0);
            }
            if (card.special.includes('freeze_summon')) {
                const enemy = who === G.player ? G.enemy : G.player;
                enemy.field.forEach(c => c.frozen = 1);
            }
            if (card.special.includes('heal_summon')) {
                who.hp = Math.min(who.maxHp, who.hp + card.healAmt);
            }
        }
        if (who === G.player && card.school === 'shadow') {
            G.shadowCardsPlayed++;
            G.player.field.filter(c => c.special && c.special.includes('shadow_growth')).forEach(c => {
                c.currentAtk += 1; c.currentHp += 1;
            });
        }
        who.field.push(instance);
    }
    renderBattle();
    return true;
}

function castSpell(who, card) {
    const enemy = who === G.player ? G.enemy : G.player;
    if (card.dmg) {
        if (card.aoe) {
            enemy.hp -= card.dmg;G.damageThisGame+=card.dmg;updateQuestProgress('damage',card.dmg);
            enemy.field.forEach(c => c.currentHp -= card.dmg);
            enemy.field = enemy.field.filter(c => c.currentHp > 0);
        } else if (card.targetCreature) {
            if (enemy.field.length > 0) {
                const target = enemy.field[Math.floor(Math.random() * enemy.field.length)];
                target.currentHp -= card.dmg;
                G.damageThisGame+=card.dmg;updateQuestProgress('damage',card.dmg);
                addAnim('damage',{x:0,y:0,amount:card.dmg,side:'enemy'});
                if (target.currentHp <= 0) {
                    enemy.field = enemy.field.filter(c => c.currentHp > 0);
                }
            }
        } else {
            enemy.hp -= card.dmg;
            G.damageThisGame+=card.dmg;updateQuestProgress('damage',card.dmg);
            addAnim('damage',{x:0,y:0,amount:card.dmg,side:'enemy'});
        }
    }
    if (card.heal) { who.hp = Math.min(who.maxHp, who.hp + card.heal); }
    if (card.armor) { who.armor += card.armor; }
    if (card.freeze) { enemy.frozen = card.freeze; }
    if (card.freezeAll) { enemy.field.forEach(c => c.frozen = 1); }
    if (card.steal) {
        const stolen = Math.min(card.steal, enemy.hp);
        enemy.hp -= stolen; who.hp = Math.min(who.maxHp, who.hp + stolen);
    }
    if (card.debuff === 'atk' && enemy.field.length > 0) {
        const target = enemy.field.reduce((a, b) => a.currentAtk > b.currentAtk ? a : b);
        target.currentAtk = Math.max(0, target.currentAtk - card.debuffAmt);
    }
    playSound(card.dmg ? 300 : 600, 0.1, card.dmg ? 'sawtooth' : 'sine', 0.1);
}

function attackPlayer(target, creature) {
    let dmg = creature.currentAtk;
    if (target.armor > 0) { const absorbed = Math.min(target.armor, dmg); target.armor -= absorbed; dmg -= absorbed; }
    target.hp -= dmg;
    G.damageThisGame+=dmg;updateQuestProgress('damage',dmg);
    addAnim('damage',{x:0,y:0,amount:dmg,side:target===G.player?'player':'enemy'});
    playSound(200, 0.1, 'sawtooth', 0.1);
}

function attackCreature(owner, attacker, defender, targetOwner) {
    defender.currentHp -= attacker.currentAtk;
    attacker.currentHp -= defender.currentAtk;
    addAnim('damage',{x:0,y:0,amount:attacker.currentAtk,side:targetOwner===G.player?'player':'enemy'});
    G.damageThisGame+=attacker.currentAtk;updateQuestProgress('damage',attacker.currentAtk);

    if (defender.special && defender.special.includes('freeze_hit')) { attacker.frozen = 1; }
    if (attacker.special && attacker.special.includes('lifesteal') && defender.currentHp <= 0) { owner.hp = Math.min(owner.maxHp, owner.hp + 3); }
    if (attacker.special && attacker.special.includes('execute') && defender.currentHp < defender.hp) { defender.currentHp = 0; }
    playSound(250, 0.08, 'sawtooth', 0.08);

    if (defender.currentHp <= 0 && defender.special && defender.special.includes('resurrect')) {
        defender.currentHp = Math.ceil(defender.hp / 2); defender.special = '';
    }
    targetOwner.field = targetOwner.field.filter(c => c.currentHp > 0);
    owner.field = owner.field.filter(c => c.currentHp > 0);
}

window.attackWithCreature = function(fieldIdx) {
    if (!G.playerTurn || G.processing) return;
    const creature = G.player.field[fieldIdx];
    if (!creature || creature.attacked || creature.canAttack === false) return;
    const hasTaunt = G.enemy.field.some(c => c.special && c.special.includes('taunt'));
    if (hasTaunt) {
        const target = G.enemy.field.find(c => c.special && c.special.includes('taunt'));
        if (target) attackCreature(G.player, creature, target, G.enemy);
    } else if (G.enemy.field.length > 0) {
        const target = G.enemy.field[Math.floor(Math.random() * G.enemy.field.length)];
        attackCreature(G.player, creature, target, G.enemy);
    } else { attackPlayer(G.enemy, creature); }
    creature.attacked = true;
    playSound(300, 0.1, 'sawtooth', 0.08);
    if (G.enemy.hp <= 0) { endBattle(true); return; }
    if (G.player.hp <= 0) { endBattle(false); return; }
    renderBattle();
};

window.endPlayerTurn = function() { endTurn(); };

function aiTurn() {
    if (G.enemy.frozen > 0) {
        G.combatLog.unshift('Enemy is frozen!');
        G.processing = false;
        setTimeout(() => {
            G.playerTurn = true;
            G.player.field.forEach(c => { c.canAttack = true; c.attacked = false; });
            startTurn();
        }, 500);
        return;
    }
    G.processing = true;
    const e = G.enemy, p = G.player;
    const playable = [];
    e.hand.forEach((cardId, idx) => {
        const card = getCard(cardId);
        if (card && card.cost <= e.mana) playable.push({ idx, card, priority: card.cost });
    });
    playable.sort((a, b) => b.priority - a.priority);
    let played = 0;
    // Play cards from highest index first so splice doesn't invalidate lower indices
    for (let pi = playable.length - 1; pi >= 0 && played < 3; pi--) {
        const { idx, card } = playable[pi];
        if (card.type === 'creature' && e.field.length >= 4) continue;
        if (playCard(e, idx)) played++;
    }
    for (const creature of e.field) {
        if (creature.attacked || creature.frozen) continue;
        const hasTaunt = p.field.some(c => c.special && c.special.includes('taunt'));
        if (hasTaunt) {
            const target = p.field.find(c => c.special && c.special.includes('taunt'));
            if (target) attackCreature(e, creature, target, p);
        } else if (p.field.length > 0 && Math.random() < 0.6) {
            const target = p.field.reduce((a, b) => a.currentAtk > b.currentAtk ? a : b);
            attackCreature(e, creature, target, p);
        } else { attackPlayer(p, creature); }
        creature.attacked = true;
        if (p.hp <= 0) { endBattle(false); return; }
        if (e.hp <= 0) { endBattle(true); return; }
    }
    G.processing = false;
    if (e.deck.length === 0 && e.hand.length === 0) { endBattle(true); return; }
    setTimeout(() => {
        G.playerTurn = true;
        G.player.field.forEach(c => { c.canAttack = true; c.attacked = false; });
        startTurn();
    }, 500);
}

function endBattle(won) {
    G.screen = 'result';
    const coins = won ? 10 : 5;
    addCoins(coins);

    if (won) {
        updateQuestProgress('wins', 1);
        G.winsThisRun++;
    }

    if (won && G.selectedOpponent >= 0 && !beatenOpps.includes(G.selectedOpponent)) {
        beatenOpps.push(G.selectedOpponent);
        const opp = OPPONENTS[G.selectedOpponent];
        const pool = CARDS_DB.filter(c => c.school === opp.school);
        const reward = pool[Math.floor(Math.random() * pool.length)];
        collection.push(reward.id);
        addCoins(5);
    }

    if (won && G.arenaMode) {
        G.arenaWins++;
        if(G.arenaWins>=3)checkAch('draftChamp','Draft Champion');
        // Continue arena
    }

    if (beatenOpps.length >= 8) checkAch('deckMaster', 'Deck Master');

    saveState(); saveRewards(getRewards());

    document.getElementById('result-title').textContent = won ? 'VICTORY!' : 'DEFEAT';
    document.getElementById('result-title').style.color = won ? '#66ff66' : '#ff3366';
    let statsHtml=`<div>Turns: ${G.turn}</div><div>Spells Played: ${G.spellsPlayedThisGame}</div><div>Total Damage: ${G.damageThisGame}</div>`;
    if (won && G.selectedOpponent >= 0) statsHtml += `<div>Reward card from ${OPPONENTS[G.selectedOpponent].school} school!</div>`;
    if(G.arenaMode)statsHtml+=`<div>Arena Wins: ${G.arenaWins}</div>`;
    document.getElementById('result-stats').innerHTML = statsHtml;
    document.getElementById('earned-coins').textContent = `+${coins} coins`;
    showScreen('result');
}

function renderBattle() {
    if (G.screen !== 'battle') return;
    updateAnims();
    const p = G.player, e = G.enemy;

    document.getElementById('enemy-name').textContent = G.selectedOpponent >= 0 ? OPPONENTS[G.selectedOpponent].name : G.arenaMode ? 'Arena Opponent' : 'Opponent';
    document.getElementById('enemy-hp-fill').style.width = Math.max(0, (e.hp / e.maxHp) * 100) + '%';
    document.getElementById('enemy-hp-text').textContent = `${Math.max(0, e.hp)}/${e.maxHp}${e.armor > 0 ? ` (+${e.armor})` : ''}`;
    document.getElementById('enemy-mana-val').textContent = e.mana;
    document.getElementById('enemy-max-mana').textContent = e.maxMana;
    document.getElementById('player-hp-fill').style.width = Math.max(0, (p.hp / p.maxHp) * 100) + '%';
    document.getElementById('player-hp-text').textContent = `${Math.max(0, p.hp)}/${p.maxHp}${p.armor > 0 ? ` (+${p.armor})` : ''}`;
    document.getElementById('player-mana-val').textContent = p.mana;
    document.getElementById('player-max-mana').textContent = p.maxMana;
    document.getElementById('turn-num').textContent = `Turn ${G.turn}`;
    document.getElementById('phase-text').textContent = G.targeting ? 'SELECT TARGET' : G.playerTurn ? 'YOUR TURN' : 'ENEMY TURN';
    document.getElementById('phase-text').style.color = G.targeting ? '#ffaa00' : G.playerTurn ? '#ff44aa' : '#4488ff';
    document.getElementById('end-turn-btn').style.display = G.playerTurn && !G.targeting ? 'inline-block' : 'none';
    document.getElementById('cancel-target-btn').style.display = G.targeting ? 'inline-block' : 'none';

    document.getElementById('enemy-hand').innerHTML = e.hand.map(() => '<div class="card-back">?</div>').join('');

    // Enemy field with targeting support
    const enemyTargeting = G.targeting && (G.targeting.card.dmg || G.targeting.card.debuff);
    document.getElementById('enemy-field').innerHTML = e.field.map((c, i) =>
        renderCreatureCard(c, false, i, false, enemyTargeting ? 'enemy' : null)
    ).join('');

    document.getElementById('player-field').innerHTML = p.field.map((c, i) =>
        renderCreatureCard(c, true, i, G.playerTurn, G.targeting && G.targeting.card.heal ? 'player' : null)
    ).join('');

    // Player hand
    document.getElementById('player-hand').innerHTML = p.hand.map((cardId, i) => {
        const c = getCard(cardId);
        const playable = G.playerTurn && c.cost <= p.mana && !G.targeting;
        const isTargeted = G.targeting && G.targeting.cardIdx === i;
        const schoolBg = SCHOOL_COLORS[c.school] || '#333';
        return `<div class="card card-${c.rarity} ${c.school} ${playable ? 'playable' : 'not-playable'} ${isTargeted?'targeted':''}" onclick="playPlayerCard(${i})" title="${c.desc}" style="${isTargeted?'box-shadow:0 0 15px '+schoolBg+';transform:translateY(-15px);':''}">
            <div class="card-cost" style="font-size:14px;font-weight:bold">${c.cost}</div>
            <div class="card-name">${c.name}</div>
            ${c.type === 'creature' ? `<div class="card-stats"><span class="card-atk">${c.atk}</span>/<span class="card-hp">${c.hp}</span></div>` : `<div class="card-desc">${c.desc}</div>`}
            <div style="width:100%;height:3px;background:${schoolBg};margin-top:auto;border-radius:0 0 4px 4px;opacity:0.6"></div>
        </div>`;
    }).join('');

    updateCoinsUI();
}

function renderCreatureCard(c, isPlayer, idx, canAct, targetSide) {
    const canAttack = isPlayer && canAct && !c.attacked && c.canAttack !== false;
    const frozen = c.frozen > 0;
    const isTarget = !!targetSide;
    const rarityGlow = c.rarity === 'legendary' ? 'box-shadow:0 0 8px #ffcc00;' :
                       c.rarity === 'epic' ? 'box-shadow:0 0 6px #aa44ff;' :
                       c.rarity === 'rare' ? 'box-shadow:0 0 4px #4488ff;' : '';
    const schoolBg = SCHOOL_COLORS[c.school] || '#333';
    const onclick = isTarget ? `selectTarget('${targetSide}',${idx})` : (canAttack ? `attackWithCreature(${idx})` : '');
    return `<div class="card card-${c.rarity} ${c.school} mini ${canAttack ? 'playable' : ''} ${isTarget?'targetable':''}" onclick="${onclick}" style="${frozen ? 'opacity:0.6;' : ''}${rarityGlow}${isTarget?'border-color:#ff0;cursor:crosshair;':''}">
        <div class="card-cost" style="font-size:12px;font-weight:bold">${c.cost}</div>
        <div class="card-name">${c.name}</div>
        <div class="card-stats" style="font-size:12px"><span class="card-atk">${c.currentAtk}</span>/<span class="card-hp">${c.currentHp}</span></div>
        ${frozen ? '<div style="color:#4488ff;font-size:7px">FROZEN</div>' : ''}
        <div style="width:100%;height:2px;background:${schoolBg};margin-top:auto;border-radius:0 0 4px 4px;opacity:0.4"></div>
    </div>`;
}

function startAdTimer() {
    let count = 5;
    document.getElementById('ad-countdown').textContent = count;
    const interval = setInterval(() => {
        count--;
        document.getElementById('ad-countdown').textContent = count;
        if (count <= 0) { clearInterval(interval); showScreen('menu'); }
    }, 1000);
}

// Buttons
document.getElementById('play-btn').onclick = () => showScreen('select');
document.getElementById('arena-btn').onclick = () => startArena();
document.getElementById('deck-btn').onclick = () => showScreen('deck');
document.getElementById('quests-btn').onclick = () => showScreen('quests');
document.getElementById('collection-btn').onclick = () => showScreen('collection');
document.getElementById('packs-btn').onclick = () => { initAudio(); buyPack(); };
document.getElementById('deck-done').onclick = () => showScreen('menu');
document.getElementById('select-back').onclick = () => showScreen('menu');
document.getElementById('end-turn-btn').onclick = () => window.endPlayerTurn();
document.getElementById('cancel-target-btn').onclick = () => window.cancelTargeting();
document.getElementById('quests-back').onclick = () => showScreen('menu');
document.getElementById('collection-back').onclick = () => showScreen('menu');
document.getElementById('arena-back').onclick = () => showScreen('menu');
document.getElementById('result-continue').onclick = () => {
    if (G.arenaMode && G.arenaWins < 3) {
        startArenaBattle();
    } else {
        if (G.turn > 0) showScreen('ad');
        else showScreen('menu');
    }
};

// Gamepad support
let gpPrevButtons={};
function pollGamepad(){
    const gp=navigator.getGamepads?navigator.getGamepads()[0]:null;
    if(!gp||G.screen!=='battle')return;
    // D-pad navigation could move cursor
    // A = play card / select
    if(gp.buttons[0]&&gp.buttons[0].pressed&&!gpPrevButtons[0]){
        if(G.targeting){
            // Select first available target
            if(G.targeting.card.dmg&&G.enemy.field.length>0)window.selectTarget('enemy',0,'enemy');
            else if(G.targeting.card.heal&&G.player.field.length>0)window.selectTarget('player',0,'player');
        }
    }
    // B = cancel targeting
    if(gp.buttons[1]&&gp.buttons[1].pressed&&!gpPrevButtons[1]){
        if(G.targeting)window.cancelTargeting();
    }
    // X = end turn
    if(gp.buttons[2]&&gp.buttons[2].pressed&&!gpPrevButtons[2]){
        if(G.playerTurn&&!G.targeting)window.endPlayerTurn();
    }
    gpPrevButtons={};
    gp.buttons.forEach((b,i)=>gpPrevButtons[i]=b.pressed);
}
setInterval(pollGamepad,50);

initDailyQuests();
updateCoinsUI();
showScreen('menu');
