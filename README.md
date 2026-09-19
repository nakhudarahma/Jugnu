<div align="center">

# <img src="frontend/public/pwa.png" alt="Jugnu" width="80" />

# Jugnu

**Gentle cognitive activities and memory support for elders living with dementia**

[![CI](https://github.com/shubhdwd/Jugnu/actions/workflows/ci.yml/badge.svg)](https://github.com/shubhdwd/Jugnu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#)

</div>

---

Jugnu is an offline-first PWA that provides **cognitive gaming, memory support, and caregiver tools** for families caring for elders with dementia. Built for rural and low-connectivity environments across India.

**One rule: the caregiver manages, the patient experiences.**

What the patient sees is one calm activity at a time — voice first, no menus, no navigation, no scores, and no way to fail. Everything a caregiver needs lives behind the layers.

---

## Features

### Patient Experience
- **6 cognitive games** — Object Match, Routine Sequencing, Pattern Recall, Who Is Calling, Remember When, My Daily Routine
- **Voice-first interface** — every prompt spoken before shown, in the patient's language
- **No scores, no failure** — gentle corrections, never two failures in a row
- **Two personalization levels** — generic (zero setup) or personalized with real photos, names, and family voices

### Caregiver Tools
- **Daily dashboard** — activity status, reminders, cognitive trends, change signals
- **Memory recording** — photos, voice notes, stories, linked to people
- **Reminders** — medication, hydration, activity, appointments with repeat rules
- **Trend analysis** — always relative to the patient's own baseline, never compared to others
- **Mood tracking** with caregiver support signals

### Offline-First PWA
- **Works without internet** — full functionality in `localStorage`
- **Syncs when online** — writes queue automatically flushes on reconnect
- **Installable** — home screen prompt, standalone mode, splash screen
- **Service worker** — cache-first static assets, network-first API

### Health Worker Portal
- Separate entry for ASHA/ANM/CHO workers
- Patient list, priority list
- Individual patient view with session history

### Multi-Language Support
- Assamese, Bengali, Hindi, Manipuri (Meiteilon), English
- Language-specific speech synthesis with graceful fallback

---

## Architecture

```
Jugnu/
├── frontend/                  # React + TypeScript + Vite + TailwindCSS
│   ├── public/                # PWA assets, illustrations, portraits
│   └── src/
│       ├── api/               # 13 API service modules
│       ├── components/        # UI, caregiver, and patient components
│       ├── lib/               # Voice, i18n, trends, sync queue, capabilities
│       ├── screens/           # 15 screens
│       ├── session/           # Activity plan builder + session engine
│       └── state/             # Context + reducer + localStorage persistence
│
├── backend/                   # Express + TypeScript + Prisma + PostgreSQL
│   ├── jugnu_aiml/            # Python FastAPI microservice (adaptive AI)
│   ├── prisma/                # Schema, migrations, seed
│   └── src/
│       ├── modules/           # 19 API modules
│       ├── services/          # AI, sync, encryption, notifications
│       └── middleware/        # Auth, roles, validation, errors
│
└── .github/workflows/ci.yml   # CI pipeline
```

### Four-Layer Permission Model

| Layer | Role | Access |
|-------|------|--------|
| 0 | **Patient** | One activity at a time. Voice first. No navigation. |
| 1 | **Primary Caregiver** | Full dashboard, settings, trends, memories, reminders. |
| 2 | **Trusted Helper** |Full day-to-day care access, including dashboard, trends, memories, and reminders. Cannot edit personal information or manage access. |
| 3 | **Family Member** | Contribution-only home. Share memories. No analytics. |
| 4 | **Health Worker** | Can add and manage patients, view their progress, priority signals, and relevant care insights. |

Permissions are **structural, not defensive** — `capabilities.ts` decides what a layer may do; screens hide or disable what is not available. A helper never taps something and then gets told off.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS, React Router |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 (Supabase / any managed Postgres) |
| AI Service | Python, FastAPI, NumPy |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Security | Helmet, CORS, rate limiting, AES-256-CBC encryption |
| PWA | Service worker, Web App Manifest, offline sync queue |
| CI/CD | GitHub Actions, Docker |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or a [Supabase](https://supabase.com) project)
- Python 3.11+ (optional, for AI microservice)

### 1. Backend

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY

# Set up database
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# Start development server
npm run dev
```

Backend runs at **http://localhost:3000**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173** (proxies `/api` to backend)

### 3. Docker (Full Stack)

```bash
cd backend
docker-compose up -d
```

Starts PostgreSQL, AI service, and backend with auto-migration.

### 4. AI Service (Optional)

```bash
cd backend/jugnu_aiml
pip install -r requirements.txt
python main.py
```

AI service runs at **http://localhost:8000**. The backend falls back to local TypeScript heuristics when this is unavailable.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DIRECT_URL` | Yes | Direct PostgreSQL URL (for Supabase pooler) |
| `JWT_SECRET` | Yes | Access token secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret |
| `ENCRYPTION_KEY` | Yes | AES-256 encryption key |
| `PORT` | No | Server port (default: 3000) |
| `AI_SERVICE_URL` | No | Python AI service URL |
| `AI_SERVICE_ENABLED` | No | Enable remote AI calls |
| `CORS_ORIGIN` | No | Allowed CORS origin |

**Frontend** (`frontend/.env`, see `frontend/.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Yes | Google OAuth web client ID for "Continue with Google" |

---

## Google Sign-In (deployment setup)

Jugnu signs users in with **Google Identity Services**. The frontend opens the real
Google account chooser, then (when the backend is reachable) verifies the account
server-side and issues JWT tokens for subsequent API calls.

Two Cloud Console steps are required before deployment:

1. **OAuth consent screen** (`APIs & Services → OAuth consent screen`)
   - **App name must be `Jugnu`** — this is the name shown in the account chooser.
     If it shows anything else (e.g. a different project's name), the client ID was
     created in the wrong Google Cloud project.
2. **OAuth client ID** (type *Web application*)
   - **Authorized JavaScript origins** must include every origin the app is served
     from: `http://localhost:5173` for local dev and `https://<your-domain>` for
     production. Without them the chooser popup fails.
   - Paste the client ID into `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`.
   - The value is public by design (it ships in the browser bundle) — never add a
     client secret to the frontend.

---

## Demo Accounts

| Role | Email | Password | Phone |
|------|-------|----------|-------|
| Admin | admin@jugnu.org | admin123 | 9000000000 |
| Caregiver | caregiver1@test.com | password123 | 9000000001 |
| Caregiver | caregiver2@test.com | password123 | 9000000002 |
| Family | family1@test.com | password123 | 9000000003 |
| Health Worker | healthworker@test.com | password123 | 9000000004 |

**Frontend demo PINs:** Meena `1234`, Kamala `5678`, Rahul `4321`

---

## Demo Walkthrough

1. **Start on Meena's dashboard** — daily activity, reminder status, cognitive trends, change signal
2. **Read the trends** — Memory Improving, Attention Declining, Recognition Stable (always vs. own baseline)
3. **Tap Start Activity** — handoff screen appears, voice begins, hand the tablet over
4. **Play as Asha** — each step spoken first, gentle corrections, never two failures in a row
5. **Finish the session** — "Great job today!" stays on screen, nothing auto-navigates
6. **Return as caregiver** — long-press top-right corner for 3 seconds, enter PIN `1234`
7. **Record a memory** — add a story, photo, voice note, mark it usable in activities
8. **Switch to Rahul (Layer 3)** — contribution-only home, share a memory, arrives as "Waiting for approval"
9. **Switch to Kamala (Layer 2)** — assigned reminders and shared memories only

---

## Testing

```bash
cd backend

# Unit + integration tests
npm test

# E2E tests (requires running server)
npm run test:e2e

# TypeScript lint
npm run lint
```

---

## API Modules

The backend exposes 19 REST API modules under `/api`:

| Module | Purpose |
|--------|---------|
| `auth` | Registration, login, token refresh, logout |
| `users` | User management |
| `patients` | Patient CRUD with access control |
| `games` | Game catalog and recommendations |
| `sessions` | Game sessions and attempt tracking |
| `personalization` | Patient personalization settings |
| `reminders` | Medication/activity reminders |
| `insights` | Cognitive ability insights and trends |
| `alerts` | Clinical review and caregiver support alerts |
| `consents` | Patient consent management |
| `family` | Family member linking |
| `health-workers` | ASHA/ANM/CHO health worker tools |
| `notifications` | In-app notifications |
| `sync` | Offline event synchronization |
| `memories` | Memory recording and management |
| `people` | People records for photos and memories |
| `voice-notes` | Voice recording management |
| `invites` | Family/helper invitations |
| `mood-entries` | Caregiver mood check-in tracking |

---

## Database

20 models, 19 enums managed via Prisma migrations. Key models:

- **User** — all user types with role-based access
- **Patient** — elderly patients with language, region, voice settings
- **Game** — 6 cognitive games with JSON configuration
- **Session / Attempt** — game sessions with offline sync support
- **Insight** — cognitive ability estimates with trend direction
- **Memory / Person / VoiceNote** — family memory recording system
- **Reminder** — scheduled medication, hydration, and activity reminders
- **SyncEvent** — idempotent offline event queue with retry

---

## Accessibility

- Semantic HTML + ARIA where roles are not implicit
- Full keyboard operation with visible focus indicators
- Large touch targets sized for unsteady hands
- Contrast designed for low vision
- `prefers-reduced-motion` respected throughout
- Tablet-first patient layer design
- State never communicated by color alone

---

## CI/CD

GitHub Actions pipeline runs on every push:

**Tests Job:**
1. PostgreSQL 16 service container
2. `npm ci` + Prisma generate + migrate deploy + seed
3. TypeScript lint + build
4. Migration verification
5. Jest unit + DB integration tests

**Docker Job:**
1. Multi-stage Docker build (Node 20 Alpine)
2. Production-ready image

---

## Project Structure — Backend

```
backend/src/
├── config/          Environment variables, database client
├── middleware/       Auth, error handling, role guards, validation
├── modules/         19 feature modules (controller → service → routes)
├── services/        AI, sync, encryption, notifications
├── utils/           Logger, error helpers, API responses
├── types/           TypeScript type definitions
├── app.ts           Express configuration
└── server.ts        Entry point with graceful shutdown
```

---

## License

MIT

---

<div align="center">

**Jugnu** — Lighting Memories. Strengthening Bonds.

Built with ❤️ by Team Vanguard.

</div>
