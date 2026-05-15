// Growly — pixel-art slime. Click/tap to hop.
// Audio reactivity:
//   - dominant pitch (spectral centroid)  → hue on the rainbow
//   - detected BPM (bass-band onsets)     → bounce period (one bounce per beat)
//   - intensity (RMS)                     → bounce amplitude (vertical lift)
// All knobs live in config.js (window.GROWLY_CONFIG).

const cfg = window.GROWLY_CONFIG;

const SPRITE_W = 24;
const SPRITE_H = 24;

// 3-band energy → RGB color. Each frequency band contributes a base color and
// the bands are *mixed in RGB* so the path between dominant bands (e.g.
// mid→high) crosses through gray, not through unwanted hues like the red zone
// that a hue-wheel lerp would inevitably traverse. bandBass → red,
// bandMid → green, bandHigh → magenta (R+B). Bass+mid in equal proportion
// renders as yellow (R+G), mid+high as cyan-ish, and all three together as
// near-white. Silent / sub-threshold input falls through to cfg.ambientRgb.
function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d < 0.0005) return { h: cfg.hueFallback, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r)      h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else                h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

// 0 transparent, 1 base, 2 rim, 3 shadow, 6 eye pupil, 7 eye highlight.
// Saturations + lightnesses per role come from cfg; hue comes from the
// smoothed RGB color and is converted via rgbToHsl. The role saturation is
// scaled by the RGB-derived saturation so during a transition through gray
// the sprite briefly desaturates instead of staying at a stuck hue.
function paletteForRgb(r, g, b) {
  const { h, s } = rgbToHsl(r, g, b);
  const hi = Math.round(h);
  const k = Math.max(0, Math.min(1, s));   // role-sat multiplier
  return {
    1: color(`hsl(${hi}, ${Math.round(cfg.bodySaturation * k)}%, ${cfg.bodyLightness}%)`),
    2: color(`hsl(${hi}, ${Math.round(cfg.rimSaturation * k)}%, ${cfg.rimLightness}%)`),
    3: color(`hsl(${hi}, ${Math.round(cfg.shadowSaturation * k)}%, ${cfg.shadowLightness}%)`),
    6: color(`hsl(${hi}, ${Math.round(cfg.eyeSaturation * k)}%, ${cfg.eyeLightness}%)`),
    7: color(`hsl(${hi}, ${Math.round(cfg.bodySaturation * k * 0.4)}%, 92%)`),  // near-white tinted highlight
  };
}

// Round-dome blob with 3×2 pupil blocks (color 6). The highlight (color 7) is
// NOT baked into the sprite — sketch.js paints it at runtime so the white can
// slide between the three pupil columns to give Growly a left ↔ center ↔ right
// gaze. Bottom half is the darker shadow (3). Generated from
// test_tracks/gen_sprite.py.
const F_NEUTRAL = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000002222222200000000",
  "000000221111111122000000",
  "000002111111111111200000",
  "000021111111111111120000",
  "000021116661111166620000",
  "000211116661111166612000",
  "000211116661111166612000",
  "000211111111111111112000",
  "000211111111111111112000",
  "000021111111111111120000",
  "000021111111111111120000",
  "000002333333333333200000",
  "000000223333333322000000",
  "000000002222222200000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
];

const F_MID_STRETCH = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000222222000000000",
  "000000002111111200000000",
  "000000021111111120000000",
  "000000211111111112000000",
  "000002111111111111200000",
  "000002111111111111200000",
  "000021116661111666120000",
  "000021116661111666120000",
  "000021116661111666120000",
  "000021111111111111120000",
  "000021111111111111120000",
  "000002111111111111200000",
  "000002111111111111200000",
  "000000233333333332000000",
  "000000023333333320000000",
  "000000002333333200000000",
  "000000000222222000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
];

const F_STRETCH = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000222222000000000",
  "000000002111111200000000",
  "000000021111111120000000",
  "000000211111111112000000",
  "000000211111111112000000",
  "000000211111111112000000",
  "000002116661116661200000",
  "000002116661116661200000",
  "000002116661116661200000",
  "000002111111111111200000",
  "000002111111111111200000",
  "000002111111111111200000",
  "000000211111111112000000",
  "000000211111111112000000",
  "000000233333333332000000",
  "000000023333333320000000",
  "000000002333333200000000",
  "000000000222222000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
];

const F_SQUASH = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000222222222222000000",
  "000002166611111166200000",
  "000021166611111166620000",
  "000211166611111166612000",
  "002111111111111111111200",
  "002111111111111111111200",
  "000211111111111111112000",
  "000023333333333333320000",
  "000002333333333333200000",
  "000000222222222222000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
];

