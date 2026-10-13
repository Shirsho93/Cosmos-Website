// All imagery is served from the NASA Image and Video Library (images.nasa.gov).
// NASA-produced media is generally not copyrighted; credits follow NASA's guidelines.
export const nasaImage = (id, size = 'medium') =>
  `https://images-assets.nasa.gov/image/${id}/${id}~${size}.jpg`
export const nasaDetails = (id) => `https://images.nasa.gov/details/${id}`

/**
 * Bodies for the orrery. Distances in AU, periods in Earth days, radius in km.
 * `gravity` is surface gravity relative to Earth (used by the weight calculator).
 * `look` drives the procedural shader: base colours + surface style.
 */
export const bodies = [
  {
    id: 'sun', name: 'Sun', kind: 'Star (G-type main sequence)',
    au: 0, period: 0, radius: 696340, gravity: 27.9, moons: '—',
    temp: '5,500 °C surface · 15 million °C core', day: '~25–35 days (varies by latitude)',
    blurb: 'A 4.6-billion-year-old ball of hydrogen and helium holding 99.8% of the Solar System’s mass. Every second it fuses roughly 600 million tonnes of hydrogen into helium.',
    image: 'PIA26681', credit: 'NASA/GSFC/Solar Dynamics Observatory',
    look: { type: 'star', a: '#ff9b2f', b: '#fff1a8' },
  },
  {
    id: 'mercury', name: 'Mercury', kind: 'Terrestrial planet',
    au: 0.387, period: 88, radius: 2440, gravity: 0.38, moons: '0',
    temp: '−173 °C to 427 °C', day: '176 Earth days (sunrise to sunrise)',
    blurb: 'The smallest planet and the closest to the Sun. With almost no atmosphere to hold heat, it swings between scorching days and frozen nights.',
    image: 'PIA15162', credit: 'NASA/JHUAPL/Carnegie Institution of Washington',
    look: { type: 'rocky', a: '#5d5650', b: '#a39a8f' },
  },
  {
    id: 'venus', name: 'Venus', kind: 'Terrestrial planet',
    au: 0.723, period: 225, radius: 6052, gravity: 0.91, moons: '0',
    temp: '~465 °C (hottest planet)', day: '243 Earth days, spinning backwards',
    blurb: 'Wrapped in a crushing carbon-dioxide atmosphere and clouds of sulfuric acid, Venus traps heat so well it is hotter than Mercury.',
    image: 'PIA00271', credit: 'NASA/JPL',
    look: { type: 'cloudy', a: '#b8813f', b: '#f3d9a4' },
  },
  {
    id: 'earth', name: 'Earth', kind: 'Terrestrial planet',
    au: 1, period: 365.25, radius: 6371, gravity: 1, moons: '1',
    temp: '~15 °C average', day: '24 hours',
    blurb: 'The only world known to host life, with liquid oceans covering about 71% of its surface and a protective magnetic field.',
    image: 'as17-148-22727', credit: 'NASA (Apollo 17 crew)',
    look: { type: 'earth', a: '#1d4f91', b: '#3f8f4a' },
  },
  {
    id: 'mars', name: 'Mars', kind: 'Terrestrial planet',
    au: 1.524, period: 687, radius: 3390, gravity: 0.38, moons: '2',
    temp: '~−65 °C average', day: '24 h 37 min',
    blurb: 'A cold desert world coloured by iron oxide dust. It hosts Olympus Mons, the tallest volcano in the Solar System, and ancient river valleys.',
    image: 'PIA00407', credit: 'NASA/JPL/USGS',
    look: { type: 'rocky', a: '#7a2e17', b: '#d4744a' },
  },
  {
    id: 'jupiter', name: 'Jupiter', kind: 'Gas giant',
    au: 5.203, period: 4333, radius: 69911, gravity: 2.53, moons: '95+',
    temp: '~−110 °C cloud tops', day: '9 h 56 min (fastest spin)',
    blurb: 'More than twice as massive as all the other planets combined. Its Great Red Spot is a storm wider than Earth that has raged for centuries.',
    image: 'PIA22946', credit: 'NASA/JPL-Caltech/SwRI/MSSS',
    look: { type: 'banded', a: '#8a5a3b', b: '#efd9b4' },
  },
  {
    id: 'saturn', name: 'Saturn', kind: 'Gas giant',
    au: 9.537, period: 10759, radius: 58232, gravity: 1.07, moons: '270+',
    temp: '~−140 °C cloud tops', day: '10 h 33 min',
    blurb: 'Famous for its rings of ice and rock, some as thin as 10 metres. Saturn is so light for its size that it would float in a big enough bathtub.',
    image: 'PIA06193', credit: 'NASA/JPL/Space Science Institute',
    look: { type: 'banded', a: '#b08d57', b: '#f4e4bc', rings: true },
  },
  {
    id: 'uranus', name: 'Uranus', kind: 'Ice giant',
    au: 19.19, period: 30687, radius: 25362, gravity: 0.89, moons: '28+',
    temp: '~−195 °C', day: '17 h 14 min',
    blurb: 'An ice giant tipped on its side by about 98°, so each pole gets around 42 years of continuous sunlight followed by 42 years of darkness.',
    image: 'PIA18182', credit: 'NASA/JPL-Caltech',
    look: { type: 'ice', a: '#6fc3cf', b: '#c6f0f2' },
  },
  {
    id: 'neptune', name: 'Neptune', kind: 'Ice giant',
    au: 30.07, period: 60190, radius: 24622, gravity: 1.14, moons: '16',
    temp: '~−200 °C', day: '16 h 6 min',
    blurb: 'The windiest world known, with supersonic gusts above 2,000 km/h. It was the first planet found by mathematical prediction rather than observation.',
    image: 'PIA01492', credit: 'NASA/JPL',
    look: { type: 'ice', a: '#1f3fa8', b: '#5b8ef0' },
  },
  {
    id: 'pluto', name: 'Pluto', kind: 'Dwarf planet',
    au: 39.48, period: 90560, radius: 1188, gravity: 0.063, moons: '5',
    temp: '~−230 °C', day: '6.4 Earth days',
    blurb: 'A dwarf planet in the Kuiper Belt with a heart-shaped glacier of nitrogen ice, mountains of water ice and a thin, hazy blue atmosphere.',
    image: 'PIA19952', credit: 'NASA/JHUAPL/SwRI',
    look: { type: 'rocky', a: '#8b6a52', b: '#e8d2b5' },
  },
]

