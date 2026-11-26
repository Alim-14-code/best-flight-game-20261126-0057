// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.
// Distances along the course are metres; altitudes are feet; speeds are knots.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The whole mail run, from the home strip to the far island's runway, in metres. */
export const COURSE = { length: 9000, rings: 8 };

/** The plane's flight envelope. */
export const PLANE = {
  /** Knots at idle and at full throttle. */
  minSpeed: 40,
  maxSpeed: 185,
  /** Knots per second the speed chases its throttle target. */
  speedResponse: 9,
  /** Stall below this speed: the nose drops and the controls go mushy. */
  stallSpeed: 55,
  /** Sink rate, ft/s, while stalled. */
  stallSink: 26,
  /** Feet per second in one knot: vertical speed = speed * this * tan(pitch). */
  knotToFps: 1.6878,
  /** Speed bled, kt/s, per degree of nose-up pitch. */
  pitchDrag: 0.12,
  /** Heading change, deg/s, per degree of bank. */
  turnPerBank: 0.16,
  /** Bank change, deg/s, at full stick. */
  bankRate: 70,
  maxBank: 48,
  /** Pitch change, deg/s, at full stick. */
  pitchRate: 16,
  maxPitchUp: 14,
  maxPitchDown: -11,
  /** Lateral metres the plane may stray from the course centreline. */
  maxLateral: 420,
};

/** Fuel: seconds of full-throttle flight a full tank buys; rings top it up. */
export const FUEL = { seconds: 260, ringBonus: 9, start: 100 };

export const RING = {
  /** Ring radius, in feet of lateral + vertical miss. */
  radius: 95,
  /** Inside this miss the ring counts as a clean centre pass. */
  centre: 42,
  points: 100,
  centreBonus: 50,
  /** How far ahead, in metres, a ring first appears on screen. */
  drawDistance: 2600,
};

export const LANDING = {
  /** Landing only counts inside this distance band, on the runway island. */
  from: 8520,
  to: 8980,
  /** Touch down gently: vertical speed above this (ft/s down) is a crash. */
  maxSink: 9,
  /** And slow enough to stop on the strip. */
  maxSpeed: 125,
  points: 500,
};

export const PALETTE = {
  skyTop: '#16345f',
  skyMid: '#3f6ea6',
  skyHorizon: '#f2a65e',
  sun: '#ffd98a',
  seaDeep: '#0e4a6b',
  seaShallow: '#2f8fae',
  sand: '#e8d39a',
  islandFar: '#5d7d5a',
  islandNear: '#3f7a44',
  jungle: '#2c5e33',
  volcanoRock: '#6b4a3a',
  volcanoSmoke: '#cfc8bd',
  cloud: '#ffffff',
  runway: '#3a3f46',
  runwayMark: '#f5f2e8',
  ringNext: '#ffc53d',
  ringPassed: '#58d68d',
  ringGlow: '#ffdf80',
  planeBody: '#e8542f',
  planeWing: '#f4f1e6',
  planeTrim: '#1d3557',
  panel: 'rgba(12, 20, 32, 0.78)',
  panelEdge: '#4a6a8a',
  text: '#eef3f6',
  muted: '#9fb4c4',
  good: '#7be495',
  warn: '#ffc53d',
  bad: '#ff6b5e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'merapi-mail-run.best';
