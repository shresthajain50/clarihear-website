/** Deterministic pseudo-noise: sum of sines with fixed phases, roughly in [-1, 1]. */
function noise(x: number, t: number): number {
  return (
    Math.sin(x * 23.1 + t * 3.1 + 0.7) * 0.45 +
    Math.sin(x * 41.7 - t * 2.3 + 2.1) * 0.3 +
    Math.sin(x * 67.3 + t * 4.7 + 4.4) * 0.25
  );
}

export function wavePath(t: number, clarity: number, width: number, height: number, points = 120): string {
  const c = Math.min(1, Math.max(0, clarity));
  const mid = height / 2;
  const amp = height * 0.3;
  const jitter = (1 - c) * height * 0.16;
  let d = '';
  for (let i = 0; i <= points; i++) {
    const u = i / points;
    const envelope = 0.55 + 0.45 * Math.sin(u * Math.PI);
    const y = mid + Math.sin(u * Math.PI * 4 + t) * amp * envelope + noise(u, t) * jitter;
    d += `${i === 0 ? 'M' : 'L'}${+(u * width).toFixed(2)},${+y.toFixed(2)}`;
  }
  return d;
}

export function initWave(
  svg: SVGSVGElement,
  toggle: HTMLButtonElement,
  opts: {reducedMotion?: boolean} = {},
): {destroy(): void} {
  const path = svg.querySelector('path');
  const hero = svg.closest('#hero') ?? svg.parentElement ?? svg;
  const draw = (t: number, c: number) => path?.setAttribute('d', wavePath(t, c, 800, 160));

  if (opts.reducedMotion) {
    // Nothing moves, so a pause/play control would do nothing.
    toggle.hidden = true;
    draw(0, 1);
    return {destroy() {}};
  }

  let raf = 0;
  let running = false;
  let userPaused = false;
  let t = 0;
  let last = 0;
  let clarity = 0;
  let pointer = 0.5;

  const target = () => {
    const r = hero.getBoundingClientRect();
    const scrolled = r.height > 0 ? Math.min(1, Math.max(0, -r.top / r.height)) : 0;
    return Math.min(1, 0.3 + scrolled * 0.7 + pointer * 0.3 - 0.15);
  };

  const frame = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    t += dt * 1.2;
    clarity += (target() - clarity) * 0.06;
    draw(t, clarity);
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (running || userPaused || document.hidden) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const onToggle = () => {
    userPaused = !userPaused;
    toggle.textContent = userPaused ? 'Play animation' : 'Pause animation';
    if (userPaused) stop();
    else start();
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  const onPointer = (e: PointerEvent) => {
    const r = hero.getBoundingClientRect();
    if (r.width > 0) pointer = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };

  toggle.addEventListener('click', onToggle);
  document.addEventListener('visibilitychange', onVisibility);
  hero.addEventListener('pointermove', onPointer as EventListener);
  clarity = target();
  draw(t, clarity);
  start();

  return {
    destroy() {
      stop();
      toggle.removeEventListener('click', onToggle);
      document.removeEventListener('visibilitychange', onVisibility);
      hero.removeEventListener('pointermove', onPointer as EventListener);
    },
  };
}
