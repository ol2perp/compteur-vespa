const POS = {
  conso:  { x: 29.9, y: 60.3 },
  heures: { x: 42.4, y: 68.6 },
  meteo:  { x: 55.7, y: 68.6 },
  km:     { x: 68.4, y: 60.2 },
}

function makeDial(stage, key) {
  const el = document.createElement('div')
  el.className = `dial dial-${key}`
  Object.assign(el.style, {
    position: 'absolute',
    left: POS[key].x + '%',
    top: POS[key].y + '%',
    transform: 'translate(-50%, -50%)',
    width: '11.8%',
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    lineHeight: '1.1',
    color: '#111',
    pointerEvents: 'none',
  })
  stage.appendChild(el)
  return el
}

export function createDials(stage) {
  const els = {
    conso: makeDial(stage, 'conso'),
    heures: makeDial(stage, 'heures'),
    meteo: makeDial(stage, 'meteo'),
    km: makeDial(stage, 'km'),
  }

  // Meteo reserved for V2
  els.meteo.innerHTML =
    `<div style="opacity:.5;font-size:3cqw">☁</div><div style="opacity:.6;font-size:1.9cqw">Météo · V2</div>`

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
  const band = (t) => `<div style="background:#3a5f6a;color:#fff;border-radius:5px;padding:0 6px;margin:2px 0;font-size:2.2cqw;font-weight:800">${t}</div>`
  const big = (t) => `<div style="font-size:3.6cqw;font-weight:800">${t}</div>`
  const unit = (t) => `<span style="font-size:1.7cqw;font-weight:600">${t}</span>`

  return {
    render(state) {
      const now = new Date()
      // conso: avg speed / km-to-empty + pump / L/100
      els.conso.innerHTML =
        big(`${Math.round(state.avgSpeedKmh)}${unit('km/h')}`) +
        `<div style="background:${state.reserve ? '#b23' : '#3a5f6a'};color:#fff;border-radius:5px;padding:0 6px;margin:2px 0;font-size:2.4cqw;font-weight:800">${Math.round(state.kmToEmpty)}${unit('Km')} ⛽</div>` +
        `<div style="font-size:2.6cqw;font-weight:700">${state.instantLPer100.toFixed(1)}${unit('L/100')}</div>`
      // heures: clock / date / elapsed
      els.heures.innerHTML = big(fmtClock(now)) + band(fmtDate(now)) + big(fmtHM(state.elapsedSec))
      // km: daily / reset / total
      const total = String(Math.floor(state.totalKm)).padStart(6, '0')
      els.km.innerHTML =
        big(String(Math.floor(state.dailyKm)).padStart(4, '0')) +
        band('reset') +
        big(`${total.slice(0, 5)}<span style="color:#e33">${total.slice(5)}</span>`)
    },
    onResetDaily(cb) {
      els.km.style.pointerEvents = 'auto'
      els.km.addEventListener('click', cb)
    },
  }
}
