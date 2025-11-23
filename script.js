class UltimateTicTacToe {
    constructor() {
        this.currentPlayer = 'X';
        this.activeBoard = null; // null means any board can be played
        this.localBoards = Array(9).fill(null).map(() => Array(9).fill(null));
        this.wonBoards = Array(9).fill(null); // 'X', 'O', or null
        this.gameOver = false;
        this.winner = null;
        this.gameMode = '2player'; // '2player' or '1player'
        this.difficulty = 'easy'; // 'easy', 'medium', 'hard'
        this.computerPlayer = null; // 'X' or 'O' or null
        this.humanPlayer = null; // 'X' or 'O' or null
        this.lastMove = null; // { boardIndex, cellIndex }
        this.boardFirstMoves = Array(9).fill(false); // Track if first move made in each board
        
        this.initSetup();
    }
    
    initSetup() {
        this.setupScreen = document.getElementById('setup-screen');
        this.gameContainer = document.getElementById('game-container');
        
        // Show setup screen, hide game
        this.setupScreen.classList.remove('hidden');
        this.gameContainer.classList.add('hidden');
        
        // Setup event listeners
        document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const computerOptions = document.getElementById('computer-options');
                const playerOrderOptions = document.getElementById('player-order-options');
                if (e.target.value === '1player') {
                    computerOptions.style.display = 'block';
                    playerOrderOptions.style.display = 'block';
                } else {
                    computerOptions.style.display = 'none';
                    playerOrderOptions.style.display = 'none';
                }
            });
        });
        
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    }
    
    startGame() {
        // Get game mode
        const gameModeRadio = document.querySelector('input[name="game-mode"]:checked');
        this.gameMode = gameModeRadio.value;
        
        if (this.gameMode === '1player') {
            // Get difficulty
            this.difficulty = document.getElementById('difficulty').value;
            
            // Get player order
            const playerOrderRadio = document.querySelector('input[name="player-order"]:checked');
            const playerOrder = playerOrderRadio.value;
            
            if (playerOrder === 'random') {
                this.computerPlayer = Math.random() < 0.5 ? 'X' : 'O';
            } else if (playerOrder === 'first') {
                this.computerPlayer = 'O'; // Human is X, computer is O
            } else {
                this.computerPlayer = 'X'; // Human is O, computer is X
            }
            
            this.humanPlayer = this.computerPlayer === 'X' ? 'O' : 'X';
        } else {
            this.computerPlayer = null;
            this.humanPlayer = null;
        }
        
        // Reset game state
        this.currentPlayer = 'X';
        this.activeBoard = null;
        this.localBoards = Array(9).fill(null).map(() => Array(9).fill(null));
        this.wonBoards = Array(9).fill(null);
        this.gameOver = false;
        this.winner = null;
        this.lastMove = null;
        this.boardFirstMoves = Array(9).fill(false);
        
        // Hide setup screen, show game
        this.setupScreen.classList.add('hidden');
        this.gameContainer.classList.remove('hidden');
        
        // Initialize game
        this.init();
        
        // If computer goes first, make its move
        if (this.gameMode === '1player' && this.computerPlayer === 'X') {
            setTimeout(() => this.computerMove(), 300);
        }
    }
    
    init() {
        this.createBoard();
        this.attachEventListeners();
        this.updateStatus();
        this.updateActiveBoards();
    }
    
    createBoard() {
        const globalBoard = document.getElementById('global-board');
        globalBoard.innerHTML = '';
        
        for (let globalRow = 0; globalRow < 3; globalRow++) {
            for (let globalCol = 0; globalCol < 3; globalCol++) {
                const boardIndex = globalRow * 3 + globalCol;
                const localBoard = document.createElement('div');
                localBoard.className = 'local-board';
                localBoard.dataset.boardIndex = boardIndex;
                
                // Create 3x3 grid for this local board
                for (let localRow = 0; localRow < 3; localRow++) {
                    for (let localCol = 0; localCol < 3; localCol++) {
                        const cellIndex = localRow * 3 + localCol;
                        const cell = document.createElement('button');
                        cell.className = 'cell';
                        cell.dataset.boardIndex = boardIndex;
                        cell.dataset.cellIndex = cellIndex;
                        cell.addEventListener('click', () => this.handleCellClick(boardIndex, cellIndex));
                        localBoard.appendChild(cell);
                    }
                }
                
                // Add winner overlay (initially hidden)
                const overlay = document.createElement('div');
                overlay.className = 'winner-overlay';
                overlay.style.display = 'none';
                localBoard.appendChild(overlay);
                
                globalBoard.appendChild(localBoard);
            }
        }
    }
    
    attachEventListeners() {
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
    }
    
    handleCellClick(boardIndex, cellIndex) {
        if (this.gameOver) return;
        
        // Don't allow human clicks during computer's turn
        if (this.gameMode === '1player' && this.currentPlayer === this.computerPlayer) {
            return;
        }
        
        // Check if cell is already occupied
        if (this.localBoards[boardIndex][cellIndex] !== null) {
            return;
        }
        
        // Check if board is won or full (special rule: can play anywhere)
        const boardWonOrFull = this.wonBoards[boardIndex] !== null || this.isBoardFull(boardIndex);
        
        // Check if this move is allowed
        if (this.activeBoard !== null) {
            // There's a specific board requirement
            if (boardWonOrFull) {
                // Special rule: if target board is won/full, can play anywhere
                // Allow the move
            } else if (this.activeBoard !== boardIndex) {
                // Must play in the active board
                return;
            }
        }
        // If activeBoard is null, can play anywhere (already handled by special rules)
        
        // Make the move
        this.makeMove(boardIndex, cellIndex);
    }
    
    makeMove(boardIndex, cellIndex) {
        // Remove previous last move highlight
        if (this.lastMove) {
            const prevCell = document.querySelector(`[data-board-index="${this.lastMove.boardIndex}"][data-cell-index="${this.lastMove.cellIndex}"]`);
            if (prevCell) {
                prevCell.classList.remove('last-move');
            }
        }
        
        // Track if this is first move in this board
        const isFirstMoveInBoard = !this.boardFirstMoves[boardIndex];
        if (isFirstMoveInBoard) {
            this.boardFirstMoves[boardIndex] = true;
        }
        
        // Update game state
        this.localBoards[boardIndex][cellIndex] = this.currentPlayer;
        
        // Update UI
        const cell = document.querySelector(`[data-board-index="${boardIndex}"][data-cell-index="${cellIndex}"]`);
        cell.textContent = this.currentPlayer;
        cell.classList.add('occupied', this.currentPlayer.toLowerCase());
        
        // Highlight this as last move
        cell.classList.add('last-move');
        this.lastMove = { boardIndex, cellIndex };
        
        // Check for local board win
        const localWinner = this.checkLocalBoardWin(boardIndex);
        if (localWinner) {
            this.wonBoards[boardIndex] = localWinner;
            this.markBoardWon(boardIndex, localWinner);
        }
        
        // Check for global board win
        const globalWinner = this.checkGlobalBoardWin();
        if (globalWinner) {
            this.gameOver = true;
            this.winner = globalWinner;
            this.showGameOver(globalWinner);
            return;
        }
        
        // Check if game is a draw (all boards won or full)
        if (this.isGameDraw()) {
            this.gameOver = true;
            this.showGameOver(null);
            return;
        }
        
        // Determine next active board
        const nextBoard = this.getNextBoard(cellIndex);
        
        // Check if next board is playable
        if (nextBoard !== null && this.wonBoards[nextBoard] === null && !this.isBoardFull(nextBoard)) {
            this.activeBoard = nextBoard;
        } else {
            // Special rule: can play anywhere
            this.activeBoard = null;
        }
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        
        // Update UI
        this.updateStatus();
        this.updateActiveBoards();
        
        // If it's computer's turn, make computer move
        if (this.gameMode === '1player' && !this.gameOver && this.currentPlayer === this.computerPlayer) {
            setTimeout(() => this.computerMove(), 300);
        }
    }
    
    computerMove() {
        if (this.gameOver) return;
        
        let move;
        switch (this.difficulty) {
            case 'easy':
                move = this.getEasyMove();
                break;
            case 'medium':
                move = this.getMediumMove();
                break;
            case 'hard':
                move = this.getHardMove();
                break;
        }
        
        if (move) {
            this.makeMove(move.boardIndex, move.cellIndex);
        }
    }
    
    getEasyMove() {
        // Easy mode: Random global board selection, random first move in each board,
        // then try to make 3-in-a-row locally
        const availableMoves = this.getAvailableMoves();
        if (availableMoves.length === 0) return null;
        
        // Group moves by board
        const movesByBoard = {};
        for (const move of availableMoves) {
            if (!movesByBoard[move.boardIndex]) {
                movesByBoard[move.boardIndex] = [];
            }
            movesByBoard[move.boardIndex].push(move);
        }
        
        // Randomly select a board to play in (random global strategy)
        const playableBoards = Object.keys(movesByBoard).map(Number);
        const selectedBoard = playableBoards[Math.floor(Math.random() * playableBoards.length)];
        const movesInBoard = movesByBoard[selectedBoard];
        
        // Check if this is first move in this board
        const isFirstMove = !this.boardFirstMoves[selectedBoard];
        if (isFirstMove) {
            // Completely random for first move
            return movesInBoard[Math.floor(Math.random() * movesInBoard.length)];
        }
        
        // Not first move - try to make 3-in-a-row or line up pieces
        const board = this.localBoards[selectedBoard];
        
        // 1. Try to complete a 3-in-a-row if possible
        for (const move of movesInBoard) {
            if (this.wouldWinLocalBoard(move.boardIndex, move.cellIndex, this.computerPlayer)) {
                return move;
            }
        }
        
        // 2. Try to line up pieces toward a possible win
        // Look for rows/columns/diagonals where we have 1 piece and can add another
        const strategicMoves = [];
        
        for (const move of movesInBoard) {
            const row = Math.floor(move.cellIndex / 3);
            const col = move.cellIndex % 3;
            
            // Check if this move would create a potential winning line
            // (has at least one computer piece in the same row/col/diag)
            let hasPotential = false;
            
            // Check row
            let rowComputerCount = 0;
            for (let c = 0; c < 3; c++) {
                const idx = row * 3 + c;
                if (board[idx] === this.computerPlayer) rowComputerCount++;
                if (board[idx] === this.humanPlayer) { rowComputerCount = -1; break; }
            }
            if (rowComputerCount > 0) hasPotential = true;
            
            // Check column
            let colComputerCount = 0;
            for (let r = 0; r < 3; r++) {
                const idx = r * 3 + col;
                if (board[idx] === this.computerPlayer) colComputerCount++;
                if (board[idx] === this.humanPlayer) { colComputerCount = -1; break; }
            }
            if (colComputerCount > 0) hasPotential = true;
            
            // Check diagonals
            if (move.cellIndex === 0 || move.cellIndex === 4 || move.cellIndex === 8) {
                let diag1Count = 0;
                for (let i = 0; i < 3; i++) {
                    const idx = i * 3 + i;
                    if (board[idx] === this.computerPlayer) diag1Count++;
                    if (board[idx] === this.humanPlayer) { diag1Count = -1; break; }
                }
                if (diag1Count > 0) hasPotential = true;
            }
            
            if (move.cellIndex === 2 || move.cellIndex === 4 || move.cellIndex === 6) {
                let diag2Count = 0;
                for (let i = 0; i < 3; i++) {
                    const idx = i * 3 + (2 - i);
                    if (board[idx] === this.computerPlayer) diag2Count++;
                    if (board[idx] === this.humanPlayer) { diag2Count = -1; break; }
                }
                if (diag2Count > 0) hasPotential = true;
            }
            
            if (hasPotential) {
                strategicMoves.push(move);
            }
        }
        
        // If we have strategic moves, randomly pick one
        if (strategicMoves.length > 0) {
            return strategicMoves[Math.floor(Math.random() * strategicMoves.length)];
        }
        
        // Otherwise, random move in the selected board
        return movesInBoard[Math.floor(Math.random() * movesInBoard.length)];
    }
    
    getMediumMove() {
        const availableMoves = this.getAvailableMoves();
        if (availableMoves.length === 0) return null;
        
        // Strategy priority with some randomness:
        // 1. Win a local board if possible (90% chance to take it)
        // 2. Block opponent from winning a local board (90% chance to block)
        // 3. Win the global board if possible (85% chance)
        // 4. Block opponent from winning global board (85% chance)
        // 5. Strategic moves with randomness
        // 6. Random move
        
        // 1. Try to win a local board (with 90% chance to take it)
        const winningMoves = availableMoves.filter(m => 
            this.wouldWinLocalBoard(m.boardIndex, m.cellIndex, this.computerPlayer)
        );
        if (winningMoves.length > 0 && Math.random() < 0.9) {
            return winningMoves[Math.floor(Math.random() * winningMoves.length)];
        }
        
        // 2. Block opponent from winning a local board (90% chance)
        const blockingMoves = availableMoves.filter(m => 
            this.wouldWinLocalBoard(m.boardIndex, m.cellIndex, this.humanPlayer)
        );
        if (blockingMoves.length > 0 && Math.random() < 0.9) {
            return blockingMoves[Math.floor(Math.random() * blockingMoves.length)];
        }
        
        // 3. Try to win global board (85% chance)
        const globalWinningMoves = availableMoves.filter(m => 
            this.wouldWinGlobalBoard(m.boardIndex, m.cellIndex, this.computerPlayer)
        );
        if (globalWinningMoves.length > 0 && Math.random() < 0.85) {
            return globalWinningMoves[Math.floor(Math.random() * globalWinningMoves.length)];
        }
        
        // 4. Block opponent from winning global board (85% chance)
        const globalBlockingMoves = availableMoves.filter(m => 
            this.wouldWinGlobalBoard(m.boardIndex, m.cellIndex, this.humanPlayer)
        );
        if (globalBlockingMoves.length > 0 && Math.random() < 0.85) {
            return globalBlockingMoves[Math.floor(Math.random() * globalBlockingMoves.length)];
        }
        
        // 5. Strategic moves with randomness
        // Group by board and evaluate each
        const movesByBoard = {};
        for (const move of availableMoves) {
            if (!movesByBoard[move.boardIndex]) {
                movesByBoard[move.boardIndex] = [];
            }
            movesByBoard[move.boardIndex].push(move);
        }
        
        // Score each board's moves
        const scoredMoves = [];
        for (const [boardIndex, moves] of Object.entries(movesByBoard)) {
            const board = this.localBoards[boardIndex];
            for (const move of moves) {
                let score = 0;
                
                // Prefer center but not always (30% chance to prefer it)
                if (move.cellIndex === 4 && Math.random() < 0.3) {
                    score += 2;
                }
                
                // Prefer corners sometimes (20% chance)
                const corners = [0, 2, 6, 8];
                if (corners.includes(move.cellIndex) && Math.random() < 0.2) {
                    score += 1;
                }
                
                // Prefer moves that create threats
                const row = Math.floor(move.cellIndex / 3);
                const col = move.cellIndex % 3;
                
                // Check if this creates a potential winning line
                let computerCount = 0;
                let emptyCount = 0;
                
                // Check row
                for (let c = 0; c < 3; c++) {
                    const idx = row * 3 + c;
                    if (board[idx] === this.computerPlayer) computerCount++;
                    else if (board[idx] === null) emptyCount++;
                }
                if (computerCount > 0 && emptyCount > 0) score += 1;
                
                // Check column
                computerCount = 0;
                emptyCount = 0;
                for (let r = 0; r < 3; r++) {
                    const idx = r * 3 + col;
                    if (board[idx] === this.computerPlayer) computerCount++;
                    else if (board[idx] === null) emptyCount++;
                }
                if (computerCount > 0 && emptyCount > 0) score += 1;
                
                scoredMoves.push({ move, score });
            }
        }
        
        // Sort by score and pick from top moves with some randomness
        scoredMoves.sort((a, b) => b.score - a.score);
        if (scoredMoves.length > 0) {
            // Pick from top 30% of moves
            const topMoves = scoredMoves.slice(0, Math.max(1, Math.floor(scoredMoves.length * 0.3)));
            return topMoves[Math.floor(Math.random() * topMoves.length)].move;
        }
        
        // 6. Random move
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
    
    getHardMove() {
        // Use minimax algorithm for optimal play
        const result = this.minimax(this.localBoards, this.wonBoards, this.activeBoard, this.computerPlayer, 0, -Infinity, Infinity);
        return result.move;
    }
    
    minimax(localBoards, wonBoards, activeBoard, player, depth, alpha, beta) {
        // Check for terminal states
        const globalWinner = this.checkGlobalBoardWinState(wonBoards);
        if (globalWinner === this.computerPlayer) {
            return { score: 1000 - depth, move: null };
        }
        if (globalWinner === this.humanPlayer) {
            return { score: -1000 + depth, move: null };
        }
        
        // Check for draw
        let allWonOrFull = true;
        for (let i = 0; i < 9; i++) {
            if (wonBoards[i] === null && !this.isBoardFullState(localBoards[i])) {
                allWonOrFull = false;
                break;
            }
        }
        if (allWonOrFull) {
            return { score: 0, move: null };
        }
        
        // Limit depth for performance
        if (depth > 4) {
            return { score: this.evaluatePosition(localBoards, wonBoards), move: null };
        }
        
        const availableMoves = this.getAvailableMovesState(localBoards, wonBoards, activeBoard);
        
        if (player === this.computerPlayer) {
            // Maximizing player
            let bestScore = -Infinity;
            let bestMove = null;
            
            for (const move of availableMoves) {
                // Make move
                const newLocalBoards = localBoards.map(board => [...board]);
                newLocalBoards[move.boardIndex][move.cellIndex] = player;
                
                const newWonBoards = [...wonBoards];
                const localWinner = this.checkLocalBoardWinState(newLocalBoards[move.boardIndex], player);
                if (localWinner) {
                    newWonBoards[move.boardIndex] = localWinner;
                }
                
                const nextBoard = move.cellIndex;
                const nextActiveBoard = (newWonBoards[nextBoard] === null && !this.isBoardFullState(newLocalBoards[nextBoard])) 
                    ? nextBoard : null;
                
                const nextPlayer = player === 'X' ? 'O' : 'X';
                const result = this.minimax(newLocalBoards, newWonBoards, nextActiveBoard, nextPlayer, depth + 1, alpha, beta);
                
                if (result.score > bestScore) {
                    bestScore = result.score;
                    bestMove = move;
                }
                
                alpha = Math.max(alpha, bestScore);
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            
            return { score: bestScore, move: bestMove || availableMoves[0] };
        } else {
            // Minimizing player
            let bestScore = Infinity;
            let bestMove = null;
            
            for (const move of availableMoves) {
                // Make move
                const newLocalBoards = localBoards.map(board => [...board]);
                newLocalBoards[move.boardIndex][move.cellIndex] = player;
                
                const newWonBoards = [...wonBoards];
                const localWinner = this.checkLocalBoardWinState(newLocalBoards[move.boardIndex], player);
                if (localWinner) {
                    newWonBoards[move.boardIndex] = localWinner;
                }
                
                const nextBoard = move.cellIndex;
                const nextActiveBoard = (newWonBoards[nextBoard] === null && !this.isBoardFullState(newLocalBoards[nextBoard])) 
                    ? nextBoard : null;
                
                const nextPlayer = player === 'X' ? 'O' : 'X';
                const result = this.minimax(newLocalBoards, newWonBoards, nextActiveBoard, nextPlayer, depth + 1, alpha, beta);
                
                if (result.score < bestScore) {
                    bestScore = result.score;
                    bestMove = move;
                }
                
                beta = Math.min(beta, bestScore);
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            
            return { score: bestScore, move: bestMove || availableMoves[0] };
        }
    }
    
    evaluatePosition(localBoards, wonBoards) {
        // Heuristic evaluation of position
        let score = 0;
        
        // Count local boards won
        const computerWon = wonBoards.filter(b => b === this.computerPlayer).length;
        const humanWon = wonBoards.filter(b => b === this.humanPlayer).length;
        score += (computerWon - humanWon) * 10;
        
        // Evaluate potential local board wins
        for (let i = 0; i < 9; i++) {
            if (wonBoards[i] === null) {
                const computerThreats = this.countThreats(localBoards[i], this.computerPlayer);
                const humanThreats = this.countThreats(localBoards[i], this.humanPlayer);
                score += (computerThreats - humanThreats) * 2;
            }
        }
        
        return score;
    }
    
    countThreats(board, player) {
        // Count how many ways player can win this board
        let threats = 0;
        
        // Check rows
        for (let row = 0; row < 3; row++) {
            const cells = [board[row * 3], board[row * 3 + 1], board[row * 3 + 2]];
            const playerCount = cells.filter(c => c === player).length;
            const emptyCount = cells.filter(c => c === null).length;
            if (playerCount === 2 && emptyCount === 1) threats++;
        }
        
        // Check columns
        for (let col = 0; col < 3; col++) {
            const cells = [board[col], board[col + 3], board[col + 6]];
            const playerCount = cells.filter(c => c === player).length;
            const emptyCount = cells.filter(c => c === null).length;
            if (playerCount === 2 && emptyCount === 1) threats++;
        }
        
        // Check diagonals
        const diag1 = [board[0], board[4], board[8]];
        const playerCount1 = diag1.filter(c => c === player).length;
        const emptyCount1 = diag1.filter(c => c === null).length;
        if (playerCount1 === 2 && emptyCount1 === 1) threats++;
        
        const diag2 = [board[2], board[4], board[6]];
        const playerCount2 = diag2.filter(c => c === player).length;
        const emptyCount2 = diag2.filter(c => c === null).length;
        if (playerCount2 === 2 && emptyCount2 === 1) threats++;
        
        return threats;
    }
    
    getAvailableMoves() {
        return this.getAvailableMovesState(this.localBoards, this.wonBoards, this.activeBoard);
    }
    
    getAvailableMovesState(localBoards, wonBoards, activeBoard) {
        const moves = [];
        
        // Determine which boards can be played
        const playableBoards = [];
        if (activeBoard === null) {
            // Can play in any board that's not won or full
            for (let i = 0; i < 9; i++) {
                if (wonBoards[i] === null && !this.isBoardFullState(localBoards[i])) {
                    playableBoards.push(i);
                }
            }
        } else {
            // Must play in active board (unless it's won/full, then can play anywhere)
            if (wonBoards[activeBoard] === null && !this.isBoardFullState(localBoards[activeBoard])) {
                playableBoards.push(activeBoard);
            } else {
                // Special rule: can play anywhere
                for (let i = 0; i < 9; i++) {
                    if (wonBoards[i] === null && !this.isBoardFullState(localBoards[i])) {
                        playableBoards.push(i);
                    }
                }
            }
        }
        
        // Get all available cells in playable boards
        for (const boardIndex of playableBoards) {
            for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
                if (localBoards[boardIndex][cellIndex] === null) {
                    moves.push({ boardIndex, cellIndex });
                }
            }
        }
        
        return moves;
    }
    
    wouldWinLocalBoard(boardIndex, cellIndex, player) {
        // Simulate move and check if it wins the local board
        const testBoard = [...this.localBoards[boardIndex]];
        testBoard[cellIndex] = player;
        return this.checkLocalBoardWinState(testBoard, player) !== null;
    }
    
    wouldWinGlobalBoard(boardIndex, cellIndex, player) {
        // Simulate move and check if it wins the global board
        const testLocalBoards = this.localBoards.map(b => [...b]);
        const testWonBoards = [...this.wonBoards];
        
        testLocalBoards[boardIndex][cellIndex] = player;
        const localWinner = this.checkLocalBoardWinState(testLocalBoards[boardIndex], player);
        if (localWinner) {
            testWonBoards[boardIndex] = localWinner;
            return this.checkGlobalBoardWinState(testWonBoards) === player;
        }
        return false;
    }
    
    getNextBoard(cellIndex) {
        // The cell position determines which board to play next
        // cellIndex: 0-8 (0=top-left, 1=top-center, 2=top-right, etc.)
        return cellIndex;
    }
    
    checkLocalBoardWin(boardIndex) {
        return this.checkLocalBoardWinState(this.localBoards[boardIndex], this.currentPlayer);
    }
    
    checkLocalBoardWinState(board, player) {
        // Check rows
        for (let row = 0; row < 3; row++) {
            if (board[row * 3] === player && 
                board[row * 3 + 1] === player && 
                board[row * 3 + 2] === player) {
                return player;
            }
        }
        
        // Check columns
        for (let col = 0; col < 3; col++) {
            if (board[col] === player && 
                board[col + 3] === player && 
                board[col + 6] === player) {
                return player;
            }
        }
        
        // Check diagonals
        if (board[0] === player && board[4] === player && board[8] === player) {
            return player;
        }
        if (board[2] === player && board[4] === player && board[6] === player) {
            return player;
        }
        
        return null;
    }
    
    checkGlobalBoardWin() {
        return this.checkGlobalBoardWinState(this.wonBoards);
    }
    
    checkGlobalBoardWinState(wonBoards) {
        // Check rows
        for (let row = 0; row < 3; row++) {
            const start = row * 3;
            if (wonBoards[start] && wonBoards[start] === wonBoards[start + 1] && wonBoards[start] === wonBoards[start + 2]) {
                return wonBoards[start];
            }
        }
        
        // Check columns
        for (let col = 0; col < 3; col++) {
            if (wonBoards[col] && wonBoards[col] === wonBoards[col + 3] && wonBoards[col] === wonBoards[col + 6]) {
                return wonBoards[col];
            }
        }
        
        // Check diagonals
        if (wonBoards[0] && wonBoards[0] === wonBoards[4] && wonBoards[0] === wonBoards[8]) {
            return wonBoards[0];
        }
        if (wonBoards[2] && wonBoards[2] === wonBoards[4] && wonBoards[2] === wonBoards[6]) {
            return wonBoards[2];
        }
        
        return null;
    }
    
    isBoardFull(boardIndex) {
        return this.isBoardFullState(this.localBoards[boardIndex]);
    }
    
    isBoardFullState(board) {
        return board.every(cell => cell !== null);
    }
    
    isGameDraw() {
        // Check if all boards are either won or full
        for (let i = 0; i < 9; i++) {
            if (this.wonBoards[i] === null && !this.isBoardFull(i)) {
                return false;
            }
        }
        return true;
    }
    
    markBoardWon(boardIndex, winner) {
        const localBoard = document.querySelector(`.local-board[data-board-index="${boardIndex}"]`);
        localBoard.classList.add(`won-${winner.toLowerCase()}`);
        
        const overlay = localBoard.querySelector('.winner-overlay');
        overlay.textContent = winner;
        overlay.classList.add(winner.toLowerCase());
        overlay.style.display = 'flex';
        
        // Disable all cells in this board
        const cells = localBoard.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.add('occupied');
            cell.style.pointerEvents = 'none';
        });
    }
    
    updateStatus() {
        const playerIndicator = document.getElementById('player-indicator');
        const status = document.getElementById('status');
        
        playerIndicator.textContent = this.currentPlayer;
        playerIndicator.style.color = this.currentPlayer === 'X' ? '#667eea' : '#764ba2';
        
        if (this.gameOver) {
            if (this.winner) {
                if (this.gameMode === '1player' && this.winner === this.computerPlayer) {
                    status.textContent = 'Computer wins!';
                } else if (this.gameMode === '1player' && this.winner === this.humanPlayer) {
                    status.textContent = 'You win!';
                } else {
                    status.textContent = `Player ${this.winner} wins!`;
                }
            } else {
                status.textContent = "It's a draw!";
            }
        } else {
            if (this.gameMode === '1player' && this.currentPlayer === this.computerPlayer) {
                status.textContent = 'Computer is thinking...';
            } else if (this.gameMode === '1player') {
                if (this.activeBoard === null) {
                    status.textContent = 'Your turn - Play anywhere';
                } else {
                    const boardRow = Math.floor(this.activeBoard / 3);
                    const boardCol = this.activeBoard % 3;
                    status.textContent = `Your turn - Play in board (${boardRow + 1}, ${boardCol + 1})`;
                }
            } else {
                if (this.activeBoard === null) {
                    status.textContent = `Player ${this.currentPlayer}'s turn - Play anywhere`;
                } else {
                    const boardRow = Math.floor(this.activeBoard / 3);
                    const boardCol = this.activeBoard % 3;
                    status.textContent = `Player ${this.currentPlayer}'s turn - Play in board (${boardRow + 1}, ${boardCol + 1})`;
                }
            }
        }
    }
    
    updateActiveBoards() {
        const allBoards = document.querySelectorAll('.local-board');
        
        allBoards.forEach((board, index) => {
            board.classList.remove('active', 'inactive');
            
            if (this.gameOver) {
                board.classList.add('inactive');
                return;
            }
            
            // Don't highlight boards during computer's turn
            if (this.gameMode === '1player' && this.currentPlayer === this.computerPlayer) {
                board.classList.add('inactive');
                return;
            }
            
            if (this.activeBoard === null) {
                // Can play anywhere, highlight all playable boards
                if (this.wonBoards[index] === null && !this.isBoardFull(index)) {
                    board.classList.add('active');
                } else {
                    board.classList.add('inactive');
                }
            } else {
                // Must play in specific board
                if (index === this.activeBoard) {
                    board.classList.add('active');
                } else {
                    board.classList.add('inactive');
                }
            }
        });
    }
    
    showGameOver(winner) {
        // Create game over modal if it doesn't exist
        let modal = document.querySelector('.game-over');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'game-over';
            modal.innerHTML = `
                <div class="game-over-content">
                    <h2 id="game-over-message"></h2>
                    <button id="play-again-btn">Play Again</button>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('play-again-btn').addEventListener('click', () => {
                this.reset();
                modal.classList.remove('show');
            });
        }
        
        const message = document.getElementById('game-over-message');
        if (winner) {
            if (this.gameMode === '1player' && winner === this.computerPlayer) {
                message.textContent = 'Computer Wins!';
            } else if (this.gameMode === '1player' && winner === this.humanPlayer) {
                message.textContent = 'You Win!';
            } else {
                message.textContent = `Player ${winner} Wins!`;
            }
            message.style.color = winner === 'X' ? '#667eea' : '#764ba2';
        } else {
            message.textContent = "It's a Draw!";
            message.style.color = '#666';
        }
        
        modal.classList.add('show');
        this.updateStatus();
        this.updateActiveBoards();
    }
    
    reset() {
        // Show setup screen again
        this.setupScreen.classList.remove('hidden');
        this.gameContainer.classList.add('hidden');
        
        // Reset game state
        this.currentPlayer = 'X';
        this.activeBoard = null;
        this.localBoards = Array(9).fill(null).map(() => Array(9).fill(null));
        this.wonBoards = Array(9).fill(null);
        this.gameOver = false;
        this.winner = null;
        this.computerPlayer = null;
        this.humanPlayer = null;
        this.lastMove = null;
        this.boardFirstMoves = Array(9).fill(false);
        
        // Remove last move highlight
        document.querySelectorAll('.last-move').forEach(cell => {
            cell.classList.remove('last-move');
        });
        
        // Hide game over modal if visible
        const modal = document.querySelector('.game-over');
        if (modal) {
            modal.classList.remove('show');
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new UltimateTicTacToe();
});
