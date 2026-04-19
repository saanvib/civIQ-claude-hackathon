/**
 * Seed script — fetches bills from Congress.gov and caches them in Supabase.
 *
 * Pulls from BOTH Congress 118 (fully catalogued, rich policy areas) and
 * Congress 119 (current, but fewer policy tags). This gives us a full,
 * well-categorized bill corpus.
 *
 * Usage:
 *   npm run seed:bills
 *
 * ─── Supabase table (run this SQL first) ────────────────────────────────────
 *
 *   create table if not exists bills (
 *     bill_id         text primary key,
 *     title           text,
 *     category        text,
 *     direction       text,
 *     congress        int,
 *     bill_type       text,
 *     bill_number     text,
 *     introduced_date text,
 *     latest_action   text,
 *     policy_area     text,
 *     congress_url    text,
 *     updated_at      timestamptz default now()
 *   );
 *
 *   alter table bills disable row level security;
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dotenv from "dotenv";
dotenv.config();

import { categorizeBill } from "./policy_categories.js";
import { getSupabase } from "./supabase_client.js";

const BASE = "https://api.congress.gov/v3";

function headers() {
  const key = process.env.CONGRESS_API_KEY;
  if (!key) throw new Error("CONGRESS_API_KEY not set in .env");
  return { "X-API-Key": key, "Accept": "application/json" };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Fetch one page of bills
// ─────────────────────────────────────────────────────────────────────────────
async function fetchBillsPage(congress, offset = 0, limit = 20) {
  const url = `${BASE}/bill/${congress}?format=json&limit=${limit}&offset=${offset}&sort=updateDate+desc`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bills fetch failed for congress ${congress} (${res.status}): ${body}`);
  }
  const data = await res.json();
  return {
    bills:   data.bills ?? [],
    hasNext: !!data.pagination?.next,
  };
}

function billUrl(type, number, congress) {
  const chamber = type.toUpperCase() === "S" ? "senate" : "house";
  return `https://www.congress.gov/bill/${congress}th-congress/${chamber}-bill/${number}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed bills from one congress
// ─────────────────────────────────────────────────────────────────────────────
async function seedFromCongress(sb, congress, maxPages, counts) {
  let saved = 0;
  let skipped = 0;

  for (let page = 0; page < maxPages; page++) {
    const { bills, hasNext } = await fetchBillsPage(congress, page * 20, 20);
    if (bills.length === 0) break;

    for (const bill of bills) {
      const policyArea = bill.policyArea?.name ?? "";
      const title      = bill.title ?? "";

      const result = categorizeBill([policyArea], title);
      if (!result) { skipped++; continue; }

      const { category, direction } = result;
      const billId = `${bill.type}${bill.number}-${bill.congress}`;

      const { error } = await sb.from("bills").upsert(
        {
          bill_id:         billId,
          title,
          category,
          direction,
          congress:        bill.congress,
          bill_type:       bill.type,
          bill_number:     String(bill.number),
          introduced_date: bill.introducedDate ?? null,
          latest_action:   bill.latestAction?.text ?? null,
          policy_area:     policyArea,
          congress_url:    billUrl(bill.type, bill.number, bill.congress),
          updated_at:      new Date().toISOString(),
        },
        { onConflict: "bill_id" }
      );

      if (!error) {
        counts[category] = (counts[category] ?? 0) + 1;
        saved++;
      }
    }

    process.stdout.write(
      `\r  Congress ${congress} page ${page + 1}/${maxPages}: ${saved} bills  [Cli:${counts.Climate ?? 0} Health:${counts.Healthcare ?? 0} Econ:${counts.Economy ?? 0} CJ:${counts.CriminalJustice ?? 0}]   `
    );

    if (!hasNext) break;
    await sleep(150);
  }

  console.log(); // newline after progress
  return saved;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function seedBills() {
  const sb = getSupabase();
  const counts = { Climate: 0, Healthcare: 0, Economy: 0, CriminalJustice: 0 };

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║    Seeding bills (Congress 118 + 119)        ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // Congress 118 is fully catalogued with policy areas — great coverage
  console.log("📚 Congress 118 (fully catalogued)...");
  const saved118 = await seedFromCongress(sb, 118, 25, counts);

  // Congress 119 is current — fewer policy tags but the most recent bills
  console.log("📰 Congress 119 (current session)...");
  const saved119 = await seedFromCongress(sb, 119, 15, counts);

  console.log(`\n${"─".repeat(55)}`);
  console.log(`✅ Done!  ${saved118 + saved119} bills total`);
  console.log(`📊 By category: Climate=${counts.Climate} Healthcare=${counts.Healthcare} Economy=${counts.Economy} CriminalJustice=${counts.CriminalJustice}`);
  console.log(`📋 Check Supabase → Table Editor → bills\n`);
}

seedBills().catch((err) => {
  console.error("\n💥 Bill seed failed:", err.message);
  process.exit(1);
});
