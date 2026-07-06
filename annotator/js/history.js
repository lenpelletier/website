'use strict';

class History {
  constructor(maxDepth = 20) {
    this.stack = [];
    this.index = -1;
    this.maxDepth = maxDepth;
  }

  push(state) {
    // Remove any redo states beyond current position
    this.stack = this.stack.slice(0, this.index + 1);
    // Add deep copy
    this.stack.push(JSON.parse(JSON.stringify(state)));
    // Trim to max depth
    if (this.stack.length > this.maxDepth) {
      this.stack.shift();
    } else {
      this.index++;
    }
  }

  undo() {
    if (this.index > 0) {
      this.index--;
      return JSON.parse(JSON.stringify(this.stack[this.index]));
    }
    return null;
  }

  redo() {
    if (this.index < this.stack.length - 1) {
      this.index++;
      return JSON.parse(JSON.stringify(this.stack[this.index]));
    }
    return null;
  }

  canUndo() { return this.index > 0; }
  canRedo() { return this.index < this.stack.length - 1; }
}

window.History = History;
