// ─── Teclado virtual ──────────────────────────────────────────────
const KB_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫']
];

// ─── Estado do jogo ───────────────────────────────────────────────
let targetWord  = '';
let currentRow  = 0;
let currentCol  = 0;
let board       = [];
let gameOver    = false;
let keyStates   = {};
let resultGrid  = []; // guarda resultado de cada linha pra compartilhar
let stats       = JSON.parse(localStorage.getItem('letrado-stats') || '{"played":0,"wins":0,"streak":0,"best":0}');

// ─── Normaliza string (remove acentos, uppercase) ──────────────────
function normalize(str) {
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ─── Sorteia palavra ───────────────────────────────────────────────
function getWord() {
  const list = GAME_WORDS.filter(w => w.length === 5);
  return normalize(list[Math.floor(Math.random() * list.length)]);
}

// ─── Valida palavra digitada ───────────────────────────────────────
function isValid(word) {
  return VALID_WORDS.has(word.toLowerCase());
}

// ─── Constrói tabuleiro ────────────────────────────────────────────
function buildBoard() {
  const b = document.getElementById('board');
  b.innerHTML = '';
  board = Array.from({ length: 6 }, () => Array(5).fill(''));

  for (let r = 0; r < 6; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.id = `row-${r}`;
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.id = `tile-${r}-${c}`;

      // Clique no tile move o cursor para aquela posição
      tile.addEventListener('click', () => {
        if (gameOver) return;
        if (r !== currentRow) return; // só linha ativa
        currentCol = c;
        updateCursor();
      });

      row.appendChild(tile);
    }
    b.appendChild(row);
  }
  updateCursor();
}

// ─── Constrói teclado virtual ──────────────────────────────────────
function buildKeyboard() {
  const kb = document.getElementById('keyboard');
  kb.innerHTML = '';
  KB_ROWS.forEach(row => {
    const div = document.createElement('div');
    div.className = 'kb-row';
    row.forEach(k => {
      const btn = document.createElement('button');
      btn.className = 'key' + (k.length > 1 ? ' wide' : '');
      btn.textContent = k;
      btn.dataset.key = k;
      btn.addEventListener('click', () => handleKey(k));
      div.appendChild(btn);
    });
    kb.appendChild(div);
  });
}

// ─── Atualiza cursor visual ────────────────────────────────────────
function updateCursor() {
  // Remove cursor de TODOS os tiles do tabuleiro inteiro
  document.querySelectorAll('.tile').forEach(t => t.classList.remove('cursor'));
  // Adiciona cursor só na posição atual (se não passou das 5)
  if (!gameOver && currentCol < 5) {
    document.getElementById(`tile-${currentRow}-${currentCol}`)?.classList.add('cursor');
  }
}

// ─── Atualiza tile ─────────────────────────────────────────────────
function updateTile(r, c, letter) {
  const tile = document.getElementById(`tile-${r}-${c}`);
  tile.textContent = letter;
  if (letter) {
    tile.classList.add('filled');
    tile.classList.remove('cursor');
    setTimeout(() => tile.classList.remove('filled'), 150);
  } else {
    tile.classList.remove('filled');
  }
}

