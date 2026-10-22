import { clamp } from './utils.mjs';

const ramp = (value, start, end) => clamp((value - start) / (end - start), 0, 1);
const ease = value => value * value * (3 - 2 * value);

// The frame is a pure function of scroll position: pause and reverse stay in sync.
export function deepSceneState(progress, width, height) {
  const expansion = ease(ramp(progress, 0.06, 0.70));
  const compact = width <= 760;
  const initialWidth = width * (compact ? 0.82 : 0.50);
  const copy = ease(ramp(progress, 0.73, 0.94));
  return {
    left: (width - initialWidth) / 2 * (1 - expansion),
    top: height * 0.35 * (1 - expansion),
    width: initialWidth + (width - initialWidth) * expansion,
    height: height * (0.58 + 0.42 * expansion),
    radius: 8 * (1 - expansion),
    introOpacity: 1 - ease(ramp(progress, 0.03, 0.25)),
    introY: -38 * ease(ramp(progress, 0.03, 0.25)),
    copyOpacity: copy,
    copyY: 25 * (1 - copy)
  };
}

export function lineProgress(top, height, viewport, vertical = false) {
  return vertical
    ? clamp((viewport * 0.72 - top) / Math.max(1, height), 0, 1)
    : clamp((viewport * 0.82 - top) / (viewport * 0.47), 0, 1);
}

if (typeof document !== 'undefined') {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const tallEnough = matchMedia('(min-height: 560px)');
  const compact = matchMedia('(max-width: 760px)');
  const story = document.querySelector('.deep-scroll');
  const stage = story.querySelector('.deep-stage');
  const photo = story.querySelector('.deep-story-photo');
  const intro = story.querySelector('.deep-intro');
  const copy = story.querySelector('.deep-story-copy');
  const shade = story.querySelector('.deep-story-shade');
  const meters = [...document.querySelectorAll('[data-scroll-fill]')].map(section => ({
    section,
    meter: section.querySelector('.scroll-meter'),
    process: section.dataset.scrollFill === 'process'
  }));
  let queued = false;
  let storyEnabled = false;

  function resetStory() {
    for (const element of [photo, intro, copy, shade]) element.removeAttribute('style');
    copy.classList.remove('is-readable');
  }
  function render() {
    queued = false;
    const viewport = window.innerHeight;
    if (storyEnabled) {
      const bounds = story.getBoundingClientRect();
      if (bounds.bottom > -100 && bounds.top < viewport + 100) {
        const progress = clamp(-bounds.top / Math.max(1, story.offsetHeight - stage.offsetHeight), 0, 1);
        const frame = deepSceneState(progress, stage.clientWidth, stage.clientHeight);
        photo.style.left = `${frame.left}px`;
        photo.style.top = `${frame.top}px`;
        photo.style.width = `${frame.width}px`;
        photo.style.height = `${frame.height}px`;
        photo.style.borderRadius = `${frame.radius}px`;
        intro.style.opacity = String(frame.introOpacity);
        intro.style.transform = `translate3d(0,${frame.introY}px,0)`;
        copy.style.opacity = String(frame.copyOpacity);
        copy.style.transform = `translate3d(0,${frame.copyY}px,0)`;
        copy.classList.toggle('is-readable', frame.copyOpacity > 0.65);
        shade.style.opacity = String(frame.copyOpacity);
      }
    }
    for (const { section, meter, process } of meters) {
      const vertical = compact.matches && process;
      const bounds = (vertical ? section : meter).getBoundingClientRect();
      const progress = reduced.matches ? 1 : lineProgress(bounds.top, bounds.height, viewport, vertical);
      meter.style.setProperty('--fill', String(progress));
    }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }
  function updateMode() {
    storyEnabled = !reduced.matches && tallEnough.matches;
    root.classList.toggle('deep-motion', storyEnabled);
    if (!storyEnabled) resetStory();
    schedule();
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', updateMode, { passive: true });
  window.addEventListener('pageshow', updateMode);
  reduced.addEventListener('change', updateMode);
  tallEnough.addEventListener('change', updateMode);
  document.fonts?.ready.then(schedule);
  updateMode();
}
