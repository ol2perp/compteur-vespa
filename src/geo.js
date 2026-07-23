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
