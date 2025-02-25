// Simplified UI
const ui = {
    init: function(player) {
        this.messageQueue = [];
        this.messageTimeout = null;
        
        // Create a simple message display
        const messageDisplay = document.createElement('div');
        messageDisplay.id = 'message-display';
        messageDisplay.style.position = 'absolute';
        messageDisplay.style.bottom = '20px';
        messageDisplay.style.left = '50%';
        messageDisplay.style.transform = 'translateX(-50%)';
        messageDisplay.style.color = 'white';
        messageDisplay.style.fontFamily = 'Arial';
        messageDisplay.style.fontSize = '18px';
        messageDisplay.style.textAlign = 'center';
        document.body.appendChild(messageDisplay);
        
        // Create animation name display
        const animDisplay = document.createElement('div');
        animDisplay.id = 'animation-display';
        animDisplay.style.position = 'absolute';
        animDisplay.style.top = '100px';
        animDisplay.style.right = '20px';
        animDisplay.style.background = 'rgba(0,0,0,0.5)';
        animDisplay.style.color = 'white';
        animDisplay.style.padding = '10px';
        animDisplay.style.borderRadius = '5px';
        animDisplay.style.fontFamily = 'Arial';
        document.body.appendChild(animDisplay);
    },
    
    updatePlayerStats: function(player) {
        // Update animation display if it exists
        const animDisplay = document.getElementById('animation-display');
        if (animDisplay && player.animationManager) {
            animDisplay.textContent = `Animation: ${player.animationManager.currentAnimation || 'none'}`;
        }
    },
    
    showMessage: function(message) {
        console.log(message);
        
        this.messageQueue.push(message);
        
        if (!this.messageTimeout) {
            this.processMessageQueue();
        }
    },
    
    processMessageQueue: function() {
        if (this.messageQueue.length === 0) {
            this.messageTimeout = null;
            return;
        }
        
        const message = this.messageQueue.shift();
        const messageDisplay = document.getElementById('message-display');
        
        if (messageDisplay) {
            messageDisplay.textContent = message;
            messageDisplay.style.opacity = 1;
            
            // Fade out
            setTimeout(() => {
                messageDisplay.style.transition = 'opacity 1s ease-out';
                messageDisplay.style.opacity = 0;
            }, 2000);
        }
        
        this.messageTimeout = setTimeout(() => {
            this.processMessageQueue();
        }, 3000);
    }
};