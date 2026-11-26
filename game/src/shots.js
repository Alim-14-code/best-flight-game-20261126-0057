// The screenshot scenes behind ?shot=start|play|approach|end. Each one plays the real rules
// forward from a fresh world, steered by a simple autopilot (bank toward the next ring's lateral
// position, pitch toward its altitude, throttle held at cruise), so the frame is what a short
// game really looks like and the same seed always gives the same frame.
import { COURSE, LANDING, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 55;
const APPROACH_DISTANCE = 8100;
const LIMIT_SECONDS = 600;

function wrapAngle(angle) {
  let wrapped = angle % 360;
  if (wrapped > 180) wrapped -= 360;
  if (wrapped < -180) wrapped += 360;
  return wrapped;
}

/**
 * Steer toward the next ring: bank from the lateral error and the heading error, pitch toward
 * its altitude, cruise throttle. Past the last ring, descend onto the strip and flare.
 */
function autopilot(state) {
  const next = state.rings.find((r) => !r.passed && !r.missed);
  const targetX = next ? next.x : 0;
  const onFinal = !next && state.distance > LANDING.from - 1500;
  // Aim a little below the strip's surface on final: the proportional flare then carries the
  // plane down through 30 ft with a gentle sink instead of levelling off just above it.
  const targetAlt = next ? next.alt : onFinal ? 20 : 120;
  const headingError = wrapAngle(state.heading);
  const roll = Math.max(-1, Math.min(1, (targetX - state.lateral) / 120 - headingError * 0.05));
  const pitchGain = onFinal ? 100 : 160;
  const pitch = Math.max(-1, Math.min(1, (targetAlt - state.altitude) / pitchGain));
  // Ease off the throttle on final approach so the landing speed is legal.
  const throttle = state.distance > LANDING.from - 1200 ? 0.42 : 0.78;
  return { roll, pitch, throttle };
}

/**
 * Set `world` to the named scene (start, play, approach or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  world.state.phase = 'flying';
  if (name !== 'play' && name !== 'approach' && name !== 'end') {
    // Title screen: the plane idles on the home strip.
    world.state.phase = 'ready';
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, autopilot(world.state), true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'play' ? PLAY_SECONDS / STEP : LIMIT_SECONDS / STEP;
  for (let index = 0; index < limit; index += 1) {
    const events = world.step(STEP, autopilot(world.state), false);
    if (name === 'approach' && world.state.distance >= APPROACH_DISTANCE) break;
    if (events & EVENT_OVER) break;
    if (name === 'play' && index >= PLAY_SECONDS / STEP) break;
  }
  const over = world.state.phase === 'landed' || world.state.phase === 'crashed';
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
