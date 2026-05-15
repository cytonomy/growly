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
  micGain: 30,                    // calibrated so typical room-listening volume reaches ~80% intensity
  micSmoothing: 0.08,             // EMA factor on intensity used by bounce/sway (fast)
  levelDisplaySmoothing: 0.04,    // EMA factor on the HUD level% readout (slow — keeps it from flickering)
  fftSize: 2048,

  // ----- Spectral bands → RGB color -----
  // Each band's energy contributes to a base color; the bands are MIXED in
  // RGB so transitions between dominant bands pass through gray, not through
  // unwanted hues. Bass adds R; mid adds G; high adds R+B (= magenta/pink).
  // bass+mid = yellow, mid+high = cyan-ish, all-bands = near-white, silence
  // = ambient blue.
  bandBassHz:  [60,   250],       // kick / sub-bass / low strings → red
  bandMidHz:   [250,  1000],      // vocals (fundamentals) / guitars → green
  bandHighHz:  [1000, 6000],      // upper-vocal harmonics / cymbals / hats / air → pink-magenta
  // Per-band gain compensates for the natural high-frequency rolloff of music —
  // bass band routinely averages 2-3× more per-bin energy than the high band,
  // so boosting high lets bright vocals/cymbals actually drive the color toward
  // pink instead of always being dwarfed by bass.
  bandBassGain: 1.0,
  bandMidGain:  1.0,
  bandHighGain: 2.5,
  bandHighRedShare:  0.9,         // how much high band leaks into R (1 = full pink, 0 = pure blue)
  bandHighBlueShare: 0.9,         // how much high band leaks into B
  ambientRgb: [0.15, 0.35, 1.0],  // shown when smoothedLevel < intensityThreshold (light blue)
  pitchSmoothing: 0.06,           // EMA on the RGB color — lower = slower dwell
  hueFallback: 220,               // hue used only when the smoothed RGB is gray (saturation ≈ 0)
  intensityThreshold: 0.30,       // bumped from 0.02 — with micGain=30 the silent room reads ~15-25%; this gates pitch detection and arms the silence-reset timer for BPM

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
  bpmOutlierConfirmations: 15,         // ~6s of contiguous outliers required to flush — was 30, but with the higher intensityThreshold the silence-reset between songs now releases the lock cleanly, so we don't need the longer guard
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
  // Each bounce arcs from one landing side to the other, alternating L↔R per
  // bounce so Growly stays roughly centered. swayMaxAmpPx is the half-width
  // of the L–R landing spread.
  swayBpmThreshold: 105,          // sway begins above this BPM
  swayMaxAmpPx: 6,                // peak side-to-side travel in sprite-pixels (half-spread)

  // ----- Debug overlay -----
  showHud: true,

  // ----- Palette (HSL per palette index) -----
  bodySaturation: 78,    bodyLightness: 55,
  rimSaturation: 92,     rimLightness: 80,
  shadowSaturation: 75,  shadowLightness: 35,
  eyeSaturation: 55,     eyeLightness: 12,
};
