// Import will be handled dynamically
type RapierWorld = any;

export class PhysicsWorld {
    private world!: RapierWorld;
    private RAPIER: any;
    private gravity = { x: 0.0, y: -9.81, z: 0.0 };

    async initialize(): Promise<void> {
        this.RAPIER = await import('@dimforge/rapier3d');
        this.world = new this.RAPIER.World(this.gravity);
        console.log('⚡ Physics world created');

        this.createGround();
    }

    private createGround(): void {
        // Create ground collider
        const groundColliderDesc = this.RAPIER.ColliderDesc.cuboid(50, 0.1, 50)
            .setTranslation(0, -0.1, 0);

        this.world.createCollider(groundColliderDesc);
        console.log('🌍 Ground physics created');
    }

    update(_deltaTime: number): void {
        // Step the physics simulation
        this.world.step();
    }

    getWorld(): any {
        return this.world;
    }

    createRigidBody(desc: any): any {
        return this.world.createRigidBody(desc);
    }

    createCollider(desc: any, parent?: any): any {
        return this.world.createCollider(desc, parent);
    }
}
