import { clamp } from './utils.mjs';

// Small inner-page image movements follow scroll position without trapping it.
export function innerPhotoState(top, height, viewport) {
  const entrance = clamp((viewport - top) / Math.max(1, viewport * .8));
  return { inset: (1 - entrance) * 4, progress: clamp(-top / Math.max(1, height)) };
}

if (typeof document !== 'undefined') {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.page-hero');
  const heroImage = hero?.querySelector('.page-hero-media img');
  const scenes = [...document.querySelectorAll('[data-expand-photo]')];
  let queued = false;
  function render() {
    queued = false;
    if (reduced.matches) {
      if (heroImage) heroImage.style.transform = '';
      scenes.forEach(scene=>scene.style.removeProperty('--frame-inset'));
      return;
    }
    if (heroImage) {
      const rect = hero.getBoundingClientRect();
      if (rect.bottom > 0) {
        const progress=clamp(-rect.top/Math.max(1,rect.height));
        heroImage.style.transform=`scale(${1.025-progress*.025})`;
      }
    }
    scenes.forEach(scene=>{
      const rect=scene.getBoundingClientRect();
      if (rect.top>innerHeight*1.2 || rect.bottom<0) return;
      const state=innerPhotoState(rect.top,rect.height,innerHeight);
      scene.style.setProperty('--frame-inset',`${state.inset}vw`);
    });
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(render);}}
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('pageshow',schedule);
  reduced.addEventListener('change',schedule);
  schedule();
}
