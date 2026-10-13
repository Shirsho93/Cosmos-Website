import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { planetVertex, planetFragment, sunFragment, ringVertex, ringFragment, pointsVertex, pointsFragment } from './shaders.js'

const TYPE_IDS = { rocky: 1, cloudy: 2, earth: 3, banded: 4, ice: 5 }
const TILT = { earth: 23.4, mars: 25.2, saturn: 26.7, uranus: 97.8, neptune: 28.3, jupiter: 3.1 }
const DEFAULT_OFFSET = new THREE.Vector3(0, 48, 82)
const SUN_RADIUS = 4

/**
 * Maps a real orbital distance (AU) to scene units.
 *
 * Real spacing is brutal: Neptune is ~78× farther out than Mercury, so a linear
 * scale either crushes the inner planets into the Sun or pushes the outer ones
 * off-screen. This function decides the compromise.
 *
 * @param {number} au  distance from the Sun in astronomical units (0.39 … 39.5)
 * @returns {number}   distance in scene units (the Sun's radius is 4)
 */
export function compressDistance(au) {
  // TODO(you): choose how to squash the Solar System. Default: square-root scale
  // with an offset so Mercury clears the Sun.
  return SUN_RADIUS + 2 + Math.sqrt(au) * 9
}

/** Display radius: real sizes span 600×, so compress with a gentle power curve. */
const displayRadius = (km) => 0.25 + Math.pow(km / 6371, 0.45) * 0.5

function glowTexture(inner, outer) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.25, outer)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

