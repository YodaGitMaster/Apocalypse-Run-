import * as THREE from 'three';
import { InputManager } from './InputManager';

export class PlayerController {
    private camera: THREE.PerspectiveCamera;
    private inputManager: InputManager;
    private directionArrow: THREE.Mesh;

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

    constructor(camera: THREE.PerspectiveCamera, inputManager: InputManager) {
        this.camera = camera;
        this.inputManager = inputManager;

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
    }

    update(deltaTime: number): void {
        if (!this.inputManager.isPointerLocked()) return;

        this.handleMouseLook();
        this.handleMovement(deltaTime);
        this.applyPhysics(deltaTime);
        this.updateDirectionArrow();
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
        if (!this.isOnGround) {
            this.velocity.y += this.gravity * deltaTime;
        }

        // Update position
        const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
        this.camera.position.add(deltaPosition);

        // Ground collision
        const groundLevel = this.groundY + this.eyeHeight;
        if (this.camera.position.y <= groundLevel) {
            this.camera.position.y = groundLevel;
            this.velocity.y = 0;
            this.isOnGround = true;
        }

        // Simple boundary constraints (optional)
        const maxDistance = 45; // Keep player within reasonable bounds
        this.camera.position.x = Math.max(-maxDistance, Math.min(maxDistance, this.camera.position.x));
        this.camera.position.z = Math.max(-maxDistance, Math.min(maxDistance, this.camera.position.z));
    }

    private createDirectionArrow(): void {
        // Create arrow geometry - larger, more visible triangle pointing forward
        const arrowGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            // Triangle pointing in -Z direction (forward in Three.js)
            0.0, 0.0, -1.2,   // tip (forward)
            -0.5, 0.0, 0.3,   // left back
            0.5, 0.0, 0.3,    // right back
        ]);
        arrowGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        // Create semi-transparent material - temporarily very visible for debugging
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000, // Bright red color for visibility
            transparent: true,
            opacity: 1.0, // Fully visible for testing
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
        this.directionArrow.position.y = this.groundY + 0.5; // Higher above ground for visibility

        // Move arrow forward in the body direction
        const forwardDistance = 2.0; // Distance in front of player
        const forwardOffset = new THREE.Vector3(0, 0, -forwardDistance);
        forwardOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.bodyYaw);
        this.directionArrow.position.add(forwardOffset);

        // Rotate arrow to match body direction (not camera direction)
        this.directionArrow.rotation.y = this.bodyYaw;

        // Debug: Log arrow position occasionally
        if (Math.random() < 0.01) { // Log 1% of the time
            console.log('Arrow position:', this.directionArrow.position);
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

    // Get direction arrow for adding to scene
    getDirectionArrow(): THREE.Mesh {
        return this.directionArrow;
    }
}
