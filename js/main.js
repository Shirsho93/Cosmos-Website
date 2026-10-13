import { bodies, extraGravity, lightStops, scaleSteps, timeline, featured, nasaImage, nasaDetails } from './data.js'
import { initSolarSystem } from './solar-system.js'
import { initGalaxy } from './galaxy.js'
import { initStarfield } from './starfield.js'
import { initAtlas } from './atlas.js'
import { el } from './dom.js'

const $ = (sel, root = document) => root.querySelector(sel)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b)
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

const isHttps = (url) => typeof url === 'string' && url.startsWith('https://')

/* ======================= Page chrome ======================= */

const nav = $('.nav')
const navToggle = $('.nav-toggle')
const progress = $('.progress')
const timelineEl = $('.timeline')
const timelineLine = $('.timeline-line span')
let lastY = scrollY
let scrollQueued = false

function onScroll() {
  scrollQueued = false
  const y = scrollY
  const max = document.documentElement.scrollHeight - innerHeight
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`
  nav.classList.toggle('scrolled', y > 40)
  nav.classList.toggle('hidden', y > 400 && y > lastY && !nav.classList.contains('open'))
  lastY = y

  const rect = timelineEl.getBoundingClientRect()
  timelineLine.style.transform = `scaleY(${clamp((innerHeight * 0.6 - rect.top) / rect.height)})`
}
addEventListener('scroll', () => {
  if (!scrollQueued) {
    scrollQueued = true
    requestAnimationFrame(onScroll)
  }
}, { passive: true })

navToggle.addEventListener('click', () => {
  const open = !nav.classList.contains('open')
  nav.classList.toggle('open', open)
  navToggle.setAttribute('aria-expanded', open)
})
$$('.nav nav a').forEach((a) =>
  a.addEventListener('click', () => {
    nav.classList.remove('open')
    navToggle.setAttribute('aria-expanded', 'false')
  })
)

// Highlight the nav link for whichever section is crossing the middle of the viewport
const navLinks = new Map($$('.nav nav a').map((a) => [a.getAttribute('href').slice(1), a]))
const sectionObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      navLinks.forEach((a, id) => a.classList.toggle('active', id === entry.target.id))
    }
  },
  { rootMargin: '-45% 0px -50% 0px' }
)
$$('main > section').forEach((s) => sectionObserver.observe(s))

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in')
        revealObserver.unobserve(entry.target)
      }
    }
  },
  { rootMargin: '0px 0px -10% 0px' }
)
const observeReveals = (root = document) => $$('.reveal:not(.in)', root).forEach((n) => revealObserver.observe(n))

function countUp(node) {
  const target = parseFloat(node.dataset.count)
  const decimals = +(node.dataset.decimals || 0)
  const suffix = node.dataset.suffix || ''
  const start = performance.now()
  const duration = reducedMotion ? 0 : 1800
  const fmt = (v) => v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
  ;(function tick(now) {
    const t = duration ? clamp((now - start) / duration) : 1
    node.textContent = fmt(target * easeOut(t))
    if (t < 1) requestAnimationFrame(tick)
  })(start)
}

/** Run a scene init defensively: if WebGL is unavailable the rest of the page still works. */
function safely(name, fn, fallbackEl) {
  try {
    return fn()
  } catch (err) {
    console.warn(`[cosmos] ${name} failed to start`, err)
    fallbackEl?.append(el('p', { class: 'scene-error', text: 'This 3D scene needs WebGL, which is not available in this browser.' }))
    return null
  }
}

/* ======================= Hero starfield ======================= */

const starfield = safely('starfield', () => initStarfield($('#starfield')))

/* ======================= Solar System ======================= */

const panel = $('.planet-panel')
const chipsEl = $('.planet-chips')
const chips = new Map()

function formatPeriod(days) {
  if (!days) return '~230 million years (around the galaxy)'
  return days < 1000 ? `${days.toLocaleString()} days` : `${(days / 365.25).toFixed(1)} years`
}

function showPanel(body) {
  chips.forEach((chip, id) => chip.classList.toggle('active', id === body.id))
  const img = $('img', panel)
  img.src = nasaImage(body.image, 'medium')
  img.alt = `${body.name}, NASA image ${body.image}`
  $('figcaption', panel).replaceChildren(
    el('a', { href: nasaDetails(body.image), target: '_blank', rel: 'noopener', text: body.credit })
  )
  $('.panel-kind', panel).textContent = body.kind
  $('.panel-name', panel).textContent = body.name
  $('.panel-blurb', panel).textContent = body.blurb
  const facts = [
    ['Distance from Sun', body.au ? `${body.au} AU · ${(body.au * 149.6).toFixed(1)} million km` : '—'],
    ['Orbital period', formatPeriod(body.period)],
    ['Radius', `${body.radius.toLocaleString()} km`],
    ['Surface gravity', `${body.gravity}× Earth`],
    ['Moons', body.moons],
    ['Length of day', body.day],
    ['Temperature', body.temp],
  ]
  $('.panel-facts', panel).replaceChildren(...facts.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })]))
  panel.hidden = false
  panel.scrollTop = 0
}

function hidePanel() {
  panel.hidden = true
  chips.forEach((chip) => chip.classList.remove('active'))
}

const orrery = safely(
  'orrery',
  () => initSolarSystem({ container: $('#orrery-canvas'), labelsEl: $('.orrery-labels'), bodies, onSelect: showPanel }),
  $('#orrery-canvas')
)

for (const body of bodies) {
  const chip = el(
    'button',
    { class: 'chip', type: 'button', role: 'tab', onclick: () => (orrery ? orrery.select(body.id) : showPanel(body)) },
    el('i', { style: { background: `radial-gradient(circle at 35% 35%, ${body.look.b}, ${body.look.a})` } }),
    body.name
  )
  chips.set(body.id, chip)
  chipsEl.append(chip)
}

$('.panel-close', panel).addEventListener('click', () => {
  hidePanel()
  orrery?.reset()
})
$('#orrery-reset').addEventListener('click', () => {
  hidePanel()
  orrery?.reset()
})

const speedInput = $('#orrery-speed')
const speedLabel = $('#orrery-speed-label')
function applySpeed() {
  // Logarithmic slider: 0 → 0.01 days/s (≈15 min/s), 100 → 1,000 days/s
  const dps = Math.pow(10, (speedInput.value / 100) * 5 - 2)
  orrery?.setSpeed(dps)
  speedLabel.textContent =
    dps < 1 ? `${(dps * 24).toFixed(1)} hours / s`
    : dps < 365 ? `${dps.toFixed(dps < 10 ? 1 : 0)} days / s`
    : `${(dps / 365.25).toFixed(1)} years / s`
}
speedInput.addEventListener('input', applySpeed)
applySpeed()

let playing = true
const playBtn = $('#orrery-play')
playBtn.addEventListener('click', () => {
  playing = !playing
  orrery?.setPlaying(playing)
  playBtn.textContent = playing ? '❚❚' : '▶'
  playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play')
})
$('#toggle-orbits').addEventListener('change', (e) => orrery?.setOrbits(e.target.checked))
$('#toggle-labels').addEventListener('change', (e) => orrery?.setLabels(e.target.checked))

/* ======================= Planet atlas ======================= */

initAtlas({
  root: $('.atlas'),
  bodies,
  lightStops,
  onExplore: (id) => {
    $('#solar').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
    orrery ? orrery.select(id) : showPanel(bodies.find((b) => b.id === id))
  },
})

/* ======================= Weight across worlds ======================= */

const weightInput = $('#weight-input')
const weightGrid = $('.weight-grid')
let unit = 'kg'

const worlds = bodies.flatMap((b) => {
  const world = { id: b.id, name: b.name, gravity: b.gravity, c: b.look.a, c2: b.look.b }
  return b.id === 'earth' ? [world, ...extraGravity.map((m) => ({ ...m, c: '#57534f', c2: '#d6d2cb' }))] : [world]
})

const weightCards = worlds.map((w) => {
  const value = el('p', { class: 'value', text: '0' })
  const bar = el('span', { style: { transform: 'scaleX(0)' } })
  const card = el(
    'article',
    { class: 'weight-card reveal', '--c': w.c, '--c2': w.c2 },
    el('div', { class: 'orb' }),
    el('h3', { text: w.name }),
    value,
    el('small', { text: `${w.gravity}× Earth gravity` }),
    el('div', { class: 'bar' }, bar)
  )
  weightGrid.append(card)
  return { ...w, value, bar, shown: 0 }
})

function updateWeights() {
  const base = Math.max(0, parseFloat(weightInput.value) || 0)
  for (const card of weightCards) {
    const from = card.shown
    const to = base * card.gravity
    const start = performance.now()
    card.shown = to
    card.bar.style.transform = `scaleX(${Math.min(card.gravity / 3, 1)})`
    cancelAnimationFrame(card.raf)
    const tick = (now) => {
      const t = reducedMotion ? 1 : clamp((now - start) / 700)
      const v = from + (to - from) * easeOut(t)
      card.value.textContent = `${v.toLocaleString(undefined, { maximumFractionDigits: v < 10 ? 1 : 0 })} ${unit}`
      if (t < 1) card.raf = requestAnimationFrame(tick)
    }
    card.raf = requestAnimationFrame(tick)
  }
}
weightInput.addEventListener('input', updateWeights)

$$('.unit-switch button').forEach((btn) =>
  btn.addEventListener('click', () => {
    if (btn.dataset.unit === unit) return
    const factor = btn.dataset.unit === 'lb' ? 2.20462 : 1 / 2.20462
    unit = btn.dataset.unit
    weightInput.value = Math.round((parseFloat(weightInput.value) || 0) * factor)
    weightCards.forEach((c) => (c.shown *= factor))
    $$('.unit-switch button').forEach((b) => b.classList.toggle('active', b === btn))
    updateWeights()
  })
)
updateWeights()

/* ======================= Riding a beam of light ======================= */

const track = $('.light-track')
const beam = $('.light-beam', track)
const photon = $('.light-photon', track)
const lightTime = $('#light-time')
const lightDistance = $('#light-distance')
const lightPassing = $('#light-passing')
const lightGo = $('#light-go')
const warpSelect = $('#light-warp')
const tMax = lightStops.at(-1).seconds
// sqrt spacing: real distances would put Mercury–Mars in the first 4% of the track
const trackPos = (seconds) => Math.sqrt(seconds / tMax)

const stopEls = lightStops.map((stop) => {
  const node = el('div', { class: 'light-stop', style: { left: `${trackPos(stop.seconds) * 100}%` } }, el('i'), el('span', { text: stop.name }))
  $('.light-stops', track).append(node)
  return node
})

function formatDuration(s) {
  if (s < 60) return `${s.toFixed(0)} s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h ? `${h} h ${m} min` : `${m} min ${sec} s`
}

