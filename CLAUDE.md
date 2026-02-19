# CLAUDE.md — LIME Chat App

This file provides guidance for AI assistants (Claude and others) working in this repository. It covers project structure, development workflows, conventions, and key architectural decisions.

---

## Project Overview

**LIME** is a LINE-style real-time chat application built with React and Firebase. It replicates core LINE features: group messaging, stamps/stickers, reactions, voice messages, location sharing, a social timeline, and a Keep (saved messages) system.

- **Language**: JavaScript (JSX)
- **Framework**: React 19
- **Build tool**: Vite 7
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Styling**: Plain CSS with custom properties (no CSS framework)

The app lives entirely under `line-chat-app/`. All commands below assume that as the working directory.

---

## Repository Layout

```
/                          # Git root
├── CLAUDE.md              # This file
└── line-chat-app/         # Application root
    ├── index.html         # HTML entry point
    ├── package.json       # Dependencies and npm scripts
    ├── vite.config.js     # Vite configuration
    ├── eslint.config.js   # ESLint (flat config, v9)
    ├── public/
    │   └── vite.svg
    └── src/
        ├── main.jsx       # React entry — mounts <App />
        ├── App.jsx        # Root component, routing, global context
        ├── App.css        # All component styles (~1,800 lines)
        ├── index.css      # Global resets and base typography
        ├── firebase.js    # Firebase SDK init + config helpers
        └── components/
            ├── FirebaseSetup.jsx   # First-run credential form
            ├── ProfileSetup.jsx    # Avatar + name setup
            ├── GroupList.jsx       # Group list, create/join
            ├── Chat.jsx            # Main chat UI (~1,000 lines)
            ├── Timeline.jsx        # SNS-style feed
            ├── Keep.jsx            # Saved messages viewer
            └── Settings.jsx        # Profile edit, dark mode
```

---

## Development Commands

All commands run from `line-chat-app/`:

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

There is **no automated test runner**. Testing is manual (see the checklist in `README.md`).

---

## Architecture

### Screen Routing

There is no React Router. `App.jsx` manages a `screen` state string and conditionally renders the appropriate component:

```
welcome → firebaseSetup → checkProfile → groupList
                                        ↕
                          chat / timeline / keep / settings
```

Transitions happen by calling `setScreen('...')` passed through `AppContext`.

### Global State (AppContext)

`App.jsx` creates a single React Context (`AppContext`) with:

| Value | Type | Purpose |
|---|---|---|
| `user` | object | Firebase Auth user (`uid`, etc.) |
| `userProfile` | object | Firestore user doc (`name`, `avatar`, `online`) |
| `darkMode` | boolean | Theme toggle state |
| `setDarkMode` | fn | Toggle dark mode |
| `screen` | string | Current screen name |
| `setScreen` | fn | Navigate to a screen |
| `selectedGroup` | object | Currently open group doc |
| `setSelectedGroup` | fn | Set active group |

All components consume context via `useContext(AppContext)`.

### Firebase Initialization

`src/firebase.js` handles lazy initialization:
- Firebase config is stored in `localStorage` under the key `firebaseConfig`.
- `initializeFirebase(config)` — initializes the SDK and stores config.
- `getFirebaseConfig()` — returns stored config or `null`.
- `getFirebaseInstances()` — returns `{ app, auth, db, storage }` after init.

No `.env` file is used. The user enters credentials through `FirebaseSetup.jsx` on first run.

---

## Firebase Data Model

### `users/{userId}`
```
name:     string
avatar:   string (emoji)
online:   boolean
lastSeen: timestamp
```

### `groups/{groupId}`
```
name:            string
avatar:          string (emoji)
members:         string[]   (UIDs)
code:            string     (6-digit invite code)
createdBy:       string     (UID)
createdAt:       timestamp
lastMessage:     string
lastMessageTime: timestamp
```

