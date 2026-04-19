# Backend Data Layer

This backend now includes the ProPublica + Supabase data pipeline for building legislator vote vectors in four issue areas:
- `Climate`
- `Healthcare`
- `Economy`
- `CriminalJustice`

## What was added

- `policy_categories.js` — keyword-based policy categorization for ProPublica bill text.
- `propublica.js` — fetch current Congress members and member vote records from ProPublica.
- `vector_builder.js` — build a 4-dimensional vote vector from actual roll-call votes.
- `supabase_client.js` — Supabase client helper.
- `seed_legislators.js` — CLI script to seed cached vote vectors to Supabase.
- `index.js` — new `/api/legislators` and `/api/legislators/:id` endpoints.

## Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Fill in `.env` with your ProPublica API key and Supabase project credentials.

## Supabase table

Create a `legislator_votes` table in Supabase with at least these columns:

```sql
create table legislator_votes (
  legislator_id text primary key,
  name text,
  party text,
  state text,
  chamber text,
  vote_vector jsonb,
  raw_votes jsonb,
  updated_at timestamptz default now()
);
```

## Seed data

Run the seed script for Senate or House:

```bash
npm run seed:senate
```

or

```bash
npm run seed:house
```

This will fetch current legislators from ProPublica, build the vote vectors, and cache them into Supabase.

## API

- `GET /api/legislators` — returns the cached legislator list and vote vectors.
- `GET /api/legislators/:id` — returns one cached legislator.

## Notes

- The vector is intentionally small and explainable: only the four core categories for this data task.
- When a legislator has no direct vote evidence in a category, the vector uses a party-based prior.
- This is the backend data layer for the scoring team; the frontend can now query `/api/legislators` to rank and explain matches.
