export function createTrip(init = {}) {
  let totalKm = init.totalKm ?? 0
  let dailyKm = init.dailyKm ?? 0
  let sessionDistanceKm = init.sessionDistanceKm ?? 0
  let movingSec = init.movingSec ?? 0
  let stoppedSec = init.stoppedSec ?? 0

  return {
    update({ deltaKm = 0, moving = false, dtSec = 0 }) {
      totalKm += deltaKm
      dailyKm += deltaKm
      sessionDistanceKm += deltaKm
      if (moving) movingSec += dtSec
      else stoppedSec += dtSec
    },
    avgSpeedKmh() {
      const elapsedSec = movingSec + stoppedSec
      return elapsedSec > 0 ? sessionDistanceKm / (elapsedSec / 3600) : 0
    },
    resetDaily() {
      dailyKm = 0
    },
    resetSession() {
      sessionDistanceKm = 0
      movingSec = 0
      stoppedSec = 0
    },
    snapshot() {
      return {
        totalKm,
        dailyKm,
        sessionDistanceKm,
        movingSec,
        stoppedSec,
        elapsedSec: movingSec + stoppedSec,
        avgSpeedKmh: this.avgSpeedKmh(),
      }
    },
  }
}
