export type EnvId = 'quiet' | 'office' | 'cafe' | 'outdoors';

export const ENVIRONMENTS: Record<EnvId, {label: string; description: string; bandOffsetsDb: readonly number[]}> = {
  quiet: {
    label: 'Quiet home',
    description: 'A quiet room. Your full personal profile.',
    bandOffsetsDb: [0, 0, 0, 0, 0, 0],
  },
  office: {
    label: 'Office',
    description: 'Moderate background: keyboards, air conditioning, nearby voices.',
    bandOffsetsDb: [-3, -2, 0, 0, 0, -1],
  },
  cafe: {
    label: 'Café / restaurant',
    description: 'Busy places with many voices. Less rumble, clearer speech.',
    bandOffsetsDb: [-8, -6, -3, 0, 1, -2],
  },
  outdoors: {
    label: 'Outdoors',
    description: 'Streets and parks: traffic and wind are turned down.',
    bandOffsetsDb: [-10, -6, -2, 0, 0, -3],
  },
};

export const BANDS_HZ: readonly number[] = [250, 500, 1000, 2000, 4000, 8000];

/** A 12 dB cut fills the whole depth below the 0 dB baseline. */
export const DB_FULL_DEPTH = 12;
/** Pixels per dB; must match --env-db in sections.css. */
export const PX_PER_DB = 12;

const bandLabel = (hz: number) => (hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`);
const fmtDb = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export function initEnvironmentPicker(root: HTMLElement): void {
  const radios = [...root.querySelectorAll<HTMLElement>('[role=radio]')];
  const chart = document.getElementById('env-chart');
  const desc = document.getElementById('env-desc');
  // Stacked place photos: only the active one is visible (CSS crossfades opacity) and exposed to AT.
  const photoPanel = document.getElementById('env-photo');
  const photos = photoPanel ? [...photoPanel.querySelectorAll<HTMLElement>('img[data-env]')] : [];

  const cols: HTMLElement[] = [];
  const bars: HTMLElement[] = [];
  const caps: HTMLElement[] = [];
  const values: HTMLElement[] = [];
  if (chart) {
    chart.setAttribute('role', 'img');
    chart.textContent = '';
    const baseline = document.createElement('div');
    baseline.className = 'env-baseline';
    chart.appendChild(baseline);
    BANDS_HZ.forEach(hz => {
      const col = document.createElement('div');
      col.className = 'env-col';
      const track = document.createElement('div');
      track.className = 'env-track';
      // One dB tall, anchored on the baseline; scaleY(n) extends it n dB down,
      // scaleY(-n) flips it n dB up. Only transform changes, so it animates cheaply.
      const bar = document.createElement('div');
      bar.className = 'env-bar';
      const cap = document.createElement('div');
      cap.className = 'env-cap';
      track.append(bar, cap);
      const label = document.createElement('span');
      label.className = 'env-bar__label';
      label.textContent = bandLabel(hz);
      const value = document.createElement('span');
      value.className = 'env-bar__value';
      col.append(track, label, value);
      chart.appendChild(col);
      cols.push(col);
      bars.push(bar);
      caps.push(cap);
      values.push(value);
    });
  }

  const select = (index: number, focus: boolean) => {
    const id = radios[index]?.dataset.env as EnvId | undefined;
    if (!id || !(id in ENVIRONMENTS)) return;
    const env = ENVIRONMENTS[id];
    radios.forEach((r, i) => {
      r.setAttribute('aria-checked', String(i === index));
      r.tabIndex = i === index ? 0 : -1;
    });
    env.bandOffsetsDb.forEach((o, i) => {
      if (!bars[i]) return;
      const depth = Math.max(-DB_FULL_DEPTH, Math.min(DB_FULL_DEPTH, o));
      bars[i].style.transform = `scaleY(${-depth || 0})`;
      caps[i].style.transform = `translateY(${-depth * PX_PER_DB || 0}px)`;
      cols[i].dataset.dir = o > 0 ? 'up' : o < 0 ? 'down' : 'flat';
      values[i].textContent = `${fmtDb(o)} dB`;
    });
    if (chart) {
      const parts = BANDS_HZ.map((hz, i) => `${bandLabel(hz)} ${fmtDb(env.bandOffsetsDb[i])} dB`);
      chart.setAttribute('aria-label', `${env.label} profile, change by band: ${parts.join(', ')}`);
    }
    if (desc) desc.textContent = env.description;
    if (photoPanel) photoPanel.dataset.env = id;
    photos.forEach(p => {
      const on = p.dataset.env === id;
      p.classList.toggle('is-active', on);
      if (on) p.removeAttribute('aria-hidden');
      else p.setAttribute('aria-hidden', 'true');
    });
    if (focus) radios[index].focus();
  };

  radios.forEach((r, i) => {
    r.addEventListener('click', () => select(i, false));
    r.addEventListener('keydown', e => {
      const n = radios.length;
      let next = -1;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          next = (i - 1 + n) % n;
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          next = (i + 1) % n;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = n - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      select(next, true);
    });
  });

  select(Math.max(0, radios.findIndex(r => r.dataset.env === 'quiet')), false);
}
