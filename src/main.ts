import { Camera } from './camera';
import { createCube, createPlane, meshToFloat32Array } from './geometry';
import { initializeGPU } from './gpu';
import { InputManager } from './input';
import { mat4 } from './math/mat4';
import { Renderer, RenderObject } from './renderer';

class Game {
    private gpu!: Awaited<ReturnType<typeof initializeGPU>>;
    private renderer!: Renderer;
    private camera: Camera;
    private input: InputManager;
    private renderObjects: RenderObject[] = [];
    private lastTime = 0;
    private frameCount = 0;
    private fpsAccumulator = 0;

    constructor() {
        // Reset camera to a clear viewpoint of the origin
        this.camera = new Camera([0, 4, 10], -Math.PI / 2, -0.3);
        this.input = new InputManager();
    }

    async initialize() {
        try {
            console.log('Initializing WebGPU...');
            this.gpu = await initializeGPU();
            console.log('WebGPU initialized, canvas size:', this.gpu.canvas.width, 'x', this.gpu.canvas.height);

            this.renderer = new Renderer(this.gpu);
            console.log('Renderer created');

            this.setupEventListeners();
            this.setupUI();
            this.createScene();
            console.log('Scene created with', this.renderObjects.length, 'objects');
            console.log('Game initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError('WebGPU not supported or failed to initialize');
            return false;
        }
        return true;
    }

    private setupEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }

    private setupUI() {
        // Create overlay for pointer lock instructions
        const overlay = document.createElement('div');
        overlay.id = 'overlay';
        overlay.style.cssText = `
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      background: rgba(0,0,0,0.3);
    `;

        const hint = document.createElement('div');
        hint.style.cssText = `
      background: rgba(0, 0, 0, 0.7);
      padding: 12px 16px;
      border-radius: 10px;
      color: white;
      font-family: system-ui;
      pointer-events: auto;
      cursor: crosshair;
    `;
        hint.textContent = 'Click to lock pointer • WASD: move • Mouse: look • Space: jump';

        overlay.appendChild(hint);
        document.body.appendChild(overlay);

        // Stats display
        const stats = document.createElement('div');
        stats.id = 'stats';
        stats.style.cssText = `
      position: fixed;
      left: 10px;
      top: 10px;
      background: rgba(0, 0, 0, 0.7);
      padding: 6px 10px;
      border-radius: 8px;
      color: white;
      font-family: system-ui;
      font-size: 12px;
    `;
        stats.innerHTML = 'FPS: <span id="fps">0</span> • Pos: <span id="pos">0,0,0</span>';
        document.body.appendChild(stats);

        // Handle pointer lock
        this.gpu.canvas.addEventListener('click', () => {
            this.input.requestPointerLock(this.gpu.canvas);
        });

        document.addEventListener('pointerlockchange', () => {
            const locked = document.pointerLockElement === this.gpu.canvas;
            overlay.style.display = locked ? 'none' : 'flex';
        });
    }

    private handleResize() {
        if (!this.gpu || !this.renderer) return;

        const canvas = this.gpu.canvas;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';

        this.renderer.updateDepthTexture(canvas.width, canvas.height);
    }

    private createScene() {
        // A large ground plane
        const groundMesh = createPlane(100, 100, [0.2, 0.2, 0.25]);
        const groundData = meshToFloat32Array(groundMesh);
        const groundBuffer = this.renderer.createVertexBuffer(groundData);
        const groundModel = mat4.identity(); // Place at origin

        this.renderObjects.push({
            vertexBuffer: groundBuffer,
            vertexCount: groundData.length / 9,
            modelMatrix: groundModel,
        });

        // A single cube in the middle
        const cubeMesh = createCube([0.8, 0.1, 0.3]);
        const cubeData = meshToFloat32Array(cubeMesh);
        const cubeBuffer = this.renderer.createVertexBuffer(cubeData);
        // Position it slightly above the ground plane
        const cubeModel = mat4.translate(mat4.identity(), [0, 1, 0]);

        this.renderObjects.push({
            vertexBuffer: cubeBuffer,
            vertexCount: cubeData.length / 9,
            modelMatrix: cubeModel,
        });

        console.log('Created simple scene with a plane and a cube.');
    }

    private update(deltaTime: number) {
        // Update camera based on input
        this.camera.update(this.input, deltaTime);

        // Update UI
        this.updateStats();
    }

    private updateStats() {
        const fpsEl = document.getElementById('fps');
        const posEl = document.getElementById('pos');

        if (fpsEl && this.fpsAccumulator >= 0.5) {
            const fps = Math.round(this.frameCount / this.fpsAccumulator);
            fpsEl.textContent = fps.toString();
            this.frameCount = 0;
            this.fpsAccumulator = 0;
        }

        if (posEl) {
            const pos = this.camera.position;
            posEl.textContent = `${pos[0].toFixed(1)},${pos[1].toFixed(1)},${pos[2].toFixed(1)}`;
        }
    }

    private render() {
        if (!this.gpu || !this.renderer) return;

        const canvas = this.gpu.canvas;
        const aspect = canvas.width / canvas.height;
        const viewProjectionMatrix = this.camera.getViewProjectionMatrix(aspect);

        try {
            this.renderer.render(viewProjectionMatrix, this.renderObjects);
        } catch (error) {
            console.error('Render error:', error);
        }
    }

    private gameLoop = (timestamp: number) => {
        const deltaTime = Math.min(0.033, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.render();

        this.frameCount++;
        this.fpsAccumulator += deltaTime;

        requestAnimationFrame(this.gameLoop);
    };

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop);
    }

    private showError(message: string) {
        document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: #1e2633;
        color: #cde3ff;
        font-family: system-ui;
        font-size: 20px;
        text-align: center;
      ">
        ${message}
      </div>
    `;
    }
}

// Initialize and start the game
const game = new Game();
game.initialize().then(success => {
    if (success) {
        game.start();
    }
});
