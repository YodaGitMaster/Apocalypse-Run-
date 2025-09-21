import * as THREE from 'three';
import { Flashlight } from './Flashlight';
import { InputManager } from './InputManager';

export class PlayerController {
    private camera: THREE.PerspectiveCamera;
    private inputManager: InputManager;
    private directionArrow: THREE.Mesh;
    private flashlight!: Flashlight;
    private mazeGenerator?: any; // Reference to maze for collision detection

    // Movement properties
    private velocity = new THREE.Vector3();
    private isOnGround = false;
    private groundY = 0; // Ground level

    // Physics constants
    private readonly moveSpeed = 1.5; // 50% faster than before
    private readonly backwardSpeedMultiplier = 0.3; // 50% faster (was 0.2, now 0.3)
    private readonly jumpSpeed = 6.0;
    private readonly gravity = -25.0;
    private readonly mouseSensitivity = 0.002;

    // Camera constraints
    private readonly maxPitch = Math.PI / 6; // 30 degrees up
    private readonly minPitch = -Math.PI / 6; // 30 degrees down
    private readonly maxYaw = Math.PI / 3; // 60 degrees right
    private readonly minYaw = -Math.PI / 3; // 60 degrees left

    // Mouse smoothing/lag
    private currentPitch = 0;
    private currentYawOffset = 0;
    private targetPitch = 0;
    private targetYawOffset = 0;
    private readonly mouseSmoothingFactor = 0.024; // 70% slower (0.08 * 0.3)

    // Initial yaw reference
    private initialYaw = 0;

    // Body rotation (separate from camera look direction)
    private bodyYaw = 0;
    private targetBodyYaw = 0;
    private readonly bodyRotationSpeed = 1.0; // radians per second for continuous A/D rotation

    // Player dimensions
    private readonly eyeHeight = 1.6;

    constructor(camera: THREE.PerspectiveCamera, inputManager: InputManager, scene?: THREE.Scene, mazeGenerator?: any) {
        this.camera = camera;
        this.inputManager = inputManager;
        this.mazeGenerator = mazeGenerator;

        // Set initial position
        this.camera.position.set(0, this.groundY + this.eyeHeight, 5);
        this.camera.rotation.order = 'YXZ'; // Important for FPS camera

        // Store initial yaw direction
        this.initialYaw = this.camera.rotation.y;
        this.bodyYaw = this.camera.rotation.y;
        this.targetBodyYaw = this.camera.rotation.y;

        // Initialize smooth mouse look
        this.currentPitch = this.camera.rotation.x;
        this.currentYawOffset = 0;
        this.targetPitch = this.currentPitch;
        this.targetYawOffset = this.currentYawOffset;

        // Create direction arrow
        this.createDirectionArrow();

        // Initialize flashlight if scene is provided
        if (scene) {
            this.flashlight = new Flashlight(this.camera, scene);
        }
    }

    update(deltaTime: number): void {
        if (!this.inputManager.isPointerLocked()) return;

        this.handleMouseLook();
        this.handleMovement(deltaTime);
        this.handleFlashlightControls();
        this.applyPhysics(deltaTime);
        this.updateDirectionArrow();
        this.updateFlashlight();
    }

    private handleMouseLook(): void {
        const mouseDelta = this.inputManager.getMouseDelta();

        // Update target rotations based on mouse input
        this.targetYawOffset -= mouseDelta.x * this.mouseSensitivity;
        this.targetPitch -= mouseDelta.y * this.mouseSensitivity;

        // Constrain target yaw offset to ±60 degrees from body direction
        this.targetYawOffset = Math.max(
            this.minYaw,
            Math.min(this.maxYaw, this.targetYawOffset)
        );

        // Constrain target pitch
        this.targetPitch = Math.max(
            this.minPitch,
            Math.min(this.maxPitch, this.targetPitch)
        );

        // Smoothly interpolate current rotations toward targets
        this.currentYawOffset += (this.targetYawOffset - this.currentYawOffset) * this.mouseSmoothingFactor;
        this.currentPitch += (this.targetPitch - this.currentPitch) * this.mouseSmoothingFactor;

        // Apply smoothed rotations to camera
        this.camera.rotation.y = this.bodyYaw + this.currentYawOffset;
        this.camera.rotation.x = this.currentPitch;
    }

