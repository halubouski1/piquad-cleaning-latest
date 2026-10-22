// Price estimator settings. Every number here is a PLACEHOLDER: replace them with
// Piquad's real rates. Prices are in US dollars. No other file needs to change.
//
// How a price is built:
//   base price of the reference home (3 bedrooms / 2 bathrooms / 2,000–3,000 sq ft)
//   + bedroom, bathroom and area adjustments (scaled by the service's `scale`)
//   Services with `perSqFt` instead start from billedSqft[area] × perSqFt and skip the area adjustment.
//   − the first Deep Cleaning discount for new customers, if chosen (cleaning only, not add-ons)
//   + selected add-ons. The cleaning price rounds to the nearest `roundTo`.
export const pricing = {
  roundTo: 5,
  minimumVisit: 130, // lowest cleaning price before any discount

  bedrooms: { '1': -40, '2': -20, '3': 0, '4': 30, '5+': 60 },
  bathrooms: { '1': -25, '2': 0, '3': 25, '4': 50, '5+': 75 }, // baths + toilets combined
  area: { '<1000': -40, '1000-2000': -20, '2000-3000': 0, '3000-4000': 40, '4000-6000': 90, '>6000': 150 },
  // Square footage billed for each size band by `perSqFt` services.
  billedSqft: { '<1000': 1000, '1000-2000': 2000, '2000-3000': 3000, '3000-4000': 4000, '4000-6000': 5000, '>6000': 6000 },

  // `scale` multiplies the adjustments above for larger jobs.
  services: {
    standard: { label: 'Standard Cleaning', note: 'Routine upkeep, room by room', inquiry: 'Regular cleaning', base: 220, scale: 1 },
    deep: { label: 'Deep Cleaning', note: 'Detailed reset for build-up', inquiry: 'Deep cleaning', perSqFt: 0.18, scale: 1.4 },
    move: { label: 'Move-in / Move-out Cleaning', note: 'Empty home, ready to hand over', inquiry: 'Move-in / move-out cleaning', perSqFt: 0.20, scale: 1.5 }
  },

  // New customers only, on their first clean of this one service. Other services get no discount.
  firstCleanDiscount: { service: 'deep', pct: 20 },

  // Keep each add-on at $40 or less.
  addons: {
    oven: { label: 'Inside oven', price: 40 },
    fridge: { label: 'Inside fridge', price: 35 },
    cabinets: { label: 'Inside cabinets', price: 40 },
    windows: { label: 'Interior windows', price: 40 },
    baseboards: { label: 'Detailed baseboards', price: 40 }
  }
};

const roundPrice = (value, step) => Math.round(value / step) * step;

function cleaningPrice(home, service, config) {
  const pick = (table, key) => table[key] ?? 0;
  const rooms = pick(config.bedrooms, home.bedrooms) + pick(config.bathrooms, home.bathrooms);
  if (service.perSqFt) return pick(config.billedSqft, home.area) * service.perSqFt + service.scale * rooms;
  return service.base + service.scale * (rooms + pick(config.area, home.area));
}

function addonsTotal(selected = [], config) {
  return selected.reduce((sum, key) => sum + (config.addons[key]?.price ?? 0), 0);
}

export function quote(home, serviceKey, { addons = [], firstClean = false } = {}, config = pricing) {
  const service = config.services[serviceKey];
  if (!service) throw new Error(`Unknown service: ${serviceKey}`);
  const clean = roundPrice(Math.max(config.minimumVisit, cleaningPrice(home, service, config)), config.roundTo);
  const offer = config.firstCleanDiscount;
  const discountPct = firstClean && serviceKey === offer.service ? offer.pct : 0;
  const discount = Math.round(clean * discountPct / 100);
  const extras = addonsTotal(addons, config);
  return { clean, discountPct, discount, addons: extras, total: clean - discount + extras };
}
