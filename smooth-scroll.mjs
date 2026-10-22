import Lenis from './vendor/lenis-1.3.26.mjs';

// A light inertial finish for wheel/trackpad input, with native touch scrolling.
const scrolling = new Lenis({
  autoRaf: true,
  lerp: 0.065,
  smoothWheel: true,
  syncTouch: false,
  wheelMultiplier: 1,
  respectReducedMotion: true,
  allowNestedScroll: true,
  anchors: false
});

// A modal retains its own native scrolling while the page stays in place.
const dialog = document.querySelector('#inquiry-dialog');
const syncDialog = () => dialog.open ? scrolling.stop() : scrolling.start();
new MutationObserver(syncDialog).observe(dialog, { attributes: true, attributeFilter: ['open'] });
syncDialog();

// Prevent the native anchor jump from competing with the smooth-scroll animation.
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const hash = link.getAttribute('href');
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!target) return;
  event.preventDefault();
  if (location.hash !== hash) history.pushState(null, '', hash);
  scrolling.scrollTo(target, {
    duration: 1.45,
    lerp: 0,
    easing: value => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2,
    onComplete: () => {
      if (event.detail === 0 || link.classList.contains('skip-link')) {
        const hadTabIndex = target.hasAttribute('tabindex');
        if (!hadTabIndex) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        if (!hadTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
    }
  });
});
// Keyboard scrolling and browser history interrupt any unfinished wheel inertia.
document.addEventListener('keydown', event => {
  if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key) && !dialog.open) {
    scrolling.scrollTo(window.scrollY, { immediate: true });
  }
});
window.addEventListener('popstate', () => scrolling.scrollTo(window.scrollY, { immediate: true }));
window.addEventListener('pageshow', () => scrolling.resize());