function makeBelt(count, auMin, auMax, thickness, tint) {
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const size = new Float32Array(count)
  const c = new THREE.Color()
  for (let i = 0; i < count; i++) {
    const r = compressDistance(THREE.MathUtils.lerp(auMin, auMax, Math.random()))
    const a = Math.random() * Math.PI * 2
    pos.set([Math.cos(a) * r, (Math.random() - 0.5) * thickness, Math.sin(a) * r], i * 3)
    c.set(tint).offsetHSL(0, 0, (Math.random() - 0.5) * 0.2)
    col.set([c.r, c.g, c.b], i * 3)
    size[i] = 0.4 + Math.random() * 0.8
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  return geo
}

export function initSolarSystem({ container, labelsEl, bodies, onSelect }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000)
  camera.position.copy(DEFAULT_OFFSET)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.minDistance = 2
  controls.maxDistance = 220
  controls.enablePan = false
  // Don't hijack page scrolling: zoom only after the user clicks into the scene
  controls.enableZoom = false
  renderer.domElement.addEventListener('pointerdown', () => (controls.enableZoom = true))
  renderer.domElement.addEventListener('pointerleave', () => (controls.enableZoom = false))

  const pointsUniforms = {
    uPixelRatio: { value: renderer.getPixelRatio() },
    uTime: { value: 0 },
  }
  const pointsMaterial = () =>
    new THREE.ShaderMaterial({
      vertexShader: pointsVertex,
      fragmentShader: pointsFragment,
      uniforms: pointsUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

  // Background star sphere
  {
    const count = 3000
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(500 + Math.random() * 400)
      pos.set([v.x, v.y, v.z], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, color: 0xbfc8ff, transparent: true, opacity: 0.8 })))
  }

  const asteroidBelt = new THREE.Points(makeBelt(2600, 2.1, 3.3, 0.6, '#a39382'), pointsMaterial())
  const kuiperBelt = new THREE.Points(makeBelt(2400, 32, 48, 2.5, '#7f95c9'), pointsMaterial())
  scene.add(asteroidBelt, kuiperBelt)

  const clock = { days: 0 }
  const entries = []
  const pickables = []
  const orbitLines = []
  const sphere = new THREE.SphereGeometry(1, 96, 64)

  bodies.forEach((body, index) => {
    const group = new THREE.Group()
    const tilt = new THREE.Group()
    tilt.rotation.z = THREE.MathUtils.degToRad(TILT[body.id] || 0)
    group.add(tilt)

    const isSun = body.look.type === 'star'
    const uniforms = {
      uColorA: { value: new THREE.Color(body.look.a) },
      uColorB: { value: new THREE.Color(body.look.b) },
      uTime: { value: 0 },
      uSeed: { value: index * 7.31 },
      uSpot: { value: body.id === 'jupiter' ? 1 : 0 },
      uType: { value: TYPE_IDS[body.look.type] || 1 },
    }
    const mesh = new THREE.Mesh(
      sphere,
      new THREE.ShaderMaterial({ vertexShader: planetVertex, fragmentShader: isSun ? sunFragment : planetFragment, uniforms })
    )
    const radius = isSun ? SUN_RADIUS : displayRadius(body.radius)
    mesh.scale.setScalar(radius)
    mesh.userData.id = body.id
    tilt.add(mesh)
    pickables.push(mesh)

    if (isSun) {
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowTexture('rgba(255,236,170,1)', 'rgba(255,140,40,0.35)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })
      )
      glow.scale.setScalar(SUN_RADIUS * 7)
      group.add(glow)
    }

    if (body.look.rings) {
      const inner = radius * 1.3
      const outer = radius * 2.35
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 160, 1),
        new THREE.ShaderMaterial({
          vertexShader: ringVertex,
          fragmentShader: ringFragment,
          uniforms: { uColorA: { value: new THREE.Color('#8c7a5c') }, uColorB: { value: new THREE.Color('#efe2c4') }, uInner: { value: inner }, uOuter: { value: outer } },
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      )
      ring.rotation.x = -Math.PI / 2
      tilt.add(ring)
    }

    let moon = null
    if (body.id === 'earth') {
      moon = new THREE.Mesh(
        sphere,
        new THREE.ShaderMaterial({
          vertexShader: planetVertex,
          fragmentShader: planetFragment,
          uniforms: { ...uniforms, uColorA: { value: new THREE.Color('#57534f') }, uColorB: { value: new THREE.Color('#b9b4ad') }, uType: { value: 1 }, uSeed: { value: 42 } },
        })
      )
      moon.scale.setScalar(0.2)
      group.add(moon)
    }

    const distance = isSun ? 0 : compressDistance(body.au)
    if (!isSun) {
      const points = []
      for (let i = 0; i <= 256; i++) {
        const a = (i / 256) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(a) * distance, 0, Math.sin(a) * distance))
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: body.look.b, transparent: true, opacity: 0.18 })
      )
      scene.add(line)
      orbitLines.push(line)
    }

    const label = document.createElement('button')
    label.className = 'orbit-label'
    label.textContent = body.name
    label.addEventListener('click', () => select(body.id))
    labelsEl.append(label)

    scene.add(group)
    entries.push({
      body, group, mesh, moon, uniforms, label, radius, distance,
      phase: (index * 2.39996) % (Math.PI * 2), // golden-angle spread so planets don't line up
      spin: isSun ? 0.05 : 0.4 + (index % 3) * 0.2,
    })
  })

  // ---------- Selection & camera flights ----------
  let follow = null
  let flight = null
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const down = { x: 0, y: 0 }

  renderer.domElement.addEventListener('pointerdown', (e) => Object.assign(down, { x: e.clientX, y: e.clientY }))
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return // that was a drag
    const rect = renderer.domElement.getBoundingClientRect()
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    const hit = raycaster.intersectObjects(pickables, false)[0]
    if (hit) select(hit.object.userData.id)
  })

  function flyTo(offset) {
    flight = { from: camera.position.clone().sub(controls.target), to: offset, t: 0 }
  }

  function select(id) {
    const entry = entries.find((e) => e.body.id === id)
    if (!entry) return
    follow = entry
    const dist = entry.radius * (entry.body.look.rings ? 7 : 5) + 2
    flyTo(new THREE.Vector3(dist * 0.6, dist * 0.35, dist))
    entries.forEach((e) => e.label.classList.toggle('selected', e === entry))
    onSelect?.(entry.body)
  }

  function reset() {
    follow = null
    entries.forEach((e) => e.label.classList.remove('selected'))
    flyTo(DEFAULT_OFFSET.clone())
  }

  // ---------- Loop ----------
  let playing = true
  let active = false
  let daysPerSecond = 1
  let showLabels = true
  let last = performance.now()
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

  function frame(now) {
    requestAnimationFrame(frame)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    if (!active) return

    if (playing) clock.days += dt * daysPerSecond
    pointsUniforms.uTime.value = now / 1000
    asteroidBelt.rotation.y = -(clock.days / 1680) * Math.PI * 2
    kuiperBelt.rotation.y = -(clock.days / 90000) * Math.PI * 2

    for (const e of entries) {
      e.uniforms.uTime.value = now / 1000
      if (e.distance) {
        const angle = e.phase + (clock.days / e.body.period) * Math.PI * 2
        e.group.position.set(Math.cos(angle) * e.distance, 0, -Math.sin(angle) * e.distance)
      }
      e.mesh.rotation.y += dt * e.spin * (playing ? 1 : 0.15)
      if (e.moon) {
        const ma = (clock.days / 27.3) * Math.PI * 2
        e.moon.position.set(Math.cos(ma) * 1.4, 0, -Math.sin(ma) * 1.4)
      }
    }

    // Keep the camera locked onto the followed body while letting the user orbit it
    const desiredTarget = follow ? follow.group.position : tmp.set(0, 0, 0)
    const delta = desiredTarget.clone().sub(controls.target)
    controls.target.add(delta)
    camera.position.add(delta)
    if (flight) {
      flight.t = Math.min(flight.t + dt / 1.4, 1)
      camera.position.copy(controls.target).add(flight.from.clone().lerp(flight.to, ease(flight.t)))
      if (flight.t === 1) flight = null
    }
    controls.update()

    if (showLabels) {
      const w = container.clientWidth
      const h = container.clientHeight
      for (const e of entries) {
        tmp.copy(e.group.position)
        tmp.y += e.radius * 1.25
        tmp.project(camera)
        const visible = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1
        e.label.style.opacity = visible ? 1 : 0
        e.label.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`
      }
    }

    renderer.render(scene, camera)
  }
  requestAnimationFrame(frame)

  return {
    select,
    reset,
    setActive: (v) => (active = v),
    setPlaying: (v) => (playing = v),
    setSpeed: (v) => (daysPerSecond = v),
    setOrbits: (v) => orbitLines.forEach((l) => (l.visible = v)),
    setLabels: (v) => {
      showLabels = v
      labelsEl.classList.toggle('off', !v)
    },
  }
}
