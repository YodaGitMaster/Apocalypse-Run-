import * as THREE from 'three';
import { LootboxManager } from './LootboxManager';
import { MazeGenerator } from './MazeGenerator';

export class DebugManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private mazeGenerator: MazeGenerator;
    private lootboxManager: LootboxManager;

    private isDebugMode: boolean = false;
    private originalCameraPosition: THREE.Vector3 = new THREE.Vector3();
    private originalCameraRotation: THREE.Euler = new THREE.Euler();
    private debugCamera: THREE.PerspectiveCamera;
    private debugLights: THREE.Light[] = [];
    private debugMarkers: THREE.Object3D[] = [];
    private roofMeshes: THREE.Mesh[] = [];

    // Debug camera zoom controls
    private debugCameraHeight: number = 100;
    private minZoom: number = 30;
    private maxZoom: number = 200;
    private zoomSpeed: number = 5;
    private mazeCenter: THREE.Vector3 = new THREE.Vector3();

    // Mouse tilt controls
    private tiltX: number = 0; // Rotation around X-axis (pitch)
    private tiltZ: number = 0; // Rotation around Z-axis (roll)
    private maxTilt: number = Math.PI / 6; // 30 degrees max tilt
    private tiltSensitivity: number = 0.002;
    private isDragging: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;

    // Mouse interaction
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private mouse: THREE.Vector2 = new THREE.Vector2();
    private infoPopup: HTMLElement | null = null;
    private wasPointerLocked: boolean = false;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, mazeGenerator: MazeGenerator, lootboxManager: LootboxManager) {
        this.scene = scene;
        this.camera = camera;
        this.mazeGenerator = mazeGenerator;
        this.lootboxManager = lootboxManager;

        // Create debug camera with bird's eye view
        this.debugCamera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect
            0.1, // Near
            2000 // Far (increased for bird's eye view)
        );

        this.setupDebugCamera();
        this.setupMouseEvents();
        this.createInfoPopup();
        console.log('🐛 DebugManager initialized');
    }

    private setupDebugCamera(): void {
        // Calculate maze center and store it
        this.mazeCenter = this.getMazeCenter();

        // Position camera directly above the maze center
        this.debugCamera.position.set(this.mazeCenter.x, this.debugCameraHeight, this.mazeCenter.z);
        this.debugCamera.lookAt(this.mazeCenter.x, 0, this.mazeCenter.z);
        this.debugCamera.updateProjectionMatrix();
    }

    private getMazeCenter(): THREE.Vector3 {
        const dimensions = this.mazeGenerator.getDimensions();
        return new THREE.Vector3(0, 0, 0); // Maze is centered at origin
    }

    public handleZoom(delta: number): void {
        if (!this.isDebugMode) return;

        // Adjust camera height based on zoom
        this.debugCameraHeight = Math.max(this.minZoom, Math.min(this.maxZoom, this.debugCameraHeight + (delta * this.zoomSpeed)));

        // Lock camera position after zoom (prevents physics from interfering)
        this.lockCameraPosition();
    }

    public toggleDebugMode(): boolean {
        this.isDebugMode = !this.isDebugMode;

        if (this.isDebugMode) {
            this.enterDebugMode();
        } else {
            this.exitDebugMode();
        }

        console.log(`🐛 Debug mode: ${this.isDebugMode ? 'ON' : 'OFF'}`);
        return this.isDebugMode;
    }

    private enterDebugMode(): void {
        // Store original camera state
        this.originalCameraPosition.copy(this.camera.position);
        this.originalCameraRotation.copy(this.camera.rotation);

        // Handle pointer lock - release it to show mouse cursor
        this.wasPointerLocked = document.pointerLockElement !== null;
        if (this.wasPointerLocked) {
            document.exitPointerLock();
        }

        // Force mouse cursor to be visible using multiple approaches
        // Use setTimeout to ensure pointer lock is fully released
        setTimeout(() => {
            document.body.classList.add('debug-mode');
            document.body.style.cursor = 'default';
            document.documentElement.style.cursor = 'default';

            // Also set cursor on canvas specifically
            const canvas = document.querySelector('canvas');
            if (canvas) {
                canvas.style.cursor = 'default';
            }

            console.log('🖱️ Mouse cursor forced to visible state');
        }, 10);

        // Recalculate maze center and setup debug camera position
        this.setupDebugCamera();

        // Switch to debug camera - fixed position above maze center
        this.camera.position.copy(this.debugCamera.position);
        this.camera.rotation.copy(this.debugCamera.rotation);
        this.camera.updateProjectionMatrix();

        // Lock camera position to prevent physics interference
        this.lockCameraPosition();

        // Remove roof meshes
        this.hideRoofMeshes();

        // Add bright debug lighting
        this.addDebugLighting();

        // Add debug markers for key points
        this.addDebugMarkers();

        console.log('🐛 Entered debug mode - physics disabled, mouse cursor visible');
    }

    private lockCameraPosition(): void {
        // Set base position above maze center
        this.camera.position.set(this.mazeCenter.x, this.debugCameraHeight, this.mazeCenter.z);

        // Apply tilt rotations
        this.camera.rotation.set(this.tiltX, 0, this.tiltZ);

        // Look at maze center with tilt applied
        const lookAtTarget = new THREE.Vector3(this.mazeCenter.x, 0, this.mazeCenter.z);
        this.camera.lookAt(lookAtTarget);

        // Apply additional rotation for tilt effect
        this.camera.rotateZ(this.tiltZ);
        this.camera.rotateX(this.tiltX);

        this.camera.updateProjectionMatrix();
    }

    private setupMouseEvents(): void {
        // Mouse drag for tilting
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Mouse click for interaction
        window.addEventListener('click', this.onMouseClick.bind(this));

        // Disable context menu in debug mode
        window.addEventListener('contextmenu', this.onContextMenu.bind(this));
    }

    private onContextMenu(event: MouseEvent): void {
        if (this.isDebugMode) {
            event.preventDefault();
        }
    }

    private onMouseDown(event: MouseEvent): void {
        if (!this.isDebugMode) return;

        // Only handle right mouse button for tilting
        if (event.button === 2) { // Right mouse button
            this.isDragging = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            event.preventDefault();
        }
    }

    private onMouseMove(event: MouseEvent): void {
        if (!this.isDebugMode || !this.isDragging) return;

        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;

        // Update tilt angles with sensitivity
        this.tiltZ = Math.max(-this.maxTilt, Math.min(this.maxTilt, this.tiltZ + deltaX * this.tiltSensitivity));
        this.tiltX = Math.max(-this.maxTilt, Math.min(this.maxTilt, this.tiltX + deltaY * this.tiltSensitivity));

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;

        // Update camera position with new tilt
        this.lockCameraPosition();
    }

    private onMouseUp(event: MouseEvent): void {
        if (event.button === 2) { // Right mouse button
            this.isDragging = false;
        }
    }

    private onMouseClick(event: MouseEvent): void {
        if (!this.isDebugMode || event.button !== 0) return; // Only left click

        // Update mouse coordinates for raycasting
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Perform raycasting
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check for intersections with lootbox markers
        const intersects = this.raycaster.intersectObjects(this.debugMarkers, true);

        if (intersects.length > 0) {
            this.handleMarkerClick(intersects[0]);
        } else {
            this.hideInfoPopup();
        }
    }

    private handleMarkerClick(intersection: THREE.Intersection): void {
        // Find the parent marker group
        let markerGroup = intersection.object;
        while (markerGroup.parent && !markerGroup.name.startsWith('debug-marker-')) {
            markerGroup = markerGroup.parent;
        }

        if (markerGroup.name.startsWith('debug-marker-')) {
            const markerName = markerGroup.name.replace('debug-marker-', '');

            if (markerName === 'SPAWN') {
                this.showInfoPopup('Spawn Point', 'Player starting location', intersection.point);
            } else if (markerName === 'EXIT') {
                this.showInfoPopup('Exit Point', 'Maze exit - reach here to win!', intersection.point);
            } else {
                // This is a lootbox marker
                this.handleLootboxClick(markerGroup.position);
            }
        }
    }

    private handleLootboxClick(markerPosition: THREE.Vector3): void {
        // Find the corresponding lootbox
        const lootboxes = this.lootboxManager.getAllLootboxes();

        for (const lootbox of lootboxes) {
            const lootboxPos = lootbox.getMesh().position;
            const distance = markerPosition.distanceTo(lootboxPos);

            if (distance < 2.0) { // Close enough to be the same lootbox
                const data = lootbox.getData();
                const rarity = lootbox.getRarity();

                // Get electricity value from power manager charge values
                const chargeValues = {
                    'common': 180,
                    'rare': 360,
                    'epic': 720,
                    'legendary': 1080
                };

                const electricityValue = chargeValues[rarity as keyof typeof chargeValues] || 0;

                const info = `${rarity.toUpperCase()} Lootbox\n` +
                    `Points: ${data.pointValue}\n` +
                    `Electricity: +${electricityValue} units\n` +
                    `Status: ${data.collected ? 'Collected' : 'Available'}`;

                this.showInfoPopup(`${rarity.toUpperCase()} Lootbox`, info, markerPosition);
                break;
            }
        }
    }

    private createInfoPopup(): void {
        this.infoPopup = document.createElement('div');
        this.infoPopup.style.position = 'fixed';
        this.infoPopup.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.infoPopup.style.color = 'white';
        this.infoPopup.style.padding = '10px';
        this.infoPopup.style.borderRadius = '5px';
        this.infoPopup.style.border = '2px solid #00ff00';
        this.infoPopup.style.fontSize = '14px';
        this.infoPopup.style.fontFamily = 'monospace';
        this.infoPopup.style.pointerEvents = 'none';
        this.infoPopup.style.zIndex = '1000';
        this.infoPopup.style.display = 'none';
        this.infoPopup.style.whiteSpace = 'pre-line';
        document.body.appendChild(this.infoPopup);
    }

    private showInfoPopup(title: string, content: string, worldPosition: THREE.Vector3): void {
        if (!this.infoPopup) return;

        // Convert world position to screen coordinates
        const screenPosition = worldPosition.clone();
        screenPosition.project(this.camera);

        const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (screenPosition.y * -0.5 + 0.5) * window.innerHeight;

        this.infoPopup.innerHTML = `<strong>${title}</strong>\n${content}`;
        this.infoPopup.style.left = `${x + 10}px`;
        this.infoPopup.style.top = `${y - 10}px`;
        this.infoPopup.style.display = 'block';
    }

    private hideInfoPopup(): void {
        if (this.infoPopup) {
            this.infoPopup.style.display = 'none';
        }
    }

    private exitDebugMode(): void {
        // Reset tilt angles
        this.tiltX = 0;
        this.tiltZ = 0;
        this.isDragging = false;

        // Hide info popup
        this.hideInfoPopup();

        // Remove debug mode CSS class
        document.body.classList.remove('debug-mode');

        // Restore pointer lock if it was previously locked
        if (this.wasPointerLocked) {
            // Request pointer lock on the document body
            document.body.requestPointerLock();
        }

        // Hide mouse cursor
        document.body.style.cursor = 'none';
        document.documentElement.style.cursor = 'none';

        // Reset canvas cursor
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.style.cursor = 'none';
        }

        // Restore original camera state
        this.camera.position.copy(this.originalCameraPosition);
        this.camera.rotation.copy(this.originalCameraRotation);
        this.camera.updateProjectionMatrix();

        // Restore roof meshes
        this.showRoofMeshes();

        // Remove debug lighting
        this.removeDebugLighting();

        // Remove debug markers
        this.removeDebugMarkers();

        console.log('🐛 Exited debug mode - normal view and pointer lock restored');
    }

    private hideRoofMeshes(): void {
        // Find and hide all roof meshes (typically at Y > 2.5)
        this.roofMeshes = [];
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                // Check if this is likely a roof mesh based on position
                if (object.position.y > 2.5 || (object.geometry && this.isRoofGeometry(object))) {
                    this.roofMeshes.push(object);
                    object.visible = false;
                }
            }
        });
        console.log(`🐛 Hidden ${this.roofMeshes.length} roof meshes`);
    }

    private showRoofMeshes(): void {
        // Restore visibility of roof meshes
        this.roofMeshes.forEach(mesh => {
            mesh.visible = true;
        });
        this.roofMeshes = [];
        console.log('🐛 Restored roof meshes');
    }

    private isRoofGeometry(mesh: THREE.Mesh): boolean {
        // Check if the mesh geometry suggests it's a roof
        // This is a heuristic based on typical maze construction
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = bbox.getSize(new THREE.Vector3());

        // Roof meshes are typically flat (small Y dimension) and positioned high
        return size.y < 0.5 && mesh.position.y > 2.0;
    }

    private addDebugLighting(): void {
        // Add bright ambient light for full visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        ambientLight.name = 'debug-ambient';
        this.scene.add(ambientLight);
        this.debugLights.push(ambientLight);

        // Add directional light from above
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 100, 0);
        directionalLight.name = 'debug-directional';
        this.scene.add(directionalLight);
        this.debugLights.push(directionalLight);

        // Add hemisphere light for soft overall illumination
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemisphereLight.name = 'debug-hemisphere';
        this.scene.add(hemisphereLight);
        this.debugLights.push(hemisphereLight);

        console.log('🐛 Added debug lighting');
    }

    private removeDebugLighting(): void {
        this.debugLights.forEach(light => {
            this.scene.remove(light);
        });
        this.debugLights = [];
        console.log('🐛 Removed debug lighting');
    }

    private addDebugMarkers(): void {
        // Add marker for spawn position
        const spawnPosition = this.mazeGenerator.getSpawnPosition();
        if (spawnPosition) {
            const spawnMarker = this.createMarker(spawnPosition, 0x00ff00, 'SPAWN', 2.0);
            this.scene.add(spawnMarker);
            this.debugMarkers.push(spawnMarker);
        }

        // Add marker for exit position
        const exitPosition = this.mazeGenerator.getExitPosition();
        if (exitPosition) {
            const exitMarker = this.createMarker(exitPosition, 0xff0000, 'EXIT', 2.0);
            this.scene.add(exitMarker);
            this.debugMarkers.push(exitMarker);
        }

        // Add markers for all lootboxes with detailed information
        const lootboxStats = this.lootboxManager.getCollectionStats();
        const lootboxes = this.lootboxManager.getAllLootboxes();

        lootboxes.forEach((lootbox, index) => {
            const position = lootbox.getMesh().position.clone();
            const rarity = lootbox.getRarity();
            const data = lootbox.getData();
            const color = this.getRarityColor(rarity);
            const points = data.pointValue;

            // Create detailed label with rarity and points
            const label = `${rarity.toUpperCase()}\n${points} PTS`;
            const marker = this.createMarker(position, color, label, 1.2);
            this.scene.add(marker);
            this.debugMarkers.push(marker);
        });

        // Add markers for navigation boxes
        const navigationBoxes = this.lootboxManager.getAllNavigationBoxes();
        navigationBoxes.forEach((navBox, index) => {
            const position = navBox.getMesh().position.clone();
            const color = 0x00ffff; // Cyan color for navigation boxes
            const label = `NAVIGATION\nEXIT GUIDE`;
            const marker = this.createMarker(position, color, label, 1.5);
            this.scene.add(marker);
            this.debugMarkers.push(marker);
        });

        console.log(`🐛 Added ${this.debugMarkers.length} debug markers`);
    }

    private removeDebugMarkers(): void {
        this.debugMarkers.forEach(marker => {
            this.scene.remove(marker);
        });
        this.debugMarkers = [];
        console.log('🐛 Removed debug markers');
    }

    private createMarker(position: THREE.Vector3, color: number, label: string, scale: number = 1.0): THREE.Group {
        const group = new THREE.Group();

        // Create a much taller and more visible cylinder as marker
        const cylinderHeight = 15 * scale;
        const cylinderRadius = 1.0 * scale;
        const geometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 12);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: false,
            opacity: 1.0
        });
        const cylinder = new THREE.Mesh(geometry, material);
        cylinder.position.set(0, cylinderHeight / 2, 0);
        group.add(cylinder);

        // Create a larger, more visible sphere at the base
        const sphereRadius = 1.5 * scale;
        const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: false,
            opacity: 1.0
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(0, sphereRadius, 0);
        group.add(sphere);

        // Add a glowing outline for better visibility
        const outlineGeometry = new THREE.SphereGeometry(sphereRadius * 1.2, 16, 16);
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        outline.position.set(0, sphereRadius, 0);
        group.add(outline);

        // Add floating text label above the marker
        this.createTextLabel(group, label, position, cylinderHeight + 3, color);

        // Position the group
        group.position.copy(position);
        group.name = `debug-marker-${label}`;

        return group;
    }

    private createTextLabel(parent: THREE.Group, text: string, position: THREE.Vector3, height: number, color: number): void {
        // Create a canvas for the text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 96; // Increased height for multi-line text

        // Style the text
        context.font = 'Bold 20px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Add background for better readability
        context.fillStyle = 'rgba(0, 0, 0, 0.9)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Add border for better definition
        context.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.lineWidth = 3;
        context.strokeRect(0, 0, canvas.width, canvas.height);

        // Draw the text (handle multi-line)
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        const lines = text.split('\n');
        const lineHeight = 25;
        const startY = (canvas.height - (lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
            context.fillText(line, canvas.width / 2, startY + (index * lineHeight));
        });

        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(0, height, 0);
        sprite.scale.set(10, 3, 1); // Make text even larger and accommodate multiple lines

        parent.add(sprite);
    }

    private getRarityColor(rarity: string): number {
        switch (rarity) {
            case 'common': return 0x808080;    // Gray
            case 'rare': return 0x0080ff;      // Blue
            case 'epic': return 0x8000ff;      // Purple
            case 'legendary': return 0xffd700; // Gold
            default: return 0xffffff;          // White
        }
    }

    public isInDebugMode(): boolean {
        return this.isDebugMode;
    }

    public updateDebugCamera(): void {
        if (!this.isDebugMode) return;

        // Continuously lock camera position to prevent any physics interference
        this.lockCameraPosition();
    }

    public getDebugInfo(): any {
        const spawnPos = this.mazeGenerator.getSpawnPosition();
        const exitPos = this.mazeGenerator.getExitPosition();
        const lootboxStats = this.lootboxManager.getCollectionStats();

        return {
            debugMode: this.isDebugMode,
            spawnPosition: spawnPos ? {
                x: spawnPos.x.toFixed(2),
                y: spawnPos.y.toFixed(2),
                z: spawnPos.z.toFixed(2)
            } : null,
            exitPosition: exitPos ? {
                x: exitPos.x.toFixed(2),
                y: exitPos.y.toFixed(2),
                z: exitPos.z.toFixed(2)
            } : null,
            lootboxCount: lootboxStats.total,
            lootboxCollected: lootboxStats.collected,
            roofMeshesHidden: this.roofMeshes.length,
            debugLights: this.debugLights.length,
            debugMarkers: this.debugMarkers.length
        };
    }

    public dispose(): void {
        this.exitDebugMode();

        // Clean up info popup
        if (this.infoPopup && this.infoPopup.parentNode) {
            this.infoPopup.parentNode.removeChild(this.infoPopup);
            this.infoPopup = null;
        }

        console.log('🐛 DebugManager disposed');
    }
}
