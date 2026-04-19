import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const MOCK_OFFICIALS = [
  { name: "Jane Smith", party: "D", score: 87, rationale: "Strong alignment on climate and healthcare. Minor gap on immigration." },
  { name: "Bob Lee", party: "R", score: 61, rationale: "Aligned on economy but diverges on healthcare and climate." },
  { name: "Maria Chen", party: "D", score: 74, rationale: "Close match on housing and labor. Some divergence on criminal justice." },
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
  { category: "CriminalJustice", note: "Limited voting history available for comparison" },
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
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div
        className="bg-primary h-2 rounded-full transition-all"
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

function PartyBadge({ party }) {
  return (
    <Badge variant={party === 'D' ? 'default' : 'secondary'}>{party}</Badge>
  )
}

function VoteChip({ vote }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
      vote === 'Yes'
        ? 'bg-green-100 text-green-800'
        : 'bg-red-100 text-red-800'
    }`}>
      {vote}
    </span>
  )
}

function BillCard({ bill }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{bill.name}</span>
            <Badge variant="outline">{bill.category}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{bill.summary}</p>
        </div>
        <span className="text-sm font-semibold shrink-0">{bill.match}%</span>
      </div>

      <ScoreBar score={bill.match} />

      <div className="flex items-center gap-3">
        <a
          href={bill.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline underline-offset-2"
        >
          Read full bill
        </a>
        <button
          className="text-xs text-muted-foreground underline underline-offset-2"
          onClick={() => setExpanded(p => !p)}
        >
          {expanded ? 'Hide votes' : 'See legislator votes'}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 pl-2 border-l border-border">
          {bill.votes.map((v, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>{v.name}</span>
                <PartyBadge party={v.party} />
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

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{poll.question}</p>

      {!submitted ? (
        <>
          {poll.type === 'yesno' && (
            <div className="flex gap-2">
              {['Yes', 'No'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setAnswer(opt)}
                  className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                    answer === opt
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {poll.type === 'agree' && (
            <div className="flex gap-2 flex-wrap">
              {['Agree', 'Neutral', 'Disagree'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setAnswer(opt)}
                  className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                    answer === opt
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {poll.type === 'rank' && (
            <div className="flex flex-col gap-1">
              {ranking.map((item, i) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-4">{i + 1}.</span>
                  <span className="flex-1 bg-muted rounded px-3 py-1">{item}</span>
                  <div className="flex gap-1">
                    <button onClick={() => moveItem(i, -1)} className="text-muted-foreground hover:text-foreground px-1">↑</button>
                    <button onClick={() => moveItem(i, 1)} className="text-muted-foreground hover:text-foreground px-1">↓</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleSubmit}
            disabled={poll.type !== 'rank' && !answer}
            className="self-start"
          >
            Submit
          </Button>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {poll.type === 'rank' ? (
            <p className="text-sm text-muted-foreground">
              Your ranking: {ranking.join(' → ')}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">You voted: <span className="font-medium text-foreground">{answer}</span></p>
              <div className="flex flex-col gap-1">
                {Object.entries(poll.results).map(([opt, pct]) => (
                  <div key={opt} className="flex items-center gap-2 text-sm">
                    <span className="w-20 text-muted-foreground">{opt}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-muted-foreground w-8 text-right">{pct}%</span>
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

  useEffect(() => {
    const rawWeights = sessionStorage.getItem('extractedWeights')
    const state = sessionStorage.getItem('state') || 'CA'
    if (!rawWeights) return
    fetch(`${API}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights: JSON.parse(rawWeights), state, chamber: 'all' }),
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setOfficials(data) })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen px-4 py-12 flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col gap-8">

        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Your alignment results</h2>
          <p className="text-muted-foreground mt-1">Based on your stated priorities — not an endorsement</p>
        </div>

        {/* Top officials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top aligned officials</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {officials.map((official, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{official.name}</span>
                    <PartyBadge party={official.party} />
                  </div>
                  <span className="text-sm font-semibold">{official.score}%</span>
                </div>
                <ScoreBar score={official.score} />
                <p className="text-sm text-muted-foreground">{official.rationale}</p>
                {i < officials.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bills + polls interleaved */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Matching bills & polls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {MOCK_BILLS.map((bill, i) => (
              <div key={bill.id} className="flex flex-col gap-6">
                <BillCard bill={bill} />
                {MOCK_POLLS[i] && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Community poll</p>
                    <PollCard poll={MOCK_POLLS[i]} />
                  </div>
                )}
                {i < MOCK_BILLS.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weak match alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where alignment breaks down</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {MOCK_GAPS.map((gap, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-sm font-medium">{gap.category}</span>
                <p className="text-sm text-muted-foreground">{gap.note}</p>
                {i < MOCK_GAPS.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          "Here's who aligns with your stated priorities" — not "Vote for X"
        </p>

        <Button variant="outline" className="cursor-pointer" onClick={() => navigate('/')}>
          Start over
        </Button>

      </div>
    </div>
  )
}