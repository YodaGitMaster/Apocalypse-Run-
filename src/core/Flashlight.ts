import * as THREE from 'three';

export interface FlashlightConfig {
    intensity: number;
    distance: number;
    angle: number;
    penumbra: number;
    color: number;
    name: string;
}

export class Flashlight {
    private spotlight: THREE.SpotLight;
    private camera: THREE.Camera;
    private isOn: boolean = false;
    private currentLevel: number = 3; // Default to smartphone light (now level 3)

    // Flashlight configurations for different levels
    private readonly configs: Record<number, FlashlightConfig> = {
        1: { // Lighter - MUCH stronger
            intensity: 4.0, // Massive boost
            distance: 35, // Much longer range
            angle: Math.PI / 5, // 36 degrees (wider)
            penumbra: 0.7,
            color: 0xffaa44,
            name: "Lighter"
        },
        2: { // Small LED light - MUCH stronger
            intensity: 6.0, // Massive boost
            distance: 50, // Much longer range
            angle: Math.PI / 6, // 30 degrees (wider)
            penumbra: 0.4,
            color: 0xffffff,
            name: "Small LED"
        },
        3: { // Smartphone light - MUCH stronger - DEFAULT
            intensity: 8.0, // Massive boost
            distance: 65, // Much longer range
            angle: Math.PI / 4, // 45 degrees (much wider)
            penumbra: 0.5,
            color: 0xf0f0ff,
            name: "Smartphone"
        },
        4: { // Torch light - MASSIVELY boosted
            intensity: 10.0, // Huge boost from 3.15
            distance: 75, // Massive range boost from 32
            angle: Math.PI / 3, // 60 degrees (very wide)
            penumbra: 0.3, // Sharp edges for focused power
            color: 0xfffff0,
            name: "Torch"
        },
        5: { // Professional torch - EXTREMELY boosted
            intensity: 15.0, // Extreme boost from 4.375
            distance: 100, // Incredible range boost from 44
            angle: Math.PI / 2.5, // 72 degrees (ultra wide)
            penumbra: 0.2, // Very sharp edges for maximum coverage
            color: 0xffffff,
            name: "Professional"
        }
    };

    constructor(camera: THREE.Camera, scene: THREE.Scene) {
        this.camera = camera;

        // Create spotlight
        this.spotlight = new THREE.SpotLight();
        this.updateFlashlightConfig();

        // Position spotlight at camera
        this.spotlight.position.copy(camera.position);
        this.spotlight.target.position.copy(camera.position);
        this.spotlight.target.position.z -= 1; // Point forward

        // Configure shadows
        this.spotlight.castShadow = true;
        this.spotlight.shadow.mapSize.width = 1024;
        this.spotlight.shadow.mapSize.height = 1024;
        this.spotlight.shadow.camera.near = 0.1;
        this.spotlight.shadow.camera.far = this.configs[this.currentLevel].distance;
        this.spotlight.shadow.camera.fov = (this.configs[this.currentLevel].angle * 180) / Math.PI;

        // Add to scene (but turned off initially)
        this.spotlight.visible = false;
        scene.add(this.spotlight);
        scene.add(this.spotlight.target);

        console.log(`🔦 Flashlight created - Level ${this.currentLevel} (${this.configs[this.currentLevel].name})`);
    }

    private updateFlashlightConfig(): void {
        const config = this.configs[this.currentLevel];

        this.spotlight.intensity = config.intensity;
        this.spotlight.distance = config.distance;
        this.spotlight.angle = config.angle;
        this.spotlight.penumbra = config.penumbra;
        this.spotlight.color.setHex(config.color);

        // Update shadow camera
        if (this.spotlight.shadow) {
            this.spotlight.shadow.camera.far = config.distance;
            this.spotlight.shadow.camera.fov = (config.angle * 180) / Math.PI;
            this.spotlight.shadow.camera.updateProjectionMatrix();
        }
    }

    public toggle(): boolean {
        this.isOn = !this.isOn;
        this.spotlight.visible = this.isOn;

        console.log(`🔦 Flashlight ${this.isOn ? 'ON' : 'OFF'} - Level ${this.currentLevel} (${this.configs[this.currentLevel].name})`);
        return this.isOn;
    }

    public setLevel(level: number): boolean {
        if (level >= 1 && level <= 5) {
            this.currentLevel = level;
            this.updateFlashlightConfig();

            console.log(`🔦 Flashlight level changed to ${level} (${this.configs[level].name})`);
            return true;
        }
        return false;
    }

    public update(cameraPosition: THREE.Vector3, cameraDirection: THREE.Vector3): void {
        if (!this.isOn) return;

        // Update spotlight position to match camera
        this.spotlight.position.copy(cameraPosition);

        // Update target position based on camera direction
        const targetPosition = cameraPosition.clone().add(cameraDirection.normalize());
        this.spotlight.target.position.copy(targetPosition);
        this.spotlight.target.updateMatrixWorld();
    }

    public isFlashlightOn(): boolean {
        return this.isOn;
    }

    public getCurrentLevel(): number {
        return this.currentLevel;
    }

    public getCurrentConfig(): FlashlightConfig {
        return this.configs[this.currentLevel];
    }

    public getAllConfigs(): Record<number, FlashlightConfig> {
        return this.configs;
    }
}
