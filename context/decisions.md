# Technical Decisions & Rationale

**Last Updated**: 2025-09-21

## Core Technology Stack

### WebGPU over WebGL2
**Decision**: Migrate from existing WebGL2 to WebGPU
**Rationale**: 
- Modern API with compute shader support
- Better performance characteristics
- Future-proof (WebGL2 maintenance mode)
- Required for advanced effects (shadows, post-processing)

### TypeScript over JavaScript
**Decision**: Use TypeScript for entire codebase
**Rationale**:
- Type safety for complex 3D math
- Better IDE support for large codebase
- Easier refactoring as project grows
- Industry standard for serious game development

### ECS Architecture
**Decision**: Entity-Component-System pattern
**Rationale**:
- Scalable for complex game objects
- Performance benefits (data-oriented design)
- Easier to add new behaviors/systems
- Standard in modern game engines

### Rapier Physics
**Decision**: Use Rapier physics engine
**Rationale**:
- WebAssembly performance
- Full 3D rigid body simulation
- Active development/maintenance
- Good TypeScript bindings

## Rendering Decisions

### Vertex Format
**Keep**: position + normal + color (9 floats)
**Rationale**: Existing prototype works well, simple to migrate

### Coordinate System
**Keep**: Right-handed, Y-up coordinate system
**Rationale**: Matches existing prototype, OpenGL convention

## Abandoned Approaches
- Three.js: Too high-level, want direct WebGPU control
- Custom physics: Too complex, Rapier is mature solution
