/**
 * TETRIS UTILITY FUNCTIONS LIBRARY
 * Extracted and refactored from working Tetris test code
 * All functions tested and validated for mobile touch interfaces
 */

// =============================================================================
// CORE TETRIS PIECE DATA
// =============================================================================

const TETRIS_PIECES = [
    { shape: [[1,1,1,1]], color: '#0ff', name: 'I' },      // I-piece (cyan)
    { shape: [[1,1],[1,1]], color: '#ff0', name: 'O' },    // O-piece (yellow)
    { shape: [[0,1,0],[1,1,1]], color: '#f0f', name: 'T' }, // T-piece (magenta)
    { shape: [[0,1,1],[1,1,0]], color: '#0f0', name: 'S' }, // S-piece (green)
    { shape: [[1,1,0],[0,1,1]], color: '#f00', name: 'Z' }, // Z-piece (red)
    { shape: [[1,0,0],[1,1,1]], color: '#fa0', name: 'L' }, // L-piece (orange)
    { shape: [[0,0,1],[1,1,1]], color: '#00f', name: 'J' }  // J-piece (blue)
];

// =============================================================================
// TETRIS PIECE CLASS
// =============================================================================

function TetrisPiece(pieceData, boardWidth, startY = 0) {
    this.shape = pieceData.shape.map(row => [...row]); // Deep copy to avoid mutations
    this.color = pieceData.color;
    this.name = pieceData.name;
    this.x = Math.floor(boardWidth/2) - Math.floor(pieceData.shape[0].length/2);
    this.y = startY;
}

// =============================================================================
// MATRIX ROTATION UTILITIES
// =============================================================================

/**
 * Rotate a 2D matrix clockwise by 90 degrees
 * @param {Array} matrix - 2D array representing the piece shape
 * @returns {Array} - Rotated 2D array
 */
function rotateMatrixClockwise(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = [];

    for (let y = 0; y < cols; y++) {
        rotated[y] = [];
        for (let x = 0; x < rows; x++) {
            rotated[y][x] = matrix[rows - 1 - x][y];
        }
    }

    return rotated;
}

/**
 * Rotate a 2D matrix counter-clockwise by 90 degrees
 * @param {Array} matrix - 2D array representing the piece shape
 * @returns {Array} - Rotated 2D array
 */
function rotateMatrixCounterClockwise(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = [];

    for (let y = 0; y < cols; y++) {
        rotated[y] = [];
        for (let x = 0; x < rows; x++) {
            rotated[y][x] = matrix[x][cols - 1 - y];
        }
    }

    return rotated;
}

// =============================================================================
// PIECE MOVEMENT AND ROTATION METHODS
// =============================================================================

/**
 * Rotate piece towards tap direction (left/right of piece center)
 * @param {number} tapX - X coordinate of tap in grid units
 * @param {number} boardWidth - Width of the game board
 * @param {number} boardHeight - Height of the game board
 * @returns {boolean} - True if rotation was successful
 */
TetrisPiece.prototype.rotateTowards = function(tapX, boardWidth, boardHeight) {
    const pieceCenter = this.x + this.shape[0].length / 2;
    const clockwise = tapX > pieceCenter;

    const oldShape = this.shape;
    const newShape = clockwise ?
        rotateMatrixClockwise(oldShape) :
        rotateMatrixCounterClockwise(oldShape);

    // Check if rotation fits within bounds
    if (this.x + newShape[0].length <= boardWidth &&
        this.y + newShape.length <= boardHeight) {
        this.shape = newShape;
        return true;
    }

    return false;
};

/**
 * Move piece by delta x and y
 * @param {number} dx - Change in x position
 * @param {number} dy - Change in y position
 * @param {number} boardWidth - Width of the game board
 * @param {number} boardHeight - Height of the game board
 * @returns {boolean} - True if move was successful
 */
TetrisPiece.prototype.move = function(dx, dy, boardWidth, boardHeight) {
    const newX = this.x + dx;
    const newY = this.y + dy;

    if (newX >= 0 && newX + this.shape[0].length <= boardWidth &&
        newY >= 0 && newY + this.shape.length <= boardHeight) {
        this.x = newX;
        this.y = newY;
        return true;
    }

    return false;
};

/**
 * Set absolute X position with bounds checking
 * @param {number} newX - New x position
 * @param {number} boardWidth - Width of the game board
 * @returns {boolean} - True if position was set successfully
 */
TetrisPiece.prototype.setX = function(newX, boardWidth) {
    const constrainedX = Math.max(0, Math.min(boardWidth - this.shape[0].length, Math.round(newX)));
    if (constrainedX !== this.x) {
        this.x = constrainedX;
        return true;
    }
    return false;
};

// =============================================================================
// GHOST PIECE UTILITIES
// =============================================================================

