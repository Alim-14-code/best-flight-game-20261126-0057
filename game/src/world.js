// The mail run's world: one bush plane, one course across the archipelago, eight rings and a
// runway at the end. The simulation advances in fixed 1/60 s steps and knows nothing about the
// screen: it takes steering (roll, pitch, throttle target) and reports what happened.

import { COURSE, FUEL, LANDING, PLANE, RING, STEP } from './config.js';

export const EVENT_RING = 1;
export const EVENT_OVER = 2;

/** Where the eight rings sit along the course (metres), before seeded jitter. */
const RING_SPOTS = [
  { d: 900, alt: 350, x: 0 },
  { d: 1900, alt: 480, x: -160 },
  { d: 3000, alt: 300, x: 140 },
  { d: 3900, alt: 620, x: -60 },
  { d: 5000, alt: 780, x: 180 },
  { d: 5900, alt: 420, x: -200 },
  { d: 6900, alt: 560, x: 90 },
  { d: 7900, alt: 300, x: 0 },
];

/** A smooth hill between `from` and `to`, peaking at `height` feet. */
function hill(d, from, to, height) {
  if (d < from || d > to) return 0;
  const t = (d - from) / (to - from);
  return height * Math.sin(Math.PI * t);
}

/** Terrain height, in feet, at a distance along the course: sea is 0. */
export function terrainHeight(d) {
  let h = 0;
  // The home strip: a flat shelf the run starts on.
  if (d < 300) h = Math.max(h, 30);
  h = Math.max(h, hill(d, 1000, 2300, 140));
  // The volcano cone: a steep triangle peaking at 720 ft.
  if (d > 4000 && d < 5600) {
    const peak = 4800;
    const up = (d - 4000) / (peak - 4000);
    const down = (5600 - d) / (5600 - peak);
    h = Math.max(h, 720 * Math.min(up, down));
  }
  h = Math.max(h, hill(d, 6600, 7700, 220));
  // The runway island is a flat shelf the strip sits on, starting exactly at the threshold
  // so a plane cannot touch down on the grass short of the strip.
  if (d > 8520 && d < 9000) h = Math.max(h, 30);
  return h;
}

/** True while the plane is over the runway strip. */
export function onRunway(d) {
  return d >= LANDING.from && d <= LANDING.to;
}

function buildRings(random) {
  return RING_SPOTS.map((spot) => ({
    d: spot.d,
    alt: spot.alt + (random() - 0.5) * 120,
    x: spot.x + (random() - 0.5) * 100,
    passed: false,
    centre: false,
    missed: false,
  }));
}

