// Game state
const gameState = {
    player: null,
    world: null,
    keys: {
        left: false,
        right: false,
        up: false,
        down: false,
        attack: false,
        shift: false
    },
    canvas: null,
    ctx: null,
    lastTime: 0,
    running: false,
    frameCount: 0,
    fps: 0,
    lastFpsUpdateTime: 0
};

// Debug options
window.DEBUG_SHOW_FRAMES = true;  // Set to true to see animation frame boundaries
const FPS_UPDATE_INTERVAL = 500;  // How often to update FPS counter (ms)

// Initialize game
async function initGame() {
    try {
        // Set up canvas
        gameState.canvas = document.getElementById('game-canvas');
        gameState.ctx = gameState.canvas.getContext('2d');
        
        // Set canvas size
        const resizeCanvas = () => {
            gameState.canvas.width = window.innerWidth;
            gameState.canvas.height = window.innerHeight;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Show loading message
        gameState.ctx.fillStyle = '#000';
        gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
        gameState.ctx.fillStyle = '#fff';
        gameState.ctx.font = '30px Arial';
        gameState.ctx.textAlign = 'center';
        gameState.ctx.fillText('Loading game...', gameState.canvas.width / 2, gameState.canvas.height / 2);
        gameState.ctx.textAlign = 'left';
        
        // Create world
        gameState.world = new World(5000, 1000);
        
        // Create player at center bottom of screen
        const playerStartX = Math.floor(gameState.canvas.width / 2) - 32;
        const playerStartY = Math.floor(gameState.world.getBounds().bottom) - 64;
        gameState.player = new Player(playerStartX, playerStartY); 
        
        // Initialize UI
        ui.init(gameState.player);
        
        // Set up input handlers
        setupInputHandlers();
        
        // Start game loop
        gameState.running = true;
        gameState.lastTime = performance.now();
        gameState.lastFpsUpdateTime = performance.now();
        requestAnimationFrame(gameLoop);
        
        // Show instructions
        const instructions = document.createElement('div');
        instructions.style.position = 'absolute';
        instructions.style.top = '10px';
        instructions.style.left = '10px';
        instructions.style.background = 'rgba(0,0,0,0.7)';
        instructions.style.color = 'white';
        instructions.style.padding = '15px';
        instructions.style.borderRadius = '8px';
        instructions.style.fontFamily = 'Arial, sans-serif';
        instructions.style.fontSize = '14px';
        instructions.style.zIndex = '1000';
        instructions.style.userSelect = 'none';
        instructions.innerHTML = `
            <strong>Knight's Animation Demo</strong><br><br>
            <b>A/D</b> or <b>Arrow Keys</b>: Move left/right<br>
            <b>W</b> or <b>Up Arrow</b>: Jump<br>
            <b>Shift</b>: Run<br>
            <b>Space</b>: Attack<br>
            <b>Ctrl+D</b>: Toggle debug view<br>
            <b>Ctrl+R</b>: Reset player
        `;
        document.body.appendChild(instructions);
    } catch (error) {
        console.error('Error initializing game:', error);
        
        // Show error message on screen
        gameState.ctx.fillStyle = '#000';
        gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
        gameState.ctx.fillStyle = '#f00';
        gameState.ctx.font = '20px Arial';
        gameState.ctx.textAlign = 'center';
        gameState.ctx.fillText('Error loading game:', gameState.canvas.width / 2, gameState.canvas.height / 2 - 20);
        gameState.ctx.fillText(error.message, gameState.canvas.width / 2, gameState.canvas.height / 2 + 10);
        gameState.ctx.textAlign = 'left';
    }
}

// Game loop
function gameLoop(timestamp) {
    // Calculate delta time (cap at 100ms to prevent huge jumps after tab switch)
    const deltaTime = Math.min(timestamp - gameState.lastTime, 100);
    gameState.lastTime = timestamp;
    
    // Track FPS
    gameState.frameCount++;
    if (timestamp - gameState.lastFpsUpdateTime >= FPS_UPDATE_INTERVAL) {
        gameState.fps = Math.round((gameState.frameCount * 1000) / (timestamp - gameState.lastFpsUpdateTime));
        gameState.frameCount = 0;
        gameState.lastFpsUpdateTime = timestamp;
    }
    
    // Clear canvas
    gameState.ctx.clearRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    
    // Update world
    gameState.world.update(deltaTime, gameState.player);
    
    // Update player
    gameState.player.update(deltaTime, gameState.keys, gameState.world);
    
    // Check attacks
    combat.checkAttacks(gameState.player, []);
    
    // Draw world
    gameState.world.draw(gameState.ctx);
    
    // Draw player
    gameState.player.draw(gameState.ctx, gameState.world.cameraX, gameState.world.cameraY);
    
    // Update UI with current animation state
    ui.updatePlayerStats(gameState.player);
    
    // Draw debug info if enabled
    if (window.DEBUG_SHOW_FRAMES) {
        gameState.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        gameState.ctx.fillRect(10, 10, 350, 210);
        gameState.ctx.fillStyle = 'white';
        gameState.ctx.font = '14px Arial';
        
        // Animation info
        const currentAnim = gameState.player.animationManager.currentAnimation;
        const currentAnimObj = gameState.player.animationManager.animations[currentAnim];
        
        gameState.ctx.fillText(`Animation: ${currentAnim || 'none'}`, 20, 30);
        
        if (currentAnimObj) {
            gameState.ctx.fillText(`Frame: ${currentAnimObj.frameIndex + 1}/${currentAnimObj.frameCount}`, 20, 50);
            gameState.ctx.fillText(`Sprite Width: ${Math.floor(currentAnimObj.spritesheet.frameWidth)}px`, 20, 70);
            gameState.ctx.fillText(`Time: ${Math.floor(currentAnimObj.timeSinceLastFrame)}/${currentAnimObj.frameDuration}ms`, 20, 90);
            gameState.ctx.fillText(`Loop: ${currentAnimObj.loop ? 'Yes' : 'No'} | Finished: ${currentAnimObj.finished}`, 20, 110);
        }
        
        // Player state
        gameState.ctx.fillText(`Position: (${Math.floor(gameState.player.x)}, ${Math.floor(gameState.player.y)})`, 20, 130);
        gameState.ctx.fillText(`Velocity: (${gameState.player.velocityX.toFixed(1)}, ${gameState.player.velocityY.toFixed(1)})`, 20, 150);
        gameState.ctx.fillText(`Jump: ${gameState.player.isJumping} | Ground: ${gameState.player.isGrounded}`, 20, 170);
        gameState.ctx.fillText(`Jump Started: ${gameState.player.jumpStarted} | Apex: ${gameState.player.jumpApex}`, 20, 190);
        gameState.ctx.fillText(`FPS: ${gameState.fps} | Locked: ${gameState.player.animationManager.locked}`, 20, 210);
    }
    
    // Continue loop
    if (gameState.running) {
        requestAnimationFrame(gameLoop);
    }
}

// Set up input handlers
function setupInputHandlers() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
        switch (e.key.toLowerCase()) {
            case 'a':
            case 'arrowleft':
                gameState.keys.left = true;
                break;
            case 'd':
            case 'arrowright':
                gameState.keys.right = true;
                break;
            case 'w':
            case 'arrowup':
                gameState.keys.up = true;
                break;
            case 's':
            case 'arrowdown':
                gameState.keys.down = true;
                break;
            case ' ':
                gameState.keys.attack = true;
                e.preventDefault(); // Prevent space from scrolling the page
                break;
            case 'shift':
                gameState.keys.shift = true;
                break;
            case 'd': // Debug toggle (only on keydown to avoid toggle issues)
                if (e.ctrlKey || e.metaKey) {
                    window.DEBUG_SHOW_FRAMES = !window.DEBUG_SHOW_FRAMES;
                    console.log(`Debug mode: ${window.DEBUG_SHOW_FRAMES ? 'ON' : 'OFF'}`);
                }
                break;
            case 'r': // Reset player position
                if (e.ctrlKey || e.metaKey) {
                    const bounds = gameState.world.getBounds();
                    gameState.player.x = Math.floor(gameState.canvas.width / 2) - 32;
                    gameState.player.y = bounds.bottom - gameState.player.height;
                    gameState.player.velocityY = 0;
                    gameState.player.isJumping = false;
                    gameState.player.isGrounded = true;
                    gameState.player.isAttacking = false;
                    gameState.player.animationManager.unlockAnimation();
                    gameState.player.animationManager.playAnimation('idle');
                }
                break;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        switch (e.key.toLowerCase()) {
            case 'a':
            case 'arrowleft':
                gameState.keys.left = false;
                break;
            case 'd':
            case 'arrowright':
                gameState.keys.right = false;
                break;
            case 'w':
            case 'arrowup':
                gameState.keys.up = false;
                break;
            case 's':
            case 'arrowdown':
                gameState.keys.down = false;
                break;
            case ' ':
                gameState.keys.attack = false;
                break;
            case 'shift':
                gameState.keys.shift = false;
                break;
        }
    });
}

// Initialize the game when DOM is loaded
window.addEventListener('DOMContentLoaded', initGame);