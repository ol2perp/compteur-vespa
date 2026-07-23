// src/app.js
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
  console.log('SVG loaded, viewBox =', svg.getAttribute('viewBox'))
})