// ─── Toast ─────────────────────────────────────────────────────────
function toast(msg, duration = 1800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ─── Animações ─────────────────────────────────────────────────────
function shakeRow(r) {
  const row = document.getElementById(`row-${r}`);
  row.classList.add('shake');
  setTimeout(() => row.classList.remove('shake'), 400);
}

function bounceRow(r) {
  for (let c = 0; c < 5; c++) {
    setTimeout(() => {
      const tile = document.getElementById(`tile-${r}-${c}`);
      tile.classList.add('bounce');
      setTimeout(() => tile.classList.remove('bounce'), 700);
    }, c * 80);
  }
}

// ─── Revela linha com animação ─────────────────────────────────────
function revealRow(r, result, cb) {
  // Remove cursor antes de revelar
  for (let c = 0; c < 5; c++) {
    document.getElementById(`tile-${r}-${c}`)?.classList.remove('cursor');
  }
  result.forEach((res, c) => {
    setTimeout(() => {
      const tile = document.getElementById(`tile-${r}-${c}`);
      tile.classList.add('revealed', res);
      if (c === 4 && cb) setTimeout(cb, 300);
    }, c * 300);
  });
}

// ─── Avalia palpite ────────────────────────────────────────────────
function evaluate(guess, target) {
  const result = Array(5).fill('absent');
  const tArr   = target.split('');
  const gArr   = guess.split('');
  const used   = Array(5).fill(false);

  // 1ª passagem: letras corretas
  for (let i = 0; i < 5; i++) {
    if (gArr[i] === tArr[i]) {
      result[i] = 'correct';
      used[i]   = true;
    }
  }
  // 2ª passagem: letras presentes em posição errada
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    const idx = tArr.findIndex((l, j) => l === gArr[i] && !used[j]);
    if (idx !== -1) {
      result[i]  = 'present';
      used[idx]  = true;
    }
  }
  return result;
}

// ─── Atualiza cores do teclado ─────────────────────────────────────
function updateKeys(guess, result) {
  const priority = { correct: 3, present: 2, absent: 1 };
  guess.split('').forEach((l, i) => {
    const cur = keyStates[l] || '';
    if ((priority[result[i]] || 0) > (priority[cur] || 0)) {
      keyStates[l] = result[i];
    }
  });
  document.querySelectorAll('.key').forEach(btn => {
    const k = btn.dataset.key;
    if (keyStates[k]) {
      btn.classList.remove('correct', 'present', 'absent');
      btn.classList.add(keyStates[k]);
    }
  });
}

// ─── Compartilhar resultado ────────────────────────────────────────
function gerarTextoCompartilhar(won) {
  const tentativas = won ? `${currentRow + 1}/6` : 'X/6';

  const emojis = resultGrid.map(linha =>
    linha.map(r => r === 'correct' ? '🟩' : r === 'present' ? '🟨' : '⬛').join('')
  ).join('\n');

  return `🔤 Letrado v0.1.3\n\n${tentativas}\n\n${emojis}\n\n👉 letradobr.vercel.app`;
}

function compartilhar(won) {
  const texto = gerarTextoCompartilhar(won);

  // Tenta usar Web Share API (mobile) primeiro
  if (navigator.share) {
    navigator.share({ text: texto }).catch(() => {});
  } else {
    // Fallback: copia pra área de transferência
    navigator.clipboard.writeText(texto).then(() => {
      toast('Copiado! Cole onde quiser 😄', 2500);
    }).catch(() => {
      toast('Não foi possível copiar 😕', 2000);
    });
  }
}

// ─── Modal fim de jogo ─────────────────────────────────────────────
function showEndModal(won, word) {
  setTimeout(() => {
    document.getElementById('end-title').textContent = won ? '🎉 Parabéns!' : 'Que pena...';
    document.getElementById('end-msg').textContent   = won
      ? `Você acertou em ${currentRow + 1} tentativa${currentRow === 0 ? '' : 's'}!`
      : 'Não foi dessa vez. A palavra era:';
    document.getElementById('end-word').textContent  = word;
    // guarda o estado de vitória no botão compartilhar
    document.getElementById('end-share').dataset.won = won ? '1' : '0';
    document.getElementById('modal-end').classList.add('open');
  }, won ? 1800 : 1200);
}

// ─── Salva e exibe estatísticas ────────────────────────────────────
function saveStats() {
  localStorage.setItem('letrado-stats', JSON.stringify(stats));
}

function showStats() {
  document.getElementById('s-played').textContent = stats.played;
  document.getElementById('s-win').textContent    = stats.played
    ? Math.round((stats.wins / stats.played) * 100) : 0;
  document.getElementById('s-streak').textContent = stats.streak;
  document.getElementById('s-best').textContent   = stats.best;
  document.getElementById('modal-stats').classList.add('open');
}

