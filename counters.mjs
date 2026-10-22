export function counterValue(target, progress) {
  const p = Math.max(0, Math.min(1, progress));
  const eased = target <= 5 ? p : 1 - (1 - p) ** 3;
  return Math.min(target, Math.floor(target * eased + 1e-8));
}

if (typeof document !== 'undefined' && document.querySelector('[data-counter-group]')) {
  const group = document.querySelector('[data-counter-group]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const counters = [...group.querySelectorAll('[data-count-to]')].map(element => ({
    element, target: Number(element.dataset.countTo)
  }));
  let frame = 0;
  let running = false;
  function finish() {
    cancelAnimationFrame(frame);
    running = false;
    counters.forEach(({ element, target }) => { element.textContent = String(target); });
  }
  function play() {
    if (running) return;
    if (reduced.matches) { finish(); return; }
    running = true;
    counters.forEach(({ element }) => { element.textContent = '0'; });
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / 2100);
      counters.forEach(({ element, target }) => {
        element.textContent = String(counterValue(target, progress));
      });
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish();
    }
    frame = requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window && !reduced.matches) {
    counters.forEach(({ element }) => { element.textContent = '0'; });
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        play();
        observer.disconnect();
      }
    }, { threshold: 0.35, rootMargin: '0px 0px -6% 0px' });
    observer.observe(group);
  }
  group.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') play(); });
  group.addEventListener('focusin', play);
  reduced.addEventListener('change', event => { if (event.matches) finish(); });
}