// Extra worlds for the weight calculator only
export const extraGravity = [{ id: 'moon', name: 'Moon', gravity: 0.165 }]

// Light travel times from the Sun (seconds) used by the light-speed journey
export const lightStops = [
  { name: 'Mercury', seconds: 193 },
  { name: 'Venus', seconds: 361 },
  { name: 'Earth', seconds: 499 },
  { name: 'Mars', seconds: 760 },
  { name: 'Jupiter', seconds: 2595 },
  { name: 'Saturn', seconds: 4759 },
  { name: 'Uranus', seconds: 9575 },
  { name: 'Neptune', seconds: 15000 },
  { name: 'Pluto', seconds: 19700 },
]

// The cosmic scale ladder — each step roughly an order of magnitude (or several) larger
export const scaleSteps = [
  { name: 'Earth', tick: 'Earth', size: '12,742 km across', image: 'as17-148-22727', credit: 'NASA', note: 'Our home world. Light crosses it in 0.04 seconds.' },
  { name: 'Earth & Moon', tick: 'Moon', size: '384,400 km apart', image: 'as08-14-2383', credit: 'NASA (Apollo 8)', note: 'About 30 Earths fit in the gap between our planet and the Moon.' },
  { name: 'The Sun', tick: 'Sun', size: '1.39 million km across', image: 'PIA26681', credit: 'NASA/GSFC/SDO', note: 'Roughly 1.3 million Earths would fit inside it.' },
  { name: 'Jupiter’s orbit', tick: 'Jupiter', size: '~1.6 billion km across', image: 'PIA22946', credit: 'NASA/JPL-Caltech/SwRI/MSSS', note: 'Sunlight takes 43 minutes to reach Jupiter.' },
  { name: 'The Solar System', tick: 'Solar System', size: '~2 light-years to the Oort Cloud', image: 'PIA06193', credit: 'NASA/JPL/SSI', note: 'The Sun’s gravity still dominates out to the distant Oort Cloud of icy bodies.' },
  { name: 'Stellar nursery', tick: 'Nebula', size: '~4–5 light-years tall', image: 'GSFC_20171208_Archive_e000842', credit: 'NASA, ESA, Hubble Heritage Team', note: 'The Pillars of Creation: columns of gas and dust where new stars are forming.' },
  { name: 'Milky Way core', tick: 'Milky Way', size: '~100,000 light-years (galaxy)', image: 'PIA12348', credit: 'NASA/JPL-Caltech/ESA/CXC/STScI', note: 'A supermassive black hole of ~4 million Suns sits at the centre of our galaxy.' },
  { name: 'Andromeda', tick: 'Andromeda', size: '2.5 million light-years away', image: 'PIA04921', credit: 'NASA/JPL/Caltech', note: 'Our nearest large neighbour, on course to merge with the Milky Way in ~4–5 billion years.' },
  { name: 'Deep field', tick: 'Deep field', size: '~93 billion light-years (observable universe)', image: 'GSFC_20171208_Archive_e001061', credit: 'NASA, ESA', note: 'Almost every speck here is a galaxy, some seen as they were over 13 billion years ago.' },
]