// ─── Trata teclas ──────────────────────────────────────────────────
function handleKey(k) {
  if (gameOver) return;

  // Apagar
  if (k === '⌫' || k === 'BACKSPACE') {
    if (currentCol > 0 && !board[currentRow][currentCol]) {
      // Se posição atual vazia, volta uma casa e apaga
      currentCol--;
    }
    // Apaga letra na posição atual
    board[currentRow][currentCol] = '';
    updateTile(currentRow, currentCol, '');
    updateCursor();
    return;
  }

  // Confirmar
  if (k === 'ENTER') {
    const filled = board[currentRow].filter(l => l !== '').length;
    if (filled < 5) {
      toast('Palavra muito curta!');
      shakeRow(currentRow);
      return;
    }

    const guess = board[currentRow].join('');

    // ✅ Validação real: só aceita palavras do dicionário
    if (!isValid(guess)) {
      toast('Palavra não encontrada!');
      shakeRow(currentRow);
      return;
    }

    const result = evaluate(guess, targetWord);
    resultGrid.push(result); // salva pra compartilhar

    revealRow(currentRow, result, () => {
      updateKeys(guess, result);

      if (guess === targetWord) {
        bounceRow(currentRow);
        const msgs = ['Incrível!', 'Excelente!', 'Muito bem!', 'Boa!', 'Ufa!', 'Ainda bem!'];
        setTimeout(() => toast(msgs[Math.min(currentRow, 5)], 2000), 400);
        stats.played++;
        stats.wins++;
        stats.streak++;
        stats.best = Math.max(stats.best, stats.streak);
        saveStats();
        showEndModal(true, guess);
        gameOver = true;
        return;
      }

      currentRow++;
      currentCol = 0;
      updateCursor();

      if (currentRow === 6) {
        stats.played++;
        stats.streak = 0;
        saveStats();
        showEndModal(false, targetWord);
        gameOver = true;
      }
    });
    return;
  }

  // Digitar letra
  if (/^[a-zA-ZÀ-ú]$/.test(k) && currentCol < 5) {
    const letter = normalize(k);
    board[currentRow][currentCol] = letter;
    updateTile(currentRow, currentCol, letter);
    currentCol++; // sempre avança, chegando até 5 na última letra
    updateCursor();
  }
}

// ─── Nova partida ──────────────────────────────────────────────────
function newGame() {
  targetWord = getWord();
  currentRow = 0;
  currentCol = 0;
  gameOver   = false;
  keyStates  = {};
  resultGrid = [];
  buildBoard();
  buildKeyboard();
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

// ─── Eventos de teclado físico ─────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Backspace') handleKey('BACKSPACE');
  else if (e.key === 'Enter') handleKey('ENTER');
  else if (/^[a-zA-ZÀ-ú]$/.test(e.key)) handleKey(e.key);
});

// ─── Botões de UI ──────────────────────────────────────────────────
document.getElementById('btn-help').addEventListener('click', () =>
  document.getElementById('modal-help').classList.add('open'));

document.getElementById('btn-stats').addEventListener('click', showStats);

document.getElementById('help-close').addEventListener('click', () =>
  document.getElementById('modal-help').classList.remove('open'));

document.getElementById('stats-close').addEventListener('click', () =>
  document.getElementById('modal-stats').classList.remove('open'));

document.getElementById('stats-new').addEventListener('click', newGame);
document.getElementById('end-new').addEventListener('click', newGame);
document.getElementById('end-share').addEventListener('click', () => {
  const won = document.getElementById('end-share').dataset.won === '1';
  compartilhar(won);
});

document.getElementById('end-stats').addEventListener('click', () => {
  document.getElementById('modal-end').classList.remove('open');
  showStats();
});

// Fecha modal clicando fora
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ─── Inicia ────────────────────────────────────────────────────────
newGame();
