import { describe, it, expect } from 'vitest'
import { DEFAULTS, createStore } from '../src/store.js'

function fakeStorage() {
  const m = new Map()
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }
}

describe('store', () => {
  it('returns defaults when storage is empty', () => {
    const store = createStore(fakeStorage())
    expect(store.load()).toEqual(DEFAULTS)
  })

  it('round-trips saved state merged over defaults', () => {
    const s = fakeStorage()
    const store = createStore(s)
    store.save({ ...DEFAULTS, totalKm: 500, tankLevel: 4.2 })
    const loaded = store.load()
    expect(loaded.totalKm).toBe(500)
    expect(loaded.tankLevel).toBe(4.2)
    expect(loaded.calibratedLPer100).toBe(DEFAULTS.calibratedLPer100)
  })

  it('ignores corrupt JSON and falls back to defaults', () => {
    const s = fakeStorage()
    s.setItem('compteur-vespa-v1', '{not json')
    expect(createStore(s).load()).toEqual(DEFAULTS)
  })

  it('drops state from an unknown schema version', () => {
    const s = fakeStorage()
    s.setItem('compteur-vespa-v1', JSON.stringify({ version: 999, totalKm: 1 }))
    expect(createStore(s).load()).toEqual(DEFAULTS)
  })
})
