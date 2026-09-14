# Jugnu Backend

**Jugnu — Lighting Memories. Strengthening Bonds.**

Backend API for the Jugnu cognitive health platform, designed to support elderly patients through gamified cognitive exercises, adaptive difficulty, and family/caregiver involvement.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** JWT (access + refresh tokens)
- **Validation:** Zod
- **Security:** Helmet, CORS, Rate Limiting, bcryptjs

## Project Structure

```
src/
├── config/           # Environment and database config
├── middleware/        # Auth, role, validation, error handling
├── modules/          # Feature modules (service → controller → routes)
│   ├── auth/         # Register, login, logout, me
│   ├── users/        # User management
│   ├── patients/     # Patient CRUD with access control
│   ├── games/        # Game catalog and recommendations
│   ├── sessions/     # Game sessions with attempts
│   ├── personalization/ # Patient personalization settings
│   ├── reminders/    # Medication/activity reminders
│   ├── insights/     # Cognitive ability insights
│   ├── alerts/       # Clinical review and caregiver alerts
│   ├── family/       # Family member linking
│   ├── health-workers/ # Health worker tools
│   └── sync/         # Offline event synchronization
├── services/         # Business logic services
│   ├── ai.service.ts      # Adaptive difficulty & ability estimation
│   ├── sync.service.ts    # Offline-first sync with idempotency
│   ├── notification.service.ts # Notification & mood alerts
│   └── encryption.service.ts   # Data encryption utilities
├── utils/            # Logger, errors, API responses
├── app.ts            # Express app configuration
└── server.ts         # Server entry point
```

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm or yarn

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and secrets.

### 3. Run Migrations

```bash
npm run prisma:migrate
```

### 4. Seed Demo Data

```bash
npm run prisma:seed
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`.

## Docker Setup

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Backend on port 3000

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | JWT access token secret |
| `JWT_REFRESH_SECRET` | Yes | - | JWT refresh token secret |
| `ENCRYPTION_KEY` | Yes | - | AES encryption key |
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `AI_SERVICE_URL` | No | http://localhost:8000 | Python AI service URL |
| `AI_SERVICE_ENABLED` | No | false | Enable external AI calls |
| `CORS_ORIGIN` | No | http://localhost:5173 | Allowed CORS origin |
| `LOG_LEVEL` | No | info | Log level (debug/info/warn/error) |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token (body: `{ refreshToken }`)
- `POST /api/auth/logout` - Logout (requires auth)
- `GET /api/auth/me` - Get current user (requires auth)

### Patients
- `POST /api/patients` - Create patient (FAMILY_CAREGIVER, ADMIN)
- `GET /api/patients` - List patients
- `GET /api/patients/:id` - Get patient
- `PATCH /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient (ADMIN, FAMILY_CAREGIVER)

### Games
- `GET /api/games` - List games (filter by type, language)
- `GET /api/games/:id` - Get game
- `GET /api/games/recommended/:patientId` - Get recommended games for patient

### Sessions
- `POST /api/sessions` - Create session
- `POST /api/sessions/:id/attempts` - Add attempt
- `POST /api/sessions/:id/end` - End session
- `GET /api/sessions/:id` - Get session with attempts
- `GET /api/patients/:patientId/sessions` - List patient sessions

### Personalization
- `GET /api/patients/:id/personalization` - Get personalization
- `POST /api/patients/:id/personalization` - Create/update
- `PATCH /api/patients/:id/personalization` - Update

### Reminders
- `GET /api/patients/:id/reminders` - List reminders
- `POST /api/patients/:id/reminders` - Create reminder
- `PATCH /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder

### Insights
- `GET /api/patients/:id/insights` - Get cognitive insights
- `GET /api/patients/:id/trends` - Get trend analysis
- `GET /api/patients/:id/ability` - Get ability assessment

### Alerts
- `GET /api/patients/:id/alerts` - Get patient alerts
- `PATCH /api/alerts/:id` - Update alert status
- `GET /api/alerts` - List all alerts (ADMIN, HEALTH_WORKER)

### Family
- `POST /api/family` - Invite family member
- `GET /api/family/members/:patientId` - Get family members
- `DELETE /api/family/member/:id` - Remove family member

### Health Workers
- `GET /api/health-workers/me` - My profile
- `GET /api/health-workers/patients` - List patients
- `GET /api/health-workers/priority-list` - Priority list
- `GET /api/health-workers/visit-plan` - Weekly visit plan

### Sync
- `POST /api/sync` - Sync offline events
- `GET /api/sync/status/:deviceId` - Get sync status
- `POST /api/sync/retry/:deviceId` - Retry failed events

## Demo Accounts

After seeding, these accounts are available:

| Role | Phone | Email | Password |
|------|-------|-------|----------|
| ADMIN | 9000000000 | admin@jugnu.org | admin123 |
| FAMILY_CAREGIVER | 9000000001 | caregiver1@test.com | password123 |
| FAMILY_CAREGIVER | 9000000002 | caregiver2@test.com | password123 |
| CONNECTED_FAMILY | 9000000003 | family1@test.com | password123 |
| HEALTH_WORKER | 9000000004 | healthworker@test.com | password123 |

## Supported Languages

- Assamese (default)
- Bengali
- Meitei (Manipuri)

Language content is handled through configurable resource packs for easy extensibility.

## Testing

```bash
npm test
```

## Build for Production

```bash
npm run build
npm start
```

## Architecture Notes

- **Controllers are thin** — business logic lives in services
- **AI integration** is modular through `ai.service.ts` — can work offline or connect to external Python AI service
- **Offline-first sync** uses idempotent event processing with duplicate detection
- **Never diagnoses dementia** — all insights are framed as cognitive ability observations
- **Role-based access** — patients are scoped to their caregiver, connected family, or health worker area
