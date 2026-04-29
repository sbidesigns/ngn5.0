// ═══════════════════════════════════════════
// NGN4 — GAME 31: NGN CHESS
// Full Chess with AI Opponent
// ═══════════════════════════════════════════
(function() {
'use strict';

// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('ngn-chess'); } catch(e) {}


const PIECES = {
  K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',
  k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'
};
const PIECE_VALUES = { p:1,n:3,b:3,r:5,q:9,k:0 };
const FILES = 'abcdefgh';

let canvas, ctx;
let board = [];
let selected = null;
let legalMoves = [];
let turn = 'w';
let moveList = [];
let undoStack = [];
let undoLimit = 3;
let undoUsed = 0;
let capturedW = [], capturedB = [];
let gameOver = false;
let difficulty = 'beginner';
let timeControl = 300;
let timers = { w: 300, b: 300 };
let timerInterval = null;
let timed = false;
let theme = 'neon';
let totalCaptures = 0;
let audioCtx;
let inCheck = false;
let enPassantTarget = null;
let castlingRights = { wK:true, wQ:true, bK:true, bQ:true };
let promoCallback = null;
let moveCount = 0;
let promotionPending = false;
let promoSquare = null;

const THEMES = {
  neon:   { light:'#1a1a2e', dark:'#0f0f1a', accent:'#0ff', selected:'rgba(0,255,255,0.3)', legal:'rgba(0,255,255,0.15)', lastMove:'rgba(255,0,255,0.15)' },
  classic:{ light:'#f0d9b5', dark:'#b58863', accent:'#333', selected:'rgba(255,255,0,0.4)', legal:'rgba(0,255,0,0.2)', lastMove:'rgba(255,255,0,0.2)' },
  ocean:  { light:'#2a4858', dark:'#1a3040', accent:'#0af', selected:'rgba(0,170,255,0.3)', legal:'rgba(0,255,200,0.15)', lastMove:'rgba(0,100,255,0.15)' }
};

// ── Audio ──
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playSound(freq, dur, type='square') {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}
function sndMove() { playSound(600, 0.1); }
function sndCapture() { playSound(300, 0.15, 'sawtooth'); }
function sndCheck() { playSound(800, 0.2, 'sawtooth'); setTimeout(()=>playSound(600,0.2,'sawtooth'), 100); }
function sndGameOver() { playSound(200, 0.5, 'sawtooth'); }

// ── Rewards ──
function getRewards() { try { return JSON.parse(localStorage.getItem('ngn4_rewards')) || { coins: 0, gems: 0 }; } catch { return { coins: 0, gems: 0 }; } }
function getCoins() { return getRewards().coins || 0; }
function addCoins(n) {
  const r = getRewards(); r.coins = (r.coins || 0) + n;
  localStorage.setItem('ngn4_rewards', JSON.stringify(r));
  document.getElementById('coins').textContent = r.coins;
}

// ── Board Init ──
function initBoard() {
  board = Array(8).fill(null).map(() => Array(8).fill(null));
  const back = ['r','n','b','q','k','b','n','r'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: back[c], color: 'b' };
    board[1][c] = { type: 'p', color: 'b' };
    board[6][c] = { type: 'p', color: 'w' };
    board[7][c] = { type: back[c], color: 'w' };
  }
  enPassantTarget = null;
  castlingRights = { wK:true, wQ:true, bK:true, bQ:true };
  capturedW = []; capturedB = [];
  moveList = [];
  undoStack = [];
  undoUsed = 0;
  selected = null;
  legalMoves = [];
  turn = 'w';
  gameOver = false;
  inCheck = false;
  totalCaptures = 0;
  moveCount = 0;
  promotionPending = false;
  promoSquare = null;
  if (timed) {
    timers = { w: timeControl, b: timeControl };
    startTimer();
  }
  updateStatus();
  updateCaptured();
  updateMoveHistory();
  draw();
}

// ── Move Generation ──
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function isEnemy(piece, color) { return piece && piece.color !== color; }
function isEmpty(r, c) { return !board[r][c]; }

function getRawMoves(r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];
  const color = piece.color;
  const dir = color === 'w' ? -1 : 1;

  function addMove(tr, tc, special) {
    if (inBounds(tr, tc) && (!board[tr][tc] || isEnemy(board[tr][tc], color))) {
      moves.push({ fr: r, fc: c, tr, tc, special: special || null });
    }
  }

  switch (piece.type) {
    case 'p':
      if (isEmpty(r + dir, c)) {
        moves.push({ fr:r, fc:c, tr:r+dir, tc:c, special: (r+dir===0||r+dir===7)?'promo':null });
        if ((color==='w'&&r===6)||(color==='b'&&r===1)) {
          if (isEmpty(r+2*dir, c)) moves.push({ fr:r, fc:c, tr:r+2*dir, tc:c, special:'double' });
        }
      }
      for (const dc of [-1,1]) {
        if (inBounds(r+dir, c+dc) && isEnemy(board[r+dir][c+dc], color)) {
          moves.push({ fr:r, fc:c, tr:r+dir, tc:c+dc, special: (r+dir===0||r+dir===7)?'promo':null });
        }
        if (enPassantTarget && enPassantTarget.r === r+dir && enPassantTarget.c === c+dc) {
          moves.push({ fr:r, fc:c, tr:r+dir, tc:c+dc, special:'ep' });
        }
      }
      break;
    case 'n':
      for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        addMove(r+dr, c+dc);
      }
      break;
    case 'b':
      for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        for (let i = 1; i < 8; i++) {
          const tr=r+dr*i, tc=c+dc*i;
          if (!inBounds(tr,tc)) break;
          if (isEmpty(tr,tc)) { moves.push({fr:r,fc:c,tr,tc}); }
          else if (isEnemy(board[tr][tc],color)) { moves.push({fr:r,fc:c,tr,tc}); break; }
          else break;
        }
      }
      break;
    case 'r':
      for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        for (let i = 1; i < 8; i++) {
          const tr=r+dr*i, tc=c+dc*i;
          if (!inBounds(tr,tc)) break;
          if (isEmpty(tr,tc)) { moves.push({fr:r,fc:c,tr,tc}); }
          else if (isEnemy(board[tr][tc],color)) { moves.push({fr:r,fc:c,tr,tc}); break; }
          else break;
        }
      }
      break;
    case 'q':
      for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        for (let i = 1; i < 8; i++) {
          const tr=r+dr*i, tc=c+dc*i;
          if (!inBounds(tr,tc)) break;
          if (isEmpty(tr,tc)) { moves.push({fr:r,fc:c,tr,tc}); }
          else if (isEnemy(board[tr][tc],color)) { moves.push({fr:r,fc:c,tr,tc}); break; }
          else break;
        }
      }
      break;
    case 'k':
      for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        addMove(r+dr, c+dc);
      }
      // Castling
      const row = color === 'w' ? 7 : 0;
      if (r === row && c === 4) {
        if (color==='w' ? castlingRights.wK : castlingRights.bK) {
          if (isEmpty(row,5) && isEmpty(row,6) && board[row][7] && board[row][7].type==='r' && board[row][7].color===color) {
            if (!isSquareAttacked(row,4,color) && !isSquareAttacked(row,5,color) && !isSquareAttacked(row,6,color))
              moves.push({fr:r,fc:c,tr:row,tc:6,special:'castleK'});
          }
        }
        if (color==='w' ? castlingRights.wQ : castlingRights.bQ) {
          if (isEmpty(row,3) && isEmpty(row,2) && isEmpty(row,1) && board[row][0] && board[row][0].type==='r' && board[row][0].color===color) {
            if (!isSquareAttacked(row,4,color) && !isSquareAttacked(row,3,color) && !isSquareAttacked(row,2,color))
              moves.push({fr:r,fc:c,tr:row,tc:2,special:'castleQ'});
          }
        }
      }
      break;
  }
  return moves;
}

