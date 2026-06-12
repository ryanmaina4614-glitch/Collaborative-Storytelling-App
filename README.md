# CoWrite ✍️ (With Editorial Aesthetic)

CoWrite is a highly collaborative, real-time storytelling sandbox designed for master storytellers, casual world-builders, and coordinated saga writers. Built as a full-stack TypeScript application, CoWrite enables multiple authors to draft, critique, and version-control manuscripts simultaneously.

The application has been styled with an **Editorial Aesthetic**—fusing the timeless elegance of premium literary publications with minimalist modern interfaces. Enjoy spacious margins, elegant **Playfair Display** headings, and clean custom-designed controls structured for deep focus and pristine reading.

---

## 📖 Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technical Architecture](#technical-architecture)
- [Installation](#installation)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Real-Time Socket Events](#real-time-socket-events)
- [Deployment Instructions](#deployment-instructions)
- [Testing Instructions](#testing-instructions)

---

## 🌟 Project Overview

CoWrite organizes writing spaces into cohesive "Manuscript Sandboxes" where Authors invite Collaborators to add text, submit revision requests, or comment on precise lines. Features are designed with real-time feedback loops to emulate physical editorial boards.

### Key Features
1. **Real-Time Live Co-Writing**: Live typing synchronization and cursor overlay support for multi-user coordination.
2. **Version timelines**: Automatic-saving checkpoints and immediate version restore points.
3. **Line-by-Line Discussion Thread**: Enable inline feedback node commentary, comments pinning, and direct replies.
4. **Rich Reactions**: Emoji reaction widgets integrated natively on commentary and feedback.
5. **Polished Editorial Layout**: Slate-colored light theme, Georgia/serif Display headings, custom serif paragraph editors, and unified borders.

---

## 🛠️ Technical Architecture

- **Frontend**: React 19, Redux Toolkit, Framer Motion (via `motion/react`), Lucide React, and Tailwind CSS v4.
- **Backend**: Express (Custom Node server with ES Modules handling).
- **Compilation/Bundler**: Vite dev server with native `esbuild` configurations for bundled CommonJS output.
- **Real-Time Layer**: Custom integrated Socket.IO handling.
- **In-Memory Store**: Thread-safe modular JSON database backend utility with automatic cache writes.

---

## 🚀 Installation

To set up and run CoWrite locally:

### 1. Prerequisites
Ensure you have **Node.js** (v18.x or higher) and **npm** installed.

### 2. Clone and Install Dependencies
Navigate to the project root directory and install all packages:
```bash
npm install
```

### 3. Set Up Environment Config
Create a copy of `.env.example` named `.env` and fill in necessary fields:
```bash
cp .env.example .env
```

---

## 📜 Scripts

CoWrite utilizes unified scripts defined in `package.json` to handle development execution and production compilations:

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `tsx server.ts` | Launches the backend server and mounts Vite's developer middleware on port `3000`. |
| `npm run build` | `vite build && esbuild...` | Compiles the client bundle into `/dist` and bundles the Express server to CJS `/dist/server.cjs` via `esbuild`. |
| `npm run start` | `node dist/server.cjs` | Starts the production server using the optimized, compiled JavaScript asset bundle. |
| `npm run lint` | `tsc --noEmit` | Compiles and validates TypeScript code integrity across the workspace. |

---

## 🔑 Environment Variables

Define the following environment variables in your `.env` configuration:

- **`GEMINI_API_KEY`**: *(Optional)* Required if integrating Gemini generation AI endpoints. Configurable in AI Studio via Settings.
- **`APP_URL`**: *(Optional)* Specifies the canonical deployment ingress URL (automatically injected by Google AI Studio's Cloud Run compiler environment).
- **`JWT_SECRET`**: Custom private secret key used to generate validation tokens for user login sessions. Falls back safely if left empty.
- **`REFRESH_SECRET`**: Secret seed key to safely mint authorization tokens. Falls back safely.

---

## 📡 API Endpoints

The backend server exposes the following JSON REST endpoints over `/api/*`:

### 🔐 Authentication Context
- `POST /api/register` — Create a new author profile. Requires `{ username, email, password }`.
- `POST /api/login` — Sign in and claim session tokens. Requires `{ email, password }`.
- `POST /api/refresh` — Renew session access tokens. Requires `{ refreshToken }`.
- `POST /api/logout` — Revoke and clean active refresh tokens. Requires `{ refreshToken }`.

### 📚 Manuscripts & Stories
- `GET /api/stories` — List all stories. High-speed filters supported (`search`, `myOwn`, `contributed`).
- `GET /api/stories/:id` — Retrieve a metadata-packed story sheet. Supports querying by **numeric ID** or **alphanumeric Share Token**.
- `POST /api/stories` — Create a new story draft. *(Auth Token Required)*.
- `PATCH /api/stories/:id` — Update draft text, title, or feedback status. *(Auth Token Required - Author/Contributor only)*.
- `DELETE /api/stories/:id` — Demolish story record. *(Auth Token Required - Author only)*.

### 👥 Collaboration Permissions
- `POST /api/contributors` — Elevate a user to active Editor. Requires `{ storyId, username }`. *(Auth Token Required - Author only)*.
- `GET /api/contributors/:storyId` — List all authorized editors.
- `DELETE /api/contributors/:id` — Revoke editor clearance. *(Auth Token Required - Author or Contributor themselves)*.

### 💬 Discussion & Commentary
- `GET /api/stories/:id/comments` — Browse complete discussion thread log, with grouped emoji metrics.
- `POST /api/stories/:id/comments` — Post a new commentary node. Requires `{ content }`. *(Auth Token Required)*.
- `PATCH /api/comments/:id` — Edit a previously posted commentary. Requires `{ content }`. *(Auth Token Required)*.
- `DELETE /api/comments/:id` — Wipe a comment record. *(Auth Token Required - Commenter or Story Author)*.
- `POST /api/comments/:id/react` — Leave or remove an emoji state. Requires `{ reaction }`. *(Auth Token Required)*.

### ⏱️ Timelines & Checkpoints
- `GET /api/stories/:id/versions` — Read auto-save snapshot timeline database records. *(Auth Token Required - Collaborator only)*.
- `POST /api/stories/:id/restore/:versionId` — Restore the manuscript body entirely to this historical version. *(Auth Token Required - Collaborator only)*.

### 👤 Profile Management
- `GET /api/profile` — Fetch details on the logged-in writer, alongside all authored and collaborated manuscripts. *(Auth Token Required)*.
- `PATCH /api/profile` — Modify username or profile image link resources. *(Auth Token Required)*.
- `POST /api/profile/avatar` — Upload custom avatar representation using Base64 URI encryption payload. *(Auth Token Required)*.

---

## ⚡ Real-Time Socket Events

CoWrite features comprehensive web socket event emitters over Socket.IO to support real-time workflows:

### Ingress Listener Commands
- `joinStory` — Connects the Socket connection context to the room ID `story-${storyId}`.
- `storyUpdate` — Emits live keystroke and title mutations to other active editors.
- `cursorMove` — Syncs text editing pointer line and character selections live.
- `leaveStory` — Explicitly signals exit from the active room.

### Egress Broadcast Emits
- `activeCollaborators` — Updates clients in the story workspace with the list of current live users.
- `storyUpdated` — Injects immediate character and buffer changes to online client panels.
- `cursorMoved` — Animates editor cursor badges and tags dynamically on screen.
- `userJoined` / `userLeft` — Dispatches notifications when colleagues connect or disconnect.

---

## 🛳️ Deployment Instructions

CoWrite can be distributed to cloud container platforms like **Google Cloud Run** seamlessly:

### Build Phase
When deploying, the deployment server automatically parses `package.json` and runs:
```bash
npm run build
```
This performs a production static build into `dist/` and runs `esbuild` to compile `server.ts` to `dist/server.cjs`.

### Running in Production
For stand-alone node hosting, configure your runtime node package engines to execute:
```bash
npm start
```

---

## 🧪 Testing Instructions

Currently, CoWrite has been designed and tested for correct modular bundle outputs, strict type-checking, and layout responsive consistency:

### 1. Static Type Audit
Validate TypeScript configurations and code boundaries across the codebase:
```bash
npm run lint
```

### 2. Manual Verification Walkthrough
To verify real-time capabilities and the Editorial Aesthetic styling correctness:
1. Fire up a dev container with `npm run dev`.
2. Open two separate web browser window frames (or one in Cognito/Incognito Mode) at `http://localhost:3000`.
3. Create accounts on both, then start writing a story on one as the Author.
4. Using the Author's panel, navigate to **Invite Tools** and authorize the second user's username.
5. Watch the real-time collaborators indicator update instantly in the header, and co-write simultaneously to watch characters sync on the fly!
