// Game state - made globally accessible via window
window.gameState = {
    player: null,
    world: null,
    enemies: [], // Add array to store enemies
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
    lastFpsUpdateTime: 0,
    enemySpawnTimer: 0, // Timer for enemy spawning
    enemySpawnInterval: 10000, // Spawn a new enemy every 10 seconds (increased frequency for testing)
    gameOver: false, // Track game over state
    deathTimerActive: false, // To manage delay between death and game over
    score: 0 // Player's score
};

// Debug options
window.DEBUG_SHOW_FRAMES = false;  // Set to false to hide animation frame boundaries
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
        
        // Create player at center bottom of screen, raised to show full sprite
        const playerStartX = Math.floor(gameState.canvas.width / 2) - 32;
        const playerStartY = Math.floor(gameState.world.getBounds().bottom) - 64; // Raised from 64 to 80 to show legs
        gameState.player = new Player(playerStartX, playerStartY); 
        
        // Initialize UI first
        ui.init(gameState.player);
        
        // Create initial enemies AFTER UI is fully initialized
        // This ensures ui.messageQueue is defined before ui.showMessage is called
        setTimeout(() => {
            // Spawn multiple enemies at different positions for testing
            spawnEnemy();
            
            // Add a slight delay between spawns to avoid UI message overlap
            setTimeout(() => {
                const bounds = gameState.world.getBounds();
                // Spawn an enemy to the left of player
                const leftX = Math.max(bounds.left + 100, gameState.player.x - 200);
                const enemy1 = new Enemy(leftX, bounds.bottom - 64, "Knight", 2);
                gameState.enemies.push(enemy1);
                ui.showMessage(`A level 2 Knight has appeared!`);
                
                // Spawn an enemy to the right of player
                const rightX = Math.min(bounds.right - 100, gameState.player.x + 200);
                const enemy2 = new Enemy(rightX, bounds.bottom - 64, "Knight", 3);
                gameState.enemies.push(enemy2);
                ui.showMessage(`A level 3 Knight has appeared!`);
            }, 500);
        }, 100);
        
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
            <b>Ctrl+R</b>: Reset player<br>
            <b>Ctrl+E</b>: Spawn enemy
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

// Function to spawn a new enemy
function spawnEnemy() {
    try {
        const bounds = gameState.world.getBounds();
        const x = utils.randomInt(bounds.left + 100, bounds.right - 100);
        const y = bounds.bottom - 64; // Raised to match player height
        const type = "Knight";
        const level = utils.randomInt(1, 3);
        
        const enemy = new Enemy(x, y, type, level);
        gameState.enemies.push(enemy);
        
        console.log(`Spawned enemy at (${x}, ${y})`);
        ui.showMessage(`A level ${level} ${type} has appeared!`);
    } catch (error) {
        console.error('Error spawning enemy:', error);
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
    
    // Update enemy spawn timer
    gameState.enemySpawnTimer += deltaTime;
    if (gameState.enemySpawnTimer >= gameState.enemySpawnInterval) {
        gameState.enemySpawnTimer = 0;
        if (gameState.enemies.length < 8) { // Increased maximum enemies for better testing
            spawnEnemy();
        }
    }
    
    // Update world
    gameState.world.update(deltaTime, gameState.player);
    
    // Update player
    gameState.player.update(deltaTime, gameState.keys, gameState.world);
    
    // Check if player has died
    if (!gameState.player.isAlive() && !gameState.gameOver && !gameState.deathTimerActive) {
        // Add a short delay before showing game over screen to allow death animation to play
        gameState.deathTimerActive = true;
        setTimeout(() => {
            showGameOver();
        }, 1500); // 1.5 second delay
    }
    
    // Update enemies
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        
        // Update enemy
        enemy.update(deltaTime, gameState.player, gameState.world);
        
        // Remove dead enemies
        if (!enemy.isAlive()) {
            // Give player XP if it was the player who killed it
            if (enemy.health <= 0) {
                const xp = enemy.getXP();
                // Update score when defeating enemies
                gameState.score += xp;
                ui.showMessage(`Gained ${xp} XP! Score: ${gameState.score}`);
            }
            
            // Only set up the removal timeout if it hasn't been set before for this enemy
            if (!enemy.removalTimerSet) {
                enemy.removalTimerSet = true;
                
                // Calculate a more precise delay based on animation frame count and duration
                // Dead animation: 6 frames × 300ms = 1800ms + 500ms buffer = 2300ms
                const animFrameCount = enemy.animationManager.animations["dead"] ? 
                    enemy.animationManager.animations["dead"].frameCount : 6;
                const animDuration = 300; // Matches what we set in enemy.js
                const animTotalTime = animFrameCount * animDuration;
                const removalDelay = animTotalTime + 500; // Add 500ms buffer
                
                // Set up removal after animation completes
                setTimeout(() => {
                    const index = gameState.enemies.indexOf(enemy);
                    if (index !== -1) {
                        gameState.enemies.splice(index, 1);
                        console.log("Enemy removed from game after death animation");
                    }
                }, removalDelay);
            }
        }
    }
    
    // Check attacks
    checkCombat();
    
    // Draw world
    gameState.world.draw(gameState.ctx);
    
    // Draw enemies
    for (const enemy of gameState.enemies) {
        enemy.draw(gameState.ctx, gameState.world.cameraX, gameState.world.cameraY);
    }
    
    // Draw player
    gameState.player.draw(gameState.ctx, gameState.world.cameraX, gameState.world.cameraY);
    
    // Update UI with current animation state
    ui.updatePlayerStats(gameState.player);
    
    // Display current score
    gameState.ctx.font = '24px Arial';
    gameState.ctx.fillStyle = 'white';
    gameState.ctx.textAlign = 'right';
    gameState.ctx.fillText(`SCORE: ${gameState.score}`, gameState.canvas.width - 20, 30);
    gameState.ctx.textAlign = 'left'; // Reset alignment
    
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
        gameState.ctx.fillText(`FPS: ${gameState.fps} | Enemies: ${gameState.enemies.length}`, 20, 210);
    }
    
    // Draw Game Over screen if needed
    if (gameState.gameOver) {
        drawGameOverScreen();
    }

    // Continue loop
    if (gameState.running) {
        requestAnimationFrame(gameLoop);
    }
}

