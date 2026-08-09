// Custom HSV color picker — replaces the native <input type="color">, whose
// popover (size, position, dimmed backdrop) is entirely OS-drawn and can't
// be resized, repositioned, or stripped of its backdrop from a web page on
// either iOS or macOS. This one is ours: no full-screen dimming (MAIN stays
// visible everywhere else), confined to the right third of the screen.
//
// Saturation/Value square uses two layered CSS gradients over a solid hue
// background (standard trick) instead of a canvas redraw — only the base
// hue color needs to change as the hue slider moves.

const STYLE = `
  .color-picker {
    position: absolute; z-index: 30; display: none;
    right: 3vw; top: 14vh; width: 34vw; padding: 2.5vh 2vw;
    background: rgba(0,0,0,.8); border: 1.5px solid #fff; border-radius: 2vh;
    box-sizing: border-box; font-family: 'din-condensed', system-ui, sans-serif;
  }
  .color-picker .sv-square {
    position: relative; width: 100%; height: 20vh; border-radius: 1vh;
    background: linear-gradient(to top, #000, transparent),
                linear-gradient(to right, #fff, transparent);
    touch-action: none; cursor: pointer;
  }
  .color-picker .sv-thumb {
    position: absolute; width: 2.2vh; height: 2.2vh; margin: -1.1vh;
    border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 3px rgba(0,0,0,.8);
    pointer-events: none;
  }
  .color-picker .hue-slider {
    -webkit-appearance: none; appearance: none; width: 100%; height: 2.6vh;
    margin-top: 2vh; border-radius: 1.3vh; outline: none;
    background: linear-gradient(to right, red, #ff0, lime, cyan, blue, magenta, red);
  }
  .color-picker .hue-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 2.6vh; height: 2.6vh; border-radius: 50%;
    background: #fff; border: 2px solid #333; cursor: pointer;
  }
  .color-picker .row { display: flex; gap: 2vw; margin-top: 2vh; align-items: center; }
  .color-picker .swatch { width: 4vh; height: 4vh; border-radius: 50%; border: 1.5px solid #fff; flex: none; }
  .color-picker .actions { display: flex; gap: 1.5vw; flex: 1; }
  .color-picker button {
    flex: 1; font: inherit; font-size: 2.4vh; color: #fff; text-transform: uppercase;
    background: transparent; border: 1.5px solid #fff; border-radius: 1.3vh;
    cursor: pointer; padding: 1vh 0;
  }
  .color-picker button:active { background: rgba(255,255,255,.15); }
`
const styleTag = document.createElement('style')
styleTag.textContent = STYLE
document.head.appendChild(styleTag)

function hsvToHex(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const to255 = (n) => Math.round((n + m) * 255)
  return '#' + [to255(r), to255(g), to255(b)].map((n) => n.toString(16).padStart(2, '0')).join('')
}

function hexToHsv(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
  }
  if (h < 0) h += 360
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

export function createColorPicker(stage, { onPreview, onCommit }) {
  const el = document.createElement('div')
  el.className = 'color-picker'
  el.innerHTML = `
    <div class="sv-square"><div class="sv-thumb"></div></div>
    <input type="range" class="hue-slider" min="0" max="360" step="1" />
    <div class="row">
      <div class="swatch"></div>
      <div class="actions">
        <button data-act="cancel">✕</button>
        <button data-act="ok">✓</button>
      </div>
    </div>
  `
  stage.appendChild(el)

  const sv = el.querySelector('.sv-square')
  const thumb = el.querySelector('.sv-thumb')
  const hueSlider = el.querySelector('.hue-slider')
  const swatch = el.querySelector('.swatch')

  let hsv = { h: 200, s: 0.5, v: 0.9 }
  let onCancelRevert = null

  function currentHex() {
    return hsvToHex(hsv.h, hsv.s, hsv.v)
  }

  function paint() {
    sv.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${hsv.h}, 100%, 50%)`
    thumb.style.left = `${hsv.s * 100}%`
    thumb.style.top = `${(1 - hsv.v) * 100}%`
    hueSlider.value = String(hsv.h)
    const hex = currentHex()
    swatch.style.background = hex
    return hex
  }

  function svPointer(e) {
    const rect = sv.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    hsv = { ...hsv, s: x, v: 1 - y }
    onPreview(paint())
  }
  sv.addEventListener('pointerdown', (e) => {
    sv.setPointerCapture(e.pointerId)
    svPointer(e)
  })
  sv.addEventListener('pointermove', (e) => {
    if (e.pressure === 0 && e.buttons === 0) return
    svPointer(e)
  })

  hueSlider.addEventListener('input', (e) => {
    hsv = { ...hsv, h: Number(e.target.value) }
    onPreview(paint())
  })

  el.querySelector('[data-act=ok]').addEventListener('click', () => {
    onCommit(currentHex())
    el.style.display = 'none'
  })
  el.querySelector('[data-act=cancel]').addEventListener('click', () => {
    if (onCancelRevert) onPreview(onCancelRevert)
    el.style.display = 'none'
  })

  return {
    open(initialHex) {
      hsv = hexToHsv(initialHex)
      onCancelRevert = initialHex
      paint()
      el.style.display = 'block'
    },
  }
}
