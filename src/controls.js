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
const FONT_VH = yh(47.1)

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
  .reglages-panel .field { position: absolute; display: flex; flex-direction: column; }
  .reglages-panel .field label { font-size: ${FONT_VH}vh; line-height: 1; margin-bottom: .4vh; }
  .reglages-panel .field input {
    font: inherit; font-size: ${FONT_VH * 0.75}vh; color: #fff; flex: 1;
    background: transparent; border: 1.2px solid #fff; border-radius: 4px;
    padding: 0 .6vw; width: 100%; box-sizing: border-box;
  }
  .reglages-panel .passenger {
    position: absolute; display: flex; gap: 1vw; align-items: center;
    font-size: ${FONT_VH * 0.6}vh;
  }
  .reglages-panel .close-btn {
    border-radius: 50%; font-size: ${FONT_VH}vh; line-height: 1;
  }
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

  // Coordinates below are the mockup's rect/circle geometry verbatim
  // (see V_1-REGLAGES-CodeSVG.txt), just run through xw()/yh().
  panel.innerHTML = `
    <button class="close-btn" data-act="close" aria-label="Fermer" style="
      left:${xw(1052.3)}vw; top:${yh(76)}vh; width:${yh(59)}vh; height:${yh(59)}vh;
    ">✕</button>

    <button data-act="plein" style="
      left:${xw(359.3)}vw; top:${yh(174.5)}vh; width:${xw(192)}vw; height:${yh(64.9)}vh;
    ">PLEIN</button>

    <button data-act="annulreserve" style="
      left:${xw(654.8)}vw; top:${yh(174.5)}vh; width:${xw(192)}vw; height:${yh(64.9)}vh;
    "><span class="icon">↺</span>RESERVE</button>

    <div class="field" style="left:${xw(416.4)}vw; top:${yh(283.7)}vh; width:${xw(77.9)}vw; height:${yh(93.1)}vh;">
      <label>CONSO</label>
      <input type="number" step="0.1" data-act="calib" />
    </div>

    <div class="field" style="left:${xw(696.9)}vw; top:${yh(283.7)}vh; width:${xw(113.2)}vw; height:${yh(93.1)}vh;">
      <label>KM</label>
      <input type="number" data-act="totalKm" />
    </div>

    <button data-act="newtrip" style="
      left:${xw(359.3)}vw; top:${yh(410)}vh; width:${xw(487.5)}vw; height:${yh(64.9)}vh;
    "><span class="icon">🔄</span>NOUVEAU TRAJET</button>

    <label class="passenger" style="left:${xw(359.3)}vw; top:${yh(490)}vh; width:${xw(487.5)}vw; justify-content:center;">
      <input type="checkbox" data-act="passenger" /> PASSAGER (2 PERSONNES)
    </label>
  `
  stage.appendChild(panel)

  const q = (a) => panel.querySelector(`[data-act="${a}"]`)
  gear.addEventListener('click', () => {
    q('passenger').checked = handlers.getState().passenger
    q('totalKm').value = Math.floor(handlers.getState().totalKm)
    q('calib').value = handlers.getState().calibratedLPer100.toFixed(1)
    panel.style.display = 'block'
  })
  q('close').addEventListener('click', () => (panel.style.display = 'none'))
  q('plein').addEventListener('click', () => handlers.onPlein())
  q('annulreserve').addEventListener('click', () => handlers.onAnnulReserve())
  q('newtrip').addEventListener('click', () => handlers.onNewTrip())
  q('passenger').addEventListener('change', (e) => handlers.onPassenger(e.target.checked))
  q('totalKm').addEventListener('change', (e) => handlers.onSetTotalKm(e.target.value))
  q('calib').addEventListener('change', (e) => handlers.onSetCalib(e.target.value))
}
