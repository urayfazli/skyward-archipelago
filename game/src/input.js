// Skyward Archipelago — keyboard and mouse input.
// Keyboard flies the plane (arrows / WASD), the mouse can take over pitch and
// roll while its button is held, and the wheel trims the throttle.

export class Input {
  constructor(domElement) {
    this.keys = new Set();
    this.mouseDown = false;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheelTrim = 0;
    this.anyKeyPressed = false;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (!this.keys.has(event.code)) this.anyKeyPressed = true;
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.keys.clear());

    domElement.addEventListener('mousedown', (event) => {
      this.mouseDown = true;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    window.addEventListener('mousemove', (event) => {
      if (!this.mouseDown) return;
      this.mouseDX += event.clientX - this.lastX;
      this.mouseDY += event.clientY - this.lastY;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
    });
    domElement.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.wheelTrim += event.deltaY < 0 ? 0.04 : -0.04;
      this.wheelTrim = Math.max(-0.3, Math.min(0.3, this.wheelTrim));
    }, { passive: false });
  }

  down(code) {
    return this.keys.has(code);
  }

  // Continuous control axes in the range -1..1.
  axes() {
    let pitch = 0;
    let roll = 0;
    if (this.down('ArrowUp') || this.down('KeyW')) pitch -= 1;
    if (this.down('ArrowDown') || this.down('KeyS')) pitch += 1;
    if (this.down('ArrowLeft') || this.down('KeyA')) roll -= 1;
    if (this.down('ArrowRight') || this.down('KeyD')) roll += 1;

    if (this.mouseDown) {
      roll += Math.max(-1, Math.min(1, this.mouseDX * 0.012));
      pitch += Math.max(-1, Math.min(1, this.mouseDY * 0.012));
    }
    this.mouseDX *= 0.55;
    this.mouseDY *= 0.55;

    return {
      pitch: Math.max(-1, Math.min(1, pitch)),
      roll: Math.max(-1, Math.min(1, roll)),
    };
  }

  throttleDelta() {
    let delta = this.wheelTrim;
    this.wheelTrim = 0;
    if (this.down('ShiftLeft') || this.down('ShiftRight') || this.down('KeyE')) delta += 0.55;
    if (this.down('ControlLeft') || this.down('KeyQ')) delta -= 0.55;
    return delta;
  }

  brakeHeld() {
    return this.down('KeyB') || this.down('Space');
  }

  consumeAnyKey() {
    const was = this.anyKeyPressed;
    this.anyKeyPressed = false;
    return was;
  }
}
