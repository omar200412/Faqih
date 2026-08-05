# Faqih

A Duolingo-style app for learning Hanafi fiqh through short lessons and exercises. Turkish-first UI, with Arabic and English scaffolded. Built as a Django REST API backend with an Expo/React Native frontend.

## Repository layout

```
faqih_backend/     Django + DRF backend, content API, and the content-authoring panel
faqih-frontend/    Expo / React Native app (Android, iOS, web)
docs/superpowers/  Design specs and implementation plans for major features
```

## Content model

Content is organized as:

```
Category (course topic, e.g. "Namaz")
  └─ Unit (a skill/section, e.g. "Namaz Vakitleri")
       └─ Lesson (a short, single-session teaching unit)
            ├─ intro (optional: text / image / video, shown before exercises)
            └─ Exercise
                  type: mcq | true_false | matching | image | video
                       | ordering | fill_blank | hotspot (legacy)
```

A lesson is completed once every one of its exercises has been answered correctly at least once — a wrong answer resurfaces later in the same lesson rather than ending it.

## Backend — `faqih_backend/`

**Stack:** Django 5.1, Django REST Framework, SQLite by default (Postgres via `DATABASE_URL` in production if set).

### Setup

```bash
cd faqih_backend
python -m venv .venv
.venv/Scripts/activate        # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Django 5.1 does not run on Python 3.14 — use Python 3.11–3.13 (see `.python-version`).

To use the content panel locally, create a staff account:

```bash
python manage.py createsuperuser
```

### Key URLs

| URL | Purpose |
|---|---|
| `/api/categories/` | Public read API — categories with unit summaries |
| `/api/units/<id>/` | A unit's lessons (summary — no exercises) |
| `/api/lessons/<id>/` | A lesson's intro and full exercise list |
| `/api/questions/` | All exercises (flat, mostly for admin/debugging) |
| `/panel/` | Content-authoring panel for non-technical staff (staff login required) |
| `/admin/` | Django admin |

### Tests

```bash
python manage.py test content
```

## Frontend — `faqih-frontend/`

**Stack:** Expo, React Native, React Navigation.

### Setup

```bash
cd faqih-frontend
npm install
npx expo start --web       # or --android / --ios
```

By default the app points at the deployed backend (`https://faqih.onrender.com`). To run against a local backend, edit `BASE_URL` in `src/API.js` (see the comment there — do not commit that change).

### Tests

```bash
npm test
```

Runs the pure-logic tests under `src/logic/` (currently the lesson mistake-queue session engine) with Node's built-in test runner — no extra dependency required.

## Deployment

The backend deploys to Render via `build.sh` and `Procfile`. Relevant environment variables:

| Variable | Purpose |
|---|---|
| `DJANGO_SETTINGS_MODULE` | Set to `fakih_backend.settings_prod` in production |
| `DATABASE_URL` | Optional — Postgres connection string. Falls back to the bundled SQLite file if unset |
| `SECRET_KEY` | Django secret key |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` | Bootstraps (or updates) one superuser account on each deploy |

`build.sh` installs dependencies, collects static files, runs migrations, seeds initial content only if the database is empty, and provisions the admin account from the environment variables above.

## Design docs

Specs and implementation plans for major features live under `docs/superpowers/`:

- `docs/superpowers/specs/` — approved design documents
- `docs/superpowers/plans/` — task-by-task implementation plans
