import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ChevronRight, AlertTriangle, Scale } from 'lucide-react'

const BOTH_SIDES = {
  Climate: {
    label: 'Climate Policy',
    sideA: { title: 'Stronger government action', description: 'Federal emissions targets, clean energy mandates, and carbon pricing.' },
    sideB: { title: 'Market-driven approach', description: 'Private sector innovation and energy independence over government mandates.' },
  },
  Healthcare: {
    label: 'Healthcare',
    sideA: { title: 'Expanded public coverage', description: 'Public option, Medicare expansion, and government drug price controls.' },
    sideB: { title: 'Private market solutions', description: 'Competition and deregulation to lower costs without large government programs.' },
  },
  Economy: {
    label: 'Economic Policy',
    sideA: { title: 'Progressive taxation & investment', description: 'Higher taxes on corporations and the wealthy to fund social programs.' },
    sideB: { title: 'Lower taxes & reduced spending', description: 'Tax cuts and deregulation to stimulate private growth.' },
  },
  CriminalJustice: {
    label: 'Criminal Justice',
    sideA: { title: 'Reform-oriented', description: 'Reduce incarceration, end mandatory minimums, and increase police accountability.' },
    sideB: { title: 'Law & order focus', description: 'Stricter sentencing and strong law enforcement for public safety.' },
  },
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const CATEGORIES = ['Climate', 'Healthcare', 'Economy', 'CriminalJustice']

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
        background: isD ? '#0015BC15' : '#9b233515',
        color: isD ? '#0015BC' : '#9b2335',
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


function ActiveBillCard({ bill }) {
  return (
    <div className="flex flex-col gap-2 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#1a2744]">{bill.title}</span>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">{bill.category}</span>
          </div>
          {bill.latest_action && (
            <p className="text-sm text-gray-500 leading-relaxed">
              <span className="font-medium">Latest action:</span> {bill.latest_action}
              {bill.latest_action_date && <span className="text-gray-400"> · {bill.latest_action_date}</span>}
            </p>
          )}
        </div>
      </div>
      <a
        href={bill.url}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-xs font-semibold px-4 py-1.5 rounded-full bg-[#1a2744] text-white hover:bg-[#243460] transition-colors"
      >
        View &amp; contact your rep →
      </a>
    </div>
  )
}

export default function Results() {
  const navigate = useNavigate()
  const [officials, setOfficials] = useState([])
  const [bills, setBills] = useState([])
  const [gaps, setGaps] = useState([])
  const [activeLegislation, setActiveLegislation] = useState([])
  const [loading, setLoading] = useState(true)
  const neutralCategories = JSON.parse(sessionStorage.getItem('neutralCategories') ?? '[]')

  useEffect(() => {
    const rawWeights = sessionStorage.getItem('extractedWeights')
    const state = sessionStorage.getItem('state') || 'CA'
    if (!rawWeights) { setLoading(false); return }
    const weights = JSON.parse(rawWeights)

    const topCategories = CATEGORIES.filter(c => (weights[c] ?? 50) >= 60)
    const categoryParam = topCategories.length > 0 ? topCategories.join(',') : ''

    const scoreReq = fetch(`${API}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights, state, chamber: 'all' }),
    }).then(r => r.json())

    const billsReq = fetch(`${API}/api/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights, limit: 6 }),
    }).then(r => r.json())

    const activeReq = fetch(`${API}/api/bills/active?limit=6${categoryParam ? `&categories=${categoryParam}` : ''}`)
      .then(r => r.json())

    Promise.allSettled([scoreReq, billsReq, activeReq]).then(([scoreRes, billsRes, activeRes]) => {
      if (scoreRes.status === 'fulfilled' && Array.isArray(scoreRes.value) && scoreRes.value.length > 0) {
        const data = scoreRes.value
        setOfficials(data)
        const computed = CATEGORIES.filter(cat => {
          const userWeight = weights[cat] ?? 50
          if (userWeight < 70) return false
          const avg = data.reduce((sum, o) => sum + ((o.vote_vector?.[cat] ?? 0.5) * 100), 0) / data.length
          return avg < 50
        }).map(cat => ({ category: cat, note: `Your top matches diverge on ${cat.toLowerCase()} policy` }))
        if (computed.length > 0) setGaps(computed)
      }
      if (billsRes.status === 'fulfilled' && Array.isArray(billsRes.value) && billsRes.value.length > 0) {
        setBills(billsRes.value)
      }
      if (activeRes.status === 'fulfilled' && Array.isArray(activeRes.value)) {
        setActiveLegislation(activeRes.value)
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-5">
        <div className="w-10 h-10 rounded-full border-4 border-[#1a2744] border-t-transparent animate-spin" />
        <p className="text-[#1a2744] font-semibold text-lg">Analyzing your alignment...</p>
        <p className="text-gray-400 text-sm">Matching your priorities to legislators and bills</p>
      </div>
    )
  }

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
            {officials.length === 0
              ? <p className="p-5 text-sm text-gray-400">No legislators found for your state yet. Try re-running the seed script.</p>
              : officials.map((official, i) => (
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
                    <p className="text-sm text-gray-500 leading-relaxed">{official.rationale?.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ')}</p>
                  </div>
                  {i < officials.length - 1 && <div className="border-t border-gray-100" />}
                </div>
              ))
            }
          </Section>

          {/* Matching bills */}
          <Section title="Matching bills">
            {bills.length === 0
              ? <p className="p-5 text-sm text-gray-400">No matching bills found.</p>
              : bills.map((bill, i) => (
                <div key={bill.id}>
                  <BillCard bill={bill} />
                  {i < bills.length - 1 && <div className="border-t border-gray-100" />}
                </div>
              ))
            }
          </Section>

          {gaps.length > 0 && (
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
          )}

          {activeLegislation.length > 0 && (
            <Section title="Active legislation you can act on">
              {activeLegislation.map((bill, i) => (
                <div key={bill.id}>
                  <ActiveBillCard bill={bill} />
                  {i < activeLegislation.length - 1 && <div className="border-t border-gray-100" />}
                </div>
              ))}
            </Section>
          )}

          {/* Both sides for neutral categories */}
          {neutralCategories.length > 0 && (
            <Section title="Explore both sides">
              {neutralCategories.filter(cat => BOTH_SIDES[cat]).map((cat, i) => {
                const { label, sideA, sideB } = BOTH_SIDES[cat]
                return (
                  <div key={cat}>
                    <div className="flex flex-col gap-4 p-5">
                      <div className="flex items-center gap-2">
                        <Scale size={15} className="text-gray-400 shrink-0" />
                        <span className="text-sm font-semibold text-[#1a2744]">{label}</span>
                        <span className="text-xs text-gray-400 ml-1">— you expressed no strong preference</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-1.5">
                          <span className="text-xs font-semibold text-[#1a2744] uppercase tracking-wide">{sideA.title}</span>
                          <p className="text-sm text-gray-500 leading-relaxed">{sideA.description}</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-1.5">
                          <span className="text-xs font-semibold text-[#9b2335] uppercase tracking-wide">{sideB.title}</span>
                          <p className="text-sm text-gray-500 leading-relaxed">{sideB.description}</p>
                        </div>
                      </div>
                    </div>
                    {i < neutralCategories.filter(c => BOTH_SIDES[c]).length - 1 && <div className="border-t border-gray-100" />}
                  </div>
                )
              })}
            </Section>
          )}


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
