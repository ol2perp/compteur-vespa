// Writes live values directly into the <text>/<tspan> nodes authored in
// V_1-MAIN.svg — font, size, color, position all come from the SVG's own
// CSS/position, so this module only ever touches textContent (plus the one
// reserve-color override on the CONSO dial).

function yOf(text) {
  const m = /translate\(\s*[-\d.]+[\s,]+([-\d.]+)\s*\)/.exec(text.getAttribute('transform') || '')
  return m ? parseFloat(m[1]) : 0
}

// Illustrator appends a digit to a group's id whenever the designer
// duplicates a layer (e.g. "Cadran-HEURES" -> "Cadran-HEURES1"), so match on
// the stable prefix rather than the exact id.
function findGroup(svg, prefix) {
  const g = svg.querySelector(`g[id^="${prefix}"]`)
  if (!g) throw new Error(`dial group not found: ${prefix}`)
  return g
}

// <text> nodes of a dial group, top-to-bottom (ascending y); ties (e.g. an
// odometer's prefix + colored last-digit tspans living in one <text>, or two
// texts sharing a y) keep their original document order via stable sort.
function textsOf(group) {
  return [...group.querySelectorAll('text')].sort((a, b) => yOf(a) - yOf(b))
}

function setOdo(textEl, km, digits) {
  const s = String(Math.max(0, Math.round(km * 10))).padStart(digits, '0')
  const tspans = textEl.querySelectorAll('tspan')
  tspans[0].textContent = s.slice(0, -1)
  tspans[1].textContent = s.slice(-1)
}

const frFixed1 = (n) => n.toFixed(1).replace('.', ',')

function fmtHM(totalSec) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  return `${h}h${String(m).padStart(2, '0')}`
}
function fmtClock(d) {
  return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`
}
function fmtDate(d) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function createDials(stage, svg) {
  const consoGroup = findGroup(svg, 'Cadran_CONSO')
  const heuresGroup = findGroup(svg, 'Cadran-HEURES')
  const vitesseGroup = findGroup(svg, 'Cabdran-Vitesse')
  const kmGroup = findGroup(svg, 'Cadran-KM')
  const nbPersGroup = findGroup(svg, 'Cadrage-NbPersonnes')

  const [speedText, kmToEmptyText, instantText] = textsOf(consoGroup)
  const [clockText, dateText, elapsedText] = textsOf(heuresGroup)
  const [rawSpeedText] = textsOf(vitesseGroup)
  const [dailyText, totalText] = textsOf(kmGroup)
  const [nbPersText] = textsOf(nbPersGroup)
  // setOdo() writes the "hundreds of meters" (tenths-of-km) digit into
  // tspans[1] — the colored last digit — for both odometers.
  const coloredDigits = [dailyText, totalText]
    .map((t) => t.querySelectorAll('tspan')[1])
    .filter(Boolean)
  const colorLayer = svg.querySelector('#Couleur-dynamique')

  // Listen on the group (not the shape) so clicks on the overlapping <text> —
  // painted on top, and a sibling rather than a descendant of the shape —
  // still bubble to the handler; pointer-events:all on the fill:none shape
  // makes the rest of the circle (not covered by text) clickable too.
  const consoShape = consoGroup.querySelector('ellipse, circle')
  if (consoShape) consoShape.style.pointerEvents = 'all'
  const nbPersShape = nbPersGroup.querySelector('ellipse, circle')
  if (nbPersShape) nbPersShape.style.pointerEvents = 'all'
  // The KM dial's "reset" label is now baked into the background (no text
  // node to target), so the tap zone is the shape only — not the group —
  // so tapping the daily/total numbers themselves doesn't also trigger reset.
  const kmShape = kmGroup.querySelector('ellipse, circle')
  if (kmShape) kmShape.style.pointerEvents = 'all'

  return {
    render(state) {
      const now = new Date()
      speedText.textContent = String(Math.round(state.avgSpeedKmh))
      kmToEmptyText.textContent = String(Math.round(state.kmToEmpty))
      kmToEmptyText.style.fill = state.reserve ? '#ff5555' : ''
      instantText.textContent = frFixed1(state.instantLPer100)

      clockText.textContent = fmtClock(now)
      dateText.textContent = fmtDate(now)
      elapsedText.textContent = fmtHM(state.elapsedSec)

      rawSpeedText.textContent = String(Math.round(state.speedKmh ?? 0))

      setOdo(dailyText, state.dailyKm, 4)
      setOdo(totalText, state.totalKm, 6)

      nbPersText.textContent = state.passenger ? '2' : '1'
    },
    onResetDaily(cb) {
      if (kmShape) kmShape.addEventListener('click', cb)
    },
    onReserveTap(cb) {
      consoGroup.addEventListener('click', cb)
    },
    onPassengerTap(cb) {
      nbPersGroup.addEventListener('click', cb)
    },
    setAccentColor(hex) {
      coloredDigits.forEach((t) => (t.style.fill = hex))
      if (colorLayer) colorLayer.style.fill = hex
    },
  }
}
