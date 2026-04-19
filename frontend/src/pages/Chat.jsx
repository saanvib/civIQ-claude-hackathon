import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">A few quick questions</h2>
          <p className="text-muted-foreground mt-1">
            Help Claude understand your priorities better
          </p>
        </div>

        <div className="flex flex-col gap-3 min-h-64">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-2xl px-4 py-3 max-w-sm text-sm leading-relaxed ${
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
              <div className="bg-muted rounded-2xl px-4 py-3 text-sm text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {done ? (
          <Button size="lg" onClick={handleResults}>
            See my results
          </Button>
        ) : (
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your response..."
              className="min-h-12 text-sm resize-none"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <Button onClick={handleSend} disabled={!input.trim() || loading}>
              Send
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}