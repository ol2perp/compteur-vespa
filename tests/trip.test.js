import { describe, it, expect } from 'vitest'
import { createTrip } from '../src/trip.js'

describe('trip', () => {
  it('accumulates total and daily km', () => {
    const t = createTrip({ totalKm: 388, dailyKm: 0 })
    t.update({ deltaKm: 2, moving: true, dtSec: 60 })
    t.update({ deltaKm: 3, moving: true, dtSec: 60 })
    const s = t.snapshot()
    expect(s.totalKm).toBe(393)
    expect(s.dailyKm).toBe(5)
    expect(s.sessionDistanceKm).toBe(5)
  })

  it('splits moving vs stopped time', () => {
    const t = createTrip()
    t.update({ deltaKm: 1, moving: true, dtSec: 120 })
    t.update({ deltaKm: 0, moving: false, dtSec: 30 })
    const s = t.snapshot()
    expect(s.movingSec).toBe(120)
    expect(s.stoppedSec).toBe(30)
    expect(s.elapsedSec).toBe(150)
  })

  it('computes global average speed (distance / total elapsed, stops included)', () => {
    const t = createTrip()
    t.update({ deltaKm: 10, moving: true, dtSec: 600 }) // 10 km in 10 min moving
    t.update({ deltaKm: 0, moving: false, dtSec: 600 }) // 10 min stopped
    // 10 km over 20 min total = 30 km/h
    expect(t.avgSpeedKmh()).toBeCloseTo(30, 1)
  })

  it('resets daily km without touching total', () => {
    const t = createTrip({ totalKm: 100, dailyKm: 42 })
    t.resetDaily()
    const s = t.snapshot()
    expect(s.dailyKm).toBe(0)
    expect(s.totalKm).toBe(100)
  })
})
