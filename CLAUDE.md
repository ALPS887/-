# CLAUDE.md — LIME Chat App

This document describes the codebase structure, development workflows, and conventions for the **LIME** real-time chat application. It is intended as a reference for AI assistants working in this repository.

---

## Project Overview

**LIME** is a LINE-inspired real-time group chat web application built with React and Firebase. It supports group messaging, a social timeline, a message bookmarking system (Keep), and user profile management.

The app is entirely client-side (SPA). Firebase serves as the backend: Firestore for real-time data, Authentication for anonymous user identity, and Cloud Storage for media uploads.

---

## Repository Layout

```
/ (repo root)
├── .gitignore
├── CLAUDE.md                  ← this file
└── line-chat-app/             ← the application
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── eslint.config.js
    └── src/
        ├── main.jsx           ← React entry point
        ├── App.jsx            ← Root component, screen router, global context
        ├── App.css            ← All application styles
        ├── index.css          ← Base/reset styles
        ├── firebase.js        ← Firebase init and singleton accessors
        └── components/
            ├── FirebaseSetup.jsx   ← Firebase config input form
            ├── ProfileSetup.jsx    ← New-user name/avatar form
            ├── GroupList.jsx       ← Group list + create/join modals
            ├── Chat.jsx            ← Full-featured chat screen
            ├── Timeline.jsx        ← Social feed (posts + likes)
            ├── Keep.jsx            ← Saved/bookmarked messages
            └── Settings.jsx        ← Profile edit + dark mode toggle
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 |
| Build tool | Vite 7 |
| Language | JavaScript (JSX, ES modules) |
| Linter | ESLint 9 (flat config) |
| Auth | Firebase Authentication (anonymous sign-in) |
| Database | Cloud Firestore (real-time listeners) |
| File storage | Firebase Cloud Storage |
| Styling | Plain CSS with CSS custom properties (no CSS-in-JS, no Tailwind) |

No TypeScript, no state management library (Redux, Zustand, etc.). All state is managed with `useState`/`useContext`.

---

## Development Commands

All commands must be run from **`line-chat-app/`**:

```bash
cd line-chat-app

npm install       # install dependencies
npm run dev       # start dev server (Vite HMR)
npm run build     # production build → dist/
npm run preview   # preview production build locally
npm run lint      # run ESLint
```

There are no test scripts; no test files exist in the codebase.

---

## Application Architecture

### Screen State Machine

`App.jsx` manages a single `screen` state string that acts as a router. Screens in order of the user journey:

| `screen` value | Component rendered | Description |
|---|---|---|
| `'welcome'` | inline JSX | Landing page with "Start" button |
| `'firebaseSetup'` | `<FirebaseSetup>` | Collect Firebase project config |
| `'loading'` | inline JSX | Spinner while auth initializes |
| `'checkProfile'` | `<ProfileSetup>` | Create or reuse existing profile |
| `'groupList'` | `<GroupList>` | List user's groups; create/join |
| `'chat'` | `<Chat>` | Real-time group chat |
| `'timeline'` | `<Timeline>` | Social feed |
| `'keep'` | `<Keep>` | Bookmarked messages |
| `'settings'` | `<Settings>` | Profile and appearance settings |

Navigation is handled via callback props passed down from `App` (e.g., `openChat`, `backToGroupList`, `openTimeline`).

### Global Context (`AppContext`)

Defined in `App.jsx` and exported:

```js
export const AppContext = createContext();
```

Context value shape:

```js
{
  user,                  // Firebase User object (anonymous)
  profile,               // { name, avatar, userId, createdAt }
  darkMode,              // boolean
  toggleDarkMode,        // () => void — persisted to localStorage
  notificationSettings,  // object (placeholder, notifications not yet implemented)
  setNotificationSettings,
  openTimeline,          // () => void
  openKeep,              // () => void
  openSettings,          // () => void
  openChat,              // (groupId, chatType?) => void
  backToGroupList,       // () => void
}
```

`Settings.jsx` is the only component that reads from `AppContext` (via `useContext`). All other components receive data via explicit props.

---

## Firebase Integration

### Initialization Pattern

Firebase is **not** initialized at module load time. The user must supply their own Firebase project config on first launch. The config is persisted to `localStorage` under the key `'firebaseConfig'`.

**`src/firebase.js`** exports:
- `initializeFirebase(config)` — initializes app, auth, db, storage singletons; saves config
- `getFirebaseConfig()` — reads saved config from localStorage
- `getFirebaseInstances()` — returns `{ app, auth, db, storage }` (call this inside event handlers/effects, not at module level)
- `saveFirebaseConfig(config)` — writes config to localStorage

Components always call `getFirebaseInstances()` at the point of use, never importing `auth`/`db` directly as named exports (the named exports at the bottom of `firebase.js` are `null` until `initializeFirebase` is called).

### Authentication

Anonymous sign-in only. On first load after Firebase is ready, `onAuthStateChanged` fires; if no user exists, `signInAnonymously` is called. The resulting `user.uid` is used as the persistent user identity.

User online/offline status is written to `users/{uid}` in Firestore via `updateDoc` on auth state changes and `beforeunload`.

### Firestore Data Model

```
users/{uid}
  name: string
  avatar: string (emoji)
  userId: string
  createdAt: Timestamp
  online: boolean
  lastSeen: Timestamp

