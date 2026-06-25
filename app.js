/* ==========================================================================
   Akari Museum - 夜の美術館パズル JavaScript
   ========================================================================== */

// --- Preset Game Boards ---
const PRESETS = {
  easy: [
    [".", "1", ".", ".", "."],
    [".", ".", ".", "#", "."],
    [".", "#", "2", "#", "."],
    [".", "#", ".", ".", "."],
    [".", ".", ".", "0", "."]
  ],
  normal: [
    [".", ".", "#", ".", "1", ".", "."],
    [".", ".", ".", ".", ".", ".", "."],
    ["#", ".", "2", ".", "0", ".", "#"],
    [".", ".", ".", ".", ".", ".", "."],
    ["#", ".", "1", ".", "2", ".", "#"],
    [".", ".", ".", ".", ".", ".", "."],
    [".", ".", "0", ".", "#", ".", "."]
  ],
  hard: [
    [".", ".", ".", ".", "#", ".", ".", ".", ".", "."],
    [".", "2", ".", ".", ".", ".", "1", ".", "0", "."],
    [".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
    [".", ".", ".", "1", ".", ".", "2", ".", ".", "."],
    ["#", ".", ".", ".", ".", ".", ".", ".", ".", "1"],
    ["1", ".", ".", ".", ".", ".", ".", ".", ".", "#"],
    [".", ".", ".", "2", ".", ".", "1", ".", ".", "."],
    [".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
    [".", "0", ".", "2", ".", ".", ".", ".", "1", "."],
    [".", ".", ".", ".", ".", "#", ".", ".", ".", "."]
  ]
};

// --- Game State ---
const gameState = {
  level: 'easy',
  H: 0,
  W: 0,
  grid: [],        // 2D Array of strings (from PRESETS)
  bulbs: [],       // 2D Array of booleans
  marks: [],       // 2D Array of booleans
  inputMode: 'lightbulb', // 'lightbulb' or 'dot'
  moves: 0,
  startTime: null,
  elapsedTime: 0,
  timerInterval: null,
  isCleared: false,
  targetBulbsCount: 0 // Estimated target or total white cells
};

// --- DOM Elements ---
const boardEl = document.getElementById('museum-board');
const timerEl = document.getElementById('game-timer');
const counterEl = document.getElementById('light-counter');

const btnEasy = document.getElementById('btn-easy');
const btnNormal = document.getElementById('btn-normal');
const btnHard = document.getElementById('btn-hard');

const btnModeLight = document.getElementById('btn-mode-light');
const btnModeDot = document.getElementById('btn-mode-dot');

const btnReset = document.getElementById('btn-reset');
const btnGiveUp = document.getElementById('btn-giveup');

const btnRule = document.getElementById('btn-rule');
const ruleModal = document.getElementById('rule-modal');
const btnCloseRule = document.getElementById('btn-close-rule');
const btnRuleOk = document.getElementById('btn-rule-ok');

const clearModal = document.getElementById('clear-modal');
const btnClearNext = document.getElementById('btn-clear-next');
const statLevel = document.getElementById('stat-level');
const statTime = document.getElementById('stat-time');
const statMoves = document.getElementById('stat-moves');

// Confetti Setup
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let confettiParticles = [];
let confettiAnimationId = null;

// --- Initialize App ---
function init() {
  setupEventListeners();
  loadLevel('easy');
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Level selection
  btnEasy.addEventListener('click', () => loadLevel('easy'));
  btnNormal.addEventListener('click', () => loadLevel('normal'));
  btnHard.addEventListener('click', () => loadLevel('hard'));

  // Input Mode Toggles
  btnModeLight.addEventListener('click', () => setInputMode('lightbulb'));
  btnModeDot.addEventListener('click', () => setInputMode('dot'));

  // Action Buttons
  btnReset.addEventListener('click', resetBoard);
  btnGiveUp.addEventListener('click', giveUpAndSolve);

  // Modals
  btnRule.addEventListener('click', () => showModal(ruleModal));
  btnCloseRule.addEventListener('click', () => hideModal(ruleModal));
  btnRuleOk.addEventListener('click', () => hideModal(ruleModal));
  ruleModal.addEventListener('click', (e) => {
    if (e.target === ruleModal) hideModal(ruleModal);
  });

  btnClearNext.addEventListener('click', () => {
    hideModal(clearModal);
    // Cycle to next difficulty level
    if (gameState.level === 'easy') loadLevel('normal');
    else if (gameState.level === 'normal') loadLevel('hard');
    else loadLevel('easy');
  });

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if (gameState.isCleared) return;
    const key = e.key.toLowerCase();
    if (e.code === 'Space' || key === 'space' || key === 'm') {
      e.preventDefault();
      setInputMode(gameState.inputMode === 'lightbulb' ? 'dot' : 'lightbulb');
    } else if (key === 'l') {
      setInputMode('lightbulb');
    } else if (key === 'd') {
      setInputMode('dot');
    } else if (key === 'r') {
      resetBoard();
    }
  });

  // Prevent browser context menu on board right-click
  boardEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Handle window resizing for Canvas
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// --- Modal Controls ---
function showModal(modal) {
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function hideModal(modal) {
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
}

// --- Load / Start Level ---
function loadLevel(levelKey) {
  // Stop current timer
  stopTimer();

  gameState.level = levelKey;
  const sourceGrid = PRESETS[levelKey];
  gameState.H = sourceGrid.length;
  gameState.W = sourceGrid[0].length;
  gameState.grid = sourceGrid.map(row => [...row]);
  
  // Initialize state arrays
  gameState.bulbs = Array.from({ length: gameState.H }, () => Array(gameState.W).fill(false));
  gameState.marks = Array.from({ length: gameState.H }, () => Array(gameState.W).fill(false));
  
  gameState.moves = 0;
  gameState.elapsedTime = 0;
  gameState.startTime = null;
  gameState.isCleared = false;
  
  // Reset celebration
  boardEl.classList.remove('clear-animation');
  stopConfetti();

  // Highlight level active state
  [btnEasy, btnNormal, btnHard].forEach(btn => btn.classList.remove('active'));
  if (levelKey === 'easy') btnEasy.classList.add('active');
  if (levelKey === 'normal') btnNormal.classList.add('active');
  if (levelKey === 'hard') btnHard.classList.add('active');

  // Update UI metadata attributes
  boardEl.setAttribute('data-size', gameState.H);
  timerEl.textContent = '00:00';

  // Build Board DOM
  buildBoardDOM();
  updateUI();
}

// --- Grid Logic Helpers ---
function inBounds(r, c) {
  return r >= 0 && r < gameState.H && c >= 0 && c < gameState.W;
}

function isWhite(r, c) {
  return inBounds(r, c) && gameState.grid[r][c] === '.';
}

function isBlack(r, c) {
  return inBounds(r, c) && gameState.grid[r][c] !== '.';
}

function getBlackNum(r, c) {
  if (!inBounds(r, c)) return null;
  const cell = gameState.grid[r][c];
  if (cell >= '0' && cell <= '4') return parseInt(cell, 10);
  return null;
}

// --- Reachability and Illumination Logic ---
// Returns true if cell A and cell B are in line of sight (no black cells in between)
function reach(r1, c1, r2, c2) {
  if (!inBounds(r1, c1) || !inBounds(r2, c2)) return false;
  if (r1 !== r2 && c1 !== c2) return false; // Must be same row or column

  if (r1 === r2) {
    // Check horizontal path
    const minC = Math.min(c1, c2);
    const maxC = Math.max(c1, c2);
    for (let c = minC; c <= maxC; c++) {
      if (isBlack(r1, c)) return false;
    }
    return true;
  } else {
    // Check vertical path
    const minR = Math.min(r1, r2);
    const maxR = Math.max(r1, r2);
    for (let r = minR; r <= maxR; r++) {
      if (isBlack(r, c1)) return false;
    }
    return true;
  }
}

// Orthogonal Direction Vectors
const DIRS = [
  [-1, 0], // Up
  [1, 0],  // Down
  [0, -1], // Left
  [0, 1]   // Right
];

// Returns adjacent cell coordinates
function getAdjacent(r, c) {
  const adj = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) {
      adj.push([nr, nc]);
    }
  }
  return adj;
}