function isSquareAttacked(r, c, byColor) {
  const enemy = byColor === 'w' ? 'b' : 'w';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] && board[row][col].color === enemy) {
        const piece = board[row][col];
        const dir = enemy === 'w' ? -1 : 1;
        if (piece.type === 'p') {
          if (row + dir === r && (col - 1 === c || col + 1 === c)) return true;
        } else if (piece.type === 'n') {
          const dr = Math.abs(row - r), dc = Math.abs(col - c);
          if ((dr===2&&dc===1)||(dr===1&&dc===2)) return true;
        } else if (piece.type === 'k') {
          if (Math.abs(row-r) <= 1 && Math.abs(col-c) <= 1 && !(row===r&&col===c)) return true;
        } else {
          let dirs = [];
          if (piece.type === 'b' || piece.type === 'q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
          if (piece.type === 'r' || piece.type === 'q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
          for (const [dr,dc] of dirs) {
            for (let i = 1; i < 8; i++) {
              const tr=row+dr*i, tc=col+dc*i;
              if (!inBounds(tr,tc)) break;
              if (tr===r && tc===c) return true;
              if (board[tr][tc]) break;
            }
          }
        }
      }
    }
  }
  return false;
}

function findKing(color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] && board[r][c].type === 'k' && board[r][c].color === color)
        return { r, c };
  return null;
}