let lightRun = null
function lightFrame(now) {
  if (!lightRun) return
  const elapsed = Math.min(((now - lightRun.start) / 1000) * lightRun.warp + lightRun.offset, tMax)
  const p = trackPos(elapsed)
  photon.style.left = `${p * 100}%`
  beam.style.transform = `scaleX(${p})`
  lightTime.textContent = formatDuration(elapsed)
  lightDistance.textContent = `${Math.round(elapsed * 299792).toLocaleString()} km`

  let passed = 'Leaving the Sun'
  lightStops.forEach((stop, i) => {
    const reached = elapsed >= stop.seconds
    stopEls[i].classList.toggle('reached', reached)
    if (reached) passed = stop.name
  })
  lightPassing.textContent = passed

  if (elapsed >= tMax) {
    lightRun = null
    lightGo.textContent = 'Launch again'
    lightPassing.textContent = 'Pluto, and onward to the stars'
    return
  }
  requestAnimationFrame(lightFrame)
}

lightGo.addEventListener('click', () => {
  stopEls.forEach((s) => s.classList.remove('reached'))
  photon.classList.add('on')
  lightGo.textContent = 'Restart'
  lightRun = { start: performance.now(), offset: 0, warp: +warpSelect.value }
  requestAnimationFrame(lightFrame)
})
// Changing warp mid-flight banks the time travelled so far, so the photon doesn't jump
warpSelect.addEventListener('change', () => {
  if (!lightRun) return
  const now = performance.now()
  lightRun.offset += ((now - lightRun.start) / 1000) * lightRun.warp
  lightRun.start = now
  lightRun.warp = +warpSelect.value
})

