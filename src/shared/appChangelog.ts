export interface AppChangelogEntry {
  version: string
  date: string
  added?: string[]
  changed?: string[]
  fixed?: string[]
  removed?: string[]
}

export const APP_CHANGELOG: AppChangelogEntry[] = [
  {
    version: '0.5.8',
    date: '2026-09-27',
    added: [
      'Robbery/Bounty trackers now show who else (of this app\'s users) is currently in a server, with avatars, via a live roster',
      'A "Hide Joined Servers" toggle in the Robbery/Bounty tracker filters - turn it off to keep a joined server visible with a small checkmark instead of hiding it'
    ],
    changed: [
      'Recording a "Join" click now goes through the tracker connection directly instead of a separate request, so it can\'t fall out of sync with the live server list'
    ]
  },
  {
    version: '0.5.7',
    date: '2026-09-26',
    changed: [
      'The download percentage during a Windows update now paces itself off how long the last step actually took instead of a fixed speed, so the steps between real progress updates are no longer noticeable'
    ]
  },
  {
    version: '0.5.6',
    date: '2026-09-26',
    changed: [
      'Restyled the update download/restart notice to sit flush with the title bar as a slim single-line strip, instead of a bulkier colored banner'
    ]
  },
  {
    version: '0.5.5',
    date: '2026-09-26',
    added: [
      'A "Check for Updates" button in Settings > What\'s New, next to your current version'
    ],
    changed: [
      'The download percentage during a Windows update now ticks up smoothly instead of jumping in steps'
    ]
  },
  {
    version: '0.5.3',
    date: '2026-09-26',
    changed: [
      'Switched the Windows installer/updater to a new engine (Velopack, replacing Squirrel.Windows) - if this particular update doesn\'t apply automatically, redownload and run the installer once from the site and auto-updates will work normally again from then on',
      'Windows updates now show real download progress (e.g. "62%") while downloading instead of just an indeterminate spinner'
    ]
  },
  {
    version: '0.5.2',
    date: '2026-09-21',
    fixed: [
      'Fixed the new Roblox status sometimes briefly claiming you were playing Jailbreak right when the app opened, even with Roblox fully closed',
      'Fixed badges (supporter, early adopter, server tag) in a user\'s profile popover getting cropped or overlapping instead of wrapping to a second line'
    ]
  },
  {
    version: '0.5.1',
    date: '2026-09-21',
    added: [
      'A "Playing X" status now shows above your account panel whenever you\'re actually in a Roblox game, with the Jailbreak logo when that\'s what you\'re playing'
    ],
    fixed: [
      'Fixed Roblox activity getting stuck showing the game you were in after you\'d already left it, if Roblox itself stayed open in the background'
    ]
  },
  {
    version: '0.5.0',
    date: '2026-09-21',
    added: [
      'Notification preferences in Settings - choose which events (trade offers, followers, comment replies, and more) actually notify you, plus a separate email notifications toggle',
      'Trade ad creation now happens right in the sidebar - offering, requesting, note, expiration, and the post button all live there while you pick items in the main panel',
      'A "..." menu on each item in a trade ad you\'re building - move it to the other side, change its condition, or remove it, without removing and re-adding it',
      'Real icons for the custom trade slots (Adds, Overpays, Upgrades, etc.) instead of text-only pills'
    ],
    changed: [
      'Rounded corners across the whole app reworked into a consistent, more rounded style - buttons, inputs, cards, and popovers all follow the same scale now',
      'Every popover, dropdown, and right-click menu now shares consistent rounding and background, including on individual menu items, which previously looked squared-off inside the rounded panel',
      'Blocking a user now shows an in-app confirmation dialog instead of the OS\'s native confirm popup',
      'Trade ad cards redesigned - items now show as proper thumbnails with their name and type, hover for value/demand/trend, and totals sit below a divider instead of next to each item',
      'Item cards in the trade ad item picker now show type, demand, and value at a glance instead of just a name and price',
      'The trade ad item picker only renders a page of items at a time instead of all 900+ at once, fixing slow scrolling and tab switching',
      'The color accent on game invite/gift embeds in chat is now a slim bar along the card\'s edge instead of a thick outer border'
    ],
    fixed: [
      'Fixed trade ad and offer avatars not showing at all - they were reading a field the API never sends, now using the linked Roblox avatar instead'
    ]
  },
  {
    version: '0.4.3',
    date: '2026-09-16',
    fixed: [
      'Fixed the message composer\'s text not being vertically centered in its input box'
    ]
  },
  {
    version: '0.4.2',
    date: '2026-09-13',
    fixed: [
      'Fixed a few background requests (Discord Rich Presence location/identity lookups, DevTools access checks) not identifying themselves as coming from the desktop app the same way the rest of the app does'
    ]
  },
  {
    version: '0.4.1',
    date: '2026-09-13',
    changed: [
      'Requests to the API now identify themselves as coming from the desktop app internally - no visible change, just more accurate backend analytics'
    ]
  },
  {
    version: '0.4.0',
    date: '2026-09-13',
    added: [
      'Completely redesigned Settings into a full page with dedicated Account, Privacy, Notifications, Rich Presence, Supporter Gifts, and What\'s New sections',
      'Custom avatar and banner uploads with crop/zoom, plus a live profile preview showing your current image before you switch to it',
      'A "Use Twemoji" toggle for emoji rendering, synced to your account',
      'Fine-grained Rich Presence controls - toggle the details/state text, Roblox badge, Join Server button, and Visit Website button independently, with a live preview of exactly what your Discord status will look like',
      'A Supporter Gifts section - redeem a gift for yourself, send one to another user, or buy a new one',
      'An uptime status monitor at the top of the Robbery and Bounty trackers, showing live bot health with a heartbeat history you can hover for ping/timestamp details, updated in real time the moment something goes down',
      'In-app notification toggle, separate from desktop notifications',
      'Markdown support in the notifications popover, plus a link to notification settings and safer link handling'
    ],
    changed: [
      'Settings toggles are now iOS-style switches instead of checkboxes',
      'The app remembers which tab and settings section you were on across a reload',
      'Server region lookups for the Robbery/Bounty trackers are now batched into one request instead of one request per visible card',
      'Notifications popover restyled to match the website more closely (tabs, sizing, spacing)'
    ],
    fixed: [
      'Fixed a crash when opening an item with no value suggestions or changelog history',
      'Fixed a crash on comments from a user with no username set',
      'Fixed the "mark all as read" icon rendering as a garbled shape instead of a checkmark',
      'Fixed the avatar/banner crop screen showing solid black instead of the selected image'
    ]
  },
  {
    version: '0.3.4',
    date: '2026-09-12',
    added: [
      'Discord Rich Presence now shows a controller badge and "Inside Jailbreak"/"Inside Trading" status while you\'re actually in a tracked Roblox server, with a Join Server button for Jailbreak',
      'A settings page, accessible from the gear icon next to your account'
    ],
    changed: [
      'Discord Rich Presence now automatically reconnects if Discord itself reloads or restarts, instead of staying disconnected for the rest of the session'
    ],
    fixed: [
      'Roblox activity detection no longer misses an already-in-progress server when the app starts after Roblox'
    ]
  },
  {
    version: '0.3.3',
    date: '2026-09-12',
    added: [
      'Right-click context menu on messages (Reply/Edit/Delete/Report), matching the hover "..." menu',
      'Custom avatar support for users who have one set',
      'A typing indicator in DMs, shown as an animated dot cluster on the sender\'s presence dot and a "is typing…" row above the composer'
    ],
    fixed: [
      'Fixed a scroll-position bug where the message list could clip the last message when the typing indicator or reply preview appeared',
      'Widened the Content-Security-Policy for images so custom avatars hosted on third-party image hosts actually load'
    ]
  },
  {
    version: '0.3.2',
    date: '2026-09-12',
    fixed: [
      'Fixed the app icon not showing at all on Linux (window icon and taskbar/launcher icon)',
      'Fixed the desktop notification title showing a raw app ID instead of "Jailbreak Changelogs" on Windows',
      'Ctrl+R now actually reloads the app instead of doing nothing'
    ]
  },
  {
    version: '0.3.1',
    date: '2026-09-12',
    added: ['Discord-style typing indicator support', 'Windows install spinner icon quality improvements'],
    fixed: ['Fixed visible pixelation/dithering in the install spinner icon']
  },
  {
    version: '0.3.0',
    date: '2026-09-11',
    added: [
      'Dupe Finder tab - search a Roblox user to see their duped items, compare item variants, and view full ownership history',
      'Full item detail pages with value history charts, suggestions, changelogs, dupes, hoarders, and similar items',
      'Comments on item pages, shown in the sidebar',
      'Native desktop notifications alongside in-app toasts',
      'A working Notifications tab'
    ]
  }
]
