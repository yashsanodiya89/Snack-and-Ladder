// Snake and Ladders Game Logic
// Board: 10x10, positions 1-100 (bottom-left to top-right, snake-like numbering)
// Ladders: 4->14, 9->31, 21->42, 28->84, 51->67, 72->91
// Snakes: 16->6, 47->26, 49->11, 56->53, 62->19, 64->60, 87->24, 93->73, 95->75, 98->78

class SnakeAndLadders {
  constructor() {
    this.boardSize = 10;
    this.totalCells = 100;
    this.ladders = { 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 72: 91 };
    this.snakes = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
    this.players = [
      { id: 1, position: 0, color: 'player1', name: 'Player 1 (Red)', emoji: '🚀' },
      { id: 2, position: 0, color: 'player2', name: 'Player 2 (Blue)', emoji: '🌟' }
    ];
    this.currentPlayerIndex = 0;
    this.gameOver = false;
    this.diceValue = 0;
    this.boardElement = document.getElementById('board');
    this.cellSize = 0; // Will be calculated
    this.initBoard();
    this.loadState(); // Load persisted state after init
    this.bindEvents();
    this.updateUI();
    this.calculateCellSize();
  }

  saveState() {
    const state = {
      players: this.players.map(p => ({ id: p.id, position: p.position, color: p.color, name: p.name, emoji: p.emoji })),
      currentPlayerIndex: this.currentPlayerIndex,
      gameOver: this.gameOver
    };
    localStorage.setItem('snakeLaddersGameState', JSON.stringify(state));
  }

  loadState() {
    const saved = localStorage.getItem('snakeLaddersGameState');
    if (saved) {
      const state = JSON.parse(saved);
      this.players = state.players;
      this.currentPlayerIndex = state.currentPlayerIndex;
      this.gameOver = state.gameOver;

      // Update UI elements based on loaded state
      if (this.gameOver) {
        document.getElementById('diceButton').disabled = true;
        const winner = this.players.find(p => p.position >= 100);
        if (winner) {
          this.showStatus(`${winner.name} wins! 🎉`);
        }
      }
      this.updateTurnIndicator();
    }
  }

  calculateCellSize() {
    const boardRect = this.boardElement.getBoundingClientRect();
    this.cellSize = (boardRect.width - 18) / 10; // 18px for 9 gaps of 2px
  }

  getCoordinates(position) {
    if (position === 0) {
      // Start outside board, bottom-left
      return { x: -this.cellSize / 2, y: this.cellSize * 10 + 20 };
    }
    const row = Math.floor((100 - position) / this.boardSize);
    const col = (position - 1) % this.boardSize;
    const isEvenRow = row % 2 === 0;
    const adjustedCol = isEvenRow ? col : (this.boardSize - 1 - col);
    const x = adjustedCol * (this.cellSize + 2) + this.cellSize / 2; // +2 for gap
    const y = row * (this.cellSize + 2) + this.cellSize / 2;
    return { x, y };
  }

