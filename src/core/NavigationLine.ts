import * as THREE from 'three';

export class NavigationLine {
    private line: THREE.Line;
    private startTime: number;
    private duration: number = 60000; // 60 seconds (1 minute) in milliseconds
    private isActive: boolean = false;
    private scene: THREE.Scene;
    private startPosition: THREE.Vector3;
    private endPosition: THREE.Vector3;
    private animationSpeed: number = 2.0;

    constructor(scene: THREE.Scene, startPosition: THREE.Vector3, endPosition: THREE.Vector3) {
        this.scene = scene;
        this.startPosition = startPosition.clone();
        this.endPosition = endPosition.clone();
        this.startTime = Date.now();

        this.line = this.createLine();
        this.activate();
    }

    private createLine(): THREE.Line {
        const points = [];
        const segmentCount = 50; // Number of segments for smooth line

        // Create points along the line from start to end
        for (let i = 0; i <= segmentCount; i++) {
            const t = i / segmentCount;
            const point = new THREE.Vector3().lerpVectors(this.startPosition, this.endPosition, t);

            // Add some height variation to make the line more visible
            const heightOffset = Math.sin(t * Math.PI) * 2.0; // Arc shape
            point.y += heightOffset;

            points.push(point);
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Create animated material with glowing effect
        const material = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            linewidth: 3 // Note: linewidth may not work in all browsers
        });

        const line = new THREE.Line(geometry, material);
        return line;
    }

    public activate(): void {
        if (this.isActive) return;

        this.isActive = true;
        this.startTime = Date.now();
        this.scene.add(this.line);

        console.log('🧭 Navigation line activated for 60 seconds (1 minute)');
    }

    public update(deltaTime: number): boolean {
        if (!this.isActive) return false;

        const currentTime = Date.now();
        const elapsed = currentTime - this.startTime;

        // Check if duration has expired
        if (elapsed >= this.duration) {
            this.deactivate();
            return false;
        }

        // Animate the line with pulsing effect
        const time = currentTime * 0.001;
        const pulseIntensity = 0.5 + Math.sin(time * this.animationSpeed) * 0.3;

        const material = this.line.material as THREE.LineBasicMaterial;
        material.opacity = pulseIntensity;

        // Add color shifting for extra visibility
        const hue = (time * 0.5) % 1;
        material.color.setHSL(hue, 1.0, 0.5);

        return true; // Still active
    }

    public deactivate(): void {
        if (!this.isActive) return;

        this.isActive = false;
        this.scene.remove(this.line);

        console.log('🧭 Navigation line deactivated');
    }

    public isLineActive(): boolean {
        return this.isActive;
    }

    public getRemainingTime(): number {
        if (!this.isActive) return 0;

        const elapsed = Date.now() - this.startTime;
        return Math.max(0, this.duration - elapsed) / 1000; // Return seconds
    }

    public dispose(): void {
        this.deactivate();
        this.line.geometry.dispose();
        (this.line.material as THREE.Material).dispose();
    }
}
