import * as THREE from 'three';
import { Lootbox, LootboxData } from './Lootbox';
import { MazeGenerator } from './MazeGenerator';

export class LootboxManager {
    private lootboxes: Map<string, Lootbox> = new Map();
    private scene: THREE.Scene;
    private mazeGenerator: MazeGenerator;
    private totalPoints: number = 0;
    private collectedCount: number = 0;

    // Lootbox spawn parameters
    private readonly maxLootboxes = 15;
    private readonly minLootboxes = 8;
    private readonly rarityWeights = {
        common: 0.5,    // 50% chance
        rare: 0.3,      // 30% chance  
        epic: 0.15,     // 15% chance
        legendary: 0.05 // 5% chance
    };

    constructor(scene: THREE.Scene, mazeGenerator: MazeGenerator) {
        this.scene = scene;
        this.mazeGenerator = mazeGenerator;
    }

    public spawnLootboxes(): void {
        this.clearAllLootboxes();

        const lootboxCount = Math.floor(Math.random() * (this.maxLootboxes - this.minLootboxes + 1)) + this.minLootboxes;
        const spawnPositions = this.generateSpawnPositions(lootboxCount);

        console.log(`📦 Spawning ${lootboxCount} lootboxes in the maze`);

        for (let i = 0; i < lootboxCount; i++) {
            const position = spawnPositions[i];
            const rarity = this.selectRarity();
            const pointValue = this.getPointValueForRarity(rarity);

            const lootboxData: LootboxData = {
                id: `lootbox_${Date.now()}_${i}`,
                position: position.clone(),
                pointValue,
                rarity,
                collected: false
            };

            const lootbox = new Lootbox(lootboxData);
            this.lootboxes.set(lootboxData.id, lootbox);

            // Add to scene
            this.scene.add(lootbox.getMesh());
            this.scene.add(lootbox.getLight());

            const particles = lootbox.getParticles();
            if (particles) {
                this.scene.add(particles);
            }
        }

        console.log(`✨ Spawned ${this.lootboxes.size} lootboxes with rarities: ${this.getRarityBreakdown()}`);
    }

    private generateSpawnPositions(count: number): THREE.Vector3[] {
        const positions: THREE.Vector3[] = [];
        const cells = this.mazeGenerator.getCells();
        const dimensions = this.mazeGenerator.getDimensions();
        const spawnPosition = this.mazeGenerator.getSpawnPosition();
        const exitPosition = this.mazeGenerator.getExitPosition();

        // Collect all valid spawn locations (rooms and corridors)
        const validCells: { x: number, z: number }[] = [];

        for (let x = 0; x < dimensions.width; x++) {
            for (let z = 0; z < dimensions.height; z++) {
                if (cells[x][z].type === 'room' || cells[x][z].type === 'floor') {
                    validCells.push({ x, z });
                }
            }
        }

        // Shuffle valid cells for random distribution
        for (let i = validCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validCells[i], validCells[j]] = [validCells[j], validCells[i]];
        }

        // Select positions, avoiding spawn and exit areas
        for (const cell of validCells) {
            if (positions.length >= count) break;

            const worldX = (cell.x - dimensions.width / 2) * dimensions.cellSize;
            const worldZ = (cell.z - dimensions.height / 2) * dimensions.cellSize;
            const candidatePosition = new THREE.Vector3(worldX, 1.0, worldZ);

            // Check distance from spawn and exit
            const minDistanceFromSpawn = 3.0;
            const minDistanceFromExit = 3.0;
            const minDistanceBetweenLootboxes = 2.0;

            let validPosition = true;

            // Check distance from spawn
            if (spawnPosition && candidatePosition.distanceTo(spawnPosition) < minDistanceFromSpawn) {
                validPosition = false;
            }

            // Check distance from exit
            if (exitPosition && candidatePosition.distanceTo(exitPosition) < minDistanceFromExit) {
                validPosition = false;
            }

            // Check distance from other lootboxes
            for (const existingPos of positions) {
                if (candidatePosition.distanceTo(existingPos) < minDistanceBetweenLootboxes) {
                    validPosition = false;
                    break;
                }
            }

            if (validPosition) {
                positions.push(candidatePosition);
            }
        }

