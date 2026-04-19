/**
 * STEP 1 — Policy categories.
 *
 * Maps ProPublica subject tags → one of our 4 locked categories.
 * Also does keyword fallback on bill titles when subjects are missing.
 *
 * Four categories (locked with scoring team):
 *   Climate, Healthcare, Economy, CriminalJustice
 */

export const CATEGORIES = ["Climate", "Healthcare", "Economy", "CriminalJustice"];

// ProPublica API returns bills tagged with subject strings.
// We map those strings to our 4 categories.
export const SUBJECT_TO_CATEGORY = {
  // ── Climate ──────────────────────────────────────────────────────────────
  // Congress.gov policy area names (exact strings from the API)
  "Environmental Protection":              "Climate",
  "Energy":                                "Climate",
  "Public Lands and Natural Resources":    "Climate",
  "Water Resources Development":           "Climate",
  "Animals":                               "Climate",
  "Science, Technology, Communications":   "Climate",
  // ProPublica / legacy subject strings
  "Environmental protection":              "Climate",
  "Climate change and greenhouse gases":   "Climate",
  "Renewable energy sources":              "Climate",
  "Air quality":                           "Climate",
  "Energy efficiency and conservation":    "Climate",
  "Water quality":                         "Climate",
  "Wildlife conservation and habitat protection": "Climate",
  "Pollution":                             "Climate",
  "Alternative and renewable resources":   "Climate",
  "Oil and gas":                           "Climate",
  "Coal":                                  "Climate",
  "Nuclear power":                         "Climate",
  "Carbon taxes":                          "Climate",
  "Forests, forestry, trees":             "Climate",
  "Oceans, seas, coral reefs, lakes":     "Climate",

  // ── Healthcare ────────────────────────────────────────────────────────────
  // Congress.gov
  "Health":                                "Healthcare",
  "Families":                              "Healthcare",
  // ProPublica / legacy
  "Health care coverage and access":       "Healthcare",
  "Medicare":                              "Healthcare",
  "Medicaid":                              "Healthcare",
  "Prescription drugs":                    "Healthcare",
  "Mental health":                         "Healthcare",
  "Drug, alcohol, tobacco use":            "Healthcare",
  "Health promotion and preventive care":  "Healthcare",
  "Medical research":                      "Healthcare",
  "Abortion":                              "Healthcare",
  "Reproductive health":                   "Healthcare",
  "Child health":                          "Healthcare",
  "Women's health":                        "Healthcare",
  "Health facilities and institutions":    "Healthcare",
  "Disability and paralysis":              "Healthcare",

  // ── Economy ───────────────────────────────────────────────────────────────
  // Congress.gov
  "Economics and Public Finance":          "Economy",
  "Taxation":                              "Economy",
  "Labor and Employment":                  "Economy",
  "Commerce":                              "Economy",
  "Finance and Financial Sector":          "Economy",
  "International Trade and Finance":       "Economy",
  "Housing and Community Development":     "Economy",
  "Social Welfare":                        "Economy",
  // ProPublica / legacy
  "Budget, appropriations, and fiscal policy": "Economy",
  "Trade policy":                          "Economy",
  "Tariffs":                               "Economy",
  "Economic performance and conditions":   "Economy",
  "Unemployment":                          "Economy",
  "Inflation and prices":                  "Economy",
  "Income inequality":                     "Economy",
  "Wages and earnings":                    "Economy",
  "Small business":                        "Economy",
  "Corporate finance and management":      "Economy",
  "Poverty and welfare assistance":        "Economy",
  "Labor and employment":                  "Economy",
  "Student loans and debt":                "Economy",
  "Housing finance and home ownership":    "Economy",

  // ── CriminalJustice ───────────────────────────────────────────────────────
  // Congress.gov
  "Crime and Law Enforcement":             "CriminalJustice",
  "Civil Liberties, Civil Rights, Minorities": "CriminalJustice",
  "Immigration":                           "CriminalJustice",
  "Law":                                   "CriminalJustice",
  // ProPublica / legacy
  "Crime and law enforcement":             "CriminalJustice",
  "Criminal procedure and sentencing":     "CriminalJustice",
  "Detention of persons":                  "CriminalJustice",
  "Firearms and explosives":               "CriminalJustice",
  "Prisons":                               "CriminalJustice",
  "Racial and ethnic relations":           "CriminalJustice",
  "Law enforcement administration and funding": "CriminalJustice",
  "Drug trafficking and controlled substances": "CriminalJustice",
  "Juvenile crime and gang activity":      "CriminalJustice",
  "Police and law enforcement":            "CriminalJustice",
};

