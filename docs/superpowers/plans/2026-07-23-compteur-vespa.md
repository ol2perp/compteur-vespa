# Compteur Vespa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a landscape PWA that reproduces a vintage Vespa speedometer, showing GPS speed + gauge, daily/total km, trip timer, and a self-calibrating fuel/consumption estimate — all offline, on the phone.

**Architecture:** Vanilla JS + inline SVG (the provided `Compteur-SVG.svg` is the base asset). Pure logic modules (`geo`, `trip`, `fuel`, `store`) are DOM-free and unit-tested with Vitest against simulated GPS traces. Rendering modules (`gauge`, `dials`, `app`) draw HTML overlays on top of the SVG and are verified in the browser. Hosted on GitHub Pages (HTTPS, required for Geolocation + Service Worker).

**Tech Stack:** Vanilla JS (ES modules), Vite (dev server + build), Vitest (tests), SVG, Web APIs (Geolocation, Wake Lock, Service Worker).

---

## File Structure

```
package.json                     # deps + scripts (Vite, Vitest)
vite.config.js                   # base path for GitHub Pages
index.html                       # app shell, inlines the SVG
public/
  compteur.svg                   # production copy of Compteur-SVG.svg
  manifest.webmanifest           # PWA manifest (landscape, fullscreen)
  icons/                         # PWA icons (192, 512)
src/
  store.js                       # localStorage persistence (versioned)
  geo.js                         # GPS processing (pure) + watcher (browser)
  trip.js                        # odometer, timers, average speed (pure)
  fuel.js                        # tank model + self-calibrating consumption (pure)
  gauge.js                       # SVG gauge fill (browser)
  dials.js                       # 4-dial HTML overlays (browser)
  app.js                         # orchestration, state machine, wake lock
  sw.js                          # service worker (offline cache)
tests/
  store.test.js
  geo.test.js
  trip.test.js
  fuel.test.js
```

**Responsibilities:** `store` = persistence only. `geo` = turn raw GPS fixes into clean `{speedKmh, deltaKm, moving}`. `trip` = accumulate distance/time. `fuel` = tank level + consumption + calibration. `gauge`/`dials` = pixels. `app` = wiring. Files that change together (a module + its test) sit together by responsibility.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/app.js`, `.gitignore` (already exists — verify)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "compteur-vespa",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

`base` must match the GitHub Pages repo name (adjust `compteur-vespa` to the real repo).

```js
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/compteur-vespa/' : '/',
  build: { target: 'es2020' },
})
```

- [ ] **Step 3: Create minimal `index.html`**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
  <meta name="theme-color" content="#5a6b78" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <title>Compteur Vespa</title>
  <style>
    html, body { margin: 0; height: 100%; background: #5a6b78; overflow: hidden;
      font-family: system-ui, sans-serif; -webkit-user-select: none; user-select: none; }
    #stage { position: relative; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="stage"></div>
  <script type="module" src="/src/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create placeholder `src/app.js`**

```js
document.getElementById('stage').textContent = 'Compteur Vespa — scaffold OK'
```

- [ ] **Step 5: Install and verify dev server**

Run: `npm install && npm run dev`
Expected: Vite serves at `http://localhost:5173`, page shows "Compteur Vespa — scaffold OK".

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.js index.html src/app.js
git commit -m "chore: project scaffold (Vite + vanilla)"
```

---

## Task 2: `store.js` — persistence (TDD)

**Files:**
- Create: `src/store.js`
- Test: `tests/store.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/store.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- store`
Expected: FAIL ("Cannot find module '../src/store.js'" or export undefined).

- [ ] **Step 3: Write `src/store.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- store`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store.js tests/store.test.js
git commit -m "feat: versioned localStorage persistence"
```

---

## Task 3: `geo.js` — GPS processing (TDD)

**Files:**
- Create: `src/geo.js`
- Test: `tests/geo.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/geo.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- geo`
Expected: FAIL (module/exports missing).

