// Growly — blue slime. Idle bounce in place; click/tap to hop. Color shifts
// red when the mic is louder, blue when it's quiet (smoothed).

const SPRITE_W = 24;
const SPRITE_H = 24;

const config = {
  renderScale: 4,
  bouncePeriodMs: 600,
  hopDistancePx: 48,    // sprite-pixels per single hop
  hopDurationMs: 400,
  hopPeakPx: 14,        // sprite-pixels of vertical lift at apex
  arrivePx: 2,
  micGain: 12,          // raw amplitude is small, multiply before clamping
  micSmoothing: 0.08,   // 0=no movement, 1=instant; gentler smoothing
  bgSeed: 1337,
};

// Palette derived from a single hue per frame — mic level rotates the hue
// across the rainbow (blue → cyan → green → yellow → orange → red).
// 0 transparent, 1 base, 2 rim, 3 shadow, 6 eye dot
function paletteForHue(h) {
  return {
    1: color(`hsl(${h}, 78%, 55%)`),
    2: color(`hsl(${h}, 92%, 80%)`),
    3: color(`hsl(${h}, 75%, 35%)`),
    6: color(`hsl(${h}, 55%, 12%)`),
  };
}

// Rounder, slightly smaller blob: 14 wide × 14 tall (was 18 × 16).
// Anchored bottom at row 19 across all frames.
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
let audioCtx = null;
let micStream = null;
let micAnalyser = null;
let micBuffer = null;
let micActive = false;
let smoothedLevel = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();
  noStroke();
  startMs = millis();
  slime.x = width / 2;
  slime.y = height / 2;
  slime.targetX = slime.x;
  slime.targetY = slime.y;
  rebuildBackground();
}

function draw() {
  image(bgBuffer, 0, 0);

  // Smooth mic amplitude toward a clamped, gained target.
  const rawLevel = readMicRms();
  const targetLevel = Math.min(1, rawLevel * config.micGain);
  smoothedLevel += (targetLevel - smoothedLevel) * config.micSmoothing;

  // Quiet → 240° (blue). Loud → 0° (red). Smooth traversal of full rainbow.
  const hue = 240 - smoothedLevel * 240;
  const palette = paletteForHue(hue);

  updateSlime();

  let renderX = slime.x;
  let renderY = slime.y;
  let frame;

  if (slime.isHopping) {
    const t = (millis() - slime.hopStartMs) / config.hopDurationMs;
    const lift = Math.sin(t * Math.PI) * config.hopPeakPx * config.renderScale;
    renderX = lerp(slime.hopFromX, slime.hopToX, t);
    renderY = lerp(slime.hopFromY, slime.hopToY, t) - lift;
    frame = hopFrameAt(t);
  } else {
    const phase = ((millis() - startMs) % config.bouncePeriodMs) / config.bouncePeriodMs;
    const idx = Math.floor(phase * IDLE_FRAMES.length) % IDLE_FRAMES.length;
    frame = IDLE_FRAMES[idx];
  }

  drawSlime(renderX, renderY, frame, palette);
}

function hopFrameAt(t) {
  if (t < 0.10) return F_SQUASH;
  if (t < 0.22) return F_MID_STRETCH;
  if (t < 0.78) return F_STRETCH;
  if (t < 0.90) return F_MID_STRETCH;
  return F_SQUASH;
}

function updateSlime() {
  if (slime.isHopping) {
    if (millis() - slime.hopStartMs >= config.hopDurationMs) {
      slime.x = slime.hopToX;
      slime.y = slime.hopToY;
      slime.isHopping = false;
    }
    return;
  }

  const dx = slime.targetX - slime.x;
  const dy = slime.targetY - slime.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < config.arrivePx) return;

  const reach = config.hopDistancePx * config.renderScale;
  const ratio = Math.min(1, reach / dist);
  slime.hopFromX = slime.x;
  slime.hopFromY = slime.y;
  slime.hopToX = slime.x + dx * ratio;
  slime.hopToY = slime.y + dy * ratio;
  slime.hopStartMs = millis();
  slime.isHopping = true;
}

function drawSlime(cx, cy, frame, palette) {
  const s = config.renderScale;
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
    analyser.fftSize = 1024;
    src.connect(analyser);
    micStream = stream;
    micAnalyser = analyser;
    micBuffer = new Float32Array(analyser.fftSize);
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

  const s = config.renderScale;
  const GRASS_LIGHT = '#5BB04A';
  const GRASS_MID   = '#3F8F2F';
  const GRASS_DARK  = '#256E1B';
  const TUFT_DARK   = '#143F0E';

  bgBuffer.fill(GRASS_MID);
  bgBuffer.rect(0, 0, bgBuffer.width, bgBuffer.height);

  noiseSeed(config.bgSeed);
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

  randomSeed(config.bgSeed);
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
