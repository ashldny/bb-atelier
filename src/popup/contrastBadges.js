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
  const summary = document.getElementById('contrastSummary');
  summary.textContent = `${ratio.toFixed(1)}:1 text contrast · ${ratio >= 4.5 ? 'Good readability' : 'Choose a lighter or darker text color'}`;
  summary.classList.toggle('warn', ratio < 4.5);
}
