// animation.js - Completely rewritten file
class Animation {
    constructor(spritesheet, frameCount, frameDuration, loop = true) {
        // Store reference to the spritesheet data
        this.spritesheet = spritesheet;
        // How many frames are in this animation
        this.frameCount = frameCount;
        // How long each frame should display (in ms)
        this.frameDuration = frameDuration;
        // Should the animation loop?
        this.loop = loop;
        // Current frame index
        this.frameIndex = 0;
        // Time tracking for frame changes
        this.timeSinceLastFrame = 0;
        // Track if non-looping animation is complete
        this.finished = false;
        // Store animation name for debugging
        this.name = '';
    }
  
    update(deltaTime) {
        // Special case for single-frame animations (like our idle)
        if (this.frameCount <= 1) {
            this.frameIndex = 0;
            return;
        }
        
        // If animation is finished and doesn't loop, do nothing
        if (this.finished && !this.loop) {
            // Ensure we stay on the last frame
            this.frameIndex = this.frameCount - 1;
            return;
        }
  
        // Accumulate time since last update
        this.timeSinceLastFrame += deltaTime;
  
        // Check if it's time to move to the next frame
        if (this.timeSinceLastFrame >= this.frameDuration) {
            // Move to next frame
            this.frameIndex++;
            
            // Reset time counter
            this.timeSinceLastFrame = 0;
            
            // Handle animation completion
            if (this.frameIndex >= this.frameCount) {
                if (this.loop) {
                    // Loop back to first frame
                    this.frameIndex = 0;
                } else {
                    // Stay on last frame and mark as finished
                    this.frameIndex = this.frameCount - 1;
                    this.finished = true;
                    console.log(`Animation "${this.name}" finished`);
                }
            }
        }
    }
  
    draw(ctx, x, y, flipX = false) {
        // Ensure valid frame index - critical for jump animation with 6 frames
        const frameIndex = Math.min(Math.max(0, this.frameIndex), this.frameCount - 1);
        
        // Get frame dimensions
        const frameWidth = this.spritesheet.frameWidth;
        const frameHeight = this.spritesheet.frameHeight;
        
        // Calculate the source position in the spritesheet
        // Make sure we select the correct frame in the strip
        const sourceX = Math.floor(frameIndex * frameWidth);
        const sourceY = 0; // All frames are in a single row
        
        // Save context state before applying transformations
        ctx.save();
        
        if (flipX) {
            // Set up horizontal flip transformation
            ctx.translate(x + frameWidth, y);
            ctx.scale(-1, 1);
            
            try {
                // Draw the frame - wrap in try/catch to handle any drawing errors
                ctx.drawImage(
                    this.spritesheet.image,   // Image source
                    sourceX, sourceY,         // Source position
                    frameWidth, frameHeight,  // Source dimensions
                    0, 0,                     // Destination position (0,0 because of translation)
                    frameWidth, frameHeight   // Destination dimensions
                );
            } catch (error) {
                console.error(`Error drawing animation frame: ${error.message}`);
                console.error(`Frame: ${frameIndex}/${this.frameCount}, Source: (${sourceX}, ${sourceY}), Size: ${frameWidth}x${frameHeight}`);
            }
            
            // Debug visualization
            if (window.DEBUG_SHOW_FRAMES) {
                // Frame boundary
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, frameWidth, frameHeight);
                
                // Frame number
                ctx.fillStyle = 'yellow';
                ctx.font = '12px Arial';
                ctx.fillText(`Frame: ${frameIndex+1}/${this.frameCount}`, 5, 15);
                
                if (this.name) {
                    ctx.fillText(this.name, 5, 30);
                }
            }
        } else {
            // Draw the frame normally
            try {
                ctx.drawImage(
                    this.spritesheet.image,   // Image source
                    sourceX, sourceY,         // Source position
                    frameWidth, frameHeight,  // Source dimensions
                    x, y,                     // Destination position
                    frameWidth, frameHeight   // Destination dimensions
                );
            } catch (error) {
                console.error(`Error drawing animation frame: ${error.message}`);
                console.error(`Frame: ${frameIndex}/${this.frameCount}, Source: (${sourceX}, ${sourceY}), Size: ${frameWidth}x${frameHeight}`);
            }
            
            // Debug visualization
            if (window.DEBUG_SHOW_FRAMES) {
                // Frame boundary
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, frameWidth, frameHeight);
                
                // Frame number
                ctx.fillStyle = 'yellow';
                ctx.font = '12px Arial';
                ctx.fillText(`Frame: ${frameIndex+1}/${this.frameCount}`, x + 5, y + 15);
                
                if (this.name) {
                    ctx.fillText(this.name, x + 5, y + 30);
                }
            }
        }
        
        // Restore the context state
        ctx.restore();
    }
  
    reset() {
        this.frameIndex = 0;
        this.timeSinceLastFrame = 0;
        this.finished = false;
        console.log(`Animation "${this.name}" reset`);
    }
}
  
class AnimationManager {
    constructor() {
        this.animations = {};
        this.currentAnimation = null;
        this.previousAnimation = null;
        this.locked = false; // Add a lock to prevent animation switching
    }
  
    addAnimation(name, animation) {
        animation.name = name; // Store name in animation for debugging
        this.animations[name] = animation;
    }
  
    playAnimation(name) {
        // Don't change animations if locked (prevents interruptions)
        if (this.locked) return;
        
        // Check if animation exists
        if (!this.animations[name]) {
            console.error(`Animation "${name}" not found`);
            return;
        }
  
        // Don't restart the same animation unless it's finished
        if (this.currentAnimation === name) {
            if (this.animations[name].finished) {
                this.animations[name].reset();
            }
            return;
        }
  
        // Store previous animation name
        this.previousAnimation = this.currentAnimation;
  
        // Reset the animation we're switching to
        this.animations[name].reset();
  
        // Set current animation
        this.currentAnimation = name;
        
        // Debug output
        if (window.DEBUG_SHOW_FRAMES) {
            console.log(`Animation changed to: ${name}`);
        }
    }
  
    lockAnimation() {
        this.locked = true;
    }
    
    unlockAnimation() {
        this.locked = false;
    }
    
    update(deltaTime) {
        // Update current animation
        if (this.currentAnimation && this.animations[this.currentAnimation]) {
            this.animations[this.currentAnimation].update(deltaTime);
            
            // If non-looping animation finished and we're locked, unlock
            if (this.locked && this.animations[this.currentAnimation].finished) {
                this.unlockAnimation();
            }
        }
    }
  
    draw(ctx, x, y, flipX = false) {
        // Draw current animation
        if (this.currentAnimation && this.animations[this.currentAnimation]) {
            this.animations[this.currentAnimation].draw(ctx, x, y, flipX);
        }
    }
  
    isFinished() {
        if (this.currentAnimation && this.animations[this.currentAnimation]) {
            return this.animations[this.currentAnimation].finished;
        }
        return true;
    }
  
    getCurrentAnimationName() {
        return this.currentAnimation;
    }
  
    resetCurrentAnimation() {
        if (this.currentAnimation && this.animations[this.currentAnimation]) {
            this.animations[this.currentAnimation].reset();
        }
    }
}