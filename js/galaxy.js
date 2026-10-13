import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { pointsVertex, pointsFragment } from './shaders.js'

const RADIUS = 50
const ARMS = 4
const PITCH = THREE.MathUtils.degToRad(12) // the Milky Way's arms wind at roughly 12°
const SUN_R = 26 // ~26,000 ly out of a ~50,000 ly radius

const VIEWS = {
  tilt: new THREE.Vector3(0, 45, 85),
  top: new THREE.Vector3(0, 110, 0.01),
  edge: new THREE.Vector3(0, 3, 110),
}

// Box–Muller: normally distributed scatter keeps arms dense in the middle, fuzzy at the edges
function gauss() {
  const u = 1 - Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random())
}

function buildStars(count) {
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const size = new Float32Array(count)
  const c = new THREE.Color()
  const bulge = new THREE.Color('#ffd29a')
  const arm = new THREE.Color('#9ec8ff')
  const hii = new THREE.Color('#ff6fb3')
  const barAngle = THREE.MathUtils.degToRad(25)

  for (let i = 0; i < count; i++) {
    const roll = Math.random()
    let x, y, z

    if (roll < 0.18) {
      // Central bulge + bar: an elongated ellipsoid
      const r = Math.abs(gauss()) * 4.5
      const a = Math.random() * Math.PI * 2
      const bx = Math.cos(a) * r * 2.1
      const bz = Math.sin(a) * r * 0.8
      x = bx * Math.cos(barAngle) - bz * Math.sin(barAngle)
      z = bx * Math.sin(barAngle) + bz * Math.cos(barAngle)
      y = gauss() * 1.8 * Math.exp(-r / 8)
      c.copy(bulge).offsetHSL(0, 0, (Math.random() - 0.5) * 0.15)
      size[i] = 1.2 + Math.random() * 1.6
    } else if (roll < 0.88) {
      // Logarithmic spiral arms starting at the end of the bar
      const r = 6 + Math.pow(Math.random(), 0.8) * (RADIUS - 6)
      const armIndex = i % ARMS
      const theta = Math.log(r / 6) / Math.tan(PITCH) + (armIndex / ARMS) * Math.PI * 2 + barAngle
      const spread = 1.2 + r * 0.07
      x = Math.cos(theta) * r + gauss() * spread
      z = Math.sin(theta) * r + gauss() * spread
      y = gauss() * 0.6
      c.copy(bulge).lerp(arm, Math.min((r / RADIUS) * 1.6, 1))
      if (Math.random() < 0.035) c.copy(hii) // star-forming regions glow pink
      size[i] = 0.7 + Math.random() * 1.4
    } else {
      // Diffuse disc stars between the arms
      const r = Math.sqrt(Math.random()) * RADIUS * 1.05
      const a = Math.random() * Math.PI * 2
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      y = gauss() * 1.4
      c.set('#c8c6e8').multiplyScalar(0.55)
      size[i] = 0.5 + Math.random() * 0.8
    }

    pos.set([x, y, z], i * 3)
    col.set([c.r, c.g, c.b], i * 3)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  return geo
}

function glowSprite(color, scale, opacity) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity })
  )
  sprite.scale.set(scale, scale, 1)
  return sprite
}

export function initGalaxy({ container }) {
  const coarse = matchMedia('(pointer: coarse)').matches
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
  camera.position.copy(VIEWS.tilt)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enableZoom = false
  controls.enablePan = false
  controls.enabled = !coarse // on touch screens the canvas must not swallow page scrolling

  const galaxy = new THREE.Group()
  scene.add(galaxy)

  const uniforms = { uPixelRatio: { value: renderer.getPixelRatio() }, uTime: { value: 0 } }
  galaxy.add(
    new THREE.Points(
      buildStars(coarse ? 38000 : 70000),
      new THREE.ShaderMaterial({
        vertexShader: pointsVertex,
        fragmentShader: pointsFragment,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
  )
  galaxy.add(glowSprite('rgba(255,214,150,0.9)', 34, 0.9))
  galaxy.add(glowSprite('rgba(150,120,255,0.25)', 130, 0.6))

  // The Sun's position in galaxy-local space, so it rotates with the disc
  const sunLocal = new THREE.Vector3(Math.cos(2.2) * SUN_R, 0, Math.sin(2.2) * SUN_R)
  const marker = document.createElement('div')
  marker.className = 'sun-marker'
  const markerText = document.createElement('span')
  markerText.textContent = 'You are here'
  marker.append(markerText)
  container.append(marker)

  let active = false
  let autoRotate = true
  let flight = null
  const tmp = new THREE.Vector3()
  const ease = (t) => 1 - Math.pow(1 - t, 3)

  function resize() {
    const { clientWidth: w, clientHeight: h } = container
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(container)
  resize()

  function setView(name) {
    const focusSun = name === 'sun'
    autoRotate = !focusSun
    const target = focusSun ? galaxy.localToWorld(sunLocal.clone()) : new THREE.Vector3()
    const offset = focusSun ? new THREE.Vector3(8, 12, 22) : VIEWS[name]
    flight = {
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPos: target.clone().add(offset),
      toTarget: target,
      t: 0,
    }
  }

  let last = performance.now()
  function frame(now) {
    requestAnimationFrame(frame)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    if (!active) return

    uniforms.uTime.value = now / 1000
    if (autoRotate) galaxy.rotation.y += dt * 0.03

    if (flight) {
      flight.t = Math.min(flight.t + dt / 1.6, 1)
      const k = ease(flight.t)
      camera.position.lerpVectors(flight.fromPos, flight.toPos, k)
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k)
      if (flight.t === 1) flight = null
    }
    controls.update()

    tmp.copy(sunLocal)
    galaxy.localToWorld(tmp)
    tmp.project(camera)
    marker.style.opacity = tmp.z < 1 ? 1 : 0
    marker.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * container.clientWidth}px, ${(-tmp.y * 0.5 + 0.5) * container.clientHeight}px)`

    renderer.render(scene, camera)
  }
  requestAnimationFrame(frame)

  return { setView, setActive: (v) => (active = v) }
}
