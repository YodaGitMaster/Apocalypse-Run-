export interface InputState {
    keys: Set<string>;
    mouseMovement: [number, number];
    pointerLocked: boolean;
}

export class InputManager {
    private keys = new Set<string>();
    private mouseMovement: [number, number] = [0, 0];
    private pointerLocked = false;

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys.add(e.code);

            // Prevent default for game keys
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });

        // Mouse events
        document.addEventListener('mousemove', (e) => {
            if (this.pointerLocked) {
                this.mouseMovement[0] += e.movementX;
                this.mouseMovement[1] += e.movementY;
            }
        });

        // Pointer lock events
        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = document.pointerLockElement !== null;
        });

        document.addEventListener('pointerlockerror', () => {
            console.warn('Pointer lock error');
            this.pointerLocked = false;
        });

        // Blur event to clear keys when window loses focus
        window.addEventListener('blur', () => {
            this.keys.clear();
        });
    }

    requestPointerLock(element: HTMLElement) {
        try {
            // Try with unadjusted movement first
            element.requestPointerLock({ unadjustedMovement: true });
        } catch {
            // Fallback to standard pointer lock
            try {
                element.requestPointerLock();
            } catch (error) {
                console.warn('Failed to request pointer lock:', error);
            }
        }
    }

    getState(): InputState {
        const state: InputState = {
            keys: new Set(this.keys),
            mouseMovement: [...this.mouseMovement],
            pointerLocked: this.pointerLocked,
        };

        // Reset mouse movement after reading
        this.mouseMovement[0] = 0;
        this.mouseMovement[1] = 0;

        return state;
    }

    isKeyPressed(keyCode: string): boolean {
        return this.keys.has(keyCode);
    }

    isAnyKeyPressed(keyCodes: string[]): boolean {
        return keyCodes.some(code => this.keys.has(code));
    }
}