        return positions;
    }

    private selectRarity(): 'common' | 'rare' | 'epic' | 'legendary' {
        const rand = Math.random();
        let cumulative = 0;

        for (const [rarity, weight] of Object.entries(this.rarityWeights)) {
            cumulative += weight;
            if (rand <= cumulative) {
                return rarity as 'common' | 'rare' | 'epic' | 'legendary';
            }
        }

        return 'common'; // Fallback
    }

    private getPointValueForRarity(rarity: 'common' | 'rare' | 'epic' | 'legendary'): number {
        switch (rarity) {
            case 'common': return 10;
            case 'rare': return 25;
            case 'epic': return 50;
            case 'legendary': return 100;
            default: return 10;
        }
    }

    private getRarityBreakdown(): string {
        const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };

        for (const lootbox of this.lootboxes.values()) {
            counts[lootbox.getData().rarity]++;
        }

        return `Common: ${counts.common}, Rare: ${counts.rare}, Epic: ${counts.epic}, Legendary: ${counts.legendary}`;
    }

    public update(deltaTime: number): void {
        for (const lootbox of this.lootboxes.values()) {
            lootbox.update(deltaTime);
        }
    }

    public checkCollisions(playerPosition: THREE.Vector3): number {
        let pointsGained = 0;

        for (const lootbox of this.lootboxes.values()) {
            if (!lootbox.isCollected() && lootbox.checkCollision(playerPosition, 1.2)) {
                const points = lootbox.collect();
                pointsGained += points;
                this.totalPoints += points;
                this.collectedCount++;

                // Create collection effect
                this.createCollectionEffect(lootbox.getMesh().position.clone());
            }
        }

        return pointsGained;
    }

    private createCollectionEffect(position: THREE.Vector3): void {
        // Create a burst particle effect at collection point
        const particleCount = 30;
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            // Random positions around collection point
            positions[i * 3] = position.x + (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.5;

            // Random velocities for explosion effect
            velocities[i * 3] = (Math.random() - 0.5) * 4;
            velocities[i * 3 + 1] = Math.random() * 3 + 1;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 4;
        }

        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            color: 0xffff00,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particles);

        // Animate and remove particles after a short time
        const startTime = Date.now();
        const duration = 1000; // 1 second

        const animateParticles = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1.0) {
                this.scene.remove(particles);
                particleGeometry.dispose();
                particleMaterial.dispose();
                return;
            }

            // Update particle positions
            const positions = particleGeometry.attributes.position.array as Float32Array;
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] += velocities[i * 3] * 0.016; // Assume ~60fps
                positions[i * 3 + 1] += velocities[i * 3 + 1] * 0.016 - 9.8 * 0.016 * progress; // Gravity
                positions[i * 3 + 2] += velocities[i * 3 + 2] * 0.016;
            }
            particleGeometry.attributes.position.needsUpdate = true;

            // Fade out
            particleMaterial.opacity = 1.0 - progress;

            requestAnimationFrame(animateParticles);
        };

        requestAnimationFrame(animateParticles);
    }

    public getTotalPoints(): number {
        return this.totalPoints;
    }

    public getCollectedCount(): number {
        return this.collectedCount;
    }

    public getTotalLootboxCount(): number {
        return this.lootboxes.size;
    }

    public getRemainingCount(): number {
        return this.lootboxes.size - this.collectedCount;
    }

    public getCollectionStats(): { collected: number, total: number, points: number } {
        return {
            collected: this.collectedCount,
            total: this.lootboxes.size,
            points: this.totalPoints
        };
    }

    public clearAllLootboxes(): void {
        // Remove from scene and dispose resources
        for (const lootbox of this.lootboxes.values()) {
            this.scene.remove(lootbox.getMesh());
            this.scene.remove(lootbox.getLight());

            const particles = lootbox.getParticles();
            if (particles) {
                this.scene.remove(particles);
            }

            lootbox.dispose();
        }

        this.lootboxes.clear();
        this.totalPoints = 0;
        this.collectedCount = 0;
    }

    public reset(): void {
        this.clearAllLootboxes();
        console.log('🔄 Lootbox manager reset');
    }
}
