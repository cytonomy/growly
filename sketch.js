// Growly — pixel-art slime. Click/tap to hop.
// Audio reactivity:
//   - dominant pitch (spectral centroid)  → hue on the rainbow
//   - detected BPM (bass-band onsets)     → bounce period (one bounce per beat)
//   - intensity (RMS)                     → bounce amplitude (vertical lift)
// All knobs live in config.js (window.GROWLY_CONFIG).

const cfg = window.GROWLY_CONFIG;

const SPRITE_W = 24;
const SPRITE_H = 24;

// 0 transparent, 1 base, 2 rim, 3 shadow, 6 eye dot. Hue is set per-frame;
// saturation and lightness come from cfg per palette role.
function paletteForHue(h) {
  // p5's color() silently returns white for non-integer hues in hsl() strings.
  const hi = Math.round(h);
  return {
    1: color(`hsl(${hi}, ${cfg.bodySaturation}%, ${cfg.bodyLightness}%)`),
    2: color(`hsl(${hi}, ${cfg.rimSaturation}%, ${cfg.rimLightness}%)`),
    3: color(`hsl(${hi}, ${cfg.shadowSaturation}%, ${cfg.shadowLightness}%)`),
    6: color(`hsl(${hi}, ${cfg.eyeSaturation}%, ${cfg.eyeLightness}%)`),
  };
}

// Rounder, slightly smaller blob: 14 wide × 14 tall. Anchored bottom at row 19.
const F_NEUTRAL = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000022220000000000",
  "000000002111111200000000",
  "000000021111111120000000",
  "000000211111111112000000",
  "000002111111111111200000",
  "000002116111111611200000",
  "000002111111111111200000",
  "000002111111111111200000",
  "000002333333333333200000",
  "000000233333333332000000",
  "000000023333333320000000",
  "000000002333333200000000",
  "000000000233332000000000",
  "000000000022220000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
];

// Mid-stretch — between neutral and stretch. 12 wide × 15 tall.
const F_MID_STRETCH = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000022220000000000",
  "000000002111111200000000",
  "000000021111111120000000",
  "000000211111111112000000",
  "000000211111111112000000",
  "000000211111111112000000",
  "000000216111111612000000",
  "000000211111111112000000",
  "000000233333333332000000",
  "000000233333333332000000",
  "000000023333333320000000",
  "000000002333333200000000",
  "000000000233332000000000",
  "000000000023320000000000",
  "000000000022220000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
];

// Stretched. 10 wide × 16 tall.
const F_STRETCH = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000022220000000000",
  "000000002111111200000000",
  "000000021111111120000000",
  "000000021111111120000000",
  "000000021111111120000000",
  "000000021111111120000000",
  "000000026111111620000000",
  "000000021111111120000000",
  "000000021111111120000000",
  "000000023333333320000000",
  "000000023333333320000000",
  "000000023333333320000000",
  "000000002333333200000000",
  "000000000233332000000000",
  "000000000023320000000000",
  "000000000022220000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
];

// Squashed. 16 wide × 10 tall.
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
  "000000000022220000000000",
  "000000021111111120000000",
  "000002116111111611200000",
  "000021111111111111112000",
  "000023333333333333332000",
  "000023333333333333332000",
  "000002333333333333200000",
  "000000233333333332000000",
  "000000002333333200000000",
  "000000000022220000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
];

const IDLE_FRAMES = [F_NEUTRAL, F_STRETCH, F_NEUTRAL, F_SQUASH];

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
let swayPhase = 0;            // 0..2π, integrates over time at the current sway period
let smoothedPitchHue = 0;     // smoothed mapping of dominant pitch → hue (deg)
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
let audioCtx = null;
let micStream = null;
let micAnalyser = null;
let micBuffer = null;         // time-domain (RMS)
let freqBuf = null;           // frequency-domain (centroid + ODF)
let micActive = false;
let smoothedLevel = 0;        // intensity

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();
  noStroke();
  startMs = millis();
  lastDrawMs = startMs;
  smoothedPitchHue = cfg.hueFallback;
  detectedBpm = cfg.bpmFallback;
  tempoEstimates = [];
  outlierCandidates = [];
  swayPhase = 0;
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
  const intensity = smoothedLevel;

  // Pitch + beat analysis from FFT (updates smoothedPitchHue + detectedBpm).
  analyzeSpectrum(now);

  const palette = paletteForHue(smoothedPitchHue);

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
    // Growly does a slow micro-jiggle.
    const bpm = detectedBpm;
    const period = 60000 / bpm;
    bouncePhase = (bouncePhase + dt / period) % 1;
    // Intensity → bounce amplitude AND deformation amount.
    const ampPx = lerp(cfg.bounceMinAmpPx, cfg.bounceMaxAmpPx, intensity);
    const quarter = Math.floor(bouncePhase * IDLE_FRAMES.length) % IDLE_FRAMES.length;
    frame = frameForIntensity(quarter, intensity);
    // Vertical lift: one positive sine half-arch over the first half of the cycle.
    const lift = Math.max(0, Math.sin(bouncePhase * Math.PI * 2)) * ampPx * cfg.renderScale;
    renderY = slime.y - lift;
    // Horizontal sway when the music is fast — adds a side-to-side swing.
    if (bpm >= cfg.swayBpmThreshold) {
      const swayBpm = bpm / cfg.swayBeatsPerCycle;
      const swayPeriodMs = 60000 / swayBpm;
      swayPhase = (swayPhase + dt / swayPeriodMs * Math.PI * 2) % (Math.PI * 2);
      const swayBlend = Math.min(1,
        (bpm - cfg.swayBpmThreshold) / Math.max(1, cfg.bpmOctaveMax - cfg.swayBpmThreshold));
      const swayAmp = swayBlend * cfg.swayMaxAmpPx * intensity;
      renderX = slime.x + Math.sin(swayPhase) * swayAmp * cfg.renderScale;
    }
  }

  drawSlime(renderX, renderY, frame, palette);

  if (cfg.showHud) drawHud();
}

