class Idle {
  constructor() {
    this.counter = 0;
  }

  async startIdle() {
    if (character.moving || smart.moving) {
      // Reset counter if character is moving
      this.counter = -1;
    }
    this.counter++;
    if (this.counter % 5 === 0) {
      console.log(this.counter + " seconds idle.");
    }

    // Idle behavior implementation
    setTimeout(() => {
      this.run();
    }, 1000); // Run every second
  }
}

module.exports = { Idle };
