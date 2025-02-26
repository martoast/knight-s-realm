// utils.js - Complete file
const utils = {
    distance: function(x1, y1, x2, y2) {
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },
  
    randomInt: function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
  
    loadImage: function(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.warn(`Failed to load image: ${src}, creating placeholder`);
  
          // Create a placeholder canvas
          const canvas = document.createElement("canvas");
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext("2d");
  
          // Draw placeholder pattern
          ctx.fillStyle = "#FF00FF"; // Magenta to indicate missing texture
          ctx.fillRect(0, 0, 64, 64);
          ctx.fillStyle = "#000000";
          ctx.font = "10px Arial";
          ctx.fillText("Missing", 10, 30);
          ctx.fillText("Texture", 10, 45);
  
          resolve(canvas);
        };
        img.src = src;
      });
    },
  
    // Completely rewritten sprite sheet loading function
    loadSpritesheet: function(src, frameWidth, frameHeight) {
      return this.loadImage(src).then((image) => {
        // If the image is a placeholder (canvas), create a basic structure
        if (image instanceof HTMLCanvasElement) {
          return {
            image: image,
            frameWidth: frameWidth,
            frameHeight: frameHeight,
            frameCount: 1
          };
        }

        // Animation frame counts - updated based on actual sprite sheets
        const animationFrameCounts = {
          "Walk.png": 8,     // Correct: 8 frames
          "Attack1.png": 5,  // Updated: 4 frames
          "Idle.png": 4,     // Correct: 4 frames 
          "Run.png": 7,      // Updated: 7 frames
          "RunAttack.png": 6, // Correct: 6 frames
          "Jump.png": 6,      // Correct: 6 frames
          "Dead.png": 6,      // Correct: 6 frames
          "Hurt.png": 2,      // Correct: 2 frames
          "Defend.png": 5,    // Updated: 5 frames
          "Protect.png": 5    // Assuming similar to Defend
        };

        // Find the matching animation type for this file
        let frameCount = 0;
        let animationType = "";
        for (const [animType, count] of Object.entries(animationFrameCounts)) {
          if (src.includes(animType)) {
            frameCount = count;
            animationType = animType;
            break;
          }
        }
        
        // Fallback if no specific animation type is detected
        if (frameCount === 0) {
          console.warn(`Unknown animation type for ${src}, guessing frameCount`);
          frameCount = Math.floor(image.width / frameWidth);
        }

        // Calculate the width of each frame - THIS IS CRITICAL
        const exactFrameWidth = image.width / frameCount;
        
        console.log(`Loaded ${src}: ${frameCount} frames, image width=${image.width}px, each frame=${exactFrameWidth}px`);

        // Build the spritesheet object with all the necessary properties
        return {
          image: image,
          frameWidth: exactFrameWidth,
          frameHeight: frameHeight,
          frameCount: frameCount,
          animationType: animationType,
          totalWidth: image.width,
          totalHeight: image.height
        };
      });
    }
};