/**
 * Calculate where piece would land if dropped straight down
 * @param {number} boardHeight - Height of the game board
 * @returns {number} - Y coordinate where piece would land
 */
TetrisPiece.prototype.getGhostY = function(boardHeight) {
    let testY = this.y;

    // Move down until we hit the bottom (no collision detection with other pieces)
    while (testY + this.shape.length < boardHeight) {
        testY++;
    }

    return testY;
};

/**
 * Teleport piece to ghost position
 * @param {number} boardHeight - Height of the game board
 */
TetrisPiece.prototype.teleportToGhost = function(boardHeight) {
    this.y = this.getGhostY(boardHeight);
};

// =============================================================================
// RENDERING UTILITIES
// =============================================================================

/**
 * Convert hex color to RGBA with alpha transparency
 * @param {string} hex - Hex color string (#rgb or #rrggbb)
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} - RGBA color string
 */
function hexToRgba(hex, alpha) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle 3-character hex codes
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Adjust color brightness for gradient effects
 * @param {string} color - Hex color string (#rgb or #rrggbb)
 * @param {number} amount - Brightness adjustment (-1 to 1)
 * @returns {string} - RGB color string
 */
function adjustColorBrightness(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount * 255));
    const g = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amount * 255));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount * 255));
    return `rgb(${r},${g},${b})`;
}

/**
 * Draw piece with gradient shading
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} blockSize - Size of each block in pixels
 */
TetrisPiece.prototype.draw = function(ctx, blockSize) {
    for (let y = 0; y < this.shape.length; y++) {
        for (let x = 0; x < this.shape[y].length; x++) {
            if (this.shape[y][x]) {
                const px = (this.x + x) * blockSize;
                const py = (this.y + y) * blockSize;

                // Create gradient for 3D effect
                const gradient = ctx.createLinearGradient(px, py, px + blockSize, py + blockSize);
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, hexToRgba(this.color, 0.7));

                ctx.fillStyle = gradient;
                ctx.fillRect(px, py, blockSize, blockSize);

                // Add border
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(px, py, blockSize, blockSize);
            }
        }
    }
};

/**
 * Draw ghost piece with gradient transparency
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} blockSize - Size of each block in pixels
 * @param {number} boardHeight - Height of the game board
 */
TetrisPiece.prototype.drawGhost = function(ctx, blockSize, boardHeight) {
    const ghostY = this.getGhostY(boardHeight);

    // Don't draw if ghost is at same position as piece
    if (ghostY <= this.y) return;

    ctx.save();

    for (let y = 0; y < this.shape.length; y++) {
        for (let x = 0; x < this.shape[y].length; x++) {
            if (this.shape[y][x]) {
                const px = (this.x + x) * blockSize;
                const py = (ghostY + y) * blockSize;

                // Create transparent gradient
                const gradient = ctx.createLinearGradient(px, py, px + blockSize, py + blockSize);
                gradient.addColorStop(0, hexToRgba(this.color, 0.25)); 
                gradient.addColorStop(0.5, hexToRgba(this.color, 0.12)); 
                gradient.addColorStop(1, hexToRgba(this.color, 0.06)); 

                // Fill ghost block
                ctx.fillStyle = gradient;
                ctx.fillRect(px + 2, py + 2, blockSize - 4, blockSize - 4);

                // Add dashed border
                ctx.strokeStyle = hexToRgba(this.color, 0.5); 
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(px + 2, py + 2, blockSize - 4, blockSize - 4);
            }
        }
    }

    ctx.restore();
};

// =============================================================================
// TOUCH CONTROL UTILITIES
// =============================================================================

/**
 * Handle horizontal drag movement with sensitivity multiplier
 * @param {number} startX - Touch start X coordinate
 * @param {number} currentX - Current touch X coordinate
 * @param {number} startPieceX - Piece X position when touch started
 * @param {DOMRect} canvasRect - Canvas bounding rectangle
 * @param {number} boardWidth - Width of the game board
 * @param {number} sensitivity - Sensitivity multiplier (default 1.5)
 * @returns {number} - New piece X position
 */
function calculateDragMovement(startX, currentX, startPieceX, canvasRect, boardWidth, sensitivity = 1.5) {
    const dx = currentX - startX;
    const pixelsPerGrid = canvasRect.width / boardWidth;
    const gridMovement = (dx / pixelsPerGrid) * sensitivity;
    return startPieceX + gridMovement;
}

/**
 * Check if a tap/click is within the ghost piece bounds
 * @param {number} clientX - Click X coordinate
 * @param {number} clientY - Click Y coordinate
 * @param {TetrisPiece} piece - The tetris piece
 * @param {DOMRect} canvasRect - Canvas bounding rectangle
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {number} boardWidth - Board width in grid units
 * @param {number} boardHeight - Board height in grid units
 * @param {number} blockSize - Size of each block
 * @returns {boolean} - True if tap is on ghost piece
 */
