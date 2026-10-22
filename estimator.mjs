import { pricing, quote } from './pricing.mjs';

// Instant price estimate. Options are built from pricing.mjs so the two never disagree.
const root = document.querySelector('#estimate');
const form = root.querySelector('#estimate-form');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const money = value => `$${Math.round(value).toLocaleString('en-US')}`;
const number = value => Number(value).toLocaleString('en-US');

function areaLabel(key) {
  if (key.startsWith('<')) return `Under ${number(key.slice(1))}`;
  if (key.startsWith('>')) return `${number(key.slice(1))}+`;
  return key.split('-').map(number).join('–');
}

function chips(name, entries, checked, type = 'radio') {
  return entries.map(([value, label, hint]) => `<label class="chip"><input type="${type}" name="${name}" value="${value}"${checked.includes(value) ? ' checked' : ''}><span>${label}${hint ? `<small>${hint}</small>` : ''}</span></label>`).join('');
}
function fill(name, html) { root.querySelector(`[data-options="${name}"]`).innerHTML = html; }

const offer = pricing.firstCleanDiscount;
fill('service', Object.entries(pricing.services).map(([key, s]) => `<label class="mode-option"><input type="radio" name="service" value="${key}"${key === 'standard' ? ' checked' : ''}><span>${s.label}<small>${s.note}</small>${key === offer.service ? `<em class="estimate-badge">${offer.pct}% off first clean</em>` : ''}</span></label>`).join(''));
fill('bedrooms', chips('bedrooms', Object.keys(pricing.bedrooms).map(key => [key, key]), ['3']));
fill('bathrooms', chips('bathrooms', Object.keys(pricing.bathrooms).map(key => [key, key]), ['2']));
fill('area', chips('area', Object.keys(pricing.area).map(key => [key, areaLabel(key)]), ['1000-2000']));
fill('addons', chips('addons', Object.entries(pricing.addons).map(([key, a]) => [key, a.label, `+${money(a.price)}`]), [], 'checkbox'));
root.querySelector('[data-discount-pct]').textContent = `${offer.pct}%`;
root.querySelector('[data-discount-service]').textContent = pricing.services[offer.service].label;
const offerGroup = root.querySelector('#estimate-offer');

const out = name => root.querySelector(`[data-out="${name}"]`);
const amount = out('amount');
let shown = 0;
let frame;
function animateAmount(target) {
  cancelAnimationFrame(frame);
  if (reducedMotion.matches || !shown) { shown = target; amount.textContent = number(target); return; }
  const start = shown;
  const began = performance.now();
  const step = now => {
    const t = Math.min(1, (now - began) / 450);
    shown = Math.round(start + (target - start) * (1 - (1 - t) ** 3));
    amount.textContent = number(shown);
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

function update() {
  const data = new FormData(form);
  const service = pricing.services[data.get('service')];
  const home = { bedrooms: data.get('bedrooms'), bathrooms: data.get('bathrooms'), area: data.get('area') };
  const addons = data.getAll('addons');
  const addonNames = addons.map(key => pricing.addons[key].label);
  const homeText = `${home.bedrooms} bed · ${home.bathrooms} bath · ${areaLabel(home.area)} sq ft`;
  offerGroup.hidden = data.get('service') !== offer.service;
  const result = quote(home, data.get('service'), { addons, firstClean: data.has('first-clean') });
  const discountLabel = `${result.discountPct}% off first ${service.label}`;

  animateAmount(result.total);
  out('label').textContent = service.label;
  out('was').hidden = !result.discount;
  out('was').innerHTML = `<s>${money(result.clean + result.addons)}</s> <span>${discountLabel}</span>`;
  out('rows').innerHTML = `<div><dt>Cleaning</dt><dd>${money(result.clean)}</dd></div>${result.discount ? `<div class="estimate-discount"><dt>${discountLabel}</dt><dd>−${money(result.discount)}</dd></div>` : ''}<div><dt>Add-ons</dt><dd>${result.addons ? money(result.addons) : '—'}</dd></div>`;
  out('home').textContent = homeText;
  root.querySelector('#estimate-cta').dataset.service = service.inquiry;

  const summary = `${service.label}, about ${money(result.total)}${result.discount ? ` with ${discountLabel} (−${money(result.discount)})` : ''}`;
  out('status').textContent = `Estimate: ${summary}.`;
  root.dataset.inquiryNote = `Website estimate: ${summary}. Home: ${homeText.replaceAll(' · ', ', ')}.${addonNames.length ? ` Add-ons: ${addonNames.join(', ')}.` : ''}`;
}

form.addEventListener('change', update);
form.addEventListener('submit', event => event.preventDefault());
// app.mjs opens the inquiry dialog for [data-inquiry]; this adds the estimate to its notes.
root.querySelector('#estimate-cta').addEventListener('click', () => {
  document.querySelector('#inquiry-form').elements.notes.value = root.dataset.inquiryNote;
});
update();
