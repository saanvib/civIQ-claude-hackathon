import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'

const CATEGORIES = [
  'Climate',
  'Healthcare',
  'Economy',
  'Criminal Justice',
]

const DEFAULT_WEIGHTS = Object.fromEntries(CATEGORIES.map(c => [c, 50]))

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl flex flex-col gap-10">
        <div>
          <h2 className="text-4xl font-semibold tracking-tight">
            {mode === 'sliders' ? 'Set your priorities' : 'Describe your values'}
          </h2>
          <p className="text-muted-foreground mt-2 text-xl">
            {mode === 'sliders'
              ? '0 = strongly oppose, 100 = strongly support'
              : 'Write freely — Claude will extract your priorities'}
          </p>
        </div>

        {mode === 'sliders' ? (
          <div className="flex flex-col gap-8">
            {CATEGORIES.map(category => (
              <div key={category} className="flex flex-col gap-3">
                <div className="flex justify-between text-lg">
                  <span className="font-medium">{category}</span>
                  <span className="text-muted-foreground">{weights[category]}</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[weights[category]]}
                  onValueChange={val => handleSliderChange(category, val)}
                  className="h-3 **:[[role=slider]]:h-5 **:[[role=slider]]:w-5"
                />
              </div>
            ))}
          </div>
        ) : (
          <Textarea
            placeholder="e.g. I care a lot about climate change and affordable healthcare. I'm neutral on immigration..."
            className="min-h-64 text-xl"
            value={text}
            onChange={e => setText(e.target.value)}
          />
        )}

        <Button
          size="xl"
          className="text-xl py-3"
          onClick={handleSubmit}
          disabled={mode === 'text' && text.trim().length < 10}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}