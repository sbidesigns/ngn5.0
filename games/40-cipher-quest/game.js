// NGN4 Universal Systems Init
try { if (typeof NGN4Settings !== 'undefined') NGN4Settings.init(); } catch(e) {}
try { if (typeof NGN4Achievements !== 'undefined') NGN4Achievements.init('cipher-quest'); } catch(e) {}

// CIPHER QUEST - NGN4 Game #40 - Puzzle Adventure
(function(){
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
canvas.width=900;canvas.height=700;

let AC=null;function getAC(){if(!AC)try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}return AC;}
function snd(f,d,t='sine',v=0.06){if(!getAC())return;const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d);}
function clickSnd(){snd(800,0.05,'sine',0.06);}
function successSnd(){snd(500,0.1,'sine',0.08);setTimeout(()=>snd(700,0.1,'sine',0.08),100);setTimeout(()=>snd(1000,0.2,'sine',0.1),200);}
function failSnd(){snd(200,0.3,'square',0.06);}
function hintSnd(){snd(400,0.15,'sine',0.06);setTimeout(()=>snd(600,0.15,'sine',0.06),100);}
function coinSnd(){snd(1000,0.08,'sine',0.06);}
function keySnd(){snd(600,0.1,'sine',0.07);}

let coins=parseInt(localStorage.getItem('ngn4_rewards')||'0');
let totalStars=parseInt(localStorage.getItem('ngn4_cq_stars')||'0');
let completedLevels=[];try{completedLevels=JSON.parse(localStorage.getItem('ngn4_cq_done')||'[]');}catch(e){completedLevels=[];}
function getCoins(){return parseInt(localStorage.getItem('ngn4_rewards')||'0');}
function saveCoins(c){localStorage.setItem('ngn4_rewards',c);}
function saveProgress(){localStorage.setItem('ngn4_cq_stars',totalStars);localStorage.setItem('ngn4_cq_done',JSON.stringify(completedLevels));}

let state='menu',levelIdx=0;
let hints=3,hintsUsed=0,moves=0,timer=0,loreFound=false;
let puzzleData={};

const loreTexts=[
  "The First Temple speaks of the Pattern Keepers - beings who wove the fabric of reality through rhythmic sequences.",
  "The Sliding Stones reveal that order emerges from chaos. The ancients believed perfection lay in arrangement.",
  "Logic Gates powered the ancient machines. True knowledge flows only through correct reasoning.",
  "The Cipher Scrolls hold messages from the Last King. His words were encrypted to preserve them through time.",
  "The Pipe Network once carried life-giving energy across the continent. Connection was their greatest power.",
  "Light was sacred to the ancients. They built mirror temples to channel starlight into their underground cities.",
  "Color Alchemy was the highest art. By mixing light, they could create anything from nothing.",
  "Memory was the most valued trait. Those who could remember the longest sequences became the Oracle class.",
  "The Labyrinth was both prison and sanctuary. Only the worthy could navigate its shifting corridors.",
  "The Final Revelation: All puzzles are one. The cipher is within you. The lost civilization was... your mind."
];

const templeNames=[
  "Temple of Patterns","Temple of Stones","Temple of Logic","Temple of Ciphers",
  "Temple of Flow","Temple of Light","Temple of Colors","Temple of Memory",
  "The Labyrinth","The Final Temple"
];

// ===== PUZZLE 1: Pattern Sequence =====
function initPattern(){
  const colors=['#f00','#0f0','#00f','#ff0','#f0f','#0ff'];
  const len=4+levelIdx*0; // always 4 for first level
  puzzleData={sequence:[],playerSeq:[],phase:'show',showIdx:0,showTimer:0,
    colors:colors,buttons:colors.slice(0,4+levelIdx%3),
    flashTimer:0,flashColor:null,success:false,fail:false};
  for(let i=0;i<len;i++)puzzleData.sequence.push(Math.floor(Math.random()*puzzleData.buttons.length));
  puzzleData.showTimer=60;
}

function updatePattern(){
  const d=puzzleData;
  if(d.success||d.fail)return;
  if(d.phase==='show'){
    d.showTimer--;
    if(d.showTimer<=0){
      if(d.showIdx<d.sequence.length){
        d.flashColor=d.buttons[d.sequence[d.showIdx]];
        d.flashTimer=30;
        d.showIdx++;
        d.showTimer=40;
        clickSnd();
      }else{d.phase='input';d.playerSeq=[];}
    }
  }
  if(d.flashTimer>0){d.flashTimer--;if(d.flashTimer<=0)d.flashColor=null;}
  if(d.phase==='complete'){
    if(d.playerSeq.length===d.sequence.length){
      let ok=true;
      for(let i=0;i<d.sequence.length;i++)if(d.playerSeq[i]!==d.sequence[i]){ok=false;break;}
      if(ok){d.success=true;successSnd();setTimeout(()=>levelComplete(),1000);}
      else{d.fail=true;d.playerSeq=[];d.phase='input';failSnd();}
    }
  }
}

function renderPattern(){
  const d=puzzleData;
  ctx.fillStyle='#0a0a1f';ctx.fillRect(0,40,900,620);
  ctx.fillStyle='#a6f';ctx.font='20px monospace';ctx.textAlign='center';
  ctx.fillText('PATTERN SEQUENCE',450,90);
  ctx.fillStyle='#888';ctx.font='13px monospace';
  ctx.fillText(d.phase==='show'?'Watch the pattern...':'Repeat the pattern!',450,120);
  
  const bw=80,bh=80,gap=20;
  const totalW=d.buttons.length*(bw+gap)-gap;
  const startX=(900-totalW)/2;
  
  d.buttons.forEach((c,i)=>{
    const x=startX+i*(bw+gap),y=200;
    const flash=d.flashColor===c;
    ctx.fillStyle=flash?c:hexDim(c,0.3);
    if(flash){ctx.shadowColor=c;ctx.shadowBlur=20;}
    ctx.fillRect(x,y,bw,bh);
    ctx.shadowBlur=0;
    ctx.strokeStyle=c;ctx.lineWidth=2;ctx.strokeRect(x,y,bw,bh);
  });
  
  // Player progress
  ctx.fillStyle='#fff';ctx.font='14px monospace';
  ctx.fillText('Progress: '+d.playerSeq.length+'/'+d.sequence.length,450,350);
  
  // Sequence display (hint-like)
  for(let i=0;i<d.sequence.length;i++){
    const x=350+i*30,y=400;
    ctx.fillStyle=i<d.playerSeq.length?d.buttons[d.playerSeq[i]]:'#333';
    ctx.fillRect(x,y,20,20);
  }
  ctx.textAlign='left';
  
  // Lore
  renderLore();
}

function clickPattern(mx,my){
  const d=puzzleData;
  if(d.phase!=='input')return;
  const bw=80,bh=80,gap=20;
  const totalW=d.buttons.length*(bw+gap)-gap;
  const startX=(900-totalW)/2;
  for(let i=0;i<d.buttons.length;i++){
    const x=startX+i*(bw+gap),y=200;
    if(mx>=x&&mx<=x+bw&&my>=y&&my<=y+bh){
      d.flashColor=d.buttons[i];d.flashTimer=15;clickSnd();
      d.playerSeq.push(i);
      // Check so far
      if(d.playerSeq.length>d.sequence.length)return;
      if(d.playerSeq[d.playerSeq.length-1]!==d.sequence[d.playerSeq.length-1]){
        failSnd();d.playerSeq=[];return;
      }
      if(d.playerSeq.length===d.sequence.length){d.success=true;successSnd();setTimeout(()=>levelComplete(),1000);}
      return;
    }
  }
}

function hintPattern(){
  const d=puzzleData;
  d.phase='show';d.showIdx=0;d.showTimer=30;
}

// ===== PUZZLE 2: Sliding Puzzle =====
function initSliding(){
  let tiles=[1,2,3,4,5,6,7,8,0];
  // Shuffle with valid moves
  for(let i=0;i<100;i++){
    const empty=tiles.indexOf(0);
    const er=Math.floor(empty/3),ec=empty%3;
    const moves=[];
    if(er>0)moves.push(empty-3);if(er<2)moves.push(empty+3);
    if(ec>0)moves.push(empty-1);if(ec<2)moves.push(empty+1);
    const swap=moves[Math.floor(Math.random()*moves.length)];
    tiles[empty]=tiles[swap];tiles[swap]=0;
  }
  puzzleData={tiles:tiles,empty:9,solved:false,moves:0};
}

