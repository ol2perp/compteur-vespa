import { describe, it, expect } from 'vitest'
import { parseSettingsNumber } from '../src/settings.js'

describe('parseSettingsNumber', () => {
  it('rejects an empty string', () => {
    expect(parseSettingsNumber('')).toBeNull()
  })

  it('rejects a whitespace-only string', () => {
    expect(parseSettingsNumber('   ')).toBeNull()
  })

  it('rejects non-numeric input', () => {
    expect(parseSettingsNumber('abc')).toBeNull()
  })

  it('parses a plain integer string', () => {
    expect(parseSettingsNumber('388')).toBe(388)
  })

  it('rejects a value below the minimum', () => {
    expect(parseSettingsNumber('0', { min: 0.1 })).toBeNull()
  })

  it('accepts a decimal value at or above the minimum', () => {
    expect(parseSettingsNumber('5.5', { min: 0.1 })).toBe(5.5)
  })

  it('rejects a negative value when min is 0', () => {
    expect(parseSettingsNumber('-3', { min: 0 })).toBeNull()
  })

  it('accepts zero when min is 0', () => {
    expect(parseSettingsNumber('0', { min: 0 })).toBe(0)
  })
})