function isInCheck(color) {
  const king = findKing(color);
  return king ? isSquareAttacked(king.r, king.c, color) : false;
}

function getLegalMoves(r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const raw = getRawMoves(r, c);
  return raw.filter(m => {
    const state = saveState();
    executeMove(m, true);
    const check = isInCheck(piece.color);
    restoreState(state);
    return !check;
  });
}

function hasAnyLegalMoves(color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] && board[r][c].color === color && getLegalMoves(r, c).length > 0)
        return true;
  return false;
}

// ── State Management ──
function saveState() {
  return {
    board: board.map(row => row.map(cell => cell ? {...cell} : null)),
    enPassantTarget: enPassantTarget ? {...enPassantTarget} : null,
    castlingRights: {...castlingRights},
    capturedW: [...capturedW],
    capturedB: [...capturedB]
  };
}

function restoreState(s) {
  board = s.board;
  enPassantTarget = s.enPassantTarget;
  castlingRights = s.castlingRights;
  capturedW = s.capturedW;
  capturedB = s.capturedB;
}

// ── Move Execution ──
function executeMove(move, simulating) {
  const { fr, fc, tr, tc, special } = move;
  const piece = board[fr][fc];
  const captured = board[tr][tc];

  if (special === 'ep') {
    const epRow = piece.color === 'w' ? tr + 1 : tr - 1;
    if (!simulating) {
      (piece.color === 'w' ? capturedB : capturedW).push(board[epRow][tc]);
      board[epRow][tc] = null;
      totalCaptures++;
    } else {
      board[epRow][tc] = null;
    }
  } else if (captured && !simulating) {
    (piece.color === 'w' ? capturedB : capturedW).push(captured);
    totalCaptures++;
  }

  board[tr][tc] = piece;
  board[fr][fc] = null;

  if (special === 'double') {
    enPassantTarget = { r: (fr + tr) / 2, c: fc };
  } else {
    enPassantTarget = null;
  }

  if (special === 'castleK') {
    board[tr][5] = board[tr][7];
    board[tr][7] = null;
  }
  if (special === 'castleQ') {
    board[tr][3] = board[tr][0];
    board[tr][0] = null;
  }

  if (piece.type === 'k') {
    if (piece.color === 'w') { castlingRights.wK = false; castlingRights.wQ = false; }
    else { castlingRights.bK = false; castlingRights.bQ = false; }
  }
  if (piece.type === 'r') {
    if (fr === 7 && fc === 0) castlingRights.wQ = false;
    if (fr === 7 && fc === 7) castlingRights.wK = false;
    if (fr === 0 && fc === 0) castlingRights.bQ = false;
    if (fr === 0 && fc === 7) castlingRights.bK = false;
  }
  if (tr === 0 && tc === 0) castlingRights.bQ = false;
  if (tr === 0 && tc === 7) castlingRights.bK = false;
  if (tr === 7 && tc === 0) castlingRights.wQ = false;
  if (tr === 7 && tc === 7) castlingRights.wK = false;
}

function getMoveNotation(move, captured, givesCheck, givesMate) {
  if (move.special === 'castleK') return 'O-O';
  if (move.special === 'castleQ') return 'O-O-O';
  const piece = board[move.tr][move.tc];
  let n = '';
  if (piece.type !== 'p') n += piece.type.toUpperCase();
  else if (captured || move.special === 'ep') n += FILES[move.fc];
  if (captured || move.special === 'ep') n += 'x';
  n += FILES[move.tc] + (8 - move.tr);
  if (move.special === 'promo') n += '=Q';
  if (givesMate) n += '#';
  else if (givesCheck) n += '+';
  return n;
}

