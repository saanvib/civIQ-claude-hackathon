import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import { extractWeights, explainAlignment } from './lib/claude.js'
import { getAllLegislators, getLegislatorVector } from './vector_builder.js'

const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

const CATEGORIES = ['Climate', 'Healthcare', 'Economy', 'CriminalJustice']

const MOCK_LEGISLATORS = [
  {
    id: 'mock-1',
    name: 'Senator Alex Rivera',
    party: 'D',
    state: 'CA',
    chamber: 'senate',
    vote_vector: { Climate: 82, Healthcare: 78, Economy: 62, CriminalJustice: 70 },
  },
  {
    id: 'mock-2',
    name: 'Representative Jordan Kim',
    party: 'R',
    state: 'CA',
    chamber: 'house',
    vote_vector: { Climate: 28, Healthcare: 35, Economy: 72, CriminalJustice: 38 },
  },
  {
    id: 'mock-3',
    name: 'Senator Morgan Lee',
    party: 'D',
    state: 'CA',
    chamber: 'senate',
    vote_vector: { Climate: 75, Healthcare: 85, Economy: 58, CriminalJustice: 80 },
  },
]

function cosineSim(userWeights, voteVector) {
  const u = CATEGORIES.map(c => (userWeights[c] ?? 50) / 100)
  const v = CATEGORIES.map(c => (voteVector[c] ?? 50) / 100)
  const dot = u.reduce((s, ui, i) => s + ui * v[i], 0)
  const nu = Math.sqrt(u.reduce((s, ui) => s + ui * ui, 0))
  const nv = Math.sqrt(v.reduce((s, vi) => s + vi * vi, 0))
  return (nu && nv) ? Math.round((dot / (nu * nv)) * 100) : 50
}

// POST /api/extract
// Body: { text?: string, sliders?: { Climate, Healthcare, Economy, CriminalJustice } }
// Response: { weights: { Climate, Healthcare, Economy, CriminalJustice } }
app.post('/api/extract', async (req, res) => {
  const { text, sliders } = req.body ?? {}

  if (!text && !sliders) {
    return res.status(400).json({ error: 'Provide either text or sliders.' })
  }

  if (sliders) {
    const weights = {}
    for (const cat of CATEGORIES) {
      const val = Number(sliders[cat])
      weights[cat] = isNaN(val) ? 50 : Math.max(0, Math.min(100, val))
    }
    return res.json({ weights })
  }

  try {
    const weights = await extractWeights(text)
    res.json({ weights })
  } catch (err) {
    console.error('Claude extraction error:', err)
    // Graceful fallback — return neutral weights so the app doesn't crash
    const fallback = Object.fromEntries(CATEGORIES.map(c => [c, 50]))
    res.json({ weights: fallback, warning: 'Extraction failed, using neutral weights.' })
  }
})

// GET /api/legislators?state=CA&chamber=all
// Or GET /api/legislators?chamber=senate&party=Democrat&limit=10
// Response: [{ id, name, party, state, chamber, vote_vector }] or { count, legislators }
app.get('/api/legislators', async (req, res) => {
  const { state, chamber, party, limit } = req.query

  try {
    let legislators = await getAllLegislators()

    // Filter by state if provided (for app compatibility)
    if (state) {
      legislators = legislators.filter(l => l.state === state)
    }

    // Optional filters
    if (chamber && chamber !== 'all') {
      legislators = legislators.filter(l => l.chamber === chamber)
    }
    if (party) {
      legislators = legislators.filter(l => l.party === party)
    }
    if (limit) {
      legislators = legislators.slice(0, parseInt(limit, 10))
    }

    // If state was provided, return array directly (app expects this)
    if (state) {
      res.json(legislators)
    } else {
      res.json({ count: legislators.length, legislators })
    }
  } catch (err) {
    console.error('DB fetch error, returning mock data:', err)
    let filtered = MOCK_LEGISLATORS
    if (state) {
      filtered = filtered.filter(l => l.state === state)
    }
    if (chamber && chamber !== 'all') {
      filtered = filtered.filter(l => l.chamber === chamber)
    }
    res.json(state ? filtered : { count: filtered.length, legislators: filtered })
  }
})

// POST /api/score
// Body: { weights: { Climate, Healthcare, Economy, CriminalJustice }, state: string, chamber?: string }
// Response: [{ id, name, party, state, chamber, score, rationale }]  top 3
app.post('/api/score', async (req, res) => {
  const { weights, state, chamber = 'all' } = req.body ?? {}

  if (!weights || !state) {
    return res.status(400).json({ error: 'weights and state are required.' })
  }

  let legislators
  try {
    legislators = await getAllLegislators()
    legislators = legislators.filter(l => l.state === state && (chamber === 'all' || l.chamber === chamber))
  } catch (err) {
    console.error('DB fetch error, using mock legislators:', err)
    legislators = chamber === 'all'
      ? MOCK_LEGISLATORS
      : MOCK_LEGISLATORS.filter(l => l.chamber === chamber)
  }

  if (!legislators.length) {
    return res.json([])
  }

  const scored = legislators
    .map(l => ({ ...l, score: cosineSim(weights, l.vote_vector ?? {}) }))
    .sort((a, b) => b.score - a.score)

  const top3 = scored.slice(0, 3)

  const rationales = await Promise.allSettled(
    top3.map(l => explainAlignment(weights, l, l.score))
  )

  const results = top3.map((l, i) => ({
    id: l.id,
    name: l.name,
    party: l.party,
    state: l.state,
    chamber: l.chamber,
    score: l.score,
    rationale: rationales[i].status === 'fulfilled'
      ? rationales[i].value
      : 'Explanation unavailable.',
  }))

  res.json(results)
})

// ── Data layer endpoints (built by data team) ─────────────────────────────────

/**
 * GET /api/legislators/:id
 * Returns one legislator by their ProPublica bioguide ID.
 * Example: GET /api/legislators/S000148
 */
app.get('/api/legislators/:id', async (req, res) => {
  try {
    const legislator = await getLegislatorVector(req.params.id)
    if (!legislator) {
      return res.status(404).json({ error: `Legislator ${req.params.id} not found in cache. Run the seed script first.` })
    }
    res.json(legislator)
  } catch (err) {
    console.error('/api/legislators/:id error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/health
 * Quick check that the server is up and env vars are loaded.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    env: {
      congress:    !!process.env.CONGRESS_API_KEY,
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_key: !!process.env.SUPABASE_ANON_KEY,
      anthropic:   !!process.env.ANTHROPIC_API_KEY,
    }
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))
