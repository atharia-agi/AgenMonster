// Speech animation — typewriter effect for speech bubbles.

export class SpeechAnimator {
  private text: string = '';
  private displayedChars: number = 0;
  private speed: number = 50;
  private timer: ReturnType<typeof setInterval> | null = null;
  private onComplete: (() => void) | null = null;

  start(text: string, speed = 50, onComplete?: () => void) {
    this.stop();
    this.text = text;
    this.displayedChars = 0;
    this.speed = speed;
    this.onComplete = onComplete || null;
    this.timer = setInterval(() => {
      this.displayedChars++;
      if (this.displayedChars >= this.text.length) {
        this.stop();
        this.onComplete?.();
      }
    }, speed);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getDisplayedText(): string {
    return this.text.slice(0, this.displayedChars);
  }

  isComplete(): boolean {
    return this.displayedChars >= this.text.length;
  }

  getProgress(): number {
    return this.text.length > 0 ? this.displayedChars / this.text.length : 1;
  }
}
