// Initialize Kontra
const { init, GameLoop, initKeys, keyPressed } = kontra;
const { canvas, context } = init();
initKeys();

// Canvas constants
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const fov = 300; // Field of view (affects depth scaling)

// Game State
let speed = 8;
let score = 0;
let frameCount = 0;
let isGameOver = false;
let obstacles = [];

// Player (Camera) Jump State
let playerY = 0; // 0 is ground. Negative goes UP.
let velocityY = 0;
const gravity = 0.8;
const jumpStrength = 15;
let isJumping = false;
let isDucking = false;

// --- Audio Setup ---
const bgMusic = new Audio('loop for game.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5; // 0.0 to 1.0 (50% volume is a safe starting point)

// We need a flag to track if the music has successfully started
let musicStarted = false;

// Tunnel effect state
let tunnelSquares = [1000, 800, 600, 400, 200];

function spawnObstacle() {
    // 25% chance to spawn a bird, 75% chance to spawn a cactus cluster
    if (Math.random() < 0.25) {
        obstacles.push({
            type: 'bird',
            z: 1200,
            baseW: 80,   // Wider wingspan
            baseH: 20,
            altitude: 320, // How high off the ground it flies
            offsetX: (Math.random() - 0.75) * 40 // Keep it in the middle lane
        });
        return; // End function here so we don't spawn cacti too
    }

    // --- Normal Cactus Logic Below ---
    const clusterSize = Math.floor(Math.random() * 3) + 1;
    let side = Math.random() > 0.5 ? 1 : -1;

    for (let i = 0; i < clusterSize; i++) {
        let sizeMod = 0.7 + (Math.random() * 0.6);
        let offsetX = 0;

        if (i === 0) {
            offsetX = (Math.random() - 0.5) * 40;
        } else {
            offsetX = side * (50 + Math.random() * 50);
            side *= -1;
        }

        obstacles.push({
            type: 'cactus',
            z: 1200 + (Math.random() * 60),
            baseW: 50 * sizeMod,
            baseH: 120 * sizeMod,
            offsetX: offsetX,
            isFlipped: Math.random() > 0.5
        });
    }
}

// Function to draw a wireframe tunnel
// Function to draw a wireframe tunnel
function drawTunnel() {
    context.strokeStyle = '#333';
    context.lineWidth = 2;

    // The vanishing point (horizon) stays perfectly centered!
    const vpX = centerX;
    const vpY = centerY;

    // Draw corner lines. The front of the tunnel (z=0) shifts by exactly -playerY
    context.beginPath();
    context.moveTo(0, -playerY); context.lineTo(vpX, vpY); // Top-left
    context.moveTo(canvas.width, -playerY); context.lineTo(vpX, vpY); // Top-right
    context.moveTo(0, canvas.height - playerY); context.lineTo(vpX, vpY); // Bottom-left
    context.moveTo(canvas.width, canvas.height - playerY); context.lineTo(vpX, vpY); // Bottom-right
    context.stroke();

    // Draw moving tunnel rings
    for (let i = 0; i < tunnelSquares.length; i++) {
        tunnelSquares[i] -= speed;
        if (tunnelSquares[i] <= 0) tunnelSquares[i] = 1200; // Reset to back

        let z = tunnelSquares[i];
        let scale = fov / (fov + z);
        let w = canvas.width * scale;
        let h = canvas.height * scale;

        // Shift the center of this specific square based on its depth scale
        let ringCenterY = centerY - (playerY * scale);

        context.strokeRect(centerX - w / 2, ringCenterY - h / 2, w, h);
    }
}

// Main Game Loop
const loop = GameLoop({
    update: function() {
        if (isGameOver) {
            bgMusic.pause();
            if (keyPressed('space')) {
                // Restart Game
                obstacles = [];
                score = 0;
                speed = 8;
                isGameOver = false;
                playerY = 0;
                velocityY = 0;
                isJumping = false;
                bgMusic.currentTime = 0;
                bgMusic.play();
            }
            return;
        }

        if (!musicStarted && (keyPressed('space') || keyPressed('up') || keyPressed('w') || keyPressed('down') || keyPressed('s'))) {
            bgMusic.play().then(() => {
                musicStarted = true;
            }).catch(err => {
                // Catch any browser errors if it still blocks it
                console.log("Browser blocked audio playback:", err);
            });
        }

        score++;
        if (score % 500 === 0) speed += 1; // Increase speed over time

        // --- Jump & Duck Controls ---
        // Ducking
        if (keyPressed('arrowdown') || keyPressed('s')) {
            if (!isJumping) {
                isDucking = true;
                playerY = 30; // Shift camera DOWN closer to the ground
            }
        } else {
            isDucking = false;
        }

        // Jumping
        if ((keyPressed('space') || keyPressed('arrowup') || keyPressed('w')) && !isJumping && !isDucking) {
            velocityY = -jumpStrength;
            isJumping = true;
        }

        playerY += velocityY;

        if (isJumping) {
            velocityY += gravity;
        }

        // Hit the ground
        if (playerY >= 0 && isJumping) {
            playerY = 0;
            isJumping = false;
            velocityY = 0;
        } else if (!isJumping && !isDucking) {
            playerY = 0; // Reset to normal standing height
        }

        // --- Obstacle Logic ---
        frameCount++;
        if (frameCount % 60 === 0) { // Spawn rate
            spawnObstacle();
            frameCount = 0; // Prevent massive frameCount values
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.z -= speed;

            // Collision Detection:
            if (obs.z < 60 && obs.z > -20) {
                // Check if it's in the middle lane
                if (Math.abs(obs.offsetX) < 60) {

                    if (obs.type === 'cactus') {
                        // Cactus: You die if you aren't high enough
                        if (Math.abs(playerY) < obs.baseH * 0.8) {
                            isGameOver = true;
                        }
                    } else if (obs.type === 'bird') {
                        // Bird: You die if you ARE NOT ducking
                        if (!isDucking) {
                            isGameOver = true;
                        }
                    }

                }
            }

            // Remove obstacles that have passed the camera (z goes negative)
            if (obs.z < -100) {
                obstacles.splice(i, 1);
            }
        }
    },

    render: function() {
        // 1. Draw Tunnel (Vanishing point stays still now)
        drawTunnel();

        // 2. Draw Obstacles
        obstacles.forEach(obs => {
            if (obs.z < 0) return;

            let scale = fov / (fov + obs.z);
            let w = obs.baseW * scale;
            let h = obs.baseH * scale;

            let ringCenterY = centerY - (playerY * scale);
            let groundY = ringCenterY + (canvas.height / 2) * scale;
            let drawX = centerX - w / 2 + (obs.offsetX * scale);

            if (obs.type === 'cactus') {
                let drawY = groundY - h;

                // --- Draw Front-Facing Cactus ---
                let trunkW = w * 0.3;
                let trunkX = drawX + (w / 2) - (trunkW / 2);
                let armW = w * 0.2;

                context.fillStyle = '#22cc22';
                context.fillRect(trunkX, drawY, trunkW, h);

                let leftArmY1 = obs.isFlipped ? 0.1 : 0.3;
                let leftArmY2 = obs.isFlipped ? 0.3 : 0.5;
                let rightArmY1 = obs.isFlipped ? 0.3 : 0.1;
                let rightArmY2 = obs.isFlipped ? 0.5 : 0.3;

                context.fillRect(drawX, drawY + h * leftArmY1, armW, h * 0.4);
                context.fillRect(drawX + armW, drawY + h * leftArmY2, trunkX - (drawX + armW), armW);
                context.fillRect(drawX + w - armW, drawY + h * rightArmY1, armW, h * 0.4);
                context.fillRect(trunkX + trunkW, drawY + h * rightArmY2, (drawX + w - armW) - (trunkX + trunkW), armW);

                context.fillStyle = '#1aa31a';
                context.fillRect(trunkX + trunkW * 0.4, drawY, trunkW * 0.2, h);

            } else if (obs.type === 'bird') {
                // --- Draw Seagull Bird ---
                // Subtract altitude so it flies above the ground
                let drawY = groundY - (obs.altitude * scale);

                context.strokeStyle = '#3399ff'; // Nice bright blue
                context.lineWidth = Math.max(2, 6 * scale); // Thicker line as it gets closer
                context.lineCap = 'round';

                // Draw two touching semicircles to form an 'M' or 'v' shape
                context.beginPath();
                // Left Wing
                context.arc(drawX + w/4, drawY, w/4, Math.PI, 0);
                // Right Wing
                context.arc(drawX + (w * 0.75), drawY, w/4, Math.PI, 0);
                context.stroke();
            }
        });

        // 3. Draw HUD (Heads Up Display)
        context.fillStyle = 'white';
        context.font = '24px Courier New';
        context.fillText(`Score: ${score}`, 20, 40);

        if (isGameOver) {
            context.fillStyle = 'red';
            context.font = '50px Courier New';
            context.textAlign = 'center';
            context.fillText('GAME OVER', centerX, centerY - 20);
            context.fillStyle = 'white';
            context.font = '20px Courier New';
            context.fillText('Press SPACE to restart', centerX, centerY + 30);
            context.textAlign = 'left';
        }
    }
});

loop.start();