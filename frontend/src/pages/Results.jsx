import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronDown, AlertTriangle, Scale, ExternalLink } from 'lucide-react'

const BOTH_SIDES = {
  Climate: {
    label: 'Climate Policy',
    sideA: { title: 'Stronger government action', description: 'Supports federal emissions targets, clean energy mandates, carbon pricing, and investment in renewable infrastructure to address climate change urgently.' },
    sideB: { title: 'Market-driven approach', description: 'Prefers private sector innovation, energy independence, and consumer choice over mandates; emphasizes economic competitiveness and gradual transition.' },
  },
  Healthcare: {
    label: 'Healthcare',
    sideA: { title: 'Expanded public coverage', description: 'Supports a public option, Medicare expansion, and government controls on drug pricing to ensure universal access to affordable care.' },
    sideB: { title: 'Private market solutions', description: 'Favors competition, deregulation, and consumer choice to lower costs; opposes large government programs as inefficient or fiscally burdensome.' },
  },
  Economy: {
    label: 'Economic Policy',
    sideA: { title: 'Progressive taxation & investment', description: 'Supports higher taxes on corporations and the wealthy to fund social programs, infrastructure, worker protections, and reduce income inequality.' },
    sideB: { title: 'Lower taxes & reduced spending', description: 'Prioritizes tax cuts, deregulation, and fiscal restraint to stimulate private growth, entrepreneurship, and individual economic freedom.' },
  },
  CriminalJustice: {
    label: 'Criminal Justice',
    sideA: { title: 'Reform-oriented', description: 'Supports reducing incarceration rates, ending mandatory minimums, police accountability measures, and addressing systemic inequities in the justice system.' },
    sideB: { title: 'Law & order focus', description: 'Prioritizes public safety, stricter sentencing, strong law enforcement funding, and personal accountability as the foundation of a just society.' },
  },
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const CATEGORIES = ['Climate', 'Healthcare', 'Economy', 'CriminalJustice']

const LOWERCASE_WORDS = new Set(['a','an','the','and','but','or','nor','for','so','yet','at','by','in','of','on','to','up','as','with','from'])
function toTitleCase(str) {
  return str.split(/\s+/).map((w, i) =>
    i === 0 || !LOWERCASE_WORDS.has(w.toLowerCase())
      ? w.charAt(0).toUpperCase() + w.slice(1)
      : w.toLowerCase()
  ).join(' ')
}

function formatCategory(cat = '') {
  return cat.replace(/([a-z])([A-Z])/g, '$1 $2')
}

function shortTitle(full = '', maxWords = 5) {
  const stripped = full.replace(/^(a|an)\s+(bill|act|resolution)\s+to\s+/i, '').trim()
  const words = stripped.split(/\s+/)
  const preview = words.length <= maxWords ? stripped : words.slice(0, maxWords).join(' ') + '\u2026'
  return toTitleCase(preview)
}

function ScoreBar({ score }) {
  const color = score >= 75 ? '#1a2744' : score >= 55 ? '#4a6fa5' : '#9b2335'
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
    </div>
  )
}

function PartyPill({ party }) {
  const isD = party === 'D' || party === 'Democrat'
  const isR = party === 'R' || party === 'Republican'
  return (
    <span className="text-sm font-bold px-2.5 py-1 rounded-md"
      style={{
        background: isD ? '#0015BC14' : isR ? '#9b233514' : '#f3f4f6',
        color: isD ? '#0015BC' : isR ? '#9b2335' : '#6b7280',
      }}>
      {isD ? 'Dem' : isR ? 'Rep' : party}
    </span>
  )
}

function VoteChip({ vote }) {
  return (
    <span className={`text-sm font-semibold px-2.5 py-1 rounded-md ${
      vote === 'Yes' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
    }`}>{vote}</span>
  )
}

