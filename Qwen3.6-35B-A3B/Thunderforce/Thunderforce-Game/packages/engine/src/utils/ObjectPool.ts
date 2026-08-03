/** Generic object pool to avoid per-frame allocations. */
export class ObjectPool<T extends { reset(): void }> {
  private readonly pool: T[] = [];
  private readonly factory: () => T;
  private readonly onRelease?: (obj: T) => void;
  private _activeCount = 0;

  constructor(factory: () => T, onRelease?: (obj: T) => void, initialCapacity = 64) {
    this.factory = factory;
    this.onRelease = onRelease;
    for (let i = 0; i < initialCapacity; i++) {
      this.pool.push(factory());
    }
  }

  /** Get an active object from the pool. */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  /** Return an object to the pool. */
  release(obj: T): void {
    this.onRelease?.(obj);
    obj.reset();
    this.pool.push(obj);
  }

  /** Get the number of available (inactive) objects. */
  available(): number {
    return this.pool.length;
  }

  /** Get total capacity (available + active). */
  capacity(): number {
    return this.pool.length + this._activeCount;
  }

  get activeCount(): number {
    return this._activeCount;
  }

  /** Mark an object as active. Call from acquire consumer. */
  markActive(_obj: T): void {
    this._activeCount++;
  }

  /** Mark an object as inactive. Call before release. */
  markInactive(_obj: T): void {
    this._activeCount--;
  }

  /** Get all currently active (checked-out) objects. */
  getActive(): T[] {
    return []; // pool doesn't track active objects; callers iterate their own refs
  }

  /** Dispose and clear all pooled objects. */
  clear(): void {
    for (const obj of this.pool) {
      if (typeof (obj as any).dispose === 'function') {
        (obj as any).dispose();
      }
    }
    this.pool.length = 0;
    this._activeCount = 0;
  }
}
