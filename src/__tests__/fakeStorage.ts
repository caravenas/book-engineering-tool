/**
 * A minimal, in-memory `Storage` for injecting into the user layer module
 * and the store's `createBookStore`, instead of touching the browser's real
 * `localStorage`. `throwOnWrite`/`throwOnRead` are mutable so a test can flip
 * a working storage into a failing one mid-session, the same way a real quota
 * fills up after the app has already been using storage successfully.
 */
export class FakeStorage implements Storage {
  private data = new Map<string, string>();
  throwOnRead: boolean;
  throwOnWrite: boolean;

  constructor(options: { throwOnRead?: boolean; throwOnWrite?: boolean } = {}) {
    this.throwOnRead = options.throwOnRead ?? false;
    this.throwOnWrite = options.throwOnWrite ?? false;
  }

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    if (this.throwOnRead) {
      throw new DOMException('Storage access blocked', 'SecurityError');
    }
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  removeItem(key: string): void {
    if (this.throwOnWrite) {
      throw new DOMException('Storage access blocked', 'SecurityError');
    }
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.throwOnWrite) {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    }
    this.data.set(key, value);
  }

  /** Write directly to the backing map, bypassing `throwOnWrite`, to seed a raw value for a test. */
  seed(key: string, value: string): void {
    this.data.set(key, value);
  }
}
