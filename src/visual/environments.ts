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

const bandLabel = (hz: number) => (hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`);
const fmtDb = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export function initEnvironmentPicker(root: HTMLElement): void {
  const radios = [...root.querySelectorAll<HTMLElement>('[role=radio]')];
  const chart = document.getElementById('env-chart');
  const desc = document.getElementById('env-desc');

  const bars: HTMLElement[] = [];
  if (chart) {
    chart.setAttribute('role', 'img');
    chart.textContent = '';
    BANDS_HZ.forEach(hz => {
      const col = document.createElement('div');
      col.className = 'env-col';
      const bar = document.createElement('div');
      bar.className = 'env-bar';
      const label = document.createElement('span');
      label.className = 'env-bar__label';
      label.textContent = bandLabel(hz);
      col.append(bar, label);
      chart.appendChild(col);
      bars.push(bar);
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
    bars.forEach((bar, i) => {
      const o = env.bandOffsetsDb[i];
      bar.style.transform = `scaleY(${(o + 12) / 13})`;
    });
    if (chart) {
      const parts = BANDS_HZ.map((hz, i) => `${bandLabel(hz)} ${fmtDb(env.bandOffsetsDb[i])} dB`);
      chart.setAttribute('aria-label', `${env.label} profile, change by band: ${parts.join(', ')}`);
    }
    if (desc) desc.textContent = env.description;
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
