const MAX_KMH = 120

export function createGauge(svg) {
  const path = svg.querySelector('#Jauge')
  if (!path) throw new Error('#Jauge path not found in SVG')
  const len = path.getTotalLength()
  path.style.strokeDasharray = String(len)
  path.style.strokeDashoffset = String(len) // start empty
  path.style.transition = 'stroke-dashoffset 0.2s linear'

  return {
    setSpeed(kmh) {
      const frac = Math.max(0, Math.min(1, kmh / MAX_KMH))
      path.style.strokeDashoffset = String(len * (1 - frac))
    },
  }
}
