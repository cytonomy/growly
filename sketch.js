// Growly — blue slime. Idle bounce in place; click to hop toward a target.

const SPRITE_W = 24;
const SPRITE_H = 24;

const config = {
  renderScale: 4,
  bouncePeriodMs: 600,
  hopDistancePx: 48,    // sprite-pixels per single hop
  hopDurationMs: 400,
  hopPeakPx: 14,        // sprite-pixels of vertical lift at apex
  arrivePx: 2,          // distance threshold to consider target reached
  bgSeed: 1337,
};

// 0 transparent, 1 base, 2 rim, 3 shadow, 6 eye dot
const PALETTE = {
  1: '#3A8FE8',
  2: '#8FD0FF',
  3: '#1F5BAF',
  6: '#0A1428',
};

// Spherical neutral. 18 wide × 16 tall. Anchored at row 19.
const F_NEUTRAL = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000022220000000000",
  "000000000211112000000000",
  "000000002111111200000000",
  "000000021111111120000000",
  "000000211111111112000000",
  "000002111111111111200000",
  "000021111111111111112000",
  "000211116111111611112000",
  "000211111111111111112000",
  "000211111111111111112000",
  "000023333333333333332000",
  "000002333333333333200000",
  "000000233333333332000000",
  "000000023333333320000000",
  "000000002333333200000000",
  "000000000022220000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
];

// Mid-stretch — interpolates between NEUTRAL and STRETCH. 16 wide × 17 tall.
const F_MID_STRETCH = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000022220000000000",
  "000000000211112000000000",
  "000000002111111200000000",
  "000000021111111120000000",
  "000000211111111112000000",
  "000002111111111111200000",
  "000021111111111111112000",
  "000021116111111611112000",
  "000021111111111111112000",
  "000021111111111111112000",
  "000021111111111111112000",
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

// Stretched. 14 wide × 18 tall.
const F_STRETCH = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000022220000000000",
  "000000000211112000000000",
  "000000002111111200000000",
  "000000021111111120000000",
  "000000211111111112000000",
  "000002111111111111200000",
  "000002111111111111200000",
  "000002111111111111200000",
  "000002116111111611200000",
  "000002111111111111200000",
  "000002111111111111200000",
  "000002333333333333200000",
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

// Squashed. 20 wide × 12 tall.
const F_SQUASH = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000022220000000000",
  "000000002111111200000000",
  "000000211111111112000000",
  "000021111111111111112000",
  "002111116111111611111200",
  "002111111111111111111200",
  "002333333333333333333200",
  "002333333333333333333200",
  "000023333333333333332000",
  "000000233333333332000000",
  "000000002333333200000000",
  "000000000022220000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
];

// Idle phase order: neutral → stretch → neutral → squash.
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

  updateSlime();

  let renderX = slime.x;
  let renderY = slime.y;
  let frame;

  if (slime.isHopping) {
    const t = (millis() - slime.hopStartMs) / config.hopDurationMs;
    // Parabolic lift: 0 at takeoff and landing, max at apex.
    const lift = Math.sin(t * Math.PI) * config.hopPeakPx * config.renderScale;
    renderX = lerp(slime.hopFromX, slime.hopToX, t);
    renderY = lerp(slime.hopFromY, slime.hopToY, t) - lift;
    frame = hopFrameAt(t);
  } else {
    const phase = ((millis() - startMs) % config.bouncePeriodMs) / config.bouncePeriodMs;
    const idx = Math.floor(phase * IDLE_FRAMES.length) % IDLE_FRAMES.length;
    frame = IDLE_FRAMES[idx];
  }

  drawSlime(renderX, renderY, frame);
}

function hopFrameAt(t) {
  // Anticipation crouch → launch tween → airborne peak → descent tween → impact crouch.
  if (t < 0.10) return F_SQUASH;
  if (t < 0.22) return F_MID_STRETCH;
  if (t < 0.78) return F_STRETCH;
  if (t < 0.90) return F_MID_STRETCH;
  return F_SQUASH;
}

function updateSlime() {
  if (slime.isHopping) {
    const elapsed = millis() - slime.hopStartMs;
    if (elapsed >= config.hopDurationMs) {
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

function drawSlime(cx, cy, frame) {
  const s = config.renderScale;
  const ox = Math.round(cx - (SPRITE_W * s) / 2);
  const oy = Math.round(cy - (SPRITE_H * s) / 2);

  for (let y = 0; y < SPRITE_H; y++) {
    const row = frame[y];
    for (let x = 0; x < SPRITE_W; x++) {
      const idx = row.charCodeAt(x) - 48;
      if (idx === 0) continue;
      fill(PALETTE[idx]);
      rect(ox + x * s, oy + y * s, s, s);
    }
  }
}

function mousePressed() {
  slime.targetX = mouseX;
  slime.targetY = mouseY;
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