### `groups/{groupId}/messages/{messageId}`
```
userId:      string
userName:    string
userAvatar:  string
text:        string
type:        'text' | 'stamp' | 'image' | 'file' | 'voice' | 'location'
timestamp:   timestamp
readBy:      { userId, userName, readAt }[]
reactions:   { emoji, users: string[] }[]
isPinned:    boolean
savedBy:     string[]   (UIDs — used by Keep)
replyTo:     { id, text, userName, type } | null
fileUrl:     string
fileName:    string
fileSize:    number
voiceUrl:    string
locationUrl: string     (Google Maps URL)
editedAt:    timestamp | null
```

### `timeline/{postId}`
```
userId:    string
userName:  string
userAvatar: string
text:      string
imageUrl:  string | null
likes:     string[]   (UIDs)
comments:  array      (not yet implemented)
timestamp: timestamp
```

### Firestore Security Rules (reference)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    match /groups/{groupId} {
      allow read, write: if request.auth.uid in resource.data.members;
      match /messages/{messageId} {
        allow read, create: if request.auth.uid in
          get(/databases/$(database)/documents/groups/$(groupId)).data.members;
        allow update, delete: if request.auth.uid == resource.data.userId;
      }
    }
    match /timeline/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## Component Responsibilities

### `App.jsx`
- Wraps the entire app in `AppContext.Provider`.
- Signs in anonymously with Firebase Auth on mount.
- Tracks online/offline presence in Firestore.
- Persists `darkMode` to `localStorage` (`limeTheme`).
- Applies `body.dark-mode` class for CSS theming.

### `Chat.jsx` (the largest component, ~1,000 lines)
Handles all in-chat interactions:
- Real-time message subscription via `onSnapshot`.
- Sending text, stamps, images, files, voice, and location.
- Message actions: react, reply, edit, delete, pin, save to Keep.
- Inline search with text highlighting.
- Read receipts: updates `readBy` on the message when opened.
- Voice recording via the `MediaRecorder` API.
- Location via the `Geolocation` API.

### `GroupList.jsx`
- Queries groups where `members` array contains the current UID.
- Create group: generates a random 6-digit `code`.
- Join group: queries by `code`, then adds UID to `members`.

### `Timeline.jsx`
- Posts stored in top-level `timeline` collection.
- Likes stored as an array of UIDs; toggled with `arrayUnion`/`arrayRemove`.

### `Keep.jsx`
- Reads `savedBy` arrays across all groups the user belongs to.
- Filters by message type (text, image, file, voice, location, stamp).

### `Settings.jsx`
- Edits `users/{uid}` document in Firestore.
- Selects from 32 emoji avatars.
- Toggles dark mode via context.

---

## Styling Conventions

All styles live in `src/App.css`. There is no CSS modules or CSS-in-JS.

### CSS Custom Properties (defined on `:root` and `body.dark-mode`)

| Variable | Light | Dark |
|---|---|---|
| `--bg-primary` | `#f0fdf4` | `#0f172a` |
| `--bg-secondary` | `#dcfce7` | `#1e293b` |
| `--bg-card` | `rgba(255,255,255,0.95)` | `rgba(30,41,59,0.95)` |
| `--accent` | `#84cc16` | `#84cc16` |
| `--accent-dark` | `#65a30d` | `#65a30d` |
| `--text-primary` | `#14532d` | `#f1f5f9` |
| `--text-secondary` | `rgba(21,83,45,0.7)` | `rgba(241,245,249,0.7)` |

### Dark Mode

Toggle by adding/removing `dark-mode` class on `<body>`. All component selectors have a `body.dark-mode .component-name` override block in `App.css`.

### Responsive Breakpoints

- Mobile: `max-width: 480px`
- Tablet: `max-width: 768px`

### Named CSS Animations

- `@keyframes pulse` — logo pulsing, recording indicator
- `@keyframes fadeIn` — modal / overlay entrance
- `@keyframes slideUp` — bottom sheet / panel entrance

### Class Naming

No strict BEM. Classes follow a flat kebab-case pattern tied to component names:
- `.chat-container`, `.message-bubble`, `.message-input`
- `.group-list`, `.group-card`
- `.timeline-post`, `.timeline-post-form`
- `.keep-item`, `.keep-filter`
- `.settings-section`, `.settings-option`
- `.lime-btn`, `.lime-input`, `.lime-avatar-*`