function updateSliding(){if(puzzleData.solved)return;}

function renderSliding(){
  const d=puzzleData;
  ctx.fillStyle='#0a0a1f';ctx.fillRect(0,40,900,620);
  ctx.fillStyle='#a6f';ctx.font='20px monospace';ctx.textAlign='center';
  ctx.fillText('SLIDING PUZZLE',450,90);
  ctx.fillStyle='#888';ctx.font='13px monospace';
  ctx.fillText('Arrange tiles 1-8 in order',450,120);
  
  const sz=120,gap=5,total=sz*3+gap*2;
  const sx=(900-total)/2,sy=180;
  
  for(let i=0;i<9;i++){
    const r=Math.floor(i/3),c=i%3;
    const x=sx+c*(sz+gap),y=sy+r*(sz+gap);
    const val=d.tiles[i];
    if(val===0){
      ctx.fillStyle='#111';ctx.fillRect(x,y,sz,sz);
    }else{
      const correct=val===i+1;
      ctx.fillStyle=correct?'#1a3a1a':'#1a1a2a';
      ctx.fillRect(x,y,sz,sz);
      ctx.strokeStyle=correct?'#0f0':'#a6f';ctx.lineWidth=2;ctx.strokeRect(x,y,sz,sz);
      ctx.fillStyle='#fff';ctx.font='36px monospace';
      ctx.fillText(val,x+sz/2,y+sz/2+12);
    }
  }
  ctx.fillStyle='#fff';ctx.font='14px monospace';
  ctx.fillText('Moves: '+d.moves,450,560);
  ctx.textAlign='left';
  renderLore();
}

function clickSliding(mx,my){
  const d=puzzleData;if(d.solved)return;
  const sz=120,gap=5,total=sz*3+gap*2;
  const sx=(900-total)/2,sy=180;
  for(let i=0;i<9;i++){
    const r=Math.floor(i/3),c=i%3;
    const x=sx+c*(sz+gap),y=sy+r*(sz+gap);
    if(mx>=x&&mx<=x+sz&&my>=y&&my<=y+sz){
      const empty=d.tiles.indexOf(0);
      const er=Math.floor(empty/3),ec=empty%3;
      if((Math.abs(r-er)+Math.abs(c-ec))===1){
        d.tiles[empty]=d.tiles[i];d.tiles[i]=0;d.moves++;moves++;
        clickSnd();
        let ok=true;
        for(let j=0;j<8;j++)if(d.tiles[j]!==j+1){ok=false;break;}
        if(ok){d.solved=true;successSnd();setTimeout(()=>levelComplete(),1000);}
      }
      return;
    }
  }
}

function hintSliding(){
  const d=puzzleData;
  // Find next correct move
  for(let i=0;i<9;i++){
    if(d.tiles[i]===0)continue;
    const empty=d.tiles.indexOf(0);
    const er=Math.floor(empty/3),ec=empty%3;
    const ir=Math.floor(i/3),ic=i%3;
    if(Math.abs(ir-er)+Math.abs(ic-ec)===1){
      // Try move, check if any tile gets closer to goal
      d.tiles[empty]=d.tiles[i];d.tiles[i]=0;d.moves++;moves++;
      clickSnd();break;
    }
  }
}

// ===== PUZZLE 3: Logic Gates =====
function initLogic(){
  puzzleData={
    inputs:[true,false,true],
    gates:[
      {type:'AND',inputs:[0,1],output:false},
      {type:'OR',inputs:[0,2],output:false},
      {type:'NOT',inputs:[1],output:false}
    ],
    targetOutput:[true,false,true],
    inputStates:[false,false,false],
    solved:false,
    selectedInput:-1
  };
  updateLogicGates();
}

function updateLogicGates(){
  const d=puzzleData;
  d.gates.forEach(g=>{
    const ins=g.inputs.map(i=>d.inputStates[i]);
    if(g.type==='AND')g.output=ins.every(v=>v);
    if(g.type==='OR')g.output=ins.some(v=>v);
    if(g.type==='NOT')g.output=!ins[0];
  });
  const results=d.gates.map(g=>g.output);
  d.solved=results[0]===d.targetOutput[0]&&results[1]===d.targetOutput[1]&&results[2]===d.targetOutput[2];
}

function renderLogic(){
  const d=puzzleData;
  ctx.fillStyle='#0a0a1f';ctx.fillRect(0,40,900,620);
  ctx.fillStyle='#a6f';ctx.font='20px monospace';ctx.textAlign='center';
  ctx.fillText('LOGIC GATES',450,90);
  ctx.fillStyle='#888';ctx.font='13px monospace';
  ctx.fillText('Toggle inputs to match target outputs',450,120);
  
  // Inputs
  d.inputs.forEach((_,i)=>{
    const x=100,y=180+i*120;
    ctx.fillStyle=d.inputStates[i]?'#0f0':'#333';
    ctx.fillRect(x,y,100,50);
    ctx.strokeStyle='#0ff';ctx.lineWidth=2;ctx.strokeRect(x,y,100,50);
    ctx.fillStyle='#fff';ctx.font='14px monospace';
    ctx.fillText('IN '+(i+1)+': '+(d.inputStates[i]?'1':'0'),x+50,y+30);
  });
  
  // Gates
  d.gates.forEach((g,i)=>{
    const x=350,y=180+i*120;
    const gateColor=g.type==='AND'?'#f80':g.type==='OR'?'#0ff':'#f0f';
    ctx.fillStyle='#1a1a2a';ctx.fillRect(x,y,150,50);
    ctx.strokeStyle=gateColor;ctx.lineWidth=2;ctx.strokeRect(x,y,150,50);
    ctx.fillStyle=gateColor;ctx.font='16px monospace';
    ctx.fillText(g.type,x+75,y+20);
    ctx.fillStyle='#fff';ctx.font='14px monospace';
    ctx.fillText('OUT: '+(g.output?'1':'0'),x+75,y+42);
  });
  
  // Target
  ctx.fillStyle='#888';ctx.font='14px monospace';ctx.fillText('TARGET:',700,170);
  d.targetOutput.forEach((v,i)=>{
    ctx.fillStyle=v?'#0f0':'#f00';ctx.fillRect(680,185+i*30,40,20);
    ctx.fillStyle='#fff';ctx.font='12px monospace';ctx.fillText(v?'1':'0',700,200+i*30);
  });
  
  if(d.solved){ctx.fillStyle='#0f0';ctx.font='24px monospace';ctx.fillText('SOLVED!',450,600);}
  ctx.textAlign='left';
  renderLore();
}

function clickLogic(mx,my){
  const d=puzzleData;
  d.inputs.forEach((_,i)=>{
    const x=100,y=180+i*120;
    if(mx>=x&&mx<=x+100&&my>=y&&my<=y+50){
      d.inputStates[i]=!d.inputStates[i];clickSnd();moves++;
      updateLogicGates();
      if(d.solved){successSnd();setTimeout(()=>levelComplete(),1000);}
    }
  });
}

function hintLogic(){
  const d=puzzleData;
  // Try all combinations
  for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++){
    d.inputStates=[!!a,!!b,!!c];updateLogicGates();
    if(d.solved)return;
  }
}

// ===== PUZZLE 4: Word Cipher =====
function initCipher(){
  const words=['ANCIENT','CIPHER','TEMPLE','SECRET','PUZZLE','QUEST','MYSTIC','RUNE','POWER','GATE'];
  const word=words[levelIdx%words.length];
  const shift=3+levelIdx;
  const encrypted=word.split('').map(c=>String.fromCharCode(((c.charCodeAt(0)-65+shift)%26)+65)).join('');
  puzzleData={word:word,encrypted:encrypted,shift:shift,
    playerInput:Array(word.length).fill(''),
    solved:false,selectedPos:0,showShift:false};
}

