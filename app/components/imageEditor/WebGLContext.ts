import { createProgram, vertexSrc, fragmentSrc } from './WebGLShaders';

// Shared singleton to avoid creating many WebGL contexts
export const shared: {
  canvas: HTMLCanvasElement | OffscreenCanvas | null;
  gl: WebGLRenderingContext | null;
  prog: WebGLProgram | null;
  posBuf: WebGLBuffer | null;
  tex: WebGLTexture | null;
  u_brightness: WebGLUniformLocation | null;
  u_contrast: WebGLUniformLocation | null;
  u_saturation: WebGLUniformLocation | null;
  u_hue: WebGLUniformLocation | null;
} = {
  canvas: null,
  gl: null,
  prog: null,
  posBuf: null,
  tex: null,
  u_brightness: null,
  u_contrast: null,
  u_saturation: null,
  u_hue: null,
};

export function initShared(w: number, h: number) {
  if (shared.gl) {
    // resize canvas if needed
    try {
      if (shared.canvas) {
        shared.canvas.width = Math.max(1, Math.round(w));
        shared.canvas.height = Math.max(1, Math.round(h));
      }
      shared.gl.viewport(0, 0, Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
      return;
    } catch (e) {
      // fall through to recreate context if something failed
    }
  }

  // create canvas (prefer OffscreenCanvas if available)
  shared.canvas = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))) as any as HTMLCanvasElement : document.createElement('canvas');
  shared.canvas.width = Math.max(1, Math.round(w));
  shared.canvas.height = Math.max(1, Math.round(h));

  try {
    shared.gl = (shared.canvas as any).getContext('webgl') || (shared.canvas as any).getContext('experimental-webgl');
  } catch (e) {
    shared.gl = null;
  }
  if (!shared.gl) {
    // leave shared as nulls; caller will fallback
    shared.canvas = null;
    return;
  }

  const gl = shared.gl;
  shared.prog = createProgram(gl, vertexSrc, fragmentSrc);
  gl.useProgram(shared.prog as WebGLProgram);

  // create buffer for a fullscreen quad
  shared.posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, shared.posBuf);
  const positions = new Float32Array([
    -1, -1,  0, 0,
     1, -1,  1, 0,
    -1,  1,  0, 1,
    -1,  1,  0, 1,
     1, -1,  1, 0,
     1,  1,  1, 1
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const a_position = gl.getAttribLocation(shared.prog as WebGLProgram, 'a_position');
  const a_texcoord = gl.getAttribLocation(shared.prog as WebGLProgram, 'a_texcoord');
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(a_texcoord);
  gl.vertexAttribPointer(a_texcoord, 2, gl.FLOAT, false, 16, 8);

  // create texture
  shared.tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, shared.tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // cache uniform locations
  shared.u_brightness = gl.getUniformLocation(shared.prog as WebGLProgram, 'u_brightness');
  shared.u_contrast = gl.getUniformLocation(shared.prog as WebGLProgram, 'u_contrast');
  shared.u_saturation = gl.getUniformLocation(shared.prog as WebGLProgram, 'u_saturation');
  shared.u_hue = gl.getUniformLocation(shared.prog as WebGLProgram, 'u_hue');
  // preset uniforms
  // @ts-ignore
  shared['u_presetId'] = gl.getUniformLocation(shared.prog as WebGLProgram, 'u_presetId');
  // @ts-ignore
  shared['u_presetStrength'] = gl.getUniformLocation(shared.prog as WebGLProgram, 'u_presetStrength');

  gl.viewport(0, 0, shared.canvas.width, shared.canvas.height);
}

// texture cache keyed by source image element to avoid re-uploads
export const texCache = new WeakMap<object, WebGLTexture | null>();