import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

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
    // Fire extraction in background while mock chat plays out
    const raw = sessionStorage.getItem('surveyPayload')
    const mode = sessionStorage.getItem('mode') || 'sliders'
    if (raw) {
      const payload = JSON.parse(raw)
      // Normalize 'Criminal Justice' → 'CriminalJustice' for backend
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

    // Simulate Claude asking first questions
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
      // Max 2 rounds — move to results
      setTimeout(() => setDone(true), 400)
    } else {
      // Simulate a follow-up
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

  function handleResults() {
    navigate('/results')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div>
          <h2 className="text-4xl font-semibold tracking-tight">A few quick questions</h2>
          <p className="text-muted-foreground mt-2 text-xl">
            Help Claude understand your priorities better
          </p>
        </div>

        <div className="flex flex-col gap-4 min-h-72">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-2xl px-5 py-3 max-w-lg text-base leading-relaxed ${
                  msg.role === 'claude'
                    ? 'bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-5 py-4 text-base text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {done ? (
          <Button size="xl" className="text-xl py-2 cursor-pointer hover:bg-gray-800" onClick={handleResults}>
            See my results
          </Button>
        ) : (
          <div className="flex gap-3 items-center">
            <Textarea
              placeholder="Type your response..."
              rows={1}
              className="h-10 text-base resize-none"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <Button className="text-base px-6 h-9 cursor-pointer hover:bg-gray-800" onClick={handleSend} disabled={!input.trim() || loading}>
              Send
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}