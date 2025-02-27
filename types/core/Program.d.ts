import { IProgramSource, ProgramData } from "./ProgramData.js";
import { GLContext, INativeObjectHolder, Renderer } from "./Renderer.js";
export interface IUniformData<T = any> {
    value: T;
}
export declare type IDefaultUniforms = 'modelMatrix' | 'projectionMatrix' | 'cameraPosition' | 'viewMatrix' | 'modelViewMatrix' | 'normalMatrix';
export interface IProgramInit<U extends string = ''> extends IProgramSource {
    uniforms: Record<U, IUniformData>;
    transparent: boolean;
    cullFace: GLenum;
    frontFace: GLenum;
    depthTest: boolean;
    depthWrite: boolean;
    depthFunc: GLenum;
    programData: ProgramData;
}
export declare class Program<U extends string = any> implements INativeObjectHolder {
    readonly id: number;
    /**
     * @deprecated GLInstance not stored now
     */
    readonly gl: GLContext;
    readonly uniforms: Record<U | IDefaultUniforms, IUniformData>;
    programData: ProgramData;
    programSource: {
        vertex: string;
        fragment: string;
    };
    transparent: boolean;
    cullFace: GLenum;
    frontFace: GLenum;
    depthTest: boolean;
    depthWrite: boolean;
    depthFunc: GLenum;
    private blendFunc;
    private blendEquation;
    activeContext: Renderer;
    constructor(gl: GLContext, { vertex, fragment, uniforms, transparent, cullFace, frontFace, depthTest, depthWrite, depthFunc, programData, }?: Partial<IProgramInit<U>>);
    /**
     * Only for backward compatibility
     * Internally we not should use this
     */
    get uniformLocations(): Map<import("./ProgramData.js").IUniformActiveInfo, WebGLUniformLocation>;
    get attributeLocations(): Map<WebGLActiveInfo, number>;
    get attributeOrder(): string;
    /**
     * WebGLProgram instance, can be shared
     * Only for backward compatibility
     * Internally we not should use this
     */
    get program(): WebGLProgram;
    setBlendFunc(src: GLenum, dst: GLenum, srcAlpha?: GLenum, dstAlpha?: GLenum): void;
    setBlendEquation(modeRGB: GLenum, modeAlpha?: GLenum): void;
    applyState(renderer: Renderer): void;
    prepare({ context }: {
        context: any;
    }): void;
    use({ context, flipFaces }: {
        flipFaces?: boolean;
        context: Renderer;
    }): void;
    destroy(): void;
    remove(): void;
}
