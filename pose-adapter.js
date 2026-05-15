import { poseService } from "./pose-service.js";

export class PoseAdapter {
    constructor() {
        this.baselineY = null;
        this.action = "NEUTRAL"; // This is what the game will read
    }

    start() {
        // This connects to the service you sent me
        poseService.subscribe((poses) => {
            this.analyze(poses);
        });
    }

    analyze(poses) {
        const body = poses[0];
        if (!body) return;

        const nose = body.keypoints.find(k => k.name === 'nose');

        // nose.score > 0.5 ensures the AI is confident it actually sees you
        if (nose && nose.score > 0.5) {

            // 1. CALIBRATION
            // The first time the AI sees you, it remembers where your nose is.
            if (this.baselineY === null) {
                this.baselineY = nose.y;
                return;
            }

            // 2. DETECTION
            const threshold = 30; // How many pixels you have to move to trigger

            if (nose.y < this.baselineY - threshold) {
                this.action = "JUMP";
            } else if (nose.y > this.baselineY + threshold) {
                this.action = "DUCK";
            } else {
                this.action = "NEUTRAL";
            }
        }
    }
}