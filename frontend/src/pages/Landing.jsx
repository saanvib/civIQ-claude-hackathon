import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal, MessageSquare, BarChart3, ChevronRight, X, Leaf, Heart, TrendingUp, Shield, CheckCircle2, Landmark } from 'lucide-react'

const CATEGORY_ICONS = {
  'Climate':          { icon: Leaf,       color: '#16a34a' },
  'Healthcare':       { icon: Heart,      color: '#9b2335' },
  'Economy':          { icon: TrendingUp, color: '#1a2744' },
  'Criminal Justice': { icon: Shield,     color: '#7c3aed' },
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
}

const STATS = [
  { value: '535+', label: 'Legislators tracked' },
  { value: '50',   label: 'States covered' },
  { value: '4',    label: 'Policy areas' },
]

export default function Landing() {
  const navigate = useNavigate()
  const [pendingMode, setPendingMode] = useState(null)
  const [selectedState, setSelectedState] = useState('')

  function openPopup(mode) {
    setSelectedState('')
    setPendingMode(mode)
  }

  function closePopup() {
    setPendingMode(null)
  }

  function confirm() {
    if (!selectedState) return
    sessionStorage.setItem('state', selectedState)
    navigate(`/survey?mode=${pendingMode}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-40">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1a2744] flex items-center justify-center">
            <Landmark size={14} className="text-white" />
          </div>
          <span className="text-[#1a2744] font-semibold font-serif text-lg tracking-tight">CivIQ</span>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          className="gap-1.5 px-4 py-2 text-sm font-semibold bg-[#1a2744] hover:bg-[#243460] text-white rounded-lg cursor-pointer shadow-sm"
          onClick={() => openPopup('sliders')}
        >
          Get started
          <ChevronRight size={14} className="opacity-60" />
        </Button>
      </header>

      {/* Hero */}
      <section
        className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-24 text-center relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(26,39,68,0.05) 0%, transparent 70%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full opacity-[0.03] bg-[#1a2744] blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full opacity-[0.04] bg-[#9b2335] blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#1a2744] max-w-3xl leading-[1.08] mb-6">
            Find legislature that{' '}
            <span className="relative inline-block">
              <span className="relative z-10">matches your values</span>
              <span
                className="absolute inset-x-0 bottom-1.5 h-2.5 z-0 opacity-20 rounded-sm"
                style={{ background: '#9b2335' }}
              />
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-lg leading-relaxed mb-10">
            Tell us what matters to you. We'll show which bills and officials align with your priorities — ranked, explained, unspun.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-14">
            <Button
              size="lg"
              className="gap-2 px-8 py-6 text-base font-semibold bg-[#1a2744] hover:bg-[#243460] text-white shadow-lg shadow-[#1a2744]/20 cursor-pointer rounded-xl"
              onClick={() => openPopup('sliders')}
            >
              <SlidersHorizontal size={18} />
              Use value sliders
              <ChevronRight size={16} className="ml-1 opacity-60" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 px-8 py-6 text-base font-semibold border-2 border-[#1a2744]/15 text-[#1a2744] hover:bg-[#1a2744]/5 hover:border-[#1a2744]/30 cursor-pointer rounded-xl transition-colors"
              onClick={() => openPopup('text')}
            >
              <MessageSquare size={18} />
              Describe in your own words
            </Button>
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-8 sm:gap-12">
            {STATS.map(({ value, label }, i) => (
              <div key={label} className="flex items-center gap-8 sm:gap-12">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#1a2744]">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
                {i < STATS.length - 1 && <div className="w-px h-8 bg-gray-200" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policy areas */}
      <section id="policy-areas" className="px-6 py-16 border-t border-gray-100 bg-gray-50/60">
        <p className="text-center text-xs uppercase tracking-widest text-gray-400 font-semibold mb-10">Policy areas we cover</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {Object.entries(CATEGORY_ICONS).map(([cat, { icon: Icon, color }]) => (
            <div key={cat} className="flex flex-col items-center gap-3 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="text-sm font-medium text-[#1a2744] text-center leading-tight">{cat}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#1a2744] text-white px-6 py-16">
        <p className="text-center text-xs uppercase tracking-widest text-blue-300/70 font-semibold mb-12">How it works</p>
        <div className="grid sm:grid-cols-3 gap-10 max-w-3xl mx-auto text-center">
          {[
            { num: '01', icon: <SlidersHorizontal size={20} />, title: 'Share your priorities', body: 'Use sliders or plain English — takes under 2 minutes.' },
            { num: '02', icon: <MessageSquare size={20} />, title: 'Clarify with AI', body: 'Follow-up questions sharpen your priority profile.' },
            { num: '03', icon: <BarChart3 size={20} />, title: 'See your matches', body: 'Officials and bills ranked with plain-English rationale.' },
          ].map(({ num, icon, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center text-blue-200">
                  {icon}
                </div>
                <span className="absolute -top-2 -right-2 text-[10px] font-bold text-blue-300/50 font-mono">{num}</span>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-blue-200/70 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section className="flex flex-col items-center gap-5 px-6 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#1a2744] tracking-tight">Ready to find your match?</h2>
        <p className="text-gray-400 text-sm max-w-xs">Takes under 2 minutes. No account required.</p>
        <Button
          size="lg"
          className="gap-2 px-8 py-6 text-base font-semibold bg-[#1a2744] hover:bg-[#243460] text-white shadow-lg shadow-[#1a2744]/20 cursor-pointer rounded-xl"
          onClick={() => openPopup('sliders')}
        >
          Get started
          <ChevronRight size={16} className="ml-1 opacity-60" />
        </Button>
      </section>

      <footer className="text-center font-serif py-6 text-xs text-gray-300 border-t border-gray-100">
        CivIQ · Non-partisan · {new Date().getFullYear()}
      </footer>

      {/* State selection modal */}
      {pendingMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 relative">
            <button
              onClick={closePopup}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-bold text-[#1a2744] mb-1">Select your state</h2>
            <p className="text-sm text-gray-500 mb-6">We'll find legislators and bills relevant to you.</p>

            <select
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-[#1a2744] font-medium focus:outline-none focus:border-[#1a2744] mb-6 bg-white"
            >
              <option value="" disabled>Choose a state…</option>
              {US_STATES.map(abbr => (
                <option key={abbr} value={abbr}>{STATE_NAMES[abbr]} ({abbr})</option>
              ))}
            </select>

            <Button
              size="lg"
              disabled={!selectedState}
              className="w-full py-6 text-base font-semibold bg-[#1a2744] hover:bg-[#243460] text-white rounded-xl disabled:opacity-40 cursor-pointer"
              onClick={confirm}
            >
              Continue
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
