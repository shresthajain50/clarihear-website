import {readFileSync} from 'node:fs';
import {vi} from 'vitest';

const html = readFileSync('index.html', 'utf8');
/** The index body without scripts, as the browser receives it before JS runs. */
export const indexBody = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)![1].replace(/<script[\s\S]*?<\/script>/g, '');

/** An IntersectionObserver that reports every observed element as on screen straight away. */
export function stubVisibleIntersectionObserver(): void {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(target: Element) {
        const entry = {isIntersecting: true, intersectionRatio: 1, target} as unknown as IntersectionObserverEntry;
        queueMicrotask(() => this.cb([entry], this as unknown as IntersectionObserver));
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
}

/** An IntersectionObserver that reports nothing until `showAll()` puts every observed element on screen. */
export function stubManualIntersectionObserver(): {showAll: () => void} {
  const observers: Array<{cb: IntersectionObserverCallback; self: unknown; targets: Set<Element>}> = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private rec: {cb: IntersectionObserverCallback; self: unknown; targets: Set<Element>};
      constructor(cb: IntersectionObserverCallback) {
        this.rec = {cb, self: this, targets: new Set()};
        observers.push(this.rec);
      }
      observe(target: Element) {
        this.rec.targets.add(target);
      }
      unobserve(target: Element) {
        this.rec.targets.delete(target);
      }
      disconnect() {
        this.rec.targets.clear();
      }
      takeRecords() {
        return [];
      }
    },
  );
  return {
    showAll: () => {
      for (const o of observers) {
        const entries = [...o.targets].map(
          target => ({isIntersecting: true, intersectionRatio: 1, target}) as unknown as IntersectionObserverEntry,
        );
        if (entries.length) o.cb(entries, o.self as IntersectionObserver);
      }
    },
  };
}
