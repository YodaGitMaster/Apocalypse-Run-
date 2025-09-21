import * as THREE from 'three';

export interface MazeCell {
    x: number;
    z: number;
    type: 'wall' | 'floor' | 'room';
    visited: boolean;
    walls: {
        north: boolean;
        south: boolean;
        east: boolean;
        west: boolean;
    };
}

export interface Room {
    x: number;
    z: number;
    width: number;
    height: number;
    centerX: number;
    centerZ: number;
}

export class MazeGenerator {
    private width: number;
    private height: number;
    private cells: MazeCell[][];
    private rooms: Room[] = [];
    private spawnPosition: THREE.Vector3 | null = null;
    private exitPosition: THREE.Vector3 | null = null;

    // Generation parameters
    private readonly roomAttempts = 15;
    private readonly minRoomSize = 4;
    private readonly maxRoomSize = 8;
    private readonly wallHeight = 3;
    private readonly cellSize = 2; // Each cell is 2x2 units

    constructor(width: number = 25, height: number = 25) {
        this.width = width;
        this.height = height;
        this.cells = [];
        this.initializeCells();
    }

    private initializeCells(): void {
        this.cells = [];
        for (let x = 0; x < this.width; x++) {
            this.cells[x] = [];
            for (let z = 0; z < this.height; z++) {
                this.cells[x][z] = {
                    x,
                    z,
                    type: 'wall',
                    visited: false,
                    walls: {
                        north: true,
                        south: true,
                        east: true,
                        west: true
                    }
                };
            }
        }
    }

    public generateMaze(): void {
        console.log('🏗️ Generating maze...');

        // Step 1: Generate rooms first
        this.generateRooms();

        // Step 2: Generate maze corridors
        this.generateCorridors();

        // Step 3: Connect rooms to corridors
        this.connectRoomsToMaze();

        // Step 4: Add some random openings for better flow
        this.addRandomOpenings();

        console.log(`✅ Maze generated with ${this.rooms.length} rooms`);
    }

    private generateRooms(): void {
        this.rooms = [];

        for (let attempt = 0; attempt < this.roomAttempts; attempt++) {
            const roomWidth = Math.floor(Math.random() * (this.maxRoomSize - this.minRoomSize)) + this.minRoomSize;
            const roomHeight = Math.floor(Math.random() * (this.maxRoomSize - this.minRoomSize)) + this.minRoomSize;

            const x = Math.floor(Math.random() * (this.width - roomWidth - 2)) + 1;
            const z = Math.floor(Math.random() * (this.height - roomHeight - 2)) + 1;

            // Check if room overlaps with existing rooms
            if (this.canPlaceRoom(x, z, roomWidth, roomHeight)) {
                const room: Room = {
                    x,
                    z,
                    width: roomWidth,
                    height: roomHeight,
                    centerX: x + Math.floor(roomWidth / 2),
                    centerZ: z + Math.floor(roomHeight / 2)
                };

                this.rooms.push(room);
                this.carveRoom(room);
                console.log(`🏠 Created room at (${x}, ${z}) size ${roomWidth}x${roomHeight}`);
            }
        }
    }

    private canPlaceRoom(x: number, z: number, width: number, height: number): boolean {
        // Check boundaries
        if (x + width >= this.width - 1 || z + height >= this.height - 1) {
            return false;
        }

        // Check overlap with existing rooms (with 2-cell buffer)
        for (const room of this.rooms) {
            if (!(x + width + 1 < room.x ||
                x - 1 > room.x + room.width ||
                z + height + 1 < room.z ||
                z - 1 > room.z + room.height)) {
                return false;
            }
        }

        return true;
    }

    private carveRoom(room: Room): void {
        for (let x = room.x; x < room.x + room.width; x++) {
            for (let z = room.z; z < room.z + room.height; z++) {
                this.cells[x][z].type = 'room';
                this.cells[x][z].visited = true;
                // Remove all walls inside the room
                this.cells[x][z].walls = {
                    north: false,
                    south: false,
                    east: false,
                    west: false
                };
            }
        }
    }