/* ======================= Milky Way ======================= */

const galaxy = safely('galaxy', () => initGalaxy({ container: $('#galaxy-canvas') }), $('#galaxy-canvas'))
$$('.galaxy-controls .chip').forEach((chip) =>
  chip.addEventListener('click', () => {
    $$('.galaxy-controls .chip').forEach((c) => c.classList.toggle('active', c === chip))
    galaxy?.setView(chip.dataset.view)
  })
)

/* ======================= Zooming out ======================= */

const scaleRange = $('#scale-range')
const scaleFramesEl = $('.scale-frames')
const scaleTicks = $('.scale-ticks')
const scaleFrames = scaleSteps.map((step, i) => {
  const frame = el('div', {
    class: 'scale-frame',
    role: 'img',
    'aria-label': step.name,
    style: { backgroundImage: `url("${nasaImage(step.image, 'medium')}")`, zIndex: 100 - i },
  })
  scaleFramesEl.append(frame)
  return frame
})
const tickButtons = scaleSteps.map((step, i) => {
  // Pin each label to its slider stop rather than spacing labels evenly between themselves
  const btn = el(
    'button',
    { type: 'button', 'aria-label': `Jump to ${step.name}`, '--p': i / (scaleSteps.length - 1), onclick: () => animateScaleTo(i) },
    el('span', { text: step.tick })
  )
  scaleTicks.append(btn)
  return btn
})