// Animation cycle keyed to bouncePhase quarters. The lift sine is positive
// over phase 0→0.5 (airborne) and zero over 0.5→1.0 (on the ground), so:
//   q0 = ascending  → STRETCH (Growly elongates the moment he launches)
//   q1 = descending → STRETCH (still in the air, still elongated)
//   q2 = just landed → SQUASH (compressed from impact)
//   q3 = on ground   → NEUTRAL (recovered, ready for next takeoff)
const IDLE_FRAMES = [F_STRETCH, F_STRETCH, F_SQUASH, F_NEUTRAL];

const slime = {
  x: 0, y: 0,
  targetX: 0, targetY: 0,
  hopFromX: 0, hopFromY: 0,
  hopToX: 0, hopToY: 0,
  hopStartMs: 0,
  isHopping: false,
};

let bgBuffer = null;
let startMs = 0;
let lastDrawMs = 0;
let bouncePhase = 0;          // 0..1, integrates over time at the current bounce period
let lastBouncePhase = 0;      // detect bounce wrap-around to flip lateral landing side
let swayLandSide = 1;         // alternates ±1 each landing — Growly arcs L→R→L→R, never drifting
let smoothedR = 0;            // smoothed RGB color from 3-band energy mix
let smoothedG = 0;
let smoothedB = 0;
let detectedBpm = 0;          // smoothed tempo from autocorrelation
let tempoEstimates = [];      // rolling buffer of recent raw BPM estimates
let outlierCandidates = [];   // recent confident estimates that are far from the median
let prevSpectrum = null;      // Uint8Array of last frame's bin magnitudes (for ODF delta)
let odfBuffer = null;         // Float32Array ring buffer of onset-strength samples
let odfHead = 0;              // next write index in odfBuffer
let odfSampleCount = 0;       // valid samples in buffer (capped at length)
let lastAnalysisMs = 0;       // last call to analyzeSpectrum
let avgAnalysisDt = 16.67;    // EMA of analysis frame interval (ms)
let lastTempoEstMs = 0;       // last autocorrelation run
let lastTempoUpdateMs = 0;    // last time a real tempo was detected
let silenceStartMs = 0;       // when the room first went quiet (0 = not silent)
let audioCtx = null;
let micStream = null;
let micAnalyser = null;
let micBuffer = null;         // time-domain (RMS)
let freqBuf = null;           // frequency-domain (centroid + ODF)
let micActive = false;
let smoothedLevel = 0;        // intensity (drives bounce/sway/etc — fast EMA)
let displayLevel = 0;         // intensity for the HUD readout — slower EMA so the % doesn't flicker

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();
  noStroke();
  startMs = millis();
  lastDrawMs = startMs;
  smoothedR = cfg.ambientRgb[0];
  smoothedG = cfg.ambientRgb[1];
  smoothedB = cfg.ambientRgb[2];
  detectedBpm = cfg.bpmFallback;
  tempoEstimates = [];
  outlierCandidates = [];
  silenceStartMs = 0;
  lastBouncePhase = 0;
  swayLandSide = 1;
  odfBuffer = new Float32Array(cfg.odfBufferSize);
  odfHead = 0;
  odfSampleCount = 0;
  prevSpectrum = null;
  lastAnalysisMs = 0;
  lastTempoEstMs = 0;
  lastTempoUpdateMs = 0;
  slime.x = width / 2;
  slime.y = height / 2;
  slime.targetX = slime.x;
  slime.targetY = slime.y;
  rebuildBackground();
}

