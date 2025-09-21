// Dynamic import for Rapier to avoid WASM issues
import { createWorld, IWorld } from 'bitecs';
import * as THREE from 'three';
import { AudioManager } from './AudioManager';
import { DebugManager } from './DebugManager';
import { ECSWorld } from './ECSWorld';
import { InputManager } from './InputManager';
import { LootboxManager } from './LootboxManager';
import { MazeGenerator } from './MazeGenerator';
import { PhysicsWorld } from './PhysicsWorld';
import { PlayerController } from './PlayerController';
import { PowerManager } from './PowerManager';
import { Renderer } from './Renderer';

export class Game {
    private renderer!: Renderer;
    private inputManager!: InputManager;
    private physicsWorld!: PhysicsWorld;
    private ecsWorld!: ECSWorld;
    private playerController!: PlayerController;
    private mazeGenerator!: MazeGenerator;
    private lootboxManager!: LootboxManager;
    private powerManager!: PowerManager;
    private audioManager!: AudioManager;
    private debugManager!: DebugManager;
    private world!: IWorld;

    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;

    private isRunning = false;
    private lastTime = 0;
    private gameOver = false;

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

        // PHASE 1: Initialize core systems and services
        this.renderer = new Renderer();
        this.inputManager = new InputManager();
        this.physicsWorld = new PhysicsWorld();
        await this.physicsWorld.initialize();
        this.ecsWorld = new ECSWorld(this.world);

        // Initialize audio manager
        this.audioManager = new AudioManager();
        await this.audioManager.initialize();

        // Initialize power manager EARLY (before components that depend on it)
        this.powerManager = new PowerManager(6000); // Start with 6000 power units (much larger battery)
        console.log('⚡ PowerManager initialized early in initialization sequence');

