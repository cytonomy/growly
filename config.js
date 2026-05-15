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
  micGain: 12,
  micSmoothing: 0.08,
  fftSize: 2048,

  // ----- Pitch → hue (dominant frequency drives rainbow position) -----
  pitchMinHz: 80,
  pitchMaxHz: 5000,
  pitchHueRange: 300,
  pitchSmoothing: 0.08,
  hueFallback: 220,
  intensityThreshold: 0.02,

  // ----- BPM detection -----
  // Spectral-flux ODF + autocorrelation with comb filter + Gaussian prior
  // + confidence gating + median smoothing + outlier rejection + tempo
  // octave folding into [bpmOctaveMin, bpmOctaveMax].
  odfFreqMinHz: 60,
  odfFreqMaxHz: 4000,
  odfBufferSize: 512,             // ~8.5 sec of recent onsets at 60 Hz
  bpmEstimateIntervalMs: 400,
  bpmHistorySize: 24,
  bpmPriorCenter: 110,
  bpmPriorStd: 70,
  bpmConfidenceThreshold: 3.2,    // first-pass: only commit clearly dominant peaks (raised to filter mic-noise-driven low-conf estimates)
  bpmFallback: 35,                // "no music" slow idle tempo
  bpmMin: 50,
  bpmMax: 180,
  bpmOctaveMin: 80,
  bpmOctaveMax: 160,
  // Outlier rejection: a new confident estimate that's > this fraction away
  // from the current median is treated as suspicious. It must repeat
  // bpmOutlierConfirmations times consecutively before it can flush the
  // existing lock — protects against a single bridge / bar where the
  // algorithm latches onto a syncopated harmonic.
  bpmOutlierTolerance: 0.15,
  bpmOutlierConfirmations: 30,         // 12s of contiguous outliers required to flush — slow swing songs (At Last) produce 6s+ runs at wrong harmonics on noisy mic
  bpmOutlierStabilityStdMax: 8,        // …and they must agree (std < this BPM) — random noise spikes vary too much to pass
  // Silence-based reset. If the smoothed mic level stays below
  // intensityThreshold for this long, we drop the lock and revert to
  // bpmFallback. This is the only thing that resets the tempo — silence
  // BETWEEN confident estimates (e.g., a quiet bridge in a song) doesn't
  // count, only actual quiet does.
  silenceResetMs: 15000,

  // ----- Bounce vertical amplitude (intensity-driven) -----
  bounceMinAmpPx: 0.5,            // tiny when silent — barely a jiggle
  bounceMaxAmpPx: 32,             // dramatic launch on loud music

  // ----- Bounce deformation (intensity-driven) -----
  // Selects which sprite frames cycle through during a bounce, so the
  // *amount* of stretch/squash also scales with how loud the music is.
  // Even silent: mid-stretch on the apex (a gentle breathing animation).
  // Below intensityToFullStretch: full stretch on the apex, no squash.
  // Above intensityToFullSquash: full NEUTRAL → STRETCH → NEUTRAL → SQUASH.
  intensityToFullStretch: 0.4,
  intensityToFullSquash: 0.7,

  // ----- Horizontal sway (kicks in when the music gets fast) -----
  swayBpmThreshold: 105,          // sway begins above this BPM
  swayMaxAmpPx: 6,                // peak side-to-side travel in sprite-pixels
  swayBeatsPerCycle: 4,           // one full left-right-left over this many beats

  // ----- Debug overlay -----
  showHud: true,

  // ----- Palette (HSL per palette index) -----
  bodySaturation: 78,    bodyLightness: 55,
  rimSaturation: 92,     rimLightness: 80,
  shadowSaturation: 75,  shadowLightness: 35,
  eyeSaturation: 55,     eyeLightness: 12,
};