let shownStep = -1
function renderScale() {
  const v = +scaleRange.value
  scaleFrames.forEach((frame, i) => {
    const d = v - i
    let scale = 1, opacity = 0
    if (d >= 0 && d <= 1) {
      // The current view shrinks away into the centre of the bigger picture
      scale = 1 - 0.75 * d
      opacity = 1 - d
    } else if (d < 0 && d >= -1) {
      // The next, larger view arrives from "too close" and settles to normal size
      scale = 1 + 1.5 * -d
      opacity = 1 + d
    }
    if (i === scaleFrames.length - 1 && d >= 0) opacity = 1
    frame.style.opacity = opacity
    frame.style.visibility = opacity > 0.001 ? 'visible' : 'hidden'
    frame.style.transform = `scale(${scale})`
    frame.style.filter = `blur(${Math.abs(d) < 1 ? Math.abs(d) * 4 : 0}px)`
  })

  const step = Math.round(v)
  if (step !== shownStep) {
    shownStep = step
    const s = scaleSteps[step]
    $('.scale-step').textContent = `Step ${step + 1} of ${scaleSteps.length}`
    $('.scale-name').textContent = s.name
    $('.scale-size').textContent = s.size
    $('.scale-note').textContent = s.note
    $('.scale-credit').replaceChildren(el('a', { href: nasaDetails(s.image), target: '_blank', rel: 'noopener', text: `Image: ${s.credit}` }))
    tickButtons.forEach((b, i) => b.classList.toggle('active', i === step))
  }
}

let scaleAnim = 0
function animateScaleTo(target) {
  cancelAnimationFrame(scaleAnim)
  const from = +scaleRange.value
  const start = performance.now()
  const duration = reducedMotion ? 0 : 500 + Math.abs(target - from) * 250
  const tick = (now) => {
    const t = duration ? clamp((now - start) / duration) : 1
    scaleRange.value = from + (target - from) * easeOut(t)
    renderScale()
    if (t < 1) scaleAnim = requestAnimationFrame(tick)
  }
  scaleAnim = requestAnimationFrame(tick)
}
scaleRange.addEventListener('input', () => {
  cancelAnimationFrame(scaleAnim)
  renderScale()
})
renderScale()

/* ======================= Deep field lens ======================= */

const deepfield = $('.deepfield')
const deepImg = $('img', deepfield)
const lens = $('.lens', deepfield)
const LENS_ZOOM = 3
const LENS_HALF = 110