// --- Calculation of Illumination & Violations ---

// Computes which cells are illuminated and what errors exist
function calculateBoardDetails() {
  const illuminated = Array.from({ length: gameState.H }, () => Array(gameState.W).fill(false));
  const collisionLine = Array.from({ length: gameState.H }, () => Array(gameState.W).fill(false));
  const errorBulbs = Array.from({ length: gameState.H }, () => Array(gameState.W).fill(false));
  const wallStates = Array.from({ length: gameState.H }, () => Array(gameState.W).fill('normal')); // 'normal', 'satisfied', 'error'

  // 1. Calculate lights propagation
  for (let r = 0; r < gameState.H; r++) {
    for (let c = 0; c < gameState.W; c++) {
      if (gameState.bulbs[r][c]) {
        illuminated[r][c] = true;
        // propagate in 4 directions
        for (const [dr, dc] of DIRS) {
          let nr = r + dr;
          let nc = c + dc;
          while (inBounds(nr, nc) && isWhite(nr, nc)) {
            illuminated[nr][nc] = true;
            nr += dr;
            nc += dc;
          }
        }
      }
    }
  }

  // 2. Check collision between bulbs (lightbulbs illuminating each other)
  // Also track the visual light beam lines connecting conflicting bulbs
  for (let r = 0; r < gameState.H; r++) {
    for (let c = 0; c < gameState.W; c++) {
      if (gameState.bulbs[r][c]) {
        // Look ahead in Down and Right directions to find conflicts (avoids double check)
        // Down
        let nr = r + 1;
        while (inBounds(nr, c) && isWhite(nr, c)) {
          if (gameState.bulbs[nr][c]) {
            errorBulbs[r][c] = true;
            errorBulbs[nr][c] = true;
            // Mark all intermediate cells as part of conflict line
            for (let tr = r; tr <= nr; tr++) {
              collisionLine[tr][c] = true;
            }
          }
          nr++;
        }
        // Right
        let nc = c + 1;
        while (inBounds(r, nc) && isWhite(r, nc)) {
          if (gameState.bulbs[r][nc]) {
            errorBulbs[r][c] = true;
            errorBulbs[r][nc] = true;
            // Mark all intermediate cells as part of conflict line
            for (let tc = c; tc <= nc; tc++) {
              collisionLine[r][tc] = true;
            }
          }
          nc++;
        }
      }
    }
  }

  // 3. Evaluate Labeled Black Cells
  for (let r = 0; r < gameState.H; r++) {
    for (let c = 0; c < gameState.W; c++) {
      const num = getBlackNum(r, c);
      if (num !== null) {
        const adj = getAdjacent(r, c);
        let bulbCount = 0;
        for (const [ar, ac] of adj) {
          if (gameState.bulbs[ar][ac]) bulbCount++;
        }

        if (bulbCount === num) {
          wallStates[r][c] = 'satisfied';
        } else if (bulbCount > num) {
          wallStates[r][c] = 'error'; // Too many bulbs
        } else {
          wallStates[r][c] = 'normal'; // Incomplete
        }
      }
    }
  }

  return { illuminated, collisionLine, errorBulbs, wallStates };
}

