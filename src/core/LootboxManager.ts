import * as THREE from 'three';
import { AudioManager } from './AudioManager';
import { Lootbox, LootboxData } from './Lootbox';
import { MazeCell, MazeGenerator } from './MazeGenerator';
import { NavigationBox, NavigationBoxData } from './NavigationBox';
import { NavigationLine } from './NavigationLine';
import { PowerManager } from './PowerManager';

export class LootboxManager {
    private lootboxes: Map<string, Lootbox> = new Map();
    private navigationBoxes: Map<string, NavigationBox> = new Map();
    private navigationLines: NavigationLine[] = [];
    private scene: THREE.Scene;
    private mazeGenerator: MazeGenerator;
    private powerManager: PowerManager;
    private audioManager: AudioManager;
    private totalPoints: number = 0;
    private collectedCount: number = 0;

    // Lootbox spawn parameters (increased for more collection opportunities)
    private readonly maxLootboxes = 15;
    private readonly minLootboxes = 10;

    // Navigation box parameters
    private readonly maxNavigationBoxes = 3;
    private readonly navigationBoxSpacing = 15.0; // Minimum distance from other boxes
    private readonly rarityWeights = {
        common: 0.5,    // 50% chance
        rare: 0.3,      // 30% chance  
        epic: 0.15,     // 15% chance
        legendary: 0.05 // 5% chance
    };

    constructor(scene: THREE.Scene, mazeGenerator: MazeGenerator, powerManager: PowerManager, audioManager: AudioManager) {
        this.scene = scene;
        this.mazeGenerator = mazeGenerator;
        this.powerManager = powerManager;
        this.audioManager = audioManager;
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

        // Spawn navigation boxes
        this.spawnNavigationBoxes();

        console.log(`✨ Spawned ${this.lootboxes.size} lootboxes and ${this.navigationBoxes.size} navigation boxes with rarities: ${this.getRarityBreakdown()}`);
    }

    private generateSpawnPositions(count: number): THREE.Vector3[] {
        const positions: THREE.Vector3[] = [];
        const cells = this.mazeGenerator.getCells();
        const dimensions = this.mazeGenerator.getDimensions();
        const spawnPosition = this.mazeGenerator.getSpawnPosition();
        const exitPosition = this.mazeGenerator.getExitPosition();

        // Step 1: Always place one lootbox in the starting room
        if (spawnPosition) {
            const startRoomPosition = this.findStartRoomPosition(spawnPosition, cells, dimensions);
            if (startRoomPosition) {
                positions.push(startRoomPosition);
                console.log('📦 Guaranteed lootbox placed in starting room');
            }
        }

        // Step 2: Collect all valid spawn locations, organized by grid sections
        const gridSections = this.organizeIntoGridSections(cells, dimensions);

        // Step 3: Distribute remaining lootboxes across grid sections
        const remainingCount = count - positions.length;
        const additionalPositions = this.distributeAcrossGrid(
            gridSections,
            remainingCount,
            positions,
            spawnPosition,
            exitPosition,
            dimensions
        );

        positions.push(...additionalPositions);

        return positions;
    }

    private findStartRoomPosition(spawnPosition: THREE.Vector3, cells: MazeCell[][], dimensions: any): THREE.Vector3 | null {
        // Convert spawn position to cell coordinates
        const spawnCellX = Math.round((spawnPosition.x / dimensions.cellSize) + (dimensions.width / 2));
        const spawnCellZ = Math.round((spawnPosition.z / dimensions.cellSize) + (dimensions.height / 2));

        // Find the room that contains the spawn position
        const rooms = this.mazeGenerator.getRooms();
        for (const room of rooms) {
            if (spawnCellX >= room.x && spawnCellX < room.x + room.width &&
                spawnCellZ >= room.z && spawnCellZ < room.z + room.height) {

                // Find a good position within this room (not too close to spawn)
                for (let x = room.x; x < room.x + room.width; x++) {
                    for (let z = room.z; z < room.z + room.height; z++) {
                        if (cells[x][z].type === 'room') {
                            const worldX = (x - dimensions.width / 2) * dimensions.cellSize;
                            const worldZ = (z - dimensions.height / 2) * dimensions.cellSize;
                            const candidatePos = new THREE.Vector3(worldX, 1.0, worldZ);

                            // Ensure it's at least 2 units from spawn but still in the room
                            if (candidatePos.distanceTo(spawnPosition) >= 2.0) {
                                return candidatePos;
                            }
                        }
                    }
                }

                // If no position found with distance requirement, just use room center
                const worldX = (room.centerX - dimensions.width / 2) * dimensions.cellSize;
                const worldZ = (room.centerZ - dimensions.height / 2) * dimensions.cellSize;
                return new THREE.Vector3(worldX, 1.0, worldZ);
            }
        }

        // Fallback: place near spawn if no room found
        return new THREE.Vector3(spawnPosition.x + 2, 1.0, spawnPosition.z);
    }