// Title-keyword signals to determine if a bill is progressive-leaning (pro)
// or regressive-leaning (con) within each category.
// "pro" → supports stronger/more progressive policy (score → 1.0)
// "con" → opposes or weakens progressive policy (score → 0.0)
const DIRECTION_SIGNALS = {
  Climate: {
    pro: [
      "clean energy", "climate action", "climate protection", "reduce emission",
      "renewable", "solar", "wind energy", "greenhouse gas reduction",
      "environmental protection", "conservation act", "clean air", "clean water",
      "carbon fee", "carbon tax", "green new", "sustainability",
    ],
    con: [
      "fossil fuel", "oil drilling", "pipeline approval", "coal production",
      "deregulat", "withdraw from paris", "offshore drilling", "fracking",
      "reduce environmental", "weaken clean air",
    ],
  },
  Healthcare: {
    pro: [
      "expand medicaid", "expand medicare", "universal health", "affordable care",
      "protect pre-existing", "prescription drug price", "lower drug cost",
      "mental health access", "reproductive health", "women's health protection",
      "health care for all", "public option", "health access",
    ],
    con: [
      "repeal aca", "repeal affordable", "defund planned", "cut medicaid",
      "cut medicare", "restrict abortion", "ban abortion", "eliminate coverage",
      "block grant medicaid", "reduce health spending",
    ],
  },
  Economy: {
    pro: [
      "wealth tax", "corporate tax increase", "minimum wage", "raise wage",
      "living wage", "income inequality", "poverty relief", "student debt relief",
      "worker protection", "paid family leave", "worker benefit", "fair tax",
      "tax the wealthy", "infrastructure investment",
    ],
    con: [
      "tax cut", "tax relief for", "deregulat", "reduce regulation",
      "repeal estate tax", "cut corporate tax", "reduce capital gains",
      "eliminate minimum wage", "right to work",
    ],
  },
  CriminalJustice: {
    pro: [
      "police reform", "police accountability", "sentencing reform",
      "prison reform", "decriminalize", "expunge", "end mandatory minimum",
      "ban assault weapon", "gun safety", "background check", "reduce incarceration",
      "end mass incarceration", "civil rights restoration", "body camera",
    ],
    con: [
      "mandatory minimum", "increase sentence", "three strikes", "no bail reform",
      "expand deportation", "defund reform", "back the blue act",
      "protect gun rights", "concealed carry expansion", "stand your ground",
    ],
  },
};

/**
 * Categorize a bill and determine its progressive direction.
 *
 * @param {string[]} subjects  - ProPublica subject tags for the bill
 * @param {string}   title     - Bill title
 * @returns {{ category: string, direction: "pro"|"con" } | null}
 */
export function categorizeBill(subjects = [], title = "") {
  const t = title.toLowerCase();

  // 1. Subject tags are the most reliable signal
  let category = null;
  for (const subject of subjects) {
    if (SUBJECT_TO_CATEGORY[subject]) {
      category = SUBJECT_TO_CATEGORY[subject];
      break;
    }
  }

  // 2. Fallback: scan the bill title for category keywords
  if (!category) {
    const titleMap = [
      [["climate", "emission", "greenhouse", "solar", "wind", "renewable", "environmental", "clean energy", "fossil"], "Climate"],
      [["health", "medicare", "medicaid", "insurance", "prescription", "abortion", "reproductive", "opioid"], "Healthcare"],
      [["tax", "budget", "trade", "tariff", "wage", "economy", "fiscal", "debt", "deficit", "spending", "labor"], "Economy"],
      [["crime", "criminal", "police", "prison", "gun", "firearm", "sentencing", "detention", "justice", "drug trafficking"], "CriminalJustice"],
    ];
    for (const [keywords, cat] of titleMap) {
      if (keywords.some((k) => t.includes(k))) {
        category = cat;
        break;
      }
    }
  }

  if (!category) return null;

  // 3. Determine direction from title keywords
  const signals = DIRECTION_SIGNALS[category];
  if (signals.pro.some((k) => t.includes(k))) return { category, direction: "pro" };
  if (signals.con.some((k) => t.includes(k))) return { category, direction: "con" };

  // 4. If direction is ambiguous, lean "pro" — most bills are named for their
  //    positive intent. This is the safest neutral default.
  return { category, direction: "pro" };
}
