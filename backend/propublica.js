/**
 * STEP 2 — ProPublica Congress API client.
 *
 * Free API key → https://www.propublica.org/datastore/api/propublica-congress-api
 * Full docs    → https://projects.propublica.org/api-docs/congress-api/
 *
 * Three functions the rest of the data layer needs:
 *   fetchCurrentMembers(chamber)         → list of legislators
 *   fetchMemberVotes(memberId)           → how they voted on each bill
 *   fetchMemberSponsoredBills(memberId)  → bills they personally introduced
 */

const BASE = "https://api.propublica.org/congress/v1";
const CONGRESS = "119"; // 119th Congress started January 2025

function headers() {
  const key = process.env.PROPUBLICA_API_KEY;
  if (!key) throw new Error("PROPUBLICA_API_KEY is not set in your .env file");
  return { "X-API-Key": key };
}

// ProPublica free tier allows ~5 requests/second — be polite
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// 1. Member list
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch current members of Congress.
 *
 * @param {"senate"|"house"} chamber
 * @returns {Promise<Array<{
 *   legislator_id: string,
 *   name: string,
 *   party: string,
 *   state: string,
 *   chamber: string,
 *   in_office: boolean,
 * }>>}
 */
export async function fetchCurrentMembers(chamber = "senate") {
  const url = `${BASE}/${CONGRESS}/${chamber}/members.json`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ProPublica members fetch failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const members = data.results?.[0]?.members ?? [];

  return members
    .filter((m) => m.in_office !== false)
    .map((m) => ({
      legislator_id: m.id,
      name: `${m.first_name} ${m.last_name}`.trim(),
      party: expandParty(m.party),
      state: m.state,
      chamber,
      in_office: m.in_office ?? true,
    }));
}

function expandParty(code) {
  if (code === "D") return "Democrat";
  if (code === "R") return "Republican";
  return "Independent";
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Member vote history
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a member's recent roll-call votes.
 *
 * ProPublica paginates in groups of 20. We fetch `pages` pages.
 * Each vote tells us: what bill, and how the member voted (Yes/No/Not Voting).
 *
 * @param {string} memberId  - ProPublica bioguide ID (e.g. "S000148")
 * @param {number} pages     - how many pages of votes to fetch (1 page = 20 votes)
 * @returns {Promise<Array<{
 *   bill_id: string,
 *   bill_title: string,
 *   bill_subjects: string[],
 *   position: "Yes"|"No"|"Not Voting"|"Present",
 * }>>}
 */
export async function fetchMemberVotes(memberId, pages = 3) {
  const allVotes = [];

  for (let page = 0; page < pages; page++) {
    try {
      const url = `${BASE}/members/${memberId}/votes.json?offset=${page * 20}`;
      const res = await fetch(url, { headers: headers() });

      if (!res.ok) break; // member may have no vote history yet

      const data = await res.json();
      const pageVotes = data.results?.[0]?.votes ?? [];
      if (pageVotes.length === 0) break; // no more pages

      for (const v of pageVotes) {
        allVotes.push({
          bill_id: v.bill?.bill_id ?? "",
          bill_title: v.bill?.title ?? v.description ?? "",
          bill_subjects: v.bill?.subjects ?? [],
          position: v.position ?? "Not Voting",
        });
      }

      await sleep(250); // pace ourselves between pages
    } catch {
      break;
    }
  }

  return allVotes;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sponsored bills
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch bills a member sponsored (introduced themselves).
 *
 * Sponsoring a bill is the clearest signal of a legislator's priorities —
 * they chose to put their name on it.
 *
 * @param {string} memberId
 * @param {number} limit - cap at this many bills
 * @returns {Promise<Array<{ title: string, subjects: string[] }>>}
 */
export async function fetchMemberSponsoredBills(memberId, limit = 20) {
  try {
    const url = `${BASE}/members/${memberId}/bills/sponsored.json`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return [];

    const data = await res.json();
    const bills = data.results?.[0]?.bills ?? [];

    return bills.slice(0, limit).map((b) => ({
      title: b.title ?? "",
      subjects: b.subjects ?? [],
    }));
  } catch {
    return []; // non-fatal — scoring still works with just votes
  }
}