    private organizeIntoGridSections(cells: MazeCell[][], dimensions: any): Map<string, { x: number, z: number }[]> {
        const sections = new Map<string, { x: number, z: number }[]>();
        const sectionsPerSide = 4; // Create a 4x4 grid of sections for more lootboxes
        const sectionWidth = Math.ceil(dimensions.width / sectionsPerSide);
        const sectionHeight = Math.ceil(dimensions.height / sectionsPerSide);

        // Initialize sections
        for (let sx = 0; sx < sectionsPerSide; sx++) {
            for (let sz = 0; sz < sectionsPerSide; sz++) {
                sections.set(`${sx}-${sz}`, []);
            }
        }

        // Categorize all valid cells into sections
        for (let x = 0; x < dimensions.width; x++) {
            for (let z = 0; z < dimensions.height; z++) {
                if (cells[x][z].type === 'room' || cells[x][z].type === 'floor') {
                    const sectionX = Math.floor(x / sectionWidth);
                    const sectionZ = Math.floor(z / sectionHeight);
                    const sectionKey = `${sectionX}-${sectionZ}`;

                    const sectionCells = sections.get(sectionKey);
                    if (sectionCells) {
                        sectionCells.push({ x, z });
                    }
                }
            }
        }

        return sections;
    }

    private distributeAcrossGrid(
        gridSections: Map<string, { x: number, z: number }[]>,
        count: number,
        existingPositions: THREE.Vector3[],
        spawnPosition: THREE.Vector3 | null,
        exitPosition: THREE.Vector3 | null,
        dimensions: any
    ): THREE.Vector3[] {
        const positions: THREE.Vector3[] = [];
        const sectionsWithCells = Array.from(gridSections.entries()).filter(([_, cells]) => cells.length > 0);

        // Shuffle sections for random distribution
        for (let i = sectionsWithCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sectionsWithCells[i], sectionsWithCells[j]] = [sectionsWithCells[j], sectionsWithCells[i]];
        }

        let sectionIndex = 0;
        let attempts = 0;
        const maxAttempts = count * 10; // Prevent infinite loops

        while (positions.length < count && attempts < maxAttempts) {
            attempts++;

            // Get current section
            const [sectionKey, sectionCells] = sectionsWithCells[sectionIndex % sectionsWithCells.length];

            // Skip if this section is empty
            if (sectionCells.length === 0) {
                sectionIndex++;
                continue;
            }

            // Try to place a lootbox in this section
            const randomCell = sectionCells[Math.floor(Math.random() * sectionCells.length)];
            const worldX = (randomCell.x - dimensions.width / 2) * dimensions.cellSize;
            const worldZ = (randomCell.z - dimensions.height / 2) * dimensions.cellSize;
            const candidatePosition = new THREE.Vector3(worldX, 1.0, worldZ);

            // Check if position is valid
            if (this.isValidLootboxPosition(candidatePosition, existingPositions, positions, spawnPosition, exitPosition)) {
                positions.push(candidatePosition);
                console.log(`📦 Lootbox placed in section ${sectionKey}`);
            }

            sectionIndex++;
        }

