# Growly

A browser-based audio-reactive game.

Live: <https://cytonomy.github.io/growly/>

## How Growly reacts to sound

| Audio feature | What Growly does |
|---|---|
| **Pitch** (dominant frequency) | Sets his **color**. Bass-heavy → red end of the rainbow; bright/treble → violet end. Spectral centroid over 80–5000 Hz, log-scale into the [0°, 300°] hue range. |
| **Volume / intensity** | Sets the **height of his jiggle** *and* the **amount he stretches/squashes**. Quiet → barely-there bob with no shape change. Loud → full launch + dramatic stretch on the way up + squash on landing. |
| **BPM** | Sets the **speed of his jiggle** — one bounce per beat. Detected via spectral-flux ODF + autocorrelation with comb filter, Gaussian prior, confidence gating, median smoothing, outlier rejection, and tempo octave folding into 80–160 BPM. |
| **High BPM** | Above ~105 BPM, Growly adds a **horizontal sway** to his bounce path that grows with tempo and intensity. One full left-right-left over four beats. |
| **No music / silence** | Defaults to a **slow micro-jiggle** (~35 BPM, sub-pixel lift, NEUTRAL frame only) so he's never completely still. |
| **Click / tap** | Hops toward the click point in a series of arc'd jumps (independent of the audio loop). Mobile-friendly: works on touch. |

The first tap also grants mic permission. Without mic access, Growly skips audio reactivity and stays at the silent-default behavior.

## Tuning

All tunable parameters live in `config.js` (window.GROWLY_CONFIG). Edit, refresh the page — both files share a cache-buster timestamp so changes show up immediately.

Notable knobs:

- `bounceMinAmpPx` / `bounceMaxAmpPx` — vertical bounce range
- `intensityToFlatten` / `intensityToMidStretch` / `intensityToFullStretch` — thresholds where each level of deformation kicks in
- `swayBpmThreshold` / `swayMaxAmpPx` / `swayBeatsPerCycle` — horizontal sway behavior
- `bpmConfidenceThreshold` — how dominant the autocorrelation peak must be before we commit a new tempo
- `bpmOutlierTolerance` / `bpmOutlierConfirmations` — guards against single-bar octave-error spikes
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
