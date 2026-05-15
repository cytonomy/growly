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
  micGain: 95,                    // sensitivity bump — typical room-listening volume now pegs near 100% so bounce amplitude reaches the configured max on loud music
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
  // Bass naturally dominates the spectrum, so left at unity. Mid and high are
  // boosted to give vocals/guitars/cymbals a fighting chance against the kick.
  bandBassGain: 1.0,
  bandMidGain:  1.8,
  bandHighGain: 4.0,
  bandHighRedShare:  0.9,         // how much high band leaks into R (1 = full pink, 0 = pure blue)
  bandHighBlueShare: 0.9,         // how much high band leaks into B
  ambientRgb: [0.15, 0.35, 1.0],  // shown when smoothedLevel < intensityThreshold (light blue)
  pitchSmoothing: 0.06,           // EMA on the RGB color — lower = slower dwell
  hueFallback: 220,               // hue used only when the smoothed RGB is gray (saturation ≈ 0)
  intensityThreshold: 0.15,       // gates pitch/color: below this, color falls back to ambient blue (lowered from 0.30 — typical music levels often dipped below 30%, so color was stuck on ambient blue)
  silenceResetIntensity: 0.08,    // gates BPM silence-reset: only count the room as silent for BPM purposes when smoothedLevel is REALLY low (quiet song sections should NOT trigger reset)

  // ----- BPM detection -----
  // Spectral-flux ODF + autocorrelation with comb filter + Gaussian prior
  // + confidence gating + median smoothing + outlier rejection + tempo
  // octave folding into [bpmOctaveMin, bpmOctaveMax].
  odfFreqMinHz: 60,
  odfFreqMaxHz: 4000,
  odfBufferSize: 256,             // max ~4.3 sec of recent onsets at 60 Hz
  odfWarmupFrames: 32,            // start estimating once ~0.5s of onset data is buffered (analysis uses whatever slice is populated, not the full buffer)
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
  swayMaxAmpPx: 24,               // peak side-to-side travel in sprite-pixels (half-spread between landing spots)

  // ----- Idle eye animation -----
  eyeShiftMaxPx: 1,               // max horizontal pupil offset in sprite-pixels (eyes are 2 wide; ±1 looks natural)
  eyeShiftPeriodMs: 2800,         // one full L → R → L cycle every this many ms

  // ----- Debug overlay -----
  showHud: true,

  // ----- Palette (HSL per palette index) -----
  bodySaturation: 78,    bodyLightness: 55,
  rimSaturation: 92,     rimLightness: 80,
  shadowSaturation: 75,  shadowLightness: 35,
  eyeSaturation: 55,     eyeLightness: 12,
};