function drawHud() {
  const lines = [
    `BPM   ${micActive ? Math.round(detectedBpm) : '—'}`,
    `pitch ${Math.round(smoothedPitchHue)}°`,
    `level ${(smoothedLevel * 100).toFixed(0)}%`,
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

  // ---------- Pitch (spectral centroid) ----------
  const pitchLow = Math.max(1, Math.ceil(cfg.pitchMinHz / binHz));
  const pitchHigh = Math.min(binCount - 1, Math.floor(cfg.pitchMaxHz / binHz));
  let weightedSum = 0, totalMag = 0;
  for (let i = pitchLow; i <= pitchHigh; i++) {
    weightedSum += i * freqBuf[i];
    totalMag += freqBuf[i];
  }
  let targetHue = cfg.hueFallback;
  if (totalMag > 0 && smoothedLevel >= cfg.intensityThreshold) {
    const meanBin = weightedSum / totalMag;
    const pitchHz = meanBin * binHz;
    const logMin = Math.log(cfg.pitchMinHz);
    const logMax = Math.log(cfg.pitchMaxHz);
    const clamped = Math.max(cfg.pitchMinHz, Math.min(cfg.pitchMaxHz, pitchHz));
    const t = (Math.log(clamped) - logMin) / (logMax - logMin);
    targetHue = t * cfg.pitchHueRange;
  }
  smoothedPitchHue += (targetHue - smoothedPitchHue) * cfg.pitchSmoothing;

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
  const haveEnough = odfSampleCount >= odfBuffer.length / 2;
  const dueForUpdate = now - lastTempoEstMs >= cfg.bpmEstimateIntervalMs;
  if (haveEnough && dueForUpdate && smoothedLevel >= cfg.intensityThreshold) {
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
        // Outlier — needs to repeat consecutively before flushing the lock.
        outlierCandidates.push(rawBpm);
        if (outlierCandidates.length >= cfg.bpmOutlierConfirmations) {
          tempoEstimates = outlierCandidates.slice();
          outlierCandidates = [];
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

  // Reset to fallback after extended silence / no detection.
  if (lastTempoUpdateMs > 0 && now - lastTempoUpdateMs > cfg.bpmIdleResetMs) {
    tempoEstimates = [];
    detectedBpm = cfg.bpmFallback;
    lastTempoUpdateMs = 0;
  }
}

// Autocorrelate the ODF buffer to estimate beat period; convert to BPM.
// Uses a comb filter (sums autocorr at L, 2L, 3L, 4L) so the true beat —
// which reinforces multiple harmonics — beats octave-error candidates.
// Returns { bpm, confidence } where confidence is the ratio of best raw
// comb score to the mean comb score in range; > ~3 means a clearly
// dominant peak (real beat), ~1 means the autocorrelation is flat (noise
// or a section with no clear rhythm).
function estimateTempoFromOdf(fps) {
  const N = odfBuffer.length;

  // Linearize ring buffer from oldest to newest.
  const odf = new Float32Array(N);
  for (let i = 0; i < N; i++) odf[i] = odfBuffer[(odfHead + i) % N];

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

// Idle-bounce frame selection grades the deformation amount by intensity:
// silent → no shape change; loud → full squash/stretch cycle.
function frameForIntensity(quarter, intensity) {
  if (intensity < cfg.intensityToFlatten) return F_NEUTRAL;
  if (intensity < cfg.intensityToMidStretch) {
    return quarter === 1 ? F_MID_STRETCH : F_NEUTRAL;
  }
  if (intensity < cfg.intensityToFullStretch) {
    return quarter === 1 ? F_STRETCH : F_NEUTRAL;
  }
  return IDLE_FRAMES[quarter];
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

function drawSlime(cx, cy, frame, palette) {
  const s = cfg.renderScale;
  const ox = Math.round(cx - (SPRITE_W * s) / 2);
  const oy = Math.round(cy - (SPRITE_H * s) / 2);

  for (let y = 0; y < SPRITE_H; y++) {
    const row = frame[y];
    for (let x = 0; x < SPRITE_W; x++) {
      const idx = row.charCodeAt(x) - 48;
      if (idx === 0) continue;
      fill(palette[idx]);
      rect(ox + x * s, oy + y * s, s, s);
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
