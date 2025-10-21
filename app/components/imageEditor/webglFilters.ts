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
uniform float u_tempTint; // -1..1 warm/cool tint
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

  // Apply very gentle tone mapping only when brightness is pushed very high
  // to help preserve highlights without being too aggressive
  if (u_brightness > 2.0) {
    // amount to apply tone mapping (0 = none, 1 = full)
    float tmAmount = clamp((u_brightness - 2.0) / 2.0, 0.0, 0.3);
    vec3 mapped = color / (color + vec3(0.5)); // gentle Reinhard
    // blend between linear and mapped based on tmAmount
    color = mix(color, mapped, tmAmount);
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
  // invert
  if (abs(id - 1.0) < 0.5) {
    presetColor = vec3(1.0) - color;
  }
  // portra400: warm, natural, slight red/yellow boost
  if (abs(id - 2.0) < 0.5) {
    presetColor = color * vec3(1.1, 1.0, 0.9); // boost red, reduce blue
    presetColor = (presetColor - 0.5) * 1.2 + 0.5; // increase contrast
  }
  // velvia50: vibrant, high contrast, saturated greens/blues
  if (abs(id - 3.0) < 0.5) {
    presetColor = color;
    presetColor.g *= 1.2; // boost green
    presetColor.b *= 1.1; // boost blue
    presetColor = (presetColor - 0.5) * 1.15 + 0.5; // increase contrast
  }
  // trix400: high contrast B&W
  if (abs(id - 4.0) < 0.5) {
    float l = dot(color, lum);
    presetColor = vec3(l);
    presetColor = (presetColor - 0.5) * 1.5 + 0.5; // high contrast
    presetColor *= 0.9; // darker
  }
  // hp5: warm B&W with slight sepia
  if (abs(id - 5.0) < 0.5) {
    float l = dot(color, lum);
    presetColor = vec3(l);
    presetColor = (presetColor - 0.5) * 1.4 + 0.5; // high contrast
    presetColor *= 0.95; // slightly darker
    vec3 sepia = vec3(
      dot(presetColor, vec3(0.393, 0.769, 0.189)),
      dot(presetColor, vec3(0.349, 0.686, 0.168)),
      dot(presetColor, vec3(0.272, 0.534, 0.131))
    );
    presetColor = mix(presetColor, sepia, 0.2); // more sepia
  }
  // provia: natural, balanced colors
  if (abs(id - 6.0) < 0.5) {
    presetColor = (color - 0.5) * 1.1 + 0.5; // mild contrast boost
    presetColor = mix(vec3(dot(presetColor, lum)), presetColor, 1.05); // mild saturation
  }
  // ektar: very saturated, high contrast
  if (abs(id - 7.0) < 0.5) {
    presetColor = mix(vec3(dot(color, lum)), color, 1.4); // high saturation
    presetColor = (presetColor - 0.5) * 1.2 + 0.5; // contrast
    presetColor *= 0.95; // slightly darker
  }
  // astia100: soft, natural tones, low contrast
  if (abs(id - 8.0) < 0.5) {
    presetColor = (color - 0.5) * 1.1 + 0.5; // mild contrast
    presetColor = mix(vec3(dot(presetColor, lum)), presetColor, 1.15); // mild saturation
    presetColor *= 1.08; // slightly brighter
    vec3 sepia = vec3(
      dot(presetColor, vec3(0.393, 0.769, 0.189)),
      dot(presetColor, vec3(0.349, 0.686, 0.168)),
      dot(presetColor, vec3(0.272, 0.534, 0.131))
    );
    presetColor = mix(presetColor, sepia, 0.1); // light sepia
  }
  // ektachrome: vibrant, high saturation, cooler hue
  if (abs(id - 9.0) < 0.5) {
    presetColor = mix(vec3(dot(color, lum)), color, 1.6); // high saturation
    presetColor = (presetColor - 0.5) * 1.3 + 0.5; // high contrast
    presetColor *= 0.88; // darker
    presetColor = hueRotate(presetColor, 12.0); // cooler
  }
  // delta3200: high contrast B&W, darker
  if (abs(id - 10.0) < 0.5) {
    float l = dot(color, lum);
    presetColor = vec3(l);
    presetColor = (presetColor - 0.5) * 1.4 + 0.5; // high contrast
    presetColor *= 0.8; // darker
  }
  // gold200: balanced color negative, slight warmth
  if (abs(id - 11.0) < 0.5) {
    presetColor = (color - 0.5) * 1.2 + 0.5; // contrast
    presetColor = mix(vec3(dot(presetColor, lum)), presetColor, 1.25); // saturation
    presetColor *= 1.05; // slightly brighter
    vec3 sepia = vec3(
      dot(presetColor, vec3(0.393, 0.769, 0.189)),
      dot(presetColor, vec3(0.349, 0.686, 0.168)),
      dot(presetColor, vec3(0.272, 0.534, 0.131))
    );
    presetColor = mix(presetColor, sepia, 0.12); // light sepia
  }
  // scala: high contrast B&W reversal
  if (abs(id - 12.0) < 0.5) {
    float l = dot(color, lum);
    presetColor = vec3(l);
    presetColor = (presetColor - 0.5) * 1.7 + 0.5; // very high contrast
    presetColor *= 0.92; // slightly darker
  }
  // fp4: medium contrast B&W
  if (abs(id - 13.0) < 0.5) {
    float l = dot(color, lum);
    presetColor = vec3(l);
    presetColor = (presetColor - 0.5) * 1.2 + 0.5; // medium contrast
    presetColor *= 0.95; // slightly darker
  }
  // tmax100: high contrast B&W
  if (abs(id - 14.0) < 0.5) {
    float l = dot(color, lum);
    presetColor = vec3(l);
    presetColor = (presetColor - 0.5) * 1.3 + 0.5; // high contrast
    presetColor *= 0.9; // darker
  }
  // panatomic: low contrast B&W
  if (abs(id - 15.0) < 0.5) {
    float l = dot(color, lum);
    presetColor = vec3(l);
    presetColor = (presetColor - 0.5) * 1.1 + 0.5; // low contrast
    presetColor *= 1.0; // neutral brightness
  }

  color = mix(color, clamp(presetColor, 0.0, 1.0), ps);

  // Apply subtle temperature tinting: positive tint favors warmer tones (increase R, slightly reduce B),
  // negative tint favors cooler tones. Keep tint mild and clamp final color.
  float tt = clamp(u_tempTint, -1.0, 1.0);
  if (abs(tt) > 0.001) {
    // warm: boost red, slightly lower blue; cool: inverse
    vec3 warmBias = vec3(0.03, 0.01, -0.02);
    vec3 coolBias = vec3(-0.02, 0.01, 0.03);
    color += mix(coolBias, warmBias, (tt + 1.0) * 0.5) * abs(tt);
  }

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
  adjustments: { brightness: number; contrast: number; saturation: number; hue: number; preset?: string; presetStrength?: number; tempTint?: number }
) {
  initShared(w, h);

  // Build a fallback 2D processed canvas if GPU not available or disabled
  if (!shared.gl || !shared.canvas || !enableGPU) {
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(w));
    out.height = Math.max(1, Math.round(h));
    const ctx = out.getContext('2d')!;
    // build CSS filter string matching numeric adjustments
  // Apply a subtle color tint for temperature using a tiny hue-rotate fallback
  const tempTint = adjustments.tempTint || 0;
  const tintHue = tempTint * 6.0; // small hue offset (degrees)
  const bf = `brightness(${adjustments.brightness}) contrast(${adjustments.contrast}) saturate(${adjustments.saturation}) hue-rotate(${adjustments.hue + tintHue}deg)`;
    const presetStr = (function(name?: string){
      if (!name) return '';
      // map names to same FILTER_PRESETS fragments used elsewhere
      switch (name) {
        case 'invert': return 'invert(1)';
        case 'portra400': return 'contrast(1.2) brightness(1.1) saturate(1.1) sepia(0.1) hue-rotate(-5deg)';
        case 'velvia50': return 'contrast(1.15) saturate(1.3) brightness(0.95)';
        case 'trix400': return 'grayscale(1) contrast(1.5) brightness(0.9)';
        case 'hp5': return 'grayscale(1) contrast(1.4) brightness(0.95) sepia(0.2)';
        case 'provia': return 'contrast(1.1) saturate(1.05) brightness(1.02)';
        case 'ektar': return 'contrast(1.2) saturate(1.4) brightness(0.95)';
        case 'astia100': return 'contrast(1.1) saturate(1.15) brightness(1.08) sepia(0.1)';
        case 'ektachrome': return 'contrast(1.3) saturate(1.6) brightness(0.88) hue-rotate(12deg)';
        case 'delta3200': return 'grayscale(1) contrast(1.4) brightness(0.8)';
        case 'gold200': return 'contrast(1.2) saturate(1.25) brightness(1.05) sepia(0.12)';
        case 'scala': return 'grayscale(1) contrast(1.7) brightness(0.92)';
        case 'fp4': return 'grayscale(1) contrast(1.2) brightness(0.95)';
        case 'tmax100': return 'grayscale(1) contrast(1.3) brightness(0.9)';
        case 'panatomic': return 'grayscale(1) contrast(1.1) brightness(1.0)';
        default: return '';
      }
    })(adjustments.preset);    // draw base
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
  // tempTint: subtle warm/cool tint - shader will use this if available
  // @ts-ignore (uniform may not exist in older builds)
  if ((shared as any).u_tempTint) gl.uniform1f((shared as any).u_tempTint, adjustments.tempTint || 0);
  // preset mapping to numeric id
  const presetName = adjustments.preset || '';
  const presetId = (function(name: string){
    switch (name) {
      case 'invert': return 1;
      case 'portra400': return 2;
      case 'velvia50': return 3;
      case 'trix400': return 4;
      case 'hp5': return 5;
      case 'provia': return 6;
      case 'ektar': return 7;
      case 'astia100': return 8;
      case 'ektachrome': return 9;
      case 'delta3200': return 10;
      case 'gold200': return 11;
      case 'scala': return 12;
      case 'fp4': return 13;
      case 'tmax100': return 14;
      case 'panatomic': return 15;
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
