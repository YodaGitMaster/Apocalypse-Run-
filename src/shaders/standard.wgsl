struct Uniforms {
    viewProjection: mat4x4<f32>,
    model: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) color: vec3<f32>,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) normal: vec3<f32>,
    @location(1) color: vec3<f32>,
    @location(2) worldPos: vec3<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    
    let worldPos = uniforms.model * vec4<f32>(input.position, 1.0);
    output.position = uniforms.viewProjection * worldPos;
    output.worldPos = worldPos.xyz;
    
    // Transform normal to world space
    output.normal = (uniforms.model * vec4<f32>(input.normal, 0.0)).xyz;
    output.color = input.color;
    
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    let lightDir = normalize(vec3<f32>(0.5, 0.9, 0.3));
    let normal = normalize(input.normal);
    
    // Simple Lambert lighting
    let lambert = max(dot(normal, lightDir), 0.0);
    let ambient = 0.2;
    let lighting = ambient + (1.0 - ambient) * lambert;
    
    let finalColor = input.color * lighting;
    
    return vec4<f32>(finalColor, 1.0);
}