groups/{groupId}
  name: string
  code: string          ← 6-char random invite code (uppercase)
  createdBy: string     ← uid
  createdAt: Timestamp
  members: string[]     ← array of uids

groups/{groupId}/messages/{messageId}
  type: 'text' | 'stamp' | 'image' | 'file' | 'voice' | 'location'
  text: string
  userId: string
  userName: string
  userAvatar: string (emoji)
  timestamp: Timestamp
  editedAt?: Timestamp
  isPinned: boolean
  reactions: { emoji, userId, userName, timestamp }[]
  readBy: { userId, userName, readAt }[]
  savedBy: { userId, userName, savedAt }[]
  replyTo?: { id, text, userName, type }
  stamp?: string         ← for type='stamp'
  imageUrl?: string      ← for type='image'
  fileUrl?: string       ← for type='file'
  fileName?: string
  fileSize?: number
  voiceUrl?: string      ← for type='voice'
  latitude?: number      ← for type='location'
  longitude?: number

timeline/{postId}
  userId: string
  userName: string
  userAvatar: string
  text: string
  imageUrl: string | null
  likes: string[]        ← array of uids
  comments: []           ← placeholder, not yet implemented
  timestamp: Timestamp
```

### Firebase Storage Paths

```
{groupId}/image/{timestamp}_{filename}
{groupId}/file/{timestamp}_{filename}
{groupId}/voice/{timestamp}_voice.webm
timeline/{uid}/{timestamp}_{filename}
```

---

## Component Reference

### `FirebaseSetup.jsx`
Collects six Firebase config fields (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`). `apiKey` and `projectId` are required. Calls `onComplete(config)` on submit.

### `ProfileSetup.jsx`
Checks Firestore for an existing user doc (`users/{uid}`). If found, calls `onProfileExists(profile)`. If not, shows a name/avatar picker and creates the doc, then calls `onComplete(profileData)`. Avatar choices are emoji strings.

### `GroupList.jsx`
- Real-time listener on `groups` where `members` array-contains `user.uid`
- Create group: generates a random 6-char uppercase `code`, creates doc
- Join group: queries by `code`, adds `user.uid` via `arrayUnion`
- Clicking a group card calls `onOpenChat(group.id)`

### `Chat.jsx`
The most complex component. Key behaviors:
- Subscribes to `groups/{groupId}/messages` ordered by `timestamp asc`
- On mount: loads group info, subscribes to messages, marks all unread messages as read
- **Message types**: text, stamp (emoji picker), image (via file input), file attachment, voice (MediaRecorder API → webm blob → Storage), location (Geolocation API)
- **Message actions** (on hover): reply, react, edit (own), delete (own), pin/unpin, save to Keep
- **Reactions**: toggled per user+emoji; displayed as grouped badge counts
- **Read receipts**: `readBy` array on each message; "✓✓ Read by N" shown on own messages
- **Pinned messages**: extracted from message list, shown in collapsible banner
- **Search**: client-side filter on `text` and `userName` fields
- `chatType` prop exists but only `'group'` is currently used

