# Political Literacy App

A non-partisan tool that helps users understand which legislators and bills align with their stated policy priorities.

**Framing**: "Here's who aligns with your stated priorities" — never "Vote for X."

## Repo structure

```
backend/   Express API (Track B — Saanvi)
frontend/  React + Vite UI (Track D)
```

---

## Backend API (localhost:3001)

Start: `cd backend && npm run dev`  
Requires `.env` — copy `.env.example` and fill in keys.

### POST /api/extract
Converts free-text stance or slider values into weighted scores across 4 categories.

```bash
# From free text (calls Claude)
curl -X POST localhost:3001/api/extract \
  -H "Content-Type: application/json" \
  -d '{"text":"I want strong climate policy and universal healthcare"}'

# From sliders (no Claude call, returns as-is)
curl -X POST localhost:3001/api/extract \
  -H "Content-Type: application/json" \
  -d '{"sliders":{"Climate":80,"Healthcare":70,"Economy":40,"CriminalJustice":65}}'
```

Response: `{ "weights": { "Climate": 0-100, "Healthcare": 0-100, "Economy": 0-100, "CriminalJustice": 0-100 } }`

### GET /api/legislators
Returns legislators for a state with vote vectors. Reads from Team C's `legislators_cache` Supabase table; falls back to mock data if Supabase isn't wired yet.

```bash
curl "localhost:3001/api/legislators?state=CA&chamber=all"
# chamber options: senate | house | state-senate | state-house | all
```

Response: `[{ id, name, party, state, chamber, vote_vector: { Climate, Healthcare, Economy, CriminalJustice } }]`

### POST /api/score
Scores legislators against user weights (cosine similarity), returns top 3 with Claude-generated plain-English rationale.

```bash
curl -X POST localhost:3001/api/score \
  -H "Content-Type: application/json" \
  -d '{"weights":{"Climate":80,"Healthcare":70,"Economy":40,"CriminalJustice":65},"state":"CA","chamber":"all"}'
```

Response: `[{ id, name, party, state, chamber, score: 0-100, rationale: "..." }]`

---

## Inter-team contracts

### Weights JSON (Track A → B, Track B → D)
```json
{ "Climate": 80, "Healthcare": 60, "Economy": 40, "CriminalJustice": 70 }
```

### Supabase table (Track C writes, Track B reads)
```sql
CREATE TABLE legislators_cache (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  party       TEXT,           -- 'D', 'R', 'I'
  state       TEXT,           -- e.g. 'CA'
  chamber     TEXT,           -- 'senate' | 'house' | 'state-senate' | 'state-house'
  vote_vector JSONB,          -- { "Climate": 0-100, "Healthcare": 0-100, ... }
  cached_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### For Track A — swapping in your locked prompts
Open `backend/lib/claude.js` and replace the `EXTRACTION_PROMPT` and `SCORING_PROMPT` string constants with your finalized prompt text.

### For Track C — connecting Supabase
Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `backend/.env`. The read logic is in `backend/lib/db.js`.

### For Track D — mock data is live now
All three endpoints return valid mock data at `localhost:3001` immediately. Response shapes won't change when real data is wired in at Hr 5.