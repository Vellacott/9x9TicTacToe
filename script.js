// Firebase imports (will be loaded from CDN)
let ref, onValue, set, push, remove, get;

class UltimateTicTacToe {
    constructor() {
        this.currentPlayer = 'X';
        this.activeBoard = null; // null means any board can be played
        this.localBoards = Array(9).fill(null).map(() => Array(9).fill(null));
        this.wonBoards = Array(9).fill(null); // 'X', 'O', or null
        this.gameOver = false;
        this.winner = null;
        this.gameMode = '2player'; // '2player', '1player', or 'online'
        this.difficulty = 'easy'; // 'easy', 'medium', 'hard'
        this.computerPlayer = null; // 'X' or 'O' or null
        this.humanPlayer = null; // 'X' or 'O' or null
        this.lastMove = null; // { boardIndex, cellIndex }
        this.boardFirstMoves = Array(9).fill(false); // Track if first move made in each board
        
        // Online multiplayer state
        this.gameId = null;
        this.playerId = null; // 'player1' or 'player2'
        this.myPlayer = null; // 'X' or 'O'
        this.opponentPlayer = null; // 'X' or 'O'
        this.gameRef = null;
        this.isOnline = false;
        this.isMyTurn = false;
        this.isSyncing = false; // Flag to prevent listener from overwriting during sync
        
        // Timer state
        this.timerType = 'none'; // 'none', 'rapid', 'bullet'
        this.timerX = 0; // Time remaining for player X in milliseconds
        this.timerO = 0; // Time remaining for player O in milliseconds
        this.timerIncrement = 0; // Increment per move in milliseconds
        this.timerInterval = null; // Interval ID for timer updates
        this.timerStartTime = null; // When current player's timer started
        this.lastTimerSync = null; // Last time timer was synced to Firebase
        
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
                const onlineOptions = document.getElementById('online-options');
                
                if (e.target.value === '1player') {
                    computerOptions.style.display = 'block';
                    playerOrderOptions.style.display = 'block';
                    onlineOptions.style.display = 'none';
                } else if (e.target.value === 'online') {
                    computerOptions.style.display = 'none';
                    playerOrderOptions.style.display = 'none';
                    onlineOptions.style.display = 'block';
                } else {
                    computerOptions.style.display = 'none';
                    playerOrderOptions.style.display = 'none';
                    onlineOptions.style.display = 'none';
                }
            });
        });
        
        // Online action change handler
        document.querySelectorAll('input[name="online-action"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const joinInput = document.getElementById('join-game-input');
                const gameIdDisplay = document.getElementById('game-id-display');
                if (e.target.value === 'join') {
                    joinInput.style.display = 'block';
                    gameIdDisplay.style.display = 'none';
                } else {
                    joinInput.style.display = 'none';
                    gameIdDisplay.style.display = 'none';
                }
            });
        });
        
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    }
    
    async startGame() {
        // Get game mode
        const gameModeRadio = document.querySelector('input[name="game-mode"]:checked');
        this.gameMode = gameModeRadio.value;
        
        if (this.gameMode === 'online') {
            // Initialize Firebase functions
            if (window.firebaseDatabase) {
                const { ref: refFn, onValue: onValueFn, set: setFn, push: pushFn, remove: removeFn, get: getFn } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
                ref = refFn;
                onValue = onValueFn;
                set = setFn;
                push = pushFn;
                remove = removeFn;
                get = getFn;
            } else {
                alert('Firebase is not loaded. Please refresh the page.');
                return;
            }
            
            const onlineAction = document.querySelector('input[name="online-action"]:checked').value;
            
            if (onlineAction === 'create') {
                await this.createOnlineGame();
            } else {
                const gameIdInput = document.getElementById('game-id-input').value.trim();
                if (!gameIdInput) {
                    alert('Please enter a Game ID');
                    return;
                }
                await this.joinOnlineGame(gameIdInput);
            }
            return; // Don't proceed with normal game initialization
        }
        
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
        
        // Initialize timer
        const timerRadio = document.querySelector('input[name="timer"]:checked');
        this.timerType = timerRadio ? timerRadio.value : 'none';
        this.initializeTimer();
        
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
    
    async createOnlineGame() {
        // Generate unique game ID
        this.gameId = this.generateGameId();
        this.playerId = 'player1';
        this.myPlayer = 'X';
        this.opponentPlayer = 'O';
        this.isOnline = true;
        this.isMyTurn = true;
        
        // Show game ID to user
        document.getElementById('game-id-text').textContent = this.gameId;
        document.getElementById('game-id-display').style.display = 'block';
        
        // Update URL with game ID
        const url = new URL(window.location.href);
        url.searchParams.set('game', this.gameId);
        window.history.pushState({}, '', url);
        
        // Setup copy link button
        const copyLinkBtn = document.getElementById('copy-link-btn');
        if (copyLinkBtn) {
            copyLinkBtn.onclick = () => {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    const originalText = copyLinkBtn.textContent;
                    copyLinkBtn.textContent = 'Link Copied!';
                    copyLinkBtn.style.background = '#4caf50';
                    setTimeout(() => {
                        copyLinkBtn.textContent = originalText;
                        copyLinkBtn.style.background = '#667eea';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy link:', err);
                    alert('Failed to copy link. Please copy the URL manually.');
                });
            };
        }
        
        // Create game in Firebase
        const gameRef = ref(window.firebaseDatabase, `games/${this.gameId}`);
        this.gameRef = gameRef;
        
        // Initialize timer before creating game
        const timerRadio = document.querySelector('input[name="timer"]:checked');
        this.timerType = timerRadio ? timerRadio.value : 'none';
        this.initializeTimer();
        
        const gameData = {
            player1: {
                id: this.playerId,
                player: 'X',
                connected: true
            },
            player2: null,
            currentPlayer: 'X',
            activeBoard: null,
            localBoards: JSON.parse(JSON.stringify(this.localBoards)), // Deep copy
            wonBoards: JSON.parse(JSON.stringify(this.wonBoards)), // Deep copy
            gameOver: false,
            winner: null,
            lastMove: null,
            timerType: this.timerType,
            timerX: this.timerType !== 'none' ? this.timerX : null,
            timerO: this.timerType !== 'none' ? this.timerO : null,
            timerIncrement: this.timerType !== 'none' ? this.timerIncrement : null,
            createdAt: Date.now()
        };
        
        try {
            await set(gameRef, gameData);
            console.log('Game created successfully:', this.gameId);
        } catch (error) {
            console.error('Error creating game:', error);
            alert(`Failed to create game: ${error.message}\n\nPlease check:\n1. Security rules are set up correctly\n2. Database URL is correct in index.html\n3. Realtime Database is enabled`);
            document.getElementById('game-id-display').style.display = 'none';
            return;
        }
        
        // Listen for player2 joining
        onValue(ref(window.firebaseDatabase, `games/${this.gameId}/player2`), (snapshot) => {
            if (snapshot.exists() && snapshot.val() && snapshot.val().connected) {
                // Player 2 joined, start the game
                this.startOnlineGame();
            }
        });
        
        // Listen for game state changes
        this.setupOnlineListeners();
    }
    
    async joinOnlineGame(gameId) {
        this.gameId = gameId;
        this.playerId = 'player2';
        this.myPlayer = 'O';
        this.opponentPlayer = 'X';
        this.isOnline = true;
        this.isMyTurn = false;
        
        const gameRef = ref(window.firebaseDatabase, `games/${gameId}`);
        this.gameRef = gameRef;
        
        // Check if game exists
        const snapshot = await get(gameRef);
        if (!snapshot.exists()) {
            alert('Game not found. Please check the Game ID.');
            return;
        }
        
        const gameData = snapshot.val();
        
        // Check if player2 already exists and is connected
        if (gameData.player2 && gameData.player2.connected) {
            alert('This game is already full.');
            return;
        }
        
        // Check if player1 exists
        if (!gameData.player1 || !gameData.player1.connected) {
            alert('Game not ready. Player 1 is not connected.');
            return;
        }
        
        // Join the game
        try {
            await set(ref(window.firebaseDatabase, `games/${gameId}/player2`), {
                id: this.playerId,
                player: 'O',
                connected: true
            });
            console.log('Joined game successfully:', gameId);
            
            // Update URL with game ID
            const url = new URL(window.location.href);
            url.searchParams.set('game', gameId);
            window.history.pushState({}, '', url);
        } catch (error) {
            console.error('Error joining game:', error);
            alert(`Failed to join game: ${error.message}\n\nPlease check:\n1. Security rules are set up correctly\n2. Database URL is correct in index.html\n3. Game ID is correct`);
            return;
        }
        
        // Start the game
        this.startOnlineGame();
        this.setupOnlineListeners();
    }
    
    startOnlineGame() {
        // Hide setup screen, show game
        this.setupScreen.classList.add('hidden');
        this.gameContainer.classList.remove('hidden');
        
        // Initialize game
        this.init();
        
        // Load game state from Firebase
        this.loadGameState().then(() => {
            // Ensure isMyTurn is set correctly after loading
            this.isMyTurn = (this.currentPlayer === this.myPlayer && !this.gameOver);
            this.updateStatus();
            this.updateActiveBoards();
        });
    }
    
    setupOnlineListeners() {
        // Track last processed state to avoid processing the same state twice
        let lastProcessedState = null;
        
        // Listen for game state changes
        onValue(this.gameRef, (snapshot) => {
            if (!snapshot.exists()) return;
            
            const gameData = snapshot.val();
            
            // Create a state signature to detect changes
            const stateSignature = JSON.stringify({
                currentPlayer: gameData.currentPlayer,
                lastMove: gameData.lastMove,
                gameOver: gameData.gameOver,
                winner: gameData.winner
            });
            
            // Check if this is the opponent's move
            // An opponent move means: the lastMove in Firebase is different from what we have locally
            const newLastMove = gameData.lastMove;
            const isOpponentMove = newLastMove && 
                                  (!this.lastMove || 
                                   newLastMove.boardIndex !== this.lastMove.boardIndex ||
                                   newLastMove.cellIndex !== this.lastMove.cellIndex);
            
            // Also check if currentPlayer changed to opponent (turn switched to them)
            const newCurrentPlayer = gameData.currentPlayer || 'X';
            const turnSwitchedToOpponent = newCurrentPlayer === this.opponentPlayer && newCurrentPlayer !== this.currentPlayer;
            
            // Check if game over state changed
            const gameOverChanged = (gameData.gameOver || false) !== this.gameOver;
            
            // Skip update if we're syncing our own move (unless it's clearly the opponent's move or game over)
            if (this.isSyncing && !isOpponentMove && !turnSwitchedToOpponent && !gameOverChanged && lastProcessedState !== null) {
                return;
            }
            
            // Always update if state changed (to ensure UI is always in sync with Firebase)
            if (lastProcessedState !== stateSignature) {
                lastProcessedState = stateSignature;
                
                // Update game state from Firebase
                const oldCurrentPlayer = this.currentPlayer;
                this.currentPlayer = newCurrentPlayer;
                
                // Ensure activeBoard is either null or a valid number (0-8)
                const activeBoardValue = gameData.activeBoard;
                this.activeBoard = (activeBoardValue !== null && activeBoardValue !== undefined && !isNaN(activeBoardValue) && activeBoardValue >= 0 && activeBoardValue <= 8) 
                    ? Number(activeBoardValue) 
                    : null;
                
                // Deep copy arrays to avoid reference issues
                // Firebase might store arrays as objects, so we need to convert them properly
                if (gameData.localBoards) {
                    try {
                        // Helper function to convert Firebase object to array
                        const convertToArray = (obj, length) => {
                            if (Array.isArray(obj)) {
                                return [...obj];
                            } else if (obj && typeof obj === 'object') {
                                // Firebase stores arrays as objects with numeric string keys
                                const result = Array(length).fill(null);
                                for (const key in obj) {
                                    const index = parseInt(key, 10);
                                    if (!isNaN(index) && index >= 0 && index < length) {
                                        result[index] = obj[key];
                                    }
                                }
                                return result;
                            } else {
                                return Array(length).fill(null);
                            }
                        };
                        
                        // Convert top-level boards array
                        const boardsArray = convertToArray(gameData.localBoards, 9);
                        
                        // Convert each board's cells array
                        this.localBoards = boardsArray.map(board => convertToArray(board, 9));
                        
                        // Ensure we have exactly 9 boards with 9 cells each, all properly initialized
                        while (this.localBoards.length < 9) {
                            this.localBoards.push(Array(9).fill(null));
                        }
                        this.localBoards = this.localBoards.slice(0, 9);
                        this.localBoards = this.localBoards.map(board => {
                            const arr = Array.isArray(board) ? board : Array(9).fill(null);
                            // Ensure array has exactly 9 elements, all null or valid values
                            const normalized = Array(9).fill(null);
                            for (let i = 0; i < 9 && i < arr.length; i++) {
                                normalized[i] = (arr[i] === 'X' || arr[i] === 'O') ? arr[i] : null;
                            }
                            return normalized;
                        });
                        
                    } catch (error) {
                        console.error(`[listener] Error processing localBoards:`, error, gameData.localBoards);
                        // Keep existing boards if there's an error
                    }
                }
                // If no localBoards in Firebase, keep existing boards (expected on initial load)
                
                if (gameData.wonBoards) {
                    // Convert to array if it's an object
                    if (Array.isArray(gameData.wonBoards)) {
                        this.wonBoards = [...gameData.wonBoards];
                    } else if (gameData.wonBoards && typeof gameData.wonBoards === 'object') {
                        // Convert object to array - CRITICAL: preserve index positions
                        // Firebase stores sparse arrays as objects like {"4": "O"}, we need to put "O" at index 4
                        this.wonBoards = Array(9).fill(null);
                        for (const key in gameData.wonBoards) {
                            const index = parseInt(key, 10);
                            if (!isNaN(index) && index >= 0 && index < 9) {
                                this.wonBoards[index] = gameData.wonBoards[key];
                            }
                        }
                    } else {
                        this.wonBoards = Array(9).fill(null);
                    }
                    // Ensure we have exactly 9 elements
                    while (this.wonBoards.length < 9) {
                        this.wonBoards.push(null);
                    }
                    this.wonBoards = this.wonBoards.slice(0, 9);
                    console.log(`[listener] Received wonBoards from Firebase:`, JSON.stringify(this.wonBoards));
                }
                
                this.gameOver = gameData.gameOver || false;
                this.winner = gameData.winner || null;
                this.lastMove = gameData.lastMove ? { ...gameData.lastMove } : null;
                
                // Load timer state from Firebase
                if (gameData.timerType && gameData.timerType !== 'none') {
                    this.timerType = gameData.timerType;
                    if (gameData.timerX !== null && gameData.timerX !== undefined) {
                        this.timerX = gameData.timerX;
                    }
                    if (gameData.timerO !== null && gameData.timerO !== undefined) {
                        this.timerO = gameData.timerO;
                    }
                    if (gameData.timerIncrement !== null && gameData.timerIncrement !== undefined) {
                        this.timerIncrement = gameData.timerIncrement;
                    }
                    // Show timer display
                    document.getElementById('timer-display').style.display = 'block';
                }
                
                // Check if it's my turn (before updating UI)
                this.isMyTurn = (this.currentPlayer === this.myPlayer && !this.gameOver);
                
                // Restart timer if current player changed or timer isn't running
                if (!this.gameOver && this.timerType !== 'none') {
                    if (oldCurrentPlayer !== this.currentPlayer || !this.timerInterval) {
                        this.stopTimer();
                        this.startTimer();
                    }
                } else if (this.gameOver) {
                    this.stopTimer();
                }
                
                // Update UI
                this.updateBoardUI();
                this.updateStatus();
                this.updateActiveBoards();
                this.updateTimerDisplay();
                
                // Show game over if needed
                if (this.gameOver && this.winner) {
                    this.showGameOver(this.winner);
                } else if (this.gameOver && !this.winner) {
                    this.showGameOver(null);
                }
            }
        });
        
        // Listen for opponent disconnect
        const opponentKey = this.playerId === 'player1' ? 'player2' : 'player1';
        onValue(ref(window.firebaseDatabase, `games/${this.gameId}/${opponentKey}/connected`), (snapshot) => {
            if (snapshot.exists() && snapshot.val() === false) {
                alert('Your opponent has disconnected.');
            }
        });
    }
    
    async loadGameState() {
        const snapshot = await get(this.gameRef);
        if (!snapshot.exists()) return;
        
        const gameData = snapshot.val();
        this.currentPlayer = gameData.currentPlayer || 'X';
        // Ensure activeBoard is either null or a valid number (0-8)
        const activeBoardValue = gameData.activeBoard;
        this.activeBoard = (activeBoardValue !== null && activeBoardValue !== undefined && !isNaN(activeBoardValue) && activeBoardValue >= 0 && activeBoardValue <= 8) 
            ? Number(activeBoardValue) 
            : null;
        
        // Deep copy arrays to avoid reference issues
        // Firebase might store arrays as objects, so we need to convert them properly
        if (gameData.localBoards) {
            try {
                // Helper function to convert Firebase object to array
                const convertToArray = (obj, length) => {
                    if (Array.isArray(obj)) {
                        return [...obj];
                    } else if (obj && typeof obj === 'object') {
                        // Firebase stores arrays as objects with numeric string keys
                        const result = Array(length).fill(null);
                        for (const key in obj) {
                            const index = parseInt(key, 10);
                            if (!isNaN(index) && index >= 0 && index < length) {
                                result[index] = obj[key];
                            }
                        }
                        return result;
                    } else {
                        return Array(length).fill(null);
                    }
                };
                
                // Convert top-level boards array
                const boardsArray = convertToArray(gameData.localBoards, 9);
                
                // Convert each board's cells array
                this.localBoards = boardsArray.map(board => convertToArray(board, 9));
                
                // Ensure we have exactly 9 boards with 9 cells each, all properly initialized
                while (this.localBoards.length < 9) {
                    this.localBoards.push(Array(9).fill(null));
                }
                this.localBoards = this.localBoards.slice(0, 9);
                this.localBoards = this.localBoards.map(board => {
                    const arr = Array.isArray(board) ? board : Array(9).fill(null);
                    // Ensure array has exactly 9 elements, all null or valid values
                    const normalized = Array(9).fill(null);
                    for (let i = 0; i < 9 && i < arr.length; i++) {
                        normalized[i] = (arr[i] === 'X' || arr[i] === 'O') ? arr[i] : null;
                    }
                    return normalized;
                });
            } catch (error) {
                console.error(`[loadGameState] Error processing localBoards:`, error);
            }
        }
        
        if (gameData.wonBoards) {
            // Convert to array if it's an object
            if (Array.isArray(gameData.wonBoards)) {
                this.wonBoards = [...gameData.wonBoards];
            } else if (gameData.wonBoards && typeof gameData.wonBoards === 'object') {
                // Convert object to array - CRITICAL: preserve index positions
                // Firebase stores sparse arrays as objects like {"4": "O"}, we need to put "O" at index 4
                this.wonBoards = Array(9).fill(null);
                for (const key in gameData.wonBoards) {
                    const index = parseInt(key, 10);
                    if (!isNaN(index) && index >= 0 && index < 9) {
                        this.wonBoards[index] = gameData.wonBoards[key];
                    }
                }
            } else {
                this.wonBoards = Array(9).fill(null);
            }
            // Ensure we have exactly 9 elements
            while (this.wonBoards.length < 9) {
                this.wonBoards.push(null);
            }
            this.wonBoards = this.wonBoards.slice(0, 9);
        }
        
        this.gameOver = gameData.gameOver || false;
        this.winner = gameData.winner || null;
        this.lastMove = gameData.lastMove ? { ...gameData.lastMove } : null;
        
        // Load timer state from Firebase
        if (gameData.timerType && gameData.timerType !== 'none') {
            this.timerType = gameData.timerType;
            if (gameData.timerX !== null && gameData.timerX !== undefined) {
                this.timerX = gameData.timerX;
            }
            if (gameData.timerO !== null && gameData.timerO !== undefined) {
                this.timerO = gameData.timerO;
            }
            if (gameData.timerIncrement !== null && gameData.timerIncrement !== undefined) {
                this.timerIncrement = gameData.timerIncrement;
            }
            // Show timer display
            document.getElementById('timer-display').style.display = 'block';
        }
        
        // Set isMyTurn correctly
        this.isMyTurn = (this.currentPlayer === this.myPlayer && !this.gameOver);
        
        // Initialize timer if needed
        if (this.timerType !== 'none') {
            this.updateTimerDisplay();
            if (!this.gameOver) {
                this.startTimer();
            }
        }
        
        this.updateBoardUI();
        this.updateStatus();
        this.updateActiveBoards();
    }
    
    updateBoardUI() {
        // Check if DOM is ready
        const globalBoard = document.getElementById('global-board');
        if (!globalBoard || !globalBoard.children.length) {
            // DOM not ready yet, skip update
            return;
        }
        
        // Ensure localBoards is properly structured
        if (!this.localBoards || !Array.isArray(this.localBoards) || this.localBoards.length !== 9) {
            return;
        }
        
        // Update all cells based on current game state
        for (let boardIndex = 0; boardIndex < 9; boardIndex++) {
            const board = this.localBoards[boardIndex];
            if (!board || !Array.isArray(board) || board.length !== 9) {
                continue;
            }
            
            for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
                const cell = document.querySelector(`[data-board-index="${boardIndex}"][data-cell-index="${cellIndex}"]`);
                if (!cell) continue;
                
                const value = board[cellIndex];
                if (value === 'X' || value === 'O') {
                    cell.textContent = value;
                    cell.classList.add('occupied', value.toLowerCase());
                    cell.classList.remove(value === 'X' ? 'o' : 'x');
                } else {
                    cell.textContent = '';
                    cell.classList.remove('occupied', 'x', 'o');
                }
            }
            
            // Update won boards
            if (this.wonBoards && this.wonBoards[boardIndex]) {
                this.markBoardWon(boardIndex, this.wonBoards[boardIndex]);
            }
        }
        
        // Update last move highlight
        document.querySelectorAll('.last-move').forEach(cell => {
            cell.classList.remove('last-move');
        });
        if (this.lastMove && this.lastMove.boardIndex !== undefined && this.lastMove.cellIndex !== undefined) {
            const lastCell = document.querySelector(`[data-board-index="${this.lastMove.boardIndex}"][data-cell-index="${this.lastMove.cellIndex}"]`);
            if (lastCell) {
                lastCell.classList.add('last-move');
            }
        }
    }
    
    async syncGameState() {
        if (!this.isOnline || !this.gameRef) return;
        
        // Get current game data to preserve player info
        const snapshot = await get(this.gameRef);
        const currentData = snapshot.exists() ? snapshot.val() : {};
        
        // Sanitize localBoards: replace undefined with null (Firebase doesn't allow undefined)
        const sanitizedLocalBoards = this.localBoards.map(board => {
            if (!Array.isArray(board)) return Array(9).fill(null);
            return board.map(cell => (cell === undefined || cell === null) ? null : cell);
        });
        
        // Sanitize wonBoards: replace undefined with null
        const sanitizedWonBoards = this.wonBoards.map(board => 
            (board === undefined || board === null) ? null : board
        );
        
        // Calculate current timer values (accounting for elapsed time if timer is running)
        let timerX = this.timerX;
        let timerO = this.timerO;
        if (this.timerStartTime && this.timerType !== 'none' && !this.gameOver) {
            const elapsed = Date.now() - this.timerStartTime;
            if (this.currentPlayer === 'X') {
                timerX = Math.max(0, this.timerX - elapsed);
            } else {
                timerO = Math.max(0, this.timerO - elapsed);
            }
        }
        
        const gameData = {
            ...currentData,
            currentPlayer: this.currentPlayer,
            activeBoard: this.activeBoard === undefined ? null : this.activeBoard,
            localBoards: sanitizedLocalBoards,
            wonBoards: sanitizedWonBoards,
            gameOver: this.gameOver || false,
            winner: this.winner || null,
            lastMove: this.lastMove || null,
            timerType: this.timerType,
            timerX: this.timerType !== 'none' ? timerX : null,
            timerO: this.timerType !== 'none' ? timerO : null,
            timerIncrement: this.timerType !== 'none' ? this.timerIncrement : null
        };
        
        console.log(`[syncGameState] Syncing state: currentPlayer=${this.currentPlayer}, lastMove=`, this.lastMove, `wonBoards=`, JSON.stringify(sanitizedWonBoards));
        await set(this.gameRef, gameData);
        console.log(`[syncGameState] Sync complete`);
    }
    
    generateGameId() {
        // Generate a 6-character alphanumeric game ID
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
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
        
        // Debug panel
        const debugBtn = document.getElementById('debug-btn');
        const debugPanel = document.getElementById('debug-panel');
        const copyStateBtn = document.getElementById('copy-state-btn');
        
        if (debugBtn && debugPanel) {
            debugBtn.addEventListener('click', () => {
                const isVisible = debugPanel.style.display !== 'none';
                debugPanel.style.display = isVisible ? 'none' : 'block';
                if (!isVisible) {
                    this.updateDebugPanel();
                }
            });
        }
        
        if (copyStateBtn) {
            copyStateBtn.addEventListener('click', () => {
                const state = this.getGameStateJSON();
                navigator.clipboard.writeText(state).then(() => {
                    const originalText = copyStateBtn.textContent;
                    copyStateBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyStateBtn.textContent = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy state:', err);
                    alert('Failed to copy. Check console for state.');
                });
            });
        }
    }
    
    getGameStateJSON() {
        const state = {
            timestamp: new Date().toISOString(),
            gameMode: this.gameMode,
            isOnline: this.isOnline,
            gameId: this.gameId,
            playerId: this.playerId,
            myPlayer: this.myPlayer,
            opponentPlayer: this.opponentPlayer,
            currentPlayer: this.currentPlayer,
            isMyTurn: this.isMyTurn,
            activeBoard: this.activeBoard,
            gameOver: this.gameOver,
            winner: this.winner,
            lastMove: this.lastMove,
            localBoards: this.localBoards,
            wonBoards: this.wonBoards,
            boardFirstMoves: this.boardFirstMoves
        };
        return JSON.stringify(state, null, 2);
    }
    
    updateDebugPanel() {
        const debugContent = document.getElementById('debug-content');
        if (!debugContent) return;
        
        const state = this.getGameStateJSON();
        debugContent.textContent = state;
    }
    
    handleCellClick(boardIndex, cellIndex) {
        if (this.gameOver) return;
        
        // Validate board structure
        if (!this.localBoards || !Array.isArray(this.localBoards) || 
            !this.localBoards[boardIndex] || !Array.isArray(this.localBoards[boardIndex])) {
            console.error('Invalid board structure in handleCellClick');
            return;
        }
        
        // Don't allow clicks if it's not your turn in online mode
        if (this.isOnline && !this.isMyTurn) {
            return;
        }
        
        // Don't allow human clicks during computer's turn
        if (this.gameMode === '1player' && this.currentPlayer === this.computerPlayer) {
            return;
        }
        
        // Check if cell is already occupied (handle both null and undefined)
        const cellValue = this.localBoards[boardIndex][cellIndex];
        if (cellValue !== null && cellValue !== undefined) {
            return;
        }
        
        // Check if board is won or full (special rule: can play anywhere)
        const boardWonOrFull = this.wonBoards[boardIndex] !== null || this.isBoardFull(boardIndex);
        
        // Check if this move is allowed
        if (this.activeBoard !== null && this.activeBoard !== undefined) {
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
        // Validate board structure before making move
        if (!this.localBoards || !Array.isArray(this.localBoards) || 
            !this.localBoards[boardIndex] || !Array.isArray(this.localBoards[boardIndex])) {
            console.error('Invalid board structure in makeMove, cannot make move');
            return;
        }
        
        // Ensure the cell index is valid
        if (cellIndex < 0 || cellIndex >= 9 || boardIndex < 0 || boardIndex >= 9) {
            console.error('Invalid cell or board index in makeMove');
            return;
        }
        
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
            console.log(`[makeMove] Board ${boardIndex} won by ${localWinner}. Move: board=${boardIndex}, cell=${cellIndex}, player=${this.currentPlayer}`);
            this.wonBoards[boardIndex] = localWinner;
            this.markBoardWon(boardIndex, localWinner);
            console.log(`[makeMove] wonBoards after win:`, JSON.stringify(this.wonBoards));
        }
        
        // Check for global board win
        const globalWinner = this.checkGlobalBoardWin();
        if (globalWinner) {
            this.gameOver = true;
            this.winner = globalWinner;
            
            // Sync game over state to Firebase before showing modal
            if (this.isOnline) {
                this.syncGameState().then(() => {
                    this.showGameOver(globalWinner);
                }).catch(error => {
                    console.error('Error syncing game over state:', error);
                    this.showGameOver(globalWinner);
                });
            } else {
                this.showGameOver(globalWinner);
            }
            return;
        }
        
        // Check if game is a draw (all boards won or full)
        if (this.isGameDraw()) {
            this.gameOver = true;
            
            // Sync game over state to Firebase before showing modal
            if (this.isOnline) {
                this.syncGameState().then(() => {
                    this.showGameOver(null);
                }).catch(error => {
                    console.error('Error syncing game over state:', error);
                    this.showGameOver(null);
                });
            } else {
                this.showGameOver(null);
            }
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
        
        // Handle timer: stop current player's timer and add increment
        const playerWhoJustMoved = this.currentPlayer; // Save before switching
        this.stopTimer();
        this.addTimerIncrement(playerWhoJustMoved);
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        
        // Start timer for new current player
        this.startTimer();
        
        // Update UI
        this.updateStatus();
        this.updateActiveBoards();
        
        // Sync with Firebase if online
        if (this.isOnline) {
            // Update isMyTurn before syncing
            this.isMyTurn = (this.currentPlayer === this.myPlayer && !this.gameOver);
            // Set syncing flag and sync
            this.isSyncing = true;
            this.syncGameState().then(() => {
                this.isSyncing = false;
            }).catch(error => {
                console.error('Error syncing game state:', error);
                this.isSyncing = false;
            });
        }
        
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
        console.log(`[markBoardWon] Marking board ${boardIndex} as won by ${winner}`);
        const localBoard = document.querySelector(`.local-board[data-board-index="${boardIndex}"]`);
        if (!localBoard) {
            console.error(`[markBoardWon] Board element not found for index ${boardIndex}`);
            return;
        }
        localBoard.classList.add(`won-${winner.toLowerCase()}`);
        
        const overlay = localBoard.querySelector('.winner-overlay');
        if (overlay) {
            overlay.textContent = winner;
            overlay.classList.add(winner.toLowerCase());
            overlay.style.display = 'flex';
        }
        
        // Disable all cells in this board
        const cells = localBoard.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.add('occupied');
            cell.style.pointerEvents = 'none';
        });
        console.log(`[markBoardWon] Board ${boardIndex} marked as won by ${winner}, disabled ${cells.length} cells`);
    }
    
    updateStatus() {
        const playerIndicator = document.getElementById('player-indicator');
        const status = document.getElementById('status');
        
        if (!playerIndicator || !status) return;
        
        playerIndicator.textContent = this.currentPlayer;
        playerIndicator.style.color = this.currentPlayer === 'X' ? '#667eea' : '#764ba2';
        
        // Recalculate isMyTurn to ensure it's correct (defensive check)
        if (this.isOnline && this.myPlayer) {
            this.isMyTurn = (this.currentPlayer === this.myPlayer && !this.gameOver);
        }
        
        if (this.gameOver) {
            if (this.winner) {
                if (this.gameMode === '1player' && this.winner === this.computerPlayer) {
                    status.textContent = 'Computer wins!';
                } else if (this.gameMode === '1player' && this.winner === this.humanPlayer) {
                    status.textContent = 'You win!';
                } else if (this.isOnline) {
                    // Online mode: show personalized messages
                    if (this.winner === this.myPlayer) {
                        status.textContent = 'You win!';
                    } else {
                        status.textContent = 'You lost!';
                    }
                } else {
                    status.textContent = `Player ${this.winner} wins!`;
                }
            } else {
                status.textContent = "It's a draw!";
            }
        } else {
            if (this.isOnline) {
                // Show which player you are in online mode
                const playerInfo = `You are Player ${this.myPlayer}`;
                if (!this.isMyTurn) {
                    status.textContent = `${playerInfo} - Waiting for opponent...`;
                } else {
                    if (this.activeBoard === null || this.activeBoard === undefined || isNaN(this.activeBoard)) {
                        status.textContent = `${playerInfo} - Your turn - Play anywhere`;
                    } else {
                        const boardRow = Math.floor(this.activeBoard / 3);
                        const boardCol = this.activeBoard % 3;
                        status.textContent = `${playerInfo} - Your turn - Play in board (${boardRow + 1}, ${boardCol + 1})`;
                    }
                }
            } else if (this.gameMode === '1player' && this.currentPlayer === this.computerPlayer) {
                status.textContent = 'Computer is thinking...';
            } else if (this.gameMode === '1player') {
                if (this.activeBoard === null || this.activeBoard === undefined || isNaN(this.activeBoard)) {
                    status.textContent = 'Your turn - Play anywhere';
                } else {
                    const boardRow = Math.floor(this.activeBoard / 3);
                    const boardCol = this.activeBoard % 3;
                    status.textContent = `Your turn - Play in board (${boardRow + 1}, ${boardCol + 1})`;
                }
            } else {
                if (this.activeBoard === null || this.activeBoard === undefined || isNaN(this.activeBoard)) {
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
            
            // Don't highlight boards during computer's turn or opponent's turn in online
            if ((this.gameMode === '1player' && this.currentPlayer === this.computerPlayer) ||
                (this.isOnline && !this.isMyTurn)) {
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
    
    initializeTimer() {
        // Stop any existing timer
        this.stopTimer();
        
        if (this.timerType === 'none') {
            document.getElementById('timer-display').style.display = 'none';
            return;
        }
        
        // Show timer display
        document.getElementById('timer-display').style.display = 'block';
        
        // Set initial time and increment based on timer type
        if (this.timerType === 'rapid') {
            this.timerX = 5 * 60 * 1000; // 5 minutes in milliseconds
            this.timerO = 5 * 60 * 1000;
            this.timerIncrement = 5 * 1000; // 5 seconds
        } else if (this.timerType === 'blitz') {
            this.timerX = 3 * 60 * 1000; // 3 minutes in milliseconds
            this.timerO = 3 * 60 * 1000;
            this.timerIncrement = 2 * 1000; // 2 seconds
        } else if (this.timerType === 'bullet') {
            this.timerX = 2 * 60 * 1000; // 2 minutes in milliseconds
            this.timerO = 2 * 60 * 1000;
            this.timerIncrement = 1 * 1000; // 1 second
        }
        
        // Update display
        this.updateTimerDisplay();
        
        // Start timer for current player
        this.startTimer();
    }
    
    startTimer() {
        if (this.timerType === 'none' || this.gameOver) return;
        
        // Stop any existing timer first
        this.stopTimer();
        
        // Record start time
        this.timerStartTime = Date.now();
        
        // Start update interval
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 100); // Update every 100ms for smooth countdown
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Save elapsed time if timer was running
        if (this.timerStartTime && this.timerType !== 'none') {
            const elapsed = Date.now() - this.timerStartTime;
            if (this.currentPlayer === 'X') {
                this.timerX = Math.max(0, this.timerX - elapsed);
            } else {
                this.timerO = Math.max(0, this.timerO - elapsed);
            }
            this.timerStartTime = null;
        }
    }
    
    updateTimer() {
        if (this.timerType === 'none' || this.gameOver || !this.timerStartTime) return;
        
        const elapsed = Date.now() - this.timerStartTime;
        let remaining;
        
        if (this.currentPlayer === 'X') {
            remaining = Math.max(0, this.timerX - elapsed);
        } else {
            remaining = Math.max(0, this.timerO - elapsed);
        }
        
        // Check if time ran out
        if (remaining === 0) {
            // Update stored values before handling timeout
            if (this.currentPlayer === 'X') {
                this.timerX = 0;
            } else {
                this.timerO = 0;
            }
            this.handleTimeOut();
            return;
        }
        
        // Update display (don't modify stored values here - they're updated in stopTimer)
        this.updateTimerDisplay();
        
        // Sync to Firebase if online (throttled)
        if (this.isOnline) {
            this.syncTimerState();
        }
    }
    
    updateTimerDisplay() {
        if (this.timerType === 'none') return;
        
        const formatTime = (ms) => {
            const totalSeconds = Math.floor(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };
        
        // Get current time (accounting for elapsed time if timer is running)
        let timeX = this.timerX;
        let timeO = this.timerO;
        
        if (this.timerStartTime && !this.gameOver) {
            const elapsed = Date.now() - this.timerStartTime;
            if (this.currentPlayer === 'X') {
                timeX = Math.max(0, this.timerX - elapsed);
            } else {
                timeO = Math.max(0, this.timerO - elapsed);
            }
        }
        
        const timerXEl = document.getElementById('timer-x');
        const timerOEl = document.getElementById('timer-o');
        
        if (timerXEl) {
            timerXEl.textContent = formatTime(timeX);
            // Highlight active timer
            if (this.currentPlayer === 'X' && !this.gameOver) {
                timerXEl.style.color = '#ff4444'; // Red when active
            } else {
                timerXEl.style.color = '#667eea'; // Blue when inactive
            }
        }
        
        if (timerOEl) {
            timerOEl.textContent = formatTime(timeO);
            // Highlight active timer
            if (this.currentPlayer === 'O' && !this.gameOver) {
                timerOEl.style.color = '#ff4444'; // Red when active
            } else {
                timerOEl.style.color = '#764ba2'; // Purple when inactive
            }
        }
    }
    
    handleTimeOut() {
        if (this.gameOver) return;
        
        this.stopTimer();
        this.gameOver = true;
        
        // The player who ran out of time loses
        this.winner = this.currentPlayer === 'X' ? 'O' : 'X';
        
        // Sync to Firebase if online
        if (this.isOnline) {
            this.syncGameState();
        }
        
        // Show game over
        this.showGameOver(this.winner);
        this.updateStatus();
    }
    
    addTimerIncrement(player) {
        if (this.timerType === 'none' || this.gameOver) return;
        
        // Add increment to the player who just moved
        if (player === 'X') {
            this.timerX += this.timerIncrement;
        } else if (player === 'O') {
            this.timerO += this.timerIncrement;
        }
        
        this.updateTimerDisplay();
    }
    
    syncTimerState() {
        // Sync timer state to Firebase (throttled to avoid too many updates)
        if (!this.isOnline || !this.gameRef || this.timerType === 'none') return;
        
        // Only sync every second to avoid too many Firebase writes
        if (!this.lastTimerSync || Date.now() - this.lastTimerSync > 1000) {
            this.lastTimerSync = Date.now();
            // Sync timer state (async, don't wait)
            this.syncGameState().catch(error => {
                console.error('Error syncing timer state:', error);
            });
        }
    }
    
    showGameOver(winner) {
        // Stop timer when game ends
        this.stopTimer();
        
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
            } else if (this.isOnline) {
                // Online mode: show personalized messages
                if (winner === this.myPlayer) {
                    message.textContent = 'You Win!';
                } else {
                    message.textContent = 'You Lost!';
                }
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
    
    async reset() {
        // Clean up online game if active
        if (this.isOnline && this.gameRef) {
            // Mark player as disconnected
            await set(ref(window.firebaseDatabase, `games/${this.gameId}/${this.playerId}/connected`), false);
            // Remove game if both players disconnected (or after a delay)
            setTimeout(async () => {
                const snapshot = await get(this.gameRef);
                if (snapshot.exists()) {
                    const gameData = snapshot.val();
                    const p1Connected = gameData.player1?.connected || false;
                    const p2Connected = gameData.player2?.connected || false;
                    if (!p1Connected && !p2Connected) {
                        await remove(this.gameRef);
                    }
                }
            }, 5000);
        }
        
        // Reset online state
        this.isOnline = false;
        this.gameId = null;
        this.playerId = null;
        this.myPlayer = null;
        this.opponentPlayer = null;
        this.gameRef = null;
        this.isMyTurn = false;
        
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
        
        // Reset timer
        this.stopTimer();
        this.timerType = 'none';
        this.timerX = 0;
        this.timerO = 0;
        this.timerIncrement = 0;
        document.getElementById('timer-display').style.display = 'none';
        
        // Reset UI elements
        document.getElementById('game-id-display').style.display = 'none';
        document.getElementById('game-id-input').value = '';
        
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
document.addEventListener('DOMContentLoaded', async () => {
    const game = new UltimateTicTacToe();
    
    // Check for game ID in URL and auto-join if present
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('game');
    if (gameId) {
        // Wait a bit for UI to be ready
        setTimeout(() => {
            // Set online mode and join the game
            const gameModeRadio = document.querySelector('input[name="game-mode"][value="online"]');
            const joinRadio = document.querySelector('input[name="online-action"][value="join"]');
            if (gameModeRadio && joinRadio) {
                gameModeRadio.checked = true;
                joinRadio.checked = true;
                // Trigger the change event to show the join input
                gameModeRadio.dispatchEvent(new Event('change'));
                joinRadio.dispatchEvent(new Event('change'));
                
                // Set the game ID in the input
                const gameIdInput = document.getElementById('game-id-input');
                if (gameIdInput) {
                    gameIdInput.value = gameId;
                }
                
                // Auto-start the game
                game.startGame();
            }
        }, 200);
    }
});
