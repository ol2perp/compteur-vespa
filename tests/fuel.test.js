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

  it('weights calibration by cycle distance (long cycles dominate)', () => {
    const f = createFuel({ calibratedLPer100: 6 })
    f.plein(0); f.reserve(180) // 180 km -> 3.5 L/100
    f.plein(0); f.reserve(63)  // 63 km  -> 10 L/100
    // distance-weighted = (3.5*180 + 10*63)/(180+63) = 1260/243 ≈ 5.185
    expect(f.snapshot().calibratedLPer100).toBeCloseTo(5.185, 2)
  })
})

describe('cancelReserve (undo an accidental tap)', () => {
  it('restores tank, calibration and lastPleinTotalKm from before the reserve() call', () => {
    const f = createFuel({ tankLevel: 5, calibratedLPer100: 6 })
    f.plein(1000)
    f.reserve(1180) // accepted cycle, recalibrates to 3.5
    expect(f.cancelReserve()).toBe(true)
    const s = f.snapshot()
    expect(s.tankLevel).toBe(TANK_L) // back to what plein() had set
    expect(s.calibratedLPer100).toBe(6)
    expect(s.lastPleinTotalKm).toBe(1000)
  })

  it('does not leave a stray cycle behind after cancelling an accepted reserve', () => {
    const f = createFuel({ calibratedLPer100: 6 })
    f.plein(1000)
    f.reserve(1180)
    f.cancelReserve()
    f.plein(1180)
    const r = f.reserve(1180 + 180) // fresh 180 km cycle, same L/100 as before
    expect(r.accepted).toBe(true)
    // if the cancelled cycle had stuck around, this would double-weight and skew the average
    expect(f.snapshot().calibratedLPer100).toBeCloseTo(3.5, 2)
  })

  it('returns false and is a no-op when there is nothing to cancel', () => {
    const f = createFuel({ tankLevel: 5 })
    expect(f.cancelReserve()).toBe(false)
    expect(f.snapshot().tankLevel).toBe(5)
  })

  it('a subsequent plein() clears the undo snapshot', () => {
    const f = createFuel({ calibratedLPer100: 6 })
    f.plein(1000)
    f.reserve(1180)
    f.plein(1180) // confirms the reserve was real; nothing left to undo
    expect(f.cancelReserve()).toBe(false)
  })
})
