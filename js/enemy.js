class Enemy {
  constructor(x, y, type, level) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.level = level || 1;
    this.width = 64;  // Match sprite size with player
    this.height = 64; // Match sprite size with player
    this.speed = 1 + level * 0.2;
    this.direction = Math.random() < 0.5 ? -1 : 1;
    this.movementTimer = 0;
    this.movementDuration = utils.randomInt(1000, 3000);
    this.idleTimer = 0;
    this.idleDuration = utils.randomInt(500, 1500);
    this.isIdle = false;
    this.isAttacking = false;
    this.isTakingDamage = false;

    // Stats
    this.maxHealth = 30 + level * 20;
    this.health = this.maxHealth;
    this.damage = 5 + level * 3;
    this.defense = 2 + level;
    this.experienceValue = 20 + level * 10;

    // Attack cooldown
    this.attackCooldown = 0;
    this.attackCooldownMax = 1000;

    // Animation
    this.animationManager = new AnimationManager();
    this.animationsLoaded = false; // Flag to track animation loading
    this.loadAnimations();

    // AI
    this.detectionRange = 200;
    this.attackRange = 50;
    
    // Cleanup tracking
    this.removalTimerSet = false; // Flag to ensure we only set removal timer once
    
    this.y = Math.floor(this.y);
  }

  async loadAnimations() {
    try {
      console.log("Loading enemy animations...");
      
      // Load animation spritesheets - notice the space in the filenames to match your actual files
      const idleSprite = await utils.loadSpritesheet(
        "sprites/knight/Idle.png",
        64,
        64
      );
      const walkSprite = await utils.loadSpritesheet(
        "sprites/knight/Walk.png",
        64,
        64
      );
      const runSprite = await utils.loadSpritesheet(
        "sprites/knight/Run.png",
        64,
        64
      );
      const jumpSprite = await utils.loadSpritesheet(
        "sprites/knight/Jump.png",
        64,
        64
      );
      const attack1Sprite = await utils.loadSpritesheet(
        "sprites/knight/Attack1.png",
        64,
        64
      ); // Notice the space here
      const runAttackSprite = await utils.loadSpritesheet(
        "sprites/knight/RunAttack.png",
        64,
        64
      );
      const hurtSprite = await utils.loadSpritesheet(
        "sprites/knight/Hurt.png",
        64,
        64
      );
      const deadSprite = await utils.loadSpritesheet(
        "sprites/knight/Dead.png",
        64,
        64
      );
      const defendSprite = await utils.loadSpritesheet(
        "sprites/knight/Defend.png",
        64,
        64
      );
      const protectSprite = await utils.loadSpritesheet(
        "sprites/knight/Protect.png",
        64,
        64
      );

      console.log("All enemy spritesheets loaded, adding animations...");
      
      // Create animations with appropriate frame counts based on the sprites
      // For Idle animation, we'll use only the first frame to prevent sideways movement
      this.animationManager.addAnimation(
        "idle",
        new Animation(idleSprite, 1, 200)
      );
      this.animationManager.addAnimation(
        "walk",
        new Animation(walkSprite, walkSprite.frameCount, 100)
      );
      this.animationManager.addAnimation(
        "run",
        new Animation(runSprite, runSprite.frameCount, 80)
      );
      this.animationManager.addAnimation(
        "jump",
        new Animation(jumpSprite, jumpSprite.frameCount, 200, false)
      );
      this.animationManager.addAnimation(
        "attack1",
        new Animation(attack1Sprite, attack1Sprite.frameCount, 100, false)
      );
      this.animationManager.addAnimation(
        "runAttack",
        new Animation(runAttackSprite, runAttackSprite.frameCount, 100, false)
      );
      this.animationManager.addAnimation(
        "hurt",
        new Animation(hurtSprite, hurtSprite.frameCount, 200, false)
      );
      this.animationManager.addAnimation(
        "dead",
        new Animation(deadSprite, deadSprite.frameCount, 300, false) // Slower death animation for more impact
      );
      this.animationManager.addAnimation(
        "defend",
        new Animation(defendSprite, defendSprite.frameCount, 200)
      );
      this.animationManager.addAnimation(
        "protect",
        new Animation(protectSprite, protectSprite.frameCount, 200)
      );

      // Set initial animation
      this.animationManager.playAnimation("idle");
      
      // Mark animations as loaded
      this.animationsLoaded = true;
      console.log(`Enemy (${this.type} Lvl ${this.level}) animations successfully loaded`);
      
    } catch (error) {
      console.error("Error loading enemy animations:", error);
    }
  }

  update(deltaTime, player, world) {
    // Skip updating if animations aren't loaded yet
    if (!this.animationsLoaded) {
      return;
    }
    
    if (!this.isAlive()) {
      // Start death animation only if not already playing it
      if (this.animationManager.currentAnimation !== "dead") {
        this.animationManager.playAnimation("dead");
        this.animationManager.lockAnimation(); // Lock to prevent interruption
      }
      
      // Only update animation if it's not finished
      if (!this.animationManager.isFinished()) {
        this.animationManager.update(deltaTime);
      } else if (this.animationManager.currentAnimation === "dead") {
        // If death animation is finished, ensure we stay on the last frame
        const deadAnim = this.animationManager.animations["dead"];
        if (deadAnim) {
          deadAnim.frameIndex = deadAnim.frameCount - 1;
        }
      }
      return;
    }

    // Update cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    // Check animation states
    if (this.isAttacking && this.animationManager.isFinished()) {
      this.isAttacking = false;
    }

    if (this.isTakingDamage && this.animationManager.isFinished()) {
      this.isTakingDamage = false;
    }

    // Skip AI if taking damage
    if (this.isTakingDamage) {
      this.animationManager.update(deltaTime);
      return;
    }

    // Save original position for collision restoration
    const originalX = this.x;
    
    // Check if player is dead or game is over - enemies should stop attacking and just idle
    if (!player.isAlive() || (window.gameState && window.gameState.gameOver)) {
      this.animationManager.playAnimation("idle");
      this.animationManager.update(deltaTime);
      return;
    }
    
    // AI logic
    const distanceToPlayer = utils.distance(this.x, this.y, player.x, player.y);

    // If player is in detection range
    if (distanceToPlayer <= this.detectionRange) {
      // Move towards player
      const playerDirection = player.x < this.x ? -1 : 1;
      this.direction = playerDirection;

      // If in attack range and cooldown is done, attack
      if (distanceToPlayer <= this.attackRange && this.attackCooldown <= 0) {
        this.attack(player);
      } else if (!this.isAttacking) {
        // Move towards player but don't get too close (maintain minimum distance)
        if (distanceToPlayer > this.attackRange) {
          this.x += this.speed * this.direction;
          this.animationManager.playAnimation("walk");
        } else {
          // We're at attack range - stop here and don't overlap
          this.animationManager.playAnimation("idle");
        }
      }
    }
    // Random movement when player is not in range
    else {
      if (this.isIdle) {
        this.idleTimer += deltaTime;
        this.animationManager.playAnimation("idle");

        if (this.idleTimer >= this.idleDuration) {
          this.isIdle = false;
          this.movementTimer = 0;
          this.direction = Math.random() < 0.5 ? -1 : 1;
        }
      } else {
        this.movementTimer += deltaTime;
        this.x += this.speed * 0.5 * this.direction;
        this.animationManager.playAnimation("walk");

        if (this.movementTimer >= this.movementDuration) {
          this.isIdle = true;
          this.idleTimer = 0;
          this.idleDuration = utils.randomInt(500, 1500);
        }
      }

      // Check world boundaries
      const bounds = world.getBounds();
      if (this.x < bounds.left || this.x + this.width > bounds.right) {
        this.direction *= -1;
      }
    }
    
    // Check for collision with player's hitbox and prevent overlap
    if (player.isAlive()) {
      const enemyHitbox = this.getHitbox();
      const playerHitbox = player.getHitbox();
      
      if (combat.checkCollision(enemyHitbox, playerHitbox)) {
        // Collision detected - restore original position to prevent overlap
        this.x = originalX;
        
        // If we're close enough to attack but not attacking yet, start an attack
        if (this.attackCooldown <= 0 && !this.isAttacking) {
          this.attack(player);
        }
      }
    }

    // Update animation
    this.animationManager.update(deltaTime);
  }

  draw(ctx, cameraX, cameraY) {
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    // If animations haven't loaded yet, draw a placeholder and return
    if (!this.animationsLoaded) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(screenX, screenY, this.width, this.height);
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.fillText('Loading...', screenX + 10, screenY + 30);
      return;
    }

    // Draw enemy
    this.animationManager.draw(ctx, screenX, screenY, this.direction === -1);

    // Draw health bar
    const healthPercentage = this.health / this.maxHealth;
    const barWidth = this.width;
    const barHeight = 5;

    ctx.fillStyle = "#333";
    ctx.fillRect(screenX, screenY - 10, barWidth, barHeight);

    ctx.fillStyle = "#f00";
    ctx.fillRect(screenX, screenY - 10, barWidth * healthPercentage, barHeight);
    
    // Draw hitbox in debug mode
    if (window.DEBUG_SHOW_FRAMES) {
      const hitbox = this.getHitbox();
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        hitbox.x - cameraX,
        hitbox.y - cameraY,
        hitbox.width,
        hitbox.height
      );
      
      // Show enemy info
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(`Enemy: ${this.type} Lvl ${this.level}`, screenX, screenY - 15);
    }
  }

  attack(player) {
    // Don't attack if player is dead or game is over
    if (!player.isAlive() || (window.gameState && window.gameState.gameOver)) {
      return;
    }
    
    this.isAttacking = true;
    this.attackCooldown = this.attackCooldownMax;
    this.animationManager.playAnimation("attack1"); // Changed from "attack" to "attack1"

    // Deal damage to player when animation is halfway through
    setTimeout(() => {
      if (
        this.isAlive() &&
        player.isAlive() && // Double check player is still alive when damage is applied
        !window.gameState.gameOver && // Make sure game isn't over
        utils.distance(this.x, this.y, player.x, player.y) <= this.attackRange
      ) {
        const damageDealt = player.takeDamage(this.damage);
        ui.showMessage(`${this.type} dealt ${damageDealt} damage!`);
      }
    }, this.attackCooldownMax / 2);
  }

  takeDamage(damage) {
    // If already dead, don't take more damage
    if (!this.isAlive()) return 0;

    const actualDamage = Math.max(1, damage - this.defense);
    this.health -= actualDamage;

    if (this.health <= 0) {
      // Enemy has died
      this.health = 0;
      ui.showMessage(`${this.type} defeated!`);
      
      // Reset taking damage state to properly transition to death
      this.isTakingDamage = false;
      
      // Start death animation and lock it
      this.animationManager.playAnimation("dead");
      this.animationManager.lockAnimation();
      
      console.log(`Enemy ${this.type} Lvl ${this.level} died`);
    } else {
      // Still alive, just hurt
      this.isTakingDamage = true;
      this.animationManager.playAnimation("hurt");
    }

    return actualDamage;
  }

  isAlive() {
    return this.health > 0;
  }

  getXP() {
    return this.experienceValue;
  }

  getHitbox() {
    return {
      x: this.x + 20, // Match player hitbox style for consistent collision
      y: this.y + 20, 
      width: this.width - 40,
      height: this.height - 24,
    };
  }
}
