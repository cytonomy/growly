// Growly — all tunable parameters in one place. Edit and refresh the page.
window.GROWLY_CONFIG = {
  // ----- Render -----
  renderScale: 4,
  bgSeed: 1337,
  showHud: true,
  debugConsole: false,            // gate console.log/warn diagnostics

  // ----- Hop (click / tap to move) -----
  hopDistancePx: 48,
  hopDurationMs: 400,
  hopPeakPx: 14,
  arrivePx: 2,

  // ----- Mic input -----
  micGain: 32,
  micSmoothing: 0.022,            // ~1.5s ramp on intensity
  levelDisplaySmoothing: 0.04,    // slow EMA for HUD level% so it doesn't flicker

  // ----- Spectral bands → RGB color -----
  // Each band drives one RGB channel; bands are MIXED in RGB so transitions
  // pass through gray rather than unwanted hues. bass+mid = yellow, mid+high
  // = cyan, all = near-white, silence = ambientRgb.
  bandBassHz:  [60,   250],       // kick / sub-bass / low strings → red
  bandMidHz:   [250,  1000],      // vocals / guitars → green
  bandHighHz:  [1000, 6000],      // cymbals / hats / air → pink-magenta
  // Gains compensate for natural HF rolloff so vocals/cymbals can drive
  // color against the kick instead of always being dwarfed.
  bandBassGain: 1.0,
  bandMidGain:  1.8,
  bandHighGain: 4.0,
  bandHighRedShare:  0.9,
  bandHighBlueShare: 0.9,
  ambientRgb: [0.15, 0.35, 1.0],  // color when no music is detected
  pitchSmoothing: 0.18,           // EMA on RGB — ~2s drift to ambient when music stops
  hueFallback: 220,               // hue used only when smoothed RGB is gray
  intensityThreshold: 0.18,       // level floor for music-driven color (combined with rhythm gate below)

  // ----- Music-vs-noise detection -----
  // The rhythm gate distinguishes music (spiky onsets, high std/mean on the
  // ODF) from broadband room noise (continuously-varying spectrum, low
  // std/mean). Floor/ceiling are calibrated for live mic→speaker→mic
  // capture, where music sits at CV ≈ 0.20-0.35 vs noise at ≈ 0.05-0.15.
  //
  // Gating layout (intentional asymmetry):
  //   Bouncing       — ungated; any audio moves Growly
  //   Color update   — needs both intensityThreshold AND rhythmGateForColor
  //   BPM detection  — needs rhythmGateForColor; level is misleading on slow tracks
  rhythmCvFloor: 0.15,
  rhythmCvCeiling: 0.40,
  rhythmPresenceSmoothing: 0.04,          // attack: ~quick on new rhythm
  rhythmPresenceReleaseSmoothing: 0.008,  // release: ~10-15s tail bridges sustained notes
  rhythmGateForColor: 0.05,               // presence threshold for music color & BPM lock

  // ----- BPM detection -----
  // Spectral-flux ODF → autocorrelation w/ comb filter → Gaussian prior
  // → confidence gate → median smoothing → outlier rejection → octave fold.
  fftSize: 2048,
  odfFreqMinHz: 60,
  odfFreqMaxHz: 4000,
  odfBufferSize: 256,             // ~4.3s of onsets at 60 Hz
  odfWarmupFrames: 32,            // first estimate at ~0.5s
  bpmEstimateIntervalMs: 400,
  bpmHistorySize: 24,
  bpmPriorCenter: 95,             // pop+ballad centroid
  bpmPriorStd: 35,                // narrow enough that 2× octave needs ~4.6× stronger comb
  bpmConfidenceThreshold: 2.5,    // ballads commit at 1.5-3.0; 3.2 was too strict
  bpmFallback: 35,                // "no music" idle tempo
  bpmMin: 50,
  bpmMax: 180,
  bpmOctaveMin: 80,               // fold-to-here on under
  bpmOctaveMax: 160,              // fold-to-half on over
  bpmOutlierTolerance: 0.15,      // |estimate - median| / median > this → suspicious
  bpmOutlierConfirmations: 7,     // ~3s of clustered outliers to flush a stuck lock
  bpmOutlierStabilityStdMax: 14,  // …and they must agree (std < this BPM)
  silenceResetMs: 4000,           // 4s of rhythmPresence below gate → reset BPM

  // ----- Bounce / squash / sway -----
  bounceMinAmpPx: 0.5,            // tiny jiggle when silent
  bounceMaxAmpPx: 32,             // dramatic on loud music
  // Sprite-frame selection by intensity:
  //   silent:                   mid-stretch only (gentle breathing)
  //   below intensityToFullStretch:  full stretch on apex, no squash
  //   above intensityToFullSquash:   full NEUTRAL → STRETCH → SQUASH cycle
  intensityToFullStretch: 0.4,
  intensityToFullSquash: 0.7,
  swayBpmThreshold: 105,          // L↔R sway begins above this BPM
  swayMaxAmpPx: 24,               // half-spread between landing spots

  // ----- Eye animation -----
  eyeIdlePeriodMs: 2800,          // sin wander period when no face tracked
  eyeHires: 3,                    // fine pixels per body cell inside the eye region (template is hard-fixed for 3)

  // ----- Face tracking — face-position mode -----
  faceInferenceMinGapMs: 80,      // ~12 Hz cap on face-mesh inference
  eyeTrackFaceSmoothing: 0.12,    // EMA on tracked face position
  eyeTrackFaceDeadzone: 0.25,     // face-from-center distance (normalized) before eyes hit ±1

  // ----- Face tracking — gaze (iris) mode -----
  eyeTrackGazeGain: 4.0,          // amplify iris-in-socket offset (typ. 30-40% of half-width → eyeT ±1)
  eyeTrackGazeDeadzone: 0.06,     // kill landmark jitter near zero
  eyeTrackGazeSmoothing: 0.2,     // higher than face mode — gaze is jitterier

  // ----- Palette (HSL per palette index) -----
  bodySaturation: 78,    bodyLightness: 55,    // palette[1] — body
  rimSaturation: 92,     rimLightness: 80,     // palette[2] — rim
  shadowSaturation: 75,  shadowLightness: 35,  // palette[3] — shadow
  outlineSaturation: 30, outlineLightness: 6,  // palette[4] — eyelid + pupil
  scleraSaturation: 18,  scleraLightness: 92,  // palette[5] — eye whites
  // palette[7] (highlight) is derived from body sat/lightness inline.
};
