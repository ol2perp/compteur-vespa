// Renders a ⚙ button + panel. Calls back into app on actions.
// Panel layout is retranscribed pixel-for-pixel from
// docs/DesignGraphik/V_1/V_1-REGLAGES-CodeSVG.txt (mockup only, not loaded
// live — see A-1_Specs-techniques-SVG.md): every element below is
// positioned as %-of-viewBox (1217.6 x 562.8) converted to vw/vh, same
// units the fixed-viewport #stage already uses elsewhere in the app, so
// vw/vh map 1:1 onto the SVG's own coordinate space.
// No font-weight:700 — same reason as dials.js: the Typekit "din-condensed"
// embed has no real Bold cut, so a requested weight only triggers the
// browser's synthetic bold, which the designer asked to avoid.
const VB_W = 1217.6
const VB_H = 562.8
const xw = (px) => (px / VB_W) * 100 // -> vw
const yh = (px) => (px / VB_H) * 100 // -> vh
// vh is always relative to the *true* device viewport height, regardless of
// any CSS rotation trick applied to an ancestor — so text sized directly off
// the mockup's px-per-viewBox-height reads fine on a desktop test window,
// but on a real phone's landscape viewport (~390px tall) it comes out too
// small to read at a glance while riding. SCALE bumps text/row sizes past
// what the mockup's own proportions would give, verified against a
// realistic 844x390 iPhone landscape viewport (not a generously-sized dev
// window) — positions/x-spans stay mockup-matched, only size grows.
const SCALE = 1.5
const FONT_VH = yh(47.1) * SCALE
const ROW_H = yh(64.9) * SCALE
const FIELD_H = yh(93.1) * SCALE

const STYLE = `
  .reglages-panel { font-family: 'din-condensed', system-ui, sans-serif; }
  .reglages-panel button, .reglages-panel label, .reglages-panel .field input {
    text-transform: uppercase; letter-spacing: .02em; color: #fff;
  }
  .reglages-panel button {
    position: absolute; font: inherit; font-size: ${FONT_VH}vh; color: #fff;
    background: transparent; border: 1.5px solid #fff; border-radius: ${yh(10.1)}vh;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    white-space: nowrap; gap: .3em;
  }
  .reglages-panel button .icon { font-size: .5em; }
  .reglages-panel button:active { background: rgba(255,255,255,.15); }
  .reglages-panel .field { position: absolute; display: flex; flex-direction: row; align-items: center; gap: .6vw; }
  .reglages-panel .field label { font-size: ${FONT_VH}vh; line-height: 1; flex: none; }
  .reglages-panel .field input {
    font: inherit; font-size: ${FONT_VH * 0.75}vh; color: #fff; flex: 1; min-width: 0;
    background: transparent; border: 1.2px solid #fff; border-radius: 4px;
    padding: 0 .6vw; box-sizing: border-box;
  }
  .reglages-panel .close-btn {
    border-radius: 50%; font-size: ${FONT_VH}vh; line-height: 1;
  }
  .reglages-panel button:disabled {
    opacity: .35; cursor: not-allowed;
  }
  #color-confirm {
    position: absolute; display: none; gap: 2vw; z-index: 25;
    font-family: 'din-condensed', system-ui, sans-serif;
  }
  #color-confirm button {
    font: inherit; font-size: ${FONT_VH}vh; color: #fff; text-transform: uppercase;
    letter-spacing: .02em; background: rgba(0,0,0,.6); border: 1.5px solid #fff;
    border-radius: ${yh(10.1)}vh; cursor: pointer; display: flex; align-items: center;
    justify-content: center; white-space: nowrap; gap: .3em;
  }
  #color-confirm button:active { background: rgba(255,255,255,.15); }
`
const styleTag = document.createElement('style')
styleTag.textContent = STYLE
document.head.appendChild(styleTag)