function moveLens(e) {
  const box = deepfield.getBoundingClientRect()
  const x = e.clientX - box.left
  const y = e.clientY - box.top
  // The <img> uses object-fit: cover, so work out where the picture is actually drawn
  const nw = deepImg.naturalWidth || 1
  const nh = deepImg.naturalHeight || 1
  const s = Math.max(deepImg.clientWidth / nw, deepImg.clientHeight / nh)
  const dw = nw * s
  const dh = nh * s
  const ox = (deepImg.clientWidth - dw) / 2
  const oy = (deepImg.clientHeight - dh) / 2
  lens.style.transform = `translate(${x}px, ${y}px)`
  lens.style.backgroundSize = `${dw * LENS_ZOOM}px ${dh * LENS_ZOOM}px`
  lens.style.backgroundPosition = `${-((x - ox) * LENS_ZOOM - LENS_HALF)}px ${-((y - oy) * LENS_ZOOM - LENS_HALF)}px`
}
deepfield.addEventListener('pointermove', moveLens)
deepfield.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse') deepfield.classList.add('touching')
  moveLens(e)
})
;['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => deepfield.addEventListener(type, () => deepfield.classList.remove('touching')))

/* ======================= Timeline ======================= */

for (const item of timeline) {
  timelineEl.append(el('li', { class: 'reveal' }, el('p', { class: 'when', text: item.when }), el('h3', { text: item.title }), el('p', { text: item.text })))
}

/* ======================= Lightbox ======================= */

const lightbox = $('.lightbox')
const lightboxImg = $('img', lightbox)
let lightboxReturn = null

function openLightbox({ sources, alt, caption, link }) {
  lightboxReturn = document.activeElement
  const queue = sources.filter(isHttps)
  lightboxImg.onerror = () => {
    if (queue.length) lightboxImg.src = queue.shift()
  }
  lightboxImg.src = queue.shift()
  lightboxImg.alt = alt
  $('figcaption', lightbox).replaceChildren(
    caption,
    link ? ' · ' : '',
    link ? el('a', { href: link, target: '_blank', rel: 'noopener', text: 'View on NASA Images' }) : ''
  )
  lightbox.hidden = false
  document.body.style.overflow = 'hidden'
  $('.lightbox-close', lightbox).focus()
}
function closeLightbox() {
  lightbox.hidden = true
  lightboxImg.removeAttribute('src')
  document.body.style.overflow = ''
  lightboxReturn?.focus()
}
$('.lightbox-close', lightbox).addEventListener('click', closeLightbox)
lightbox.addEventListener('click', (e) => e.target === lightbox && closeLightbox())
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.hidden) closeLightbox()
  if (e.key === 'Escape' && !panel.hidden) $('.panel-close', panel).click()
})

/* ======================= Gallery ======================= */

