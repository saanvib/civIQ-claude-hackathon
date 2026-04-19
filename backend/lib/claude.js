import Anthropic from '@anthropic-ai/sdk'

let _client = null
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}
const MODEL = 'claude-sonnet-4-6'
const CATEGORIES = ['Climate', 'Healthcare', 'Economy', 'CriminalJustice']

// EXTRACTION_PROMPT will be replaced with Team A's locked prompt at Hr 2 sync.
// Placeholder below matches the agreed output JSON schema.
const EXTRACTION_PROMPT = `You are a non-partisan policy analyst.

Given a user's plain-English description of their political priorities, extract weighted scores from 0–100 for exactly these 4 policy categories:
- Climate: support for environmental regulation, clean energy, emissions reduction
- Healthcare: support for expanded coverage, public options, drug pricing controls
- Economy: support for progressive taxation and government spending (100 = very progressive; 0 = low-tax/market-oriented)
- CriminalJustice: support for criminal justice reform, reduced incarceration, police accountability

0 = strongly oppose progressive action in this area
100 = strongly support progressive action in this area
50 = neutral or unspecified

Return ONLY valid JSON with exactly these keys: {"Climate":n,"Healthcare":n,"Economy":n,"CriminalJustice":n}
No commentary. No explanation. Just the JSON object.`

// SCORING_PROMPT will be replaced with Team A's locked prompt at Hr 2 sync.
const SCORING_PROMPT = `You are a non-partisan political analyst explaining alignment between a citizen's priorities and a legislator's voting record.

Write 2–3 sentences explaining where this legislator's record aligns with and diverges from the user's stated priorities. Be factual and neutral. Reference specific policy areas by name. Do not tell the user how to vote or make any endorsements. Do not use party affiliation as a proxy — speak only to the voting/sponsorship record provided.`

const CLARIFY_PROMPT = `You are a non-partisan policy analyst helping clarify a user's political priorities.

You receive the user's current policy weights (0–100, where 50 = unspecified/neutral) and optionally prior questions you asked along with the user's answers.

Your tasks:
1. If prior Q&A pairs are provided, adjust the weights for those categories based on what the user said.
2. Identify any categories still in the 40–60 range (unclear/neutral). Generate up to 2 concise, non-partisan follow-up questions targeting those unclear categories. Questions must be plain-language, not leading, and ask about concrete policy preferences (not party affiliation).
3. If all categories are clear (outside 40–60), return empty arrays for questions and unclear_categories.

Return ONLY valid JSON in exactly this shape:
{
  "weights": { "Climate": n, "Healthcare": n, "Economy": n, "CriminalJustice": n },
  "questions": ["...", "..."],
  "unclear_categories": ["...", "..."]
}

Rules:
- All weight values must be integers 0–100. Do not change weights for categories that were already clear unless the user's answers directly addressed them.
- "questions" and "unclear_categories" must be parallel arrays (same length, max 2 entries).
- No commentary. No explanation. Just the JSON object.`

export async function extractWeights(text) {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 256,
    system: EXTRACTION_PROMPT,
    messages: [{ role: 'user', content: text }],
  })

  const raw = msg.content[0]?.text?.trim() ?? '{}'
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Claude returned something non-JSON; default everything to neutral
    parsed = {}
  }

  const weights = {}
  for (const cat of CATEGORIES) {
    const val = Number(parsed[cat])
    weights[cat] = isNaN(val) ? 50 : Math.max(0, Math.min(100, val))
  }
  return weights
}

export async function clarifyWeights(weights, questions = [], answers = []) {
  const qaContext = questions.length
    ? questions.map((q, i) => `Q: ${q}\nA: ${answers[i] ?? '(no answer)'}`).join('\n')
    : ''

  const userMessage = [
    `Current weights: ${JSON.stringify(weights)}`,
    qaContext && `Prior Q&A:\n${qaContext}`,
  ].filter(Boolean).join('\n\n')

  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 512,
    system: CLARIFY_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const rawText = msg.content[0]?.text?.trim() ?? '{}'
  const raw = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { weights, questions: [], unclear_categories: [], warning: 'Clarification failed, using existing weights.' }
  }

  const refined = {}
  for (const cat of CATEGORIES) {
    const val = Number(parsed.weights?.[cat])
    refined[cat] = isNaN(val) ? (weights[cat] ?? 50) : Math.max(0, Math.min(100, val))
  }

  return {
    weights: refined,
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    unclear_categories: Array.isArray(parsed.unclear_categories) ? parsed.unclear_categories : [],
  }
}

export async function explainAlignment(userWeights, legislator, score) {
  const userMessage = [
    `User priorities (0–100, higher = more progressive): ${JSON.stringify(userWeights)}`,
    `Legislator: ${legislator.name} (${legislator.party}-${legislator.state}, ${legislator.chamber})`,
    `Voting/sponsorship pattern by category (0–100): ${JSON.stringify(legislator.vote_vector ?? {})}`,
    `Alignment score: ${score}%`,
  ].join('\n')

  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 256,
    system: SCORING_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  return msg.content[0]?.text?.trim() ?? ''
}
