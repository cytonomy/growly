# Growly

A browser-based audio-reactive game.

Live: <https://cytonomy.github.io/growly/>

## How Growly reacts to sound

| Audio feature | What Growly does |
|---|---|
| **Pitch** (spectral centroid) | Sets his **color** along a piecewise palette designed for *visible* musical regions (not a generic rainbow): **red** for bass/kick, **orange** for bass-mid, **yellow** for low-mid/vocals, **green** for mids/guitars, **purple** for high-mid/cymbals, **pink/magenta** for air/sparkle. Blue is reserved for ambient silence. The mapping interpolates along the shorter arc of the color wheel between log-frequency anchors, so the green→purple transition wraps backwards through warm colors instead of crossing through blue. Smoothed slowly so the color has time to dwell on each region. Anchors live in `pitchHueStops`. |
| **Volume / intensity** | Sets the **height of his jiggle** *and* the **amount he stretches/squashes**. Quiet → barely-there bob with no shape change. Loud → full launch + dramatic stretch on the way up + squash on landing. |
| **BPM** | Sets the **speed of his jiggle** — one bounce per beat. Detected via spectral-flux ODF + autocorrelation with comb filter, Gaussian prior, confidence gating, median smoothing, outlier rejection, and tempo octave folding into 80–160 BPM. |
| **High BPM** | Above ~105 BPM, each bounce **arcs from one landing side to the other**, alternating L↔R. He lands at the new side, holds there during the ground portion of the cycle, then takes off into the next arc the other way. Net drift is zero. Arc spread grows with tempo and intensity. |
| **No music / silence** | Defaults to a **slow micro-jiggle** (~35 BPM, sub-pixel lift, NEUTRAL frame only) so he's never completely still. |
| **Click / tap** | Hops toward the click point in a series of arc'd jumps (independent of the audio loop). Mobile-friendly: works on touch. |

The first tap also grants mic permission. Without mic access, Growly skips audio reactivity and stays at the silent-default behavior.

## Tuning

All tunable parameters live in `config.js` (window.GROWLY_CONFIG). Edit, refresh the page — both files share a cache-buster timestamp so changes show up immediately.

Notable knobs:

- `bounceMinAmpPx` / `bounceMaxAmpPx` — vertical bounce range (top end is dramatic on loud music)
- `intensityToFullStretch` / `intensityToFullSquash` — thresholds where each level of deformation kicks in (silent floor is *always* a gentle apex stretch — Growly never goes static)
- `swayBpmThreshold` / `swayMaxAmpPx` — when the per-bounce L↔R arc kicks in and how wide the landing spread is (half-width in sprite-pixels)
- `micGain` — calibrate so typical room volume reads ~80% on the HUD; clipping at 100% is fine
- `micSmoothing` — EMA on intensity used by bounce/sway (fast; lower = smoother)
- `levelDisplaySmoothing` — EMA on the HUD `level%` readout only (slower; keeps the number from flickering while the animation stays responsive)
- `pitchHueStops` — `[centroidHz, hue°]` anchors that define the bass→mid→high color palette. Edit a single anchor to remap a frequency band to a different color.
- `pitchSmoothing` — EMA on hue (lower = slower, more dramatic dwell on each color)
- `hueFallback` — ambient blue shown when intensity is below `intensityThreshold`
- `bpmConfidenceThreshold` — how dominant the autocorrelation peak must be before we commit a new tempo
- `bpmOutlierTolerance` / `bpmOutlierConfirmations` / `bpmOutlierStabilityStdMax` — once locked, an alternative tempo must (a) drift far enough, (b) repeat for `bpmOutlierConfirmations × bpmEstimateIntervalMs` worth of estimates, and (c) cluster tightly (std under `bpmOutlierStabilityStdMax`) before it can flush the lock. Random mic noise scatters too widely to ever pass.
- `silenceResetMs` — how long the room must be quiet before Growly drops his current tempo lock and reverts to `bpmFallback`
- `bpmFallback` — silent-default BPM
- `bodySaturation` / `bodyLightness` (and rim/shadow/eye variants) — palette mood

## Running locally

```sh
python3 -m http.server 8081 --bind 127.0.0.1
```

Then open <http://localhost:8081>.

## File layout

- `index.html` — page shell, loads p5.js + config.js + sketch.js (cache-busted on every load)
- `config.js` — all tunable parameters
- `sketch.js` — sprites, idle/hop animation, audio analysis pipeline