function makeTile({ thumb, title, credit, onOpen, index = 0 }) {
  const tile = el(
    'button',
    { class: 'tile', type: 'button', '--i': index, onclick: onOpen },
    el('img', { src: thumb, alt: title, loading: 'lazy' }),
    el('span', { class: 'tile-text' }, title, el('small', { text: credit }))
  )
  if (!reducedMotion) {
    tile.addEventListener('pointermove', (e) => {
      const r = tile.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      tile.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 10}deg)`
      tile.style.setProperty('--gx', `${px * 100}%`)
      tile.style.setProperty('--gy', `${py * 100}%`)
    })
    tile.addEventListener('pointerleave', () => (tile.style.transform = ''))
  }
  return tile
}

const featuredGrid = $('.featured-grid')
featured.forEach((item, i) => {
  featuredGrid.append(
    makeTile({
      thumb: nasaImage(item.id, i < 2 ? 'large' : 'medium'),
      title: item.title,
      credit: item.credit,
      onOpen: () =>
        openLightbox({
          sources: [nasaImage(item.id, 'large'), nasaImage(item.id, 'medium')],
          alt: item.title,
          caption: `${item.title} · ${item.credit}`,
          link: nasaDetails(item.id),
        }),
    })
  )
})
$$('.tile', featuredGrid).forEach((t) => t.classList.add('reveal'))

// --- Live NASA Image Library search (this API, unlike the image CDN, sends CORS headers) ---
const searchForm = $('#search-form')
const searchInput = $('#search-input')
const searchStatus = $('.search-status')
const resultsGrid = $('.results-grid')
let searchAbort = null

async function searchNasa(query) {
  query = query.trim()
  if (!query) return
  searchAbort?.abort()
  searchAbort = new AbortController()
  searchStatus.textContent = `Searching NASA for “${query}”…`
  try {
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page_size=24`
    const res = await fetch(url, { signal: searchAbort.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const items = (json.collection?.items || [])
      .map((item) => ({ meta: item.data?.[0], preview: item.links?.find((l) => l.render === 'image')?.href ?? item.links?.[0]?.href }))
      .filter((x) => x.meta?.nasa_id && isHttps(x.preview))

    resultsGrid.replaceChildren(
      ...items.map(({ meta, preview }, i) => {
        const credit = meta.secondary_creator || meta.photographer || meta.center || 'NASA'
        const id = encodeURIComponent(meta.nasa_id)
        return makeTile({
          thumb: preview,
          title: meta.title || meta.nasa_id,
          credit: `${credit}${meta.date_created ? ` · ${meta.date_created.slice(0, 4)}` : ''}`,
          index: i,
          onOpen: () =>
            openLightbox({
              sources: [`https://images-assets.nasa.gov/image/${id}/${id}~medium.jpg`, preview],
              alt: meta.title || meta.nasa_id,
              caption: `${meta.title || meta.nasa_id} · ${credit}`,
              link: `https://images.nasa.gov/details/${id}`,
            }),
        })
      })
    )
    searchStatus.textContent = items.length
      ? `${items.length} images for “${query}” from the NASA Image and Video Library`
      : `No images found for “${query}”. Try a broader term.`
  } catch (err) {
    if (err.name === 'AbortError') return
    searchStatus.textContent = 'The NASA image search is not responding right now. Please try again in a moment.'
  }
}

searchForm.addEventListener('submit', (e) => {
  e.preventDefault()
  searchNasa(searchInput.value)
})
$$('.search-chips .chip').forEach((chip) =>
  chip.addEventListener('click', () => {
    searchInput.value = chip.dataset.q
    $$('.search-chips .chip').forEach((c) => c.classList.toggle('active', c === chip))
    searchNasa(chip.dataset.q)
  })
)

// --- Astronomy Picture of the Day. DEMO_KEY is heavily rate-limited, so fail quietly ---
async function loadApod() {
  const box = $('.apod')
  try {
    const res = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&thumbs=true')
    if (!res.ok) return
    const data = await res.json()
    const media = $('.apod-media', box)
    if (data.media_type === 'image' && isHttps(data.url)) {
      const img = el('img', { src: data.url, alt: data.title || 'Astronomy Picture of the Day', loading: 'lazy' })
      img.style.cursor = 'zoom-in'
      img.addEventListener('click', () =>
        openLightbox({ sources: [data.hdurl, data.url], alt: data.title, caption: `${data.title} · ${data.copyright ? `© ${data.copyright.trim()}` : 'NASA APOD'}` })
      )
      media.replaceChildren(img)
    } else if (data.media_type === 'video' && /^https:\/\/(www\.youtube\.com|player\.vimeo\.com)\//.test(data.url)) {
      media.replaceChildren(el('iframe', { src: data.url, title: data.title || 'APOD video', allowfullscreen: '', loading: 'lazy' }))
    } else if (isHttps(data.thumbnail_url)) {
      media.replaceChildren(el('img', { src: data.thumbnail_url, alt: data.title || '' }))
    } else return

    $('.apod-title', box).textContent = data.title || ''
    $('.apod-date', box).textContent = data.date ? new Date(`${data.date}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'long' }) : ''
    $('.apod-explanation', box).textContent = data.explanation || ''
    // APOD images are often NOT NASA's: respect the photographer's copyright when present
    $('.apod-credit', box).textContent = data.copyright ? `Image credit & copyright: ${data.copyright.trim()}` : 'Image credit: NASA'
    box.hidden = false
    observeReveals(box.parentElement)
  } catch {
    /* leave the APOD card hidden */
  }
}

// Only hit the APIs once the visitor actually approaches the gallery
const galleryObserver = new IntersectionObserver(
  (entries) => {
    if (!entries[0].isIntersecting) return
    galleryObserver.disconnect()
    loadApod()
    $('.search-chips .chip').click()
  },
  { rootMargin: '600px 0px' }
)
galleryObserver.observe($('#gallery'))

/* ======================= Pause offscreen scenes ======================= */

const scenes = [
  [$('#hero'), starfield],
  [$('.orrery'), orrery],
  [$('#milkyway'), galaxy],
]
const sceneObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) scenes.find(([node]) => node === entry.target)?.[1]?.setActive(entry.isIntersecting)
  },
  { rootMargin: '100px 0px' }
)
scenes.forEach(([node]) => sceneObserver.observe(node))

/* ======================= Boot ======================= */

document.documentElement.classList.add('booted')
observeReveals()
$$('.hero-stats [data-count]').forEach(countUp)
onScroll()
