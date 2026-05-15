import { poseService } from "./pose-service.js";

export class PoseAdapter {
    constructor() {
        this.baselineY = null;
        this.calibrationData = []; // The buffer for 50 frames
        this.isCalibrating = true;
        this.action = "NEUTRAL";
        this.threshold = 60;
    }

    start() {
        poseService.subscribe((poses) => {
            this.analyze(poses);
        });
    }

    analyze(poses) {
        const body = poses[0];
        if (!body) return;

        const nose = body.keypoints.find(k => k.name === 'nose');

        if (nose && nose.score > 0.6) {

            // 50 FRAME CALIBRATION LOGIC
            if (this.isCalibrating) {
                this.calibrationData.push(nose.y);

                if (this.calibrationData.length >= 50) {
                    // Calculate average of the 50 frames
                    const sum = this.calibrationData.reduce((a, b) => a + b, 0);
                    this.baselineY = sum / this.calibrationData.length;
                    this.isCalibrating = false;
                    console.log("✅ Baseline Set via 50-frame average:", this.baselineY);
                }
                return; // Stop here until calibration is finished
            }

            // DETECTION LOGIC
            const currentY = nose.y;
            if (currentY < this.baselineY - this.threshold) {
                this.action = "JUMP";
            } else if (currentY > this.baselineY + (this.threshold * 0.8)) {
                this.action = "DUCK";
            } else {
                this.action = "NEUTRAL";
            }
        }
    }
}