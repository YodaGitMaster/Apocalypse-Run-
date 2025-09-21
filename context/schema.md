# Data Structures & Schema

## File Structure
- `/src/` - TypeScript source code
- `/assets/` - Game assets (maps, textures, sounds)
- `/context/` - Project documentation

## Key Data Types

### Math Types
```typescript
type Vec3 = [number, number, number]
type Mat4 = Float32Array // 16 elements, column-major
```

### Camera State
```typescript
interface Camera {
  pos: Vec3
  yaw: number    // horizontal rotation
  pitch: number  // vertical rotation (clamped)
  speed: number
  sensitivity: number
}
```

### Input Bindings
```typescript
interface InputState {
  keys: Set<string>     // active keycodes
  mouseMovement: Vec2   // frame delta
  pointerLocked: boolean
}
```

### WebGPU Resources
```typescript
interface GPUContext {
  device: GPUDevice
  canvas: HTMLCanvasElement
  context: GPUCanvasContext
  renderPipeline: GPURenderPipeline
}
```

## Current WebGL2 Implementation
- Vertex format: position(3) + normal(3) + color(3) = 9 floats/vertex
- Uniform: ViewProjection matrix + Model matrix
- Simple Lambert lighting in fragment shader
