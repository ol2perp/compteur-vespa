export const SCHEMA_VERSION = 1
const KEY = 'compteur-vespa-v1'

export const DEFAULTS = Object.freeze({
  version: SCHEMA_VERSION,
  totalKm: 388,
  dailyKm: 0,
  tankLevel: 7.7,
  calibratedLPer100: 6.0,
  passengerSurchargePct: 10,
  passenger: false,
  lastPleinTotalKm: null,
  cycles: [], // { distanceKm, lPer100 }
})

export function createStore(storage = globalThis.localStorage) {
  return {
    load() {
      try {
        const raw = storage.getItem(KEY)
        if (!raw) return { ...DEFAULTS }
        const parsed = JSON.parse(raw)
        if (parsed.version !== SCHEMA_VERSION) return { ...DEFAULTS }
        return { ...DEFAULTS, ...parsed }
      } catch {
        return { ...DEFAULTS }
      }
    },
    save(state) {
      const toSave = { ...state, version: SCHEMA_VERSION }
      storage.setItem(KEY, JSON.stringify(toSave))
    },
  }
}
