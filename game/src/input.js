// Keyboard and mouse state, gathered from the canvas and the window and
// read by the world as plain fields. Nothing here knows the game's rules:
// it only remembers what is held, what was just pressed, and where the
// pointer is in world coordinates.

/** The keys the game listens to, by code. */
const TRACKED = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight', 'KeyP', 'KeyM', 'Enter', 'Escape',
  'Digit1', 'Digit2', 'Digit3',
]);

/** One input device set: held keys, edge presses, pointer and buttons. */
export class Input {
  constructor(canvas, view) {
    this.canvas = canvas;
    this.view = view;
    this.held = new Set();
    this.pressed = new Set();
    this.pointer = { x: view.width / 2, y: view.height / 2, down: false, clicked: false };
    this.attach();
  }

  /** Wire the listeners; called once from the constructor. */
  attach() {
    window.addEventListener('keydown', (event) => {
      if ( !TRACKED.has(event.code) ) return;
      event.preventDefault();
      if ( !event.repeat ) this.pressed.add(event.code);
      this.held.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.held.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
      this.pointer.down = false;
    });
    this.canvas.addEventListener('pointermove', (event) => this.trackPointer(event));
    this.canvas.addEventListener('pointerdown', (event) => {
      this.trackPointer(event);
      this.pointer.down = true;
      this.pointer.clicked = true;
    });
    window.addEventListener('pointerup', () => {
      this.pointer.down = false;
    });
  }

  /** Convert a pointer event's client position into world coordinates. */
  trackPointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = (event.clientX - rect.left) * (this.view.width / rect.width);
    this.pointer.y = (event.clientY - rect.top) * (this.view.height / rect.height);
  }

  /** True while any of the given codes is held. */
  down(...codes) {
    return codes.some((code) => this.held.has(code));
  }

  /** True only on the step where one of the given codes was first pressed. */
  tapped(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  /** The movement axis the keys ask for, each side in -1, 0 or 1. */
  axis() {
    const x = (this.down('KeyD', 'ArrowRight') ? 1 : 0) - (this.down('KeyA', 'ArrowLeft') ? 1 : 0);
    const y = (this.down('KeyS', 'ArrowDown') ? 1 : 0) - (this.down('KeyW', 'ArrowUp') ? 1 : 0);
    return { x, y };
  }

  /** Whether the player is asking to fire this step. */
  firing() {
    return this.pointer.down || this.down('Space');
  }

  /** Clear the edge presses; the main loop calls this after each step. */
  endStep() {
    this.pressed.clear();
    this.pointer.clicked = false;
  }
}
