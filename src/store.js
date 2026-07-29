export const SCHEMA_VERSION = 1
const KEY = 'compteur-vespa-v1'

export const DEFAULTS = Object.freeze({
  version: SCHEMA_VERSION,
  totalKm: 538,
  dailyKm: 0,
  tankLevel: 7.7,
  calibratedLPer100: 5.1,
  passengerSurchargePct: 10,
  passenger: false,
  lastPleinTotalKm: null,
  cycles: [], // { distanceKm, lPer100 }
  sessionDistanceKm: 0,
  movingSec: 0,
  stoppedSec: 0,
})

export function createStore(storage = globalThis.localStorage) {
  return {
    load() {
      try {
        const raw = storage.getItem(KEY)
        if (!raw) return { ...DEFAULTS, cycles: [...DEFAULTS.cycles] }
        const parsed = JSON.parse(raw)
        if (parsed.version !== SCHEMA_VERSION) return { ...DEFAULTS, cycles: [...DEFAULTS.cycles] }
        return { ...DEFAULTS, ...parsed, cycles: parsed.cycles ? parsed.cycles : [...DEFAULTS.cycles] }
      } catch {
        return { ...DEFAULTS, cycles: [...DEFAULTS.cycles] }
      }
    },
    save(state) {
      const toSave = { ...state, version: SCHEMA_VERSION }
      storage.setItem(KEY, JSON.stringify(toSave))
    },
  }
}