function draw() {
  image(bgBuffer, 0, 0);

  const now = millis();
  // Clamp dt — first frame after setup or backgrounded tab can otherwise produce
  // a multi-second delta that lurches hue/bounce phase forward.
  const dt = Math.min(100, now - lastDrawMs);
  lastDrawMs = now;

  // Intensity: smooth raw mic RMS into [0..1].
  const rawLevel = readMicRms();
  const targetLevel = Math.min(1, rawLevel * cfg.micGain);
  smoothedLevel += (targetLevel - smoothedLevel) * cfg.micSmoothing;
  displayLevel += (smoothedLevel - displayLevel) * cfg.levelDisplaySmoothing;
  const intensity = smoothedLevel;

  // Pitch + beat analysis from FFT (updates smoothedR/G/B + detectedBpm).
  analyzeSpectrum(now);

  const palette = paletteForRgb(smoothedR, smoothedG, smoothedB);

  updateSlime(now);

  let renderX = slime.x;
  let renderY = slime.y;
  let frame;

  if (slime.isHopping) {
    const t = (now - slime.hopStartMs) / cfg.hopDurationMs;
    const lift = Math.sin(t * Math.PI) * cfg.hopPeakPx * cfg.renderScale;
    renderX = lerp(slime.hopFromX, slime.hopToX, t);
    renderY = lerp(slime.hopFromY, slime.hopToY, t) - lift;
    frame = hopFrameAt(t);
  } else {
    // Idle bounce.
    // BPM → period (one bounce per beat). When silent, BPM is bpmFallback so
    // Growly does a slow micro-jiggle. Defensive: clamp BPM so a bad
    // detection can't push period to 0 / Infinity / NaN and freeze the phase.
    let bpm = detectedBpm;
    if (!isFinite(bpm) || bpm < 1) bpm = cfg.bpmFallback;
    const period = 60000 / bpm;
    bouncePhase = (bouncePhase + dt / period) % 1;
    if (!isFinite(bouncePhase)) bouncePhase = 0;
    // Detect bounce wrap (landing) → flip lateral side so each new bounce arcs the other way.
    if (bouncePhase < lastBouncePhase) swayLandSide = -swayLandSide;
    lastBouncePhase = bouncePhase;
    // Intensity → bounce amplitude AND deformation amount.
    const ampPx = lerp(cfg.bounceMinAmpPx, cfg.bounceMaxAmpPx, intensity);
    const quarter = Math.floor(bouncePhase * IDLE_FRAMES.length) % IDLE_FRAMES.length;
    frame = frameForIntensity(quarter, intensity);
    // Vertical lift: one positive sine half-arch over the first half of the cycle.
    const lift = Math.max(0, Math.sin(bouncePhase * Math.PI * 2)) * ampPx * cfg.renderScale;
    renderY = slime.y - lift;
    // Horizontal sway when the music is fast — each bounce arcs from the
    // previous landing side to the opposite side, so Growly hops L → R → L
    // around his anchor instead of sliding sideways. Net drift is zero.
    if (bpm >= cfg.swayBpmThreshold) {
      const swayBlend = Math.min(1,
        (bpm - cfg.swayBpmThreshold) / Math.max(1, cfg.bpmOctaveMax - cfg.swayBpmThreshold));
      const swayAmp = swayBlend * cfg.swayMaxAmpPx * intensity;
      // Lift occupies the first half of bouncePhase (sin(2π·phase) > 0); the
      // second half Growly is on the ground. Drive the lateral arc only during
      // the airborne fraction so he LANDS at the new side and then sits still
      // until the next takeoff.
      const airborne = Math.min(1, bouncePhase * 2);
      const swayX = lerp(-swayLandSide, swayLandSide, airborne) * swayAmp;
      renderX = slime.x + swayX * cfg.renderScale;
    }
  }
  // Final guard: never let render coordinates escape the canvas via accumulated
  // drift, NaN, or Infinity. Worst case Growly snaps to centre, but he's still
  // visible — beats disappearing.
  if (!isFinite(renderX) || renderX < -SPRITE_W * cfg.renderScale || renderX > width + SPRITE_W * cfg.renderScale) renderX = width / 2;
  if (!isFinite(renderY) || renderY < -SPRITE_H * cfg.renderScale || renderY > height + SPRITE_H * cfg.renderScale) renderY = height / 2;

  // Idle eye-shift: sinusoidal L↔R glance every cfg.eyeShiftPeriodMs.
  // Quantized to integer sprite-pixels so the eyes pop discretely between
  // -1 / 0 / +1 instead of sliding sub-pixel.
  const eyePhase = (now / cfg.eyeShiftPeriodMs) * Math.PI * 2;
  const eyeShift = Math.round(Math.sin(eyePhase) * cfg.eyeShiftMaxPx);
  drawSlime(renderX, renderY, frame, palette, eyeShift);

  if (faceTrackingActive) drawFaceWireframe();

  if (cfg.showHud) drawHud();
}

function drawHud() {
  const lines = [
    `BPM   ${micActive ? Math.round(detectedBpm) : '—'}`,
    `hue   ${Math.round(rgbToHsl(smoothedR, smoothedG, smoothedB).h)}°`,
    `level ${(displayLevel * 100).toFixed(0)}%`,
    `odf   ${odfSampleCount}/${cfg.odfBufferSize}`,
    `fps   ${(1000 / avgAnalysisDt).toFixed(0)}`,
  ];
  push();
  textFont('monospace');
  textSize(14);
  textAlign(LEFT, TOP);
  // Backdrop
  fill(0, 0, 0, 160);
  rect(8, 8, 130, 18 * lines.length + 10);
  fill(255);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], 14, 14 + i * 18);
  }
  pop();
}

