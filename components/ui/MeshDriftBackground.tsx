"use client";

import React, { useEffect, useRef } from "react";

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
uniform vec4 u_scene;      // resolution.xy, time, colour count
uniform vec4 u_shape;      // scale, intensity, paramA, warp
uniform vec4 u_surface;    // detail, contrast, brightness, saturation
uniform vec4 u_finish;     // hue, vignette, blur, grain
uniform vec4 u_transform;  // seed, rotation, drift, OKLab toggle
uniform vec4 u_space;      // offset.xy, pointer.xy
uniform vec4 u_cursor;

#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_paramA u_shape.z
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_oklab u_transform.w
#define u_offset u_space.xy
#define u_mouse u_space.zw
#define u_cursorPresence u_cursor.x
#define u_cursorEffect u_cursor.y
#define u_cursorStrength u_cursor.z
#define u_cursorRadius u_cursor.w

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, c));
}
vec3 linToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0);
  m = pow(max(m, 0.0), 1.0 / 3.0);
  s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklabToLin(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}

vec3 sampleGradientLinear(float t) {
  t = clamp(t, 0.0, 1.0) * (u_colorCount - 1.0);
  int idx = int(floor(t));
  float f = fract(t);
  vec3 c0 = vec3(0.0);
  vec3 c1 = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (i == idx) c0 = u_colors[i];
    if (i == idx + 1) c1 = u_colors[i];
  }
  return mix(c0, c1, f);
}

vec3 sampleGradientOklab(float t) {
  t = clamp(t, 0.0, 1.0) * (u_colorCount - 1.0);
  int idx = int(floor(t));
  float f = fract(t);
  vec3 c0 = vec3(0.0);
  vec3 c1 = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (i == idx) c0 = u_colors[i];
    if (i == idx + 1) c1 = u_colors[i];
  }
  vec3 lab0 = linToOklab(srgbToLinear(c0));
  vec3 lab1 = linToOklab(srgbToLinear(c1));
  vec3 lab = mix(lab0, lab1, f);
  return linearToSrgb(oklabToLin(lab));
}

vec3 sampleGradient(float t) {
  if (u_oklab > 0.5) {
    return sampleGradientOklab(t);
  }
  return sampleGradientLinear(t);
}

vec3 adjustHue(vec3 color, float deg) {
  float rad = radians(deg);
  vec3 k = vec3(0.57735, 0.57735, 0.57735);
  float cosAngle = cos(rad);
  return vec3(
    color * cosAngle +
    cross(k, color) * sin(rad) +
    k * dot(k, color) * (1.0 - cosAngle));
}

vec3 adjustContrast(vec3 color, float c) {
  return clamp((color - 0.5) * c + 0.5, 0.0, 1.0);
}

vec3 adjustSaturation(vec3 color, float s) {
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  return clamp(mix(vec3(gray), color, s), 0.0, 1.0);
}

vec3 adjustBrightness(vec3 color, float b) {
  return clamp(color + b, 0.0, 1.0);
}

vec3 applyVignette(vec3 color, vec2 uv, float amount) {
  float d = length((uv - 0.5) * vec2(1.0, u_resolution.y / u_resolution.x));
  float v = smoothstep(0.8, 0.2, d * amount);
  return color * v;
}

vec3 applyFilmGrain(vec3 color, vec2 uv, float amount) {
  float g = grainHash(uv * u_resolution + fract(u_time * 7.13) * 100.0);
  return clamp(color + (g - 0.5) * amount, 0.0, 1.0);
}

