/**
 * STEP 5 — Seed script.
 *
 * Run this ONCE (and any time you want fresh data) to:
 *   1. Pull current Congress members from Congress.gov API
 *   2. Fetch each member's votes + sponsored bills
 *   3. Build their 4-category vote vector
 *   4. Cache everything in Supabase → "legislator_votes" table
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *   npm run seed:senate        # seeds 20 senators
 *   npm run seed:house         # seeds 20 House members
 *   node seed_legislators.js senate 40   # custom count
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ─── Supabase table (run this SQL in your Supabase dashboard first) ──────────
 *
 *   create table if not exists legislator_votes (
 *     legislator_id  text primary key,
 *     name           text not null,
 *     party          text,
 *     state          text,
 *     chamber        text,
 *     vote_vector    jsonb,          -- { Climate, Healthcare, Economy, CriminalJustice }
 *     raw_votes      jsonb,          -- debug metadata
 *     updated_at     timestamptz default now()
 *   );
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dotenv from "dotenv";
dotenv.config();

import { fetchCurrentMembers, fetchMemberVotes, fetchMemberSponsoredBills } from "./congress_api.js";
import { buildVoteVector } from "./vector_builder.js";
import { getSupabase } from "./supabase_client.js";

const DELAY_BETWEEN_MEMBERS_MS = 600; // ~1.6 members/sec — well under rate limit

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Process one member
// ─────────────────────────────────────────────────────────────────────────────

async function processMember(member) {
  console.log(`  → ${member.name} (${member.party}, ${member.state})`);

  // Fetch votes and sponsored bills in parallel to save time
  const [votes, bills] = await Promise.all([
    fetchMemberVotes(member.legislator_id, 3),     // 3 pages × 20 = up to 60 votes
    fetchMemberSponsoredBills(member.legislator_id, 20),
  ]);

  const { vector, evidence } = buildVoteVector(member.party, votes, bills);

  // Log what we found so you can see it working
  const covered = Object.entries(evidence)
    .filter(([, count]) => count > 0)
    .map(([cat, count]) => `${cat}:${count}`)
    .join(" ");
  console.log(`     Vector: Climate=${vector.Climate} Healthcare=${vector.Healthcare} Economy=${vector.Economy} CJ=${vector.CriminalJustice}`);
  console.log(`     Evidence: ${covered || "none (using party prior)"}`);

  // Upsert to Supabase (insert or update if already exists)
  const sb = getSupabase();
  const { error } = await sb.from("legislator_votes").upsert(
    {
      legislator_id: member.legislator_id,
      name:          member.name,
      party:         member.party,
      state:         member.state,
      chamber:       member.chamber,
      vote_vector:   vector,
      raw_votes: {
        votes_analyzed: votes.length,
        bills_analyzed: bills.length,
        evidence_per_category: evidence,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "legislator_id" }
  );

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  return vector;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main seeder
// ─────────────────────────────────────────────────────────────────────────────

async function seedLegislators(chamber = "senate", limit = 20) {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Seeding ${String(limit).padEnd(3)} ${chamber.padEnd(6)} members into Supabase  ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // 1. Fetch full member list from Congress.gov
  console.log("Fetching member list from Congress.gov...");
  const allMembers = await fetchCurrentMembers(chamber);
  const members = allMembers.slice(0, limit);
  console.log(`Got ${allMembers.length} members. Processing first ${members.length}.\n`);

  let succeeded = 0;
  let failed = 0;

  // 2. Process each member one at a time (rate limit safety)
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    console.log(`[${i + 1}/${members.length}]`);
    try {
      await processMember(member);
      succeeded++;
    } catch (err) {
      console.error(`     ✗ ERROR: ${err.message}`);
      failed++;
    }
    if (i < members.length - 1) await sleep(DELAY_BETWEEN_MEMBERS_MS);
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ Done!  ${succeeded} seeded, ${failed} errors.`);
  console.log(`📊 Check Supabase → Table Editor → legislator_votes\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry point:  node seed_legislators.js [chamber] [limit]
// ─────────────────────────────────────────────────────────────────────────────
const [, , chamber = "senate", limitStr = "20"] = process.argv;
const limit = parseInt(limitStr, 10);

if (!["senate", "house"].includes(chamber)) {
  console.error('Usage: node seed_legislators.js [senate|house] [limit]');
  process.exit(1);
}

seedLegislators(chamber, limit).catch((err) => {
  console.error("\n💥 Seed failed:", err.message);
  process.exit(1);
});
