// iOS Safari has no working Screen Orientation *lock* API (only read
// access to screen.orientation.type/angle) — see the long-standing WebKit
// gap. To keep the dashboard readable on a handlebar mount, we detect the
// current landscape sub-orientation ourselves and counter-rotate 180deg
// with CSS whenever it flips away from whichever orientation the phone was
// in when locked. This also survives the OS-level rotation lock: it only
// reacts to whatever orientation Safari reports, not to physical rotation
// directly, so it keeps correcting even if the OS freezes mid-flip.
const STORAGE_KEY = 'compteur.lockedOrientation'

function currentKey() {
  if (screen.orientation && screen.orientation.type) return screen.orientation.type
  if (typeof window.orientation === 'number') return String(window.orientation)
  return null
}

export function initOrientationLock(root) {
  function apply() {
    const locked = localStorage.getItem(STORAGE_KEY)
    const current = currentKey()
    root.style.transform = locked && current && current !== locked ? 'rotate(180deg)' : ''
  }

  function lock() {
    const key = currentKey()
    if (key) localStorage.setItem(STORAGE_KEY, key)
    apply()
  }

  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', apply)
  } else {
    window.addEventListener('orientationchange', () => setTimeout(apply, 50))
  }
  window.addEventListener('resize', apply)

  if (!localStorage.getItem(STORAGE_KEY)) lock() // autolock on first launch
  apply()

  return { lock }
}
