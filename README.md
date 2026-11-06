# Evenite Backend

Backend API for **Evenite** — a university event management and engagement platform, built as a CMU senior project. Handles event lifecycle, registrations/ticketing, QR-based attendance tracking, live discussion/chat, organizer analytics, and AI-assisted event creation.

## Tech stack

- **Framework**: [NestJS](https://nestjs.com/) 11 (TypeScript)
- **Database**: PostgreSQL via [Prisma ORM](https://www.prisma.io/)
- **Auth**: JWT (access + refresh tokens), role-based access (`PARTICIPANT` / `ORGANIZER`)
- **Realtime**: Socket.io (chat, announcements, live attendance/analytics updates)
- **Storage**: Supabase Storage (event banners, profile images)
- **Email**: Resend (verification emails)
- **AI**: Groq, Gemini, and OpenAI-compatible providers (AI-assisted event creation/description generation)
- **Scheduling**: `@nestjs/schedule` (cron-based housekeeping, e.g. event status transitions)
- **Infra**: Docker (multi-stage build), Docker Compose, Caddy (reverse proxy + automatic HTTPS), GitHub Actions CI/CD, AWS EC2

## Feature modules

| Module | Responsibility |
|---|---|
| `auth` | Registration, login, email verification, JWT access/refresh token issuance, password reset flows |
| `user` | User profiles — participant and organizer profiles, role switching, avatar uploads |
| `university` | University/domain registry (email-domain-based account scoping) |
| `event` | Event CRUD, status lifecycle (draft → published → ongoing → concluded/cancelled), AI-assisted event creation, banner uploads |
| `form` | Customizable registration form builder (dynamic fields per event) |
| `registration` | Event registration, seat management, ticket issuance, cancellation |
| `attendance` | QR-code and manual check-in, undo check-in, attendance records |
| `discussion` | Per-event discussion rooms — messages, announcements, chat-list updates (Socket.io) |
| `realtime` | Shared Socket.io gateway infrastructure/utilities used across modules |
| `analytics` | Organizer-facing event analytics (registrations, attendance rates, etc.) |
| `prisma` | Prisma client provider, shared across all modules |

## Project setup

```bash
npm install
cp .env.example .env   # fill in real values (DB, Supabase, Resend, AI keys, JWT secrets)
```

Start a local Postgres instance via Docker:
```bash
docker compose up -d
```

Apply migrations and seed sample data:
```bash
npx prisma migrate dev
npx prisma db seed
```

## Running the app

```bash
# development (watch mode)
npm run start:dev

# production mode
npm run start:prod
```

## Testing

```bash
npm run test          # unit tests
npm run test:cov      # coverage report
```

Run a single test file:
```bash
npx jest src/registration/services/registration-validation.service.spec.ts
# or
npm test -- src/registration/services/registration-validation.service.spec.ts
```

Run a single test case by name (matches against the `it(...)`/`describe(...)` text):
```bash
npx jest -t "UT-5-003-01"
# or
npm test -- -t "UT-5-003-01"
```

## Database

```bash
npx prisma migrate dev      # create/apply migrations in dev
npx prisma migrate reset    # wipe + reapply migrations + reseed (dev only)
npx prisma studio           # browse the DB visually
```

## API overview

No global route prefix — all routes are served from the root (e.g. `https://api.evenite.top/auth/login`). Most routes beyond `auth` require a JWT access token (`Authorization: Bearer <token>`).

### Auth (`/auth`)
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register a new account |
| POST | `/auth/verify-email` | Verify email via code/token |
| POST | `/auth/resend-verification` | Resend verification email |
| POST | `/auth/login` | Log in, returns access + refresh tokens |
| POST | `/auth/refresh` | Issue a new access token |
| POST | `/auth/logout` | Invalidate refresh token |

### Users (`/users`)
| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | Current user |
| PATCH | `/users/me/switch-profile` | Switch between participant/organizer role |
| GET/POST/PATCH | `/users/me/participant-profile` | Participant profile CRUD |
| POST | `/users/me/participant-profile/image` | Upload participant avatar |
| GET/POST/PATCH | `/users/me/organizer-profile` | Organizer profile CRUD |
| POST | `/users/me/organizer-profile/image` | Upload organizer avatar |
| GET | `/users/me/registered-events` | Events the user registered for |
| GET | `/users/me/created-events` | Events the user organized |
| GET | `/users/me/tickets` / `/users/me/tickets/:ticketId` | User's tickets |

### Events (`/events`)
| Method | Path | Description |
|---|---|---|
| GET | `/events` / `/events/:id` | List/get events |
| POST | `/events/save-draft` | Save an event as draft |
| POST | `/events/publish` | Publish an event |
| PATCH | `/events/:id/status` | Change event status |
| POST | `/events/banner` | Upload event banner |
| POST | `/events/generate/prompt` / `/events/generate/image` | AI-assisted event text/image generation |
| POST | `/events/translate` | Translate event content |

### Registrations (`/events/:eventId/registrations`)
| Method | Path | Description |
|---|---|---|
| POST | `/events/:eventId/registrations/me` | Register for an event |
| DELETE | `/events/:eventId/registrations/me` | Cancel registration |
| GET | `/events/:eventId/registrations` | List registrations (organizer) |
| GET | `/events/:eventId/registrations/me/ticket` | Get own ticket for the event |

### Forms (`/events/:eventId/forms`)
Dynamic registration form builder — `:type` is the form type (e.g. `REGISTRATION`, `FEEDBACK`).
| Method | Path | Description |
|---|---|---|
| GET | `/events/:eventId/forms` | List forms for an event |
| GET/POST/PATCH/DELETE | `/events/:eventId/forms/:type` | Form CRUD by type |
| GET/POST/DELETE | `/events/:eventId/forms/:type/responses` | Form responses |
| GET | `/events/:eventId/forms/:type/responses/summary` | Aggregated response summary |

### Attendance (`/events/:eventId/attendance`)
| Method | Path | Description |
|---|---|---|
| POST | `/events/:eventId/attendance/qr` | Check in via QR code |
| POST | `/events/:eventId/attendance/manual` | Manual check-in |
| GET | `/events/:eventId/attendance` | List attendance records |
| DELETE | `/events/:eventId/attendance/:attendanceId` | Undo check-in |

### Discussion (`/discussion-rooms`)
| Method | Path | Description |
|---|---|---|
| GET | `/discussion-rooms/created-rooms` / `/joined-rooms` | Rooms for the current user |
| GET | `/discussion-rooms/:roomId/messages` | Message history |
| GET | `/discussion-rooms/:roomId/announcements` | Announcement history |
| PATCH | `/discussion-rooms/:roomId/read` | Mark room as read |

Live chat/announcements are pushed over a Socket.io gateway (`discussion` namespace), not REST — see `src/discussion/discussion.gateway.ts`.

### Analytics (`/events/:eventId/analytics`)
| Method | Path | Description |
|---|---|---|
| GET | `/events/:eventId/analytics` | Organizer-facing event analytics (registrations, attendance, etc.) |

## Deployment

Deployed on AWS EC2 via Docker Compose (Postgres + backend + Caddy for automatic HTTPS), with GitHub Actions auto-deploying on every push to the `prod` branch (build → push image to Docker Hub → SSH deploy).