function makeMove(move) {
  const state = saveState();
  const piece = board[move.fr][move.fc];
  const captured = board[move.tr][move.tc] || (move.special === 'ep');
  executeMove(move, false);

  if (move.special === 'promo') {
    board[move.tr][move.tc] = { type: 'q', color: piece.color };
  }

  const givesCheck = isInCheck(turn === 'w' ? 'b' : 'w');
  const oppHasMoves = hasAnyLegalMoves(turn === 'w' ? 'b' : 'w');
  const notation = getMoveNotation(move, captured, givesCheck, givesCheck && !oppHasMoves);

  undoStack.push({ state, notation });
  moveCount++;

  if (moveCount % 2 === 1) moveList.push(`${Math.ceil(moveCount/2)}. ${notation}`);
  else moveList[moveList.length - 1] += ` ${notation}`;

  turn = turn === 'w' ? 'b' : 'w';
  inCheck = givesCheck && isInCheck(turn);

  if (captured) sndCapture(); else sndMove();
  if (givesCheck) sndCheck();

  updateMoveHistory();
  updateCaptured();
  updateStatus();

  if (!oppHasMoves) {
    gameOver = true;
    stopTimer();
    if (givesCheck) {
      showResult(turn === 'w' ? 'loss' : 'win');
    } else {
      showResult('draw');
    }
    sndGameOver();
    return;
  }

  draw();
  if (turn === 'b' && !gameOver) {
    setTimeout(aiMove, 400);
  }
}

function undoMove() {
  if (undoStack.length < 2 || gameOver || promotionPending) return;
  if (undoUsed >= undoLimit) return;
  // Undo AI move and player move
  const aiMove = undoStack.pop();
  const playerMove = undoStack.pop();
  moveCount -= 2;
  if (moveList.length > 0) moveList.pop();
  restoreState(playerMove.state);
  turn = 'w';
  undoUsed++;
  selected = null;
  legalMoves = [];
  inCheck = isInCheck('w');
  updateMoveHistory();
  updateCaptured();
  updateStatus();
  draw();
  sndMove();
}

// ── AI ──
function evaluateBoard() {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = PIECE_VALUES[p.type];
      const posBonus = getPositionBonus(p, r, c);
      if (p.color === 'b') score += val + posBonus;
      else score -= val + posBonus;
    }
  }
  return score;
}

function getPositionBonus(piece, r, c) {
  if (piece.type === 'p') {
    const row = piece.color === 'w' ? r : 7 - r;
    return row * 0.05 + (c > 2 && c < 5 ? 0.02 : 0);
  }
  if (piece.type === 'n') {
    const cr = Math.abs(3.5 - r), cc = Math.abs(3.5 - c);
    return Math.max(0, 0.15 - (cr + cc) * 0.02);
  }
  if (piece.type === 'b' || piece.type === 'r') {
    return r > 2 && r < 6 ? 0.05 : 0;
  }
  return 0;
}

function getAllMoves(color) {
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] && board[r][c].color === color)
        moves.push(...getLegalMoves(r, c).map(m => ({...m, fr:r, fc:c})));
  return moves;
}

