import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ChevronRight, AlertTriangle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const CATEGORIES = ['Climate', 'Healthcare', 'Economy', 'CriminalJustice']
const CARE_THRESHOLD = 50

function computeMatch(bill, weights) {
  const w = weights[bill.category] ?? 50
  return bill.direction === 'pro' ? Math.round(w) : Math.round(100 - w)
}

const MOCK_OFFICIALS = [
  { name: "Jane Smith", party: "D", score: 87, rationale: "Strong alignment on climate and healthcare. Minor gap on immigration." },
  { name: "Maria Chen", party: "D", score: 74, rationale: "Close match on housing and labor. Some divergence on criminal justice." },
  { name: "Bob Lee", party: "R", score: 61, rationale: "Aligned on economy but diverges on healthcare and climate." },
]

const MOCK_BILLS = [
  {
    id: 1,
    name: "Clean Energy Act 2024",
    summary: "Mandates 50% renewable energy by 2035 and provides tax credits for electric vehicles and home solar installations.",
    match: 92,
    category: "Climate",
    url: "https://congress.gov",
    votes: [
      { name: "Jane Smith", party: "D", vote: "Yes" },
      { name: "Bob Lee", party: "R", vote: "No" },
      { name: "Maria Chen", party: "D", vote: "Yes" },
    ]
  },
  {
    id: 2,
    name: "Medicare Expansion Bill",
    summary: "Extends Medicare eligibility to age 60 and adds dental and vision coverage for all current recipients.",
    match: 88,
    category: "Healthcare",
    url: "https://congress.gov",
    votes: [
      { name: "Jane Smith", party: "D", vote: "Yes" },
      { name: "Bob Lee", party: "R", vote: "No" },
      { name: "Maria Chen", party: "D", vote: "Yes" },
    ]
  },
  {
    id: 3,
    name: "Affordable Housing Fund",
    summary: "Allocates $50B to build 1 million affordable housing units over 10 years in high cost-of-living areas.",
    match: 76,
    category: "Housing",
    url: "https://congress.gov",
    votes: [
      { name: "Jane Smith", party: "D", vote: "Yes" },
      { name: "Bob Lee", party: "R", vote: "Yes" },
      { name: "Maria Chen", party: "D", vote: "No" },
    ]
  },
]

const MOCK_GAPS = [
  { category: "Immigration", note: "Your top matches diverge significantly on this issue" },
  { category: "Criminal Justice", note: "Limited voting history available for comparison" },
]

const MOCK_POLLS = [
  {
    id: 1,
    type: "yesno",
    question: "Do you support the Clean Energy Act 2024?",
    results: { Yes: 63, No: 37 },
  },
  {
    id: 2,
    type: "agree",
    question: "The federal government should prioritize job creation over environmental regulations when they conflict.",
    results: { Agree: 44, Neutral: 21, Disagree: 35 },
  },
  {
    id: 3,
    type: "rank",
    question: "Rank your top 3 issues in order of priority.",
    options: ["Climate", "Healthcare", "Housing", "Economy", "Education"],
  },
]

function ScoreBar({ score }) {
  const color = score >= 75 ? '#1a2744' : score >= 55 ? '#4a6fa5' : '#9b2335'
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div
        className="h-1.5 rounded-full transition-all"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  )
}

function PartyPill({ party }) {
  const isD = party === 'D'
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: isD ? '#1a274415' : '#9b233515',
        color: isD ? '#1a2744' : '#9b2335',
      }}
    >
      {isD ? 'Dem' : party === 'R' ? 'Rep' : party}
    </span>
  )
}

