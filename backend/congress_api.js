/**
 * Congress.gov API client.
 *
 * Docs: https://api.congress.gov/
 * Free key: https://api.congress.gov/sign-up/ (instant, no approval needed)
 * Rate limit: 5,000 req/hour.
 *
 * Exports the SAME three function signatures that the rest of the data
 * layer expects, so vector_builder + seed_legislators need no changes:
 *
 *   fetchCurrentMembers(chamber)
 *   fetchMemberVotes(memberId, pages)       ← uses cosponsored bills as proxy
 *   fetchMemberSponsoredBills(memberId, limit)
 */

const BASE    = "https://api.congress.gov/v3";
const CONGRESS = "119"; // 119th Congress (Jan 2025 – Jan 2027)

function headers() {
  const key = process.env.CONGRESS_API_KEY;
  if (!key) throw new Error("CONGRESS_API_KEY is not set in your .env file");
  return {
    "X-API-Key": key,
    "Accept": "application/json",
  };
}

// Congress.gov is generous on rate limits, but a small delay keeps logs readable
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Policy area → our 4 locked categories
// Congress.gov tags every bill with a top-level "policyArea.name".
// This is much cleaner than keyword-matching titles.
// ─────────────────────────────────────────────────────────────────────────────
export const POLICY_AREA_TO_CATEGORY = {
  // Climate
  "Environmental Protection":       "Climate",
  "Energy":                          "Climate",
  "Public Lands and Natural Resources": "Climate",
  "Water Resources Development":    "Climate",
  "Animals":                         "Climate",
  "Science, Technology, Communications": "Climate",

  // Healthcare
  "Health":                          "Healthcare",
  "Families":                        "Healthcare",
  "Social Welfare":                  "Healthcare",

  // Economy
  "Economics and Public Finance":   "Economy",
  "Taxation":                        "Economy",
  "Labor and Employment":           "Economy",
  "Commerce":                        "Economy",
  "Finance and Financial Sector":   "Economy",
  "International Trade and Finance":"Economy",
  "Housing and Community Development": "Economy",

  // CriminalJustice
  "Crime and Law Enforcement":      "CriminalJustice",
  "Civil Liberties, Civil Rights, Minorities": "CriminalJustice",
  "Immigration":                     "CriminalJustice",
  "Law":                             "CriminalJustice",
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Member list
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch current members of Congress from the Congress.gov API.
 *
 * Endpoint: GET /v3/member/{congress}/{chamber}
 *
 * @param {"senate"|"house"} chamber
 * @returns {Promise<Array<{
 *   legislator_id: string,
 *   name: string,
 *   party: string,
 *   state: string,
 *   chamber: string,
 * }>>}
 */
export async function fetchCurrentMembers(chamber = "senate") {
  const allMembers = [];
  let offset = 0;
  const limit = 250;
  // API returns "Senate" or "House of Representatives" in terms[].chamber
  const chamberMatch = chamber.toLowerCase() === "senate" ? "senate" : "house";

  while (true) {
    const url = `${BASE}/member?currentMember=true&format=json&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: headers() });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Congress.gov members fetch failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    const page = data.members ?? [];
    if (page.length === 0) break;

    for (const m of page) {
      // Determine current chamber from the member's most recent term
      const terms = m.terms?.item ?? [];
      const latestChamber = (terms[terms.length - 1]?.chamber ?? "").toLowerCase();
      if (!latestChamber.includes(chamberMatch)) continue;

      allMembers.push({
        legislator_id: m.bioguideId,
        name:          formatName(m.name),
        party:         normalizeParty(m.partyName),
        state:         toStateAbbr(m.state),
        chamber,
      });
    }

    if (!data.pagination?.next) break;
    offset += limit;
    await sleep(150);
  }

  return allMembers;
}

// Congress.gov returns names as "LastName, FirstName [Middle]"
function formatName(raw = "") {
  if (!raw.includes(",")) return raw.trim();
  const [last, rest] = raw.split(",");
  return `${rest.trim()} ${last.trim()}`;
}

function normalizeParty(name = "") {
  if (!name) return "Independent";
  const n = name.toLowerCase();
  if (n.includes("democrat")) return "Democrat";
  if (n.includes("republican")) return "Republican";
  return "Independent";
}

// Congress.gov returns full state names — convert to 2-letter abbreviations
const STATE_ABBR = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
  "Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD",
  "Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS",
  "Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH",
  "New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC",
  "North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA",
  "Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD","Tennessee":"TN",
  "Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA","Washington":"WA",
  "West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY","District of Columbia":"DC",
};

function toStateAbbr(name = "") {
  return STATE_ABBR[name] ?? name;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. "Votes" — we use cosponsored legislation as a proxy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a member's cosponsored bills and return them shaped like vote records.
 *
 * WHY cosponsoring instead of roll-call votes:
 *   Congress.gov v3 doesn't expose a "how did member X vote on each roll call"
 *   endpoint. But cosponsoring is actually a *stronger* signal — the member
 *   sought out the bill and put their name on it voluntarily.
 *
 * Each returned record has position="Yes" because cosponsoring = explicit support.
 *
 * @param {string} memberId
 * @param {number} pages - unused (kept for API compatibility); we fetch up to 60
 */
export async function fetchMemberVotes(memberId, pages = 3) {
  try {
    const limit = Math.min(pages * 20, 60);
    const url = `${BASE}/member/${memberId}/cosponsored-legislation?format=json&limit=${limit}`;
    const res = await fetch(url, { headers: headers() });

    if (!res.ok) return [];

    const data = await res.json();
    const bills = data.cosponsoredLegislation ?? [];

    return bills.map((b) => ({
      bill_id:       `${b.type ?? ""}${b.number ?? ""}-${b.congress ?? CONGRESS}`,
      bill_title:    b.title ?? "",
      // Pass policyArea.name as the first subject — policy_categories.js
      // will pick it up via SUBJECT_TO_CATEGORY (which now includes all
      // Congress.gov policy area names).
      bill_subjects: b.policyArea?.name ? [b.policyArea.name] : [],
      position:      "Yes", // cosponsoring = explicit support
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sponsored bills
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch bills a member personally introduced (sponsored).
 *
 * This is the strongest signal — they wrote the bill themselves.
 *
 * @param {string} memberId
 * @param {number} limit
 */
export async function fetchMemberSponsoredBills(memberId, limit = 20) {
  try {
    const url = `${BASE}/member/${memberId}/sponsored-legislation?format=json&limit=${limit}`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return [];

    const data = await res.json();
    const bills = data.sponsoredLegislation ?? [];

    return bills.map((b) => ({
      title:    b.title ?? "",
      subjects: b.policyArea?.name ? [b.policyArea.name] : [],
    }));
  } catch {
    return [];
  }
}
