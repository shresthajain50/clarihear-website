export function initReveal(root: ParentNode, opts: {reducedMotion?: boolean} = {}): void {
  if (opts.reducedMotion || typeof IntersectionObserver === 'undefined') return;
  const els = [...root.querySelectorAll<HTMLElement>('.reveal')].filter(el => !el.closest('#hero'));
  if (!els.length) return;
  const io = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove('reveal--pending');
        io.unobserve(entry.target);
      }
    },
    {threshold: 0.15},
  );
  for (const el of els) {
    el.classList.add('reveal--pending');
    io.observe(el);
  }
}
