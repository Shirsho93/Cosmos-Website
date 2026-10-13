// GLSL shared by the 3D scenes. Planets are textured procedurally from 3D noise
// sampled on the sphere, so there are no seams and no external texture downloads.

export const noise = /* glsl */ `
  // 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT)
  vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
      i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
      i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      sum += snoise(p) * amp;
      p *= 2.03;
      amp *= 0.5;
    }
    return sum;
  }
`

export const planetVertex = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vObj = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

// uType: 1 rocky · 2 cloudy · 3 earth-like · 4 banded gas giant · 5 ice giant
export const planetFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uTime;
  uniform float uSeed;
  uniform float uSpot;
  uniform int uType;
  varying vec3 vObj;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  ${noise}

  void main() {
    vec3 p = normalize(vObj);
    vec3 s = p + uSeed;
    vec3 col;

    if (uType == 1) {
      float n = fbm(s * 3.0);
      float craters = smoothstep(0.45, 0.6, snoise(s * 11.0)) * 0.22;
      col = mix(uColorA, uColorB, n * 0.6 + 0.5) - craters;
    } else if (uType == 2) {
      float warp = fbm(s * 2.5 + vec3(uTime * 0.015, 0.0, 0.0));
      float n = fbm(s * 2.0 + warp * 1.2);
      col = mix(uColorA, uColorB, n * 0.55 + 0.55);
    } else if (uType == 3) {
      float land = fbm(s * 2.2);
      vec3 ocean = uColorA * (0.85 + 0.25 * snoise(s * 7.0));
      vec3 ground = mix(uColorB, vec3(0.62, 0.52, 0.34), smoothstep(0.08, 0.35, land));
      col = mix(ocean, ground, smoothstep(0.0, 0.04, land));
      col = mix(col, vec3(0.95), smoothstep(0.8, 0.86, abs(p.y)));
      float clouds = smoothstep(0.05, 0.55, fbm(s * 3.2 + vec3(uTime * 0.01, 0.0, uTime * 0.004)));
      col = mix(col, vec3(1.0), clouds * 0.75);
    } else if (uType == 4) {
      float turb = fbm(s * 3.5 + vec3(uTime * 0.01, 0.0, 0.0)) * 0.22;
      float bands = sin((p.y + turb) * 20.0) * 0.5 + 0.5;
      bands = mix(bands, sin((p.y + turb) * 7.0) * 0.5 + 0.5, 0.4);
      col = mix(uColorA, uColorB, bands);
      // Optional great storm (Jupiter)
      vec3 spotC = normalize(vec3(0.62, -0.36, 0.7));
      float d = length((p - spotC) * vec3(1.0, 2.0, 1.0));
      col = mix(col, vec3(0.78, 0.36, 0.22), smoothstep(0.17, 0.09, d) * uSpot);
    } else {
      float bands = sin((p.y + fbm(s * 2.0) * 0.06) * 9.0) * 0.5 + 0.5;
      col = mix(uColorA, uColorB, bands * 0.35 + 0.25);
    }

    // The Sun sits at the origin, so light direction is simply towards it
    vec3 N = normalize(vNormalW);
    vec3 L = normalize(-vPosW);
    vec3 V = normalize(cameraPosition - vPosW);
    float diff = max(dot(N, L), 0.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 lit = col * (0.05 + diff * 1.15) + uColorB * rim * (diff * 0.6 + 0.05);
    gl_FragColor = vec4(lit, 1.0);
  }
`

export const sunFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uTime;
  varying vec3 vObj;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  ${noise}

  void main() {
    vec3 p = normalize(vObj);
    float n = fbm(p * 5.0 + vec3(0.0, uTime * 0.05, uTime * 0.03));
    float spots = smoothstep(0.55, 0.7, snoise(p * 3.0 + uTime * 0.01));
    vec3 col = mix(uColorA, uColorB, n * 0.6 + 0.55) - spots * 0.25;
    // Limb darkening: the edges of a star look dimmer and redder
    float mu = max(dot(normalize(vNormalW), normalize(cameraPosition - vPosW)), 0.0);
    col *= 0.55 + 0.6 * pow(mu, 0.5);
    gl_FragColor = vec4(col * 1.25, 1.0);
  }
`

export const ringVertex = /* glsl */ `
  varying float vRadius;
  varying vec3 vPosW;
  void main() {
    vRadius = length(position.xy);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

export const ringFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uInner;
  uniform float uOuter;
  varying float vRadius;
  varying vec3 vPosW;

  void main() {
    float r = (vRadius - uInner) / (uOuter - uInner);
    float bands = 0.55 + 0.25 * sin(r * 140.0) + 0.2 * sin(r * 37.0 + 1.3);
    float alpha = bands * smoothstep(0.0, 0.05, r) * smoothstep(1.0, 0.92, r);
    alpha *= mix(0.25, 1.0, smoothstep(0.0, 0.025, abs(r - 0.62))); // a Cassini-like gap
    vec3 col = mix(uColorA, uColorB, r);
    float light = 0.45 + 0.55 * clamp(1.0 - length(vPosW) * 0.0, 0.0, 1.0);
    gl_FragColor = vec4(col * light, alpha * 0.85);
  }
`

// Soft round points with additive glow — used for the galaxy and asteroid belts
export const pointsVertex = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  uniform float uTime;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vTwinkle = 0.75 + 0.25 * sin(uTime * 2.0 + position.x * 13.0 + position.z * 7.0);
    gl_PointSize = aSize * uPixelRatio * (120.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

export const pointsFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor * vTwinkle, a * a);
  }
`
