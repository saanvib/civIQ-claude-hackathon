/**
 *
 * Turns raw Congress.gov data (votes + sponsored bills) into a clean
 * 4-dimensional vector the scoring team can compare against user preferences.
 *
 * LOCKED output shape (do not rename keys — scoring team depends on this):
 * {
 *   "Climate":         0.0–1.0,
 *   "Healthcare":      0.0–1.0,
 *   "Economy":         0.0–1.0,
 *   "CriminalJustice": 0.0–1.0
 * }
 *
 * Score meaning:
 *   1.0 = strongly supports progressive / stronger policy
 *   0.0 = strongly opposes / weaker policy
 *   0.5 = neutral or no data
 */

import { CATEGORIES, categorizeBill } from "./policy_categories.js";

// ─────────────────────────────────────────────────────────────────────────────
// Party priors
// Used as the starting point when a member has little or no vote history.
// Actual votes OVERRIDE these — they're just a fallback when data is sparse.
// ─────────────────────────────────────────────────────────────────────────────
const PARTY_PRIORS = {
  Democrat:    { Climate: 0.75, Healthcare: 0.75, Economy: 0.65, CriminalJustice: 0.70 },
  Republican:  { Climate: 0.25, Healthcare: 0.28, Economy: 0.40, CriminalJustice: 0.32 },
  Independent: { Climate: 0.50, Healthcare: 0.50, Economy: 0.50, CriminalJustice: 0.50 },
};

function partyPrior(party) {
  for (const [key, vec] of Object.entries(PARTY_PRIORS)) {
    if (party?.toLowerCase().includes(key.toLowerCase())) {
      return { ...vec }; // shallow copy so we don't mutate the constant
    }
  }
  // Unknown party → neutral
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0.5]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Core builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a 4-dimensional vote vector for one legislator.
 *
 * Algorithm (Bayesian-style blending):
 *   1. Start with the party prior as a weak baseline.
 *   2. For every roll-call vote we can categorize, nudge that dimension
 *      toward 1.0 (pro) or 0.0 (con) by VOTE_PULL_STRENGTH.
 *   3. For every sponsored bill, do the same but with half the pull
 *      (sponsoring is a signal but softer than an actual vote).
 *   4. More evidence in a category → bigger departure from the prior.
 *
 * @param {string}   party  - "Democrat" | "Republican" | "Independent"
 * @param {Array}    votes  - from fetchMemberVotes()
 * @param {Array}    bills  - from fetchMemberSponsoredBills()
 * @returns {{ vector: Object, evidence: Object }}
 */
export function buildVoteVector(party, votes = [], bills = []) {
  const vector = partyPrior(party);
  const evidence = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));

  const VOTE_PULL   = 0.18; // how hard each roll-call vote nudges the score
  const BILL_PULL   = 0.09; // sponsoring a bill is a softer signal

  // ── Roll-call votes (strongest signal) ───────────────────────────────────
  for (const vote of votes) {
    const result = categorizeBill(vote.bill_subjects, vote.bill_title);
    if (!result) continue;

    const { category, direction } = result;

    // Determine the target score for this vote:
    //   Voted YES on a progressive bill  → target 1.0 (supports it)
    //   Voted NO  on a progressive bill  → target 0.0 (opposes it)
    //   Voted YES on a regressive bill   → target 0.0 (supports regression)
    //   Voted NO  on a regressive bill   → target 1.0 (blocked regression)
    let target;
    if (vote.position === "Yes")  target = direction === "pro" ? 1.0 : 0.0;
    else if (vote.position === "No") target = direction === "pro" ? 0.0 : 1.0;
    else continue; // "Not Voting" / "Present" → no signal

    vector[category] += (target - vector[category]) * VOTE_PULL;
    evidence[category]++;
  }

  // ── Sponsored bills (softer signal) ──────────────────────────────────────
  for (const bill of bills) {
    const result = categorizeBill(bill.subjects, bill.title);
    if (!result) continue;

    const { category, direction } = result;
    const target = direction === "pro" ? 1.0 : 0.0;
    vector[category] += (target - vector[category]) * BILL_PULL;
    evidence[category]++;
  }

  // ── Clamp and round ───────────────────────────────────────────────────────
  for (const cat of CATEGORIES) {
    vector[cat] = parseFloat(
      Math.max(0.0, Math.min(1.0, vector[cat])).toFixed(3)
    );
  }

  return { vector, evidence };
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase read helpers — used by index.js to serve the scoring team
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up one legislator's cached vector from Supabase.
 * Returns null if not found.
 */
export async function getLegislatorVector(legislatorId) {
  const { getSupabase } = await import("./supabase_client.js");
  const sb = getSupabase();
  const { data, error } = await sb
    .from("legislator_votes")
    .select("*")
    .eq("legislator_id", legislatorId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Fetch ALL cached legislators — used for bulk ranking against user preferences.
 */
export async function getAllLegislators() {
  const { getSupabase } = await import("./supabase_client.js");
  const sb = getSupabase();
  const { data, error } = await sb
    .from("legislator_votes")
    .select("*")
    .not("vote_vector", "is", null)
    .order("name");

  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return data ?? [];
}
