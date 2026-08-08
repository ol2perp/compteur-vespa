// Force landscape, nothing cleverer. No calibration, no stored reference,
// no landscape-primary/secondary detection — a first attempt at that (via
// screen.orientation.type) caused spurious flips that weren't there
// before, because the captured reference could itself be wrong. This
// version only reacts to actual portrait vs landscape (which every
// browser reports correctly) and does nothing otherwise, so it can't
// introduce a flip that wasn't already there.
export function initOrientationLock(root) {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {}) // no-op where unsupported (iOS Safari)
  }

  function apply() {
    const portrait = window.matchMedia('(orientation: portrait)').matches
    Object.assign(root.style, portrait
      ? {
          transform: 'rotate(90deg)',
          transformOrigin: 'top left',
          position: 'fixed',
          top: '0',
          left: '100%',
          width: '100vh',
          height: '100vw',
        }
      // landscape (the normal case): clear overrides, fall back to index.html's
      // #stage rule (position: relative; width: 100vw; height: 100vh) untouched
      : { transform: '', transformOrigin: '', position: '', top: '', left: '', width: '', height: '' })
  }

  window.addEventListener('resize', apply)
  apply()
}
