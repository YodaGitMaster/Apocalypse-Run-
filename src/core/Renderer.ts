import * as THREE from 'three';

export class Renderer {
    private renderer!: THREE.WebGLRenderer;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;

    async initialize(scene: THREE.Scene, camera: THREE.PerspectiveCamera): Promise<void> {
        this.scene = scene;
        this.camera = camera;

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Append to DOM
        const app = document.getElementById('app');
        if (!app) {
            throw new Error('App element not found');
        }
        app.appendChild(this.renderer.domElement);

        console.log('🖥️ Three.js renderer initialized');
    }

    render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize(): void {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    getRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }
}
