// Dynamic import for Rapier to avoid WASM issues
import { createWorld, IWorld } from 'bitecs';
import * as THREE from 'three';
import { ECSWorld } from './ECSWorld';
import { InputManager } from './InputManager';
import { MazeGenerator } from './MazeGenerator';
import { PhysicsWorld } from './PhysicsWorld';
import { PlayerController } from './PlayerController';
import { Renderer } from './Renderer';

export class Game {
    private renderer!: Renderer;
    private inputManager!: InputManager;
    private physicsWorld!: PhysicsWorld;
    private ecsWorld!: ECSWorld;
    private playerController!: PlayerController;
    private mazeGenerator!: MazeGenerator;
    private world!: IWorld;

    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;

    private isRunning = false;
    private lastTime = 0;

    constructor() {
        console.log('🎮 Game instance created');
    }

    async initialize(): Promise<void> {
        console.log('🔧 Initializing game systems...');

        // Initialize Rapier physics with dynamic import
        const RAPIER = await import('@dimforge/rapier3d');
        if ('init' in RAPIER && typeof RAPIER.init === 'function') {
            await RAPIER.init();
        }
        console.log('⚡ Rapier physics initialized');

        // Create ECS world
        this.world = createWorld();
        console.log('🌍 ECS world created');

        // Initialize core systems
        this.renderer = new Renderer();
        this.inputManager = new InputManager();
        this.physicsWorld = new PhysicsWorld();
        await this.physicsWorld.initialize();
        this.ecsWorld = new ECSWorld(this.world);

        // Create Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect
            0.1, // Near
            1000 // Far
        );

        // Generate maze
        this.mazeGenerator = new MazeGenerator(30, 30); // 30x30 maze
        this.mazeGenerator.generateMaze();

        // Initialize player controller at random spawn position
        this.playerController = new PlayerController(this.camera, this.inputManager, this.scene, this.mazeGenerator);
        const spawnPosition = this.mazeGenerator.getRandomSpawnPosition();
        this.camera.position.copy(spawnPosition);

        // Add direction arrow to scene
        this.scene.add(this.playerController.getDirectionArrow());

        // Initialize renderer with scene and camera
        await this.renderer.initialize(this.scene, this.camera);

        // Create maze scene
        this.createMazeScene();

        // Setup event listeners
        this.setupEventListeners();

        console.log('✅ Game initialization complete');
    }

    private createMazeScene(): void {
        // Add minimal ambient lighting (very dark environment)
        const ambientLight = new THREE.AmbientLight(0x202020, 0.1);
        this.scene.add(ambientLight);

        // Create the maze geometry with walls and roof
        this.mazeGenerator.createThreeJSMaze(this.scene);

        // Add artificial lighting throughout the maze
        this.mazeGenerator.addArtificialLighting(this.scene);

        console.log('🏗️ Enclosed maze scene created with artificial lighting');
    }

    private setupEventListeners(): void {
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Handle pointer lock
        document.addEventListener('click', () => {
            if (!this.inputManager.isPointerLocked()) {
                this.inputManager.requestPointerLock();
            }
        });
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.onWindowResize();
    }

    start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop);

        console.log('🚀 Game loop started');
    }

    stop(): void {
        this.isRunning = false;
        console.log('⏹️ Game stopped');
    }

    private gameLoop = (currentTime: number): void => {
        if (!this.isRunning) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update systems
        this.update(deltaTime);

        // Render
        this.render();

        // Continue loop
        requestAnimationFrame(this.gameLoop);
    };

    private update(deltaTime: number): void {
        // Update input
        this.inputManager.update();

        // Update player controller (handles camera and movement)
        this.playerController.update(deltaTime);

        // Update physics
        this.physicsWorld.update(deltaTime);

        // Update ECS systems
        this.ecsWorld.update(deltaTime);

        // Update HUD
        this.updateHUD();
    }

    private updateHUD(): void {
        const fpsElement = document.getElementById('fps');
        const positionElement = document.getElementById('position');

        if (fpsElement) {
            // Simple FPS calculation (update every second)
            fpsElement.textContent = '60'; // Placeholder - could add real FPS counter
        }

        if (positionElement) {
            const pos = this.playerController.getPosition();
            const flashlight = this.playerController.getFlashlight();
            const flashlightStatus = flashlight ?
                (flashlight.isFlashlightOn() ?
                    `🔦 ON (${flashlight.getCurrentLevel()}-${flashlight.getCurrentConfig().name})` :
                    `🔦 OFF (${flashlight.getCurrentLevel()}-${flashlight.getCurrentConfig().name})`) :
                '';
            positionElement.textContent = `${pos.x.toFixed(1)},${pos.y.toFixed(1)},${pos.z.toFixed(1)} ${flashlightStatus}`;
        }
    }

    private render(): void {
        this.renderer.render();
    }
}