    private handleMovement(deltaTime: number): void {
        const keys = this.inputManager.getKeys();

        // Handle continuous body rotation with A/D keys
        if (keys.has('KeyA')) {
            // Rotate body RIGHT continuously (inverted)
            this.targetBodyYaw += this.bodyRotationSpeed * deltaTime;
        } else if (keys.has('KeyD')) {
            // Rotate body LEFT continuously (inverted)
            this.targetBodyYaw -= this.bodyRotationSpeed * deltaTime;
        }

        // Smoothly interpolate body rotation (same speed as head movement)
        this.bodyYaw += (this.targetBodyYaw - this.bodyYaw) * this.mouseSmoothingFactor;

        // Calculate movement direction based on BODY rotation (not camera)
        const forward = new THREE.Vector3(0, 0, -1);

        // Apply body rotation to movement vector
        const bodyQuaternion = new THREE.Quaternion();
        bodyQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.bodyYaw);
        forward.applyQuaternion(bodyQuaternion);

        // Calculate desired movement with different speeds for forward/backward
        const moveVector = new THREE.Vector3();
        let currentMoveSpeed = this.moveSpeed;

        if (keys.has('KeyW')) {
            moveVector.add(forward);
            // Forward movement at normal speed
        }
        if (keys.has('KeyS')) {
            moveVector.sub(forward);
            // Backward movement is 120% slower (20% of normal speed)
            currentMoveSpeed *= this.backwardSpeedMultiplier;
        }

        // Apply speed and smooth movement
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.multiplyScalar(currentMoveSpeed);

            // Apply smooth movement (same lag as rotation)
            const targetVelX = moveVector.x;
            const targetVelZ = moveVector.z;

