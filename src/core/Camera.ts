import { Transform } from './Transform.js';
import { Mat4 } from '../math/Mat4.js';
import { Vec3 } from '../math/Vec3.js';

const tempMat4 = new Mat4();
const tempVec3a = new Vec3();
const tempVec3b = new Vec3();

export interface IBaseCameraInti {
    near: number;
    far: number;
}

export interface IOrhoCameraInit extends IBaseCameraInti {
    left: number;
    right: number;
    bottom: number;
    top: number;
    zoom: number;
}

export interface IPerspectiveCameraInit extends IBaseCameraInti {
    fov: number;
    aspect: number;
}

export type ICamera = Partial<IOrhoCameraInit & IPerspectiveCameraInit> & { type: 'orthographic' | 'perspective' };

export class Camera extends Transform implements ICamera {
    public readonly projectionMatrix: Mat4 = new Mat4();
    public readonly viewMatrix: Mat4 = new Mat4();
    public readonly projectionViewMatrix: Mat4 = new Mat4();
    public readonly worldPosition: Vec3 = new Vec3();

    public frustum: Array<Vec3 & { constant?: number} >;

    public type: 'orthographic' | 'perspective';

    public near?: number;
    public far?: number;
    public fov?: number;
    public aspect?: number;

    public left?: number;
    public right?: number;
    public top?: number;
    public bottom?: number;
    public zoom?: number;

    constructor(_gl, {
        near = 0.1,
        far = 100,
        fov = 45,
        aspect = 1,
        left,
        right,
        bottom,
        top,
        zoom = 1
    }: Partial<IOrhoCameraInit & IPerspectiveCameraInit> = {}) {
        super();

        Object.assign(this, { near, far, fov, aspect, left, right, bottom, top, zoom });

        // Use orthographic if left/right set, else default to perspective camera
        this.type = left || right ? 'orthographic' : 'perspective';

        if (this.type === 'orthographic') this.orthographic();
        else this.perspective();
    }

    perspective({ near = this.near, far = this.far, fov = this.fov, aspect = this.aspect } = {}) {
        Object.assign(this, { near, far, fov, aspect });
        this.projectionMatrix.fromPerspective({ fov: fov * (Math.PI / 180), aspect, near, far });
        this.type = 'perspective';
        return this;
    }

    orthographic({
        near = this.near,
        far = this.far,
        left = this.left,
        right = this.right,
        bottom = this.bottom,
        top = this.top,
        zoom = this.zoom,
    } = {}) {
        Object.assign(this, { near, far, left, right, bottom, top, zoom });
        left /= zoom;
        right /= zoom;
        bottom /= zoom;
        top /= zoom;
        this.projectionMatrix.fromOrthogonal({ left, right, bottom, top, near, far });
        this.type = 'orthographic';
        return this;
    }

    updateMatrixWorld() {
        super.updateMatrixWorld();
        this.viewMatrix.inverse(this.worldMatrix);
        this.worldMatrix.getTranslation(this.worldPosition);

        // used for sorting
        this.projectionViewMatrix.multiply(this.projectionMatrix, this.viewMatrix);
        return this;
    }

    lookAt(target: Vec3) {
        super.lookAt(target, true);
        return this;
    }

    // Project 3D coordinate to 2D point
    project(v: Vec3) {
        v.applyMatrix4(this.viewMatrix);
        v.applyMatrix4(this.projectionMatrix);
        return this;
    }

    // Unproject 2D point to 3D coordinate
    unproject(v: Vec3) {
        v.applyMatrix4(tempMat4.inverse(this.projectionMatrix));
        v.applyMatrix4(this.worldMatrix);
        return this;
    }

    updateFrustum() {
        if (!this.frustum) {
            this.frustum = [new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3()];
        }

        const m = this.projectionViewMatrix;
        this.frustum[0].set(m[3] - m[0], m[7] - m[4], m[11] - m[8]).constant = m[15] - m[12]; // -x
        this.frustum[1].set(m[3] + m[0], m[7] + m[4], m[11] + m[8]).constant = m[15] + m[12]; // +x
        this.frustum[2].set(m[3] + m[1], m[7] + m[5], m[11] + m[9]).constant = m[15] + m[13]; // +y
        this.frustum[3].set(m[3] - m[1], m[7] - m[5], m[11] - m[9]).constant = m[15] - m[13]; // -y
        this.frustum[4].set(m[3] - m[2], m[7] - m[6], m[11] - m[10]).constant = m[15] - m[14]; // +z (far)
        this.frustum[5].set(m[3] + m[2], m[7] + m[6], m[11] + m[10]).constant = m[15] + m[14]; // -z (near)

        for (let i = 0; i < 6; i++) {
            const invLen = 1.0 / this.frustum[i].distance();
            this.frustum[i].multiply(invLen);
            this.frustum[i].constant *= invLen;
        }
    }

    frustumIntersectsMesh(node): boolean {
        // If no position attribute, treat as frustumCulled false
        if (!node.geometry.attributes.position) return true;

        if (!node.geometry.bounds || node.geometry.bounds.radius === Infinity) node.geometry.computeBoundingSphere();

        if (!node.geometry.bounds) return true;

        const center = tempVec3a;
        center.copy(node.geometry.bounds.center);
        center.applyMatrix4(node.worldMatrix);

        const radius = node.geometry.bounds.radius * node.worldMatrix.getMaxScaleOnAxis();

        return this.frustumIntersectsSphere(center, radius);
    }

    frustumIntersectsSphere(center: Vec3, radius: number): boolean {
        const normal = tempVec3b;

        for (let i = 0; i < 6; i++) {
            const plane = this.frustum[i];
            const distance = normal.copy(plane).dot(center) + plane.constant;
            if (distance < -radius) return false;
        }
        return true;
    }
}
