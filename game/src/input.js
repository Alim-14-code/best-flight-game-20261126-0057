// Keyboard and pointer input. Held keys steer the plane; one-shot presses (start, pause,
// mute, restart) are queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice. The mouse steers while held: where the pointer
// sits relative to the canvas centre is the stick.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;

const ROLL_LEFT = new Set(['ArrowLeft', 'KeyA']);
const ROLL_RIGHT = new Set(['ArrowRight', 'KeyD']);
const PITCH_UP = new Set(['ArrowUp', 'KeyW']);
const PITCH_DOWN = new Set(['ArrowDown', 'KeyS']);
const THROTTLE_UP = new Set(['ShiftLeft', 'ShiftRight', 'KeyE']);
const THROTTLE_DOWN = new Set(['ControlLeft', 'ControlRight', 'KeyQ']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const RESTART = new Set(['KeyR']);

export function createInput(target) {
  const keys = new Set();
  let actions = 0;
  let pointer = null;

  window.addEventListener('keydown', (event) => {
    if (ROLL_LEFT.has(event.code) || ROLL_RIGHT.has(event.code) ||
        PITCH_UP.has(event.code) || PITCH_DOWN.has(event.code) ||
        THROTTLE_UP.has(event.code) || THROTTLE_DOWN.has(event.code)) {
      keys.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    keys.clear();
    pointer = null;
  });

  function readPointer(event) {
    const rect = target.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
    };
  }
  target.addEventListener('pointerdown', (event) => {
    pointer = readPointer(event);
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointermove', (event) => {
    if (pointer) pointer = readPointer(event);
  });
  target.addEventListener('pointerup', () => {
    pointer = null;
  });
  target.addEventListener('pointercancel', () => {
    pointer = null;
  });

  const has = (set) => [...set].some((code) => keys.has(code));

  return {
    /** Steering for this frame: roll and pitch in -1..1, throttle nudged up/down. */
    steering() {
      let roll = (has(ROLL_RIGHT) ? 1 : 0) - (has(ROLL_LEFT) ? 1 : 0);
      let pitch = (has(PITCH_UP) ? 1 : 0) - (has(PITCH_DOWN) ? 1 : 0);
      if (pointer) {
        roll = Math.max(-1, Math.min(1, pointer.x * 1.4));
        pitch = Math.max(-1, Math.min(1, -pointer.y * 1.4));
      }
      const throttle = (has(THROTTLE_UP) ? 1 : 0) - (has(THROTTLE_DOWN) ? 1 : 0);
      return { roll, pitch, throttle };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