  initBoard() {
    const board = this.boardElement;
    board.innerHTML = '';
    for (let i = 1; i <= this.totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = i;
      cell.dataset.position = i;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Position ${i}`);

      // Determine row and col for positioning (0-based)
      const row = Math.floor((this.totalCells - i) / this.boardSize);
      const col = (i - 1) % this.boardSize;
      const isEvenRow = row % 2 === 0;
      const adjustedCol = isEvenRow ? col : (this.boardSize - 1 - col);
      cell.style.gridRow = row + 1;
      cell.style.gridColumn = adjustedCol + 1;

      // Mark ladders and snakes
      if (this.ladders[i]) {
        cell.classList.add('ladder');
        cell.setAttribute('aria-describedby', `ladder-${i}`);
      } else if (this.snakes[i]) {
        cell.classList.add('snake');
        cell.setAttribute('aria-describedby', `snake-${i}`);
      }

      board.appendChild(cell);
    }

    // Add ARIA descriptions for ladders/snakes
    const descContainer = document.createElement('div');
    descContainer.style.position = 'absolute';
    descContainer.style.left = '-9999px';
    descContainer.innerHTML = `
      ${Object.entries(this.ladders).map(([from, to]) => `<div id="ladder-${from}">Ladder to ${to}</div>`).join('')}
      ${Object.entries(this.snakes).map(([from, to]) => `<div id="snake-${from}">Snake to ${to}</div>`).join('')}
    `;
    board.parentNode.appendChild(descContainer);

    // Listen for resize to recalculate cell size
    window.addEventListener('resize', () => this.calculateCellSize());
  }

  bindEvents() {
    const diceButton = document.getElementById('diceButton');
    const resetButton = document.getElementById('resetButton');

    diceButton.addEventListener('click', () => this.rollDice());
    resetButton.addEventListener('click', () => this.resetGame());

    // Keyboard support
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!this.gameOver && !diceButton.disabled) {
          this.rollDice();
        }
      }
      if (e.key === 'r' || e.key === 'R') {
        this.resetGame();
      }
    });
  }

  rollDice() {
    if (this.gameOver) return;

    const diceButton = document.getElementById('diceButton');
    const diceFace = document.getElementById('diceFace');
    diceButton.disabled = true;
    diceButton.classList.add('rolling');

    // Enhanced smooth roll: more iterations, faster interval
    let rollCount = 0;
    const maxRolls = 20; // More rolls for smoother feel
    const rollInterval = setInterval(() => {
      this.diceValue = Math.floor(Math.random() * 6) + 1;
      diceFace.textContent = this.getDiceEmoji(this.diceValue);
      rollCount++;
      if (rollCount >= maxRolls) {
        clearInterval(rollInterval);
        // Final settle with bounce
        diceFace.style.animation = 'bounce 0.3s ease-out';
        setTimeout(() => {
          diceFace.style.animation = '';
          this.movePlayer(this.diceValue);
          diceButton.disabled = false;
          diceButton.classList.remove('rolling');
        }, 300);
      }
    }, 50); // Faster interval for smoother animation
  }

  getDiceEmoji(value) {
    const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return emojis[value - 1];
  }

  movePlayer(dice) {
    const currentPlayer = this.players[this.currentPlayerIndex];
    let newPosition = currentPlayer.position + dice;
    let finalPosition = newPosition;

    // Exact 100 or bounce back if overshoot
    if (newPosition > 100) {
      newPosition = currentPlayer.position; // Don't move if overshoot
      this.showStatus(`${currentPlayer.name} needs exactly ${100 - currentPlayer.position} to win!`);
      this.animateBounceBack(currentPlayer);
    } else {
      // Check snake or ladder at landing position
      if (this.ladders[newPosition]) {
        finalPosition = this.ladders[newPosition];
        this.showStatus(`Climbed ladder from ${newPosition} to ${finalPosition}!`);
      } else if (this.snakes[newPosition]) {
        finalPosition = this.snakes[newPosition];
        this.showStatus(`Slid down snake from ${newPosition} to ${finalPosition}!`);
      } else {
        this.showStatus(`${currentPlayer.name} moved to ${newPosition}`);
      }

      // Animate path to landing, then to final if snake/ladder
      this.animatePath(currentPlayer, currentPlayer.position, newPosition, () => {
        if (finalPosition !== newPosition) {
          setTimeout(() => {
            this.animateSnakeLadder(currentPlayer, newPosition, finalPosition);
          }, 600);
        } else {
          this.completeMove(currentPlayer, finalPosition);
        }
      });
    }

    currentPlayer.position = finalPosition;
    this.updateUI();
    this.saveState(); // Save state after move

    if (finalPosition >= 100) {
      setTimeout(() => this.endGame(currentPlayer), 1200);
      return;
    }

    // Switch turn after animation
    setTimeout(() => {
      this.currentPlayerIndex = 1 - this.currentPlayerIndex;
      this.updateTurnIndicator();
      this.saveState(); // Save after turn switch
    }, 2000);
  }

  animatePath(player, startPos, endPos, callback) {
    const piece = document.querySelector(`.${player.color}`);
    if (!piece) return;

    // Ensure smooth start: set initial position with transition if needed
    piece.style.transition = 'none'; // Reset any prior transition
    this.boardElement.appendChild(piece);
    piece.style.position = 'absolute';
    piece.style.zIndex = '20';

    const path = [];
    for (let pos = startPos + 1; pos <= endPos; pos++) {
      path.push(pos);
    }

    let step = 0;
    const moveStep = () => {
      if (step >= path.length) {
        // Arrived at endPos with extended smooth settle
        const { x, y } = this.getCoordinates(endPos);
        piece.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // Even smoother, longer transition
        piece.style.transform = `translate(${x - this.cellSize / 2}px, ${y - this.cellSize / 2}px) scale(1.05)`;
        setTimeout(callback, 500); // Longer pause before callback
        return;
      }

      const pos = path[step];
      const { x, y } = this.getCoordinates(pos);
      piece.style.transition = 'all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)'; // Smoother easing curve
      piece.style.transform = `translate(${x - this.cellSize / 2}px, ${y - this.cellSize / 2}px) scale(1.05)`;

      step++;
      setTimeout(moveStep, 400); // Increased delay for more gradual feel
    };

    // Initial position (ensure it's centered before starting)
    const { x: startX, y: startY } = this.getCoordinates(startPos);
    piece.style.transform = `translate(${startX - this.cellSize / 2}px, ${startY - this.cellSize / 2}px) scale(1)`;

    // Brief pause before first move to avoid snap
    setTimeout(() => {
      moveStep();
    }, 100);
  }

  animateSnakeLadder(player, fromPos, toPos) {
    const piece = document.querySelector(`.${player.color}`);
    if (!piece) return;

    // Smooth jump to fromPos center
    const { x: fromX, y: fromY } = this.getCoordinates(fromPos);
    piece.style.transition = 'all 0.4s ease-in-out';
    piece.style.transform = `translate(${fromX - this.cellSize / 2}px, ${fromY - this.cellSize / 2}px) scale(1.3)`;

    setTimeout(() => {
      // Animate to toPos with extended bouncy effect
      const { x, y } = this.getCoordinates(toPos);
      piece.style.transition = 'all 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)'; // Longer bouncy easing
      piece.style.transform = `translate(${x - this.cellSize / 2}px, ${y - this.cellSize / 2}px) scale(1.2)`;

      // Add glow or shake based on snake/ladder
      if (this.ladders[fromPos]) {
        piece.style.filter = 'drop-shadow(0 0 10px var(--success))';
      } else if (this.snakes[fromPos]) {
        piece.style.animation = 'shake 0.6s ease-in-out';
      }

      setTimeout(() => {
        piece.style.filter = '';
        piece.style.animation = '';
        this.completeMove(player, toPos);
      }, 1200); // Extended for dramatic, non-sudden effect
    }, 400);
  }

  animateBounceBack(player) {
    const piece = document.querySelector(`.${player.color}`);
    if (!piece || player.position === 0) return;

    // Smoother bounce back animation at current position
    piece.style.transition = 'all 0.6s ease-in-out';
    piece.style.transform = `scale(1.3) rotate(5deg)`;
    setTimeout(() => {
      piece.style.transform = `scale(1) rotate(0deg)`;
    }, 300);
  }

  completeMove(player, position) {
    const piece = document.querySelector(`.${player.color}`);
    if (piece) {
      // Reposition exactly in cell with smoother settle
      const cell = this.getCellByPosition(position);
      if (cell) {
        piece.style.position = 'absolute';
        piece.style.top = '10%';
        piece.style.left = '10%';
        piece.style.transform = 'scale(1)';
        piece.style.transition = 'all 0.4s ease-out'; // Smoother settle transition
        cell.appendChild(piece);
      }
    }
    this.updateUI();
  }

  getCellByPosition(pos) {
    if (pos === 0) return document.querySelector('.cell[data-position="1"]');
    return document.querySelector(`.cell[data-position="${pos}"]`);
  }

  updateUI() {
    // Update positions in scoreboard
    this.players.forEach(player => {
      const posElement = document.querySelector(`[data-player="${player.id}"] .position`);
      if (posElement) posElement.textContent = player.position;
    });

    // Update current cell highlight
    document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('current'));
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer.position > 0) {
      const currentCell = this.getCellByPosition(currentPlayer.position);
      if (currentCell) currentCell.classList.add('current');
    }

    // Place pieces if not animating
    this.players.forEach(player => {
      let piece = document.querySelector(`.${player.color}`);
      if (!piece && player.position > 0) {
        piece = document.createElement('div');
        piece.className = `cell ${player.color}`;
        piece.textContent = player.emoji;
        piece.setAttribute('aria-label', `${player.name} at ${player.position}`);
        const cell = this.getCellByPosition(player.position);
        if (cell) cell.appendChild(piece);
      }
    });
  }

  updateTurnIndicator() {
    const indicator = document.querySelector('.turn-indicator');
    const currentPlayer = this.players[this.currentPlayerIndex];
    indicator.textContent = currentPlayer.name.split(' (')[0];
    indicator.dataset.player = currentPlayer.id;
  }

  showStatus(message) {
    const status = document.querySelector('.status-message');
    status.textContent = message;
    const statusEl = status.parentElement;
    statusEl.style.background = 'rgba(16,185,129,0.1)';
    statusEl.style.borderColor = 'var(--success)';
    setTimeout(() => {
      statusEl.style.background = 'rgba(var(--success), 0.1)';
      statusEl.style.borderColor = 'var(--success)';
    }, 2000);
  }

  endGame(winner) {
    this.gameOver = true;
    const message = `${winner.name} wins! 🎉`;
    this.showStatus(message);
    document.getElementById('diceButton').disabled = true;
    this.triggerConfetti();
    this.saveState(); // Save game over state
  }

  triggerConfetti() {
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.top = '-10px';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
      confetti.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
      confetti.style.pointerEvents = 'none';
      confetti.style.zIndex = '1000';
      confetti.style.animation = `confetti-fall ${Math.random() * 3 + 2}s linear forwards`;
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), 5000);
    }
  }

  resetGame() {
    this.players.forEach(player => {
      player.position = 0;
    });
    this.currentPlayerIndex = 0;
    this.gameOver = false;
    this.diceValue = 0;
    document.getElementById('diceButton').disabled = false;
    document.getElementById('diceButton').classList.remove('rolling');
    document.querySelector('.status-message').textContent = '';
    const statusEl = document.querySelector('.status-message').parentElement;
    statusEl.style.background = 'rgba(var(--success), 0.1)';
    statusEl.style.borderColor = 'var(--success)';
    this.updateUI();
    this.updateTurnIndicator();
    // Remove pieces and confetti
    document.querySelectorAll('.cell.player1, .cell.player2, [style*="confetti-fall"]').forEach(p => p.remove());
    this.saveState(); // Save reset state
    localStorage.removeItem('snakeLaddersGameState'); // Clear persisted state on reset
  }
}

// Add confetti CSS if not present
if (!document.querySelector('style[data-confetti]')) {
  const style = document.createElement('style');
  style.setAttribute('data-confetti', 'true');
  style.textContent = `
    @keyframes confetti-fall {
      to {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
      }
    }
    @keyframes bounce {
      0%, 20%, 60%, 100% { transform: scale(1); }
      40% { transform: scale(1.1); }
      80% { transform: scale(1.05); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(style);
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
  new SnakeAndLadders();
});

// Announce game start for screen readers
if (window.speechSynthesis) {
  setTimeout(() => {
    const msg = new SpeechSynthesisUtterance('Snake and Ladders game ready. Player 1, roll the dice to start.');
    window.speechSynthesis.speak(msg);
  }, 1000);
}
