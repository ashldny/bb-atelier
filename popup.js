const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');

// When Apply Theme button is clicked, settings are saved and sent to content script
saveBtn.addEventListener('click', () => {
  const settings = {
    bgColor:     document.getElementById('bgColor').value,
    textColor:   document.getElementById('textColor').value,
    accentColor: document.getElementById('accentColor').value,
  };

  chrome.storage.sync.set({ bbTheme: settings }, () => {
    sendToContent(settings); // ← added here, inside the click handler
    saveBtn.textContent = '✓ Saved!';
    setTimeout(() => saveBtn.textContent = 'Apply Theme', 1500);
  });
});

// When Reset button is clicked, settings are reset and default theme is applied
resetBtn.addEventListener('click', () => {
  chrome.storage.sync.remove('bbTheme', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'BB_THEME_RESET' });
    });
    sendToContent({ bgColor: '', textColor: '', accentColor: '' }); // send empty settings to reset
  });
});

// When popup opens, load saved settings and fill in the inputs
chrome.storage.sync.get('bbTheme', (data) => {
  const settings = data.bbTheme;
  if (!settings) return;

  document.getElementById('bgColor').value     = settings.bgColor;
  document.getElementById('textColor').value   = settings.textColor;
  document.getElementById('accentColor').value = settings.accentColor;
});

function sendToContent(settings) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'BB_THEME_UPDATE', settings });
    }
  });
}