export class InputManager {
    private keys = new Set<string>();
    private pressedKeys = new Set<string>(); // Track which keys were just pressed
    private mouseDelta = { x: 0, y: 0 };
    private pointerLocked = false;

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Keyboard events
        document.addEventListener('keydown', (event) => {
            this.keys.add(event.code);

            // Prevent default for game keys
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'KeyF', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(event.code)) {
                event.preventDefault();
            }
        });

        document.addEventListener('keyup', (event) => {
            this.keys.delete(event.code);
        });

        // Mouse events
        document.addEventListener('mousemove', (event) => {
            if (this.pointerLocked) {
                this.mouseDelta.x += event.movementX;
                this.mouseDelta.y += event.movementY;
            }
        });

        // Pointer lock events
        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = document.pointerLockElement !== null;
            console.log('🖱️ Pointer lock:', this.pointerLocked ? 'enabled' : 'disabled');
        });

        document.addEventListener('pointerlockerror', () => {
            console.warn('⚠️ Pointer lock error');
            this.pointerLocked = false;
        });

        // Clear keys when window loses focus
        window.addEventListener('blur', () => {
            this.keys.clear();
            this.pressedKeys.clear();
        });
    }

    requestPointerLock(): void {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            try {
                canvas.requestPointerLock();
            } catch (error) {
                console.warn('Failed to request pointer lock:', error);
            }
        }
    }

    update(): void {
        // Reset mouse delta after each frame
        // (We'll read it before this gets called)
    }

    getKeys(): Set<string> {
        return new Set(this.keys);
    }

    getMouseDelta(): { x: number; y: number } {
        const delta = { ...this.mouseDelta };
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        return delta;
    }

    isPointerLocked(): boolean {
        return this.pointerLocked;
    }

    isKeyPressed(keyCode: string): boolean {
        return this.keys.has(keyCode);
    }

    wasKeyPressed(keyCode: string): boolean {
        return this.pressedKeys.has(keyCode);
    }

    markKeyPressed(keyCode: string): void {
        this.pressedKeys.add(keyCode);
    }

    markKeyReleased(keyCode: string): void {
        this.pressedKeys.delete(keyCode);
    }
}