        // PHASE 2: Create Three.js scene and camera
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect
            0.1, // Near
            1000 // Far
        );

        // PHASE 3: Generate maze
        this.mazeGenerator = new MazeGenerator(30, 30); // 30x30 maze
        this.mazeGenerator.generateMaze();

        // PHASE 4: Initialize player controller
        this.playerController = new PlayerController(this.camera, this.inputManager, this.scene, this.mazeGenerator);
        const spawnPosition = this.mazeGenerator.getRandomSpawnPosition();
        this.camera.position.copy(spawnPosition);

        // PHASE 5: Register flashlight with power manager (defensive programming)
        const flashlight = this.playerController.getFlashlight();
        if (flashlight && this.powerManager) {
            try {
                const spotlight = flashlight.getSpotlight();
                this.powerManager.registerLight('flashlight', spotlight, 'flashlight', 1); // Lowest priority

                // Set initial flashlight consumption based on current level AND on/off state
                const initialConsumptionLevel = flashlight.isFlashlightOn() ? flashlight.getCurrentLevel() : 0;
                this.powerManager.updateFlashlightConsumption('flashlight', initialConsumptionLevel);

                // Set up callback for when flashlight level changes
                flashlight.setLevelChangeCallback((level: number) => {
                    this.powerManager.updateFlashlightConsumption('flashlight', level);
                });

                // Set audio manager for flashlight sound effects
                flashlight.setAudioManager(this.audioManager);

                console.log(`🔦 Flashlight registered with PowerManager - Initial state: ${flashlight.isFlashlightOn() ? 'ON' : 'OFF'}, consumption level: ${initialConsumptionLevel}`);
            } catch (error) {
                console.warn('⚠️ Failed to register flashlight with PowerManager:', error);
            }
        } else {
            console.warn('⚠️ Flashlight or PowerManager not available for registration');
        }

        // PHASE 6: Finalize maze setup
        this.mazeGenerator.selectExitPoint();

        // PHASE 7: Initialize dependent services
        this.lootboxManager = new LootboxManager(this.scene, this.mazeGenerator, this.powerManager, this.audioManager);
        this.lootboxManager.spawnLootboxes();

        // Initialize debug manager
        this.debugManager = new DebugManager(this.scene, this.camera, this.mazeGenerator, this.lootboxManager);

        // Add direction arrow to scene
        this.scene.add(this.playerController.getDirectionArrow());

        // Initialize renderer with scene and camera
        await this.renderer.initialize(this.scene, this.camera);

        // Create maze scene
        this.createMazeScene();

        // Setup event listeners
        this.setupEventListeners();

        // Start ambient audio
        this.audioManager.playGameStartAmbient();

        console.log('✅ Game initialization complete');
    }

    private createMazeScene(): void {
        // Add minimal ambient lighting (very dark environment) - not power managed
        const ambientLight = new THREE.AmbientLight(0x202020, 0.1);
        this.scene.add(ambientLight);

        // Create the maze geometry with walls and roof
        this.mazeGenerator.createThreeJSMaze(this.scene);

        // Add artificial lighting throughout the maze - not power managed
        const mazeLight = this.mazeGenerator.addArtificialLighting(this.scene);

        // Add start (blue) and exit (red) lights - not power managed
        const specialLights = this.mazeGenerator.addStartAndExitLights(this.scene);

        console.log('🏗️ Enclosed maze scene created - only flashlight is power-managed');
    }


    private setupEventListeners(): void {
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Handle pointer lock (but not in debug mode)
        document.addEventListener('click', () => {
            if (!this.debugManager.isInDebugMode() && !this.inputManager.isPointerLocked()) {
                this.inputManager.requestPointerLock();
            }
        });

        // Handle debug mode toggle (Backquote/Tilde key)
        window.addEventListener('keydown', (event) => {
            if (event.code === 'Backquote') { // ` key
                event.preventDefault();
                this.debugManager.toggleDebugMode();
            }

            // Handle debug zoom controls when in debug mode
            if (this.debugManager.isInDebugMode()) {
                if (event.code === 'Equal' || event.code === 'NumpadAdd') { // + key
                    event.preventDefault();
                    this.debugManager.handleZoom(-1); // Zoom in (negative = closer)
                } else if (event.code === 'Minus' || event.code === 'NumpadSubtract') { // - key
                    event.preventDefault();
                    this.debugManager.handleZoom(1); // Zoom out (positive = further)
                }
            }
        });

        // Handle mouse wheel for debug zoom
        window.addEventListener('wheel', (event) => {
            if (this.debugManager.isInDebugMode()) {
                event.preventDefault();
                const delta = event.deltaY > 0 ? 1 : -1;
                this.debugManager.handleZoom(delta);
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
        if (this.gameOver) return;

        // Update input (but disable movement processing in debug mode)
        this.inputManager.update();

        // Update player controller (handles camera and movement) - skip in debug mode
        if (!this.debugManager.isInDebugMode()) {
            this.playerController.update(deltaTime);
        }

        // Update lootboxes
        this.lootboxManager.update(deltaTime);

        // Update power manager (handles light consumption and effects)
        this.powerManager.update(deltaTime);

        // Update audio based on power state
        this.updateAudioBasedOnPower();

        // Update debug camera (ensures it stays locked in position)
        this.debugManager.updateDebugCamera();

        // Check lootbox collisions
        this.checkLootboxCollisions();

        // Check for game over condition (player reached exit)
        this.checkGameOver();

        // Update physics (skip in debug mode to prevent falling)
        if (!this.debugManager.isInDebugMode()) {
            this.physicsWorld.update(deltaTime);
        }

        // Update ECS systems
        this.ecsWorld.update(deltaTime);

        // Update HUD
        this.updateHUD();
    }

    private updateAudioBasedOnPower(): void {
        const powerPercentage = this.powerManager.getPowerPercentage();

        // Switch to low power audio when power is critically low
        if (powerPercentage <= 20) {
            if (this.audioManager.getCurrentAmbient() !== 'thriller-pad') {
                this.audioManager.playLowPowerAmbient();
                this.audioManager.playLowPowerWarningSFX();
            }
        } else if (powerPercentage > 30 && this.audioManager.getCurrentAmbient() !== 'horror-background') {
            this.audioManager.playNormalAmbient();
        }
    }

    private checkLootboxCollisions(): void {
        const playerPosition = this.playerController.getPosition();
        const pointsGained = this.lootboxManager.checkCollisions(playerPosition);

        if (pointsGained > 0) {
            // Play collection sound effect (will be implemented when we add SFX)
            console.log(`💰 Gained ${pointsGained} points!`);
        }
    }

    private checkGameOver(): void {
        const playerPosition = this.playerController.getPosition();
        if (this.mazeGenerator.checkPlayerAtExit(playerPosition)) {
            this.gameOver = true;
            this.audioManager.playGameOverAmbient();
            this.showGameOverScreen();
        }
    }

    private showGameOverScreen(): void {
        // Create game over overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.color = 'white';
        overlay.style.fontSize = '2rem';
        overlay.style.fontFamily = 'Arial, sans-serif';
        overlay.style.zIndex = '1000';
        overlay.style.cursor = 'pointer';

        const title = document.createElement('h1');
        title.textContent = '🎉 MAZE COMPLETED! 🎉';
        title.style.color = '#00ff88';
        title.style.marginBottom = '20px';
        title.style.textAlign = 'center';

        const stats = this.lootboxManager.getCollectionStats();
        const scoreText = document.createElement('p');
        scoreText.textContent = `Final Score: ${stats.points} points`;
        scoreText.style.color = '#ffdd44';
        scoreText.style.fontSize = '1.5rem';
        scoreText.style.marginBottom = '10px';

        const lootboxText = document.createElement('p');
        lootboxText.textContent = `Lootboxes Collected: ${stats.collected}/${stats.total}`;
        lootboxText.style.color = '#aaaaaa';
        lootboxText.style.fontSize = '1.1rem';
        lootboxText.style.marginBottom = '20px';

        const instruction = document.createElement('p');
        instruction.textContent = 'Click to restart';
        instruction.style.color = '#ffffff';
        instruction.style.fontSize = '1.2rem';

        overlay.appendChild(title);
        overlay.appendChild(scoreText);
        overlay.appendChild(lootboxText);
        overlay.appendChild(instruction);

        // Add click handler to restart game
        overlay.addEventListener('click', () => {
            document.body.removeChild(overlay);
            this.restartGame();
        });

        document.body.appendChild(overlay);

        // Release pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        console.log('🎉 Game Over - Player reached the exit!');
    }

    private restartGame(): void {
        // Reset game state
        this.gameOver = false;

        // Reset power manager
        this.powerManager.reset(6000);
        this.powerManager.clearAllConsumers();

        // Reset lootbox manager
        this.lootboxManager.reset();

        // Regenerate maze
        this.mazeGenerator.generateMaze();

        // Get new spawn position and move player
        const spawnPosition = this.mazeGenerator.getRandomSpawnPosition();
        this.camera.position.copy(spawnPosition);

        // Select new exit point
        this.mazeGenerator.selectExitPoint();

        // Spawn new lootboxes
        this.lootboxManager.spawnLootboxes();

        // Clear and recreate scene
        this.scene.clear();
        this.createMazeScene();

        // Re-add direction arrow
        this.scene.add(this.playerController.getDirectionArrow());

        // Reinitialize debug manager with new maze and lootboxes
        this.debugManager = new DebugManager(this.scene, this.camera, this.mazeGenerator, this.lootboxManager);

        // Restart ambient audio
        this.audioManager.playGameStartAmbient();

        console.log('🔄 Game restarted with new maze, lootboxes, and full power');
    }

    private updateHUD(): void {
        const fpsElement = document.getElementById('fps');
        const positionElement = document.getElementById('position');

        if (fpsElement) {
            // Display lootbox and power stats
            const lootboxStats = this.lootboxManager.getCollectionStats();
            const powerStats = this.powerManager.getPowerStats();
            const powerPercentage = this.powerManager.getPowerPercentage();

            // Choose power icon based on power level
            let powerIcon = '🔋';
            if (powerPercentage <= 20) powerIcon = '🪫';
            else if (powerPercentage <= 40) powerIcon = '🔋';
            else powerIcon = '🔋';

            fpsElement.textContent = `📦 ${lootboxStats.collected}/${lootboxStats.total} | 💰 ${lootboxStats.points} pts | ${powerIcon} ${powerStats.currentPower.toFixed(0)}/${powerStats.maxPower}`;
        }

        if (positionElement) {
            const pos = this.playerController.getPosition();
            const flashlight = this.playerController.getFlashlight();
            const powerStats = this.powerManager.getPowerStats();

            const flashlightStatus = flashlight ?
                (flashlight.isFlashlightOn() ?
                    `🔦 ON (${flashlight.getCurrentLevel()}-${flashlight.getCurrentConfig().name})` :
                    `🔦 OFF (${flashlight.getCurrentLevel()}-${flashlight.getCurrentConfig().name})`) :
                '';

            // Add power status - show different info based on consumption
            let powerStatus = '';
            if (powerStats.consumptionRate === 0) {
                powerStatus = ` | 🔋 STANDBY (No drain)`;
            } else if (powerStats.timeRemaining === Infinity) {
                powerStatus = ` | 🔋 INFINITE`;
            } else {
                powerStatus = ` | ⏱️ ${Math.floor(powerStats.timeRemaining / 60)}:${(powerStats.timeRemaining % 60).toFixed(0).padStart(2, '0')} | -${powerStats.consumptionRate.toFixed(1)}/s`;
            }

            positionElement.textContent = `${pos.x.toFixed(1)},${pos.y.toFixed(1)},${pos.z.toFixed(1)} ${flashlightStatus}${powerStatus}`;
        }

        // Update debug info
        const debugElement = document.getElementById('debug');
        if (debugElement) {
            if (this.debugManager.isInDebugMode()) {
                const debugInfo = this.debugManager.getDebugInfo();
                debugElement.textContent = `🐛 DEBUG | Zoom: Wheel/+- | Tilt: Right-drag | Click: Info | Markers: ${debugInfo.debugMarkers} | \` to exit`;
            } else {
                debugElement.textContent = 'Press \` for Debug Mode';
            }
        }
    }

    private render(): void {
        this.renderer.render();
    }
}