function renderCipher(){
  const d=puzzleData;
  ctx.fillStyle='#0a0a1f';ctx.fillRect(0,40,900,620);
  ctx.fillStyle='#a6f';ctx.font='20px monospace';ctx.textAlign='center';
  ctx.fillText('WORD CIPHER',450,90);
  ctx.fillStyle='#888';ctx.font='13px monospace';
  ctx.fillText('Decrypt the message! (Caesar Cipher, shift: '+(d.showShift?d.shift:'?')+')',450,120);
  
  // Encrypted
  ctx.fillStyle='#f80';ctx.font='28px monospace';
  ctx.fillText('ENCRYPTED: '+d.encrypted,450,200);
  
  // Player input
  const startX=450-(d.word.length*35)/2;
  for(let i=0;i<d.word.length;i++){
    const x=startX+i*35;
    ctx.fillStyle=i===d.selectedPos?'#2a2a4a':'#111';
    ctx.fillRect(x,280,30,40);
    ctx.strokeStyle=i===d.selectedPos?'#ff0':'#444';ctx.lineWidth=i===d.selectedPos?2:1;
    ctx.strokeRect(x,280,30,40);
    ctx.fillStyle=d.playerInput[i]?'#fff':'#444';ctx.font='24px monospace';
    ctx.fillText(d.playerInput[i]||'_',x+15,310);
  }
  
  // Check button
  ctx.fillStyle='#0f0';ctx.fillRect(400,370,100,40);
  ctx.fillStyle='#000';ctx.font='16px monospace';ctx.fillText('DECODE',450,396);
  
  // Letter buttons
  const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for(let i=0;i<26;i++){
    const r=Math.floor(i/9),c=i%9;
    const x=200+c*55,y=450+r*50;
    ctx.fillStyle='#1a1a2a';ctx.fillRect(x,y,45,40);
    ctx.strokeStyle='#444';ctx.strokeRect(x,y,45,40);
    ctx.fillStyle='#fff';ctx.font='18px monospace';ctx.fillText(letters[i],x+22,y+28);
  }
  ctx.textAlign='left';
  renderLore();
}

function clickCipher(mx,my){
  const d=puzzleData;if(d.solved)return;
  // Check decode button
  if(mx>=400&&mx<=500&&my>=370&&my<=410){
    const guess=d.playerInput.join('');
    if(guess===d.word){d.solved=true;successSnd();setTimeout(()=>levelComplete(),1000);}
    else{failSnd();d.playerInput=Array(d.word.length).fill('');d.selectedPos=0;}
    return;
  }
  // Click input position
  const startX=450-(d.word.length*35)/2;
  for(let i=0;i<d.word.length;i++){
    if(mx>=startX+i*35&&mx<=startX+i*35+30&&my>=280&&my<=320){d.selectedPos=i;return;}
  }
  // Click letter
  const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for(let i=0;i<26;i++){
    const r=Math.floor(i/9),c=i%9;
    const x=200+c*55,y=450+r*50;
    if(mx>=x&&mx<=x+45&&my>=y&&my<=y+40){
      d.playerInput[d.selectedPos]=letters[i];
      d.selectedPos=Math.min(d.selectedPos+1,d.word.length-1);
      clickSnd();return;
    }
  }
}

function hintCipher(){const d=puzzleData;d.showShift=true;}

// ===== PUZZLE 5: Pipe Connection =====
function initPipes(){
  const grid=6;
  const cells=[];
  for(let y=0;y<grid;y++){cells[y]=[];for(let x=0;x<grid;x++){
    cells[y][x]={type:'straight',rotation:0,x,y};
  }}
  // Start and end (fixed, not rotatable)
  cells[2][0].type='start';cells[2][0].rotation=0;
  cells[2][5].type='end';cells[2][5].rotation=0;

  // Generate a guaranteed path from start (0,2) to end (5,2) using random walk
  const pathSet=new Set();
  pathSet.add('0,2');pathSet.add('5,2');
  const pathCells=[{x:0,y:2}];
  let cx=0,cy=2;
  while(cx!==5||cy!==2){
    const dirs=[];
    if(cx<5)dirs.push({dx:1,dy:0});
    if(cx>0)dirs.push({dx:-1,dy:0});
    if(cy<grid-1)dirs.push({dx:0,dy:1});
    if(cy>0)dirs.push({dx:0,dy:-1});
    // Prefer moving right toward goal, but allow other directions for interesting paths
    const shuffled=dirs.sort(()=>Math.random()-0.5);
    // Bias toward right
    if(cx<5&&Math.random()<0.5){const ri=dirs.findIndex(d=>d.dx===1);if(ri>0){const t=dirs[0];dirs[0]=dirs[ri];dirs[ri]=t;}}
    let moved=false;
    for(const d of dirs){
      const nx=cx+d.dx,ny=cy+d.dy;
      const key=nx+','+ny;
      // Allow revisiting end cell but not other cells (to avoid loops)
      if(!pathSet.has(key)||(nx===5&&ny===2)){
        cx=nx;cy=ny;
        pathSet.add(key);
        pathCells.push({x:nx,y:ny});
        moved=true;
        break;
      }
    }
    if(!moved)break; // fallback (shouldn't happen)
  }

  // For each path cell (except start/end), determine which directions connect to neighbors on path
  for(let i=0;i<pathCells.length;i++){
    const p=pathCells[i];
    // Skip start and end cells
    if(p.x===0&&p.y===2)continue;
    if(p.x===5&&p.y===2)continue;
    const connections=[];
    // Check previous cell on path
    if(i>0){const prev=pathCells[i-1];connections.push({dx:prev.x-p.x,dy:prev.y-p.y});}
    // Check next cell on path
    if(i<pathCells.length-1){const next=pathCells[i+1];connections.push({dx:next.x-p.x,dy:next.y-p.y});}
    // Determine pipe type and correct rotation based on connections
    const cSet=new Set(connections.map(c=>c.dx+','+c.dy));
    const hasLeft=cSet.has('-1,0'),hasRight=cSet.has('1,0');
    const hasUp=cSet.has('0,-1'),hasDown=cSet.has('0,1');
    const count=[hasLeft,hasRight,hasUp,hasDown].filter(Boolean).length;

    if(count===2){
      // Straight or corner
      if((hasLeft&&hasRight)||(hasUp&&hasDown)){
        // Straight pipe
        cells[p.y][p.x].type='straight';
        cells[p.y][p.x].rotation=hasUp?1:0; // 0=horizontal, 1=vertical
      }else{
        // Corner pipe - determine correct rotation
        cells[p.y][p.x].type='corner';
        if(hasRight&&hasUp)cells[p.y][p.x].rotation=0;      // right+up
        else if(hasRight&&hasDown)cells[p.y][p.x].rotation=1;  // right+down
        else if(hasLeft&&hasDown)cells[p.y][p.x].rotation=2;   // left+down
        else if(hasLeft&&hasUp)cells[p.y][p.x].rotation=3;     // left+up
      }
    }else if(count===3){
      // Tee pipe
      cells[p.y][p.x].type='tee';
      if(!hasLeft)cells[p.y][p.x].rotation=0;     // R+U+D
      else if(!hasDown)cells[p.y][p.x].rotation=1; // L+R+U
      else if(!hasRight)cells[p.y][p.x].rotation=3;// L+U+D
      else cells[p.y][p.x].rotation=2;              // L+R+D
    }else if(count>=4){
      cells[p.y][p.x].type='cross';
      cells[p.y][p.x].rotation=0;
    }
  }

  // Now scramble rotations of path pipes (add 1-3 random rotations)
  for(const p of pathCells){
    if((p.x===0&&p.y===2)||(p.x===5&&p.y===2))continue; // don't rotate start/end
    const cell=cells[p.y][p.x];
    const scramble=1+Math.floor(Math.random()*3); // 1, 2, or 3 rotations
    cell.rotation=(cell.rotation+scramble)%4;
  }

  // Fill non-path cells with random pipes and random rotations
  const types=['straight','corner','tee','cross'];
  for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){
    if(pathSet.has(x+','+y))continue;
    cells[y][x].type=types[Math.floor(Math.random()*types.length)];
    cells[y][x].rotation=Math.floor(Math.random()*4);
  }

  puzzleData={grid,cells,startX:0,startY:2,endX:5,endY:2,solved:false};
}

