// Renders a ⚙ button + panel. Calls back into app on actions.
// Panel styling follows docs/DesignGraphik/V_1/V_1-REGLAGES.svg (mockup only,
// not loaded live — see A-1_Specs-techniques-SVG.md): black translucent bg,
// white-outline pill buttons, boxed fields, DIN Condensed, red Vespa accent.
const RED = '#e30617'

const STYLE = `
  .reglages-panel { font-family: 'din-condensed', system-ui, sans-serif; }
  .reglages-panel button, .reglages-panel .field label, .reglages-panel .passenger {
    text-transform: uppercase; letter-spacing: .04em;
  }
  .reglages-panel button {
    font: inherit; font-weight: 700; font-size: 2.4vh; color: #fff;
    background: transparent; border: 1.5px solid #fff; border-radius: 8vh;
    padding: 1.4vh 1vw; cursor: pointer;
  }
  .reglages-panel button:active { background: rgba(255,255,255,.15); }
  .reglages-panel .row { display: flex; gap: 3vw; }
  .reglages-panel .field { display: flex; flex-direction: column; gap: .6vh; flex: 1; }
  .reglages-panel .field label { font-size: 2vh; font-weight: 700; color: #fff; }
  .reglages-panel .field input {
    font: inherit; font-weight: 700; font-size: 2.6vh; color: #fff;
    background: transparent; border: 1.2px solid #fff; border-radius: 4px;
    padding: 1vh; width: auto; box-sizing: border-box;
  }
  .reglages-panel .passenger {
    display: flex; gap: 1vw; align-items: center; font-size: 2.2vh;
    font-weight: 700; color: #fff;
  }
  .reglages-panel .close-btn {
    position: absolute; right: 2%; top: 4%; width: 5.5vh; height: 5.5vh;
    border-radius: 50%; border: 2px solid #fff; background: none; color: #fff;
    font-size: 2.6vh; line-height: 1; cursor: pointer; display: flex;
    align-items: center; justify-content: center;
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
    background: 'rgba(0,0,0,.85)', padding: '10vh 6vw 4vh',
    flexDirection: 'column', gap: '3vh', justifyContent: 'center',
  })
  panel.innerHTML = `
    <button class="close-btn" data-act="close" aria-label="Fermer">✕</button>
    <div class="row">
      <button data-act="plein">⛽ Plein</button>
      <button data-act="annulreserve">↺ Annuler réserve</button>
    </div>
    <div class="row">
      <div class="field">
        <label>Conso (L/100)</label>
        <input type="number" step="0.1" data-act="calib" />
      </div>
      <div class="field">
        <label>Km total</label>
        <input type="number" data-act="totalKm" />
      </div>
    </div>
    <div class="row">
      <button data-act="newtrip" style="flex:1">🔄 Nouveau trajet</button>
    </div>
    <label class="passenger">
      <input type="checkbox" data-act="passenger" /> Passager (2 personnes)
    </label>
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
  q('annulreserve').addEventListener('click', () => handlers.onAnnulReserve())
  q('newtrip').addEventListener('click', () => handlers.onNewTrip())
  q('passenger').addEventListener('change', (e) => handlers.onPassenger(e.target.checked))
  q('totalKm').addEventListener('change', (e) => handlers.onSetTotalKm(e.target.value))
  q('calib').addEventListener('change', (e) => handlers.onSetCalib(e.target.value))
}
