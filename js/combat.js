// Enhanced combat system
const combat = {
    checkAttacks: function(player, enemies) {
        // Skip if player is not attacking
        if (!player.isAttacking) return;
        
        // Enhanced debug info for attack animation
        if (window.DEBUG_SHOW_FRAMES) {
            const attackAnim = player.animationManager.animations['attack'];
            if (attackAnim) {
                console.log(`Attack in progress! Frame: ${attackAnim.frameIndex + 1}/${attackAnim.frameCount} - Time: ${attackAnim.timeSinceLastFrame}ms`);
            }
        }
        
        // Get attack hitbox
        const attackHitbox = player.getAttackHitbox();
        
        // Get attack frame progress (attack is most effective in middle frames)
        let attackProgress = 0;
        const attackAnim = player.animationManager.animations['attack'];
        if (attackAnim) {
            attackProgress = attackAnim.frameIndex / attackAnim.frameCount;
        }
        
        // Attack is most effective in the middle of the animation (frames 1-3)
        if (attackProgress > 0.2 && attackProgress < 0.8) {
            for (const enemy of enemies) {
                if (!enemy.isAlive() || enemy.isTakingDamage) continue;
                
                const enemyHitbox = enemy.getHitbox();
                if (this.checkCollision(attackHitbox, enemyHitbox)) {
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
    },
    
    checkCollision: function(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    },
    
    // Calculate critical hits and damage multipliers
    calculateDamage: function(baseDamage, attacker, defender) {
        // Check for critical hit (10% chance)
        const isCritical = Math.random() < 0.1;
        let damage = baseDamage;
        
        // Apply critical multiplier
        if (isCritical) {
            damage *= 1.5;
        }
        
        // Apply defender's defense
        damage = Math.max(1, damage - defender.defense);
        
        return {
            damage: Math.floor(damage),
            isCritical
        };
    },
    
    // Draw combat effects
    drawEffects: function(ctx, effects) {
        for (const effect of effects) {
            // Draw effect based on type
        }
    }
};