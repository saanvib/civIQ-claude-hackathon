import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Survey from './pages/Survey'
import Chat from './pages/Chat'
import Results from './pages/Results'

<BrowserRouter>
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/survey" element={<Survey />} />
    <Route path="/chat" element={<Chat />} />
    <Route path="/results" element={<Results />} />
  </Routes>
</BrowserRouter>