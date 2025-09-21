import { Vec3 } from './vec3';

export type Mat4 = Float32Array;

export const mat4 = {
    create(): Mat4 {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    },

    identity(): Mat4 {
        return this.create();
    },

    clone(m: Mat4): Mat4 {
        return new Float32Array(m);
    },

    multiply(a: Mat4, b: Mat4): Mat4 {
        const out = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                out[i * 4 + j] =
                    a[i * 4 + 0] * b[0 * 4 + j] +
                    a[i * 4 + 1] * b[1 * 4 + j] +
                    a[i * 4 + 2] * b[2 * 4 + j] +
                    a[i * 4 + 3] * b[3 * 4 + j];
            }
        }
        return out;
    },

    perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
        const f = 1 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);

        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, (2 * far * near) * nf, 0
        ]);
    },

    lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
        const f0 = [center[0] - eye[0], center[1] - eye[1], center[2] - eye[2]];
        const fLen = Math.hypot(f0[0], f0[1], f0[2]);
        f0[0] /= fLen; f0[1] /= fLen; f0[2] /= fLen;

        const s = [
            f0[1] * up[2] - f0[2] * up[1],
            f0[2] * up[0] - f0[0] * up[2],
            f0[0] * up[1] - f0[1] * up[0]
        ];
        const sLen = Math.hypot(s[0], s[1], s[2]);
        s[0] /= sLen; s[1] /= sLen; s[2] /= sLen;

        const u = [
            s[1] * f0[2] - s[2] * f0[1],
            s[2] * f0[0] - s[0] * f0[2],
            s[0] * f0[1] - s[1] * f0[0]
        ];

        return new Float32Array([
            s[0], u[0], -f0[0], 0,
            s[1], u[1], -f0[1], 0,
            s[2], u[2], -f0[2], 0,
            -(s[0] * eye[0] + s[1] * eye[1] + s[2] * eye[2]),
            -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]),
            f0[0] * eye[0] + f0[1] * eye[1] + f0[2] * eye[2],
            1
        ]);
    },

    fromYawPitchPosition(yaw: number, pitch: number, position: Vec3): Mat4 {
        const cy = Math.cos(yaw);
        const sy = Math.sin(yaw);
        const cp = Math.cos(pitch);
        const sp = Math.sin(pitch);

        // Forward vector
        const fx = cy * cp;
        const fy = sp;
        const fz = sy * cp;

        const fLen = Math.hypot(fx, fy, fz);
        const f0: Vec3 = [fx / fLen, fy / fLen, fz / fLen];

        // Up vector
        const up: Vec3 = [0, 1, 0];

        // Right vector (cross product of forward and up)
        const rx = f0[1] * up[2] - f0[2] * up[1];
        const ry = f0[2] * up[0] - f0[0] * up[2];
        const rz = f0[0] * up[1] - f0[1] * up[0];

        const rLen = Math.hypot(rx, ry, rz);
        const r0: Vec3 = [rx / rLen, ry / rLen, rz / rLen];

        // Recalculate up vector (cross product of right and forward)
        const ux = r0[1] * f0[2] - r0[2] * f0[1];
        const uy = r0[2] * f0[0] - r0[0] * f0[2];
        const uz = r0[0] * f0[1] - r0[1] * f0[0];

        // Translation
        const x = -(r0[0] * position[0] + r0[1] * position[1] + r0[2] * position[2]);
        const y = -(ux * position[0] + uy * position[1] + uz * position[2]);
        const z = -(f0[0] * position[0] + f0[1] * position[1] + f0[2] * position[2]);

        return new Float32Array([
            r0[0], ux, f0[0], 0,
            r0[1], uy, f0[1], 0,
            r0[2], uz, f0[2], 0,
            x, y, z, 1
        ]);
    },

    translate(m: Mat4, v: Vec3): Mat4 {
        const translation = this.identity();
        translation[12] = v[0];
        translation[13] = v[1];
        translation[14] = v[2];
        return this.multiply(m, translation);
    },

    scale(m: Mat4, s: Vec3): Mat4 {
        const scaling = new Float32Array([
            s[0], 0, 0, 0,
            0, s[1], 0, 0,
            0, 0, s[2], 0,
            0, 0, 0, 1
        ]);
        return this.multiply(m, scaling);
    }
};
