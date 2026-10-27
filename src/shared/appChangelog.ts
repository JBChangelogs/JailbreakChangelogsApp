export interface AppChangelogEntry {
  version: string
  date: string
  added?: string[]
  changed?: string[]
  fixed?: string[]
  removed?: string[]
}

export function formatChangelogMarkdown(entry: AppChangelogEntry): string {
  const sections: [string, string[] | undefined][] = [
    ['Added', entry.added],
    ['Changed', entry.changed],
    ['Fixed', entry.fixed],
    ['Removed', entry.removed]
  ]
  return sections
    .filter(([, items]) => items?.length)
    .map(([title, items]) => `### ${title}\n\n${(items ?? []).map((i) => `- ${i}`).join('\n')}`)
    .join('\n\n')
}

export const UPDATE_NOTES_LIMIT = 10

export function formatUpdateNotes(entries: AppChangelogEntry[]): string {
  return entries
    .slice(0, UPDATE_NOTES_LIMIT)
    .map((entry) => `## ${entry.version}\n\n${formatChangelogMarkdown(entry)}`)
    .join('\n\n')
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff) return diff
  }
  return 0
}

export function notesSince(notes: string, currentVersion: string | undefined): string {
  const blocks = notes.split(/^## /m).slice(1)
  if (!blocks.length || !currentVersion) return notes
  const merged: Record<string, string[]> = {}
  for (const block of blocks) {
    const [version = '', ...lines] = block.split('\n')
    if (compareVersions(version.trim(), currentVersion) <= 0) continue
    let section = ''
    for (const line of lines) {
      if (line.startsWith('### ')) section = line.slice(4).trim().toLowerCase()
      else if (line.startsWith('- ') && section) (merged[section] ??= []).push(line.slice(2))
    }
  }
  return formatChangelogMarkdown({ version: '', date: '', ...merged })
}

export const APP_CHANGELOG: AppChangelogEntry[] = [
  {
    version: '0.8.3',
    date: '2026-10-27',
    changed: [
      'Auto scan now follows your Roblox window by itself and keeps working behind other windows, so there is no area to set and it works on a single monitor',
      'Auto scan finds the trade window at any Roblox window size or display scaling, and only reads the trade itself',
      'Auto scan updates faster while Roblox is the focused window'
    ],
    fixed: [
      "Auto scan no longer flashes items that aren't in the trade, such as names from chat or other players' signs",
      "Scanning a trade where only the other player has added items no longer puts their items on your side or splits them across both sides",
      "The trade scanner no longer says it couldn't start the first time you use it",
      'On Linux, the app no longer turns into a gray screen when opening Trades, and tabs feel smoother'
    ],
    added: ['Crash reports and scan stats are sent with anonymous analytics so we can find and fix problems faster']
  },
  {
    version: '0.8.2',
    date: '2026-10-24',
    added: [
      'Get notified when one of your trades completes, with a shortcut to see it in Trade History',
      'Trade History adds your completed trades as they happen, and updates its totals and chart'
    ]
  },
  {
    version: '0.8.1',
    date: '2026-10-24',
    changed: [
      'Clicking a day on the Trade History chart loads that day’s trades right away',
      'The Trade History sidebar shows all-time totals for trades, pending trades and trade partners'
    ],
    fixed: [
      'New tabs animate in when they open',
      'The unread badge on the Messages tab is no longer cut off',
      'The new tab menu no longer slides along when you open a tab or drag one'
    ]
  },
  {
    version: '0.8.0',
    date: '2026-10-24',
    added: [
      'Tabs in the title bar: open messages, trades, trackers, values, calculators and dupe finders side by side',
      'Open as many values, calculator and dupe finder tabs as you need',
      'Drag tabs to reorder them',
      'Trade History: look up anyone’s trades, with a chart of how many they made each day',
      'Your tabs, and what you had open in them, are saved between sessions',
      'Prefer the sidebar icons? Switch to Simple navigation in Display settings',
      "The What's new window now shows every change since the version you were on"
    ],
    changed: [
      'Uninstall moved to the About section in Settings',
      'Tooltips across the app now match the rest of the app',
      'The emoji picker shows the name of the emoji you hover',
      'Switching pages is faster'
    ],
    fixed: [
      'Choosing an option near the bottom of Settings no longer shifts the page out of place',
      'Option cards in Settings no longer show an outline after you click them and press a key'
    ]
  },
  {
    version: '0.7.3',
    date: '2026-10-24',
    changed: [
      'Gifts sent from Settings no longer start a message with the person you gift',
      'Hiding a conversation no longer shows an undo message'
    ]
  },
  {
    version: '0.7.2',
    date: '2026-10-24',
    added: ['Click the name above a reply to open their profile'],
    changed: [
      'Messages show display names instead of usernames',
      'Mention suggestions show the username next to the display name'
    ],
    fixed: [
      'The typing indicator no longer covers the newest message',
      'People who came online while you were away now show as online when you reconnect',
      'Messages reconnect right away after your computer wakes from sleep'
    ]
  },
  {
    version: '0.7.1',
    date: '2026-10-24',
    fixed: [
      "The What's new window has tidier spacing and bulleted lists",
      'Notification descriptions have tighter spacing'
    ]
  },
  {
    version: '0.7.0',
    date: '2026-10-24',
    added: [
      'React to messages, with your most-used emoji one click away',
      'Mention people with @ in messages, with suggestions as you type',
      'Right-click a message to react, reply, copy its text and more',
      'Join history shows how many times you have joined each robbery',
      'Search and grouped sections in Privacy settings'
    ],
    changed: [
      'Game invites show the game icon, and can only be sent from Jailbreak',
      'Discord status shows the icon of the game you are playing',
      'Clearer screens when the robbery or bounty tracker is empty, connecting or offline',
      'Clearer screens in the Dupe Finder before and after searching',
      'Sidebars have consistent spacing, with search first and filters last',
      'The notification popover matches the website',
      'Message hover highlight is brighter'
    ],
    fixed: [
      'Reacting to a message no longer jumps you to the bottom of the chat',
      'Read receipts no longer reappear when you reopen a chat',
      'Selecting a filter no longer shifts the sidebar',
      'Desktop notifications on Windows show the app icon',
      'People who joined a server show their Roblox avatar again',
      'Robbery status badges are easier to read'
    ]
  },
  {
    version: '0.6.9',
    date: '2026-10-23',
    fixed: ['Buttons at the bottom of dialogs now have even spacing on every side']
  },
  {
    version: '0.6.8',
    date: '2026-10-23',
    fixed: ['Clicking Reply now puts the cursor in the message box']
  },
  {
    version: '0.6.7',
    date: '2026-10-23',
    changed: [
      'Clicking Reply on a message puts the cursor in the message box',
      'The Playing banner is now part of the account panel at the bottom of the sidebar',
      'Checkboxes have slightly smaller corners'
    ],
    fixed: ['The alerts notice in the tracker sidebar has even spacing above and below it']
  },
  {
    version: '0.6.6',
    date: '2026-10-23',
    changed: [
      'Trade scanning is about twice as fast, and the first scan no longer waits for the scanner to load',
      'Snipping a trade reads it right after you finish selecting, without a pause'
    ]
  },
  {
    version: '0.6.5',
    date: '2026-10-23',
    added: [
      "Desktop notifications for new messages show who sent them, and now also arrive while the Messages tab is open but the app isn't focused",
      'Uninstall can now also remove your settings, sign-in and other app data',
      'A Tab style setting in Display, synced with the website: Underline or Filled',
      'Accent colors and card styles for your profile cards, in Settings > Profile',
      'Email notifications can be turned on or off in Notifications',
      'Messages that reply to you are highlighted, and Escape cancels a reply',
      'Group names can be set when starting a group chat',
      'The alerts notice in the tracker sidebar can be closed, and Clear shortcuts can be collapsed'
    ],
    changed: [
      "Settings were redesigned to match the website, with Account renamed to Profile, Supporter Gifts to Supporter and What's New to About",
      'Messages are easier to read, with Discord-style text colors, spacing, replies and typing indicator',
      'Tabs, buttons, checkboxes and colors now match the website and follow custom themes',
      'The tracker status bar shows uptime as one continuous bar',
      'Robberies switch to a list when the window is narrow, and value cards keep a consistent size',
      'Scrollbars no longer take up space on Windows'
    ],
    fixed: [
      'Resizing the window on the robberies page is no longer slow',
      'Tooltips close as soon as you move off the item they belong to',
      'Focus outlines no longer appear after clicking something and pressing a key other than Tab',
      'Messages no longer jump when cancelling a reply'
    ]
  },
  {
    version: '0.6.4',
    date: '2026-10-23',
    changed: ['New updates now show up as soon as they are released, instead of up to 30 minutes later']
  },
  {
    version: '0.6.3',
    date: '2026-10-23',
    changed: [
      "Group chats no longer show the member count next to the name, and the owner's edit pencil is centred with an Edit Group tooltip",
      'The Uninstall button now sits above the Back to app divider in the Settings sidebar'
    ],
    fixed: ['The Uninstall button now removes the app on Windows']
  },
  {
    version: '0.6.2',
    date: '2026-10-23',
    added: ['An Uninstall button at the bottom of the Settings sidebar removes the app from this computer, after asking to confirm'],
    changed: [
      'Installing on Windows is now one click: the installer shows a progress bar and opens the app when it finishes',
      'Updating from the previous version now closes and removes the old app straight away'
    ]
  },
  {
    version: '0.6.1',
    date: '2026-10-23',
    fixed: [
      'Updating from the previous version of the app now works. Pressing Update no longer just hides the banner',
      'The previous version of the app is now removed after updating, including older installs that were missed before'
    ]
  },
  {
    version: '0.6.0',
    date: '2026-10-22',
    added: [
      'The trade scanner is now a one-time download the first time you use it, instead of being part of every install and update'
    ],
    changed: [
      'Jailbreak Changelogs has been rebuilt on a much lighter engine: downloads and updates are a few MB instead of almost 200 MB, it opens almost instantly and uses less memory',
      'Your settings, theme, filters and sign-in carry over from the previous version',
      'The previous version is removed automatically once the new one is installed, along with about 115 MB of leftover cache files'
    ]
  },
  {
    version: '0.5.18',
    date: '2026-10-22',
    added: [
      "A new update banner shows what's in each update, with What's new and an Update button so you can install it when you're ready",
      'Updates found when the app starts now install automatically behind a progress screen'
    ],
    changed: [
      'Gets the app ready to move to the new, much smaller and faster version of Jailbreak Changelogs, which keeps your settings and sign-in',
      'The value chart, image cropper and notification text now load the first time you use them, so the app starts faster'
    ]
  },
  {
    version: '0.5.17',
    date: '2026-10-21',
    added: [
      'Group chats: start one from the new + next to Messages by picking more than one person. Groups sit in your conversation list alongside DMs',
      'Group chats have a member list on the right that shows who is online, an Invite to Group button, and a generated group icon. The owner can rename the group by clicking its name and remove members',
      'Leave or delete a group from the X on its row in your conversation list',
      'Messages now have day dividers, and group changes (people joining, leaving, being removed, or the group being renamed) show in the chat with clickable names',
      'Custom themes from the website: pick your own, or paste a theme code or share link to try it on before using it. Your custom theme stays in sync with the website',
      'Your mouse back and forward buttons now move between tabs, chats and settings pages',
      'Dupe Finder cards now have a Dupe check that compares the copy with the original, plus Compare histories and History buttons'
    ],
    changed: [
      'User profiles now open as a Discord-style card with their banner, description and badges, and always open beside what you clicked',
      'Supporter III avatars are shown as rounded squares everywhere, like on the website',
      "The Value Calculator's You give and You receive panels now use the same item cards as the website, with season and level badges, notes, and a quantity stepper",
      "Trade ads now list their items like the website, with each item's value and the Total, Cash and Duped totals for each side",
      'Dupe Finder cards now match the website and show the original owner',
      'Display settings were reorganized, and themes are now picked from a Change theme panel',
      'Switching between tabs is now instant after the first visit, and each tab keeps its filters and scroll position',
      'The Values list and the calculator scroll smoothly, even with every item loaded'
    ]
  },
  {
    version: '0.5.16',
    date: '2026-10-14',
    added: [
      "Every theme from the website is now in the app, including Halloween, OG, Future Tone and Catppuccin, and your theme stays in sync with the website",
      'A new Display section in Settings to pick your theme, turn on the theme cursor and show or hide the theme button in the title bar'
    ],
    changed: [
      'The theme button in the title bar now opens Display settings',
      'The Use Twemoji setting moved from Account to Display'
    ],
    fixed: [
      'The selected conversation name is readable on light themes',
      'The fade behind the message box matches the theme instead of always being black'
    ]
  },
  {
    version: '0.5.15',
    date: '2026-10-14',
    added: [
      'Make Offer now asks whether to send a Quick Offer (exactly what the ad asks for) or build a Custom Offer',
      "Shortcuts for the calculator's Clear button: Shift + click clears both sides, Ctrl + click clears Offering and Ctrl + right-click clears Requesting. They're listed at the bottom of the calculator sidebar"
    ],
    changed: [
      "Custom offers are made on their own page with the full item picker instead of a cramped popup, and Back returns you to wherever you started the offer",
      "Creating a trade ad and making an offer now show their title and Back button in the page header, like a trade ad's own page",
      'Pick how long a trade ad lasts from the timer button next to Post Trade Ad',
      "The calculator's offering and requesting totals stay pinned under the header while you scroll, in a more compact form",
      "Calculator item cards now show demand and trend for items that have no value or can't be traded",
      'The clean, duped or OG dropdown on calculator items now sits next to the item name',
      'Custom offers need at least one item before they can be sent'
    ],
    fixed: [
      'The Value Calculator header now lines up with the navigation bar and stays in place while you scroll',
      'Adding the first item to either side of the calculator no longer makes the page jump'
    ]
  },
  {
    version: '0.5.14',
    date: '2026-10-06',
    added: [
      "Value Calculator page (between Values and Dupe Finder): add items to each side and see both totals and whether you're giving or getting more, with Swap, Mirror and Clear",
      'Browse items in the calculator with search, sorting, type, demand and trend filters, or pick from your own inventory',
      'Scan trade: draw a box around a trade window and the calculator fills itself in. Scanning runs on your computer',
      'Auto scan: on the Jailbreak trading server, the calculator follows the open trade live and clears when you leave the trade menu',
      'A "Send usage data" setting under Settings → Privacy'
    ],
    changed: ['Trade ad totals now count duped items at their duped value'],
    fixed: [
      'Discord Rich Presence and the Roblox status bar no longer think you left the game after a few quiet seconds',
      'Fixed a crash when viewing your inventory in trade ads if it had an item without demand or trend info'
    ]
  },
  {
    version: '0.5.13',
    date: '2026-10-06',
    added: [
      'The app is now available for macOS. Mac users get a banner with a download link when a new version is out',
      'Choose how many to remove when an item is stacked (x2 or more) in a trade ad or offer',
      'Quick remove button on each item in the trade ad and offer sidebars',
      'Profile Comment and Item Updated notification preferences'
    ],
    changed: [
      'Notification preferences are now grouped (Trading, Comments and followers, Inventory and items, Other), with a switch for each group and a search box',
      'Deleting a message now asks for confirmation inside the app instead of a system popup',
      'Removed the Email Notifications and custom background settings for now'
    ],
    fixed: ['The settings page no longer shifts sideways when its scrollbar appears']
  },
  {
    version: '0.5.12',
    date: '2026-10-06',
    added: [
      'Shift + click an item to add it to Offering, or Ctrl + click to add it to Requesting, when creating a trade ad or making an offer'
    ],
    changed: [
      'Accepted trade offer messages now show the items that were traded',
      'Robbery tracker cards now stretch to fill the available width'
    ],
    fixed: [
      'Replies in messages no longer sit right up against the message above them',
      'The app icon now loads correctly in the installed app'
    ]
  },
  {
    version: '0.5.11',
    date: '2026-10-06',
    added: [
      'Robbery alerts: click the bell next to a robbery in the tracker sidebar to get notified when it opens',
      'Bounty alerts: get notified when a server\'s total bounty or a single player\'s bounty lands in a range you pick',
      'Alerts keep working while you\'re on other tabs',
      'Message the poster of a trade ad, or anyone who made an offer, straight from the trade details page',
      'Make Offer button on trade ads in the list'
    ],
    changed: [
      'Redesigned trade ad cards with the poster\'s Roblox name, when the ad was created and when it expires',
      'The trade details page now shows who posted the ad, the full item tiles, and when the ad expires',
      'Trade totals now value duped items at their duped value, with a cash/duped breakdown',
      'Clearer empty states for trade ads and offers',
      'Reworked the values filters: grouped sort menu, clearer type tiles, color-coded demand and trend chips, and a Clear all button',
      'Reworked the robbery and bounty tracker sidebars, with live counts per robbery and quick bounty range presets'
    ],
    fixed: [
      'Accepting, declining or deleting trade offers now shows an error if it fails instead of silently doing nothing',
      'Demand and trend filter chips no longer shift around when selected',
      'Page headers now line up exactly with the navigation bar',
      'The dupe finder search icon now matches the other search boxes'
    ]
  },
  {
    version: '0.5.10',
    date: '2026-10-06',
    changed: ['Requests to the Jailbreak Changelogs API are now marked as coming from the desktop app']
  },
  {
    version: '0.5.9',
    date: '2026-10-05',
    changed: [
      'Moved the app onto the new v2 Jailbreak Changelogs API',
      'The value list now loads items page by page as you scroll, with search, filters and sorting handled by the server, so it opens faster',
      'Similar items on an item\'s page now come from the server'
    ],
    fixed: [
      'Fixed the value list failing to load'
    ]
  },
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
