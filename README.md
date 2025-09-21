# Apocalypse Run

A modern 3D first-person shooter game built with TypeScript, Three.js, and Rapier3D physics engine. This project implements an Entity Component System (ECS) architecture for optimal performance and maintainability.

## 🎮 Features

- **3D Graphics**: Powered by Three.js for high-performance WebGL rendering
- **Physics Engine**: Realistic physics simulation using Rapier3D
- **ECS Architecture**: Entity Component System for efficient game object management
- **Modern TypeScript**: Full type safety and modern JavaScript features
- **WebGL Shaders**: Custom shaders for enhanced visual effects
- **Audio System**: 3D spatial audio with Howler.js
- **Input Management**: Responsive keyboard and mouse controls
- **Modular Design**: Clean, maintainable codebase with separation of concerns

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YodaGitMaster/Apocalypse-Run-.git
cd Apocalypse-Run-
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🏗️ Project Structure

```
src/
├── core/                 # Core game systems
│   ├── ECSWorld.ts      # Entity Component System implementation
│   ├── Game.ts          # Main game loop and state management
│   ├── InputManager.ts  # Input handling and controls
│   ├── PhysicsWorld.ts  # Physics simulation wrapper
│   ├── PlayerController.ts # Player movement and camera
│   └── Renderer.ts      # Three.js rendering system
├── main.ts              # Application entry point
└── style.css           # Global styles
```

## 🎯 Core Systems

### Entity Component System (ECS)
- **Entities**: Game objects identified by unique IDs
- **Components**: Data containers for entity properties
- **Systems**: Logic processors that operate on entities with specific components

### Physics System
- Realistic 3D physics simulation
- Collision detection and response
- Rigid body dynamics
- Constraint systems

### Rendering System
- WebGL-based 3D rendering
- Custom shader support
- Lighting and shadow systems
- Post-processing effects

### Input System
- Keyboard and mouse input handling
- Configurable key bindings
- Smooth camera controls
- Responsive movement

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI

### Code Quality

This project enforces strict code quality standards:

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with TypeScript support
- **Prettier**: Consistent code formatting
- **Husky**: Git hooks for pre-commit checks
- **Lint-staged**: Run linters on staged files

## 🎨 Graphics Features

- **Real-time 3D Rendering**: WebGL-powered graphics
- **Dynamic Lighting**: Realistic light and shadow systems
- **Particle Effects**: Visual effects for explosions and impacts
- **Post-processing**: Screen-space effects and filters
- **Texture Mapping**: High-quality texture rendering
- **Model Loading**: Support for 3D model formats

## 🔊 Audio Features

- **3D Spatial Audio**: Positional sound effects
- **Dynamic Music**: Adaptive soundtrack system
- **Sound Effects**: Weapon sounds, footsteps, and ambient audio
- **Audio Occlusion**: Realistic sound propagation

## 🎮 Controls

- **WASD** - Movement
- **Mouse** - Look around
- **Space** - Jump
- **Shift** - Run/Sprint
- **Ctrl** - Crouch
- **E** - Interact
- **R** - Reload
- **1-9** - Weapon selection
- **F** - Flashlight
- **Tab** - Scoreboard
- **Esc** - Menu

## 🔧 Configuration

The game can be configured through various settings:

- **Graphics**: Quality settings, resolution, fullscreen mode
- **Audio**: Volume levels, audio device selection
- **Controls**: Key bindings and sensitivity settings
- **Gameplay**: Difficulty, game mode preferences

## 📦 Dependencies

### Core Dependencies
- **Three.js** (^0.158.0) - 3D graphics library
- **Rapier3D** (^0.13.0) - Physics engine
- **Bitecs** (^0.3.40) - ECS framework
- **Howler.js** (^2.2.4) - Audio library

### Development Dependencies
- **TypeScript** (^5.2.2) - Type system
- **Vite** (^5.0.8) - Build tool and dev server
- **ESLint** (^8.55.0) - Code linting
- **Prettier** (^3.1.1) - Code formatting
- **Vitest** (^1.0.4) - Testing framework

## 🚀 Performance

- **60 FPS Target**: Optimized for smooth gameplay
- **Memory Management**: Efficient resource handling
- **LOD System**: Level-of-detail for distant objects
- **Frustum Culling**: Only render visible objects
- **Instanced Rendering**: Efficient rendering of repeated objects

## 🤝 Contributing

This is a proprietary project. All rights reserved. See the COPYRIGHT file for detailed licensing information.

## 📄 License

Copyright (c) 2025 Apocalypse Run Development Team. All rights reserved.

This software is proprietary and confidential. Unauthorized reproduction, distribution, or modification is strictly prohibited and will result in legal action.

## 🔗 Links

- [Three.js Documentation](https://threejs.org/docs/)
- [Rapier3D Documentation](https://rapier.rs/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/guide/)

---

**Note**: This project is under active development. Features and APIs may change between versions.