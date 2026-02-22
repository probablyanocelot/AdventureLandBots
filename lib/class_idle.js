class Idle {
  constructor() {
    this.counter = 0;
    this._running = false;
    this._timer = null;
  }

  async startIdle() {
    if (this._running) return;
    this._running = true;

    const tick = async () => {
      if (!this._running) return;

      if (character.moving || smart.moving) {
        // Reset counter if character is moving
        this.counter = -1;
      }
      this.counter++;
      if (this.counter % 5 === 0) {
        console.log(this.counter + " seconds idle.");
      }

      // Idle behavior implementation
      this._timer = setTimeout(() => {
        tick();
      }, 1000); // Run every second
    };

    await tick();
  }

  stop() {
    this._running = false;
    if (!this._timer) return;
    try {
      clearTimeout(this._timer);
    } catch {
      // ignore
    }
    this._timer = null;
  }

  dispose() {
    this.stop();
  }

  [Symbol.dispose]() {
    this.stop();
  }

  async [Symbol.asyncDispose]() {
    this.stop();
  }
}

module.exports = { Idle };
