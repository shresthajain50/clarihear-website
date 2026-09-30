/**
 * Illustrative hearing profile and the boosts ClariHear's fitting engine computes for it
 * (tone-check fitting, which is deliberately gentle because earbuds aren't calibrated).
 * Values are copied verbatim from the app; do not round or re-derive them here.
 */
export const BANDS: readonly number[] = [250, 500, 1000, 2000, 4000, 8000];

/** Estimated hearing levels, dB HL, per band. */
export const EXAMPLE_PROFILE: {left: readonly number[]; right: readonly number[]} = {
  left: [15, 20, 25, 35, 45, 50],
  right: [15, 20, 30, 40, 50, 55],
};

/** Left-ear gains in dB, as fitted; "cafe" includes the Café / restaurant adjustment. */
export const EXAMPLE_BOOSTS: {everyday: readonly number[]; cafe: readonly number[]} = {
  everyday: [0, 0, 6.1, 6.6, 7.7, 8.4],
  cafe: [0, 0, 3.1, 6.6, 8.7, 6.4],
};

/** The app's gain ceiling (Level 2). */
export const MAX_GAIN_DB = 20;

export type BoostMode = keyof typeof EXAMPLE_BOOSTS;
const MODE_LABEL: Record<BoostMode, string> = {everyday: 'Everyday', cafe: 'Café'};

/** The bar track spans 0–10 dB; must match --boost-db (px per dB) × 10 in sections.css. */
const BOOST_FULL_DB = 10;
const PX_PER_DB = 12;

