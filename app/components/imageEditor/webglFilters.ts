// Minimal WebGL shader-based filter to perform per-pixel exposure/contrast/saturation/temperature
// adjustments. This is a lightweight implementation intended for previews where per-pixel
// accuracy and speed are preferred over canvas 2D filter chains.

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('Shader compile error: ' + info);
  }
  return s;
}

function createProgram(gl: WebGLRenderingContext, vSrc: string, fSrc: string) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vSrc);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fSrc);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error('Program link error: ' + info);
  }
  return prog;
}

const vertexSrc = `
attribute vec2 a_position;
attribute vec2 a_texcoord;
varying vec2 v_texcoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texcoord = a_texcoord;
}
`;

// Fragment shader: applies brightness, contrast, saturation and hue rotation.
const fragmentSrc = `
precision mediump float;
varying vec2 v_texcoord;
uniform sampler2D u_texture;
uniform float u_brightness; // multiplier
uniform float u_contrast; // 1 = neutral
uniform float u_saturation; // 1 = neutral
uniform float u_hue; // degrees
uniform float u_presetId; // 0=none,1=sepia,2=mono,3=cinema,...
uniform float u_presetStrength; // 0..1

// luminance coefficients (sRGB)
const vec3 lum = vec3(0.2126, 0.7152, 0.0722);

vec3 hueRotate(vec3 color, float angle) {
  float rad = radians(angle);
  float c = cos(rad);
  float s = sin(rad);
  mat3 m = mat3(
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072
  );
  return clamp(m * color, 0.0, 1.0);
}

void main() {
  vec4 t = texture2D(u_texture, v_texcoord);
  vec3 color = t.rgb;

  // Brightness (simple multiplier)
  color *= u_brightness;

  // Apply mild filmic tone mapping when we've brightened the image to
  // compress highlights and avoid hard clipping. This is a compact
  // Reinhard-esque operator blended with the linear color based on how
  // much we brightened.
  if (u_brightness > 1.02) {
    // amount to apply tone mapping (0 = none, 1 = full)
    float tmAmount = clamp((u_brightness - 1.0) / 1.5, 0.0, 1.0);
    vec3 mapped = color / (color + vec3(1.0)); // simple Reinhard
    // blend between linear and mapped based on tmAmount
    color = mix(color, mapped, tmAmount * 0.9);
  }

  // Contrast around 0.5 midpoint
  color = (color - 0.5) * u_contrast + 0.5;

  // Saturation via luminance mix
  float l = dot(color, lum);
  color = mix(vec3(l), color, u_saturation);

  // Hue rotation
  color = hueRotate(color, u_hue);
  // apply preset (mix original and preset-applied)
  float id = u_presetId;
  float ps = clamp(u_presetStrength, 0.0, 1.0);
  vec3 presetColor = color;
  // sepia
  if (abs(id - 1.0) < 0.5) {
    presetColor = vec3(
      dot(color, vec3(0.393, 0.769, 0.189)),
      dot(color, vec3(0.349, 0.686, 0.168)),
      dot(color, vec3(0.272, 0.534, 0.131))
    );
  }
  // mono/grayscale
  if (abs(id - 2.0) < 0.5) {
    float l = dot(color, lum);
    presetColor = vec3(l);
  }
  // cinema: bump contrast & saturation slightly, tint
  if (abs(id - 3.0) < 0.5) {
    presetColor = (color - 0.5) * 1.15 + 0.5; // more contrast
    presetColor = mix(vec3(dot(presetColor, lum)), presetColor, 1.05);
    presetColor = hueRotate(presetColor, -5.0);
  }
  // bleach: boost saturation slightly and brightness
  if (abs(id - 4.0) < 0.5) {
    presetColor = mix(vec3(dot(color, lum)), color, 1.3);
    presetColor = color * 1.02;
  }
  // vintage: mild sepia + slightly reduced contrast/saturation
  if (abs(id - 5.0) < 0.5) {
    vec3 s = vec3(
      dot(color, vec3(0.393, 0.769, 0.189)),
      dot(color, vec3(0.349, 0.686, 0.168)),
      dot(color, vec3(0.272, 0.534, 0.131))
    );
    presetColor = mix(mix(vec3(dot(color, lum)), color, 0.9), s, 0.35);
    presetColor *= 0.98;
  }
  // lomo: punchy contrast and saturation
  if (abs(id - 6.0) < 0.5) {
    presetColor = (color - 0.5) * 1.25 + 0.5;
    presetColor = mix(vec3(dot(presetColor, lum)), presetColor, 1.35);
  }
  // warm / cool
  if (abs(id - 7.0) < 0.5) {
    // warm: rotate hue slightly towards warm tones
    presetColor = hueRotate(color, -6.0);
  }
  if (abs(id - 8.0) < 0.5) {
    // cool: rotate hue slightly towards cool tones
    presetColor = hueRotate(color, 6.0);
  }
  // invert
  if (abs(id - 9.0) < 0.5) {
    presetColor = vec3(1.0) - color;
  }
  // film: subtle contrast and desaturate
  if (abs(id - 10.0) < 0.5) {
    presetColor = (color - 0.5) * 1.08 + 0.5;
    presetColor = mix(vec3(dot(presetColor, lum)), presetColor, 0.92);
    presetColor *= 0.98;
  }

  color = mix(color, clamp(presetColor, 0.0, 1.0), ps);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), t.a);
}
`;