export function createWorld(random) {
  const state = {
    distance: 0,
    lateral: 0,
    altitude: 30,
    speed: 0,
    throttle: 0,
    pitch: 0,
    bank: 0,
    heading: 0,
    fuel: FUEL.start,
    score: 0,
    ringsPassed: 0,
    rings: [],
    /** 'ready' | 'flying' | 'landed' | 'crashed' | 'fuel' */
    phase: 'ready',
    crashReason: '',
    message: '',
    messageTimer: 0,
    time: 0,
    /** Vertical speed, ft/s, for the HUD and the landing check. */
    vspeed: 0,
    /** Lateral wind, m/s, from the seeded gusts. */
    gust: 0,
    /** Best score carried in by the shell (0 when the shot stages its own). */
    best: 0,
  };

  function reset() {
    state.distance = 0;
    state.lateral = 0;
    state.altitude = 30;
    state.speed = 0;
    state.throttle = 0;
    state.pitch = 0;
    state.bank = 0;
    state.heading = 0;
    state.fuel = FUEL.start;
    state.score = 0;
    state.ringsPassed = 0;
    state.rings = buildRings(random);
    state.phase = 'ready';
    state.crashReason = '';
    state.message = '';
    state.messageTimer = 0;
    state.time = 0;
    state.vspeed = 0;
    state.gust = 0;
  }

  function say(text, seconds = 2.5) {
    state.message = text;
    state.messageTimer = seconds;
  }

  /**
   * Advance the world one fixed step. `controls` is { roll, pitch, throttle } with roll and pitch
   * in -1..1 and throttle a 0..1 target; `attract` is true on the title screen, where the plane
   * sits on the home strip with the engine idling. Returns an EVENT_* bitmask.
   */
  function step(dt, controls, attract) {
    if (state.phase === 'landed' || state.phase === 'crashed') return 0;
    const events = 0;
    state.time += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;

    if (attract) {
      // Idle on the home strip: engine warm, plane still, world breathing.
      state.throttle = 0.12;
      state.gust = 4 * Math.sin(state.time * 0.6);
      return events;
    }

    const stalled = state.speed < PLANE.stallSpeed;
    const authority = stalled ? 0.45 : 1;

    // Throttle chases its target; speed chases the throttle.
    const throttleTarget = state.phase === 'fuel' ? 0 : controls.throttle;
    state.throttle += Math.max(-0.6 * dt, Math.min(0.6 * dt, throttleTarget - state.throttle));
    const targetSpeed = PLANE.minSpeed + state.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
    state.speed += Math.max(
      -PLANE.speedResponse * dt,
      Math.min(PLANE.speedResponse * dt, targetSpeed - state.speed),
    );
    // Nose-up pitch bleeds speed; nose-down adds it.
    state.speed -= state.pitch * PLANE.pitchDrag * dt;
    if (state.speed < 0) state.speed = 0;

    // Stick: bank and pitch ease toward the commanded angles.
    const bankTarget = controls.roll * PLANE.maxBank;
    state.bank += Math.max(
      -PLANE.bankRate * dt,
      Math.min(PLANE.bankRate * dt, bankTarget - state.bank),
    ) * authority;
    const pitchTarget =
      controls.pitch >= 0
        ? controls.pitch * PLANE.maxPitchUp
        : controls.pitch * -PLANE.maxPitchDown;
    state.pitch += Math.max(
      -PLANE.pitchRate * dt,
      Math.min(PLANE.pitchRate * dt, pitchTarget - state.pitch),
    ) * authority;

    // Turn, drift and climb.
    state.heading += state.bank * PLANE.turnPerBank * dt;
    const speedMs = state.speed * 0.514444;
    state.gust = 2 * Math.sin(state.distance / 900 + 1.7);
    state.lateral += (speedMs * Math.sin((state.heading * Math.PI) / 180) + state.gust) * dt;
    if (state.lateral > PLANE.maxLateral) {
      state.lateral = PLANE.maxLateral;
      state.heading = Math.min(state.heading, 0);
    } else if (state.lateral < -PLANE.maxLateral) {
      state.lateral = -PLANE.maxLateral;
      state.heading = Math.max(state.heading, 0);
    }
    state.vspeed = state.speed * PLANE.knotToFps * Math.tan((state.pitch * Math.PI) / 180);
    if (stalled) state.vspeed -= PLANE.stallSink;
    state.altitude += state.vspeed * dt;
    state.distance += speedMs * Math.cos((state.heading * Math.PI) / 180) * dt;

    // Fuel: full throttle empties the tank in FUEL.seconds.
    state.fuel -= (0.25 + state.throttle * 0.75) * (100 / FUEL.seconds) * dt;
    if (state.fuel <= 0 && state.phase === 'flying') {
      state.fuel = 0;
      state.phase = 'fuel';
      say('OUT OF FUEL — glide her down!', 4);
    }

    // Rings: crossing one scores by how close the pass was.
    let ringEvents = 0;
    for (const ring of state.rings) {
      if (ring.passed || ring.missed || state.distance < ring.d) continue;
      const miss = Math.hypot((state.lateral - ring.x) * 3.28084, state.altitude - ring.alt);
      if (miss <= RING.radius) {
        ring.passed = true;
        ring.centre = miss <= RING.centre;
        state.ringsPassed += 1;
        const gained = RING.points + (ring.centre ? RING.centreBonus : 0);
        state.score += gained;
        state.fuel = Math.min(100, state.fuel + FUEL.ringBonus);
        say(
          ring.centre
            ? `RING ${state.ringsPassed}/${COURSE.rings} — DEAD CENTRE +${gained}`
            : `RING ${state.ringsPassed}/${COURSE.rings} +${gained}`,
        );
        ringEvents |= EVENT_RING;
      } else {
        ring.missed = true;
        say(`RING ${state.ringsPassed + 1}/${COURSE.rings} MISSED — keep flying`, 2);
      }
    }

    // Terrain: the sea, the hills, the volcano — and the runway, if the landing is gentle.
    const ground = terrainHeight(state.distance);
    if (state.altitude <= ground) {
      state.altitude = ground;
      // Lifting off the home strip, or rolling along it: no drama, just fly.
      if (state.vspeed > 0 || (state.distance < 300 && state.speed < 100)) return ringEvents;
      if (onRunway(state.distance) && state.vspeed >= -LANDING.maxSink && state.speed <= LANDING.maxSpeed) {
        state.phase = 'landed';
        const timeBonus = Math.max(0, Math.round(300 - state.time));
        state.score += LANDING.points + timeBonus;
        say(`MAIL DELIVERED +${LANDING.points + timeBonus}`, 6);
        return ringEvents | EVENT_OVER;
      }
      state.phase = 'crashed';
      state.crashReason =
        onRunway(state.distance)
          ? 'hit the runway too hard'
          : ground === 0
            ? 'ditched in the sea'
            : state.distance > 4000 && state.distance < 5600
              ? 'flew into the volcano'
              : 'hit the hillside';
      say(`CRASHED — ${state.crashReason}`, 6);
      return ringEvents | EVENT_OVER;
    }

    // Past the end of the course without landing: the sea takes the plane.
    if (state.distance >= COURSE.length) {
      state.phase = 'crashed';
      state.crashReason = 'overshot the runway into the sea';
      say('CRASHED — overshot the runway', 6);
      return ringEvents | EVENT_OVER;
    }
    return ringEvents;
  }

  reset();

  return { state, reset, step, say };
}
