import { Vec3 } from '../math/Vec3.js';
import { Quat } from '../math/Quat.js';
import { IAnimData } from './Animation.js';
import { Transform } from '../core/Transform.js';

const tmpVec3A = new Vec3();
const tmpVec3B = new Vec3();
const tmpVec3C = new Vec3();
const tmpVec3D = new Vec3();

const tmpQuatA = new Quat();
const tmpQuatB = new Quat();
const tmpQuatC = new Quat();
const tmpQuatD = new Quat();

export interface IGLTFAnimRecord {
    times: number[];
    node: Transform;
    transform: 'quaternion' | 'scale' | 'position';
    interpolation: 'STEP' | 'CUBICSPLINE';
    values: number[];
}

export interface IGLTFAnimData extends Array<IGLTFAnimRecord> {}

export class GLTFAnimation {
    public readonly data: IGLTFAnimData;

    public elapsed: number = 0;
    // Set to false to not apply modulo to elapsed against duration
    public loop: boolean = true;
    public weight: number;
    public startTime: number;
    public endTime: number;
    public duration: number;

    constructor(data: IGLTFAnimData, weight = 1) {
        this.data = data;
        this.weight = weight;
        // Find starting time as exports from blender (perhaps others too) don't always start from 0
        this.startTime = data.reduce((a, { times }) => Math.min(a, times[0]), Infinity);
        // Get largest final time in all channels to calculate duration
        this.endTime = data.reduce((a, { times }) => Math.max(a, times[times.length - 1]), 0);
        this.duration = this.endTime - this.startTime;
    }

    update(totalWeight = 1, isSet = false) {
        const weight = isSet ? 1 : this.weight / totalWeight;
        const elapsed = !this.duration
            ? 0
            : (this.loop ? this.elapsed % this.duration : Math.min(this.elapsed, this.duration - 0.001)) + this.startTime;

        this.data.forEach(({ node, transform, interpolation, times, values }) => {
            const isQuat = transform === 'quaternion';
            const size = isQuat ? 4 : 3;

            if (!this.duration) {
                let val = isQuat ? tmpQuatA : tmpVec3A;
                val.fromArray(values, 0);
                if (isQuat) node[transform].slerp(val as Quat, weight);
                else node[transform].lerp(val as Vec3, weight);
                return;
            }

            // Get index of two time values elapsed is between
            const prevIndex =
                Math.max(
                    1,
                    times.findIndex((t) => t > elapsed)
                ) - 1;
            const nextIndex = prevIndex + 1;

            // Get linear blend/alpha between the two
            let alpha = (elapsed - times[prevIndex]) / (times[nextIndex] - times[prevIndex]);
            if (interpolation === 'STEP') alpha = 0;

            let prevVal = isQuat ? tmpQuatA : tmpVec3A;
            let prevTan = isQuat ? tmpQuatB : tmpVec3B;
            let nextTan = isQuat ? tmpQuatC : tmpVec3C;
            let nextVal = isQuat ? tmpQuatD : tmpVec3D;

            if (interpolation === 'CUBICSPLINE') {
                // Get the prev and next values from the indices
                prevVal.fromArray(values, prevIndex * size * 3 + size * 1);
                prevTan.fromArray(values, prevIndex * size * 3 + size * 2);
                nextTan.fromArray(values, nextIndex * size * 3 + size * 0);
                nextVal.fromArray(values, nextIndex * size * 3 + size * 1);

                // interpolate for final value
                prevVal = this.cubicSplineInterpolate(alpha, prevVal, prevTan, nextTan, nextVal);
                if (isQuat) prevVal.normalize();
            } else {
                // Get the prev and next values from the indices
                prevVal.fromArray(values, prevIndex * size);
                nextVal.fromArray(values, nextIndex * size);

                // interpolate for final value
                if (isQuat) (prevVal as Quat).slerp(nextVal as Quat, alpha);
                else (prevVal as Vec3).lerp(nextVal as Vec3, alpha);
            }

            // interpolate between multiple possible animations
            if (isQuat) node[transform].slerp(prevVal as Quat, weight);
            else node[transform].lerp(prevVal as Vec3, weight);
        });
    }

    cubicSplineInterpolate<T extends Quat | Vec3>(t: number, prevVal: T, prevTan: T, nextTan: T, nextVal: T):T {
        const t2 = t * t;
        const t3 = t2 * t;

        const s2 = 3 * t2 - 2 * t3;
        const s3 = t3 - t2;
        const s0 = 1 - s2;
        const s1 = s3 - t2 + t;

        for (let i = 0; i < prevVal.length; i++) {
            prevVal[i] = s0 * prevVal[i] + s1 * (1 - t) * prevTan[i] + s2 * nextVal[i] + s3 * t * nextTan[i];
        }

        return prevVal;
    }
}
