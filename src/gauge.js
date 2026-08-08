const MAX_KMH = 120

export function createGauge(svg) {
  const path = svg.querySelector('#Jauge')
  if (!path) throw new Error('#Jauge path not found in SVG')
  const len = path.getTotalLength()
  path.style.strokeDasharray = String(len)
  path.style.strokeDashoffset = String(len) // start empty
  path.style.transition = 'stroke-dashoffset 0.2s linear'

  // The source SVG's round linecap over-reads: at the moving tip it bulges
  // stroke-width/2 past the true speed value, making the gauge look faster
  // than it is. Flatten the tip so its edge lines up exactly with the
  // value, and restore a round look only at the fixed 0 km/h start (which
  // never moves) via a static circle — same visual finish, accurate tip.
  path.style.strokeLinecap = 'butt'
  const start = path.getPointAtLength(0)
  const strokeWidth = parseFloat(getComputedStyle(path).strokeWidth)
  const startCap = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  startCap.setAttribute('cx', String(start.x))
  startCap.setAttribute('cy', String(start.y))
  startCap.setAttribute('r', String(strokeWidth / 2))
  startCap.style.fill = getComputedStyle(path).stroke
  path.after(startCap)

  return {
    setSpeed(kmh) {
      const frac = Math.max(0, Math.min(1, kmh / MAX_KMH))
      path.style.strokeDashoffset = String(len * (1 - frac))
    },
  }
}
