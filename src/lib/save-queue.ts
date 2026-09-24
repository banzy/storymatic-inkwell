/** Serializes saves and retains the newest document if an older request fails. */
export class SaveQueue<T> {
  private pending: T | undefined;
  private running: Promise<boolean> | null = null;
  constructor(private readonly persist: (value: T) => Promise<void>) {}
  enqueue(value: T) {
    this.pending = value;
  }
  flush(): Promise<boolean> {
    if (this.running) return this.running;
    this.running = this.drain().finally(() => {
      this.running = null;
    });
    return this.running;
  }
  private async drain() {
    while (this.pending !== undefined) {
      const value = this.pending;
      this.pending = undefined;
      try {
        await this.persist(value);
      } catch {
        if (this.pending === undefined) this.pending = value;
        return false;
      }
    }
    return true;
  }
}
