import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import { extractWeights, explainAlignment, clarifyWeights } from './lib/claude.js'
import { getAllLegislators, getLegislatorVector } from './vector_builder.js'
import { fetchActiveBills } from './congress_api.js'
import { getSupabase } from './supabase_client.js'

const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

const CATEGORIES = ['Climate', 'Healthcare', 'Economy', 'CriminalJustice']

const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
  DC:'District of Columbia',
}

function expandState(s) {
  if (!s) return null
  return STATE_NAMES[s.toUpperCase()] ?? s
}

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
  // user weights: 0–100; vote vectors may be 0–1 (Supabase) or 0–100 (mock)
  const u = CATEGORIES.map(c => (userWeights[c] ?? 50) / 100)
  const v = CATEGORIES.map(c => {
    const val = voteVector[c] ?? 0.5
    return val <= 1.0 ? val : val / 100
  })
  const avgDiff = u.reduce((s, ui, i) => s + Math.abs(ui - v[i]), 0) / CATEGORIES.length
  return Math.round((1 - avgDiff) * 100)
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

// POST /api/clarify
// Body: { weights, questions?: string[], answers?: string[] }
// Response: { weights, questions, unclear_categories }
app.post('/api/clarify', async (req, res) => {
  const { weights, questions, answers, mode = 'sliders' } = req.body ?? {}

  if (!weights) {
    return res.status(400).json({ error: 'weights is required.' })
  }

  try {
    const result = await clarifyWeights(weights, questions ?? [], answers ?? [], mode)
    res.json(result)
  } catch (err) {
    console.error('Claude clarify error:', err)
    res.json({ weights, questions: [], unclear_categories: [], warning: 'Clarification failed, using existing weights.' })
  }
})

// GET /api/legislators?state=CA&chamber=all
// Or GET /api/legislators?chamber=senate&party=Democrat&limit=10
// Response: [{ id, name, party, state, chamber, vote_vector }] or { count, legislators }
app.get('/api/legislators', async (req, res) => {
  const { state, chamber, party, limit } = req.query
  const fullState = expandState(state)

  try {
    let legislators = await getAllLegislators()

    if (fullState) {
      legislators = legislators.filter(l => l.state === fullState)
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

    if (fullState) {
      res.json(legislators)
    } else {
      res.json({ count: legislators.length, legislators })
    }
  } catch (err) {
    console.error('DB fetch error, returning mock data:', err)
    let filtered = MOCK_LEGISLATORS
    if (fullState) {
      filtered = filtered.filter(l => l.state === fullState)
    }
    if (chamber && chamber !== 'all') {
      filtered = filtered.filter(l => l.chamber === chamber)
    }
    res.json(fullState ? filtered : { count: filtered.length, legislators: filtered })
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

  const fullState = expandState(state)

  let legislators
  try {
    legislators = await getAllLegislators()
    legislators = legislators.filter(l => l.state === fullState && (chamber === 'all' || l.chamber === chamber))
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
    vote_vector: l.vote_vector ?? null,
    rationale: rationales[i].status === 'fulfilled'
      ? rationales[i].value
      : 'Explanation unavailable.',
  }))

  res.json(results)
})

// POST /api/bills
// Body: { weights, limit? }
// Response: [{ id, name, summary, match, category, url, votes }]
app.post('/api/bills', async (req, res) => {
  const { weights = {}, limit = 6 } = req.body ?? {}

  try {
    const sb = getSupabase()

    // Fetch up to 15 bills per category so scores spread across all 4 dimensions
    const perCategory = await Promise.all(
      CATEGORIES.map(cat =>
        sb.from('bills').select('*').eq('category', cat).order('updated_at', { ascending: false }).limit(15)
      )
    )

    // Score and pick top 2 per category, then sort overall — ensures variety
    const perCategoryBills = perCategory.map((r, idx) => {
      const cat = CATEGORIES[idx]
      return (r.data ?? [])
        .map(bill => {
          const w = weights[bill.category ?? cat] ?? 50
          const match = bill.direction === 'pro' ? w : 100 - w
          return {
            id: bill.bill_id,
            name: bill.title,
            summary: bill.latest_action || bill.policy_area || '',
            match: Math.round(match),
            category: bill.category ?? cat,
            url: bill.congress_url,
            votes: [],
          }
        })
        .sort((a, b) => b.match - a.match)
        .slice(0, 2)
    })

    const bills = perCategoryBills
      .flat()
      .sort((a, b) => b.match - a.match)
      .slice(0, limit)

    res.json(bills)
  } catch (err) {
    console.error('Bills fetch error:', err)
    res.status(500).json({ error: err.message })
  }
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
 * GET /api/bills?category=Climate&direction=pro&limit=10
 * Returns cached bills filtered by category and/or direction.
 * Seed first with: npm run seed:bills
 */
app.get('/api/bills', async (req, res) => {
  const { category, direction, limit } = req.query
  try {
    const { getSupabase } = await import('./supabase_client.js')
    const sb = getSupabase()
    let query = sb.from('bills').select('*').order('introduced_date', { ascending: false })

    if (category) query = query.eq('category', category)
    if (direction) query = query.eq('direction', direction)
    if (limit)     query = query.limit(parseInt(limit, 10))

    const { data, error } = await query
    if (error) throw new Error(error.message)
    res.json({ count: data.length, bills: data })
  } catch (err) {
    console.error('/api/bills error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/bills/active?categories=Climate,Healthcare&limit=10
 * Fetches bills from Congress 119 with action in the last 90 days, live from Congress.gov.
 */
app.get('/api/bills/active', async (req, res) => {
  const categories = req.query.categories ? req.query.categories.split(',') : []
  const limit = parseInt(req.query.limit ?? '20', 10)
  try {
    const bills = await fetchActiveBills(categories, limit)
    res.json(bills)
  } catch (err) {
    console.error('/api/bills/active error:', err.message)
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