function minimax(depth, alpha, beta, maximizing) {
  if (depth === 0) return evaluateBoard();
  const color = maximizing ? 'b' : 'w';
  const moves = getAllMoves(color);
  if (moves.length === 0) {
    if (isInCheck(color)) return maximizing ? -9999 : 9999;
    return 0;
  }
  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const state = saveState();
      executeMove(move, true);
      const val = minimax(depth - 1, alpha, beta, false);
      restoreState(state);
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const state = saveState();
      executeMove(move, true);
      const val = minimax(depth - 1, alpha, beta, true);
      restoreState(state);
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function aiMove() {
  if (gameOver || turn !== 'b') return;
  const moves = getAllMoves('b');
  if (moves.length === 0) return;

  let chosen;
  if (difficulty === 'beginner') {
    chosen = moves[Math.floor(Math.random() * moves.length)];
  } else if (difficulty === 'intermediate') {
    moves.sort((a, b) => {
      const va = board[a.tr][a.tc] ? PIECE_VALUES[board[a.tr][a.tc].type] : 0;
      const vb = board[b.tr][b.tc] ? PIECE_VALUES[board[b.tr][b.tc].type] : 0;
      return vb - va + (Math.random() - 0.5) * 2;
    });
    chosen = moves[Math.floor(Math.random() * Math.min(5, moves.length))];
  } else {
    // Advanced: minimax depth 3
    let bestVal = -Infinity;
    let bestMoves = [];
    for (const move of moves) {
      const state = saveState();
      executeMove(move, true);
      const val = minimax(2, -Infinity, Infinity, false);
      restoreState(state);
      if (val > bestVal) {
        bestVal = val;
        bestMoves = [move];
      } else if (val === bestVal) {
        bestMoves.push(move);
      }
    }
    chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  if (chosen) makeMove(chosen);
}

// ── Timer ──
function startTimer() {
  stopTimer();
  if (!timed) return;
  timerInterval = setInterval(() => {
    if (gameOver) { stopTimer(); return; }
    timers[turn] -= 0.1;
    if (timers[turn] <= 0) {
      timers[turn] = 0;
      gameOver = true;
      stopTimer();
      showResult(turn === 'w' ? 'loss' : 'win');
      sndGameOver();
    }
    updateTimerDisplay();
  }, 100);
}
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
function updateTimerDisplay() {
  if (!timed) return;
  for (const c of ['w','b']) {
    const t = Math.max(0, Math.ceil(timers[c]));
    const m = Math.floor(t / 60);
    const s = t % 60;
    const el = document.getElementById(c === 'w' ? 'white-timer' : 'black-timer');
    el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    el.classList.toggle('danger', t <= 30);
  }
}

// ── Drawing ──
function draw() {
  const t = THEMES[theme];
  const sq = 70;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isLight = (r + c) % 2 === 0;
      ctx.fillStyle = isLight ? t.light : t.dark;
      ctx.fillRect(c * sq, r * sq, sq, sq);

      // Last move highlight
      if (undoStack.length > 0) {
        const last = undoStack[undoStack.length - 1];
        const notation = last.notation;
        // Highlight squares involved in last move if we can parse them
      }

      // Legal move dots
      if (legalMoves.some(m => m.tr === r && m.tc === c)) {
        ctx.fillStyle = t.legal;
        ctx.fillRect(c * sq, r * sq, sq, sq);
        ctx.beginPath();
        ctx.arc(c * sq + sq / 2, r * sq + sq / 2, 8, 0, Math.PI * 2);
        ctx.fillStyle = t.accent + '66';
        ctx.fill();
      }

      // Selected highlight
      if (selected && selected.r === r && selected.c === c) {
        ctx.fillStyle = t.selected;
        ctx.fillRect(c * sq, r * sq, sq, sq);
      }

      // Check highlight
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === turn && inCheck) {
        ctx.fillStyle = 'rgba(255,0,0,0.4)';
        ctx.fillRect(c * sq, r * sq, sq, sq);
      }
    }
  }

  // Draw coordinates
  ctx.font = '10px Courier New';
  ctx.fillStyle = t.accent + '88';
  for (let i = 0; i < 8; i++) {
    ctx.fillText(FILES[i], i * sq + sq - 12, sq * 8 - 4);
    ctx.fillText((8 - i).toString(), 3, i * sq + 12);
  }

  // Draw pieces
  ctx.font = '44px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        const symbol = PIECES[p.color === 'w' ? p.type.toUpperCase() : p.type];
        ctx.fillStyle = p.color === 'w' ? '#fff' : '#222';
        ctx.strokeStyle = p.color === 'w' ? '#000' : '#888';
        ctx.lineWidth = 1;
        ctx.fillText(symbol, c * sq + sq / 2, r * sq + sq / 2 + 2);
        if (p.color === 'w') ctx.strokeText(symbol, c * sq + sq / 2, r * sq + sq / 2 + 2);
      }
    }
  }
  ctx.textAlign = 'start';

  updateTimerDisplay();
}

// ── UI Updates ──
function updateStatus() {
  const el = document.getElementById('status-bar');
  if (gameOver) return;
  if (inCheck) el.textContent = '⚠ CHECK!';
  else el.textContent = turn === 'w' ? 'Your turn (White)' : 'AI thinking...';
}
function updateCaptured() {
  document.getElementById('captured-black').textContent = capturedB.map(p => PIECES[p.type.toUpperCase()]).join('');
  document.getElementById('captured-white').textContent = capturedW.map(p => PIECES[p.type.toUpperCase()]).join('');
}
function updateMoveHistory() {
  const el = document.getElementById('move-history');
  el.textContent = moveList.join('  ');
  el.scrollTop = el.scrollHeight;
}