        return positions;
    }

    private isValidLootboxPosition(
        candidatePosition: THREE.Vector3,
        existingPositions: THREE.Vector3[],
        newPositions: THREE.Vector3[],
        spawnPosition: THREE.Vector3 | null,
        exitPosition: THREE.Vector3 | null
    ): boolean {
        const minDistanceFromSpawn = 1.5; // Reduced from 3.0 since we want one in start room
        const minDistanceFromExit = 3.0;
        // 3 minutes walking distance: 1.5 units/sec * 180 sec = 270 units
        // But this is too large for the maze, so use a reasonable fraction
        const minDistanceBetweenLootboxes = 12.0; // Increased for better spacing between lootboxes

        // Check distance from spawn (more lenient)
        if (spawnPosition && candidatePosition.distanceTo(spawnPosition) < minDistanceFromSpawn) {
            return false;
        }

        // Check distance from exit
        if (exitPosition && candidatePosition.distanceTo(exitPosition) < minDistanceFromExit) {
            return false;
        }

        // Check distance from existing lootboxes (both already placed and being placed)
        const allExistingPositions = [...existingPositions, ...newPositions];
        for (const existingPos of allExistingPositions) {
            if (candidatePosition.distanceTo(existingPos) < minDistanceBetweenLootboxes) {
                return false;
            }
        }

        return true;
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
        // Update lootboxes
        for (const lootbox of this.lootboxes.values()) {
            lootbox.update(deltaTime);
        }

        // Update navigation boxes
        for (const navBox of this.navigationBoxes.values()) {
            navBox.update(deltaTime);
        }

        // Update navigation lines (remove expired ones)
        this.navigationLines = this.navigationLines.filter(line => line.update(deltaTime));
    }

    public checkCollisions(playerPosition: THREE.Vector3): number {
        let pointsGained = 0;

        for (const lootbox of this.lootboxes.values()) {
            if (!lootbox.isCollected() && lootbox.checkCollision(playerPosition, 1.2)) {
                const lootboxData = lootbox.getData();
                const points = lootbox.collect();
                pointsGained += points;
                this.totalPoints += points;
                this.collectedCount++;

                // Add power charge based on lootbox rarity
                const chargeGained = this.powerManager.addCharge(lootboxData.rarity);

                // Play collection sound effects
                this.audioManager.playLootboxCollectSFX(lootboxData.rarity);
                this.audioManager.playPowerGainSFX();

                // Create collection effect
                this.createCollectionEffect(lootbox.getMesh().position.clone());

                console.log(`⚡ Collected ${lootboxData.rarity} lootbox: +${points} points, +${chargeGained} power`);
            }
        }

        // Check navigation box collisions
        this.checkNavigationBoxCollisions(playerPosition);

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

    public getAllLootboxes(): Lootbox[] {
        return Array.from(this.lootboxes.values());
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

    private spawnNavigationBoxes(): void {
        // Clear existing navigation boxes
        this.clearNavigationBoxes();

        // Get all existing positions (lootboxes)
        const existingPositions: THREE.Vector3[] = [];
        for (const lootbox of this.lootboxes.values()) {
            existingPositions.push(lootbox.getMesh().position.clone());
        }

        const spawnPosition = this.mazeGenerator.getSpawnPosition();
        const exitPosition = this.mazeGenerator.getExitPosition();

        if (spawnPosition) existingPositions.push(spawnPosition);
        if (exitPosition) existingPositions.push(exitPosition);

        // Generate positions for navigation boxes
        const navPositions = this.generateNavigationBoxPositions(existingPositions);

        navPositions.forEach((position, index) => {
            const navBoxData: NavigationBoxData = {
                id: `navbox_${Date.now()}_${index}`,
                position: position.clone(),
                collected: false
            };

            const navBox = new NavigationBox(navBoxData);
            this.navigationBoxes.set(navBoxData.id, navBox);

            // Add to scene
            this.scene.add(navBox.getMesh());
            this.scene.add(navBox.getLight());

            const particles = navBox.getParticles();
            if (particles) {
                this.scene.add(particles);
            }
        });

        console.log(`🧭 Spawned ${this.navigationBoxes.size} navigation boxes`);
    }

    private generateNavigationBoxPositions(existingPositions: THREE.Vector3[]): THREE.Vector3[] {
        const positions: THREE.Vector3[] = [];
        const cells = this.mazeGenerator.getCells();
        const dimensions = this.mazeGenerator.getDimensions();
        const cellSize = this.mazeGenerator.getDimensions().cellSize;
        const maxAttempts = 100;

        for (let i = 0; i < this.maxNavigationBoxes; i++) {
            let attempts = 0;
            let validPosition: THREE.Vector3 | null = null;

            while (attempts < maxAttempts && !validPosition) {
                // Pick a random floor cell
                const x = Math.floor(Math.random() * dimensions.width);
                const z = Math.floor(Math.random() * dimensions.height);
                const cell = cells[x][z];

                if (cell && (cell.type === 'room' || cell.type === 'floor')) {
                    const worldX = (x - dimensions.width / 2) * cellSize;
                    const worldZ = (z - dimensions.height / 2) * cellSize;
                    const candidatePosition = new THREE.Vector3(worldX, 1.0, worldZ);

                    // Check minimum distance from all existing positions
                    let validDistance = true;
                    for (const existingPos of [...existingPositions, ...positions]) {
                        if (candidatePosition.distanceTo(existingPos) < this.navigationBoxSpacing) {
                            validDistance = false;
                            break;
                        }
                    }

                    if (validDistance) {
                        validPosition = candidatePosition;
                    }
                }
                attempts++;
            }

            if (validPosition) {
                positions.push(validPosition);
            }
        }

        return positions;
    }

    private clearNavigationBoxes(): void {
        // Remove from scene and dispose resources
        for (const navBox of this.navigationBoxes.values()) {
            this.scene.remove(navBox.getMesh());
            this.scene.remove(navBox.getLight());

            const particles = navBox.getParticles();
            if (particles) {
                this.scene.remove(particles);
            }
        }

        // Clear navigation lines
        for (const line of this.navigationLines) {
            line.dispose();
        }
        this.navigationLines = [];

        this.navigationBoxes.clear();
    }

    private checkNavigationBoxCollisions(playerPosition: THREE.Vector3): void {
        for (const navBox of this.navigationBoxes.values()) {
            if (!navBox.isCollected() && navBox.checkCollision(playerPosition)) {
                if (navBox.collect()) {
                    // Create navigation line to exit
                    const exitPosition = this.mazeGenerator.getExitPosition();
                    if (exitPosition) {
                        const line = new NavigationLine(this.scene, playerPosition.clone(), exitPosition);
                        this.navigationLines.push(line);

                        // Play collection sound
                        console.log('🧭 Navigation box collected! Line to exit activated for 30 seconds.');
                    }
                }
            }
        }
    }

    public getAllNavigationBoxes(): NavigationBox[] {
        return Array.from(this.navigationBoxes.values());
    }

    public reset(): void {
        this.clearAllLootboxes();
        this.clearNavigationBoxes();
        console.log('🔄 Lootbox manager reset');
    }
}