// Enhanced combat checking function
function checkCombat() {
    // Skip combat if player is dead or game is over
    if (!gameState.player.isAlive() || gameState.gameOver) {
        return;
    }
    
    // Check player attacks against enemies
    if (gameState.player.isAttacking) {
        const attackHitbox = gameState.player.getAttackHitbox();
        
        // Get attack frame progress (attack is most effective in middle frames)
        let attackProgress = 0;
        const attackAnim = gameState.player.animationManager.animations['attack'];
        if (attackAnim) {
            attackProgress = attackAnim.frameIndex / attackAnim.frameCount;
        }
        
        // Attack is most effective in the middle of the animation (frames 1-3)
        if (attackProgress > 0.2 && attackProgress < 0.8) {
            for (const enemy of gameState.enemies) {
                if (!enemy.isAlive() || enemy.isTakingDamage) continue;
                
                const enemyHitbox = enemy.getHitbox();
                if (combat.checkCollision(attackHitbox, enemyHitbox)) {
                    // Calculate damage based on player stats (simplified for demo)
                    const damage = 10;
                    const actualDamage = enemy.takeDamage(damage);
                    
                    // Show damage message
                    if (actualDamage > 0) {
                        ui.showMessage(`Hit ${enemy.type} for ${actualDamage} damage!`);
                    }
                }
            }
        }
    }
    
    // Debug: Visualize attack hitbox
    if (window.DEBUG_SHOW_FRAMES && gameState.player.isAttacking) {
        const attackHitbox = gameState.player.getAttackHitbox();
        gameState.ctx.strokeStyle = 'red';
        gameState.ctx.lineWidth = 2;
        gameState.ctx.strokeRect(
            attackHitbox.x - gameState.world.cameraX,
            attackHitbox.y - gameState.world.cameraY,
            attackHitbox.width,
            attackHitbox.height
        );
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
            case 'e': // Spawn enemy on demand
                if (e.ctrlKey || e.metaKey) {
                    spawnEnemy();
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

// Game Over and Restart Handling
function showGameOver() {
    console.log("GAME OVER");
    gameState.gameOver = true;
    
    // Use the existing score (already accumulated during gameplay)
    console.log(`Final score: ${gameState.score}`);
    
    // Show game over message in UI
    ui.showMessage("GAME OVER! Click to restart");
    
    // Play a sound if we had one
    // if (gameState.sounds && gameState.sounds.gameOver) {
    //     gameState.sounds.gameOver.play();
    // }
}

function drawGameOverScreen() {
    // Draw semi-transparent overlay
    gameState.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    
    // Draw arcade-style game over text
    gameState.ctx.font = 'bold 72px Arial';
    gameState.ctx.fillStyle = '#ff0000';
    gameState.ctx.textAlign = 'center';
    gameState.ctx.fillText('GAME OVER', gameState.canvas.width / 2, gameState.canvas.height / 2 - 40);
    
    // Draw score
    gameState.ctx.font = '36px Arial';
    gameState.ctx.fillStyle = '#ffffff';
    gameState.ctx.fillText(`SCORE: ${gameState.score}`, gameState.canvas.width / 2, gameState.canvas.height / 2 + 20);
    
    // Draw instruction text
    gameState.ctx.font = '24px Arial';
    gameState.ctx.fillStyle = '#ffff00';
    gameState.ctx.fillText('CLICK TO CONTINUE', gameState.canvas.width / 2, gameState.canvas.height / 2 + 80);
    
    // Add retro arcade feel with "Insert Coin" text
    gameState.ctx.font = '18px Arial';
    gameState.ctx.fillStyle = '#ffff00';
    gameState.ctx.fillText('INSERT COIN', gameState.canvas.width / 2, gameState.canvas.height / 2 + 130);
    
    // Blinking effect for the "Insert Coin" text
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        gameState.ctx.fillStyle = '#ff0000';
        gameState.ctx.fillText('INSERT COIN', gameState.canvas.width / 2, gameState.canvas.height / 2 + 130);
    }
}

function restartGame() {
    // Only restart if game is over
    if (!gameState.gameOver) return;
    
    console.log("Restarting game...");
    
    // Reset game state
    gameState.gameOver = false;
    gameState.deathTimerActive = false;
    gameState.score = 0;
    gameState.enemies = [];
    gameState.enemySpawnTimer = 0;
    
    // Reset player
    const bounds = gameState.world.getBounds();
    const playerStartX = Math.floor(gameState.canvas.width / 2) - 32;
    const playerStartY = Math.floor(bounds.bottom) - 80;
    
    // Create new player - completely new instance to reset all animation states too
    console.log("Creating new player");
    gameState.player = new Player(playerStartX, playerStartY);
    
    // Restart enemy spawning
    setTimeout(() => {
        spawnEnemy();
    }, 2000);
    
    // Notify player
    ui.showMessage("New game started! Good luck!");
}

// Add click handler for restart
window.addEventListener('click', function(e) {
    if (gameState.gameOver) {
        restartGame();
    }
});

window.addEventListener('DOMContentLoaded', initGame);