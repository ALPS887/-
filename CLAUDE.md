# CLAUDE.md

This file provides guidance for AI assistants working on this repository.

## Project Overview

**LIME** is a LINE-inspired real-time chat application built with React 19, Firebase, and Vite. It is a single-page application (SPA) supporting group chats, direct messaging, media sharing, reactions, a social timeline feed, and a saved-messages (Keep) feature.

The main source lives in `line-chat-app/`.

---

## Repository Structure

```
/
├── CLAUDE.md                   # This file
├── .gitignore                  # Root-level gitignore (excludes node_modules, archives, build artifacts)
└── line-chat-app/              # Main project directory
    ├── index.html              # HTML entry point
    ├── package.json            # Dependencies & npm scripts
    ├── vite.config.js          # Vite build configuration
    ├── eslint.config.js        # ESLint 9 flat config
    ├── public/                 # Static assets (vite.svg)
    └── src/
        ├── main.jsx            # React entry point (StrictMode)
        ├── App.jsx             # Root component, global state, screen routing
        ├── App.css             # All application styles (~1800 lines)
        ├── index.css           # Global baseline styles
        ├── firebase.js         # Firebase init/config helpers
        └── components/
            ├── Chat.jsx        # Main messaging UI (~1000 lines)
            ├── Timeline.jsx    # SNS-style social feed (~266 lines)
            ├── Keep.jsx        # Saved messages manager (~238 lines)
            ├── GroupList.jsx   # Group management & navigation (~214 lines)
            ├── Settings.jsx    # Profile & app settings (~211 lines)
            ├── ProfileSetup.jsx # Initial profile creation (~107 lines)
            └── FirebaseSetup.jsx # Firebase config input (~98 lines)
```

---

## Development Commands

All commands must be run from the `line-chat-app/` directory:

```bash
cd line-chat-app

npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build → dist/
npm run lint       # Run ESLint
npm run preview    # Preview production build locally
```

**There is no test runner configured.** Manual testing is documented in `line-chat-app/README.md`.

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 19.2.0 |
| Build Tool | Vite | 7.2.2 |
| Backend/Auth | Firebase (Auth, Firestore, Storage) | SDK v9+ modular |
| Linting | ESLint | 9.39.1 |
| Styling | Plain CSS (custom properties) | — |
| State Management | React Context API | — |
| Routing | State-based (no React Router) | — |

**Firebase is not bundled** — users supply their own Firebase project config at runtime. The config is persisted to `localStorage`.

---

## Architecture & Key Patterns

### Screen Routing

Navigation is managed via a `screen` state string in `App.jsx`. There is no URL-based router.

```
'welcome' → 'firebaseSetup' → 'loading' → 'checkProfile' → 'groupList'
                                                                  ↓
                                            'chat' | 'timeline' | 'keep' | 'settings'
```

### Global State — `AppContext`

Defined and exported from `src/App.jsx`:

```js
export const AppContext = createContext();
// Provides: user, profile, darkMode, toggleDarkMode,
//           notificationSettings, setNotificationSettings,
//           openTimeline, openKeep, openSettings, openChat, backToGroupList
```

Consume it in any component with `useContext(AppContext)`.

### Firebase Integration

`src/firebase.js` exposes:
- `initializeFirebase(config)` — call once with the user-provided Firebase config object
- `getFirebaseInstances()` — returns `{ app, auth, db, storage }` after init
- `saveFirebaseConfig(config)` / `getFirebaseConfig()` — localStorage helpers

Always call `getFirebaseInstances()` inside component logic (not at module top-level) because Firebase may not be initialized yet when modules load.

### Authentication

Anonymous Firebase Authentication is used exclusively. `App.jsx` calls `signInAnonymously(auth)` on first run; `onAuthStateChanged` drives screen transitions.

### Real-time Data

Firestore `onSnapshot` listeners are used for live updates. Always unsubscribe in `useEffect` cleanup functions:

```js
useEffect(() => {
  const unsubscribe = onSnapshot(query, (snap) => { /* ... */ });
  return () => unsubscribe();
}, [deps]);
```

### Styling Conventions

- All styles are in `src/App.css` (no CSS modules, no Tailwind).
- Theme tokens are CSS custom properties on `:root` and overridden under `.dark-mode` on `body`.
- Dark mode is toggled by adding/removing `dark-mode` class on `document.body` and persisted to `localStorage`.
- Class naming follows a BEM-inspired pattern: `lime-{component}`, `lime-{component}__{element}`.

---

## Firestore Data Model

```
users/{uid}
  name, emoji, bio, online, lastSeen, createdAt

groups/{groupId}
  name, description, inviteCode, createdBy, createdAt, members[], pinnedMessages[]

messages/{groupId}/messages/{messageId}
  text, type, senderId, senderName, senderEmoji,
  timestamp, edited, editedAt,
  replyTo { id, text, senderName },
  reactions { emoji: [uid, ...] },
  fileUrl, fileName, fileSize, imageUrl, voiceUrl,
  location { lat, lng, address },
  stamp, keptBy[]

timeline/{postId}
  text, imageUrl, authorId, authorName, authorEmoji,
  timestamp, likes[]

keep/{uid}/items/{itemId}
  (saved message snapshots)
```

---

## ESLint Rules

Configuration is in `eslint.config.js` (ESLint 9 flat config format).

- Target: `**/*.{js,jsx}`, ignores `dist/`
- Extends: `js.configs.recommended`, `reactHooks.configs.flat.recommended`, `reactRefresh.configs.vite`
- `no-unused-vars`: error, but variables whose names start with a capital letter or underscore are allowed (e.g., `_unused`, `MyComponent`)

Run before committing:

```bash
cd line-chat-app && npm run lint
```

---

## Firebase Setup (Required for Development)

The app requires a Firebase project with the following services enabled:

1. **Authentication** — Anonymous sign-in enabled
2. **Cloud Firestore** — Database created
3. **Firebase Storage** — Storage bucket created

Provide the Firebase config object through the in-app setup screen (or paste into `localStorage` key `firebaseConfig` as JSON for quick dev iteration).

Firestore and Storage security rules are documented in `line-chat-app/README.md`.

---

## Common Development Tasks

### Adding a New Screen

1. Add a new string value to the `screen` state machine in `App.jsx`.
2. Create a component in `src/components/`.
3. Add a conditional render block in `App.jsx` (following the existing pattern).
4. Add navigation helpers (`openX`, `backToX`) to `App.jsx` and expose them via `AppContext` if needed.

### Adding a New Firestore Collection/Field

1. Update the collection in the relevant component using the modular Firebase SDK.
2. Update Firestore security rules in your Firebase console (refer to `README.md` for the current rules).
3. Document the new field in the data model section above.

### Modifying Styles

1. Add styles to `src/App.css`.
2. For new theme-sensitive values, add CSS custom properties under both `:root` and `.dark-mode`.
3. No CSS preprocessor is in use — plain CSS only.

---

## What to Avoid

- **Do not install React Router or a state management library** (Redux, Zustand, etc.) without explicit discussion — the state-based routing and Context API are intentional choices.
- **Do not initialize Firebase at module top-level** — always use `getFirebaseInstances()` inside component/hook logic.
- **Do not use class components** — the codebase is entirely functional with hooks.
- **Do not add TypeScript** without explicit discussion — the project is intentionally JavaScript with JSX.
- **Do not commit `node_modules/`, `dist/`, or `.env` files** — the `.gitignore` covers these.

---

## Git Conventions

- Branch naming: feature branches use `claude/<description>-<id>` for AI-driven work.
- Commits are in English with a short imperative subject line.
- No pre-commit hooks or automatic formatters are configured.