function renderPipes(){
  const d=puzzleData;
  ctx.fillStyle='#0a0a1f';ctx.fillRect(0,40,900,620);
  ctx.fillStyle='#a6f';ctx.font='20px monospace';ctx.textAlign='center';
  ctx.fillText('PIPE CONNECTION',450,90);
  ctx.fillStyle='#888';ctx.font='13px monospace';
  ctx.fillText('Rotate pipes to connect START to END',450,120);
  
  const sz=80,gap=5;
  const total=d.grid*(sz+gap)-gap;
  const sx=(900-total)/2,sy=180;
  
  for(let y=0;y<d.grid;y++)for(let x=0;x<d.grid;x++){
    const cell=d.cells[y][x];
    const cx=sx+x*(sz+gap)+sz/2,cy=sy+y*(sz+gap)+sz/2;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(cell.rotation*Math.PI/2);
    
    if(cell.type==='start'){ctx.fillStyle='#0f0';ctx.fillRect(-sz/2,-10,sz,20);}
    else if(cell.type==='end'){ctx.fillStyle='#f00';ctx.fillRect(-sz/2,-10,sz,20);}
    else{
      ctx.fillStyle='#1a1a2a';ctx.fillRect(-sz/2,-sz/2,sz,sz);
      ctx.strokeStyle='#444';ctx.strokeRect(-sz/2,-sz/2,sz,sz);
      ctx.strokeStyle='#0ff';ctx.lineWidth=4;
      if(cell.type==='straight'){ctx.beginPath();ctx.moveTo(-sz/2,0);ctx.lineTo(sz/2,0);ctx.stroke();}
      if(cell.type==='corner'){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(sz/2,0);ctx.moveTo(0,0);ctx.lineTo(0,-sz/2);ctx.stroke();}
      if(cell.type==='tee'){ctx.beginPath();ctx.moveTo(-sz/2,0);ctx.lineTo(sz/2,0);ctx.moveTo(0,0);ctx.lineTo(0,-sz/2);ctx.stroke();}
      if(cell.type==='cross'){ctx.beginPath();ctx.moveTo(-sz/2,0);ctx.lineTo(sz/2,0);ctx.moveTo(0,-sz/2);ctx.lineTo(0,sz/2);ctx.stroke();}
    }
    ctx.restore();
    ctx.strokeStyle='#333';ctx.strokeRect(sx+x*(sz+gap),sy+y*(sz+gap),sz,sz);
  }
  ctx.fillStyle='#0f0';ctx.font='12px monospace';ctx.fillText('START',sx+sz/2,sy+2*sz+30);
  ctx.fillStyle='#f00';ctx.fillText('END',sx+5*sz+sz/2+gap*5,sy+2*sz+30);
  ctx.textAlign='left';
  renderLore();
}

function clickPipes(mx,my){
  const d=puzzleData;if(d.solved)return;
  const sz=80,gap=5;
  const total=d.grid*(sz+gap)-gap;
  const sx=(900-total)/2,sy=180;
  for(let y=0;y<d.grid;y++)for(let x=0;x<d.grid;x++){
    const px=sx+x*(sz+gap),py=sy+y*(sz+gap);
    if(mx>=px&&mx<=px+sz&&my>=py&&my<=py+sz){
      const cell=d.cells[y][x];
      if(cell.type!=='start'&&cell.type!=='end'){
        cell.rotation=(cell.rotation+1)%4;clickSnd();moves++;
        // Simple path check
        checkPipes();
      }
      return;
    }
  }
}

function checkPipes(){
  const d=puzzleData;
  // Trace path from start to end using BFS/DFS through connected pipes
  // Each pipe type has openings based on rotation:
  // straight: opens at rotation%2==0 ? left+right : top+bottom
  // corner: opens at rotation 0=right+up, 1=down+right, 2=left+down, 3=up+left
  // tee: opens at rotation 0=left+right+up, 1=right+down+up, 2=left+down+right, 3=up+left+down
  // cross: all directions always
  
  function getOpenings(cell, x, y) {
    if (cell.type === 'start') return [{dx:1,dy:0}]; // Start always opens right
    if (cell.type === 'end') return [{dx:-1,dy:0}]; // End always opens left
    const dirs = [];
    const r = cell.rotation;
    if (cell.type === 'straight') {
      if (r % 2 === 0) { dirs.push({dx:1,dy:0},{dx:-1,dy:0}); } // horizontal
      else { dirs.push({dx:0,dy:1},{dx:0,dy:-1}); } // vertical
    } else if (cell.type === 'corner') {
      const configs = [
        [{dx:1,dy:0},{dx:0,dy:-1}], // rotation 0: right + up
        [{dx:1,dy:0},{dx:0,dy:1}],  // rotation 1: right + down
        [{dx:-1,dy:0},{dx:0,dy:1}], // rotation 2: left + down
        [{dx:-1,dy:0},{dx:0,dy:-1}] // rotation 3: left + up
      ];
      dirs.push(...configs[r % 4]);
    } else if (cell.type === 'tee') {
      const configs = [
        [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:-1}], // rotation 0: L+R+U
        [{dx:1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}],   // rotation 1: R+D+U
        [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1}],    // rotation 2: L+R+D
        [{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}]    // rotation 3: L+D+U
      ];
      dirs.push(...configs[r % 4]);
    } else if (cell.type === 'cross') {
      dirs.push({dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1});
    }
    return dirs;
  }
  
  // BFS from start
  const visited = new Set();
  const queue = [{x: d.startX, y: d.startY}];
  visited.add(d.startX + ',' + d.startY);
  let reached = false;
  
  while (queue.length > 0) {
    const {x, y} = queue.shift();
    const cell = d.cells[y][x];
    const openings = getOpenings(cell, x, y);
    
    for (const dir of openings) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx < 0 || ny < 0 || nx >= d.grid || ny >= d.grid) continue;
      const key = nx + ',' + ny;
      if (visited.has(key)) continue;
      
      // Check if neighbor cell has an opening back toward us
      const neighbor = d.cells[ny][nx];
      const neighborOpens = getOpenings(neighbor, nx, ny);
      const hasReturn = neighborOpens.some(o => o.dx === -dir.dx && o.dy === -dir.dy);
      if (!hasReturn) continue;
      
      visited.add(key);
      queue.push({x: nx, y: ny});
      
      if (nx === d.endX && ny === d.endY) {
        reached = true;
        break;
      }
    }
    if (reached) break;
  }
  
  if (reached) {
    d.solved = true;
    successSnd();
    setTimeout(() => levelComplete(), 1000);
  }
}

function hintPipes(){/* Highlight a pipe to rotate */}

// ===== PUZZLE 6: Light Reflection =====
function initLight(){
  puzzleData={
    mirrors:[
      {x:300,y:250,angle:45},{x:500,y:400,angle:-45},{x:200,y:500,angle:30}
    ],
    lightStart:{x:100,y:350},target:{x:700,y:350},
    beam:[],solved:false,selectedMirror:-1,dragging:false
  };
  updateLightBeam();
}

function updateLightBeam(){
  const d=puzzleData;
  d.beam=[{x:d.lightStart.x,y:d.lightStart.y}];
  let px=d.lightStart.x,py=d.lightStart.y,angle=0;
  for(let bounce=0;bounce<10;bounce++){
    let nearest=null,nd=Infinity;
    d.mirrors.forEach((m,mi)=>{
      const cx=m.x,cy=m.y;
      const rad=m.angle*Math.PI/180;
      const nx=-Math.sin(rad),ny=Math.cos(rad);
      const dx=px-cx,dy=py-cy;
      const dot=dx*nx+dy*ny;
      const closestX=cx+nx*dot,closestY=cy+ny*dot;
      const dist=Math.hypot(px-closestX,py-closestY);
      if(dist<nd&&dist>10){nd=dist;nearest={x:closestX,y:closestY,mi};}
    });
    if(!nearest)break;
    d.beam.push({x:nearest.x,y:nearest.y});
    const m=d.mirrors[nearest.mi];
    const rad=m.angle*Math.PI/180;
    angle=2*rad-angle;
    px=nearest.x+Math.cos(angle)*5;
    py=nearest.y+Math.sin(angle)*5;
  }
  const lastPt=d.beam[d.beam.length-1];
  d.solved=Math.abs(lastPt.x-d.target.x)<50&&Math.abs(lastPt.y-d.target.y)<50;
}