// --- Check Solved State ---
function checkSolved() {
  const { illuminated, errorBulbs, wallStates } = calculateBoardDetails();

  // 1. Every white cell must be illuminated
  for (let r = 0; r < gameState.H; r++) {
    for (let c = 0; c < gameState.W; c++) {
      if (isWhite(r, c) && !illuminated[r][c]) {
        return false;
      }
    }
  }

  // 2. No lightbulb conflicts
  for (let r = 0; r < gameState.H; r++) {
    for (let c = 0; c < gameState.W; c++) {
      if (errorBulbs[r][c]) {
        return false;
      }
    }
  }

  // 3. Labeled black cells must have exact matching adjacent bulb count
  for (let r = 0; r < gameState.H; r++) {
    for (let c = 0; c < gameState.W; c++) {
      const num = getBlackNum(r, c);
      if (num !== null && wallStates[r][c] !== 'satisfied') {
        return false;
      }
    }
  }

  // 4. Bulbs can only be placed on white cells (implicitly checked by interaction, but check here)
  for (let r = 0; r < gameState.H; r++) {
    for (let c = 0; c < gameState.W; c++) {
      if (gameState.bulbs[r][c] && !isWhite(r, c)) {
        return false;
      }
    }
  }

  return true;
}

// --- DOM Rendering & Updating ---
function buildBoardDOM() {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateRows = `repeat(${gameState.H}, 1fr)`;
  boardEl.style.gridTemplateColumns = `repeat(${gameState.W}, 1fr)`;

  for (let r = 0; r < gameState.H; r++) {
    for (let c = 0; c < gameState.W; c++) {
      const cellEl = document.createElement('div');
      cellEl.classList.add('board-cell');
      cellEl.setAttribute('data-row', r);
      cellEl.setAttribute('data-col', c);
      cellEl.id = `cell-${r}-${c}`;

      const cellType = gameState.grid[r][c];
      if (cellType === '.') {
        cellEl.classList.add('cell-empty');
      } else {
        cellEl.classList.add('cell-wall');
        if (cellType !== '#') {
          cellEl.classList.add('wall-numbered');
          cellEl.textContent = cellType;
        }
      }

      // Interaction Events
      setupCellInteractions(cellEl, r, c);
      boardEl.appendChild(cellEl);
    }
  }
}

