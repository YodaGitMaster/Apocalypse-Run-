# Quake Arena WebGPU

A browser-based Quake Arena-style FPS game built with WebGPU and TypeScript.

## Features

- **WebGPU Rendering**: Modern graphics API with compute shader support
- **FPS Camera**: Smooth first-person controls with mouse look and WASD movement
- **Physics Ready**: Prepared for Rapier physics integration
- **TypeScript**: Full type safety for complex 3D math and game logic
- **Modern Architecture**: ECS-ready design for scalable game systems

## Getting Started

### Prerequisites

- Node.js 18+ 
- A modern browser with WebGPU support (Chrome 113+, Edge 113+)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to `http://localhost:3000`

### Building

```bash
npm run build
npm run preview
```

## Controls

- **Click**: Lock mouse pointer
- **WASD**: Move around
- **Mouse**: Look around
- **Space**: Jump
- **ESC**: Release mouse pointer

## Architecture

```
/src
├── main.ts          # Game loop and initialization
├── gpu.ts           # WebGPU device and context setup
├── renderer.ts      # Render pipeline and draw calls
├── camera.ts        # FPS camera with physics
├── input.ts         # Keyboard and mouse handling
├── geometry.ts      # Mesh creation utilities
├── math/
│   ├── vec3.ts      # 3D vector operations
│   └── mat4.ts      # 4x4 matrix operations
└── shaders/
    └── standard.wgsl # Vertex and fragment shaders
```

## WebGPU Support

This game requires WebGPU support. Check compatibility:
- Chrome/Edge 113+ (stable)
- Firefox: Behind flag (experimental)
- Safari: In development

## Next Steps

- [ ] Integrate Rapier physics engine
- [ ] Implement ECS architecture
- [ ] Add weapon systems
- [ ] Create map loading
- [ ] Add multiplayer networking
- [ ] Implement game modes (Deathmatch, Team Deathmatch)
- [ ] Add particle effects and post-processing

## Development Notes

The project is structured for easy expansion:
- Modular renderer supports multiple render passes
- Input system ready for customizable key bindings  
- Math library optimized for game performance
- Shader system prepared for advanced effects