// ── Results ──
function showResult(result) {
  document.getElementById('game-screen').style.display = 'none';
  document.getElementById('result-screen').style.display = 'block';
  const title = document.getElementById('result-title');
  const desc = document.getElementById('result-desc');
  const stats = document.getElementById('result-stats');
  const rewards = document.getElementById('rewards-earned');

  // NGN4 Achievements
  try {
    if (typeof NGN4Achievements !== 'undefined') {
      if (result === 'win') {
        NGN4Achievements.unlock('chess_win', 'Chess Victory');
        if (difficulty === 'advanced') NGN4Achievements.unlock('chess_win_hard', 'Beat Advanced AI');
        if (moveCount <= 40) NGN4Achievements.unlock('chess_speed', 'Quick Victory');
      }
      if (totalCaptures >= 5) NGN4Achievements.unlock('chess_capture_5', 'Capture 5 Pieces');
      if (moveCount >= 50) NGN4Achievements.unlock('chess_marathon', 'Marathon Game');
    }
  } catch(e) {}

  let coinsEarned = 0;
  if (result === 'win') {
    title.textContent = '🏆 VICTORY!';
    title.style.color = '#0f0';
    desc.textContent = 'Brilliant! You defeated the AI!';
    coinsEarned = 20 + totalCaptures * 2;
    if (difficulty === 'intermediate') coinsEarned = Math.floor(coinsEarned * 1.5);
    if (difficulty === 'advanced') coinsEarned *= 2;
  } else if (result === 'loss') {
    title.textContent = '💀 DEFEAT';
    title.style.color = '#f44';
    desc.textContent = 'The AI outplayed you. Try again!';
    coinsEarned = 2;
  } else {
    title.textContent = '🤝 STALEMATE';
    title.style.color = '#ffd700';
    desc.textContent = 'A draw by stalemate.';
    coinsEarned = 5;
  }

  stats.innerHTML = `Moves: ${moveCount}<br>Captures: ${totalCaptures}<br>Difficulty: ${difficulty}<br>Undos used: ${undoUsed}`;
  rewards.textContent = `🪙 +${coinsEarned} coins earned!`;
  addCoins(coinsEarned);
}

// ── Canvas Click ──
function handleClick(e) {
  if (gameOver || turn !== 'w' || promotionPending) return;
  initAudio();
  const rect = canvas.getBoundingClientRect();
  const sq = 70;
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const c = Math.floor(x / sq);
  const r = Math.floor(y / sq);
  if (!inBounds(r, c)) return;

  if (selected) {
    const move = legalMoves.find(m => m.tr === r && m.tc === c);
    if (move) {
      if (move.special === 'promo') {
        // Auto-promote to queen
        makeMove(move);
      } else {
        makeMove(move);
      }
      selected = null;
      legalMoves = [];
      return;
    }
  }

  const piece = board[r][c];
  if (piece && piece.color === 'w') {
    selected = { r, c };
    legalMoves = getLegalMoves(r, c);
    draw();
  } else {
    selected = null;
    legalMoves = [];
    draw();
  }
}

// ── Ad Mockup ──
function watchAd(callback) {
  const btn = document.getElementById('watch-ad-btn');
  btn.textContent = '⏳ Watching...';
  btn.disabled = true;
  let sec = 30;
  const interval = setInterval(() => {
    sec--;
    btn.textContent = `⏳ ${sec}s remaining...`;
    if (sec <= 0) {
      clearInterval(interval);
      btn.textContent = '✅ Watched!';
      btn.style.background = '#0f0';
      callback();
    }
  }, 1000);
}

// ── Init ──
function init() {
  canvas = document.getElementById('chess-canvas');
  ctx = canvas.getContext('2d');
  document.getElementById('coins').textContent = getCoins();

  // Menu buttons
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      difficulty = btn.dataset.diff;
    });
  });
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      timeControl = parseInt(btn.dataset.time);
      timed = timeControl > 0;
    });
  });
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      theme = btn.dataset.theme;
    });
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    initAudio();
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    initBoard();
  });

  canvas.addEventListener('click', handleClick);

  document.getElementById('undo-btn').addEventListener('click', () => { initAudio(); undoMove(); });
  document.getElementById('resign-btn').addEventListener('click', () => {
    if (!gameOver) {
      gameOver = true;
      stopTimer();
      showResult('loss');
      sndGameOver();
    }
  });
  document.getElementById('menu-btn').addEventListener('click', () => {
    stopTimer();
    gameOver = true;
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
  });

  document.getElementById('play-again-btn').addEventListener('click', () => {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    initBoard();
  });
  document.getElementById('result-menu-btn').addEventListener('click', () => {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
  });

  document.getElementById('watch-ad-btn').addEventListener('click', () => {
    watchAd(() => { undoLimit = 999; });
  });
}

document.addEventListener('DOMContentLoaded', init);
})();