function renderLight(){
  const d=puzzleData;
  ctx.fillStyle='#0a0a1f';ctx.fillRect(0,40,900,620);
  ctx.fillStyle='#a6f';ctx.font='20px monospace';ctx.textAlign='center';
  ctx.fillText('LIGHT REFLECTION',450,90);
  ctx.fillStyle='#888';ctx.font='13px monospace';
  ctx.fillText('Click mirrors to rotate them. Guide light to the target!',450,120);
  
  // Light source
  ctx.fillStyle='#ff0';ctx.beginPath();ctx.arc(d.lightStart.x,d.lightStart.y,15,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#000';ctx.font='12px monospace';ctx.fillText('SRC',d.lightStart.x-10,d.lightStart.y+4);
  
  // Target
  ctx.fillStyle=d.solved?'#0f0':'#f00';ctx.beginPath();ctx.arc(d.target.x,d.target.y,20,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#000';ctx.font='12px monospace';ctx.fillText('TGT',d.target.x-10,d.target.y+4);
  
  // Beam
  if(d.beam.length>1){
    ctx.strokeStyle='#ff0';ctx.lineWidth=3;ctx.shadowColor='#ff0';ctx.shadowBlur=10;
    ctx.beginPath();ctx.moveTo(d.beam[0].x,d.beam[0].y);
    for(let i=1;i<d.beam.length;i++)ctx.lineTo(d.beam[i].x,d.beam[i].y);
    ctx.stroke();ctx.shadowBlur=0;
  }
  
  // Mirrors
  d.mirrors.forEach((m,i)=>{
    ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.angle*Math.PI/180);
    ctx.fillStyle='#0ff';ctx.fillRect(-3,-25,6,50);
    ctx.strokeStyle='#088';ctx.lineWidth=2;ctx.strokeRect(-3,-25,6,50);
    ctx.restore();
    ctx.fillStyle='#fff';ctx.font='10px monospace';ctx.fillText('M'+(i+1),m.x-8,m.y+35);
  });
  
  if(d.solved){ctx.fillStyle='#0f0';ctx.font='24px monospace';ctx.fillText('ILLUMINATED!',450,600);}
  ctx.textAlign='left';
  renderLore();
}

function clickLight(mx,my){
  const d=puzzleData;
  d.mirrors.forEach((m,i)=>{
    if(Math.hypot(mx-m.x,my-m.y)<30){
      m.angle+=15;if(m.angle>=360)m.angle-=360;
      clickSnd();moves++;
      updateLightBeam();
      if(d.solved){successSnd();setTimeout(()=>levelComplete(),1000);}
    }
  });
}

function hintLight(){const d=puzzleData;d.mirrors.forEach(m=>{m.angle=45;});updateLightBeam();}

// ===== PUZZLE 7: Color Mixing =====
function initColor(){
  const targets=[
    {r:255,g:0,b:0},{r:0,g:200,b:100},{r:100,g:50,b:200},{r:255,g:165,b:0}
  ];
  puzzleData={
    target:targets[levelIdx%4],
    sliders:{r:128,g:128,b:128},
    solved:false,dragging:null
  };
}

function renderColor(){
  const d=puzzleData;
  ctx.fillStyle='#0a0a1f';ctx.fillRect(0,40,900,620);
  ctx.fillStyle='#a6f';ctx.font='20px monospace';ctx.textAlign='center';
  ctx.fillText('COLOR MIXING',450,90);
  ctx.fillStyle='#888';ctx.font='13px monospace';
  ctx.fillText('Adjust RGB sliders to match the target color',450,120);
  
  // Target
  ctx.fillStyle='#fff';ctx.font='14px monospace';ctx.fillText('TARGET',300,170);
  ctx.fillStyle=`rgb(${d.target.r},${d.target.g},${d.target.b})`;
  ctx.fillRect(250,185,100,100);ctx.strokeStyle='#fff';ctx.strokeRect(250,185,100,100);
  
  // Current
  ctx.fillStyle='#fff';ctx.fillText('YOUR MIX',600,170);
  ctx.fillStyle=`rgb(${d.sliders.r},${d.sliders.g},${d.sliders.b})`;
  ctx.fillRect(550,185,100,100);ctx.strokeStyle='#fff';ctx.strokeRect(550,185,100,100);
  
  // Sliders
  const colors=['r','g','b'];
  const labels=['RED','GREEN','BLUE'];
  const cColors=['#f00','#0f0','#00f'];
  colors.forEach((c,i)=>{
    const y=350+i*80;
    ctx.fillStyle=cColors[i];ctx.font='14px monospace';ctx.fillText(labels[i]+': '+d.sliders[c],350,y+10);
    ctx.fillStyle='#333';ctx.fillRect(350,y+25,200,20);
    ctx.fillStyle=cColors[i];ctx.fillRect(350,y+25,d.sliders[c]/255*200,20);
    // Slider handle
    ctx.fillStyle='#fff';ctx.fillRect(350+d.sliders[c]/255*200-5,y+20,10,30);
  });
  
  // Check button
  ctx.fillStyle='#0f0';ctx.fillRect(400,600,100,40);
  ctx.fillStyle='#000';ctx.font='16px monospace';ctx.fillText('CHECK',450,626);
  ctx.textAlign='left';
  renderLore();
}

function clickColor(mx,my){
  const d=puzzleData;if(d.solved)return;
  const colors=['r','g','b'];
  colors.forEach((c,i)=>{
    const y=350+i*80;
    if(mx>=350&&mx<=550&&my>=y+20&&my<=y+50){
      d.sliders[c]=Math.round((mx-350)/200*255);
      d.sliders[c]=Math.max(0,Math.min(255,d.sliders[c]));
      clickSnd();
    }
  });
  if(mx>=400&&mx<=500&&my>=600&&my<=640){
    const tr=d.target.r-d.sliders.r,tg=d.target.g-d.sliders.g,tb=d.target.b-d.sliders.b;
    if(Math.abs(tr)<30&&Math.abs(tg)<30&&Math.abs(tb)<30){
      d.solved=true;successSnd();setTimeout(()=>levelComplete(),1000);
    }else{failSnd();}
  }
}

function hintColor(){
  const d=puzzleData;d.sliders.r=d.target.r;d.sliders.g=d.target.g;d.sliders.b=d.target.b;
  hintsUsed++;render();
}

// ===== PUZZLE 8: Simon Says =====
function initSimon(){
  const colors=['#f00','#0f0','#00f','#ff0'];
  puzzleData={
    sequence:[],playerIdx:0,phase:'show',showIdx:0,showTimer:60,
    colors,flashTimer:0,flashColor:null,solved:false,round:0,maxRounds:5+levelIdx,
    flashPlayer:-1,flashPlayerTimer:0
  };
  addToSimonSequence();
}

function addToSimonSequence(){
  const d=puzzleData;
  d.sequence.push(Math.floor(Math.random()*4));
  d.phase='show';d.showIdx=0;d.showTimer=40;d.playerIdx=0;d.round++;
}

function updateSimon(){
  const d=puzzleData;
  if(d.solved)return;
  if(d.phase==='show'){
    d.showTimer--;
    if(d.showTimer<=0){
      if(d.showIdx<d.sequence.length){
        d.flashColor=d.colors[d.sequence[d.showIdx]];
        d.flashTimer=25;d.showIdx++;d.showTimer=35;clickSnd();
      }else{d.phase='input';}
    }
  }
  if(d.flashTimer>0){d.flashTimer--;if(d.flashTimer<=0)d.flashColor=null;}
  if(d.flashPlayerTimer>0){d.flashPlayerTimer--;if(d.flashPlayerTimer<=0)d.flashPlayer=-1;}
}

function renderSimon(){
  const d=puzzleData;
  ctx.fillStyle='#0a0a1f';ctx.fillRect(0,40,900,620);
  ctx.fillStyle='#a6f';ctx.font='20px monospace';ctx.textAlign='center';
  ctx.fillText('SIMON SAYS',450,90);
  ctx.fillStyle='#888';ctx.font='13px monospace';
  ctx.fillText(d.phase==='show'?'Watch carefully...':'Your turn! ('+d.playerIdx+'/'+d.sequence.length+')',450,120);
  ctx.fillText('Round: '+d.round+'/'+d.maxRounds,450,145);
  
  // 4 colored quadrants
  const cx=450,cy=350,r=150;
  const positions=[
    {x:cx-r/2,y:cy-r/2,cx:cx-r/2+40,cy:cy-r/2+40},// top-left red
    {x:cx+r/2,y:cy-r/2,cx:cx+r/2+40,cy:cy-r/2+40},// top-right green
    {x:cx-r/2,y:cy+r/2,cx:cx-r/2+40,cy:cy+r/2+40},// bottom-left blue
    {x:cx+r/2,y:cy+r/2,cx:cx+r/2+40,cy:cy+r/2+40} // bottom-right yellow
  ];
  
  positions.forEach((p,i)=>{
    const flash=d.flashColor===d.colors[i]||d.flashPlayer===i;
    ctx.fillStyle=flash?d.colors[i]:hexDim(d.colors[i],0.25);
    ctx.beginPath();ctx.arc(p.x,p.y,r/2-5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=d.colors[i];ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(p.x,p.y,r/2-5,0,Math.PI*2);ctx.stroke();
  });
  ctx.textAlign='left';
  renderLore();
}

function clickSimon(mx,my){
  const d=puzzleData;
  if(d.phase!=='input'||d.solved)return;
  const cx=450,cy=350,r=150;
  const positions=[{x:cx-r/2,y:cy-r/2},{x:cx+r/2,y:cy-r/2},{x:cx-r/2,y:cy+r/2},{x:cx+r/2,y:cy+r/2}];
  for(let i=0;i<4;i++){
    if(Math.hypot(mx-positions[i].x,my-positions[i].y)<r/2){
      d.flashPlayer=i;d.flashPlayerTimer=15;clickSnd();
      if(d.sequence[d.playerIdx]===i){
        d.playerIdx++;
        if(d.playerIdx>=d.sequence.length){
          if(d.round>=d.maxRounds){d.solved=true;successSnd();setTimeout(()=>levelComplete(),1000);}
          else{setTimeout(()=>addToSimonSequence(),800);}
        }
      }else{failSnd();d.phase='fail';setTimeout(()=>{d.phase='show';d.showIdx=0;d.showTimer=40;d.playerIdx=0;},1000);}
      return;
    }
  }
}

function hintSimon(){/* Replay sequence */}

// ===== PUZZLE 9: Maze =====
function initMaze(){
  const w=15,h=13;
  // Generate maze using recursive backtracker
  const grid=[];
  for(let y=0;y<h;y++){grid[y]=[];for(let x=0;x<w;x++){grid[y][x]={x,y,walls:{top:true,right:true,bottom:true,left:true},visited:false};}}
  const stack=[grid[0][0]];grid[0][0].visited=true;
  while(stack.length>0){
    const cur=stack[stack.length-1];
    const neighbors=[];
    if(cur.y>0&&!grid[cur.y-1][cur.x].visited)neighbors.push(grid[cur.y-1][cur.x]);
    if(cur.x<w-1&&!grid[cur.y][cur.x+1].visited)neighbors.push(grid[cur.y][cur.x+1]);
    if(cur.y<h-1&&!grid[cur.y+1][cur.x].visited)neighbors.push(grid[cur.y+1][cur.x]);
    if(cur.x>0&&!grid[cur.y][cur.x-1].visited)neighbors.push(grid[cur.y][cur.x-1]);
    if(neighbors.length>0){
      const next=neighbors[Math.floor(Math.random()*neighbors.length)];
      if(next.x>cur.x){cur.walls.right=false;next.walls.left=false;}
      if(next.x<cur.x){cur.walls.left=false;next.walls.right=false;}
      if(next.y>cur.y){cur.walls.bottom=false;next.walls.top=false;}
      if(next.y<cur.y){cur.walls.top=false;next.walls.bottom=false;}
      next.visited=true;stack.push(next);
    }else{stack.pop();}
  }
  
  // Place keys
  const keys=[];
  for(let i=0;i<3;i++){
    let kx,ky;
    do{kx=Math.floor(Math.random()*w);ky=Math.floor(Math.random()*h);}
    while((kx<2&&ky<2)||(kx>w-3&&ky>h-3)||keys.some(k=>Math.abs(k.x-kx)+Math.abs(k.y-ky)<3));
    keys.push({x:kx,y:ky,collected:false});
  }
  
  puzzleData={grid,w,h,playerX:1,playerY:1,exitX:w-2,exitY:h-2,keys,
    keysCollected:0,solved:false};
}

function renderMaze(){
  const d=puzzleData;
  ctx.fillStyle='#0a0a1f';ctx.fillRect(0,40,900,620);
  ctx.fillStyle='#a6f';ctx.font='20px monospace';ctx.textAlign='center';
  ctx.fillText('THE LABYRINTH',450,70);
  ctx.fillStyle='#888';ctx.font='13px monospace';
  ctx.fillText('Navigate the maze and collect all keys! Keys: '+d.keysCollected+'/3',450,95);
  
  const cs=Math.min(Math.floor((700)/d.w),Math.floor(550/d.h));
  const ox=(900-d.w*cs)/2,oy=110;
  
  for(let y=0;y<d.h;y++)for(let x=0;x<d.w;x++){
    const cell=d.grid[y][x];
    const px=ox+x*cs,py=oy+y*cs;
    if(x===d.playerX&&y===d.playerY){ctx.fillStyle='#0ff';ctx.fillRect(px+2,py+2,cs-4,cs-4);}
    else if(x===d.exitX&&y===d.exitY){
      ctx.fillStyle=d.keysCollected>=3?'#0f0':'#333';ctx.fillRect(px+2,py+2,cs-4,cs-4);
      ctx.fillStyle='#fff';ctx.font='10px monospace';ctx.fillText('EXIT',px+2,py+cs/2+4);
    }else{ctx.fillStyle='#111';ctx.fillRect(px+1,py+1,cs-2,cs-2);}
    ctx.strokeStyle='#333';ctx.lineWidth=2;
    if(cell.walls.top){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+cs,py);ctx.stroke();}
    if(cell.walls.right){ctx.beginPath();ctx.moveTo(px+cs,py);ctx.lineTo(px+cs,py+cs);ctx.stroke();}
    if(cell.walls.bottom){ctx.beginPath();ctx.moveTo(px,py+cs);ctx.lineTo(px+cs,py+cs);ctx.stroke();}
    if(cell.walls.left){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+cs);ctx.stroke();}
  }
  
  // Draw keys
  d.keys.forEach(k=>{
    if(k.collected)return;
    const px=ox+k.x*cs+cs/2,py=oy+k.y*cs+cs/2;
    ctx.fillStyle='#ff0';ctx.beginPath();ctx.moveTo(px,py-8);ctx.lineTo(px+6,py+2);ctx.lineTo(px-6,py+2);ctx.closePath();ctx.fill();
    ctx.fillRect(px-2,py+2,4,10);
  });
  ctx.textAlign='left';
  renderLore();
}

