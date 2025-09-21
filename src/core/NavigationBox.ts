import * as THREE from 'three';

export interface NavigationBoxData {
    id: string;
    position: THREE.Vector3;
    collected: boolean;
}

export class NavigationBox {
    private mesh: THREE.Group;
    private data: NavigationBoxData;
    private originalY: number;
    private rotationSpeed: number;
    private bobSpeed: number;
    private bobAmplitude: number;
    private glowLight: THREE.PointLight;
    private particles: THREE.Points | null = null;

    constructor(data: NavigationBoxData) {
        this.data = data;
        this.originalY = data.position.y;
        this.rotationSpeed = 0.3 + Math.random() * 0.3; // Slower rotation than regular lootboxes
        this.bobSpeed = 1.5 + Math.random() * 0.5; // Slower bobbing
        this.bobAmplitude = 0.15 + Math.random() * 0.1;

        this.mesh = this.createMesh();
        this.glowLight = this.createGlowLight();
        this.createParticleEffect();

        this.mesh.position.copy(data.position);
    }

    private createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Create a distinctive diamond/octahedron shape instead of a cube
        const geometry = new THREE.OctahedronGeometry(0.5, 0);
        const material = new THREE.MeshLambertMaterial({
            color: 0x00ffff, // Cyan color to distinguish from regular lootboxes
            transparent: true,
            opacity: 0.9,
            emissive: 0x004444
        });

        const diamond = new THREE.Mesh(geometry, material);
        group.add(diamond);

        // Add a glowing wireframe for extra visibility
        const wireframeGeometry = new THREE.OctahedronGeometry(0.55, 0);
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });
        const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
        group.add(wireframe);

        // Add rotating rings around the diamond
        const ringGeometry = new THREE.RingGeometry(0.7, 0.75, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });

        const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring1.rotation.x = Math.PI / 2;
        group.add(ring1);

        const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring2.rotation.z = Math.PI / 2;
        group.add(ring2);

        return group;
    }

    private createGlowLight(): THREE.PointLight {
        const light = new THREE.PointLight(0x00ffff, 0.8, 10);
        light.position.copy(this.data.position);
        return light;
    }

    private createParticleEffect(): void {
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            // Create particles in a sphere around the navigation box
            const radius = 1.5 + Math.random() * 0.5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;

            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.cos(phi);
            positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

            // Cyan particles
            colors[i3] = 0.0;     // R
            colors[i3 + 1] = 1.0; // G  
            colors[i3 + 2] = 1.0; // B
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.particles.position.copy(this.data.position);
    }

    public update(deltaTime: number): void {
        if (this.data.collected) return;

        const time = Date.now() * 0.001;

        // Rotate the main mesh
        this.mesh.rotation.y += this.rotationSpeed * deltaTime;
        this.mesh.rotation.x += this.rotationSpeed * 0.5 * deltaTime;

        // Bob up and down
        const bobOffset = Math.sin(time * this.bobSpeed) * this.bobAmplitude;
        this.mesh.position.y = this.originalY + bobOffset;

        // Update particles rotation
        if (this.particles) {
            this.particles.rotation.y += deltaTime * 0.5;
            this.particles.rotation.x += deltaTime * 0.3;
        }

        // Pulse the glow light
        const pulseIntensity = 0.8 + Math.sin(time * 3) * 0.3;
        this.glowLight.intensity = pulseIntensity;
    }

    public checkCollision(playerPosition: THREE.Vector3, collectionRadius: number = 2.0): boolean {
        if (this.data.collected) return false;

        const distance = this.mesh.position.distanceTo(playerPosition);
        return distance <= collectionRadius;
    }

    public collect(): boolean {
        if (this.data.collected) return false;

        this.data.collected = true;
        this.mesh.visible = false;
        this.glowLight.intensity = 0;

        if (this.particles) {
            this.particles.visible = false;
        }

        console.log('🧭 Navigation box collected!');
        return true;
    }

    public getMesh(): THREE.Group {
        return this.mesh;
    }

    public getLight(): THREE.PointLight {
        return this.glowLight;
    }

    public getParticles(): THREE.Points | null {
        return this.particles;
    }

    public getData(): NavigationBoxData {
        return { ...this.data };
    }

    public isCollected(): boolean {
        return this.data.collected;
    }
}
