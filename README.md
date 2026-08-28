This project has been created as part of the 42 curriculum by vdarsuye, datienza, dmena-li and cochatel.

# Description

## Project name: The «Church of the True Relink»
The “Church of the True Relink" is a full-stack social network developed as part of the 42 curriculum. The application is built around the concept of the “Church of the True Relink”, a fictional community inspired by the culture surrounding Makefiles and software development. Users can create an account and profile, interact with other members through a friendship system and activity feed, and communicate through real-time private messages and public channels. It also includes a hierarchical role and permission system, notifications, and moderation features. AI-powered functionality is integrated to analyse and correct Makefiles as well as assist with content moderation.

---

# Instructions

### Prerequisites
Git — Required to clone the repository.
Docker — Required to build and run the application's containers.
Docker Compose — Required to manage the different services used by the application.
Make — Required to use the provided Makefile commands such as make first-run and make up.
A Unix-based operating system — The project is intended to run on Linux or macOS. On Windows, using WSL2 is recommended.

### A. Clone the repository

Clone the project to your local machine and access the root directory:
```bash
git clone <YOUR_REPOSITORY_URL>
cd <FOLDER_NAME>
```

### B. Configure environment variables

Each developer must have their own local configuration file. Copy the `.env.example` template file and rename it to `.env`:
```bash
cp .env.example .env
```

⚠️ **Important**: Open the newly created `.env` file and set your own passwords, database credentials, and secret key for tokens (JWT_SECRET). Never commit your personal `.env` file to the repository.

#### 📝 Configuring the `.env` file

When you copy `.env.example` to `.env`, you'll see the following variables. Here's what each one means and what you should change:

| Variable | Default value | What should you do? |
| :--- | :--- | :--- |
| `POSTGRES_USER` | `ft_user` | You can leave this as default for local development. |
| `POSTGRES_PASSWORD` | `change_me` | **CHANGE IT!** Set a secure password for your local database, without special characters like `@ : / # ?` (e.g. `my_super_key_123`). |
| `POSTGRES_DB` | `ft_transcendence`| You can leave this as default. It's the name of the database that will be created automatically in PostgreSQL. |
| `JWT_SECRET` | `change_me_access_secret` | **CHANGE IT!** Generate a long, random string. Used to sign Access Tokens (15 min). |
| `JWT_REFRESH_SECRET` | `change_me_refresh_secret` | **CHANGE IT!** Generate another random string, different from the previous one. Used to sign Refresh Tokens (7 days). |
| `NODE_ENV` | `development` | Leave it as `development` to enable detailed logs and watch mode in NestJS. |
| `VITE_API_URL` | `https://localhost/api` | Leave it as is. This is the URL the Frontend (Vite) will use to communicate with the Backend through Nginx's secure port. |
| `GROQ_API_KEY` | *(empty)* | **REQUIRED AND PERSONAL!** Each developer must generate their own free key — see instructions below. Never share it or commit it to the repository. |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | You can leave this as default. If this model is retired by Groq in the future, change it here without touching the code — check available models at console.groq.com. |

> 🔑 **Tip for generating secure secrets:**
You can quickly generate strong random keys from your terminal by running:
```bash
openssl rand -base64 32
```
Copy the result and paste it into your `JWT_SECRET` and `JWT_REFRESH_SECRET`.

#### 🤖 Get your own Groq API key

**Why everyone needs their own key, not a shared one:**
- **Per-key quota limit**: Groq's free tier has a request limit. If the whole team uses the same key, that quota runs out much faster and people end up blocking each other's work.
- **Security**: a key shared over chat/Slack/whatever is a key that will sooner or later leak by accident. Each key is tied to the account that created it — better that it's your own responsibility, not someone else's.

**How to get one (free, no credit card, 2 minutes):**
1. Go to console.groq.com and create an account or sign in
2. Create a new API key
3. Copy the generated key and paste it into your local `.env` as `GROQ_API_KEY`

### C. Start the project