// Pitch (spectral centroid → hue) and BPM (ODF + autocorrelation → tempo).
function analyzeSpectrum(now) {
  if (!micAnalyser || !audioCtx) return;
  const binCount = micAnalyser.frequencyBinCount;
  if (!freqBuf || freqBuf.length !== binCount) {
    freqBuf = new Uint8Array(binCount);
  }
  micAnalyser.getByteFrequencyData(freqBuf);

  const sampleRate = audioCtx.sampleRate;
  const fftSize = micAnalyser.fftSize;
  const binHz = sampleRate / fftSize;

  // ---------- Spectral bands → RGB color ----------
  // bandBass → red, bandMid → green, bandHigh → magenta (R+B).
  // Mixing in RGB lets bass+mid render as yellow, mid+high as gray-cyan,
  // all-bands as near-white — and importantly avoids hue-wheel detours
  // through red/blue during transitions. Below intensityThreshold the
  // mic is treated as silent and the ambient color is used.
  function bandEnergy(loHz, hiHz) {
    const lo = Math.max(1, Math.ceil(loHz / binHz));
    const hi = Math.min(binCount - 1, Math.floor(hiHz / binHz));
    let e = 0;
    for (let i = lo; i <= hi; i++) e += freqBuf[i];
    return e / Math.max(1, hi - lo + 1);
  }
  let targetR = cfg.ambientRgb[0];
  let targetG = cfg.ambientRgb[1];
  let targetB = cfg.ambientRgb[2];
  if (smoothedLevel >= cfg.intensityThreshold) {
    const eB = bandEnergy(cfg.bandBassHz[0], cfg.bandBassHz[1]) * cfg.bandBassGain;
    const eM = bandEnergy(cfg.bandMidHz[0], cfg.bandMidHz[1])   * cfg.bandMidGain;
    const eH = bandEnergy(cfg.bandHighHz[0], cfg.bandHighHz[1]) * cfg.bandHighGain;
    const total = eB + eM + eH;
    if (total > 0.0001) {
      const wB = eB / total;
      const wM = eM / total;
      const wH = eH / total;
      // Bass adds red; mid adds green; high adds R+B (= magenta/pink).
      let R = wB + wH * cfg.bandHighRedShare;
      let G = wM;
      let B = wH * cfg.bandHighBlueShare;
      // Normalize so the dominant component is 1 — keeps colors saturated
      // rather than dim when bands are spread.
      const m = Math.max(R, G, B);
      if (m > 0) { R /= m; G /= m; B /= m; }
      targetR = R; targetG = G; targetB = B;
    }
  }
  smoothedR += (targetR - smoothedR) * cfg.pitchSmoothing;
  smoothedG += (targetG - smoothedG) * cfg.pitchSmoothing;
  smoothedB += (targetB - smoothedB) * cfg.pitchSmoothing;

  // ---------- ODF (spectral flux) ----------
  if (!prevSpectrum || prevSpectrum.length !== binCount) {
    prevSpectrum = new Uint8Array(binCount);
    prevSpectrum.set(freqBuf);
    return;  // need a previous frame to compute flux
  }
  const odfLow = Math.max(1, Math.ceil(cfg.odfFreqMinHz / binHz));
  const odfHigh = Math.min(binCount - 1, Math.floor(cfg.odfFreqMaxHz / binHz));
  let flux = 0;
  for (let i = odfLow; i <= odfHigh; i++) {
    const d = freqBuf[i] - prevSpectrum[i];
    if (d > 0) flux += d;
  }
  prevSpectrum.set(freqBuf);

  odfBuffer[odfHead] = flux;
  odfHead = (odfHead + 1) % odfBuffer.length;
  if (odfSampleCount < odfBuffer.length) odfSampleCount++;

  // Track analysis-call rate (used to convert lag samples → BPM).
  if (lastAnalysisMs > 0) {
    const dt = now - lastAnalysisMs;
    if (dt > 0 && dt < 200) avgAnalysisDt = avgAnalysisDt * 0.9 + dt * 0.1;
  }
  lastAnalysisMs = now;

  // ---------- Periodic tempo estimation ----------
  const haveEnough = odfSampleCount >= cfg.odfWarmupFrames;
  const dueForUpdate = now - lastTempoEstMs >= cfg.bpmEstimateIntervalMs;
  if (haveEnough && dueForUpdate && smoothedLevel >= cfg.silenceResetIntensity) {
    lastTempoEstMs = now;
    const fps = 1000 / avgAnalysisDt;
    const { bpm: rawBpm, confidence } = estimateTempoFromOdf(fps);
    // Confidence-gated: only consider an estimate when the autocorrelation
    // has a clearly dominant peak.
    if (rawBpm > 0 && confidence >= cfg.bpmConfidenceThreshold) {
      const currentMedian = tempoEstimates.length
        ? medianOf(tempoEstimates) : 0;
      const drift = currentMedian > 0
        ? Math.abs(rawBpm - currentMedian) / currentMedian
        : 0;
      if (currentMedian > 0 && drift > cfg.bpmOutlierTolerance) {
        // Outlier — needs many AND-stable confirmations before flushing the
        // lock. Random ambient-noise spikes scatter across many BPMs and won't
        // ever form a tight cluster, so they can't fool the algorithm into
        // flipping the lock.
        outlierCandidates.push(rawBpm);
        if (outlierCandidates.length >= cfg.bpmOutlierConfirmations) {
          const std = stdDevOf(outlierCandidates);
          if (std < cfg.bpmOutlierStabilityStdMax) {
            tempoEstimates = outlierCandidates.slice();
            outlierCandidates = [];
          } else {
            outlierCandidates.shift();  // drop oldest; let the cluster settle
          }
        }
      } else {
        outlierCandidates.length = 0;
        tempoEstimates.push(rawBpm);
        if (tempoEstimates.length > cfg.bpmHistorySize) tempoEstimates.shift();
      }
      const median = medianOf(tempoEstimates);
      detectedBpm = Math.max(cfg.bpmMin, Math.min(cfg.bpmMax, median));
      lastTempoUpdateMs = now;
    }
  }

  // Silence-based reset: only drop the lock when the room is *actually* quiet
  // for a sustained stretch. Uses its own lower threshold so quiet sections
  // inside a song don't reset the lock (the color-ambient threshold above is
  // higher and serves a different purpose).
  if (smoothedLevel < cfg.silenceResetIntensity) {
    if (silenceStartMs === 0) silenceStartMs = now;
    if (now - silenceStartMs > cfg.silenceResetMs) {
      tempoEstimates = [];
      outlierCandidates = [];
      detectedBpm = cfg.bpmFallback;
      lastTempoUpdateMs = 0;
    }
  } else {
    silenceStartMs = 0;
  }
}

