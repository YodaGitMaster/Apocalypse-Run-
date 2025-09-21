# Key Insights & Findings

**Last Updated**: 2025-09-21

## Existing Prototype Analysis
- **High quality baseline**: WebGL2 prototype has solid FPS controls, rendering
- **Math utilities**: Complete matrix/vector ops already implemented
- **Performance**: Runs at 60fps with basic geometry
- **Input handling**: Pointer lock + WASD working correctly

## WebGPU Migration Considerations
- **Shader language**: WGSL vs GLSL syntax differences
- **Pipeline creation**: More explicit than WebGL2
- **Buffer management**: More manual resource management
- **Coordinate differences**: NDC coordinates differ from OpenGL

## Performance Observations
- **Existing**: Handles basic arena geometry smoothly
- **Target**: Need to scale to complex maps, multiple players
- **Bottlenecks**: Likely draw calls, not vertex/fragment processing

## Development Strategy
- **Incremental migration**: Keep prototype running while building new version
- **Feature parity first**: Match existing functionality before adding new features
- **Modular architecture**: Clean separation for easier testing/debugging

## Critical Bug Fix (2025-09-21)
- **Root Cause**: Missing WebGPU TypeScript type definitions prevented compilation
- **Solution**: Added `@webgpu/types` to tsconfig.json and fixed Vec3 type annotations
- **Lesson**: Always check TypeScript compilation errors before debugging complex graphics issues

## Exit Point System Implementation (2025-09-21)
- **Algorithm**: Distance-based selection from farthest 25% of spawn candidates
- **Visual Cues**: Blue pulsing light at spawn, red pulsing light at exit
- **Game Flow**: Automatic detection within 2.0 units, overlay restart screen
- **Performance**: Pulsing lights use requestAnimationFrame for smooth animation
- **UX**: Click-to-restart keeps gameplay flow smooth and intuitive

## Lootbox System Implementation (2025-09-21)
- **Spawning**: 8-15 lootboxes per maze with smart distance-based placement
- **Rarity System**: 4 tiers (Common 50%, Rare 30%, Epic 15%, Legendary 5%)
- **Point Values**: 10/25/50/100 points for Common/Rare/Epic/Legendary
- **Visual Design**: Rarity-colored boxes with glow effects and particle systems
- **Collection Effects**: Burst particle animation with physics-based movement
- **Performance**: Efficient geometry reuse and automatic cleanup on restart