// Shared singleton to avoid creating many WebGL contexts
const shared: {
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

function initShared(w: number, h: number) {
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

// Exposed function: renders a processed canvas sized (w,h) with given adjustments.
// texture cache keyed by source image element to avoid re-uploads
const texCache = new WeakMap<object, WebGLTexture | null>();

export let enableGPU = true;
export function setEnableGPU(v: boolean) { enableGPU = !!v; }

// Exposed function: renders a processed canvas sized (w,h) with given adjustments and optional preset
export function applyWebGLAdjustments(
  img: CanvasImageSource,
  w: number,
  h: number,
  adjustments: { brightness: number; contrast: number; saturation: number; hue: number; preset?: string; presetStrength?: number }
) {
  initShared(w, h);

  // Build a fallback 2D processed canvas if GPU not available or disabled
  if (!shared.gl || !shared.canvas || !enableGPU) {
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(w));
    out.height = Math.max(1, Math.round(h));
    const ctx = out.getContext('2d')!;
    // build CSS filter string matching numeric adjustments
    const bf = `brightness(${adjustments.brightness}) contrast(${adjustments.contrast}) saturate(${adjustments.saturation}) hue-rotate(${adjustments.hue}deg)`;
    const presetStr = (function(name?: string){
      if (!name) return '';
      // map names to same FILTER_PRESETS fragments used elsewhere
      switch (name) {
        case 'sepia': return 'sepia(0.45)';
        case 'mono': return 'grayscale(0.95)';
        case 'cinema': return 'contrast(1.15) saturate(1.05) hue-rotate(-5deg)';
        case 'bleach': return 'saturate(1.3) contrast(0.95) brightness(1.02)';
        case 'vintage': return 'sepia(0.35) contrast(0.95) saturate(0.9) brightness(0.98)';
        case 'lomo': return 'contrast(1.25) saturate(1.35) brightness(1.02) sepia(0.08)';
  case 'warm': return 'saturate(1.05) hue-rotate(-6deg) brightness(1.01)';
  case 'cool': return 'saturate(0.95) hue-rotate(6deg) brightness(0.99)';
        case 'invert': return 'invert(1)';
        case 'film': return 'contrast(1.08) saturate(0.92) brightness(0.98)';
        default: return '';
      }
    })(adjustments.preset);

    // draw base
    ctx.save();
    ctx.filter = `${bf}`;
    ctx.drawImage(img as any, 0, 0, (img as HTMLImageElement).naturalWidth, (img as HTMLImageElement).naturalHeight, 0, 0, out.width, out.height);
    ctx.restore();

    // overlay preset according to presetStrength
    const ps = Math.max(0, Math.min(1, adjustments.presetStrength ?? 1));
    if (presetStr && ps > 0) {
      ctx.save();
      ctx.globalAlpha = ps;
      ctx.filter = presetStr;
      ctx.drawImage(img as any, 0, 0, (img as HTMLImageElement).naturalWidth, (img as HTMLImageElement).naturalHeight, 0, 0, out.width, out.height);
      ctx.restore();
    }

    return out;
  }

  const gl = shared.gl;

  // bind shared texture; reuse cached texture where possible
  const key = img as object;
  let tex = texCache.get(key) || null;
  gl.bindTexture(gl.TEXTURE_2D, tex || shared.tex);
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img as any);
    if (!tex) {
      tex = shared.tex!;
      texCache.set(key, tex);
    }
  } catch (e) {
    const tmp = document.createElement('canvas'); tmp.width = (img as HTMLImageElement).naturalWidth || shared.canvas.width; tmp.height = (img as HTMLImageElement).naturalHeight || shared.canvas.height;
    const tctx = tmp.getContext('2d')!;
    tctx.drawImage(img as any, 0, 0, tmp.width, tmp.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tmp);
  }

  // set uniforms
  gl.useProgram(shared.prog as WebGLProgram);
  if (shared.u_brightness) gl.uniform1f(shared.u_brightness, adjustments.brightness);
  if (shared.u_contrast) gl.uniform1f(shared.u_contrast, adjustments.contrast);
  if (shared.u_saturation) gl.uniform1f(shared.u_saturation, adjustments.saturation);
  if (shared.u_hue) gl.uniform1f(shared.u_hue, adjustments.hue);
  // preset mapping to numeric id
  const presetName = adjustments.preset || '';
  const presetId = (function(name: string){
    switch (name) {
      case 'sepia': return 1;
      case 'mono': return 2;
      case 'cinema': return 3;
      case 'bleach': return 4;
      case 'vintage': return 5;
      case 'lomo': return 6;
      case 'warm': return 7;
      case 'cool': return 8;
      case 'invert': return 9;
      case 'film': return 10;
      default: return 0;
    }
  })(presetName);
  // @ts-ignore
  if (shared['u_presetId']) gl.uniform1f(shared['u_presetId'], presetId);
  // @ts-ignore
  if (shared['u_presetStrength']) gl.uniform1f(shared['u_presetStrength'], Math.max(0, Math.min(1, adjustments.presetStrength ?? 1)));

  gl.viewport(0, 0, shared.canvas.width, shared.canvas.height);
  gl.clearColor(0,0,0,0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // return a snapshot canvas so callers can keep the output
  const out = document.createElement('canvas');
  out.width = shared.canvas.width;
  out.height = shared.canvas.height;
  const octx = out.getContext('2d')!;
  try {
    // if shared.canvas is an OffscreenCanvas, try transferToImageBitmap
    if ((shared.canvas as any).transferToImageBitmap) {
      const ib = (shared.canvas as any).transferToImageBitmap();
      octx.drawImage(ib, 0, 0);
    } else {
      octx.drawImage(shared.canvas as any, 0, 0);
    }
  } catch (e) {
    // fallback: try to use as-is
    try { octx.drawImage(shared.canvas as any, 0, 0); } catch (e) {}
  }

  return out;
}
