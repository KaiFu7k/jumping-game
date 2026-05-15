# jumping-game

# First-Person Dino Runner

A browser-based endless runner built with **Kontra.js** and a webcam-driven pose control layer powered by **TensorFlow MoveNet**. The game places the player in a first-person tunnel where they avoid incoming cactus and bird obstacles by jumping or ducking with either the keyboard or body movement.

## Overview

This project combines a lightweight canvas game loop with real-time pose detection:

- **Game engine:** Kontra.js handles canvas setup, keyboard input, and the main game loop.
- **Pose controls:** A `PoseAdapter` translates body movement into game actions.
- **Pose detection service:** A `PoseService` uses the webcam and MoveNet to estimate poses in real time.
- **Rendering style:** Obstacles and tunnel rings are scaled by depth to create a pseudo-3D first-person effect.

## Features

- Endless runner gameplay with increasing speed over time.
- Two obstacle types: cacti and birds.
- Dual input support: keyboard and pose-based controls.
- Automatic pose calibration using the player’s nose position.
- Background music that starts after user interaction.
- Restart flow after game over.
- Perspective tunnel rendering for a first-person experience.

## Controls

### Pose Controls

The game uses the player’s **nose position** as a simple control signal:

- Move your head **up** relative to the calibrated baseline to trigger **JUMP**.
- Move your head **down** relative to the calibrated baseline to trigger **DUCK**.
- Stay near the baseline for **NEUTRAL**.

When the system first detects a player, it stores the current nose position as a baseline. Until then, the game shows a calibration message.

## File Structure

```text
.
├── index.html
├── game.js
├── pose-adapter.js
└── core/
    └── input/
        └── pose-service.js
```

## Main Components

### `index.html`

Sets up the page, canvas, and external dependencies:

- TensorFlow.js core, converter, and WebGL backend
- `@tensorflow-models/pose-detection`
- Kontra.js
- The main game module

It also defines the centered canvas layout and page styling.

### `game.js`

Contains the core gameplay logic:

- Initializes Kontra and keyboard support
- Starts the pose adapter
- Tracks game state such as score, speed, obstacles, jumping, ducking, and game over
- Spawns obstacles at intervals
- Updates obstacle positions and collision checks
- Renders the tunnel, obstacles, HUD, and game-over screen
- Starts and manages background music

#### Game Systems

- **Jumping:** Uses velocity and gravity for arc-based movement.
- **Ducking:** Lowers the player camera to avoid birds.
- **Difficulty scaling:** Speed increases every 500 points.
- **Obstacle spawning:** Randomly creates birds or cactus clusters.
- **Collision detection:** Checks obstacle depth and lateral offset when they approach the player.

### `pose-adapter.js`

Acts as a translation layer between raw pose data and gameplay input.

Responsibilities:

- Subscribes to the shared `poseService`
- Reads the first detected body
- Finds the `nose` keypoint
- Stores an initial `baselineY`
- Converts vertical movement into one of three actions:
    - `JUMP`
    - `DUCK`
    - `NEUTRAL`

This keeps the game logic independent from the lower-level pose estimation details.

### `pose-service.js`

Provides the real-time pose detection infrastructure.

Responsibilities:

- Creates and manages a hidden video element
- Requests webcam access with `getUserMedia`
- Loads the MoveNet MultiPose Lightning model
- Runs pose estimation on every animation frame
- Broadcasts detected poses to subscribed listeners
- Stops camera and model resources when no listeners remain

This service is designed to be reusable for other games or interactive experiences.

## How the Perspective Effect Works

The game simulates depth by storing a `z` position for tunnel rings and obstacles.
Each frame:

- Objects move toward the player by decreasing `z`
- A scale factor is computed using the field of view:

```js
scale = fov / (fov + z)
```

- Width, height, and on-screen position are multiplied by this scale

As objects get closer, they appear larger, which creates the first-person tunnel effect.

## Obstacle Logic

### Cacti

- Spawn in clusters of 1 to 3
- Can appear with small horizontal offsets
- Require the player to **jump** over them

### Birds

- Spawn less frequently
- Fly at a fixed altitude
- Require the player to **duck** under them

## Collision Rules

A collision is checked when an obstacle reaches the near-camera zone.

- If a cactus is close and the player is not high enough, the game ends.
- If a bird is close and the player is not ducking, the game ends.

## Audio

The game includes looping background music:

- File: `loop for game.mp3`
- Starts only after a user input event to comply with browser autoplay restrictions
- Pauses on game over
- Restarts from the beginning after reset

## Setup

Because the project uses webcam access and ES modules, it should be run from a local web server rather than opened directly as a file.

### Example options

- VS Code Live Server
- `python -m http.server`
- Any static development server

## Running the Project

1. Place all project files in the correct structure.
2. Make sure the audio file is available as `loop for game.mp3`.
3. Start a local web server.
4. Open the app in a modern browser.
5. Allow webcam access when prompted.
6. Stand still briefly so pose calibration can complete.
7. Use your body or keyboard to play.

## Browser Requirements

- A modern browser with webcam support
- JavaScript modules enabled
- WebGL support for TensorFlow.js backend
- Permission to access the camera

## Possible Improvements

- Add a visible player avatar or body overlay
- Add a pause menu and start screen
- Display webcam or skeleton debug view
- Improve collision detection with more precise hitboxes
- Add score saving or local leaderboard
- Add mobile-friendly control alternatives
- Support multiple gestures beyond jump and duck

## Credits

- **Kontra.js** for the game framework
- **TensorFlow.js** and **MoveNet** for pose detection, used Pose Service