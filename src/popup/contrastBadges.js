import { contrastRatio, contrastText } from '../theme/colorUtils.js';

export function updateContrastBadges() {
  for (const [input, output] of [
    ['pageBgPicker', 'hexPageBg'],
    ['activeTabGlowPicker', 'hexAccent'],
    ['navbarPicker', 'hexNavbar'],
    ['pageTextPicker', 'hexPageText'],
  ]) {
    const picker = document.getElementById(input);
    const label = document.getElementById(output);
    if (picker && label) label.textContent = picker.value;
  }
  const bg = document.getElementById('pageBgPicker').value;
  const automatic = document.getElementById('autoTextToggle').checked;
  const text = automatic ? contrastText(bg) : document.getElementById('pageTextPicker').value;
  const ratio = contrastRatio(bg, text);
  const good = ratio >= 4.5;
  const sample = document.getElementById('contrastSample');
  sample.style.background = bg;
  sample.style.color = text;
  document.getElementById('contrastRatio').textContent = `${ratio.toFixed(1)}:1`;
  const summary = document.getElementById('contrastSummary');
  summary.textContent = good ? 'Good readability' : 'Try a lighter or darker text color';
  document.getElementById('contrastCard').classList.toggle('warn', !good);
}
