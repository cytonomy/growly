// Growly — blue slime idle bounce on a grass field.

const SPRITE_W = 24;
const SPRITE_H = 24;

const config = {
  renderScale: 6,
  fps: 8,
  bounceAmpPx: 2,
  bouncePeriodMs: 500,
  bgSeed: 1337,
};

// 0 transparent, 1 base, 2 rim, 3 shadow, 4 deep shadow, 5 specular fleck, 6 eye dot
const PALETTE = {
  1: '#3A8FE8',
  2: '#8FD0FF',
  3: '#1F5BAF',
  4: '#0C2D6E',
  5: '#FFFFFF',
  6: '#0A1428',
};

// Each row is exactly 24 chars; each char is a palette index 0-6.
const F_NEUTRAL = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000222222000000000",
  "000000022511111220000000",
  "000002251111111112200000",
  "000025511111111111120000",
  "000211511111111111111200",
  "002111111111111111111200",
  "002111116111111611111200",
  "002111111111111111111200",
  "002111111111111111111200",
  "002311111111111111133200",
  "002331111111111111333200",
  "002333311111111133333200",
  "002333333111113333334200",
  "002333333344443333344200",
  "002222222222222222222200",
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
  "000000002222222200000000",
  "000000225111111122000000",
  "000022511111111111220000",
  "000215511111111111112000",
  "002111111111111111111200",
  "002111116111111611111200",
  "002111111111111111111200",
  "002111111111111111111200",
  "002311111111111111133200",
  "002331111111111111333200",
  "002333311111111133333200",
  "002333333111113333334200",
  "002333333344443333344200",
  "002222222222222222222200",
  "000000000000000000000000",
];

const F_STRETCH = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000000000000000000",
  "000000000222222000000000",
  "000000022211111220000000",
  "000000022511111122000000",
  "000002251111111111200000",
  "000025511111111111120000",
  "000211511111111111111200",
  "002111111111111111111200",
  "002111111111111111111200",
  "002111116111111611111200",
  "002111111111111111111200",
  "002111111111111111111200",
  "002311111111111111133200",
  "002331111111111111333200",
  "002333311111111133333200",
  "002333333111113333334200",
  "002333333344443333344200",
  "002222222222222222222200",
  "000000000000000000000000",
];

const FRAMES = [F_NEUTRAL, F_SQUASH, F_NEUTRAL, F_STRETCH];

const slime = {
  x: 0,
  y: 0,
  frameIdx: 0,
  lastFrameSwap: 0,
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
  rebuildBackground();
}

function draw() {
  image(bgBuffer, 0, 0);

  const now = millis();
  const frameDurMs = 1000 / config.fps;
  if (now - slime.lastFrameSwap >= frameDurMs) {
    slime.frameIdx = (slime.frameIdx + 1) % FRAMES.length;
    slime.lastFrameSwap = now;
  }

  const t = (now - startMs) / config.bouncePeriodMs;
  const yOffsetPx = Math.sin(t * Math.PI * 2) * config.bounceAmpPx;

  drawSlime(slime.x, slime.y + yOffsetPx * config.renderScale);
}

function drawSlime(cx, cy) {
  const s = config.renderScale;
  const frame = FRAMES[slime.frameIdx];
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
  rebuildBackground();
}
