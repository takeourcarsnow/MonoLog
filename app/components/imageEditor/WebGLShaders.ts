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

export function createProgram(gl: WebGLRenderingContext, vSrc: string, fSrc: string) {
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

export const vertexSrc = `
attribute vec2 a_position;
attribute vec2 a_texcoord;
varying vec2 v_texcoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texcoord = a_texcoord;
}
`;

// Fragment shader: applies brightness, contrast, saturation and hue rotation.
export const fragmentSrc = `
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
  // portra: warm, natural, slight red/yellow boost
  if (abs(id - 2.0) < 0.5) {
    presetColor = color * vec3(1.1, 1.0, 0.9); // boost red, reduce blue
    presetColor = (presetColor - 0.5) * 1.2 + 0.5; // increase contrast
  }
  // velvia: vibrant, high contrast, saturated greens/blues
  if (abs(id - 3.0) < 0.5) {
    presetColor = color;
    presetColor.g *= 1.2; // boost green
    presetColor.b *= 1.1; // boost blue
    presetColor = (presetColor - 0.5) * 1.15 + 0.5; // increase contrast
  }
  // trix: high contrast B&W
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
  // astia: soft, natural tones, low contrast
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
  // delta: high contrast B&W, darker
  if (abs(id - 10.0) < 0.5) {
    float l = dot(color, lum);
    presetColor = vec3(l);
    presetColor = (presetColor - 0.5) * 1.4 + 0.5; // high contrast
    presetColor *= 0.8; // darker
  }
  // gold: balanced color negative, slight warmth
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
  // tmax: high contrast B&W
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