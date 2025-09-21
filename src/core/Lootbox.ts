import * as THREE from 'three';

export interface LootboxData {
    id: string;
    position: THREE.Vector3;
    pointValue: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    collected: boolean;
}

export class Lootbox {
    private mesh: THREE.Group;
    private data: LootboxData;
    private originalY: number;
    private rotationSpeed: number;
    private bobSpeed: number;
    private bobAmplitude: number;
    private glowLight: THREE.PointLight;
    private particles: THREE.Points | null = null;

    constructor(data: LootboxData) {
        this.data = data;
        this.originalY = data.position.y;
        this.rotationSpeed = 0.5 + Math.random() * 0.5; // 0.5-1.0 rad/s
        this.bobSpeed = 2.0 + Math.random() * 1.0; // 2.0-3.0 cycles/s
        this.bobAmplitude = 0.2 + Math.random() * 0.1; // 0.2-0.3 units

        this.mesh = this.createMesh();
        this.glowLight = this.createGlowLight();
        this.createParticleEffect();

        this.mesh.position.copy(data.position);
    }

    private createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Get rarity-based properties
        const rarityProps = this.getRarityProperties();

        // Create main box geometry
        const boxGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const boxMaterial = new THREE.MeshLambertMaterial({
            color: rarityProps.color,
            transparent: true,
            opacity: 0.9
        });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        group.add(box);

        // Create inner glow box (slightly smaller, more transparent)
        const glowGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: rarityProps.glowColor,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        const glowBox = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glowBox);

        // Create point value indicator (floating text above)
        this.createPointIndicator(group, rarityProps);

        // Add wireframe outline for better visibility
        const wireframeGeometry = new THREE.EdgesGeometry(boxGeometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({
            color: rarityProps.glowColor,
            transparent: true,
            opacity: 0.8
        });
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        group.add(wireframe);

        return group;
    }

    private getRarityProperties() {
        switch (this.data.rarity) {
            case 'common':
                return {
                    color: 0x888888,
                    glowColor: 0xaaaaaa,
                    pointValue: 10
                };
            case 'rare':
                return {
                    color: 0x4488ff,
                    glowColor: 0x66aaff,
                    pointValue: 25
                };
            case 'epic':
                return {
                    color: 0x8844ff,
                    glowColor: 0xaa66ff,
                    pointValue: 50
                };
            case 'legendary':
                return {
                    color: 0xff8844,
                    glowColor: 0xffaa66,
                    pointValue: 100
                };
            default:
                return {
                    color: 0x888888,
                    glowColor: 0xaaaaaa,
                    pointValue: 10
                };
        }
    }

    private createPointIndicator(group: THREE.Group, rarityProps: any): void {
        // Create a simple geometric indicator instead of text for better performance
        const indicatorGeometry = new THREE.ConeGeometry(0.1, 0.3, 6);
        const indicatorMaterial = new THREE.MeshBasicMaterial({
            color: rarityProps.glowColor,
            transparent: true,
            opacity: 0.8
        });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.set(0, 0.8, 0);
        indicator.rotation.x = Math.PI; // Point downward
        group.add(indicator);

        // Add small gems around the indicator based on rarity
        const gemCount = this.data.rarity === 'common' ? 1 :
            this.data.rarity === 'rare' ? 2 :
                this.data.rarity === 'epic' ? 3 : 4;

        for (let i = 0; i < gemCount; i++) {
            const gemGeometry = new THREE.OctahedronGeometry(0.05);
            const gemMaterial = new THREE.MeshBasicMaterial({
                color: rarityProps.glowColor,
                transparent: true,
                opacity: 0.9
            });
            const gem = new THREE.Mesh(gemGeometry, gemMaterial);

            const angle = (i / gemCount) * Math.PI * 2;
            gem.position.set(
                Math.cos(angle) * 0.15,
                0.6,
                Math.sin(angle) * 0.15
            );
            group.add(gem);
        }
    }

    private createGlowLight(): THREE.PointLight {
        const rarityProps = this.getRarityProperties();
        const light = new THREE.PointLight(rarityProps.glowColor, 0.5, 4);
        light.position.copy(this.data.position);
        return light;
    }

    private createParticleEffect(): void {
        const particleCount = 20;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const rarityProps = this.getRarityProperties();
        const color = new THREE.Color(rarityProps.glowColor);

        for (let i = 0; i < particleCount; i++) {
            // Random positions around the lootbox
            positions[i * 3] = (Math.random() - 0.5) * 2;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

            // Set particle colors
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.particles.position.copy(this.data.position);
    }

    public update(deltaTime: number): void {
        if (this.data.collected) return;

        const time = Date.now() * 0.001;

        // Rotate the lootbox
        this.mesh.rotation.y += this.rotationSpeed * deltaTime;
        this.mesh.rotation.x += this.rotationSpeed * 0.5 * deltaTime;

        // Bob up and down
        const bobOffset = Math.sin(time * this.bobSpeed) * this.bobAmplitude;
        this.mesh.position.y = this.originalY + bobOffset;
        this.glowLight.position.y = this.originalY + bobOffset;

        // Pulse the glow light
        this.glowLight.intensity = 0.3 + Math.sin(time * 3) * 0.2;

        // Animate particles if they exist
        if (this.particles) {
            this.particles.rotation.y += deltaTime * 0.5;
            this.particles.position.copy(this.mesh.position);
        }
    }

    public checkCollision(playerPosition: THREE.Vector3, collectionRadius: number = 1.0): boolean {
        if (this.data.collected) return false;

        const distance = playerPosition.distanceTo(this.mesh.position);
        return distance <= collectionRadius;
    }

    public collect(): number {
        if (this.data.collected) return 0;

        this.data.collected = true;

        // Hide the mesh and light
        this.mesh.visible = false;
        this.glowLight.intensity = 0;
        if (this.particles) {
            this.particles.visible = false;
        }

        console.log(`💰 Collected ${this.data.rarity} lootbox for ${this.data.pointValue} points!`);
        return this.data.pointValue;
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

    public getRarity(): string {
        return this.data.rarity;
    }

    public getData(): LootboxData {
        return { ...this.data };
    }

    public isCollected(): boolean {
        return this.data.collected;
    }

    public dispose(): void {
        // Clean up geometry and materials
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        if (this.particles) {
            this.particles.geometry.dispose();
            (this.particles.material as THREE.PointsMaterial).dispose();
        }
    }
}