- [ ] **Step 3: Write `src/geo.js`**

```js
const R = 6371000 // earth radius, meters
const DEG = Math.PI / 180

export function haversineMeters(a, b) {
  const dLat = (b.lat - a.lat) * DEG
  const dLon = (b.lon - a.lon) * DEG
  const lat1 = a.lat * DEG
  const lat2 = b.lat * DEG
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function ema(prev, value, alpha = 0.4) {
  return prev == null ? value : prev + alpha * (value - prev)
}

const DEFAULT_OPTS = { maxAccuracyM: 30, stopKmh: 3, maxKmh: 130 }

// prev: last ACCEPTED fix {lat,lon,t} or null. fix: {lat,lon,speed(m/s|null),accuracy,t(ms)}
export function processFix(prev, fix, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts }
  const blank = { speedKmh: 0, deltaKm: 0, moving: false, rejected: true, fix }

  if (fix.accuracy != null && fix.accuracy > o.maxAccuracyM) return blank
  if (!prev) {
    // First accepted fix: no distance yet, trust reported speed if any.
    const speedKmh = fix.speed != null && fix.speed >= 0 ? fix.speed * 3.6 : 0
    return { speedKmh, deltaKm: 0, moving: speedKmh >= o.stopKmh, rejected: false, fix }
  }

  const meters = haversineMeters(prev, fix)
  const dtSec = Math.max(0, (fix.t - prev.t) / 1000)
  const derivedKmh = dtSec > 0 ? (meters / 1000) / (dtSec / 3600) : 0
  const speedKmh = fix.speed != null && fix.speed >= 0 ? fix.speed * 3.6 : derivedKmh

  if (derivedKmh > o.maxKmh) return blank // GPS jump

  const moving = speedKmh >= o.stopKmh
  const deltaKm = moving ? meters / 1000 : 0
  return { speedKmh, deltaKm, moving, rejected: false, fix }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- geo`
Expected: PASS.

- [ ] **Step 5: Add the browser watcher (not unit-tested)**

Append to `src/geo.js`:

```js
// Browser-only: wraps watchPosition, smooths speed, calls onUpdate(processed).
export function startGeo(onUpdate, opts = {}) {
  let prev = null
  let smoothed = null
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      const fix = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        speed: pos.coords.speed, // m/s or null
        accuracy: pos.coords.accuracy,
        t: pos.timestamp,
      }
      const r = processFix(prev, fix, opts)
      if (!r.rejected) prev = fix
      smoothed = ema(smoothed, r.speedKmh, 0.4)
      onUpdate({ ...r, speedKmh: r.rejected ? (smoothed ?? 0) : smoothed })
    },
    (err) => onUpdate({ error: err.code, speedKmh: smoothed ?? 0, deltaKm: 0, moving: false }),
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  )
  return () => navigator.geolocation.clearWatch(id)
}
```

- [ ] **Step 6: Commit**

```bash
git add src/geo.js tests/geo.test.js
git commit -m "feat: GPS fix processing (accuracy filter, stop threshold, jump rejection)"
```

---

## Task 4: `trip.js` — odometer, timers, average speed (TDD)

**Files:**
- Create: `src/trip.js`
- Test: `tests/trip.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/trip.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- trip`
Expected: FAIL.

- [ ] **Step 3: Write `src/trip.js`**

