import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.post('/api/extract', async (req, res) => {
  res.json({ Climate: 50, Housing: 50, Labor: 50, Healthcare: 50, Economy: 50, Education: 50, Immigration: 50, CriminalJustice: 50 })
})

app.post('/api/score', async (req, res) => {
  res.json({ score: 72, rationale: 'Stub rationale — wire Claude here.' })
})

app.get('/api/legislators', async (req, res) => {
  res.json([{ id: 'stub-1', name: 'Jane Smith', party: 'D' }])
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))