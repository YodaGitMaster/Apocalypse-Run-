import { GPUContext } from './gpu';
import { Mat4 } from './math/mat4';

export interface RenderObject {
    vertexBuffer: GPUBuffer;
    indexBuffer?: GPUBuffer;
    vertexCount: number;
    indexCount?: number;
    modelMatrix: Mat4;
}

export class Renderer {
    private device: GPUDevice;
    private context: GPUCanvasContext;
    private depthTexture: GPUTexture;
    private renderPipeline!: GPURenderPipeline;
    private uniformBuffer!: GPUBuffer;
    private bindGroup!: GPUBindGroup;

    constructor(gpu: GPUContext) {
        this.device = gpu.device;
        this.context = gpu.context;
        this.depthTexture = gpu.depthTexture;
        this.initialize();
    }

    private initialize() {
        this.createRenderPipeline();
        this.createUniformBuffer();
    }

    private createRenderPipeline() {
        const shaderCode = `
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
`;

        console.log('Creating shader module...');
        const shaderModule = this.device.createShaderModule({
            code: shaderCode,
        });
        console.log('Shader module created successfully');

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 9 * 4, // 3 position + 3 normal + 3 color = 9 floats
            attributes: [
                {
                    format: 'float32x3',
                    offset: 0,
                    shaderLocation: 0, // position
                },
                {
                    format: 'float32x3',
                    offset: 3 * 4,
                    shaderLocation: 1, // normal
                },
                {
                    format: 'float32x3',
                    offset: 6 * 4,
                    shaderLocation: 2, // color
                },
            ],
        };

        this.renderPipeline = this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main',
                buffers: [vertexBufferLayout],
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [
                    {
                        format: navigator.gpu.getPreferredCanvasFormat(),
                    },
                ],
            },
            primitive: {
                topology: 'triangle-list',
                // Disable culling to avoid vendor-specific winding differences
                cullMode: 'none',
                frontFace: 'ccw',
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            },
        });
    }

    private createUniformBuffer() {
        // Create uniform buffer for view-projection and model matrices
        this.uniformBuffer = this.device.createBuffer({
            size: 128, // 2 * 64 bytes for two 4x4 matrices
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.bindGroup = this.device.createBindGroup({
            layout: this.renderPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer,
                    },
                },
            ],
        });
    }

    createVertexBuffer(data: Float32Array): GPUBuffer {
        const buffer = this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });

        new Float32Array(buffer.getMappedRange()).set(data);
        buffer.unmap();

        return buffer;
    }

    createIndexBuffer(data: Uint16Array): GPUBuffer {
        const buffer = this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.INDEX,
            mappedAtCreation: true,
        });

        new Uint16Array(buffer.getMappedRange()).set(data);
        buffer.unmap();

        return buffer;
    }

    updateDepthTexture(width: number, height: number) {
        if (this.depthTexture.width !== width || this.depthTexture.height !== height) {
            this.depthTexture.destroy();
            this.depthTexture = this.device.createTexture({
                size: [width, height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT,
            });
        }
    }

    render(viewProjectionMatrix: Mat4, objects: RenderObject[]) {
        if (objects.length === 0) {
            console.warn('No objects to render');
            return;
        }

        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: textureView,
                    clearValue: { r: 0.12, g: 0.14, b: 0.2, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            },
        });

        renderPass.setPipeline(this.renderPipeline);
        renderPass.setBindGroup(0, this.bindGroup);

        for (const obj of objects) {
            // Update uniform buffer with matrices
            const uniformData = new Float32Array(32); // 2 * 16 floats
            uniformData.set(viewProjectionMatrix, 0);
            uniformData.set(obj.modelMatrix, 16);

            this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

            renderPass.setVertexBuffer(0, obj.vertexBuffer);

            if (obj.indexBuffer && obj.indexCount) {
                renderPass.setIndexBuffer(obj.indexBuffer, 'uint16');
                renderPass.drawIndexed(obj.indexCount);
            } else {
                renderPass.draw(obj.vertexCount);
            }
        }

        renderPass.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
}
