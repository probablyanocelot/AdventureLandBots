class Idle {
  constructor() {
    this._idleCounter = 0;
  }

  get idleCounter() {
    return this._idleCounter;
  }
  set idleCounter(count) {
    this._idleCounter = count;
  }

  async startIdle() {
    if (character.moving || smart.moving) {
      // Reset counter if character is moving
      this.idleCounter = -1;
    }
    this.idleCounter++;
    if (this.idleCounter % 5 === 0) {
      console.log(this.idleCounter + " seconds idle.");
    }

    // Idle behavior implementation
    setTimeout(() => {
      this.startIdle();
    }, 1000); // Run every second
  }
}
