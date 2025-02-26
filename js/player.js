class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 64;
    this.height = 64;
    this.speed = 4;
    this.jumpForce = 12;
    this.gravity = 0.6;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isJumping = false;
    this.isGrounded = false;
    this.isAttacking = false;
    this.direction = 1; // 1 for right, -1 for left
    
    // Stats
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.defense = 5;
    
    // Animation system
    this.animationManager = new AnimationManager();
    
    // Combat cooldowns
    this.attackCooldown = 0;
    this.attackCooldownMax = 500; // milliseconds - slightly longer to match the 4-frame attack
    this.isTakingDamage = false;
    this.invulnerableTime = 0;
    this.invulnerableDuration = 1000; // 1 second of invulnerability after taking damage
    
    // Animation states
    this.jumpStarted = false;
    this.jumpApex = false;
    
    // Movement state tracking
    this.wasMoving = false; // Track if player was moving in previous frame
    this.moveDirection = 0; // Track movement direction (-1 left, 0 none, 1 right)
    this.movementTransitionTime = 0; // Smooth transition between idle and walking
    
    // Flag to track animation loading
    this.animationsLoaded = false;
    
    // Load animations
    this.loadAnimations();
  }

  async loadAnimations() {
    try {
      console.log("Loading player animations...");
      
      // Load main sprite sheets (simplified to focus on the key animations)
      const idleSprite = await utils.loadSpritesheet('sprites/knight/Idle.png', 64, 64);
      const walkSprite = await utils.loadSpritesheet('sprites/knight/Walk.png', 64, 64);
      const runSprite = await utils.loadSpritesheet('sprites/knight/Run.png', 64, 64);
      const jumpSprite = await utils.loadSpritesheet('sprites/knight/Jump.png', 64, 64);
      
      // Only load Attack1 as requested for simplification
      const attackSprite = await utils.loadSpritesheet('sprites/knight/Attack1.png', 64, 64);
      
      // Add hurt animation for taking damage
      const hurtSprite = await utils.loadSpritesheet('sprites/knight/Hurt.png', 64, 64);
      
      // Add death animation
      const deadSprite = await utils.loadSpritesheet('sprites/knight/Dead.png', 64, 64);
      
      console.log("All player spritesheets loaded, adding animations...");
      
      // Create animations with proper frame counts from sprites
      // For Idle animation, we'll use only the first frame since all frames are identical
      // This prevents the sideways movement glitch
      this.animationManager.addAnimation('idle', new Animation(idleSprite, 1, 200));
      
      // For Walk animation, we'll use a faster frame rate like the run animation
      // This ensures the full walking cycle is visible
      this.animationManager.addAnimation('walk', new Animation(walkSprite, walkSprite.frameCount, 100));
      
      // Run animation with appropriate speed
      this.animationManager.addAnimation('run', new Animation(runSprite, runSprite.frameCount, 80));
      
      // Jump animation (6 frames: preparation, rising, apex, falling, pre-landing, landing)
      this.animationManager.addAnimation('jump', new Animation(jumpSprite, jumpSprite.frameCount, 150, false));
      
      // Attack animation (5 frames, not looping)
      this.animationManager.addAnimation('attack', new Animation(attackSprite, attackSprite.frameCount, 120, false));
      
      // Hurt animation (2 frames, not looping)
      this.animationManager.addAnimation('hurt', new Animation(hurtSprite, hurtSprite.frameCount, 200, false));
      
      // Death animation (6 frames, not looping, slower for more dramatic effect)
      this.animationManager.addAnimation('dead', new Animation(deadSprite, deadSprite.frameCount, 300, false));

      // Set initial animation
      this.animationManager.playAnimation('idle');
      
      // Mark animations as loaded
      this.animationsLoaded = true;
      console.log("Player animations successfully loaded and initialized");
      
    } catch (error) {
      console.error('Error loading player animations:', error);
    }
  }

  update(deltaTime, keys, world) {
    // Skip updating if animations aren't loaded yet
    if (!this.animationsLoaded) {
      return;
    }
    
    // If player is dead or game is over, only update animation but don't allow controls
    if (!this.isAlive() || (window.gameState && window.gameState.gameOver)) {
      // If dead and not already playing death animation, start it
      if (this.animationManager.animations['dead'] && 
          this.animationManager.currentAnimation !== 'dead') {
        this.animationManager.playAnimation('dead');
        // Lock the animation to prevent it from being interrupted
        this.animationManager.lockAnimation();
      }
      
      // Only update animation if it's not finished yet
      if (!this.animationManager.isFinished()) {
        this.animationManager.update(deltaTime);
      } else if (this.animationManager.currentAnimation === 'dead') {
        // If death animation finished, ensure we stay on last frame
        const deadAnim = this.animationManager.animations['dead'];
        if (deadAnim) {
          deadAnim.frameIndex = deadAnim.frameCount - 1;
        }
      }
      
      // Apply gravity only to keep character from floating
      this.velocityY += this.gravity;
      this.y += this.velocityY;
      
      // Check ground collision
      const bounds = world.getBounds();
      if (this.y + this.height >= bounds.bottom) {
        this.y = bounds.bottom - this.height;
        this.velocityY = 0;
      }
      
      return; // Skip all other controls and physics
    }
    
    // Update cooldowns
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }
    
    // Update invulnerability timer
    if (this.invulnerableTime > 0) {
      this.invulnerableTime -= deltaTime;
    }
    
    // Reset X velocity at start of each update
    this.velocityX = 0;
    
    // Check if taking damage animation is finished
    if (this.isTakingDamage && this.animationManager.isFinished()) {
      this.isTakingDamage = false;
    }
    
    // Skip normal controls while taking damage
    if (this.isTakingDamage) {
      this.animationManager.update(deltaTime);
      this.velocityY += this.gravity; // Still apply gravity
      this.y += this.velocityY;
      
      // Check ground collision while taking damage
      const bounds = world.getBounds();
      if (this.y + this.height >= bounds.bottom) {
        this.y = bounds.bottom - this.height;
        this.isGrounded = true;
        this.velocityY = 0;
      }
      
      return;
    }

    // ATTACK HANDLING - simplified to just use Attack1
    // Check for attack initiation
    if (keys.attack && !this.isAttacking && this.attackCooldown <= 0 && this.isGrounded) {
      this.isAttacking = true;
      this.attackCooldown = this.attackCooldownMax;
      this.velocityX = 0; // Stop movement during attack
      
      // Play the attack animation (just using Attack1 now)
      this.animationManager.playAnimation('attack');
      
      // Lock animation until attack finishes
      this.animationManager.lockAnimation();
    }

    // MOVEMENT HANDLING (only if not attacking)
    if (!this.isAttacking) {
      // Store previous movement state before updating
      const wasMoving = Math.abs(this.velocityX) > 0;
      const prevDirection = this.moveDirection;
      
      // Handle left/right movement with improved state tracking
      if (keys.left) {
        this.velocityX = -this.speed;
        this.direction = -1;
        this.moveDirection = -1;
        
        if (keys.shift) {
          this.velocityX = -this.speed * 1.5;
          if (this.isGrounded && !this.isJumping) {
            // Simply play run animation
            this.animationManager.playAnimation('run');
          }
        } else if (this.isGrounded && !this.isJumping) {
          // Simply play walk animation - same approach as with run animation
          this.animationManager.playAnimation('walk');
        }
        
        // Track that we're now moving
        this.wasMoving = true;
      } 
      else if (keys.right) {
        this.velocityX = this.speed;
        this.direction = 1;
        this.moveDirection = 1;
        
        if (keys.shift) {
          this.velocityX = this.speed * 1.5;
          if (this.isGrounded && !this.isJumping) {
            // Simply play run animation
            this.animationManager.playAnimation('run');
          }
        } else if (this.isGrounded && !this.isJumping) {
          // Simply play walk animation - same approach as with run animation
          this.animationManager.playAnimation('walk');
        }
        
        // Track that we're now moving
        this.wasMoving = true;
      } 
      else {
        // Not moving
        this.moveDirection = 0;
        
        // Simply play idle animation when not moving, grounded, and not jumping
        if (this.isGrounded && !this.isJumping) {
          this.animationManager.playAnimation('idle');
        }
        
        this.wasMoving = false;
      }

      // JUMP HANDLING
      if (keys.up && this.isGrounded && !this.isJumping) {
        this.velocityY = -this.jumpForce;
        this.isJumping = true;
        this.isGrounded = false;
        this.jumpStarted = true;
        this.jumpApex = false;
        
        // Start with jump animation and lock it to prevent interruption
        this.animationManager.playAnimation('jump');
        // Don't completely lock the animation as we need to control it manually
        // But we could add a partial lock here if needed
      }
    }

    // JUMP ANIMATION CONTROL - properly handling all 6 frames
    if (this.isJumping && this.animationManager.currentAnimation === 'jump') {
      const jumpAnim = this.animationManager.animations['jump'];
      
      if (jumpAnim) {
        // Control jump animation frames based on vertical velocity and jump phase
        // Frame 0: Initial crouch/preparation
        // Frames 1-2: Rising
        // Frame 3: Apex/peak of jump
        // Frames 4-5: Falling/landing
        
        if (this.jumpStarted && !this.jumpApex) {
          // Calculate which frame to show based on upward velocity
          if (this.velocityY < -8) {
            jumpAnim.frameIndex = 0; // Initial crouch/preparation
          } else if (this.velocityY < -4) {
            jumpAnim.frameIndex = 1; // Early rise
          } else if (this.velocityY < 0) {
            jumpAnim.frameIndex = 2; // Late rise
          } else {
            // Reached apex of jump
            jumpAnim.frameIndex = 3; 
            this.jumpApex = true;
          }
        } else if (this.jumpApex) {
          // Calculate which frame to show based on downward velocity
          if (this.velocityY < 4) {
            jumpAnim.frameIndex = 3; // Still near apex
          } else if (this.velocityY < 8) {
            jumpAnim.frameIndex = 4; // Early falling
          } else {
            jumpAnim.frameIndex = 5; // Fast falling/pre-landing
          }
        }
        
        // Lock frame in place until next update
        jumpAnim.timeSinceLastFrame = 0;
      }
    }

    // Store original position before movement
    const originalX = this.x;
    
    // Apply physics
    this.velocityY += this.gravity; // Apply gravity
    this.x += this.velocityX;       // Apply X movement
    this.y += this.velocityY;       // Apply Y movement

    // COLLISION HANDLING
    const bounds = world.getBounds();

    // Check horizontal boundaries
    if (this.x < bounds.left) {
      this.x = bounds.left;
    }
    if (this.x + this.width > bounds.right) {
      this.x = bounds.right - this.width;
    }
    
    // Check for collision with any enemies - prevent overlap
    const playerHitbox = this.getHitbox();
    let collisionDetected = false;
    
    // gameState.enemies is accessed through the global variable
    if (window.gameState && window.gameState.enemies) {
      for (const enemy of window.gameState.enemies) {
        if (!enemy.isAlive()) continue;
        
        const enemyHitbox = enemy.getHitbox();
        if (combat.checkCollision(playerHitbox, enemyHitbox)) {
          // Collision detected - restore original position
          collisionDetected = true;
          break;
        }
      }
      
      // If collision was detected, revert to original position
      if (collisionDetected) {
        this.x = originalX;
        this.velocityX = 0;
      }
    }

    // Check ground collision
    if (this.y + this.height >= bounds.bottom) {
      this.y = bounds.bottom - this.height;
      
      // Landing logic
      if (this.isJumping) {
        // Explicitly unlock animation for smooth landing transition
        if (this.animationManager.locked && this.animationManager.currentAnimation === 'jump') {
          this.animationManager.unlockAnimation();
        }
        
        this.isJumping = false;
        
        // Choose appropriate landing animation if not attacking
        if (!this.isAttacking) {
          if (Math.abs(this.velocityX) > 0) {
            if (Math.abs(this.velocityX) > this.speed) {
              this.animationManager.playAnimation('run');
            } else {
              this.animationManager.playAnimation('walk');
            }
          } else {
            this.animationManager.playAnimation('idle');
          }
        }
      }
      
      // Reset jump state
      this.isGrounded = true;
      this.velocityY = 0;
      this.jumpStarted = false;
      this.jumpApex = false;
    }

    // Update animation manager
    this.animationManager.update(deltaTime);

    // Check if attack animation is finished
    if (this.isAttacking && this.animationManager.isFinished()) {
      // Reset attack state
      this.isAttacking = false;
      this.animationManager.unlockAnimation();
      
      // Return to appropriate animation based on current state
      if (this.isJumping) {
        // If somehow we attacked during a jump (shouldn't happen now), return to jump animation
        this.animationManager.playAnimation('jump');
      } else if (Math.abs(this.velocityX) > 0) {
        // If moving, play walk or run based on speed
        if (Math.abs(this.velocityX) > this.speed) {
          this.animationManager.playAnimation('run');
        } else {
          this.animationManager.playAnimation('walk');
        }
      } else if (this.isGrounded) {
        // Standing still on ground, return to idle
        this.animationManager.playAnimation('idle');
      }
    }
  }

  takeDamage(damage) {
    // Ignore damage if currently invulnerable
    if (this.invulnerableTime > 0) return 0;
    
    // Calculate actual damage after defense
    const actualDamage = Math.max(1, damage - this.defense);
    this.health -= actualDamage;
    
    // Cap health at 0
    if (this.health < 0) this.health = 0;
    
    // Set invulnerability time
    this.invulnerableTime = this.invulnerableDuration;
    
    // Check if player has died from this damage
    if (this.health <= 0) {
      // Player has died - play death effects
      this.isTakingDamage = false; // Override taking damage status
      
      // Show death animation if available, otherwise use hurt
      if (this.animationManager.animations['dead']) {
        this.animationManager.playAnimation('dead');
      } else {
        this.animationManager.playAnimation('hurt');
      }
      this.animationManager.lockAnimation();
      
      // Apply death physics - stronger knockback for dramatic effect
      this.velocityY = -8; // Bigger vertical bump for death
      this.velocityX = this.direction * -5; // Stronger push back
      
      console.log("Player has died!");
      
      // The actual game over screen will be triggered in the main game loop
    } else {
      // Regular damage, not dead yet
      this.isTakingDamage = true;
      this.animationManager.playAnimation('hurt');
      this.animationManager.lockAnimation();
      
      // Apply a small knockback in opposite direction of facing
      this.velocityY = -4; // Small vertical bump
      this.velocityX = this.direction * -3; // Push back
    }
    
    return actualDamage;
  }
  
  isAlive() {
    return this.health > 0;
  }

  draw(ctx, cameraX, cameraY) {
    // Calculate screen position with camera offset
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;
    
    // If animations haven't loaded yet, draw a placeholder and return
    if (!this.animationsLoaded) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.fillRect(screenX, screenY, this.width, this.height);
      ctx.fillStyle = 'black';
      ctx.font = '10px Arial';
      ctx.fillText('Loading...', screenX + 10, screenY + 30);
      return;
    }
    
    // Apply flashing effect when invulnerable
    if (this.invulnerableTime > 0 && Math.floor(this.invulnerableTime / 100) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }
    
    // Draw the player's current animation
    this.animationManager.draw(ctx, screenX, screenY, this.direction === -1);
    
    // Draw health bar
    const healthPercentage = this.health / this.maxHealth;
    const barWidth = this.width;
    const barHeight = 5;
    
    ctx.fillStyle = "#333";
    ctx.fillRect(screenX, screenY - 10, barWidth, barHeight);
    
    ctx.fillStyle = "#0f0"; // Green for player health
    ctx.fillRect(screenX, screenY - 10, barWidth * healthPercentage, barHeight);
    
    // Reset transparency
    ctx.globalAlpha = 1.0;
    
    // Draw hitbox for debugging
    if (window.DEBUG_SHOW_FRAMES) {
      const hitbox = this.getHitbox();
      ctx.strokeStyle = 'lime';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        hitbox.x - cameraX,
        hitbox.y - cameraY,
        hitbox.width,
        hitbox.height
      );
    }
  }

  getHitbox() {
    return {
      x: this.x + 20, // Adjust hitbox to be a bit smaller than sprite
      y: this.y + 20,
      width: this.width - 40, // Make hitbox slightly smaller for better collision feel
      height: this.height - 24
    };
  }

  getAttackHitbox() {
    const hitbox = this.getHitbox();
    // Extend hitbox in direction player is facing
    if (this.direction === 1) {
      hitbox.width += 30;
    } else {
      hitbox.x -= 30;
      hitbox.width += 30;
    }
    return hitbox;
  }
}