            this.velocity.x += (targetVelX - this.velocity.x) * this.mouseSmoothingFactor;
            this.velocity.z += (targetVelZ - this.velocity.z) * this.mouseSmoothingFactor;
        } else {
            // Apply friction when not moving (smoother stop)
            this.velocity.x *= (1 - this.mouseSmoothingFactor);
            this.velocity.z *= (1 - this.mouseSmoothingFactor);
        }

        // Handle jumping
        if (keys.has('Space') && this.isOnGround) {
            this.velocity.y = this.jumpSpeed;
            this.isOnGround = false;
        }
    }

    private applyPhysics(deltaTime: number): void {
        // Apply gravity
        this.velocity.y += this.gravity * deltaTime;

        // Store old position for collision detection
        const oldPosition = this.camera.position.clone();

        // Calculate new position
        const newPosition = this.camera.position.clone();
        newPosition.addScaledVector(this.velocity, deltaTime);

        // Check wall collisions before applying movement
        const collisionCheckedPosition = this.checkWallCollisions(oldPosition, newPosition);
        this.camera.position.copy(collisionCheckedPosition);

        // Ground collision
        if (this.camera.position.y <= this.groundY + this.eyeHeight) {
            this.camera.position.y = this.groundY + this.eyeHeight;
            this.velocity.y = 0;
            this.isOnGround = true;
        } else {
            this.isOnGround = false;
        }
    }

    private checkWallCollisions(oldPos: THREE.Vector3, newPos: THREE.Vector3): THREE.Vector3 {
        if (!this.mazeGenerator) return newPos;

        const playerRadius = 0.15; // Reduced radius for better passage navigation
        const checkedPos = newPos.clone();

        // Check X axis collision independently
        if (this.isWallAtPosition(checkedPos.x + playerRadius, checkedPos.z) ||
            this.isWallAtPosition(checkedPos.x - playerRadius, checkedPos.z)) {
            checkedPos.x = oldPos.x; // Block X movement only
            this.velocity.x = 0; // Stop X velocity
        }

        // Check Z axis collision independently (use updated X position)
        if (this.isWallAtPosition(checkedPos.x, checkedPos.z + playerRadius) ||
            this.isWallAtPosition(checkedPos.x, checkedPos.z - playerRadius)) {
            checkedPos.z = oldPos.z; // Block Z movement only
            this.velocity.z = 0; // Stop Z velocity
        }

        // Remove aggressive diagonal blocking - allow sliding along walls

        return checkedPos;
    }

    private isWallAtPosition(worldX: number, worldZ: number): boolean {
        if (!this.mazeGenerator) return false;

        const dimensions = this.mazeGenerator.getDimensions();
        const cells = this.mazeGenerator.getCells();

        // Convert world coordinates to cell coordinates with better rounding
        const cellX = Math.round((worldX / dimensions.cellSize) + (dimensions.width / 2));
        const cellZ = Math.round((worldZ / dimensions.cellSize) + (dimensions.height / 2));

        // Check bounds with small tolerance
        if (cellX < 0 || cellX >= dimensions.width || cellZ < 0 || cellZ >= dimensions.height) {
            return true; // Treat out of bounds as walls
        }

        // Check if cell is a wall
        return cells[cellX][cellZ].type === 'wall';
    }

    private createDirectionArrow(): void {
        // Create arrow geometry - smaller, subtle triangle pointing forward
        const arrowGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            // Triangle pointing in -Z direction (forward in Three.js) - reduced size
            0.0, 0.0, -0.6,   // tip (forward) - was -1.2
            -0.25, 0.0, 0.15, // left back - was -0.5, 0.3
            0.25, 0.0, 0.15,  // right back - was 0.5, 0.3
        ]);
        arrowGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        // Create subtle, transparent material
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0x880000, // Darker red color (less intense)
            transparent: true,
            opacity: 0.4, // More transparent
            side: THREE.DoubleSide, // Visible from both sides
            depthTest: false, // Always visible, not occluded
            depthWrite: false, // Don't write to depth buffer
        });

        this.directionArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        this.directionArrow.renderOrder = 1000; // Render on top
        this.directionArrow.matrixAutoUpdate = true; // Ensure transforms update
    }

    private updateDirectionArrow(): void {
        // Position arrow in front of the player, not directly underneath
        this.directionArrow.position.copy(this.camera.position);
        this.directionArrow.position.y = this.groundY + 0.1; // Much closer to floor

        // Move arrow forward in the body direction
        const forwardDistance = 2.0; // Distance in front of player
        const forwardOffset = new THREE.Vector3(0, 0, -forwardDistance);
        forwardOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.bodyYaw);
        this.directionArrow.position.add(forwardOffset);

        // Rotate arrow to match body direction (not camera direction)
        this.directionArrow.rotation.y = this.bodyYaw;

        // Debug: Log arrow position occasionally
        if (Math.random() < 0.01) { // Log 1% of the time
            console.log('Direction arrow (subtle):', this.directionArrow.position);
            console.log('Arrow rotation:', this.directionArrow.rotation.y);
            console.log('Body yaw:', this.bodyYaw);
        }
    }

    private easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Getters for external systems
    getPosition(): THREE.Vector3 {
        return this.camera.position.clone();
    }

    getVelocity(): THREE.Vector3 {
        return this.velocity.clone();
    }

    isPlayerOnGround(): boolean {
        return this.isOnGround;
    }

    // Method to set ground level (for future terrain integration)
    setGroundLevel(y: number): void {
        this.groundY = y;
    }

    private handleFlashlightControls(): void {
        if (!this.flashlight) return;

        const keys = this.inputManager.getKeys();

        // Toggle flashlight with F key
        if (keys.has('KeyF')) {
            // Prevent rapid toggling by checking if key was just pressed
            if (!this.inputManager.wasKeyPressed('KeyF')) {
                this.flashlight.toggle();
                this.inputManager.markKeyPressed('KeyF');
            }
        } else {
            this.inputManager.markKeyReleased('KeyF');
        }

        // Change flashlight level with number keys 1-5
        for (let i = 1; i <= 5; i++) {
            const keyCode = `Digit${i}`;
            if (keys.has(keyCode)) {
                if (!this.inputManager.wasKeyPressed(keyCode)) {
                    this.flashlight.setLevel(i);
                    this.inputManager.markKeyPressed(keyCode);
                }
            } else {
                this.inputManager.markKeyReleased(keyCode);
            }
        }
    }

    private updateFlashlight(): void {
        if (!this.flashlight) return;

        // Calculate camera forward direction
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        // Update flashlight position and direction
        this.flashlight.update(this.camera.position, direction);
    }

    // Get direction arrow for adding to scene
    getDirectionArrow(): THREE.Mesh {
        return this.directionArrow;
    }

    // Get flashlight for external access
    getFlashlight(): Flashlight | undefined {
        return this.flashlight;
    }
}
