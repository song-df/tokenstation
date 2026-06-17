# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What this is

An LLM API gateway ("智联学习云AI服务") for students. It relays OpenAI- and Anthropic-format
requests to upstream providers (OpenRouter, native Anthropic, etc.), meters usage against a
per-user quota, and ships an admin/student web console. Backend is FastAPI + async SQLAlchemy
(SQLite); frontend is React 19 + Vite + Tailwind v4.

## Commands

Run both services together (from repo root):

```bash
./start.sh    # backend :8000 + frontend :5173, backend log -> /tmp/backend_live.log
```

Backend (from `backend/`):

```bash
source venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Frontend (from `frontend/`):

```bash
npm run dev      # vite dev server, proxies /api -> localhost:8000
npm run build    # tsc -b && vite build
npm run lint     # eslint
```

There is **no test suite**. The DB (`backend/data.db`, SQLite) is created and seeded on
startup by the `lifespan` hook in `main.py`, which also creates a default admin
(credentials in `config.py`) if none exists. Schema changes are applied via
`Base.metadata.create_all` only — there are no migrations, so adding columns to existing
tables requires deleting `data.db` or altering it manually.

## Architecture

### Request relay (the core)

The gateway exposes two upstream-facing API surfaces under `/api/v1` (see `routers/api.py`):

- **OpenAI-compatible**: `POST /v1/chat/completions`, `GET /v1/models`
- **Anthropic-native**: `POST /v1/messages`, `GET /v1/models/anthropic`,
  `POST /v1/messages/count_tokens` — used by Codex.

`services/relay.py` is where requests are translated and forwarded. The key decision is made
per request by `find_channel()` (picks the highest-`priority` active `Channel` whose `models`
text field contains the model name) and `find_model_config()`. Then:

- Anthropic request + `channel.provider == "anthropic"` → `relay_anthropic_passthrough[_stream]` (direct passthrough).
- Anthropic request + OpenAI-style channel (e.g. OpenRouter) → `relay_anthropic_via_openai[_stream]`, which translates Anthropic↔OpenAI in both directions (`_anthropic_to_openai_body`, `_openai_response_to_anthropic`).
- OpenAI request → `relay_chat_completion[_stream]` → `relay_openai[_stream]`.

`_MODEL_MAP` in `relay.py` maps client-facing model IDs (e.g. `Codex-opus-4-8`) to upstream
IDs (e.g. `anthropic/Codex-opus-4.8`). Update this when adding/renaming models.

### Quota & billing

Every relay call writes a `RequestLog` row (tokens, computed `cost`, success/error). Cost =
`calculate_cost(model_config, prompt_tokens, completion_tokens)` using per-1k `input_price`/
`output_price` from `ModelConfig`. The router then deducts from `user.quota` (minimum 0.01 per
call). **Streaming responses bill after the stream finishes** by re-reading the most recent
`RequestLog` for that user+model — the relay generator is responsible for writing that log row
before yielding its final chunk.

### Auth (three credential types, one resolver)

`auth.get_current_user` accepts a token from either the `Authorization: Bearer` header or the
`x-api-key` header (Codex convention), then tries, in order:

1. **JWT** — used by the web console (issued by `/api/auth/login`).
2. **`User.api_key`** — the legacy primary per-user key.
3. **`ApiKey` table** (`user_api_keys`) — named, multi-key per user; bumps usage stats on hit.

`get_admin_user` gates admin-only routes. API keys are `sk-` + `secrets.token_urlsafe(32)`.

### Routers (all mounted under `/api` in `main.py`)

- `admin.py` — `/admin/*`: channels, models, users, logs, topups, referrals, guide content, messages (admin-only).
- `api.py` — `/v1/*`: the relay endpoints above.
- `student.py` — `/student/*`: profile, logs, topups, tasks, messages for the logged-in student.
- `auth_public.py` — `/public/*`: registration, email verification codes, referral handling.
- `redeem.py` — `/redeem/*`: redeem-code generation (admin) and redemption (student); redemption tops up quota.
- `autogen.py` — `/admin/autogen/*`: auto-generates redeem-code stock per denomination when stock drops below threshold. `check_and_autogen` is also called from `redeem.py` after a code is consumed.
- `keys.py` — `/keys/*`: student-facing CRUD for their named `ApiKey`s.

`main.py` itself defines `/api/auth/login` and `/api/auth/me` directly (not in a router).

### Frontend

Single SPA (`src/App.tsx`) that branches on `user.role` after `/api/auth/me`:
admin routes use `Layout`, student routes use `StudentLayout`, unauthenticated users see
Login/Register/QuickGuide. All backend calls go through the single `api` object in
`src/lib/api.ts`, which injects the bearer token and redirects to `/login` on 401. The JWT is
persisted in `localStorage` under `token`. Pages live in `src/pages/`. UI copy is in Chinese.

## Config & secrets

`backend/config.py` (`Settings`, env-overridable via `backend/.env`) holds `database_url`,
`secret_key` (JWT signing — see `config.example.py` for defaults), `default_quota`, and
`system_api_secret`. CORS is wide open (`allow_origins=["*"]`) in `main.py`. These are
production-relevant defaults; treat them accordingly when deploying.
