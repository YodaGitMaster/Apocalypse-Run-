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

### Maze System Types
```typescript
interface MazeCell {
  x: number
  z: number
  type: 'wall' | 'floor' | 'room'
  visited: boolean
  walls: { north: boolean, south: boolean, east: boolean, west: boolean }
}

interface Room {
  x: number, z: number
  width: number, height: number
  centerX: number, centerZ: number
}
```

### Exit Point System
```typescript
interface ExitPointData {
  spawnPosition: THREE.Vector3 | null
  exitPosition: THREE.Vector3 | null
  startLight: THREE.PointLight    // Blue pulsing light at spawn
  exitLight: THREE.PointLight     // Red pulsing light at exit
  gameOver: boolean
}
```

### Lootbox System
```typescript
interface LootboxData {
  id: string
  position: THREE.Vector3
  pointValue: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  collected: boolean
}

interface LootboxStats {
  collected: number    // Number collected
  total: number       // Total spawned
  points: number      // Total points earned
}
```

### Power Management System
```typescript
interface PowerConsumer {
  id: string
  light: THREE.Light
  baseIntensity: number
  consumptionRate: number  // Power units per second
  priority: number        // Higher priority lights stay on longer (1-5)
}

interface PowerStats {
  currentPower: number
  maxPower: number
  consumptionRate: number
  timeRemaining: number   // Estimated seconds until blackout
}
```

## Current WebGL2 Implementation
- Vertex format: position(3) + normal(3) + color(3) = 9 floats/vertex
- Uniform: ViewProjection matrix + Model matrix
- Simple Lambert lighting in fragment shader
- Exit detection: 2.0 unit radius collision check
- Lootbox detection: 1.2 unit radius collision check
- Light animation: requestAnimationFrame pulsing at 0.003 time factor
- Particle effects: Burst animation with gravity on collection
