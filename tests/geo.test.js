import { describe, it, expect } from 'vitest'
import { haversineMeters, processFix, ema } from '../src/geo.js'

const P = (lat, lon, extra = {}) => ({ lat, lon, speed: null, accuracy: 5, t: 0, ...extra })

describe('haversineMeters', () => {
  it('is ~111.2 m for 0.001° of latitude', () => {
    const d = haversineMeters({ lat: 0, lon: 0 }, { lat: 0.001, lon: 0 })
    expect(d).toBeGreaterThan(110)
    expect(d).toBeLessThan(112)
  })
})

describe('processFix', () => {
  it('rejects fixes with poor accuracy', () => {
    const r = processFix(null, P(0, 0, { accuracy: 50 }))
    expect(r.rejected).toBe(true)
    expect(r.deltaKm).toBe(0)
  })

  it('uses coords.speed when present (m/s -> km/h)', () => {
    const prev = P(0, 0, { t: 0 })
    const r = processFix(prev, P(0.0001, 0, { speed: 10, t: 1000 })) // 10 m/s
    expect(r.speedKmh).toBeCloseTo(36, 0)
    expect(r.moving).toBe(true)
  })

  it('derives speed from distance/time when coords.speed is null', () => {
    const prev = P(0, 0, { t: 0 })
    // ~111.2 m in 10 s -> ~40 km/h
    const r = processFix(prev, P(0.001, 0, { speed: null, t: 10000 }))
    expect(r.speedKmh).toBeGreaterThan(38)
    expect(r.speedKmh).toBeLessThan(42)
    expect(r.deltaKm).toBeGreaterThan(0.11)
  })

  it('treats sub-threshold speed as stopped (no distance)', () => {
    const prev = P(0, 0, { t: 0 })
    // ~1.1 m in 10 s -> ~0.4 km/h
    const r = processFix(prev, P(0.00001, 0, { speed: null, t: 10000 }))
    expect(r.moving).toBe(false)
    expect(r.deltaKm).toBe(0)
  })

  it('rejects impossible jumps (>130 km/h implied)', () => {
    const prev = P(0, 0, { t: 0 })
    // ~1113 m in 10 s -> ~400 km/h
    const r = processFix(prev, P(0.01, 0, { speed: null, t: 10000 }))
    expect(r.rejected).toBe(true)
    expect(r.deltaKm).toBe(0)
  })
})

describe('ema', () => {
  it('returns the first value unchanged when prev is null', () => {
    expect(ema(null, 20, 0.4)).toBe(20)
  })
  it('smooths toward the new value', () => {
    expect(ema(10, 20, 0.5)).toBe(15)
  })
})