function VoteChip({ vote }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
      vote === 'Yes' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
    }`}>
      {vote}
    </span>
  )
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">{title}</h2>
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function BillCard({ bill }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#1a2744]">{bill.name}</span>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">{bill.category}</span>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{bill.summary}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-lg font-bold text-[#1a2744]">{bill.match}%</span>
          <p className="text-xs text-gray-400">match</p>
        </div>
      </div>

      <ScoreBar score={bill.match} />

      <div className="flex items-center gap-4 pt-1">
        <a
          href={bill.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-[#1a2744] underline underline-offset-2 hover:opacity-70"
        >
          Read full bill
        </a>
        <button
          className="text-xs font-medium text-gray-400 hover:text-gray-600 underline underline-offset-2"
          onClick={() => setExpanded(p => !p)}
        >
          {expanded ? 'Hide votes' : 'See legislator votes'}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 mt-1 pl-3 border-l-2 border-gray-100">
          {bill.votes.map((v, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-[#1a2744] font-medium">{v.name}</span>
                <PartyPill party={v.party} />
              </div>
              <VoteChip vote={v.vote} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PollCard({ poll }) {
  const [answer, setAnswer] = useState(null)
  const [ranking, setRanking] = useState(poll.options || [])
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (poll.type === 'rank' || answer) setSubmitted(true)
  }

  function moveItem(index, direction) {
    const newRanking = [...ranking]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newRanking.length) return
    ;[newRanking[index], newRanking[swapIndex]] = [newRanking[swapIndex], newRanking[index]]
    setRanking(newRanking)
  }

  const optionClasses = (opt) =>
    `px-4 py-1.5 rounded-full text-sm border-2 font-medium transition-colors ${
      answer === opt
        ? 'bg-[#1a2744] text-white border-[#1a2744]'
        : 'border-gray-200 text-[#1a2744] hover:border-[#1a2744]/40'
    }`

  return (
    <div className="flex flex-col gap-3 bg-gray-50 rounded-xl p-4 mx-5 mb-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Community poll</p>
      <p className="text-sm font-medium text-[#1a2744] leading-snug">{poll.question}</p>

      {!submitted ? (
        <>
          {poll.type === 'yesno' && (
            <div className="flex gap-2">
              {['Yes', 'No'].map(opt => (
                <button key={opt} onClick={() => setAnswer(opt)} className={optionClasses(opt)}>{opt}</button>
              ))}
            </div>
          )}

          {poll.type === 'agree' && (
            <div className="flex gap-2 flex-wrap">
              {['Agree', 'Neutral', 'Disagree'].map(opt => (
                <button key={opt} onClick={() => setAnswer(opt)} className={optionClasses(opt)}>{opt}</button>
              ))}
            </div>
          )}

          {poll.type === 'rank' && (
            <div className="flex flex-col gap-1.5">
              {ranking.map((item, i) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 w-4 font-medium">{i + 1}.</span>
                  <span className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-[#1a2744] font-medium">{item}</span>
                  <div className="flex gap-0.5">
                    <button onClick={() => moveItem(i, -1)} className="text-gray-400 hover:text-[#1a2744] px-1.5 py-0.5 rounded">↑</button>
                    <button onClick={() => moveItem(i, 1)} className="text-gray-400 hover:text-[#1a2744] px-1.5 py-0.5 rounded">↓</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={poll.type !== 'rank' && !answer}
            className="self-start text-xs font-semibold px-4 py-1.5 rounded-full bg-[#1a2744] text-white hover:bg-[#243460] disabled:opacity-30 transition-colors"
          >
            Submit
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {poll.type === 'rank' ? (
            <p className="text-sm text-gray-500">Your ranking: <span className="font-medium text-[#1a2744]">{ranking.join(' → ')}</span></p>
          ) : (
            <>
              <p className="text-sm text-gray-500">You voted: <span className="font-semibold text-[#1a2744]">{answer}</span></p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(poll.results).map(([opt, pct]) => (
                  <div key={opt} className="flex items-center gap-2 text-sm">
                    <span className="w-20 text-gray-500">{opt}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-[#1a2744] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-gray-400 w-8 text-right text-xs">{pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function Results() {
  const navigate = useNavigate()
  const [officials, setOfficials] = useState(MOCK_OFFICIALS)
  const [bills, setBills] = useState([])
  const [gaps, setGaps] = useState(MOCK_GAPS)

  useEffect(() => {
    const rawWeights = sessionStorage.getItem('extractedWeights')
    const state = sessionStorage.getItem('state') || 'CA'
    if (!rawWeights) return
    const weights = JSON.parse(rawWeights)

    fetch(`${API}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights, state, chamber: 'all' }),
    })
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) return
        setOfficials(data)
        // Compute gaps: categories user cares about (≥70) where top officials are weak (<50 avg)
        const computed = CATEGORIES.filter(cat => {
          const userWeight = weights[cat] ?? 50
          if (userWeight < 70) return false
          const avg = data.reduce((sum, o) => sum + ((o.vote_vector?.[cat] ?? 0.5) * 100), 0) / data.length
          return avg < 50
        }).map(cat => ({ category: cat, note: `Your top matches diverge on ${cat.toLowerCase()} policy` }))
        if (computed.length > 0) setGaps(computed)
      })
      .catch(() => {})

    const topCategories = CATEGORIES.filter(c => (weights[c] ?? 50) >= CARE_THRESHOLD)
    const cats = topCategories.length > 0 ? topCategories : CATEGORIES
    Promise.all(
      cats.map(cat =>
        fetch(`${API}/api/bills?category=${cat}&limit=5`)
          .then(r => r.json())
          .then(data => data.bills ?? [])
          .catch(() => [])
      )
    ).then(results => {
      const scored = results
        .flat()
        .map(bill => ({
          ...bill,
          match: computeMatch(bill, weights),
          name: bill.title,
          summary: bill.latest_action || 'No summary available.',
          url: bill.congress_url || 'https://congress.gov',
          votes: [],
        }))
        .sort((a, b) => b.match - a.match)
        .slice(0, 6)
      if (scored.length > 0) setBills(scored)
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <span
          className="text-[#1a2744] font-semibold font-serif text-lg tracking-tight cursor-pointer"
          onClick={() => navigate('/')}
        >
          CivIQ
        </span>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center px-6 pt-12 pb-24">
        <div className="w-full max-w-2xl flex flex-col gap-10">

          {/* Heading */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1a2744] leading-[1.1] mb-3">
              Your alignment results
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed">
              Based on your stated priorities — not an endorsement.
            </p>
          </div>

          {/* Top officials */}
          <Section title="Top aligned officials">
            {officials.map((official, i) => (
              <div key={i}>
                <div className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1a2744]">{official.name}</span>
                      <PartyPill party={official.party} />
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-[#1a2744]">{official.score}%</span>
                      <p className="text-xs text-gray-400">match</p>
                    </div>
                  </div>
                  <ScoreBar score={official.score} />
                  <p className="text-sm text-gray-500 leading-relaxed">{official.rationale}</p>
                </div>
                {i < officials.length - 1 && <div className="border-t border-gray-100" />}
              </div>
            ))}
          </Section>

          {/* Bills + polls interleaved */}
          <Section title="Matching bills & polls">
            {bills.length === 0 && (
              <p className="p-5 text-sm text-gray-400">Loading bills…</p>
            )}
            {bills.map((bill, i) => (
              <div key={bill.bill_id ?? bill.id}>
                <BillCard bill={bill} />
                {MOCK_POLLS[i] && <PollCard poll={MOCK_POLLS[i]} />}
                {i < bills.length - 1 && <div className="border-t border-gray-100" />}
              </div>
            ))}
          </Section>

          {/* Weak match alerts */}
          <Section title="Where alignment breaks down">
            {gaps.map((gap, i) => (
              <div key={i}>
                <div className="flex items-start gap-3 p-5">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: '#9b2335' }} />
                  <div>
                    <span className="font-semibold text-[#1a2744] text-sm">{gap.category}</span>
                    <p className="text-sm text-gray-500 mt-0.5">{gap.note}</p>
                  </div>
                </div>
                {i < gaps.length - 1 && <div className="border-t border-gray-100" />}
              </div>
            ))}
          </Section>

          <p className="text-xs text-gray-400 text-center">
            "Here's who aligns with your stated priorities" — not "Vote for X"
          </p>

          <Button
            size="lg"
            className="gap-2 px-7 py-6 text-base font-semibold bg-[#1a2744] hover:bg-[#243460] text-white shadow-md cursor-pointer rounded-xl self-stretch sm:self-start"
            onClick={() => navigate('/')}
          >
            Start over
            <ChevronRight size={16} className="ml-1 opacity-60" />
          </Button>
        </div>
      </main>

      <footer className="text-center font-serif py-6 text-xs text-gray-400 border-t border-gray-100">
        CivIQ
      </footer>
    </div>
  )
}
