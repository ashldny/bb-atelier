import { STORE_REVIEWS_URL, STORE_URL } from '../utils/constants.js';
import { dayKey, recordVisit, shouldAskForRating, snooze } from '../utils/ratePrompt.js';
import { showToast } from '../utils/ui.js';

// Ratings and word of mouth are how other students find Bb Atelier in the store. The
// nudge appears after a few separate days of use and never again once someone rates.
export async function initRatePrompt() {
  const nudge = document.getElementById('rateNudge');
  const today = dayKey(new Date());
  const { ratePrompt } = await chrome.storage.local.get('ratePrompt');
  let state = recordVisit(ratePrompt, today);
  const save = () => chrome.storage.local.set({ ratePrompt: state }).catch(() => {});
  save();
  nudge.hidden = !shouldAskForRating(state, today);

  const markRated = () => {
    state = { ...state, rated: true };
    nudge.hidden = true;
    save();
  };
  for (const id of ['rateNudgeLink', 'rateStoreLink']) {
    const link = document.getElementById(id);
    link.href = STORE_REVIEWS_URL;
    link.addEventListener('click', markRated);
  }
  document.getElementById('rateNudgeLater').addEventListener('click', () => {
    state = snooze(state, today);
    nudge.hidden = true;
    save();
  });
  document.getElementById('shareStoreBtn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(STORE_URL);
      showToast('Link copied. Paste it to your classmates!');
    } catch {
      showToast(STORE_URL);
    }
  });
}