export const timeline = [
  { when: '13.8 billion years ago', title: 'The Big Bang', text: 'Space, time and energy expand from an extremely hot, dense state. Within a fraction of a second, inflation stretches the universe enormously.' },
  { when: '~380,000 years', title: 'First light', text: 'The universe cools enough for atoms to form and light to travel freely. That light is still around us as the cosmic microwave background.' },
  { when: '~100–200 million years', title: 'The first stars', text: 'Gravity pulls hydrogen into the first stars, which forge heavier elements and end the cosmic “dark ages”.' },
  { when: '~1 billion years', title: 'Galaxies assemble', text: 'Small galaxies merge into larger ones. The early Milky Way begins to take shape.' },
  { when: '4.6 billion years ago', title: 'The Sun is born', text: 'A cloud of gas and dust collapses. The Sun ignites and the leftover disc forms the planets.' },
  { when: '~3.8 billion years ago', title: 'Life on Earth', text: 'Simple single-celled life appears in Earth’s oceans, possibly even earlier.' },
  { when: '1969', title: 'Footprints on the Moon', text: 'Apollo 11 lands the first humans on another world.' },
  { when: '2021 →', title: 'Webb opens its eyes', text: 'The James Webb Space Telescope begins looking back to the first galaxies in infrared light.' },
]

export const featured = [
  { id: 'carina_nebula', title: 'Cosmic Cliffs, Carina Nebula', credit: 'NASA, ESA, CSA, STScI' },
  { id: 'GSFC_20171208_Archive_e000842', title: 'Pillars of Creation (near-infrared)', credit: 'NASA, ESA, Hubble Heritage Team' },
  { id: 'PIA03606', title: 'Crab Nebula', credit: 'NASA/ESA/JPL/Arizona State Univ.' },
  { id: 'PIA04921', title: 'Andromeda Galaxy (ultraviolet)', credit: 'NASA/JPL/Caltech' },
  { id: 'PIA12348', title: 'Milky Way centre — Great Observatories', credit: 'NASA/JPL-Caltech/ESA/CXC/STScI' },
  { id: 'as08-14-2383', title: 'Earthrise from Apollo 8', credit: 'NASA' },
]
