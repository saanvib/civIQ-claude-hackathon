import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChevronRight } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Extract plain text from a question (object or legacy string)
const qText = q => (typeof q === 'string' ? q : q?.question ?? '')

export default function Chat() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeQuestion, setActiveQuestion] = useState(null)
  const [sliderValue, setSliderValue] = useState(50)
  const questionQueue = useRef([])   // questions not yet shown
  const askedQuestions = useRef([])  // question texts already shown
  const collectedAnswers = useRef([]) // answers in order
  const latestWeights = useRef(null)
  const modeRef = useRef('sliders')
  const initRan = useRef(false)

  useEffect(() => {
    if (activeQuestion?.type === 'slider') setSliderValue(50)
  }, [activeQuestion])

  useEffect(() => {
    if (initRan.current) return
    initRan.current = true

    async function init() {
      // Step 1: extract weights from survey payload
      const raw = sessionStorage.getItem('surveyPayload')
      const mode = sessionStorage.getItem('mode') || 'sliders'
      modeRef.current = mode
      let weights = null

      if (raw) {
        const payload = JSON.parse(raw)
        const body = mode === 'sliders'
          ? { sliders: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k.replace(' ', ''), v])) }
          : { text: payload.rawText }

        try {
          const r = await fetch(`${API}/api/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          const data = await r.json()
          if (data.weights) {
            weights = data.weights
            sessionStorage.setItem('extractedWeights', JSON.stringify(data.weights))
          }
        } catch {}
      }

      // Fall back to previously extracted weights
      if (!weights) {
        const stored = sessionStorage.getItem('extractedWeights')
        weights = stored ? JSON.parse(stored) : { Climate: 50, Healthcare: 50, Economy: 50, CriminalJustice: 50 }
      }

      latestWeights.current = weights

      // Step 2: get initial clarifying questions
      try {
        const r = await fetch(`${API}/api/clarify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weights, mode }),
        })
        const data = await r.json()

        if (data.weights) latestWeights.current = data.weights

        const questions = data.questions ?? []
        if (questions.length > 0) {
          const [first, ...rest] = questions
          askedQuestions.current = [qText(first)]
          questionQueue.current = rest
          setActiveQuestion(first)
          setMessages([{ role: 'claude', text: qText(first) }])
        } else {
          navigate('/results')
          return
        }
      } catch {
        const fallback = { type: 'open', question: 'What policy areas matter most to you right now?' }
        askedQuestions.current = [fallback.question]
        setActiveQuestion(fallback)
        setMessages([{ role: 'claude', text: fallback.question }])
      }

      setLoading(false)
    }

    init()
  }, [])

  async function handleSubmitAnswer(answer) {
    if (!answer || loading) return

    setInput('')
    setActiveQuestion(null)
    setMessages(prev => [...prev, { role: 'user', text: answer }])
    collectedAnswers.current = [...collectedAnswers.current, answer]

    const totalAsked = askedQuestions.current.length

    // Hard cap at 4 questions — wrap up and save neutral categories for Results
    if (totalAsked >= 4) {
      setLoading(true)
      try {
        const r = await fetch(`${API}/api/clarify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weights: latestWeights.current,
            questions: askedQuestions.current,
            answers: collectedAnswers.current,
          }),
        })
        const data = await r.json()
        if (data.weights) {
          latestWeights.current = data.weights
          sessionStorage.setItem('extractedWeights', JSON.stringify(data.weights))
        }
        sessionStorage.setItem('neutralCategories', JSON.stringify(data.unclear_categories ?? []))
      } catch {}
      setLoading(false)
      setDone(true)
      return
    }

    // If there are queued questions, show the next one after a short typing delay
    if (questionQueue.current.length > 0) {
      const [next, ...rest] = questionQueue.current
      askedQuestions.current = [...askedQuestions.current, qText(next)]
      questionQueue.current = rest
      setLoading(true)
      await new Promise(r => setTimeout(r, 900))
      setActiveQuestion(next)
      setMessages(prev => [...prev, { role: 'claude', text: qText(next) }])
      setLoading(false)
      return
    }

    // Queue exhausted — call clarify with all Q&A to update weights and get more questions
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/clarify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights: latestWeights.current,
          questions: askedQuestions.current,
          answers: collectedAnswers.current,
          mode: modeRef.current,
        }),
      })
      const data = await r.json()

      if (data.weights) {
        latestWeights.current = data.weights
        sessionStorage.setItem('extractedWeights', JSON.stringify(data.weights))
      }

      const followUps = data.questions ?? []
      if (followUps.length > 0) {
        const [first, ...rest] = followUps
        askedQuestions.current = [...askedQuestions.current, qText(first)]
        collectedAnswers.current = []
        questionQueue.current = rest
        setActiveQuestion(first)
        setMessages(prev => [...prev, { role: 'claude', text: qText(first) }])
      } else {
        sessionStorage.setItem('neutralCategories', JSON.stringify(data.unclear_categories ?? []))
        setDone(true)
      }
    } catch {
      setDone(true)
    }

    setLoading(false)
  }

  function handleSend() {
    if (!input.trim()) return
    handleSubmitAnswer(input.trim())
  }

  function handleSliderConfirm() {
    const label = sliderValue >= 50 ? activeQuestion.max_label : activeQuestion.min_label
    const answerText = `${sliderValue}/100 toward "${label}"`
    handleSubmitAnswer(answerText)
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <span
          className="text-[#1a2744] font-semibold font-serif text-lg tracking-tight cursor-pointer"
          onClick={() => navigate('/')}
        >
          CivIQ
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pt-16 pb-24">
        <div className="w-full max-w-2xl flex flex-col gap-8">

          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1a2744] leading-[1.1] mb-3">
              A few quick questions
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed">
              Help us understand your priorities better.
            </p>
          </div>

          <div className="flex flex-col gap-3 min-h-64">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-2xl px-5 py-3 max-w-lg text-base leading-relaxed ${
                    msg.role === 'claude'
                      ? 'bg-gray-100 text-[#1a2744]'
                      : 'text-white'
                  }`}
                  style={msg.role === 'user' ? { background: '#1a2744' } : {}}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-400 font-medium tracking-wide">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {done ? (
            <Button
              size="lg"
              className="gap-2 px-7 py-6 text-base font-semibold bg-[#1a2744] hover:bg-[#243460] text-white shadow-md cursor-pointer rounded-xl self-stretch sm:self-start"
              onClick={() => navigate('/results')}
            >
              See my results
              <ChevronRight size={16} className="ml-1 opacity-60" />
            </Button>
          ) : activeQuestion?.type === 'multiple_choice' ? (
            <div className="flex flex-wrap gap-2">
              {(activeQuestion.options ?? []).map(option => (
                <button
                  key={option}
                  disabled={loading}
                  onClick={() => handleSubmitAnswer(option)}
                  className="px-4 py-2.5 rounded-xl border-2 border-[#1a2744] text-[#1a2744] font-medium text-sm hover:bg-[#1a2744] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : activeQuestion?.type === 'slider' ? (
            <div className="flex flex-col gap-3 w-full">
              <div className="flex justify-between text-sm text-gray-500 px-1">
                <span>{activeQuestion.min_label}</span>
                <span className="font-semibold text-[#1a2744]">{sliderValue}</span>
                <span>{activeQuestion.max_label}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={sliderValue}
                disabled={loading}
                onChange={e => setSliderValue(Number(e.target.value))}
                className="w-full accent-[#1a2744] cursor-pointer disabled:opacity-40"
              />
              <Button
                className="px-6 py-5 font-semibold bg-[#1a2744] hover:bg-[#243460] text-white rounded-xl cursor-pointer disabled:opacity-40 self-start"
                onClick={handleSliderConfirm}
                disabled={loading}
              >
                Confirm
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 items-end">
              <Textarea
                placeholder="Type your response..."
                rows={1}
                className="text-base resize-none border-2 border-gray-200 rounded-xl focus:border-[#1a2744] focus-visible:ring-0 focus-visible:border-[#1a2744] py-2.5 px-4"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <Button
                className="px-6 py-5 font-semibold bg-[#1a2744] hover:bg-[#243460] text-white rounded-xl cursor-pointer shrink-0 disabled:opacity-40"
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                Send
              </Button>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center font-serif py-6 text-xs text-gray-400 border-t border-gray-100">
        CivIQ
      </footer>
    </div>
  )
}
