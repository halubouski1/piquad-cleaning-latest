export function curtainFrames(direction) {
  return [
    { clipPath: direction > 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' },
    { clipPath: 'inset(0 0 0 0)' }
  ];
}

export function mountGallery(gallery, interiors, reducedMotion) {
  const image = gallery.querySelector('#gallery-image');
  const caption = gallery.querySelector('#gallery-caption');
  const counter = gallery.querySelector('#gallery-counter');
  const frame = gallery.querySelector('.visual-image');
  const curtain = document.createElement('div');
  curtain.className = 'gallery-wipe';
  curtain.hidden = true;
  curtain.setAttribute('aria-hidden', 'true');
  const incoming = new Image();
  incoming.alt = '';
  curtain.append(incoming);
  frame.append(curtain);
  const status = document.createElement('span');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  gallery.append(status);
  let current = 0;
  let requested = 0;
  let direction = 1;
  let busy = false;
  let animation;

  async function change() {
    if (busy || requested === current) return;
    busy = true;
    const target = requested;
    const travel = direction;
    const scene = interiors[target];
    status.textContent = '';
    try {
      // Decode first, so the old scene stays intact while the new one loads.
      incoming.src = scene.src;
      incoming.width = scene.width;
      incoming.height = scene.height;
      await incoming.decode();
      incoming.style.transform = image.style.transform;
      curtain.hidden = false;
      gallery.classList.add('is-wiping');
      if (!reducedMotion.matches && typeof curtain.animate === 'function') {
        animation = curtain.animate(curtainFrames(travel), {
          duration: 1150,
          easing: 'cubic-bezier(.76,0,.24,1)',
          fill: 'forwards'
        });
        await animation.finished;
      } else curtain.style.clipPath = 'inset(0)';
      image.src = scene.src;
      image.alt = scene.alt;
      image.width = scene.width;
      image.height = scene.height;
      // Keep the completed curtain visible until the base layer can paint.
      try { await image.decode(); } catch {}
      current = target;
      caption.textContent = scene.caption;
      counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(interiors.length).padStart(2, '0')}`;
    } catch {
      if (requested === target) requested = current;
      status.textContent = 'This image could not be loaded. Please try again.';
    } finally {
      curtain.hidden = true;
      animation?.cancel();
      animation = undefined;
      curtain.style.clipPath = '';
      gallery.classList.remove('is-wiping');
      busy = false;
      // Rapid clicks settle on the last requested scene without overlapping wipes.
      if (requested !== current) void change();
    }
  }
  function request(step) {
    direction = step;
    requested = (requested + step + interiors.length) % interiors.length;
    void change();
  }
  gallery.querySelector('#gallery-prev').addEventListener('click', () => request(-1));
  gallery.querySelector('#gallery-next').addEventListener('click', () => request(1));
  reducedMotion.addEventListener('change', event => {
    if (event.matches && animation) animation.finish();
  });
}
