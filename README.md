# Growly

A browser-based audio-reactive game.

Live: <https://cytonomy.github.io/growly/>

## How Growly reacts to sound

| Audio feature | What Growly does |
|---|---|
| **Spectral content** (3-band energy mix) | Sets his **color** by mixing band energies in RGB: bass band → **red**, mid band → **green**, high band → **pink/magenta**. Combinations naturally render the way you'd expect — bass+mid = **yellow**, mid+high = cyan-ish, full-spectrum = near-white. Silent or sub-threshold input falls back to **ambient blue**. Mixing in RGB (not on the hue wheel) means transitions between dominant bands pass through gray instead of detouring through unwanted hues. Bands and their RGB contributions are configurable in `bandBassHz` / `bandMidHz` / `bandHighHz` / `bandHigh*Share`. |
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
- `bandBassHz` / `bandMidHz` / `bandHighHz` — frequency ranges (Hz) for each of the three band-energy buckets that drive color
- `bandBassGain` / `bandMidGain` / `bandHighGain` — per-band weight multipliers. The natural music spectrum rolls off at high frequency so the high band reads weaker per bin; bump `bandHighGain` to make sparkly/cymbal moments register stronger.
- `bandHighRedShare` / `bandHighBlueShare` — how much of the high-band energy leaks into R vs B; together they shape what "pure highs" look like (default both 0.9 = pink-magenta)
- `ambientRgb` — `[r, g, b]` shown when `smoothedLevel` is below `intensityThreshold` (default light blue)
- `pitchSmoothing` — EMA on the RGB color (lower = slower, more dramatic dwell)
- `intensityThreshold` — below this smoothed level, color falls back to ambient AND silence-reset begins counting toward dropping the BPM lock
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
