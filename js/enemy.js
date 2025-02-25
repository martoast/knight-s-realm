class Enemy {
  constructor(x, y, type, level) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.level = level || 1;
    this.width = 48;
    this.height = 48;
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
    this.loadAnimations();

    // AI
    this.detectionRange = 200;
    this.attackRange = 50;

    this.y = Math.floor(this.y);
  }

  async loadAnimations() {
    try {
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
      const attack2Sprite = await utils.loadSpritesheet(
        "sprites/knight/Attack2.png",
        64,
        64
      ); // Notice the space here
      const attack3Sprite = await utils.loadSpritesheet(
        "sprites/knight/Attack3.png",
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

      // Create animations with appropriate frame counts based on the sprites
      this.animationManager.addAnimation(
        "idle",
        new Animation(idleSprite, 4, 200)
      );
      this.animationManager.addAnimation(
        "walk",
        new Animation(walkSprite, 8, 100)
      );
      this.animationManager.addAnimation(
        "run",
        new Animation(runSprite, 8, 80)
      );
      this.animationManager.addAnimation(
        "jump",
        new Animation(jumpSprite, 2, 200, false)
      );
      this.animationManager.addAnimation(
        "attack1",
        new Animation(attack1Sprite, 5, 100, false)
      );
      this.animationManager.addAnimation(
        "attack2",
        new Animation(attack2Sprite, 5, 100, false)
      );
      this.animationManager.addAnimation(
        "attack3",
        new Animation(attack3Sprite, 5, 100, false)
      );
      this.animationManager.addAnimation(
        "runAttack",
        new Animation(runAttackSprite, 6, 100, false)
      );
      this.animationManager.addAnimation(
        "hurt",
        new Animation(hurtSprite, 2, 200, false)
      );
      this.animationManager.addAnimation(
        "dead",
        new Animation(deadSprite, 6, 200, false)
      );
      this.animationManager.addAnimation(
        "defend",
        new Animation(defendSprite, 2, 200)
      );
      this.animationManager.addAnimation(
        "protect",
        new Animation(protectSprite, 2, 200)
      );

      // Set initial animation
      this.animationManager.playAnimation("idle");
    } catch (error) {
      console.error("Error loading player animations:", error);
    }
  }

  update(deltaTime, player, world) {
    if (!this.isAlive()) {
      this.animationManager.playAnimation("dead");
      this.animationManager.update(deltaTime);
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
        // Move towards player
        this.x += this.speed * this.direction;
        this.animationManager.playAnimation("walk");
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

    // Update animation
    this.animationManager.update(deltaTime);
  }

  draw(ctx, cameraX, cameraY) {
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

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
  }

  attack(player) {
    this.isAttacking = true;
    this.attackCooldown = this.attackCooldownMax;
    this.animationManager.playAnimation("attack");

    // Deal damage to player when animation is halfway through
    setTimeout(() => {
      if (
        this.isAlive() &&
        utils.distance(this.x, this.y, player.x, player.y) <= this.attackRange
      ) {
        const damageDealt = player.takeDamage(this.damage);
        ui.showMessage(`${this.type} dealt ${damageDealt} damage!`);
      }
    }, this.attackCooldownMax / 2);
  }

  takeDamage(damage) {
    if (!this.isAlive()) return 0;

    const actualDamage = Math.max(1, damage - this.defense);
    this.health -= actualDamage;

    if (this.health <= 0) {
      this.health = 0;
      ui.showMessage(`${this.type} defeated!`);
    } else {
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
      x: this.x + 5,
      y: this.y + 5,
      width: this.width - 10,
      height: this.height - 5,
    };
  }
}
