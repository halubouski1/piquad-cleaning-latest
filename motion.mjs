import { clamp, heroState } from './utils.mjs';

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const shortLandscape = matchMedia('(max-height: 540px) and (min-width: 650px)');
const hero = document.querySelector('.hero-scroll');
const stage = document.querySelector('.hero-stage');
const heroImage = document.querySelector('#hero-image') || document.querySelector('[data-page-hero] img');
const firstTitle = document.querySelector('.hero-copy');
const secondTitle = document.querySelector('.hero-next');
const progressBar = document.querySelector('#hero-progress');
const visualScenes = [...document.querySelectorAll('.full-visual')].map(scene => ({ scene, images: [...scene.querySelectorAll('.visual-image img')] }));
let enabled = false;
let scheduled = false;

// The intro releases after the hero/font is ready, with a hard maximum wait.
let introEnding = false;
function finishIntro(immediate = false) {
  if (immediate) {
    introEnding = true;
    root.classList.remove('intro', 'intro-ending');
    root.classList.add('page-ready');
  } else {
    if (introEnding) return;
    introEnding = true;
    root.classList.add('intro-ending');
    setTimeout(() => root.classList.add('page-ready'), 220);
    setTimeout(() => root.classList.remove('intro', 'intro-ending'), 1250);
  }
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
if (root.classList.contains('intro') && !reducedMotion.matches) {
  const assetsReady = Promise.allSettled([heroImage?.decode() ?? Promise.resolve(), document.fonts?.ready ?? Promise.resolve()]);
  Promise.all([delay(1100), Promise.race([assetsReady, delay(2300)])]).then(() => finishIntro());
} else finishIntro(true);
document.querySelector('#skip-intro').addEventListener('click', () => {
  finishIntro(true);
  document.querySelector('.header .brand').focus({ preventScroll: true });
});
document.addEventListener('keydown', event => {
  if ((event.key === 'Escape' || event.key === 'Tab') && root.classList.contains('intro')) finishIntro(true);
});
document.querySelector('.skip-link').addEventListener('click', () => finishIntro(true));
window.addEventListener('pageshow', event => { if (event.persisted) finishIntro(true); });

function resetScene() {
  if (heroImage) heroImage.style.transform = '';
  for (const title of [firstTitle, secondTitle]) {
    if (title) { title.style.opacity = ''; title.style.transform = ''; }
  }
  if (progressBar) progressBar.style.transform = '';
  visualScenes.forEach(({ images }) => { images.forEach(image => { image.style.transform = ''; }); });
}
function updateMotionMode() {
  enabled = !reducedMotion.matches && !shortLandscape.matches;
  root.classList.toggle('scroll-motion', enabled && Boolean(hero));
  if (!enabled) resetScene();
  if (reducedMotion.matches) finishIntro(true);
  scheduleFrame();
}
function renderFrame() {
  scheduled = false;
  if (!enabled) return;
  if (hero) {
  const bounds = hero.getBoundingClientRect();
  const duration = Math.max(1, hero.offsetHeight - stage.offsetHeight);
  const state = heroState(-bounds.top / duration);
  heroImage.style.transform = `translate3d(0,${state.imageY}%,0) scale(${state.imageScale})`;
  firstTitle.style.opacity = String(state.firstOpacity);
  firstTitle.style.transform = `translate3d(0,${state.firstY}px,0)`;
  secondTitle.style.opacity = String(state.secondOpacity);
  secondTitle.style.transform = `translate3d(0,${state.secondY}px,0)`;
  progressBar.style.transform = `scaleY(${state.progress})`;
  }
  const viewport = window.innerHeight;
  visualScenes.forEach(({ scene, images }) => {
    const rect = scene.getBoundingClientRect();
    if (rect.bottom < -100 || rect.top > viewport + 100) return;
    const relative = clamp((viewport / 2 - (rect.top + rect.height / 2)) / viewport, -1, 1);
    images.forEach(image => { image.style.transform = `translate3d(0,${relative * 24}px,0) scale(1.07)`; });
  });
}
function scheduleFrame() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(renderFrame);
}
window.addEventListener('scroll', scheduleFrame, { passive: true });
window.addEventListener('resize', updateMotionMode, { passive: true });
reducedMotion.addEventListener('change', updateMotionMode);
shortLandscape.addEventListener('change', updateMotionMode);
updateMotionMode();


// Slower entrances start just inside the viewport, independently of the line animation.
let revealObserver;
function exposeContent() {
  revealObserver?.disconnect();
  document.querySelectorAll('.is-waiting').forEach(element => element.classList.remove('is-waiting'));
}
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('is-waiting');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: `0px 0px -${Math.round(window.innerHeight * 0.06)}px 0px` });
  document.querySelectorAll('.reveal').forEach(element => {
    if (element.getBoundingClientRect().top >= window.innerHeight * 0.9) {
      element.classList.add('is-waiting');
      revealObserver.observe(element);
    }
  });

}
reducedMotion.addEventListener('change', event => { if (event.matches) exposeContent(); });
document.addEventListener('focusin', event => {
  event.target.closest('.is-waiting')?.classList.remove('is-waiting');
});
