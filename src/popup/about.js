import { sendFeedback } from '../utils/feedback.js';
import { showToast } from '../utils/ui.js';

/** About tab: an in-popup dialog that sends feedback anonymously. */
export function initAbout() {
  const backdrop = document.getElementById('feedbackDialog');
  const form = document.getElementById('feedbackForm');
  const message = document.getElementById('feedbackMessage');
  const status = document.getElementById('feedbackStatus');
  const send = document.getElementById('feedbackSend');
  const opener = document.getElementById('feedbackBtn');

  function setStatus(text, error = false) {
    status.textContent = text;
    status.classList.toggle('err', error);
  }
  function open() {
    setStatus('');
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add('show'));
    message.focus();
  }
  function close() {
    backdrop.classList.remove('show');
    backdrop.hidden = true;
    opener.focus();
  }

  opener.addEventListener('click', open);
  document.getElementById('feedbackCancel').addEventListener('click', close);
  backdrop.addEventListener('click', (event) => event.target === backdrop && close());
  backdrop.addEventListener('keydown', (event) => event.key === 'Escape' && close());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    send.disabled = true;
    setStatus('Sending…');
    try {
      await sendFeedback(message.value, chrome.runtime.getManifest().version);
      message.value = '';
      close();
      showToast('Thanks! Your feedback was sent.');
    } catch (error) {
      setStatus(
        error instanceof TypeError ? 'Could not send. Check your connection.' : error.message,
        true
      );
    } finally {
      send.disabled = false;
    }
  });
}