// Interaction handling (Click / Long Press / Right click)
function setupCellInteractions(cellEl, r, c) {
  let touchStartTime = 0;
  let touchTimer = null;

  // Mouse Up or Left/Right Clicks
  cellEl.addEventListener('mousedown', (e) => {
    if (gameState.isCleared) return;
    e.preventDefault();

    startTimerIfNeeded();

    if (e.button === 0) {
      // Left click
      handleCellInteraction(r, c, gameState.inputMode);
    } else if (e.button === 2) {
      // Right click
      handleCellInteraction(r, c, 'dot');
    }
  });

  // Mobile Touch Support with Long-Press (300ms) for Mark Toggle
  cellEl.addEventListener('touchstart', (e) => {
    if (gameState.isCleared) return;
    e.preventDefault();

    startTimerIfNeeded();
    touchStartTime = Date.now();

    touchTimer = setTimeout(() => {
      // Trigger dot mark on long press
      handleCellInteraction(r, c, 'dot');
      touchTimer = null;
    }, 320);
  });

  cellEl.addEventListener('touchend', (e) => {
    if (gameState.isCleared) return;
    e.preventDefault();

    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
      // Trigger standard tap (depends on current input mode toggle)
      handleCellInteraction(r, c, gameState.inputMode);
    }
  });
}