const bandLabel = (hz: number) => (hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`);
const shortBand = (hz: number) => (hz >= 1000 ? `${hz / 1000}k` : `${hz}`);

export function fmtBoost(n: number): string {
  if (n === 0) return '0 dB';
  return `${n > 0 ? '+' : '−'}${Math.abs(n).toFixed(1)} dB`;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const el = (tag: string, attrs: Record<string, string | number> = {}, parent?: Element) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent?.appendChild(node);
  return node;
};

/** Audiogram-style chart: frequency across, estimated dB HL downward (0 at the top). */
function renderAudiogram(mount: HTMLElement): void {
  const W = 300;
  const H = 214;
  const plot = {l: 40, r: 286, t: 16, b: 172};
  const maxDb = 60;
  const x = (i: number) => plot.l + ((plot.r - plot.l) * i) / (BANDS.length - 1);
  const y = (db: number) => plot.t + ((plot.b - plot.t) * db) / maxDb;

  const ear = (vals: readonly number[]) => vals.map((v, i) => `${bandLabel(BANDS[i])} ${v}`).join(', ');
  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    class: 'audiogram',
    'aria-label': `Example hearing profile in estimated dB HL (lower on the chart means a pitch must be louder to be heard). Left ear: ${ear(EXAMPLE_PROFILE.left)}. Right ear: ${ear(EXAMPLE_PROFILE.right)}.`,
  });

  const grid = el('g', {class: 'ag-grid', 'aria-hidden': 'true'}, svg);
  for (let db = 0; db <= maxDb; db += 10) {
    el('line', {x1: plot.l, x2: plot.r, y1: y(db), y2: y(db), class: db % 20 === 0 ? 'major' : 'minor'}, grid);
    if (db % 20 === 0) {
      const t = el('text', {x: plot.l - 10, y: y(db) + 4.5, 'text-anchor': 'end', class: 'ag-tick'}, grid);
      t.textContent = String(db);
    }
  }
  BANDS.forEach((hz, i) => {
    el('line', {x1: x(i), x2: x(i), y1: plot.t, y2: plot.b, class: 'minor'}, grid);
    const t = el('text', {x: x(i), y: plot.b + 24, 'text-anchor': 'middle', class: 'ag-tick'}, grid);
    t.textContent = shortBand(hz);
  });

  const line = (vals: readonly number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');

  const right = el('g', {class: 'ear-right', 'aria-hidden': 'true'}, svg);
  el('path', {d: line(EXAMPLE_PROFILE.right), class: 'ag-line'}, right);
  EXAMPLE_PROFILE.right.forEach((v, i) => {
    const c = 4.5;
    el('path', {d: `M${x(i) - c},${y(v) - c} L${x(i) + c},${y(v) + c} M${x(i) + c},${y(v) - c} L${x(i) - c},${y(v) + c}`, class: 'cross'}, right);
  });

  const left = el('g', {class: 'ear-left', 'aria-hidden': 'true'}, svg);
  el('path', {d: line(EXAMPLE_PROFILE.left), class: 'ag-line'}, left);
  EXAMPLE_PROFILE.left.forEach((v, i) => el('circle', {cx: x(i), cy: y(v), r: 5}, left));

  mount.textContent = '';
  mount.appendChild(svg);
}

export function initProfile(root: HTMLElement, opts: {reducedMotion?: boolean} = {}): void {
  const chartMount = root.querySelector<HTMLElement>('#profile-chart');
  if (chartMount) renderAudiogram(chartMount);

  // One gentle pulse on the pitch being played; nothing moves under reduced motion.
  if (!opts.reducedMotion) root.querySelector('.pitch-dot[data-current]')?.classList.add('is-pulsing');

  const chart = root.querySelector<HTMLElement>('#boost-chart');
  const picker = root.querySelector<HTMLElement>('#boost-mode');
  if (!chart) return;

  chart.setAttribute('role', 'img');
  chart.textContent = '';
  const bars: HTMLElement[] = [];
  const values: HTMLElement[] = [];
  const cols: HTMLElement[] = [];
  BANDS.forEach(hz => {
    const col = document.createElement('div');
    col.className = 'boost-col';
    const track = document.createElement('div');
    track.className = 'boost-track';
    // Full-height bar scaled from the baseline: only transform changes, so it animates cheaply.
    const bar = document.createElement('div');
    bar.className = 'boost-bar';
    const value = document.createElement('span');
    value.className = 'boost-value';
    track.append(bar, value);
    const label = document.createElement('span');
    label.className = 'boost-label';
    label.textContent = shortBand(hz);
    col.append(track, label);
    chart.appendChild(col);
    cols.push(col);
    bars.push(bar);
    values.push(value);
  });

  const radios = picker ? [...picker.querySelectorAll<HTMLElement>('[role=radio]')] : [];

  const show = (mode: BoostMode) => {
    const gains = EXAMPLE_BOOSTS[mode];
    gains.forEach((g, i) => {
      const clamped = Math.max(0, Math.min(BOOST_FULL_DB, g));
      bars[i].style.transform = `scaleY(${clamped / BOOST_FULL_DB})`;
      values[i].style.transform = `translateY(${-clamped * PX_PER_DB}px)`;
      // Number on top, unit beneath, so labels fit narrow columns; textContent stays "+6.1 dB".
      const [num, unit] = fmtBoost(g).split(' ');
      const u = document.createElement('span');
      u.className = 'u';
      u.textContent = ` ${unit}`;
      values[i].replaceChildren(num, u);
      cols[i].dataset.zero = String(g === 0);
    });
    const parts = BANDS.map((hz, i) => `${bandLabel(hz)} ${fmtBoost(gains[i])}`);
    chart.setAttribute('aria-label', `Example boosts for the left ear, ${MODE_LABEL[mode]}: ${parts.join(', ')}`);
  };

  const select = (index: number, focus: boolean) => {
    const mode = radios[index]?.dataset.mode as BoostMode | undefined;
    if (!mode || !(mode in EXAMPLE_BOOSTS)) return;
    radios.forEach((r, i) => {
      r.setAttribute('aria-checked', String(i === index));
      r.tabIndex = i === index ? 0 : -1;
    });
    show(mode);
    if (focus) radios[index].focus();
  };

  radios.forEach((r, i) => {
    r.addEventListener('click', () => select(i, false));
    r.addEventListener('keydown', e => {
      const n = radios.length;
      let next = -1;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = n - 1;
      else return;
      e.preventDefault();
      select(next, true);
    });
  });

  if (radios.length) select(Math.max(0, radios.findIndex(r => r.dataset.mode === 'everyday')), false);
  else show('everyday');
}
