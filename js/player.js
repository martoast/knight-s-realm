// player.js - Rewritten for better animation handling
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
      
      // Animation system
      this.animationManager = new AnimationManager();
      
      // Combat cooldowns
      this.attackCooldown = 0;
      this.attackCooldownMax = 500; // milliseconds - slightly longer to match the 4-frame attack
      
      // Animation states
      this.jumpStarted = false;
      this.jumpApex = false;
      
      this.loadAnimations();
    }
  
    async loadAnimations() {
      try {
        // Load main sprite sheets (simplified to focus on the key animations)
        const idleSprite = await utils.loadSpritesheet('sprites/knight/Idle.png', 64, 64);
        const walkSprite = await utils.loadSpritesheet('sprites/knight/Walk.png', 64, 64);
        const runSprite = await utils.loadSpritesheet('sprites/knight/Run.png', 64, 64);
        const jumpSprite = await utils.loadSpritesheet('sprites/knight/Jump.png', 64, 64);
        
        // Only load Attack1 as requested for simplification
        const attackSprite = await utils.loadSpritesheet('sprites/knight/Attack1.png', 64, 64);
        
        // Create animations with proper frame counts from sprites
        this.animationManager.addAnimation('idle', new Animation(idleSprite, idleSprite.frameCount, 200));
        this.animationManager.addAnimation('walk', new Animation(walkSprite, walkSprite.frameCount, 100));
        this.animationManager.addAnimation('run', new Animation(runSprite, runSprite.frameCount, 80));
        
        // Jump animation (6 frames: preparation, rising, apex, falling, pre-landing, landing)
        this.animationManager.addAnimation('jump', new Animation(jumpSprite, jumpSprite.frameCount, 150, false));
        
        // Attack animation (4 frames, not looping) - just using Attack1 now
        // Slightly longer duration for attack frames to make them more visible
        this.animationManager.addAnimation('attack', new Animation(attackSprite, attackSprite.frameCount, 120, false));

        // Set initial animation
        this.animationManager.playAnimation('idle');
        
      } catch (error) {
        console.error('Error loading player animations:', error);
      }
    }
  
    update(deltaTime, keys, world) {
      // Update cooldowns
      if (this.attackCooldown > 0) {
        this.attackCooldown -= deltaTime;
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
      
      // Reset X velocity at start of each update
      this.velocityX = 0;
  
      // MOVEMENT HANDLING (only if not attacking)
      if (!this.isAttacking) {
        // Handle left/right movement
        if (keys.left) {
          this.velocityX = -this.speed;
          this.direction = -1;
          
          if (keys.shift) {
            this.velocityX = -this.speed * 1.5;
            if (this.isGrounded && !this.isJumping) {
              this.animationManager.playAnimation('run');
            }
          } else if (this.isGrounded && !this.isJumping) {
            this.animationManager.playAnimation('walk');
          }
        } 
        else if (keys.right) {
          this.velocityX = this.speed;
          this.direction = 1;
          
          if (keys.shift) {
            this.velocityX = this.speed * 1.5;
            if (this.isGrounded && !this.isJumping) {
              this.animationManager.playAnimation('run');
            }
          } else if (this.isGrounded && !this.isJumping) {
            this.animationManager.playAnimation('walk');
          }
        } 
        else if (this.isGrounded && !this.isJumping) {
          // If not moving and on ground, play idle
          this.animationManager.playAnimation('idle');
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
  
    draw(ctx, cameraX, cameraY) {
      // Calculate screen position with camera offset
      const screenX = this.x - cameraX;
      const screenY = this.y - cameraY;
      
      // Draw the player's current animation
      this.animationManager.draw(ctx, screenX, screenY, this.direction === -1);
      
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
        x: this.x + 16, // Adjust hitbox to be a bit smaller than sprite
        y: this.y + 16,
        width: this.width - 32,
        height: this.height - 16
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