class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tileSize = 32;
        
        // Camera
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraWidth = 800;
        this.cameraHeight = 600;
        
        // Define ground level
        this.groundLevel = Math.floor(this.height * 0.75);
    }
    
    update(deltaTime, player) {
        // Update camera to follow player
        this.updateCamera(player);
    }
    
    updateCamera(player) {
        // Center camera on player
        this.cameraX = player.x + player.width / 2 - this.cameraWidth / 2;
        
        // Offset the camera vertically to show more of what's above the player
        const verticalOffset = this.cameraHeight * 0.35; // Show more above than below
        this.cameraY = player.y + player.height / 2 - this.cameraHeight / 2 + verticalOffset;
        
        // Clamp camera to world bounds
        this.cameraX = Math.max(0, Math.min(this.width - this.cameraWidth, this.cameraX));
        this.cameraY = Math.max(0, Math.min(this.height - this.cameraHeight, this.cameraY));
    }
    
    draw(ctx) {
        // Set camera dimensions to canvas size
        this.cameraWidth = ctx.canvas.width;
        this.cameraHeight = ctx.canvas.height;
        
        // Draw sky background
        const gradient = ctx.createLinearGradient(0, 0, 0, this.cameraHeight);
        gradient.addColorStop(0, '#87CEEB'); // Sky blue at top
        gradient.addColorStop(1, '#BFEFFF'); // Lighter blue at bottom
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.cameraWidth, this.cameraHeight);
        
        // Draw ground
        const groundY = this.groundLevel - this.cameraY;
        ctx.fillStyle = '#5DBB63'; // Green for grass
        ctx.fillRect(0, groundY, this.cameraWidth, this.cameraHeight - groundY);
        
        // Draw a line at the ground level for clarity
        ctx.strokeStyle = '#3A7D44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(this.cameraWidth, groundY);
        ctx.stroke();
    }
    
    getBounds() {
        return {
            left: 0,
            top: 0,
            right: this.width,
            bottom: this.groundLevel
        };
    }
}