    private generateCorridors(): void {
        // Use recursive backtracking to generate maze corridors
        const stack: MazeCell[] = [];

        // Start from a random odd position (ensures proper maze structure)
        let startX = 1;
        let startZ = 1;

        // Find a starting position that's not in a room
        while (this.cells[startX][startZ].type === 'room') {
            startX = Math.floor(Math.random() * (this.width - 2)) + 1;
            startZ = Math.floor(Math.random() * (this.height - 2)) + 1;
        }

        const current = this.cells[startX][startZ];
        current.visited = true;
        current.type = 'floor';
        stack.push(current);

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(current);

            if (neighbors.length > 0) {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                this.removeWallBetween(current, next);
                next.visited = true;
                next.type = 'floor';
                stack.push(next);
            } else {
                stack.pop();
            }
        }
    }

    private getUnvisitedNeighbors(cell: MazeCell): MazeCell[] {
        const neighbors: MazeCell[] = [];
        const directions = [
            { x: 0, z: -2 }, // North
            { x: 2, z: 0 },  // East
            { x: 0, z: 2 },  // South
            { x: -2, z: 0 }  // West
        ];

        for (const dir of directions) {
            const newX = cell.x + dir.x;
            const newZ = cell.z + dir.z;

            if (newX >= 0 && newX < this.width && newZ >= 0 && newZ < this.height) {
                const neighbor = this.cells[newX][newZ];
                if (!neighbor.visited && neighbor.type !== 'room') {
                    neighbors.push(neighbor);
                }
            }
        }

        return neighbors;
    }

    private removeWallBetween(current: MazeCell, next: MazeCell): void {
        const dx = next.x - current.x;
        const dz = next.z - current.z;

        // Remove wall in the cell between current and next
        const wallX = current.x + dx / 2;
        const wallZ = current.z + dz / 2;

        if (wallX >= 0 && wallX < this.width && wallZ >= 0 && wallZ < this.height) {
            this.cells[wallX][wallZ].type = 'floor';
            this.cells[wallX][wallZ].visited = true;
        }
    }

    private connectRoomsToMaze(): void {
        for (const room of this.rooms) {
            // Create 1-3 connections per room
            const connections = Math.floor(Math.random() * 3) + 1;

            for (let i = 0; i < connections; i++) {
                this.createRoomConnection(room);
            }
        }
    }

    private createRoomConnection(room: Room): void {
        // Pick a random wall of the room
        const walls = ['north', 'south', 'east', 'west'];
        const wall = walls[Math.floor(Math.random() * walls.length)];

        let connectionX: number, connectionZ: number;

        switch (wall) {
            case 'north':
                connectionX = room.x + Math.floor(Math.random() * room.width);
                connectionZ = room.z - 1;
                break;
            case 'south':
                connectionX = room.x + Math.floor(Math.random() * room.width);
                connectionZ = room.z + room.height;
                break;
            case 'east':
                connectionX = room.x + room.width;
                connectionZ = room.z + Math.floor(Math.random() * room.height);
                break;
            case 'west':
                connectionX = room.x - 1;
                connectionZ = room.z + Math.floor(Math.random() * room.height);
                break;
            default:
                return;
        }

        // Create connection if valid
        if (connectionX >= 0 && connectionX < this.width &&
            connectionZ >= 0 && connectionZ < this.height) {
            this.cells[connectionX][connectionZ].type = 'floor';
            this.cells[connectionX][connectionZ].visited = true;
        }
    }

    private addRandomOpenings(): void {
        // Add some random openings to make the maze more interesting
        const openings = Math.floor(this.width * this.height * 0.02); // 2% of cells

        for (let i = 0; i < openings; i++) {
            const x = Math.floor(Math.random() * this.width);
            const z = Math.floor(Math.random() * this.height);

            if (this.cells[x][z].type === 'wall') {
                // Only create opening if it connects two floor areas
                const neighbors = this.getFloorNeighbors(x, z);
                if (neighbors.length >= 2) {
                    this.cells[x][z].type = 'floor';
                }
            }
        }
    }

    private getFloorNeighbors(x: number, z: number): MazeCell[] {
        const neighbors: MazeCell[] = [];
        const directions = [
            { x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }
        ];

        for (const dir of directions) {
            const newX = x + dir.x;
            const newZ = z + dir.z;

            if (newX >= 0 && newX < this.width && newZ >= 0 && newZ < this.height) {
                const neighbor = this.cells[newX][newZ];
                if (neighbor.type === 'floor' || neighbor.type === 'room') {
                    neighbors.push(neighbor);
                }
            }
        }

        return neighbors;
    }

    public createThreeJSMaze(scene: THREE.Scene): THREE.Group {
        const mazeGroup = new THREE.Group();

        // Materials
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const roomFloorMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });

        // Create geometry instances for better performance
        const wallGeometry = new THREE.BoxGeometry(this.cellSize, this.wallHeight, this.cellSize);
        const floorGeometry = new THREE.PlaneGeometry(this.cellSize, this.cellSize);

        // Create maze cells
        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.height; z++) {
                const cell = this.cells[x][z];
                const worldX = (x - this.width / 2) * this.cellSize;
                const worldZ = (z - this.height / 2) * this.cellSize;

                if (cell.type === 'wall') {
                    // Create wall
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.set(worldX, this.wallHeight / 2, worldZ);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    mazeGroup.add(wall);
                } else {
                    // Create floor
                    const floor = new THREE.Mesh(floorGeometry,
                        cell.type === 'room' ? roomFloorMaterial : floorMaterial);
                    floor.rotation.x = -Math.PI / 2;
                    floor.position.set(worldX, 0, worldZ);
                    floor.receiveShadow = true;
                    mazeGroup.add(floor);
                }
            }
        }

        // Create perimeter walls to fully enclose the maze
        this.createPerimeterWalls(mazeGroup, wallMaterial);

        // Create roof over the entire maze
        this.createRoof(mazeGroup, roofMaterial);

        scene.add(mazeGroup);
        console.log('🎨 Maze added to Three.js scene with perimeter walls and roof');
        return mazeGroup;
    }

    private createPerimeterWalls(mazeGroup: THREE.Group, wallMaterial: THREE.MeshLambertMaterial): void {
        const wallGeometry = new THREE.BoxGeometry(this.cellSize, this.wallHeight, this.cellSize);
        const mazeSize = this.width * this.cellSize;
        const halfMazeSize = mazeSize / 2;

        // Create walls around the entire perimeter
        for (let i = 0; i <= this.width; i++) {
            const x = (i - this.width / 2) * this.cellSize;

            // North wall
            const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
            northWall.position.set(x, this.wallHeight / 2, -halfMazeSize - this.cellSize / 2);
            northWall.castShadow = true;
            northWall.receiveShadow = true;
            mazeGroup.add(northWall);

            // South wall
            const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
            southWall.position.set(x, this.wallHeight / 2, halfMazeSize + this.cellSize / 2);
            southWall.castShadow = true;
            southWall.receiveShadow = true;
            mazeGroup.add(southWall);
        }

        for (let i = 0; i <= this.height; i++) {
            const z = (i - this.height / 2) * this.cellSize;

            // West wall
            const westWall = new THREE.Mesh(wallGeometry, wallMaterial);
            westWall.position.set(-halfMazeSize - this.cellSize / 2, this.wallHeight / 2, z);
            westWall.castShadow = true;
            westWall.receiveShadow = true;
            mazeGroup.add(westWall);

            // East wall
            const eastWall = new THREE.Mesh(wallGeometry, wallMaterial);
            eastWall.position.set(halfMazeSize + this.cellSize / 2, this.wallHeight / 2, z);
            eastWall.castShadow = true;
            eastWall.receiveShadow = true;
            mazeGroup.add(eastWall);
        }

        console.log('🧱 Perimeter walls created');
    }

    private createRoof(mazeGroup: THREE.Group, roofMaterial: THREE.MeshLambertMaterial): void {
        const mazeSize = (this.width + 2) * this.cellSize; // +2 for perimeter walls
        const roofGeometry = new THREE.PlaneGeometry(mazeSize, mazeSize);
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);

        roof.rotation.x = Math.PI / 2; // Rotate to be horizontal (ceiling)
        roof.position.set(0, this.wallHeight, 0);
        roof.receiveShadow = true;

        mazeGroup.add(roof);
        console.log('🏠 Roof created');
    }

    public addArtificialLighting(scene: THREE.Scene): THREE.PointLight[] {
        const lights: THREE.PointLight[] = [];
        const lampPositions: THREE.Vector3[] = [];

        // Add lights in rooms
        for (const room of this.rooms) {
            const worldX = (room.centerX - this.width / 2) * this.cellSize;
            const worldZ = (room.centerZ - this.height / 2) * this.cellSize;
            lampPositions.push(new THREE.Vector3(worldX, this.wallHeight - 0.5, worldZ));
        }

        // Add lights in corridors at regular intervals
        for (let x = 2; x < this.width; x += 6) {
            for (let z = 2; z < this.height; z += 6) {
                if (this.cells[x][z].type === 'floor') {
                    const worldX = (x - this.width / 2) * this.cellSize;
                    const worldZ = (z - this.height / 2) * this.cellSize;
                    lampPositions.push(new THREE.Vector3(worldX, this.wallHeight - 0.5, worldZ));
                }
            }
        }

        // Create main lights and lamp fixtures
        for (const pos of lampPositions) {
            // Create point light
            const light = new THREE.PointLight(0xffffff, 0.8, 12);
            light.position.copy(pos);
            light.castShadow = true;
            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            scene.add(light);
            lights.push(light);

            // Create lamp fixture
            // this.createLampFixture(scene, pos);
        }

        // Add minimal ambient lighting scattered throughout
        this.addMinimalLighting(scene, lights);

        console.log(`💡 Added ${lights.length} lights (including minimal lighting)`);
        return lights;
    }

    private addMinimalLighting(scene: THREE.Scene, lights: THREE.PointLight[]): void {
        const minimalLights: THREE.Vector3[] = [];

        // Add minimal lights in corridors (different pattern from main lights)
        for (let x = 4; x < this.width; x += 8) {
            for (let z = 4; z < this.height; z += 8) {
                if (this.cells[x][z].type === 'floor') {
                    const worldX = (x - this.width / 2) * this.cellSize;
                    const worldZ = (z - this.height / 2) * this.cellSize;
                    minimalLights.push(new THREE.Vector3(worldX, this.wallHeight - 1.5, worldZ));
                }
            }
        }

        // Add minimal lights at random corridor intersections
        for (let x = 1; x < this.width - 1; x += 3) {
            for (let z = 1; z < this.height - 1; z += 3) {
                if (Math.random() < 0.3 && this.cells[x][z].type === 'floor') {
                    // Check if it's a corridor intersection (has floor neighbors in multiple directions)
                    const neighbors = this.getFloorNeighbors(x, z);
                    if (neighbors.length >= 3) {
                        const worldX = (x - this.width / 2) * this.cellSize;
                        const worldZ = (z - this.height / 2) * this.cellSize;
                        minimalLights.push(new THREE.Vector3(worldX, this.wallHeight - 1.0, worldZ));
                    }
                }
            }
        }

        // Add emergency-style lights along some walls
        for (let x = 0; x < this.width; x += 5) {
            for (let z = 0; z < this.height; z += 5) {
                if (Math.random() < 0.2 && this.cells[x][z].type === 'wall') {
                    // Check if wall has floor adjacent (good for emergency lighting)
                    const adjacentFloors = this.getFloorNeighbors(x, z);
                    if (adjacentFloors.length > 0) {
                        const worldX = (x - this.width / 2) * this.cellSize;
                        const worldZ = (z - this.height / 2) * this.cellSize;
                        minimalLights.push(new THREE.Vector3(worldX, this.wallHeight - 2.0, worldZ));
                    }
                }
            }
        }

        // Create minimal light fixtures with optimizations
        for (const pos of minimalLights) {
            // Create ceiling-mounted spotlight pointing downward
            const lightColor = Math.random() < 0.3 ? 0xff4444 : 0x4444ff;
            const dimLight = new THREE.SpotLight(
                lightColor, // Occasional red/blue emergency lights
                0.6, // Optimized brightness
                12, // Enhanced range
                Math.PI / 4, // 45 degree cone (wider coverage)
                0.2 // Sharper edges for better definition
            );

            // Enhanced shadow quality
            dimLight.castShadow = true;
            dimLight.shadow.mapSize.width = 256; // Optimized shadow resolution
            dimLight.shadow.mapSize.height = 256;
            dimLight.shadow.camera.near = 0.5;
            dimLight.shadow.camera.far = 15;
            dimLight.shadow.camera.fov = 45;
            dimLight.shadow.bias = -0.0001; // Reduce shadow acne

            // Position light at ceiling height
            const ceilingPos = pos.clone();
            ceilingPos.y = this.wallHeight - 0.15; // Slightly closer to ceiling
            dimLight.position.copy(ceilingPos);

            // Create target on floor directly below with precise positioning
            dimLight.target.position.set(pos.x, 0.05, pos.z); // Point straight down, closer to floor

            // Add subtle light decay for realism
            dimLight.decay = 1.5;

            scene.add(dimLight);
            scene.add(dimLight.target);
            lights.push(dimLight);

        }

        console.log(`✨ Added ${minimalLights.length} minimal atmospheric lights`);
    }


    private findNearestWallDirection(position: THREE.Vector3): THREE.Vector3 | null {
        // Convert world position back to cell coordinates
        const cellX = Math.round((position.x / this.cellSize) + (this.width / 2));
        const cellZ = Math.round((position.z / this.cellSize) + (this.height / 2));

        // Check adjacent cells to find wall direction
        const directions = [
            { x: 1, z: 0, vec: new THREE.Vector3(1, 0, 0) },   // East
            { x: -1, z: 0, vec: new THREE.Vector3(-1, 0, 0) }, // West
            { x: 0, z: 1, vec: new THREE.Vector3(0, 0, 1) },   // South
            { x: 0, z: -1, vec: new THREE.Vector3(0, 0, -1) }  // North
        ];

        for (const dir of directions) {
            const checkX = cellX + dir.x;
            const checkZ = cellZ + dir.z;

            if (checkX >= 0 && checkX < this.width && checkZ >= 0 && checkZ < this.height) {
                if (this.cells[checkX][checkZ].type === 'wall') {
                    return dir.vec;
                }
            }
        }

        return new THREE.Vector3(1, 0, 0); // Default to east if no wall found
    }

    /*
    private createLampFixture(scene: THREE.Scene, position: THREE.Vector3): void {
        const lampGroup = new THREE.Group();

        // Lamp base (hanging from ceiling)
        const baseGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.3);
        const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(0, -0.15, 0);
        lampGroup.add(base);

        // Lamp shade
        const shadeGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.4);
        const shadeMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
        shade.position.set(0, -0.5, 0);
        lampGroup.add(shade);

        // Glowing bulb effect
        const bulbGeometry = new THREE.SphereGeometry(0.1);
        const bulbMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffaa,
            transparent: true,
            opacity: 0.8
        });
        const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
        bulb.position.set(0, -0.4, 0);
        lampGroup.add(bulb);

        // Chain/cable from ceiling
        const chainGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
        const chainMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const chain = new THREE.Mesh(chainGeometry, chainMaterial);
        chain.position.set(0, 0.2, 0);
        lampGroup.add(chain);

        lampGroup.position.copy(position);
        scene.add(lampGroup);
    }
    */

    public getRandomSpawnPosition(): THREE.Vector3 {
        // Try to spawn in a room first, otherwise in a corridor
        let spawnCells: MazeCell[] = [];

        // Collect all room cells
        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.height; z++) {
                if (this.cells[x][z].type === 'room') {
                    spawnCells.push(this.cells[x][z]);
                }
            }
        }

        // If no rooms, use floor cells
        if (spawnCells.length === 0) {
            for (let x = 0; x < this.width; x++) {
                for (let z = 0; z < this.height; z++) {
                    if (this.cells[x][z].type === 'floor') {
                        spawnCells.push(this.cells[x][z]);
                    }
                }
            }
        }

        if (spawnCells.length > 0) {
            const randomCell = spawnCells[Math.floor(Math.random() * spawnCells.length)];
            const worldX = (randomCell.x - this.width / 2) * this.cellSize;
            const worldZ = (randomCell.z - this.height / 2) * this.cellSize;
            this.spawnPosition = new THREE.Vector3(worldX, 1.6, worldZ); // Store spawn position
            return this.spawnPosition;
        }

        // Fallback to center
        this.spawnPosition = new THREE.Vector3(0, 1.6, 0);
        return this.spawnPosition;
    }

    public selectExitPoint(): THREE.Vector3 {
        if (!this.spawnPosition) {
            throw new Error('Spawn position must be set before selecting exit point');
        }

        // Get all available rooms and floor cells
        let exitCandidates: { cell: MazeCell, distance: number }[] = [];

        // Collect all room cells and calculate distance from spawn
        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.height; z++) {
                if (this.cells[x][z].type === 'room') {
                    const worldX = (x - this.width / 2) * this.cellSize;
                    const worldZ = (z - this.height / 2) * this.cellSize;
                    const distance = this.spawnPosition.distanceTo(new THREE.Vector3(worldX, 1.6, worldZ));
                    exitCandidates.push({ cell: this.cells[x][z], distance });
                }
            }
        }

        // If no rooms, use floor cells
        if (exitCandidates.length === 0) {
            for (let x = 0; x < this.width; x++) {
                for (let z = 0; z < this.height; z++) {
                    if (this.cells[x][z].type === 'floor') {
                        const worldX = (x - this.width / 2) * this.cellSize;
                        const worldZ = (z - this.height / 2) * this.cellSize;
                        const distance = this.spawnPosition.distanceTo(new THREE.Vector3(worldX, 1.6, worldZ));
                        exitCandidates.push({ cell: this.cells[x][z], distance });
                    }
                }
            }
        }

        if (exitCandidates.length > 0) {
            // Sort by distance (farthest first)
            exitCandidates.sort((a, b) => b.distance - a.distance);

            // Select from the farthest 25% of candidates to ensure good distance but some randomness
            const topCandidates = exitCandidates.slice(0, Math.max(1, Math.floor(exitCandidates.length * 0.25)));
            const selectedCandidate = topCandidates[Math.floor(Math.random() * topCandidates.length)];

            const worldX = (selectedCandidate.cell.x - this.width / 2) * this.cellSize;
            const worldZ = (selectedCandidate.cell.z - this.height / 2) * this.cellSize;
            this.exitPosition = new THREE.Vector3(worldX, 1.6, worldZ);

            console.log(`🚪 Exit point selected at distance ${selectedCandidate.distance.toFixed(1)} from spawn`);
            return this.exitPosition;
        }

        // Fallback - select opposite corner from spawn
        const fallbackX = this.spawnPosition.x > 0 ? -this.width * this.cellSize / 4 : this.width * this.cellSize / 4;
        const fallbackZ = this.spawnPosition.z > 0 ? -this.height * this.cellSize / 4 : this.height * this.cellSize / 4;
        this.exitPosition = new THREE.Vector3(fallbackX, 1.6, fallbackZ);
        return this.exitPosition;
    }

    public getCells(): MazeCell[][] {
        return this.cells;
    }

    public getRooms(): Room[] {
        return this.rooms;
    }

    public getDimensions(): { width: number; height: number; cellSize: number } {
        return { width: this.width, height: this.height, cellSize: this.cellSize };
    }

    public addStartAndExitLights(scene: THREE.Scene): { startLight: THREE.PointLight, exitLight: THREE.PointLight } {
        if (!this.spawnPosition || !this.exitPosition) {
            throw new Error('Both spawn and exit positions must be set before adding lights');
        }

        // Create blue light at start position
        const startLight = new THREE.PointLight(0x0088ff, 1.5, 8); // Bright blue
        startLight.position.set(
            this.spawnPosition.x,
            this.wallHeight - 0.3, // Just below ceiling
            this.spawnPosition.z
        );
        startLight.castShadow = true;
        startLight.shadow.mapSize.width = 512;
        startLight.shadow.mapSize.height = 512;
        scene.add(startLight);

        // Create red light at exit position
        const exitLight = new THREE.PointLight(0xff0044, 1.5, 8); // Bright red
        exitLight.position.set(
            this.exitPosition.x,
            this.wallHeight - 0.3, // Just below ceiling
            this.exitPosition.z
        );
        exitLight.castShadow = true;
        exitLight.shadow.mapSize.width = 512;
        exitLight.shadow.mapSize.height = 512;
        scene.add(exitLight);

        // Add pulsing effect to both lights
        this.addLightPulsingEffect(startLight, exitLight);

        console.log('💡 Added blue start light and red exit light');
        return { startLight, exitLight };
    }

    private addLightPulsingEffect(startLight: THREE.PointLight, exitLight: THREE.PointLight): void {
        const originalStartIntensity = startLight.intensity;
        const originalExitIntensity = exitLight.intensity;

        const animate = () => {
            const time = Date.now() * 0.003; // Slower pulsing

            // Pulse start light (blue)
            startLight.intensity = originalStartIntensity + Math.sin(time) * 0.3;

            // Pulse exit light (red) with different phase
            exitLight.intensity = originalExitIntensity + Math.sin(time + Math.PI) * 0.3;

            requestAnimationFrame(animate);
        };

        animate();
    }

    public getSpawnPosition(): THREE.Vector3 | null {
        return this.spawnPosition;
    }

    public getExitPosition(): THREE.Vector3 | null {
        return this.exitPosition;
    }

    public checkPlayerAtExit(playerPosition: THREE.Vector3, threshold: number = 2.0): boolean {
        if (!this.exitPosition) return false;

        const distance = playerPosition.distanceTo(this.exitPosition);
        return distance <= threshold;
    }
}
