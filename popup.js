const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');

// ── Apply Theme ───────────────────────────────
saveBtn.addEventListener('click', () => {

  const settings = {
    bgColor: document.getElementById('bgColor').value,
    textColor: document.getElementById('textColor').value,
    accentColor: document.getElementById('accentColor').value,
    hoverColor: document.getElementById('hoverColor').value,
  };

  // Save settings
  chrome.storage.sync.set(
    { bbTheme: settings },
    () => {

      // Find current tab
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true
        },
        (tabs) => {

          if (!tabs[0]) return;

          // Send live update
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              type: 'BB_THEME_UPDATE',
              settings
            },
            () => {

              if (chrome.runtime.lastError) {
                console.error(
                  chrome.runtime.lastError.message
                );
              } else {
                console.log('Theme updated');
              }

            }
          );

        }
      );

      saveBtn.textContent = 'Saved!';

      setTimeout(() => {
        saveBtn.textContent = 'Apply Theme';
      }, 1500);

    }
  );

});

// ── Reset Theme ───────────────────────────────
resetBtn.addEventListener('click', () => {

  chrome.storage.sync.remove(
    'bbTheme',
    () => {

      chrome.tabs.query(
        {
          active: true,
          currentWindow: true
        },
        (tabs) => {

          if (!tabs[0]) return;

          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              type: 'BB_THEME_RESET'
            }
          );

        }
      );

    }
  );

});

// ── Load Saved Settings ───────────────────────
chrome.storage.sync.get(
  'bbTheme',
  (data) => {

    const settings = data.bbTheme;

    if (!settings) return;

    document.getElementById('bgColor').value = settings.bgColor || '#0f172a';

    document.getElementById('textColor').value = settings.textColor || '#e2e8f0';

    document.getElementById('accentColor').value = settings.accentColor || '#6366f1';

    document.getElementById('hoverColor').value = settings.hoverColor || '#1e293b';

  }
);