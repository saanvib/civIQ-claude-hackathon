import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal, MessageSquare, BarChart3, ChevronRight, X } from 'lucide-react'

const CATEGORIES = ['Climate', 'Healthcare', 'Economy', 'Criminal Justice']

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

export default function Landing() {
  const navigate = useNavigate()
  const [pendingMode, setPendingMode] = useState(null) // 'sliders' | 'text'
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
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <span className="text-[#1a2744] font-semibold font-serif text-lg tracking-tight">CivIQ</span>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-32 text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#1a2744] max-w-3xl leading-[1.08] mb-6">
          Find legislature that{' '}
          <span className="relative inline-block">
            <span className="relative z-10">matches your values</span>
            <span
              className="absolute inset-x-0 bottom-1 h-3 -z-0 opacity-20 rounded"
              style={{ background: '#9b2335' }}
            />
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-500 max-w-xl leading-relaxed mb-10">
          Tell us what matters to you. We'll show you which bills and officials align with your stated priorities — ranked, explained, unspun.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <Button
            size="lg"
            className="gap-2 px-7 py-6 text-base font-semibold bg-[#1a2744] hover:bg-[#243460] text-white shadow-md cursor-pointer rounded-xl"
            onClick={() => openPopup('sliders')}
          >
            <SlidersHorizontal size={18} />
            Use value sliders
            <ChevronRight size={16} className="ml-1 opacity-60" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 px-7 py-6 text-base font-semibold border-2 border-[#1a2744]/20 text-[#1a2744] hover:bg-[#1a2744]/5 cursor-pointer rounded-xl"
            onClick={() => openPopup('text')}
          >
            <MessageSquare size={18} />
            Describe in your own words
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
          {CATEGORIES.map(cat => (
            <span key={cat} className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#1a2744] text-white px-6 py-14">
        <p className="text-center text-xs uppercase tracking-widest text-blue-300 font-semibold mb-10">How it works</p>
        <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
          {[
            { icon: <SlidersHorizontal size={22} />, title: 'Share your priorities', body: 'Use sliders or plain English — takes under 2 minutes.' },
            { icon: <MessageSquare size={22} />, title: 'Clarify with AI', body: 'Claude asks follow-up questions to sharpen your profile.' },
            { icon: <BarChart3 size={22} />, title: 'See your matches', body: 'Top-aligned officials and bills, ranked with plain-English rationale.' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-blue-200">
                {icon}
              </div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-blue-200 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center font-serif py-6 text-xs text-gray-400 border-t border-gray-100">
        CivIQ
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
              className="w-full py-6 text-base font-semibold bg-[#1a2744] hover:bg-[#243460] text-white rounded-xl disabled:opacity-40"
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
