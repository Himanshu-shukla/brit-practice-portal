# BRIT Institute — Practice Portal

Full-stack learner assessments with **Next.js (App Router) + TypeScript + MongoDB/Mongoose + private Google Drive storage**. Two roles share a single login: mentor and learner. This is a standalone starter that can later reuse the existing BRIT LMS's authentication and user directory.

## What is implemented

- Learner: role-based login; dashboard; daily calendar by UK date; scheduled/released tests; per-question answers; autosave; final submission; server-side scoring; review explanations; subject/topic/difficulty question bank with server-side pagination; incorrect/resolved revision questions; personalized revision retests; progress report.
- Mentor: learner account provisioning and batch IDs; manual question creation/editing with single/multiple choice, true/false, snippets and images; tags; question versioning; publish/draft/archive via editor; test scheduling, batch targeting and publication; JSON, CSV and Excel imports; REST bulk question creation; simple analytics.
- Storage: MongoDB for question metadata and attempts; **Google Drive for image binaries**, accessed by the server through OAuth2 and *never made publicly shareable*. The app proxies protected images from Drive using authenticated routes.
- A test **snapshots** its questions when scheduled: later changes to the question bank will not silently change the answers or scores of previously assigned tests.
- Security: hashed passwords, signed HttpOnly cookies, role checks in APIs, origin checks, import limits, restricted image formats and sizes, separate machine integration API key, and saved responses graded only on the backend.

## Requirements

- Node.js 20.9+ (Node 22 recommended)
- MongoDB 6+ or MongoDB Atlas
- Google Cloud project with the **Google Drive API enabled**
- Dedicated human-owned Google account used for question-image storage, with an OAuth 2.0 client and a Drive folder

## Install & run

```bash
npm install
cp .env.example .env.local
# Edit .env.local (see below).
npm run seed
npm run dev
```

Open `http://localhost:3000`. Log in using `SEED_MENTOR_EMAIL/SEED_MENTOR_PASSWORD`, or the optional seeded learner login. The seed script is repeatable. On its first run it also publishes a one-question Excel demo test for **today in UK time**.

Run checks once dependencies are installed:

```bash
npm run typecheck
npm test
npm run build
```

**Important:** The supplied source has been syntactically inspected, but it has not been run against your MongoDB or Google Drive account. Complete the cloud credentials and run the commands above before production. No actual production integration or API request was made for this deliverable.

## Configure Google Drive storage — recommended OAuth method

