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
let bouncePhase = 0;        // 0..1, integrates over time at the current bounce period
let smoothedPitchHue = 0;   // smoothed mapping of dominant pitch → hue (deg)
let detectedBpm = 0;        // smoothed estimate from beat-tracking
let energyHistory = [];     // recent bass-band energies for onset detection
let lastBeatMs = 0;
let beatIntervals = [];     // recent inter-beat intervals (ms)
let audioCtx = null;
let micStream = null;
let micAnalyser = null;
let micBuffer = null;       // time-domain (RMS)
let freqBuf = null;         // frequency-domain (centroid + beat)
let micActive = false;
let smoothedLevel = 0;      // intensity

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();
  noStroke();
  startMs = millis();
  lastDrawMs = startMs;
  smoothedPitchHue = cfg.hueFallback;
  detectedBpm = cfg.bpmFallback;
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
    // Idle bounce: BPM → period (one bounce per beat), intensity → vertical lift.
    const bpm = intensity > cfg.intensityThreshold ? detectedBpm : cfg.bpmFallback;
    const period = 60000 / bpm;
    const ampPx = lerp(cfg.bounceMinAmpPx, cfg.bounceMaxAmpPx, intensity);
    bouncePhase = (bouncePhase + dt / period) % 1;
    const idx = Math.floor(bouncePhase * IDLE_FRAMES.length) % IDLE_FRAMES.length;
    frame = IDLE_FRAMES[idx];
    // Airborne in first half of the cycle (neutral→stretch→neutral),
    // grounded in the second half (squash). Lift is one positive sine half-arch.
    const lift = Math.max(0, Math.sin(bouncePhase * Math.PI * 2)) * ampPx * cfg.renderScale;
    renderY = slime.y - lift;
  }

  drawSlime(renderX, renderY, frame, palette);
}

// Compute dominant pitch (spectral centroid → hue) and detect beats (bass-band onsets → BPM).
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

  // Pitch: magnitude-weighted mean frequency across the musical range, log-mapped to hue.
  const pitchLow = Math.max(1, Math.ceil(cfg.pitchMinHz / binHz));
  const pitchHigh = Math.min(binCount - 1, Math.floor(cfg.pitchMaxHz / binHz));
  let weightedSum = 0, totalMag = 0;
  for (let i = pitchLow; i <= pitchHigh; i++) {
    const m = freqBuf[i];
    weightedSum += i * m;
    totalMag += m;
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

  // Beat detection from bass-band onset peaks.
  const bassLow = Math.max(1, Math.ceil(cfg.beatBandMinHz / binHz));
  const bassHigh = Math.min(binCount - 1, Math.floor(cfg.beatBandMaxHz / binHz));
  let bassEnergy = 0;
  for (let i = bassLow; i <= bassHigh; i++) bassEnergy += freqBuf[i];

  energyHistory.push(bassEnergy);
  if (energyHistory.length > 60) energyHistory.shift();

  if (energyHistory.length >= 15 && smoothedLevel >= cfg.intensityThreshold) {
    let sum = 0;
    for (let i = 0; i < energyHistory.length; i++) sum += energyHistory[i];
    const avg = sum / energyHistory.length;
    const refractoryOk = (now - lastBeatMs) > cfg.beatMinIntervalMs;
    if (bassEnergy > avg * cfg.beatThresholdRatio && refractoryOk) {
      if (lastBeatMs > 0) {
        const interval = now - lastBeatMs;
        beatIntervals.push(interval);
        if (beatIntervals.length > 8) beatIntervals.shift();
        const sorted = beatIntervals.slice().sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const bpm = 60000 / median;
        detectedBpm = Math.max(cfg.bpmMin, Math.min(cfg.bpmMax, bpm));
      }
      lastBeatMs = now;
    }
  }
  if (now - lastBeatMs > cfg.beatTimeoutMs) {
    detectedBpm = cfg.bpmFallback;
    beatIntervals.length = 0;
  }
}

function hopFrameAt(t) {
  if (t < 0.10) return F_SQUASH;
  if (t < 0.22) return F_MID_STRETCH;
  if (t < 0.78) return F_STRETCH;
  if (t < 0.90) return F_MID_STRETCH;
  return F_SQUASH;
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
