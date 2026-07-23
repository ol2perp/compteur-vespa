// src/app.js
import { createGauge } from './gauge.js'
import { createDials } from './dials.js'

async function loadSvg() {
  const res = await fetch('./compteur.svg')
  const text = await res.text()
  const stage = document.getElementById('stage')
  stage.innerHTML = text
  const svg = stage.querySelector('svg')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.style.position = 'absolute'
  svg.style.inset = '0'
  svg.style.width = '100%'
  svg.style.height = '100%'
  return svg
}

loadSvg().then((svg) => {
  const stage = document.getElementById('stage')
  const gauge = createGauge(svg)
  const dials = createDials(stage)
  dials.render({
    avgSpeedKmh: 65, kmToEmpty: 50, reserve: false, instantLPer100: 6,
    elapsedSec: 32 * 60, totalKm: 3826, dailyKm: 353,
  })
  gauge.setSpeed(65)
})