function clickMaze(mx,my){
  const d=puzzleData;if(d.solved)return;
  const cs=Math.min(Math.floor(700/d.w),Math.floor(550/d.h));
  const ox=(900-d.w*cs)/2,oy=110;
  
  // Determine direction clicked
  const pcx=ox+d.playerX*cs+cs/2,pcy=oy+d.playerY*cs+cs/2;
  const dx=mx-pcx,dy=my-pcy;
  let nx=d.playerX,ny=d.playerY;
  if(Math.abs(dx)>Math.abs(dy)){nx+=dx>0?1:-1;}else{ny+=dy>0?1:-1;}
  
  const cell=d.grid[d.playerY][d.playerX];
  if(nx===d.playerX+1&&!cell.walls.right)d.playerX=nx;
  else if(nx===d.playerX-1&&!cell.walls.left)d.playerX=nx;
  else if(ny===d.playerY+1&&!cell.walls.bottom)d.playerY=ny;
  else if(ny===d.playerY-1&&!cell.walls.top)d.playerY=ny;
  else return;
  
  moves++;clickSnd();
  
  // Check keys
  d.keys.forEach(k=>{
    if(!k.collected&&k.x===d.playerX&&k.y===d.playerY){
      k.collected=true;d.keysCollected++;keySnd();
    }
  });
  
  // Check exit
  if(d.playerX===d.exitX&&d.playerY===d.exitY&&d.keysCollected>=3){
    d.solved=true;successSnd();setTimeout(()=>levelComplete(),1000);
  }
}

