import { InputAdapter } from "../../../core/input/input-adapter.js";
import { poseService } from "../../../core/input/pose-service.js";
import { SQUASH_ACTIONS } from "../actions.js";

export class SquashPoseAdapter extends InputAdapter {
    constructor() {
        super();
        this.canvas = null;
    }

    onStart(canvas) {
        this.canvas = canvas; // Save reference
        this.unsubscribe = poseService.subscribe((poses) => {
            this.analyzePose(poses);
        });
    }

    onStop() {
        if (this.unsubscribe) this.unsubscribe();
    }

    analyzePose(poses) {
        if (!this.canvas) return;

        const playerBody = poses[0];
        if (!playerBody) return;

        const nose = playerBody.keypoints.find(k => k.name === 'nose');

        if (nose && nose.score > 0.3) {

            // 1. Normalize Coordinates (0.0 to 1.0)
            // MoveNet usually returns pixels relative to the video feed (640x480)
            // We convert to % so we can map to ANY game resolution
            let normX = nose.x / 640;
            let normY = nose.y / 480;

            // 2. Mirroring (Flip X)
            // Because a webcam feels like a mirror
            normX = 1.0 - normX;

            // 3. Map to Game Canvas Size (800x600)
            let gameX = normX * this.canvas.width;
            let gameY = normY * this.canvas.height;

            // 4. Clamp (Keep inside bounds)
            // Keeps the sprite fully on screen (assuming 40px width sprite)
            const padding = 20;
            gameX = Math.max(padding, Math.min(this.canvas.width - padding, gameX));
            gameY = Math.max(padding, Math.min(this.canvas.height - padding, gameY));

            this.emit(SQUASH_ACTIONS.MOVE, {
                x: gameX,
                y: gameY
            });
        }
    }
}