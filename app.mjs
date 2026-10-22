import { mountGallery } from './gallery.mjs';
import { makeInquiry, smsLink } from './utils.mjs';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  mobileNav.hidden = true;
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.hidden = !open;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); }
});
window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

// Service cards remain horizontally scrollable by touch, trackpad, or buttons.
const track = document.querySelector('#service-track');
const previousService = document.querySelector('#services-prev');
const nextService = document.querySelector('#services-next');
function syncServiceButtons() {
  previousService.disabled = track.scrollLeft <= 3;
  nextService.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 3;
}
function moveServices(direction) {
  const cardWidth = track.querySelector('.service-card').getBoundingClientRect().width;
  const gap = parseFloat(getComputedStyle(track).gap) || 12;
  track.scrollBy({ left: (cardWidth + gap) * direction, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}
previousService.addEventListener('click', () => moveServices(-1));
nextService.addEventListener('click', () => moveServices(1));
track.addEventListener('scroll', syncServiceButtons, { passive: true });
window.addEventListener('resize', syncServiceButtons, { passive: true });
syncServiceButtons();

// Visitor-controlled gallery. These scenes are labeled as illustrative.
const interiors = [
  { src: 'assets/living.webp', alt: 'Sunlit living room with a cream sofa and natural oak furniture', caption: 'Living areas: discuss dust, surfaces, and floors.', width: 1672, height: 941 },
  { src: 'assets/kitchen.webp', alt: 'Warm, tidy kitchen with soft green cabinets and stone countertops', caption: 'Kitchens: discuss counters, sinks, and high-use areas.', width: 1448, height: 1086 },
  { src: 'assets/move-clean.webp', alt: 'An inviting empty room with moving boxes and natural daylight', caption: 'Moving: share your date, home details, and priorities.', width: 1086, height: 1448 }
];
mountGallery(document.querySelector('.gallery'), interiors, reducedMotion);

// Inquiry preparation happens entirely on the visitor's device.
const dialog = document.querySelector('#inquiry-dialog');
const form = document.querySelector('#inquiry-form');
const contactForm = document.querySelector('#contact-form');
const ready = document.querySelector('#inquiry-ready');
const preview = document.querySelector('#message-preview');
const status = document.querySelector('#copy-status');
let inquiryTrigger;
function showForm() { form.hidden = false; ready.hidden = true; status.textContent = ''; }
function openDialog(trigger) {
  closeMenu();
  inquiryTrigger = trigger;
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('dialog-open');
  dialog.scrollTop = 0;
}
document.querySelectorAll('[data-inquiry]').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.service) form.elements.service.value = button.dataset.service;
    showForm();
    openDialog(button);
    document.querySelector('.dialog-close').focus({ preventScroll: true });
  });
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('dialog-open');
  inquiryTrigger?.focus({ preventScroll: true });
});
function prepareMessage(sourceForm, trigger) {
  const data = Object.fromEntries(new FormData(sourceForm));
  for (const field of ['name', 'location']) {
    if (!data[field]?.trim()) {
      const input = sourceForm.elements[field];
      input.setCustomValidity('Please add a few details here.');
      input.reportValidity();
      input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
      return;
    }
  }
  if (sourceForm !== form) {
    for (const field of ['name', 'location', 'service']) form.elements[field].value = data[field];
    form.elements.notes.value = '';
    openDialog(trigger);
  }
  preview.value = makeInquiry(data);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  document.querySelector('#sms-link').href = smsLink(preview.value, isIOS);
  form.hidden = true;
  ready.hidden = false;
  status.textContent = '';
  dialog.scrollTop = 0;
  document.querySelector('#sms-link').focus({ preventScroll: true });
}
form.addEventListener('submit', event => { event.preventDefault(); prepareMessage(form, event.submitter); });
contactForm.addEventListener('submit', event => { event.preventDefault(); prepareMessage(contactForm, event.submitter); });
document.querySelector('#edit-inquiry').addEventListener('click', () => { showForm(); form.elements.name.focus(); });
document.querySelector('#copy-inquiry').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(preview.value); status.textContent = 'Message copied. It’s ready to paste into your conversation.'; }
  catch { preview.focus(); preview.select(); status.textContent = 'Your message is selected. Use your device’s Copy command.'; }
});
document.querySelector('#year').textContent = new Date().getFullYear();
