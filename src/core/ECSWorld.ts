import { IWorld } from 'bitecs';

export class ECSWorld {
    private world: IWorld;
    private systems: Array<(world: IWorld, deltaTime: number) => void> = [];

    constructor(world: IWorld) {
        this.world = world;
        console.log('🔧 ECS world initialized');
    }

    addSystem(system: (world: IWorld, deltaTime: number) => void): void {
        this.systems.push(system);
    }

    update(deltaTime: number): void {
        // Run all systems
        for (const system of this.systems) {
            system(this.world, deltaTime);
        }
    }

    getWorld(): IWorld {
        return this.world;
    }
}
