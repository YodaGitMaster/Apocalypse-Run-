export interface GPUContext {
    device: GPUDevice;
    canvas: HTMLCanvasElement;
    context: GPUCanvasContext;
    format: GPUTextureFormat;
    depthTexture: GPUTexture;
}

export async function initializeGPU(): Promise<GPUContext> {
    // Check WebGPU support
    if (!navigator.gpu) {
        throw new Error('WebGPU not supported - Please use Chrome 113+, Edge 113+, or newer');
    }

    console.log('WebGPU supported, requesting adapter...');

    // Get adapter
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('No WebGPU adapter found - Your GPU may not support WebGPU');
    }

    console.log('WebGPU adapter found:', adapter);

    // Get device
    const device = await adapter.requestDevice();
    console.log('WebGPU device created:', device);

    // Create canvas and context
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
    width: 100vw;
    height: 100vh;
    display: block;
    position: fixed;
    top: 0;
    left: 0;
  `;
    document.body.appendChild(canvas);

    const context = canvas.getContext('webgpu');
    if (!context) {
        throw new Error('Failed to get WebGPU context');
    }

    // Configure context
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format,
        alphaMode: 'opaque',
    });

    // Set initial canvas size
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);

    // Create depth texture
    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    return {
        device,
        canvas,
        context,
        format,
        depthTexture,
    };
}
