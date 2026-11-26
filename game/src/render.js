// Every pixel the player sees: dawn sky over the archipelago, the sea, the islands and the
// volcano, the rings and the runway, the mail plane from behind, and a lit instrument panel.
// The renderer knows nothing about the rules: it paints a world state on a 1280x720 canvas.

import { COURSE, FIELD, LANDING, PALETTE, RING } from './config.js';
import { terrainHeight } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The islands the course crosses: green hills, one volcano, one runway shelf. */
const ISLANDS = [
  { from: 1000, to: 2300, height: 140, volcano: false, runway: false },
  { from: 4000, to: 5600, height: 720, volcano: true, runway: false },
  { from: 6600, to: 7700, height: 220, volcano: false, runway: false },
  { from: 8520, to: 9000, height: 30, volcano: false, runway: true },
];

/** Fixed clouds, so the sky is the same sky every run at the same distance. */
const CLOUDS = [];
for (let i = 0; i < 14; i += 1) {
  CLOUDS.push({ x: (i * 211 + 90) % 1600, y: 48 + ((i * 37) % 190), s: 48 + ((i * 29) % 72) });
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');

  function drawSky(state, horizonY) {
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY + 40);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, PALETTE.skyMid);
    sky.addColorStop(1, PALETTE.skyHorizon);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, horizonY + 40);
    // Low dawn sun, right of the course.
    const sunX = 1030;
    const sunY = horizonY - 150;
    const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 120);
    glow.addColorStop(0, 'rgba(255, 217, 138, 0.9)');
    glow.addColorStop(1, 'rgba(255, 217, 138, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 130, sunY - 130, 260, 260);
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
    ctx.fill();
    // Drifting clouds, parallaxed by distance.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    for (const c of CLOUDS) {
      const x = (((c.x - state.distance * 0.12) % 1600) + 1600) % 1600 - 160;
      const y = c.y - state.altitude * 0.02;
      ctx.beginPath();
      ctx.ellipse(x, y, c.s, c.s * 0.32, 0, 0, Math.PI * 2);
      ctx.ellipse(x + c.s * 0.5, y + 6, c.s * 0.6, c.s * 0.26, 0, 0, Math.PI * 2);
      ctx.ellipse(x - c.s * 0.55, y + 8, c.s * 0.55, c.s * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSea(state, horizonY) {
    const sea = ctx.createLinearGradient(0, horizonY, 0, FIELD.height);
    sea.addColorStop(0, PALETTE.seaShallow);
    sea.addColorStop(1, PALETTE.seaDeep);
    ctx.fillStyle = sea;
    ctx.fillRect(0, horizonY, FIELD.width, FIELD.height - horizonY);
    // Wave streaks scrolling with speed.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i += 1) {
      const y = horizonY + 26 + i * i * 2.4 + ((state.distance * 2 + i * 53) % 36);
      if (y > FIELD.height - 4) continue;
      const off = (state.distance * (1 + i * 0.2)) % 220;
      ctx.beginPath();
      ctx.moveTo(-off, y);
      ctx.lineTo(180 - off, y);
      ctx.moveTo(420 - off, y + 6);
      ctx.lineTo(700 - off, y + 6);
      ctx.moveTo(900 - off, y);
      ctx.lineTo(1280 - off, y);
      ctx.stroke();
    }
  }

  function drawIslands(state, horizonY) {
    for (const island of ISLANDS) {
      const ahead = island.from - state.distance;
      const behind = state.distance - island.to;
      if (ahead > 2600 || behind > 400) continue;
      const scale = 700 / (Math.max(0, ahead) + 520);
      const cx = FIELD.width / 2 - state.lateral * scale * 1.1;
      const w = (island.to - island.from) * scale * 0.62;
      const peak = island.height * scale * 0.9;
      const baseY = horizonY + 26;
      if (island.volcano) {
        // A steep cone with a smoking crater.
        ctx.fillStyle = PALETTE.volcanoRock;
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, baseY);
        ctx.lineTo(cx - 26 * scale, baseY - peak);
        ctx.lineTo(cx + 26 * scale, baseY - peak);
        ctx.lineTo(cx + w / 2, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALETTE.jungle;
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, baseY);
        ctx.quadraticCurveTo(cx - w * 0.28, baseY - peak * 0.45, cx - 26 * scale, baseY - peak);
        ctx.lineTo(cx + 26 * scale, baseY - peak);
        ctx.quadraticCurveTo(cx + w * 0.28, baseY - peak * 0.45, cx + w / 2, baseY);
        ctx.closePath();
        ctx.fill();
        // Smoke puffs rising off the crater, drifting with the clock.
        ctx.fillStyle = 'rgba(207, 200, 189, 0.75)';
        for (let i = 0; i < 4; i += 1) {
          const rise = ((state.time * 14 + i * 34) % 120) + 10;
          ctx.beginPath();
          ctx.arc(cx + i * 8 - 12 + Math.sin(state.time + i) * 6, baseY - peak - rise, 10 + i * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // A green hill with a sand fringe at the waterline.
        ctx.fillStyle = PALETTE.sand;
        ctx.beginPath();
        ctx.ellipse(cx, baseY + 4, w / 2 + 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = island.runway ? PALETTE.islandNear : PALETTE.islandNear;
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, baseY);
        ctx.quadraticCurveTo(cx, baseY - peak, cx + w / 2, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALETTE.jungle;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.32, baseY - peak * 0.12);
        ctx.quadraticCurveTo(cx, baseY - peak * 0.95, cx + w * 0.32, baseY - peak * 0.12);
        ctx.closePath();
        ctx.fill();
      }
      if (island.runway) drawRunway(state, horizonY, cx);
    }
  }

  /** The landing strip on the runway island, drawn in perspective. */
  function drawRunway(state, horizonY, cx) {
    const ahead = 8520 - state.distance;
    if (ahead > 2600 || ahead < -500) return;
    const nearY = FIELD.height - 6;
    const farY = horizonY + 34;
    const nearHalf = 150;
    const farHalf = 24;
    const stripX = cx - state.lateral * 0.2;
    ctx.fillStyle = PALETTE.runway;
    ctx.beginPath();
    ctx.moveTo(stripX - nearHalf, nearY);
    ctx.lineTo(stripX - farHalf, farY);
    ctx.lineTo(stripX + farHalf, farY);
    ctx.lineTo(stripX + nearHalf, nearY);
    ctx.closePath();
    ctx.fill();
    // Centre dashes shrinking into the distance.
    ctx.fillStyle = PALETTE.runwayMark;
    for (let i = 0; i < 4; i += 1) {
      const t = i / 4;
      const y = nearY - (nearY - farY) * t;
      const half = nearHalf - (nearHalf - farHalf) * t;
      ctx.fillRect(stripX - half * 0.06, y - 14 + t * 10, half * 0.12, 22 - t * 12);
    }
    // Threshold bars at the near end.
    ctx.fillRect(stripX - nearHalf * 0.7, nearY - 26, nearHalf * 1.4, 6);
    // A windsock on the strip's edge, pointing into the wind.
    const sockX = stripX + nearHalf + 34;
    ctx.strokeStyle = '#d8d3c4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sockX, nearY - 8);
    ctx.lineTo(sockX, nearY - 52);
    ctx.stroke();
    ctx.fillStyle = '#e8542f';
    ctx.beginPath();
    ctx.moveTo(sockX, nearY - 52);
    ctx.lineTo(sockX + 26 + state.gust, nearY - 46);
    ctx.lineTo(sockX, nearY - 38);
    ctx.closePath();
    ctx.fill();
  }

  /** Project a world point ahead of the plane onto the screen, or null when out of view. */
  function project(state, horizonY, objD, objX, objAlt) {
    const ahead = objD - state.distance;
    if (ahead < -80 || ahead > RING.drawDistance) return null;
    const s = 620 / (ahead + 140);
    return {
      x: FIELD.width / 2 + (objX - state.lateral) * 3.28084 * s * 0.9,
      y: horizonY - (objAlt - state.altitude) * s * 0.9,
      r: Math.min(240, RING.radius * s * 0.9),
      ahead,
    };
  }

  function drawRings(state, horizonY) {
    const next = state.rings.find((r) => !r.passed && !r.missed);
    for (const ring of state.rings) {
      if (ring.passed || ring.missed) continue;
      const p = project(state, horizonY, ring.d, ring.x, ring.alt);
      if (!p) continue;
      const isNext = ring === next;
      ctx.save();
      ctx.shadowColor = PALETTE.ringGlow;
      ctx.shadowBlur = isNext ? 26 : 10;
      ctx.strokeStyle = isNext ? PALETTE.ringNext : 'rgba(255, 197, 61, 0.55)';
      ctx.lineWidth = Math.max(3, p.r * 0.12);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.92, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = Math.max(1.5, p.r * 0.03);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * 0.82, p.r * 0.75, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // A distance tag under the next ring.
      if (isNext && p.r > 26) {
        ctx.fillStyle = PALETTE.text;
        ctx.font = `600 ${Math.max(13, p.r * 0.22)}px ${'ui-monospace, monospace'}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(p.ahead)} m`, p.x, p.y + p.r + 24);
      }
    }
    // Arrow toward the next ring when it sits off-screen.
    if (next) {
      const p = project(state, horizonY, next.d, next.x, next.alt);
      if (p && (p.x < 90 || p.x > FIELD.width - 90)) {
        const left = p.x < 90;
        const ax = left ? 46 : FIELD.width - 46;
        ctx.fillStyle = PALETTE.ringNext;
        ctx.beginPath();
        if (left) {
          ctx.moveTo(ax - 18, 360);
          ctx.lineTo(ax + 14, 336);
          ctx.lineTo(ax + 14, 384);
        } else {
          ctx.moveTo(ax + 18, 360);
          ctx.lineTo(ax - 14, 336);
          ctx.lineTo(ax - 14, 384);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawPlane(state) {
    const bob = Math.sin(state.time * 2.2) * 2;
    ctx.save();
    ctx.translate(FIELD.width / 2, 548 + bob);
    ctx.rotate((state.bank * Math.PI) / 180);
    const scale = 1 + (state.speed / 185) * 0.05;
    ctx.scale(scale, scale);
    // Wings, wide and slightly swept.
    ctx.fillStyle = PALETTE.planeWing;
    ctx.beginPath();
    ctx.moveTo(-168, 6);
    ctx.lineTo(-30, -16);
    ctx.lineTo(-24, 12);
    ctx.lineTo(-160, 26);
    ctx.closePath();
    ctx.moveTo(168, 6);
    ctx.lineTo(30, -16);
    ctx.lineTo(24, 12);
    ctx.lineTo(160, 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.planeTrim;
    ctx.fillRect(-168, 4, 336, 4);
    // Tailplane.
    ctx.fillStyle = PALETTE.planeWing;
    ctx.beginPath();
    ctx.moveTo(-64, -52);
    ctx.lineTo(-14, -62);
    ctx.lineTo(-10, -46);
    ctx.lineTo(-58, -38);
    ctx.closePath();
    ctx.moveTo(64, -52);
    ctx.lineTo(14, -62);
    ctx.lineTo(10, -46);
    ctx.lineTo(58, -38);
    ctx.closePath();
    ctx.fill();
    // Fuselage, seen from behind: tail cone, body, fin.
    ctx.fillStyle = PALETTE.planeBody;
    ctx.beginPath();
    ctx.moveTo(-26, 34);
    ctx.quadraticCurveTo(-30, -30, -16, -66);
    ctx.lineTo(16, -66);
    ctx.quadraticCurveTo(30, -30, 26, 34);
    ctx.quadraticCurveTo(0, 44, -26, 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.planeTrim;
    ctx.fillRect(-26, -8, 52, 5);
    // Fin with the mail run's mark.
    ctx.fillStyle = PALETTE.planeTrim;
    ctx.beginPath();
    ctx.moveTo(-8, -62);
    ctx.lineTo(0, -96);
    ctx.lineTo(10, -62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4f1e6';
    ctx.font = '700 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MMR', 0, -70);
    // Navigation lights: red port, green starboard, white strobe.
    const blink = Math.sin(state.time * 6) > 0;
    ctx.fillStyle = blink ? '#ff4d4d' : '#7a1f1f';
    ctx.beginPath();
    ctx.arc(-168, 14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = blink ? '#4dff88' : '#1f7a44';
    ctx.beginPath();
    ctx.arc(168, 14, 5, 0, Math.PI * 2);
    ctx.fill();
    if (Math.sin(state.time * 3) > 0.7) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 40, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    rr(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawHud(state) {
    // Top instrument bar.
    const labels = [
      ['ALT', `${Math.round(state.altitude)} FT`],
      ['SPD', `${Math.round(state.speed)} KT`],
      ['HDG', `${String(Math.round(((state.heading % 360) + 360) % 360)).padStart(3, '0')}°`],
      ['V/S', `${state.vspeed >= 0 ? '+' : ''}${Math.round(state.vspeed * 60)} FT/M`],
    ];
    let x = 16;
    for (const [label, value] of labels) {
      panel(x, 14, 148, 52);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 12, 32);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '700 20px ui-monospace, monospace';
      ctx.fillText(value, x + 12, 56);
      x += 160;
    }
    // Throttle + fuel.
    panel(x, 14, 190, 52);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText('THR', x + 12, 32);
    ctx.fillStyle = '#2c4a63';
    rr(ctx, x + 58, 22, 118, 12, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.warn;
    rr(ctx, x + 58, 22, 118 * state.throttle, 12, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('FUEL', x + 12, 56 - 8);
    ctx.fillStyle = '#2c4a63';
    rr(ctx, x + 58, 44, 118, 12, 6);
    ctx.fill();
    ctx.fillStyle = state.fuel > 25 ? PALETTE.good : PALETTE.bad;
    rr(ctx, x + 58, 44, 118 * (state.fuel / 100), 12, 6);
    ctx.fill();
    x += 202;
    // Score + rings, top right.
    panel(1000, 14, 264, 52);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 1012, 32);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 20px ui-monospace, monospace';
    ctx.fillText(String(state.score), 1012, 56);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.ringNext;
    ctx.font = '700 20px ui-monospace, monospace';
    ctx.fillText(`RING ${state.ringsPassed}/${COURSE.rings}`, 1252, 56);
    ctx.textAlign = 'left';

    // Bottom instrument strip: artificial horizon, compass tape, message line.
    panel(16, 636, 220, 68);
    const ax = 52;
    const ay = 670;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, ay, 26, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(ax, ay);
    ctx.rotate((-state.bank * Math.PI) / 180);
    ctx.translate(0, state.pitch * 1.1);
    ctx.fillStyle = '#7fb2e0';
    ctx.fillRect(-30, -30, 60, 30);
    ctx.fillStyle = '#8a6b46';
    ctx.fillRect(-30, 0, 60, 30);
    ctx.restore();
    ctx.strokeStyle = PALETTE.text;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ax, ay, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax - 26, ay);
    ctx.lineTo(ax + 26, ay);
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.beginPath();
    ctx.moveTo(ax - 4, ay + 2);
    ctx.lineTo(ax + 4, ay + 2);
    ctx.lineTo(ax, ay + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText('ATTITUDE', 92, 656);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 15px ui-monospace, monospace';
    ctx.fillText(`BANK ${Math.round(state.bank)}°`, 92, 676);
    ctx.fillText(`PITCH ${Math.round(state.pitch)}°`, 92, 694);

    // Compass tape across the bottom centre.
    panel(480, 636, 320, 68);
    const heading = ((state.heading % 360) + 360) % 360;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    for (let d = -45; d <= 45; d += 15) {
      const h = Math.round((heading + d) / 15) * 15;
      const norm = ((h % 360) + 360) % 360;
      const px = 640 + d * 3.2;
      const name = norm === 0 ? 'N' : norm === 90 ? 'E' : norm === 180 ? 'S' : norm === 270 ? 'W' : String(norm);
      ctx.fillStyle = norm % 90 === 0 ? PALETTE.text : PALETTE.muted;
      ctx.fillText(name, px, 668);
      ctx.fillRect(px - 1, 676, 2, d % 45 === 0 ? 12 : 7);
    }
    ctx.fillStyle = PALETTE.ringNext;
    ctx.beginPath();
    ctx.moveTo(640, 640);
    ctx.lineTo(632, 652);
    ctx.lineTo(648, 652);
    ctx.closePath();
    ctx.fill();

    // Next-ring distance, bottom right.
    const next = state.rings.find((r) => !r.passed && !r.missed);
    panel(1044, 636, 220, 68);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(next ? 'NEXT RING' : 'RUNWAY', 1056, 656);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 15px ui-monospace, monospace';
    ctx.fillText(
      next ? `${Math.max(0, Math.round(next.d - state.distance))} m · ${Math.round(next.alt)} FT` : 'LAND ON THE STRIP',
      1056,
      678,
    );
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText('W/S THROTTLE · ARROWS FLY · P PAUSE · M SOUND', 1056, 696);

    // Centre message.
    if (state.messageTimer > 0 && state.message) {
      ctx.globalAlpha = clamp(state.messageTimer, 0, 1);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '700 26px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.message, FIELD.width / 2, 120);
      ctx.globalAlpha = 1;
    }
    // Warnings.
    const ground = terrainHeight(state.distance);
    const clearance = state.altitude - ground;
    if (state.phase === 'flying' && clearance < 70 && clearance > 2 && state.vspeed < 0) {
      ctx.fillStyle = Math.sin(state.time * 10) > 0 ? PALETTE.bad : '#ffb3ad';
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PULL UP!', FIELD.width / 2, 470);
    }
    if (state.phase === 'flying' && state.speed < 55 && clearance > 2) {
      ctx.fillStyle = PALETTE.warn;
      ctx.font = '800 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STALL — NOSE DOWN, THROTTLE UP', FIELD.width / 2, 500);
    }
    if (state.phase === 'fuel') {
      ctx.fillStyle = PALETTE.bad;
      ctx.font = '800 26px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OUT OF FUEL — GLIDE HER DOWN', FIELD.width / 2, 160);
    }
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 14, 24, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = accent;
    ctx.font = '800 54px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, FIELD.width / 2, 240);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '400 20px system-ui, sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 290 + i * 32));
  }

  function draw(state, screen, best) {
    const horizonY = clamp(330 + state.pitch * 7, 250, 450);
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    ctx.save();
    ctx.translate(FIELD.width / 2, 360);
    ctx.rotate((state.bank * Math.PI) / 180 * 0.12);
    ctx.translate(-FIELD.width / 2, -360);
    drawSky(state, horizonY);
    drawSea(state, horizonY);
    drawIslands(state, horizonY);
    if (screen !== SCREEN_TITLE) drawRings(state, horizonY);
    ctx.restore();
    drawPlane(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_OVER) drawHud(state);
    if (screen === SCREEN_TITLE) {
      overlay('MERAPI MAIL RUN', [
        'Bush-pilot mail run across the islands — eight rings, one runway.',
        'Arrows fly · W/S throttle · mouse steers too · Space to take off',
        best > 0 ? `Best score: ${best}` : 'First flight: the mail must get through.',
      ], PALETTE.ringNext);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '700 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS SPACE OR CLICK TO FLY', FIELD.width / 2, 470);
    } else if (screen === SCREEN_PAUSED) {
      overlay('PAUSED', ['Press P to keep flying.'], PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      if (state.phase === 'landed') {
        overlay('MAIL DELIVERED!', [
          `Score ${state.score} · rings ${state.ringsPassed}/${COURSE.rings} · time ${Math.round(state.time)} s`,
          best > 0 ? `Best score: ${best}` : '',
          'Press SPACE to fly the run again.',
        ], PALETTE.good);
      } else {
        overlay('CRASHED', [
          `The mail run ended ${state.crashReason || 'in the sea'}.`,
          `Score ${state.score} · rings ${state.ringsPassed}/${COURSE.rings}`,
          'Press SPACE to try the run again.',
        ], PALETTE.bad);
      }
    }
  }

  return { draw };
}
