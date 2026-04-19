# Political Literacy App

A non-partisan tool that helps users understand which legislators and bills align with their stated policy priorities.

**Framing**: "Here's who aligns with your stated priorities" — never "Vote for X."

## Repo structure

```
backend/   Express API (Track B — Saanvi)
frontend/  React + Vite UI (Track D)
```

---

## Running locally

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend (separate terminal)
cd backend && node index.js
```

## Environment variables

Create `backend/.env`:

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Two CTAs — sliders or free-text input |
| `/survey` | Survey | Slider survey or plain-English textarea |
| `/chat` | Chat | Conversational follow-up questions from Claude |
| `/results` | Results | Aligned officials, matching bills, polls |

## User flow

1. User lands and picks input mode (sliders or free-text)
2. Submits values → stored in `sessionStorage`
3. Claude asks 2 targeted clarifying questions (randomized from pool in mock, dynamic when wired)
4. User answers conversationally — max 2 rounds
5. Scoring runs → results page renders

## API routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/extract` | Slider values or free-text → 8-dim weight object |
| POST | `/api/clarify` | Initial weights + user answers → refined weights + follow-up questions |
| POST | `/api/score` | User weights + legislator votes → alignment % + rationale |
| GET | `/api/legislators` | Fetch + cache legislator vote records from ProPublica |

## Extraction output schema
```json
{
  "Climate": 0, "Housing": 0, "Labor": 0, "Healthcare": 0,
  "Economy": 0, "Education": 0, "Immigration": 0, "CriminalJustice": 0
}
```
Values are integers 0–100. 50 = neutral or not mentioned.

## Clarification output schema
```json
{
  "questions": ["...", "..."],
  "unclear_categories": ["Climate", "Housing"]
}
```

## Scoring output schema
```json
{
  "score": 72,
  "rationale": "2-3 neutral sentences explaining the match."
}
```

## Claude prompts

Model: `claude-sonnet-4-20250514`

Three calls per session:
1. **Extraction** — slider values or free-text → 8-dim weight JSON
2. **Clarification** — identifies low-confidence categories, returns targeted follow-up questions
3. **Scoring** — user weights + legislator vote vector → match % + plain-English rationale

Prompts are locked in `backend/prompts.js`. Do not edit mid-session without re-running evals.

## Data sources

- **ProPublica Congress API** — legislator vote records (free, no approval needed)
- **OpenStates** — state-level bills (stretch goal)
- **Supabase** — caching vote data with 24h TTL

## Policy categories

Climate · Housing · Labor · Healthcare · Economy · Education · Immigration · CriminalJustice

## Results page features

- Top aligned officials ranked by match % with plain-English rationale
- Matching bills showing: title, summary, match %, link to full text, legislator votes (expandable)
- Community polls interleaved with bills — three types: Yes/No, Agree/Neutral/Disagree, Rank
- Weak-match alerts showing where top officials diverge from user's priorities

## Styling

- Color scheme: navy blue (primary), dark red (secondary/accent), white (base)
- Component library: shadcn/ui with Radix primitives
- Icons: Lucide

## Team

| Person | Owns |
|--------|------|
| A | Claude prompts + evals |
| B | Backend routes + deploy |
| C | Data pipeline (ProPublica → vote vectors) |
| D | React frontend + Vercel deploy |

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