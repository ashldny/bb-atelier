import { FEEDBACK_FORM, MAX_FEEDBACK_LENGTH } from './constants.js';

export const isFeedbackConfigured = () =>
  /^[\w-]{20,}$/.test(FEEDBACK_FORM.formId) && /^entry\.\d+$/.test(FEEDBACK_FORM.messageEntry);

/**
 * Post anonymous feedback to the configured Google Form. Only the message and the
 * extension version are sent; no account, email or browsing data.
 * Google Forms sends no CORS headers, so the response is opaque: a resolved request
 * means it was delivered, a network failure rejects.
 * @param {string} message
 * @param {string} version
 */
export async function sendFeedback(message, version) {
  const text = String(message).trim().slice(0, MAX_FEEDBACK_LENGTH);
  if (!text) throw new Error('Write a note first.');
  if (!isFeedbackConfigured()) throw new Error('Feedback isn’t set up yet.');
  const body = new URLSearchParams({ [FEEDBACK_FORM.messageEntry]: text });
  if (/^entry\.\d+$/.test(FEEDBACK_FORM.versionEntry))
    body.set(FEEDBACK_FORM.versionEntry, version);
  await fetch(`https://docs.google.com/forms/d/e/${FEEDBACK_FORM.formId}/formResponse`, {
    method: 'POST',
    mode: 'no-cors',
    credentials: 'omit',
    body,
  });
}
