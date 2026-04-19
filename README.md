# Political Literacy App

A non-partisan tool that helps users discover which legislators and bills align with their stated policy priorities.

**Framing**: "Here's who aligns with your stated priorities" — never "Vote for X."

---

## What it does

1. User enters their policy views — either via sliders or plain-English text
2. Claude asks 2 targeted clarifying questions to refine ambiguous positions
3. User answers conversationally (max 2 rounds)
4. Scoring runs against real legislator vote records
5. Results page shows aligned officials ranked by match %, matching bills, and community polls

---

## Repo structure

```
backend/   Express API (Node 18+)
frontend/  React + Vite UI
```

---

## Prerequisites

- Node 18+
- An [Anthropic API key](https://console.anthropic.com)
- (Optional) A [Congress.gov API key](https://api.congress.gov/sign-up/) for live vote data
- (Optional) Supabase project credentials for caching

---

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and fill in at minimum:

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
FRONTEND_URL=http://localhost:5173
```

The app works without `CONGRESS_API_KEY` or Supabase — it falls back to mock legislator data automatically.

Start the server:

```bash
npm run dev        # dev (auto-restarts on file changes)
# or
npm start          # production
```

Server runs on `http://localhost:3001`.

### 2. Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`. Open that URL in your browser.

---

## User flow

| Step | Route | Description |
|------|-------|-------------|
| 1 | `/` | Landing page — choose slider or free-text input |
| 2 | `/survey` | Enter policy priorities |
| 3 | `/chat` | Claude asks 2 clarifying questions |
| 4 | `/results` | Ranked legislators, matching bills, community polls |

---

## API reference

### `POST /api/extract`
Converts free-text or slider values into 8-dimensional policy weights.

```bash
# From free text (calls Claude)
curl -X POST localhost:3001/api/extract \
  -H "Content-Type: application/json" \
  -d '{"text":"I want strong climate policy and universal healthcare"}'

# From sliders (no Claude call)
curl -X POST localhost:3001/api/extract \
  -H "Content-Type: application/json" \
  -d '{"sliders":{"Climate":80,"Healthcare":70,"Economy":40,"CriminalJustice":65}}'
```

Response:
```json
{ "weights": { "Climate": 80, "Healthcare": 70, "Economy": 50, "CriminalJustice": 50, ... } }
```

### `POST /api/clarify`
Given initial weights, returns 2 targeted follow-up questions for low-confidence categories.

```bash
curl -X POST localhost:3001/api/clarify \
  -H "Content-Type: application/json" \
  -d '{"weights":{"Climate":80,"Healthcare":50},"answers":[]}'
```

Response:
```json
{ "questions": ["...", "..."], "unclear_categories": ["Healthcare", "Economy"] }
```

### `POST /api/score`
Scores legislators against user weights using cosine similarity. Returns top matches with Claude-generated plain-English rationale.

```bash
curl -X POST localhost:3001/api/score \
  -H "Content-Type: application/json" \
  -d '{"weights":{"Climate":80,"Healthcare":70,"Economy":40,"CriminalJustice":65},"state":"CA","chamber":"all"}'
```

Response:
```json
[{ "id": "...", "name": "Jane Smith", "party": "D", "state": "CA", "score": 84, "rationale": "..." }]
```

### `GET /api/legislators`
Returns legislators with vote vectors. Reads from Supabase if configured; falls back to mock data.

```bash
curl "localhost:3001/api/legislators?state=CA&chamber=all"
# chamber: senate | house | state-senate | state-house | all
```

---

## Policy categories

`Climate` · `Housing` · `Labor` · `Healthcare` · `Economy` · `Education` · `Immigration` · `CriminalJustice`

All weights are integers 0–100 where 50 = neutral/not mentioned.

---

## (Optional) Seeding real legislator data

If you have a Congress.gov API key and Supabase credentials set in `.env`:

```bash
cd backend
npm run seed:senate   # fetches + caches all current senators
npm run seed:house    # fetches + caches all current House members
npm run seed:bills    # seeds bill data
```

Required Supabase table:
```sql
CREATE TABLE legislators_cache (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  party       TEXT,
  state       TEXT,
  chamber     TEXT,
  vote_vector JSONB,
  cached_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/ui, Radix, Lucide |
| Backend | Node 18, Express 5 |
| AI | Claude (`claude-sonnet-4-20250514`) via Anthropic SDK |
| Data | ProPublica Congress API, Congress.gov API |
| Cache | Supabase (optional) |

---

## Styling

Navy blue (primary) · Dark red (accent) · White (base)