function hintMaze(){
  const d=puzzleData;
  // Find nearest uncollected key
  let nearest=null,nd=Infinity;
  d.keys.forEach(k=>{
    if(k.collected)return;
    const dist=Math.abs(k.x-d.playerX)+Math.abs(k.y-d.playerY);
    if(dist<nd){nd=dist;nearest=k;}
  });
  if(nearest){d.playerX=nearest.x;d.playerY=nearest.y;
    nearest.collected=true;d.keysCollected++;keySnd();moves+=5;}
}

// ===== PUZZLE 10: Final Boss =====
function initBoss(){
  puzzleData={phase:0,solved:false,subPuzzles:[
    {type:'pattern',done:false},{type:'cipher',done:false},{type:'color',done:false}
  ],subData:{}};
  initPatternSub();initCipherSub();initColorSub();
}

function initPatternSub(){
  const colors=['#f00','#0f0','#00f','#ff0'];
  const seq=[];for(let i=0;i<4;i++)seq.push(Math.floor(Math.random()*4));
  puzzleData.subData.pattern={seq,playerSeq:[],phase:'show',showIdx:0,showTimer:0,colors,flashTimer:0,flashColor:null};
}

function initCipherSub(){
  puzzleData.subData.cipher={word:'FINAL',encrypted:'ILQDO',playerInput:Array(5).fill(''),selectedPos:0,shift:3,showShift:false};
}

function initColorSub(){
  puzzleData.subData.color={target:{r:200,g:100,b:255},sliders:{r:128,g:128,b:128},solved:false};
}

function renderBoss(){
  const d=puzzleData;
  ctx.fillStyle='#0a0a1f';ctx.fillRect(0,40,900,620);
  ctx.fillStyle='#f0f';ctx.font='20px monospace';ctx.textAlign='center';
  ctx.fillText('THE FINAL TEMPLE',450,70);
  ctx.fillStyle='#888';ctx.font='13px monospace';
  ctx.fillText('Solve all three mini-puzzles!',450,95);
  
  // Progress indicators
  d.subPuzzles.forEach((sp,i)=>{
    ctx.fillStyle=sp.done?'#0f0':'#333';
    ctx.fillRect(200+i*200,110,150,30);
    ctx.strokeStyle=sp.done?'#0f0':'#666';ctx.strokeRect(200+i*200,110,150,30);
    ctx.fillStyle='#fff';ctx.font='12px monospace';
    ctx.fillText(sp.done?'DONE':sp.type.toUpperCase(),275+i*200,130);
  });
  
  if(d.phase===0&&!d.subPuzzles[0].done)renderPatternSub();
  else if(d.phase===0)d.phase=1;
  if(d.phase===1&&!d.subPuzzles[1].done)renderCipherSub();
  else if(d.phase===1)d.phase=2;
  if(d.phase===2&&!d.subPuzzles[2].done)renderColorSub();
  
  ctx.textAlign='left';
  if(d.subPuzzles.every(p=>p.done)&&!d.solved){
    d.solved=true;successSnd();setTimeout(()=>levelComplete(),1000);
  }
  renderLore();
}

function renderPatternSub(){
  const d=puzzleData.subData.pattern;
  if(d.phase==='show'){
    d.showTimer--;
    if(d.showTimer<=0){
      if(d.showIdx<d.seq.length){
        d.flashColor=d.colors[d.seq[d.showIdx]];d.flashTimer=25;d.showIdx++;d.showTimer=35;clickSnd();
      }else d.phase='input';
    }
  }
  if(d.flashTimer>0){d.flashTimer--;if(d.flashTimer<=0)d.flashColor=null;}
  
  ctx.fillStyle='#a6f';ctx.font='14px monospace';ctx.textAlign='center';ctx.fillText('1. Repeat Pattern',450,170);
  const bw=70;
  for(let i=0;i<4;i++){
    const x=300+i*80,y=200;
    ctx.fillStyle=d.flashColor===d.colors[i]?d.colors[i]:hexDim(d.colors[i],0.3);
    ctx.fillRect(x,y,bw,bw);ctx.strokeStyle=d.colors[i];ctx.strokeRect(x,y,bw,bw);
  }
  ctx.fillStyle='#fff';ctx.font='12px monospace';ctx.fillText('Progress: '+d.playerSeq.length+'/'+d.seq.length,450,310);
}

function renderCipherSub(){
  const d=puzzleData.subData.cipher;
  ctx.fillStyle='#a6f';ctx.font='14px monospace';ctx.textAlign='center';ctx.fillText('2. Decode: '+d.encrypted+(d.showShift?' (shift:'+d.shift+')':''),450,340);
  for(let i=0;i<5;i++){
    const x=320+i*35,y=370;
    ctx.fillStyle=i===d.selectedPos?'#2a2a4a':'#111';
    ctx.fillRect(x,y,30,35);ctx.strokeStyle=i===d.selectedPos?'#ff0':'#444';ctx.strokeRect(x,y,30,35);
    ctx.fillStyle=d.playerInput[i]?'#fff':'#444';ctx.font='20px monospace';ctx.fillText(d.playerInput[i]||'_',x+15,y+25);
  }
}

function renderColorSub(){
  const d=puzzleData.subData.color;
  ctx.fillStyle='#a6f';ctx.font='14px monospace';ctx.textAlign='center';ctx.fillText('3. Match Color',450,480);
  ctx.fillStyle=`rgb(${d.target.r},${d.target.g},${d.target.b})`;ctx.fillRect(350,500,60,60);
  ctx.strokeStyle='#fff';ctx.strokeRect(350,500,60,60);
  ctx.fillStyle=`rgb(${d.sliders.r},${d.sliders.g},${d.sliders.b})`;ctx.fillRect(490,500,60,60);
  ctx.strokeStyle='#fff';ctx.strokeRect(490,500,60,60);
  ['r','g','b'].forEach((c,i)=>{
    ctx.fillStyle=['#f00','#0f0','#00f'][i];ctx.fillRect(350,580+i*20,d.sliders[c]/255*200,15);
    ctx.strokeStyle='#444';ctx.strokeRect(350,580+i*20,200,15);
  });
  ctx.fillStyle='#0f0';ctx.fillRect(420,640,60,30);ctx.fillStyle='#000';ctx.font='12px monospace';ctx.fillText('CHECK',450,660);
}

function clickBoss(mx,my){
  const d=puzzleData;
  // Pattern sub
  if(d.phase===0&&!d.subPuzzles[0].done){
    const pd=d.subData.pattern;
    if(pd.phase==='input'){
      for(let i=0;i<4;i++){
        if(mx>=300+i*80&&mx<=300+i*80+70&&my>=200&&my<=270){
          pd.flashColor=pd.colors[i];pd.flashTimer=15;clickSnd();
          pd.playerSeq.push(i);
          if(pd.playerSeq[pd.playerSeq.length-1]!==pd.seq[pd.playerSeq.length-1]){
            failSnd();pd.playerSeq=[];return;
          }
          if(pd.playerSeq.length===pd.seq.length){d.subPuzzles[0].done=true;successSnd();d.phase=1;}
          return;
        }
      }
    }
  }
  // Cipher sub
  if(d.phase===1&&!d.subPuzzles[1].done){
    const cd=d.subData.cipher;
    for(let i=0;i<5;i++){if(mx>=320+i*35&&mx<=320+i*35+30&&my>=370&&my<=405){cd.selectedPos=i;return;}}
    const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for(let i=0;i<26;i++){
      const r=Math.floor(i/13),c=i%13;
      const x=280+c*30,y=420+r*30;
      if(mx>=x&&mx<=x+25&&my>=y&&my<=y+25){
        cd.playerInput[cd.selectedPos]=letters[i];cd.selectedPos=Math.min(cd.selectedPos+1,4);clickSnd();
        if(cd.playerInput.join('')===cd.word){d.subPuzzles[1].done=true;successSnd();d.phase=2;}
        return;
      }
    }
  }
  // Color sub
  if(d.phase===2&&!d.subPuzzles[2].done){
    const ld=d.subData.color;
    ['r','g','b'].forEach((c,i)=>{
      if(mx>=350&&mx<=550&&my>=580+i*20&&my<=580+i*20+20){
        ld.sliders[c]=Math.round((mx-350)/200*255);ld.sliders[c]=Math.max(0,Math.min(255,ld.sliders[c]));clickSnd();
      }
    });
    if(mx>=420&&mx<=480&&my>=640&&my<=670){
      const ok=Math.abs(ld.target.r-ld.sliders.r)<30&&Math.abs(ld.target.g-ld.sliders.g)<30&&Math.abs(ld.target.b-ld.sliders.b)<30;
      if(ok){d.subPuzzles[2].done=true;successSnd();}else failSnd();
    }
  }
}

