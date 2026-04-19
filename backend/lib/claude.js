import Anthropic from '@anthropic-ai/sdk'

let _client = null
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}
const MODEL = 'claude-sonnet-4-6'
const CATEGORIES = ['Climate', 'Healthcare', 'Economy', 'CriminalJustice']

const EXTRACTION_PROMPT = `You are a non-partisan policy analyst. Your job is to read a user's plain-English description of their political priorities and convert it into numeric scores.

Score each of these 4 categories from 0 to 100:
- Climate: Degree of support for environmental regulation, clean energy investment, and emissions reduction targets. (0 = strongly oppose government action; 100 = strongly support aggressive climate policy)
- Healthcare: Degree of support for expanded public coverage, universal access, drug pricing controls, and public health funding. (0 = strongly prefer private/market-based healthcare; 100 = strongly support government-expanded coverage)
- Economy: Degree of support for progressive taxation, social safety nets, and government spending programs. (0 = strongly prefer low taxes and minimal government spending; 100 = strongly support higher taxes on wealth and robust public programs)
- CriminalJustice: Degree of support for reform-oriented criminal justice policies: reduced mandatory minimums, police accountability, rehabilitation over incarceration. (0 = strongly prefer tough-on-crime, punitive approaches; 100 = strongly support systemic reform)

Rules:
- If the user expresses a clear strong opinion in a category, score it 0–20 or 80–100.
- If the user expresses a moderate lean, score it 30–45 or 55–70.
- If the user does not mention a category or says they are unsure, score it exactly 50.
- If the input is off-topic, nonsensical, or contains no political content, return all scores as 50.
- Never infer from demographics, location, or group identity — only from explicitly stated positions.

Return ONLY a valid JSON object with exactly these keys. No commentary, no markdown, no explanation:
{"Climate":n,"Healthcare":n,"Economy":n,"CriminalJustice":n}`

const SCORING_PROMPT = `You are a non-partisan political analyst. Your job is to explain — factually and neutrally — how a specific legislator's voting and sponsorship record compares to a citizen's stated policy priorities.

You will receive:
- The user's priority scores (0–100 per category; higher = more progressive preference)
- The legislator's voting pattern scores (0–100 per category; derived from their actual votes and sponsored bills)
- An overall alignment percentage

Write exactly 2–3 sentences following these rules:
1. First sentence: State which policy areas show the strongest alignment (scores within 20 points of each other).
2. Second sentence: State which policy areas show the weakest alignment or greatest divergence (scores more than 30 points apart), if any exist.
3. Optional third sentence: Note any nuance — e.g., a category where the legislator has a mixed record or the user expressed no strong preference.

Rules:
- Never say "vote for" or make any endorsement.
- Never use party affiliation as a signal — speak only to category scores and voting record.
- If all categories align closely, say so and skip the divergence sentence.
- Use plain language a non-expert can understand. Avoid jargon.
- Do not mention the alignment percentage number — let the explanation stand on its own.`

const CLARIFY_PROMPT_TEXT = `You are a non-partisan policy analyst helping clarify a user's political priorities.

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

const CLARIFY_PROMPT_SLIDERS = `You are a non-partisan policy analyst. A user has rated how much they care about each policy topic on a 0–100 scale (0 = not a concern, 100 = top priority). These are SALIENCE scores — they do not indicate support or opposition.

You receive:
1. Salience weights: how much the user cares about each category (0 = don't care, 100 = care deeply)
2. Optionally: questions you asked previously and the user's answers.

FIRST CALL (no prior Q&A provided):
- Identify categories where weight ≥ 60 — the user cares about these.
- Return the salience weights unchanged in "weights".
- Generate up to 2 concise, non-partisan questions asking about the user's specific POLICY POSITION on those high-priority categories (e.g. "On healthcare, do you favor expanding government programs like Medicare, or do you prefer private market-based solutions?").
- List those categories in "unclear_categories".
- If no categories have weight ≥ 60, return empty arrays.

FOLLOW-UP CALL (prior Q&A is provided):
- Based on the user's answers, convert salience into STANCE weights for each category they answered about:
  - 70–100: user supports progressive / expansive policy in this area
  - 30–70: user has mixed or moderate views
  - 0–30: user prefers conservative / limited government policy in this area
- For categories with original salience < 60, set weight to exactly 50 (excluded from scoring).
- If all high-priority categories now have clear stances, return empty arrays for "questions" and "unclear_categories".
- If any remain unclear, ask up to 2 more follow-up questions.

Return ONLY valid JSON in exactly this shape:
{
  "weights": { "Climate": n, "Healthcare": n, "Economy": n, "CriminalJustice": n },
  "questions": ["...", "..."],
  "unclear_categories": ["...", "..."]
}

Rules:
- Weight values must be integers 0–100.
- "questions" and "unclear_categories" must be parallel arrays (same length, max 2 entries).
- Questions must be plain English, non-leading, and ask about concrete policy preferences — not party affiliation.
- No commentary. No markdown. Just the JSON object.`

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

export async function clarifyWeights(weights, questions = [], answers = [], mode = 'sliders') {
  const CLARIFY_PROMPT = mode === 'text' ? CLARIFY_PROMPT_TEXT : CLARIFY_PROMPT_SLIDERS
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
