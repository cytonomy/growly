// Growly — all tunable parameters in one place. Edit and refresh the page.
window.GROWLY_CONFIG = {
  // ----- Render -----
  renderScale: 4,
  bgSeed: 1337,

  // ----- Idle bounce -----
  // Period and vertical amplitude both lerp from "calm" → "loud" with smoothed mic level.
  bounceCalmPeriodMs: 700,    // slow, gentle when quiet
  bounceLoudPeriodMs: 180,    // fast when the music is hot
  bounceCalmAmpPx: 0,         // sprite-pixels of vertical lift at apex when quiet
  bounceLoudAmpPx: 10,        // sprite-pixels of lift at apex when loud

  // ----- Hop (click / tap to move) -----
  hopDistancePx: 48,          // sprite-pixels per single hop
  hopDurationMs: 400,
  hopPeakPx: 14,              // arc height at midpoint
  arrivePx: 2,                // stop once within this distance of target

  // ----- Mic input -----
  micGain: 12,                // raw mic RMS is small (0.02–0.15); scale up before clamp
  micSmoothing: 0.08,         // 0 = no movement, 1 = instant. Lower = smoother falloff.

  // ----- Rainbow hue cycling (LED-style — always rotating) -----
  hueBaseSpeedDegPerSec: 12,    // ~30 s per full rainbow when silent
  hueBoostSpeedDegPerSec: 110,  // ~3 s per full rainbow at peak mic level
  hueStart: 240,                // starting hue (degrees) on page load

  // ----- Palette (HSL components per palette index) -----
  // Hue is set per-frame from the rotator above; sat/lightness stay fixed per role.
  bodySaturation: 78,    bodyLightness: 55,    // idx 1 — main body
  rimSaturation: 92,     rimLightness: 80,     // idx 2 — bright outline
  shadowSaturation: 75,  shadowLightness: 35,  // idx 3 — interior shadow band
  eyeSaturation: 55,     eyeLightness: 12,     // idx 6 — eye dot
};
