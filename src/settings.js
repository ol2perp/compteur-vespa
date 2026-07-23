// Parse a user-entered settings value; return null (reject) for blank/NaN/out-of-range.
export function parseSettingsNumber(value, { min = null } = {}) {
  if (value == null) return null
  const s = String(value).trim()
  if (s === '') return null
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  if (min != null && n < min) return null
  return n
}
