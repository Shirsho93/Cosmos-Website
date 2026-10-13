// Hero warp starfield on a plain 2D canvas. Stars live in a 3D box in front of the
// camera and are perspective-projected; scroll velocity stretches them into streaks.

const COLORS = ['#ffffff', '#cfe3ff', '#9ec8ff', '#ffe2b8', '#e0c8ff']

export function initStarfield(canvas) {
  const ctx = canvas.getContext('2d')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const DEPTH = 1000
  let w = 0, h = 0, dpr = 1
  let stars = []
  let active = true
  let warp = 0
  const steer = { x: 0, y: 0, tx: 0, ty: 0 }

  function spawn(star, z = Math.random() * DEPTH) {
    star.x = (Math.random() - 0.5) * 2000
    star.y = (Math.random() - 0.5) * 2000
    star.z = z
    star.pz = z
    star.c = COLORS[(Math.random() * COLORS.length) | 0]
    return star
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio, 2)
    w = canvas.clientWidth
    h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const count = Math.round(Math.min(1400, (w * h) / 900))
    stars = Array.from({ length: count }, () => spawn({}))
  }
  new ResizeObserver(resize).observe(canvas)
  resize()

  window.addEventListener('pointermove', (e) => {
    steer.tx = (e.clientX / innerWidth - 0.5) * 2
    steer.ty = (e.clientY / innerHeight - 0.5) * 2
  })

  let lastScroll = scrollY
  function frame() {
    requestAnimationFrame(frame)
    // Scroll velocity feeds the warp even when inactive, so it decays smoothly
    const v = Math.abs(scrollY - lastScroll)
    lastScroll = scrollY
    warp += (Math.min(v * 0.6, 40) - warp) * 0.08
    if (!active) return

    steer.x += (steer.tx - steer.x) * 0.04
    steer.y += (steer.ty - steer.y) * 0.04
    const cx = w / 2 - steer.x * w * 0.18
    const cy = h / 2 - steer.y * h * 0.18
    const speed = reduced ? 0.4 : 1.6 + warp
    const focal = Math.min(w, h) * 0.9

    ctx.fillStyle = `rgba(3, 4, 11, ${0.35 - Math.min(warp, 30) * 0.008})` // lower alpha = longer trails
    ctx.fillRect(0, 0, w, h)

    for (const s of stars) {
      s.pz = s.z
      s.z -= speed
      if (s.z < 1) spawn(s, DEPTH)

      const k = focal / s.z
      const x = cx + s.x * k * 0.5
      const y = cy + s.y * k * 0.5
      if (x < -50 || x > w + 50 || y < -50 || y > h + 50) {
        spawn(s, DEPTH)
        continue
      }
      const pk = focal / (s.pz + speed * 2)
      const px = cx + s.x * pk * 0.5
      const py = cy + s.y * pk * 0.5
      const near = 1 - s.z / DEPTH
      ctx.strokeStyle = s.c
      ctx.globalAlpha = Math.min(1, near * 1.4)
      ctx.lineWidth = Math.max(0.4, near * 2.4)
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  requestAnimationFrame(frame)

  return { setActive: (v) => (active = v) }
}
