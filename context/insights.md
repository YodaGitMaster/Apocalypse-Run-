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
- **Directional Lighting**: Blue and red SpotLights pointing downward (no wall bleeding)
- **Focused Illumination**: 30-degree cone angle with 6-unit range for localized lighting
- **Enhanced Shadows**: Proper shadow camera settings prevent light leakage through walls
- **Game Flow**: Automatic detection within 2.0 units, overlay restart screen
- **Performance**: Pulsing lights use requestAnimationFrame for smooth animation
- **UX**: Click-to-restart keeps gameplay flow smooth and intuitive

## Lootbox System Implementation (2025-09-21)
- **Balanced Rarity Distribution**: Controlled percentages for optimal gameplay balance
- **Legendary**: Exactly 1 per game with fallback system (IDEAL: >60% from both start+end, FALLBACK: >50% from start OR end, GUARANTEED: last position)
- **Epic**: Exactly 1 per game (IDEAL: >50% from start, GUARANTEED: last 4 positions if not placed)
- **Rare**: Maximum 2 per game (IDEAL: >30% from start, GUARANTEED: at least 1 in last 3 positions)
- **Common**: All remaining boxes, close to start point or fallback positions
- **Spawning**: 10-15 lootboxes per maze with intelligent distribution
- **Guaranteed Start**: Always places one lootbox in the player's starting room
- **Grid Distribution**: 4x4 section-based placement prevents clustering across maze
- **Spacing Algorithm**: 12-unit minimum distance between lootboxes for better spread
- **Point Values**: 10/25/50/100 points for Common/Rare/Epic/Legendary
- **Visual Design**: Rarity-colored boxes with glow effects and particle systems
- **Collection Effects**: Burst particle animation with physics-based movement
- **Performance**: Efficient geometry reuse and automatic cleanup on restart

## Navigation System (2025-09-21)
- **Navigation Boxes**: Maximum 3 special diamond-shaped boxes per maze
- **Distinctive Shape**: Octahedron geometry with cyan color and rotating rings
- **Strategic Placement**: Spawn 8-20 units near legendary boxes for maximum value
- **Legendary Proximity**: Prioritizes placement around the most valuable lootboxes
- **Extended Duration**: Navigation lines now last 60 seconds (1 minute) instead of 30
- **Exit Guidance**: 60-second animated line pointing directly to maze exit
- **Visual Effects**: Color-shifting pulsing line with arc trajectory for visibility
- **Automatic Cleanup**: Lines expire after 60 seconds and are removed from scene
- **Debug Integration**: Navigation boxes appear as cyan markers in debug mode
- **Strategic Value**: Provides temporary navigation aid for lost players

## Power Management System (2025-09-21)
- **Massive Battery**: 6000 power units for extended gameplay sessions
- **Flashlight-Only Consumption**: Battery ONLY drains when flashlight is turned on
- **CRITICAL BUG FIXED**: `updateFlashlightConfig()` was overriding `intensity = 0` on level changes
- **Conditional Intensity Updates**: Config updates only modify intensity when `isOn = true`
- **Floating-Point Safety**: PowerManager uses `intensity > 0.001` threshold for consumption
- **Extended Durations**: L1=12min, L2=5min, L3=3min, L4=2min, L5=1min on full battery
- **Tiered Flashlight Consumption**: L1 low drain (5/s), L2-3 medium drain (20-33/s), L4-5 high drain (30-60/s)
- **Dynamic Consumption**: Real-time adjustment when flashlight level changes
- **Premium Energy Rewards**: Lootboxes provide 1080-6000 power units (18-100%+ of battery), with legendary boxes capable of overcharging beyond max capacity
- **Strategic Gameplay**: Higher flashlight levels require frequent lootbox collection
- **TRUE Infinite Standby**: Battery never drains when flashlight is off (bug fixed)
- **Detailed Logging**: Console logs track intensity changes and consumption for debugging
- **Visual Feedback**: Power surge effect when collecting lootboxes
- **HUD Integration**: Real-time power display with consumption rate and time remaining

## Audio System Implementation (2025-09-21)
- **Atmospheric Music**: Horror background tracks with smooth fade transitions
- **Dynamic Ambience**: Music changes based on power level (normal vs low power)
- **Procedural SFX**: Web Audio API generated sounds for interactions
- **Rarity-Based Audio**: Different collection sounds for lootbox rarities
- **Power Audio Cues**: Warning sounds for low power, gain sounds for charging
- **Flashlight Integration**: Toggle sounds with on/off audio feedback
- **Game State Audio**: Specific tracks for game start, game over, and restart
- **Performance Optimized**: Efficient audio loading and memory management

## Debug Mode System (2025-09-21)
- **Physics-Free Camera**: Completely disabled gravity and physics in debug mode
- **Mouse Tilt Controls**: Right-click drag to tilt view (±30° pitch/roll max)
- **Interactive Clicking**: Left-click on markers to see detailed information
- **Information Popups**: Real-time display of electricity values and item details
- **Raycasting System**: Precise 3D object picking for accurate interactions
- **Locked Position**: Camera continuously locked above maze center, immune to physics
- **Zoom Controls**: Mouse wheel (smooth) and +/- keys for height adjustment (30-200 units)
- **No Player Updates**: Player controller disabled to prevent movement/falling
- **Continuous Locking**: Camera position enforced every frame to prevent drift
- **Roof Removal**: Automatically hides roof meshes (Y > 2.5) for unobstructed view
- **Full Lighting**: Bright ambient, directional, and hemisphere lights for visibility
- **Enhanced Markers**: Much larger (15-unit tall) cylinders with glowing outlines
- **Text Labels**: Multi-line floating text with black backgrounds and colored borders
- **Clickable Elements**: All markers (spawn, exit, lootboxes) respond to mouse clicks
- **Electricity Display**: Shows exact charge values (180-1080 units) for each lootbox
- **Status Information**: Displays collection status and point values
- **Mouse Cursor Management**: Multi-layered approach to force cursor visibility
- **CSS Override Solution**: Uses debug-mode class with !important rules
- **Pointer Lock Control**: Releases pointer lock with timing delay for reliability
- **Multi-Element Targeting**: Sets cursor on body, canvas, and documentElement
- **Click Prevention**: Prevents game from capturing mouse while in debug mode
- **Context Menu Disabled**: Right-click context menu disabled in debug mode
- **Toggle Control**: Backtick (`) key for instant debug mode on/off
- **HUD Integration**: Shows all control options and real-time statistics
- **State Preservation**: Restores normal view, physics, and mouse controls when exiting