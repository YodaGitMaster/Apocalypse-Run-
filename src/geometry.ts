import { Vec3 } from './math/vec3';

export interface Vertex {
    position: Vec3;
    normal: Vec3;
    color: Vec3;
}

export interface Mesh {
    vertices: Vertex[];
    indices?: number[];
}

export function createCube(color: Vec3 = [0.9, 0.9, 0.95]): Mesh {
    const vertices: Vertex[] = [
        // Front face
        { position: [-1, -1, 1], normal: [0, 0, 1], color },
        { position: [1, -1, 1], normal: [0, 0, 1], color },
        { position: [1, 1, 1], normal: [0, 0, 1], color },
        { position: [-1, 1, 1], normal: [0, 0, 1], color },

        // Back face
        { position: [-1, -1, -1], normal: [0, 0, -1], color },
        { position: [-1, 1, -1], normal: [0, 0, -1], color },
        { position: [1, 1, -1], normal: [0, 0, -1], color },
        { position: [1, -1, -1], normal: [0, 0, -1], color },

        // Top face
        { position: [-1, 1, -1], normal: [0, 1, 0], color },
        { position: [-1, 1, 1], normal: [0, 1, 0], color },
        { position: [1, 1, 1], normal: [0, 1, 0], color },
        { position: [1, 1, -1], normal: [0, 1, 0], color },

        // Bottom face
        { position: [-1, -1, -1], normal: [0, -1, 0], color },
        { position: [1, -1, -1], normal: [0, -1, 0], color },
        { position: [1, -1, 1], normal: [0, -1, 0], color },
        { position: [-1, -1, 1], normal: [0, -1, 0], color },

        // Right face
        { position: [1, -1, -1], normal: [1, 0, 0], color },
        { position: [1, 1, -1], normal: [1, 0, 0], color },
        { position: [1, 1, 1], normal: [1, 0, 0], color },
        { position: [1, -1, 1], normal: [1, 0, 0], color },

        // Left face
        { position: [-1, -1, -1], normal: [-1, 0, 0], color },
        { position: [-1, -1, 1], normal: [-1, 0, 0], color },
        { position: [-1, 1, 1], normal: [-1, 0, 0], color },
        { position: [-1, 1, -1], normal: [-1, 0, 0], color },
    ];

    const indices = [
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // back
        8, 9, 10, 8, 10, 11,   // top
        12, 13, 14, 12, 14, 15,   // bottom
        16, 17, 18, 16, 18, 19,   // right
        20, 21, 22, 20, 22, 23,   // left
    ];

    return { vertices, indices };
}

export function createPlane(width: number = 2, height: number = 2, color: Vec3 = [0.7, 0.8, 0.9]): Mesh {
    const hw = width / 2;
    const hh = height / 2;

    const vertices: Vertex[] = [
        { position: [-hw, 0, -hh], normal: [0, 1, 0], color },
        { position: [hw, 0, -hh], normal: [0, 1, 0], color },
        { position: [hw, 0, hh], normal: [0, 1, 0], color },
        { position: [-hw, 0, hh], normal: [0, 1, 0], color },
    ];

    const indices = [0, 1, 2, 0, 2, 3];

    return { vertices, indices };
}

export function meshToFloat32Array(mesh: Mesh): Float32Array {
    const vertexData: number[] = [];

    if (mesh.indices) {
        // Use indices to create triangulated vertex data
        for (const index of mesh.indices) {
            const vertex = mesh.vertices[index];
            vertexData.push(
                ...vertex.position,
                ...vertex.normal,
                ...vertex.color
            );
        }
    } else {
        // Direct vertex data
        for (const vertex of mesh.vertices) {
            vertexData.push(
                ...vertex.position,
                ...vertex.normal,
                ...vertex.color
            );
        }
    }

    return new Float32Array(vertexData);
}