```js
export function createTrip(init = {}) {
  let totalKm = init.totalKm ?? 0
  let dailyKm = init.dailyKm ?? 0
  let sessionDistanceKm = 0
  let movingSec = 0
  let stoppedSec = 0

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- trip`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/trip.js tests/trip.test.js
git commit -m "feat: trip odometer, moving/stopped timers, global average speed"
```

---

## Task 5: `fuel.js` — tank + self-calibrating consumption (TDD)

**Files:**
- Create: `src/fuel.js`
- Test: `tests/fuel.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/fuel.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- fuel`
Expected: FAIL.

- [ ] **Step 3: Write `src/fuel.js`**

```js
export const TANK_L = 7.7
export const RESERVE_L = 1.4
export const USABLE_L = TANK_L - RESERVE_L // 6.3
export const MIN_CYCLE_KM = 30
export const VALID_LP100 = [3, 12]

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
    const mean = cycles.reduce((a, c) => a + c.lPer100, 0) / cycles.length
    calibratedLPer100 = mean
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- fuel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/fuel.js tests/fuel.test.js
git commit -m "feat: self-calibrating fuel model (tank, factors, plein/reserve)"
```

---

## Task 6: Production SVG asset + inline into shell

**Files:**
- Create: `public/compteur.svg` (copy of provided SVG)
- Modify: `index.html`

The provided `Compteur-SVG.svg` (viewBox `0 0 1218 562.5`) is used as the base layer. Dial values are drawn as HTML overlays *on top* of the white circles, which covers the SVG's baked-in sample text. The `#Jauge` path is animated by `gauge.js`.

- [ ] **Step 1: Copy the asset**

```bash
mkdir -p public
cp Compteur-SVG.svg public/compteur.svg
```

- [ ] **Step 2: Load the SVG inline at startup (replace `src/app.js` scaffold)**

```js
// src/app.js
async function loadSvg() {
  const res = await fetch(new URL('/compteur.svg', import.meta.url).pathname.startsWith('/')
    ? '/compteur.svg' : './compteur.svg')
  const text = await res.text()
  const stage = document.getElementById('stage')
  stage.innerHTML = text
  const svg = stage.querySelector('svg')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.style.position = 'absolute'
  svg.style.inset = '0'
  svg.style.width = '100%'
  svg.style.height = '100%'
  return svg
}

loadSvg().then((svg) => {
  console.log('SVG loaded, viewBox =', svg.getAttribute('viewBox'))
})
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Expected: the Vespa speedometer fills the viewport (letterboxed), console logs `viewBox = 0 0 1218 562.5`.

- [ ] **Step 4: Commit**

```bash
git add public/compteur.svg src/app.js
git commit -m "feat: inline Vespa SVG as base layer"
```

---

## Task 7: `gauge.js` — speed gauge fill (browser-verified)

**Files:**
- Create: `src/gauge.js`
- Modify: `src/app.js`

The `#Jauge` path (`stroke-width 77`, `stroke #fff`) is the highlight sweep. We reveal it 0→speed using `stroke-dasharray`/`stroke-dashoffset`. Max speed on the dial = 120.

- [ ] **Step 1: Write `src/gauge.js`**

```js
const MAX_KMH = 120

export function createGauge(svg) {
  const path = svg.querySelector('#Jauge')
  if (!path) throw new Error('#Jauge path not found in SVG')
  const len = path.getTotalLength()
  path.style.strokeDasharray = String(len)
  path.style.strokeDashoffset = String(len) // start empty
  path.style.transition = 'stroke-dashoffset 0.2s linear'

  return {
    setSpeed(kmh) {
      const frac = Math.max(0, Math.min(1, kmh / MAX_KMH))
      path.style.strokeDashoffset = String(len * (1 - frac))
    },
  }
}
```

- [ ] **Step 2: Wire a temporary sweep test into `src/app.js`**

Add after `loadSvg().then(...)`:

```js
import { createGauge } from './gauge.js'

loadSvg().then((svg) => {
  const gauge = createGauge(svg)
  let v = 0
  setInterval(() => { v = (v + 5) % 130; gauge.setSpeed(v) }, 200) // TEMP demo
})
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Expected: the white gauge sweeps 0→120 and loops. Confirm the fill follows the number scale arc.

- [ ] **Step 4: Remove the TEMP demo interval** (leave the `createGauge(svg)` call and import; delete the `setInterval` line).

- [ ] **Step 5: Commit**

```bash
git add src/gauge.js src/app.js
git commit -m "feat: dynamic speed gauge fill along #Jauge path"
```

---

## Task 8: `dials.js` — 4-dial HTML overlays (browser-verified)

**Files:**
- Create: `src/dials.js`
- Modify: `src/app.js`

Dial centers (viewBox `1218 x 562.5`) → percentages: x% = cx/1218, y% = cy/562.5.

| Dial | cx, cy | x%, y% |
|------|--------|--------|
| conso | 363.9, 339.1 | 29.9%, 60.3% |
| heures | 516.6, 386 | 42.4%, 68.6% |
| meteo | 679, 386 | 55.7%, 68.6% |
| km | 833.7, 338.8 | 68.4%, 60.2% |

- [ ] **Step 1: Write `src/dials.js`**

```js
const POS = {
  conso:  { x: 29.9, y: 60.3 },
  heures: { x: 42.4, y: 68.6 },
  meteo:  { x: 55.7, y: 68.6 },
  km:     { x: 68.4, y: 60.2 },
}

function makeDial(stage, key) {
  const el = document.createElement('div')
  el.className = `dial dial-${key}`
  Object.assign(el.style, {
    position: 'absolute',
    left: POS[key].x + '%',
    top: POS[key].y + '%',
    transform: 'translate(-50%, -50%)',
    width: '11.8%',
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    lineHeight: '1.1',
    color: '#111',
    pointerEvents: 'none',
  })
  stage.appendChild(el)
  return el
}