function hintBoss(){const d=puzzleData;d.subData.cipher.showShift=true;
  d.subData.color.sliders.r=d.subData.color.target.r;d.subData.color.sliders.g=d.subData.color.target.g;d.subData.color.sliders.b=d.subData.color.target.b;}

// ===== General Functions =====
function hexDim(hex,factor){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.floor(r*factor)},${Math.floor(g*factor)},${Math.floor(b*factor)})`;
}

function renderLore(){
  // Lore fragment - collectible in bottom right
  const lx=750,ly=620;
  if(!loreFound){
    ctx.fillStyle='rgba(240,0,255,0.2)';ctx.beginPath();ctx.arc(lx,ly,15,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#f0f';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#f0f';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText('LORE',lx,ly+4);
  }else{
    ctx.fillStyle='#0f0';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText('LORE FOUND',lx,ly+4);
  }
  ctx.textAlign='left';
}

function clickLore(mx,my){
  if(!loreFound&&mx>=735&&mx<=765&&my>=605&&my<=635){
    loreFound=true;keySnd();document.getElementById('hud-lore-found').textContent='1';
  }
}

const puzzleInits=[initPattern,initSliding,initLogic,initCipher,initPipes,initLight,initColor,initSimon,initMaze,initBoss];
const puzzleUpdates=[updatePattern,updateSliding,updateLogic,null,null,null,null,updateSimon,null,null];
const puzzleRenders=[renderPattern,renderSliding,renderLogic,renderCipher,renderPipes,renderLight,renderColor,renderSimon,renderMaze,renderBoss];
const puzzleClicks=[clickPattern,clickSliding,clickLogic,clickCipher,clickPipes,clickLight,clickColor,clickSimon,clickMaze,clickBoss];
const puzzleHints=[hintPattern,hintSliding,hintLogic,hintCipher,hintPipes,hintLight,hintColor,hintSimon,hintMaze,hintBoss];

function initLevel(idx){
  levelIdx=idx;hints=3;hintsUsed=0;moves=0;timer=0;loreFound=false;
  puzzleData={};
  puzzleInits[idx]();
  state='playing';
  showScreen(null);
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('hud-level').textContent=templeNames[idx];
  document.getElementById('hud-hints').textContent=hints;
  document.getElementById('hud-timer').textContent='0';
  document.getElementById('hud-moves').textContent='0';
  document.getElementById('hud-lore-found').textContent='0';
}

function levelComplete(){
  state='result';
  const stars=3-Math.min(hintsUsed,2);
  if(!completedLevels.includes(levelIdx)){completedLevels.push(levelIdx);}
  totalStars=0;completedLevels.forEach(i=>totalStars+=3);// Simplified
  saveProgress();
  const earned=100+(2-hintsUsed)*25+(loreFound?50:0)+stars*10;
  coins=getCoins()+earned;saveCoins(coins);
  
  document.getElementById('result-title').textContent='TEMPLE CLEARED';
  document.getElementById('result-title').style.color='#0f0';
  document.getElementById('result-stats').innerHTML=
    `<p>Temple: <span>${templeNames[levelIdx]}</span></p>`+
    `<p>Time: <span>${Math.floor(timer/60)}s</span></p>`+
    `<p>Moves: <span>${moves}</span></p>`+
    `<p>Hints Used: <span>${hintsUsed}</span></p>`+
    `<p>Stars: <span>${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</span></p>`;
  document.getElementById('result-lore').textContent=loreFound?loreTexts[levelIdx]:'Lore fragment not found...';
  document.getElementById('result-lore').style.display=loreFound?'block':'none';
  document.getElementById('result-coins').textContent='+'+earned;
  const nextBtn=document.getElementById('btn-next');
  nextBtn.textContent=levelIdx>=9?'QUEST COMPLETE!':'NEXT TEMPLE';
  showScreen('result-screen');document.getElementById('hud').classList.add('hidden');
}

function update(){
  if(state!=='playing')return;
  timer++;
  document.getElementById('hud-timer').textContent=Math.floor(timer/60);
  document.getElementById('hud-moves').textContent=moves;
  document.getElementById('hud-coins').textContent=getCoins();
  if(puzzleUpdates[levelIdx])puzzleUpdates[levelIdx]();
}

function render(){
  ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,900,700);
  if(state==='playing'){puzzleRenders[levelIdx]();}
}

function gameLoop(){update();render();requestAnimationFrame(gameLoop);}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));if(id)document.getElementById(id).classList.add('active');}

// Click handler
canvas.addEventListener('click',e=>{
  if(AC.state==='suspended')try{getAC();if(AC)try{getAC();if(AC)AC.resume();}catch(e){};}catch(e){}
  if(state!=='playing')return;
  const r=canvas.getBoundingClientRect();
  const mx=e.clientX-r.left,my=e.clientY-r.top;
  clickLore(mx,my);
  if(my>40)puzzleClicks[levelIdx](mx,my);
});

// Hint button
document.getElementById('btn-hint').onclick=()=>{
  if(state!=='playing'||hints<=0)return;
  hints--;hintsUsed++;
  document.getElementById('hud-hints').textContent=hints;
  hintSnd();puzzleHints[levelIdx]();
};

// Menu
document.getElementById('btn-start').onclick=()=>{
  let startIdx=0;
  for(let i=0;i<10;i++){if(!completedLevels.includes(i)){startIdx=i;break;}}
  initLevel(startIdx);
};
document.getElementById('btn-how').onclick=()=>showScreen('how-screen');
document.getElementById('btn-back-how').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();document.getElementById('menu-stars').textContent=totalStars;};

document.getElementById('btn-levels').onclick=()=>{
  const grid=document.getElementById('level-grid');
  grid.innerHTML='';
  for(let i=0;i<10;i++){
    const btn=document.createElement('button');
    btn.className='level-btn';
    if(completedLevels.includes(i))btn.classList.add('completed');
    const locked=i>0&&!completedLevels.includes(i-1)&&!completedLevels.includes(i);
    if(locked)btn.classList.add('locked');
    btn.innerHTML=`<div>${i+1}. ${templeNames[i].replace('Temple of ','')}</div><div class="level-stars">${completedLevels.includes(i)?'★★★':'☆☆☆'}</div>`;
    if(!locked){btn.onclick=()=>initLevel(i);}
    grid.appendChild(btn);
  }
  document.getElementById('select-coins').textContent=getCoins();
  showScreen('level-select');
};
document.getElementById('btn-back-select').onclick=()=>{showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();document.getElementById('menu-stars').textContent=totalStars;};
document.getElementById('btn-next').onclick=()=>{
  if(levelIdx>=9){showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();document.getElementById('menu-stars').textContent=totalStars;return;}
  showAd();
};
document.getElementById('btn-menu').onclick=()=>{
  state='menu';showScreen('menu-screen');document.getElementById('menu-coins').textContent=getCoins();document.getElementById('menu-stars').textContent=totalStars;
};

function showAd(){
  state='ad';let t=3;
  document.getElementById('ad-timer').textContent=t;
  showScreen('ad-screen');
  const iv=setInterval(()=>{t--;document.getElementById('ad-timer').textContent=t;
    if(t<=0){clearInterval(iv);hints++;hintsUsed=Math.max(0,hintsUsed-1);initLevel(levelIdx+1);}
  },1000);
}

document.getElementById('menu-coins').textContent=getCoins();
document.getElementById('menu-stars').textContent=totalStars;
gameLoop();
})();