function medianOf(arr) {
  if (!arr || !arr.length) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function stdDevOf(arr) {
  if (!arr || arr.length < 2) return 0;
  let mean = 0;
  for (let i = 0; i < arr.length; i++) mean += arr[i];
  mean /= arr.length;
  let sumSq = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - mean;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / arr.length);
}

// Autocorrelate the ODF buffer to estimate beat period; convert to BPM.
// Uses a comb filter (sums autocorr at L, 2L, 3L, 4L) so the true beat —
// which reinforces multiple harmonics — beats octave-error candidates.
// Returns { bpm, confidence } where confidence is the ratio of best raw
// comb score to the mean comb score in range; > ~3 means a clearly
// dominant peak (real beat), ~1 means the autocorrelation is flat (noise
// or a section with no clear rhythm).
function estimateTempoFromOdf(fps) {
  // Use only the actually-populated portion of the ring buffer so early
  // estimates (when the buffer is partially filled) operate on real data
  // instead of leading zeros.
  const N = Math.min(odfSampleCount, odfBuffer.length);
  if (N < 8) return { bpm: 0, confidence: 0 };

  // Linearize ring buffer from oldest to newest of the populated samples.
  const odf = new Float32Array(N);
  const start = odfSampleCount < odfBuffer.length
    ? (odfHead - N + odfBuffer.length) % odfBuffer.length
    : odfHead;
  for (let i = 0; i < N; i++) odf[i] = odfBuffer[(start + i) % odfBuffer.length];

  // Subtract mean (removes DC bias from the correlation).
  let mean = 0;
  for (let i = 0; i < N; i++) mean += odf[i];
  mean /= N;
  for (let i = 0; i < N; i++) odf[i] -= mean;

  // Precompute autocorrelation at every lag — we need values at integer
  // multiples of each candidate lag for the comb-filter step.
  const allScores = new Float32Array(N);
  for (let lag = 1; lag < N; lag++) {
    let s = 0;
    const samples = N - lag;
    for (let i = lag; i < N; i++) s += odf[i] * odf[i - lag];
    allScores[lag] = s / samples;
  }

  const minLag = Math.max(1, Math.floor(60 * fps / cfg.bpmMax));
  const maxLag = Math.min(N - 1, Math.ceil(60 * fps / cfg.bpmMin));

  const priorCenter = cfg.bpmPriorCenter;
  const priorStd = cfg.bpmPriorStd;
  const twoStdSq = 2 * priorStd * priorStd;
  const harmonicWeights = [1.0, 0.8, 0.5, 0.3];

  let bestLag = -1, bestWeighted = -Infinity, bestRawComb = 0;
  let combSum = 0, combCount = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    // Comb filter: sum autocorr at L, 2L, 3L, 4L.
    let comb = 0;
    for (let k = 0; k < harmonicWeights.length; k++) {
      const hl = lag * (k + 1);
      if (hl >= N) break;
      comb += allScores[hl] * harmonicWeights[k];
    }
    if (comb <= 0) continue;
    combSum += comb;
    combCount++;
    if (comb > bestRawComb) bestRawComb = comb;
    // Gaussian prior — keep the algorithm from drifting to BPM extremes.
    const bpm = 60 * fps / lag;
    const prior = Math.exp(-((bpm - priorCenter) * (bpm - priorCenter)) / twoStdSq);
    const weighted = comb * prior;
    if (weighted > bestWeighted) {
      bestWeighted = weighted;
      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestWeighted <= 0) return { bpm: 0, confidence: 0 };
  let bpm = 60 * fps / bestLag;
  // Tempo folding: half/double until inside the presentation range.
  while (bpm < cfg.bpmOctaveMin) bpm *= 2;
  while (bpm > cfg.bpmOctaveMax) bpm /= 2;
  const meanComb = combCount > 0 ? combSum / combCount : 0;
  const confidence = meanComb > 0 ? bestRawComb / meanComb : 0;
  return { bpm, confidence };
}

