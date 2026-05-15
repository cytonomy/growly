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
  fftSize: 2048,                // FFT bin count

  // ----- Pitch → hue (dominant frequency drives rainbow position) -----
  pitchMinHz: 80,               // bottom of musical range used for centroid
  pitchMaxHz: 5000,             // top of musical range
  pitchHueRange: 300,           // pitch maps log-scale to [0°, this°] hue
  pitchSmoothing: 0.08,         // smoother to avoid color flicker
  hueFallback: 220,             // hue (deg) when there's no audio
  intensityThreshold: 0.02,     // below this RMS, treat as silence

  // ----- BPM via spectral-flux autocorrelation -----
  // ODF (onset detection function) = spectral flux over this freq range.
  odfFreqMinHz: 60,
  odfFreqMaxHz: 4000,
  odfBufferSize: 512,           // ~8.5 sec of recent onset strength at 60 Hz analysis
  bpmEstimateIntervalMs: 400,   // re-run autocorrelation this often
  bpmHistorySize: 24,           // median of last N confident estimates → detectedBpm
  bpmPriorCenter: 110,          // Gaussian prior — peaks near here are preferred
  bpmPriorStd: 70,              // std of the prior; smaller = sharper bias
  // Estimates are only added to the history when the autocorrelation has a
  // clearly dominant peak. Below threshold, the buffer keeps its previous
  // value (or sits at fallback). This stops weak / beat-less sections from
  // flipping the lock onto noise.
  bpmConfidenceThreshold: 3.5,
  bpmIdleResetMs: 4000,         // reset to fallback after this many ms with no confident estimate
  bpmFallback: 75,
  bpmMin: 50,
  bpmMax: 180,
  // Tempo "octave" folding — any estimate outside this range is halved/doubled
  // until it lands in range. Catches residual octave errors after scoring.
  bpmOctaveMin: 80,
  bpmOctaveMax: 160,

  // ----- Bounce vertical amplitude (intensity-driven) -----
  bounceMinAmpPx: 1,            // sprite-pixels of lift when silent
  bounceMaxAmpPx: 14,           // sprite-pixels of lift at peak intensity

  // ----- Debug overlay -----
  showHud: true,                // top-left readout: detected BPM, pitch hue, intensity, fps

  // ----- Palette (HSL per palette index) -----
  bodySaturation: 78,    bodyLightness: 55,
  rimSaturation: 92,     rimLightness: 80,
  shadowSaturation: 75,  shadowLightness: 35,
  eyeSaturation: 55,     eyeLightness: 12,
};
