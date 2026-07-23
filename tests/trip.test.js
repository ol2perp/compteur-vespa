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

  it('seeds session state (distance/moving/stopped) from init', () => {
    const t = createTrip({ totalKm: 10, dailyKm: 5, sessionDistanceKm: 3, movingSec: 120, stoppedSec: 30 })
    const s = t.snapshot()
    expect(s.sessionDistanceKm).toBe(3)
    expect(s.movingSec).toBe(120)
    expect(s.stoppedSec).toBe(30)
    expect(s.elapsedSec).toBe(150)
    // avg = 3 km / (150s/3600) = 72 km/h
    expect(s.avgSpeedKmh).toBeCloseTo(72, 1)
  })

  it('resetSession zeros session state but keeps total/daily km', () => {
    const t = createTrip({ totalKm: 100, dailyKm: 42, sessionDistanceKm: 8, movingSec: 300, stoppedSec: 60 })
    t.resetSession()
    const s = t.snapshot()
    expect(s.sessionDistanceKm).toBe(0)
    expect(s.movingSec).toBe(0)
    expect(s.stoppedSec).toBe(0)
    expect(s.elapsedSec).toBe(0)
    expect(s.avgSpeedKmh).toBe(0)
    expect(s.totalKm).toBe(100)
    expect(s.dailyKm).toBe(42)
  })
})