function isGhostTap(clientX, clientY, piece, canvasRect, canvasWidth, canvasHeight, boardWidth, boardHeight, blockSize) {
    const canvasX = (clientX - canvasRect.left) / canvasRect.width * canvasWidth;
    const canvasY = (clientY - canvasRect.top) / canvasRect.height * canvasHeight;

    const gridX = Math.floor(canvasX / blockSize);
    const gridY = Math.floor(canvasY / blockSize);

    const ghostY = piece.getGhostY(boardHeight);

    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                if (gridX === piece.x + x && gridY === ghostY + y) {
                    return true;
                }
            }
        }
    }

    return false;
}

/**
 * Convert client coordinates to board grid coordinates
 * @param {number} clientX - Client X coordinate
 * @param {number} clientY - Client Y coordinate
 * @param {DOMRect} canvasRect - Canvas bounding rectangle
 * @param {number} boardWidth - Board width in grid units
 * @param {number} boardHeight - Board height in grid units
 * @returns {Object} - {x, y} grid coordinates
 */
function clientToGrid(clientX, clientY, canvasRect, boardWidth, boardHeight) {
    const relativeX = (clientX - canvasRect.left) / canvasRect.width;
    const relativeY = (clientY - canvasRect.top) / canvasRect.height;

    return {
        x: relativeX * boardWidth,
        y: relativeY * boardHeight
    };
}

// =============================================================================
// GAME LOOP UTILITIES
// =============================================================================

/**
 * Create a drop timer that automatically moves pieces down
 * @param {function} onDrop - Callback when piece should drop
 * @param {function} onBottom - Callback when piece hits bottom
 * @param {number} dropInterval - Time between drops in milliseconds
 * @returns {Object} - Timer object with start/stop/pause methods
 */
function createDropTimer(onDrop, onBottom, dropInterval = 1000) {
    let timer = 0;
    let lastTime = 0;
    let running = false;

    function update(currentTime) {
        if (!running) return;

        if (lastTime === 0) lastTime = currentTime;
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        timer += deltaTime;

        if (timer >= dropInterval) {
            const canDrop = onDrop();
            if (!canDrop) {
                onBottom();
            }
            timer = 0;
        }
    }

    return {
        update,
        start: () => { running = true; timer = 0; },
        stop: () => { running = false; },
        pause: () => { running = !running; },
        isRunning: () => running
    };
}

/**
 * Utility function to create a random piece
 * @param {number} boardWidth - Width of the game board
 * @param {number} startY - Starting Y position (default 0)
 * @returns {TetrisPiece} - New random tetris piece
 */
function createRandomPiece(boardWidth, startY = 0) {
    const pieceData = TETRIS_PIECES[Math.floor(Math.random() * TETRIS_PIECES.length)];
    return new TetrisPiece(pieceData, boardWidth, startY);
}

// =============================================================================
// GRID RENDERING UTILITIES
// =============================================================================

/**
 * Draw game grid background
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {number} boardWidth - Board width in grid units
 * @param {number} boardHeight - Board height in grid units
 * @param {number} blockSize - Size of each grid cell
 * @param {string} gridColor - Color of grid lines (default '#333')
 */
function drawGrid(ctx, canvasWidth, canvasHeight, boardWidth, boardHeight, blockSize, gridColor = '#333') {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= boardWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * blockSize, 0);
        ctx.lineTo(x * blockSize, canvasHeight);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= boardHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * blockSize);
        ctx.lineTo(canvasWidth, y * blockSize);
        ctx.stroke();
    }
}

/**
 * Clear canvas with gradient background
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {string} color1 - Top gradient color (default '#111')
 * @param {string} color2 - Bottom gradient color (default '#000')
 */
function clearCanvasWithGradient(ctx, canvasWidth, canvasHeight, color1 = '#111', color2 = '#000') {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

// =============================================================================
// EXPORT FOR MODULE USE
// =============================================================================

// For ES6 modules
export {
    TETRIS_PIECES,
    TetrisPiece,
    rotateMatrixClockwise,
    rotateMatrixCounterClockwise,
    adjustColorBrightness,
    calculateDragMovement,
    isGhostTap,
    clientToGrid,
    createDropTimer,
    createRandomPiece,
    drawGrid,
    clearCanvasWithGradient,
    hexToRgba
};

// For CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TETRIS_PIECES,
        TetrisPiece,
        rotateMatrixClockwise,
        rotateMatrixCounterClockwise,
        adjustColorBrightness,
        calculateDragMovement,
        isGhostTap,
        clientToGrid,
        createDropTimer,
        createRandomPiece,
        drawGrid,
        clearCanvasWithGradient,
        hexToRgba
    };
}