function hopFrameAt(t) {
  if (t < 0.10) return F_SQUASH;
  if (t < 0.22) return F_MID_STRETCH;
  if (t < 0.78) return F_STRETCH;
  if (t < 0.90) return F_MID_STRETCH;
  return F_SQUASH;
}

// Idle-bounce frame selection grades the deformation amount by intensity.
// Even at zero intensity Growly shows a subtle apex stretch so the loop
// is always visibly animating, not just hovering.
function frameForIntensity(quarter, intensity) {
  if (!isFinite(intensity)) intensity = 0;
  if (!Number.isInteger(quarter) || quarter < 0 || quarter >= IDLE_FRAMES.length) quarter = 0;
  const airborne = (quarter === 0 || quarter === 1);
  if (intensity < cfg.intensityToFullStretch) {
    return airborne ? F_MID_STRETCH : F_NEUTRAL;
  }
  if (intensity < cfg.intensityToFullSquash) {
    return airborne ? F_STRETCH : F_NEUTRAL;
  }
  return IDLE_FRAMES[quarter] || F_NEUTRAL;
}

function updateSlime(now) {
  if (slime.isHopping) {
    if (now - slime.hopStartMs >= cfg.hopDurationMs) {
      slime.x = slime.hopToX;
      slime.y = slime.hopToY;
      slime.isHopping = false;
    }
    return;
  }

  const dx = slime.targetX - slime.x;
  const dy = slime.targetY - slime.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < cfg.arrivePx) return;

  const reach = cfg.hopDistancePx * cfg.renderScale;
  const ratio = Math.min(1, reach / dist);
  slime.hopFromX = slime.x;
  slime.hopFromY = slime.y;
  slime.hopToX = slime.x + dx * ratio;
  slime.hopToY = slime.y + dy * ratio;
  slime.hopStartMs = now;
  slime.isHopping = true;
}

// Find the two eye-pupil clusters in a frame and cache their bounding boxes
// so we can paint a highlight pixel at a shifted column within each. Splits
// by horizontal midpoint of all '6' pixels: left half → left eye, right →
// right. The cache key is the frame array (frames never mutate).
const EYE_BBOX_CACHE = new WeakMap();
function eyeBoxesFor(frame) {
  const cached = EYE_BBOX_CACHE.get(frame);
  if (cached) return cached;
  const pixels = [];
  for (let y = 0; y < SPRITE_H; y++) {
    const row = frame[y];
    if (!row) continue;
    for (let x = 0; x < SPRITE_W; x++) {
      if (row.charCodeAt(x) - 48 === 6) pixels.push([x, y]);
    }
  }
  if (pixels.length === 0) {
    EYE_BBOX_CACHE.set(frame, []);
    return [];
  }
  let xMin = pixels[0][0], xMax = pixels[0][0];
  for (const [x] of pixels) { if (x < xMin) xMin = x; if (x > xMax) xMax = x; }
  const midX = (xMin + xMax) / 2;
  function bbox(group) {
    if (group.length === 0) return null;
    let xLo = group[0][0], xHi = group[0][0], yLo = group[0][1], yHi = group[0][1];
    for (const [x, y] of group) {
      if (x < xLo) xLo = x; if (x > xHi) xHi = x;
      if (y < yLo) yLo = y; if (y > yHi) yHi = y;
    }
    return { xLo, xHi, yLo, yHi };
  }
  const boxes = [
    bbox(pixels.filter(p => p[0] <= midX)),
    bbox(pixels.filter(p => p[0] >  midX)),
  ].filter(Boolean);
  EYE_BBOX_CACHE.set(frame, boxes);
  return boxes;
}

