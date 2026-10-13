import { el } from './dom.js'
import { nasaImage, nasaDetails } from './data.js'

const EARTH_RADIUS_KM = 6371
const JUPITER_RADIUS_KM = 69911
const KM_PER_AU = 149.6e6

/**
 * One memorable line comparing this world's size with Earth's, shown at the bottom of the card.
 *
 * @param {{ name: string, radius: number }} body  radius in km
 * @returns {string}
 */
export function describeSize(body) {
  // TODO(you): make this comparison as vivid as you like. Volume scales with radius³,
  // so the default counts how many Earths fit inside (or how many of this world fit in Earth).
  const volume = Math.pow(body.radius / EARTH_RADIUS_KM, 3)
  if (body.id === 'earth') return 'The only world known to host life, so far.'
  return volume >= 1
    ? `About ${Math.round(volume).toLocaleString()} Earths would fit inside ${body.name}.`
    : `About ${Math.round(1 / volume).toLocaleString()} ${body.name}s would fit inside Earth.`
}

// Sphere diameter in px: a power curve keeps Pluto visible next to Jupiter
const sphereSize = (km) => Math.round(26 + Math.pow(km / JUPITER_RADIUS_KM, 0.55) * 120)

function formatYear(days) {
  return days < 1000 ? `${days.toLocaleString()} Earth days` : `${(days / 365.25).toFixed(1)} Earth years`
}

function formatLight(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  return h ? `${h} h ${m} min` : `${m} min ${s} s`
}

function bar(label, value, fraction) {
  return el(
    'div',
    { class: 'atlas-bar' },
    el('span', { class: 'atlas-bar-label', text: label }),
    el('span', { class: 'atlas-bar-track' }, el('span', { '--f': fraction })),
    el('span', { class: 'atlas-bar-value', text: value })
  )
}

export function initAtlas({ root, bodies, lightStops, onExplore }) {
  const planets = bodies.filter((b) => b.look.type !== 'star')
  const row = el('ul', { class: 'atlas-row' })
  const card = el('article', { class: 'atlas-card glass', 'aria-live': 'polite', hidden: '' })
  root.append(row, card)

  const maxRadius = Math.max(...planets.map((p) => p.radius))
  const maxAu = Math.max(...planets.map((p) => p.au))
  const buttons = new Map()
  let activeId = null
  let hideTimer = 0

  for (const body of planets) {
    const sphere = el('span', {
      class: 'atlas-sphere',
      'data-type': body.look.type,
      '--d': `${sphereSize(body.radius)}px`,
      '--a': body.look.a,
      '--b': body.look.b,
    })
    if (body.look.rings) sphere.dataset.rings = ''
    const button = el(
      'button',
      { class: 'atlas-planet', type: 'button', 'aria-label': `${body.name}: show details`, 'aria-expanded': 'false' },
      sphere,
      el('span', { class: 'atlas-name', text: body.name })
    )
    button.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && show(body.id))
    button.addEventListener('focus', () => show(body.id))
    // Touch has no hover: a tap toggles the card instead
    button.addEventListener('click', () => (activeId === body.id && !matchMedia('(hover: hover)').matches ? hide() : show(body.id)))
    buttons.set(body.id, button)
    row.append(el('li', {}, button))
  }

  function renderCard(body) {
    const light = lightStops.find((s) => s.name === body.name)
    const facts = [
      ['Distance', `${body.au} AU`],
      ['Year', formatYear(body.period)],
      ['Day', body.day],
      ['Moons', body.moons],
      ['Gravity', `${body.gravity}× Earth`],
      ['Temperature', body.temp],
    ]
    const img = el('img', { src: nasaImage(body.image, 'medium'), alt: `${body.name}, NASA image ${body.image}` })
    return el(
      'div',
      { class: 'atlas-card-body' },
      el(
        'figure',
        {},
        img,
        el('figcaption', {}, el('a', { href: nasaDetails(body.image), target: '_blank', rel: 'noopener', text: body.credit }))
      ),
      el(
        'div',
        { class: 'atlas-card-text' },
        el('p', { class: 'kicker', text: body.kind }),
        el('h3', { text: body.name }),
        el('p', { class: 'atlas-blurb', text: body.blurb }),
        el('dl', { class: 'atlas-facts' }, ...facts.map(([k, v]) => el('div', {}, el('dt', { text: k }), el('dd', { text: v })))),
        el(
          'div',
          { class: 'atlas-bars' },
          bar('Size', `${(body.radius / EARTH_RADIUS_KM).toFixed(2)}× Earth`, body.radius / maxRadius),
          bar('Distance', `${((body.au * KM_PER_AU) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 })} million km`, Math.sqrt(body.au / maxAu)),
          light ? bar('Sunlight', `${formatLight(light.seconds)} to arrive`, Math.sqrt(light.seconds / lightStops.at(-1).seconds)) : null
        ),
        el('p', { class: 'atlas-fun', text: describeSize(body) }),
        onExplore ? el('button', { class: 'chip', type: 'button', text: 'Explore in 3D →', onclick: () => onExplore(body.id) }) : null
      )
    )
  }

  function show(id) {
    clearTimeout(hideTimer)
    if (id === activeId && !card.hidden) return
    activeId = id
    const body = planets.find((p) => p.id === id)
    card.replaceChildren(renderCard(body))
    card.hidden = false
    row.classList.add('has-active')
    buttons.forEach((b, key) => {
      b.classList.toggle('active', key === id)
      b.setAttribute('aria-expanded', key === id)
    })
    pointArrowAt(buttons.get(id))
  }

  function hide() {
    activeId = null
    card.hidden = true
    row.classList.remove('has-active')
    buttons.forEach((b) => {
      b.classList.remove('active')
      b.setAttribute('aria-expanded', 'false')
    })
  }

  // The card spans the section; its arrow slides to sit under the hovered planet
  function pointArrowAt(button) {
    const cardBox = card.getBoundingClientRect()
    const box = button.querySelector('.atlas-sphere').getBoundingClientRect()
    const x = box.left + box.width / 2 - cardBox.left
    card.style.setProperty('--arrow-x', `${Math.min(Math.max(x, 24), cardBox.width - 24)}px`)
  }

  // Grace period so the pointer can travel from a planet down into the card
  root.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') hideTimer = setTimeout(hide, 350)
  })
  root.addEventListener('pointerenter', () => clearTimeout(hideTimer))
  root.addEventListener('focusout', (e) => !root.contains(e.relatedTarget) && hide())
  document.addEventListener('click', (e) => !root.contains(e.target) && activeId && hide())
  row.addEventListener('scroll', () => activeId && pointArrowAt(buttons.get(activeId)), { passive: true })
  addEventListener('resize', () => activeId && pointArrowAt(buttons.get(activeId)))

  // Warm the browser cache so the NASA photo is already there on first hover
  root.addEventListener(
    'pointerenter',
    () => planets.forEach((p) => (new Image().src = nasaImage(p.image, 'medium'))),
    { once: true }
  )

  return { show, hide }
}