// Toggle cell content
function handleCellInteraction(r, c, mode) {
  if (!isWhite(r, c)) return;

  let changed = false;

  if (mode === 'lightbulb') {
    if (gameState.bulbs[r][c]) {
      gameState.bulbs[r][c] = false;
      changed = true;
    } else {
      gameState.bulbs[r][c] = true;
      gameState.marks[r][c] = false; // placing light clears mark
      changed = true;
    }
  } else if (mode === 'dot') {
    if (gameState.marks[r][c]) {
      gameState.marks[r][c] = false;
      changed = true;
    } else {
      gameState.marks[r][c] = true;
      gameState.bulbs[r][c] = false; // placing mark clears light
      changed = true;
    }
  }

  if (changed) {
    gameState.moves++;
    updateUI();
    
    // Check solve
    if (checkSolved()) {
      handleClearCelebration();
    }
  }
}

// Update board visual classes & text labels
function updateUI() {
  const { illuminated, collisionLine, errorBulbs, wallStates } = calculateBoardDetails();

  let bulbCount = 0;

  for (let r = 0; r < gameState.H; r++) {
    for (let c = 0; c < gameState.W; c++) {
      const cellEl = document.getElementById(`cell-${r}-${c}`);
      if (!cellEl) continue;

      // Reset classes
      cellEl.className = 'board-cell';

      if (isWhite(r, c)) {
        cellEl.classList.add('cell-empty');
        
        // Apply Bulbs & Marks
        if (gameState.bulbs[r][c]) {
          cellEl.classList.add('cell-lightbulb');
          bulbCount++;
          if (errorBulbs[r][c]) {
            cellEl.classList.add('status-error');
          }
        } else if (gameState.marks[r][c]) {
          cellEl.classList.add('cell-marked');
        }

        // Apply Illumination states
        if (illuminated[r][c]) {
          cellEl.classList.add('cell-illuminated');
        }
        if (collisionLine[r][c]) {
          cellEl.classList.add('status-error');
        }
      } else {
        cellEl.classList.add('cell-wall');
        const num = getBlackNum(r, c);
        if (num !== null) {
          cellEl.classList.add('wall-numbered');
          if (wallStates[r][c] === 'satisfied') {
            cellEl.classList.add('wall-satisfied');
          } else if (wallStates[r][c] === 'error') {
            cellEl.classList.add('wall-error');
          }
        }
      }
    }
  }

  // Update Counters
  const totalSlots = getEstimateRequiredBulbs();
  counterEl.textContent = `${bulbCount} / ${totalSlots}`;
}

// Estimate reasonable bulbs count based on difficulty
function getEstimateRequiredBulbs() {
  if (gameState.level === 'easy') return 6;
  if (gameState.level === 'normal') return 9;
  return 16;
}

// Toggle Toolbar input mode
function setInputMode(mode) {
  gameState.inputMode = mode;
  btnModeLight.classList.remove('active');
  btnModeDot.classList.remove('active');

  boardEl.classList.remove('mode-lightbulb', 'mode-dot');

  if (mode === 'lightbulb') {
    btnModeLight.classList.add('active');
    boardEl.classList.add('mode-lightbulb');
  } else {
    btnModeDot.classList.add('active');
    boardEl.classList.add('mode-dot');
  }
}

// Reset board bulbs and marks
function resetBoard() {
  if (gameState.isCleared) {
    // Reset celebration state
    boardEl.classList.remove('clear-animation');
    stopConfetti();
    gameState.isCleared = false;
  }
  
  gameState.bulbs = Array.from({ length: gameState.H }, () => Array(gameState.W).fill(false));
  gameState.marks = Array.from({ length: gameState.H }, () => Array(gameState.W).fill(false));
  gameState.moves = 0;
  gameState.elapsedTime = 0;
  gameState.startTime = null;
  stopTimer();
  timerEl.textContent = '00:00';
  updateUI();
}

// --- Timer Implementation ---
function startTimerIfNeeded() {
  if (gameState.startTime === null && !gameState.isCleared) {
    gameState.startTime = Date.now();
    gameState.timerInterval = setInterval(() => {
      gameState.elapsedTime = Math.floor((Date.now() - gameState.startTime) / 1000);
      formatTimer();
    }, 1000);
  }
}

