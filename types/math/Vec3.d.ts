import { WritableArrayLike } from './functions/Mat3Func.js';
import type { Mat3 } from './Mat3.js';
import type { Mat4 } from './Mat4.js';
import type { Quat } from './Quat.js';
export declare class Vec3 extends Array<number> {
    constructor(x?: number, y?: number, z?: number);
    get x(): number;
    get y(): number;
    get z(): number;
    set x(v: number);
    set y(v: number);
    set z(v: number);
    set(x: Array<number>): this;
    set(x: Vec3): this;
    set(x: number, y?: number, z?: number): this;
    copy(v: Array<number>): this;
    add(va: Vec3, vb?: Vec3): this;
    sub(va: Vec3, vb?: Vec3): this;
    multiply(v: Vec3 | number): this;
    divide(v: Vec3 | number): this;
    inverse(v?: Vec3): this;
    len(): number;
    distance(v?: Vec3): number;
    squaredLen(): number;
    squaredDistance(v?: Vec3): number;
    negate(v?: Vec3): this;
    cross(va: Vec3, vb?: Vec3): this;
    scale(v: Vec3): this;
    normalize(): this;
    dot(v: Vec3): number;
    equals(v: Vec3): boolean;
    applyMatrix3(mat3: Mat3): this;
    applyMatrix4(mat4: Mat4): this;
    scaleRotateMatrix4(mat4: Mat4): this;
    applyQuaternion(q: Quat): this;
    angle(v: Vec3): number;
    lerp(v: Vec3, t: number): this;
    clone(): Vec3;
    fromArray(a: WritableArrayLike, o?: number): Vec3;
    toArray(a?: WritableArrayLike, o?: number): WritableArrayLike;
    transformDirection(mat4: Mat4): this;
}