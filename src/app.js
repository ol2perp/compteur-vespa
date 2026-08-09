import { createStore } from './store.js'
import { startGeo } from './geo.js'
import { createTrip } from './trip.js'
import { createFuel } from './fuel.js'
import { createGauge } from './gauge.js'
import { createDials } from './dials.js'
import { createControls } from './controls.js'
import { parseSettingsNumber } from './settings.js'
import { initOrientationLock } from './orientation.js'

const store = createStore()
const saved = store.load()
const trip = createTrip({
  totalKm: saved.totalKm,
  dailyKm: saved.dailyKm,
  sessionDistanceKm: saved.sessionDistanceKm,
  movingSec: saved.movingSec,
  stoppedSec: saved.stoppedSec,
})
const fuel = createFuel(saved)

let lastSpeed = 0
let lastT = null
let accentColor = saved.accentColor ?? '#2e97b7'

async function loadSvg() {
  const res = await fetch('./compteur.svg')
  const stage = document.getElementById('stage')
  stage.innerHTML = await res.text()
  const svg = stage.querySelector('svg')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' })
  return { stage, svg }
}

function persist() {
  const t = trip.snapshot()
  const f = fuel.snapshot()
  store.save({ ...f, totalKm: t.totalKm, dailyKm: t.dailyKm,
    sessionDistanceKm: t.sessionDistanceKm, movingSec: t.movingSec, stoppedSec: t.stoppedSec,
    accentColor })
}

loadSvg().then(({ stage, svg }) => {
  initOrientationLock(stage)
  const gauge = createGauge(svg)
  const dials = createDials(stage, svg)
  dials.setAccentColor(accentColor)

  dials.onResetDaily(() => { trip.resetDaily(); trip.resetSession(); persist(); render() })
  dials.onReserveTap(() => { fuel.reserve(trip.snapshot().totalKm); persist(); render() })
  dials.onPassengerTap(() => { fuel.setPassenger(!fuel.snapshot().passenger); persist(); render() })

  createControls(stage, {
    getState: () => ({ ...fuel.snapshot(), totalKm: trip.snapshot().totalKm, accentColor }),
    onPlein: () => { fuel.plein(trip.snapshot().totalKm); persist(); render() },
    onAnnulReserve: () => { fuel.cancelReserve(); persist(); render() },
    onPassenger: (on) => { fuel.setPassenger(on); persist(); render() },
    onNewTrip: () => { trip.resetSession(); persist(); render() },
    onColorPreview: (hex) => dials.setAccentColor(hex), // live drag preview, not persisted
    onColorCommit: (hex) => { accentColor = hex; dials.setAccentColor(hex); persist() },
    onSetTotalKm: (raw) => {
      const v = parseSettingsNumber(raw, { min: 0 })
      if (v == null) return
      const f = fuel.snapshot()
      const t = trip.snapshot()
      store.save({ ...f, totalKm: v, dailyKm: t.dailyKm,
        sessionDistanceKm: t.sessionDistanceKm, movingSec: t.movingSec, stoppedSec: t.stoppedSec,
        accentColor })
      location.reload()
    },
    onSetCalib: (raw) => {
      const v = parseSettingsNumber(raw, { min: 0.1 })
      if (v == null) return
      const f = fuel.snapshot()
      const t = trip.snapshot()
      store.save({ ...f, calibratedLPer100: v, totalKm: t.totalKm, dailyKm: t.dailyKm,
        sessionDistanceKm: t.sessionDistanceKm, movingSec: t.movingSec, stoppedSec: t.stoppedSec,
        accentColor })
      location.reload()
    },
  })

  function render() {
    const t = trip.snapshot()
    const speed = lastSpeed
    gauge.setSpeed(speed)
    dials.render({
      speedKmh: speed,
      avgSpeedKmh: t.avgSpeedKmh,
      kmToEmpty: fuel.kmToEmpty(),
      reserve: fuel.isReserve(),
      instantLPer100: fuel.instant(speed, 0),
      elapsedSec: t.elapsedSec,
      totalKm: t.totalKm,
      dailyKm: t.dailyKm,
      passenger: fuel.snapshot().passenger,
    })
  }

  startGeo((u) => {
    const now = performance.now()
    const dtSec = lastT == null ? 0 : (now - lastT) / 1000
    lastT = now
    const accelKmhs = dtSec > 0 ? (u.speedKmh - lastSpeed) / dtSec : 0
    lastSpeed = u.speedKmh

    trip.update({ deltaKm: u.deltaKm, moving: u.moving, dtSec })
    if (u.moving) fuel.consume(u.deltaKm, fuel.instant(u.speedKmh, accelKmhs))
    else fuel.consumeIdle(dtSec)
    render()
    persist()
  })

  render()
  setInterval(render, 1000) // keep the wall clock + elapsed display live even between GPS fixes
  requestWakeLock()
})

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return
  let lock = null
  const acquire = async () => {
    try { lock = await navigator.wakeLock.request('screen') }
    catch { /* unavailable or document hidden — will retry on next visibility */ }
  }
  await acquire()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') acquire()
  })
}
