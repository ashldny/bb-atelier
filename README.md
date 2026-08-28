# 🎨 Bb Atelier

**Blackboard Ultra Theme Studio** — A Chrome extension that lets you fully customize the appearance of Blackboard Ultra LMS.

![Version](https://img.shields.io/badge/version-2.0-blue)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange)
![Chrome](https://img.shields.io/badge/Chrome-Extension-yellow)

---

## ✨ Features

### 🎨 Theme Customization
- **3 color pickers** — Page Background, Accent/Brand, Navbar/Sidebar
- **60+ CSS variables** auto-derived from your 3 chosen colors
- **Auto text colors** — light text on dark bg, dark text on light bg
- **Dark & light mode** support with proper CSS variable overrides

### 📦 8 Built-in Presets
| Preset | Background | Accent | Style |
|--------|-----------|--------|-------|
| Midnight | `#1a1a2e` | `#e94560` | Dark |
| Ocean | `#f0f4f8` | `#2563eb` | Light |
| Forest | `#f0fdf4` | `#16a34a` | Light |
| Sunset | `#fefce8` | `#ea580c` | Light |
| Lavender | `#faf5ff` | `#9333ea` | Light |
| Default Dark | `#121212` | `#a234b5` | Dark |
| Default Light | `#ffffff` | `#a234b5` | Light |
| High Contrast | `#000000` | `#00ff00` | Dark |

### 💾 Saved Themes
- Save unlimited custom themes with names
- Load, delete, and manage themes
- **Export** all themes as JSON
- **Import** themes from JSON files (with validation)
- Hover preview on saved themes

### 🔤 Font Customization
- Built-in fonts: Inter, System UI, Segoe UI, Roboto
- Upload custom fonts (`.ttf`, `.otf`, `.woff`, `.woff2` — max 512KB)

### 🖼 Course Covers
- Set custom banner images for any course
- **Upload from file** or **load from URL**
- **Draggable focal point** to adjust which part of the image shows
- **Image Library** — upload images once, assign to multiple courses
- Auto-restores covers on page load

### ⚡ Master Toggle
- Single on/off switch to enable/disable all customization instantly

---

## 📦 Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `blackboard-extension` folder
6. The 🎨 Bb Atelier icon appears in your toolbar

---

## 🚀 Usage

1. Navigate to a supported Blackboard domain
2. Click the extension icon to open the popup
3. Use the **Theme** tab to pick presets or customize colors
4. Use the **Saved** tab to save/load/export/import themes
5. Use the **Covers** tab to set custom course banner images
6. Toggle the master switch in the header to enable/disable everything

---

## 🌐 Supported Domains

- `elearning.qu.edu.qa` — Qatar University eLearning
- `*.blackboard.com` — Any Blackboard-hosted domain
- `*.ultra.blackboard.com` — Blackboard Ultra subdomains

---

## 📁 File Structure

```
blackboard-extension/
├── manifest.json              # Extension manifest (v3)
├── popup.html                 # Popup UI (3 tabs)
├── content.js                 # Content script (CSS injection, covers)
├── style.css                  # Popup styling
├── icons/                     # Extension icons
├── Fonts/                     # Ranade font family (OTF, TTF, Web)
└── src/
    ├── popup/
    │   ├── popup.js           # Entry point
    │   ├── tabs.js            # Tab switching
    │   ├── theme.js           # Theme tab logic
    │   ├── savedThemes.js     # Save/load/export/import
    │   ├── courseCovers.js    # Covers & library
    │   └── settings.js        # Restore settings on open
    ├── theme/
    │   ├── presets.js         # 8 preset themes
    │   ├── palette.js         # Derive 60+ CSS variables
    │   ├── cssBuilder.js      # Generate CSS string
    │   └── colorUtils.js      # Color manipulation utilities
    ├── messaging/
    │   └── themeMessaging.js  # Chrome tab messaging
    └── utils/
        ├── constants.js       # Default colors
        ├── sanitization.js    # XSS prevention, validation
        └── ui.js              # Toast, debounce, hex validation
```

---

## 🔒 Security

- HTML escaping for user input (XSS prevention)
- URL sanitization (only `http:`, `https:`, `data:` protocols)
- File size validation (font: 512KB, images: 2MB)
- Font name sanitization (alphanumeric + spaces only)
- Content Security Policy enforced on extension pages
- Imported themes validated with hex color checks

---

## 🛠 Tech Stack

- **Chrome Extension Manifest V3**
- **Vanilla JavaScript** (ES Modules)
- **Chrome Storage API** (`sync` + `local`)
- **CSS Custom Properties** for theme injection
- **MutationObserver** for dynamic content detection

---

## 📄 License

MIT

---

## 🙏 Credits

Built with ❤️ for Blackboard Ultra users who want a better-looking LMS.
