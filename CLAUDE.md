# CLAUDE.md — LIME Chat App

This file provides context for AI assistants working on this codebase.

## Project Overview

**LIME** is a LINE-inspired real-time chat application built with React and Firebase. The UI is primarily in Japanese. The app requires users to supply their own Firebase project credentials at runtime; there is no `.env` file or hardcoded backend config.

## Repository Layout

```
/                          # git root
├── .gitignore
└── line-chat-app/         # the entire application lives here
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── eslint.config.js
    ├── public/
    │   └── vite.svg
    └── src/
        ├── main.jsx           # React entry point (StrictMode)
        ├── App.jsx            # Root component – owns all screen state
        ├── App.css            # Global styles (~1800 lines, CSS custom properties)
        ├── index.css          # Base/reset CSS
        ├── firebase.js        # Firebase initialisation & singleton exports
        └── components/
            ├── FirebaseSetup.jsx  # First-run Firebase credential form
            ├── ProfileSetup.jsx   # New-user profile creation / existing profile check
            ├── GroupList.jsx      # Group list, create/join modals
            ├── Chat.jsx           # Main chat screen (~1000+ lines)
            ├── Timeline.jsx       # SNS-style timeline / posts
            ├── Keep.jsx           # Saved-message viewer
            └── Settings.jsx       # Profile edit + dark mode toggle
```

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 |
| Build tool | Vite 7 |
| Auth | Firebase Authentication (anonymous) |
| Database | Cloud Firestore (real-time listeners) |
| File storage | Firebase Storage |
| Linter | ESLint 9 (flat config) |
| Styling | Vanilla CSS with custom properties |
| State | React Context API (`AppContext`) |
| Persistence | `localStorage` (Firebase config, dark-mode preference) |

No TypeScript, no router library, no test framework.

## Development Commands

All commands must be run from the `line-chat-app/` directory:

```bash
cd line-chat-app

npm install        # install dependencies
npm run dev        # start Vite dev server → http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build
npm run lint       # run ESLint
```

## Architecture: Screen-Based Navigation

The app uses a single `screen` state string in `App.jsx` instead of a router. All navigation is driven by `setScreen(...)` calls.

**Screen flow:**

```
welcome
  └─► firebaseSetup  (user enters Firebase config)
        └─► loading   (Firebase initialising / auth resolving)
              └─► checkProfile  (new user → profileSetup → groupList)
                                (returning user → groupList)
                        ├─► chat
                        ├─► timeline
                        ├─► keep
                        └─► settings
```

Screen transition helpers exposed on `AppContext`:
- `openChat(groupId, chatType)` — navigate to chat
- `openTimeline()`, `openKeep()`, `openSettings()`
- `backToGroupList()` — return to group list

## Global State: AppContext

`AppContext` (exported from `App.jsx`) provides:

```js
{
  user,                  // Firebase Auth user object (anonymous)
  profile,               // { name, avatar, userId, createdAt }
  darkMode,              // boolean
  toggleDarkMode,        // () => void  — persisted to localStorage
  notificationSettings,  // object (placeholder, feature not yet built)
  setNotificationSettings,
  openTimeline,
  openKeep,
  openSettings,
  openChat,
  backToGroupList
}
```

Components that need navigation or theme data should consume this context with `useContext(AppContext)`.

## Firebase Integration

### Initialisation

Firebase is initialised lazily in `src/firebase.js`. Module-level singletons (`app`, `auth`, `db`, `storage`) are `null` until `initializeFirebase(config)` is called. Always call `getFirebaseInstances()` rather than importing the raw singletons directly, because they may not be set yet at import time.

```js
import { getFirebaseInstances } from '../firebase';
const { db, storage, auth } = getFirebaseInstances();
```

### Firebase Config Storage

The Firebase project config object is serialised to `localStorage` under the key `'firebaseConfig'` via `saveFirebaseConfig` / `getFirebaseConfig` helpers. On every app load, `App.jsx` checks localStorage and auto-initialises if a saved config exists.

### Firestore Collections

**`users/{userId}`**
```
name: string
avatar: string (emoji)
online: boolean
lastSeen: Timestamp
```

**`groups/{groupId}`**
```
name: string
code: string          (6-char uppercase join code)
createdBy: string     (uid)
createdAt: Timestamp
members: string[]     (array of uids)
lastMessage: string
lastMessageTime: Timestamp
avatar: string
```

**`groups/{groupId}/messages/{messageId}`**
```
userId, userName, userAvatar: string
text: string
type: 'text' | 'stamp' | 'image' | 'file' | 'voice' | 'location'
timestamp: Timestamp
readBy: string[]
reactions: { emoji: string, users: string[] }[]
isPinned: boolean
savedBy: string[]
replyTo: { id, text, userName, type } | null
fileUrl, fileName, fileSize: (for image/file messages)
voiceUrl: string      (for voice messages)
locationUrl: string   (Google Maps URL for location messages)
editedAt: Timestamp | null
```

