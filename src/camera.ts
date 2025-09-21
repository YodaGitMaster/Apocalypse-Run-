import { InputManager, InputState } from './input';
import { Mat4, mat4 } from './math/mat4';
import { Vec3, vec3 } from './math/vec3';

export class Camera {
    public position: Vec3;
    public yaw: number;
    public pitch: number;
    public speed: number;
    public sensitivity: number;

    private velocity: Vec3 = [0, 0, 0];
    private onGround = true;

    // Physics constants
    private readonly gravity = 28;
    private readonly jumpSpeed = 9;
    private readonly groundHeight = 1.2;

    constructor(
        position: Vec3 = [0, 1.2, 10],
        yaw: number = -Math.PI / 2,
        pitch: number = 0,
        speed: number = 10,
        sensitivity: number = 0.0018
    ) {
        this.position = vec3.clone(position);
        this.yaw = yaw;
        this.pitch = pitch;
        this.speed = speed;
        this.sensitivity = sensitivity;
    }

    update(input: InputManager, deltaTime: number) {
        const inputState = input.getState();

        if (inputState.pointerLocked) {
            this.updateLook(inputState);
        }

        this.updateMovement(inputState, deltaTime);
        this.updatePhysics(deltaTime);
    }

    private updateLook(inputState: InputState) {
        const [mouseX, mouseY] = inputState.mouseMovement;

        this.yaw -= mouseX * this.sensitivity;
        this.pitch -= mouseY * this.sensitivity;

        // Clamp pitch to prevent over-rotation
        this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    }

    private updateMovement(inputState: InputState, deltaTime: number) {
        // Calculate movement vectors
        const forward: Vec3 = [
            Math.cos(this.yaw),
            0,
            Math.sin(this.yaw)
        ];

        const right: Vec3 = [
            Math.sin(this.yaw - Math.PI / 2),
            0,
            Math.cos(this.yaw - Math.PI / 2)
        ];

        let moveVector: Vec3 = [0, 0, 0];

        // Handle input
        if (inputState.keys.has('KeyW')) {
            moveVector = vec3.add(moveVector, forward);
        }
        if (inputState.keys.has('KeyS')) {
            moveVector = vec3.subtract(moveVector, forward);
        }
        if (inputState.keys.has('KeyA')) {
            moveVector = vec3.subtract(moveVector, right);
        }
        if (inputState.keys.has('KeyD')) {
            moveVector = vec3.add(moveVector, right);
        }

        // Normalize movement vector
        const moveLength = vec3.length(moveVector);
        if (moveLength > 0) {
            moveVector = vec3.multiply(vec3.normalize(moveVector), this.speed * deltaTime);
            this.position[0] += moveVector[0];
            this.position[2] += moveVector[2];
        }

        // Handle jumping
        if (inputState.keys.has('Space') && this.onGround) {
            this.velocity[1] = this.jumpSpeed;
            this.onGround = false;
        }
    }

    private updatePhysics(deltaTime: number) {
        // Apply gravity
        this.velocity[1] -= this.gravity * deltaTime;

        // Update vertical position
        this.position[1] += this.velocity[1] * deltaTime;

        // Ground collision
        if (this.position[1] <= this.groundHeight) {
            this.position[1] = this.groundHeight;
            this.velocity[1] = 0;
            this.onGround = true;
        }
    }

    getViewMatrix(): Mat4 {
        return mat4.fromYawPitchPosition(this.yaw, this.pitch, this.position);
    }

    getProjectionMatrix(aspect: number): Mat4 {
        return mat4.perspective(60 * Math.PI / 180, aspect, 0.1, 200.0);
    }

    getViewProjectionMatrix(aspect: number): Mat4 {
        const projection = this.getProjectionMatrix(aspect);
        const view = this.getViewMatrix();
        return mat4.multiply(projection, view);
    }

    getForwardVector(): Vec3 {
        return [
            Math.cos(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            Math.sin(this.yaw) * Math.cos(this.pitch)
        ];
    }

    getRightVector(): Vec3 {
        return [
            Math.sin(this.yaw - Math.PI / 2),
            0,
            Math.cos(this.yaw - Math.PI / 2)
        ];
    }

    getUpVector(): Vec3 {
        return [0, 1, 0];
    }
}