**Why not just use a service-account JSON key?** Google service accounts cannot own uploaded files in My Drive and do not have a Drive storage quota. They can upload to Workspace Shared Drives, or impersonate a user when domain-wide delegation is correctly configured. This project deliberately uses **OAuth2 with a human-owned Drive account** so it also works for regular My Drive. See official [Google shared drive docs](https://developers.google.com/workspace/drive/api/guides/about-shareddrives).

1. Use a dedicated BRIT-owned Google account for image storage, not a mentor's personal account. Create a `BRIT-Practice-Images` folder in its My Drive, and copy its folder ID from the URL to `GOOGLE_DRIVE_FOLDER_ID`.
2. Open Google Cloud Console → APIs & Services. Enable **Google Drive API**. Set up the OAuth consent screen and create **OAuth client ID → Web application**.
3. Add `http://localhost:8765/callback` as an authorized redirect URI for the client. Fill `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`.
4. Run `npm run drive:authorize`. Open the URL displayed in the terminal, grant access as the dedicated BRIT account, and copy the printed `GOOGLE_REFRESH_TOKEN` to `.env.local`. Never commit or expose any of these secrets.
5. The script requests the broad `https://www.googleapis.com/auth/drive` scope to access a pre-existing manually created folder. This broad scope can require OAuth app verification or permitted test-user configuration. Limit who can authorize the app; prefer an organization-controlled Workspace account. Unverified external testing-mode apps can yield short-lived refresh tokens; for production, complete the appropriate consent-screen and verification steps.
6. Restart the server. Mentor → Question Editor → Image upload will now store images in your Drive folder. File IDs are retained only in MongoDB; learners view images through `/api/v1/media/:id` and never see Drive IDs or public share links.

### Alternative: Workspace Shared Drive

If you have Google Workspace Shared Drives, the Google API allows service accounts with appropriate Shared Drive permissions to create files there. **The supplied code does not implement service-account credentials**; its implemented and documented path is OAuth2. You can swap `src/lib/drive.ts` for a service-account client if desired.

## Environment variables

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection URL |
| `JWT_SECRET` | Strong random secret, at least 32 characters |
| `APP_ORIGIN` | Exact UI origin, including scheme/host, for origin protection (no trailing path) |
| `SEED_MENTOR_EMAIL`, `SEED_MENTOR_PASSWORD` | Initial mentor for `npm run seed` |
| `SEED_LEARNER_EMAIL`, `SEED_LEARNER_PASSWORD` | Optional demo learner for `npm run seed` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth client credentials |
| `GOOGLE_REFRESH_TOKEN` | OAuth token from authorization script |
| `GOOGLE_DRIVE_FOLDER_ID` | Destination image folder |
| `INTEGRATION_API_KEY` | Optional 32+ character random key for machine upload endpoints |
| `INTEGRATION_MENTOR_EMAIL` | Existing mentor email to attribute API-key imports and scheduled tests |

Use a cryptographically random value for JWT and integration keys (`openssl rand -hex 32`). **Never prefix these values with `NEXT_PUBLIC_`**.

## Main workflows

**Create learners:** Mentor Studio → Learner Accounts. Set a learner's `batchId` (e.g. `cohort-oct-2026`). Share the initial password out-of-band. Learners have role `learner` and cannot use mentor APIs. Real LMS integration can replace this standalone login.

**Create questions:** Mentor Studio → Question Manager → Create Question. Choose subject, topics, tags, answer options and the correct option(s). Upload question or option images through the image chooser. Add an explanation and publish. The backend validates options and correct keys.

**Schedule tests:** Mentor Studio → Daily Test Scheduler. Select published questions (across question list pages), enter the date and a `batchId` (`all` for every learner). Published tests become available at **00:00 Europe/London on the specified date**. Learners see their assigned tests under that date in the calendar.

**Complete daily test:** Learner clicks Calendar → date → test. The page autosaves selected answers with a 900 ms debounce and also has a Save Progress button. Final submission grades all questions on the server. Empty choices receive zero; answer keys and explanations are returned **only after final submission**.

**Incorrect question revision:** Only incorrect answers create a `QuestionProgress` item. Each learner has an independent `needsRevision` value for each question, separate from the immutable submitted test score. Retesting a question records a `RevisionAttempt`; correct revision resolves the question, incorrect revision leaves it pending. The learner can select Needs Revision / Resolved / All Incorrect, filter by subject/topic, and paginate.

**Browse questions:** The Question Bank lists distinct questions drawn only from **released tests visible to that learner**. Draft/unreleased questions and answer keys remain inaccessible.

**Imports:** Mentor Studio → Import Questions accepts `.json`, `.csv` or `.xlsx`, max 2 MB and 200 questions per upload. Use the downloadable CSV template. For repeatable imports, use an `externalId`. The imported question is unchanged if the same external ID already exists. JSON uses the full question schema below. Example payloads are in `examples/bulk-questions.json` and `examples/bulk-questions.csv`.

## API examples

Use browser mentor login cookies to call same-origin APIs, or use the dedicated `INTEGRATION_API_KEY` for **question creation, bulk question creation and test scheduling** only.

```bash
curl -X POST http://localhost:3000/api/v1/mentor/questions/bulk \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $INTEGRATION_API_KEY" \
  -d '[{
    "externalId":"BRIT-SQL-0001",
    "type":"single_choice",
    "subject":"sql",
    "topics":["joins"],
    "tags":["sql/joins","interviews"],
    "difficulty":"intermediate",
    "questionText":"Which JOIN keeps only matching rows?",
    "mediaIds":[],
    "options":[{"key":"A","text":"LEFT JOIN"},{"key":"B","text":"INNER JOIN"}],
    "correctOptionKeys":["B"],
    "explanation":"An INNER JOIN returns rows with matching keys on both sides.",
    "status":"published"
  }]'
```

To assign a question set to a date:

```bash
curl -X POST http://localhost:3000/api/v1/mentor/tests \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $INTEGRATION_API_KEY" \
  -d '{"title":"SQL Practice Day 1","testDate":"2026-10-15","batchId":"all","questionIds":["REPLACE_WITH_QUESTION_ID"],"status":"published"}'
```

| Endpoint | Purpose / access |
| --- | --- |
| `POST /api/v1/auth/login` | Learner/mentor login |
| `POST /api/v1/auth/logout` | Logout |
| `GET /api/v1/auth/me` | Current user |
| `GET /api/v1/learner/dashboard` | Learner dashboard |
| `GET /api/v1/learner/calendar?month=2026-10` | Daily calendar |
| `GET /api/v1/learner/daily-tests?date=2026-10-12` | Test list for date |
| `GET /api/v1/learner/daily-tests/:id` | Question set (no answers until submitted) |
| `POST /api/v1/learner/daily-tests/:id/answers` | Save current answer selections |
| `POST /api/v1/learner/daily-tests/:id/submit` | Grade/finalize daily test |
| `GET /api/v1/learner/questions` | Published searchable question bank |
| `GET /api/v1/learner/incorrect-questions` | Personal mistakes and filters |
| `POST /api/v1/learner/revision-attempts` | Retest an incorrect question |
| `GET /api/v1/learner/progress` | Personal progress |
| `GET/POST /api/v1/mentor/questions` | List/create mentor questions |
| `GET/PATCH /api/v1/mentor/questions/:id` | View/edit question version |
| `POST /api/v1/mentor/questions/bulk` | JSON bulk upload, accepts integration key |
| `POST /api/v1/mentor/questions/import` | Multipart JSON/CSV/XLSX import |
| `GET/POST /api/v1/mentor/tests` | List/create daily tests, create accepts integration key |
| `GET/PATCH /api/v1/mentor/tests/:id` | Read/edit dates, batch, items, publish/archive (editing blocked once attempts exist) |
| `GET/POST /api/v1/mentor/learners` | Provision and list learners |
| `GET /api/v1/health` | MongoDB readiness check |
| `GET /api/v1/mentor/analytics` | Mentor analytics |
| `POST /api/v1/mentor/media/uploads` | Upload image to Google Drive |
| `GET /api/v1/media/:id` | Secure proxied media, role/visibility checked |

### Query parameters for pagination and filtering

`GET /api/v1/learner/questions?subject=excel&topic=pivot_tables&difficulty=intermediate&page=1&pageSize=10`

`GET /api/v1/learner/incorrect-questions?status=pending&subject=sql&topic=window_functions&page=1&pageSize=10`

Status values: `pending`, `resolved`, `all`. Each response includes `items`, `total`, `page`, `pageSize`. All fields are filtered on the server. Page sizes cap at 50.

## MongoDB collections

`users`, `questions`, `dailytests`, `testattempts`, `questionprogresses`, `revisionattempts`, `media` (Mongoose chooses collection names). Index definitions are in `src/lib/models.ts`.

A `DailyTest.items[]` entry stores both `questionId` and `snapshot`, including the correct option keys, preventing future question edits from changing prior tests. Never serialize `snapshot.correctOptionKeys` to learners until their attempt is finalized.

## Production deploy to Hostinger VPS

1. Clone/copy to e.g. `/var/www/brit-practice-portal` on the existing Ubuntu VPS.
2. Install Node 22 and run `npm ci` after generating and committing a `package-lock.json`; run `npm run typecheck`, `npm test`, `npm run build`. This archive does not contain a lockfile because the package registry was not reachable in the current authoring environment. Initially `npm install` will generate the lockfile.
3. Use MongoDB Atlas with TLS/IP restrictions or protect a locally hosted MongoDB; do not expose MongoDB publicly.
4. Set `.env.local` with production MongoDB, JWT, `APP_ORIGIN=https://practice.<your-domain>`, Google OAuth and Drive credentials. Protect with filesystem permissions and back it up securely.
5. Launch via `pm2 start npm --name brit-practice -- start` and `pm2 save`.
6. Add an Nginx HTTPS reverse proxy for `practice.<your-domain>` to `127.0.0.1:3000`. Enable TLS, security headers, and request rate limiting; lock down admin endpoints and MongoDB ports.
7. Configure monitoring, database backups, Drive capacity monitoring, and a staging environment before onboarding learners.
8. Integrate with the current BRIT LMS authentication and batch directory rather than maintaining duplicate credentials once ready.

### Production hardening still required

This is a **functional implementation starter**, not a security-audited, production-certified exam system. Before inviting real learners, add automated integration/E2E tests against MongoDB and Drive, a password-reset/invite workflow (or LMS SSO), audit logs, stronger IP/account rate limiting, image malware scanning if needed, fine-grained mentor/cohort permissions, batch/user enrollment sync, accessibility testing, backup restore drills, and metrics/alerts. MongoDB updates involving final test submission and revision progress are separate writes rather than a multi-document transaction; a failed progress write can be retried by resubmitting the already-submitted test, but for rigorous transactional consistency use a MongoDB replica set with transactions or a reliable reconciliation job. Avoid reusing production Google Drive personal credentials for other applications.

### Upload a question image through the integration API

```bash
curl -X POST http://localhost:3000/api/v1/mentor/media/uploads \
  -H "Authorization: Bearer $INTEGRATION_API_KEY" \
  -F "file=@./example-pivot-table.png"
# Returns {"mediaId":"...","url":"/api/v1/media/..."}. Put mediaId in a question payload.
```
