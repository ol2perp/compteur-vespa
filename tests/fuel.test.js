import { describe, it, expect } from 'vitest'
import {
  TANK_L, RESERVE_L, MIN_CYCLE_KM,
  speedFactor, instantLPer100, createFuel,
} from '../src/fuel.js'

describe('consumption factors', () => {
  it('speedFactor is lowest in the 60-80 optimal band', () => {
    expect(speedFactor(70)).toBeLessThan(speedFactor(10))
    expect(speedFactor(70)).toBeLessThan(speedFactor(110))
    expect(speedFactor(70)).toBeCloseTo(1, 5)
  })

  it('instantLPer100 applies the passenger surcharge', () => {
    const solo = instantLPer100({ base: 6, speedKmh: 70, accelKmhs: 0, passenger: false, passengerSurchargePct: 10 })
    const duo = instantLPer100({ base: 6, speedKmh: 70, accelKmhs: 0, passenger: true, passengerSurchargePct: 10 })
    expect(duo).toBeCloseTo(solo * 1.1, 5)
  })

  it('instantLPer100 increases with hard acceleration', () => {
    const cruise = instantLPer100({ base: 6, speedKmh: 70, accelKmhs: 0 })
    const accel = instantLPer100({ base: 6, speedKmh: 70, accelKmhs: 8 })
    expect(accel).toBeGreaterThan(cruise)
  })
})

describe('tank + km to empty', () => {
  it('consume() lowers the tank by lPer100/100 * km', () => {
    const f = createFuel({ tankLevel: 7.7 })
    f.consume(50, 6) // 6 L/100 over 50 km -> 3 L
    expect(f.snapshot().tankLevel).toBeCloseTo(4.7, 5)
  })

  it('tank never goes below zero', () => {
    const f = createFuel({ tankLevel: 0.1 })
    f.consume(100, 6)
    expect(f.snapshot().tankLevel).toBe(0)
  })

  it('kmToEmpty uses calibrated consumption', () => {
    const f = createFuel({ tankLevel: 6, calibratedLPer100: 6 })
    expect(f.kmToEmpty()).toBeCloseTo(100, 5)
  })

  it('isReserve is true at or below the reserve threshold', () => {
    expect(createFuel({ tankLevel: 1.4 }).isReserve()).toBe(true)
    expect(createFuel({ tankLevel: 1.5 }).isReserve()).toBe(false)
  })
})

describe('calibration (plein -> reserve)', () => {
  it('plein refills to full and records the odometer', () => {
    const f = createFuel({ tankLevel: 2 })
    f.plein(1000)
    const s = f.snapshot()
    expect(s.tankLevel).toBe(TANK_L)
    expect(s.lastPleinTotalKm).toBe(1000)
  })

  it('reserve learns real L/100 over the cycle and resyncs the tank', () => {
    const f = createFuel({ calibratedLPer100: 6 })
    f.plein(1000)
    const r = f.reserve(1180) // 180 km on 6.3 L usable -> 3.5 L/100
    expect(r.accepted).toBe(true)
    expect(r.lPer100).toBeCloseTo(3.5, 2)
    const s = f.snapshot()
    expect(s.calibratedLPer100).toBeCloseTo(3.5, 2)
    expect(s.tankLevel).toBe(RESERVE_L) // resynced
  })

  it('reserve resyncs even if plein was never tapped', () => {
    const f = createFuel({ tankLevel: 5, lastPleinTotalKm: null })
    const r = f.reserve(500)
    expect(r.accepted).toBe(false)
    expect(f.snapshot().tankLevel).toBe(RESERVE_L)
  })

  it('rejects an aberrant short cycle', () => {
    const f = createFuel({ calibratedLPer100: 6 })
    f.plein(1000)
    const r = f.reserve(1000 + MIN_CYCLE_KM - 1)
    expect(r.accepted).toBe(false)
    expect(f.snapshot().calibratedLPer100).toBe(6) // unchanged
  })
})