---

## Code Conventions

### JavaScript / React

- **ES Modules** throughout (`"type": "module"` in `package.json`).
- **Functional components** only. No class components.
- **Hooks**: `useState`, `useEffect`, `useContext`, `useRef`. No custom hook library.
- **No TypeScript** — plain `.jsx` files.
- Firebase SDK v9 **modular API** used everywhere (`import { doc, getDoc } from 'firebase/firestore'`).
- Async Firestore calls use `async/await`, not `.then()` chains.

### ESLint Rules (from `eslint.config.js`)

- Extends `js.configs.recommended` + React Hooks + React Refresh.
- `no-unused-vars` errors for all variables **except** those matching `^[A-Z_]` (constants).
- Target: `**/*.{js,jsx}`, excludes `dist/`.

### Variable Naming

- Components: `PascalCase`
- Functions, variables: `camelCase`
- Constants / env-like values: `UPPER_SNAKE_CASE`
- CSS class strings passed to `className`: kebab-case string literals

---

## Firebase Storage Layout

```
images/     ← chat image uploads (max 10 MB)
files/      ← chat file attachments (max 10 MB)
voices/     ← voice message recordings (max 5 MB)
timeline/   ← timeline post images (max 10 MB)
```

Authenticated users can upload. All paths are publicly readable.

---

## Authentication

The app uses **Firebase Anonymous Authentication** only. There are no passwords, OAuth providers, or email flows. A user's identity persists in `localStorage` via Firebase's built-in persistence; clearing site data creates a new anonymous user.

---

## Key Limitations and Gotchas

1. **No test suite.** All feature verification is manual. Do not assume automated tests exist.
2. **Firebase config is runtime-provided.** There is no `.env` file and no build-time injection. If the config is absent from `localStorage`, the app shows `FirebaseSetup.jsx`.
3. **Single CSS file.** Adding styles means editing `src/App.css`. Keep dark-mode overrides adjacent to the light-mode rules for the same component.
4. **`Chat.jsx` is very large.** Before editing it, search for the specific function or section rather than reading the whole file.
5. **No router.** Navigation is `setScreen(name)` via context. Attempting to use URL-based navigation requires adding a router library.
6. **Firestore `arrayUnion`/`arrayRemove`** are used for reactions, likes, `readBy`, `members`, and `savedBy`. Keep this pattern consistent.
7. **Real-time listeners** (`onSnapshot`) are set up in `useEffect` hooks and return their own unsubscribe functions — always return the unsubscribe to avoid memory leaks.

---

## Planned / Not-Yet-Implemented Features

The following are listed in `README.md` as future work. Do not assume they are present:

- 1-on-1 DM UI (backend partially ready)
- Member management (add/remove/permissions)
- Custom group icons
- Image album view
- Polls / voting
- Push notifications (Firebase Cloud Messaging)
- Timeline comments
- Message forwarding
- User blocking
- @mention support
- File preview (PDF, etc.)

---

## Working on This Codebase

### Adding a Feature

1. If it touches the chat flow, changes go in `Chat.jsx` and `App.css`.
2. If it's a new top-level screen, create a new component in `src/components/`, add it to the `screen` state machine in `App.jsx`, and add a navigation trigger.
3. New Firestore fields should be documented in the "Firebase Data Model" section above and in `README.md`.
4. For new Firebase Storage paths, update the Storage security rules and this file.

### Modifying Styles

- Edit `src/App.css` directly.
- Add dark-mode variants immediately below the light-mode block for the same selector.
- Respect the existing CSS custom property variables — don't hardcode colors.

### Running Locally Without Firebase

The app cannot run in a fully offline mode. You need a real Firebase project. Follow the setup steps in `README.md` (Firebase Console → create project → enable Auth/Firestore/Storage → enter config at first-run screen).

### Linting

```bash
cd line-chat-app
npm run lint
```

Fix any errors before committing. The `no-unused-vars` rule is set to `error`.
