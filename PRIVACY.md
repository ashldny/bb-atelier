# Bb Atelier Privacy Policy

_Last updated: 26 November 2026_

This policy is also published at https://ashldny.github.io/bb-atelier/privacy.html

Bb Atelier is a browser extension that changes how Blackboard Ultra looks: themes, fonts and course covers. It is built to work without collecting anything about you.

## The short version

- Bb Atelier does not collect, sell or share personal data.
- Everything you set up stays in your own browser, unless you choose to share a theme.
- It has no accounts, no analytics, no ads and no tracking.
- Nothing leaves your browser unless you choose to: open the theme gallery, share a theme to it, or send a feedback note.

## What stays in your browser

Bb Atelier saves these in your browser's extension storage (`chrome.storage`):

- Your theme colours, saved themes and light/dark settings
- Your chosen typeface, including any font file you upload
- Course cover images you upload, with their crop and position
- Any extra school addresses you connect
- Your text size setting
- A random ID for the theme gallery (see below)

If you are signed in to Chrome with sync turned on, Chrome may sync some of these settings between your own devices. That is handled by Google, not by Bb Atelier. Large items such as images and fonts stay on the device where you added them.

You can delete all of it at any time by removing the extension, or by using **Reset everything** in the extension's Settings tab.

## What Bb Atelier reads on Blackboard pages

To restyle a page, Bb Atelier reads the page's own layout and stylesheets inside your browser. On your Courses page it also reads course names and card images, only so you can choose which course gets a cover; they stay in your browser. It does not store or send your courses, grades, messages, assignments or any other content, it does not record the pages you visit, and it makes no network requests of its own while restyling.

## Theme gallery

The **Gallery** in the Saved tab shows color themes that other people chose to share. It is run by the developer on [Supabase](https://supabase.com/privacy), a database hosting service.

- **Browsing the gallery** downloads the list of shared themes. To mark the themes you shared and to count each person's use or report once, the extension sends a random ID that it creates for your copy of the extension. It is not linked to your name, email, Google account or Blackboard account, and the server stores only a one-way hash of it.
- **Sharing a theme** publishes its colors, the name of its typeface if it is one of the fonts built into Bb Atelier, the theme name you type and, if you enter one, a display name. Anyone using Bb Atelier can see them. Fonts you upload, course covers and anything from Blackboard are never shared. Please don't use your full name or other personal information as a display name.
- **Using, saving or reporting** a gallery theme sends that theme's ID with your random ID, so uses and reports are counted once per person. A theme is hidden after several reports.
- You can remove a theme you shared at any time from the Gallery, and you can reset your random ID by removing the extension or using **Reset everything**.

The hosting service processes these requests under its own privacy policy, which may include technical details such as your IP address.

## Feedback

The extension has an optional feedback box. If you type a note and press **Send**, only the text you wrote is sent to a Google Form owned by the developer. It does not include your name, email, Blackboard account or browsing data. Google processes the submission under [Google's Privacy Policy](https://policies.google.com/privacy), which may include technical details such as your IP address.

Please don't put personal information in a feedback note.

## Permissions

| Permission                    | Why it is needed                                          |
| ----------------------------- | --------------------------------------------------------- |
| Blackboard sites              | Apply your theme to the Blackboard pages you open         |
| `storage`, `unlimitedStorage` | Save your themes, fonts, covers and images on your device |
| `activeTab`, `scripting`      | Reconnect to an open Blackboard tab after an update       |
| Optional site access          | Only asked for when you connect your own school address   |

## Children

Bb Atelier collects no personal data from anyone, including children.

## Changes

If this policy changes, the new version will be posted here with a new date. Bb Atelier will not start collecting personal data without updating this policy first.

## Contact

Questions or concerns: open an issue at [github.com/ashldny/bb-atelier/issues](https://github.com/ashldny/bb-atelier/issues).

Bb Atelier is an independent project and is not affiliated with or endorsed by Blackboard Inc. or Anthology Inc.