**`timeline/{postId}`**
```
userId, userName, userAvatar: string
text: string
imageUrl: string | null
likes: string[]       (array of uids)
timestamp: Timestamp
```

### Firestore Security Rules (required)

See `line-chat-app/README.md` for the full rules. Key points:
- Users can only write their own `users/` document.
- Group read/write requires the caller's uid to be in `members`.
- Message update/delete requires `request.auth.uid == resource.data.userId`.
- Timeline is publicly readable; write requires auth.

## Styling Conventions

All styles live in `src/App.css`. The file uses CSS custom properties scoped to `:root` for the light theme and overridden under `.dark-mode` on `<body>`.

**Key CSS classes:**
- `.lime-container` — full-screen centred wrapper
- `.lime-card` — white/dark card panel
- `.lime-btn` / `.lime-btn-secondary` — primary/secondary buttons
- `.lime-input` — form inputs
- `.lime-modal` / `.lime-modal-content` — overlay modals
- `.chat-header` — sticky top bar used in Chat, Timeline, Keep, Settings
- `.back-btn` — back-navigation button (◀)

**Theme custom properties (light mode defaults):**
```css
--bg-primary: #f0fdf4
--bg-secondary: #dcfce7
--bg-card: rgba(255,255,255,0.95)
--accent: #84cc16          /* LIME green */
--accent-dark: #65a30d
--accent-light: #bef264
--text-primary: #14532d
--text-secondary: rgba(21,83,45,0.7)
```

Dark mode overrides are applied by adding the `dark-mode` class to `<body>`.

## Component Responsibilities

| Component | Responsibility |
|---|---|
| `App.jsx` | Screen state machine, auth listener, AppContext provider |
| `firebase.js` | Lazy Firebase initialisation, config persistence |
| `FirebaseSetup.jsx` | Collects and validates Firebase project credentials |
| `ProfileSetup.jsx` | Checks Firestore for existing profile; creates new one |
| `GroupList.jsx` | Lists user groups; create/join group modals |
| `Chat.jsx` | Full messaging UI: send/receive, reactions, replies, edit/delete, stamps, voice, images, files, location, search, pin, keep-save, read receipts, online status |
| `Timeline.jsx` | Public SNS timeline: create/delete posts, image upload, likes |
| `Keep.jsx` | Filtered view of messages the user has saved (via `savedBy` array) |
| `Settings.jsx` | Profile editing (name + avatar emoji), dark mode toggle |

## Key Conventions

1. **No router** — use `setScreen` / context helpers for navigation; never install `react-router`.
2. **Firebase access** — always call `getFirebaseInstances()` inside async functions or effects, never at module scope.
3. **ESLint rule** — `no-unused-vars` is set to `error`; the `varsIgnorePattern: '^[A-Z_]'` exception covers React and screaming-snake-case constants.
4. **No TypeScript** — the project uses plain `.js` / `.jsx`. Do not add `.ts`/`.tsx` files.
5. **CSS in one file** — add new styles to `App.css`; do not create separate CSS files per component.
6. **Japanese UI strings** — user-facing strings are in Japanese. Keep new user-facing text in Japanese to match the existing UX.
7. **Alert for errors** — the project uses `window.alert()` for user-facing errors. Follow this pattern for consistency unless replacing with a proper error UI.
8. **File size limits** — images/files ≤ 10 MB; voice ≤ 5 MB. Enforce at the upload site.
9. **Anonymous auth only** — users are signed in anonymously. Do not introduce email/password or OAuth flows without explicit instruction.
10. **Dark mode** — toggling adds/removes the `dark-mode` class on `document.body`. All new UI elements must have dark-mode-compatible styles.

## Not Yet Implemented (Planned)

- Push notifications (Firebase Cloud Messaging)
- 1-on-1 direct message UI (backend `chatType: 'direct'` exists in `Chat.jsx`)
- Timeline comments
- Member management (add/remove/permissions)
- Mention (`@user`) functionality
- Message forwarding

## Common Pitfalls

- `getFirebaseInstances()` returns `null` values before `initializeFirebase()` is called. Guard all Firebase calls with a check or ensure they only run after `firebaseReady` is `true`.
- `Settings.jsx` calls `window.location.reload()` after a profile save to propagate the updated profile. This is intentional (not a bug) but brittle — avoid extending this pattern.
- `Keep.jsx` nests `onSnapshot` calls inside another `onSnapshot`, which can create listener leaks if the outer snapshot fires multiple times. Be careful when modifying this component.
- The `no-unused-vars` ESLint rule will fail the build if you import something and don't use it. Clean up imports before committing.