export function createControls(stage, handlers) {
  const gear = document.createElement('button')
  gear.textContent = '⚙'
  Object.assign(gear.style, {
    position: 'absolute', right: '2%', top: '4%', fontSize: '5cqw',
    background: 'none', border: 'none', color: '#eee', cursor: 'pointer', zIndex: 10,
  })
  stage.appendChild(gear)

  const panel = document.createElement('div')
  panel.className = 'reglages-panel'
  Object.assign(panel.style, {
    position: 'absolute', inset: '0', display: 'none', zIndex: 20,
    background: 'rgba(0,0,0,.85)',
  })

  // x-positions/widths for Plein/Reserve/Conso/Km stay the mockup's own
  // (see V_1-REGLAGES-CodeSVG.txt) — only row heights, font sizes, and
  // vertical spacing depart from it (SCALE, see above). Nouveau trajet and
  // Passager were dropped: both actions are already reachable directly on
  // MAIN (tap the KM dial / the passenger circle), so they were pure
  // duplication here.
  //
  // x-spans below no longer track the mockup's own (narrower) widths — once
  // SCALE grew the font/row-height enough to read at a glance while riding,
  // the mockup's original button/field widths were too tight and clipped
  // text (RESERVE's icon+label, the CONSO value). Widened and re-centered
  // around the same horizontal midpoint the mockup used, using the
  // generous unused space either side of that center column.
  const CENTER = 49.5 // vw, same midpoint the mockup's own layout used
  const ROW_SPAN = 60 // vw, total width of the widened button rows
  const rowLeft = CENTER - ROW_SPAN / 2

  const btnW = 23.5 // vw, Plein/Reserve
  const btnGap = ROW_SPAN - 2 * btnW

  const fieldW = 22 // vw, Conso/Km — wide enough for the "CONSO" label (longer than "KM") plus its input
  const r3Gap = 2 // vw, between Météo/GPS/Couleur
  const r3W = (ROW_SPAN - 2 * r3Gap) / 3

  panel.innerHTML = `
    <button class="close-btn" data-act="close" aria-label="Fermer" style="
      left:${xw(1052.3)}vw; top:${yh(76)}vh; width:${yh(59)}vh; height:${yh(59)}vh;
    ">✕</button>

    <button data-act="plein" style="
      left:${rowLeft}vw; top:26vh; width:${btnW}vw; height:${ROW_H}vh;
    ">PLEIN</button>

    <button data-act="annulreserve" style="
      left:${rowLeft + btnW + btnGap}vw; top:26vh; width:${btnW}vw; height:${ROW_H}vh;
    "><span class="icon">↺</span>RESERVE</button>

    <div class="field" style="left:${rowLeft}vw; top:48vh; width:${fieldW}vw; height:${FIELD_H}vh;">
      <label>CONSO</label>
      <input type="number" step="0.1" data-act="calib" />
    </div>

    <div class="field" style="left:${rowLeft + ROW_SPAN - fieldW}vw; top:48vh; width:${fieldW}vw; height:${FIELD_H}vh;">
      <label>KM</label>
      <input type="number" data-act="totalKm" />
    </div>

    <button data-act="meteo" disabled style="
      left:${rowLeft}vw; top:72vh; width:${r3W}vw; height:${ROW_H}vh; font-size:${FONT_VH * 0.75}vh;
    ">☁️ MÉTÉO</button>

    <button data-act="gps" disabled style="
      left:${rowLeft + r3W + r3Gap}vw; top:72vh; width:${r3W}vw; height:${ROW_H}vh; font-size:${FONT_VH * 0.75}vh;
    ">📍 GPS</button>

    <button data-act="color-open" style="
      left:${rowLeft + 2 * (r3W + r3Gap)}vw; top:72vh; width:${r3W}vw; height:${ROW_H}vh; font-size:${FONT_VH * 0.6}vh;
    ">🎨 COULEUR</button>
  `
  stage.appendChild(panel)

  // The native picker's own 'change' fires the instant the rider dismisses
  // it — even a light tap on a swatch closes it and used to commit
  // immediately, with no chance to try a color first. So 'change' now only
  // reveals a Valider/Annuler bar instead of persisting: the color is
  // already live-previewed on MAIN (via 'input'), and only Valider
  // persists it. The <input> itself lives at the stage level, not inside
  // the panel, so it stays clickable (a display:none ancestor can't be
  // triggered) while the panel is hidden during the whole picking flow.
  const colorInput = document.createElement('input')
  colorInput.type = 'color'
  colorInput.dataset.act = 'color'
  Object.assign(colorInput.style, { position: 'absolute', opacity: '0', width: '0', height: '0', border: '0', padding: '0', pointerEvents: 'none' })
  stage.appendChild(colorInput)

  const confirmBar = document.createElement('div')
  confirmBar.id = 'color-confirm'
  Object.assign(confirmBar.style, { left: `${CENTER - 30}vw`, top: '72vh', width: '60vw', height: `${ROW_H}vh` })
  confirmBar.innerHTML = `
    <button data-act="color-retry" style="flex:1" aria-label="Essayer une autre couleur">🎨</button>
    <button data-act="color-cancel" style="flex:1" aria-label="Annuler">✕</button>
    <button data-act="color-ok" style="flex:1" aria-label="Valider">✓</button>
  `
  stage.appendChild(confirmBar)

  let preEditColor = null

  const q = (a) => panel.querySelector(`[data-act="${a}"]`)
  const c = (a) => confirmBar.querySelector(`[data-act="${a}"]`)

  gear.addEventListener('click', () => {
    q('totalKm').value = Math.floor(handlers.getState().totalKm)
    q('calib').value = handlers.getState().calibratedLPer100.toFixed(1)
    colorInput.value = handlers.getState().accentColor
    panel.style.display = 'block'
  })
  q('close').addEventListener('click', () => (panel.style.display = 'none'))
  q('plein').addEventListener('click', () => handlers.onPlein())
  q('annulreserve').addEventListener('click', () => handlers.onAnnulReserve())
  q('totalKm').addEventListener('change', (e) => handlers.onSetTotalKm(e.target.value))
  q('calib').addEventListener('change', (e) => handlers.onSetCalib(e.target.value))

  q('color-open').addEventListener('click', () => {
    preEditColor = handlers.getState().accentColor
    panel.style.display = 'none'
    colorInput.click()
  })
  colorInput.addEventListener('input', (e) => handlers.onColorPreview(e.target.value))
  colorInput.addEventListener('change', () => {
    confirmBar.style.display = 'flex'
  })
  c('color-retry').addEventListener('click', () => {
    confirmBar.style.display = 'none'
    colorInput.click()
  })
  c('color-cancel').addEventListener('click', () => {
    handlers.onColorPreview(preEditColor)
    confirmBar.style.display = 'none'
  })
  c('color-ok').addEventListener('click', () => {
    handlers.onColorCommit(colorInput.value)
    confirmBar.style.display = 'none'
  })
}