function stopTimer() {
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }
}

function formatTimer() {
  const m = Math.floor(gameState.elapsedTime / 60).toString().padStart(2, '0');
  const s = (gameState.elapsedTime % 60).toString().padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
}

// --- Backtracking Solver (Give Up Feature) ---
function giveUpAndSolve() {
  if (gameState.isCleared) return;
  
  // Clear any marks/bulbs first to avoid interference
  gameState.bulbs = Array.from({ length: gameState.H }, () => Array(gameState.W).fill(false));
  gameState.marks = Array.from({ length: gameState.H }, () => Array(gameState.W).fill(false));

  const solution = solveAkari(gameState.grid);
  if (solution) {
    gameState.bulbs = solution.map(row => row.map(cell => cell === 1));
    gameState.moves++;
    updateUI();
    handleClearCelebration();
  } else {
    alert("この盤面には解が存在しません。");
  }
}

// Fully general Akari solver in-browser
function solveAkari(grid) {
  const H = grid.length;
  const W = grid[0].length;

  const isW = (r, c) => grid[r][c] === '.';
  const isB = (r, c) => grid[r][c] !== '.';
  const getBNum = (r, c) => {
    const val = grid[r][c];
    return (val >= '0' && val <= '4') ? parseInt(val, 10) : null;
  };
  const inB = (r, c) => r >= 0 && r < H && c >= 0 && c < W;

  // Paths check (Reachability)
  function reachCheck(r1, c1, r2, c2) {
    if (r1 === r2) {
      const minC = Math.min(c1, c2);
      const maxC = Math.max(c1, c2);
      for (let c = minC; c <= maxC; c++) {
        if (isB(r1, c)) return false;
      }
      return true;
    }
    if (c1 === c2) {
      const minR = Math.min(r1, r2);
      const maxR = Math.max(r1, r2);
      for (let r = minR; r <= maxR; r++) {
        if (isB(r, c1)) return false;
      }
      return true;
    }
    return false;
  }

  // Orthogonal neighbors
  const Dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  function getAdjCells(r, c) {
    const adj = [];
    for (const [dr, dc] of Dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (inB(nr, nc)) adj.push([nr, nc]);
    }
    return adj;
  }

  const solverBulbs = Array.from({ length: H }, () => Array(W).fill(false));
  const whiteCells = [];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (isW(r, c)) whiteCells.push([r, c]);
    }
  }

  let finalSolution = null;

  // Fully validate final board constraints
  function validateAll() {
    // Collision check
    for (let i = 0; i < whiteCells.length; i++) {
      const [r1, c1] = whiteCells[i];
      if (!solverBulbs[r1][c1]) continue;
      for (let j = i + 1; j < whiteCells.length; j++) {
        const [r2, c2] = whiteCells[j];
        if (!solverBulbs[r2][c2]) continue;
        if (reachCheck(r1, c1, r2, c2)) return false;
      }
    }

    // Number constraint check
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const num = getBNum(r, c);
        if (num !== null) {
          const adj = getAdjCells(r, c);
          let count = 0;
          for (const [ar, ac] of adj) {
            if (solverBulbs[ar][ac]) count++;
          }
          if (count !== num) return false;
        }
      }
    }

    // Illumination check
    for (const [wr, wc] of whiteCells) {
      let isLit = false;
      for (let r = 0; r < H; r++) {
        if (solverBulbs[r][wc] && reachCheck(r, wc, wr, wc)) {
          isLit = true;
          break;
        }
      }
      if (!isLit) {
        for (let c = 0; c < W; c++) {
          if (solverBulbs[wr][c] && reachCheck(wr, c, wr, wc)) {
            isLit = true;
            break;
          }
        }
      }
      if (!isLit) return false;
    }

    return true;
  }

  // Recursive backtracking with pruning
  function search(idx) {
    if (idx === whiteCells.length) {
      if (validateAll()) {
        finalSolution = solverBulbs.map(row => row.map(b => b ? 1 : 0));
        return true;
      }
      return false;
    }

    const [r, c] = whiteCells[idx];

    // Choice 1: Place a bulb
    solverBulbs[r][c] = true;
    
    // Pruning 1: Collision check with previously placed bulbs
    let collision = false;
    for (let i = 0; i < idx; i++) {
      const [r2, c2] = whiteCells[i];
      if (solverBulbs[r2][c2] && reachCheck(r, c, r2, c2)) {
        collision = true;
        break;
      }
    }

    // Pruning 2: Adjacent wall count overflow check
    let overflow = false;
    if (!collision) {
      const adj = getAdjCells(r, c);
      for (const [ar, ac] of adj) {
        const num = getBNum(ar, ac);
        if (num !== null) {
          let count = 0;
          for (const [nr, nc] of getAdjCells(ar, ac)) {
            if (solverBulbs[nr][nc]) count++;
          }
          if (count > num) {
            overflow = true;
            break;
          }
        }
      }
    }

    if (!collision && !overflow) {
      if (search(idx + 1)) return true;
    }

    // Choice 2: Do not place a bulb
    solverBulbs[r][c] = false;

    // Pruning 3: Adjacent wall count underflow check (can we still meet the target?)
    let underflow = false;
    const adj = getAdjCells(r, c);
    for (const [ar, ac] of adj) {
      const num = getBNum(ar, ac);
      if (num !== null) {
        let count = 0;
        let potential = 0;
        for (const [nr, nc] of getAdjCells(ar, ac)) {
          if (solverBulbs[nr][nc]) {
            count++;
          } else {
            // Find if this unplaced neighbor is ahead of current idx in whiteCells
            const nIdx = whiteCells.findIndex(([wr, wc]) => wr === nr && wc === nc);
            if (nIdx > idx) {
              potential++;
            }
          }
        }
        if (count + potential < num) {
          underflow = true;
          break;
        }
      }
    }

    if (!underflow) {
      if (search(idx + 1)) return true;
    }

    return false;
  }

  search(0);
  return finalSolution;
}