function drawSlime(cx, cy, frame, palette, eyeShift) {
  // Defensive: never let a bad input silently make Growly invisible.
  if (!isFinite(cx)) cx = width / 2;
  if (!isFinite(cy)) cy = height / 2;
  if (!frame || !Array.isArray(frame) || frame.length !== SPRITE_H) frame = F_NEUTRAL;
  if (!palette || !palette[1]) palette = paletteForRgb(cfg.ambientRgb[0], cfg.ambientRgb[1], cfg.ambientRgb[2]);
  if (!Number.isInteger(eyeShift)) eyeShift = 0;

  const s = cfg.renderScale;
  const ox = Math.round(cx - (SPRITE_W * s) / 2);
  const oy = Math.round(cy - (SPRITE_H * s) / 2);

  // Pass 1: full sprite. All eye pixels (color 6) render normally — the
  // highlight is painted on top in pass 2, so we don't need to mask anything.
  for (let y = 0; y < SPRITE_H; y++) {
    const row = frame[y];
    if (!row) continue;
    for (let x = 0; x < SPRITE_W; x++) {
      const idx = row.charCodeAt(x) - 48;
      if (idx === 0) continue;
      const c = palette[idx];
      if (!c) continue;
      fill(c);
      rect(ox + x * s, oy + y * s, s, s);
    }
  }

  // Pass 2: paint the highlight (color 7) on the top row of each pupil
  // cluster, at xLo + 1 + eyeShift — so eyeShift = -1 puts the white on
  // the left column of the pupil (looking left), 0 = center, +1 = right.
  const boxes = eyeBoxesFor(frame);
  const hi = palette[7];
  if (hi && boxes.length) {
    fill(hi);
    for (const b of boxes) {
      const w = b.xHi - b.xLo;        // pupil width in cells minus 1
      const centerCol = b.xLo + Math.floor(w / 2);
      const col = Math.max(b.xLo, Math.min(b.xHi, centerCol + eyeShift));
      rect(ox + col * s, oy + b.yLo * s, s, s);
    }
  }
}

async function ensureMicStarted() {
  if (micActive || micStream) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    if (!audioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctor();
    }
    if (audioCtx.state !== 'running') await audioCtx.resume();
    const src = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = cfg.fftSize;
    analyser.smoothingTimeConstant = 0.3;
    src.connect(analyser);
    micStream = stream;
    micAnalyser = analyser;
    micBuffer = new Float32Array(analyser.fftSize);
    freqBuf = new Uint8Array(analyser.frequencyBinCount);
    micActive = true;
  } catch (e) {
    // permission denied or no mic — stay calm
  }
}

function readMicRms() {
  if (!micAnalyser) return 0;
  micAnalyser.getFloatTimeDomainData(micBuffer);
  let sumSq = 0;
  for (let i = 0; i < micBuffer.length; i++) sumSq += micBuffer[i] * micBuffer[i];
  return Math.sqrt(sumSq / micBuffer.length);
}

function mousePressed() {
  ensureMicStarted();
  setTarget(mouseX, mouseY);
  return false;
}

function touchStarted() {
  ensureMicStarted();
  setTarget(mouseX, mouseY);
  return false;
}

function setTarget(x, y) {
  slime.targetX = x;
  slime.targetY = y;
}

