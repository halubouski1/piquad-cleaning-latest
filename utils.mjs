export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

export function heroState(progress) {
  const p = clamp(progress);
  const firstExit = smooth((p - 0.08) / 0.39);
  const secondEnter = smooth((p - 0.40) / 0.39);
  return {
    progress: p,
    imageScale: 1.085 - p * 0.075,
    imageY: -p * 1.8,
    firstOpacity: 1 - firstExit,
    firstY: -firstExit * 55,
    secondOpacity: secondEnter,
    secondY: (1 - secondEnter) * 40
  };
}

export function makeInquiry({ name, location, service, notes = '' }) {
  const clean = value => String(value ?? '').trim();
  const person = clean(name);
  const area = clean(location);
  if (!person || !area) throw new Error('Please add your name and location.');
  const extra = clean(notes);
  return `Hi Piquad Cleaning! I’m ${person}, and my home is in ${area}.\n\nI’m interested in: ${clean(service)}.${extra ? `\n\n${extra}` : ''}\n\nCould we discuss availability and pricing?`;
}

export function smsLink(message, isIOS = false) {
  return `sms:+12679847591${isIOS ? '&' : '?'}body=${encodeURIComponent(message)}`;
}
