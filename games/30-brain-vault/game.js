// ═══════════════════════════════════════════════
// NGN4 GAME 30: BRAIN VAULT - Trivia/Quiz Game
// ═══════════════════════════════════════════════

(function() {
  'use strict';

  // ── NGN4 Universal Systems Init ──
  try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
  try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('30-brain-vault'); } catch(e) {}

  // ── Audio ──
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  function ensureAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
  function playTone(f, d, t = 'sine', v = 0.1) {
    ensureAudio();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.value = f;
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
  }
  function sfxCorrect() { playTone(600, 0.1, 'sine', 0.1); setTimeout(() => playTone(800, 0.15, 'sine', 0.1), 80); }
  function sfxWrong() { playTone(200, 0.3, 'sawtooth', 0.12); }
  function sfxStreak() { [800, 1000, 1200].forEach((f, i) => setTimeout(() => playTone(f, 0.1, 'sine', 0.08), i * 60)); }
  function sfxClick() { playTone(440, 0.05, 'square', 0.05); }
  function sfxComplete() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.25, 'sine', 0.1), i * 120)); }
  function sfxTick() { playTone(1000, 0.03, 'square', 0.04); }

  // ── Rewards ──
  function getRewards() { try { return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, gems: 0 }; } catch { return { coins: 0, gems: 0 }; } }
  function saveRewards(r) { localStorage.setItem('ngn4_rewards', JSON.stringify(r)); }
  function addCoins(n) { const r = getRewards(); r.coins += n; saveRewards(r); updateMenuStats(); }
  function addGems(n) { const r = getRewards(); r.gems += n; saveRewards(r); updateMenuStats(); }

  // ── Save ──
  let correctQuestions = []; // track per-question correctness for category stats
  function getSave() {
    try { return JSON.parse(localStorage.getItem('ngn4_brainvault')) || defaultSave(); }
    catch { return defaultSave(); }
  }
  function defaultSave() {
    return {
      bestScore: 0, totalQuizzes: 0, totalCorrect: 0, totalQuestions: 0,
      categoryStats: {}, bestStreak: 0, leaderboard: []
    };
  }
  function saveSave(s) { localStorage.setItem('ngn4_brainvault', JSON.stringify(s)); }

  // ── Questions Database (100+) ──
  const QUESTIONS = [
    // SCIENCE (12)
    { q: "What is the chemical symbol for gold?", o: ["Ag", "Au", "Fe", "Cu"], a: 1, c: "Science", d: "easy" },
    { q: "What planet is known as the Red Planet?", o: ["Venus", "Jupiter", "Mars", "Saturn"], a: 2, c: "Science", d: "easy" },
    { q: "What is the speed of light approximately?", o: ["300,000 km/s", "150,000 km/s", "500,000 km/s", "1,000,000 km/s"], a: 0, c: "Science", d: "easy" },
    { q: "What gas do plants absorb from the atmosphere?", o: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], a: 2, c: "Science", d: "easy" },
    { q: "What is the hardest natural substance on Earth?", o: ["Quartz", "Topaz", "Diamond", "Corundum"], a: 2, c: "Science", d: "easy" },
    { q: "How many bones are in the adult human body?", o: ["186", "206", "226", "256"], a: 1, c: "Science", d: "medium" },
    { q: "What is the atomic number of Carbon?", o: ["4", "6", "8", "12"], a: 1, c: "Science", d: "medium" },
    { q: "What is the powerhouse of the cell?", o: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Apparatus"], a: 2, c: "Science", d: "easy" },
    { q: "What element does 'O' represent on the periodic table?", o: ["Osmium", "Oganesson", "Oxygen", "Gold"], a: 2, c: "Science", d: "easy" },
    { q: "What is the largest organ in the human body?", o: ["Liver", "Brain", "Heart", "Skin"], a: 3, c: "Science", d: "medium" },
    { q: "What particle has a positive charge?", o: ["Electron", "Neutron", "Proton", "Photon"], a: 2, c: "Science", d: "medium" },
    { q: "What is the boiling point of water at sea level?", o: ["90°C", "100°C", "110°C", "120°C"], a: 1, c: "Science", d: "easy" },

    // HISTORY (12)
    { q: "In what year did World War II end?", o: ["1943", "1944", "1945", "1946"], a: 2, c: "History", d: "easy" },
    { q: "Who was the first President of the United States?", o: ["John Adams", "Thomas Jefferson", "George Washington", "Benjamin Franklin"], a: 2, c: "History", d: "easy" },
    { q: "The Great Wall of China was primarily built to protect against whom?", o: ["Mongols", "Japanese", "Romans", "Persians"], a: 0, c: "History", d: "medium" },
    { q: "What ancient civilization built the pyramids at Giza?", o: ["Roman", "Greek", "Egyptian", "Mesopotamian"], a: 2, c: "History", d: "easy" },
    { q: "In what year did the Titanic sink?", o: ["1905", "1912", "1918", "1923"], a: 1, c: "History", d: "medium" },
    { q: "Who painted the Mona Lisa?", o: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], a: 1, c: "History", d: "easy" },
    { q: "What empire was ruled by Genghis Khan?", o: ["Ottoman", "Roman", "Mongol", "Persian"], a: 2, c: "History", d: "medium" },
    { q: "The French Revolution began in which year?", o: ["1776", "1789", "1799", "1804"], a: 1, c: "History", d: "medium" },
    { q: "Who discovered America in 1492?", o: ["Vasco da Gama", "Ferdinand Magellan", "Christopher Columbus", "Amerigo Vespucci"], a: 2, c: "History", d: "easy" },
    { q: "What was the name of the ship the Pilgrims sailed on?", o: ["Santa Maria", "Mayflower", "Endeavour", "Victoria"], a: 1, c: "History", d: "medium" },
    { q: "Who was the first person to walk on the Moon?", o: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"], a: 1, c: "History", d: "easy" },
    { q: "The Berlin Wall fell in which year?", o: ["1987", "1988", "1989", "1990"], a: 2, c: "History", d: "medium" },

    // GAMING (12)
    { q: "What year was the original PlayStation released?", o: ["1993", "1994", "1995", "1996"], a: 1, c: "Gaming", d: "medium" },
    { q: "Who created Minecraft?", o: ["Gabe Newell", "Markus Persson", "Shigeru Miyamoto", "Hideo Kojima"], a: 1, c: "Gaming", d: "easy" },
    { q: "What is the best-selling video game of all time?", o: ["Tetris", "Minecraft", "GTA V", "Wii Sports"], a: 1, c: "Gaming", d: "medium" },
    { q: "In what year was the first Nintendo Entertainment System released?", o: ["1983", "1985", "1987", "1989"], a: 1, c: "Gaming", d: "hard" },
    { q: "What company developed the Legend of Zelda series?", o: ["Square Enix", "Capcom", "Nintendo", "Sega"], a: 2, c: "Gaming", d: "easy" },
    { q: "What is the name of Mario's brother?", o: ["Wario", "Luigi", "Toad", "Yoshi"], a: 1, c: "Gaming", d: "easy" },
    { q: "Which game franchise features a yellow electric mouse?", o: ["Digimon", "Yo-kai Watch", "Pokémon", "Monster Hunter"], a: 2, c: "Gaming", d: "easy" },
    { q: "What game engine powers Fortnite?", o: ["Unity", "Unreal Engine", "Source", "CryEngine"], a: 1, c: "Gaming", d: "medium" },
    { q: "Who is the main antagonist in the Sonic series?", o: ["Metal Sonic", "Shadow", "Dr. Eggman", "Chaos"], a: 2, c: "Gaming", d: "easy" },
    { q: "What is the highest possible combo in Street Fighter II?", o: ["12", "15", "18", "21"], a: 1, c: "Gaming", d: "hard" },
    { q: "Which studio developed Dark Souls?", o: ["Bandai Namco", "FromSoftware", "Capcom", "Square Enix"], a: 1, c: "Gaming", d: "medium" },
    { q: "What was the first commercially successful arcade game?", o: ["Space Invaders", "Pac-Man", "Pong", "Asteroids"], a: 2, c: "Gaming", d: "medium" },

    // SPACE (11)
    { q: "How many planets are in our solar system?", o: ["7", "8", "9", "10"], a: 1, c: "Space", d: "easy" },
    { q: "What is the largest planet in our solar system?", o: ["Saturn", "Neptune", "Jupiter", "Uranus"], a: 2, c: "Space", d: "easy" },
    { q: "What is the closest star to Earth?", o: ["Proxima Centauri", "Sirius", "The Sun", "Alpha Centauri"], a: 2, c: "Space", d: "easy" },
    { q: "What galaxy do we live in?", o: ["Andromeda", "Milky Way", "Triangulum", "Sombrero"], a: 1, c: "Space", d: "easy" },
    { q: "What is the hottest planet in our solar system?", o: ["Mercury", "Venus", "Mars", "Jupiter"], a: 1, c: "Space", d: "medium" },
    { q: "How many moons does Mars have?", o: ["0", "1", "2", "3"], a: 2, c: "Space", d: "medium" },
    { q: "What is the Great Red Spot on Jupiter?", o: ["A volcano", "A storm", "A crater", "An ocean"], a: 1, c: "Space", d: "medium" },
    { q: "What force keeps planets in orbit around the Sun?", o: ["Magnetism", "Friction", "Gravity", "Inertia"], a: 2, c: "Space", d: "easy" },
    { q: "What is a light-year a measurement of?", o: ["Time", "Distance", "Speed", "Brightness"], a: 1, c: "Space", d: "medium" },
    { q: "Which planet has the most moons?", o: ["Jupiter", "Saturn", "Uranus", "Neptune"], a: 1, c: "Space", d: "hard" },
    { q: "What is the name of the largest known star?", o: ["Betelgeuse", "UY Scuti", "VY Canis Majoris", "Rigel"], a: 1, c: "Space", d: "hard" },

    // MUSIC (10)
    { q: "How many strings does a standard guitar have?", o: ["4", "5", "6", "7"], a: 2, c: "Music", d: "easy" },
    { q: "Who composed the Four Seasons?", o: ["Mozart", "Beethoven", "Vivaldi", "Bach"], a: 2, c: "Music", d: "medium" },
    { q: "What music genre originated in New Orleans?", o: ["Blues", "Jazz", "Country", "Rock"], a: 1, c: "Music", d: "medium" },
    { q: "How many keys are on a standard piano?", o: ["76", "82", "88", "92"], a: 2, c: "Music", d: "medium" },
    { q: "What band performed 'Bohemian Rhapsody'?", o: ["The Beatles", "Led Zeppelin", "Queen", "Pink Floyd"], a: 2, c: "Music", d: "easy" },
    { q: "What instrument does a drummer play?", o: ["Guitar", "Bass", "Drums", "Keyboard"], a: 2, c: "Music", d: "easy" },
    { q: "Who is known as the 'King of Pop'?", o: ["Prince", "Elvis Presley", "Michael Jackson", "Freddie Mercury"], a: 2, c: "Music", d: "easy" },
    { q: "What is the highest female singing voice?", o: ["Alto", "Mezzo-soprano", "Soprano", "Contralto"], a: 2, c: "Music", d: "hard" },
    { q: "How many notes are in a chromatic scale?", o: ["7", "10", "12", "14"], a: 2, c: "Music", d: "hard" },
    { q: "Which country is the origin of the didgeridoo?", o: ["New Zealand", "Africa", "Australia", "India"], a: 2, c: "Music", d: "medium" },

    // MOVIES (11)
    { q: "Who directed 'Jurassic Park'?", o: ["James Cameron", "Steven Spielberg", "George Lucas", "Ridley Scott"], a: 1, c: "Movies", d: "easy" },
    { q: "What is the highest-grossing film of all time (unadjusted)?", o: ["Avengers: Endgame", "Avatar", "Titanic", "Star Wars: TFA"], a: 1, c: "Movies", d: "medium" },
    { q: "Which film won the first Academy Award for Best Picture?", o: ["Sunrise", "Wings", "The Jazz Singer", "Metropolis"], a: 1, c: "Movies", d: "hard" },
    { q: "Who played Jack in Titanic?", o: ["Brad Pitt", "Leonardo DiCaprio", "Tom Cruise", "Johnny Depp"], a: 1, c: "Movies", d: "easy" },
    { q: "What is the name of Batman's butler?", o: ["Jarvis", "Alfred", "James", "Bernard"], a: 1, c: "Movies", d: "easy" },
    { q: "Which studio created Toy Story?", o: ["DreamWorks", "Pixar", "Disney", "Illumination"], a: 1, c: "Movies", d: "easy" },
    { q: "In The Matrix, what color pill does Neo take?", o: ["Blue", "Red", "Green", "White"], a: 1, c: "Movies", d: "easy" },
    { q: "Who played the Joker in 'The Dark Knight'?", o: ["Jack Nicholson", "Jared Leto", "Heath Ledger", "Joaquin Phoenix"], a: 2, c: "Movies", d: "easy" },
    { q: "What year was the first Star Wars film released?", o: ["1975", "1976", "1977", "1978"], a: 2, c: "Movies", d: "medium" },
    { q: "What is the name of the fictional country in Black Panther?", o: ["Zamunda", "Wakanda", "Genovia", "Latveria"], a: 1, c: "Movies", d: "medium" },
    { q: "Who directed 'Inception' and 'Interstellar'?", o: ["Ridley Scott", "Denis Villeneuve", "Christopher Nolan", "James Cameron"], a: 2, c: "Movies", d: "easy" },

    // TECH (11)
    { q: "What does 'CPU' stand for?", o: ["Central Process Unit", "Central Processing Unit", "Computer Personal Unit", "Core Processing Utility"], a: 1, c: "Tech", d: "easy" },
    { q: "Who founded Microsoft?", o: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Jeff Bezos"], a: 1, c: "Tech", d: "easy" },
    { q: "What does HTML stand for?", o: ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyper Transfer Markup Language"], a: 0, c: "Tech", d: "easy" },
    { q: "What year was the iPhone first released?", o: ["2005", "2006", "2007", "2008"], a: 2, c: "Tech", d: "medium" },
    { q: "What programming language is known as the 'language of the web'?", o: ["Python", "Java", "JavaScript", "C++"], a: 2, c: "Tech", d: "medium" },
    { q: "What does 'AI' stand for?", o: ["Automated Intelligence", "Artificial Intelligence", "Advanced Integration", "Algorithmic Interface"], a: 1, c: "Tech", d: "easy" },
    { q: "What company created the Android operating system?", o: ["Apple", "Google", "Microsoft", "Samsung"], a: 1, c: "Tech", d: "easy" },
    { q: "How many bits are in a byte?", o: ["4", "6", "8", "16"], a: 2, c: "Tech", d: "easy" },
    { q: "What does 'URL' stand for?", o: ["Universal Resource Locator", "Uniform Resource Locator", "Universal Reference Link", "Uniform Reference Locator"], a: 1, c: "Tech", d: "medium" },
    { q: "What was the first widely-used web browser?", o: ["Internet Explorer", "Netscape Navigator", "Mosaic", "Firefox"], a: 2, c: "Tech", d: "hard" },
    { q: "What does 'SSD' stand for in storage?", o: ["Solid State Drive", "Super Speed Disk", "Secure Storage Device", "System Storage Drive"], a: 0, c: "Tech", d: "medium" },

    // NATURE (10)
    { q: "What is the largest mammal on Earth?", o: ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"], a: 1, c: "Nature", d: "easy" },
    { q: "What is the fastest land animal?", o: ["Lion", "Cheetah", "Gazelle", "Horse"], a: 1, c: "Nature", d: "easy" },
    { q: "How many legs does a spider have?", o: ["6", "8", "10", "12"], a: 1, c: "Nature", d: "easy" },
    { q: "What is the tallest type of tree?", o: ["Redwood", "Sequoia", "Coast Redwood", "Douglas Fir"], a: 2, c: "Nature", d: "medium" },
    { q: "What is the largest ocean on Earth?", o: ["Atlantic", "Indian", "Arctic", "Pacific"], a: 3, c: "Nature", d: "easy" },
    { q: "What animal is known as the 'King of the Jungle'?", o: ["Tiger", "Lion", "Elephant", "Gorilla"], a: 1, c: "Nature", d: "easy" },
    { q: "What is the process by which plants make food?", o: ["Respiration", "Fermentation", "Photosynthesis", "Osmosis"], a: 2, c: "Nature", d: "easy" },
    { q: "What is the smallest bone in the human body?", o: ["Stapes", "Malleus", "Incus", "Phalange"], a: 0, c: "Nature", d: "hard" },
    { q: "What type of animal is a dolphin?", o: ["Fish", "Mammal", "Reptile", "Amphibian"], a: 1, c: "Nature", d: "easy" },
    { q: "What is the hardest wood in the world?", o: ["Ebony", "Lignum Vitae", "Ironwood", "Snakewood"], a: 1, c: "Nature", d: "hard" },

    // GEOGRAPHY (10)
    { q: "What is the largest continent by area?", o: ["Africa", "North America", "Asia", "Europe"], a: 2, c: "Geography", d: "easy" },
    { q: "What is the longest river in the world?", o: ["Amazon", "Nile", "Mississippi", "Yangtze"], a: 1, c: "Geography", d: "medium" },
    { q: "What is the capital of Australia?", o: ["Sydney", "Melbourne", "Canberra", "Brisbane"], a: 2, c: "Geography", d: "medium" },
    { q: "Which country has the most population?", o: ["USA", "India", "China", "Indonesia"], a: 1, c: "Geography", d: "easy" },
    { q: "What is the smallest country in the world?", o: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], a: 1, c: "Geography", d: "medium" },
    { q: "On which continent is the Sahara Desert?", o: ["Asia", "South America", "Africa", "Australia"], a: 2, c: "Geography", d: "easy" },
    { q: "What is the highest mountain in the world?", o: ["K2", "Kangchenjunga", "Mount Everest", "Lhotse"], a: 2, c: "Geography", d: "easy" },
    { q: "How many US states are there?", o: ["48", "49", "50", "51"], a: 2, c: "Geography", d: "easy" },
    { q: "What ocean is between Europe and America?", o: ["Pacific", "Indian", "Atlantic", "Arctic"], a: 2, c: "Geography", d: "easy" },
    { q: "What country has the shape of a boot?", o: ["France", "Spain", "Italy", "Greece"], a: 2, c: "Geography", d: "easy" },

    // POP CULTURE (11)
    { q: "What is the name of Harry Potter's owl?", o: ["Errol", "Pigwidgeon", "Hedwig", "Scabbers"], a: 2, c: "Pop Culture", d: "easy" },
    { q: "Which superhero is also known as 'The Man of Steel'?", o: ["Batman", "Superman", "Wonder Woman", "Flash"], a: 1, c: "Pop Culture", d: "easy" },
    { q: "What is the name of the fictional land in Game of Thrones?", o: ["Narnia", "Westeros", "Middle-earth", "Hogwarts"], a: 1, c: "Pop Culture", d: "easy" },
    { q: "Who wrote '1984'?", o: ["Aldous Huxley", "Ray Bradbury", "George Orwell", "H.G. Wells"], a: 2, c: "Pop Culture", d: "medium" },
    { q: "What is the name of Batman's secret identity?", o: ["Clark Kent", "Bruce Wayne", "Peter Parker", "Tony Stark"], a: 1, c: "Pop Culture", d: "easy" },
    { q: "In 'The Lord of the Rings', what is Frodo's last name?", o: ["Gamgee", "Took", "Baggins", "Brandybuck"], a: 2, c: "Pop Culture", d: "easy" },
    { q: "What TV show features a group of friends in a coffee shop?", o: ["Seinfeld", "How I Met Your Mother", "Friends", "The Office"], a: 2, c: "Pop Culture", d: "easy" },
    { q: "Who is the author of the 'Hunger Games' series?", o: ["J.K. Rowling", "Suzanne Collins", "Veronica Roth", "Stephenie Meyer"], a: 1, c: "Pop Culture", d: "medium" },
    { q: "What is Superman's weakness?", o: ["Magic", "Kryptonite", "Fire", "Water"], a: 1, c: "Pop Culture", d: "easy" },
    { q: "In what year was the first iPhone released?", o: ["2006", "2007", "2008", "2009"], a: 1, c: "Pop Culture", d: "medium" },
    { q: "What is the name of Sherlock Holmes' sidekick?", o: ["Mycroft", "Lestrade", "Watson", "Moriarty"], a: 2, c: "Pop Culture", d: "easy" },
  ];

  const CATEGORIES = [
    { id: 'Science', name: 'Science', icon: '🔬', desc: 'Physics, Chemistry, Biology' },
    { id: 'History', name: 'History', icon: '📜', desc: 'World events and civilizations' },
    { id: 'Gaming', name: 'Gaming', icon: '🎮', desc: 'Video games and consoles' },
    { id: 'Space', name: 'Space', icon: '🚀', desc: 'Astronomy and the cosmos' },
    { id: 'Music', name: 'Music', icon: '🎵', desc: 'Instruments, genres, artists' },
    { id: 'Movies', name: 'Movies', icon: '🎬', desc: 'Film trivia and directors' },
    { id: 'Tech', name: 'Tech', icon: '💻', desc: 'Computers and technology' },
    { id: 'Nature', name: 'Nature', icon: '🌿', desc: 'Animals, plants, Earth' },
    { id: 'Geography', name: 'Geography', icon: '🌍', desc: 'Countries and landmarks' },
    { id: 'Pop Culture', name: 'Pop Culture', icon: '🎭', desc: 'Books, TV, superheroes' },
  ];

  const DIFFICULTY_TIME = { easy: 15, medium: 10, hard: 7 };
  const DIFFICULTY_MULT = { easy: 1, medium: 1.5, hard: 2 };
  const ROUNDS = 15;

  // ── Game State ──
  let currentDifficulty = 'medium';
  let selectedCategory = null;
  let questions = [];
  let currentQ = 0;
  let score = 0;
  let streak = 0;
  let maxStreak = 0;
  let correctCount = 0;
  let lifelines = { '5050': true, skip: true, audience: true };
  let timerInterval = null;
  let timeLeft = 0;
  let isAnswered = false;
  let afterAdAction = null;
  let usedLifelines = { '5050': false, skip: false, audience: false };

  // ── Screen Management ──
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function updateMenuStats() {
    const r = getRewards();
    const s = getSave();
    const mc = document.getElementById('menu-coins');
    const mg = document.getElementById('menu-gems');
    const mb = document.getElementById('menu-best');
    if (mc) mc.textContent = r.coins;
    if (mg) mg.textContent = r.gems;
    if (mb) mb.textContent = s.bestScore;
  }

  window.showMenu = function() {
    clearInterval(timerInterval);
    updateMenuStats();
    showScreen('menu-screen');
  };

  // ── Start Quiz Flow ──
  window.startQuiz = function() {
    sfxClick();
    selectedCategory = null;
    showScreen('difficulty-screen');
  };

  window.setDifficulty = function(diff) {
    sfxClick();
    currentDifficulty = diff;
    prepareQuiz();
  };

  window.selectCategory = function() {
    sfxClick();
    const s = getSave();
    const list = document.getElementById('category-list');
    list.innerHTML = '';

    // All categories button
    const allItem = document.createElement('div');
    allItem.className = 'cat-item';
    allItem.innerHTML = `<span class="cat-icon">🎯</span><div class="cat-info"><div class="cat-name">ALL CATEGORIES</div><div class="cat-desc">Mix of all 10 categories</div></div>`;
    allItem.onclick = () => { sfxClick(); selectedCategory = null; showScreen('difficulty-screen'); };
    list.appendChild(allItem);

    CATEGORIES.forEach(cat => {
      const stats = s.categoryStats[cat.id] || { correct: 0, total: 0, best: 0 };
      const mastery = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      const item = document.createElement('div');
      item.className = 'cat-item';
      item.innerHTML = `
        <span class="cat-icon">${cat.icon}</span>
        <div class="cat-info">
          <div class="cat-name">${cat.name}</div>
          <div class="cat-desc">${cat.desc}</div>
        </div>
        <span class="cat-mastery">${mastery}% mastery</span>
      `;
      item.onclick = () => { sfxClick(); selectedCategory = cat.id; showScreen('difficulty-screen'); };
      list.appendChild(item);
    });

    showScreen('category-screen');
  };

  function prepareQuiz() {
    // Filter and select questions
    let pool = selectedCategory
      ? QUESTIONS.filter(q => q.c === selectedCategory)
      : [...QUESTIONS];

    // Shuffle and pick
    pool = shuffleArray(pool);
    questions = pool.slice(0, ROUNDS);

    // Pad with random questions if not enough
    if (questions.length < ROUNDS) {
      const extras = shuffleArray(QUESTIONS.filter(q => !questions.includes(q)));
      questions = questions.concat(extras).slice(0, ROUNDS);
    }

    currentQ = 0;
    score = 0;
    streak = 0;
    maxStreak = 0;
    correctCount = 0;
    correctQuestions = [];
    isAnswered = false;
    lifelines = { '5050': true, skip: true, audience: true };
    usedLifelines = { '5050': false, skip: false, audience: false };

    showScreen('quiz-screen');
    showQuestion();
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Show Question ──
  function showQuestion() {
    if (currentQ >= questions.length) {
      showResults();
      return;
    }

    isAnswered = false;
    const q = questions[currentQ];

    document.getElementById('qh-progress').textContent = `${currentQ + 1}/${questions.length}`;
    document.getElementById('qh-streak').textContent = streak > 1 ? `🔥 Streak: x${streak}` : `Streak: ${streak}`;
    document.getElementById('qh-score').textContent = `${score}pts`;
    document.getElementById('q-category').textContent = q.c;
    document.getElementById('q-difficulty').textContent = q.d.toUpperCase();
    document.getElementById('q-text').textContent = q.q;
    document.getElementById('q-feedback').textContent = '';

    // Options
    const optContainer = document.getElementById('q-options');
    optContainer.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    q.o.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.id = `opt-${idx}`;
      btn.innerHTML = `<span class="opt-letter">${letters[idx]}</span><span>${opt}</span>`;
      btn.onclick = () => selectAnswer(idx);
      optContainer.appendChild(btn);
    });

    // Update lifelines
    updateLifelines();

    // Timer
    startTimer();
  }

  function startTimer() {
    clearInterval(timerInterval);
    timeLeft = DIFFICULTY_TIME[currentDifficulty];
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      timeLeft -= 0.1;
      updateTimerDisplay();
      if (timeLeft <= 5 && timeLeft > 3 && Math.abs(timeLeft - Math.round(timeLeft)) < 0.06) sfxTick();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timeUp();
      }
    }, 100);
  }

  function updateTimerDisplay() {
    const el = document.getElementById('qh-timer');
    el.textContent = `⏱ ${Math.ceil(timeLeft)}s`;
    el.className = '';
    if (timeLeft <= 3) el.className = 'danger';
    else if (timeLeft <= 5) el.className = 'warning';
  }

  function timeUp() {
    if (isAnswered) return;
    isAnswered = true;
    sfxWrong();
    streak = 0;

    const q = questions[currentQ];
    // Show correct answer
    document.getElementById(`opt-${q.a}`).classList.add('correct');
    document.getElementById('q-feedback').innerHTML = `<span style="color:var(--danger)">⏱ Time's up!</span><br><span style="color:var(--success)">Answer: ${q.o[q.a]}</span>`;

    disableOptions();

    setTimeout(() => {
      currentQ++;
      showQuestion();
    }, 2000);
  }

  // ── Select Answer ──
  function selectAnswer(idx) {
    if (isAnswered) return;
    isAnswered = true;
    clearInterval(timerInterval);

    const q = questions[currentQ];
    const isCorrect = idx === q.a;

    disableOptions();

    if (isCorrect) {
      sfxCorrect();
      document.getElementById(`opt-${idx}`).classList.add('correct');
      correctCount++;
      correctQuestions.push(currentQ);
      streak++;
      if (streak > maxStreak) maxStreak = streak;

      // Score based on speed and difficulty
      const timeBonus = Math.ceil(timeLeft);
      const diffMult = DIFFICULTY_MULT[q.d];
      const streakMult = 1 + Math.max(0, streak - 1) * 0.1;
      const qScore = Math.floor((10 + timeBonus) * diffMult * streakMult);
      score += qScore;

      let feedback = `<span style="color:var(--success)">✓ Correct! +${qScore}pts</span>`;
      if (streak >= 3) {
        feedback += `<br><span style="color:#ff00aa">🔥 Streak x${streak}!</span>`;
        sfxStreak();
      }
      document.getElementById('q-feedback').innerHTML = feedback;
    } else {
      sfxWrong();
      document.getElementById(`opt-${idx}`).classList.add('wrong');
      document.getElementById(`opt-${q.a}`).classList.add('correct');
      streak = 0;
      document.getElementById('q-feedback').innerHTML = `<span style="color:var(--danger)">✗ Wrong!</span><br><span style="color:var(--success)">Answer: ${q.o[q.a]}</span>`;
    }

    setTimeout(() => {
      currentQ++;
      showQuestion();
    }, 2000);
  }

  function disableOptions() {
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  }

  // ── Lifelines ──
  function updateLifelines() {
    const r = getRewards();
    ['5050', 'skip', 'audience'].forEach(ll => {
      const btn = document.getElementById(`ll-${ll}`);
      if (!btn) return;
      btn.disabled = !lifelines[ll];
      btn.innerHTML = ll === '5050' ? '50/50' : ll === 'skip' ? 'SKIP' : '👥';
      if (!lifelines[ll] && usedLifelines[ll]) {
        btn.innerHTML += ' <small>(✓)</small>';
      }
    });
  }

  window.useLifeline = function(type) {
    if (!lifelines[type]) return;
    sfxClick();

    const q = questions[currentQ];

    switch (type) {
      case '5050':
        lifelines[type] = false;
        usedLifelines[type] = true;
        // Remove 2 wrong answers
        const wrongIdxs = [];
        q.o.forEach((_, i) => { if (i !== q.a) wrongIdxs.push(i); });
        const toRemove = shuffleArray(wrongIdxs).slice(0, 2);
        toRemove.forEach(i => {
          const el = document.getElementById(`opt-${i}`);
          if (el) el.classList.add('eliminated');
        });
        updateLifelines();
        break;

      case 'skip':
        lifelines[type] = false;
        usedLifelines[type] = true;
        clearInterval(timerInterval);
        currentQ++;
        showQuestion();
        break;

      case 'audience':
        lifelines[type] = false;
        usedLifelines[type] = true;
        // Show hint with audience opinion (biased toward correct)
        showToast(`Audience suggests: ${q.o[q.a]}`);
        document.getElementById(`opt-${q.a}`).style.borderColor = '#ffd700';
        setTimeout(() => {
          const el = document.getElementById(`opt-${q.a}`);
          if (el) el.style.borderColor = '';
        }, 3000);
        updateLifelines();
        break;
    }
  };

  // ── Results ──
  function showResults() {
    clearInterval(timerInterval);
    sfxComplete();

    const percentage = Math.round((correctCount / questions.length) * 100);
    let grade, gradeIcon;
    if (percentage >= 90) { grade = 'GENIUS'; gradeIcon = '🧠'; }
    else if (percentage >= 75) { grade = 'EXPERT'; gradeIcon = '🏆'; }
    else if (percentage >= 60) { grade = 'SKILLED'; gradeIcon = '⭐'; }
    else if (percentage >= 40) { grade = 'LEARNER'; gradeIcon = '📚'; }
    else { grade = 'NOVICE'; gradeIcon = '🌱'; }

    // Calculate rewards
    let baseReward = correctCount * 10;
    let streakReward = Math.floor(maxStreak * 5);
    let completionReward = 50;
    let totalReward = baseReward + streakReward + completionReward;
    addCoins(totalReward);

    // Category mastery
    const s = getSave();
    s.totalQuizzes++;
    s.totalCorrect += correctCount;
    s.totalQuestions += questions.length;
    if (maxStreak > s.bestStreak) s.bestStreak = maxStreak;
    if (score > s.bestScore) s.bestScore = score;

    // Update category stats
    questions.forEach((q, idx) => {
      if (!s.categoryStats[q.c]) s.categoryStats[q.c] = { correct: 0, total: 0, best: 0 };
      s.categoryStats[q.c].total++;
      if (correctQuestions.includes(idx)) s.categoryStats[q.c].correct++;
    });

    // Leaderboard
    s.leaderboard.push({
      score, correct: correctCount, total: questions.length,
      difficulty: currentDifficulty, category: selectedCategory || 'All',
      streak: maxStreak, date: Date.now()
    });
    s.leaderboard.sort((a, b) => b.score - a.score);
    s.leaderboard = s.leaderboard.slice(0, 20);

    saveSave(s);

    // Show results screen
    document.getElementById('results-title').textContent = gradeIcon + ' ' + grade + '!';
    document.getElementById('results-grade').textContent = `${correctCount}/${questions.length} (${percentage}%)`;
    document.getElementById('results-stats').innerHTML = `
      <div>Score: ${score}pts</div>
      <div>Best: ${s.bestScore}pts</div>
      <div>Max Streak: ${maxStreak}</div>
      <div>Difficulty: ${currentDifficulty.toUpperCase()}</div>
      <div>Category: ${selectedCategory || 'All'}</div>
      <div>Time Bonus Avg: ${Math.round(score / Math.max(1, correctCount))}pts</div>
    `;
    document.getElementById('results-rewards').innerHTML = `
      <div class="reward-line">Correct Answers: +${baseReward} 🪙</div>
      <div class="reward-line">Streak Bonus: +${streakReward} 🪙</div>
      <div class="reward-line">Quiz Complete: +${completionReward} 🪙</div>
      <div class="reward-line" style="color:var(--accent);font-size:1.1rem;margin-top:6px">TOTAL: +${totalReward} 🪙</div>
    `;

    // Mastery info
    let masteryHTML = '';
    if (selectedCategory) {
      const catStats = s.categoryStats[selectedCategory] || { correct: 0, total: 0, best: 0 };
      const mastery = catStats.total > 0 ? Math.round((catStats.correct / catStats.total) * 100) : 0;
      masteryHTML = `${selectedCategory} Mastery: ${mastery}%`;
      if (mastery >= 80) {
        masteryHTML += ' ⭐ MASTERY REWARD +100 🪙';
        addCoins(100);
      }
    }
    document.getElementById('results-mastery').textContent = masteryHTML;

    // NGN4 Achievements
    try {
      if (typeof NGN4Achievements !== 'undefined') {
        if (percentage >= 100) NGN4Achievements.unlock('perfect_quiz', 'Perfect Quiz');
        if (percentage >= 90) NGN4Achievements.unlock('genius_score', 'Genius Score');
        if (maxStreak >= 10) NGN4Achievements.unlock('streak_10', 'Streak x10');
        else if (maxStreak >= 5) NGN4Achievements.unlock('streak_5', 'Streak x5');
        if (s.totalQuizzes >= 1) NGN4Achievements.unlock('first_quiz', 'First Quiz');
        if (s.totalQuizzes >= 10) NGN4Achievements.unlock('quiz_10', 'Quiz Master');
        if (score >= 1000) NGN4Achievements.unlock('score_1000', 'Score 1000+');
      }
    } catch(e) {}

    // Show ad between quizzes (every 3rd quiz)
    if (s.totalQuizzes % 3 === 0) {
      afterAdAction = () => showScreen('results-screen');
      showAd();
    } else {
      showScreen('results-screen');
    }
  }

  // ── Leaderboard ──
  window.showLeaderboard = function() {
    sfxClick();
    const s = getSave();
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    if (s.leaderboard.length === 0) {
      list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px">No quiz results yet. Play a quiz first!</p>';
    } else {
      s.leaderboard.slice(0, 10).forEach((entry, i) => {
        const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
        const item = document.createElement('div');
        item.className = 'lb-entry';
        const diffEmoji = entry.difficulty === 'easy' ? '😊' : entry.difficulty === 'medium' ? '🤔' : '💀';
        item.innerHTML = `
          <span class="lb-rank ${rankClass}">#${i + 1}</span>
          <div class="lb-info">
            <div class="lb-name">${entry.category} ${diffEmoji}</div>
            <div class="lb-details">${entry.correct}/${entry.total} | Streak: ${entry.streak}</div>
          </div>
          <span class="lb-score">${entry.score}pts</span>
        `;
        list.appendChild(item);
      });
    }
    showScreen('leaderboard-screen');
  };

  // ── Ad System ──
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
      if (elapsed >= 5) { clearInterval(interval); closeBtn.style.display = 'inline-block'; timerEl.textContent = '✓'; }
    }, 100);
  }

  window.closeAd = function() {
    sfxClick();
    if (afterAdAction) { afterAdAction(); afterAdAction = null; }
    else showScreen('menu-screen');
  };

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ── Init ──
  function init() {
    updateMenuStats();
    showScreen('menu-screen');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
