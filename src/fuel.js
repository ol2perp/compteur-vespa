export const TANK_L = 7.7
export const RESERVE_L = 1.4
export const USABLE_L = TANK_L - RESERVE_L // 6.3
export const MIN_CYCLE_KM = 30
export const VALID_LP100 = Object.freeze([3, 12])

// U-shaped efficiency curve; 1.0 in the 60-80 km/h optimal band.
export function speedFactor(kmh) {
  if (kmh < 20) return 1.30
  if (kmh < 40) return 1.15
  if (kmh < 60) return 1.05
  if (kmh <= 80) return 1.00
  if (kmh <= 95) return 1.10
  return 1.25
}

export function accelFactor(accelKmhs = 0) {
  const a = Math.max(0, Math.min(10, accelKmhs))
  return 1 + a * 0.05 // up to +50% under hard acceleration
}

export function instantLPer100({ base, speedKmh, accelKmhs = 0, passenger = false, passengerSurchargePct = 10 }) {
  let v = base * speedFactor(speedKmh) * accelFactor(accelKmhs)
  if (passenger) v *= 1 + passengerSurchargePct / 100
  return v
}

export function createFuel(init = {}) {
  let tankLevel = init.tankLevel ?? TANK_L
  let calibratedLPer100 = init.calibratedLPer100 ?? 6.0
  let passengerSurchargePct = init.passengerSurchargePct ?? 10
  let passenger = init.passenger ?? false
  let lastPleinTotalKm = init.lastPleinTotalKm ?? null
  const cycles = init.cycles ? [...init.cycles] : []

  function recalibrate() {
    if (cycles.length === 0) return
    // Distance-weighted: a long, high-confidence cycle should outweigh a short, noisy one.
    const totalDist = cycles.reduce((a, c) => a + c.distanceKm, 0)
    if (totalDist <= 0) return
    calibratedLPer100 = cycles.reduce((a, c) => a + c.lPer100 * c.distanceKm, 0) / totalDist
  }

  return {
    consume(deltaKm, lPer100) {
      tankLevel = Math.max(0, tankLevel - (lPer100 / 100) * deltaKm)
    },
    consumeIdle(dtSec, idleLPerH = 0.5) {
      tankLevel = Math.max(0, tankLevel - (idleLPerH / 3600) * dtSec)
    },
    plein(totalKm) {
      tankLevel = TANK_L
      lastPleinTotalKm = totalKm
    },
    reserve(totalKm) {
      let accepted = false
      let lPer100
      if (lastPleinTotalKm != null) {
        const distanceKm = totalKm - lastPleinTotalKm
        lPer100 = distanceKm > 0 ? (USABLE_L / distanceKm) * 100 : Infinity
        if (distanceKm >= MIN_CYCLE_KM && lPer100 >= VALID_LP100[0] && lPer100 <= VALID_LP100[1]) {
          cycles.push({ distanceKm, lPer100 })
          recalibrate()
          accepted = true
        }
      }
      tankLevel = RESERVE_L // resync estimate to reality
      lastPleinTotalKm = null
      return accepted ? { accepted, lPer100 } : { accepted }
    },
    setPassenger(on) { passenger = !!on },
    isReserve() { return tankLevel <= RESERVE_L },
    kmToEmpty() { return calibratedLPer100 > 0 ? (tankLevel / calibratedLPer100) * 100 : 0 },
    instant(speedKmh, accelKmhs) {
      return instantLPer100({ base: calibratedLPer100, speedKmh, accelKmhs, passenger, passengerSurchargePct })
    },
    snapshot() {
      return { tankLevel, calibratedLPer100, passengerSurchargePct, passenger, lastPleinTotalKm, cycles: [...cycles] }
    },
  }
}
