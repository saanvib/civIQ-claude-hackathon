import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import { extractWeights, explainAlignment } from './lib/claude.js'
import { getLegislators } from './lib/db.js'

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
// Response: [{ id, name, party, state, chamber, vote_vector }]
app.get('/api/legislators', async (req, res) => {
  const { state, chamber = 'all' } = req.query
  if (!state) return res.status(400).json({ error: 'state query param required.' })

  try {
    const legislators = await getLegislators(state, chamber)
    res.json(legislators)
  } catch (err) {
    console.error('DB fetch error, returning mock data:', err)
    const filtered = chamber === 'all'
      ? MOCK_LEGISLATORS
      : MOCK_LEGISLATORS.filter(l => l.chamber === chamber)
    res.json(filtered)
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
    legislators = await getLegislators(state, chamber)
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

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))
