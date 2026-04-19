import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChevronRight } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const MOCK_QUESTIONS = [
  "How important is affordable housing policy to you compared to climate change?",
  "Do you support expanding Medicare or keeping private insurance options?"
]

export default function Chat() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [round, setRound] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = sessionStorage.getItem('surveyPayload')
    const mode = sessionStorage.getItem('mode') || 'sliders'
    if (raw) {
      const payload = JSON.parse(raw)
      let body
      if (mode === 'sliders') {
        const normalized = Object.fromEntries(
          Object.entries(payload).map(([k, v]) => [k.replace(' ', ''), v])
        )
        body = { sliders: normalized }
      } else {
        body = { text: payload.rawText }
      }
      fetch(`${API}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(r => r.json())
        .then(data => { if (data.weights) sessionStorage.setItem('extractedWeights', JSON.stringify(data.weights)) })
        .catch(() => {})
    }

    setTimeout(() => {
      setMessages(MOCK_QUESTIONS.map(q => ({ role: 'claude', text: q })))
      setLoading(false)
    }, 800)
  }, [])

  function handleSend() {
    if (!input.trim()) return

    const userMessage = { role: 'user', text: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setRound(prev => prev + 1)

    if (round >= 1) {
      setTimeout(() => setDone(true), 400)
    } else {
      setLoading(true)
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'claude',
          text: "Thanks — one more: do you prioritize job creation or worker protections when they conflict?"
        }])
        setLoading(false)
      }, 800)
    }
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
        <div className="w-full max-w-2xl flex flex-col gap-8">

          {/* Heading */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1a2744] leading-[1.1] mb-3">
              A few quick questions
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed">
              Help Claude understand your priorities better.
            </p>
          </div>

          {/* Messages */}
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

          {/* Input area */}
          {done ? (
            <Button
              size="lg"
              className="gap-2 px-7 py-6 text-base font-semibold bg-[#1a2744] hover:bg-[#243460] text-white shadow-md cursor-pointer rounded-xl self-stretch sm:self-start"
              onClick={() => navigate('/results')}
            >
              See my results
              <ChevronRight size={16} className="ml-1 opacity-60" />
            </Button>
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