export function createDials(stage) {
  const els = {
    conso: makeDial(stage, 'conso'),
    heures: makeDial(stage, 'heures'),
    meteo: makeDial(stage, 'meteo'),
    km: makeDial(stage, 'km'),
  }

  // Meteo reserved for V2
  els.meteo.innerHTML =
    `<div style="opacity:.5;font-size:3cqw">☁</div><div style="opacity:.6;font-size:1.9cqw">Météo · V2</div>`

  function fmtHM(totalSec) {
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    return `${h}h${String(m).padStart(2, '0')}`
  }
  function fmtClock(d) {
    return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`
  }
  function fmtDate(d) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }
  const band = (t) => `<div style="background:#3a5f6a;color:#fff;border-radius:5px;padding:0 6px;margin:2px 0;font-size:2.2cqw;font-weight:800">${t}</div>`
  const big = (t) => `<div style="font-size:3.6cqw;font-weight:800">${t}</div>`
  const unit = (t) => `<span style="font-size:1.7cqw;font-weight:600">${t}</span>`

  return {
    render(state) {
      const now = new Date()
      // conso: avg speed / km-to-empty + pump / L/100
      els.conso.innerHTML =
        big(`${Math.round(state.avgSpeedKmh)}${unit('km/h')}`) +
        `<div style="background:${state.reserve ? '#b23' : '#3a5f6a'};color:#fff;border-radius:5px;padding:0 6px;margin:2px 0;font-size:2.4cqw;font-weight:800">${Math.round(state.kmToEmpty)}${unit('Km')} ⛽</div>` +
        `<div style="font-size:2.6cqw;font-weight:700">${state.instantLPer100.toFixed(1)}${unit('L/100')}</div>`
      // heures: clock / date / elapsed
      els.heures.innerHTML = big(fmtClock(now)) + band(fmtDate(now)) + big(fmtHM(state.elapsedSec))
      // km: daily / reset / total
      const total = String(Math.floor(state.totalKm)).padStart(6, '0')
      els.km.innerHTML =
        big(String(Math.floor(state.dailyKm)).padStart(4, '0')) +
        band('reset') +
        big(`${total.slice(0, 5)}<span style="color:#e33">${total.slice(5)}</span>`)
    },
    onResetDaily(cb) {
      els.km.style.pointerEvents = 'auto'
      els.km.addEventListener('click', cb)
    },
  }
}
```

- [ ] **Step 2: Add container-query sizing + `.dial` font base in `index.html`**

Add to the `<style>` block in `index.html`:

```css
#stage { container-type: inline-size; }
.dial { font-family: system-ui, sans-serif; }
```

- [ ] **Step 3: Wire dials with sample data in `src/app.js`**

Replace the `loadSvg().then(...)` body with:

```js
import { createGauge } from './gauge.js'
import { createDials } from './dials.js'

loadSvg().then((svg) => {
  const stage = document.getElementById('stage')
  const gauge = createGauge(svg)
  const dials = createDials(stage)
  dials.render({
    avgSpeedKmh: 65, kmToEmpty: 50, reserve: false, instantLPer100: 6,
    elapsedSec: 32 * 60, totalKm: 3826, dailyKm: 353,
  })
  gauge.setSpeed(65)
})
```

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Expected: all four dials show sample values over the circles (conso 65/50/6, time, meteo greyed, km 0353/reset/003826), gauge filled to ~65.

- [ ] **Step 5: Commit**

```bash
git add src/dials.js src/app.js index.html
git commit -m "feat: 4-dial HTML overlays (conso, time, meteo placeholder, km)"
```

---

## Task 9: `app.js` — wire everything together

**Files:**
- Modify: `src/app.js`
- Create: `src/controls.js` (settings ⚙: plein / réserve / passager)

- [ ] **Step 1: Create `src/controls.js` (settings panel)**

```js
// Renders a ⚙ button + panel. Calls back into app on actions.
export function createControls(stage, handlers) {
  const gear = document.createElement('button')
  gear.textContent = '⚙'
  Object.assign(gear.style, {
    position: 'absolute', right: '2%', top: '4%', fontSize: '5cqw',
    background: 'none', border: 'none', color: '#eee', cursor: 'pointer', zIndex: 10,
  })
  stage.appendChild(gear)

  const panel = document.createElement('div')
  Object.assign(panel.style, {
    position: 'absolute', inset: '0', display: 'none', zIndex: 20,
    background: 'rgba(20,30,36,.92)', color: '#fff', padding: '4vh 4vw',
    flexDirection: 'column', gap: '2vh', font: '2.6vh system-ui, sans-serif',
  })
  panel.innerHTML = `
    <h2 style="margin:0">Réglages</h2>
    <button data-act="plein" style="padding:1.5vh">⛽ Plein (réservoir plein)</button>
    <button data-act="reserve" style="padding:1.5vh">⚠ Passage en réserve</button>
    <label style="display:flex;gap:1vw;align-items:center">
      <input type="checkbox" data-act="passenger" /> Passager (2 personnes)
    </label>
    <label>Km total <input type="number" data-act="totalKm" style="width:8em" /></label>
    <label>Conso calibrée (L/100) <input type="number" step="0.1" data-act="calib" style="width:6em" /></label>
    <button data-act="close" style="padding:1.5vh;margin-top:auto">Fermer</button>
  `
  stage.appendChild(panel)

  const q = (a) => panel.querySelector(`[data-act="${a}"]`)
  gear.addEventListener('click', () => {
    q('passenger').checked = handlers.getState().passenger
    q('totalKm').value = Math.floor(handlers.getState().totalKm)
    q('calib').value = handlers.getState().calibratedLPer100.toFixed(1)
    panel.style.display = 'flex'
  })
  q('close').addEventListener('click', () => (panel.style.display = 'none'))
  q('plein').addEventListener('click', () => handlers.onPlein())
  q('reserve').addEventListener('click', () => handlers.onReserve())
  q('passenger').addEventListener('change', (e) => handlers.onPassenger(e.target.checked))
  q('totalKm').addEventListener('change', (e) => handlers.onSetTotalKm(Number(e.target.value)))
  q('calib').addEventListener('change', (e) => handlers.onSetCalib(Number(e.target.value)))
}
```

- [ ] **Step 2: Rewrite `src/app.js` as the orchestrator**

```js
import { createStore } from './store.js'
import { startGeo } from './geo.js'
import { createTrip } from './trip.js'
import { createFuel } from './fuel.js'
import { createGauge } from './gauge.js'
import { createDials } from './dials.js'
import { createControls } from './controls.js'

const store = createStore()
const saved = store.load()
const trip = createTrip({ totalKm: saved.totalKm, dailyKm: saved.dailyKm })
const fuel = createFuel(saved)

let lastSpeed = 0
let lastT = null

async function loadSvg() {
  const res = await fetch('./compteur.svg')
  const stage = document.getElementById('stage')
  stage.innerHTML = await res.text()
  const svg = stage.querySelector('svg')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' })
  return { stage, svg }
}

function persist() {
  const t = trip.snapshot()
  const f = fuel.snapshot()
  store.save({ ...f, totalKm: t.totalKm, dailyKm: t.dailyKm })
}

loadSvg().then(({ stage, svg }) => {
  const gauge = createGauge(svg)
  const dials = createDials(stage)

  dials.onResetDaily(() => { trip.resetDaily(); persist(); render() })

  createControls(stage, {
    getState: () => ({ ...fuel.snapshot() }),
    onPlein: () => { fuel.plein(trip.snapshot().totalKm); persist(); render() },
    onReserve: () => {
      const r = fuel.reserve(trip.snapshot().totalKm)
      alert(r.accepted ? `Calibré : ${r.lPer100.toFixed(1)} L/100` : 'Réserve enregistrée (cycle non calibré)')
      persist(); render()
    },
    onPassenger: (on) => { fuel.setPassenger(on); persist() },
    onSetTotalKm: (v) => { trip.snapshot().totalKm; store.save({ ...fuel.snapshot(), totalKm: v, dailyKm: trip.snapshot().dailyKm }); location.reload() },
    onSetCalib: (v) => { const s = fuel.snapshot(); store.save({ ...s, calibratedLPer100: v, totalKm: trip.snapshot().totalKm, dailyKm: trip.snapshot().dailyKm }); location.reload() },
  })

  function render() {
    const t = trip.snapshot()
    const speed = lastSpeed
    gauge.setSpeed(speed)
    dials.render({
      avgSpeedKmh: t.avgSpeedKmh,
      kmToEmpty: fuel.kmToEmpty(),
      reserve: fuel.isReserve(),
      instantLPer100: fuel.instant(speed, 0),
      elapsedSec: t.elapsedSec,
      totalKm: t.totalKm,
      dailyKm: t.dailyKm,
    })
  }

  startGeo((u) => {
    const now = performance.now()
    const dtSec = lastT == null ? 0 : (now - lastT) / 1000
    lastT = now
    const accelKmhs = dtSec > 0 ? (u.speedKmh - lastSpeed) / dtSec : 0
    lastSpeed = u.speedKmh

    trip.update({ deltaKm: u.deltaKm, moving: u.moving, dtSec })
    if (u.moving) fuel.consume(u.deltaKm, fuel.instant(u.speedKmh, accelKmhs))
    else fuel.consumeIdle(dtSec)
    render()
    persist()
  })

  render()
  requestWakeLock()
})

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      let lock = await navigator.wakeLock.request('screen')
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen')
      })
    }
  } catch { /* wake lock unavailable — screen may sleep */ }
}
```

- [ ] **Step 3: Verify in browser (desktop first)**

Run: `npm run dev`, open on desktop, allow location.
Expected: dials render; ⚙ opens the panel; Plein/Réserve/passenger work; daily reset works on the km dial; no console errors. (Speed will be ~0 on a stationary desktop — that's expected.)

- [ ] **Step 4: Commit**

```bash
git add src/app.js src/controls.js
git commit -m "feat: wire GPS -> trip/fuel -> gauge/dials, settings panel, wake lock"
```

---

## Task 10: PWA — manifest, service worker, install

**Files:**
- Create: `public/manifest.webmanifest`, `src/sw.js`, `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `src/app.js` (register SW)

- [ ] **Step 1: Create `public/manifest.webmanifest`**

```json
{
  "name": "Compteur Vespa",
  "short_name": "Compteur",
  "start_url": ".",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#5a6b78",
  "theme_color": "#5a6b78",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Generate icons from the SVG**

```bash
mkdir -p public/icons
# Requires rsvg-convert (brew install librsvg) or use any 192/512 PNG export of the compteur.
rsvg-convert -w 512 -h 512 public/compteur.svg -o public/icons/icon-512.png
rsvg-convert -w 192 -h 192 public/compteur.svg -o public/icons/icon-192.png
```
Expected: two PNG files exist in `public/icons/`. (If `rsvg-convert` is unavailable, export any square PNG at those sizes.)

- [ ] **Step 3: Create `src/sw.js` (cache-first app shell)**

```js
const CACHE = 'compteur-vespa-v1'
const ASSETS = ['./', './index.html', './compteur.svg', './manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)))
  self.skipWaiting()
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
  self.clients.claim()
})
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)))
})
```

- [ ] **Step 4: Register the service worker (append to `src/app.js`)**

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}
```

Note: with Vite, put `sw.js` where the build serves it at the site root. For simplicity copy it into `public/` during build, or move `src/sw.js` to `public/sw.js` and register `'./sw.js'`. Use `public/sw.js`.

- [ ] **Step 5: Verify installability**

Run: `npm run build && npm run preview`
Expected: Chrome DevTools → Application → Manifest shows no errors; Service Worker is activated; "Install" is offered.

- [ ] **Step 6: Commit**

```bash
git add public/manifest.webmanifest public/sw.js public/icons src/app.js
git commit -m "feat: PWA manifest, service worker, install icons"
```

---

## Task 11: Deploy to GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the deploy workflow**

```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: GITHUB_PAGES=1 npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify `vite.config.js` base matches the repo name**

Confirm `base: '/compteur-vespa/'` matches the actual GitHub repo name; edit if different.

- [ ] **Step 3: Push and enable Pages**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy to GitHub Pages"
git push -u origin main
```
Then in the repo: Settings → Pages → Source = "GitHub Actions". Wait for the workflow to go green.

- [ ] **Step 4: Verify on the iPhone**

Open the Pages URL in Safari → Share → "Sur l'écran d'accueil". Launch from the home screen (fullscreen, landscape), allow location, and ride-test: gauge tracks speed, km increments, timer runs, Plein/Réserve work.

---

## Self-Review Notes

- **Spec §2 scope:** speed+gauge (T7/T9), avg speed (T4), daily/total km + reset (T4/T8/T9), timer moving/stopped (T4), consumption + km-to-empty (T5/T9), passenger switch (T5/T9), meteo greyed (T8). Météo V2 intentionally out of scope. ✅
- **Spec §5 geometry:** dial centers/radius and `#Jauge` path used verbatim in T7/T8. ✅
- **Spec §7 fuel model:** factors, plein/reserve calibration, resync, km-to-empty via calibrated — all in T5. ✅
- **Spec §8 robustness:** accuracy filter / stop threshold / jump rejection (T3), persistence (T2/T9), wake lock (T9). GPS-loss "GPS ?" display is a small enhancement — add to `dials.render` if `state.gpsError` once field wiring exists (noted, low priority).
- **Type consistency:** `snapshot()` shapes, `createFuel`/`createTrip` init keys, and `store` DEFAULTS keys align across tasks.
- **Known V1 simplification:** the SVG's two-tone scale numbers (black 0-60 / white 80-120) are static; only the `#Jauge` sweep is dynamic. Acceptable for V1; refine later if desired.
