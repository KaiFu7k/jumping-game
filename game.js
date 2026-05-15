// Bring in PoseAdapter
import { PoseAdapter } from './pose-adapter.js';
const myInput = new PoseAdapter();
myInput.start();

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

// Tunnel effect state
let tunnelSquares = [1000, 800, 600, 400, 200];

function spawnObstacle() {
    if (Math.random() < 0.25) {
        obstacles.push({
            type: 'bird',
            z: 1200,
            baseW: 80,
            baseH: 20,
            altitude: 320,
            offsetX: (Math.random() - 0.75) * 40
        });
        return;
    }

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

function drawTunnel() {
    context.strokeStyle = '#333';
    context.lineWidth = 2;
    const vpX = centerX;
    const vpY = centerY;

    context.beginPath();
    context.moveTo(0, -playerY); context.lineTo(vpX, vpY);
    context.moveTo(canvas.width, -playerY); context.lineTo(vpX, vpY);
    context.moveTo(0, canvas.height - playerY); context.lineTo(vpX, vpY);
    context.moveTo(canvas.width, canvas.height - playerY); context.lineTo(vpX, vpY);
    context.stroke();

    for (let i = 0; i < tunnelSquares.length; i++) {
        tunnelSquares[i] -= speed;
        if (tunnelSquares[i] <= 0) tunnelSquares[i] = 1200;
        let z = tunnelSquares[i];
        let scale = fov / (fov + z);
        let w = canvas.width * scale;
        let h = canvas.height * scale;
        let ringCenterY = centerY - (playerY * scale);
        context.strokeRect(centerX - w / 2, ringCenterY - h / 2, w, h);
    }
}

// --- Main Game Loop ---
const loop = GameLoop({
    update: function() {
        // AI AND KEYBOARD INPUTS
        const isTryingToJump = keyPressed('space') || keyPressed('arrowup') || keyPressed('w') || myInput.action === "JUMP";
        const isTryingToDuck = keyPressed('arrowdown') || keyPressed('s') || myInput.action === "DUCK";

        if (isGameOver) {
            if (isTryingToJump || keyPressed('space')) {
                // Restart Game
                obstacles = [];
                score = 0;
                speed = 8;
                isGameOver = false;
                playerY = 0;
                velocityY = 0;
                isJumping = false;
            }
            return;
        }

        score++;
        if (score % 500 === 0) speed += 1;

        // --- Handle Ducking Logic ---
        if (isTryingToDuck) {
            if (!isJumping) {
                isDucking = true;
                playerY = 30; // Cam down
            }
        } else {
            isDucking = false;
        }

        // --- Handle Jumping Logic ---
        if (isTryingToJump && !isJumping && !isDucking) {
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
            playerY = 0;
        }

        // --- Obstacle Logic ---
        frameCount++;
        if (frameCount % 60 === 0) {
            spawnObstacle();
            frameCount = 0;
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.z -= speed;

            if (obs.z < 60 && obs.z > -20) {
                if (Math.abs(obs.offsetX) < 60) {
                    if (obs.type === 'cactus') {
                        if (Math.abs(playerY) < obs.baseH * 0.8) {
                            isGameOver = true;
                        }
                    } else if (obs.type === 'bird') {
                        if (!isDucking) {
                            isGameOver = true;
                        }
                    }
                }
            }

            if (obs.z < -100) {
                obstacles.splice(i, 1);
            }
        }
    },

    render: function() {
        drawTunnel();

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
                let drawY = groundY - (obs.altitude * scale);
                context.strokeStyle = '#3399ff';
                context.lineWidth = Math.max(2, 6 * scale);
                context.lineCap = 'round';
                context.beginPath();
                context.arc(drawX + w/4, drawY, w/4, Math.PI, 0);
                context.arc(drawX + (w * 0.75), drawY, w/4, Math.PI, 0);
                context.stroke();
            }
        });

        // 3. Draw HUD
        context.fillStyle = 'white';
        context.font = '24px Courier New';
        context.fillText(`Score: ${score}`, 20, 40);

        // --- Calibration UI (Elite Ball Knowledge) ---
        context.fillStyle = 'yellow';
        context.font = '12px Arial';
        const aiStatus = myInput.baselineY === null ? "CALIBRATING... STAND STILL" : `AI READY: ${myInput.action}`;
        context.fillText(aiStatus, 20, 60);

        if (isGameOver) {
            context.fillStyle = 'red';
            context.font = '50px Courier New';
            context.textAlign = 'center';
            context.fillText('GAME OVER', centerX, centerY - 20);
            context.fillStyle = 'white';
            context.font = '20px Courier New';
            context.fillText('Press SPACE or JUMP to restart', centerX, centerY + 30);
            context.textAlign = 'left';
        }
    }
});

loop.start();