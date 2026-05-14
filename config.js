// Growly — all tunable parameters in one place. Edit and refresh the page.
window.GROWLY_CONFIG = {
  // ----- Render -----
  renderScale: 4,
  bgSeed: 1337,

  // ----- Hop (click / tap to move) -----
  hopDistancePx: 48,
  hopDurationMs: 400,
  hopPeakPx: 14,
  arrivePx: 2,

  // ----- Mic input -----
  micGain: 12,                  // raw mic RMS is small (0.02–0.15); scale up before clamp
  micSmoothing: 0.08,           // intensity EMA factor; lower = smoother
  fftSize: 2048,                // FFT bin count — bigger = better frequency resolution

  // ----- Pitch → hue (dominant frequency in the music drives the rainbow position) -----
  pitchMinHz: 80,               // bottom of musical range
  pitchMaxHz: 5000,             // top of musical range
  pitchHueRange: 300,           // pitch maps log-scale to [0°, this°] hue
  pitchSmoothing: 0.08,         // smoother to avoid color flicker
  hueFallback: 220,             // hue (degrees) when there's no audio
  intensityThreshold: 0.02,     // below this RMS, treat as silence

  // ----- BPM → bounce period (one bounce per beat) -----
  // Beat detection: bass-band onset peaks above local average.
  beatBandMinHz: 60,            // bass band low edge
  beatBandMaxHz: 200,           // bass band high edge
  beatThresholdRatio: 1.45,     // current bass energy must exceed avg * this to register
  beatMinIntervalMs: 250,       // ignore beats faster than this (~240 BPM ceiling)
  beatTimeoutMs: 3000,          // reset to fallback after this many ms with no beats
  bpmFallback: 75,              // default BPM when no music
  bpmMin: 50,
  bpmMax: 180,

  // ----- Bounce vertical amplitude (intensity drives deformation magnitude) -----
  bounceMinAmpPx: 1,            // sprite-pixels of lift when silent
  bounceMaxAmpPx: 14,           // sprite-pixels of lift at peak intensity

  // ----- Palette (HSL components per palette index) -----
  bodySaturation: 78,    bodyLightness: 55,    // idx 1 — main body
  rimSaturation: 92,     rimLightness: 80,     // idx 2 — bright outline
  shadowSaturation: 75,  shadowLightness: 35,  // idx 3 — interior shadow band
  eyeSaturation: 55,     eyeLightness: 12,     // idx 6 — eye dot
};
