import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { ChevronRight } from 'lucide-react'

const CATEGORIES = [
  'Climate',
  'Healthcare',
  'Economy',
  'Criminal Justice',
]

const DEFAULT_WEIGHTS = Object.fromEntries(CATEGORIES.map(c => [c, 50]))

const LABEL_LEFT = 'Strongly oppose'
const LABEL_RIGHT = 'Strongly support'

export default function Survey() {
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') || 'sliders'
  const navigate = useNavigate()

  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [text, setText] = useState('')

  function handleSliderChange(category, value) {
    setWeights(prev => ({ ...prev, [category]: value[0] }))
  }

  function handleSubmit() {
    const payload = mode === 'sliders' ? weights : { rawText: text }
    sessionStorage.setItem('surveyPayload', JSON.stringify(payload))
    sessionStorage.setItem('mode', mode)
    navigate('/chat')
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
      <main className="flex-1 flex flex-col items-center px-6 pt-16 pb-24">
        <div className="w-full max-w-2xl flex flex-col gap-10">

          {/* Heading */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1a2744] leading-[1.1] mb-3">
              {mode === 'sliders' ? 'Set your priorities' : 'Describe your values'}
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed">
              {mode === 'sliders'
                ? 'Drag each slider to reflect how strongly you support or oppose each policy area.'
                : 'Write freely — Claude will extract your priorities from what you share.'}
            </p>
          </div>

          {/* Inputs */}
          {mode === 'sliders' ? (
            <div className="flex flex-col gap-8">
              {/* Scale labels */}
              <div className="flex justify-between text-xs font-medium text-gray-400 uppercase tracking-widest px-0.5">
                <span>{LABEL_LEFT}</span>
                <span>{LABEL_RIGHT}</span>
              </div>

              {CATEGORIES.map(category => (
                <div key={category} className="flex flex-col gap-3">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-[#1a2744] text-lg">{category}</span>
                    <span
                      className="text-sm font-semibold px-2.5 py-0.5 rounded-full"
                      style={{
                        background: weights[category] >= 50 ? '#1a274415' : '#9b233515',
                        color: weights[category] >= 50 ? '#1a2744' : '#9b2335',
                      }}
                    >
                      {weights[category]}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[weights[category]]}
                    onValueChange={val => handleSliderChange(category, val)}
                    className="h-3 **:[[role=slider]]:h-5 **:[[role=slider]]:w-5 **:[[role=slider]]:bg-[#1a2744] **:[[role=slider]]:border-[#1a2744]"
                  />
                </div>
              ))}
            </div>
          ) : (
            <Textarea
              placeholder="e.g. I care a lot about climate change and affordable healthcare. I'm neutral on immigration..."
              className="min-h-64 text-base border-2 border-gray-200 rounded-xl focus:border-[#1a2744] focus-visible:ring-0 focus-visible:border-[#1a2744] resize-none p-4"
              value={text}
              onChange={e => setText(e.target.value)}
            />
          )}

          <Button
            size="lg"
            className="gap-2 px-7 py-6 text-base font-semibold bg-[#1a2744] hover:bg-[#243460] text-white shadow-md cursor-pointer rounded-xl self-stretch sm:self-start disabled:opacity-40"
            onClick={handleSubmit}
            disabled={mode === 'text' && text.trim().length < 10}
          >
            Continue
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