The `Makefile` automatically detects whether your system uses `docker-compose` (the classic binary, with a hyphen) or `docker compose` (the modern plugin, with a space) — no manual configuration needed for that. It also checks, before running anything else, that Docker is installed and that your user has permission to talk to the daemon; if either of those checks fails, you'll see a message explaining exactly what to do, instead of a cryptic error.

**First time starting the project on a new machine:**
```bash
make first-run
```
This command forces a full rebuild without cache. It's important to use it (instead of `make up`) the first time on each new machine: it prevents Docker from accidentally reusing an old or incomplete dependency-installation layer from a previous attempt, which could leave the backend missing packages that are actually already in `package.json`.

**Day to day, once the project has already been started at least once on that machine:**
```bash
make up
```

**If at any point the project starts behaving strangely** (dependencies that "should be there" but aren't, inconsistent behavior after installing a new package), running `make first-run` again usually fixes it — it rebuilds everything from scratch without relying on any previous cache.

### Makefile command guide

Quick reference for each available command and when to use it.

#### `make` / `make all` / `make up`

The everyday command. Starts all containers, rebuilding them if the code has changed since last time. At the end, it automatically restarts `nginx` — this prevents a `502 Bad Gateway` error that can appear if only one service was rebuilt (e.g. the backend) and nginx kept the old network address for that container. No need to worry about it: it's already handled inside this same command.

```bash
make
```

#### `make first-run`

Use it the first time you start the project on a new computer (or if something is behaving strangely and you suspect a corrupted Docker cache). Rebuilds everything from scratch, without using any previously saved build layer — slower, but guarantees you're not carrying anything over from a failed previous attempt.

```bash
make first-run
```

#### `make down`

Stops all containers without deleting anything — neither the code nor the database data. The next time you run `make up`, everything picks up where you left it.

```bash
make down
```

#### `make logs`

Shows real-time logs from all containers at once. Useful for seeing what's going on without having to stop and restart the project.

```bash
make logs
```

#### `make db-migrate`

Use it after a `git pull` if someone on the team has changed the database schema (`schema.prisma`) and pushed a new migration. Applies migrations that already exist as files in the repository — it doesn't create anything new, it just brings your local database up to date with what others have already defined.

```bash
make db-migrate
```

#### `make db-migrate-dev name=descriptive_name`

Use it when you yourself change `schema.prisma` (add a field, a table, etc.) and need to generate the corresponding migration. Requires a descriptive name — it will be saved as part of the migration file name, so it should briefly explain what's changing.

```bash
make db-migrate-dev name=add_articles
```

#### `make db-studio`

Opens Prisma Studio, a visual browser interface for exploring and editing the database content directly — useful for reviewing data without writing SQL by hand.

```bash
make db-studio
```

#### `make clean`

Stops the containers and deletes the project's volumes — this includes the database. The data is lost, but the already-built Docker images are kept (the next rebuild is faster than with `fclean`).

```bash
make clean
```

#### `make fclean`

Deep clean: in addition to everything `clean` does, it also deletes the project's Docker images. The next time you start the project, everything is rebuilt from scratch.

```bash
make fclean
```

#### `make re`

The "full reset": runs `fclean` and then `all` — deletes absolutely everything (containers, volumes, images) and starts the project up again from scratch, exactly like `first-run`. Use it when you want to start with a clean slate without leaving the Makefile itself.

```bash
make re
```

### Automatic checks when running any command

Before running any of the above rules, the `Makefile` checks two things and warns with a clear message if something fails:

1. **Is Docker installed on this machine?** If not, it shows the installation link.
2. **Does your user have permission to talk to Docker?** If not (typical if you just installed Docker or just added yourself to the `docker` group), it tells you to log out and back in, or to run `newgrp docker` as a quick fix without restarting.

## How to assign the first ARCHBISHOP

This is a one-time bootstrap procedure: changing someone's rank can only be done from the `/sanctuary` panel, but that panel is only accessible to someone who already has the `ARCHBISHOP` rank — so the first `ARCHBISHOP` of each new database (for example, after a `prisma migrate reset`, or when starting the project for the first time on your machine) has to be assigned by hand, directly in the database.

### Step 1 — Register normally in the application

If you don't already have an account in this database, go to the site and register like any brother would — by default, everyone starts with the `BROTHER` rank.

### Step 2 — Find your `id`

```bash
docker compose exec postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -c "SELECT id, email, role FROM \"User\";"
```

Replace `<POSTGRES_USER>` and `<POSTGRES_DB>` with the real values from your `.env` file. You'll see a table with all registered users — note down the `id` of your own account (identify it by email).

### Step 3 — Upgrade your rank to `ARCHBISHOP`

```bash
docker compose exec postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -c "UPDATE \"User\" SET role = 'ARCHBISHOP' WHERE id = <your_id>;"
```

Replace `<your_id>` with the number you noted in the previous step.

### Step 4 — Log in again

Log out and log back in (or just wait for `/altar` to ask for your credentials again, which happens on every page load). You should now see the "Sanctuary" button.

## From here on

You'll never need to touch the database by hand again — from `/sanctuary` you can change any user's rank (including to `INQUISITOR`) directly from the interface.

> 💡 When you'll need to repeat this process: every time the database is reset from scratch (`prisma migrate reset`, `make clean`, `make fclean`, `make re`) — all ranks are lost along with the rest of the data, so the first `ARCHBISHOP` always has to be created this way.

---

# Resources

## List

### Official documentation 
React Documentation
NestJS Documentation
PostgreSQL Documentation
Prisma Documentation
Socket.IO Documentation

### Blogs
NestJS + Prisma + PostgreSQL tutorial: https://www.djamware.com/post/nestjs-postgresql-prisma-full-stack-api-tutorial?utm_source=chatgpt.com
React Stack Patterns: https://www.patterns.dev/react/react-2026/?utm_source=chatgpt.com
Posts on reddit and stackoverflow

### Videos
Every NestJS Concept Explained in 9 Minutes: https://www.youtube.com/watch?v=IdsBwplQAMw
NestJS Course for Beginners - Build Server-Side Applications: https://www.youtube.com/watch?v=21_I-12f5JE
Aprende JavaScript Ahora! curso completo desde cero para principiantes: https://www.youtube.com/watch?v=QoC4RxNIs5M
WebSockets Beginners Tutorial with Socket.IO: https://www.youtube.com/watch?v=CzcfeL7ymbU
Learn Prisma In 60 Minutes: https://www.youtube.com/watch?v=RebA5J-rlwg
Aprende React ahora! curso completo para crear aplicaciones: https://www.youtube.com/watch?v=yIr_1CasXkM
React Tutorial Full Course - Beginner to Pro (React 19, 2025): https://www.youtube.com/watch?v=TtPXvEcE11E
Vite Crash Course – Frontend Build Tool: https://www.youtube.com/watch?v=do62-z3z6FM&t=168s

## AI Usage

AI was also used for specific development tasks, including:

Code assistance: generating and improving parts of the front-end and back-end code.
Debugging: helping identify the causes of errors and suggesting possible solutions.
Language: helping understanding how the language and frameworks works
Documentation: helping write and structure parts of the project documentation and README.
Database development: assisting with SQL queries, Prisma schema design, and database-related issues.
Docker and configuration: helping understand and troubleshoot Docker, Docker Compose, and environment configuration.
Code review: reviewing implementations and suggesting improvements in terms of structure, readability, and maintainability.


# Team information

**vdarsuye:** Product Owner and Lead Developper -> Defines the product vision, prioritizes features, and ensures that the project meets the users' needs. At code level, worked at all levels.
**datienza:** Developper -> Implements the application's features, worked more on the front-end and some back-end.
**dmena-li:** Developper -> In charge of the visual identity, worked on front-end and back-end.
**cochatel:** Project Manager and Developper -> In charge of the organisation, organizing tasks, deadlines, meetings, and ensured that the project stays on track. At code level, worked more on the back-end and some front-end.

# Project management

**Organisation:** The team held short meetings every two days to discuss progress, distribute tasks, and address any issues. A longer meeting was held every Friday to review the week's progress and plan the next steps. 
Tasks were distributed among team members according to their roles and areas of expertise. vdarsuye worked across all levels of the application, while datienza focused mainly on front-end development. dmena-li was responsible for the application's visual identity and contributed to both front-end and back-end development. cochatel focused mainly on back-end development while also managing the organization of tasks, deadlines, and meetings. Each member mainly focused on their assigned area while remaining flexible to help with other tasks.

**Tools used:** Github Issues, Figma, Photoshop
**Communication channels used:** WhatsApp

# Technical stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: NestJS + TypeScript
- Base de datos: PostgreSQL + Prisma ORM
- Tiempo real: Socket.IO
- Infraestructura: Docker Compose + Nginx (reverse proxy + HTTPS)

**Why REACT:** It allows us to build an interface using reusable components. It is particularly well-suited for interactive applications where the state of the interface changes frequently.

**Why NestJS and not Express:** the team has 4 people. Express would give us total freedom but no imposed structure — with several developers who have no prior Node experience, that can lead to some architectural complications. NestJS enforces modular organization (Module/Controller/Service/DI), which makes it easier for anyone on the team to understand where each piece belongs.

**Why PostrgreSQL:** PostgreSQL is a robust and mature relational database, particularly well-suited when data has relationships and requires integrity constraints. It is also widely used in the job market, which has allowed us to become familiar with it.

**Why Nginx:** Nginx was chosen as a reverse proxy to provide a single entry point for the application, route requests to the appropriate services, and handle HTTPS. This simplifies the communication between the client, frontend and backend while keeping the internal services isolated

# Database Schema

## Visual representation (Entity-Relationship diagram)

```mermaid
erDiagram
    User ||--o{ RefreshToken : "has"
    User ||--o{ Friendship : "requests (as requester)"
    User ||--o{ Friendship : "receives (as addressee)"
    User ||--o{ ConversationParticipant : "joins"
    User ||--o{ Message : "sends"
    User ||--o{ Message : "moderates (deletedBy)"
    User ||--o{ Notification : "receives"

    Conversation ||--o{ ConversationParticipant : "has"
    Conversation ||--o{ Message : "contains"

    User {
        int id PK
        string email UK
        string passwordHash
        string displayName
        string avatarUrl
        enum role
        datetime createdAt
        datetime updatedAt
    }

    RefreshToken {
        int id PK
        string token UK
        int userId FK
        datetime expiresAt
        boolean revoked
        datetime createdAt
    }

    Friendship {
        int id PK
        int requesterId FK
        int addresseeId FK
        enum status
        datetime createdAt
    }

    Conversation {
        int id PK
        enum type
        string name
        datetime createdAt
    }

    ConversationParticipant {
        int id PK
        int conversationId FK
        int userId FK
        datetime joinedAt
    }

    Message {
        int id PK
        int conversationId FK
        int senderId FK
        string content
        string attachmentFilename
        string attachmentType
        string attachmentName
        datetime createdAt
        datetime deletedAt
        int deletedById FK
    }

    Notification {
        int id PK
        int userId FK
        string type
        string message
        boolean isRead
        datetime createdAt
    }

    CommunityEvent {
        int id PK
        string type
        string message
        datetime createdAt
    }
```

> `CommunityEvent` is not connected to any other table: it is a standalone, ownerless public log (no foreign keys), so it does not appear with relationship lines above.

---

## Tables and their relationships

### `User`
Core account table: authentication data and profile info. This is the hub of the schema — almost every other table points back to it.

- **1 → N with `RefreshToken`**: one user can have many active/expired refresh tokens (multi-device login). `onDelete: Cascade` — deleting a user wipes their tokens.
- **1 → N with `Friendship`** (twice): a user can appear as either the `requester` or the `addressee` of a friendship, hence two named relations (`FriendshipRequester`, `FriendshipAddressee`).
- **1 → N with `ConversationParticipant`**: a user can belong to many conversations (direct chats and channels).
- **1 → N with `Message`** (twice): as the `sender` of a message, and separately as the moderator who soft-deleted someone else's message (`deletedBy`).
- **1 → N with `Notification`**: a user's personal inbox.

### `RefreshToken`
One row per issued refresh token, used to renew JWT access tokens without forcing re-login.

- **N → 1 with `User`**: each token belongs to exactly one user

### `Friendship`
Represents a friend request/relationship between two users. A single row covers the whole lifecycle (`PENDING` → `ACCEPTED`).

- **N → 1 with `User`** (twice): `requester` and `addressee`.
- Unique constraint on `(requesterId, addresseeId)` prevents duplicate requests between the same pair.

### `Conversation`
A chat thread — either a `DIRECT` message (exactly 2 participants) or a `CHANNEL` (many participants, e.g. a shared general chat). `name` is only meaningful for channels.

- **1 → N with `ConversationParticipant`**: the list of members.
- **1 → N with `Message`**: the message history.

### `ConversationParticipant`
Join table linking `User` ↔ `Conversation` (many-to-many, materialized as its own table so it can carry extra data like `joinedAt`).

- **N → 1 with `Conversation`** and **N → 1 with `User`**
- Unique constraint on `(conversationId, userId)` (a user can't join the same conversation twice)

### `Message`
An individual chat message, optionally carrying a file attachment.

- **N → 1 with `Conversation`**: which thread it belongs to.
- **N → 1 with `User`** as `sender` (`Cascade` — if the sender's account is deleted, their messages go with it).
- **N → 1 with `User`** as `deletedBy`, using `SetNull` instead of `Cascade`: if a message is soft-deleted (`deletedAt` set, content hidden behind a tombstone) and the moderator who deleted it later has their account removed, the tombstone stays in place with `deletedById` set to `null` rather than disappearing.
- Attachment fields (`attachmentFilename`, `attachmentType`, `attachmentName`) are all optional since most messages carry no file. `attachmentFilename` is the name on disk; `attachmentName` is the original filename kept for display.

### `Notification`
A personal, targeted notification with read/unread state — the "inbox" half of the notification system.

- **N → 1 with `User`**: belongs to exactly one recipient

### `CommunityEvent`
A public, community-wide chronicle entry. Unlike `Notification`, it has no owner and no read state — it's a shared feed visible to everyone. Some entries mirror real actions (new member joined, rank changed); others are flavor/fictional filler. No foreign keys — fully standalone.

---

## Enums

| Enum | Values |
|---|---|
| `Role` | `HERMANO`, `INQUISIDOR`, `ARZOBISPO` |
| `FriendshipStatus` | `PENDING`, `ACCEPTED` |
| `ConversationType` | `DIRECT`, `CHANNEL` |
| `Gender` | `MASCULINO`, `FEMENINO` |

---

## Key fields and data types

| Table | Field | Type | Notes |
|---|---|---|---|
| User | id | Int (autoincrement) | Primary key |
| User | email | String | Unique |
| User | passwordHash | String | Hashed, never plaintext |
| User | displayName | String? | Optional |
| User | avatarUrl | String? | Optional |
| User | role | Role | Default `HERMANO` |
| User | createdAt / updatedAt | DateTime | Auto-managed |
| RefreshToken | token | String | Unique |
| RefreshToken | expiresAt | DateTime | Token expiry |
| RefreshToken | revoked | Boolean | Default `false` |
| Friendship | requesterId / addresseeId | Int | FKs to `User`; unique pair |
| Friendship | status | FriendshipStatus | Default `PENDING` |
| Conversation | type | ConversationType | `DIRECT` or `CHANNEL` |
| Conversation | name | String? | Only used for `CHANNEL` |
| ConversationParticipant | conversationId / userId | Int | FKs; unique pair |
| Message | content | String | Message text |
| Message | attachmentFilename / attachmentType / attachmentName | String? | All optional |
| Message | deletedAt | DateTime? | Soft-delete marker |
| Message | deletedById | Int? | FK to `User`, `SetNull` on delete |
| Notification | type | String | Notification category |
| Notification | isRead | Boolean | Default `false` |
| CommunityEvent | type | String | Event category |
| CommunityEvent | message | String | Event text |
| Article | message | String | Event text |

# Features list 

## Complete list of implemented features

### Authentication & User Management
- **JWT authentication with refresh tokens** — Secure login/register flow; short-lived access tokens (15 min) renewed via long-lived refresh tokens (7 days) stored per-device, allowing multi-device sessions and clean revocation.
- **Role & rank system** (`HERMANO`, `INQUISIDOR`, `ARZOBISPO`) — Hierarchical permission levels controlling access to admin features like the `/sanctuary` panel.
- **Editable user profile** — Display name, avatar upload, and public profile page.

### Social features
- **Friend system** — Send/accept friend requests with `PENDING`/`ACCEPTED` states, duplicate-request prevention, and online status display.
- **Notifications** — Personal, per-user notification inbox with read/unread state.
- **Community event feed** — Public, ownerless activity log visible to all users (new members, rank changes, and flavor/fictional entries).

### Accessibility & Internationalization (nouvelle sous-section)
- **WCAG 2.1 AA compliance** — Keyboard navigation, sufficient color contrast, and screen-reader support across the app's key views.
- **Multi-language support (i18n)** — Language selector with 3+ supported languages, all UI strings externalized for translation.
- **RTL support** — Layout mirroring for right-to-left languages (Arabic, Hebrew), complementing the i18n system.
- **PWA with offline support and installability** — Service worker caching for offline access to core views, plus an installable app manifest.

### AI features (nouvelle sous-section)
- **LLM-powered Makefile assistant** — Chat interface backed by Groq's LLM API (streaming responses, error handling, rate limiting) that analyzes and corrects a user's Makefile.
- **AI content moderation** — Automated flagging of inappropriate content in confessions/posts before human moderator review.

### Real-time communication
- **Direct messages & channels** — 1-to-1 conversations and multi-user themed channels (`#heresies`, `#confessions`, etc.) via WebSockets (Socket.IO).
- **File attachments in chat** — Optional file upload attached to messages.
- **Message moderation (soft-delete)** — Moderators can hide a message's content while preserving a tombstone record; the moderator reference is preserved independently of message ownership.

### Administration
- **Admin panel (`/sanctuary`)** — Rank/role management interface reserved for `ARZOBISPO` users.

### Infrastructure
- **Dockerized environment** — Full stack (frontend, backend, PostgreSQL, Nginx) orchestrated via Docker Compose, with a Makefile handling first-run vs. incremental builds, container health checks, and Docker permission diagnostics.
- **Nginx reverse proxy** — Single HTTPS entry point routing to frontend/backend.
- **Database schema via Prisma ORM** — Relational schema (User, Friendship, Conversation, Message, Notification, CommunityEvent) with migrations.

---

## Who worked on what

## Which team member(s) worked on each feature

## Which team member(s) worked on each feature
| Feature | Contributor(s) | Description |
|---|---|---|
| Socket.IO real-time infrastructure | vdarsuye | Socket.IO setup powering chat & live updates |
| Message moderation (soft-delete) | vdarsuye | Tombstone logic, `deletedBy` handling |
| User profile pages | datienza | Editable profile UI, avatar display |
| Friends list UI | datienza | Friend request/accept interface, online status |
| Chat interface (DMs + channels) | datienza | Frontend chat views and message rendering |
| Notification UI | datienza | Inbox with read/unread indicators |
| Visual identity & design system | dmena-li | Theming, layout, reusable component library |
| File upload/attachment system | dmena-li | Client + server handling of message attachments |
| Prisma database schema | cochatel | Full relational model design and migrations |
| Role/permission system | cochatel | `/sanctuary` panel logic and role checks |
| JWT auth + refresh tokens | cochatel | Access/refresh token issuance, rotation, revocation on logout |
| Project organization | cochatel | Sprint planning, task distribution, meetings |
| OAuth 2.0 remote authentication | vdarsuye | Third-party login integration alongside JWT flow |
| Complete 2FA | vdarsuye | Two-factor step added to the auth flow |
| Organization system | cochatel | CRUD for organizations, membership management, scoped permissions |
| WCAG 2.1 AA compliance | dmena-li, datienza | Accessible design system + accessible frontend implementation |
| Multi-language support (i18n) + RTL | datienza | Language selector, string externalization, RTL layout support |
| PWA (offline + installable) | datienza | Service worker, offline caching, install manifest |
| LLM-powered Makefile assistant | cochatel | Groq API integration, streaming, rate limiting, error handling |
| AI content moderation | cochatel | Automated content flagging tied into the moderation pipeline |
---

# Modules

### Module 1 — Web
| Module | Why | Points |
|---|---|---|
| Major: Frontend and backend framework (React + NestJS) | React lets us build the interface with reusable components, well suited to an app whose state changes constantly (chat, live notifications). NestJS enforces a modular structure (Module/Controller/Service/DI), which makes it easier for 4 developers with no prior Node experience to collaborate without architectural chaos. | 2 |
| Minor: Frontend framework (separate) | Justified within the point above: React brings a mature ecosystem (hooks, routing, state management) that speeds up building interactive views. | — |
| Minor: Backend framework (separate) | NestJS brings dependency injection and separation of concerns, reducing the risk of a disorganized backend with several contributors working in parallel. | — |
| Major: Real-time features (WebSockets) | Chat, notifications, and friends' "online" status all require instant updates without reloading the page; Socket.IO offers automatic reconnection and fallback, critical for a social app. | 2 |
| Major: User interaction (chat, profile, friends) | This is the social core of the project (the "Church of the True Relink"): without chat, profiles, and friends, there's no social network to support the rest of the features. | 2 |
| Minor: ORM (Prisma) | Prisma generates a typed client from the schema, preventing type mismatches between the database and TypeScript code, and simplifies migrations across the team. | 1 |
| Minor: Complete notification system | Users need to be alerted to relevant events (new message, friend request, rank change) without having to manually check every section of the app. | 1 |
| Minor: PWA with offline support and installability | Lets the app be installed like a native app and keeps some functionality working offline, improving the experience on mobile devices. | 1 |
| Minor: Own design system (10+ components) | A reusable component system guarantees visual consistency across the app and speeds up building new views without reinventing styles each time. | 1 |
| Minor: File upload and management system | Chat needs to support file attachments (images, documents), which requires type/size validation and secure server-side storage. | 1 |
| Subtotal Web | - | 11 |
---
### Module 2 — Accessibility and Internationalization
| Module | Why | Points |
|---|---|---|
| Major: Full WCAG 2.1 AA compliance | Ensures the app is usable by people with visual, motor, or cognitive disabilities (contrast, keyboard navigation, screen readers), widening the real audience of a social network. | 2 |
| Minor: Multi-language support (3+ languages, i18n, selector) | A social network aiming to build a community should be accessible to users from different linguistic regions, not just Spanish or English speakers. | 1 |
| Minor: RTL support | Complements multi-language support by including right-to-left languages (Arabic, Hebrew), avoiding excluding those users. | 1 |
| Minor: Additional browser compatibility | Ensures the app works correctly outside a single reference browser, avoiding dependency on APIs specific to one engine. | 1 |
| Subtotal Accessibility/i18n | - | 5 |
---
### Module 3 — User Management
| Module | Why | Points |
|---|---|---|
| Major: Standard user management (editable profile, avatar with default, friends + online status, profile page) | This is the minimum expected baseline for any social network: without an editable profile and a friend system, there's no identity or relationships between users. | 2 |
| Minor: Remote authentication OAuth 2.0 | Simplifies registration/login by reusing existing accounts (Google, 42, etc.), reducing friction and sparing users from managing yet another password. | 1 |
| Major: Advanced permission system (user CRUD, role management, views/actions based on role) | The "Church" concept is built around a hierarchy of ranks (Brother, Archbishop, etc.); without a robust permission system, that hierarchy can't be reflected or enforced at a functional level. | 2 |
| Major: Organization system (create/edit/delete, add/remove users, actions within the organization) | Allows structuring sub-groups within the community (parishes, congregations), extending the social concept beyond simple one-to-one friendships. | 2 |
| Minor: Complete 2FA | Adds an extra layer of security to accounts, especially relevant since some roles (Archbishop) hold sensitive administrative permissions. | 1 |
| Minor: User activity analytics panel | Provides visibility into actual platform usage (messages sent, active users, growth), useful for both moderation and product decisions. | 1 |
| Subtotal User Management | - | 9 |
---
### Module 4 — Artificial Intelligence
| Module | Why | Points |
|---|---|---|
| Major: Complete LLM system interface (text/streaming, error handling, rate limiting) | Fits the project's humor (a chatbot that "corrects your Makefile" like an oracle) and adds a differentiating feature uncommon in a school project, with streaming for a smooth response experience. | 2 |
| Minor: AI-based content moderation | Automates part of the human moderation workload by flagging inappropriate content in confessions/posts before an Inquisitor has to review it manually. | 1 |
| Subtotal AI | - | 3 |

# Individual Contributions

## vdarsuye — Product Owner & Lead Developer
**Contributed:**
- Defined the overall product concept and feature scope ("Church of the True Relink").
- Set up the Socket.IO real-time layer used by chat, notifications, and presence status.
- Worked across the full stack wherever integration issues appeared between frontend and backend.
- Built the message moderation (soft-delete) logic, including the `SetNull` behavior for moderator references.

**Challenges faced:**
- Keeping refresh tokens secure while supporting multiple simultaneous devices per user — solved by storing one `RefreshToken` row per device/session with individual expiry and revocation, instead of a single token per user.
- Coordinating WebSocket events with the REST API so real-time updates (new messages, friend requests) stayed in sync with database state — addressed by emitting socket events only after successful DB writes, avoiding race conditions between the two.

## datienza — Developer
**Contributed:**
- Built the user profile page (editable fields, avatar, friend list, online indicators).
- Implemented the chat UI for both direct messages and channels.
- Built the notification inbox component.

**Challenges faced:**
- Managing real-time UI updates (new messages arriving via WebSocket while the user browses other views) — solved with a shared state/store pattern so incoming socket events update the UI regardless of which page is active.
- Keeping the chat UI responsive with growing message history — addressed with pagination/lazy-loading of older messages.

## dmena-li — Developer
**Contributed:**
- Designed the app's overall visual identity (theme, iconography, tone consistent with the "Church" concept).
- Built the shared design-system components (buttons, cards, modals) reused across the app.
- Implemented the file attachment feature for chat messages, on both the upload UI and the backend storage/serving logic.

**Challenges faced:**
- Balancing a distinctive visual identity with usability/accessibility constraints — resolved by iterating the design system in Figma before implementation to validate contrast and consistency early.
- Handling file uploads safely (size limits, file type validation, storage naming) to avoid collisions or unsafe files — solved by generating unique server-side filenames while preserving the original name for display.

## cochatel — Project Manager & Developer
**Contributed:**
- Designed the full Prisma schema and relations (User, Friendship, Conversation, Message, Notification, CommunityEvent).
- Implemented the role/permission system and the `/sanctuary` administration panel.
- Implemented the JWT authentication system, including access/refresh token issuance, rotation, and revocation on logout.
- Managed team organization: bi-weekly syncs, Friday review meetings, task distribution via GitHub Issues.

**Challenges faced:**
- Designing a schema flexible enough for both direct messages and multi-user channels without duplicating logic — solved with a single `Conversation` entity typed as `DIRECT` or `CHANNEL`, sharing the same `ConversationParticipant`/`Message` tables.
- Keeping the team aligned on priorities across four people with different focus areas — addressed with structured bi-weekly check-ins plus a longer weekly review to catch blockers early.
