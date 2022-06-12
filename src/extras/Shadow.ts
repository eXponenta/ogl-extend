import type { Mesh } from '../core/Mesh.js';

import { Camera } from '../core/Camera.js';
import { Program } from '../core/Program.js';
import { GLContext } from '../core/Renderer.js';
import { RenderTarget } from '../core/RenderTarget.js';

export interface IShadowReadyMesh extends Mesh {
    colorProgram?: Program;
    depthProgram?: Program;
}

export interface IShadowPassInit {
    mesh: IShadowReadyMesh,
    receive?: boolean;
    cast?: boolean;
    vertex?: string;
    fragment?: string;
    uniformProjection?: string;
    uniformView?: string;
    uniformTexture?: string;
}

export class Shadow {
    public readonly gl: GLContext;
    public light: Camera;
    public target: RenderTarget;

    private depthProgram: Program;
    private castMeshes: Mesh[] = [];

    constructor(gl: GLContext, {
        light = new Camera(gl),
        width = 1024,
        height = width
    }) {
        this.gl = gl;

        this.light = light;

        this.target = new RenderTarget(gl, { width, height });

        this.depthProgram = new Program(gl, {
            vertex: defaultVertex,
            fragment: defaultFragment,
            cullFace: null,
        });
    }

    add({
        mesh,
        receive = true,
        cast = true,
        vertex = defaultVertex,
        fragment = defaultFragment,
        uniformProjection = 'shadowProjectionMatrix',
        uniformView = 'shadowViewMatrix',
        uniformTexture = 'tShadow',
    }: IShadowPassInit) {
        // Add uniforms to existing program
        if (receive && !mesh.program.uniforms[uniformProjection]) {
            mesh.program.uniforms[uniformProjection] = { value: this.light.projectionMatrix };
            mesh.program.uniforms[uniformView] = { value: this.light.viewMatrix };
            mesh.program.uniforms[uniformTexture] = { value: this.target.texture };
        }

        if (!cast) return;
        this.castMeshes.push(mesh);

        // Store program for when switching between depth override
        mesh.colorProgram = mesh.program;

        // Check if depth program already attached
        if (mesh.depthProgram) return;

        // Use global depth override if nothing custom passed in
        if (vertex === defaultVertex && fragment === defaultFragment) {
            mesh.depthProgram = this.depthProgram;
            return;
        }

        // Create custom override program
        mesh.depthProgram = new Program(this.gl, {
            vertex,
            fragment,
            cullFace: null,
        });
    }

    render({ scene }) {
        // For depth render, replace program with depth override.
        // Hide meshes not casting shadows.
        scene.traverse((node) => {
            if (!node.draw) return;
            if (!!~this.castMeshes.indexOf(node)) {
                node.program = node.depthProgram;
            } else {
                node.isForceVisibility = node.visible;
                node.visible = false;
            }
        });

        // Render the depth shadow map using the light as the camera
        this.gl.renderer.render({
            scene,
            camera: this.light,
            target: this.target,
        });

        // Then switch the program back to the normal one
        scene.traverse((node) => {
            if (!node.draw) return;
            if (!!~this.castMeshes.indexOf(node)) {
                node.program = node.colorProgram;
            } else {
                node.visible = node.isForceVisibility;
            }
        });
    }
}

const defaultVertex = /* glsl */ `
    attribute vec3 position;
    attribute vec2 uv;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const defaultFragment = /* glsl */ `
    precision highp float;

    vec4 packRGBA (float v) {
        vec4 pack = fract(vec4(1.0, 255.0, 65025.0, 16581375.0) * v);
        pack -= pack.yzww * vec2(1.0 / 255.0, 0.0).xxxy;
        return pack;
    }

    void main() {
        gl_FragColor = packRGBA(gl_FragCoord.z);
    }
`;