function rebuildBackground() {
  bgBuffer = createGraphics(width, height);
  bgBuffer.noStroke();
  bgBuffer.noSmooth();
  bgBuffer.pixelDensity(1);

  const s = cfg.renderScale;
  const GRASS_LIGHT = '#5BB04A';
  const GRASS_MID   = '#3F8F2F';
  const GRASS_DARK  = '#256E1B';
  const TUFT_DARK   = '#143F0E';

  bgBuffer.fill(GRASS_MID);
  bgBuffer.rect(0, 0, bgBuffer.width, bgBuffer.height);

  noiseSeed(cfg.bgSeed);
  const tile = 2;
  const cols = Math.ceil(bgBuffer.width / (tile * s));
  const rows = Math.ceil(bgBuffer.height / (tile * s));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = noise(c * 0.22, r * 0.22);
      let col;
      if (n < 0.42) col = GRASS_DARK;
      else if (n > 0.62) col = GRASS_LIGHT;
      else continue;
      bgBuffer.fill(col);
      bgBuffer.rect(c * tile * s, r * tile * s, tile * s, tile * s);
    }
  }

  randomSeed(cfg.bgSeed);
  const tuftCount = Math.floor((bgBuffer.width * bgBuffer.height) / (s * s * 80));
  for (let i = 0; i < tuftCount; i++) {
    const tx = Math.floor(random(bgBuffer.width / s)) * s;
    const ty = Math.floor(random(bgBuffer.height / s)) * s;
    bgBuffer.fill(TUFT_DARK);
    bgBuffer.rect(tx,     ty,     s, s);
    bgBuffer.rect(tx - s, ty + s, s, s);
    bgBuffer.rect(tx + s, ty + s, s, s);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  slime.x = width / 2;
  slime.y = height / 2;
  slime.targetX = slime.x;
  slime.targetY = slime.y;
  rebuildBackground();
}

// ===== Face tracking (opt-in via #face-toggle button) =====
// Lazy-init: webcam + MediaPipe FaceMesh only spin up after the user clicks
// the toggle. While active, lastFaceLandmarks holds the most recent 468-point
// landmark array, which drawFaceWireframe() overlays on the canvas every frame.
let faceMesh = null;
let faceVideo = null;
let faceTrackingActive = false;
let lastFaceLandmarks = null;

async function ensureFaceTracker() {
  if (faceMesh) return true;
  if (typeof FaceMesh === 'undefined') {
    console.error('Growly: MediaPipe FaceMesh failed to load from CDN');
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: 'user' },
      audio: false,
    });
    faceVideo = document.createElement('video');
    faceVideo.style.display = 'none';
    faceVideo.playsInline = true;
    faceVideo.muted = true;
    faceVideo.srcObject = stream;
    document.body.appendChild(faceVideo);
    await faceVideo.play();

    faceMesh = new FaceMesh({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    faceMesh.onResults((results) => {
      lastFaceLandmarks =
        (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) || null;
    });

    // Pump loop: keep sending frames while tracking is on. send() is async and
    // self-paces, so awaiting it gives us natural backpressure rather than
    // queuing up frames the model can't keep up with.
    (async function pump() {
      while (faceTrackingActive && faceMesh) {
        if (faceVideo && faceVideo.readyState >= 2) {
          try { await faceMesh.send({ image: faceVideo }); }
          catch (e) { console.warn('Growly face send failed', e); }
        } else {
          await new Promise((r) => setTimeout(r, 50));
        }
      }
    })();

    return true;
  } catch (e) {
    console.error('Growly face tracker init failed', e);
    return false;
  }
}

function drawFaceWireframe() {
  if (!lastFaceLandmarks) return;
  const lm = lastFaceLandmarks;
  const tess = window.FACEMESH_TESSELATION;
  push();
  noFill();
  stroke(120, 255, 180, 200);
  strokeWeight(1);
  // Mirror x: webcam shows the user as a selfie, so we flip to match the
  // mental "mirror image" expectation.
  if (tess && tess.length) {
    for (let i = 0; i < tess.length; i++) {
      const pair = tess[i];
      const a = lm[pair[0]];
      const b = lm[pair[1]];
      if (!a || !b) continue;
      line((1 - a.x) * width, a.y * height, (1 - b.x) * width, b.y * height);
    }
  } else {
    // Fallback: tesselation constant not exposed by this CDN bundle — just
    // dot every landmark.
    noStroke();
    fill(120, 255, 180, 220);
    for (let i = 0; i < lm.length; i++) {
      circle((1 - lm[i].x) * width, lm[i].y * height, 2);
    }
  }
  pop();
}

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('face-toggle');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!faceTrackingActive) {
      btn.textContent = 'Face tracking: starting…';
      btn.disabled = true;
      const ok = await ensureFaceTracker();
      btn.disabled = false;
      if (!ok) {
        btn.textContent = 'Face tracking: failed';
        return;
      }
      faceTrackingActive = true;
      btn.classList.add('on');
      btn.textContent = 'Face tracking: ON';
    } else {
      faceTrackingActive = false;
      lastFaceLandmarks = null;
      btn.classList.remove('on');
      btn.textContent = 'Face tracking: OFF';
    }
  });
});
