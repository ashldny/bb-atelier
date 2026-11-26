// When to ask for a store rating. Pure, so it is easy to test; the popup keeps the state
// in local.ratePrompt = { days: ['YYYY-MM-DD', …], rated: bool, snoozedUntil: 'YYYY-MM-DD' }.
export const RATE_AFTER_DAYS = 4;
export const RATE_SNOOZE_DAYS = 30;
const MAX_DAYS = 10;

export const dayKey = (date) => date.toISOString().slice(0, 10);

function addDays(day, count) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return dayKey(date);
}

export function normalizeRateState(raw) {
  const state = raw && typeof raw === 'object' ? raw : {};
  const days = Array.isArray(state.days)
    ? [...new Set(state.days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].slice(-MAX_DAYS)
    : [];
  const snoozedUntil = /^\d{4}-\d{2}-\d{2}$/.test(state.snoozedUntil) ? state.snoozedUntil : null;
  return { days, rated: state.rated === true, snoozedUntil };
}

/** Records that the popup was opened today. */
export function recordVisit(raw, today) {
  const state = normalizeRateState(raw);
  if (!state.days.includes(today)) state.days = [...state.days, today].slice(-MAX_DAYS);
  return state;
}

/** Ask once the extension has been opened on a few separate days, never after rating. */
export function shouldAskForRating(raw, today) {
  const state = normalizeRateState(raw);
  if (state.rated) return false;
  if (state.snoozedUntil && today < state.snoozedUntil) return false;
  return state.days.length >= RATE_AFTER_DAYS;
}

export function snooze(raw, today) {
  return { ...normalizeRateState(raw), snoozedUntil: addDays(today, RATE_SNOOZE_DAYS) };
}