### `Timeline.jsx`
- Global feed: subscribes to `timeline` collection ordered by `timestamp desc`
- Supports text + one image per post (10 MB limit)
- Like/unlike via `arrayUnion`/`arrayRemove` on `likes` array
- Relative timestamp formatting in Japanese

### `Keep.jsx`
- Subscribes to all groups the user is a member of, then listens for messages where `savedBy` array-contains `user.uid`
- Filters by message type (all / text / image / file / voice / location / stamp)
- Unsave removes the user's entry from `savedBy` via `arrayRemove`

### `Settings.jsx`
- Profile edit (name + avatar) with save to Firestore; reloads page on save
- Dark mode toggle (reads/writes via `AppContext`)
- Notification settings UI exists but is not functional (noted as future work)
- App version: 2.0.0

---

## Styling Conventions

All styles live in `src/App.css`. There is no component-level CSS or CSS modules.

- CSS custom properties defined on `:root`:
  - `--bg-primary`, `--bg-secondary`, `--bg-card`
  - `--accent` (#84cc16 lime green), `--accent-dark`, `--accent-light`
  - `--text-primary`, `--text-secondary`
  - `--border`, `--shadow`
- Dark mode is applied by adding the class `dark-mode` to `document.body`
- UI naming convention: `lime-*` prefix for shared/layout classes (`.lime-container`, `.lime-card`, `.lime-btn`, `.lime-input`, `.lime-modal`, etc.)
- Chat-specific classes: `chat-*`, `message-*`, `input-*`
- Screen-specific classes: `timeline-*`, `keep-*`, `settings-*`

---

## Key Conventions

### No TypeScript
The project uses plain JavaScript with JSX. Do not add TypeScript or `.ts`/`.tsx` files.

### Module Imports
Use ES module `import`/`export` syntax. The project uses `"type": "module"` in `package.json`.

### Firebase Access Pattern
Always call `getFirebaseInstances()` inside async functions or effects, not at module top level:

```js
// Correct
const handleSend = async () => {
  const { db } = getFirebaseInstances();
  await addDoc(collection(db, 'groups', groupId, 'messages'), data);
};

// Incorrect — db may be null at module load time
import { db } from '../firebase';
```

### ESLint Rules
- `no-unused-vars` is set to `error` with `varsIgnorePattern: '^[A-Z_]'` (constants in ALL_CAPS or leading underscore are exempt)
- Plugins: `eslint-plugin-react-hooks` (enforces Rules of Hooks), `eslint-plugin-react-refresh` (Vite HMR compatibility)
- Run `npm run lint` before committing

### State Management
- No Redux, Zustand, or similar. State lives in component `useState` hooks.
- Global state (dark mode, current user, profile, navigation callbacks) is passed via `AppContext`.
- Prefer prop drilling for component-specific data rather than expanding the context.

### Error Handling
Errors in async Firebase operations are caught with try/catch and surfaced to the user via `alert()`. This is the existing pattern; match it when adding new operations.

### Internationalization
The UI mixes Japanese and English. Japanese is used for labels, alerts, and placeholders in most screens. English is used in the Chat component. When editing existing screens, match the existing language. New screens should default to Japanese for UI text and English for code/comments.

---

## Known Limitations / Future Work

- **Notifications**: The Settings UI shows a notification toggle, but push notifications are not implemented.
- **Direct messages**: `chatType` prop on `Chat` accepts `'direct'` but only group chat is wired up.
- **Comments on Timeline posts**: The `comments` field exists in Firestore but is not rendered.
- **Keep unsave bug**: `Keep.jsx` calls `arrayRemove(user.uid)` but `savedBy` stores objects (not plain uid strings); the correct entry is `arrayRemove(savedEntry)`. See `Chat.jsx` for the correct implementation.
- **No tests**: There is no test framework or test files.
- **Profile reload**: `Settings.jsx` calls `window.location.reload()` after saving profile changes instead of updating the React state.

---

## Git Workflow

- Active development branch: `claude/claude-md-mlta17fxwlcd54ew-96vBW`
- Default branch: `master`
- Commit messages have been written in a mix of Japanese and English; prefer English for new commits.
- Push with: `git push -u origin <branch-name>`