// --- Clear Celebration Handling ---
function handleClearCelebration() {
  gameState.isCleared = true;
  stopTimer();

  // 1. Play gold board animation
  boardEl.classList.add('clear-animation');

  // 2. Trigger Confetti particles
  startConfetti();

  // 3. Show clear modal with details after a brief delay
  setTimeout(() => {
    statLevel.textContent = gameState.level.toUpperCase();
    
    const minutes = Math.floor(gameState.elapsedTime / 60).toString().padStart(2, '0');
    const seconds = (gameState.elapsedTime % 60).toString().padStart(2, '0');
    statTime.textContent = `${minutes}:${seconds}`;
    
    statMoves.textContent = `${gameState.moves} 手`;

    showModal(clearModal);
  }, 1000);
}

// --- Confetti Particle System (HTML5 Canvas) ---
function startConfetti() {
  stopConfetti();
  confettiParticles = [];
  resizeCanvas();

  const colors = [
    '#ffc73b', // Museum Amber
    '#c5a880', // Antique Gold
    '#e5c158', // Champagne Gold
    '#fef2b8', // Light Gold
    '#e1b12c'  // Deep Gold
  ];

  for (let i = 0; i < 110; i++) {
    confettiParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 4 + 2,
      speedX: Math.random() * 2 - 1,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 4 - 2
    });
  }

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeParticles = 0;
    for (const p of confettiParticles) {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;

      // Draw particle as a skewed rectangle
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 3;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();

      // Recirculate particle if it falls off bottom
      if (p.y > canvas.height) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
      activeParticles++;
    }

    if (activeParticles > 0) {
      confettiAnimationId = requestAnimationFrame(drawFrame);
    }
  }

  drawFrame();
}

function stopConfetti() {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Run initial execution
init();