function SectionHeading({ label }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-2xl font-bold text-[#1a2744] tracking-tight shrink-0">{label}</h2>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

function OfficialCard({ official }) {
  const [open, setOpen] = useState(false)
  const scoreColor = official.score >= 75 ? '#1a2744' : official.score >= 55 ? '#4a6fa5' : '#9b2335'
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-w-0">
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2">
            <span className="font-bold text-lg text-[#1a2744] leading-tight text-center">{official.name}</span>
            <PartyPill party={official.party} />
          </div>
          <div className="flex flex-col items-center justify-center rounded-full border-[3px] shrink-0"
            style={{ borderColor: scoreColor, width: 72, height: 72 }}>
            <span className="text-xl font-extrabold leading-none" style={{ color: scoreColor }}>{official.score}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">%</span>
          </div>
        </div>
        <ScoreBar score={official.score} />
        <button
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors self-start"
          onClick={() => setOpen(p => !p)}
        >
          {open ? 'Hide details' : 'See rationale'}
          <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>
      {open && (
        <div className="px-6 pb-6 pt-0 border-t border-gray-100 bg-gray-50/50">
          <p className="text-base text-gray-600 leading-relaxed pt-4">{official.rationale}</p>
        </div>
      )}
    </div>
  )
}

function BillRow({ bill }) {
  const [open, setOpen] = useState(false)
  const scoreColor = bill.match >= 75 ? '#1a2744' : bill.match >= 55 ? '#4a6fa5' : '#9b2335'
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full flex items-center gap-4 py-5 px-6 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(p => !p)}
      >
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <span className="font-semibold text-[#1a2744] text-base leading-snug">
            {bill.short_title ?? shortTitle(bill.name)}
          </span>
          <span className="text-sm text-gray-400">{formatCategory(bill.category)}</span>
        </div>
        <span className="text-base font-bold shrink-0 tabular-nums" style={{ color: scoreColor }}>
          {bill.match}%
        </span>
        <ChevronDown size={15} className="shrink-0 text-gray-300 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div className="px-6 pb-6 bg-gray-50/60 border-t border-gray-100 flex flex-col gap-4">
          {bill.name && <p className="text-sm text-gray-400 leading-relaxed pt-4">{bill.name}</p>}
          {bill.summary && <p className="text-base text-gray-600 leading-relaxed">{bill.summary}</p>}
          <ScoreBar score={bill.match} />
          {bill.votes?.length > 0 && (
            <div className="flex flex-col gap-2.5 border-l-2 border-gray-200 pl-4 mt-1">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Legislator votes</p>
              {bill.votes.map((v, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base text-gray-700 font-medium">{v.name}</span>
                    <PartyPill party={v.party} />
                  </div>
                  <VoteChip vote={v.vote} />
                </div>
              ))}
            </div>
          )}
          <a href={bill.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-base font-semibold text-[#1a2744] hover:underline self-start">
            Read full bill <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  )
}

function ActiveBillRow({ bill }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full flex items-center gap-4 py-5 px-6 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(p => !p)}
      >
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <span className="font-semibold text-[#1a2744] text-base leading-snug">
            {bill.short_title ?? shortTitle(bill.title)}
          </span>
          <span className="text-sm text-gray-400">{formatCategory(bill.category)}</span>
        </div>
        <ChevronDown size={15} className="shrink-0 text-gray-300 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div className="px-6 pb-6 bg-gray-50/60 border-t border-gray-100 flex flex-col gap-4 pt-4">
          <p className="text-sm text-gray-400 leading-relaxed">{bill.title}</p>
          {bill.latest_action && (
            <p className="text-base text-gray-600 leading-relaxed">
              <span className="font-semibold text-gray-700">Latest: </span>
              {bill.latest_action}
              {bill.latest_action_date && <span className="text-gray-400"> · {bill.latest_action_date}</span>}
            </p>
          )}
          <a href={bill.url} target="_blank" rel="noopener noreferrer"
            className="self-start inline-flex items-center gap-1.5 text-base font-semibold px-4 py-2.5 rounded-lg bg-[#1a2744] text-white hover:bg-[#243460] transition-colors">
            Contact your rep <ExternalLink size={14} />
          </a>
        </div>
      )}
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
        }).map(cat => ({ category: cat, note: `Your top matches diverge on ${formatCategory(cat).toLowerCase()} policy.` }))
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-8 h-8 rounded-full border-[3px] border-[#1a2744] border-t-transparent animate-spin" />
        <div className="text-center">
          <p className="text-[#1a2744] font-semibold">Analyzing your alignment...</p>
          <p className="text-gray-400 text-sm mt-1">Matching your priorities to legislators and bills</p>
        </div>
      </div>
    )
  }

  const validNeutral = neutralCategories.filter(c => BOTH_SIDES[c])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="flex items-center px-8 py-4 bg-white border-b border-gray-200">
        <span className="text-[#1a2744] font-semibold font-serif text-lg tracking-tight cursor-pointer"
          onClick={() => navigate('/')}>CivIQ</span>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pt-12 pb-24">
        <div className="w-full max-w-3xl flex flex-col gap-12">

          <div>
            <h1 className="text-4xl font-bold text-[#1a2744] tracking-tight">Your alignment results</h1>
            <p className="text-gray-500 mt-2 text-base">Based on your stated priorities — not an endorsement.</p>
          </div>

          {officials.length > 0 && (
            <section className="flex flex-col gap-5">
              <SectionHeading label="Top Aligned Officials" />
              <div className="flex flex-col sm:flex-row gap-4">
                {officials.map((o, i) => <OfficialCard key={i} official={o} />)}
              </div>
            </section>
          )}

          {bills.length > 0 && (
            <section className="flex flex-col gap-5">
              <SectionHeading label="Matching Bills" />
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {bills.map(b => <BillRow key={b.id} bill={b} />)}
              </div>
            </section>
          )}

          {activeLegislation.length > 0 && (
            <section className="flex flex-col gap-5">
              <SectionHeading label="Active Legislation You Can Act On" />
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {activeLegislation.map(b => <ActiveBillRow key={b.id} bill={b} />)}
              </div>
            </section>
          )}

          {gaps.length > 0 && (
            <section className="flex flex-col gap-4">
              <SectionHeading label="Where Alignment Breaks Down" />
              <div className="flex flex-col gap-3">
                {gaps.map((g, i) => (
                  <div key={i} className="flex items-start gap-4 bg-white rounded-xl border border-gray-200 px-6 py-5 shadow-sm">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: '#9b2335' }} />
                    <div>
                      <p className="font-semibold text-base text-[#1a2744]">{formatCategory(g.category)}</p>
                      <p className="text-base text-gray-500 mt-1 leading-relaxed">{g.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {validNeutral.length > 0 && (
            <section className="flex flex-col gap-5">
              <SectionHeading label="Explore Both Sides" />
              <div className="flex flex-col gap-4">
                {validNeutral.map(cat => {
                  const { label, sideA, sideB } = BOTH_SIDES[cat]
                  return (
                    <div key={cat} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <Scale size={16} className="text-gray-400" />
                        <span className="text-base font-semibold text-[#1a2744]">{label}</span>
                        <span className="text-sm text-gray-400">— no strong preference expressed</span>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-gray-100">
                        <div className="p-6 flex flex-col gap-2.5">
                          <span className="text-sm font-bold text-[#0015BC] uppercase tracking-wide">{sideA.title}</span>
                          <p className="text-base text-gray-600 leading-relaxed">{sideA.description}</p>
                        </div>
                        <div className="p-6 flex flex-col gap-2.5">
                          <span className="text-sm font-bold text-[#9b2335] uppercase tracking-wide">{sideB.title}</span>
                          <p className="text-base text-gray-600 leading-relaxed">{sideB.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <Button
            size="lg"
            className="gap-2 px-6 py-5 text-base font-semibold bg-[#1a2744] hover:bg-[#243460] text-white rounded-xl cursor-pointer self-start"
            onClick={() => navigate('/')}
          >
            Start over
            <ChevronRight size={16} className="opacity-60" />
          </Button>

        </div>
      </main>

      <footer className="text-center font-serif py-5 text-xs text-gray-400 border-t border-gray-200 bg-white">
        CivIQ
      </footer>
    </div>
  )
}
