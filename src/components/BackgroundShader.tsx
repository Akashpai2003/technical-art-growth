import { useEffect, useRef } from 'react';
import { ThemeConfig } from './ThemeSelector';

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ] : [0, 0, 0];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_bgColor;
uniform vec3 u_fogColor;
uniform float u_hazeIntensity;
uniform vec3 u_ditherColor;
uniform float u_bend;

// Hash for noise
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// Value noise
float noise(vec2 x) {
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(p + vec2(0.0, 0.0)), hash(p + vec2(1.0, 0.0)), f.x),
               mix(hash(p + vec2(0.0, 1.0)), hash(p + vec2(1.0, 1.0)), f.x), f.y);
}

// Fractal Brownian Motion
float fbm(vec2 p) {
    float f = 0.0;
    float w = 0.5;
    for (int i = 0; i < 2; i++) { // Reduced from 4 to 2 for performance
        f += w * noise(p);
        p *= 2.0;
        w *= 0.5;
    }
    return f;
}

// Ordered Bayer Dither 4x4 Approximation
float bayer(vec2 p) {
    vec2 f = mod(floor(p), 4.0);
    float b = 0.0;
    if (f.y < 0.5) {
        if (f.x < 0.5) b = 0.0;
        else if (f.x < 1.5) b = 8.0;
        else if (f.x < 2.5) b = 2.0;
        else b = 10.0;
    } else if (f.y < 1.5) {
        if (f.x < 0.5) b = 12.0;
        else if (f.x < 1.5) b = 4.0;
        else if (f.x < 2.5) b = 14.0;
        else b = 6.0;
    } else if (f.y < 2.5) {
        if (f.x < 0.5) b = 3.0;
        else if (f.x < 1.5) b = 11.0;
        else if (f.x < 2.5) b = 1.0;
        else b = 9.0;
    } else {
        if (f.x < 0.5) b = 15.0;
        else if (f.x < 1.5) b = 7.0;
        else if (f.x < 2.5) b = 13.0;
        else b = 5.0;
    }
    return b / 15.0;
}

void main() {
    // Pixelate coordinates for retro feel and better performance
    float pixelSize = 4.0;
    vec2 coord = floor(gl_FragCoord.xy / pixelSize) * pixelSize;
    vec2 uv = coord / u_resolution.xy;
    vec2 p = uv * 3.0;
    
    // Add drift based on bend
    p.x -= u_bend * 0.8;
    
    // Depth layers moving at different speeds
    float t1 = u_time * 0.08;
    float t2 = u_time * 0.12;
    
    // Layer 1: Background Haze
    float n1 = fbm(p + vec2(t1, t1));
    
    // Layer 2: Foreground Haze
    float n2 = fbm(p * 1.5 - vec2(t2, -t2));
    
    // Combine layers to create depth (simplified)
    float totalNoise = n1 * 0.6 + n2 * 0.4;
    
    // Base atmosphere blending
    vec3 color = mix(u_bgColor, u_fogColor, totalNoise * u_hazeIntensity);
    
    // Add bright glowy haze
    color += u_fogColor * (totalNoise * totalNoise) * 1.5;
    
    // Static Bayer Dither
    float ditherLimit = bayer(coord);
    color += (ditherLimit - 0.5) * 0.1 * u_ditherColor;
    
    gl_FragColor = vec4(color, 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function BackgroundShader({ theme }: { theme: ThemeConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetThemeRef = useRef<ThemeConfig>(theme);
  const currentColorsRef = useRef({
    bg: hexToRgb(theme.backgroundColor),
    fog: hexToRgb(theme.fogColor),
    haze: theme.hazeIntensity,
    dither: hexToRgb(theme.ditherColor)
  });

  useEffect(() => {
    targetThemeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
    if (!gl) return;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const locResolution = gl.getUniformLocation(program, 'u_resolution');
    const locTime = gl.getUniformLocation(program, 'u_time');
    const locBgColor = gl.getUniformLocation(program, 'u_bgColor');
    const locFogColor = gl.getUniformLocation(program, 'u_fogColor');
    const locHazeIntensity = gl.getUniformLocation(program, 'u_hazeIntensity');
    const locDitherColor = gl.getUniformLocation(program, 'u_ditherColor');
    const locBend = gl.getUniformLocation(program, 'u_bend');

    let animationFrameId: number;
    let startTime = performance.now();
    let lastTime = startTime;

    const resize = () => {
      // Render at half resolution for performance, scaling via CSS
      const displayWidth = Math.max(1, Math.floor(window.innerWidth * 0.5));
      const displayHeight = Math.max(1, Math.floor(window.innerHeight * 0.5));
      
      // Match canvas internal resolution to its physical size
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    window.addEventListener('resize', resize);
    resize();

    const render = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      // Theme interpolation (approx 500ms transition)
      const targetBg = hexToRgb(targetThemeRef.current.backgroundColor);
      const targetFog = hexToRgb(targetThemeRef.current.fogColor);
      const targetHaze = targetThemeRef.current.hazeIntensity;
      const targetDither = hexToRgb(targetThemeRef.current.ditherColor);
      
      // Smooth step
      const lerpFactor = 1.0 - Math.exp(-dt * 0.005);
      
      const curr = currentColorsRef.current as any;
      
      const targetBend = (window as any).__targetBend || 0;
      curr.bend = lerp(curr.bend || 0, targetBend, lerpFactor);

      curr.bg = curr.bg.map((c: number, i: number) => lerp(c, targetBg[i], lerpFactor));
      curr.fog = curr.fog.map((c: number, i: number) => lerp(c, targetFog[i], lerpFactor));
      curr.haze = lerp(curr.haze, targetHaze, lerpFactor);
      curr.dither = curr.dither.map((c: number, i: number) => lerp(c, targetDither[i], lerpFactor));

      gl.uniform2f(locResolution, canvas.width, canvas.height);
      gl.uniform1f(locTime, (time - startTime) * 0.001);
      gl.uniform3f(locBgColor, curr.bg[0], curr.bg[1], curr.bg[2]);
      gl.uniform3f(locFogColor, curr.fog[0], curr.fog[1], curr.fog[2]);
      gl.uniform1f(locHazeIntensity, curr.haze);
      gl.uniform3f(locDitherColor, curr.dither[0], curr.dither[1], curr.dither[2]);
      gl.uniform1f(locBend, curr.bend);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />;
}
