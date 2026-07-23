// Renders a ⚙ button + panel. Calls back into app on actions.
export function createControls(stage, handlers) {
  const gear = document.createElement('button')
  gear.textContent = '⚙'
  Object.assign(gear.style, {
    position: 'absolute', right: '2%', top: '4%', fontSize: '5cqw',
    background: 'none', border: 'none', color: '#eee', cursor: 'pointer', zIndex: 10,
  })
  stage.appendChild(gear)

  const panel = document.createElement('div')
  Object.assign(panel.style, {
    position: 'absolute', inset: '0', display: 'none', zIndex: 20,
    background: 'rgba(20,30,36,.92)', color: '#fff', padding: '4vh 4vw',
    flexDirection: 'column', gap: '2vh', font: '2.6vh system-ui, sans-serif',
  })
  panel.innerHTML = `
    <h2 style="margin:0">Réglages</h2>
    <button data-act="plein" style="padding:1.5vh">⛽ Plein (réservoir plein)</button>
    <button data-act="reserve" style="padding:1.5vh">⚠ Passage en réserve</button>
    <button data-act="newtrip" style="padding:1.5vh">🔄 Nouveau trajet (reset chrono)</button>
    <label style="display:flex;gap:1vw;align-items:center">
      <input type="checkbox" data-act="passenger" /> Passager (2 personnes)
    </label>
    <label>Km total <input type="number" data-act="totalKm" style="width:8em" /></label>
    <label>Conso calibrée (L/100) <input type="number" step="0.1" data-act="calib" style="width:6em" /></label>
    <button data-act="close" style="padding:1.5vh;margin-top:auto">Fermer</button>
  `
  stage.appendChild(panel)

  const q = (a) => panel.querySelector(`[data-act="${a}"]`)
  gear.addEventListener('click', () => {
    q('passenger').checked = handlers.getState().passenger
    q('totalKm').value = Math.floor(handlers.getState().totalKm)
    q('calib').value = handlers.getState().calibratedLPer100.toFixed(1)
    panel.style.display = 'flex'
  })
  q('close').addEventListener('click', () => (panel.style.display = 'none'))
  q('plein').addEventListener('click', () => handlers.onPlein())
  q('reserve').addEventListener('click', () => handlers.onReserve())
  q('newtrip').addEventListener('click', () => handlers.onNewTrip())
  q('passenger').addEventListener('change', (e) => handlers.onPassenger(e.target.checked))
  q('totalKm').addEventListener('change', (e) => handlers.onSetTotalKm(e.target.value))
  q('calib').addEventListener('change', (e) => handlers.onSetCalib(e.target.value))
}
