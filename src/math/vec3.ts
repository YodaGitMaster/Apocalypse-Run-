export type Vec3 = [number, number, number];

export const vec3 = {
    create(x = 0, y = 0, z = 0): Vec3 {
        return [x, y, z];
    },

    clone(v: Vec3): Vec3 {
        return [v[0], v[1], v[2]];
    },

    add(a: Vec3, b: Vec3): Vec3 {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    },

    subtract(a: Vec3, b: Vec3): Vec3 {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    },

    multiply(v: Vec3, scalar: number): Vec3 {
        return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
    },

    dot(a: Vec3, b: Vec3): number {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    },

    cross(a: Vec3, b: Vec3): Vec3 {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    },

    length(v: Vec3): number {
        return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    },

    lengthSquared(v: Vec3): number {
        return v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    },

    normalize(v: Vec3): Vec3 {
        const len = this.length(v);
        if (len === 0) return [0, 0, 0];
        return [v[0] / len, v[1] / len, v[2] / len];
    },

    distance(a: Vec3, b: Vec3): number {
        return this.length(this.subtract(a, b));
    },

    lerp(a: Vec3, b: Vec3, t: number): Vec3 {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t
        ];
    },

    zero(): Vec3 {
        return [0, 0, 0];
    },

    up(): Vec3 {
        return [0, 1, 0];
    },

    forward(): Vec3 {
        return [0, 0, -1];
    },

    right(): Vec3 {
        return [1, 0, 0];
    }
};