mat2 makeRot(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float cursorDistance(vec2 p) {
  if (u_cursorPresence <= 0.0) return 1000.0;
  vec2 cursorUv = u_mouse;
  vec2 diff = (p - cursorUv) * vec2(u_resolution.x / u_resolution.y, 1.0);
  return length(diff);
}

vec2 cursorDisplace(vec2 p) {
  if (u_cursorPresence <= 0.0 || u_cursorRadius <= 0.001) return p;
  float d = cursorDistance(p);
  float r = u_cursorRadius;
  if (d < r) {
    float f = 1.0 - smoothstep(0.0, r, d);
    f = f * f;
    vec2 dir = normalize(p - u_mouse + vec2(0.0001));
    if (u_cursorEffect < 0.5) {
      p += dir * f * u_cursorStrength * 0.2;
    } else if (u_cursorEffect < 1.5) {
      p -= dir * f * u_cursorStrength * 0.2;
    } else if (u_cursorEffect < 2.5) {
      p += vec2(-dir.y, dir.x) * f * u_cursorStrength * 0.3;
    }
  }
  return p;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / u_resolution.y;

  p = cursorDisplace(p);

  float rotAngle = radians(u_rotate);
  p = makeRot(rotAngle) * p;

  p += u_offset;

  float seedOffset = u_seed * 19.17;
  vec2 driftVec = vec2(cos(u_drift), sin(u_drift)) * u_time * 0.05;
  p += driftVec + vec2(seedOffset);

  vec2 q = vec2(0.0);
  vec2 r = vec2(0.0);

  float s = max(u_scale, 0.01);
  vec2 sp = p * s;

  q.x = fbm(sp + vec2(0.0, 0.0) + u_time * 0.02 * u_paramA);
  q.y = fbm(sp + vec2(5.2, 1.3) + u_time * 0.025 * u_paramA);

  float warpAmount = u_warp * 2.0;
  r.x = fbm(sp + 4.0 * q + vec2(1.7, 9.2) + u_time * 0.015);
  r.y = fbm(sp + 4.0 * q + vec2(8.3, 2.8) + u_time * 0.012);

  vec2 warpP = sp + warpAmount * r;
  float f = fbm(warpP);

  float pattern = f;
  pattern = mix(pattern, (pattern + q.x - q.y) * 0.5, u_intensity);

  float t = clamp(pattern * u_detail, 0.0, 1.0);

  if (u_cursorPresence > 0.0 && u_cursorEffect > 2.5) {
    float cd = cursorDistance(uv * 2.0 - 1.0);
    if (cd < u_cursorRadius) {
      float ripple = sin(cd * 30.0 - u_time * 5.0) * 0.5 + 0.5;
      float falloff = 1.0 - smoothstep(0.0, u_cursorRadius, cd);
      t = clamp(t + ripple * falloff * u_cursorStrength * 0.3, 0.0, 1.0);
    }
  }

  vec3 col = sampleGradient(t);

  if (abs(u_hue) > 0.01) {
    col = adjustHue(col, u_hue);
  }
  if (abs(u_contrast - 1.0) > 0.01) {
    col = adjustContrast(col, u_contrast);
  }
  if (abs(u_brightness) > 0.001) {
    col = adjustBrightness(col, u_brightness);
  }
  if (abs(u_saturation - 1.0) > 0.01) {
    col = adjustSaturation(col, u_saturation);
  }
  if (u_vignette > 0.01) {
    col = applyVignette(col, uv, u_vignette);
  }
  if (u_grain > 0.001) {
    col = applyFilmGrain(col, uv, u_grain);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export interface MeshDriftBackgroundProps {
  className?: string;
  variant?: "soft-emerald" | "dark";
}

export function MeshDriftBackground({
  className = "",
  variant = "soft-emerald",
}: MeshDriftBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) return;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    gl.useProgram(program);

    // Fullscreen Triangle
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform Locations
    const uColorsLoc = gl.getUniformLocation(program, "u_colors");
    const uSceneLoc = gl.getUniformLocation(program, "u_scene");
    const uShapeLoc = gl.getUniformLocation(program, "u_shape");
    const uSurfaceLoc = gl.getUniformLocation(program, "u_surface");
    const uFinishLoc = gl.getUniformLocation(program, "u_finish");
    const uTransformLoc = gl.getUniformLocation(program, "u_transform");
    const uSpaceLoc = gl.getUniformLocation(program, "u_space");
    const uCursorLoc = gl.getUniformLocation(program, "u_cursor");

    // Colors according to variant
    // Soft Emerald (Light): #F2FAF6, #BCE7D7, #62C49F, #0E7C5A
    // Dark: #03120E, #0E7C5A, #7CE577, #F4FFC7
    const colors =
      variant === "soft-emerald"
        ? new Float32Array([
            0.949, 0.980, 0.965, // #F2FAF6
            0.737, 0.906, 0.843, // #BCE7D7
            0.384, 0.769, 0.624, // #62C49F
            0.055, 0.486, 0.353, // #0E7C5A
            0.000, 0.000, 0.000,
            0.000, 0.000, 0.000,
            0.000, 0.000, 0.000,
            0.000, 0.000, 0.000,
          ])
        : new Float32Array([
            0.012, 0.071, 0.055, // #03120E
            0.055, 0.486, 0.353, // #0E7C5A
            0.486, 0.898, 0.467, // #7CE577
            0.957, 1.000, 0.780, // #F4FFC7
            0.000, 0.000, 0.000,
            0.000, 0.000, 0.000,
            0.000, 0.000, 0.000,
            0.000, 0.000, 0.000,
          ]);

    if (uColorsLoc) gl.uniform3fv(uColorsLoc, colors);
    if (uShapeLoc) gl.uniform4f(uShapeLoc, 1.16, 0.34, 0.50, 0.00);
    if (uSurfaceLoc) gl.uniform4f(uSurfaceLoc, 2.40, 1.16, 0.00, 1.00);
    if (uFinishLoc) gl.uniform4f(uFinishLoc, 0.00, 0.00, 0.000, 0.09);
    if (uTransformLoc) gl.uniform4f(uTransformLoc, 1453.0, 0.00, 0.00, 0.0);
    if (uSpaceLoc) gl.uniform4f(uSpaceLoc, 0.00, 0.00, 0.00, 0.00);
    if (uCursorLoc) gl.uniform4f(uCursorLoc, 0.00, 2.0, 0.65, 0.46);

    let animationFrameId: number;
    const startTime = performance.now();
    let isRunning = true;

    function resize() {
      if (!canvas || !gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const displayWidth = Math.floor(width * dpr);
      const displayHeight = Math.floor(height * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }
    }

    function render(now: number) {
      if (!isRunning || !gl || !canvas) return;
      resize();

      const elapsedSeconds = (now - startTime) / 1000;
      if (uSceneLoc) {
        gl.uniform4f(uSceneLoc, canvas.width, canvas.height, elapsedSeconds * 0.73, 4.0);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      animationFrameId = requestAnimationFrame(render);
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
      } else {
        isRunning = true;
        animationFrameId = requestAnimationFrame(render);
      }
    };

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    resize();
    animationFrameId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover select-none ${className}`}
      style={{ background: variant === "soft-emerald" ? "#F2FAF6" : "#03120E" }}
    />
  );
}
